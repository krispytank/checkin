import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequired, validatePagination } from '../middleware/validation.js';

const router = Router();

// GET /api/messages
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { folder = 'inbox', page = 1, limit = 20 } = req.query;
    const db = getDB();

    let filter;
    if (folder === 'sent') {
      filter = { senderId: req.user._id.toString() };
    } else {
      filter = { receiverId: req.user._id.toString() };
    }

    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const [messages, total] = await Promise.all([
      db.collection('messages')
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection('messages').countDocuments(filter),
    ]);

    // Get unread count for inbox
    const unreadCount = await db.collection('messages')
      .countDocuments({ 
        receiverId: req.user._id.toString(), 
        read: false 
      });

    res.json({
      success: true,
      data: messages,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/messages/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let message;
    try {
      message = await db.collection('messages').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Check if user is sender or receiver
    if (message.senderId !== req.user._id.toString() && 
        message.receiverId !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Mark as read if receiver
    if (message.receiverId === req.user._id.toString() && !message.read) {
      await db.collection('messages').updateOne(
        { _id: new ObjectId(id) },
        { $set: { read: true } }
      );
      message.read = true;
    }

    res.json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { receiverId, type = 'message', subject, content, link } = req.body;

    // Validation
    const receiverErr = validateRequired(receiverId, 'Receiver');
    if (receiverErr) {
      return res.status(400).json({ success: false, message: receiverErr });
    }
    const subjectErr = validateRequired(subject, 'Subject');
    if (subjectErr) {
      return res.status(400).json({ success: false, message: subjectErr });
    }
    const contentErr = validateRequired(content, 'Content');
    if (contentErr) {
      return res.status(400).json({ success: false, message: contentErr });
    }

    // Validate message type
    const validTypes = ['alert', 'message', 'notification'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid message type' 
      });
    }

    const db = getDB();

    // Verify receiver exists
    let receiver;
    try {
      receiver = await db.collection('users').findOne({ 
        _id: new ObjectId(receiverId) 
      });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid receiver ID' });
    }

    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver not found' });
    }

    // Supervisors can only message their team members
    if (req.user.role === 'supervisor' && 
        receiver.supervisorId !== req.user._id.toString() &&
        receiverId !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only message your team members' 
      });
    }

    // Create message
    const newMessage = {
      senderId: req.user._id.toString(),
      receiverId,
      type,
      subject: subject.trim(),
      content: content.trim(),
      link: link || null,
      read: false,
      createdAt: new Date(),
    };

    const result = await db.collection('messages').insertOne(newMessage);

    res.status(201).json({ 
      success: true, 
      data: { ...newMessage, _id: result.insertedId } 
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/messages/read-all (must come before /:id/read)
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    const db = getDB();

    await db.collection('messages').updateMany(
      { receiverId: req.user._id.toString(), read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'All messages marked as read' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/messages/:id/read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let message;
    try {
      message = await db.collection('messages').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Only receiver can mark as read
    if (message.receiverId !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only the receiver can mark a message as read' 
      });
    }

    await db.collection('messages').updateOne(
      { _id: new ObjectId(id) },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'Message marked as read' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/messages/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let message;
    try {
      message = await db.collection('messages').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Check if user is sender or receiver
    if (message.senderId !== req.user._id.toString() && 
        message.receiverId !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    await db.collection('messages').deleteOne({ _id: new ObjectId(id) });

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
