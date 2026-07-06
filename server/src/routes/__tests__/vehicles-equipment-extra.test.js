import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('../../db.js', () => ({ getDB: vi.fn() }));
vi.mock('../../middleware/auth.js', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.user = { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin', moduleAccess: { fleet: { enabled: true, role: 'admin', permissions: [] }, equipment: { enabled: true, role: 'admin', permissions: [] } } };
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
  const req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin', moduleAccess: { fleet: { enabled: true, role: 'admin', permissions: [] }, equipment: { enabled: true, role: 'admin', permissions: [] } } }, ...overrides };
  const res = { status: vi.fn(() => res), json: vi.fn() };
  return { req, res, next: vi.fn() };
}

describe('Vehicles - Extra', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists vehicles', async () => {
    mockDb({ vehicles: { find: vi.fn(() => chainable([{ name: 'Car1' }])), countDocuments: vi.fn().mockResolvedValue(1) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.data).toHaveLength(1);
  });

  it('GET / - with search filter', async () => {
    mockDb({ vehicles: { find: vi.fn(() => chainable([])), countDocuments: vi.fn().mockResolvedValue(0) } });
    const { req, res, next } = reqRes({ query: { search: 'Toyota' } });
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });
});

describe('Equipment - Extra', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists equipment', async () => {
    mockDb({ equipment: { find: vi.fn(() => chainable([{ name: 'Projector' }])), countDocuments: vi.fn().mockResolvedValue(1) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.data).toHaveLength(1);
  });

  it('GET / - with search filter', async () => {
    mockDb({ equipment: { find: vi.fn(() => chainable([])), countDocuments: vi.fn().mockResolvedValue(0) } });
    const { req, res, next } = reqRes({ query: { search: 'Sony' } });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('GET /available - lists available equipment', async () => {
    mockDb({ equipment: { find: vi.fn(() => chainable([{ name: 'Camera', status: 'available' }])) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/available' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });
});
