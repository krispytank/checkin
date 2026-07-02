import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsAPI, usersAPI } from '../../lib/api.js';
import { cn } from '../../lib/utils.js';
import { Calendar, Plus, Edit, Trash2, Loader2, X, Users } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminShiftsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  const { data: shiftsData, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const response = await shiftsAPI.list();
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => shiftsAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['shifts']),
  });

  const shifts = shiftsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shift Templates</h1>
          <p className="text-muted-foreground">Manage shift templates</p>
        </div>
        <button
          onClick={() => { setEditingShift(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Shift
        </button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No shifts created yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Days</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Assigned</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift._id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{shift.name}</td>
                    <td className="px-4 py-3 text-sm">{shift.startTime} - {shift.endTime}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {shift.applicableDays?.map(day => (
                          <span key={day} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {DAYS[day]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {shift.assignmentCount || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingShift(shift); setShowForm(true); }}
                          className="p-1.5 rounded hover:bg-muted"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this shift?')) deleteMutation.mutate(shift._id);
                          }}
                          className="p-1.5 rounded hover:bg-muted text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <ShiftFormModal
          shift={editingShift}
          onClose={() => { setShowForm(false); setEditingShift(null); }}
          onSuccess={() => {
            setShowForm(false);
            setEditingShift(null);
            queryClient.invalidateQueries(['shifts']);
          }}
        />
      )}
    </div>
  );
}

function ShiftFormModal({ shift, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: shift?.name || '',
    startTime: shift?.startTime || '08:00',
    endTime: shift?.endTime || '17:00',
    applicableDays: shift?.applicableDays || [1, 2, 3, 4, 5],
  });

  const createMutation = useMutation({
    mutationFn: (data) => shift ? shiftsAPI.update(shift._id, data) : shiftsAPI.create(data),
    onSuccess: () => onSuccess(),
  });

  const toggleDay = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      applicableDays: prev.applicableDays.includes(dayIndex)
        ? prev.applicableDays.filter(d => d !== dayIndex)
        : [...prev.applicableDays, dayIndex],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{shift ? 'Edit Shift' : 'Create Shift'}</h3>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Applicable Days</label>
            <div className="flex gap-2">
              {DAYS.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    formData.applicableDays.includes(index)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {day}
                </button>
              ))}
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
              {shift ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
