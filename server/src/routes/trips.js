import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorizeModule } from '../middleware/auth.js';
import { validateRequired, validatePagination } from '../middleware/validation.js';
import { logAudit, serializeForAudit } from '../utils/audit.js';

const router = Router();

const enrichTrip = async (db, trip) => {
  const safeLookup = async (collection, id) => {
    if (!id) return null;
    try {
      return await db.collection(collection).findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  };

  const [vehicle, user] = await Promise.all([
    safeLookup('vehicles', trip.vehicleId),
    trip.userId ? db.collection('users').findOne({ _id: new ObjectId(trip.userId) }, { projection: { password: 0 } }).catch(() => null) : null,
  ]);

  return {
    ...trip,
    vehicleDetails: vehicle,
    userDetails: user,
  };
};

// GET /api/trips - List trips
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const db = getDB();
    const filter = {};

    if (status) filter.status = status;

    // Non-admin users see only their own trips
    if (req.user.role !== 'admin') {
      const isFleetManager = req.user.moduleAccess?.fleet?.role === 'admin' ||
                             req.user.moduleAccess?.fleet?.role === 'manager';
      if (!isFleetManager) {
        filter.userId = req.user._id.toString();
      }
    }

    const [trips, total] = await Promise.all([
      db.collection('trips').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
      db.collection('trips').countDocuments(filter),
    ]);

    const enriched = await Promise.all(trips.map(t => enrichTrip(db, t)));

    res.json({
      success: true,
      data: enriched,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/trips/:id - Get single trip
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let trip;
    try {
      trip = await db.collection('trips').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid trip ID' });
    }

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const enriched = await enrichTrip(db, trip);
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// POST /api/trips - Record vehicle departure
router.post('/', authenticate, authorizeModule('fleet', 'admin', 'manager', 'user'), async (req, res, next) => {
  try {
    const {
      vehicleId, destination, purpose, departureDate, returnDate, passengers = [],
      startingMileage,
    } = req.body;

    const destError = validateRequired(destination, 'Destination');
    if (destError) return res.status(400).json({ success: false, message: destError });
    const purposeError = validateRequired(purpose, 'Purpose');
    if (purposeError) return res.status(400).json({ success: false, message: purposeError });
    const dateError = validateRequired(departureDate, 'Departure Date');
    if (dateError) return res.status(400).json({ success: false, message: dateError });

    // Validate vehicleId format if provided
    let validVehicleId = null;
    if (vehicleId) {
      try {
        validVehicleId = new ObjectId(vehicleId);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
      }
    }

    const db = getDB();

    // Check for vehicle double-booking
    if (validVehicleId) {
      const conflict = await db.collection('trips').findOne({
        vehicleId: validVehicleId.toString(),
        status: 'out',
      });
      if (conflict) {
        return res.status(409).json({ success: false, message: 'Vehicle is already out on a trip' });
      }
    }

    const tripId = `TR${Date.now().toString(36).toUpperCase()}`;
    const newTrip = {
      tripId,
      vehicleId: validVehicleId ? validVehicleId.toString() : null,
      userId: req.user._id.toString(),
      destination: destination.trim(),
      purpose: purpose.trim(),
      departureDate: new Date(departureDate),
      returnDate: returnDate ? new Date(returnDate) : null,
      actualDeparture: new Date(),
      actualReturn: null,
      passengers: Array.isArray(passengers) ? passengers : [],
      startingMileage: startingMileage ? parseInt(startingMileage) : null,
      endingMileage: null,
      distanceCovered: null,
      status: 'out',
      history: [{
        status: 'out',
        changedBy: req.user._id.toString(),
        changedAt: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('trips').insertOne(newTrip);
    newTrip._id = result.insertedId;

    // Update vehicle status if assigned
    if (validVehicleId) {
      await db.collection('vehicles').updateOne(
        { _id: validVehicleId },
        { $set: { status: 'in-use', updatedAt: new Date() } }
      );
    }

    const enriched = await enrichTrip(db, newTrip);

    res.status(201).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// PUT /api/trips/:id/status - Update trip status (record return)
router.put('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status, endingMileage } = req.body;
    const db = getDB();

    let trip;
    try {
      trip = await db.collection('trips').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid trip ID' });
    }

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Only allow out → completed
    if (trip.status !== 'out' || status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${trip.status} to ${status}`,
      });
    }

    const previousTrip = serializeForAudit(trip);

    const updateData = { status: 'completed', actualReturn: new Date(), updatedAt: new Date() };
    if (endingMileage !== undefined && endingMileage !== null) {
      updateData.endingMileage = parseInt(endingMileage);
      if (trip.startingMileage) {
        updateData.distanceCovered = parseInt(endingMileage) - trip.startingMileage;
      }
    }

    await db.collection('trips').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: updateData,
        $push: {
          history: {
            status: 'completed',
            changedBy: req.user._id.toString(),
            changedAt: new Date(),
          },
        },
      },
    );

    // Update vehicle status back to available
    if (trip.vehicleId) {
      const vehicleUpdate = { status: 'available', updatedAt: new Date() };
      if (endingMileage) {
        vehicleUpdate.currentMileage = parseInt(endingMileage);
        vehicleUpdate.mileage = parseInt(endingMileage);
      }
      await db.collection('vehicles').updateOne(
        { _id: new ObjectId(trip.vehicleId) },
        { $set: vehicleUpdate },
      );
    }

    const updated = await db.collection('trips').findOne({ _id: new ObjectId(req.params.id) });

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'completed',
      module: 'fleet',
      entityType: 'trip',
      entityId: req.params.id,
      previousValue: previousTrip,
      newValue: serializeForAudit(updated),
      ipAddress: req.ip,
      description: `Trip ${trip.tripId} completed`,
    });

    const enriched = await enrichTrip(db, updated);
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

export default router;
