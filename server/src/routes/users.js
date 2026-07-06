import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  validateEmail, 
  validatePassword, 
  validateRequired,
  validateRole,
  validatePagination,
  escapeRegex
} from '../middleware/validation.js';
import config from '../config.js';

const router = Router();

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

// GET /api/users
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { role, department, stationId, search, page = 1, limit = 10 } = req.query;
    const db = getDB();

    // Build filter
    const filter = { isActive: true };
    
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (stationId) filter.stationId = stationId;
    
    if (search) {
      const sanitizedSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { employeeId: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    // Non-admins can only see their team
    if (req.user.role === 'supervisor') {
      filter.supervisorId = req.user._id.toString();
    }

    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const [users, total] = await Promise.all([
      db.collection('users')
        .find(filter)
        .project({ password: 0 })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection('users').countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let user;
    try {
      user = await db.collection('users').findOne(
        { _id: new ObjectId(id) },
        { projection: { password: 0 } }
      );
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/bulk
router.post('/bulk', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of users' });
    }

    if (users.length > 500) {
      return res.status(400).json({ success: false, message: 'Maximum 500 users per upload' });
    }

    const db = getDB();
    const results = { created: 0, failed: 0, errors: [] };

    for (let i = 0; i < users.length; i++) {
      const row = users[i];
      const rowNum = i + 1;

      try {
        const { employeeId, name, email, password, role, department, jobTitle, stationId } = row;

        // Validate required fields
        if (!employeeId || !employeeId.trim()) {
          results.errors.push({ row: rowNum, email: email || 'N/A', message: 'Employee ID is required' });
          results.failed++;
          continue;
        }
        if (!name || !name.trim()) {
          results.errors.push({ row: rowNum, email: email || 'N/A', message: 'Name is required' });
          results.failed++;
          continue;
        }
        if (!email || !email.trim()) {
          results.errors.push({ row: rowNum, employeeId, message: 'Email is required' });
          results.failed++;
          continue;
        }
        if (!validateEmail(email)) {
          results.errors.push({ row: rowNum, email, message: 'Invalid email format' });
          results.failed++;
          continue;
        }
        if (!password || password.length < config.validation.minPasswordLength) {
          results.errors.push({ row: rowNum, email, message: `Password must be at least ${config.validation.minPasswordLength} characters` });
          results.failed++;
          continue;
        }
        if (role && !validateRole(role)) {
          results.errors.push({ row: rowNum, email, message: 'Invalid role' });
          results.failed++;
          continue;
        }

        // Check duplicate employee ID
        const existingEmp = await db.collection('users').findOne({ employeeId: employeeId.trim() });
        if (existingEmp) {
          results.errors.push({ row: rowNum, email, message: `Employee ID "${employeeId}" already exists` });
          results.failed++;
          continue;
        }

        // Check duplicate email
        const existingEmail = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
        if (existingEmail) {
          results.errors.push({ row: rowNum, email, message: `Email "${email}" already exists` });
          results.failed++;
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        await db.collection('users').insertOne({
          employeeId: employeeId.trim(),
          name: toTitleCase(name.trim()),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: role || 'user',
          department: department || null,
          jobTitle: jobTitle || null,
          stationId: stationId || null,
          supervisorId: null,
          isActive: true,
          tokenVersion: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        results.created++;
      } catch (err) {
        results.errors.push({ row: rowNum, message: err.message });
        results.failed++;
      }
    }

    res.status(201).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// POST /api/users
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { 
      employeeId, name, email, password, 
      role = 'user', department, jobTitle, stationId, supervisorId 
    } = req.body;

    // Validation
    const empIdErr = validateRequired(employeeId, 'Employee ID');
    if (empIdErr) {
      return res.status(400).json({ success: false, message: empIdErr });
    }
    const nameErr = validateRequired(name, 'Name');
    if (nameErr) {
      return res.status(400).json({ success: false, message: nameErr });
    }
    const emailErr = validateRequired(email, 'Email');
    if (emailErr) {
      return res.status(400).json({ success: false, message: emailErr });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' 
      });
    }
    if (!validateRole(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const db = getDB();

    // Check for existing employee ID
    const existingEmployee = await db.collection('users').findOne({ employeeId });
    if (existingEmployee) {
      return res.status(409).json({ 
        success: false, 
        message: 'Employee ID already exists' 
      });
    }

    // Check for existing email
    const existingEmail = await db.collection('users').findOne({ 
      email: email.toLowerCase() 
    });
    if (existingEmail) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with default module access
    const newUser = {
      employeeId,
      name: toTitleCase(name.trim()),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      department: department || null,
      jobTitle: jobTitle || null,
      stationId: stationId || null,
      supervisorId: supervisorId || null,
      isActive: true,
      tokenVersion: 0,
      // Default module access - attendance enabled for all users
      moduleAccess: {
        attendance: {
          enabled: true,
          role: role === 'admin' ? 'admin' : role === 'supervisor' ? 'supervisor' : 'user',
          permissions: role === 'admin' ? ['*'] : 
                      role === 'supervisor' ? ['check_in_out', 'view_own_records', 'view_team_records', 'manage_shifts', 'view_reports', 'send_messages'] :
                      ['check_in_out', 'view_own_records', 'send_messages'],
        },
        equipment: {
          enabled: false,
          role: 'user',
          permissions: [],
        },
        fleet: {
          enabled: false,
          role: 'user',
          permissions: [],
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser);

    // Return user data without password
    const { password: _, ...userData } = newUser;
    userData._id = result.insertedId;

    res.status(201).json({ success: true, data: userData });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      employeeId, name, email, password, 
      role, department, jobTitle, stationId, supervisorId, isActive 
    } = req.body;

    const db = getDB();

    // Find user
    let user;
    try {
      user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Users can only update their own profile (except admins)
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only update your own profile' 
      });
    }

    // Build update object
    const updateData = { updatedAt: new Date() };

    if (employeeId && employeeId !== user.employeeId) {
      const existing = await db.collection('users').findOne({ 
        employeeId, 
        _id: { $ne: new ObjectId(id) } 
      });
      if (existing) {
        return res.status(409).json({ 
          success: false, 
          message: 'Employee ID already exists' 
        });
      }
      updateData.employeeId = employeeId;
    }

    if (email && email.toLowerCase() !== user.email) {
      const existing = await db.collection('users').findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: new ObjectId(id) } 
      });
      if (existing) {
        return res.status(409).json({ 
          success: false, 
          message: 'Email already exists' 
        });
      }
      updateData.email = email.toLowerCase().trim();
    }

    if (name) updateData.name = toTitleCase(name.trim());
    if (department !== undefined) updateData.department = department;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (stationId !== undefined) updateData.stationId = stationId;
    if (supervisorId !== undefined) updateData.supervisorId = supervisorId;

    // Only admin can change role and active status
    if (req.user.role === 'admin') {
      if (role && validateRole(role) && role !== user.role) {
        updateData.role = role;
        updateData.$inc = { tokenVersion: 1 };
      }
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    // Update password if provided
    if (password) {
      if (!validatePassword(password)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' 
        });
      }
      updateData.password = await bcrypt.hash(password, 12);
      if (!updateData.$inc) updateData.$inc = { tokenVersion: 1 };
    }

    const { $inc, ...$set } = updateData;
    const updateOp = { $set };
    if ($inc) updateOp.$inc = $inc;

    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      updateOp
    );

    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let user;
    try {
      user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Soft delete - set isActive to false
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id/module-access
router.put('/:id/module-access', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { module, enabled, role, permissions } = req.body;

    // Validate module
    const validModules = ['attendance', 'equipment', 'fleet'];
    if (!validModules.includes(module)) {
      return res.status(400).json({ success: false, message: 'Invalid module' });
    }

    const db = getDB();

    let user;
    try {
      user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Validate module role
    const validModuleRoles = {
      attendance: ['admin', 'supervisor', 'user'],
      equipment: ['admin', 'booker', 'user'],
      fleet: ['admin', 'manager', 'driver', 'user'],
    };

    if (role && !validModuleRoles[module].includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role for ${module} module` });
    }

    // Build update data
    const updateData = {};
    updateData[`moduleAccess.${module}.enabled`] = enabled;
    if (role) updateData[`moduleAccess.${module}.role`] = role;
    if (permissions) updateData[`moduleAccess.${module}.permissions`] = permissions;

    // Update user and increment tokenVersion to refresh JWT
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() }, $inc: { tokenVersion: 1 } }
    );

    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id/module-access/bulk
router.put('/:id/module-access/bulk', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { moduleAccess } = req.body;

    // Validate moduleAccess structure
    const validModules = ['attendance', 'equipment', 'fleet'];
    const validModuleRoles = {
      attendance: ['admin', 'supervisor', 'user'],
      equipment: ['admin', 'booker', 'user'],
      fleet: ['admin', 'manager', 'driver', 'user'],
    };

    for (const [module, access] of Object.entries(moduleAccess)) {
      if (!validModules.includes(module)) {
        return res.status(400).json({ success: false, message: `Invalid module: ${module}` });
      }
      if (access.role && !validModuleRoles[module].includes(access.role)) {
        return res.status(400).json({ success: false, message: `Invalid role for ${module} module` });
      }
    }

    const db = getDB();

    let user;
    try {
      user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Build update data
    const updateData = {};
    for (const [module, access] of Object.entries(moduleAccess)) {
      updateData[`moduleAccess.${module}.enabled`] = access.enabled;
      if (access.role) updateData[`moduleAccess.${module}.role`] = access.role;
      if (access.permissions) updateData[`moduleAccess.${module}.permissions`] = access.permissions;
    }

    // Update user and increment tokenVersion to refresh JWT
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() }, $inc: { tokenVersion: 1 } }
    );

    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

export default router;
