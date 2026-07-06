import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentAPI } from '../../lib/api.js';
import { Plus, Search, Loader2, Package, X, Edit2, Trash2, Upload } from 'lucide-react';
import CsvImportModal from '../../components/CsvImportModal.jsx';

const STATUS_CONFIG = {
  available: { label: 'Available', color: 'text-green-600', bg: 'bg-green-100' },
  booked: { label: 'Booked', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  'in-use': { label: 'In Use', color: 'text-blue-600', bg: 'bg-blue-100' },
  maintenance: { label: 'Maintenance', color: 'text-red-600', bg: 'bg-red-100' },
};

function EquipmentForm({ item, types, onSubmit, onCancel, isSubmitting }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: item?.name || '',
    type: item?.type || '',
    serialNumber: item?.serialNumber || '',
    description: item?.description || '',
  });
  const [typeInput, setTypeInput] = useState(item?.type || '');
  const [typeOpen, setTypeOpen] = useState(false);

  const filteredTypes = types.filter(t =>
    t.toLowerCase().includes(typeInput.toLowerCase())
  );
  const exactMatch = types.some(t => t.toLowerCase() === typeInput.toLowerCase());

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, type: typeInput.trim() });
  };

  const handleTypeSelect = (t) => {
    setTypeInput(t);
    setFormData(f => ({ ...f, type: t }));
    setTypeOpen(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium mb-1">Type *</label>
          <input
            type="text"
            value={typeInput}
            onChange={e => { setTypeInput(e.target.value); setTypeOpen(true); }}
            onFocus={() => setTypeOpen(true)}
            onBlur={() => setTimeout(() => setTypeOpen(false), 200)}
            placeholder="e.g. Screen, Projector..."
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
          {typeOpen && typeInput.trim() && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border bg-card shadow-lg max-h-40 overflow-y-auto">
              {filteredTypes.map(t => (
                <button key={t} type="button" onClick={() => handleTypeSelect(t)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
                  {t}
                </button>
              ))}
              {!exactMatch && (
                <button type="button" onClick={() => handleTypeSelect(typeInput.trim())}
                  className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-primary/5 border-t transition-colors">
                  <Plus className="inline h-3 w-3 mr-1" /> Create "{typeInput.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Serial Number *</label>
          <input
            type="text"
            value={formData.serialNumber}
            onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
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
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : item ? 'Update' : 'Add Equipment'}
        </button>
      </div>
    </form>
  );
}

export default function AdminEquipmentItemsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showCsvUpload, setShowCsvUpload] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['equipment', { search }],
    queryFn: async () => {
      const res = await equipmentAPI.list({ search });
      return res.data;
    },
  });

  const { data: typesData } = useQuery({
    queryKey: ['equipmentTypes'],
    queryFn: async () => {
      const res = await equipmentAPI.getTypes();
      return res.data;
    },
  });

  const types = typesData?.data || [];

  const [formError, setFormError] = useState(null);

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await equipmentAPI.create(formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setShowForm(false);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(err?.response?.data?.message || 'Failed to add equipment');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...formData }) => {
      const res = await equipmentAPI.update(id, formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setEditingItem(null);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(err?.response?.data?.message || 'Failed to update equipment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await equipmentAPI.delete(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setDeleteConfirm(null);
    },
  });

  const items = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipment Items</h1>
          <p className="text-muted-foreground">Manage equipment inventory</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCsvUpload(true)}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <button onClick={() => { setFormError(null); setShowForm(true); }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Equipment
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search equipment..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm"
        />
      </div>

      {(showForm || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingItem ? 'Edit Equipment' : 'Add Equipment'}</h2>
              <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            {formError && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {formError}
              </div>
            )}
            <EquipmentForm
              item={editingItem}
              types={types}
              onSubmit={(data) => editingItem
                ? updateMutation.mutate({ id: editingItem._id, ...data })
                : createMutation.mutate(data)
              }
              onCancel={() => { setShowForm(false); setEditingItem(null); }}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      )}

      <CsvImportModal
        isOpen={showCsvUpload}
        onClose={() => setShowCsvUpload(false)}
        title="Import Equipment"
        description="Bulk import equipment items from a CSV file"
        requiredColumns={['name', 'serialNumber']}
        optionalColumns={['type', 'description']}
        sampleRows={['Projector, SN12345, Screen, High-resolution projector']}
        apiMethod={(formData) => equipmentAPI.uploadCsv(formData).then(res => res.data)}
        queryKey={['equipment']}
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No equipment found</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Serial #</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map(item => {
                  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.available;
                  return (
                    <tr key={item._id} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3">{item.type || '-'}</td>
                      <td className="p-3 text-muted-foreground">{item.serialNumber || '-'}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setFormError(null); setEditingItem(item); }}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(item)}
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

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl text-center">
            <Trash2 className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-semibold mb-2">Delete Equipment?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete <strong>{deleteConfirm.name}</strong>.
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
