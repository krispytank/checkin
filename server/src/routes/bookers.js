import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// GET /api/bookers - List all designated bookers
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDB();

    // Get users with equipment booker role
    const bookers = await db.collection('users').find({
      'moduleAccess.equipment.enabled': true,
      'moduleAccess.equipment.role': { $in: ['booker', 'admin'] },
      isActive: true,
    }, { projection: { password: 0 } }).toArray();

    res.json({ success: true, data: bookers });
  } catch (error) {
    next(error);
  }
});

// GET /api/bookers/check - Check if current user is a booker
router.get('/check', authenticate, async (req, res, next) => {
  try {
    const isBooker = req.user.moduleAccess?.equipment?.enabled === true &&
                     ['booker', 'admin'].includes(req.user.moduleAccess?.equipment?.role);
    const isAdmin = req.user.role === 'admin';

    res.json({ success: true, data: { isBooker: isBooker || isAdmin } });
  } catch (error) {
    next(error);
  }
});

// POST /api/bookers - Add a booker (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const db = getDB();

    let user;
    try {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update user's module access
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          'moduleAccess.equipment.enabled': true,
          'moduleAccess.equipment.role': 'booker',
          'moduleAccess.equipment.permissions': ['book_equipment', 'view_own_bookings'],
          updatedAt: new Date(),
        },
        $inc: { tokenVersion: 1 }
      }
    );

    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/bookers/:userId - Remove a booker (admin only)
router.delete('/:userId', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const db = getDB();

    let user;
    try {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Remove equipment booker access
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          'moduleAccess.equipment.enabled': false,
          'moduleAccess.equipment.role': 'user',
          'moduleAccess.equipment.permissions': [],
          updatedAt: new Date(),
        },
        $inc: { tokenVersion: 1 }
      }
    );

    res.json({ success: true, message: 'Booker removed' });
  } catch (error) {
    next(error);
  }
});

export default router;
