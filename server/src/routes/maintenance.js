import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorizeModule } from '../middleware/auth.js';
import { validateRequired, validatePagination } from '../middleware/validation.js';
import { logAudit } from '../utils/audit.js';

const router = Router();

const MAINTENANCE_TYPES = [
  'scheduled_service', 'repair', 'insurance_renewal', 'inspection',
  'tyre_replacement', 'battery_replacement', 'oil_service',
];

// GET /api/maintenance
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { vehicleId, status, type, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [records, total] = await Promise.all([
      db.collection('vehicle_maintenance')
        .find(filter)
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection('vehicle_maintenance').countDocuments(filter),
    ]);

    // Enrich with vehicle info
    const vehicleIds = [...new Set(records.map(r => r.vehicleId))];
    const vehicles = vehicleIds.length > 0
      ? await db.collection('vehicles').find({ _id: { $in: vehicleIds.map(id => { try { return new ObjectId(id); } catch { return id; } }) } }).toArray()
      : [];
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v._id.toString(), v]));

    const enriched = records.map(r => ({
      ...r,
      vehicle: vehicleMap[r.vehicleId] || null,
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

// GET /api/maintenance/upcoming
router.get('/upcoming', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { vehicleId, days = 30 } = req.query;

    const now = new Date();
    const futureDate = new Date(now.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

    const filter = {
      status: 'scheduled',
      reminderDate: { $gte: now, $lte: futureDate },
    };
    if (vehicleId) filter.vehicleId = vehicleId;

    const records = await db.collection('vehicle_maintenance')
      .find(filter)
      .sort({ reminderDate: 1 })
      .toArray();

    const vehicleIds = [...new Set(records.map(r => r.vehicleId))];
    const vehicles = vehicleIds.length > 0
      ? await db.collection('vehicles').find({ _id: { $in: vehicleIds.map(id => { try { return new ObjectId(id); } catch { return id; } }) } }).toArray()
      : [];
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v._id.toString(), v]));

    const enriched = records.map(r => ({
      ...r,
      vehicle: vehicleMap[r.vehicleId] || null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// GET /api/maintenance/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let record;
    try {
      record = await db.collection('vehicle_maintenance').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

// POST /api/maintenance
router.post('/', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const {
      vehicleId, type, description, scheduledDate, cost, provider, notes, reminderDate,
    } = req.body;

    const _err = validateRequired(vehicleId, 'Vehicle'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }
    const _err2 = validateRequired(type, 'Type'); if (_err2) {
      return res.status(400).json({ success: false, message: _err2 });
    }

    if (!MAINTENANCE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${MAINTENANCE_TYPES.join(', ')}`,
      });
    }

    const db = getDB();

    const record = {
      vehicleId,
      type,
      description: description?.trim() || '',
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      completedDate: null,
      cost: cost ? parseFloat(cost) : null,
      provider: provider?.trim() || null,
      status: 'scheduled',
      reminderDate: reminderDate ? new Date(reminderDate) : (scheduledDate ? new Date(scheduledDate) : null),
      notes: notes?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('vehicle_maintenance').insertOne(record);

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'created',
      module: 'fleet',
      entityType: 'maintenance',
      entityId: result.insertedId,
      newValue: record,
      ipAddress: req.ip,
      description: `Scheduled ${type.replace(/_/g, ' ')} for vehicle`,
    });

    res.status(201).json({ success: true, data: { ...record, _id: result.insertedId } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/maintenance/:id
router.put('/:id', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, completedDate, cost, provider, notes, description, scheduledDate, reminderDate } = req.body;

    const db = getDB();
    let record;
    try {
      record = await db.collection('vehicle_maintenance').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    const updateData = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (completedDate !== undefined) updateData.completedDate = completedDate ? new Date(completedDate) : null;
    if (cost !== undefined) updateData.cost = cost ? parseFloat(cost) : null;
    if (provider !== undefined) updateData.provider = provider?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || '';
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (reminderDate !== undefined) updateData.reminderDate = reminderDate ? new Date(reminderDate) : null;

    await db.collection('vehicle_maintenance').updateOne(
      { _id: record._id },
      { $set: updateData },
    );

    const updated = await db.collection('vehicle_maintenance').findOne({ _id: record._id });

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'updated',
      module: 'fleet',
      entityType: 'maintenance',
      entityId: id,
      previousValue: record,
      newValue: updated,
      ipAddress: req.ip,
      description: `Updated maintenance record: ${record.type.replace(/_/g, ' ')}`,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/maintenance/:id
router.delete('/:id', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const db = getDB();
    let record;
    try {
      record = await db.collection('vehicle_maintenance').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    await db.collection('vehicle_maintenance').deleteOne({ _id: record._id });

    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
