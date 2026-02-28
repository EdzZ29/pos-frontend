import API from './axios';

const roleService = {
  getAll: () => API.get('/roles').then((r) => r.data),
  getById: (id) => API.get(`/roles/${id}`).then((r) => r.data),
  create: (payload) => API.post('/roles', payload).then((r) => r.data),
  update: (id, payload) => API.put(`/roles/${id}`, payload).then((r) => r.data),
  delete: (id) => API.delete(`/roles/${id}`).then((r) => r.data),
};

export default roleService;
