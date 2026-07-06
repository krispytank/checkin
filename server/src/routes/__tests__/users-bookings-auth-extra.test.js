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
  validateEmail: (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
  validatePassword: (p) => p && p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[!@#$%^&*(),.?":{}|<>]/.test(p),
  validateRole: (r) => ['admin', 'supervisor', 'user'].includes(r),
  validatePagination: () => ({ page: 1, limit: 50, skip: 0 }),
  escapeRegex: (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
}));
vi.mock('../../routes/notifications.js', () => ({
  sendSystemNotification: vi.fn().mockResolvedValue(null),
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
  const req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin', moduleAccess: { equipment: { enabled: true, role: 'admin', permissions: [] } } }, ...overrides };
  const res = { status: vi.fn(() => res), json: vi.fn() };
  return { req, res, next: vi.fn() };
}

describe('Users - Extra', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists users', async () => {
    mockDb({ users: { find: vi.fn(() => chainable([{ name: 'User1' }])), countDocuments: vi.fn().mockResolvedValue(1) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('PUT /:id/module-access/bulk - bulk updates module access', async () => {
    const userId = new ObjectId();
    mockDb({ users: { findOne: vi.fn().mockResolvedValue({ _id: userId }), updateOne: vi.fn() } });
    const { req, res, next } = reqRes({
      params: { id: userId.toString() },
      body: {
        moduleAccess: {
          attendance: { enabled: true, role: 'user', permissions: ['check_in_out'] },
          equipment: { enabled: false, role: 'user', permissions: [] },
          fleet: { enabled: false, role: 'user', permissions: [] },
        },
      },
    });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/:id/module-access/bulk' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('PUT /:id/module-access/bulk - invalid module', async () => {
    const userId = new ObjectId();
    mockDb({ users: { findOne: vi.fn().mockResolvedValue({ _id: userId }) } });
    const { req, res, next } = reqRes({
      params: { id: userId.toString() },
      body: { moduleAccess: { invalid_module: { enabled: true } } },
    });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/:id/module-access/bulk' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('PUT /:id/module-access/bulk - user not found', async () => {
    mockDb({ users: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({
      params: { id: new ObjectId().toString() },
      body: { moduleAccess: { attendance: { enabled: true } } },
    });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/:id/module-access/bulk' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('Bookings - Extra', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists bookings', async () => {
    mockDb({
      bookings: { find: vi.fn(() => chainable([{ bookingId: 'BK001' }])), countDocuments: vi.fn().mockResolvedValue(1) },
      users: { findOne: vi.fn().mockResolvedValue(null) },
      equipment: { find: vi.fn(() => chainable([])) },
      cases: { findOne: vi.fn().mockResolvedValue(null) },
    });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('GET /:id - not found', async () => {
    mockDb({ bookings: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() } });
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('GET /:id - invalid ID', async () => {
    mockDb();
    const { req, res, next } = reqRes({ params: { id: 'invalid' } });
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('GET /:id - success', async () => {
    const bookingId = new ObjectId();
    const uid = new ObjectId();
    mockDb({
      bookings: { findOne: vi.fn().mockResolvedValue({ _id: bookingId, bookingId: 'BK001', caseId: null, equipmentIds: [], userId: uid.toString() }) },
      users: { findOne: vi.fn().mockResolvedValue(null) },
      equipment: { find: vi.fn(() => chainable([])) },
      cases: { findOne: vi.fn().mockResolvedValue(null) },
    });
    const { req, res, next } = reqRes({ params: { id: bookingId.toString() } });
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });
});

describe('Auth - Extra', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /me - returns current user', async () => {
    const { req, res, next } = reqRes();
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/me' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('_id');
  });
});
