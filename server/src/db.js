import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'attendtrack';

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

    console.log('Database indexes created successfully');
  } catch (error) {
    // Log warning but don't crash - indexes may already exist
    console.warn('Index creation warning (non-fatal):', error.message);
  }
}

async function seedDefaultAdmin(database) {
  try {
    const existingAdmin = await database.collection('users').findOne({ 
      employeeId: process.env.DEFAULT_ADMIN_ID || '001' 
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(
        process.env.DEFAULT_ADMIN_PASSWORD || 'changeme123', 
        12
      );

      await database.collection('users').insertOne({
        employeeId: process.env.DEFAULT_ADMIN_ID || '001',
        name: process.env.DEFAULT_ADMIN_NAME || 'Alex Johnson',
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        department: 'Administration',
        jobTitle: 'System Administrator',
        isActive: true,
        tokenVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('Default admin user created successfully');
    }
  } catch (error) {
    console.error('Error seeding default admin:', error);
  }
}
