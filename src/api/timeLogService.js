import API from './axios';

const timeLogService = {
  /** Get all time logs (optionally filter by user_id, status, date) */
  getAll: (params) => API.get('/time-logs', { params }).then((r) => r.data),

  /** Get a single time log */
  getById: (id) => API.get(`/time-logs/${id}`).then((r) => r.data),

  /** Clock in a user: { user_id, notes? } */
  clockIn: (payload) => API.post('/time-logs', payload).then((r) => r.data),

  /** Clock out (update): { notes? } */
  clockOut: (id, payload = {}) => API.put(`/time-logs/${id}`, payload).then((r) => r.data),

  /** Mark a user as absent / no duty */
  markAbsent: (payload) => API.post('/time-logs/mark-absent', payload).then((r) => r.data),

  /** QR scan attendance (auto clock-in / clock-out) */
  qrScan: (payload) => API.post('/time-logs/qr-scan', payload).then((r) => r.data),
};

export default timeLogService;
