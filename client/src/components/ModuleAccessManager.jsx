import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moduleAccessAPI } from '../lib/api.js';
import { cn } from '../lib/utils.js';
import { Loader2, Save, ChevronDown, ChevronUp, Check, X } from 'lucide-react';

const MODULE_CONFIG = {
  attendance: {
    label: 'Time Attendance',
    roles: [
      { value: 'admin', label: 'Admin', description: 'Full access to all attendance features' },
      { value: 'supervisor', label: 'Supervisor', description: 'View team, manage shifts, view reports' },
      { value: 'user', label: 'User', description: 'Check in/out, view own records' },
    ],
    permissions: [
      { value: 'check_in_out', label: 'Check In/Out' },
      { value: 'view_own_records', label: 'View Own Records' },
      { value: 'view_team_records', label: 'View Team Records' },
      { value: 'manage_shifts', label: 'Manage Shifts' },
      { value: 'manage_stations', label: 'Manage Stations' },
      { value: 'manage_departments', label: 'Manage Departments' },
      { value: 'manage_job_titles', label: 'Manage Job Titles' },
      { value: 'view_reports', label: 'View Reports' },
      { value: 'send_messages', label: 'Send Messages' },
      { value: 'manage_users', label: 'Manage Users' },
    ],
  },
  equipment: {
    label: 'Equipment Booking',
    roles: [
      { value: 'admin', label: 'Admin', description: 'Full access to equipment management' },
      { value: 'booker', label: 'Booker', description: 'Can book equipment and view own bookings' },
      { value: 'user', label: 'User', description: 'View equipment catalog only' },
    ],
    permissions: [
      { value: 'book_equipment', label: 'Book Equipment' },
      { value: 'view_own_bookings', label: 'View Own Bookings' },
      { value: 'view_all_bookings', label: 'View All Bookings' },
      { value: 'manage_all_bookings', label: 'Manage All Bookings' },
      { value: 'approve_bookings', label: 'Approve Bookings' },
      { value: 'manage_equipment', label: 'Manage Equipment' },
      { value: 'manage_bookers', label: 'Manage Bookers' },
    ],
  },
  fleet: {
    label: 'Fleet Management',
    roles: [
      { value: 'admin', label: 'Admin', description: 'Full access to fleet management' },
      { value: 'manager', label: 'Manager', description: 'Manage vehicles, trips, and parking' },
      { value: 'driver', label: 'Driver', description: 'View and update assigned trips' },
      { value: 'user', label: 'User', description: 'Book vehicles and view own trips' },
    ],
    permissions: [
      { value: 'book_vehicle', label: 'Book Vehicle' },
      { value: 'view_own_trips', label: 'View Own Trips' },
      { value: 'view_all_trips', label: 'View All Trips' },
      { value: 'manage_all_trips', label: 'Manage All Trips' },
      { value: 'approve_trips', label: 'Approve Trips' },
      { value: 'manage_vehicles', label: 'Manage Vehicles' },
      { value: 'manage_drivers', label: 'Manage Drivers' },
      { value: 'manage_parking', label: 'Manage Parking' },
    ],
  },
};

function ModuleAccessCard({ userId, module, access, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [localAccess, setLocalAccess] = useState(access || { enabled: false, role: 'user', permissions: [] });
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const config = MODULE_CONFIG[module];

  const updateMutation = useMutation({
    mutationFn: (data) => moduleAccessAPI.update(userId, module, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['users']);
      setHasChanges(false);
      onUpdate?.(res.data.data);
    },
  });

  const handleToggle = (enabled) => {
    setLocalAccess(prev => ({ ...prev, enabled }));
    setHasChanges(true);
  };

  const handleRoleChange = (role) => {
    setLocalAccess(prev => ({ ...prev, role }));
    setHasChanges(true);
  };

  const handlePermissionToggle = (permission) => {
    setLocalAccess(prev => {
      const perms = prev.permissions || [];
      const newPerms = perms.includes(permission)
        ? perms.filter(p => p !== permission)
        : [...perms, permission];
      return { ...prev, permissions: newPerms };
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(localAccess);
  };

  const handleReset = () => {
    setLocalAccess(access || { enabled: false, role: 'user', permissions: [] });
    setHasChanges(false);
  };

  return (
    <div className={cn(
      "rounded-xl border bg-card shadow-sm overflow-hidden transition-colors",
      localAccess.enabled ? "border-primary/30" : "border-border"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-3 w-3 rounded-full",
            localAccess.enabled ? "bg-green-500" : "bg-gray-300"
          )} />
          <div>
            <h3 className="text-sm font-semibold">{config.label}</h3>
            <p className="text-xs text-muted-foreground">
              {localAccess.enabled ? `Role: ${localAccess.role}` : 'Disabled'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <div className="flex gap-1">
              <button onClick={handleReset}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                title="Reset changes">
                <X className="h-4 w-4" />
              </button>
              <button onClick={handleSave} disabled={updateMutation.isPending}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary disabled:opacity-50"
                title="Save changes">
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </button>
            </div>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-muted">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t p-4 space-y-4">
          {/* Enable/Disable toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable Module</label>
            <button onClick={() => handleToggle(!localAccess.enabled)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                localAccess.enabled ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
              )}>
              <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                localAccess.enabled ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>

          {localAccess.enabled && (
            <>
              {/* Role selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <div className="space-y-2">
                  {config.roles.map(role => (
                    <label key={role.value}
                      className={cn(
                        "flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
                        localAccess.role === role.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      )}>
                      <input type="radio" name={`${module}-role`}
                        checked={localAccess.role === role.value}
                        onChange={() => handleRoleChange(role.value)}
                        className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{role.label}</p>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Additional Permissions
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    (role-based permissions are automatic)
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {config.permissions.map(perm => (
                    <label key={perm.value}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm",
                        (localAccess.permissions || []).includes(perm.value)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      )}>
                      <input type="checkbox"
                        checked={(localAccess.permissions || []).includes(perm.value)}
                        onChange={() => handlePermissionToggle(perm.value)}
                        className="rounded" />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ModuleAccessManager({ userId, moduleAccess, onUpdate }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Module Access
      </h3>
      {Object.entries(MODULE_CONFIG).map(([module, config]) => (
        <ModuleAccessCard
          key={module}
          userId={userId}
          module={module}
          access={moduleAccess?.[module]}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
