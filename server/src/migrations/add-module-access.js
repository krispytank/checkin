/**
 * Migration script to add moduleAccess to existing users
 * Run this once to migrate existing users to the new module-based access system
 * 
 * Usage: node server/src/migrations/add-module-access.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'attendtrack';

// Default permissions by module and role
const defaultModulePermissions = {
  attendance: {
    admin: ['*'],
    supervisor: ['check_in_out', 'view_own_records', 'view_team_records', 'manage_shifts', 'view_reports', 'send_messages'],
    user: ['check_in_out', 'view_own_records', 'send_messages'],
  },
  equipment: {
    admin: ['*'],
    booker: ['book_equipment', 'view_own_bookings'],
    user: [],
  },
  fleet: {
    admin: ['*'],
    manager: ['book_vehicle', 'view_own_trips', 'view_all_trips', 'manage_all_trips', 'approve_trips'],
    driver: ['view_own_trips'],
    user: ['book_vehicle', 'view_own_trips'],
  },
};

async function migrate() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    
    // Get all users without moduleAccess
    const users = await usersCollection.find({
      $or: [
        { moduleAccess: { $exists: false } },
        { moduleAccess: null },
      ]
    }).toArray();
    
    console.log(`Found ${users.length} users to migrate`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const user of users) {
      // Determine attendance role based on base role
      let attendanceRole = 'user';
      if (user.role === 'admin') {
        attendanceRole = 'admin';
      } else if (user.role === 'supervisor') {
        attendanceRole = 'supervisor';
      }
      
      const moduleAccess = {
        attendance: {
          enabled: true,
          role: attendanceRole,
          permissions: defaultModulePermissions.attendance[attendanceRole] || [],
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
      };
      
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { moduleAccess, updatedAt: new Date() } }
      );
      
      migrated++;
      console.log(`Migrated user: ${user.name} (${user.email}) - Attendance role: ${attendanceRole}`);
    }
    
    console.log(`\nMigration complete: ${migrated} users migrated, ${skipped} skipped`);
    
    // Create indexes for moduleAccess queries
    await usersCollection.createIndex({ 'moduleAccess.attendance.role': 1 });
    await usersCollection.createIndex({ 'moduleAccess.equipment.role': 1 });
    await usersCollection.createIndex({ 'moduleAccess.fleet.role': 1 });
    console.log('Created indexes for moduleAccess queries');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
migrate();
