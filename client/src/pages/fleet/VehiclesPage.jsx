import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleAPI } from '../../lib/api.js';
import UserEmployeeSelect from '../../components/UserEmployeeSelect.jsx';
import { Plus, Search, Loader2, Car, X, Edit2, Trash2 } from 'lucide-react';

const VEHICLE_CATEGORIES = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: 'Van' },
  { value: 'truck', label: 'Truck' },
  { value: 'bus', label: 'Bus' },
];

const STATUS_CONFIG = {
  available: { label: 'Available', color: 'text-green-600', bg: 'bg-green-100' },
  booked: { label: 'Booked', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  'in-use': { label: 'In Use', color: 'text-blue-600', bg: 'bg-blue-100' },
  maintenance: { label: 'Maintenance', color: 'text-red-600', bg: 'bg-red-100' },
};

function VehicleForm({ vehicle, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    name: vehicle?.name || '',
    plateNumber: vehicle?.plateNumber || '',
    employeeNo: vehicle?.employeeNo || '',
    category: vehicle?.category || 'sedan',
    capacity: vehicle?.capacity || 4,
    description: vehicle?.description || '',
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
          <label className="block text-sm font-medium mb-1">Plate Number *</label>
          <input
            type="text"
            value={formData.plateNumber}
            onChange={e => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <UserEmployeeSelect
            value={formData.employeeNo}
            onChange={v => setFormData({ ...formData, employeeNo: v })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {VEHICLE_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Capacity</label>
          <input
            type="number"
            min="1"
            max="50"
            value={formData.capacity}
            onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
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
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : vehicle ? 'Update' : 'Add Vehicle'}
        </button>
      </div>
    </form>
  );
}

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['fleet', 'vehicles', { search }],
    queryFn: async () => {
      const res = await vehicleAPI.list({ search });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await vehicleAPI.create(formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'vehicles'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...formData }) => {
      const res = await vehicleAPI.update(id, formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'vehicles'] });
      setEditingVehicle(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await vehicleAPI.delete(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'vehicles'] });
      setDeleteConfirm(null);
    },
  });

  const vehicles = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Vehicles</h1>
          <p className="text-muted-foreground text-sm">Manage fleet vehicles</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search vehicles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm"
        />
      </div>

      {/* Form Modal */}
      {(showForm || editingVehicle) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button onClick={() => { setShowForm(false); setEditingVehicle(null); }} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <VehicleForm
              vehicle={editingVehicle}
              onSubmit={(data) => editingVehicle
                ? updateMutation.mutate({ id: editingVehicle._id, ...data })
                : createMutation.mutate(data)
              }
              onCancel={() => { setShowForm(false); setEditingVehicle(null); }}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Vehicle List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No vehicles found</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Plate</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Capacity</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vehicles.map(vehicle => {
                  const statusCfg = STATUS_CONFIG[vehicle.status] || STATUS_CONFIG.available;
                  return (
                    <tr key={vehicle._id} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">{vehicle.name}</td>
                      <td className="p-3">{vehicle.plateNumber}</td>
                      <td className="p-3 capitalize">{vehicle.category}</td>
                      <td className="p-3">{vehicle.capacity}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditingVehicle(vehicle)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(vehicle)}
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
            <h2 className="text-lg font-semibold mb-2">Delete Vehicle?</h2>
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
