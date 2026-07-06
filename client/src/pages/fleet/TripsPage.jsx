import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsAPI, vehicleAPI } from '../../lib/api.js';
import { Plus, Search, Loader2, MapPin, Clock, CheckCircle, Truck, X, ChevronDown, ChevronUp, Calendar, AlertCircle } from 'lucide-react';
import DateTimePopover from '../../components/DateTimePopover.jsx';

const TRIP_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
  approved: { label: 'Approved', color: 'text-blue-600', bg: 'bg-blue-100', icon: CheckCircle },
  'in-progress': { label: 'In Progress', color: 'text-purple-600', bg: 'bg-purple-100', icon: Truck },
  completed: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100', icon: X },
};

function TripForm({ onSubmit, onCancel, isSubmitting, error }) {
  const [formData, setFormData] = useState({
    destination: '',
    purpose: '',
    departureDate: '',
    returnDate: '',
    passengers: 1,
    vehicleId: '',
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['fleet', 'vehicles', 'available'],
    queryFn: async () => {
      const res = await vehicleAPI.available();
      return res.data;
    },
  });

  const vehicles = vehiclesData?.data || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error.response?.data?.message || error.message || 'Failed to create trip'}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Destination *</label>
          <input
            type="text"
            value={formData.destination}
            onChange={e => setFormData({ ...formData, destination: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Purpose *</label>
          <textarea
            value={formData.purpose}
            onChange={e => setFormData({ ...formData, purpose: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            rows={2}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Departure Date *</label>
          <DateTimePopover value={formData.departureDate} onChange={(val) => setFormData({ ...formData, departureDate: val })} label="Departure" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Return Date</label>
          <DateTimePopover value={formData.returnDate} onChange={(val) => setFormData({ ...formData, returnDate: val })} label="Return" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Passengers</label>
          <input
            type="number"
            min="1"
            max="50"
            value={formData.passengers}
            onChange={e => setFormData({ ...formData, passengers: parseInt(e.target.value) || 1 })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Vehicle</label>
          <select
            value={formData.vehicleId}
            onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">No vehicle assigned</option>
            {vehicles.map(v => (
              <option key={v._id} value={v._id}>{v.name} ({v.plateNumber})</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Trip'}
        </button>
      </div>
    </form>
  );
}

export default function TripsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedTrip, setExpandedTrip] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['fleet', 'trips', { status: statusFilter }],
    queryFn: async () => {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await tripsAPI.list(params);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await tripsAPI.create(formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'trips'] });
      setShowForm(false);
    },
    onError: (error) => {
      console.error('Failed to create trip:', error);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await tripsAPI.updateStatus(id, status);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'trips'] });
    },
  });

  const trips = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trips</h1>
          <p className="text-muted-foreground">Manage vehicle trips</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> New Trip
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {['', 'pending', 'approved', 'in-progress', 'completed', 'rejected'].map(status => {
          const cfg = status ? TRIP_STATUS_CONFIG[status] : null;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {cfg ? cfg.label : 'All'}
            </button>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Trip</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <TripForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setShowForm(false)}
              isSubmitting={createMutation.isPending}
              error={createMutation.error}
            />
          </div>
        </div>
      )}

      {/* Trip List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : trips.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No trips found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map(trip => {
            const statusCfg = TRIP_STATUS_CONFIG[trip.status] || TRIP_STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            const isExpanded = expandedTrip === trip._id;

            return (
              <div key={trip._id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30"
                  onClick={() => setExpandedTrip(isExpanded ? null : trip._id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">{trip.tripId}</p>
                      <p className="text-sm text-muted-foreground">{trip.destination}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                      <StatusIcon className="h-3 w-3" /> {statusCfg.label}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Purpose</p>
                        <p className="font-medium">{trip.purpose}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Requested By</p>
                        <p className="font-medium">{trip.userDetails?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Departure</p>
                        <p className="font-medium">{new Date(trip.departureDate).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Return</p>
                        <p className="font-medium">{trip.returnDate ? new Date(trip.returnDate).toLocaleString() : 'TBD'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Passengers</p>
                        <p className="font-medium">{trip.passengers}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vehicle</p>
                        <p className="font-medium">{trip.vehicleDetails?.name || 'Not assigned'}</p>
                      </div>
                    </div>

                    {/* Status Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {trip.status === 'pending' && (
                        <>
                          <button onClick={() => statusMutation.mutate({ id: trip._id, status: 'approved' })}
                            disabled={statusMutation.isPending}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                            Approve
                          </button>
                          <button onClick={() => statusMutation.mutate({ id: trip._id, status: 'rejected' })}
                            disabled={statusMutation.isPending}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
                            Reject
                          </button>
                        </>
                      )}
                      {trip.status === 'approved' && (
                        <button onClick={() => statusMutation.mutate({ id: trip._id, status: 'in-progress' })}
                          disabled={statusMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                          Start Trip
                        </button>
                      )}
                      {trip.status === 'in-progress' && (
                        <button onClick={() => statusMutation.mutate({ id: trip._id, status: 'completed' })}
                          disabled={statusMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                          Complete Trip
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
