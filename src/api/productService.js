import API from './axios';

const productService = {
  getAll: () => API.get('/products').then((r) => r.data),
  getById: (id) => API.get(`/products/${id}`).then((r) => r.data),
  create: (payload) => API.post('/products', payload),
  update: (id, payload) => API.put(`/products/${id}`, payload),
  delete: (id) => API.delete(`/products/${id}`).then((r) => r.data),
};

export default productService;
