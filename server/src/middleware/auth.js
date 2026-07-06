import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import config from '../config.js';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'auth') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token type.' 
      });
    }
    
    const db = getDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or user deactivated.' 
      });
    }

    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== (user.tokenVersion || 0)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has been revoked.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions.' 
      });
    }

    next();
  };
};

// Module-based authorization: check if user has the required role in a specific module
export const authorizeModule = (module, ...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Base admin role grants access to all modules
    if (req.user.role === 'admin') {
      return next();
    }

    const moduleAccess = req.user.moduleAccess?.[module];

    if (!moduleAccess?.enabled) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied: ${module} module not enabled for this user` 
      });
    }

    if (!roles.includes(moduleAccess.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Insufficient permissions for ${module} module` 
      });
    }

    next();
  };
};

// Permission-based authorization: check if user has a specific permission in a module
export const authorizePermission = (module, permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Base admin role has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    const moduleAccess = req.user.moduleAccess?.[module];

    if (!moduleAccess?.enabled) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied: ${module} module not enabled` 
      });
    }

    // Module admin has all permissions within that module
    if (moduleAccess.role === 'admin') {
      return next();
    }

    // Check wildcard permission
    if (moduleAccess.permissions?.includes('*')) {
      return next();
    }

    if (!moduleAccess.permissions?.includes(permission)) {
      return res.status(403).json({ 
        success: false, 
        message: `Missing permission: ${permission} in ${module}` 
      });
    }

    next();
  };
};

// Check if user has module access (for use in route handlers, not as middleware)
export const hasModuleAccess = (user, module) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.moduleAccess?.[module]?.enabled === true;
};

// Check if user has a specific role in a module
export const hasModuleRole = (user, module, ...roles) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const moduleRole = user.moduleAccess?.[module]?.role;
  return roles.includes(moduleRole);
};

// Check if user has a specific permission in a module
export const hasPermission = (user, module, permission) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const moduleAccess = user.moduleAccess?.[module];
  if (!moduleAccess?.enabled) return false;
  if (moduleAccess.role === 'admin') return true;
  if (moduleAccess.permissions?.includes('*')) return true;
  return moduleAccess.permissions?.includes(permission) === true;
};

// Get default permissions for a module role
export const getDefaultPermissions = (module, role) => {
  return config.defaultModulePermissions?.[module]?.[role] || [];
};

// Validate module and role
export const isValidModule = (module) => {
  return Object.values(config.modules).includes(module);
};

export const isValidModuleRole = (module, role) => {
  return config.moduleRoles?.[module]?.includes(role) || false;
};

export const generateToken = (user, type = 'auth') => {
  const payload = {
    userId: user._id?.toString() || user.userId,
    type,
    tokenVersion: user.tokenVersion || 0,
  };

  // Only include role and moduleAccess for auth tokens
  if (type === 'auth') {
    payload.role = user.role;
    payload.moduleAccess = user.moduleAccess || {};
  }

  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
