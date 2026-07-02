import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequired, validateShiftTime, validateDaysOfWeek } from '../middleware/validation.js';
import { sendSystemNotification } from './notifications.js';

const router = Router();

// GET /api/shifts
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const shifts = await db.collection('shifts')
      .find()
      .sort({ name: 1 })
      .toArray();

    // Get assignment counts for each shift
    const shiftsWithCounts = await Promise.all(
      shifts.map(async (shift) => {
        const assignmentCount = await db.collection('shift_assignments')
          .countDocuments({ shiftId: shift._id.toString() });
        return { ...shift, assignmentCount };
      })
    );

    res.json({ success: true, data: shiftsWithCounts });
  } catch (error) {
    next(error);
  }
});

// GET /api/shifts/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let shift;
    try {
      shift = await db.collection('shifts').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid shift ID' });
    }

    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    // Get assigned users
    const assignments = await db.collection('shift_assignments')
      .find({ shiftId: id })
      .toArray();

    const assignedUserIds = assignments.map(a => a.userId);
    const assignedUsers = await db.collection('users')
      .find({ _id: { $in: assignedUserIds.map(id => new ObjectId(id)) } })
      .project({ password: 0 })
      .toArray();

    res.json({ success: true, data: { ...shift, assignedUsers } });
  } catch (error) {
    next(error);
  }
});

// POST /api/shifts
router.post('/', authenticate, authorize('admin', 'supervisor'), async (req, res, next) => {
  try {
    const { name, startTime, endTime, applicableDays } = req.body;

    // Validation
    const nameErr = validateRequired(name, 'Name');
    if (nameErr) {
      return res.status(400).json({ success: false, message: nameErr });
    }
    const startErr = validateRequired(startTime, 'Start time');
    if (startErr) {
      return res.status(400).json({ success: false, message: startErr });
    }
    const endErr = validateRequired(endTime, 'End time');
    if (endErr) {
      return res.status(400).json({ success: false, message: endErr });
    }
    if (!validateShiftTime(startTime)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid start time format (use HH:MM)' 
      });
    }
    if (!validateShiftTime(endTime)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid end time format (use HH:MM)' 
      });
    }
    if (!applicableDays || !validateDaysOfWeek(applicableDays)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid applicable days are required (0-6, Sunday-Saturday)' 
      });
    }

    const db = getDB();

    // Check for duplicate name
    const existing = await db.collection('shifts').findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: 'Shift name already exists' 
      });
    }

    // Create shift
    const newShift = {
      name: name.trim(),
      startTime,
      endTime,
      applicableDays,
      createdAt: new Date(),
    };

    const result = await db.collection('shifts').insertOne(newShift);

    res.status(201).json({ 
      success: true, 
      data: { ...newShift, _id: result.insertedId } 
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/shifts/:id
router.put('/:id', authenticate, authorize('admin', 'supervisor'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, applicableDays } = req.body;

    const db = getDB();

    let shift;
    try {
      shift = await db.collection('shifts').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid shift ID' });
    }

    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    // Build update object
    const updateData = { updatedAt: new Date() };

    if (name && name !== shift.name) {
      const existing = await db.collection('shifts').findOne({ 
        name: name.trim(), 
        _id: { $ne: new ObjectId(id) } 
      });
      if (existing) {
        return res.status(409).json({ 
          success: false, 
          message: 'Shift name already exists' 
        });
      }
      updateData.name = name.trim();
    }

    if (startTime) {
      if (!validateShiftTime(startTime)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid start time format (use HH:MM)' 
        });
      }
      updateData.startTime = startTime;
    }

    if (endTime) {
      if (!validateShiftTime(endTime)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid end time format (use HH:MM)' 
        });
      }
      updateData.endTime = endTime;
    }

    if (applicableDays) {
      if (!validateDaysOfWeek(applicableDays)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Valid applicable days are required (0-6, Sunday-Saturday)' 
        });
      }
      updateData.applicableDays = applicableDays;
    }

    await db.collection('shifts').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const updatedShift = await db.collection('shifts').findOne({ 
      _id: new ObjectId(id) 
    });

    // Notify all assigned users about shift change
    const assignments = await db.collection('shift_assignments')
      .find({ shiftId: id })
      .toArray();

    for (const assignment of assignments) {
      await sendSystemNotification(
        db,
        assignment.userId,
        'shiftChange',
        'Shift Updated',
        `Your shift "${shift.name}" has been updated. New times: ${updatedShift.startTime} - ${updatedShift.endTime}.`
      );
    }

    res.json({ success: true, data: updatedShift });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/shifts/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let shift;
    try {
      shift = await db.collection('shifts').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid shift ID' });
    }

    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    // Check if shift is assigned to any users
    const assignmentsCount = await db.collection('shift_assignments')
      .countDocuments({ shiftId: id });

    if (assignmentsCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete shift: ${assignmentsCount} user(s) are assigned to it` 
      });
    }

    await db.collection('shifts').deleteOne({ _id: new ObjectId(id) });

    res.json({ success: true, message: 'Shift deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/shifts/assign
router.post('/assign', authenticate, authorize('admin', 'supervisor'), async (req, res, next) => {
  try {
    const { userId, shiftId } = req.body;

    // Validation
    const userIdErr = validateRequired(userId, 'User ID');
    if (userIdErr) {
      return res.status(400).json({ success: false, message: userIdErr });
    }
    const shiftIdErr = validateRequired(shiftId, 'Shift ID');
    if (shiftIdErr) {
      return res.status(400).json({ success: false, message: shiftIdErr });
    }

    const db = getDB();

    // Verify user exists
    let user;
    try {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify shift exists
    let shift;
    try {
      shift = await db.collection('shifts').findOne({ _id: new ObjectId(shiftId) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid shift ID' });
    }

    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    // Check if user already has a shift assignment
    const existingAssignment = await db.collection('shift_assignments')
      .findOne({ userId });

    if (existingAssignment) {
      // Update existing assignment
      await db.collection('shift_assignments').updateOne(
        { userId },
        { $set: { shiftId, updatedAt: new Date() } }
      );

      // Notify user of shift change
      await sendSystemNotification(
        db,
        userId,
        'shiftAssignment',
        'Shift Assignment Changed',
        `Your shift has been changed to "${shift.name}" (${shift.startTime} - ${shift.endTime}).`
      );
    } else {
      // Create new assignment
      await db.collection('shift_assignments').insertOne({
        userId,
        shiftId,
        createdAt: new Date(),
      });

      // Notify user of new shift assignment
      await sendSystemNotification(
        db,
        userId,
        'shiftAssignment',
        'New Shift Assignment',
        `You have been assigned to the "${shift.name}" shift (${shift.startTime} - ${shift.endTime}).`
      );
    }

    res.json({ 
      success: true, 
      message: 'Shift assigned successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/shifts/assign/:userId
router.delete('/assign/:userId', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const db = getDB();

    const result = await db.collection('shift_assignments').deleteOne({ userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No shift assignment found for this user' 
      });
    }

    res.json({ success: true, message: 'Shift assignment removed' });
  } catch (error) {
    next(error);
  }
});

export default router;
