import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API helper functions
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => 
    api.post('/auth/reset-password', { token, newPassword }),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  createBulk: (users) => api.post('/users/bulk', { users }),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const recordsAPI = {
  list: (params) => api.get('/records', { params }),
  getToday: () => api.get('/records/today'),
  checkIn: (location) => api.post('/records/check-in', { location }),
  checkOut: (location) => api.post('/records/check-out', { location }),
  getWeeklySummary: (params) => api.get('/records/summary/weekly', { params }),
};

export const stationsAPI = {
  list: () => api.get('/stations'),
  get: (id) => api.get(`/stations/${id}`),
  create: (data) => api.post('/stations', data),
  update: (id, data) => api.put(`/stations/${id}`, data),
  delete: (id) => api.delete(`/stations/${id}`),
};

export const shiftsAPI = {
  list: () => api.get('/shifts'),
  get: (id) => api.get(`/shifts/${id}`),
  create: (data) => api.post('/shifts', data),
  update: (id, data) => api.put(`/shifts/${id}`, data),
  delete: (id) => api.delete(`/shifts/${id}`),
  assign: (userId, shiftId) => api.post('/shifts/assign', { userId, shiftId }),
  unassign: (userId) => api.delete(`/shifts/assign/${userId}`),
};

export const messagesAPI = {
  list: (params) => api.get('/messages', { params }),
  get: (id) => api.get(`/messages/${id}`),
  send: (data) => api.post('/messages', data),
  markRead: (id) => api.put(`/messages/${id}/read`),
  markAllRead: () => api.put('/messages/read-all'),
  delete: (id) => api.delete(`/messages/${id}`),
};

export const jobTitlesAPI = {
  list: () => api.get('/job-titles'),
  create: (data) => api.post('/job-titles', data),
  update: (id, data) => api.put(`/job-titles/${id}`, data),
  delete: (id) => api.delete(`/job-titles/${id}`),
};

export const departmentsAPI = {
  list: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

export const notificationsAPI = {
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data) => api.put('/notifications/preferences', data),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

export default api;
