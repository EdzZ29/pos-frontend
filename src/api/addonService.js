import API from './axios';

const addonService = {
  getAll: () => API.get('/addons').then((r) => r.data),
  getById: (id) => API.get(`/addons/${id}`).then((r) => r.data),
  create: (payload) => API.post('/addons', payload).then((r) => r.data),
  update: (id, payload) => API.put(`/addons/${id}`, payload).then((r) => r.data),
  delete: (id) => API.delete(`/addons/${id}`).then((r) => r.data),
};

export default addonService;