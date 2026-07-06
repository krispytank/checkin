import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';

const router = Router();

// GET /api/departments
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const departments = await db.collection('departments')
      .find()
      .sort({ name: 1 })
      .toArray();

    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
});

// POST /api/departments
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name } = req.body;

    const _err = validateRequired(name, 'Name'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }

    const db = getDB();

    // Check for duplicate
    const existing = await db.collection('departments').findOne({ 
      name: name.trim().toUpperCase() 
    });
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: 'Department already exists' 
      });
    }

    const newDepartment = {
      name: name.trim().toUpperCase(),
      createdAt: new Date(),
    };

    const result = await db.collection('departments').insertOne(newDepartment);

    res.status(201).json({ 
      success: true, 
      data: { ...newDepartment, _id: result.insertedId } 
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/departments/:id
router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const _err = validateRequired(name, 'Name'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }

    const db = getDB();

    let department;
    try {
      department = await db.collection('departments').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid department ID' });
    }

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Check for duplicate
    const existing = await db.collection('departments').findOne({ 
      name: name.trim().toUpperCase(), 
      _id: { $ne: new ObjectId(id) } 
    });
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: 'Department already exists' 
      });
    }

    await db.collection('departments').updateOne(
      { _id: new ObjectId(id) },
      { $set: { name: name.trim().toUpperCase(), updatedAt: new Date() } }
    );

    const updatedDepartment = await db.collection('departments').findOne({ 
      _id: new ObjectId(id) 
    });

    res.json({ success: true, data: updatedDepartment });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/departments/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let department;
    try {
      department = await db.collection('departments').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid department ID' });
    }

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Check if department is assigned to any users
    const usersWithDepartment = await db.collection('users').countDocuments({ 
      department: department.name 
    });

    if (usersWithDepartment > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete department: ${usersWithDepartment} user(s) are in this department` 
      });
    }

    await db.collection('departments').deleteOne({ _id: new ObjectId(id) });

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
