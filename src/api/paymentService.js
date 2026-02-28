import API from './axios';

const paymentService = {
  getAll: () => API.get('/payments').then((r) => r.data),
  getById: (id) => API.get(`/payments/${id}`).then((r) => r.data),

  /** Fetch active payment methods (Cash, GCash, Card…) */
  getMethods: () => API.get('/payment-methods').then((r) => r.data),

  /**
   * Create a payment for an order.
   * payload: { order_id, payment_method_id, amount_paid, reference_number? }
   */
  create: (payload) => API.post('/payments', payload).then((r) => r.data),

  /** Update payment status: { status: 'paid'|'pending'|'refunded' } */
  update: (id, payload) => API.put(`/payments/${id}`, payload).then((r) => r.data),
  delete: (id) => API.delete(`/payments/${id}`).then((r) => r.data),
};

export default paymentService;
