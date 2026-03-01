import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { orderService, paymentService, productService, categoryService } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiShoppingCart, FiFileText, FiDollarSign, FiClock,
  FiCheckCircle, FiPlus, FiArrowRight, FiX, FiMinus, FiXCircle,
  FiTrash2, FiCheck, FiArrowLeft, FiPrinter, FiCreditCard,
  FiPercent, FiCalendar,
} from 'react-icons/fi';

export default function CashierDashboard() {
  const { user } = useAuth();
  const { gold, goldDark, goldRgb, isDark, t, panelBg, panelBorder, inputStyle } = useSettings();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [stats, setStats] = useState({
    myOrders: 0, myPending: 0, myCompleted: 0, myRevenue: 0,
  });
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [cashierOrdersPage, setCashierOrdersPage] = useState(1);
  // Real data for ordering
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Restore modal state from sessionStorage on mount
  const savedModal = () => {
    try {
      const raw = sessionStorage.getItem('pos_order_modal');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const _saved = savedModal();

  // Order modal state
  const [orderModalOpen, setOrderModalOpen] = useState(_saved?.open ?? false);
  const [cart, setCart] = useState(_saved?.cart ?? []);
  const [orderType, setOrderType] = useState(_saved?.orderType ?? 'dine-in');
  const [menuCategory, setMenuCategory] = useState(_saved?.menuCategory ?? 'all');
  const [orderStep, setOrderStep] = useState(_saved?.orderStep ?? 1);
  const [submitting, setSubmitting] = useState(false);

  // Payment & discount state
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(_saved?.selectedPaymentMethod ?? null);
  const [discountType, setDiscountType] = useState(_saved?.discountType ?? 'none'); // none | senior | pwd
  const [amountPaid, setAmountPaid] = useState(_saved?.amountPaid ?? '');
  const [receiptData, setReceiptData] = useState(null);
  const receiptRef = useRef(null);

  // Persist modal state to sessionStorage
  useEffect(() => {
    if (orderModalOpen && orderStep < 4) {
      sessionStorage.setItem('pos_order_modal', JSON.stringify({
        open: true,
        cart,
        orderType,
        menuCategory,
        orderStep,
        selectedPaymentMethod,
        discountType,
        amountPaid,
      }));
    } else {
      sessionStorage.removeItem('pos_order_modal');
    }
  }, [orderModalOpen, cart, orderType, menuCategory, orderStep, selectedPaymentMethod, discountType, amountPaid]);

  const fetchData = useCallback(async () => {
    try {
      const [orders, payments, prods, cats] = await Promise.all([
        orderService.getAll(),
        paymentService.getAll(),
        productService.getAll(),
        categoryService.getAll(),
      ]);

      const mine = orders.filter((o) => o.user_id === user?.id);
      const myPayments = payments.filter((p) => p.processed_by === user?.id && p.status === 'paid');
      const myRevenue = myPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
      const myTotalAmount = mine.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

      setStats({
        myOrders: mine.length,
        myPending: mine.filter((o) => o.status === 'pending').length,
        myCompleted: mine.filter((o) => o.status === 'completed').length,
        myRevenue,
        myTotalAmount,
      });

      setRecentOrders(mine);
      setProducts(prods.filter((p) => p.is_available !== false));
      setCategories(cats.filter((c) => c.is_active !== false));
    } catch (err) {
      console.error('Failed to load cashier dashboard data', err);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cart helpers
  const refreshMenu = async () => {
    try {
      const [prods, cats] = await Promise.all([
        productService.getAll(),
        categoryService.getAll(),
      ]);
      setProducts(prods.filter((p) => p.is_available !== false));
      setCategories(cats.filter((c) => c.is_active !== false));
    } catch (err) {
      console.error('Failed to refresh menu', err);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const methods = await paymentService.getMethods();
      setPaymentMethods(methods);
      if (methods.length > 0 && !selectedPaymentMethod) setSelectedPaymentMethod(methods[0].id);
    } catch (err) {
      console.error('Failed to load payment methods', err);
    }
  };

  const openOrderModal = async () => {
    setOrderModalOpen(true);
    refreshMenu();
    loadPaymentMethods();
  };

  // On mount, if modal was restored from session, reload products + payment methods
  useEffect(() => {
    if (_saved?.open) {
      refreshMenu();
      loadPaymentMethods();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addToCart = (product) => {
    const existing = cart.find((c) => c.product_id === product.id);
    if (existing) {
      setCart(cart.map((c) => c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { product_id: product.id, name: product.name, unit_price: parseFloat(product.price), quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => setCart(cart.filter((c) => c.product_id !== productId));

  const updateQuantity = (productId, delta) => {
    setCart(cart.map((c) => {
      if (c.product_id === productId) {
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : c;
      }
      return c;
    }).filter((c) => c.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Discount calculation
  const discountRate = discountType === 'senior' || discountType === 'pwd' ? 0.20 : 0;
  const discountAmount = Math.round(cartTotal * discountRate * 100) / 100;
  const finalTotal = cartTotal - discountAmount;
  const changeAmount = amountPaid ? Math.max(0, parseFloat(amountPaid) - finalTotal) : 0;

  const completeOrder = async () => {
    if (cart.length === 0 || submitting || !selectedPaymentMethod) return;
    if (!amountPaid || parseFloat(amountPaid) < finalTotal) {
      alert('Amount paid must be at least ₱' + finalTotal.toFixed(2));
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create order with discount
      const payload = {
        order_type: orderType,
        discount_type: discountType,
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };
      const newOrder = await orderService.create(payload);

      // 2. Create payment
      await paymentService.create({
        order_id: newOrder.id,
        payment_method_id: selectedPaymentMethod,
        amount_paid: parseFloat(amountPaid),
      });

      // 3. Fetch receipt
      const receipt = await orderService.getReceipt(newOrder.id);
      setReceiptData(receipt);

      // Update dashboard stats
      setRecentOrders((prev) => [newOrder, ...prev]);
      setStats((prev) => ({
        ...prev,
        myOrders: prev.myOrders + 1,
        myPending: prev.myPending + 1,
        myRevenue: prev.myRevenue + parseFloat(amountPaid),
        myTotalAmount: prev.myTotalAmount + finalTotal,
      }));

      // Go to receipt step
      setOrderStep(4);
    } catch (err) {
      console.error('Failed to create order', err);
      alert(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setCart([]);
    setOrderType('dine-in');
    setMenuCategory('all');
    setOrderStep(1);
    setSelectedPaymentMethod(null);
    setDiscountType('none');
    setAmountPaid('');
    setReceiptData(null);
    setOrderModalOpen(false);
    sessionStorage.removeItem('pos_order_modal');
  };

  const filteredProducts = menuCategory === 'all'
    ? products
    : products.filter((p) => p.category_id === parseInt(menuCategory));

  /* pagination for recent orders */
  const ORDERS_PER_PAGE = 8;
  const paginatedCashierOrders = recentOrders.slice((cashierOrdersPage - 1) * ORDERS_PER_PAGE, cashierOrdersPage * ORDERS_PER_PAGE);
  const totalCashierOrderPages = Math.max(1, Math.ceil(recentOrders.length / ORDERS_PER_PAGE));

  const handleOrderStatus = async (orderId, status) => {
    if (updatingOrderId) return;
    setUpdatingOrderId(orderId);
    try {
      await orderService.update(orderId, { status });
      await fetchData();
    } catch (err) {
      console.error('Failed to update order status', err);
      alert(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ fontFamily: "'Inria Sans', sans-serif" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: t.textPrimary }}>
            Cashier Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>
            Welcome back, {user?.name?.split(' ')[0] || 'Cashier'}. Here's your shift overview.
          </p>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <div className="flex items-center gap-2 justify-end mb-1">
            <FiCalendar size={14} style={{ color: gold }} />
            <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <FiClock size={14} style={{ color: gold }} />
            <span className="text-lg font-bold tabular-nums" style={{ color: gold }}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Take Order button — half width */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <button
          onClick={openOrderModal}
          className="w-full sm:w-1/2 py-5 px-6 rounded-2xl flex items-center justify-between group transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${gold}, ${goldDark})`,
            boxShadow: `0 8px 20px rgba(${goldRgb},0.3)`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 12px 28px rgba(${goldRgb},0.45)`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 8px 20px rgba(${goldRgb},0.3)`; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <FiPlus size={24} className="text-white" />
            </div>
            <div className="text-left">
              <span className="text-xl font-bold block text-white">Take New Order</span>
              <span className="text-white/70 text-sm">Start a new transaction</span>
            </div>
          </div>
          <FiArrowRight size={24} className="text-white group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<FiFileText size={20} />} label="My Orders" value={stats.myOrders} color="#60a5fa" />
        <StatCard icon={<FiClock size={20} />} label="Pending" value={stats.myPending} color="#fbbf24" />
        <StatCard icon={<FiCheckCircle size={20} />} label="Completed" value={stats.myCompleted} color="#34d399" />
        <StatCard icon={<FiDollarSign size={20} />} label="My Collections"
          value={`₱${(stats.myTotalAmount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}`}
          color={gold} />
      </div>

      {/* ──────────── RECENT ORDERS ──────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden mb-8" style={{ background: t.cardBg, border: '1px solid ' + t.divider }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid ' + t.divider }}>
          <h2 className="text-sm font-semibold" style={{ color: t.textPrimary }}>My Recent Orders</h2>
          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md"
            style={{ background: `rgba(${goldRgb},0.12)`, color: gold }}>
            {recentOrders.length} total
          </span>
        </div>
        <div className="p-5 space-y-3">
          {paginatedCashierOrders.map((order) => (
            <div key={order.id} className="rounded-xl p-4"
              style={{ background: t.cardBg, border: '1px solid ' + t.divider }}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>Order #</p>
                  <p className="text-xl font-bold" style={{ color: gold }}>#{String(order.id).padStart(4, '0')}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textFaint }}>Type</p>
                  <p className="text-sm capitalize" style={{ color: t.textPrimary }}>{order.order_type}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textFaint }}>Total</p>
                  <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>
                    ₱{parseFloat(order.total_amount).toLocaleString('en', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textFaint }}>Customer</p>
                  <p className="text-sm" style={{ color: t.textPrimary }}>{order.customer_name || 'Walk-in'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textFaint }}>Date</p>
                  <p className="text-sm" style={{ color: t.textPrimary }}>{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {(order.status === 'pending' || order.status === 'preparing') ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOrderStatus(order.id, 'completed')}
                    disabled={updatingOrderId === order.id}
                    className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                    style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
                    <FiCheckCircle size={13} /> Complete Order
                  </button>
                  <button
                    onClick={() => handleOrderStatus(order.id, 'cancelled')}
                    disabled={updatingOrderId === order.id}
                    className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                    style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                    <FiXCircle size={13} /> Cancel Order
                  </button>
                </div>
              ) : order.status === 'completed' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOrderStatus(order.id, 'served')}
                    disabled={updatingOrderId === order.id}
                    className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                    style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
                    <FiCheckCircle size={13} /> Confirm Served
                  </button>
                </div>
              ) : (
                <p className="text-xs font-medium" style={{ color: t.textMuted }}>Order finalized</p>
              )}
            </div>
          ))}
          {recentOrders.length === 0 && (
            <div className="py-8 text-center text-sm" style={{ color: t.textFaint }}>No orders yet.</div>
          )}
        </div>
        {totalCashierOrderPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid ' + t.divider }}>
            <span className="text-xs" style={{ color: t.textMuted }}>
              Page {cashierOrdersPage} of {totalCashierOrderPages}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCashierOrdersPage((p) => Math.max(1, p - 1))} disabled={cashierOrdersPage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                style={{ background: t.divider, color: t.textPrimary }}>
                ← Prev
              </button>
              <span className="text-xs px-2" style={{ color: t.textSecondary }}>
                {cashierOrdersPage} / {totalCashierOrderPages}
              </span>
              <button onClick={() => setCashierOrdersPage((p) => Math.min(totalCashierOrderPages, p + 1))} disabled={cashierOrdersPage === totalCashierOrderPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                style={{ background: t.divider, color: t.textPrimary }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ──────────── ORDER MODAL ──────────── */}
      <AnimatePresence>
        {orderModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={() => resetModal()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-6xl overflow-hidden rounded-2xl flex flex-col"
              style={{ background: t.modalBg, border: '1px solid ' + t.inputBorder, height: '85vh', fontFamily: "'Inria Sans', sans-serif" }}
            >
              {/* Modal Header */}
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid ' + t.divider }}>
                <div className="flex items-center gap-6">
                  <h2 className="text-xl font-bold" style={{ color: t.textPrimary }}>New Order</h2>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: orderStep >= step ? gold : t.inputBorder,
                            color: orderStep >= step ? '#000' : t.textMuted,
                          }}>
                          {orderStep > step ? <FiCheck size={14} /> : step}
                        </div>
                        <span className="ml-1.5 text-xs font-medium hidden md:block"
                          style={{ color: orderStep >= step ? gold : t.textMuted }}>
                          {step === 1 ? 'Items' : step === 2 ? 'Payment' : step === 3 ? 'Confirm' : 'Receipt'}
                        </span>
                        {step < 4 && <div className="w-6 h-0.5 mx-2" style={{ background: orderStep > step ? gold : t.inputBorder }} />}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={resetModal} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition`} style={{ color: t.textSecondary }}>
                  <FiX size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex">
                {/* ── STEP 1: Select Items ── */}
                {orderStep === 1 && (
                  <>
                    {/* Menu */}
                    <div className="flex-1 p-5 overflow-y-auto" style={{ borderRight: '1px solid ' + t.divider }}>
                      {/* Category tabs */}
                      <div className="flex flex-wrap gap-2 mb-5">
                        <button
                          onClick={() => setMenuCategory('all')}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                          style={{
                            background: menuCategory === 'all' ? gold : t.tableBg,
                            color: menuCategory === 'all' ? '#000' : t.textSecondary,
                            border: menuCategory === 'all' ? 'none' : '1px solid ' + t.modalBorder,
                          }}
                        >
                          All
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setMenuCategory(String(cat.id))}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                            style={{
                              background: menuCategory === String(cat.id) ? gold : t.tableBg,
                              color: menuCategory === String(cat.id) ? '#000' : t.textSecondary,
                              border: menuCategory === String(cat.id) ? 'none' : '1px solid ' + t.modalBorder,
                            }}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>

                      {/* Product grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredProducts.length === 0 ? (
                          <p className="col-span-full text-center py-8 text-sm" style={{ color: t.textFaint }}>
                            No products found.
                          </p>
                        ) : (
                          filteredProducts.map((product) => (
                          <motion.button
                            key={product.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => addToCart(product)}
                            className="p-4 rounded-xl text-left transition-all"
                            style={{ background: t.cardBg, border: '1px solid ' + t.divider }}
                          >
                            <p className="font-medium text-sm mb-1" style={{ color: t.textPrimary }}>{product.name}</p>
                            <p className="text-xs" style={{ color: t.textMuted }}>{product.category?.name}</p>
                            <p className="text-sm font-bold mt-2" style={{ color: gold }}>
                              ₱{parseFloat(product.price).toLocaleString('en', { minimumFractionDigits: 2 })}
                            </p>
                          </motion.button>
                        ))
                        )}
                      </div>
                    </div>

                    {/* Cart sidebar */}
                    <div className="w-80 flex flex-col" style={{ background: isDark ? 'rgba(10,10,10,0.5)' : 'rgba(0,0,0,0.02)' }}>
                      <div className="p-5" style={{ borderBottom: '1px solid ' + t.divider }}>
                        <h3 className="text-sm font-bold mb-4" style={{ color: t.textPrimary }}>Current Order</h3>

                        {/* Order type */}
                        <div className="flex gap-2">
                          {['dine-in', 'takeout', 'delivery'].map((ot) => (
                            <button key={ot} onClick={() => setOrderType(ot)}
                              className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all"
                              style={{
                                background: orderType === ot ? gold : t.tableBg,
                                color: orderType === ot ? '#000' : t.textSecondary,
                                border: orderType === ot ? 'none' : '1px solid ' + t.modalBorder,
                              }}>
                              {ot}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cart items */}
                      <div className="flex-1 overflow-y-auto p-5">
                        {cart.length === 0 ? (
                          <div className="text-center py-8" style={{ color: t.textFaint }}>
                            <FiShoppingCart size={40} className="mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No items yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {cart.map((item) => (
                              <div key={item.product_id} className="flex items-center gap-3 p-3 rounded-lg"
                                style={{ background: t.cardBg }}>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-xs truncate" style={{ color: t.textPrimary }}>{item.name}</p>
                                  <p className="text-[11px]" style={{ color: gold }}>₱{item.unit_price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => updateQuantity(item.product_id, -1)}
                                    className="w-6 h-6 rounded-full flex items-center justify-center"
                                    style={{ background: t.inputBorder }}>
                                    <FiMinus size={12} style={{ color: t.textPrimary }} />
                                  </button>
                                  <span className="w-5 text-center text-xs font-medium" style={{ color: t.textPrimary }}>{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.product_id, 1)}
                                    className="w-6 h-6 rounded-full flex items-center justify-center"
                                    style={{ background: gold }}>
                                    <FiPlus size={12} style={{ color: '#000' }} />
                                  </button>
                                </div>
                                <button onClick={() => removeFromCart(item.product_id)}
                                  className="p-1.5 hover:bg-red-500/20 rounded-lg transition" style={{ color: '#f87171' }}>
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Cart footer */}
                      <div className="p-5" style={{ borderTop: '1px solid ' + t.divider }}>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs" style={{ color: t.textSecondary }}>Subtotal ({cartItemCount} items)</span>
                          <span className="text-lg font-bold" style={{ color: gold }}>₱{cartTotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <button
                          onClick={() => setOrderStep(2)}
                          disabled={cart.length === 0}
                          className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                          style={{
                            background: cart.length > 0 ? `linear-gradient(135deg, ${gold}, ${goldDark})` : t.inputBorder,
                            color: cart.length > 0 ? '#000' : t.textFaint,
                            cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
                          }}>
                          Review Order <FiArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── STEP 2: Payment & Discount ── */}
                {orderStep === 2 && (
                  <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
                    <div className="max-w-lg w-full">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                          style={{ background: `rgba(${goldRgb},0.15)` }}>
                          <FiCreditCard size={28} style={{ color: gold }} />
                        </div>
                        <h3 className="text-xl font-bold" style={{ color: t.textPrimary }}>Payment & Discount</h3>
                        <p className="text-sm mt-1" style={{ color: t.textMuted }}>Select payment method and applicable discount</p>
                      </div>

                      {/* Payment method selection */}
                      <div className="mb-6">
                        <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: t.textSecondary }}>
                          Payment Method
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {paymentMethods.map((method) => {
                            const colorMap = {
                              cash:  { bg: 'rgba(34,197,94,0.15)',  border: '#22c55e', text: '#22c55e' },
                              gcash: { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', text: '#3b82f6' },
                              card:  { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#ef4444' },
                            };
                            const key = method.name.toLowerCase();
                            const c = colorMap[key] || { bg: `rgba(${goldRgb},0.15)`, border: gold, text: gold };
                            const active = selectedPaymentMethod === method.id;
                            return (
                              <button
                                key={method.id}
                                onClick={() => setSelectedPaymentMethod(method.id)}
                                className="p-4 rounded-xl text-center transition-all"
                                style={{
                                  background: active ? c.bg : t.cardBg,
                                  border: active ? `2px solid ${c.border}` : '1px solid ' + t.modalBorder,
                                }}
                              >
                                <FiCreditCard size={20} className="mx-auto mb-2" style={{ color: active ? c.text : t.textSecondary }} />
                                <span className="text-sm font-medium" style={{ color: active ? c.text : t.textPrimary }}>
                                  {method.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Discount selection */}
                      <div className="mb-6">
                        <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: t.textSecondary }}>
                          Discount (20% off)
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { key: 'none', label: 'None', icon: <FiX size={18} /> },
                            { key: 'senior', label: 'Senior Citizen', icon: <FiPercent size={18} /> },
                            { key: 'pwd', label: 'PWD', icon: <FiPercent size={18} /> },
                          ].map((opt) => (
                            <button
                              key={opt.key}
                              onClick={() => setDiscountType(opt.key)}
                              className="p-4 rounded-xl text-center transition-all"
                              style={{
                                background: discountType === opt.key ? (opt.key === 'none' ? t.divider : 'rgba(52,211,153,0.12)') : t.cardBg,
                                border: discountType === opt.key ? (opt.key === 'none' ? '2px solid ' + t.textFaint : '2px solid #34d399') : '1px solid ' + t.modalBorder,
                              }}
                            >
                              <span className="block mx-auto mb-2" style={{ color: discountType === opt.key ? (opt.key === 'none' ? t.textPrimary : '#34d399') : t.textSecondary }}>
                                {opt.icon}
                              </span>
                              <span className="text-xs font-medium" style={{ color: discountType === opt.key ? (opt.key === 'none' ? t.textPrimary : '#34d399') : t.textSecondary }}>
                                {opt.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Order summary with discount */}
                      <div className="p-4 rounded-xl mb-6" style={{ background: t.cardBg, border: '1px solid ' + t.divider }}>
                        <div className="flex justify-between text-sm mb-2">
                          <span style={{ color: t.textSecondary }}>Subtotal ({cartItemCount} items)</span>
                          <span style={{ color: t.textPrimary }}>₱{cartTotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {discountType !== 'none' && (
                          <div className="flex justify-between text-sm mb-2">
                            <span style={{ color: '#34d399' }}>{discountType === 'senior' ? 'Senior' : 'PWD'} Discount (20%)</span>
                            <span style={{ color: '#34d399' }}>-₱{discountAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid ' + t.divider }}>
                          <span className="font-bold" style={{ color: t.textPrimary }}>Total</span>
                          <span className="text-xl font-bold" style={{ color: gold }}>₱{finalTotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      {/* Amount paid input */}
                      <div className="mb-6">
                        <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: t.textSecondary }}>
                          Amount Paid
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold" style={{ color: gold }}>₱</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                            placeholder={finalTotal.toFixed(2)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-lg font-bold"
                            style={{ background: t.inputBg, border: '1px solid ' + t.inputBorder, color: t.textPrimary, outline: 'none' }}
                          />
                        </div>
                        {amountPaid && parseFloat(amountPaid) >= finalTotal && (
                          <div className="mt-2 flex justify-between text-sm">
                            <span style={{ color: t.textSecondary }}>Change</span>
                            <span className="font-bold" style={{ color: '#34d399' }}>₱{changeAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => setOrderStep(1)}
                          className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                          style={{ background: t.modalBorder, color: t.textPrimary, border: '1px solid ' + t.inputBorder }}>
                          <FiArrowLeft size={14} /> Back
                        </button>
                        <button
                          onClick={() => setOrderStep(3)}
                          disabled={!selectedPaymentMethod || !amountPaid || parseFloat(amountPaid) < finalTotal}
                          className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                          style={{
                            background: gold,
                            color: '#000',
                            cursor: (!selectedPaymentMethod || !amountPaid || parseFloat(amountPaid) < finalTotal) ? 'not-allowed' : 'pointer',
                          }}>
                          Review Order <FiArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Confirm ── */}
                {orderStep === 3 && (
                  <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
                    <div className="max-w-lg w-full">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                          style={{ background: `rgba(${goldRgb},0.15)` }}>
                          <FiCheck size={32} style={{ color: gold }} />
                        </div>
                        <h3 className="text-xl font-bold" style={{ color: t.textPrimary }}>Confirm Order</h3>
                        <p className="text-sm mt-1" style={{ color: t.textMuted }}>Review everything before submitting</p>
                      </div>

                      <div className="p-5 rounded-xl mb-6" style={{ background: t.cardBg, border: '1px solid ' + t.divider }}>
                        {/* Order info */}
                        <div className="mb-3 pb-3" style={{ borderBottom: '1px solid ' + t.divider }}>
                          <p className="text-[11px]" style={{ color: t.textMuted }}>Type</p>
                          <p className="text-sm font-medium capitalize" style={{ color: t.textPrimary }}>{orderType}</p>
                        </div>

                        {/* Items */}
                        <div className="space-y-2 mb-3 pb-3" style={{ borderBottom: '1px solid ' + t.divider }}>
                          {cart.map((item) => (
                            <div key={item.product_id} className="flex justify-between text-sm">
                              <span style={{ color: t.textSecondary }}>{item.name} × {item.quantity}</span>
                              <span style={{ color: t.textPrimary }}>₱{(item.unit_price * item.quantity).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>

                        {/* Summary */}
                        <div className="space-y-2 mb-3 pb-3" style={{ borderBottom: '1px solid ' + t.divider }}>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: t.textSecondary }}>Subtotal</span>
                            <span style={{ color: t.textPrimary }}>₱{cartTotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                          </div>
                          {discountType !== 'none' && (
                            <div className="flex justify-between text-sm">
                              <span style={{ color: '#34d399' }}>{discountType === 'senior' ? 'Senior' : 'PWD'} Discount (20%)</span>
                              <span style={{ color: '#34d399' }}>-₱{discountAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-bold">
                            <span style={{ color: t.textPrimary }}>Total</span>
                            <span style={{ color: gold }}>₱{finalTotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        {/* Payment details */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span style={{ color: t.textSecondary }}>Payment Method</span>
                            <span className="font-medium" style={{ color: t.textPrimary }}>
                              {paymentMethods.find((m) => m.id === selectedPaymentMethod)?.name || '—'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: t.textSecondary }}>Amount Paid</span>
                            <span className="font-medium" style={{ color: t.textPrimary }}>₱{parseFloat(amountPaid).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: t.textSecondary }}>Change</span>
                            <span className="font-bold" style={{ color: '#34d399' }}>₱{changeAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => setOrderStep(2)}
                          className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                          style={{ background: t.modalBorder, color: t.textPrimary, border: '1px solid ' + t.inputBorder }}>
                          <FiArrowLeft size={14} /> Back
                        </button>
                        <button onClick={completeOrder} disabled={submitting}
                          className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: '#000' }}>
                          {submitting ? 'Submitting…' : <><FiCheck size={14} /> Place Order</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: Receipt ── */}
                {orderStep === 4 && receiptData && (
                  <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
                    <div className="max-w-md w-full">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                          style={{ background: 'rgba(52,211,153,0.15)' }}>
                          <FiCheckCircle size={32} style={{ color: '#34d399' }} />
                        </div>
                        <h3 className="text-xl font-bold" style={{ color: t.textPrimary }}>Order Complete!</h3>
                        <p className="text-sm mt-1" style={{ color: t.textMuted }}>Order #{String(receiptData.receipt.order_id).padStart(4, '0')}</p>
                      </div>

                      {/* Printable receipt */}
                      <div ref={receiptRef} className="p-6 rounded-xl mb-6" style={{ background: '#fff', color: '#000' }}>
                        {/* Store info */}
                        <div className="text-center mb-4 pb-3" style={{ borderBottom: '2px dashed #ccc' }}>
                          <h4 className="text-lg font-bold">{receiptData.store.name}</h4>
                          <p className="text-xs text-gray-500">{receiptData.store.address}</p>
                          <p className="text-xs text-gray-500">{receiptData.store.phone}</p>
                        </div>

                        {/* Order info */}
                        <div className="text-xs mb-3 space-y-0.5">
                          <div className="flex justify-between"><span className="text-gray-500">Order #</span><span className="font-medium">{receiptData.receipt.order_id}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{receiptData.receipt.date}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Cashier</span><span>{receiptData.receipt.cashier}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{receiptData.receipt.customer}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{receiptData.receipt.order_type}</span></div>
                        </div>

                        <div className="my-3" style={{ borderTop: '1px dashed #ccc' }} />

                        {/* Items */}
                        <div className="text-xs space-y-1 mb-3">
                          <div className="flex justify-between font-bold text-gray-600">
                            <span>Item</span>
                            <span>Total</span>
                          </div>
                          {receiptData.items.map((item, i) => (
                            <div key={i} className="flex justify-between">
                              <span>{item.name}{item.variant ? ` (${item.variant})` : ''} × {item.quantity}</span>
                              <span>₱{item.subtotal}</span>
                            </div>
                          ))}
                        </div>

                        <div className="my-3" style={{ borderTop: '1px dashed #ccc' }} />

                        {/* Summary */}
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between"><span>Subtotal</span><span>₱{receiptData.summary.subtotal}</span></div>
                          {receiptData.summary.discount_type && receiptData.summary.discount_type !== 'none' && (
                            <div className="flex justify-between" style={{ color: '#16a34a' }}>
                              <span>{receiptData.summary.discount_type === 'senior' ? 'Senior' : 'PWD'} Discount (20%)</span>
                              <span>-₱{receiptData.summary.discount_amount}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-sm pt-1" style={{ borderTop: '1px solid #eee' }}>
                            <span>TOTAL</span>
                            <span>₱{receiptData.summary.total}</span>
                          </div>
                          <div className="flex justify-between"><span>Paid ({receiptData.summary.payment_method})</span><span>₱{receiptData.summary.amount_paid}</span></div>
                          <div className="flex justify-between font-bold"><span>Change</span><span>₱{receiptData.summary.change}</span></div>
                        </div>

                        <div className="my-3" style={{ borderTop: '2px dashed #ccc' }} />
                        <p className="text-center text-xs text-gray-400">Thank you! Please come again!</p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            const printContents = receiptRef.current.innerHTML;
                            const win = window.open('', '', 'width=350,height=600');
                            win.document.write(`
                              <html>
                              <head>
                                <title>Receipt</title>
                                <style>
                                  body { font-family: 'Courier New', monospace; padding: 10px; font-size: 12px; }
                                  .flex { display: flex; justify-content: space-between; }
                                  .text-center { text-align: center; }
                                  .font-bold { font-weight: bold; }
                                  .text-lg { font-size: 16px; }
                                  .text-sm { font-size: 13px; }
                                  .text-xs { font-size: 11px; }
                                  .mb-3 { margin-bottom: 8px; }
                                  .mb-4 { margin-bottom: 12px; }
                                  .pb-3 { padding-bottom: 8px; }
                                  .pt-1 { padding-top: 4px; }
                                  .my-3 { margin: 8px 0; }
                                  .space-y-0\\.5 > * + * { margin-top: 2px; }
                                  .space-y-1 > * + * { margin-top: 4px; }
                                  .text-gray-400 { color: #9ca3af; }
                                  .text-gray-500 { color: #6b7280; }
                                  .text-gray-600 { color: #4b5563; }
                                  .font-medium { font-weight: 500; }
                                  @media print { body { margin: 0; } }
                                </style>
                              </head>
                              <body>${printContents}</body>
                              </html>
                            `);
                            win.document.close();
                            win.focus();
                            win.print();
                            win.close();
                          }}
                          className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                          style={{ background: t.modalBorder, color: t.textPrimary, border: '1px solid ' + t.inputBorder }}
                        >
                          <FiPrinter size={14} /> Print Receipt
                        </button>
                        <button onClick={resetModal}
                          className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                          style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}>
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const { t } = useSettings();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl p-5 flex items-center gap-4"
      style={{ background: t.cardBg, border: '1px solid ' + t.divider }}
    >
      <div className="w-11 h-11 rounded-lg flex items-center justify-center"
        style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>{label}</p>
        <p className="text-xl font-bold mt-0.5" style={{ color: t.textPrimary }}>{value}</p>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:   { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    preparing: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
    completed: { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
    served: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
    cancelled: { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
  };
  const s = map[status] || map.pending;
  return (
    <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wide"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}