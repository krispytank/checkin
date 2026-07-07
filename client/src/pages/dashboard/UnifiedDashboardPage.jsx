import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { api } from '../../lib/api.js';
import {
  Clock, Car, FolderOpen, AlertTriangle, CheckCircle,
  ArrowRight, FileText, Wrench, MapPin, Loader2
} from 'lucide-react';
import { Link } from 'wouter';

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

  const { attendance, fleet, fileMovement, pendingActions, alerts } = data;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Welcome back, {user?.name}</p>
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
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Attendance Card */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 pb-1 sm:pb-2">
          <h3 className="text-xs sm:text-sm font-medium">Attendance Today</h3>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <div className="text-xl sm:text-2xl font-bold">{attendance?.totalCheckIns || 0}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total Check-ins</p>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">{attendance?.currentlyInOffice || 0}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Currently In</p>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{attendance?.lateCheckIns || 0}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Late Check-ins</p>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{attendance?.overtime || 0}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Overtime</p>
            </div>
          </div>
          {todayRecord && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <span className="text-muted-foreground">Your status:</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${
                  todayRecord.checkOut
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {todayRecord.checkOut ? 'Checked Out' : 'Checked In'}
                </span>
                {todayRecord.checkIn && (
                  <span className="text-muted-foreground">
                    In since {new Date(todayRecord.checkIn).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fleet Summary */}
      {hasAccess('fleet') && (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 pb-1 sm:pb-2">
            <h3 className="text-xs sm:text-sm font-medium">Fleet Management</h3>
            <Car className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="text-xl sm:text-2xl font-bold">{fleet?.totalVehicles || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Vehicles</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{fleet?.activeTrips || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Active Trips</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">{fleet?.pendingApprovals || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Pending Approvals</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-orange-600">{fleet?.maintenanceDue || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Maintenance Due</p>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t flex flex-wrap gap-2">
              <Link href="/fleet/dashboard" className="inline-flex items-center rounded-md border bg-background px-3 py-1.5 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                View Dashboard <ArrowRight className="ml-1.5 sm:ml-2 h-3.5 w-3.5" />
              </Link>
              <Link href="/fleet/reports" className="inline-flex items-center rounded-md border bg-background px-3 py-1.5 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                View Reports <ArrowRight className="ml-1.5 sm:ml-2 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* File Movement Summary */}
      {hasAccess('fileMovement') && (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 pb-1 sm:pb-2">
            <h3 className="text-xs sm:text-sm font-medium">File Movement</h3>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="text-xl sm:text-2xl font-bold">{fileMovement?.totalFiles || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Files</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{fileMovement?.filesIssued || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Currently Issued</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">{fileMovement?.pendingFileRequests || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Pending Requests</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-red-600">{fileMovement?.overdueFiles || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t flex flex-wrap gap-2">
              <Link href="/file-movement/dashboard" className="inline-flex items-center rounded-md border bg-background px-3 py-1.5 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                View Dashboard <ArrowRight className="ml-1.5 sm:ml-2 h-3.5 w-3.5" />
              </Link>
              <Link href="/file-movement/reports" className="inline-flex items-center rounded-md border bg-background px-3 py-1.5 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                View Reports <ArrowRight className="ml-1.5 sm:ml-2 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Pending Actions */}
      {pendingActions && pendingActions.length > 0 && (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 pb-1 sm:pb-2">
            <h3 className="text-xs sm:text-sm font-medium">Pending Actions</h3>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-2">
              {pendingActions.map((action, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 sm:p-3 bg-muted/50 rounded-lg gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {action.type === 'trip_approval' && <Car className="h-4 w-4 text-blue-600 shrink-0" />}
                    {action.type === 'file_request' && <FileText className="h-4 w-4 text-yellow-600 shrink-0" />}
                    {action.type === 'maintenance' && <Wrench className="h-4 w-4 text-orange-600 shrink-0" />}
                    {action.type === 'overdue' && <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />}
                    <span className="text-xs sm:text-sm truncate">{action.label}</span>
                    <span className="inline-flex items-center rounded-full bg-secondary px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium text-secondary-foreground shrink-0">
                      {action.count}
                    </span>
                  </div>
                  <Link href={action.href} className="inline-flex items-center text-xs sm:text-sm text-primary hover:underline shrink-0">
                    View <ArrowRight className="ml-0.5 h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="px-4 sm:px-6 py-3 sm:py-4 pb-1 sm:pb-2">
          <h3 className="text-xs sm:text-sm font-medium">Quick Links</h3>
        </div>
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-2 gap-2">
            {hasAccess('attendance') && (
              <Link href="/attendance/dashboard" className="inline-flex items-center justify-start rounded-md border bg-background px-3 py-2.5 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                <Clock className="mr-1.5 sm:mr-2 h-3.5 w-3.5" /> Attendance
              </Link>
            )}
            {hasAccess('fleet') && (
              <Link href="/fleet/vehicles" className="inline-flex items-center justify-start rounded-md border bg-background px-3 py-2.5 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                <Car className="mr-1.5 sm:mr-2 h-3.5 w-3.5" /> Vehicles
              </Link>
            )}
            {hasAccess('fleet') && (
              <Link href="/fleet/trips" className="inline-flex items-center justify-start rounded-md border bg-background px-3 py-2.5 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                <MapPin className="mr-1.5 sm:mr-2 h-3.5 w-3.5" /> Trips
              </Link>
            )}
            {hasAccess('fileMovement') && (
              <Link href="/file-movement/case-files" className="inline-flex items-center justify-start rounded-md border bg-background px-3 py-2.5 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                <FolderOpen className="mr-1.5 sm:mr-2 h-3.5 w-3.5" /> Case Files
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
