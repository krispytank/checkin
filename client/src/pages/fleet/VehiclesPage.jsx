import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleAPI, maintenanceAPI } from '../../lib/api.js';
import UserEmployeeSelect from '../../components/UserEmployeeSelect.jsx';
import { Input, Select, Textarea, FormField } from '../../components/ui/index.js';
import { Plus, Search, Loader2, Car, X, Edit2, Trash2, Wrench, RotateCcw, AlertCircle } from 'lucide-react';

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

const MAINTENANCE_TYPES = [
  { value: 'scheduled_service', label: 'Scheduled Service' },
  { value: 'repair', label: 'Repair' },
  { value: 'tyre_replacement', label: 'Tyre Replacement' },
  { value: 'battery_replacement', label: 'Battery Replacement' },
  { value: 'oil_service', label: 'Oil Service' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
];

function VehicleForm({ vehicle, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    name: vehicle?.name || '',
    plateNumber: vehicle?.plateNumber || '',
    vehicleType: vehicle?.vehicleType || 'gov',
    pjNumber: vehicle?.pjNumber || '',
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
        <FormField label="Name" required>
          <Input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Plate Number" required>
          <Input
            type="text"
            value={formData.plateNumber}
            onChange={e => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
            required
          />
        </FormField>
        <FormField label="Vehicle Type" required>
          <Select value={formData.vehicleType} onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}>
            <option value="gov">Government</option>
            <option value="personal">Personal</option>
          </Select>
        </FormField>
        {formData.vehicleType === 'personal' && (
          <FormField label="PJ Number" required>
            <Input
              type="text"
              value={formData.pjNumber}
              onChange={e => setFormData({ ...formData, pjNumber: e.target.value.toUpperCase() })}
              placeholder="e.g. PJ12345"
              required={formData.vehicleType === 'personal'}
            />
          </FormField>
        )}
        <div className="sm:col-span-2">
          <UserEmployeeSelect
            value={formData.employeeNo}
            onChange={v => setFormData({ ...formData, employeeNo: v })}
          />
        </div>
        <FormField label="Category">
          <Select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
            {VEHICLE_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Capacity">
          <Input
            type="number"
            min="1"
            max="50"
            value={formData.capacity}
            onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })}
          />
        </FormField>
      </div>
      <FormField label="Description">
        <Textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </FormField>
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

function MaintenanceModal({ vehicle, onSubmit, onCancel, isSubmitting, error }) {
  const [formData, setFormData] = useState({
    type: 'scheduled_service',
    description: '',
    scheduledDate: '',
    cost: '',
    provider: '',
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      vehicleId: vehicle._id,
      type: formData.type,
      description: formData.description || undefined,
      scheduledDate: formData.scheduledDate || undefined,
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      provider: formData.provider || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-orange-500" />
            <h2 className="text-base sm:text-lg font-semibold">Send to Maintenance</h2>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4">
          Mark <strong>{vehicle.name}</strong> ({vehicle.plateNumber}) as under maintenance.
        </p>
        {error && (
          <div className="mb-3 p-2 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error.response?.data?.message || error.message || 'Failed to submit'}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Maintenance Type" required>
            <Select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
              {MAINTENANCE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Description">
            <Textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the maintenance issue..."
              rows={2}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Scheduled Date">
              <Input
                type="date"
                value={formData.scheduledDate}
                onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
              />
            </FormField>
            <FormField label="Estimated Cost">
              <Input
                type="number"
                min="0"
                value={formData.cost}
                onChange={e => setFormData({ ...formData, cost: e.target.value })}
                placeholder="KES"
              />
            </FormField>
          </div>
          <FormField label="Service Provider">
            <Input
              type="text"
              value={formData.provider}
              onChange={e => setFormData({ ...formData, provider: e.target.value })}
              placeholder="Garage / Workshop name"
            />
          </FormField>
          <FormField label="Notes">
            <Textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [maintenanceVehicle, setMaintenanceVehicle] = useState(null);
  const [returnVehicle, setReturnVehicle] = useState(null);

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

  const sendToMaintenanceMutation = useMutation({
    mutationFn: async (data) => {
      const [maintenanceRes] = await Promise.all([
        maintenanceAPI.create(data),
        vehicleAPI.update(data.vehicleId, { status: 'maintenance' }),
      ]);
      return maintenanceRes.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-dashboard'] });
      setMaintenanceVehicle(null);
    },
  });

  const returnFromMaintenanceMutation = useMutation({
    mutationFn: async (vehicleId) => {
      const res = await vehicleAPI.update(vehicleId, { status: 'available' });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-dashboard'] });
      setReturnVehicle(null);
    },
  });

  const vehicles = data?.data || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Vehicles</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage fleet vehicles</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-emerald-700 active:scale-[0.98]">
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search vehicles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Form Modal */}
      {(showForm || editingVehicle) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold">{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
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

      {/* Maintenance Modal */}
      {maintenanceVehicle && (
        <MaintenanceModal
          vehicle={maintenanceVehicle}
          onSubmit={(data) => sendToMaintenanceMutation.mutate(data)}
          onCancel={() => setMaintenanceVehicle(null)}
          isSubmitting={sendToMaintenanceMutation.isPending}
          error={sendToMaintenanceMutation.error}
        />
      )}

      {/* Return from Maintenance Confirmation */}
      {returnVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-5 shadow-xl text-center">
            <RotateCcw className="h-10 w-10 mx-auto mb-3 text-green-500" />
            <h2 className="text-lg font-semibold mb-2">Return to Service?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Mark <strong>{returnVehicle.name}</strong> as <strong>Available</strong> and return it to circulation.
            </p>
            {returnFromMaintenanceMutation.error && (
              <div className="mb-3 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                {returnFromMaintenanceMutation.error.response?.data?.message || 'Failed to update'}
              </div>
            )}
            <div className="flex justify-center gap-2">
              <button onClick={() => setReturnVehicle(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={() => returnFromMaintenanceMutation.mutate(returnVehicle._id)}
                disabled={returnFromMaintenanceMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                {returnFromMaintenanceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Return to Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No vehicles found</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Plate</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Category</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Capacity</th>
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
                      <td className="p-3 font-mono text-xs">{vehicle.plateNumber}</td>
                      <td className="p-3 capitalize hidden sm:table-cell">{vehicle.category}</td>
                      <td className="p-3 hidden sm:table-cell">{vehicle.capacity}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          {vehicle.status !== 'maintenance' && vehicle.status !== 'in-use' && (
                            <button onClick={() => setMaintenanceVehicle(vehicle)}
                              title="Send to Maintenance"
                              className="p-1.5 rounded hover:bg-orange-50 text-muted-foreground hover:text-orange-600">
                              <Wrench className="h-4 w-4" />
                            </button>
                          )}
                          {vehicle.status === 'maintenance' && (
                            <button onClick={() => setReturnVehicle(vehicle)}
                              title="Return to Service"
                              className="p-1.5 rounded hover:bg-green-50 text-muted-foreground hover:text-green-600">
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
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
          <div className="w-full max-w-sm rounded-xl bg-card p-5 shadow-xl text-center">
            <Trash2 className="h-10 w-10 mx-auto mb-3 text-destructive" />
            <h2 className="text-lg font-semibold mb-2">Delete Vehicle?</h2>
            <p className="text-sm text-muted-foreground mb-5">
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
