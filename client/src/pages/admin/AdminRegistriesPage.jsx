import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stationsAPI, registriesAPI } from '../../lib/api.js';
import { FolderOpen, Plus, Edit, Trash2, Loader2, X } from 'lucide-react';

export default function AdminRegistriesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRegistry, setEditingRegistry] = useState(null);

  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const response = await stationsAPI.list();
      return response.data;
    },
  });

  const { data: registriesData, isLoading } = useQuery({
    queryKey: ['registries'],
    queryFn: async () => {
      const response = await registriesAPI.list();
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => registriesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['registries']);
    },
  });

  const stations = stationsData?.data || [];
  const registries = registriesData?.data || [];

  const getStationName = (stationId) => {
    const station = stations.find(s => s._id === stationId);
    return station?.name || 'Unknown';
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this registry?')) {
      deleteMutation.mutate(id);
    }
  };

  // Group registries by station
  const grouped = registries.reduce((acc, reg) => {
    const key = reg.courtStationId;
    if (!acc[key]) acc[key] = { stationName: getStationName(key), registries: [] };
    acc[key].registries.push(reg);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Court Registries</h1>
          <p className="text-muted-foreground">Manage registries within each court station</p>
        </div>
        <button
          onClick={() => { setEditingRegistry(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Registry
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : registries.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No registries created yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([stationId, group]) => (
            <div key={stationId} className="rounded-xl border bg-card overflow-hidden">
              <div className="bg-muted/50 px-6 py-3 border-b">
                <h3 className="font-semibold text-sm">{group.stationName}</h3>
              </div>
              <div className="divide-y">
                {group.registries.map((registry) => (
                  <div key={registry._id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{registry.name}</p>
                        {registry.description && (
                          <p className="text-xs text-muted-foreground">{registry.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        registry.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {registry.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => { setEditingRegistry(registry); setShowForm(true); }}
                        className="p-1.5 rounded hover:bg-muted"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(registry._id)}
                        className="p-1.5 rounded hover:bg-muted text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RegistryFormModal
          registry={editingRegistry}
          stations={stations}
          onClose={() => { setShowForm(false); setEditingRegistry(null); }}
          onSuccess={() => {
            setShowForm(false);
            setEditingRegistry(null);
            queryClient.invalidateQueries(['registries']);
          }}
        />
      )}
    </div>
  );
}

function RegistryFormModal({ registry, stations, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: registry?.name || '',
    courtStationId: registry?.courtStationId || '',
    description: registry?.description || '',
    isActive: registry?.isActive !== undefined ? registry.isActive : true,
  });

  const createMutation = useMutation({
    mutationFn: (data) => registry
      ? registriesAPI.update(registry._id, data)
      : registriesAPI.create(data),
    onSuccess: () => onSuccess(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{registry ? 'Edit Registry' : 'Create Registry'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Court Station *</label>
            <select
              value={formData.courtStationId}
              onChange={(e) => setFormData(prev => ({ ...prev, courtStationId: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
              disabled={!!registry}
            >
              <option value="">Select station</option>
              {stations.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Registry Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Civil Registry"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-input"
            />
            <label htmlFor="isActive" className="text-sm font-medium">Active</label>
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
              {registry ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
