import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { connectDB, getDB, closeDB } from './db.js';
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
import auditLogRoutes from './routes/auditLogs.js';
import registryRoutes from './routes/registries.js';
import parkingLotRoutes from './routes/parkingLots.js';
import visitorParkingRoutes from './routes/visitorParking.js';
import maintenanceRoutes from './routes/maintenance.js';
import fleetDashboardRoutes from './routes/fleetDashboard.js';
import fleetReportRoutes from './routes/fleetReports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '../.env.production' : '../.env';
dotenv.config({ path: new URL(envFile, import.meta.url).pathname });

if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
  throw new Error('FATAL: CLIENT_URL environment variable is required in production');
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Trust first proxy (required behind Render's reverse proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Connect to MongoDB
await connectDB();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://nominatim.openstreetmap.org"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  } : undefined,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(mongoSanitize());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/registries', registryRoutes);
app.use('/api/parking-lots', parkingLotRoutes);
app.use('/api/visitor-parking', visitorParkingRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fleet/dashboard', fleetDashboardRoutes);
app.use('/api/fleet/reports', fleetReportRoutes);

// Serve uploaded files (1 hour cache)
app.use('/uploads', express.static(join(__dirname, '../uploads'), { maxAge: '1h' }));

// Health check endpoint — verifies MongoDB connectivity
app.get('/api/health', async (req, res) => {
  try {
    const db = getDB();
    await db.command({ ping: 1 });
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database unreachable',
      timestamp: new Date().toISOString(),
    });
  }
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
  app.use(express.static(clientDistPath, {
    maxAge: '1y',
    immutable: true,
    index: false,
  }));
  
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
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await closeDB();
    console.log('Database connection closed.');
    process.exit(0);
  });

  // Force shutdown after 30s if graceful shutdown hangs
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
