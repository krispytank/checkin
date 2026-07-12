import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { validateEmail, validatePassword, validateRequired } from '../middleware/validation.js';
import { sendSystemNotification } from './notifications.js';
import { sendPasswordResetEmail } from '../utils/mail.js';

const router = Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

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

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return res.status(423).json({ 
        success: false, 
        message: `Account locked due to too many failed attempts. Try again in ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.` 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Increment failed attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData = { failedLoginAttempts: failedAttempts, updatedAt: new Date() };

      // Lock account if max attempts reached
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: updateData }
      );

      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Reset failed attempts on successful login
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() } }
    );

    // Check if user needs email verification after password reset
    if (user.needsVerification) {
      // Generate a short-lived verification token (no full auth)
      const verifyToken = generateToken(user, 'verify');
      return res.json({
        success: true,
        data: {
          needsVerification: true,
          verifyToken,
          email: user.email,
        },
      });
    }

    // Generate token
    const token = generateToken(user, 'auth');

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

    // Generate reset token (15 min expiry)
    const resetToken = generateToken(user, 'reset');
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Generate 6-digit reset code
    const resetCode = String(Math.floor(100000 + Math.random() * 900000));
    const crypto = await import('crypto');
    const resetCodeHash = crypto.createHash('sha256').update(resetCode).digest('hex');

    // Generate short ID for URL (8 chars)
    const shortId = crypto.randomBytes(4).toString('hex');

    // Store reset token, code, and short ID
    await db.collection('password_resets').updateOne(
      { userId: user._id.toString() },
      { 
        $set: { 
          token: resetToken, 
          shortId,
          codeHash: resetCodeHash,
          expires: resetExpires,
          createdAt: new Date(),
        } 
      },
      { upsert: true }
    );

    // Send reset email with code and short link (non-blocking)
    sendPasswordResetEmail(user.email, resetToken, resetCode, shortId).catch(() => {});

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
    const { token, code, newPassword } = req.body;

    if (!token && !code) {
      return res.status(400).json({ success: false, message: 'Reset token or code is required' });
    }
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' 
      });
    }

    const db = getDB();
    
    // Find reset record by token or code
    let resetRecord;
    if (token) {
      resetRecord = await db.collection('password_resets').findOne({
        token,
        expires: { $gt: new Date() },
      });
    } else if (code) {
      const crypto = await import('crypto');
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      resetRecord = await db.collection('password_resets').findOne({
        codeHash,
        expires: { $gt: new Date() },
      });
    }

    if (!resetRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token/code' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and set needsVerification
    await db.collection('users').updateOne(
      { _id: new ObjectId(resetRecord.userId) },
      { $set: { password: hashedPassword, updatedAt: new Date(), needsVerification: true }, $inc: { tokenVersion: 1 } }
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

// POST /api/auth/send-login-code
router.post('/send-login-code', async (req, res, next) => {
  try {
    const { verifyToken } = req.body;

    const tokenError = validateRequired(verifyToken, 'Verify token');
    if (tokenError) {
      return res.status(400).json({ success: false, message: tokenError });
    }

    const db = getDB();
    
    // Verify the token
    let decoded;
    try {
      const { verifyToken: vt } = await import('../middleware/auth.js');
      decoded = vt(verifyToken);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    if (decoded.type !== 'verify') {
      return res.status(400).json({ success: false, message: 'Invalid token type' });
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
    if (!user || !user.needsVerification) {
      return res.status(400).json({ success: false, message: 'Verification not required' });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const crypto = await import('crypto');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const codeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store login code
    await db.collection('login_codes').updateOne(
      { userId: user._id.toString() },
      { $set: { codeHash, expires: codeExpires, createdAt: new Date() } },
      { upsert: true }
    );

    // Send code via email (non-blocking)
    const { sendLoginCodeEmail } = await import('../utils/mail.js');
    sendLoginCodeEmail(user.email, code).catch(() => {});

    res.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify-login-code
router.post('/verify-login-code', async (req, res, next) => {
  try {
    const { verifyToken, code } = req.body;

    const tokenError = validateRequired(verifyToken, 'Verify token');
    if (tokenError) {
      return res.status(400).json({ success: false, message: tokenError });
    }
    const codeError = validateRequired(code, 'Code');
    if (codeError) {
      return res.status(400).json({ success: false, message: codeError });
    }

    const db = getDB();
    
    // Verify the token
    let decoded;
    try {
      const { verifyToken: vt } = await import('../middleware/auth.js');
      decoded = vt(verifyToken);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    if (decoded.type !== 'verify') {
      return res.status(400).json({ success: false, message: 'Invalid token type' });
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
    if (!user || !user.needsVerification) {
      return res.status(400).json({ success: false, message: 'Verification not required' });
    }

    // Verify login code
    const crypto = await import('crypto');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const loginCode = await db.collection('login_codes').findOne({
      userId: user._id.toString(),
      codeHash,
      expires: { $gt: new Date() },
    });

    if (!loginCode) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    // Clear needsVerification and delete login code
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { needsVerification: false, updatedAt: new Date() } }
    );
    await db.collection('login_codes').deleteOne({ _id: loginCode._id });

    // Generate full auth token
    const authToken = generateToken(user, 'auth');
    const { password: _, ...userData } = user;
    userData.needsVerification = false;

    res.json({
      success: true,
      data: {
        user: userData,
        token: authToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/reset-lookup/:shortId
router.get('/reset-lookup/:shortId', async (req, res, next) => {
  try {
    const { shortId } = req.params;
    const db = getDB();
    const resetRecord = await db.collection('password_resets').findOne({
      shortId,
      expires: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(404).json({ success: false, message: 'Invalid or expired reset link' });
    }

    res.json({ success: true, data: { token: resetRecord.token } });
  } catch (error) {
    next(error);
  }
});

export default router;
