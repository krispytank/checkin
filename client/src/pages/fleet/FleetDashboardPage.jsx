import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { api } from '../../lib/api.js';
import { Car, MapPin, Clock, CheckCircle, Truck, Wrench, Gauge, AlertTriangle, Users, Loader2 } from 'lucide-react';

const TRIP_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
  requested: { label: 'Requested', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
  approved: { label: 'Approved', color: 'text-blue-600', bg: 'bg-blue-100', icon: CheckCircle },
  'in-progress': { label: 'In Progress', color: 'text-purple-600', bg: 'bg-purple-100', icon: Truck },
  in_progress: { label: 'In Progress', color: 'text-purple-600', bg: 'bg-purple-100', icon: Truck },
  completed: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
};

export default function FleetDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['fleet-dashboard'],
    queryFn: async () => {
      const res = await api.get('/fleet/dashboard');
      return res.data;
    },
  });

  const stats = data?.data || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const v = stats.vehicles || {};
  const t = stats.trips || {};
  const m = stats.maintenance || {};

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Fleet Management</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage vehicles, trips, and parking</p>
      </div>

      {/* Vehicle Status */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Car} label="Total" value={v.total || 0} color="text-slate-600 bg-slate-50" />
        <StatCard icon={CheckCircle} label="Available" value={v.available || 0} color="text-green-600 bg-green-50" />
        <StatCard icon={Truck} label="In Use" value={v.inUse || 0} color="text-blue-600 bg-blue-50" />
        <StatCard icon={Clock} label="Booked" value={v.booked || 0} color="text-yellow-600 bg-yellow-50" />
        <StatCard icon={Wrench} label="Maint." value={v.underMaintenance || 0} color="text-orange-600 bg-orange-50" />
        <StatCard icon={Gauge} label="Utiliz." value={`${v.utilizationRate || 0}%`} color="text-primary bg-primary/5" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
        <StatCard icon={Truck} label="Trips/Month" value={t.thisMonth || 0} color="text-blue-600 bg-blue-50" />
        <StatCard icon={CheckCircle} label="Completed" value={t.completedThisMonth || 0} color="text-green-600 bg-green-50" />
        <StatCard icon={Users} label="Visitors" value={stats.visitorParking?.currentlyParked || 0} color="text-indigo-600 bg-indigo-50" />
      </div>

      {/* Alerts Row */}
      {(m.upcoming?.length > 0 || m.insuranceExpiring?.length > 0 || m.inspectionExpiring?.length > 0) && (
        <div className="grid gap-2 sm:gap-3 md:grid-cols-3">
          {m.upcoming?.length > 0 && (
            <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Wrench className="h-4 w-4 text-orange-500 shrink-0" />
                <h3 className="font-semibold text-xs sm:text-sm">Upcoming Maintenance</h3>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                {m.upcoming.map(item => (
                  <div key={item._id} className="text-[10px] sm:text-xs flex justify-between gap-2">
                    <span className="text-muted-foreground truncate">{item.type?.replace(/_/g, ' ')}</span>
                    <span className="shrink-0">{item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {m.insuranceExpiring?.length > 0 && (
            <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <h3 className="font-semibold text-xs sm:text-sm">Insurance Expiring</h3>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                {m.insuranceExpiring.map(v => (
                  <div key={v._id} className="text-[10px] sm:text-xs flex justify-between gap-2">
                    <span className="font-mono truncate">{v.plateNumber}</span>
                    <span className="shrink-0">{new Date(v.insuranceExpiry).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {m.inspectionExpiring?.length > 0 && (
            <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <h3 className="font-semibold text-xs sm:text-sm">Inspection Expiring</h3>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                {m.inspectionExpiring.map(v => (
                  <div key={v._id} className="text-[10px] sm:text-xs flex justify-between gap-2">
                    <span className="font-mono truncate">{v.plateNumber}</span>
                    <span className="shrink-0">{new Date(v.inspectionExpiry).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Trips + Quick Actions */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between p-3 sm:p-4 border-b">
            <h2 className="font-semibold text-sm sm:text-base">Recent Trips</h2>
            <Link href="/fleet/trips" className="text-xs sm:text-sm text-primary hover:underline">View All</Link>
          </div>
          {t.recent?.length > 0 ? (
            <div className="divide-y">
              {t.recent.map(trip => {
                const statusCfg = TRIP_STATUS_CONFIG[trip.status] || TRIP_STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;
                return (
                  <div key={trip._id} className="flex items-center justify-between p-3 sm:p-4 gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{trip.tripId}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        {trip.destination} — {trip.userDetails?.name || 'Unknown'}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-medium ${statusCfg.bg} ${statusCfg.color} shrink-0`}>
                      <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {statusCfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 sm:py-8 text-center text-muted-foreground text-xs sm:text-sm">No trips yet</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 sm:space-y-3">
          <h3 className="font-semibold text-xs sm:text-sm">Quick Actions</h3>
          {[
            { label: 'Vehicles', href: '/fleet/vehicles', icon: Car, color: 'bg-slate-50 text-slate-600' },
            { label: 'Trips', href: '/fleet/trips', icon: Truck, color: 'bg-blue-50 text-blue-600' },
            { label: 'Parking', href: '/fleet/parking', icon: MapPin, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Visitor Parking', href: '/fleet/parking', icon: Users, color: 'bg-indigo-50 text-indigo-600' },
          ].map(action => (
            <Link key={action.label} href={action.href}
              className="flex items-center gap-2.5 sm:gap-3 rounded-xl border bg-card p-2.5 sm:p-3 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]">
              <div className={`rounded-lg p-1.5 sm:p-2 ${action.color}`}><action.icon className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <span className="text-xs sm:text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border bg-card p-2.5 sm:p-3 md:p-4 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`rounded-lg p-1.5 sm:p-2 ${color}`}><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></div>
        <div>
          <p className="text-base sm:text-lg md:text-2xl font-bold">{value}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
