import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { validatePagination, hasRequiredLocationFields } from '../middleware/validation.js';
import { 
  validateGeoFence, 
  calculateAttendanceStatus, 
  calculateHoursWorked 
} from '../utils/geo.js';
import { sendSystemNotification } from './notifications.js';
import config from '../config.js';

const router = Router();

// Helper: get local date string (YYYY-MM-DD) instead of UTC
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/records
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { userId, startDate, endDate, status, page = 1, limit = 10 } = req.query;
    const db = getDB();

    // Build filter
    const filter = {};
    
    // Non-admins can only see their own records
    if (req.user.role === 'user') {
      filter.userId = req.user._id.toString();
    } else if (userId) {
      filter.userId = userId;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    if (status) filter.status = status;

    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const [records, total] = await Promise.all([
      db.collection('records')
        .find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection('records').countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/records/today
router.get('/today', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const today = getLocalDateString();

    const record = await db.collection('records').findOne({
      userId: req.user._id.toString(),
      date: today,
    });

    res.json({ success: true, data: record || null });
  } catch (error) {
    next(error);
  }
});

// POST /api/records/check-in
router.post('/check-in', authenticate, async (req, res, next) => {
  try {
    const { location } = req.body;
    const db = getDB();
    const today = getLocalDateString();

    // Validate location
    if (!hasRequiredLocationFields(location)) {
      return res.status(400).json({ 
        success: false, 
        message: 'GPS location is required' 
      });
    }

    // Get user's assigned station
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(req.user._id) 
    });

    if (!user || !user.stationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No station assigned to you' 
      });
    }

    // Get station details
    const station = await db.collection('stations').findOne({ 
      _id: new ObjectId(user.stationId) 
    });

    if (!station) {
      return res.status(400).json({ 
        success: false, 
        message: 'Assigned station not found' 
      });
    }

    // Validate geo-fence
    const geoResult = validateGeoFence(location, station, config.maxAccuracyMeters);
    
    if (!geoResult.allowed) {
      let message = 'Check-in failed: ';
      if (!geoResult.isWithinRadius) {
        message += `You are ${geoResult.distance}m from ${station.name} (max: ${geoResult.stationRadius}m). `;
      }
      if (!geoResult.isAccuracyGood) {
        message += `GPS accuracy is ${geoResult.accuracy}m (max: 50m). Please wait for better signal.`;
      }
      return res.status(400).json({ success: false, message });
    }

    // Check if already checked in today
    const existingRecord = await db.collection('records').findOne({
      userId: req.user._id.toString(),
      date: today,
    });

    if (existingRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Already checked in today' 
      });
    }

    // Create check-in event
    const checkInEvent = {
      type: 'check-in',
      timestamp: new Date(),
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address: location.address || null,
      },
    };

    // Get user's shift to determine status
    const shiftAssignment = await db.collection('shift_assignments').findOne({
      userId: req.user._id.toString(),
    });

    let shift = null;
    if (shiftAssignment) {
      shift = await db.collection('shifts').findOne({
        _id: new ObjectId(shiftAssignment.shiftId),
      });
    }

    const workStartTime = shift?.startTime || config.workStartTime;
    const isLate = checkInEvent.timestamp.toTimeString().slice(0, 5) > workStartTime;

    // Create attendance record
    const newRecord = {
      userId: req.user._id.toString(),
      date: today,
      events: [checkInEvent],
      status: isLate ? 'late' : 'present',
      totalHours: 0,
      checkInTime: checkInEvent.timestamp,
      checkOutTime: null,
      createdAt: new Date(),
    };
    
    const result = await db.collection('records').insertOne(newRecord);
    const record = { ...newRecord, _id: result.insertedId };

    // Generate system alert if late
    if (isLate) {
      await sendSystemNotification(
        db,
        req.user._id.toString(),
        'lateCheckIn',
        'Late Check-in Alert',
        `You checked in at ${checkInEvent.timestamp.toTimeString().slice(0, 5)}, which is after the scheduled start time of ${workStartTime}.`
      );
    }

    // Check for shift reminder: if user has no check-in yet and shift started
    // This runs on check-in but won't send if already checked in (early return above)

    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

