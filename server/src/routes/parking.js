import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorizeModule } from '../middleware/auth.js';
import { validateRequired, validatePagination, escapeRegex } from '../middleware/validation.js';

const router = Router();

// GET /api/parking - List parking spaces
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, status, stationId, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const db = getDB();
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { zone: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    if (status) filter.status = status;
    if (stationId) filter.stationId = stationId;

    const [spaces, total] = await Promise.all([
      db.collection('parking_spaces').find(filter).sort({ name: 1 }).skip(skip).limit(limitNum).toArray(),
      db.collection('parking_spaces').countDocuments(filter),
    ]);

    // Enrich with station names
    const stationIds = [...new Set(spaces.map(s => s.stationId).filter(Boolean))];
    const stations = stationIds.length ? await db.collection('stations').find({ _id: { $in: stationIds.map(id => new ObjectId(id)) } }).toArray() : [];
    const stationMap = Object.fromEntries(stations.map(s => [s._id.toString(), s.name]));

    const enriched = spaces.map(s => ({
      ...s,
      stationName: stationMap[s.stationId] || 'Unknown Station',
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

// GET /api/parking/available - List available parking spaces
router.get('/available', authenticate, async (req, res, next) => {
  try {
    const { stationId } = req.query;
    const db = getDB();
    const filter = { status: 'available' };
    if (stationId) filter.stationId = stationId;

    const spaces = await db.collection('parking_spaces').find(filter).sort({ name: 1 }).toArray();
    res.json({ success: true, data: spaces });
  } catch (error) {
    next(error);
  }
});

// GET /api/parking/stats - Get parking statistics
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    
    const [total, available, occupied, reserved] = await Promise.all([
      db.collection('parking_spaces').countDocuments(),
      db.collection('parking_spaces').countDocuments({ status: 'available' }),
      db.collection('parking_spaces').countDocuments({ status: 'occupied' }),
      db.collection('parking_spaces').countDocuments({ status: 'reserved' }),
    ]);

    res.json({
      success: true,
      data: { total, available, occupied, reserved },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/parking/:id - Get single parking space
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let space;
    try {
      space = await db.collection('parking_spaces').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid parking space ID' });
    }

    if (!space) {
      return res.status(404).json({ success: false, message: 'Parking space not found' });
    }

    // Enrich with station name
    if (space.stationId) {
      const station = await db.collection('stations').findOne({ _id: new ObjectId(space.stationId) });
      space.stationName = station?.name || 'Unknown Station';
    }

    res.json({ success: true, data: space });
  } catch (error) {
    next(error);
  }
});

// POST /api/parking - Create parking space (admin only)
router.post('/', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const { name, zone = '', stationId, type = 'standard', description = '' } = req.body;

    const nameError = validateRequired(name, 'Name');
    if (nameError) return res.status(400).json({ success: false, message: nameError });
    const stationError = validateRequired(stationId, 'Station');
    if (stationError) return res.status(400).json({ success: false, message: stationError });

    const db = getDB();

    // Verify station exists
    let station;
    try {
      station = await db.collection('stations').findOne({ _id: new ObjectId(stationId) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid station ID' });
    }
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    const newSpace = {
      name: name.trim(),
      zone: zone.trim(),
      stationId,
      type,
      description: description.trim(),
      status: 'available',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('parking_spaces').insertOne(newSpace);
    newSpace._id = result.insertedId;
    newSpace.stationName = station.name;

    res.status(201).json({ success: true, data: newSpace });
  } catch (error) {
    next(error);
  }
});

// PUT /api/parking/:id - Update parking space (admin only)
router.put('/:id', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const { name, zone, stationId, type, description, status } = req.body;
    const db = getDB();

    let space;
    try {
      space = await db.collection('parking_spaces').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid parking space ID' });
    }

    if (!space) {
      return res.status(404).json({ success: false, message: 'Parking space not found' });
    }

    const updateData = { updatedAt: new Date() };
    if (name) updateData.name = name.trim();
    if (zone !== undefined) updateData.zone = zone.trim();
    if (stationId) updateData.stationId = stationId;
    if (type) updateData.type = type;
    if (description !== undefined) updateData.description = description.trim();
    if (status) updateData.status = status;

    await db.collection('parking_spaces').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    const updated = await db.collection('parking_spaces').findOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/parking/:id - Delete parking space (admin only)
router.delete('/:id', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const db = getDB();
    let space;
    try {
      space = await db.collection('parking_spaces').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid parking space ID' });
    }

    if (!space) {
      return res.status(404).json({ success: false, message: 'Parking space not found' });
    }

    await db.collection('parking_spaces').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: 'Parking space deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
