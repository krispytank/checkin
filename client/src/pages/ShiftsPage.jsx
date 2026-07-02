import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsAPI, usersAPI } from '../lib/api.js';
import { cn } from '../lib/utils.js';
import { Calendar, Plus, Users, Loader2, Edit, Trash2, X } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ShiftsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);

  // Get shifts
  const { data: shiftsData, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const response = await shiftsAPI.list();
      return response.data;
    },
  });

  // Get users
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await usersAPI.list({ limit: 100 });
      return response.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => shiftsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
    },
  });

  const shifts = shiftsData?.data || [];
  const users = usersData?.data || [];

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this shift?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shifts</h1>
          <p className="text-muted-foreground">Manage shift templates and assignments</p>
        </div>
        <button
          onClick={() => { setEditingShift(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Shift
        </button>
      </div>

      {/* Shifts list */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No shifts created yet</p>
          </div>
        ) : (
          shifts.map((shift) => (
            <div key={shift._id} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{shift.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {shift.startTime} - {shift.endTime}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingShift(shift); setShowForm(true); }}
                    className="p-1.5 rounded hover:bg-muted"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(shift._id)}
                    className="p-1.5 rounded hover:bg-muted text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-1 mb-4">
                {DAYS.map((day, index) => (
                  <span
                    key={day}
                    className={cn(
                      "text-xs px-2 py-1 rounded",
                      shift.applicableDays?.includes(index)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {day}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {shift.assignmentCount || 0} assigned
                </div>
                <button
                  onClick={() => setShowAssignModal(shift)}
                  className="text-sm text-primary hover:underline"
                >
                  Assign users
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Shift Form Modal */}
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

      {/* Assign Modal */}
      {showAssignModal && (
        <AssignModal
          shift={showAssignModal}
          users={users}
          onClose={() => setShowAssignModal(null)}
          onSuccess={() => {
            setShowAssignModal(null);
            queryClient.invalidateQueries(['shifts']);
          }}
        />
      )}
    </div>
  );
}

function ShiftFormModal({ shift, onClose, onSuccess }) {
  const queryClient = useQueryClient();
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

function AssignModal({ shift, users, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState('');

  const assignMutation = useMutation({
    mutationFn: ({ userId, shiftId }) => shiftsAPI.assign(userId, shiftId),
    onSuccess: () => onSuccess(),
  });

  const handleAssign = () => {
    if (selectedUser) {
      assignMutation.mutate({ userId: selectedUser, shiftId: shift._id });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Assign Shift: {shift.name}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select User</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a user</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>{user.name} ({user.employeeId})</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedUser || assignMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
