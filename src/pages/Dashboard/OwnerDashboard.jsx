import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orderService, productService, categoryService, userService, paymentService } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiShoppingBag, FiFileText, FiUsers, FiDollarSign, FiTrendingUp,
  FiClock, FiCheckCircle, FiXCircle,
  FiPlus, FiEdit2, FiTrash2, FiX, FiPackage, FiTag,
  FiChevronDown, FiChevronUp, FiSearch, FiList,
} from 'react-icons/fi';

/* ─── tiny helpers ─── */
const gold = '#d4af37';
const panelBg = 'rgba(255,255,255,0.03)';
const panelBorder = '1px solid rgba(255,255,255,0.06)';
const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#f5f0e8',
  outline: 'none',
};

const StatCard = ({ icon, label, value, color }) => (
  <motion.div
    key={label}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="rounded-xl p-5 flex items-center gap-4"
    style={{ background: panelBg, border: panelBorder }}
  >
    <div className="w-11 h-11 rounded-lg flex items-center justify-center"
      style={{ background: `${color}18`, color }}>
      {icon}
    </div>
    <div>
      <p className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      <p className="text-xl font-bold mt-0.5" style={{ color: '#f5f0e8' }}>{value}</p>
    </div>
  </motion.div>
);

/* ─────────────────── MAIN COMPONENT ─────────────────── */
export default function OwnerDashboard() {
  const { user } = useAuth();

  /* data */
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [stats, setStats] = useState({
    products: 0, orders: 0, users: 0, categories: 0,
    revenue: 0, totalSales: 0, pendingOrders: 0, completedOrders: 0, cancelledOrders: 0,
  });

  /* tabs */
  const [activeTab, setActiveTab] = useState('overview'); // overview | products | categories

  /* product form */
  const emptyProduct = { name: '', description: '', price: '', stock: '0', category_id: '', image: '' };
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSaving, setProductSaving] = useState(false);

  /* category form */
  const emptyCategory = { name: '', description: '' };
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);

  /* ── fetch all data ── */
  const fetchAll = async () => {
    try {
      const [prods, orders, users, cats, payments] = await Promise.all([
        productService.getAll(),
        orderService.getAll(),
        userService.getAll(),
        categoryService.getAll(),
        paymentService.getAll(),
      ]);

      const revenue = payments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);

      const totalSales = orders
        .filter((o) => o.status === 'completed')
        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

      setProducts(prods);
      setCategories(cats);
      setStats({
        products: prods.length,
        orders: orders.length,
        users: users.length,
        categories: cats.length,
        revenue,
        totalSales,
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        completedOrders: orders.filter((o) => o.status === 'completed').length,
        cancelledOrders: orders.filter((o) => o.status === 'cancelled').length,
      });
      setAllOrders(orders);
      setRecentOrders(orders.slice(0, 8));
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  /* ── Product CRUD ── */
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setShowProductModal(true);
  };
  const openEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      stock: String(p.stock ?? 0),
      category_id: String(p.category_id),
      image: p.image || '',
    });
    setShowProductModal(true);
  };
  const saveProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.category_id) return;
    setProductSaving(true);
    try {
      const payload = {
        ...productForm,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock) || 0,
        category_id: parseInt(productForm.category_id),
      };
      if (editingProduct) {
        const updated = await productService.update(editingProduct.id, payload);
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, ...updated } : p)));
      } else {
        const created = await productService.create(payload);
        setProducts((prev) => [created, ...prev]);
      }
      setShowProductModal(false);
      setStats((s) => ({ ...s, products: editingProduct ? s.products : s.products + 1 }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save product');
    } finally {
      setProductSaving(false);
    }
  };
  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productService.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setStats((s) => ({ ...s, products: s.products - 1 }));
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  /* ── Category CRUD ── */
  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategory);
    setShowCategoryModal(true);
  };
  const openEditCategory = (c) => {
    setEditingCategory(c);
    setCategoryForm({ name: c.name, description: c.description || '' });
    setShowCategoryModal(true);
  };
  const saveCategory = async () => {
    if (!categoryForm.name) return;
    setCategorySaving(true);
    try {
      if (editingCategory) {
        const updated = await categoryService.update(editingCategory.id, categoryForm);
        setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? { ...c, ...updated } : c)));
      } else {
        const created = await categoryService.create(categoryForm);
        setCategories((prev) => [created, ...prev]);
      }
      setShowCategoryModal(false);
      setStats((s) => ({ ...s, categories: editingCategory ? s.categories : s.categories + 1 }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save category');
    } finally {
      setCategorySaving(false);
    }
  };
  const deleteCategory = async (id) => {
    if (!confirm('Delete this category? Products under it may become orphaned.')) return;
    try {
      await categoryService.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setStats((s) => ({ ...s, categories: s.categories - 1 }));
    } catch (err) {
      alert('Failed to delete category');
    }
  };

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ fontFamily: "'Inria Sans', sans-serif" }}>
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#f5f0e8' }}>Owner Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Welcome back, {user?.name}. Here's your business overview.
        </p>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-8">
        {[
          { key: 'overview', label: 'Overview', icon: <FiFileText size={14} /> },
          { key: 'orders', label: 'Orders', icon: <FiList size={14} /> },
          { key: 'products', label: 'Products', icon: <FiPackage size={14} /> },
          { key: 'categories', label: 'Categories', icon: <FiTag size={14} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
            style={{
              background: activeTab === t.key ? gold : 'rgba(255,255,255,0.04)',
              color: activeTab === t.key ? '#000' : 'rgba(255,255,255,0.6)',
              border: activeTab === t.key ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard icon={<FiDollarSign size={20} />} label="Total Revenue"
              value={`₱${stats.revenue.toLocaleString('en', { minimumFractionDigits: 2 })}`} color={gold} />
            <StatCard icon={<FiTrendingUp size={20} />} label="Profit"
              value={`₱${(stats.totalSales || 0).toLocaleString('en', { minimumFractionDigits: 2 })}`} color="#4ade80" />
            <StatCard icon={<FiFileText size={20} />} label="Total Orders" value={stats.orders} color="#60a5fa" />
            <StatCard icon={<FiShoppingBag size={20} />} label="Products" value={stats.products} color="#34d399" />
            <StatCard icon={<FiUsers size={20} />} label="Users" value={stats.users} color="#f472b6" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard icon={<FiClock size={20} />} label="Pending" value={stats.pendingOrders} color="#fbbf24" />
            <StatCard icon={<FiCheckCircle size={20} />} label="Completed" value={stats.completedOrders} color="#34d399" />
            <StatCard icon={<FiXCircle size={20} />} label="Cancelled" value={stats.cancelledOrders} color="#f87171" />
          </div>

          {/* Recent orders table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden" style={{ background: panelBg, border: panelBorder }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
              <h2 className="text-sm font-semibold" style={{ color: '#f5f0e8' }}>Recent Orders</h2>
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md"
                style={{ background: 'rgba(212,175,55,0.12)', color: gold }}>
                Last {recentOrders.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: panelBorder }}>
                    {['Order #', 'Customer', 'Type', 'Total', 'Status', 'Date'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] uppercase tracking-wider font-semibold"
                        style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-5 py-3 font-mono text-xs" style={{ color: gold }}>#{String(order.id).padStart(4, '0')}</td>
                      <td className="px-5 py-3" style={{ color: '#f5f0e8' }}>{order.customer_name || 'Walk-in'}</td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-semibold"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>{order.order_type}</span>
                      </td>
                      <td className="px-5 py-3 font-semibold" style={{ color: '#f5f0e8' }}>
                        ₱{parseFloat(order.total_amount).toLocaleString('en', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {recentOrders.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No orders yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}

      {/* ═══════════════ ORDERS TAB ═══════════════ */}
      {activeTab === 'orders' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-lg font-bold" style={{ color: '#f5f0e8' }}>
              All Orders <span className="text-sm font-normal ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>({allOrders.length})</span>
            </h2>
            {/* Search */}
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search orders..."
                className="pl-9 pr-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f0e8', outline: 'none', width: 220 }}
              />
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: panelBg, border: panelBorder }}>
            <div className="overflow-x-auto" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ background: '#0d0d0d' }}>
                  <tr style={{ borderBottom: panelBorder }}>
                    {['', 'Order #', 'Cashier', 'Type', 'Items', 'Discount', 'Total', 'Payment', 'Status', 'Date & Time'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] uppercase tracking-wider font-semibold"
                        style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const q = orderSearch.toLowerCase();
                    const filtered = q
                      ? allOrders.filter((o) =>
                          String(o.id).includes(q) ||
                          (o.cashier?.name || '').toLowerCase().includes(q) ||
                          (o.order_type || '').toLowerCase().includes(q) ||
                          (o.status || '').toLowerCase().includes(q) ||
                          (o.items || []).some((i) => (i.product?.name || '').toLowerCase().includes(q))
                        )
                      : allOrders;

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} className="px-5 py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {orderSearch ? 'No orders match your search.' : 'No orders yet.'}
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((order) => {
                      const isExpanded = expandedOrder === order.id;
                      const items = order.items || [];
                      const payment = order.payment;
                      const paymentMethodName = payment?.method?.name || payment?.payment_method?.name || '—';
                      const subtotal = items.reduce((s, i) => s + parseFloat(i.subtotal || i.unit_price * i.quantity || 0), 0);

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
                            <td className="px-4 py-3 text-xs" style={{ color: '#f5f0e8' }}>
                              {order.cashier?.name || 'Unknown'}
                            </td>
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
                            <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                              {order.created_at
                                ? <>
                                    {new Date(order.created_at).toLocaleDateString()}{' '}
                                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </>
                                : '—'}
                            </td>
                          </tr>

                          {/* Expanded details row */}
                          {isExpanded && (
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td colSpan={10} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.015)' }}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                  {/* Items breakdown */}
                                  <div className="md:col-span-2">
                                    <h4 className="text-[11px] uppercase tracking-wider font-semibold mb-3"
                                      style={{ color: 'rgba(255,255,255,0.4)' }}>Order Items</h4>
                                    <div className="space-y-2">
                                      {items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg"
                                          style={{ background: 'rgba(255,255,255,0.03)' }}>
                                          <div>
                                            <span className="text-xs font-medium" style={{ color: '#f5f0e8' }}>
                                              {item.product?.name || `Product #${item.product_id}`}
                                            </span>
                                            {item.variant?.name && (
                                              <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded"
                                                style={{ background: `rgba(212,175,55,0.1)`, color: gold }}>
                                                {item.variant.name}
                                              </span>
                                            )}
                                            <span className="text-[11px] ml-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                              ₱{parseFloat(item.unit_price).toFixed(2)} × {item.quantity}
                                            </span>
                                          </div>
                                          <span className="text-xs font-semibold" style={{ color: gold }}>
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
                                      <div className="my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                                      <div className="flex justify-between text-xs">
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Cashier</span>
                                        <span style={{ color: '#f5f0e8' }}>{order.cashier?.name || 'Unknown'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════ PRODUCTS TAB ═══════════════ */}
      {activeTab === 'products' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ color: '#f5f0e8' }}>
              All Products <span className="text-sm font-normal ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>({products.length})</span>
            </h2>
            <button onClick={openAddProduct}
              className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${gold}, #b38f2c)`, color: '#000' }}>
              <FiPlus size={16} /> Add Product
            </button>
          </div>

          {products.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: panelBg, border: panelBorder }}>
              <FiPackage size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No products yet. Add your first product!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((p) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-4 flex flex-col" style={{ background: panelBg, border: panelBorder }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate" style={{ color: '#f5f0e8' }}>{p.name}</h3>
                      <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {p.category?.name || 'No category'}
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md font-bold ${p.is_available !== false ? '' : ''}`}
                      style={{
                        background: p.is_available !== false ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                        color: p.is_available !== false ? '#34d399' : '#f87171',
                      }}>
                      {p.is_available !== false ? 'Available' : 'Unavailable'}
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.description}</p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p className="text-lg font-bold" style={{ color: gold }}>₱{parseFloat(p.price).toLocaleString('en', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Stock: {p.stock ?? '∞'}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEditProduct(p)}
                        className="p-2 rounded-lg transition hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <FiEdit2 size={14} />
                      </button>
                      <button onClick={() => deleteProduct(p.id)}
                        className="p-2 rounded-lg transition hover:bg-red-500/20" style={{ color: '#f87171' }}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════ CATEGORIES TAB ═══════════════ */}
      {activeTab === 'categories' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ color: '#f5f0e8' }}>
              All Categories <span className="text-sm font-normal ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>({categories.length})</span>
            </h2>
            <button onClick={openAddCategory}
              className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${gold}, #b38f2c)`, color: '#000' }}>
              <FiPlus size={16} /> Add Category
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: panelBg, border: panelBorder }}>
              <FiTag size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No categories yet. Add your first category!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => {
                const count = products.filter((p) => p.category_id === c.id).length;
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-5 flex items-start justify-between" style={{ background: panelBg, border: panelBorder }}>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm" style={{ color: '#f5f0e8' }}>{c.name}</h3>
                      {c.description && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.description}</p>}
                      <p className="text-[11px] mt-2" style={{ color: gold }}>{count} product{count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex gap-1.5 ml-3">
                      <button onClick={() => openEditCategory(c)}
                        className="p-2 rounded-lg transition hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <FiEdit2 size={14} />
                      </button>
                      <button onClick={() => deleteCategory(c.id)}
                        className="p-2 rounded-lg transition hover:bg-red-500/20" style={{ color: '#f87171' }}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════ PRODUCT MODAL ═══════════════ */}
      <AnimatePresence>
        {showProductModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowProductModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>

              <div className="p-5 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
                <h2 className="text-lg font-bold" style={{ color: '#f5f0e8' }}>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button onClick={() => setShowProductModal(false)} className="p-2 rounded-lg hover:bg-white/10 transition" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>Product Name *</label>
                  <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} placeholder="e.g. Lechon Kawali" />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>Category *</label>
                  <select value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle}>
                    <option value="">Select a category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Price & Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                      style={{ color: 'rgba(255,255,255,0.4)' }}>Price (₱) *</label>
                    <input type="number" step="0.01" min="0" value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                      style={{ color: 'rgba(255,255,255,0.4)' }}>Stock</label>
                    <input type="number" min="0" value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} placeholder="0" />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>Description</label>
                  <textarea rows={3} value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm resize-none" style={inputStyle} placeholder="Optional description…" />
                </div>
              </div>

              <div className="p-5 flex gap-3" style={{ borderTop: panelBorder }}>
                <button onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#f5f0e8', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Cancel
                </button>
                <button onClick={saveProduct} disabled={productSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${gold}, #b38f2c)`, color: '#000' }}>
                  {productSaving ? 'Saving…' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ CATEGORY MODAL ═══════════════ */}
      <AnimatePresence>
        {showCategoryModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowCategoryModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>

              <div className="p-5 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
                <h2 className="text-lg font-bold" style={{ color: '#f5f0e8' }}>
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h2>
                <button onClick={() => setShowCategoryModal(false)} className="p-2 rounded-lg hover:bg-white/10 transition" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>Category Name *</label>
                  <input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} placeholder="e.g. Main Course" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>Description</label>
                  <textarea rows={2} value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm resize-none" style={inputStyle} placeholder="Optional…" />
                </div>
              </div>

              <div className="p-5 flex gap-3" style={{ borderTop: panelBorder }}>
                <button onClick={() => setShowCategoryModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#f5f0e8', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Cancel
                </button>
                <button onClick={saveCategory} disabled={categorySaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${gold}, #b38f2c)`, color: '#000' }}>
                  {categorySaving ? 'Saving…' : editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:    { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    preparing:  { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
    completed:  { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
    cancelled:  { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
  };
  const s = map[status] || map.pending;
  return (
    <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wide"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}
