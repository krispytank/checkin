import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsAPI } from '../../lib/api.js';
import { Building, Plus, Edit, Trash2, Loader2, X } from 'lucide-react';

export default function AdminDepartmentsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [newName, setNewName] = useState('');

  const { data: departmentsData, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departmentsAPI.list();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => departmentsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
      setShowForm(false);
      setNewName('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => departmentsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
      setEditingDepartment(null);
      setNewName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => departmentsAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['departments']),
  });

  const departments = departmentsData?.data || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingDepartment) {
      updateMutation.mutate({ id: editingDepartment._id, data: { name: newName } });
    } else {
      createMutation.mutate({ name: newName });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-muted-foreground">Manage departments</p>
        </div>
        <button
          onClick={() => { setEditingDepartment(null); setNewName(''); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Department
        </button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : departments.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No departments created yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {departments.map((dept) => (
              <div key={dept._id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{dept.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingDepartment(dept); setNewName(dept.name); setShowForm(true); }}
                    className="p-1.5 rounded hover:bg-muted"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this department?')) deleteMutation.mutate(dept._id);
                    }}
                    className="p-1.5 rounded hover:bg-muted text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingDepartment ? 'Edit Department' : 'Add Department'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingDepartment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
