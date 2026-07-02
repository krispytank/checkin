import config from '../config.js';

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  
  const a = 
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Validate if a GPS location is within a geo-fence
 * @param {Object} userLocation - User's GPS location
 * @param {Object} station - Station with coordinates and radius
 * @param {number} maxAccuracy - Maximum allowed GPS accuracy in meters
 * @returns {Object} Validation result
 */
export function validateGeoFence(userLocation, station, maxAccuracy = 50) {
  const { latitude: userLat, longitude: userLon, accuracy } = userLocation;
  const { latitude: stationLat, longitude: stationLon, radiusMeters } = station;
  
  const distance = haversineDistance(userLat, userLon, stationLat, stationLon);
  
  const isWithinRadius = distance <= radiusMeters;
  const isAccuracyGood = accuracy <= maxAccuracy;
  
  return {
    allowed: isWithinRadius && isAccuracyGood,
    distance: Math.round(distance),
    isWithinRadius,
    isAccuracyGood,
    accuracy: Math.round(accuracy),
    stationRadius: radiusMeters,
  };
}

/**
 * Calculate attendance status based on check-in time
 * @param {Date} checkInTime - Time of check-in
 * @param {Date} checkOutTime - Time of check-out (optional)
 * @param {string} workStartTime - Expected start time (HH:MM)
 * @param {string} workEndTime - Expected end time (HH:MM)
 * @returns {string} Attendance status
 */
export function calculateAttendanceStatus(
  checkInTime,
  checkOutTime = null,
  workStartTime = config.workStartTime,
  workEndTime = config.workEndTime
) {
  if (!checkInTime) return 'absent';
  
  const checkIn = new Date(checkInTime);
  const [startHour, startMinute] = workStartTime.split(':').map(Number);
  const [endHour, endMinute] = workEndTime.split(':').map(Number);
  
  const expectedStart = new Date(checkIn);
  expectedStart.setHours(startHour, startMinute, 0, 0);
  
  const expectedEnd = new Date(checkIn);
  expectedEnd.setHours(endHour, endMinute, 0, 0);
  
  // Check if late (any minute past the start time)
  const isLate = checkIn > expectedStart;
  
  if (!checkOutTime) {
    return isLate ? 'late' : 'present';
  }
  
  const checkOut = new Date(checkOutTime);
  const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);
  
  // Check for overtime (more than 8 hours)
  if (hoursWorked > 8) {
    return 'overtime';
  }
  
  // Check for half-day (less than 4 hours)
  if (hoursWorked < 4) {
    return 'half-day';
  }
  
  return isLate ? 'late' : 'present';
}

/**
 * Calculate hours worked between check-in and check-out
 * @param {Date} checkInTime - Check-in time
 * @param {Date} checkOutTime - Check-out time
 * @returns {number} Hours worked
 */
export function calculateHoursWorked(checkInTime, checkOutTime) {
  if (!checkInTime || !checkOutTime) return 0;
  
  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);
  
  const diffMs = checkOut - checkIn;
  const hours = diffMs / (1000 * 60 * 60);
  
  return Math.round(hours * 100) / 100; // Round to 2 decimal places
}

/**
 * Format duration from milliseconds to HH:MM:SS
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
}

/**
 * Get current time in HH:MM format
 * @returns {string} Current time
 */
export function getCurrentTime() {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

/**
 * Check if current time is within work hours
 * @param {string} workStartTime - Work start time (HH:MM)
 * @param {string} workEndTime - Work end time (HH:MM)
 * @returns {boolean}
 */
export function isWithinWorkHours(workStartTime = config.workStartTime, workEndTime = config.workEndTime) {
  const currentTime = getCurrentTime();
  return currentTime >= workStartTime && currentTime <= workEndTime;
}
