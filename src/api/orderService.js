import API from './axios';

const orderService = {
  getAll: () => API.get('/orders').then((r) => r.data),
  getById: (id) => API.get(`/orders/${id}`).then((r) => r.data),

  /**
   * Create a new order.
   * payload: { customer_name?, table_number?, order_type, notes?, items[] }
   * Each item: { product_id, variant_id?, quantity, unit_price, notes? }
   */
  create: (payload) => API.post('/orders', payload).then((r) => r.data),

  /** Update order status: { status: 'pending'|'preparing'|'completed'|'cancelled' } */
  update: (id, payload) => API.put(`/orders/${id}`, payload).then((r) => r.data),
  delete: (id) => API.delete(`/orders/${id}`).then((r) => r.data),

  /** Get JSON receipt for an order */
  getReceipt: (id) => API.get(`/orders/${id}/receipt`).then((r) => r.data),

  /** Get plain-text receipt (for thermal printers) */
  getReceiptText: (id) =>
    API.get(`/orders/${id}/receipt/text`, { responseType: 'text' }).then((r) => r.data),
};

export default orderService;