// POST /api/records/check-out
router.post('/check-out', authenticate, async (req, res, next) => {
  try {
    const { location } = req.body;
    const db = getDB();
    const today = getLocalDateString();

    // Validate location
    if (!hasRequiredLocationFields(location)) {
      return res.status(400).json({ 
        success: false, 
        message: 'GPS location is required' 
      });
    }

    // Get user's assigned station
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(req.user._id) 
    });

    if (!user || !user.stationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No station assigned to you' 
      });
    }

    // Get station details
    const station = await db.collection('stations').findOne({ 
      _id: new ObjectId(user.stationId) 
    });

    if (!station) {
      return res.status(400).json({ 
        success: false, 
        message: 'Assigned station not found' 
      });
    }

    // Validate geo-fence
    const geoResult = validateGeoFence(location, station, config.maxAccuracyMeters);
    
    if (!geoResult.allowed) {
      let message = 'Check-out failed: ';
      if (!geoResult.isWithinRadius) {
        message += `You are ${geoResult.distance}m from ${station.name} (max: ${geoResult.stationRadius}m). `;
      }
      if (!geoResult.isAccuracyGood) {
        message += `GPS accuracy is ${geoResult.accuracy}m (max: 50m). Please wait for better signal.`;
      }
      return res.status(400).json({ success: false, message });
    }

    // Get today's record
    const existingRecord = await db.collection('records').findOne({
      userId: req.user._id.toString(),
      date: today,
    });

    if (!existingRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'No check-in record found for today' 
      });
    }

    // Check if already checked out
    if (existingRecord.checkOutTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Already checked out today' 
      });
    }

    // Create check-out event
    const checkOutEvent = {
      type: 'check-out',
      timestamp: new Date(),
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address: location.address || null,
      },
    };

    // Calculate total hours
    const totalHours = calculateHoursWorked(
      existingRecord.checkInTime,
      checkOutEvent.timestamp
    );

    // Get user's shift to determine correct status
    const shiftAssignment = await db.collection('shift_assignments').findOne({
      userId: req.user._id.toString(),
    });
    let shift = null;
    if (shiftAssignment) {
      shift = await db.collection('shifts').findOne({
        _id: new ObjectId(shiftAssignment.shiftId),
      });
    }
    const workStartTime = shift?.startTime || config.workStartTime;
    const workEndTime = shift?.endTime || config.workEndTime;

    // Calculate final status using the user's actual shift times
    const finalStatus = calculateAttendanceStatus(
      existingRecord.checkInTime,
      checkOutEvent.timestamp,
      workStartTime,
      workEndTime
    );

    // Update record
    await db.collection('records').updateOne(
      { _id: existingRecord._id },
      { 
        $push: { events: checkOutEvent },
        $set: { 
          checkOutTime: checkOutEvent.timestamp,
          totalHours,
          status: finalStatus,
        }
      }
    );

    const updatedRecord = await db.collection('records').findOne({ 
      _id: existingRecord._id 
    });

    // Generate system alerts for check-out
    const checkOutTime = checkOutEvent.timestamp.toTimeString().slice(0, 5);
    
    // Late check-out (after shift end time)
    if (checkOutTime > workEndTime) {
      await sendSystemNotification(
        db,
        req.user._id.toString(),
        'lateCheckOut',
        'Late Check-out Alert',
        `You checked out at ${checkOutTime}, which is after your scheduled end time of ${workEndTime}.`
      );
    }

    // Overtime (worked more than 8 hours)
    if (totalHours > 8) {
      await sendSystemNotification(
        db,
        req.user._id.toString(),
        'overtime',
        'Overtime Alert',
        `You worked ${totalHours.toFixed(1)} hours today, which exceeds the standard 8-hour work day.`
      );
    }

    res.json({ success: true, data: updatedRecord });
  } catch (error) {
    next(error);
  }
});

