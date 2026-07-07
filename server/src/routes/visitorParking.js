import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorizeModule } from '../middleware/auth.js';
import { validateRequired, validatePagination } from '../middleware/validation.js';
import { logAudit } from '../utils/audit.js';

const router = Router();

const VISITOR_CATEGORIES = ['advocate', 'litigant', 'witness', 'government_officer', 'other'];

// GET /api/visitor-parking
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { courtStationId, status, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const filter = {};
    if (courtStationId) filter.courtStationId = courtStationId;
    if (status) filter.status = status;
    else filter.status = 'parked'; // default to currently parked

    const [visitors, total] = await Promise.all([
      db.collection('visitor_parking')
        .find(filter)
        .sort({ timeIn: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection('visitor_parking').countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: visitors,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/visitor-parking/stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { courtStationId } = req.query;

    const filter = { status: 'parked' };
    if (courtStationId) filter.courtStationId = courtStationId;

    const currentlyParked = await db.collection('visitor_parking').countDocuments(filter);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayFilter = { timeIn: { $gte: today } };
    if (courtStationId) todayFilter.courtStationId = courtStationId;

    const todayCount = await db.collection('visitor_parking').countDocuments(todayFilter);

    const byCategory = await db.collection('visitor_parking')
      .aggregate([
        { $match: filter },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ])
      .toArray();

    res.json({
      success: true,
      data: { currentlyParked, todayCount, byCategory },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/visitor-parking/check-in
router.post('/check-in', authenticate, async (req, res, next) => {
  try {
    const {
      vehicleRegNumber, ownerName, category, purposeOfVisit,
      courtStationId, courtBeingVisited, parkingSpaceId, parkingLotId,
    } = req.body;

    const _err = validateRequired(vehicleRegNumber, 'Vehicle Registration Number'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }
    const _err2 = validateRequired(ownerName, 'Owner Name'); if (_err2) {
      return res.status(400).json({ success: false, message: _err2 });
    }
    const _err3 = validateRequired(category, 'Category'); if (_err3) {
      return res.status(400).json({ success: false, message: _err3 });
    }
    const _err4 = validateRequired(courtStationId, 'Court Station'); if (_err4) {
      return res.status(400).json({ success: false, message: _err4 });
    }

    if (!VISITOR_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VISITOR_CATEGORIES.join(', ')}`,
      });
    }

    const db = getDB();

    const entry = {
      vehicleRegNumber: vehicleRegNumber.toUpperCase().trim(),
      ownerName: ownerName.trim(),
      category,
      purposeOfVisit: purposeOfVisit?.trim() || '',
      courtStationId,
      courtBeingVisited: courtBeingVisited?.trim() || null,
      parkingSpaceId: parkingSpaceId || null,
      parkingLotId: parkingLotId || null,
      timeIn: new Date(),
      timeOut: null,
      status: 'parked',
      createdAt: new Date(),
    };

    const result = await db.collection('visitor_parking').insertOne(entry);

    await logAudit({
      userId: req.user._id.toString(),
      action: 'created',
      module: 'fleet',
      entityType: 'visitor_parking',
      entityId: result.insertedId,
      newValue: entry,
      stationId: courtStationId,
      ipAddress: req.ip,
      description: `Visitor vehicle ${entry.vehicleRegNumber} checked in by ${ownerName}`,
    });

    res.status(201).json({ success: true, data: { ...entry, _id: result.insertedId } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/visitor-parking/:id/check-out
router.put('/:id/check-out', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let entry;
    try {
      entry = await db.collection('visitor_parking').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Visitor parking entry not found' });
    }

    if (entry.status !== 'parked') {
      return res.status(400).json({ success: false, message: 'Vehicle already checked out' });
    }

    await db.collection('visitor_parking').updateOne(
      { _id: entry._id },
      { $set: { timeOut: new Date(), status: 'departed' } },
    );

    await logAudit({
      userId: req.user._id.toString(),
      action: 'updated',
      module: 'fleet',
      entityType: 'visitor_parking',
      entityId: req.params.id,
      previousValue: { status: 'parked', timeOut: null },
      newValue: { status: 'departed', timeOut: new Date() },
      stationId: entry.courtStationId,
      ipAddress: req.ip,
      description: `Visitor vehicle ${entry.vehicleRegNumber} checked out`,
    });

    res.json({ success: true, message: 'Visitor vehicle checked out' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/visitor-parking/:id
router.delete('/:id', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const db = getDB();
    let entry;
    try {
      entry = await db.collection('visitor_parking').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    await db.collection('visitor_parking').deleteOne({ _id: entry._id });

    res.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
