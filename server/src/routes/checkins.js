import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorizeModule } from '../middleware/auth.js';
import { validateRequired, validatePagination } from '../middleware/validation.js';

const router = Router();

// POST /api/checkins - Create check-in or check-out event
router.post('/', authenticate, authorizeModule('fleet', 'admin', 'manager', 'driver'), async (req, res, next) => {
  try {
    const { vehicleId, stationId, parkingSpaceId, type, notes = '' } = req.body;

    const vehicleError = validateRequired(vehicleId, 'Vehicle');
    if (vehicleError) return res.status(400).json({ success: false, message: vehicleError });
    const typeError = validateRequired(type, 'Type');
    if (typeError) return res.status(400).json({ success: false, message: typeError });

    if (!['check-in', 'check-out'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be "check-in" or "check-out"' });
    }

    const db = getDB();

    // Verify vehicle exists
    let vehicle;
    try {
      vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(vehicleId) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Validate QR status
    if (vehicle.status === 'deactivated' || vehicle.qrStatus === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'This vehicle has been removed from the fleet. QR code is no longer valid.',
        errorCode: 'VEHICLE_DEACTIVATED',
      });
    }

    const currentYear = new Date().getFullYear();
    if (!vehicle.qrCode || vehicle.qrStatus !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'No active QR code found. Please contact admin to generate QR code for this vehicle.',
        errorCode: 'QR_NOT_GENERATED',
      });
    }

    if (vehicle.qrGeneratedYear && vehicle.qrGeneratedYear < currentYear) {
      return res.status(400).json({
        success: false,
        message: `QR code expired. This QR was issued for ${vehicle.qrGeneratedYear}. Please contact admin for ${currentYear} renewal.`,
        errorCode: 'QR_EXPIRED',
      });
    }

    // Verify station exists if provided
    if (stationId) {
      let station;
      try {
        station = await db.collection('stations').findOne({ _id: new ObjectId(stationId) });
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid station ID' });
      }
      if (!station) {
        return res.status(404).json({ success: false, message: 'Station not found' });
      }
    }

    // Verify parking space exists if provided
    if (parkingSpaceId) {
      let parkingSpace;
      try {
        parkingSpace = await db.collection('parking_spaces').findOne({ _id: new ObjectId(parkingSpaceId) });
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid parking space ID' });
      }
      if (!parkingSpace) {
        return res.status(404).json({ success: false, message: 'Parking space not found' });
      }
    }

    // Check-in logic: ensure vehicle is not already checked-in at the same station
    if (type === 'check-in') {
      const activeCheckin = await db.collection('vehicle_checkins').findOne({
        vehicleId,
        type: 'check-in',
        ...(stationId ? { stationId } : {}),
      });

      // If there's an active check-in, check if it has a matching check-out
      if (activeCheckin) {
        const correspondingCheckout = await db.collection('vehicle_checkins').findOne({
          vehicleId,
          type: 'check-out',
          timestamp: { $gt: activeCheckin.timestamp },
        });

        if (!correspondingCheckout) {
          return res.status(400).json({
            success: false,
            message: 'Vehicle is already checked in at this station',
          });
        }
      }

      // Update parking space status if provided
      if (parkingSpaceId) {
        await db.collection('parking_spaces').updateOne(
          { _id: new ObjectId(parkingSpaceId) },
          { $set: { status: 'occupied', updatedAt: new Date() } }
        );
      }
    }

    // Check-out logic: ensure vehicle is currently checked-in
    if (type === 'check-out') {
      const activeCheckin = await db.collection('vehicle_checkins').findOne({
        vehicleId,
        type: 'check-in',
      });

      if (activeCheckin) {
        const correspondingCheckout = await db.collection('vehicle_checkins').findOne({
          vehicleId,
          type: 'check-out',
          timestamp: { $gt: activeCheckin.timestamp },
        });

        if (correspondingCheckout) {
          return res.status(400).json({
            success: false,
            message: 'Vehicle is not currently checked in',
          });
        }

        // Free up the parking space from the original check-in
        if (activeCheckin.parkingSpaceId) {
          await db.collection('parking_spaces').updateOne(
            { _id: new ObjectId(activeCheckin.parkingSpaceId) },
            { $set: { status: 'available', updatedAt: new Date() } }
          );
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Vehicle is not currently checked in',
        });
      }
    }

    const checkinRecord = {
      vehicleId,
      plateNumber: vehicle.plateNumber,
      stationId: stationId || null,
      parkingSpaceId: parkingSpaceId || null,
      type,
      scannedBy: req.user._id.toString(),
      notes: notes.trim(),
      timestamp: new Date(),
    };

    const result = await db.collection('vehicle_checkins').insertOne(checkinRecord);
    checkinRecord._id = result.insertedId;

    // Enrich response with station and parking info
    if (stationId) {
      const station = await db.collection('stations').findOne({ _id: new ObjectId(stationId) });
      checkinRecord.stationName = station?.name || 'Unknown Station';
    }
    if (parkingSpaceId) {
      const parkingSpace = await db.collection('parking_spaces').findOne({ _id: new ObjectId(parkingSpaceId) });
      checkinRecord.parkingSpaceName = parkingSpace?.name || 'Unknown Space';
    }
    checkinRecord.vehicleName = vehicle.name;

    res.status(201).json({ success: true, data: checkinRecord });
  } catch (error) {
    next(error);
  }
});

