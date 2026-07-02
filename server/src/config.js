// AttendTrack Server Configuration
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

  // User Roles
  userRoles: {
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
    USER: 'user',
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
  messageTypes: config.messageTypes,
  daysOfWeek: config.daysOfWeek,
  validation: config.validation,
};

export default config;
