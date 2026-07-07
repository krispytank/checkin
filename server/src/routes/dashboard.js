import { Router } from 'express';
import { getDB } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/dashboard/unified - Cross-module summary
router.get('/unified', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Attendance summary
    const todayRecords = await db.collection('attendance_records').find({
      date: { $gte: today },
    }).toArray();

    const attendanceSummary = {
      totalCheckIns: todayRecords.length,
      currentlyInOffice: todayRecords.filter(r => r.checkIn && !r.checkOut).length,
      lateCheckIns: todayRecords.filter(r => r.isLateCheckIn).length,
      overtime: todayRecords.filter(r => r.overtimeMinutes > 0).length,
    };

    // Fleet summary
    const totalVehicles = await db.collection('vehicles').countDocuments();
    const activeTrips = await db.collection('trips').countDocuments({
      status: { $in: ['in_progress', 'vehicle_assigned'] },
    });
    const pendingApprovals = await db.collection('trips').countDocuments({
      status: { $in: ['requested', 'supervisor_approved', 'fleet_approved'] },
    });
    const maintenanceDue = await db.collection('vehicle_maintenance').countDocuments({
      status: 'scheduled',
      scheduledDate: { $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    });

    const fleetSummary = {
      totalVehicles,
      activeTrips,
      pendingApprovals,
      maintenanceDue,
    };

    // File movement summary
    const totalFiles = await db.collection('case_files').countDocuments();
    const filesIssued = await db.collection('case_files').countDocuments({
      status: 'issued',
    });
    const pendingFileRequests = await db.collection('file_requests').countDocuments({
      status: 'pending',
    });
    const overdueFiles = await db.collection('case_files').countDocuments({
      status: 'issued',
      expectedReturnDate: { $lt: now },
    });
    const filesInStrongRoom = await db.collection('case_files').countDocuments({
      status: 'in_strong_room',
    });

    const fileMovementSummary = {
      totalFiles,
      filesIssued,
      pendingFileRequests,
      overdueFiles,
      filesInStrongRoom,
    };

    // Pending actions
    const pendingActions = [];

    // Collect pending approvals from all modules
    if (pendingApprovals > 0) {
      pendingActions.push({
        module: 'fleet',
        type: 'trip_approval',
        count: pendingApprovals,
        label: 'Trip approvals pending',
        href: '/fleet/trips',
      });
    }

    if (pendingFileRequests > 0) {
      pendingActions.push({
        module: 'fileMovement',
        type: 'file_request',
        count: pendingFileRequests,
        label: 'File requests pending',
        href: '/file-movement/requests',
      });
    }

    if (maintenanceDue > 0) {
      pendingActions.push({
        module: 'fleet',
        type: 'maintenance',
        count: maintenanceDue,
        label: 'Maintenance due soon',
        href: '/fleet/vehicles',
      });
    }

    if (overdueFiles > 0) {
      pendingActions.push({
        module: 'fileMovement',
        type: 'overdue',
        count: overdueFiles,
        label: 'Overdue files',
        href: '/file-movement/case-files',
      });
    }

    // Recent activity across modules
    const recentTrips = await db.collection('trips')
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const recentFiles = await db.collection('case_files')
      .find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray();

    const recentAttendance = await db.collection('attendance_records')
      .find({ date: { $gte: today } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Alerts
    const alerts = [];

    // Vehicles needing attention
    const vehiclesNeedingService = await db.collection('vehicles').countDocuments({
      $or: [
        { insuranceExpiry: { $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } },
        { inspectionExpiry: { $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } },
      ],
    });

    if (vehiclesNeedingService > 0) {
      alerts.push({
        type: 'warning',
        module: 'fleet',
        message: `${vehiclesNeedingService} vehicle(s) need attention (insurance/inspection expiring)`,
      });
    }

    // Strong room records needing attention
    const strongRoomAttention = await db.collection('strong_room_records').countDocuments({
      approvalStatus: { $in: ['pending', 'supervisor_approved'] },
    });

    if (strongRoomAttention > 0) {
      alerts.push({
        type: 'info',
        module: 'fileMovement',
        message: `${strongRoomAttention} strong room record(s) awaiting approval`,
      });
    }

    res.json({
      success: true,
      data: {
        attendance: attendanceSummary,
        fleet: fleetSummary,
        fileMovement: fileMovementSummary,
        pendingActions,
        recentActivity: {
          trips: recentTrips,
          files: recentFiles,
          attendance: recentAttendance,
        },
        alerts,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
