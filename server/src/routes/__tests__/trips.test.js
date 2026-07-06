import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// Mock dependencies
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
  authorizeModule: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../middleware/validation.js', () => ({
  validateRequired: (value, field) => {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return `${field} is required`;
    }
    return null;
  },
  validatePagination: (page, limit) => ({
    page: Math.max(1, parseInt(page) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit) || 50)),
    skip: (Math.max(1, parseInt(page) || 1) - 1) * Math.min(100, Math.max(1, parseInt(limit) || 50)),
  }),
}));

// Import after mocks
import { getDB } from '../../db.js';

describe('Trips API Error Handling', () => {
  let mockDb;
  let mockCollection;
  let req, res, next;

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
    };

    mockDb = {
      collection: vi.fn(() => mockCollection),
    };

    getDB.mockReturnValue(mockDb);

    req = {
      params: {},
      body: {},
      query: {},
      user: {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        role: 'admin',
        moduleAccess: {
          fleet: { enabled: true, role: 'admin', permissions: [] },
        },
      },
    };

    res = {
      status: vi.fn(() => res),
      json: vi.fn(),
    };

    next = vi.fn();
  });

  describe('POST /api/trips - Create Trip', () => {
    it('returns 400 when destination is missing', async () => {
      req.body = { purpose: 'Test', departureDate: '2025-01-01T10:00:00Z' };

      const { default: router } = await import('../trips.js');
      const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
      
      // Find the handler
      const handler = route.route.stack[route.route.stack.length - 1].handle;
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Destination is required',
        })
      );
    });

    it('returns 400 when purpose is missing', async () => {
      req.body = { destination: 'Test', departureDate: '2025-01-01T10:00:00Z' };

      const { default: router } = await import('../trips.js');
      const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
      const handler = route.route.stack[route.route.stack.length - 1].handle;
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Purpose is required',
        })
      );
    });

    it('returns 400 when departureDate is missing', async () => {
      req.body = { destination: 'Test', purpose: 'Meeting' };

      const { default: router } = await import('../trips.js');
      const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
      const handler = route.route.stack[route.route.stack.length - 1].handle;
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Departure Date is required',
        })
      );
    });

    it('returns 400 when vehicleId is invalid ObjectId', async () => {
      req.body = {
        destination: 'Test',
        purpose: 'Meeting',
        departureDate: '2025-01-01T10:00:00Z',
        vehicleId: 'invalid-id',
      };

      const { default: router } = await import('../trips.js');
      const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
      const handler = route.route.stack[route.route.stack.length - 1].handle;
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid vehicle ID',
        })
      );
    });

    it('creates trip successfully with valid data', async () => {
      req.body = {
        destination: 'Test Location',
        purpose: 'Meeting',
        departureDate: '2025-01-01T10:00:00Z',
      };

      mockCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      mockCollection.findOne.mockResolvedValue(null);

      const { default: router } = await import('../trips.js');
      const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
      const handler = route.route.stack[route.route.stack.length - 1].handle;
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('calls next() on unhandled errors', async () => {
      req.body = {
        destination: 'Test',
        purpose: 'Meeting',
        departureDate: '2025-01-01T10:00:00Z',
      };

      mockCollection.insertOne.mockRejectedValue(new Error('DB error'));

      const { default: router } = await import('../trips.js');
      const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
      const handler = route.route.stack[route.route.stack.length - 1].handle;
      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('GET /api/trips - List Trips', () => {
    it('returns trips list with pagination', async () => {
      const mockTrips = [
        { _id: new ObjectId(), tripId: 'TR001', destination: 'Test' },
      ];

      const mockFindResult = {
        sort: vi.fn(() => ({
          skip: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue(mockTrips),
            })),
          })),
        })),
      };

      mockCollection.find.mockReturnValue(mockFindResult);
      mockCollection.countDocuments.mockResolvedValue(1);
      mockCollection.findOne.mockResolvedValue(null);

      const { default: router } = await import('../trips.js');
      const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.get);
      const handler = route.route.stack[route.route.stack.length - 1].handle;
      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
        })
      );
    });
  });

  describe('GET /api/trips/:id - Get Trip', () => {
    it('returns 400 for invalid trip ID', async () => {
      req.params = { id: 'invalid-id' };

      const { default: router } = await import('../trips.js');
      const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
      const handler = route.route.stack[route.route.stack.length - 1].handle;
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid trip ID',
        })
      );
    });

    it('returns 404 when trip not found', async () => {
      const validId = new ObjectId();
      req.params = { id: validId.toString() };
      mockCollection.findOne.mockResolvedValue(null);

      const { default: router } = await import('../trips.js');
      const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
      const handler = route.route.stack[route.route.stack.length - 1].handle;
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Trip not found',
        })
      );
    });
  });
});
