import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('../../db.js', () => ({ getDB: vi.fn() }));
vi.mock('../../middleware/auth.js', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.user = { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin', moduleAccess: { attendance: { enabled: true, role: 'admin', permissions: [] } } };
    next();
  }),
  authorize: vi.fn(() => (req, res, next) => next()),
}));
vi.mock('../../middleware/validation.js', () => ({
  validateRequired: (v, f) => (!v || (typeof v === 'string' && !v.trim())) ? `${f} is required` : null,
  validateShiftTime: (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t),
  validateDaysOfWeek: (d) => Array.isArray(d) && d.length > 0 && d.every(n => Number.isInteger(n) && n >= 0 && n <= 6),
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
  const req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin' }, ...overrides };
  const res = { status: vi.fn(() => res), json: vi.fn() };
  return { req, res, next: vi.fn() };
}

describe('Stations - Extra', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists stations', async () => {
    mockDb({ stations: { find: vi.fn(() => chainable([{ name: 'HQ' }])) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.data).toHaveLength(1);
  });

  it('GET /:id - success', async () => {
    const station = { _id: new ObjectId(), name: 'HQ' };
    mockDb({ stations: { findOne: vi.fn().mockResolvedValue(station) } });
    const { req, res, next } = reqRes({ params: { id: station._id.toString() } });
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('GET /:id - not found', async () => {
    mockDb();
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() } });
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('PUT /:id - updates station', async () => {
    const id = new ObjectId();
    mockDb({ stations: { findOne: vi.fn().mockResolvedValue({ _id: id, name: 'Old' }), updateOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: id.toString() }, body: { name: 'New' } });
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('PUT /:id - not found', async () => {
    mockDb({ stations: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() }, body: { name: 'New' } });
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('PUT /:id - invalid latitude', async () => {
    const id = new ObjectId();
    mockDb({ stations: { findOne: vi.fn().mockResolvedValue({ _id: id }) } });
    const { req, res, next } = reqRes({ params: { id: id.toString() }, body: { latitude: 999 } });
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('Departments - Extra', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists departments', async () => {
    mockDb({ departments: { find: vi.fn(() => chainable([{ name: 'Engineering' }])) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../departments.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.data).toHaveLength(1);
  });

  it('PUT /:id - updates department', async () => {
    const id = new ObjectId();
    mockDb({ departments: { findOne: vi.fn().mockResolvedValue({ _id: id, name: 'Old' }), updateOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: id.toString() }, body: { name: 'New' } });
    const { default: router } = await import('../departments.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('PUT /:id - not found', async () => {
    mockDb({ departments: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() }, body: { name: 'New' } });
    const { default: router } = await import('../departments.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('PUT /:id - duplicate name', async () => {
    const id = new ObjectId();
    mockDb({ departments: { findOne: vi.fn().mockResolvedValueOnce({ _id: id, name: 'Old' }).mockResolvedValueOnce({ name: 'New' }) } });
    const { req, res, next } = reqRes({ params: { id: id.toString() }, body: { name: 'New' } });
    const { default: router } = await import('../departments.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('Job Titles - Extra', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists job titles', async () => {
    mockDb({ job_titles: { find: vi.fn(() => chainable([{ name: 'Engineer' }])) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../jobTitles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.data).toHaveLength(1);
  });

  it('PUT /:id - updates job title', async () => {
    const id = new ObjectId();
    mockDb({ job_titles: { findOne: vi.fn().mockResolvedValue({ _id: id, name: 'Old' }), updateOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: id.toString() }, body: { name: 'New' } });
    const { default: router } = await import('../jobTitles.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('PUT /:id - not found', async () => {
    mockDb({ job_titles: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() }, body: { name: 'New' } });
    const { default: router } = await import('../jobTitles.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('PUT /:id - duplicate name', async () => {
    const id = new ObjectId();
    mockDb({ job_titles: { findOne: vi.fn().mockResolvedValueOnce({ _id: id, name: 'Old' }).mockResolvedValueOnce({ name: 'New' }) } });
    const { req, res, next } = reqRes({ params: { id: id.toString() }, body: { name: 'New' } });
    const { default: router } = await import('../jobTitles.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('Shifts - Extra', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists shifts with counts', async () => {
    mockDb({
      shifts: { find: vi.fn(() => chainable([{ _id: new ObjectId(), name: 'Morning' }])) },
      shift_assignments: { countDocuments: vi.fn().mockResolvedValue(2) },
    });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    const data = res.json.mock.calls[0][0];
    expect(data.data).toHaveLength(1);
    expect(data.data[0].assignmentCount).toBe(2);
  });

  it('GET /:id - not found', async () => {
    mockDb();
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() } });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('GET /:id - success with assigned users', async () => {
    const shiftId = new ObjectId();
    const uid = new ObjectId();
    mockDb({
      shifts: { findOne: vi.fn().mockResolvedValue({ _id: shiftId, name: 'Morning' }) },
      shift_assignments: { find: vi.fn(() => chainable([{ userId: uid.toString() }])) },
      users: { find: vi.fn(() => chainable([{ _id: uid, name: 'User1' }])) },
    });
    const { req, res, next } = reqRes({ params: { id: shiftId.toString() } });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('PUT /:id - updates shift', async () => {
    const id = new ObjectId();
    mockDb({
      shifts: {
        findOne: vi.fn()
          .mockResolvedValueOnce({ _id: id, name: 'Morning', startTime: '08:00', endTime: '17:00', applicableDays: [1] })
          .mockResolvedValueOnce({ _id: id, name: 'Updated', startTime: '09:00', endTime: '18:00', applicableDays: [1] }),
        updateOne: vi.fn(),
      },
      shift_assignments: { find: vi.fn(() => chainable([])) },
    });
    const { req, res, next } = reqRes({ params: { id: id.toString() }, body: { name: 'Updated', startTime: '09:00', endTime: '18:00', applicableDays: [1] } });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('PUT /:id - not found', async () => {
    mockDb({ shifts: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ params: { id: new ObjectId().toString() }, body: { name: 'Updated' } });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('DELETE /assign/:userId - removes assignment', async () => {
    const userId = new ObjectId().toString();
    mockDb({ shift_assignments: { deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }) } });
    const { req, res, next } = reqRes({ params: { userId } });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/assign/:userId' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('DELETE /assign/:userId - not found', async () => {
    const userId = new ObjectId().toString();
    mockDb({ shift_assignments: { deleteOne: vi.fn().mockResolvedValue({ deletedCount: 0 }) } });
    const { req, res, next } = reqRes({ params: { userId } });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/assign/:userId' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
