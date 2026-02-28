import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orderService, productService, categoryService, userService, paymentService } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiShoppingBag, FiFileText, FiUsers, FiDollarSign,
  FiClock, FiCheckCircle, FiXCircle,
  FiPlus, FiEdit2, FiTrash2, FiX, FiPackage, FiTag,
  FiCalendar,
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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  /* pagination */
  const [ordersPage, setOrdersPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

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
      setRecentOrders(orders);
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

  /* paginated data */
  const paginatedOrders = recentOrders.slice((ordersPage - 1) * ITEMS_PER_PAGE, ordersPage * ITEMS_PER_PAGE);
  const totalOrderPages = Math.max(1, Math.ceil(recentOrders.length / ITEMS_PER_PAGE));
  const paginatedProducts = products.slice((productsPage - 1) * ITEMS_PER_PAGE, productsPage * ITEMS_PER_PAGE);
  const totalProductPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const CATS_PER_PAGE = 9;
  const paginatedCategories = categories.slice((categoriesPage - 1) * CATS_PER_PAGE, categoriesPage * CATS_PER_PAGE);
  const totalCategoryPages = Math.max(1, Math.ceil(categories.length / CATS_PER_PAGE));

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ fontFamily: "'Inria Sans', sans-serif" }}>
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f5f0e8' }}>Owner Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Welcome back, {user?.name}. Here's your business overview.
          </p>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <div className="flex items-center gap-2 justify-end mb-1">
            <FiCalendar size={14} style={{ color: '#d4af37' }} />
            <span className="text-sm font-semibold" style={{ color: '#f5f0e8' }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <FiClock size={14} style={{ color: '#d4af37' }} />
            <span className="text-lg font-bold tabular-nums" style={{ color: '#d4af37' }}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-8">
        {[
          { key: 'overview', label: 'Overview', icon: <FiFileText size={14} /> },
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<FiDollarSign size={20} />} label="Total Revenue"
              value={`₱${stats.revenue.toLocaleString('en', { minimumFractionDigits: 2 })}`} color={gold} />
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
                {recentOrders.length} total
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
                  {paginatedOrders.map((order) => (
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
            {totalOrderPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: panelBorder }}>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Page {ordersPage} of {totalOrderPages} ({recentOrders.length} orders)
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setOrdersPage((p) => Math.max(1, p - 1))} disabled={ordersPage === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#f5f0e8' }}>
                    ← Prev
                  </button>
                  <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {ordersPage} / {totalOrderPages}
                  </span>
                  <button onClick={() => setOrdersPage((p) => Math.min(totalOrderPages, p + 1))} disabled={ordersPage === totalOrderPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#f5f0e8' }}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
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
              {paginatedProducts.map((p) => (
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
          {totalProductPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Page {productsPage} of {totalProductPages} ({products.length} products)
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setProductsPage((p) => Math.max(1, p - 1))} disabled={productsPage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#f5f0e8' }}>
                  ← Prev
                </button>
                <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {productsPage} / {totalProductPages}
                </span>
                <button onClick={() => setProductsPage((p) => Math.min(totalProductPages, p + 1))} disabled={productsPage === totalProductPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#f5f0e8' }}>
                  Next →
                </button>
              </div>
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
              {paginatedCategories.map((c) => {
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
          {totalCategoryPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Page {categoriesPage} of {totalCategoryPages} ({categories.length} categories)
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCategoriesPage((p) => Math.max(1, p - 1))} disabled={categoriesPage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#f5f0e8' }}>
                  ← Prev
                </button>
                <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {categoriesPage} / {totalCategoryPages}
                </span>
                <button onClick={() => setCategoriesPage((p) => Math.min(totalCategoryPages, p + 1))} disabled={categoriesPage === totalCategoryPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#f5f0e8' }}>
                  Next →
                </button>
              </div>
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
                    <option value="" style={{ color: '#000', background: '#fff' }}>Select a category</option>
                    {categories.map((c) => <option key={c.id} value={c.id} style={{ color: '#000', background: '#fff' }}>{c.name}</option>)}
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
