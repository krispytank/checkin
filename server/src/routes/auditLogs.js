import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validatePagination } from '../middleware/validation.js';

const router = Router();

// GET /api/audit-logs
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const db = getDB();
    const {
      page = 1,
      limit = 20,
      module,
      action,
      entityType,
      userId,
      stationId,
      startDate,
      endDate,
      search,
    } = req.query;

    const { page: p, limit: l, skip } = validatePagination(page, limit);

    const filter = {};

    if (module) filter.module = module;
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (userId) filter.userId = userId;
    if (stationId) filter.stationId = stationId;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: 'i' } },
        { entityType: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { module: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      db.collection('audit_logs')
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(l)
        .toArray(),
      db.collection('audit_logs').countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/audit-logs/stats
router.get('/stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const db = getDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalToday,
      byModule,
      byAction,
    ] = await Promise.all([
      db.collection('audit_logs').countDocuments({ timestamp: { $gte: today } }),
      db.collection('audit_logs').aggregate([
        { $match: { timestamp: { $gte: today } } },
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),
      db.collection('audit_logs').aggregate([
        { $match: { timestamp: { $gte: today } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),
    ]);

    res.json({
      success: true,
      data: {
        totalToday,
        byModule,
        byAction,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/audit-logs/purge (admin only, for testing/maintenance)
router.delete('/purge', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const db = getDB();
    const { olderThan } = req.query;

    const filter = {};
    if (olderThan) {
      filter.timestamp = { $lt: new Date(olderThan) };
    }

    const result = await db.collection('audit_logs').deleteMany(filter);

    res.json({
      success: true,
      message: `Purged ${result.deletedCount} audit log entries`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
