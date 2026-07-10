import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorizeModule, hasModuleRole } from '../middleware/auth.js';
import { validateRequired, validatePagination, escapeRegex } from '../middleware/validation.js';
import { logAudit, serializeForAudit } from '../utils/audit.js';
import { sendSystemNotification } from './notifications.js';

const router = Router();

const enrichCaseFile = async (db, file) => {
  const safeLookup = async (collection, id) => {
    if (!id) return null;
    try {
      return await db.collection(collection).findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  };

  const [registry, station, currentHolder] = await Promise.all([
    safeLookup('registries', file.registryId),
    safeLookup('stations', file.courtStationId),
    safeLookup('users', file.currentHolderId),
  ]);

  return {
    ...file,
    registryDetails: registry,
    stationDetails: station,
    currentHolderDetails: currentHolder,
  };
};

// Batch enrich: lookup registries, stations, users once for all files
const enrichCaseFilesBatch = async (db, files) => {
  const safeLookupMany = async (collection, ids) => {
    const validIds = ids.filter(Boolean).map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean);
    if (validIds.length === 0) return {};
    const docs = await db.collection(collection).find({ _id: { $in: validIds } }).toArray();
    return Object.fromEntries(docs.map(d => [d._id.toString(), d]));
  };

  const registryIds = files.map(f => f.registryId);
  const stationIds = files.map(f => f.courtStationId);
  const holderIds = files.map(f => f.currentHolderId);

  const [registryMap, stationMap, holderMap] = await Promise.all([
    safeLookupMany('registries', registryIds),
    safeLookupMany('stations', stationIds),
    safeLookupMany('users', holderIds),
  ]);

  return files.map(f => ({
    ...f,
    registryDetails: registryMap[f.registryId] || null,
    stationDetails: stationMap[f.courtStationId] || null,
    currentHolderDetails: holderMap[f.currentHolderId] || null,
  }));
};

// ===== CASE FILES =====

