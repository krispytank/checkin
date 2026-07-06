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
  validatePagination: () => ({ page: 1, limit: 50, skip: 0 }),
  hasRequiredLocationFields: (loc) => loc && loc.latitude !== undefined && loc.longitude !== undefined && loc.accuracy !== undefined,
}));
vi.mock('../../utils/geo.js', () => ({
  validateGeoFence: vi.fn(() => ({ allowed: true, isWithinRadius: true, isAccuracyGood: true, distance: 10, stationRadius: 100, accuracy: 5 })),
  calculateAttendanceStatus: vi.fn(() => 'present'),
  calculateHoursWorked: vi.fn(() => 8),
}));
vi.mock('../../routes/notifications.js', () => ({
  sendSystemNotification: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../config.js', () => ({
  default: { workStartTime: '09:00', workEndTime: '17:00', maxAccuracyMeters: 50, daysOfWeek: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] },
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
  };
  getDB.mockReturnValue({ collection: vi.fn(col) });
}

function reqRes(overrides = {}) {
  const req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin' }, ...overrides };
  const res = { status: vi.fn(() => res), json: vi.fn() };
  return { req, res, next: vi.fn() };
}

describe('Records', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / - lists records', async () => {
    mockDb({ records: { find: vi.fn(() => chainable([{ userId: 'u1', date: '2025-01-01' }])), countDocuments: vi.fn().mockResolvedValue(1) } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
  });

  it('GET /today - returns today record', async () => {
    mockDb();
    const { req, res, next } = reqRes();
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/today' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
  });

  it('POST /check-in - requires GPS location', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/check-in' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /check-in - requires assigned station', async () => {
    mockDb({ users: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId(), stationId: null }) } });
    const { req, res, next } = reqRes({ body: { location: { latitude: 1, longitude: 1, accuracy: 5 } } });
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/check-in' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /check-in - success', async () => {
    const stationId = new ObjectId();
    mockDb({
      users: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId('507f1f77bcf86cd799439011'), stationId: stationId.toString() }) },
      stations: { findOne: vi.fn().mockResolvedValue({ _id: stationId, name: 'HQ', latitude: 1, longitude: 1, radiusMeters: 100 }) },
      records: { findOne: vi.fn().mockResolvedValue(null), insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() }) },
      shift_assignments: { findOne: vi.fn().mockResolvedValue(null) },
    });
    const { req, res, next } = reqRes({ body: { location: { latitude: 1, longitude: 1, accuracy: 5 } } });
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/check-in' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('POST /check-in - already checked in today', async () => {
    const stationId = new ObjectId();
    mockDb({
      users: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId('507f1f77bcf86cd799439011'), stationId: stationId.toString() }) },
      stations: { findOne: vi.fn().mockResolvedValue({ _id: stationId, name: 'HQ', latitude: 1, longitude: 1, radiusMeters: 100 }) },
      records: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId(), userId: 'u1', date: '2025-01-01' }) },
    });
    const { req, res, next } = reqRes({ body: { location: { latitude: 1, longitude: 1, accuracy: 5 } } });
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/check-in' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /check-out - requires GPS location', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/check-out' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /check-out - no check-in record', async () => {
    const stationId = new ObjectId();
    mockDb({
      users: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId('507f1f77bcf86cd799439011'), stationId: stationId.toString() }) },
      stations: { findOne: vi.fn().mockResolvedValue({ _id: stationId, name: 'HQ', latitude: 1, longitude: 1, radiusMeters: 100 }) },
      records: { findOne: vi.fn().mockResolvedValue(null) },
    });
    const { req, res, next } = reqRes({ body: { location: { latitude: 1, longitude: 1, accuracy: 5 } } });
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/check-out' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /check-out - already checked out', async () => {
    const stationId = new ObjectId();
    mockDb({
      users: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId('507f1f77bcf86cd799439011'), stationId: stationId.toString() }) },
      stations: { findOne: vi.fn().mockResolvedValue({ _id: stationId, name: 'HQ', latitude: 1, longitude: 1, radiusMeters: 100 }) },
      records: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId(), userId: 'u1', checkOutTime: new Date(), checkInTime: new Date() }) },
    });
    const { req, res, next } = reqRes({ body: { location: { latitude: 1, longitude: 1, accuracy: 5 } } });
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/check-out' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /check-out - success', async () => {
    const stationId = new ObjectId();
    const recordId = new ObjectId();
    mockDb({
      users: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId('507f1f77bcf86cd799439011'), stationId: stationId.toString() }) },
      stations: { findOne: vi.fn().mockResolvedValue({ _id: stationId, name: 'HQ', latitude: 1, longitude: 1, radiusMeters: 100 }) },
      records: {
        findOne: vi.fn()
          .mockResolvedValueOnce({ _id: recordId, userId: 'u1', checkInTime: new Date(), checkOutTime: null })
          .mockResolvedValueOnce({ _id: recordId, userId: 'u1', checkInTime: new Date(), checkOutTime: new Date() }),
        updateOne: vi.fn(),
      },
      shift_assignments: { findOne: vi.fn().mockResolvedValue(null) },
    });
    const { req, res, next } = reqRes({ body: { location: { latitude: 1, longitude: 1, accuracy: 5 } } });
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/check-out' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('GET /summary/weekly - returns summary', async () => {
    mockDb({ records: { find: vi.fn(() => chainable([])) } });
    const { req, res, next } = reqRes({ query: { startDate: '2025-01-01' } });
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/summary/weekly' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('totalDays');
  });

  it('GET /analytics - requires date range', async () => {
    mockDb();
    const { req, res, next } = reqRes({ query: {} });
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/analytics' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('GET /analytics - returns analytics data', async () => {
    const userId = new ObjectId();
    mockDb({
      users: { find: vi.fn(() => chainable([{ _id: userId, name: 'Test' }])) },
      records: { find: vi.fn(() => chainable([])) },
    });
    const { req, res, next } = reqRes({ query: { startDate: '2025-01-01', endDate: '2025-01-31' } });
    const { default: router } = await import('../records.js');
    const route = router.stack.find(r => r.route?.path === '/analytics' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalled();
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('userAnalytics');
    expect(data.data).toHaveProperty('dailyTrend');
  });
});
