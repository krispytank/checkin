import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('../../db.js', () => ({ getDB: vi.fn() }));
vi.mock('../../middleware/auth.js', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.user = { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin', moduleAccess: { fleet: { enabled: true, role: 'admin', permissions: [] } } };
    next();
  }),
  authorize: vi.fn(() => (req, res, next) => next()),
  authorizeModule: vi.fn(() => (req, res, next) => next()),
}));
vi.mock('../../middleware/validation.js', () => ({
  validateRequired: (v, f) => (!v || (typeof v === 'string' && !v.trim())) ? `${f} is required` : null,
  validatePagination: () => ({ page: 1, limit: 50, skip: 0 }),
  escapeRegex: (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
}));

import { getDB } from '../../db.js';

function chainable(arr = []) {
  const o = {};
  o.sort = vi.fn(() => o);
  o.skip = vi.fn(() => o);
  o.limit = vi.fn(() => o);
  o.project = vi.fn(() => o);
  o.toArray = vi.fn().mockResolvedValue(arr);
  return o;
}

function mockDb(collections = {}) {
  const col = (name) => collections[name] || {
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn(() => chainable()),
    countDocuments: vi.fn().mockResolvedValue(0),
    insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() }),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
  };
  getDB.mockReturnValue({ collection: vi.fn(col) });
}

function reqRes(overrides = {}) {
  const req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin' }, ...overrides };
  const res = { status: vi.fn(() => res), json: vi.fn() };
  return { req, res, next: vi.fn() };
}

describe('Cases', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists cases', async () => {
    mockDb({ cases: { find: vi.fn(() => chainable([{ caseNumber: 'C001' }])), countDocuments: vi.fn().mockResolvedValue(1) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
  });

  it('GET / - search filters', async () => {
    mockDb({ cases: { find: vi.fn(() => chainable([])), countDocuments: vi.fn().mockResolvedValue(0) } });
    const { req, res, next } = reqRes({ query: { search: 'test' } });
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('GET /:id - invalid ID', async () => {
    mockDb();
    const { req, res, next } = reqRes({ params: { id: 'invalid' } });
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('GET /:id - not found', async () => {
    mockDb();
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() } });
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('GET /:id - success', async () => {
    const caseItem = { _id: new ObjectId(), caseNumber: 'C001', title: 'Test' };
    mockDb({ cases: { findOne: vi.fn().mockResolvedValue(caseItem) } });
    const { req, res, next } = reqRes({ params: { id: caseItem._id.toString() } });
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.data.caseNumber).toBe('C001');
  });

  it('POST / - requires caseNumber', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { title: 'Test' } });
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - duplicate caseNumber', async () => {
    mockDb({ cases: { findOne: vi.fn().mockResolvedValue({ caseNumber: 'C001' }) } });
    const { req, res, next } = reqRes({ body: { caseNumber: 'C001', title: 'Test' } });
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('POST / - success', async () => {
    mockDb({ cases: { findOne: vi.fn().mockResolvedValue(null), insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() }) } });
    const { req, res, next } = reqRes({ body: { caseNumber: 'C002', title: 'Test Case', type: 'criminal', parties: 'A vs B' } });
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('PUT /:id - updates case', async () => {
    const id = new ObjectId();
    mockDb({ cases: { findOne: vi.fn().mockResolvedValue({ _id: id, title: 'Old' }), updateOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: id.toString() }, body: { title: 'New' } });
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('PUT /:id - not found', async () => {
    mockDb({ cases: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() }, body: { title: 'New' } });
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('DELETE /:id - deletes case', async () => {
    const id = new ObjectId();
    mockDb({ cases: { findOne: vi.fn().mockResolvedValue({ _id: id }), deleteOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: id.toString() } });
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('DELETE /:id - not found', async () => {
    mockDb({ cases: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() } });
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('Parking', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists parking spaces', async () => {
    const sid = new ObjectId();
    mockDb({
      parking_spaces: { find: vi.fn(() => chainable([{ name: 'P1', stationId: sid.toString() }])), countDocuments: vi.fn().mockResolvedValue(1) },
      stations: { find: vi.fn(() => chainable([{ _id: sid, name: 'HQ' }])) },
    });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('GET /available - lists available spaces', async () => {
    mockDb({ parking_spaces: { find: vi.fn(() => chainable([{ name: 'P1', status: 'available' }])) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/available' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('GET /stats - returns stats', async () => {
    mockDb({ parking_spaces: { countDocuments: vi.fn().mockResolvedValue(10) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/stats' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.data).toHaveProperty('total');
  });

  it('GET /:id - not found', async () => {
    mockDb();
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() } });
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('GET /:id - success', async () => {
    const space = { _id: new ObjectId(), name: 'P1', stationId: null };
    mockDb({ parking_spaces: { findOne: vi.fn().mockResolvedValue(space) } });
    const { req, res, next } = reqRes({ params: { id: space._id.toString() } });
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('POST / - requires name and stationId', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - success', async () => {
    const stationId = new ObjectId();
    mockDb({
      stations: { findOne: vi.fn().mockResolvedValue({ _id: stationId, name: 'HQ' }) },
      parking_spaces: { insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() }) },
    });
    const { req, res, next } = reqRes({ body: { name: 'P1', stationId: stationId.toString() } });
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('PUT /:id - updates space', async () => {
    const id = new ObjectId();
    mockDb({ parking_spaces: { findOne: vi.fn().mockResolvedValue({ _id: id }), updateOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: id.toString() }, body: { name: 'P2' } });
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('PUT /:id - not found', async () => {
    mockDb({ parking_spaces: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() }, body: { name: 'P2' } });
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('DELETE /:id - deletes space', async () => {
    const id = new ObjectId();
    mockDb({ parking_spaces: { findOne: vi.fn().mockResolvedValue({ _id: id }), deleteOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: id.toString() } });
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('DELETE /:id - not found', async () => {
    mockDb({ parking_spaces: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() } });
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
