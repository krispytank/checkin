import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorizeModule } from '../middleware/auth.js';
import { validateRequired, validatePagination } from '../middleware/validation.js';
import { logAudit, serializeForAudit } from '../utils/audit.js';
import { sendSystemNotification } from './notifications.js';

const router = Router();

const VALID_TRIP_TRANSITIONS = {
  requested: ['supervisor_approved'],
  supervisor_approved: ['fleet_approved', 'rejected'],
  fleet_approved: ['vehicle_assigned'],
  vehicle_assigned: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
  rejected: [],
  // Legacy compatibility
  pending: ['approved', 'rejected'],
  approved: ['in-progress'],
  'in-progress': ['completed'],
};

const enrichTrip = async (db, trip) => {
  const safeLookup = async (collection, id) => {
    if (!id) return null;
    try {
      return await db.collection(collection).findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  };

  const [vehicle, user, driver, requestingOfficer] = await Promise.all([
    safeLookup('vehicles', trip.vehicleId),
    trip.userId ? db.collection('users').findOne({ _id: new ObjectId(trip.userId) }, { projection: { password: 0 } }).catch(() => null) : null,
    safeLookup('users', trip.driverId),
    safeLookup('users', trip.requestingOfficerId),
  ]);

  // Enrich passengers
  let enrichedPassengers = [];
  if (trip.passengers && Array.isArray(trip.passengers) && trip.passengers.length > 0) {
    const passengerIds = trip.passengers
      .map(p => typeof p === 'string' ? p : p.userId)
      .filter(Boolean);
    if (passengerIds.length > 0) {
      const passengerUsers = await db.collection('users')
        .find({ _id: { $in: passengerIds.map(id => { try { return new ObjectId(id); } catch { return id; } }) } }, { projection: { password: 0 } })
        .toArray();
      const passengerMap = Object.fromEntries(passengerUsers.map(u => [u._id.toString(), u]));
      enrichedPassengers = trip.passengers.map(p => {
        const id = typeof p === 'string' ? p : p.userId;
        return { ...p, userDetails: passengerMap[id] || null };
      });
    } else {
      enrichedPassengers = trip.passengers;
    }
  }

  return {
    ...trip,
    vehicleDetails: vehicle,
    userDetails: user,
    driverDetails: driver,
    requestingOfficerDetails: requestingOfficer,
    passengersEnriched: enrichedPassengers,
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

// POST /api/trips - Create trip
router.post('/', authenticate, authorizeModule('fleet', 'admin', 'manager', 'user'), async (req, res, next) => {
  try {
    const {
      vehicleId, destination, purpose, departureDate, returnDate, passengers = [],
      requestingOfficerId, expectedDeparture, expectedReturn,
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
        status: { $in: ['pending', 'approved', 'in-progress'] },
        $or: [
          { departureDate: { $lte: new Date(returnDate || departureDate) }, returnDate: { $gte: new Date(departureDate) } },
        ],
      });
      if (conflict) {
        return res.status(409).json({ success: false, message: 'Vehicle is already booked for this date range' });
      }
    }

    const tripId = `TR${Date.now().toString(36).toUpperCase()}`;
    const newTrip = {
      tripId,
      vehicleId: validVehicleId ? validVehicleId.toString() : null,
      userId: req.user._id.toString(),
      driverId: null,
      requestingOfficerId: requestingOfficerId || req.user._id.toString(),
      destination: destination.trim(),
      purpose: purpose.trim(),
      departureDate: new Date(departureDate),
      returnDate: returnDate ? new Date(returnDate) : null,
      expectedDeparture: expectedDeparture ? new Date(expectedDeparture) : null,
      actualDeparture: null,
      expectedReturn: expectedReturn ? new Date(expectedReturn) : null,
      actualReturn: null,
      passengers: Array.isArray(passengers) ? passengers : [],
      startingMileage: null,
      endingMileage: null,
      distanceCovered: null,
      status: 'pending',
      history: [{
        status: 'pending',
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
        { $set: { status: 'booked', updatedAt: new Date() } }
      );
    }

    const enriched = await enrichTrip(db, newTrip);

    // Notify fleet admins/managers of new trip request
    const fleetApprovers = await db.collection('users').find({
      $or: [
        { role: 'admin' },
        { 'moduleAccess.fleet.role': { $in: ['admin', 'manager'] } },
      ],
    }).toArray();
    for (const approver of fleetApprovers) {
      if (approver._id.toString() !== req.user._id.toString()) {
        await sendSystemNotification(
          db, approver._id.toString(), 'approvalRequired',
          `New trip request: ${tripId}`,
          `${req.user.name || 'A user'} has requested a trip to ${destination.trim()} for ${purpose.trim()}.`,
          '/fleet/trips',
        );
      }
    }

    res.status(201).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// PUT /api/trips/:id/status - Update trip status
router.put('/:id/status', authenticate, async (req, res, next) => {
  try {
    const {
      status, driverId, startingMileage, endingMileage, distanceCovered,
      actualDeparture, actualReturn, vehicleId: newVehicleId,
    } = req.body;
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

    // Validate transition
    if (!VALID_TRIP_TRANSITIONS[trip.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${trip.status} to ${status}`,
      });
    }

    // Permission checks
    const isAdmin = req.user.role === 'admin';
    const isFleetAdmin = req.user.moduleAccess?.fleet?.role === 'admin';
    const isFleetManager = req.user.moduleAccess?.fleet?.role === 'manager';

    if (['approved', 'supervisor_approved', 'fleet_approved', 'rejected', 'vehicle_assigned'].includes(status)
        && !isAdmin && !isFleetAdmin && !isFleetManager) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    if (status === 'in_progress' && !isAdmin && !isFleetAdmin && !isFleetManager) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const previousTrip = serializeForAudit(trip);

    // Update status
    const updateData = { status, updatedAt: new Date() };
    if (driverId) updateData.driverId = driverId;
    if (startingMileage !== undefined) updateData.startingMileage = parseInt(startingMileage);
    if (endingMileage !== undefined) updateData.endingMileage = parseInt(endingMileage);
    if (distanceCovered !== undefined) updateData.distanceCovered = parseInt(distanceCovered);
    if (actualDeparture) updateData.actualDeparture = new Date(actualDeparture);
    if (actualReturn) updateData.actualReturn = new Date(actualReturn);

    // Handle vehicle assignment
    if (newVehicleId) {
      updateData.vehicleId = newVehicleId;
    }

    await db.collection('trips').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: updateData,
        $push: {
          history: {
            status,
            changedBy: req.user._id.toString(),
            changedAt: new Date(),
          },
        },
      },
    );

    // Update vehicle status based on trip status
    const activeVehicleId = newVehicleId || trip.vehicleId;
    if (status === 'in_progress' && activeVehicleId) {
      await db.collection('vehicles').updateOne(
        { _id: new ObjectId(activeVehicleId) },
        { $set: { status: 'in-use', updatedAt: new Date() } },
      );
    } else if (status === 'completed' && activeVehicleId) {
      const updateVehicleFields = { status: 'available', updatedAt: new Date() };
      if (endingMileage) updateVehicleFields.currentMileage = parseInt(endingMileage);
      if (endingMileage) updateVehicleFields.mileage = parseInt(endingMileage);
      await db.collection('vehicles').updateOne(
        { _id: new ObjectId(activeVehicleId) },
        { $set: updateVehicleFields },
      );
    } else if (status === 'rejected' && activeVehicleId) {
      await db.collection('vehicles').updateOne(
        { _id: new ObjectId(activeVehicleId) },
        { $set: { status: 'available', updatedAt: new Date() } },
      );
    }

    const updated = await db.collection('trips').findOne({ _id: new ObjectId(req.params.id) });

    await logAudit({
      userId: req.user._id.toString(),
      action: status,
      module: 'fleet',
      entityType: 'trip',
      entityId: req.params.id,
      previousValue: previousTrip,
      newValue: serializeForAudit(updated),
      ipAddress: req.ip,
      description: `Trip ${trip.tripId} status changed to ${status}`,
    });

    // Send notifications
    if (['approved', 'supervisor_approved', 'fleet_approved'].includes(status)) {
      await sendSystemNotification(
        db, trip.userId, 'tripApproved',
        `Trip ${trip.tripId} ${status.replace(/_/g, ' ')}`,
        `Your trip request ${trip.tripId} to ${trip.destination} has been ${status.replace(/_/g, ' ')}.`,
      );
    }

    const enriched = await enrichTrip(db, updated);
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

export default router;
