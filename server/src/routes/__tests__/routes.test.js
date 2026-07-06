import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('../../db.js', () => ({
  getDB: vi.fn(),
}));

vi.mock('../../middleware/auth.js', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.user = {
      _id: new ObjectId('507f1f77bcf86cd799439011'),
      role: 'admin',
      moduleAccess: {
        fleet: { enabled: true, role: 'admin', permissions: [] },
      },
    };
    next();
  }),
  authorize: vi.fn(() => (req, res, next) => next()),
  authorizeModule: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../middleware/validation.js', () => ({
  validateRequired: (value, field) => {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return `${field} is required`;
    }
    return null;
  },
  validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  validatePassword: (password) => {
    if (!password || password.length < 8) return false;
    return /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password);
  },
  validateRole: (role) => ['admin', 'supervisor', 'user'].includes(role),
  validatePagination: (page, limit) => ({
    page: Math.max(1, parseInt(page) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit) || 50)),
    skip: (Math.max(1, parseInt(page) || 1) - 1) * Math.min(100, Math.max(1, parseInt(limit) || 50)),
  }),
  validateShiftTime: (time) => /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time),
  validateDaysOfWeek: (days) => Array.isArray(days) && days.every(day => day >= 0 && day <= 6),
  escapeRegex: (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
}));

import { getDB } from '../../db.js';

describe('Vehicles API Error Handling', () => {
  let mockDb, mockCollection, req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          skip: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      })),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };
    mockDb = { collection: vi.fn(() => mockCollection) };
    getDB.mockReturnValue(mockDb);
    req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId(), role: 'admin', moduleAccess: { fleet: { enabled: true, role: 'admin' } } } };
    res = { status: vi.fn(() => res), json: vi.fn() };
    next = vi.fn();
  });

  it('POST returns 400 when name is missing', async () => {
    req.body = { plateNumber: 'ABC123' };
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Name is required' }));
  });

  it('POST returns 400 when plateNumber is missing', async () => {
    req.body = { name: 'Toyota' };
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Plate Number is required' }));
  });

  it('POST returns 409 on duplicate plate number', async () => {
    req.body = { name: 'Toyota', plateNumber: 'ABC123' };
    mockCollection.findOne.mockResolvedValue({ _id: new ObjectId(), plateNumber: 'ABC123' });
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Plate number already exists' }));
  });

  it('GET /:id returns 400 for invalid ID', async () => {
    req.params = { id: 'invalid' };
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Invalid vehicle ID' }));
  });

  it('GET /:id returns 404 when not found', async () => {
    req.params = { id: new ObjectId().toString() };
    mockCollection.findOne.mockResolvedValue(null);
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Vehicle not found' }));
  });

  it('DELETE returns 400 when vehicle has active trips', async () => {
    const vehicleId = new ObjectId();
    req.params = { id: vehicleId.toString() };
    mockCollection.findOne.mockResolvedValue({ _id: vehicleId, name: 'Toyota' });
    mockCollection.countDocuments.mockResolvedValue(1);
    const { default: router } = await import('../vehicles.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Cannot delete vehicle with active trips' }));
  });
});