// GET /api/checkins - List check-in/out events
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { vehicleId, stationId, type, startDate, endDate, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const db = getDB();
    const filter = {};

    if (vehicleId) filter.vehicleId = vehicleId;
    if (stationId) filter.stationId = stationId;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      db.collection('vehicle_checkins')
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection('vehicle_checkins').countDocuments(filter),
    ]);

    // Enrich with vehicle, station, parking names
    const vehicleIds = [...new Set(records.map((r) => r.vehicleId).filter(Boolean))];
    const stationIds = [...new Set(records.map((r) => r.stationId).filter(Boolean))];
    const parkingIds = [...new Set(records.map((r) => r.parkingSpaceId).filter(Boolean))];

    const [vehicles, stations, parkingSpaces] = await Promise.all([
      vehicleIds.length
        ? db.collection('vehicles').find({ _id: { $in: vehicleIds.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) } }).toArray()
        : [],
      stationIds.length
        ? db.collection('stations').find({ _id: { $in: stationIds.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) } }).toArray()
        : [],
      parkingIds.length
        ? db.collection('parking_spaces').find({ _id: { $in: parkingIds.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) } }).toArray()
        : [],
    ]);

    const vehicleMap = Object.fromEntries(vehicles.map((v) => [v._id.toString(), v.name]));
    const stationMap = Object.fromEntries(stations.map((s) => [s._id.toString(), s.name]));
    const parkingMap = Object.fromEntries(parkingSpaces.map((p) => [p._id.toString(), p.name]));

    const enriched = records.map((r) => ({
      ...r,
      vehicleName: vehicleMap[r.vehicleId] || r.vehicleName || 'Unknown',
      stationName: stationMap[r.stationId] || r.stationName || null,
      parkingSpaceName: parkingMap[r.parkingSpaceId] || r.parkingSpaceName || null,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/checkins/active - Get all currently checked-in vehicles
router.get('/active', authenticate, async (req, res, next) => {
  try {
    const db = getDB();

    // Find all check-ins without a corresponding check-out
    const allCheckins = await db.collection('vehicle_checkins')
      .find({ type: 'check-in' })
      .sort({ timestamp: -1 })
      .toArray();

    const activeCheckins = [];

    for (const checkin of allCheckins) {
      const checkout = await db.collection('vehicle_checkins').findOne({
        vehicleId: checkin.vehicleId,
        type: 'check-out',
        timestamp: { $gt: checkin.timestamp },
      });

      if (!checkout) {
        activeCheckins.push(checkin);
      }
    }

    // Enrich with names
    const vehicleIds = [...new Set(activeCheckins.map((r) => r.vehicleId).filter(Boolean))];
    const stationIds = [...new Set(activeCheckins.map((r) => r.stationId).filter(Boolean))];

    const [vehicles, stations] = await Promise.all([
      vehicleIds.length
        ? db.collection('vehicles').find({ _id: { $in: vehicleIds.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) } }).toArray()
        : [],
      stationIds.length
        ? db.collection('stations').find({ _id: { $in: stationIds.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) } }).toArray()
        : [],
    ]);

    const vehicleMap = Object.fromEntries(vehicles.map((v) => [v._id.toString(), v]));
    const stationMap = Object.fromEntries(stations.map((s) => [s._id.toString(), s.name]));

    const enriched = activeCheckins.map((r) => ({
      ...r,
      vehicleName: vehicleMap[r.vehicleId]?.name || 'Unknown',
      vehiclePlate: vehicleMap[r.vehicleId]?.plateNumber || r.plateNumber,
      stationName: stationMap[r.stationId] || null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// GET /api/checkins/vehicle/:vehicleId - Get latest status for a specific vehicle
router.get('/vehicle/:vehicleId', authenticate, async (req, res, next) => {
  try {
    const db = getDB();

    const latestCheckin = await db.collection('vehicle_checkins')
      .findOne(
        { vehicleId: req.params.vehicleId },
        { sort: { timestamp: -1 } }
      );

    if (!latestCheckin) {
      return res.json({
        success: true,
        data: { isCheckedIn: false, lastEvent: null },
      });
    }

    const isCheckedIn = latestCheckin.type === 'check-in';

    // Enrich with names
    if (latestCheckin.stationId) {
      const station = await db.collection('stations').findOne({ _id: new ObjectId(latestCheckin.stationId) });
      latestCheckin.stationName = station?.name || 'Unknown Station';
    }
    const vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.vehicleId) });
    latestCheckin.vehicleName = vehicle?.name || 'Unknown';
    latestCheckin.vehiclePlate = vehicle?.plateNumber || latestCheckin.plateNumber;

    res.json({
      success: true,
      data: { isCheckedIn, lastEvent: latestCheckin },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