// GET /api/records/summary/weekly
router.get('/summary/weekly', authenticate, async (req, res, next) => {
  try {
    const { userId, startDate } = req.query;
    const db = getDB();

    // Calculate week range
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // End of week (Saturday)

    const filter = {
      date: {
        $gte: getLocalDateString(start),
        $lte: getLocalDateString(end),
      },
    };

    // Non-admins can only see their own summary
    if (req.user.role === 'user') {
      filter.userId = req.user._id.toString();
    } else if (userId) {
      filter.userId = userId;
    }

    const records = await db.collection('records').find(filter).toArray();

    // Calculate summary
    const summary = {
      startDate: getLocalDateString(start),
      endDate: getLocalDateString(end),
      totalDays: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      halfDay: records.filter(r => r.status === 'half-day').length,
      overtime: records.filter(r => r.status === 'overtime').length,
      totalHours: records.reduce((sum, r) => sum + (r.totalHours || 0), 0),
      averageCheckIn: records.length > 0 
        ? records.reduce((sum, r) => {
            const checkIn = r.checkInTime ? new Date(r.checkInTime) : null;
            return sum + (checkIn ? checkIn.getHours() * 60 + checkIn.getMinutes() : 0);
          }, 0) / records.length
        : 0,
    };

    // Convert average check-in to HH:MM
    const avgMinutes = Math.round(summary.averageCheckIn);
    summary.averageCheckIn = `${Math.floor(avgMinutes / 60).toString().padStart(2, '0')}:${(avgMinutes % 60).toString().padStart(2, '0')}`;

    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

// GET /api/records/analytics — all records in range + user/shift info for charts
router.get('/analytics', authenticate, async (req, res, next) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const db = getDB();

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    // Build date filter
    const dateFilter = { $gte: startDate, $lte: endDate };

    // Build user filter
    const userFilter = {};
    if (req.user.role === 'user') {
      userFilter._id = req.user._id;
    } else if (userId) {
      try { userFilter._id = new ObjectId(userId); } catch (e) { /* ignore */ }
    }

    // Fetch users
    const usersList = await db.collection('users')
      .find(userFilter)
      .project({ password: 0 })
      .toArray();

    const userIds = usersList.map(u => u._id.toString());

    // Fetch all records in range (no pagination) — only actual data
    const records = await db.collection('records')
      .find({
        userId: { $in: userIds },
        date: dateFilter,
      })
      .sort({ date: 1 })
      .toArray();

    // Build lookup map
    const userMap = {};
    usersList.forEach(u => { userMap[u._id.toString()] = u; });

    // Per-user analytics — based ONLY on actual records
    const userAnalytics = usersList.map(user => {
      const uid = user._id.toString();
      const userRecords = records.filter(r => r.userId === uid);

      const present = userRecords.filter(r => r.status === 'present').length;
      const late = userRecords.filter(r => r.status === 'late').length;
      const halfDay = userRecords.filter(r => r.status === 'half-day').length;
      const overtime = userRecords.filter(r => r.status === 'overtime').length;
      const totalLogged = present + late + halfDay + overtime;

      const totalHours = userRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
      const avgHours = totalLogged > 0 ? totalHours / totalLogged : 0;
      const punctualityRate = totalLogged > 0
        ? (present / totalLogged * 100)
        : 0;

      return {
        userId: uid,
        name: user.name || 'Unknown',
        department: user.department || '',
        totalLogged,
        present,
        late,
        halfDay,
        overtime,
        totalHours: Math.round(totalHours * 100) / 100,
        avgHours: Math.round(avgHours * 100) / 100,
        punctualityRate: Math.round(punctualityRate * 10) / 10,
      };
    }).filter(u => u.totalLogged > 0); // only users with actual records

    // Daily trend — only dates that have at least one record
    const datesWithRecords = [...new Set(records.map(r => r.date))].sort();
    const dailyTrend = datesWithRecords.map(date => {
      const dayRecords = records.filter(r => r.date === date);
      const dayOfWeek = new Date(date).getDay();

      return {
        date,
        day: config.daysOfWeek[dayOfWeek]?.slice(0, 3) || '',
        present: dayRecords.filter(r => r.status === 'present').length,
        late: dayRecords.filter(r => r.status === 'late').length,
        overtime: dayRecords.filter(r => r.status === 'overtime').length,
        halfDay: dayRecords.filter(r => r.status === 'half-day').length,
      };
    });

    // Overall stats — actual records only
    const totalPresent = records.filter(r => r.status === 'present').length;
    const totalLate = records.filter(r => r.status === 'late').length;
    const totalOvertime = records.filter(r => r.status === 'overtime').length;
    const totalHalfDay = records.filter(r => r.status === 'half-day').length;
    const totalHoursAll = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);

    res.json({
      success: true,
      data: {
        userAnalytics,
        dailyTrend,
        summary: {
          totalUsers: usersList.length,
          totalRecords: records.length,
          totalPresent,
          totalLate,
          totalOvertime,
          totalHalfDay,
          totalHours: Math.round(totalHoursAll * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
