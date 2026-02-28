import API from './axios';

const userService = {
  getAll: () => API.get('/users').then((r) => r.data),
  getById: (id) => API.get(`/users/${id}`).then((r) => r.data),
  create: (payload) => API.post('/users', payload).then((r) => r.data),
  update: (id, payload) => API.put(`/users/${id}`, payload).then((r) => r.data),
  delete: (id) => API.delete(`/users/${id}`).then((r) => r.data),
};

export default userService;