describe('Equipment API Error Handling', () => {
  let mockDb, mockCollection, req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          skip: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      })),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };
    mockDb = { collection: vi.fn(() => mockCollection) };
    getDB.mockReturnValue(mockDb);
    req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId(), role: 'admin' } };
    res = { status: vi.fn(() => res), json: vi.fn() };
    next = vi.fn();
  });

  it('POST returns 400 when name is missing', async () => {
    req.body = { serialNumber: 'SN001', type: 'Screen' };
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when serialNumber is missing', async () => {
    req.body = { name: 'Monitor', type: 'Screen' };
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when type is missing', async () => {
    req.body = { name: 'Monitor', serialNumber: 'SN001' };
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 409 on duplicate serial number', async () => {
    req.body = { name: 'Monitor', serialNumber: 'SN001', type: 'Screen' };
    mockCollection.findOne.mockResolvedValue({ serialNumber: 'SN001' });
    const { default: router } = await import('../equipment.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('Cases API Error Handling', () => {
  let mockDb, mockCollection, req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          skip: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      })),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };
    mockDb = { collection: vi.fn(() => mockCollection) };
    getDB.mockReturnValue(mockDb);
    req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId(), role: 'admin' } };
    res = { status: vi.fn(() => res), json: vi.fn() };
    next = vi.fn();
  });

  it('POST returns 400 when caseNumber is missing', async () => {
    req.body = { title: 'Test Case' };
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when title is missing', async () => {
    req.body = { caseNumber: 'CASE-001' };
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 409 on duplicate case number', async () => {
    req.body = { caseNumber: 'CASE-001', title: 'Test Case' };
    mockCollection.findOne.mockResolvedValue({ caseNumber: 'CASE-001' });
    const { default: router } = await import('../cases.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('Stations API Error Handling', () => {
  let mockDb, mockCollection, req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({ sort: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })) })),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };
    mockDb = { collection: vi.fn(() => mockCollection) };
    getDB.mockReturnValue(mockDb);
    req = { params: {}, body: {}, user: { _id: new ObjectId(), role: 'admin' } };
    res = { status: vi.fn(() => res), json: vi.fn() };
    next = vi.fn();
  });

  it('POST returns 400 when name is missing', async () => {
    req.body = { latitude: 6.5244, longitude: 3.3792, radiusMeters: 100 };
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when latitude is out of range', async () => {
    req.body = { name: 'HQ', latitude: 91, longitude: 3.3792, radiusMeters: 100 };
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when radius is out of range', async () => {
    req.body = { name: 'HQ', latitude: 6.5244, longitude: 3.3792, radiusMeters: 5 };
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 409 on duplicate name', async () => {
    req.body = { name: 'HQ', latitude: 6.5244, longitude: 3.3792, radiusMeters: 100 };
    mockCollection.findOne.mockResolvedValue({ name: 'HQ' });
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('Shifts API Error Handling', () => {
  let mockDb, mockCollection, req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({
        toArray: vi.fn().mockResolvedValue([]),
        countDocuments: vi.fn().mockResolvedValue(0),
      })),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };
    mockDb = { collection: vi.fn(() => mockCollection) };
    getDB.mockReturnValue(mockDb);
    req = { params: {}, body: {}, user: { _id: new ObjectId(), role: 'admin' } };
    res = { status: vi.fn(() => res), json: vi.fn() };
    next = vi.fn();
  });

  it('POST returns 400 when name is missing', async () => {
    req.body = { startTime: '08:00', endTime: '17:00', applicableDays: [1, 2, 3] };
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when startTime is missing', async () => {
    req.body = { name: 'Morning', endTime: '17:00', applicableDays: [1] };
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when endTime is missing', async () => {
    req.body = { name: 'Morning', startTime: '08:00', applicableDays: [1] };
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when applicableDays is invalid', async () => {
    req.body = { name: 'Morning', startTime: '08:00', endTime: '17:00', applicableDays: 'invalid' };
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when startTime format is invalid', async () => {
    req.body = { name: 'Morning', startTime: '25:00', endTime: '17:00', applicableDays: [1] };
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('Departments & Job Titles API Error Handling', () => {
  let mockDb, mockCollection, req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({ sort: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })) })),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };
    mockDb = { collection: vi.fn(() => mockCollection) };
    getDB.mockReturnValue(mockDb);
    req = { params: {}, body: {}, user: { _id: new ObjectId(), role: 'admin' } };
    res = { status: vi.fn(() => res), json: vi.fn() };
    next = vi.fn();
  });

  it('departments POST returns 400 when name is missing', async () => {
    req.body = {};
    const { default: router } = await import('../departments.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('departments POST returns 409 on duplicate', async () => {
    req.body = { name: 'IT' };
    mockCollection.findOne.mockResolvedValue({ name: 'IT' });
    const { default: router } = await import('../departments.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('job titles POST returns 400 when name is missing', async () => {
    req.body = {};
    const { default: router } = await import('../jobTitles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('job titles POST returns 409 on duplicate', async () => {
    req.body = { name: 'Developer' };
    mockCollection.findOne.mockResolvedValue({ name: 'Developer' });
    const { default: router } = await import('../jobTitles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('Messages API Error Handling', () => {
  let mockDb, mockCollection, req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          skip: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      })),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
      deleteOne: vi.fn(),
    };
    mockDb = { collection: vi.fn(() => mockCollection) };
    getDB.mockReturnValue(mockDb);
    req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId(), role: 'admin' } };
    res = { status: vi.fn(() => res), json: vi.fn() };
    next = vi.fn();
  });

  it('POST returns 400 when receiverId is missing', async () => {
    req.body = { subject: 'Hello', content: 'Test' };
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when subject is missing', async () => {
    req.body = { receiverId: new ObjectId().toString(), content: 'Test' };
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when content is missing', async () => {
    req.body = { receiverId: new ObjectId().toString(), subject: 'Hello' };
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when receiver ID is invalid', async () => {
    req.body = { receiverId: 'invalid', subject: 'Hello', content: 'Test' };
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 404 when receiver not found', async () => {
    req.body = { receiverId: new ObjectId().toString(), subject: 'Hello', content: 'Test' };
    mockCollection.findOne.mockResolvedValue(null);
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('Bookings API Error Handling', () => {
  let mockDb, mockCollection, req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          skip: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      })),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
    };
    mockDb = { collection: vi.fn(() => mockCollection) };
    getDB.mockReturnValue(mockDb);
    req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId(), role: 'admin', moduleAccess: { equipment: { enabled: true, role: 'admin' } } } };
    res = { status: vi.fn(() => res), json: vi.fn() };
    next = vi.fn();
  });

  it('POST returns 400 when caseId is missing', async () => {
    req.body = { equipmentIds: ['abc'], startDate: '2025-01-01', endDate: '2025-01-02' };
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when equipmentIds is empty', async () => {
    req.body = { caseId: new ObjectId().toString(), equipmentIds: [], startDate: '2025-01-01', endDate: '2025-01-02' };
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when startDate is missing', async () => {
    req.body = { caseId: new ObjectId().toString(), equipmentIds: ['abc'], endDate: '2025-01-02' };
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when endDate is before startDate', async () => {
    req.body = {
      caseId: new ObjectId().toString(),
      equipmentIds: [new ObjectId().toString()],
      startDate: '2025-01-10',
      endDate: '2025-01-01',
    };
    const { default: router } = await import('../bookings.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('Users API Error Handling', () => {
  let mockDb, mockCollection, req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({
        project: vi.fn(() => ({
          sort: vi.fn(() => ({
            skip: vi.fn(() => ({
              limit: vi.fn(() => ({
                toArray: vi.fn().mockResolvedValue([]),
              })),
            })),
          })),
        })),
      })),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
    };
    mockDb = { collection: vi.fn(() => mockCollection) };
    getDB.mockReturnValue(mockDb);
    req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId(), role: 'admin' } };
    res = { status: vi.fn(() => res), json: vi.fn() };
    next = vi.fn();
  });

  it('POST returns 400 when employeeId is missing', async () => {
    req.body = { name: 'John', email: 'john@test.com', password: 'Test123!' };
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when email format is invalid', async () => {
    req.body = { employeeId: '001', name: 'John', email: 'notanemail', password: 'Test123!' };
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when password is too weak', async () => {
    req.body = { employeeId: '001', name: 'John', email: 'john@test.com', password: 'weak' };
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 409 on duplicate email', async () => {
    req.body = { employeeId: '001', name: 'John', email: 'john@test.com', password: 'Test123!' };
    mockCollection.findOne.mockResolvedValue({ email: 'john@test.com' });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('GET /:id returns 400 for invalid ID', async () => {
    req.params = { id: 'invalid' };
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('GET /:id returns 404 when not found', async () => {
    req.params = { id: new ObjectId().toString() };
    mockCollection.findOne.mockResolvedValue(null);
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('Parking API Error Handling', () => {
  let mockDb, mockCollection, req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          skip: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      })),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };
    mockDb = { collection: vi.fn(() => mockCollection) };
    getDB.mockReturnValue(mockDb);
    req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId(), role: 'admin', moduleAccess: { fleet: { enabled: true, role: 'admin' } } } };
    res = { status: vi.fn(() => res), json: vi.fn() };
    next = vi.fn();
  });

  it('POST returns 400 when name is missing', async () => {
    req.body = { stationId: new ObjectId().toString() };
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when stationId is missing', async () => {
    req.body = { name: 'Spot A1' };
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST returns 400 when stationId is invalid', async () => {
    req.body = { name: 'Spot A1', stationId: 'invalid' };
    const { default: router } = await import('../parking.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
