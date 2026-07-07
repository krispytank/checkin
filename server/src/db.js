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
    await database.collection('stations').createIndex({ name: 1 }, { unique: true });

    // Registries collection indexes
    await database.collection('registries').createIndex({ courtStationId: 1 });
    await database.collection('registries').createIndex({ name: 1, courtStationId: 1 }, { unique: true });

    // Case files collection indexes
    await database.collection('case_files').createIndex({ caseFileNumber: 1 }, { unique: true });
    await database.collection('case_files').createIndex({ registryId: 1 });
    await database.collection('case_files').createIndex({ courtStationId: 1 });
    await database.collection('case_files').createIndex({ currentHolderId: 1 });
    await database.collection('case_files').createIndex({ fileStatus: 1 });
    await database.collection('case_files').createIndex({ caseStatus: 1 });
    await database.collection('case_files').createIndex({ caseFileNumber: 'text', caseTitle: 'text' });

    // File movements collection indexes
    await database.collection('file_movements').createIndex({ caseFileId: 1 });
    await database.collection('file_movements').createIndex({ fromHolderId: 1 });
    await database.collection('file_movements').createIndex({ toHolderId: 1 });
    await database.collection('file_movements').createIndex({ status: 1 });
    await database.collection('file_movements').createIndex({ dateIssued: -1 });
    await database.collection('file_movements').createIndex({ expectedReturnDate: 1 });

    // File requests collection indexes
    await database.collection('file_requests').createIndex({ requesterId: 1 });
    await database.collection('file_requests').createIndex({ caseFileId: 1 });
    await database.collection('file_requests').createIndex({ status: 1 });
    await database.collection('file_requests').createIndex({ createdAt: -1 });

    // Strong room records collection indexes
    await database.collection('strong_room_records').createIndex({ caseFileId: 1 });
    await database.collection('strong_room_records').createIndex({ status: 1 });
    await database.collection('strong_room_records').createIndex({ releaseTime: -1 });

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
    await database.collection('trips').createIndex({ driverId: 1 });
    await database.collection('trips').createIndex({ requestingOfficerId: 1 });
    await database.collection('trips').createIndex({ status: 1 });
    await database.collection('trips').createIndex({ departureDate: 1 });

    // Parking spaces collection indexes
    await database.collection('parking_spaces').createIndex({ stationId: 1 });
    await database.collection('parking_spaces').createIndex({ status: 1 });

    // Parking lots collection indexes
    await database.collection('parking_lots').createIndex({ courtStationId: 1 });
    await database.collection('parking_lots').createIndex({ category: 1 });
    await database.collection('parking_lots').createIndex({ status: 1 });

    // Visitor parking collection indexes
    await database.collection('visitor_parking').createIndex({ courtStationId: 1 });
    await database.collection('visitor_parking').createIndex({ vehicleRegNumber: 1 });
    await database.collection('visitor_parking').createIndex({ status: 1 });
    await database.collection('visitor_parking').createIndex({ timeIn: -1 });

    // Vehicle maintenance collection indexes
    await database.collection('vehicle_maintenance').createIndex({ vehicleId: 1 });
    await database.collection('vehicle_maintenance').createIndex({ status: 1 });
    await database.collection('vehicle_maintenance').createIndex({ scheduledDate: 1 });
    await database.collection('vehicle_maintenance').createIndex({ reminderDate: 1 });

    // Vehicle checkins collection indexes
    await database.collection('vehicle_checkins').createIndex({ vehicleId: 1 });
    await database.collection('vehicle_checkins').createIndex({ stationId: 1 });
    await database.collection('vehicle_checkins').createIndex({ timestamp: -1 });
    await database.collection('vehicle_checkins').createIndex({ type: 1 });
    await database.collection('vehicle_checkins').createIndex({ vehicleId: 1, stationId: 1, type: 1 });

    // Audit logs collection indexes
    await database.collection('audit_logs').createIndex({ timestamp: -1 });
    await database.collection('audit_logs').createIndex({ userId: 1 });
    await database.collection('audit_logs').createIndex({ module: 1 });
    await database.collection('audit_logs').createIndex({ entityType: 1 });
    await database.collection('audit_logs').createIndex({ entityId: 1 });
    await database.collection('audit_logs').createIndex({ stationId: 1 });
    await database.collection('audit_logs').createIndex({ module: 1, action: 1 });

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
    // Stations schema (Court Stations)
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
            address: { bsonType: ['string', 'null'] },
            city: { bsonType: ['string', 'null'] },
            phoneNumber: { bsonType: ['string', 'null'] },
            isActive: { bsonType: 'bool' },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Registries schema
    {
      collection: 'registries',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'courtStationId'],
          properties: {
            name: { bsonType: 'string', description: 'Registry name is required' },
            courtStationId: { bsonType: 'string', description: 'Court station ID is required' },
            description: { bsonType: 'string' },
            isActive: { bsonType: 'bool' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Case Files schema
    {
      collection: 'case_files',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['caseFileNumber', 'caseTitle', 'registryId', 'courtStationId'],
          properties: {
            caseFileNumber: { bsonType: 'string', description: 'Case file number is required' },
            caseTitle: { bsonType: 'string', description: 'Case title is required' },
            caseType: { bsonType: 'string' },
            registryId: { bsonType: 'string', description: 'Registry ID is required' },
            courtStationId: { bsonType: 'string', description: 'Court station ID is required' },
            courtRoom: { bsonType: ['string', 'null'] },
            caseStatus: { bsonType: 'string' },
            fileStatus: { bsonType: 'string' },
            fileCategory: { bsonType: 'string' },
            currentHolderId: { bsonType: ['string', 'null'] },
            currentLocation: { bsonType: 'string' },
            dateOpened: { bsonType: ['date', 'null'] },
            parties: { bsonType: ['string', 'null'] },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
    },
    // File Movements schema
    {
      collection: 'file_movements',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['caseFileId', 'fromHolderId', 'movementType', 'reason'],
          properties: {
            caseFileId: { bsonType: 'string', description: 'Case file ID is required' },
            fromHolderId: { bsonType: 'string', description: 'From holder ID is required' },
            toHolderId: { bsonType: ['string', 'null'] },
            fromRegistryId: { bsonType: ['string', 'null'] },
            toDestination: { bsonType: 'string' },
            movementType: { bsonType: 'string' },
            reason: { bsonType: 'string' },
            dateIssued: { bsonType: 'date' },
            timeIssued: { bsonType: 'date' },
            expectedReturnDate: { bsonType: ['date', 'null'] },
            actualReturnDate: { bsonType: ['date', 'null'] },
            status: { bsonType: 'string' },
            remarks: { bsonType: ['string', 'null'] },
            digitalSignature: { bsonType: ['string', 'null'] },
            acknowledgedBy: { bsonType: ['string', 'null'] },
            acknowledgedAt: { bsonType: ['date', 'null'] },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
    // File Requests schema
    {
      collection: 'file_requests',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['requesterId', 'caseFileId', 'reason', 'purpose'],
          properties: {
            requesterId: { bsonType: 'string', description: 'Requester ID is required' },
            caseFileId: { bsonType: 'string', description: 'Case file ID is required' },
            department: { bsonType: ['string', 'null'] },
            reason: { bsonType: 'string' },
            purpose: { bsonType: 'string' },
            urgency: { bsonType: 'string' },
            supervisorApproval: { bsonType: 'string' },
            approvedBy: { bsonType: ['string', 'null'] },
            approvedAt: { bsonType: ['date', 'null'] },
            status: { bsonType: 'string' },
            rejectionReason: { bsonType: ['string', 'null'] },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Strong Room Records schema
    {
      collection: 'strong_room_records',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['caseFileId', 'releaseTime'],
          properties: {
            caseFileId: { bsonType: 'string' },
            approvingOfficerId: { bsonType: 'string' },
            releasedBy: { bsonType: 'string' },
            receivedBy: { bsonType: ['string', 'null'] },
            releaseTime: { bsonType: 'date' },
            returnTime: { bsonType: ['date', 'null'] },
            reason: { bsonType: 'string' },
            status: { bsonType: 'string' },
            digitalSignature: { bsonType: ['string', 'null'] },
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
            fileApproved: { bsonType: 'bool' },
            fileReleased: { bsonType: 'bool' },
            fileDueToday: { bsonType: 'bool' },
            fileOverdue: { bsonType: 'bool' },
            approvalRequired: { bsonType: 'bool' },
            fileReturned: { bsonType: 'bool' },
            tripApproved: { bsonType: 'bool' },
            maintenanceDue: { bsonType: 'bool' },
            insuranceExpiring: { bsonType: 'bool' },
            inspectionExpiring: { bsonType: 'bool' },
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
    // Vehicles schema
    {
      collection: 'vehicles',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'plateNumber'],
          properties: {
            name: { bsonType: 'string', description: 'Name is required' },
            plateNumber: { bsonType: 'string', description: 'Plate number is required' },
            employeeNo: { bsonType: ['string', 'null'] },
            category: { bsonType: 'string' },
            capacity: { bsonType: 'int' },
            description: { bsonType: 'string' },
            status: { bsonType: 'string' },
            mileage: { bsonType: 'int' },
            make: { bsonType: ['string', 'null'] },
            model: { bsonType: ['string', 'null'] },
            year: { bsonType: ['int', 'null'] },
            fuelType: { bsonType: ['string', 'null'] },
            insuranceExpiry: { bsonType: ['date', 'null'] },
            inspectionExpiry: { bsonType: ['date', 'null'] },
            serviceSchedule: { bsonType: ['date', 'null'] },
            currentMileage: { bsonType: ['int', 'null'] },
            assignedDriverId: { bsonType: ['string', 'null'] },
            assignedParkingLotId: { bsonType: ['string', 'null'] },
            assignedStationId: { bsonType: ['string', 'null'] },
            qrCode: { bsonType: ['string', 'null'] },
            qrGeneratedYear: { bsonType: ['int', 'null'] },
            qrStatus: { bsonType: 'string' },
            deactivatedAt: { bsonType: ['date', 'null'] },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Parking lots schema
    {
      collection: 'parking_lots',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'courtStationId', 'category', 'totalBays'],
          properties: {
            name: { bsonType: 'string', description: 'Parking lot name is required' },
            courtStationId: { bsonType: 'string', description: 'Court station ID is required' },
            category: { bsonType: 'string', description: 'Category is required' },
            totalBays: { bsonType: 'int', minimum: 1 },
            occupiedBays: { bsonType: 'int' },
            reservedBays: { bsonType: 'int' },
            description: { bsonType: ['string', 'null'] },
            gpsLatitude: { bsonType: ['double', 'null'] },
            gpsLongitude: { bsonType: ['double', 'null'] },
            status: { bsonType: 'string' },
            isActive: { bsonType: 'bool' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Visitor parking schema
    {
      collection: 'visitor_parking',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['vehicleRegNumber', 'ownerName', 'category', 'courtStationId', 'timeIn'],
          properties: {
            vehicleRegNumber: { bsonType: 'string' },
            ownerName: { bsonType: 'string' },
            category: { bsonType: 'string' },
            purposeOfVisit: { bsonType: 'string' },
            courtStationId: { bsonType: 'string' },
            courtBeingVisited: { bsonType: ['string', 'null'] },
            parkingSpaceId: { bsonType: ['string', 'null'] },
            parkingLotId: { bsonType: ['string', 'null'] },
            timeIn: { bsonType: 'date' },
            timeOut: { bsonType: ['date', 'null'] },
            status: { bsonType: 'string' },
            createdAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Vehicle maintenance schema
    {
      collection: 'vehicle_maintenance',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['vehicleId', 'type', 'status'],
          properties: {
            vehicleId: { bsonType: 'string' },
            type: { bsonType: 'string' },
            description: { bsonType: 'string' },
            scheduledDate: { bsonType: ['date', 'null'] },
            completedDate: { bsonType: ['date', 'null'] },
            cost: { bsonType: ['double', 'null'] },
            provider: { bsonType: ['string', 'null'] },
            status: { bsonType: 'string' },
            reminderDate: { bsonType: ['date', 'null'] },
            notes: { bsonType: ['string', 'null'] },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
    },
    // Vehicle checkins schema
    {
      collection: 'vehicle_checkins',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['vehicleId', 'plateNumber', 'type', 'timestamp'],
          properties: {
            vehicleId: { bsonType: 'string', description: 'Vehicle ID is required' },
            plateNumber: { bsonType: 'string', description: 'Plate number is required' },
            stationId: { bsonType: ['string', 'null'] },
            parkingSpaceId: { bsonType: ['string', 'null'] },
            type: { enum: ['check-in', 'check-out'], description: 'Must be check-in or check-out' },
            scannedBy: { bsonType: ['string', 'null'] },
            notes: { bsonType: ['string', 'null'] },
            timestamp: { bsonType: 'date' },
          },
        },
      },
    },
    // Audit logs schema
    {
      collection: 'audit_logs',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'action', 'module', 'entityType', 'timestamp'],
          properties: {
            userId: { bsonType: 'string', description: 'User ID is required' },
            action: { bsonType: 'string', description: 'Action is required' },
            module: { bsonType: 'string', description: 'Module is required' },
            entityType: { bsonType: 'string', description: 'Entity type is required' },
            entityId: { bsonType: ['string', 'null'] },
            previousValue: { bsonType: ['object', 'null'] },
            newValue: { bsonType: ['object', 'null'] },
            stationId: { bsonType: ['string', 'null'] },
            ipAddress: { bsonType: ['string', 'null'] },
            description: { bsonType: ['string', 'null'] },
            timestamp: { bsonType: 'date' },
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
