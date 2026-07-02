import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';

const router = Router();

// GET /api/job-titles
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const jobTitles = await db.collection('job_titles')
      .find()
      .sort({ name: 1 })
      .toArray();

    res.json({ success: true, data: jobTitles });
  } catch (error) {
    next(error);
  }
});

// POST /api/job-titles
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name } = req.body;

    const _err = validateRequired(name, 'Name'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }

    const db = getDB();

    // Check for duplicate
    const existing = await db.collection('job_titles').findOne({ 
      name: name.trim() 
    });
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: 'Job title already exists' 
      });
    }

    const newJobTitle = {
      name: name.trim(),
      createdAt: new Date(),
    };

    const result = await db.collection('job_titles').insertOne(newJobTitle);

    res.status(201).json({ 
      success: true, 
      data: { ...newJobTitle, _id: result.insertedId } 
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/job-titles/:id
router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const _err = validateRequired(name, 'Name'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }

    const db = getDB();

    let jobTitle;
    try {
      jobTitle = await db.collection('job_titles').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid job title ID' });
    }

    if (!jobTitle) {
      return res.status(404).json({ success: false, message: 'Job title not found' });
    }

    // Check for duplicate
    const existing = await db.collection('job_titles').findOne({ 
      name: name.trim(), 
      _id: { $ne: new ObjectId(id) } 
    });
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: 'Job title already exists' 
      });
    }

    await db.collection('job_titles').updateOne(
      { _id: new ObjectId(id) },
      { $set: { name: name.trim(), updatedAt: new Date() } }
    );

    const updatedJobTitle = await db.collection('job_titles').findOne({ 
      _id: new ObjectId(id) 
    });

    res.json({ success: true, data: updatedJobTitle });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/job-titles/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let jobTitle;
    try {
      jobTitle = await db.collection('job_titles').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid job title ID' });
    }

    if (!jobTitle) {
      return res.status(404).json({ success: false, message: 'Job title not found' });
    }

    // Check if job title is assigned to any users
    const usersWithJobTitle = await db.collection('users').countDocuments({ 
      jobTitle: jobTitle.name 
    });

    if (usersWithJobTitle > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete job title: ${usersWithJobTitle} user(s) have this job title` 
      });
    }

    await db.collection('job_titles').deleteOne({ _id: new ObjectId(id) });

    res.json({ success: true, message: 'Job title deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
