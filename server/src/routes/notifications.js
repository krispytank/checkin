import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Default preferences
const DEFAULT_PREFS = {
  lateCheckIn: true,
  lateCheckOut: true,
  overtime: true,
  shiftReminder: true,
  shiftChange: true,
  shiftAssignment: true,
  muteUntil: null, // null = not muted, Date = unmute at this time
};

// Helper: check if user is muted
function isMuted(prefs) {
  if (!prefs || !prefs.muteUntil) return false;
  return new Date(prefs.muteUntil) > new Date();
}

// Helper: should send notification type
function shouldNotify(prefs, type) {
  if (!prefs) return true;
  if (isMuted(prefs)) return false;
  return prefs[type] !== false;
}

// Helper: send system notification if allowed
export async function sendSystemNotification(db, receiverId, type, subject, content) {
  const prefs = await db.collection('notification_preferences').findOne({ userId: receiverId });
  if (!shouldNotify(prefs, type)) return null;

  const result = await db.collection('messages').insertOne({
    senderId: 'system',
    receiverId,
    type: 'notification',
    subject,
    content,
    read: false,
    createdAt: new Date(),
  });
  return result.insertedId;
}

// GET /api/notifications/preferences
router.get('/preferences', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let prefs = await db.collection('notification_preferences').findOne({
      userId: req.user._id.toString(),
    });

    if (!prefs) {
      prefs = { userId: req.user._id.toString(), ...DEFAULT_PREFS, createdAt: new Date() };
      await db.collection('notification_preferences').insertOne(prefs);
    }

    res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/preferences
router.put('/preferences', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { lateCheckIn, lateCheckOut, overtime, shiftReminder, shiftChange, shiftAssignment, muteUntil } = req.body;

    const updateData = { updatedAt: new Date() };
    if (lateCheckIn !== undefined) updateData.lateCheckIn = !!lateCheckIn;
    if (lateCheckOut !== undefined) updateData.lateCheckOut = !!lateCheckOut;
    if (overtime !== undefined) updateData.overtime = !!overtime;
    if (shiftReminder !== undefined) updateData.shiftReminder = !!shiftReminder;
    if (shiftChange !== undefined) updateData.shiftChange = !!shiftChange;
    if (shiftAssignment !== undefined) updateData.shiftAssignment = !!shiftAssignment;
    if (muteUntil !== undefined) updateData.muteUntil = muteUntil ? new Date(muteUntil) : null;

    await db.collection('notification_preferences').updateOne(
      { userId: req.user._id.toString() },
      { $set: updateData },
      { upsert: true }
    );

    const prefs = await db.collection('notification_preferences').findOne({
      userId: req.user._id.toString(),
    });

    res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const count = await db.collection('messages').countDocuments({
      receiverId: req.user._id.toString(),
      read: false,
    });
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

export default router;
export { isMuted, shouldNotify };
