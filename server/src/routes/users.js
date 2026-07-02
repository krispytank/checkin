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
  validatePagination 
} from '../middleware/validation.js';

const router = Router();

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
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
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
        message: 'Password must be at least 8 characters' 
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

    // Create user
    const newUser = {
      employeeId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      department: department || null,
      jobTitle: jobTitle || null,
      stationId: stationId || null,
      supervisorId: supervisorId || null,
      isActive: true,
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

    if (name) updateData.name = name.trim();
    if (department !== undefined) updateData.department = department;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (stationId !== undefined) updateData.stationId = stationId;
    if (supervisorId !== undefined) updateData.supervisorId = supervisorId;

    // Only admin can change role and active status
    if (req.user.role === 'admin') {
      if (role && validateRole(role)) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    // Update password if provided
    if (password) {
      if (!validatePassword(password)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Password must be at least 8 characters' 
        });
      }
      updateData.password = await bcrypt.hash(password, 12);
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
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

export default router;
