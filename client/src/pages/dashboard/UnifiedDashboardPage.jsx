import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { api } from '../../lib/api.js';
import {
  Clock, Car, FolderOpen, AlertTriangle, CheckCircle,
  ArrowRight, FileText, Wrench, MapPin, Loader2, Activity,
  Users, Shield, AlertCircle, ChevronRight, Building2
} from 'lucide-react';
import { Link } from 'wouter';

const statusColors = {
  requested: 'bg-yellow-100 text-yellow-800',
  supervisor_approved: 'bg-blue-100 text-blue-800',
  vehicle_assigned: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  in_strong_room: 'bg-purple-100 text-purple-800',
  issued: 'bg-blue-100 text-blue-800',
  returned: 'bg-green-100 text-green-800',
};

const fileStatusColors = {
  in_strong_room: 'bg-purple-100 text-purple-800',
  issued: 'bg-blue-100 text-blue-800',
  returned: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

export default function UnifiedDashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'unified'],
    queryFn: async () => {
      const response = await api.get('/dashboard/unified');
      return response.data.data;
    },
    refetchInterval: 60000,
  });

  const { data: todayRecord } = useQuery({
    queryKey: ['records', 'today'],
    queryFn: async () => {
      const response = await api.get('/records/today');
      return response.data.data;
    },
  });

  const hasAccess = (module) => {
    return user?.moduleAccess?.[module]?.permissions?.length > 0;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <div className="rounded-lg border bg-card p-4 sm:p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Unable to load dashboard data. Please try again.</p>
        </div>
      </div>
    );
  }

  const { attendance, fleet, fileMovement, pendingActions, recentActivity, alerts } = data;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Welcome back, {user?.name}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-lg text-xs sm:text-sm ${
                alert.type === 'warning'
                  ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{alert.message}</span>
              {alert.module && (
                <Link href={`/${alert.module}`} className="text-xs font-medium hover:underline">
                  View
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick Status - Today's personal status */}
      {todayRecord && (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base">Your Attendance Today</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${todayRecord.checkOut ? 'bg-gray-400' : 'bg-green-500'}`} />
                    {todayRecord.checkOut ? 'Checked Out' : 'Checked In'}
                  </span>
                  {todayRecord.checkIn && (
                    <span>In: {formatTime(todayRecord.checkIn)}</span>
                  )}
                  {todayRecord.checkOut && (
                    <span>Out: {formatTime(todayRecord.checkOut)}</span>
                  )}
                  {todayRecord.overtimeMinutes > 0 && (
                    <span className="text-orange-600 font-medium">+{todayRecord.overtimeMinutes}min OT</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row - Attendance, Fleet, File Movement */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Attendance Stats */}
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-transparent">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Attendance
              </h3>
              <Link href="/attendance/dashboard" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                View <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xl sm:text-2xl font-bold">{attendance?.totalCheckIns || 0}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Check-ins</p>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">{attendance?.currentlyInOffice || 0}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">In Office</p>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{attendance?.lateCheckIns || 0}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Late</p>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-orange-600">{attendance?.overtime || 0}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Overtime</p>
            </div>
          </div>
        </div>

        {/* Fleet Stats */}
        {hasAccess('fleet') && (
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gradient-to-r from-indigo-50 to-transparent">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5 text-indigo-600" />
                  Fleet
                </h3>
                <Link href="/fleet/dashboard" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  View <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xl sm:text-2xl font-bold">{fleet?.totalVehicles || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Vehicles</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{fleet?.activeTrips || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Active Trips</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">{fleet?.pendingApprovals || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Pending</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-orange-600">{fleet?.maintenanceDue || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Maintenance</p>
              </div>
            </div>
          </div>
        )}

        {/* File Movement Stats */}
        {hasAccess('fileMovement') && (
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gradient-to-r from-purple-50 to-transparent">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5 text-purple-600" />
                  File Movement
                </h3>
                <Link href="/file-movement/dashboard" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  View <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xl sm:text-2xl font-bold">{fileMovement?.totalFiles || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Files</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{fileMovement?.filesIssued || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Issued</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">{fileMovement?.pendingFileRequests || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Pending</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-purple-600">{fileMovement?.filesInStrongRoom || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Strong Room</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pending Actions + Alerts side by side */}
      {(pendingActions?.length > 0) && (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b">
            <h3 className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Pending Actions
            </h3>
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
              {pendingActions.reduce((sum, a) => sum + a.count, 0)}
            </span>
          </div>
          <div className="divide-y">
            {pendingActions.map((action, i) => (
              <Link key={i} href={action.href} className="flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {action.type === 'trip_approval' && <Car className="h-4 w-4 text-blue-600 shrink-0" />}
                  {action.type === 'file_request' && <FileText className="h-4 w-4 text-yellow-600 shrink-0" />}
                  {action.type === 'maintenance' && <Wrench className="h-4 w-4 text-orange-600 shrink-0" />}
                  {action.type === 'overdue' && <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />}
                  <span className="text-xs sm:text-sm">{action.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] sm:text-xs font-medium text-secondary-foreground">
                    {action.count}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Recent Trips */}
          {hasAccess('fleet') && recentActivity.trips?.length > 0 && (
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b">
                <h3 className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5 text-indigo-600" />
                  Recent Trips
                </h3>
                <Link href="/fleet/trips" className="text-xs text-primary hover:underline">All trips</Link>
              </div>
              <div className="divide-y">
                {recentActivity.trips.slice(0, 5).map((trip) => (
                  <div key={trip._id} className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {trip.purpose || trip.destination || 'Trip'}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {trip.vehicleId ? `Vehicle assigned` : 'No vehicle'} &middot; {formatDate(trip.createdAt)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${statusColors[trip.status] || 'bg-gray-100 text-gray-800'}`}>
                      {trip.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent File Movement */}
          {hasAccess('fileMovement') && recentActivity.files?.length > 0 && (
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b">
                <h3 className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5 text-purple-600" />
                  Recent Files
                </h3>
                <Link href="/file-movement/case-files" className="text-xs text-primary hover:underline">All files</Link>
              </div>
              <div className="divide-y">
                {recentActivity.files.slice(0, 5).map((file) => (
                  <div key={file._id} className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {file.title || file.fileName || 'File'}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {file.fileNumber || file.referenceNumber || ''} &middot; {formatDate(file.updatedAt)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${fileStatusColors[file.status] || 'bg-gray-100 text-gray-800'}`}>
                      {file.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Attendance */}
          {recentActivity.attendance?.length > 0 && (
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b">
                <h3 className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  Recent Check-ins
                </h3>
                <Link href="/attendance/records" className="text-xs text-primary hover:underline">All records</Link>
              </div>
              <div className="divide-y">
                {recentActivity.attendance.slice(0, 5).map((record) => (
                  <div key={record._id} className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {record.userName || record.userId || 'User'}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        In: {formatTime(record.checkIn)} &middot; Out: {formatTime(record.checkOut)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {record.isLateCheckIn && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-800">Late</span>
                      )}
                      {record.overtimeMinutes > 0 && (
                        <span className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800">OT</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="px-4 sm:px-6 py-3 border-b">
              <h3 className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Quick Links
              </h3>
            </div>
            <div className="px-4 sm:px-6 py-3 grid grid-cols-2 gap-2">
              {hasAccess('attendance') && (
                <Link href="/attendance/dashboard" className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Clock className="mr-1.5 h-3.5 w-3.5" /> Attendance
                </Link>
              )}
              {hasAccess('fleet') && (
                <Link href="/fleet/vehicles" className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Car className="mr-1.5 h-3.5 w-3.5" /> Vehicles
                </Link>
              )}
              {hasAccess('fleet') && (
                <Link href="/fleet/trips" className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                  <MapPin className="mr-1.5 h-3.5 w-3.5" /> Trips
                </Link>
              )}
              {hasAccess('fileMovement') && (
                <Link href="/file-movement/case-files" className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                  <FolderOpen className="mr-1.5 h-3.5 w-3.5" /> Case Files
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link href="/admin/stations" className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Building2 className="mr-1.5 h-3.5 w-3.5" /> Stations
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
