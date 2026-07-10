import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorizeModule } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';
import { logAudit } from '../utils/audit.js';

const router = Router();

// GET /api/parking-lots
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { courtStationId, stationId } = req.query;

    const filter = {};
    const resolvedStationId = courtStationId || stationId;
    if (resolvedStationId) filter.courtStationId = resolvedStationId;

    const lots = await db.collection('parking_lots')
      .find(filter)
      .sort({ name: 1 })
      .toArray();

    const stationIds = [...new Set(lots.map(l => l.courtStationId).filter(Boolean))];
    const stations = stationIds.length
      ? await db.collection('court_stations').find({ _id: { $in: stationIds.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) } }).toArray()
      : [];
    const stationMap = Object.fromEntries(stations.map(s => [s._id.toString(), s.name]));

    const enriched = lots.map(lot => ({
      ...lot,
      stationName: stationMap[lot.courtStationId] || null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// GET /api/parking-lots/stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { courtStationId } = req.query;

    const filter = {};
    if (courtStationId) filter.courtStationId = courtStationId;

    const lots = await db.collection('parking_lots').find(filter).toArray();

    const stats = {
      totalLots: lots.length,
      totalBays: lots.reduce((sum, l) => sum + (l.totalBays || 0), 0),
      occupiedBays: lots.reduce((sum, l) => sum + (l.occupiedBays || 0), 0),
      reservedBays: lots.reduce((sum, l) => sum + (l.reservedBays || 0), 0),
      availableBays: lots.reduce((sum, l) => sum + ((l.totalBays || 0) - (l.occupiedBays || 0) - (l.reservedBays || 0)), 0),
      byCategory: lots.reduce((acc, l) => {
        if (!acc[l.category]) acc[l.category] = { total: 0, occupied: 0, reserved: 0 };
        acc[l.category].total += l.totalBays || 0;
        acc[l.category].occupied += l.occupiedBays || 0;
        acc[l.category].reserved += l.reservedBays || 0;
        return acc;
      }, {}),
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// GET /api/parking-lots/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let lot;
    try {
      lot = await db.collection('parking_lots').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid parking lot ID' });
    }

    if (!lot) {
      return res.status(404).json({ success: false, message: 'Parking lot not found' });
    }

    res.json({ success: true, data: lot });
  } catch (error) {
    next(error);
  }
});

// POST /api/parking-lots
router.post('/', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const {
      name, courtStationId, stationId, category, type, totalBays, description,
      gpsLatitude, gpsLongitude, zone,
    } = req.body;

    const resolvedStationId = courtStationId || stationId;
    const resolvedCategory = category || type || 'standard';

    const _err = validateRequired(name, 'Name'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }
    const _err2 = validateRequired(resolvedStationId, 'Court Station'); if (_err2) {
      return res.status(400).json({ success: false, message: _err2 });
    }

    const db = getDB();

    const existing = await db.collection('parking_lots').findOne({
      name: name.trim(),
      courtStationId: resolvedStationId,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Parking lot with this name already exists at this station',
      });
    }

    const newLot = {
      name: name.trim(),
      courtStationId: resolvedStationId,
      category: resolvedCategory.trim(),
      zone: zone?.trim() || null,
      totalBays: totalBays ? parseInt(totalBays) : 1,
      occupiedBays: 0,
      reservedBays: 0,
      description: description?.trim() || null,
      gpsLatitude: gpsLatitude ? parseFloat(gpsLatitude) : null,
      gpsLongitude: gpsLongitude ? parseFloat(gpsLongitude) : null,
      status: 'active',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('parking_lots').insertOne(newLot);

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'created',
      module: 'fleet',
      entityType: 'parking_lot',
      entityId: result.insertedId,
      newValue: newLot,
      stationId: courtStationId,
      ipAddress: req.ip,
      description: `Created parking lot "${name}" with ${totalBays} bays`,
    });

    res.status(201).json({ success: true, data: { ...newLot, _id: result.insertedId } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/parking-lots/:id
router.put('/:id', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, type, totalBays, description, gpsLatitude, gpsLongitude, status, isActive, zone } = req.body;

    const db = getDB();
    let lot;
    try {
      lot = await db.collection('parking_lots').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid parking lot ID' });
    }

    if (!lot) {
      return res.status(404).json({ success: false, message: 'Parking lot not found' });
    }

    const updateData = { updatedAt: new Date() };

    if (name && name !== lot.name) {
      const existing = await db.collection('parking_lots').findOne({
        name: name.trim(),
        courtStationId: lot.courtStationId,
        _id: { $ne: new ObjectId(id) },
      });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Parking lot name already exists at this station' });
      }
      updateData.name = name.trim();
    }
    if (category || type) updateData.category = (category || type).trim();
    if (zone !== undefined) updateData.zone = zone?.trim() || null;
    if (totalBays !== undefined) {
      const newTotal = parseInt(totalBays);
      if (newTotal < (lot.occupiedBays || 0)) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce total bays below occupied count (${lot.occupiedBays})`,
        });
      }
      updateData.totalBays = newTotal;
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (gpsLatitude !== undefined) updateData.gpsLatitude = gpsLatitude ? parseFloat(gpsLatitude) : null;
    if (gpsLongitude !== undefined) updateData.gpsLongitude = gpsLongitude ? parseFloat(gpsLongitude) : null;
    if (status) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;

    await db.collection('parking_lots').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    const updated = await db.collection('parking_lots').findOne({ _id: new ObjectId(id) });

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'updated',
      module: 'fleet',
      entityType: 'parking_lot',
      entityId: id,
      previousValue: lot,
      newValue: updated,
      stationId: lot.courtStationId,
      ipAddress: req.ip,
      description: `Updated parking lot "${updated.name}"`,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/parking-lots/:id
router.delete('/:id', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const db = getDB();
    let lot;
    try {
      lot = await db.collection('parking_lots').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid parking lot ID' });
    }

    if (!lot) {
      return res.status(404).json({ success: false, message: 'Parking lot not found' });
    }

    if (lot.occupiedBays > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete parking lot: ${lot.occupiedBays} bay(s) still occupied`,
      });
    }

    await db.collection('parking_lots').deleteOne({ _id: new ObjectId(req.params.id) });

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'deleted',
      module: 'fleet',
      entityType: 'parking_lot',
      entityId: req.params.id,
      previousValue: lot,
      stationId: lot.courtStationId,
      ipAddress: req.ip,
      description: `Deleted parking lot "${lot.name}"`,
    });

    res.json({ success: true, message: 'Parking lot deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
