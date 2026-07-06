import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('../../db.js', () => ({ getDB: vi.fn() }));
vi.mock('../../middleware/auth.js', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.user = { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin', moduleAccess: { equipment: { enabled: true, role: 'admin', permissions: [] } } };
    next();
  }),
  authorize: vi.fn(() => (req, res, next) => next()),
}));

import { getDB } from '../../db.js';

function mockDb(collections = {}) {
  const col = (name) => collections[name] || {
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    countDocuments: vi.fn().mockResolvedValue(0),
    insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() }),
    updateOne: vi.fn(),
  };
  getDB.mockReturnValue({ collection: vi.fn(col) });
}

function reqRes(overrides = {}) {
  const req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin', moduleAccess: { equipment: { enabled: true, role: 'admin', permissions: [] } } }, ...overrides };
  const res = { status: vi.fn(() => res), json: vi.fn() };
  return { req, res, next: vi.fn() };
}

describe('Notifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /preferences - creates defaults if none exist', async () => {
    const insertOne = vi.fn().mockResolvedValue({ insertedId: new ObjectId() });
    mockDb({ notification_preferences: { findOne: vi.fn().mockResolvedValue(null), insertOne } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../notifications.js');
    const route = router.stack.find(r => r.route?.path === '/preferences' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(insertOne).toHaveBeenCalled();
  });

  it('GET /preferences - returns existing prefs', async () => {
    const prefs = { userId: 'u1', lateCheckIn: true, lateCheckOut: false };
    mockDb({ notification_preferences: { findOne: vi.fn().mockResolvedValue(prefs) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../notifications.js');
    const route = router.stack.find(r => r.route?.path === '/preferences' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.data.lateCheckIn).toBe(true);
    expect(data.data.lateCheckOut).toBe(false);
  });

  it('PUT /preferences - updates prefs', async () => {
    const updated = { userId: 'u1', lateCheckIn: false, overtime: true };
    mockDb({ notification_preferences: { updateOne: vi.fn(), findOne: vi.fn().mockResolvedValue(updated) } });
    const { req, res, next } = reqRes({ body: { lateCheckIn: false, overtime: true } });
    const { default: router } = await import('../notifications.js');
    const route = router.stack.find(r => r.route?.path === '/preferences' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
    const data = res.json.mock.calls[0][0];
    expect(data.data.lateCheckIn).toBe(false);
  });

  it('PUT /preferences - handles muteUntil', async () => {
    mockDb({ notification_preferences: { updateOne: vi.fn(), findOne: vi.fn().mockResolvedValue({ muteUntil: new Date('2099-01-01') }) } });
    const { req, res, next } = reqRes({ body: { muteUntil: '2099-01-01' } });
    const { default: router } = await import('../notifications.js');
    const route = router.stack.find(r => r.route?.path === '/preferences' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('GET /unread-count - returns count', async () => {
    mockDb({ messages: { countDocuments: vi.fn().mockResolvedValue(5) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../notifications.js');
    const route = router.stack.find(r => r.route?.path === '/unread-count' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.data.count).toBe(5);
  });
});

describe('Bookers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists bookers', async () => {
    mockDb({ users: { find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([{ name: 'Booker1' }]) }) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../bookers.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
  });

  it('GET /check - checks if user is booker', async () => {
    const { req, res, next } = reqRes();
    const { default: router } = await import('../bookers.js');
    const route = router.stack.find(r => r.route?.path === '/check' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.data.isBooker).toBe(true);
  });

  it('POST / - requires userId', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../bookers.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - user not found', async () => {
    mockDb({ users: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ body: { userId: new ObjectId().toString() } });
    const { default: router } = await import('../bookers.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('POST / - adds booker role', async () => {
    const userId = new ObjectId();
    mockDb({
      users: {
        findOne: vi.fn().mockResolvedValue({ _id: userId, name: 'Test' }),
        updateOne: vi.fn(),
      },
    });
    const { req, res, next } = reqRes({ body: { userId: userId.toString() } });
    const { default: router } = await import('../bookers.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('DELETE /:userId - removes booker role', async () => {
    const userId = new ObjectId();
    mockDb({
      users: {
        findOne: vi.fn().mockResolvedValue({ _id: userId }),
        updateOne: vi.fn(),
      },
    });
    const { req, res, next } = reqRes({ params: { userId: userId.toString() } });
    const { default: router } = await import('../bookers.js');
    const route = router.stack.find(r => r.route?.path === '/:userId' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('DELETE /:userId - user not found', async () => {
    mockDb({ users: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ params: { userId: new ObjectId().toString() } });
    const { default: router } = await import('../bookers.js');
    const route = router.stack.find(r => r.route?.path === '/:userId' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
