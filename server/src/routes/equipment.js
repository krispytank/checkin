import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequired, validatePagination, escapeRegex } from '../middleware/validation.js';

const router = Router();

const DEFAULT_TYPES = ['Screen', 'Sound System', 'Camera'];

async function seedDefaultTypes(db) {
  for (const name of DEFAULT_TYPES) {
    await db.collection('equipment_types').updateOne(
      { name },
      { $setOnInsert: { name, createdAt: new Date() } },
      { upsert: true }
    );
  }
}

// GET /api/equipment - List all equipment
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, type, status, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const db = getDB();
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { serialNumber: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    if (type) filter.type = type;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      db.collection('equipment').find(filter).sort({ name: 1 }).skip(skip).limit(limitNum).toArray(),
      db.collection('equipment').countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/available - List available equipment
router.get('/available', authenticate, async (req, res, next) => {
  try {
    const { type } = req.query;
    const db = getDB();
    const filter = { status: 'available' };
    if (type) filter.type = type;

    const items = await db.collection('equipment').find(filter).sort({ name: 1 }).toArray();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/types - List all equipment types
router.get('/types', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    await seedDefaultTypes(db);
    const types = await db.collection('equipment_types').find().sort({ name: 1 }).toArray();
    res.json({ success: true, data: types.map(t => t.name) });
  } catch (error) {
    next(error);
  }
});

// POST /api/equipment/types - Create new equipment type (admin only)
router.post('/types', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name } = req.body;
    const nameError = validateRequired(name, 'Type name');
    if (nameError) return res.status(400).json({ success: false, message: nameError });

    const db = getDB();
    const trimmed = name.trim();

    const existing = await db.collection('equipment_types').findOne({ name: trimmed });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Type already exists' });
    }

    await db.collection('equipment_types').insertOne({ name: trimmed, createdAt: new Date() });
    res.status(201).json({ success: true, data: trimmed });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/equipment/types/:name - Delete equipment type (admin only)
router.delete('/types/:name', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const db = getDB();
    const name = decodeURIComponent(req.params.name);

    const inUse = await db.collection('equipment').countDocuments({ type: name });
    if (inUse > 0) {
      return res.status(409).json({ success: false, message: `Cannot delete: ${inUse} equipment items use this type` });
    }

    await db.collection('equipment_types').deleteOne({ name });
    res.json({ success: true, message: 'Type deleted' });
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/:id - Get single equipment
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let item;
    try {
      item = await db.collection('equipment').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid equipment ID' });
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// POST /api/equipment - Create equipment (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, serialNumber, type, description = '' } = req.body;

    const nameError = validateRequired(name, 'Name');
    if (nameError) return res.status(400).json({ success: false, message: nameError });
    const serialError = validateRequired(serialNumber, 'Serial Number');
    if (serialError) return res.status(400).json({ success: false, message: serialError });
    const typeError = validateRequired(type, 'Type');
    if (typeError) return res.status(400).json({ success: false, message: typeError });

    const db = getDB();

    const existing = await db.collection('equipment').findOne({ serialNumber });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Serial number already exists' });
    }

    await db.collection('equipment_types').updateOne(
      { name: type.trim() },
      { $setOnInsert: { name: type.trim(), createdAt: new Date() } },
      { upsert: true }
    );

    const newItem = {
      name: name.trim().toUpperCase(),
      serialNumber: serialNumber.trim(),
      type: type.trim(),
      description: description.trim(),
      status: 'available',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('equipment').insertOne(newItem);
    newItem._id = result.insertedId;

    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    next(error);
  }
});

// POST /api/equipment/csv - Bulk upload equipment (admin only)
router.post('/csv', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { data: csvData } = req.body;
    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({ success: false, message: 'Invalid CSV data' });
    }

    const db = getDB();
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      if (!row.name || !row.serialNumber) {
        skipped++;
        errors.push(`Row ${i + 1}: Missing name or serialNumber`);
        continue;
      }

      const existing = await db.collection('equipment').findOne({ serialNumber: row.serialNumber });
      if (existing) {
        skipped++;
        errors.push(`Row ${i + 1}: Serial number ${row.serialNumber} already exists`);
        continue;
      }

      const typeVal = (row.type || 'Screen').trim();
      await db.collection('equipment_types').updateOne(
        { name: typeVal },
        { $setOnInsert: { name: typeVal, createdAt: new Date() } },
        { upsert: true }
      );

      await db.collection('equipment').insertOne({
        name: row.name.trim().toUpperCase(),
        serialNumber: row.serialNumber.trim(),
        type: typeVal,
        description: (row.description || '').trim(),
        status: 'available',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      imported++;
    }

    res.json({ success: true, data: { imported, skipped, errors } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/equipment/:id - Update equipment (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, serialNumber, type, description, status } = req.body;
    const db = getDB();

    let item;
    try {
      item = await db.collection('equipment').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid equipment ID' });
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const updateData = { updatedAt: new Date() };
    if (name) updateData.name = name.trim().toUpperCase();
    if (serialNumber) updateData.serialNumber = serialNumber.trim();
    if (type) {
      updateData.type = type.trim();
      await db.collection('equipment_types').updateOne(
        { name: type.trim() },
        { $setOnInsert: { name: type.trim(), createdAt: new Date() } },
        { upsert: true }
      );
    }
    if (description !== undefined) updateData.description = description.trim();
    if (status) updateData.status = status;

    await db.collection('equipment').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    const updated = await db.collection('equipment').findOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/equipment/:id - Delete equipment (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const db = getDB();
    let item;
    try {
      item = await db.collection('equipment').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid equipment ID' });
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    await db.collection('equipment').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: 'Equipment deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
