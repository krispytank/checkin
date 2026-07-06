import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('../../db.js', () => ({ getDB: vi.fn() }));
vi.mock('../../middleware/auth.js', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.user = { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin' };
    next();
  }),
}));
vi.mock('../../middleware/validation.js', () => ({
  validateRequired: (v, f) => (!v || (typeof v === 'string' && !v.trim())) ? `${f} is required` : null,
  validatePagination: () => ({ page: 1, limit: 50, skip: 0 }),
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
    updateMany: vi.fn(),
    deleteOne: vi.fn(),
  };
  getDB.mockReturnValue({ collection: vi.fn(col) });
}

function reqRes(overrides = {}) {
  const userId = new ObjectId('507f1f77bcf86cd799439011');
  const req = { params: {}, body: {}, query: {}, user: { _id: userId, role: 'admin' }, ...overrides };
  const res = { status: vi.fn(() => res), json: vi.fn() };
  return { req, res, next: vi.fn() };
}

describe('Messages - Extra', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists inbox messages', async () => {
    mockDb({ messages: { find: vi.fn(() => chainable([{ subject: 'Hi' }])), countDocuments: vi.fn().mockResolvedValue(1) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('unreadCount');
  });

  it('GET / - lists sent messages', async () => {
    mockDb({ messages: { find: vi.fn(() => chainable([])), countDocuments: vi.fn().mockResolvedValue(0) } });
    const { req, res, next } = reqRes({ query: { folder: 'sent' } });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('PUT /:id/read - marks message as read', async () => {
    const msgId = new ObjectId();
    const userId = new ObjectId('507f1f77bcf86cd799439011');
    mockDb({ messages: { findOne: vi.fn().mockResolvedValue({ _id: msgId, receiverId: userId.toString(), read: false }), updateOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: msgId.toString() } });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/:id/read' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('PUT /:id/read - not receiver', async () => {
    const msgId = new ObjectId();
    mockDb({ messages: { findOne: vi.fn().mockResolvedValue({ _id: msgId, receiverId: 'other-user', read: false }) } });
    const { req, res, next } = reqRes({ params: { id: msgId.toString() } });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/:id/read' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('PUT /:id/read - message not found', async () => {
    mockDb({ messages: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() } });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/:id/read' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('DELETE /:id - deletes message (sender)', async () => {
    const msgId = new ObjectId();
    const userId = new ObjectId('507f1f77bcf86cd799439011');
    mockDb({ messages: { findOne: vi.fn().mockResolvedValue({ _id: msgId, senderId: userId.toString() }), deleteOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: msgId.toString() } });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('DELETE /:id - deletes message (receiver)', async () => {
    const msgId = new ObjectId();
    const userId = new ObjectId('507f1f77bcf86cd799439011');
    mockDb({ messages: { findOne: vi.fn().mockResolvedValue({ _id: msgId, receiverId: userId.toString() }), deleteOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: msgId.toString() } });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('DELETE /:id - access denied', async () => {
    const msgId = new ObjectId();
    mockDb({ messages: { findOne: vi.fn().mockResolvedValue({ _id: msgId, senderId: 'other', receiverId: 'another' }) } });
    const { req, res, next } = reqRes({ params: { id: msgId.toString() } });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('DELETE /:id - not found', async () => {
    mockDb({ messages: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() } });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
