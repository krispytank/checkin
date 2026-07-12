import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorizeModule } from '../middleware/auth.js';
import { validateRequired, validatePagination } from '../middleware/validation.js';
import { sendSystemNotification } from './notifications.js';

const router = Router();

const VALID_TRANSITIONS = {
  pending: ['approved', 'rejected'],
  approved: ['dispatched', 'rejected'],
  dispatched: ['in-use'],
  'in-use': ['returned'],
  returned: ['received'],
  received: [],
  rejected: [],
};

const enrichBooking = async (db, booking) => {
  const userIdObj = booking.userId ? (() => { try { return new ObjectId(booking.userId); } catch { return null; } })() : null;
  const caseIdObj = booking.caseId ? (() => { try { return new ObjectId(booking.caseId); } catch { return null; } })() : null;
  const equipmentIds = (booking.equipmentIds || []).map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean);

  const [user, equipment, caseItem] = await Promise.all([
    userIdObj ? db.collection('users').findOne({ _id: userIdObj }, { projection: { password: 0 } }) : null,
    equipmentIds.length ? db.collection('equipment').find({ _id: { $in: equipmentIds } }).toArray() : [],
    caseIdObj ? db.collection('cases').findOne({ _id: caseIdObj }) : null,
  ]);

  const history = booking.history || [];
  const historyUserIds = [...new Set(history.map(h => h.changedBy).filter(Boolean))];
  const historyUserIdsObj = historyUserIds.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean);
  const historyUsers = historyUserIdsObj.length
    ? await db.collection('users').find({ _id: { $in: historyUserIdsObj } }, { projection: { name: 1 } }).toArray()
    : [];
  const historyUserMap = Object.fromEntries(historyUsers.map(u => [u._id.toString(), u.name]));
  const enrichedHistory = history.map(h => ({
    ...h,
    changedBy: h.changedBy ? { _id: h.changedBy, name: historyUserMap[h.changedBy] || 'System' } : { name: 'System' },
  }));

  return {
    ...booking,
    userDetails: user,
    equipmentDetails: equipment,
    caseDetails: caseItem,
    history: enrichedHistory,
  };
};

