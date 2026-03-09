import api from './axios';

const variantService = {
  getAll: (productId) => api.get(`/products/${productId}/variants`),
  create: (productId, data) => api.post(`/products/${productId}/variants`, data),
  update: (productId, variantId, data) => api.put(`/products/${productId}/variants/${variantId}`, data),
  delete: (productId, variantId) => api.delete(`/products/${productId}/variants/${variantId}`),
  sync: (productId, variants) => api.post(`/products/${productId}/variants/sync`, { variants }),
};

export default variantService;
