import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '../lib/api.js';
import { X, Loader2, Bell, BellOff, Clock } from 'lucide-react';

const MUTE_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '2 hours', value: 2 },
  { label: '4 hours', value: 4 },
  { label: '8 hours', value: 8 },
  { label: '24 hours', value: 24 },
  { label: '3 days', value: 72 },
  { label: '1 week', value: 168 },
];

export default function NotificationSettings({ onClose }) {
  const queryClient = useQueryClient();
  const [muteHours, setMuteHours] = useState('');

  const { data: prefsData, isLoading } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const res = await notificationsAPI.getPreferences();
      return res.data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => notificationsAPI.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificationPreferences']);
    },
  });

  const handleToggle = (key) => {
    updateMutation.mutate({ [key]: !prefsData[key] });
  };

  const handleMute = () => {
    if (!muteHours) return;
    const until = new Date(Date.now() + muteHours * 60 * 60 * 1000);
    updateMutation.mutate({ muteUntil: until.toISOString() });
    setMuteHours('');
  };

  const handleUnmute = () => {
    updateMutation.mutate({ muteUntil: null });
  };

  const isMuted = prefsData?.muteUntil && new Date(prefsData.muteUntil) > new Date();
  const muteEndTime = isMuted ? new Date(prefsData.muteUntil) : null;

  const toggles = [
    { key: 'lateCheckIn', label: 'Late Check-in', desc: 'Alert when you check in after shift start' },
    { key: 'lateCheckOut', label: 'Late Check-out', desc: 'Alert when you check out after shift end' },
    { key: 'overtime', label: 'Overtime', desc: 'Alert when you work more than 8 hours' },
    { key: 'shiftReminder', label: 'Shift Reminder', desc: 'Remind you to check in when shift starts' },
    { key: 'shiftChange', label: 'Shift Changes', desc: 'Notify when your assigned shift is modified' },
    { key: 'shiftAssignment', label: 'Shift Assignment', desc: 'Notify when a shift is assigned to you' },
  ];

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Notification Settings</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mute section */}
        <div className="mb-6 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isMuted ? (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Bell className="h-4 w-4 text-primary" />
              )}
              <span className="text-sm font-medium">
                {isMuted ? 'Notifications Muted' : 'Mute Notifications'}
              </span>
            </div>
            {isMuted && (
              <span className="text-xs text-muted-foreground">
                Until {muteEndTime.toLocaleString()}
              </span>
            )}
          </div>

          {isMuted ? (
            <button
              onClick={handleUnmute}
              disabled={updateMutation.isPending}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Unmute Now
            </button>
          ) : (
            <div className="flex gap-2">
              <select
                value={muteHours}
                onChange={(e) => setMuteHours(Number(e.target.value))}
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select duration</option>
                {MUTE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={handleMute}
                disabled={!muteHours || updateMutation.isPending}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Mute
              </button>
            </div>
          )}
        </div>

        {/* Toggle notifications */}
        <div className="space-y-1">
          {toggles.map(({ key, label, desc }) => {
            const enabled = prefsData[key] !== false;
            return (
              <div
                key={key}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 mr-4">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => handleToggle(key)}
                  disabled={updateMutation.isPending}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                    enabled ? 'bg-[#009A44]' : 'bg-input'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
