import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('../../db.js', () => ({ getDB: vi.fn() }));
vi.mock('../../middleware/auth.js', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.user = { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin', moduleAccess: { equipment: { enabled: true, role: 'admin', permissions: [] } } };
    next();
  }),
  authorize: vi.fn(() => (req, res, next) => next()),
  authorizeModule: vi.fn(() => (req, res, next) => next()),
}));
vi.mock('../../middleware/validation.js', () => ({
  validateRequired: (v, f) => (!v || (typeof v === 'string' && !v.trim())) ? `${f} is required` : null,
  validatePagination: (p, l) => ({ page: 1, limit: 50, skip: 0 }),
  escapeRegex: (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
}));

import { getDB } from '../../db.js';

function mockDb(collections = {}) {
  const col = (name) => collections[name] || {
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn(() => ({ sort: () => ({ skip: () => ({ limit: () => ({ toArray: vi.fn().mockResolvedValue([]) }) }) }) })),
    countDocuments: vi.fn().mockResolvedValue(0),
    insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() }),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    deleteOne: vi.fn(),
  };
  getDB.mockReturnValue({ collection: vi.fn(col) });
}

function reqRes(overrides = {}) {
  const req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId(), role: 'admin' }, ...overrides };
  const res = { status: vi.fn(() => res), json: vi.fn() };
  return { req, res, next: vi.fn() };
}

describe('Equipment - CRUD', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST / - validates name, serialNumber, type', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - rejects duplicate serialNumber', async () => {
    mockDb({ equipment: { findOne: vi.fn().mockResolvedValue({ serialNumber: 'SN001' }) } });
    const { req, res, next } = reqRes({ body: { name: 'Monitor', serialNumber: 'SN001', type: 'Screen' } });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('POST / - auto-creates equipment type if new', async () => {
    const insertOne = vi.fn().mockResolvedValue({ insertedId: new ObjectId() });
    mockDb({
      equipment: { findOne: vi.fn().mockResolvedValue(null), insertOne },
      equipment_types: { updateOne: vi.fn() },
    });
    const { req, res, next } = reqRes({ body: { name: 'Monitor', serialNumber: 'SN001', type: 'NewType' } });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(insertOne).toHaveBeenCalled();
    const item = insertOne.mock.calls[0][0];
    expect(item.status).toBe('available');
  });

  it('GET /:id - invalid ID returns 400', async () => {
    mockDb();
    const { req, res, next } = reqRes({ params: { id: 'bad' } });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('GET /:id - not found returns 404', async () => {
    mockDb();
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() } });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('PUT /:id - updates equipment', async () => {
    const eqId = new ObjectId();
    mockDb({ equipment: { findOne: vi.fn().mockResolvedValue({ _id: eqId, name: 'Old' }), updateOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: eqId.toString() }, body: { name: 'New' } });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('DELETE /:id - removes equipment', async () => {
    const eqId = new ObjectId();
    mockDb({ equipment: { findOne: vi.fn().mockResolvedValue({ _id: eqId }), deleteOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: eqId.toString() } });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('Equipment - Types', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /types - seeds defaults and returns list', async () => {
    const toArray = vi.fn().mockResolvedValue([{ name: 'Screen' }]);
    mockDb({ equipment_types: { updateOne: vi.fn(), find: vi.fn(() => ({ sort: () => ({ toArray }) })) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/types' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('POST /types - requires name', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/types' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /types - rejects duplicate', async () => {
    mockDb({ equipment_types: { findOne: vi.fn().mockResolvedValue({ name: 'Screen' }) } });
    const { req, res, next } = reqRes({ body: { name: 'Screen' } });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/types' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('DELETE /types/:name - blocks if type in use', async () => {
    mockDb({ equipment: { countDocuments: vi.fn().mockResolvedValue(5) } });
    const { req, res, next } = reqRes({ params: { name: 'Screen' } });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/types/:name' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('Equipment - CSV Import', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST /csv - rejects non-array data', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { data: null } });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/csv' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /csv - skips rows with missing data', async () => {
    mockDb({ equipment: { findOne: vi.fn().mockResolvedValue(null), insertOne: vi.fn() } });
    const { req, res, next } = reqRes({ body: { data: [{ name: 'Test', serialNumber: 'SN001' }, { serialNumber: 'SN002' }] } });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/csv' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('POST /csv - skips duplicates', async () => {
    mockDb({ equipment: { findOne: vi.fn().mockResolvedValue({ serialNumber: 'SN001' }) } });
    const { req, res, next } = reqRes({ body: { data: [{ name: 'Test', serialNumber: 'SN001' }] } });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/csv' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const result = res.json.mock.calls[0][0];
    expect(result.data.skipped).toBeGreaterThan(0);
  });
});

// ==================== BOOKINGS ====================
describe('Bookings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST / - requires caseId, equipmentIds, dates', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - requires equipmentIds array', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { caseId: new ObjectId().toString(), equipmentIds: [], startDate: '2025-01-01', endDate: '2025-01-02' } });
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - rejects endDate before startDate', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { caseId: new ObjectId().toString(), equipmentIds: [new ObjectId().toString()], startDate: '2025-01-10', endDate: '2025-01-01' } });
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - detects equipment conflict', async () => {
    mockDb({ bookings: { findOne: vi.fn().mockResolvedValue({ bookingId: 'BK001' }) } });
    const eqId = new ObjectId();
    const { req, res, next } = reqRes({ body: { caseId: new ObjectId().toString(), equipmentIds: [eqId.toString()], startDate: '2025-01-01', endDate: '2025-01-02' } });
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('POST / - creates booking with auto-generated ID', async () => {
    const insertOne = vi.fn().mockResolvedValue({ insertedId: new ObjectId() });
    mockDb({
      bookings: { findOne: vi.fn().mockResolvedValue(null), insertOne },
      equipment: { updateMany: vi.fn(), find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }) },
      users: { findOne: vi.fn().mockResolvedValue(null) },
      cases: { findOne: vi.fn().mockResolvedValue(null) },
    });
    const { req, res, next } = reqRes({ body: { caseId: new ObjectId().toString(), equipmentIds: [new ObjectId().toString()], startDate: '2025-01-01', endDate: '2025-01-02' } });
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(insertOne).toHaveBeenCalled();
    const booking = insertOne.mock.calls[0][0];
    expect(booking.bookingId).toMatch(/^BK/);
    expect(booking.status).toBe('pending');
  });

  it('PUT /:id/status - rejects invalid transition', async () => {
    const bookingId = new ObjectId();
    mockDb({ bookings: { findOne: vi.fn().mockResolvedValue({ _id: bookingId, status: 'completed' }) } });
    const { req, res, next } = reqRes({ params: { id: bookingId.toString() }, body: { status: 'pending' } });
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/:id/status' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('PUT /:id/status - valid transitions work', async () => {
    const bookingId = new ObjectId();
    const updateOne = vi.fn();
    mockDb({ bookings: { findOne: vi.fn().mockResolvedValue({ _id: bookingId, status: 'pending', equipmentIds: [] }), updateOne }, equipment: { updateMany: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: bookingId.toString() }, body: { status: 'approved' } });
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/:id/status' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(updateOne).toHaveBeenCalled();
  });

  it('POST /:id/pdf - rejects missing file', async () => {
    const bookingId = new ObjectId();
    mockDb({ bookings: { findOne: vi.fn().mockResolvedValue({ _id: bookingId }) } });
    const { req, res, next } = reqRes({ params: { id: bookingId.toString() }, file: null });
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/:id/pdf' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
