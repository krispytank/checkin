import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'mahakama_access';

let db = null;
let client = null;

export async function connectDB() {
  try {
    if (db) return db;

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    db = client.db(MONGODB_DB);
    
    // Create indexes
    await createIndexes(db);
    
    // Create schemas
    await createSchemas(db);
    
    // Seed default admin
    await seedDefaultAdmin(db);
    
    console.log('Connected to MongoDB successfully');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

export function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

export async function closeDB() {
  if (client) {
    await client.close();
    db = null;
    client = null;
    console.log('MongoDB connection closed');
  }
}

async function createIndexes(database) {
  try {
    // Users collection indexes
    await database.collection('users').createIndex({ employeeId: 1 }, { unique: true, sparse: true });
    await database.collection('users').createIndex({ email: 1 }, { unique: true });
    await database.collection('users').createIndex({ role: 1 });
    await database.collection('users').createIndex({ stationId: 1 });
    await database.collection('users').createIndex({ supervisorId: 1 });

    // Records collection indexes
    await database.collection('records').createIndex({ userId: 1, date: 1 }, { unique: true });
    await database.collection('records').createIndex({ date: 1 });
    await database.collection('records').createIndex({ status: 1 });

    // Messages collection indexes
    await database.collection('messages').createIndex({ receiverId: 1, read: 1 });
    await database.collection('messages').createIndex({ senderId: 1 });
    await database.collection('messages').createIndex({ createdAt: -1 });

    // Stations collection indexes
    await database.collection('stations').createIndex({ latitude: 1, longitude: 1 });

    // Shifts collection indexes
    await database.collection('shifts').createIndex({ name: 1 }, { unique: true });

    // Shift assignments indexes
    await database.collection('shift_assignments').createIndex({ userId: 1 }, { unique: true });
    await database.collection('shift_assignments').createIndex({ shiftId: 1 });

    // Password reset indexes
    await database.collection('password_resets').createIndex({ token: 1 });
    await database.collection('password_resets').createIndex({ expires: 1 }, { expireAfterSeconds: 0 });

    // Notification preferences indexes
    await database.collection('notification_preferences').createIndex({ userId: 1 }, { unique: true });

    // Equipment collection indexes
    await database.collection('equipment').createIndex({ type: 1 });
    await database.collection('equipment').createIndex({ status: 1 });
    await database.collection('equipment').createIndex({ name: 'text', serialNumber: 'text' });

    // Equipment types collection indexes
    await database.collection('equipment_types').createIndex({ name: 1 }, { unique: true });

    // Cases collection indexes
    await database.collection('cases').createIndex({ caseNumber: 1 }, { unique: true });
    await database.collection('cases').createIndex({ title: 'text', caseNumber: 'text' });

    // Bookings collection indexes
    await database.collection('bookings').createIndex({ bookingId: 1 }, { unique: true });
    await database.collection('bookings').createIndex({ userId: 1 });
    await database.collection('bookings').createIndex({ caseId: 1 });
    await database.collection('bookings').createIndex({ status: 1 });
    await database.collection('bookings').createIndex({ startDate: 1, endDate: 1 });

    // Vehicles collection indexes
    await database.collection('vehicles').createIndex({ plateNumber: 1 }, { unique: true });
    await database.collection('vehicles').createIndex({ status: 1 });
    await database.collection('vehicles').createIndex({ category: 1 });

    // Trips collection indexes
    await database.collection('trips').createIndex({ tripId: 1 }, { unique: true });
    await database.collection('trips').createIndex({ vehicleId: 1 });
    await database.collection('trips').createIndex({ userId: 1 });
    await database.collection('trips').createIndex({ status: 1 });
    await database.collection('trips').createIndex({ departureDate: 1 });

    // Parking spaces collection indexes
    await database.collection('parking_spaces').createIndex({ stationId: 1 });
    await database.collection('parking_spaces').createIndex({ status: 1 });

    console.log('Database indexes created successfully');
  } catch (error) {
    // Log warning but don't crash - indexes may already exist
    console.warn('Index creation warning (non-fatal):', error.message);
  }
}

async function createSchemas(database) {
  const schemas = [
    // Users schema
    {
      collection: 'users',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['employeeId', 'name', 'email', 'password', 'role', 'isActive'],
          properties: {
            employeeId: { bsonType: 'string', description: 'Employee ID is required' },
            name: { bsonType: 'string', description: 'Name is required' },
            email: { bsonType: 'string', description: 'Email is required' },
            password: { bsonType: 'string', description: 'Password is required' },
            role: { enum: ['admin', 'supervisor', 'user'], description: 'Must be a valid role' },
            department: { bsonType: ['string', 'null'] },
            jobTitle: { bsonType: ['string', 'null'] },
            stationId: { bsonType: ['string', 'null'] },
            supervisorId: { bsonType: ['string', 'null'] },
            isActive: { bsonType: 'bool' },
            tokenVersion: { bsonType: 'int' },
            moduleAccess: { bsonType: 'object' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Records schema
    {
      collection: 'records',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'date', 'status'],
          properties: {
            userId: { bsonType: 'string', description: 'User ID is required' },
            date: { bsonType: 'string', description: 'Date is required' },
            events: { bsonType: 'array' },
            status: { enum: ['present', 'absent', 'late', 'half-day', 'overtime'], description: 'Must be a valid status' },
            totalHours: { bsonType: ['double', 'int'], minimum: 0 },
            checkInTime: { bsonType: ['date', 'null'] },
            checkOutTime: { bsonType: ['date', 'null'] },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Messages schema
    {
      collection: 'messages',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['senderId', 'receiverId', 'type', 'subject', 'content', 'read'],
          properties: {
            senderId: { bsonType: 'string', description: 'Sender ID is required' },
            receiverId: { bsonType: 'string', description: 'Receiver ID is required' },
            type: { enum: ['alert', 'message', 'notification'], description: 'Must be a valid message type' },
            subject: { bsonType: 'string', description: 'Subject is required' },
            content: { bsonType: 'string', description: 'Content is required' },
            read: { bsonType: 'bool' },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Stations schema
    {
      collection: 'stations',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'latitude', 'longitude', 'radiusMeters'],
          properties: {
            name: { bsonType: 'string', description: 'Station name is required' },
            latitude: { bsonType: 'double', minimum: -90, maximum: 90, description: 'Latitude must be between -90 and 90' },
            longitude: { bsonType: 'double', minimum: -180, maximum: 180, description: 'Longitude must be between -180 and 180' },
            radiusMeters: { bsonType: 'int', minimum: 10, maximum: 1000, description: 'Radius must be between 10 and 1000' },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Shifts schema
    {
      collection: 'shifts',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'startTime', 'endTime', 'applicableDays'],
          properties: {
            name: { bsonType: 'string', description: 'Shift name is required' },
            startTime: { bsonType: 'string', description: 'Start time is required' },
            endTime: { bsonType: 'string', description: 'End time is required' },
            applicableDays: { bsonType: 'array', items: { bsonType: 'int', minimum: 0, maximum: 6 }, description: 'Applicable days are required (0-6)' },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Shift assignments schema
    {
      collection: 'shift_assignments',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'shiftId'],
          properties: {
            userId: { bsonType: 'string', description: 'User ID is required' },
            shiftId: { bsonType: 'string', description: 'Shift ID is required' },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Departments schema
    {
      collection: 'departments',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name'],
          properties: {
            name: { bsonType: 'string', description: 'Department name is required' },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Job titles schema
    {
      collection: 'job_titles',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name'],
          properties: {
            name: { bsonType: 'string', description: 'Job title name is required' },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Notification preferences schema
    {
      collection: 'notification_preferences',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId'],
          properties: {
            userId: { bsonType: 'string', description: 'User ID is required' },
            lateCheckIn: { bsonType: 'bool' },
            lateCheckOut: { bsonType: 'bool' },
            overtime: { bsonType: 'bool' },
            shiftReminder: { bsonType: 'bool' },
            shiftChange: { bsonType: 'bool' },
            shiftAssignment: { bsonType: 'bool' },
            muteUntil: { bsonType: ['date', 'null'] },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Equipment types schema
    {
      collection: 'equipment_types',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name'],
          properties: {
            name: { bsonType: 'string', description: 'Type name is required' },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Password resets schema
    {
      collection: 'password_resets',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'token', 'expires'],
          properties: {
            userId: { bsonType: 'string', description: 'User ID is required' },
            token: { bsonType: 'string', description: 'Token is required' },
            expires: { bsonType: 'date', description: 'Expiration date is required' },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
  ];

  try {
    for (const { collection, validator } of schemas) {
      await database.command({
        collMod: collection,
        validator,
      }).catch(() => {});
    }

    console.log('Database schemas created successfully');
  } catch (error) {
    console.warn('Schema creation warning (non-fatal):', error.message);
  }
}

async function seedDefaultAdmin(database) {
  try {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'changeme123';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const existingAdmin = await database.collection('users').findOne({ email: adminEmail });

    if (!existingAdmin) {
      await database.collection('users').insertOne({
        employeeId: process.env.DEFAULT_ADMIN_ID || '001',
        name: process.env.DEFAULT_ADMIN_NAME || 'Alex Johnson',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        department: 'Administration',
        jobTitle: 'System Administrator',
        isActive: true,
        tokenVersion: 0,
        moduleAccess: {
          attendance: { enabled: true, role: 'admin', permissions: [] },
          equipment: { enabled: true, role: 'admin', permissions: [] },
          fleet: { enabled: true, role: 'admin', permissions: [] },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('Default admin user created successfully');
    } else {
      const passwordMatch = await bcrypt.compare(adminPassword, existingAdmin.password);
      if (!passwordMatch) {
        await database.collection('users').updateOne(
          { email: adminEmail },
          { $set: { password: hashedPassword, updatedAt: new Date() } }
        );
        console.log('Admin password synced from environment');
      }
      
      // Ensure moduleAccess exists
      if (!existingAdmin.moduleAccess) {
        await database.collection('users').updateOne(
          { email: adminEmail },
          { $set: {
            moduleAccess: {
              attendance: { enabled: true, role: 'admin', permissions: [] },
              equipment: { enabled: true, role: 'admin', permissions: [] },
              fleet: { enabled: true, role: 'admin', permissions: [] },
            },
            updatedAt: new Date(),
          }}
        );
        console.log('Admin moduleAccess initialized');
      }
    }
  } catch (error) {
    console.error('Error seeding default admin:', error);
  }
}
