import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

const ConfigContext = createContext(null);

const DEFAULT_CONFIG = {
  standardWorkHours: 8,
  workStartTime: '08:00',
  workEndTime: '17:00',
  maxAccuracyMeters: 50,
  gpsTimeoutMs: 15000,
  gpsHighAccuracy: true,
  pollingIntervalMs: 30000,
  timerIntervalMs: 1000,
  attendanceStatus: {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    HALF_DAY: 'half-day',
    OVERTIME: 'overtime',
  },
  userRoles: {
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
    USER: 'user',
  },
  messageTypes: {
    ALERT: 'alert',
    MESSAGE: 'message',
    NOTIFICATION: 'notification',
  },
  daysOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  validation: {
    minPasswordLength: 8,
    maxNameLength: 100,
    maxEmailLength: 255,
    minStationRadius: 10,
    maxStationRadius: 1000,
  },
};

export function ConfigProvider({ children }) {
  const { data } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const response = await api.get('/config');
      return response.data.data;
    },
    staleTime: Infinity,
    retry: 1,
  });

  const config = data || DEFAULT_CONFIG;

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
