import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parkingAPI, stationsAPI } from '../../lib/api.js';
import { Plus, Search, Loader2, MapPin, X, Edit2, Trash2, Car } from 'lucide-react';

const SPACE_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'handicap', label: 'Handicap' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'ev', label: 'EV Charging' },
];

const STATUS_CONFIG = {
  available: { label: 'Available', color: 'text-green-600', bg: 'bg-green-100' },
  occupied: { label: 'Occupied', color: 'text-red-600', bg: 'bg-red-100' },
  reserved: { label: 'Reserved', color: 'text-yellow-600', bg: 'bg-yellow-100' },
};

function ParkingForm({ space, onSubmit, onCancel, isSubmitting, stations }) {
  const [formData, setFormData] = useState({
    name: space?.name || '',
    zone: space?.zone || '',
    stationId: space?.stationId || '',
    type: space?.type || 'standard',
    description: space?.description || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Zone</label>
          <input
            type="text"
            value={formData.zone}
            onChange={e => setFormData({ ...formData, zone: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="e.g., Zone A"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Station *</label>
          <select
            value={formData.stationId}
            onChange={e => setFormData({ ...formData, stationId: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Select station</option>
            {stations.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {SPACE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          rows={2}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : space ? 'Update' : 'Add Space'}
        </button>
      </div>
    </form>
  );
}

export default function ParkingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['fleet', 'parking', { search, status: statusFilter }],
    queryFn: async () => {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await parkingAPI.list(params);
      return res.data;
    },
  });

  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const res = await stationsAPI.list();
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await parkingAPI.create(formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'parking'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...formData }) => {
      const res = await parkingAPI.update(id, formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'parking'] });
      setEditingSpace(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await parkingAPI.delete(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'parking'] });
      setDeleteConfirm(null);
    },
  });

  const spaces = data?.data || [];
  const stations = stationsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parking Management</h1>
          <p className="text-muted-foreground">Manage parking spaces across stations</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Add Space
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search parking spaces..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {['', 'available', 'occupied', 'reserved'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {status ? STATUS_CONFIG[status]?.label : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      {(showForm || editingSpace) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingSpace ? 'Edit Parking Space' : 'Add Parking Space'}</h2>
              <button onClick={() => { setShowForm(false); setEditingSpace(null); }} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ParkingForm
              space={editingSpace}
              stations={stations}
              onSubmit={(data) => editingSpace
                ? updateMutation.mutate({ id: editingSpace._id, ...data })
                : createMutation.mutate(data)
              }
              onCancel={() => { setShowForm(false); setEditingSpace(null); }}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Parking List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : spaces.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No parking spaces found</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Zone</th>
                  <th className="text-left p-3 font-medium">Station</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {spaces.map(space => {
                  const statusCfg = STATUS_CONFIG[space.status] || STATUS_CONFIG.available;
                  return (
                    <tr key={space._id} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">{space.name}</td>
                      <td className="p-3">{space.zone || '-'}</td>
                      <td className="p-3">{space.stationName}</td>
                      <td className="p-3 capitalize">{space.type}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditingSpace(space)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(space)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl text-center">
            <Trash2 className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-semibold mb-2">Delete Parking Space?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete <strong>{deleteConfirm.name}</strong>. This action cannot be undone.
            </p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm._id)} disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
