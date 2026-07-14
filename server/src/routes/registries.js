import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequired, validatePagination } from '../middleware/validation.js';
import { logAudit } from '../utils/audit.js';

const router = Router();

// GET /api/registries
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { courtStationId } = req.query;

    const filter = {};
    if (courtStationId) filter.courtStationId = courtStationId;

    const registries = await db.collection('registries')
      .find(filter)
      .sort({ name: 1 })
      .toArray();

    res.json({ success: true, data: registries });
  } catch (error) {
    next(error);
  }
});

// GET /api/registries/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let registry;
    try {
      registry = await db.collection('registries').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid registry ID' });
    }

    if (!registry) {
      return res.status(404).json({ success: false, message: 'Registry not found' });
    }

    res.json({ success: true, data: registry });
  } catch (error) {
    next(error);
  }
});

// POST /api/registries
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, courtStationId, description } = req.body;

    const _err = validateRequired(name, 'Name'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }
    const _err2 = validateRequired(courtStationId, 'Court Station'); if (_err2) {
      return res.status(400).json({ success: false, message: _err2 });
    }

    const db = getDB();

    // Validate court station exists
    let station;
    try {
      station = await db.collection('stations').findOne({ _id: new ObjectId(courtStationId) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid court station ID' });
    }
    if (!station) {
      return res.status(404).json({ success: false, message: 'Court station not found' });
    }

    // Check duplicate name within the same station
    const existing = await db.collection('registries').findOne({
      name: name.trim(),
      courtStationId,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Registry with this name already exists at this station',
      });
    }

    const newRegistry = {
      name: name.trim(),
      courtStationId,
      description: description?.trim() || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('registries').insertOne(newRegistry);

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'created',
      module: 'registries',
      entityType: 'registry',
      entityId: result.insertedId,
      newValue: newRegistry,
      stationId: courtStationId,
      ipAddress: req.ip,
      description: `Created registry "${name}" at ${station.name}`,
    });

    res.status(201).json({
      success: true,
      data: { ...newRegistry, _id: result.insertedId },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/registries/:id
router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const db = getDB();

    let registry;
    try {
      registry = await db.collection('registries').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid registry ID' });
    }

    if (!registry) {
      return res.status(404).json({ success: false, message: 'Registry not found' });
    }

    const updateData = { updatedAt: new Date() };

    if (name && name !== registry.name) {
      const existing = await db.collection('registries').findOne({
        name: name.trim(),
        courtStationId: registry.courtStationId,
        _id: { $ne: new ObjectId(id) },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Registry with this name already exists at this station',
        });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) updateData.description = description?.trim() || '';
    if (isActive !== undefined) updateData.isActive = isActive;

    await db.collection('registries').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    const updated = await db.collection('registries').findOne({ _id: new ObjectId(id) });

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'updated',
      module: 'registries',
      entityType: 'registry',
      entityId: id,
      previousValue: registry,
      newValue: updated,
      stationId: registry.courtStationId,
      ipAddress: req.ip,
      description: `Updated registry "${updated.name}"`,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/registries/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let registry;
    try {
      registry = await db.collection('registries').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid registry ID' });
    }

    if (!registry) {
      return res.status(404).json({ success: false, message: 'Registry not found' });
    }

    // Check if registry has case files
    const fileCount = await db.collection('case_files').countDocuments({ registryId: id });
    if (fileCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete registry: ${fileCount} case file(s) are assigned to it`,
      });
    }

    await db.collection('registries').deleteOne({ _id: new ObjectId(id) });

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'deleted',
      module: 'registries',
      entityType: 'registry',
      entityId: id,
      previousValue: registry,
      stationId: registry.courtStationId,
      ipAddress: req.ip,
      description: `Deleted registry "${registry.name}"`,
    });

    res.json({ success: true, message: 'Registry deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
