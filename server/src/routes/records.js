import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { validatePagination } from '../middleware/validation.js';
import { 
  validateGeoFence, 
  calculateAttendanceStatus, 
  calculateHoursWorked 
} from '../utils/geo.js';

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
    if (!location || !location.latitude || !location.longitude || !location.accuracy) {
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
    const geoResult = validateGeoFence(location, station, 50);
    
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
      // Check if already checked in
      const lastEvent = existingRecord.events[existingRecord.events.length - 1];
      if (lastEvent && lastEvent.type === 'check-in') {
        return res.status(400).json({ 
          success: false, 
          message: 'Already checked in today' 
        });
      }
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

    const workStartTime = shift?.startTime || '08:00';
    const isLate = checkInEvent.timestamp.toTimeString().slice(0, 5) > workStartTime;

    // Create or update attendance record
    let record;
    if (existingRecord) {
      await db.collection('records').updateOne(
        { _id: existingRecord._id },
        { 
          $push: { events: checkInEvent },
          $set: { 
            status: isLate ? 'late' : 'present',
            checkInTime: checkInEvent.timestamp,
          }
        }
      );
      record = await db.collection('records').findOne({ _id: existingRecord._id });
    } else {
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
      record = { ...newRecord, _id: result.insertedId };
    }

    // Generate system alert if late
    if (isLate) {
      await db.collection('messages').insertOne({
        senderId: 'system',
        receiverId: req.user._id.toString(),
        type: 'alert',
        subject: 'Late Check-in Alert',
        content: `You checked in at ${checkInEvent.timestamp.toTimeString().slice(0, 5)}, which is after the scheduled start time of ${workStartTime}.`,
        read: false,
        createdAt: new Date(),
      });
    }

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
    if (!location || !location.latitude || !location.longitude || !location.accuracy) {
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
    const geoResult = validateGeoFence(location, station, 50);
    
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
    const lastEvent = existingRecord.events[existingRecord.events.length - 1];
    if (lastEvent && lastEvent.type === 'check-out') {
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
    const workStartTime = shift?.startTime || '08:00';
    const workEndTime = shift?.endTime || '17:00';

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

export default router;
