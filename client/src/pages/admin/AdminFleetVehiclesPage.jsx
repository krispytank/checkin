import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleAPI } from '../../lib/api.js';
import VehicleQRPreview from '../../components/VehicleQRPreview.jsx';
import UserEmployeeSelect from '../../components/UserEmployeeSelect.jsx';
import { Plus, Search, Loader2, Car, X, Edit2, QrCode, Download, Ban, RotateCcw, Calendar } from 'lucide-react';

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
  deactivated: { label: 'Deactivated', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const QR_STATUS_CONFIG = {
  active: { label: 'Active', color: 'text-green-600', bg: 'bg-green-100' },
  inactive: { label: 'Not Generated', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  revoked: { label: 'Revoked', color: 'text-red-600', bg: 'bg-red-100' },
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
          <input type="text" value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Plate Number *</label>
          <input type="text" value={formData.plateNumber}
            onChange={e => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm" required />
        </div>
        <div className="sm:col-span-2">
          <UserEmployeeSelect
            value={formData.employeeNo}
            onChange={v => setFormData({ ...formData, employeeNo: v })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
            {VEHICLE_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Capacity</label>
          <input type="number" min="1" max="50" value={formData.capacity}
            onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm" rows={2} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors">Cancel</button>
        <button type="submit" disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : vehicle ? 'Update' : 'Add Vehicle'}
        </button>
      </div>
    </form>
  );
}

export default function AdminFleetVehiclesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState(null);
  const [reactivateConfirm, setReactivateConfirm] = useState(null);
  const [qrPreviewVehicle, setQrPreviewVehicle] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const currentYear = new Date().getFullYear();

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

  const deactivateMutation = useMutation({
    mutationFn: async (id) => {
      const res = await vehicleAPI.deactivate(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'vehicles'] });
      setDeactivateConfirm(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id) => {
      const res = await vehicleAPI.reactivate(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'vehicles'] });
      setReactivateConfirm(null);
    },
  });

  const generateYearMutation = useMutation({
    mutationFn: async () => {
      const res = await vehicleAPI.generateYearQR();
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'vehicles'] });
    },
  });

  const generateSingleMutation = useMutation({
    mutationFn: async (id) => {
      const res = await vehicleAPI.generateQR(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'vehicles'] });
    },
  });

  const vehicles = data?.data || [];
  const vehiclesNeedingQR = vehicles.filter(
    (v) => v.status !== 'deactivated' && (v.qrStatus !== 'active' || v.qrGeneratedYear !== currentYear)
  );

  async function handleExportAll() {
    const ids = selectedIds.length > 0 ? selectedIds : vehicles.map((v) => v._id);
    if (ids.length === 0) return;

    try {
      const res = await vehicleAPI.exportQRPdfBatch(ids);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'vehicle-qr-stickers.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Batch PDF export failed:', err);
    }
  }

  function toggleSelectAll() {
    if (selectedIds.length === vehicles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(vehicles.map((v) => v._id));
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Fleet Vehicles</h1>
          <p className="text-muted-foreground text-sm">Manage court fleet vehicles</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {vehiclesNeedingQR.length > 0 && (
            <button
              onClick={() => generateYearMutation.mutate()}
              disabled={generateYearMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              {generateYearMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Generate QR for {currentYear}</span>
              <span className="sm:hidden">QR {currentYear}</span>
              <span className="text-xs">({vehiclesNeedingQR.length})</span>
            </button>
          )}
          <button onClick={handleExportAll}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export All QR</span><span className="sm:hidden">Export</span>
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Vehicle</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Search vehicles..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm" />
      </div>

      {(showForm || editingVehicle) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button onClick={() => { setShowForm(false); setEditingVehicle(null); }} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <VehicleForm vehicle={editingVehicle}
              onSubmit={(data) => editingVehicle
                ? updateMutation.mutate({ id: editingVehicle._id, ...data })
                : createMutation.mutate(data)
              }
              onCancel={() => { setShowForm(false); setEditingVehicle(null); }}
              isSubmitting={createMutation.isPending || updateMutation.isPending} />
          </div>
        </div>
      )}

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
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === vehicles.length && vehicles.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Plate</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Capacity</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">QR Status</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vehicles.map(vehicle => {
                  const statusCfg = STATUS_CONFIG[vehicle.status] || STATUS_CONFIG.available;
                  const qrCfg = QR_STATUS_CONFIG[vehicle.qrStatus] || QR_STATUS_CONFIG.inactive;
                  const isDeactivated = vehicle.status === 'deactivated';
                  return (
                    <tr key={vehicle._id} className={`hover:bg-muted/30 ${isDeactivated ? 'opacity-60' : ''}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(vehicle._id)}
                          onChange={() => toggleSelect(vehicle._id)}
                          className="rounded"
                          disabled={isDeactivated}
                        />
                      </td>
                      <td className="p-3 font-medium">{vehicle.name}</td>
                      <td className="p-3">{vehicle.plateNumber}</td>
                      <td className="p-3 capitalize">{vehicle.category}</td>
                      <td className="p-3">{vehicle.capacity}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${qrCfg.bg} ${qrCfg.color}`}>
                            {qrCfg.label}
                          </span>
                          {vehicle.qrGeneratedYear && (
                            <span className="text-xs text-muted-foreground">({vehicle.qrGeneratedYear})</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {vehicle.qrStatus === 'active' && vehicle.qrGeneratedYear === currentYear && (
                            <button
                              onClick={() => setQrPreviewVehicle(vehicle)}
                              className="p-1.5 rounded hover:bg-muted text-emerald-600 hover:text-emerald-700"
                              title="View/Print QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                          )}
                          {(!vehicle.qrCode || vehicle.qrStatus !== 'active' || vehicle.qrGeneratedYear !== currentYear) && !isDeactivated && (
                            <button
                              onClick={() => generateSingleMutation.mutate(vehicle._id)}
                              disabled={generateSingleMutation.isPending}
                              className="p-1.5 rounded hover:bg-muted text-emerald-600 hover:text-emerald-700"
                              title={`Generate QR for ${currentYear}`}
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                          )}
                          {!isDeactivated ? (
                            <>
                              <button onClick={() => setEditingVehicle(vehicle)}
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeactivateConfirm(vehicle)}
                                className="p-1.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"
                                title="Deactivate vehicle">
                                <Ban className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => setReactivateConfirm(vehicle)}
                              className="p-1.5 rounded hover:bg-green-100 text-muted-foreground hover:text-green-600"
                              title="Reactivate vehicle">
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selectedIds.length > 0 && (
            <div className="p-3 border-t bg-muted/30 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
              <button
                onClick={handleExportAll}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Export Selected QR
              </button>
            </div>
          )}
        </div>
      )}

      {deactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl text-center">
            <Ban className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold mb-2">Deactivate Vehicle?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This will deactivate <strong>{deactivateConfirm.name}</strong> and revoke its QR code.
              The vehicle will no longer be able to check in/out.
            </p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setDeactivateConfirm(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={() => deactivateMutation.mutate(deactivateConfirm._id)} disabled={deactivateMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {deactivateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl text-center">
            <RotateCcw className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-lg font-semibold mb-2">Reactivate Vehicle?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This will reactivate <strong>{reactivateConfirm.name}</strong>. A new QR code will need to be generated for {currentYear}.
            </p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setReactivateConfirm(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={() => reactivateMutation.mutate(reactivateConfirm._id)} disabled={reactivateMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                {reactivateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrPreviewVehicle && (
        <VehicleQRPreview
          vehicleId={qrPreviewVehicle._id}
          vehicleName={qrPreviewVehicle.name}
          plateNumber={qrPreviewVehicle.plateNumber}
          onClose={() => setQrPreviewVehicle(null)}
        />
      )}
    </div>
  );
}