// GET /api/file-movement/case-files
router.get('/case-files', authenticate, async (req, res, next) => {
  try {
    const {
      search, registryId, courtStationId, fileStatus, caseStatus,
      fileCategory, currentHolderId, page = 1, limit = 50,
    } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const db = getDB();
    const filter = {};

    if (search) {
      filter.$or = [
        { caseFileNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { caseTitle: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    if (registryId) filter.registryId = registryId;
    if (courtStationId) filter.courtStationId = courtStationId;
    if (fileStatus) filter.fileStatus = fileStatus;
    if (caseStatus) filter.caseStatus = caseStatus;
    if (fileCategory) filter.fileCategory = fileCategory;
    if (currentHolderId) filter.currentHolderId = currentHolderId;

    const [files, total] = await Promise.all([
      db.collection('case_files').find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limitNum).toArray(),
      db.collection('case_files').countDocuments(filter),
    ]);

    const enriched = await enrichCaseFilesBatch(db, files);

    res.json({
      success: true,
      data: enriched,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/file-movement/case-files/:id
router.get('/case-files/:id', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let file;
    try {
      file = await db.collection('case_files').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid case file ID' });
    }

    if (!file) {
      return res.status(404).json({ success: false, message: 'Case file not found' });
    }

    const enriched = await enrichCaseFile(db, file);

    // Get movement history
    const movements = await db.collection('file_movements')
      .find({ caseFileId: req.params.id })
      .sort({ dateIssued: -1 })
      .toArray();

    res.json({ success: true, data: { ...enriched, movements } });
  } catch (error) {
    next(error);
  }
});

// POST /api/file-movement/case-files
router.post('/case-files', authenticate, authorizeModule('fileMovement', 'admin', 'registry_officer', 'registry_supervisor'), async (req, res, next) => {
  try {
    const {
      caseFileNumber, caseTitle, caseType, registryId, courtStationId,
      courtRoom, caseStatus = 'open', fileCategory = 'mention', parties,
    } = req.body;

    const _err = validateRequired(caseFileNumber, 'Case File Number'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }
    const _err2 = validateRequired(caseTitle, 'Case Title'); if (_err2) {
      return res.status(400).json({ success: false, message: _err2 });
    }
    const _err3 = validateRequired(registryId, 'Registry'); if (_err3) {
      return res.status(400).json({ success: false, message: _err3 });
    }
    const _err4 = validateRequired(courtStationId, 'Court Station'); if (_err4) {
      return res.status(400).json({ success: false, message: _err4 });
    }

    const db = getDB();

    const existing = await db.collection('case_files').findOne({ caseFileNumber: caseFileNumber.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Case file number already exists' });
    }

    const newFile = {
      caseFileNumber: caseFileNumber.trim(),
      caseTitle: caseTitle.trim(),
      caseType: caseType?.trim() || null,
      registryId,
      courtStationId,
      courtRoom: courtRoom?.trim() || null,
      caseStatus,
      fileStatus: 'at_registry',
      fileCategory,
      currentHolderId: null,
      currentLocation: 'registry',
      dateOpened: new Date(),
      parties: parties?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('case_files').insertOne(newFile);

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'created',
      module: 'fileMovement',
      entityType: 'caseFile',
      entityId: result.insertedId,
      newValue: newFile,
      stationId: courtStationId,
      ipAddress: req.ip,
      description: `Created case file ${caseFileNumber}`,
    });

    res.status(201).json({ success: true, data: { ...newFile, _id: result.insertedId } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/file-movement/case-files/:id
router.put('/case-files/:id', authenticate, authorizeModule('fileMovement', 'admin', 'registry_officer', 'registry_supervisor'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { caseTitle, caseType, courtRoom, caseStatus, fileStatus, fileCategory, parties } = req.body;

    const db = getDB();
    let file;
    try {
      file = await db.collection('case_files').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    if (!file) {
      return res.status(404).json({ success: false, message: 'Case file not found' });
    }

    const updateData = { updatedAt: new Date() };
    if (caseTitle !== undefined) updateData.caseTitle = caseTitle.trim();
    if (caseType !== undefined) updateData.caseType = caseType?.trim() || null;
    if (courtRoom !== undefined) updateData.courtRoom = courtRoom?.trim() || null;
    if (caseStatus !== undefined) updateData.caseStatus = caseStatus;
    if (fileStatus !== undefined) updateData.fileStatus = fileStatus;
    if (fileCategory !== undefined) updateData.fileCategory = fileCategory;
    if (parties !== undefined) updateData.parties = parties?.trim() || null;

    await db.collection('case_files').updateOne(
      { _id: file._id },
      { $set: updateData },
    );

    const updated = await db.collection('case_files').findOne({ _id: file._id });

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'updated',
      module: 'fileMovement',
      entityType: 'caseFile',
      entityId: id,
      previousValue: serializeForAudit(file),
      newValue: serializeForAudit(updated),
      stationId: file.courtStationId,
      ipAddress: req.ip,
      description: `Updated case file ${file.caseFileNumber}`,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/file-movement/case-files/:id
router.delete('/case-files/:id', authenticate, authorizeModule('fileMovement', 'admin'), async (req, res, next) => {
  try {
    const db = getDB();
    let file;
    try {
      file = await db.collection('case_files').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    if (!file) {
      return res.status(404).json({ success: false, message: 'Case file not found' });
    }

    if (file.fileStatus === 'issued' || file.currentHolderId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a file that is currently issued or held by someone',
      });
    }

    await db.collection('case_files').deleteOne({ _id: file._id });
    await db.collection('file_movements').deleteMany({ caseFileId: req.params.id });

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'deleted',
      module: 'fileMovement',
      entityType: 'caseFile',
      entityId: req.params.id,
      previousValue: serializeForAudit(file),
      stationId: file.courtStationId,
      ipAddress: req.ip,
      description: `Deleted case file ${file.caseFileNumber}`,
    });

    res.json({ success: true, message: 'Case file deleted' });
  } catch (error) {
    next(error);
  }
});

// ===== FILE MOVEMENTS =====

// GET /api/file-movement/movements
router.get('/movements', authenticate, async (req, res, next) => {
  try {
    const { caseFileId, status, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const db = getDB();
    const filter = {};
    if (caseFileId) filter.caseFileId = caseFileId;
    if (status) filter.status = status;

    const [movements, total] = await Promise.all([
      db.collection('file_movements').find(filter).sort({ dateIssued: -1 }).skip(skip).limit(limitNum).toArray(),
      db.collection('file_movements').countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: movements,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/file-movement/movements
router.post('/movements', authenticate, authorizeModule('fileMovement', 'admin', 'registry_officer', 'registry_supervisor', 'court_clerk', 'judicial_officer'), async (req, res, next) => {
  try {
    const {
      caseFileId, toHolderId, toDestination, movementType, reason,
      expectedReturnDate, remarks, digitalSignature,
    } = req.body;

    const _err = validateRequired(caseFileId, 'Case File'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }
    const _err2 = validateRequired(toDestination, 'Destination'); if (_err2) {
      return res.status(400).json({ success: false, message: _err2 });
    }
    const _err3 = validateRequired(movementType, 'Movement Type'); if (_err3) {
      return res.status(400).json({ success: false, message: _err3 });
    }
    const _err4 = validateRequired(reason, 'Reason'); if (_err4) {
      return res.status(400).json({ success: false, message: _err4 });
    }

    const db = getDB();

    let file;
    try {
      file = await db.collection('case_files').findOne({ _id: new ObjectId(caseFileId) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid case file ID' });
    }

    if (!file) {
      return res.status(404).json({ success: false, message: 'Case file not found' });
    }

    // Business rule: file cannot be checked out if already issued
    if (file.fileStatus === 'issued' && movementType === 'issued_to_user') {
      return res.status(400).json({
        success: false,
        message: 'File is already issued. It must be returned before issuing again.',
      });
    }

    const now = new Date();
    const movement = {
      caseFileId,
      fromHolderId: file.currentHolderId || req.user._id.toString(),
      toHolderId: toHolderId || null,
      fromRegistryId: file.registryId,
      toDestination: toDestination.trim(),
      movementType,
      reason: reason.trim(),
      dateIssued: now,
      timeIssued: now,
      expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
      actualReturnDate: null,
      status: 'active',
      remarks: remarks?.trim() || null,
      digitalSignature: digitalSignature || null,
      acknowledgedBy: null,
      acknowledgedAt: null,
      createdAt: now,
    };

    const result = await db.collection('file_movements').insertOne(movement);

    // Update case file status
    const fileUpdate = {
      updatedAt: now,
      currentHolderId: toHolderId || req.user._id.toString(),
      currentLocation: toDestination.trim(),
    };
    if (movementType === 'issued_to_user') fileUpdate.fileStatus = 'issued';
    else if (movementType === 'sent_to_court') fileUpdate.fileStatus = 'in_court';
    else if (movementType === 'sent_to_strong_room') fileUpdate.fileStatus = 'strong_room';
    else if (movementType === 'sent_to_chambers') fileUpdate.fileStatus = 'at_chambers';
    else if (movementType === 'returned_to_registry') {
      fileUpdate.fileStatus = 'at_registry';
      fileUpdate.currentHolderId = null;
    }

    await db.collection('case_files').updateOne(
      { _id: file._id },
      { $set: fileUpdate },
    );

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'moved',
      module: 'fileMovement',
      entityType: 'fileMovement',
      entityId: result.insertedId,
      newValue: movement,
      stationId: file.courtStationId,
      ipAddress: req.ip,
      description: `File ${file.caseFileNumber} ${movementType} to ${toDestination}`,
    });

    // Send notification to recipient
    if (toHolderId) {
      await sendSystemNotification(
        db, toHolderId, 'fileApproved',
        `File ${file.caseFileNumber} issued`,
        `File ${file.caseFileNumber} has been ${movementType.replace(/_/g, ' ')} to ${toDestination}. Reason: ${reason}`,
      );
    }

    res.status(201).json({ success: true, data: { ...movement, _id: result.insertedId } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/file-movement/movements/:id/return
router.put('/movements/:id/return', authenticate, async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const db = getDB();

    let movement;
    try {
      movement = await db.collection('file_movements').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid movement ID' });
    }

    if (!movement) {
      return res.status(404).json({ success: false, message: 'Movement not found' });
    }

    if (movement.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Movement already returned or cancelled' });
    }

    const now = new Date();

    await db.collection('file_movements').updateOne(
      { _id: movement._id },
      {
        $set: {
          actualReturnDate: now,
          status: 'returned',
          remarks: remarks?.trim() || movement.remarks,
          acknowledgedBy: req.user._id.toString(),
          acknowledgedAt: now,
        },
      },
    );

    // Update case file back to registry
    await db.collection('case_files').updateOne(
      { _id: new ObjectId(movement.caseFileId) },
      {
        $set: {
          fileStatus: 'at_registry',
          currentHolderId: null,
          currentLocation: 'registry',
          updatedAt: now,
        },
      },
    );

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'returned',
      module: 'fileMovement',
      entityType: 'fileMovement',
      entityId: req.params.id,
      previousValue: { status: 'active', actualReturnDate: null },
      newValue: { status: 'returned', actualReturnDate: now },
      ipAddress: req.ip,
      description: `File returned from ${movement.toDestination}`,
    });

    // Notify the registry
    const caseFile = await db.collection('case_files').findOne({ _id: new ObjectId(movement.caseFileId) });
    if (caseFile) {
      const registryStaff = await db.collection('users').find({
        stationId: caseFile.courtStationId,
        'moduleAccess.fileMovement.role': { $in: ['admin', 'registry_officer', 'registry_supervisor'] },
      }).toArray();
      for (const staff of registryStaff) {
        await sendSystemNotification(
          db, staff._id.toString(), 'fileReturned',
          `File ${caseFile.caseFileNumber} returned`,
          `File ${caseFile.caseFileNumber} has been returned from ${movement.toDestination}.`,
        );
      }
    }

    res.json({ success: true, message: 'File returned successfully' });
  } catch (error) {
    next(error);
  }
});

// ===== FILE REQUESTS =====

// GET /api/file-movement/requests
router.get('/requests', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const db = getDB();
    const filter = {};

    if (status) filter.status = status;

    // Non-admin users see only their own requests
    if (req.user.role !== 'admin' && !hasModuleRole(req.user, 'fileMovement', 'admin', 'registry_supervisor')) {
      filter.requesterId = req.user._id.toString();
    }

    const [requests, total] = await Promise.all([
      db.collection('file_requests').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
      db.collection('file_requests').countDocuments(filter),
    ]);

    // Enrich with case file details
    const fileIds = [...new Set(requests.map(r => r.caseFileId))];
    const files = fileIds.length > 0
      ? await db.collection('case_files').find({ _id: { $in: fileIds.map(id => { try { return new ObjectId(id); } catch { return id; } }) } }).toArray()
      : [];
    const fileMap = Object.fromEntries(files.map(f => [f._id.toString(), f]));

    const enriched = requests.map(r => ({
      ...r,
      caseFileDetails: fileMap[r.caseFileId] || null,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/file-movement/requests
router.post('/requests', authenticate, authorizeModule('fileMovement', 'admin', 'registry_officer', 'registry_supervisor', 'court_clerk', 'judicial_officer'), async (req, res, next) => {
  try {
    const { caseFileId, department, reason, purpose, urgency = 'normal' } = req.body;

    const _err = validateRequired(caseFileId, 'Case File'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }
    const _err2 = validateRequired(reason, 'Reason'); if (_err2) {
      return res.status(400).json({ success: false, message: _err2 });
    }
    const _err3 = validateRequired(purpose, 'Purpose'); if (_err3) {
      return res.status(400).json({ success: false, message: _err3 });
    }

    const db = getDB();

    let file;
    try {
      file = await db.collection('case_files').findOne({ _id: new ObjectId(caseFileId) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid case file ID' });
    }

    if (!file) {
      return res.status(404).json({ success: false, message: 'Case file not found' });
    }

    // Check for existing active request for this file
    const activeRequest = await db.collection('file_requests').findOne({
      caseFileId,
      status: { $in: ['pending', 'approved'] },
    });
    if (activeRequest) {
      return res.status(409).json({
        success: false,
        message: 'An active request already exists for this file',
      });
    }

    const request = {
      requesterId: req.user._id.toString(),
      caseFileId,
      department: department?.trim() || null,
      reason: reason.trim(),
      purpose: purpose.trim(),
      urgency,
      supervisorApproval: 'pending',
      approvedBy: null,
      approvedAt: null,
      status: 'pending',
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('file_requests').insertOne(request);

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'created',
      module: 'fileMovement',
      entityType: 'fileRequest',
      entityId: result.insertedId,
      newValue: request,
      stationId: file.courtStationId,
      ipAddress: req.ip,
      description: `File request created for ${file.caseFileNumber}`,
    });

    // Notify registry supervisors of new file request
    const registrySupervisors = await db.collection('users').find({
      stationId: file.courtStationId,
      $or: [
        { role: 'admin' },
        { 'moduleAccess.fileMovement.role': { $in: ['admin', 'registry_supervisor'] } },
      ],
    }).toArray();
    for (const supervisor of registrySupervisors) {
      if (supervisor._id.toString() !== req.user._id.toString()) {
        await sendSystemNotification(
          db, supervisor._id.toString(), 'approvalRequired',
          `New file request: ${file.caseFileNumber}`,
          `${req.user.name || 'A user'} has requested file ${file.caseFileNumber} for ${purpose.trim()}.`,
          '/file-movement/requests',
        );
      }
    }

    res.status(201).json({ success: true, data: { ...request, _id: result.insertedId } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/file-movement/requests/:id/approve
router.put('/requests/:id/approve', authenticate, authorizeModule('fileMovement', 'admin', 'registry_supervisor', 'registry_officer'), async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const db = getDB();

    let request;
    try {
      request = await db.collection('file_requests').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    const now = new Date();
    const isApproved = !rejectionReason;

    await db.collection('file_requests').updateOne(
      { _id: request._id },
      {
        $set: {
          status: isApproved ? 'approved' : 'rejected',
          supervisorApproval: isApproved ? 'approved' : 'rejected',
          approvedBy: req.user._id.toString(),
          approvedAt: now,
          rejectionReason: rejectionReason || null,
          updatedAt: now,
        },
      },
    );

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: isApproved ? 'approved' : 'rejected',
      module: 'fileMovement',
      entityType: 'fileRequest',
      entityId: req.params.id,
      newValue: { status: isApproved ? 'approved' : 'rejected' },
      ipAddress: req.ip,
      description: `File request ${isApproved ? 'approved' : 'rejected'}`,
    });

    // Notify requester
    const file = await db.collection('case_files').findOne({ _id: new ObjectId(request.caseFileId) });
    await sendSystemNotification(
      db, request.requesterId, 'fileApproved',
      `File request ${isApproved ? 'approved' : 'rejected'}`,
      `Your request for file ${file?.caseFileNumber || 'unknown'} has been ${isApproved ? 'approved' : 'rejected'}.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
      isApproved ? '/file-movement/requests' : null,
    );

    res.json({ success: true, message: `Request ${isApproved ? 'approved' : 'rejected'}` });
  } catch (error) {
    next(error);
  }
});

// ===== STRONG ROOM =====

// POST /api/file-movement/strong-room/release
router.post('/strong-room/release', authenticate, authorizeModule('fileMovement', 'admin', 'registry_supervisor', 'strong_room_officer'), async (req, res, next) => {
  try {
    const { caseFileId, reason, receivedBy, digitalSignature } = req.body;

    const _err = validateRequired(caseFileId, 'Case File'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }
    const _err2 = validateRequired(reason, 'Reason'); if (_err2) {
      return res.status(400).json({ success: false, message: _err2 });
    }

    const db = getDB();

    let file;
    try {
      file = await db.collection('case_files').findOne({ _id: new ObjectId(caseFileId) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid case file ID' });
    }

    if (!file) {
      return res.status(404).json({ success: false, message: 'Case file not found' });
    }

    if (file.fileStatus !== 'strong_room') {
      return res.status(400).json({ success: false, message: 'File is not in strong room' });
    }

    const now = new Date();
    const record = {
      caseFileId,
      approvingOfficerId: req.user._id.toString(),
      releasedBy: req.user._id.toString(),
      receivedBy: receivedBy || null,
      releaseTime: now,
      returnTime: null,
      reason: reason.trim(),
      status: 'released',
      digitalSignature: digitalSignature || null,
      createdAt: now,
    };

    const result = await db.collection('strong_room_records').insertOne(record);

    // Update file status
    await db.collection('case_files').updateOne(
      { _id: file._id },
      {
        $set: {
          fileStatus: 'issued',
          currentHolderId: receivedBy || req.user._id.toString(),
          currentLocation: 'strong_room_release',
          updatedAt: now,
        },
      },
    );

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'released',
      module: 'fileMovement',
      entityType: 'strongRoom',
      entityId: result.insertedId,
      newValue: record,
      stationId: file.courtStationId,
      ipAddress: req.ip,
      description: `File ${file.caseFileNumber} released from strong room`,
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

// PUT /api/file-movement/strong-room/:id/return
router.put('/strong-room/:id/return', authenticate, authorizeModule('fileMovement', 'admin', 'registry_supervisor', 'strong_room_officer'), async (req, res, next) => {
  try {
    const db = getDB();

    let record;
    try {
      record = await db.collection('strong_room_records').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid record ID' });
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Strong room record not found' });
    }

    if (record.status !== 'released') {
      return res.status(400).json({ success: false, message: 'Record already returned' });
    }

    const now = new Date();

    await db.collection('strong_room_records').updateOne(
      { _id: record._id },
      { $set: { returnTime: now, status: 'returned', digitalSignature: req.body.digitalSignature || record.digitalSignature } },
    );

    // Update file back to strong room
    await db.collection('case_files').updateOne(
      { _id: new ObjectId(record.caseFileId) },
      {
        $set: {
          fileStatus: 'strong_room',
          currentHolderId: null,
          currentLocation: 'strong_room',
          updatedAt: now,
        },
      },
    );

    await logAudit({
      userId: req.user._id.toString(),
      userName: req.user.name,
      action: 'returned',
      module: 'fileMovement',
      entityType: 'strongRoom',
      entityId: req.params.id,
      previousValue: { status: 'released', returnTime: null },
      newValue: { status: 'returned', returnTime: now },
      ipAddress: req.ip,
      description: 'File returned to strong room',
    });

    res.json({ success: true, message: 'File returned to strong room' });
  } catch (error) {
    next(error);
  }
});

// GET /api/file-movement/strong-room
router.get('/strong-room', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const db = getDB();
    const filter = {};
    if (status) filter.status = status;

    const [records, total] = await Promise.all([
      db.collection('strong_room_records').find(filter).sort({ releaseTime: -1 }).skip(skip).limit(limitNum).toArray(),
      db.collection('strong_room_records').countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// ===== TRACKING =====

// GET /api/file-movement/tracking/:caseFileId
router.get('/tracking/:caseFileId', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let file;
    try {
      file = await db.collection('case_files').findOne({ _id: new ObjectId(req.params.caseFileId) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid case file ID' });
    }

    if (!file) {
      return res.status(404).json({ success: false, message: 'Case file not found' });
    }

    const movements = await db.collection('file_movements')
      .find({ caseFileId: req.params.caseFileId })
      .sort({ dateIssued: -1 })
      .toArray();

    // Calculate days outside registry
    const now = new Date();
    let daysOutsideRegistry = 0;
    if (file.fileStatus !== 'at_registry' && file.fileStatus !== 'strong_room') {
      const lastIssued = movements.find(m => m.status === 'active');
      if (lastIssued) {
        const issuedDate = new Date(lastIssued.dateIssued);
        daysOutsideRegistry = Math.floor((now - issuedDate) / (1000 * 60 * 60 * 24));
      }
    }

    const isOverdue = movements.some(m =>
      m.status === 'active' && m.expectedReturnDate && new Date(m.expectedReturnDate) < now,
    );

    res.json({
      success: true,
      data: {
        file: await enrichCaseFile(db, file),
        movements,
        currentStatus: {
          holder: file.currentHolderId,
          location: file.currentLocation,
          fileStatus: file.fileStatus,
          daysOutsideRegistry,
          isOverdue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== DASHBOARD =====

// GET /api/file-movement/dashboard
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { courtStationId } = req.query;

    const baseFilter = {};
    if (courtStationId) baseFilter.courtStationId = courtStationId;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalFiles,
      filesIssued,
      filesInRegistry,
      filesInCourt,
      filesInStrongRoom,
      overdueMovements,
      filesReturnedToday,
      activeRequests,
      byRegistry,
      byStation,
    ] = await Promise.all([
      db.collection('case_files').countDocuments(baseFilter),
      db.collection('case_files').countDocuments({ ...baseFilter, fileStatus: 'issued' }),
      db.collection('case_files').countDocuments({ ...baseFilter, fileStatus: 'at_registry' }),
      db.collection('case_files').countDocuments({ ...baseFilter, fileStatus: 'in_court' }),
      db.collection('case_files').countDocuments({ ...baseFilter, fileStatus: 'strong_room' }),
      db.collection('file_movements').countDocuments({
        status: 'active',
        expectedReturnDate: { $lt: now },
      }),
      db.collection('file_movements').countDocuments({
        status: 'returned',
        actualReturnDate: { $gte: today },
      }),
      db.collection('file_requests').countDocuments({ status: 'pending' }),
      db.collection('case_files').aggregate([
        { $match: baseFilter },
        { $group: { _id: '$registryId', count: { $sum: 1 } } },
      ]).toArray(),
      db.collection('case_files').aggregate([
        { $match: baseFilter },
        { $group: { _id: '$courtStationId', count: { $sum: 1 } } },
      ]).toArray(),
    ]);

    res.json({
      success: true,
      data: {
        totalFiles,
        filesIssued,
        filesInRegistry,
        filesInCourt,
        filesInStrongRoom,
        overdueMovements,
        filesReturnedToday,
        activeRequests,
        byRegistry,
        byStation,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
