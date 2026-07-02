import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stationsAPI } from '../../lib/api.js';
import LocationPickerMap from '../../components/LocationPickerMap.jsx';
import { MapPin, Plus, Edit, Trash2, Loader2, X } from 'lucide-react';

export default function AdminStationsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingStation, setEditingStation] = useState(null);

  const { data: stationsData, isLoading } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const response = await stationsAPI.list();
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => stationsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['stations']);
    },
  });

  const stations = stationsData?.data || [];

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this station?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Court Stations</h1>
          <p className="text-muted-foreground">Manage geo-fence locations</p>
        </div>
        <button
          onClick={() => { setEditingStation(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Station
        </button>
      </div>

      {/* Stations list */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stations.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No stations created yet</p>
          </div>
        ) : (
          stations.map((station) => (
            <div key={station._id} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{station.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Radius: {station.radiusMeters}m
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingStation(station); setShowForm(true); }}
                    className="p-1.5 rounded hover:bg-muted"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(station._id)}
                    className="p-1.5 rounded hover:bg-muted text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Mini map preview */}
              <StationMiniMap station={station} />

              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Station Form Modal */}
      {showForm && (
        <StationFormModal
          station={editingStation}
          onClose={() => { setShowForm(false); setEditingStation(null); }}
          onSuccess={() => {
            setShowForm(false);
            setEditingStation(null);
            queryClient.invalidateQueries(['stations']);
          }}
        />
      )}
    </div>
  );
}

function StationMiniMap({ station }) {
  const [MapComp, setMapComp] = useState(null);

  useState(() => {
    import('../../components/StationMiniMap.jsx').then(mod => {
      setMapComp(() => mod.default);
    });
  }, []);

  if (!MapComp) {
    return (
      <div className="h-32 rounded-lg bg-muted flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <MapComp station={station} />;
}

function StationFormModal({ station, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: station?.name || '',
    latitude: station?.latitude?.toString() || '',
    longitude: station?.longitude?.toString() || '',
    radiusMeters: station?.radiusMeters?.toString() || '100',
  });

  const createMutation = useMutation({
    mutationFn: (data) => station ? stationsAPI.update(station._id, data) : stationsAPI.create(data),
    onSuccess: () => onSuccess(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radiusMeters: parseInt(formData.radiusMeters),
    });
  };

  const handleLocationChange = (lat, lng) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{station ? 'Edit Station' : 'Create Station'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Radius (meters)</label>
            <input
              type="number"
              min="10"
              max="1000"
              value={formData.radiusMeters}
              onChange={(e) => setFormData(prev => ({ ...prev, radiusMeters: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Map Location Picker */}
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <LocationPickerMap
              latitude={formData.latitude}
              longitude={formData.longitude}
              radius={parseInt(formData.radiusMeters) || 100}
              onLocationChange={handleLocationChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                value={formData.latitude}
                onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                value={formData.longitude}
                onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {station ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
