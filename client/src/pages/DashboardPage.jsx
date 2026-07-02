import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordsAPI, stationsAPI } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import AttendanceMap from '../components/AttendanceMap.jsx';
import { formatDateTime, formatDuration, getStatusColor, cn } from '../lib/utils.js';
import { 
  Clock, MapPin, CheckCircle, XCircle, AlertTriangle, 
  Loader2, Timer, Calendar, TrendingUp 
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [duration, setDuration] = useState('00:00:00');

  // Get today's record
  const { data: todayRecord, isLoading } = useQuery({
    queryKey: ['records', 'today'],
    queryFn: async () => {
      const response = await recordsAPI.getToday();
      return response.data.data;
    },
  });

  // Get weekly summary
  const { data: weeklySummary } = useQuery({
    queryKey: ['records', 'weekly'],
    queryFn: async () => {
      const response = await recordsAPI.getWeeklySummary();
      return response.data.data;
    },
  });

  // Get user's station for map context
  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const response = await stationsAPI.list();
      return response.data;
    },
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: (location) => recordsAPI.checkIn(location),
    onSuccess: () => {
      queryClient.invalidateQueries(['records', 'today']);
      setShowCheckInModal(false);
      setGpsLocation(null);
    },
    onError: (error) => {
      const msg = error?.response?.data?.error || error?.response?.data?.message || error.message || 'Check-in failed';
      setGpsError(msg);
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: (location) => recordsAPI.checkOut(location),
    onSuccess: () => {
      queryClient.invalidateQueries(['records', 'today']);
      setShowCheckOutModal(false);
      setGpsLocation(null);
    },
    onError: (error) => {
      const msg = error?.response?.data?.error || error?.response?.data?.message || error.message || 'Check-out failed';
      setGpsError(msg);
    },
  });

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update duration timer when checked in
  useEffect(() => {
    if (todayRecord?.checkInTime && !todayRecord?.checkOutTime) {
      const timer = setInterval(() => {
        const start = new Date(todayRecord.checkInTime);
        const now = new Date();
        const diff = now - start;
        setDuration(formatDuration(diff));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [todayRecord]);

  const acquireGPS = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleCheckIn = async () => {
    try {
      setGpsError('');
      setGpsLocation(null);
      setShowCheckInModal(true);

      const location = await acquireGPS();
      setGpsLocation(location);
    } catch (error) {
      setGpsError(error.message || 'Failed to get GPS location');
    }
  };

  const handleCheckOut = async () => {
    try {
      setGpsError('');
      setGpsLocation(null);
      setShowCheckOutModal(true);

      const location = await acquireGPS();
      setGpsLocation(location);
    } catch (error) {
      setGpsError(error.message || 'Failed to get GPS location');
    }
  };

  const confirmCheckIn = () => {
    if (gpsLocation) {
      setGpsError('');
      checkInMutation.mutate(gpsLocation);
    }
  };

  const confirmCheckOut = () => {
    if (gpsLocation) {
      setGpsError('');
      checkOutMutation.mutate(gpsLocation);
    }
  };

  const isCheckedIn = todayRecord?.checkInTime && !todayRecord?.checkOutTime;
  const hasCheckedInToday = !!todayRecord?.checkInTime;
  const hasCheckedOutToday = !!todayRecord?.checkOutTime;

  // Extract location data from events
  const checkInLocation = todayRecord?.events?.find(e => e.type === 'check-in')?.location;
  const checkOutLocation = todayRecord?.events?.find(e => e.type === 'check-out')?.location;
  const hasMapData = checkInLocation || checkOutLocation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold">
            {currentTime.toLocaleTimeString()}
          </p>
          <p className="text-muted-foreground">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-2xl font-bold capitalize">
                {todayRecord?.status || 'Not checked in'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#009A44]/10 text-[#009A44]">
              <Timer className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-2xl font-mono font-bold">{duration}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold">
                {weeklySummary?.present || 0} / {weeklySummary?.totalDays || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hours</p>
              <p className="text-2xl font-bold">
                {weeklySummary?.totalHours?.toFixed(1) || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Check-in/out section */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Today's Attendance</h2>
          
          {todayRecord ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Check-in:</span>
                <span className="font-medium">
                  {todayRecord.checkInTime 
                    ? new Date(todayRecord.checkInTime).toLocaleTimeString()
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Check-out:</span>
                <span className="font-medium">
                  {todayRecord.checkOutTime 
                    ? new Date(todayRecord.checkOutTime).toLocaleTimeString()
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  getStatusColor(todayRecord.status)
                )}>
                  {todayRecord.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Hours worked:</span>
                <span className="font-medium">{todayRecord.totalHours?.toFixed(1) || 0}h</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No attendance recorded today
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          
          <div className="space-y-3">
            {!hasCheckedInToday ? (
              <button
                onClick={handleCheckIn}
                disabled={checkInMutation.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#009A44] px-4 py-3 text-sm font-medium text-white hover:bg-[#008038] transition-colors disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5" />
                Check In
              </button>
            ) : !hasCheckedOutToday ? (
              <button
                onClick={handleCheckOut}
                disabled={checkOutMutation.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#8A704C] px-4 py-3 text-sm font-medium text-white hover:bg-[#7A633C] transition-colors disabled:opacity-50"
              >
                <XCircle className="h-5 w-5" />
                Check Out
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">
                <CheckCircle className="h-5 w-5 text-[#009A44]" />
                Completed for today
              </div>
            )}

            {hasCheckedInToday && hasCheckedOutToday && (
              <p className="text-xs text-muted-foreground text-center">
                You can only check in and check out once per day.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Map Card */}
      {hasMapData && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Today's Location</h2>
          <AttendanceMap
            checkInLocation={checkInLocation}
            checkOutLocation={checkOutLocation}
          />
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {checkInLocation && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#009A44]"></div>
                <span>Check-in: {checkInLocation.latitude.toFixed(4)}, {checkInLocation.longitude.toFixed(4)}</span>
              </div>
            )}
            {checkOutLocation && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#8A704C]"></div>
                <span>Check-out: {checkOutLocation.latitude.toFixed(4)}, {checkOutLocation.longitude.toFixed(4)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly Summary */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Weekly Summary</h2>
        
        {weeklySummary ? (
          <div className="grid gap-4 md:grid-cols-5">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#009A44]">{weeklySummary.present}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{weeklySummary.absent}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{weeklySummary.late}</p>
              <p className="text-sm text-muted-foreground">Late</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#8A704C]">{weeklySummary.halfDay}</p>
              <p className="text-sm text-muted-foreground">Half Day</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{weeklySummary.overtime}</p>
              <p className="text-sm text-muted-foreground">Overtime</p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No weekly data available
          </p>
        )}
      </div>

      {/* Check-in Modal with Map */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Check In</h3>
            
            {gpsError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                {gpsError}
              </div>
            )}

            {gpsLocation ? (
              <div className="space-y-4">
                {/* Mini map showing current location */}
                <div className="rounded-lg overflow-hidden border">
                  <AttendanceMap
                    checkInLocation={gpsLocation}
                    showAccuracy
                  />
                </div>

                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Location Acquired</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                    &middot; Accuracy: {gpsLocation.accuracy.toFixed(1)}m
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowCheckInModal(false); setGpsLocation(null); }}
                    className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCheckIn}
                    disabled={checkInMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#009A44] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#008038] disabled:opacity-50"
                  >
                    {checkInMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Confirm Check In
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Acquiring GPS location...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check-out Modal with Map */}
      {showCheckOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Check Out</h3>
            
            {gpsError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                {gpsError}
              </div>
            )}

            {gpsLocation ? (
              <div className="space-y-4">
                {/* Show map with both check-in and check-out pins */}
                <div className="rounded-lg overflow-hidden border">
                  <AttendanceMap
                    checkInLocation={checkInLocation}
                    checkOutLocation={gpsLocation}
                    showAccuracy
                  />
                </div>

                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-[#8A704C]" />
                    <span className="text-sm font-medium">Location Acquired</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                    &middot; Accuracy: {gpsLocation.accuracy.toFixed(1)}m
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowCheckOutModal(false); setGpsLocation(null); }}
                    className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCheckOut}
                    disabled={checkOutMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#8A704C] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#7A633C] disabled:opacity-50"
                  >
                    {checkOutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Confirm Check Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Acquiring GPS location...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
