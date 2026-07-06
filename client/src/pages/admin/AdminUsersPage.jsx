import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI, stationsAPI, jobTitlesAPI, departmentsAPI } from '../../lib/api.js';
import { cn } from '../../lib/utils.js';
import { toast } from '../../lib/useToast.js';
import { Users, Plus, Search, Edit, Trash2, Loader2, X, Filter, Upload, Download, Shield, Eye, EyeOff } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect.jsx';
import ModuleAccessManager from '../../components/ModuleAccessManager.jsx';
import CsvImportModal from '../../components/CsvImportModal.jsx';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [showModuleAccess, setShowModuleAccess] = useState(false);
  const [selectedUserForModules, setSelectedUserForModules] = useState(null);

  // Get users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', search, filterRole],
    queryFn: async () => {
      const params = { limit: 100 };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      const response = await usersAPI.list(params);
      return response.data;
    },
  });

  // Get stations for dropdown
  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const response = await stationsAPI.list();
      return response.data;
    },
  });

  // Get job titles for dropdown
  const { data: jobTitlesData } = useQuery({
    queryKey: ['jobTitles'],
    queryFn: async () => {
      const response = await jobTitlesAPI.list();
      return response.data;
    },
  });

  // Get departments for dropdown
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departmentsAPI.list();
      return response.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => usersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User Deleted', 'The user has been deactivated.');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete user.';
      toast.error('Delete Failed', message);
    },
  });

  // Bulk create mutation
  const bulkCreateMutation = useMutation({
    mutationFn: (users) => usersAPI.createBulk(users),
    onSuccess: (response) => {
      const { created, failed, errors } = response.data.data;
      queryClient.invalidateQueries(['users']);
      if (failed === 0) {
        toast.success('Upload Complete', `Successfully created ${created} user(s).`);
      } else {
        toast.warning('Partial Upload', `${created} created, ${failed} failed. Check details below.`);
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to upload users.';
      toast.error('Upload Failed', message);
    },
  });

  const users = usersData?.data || [];
  const stations = stationsData?.data || [];
  const jobTitles = jobTitlesData?.data || [];
  const departments = departmentsData?.data || [];

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to deactivate this user?')) {
      deleteMutation.mutate(id);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      supervisor: 'bg-blue-100 text-blue-800',
      user: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || colors.user;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Create and manage user accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCsvUpload(true)}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={() => { setEditingUser(null); setShowForm(true); }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="supervisor">Supervisor</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Users table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Employee ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Department</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Station</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Modules</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-mono">{user.employeeId}</td>
                    <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        getRoleBadgeColor(user.role)
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{user.department || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {stations.find(s => s._id === user.stationId)?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {user.moduleAccess?.attendance?.enabled && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                            Attendance
                          </span>
                        )}
                        {user.moduleAccess?.equipment?.enabled && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                            Equipment
                          </span>
                        )}
                        {user.moduleAccess?.fleet?.enabled && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            Fleet
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedUserForModules(user); setShowModuleAccess(true); }}
                          className="p-1.5 rounded hover:bg-muted text-primary"
                          title="Module Access"
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setEditingUser(user); setShowForm(true); }}
                          className="p-1.5 rounded hover:bg-muted"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
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

      {/* User Form Modal */}
      {showForm && (
        <UserFormModal
          user={editingUser}
          stations={stations}
          jobTitles={jobTitles}
          departments={departments}
          onClose={() => { setShowForm(false); setEditingUser(null); }}
          onSuccess={() => {
            setShowForm(false);
            setEditingUser(null);
            queryClient.invalidateQueries(['users']);
          }}
        />
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={showCsvUpload}
        onClose={() => setShowCsvUpload(false)}
        title="Import Users"
        description="Bulk import user accounts from a CSV file"
        requiredColumns={['employeeId', 'name', 'email', 'password']}
        optionalColumns={['role', 'department', 'jobTitle', 'stationId']}
        sampleRows={['EMP001,John Smith,john@example.com,Password123!,user,Engineering,Software Engineer,']}
        apiMethod={(formData) => usersAPI.createBulk(formData).then(res => res.data)}
        queryKey={['users']}
      />

      {/* Module Access Modal */}
      {showModuleAccess && selectedUserForModules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Module Access</h3>
                <p className="text-sm text-muted-foreground">
                  Manage {selectedUserForModules.name}'s access to different modules
                </p>
              </div>
              <button onClick={() => { setShowModuleAccess(false); setSelectedUserForModules(null); }}
                className="p-1 rounded hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <ModuleAccessManager
              userId={selectedUserForModules._id}
              moduleAccess={selectedUserForModules.moduleAccess}
              onUpdate={(updatedUser) => {
                setSelectedUserForModules(updatedUser);
                queryClient.invalidateQueries(['users']);
              }}
            />

            <div className="flex justify-end mt-4">
              <button
                onClick={() => { setShowModuleAccess(false); setSelectedUserForModules(null); }}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserFormModal({ user, stations, jobTitles, departments, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    employeeId: user?.employeeId || '',
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'user',
    department: user?.department || '',
    jobTitle: user?.jobTitle || '',
    stationId: user?.stationId || '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data) => user ? usersAPI.update(user._id, data) : usersAPI.create(data),
    onSuccess: () => {
      toast.success(user ? 'User Updated' : 'User Created', user ? 'User details have been updated.' : 'New user has been created.');
      onSuccess();
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to save user.';
      toast.error('Save Failed', message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData };
    if (!data.password && user) delete data.password;
    createMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{user ? 'Edit User' : 'Create User'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {createMutation.isError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {createMutation.error.response?.data?.message || 'An error occurred while saving.'}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Employee ID</label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
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
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required={!user}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="user">User</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Station</label>
              <select
                value={formData.stationId}
                onChange={(e) => setFormData(prev => ({ ...prev, stationId: e.target.value }))}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">No station</option>
                {stations.map(station => (
                  <option key={station._id} value={station._id}>{station.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <SearchableSelect
                options={departments.map(d => d.name)}
                value={formData.department}
                onChange={(val) => setFormData(prev => ({ ...prev, department: val }))}
                placeholder="Select department"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Job Title</label>
              <SearchableSelect
                options={jobTitles.map(j => j.name)}
                value={formData.jobTitle}
                onChange={(val) => setFormData(prev => ({ ...prev, jobTitle: val }))}
                placeholder="Select job title"
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
              {user ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
