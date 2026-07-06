import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorize, authorizeModule } from '../middleware/auth.js';
import { validateRequired, validatePagination, escapeRegex } from '../middleware/validation.js';

const router = Router();

// GET /api/vehicles - List all vehicles
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, status, category, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const db = getDB();
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { plateNumber: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    if (status) filter.status = status;
    if (category) filter.category = category;

    const [vehicles, total] = await Promise.all([
      db.collection('vehicles').find(filter).sort({ name: 1 }).skip(skip).limit(limitNum).toArray(),
      db.collection('vehicles').countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: vehicles,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/vehicles/available - List available vehicles
router.get('/available', authenticate, async (req, res, next) => {
  try {
    const { category, date } = req.query;
    const db = getDB();
    const filter = { status: 'available' };
    if (category) filter.category = category;

    const vehicles = await db.collection('vehicles').find(filter).sort({ name: 1 }).toArray();
    res.json({ success: true, data: vehicles });
  } catch (error) {
    next(error);
  }
});

// GET /api/vehicles/:id - Get single vehicle
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let vehicle;
    try {
      vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
});

// POST /api/vehicles - Create vehicle (admin only)
router.post('/', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const { name, plateNumber, category = 'sedan', capacity = 4, description = '' } = req.body;

    const nameError = validateRequired(name, 'Name');
    if (nameError) return res.status(400).json({ success: false, message: nameError });
    const plateError = validateRequired(plateNumber, 'Plate Number');
    if (plateError) return res.status(400).json({ success: false, message: plateError });

    const db = getDB();

    const existing = await db.collection('vehicles').findOne({ plateNumber: plateNumber.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Plate number already exists' });
    }

    const newVehicle = {
      name: name.trim(),
      plateNumber: plateNumber.toUpperCase().trim(),
      category,
      capacity: parseInt(capacity) || 4,
      description: description.trim(),
      status: 'available',
      mileage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('vehicles').insertOne(newVehicle);
    newVehicle._id = result.insertedId;

    res.status(201).json({ success: true, data: newVehicle });
  } catch (error) {
    next(error);
  }
});

// PUT /api/vehicles/:id - Update vehicle (admin only)
router.put('/:id', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const { name, plateNumber, category, capacity, description, status, mileage } = req.body;
    const db = getDB();

    let vehicle;
    try {
      vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const updateData = { updatedAt: new Date() };
    if (name) updateData.name = name.trim();
    if (plateNumber) updateData.plateNumber = plateNumber.toUpperCase().trim();
    if (category) updateData.category = category;
    if (capacity) updateData.capacity = parseInt(capacity);
    if (description !== undefined) updateData.description = description.trim();
    if (status) updateData.status = status;
    if (mileage !== undefined) updateData.mileage = parseInt(mileage);

    await db.collection('vehicles').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    const updated = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/vehicles/:id - Delete vehicle (admin only)
router.delete('/:id', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const db = getDB();
    let vehicle;
    try {
      vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Check if vehicle has active trips
    const activeTrips = await db.collection('trips').countDocuments({
      vehicleId: req.params.id,
      status: { $in: ['approved', 'in-progress'] },
    });

    if (activeTrips > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete vehicle with active trips' });
    }

    await db.collection('vehicles').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
