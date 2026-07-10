import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/file-reports/movement-summary
router.get('/movement-summary', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { startDate, endDate, courtStationId, registryId } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate + 'T23:59:59.999Z');

    const matchFilter = {};
    if (Object.keys(dateFilter).length > 0) matchFilter.dateIssued = dateFilter;

    const byType = await db.collection('file_movements').aggregate([
      { $match: matchFilter },
      { $group: { _id: '$movementType', count: { $sum: 1 } } },
    ]).toArray();

    const byDay = await db.collection('file_movements').aggregate([
      { $match: matchFilter },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$dateIssued' } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]).toArray();

    const overdueFiles = await db.collection('file_movements').countDocuments({
      status: 'active',
      expectedReturnDate: { $lt: new Date() },
    });

    const avgTimeOutside = await db.collection('file_movements').aggregate([
      { $match: { status: 'returned', actualReturnDate: { $ne: null }, dateIssued: { $ne: null } } },
      { $project: {
        duration: { $subtract: ['$actualReturnDate', '$dateIssued'] },
      }},
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
    ]).toArray();

    res.json({
      success: true,
      data: {
        byType,
        byDay,
        overdueFiles,
        avgTimeOutsideHours: avgTimeOutside[0] ? Math.round(avgTimeOutside[0].avgDuration / (1000 * 60 * 60) * 10) / 10 : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/file-reports/registry-activity
router.get('/registry-activity', authenticate, async (req, res, next) => {
  try {
    const db = getDB();

    const byRegistry = await db.collection('case_files').aggregate([
      { $group: {
        _id: '$registryId',
        totalFiles: { $sum: 1 },
        issued: { $sum: { $cond: [{ $eq: ['$fileStatus', 'issued'] }, 1, 0] } },
        inCourt: { $sum: { $cond: [{ $eq: ['$fileStatus', 'in_court'] }, 1, 0] } },
        atRegistry: { $sum: { $cond: [{ $eq: ['$fileStatus', 'at_registry'] }, 1, 0] } },
        strongRoom: { $sum: { $cond: [{ $eq: ['$fileStatus', 'strong_room'] }, 1, 0] } },
      }},
    ]).toArray();

    const registryIds = byRegistry.map(r => r._id).filter(Boolean);
    const registries = registryIds.length > 0
      ? await db.collection('registries').find({ _id: { $in: registryIds.map(id => { try { return new ObjectId(id); } catch { return id; } }) } }).toArray()
      : [];
    const registryMap = Object.fromEntries(registries.map(r => [r._id.toString(), r]));

    res.json({
      success: true,
      data: byRegistry.map(r => ({
        ...r,
        registryName: registryMap[r._id]?.name || r._id,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/file-reports/custody
router.get('/custody', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { registryId, courtStationId } = req.query;

    const filter = { fileStatus: { $ne: 'at_registry' }, currentHolderId: { $ne: null } };
    if (registryId) filter.registryId = registryId;
    if (courtStationId) filter.courtStationId = courtStationId;

    const files = await db.collection('case_files').find(filter).toArray();

    const holderIds = [...new Set(files.map(f => f.currentHolderId).filter(Boolean))];
    const holders = holderIds.length > 0
      ? await db.collection('users').find({ _id: { $in: holderIds.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) } }, { projection: { name: 1, employeeId: 1 } }).toArray()
      : [];
    const holderMap = Object.fromEntries(holders.map(u => [u._id.toString(), u]));

    const now = new Date();
    const enriched = files.map(f => {
      const daysOut = f.updatedAt ? Math.floor((now - f.updatedAt) / (1000 * 60 * 60 * 24)) : 0;
      const holder = holderMap[f.currentHolderId];
      return {
        ...f,
        assignedToName: holder?.name || null,
        assignedToEmployeeId: holder?.employeeId || null,
        daysOutsideRegistry: daysOut,
        isOverdue: daysOut > 7,
      };
    }).sort((a, b) => b.daysOutsideRegistry - a.daysOutsideRegistry);

    res.json({ success: true, data: enriched.slice(0, 50) });
  } catch (error) {
    next(error);
  }
});

// GET /api/file-reports/user-activity
router.get('/user-activity', authenticate, async (req, res, next) => {
  try {
    const db = getDB();

    const activeHolders = await db.collection('case_files').aggregate([
      { $match: { currentHolderId: { $ne: null }, fileStatus: { $ne: 'at_registry' } } },
      { $group: {
        _id: '$currentHolderId',
        fileCount: { $sum: 1 },
        files: { $push: '$caseFileNumber' },
      }},
      { $sort: { fileCount: -1 } },
      { $limit: 20 },
    ]).toArray();

    const userIds = activeHolders.map(h => h._id).filter(Boolean);
    const users = userIds.length > 0
      ? await db.collection('users').find({ _id: { $in: userIds.map(id => { try { return new ObjectId(id); } catch { return id; } }) } }, { projection: { name: 1, employeeId: 1 } }).toArray()
      : [];
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    res.json({
      success: true,
      data: activeHolders.map(h => ({
        ...h,
        userName: userMap[h._id]?.name || h._id,
        employeeId: userMap[h._id]?.employeeId || '-',
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
