import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordsAPI, stationsAPI } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import AttendanceMap from '../../components/AttendanceMap.jsx';
import { formatDuration, getStatusColor, cn } from '../../lib/utils.js';
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

  const { data: todayRecord, isLoading } = useQuery({
    queryKey: ['records', 'today'],
    queryFn: async () => {
      const response = await recordsAPI.getToday();
      return response.data.data;
    },
  });

  const { data: weeklySummary } = useQuery({
    queryKey: ['records', 'weekly'],
    queryFn: async () => {
      const response = await recordsAPI.getWeeklySummary();
      return response.data.data;
    },
  });

  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const response = await stationsAPI.list();
      return response.data;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 30000,
    refetchInterval: 60000,
  });

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (todayRecord?.checkInTime && !todayRecord?.checkOutTime) {
      const timer = setInterval(() => {
        setDuration(formatDuration(new Date() - new Date(todayRecord.checkInTime)));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [todayRecord]);

  const acquireGPS = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('GPS not supported')); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const handleCheckIn = async () => {
    try {
      setGpsError(''); setGpsLocation(null); setShowCheckInModal(true);
      queryClient.invalidateQueries(['stations']);
      const location = await acquireGPS();
      setGpsLocation(location);
    } catch (error) {
      setGpsError(error.message || 'Failed to get GPS location');
    }
  };

  const handleCheckOut = async () => {
    try {
      setGpsError(''); setGpsLocation(null); setShowCheckOutModal(true);
      queryClient.invalidateQueries(['stations']);
      const location = await acquireGPS();
      setGpsLocation(location);
    } catch (error) {
      setGpsError(error.message || 'Failed to get GPS location');
    }
  };

  const confirmCheckIn = () => { if (gpsLocation) { setGpsError(''); checkInMutation.mutate(gpsLocation); } };
  const confirmCheckOut = () => { if (gpsLocation) { setGpsError(''); checkOutMutation.mutate(gpsLocation); } };

  const hasCheckedInToday = !!todayRecord?.checkInTime;
  const hasCheckedOutToday = !!todayRecord?.checkOutTime;
  const checkInLocation = todayRecord?.events?.find(e => e.type === 'check-in')?.location;
  const checkOutLocation = todayRecord?.events?.find(e => e.type === 'check-out')?.location;
  const hasMapData = checkInLocation || checkOutLocation;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Time Attendance</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Welcome back, {user?.name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg sm:text-2xl font-mono font-bold">{currentTime.toLocaleTimeString()}</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stat cards — 2x2 mobile, 4-col desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <div className="rounded-xl border bg-card p-3 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-muted-foreground">Status</p>
              <p className="text-base sm:text-xl font-bold capitalize">{todayRecord?.status || 'Not in'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-[#009A44]/10 text-[#009A44]">
              <Timer className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-muted-foreground">Duration</p>
              <p className="text-base sm:text-xl font-mono font-bold">{duration}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-muted-foreground">This Week</p>
              <p className="text-base sm:text-xl font-bold">{weeklySummary?.present || 0}/{weeklySummary?.totalDays || 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-muted-foreground">Hours</p>
              <p className="text-base sm:text-xl font-bold">{weeklySummary?.totalHours?.toFixed(1) || 0}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Check-in/out + Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4">Today's Attendance</h2>
          {todayRecord ? (
            <div className="space-y-2.5 sm:space-y-3">
              {[
                { label: 'Check-in', value: todayRecord.checkInTime ? new Date(todayRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-' },
                { label: 'Check-out', value: todayRecord.checkOutTime ? new Date(todayRecord.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-' },
                { label: 'Hours', value: `${todayRecord.totalHours?.toFixed(1) || 0}h` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">{row.label}:</span>
                  <span className="text-sm sm:text-base font-medium">{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Status:</span>
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium", getStatusColor(todayRecord.status))}>
                  {todayRecord.status}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4 text-sm">No attendance recorded today</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {!hasCheckedInToday ? (
              <button onClick={handleCheckIn} disabled={checkInMutation.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#009A44] px-4 py-3.5 sm:py-3 text-sm font-medium text-white hover:bg-[#008038] transition-colors disabled:opacity-50 active:scale-[0.98]">
                <CheckCircle className="h-5 w-5" /> Check In
              </button>
            ) : !hasCheckedOutToday ? (
              <button onClick={handleCheckOut} disabled={checkOutMutation.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#8A704C] px-4 py-3.5 sm:py-3 text-sm font-medium text-white hover:bg-[#7A633C] transition-colors disabled:opacity-50 active:scale-[0.98]">
                <XCircle className="h-5 w-5" /> Check Out
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">
                <CheckCircle className="h-5 w-5 text-[#009A44]" /> Completed for today
              </div>
            )}
            {hasCheckedInToday && hasCheckedOutToday && (
              <p className="text-[10px] sm:text-xs text-muted-foreground text-center">You can only check in and check out once per day.</p>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      {hasMapData && (
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm sm:text-lg font-semibold mb-3">Today's Locations</h2>
          <div className="rounded-lg overflow-hidden border">
            <AttendanceMap checkInLocation={checkInLocation} checkOutLocation={checkOutLocation} className="h-[220px] sm:h-[300px]" />
          </div>
          <div className="mt-3 space-y-1.5 text-xs sm:text-sm">
            {checkInLocation && (
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#009A44]"></span>
                <span className="text-muted-foreground">In:</span>
                <span className="font-medium truncate">{checkInLocation.address || `${checkInLocation.latitude.toFixed(4)}, ${checkInLocation.longitude.toFixed(4)}`}</span>
              </div>
            )}
            {checkOutLocation && (
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#8A704C]"></span>
                <span className="text-muted-foreground">Out:</span>
                <span className="font-medium truncate">{checkOutLocation.address || `${checkOutLocation.latitude.toFixed(4)}, ${checkOutLocation.longitude.toFixed(4)}`}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly Summary */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
        <h2 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4">Weekly Summary</h2>
        {weeklySummary ? (
          <div className="grid grid-cols-5 gap-1.5 sm:gap-4">
            {[
              { value: weeklySummary.present, color: 'text-[#009A44]', label: 'Present' },
              { value: weeklySummary.absent, color: 'text-destructive', label: 'Absent' },
              { value: weeklySummary.late, color: 'text-yellow-600', label: 'Late' },
              { value: weeklySummary.halfDay, color: 'text-[#8A704C]', label: 'Half' },
              { value: weeklySummary.overtime, color: 'text-primary', label: 'OT' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className={cn("text-lg sm:text-3xl font-bold", item.color)}>{item.value}</p>
                <p className="text-[9px] sm:text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4 text-sm">No weekly data available</p>
        )}
      </div>

      {/* Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl bg-card p-5 sm:p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Check In</h3>
            {gpsError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-2" />{gpsError}
              </div>
            )}
            {gpsLocation ? (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden border">
                  <AttendanceMap checkInLocation={gpsLocation} showAccuracy className="h-[200px] sm:h-[250px]" />
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Location Acquired</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)} · {gpsLocation.accuracy.toFixed(1)}m
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowCheckInModal(false); setGpsLocation(null); }}
                    className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted active:scale-[0.98]">Cancel</button>
                  <button onClick={confirmCheckIn} disabled={checkInMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#009A44] px-4 py-3 text-sm font-medium text-white hover:bg-[#008038] disabled:opacity-50 active:scale-[0.98]">
                    {checkInMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Acquiring GPS...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check-out Modal */}
      {showCheckOutModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl bg-card p-5 sm:p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Check Out</h3>
            {gpsError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-2" />{gpsError}
              </div>
            )}
            {gpsLocation ? (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden border">
                  <AttendanceMap checkInLocation={checkInLocation} checkOutLocation={gpsLocation} showAccuracy className="h-[200px] sm:h-[250px]" />
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-[#8A704C]" />
                    <span className="text-sm font-medium">Location Acquired</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)} · {gpsLocation.accuracy.toFixed(1)}m
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowCheckOutModal(false); setGpsLocation(null); }}
                    className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted active:scale-[0.98]">Cancel</button>
                  <button onClick={confirmCheckOut} disabled={checkOutMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#8A704C] px-4 py-3 text-sm font-medium text-white hover:bg-[#7A633C] disabled:opacity-50 active:scale-[0.98]">
                    {checkOutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Acquiring GPS...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
