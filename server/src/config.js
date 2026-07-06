// Mahakama Access Server Configuration
// Single source of truth for all app constants

const config = {
  // Standard Work Hours
  standardWorkHours: 8,
  workStartTime: '08:00',
  workEndTime: '17:00',

  // GPS & Geo-fencing
  maxAccuracyMeters: 50,
  gpsTimeoutMs: 15000,
  gpsHighAccuracy: true,

  // Polling & Intervals
  pollingIntervalMs: 30000,
  timerIntervalMs: 1000,

  // Attendance Statuses
  attendanceStatus: {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    HALF_DAY: 'half-day',
    OVERTIME: 'overtime',
  },

  // User Roles (base roles for backward compatibility)
  userRoles: {
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
    USER: 'user',
  },

  // Module Definitions
  modules: {
    ATTENDANCE: 'attendance',
    EQUIPMENT: 'equipment',
    FLEET: 'fleet',
  },

  // Module-Specific Roles
  moduleRoles: {
    attendance: ['admin', 'supervisor', 'user'],
    equipment: ['admin', 'booker', 'user'],
    fleet: ['admin', 'manager', 'driver', 'user'],
  },

  // Module-Specific Permissions
  modulePermissions: {
    attendance: [
      'check_in_out',
      'view_own_records',
      'view_team_records',
      'manage_shifts',
      'manage_stations',
      'manage_departments',
      'manage_job_titles',
      'view_reports',
      'send_messages',
      'manage_users',
    ],
    equipment: [
      'book_equipment',
      'view_own_bookings',
      'view_all_bookings',
      'manage_all_bookings',
      'approve_bookings',
      'manage_equipment',
      'manage_bookers',
    ],
    fleet: [
      'book_vehicle',
      'view_own_trips',
      'view_all_trips',
      'manage_all_trips',
      'approve_trips',
      'manage_vehicles',
      'manage_drivers',
      'manage_parking',
      'scan_vehicle',
      'export_qr',
    ],
  },

  // Default Permissions by Module Role
  defaultModulePermissions: {
    attendance: {
      admin: ['*'],  // All permissions
      supervisor: [
        'check_in_out', 'view_own_records', 'view_team_records',
        'manage_shifts', 'view_reports', 'send_messages',
      ],
      user: ['check_in_out', 'view_own_records', 'send_messages'],
    },
    equipment: {
      admin: ['*'],
      booker: ['book_equipment', 'view_own_bookings'],
      user: [],
    },
    fleet: {
      admin: ['*'],
      manager: [
        'book_vehicle', 'view_own_trips', 'view_all_trips',
        'manage_all_trips', 'approve_trips', 'scan_vehicle', 'export_qr',
      ],
      driver: ['view_own_trips', 'scan_vehicle'],
      user: ['book_vehicle', 'view_own_trips'],
    },
  },

  // Message Types
  messageTypes: {
    ALERT: 'alert',
    MESSAGE: 'message',
    NOTIFICATION: 'notification',
  },

  // Days of Week
  daysOfWeek: [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday',
  ],

  // Validation Rules
  validation: {
    minPasswordLength: 8,
    maxNameLength: 100,
    maxEmailLength: 255,
    minStationRadius: 10,
    maxStationRadius: 1000,
  },
};

// Public config (safe to send to client, no secrets)
export const publicConfig = {
  standardWorkHours: config.standardWorkHours,
  workStartTime: config.workStartTime,
  workEndTime: config.workEndTime,
  maxAccuracyMeters: config.maxAccuracyMeters,
  gpsTimeoutMs: config.gpsTimeoutMs,
  gpsHighAccuracy: config.gpsHighAccuracy,
  pollingIntervalMs: config.pollingIntervalMs,
  timerIntervalMs: config.timerIntervalMs,
  attendanceStatus: config.attendanceStatus,
  userRoles: config.userRoles,
  modules: config.modules,
  moduleRoles: config.moduleRoles,
  modulePermissions: config.modulePermissions,
  messageTypes: config.messageTypes,
  daysOfWeek: config.daysOfWeek,
  validation: config.validation,
};

export default config;
