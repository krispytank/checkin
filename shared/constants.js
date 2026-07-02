// AttendTrack Shared Constants

// Standard Work Hours
export const STANDARD_WORK_HOURS = 8;
export const WORK_START_TIME = '08:00';
export const WORK_END_TIME = '17:00';

// GPS & Geo-fencing
export const MAX_ACCURACY_METERS = 50;
export const GPS_TIMEOUT_MS = 15000;
export const GPS_HIGH_ACCURACY = true;

// Polling & Intervals
export const POLLING_INTERVAL_MS = 30000; // 30 seconds
export const TIMER_INTERVAL_MS = 1000; // 1 second

// Attendance Statuses
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  HALF_DAY: 'half-day',
  OVERTIME: 'overtime'
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  USER: 'user'
};

// Message Types
export const MESSAGE_TYPES = {
  ALERT: 'alert',
  MESSAGE: 'message',
  NOTIFICATION: 'notification'
};

// Days of Week
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

// Validation Rules
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 255,
  MIN_STATION_RADIUS: 10,
  MAX_STATION_RADIUS: 1000
};

// API Response Messages
export const API_MESSAGES = {
  SUCCESS: 'Operation successful',
  ERROR: 'An error occurred',
  UNAUTHORIZED: 'Unauthorized access',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  DUPLICATE_ENTRY: 'Entry already exists'
};
