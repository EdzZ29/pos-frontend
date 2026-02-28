import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orderService, paymentService } from '../../api';
import { motion } from 'framer-motion';
import {
  FiFileText, FiSearch, FiChevronDown, FiChevronUp,
  FiFilter, FiDollarSign, FiClock, FiCheckCircle, FiXCircle,
  FiShoppingBag,
} from 'react-icons/fi';

const gold = '#d4af37';
const panelBg = 'rgba(255,255,255,0.03)';
const panelBorder = '1px solid rgba(255,255,255,0.06)';

/* ─── Status badge ─── */
function StatusBadge({ status }) {
  const map = {
    pending:   { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    preparing: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
    completed: { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
    cancelled: { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
    paid:      { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
  };
  const s = map[status] || map.pending;
  return (
    <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wide"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

/* ─── Stat card ─── */
const StatCard = ({ icon, label, value, color }) => (
  <div className="rounded-xl p-5 flex items-center gap-4"
    style={{ background: panelBg, border: panelBorder }}>
    <div className="w-11 h-11 rounded-lg flex items-center justify-center"
      style={{ background: `${color}18`, color }}>
      {icon}
    </div>
    <div>
      <p className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      <p className="text-xl font-bold mt-0.5" style={{ color: '#f5f0e8' }}>{value}</p>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   ORDERS PAGE
   ═══════════════════════════════════════════════════════ */
export default function OrdersPage() {
  const { user } = useAuth();
  const role = user?.role?.slug;
  const isCashier = role === 'cashier';

  const [orders, setOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showProductSales, setShowProductSales] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await orderService.getAll();
        // Cashiers see only their own orders
        setOrders(isCashier ? all.filter((o) => o.user_id === user?.id) : all);
      } catch (err) {
        console.error('Failed to load orders', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isCashier]);

  /* ── derived stats ── */
  const totalRevenue = orders
    .filter((o) => o.status === 'completed')
    .reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
  const pendingCount   = orders.filter((o) => o.status === 'pending').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  /* ── product sales aggregation (from completed orders) ── */
  const productSalesMap = {};
  orders
    .filter((o) => o.status === 'completed')
    .forEach((o) => {
      (o.items || []).forEach((item) => {
        const name = item.product?.name || `Product #${item.product_id}`;
        if (!productSalesMap[name]) {
          productSalesMap[name] = { name, quantity: 0, revenue: 0 };
        }
        productSalesMap[name].quantity += item.quantity;
        productSalesMap[name].revenue += parseFloat(item.subtotal || item.unit_price * item.quantity || 0);
      });
    });
  const productSalesList = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity);
  const totalProductsSold = productSalesList.reduce((s, p) => s + p.quantity, 0);

  /* ── filtering ── */
  const q = search.toLowerCase();
  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (!q) return true;
    return (
      String(o.id).includes(q) ||
      (o.cashier?.name || '').toLowerCase().includes(q) ||
      (o.order_type || '').toLowerCase().includes(q) ||
      (o.status || '').toLowerCase().includes(q) ||
      (o.items || []).some((i) => (i.product?.name || '').toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ fontFamily: "'Inria Sans', sans-serif" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#f5f0e8' }}>Orders</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {isCashier ? 'View and manage your orders.' : 'All orders across the system.'}
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={<FiFileText size={20} />} label="Total Orders" value={orders.length} color="#60a5fa" />
        <StatCard icon={<FiClock size={20} />} label="Pending" value={pendingCount} color="#fbbf24" />
        <StatCard icon={<FiCheckCircle size={20} />} label="Completed" value={completedCount} color="#34d399" />
        <StatCard icon={<FiDollarSign size={20} />} label="Revenue"
          value={`₱${totalRevenue.toLocaleString('en', { minimumFractionDigits: 2 })}`}
          color={gold} />
        <div
          className="rounded-xl p-5 flex items-center gap-4 cursor-pointer transition-all hover:brightness-110"
          style={{ background: panelBg, border: panelBorder }}
          onClick={() => setShowProductSales((v) => !v)}
        >
          <div className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: '#a78bfa18', color: '#a78bfa' }}>
            <FiShoppingBag size={20} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Products Sold</p>
            <p className="text-xl font-bold mt-0.5" style={{ color: '#f5f0e8' }}>{totalProductsSold}</p>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)' }}>
            {showProductSales ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </div>
        </div>
      </motion.div>

      {/* Product sales breakdown (collapsible) */}
      {showProductSales && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-xl overflow-hidden mb-6"
          style={{ background: panelBg, border: panelBorder }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
            <h2 className="text-sm font-semibold" style={{ color: '#f5f0e8' }}>
              Product Sales Breakdown
              <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md"
                style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
                {productSalesList.length} product{productSalesList.length !== 1 ? 's' : ''}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: '320px', overflowY: 'auto' }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: '#0d0d0d' }}>
                <tr style={{ borderBottom: panelBorder }}>
                  {['#', 'Product', 'Qty Sold', 'Total Revenue'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] uppercase tracking-wider font-semibold"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productSalesList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      No products sold yet.
                    </td>
                  </tr>
                ) : (
                  productSalesList.map((p, idx) => (
                    <tr key={p.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      className="hover:bg-white/[0.02] transition">
                      <td className="px-5 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{idx + 1}</td>
                      <td className="px-5 py-3 text-xs font-medium" style={{ color: '#f5f0e8' }}>{p.name}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md"
                          style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
                          {p.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold" style={{ color: gold }}>
                        ₱{p.revenue.toLocaleString('en', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Toolbar: search + status filter */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, product, cashier..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f0e8', outline: 'none' }}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-2">
          <FiFilter size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
          {['all', 'pending', 'preparing', 'completed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all"
              style={{
                background: statusFilter === st ? gold : 'rgba(255,255,255,0.04)',
                color: statusFilter === st ? '#000' : 'rgba(255,255,255,0.5)',
                border: statusFilter === st ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Orders table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden"
        style={{ background: panelBg, border: panelBorder }}>

        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10" style={{ background: '#0d0d0d' }}>
              <tr style={{ borderBottom: panelBorder }}>
                {['', 'Order #', ...(isCashier ? [] : ['Cashier']), 'Type', 'Items', 'Discount', 'Total', 'Payment', 'Status', 'Date & Time'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap"
                    style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isCashier ? 9 : 10} className="px-5 py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Loading orders…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isCashier ? 9 : 10} className="px-5 py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {search || statusFilter !== 'all' ? 'No orders match your filters.' : 'No orders found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const isExpanded = expandedOrder === order.id;
                  const items = order.items || [];
                  const payment = order.payment;
                  const paymentMethodName = payment?.method?.name || payment?.payment_method?.name || '—';
                  const subtotal = items.reduce((s, i) => s + parseFloat(i.subtotal || i.unit_price * i.quantity || 0), 0);
                  const colCount = isCashier ? 9 : 10;

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        className="hover:bg-white/[0.02] transition cursor-pointer"
                        style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      >
                        <td className="pl-4 py-3">
                          {isExpanded
                            ? <FiChevronUp size={14} style={{ color: gold }} />
                            : <FiChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                          }
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: gold }}>
                          #{String(order.id).padStart(4, '0')}
                        </td>
                        {!isCashier && (
                          <td className="px-4 py-3 text-xs" style={{ color: '#f5f0e8' }}>
                            {order.cashier?.name || 'Unknown'}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                            {order.order_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3">
                          {order.discount_type && order.discount_type !== 'none' ? (
                            <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold"
                              style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                              {order.discount_type} 20%
                            </span>
                          ) : (
                            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: '#f5f0e8' }}>
                          ₱{parseFloat(order.total_amount).toLocaleString('en', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {paymentMethodName}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {order.created_at
                            ? <>
                                {new Date(order.created_at).toLocaleDateString()}{' '}
                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </>
                            : '—'}
                        </td>
                      </tr>

                      {/* ── Expanded detail row ── */}
                      {isExpanded && (
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td colSpan={colCount} className="px-6 py-5" style={{ background: 'rgba(255,255,255,0.015)' }}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Items breakdown */}
                              <div className="md:col-span-2">
                                <h4 className="text-[11px] uppercase tracking-wider font-semibold mb-3"
                                  style={{ color: 'rgba(255,255,255,0.4)' }}>Order Items</h4>
                                <div className="space-y-2">
                                  {items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg"
                                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-medium" style={{ color: '#f5f0e8' }}>
                                          {item.product?.name || `Product #${item.product_id}`}
                                        </span>
                                        {item.variant?.name && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded"
                                            style={{ background: 'rgba(212,175,55,0.1)', color: gold }}>
                                            {item.variant.name}
                                          </span>
                                        )}
                                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                          ₱{parseFloat(item.unit_price).toFixed(2)} × {item.quantity}
                                        </span>
                                      </div>
                                      <span className="text-xs font-semibold ml-4" style={{ color: gold }}>
                                        ₱{parseFloat(item.subtotal || item.unit_price * item.quantity).toLocaleString('en', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Payment & summary */}
                              <div>
                                <h4 className="text-[11px] uppercase tracking-wider font-semibold mb-3"
                                  style={{ color: 'rgba(255,255,255,0.4)' }}>Payment Summary</h4>
                                <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: panelBorder }}>
                                  <div className="flex justify-between text-xs">
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Subtotal</span>
                                    <span style={{ color: '#f5f0e8' }}>₱{subtotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  {order.discount_type && order.discount_type !== 'none' && (
                                    <div className="flex justify-between text-xs">
                                      <span style={{ color: '#34d399' }}>{order.discount_type === 'senior' ? 'Senior' : 'PWD'} (20%)</span>
                                      <span style={{ color: '#34d399' }}>-₱{parseFloat(order.discount_amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-xs font-bold pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <span style={{ color: '#f5f0e8' }}>Total</span>
                                    <span style={{ color: gold }}>₱{parseFloat(order.total_amount).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                                  </div>

                                  {payment && (
                                    <>
                                      <div className="my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                                      <div className="flex justify-between text-xs">
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Method</span>
                                        <span className="font-medium" style={{ color: '#f5f0e8' }}>{paymentMethodName}</span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Amount Paid</span>
                                        <span style={{ color: '#f5f0e8' }}>₱{parseFloat(payment.amount_paid || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Change</span>
                                        <span className="font-semibold" style={{ color: '#34d399' }}>₱{parseFloat(payment.change_amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Payment Status</span>
                                        <StatusBadge status={payment.status || 'paid'} />
                                      </div>
                                    </>
                                  )}

                                  {!isCashier && (
                                    <>
                                      <div className="my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                                      <div className="flex justify-between text-xs">
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Cashier</span>
                                        <span style={{ color: '#f5f0e8' }}>{order.cashier?.name || 'Unknown'}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
