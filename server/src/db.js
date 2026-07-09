import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import schemas from './schemas/index.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFile = process.env.NODE_ENV === 'production' ? '../.env.production' : '../.env';
dotenv.config({ path: new URL(envFile, import.meta.url).pathname });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

let db = null;
let client = null;

export async function connectDB() {
  try {
    if (db) return db;

    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
    });
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
    for (const { collection, indexes } of schemas) {
      if (!indexes || indexes.length === 0) continue;
      for (const { key, options } of indexes) {
        await database.collection(collection).createIndex(key, options || {});
      }
    }
    console.log('Database indexes created successfully');
  } catch (error) {
    console.warn('Index creation warning (non-fatal):', error.message);
  }
}

async function createSchemas(database) {
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
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const existingAdmin = await database.collection('users').findOne({ email: adminEmail });

    if (!existingAdmin) {
      await database.collection('users').insertOne({
        employeeId: process.env.DEFAULT_ADMIN_ID,
        name: process.env.DEFAULT_ADMIN_NAME,
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
          fileMovement: { enabled: true, role: 'admin', permissions: [] },
          audit: { enabled: true, role: 'admin', permissions: [] },
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
              fileMovement: { enabled: true, role: 'admin', permissions: [] },
              audit: { enabled: true, role: 'admin', permissions: [] },
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
