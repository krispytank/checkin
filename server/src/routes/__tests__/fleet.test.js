import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('../../db.js', () => ({ getDB: vi.fn() }));
vi.mock('../../middleware/auth.js', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.user = { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin', moduleAccess: { fleet: { enabled: true, role: 'admin', permissions: [] } } };
    next();
  }),
  authorizeModule: vi.fn(() => (req, res, next) => next()),
}));
vi.mock('../../middleware/validation.js', () => ({
  validateRequired: (v, f) => (!v || (typeof v === 'string' && !v.trim())) ? `${f} is required` : null,
  validatePagination: (p, l) => ({ page: Math.max(1, parseInt(p) || 1), limit: Math.min(100, Math.max(1, parseInt(l) || 50)), skip: 0 }),
  escapeRegex: (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
}));

import { getDB } from '../../db.js';

function mockDb(collections = {}) {
  const col = (name) => {
    const c = collections[name] || {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn(() => ({ sort: () => ({ skip: () => ({ limit: () => ({ toArray: vi.fn().mockResolvedValue([]) }) }) }) })),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() }),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
      updateMany: vi.fn(),
    };
    return c;
  };
  getDB.mockReturnValue({ collection: vi.fn(col) });
}

function makeReqRes(overrides = {}) {
  const req = {
    params: {}, body: {}, query: {},
    user: { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin', moduleAccess: { fleet: { enabled: true, role: 'admin' } } },
    ...overrides,
  };
  const res = { status: vi.fn(() => res), json: vi.fn() };
  const next = vi.fn();
  return { req, res, next };
}

// ==================== FLEET: VEHICLES ====================
describe('Fleet - Vehicles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST / - validates all required fields', async () => {
    mockDb();
    const { req, res, next } = makeReqRes({ body: {} });
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - rejects duplicate plate number', async () => {
    mockDb({ vehicles: { findOne: vi.fn().mockResolvedValue({ plateNumber: 'ABC123' }) } });
    const { req, res, next } = makeReqRes({ body: { name: 'Toyota', plateNumber: 'ABC123' } });
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('POST / - creates with defaults', async () => {
    const insertOne = vi.fn().mockResolvedValue({ insertedId: new ObjectId() });
    mockDb({ vehicles: { findOne: vi.fn().mockResolvedValue(null), insertOne } });
    const { req, res, next } = makeReqRes({ body: { name: 'Toyota', plateNumber: 'ABC123' } });
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(insertOne).toHaveBeenCalled();
    const inserted = insertOne.mock.calls[0][0];
    expect(inserted.status).toBe('available');
    expect(inserted.category).toBe('sedan');
    expect(inserted.capacity).toBe(4);
  });

  it('GET /:id - invalid ObjectId returns 400', async () => {
    mockDb();
    const { req, res, next } = makeReqRes({ params: { id: 'bad' } });
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('GET /:id - not found returns 404', async () => {
    mockDb();
    const { req, res, next } = makeReqRes({ params: { id: new ObjectId().toString() } });
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('PUT /:id - updates fields correctly', async () => {
    const vehicleId = new ObjectId();
    const updateOne = vi.fn();
    mockDb({ vehicles: { findOne: vi.fn().mockResolvedValue({ _id: vehicleId, name: 'Old' }), updateOne } });
    const { req, res, next } = makeReqRes({ params: { id: vehicleId.toString() }, body: { name: 'New', status: 'maintenance' } });
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(updateOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('DELETE /:id - blocks deletion with active trips', async () => {
    const vehicleId = new ObjectId();
    mockDb({ vehicles: { findOne: vi.fn().mockResolvedValue({ _id: vehicleId }) }, trips: { countDocuments: vi.fn().mockResolvedValue(2) } });
    const { req, res, next } = makeReqRes({ params: { id: vehicleId.toString() } });
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('GET /available - filters by status', async () => {
    const toArray = vi.fn().mockResolvedValue([{ name: 'Toyota' }]);
    mockDb({ vehicles: { find: vi.fn(() => ({ sort: vi.fn(() => ({ toArray })) })) } });
    const { req, res, next } = makeReqRes();
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/available' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ==================== FLEET: TRIPS ====================
describe('Fleet - Trips', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST / - requires destination', async () => {
    mockDb();
    const { req, res, next } = makeReqRes({ body: { purpose: 'Test', departureDate: '2025-01-01T10:00:00Z' } });
    const { default: router } = await import('../trips.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - requires purpose', async () => {
    mockDb();
    const { req, res, next } = makeReqRes({ body: { destination: 'Test', departureDate: '2025-01-01T10:00:00Z' } });
    const { default: router } = await import('../trips.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - requires departureDate', async () => {
    mockDb();
    const { req, res, next } = makeReqRes({ body: { destination: 'Test', purpose: 'Meeting' } });
    const { default: router } = await import('../trips.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - validates vehicleId format', async () => {
    mockDb();
    const { req, res, next } = makeReqRes({ body: { destination: 'Test', purpose: 'Meeting', departureDate: '2025-01-01T10:00:00Z', vehicleId: 'bad-id' } });
    const { default: router } = await import('../trips.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - creates trip with auto-generated tripId', async () => {
    const insertOne = vi.fn().mockResolvedValue({ insertedId: new ObjectId() });
    mockDb({ trips: { insertOne, findOne: vi.fn().mockResolvedValue(null) }, vehicles: { findOne: vi.fn().mockResolvedValue(null) }, users: { findOne: vi.fn().mockResolvedValue(null), find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }) } });
    const { req, res, next } = makeReqRes({ body: { destination: 'Lagos', purpose: 'Meeting', departureDate: '2025-01-01T10:00:00Z' } });
    const { default: router } = await import('../trips.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    const inserted = insertOne.mock.calls[0][0];
    expect(inserted.tripId).toMatch(/^TR/);
    expect(inserted.status).toBe('pending');
    expect(inserted.history).toHaveLength(1);
  });

  it('POST / - detects vehicle double-booking', async () => {
    const vehicleId = new ObjectId();
    mockDb({
      trips: {
        insertOne: vi.fn(),
        findOne: vi.fn().mockResolvedValue({ vehicleId: vehicleId.toString(), status: 'approved' }),
      },
      vehicles: { findOne: vi.fn().mockResolvedValue(null) },
    });
    const { req, res, next } = makeReqRes({ body: { destination: 'Test', purpose: 'Test', departureDate: '2025-01-01T10:00:00Z', returnDate: '2025-01-02T10:00:00Z', vehicleId: vehicleId.toString() } });
    const { default: router } = await import('../trips.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('PUT /:id/status - rejects invalid transition', async () => {
    const tripId = new ObjectId();
    mockDb({ trips: { findOne: vi.fn().mockResolvedValue({ _id: tripId, status: 'completed' }) } });
    const { req, res, next } = makeReqRes({ params: { id: tripId.toString() }, body: { status: 'pending' } });
    const { default: router } = await import('../trips.js');
    const route = router.stack.find(r => r.route?.path === '/:id/status' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('PUT /:id/status - allows valid transition pending->approved', async () => {
    const tripId = new ObjectId();
    const updateOne = vi.fn();
    mockDb({ trips: { findOne: vi.fn().mockResolvedValue({ _id: tripId, status: 'pending' }), updateOne } });
    const { req, res, next } = makeReqRes({ params: { id: tripId.toString() }, body: { status: 'approved' } });
    const { default: router } = await import('../trips.js');
    const route = router.stack.find(r => r.route?.path === '/:id/status' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(updateOne).toHaveBeenCalled();
  });

  it('PUT /:id/status - allows full lifecycle', async () => {
    const transitions = ['pending', 'approved', 'in-progress', 'completed'];
    for (let i = 0; i < transitions.length - 1; i++) {
      vi.clearAllMocks();
      const tripId = new ObjectId();
      const updateOne = vi.fn();
      mockDb({ trips: { findOne: vi.fn().mockResolvedValue({ _id: tripId, status: transitions[i] }), updateOne } });
      const { req, res, next } = makeReqRes({ params: { id: tripId.toString() }, body: { status: transitions[i + 1] } });
      const { default: router } = await import('../trips.js');
      const route = router.stack.find(r => r.route?.path === '/:id/status' && r.route?.methods?.put);
      await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
      expect(updateOne).toHaveBeenCalled();
    }
  });

  it('PUT /:id/status - blocks non-admin approve/reject', async () => {
    vi.clearAllMocks();
    const tripId = new ObjectId();
    mockDb({ trips: { findOne: vi.fn().mockResolvedValue({ _id: tripId, status: 'pending' }) } });
    const { req, res, next } = makeReqRes({
      params: { id: tripId.toString() }, body: { status: 'approved' },
      user: { _id: new ObjectId(), role: 'user', moduleAccess: { fleet: { enabled: true, role: 'user' } } },
    });
    const { default: router } = await import('../trips.js');
    const route = router.stack.find(r => r.route?.path === '/:id/status' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ==================== FLEET: PARKING ====================
describe('Fleet - Parking', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST / - requires name and stationId', async () => {
    mockDb();
    const { req, res, next } = makeReqRes({ body: {} });
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - validates stationId format', async () => {
    mockDb();
    const { req, res, next } = makeReqRes({ body: { name: 'A1', stationId: 'bad' } });
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - returns 404 if station not found', async () => {
    mockDb({ stations: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = makeReqRes({ body: { name: 'A1', stationId: new ObjectId().toString() } });
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('GET /stats - returns counts', async () => {
    mockDb({ parking_spaces: { countDocuments: vi.fn().mockResolvedValue(10) } });
    const { req, res, next } = makeReqRes();
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/stats' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