// GET /api/bookings - List bookings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const db = getDB();
    const filter = {};

    if (status) filter.status = status;

    if (req.user.role !== 'admin') {
      const isBooker = req.user.moduleAccess?.equipment?.role === 'booker' ||
                       req.user.moduleAccess?.equipment?.role === 'admin';
      if (!isBooker) {
        filter.userId = req.user._id.toString();
      }
    }

    const [bookings, total] = await Promise.all([
      db.collection('bookings').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
      db.collection('bookings').countDocuments(filter),
    ]);

    const enriched = await Promise.all(bookings.map(b => enrichBooking(db, b)));

    res.json({
      success: true,
      data: enriched,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/bookings/:id - Get single booking
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let booking;
    try {
      booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const enriched = await enrichBooking(db, booking);
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// POST /api/bookings - Create booking
router.post('/', authenticate, authorizeModule('equipment', 'admin', 'booker'), async (req, res, next) => {
  try {
    const { caseId, equipmentIds, startDate, endDate, purpose = '', purposeType = 'virtual_court', requireDocument = true } = req.body;

    if (!purposeType || typeof purposeType !== 'string') {
      return res.status(400).json({ success: false, message: 'Purpose type is required' });
    }

    if (purposeType === 'virtual_court') {
      const caseError = validateRequired(caseId, 'Case');
      if (caseError) return res.status(400).json({ success: false, message: caseError });
    }
    if (!equipmentIds?.length) {
      return res.status(400).json({ success: false, message: 'At least one equipment item is required' });
    }
    const startError = validateRequired(startDate, 'Start Date');
    if (startError) return res.status(400).json({ success: false, message: startError });
    const endError = validateRequired(endDate, 'End Date');
    if (endError) return res.status(400).json({ success: false, message: endError });

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    const db = getDB();

    for (const eqId of equipmentIds) {
      const conflict = await db.collection('bookings').findOne({
        equipmentIds: eqId,
        status: { $in: ['pending', 'approved', 'dispatched', 'in-use'] },
        $or: [
          { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } },
        ],
      });
      if (conflict) {
        return res.status(409).json({ 
          success: false, 
          message: `Equipment ${eqId} is already booked for the selected time period` 
        });
      }
    }

    const bookingId = `BK${Date.now().toString(36).toUpperCase()}`;
    const newBooking = {
      bookingId,
      caseId: purposeType === 'virtual_court' ? caseId : null,
      equipmentIds,
      userId: req.user._id.toString(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      purpose: purpose.trim(),
      purposeType,
      requireDocument: !!requireDocument,
      status: 'pending',
      history: [{
        status: 'pending',
        changedBy: req.user._id.toString(),
        changedAt: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('bookings').insertOne(newBooking);
    newBooking._id = result.insertedId;

    await db.collection('equipment').updateMany(
      { _id: { $in: equipmentIds.map(id => new ObjectId(id)) } },
      { $set: { status: 'booked', updatedAt: new Date() } }
    );

    const enriched = await enrichBooking(db, newBooking);

    // Notify equipment admins of new booking request
    const equipmentAdmins = await db.collection('users').find({
      $or: [
        { role: 'admin' },
        { 'moduleAccess.equipment.role': 'admin' },
      ],
    }).toArray();
    for (const admin of equipmentAdmins) {
      if (admin._id.toString() !== req.user._id.toString()) {
        await sendSystemNotification(
          db, admin._id.toString(), 'approvalRequired',
          `New equipment booking: ${bookingId}`,
          `${req.user.name || 'A user'} has requested equipment booking ${bookingId}.`,
          '/equipment/manage',
        );
      }
    }

    res.status(201).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// PUT /api/bookings/:id/status - Update booking status
router.put('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const db = getDB();

    let booking;
    try {
      booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!VALID_TRANSITIONS[booking.status]?.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot transition from ${booking.status} to ${status}` 
      });
    }

    const isAdmin = req.user.role === 'admin';
    const isEquipmentAdmin = req.user.moduleAccess?.equipment?.role === 'admin';
    const isBooker = req.user.moduleAccess?.equipment?.role === 'booker';

    if (['approved', 'rejected', 'dispatched'].includes(status) && !isAdmin && !isEquipmentAdmin) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    if (status === 'returned' && !isAdmin && !isEquipmentAdmin && !isBooker) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    if (status === 'received' && !isAdmin && !isEquipmentAdmin) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: { status, updatedAt: new Date() },
        $push: { 
          history: { 
            status, 
            changedBy: req.user._id.toString(), 
            changedAt: new Date() 
          } 
        }
      }
    );

    if (status === 'dispatched' || status === 'in-use') {
      await db.collection('equipment').updateMany(
        { _id: { $in: booking.equipmentIds.map(id => new ObjectId(id)) } },
        { $set: { status: 'in-use', updatedAt: new Date() } }
      );
    } else if (status === 'returned') {
      await db.collection('equipment').updateMany(
        { _id: { $in: booking.equipmentIds.map(id => new ObjectId(id)) } },
        { $set: { status: 'booked', updatedAt: new Date() } }
      );
    } else if (status === 'received') {
      await db.collection('equipment').updateMany(
        { _id: { $in: booking.equipmentIds.map(id => new ObjectId(id)) } },
        { $set: { status: 'available', updatedAt: new Date() } }
      );
    } else if (status === 'rejected') {
      await db.collection('equipment').updateMany(
        { _id: { $in: booking.equipmentIds.map(id => new ObjectId(id)) } },
        { $set: { status: 'available', updatedAt: new Date() } }
      );
    }

    const updated = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id) });
    const enriched = await enrichBooking(db, updated);

    // Notify booker of status change
    if (['approved', 'rejected'].includes(status)) {
      await sendSystemNotification(
        db, booking.userId, 'approvalRequired',
        `Booking ${booking.bookingId} ${status}`,
        `Your equipment booking ${booking.bookingId} has been ${status}.`,
        '/equipment/manage',
      );
    }

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// POST /api/bookings/:id/pdf - Upload PDF for booking
router.post('/:id/pdf', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let booking;
    try {
      booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const pdfPath = `/uploads/bookings/${req.file.filename}`;

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { pdfFilePath: pdfPath, updatedAt: new Date() } }
    );

    res.json({ success: true, data: { pdfFilePath: pdfPath } });
  } catch (error) {
    next(error);
  }
});

export default router;
