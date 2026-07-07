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
  getAnalytics: (params) => api.get('/records/analytics', { params }),
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
  unreadCount: () => api.get('/notifications/unread-count'),
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

export const configAPI = {
  get: () => api.get('/config'),
};

export const moduleAccessAPI = {
  update: (userId, module, data) => api.put(`/users/${userId}/module-access`, { module, ...data }),
  updateBulk: (userId, moduleAccess) => api.put(`/users/${userId}/module-access/bulk`, { moduleAccess }),
};

export const equipmentAPI = {
  list: (params) => api.get('/equipment', { params }),
  getAvailable: (params) => api.get('/equipment/available', { params }),
  get: (id) => api.get(`/equipment/${id}`),
  create: (data) => api.post('/equipment', data),
  uploadCsv: (formData) => api.post('/equipment/csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
  getTypes: () => api.get('/equipment/types'),
  createType: (name) => api.post('/equipment/types', { name }),
  deleteType: (name) => api.delete(`/equipment/types/${encodeURIComponent(name)}`),
};

export const casesAPI = {
  list: (params) => api.get('/cases', { params }),
  get: (id) => api.get(`/cases/${id}`),
  create: (data) => api.post('/cases', data),
  update: (id, data) => api.put(`/cases/${id}`, data),
  delete: (id) => api.delete(`/cases/${id}`),
};

export const bookingsAPI = {
  list: (params) => api.get('/bookings', { params }),
  get: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  uploadPdf: (id, formData) => api.post(`/bookings/${id}/pdf`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateStatus: (id, status) => api.put(`/bookings/${id}/status`, { status }),
};

export const bookersAPI = {
  list: () => api.get('/bookers'),
  check: () => api.get('/bookers/check'),
  add: (userId) => api.post('/bookers', { userId }),
  remove: (userId) => api.delete(`/bookers/${userId}`),
};

export const vehicleAPI = {
  list: (params) => api.get('/vehicles', { params }),
  available: (params) => api.get('/vehicles/available', { params }),
  get: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
  getQR: (id) => api.get(`/vehicles/${id}/qr`),
  generateQR: (id) => api.post(`/vehicles/${id}/qr/generate`),
  generateYearQR: () => api.post('/vehicles/qr/generate-year'),
  deactivate: (id) => api.post(`/vehicles/${id}/deactivate`),
  reactivate: (id) => api.post(`/vehicles/${id}/reactivate`),
  exportQRPdf: (id) => api.get(`/vehicles/${id}/qr-pdf`, { responseType: 'blob' }),
  exportQRPdfBatch: (ids) => api.get(`/vehicles/qr-pdf/batch?ids=${ids.join(',')}`, { responseType: 'blob' }),
};

export const tripsAPI = {
  list: (params) => api.get('/trips', { params }),
  get: (id) => api.get(`/trips/${id}`),
  create: (data) => api.post('/trips', data),
  updateStatus: (id, status, extra = {}) => api.put(`/trips/${id}/status`, { status, ...extra }),
};

export const parkingAPI = {
  list: (params) => api.get('/parking', { params }),
  available: (params) => api.get('/parking/available', { params }),
  stats: () => api.get('/parking/stats'),
  get: (id) => api.get(`/parking/${id}`),
  create: (data) => api.post('/parking', data),
  update: (id, data) => api.put(`/parking/${id}`, data),
  delete: (id) => api.delete(`/parking/${id}`),
};

export const checkinsAPI = {
  create: (data) => api.post('/checkins', data),
  list: (params) => api.get('/checkins', { params }),
  getActive: () => api.get('/checkins/active'),
  getVehicleStatus: (vehicleId) => api.get(`/checkins/vehicle/${vehicleId}`),
};

export const auditLogsAPI = {
  list: (params) => api.get('/audit-logs', { params }),
  stats: () => api.get('/audit-logs/stats'),
  purge: (olderThan) => api.delete('/audit-logs/purge', { params: { olderThan } }),
};

export const registriesAPI = {
  list: (params) => api.get('/registries', { params }),
  get: (id) => api.get(`/registries/${id}`),
  create: (data) => api.post('/registries', data),
  update: (id, data) => api.put(`/registries/${id}`, data),
  delete: (id) => api.delete(`/registries/${id}`),
};

export const parkingLotsAPI = {
  list: (params) => api.get('/parking-lots', { params }),
  stats: (params) => api.get('/parking-lots/stats', { params }),
  get: (id) => api.get(`/parking-lots/${id}`),
  create: (data) => api.post('/parking-lots', data),
  update: (id, data) => api.put(`/parking-lots/${id}`, data),
  delete: (id) => api.delete(`/parking-lots/${id}`),
};

export const visitorParkingAPI = {
  list: (params) => api.get('/visitor-parking', { params }),
  stats: (params) => api.get('/visitor-parking/stats', { params }),
  checkIn: (data) => api.post('/visitor-parking/check-in', data),
  checkOut: (id) => api.put(`/visitor-parking/${id}/check-out`),
  delete: (id) => api.delete(`/visitor-parking/${id}`),
};

export const maintenanceAPI = {
  list: (params) => api.get('/maintenance', { params }),
  upcoming: (params) => api.get('/maintenance/upcoming', { params }),
  get: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
  delete: (id) => api.delete(`/maintenance/${id}`),
};

export const fileMovementAPI = {
  // Case Files
  listCaseFiles: (params) => api.get('/file-movement/case-files', { params }),
  getCaseFile: (id) => api.get(`/file-movement/case-files/${id}`),
  createCaseFile: (data) => api.post('/file-movement/case-files', data),
  updateCaseFile: (id, data) => api.put(`/file-movement/case-files/${id}`, data),
  deleteCaseFile: (id) => api.delete(`/file-movement/case-files/${id}`),
  // Movements
  listMovements: (params) => api.get('/file-movement/movements', { params }),
  createMovement: (data) => api.post('/file-movement/movements', data),
  returnFile: (movementId, data) => api.put(`/file-movement/movements/${movementId}/return`, data),
  // Requests
  listRequests: (params) => api.get('/file-movement/requests', { params }),
  createRequest: (data) => api.post('/file-movement/requests', data),
  approveRequest: (id, data) => api.put(`/file-movement/requests/${id}/approve`, data),
  // Strong Room
  listStrongRoom: (params) => api.get('/file-movement/strong-room', { params }),
  releaseFromStrongRoom: (data) => api.post('/file-movement/strong-room/release', data),
  returnToStrongRoom: (id, data) => api.put(`/file-movement/strong-room/${id}/return`, data),
  // Tracking
  trackFile: (caseFileId) => api.get(`/file-movement/tracking/${caseFileId}`),
  // Dashboard
  getDashboard: (params) => api.get('/file-movement/dashboard', { params }),
};

export default api;
