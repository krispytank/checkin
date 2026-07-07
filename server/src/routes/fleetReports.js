import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/fleet/reports/utilization
router.get('/utilization', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate + 'T23:59:59.999Z');

    const tripFilter = { status: 'completed' };
    if (Object.keys(dateFilter).length > 0) tripFilter.departureDate = dateFilter;

    const byVehicle = await db.collection('trips').aggregate([
      { $match: tripFilter },
      { $group: {
        _id: '$vehicleId',
        tripCount: { $sum: 1 },
        totalDistance: { $sum: { $ifNull: ['$distanceCovered', 0] } },
        totalFuel: { $sum: { $ifNull: ['$fuelConsumed', 0] } },
      }},
      { $sort: { tripCount: -1 } },
      { $limit: 20 },
    ]).toArray();

    const byDriver = await db.collection('trips').aggregate([
      { $match: tripFilter },
      { $group: {
        _id: '$driverId',
        tripCount: { $sum: 1 },
        totalDistance: { $sum: { $ifNull: ['$distanceCovered', 0] } },
      }},
      { $sort: { tripCount: -1 } },
      { $limit: 20 },
    ]).toArray();

    // Enrich vehicle/driver names
    const vehicleIds = byVehicle.map(v => v._id).filter(Boolean);
    const driverIds = byDriver.map(d => d._id).filter(Boolean);

    const [vehicles, drivers] = await Promise.all([
      vehicleIds.length > 0 ? db.collection('vehicles').find({ _id: { $in: vehicleIds.map(id => { try { return new ObjectId(id); } catch { return id; } }) } }).toArray() : [],
      driverIds.length > 0 ? db.collection('users').find({ _id: { $in: driverIds.map(id => { try { return new ObjectId(id); } catch { return id; } }) } }, { projection: { name: 1 } }).toArray() : [],
    ]);

    const vehicleMap = Object.fromEntries(vehicles.map(v => [v._id.toString(), v]));
    const driverMap = Object.fromEntries(drivers.map(d => [d._id.toString(), d]));

    res.json({
      success: true,
      data: {
        byVehicle: byVehicle.map(v => ({
          ...v,
          vehicleName: vehicleMap[v._id]?.name || v._id,
          plateNumber: vehicleMap[v._id]?.plateNumber || '-',
        })),
        byDriver: byDriver.map(d => ({
          ...d,
          driverName: driverMap[d._id]?.name || d._id,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/fleet/reports/fuel
router.get('/fuel', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate + 'T23:59:59.999Z');

    const matchFilter = { status: 'completed', fuelConsumed: { $gt: 0 } };
    if (Object.keys(dateFilter).length > 0) matchFilter.departureDate = dateFilter;

    const byMonth = await db.collection('trips').aggregate([
      { $match: matchFilter },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$departureDate' } },
        totalFuel: { $sum: '$fuelConsumed' },
        trips: { $sum: 1 },
        avgFuel: { $avg: '$fuelConsumed' },
      }},
      { $sort: { _id: 1 } },
    ]).toArray();

    const byVehicle = await db.collection('trips').aggregate([
      { $match: matchFilter },
      { $group: {
        _id: '$vehicleId',
        totalFuel: { $sum: '$fuelConsumed' },
        trips: { $sum: 1 },
        avgFuel: { $avg: '$fuelConsumed' },
      }},
      { $sort: { totalFuel: -1 } },
      { $limit: 20 },
    ]).toArray();

    const vehicleIds = byVehicle.map(v => v._id).filter(Boolean);
    const vehicles = vehicleIds.length > 0
      ? await db.collection('vehicles').find({ _id: { $in: vehicleIds.map(id => { try { return new ObjectId(id); } catch { return id; } }) } }).toArray()
      : [];
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v._id.toString(), v]));

    res.json({
      success: true,
      data: {
        byMonth,
        byVehicle: byVehicle.map(v => ({
          ...v,
          vehicleName: vehicleMap[v._id]?.name || v._id,
          plateNumber: vehicleMap[v._id]?.plateNumber || '-',
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/fleet/reports/maintenance
router.get('/maintenance', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { vehicleId, status } = req.query;

    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;

    const records = await db.collection('vehicle_maintenance')
      .find(filter)
      .sort({ scheduledDate: -1 })
      .toArray();

    const vehicleIds = [...new Set(records.map(r => r.vehicleId))];
    const vehicles = vehicleIds.length > 0
      ? await db.collection('vehicles').find({ _id: { $in: vehicleIds.map(id => { try { return new ObjectId(id); } catch { return id; } }) } }).toArray()
      : [];
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v._id.toString(), v]));

    const byType = records.reduce((acc, r) => {
      if (!acc[r.type]) acc[r.type] = { count: 0, totalCost: 0 };
      acc[r.type].count++;
      acc[r.type].totalCost += r.cost || 0;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        records: records.map(r => ({ ...r, vehicle: vehicleMap[r.vehicleId] || null })),
        byType,
        totalRecords: records.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/fleet/reports/parking
router.get('/parking', authenticate, async (req, res, next) => {
  try {
    const db = getDB();

    const lots = await db.collection('parking_lots').find().toArray();

    const byStation = await db.collection('parking_lots').aggregate([
      { $group: {
        _id: '$courtStationId',
        totalLots: { $sum: 1 },
        totalBays: { $sum: '$totalBays' },
        occupiedBays: { $sum: '$occupiedBays' },
        reservedBays: { $sum: '$reservedBays' },
      }},
    ]).toArray();

    const visitorStats = await db.collection('visitor_parking').aggregate([
      { $group: {
        _id: '$category',
        count: { $sum: 1 },
      }},
    ]).toArray();

    // Enrich station names
    const stationIds = byStation.map(s => s._id).filter(Boolean);
    const stations = stationIds.length > 0
      ? await db.collection('stations').find({ _id: { $in: stationIds.map(id => { try { return new ObjectId(id); } catch { return id; } }) } }).toArray()
      : [];
    const stationMap = Object.fromEntries(stations.map(s => [s._id.toString(), s]));

    res.json({
      success: true,
      data: {
        lots,
        byStation: byStation.map(s => ({
          ...s,
          stationName: stationMap[s._id]?.name || s._id,
        })),
        visitorByCategory: visitorStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
