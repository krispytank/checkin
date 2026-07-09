import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

vi.mock('../../db.js', () => ({ getDB: vi.fn() }));
vi.mock('../../middleware/auth.js', () => {
  const actual = { __esModule: true };
  actual.generateToken = (user, type = 'auth') => `mock-token-${type}-${user._id}`;
  actual.verifyToken = (token) => ({ userId: 'test', type: 'auth' });
  actual.authenticate = vi.fn((req, res, next) => {
    req.user = { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin', moduleAccess: { attendance: { enabled: true, role: 'admin', permissions: [] }, equipment: { enabled: true, role: 'admin', permissions: [] }, fleet: { enabled: true, role: 'admin', permissions: [] } } };
    next();
  });
  actual.authorize = vi.fn(() => (req, res, next) => next());
  return actual;
});
vi.mock('../../middleware/validation.js', () => ({
  validateRequired: (v, f) => (!v || (typeof v === 'string' && !v.trim())) ? `${f} is required` : null,
  validateEmail: (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
  validatePassword: (p) => p && p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[!@#$%^&*(),.?":{}|<>]/.test(p),
  validateRole: (r) => ['admin', 'supervisor', 'user'].includes(r),
  validatePagination: (p, l) => ({ page: 1, limit: 50, skip: 0 }),
  validateShiftTime: (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t),
  validateDaysOfWeek: (d) => Array.isArray(d) && d.length > 0 && d.every(n => Number.isInteger(n) && n >= 0 && n <= 6),
}));
vi.mock('../../routes/notifications.js', () => ({
  sendSystemNotification: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../utils/mail.js', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(null),
}));

import { getDB } from '../../db.js';
import { authenticate } from '../../middleware/auth.js';

function mockDb(collections = {}) {
  const col = (name) => collections[name] || {
    findOne: vi.fn().mockResolvedValue(null),
    insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() }),
    updateOne: vi.fn(),
  };
  getDB.mockReturnValue({ collection: vi.fn(col) });
}

function reqRes(overrides = {}) {
  const req = { params: {}, body: {}, query: {}, user: { _id: new ObjectId('507f1f77bcf86cd799439011'), role: 'admin' }, ...overrides };
  const res = { status: vi.fn(() => res), json: vi.fn() };
  return { req, res, next: vi.fn() };
}

// ==================== AUTH ====================
describe('Auth - Login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST /login - requires email', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { password: 'Test123!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/login' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /login - requires password', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { email: 'test@test.com' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/login' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /login - invalid email format', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { email: 'notemail', password: 'Test123!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/login' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /login - user not found returns generic error', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { email: 'test@test.com', password: 'Test123!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/login' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid email or password' }));
  });

  it('POST /login - wrong password returns same error (no email enum)', async () => {
    const hashedPw = await bcrypt.hash('Correct123!', 12);
    mockDb({ users: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId(), email: 'test@test.com', password: hashedPw, isActive: true, role: 'user' }), updateOne: vi.fn() } });
    const { req, res, next } = reqRes({ body: { email: 'test@test.com', password: 'Wrong123!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/login' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid email or password' }));
  });

  it('POST /login - inactive user returns generic error', async () => {
    // Route queries { isActive: true }, so mock returns null (no active user found)
    mockDb({ users: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ body: { email: 'test@test.com', password: 'Test123!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/login' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid email or password' }));
  });

  it('POST /login - success returns token and user data', async () => {
    const hashedPw = await bcrypt.hash('Test123!', 12);
    mockDb({ users: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId(), email: 'test@test.com', password: hashedPw, isActive: true, role: 'admin' }), updateOne: vi.fn() } });
    const { req, res, next } = reqRes({ body: { email: 'test@test.com', password: 'Test123!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/login' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const data = res.json.mock.calls[0][0].data;
    expect(data.token).toBeDefined();
    expect(data.user.password).toBeUndefined();
  });
});

describe('Auth - Register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST /register - non-admin gets 403', async () => {
    mockDb();
    const { req, res, next } = reqRes({
      body: { employeeId: '001', name: 'Test', email: 'test@test.com', password: 'Test123!' },
      user: { _id: new ObjectId(), role: 'user' },
    });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/register' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('POST /register - validates all required fields', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/register' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /register - invalid email', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { employeeId: '001', name: 'Test', email: 'bad', password: 'Test123!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/register' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /register - weak password', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { employeeId: '001', name: 'Test', email: 'test@test.com', password: 'weak' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/register' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /register - duplicate employeeId', async () => {
    mockDb({ users: { findOne: vi.fn().mockResolvedValue({ employeeId: '001' }), insertOne: vi.fn() } });
    const { req, res, next } = reqRes({ body: { employeeId: '001', name: 'Test', email: 'test@test.com', password: 'Test123!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/register' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('POST /register - success', async () => {
    mockDb({ users: { findOne: vi.fn().mockResolvedValue(null), insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() }) } });
    const { req, res, next } = reqRes({ body: { employeeId: '001', name: 'Test User', email: 'test@test.com', password: 'Test123!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/register' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('Auth - Change Password', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST /change-password - requires currentPassword', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { newPassword: 'Test123!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/change-password' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /change-password - weak new password', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { currentPassword: 'Old123!', newPassword: 'weak' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/change-password' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /change-password - wrong current password', async () => {
    const hashedPw = await bcrypt.hash('Correct123!', 12);
    const findOne = vi.fn().mockResolvedValue({ _id: new ObjectId(), password: hashedPw });
    mockDb({ users: { findOne, updateOne: vi.fn() } });
    const { req, res, next } = reqRes({ body: { currentPassword: 'Wrong123!', newPassword: 'New12345!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/change-password' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('POST /change-password - success', async () => {
    const hashedPw = await bcrypt.hash('Old123!', 12);
    mockDb({ users: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId(), password: hashedPw }), updateOne: vi.fn() } });
    const { req, res, next } = reqRes({ body: { currentPassword: 'Old123!', newPassword: 'New12345!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/change-password' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('Auth - Forgot/Reset Password', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST /forgot-password - requires email', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/forgot-password' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /forgot-password - always returns success (prevents enum)', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { email: 'nonexistent@test.com' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/forgot-password' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('POST /reset-password - requires token', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { newPassword: 'Test123!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/reset-password' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /reset-password - expired token', async () => {
    mockDb({ password_resets: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ body: { token: 'expired', newPassword: 'Test123!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/reset-password' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /reset-password - success', async () => {
    mockDb({
      password_resets: {
        findOne: vi.fn().mockResolvedValue({ userId: new ObjectId().toString(), _id: new ObjectId() }),
        deleteOne: vi.fn(),
      },
      users: { updateOne: vi.fn() },
    });
    const { req, res, next } = reqRes({ body: { token: 'valid-token', newPassword: 'New12345!' } });
    const { default: router } = await import('../auth.js');
    const route = router.stack.find(r => r.route?.path === '/reset-password' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ==================== USERS ====================
describe('Users - CRUD', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST / - validates all fields', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - invalid email', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { employeeId: '001', name: 'Test', email: 'bad', password: 'Test123!' } });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - weak password', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { employeeId: '001', name: 'Test', email: 'test@test.com', password: 'weak' } });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - duplicate employeeId', async () => {
    mockDb({ users: { findOne: vi.fn().mockResolvedValue({ employeeId: '001' }) } });
    const { req, res, next } = reqRes({ body: { employeeId: '001', name: 'Test', email: 'test@test.com', password: 'Test123!' } });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('POST / - success with default moduleAccess', async () => {
    const insertOne = vi.fn().mockResolvedValue({ insertedId: new ObjectId() });
    mockDb({ users: { findOne: vi.fn().mockResolvedValue(null), insertOne } });
    const { req, res, next } = reqRes({ body: { employeeId: '001', name: 'Test', email: 'test@test.com', password: 'Test123!' } });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    const user = insertOne.mock.calls[0][0];
    expect(user.moduleAccess).toBeDefined();
    expect(user.moduleAccess.attendance.enabled).toBe(true);
  });

  it('PUT /:id - non-admin can only update own profile', async () => {
    const userId = new ObjectId();
    mockDb({ users: { findOne: vi.fn().mockResolvedValue({ _id: userId }) } });
    const { req, res, next } = reqRes({
      params: { id: userId.toString() },
      body: { name: 'New' },
      user: { _id: new ObjectId(), role: 'user' },
    });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('DELETE /:id - soft deletes (isActive=false)', async () => {
    const userId = new ObjectId();
    mockDb({ users: { findOne: vi.fn().mockResolvedValue({ _id: userId }), updateOne: vi.fn() } });
    const { req, res, next } = reqRes({ params: { id: userId.toString() } });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('PUT /:id/module-access - validates module', async () => {
    const userId = new ObjectId();
    mockDb({ users: { findOne: vi.fn().mockResolvedValue({ _id: userId }) } });
    const { req, res, next } = reqRes({ params: { id: userId.toString() }, body: { module: 'invalid' } });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/:id/module-access' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /bulk - validates array input', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { users: null } });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/bulk' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /bulk - rejects >500 users', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { users: new Array(501).fill({}) } });
    const { default: router } = await import('../users.js');
    const route = router.stack.find(r => r.route?.path === '/bulk' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ==================== ATTENDANCE: STATIONS ====================
describe('Stations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST / - validates all fields', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - validates latitude range', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { name: 'HQ', latitude: 91, longitude: 3, radiusMeters: 100 } });
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - validates longitude range', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { name: 'HQ', latitude: 6, longitude: 181, radiusMeters: 100 } });
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - validates radius range', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { name: 'HQ', latitude: 6, longitude: 3, radiusMeters: 5 } });
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - rejects duplicate name', async () => {
    mockDb({ stations: { findOne: vi.fn().mockResolvedValue({ name: 'HQ' }) } });
    const { req, res, next } = reqRes({ body: { name: 'HQ', latitude: 6, longitude: 3, radiusMeters: 100 } });
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('DELETE /:id - blocks if users assigned', async () => {
    const stationId = new ObjectId();
    mockDb({
      stations: { findOne: vi.fn().mockResolvedValue({ _id: stationId, name: 'HQ' }) },
      users: { countDocuments: vi.fn().mockResolvedValue(5) },
    });
    const { req, res, next } = reqRes({ params: { id: stationId.toString() } });
    const { default: router } = await import('../stations.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ==================== ATTENDANCE: SHIFTS ====================
describe('Shifts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST / - validates required fields', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - validates time format', async () => {
    mockDb({ shifts: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ body: { name: 'Morning', startTime: '25:00', endTime: '17:00', applicableDays: [1] } });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - validates applicableDays', async () => {
    mockDb({ shifts: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ body: { name: 'Morning', startTime: '08:00', endTime: '17:00', applicableDays: 'invalid' } });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - rejects duplicate name', async () => {
    mockDb({ shifts: { findOne: vi.fn().mockResolvedValue({ name: 'Morning' }) } });
    const { req, res, next } = reqRes({ body: { name: 'Morning', startTime: '08:00', endTime: '17:00', applicableDays: [1, 2, 3, 4, 5] } });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('DELETE /:id - blocks if users assigned', async () => {
    const shiftId = new ObjectId();
    mockDb({
      shifts: { findOne: vi.fn().mockResolvedValue({ _id: shiftId, name: 'Morning' }) },
      shift_assignments: { countDocuments: vi.fn().mockResolvedValue(3) },
    });
    const { req, res, next } = reqRes({ params: { id: shiftId.toString() } });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /assign - validates userId and shiftId', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/assign' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /assign - user not found returns 404', async () => {
    mockDb({ users: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ body: { userId: new ObjectId().toString(), shiftId: new ObjectId().toString() } });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/assign' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('POST /assign - shift not found returns 404', async () => {
    mockDb({
      users: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId() }) },
      shifts: { findOne: vi.fn().mockResolvedValue(null) },
    });
    const { req, res, next } = reqRes({ body: { userId: new ObjectId().toString(), shiftId: new ObjectId().toString() } });
    const { default: router } = await import('../shifts.js');
    const route = router.stack.find(r => r.route?.path === '/assign' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ==================== DEPARTMENTS & JOB TITLES ====================
describe('Departments & Job Titles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('departments POST - requires name', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../departments.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('departments POST - rejects duplicate', async () => {
    mockDb({ departments: { findOne: vi.fn().mockResolvedValue({ name: 'IT' }) } });
    const { req, res, next } = reqRes({ body: { name: 'IT' } });
    const { default: router } = await import('../departments.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('departments DELETE - blocks if users assigned', async () => {
    const deptId = new ObjectId();
    mockDb({
      departments: { findOne: vi.fn().mockResolvedValue({ _id: deptId, name: 'IT' }) },
      users: { countDocuments: vi.fn().mockResolvedValue(2) },
    });
    const { req, res, next } = reqRes({ params: { id: deptId.toString() } });
    const { default: router } = await import('../departments.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('job titles POST - requires name', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../jobTitles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('job titles POST - rejects duplicate', async () => {
    mockDb({ job_titles: { findOne: vi.fn().mockResolvedValue({ name: 'Developer' }) } });
    const { req, res, next } = reqRes({ body: { name: 'Developer' } });
    const { default: router } = await import('../jobTitles.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('job titles DELETE - blocks if users assigned', async () => {
    const jtId = new ObjectId();
    mockDb({
      job_titles: { findOne: vi.fn().mockResolvedValue({ _id: jtId, name: 'Developer' }) },
      users: { countDocuments: vi.fn().mockResolvedValue(3) },
    });
    const { req, res, next } = reqRes({ params: { id: jtId.toString() } });
    const { default: router } = await import('../jobTitles.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.delete);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ==================== MESSAGES ====================
describe('Messages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST / - validates required fields', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: {} });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - validates receiverId format', async () => {
    mockDb();
    const { req, res, next } = reqRes({ body: { receiverId: 'bad', subject: 'Hi', content: 'Hello' } });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST / - receiver not found returns 404', async () => {
    mockDb({ users: { findOne: vi.fn().mockResolvedValue(null) } });
    const { req, res, next } = reqRes({ body: { receiverId: new ObjectId().toString(), subject: 'Hi', content: 'Hello' } });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('POST / - supervisor cannot message outside team', async () => {
    mockDb({ users: { findOne: vi.fn().mockResolvedValue({ _id: new ObjectId(), supervisorId: 'other-user' }) } });
    const { req, res, next } = reqRes({
      body: { receiverId: new ObjectId().toString(), subject: 'Hi', content: 'Hello' },
      user: { _id: new ObjectId(), role: 'supervisor' },
    });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/' && r.route?.methods?.post);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('GET /:id - not sender or receiver gets 403', async () => {
    const msgId = new ObjectId();
    mockDb({ messages: { findOne: vi.fn().mockResolvedValue({ _id: msgId, senderId: 'other', receiverId: 'another' }) } });
    const { req, res, next } = reqRes({ params: { id: msgId.toString() } });
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/:id' && r.route?.methods?.get);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('PUT /read-all - marks all messages read', async () => {
    mockDb({ messages: { updateMany: vi.fn() } });
    const { req, res, next } = reqRes();
    const { default: router } = await import('../messages.js');
    const route = router.stack.find(r => r.route?.path === '/read-all' && r.route?.methods?.put);
    await route.route.stack[route.route.stack.length - 1].handle(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
