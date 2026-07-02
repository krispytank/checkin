import { describe, it, expect } from 'vitest';
import { haversineDistance, calculateAttendanceStatus, formatDuration } from '../geo.js';

describe('Geo Utilities', () => {
  describe('haversineDistance', () => {
    it('should calculate distance between two points', () => {
      // New York to Los Angeles (approximately 3,944 km)
      const distance = haversineDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(3900000); // > 3900 km
      expect(distance).toBeLessThan(4000000); // < 4000 km
    });

    it('should return 0 for same point', () => {
      const distance = haversineDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBe(0);
    });

    it('should calculate short distance correctly', () => {
      // Two points about 1 km apart
      const distance = haversineDistance(40.7128, -74.0060, 40.7138, -74.0060);
      expect(distance).toBeGreaterThan(80); // > 80 meters
      expect(distance).toBeLessThan(150); // < 150 meters
    });
  });

  describe('calculateAttendanceStatus', () => {
    it('should return absent if no check-in time', () => {
      const status = calculateAttendanceStatus(null);
      expect(status).toBe('absent');
    });

    it('should return present for on-time check-in', () => {
      const checkIn = new Date('2024-01-15T07:55:00');
      const status = calculateAttendanceStatus(checkIn);
      expect(status).toBe('present');
    });

    it('should return late for late check-in', () => {
      const checkIn = new Date('2024-01-15T08:20:00');
      const status = calculateAttendanceStatus(checkIn);
      expect(status).toBe('late');
    });

    it('should return overtime for more than 8 hours', () => {
      const checkIn = new Date('2024-01-15T08:00:00');
      const checkOut = new Date('2024-01-15T17:00:00');
      const status = calculateAttendanceStatus(checkIn, checkOut);
      expect(status).toBe('overtime');
    });

    it('should return half-day for less than 4 hours', () => {
      const checkIn = new Date('2024-01-15T08:00:00');
      const checkOut = new Date('2024-01-15T11:00:00');
      const status = calculateAttendanceStatus(checkIn, checkOut);
      expect(status).toBe('half-day');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds to HH:MM:SS', () => {
      expect(formatDuration(0)).toBe('00:00:00');
      expect(formatDuration(1000)).toBe('00:00:01');
      expect(formatDuration(60000)).toBe('00:01:00');
      expect(formatDuration(3600000)).toBe('01:00:00');
      expect(formatDuration(3661000)).toBe('01:01:01');
    });

    it('should handle large durations', () => {
      expect(formatDuration(86400000)).toBe('24:00:00');
      expect(formatDuration(90061000)).toBe('25:01:01');
    });
  });
});
