import { Router } from 'express';
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
  // File movement notifications
  fileApproved: true,
  fileReleased: true,
  fileDueToday: true,
  fileOverdue: true,
  approvalRequired: true,
  fileReturned: true,
  // Fleet notifications
  tripApproved: true,
  maintenanceDue: true,
  insuranceExpiring: true,
  inspectionExpiring: true,
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
export async function sendSystemNotification(db, receiverId, type, subject, content, link = null) {
  const prefs = await db.collection('notification_preferences').findOne({ userId: receiverId });
  if (!shouldNotify(prefs, type)) return null;

  const result = await db.collection('messages').insertOne({
    senderId: 'system',
    receiverId,
    type: 'notification',
    subject,
    content,
    link: link || null,
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
    const {
      lateCheckIn, lateCheckOut, overtime, shiftReminder, shiftChange, shiftAssignment,
      fileApproved, fileReleased, fileDueToday, fileOverdue, approvalRequired, fileReturned,
      tripApproved, maintenanceDue, insuranceExpiring, inspectionExpiring,
      muteUntil,
    } = req.body;

    const updateData = { updatedAt: new Date() };
    if (lateCheckIn !== undefined) updateData.lateCheckIn = !!lateCheckIn;
    if (lateCheckOut !== undefined) updateData.lateCheckOut = !!lateCheckOut;
    if (overtime !== undefined) updateData.overtime = !!overtime;
    if (shiftReminder !== undefined) updateData.shiftReminder = !!shiftReminder;
    if (shiftChange !== undefined) updateData.shiftChange = !!shiftChange;
    if (shiftAssignment !== undefined) updateData.shiftAssignment = !!shiftAssignment;
    if (fileApproved !== undefined) updateData.fileApproved = !!fileApproved;
    if (fileReleased !== undefined) updateData.fileReleased = !!fileReleased;
    if (fileDueToday !== undefined) updateData.fileDueToday = !!fileDueToday;
    if (fileOverdue !== undefined) updateData.fileOverdue = !!fileOverdue;
    if (approvalRequired !== undefined) updateData.approvalRequired = !!approvalRequired;
    if (fileReturned !== undefined) updateData.fileReturned = !!fileReturned;
    if (tripApproved !== undefined) updateData.tripApproved = !!tripApproved;
    if (maintenanceDue !== undefined) updateData.maintenanceDue = !!maintenanceDue;
    if (insuranceExpiring !== undefined) updateData.insuranceExpiring = !!insuranceExpiring;
    if (inspectionExpiring !== undefined) updateData.inspectionExpiring = !!inspectionExpiring;
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
