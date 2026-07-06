import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { vehicleAPI, tripsAPI, parkingAPI } from '../../lib/api.js';
import { Car, Plus, MapPin, Clock, CheckCircle, Truck, Loader2 } from 'lucide-react';

const TRIP_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
  approved: { label: 'Approved', color: 'text-blue-600', bg: 'bg-blue-100', icon: CheckCircle },
  'in-progress': { label: 'In Progress', color: 'text-purple-600', bg: 'bg-purple-100', icon: Truck },
  completed: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
};

export default function FleetDashboardPage() {
  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['fleet', 'vehicles'],
    queryFn: async () => {
      const res = await vehicleAPI.list();
      return res.data;
    },
  });

  const { data: tripsData, isLoading: tripsLoading } = useQuery({
    queryKey: ['fleet', 'trips'],
    queryFn: async () => {
      const res = await tripsAPI.list({ limit: 10 });
      return res.data;
    },
  });

  const { data: parkingData } = useQuery({
    queryKey: ['fleet', 'parking', 'stats'],
    queryFn: async () => {
      const res = await parkingAPI.stats();
      return res.data;
    },
  });

  const vehicles = vehiclesData?.data || [];
  const trips = tripsData?.data || [];
  const parkingStats = parkingData?.data || {};

  const stats = {
    totalVehicles: vehicles.length,
    available: vehicles.filter(v => v.status === 'available').length,
    inUse: vehicles.filter(v => v.status === 'in-use').length,
    booked: vehicles.filter(v => v.status === 'booked').length,
    parkingAvailable: parkingStats.available || 0,
    parkingTotal: parkingStats.total || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleet Management</h1>
          <p className="text-muted-foreground">Manage vehicles, trips, and parking</p>
        </div>
        <Link href="/fleet/trips"
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> New Trip
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Vehicles</p>
          <p className="text-2xl font-bold">{stats.totalVehicles}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="text-2xl font-bold text-green-600">{stats.available}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">In Use</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inUse}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Booked</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.booked}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Parking Available</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.parkingAvailable}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Parking</p>
          <p className="text-2xl font-bold">{stats.parkingTotal}</p>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Recent Trips</h2>
          <Link href="/fleet/trips" className="text-sm text-primary hover:underline">View All</Link>
        </div>
        {tripsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : trips.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No trips yet</div>
        ) : (
          <div className="divide-y">
            {trips.slice(0, 5).map(trip => {
              const statusCfg = TRIP_STATUS_CONFIG[trip.status] || TRIP_STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              return (
                <div key={trip._id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{trip.tripId}</p>
                    <p className="text-sm text-muted-foreground">
                      {trip.destination} - {trip.userDetails?.name || 'Unknown'}
                    </p>
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
