import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsAPI } from '../../lib/api.js';
import { Loader2, MapPin, Clock, CheckCircle, Truck, X, ChevronDown, ChevronUp, AlertCircle, Gauge } from 'lucide-react';

const TRIP_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
  approved: { label: 'Approved', color: 'text-blue-600', bg: 'bg-blue-100', icon: CheckCircle },
  'in-progress': { label: 'In Progress', color: 'text-purple-600', bg: 'bg-purple-100', icon: Truck },
  completed: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100', icon: X },
};

function MileageModal({ title, label, onSubmit, onCancel, isSubmitting, error, initialValue }) {
  const [value, setValue] = useState(initialValue || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(value);
    if (!num || num <= 0) return;
    onSubmit(num);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-5 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {error && (
          <div className="mb-3 p-2 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error.response?.data?.message || error.message || 'Failed to update'}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <div className="relative">
              <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                min="1"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full rounded-lg border bg-background pl-9 pr-3 py-2.5 text-sm"
                placeholder="e.g. 45000"
                autoFocus
                required
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Odometer reading in km</p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !value}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TripsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedTrip, setExpandedTrip] = useState(null);
  const [mileageModal, setMileageModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['fleet', 'trips', { status: statusFilter }],
    queryFn: async () => {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await tripsAPI.list(params);
      return res.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, extra }) => {
      const res = await tripsAPI.updateStatus(id, status, extra);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'trips'] });
      setMileageModal(null);
    },
  });

  const trips = data?.data || [];

  const handleStartTrip = (trip) => {
    setMileageModal({ tripId: trip._id, type: 'start', trip });
  };

  const handleCompleteTrip = (trip) => {
    setMileageModal({ tripId: trip._id, type: 'complete', trip });
  };

  const handleMileageSubmit = (value) => {
    if (!mileageModal) return;
    const { tripId, type } = mileageModal;
    if (type === 'start') {
      statusMutation.mutate({ id: tripId, status: 'in_progress', extra: { startingMileage: value } });
    } else {
      statusMutation.mutate({ id: tripId, status: 'completed', extra: { endingMileage: value } });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Trips</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage vehicle trips</p>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {['', 'pending', 'approved', 'in-progress', 'completed', 'rejected'].map(status => {
          const cfg = status ? TRIP_STATUS_CONFIG[status] : null;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-colors ${
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

      {/* Mileage Modal */}
      {mileageModal && (
        <MileageModal
          title={mileageModal.type === 'start' ? 'Start Trip — Record Mileage' : 'Complete Trip — Record Mileage'}
          label={mileageModal.type === 'start' ? 'Starting Mileage (Odometer)' : 'Ending Mileage (Odometer)'}
          initialValue={
            mileageModal.type === 'start'
              ? mileageModal.trip.startingMileage || ''
              : mileageModal.trip.startingMileage || ''
          }
          onSubmit={handleMileageSubmit}
          onCancel={() => setMileageModal(null)}
          isSubmitting={statusMutation.isPending}
          error={statusMutation.error}
        />
      )}

      {/* Trip List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : trips.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No trips found</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {trips.map(trip => {
            const statusCfg = TRIP_STATUS_CONFIG[trip.status] || TRIP_STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            const isExpanded = expandedTrip === trip._id;

            return (
              <div key={trip._id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-muted/30"
                  onClick={() => setExpandedTrip(isExpanded ? null : trip._id)}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{trip.tripId}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{trip.destination}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                      <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {statusCfg.label}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-3 sm:p-4 space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
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
                      {/* Mileage Info */}
                      {(trip.startingMileage || trip.endingMileage) && (
                        <>
                          <div>
                            <p className="text-muted-foreground">Starting Mileage</p>
                            <p className="font-medium flex items-center gap-1">
                              <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                              {trip.startingMileage ? `${trip.startingMileage.toLocaleString()} km` : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Ending Mileage</p>
                            <p className="font-medium flex items-center gap-1">
                              <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                              {trip.endingMileage ? `${trip.endingMileage.toLocaleString()} km` : '—'}
                            </p>
                          </div>
                          {trip.startingMileage && trip.endingMileage && (
                            <div className="sm:col-span-2">
                              <p className="text-muted-foreground">Distance Covered</p>
                              <p className="font-medium text-primary">
                                {(trip.endingMileage - trip.startingMileage).toLocaleString()} km
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Status Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {trip.status === 'pending' && (
                        <>
                          <button onClick={() => statusMutation.mutate({ id: trip._id, status: 'approved' })}
                            disabled={statusMutation.isPending}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98]">
                            Approve
                          </button>
                          <button onClick={() => statusMutation.mutate({ id: trip._id, status: 'rejected' })}
                            disabled={statusMutation.isPending}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 active:scale-[0.98]">
                            Reject
                          </button>
                        </>
                      )}
                      {trip.status === 'approved' && (
                        <button onClick={() => handleStartTrip(trip)}
                          disabled={statusMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 active:scale-[0.98]">
                          Start Trip
                        </button>
                      )}
                      {trip.status === 'in-progress' && (
                        <button onClick={() => handleCompleteTrip(trip)}
                          disabled={statusMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 active:scale-[0.98]">
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
