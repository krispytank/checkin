import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import recordRoutes from './routes/records.js';
import stationRoutes from './routes/stations.js';
import shiftRoutes from './routes/shifts.js';
import messageRoutes from './routes/messages.js';
import jobTitleRoutes from './routes/jobTitles.js';
import departmentRoutes from './routes/departments.js';
import notificationRoutes from './routes/notifications.js';
import configRoutes from './routes/config.js';
import equipmentRoutes from './routes/equipment.js';
import caseRoutes from './routes/cases.js';
import bookingRoutes from './routes/bookings.js';
import bookerRoutes from './routes/bookers.js';
import vehicleRoutes from './routes/vehicles.js';
import tripRoutes from './routes/trips.js';
import parkingRoutes from './routes/parking.js';
import checkinRoutes from './routes/checkins.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
  throw new Error('FATAL: CLIENT_URL environment variable is required in production');
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
await connectDB();

// Security Middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));

// General rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/job-titles', jobTitleRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/config', configRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/bookers', bookerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/checkins', checkinRoutes);

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Version endpoint
app.get('/api/version', async (req, res) => {
  try {
    const fs = await import('fs');
    const versionPath = join(__dirname, '../../VERSION');
    const version = fs.readFileSync(versionPath, 'utf8').trim();
    res.json({ version, timestamp: new Date().toISOString() });
  } catch {
    res.json({ version: 'unknown', timestamp: new Date().toISOString() });
  }
});

// Serve static client files in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = join(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  
  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(clientDistPath, 'index.html'));
    } else {
      res.status(404).json({ success: false, message: 'Route not found' });
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler (API only in production, all routes in dev)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res) => {
    res.status(404).json({ 
      success: false, 
      message: 'Route not found' 
    });
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
