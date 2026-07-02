import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { validateEmail, validatePassword, validateRequired } from '../middleware/validation.js';
import { sendSystemNotification } from './notifications.js';
import { sendPasswordResetEmail } from '../utils/mail.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    const emailError = validateRequired(email, 'Email');
    if (emailError) {
      return res.status(400).json({ success: false, message: emailError });
    }
    const passwordError = validateRequired(password, 'Password');
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const db = getDB();
    
    // Find user by email
    const user = await db.collection('users').findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.role, 'auth', user.tokenVersion || 0);

    // Return user data without password
    const { password: _, ...userData } = user;

    res.json({
      success: true,
      data: {
        user: userData,
        token,
      },
    });

    // Send shift reminder if applicable (non-blocking)
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const currentTime = now.toTimeString().slice(0, 5);

      // Check if user has a shift today
      const dayOfWeek = now.getDay();
      const shiftAssignment = await db.collection('shift_assignments').findOne({ userId: user._id.toString() });
      if (shiftAssignment) {
        const shift = await db.collection('shifts').findOne({ _id: new ObjectId(shiftAssignment.shiftId) });
        if (shift && shift.applicableDays.includes(dayOfWeek)) {
          // Check if user hasn't checked in yet
          const todayRecord = await db.collection('records').findOne({
            userId: user._id.toString(),
            date: today,
          });
          if (!todayRecord && currentTime <= shift.startTime) {
            await sendSystemNotification(
              db,
              user._id.toString(),
              'shiftReminder',
              'Shift Reminder',
              `Your shift starts at ${shift.startTime}. Please remember to check in on time.`
            );
          }
        }
      }
    } catch (e) {
      // Non-blocking - don't fail login if reminder fails
      console.error('Shift reminder error:', e.message);
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/register
router.post('/register', authenticate, async (req, res, next) => {
  try {
    const { 
      employeeId, name, email, password, 
      role = 'user', department, jobTitle, stationId, supervisorId 
    } = req.body;

    // Only admin can create users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only administrators can create users' 
      });
    }

    // Validation
    const empIdError = validateRequired(employeeId, 'Employee ID');
    if (empIdError) {
      return res.status(400).json({ success: false, message: empIdError });
    }
    const nameError = validateRequired(name, 'Name');
    if (nameError) {
      return res.status(400).json({ success: false, message: nameError });
    }
    const regEmailError = validateRequired(email, 'Email');
    if (regEmailError) {
      return res.status(400).json({ success: false, message: regEmailError });
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
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser);

    // Return user data without password
    const { password: _, ...userData } = newUser;
    userData._id = result.insertedId;

    res.status(201).json({
      success: true,
      data: userData,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const currentError = validateRequired(currentPassword, 'Current password');
    if (currentError) {
      return res.status(400).json({ success: false, message: currentError });
    }
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 8 characters with uppercase, lowercase, number, and special character' 
      });
    }

    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user._id) });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.user._id) },
      { $set: { password: hashedPassword, updatedAt: new Date() }, $inc: { tokenVersion: 1 } }
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    const fpEmailError = validateRequired(email, 'Email');
    if (fpEmailError) {
      return res.status(400).json({ success: false, message: fpEmailError });
    }

    const db = getDB();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'If an account exists, you will receive an email with instructions.' 
      });
    }

    // Generate reset token
    const resetToken = generateToken(user._id.toString(), user.role, 'reset');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token
    await db.collection('password_resets').updateOne(
      { userId: user._id.toString() },
      { 
        $set: { 
          token: resetToken, 
          expires: resetExpires,
          createdAt: new Date(),
        } 
      },
      { upsert: true }
    );

    // Send reset email (non-blocking)
    sendPasswordResetEmail(user.email, resetToken).catch(() => {});

    res.json({ 
      success: true, 
      message: 'If an account exists, you will receive an email with instructions.' 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    const tokenError = validateRequired(token, 'Token');
    if (tokenError) {
      return res.status(400).json({ success: false, message: tokenError });
    }
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' 
      });
    }

    const db = getDB();
    
    // Find reset record
    const resetRecord = await db.collection('password_resets').findOne({
      token,
      expires: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await db.collection('users').updateOne(
      { _id: new ObjectId(resetRecord.userId) },
      { $set: { password: hashedPassword, updatedAt: new Date() }, $inc: { tokenVersion: 1 } }
    );

    // Delete reset record
    await db.collection('password_resets').deleteOne({ _id: resetRecord._id });

    res.json({ 
      success: true, 
      message: 'Password reset successful' 
    });
  } catch (error) {
    next(error);
  }
});

export default router;
