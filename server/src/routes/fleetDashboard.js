import { Router } from 'express';
import { getDB } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/fleet/dashboard
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { courtStationId } = req.query;

    const vehicleFilter = {};
    if (courtStationId) vehicleFilter.assignedStationId = courtStationId;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalVehicles,
      availableVehicles,
      inUseVehicles,
      bookedVehicles,
      underMaintenanceVehicles,
      outOfServiceVehicles,
      recentTrips,
      tripsThisMonth,
      completedTripsThisMonth,
      totalMileage,
      upcomingMaintenance,
      expiringInsurance,
      expiringInspection,
      visitorParkingToday,
    ] = await Promise.all([
      db.collection('vehicles').countDocuments(vehicleFilter),
      db.collection('vehicles').countDocuments({ ...vehicleFilter, status: 'available' }),
      db.collection('vehicles').countDocuments({ ...vehicleFilter, status: 'in-use' }),
      db.collection('vehicles').countDocuments({ ...vehicleFilter, status: 'booked' }),
      db.collection('vehicles').countDocuments({ ...vehicleFilter, status: 'maintenance' }),
      db.collection('vehicles').countDocuments({ ...vehicleFilter, status: 'deactivated' }),
      db.collection('trips').find().sort({ createdAt: -1 }).limit(10).toArray(),
      db.collection('trips').countDocuments({ departureDate: { $gte: thirtyDaysAgo } }),
      db.collection('trips').countDocuments({ status: 'completed', departureDate: { $gte: thirtyDaysAgo } }),
      db.collection('vehicles').aggregate([
        { $match: vehicleFilter },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$currentMileage', '$mileage', 0] } } } },
      ]).toArray(),
      db.collection('vehicle_maintenance').find({
        status: 'scheduled',
        scheduledDate: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
      }).sort({ scheduledDate: 1 }).limit(5).toArray(),
      db.collection('vehicles').find({
        insuranceExpiry: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        status: { $ne: 'deactivated' },
      }).project({ plateNumber: 1, name: 1, insuranceExpiry: 1 }).limit(5).toArray(),
      db.collection('vehicles').find({
        inspectionExpiry: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        status: { $ne: 'deactivated' },
      }).project({ plateNumber: 1, name: 1, inspectionExpiry: 1 }).limit(5).toArray(),
      db.collection('visitor_parking').countDocuments({ status: 'parked' }),
    ]);

    // Compute fuel stats from completed trips this month
    const fuelStats = await db.collection('trips').aggregate([
      { $match: { status: 'completed', departureDate: { $gte: thirtyDaysAgo }, fuelConsumed: { $gt: 0 } } },
      { $group: { _id: null, totalFuel: { $sum: '$fuelConsumed' }, avgFuel: { $avg: '$fuelConsumed' }, tripCount: { $sum: 1 } } },
    ]).toArray();

    // Vehicle utilization rate
    const utilizationRate = totalVehicles > 0
      ? Math.round(((inUseVehicles + bookedVehicles) / totalVehicles) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        vehicles: {
          total: totalVehicles,
          available: availableVehicles,
          inUse: inUseVehicles,
          booked: bookedVehicles,
          underMaintenance: underMaintenanceVehicles,
          outOfService: outOfServiceVehicles,
          utilizationRate,
        },
        trips: {
          thisMonth: tripsThisMonth,
          completedThisMonth: completedTripsThisMonth,
          recent: recentTrips,
        },
        mileage: {
          total: totalMileage[0]?.total || 0,
        },
        fuel: {
          totalConsumed: fuelStats[0]?.totalFuel || 0,
          averagePerTrip: fuelStats[0]?.avgFuel || 0,
          tripsTracked: fuelStats[0]?.tripCount || 0,
        },
        maintenance: {
          upcoming: upcomingMaintenance,
          insuranceExpiring: expiringInsurance,
          inspectionExpiring: expiringInspection,
        },
        visitorParking: {
          currentlyParked: visitorParkingToday,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
