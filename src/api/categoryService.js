import API from './axios';

const categoryService = {
  getAll: () => API.get('/categories').then((r) => r.data),
  getById: (id) => API.get(`/categories/${id}`).then((r) => r.data),
  create: (payload) => API.post('/categories', payload).then((r) => r.data),
  update: (id, payload) => API.put(`/categories/${id}`, payload).then((r) => r.data),
  delete: (id) => API.delete(`/categories/${id}`).then((r) => r.data),
};

export default categoryService;
