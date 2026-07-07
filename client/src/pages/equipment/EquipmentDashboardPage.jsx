import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { equipmentAPI, bookingsAPI } from '../../lib/api.js';
import { Package, Clock, CheckCircle, Truck, RotateCcw, Loader2, Monitor, Video, Presentation, PackageCheck } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
  approved: { label: 'Approved', color: 'text-blue-600', bg: 'bg-blue-100', icon: CheckCircle },
  dispatched: { label: 'Dispatched', color: 'text-purple-600', bg: 'bg-purple-100', icon: Truck },
  'in-use': { label: 'In Use', color: 'text-green-600', bg: 'bg-green-100', icon: Package },
  returned: { label: 'Returned', color: 'text-gray-600', bg: 'bg-gray-100', icon: RotateCcw },
  received: { label: 'Received', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: PackageCheck },
};

const TYPE_ICONS = {
  'Screen': Monitor,
  'Sound System': Video,
  'Camera': Presentation,
};

export default function EquipmentDashboardPage() {
  const { data: equipData } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const res = await equipmentAPI.list({ limit: 500 });
      return res.data;
    },
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await bookingsAPI.list({ limit: 10 });
      return res.data;
    },
  });

  const equipment = equipData?.data || [];
  const bookings = bookingsData?.data || [];

  const stats = {
    total: equipment.length,
    available: equipment.filter(e => e.status === 'available').length,
    booked: equipment.filter(e => e.status === 'booked').length,
    inUse: equipment.filter(e => e.status === 'in-use').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
  };

  const types = [...new Set(equipment.map(e => e.type).filter(Boolean))];
  const typeStats = types.map(type => {
    const items = equipment.filter(e => e.type === type);
    return {
      type,
      total: items.length,
      available: items.filter(e => e.status === 'available').length,
      booked: items.filter(e => e.status === 'booked').length,
      inUse: items.filter(e => e.status === 'in-use').length,
      maintenance: items.filter(e => e.status === 'maintenance').length,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Equipment Dashboard</h1>
        <p className="text-muted-foreground">Monitor equipment status and bookings</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="text-2xl font-bold text-green-600">{stats.available}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Booked</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.booked}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">In Use</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inUse}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Maintenance</p>
          <p className="text-2xl font-bold text-red-600">{stats.maintenance}</p>
        </div>
      </div>

      {/* Status by Type */}
      {typeStats.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Status by Type</h2>
          </div>
          <div className="divide-y">
            {typeStats.map(ts => {
              const Icon = TYPE_ICONS[ts.type] || Package;
              return (
                <div key={ts.type} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{ts.type}</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="text-green-600">{ts.available} available</span>
                      <span className="text-yellow-600">{ts.booked} booked</span>
                      <span className="text-blue-600">{ts.inUse} in use</span>
                      {ts.maintenance > 0 && <span className="text-red-600">{ts.maintenance} maintenance</span>}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{ts.total} total</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Recent Bookings</h2>
          <Link href="/equipment/manage" className="text-sm text-primary hover:underline">View All</Link>
        </div>
        {bookingsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : bookings.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No bookings yet</div>
        ) : (
          <div className="divide-y">
            {bookings.slice(0, 5).map(booking => {
              const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              return (
                <div key={booking._id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{booking.bookingId}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.caseDetails?.caseNumber || 'N/A'} - {booking.userDetails?.name || 'Unknown'}
                    </p>
                    {booking.startDate && booking.endDate && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                    <StatusIcon className="h-3 w-3" /> {statusCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
