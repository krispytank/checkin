import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequired, validatePagination, escapeRegex } from '../middleware/validation.js';

const router = Router();

// GET /api/cases - List cases with search
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const db = getDB();
    const filter = {};

    if (search && search.length >= 2) {
      filter.$or = [
        { caseNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { title: { $regex: escapeRegex(search), $options: 'i' } },
        { parties: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const [cases, total] = await Promise.all([
      db.collection('cases').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
      db.collection('cases').countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: cases,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/cases/:id - Get single case
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let caseItem;
    try {
      caseItem = await db.collection('cases').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid case ID' });
    }

    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    res.json({ success: true, data: caseItem });
  } catch (error) {
    next(error);
  }
});

// POST /api/cases - Create case (inline creation)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { caseNumber, title, type = 'other', parties = '' } = req.body;

    const caseNumberError = validateRequired(caseNumber, 'Case Number');
    if (caseNumberError) return res.status(400).json({ success: false, message: caseNumberError });
    const titleError = validateRequired(title, 'Title');
    if (titleError) return res.status(400).json({ success: false, message: titleError });

    const db = getDB();

    const existing = await db.collection('cases').findOne({ caseNumber });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Case number already exists' });
    }

    const newCase = {
      caseNumber: caseNumber.trim(),
      title: title.trim(),
      type,
      parties: parties.trim(),
      createdBy: req.user._id.toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('cases').insertOne(newCase);
    newCase._id = result.insertedId;

    res.status(201).json({ success: true, data: newCase });
  } catch (error) {
    next(error);
  }
});

// PUT /api/cases/:id - Update case
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { title, type, parties } = req.body;
    const db = getDB();

    let caseItem;
    try {
      caseItem = await db.collection('cases').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid case ID' });
    }

    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const updateData = { updatedAt: new Date() };
    if (title) updateData.title = title.trim();
    if (type) updateData.type = type;
    if (parties !== undefined) updateData.parties = parties.trim();

    await db.collection('cases').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    const updated = await db.collection('cases').findOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cases/:id - Delete case
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let caseItem;
    try {
      caseItem = await db.collection('cases').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid case ID' });
    }

    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    await db.collection('cases').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: 'Case deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
