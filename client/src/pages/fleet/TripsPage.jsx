import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsAPI, vehicleAPI } from '../../lib/api.js';
import { Loader2, MapPin, Clock, CheckCircle, Truck, X, ChevronDown, ChevronUp, AlertCircle, Gauge, Plus } from 'lucide-react';

const STATUS_CONFIG = {
  out: { label: 'Out', color: 'text-amber-600', bg: 'bg-amber-100', icon: Truck },
  completed: { label: 'Returned', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
};

function MileageModal({ title, label, onSubmit, onCancel, isSubmitting, error }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(value ? parseInt(value) : null);
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
                placeholder="Optional — e.g. 45000"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Odometer reading in km (optional)</p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DepartureModal({ onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    vehicleId: '',
    destination: '',
    purpose: '',
    departureDate: '',
    startingMileage: '',
    passengers: '',
  });

  const { data: vehiclesData, isLoading: loadingVehicles } = useQuery({
    queryKey: ['fleet', 'vehicles'],
    queryFn: async () => {
      const res = await vehicleAPI.list();
      return res.data;
    },
  });

  const vehicles = (vehiclesData?.data || []).filter(v => v.status !== 'retired' && v.vehicleType === 'gov');

  const createMutation = useMutation({
    mutationFn: (data) => tripsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'trips'] });
      onSuccess();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      destination: formData.destination.trim(),
      purpose: formData.purpose.trim(),
      departureDate: formData.departureDate,
    };
    if (formData.vehicleId) payload.vehicleId = formData.vehicleId;
    if (formData.startingMileage) payload.startingMileage = parseInt(formData.startingMileage);
    if (formData.passengers.trim()) {
      payload.passengers = formData.passengers.split(',').map(p => p.trim()).filter(Boolean);
    }
    createMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Record Vehicle Departure</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        {createMutation.isError && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {createMutation.error.response?.data?.message || 'Failed to record departure'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vehicle</label>
            {loadingVehicles ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2.5">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicles...
              </div>
            ) : (
              <select value={formData.vehicleId} onChange={e => setFormData(p => ({ ...p, vehicleId: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Select vehicle (optional)</option>
                {vehicles.map(v => (
                  <option key={v._id} value={v._id}>{v.name} — {v.registrationNumber}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Destination *</label>
            <input type="text" value={formData.destination} onChange={e => setFormData(p => ({ ...p, destination: e.target.value }))}
              placeholder="e.g. Milimani Law Courts" required
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Purpose *</label>
            <textarea value={formData.purpose} onChange={e => setFormData(p => ({ ...p, purpose: e.target.value }))}
              rows={2} placeholder="Why is this trip needed?" required
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Departure Date & Time *</label>
            <input type="datetime-local" value={formData.departureDate} onChange={e => setFormData(p => ({ ...p, departureDate: e.target.value }))}
              required className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Starting Mileage (Odometer)</label>
            <div className="relative">
              <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="number" min="0" value={formData.startingMileage}
                onChange={e => setFormData(p => ({ ...p, startingMileage: e.target.value }))}
                placeholder="Optional — e.g. 45000"
                className="w-full rounded-lg border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Odometer reading in km (optional)</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Passengers</label>
            <input type="text" value={formData.passengers} onChange={e => setFormData(p => ({ ...p, passengers: e.target.value }))}
              placeholder="Comma-separated names (optional)"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <p className="text-[10px] text-muted-foreground mt-1">Separate multiple names with commas</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Departure
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
  const [showForm, setShowForm] = useState(false);

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

  const handleReturn = (trip) => {
    setMileageModal({ tripId: trip._id, trip });
  };

  const handleMileageSubmit = (endingMileage) => {
    if (!mileageModal) return;
    const extra = {};
    if (endingMileage !== null) extra.endingMileage = endingMileage;
    statusMutation.mutate({ id: mileageModal.tripId, status: 'completed', extra });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Vehicle Trips</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Record vehicle departures and returns</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 active:scale-[0.98]">
          <Plus className="h-4 w-4" /> Record Departure
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {['', 'out', 'completed'].map(status => {
          const cfg = status ? STATUS_CONFIG[status] : null;
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

      {showForm && (
        <DepartureModal onClose={() => setShowForm(false)} onSuccess={() => setShowForm(false)} />
      )}

      {mileageModal && (
        <MileageModal
          title="Record Return — Mileage"
          label="Ending Mileage (Odometer)"
          onSubmit={handleMileageSubmit}
          onCancel={() => setMileageModal(null)}
          isSubmitting={statusMutation.isPending}
          error={statusMutation.error}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : trips.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No trips recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {trips.map(trip => {
            const statusCfg = STATUS_CONFIG[trip.status] || STATUS_CONFIG.out;
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
                      <p className="font-medium text-sm sm:text-base truncate">{trip.destination}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {trip.purpose}
                        {trip.vehicleDetails && ` • ${trip.vehicleDetails.name}`}
                      </p>
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
                        <p className="text-muted-foreground">Vehicle</p>
                        <p className="font-medium">{trip.vehicleDetails ? `${trip.vehicleDetails.name} (${trip.vehicleDetails.registrationNumber})` : 'Not assigned'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Destination</p>
                        <p className="font-medium">{trip.destination}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Purpose</p>
                        <p className="font-medium">{trip.purpose}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Recorded By</p>
                        <p className="font-medium">{trip.userDetails?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Departure</p>
                        <p className="font-medium">{new Date(trip.departureDate).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Return</p>
                        <p className="font-medium">{trip.actualReturn ? new Date(trip.actualReturn).toLocaleString() : trip.returnDate ? new Date(trip.returnDate).toLocaleString() : '—'}</p>
                      </div>
                      {trip.passengers?.length > 0 && (
                        <div className="sm:col-span-2">
                          <p className="text-muted-foreground">Passengers</p>
                          <p className="font-medium">{Array.isArray(trip.passengers) ? trip.passengers.join(', ') : trip.passengers}</p>
                        </div>
                      )}
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

                    {trip.status === 'out' && (
                      <div className="flex gap-2 pt-2 border-t">
                        <button onClick={() => handleReturn(trip)}
                          disabled={statusMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 active:scale-[0.98]">
                          Record Return
                        </button>
                      </div>
                    )}
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
