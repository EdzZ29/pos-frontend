import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';
import { orderService, paymentService } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText, FiDollarSign,
  FiClock, FiCheckCircle, FiXCircle,
  FiPlus, FiX, FiTrash2,
  FiCalendar, FiShoppingCart, FiArrowRight, FiMinus, FiCheck,
  FiArrowLeft, FiPrinter, FiCreditCard, FiPercent,
} from 'react-icons/fi';

const StatCard = ({ icon, label, value, color, t, panelBg, panelBorder }) => (
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
      <p className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>{label}</p>
      <p className="text-xl font-bold mt-0.5" style={{ color: t.textPrimary }}>{value}</p>
    </div>
  </motion.div>
);

/* ─────────────────── MAIN COMPONENT ─────────────────── */
export default function OwnerDashboard() {
  const { user } = useAuth();
  const { gold, goldDark, goldRgb, isDark, t, panelBg, panelBorder, inputStyle } = useSettings();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ── DataContext (shared, pre-loaded cache) ── */
  const {
    products,
    categories,
    addons: allAddons,
    orders,
    users,
    payments,
    paymentMethods: ctxPaymentMethods,
    refreshOrders,
    refreshPayments,
    setOrderStatus: ctxSetOrderStatus,
    prependOrder,
  } = useData();

  /* alias for backward-compat with the rest of the component */
  const recentOrders = orders;

  /* derived stats – recomputed whenever orders / payments / users change */
  const stats = useMemo(() => {
    const revenue = payments
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
    const totalSales = orders
      .filter((o) => o.status === 'completed')
      .reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
    return {
      products: products.length,
      orders: orders.length,
      users: users.length,
      categories: categories.length,
      revenue,
      totalSales,
      pendingOrders:   orders.filter((o) => o.status === 'pending').length,
      completedOrders: orders.filter((o) => o.status === 'completed').length,
      cancelledOrders: orders.filter((o) => o.status === 'cancelled').length,
    };
  }, [products, categories, orders, users, payments]);

  const [expandedOrder, setExpandedOrder] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  /* pagination */
  const [ordersPage, setOrdersPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  /* order modal – restore from sessionStorage */
  const _savedModal = () => {
    try {
      const raw = sessionStorage.getItem('pos_owner_order_modal');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const _saved = _savedModal();

  const [orderModalOpen, setOrderModalOpen] = useState(_saved?.open ?? false);
  const [cart, setCart] = useState(_saved?.cart ?? []);
  const [orderType, setOrderType] = useState(_saved?.orderType ?? 'dine-in');
  const [menuCategory, setMenuCategory] = useState(_saved?.menuCategory ?? 'all');
  const [orderStep, setOrderStep] = useState(_saved?.orderStep ?? 1);
  const [submitting, setSubmitting] = useState(false);
  // paymentMethods comes from DataContext; keep a local copy only when the
  // modal is open so we don't depend on a separate async load
  const paymentMethods = ctxPaymentMethods;
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    _saved?.selectedPaymentMethod ?? (ctxPaymentMethods[0]?.id ?? null)
  );
  const [discountType, setDiscountType] = useState(_saved?.discountType ?? 'none');
  const [amountPaid, setAmountPaid] = useState(_saved?.amountPaid ?? '');
  const [receiptData, setReceiptData] = useState(null);
  const receiptRef = useRef(null);

  // Product selection modal state (for add-ons and notes)
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [addonProduct, setAddonProduct] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [itemNote, setItemNote] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Filter available addons
  const addons = useMemo(
    () => (allAddons || []).filter((a) => a.is_available !== false),
    [allAddons]
  );

  /* persist modal state to sessionStorage */
  useEffect(() => {
    if (orderModalOpen && orderStep < 4) {
      sessionStorage.setItem('pos_owner_order_modal', JSON.stringify({
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
      sessionStorage.removeItem('pos_owner_order_modal');
    }
  }, [orderModalOpen, cart, orderType, menuCategory, orderStep, selectedPaymentMethod, discountType, amountPaid]);

  // Auto-select first payment method once ctxPaymentMethods loads
  useEffect(() => {
    if (!selectedPaymentMethod && ctxPaymentMethods.length > 0) {
      setSelectedPaymentMethod(ctxPaymentMethods[0].id);
    }
  }, [ctxPaymentMethods]); // eslint-disable-line react-hooks/exhaustive-deps

  const openOrderModal = () => {
    setOrderModalOpen(true);
    // Data is already in DataContext cache – no fetch needed
  };

  const addToCart = (product, productAddons = [], note = '', variant = null) => {
    // Create unique key for items with different addons/notes
    const addonKey = productAddons.map(a => a.id).sort().join('-');
    const variantKey = variant ? `_${variant.id}` : '';
    const cart_key = `${product.id}_${addonKey}${variantKey}_${Date.now()}`;
    
    // If variant exists, use variant price as full price; otherwise use product.price
    const basePrice = variant ? parseFloat(variant.additional_price) : parseFloat(product.price);
    
    setCart([...cart, {
      cart_key,
      product_id: product.id,
      name: product.name,
      unit_price: basePrice,
      quantity: 1,
      addons: productAddons,
      note: note,
      variant: variant,
    }]);
  };

  const openAddonModal = (product) => {
    setAddonProduct(product);
    setSelectedAddons([]);
    setItemNote('');
    // Default to first variant if product has variants
    setSelectedVariant(product.variants && product.variants.length > 0 ? product.variants[0] : null);
    setAddonModalOpen(true);
  };

  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) return prev.filter(a => a.id !== addon.id);
      return [...prev, addon];
    });
  };

  const confirmAddWithAddons = () => {
    if (addonProduct) {
      addToCart(addonProduct, selectedAddons, itemNote, selectedVariant);
      setAddonModalOpen(false);
      setAddonProduct(null);
      setSelectedAddons([]);
      setItemNote('');
      setSelectedVariant(null);
    }
  };

  const removeFromCart = (cartKey) => setCart(cart.filter((c) => c.cart_key !== cartKey));

  const updateQuantity = (cartKey, delta) => {
    setCart(cart.map((c) => {
      if (c.cart_key === cartKey) {
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : c;
      }
      return c;
    }).filter((c) => c.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => {
    const addonTotal = item.addons?.reduce((s, a) => s + parseFloat(a.price), 0) || 0;
    return sum + (item.unit_price + addonTotal) * item.quantity;
  }, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Takeout fee
  const takeoutFee = orderType === 'takeout' ? 5 : 0;

  const discountRate = discountType === 'senior' || discountType === 'pwd' ? 0.20 : 0;
  const discountAmount = Math.round(cartTotal * discountRate * 100) / 100;
  const finalTotal = cartTotal - discountAmount + takeoutFee;
  const changeAmount = amountPaid ? Math.max(0, parseFloat(amountPaid) - finalTotal) : 0;

  const completeOrder = async () => {
    if (cart.length === 0 || submitting || !selectedPaymentMethod) return;
    if (!amountPaid || parseFloat(amountPaid) < finalTotal) {
      alert('Amount paid must be at least ₱' + finalTotal.toFixed(2));
      return;
    }
    setSubmitting(true);
    try {
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
      await paymentService.create({
        order_id: newOrder.id,
        payment_method_id: selectedPaymentMethod,
        amount_paid: parseFloat(amountPaid),
      });
      const receipt = await orderService.getReceipt(newOrder.id);
      setReceiptData(receipt);
      // Optimistically push the new order into the global cache so all pages
      // see it immediately; the background refresh will fill in relationships.
      prependOrder(newOrder);
      // Silently refresh in background to get the full order with payment info
      refreshOrders().catch(() => {});
      refreshPayments().catch(() => {});
      setOrderStep(4);
    } catch (err) {
      console.error('Failed to create order', err);
      alert(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const resetOrderModal = () => {
    setCart([]);
    setOrderType('dine-in');
    setMenuCategory('all');
    setOrderStep(1);
    setSelectedPaymentMethod(null);
    setDiscountType('none');
    setAmountPaid('');
    setReceiptData(null);
    setOrderModalOpen(false);
    sessionStorage.removeItem('pos_owner_order_modal');
  };

  const filteredMenuProducts = menuCategory === 'all'
    ? products.filter((p) => p.is_available !== false)
    : products.filter((p) => p.category_id === parseInt(menuCategory) && p.is_available !== false);

  /* paginated data */
  const paginatedOrders = recentOrders.slice((ordersPage - 1) * ITEMS_PER_PAGE, ordersPage * ITEMS_PER_PAGE);
  const totalOrderPages = Math.max(1, Math.ceil(recentOrders.length / ITEMS_PER_PAGE));

  const handleOrderStatus = async (orderId, status) => {
    if (updatingOrderId) return;
    setUpdatingOrderId(orderId);
    // Optimistic update – change reflected instantly
    ctxSetOrderStatus(orderId, status);
    try {
      await orderService.update(orderId, { status });
      // Background refresh to sync any server-side changes
      refreshOrders().catch(() => {});
    } catch (err) {
      console.error('Failed to update order status', err);
      // Roll back optimistic update
      refreshOrders().catch(() => {});
      alert(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ fontFamily: "'Inria Sans', sans-serif" }}>
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>Owner Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>
            Welcome back, {user?.name}. Here's your business overview.
          </p>
        </div>
        <div className="text-left sm:text-right flex-shrink-0">
          <div className="flex items-center gap-2 sm:justify-end mb-1">
            <FiCalendar size={14} style={{ color: gold }} />
            <span className="text-xs sm:text-sm font-semibold" style={{ color: t.textPrimary }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <FiClock size={14} style={{ color: gold }} />
            <span className="text-base sm:text-lg font-bold tabular-nums" style={{ color: gold }}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Take New Order button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <button
          onClick={openOrderModal}
          className="w-full sm:w-1/2 lg:w-auto lg:min-w-[320px] py-4 sm:py-5 px-4 sm:px-6 rounded-2xl flex items-center justify-between group transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${gold}, ${goldDark})`,
            boxShadow: `0 8px 20px rgba(${goldRgb},0.3)`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 12px 28px rgba(${goldRgb},0.45)`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 8px 20px rgba(${goldRgb},0.3)`; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center">
              <FiPlus size={20} className="text-white sm:hidden" />
              <FiPlus size={24} className="text-white hidden sm:block" />
            </div>
            <div className="text-left">
              <span className="text-lg sm:text-xl font-bold block text-white">Take New Order</span>
              <span className="text-white/70 text-xs sm:text-sm">Start a new transaction</span>
            </div>
          </div>
          <FiArrowRight size={20} className="text-white group-hover:translate-x-1 transition-transform sm:hidden" />
          <FiArrowRight size={24} className="text-white group-hover:translate-x-1 transition-transform hidden sm:block" />
        </button>
      </motion.div>

      {/* Stat card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<FiDollarSign size={20} />} label="Total Revenue"
          value={`₱${stats.revenue.toLocaleString('en', { minimumFractionDigits: 2 })}`} color={gold} t={t} panelBg={panelBg} panelBorder={panelBorder} />
      </div>

      {/* Recent orders cards */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden" style={{ background: panelBg, border: panelBorder }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
          <h2 className="text-sm font-semibold" style={{ color: t.textPrimary }}>Recent Orders</h2>
          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md"
            style={{ background: `rgba(${goldRgb},0.12)`, color: gold }}>
            {recentOrders.length} total
          </span>
        </div>
        <div className="p-5 space-y-3">
          {paginatedOrders.map((order) => (
            <div key={order.id} className="rounded-xl p-4"
              style={{ background: t.cardBg, border: `1px solid ${t.divider}` }}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>Order #</p>
                  <p className="text-xl font-bold" style={{ color: gold }}>#{String(order.id).padStart(4, '0')}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textFaint }}>Customer</p>
                  <p className="text-sm font-medium" style={{ color: t.textPrimary }}>{order.customer_name || 'Walk-in'}</p>
                </div>
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
        {totalOrderPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: panelBorder }}>
            <span className="text-xs" style={{ color: t.textMuted }}>
              Page {ordersPage} of {totalOrderPages} ({recentOrders.length} orders)
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setOrdersPage((p) => Math.max(1, p - 1))} disabled={ordersPage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                style={{ background: t.divider, color: t.textPrimary }}>
                ← Prev
              </button>
              <span className="text-xs px-2" style={{ color: t.textSecondary }}>
                {ordersPage} / {totalOrderPages}
              </span>
              <button onClick={() => setOrdersPage((p) => Math.min(totalOrderPages, p + 1))} disabled={ordersPage === totalOrderPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                style={{ background: t.divider, color: t.textPrimary }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ═══════════════ ORDER MODAL ═══════════════ */}
      <AnimatePresence>
        {orderModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={() => resetOrderModal()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-6xl overflow-hidden rounded-2xl flex flex-col"
              style={{ background: t.modalBg, border: t.inputBorder, height: '90vh', maxHeight: '90vh', fontFamily: "'Inria Sans', sans-serif" }}
            >
              {/* Modal Header */}
              <div className="p-3 sm:p-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: panelBorder }}>
                <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-bold flex-shrink-0" style={{ color: t.textPrimary }}>New Order</h2>
                  <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto flex-shrink-0">
                    {[1, 2, 3, 4].map((step) => (
                      <div key={step} className="flex items-center flex-shrink-0">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold"
                          style={{
                            background: orderStep >= step ? gold : t.inputBorder,
                            color: orderStep >= step ? '#000' : t.textMuted,
                          }}>
                          {orderStep > step ? <FiCheck size={12} /> : step}
                        </div>
                        <span className="ml-1 sm:ml-1.5 text-[10px] sm:text-xs font-medium hidden lg:block"
                          style={{ color: orderStep >= step ? gold : t.textMuted }}>
                          {step === 1 ? 'Items' : step === 2 ? 'Payment' : step === 3 ? 'Confirm' : 'Receipt'}
                        </span>
                        {step < 4 && <div className="w-3 sm:w-6 h-0.5 mx-1 sm:mx-2" style={{ background: orderStep > step ? gold : t.inputBorder }} />}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={resetOrderModal} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition flex-shrink-0`} style={{ color: t.textSecondary }}>
                  <FiX size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* ── STEP 1: Select Items ── */}
                {orderStep === 1 && (
                  <>
                    {/* Menu */}
                    <div className="flex-1 p-3 sm:p-5 overflow-y-auto" style={{ borderRight: panelBorder }}>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 mb-4 sm:mb-5">
                        <button
                          onClick={() => setMenuCategory('all')}
                          className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all text-center truncate"
                          style={{
                            background: menuCategory === 'all' ? gold : t.tableBg,
                            color: menuCategory === 'all' ? '#000' : t.textSecondary,
                            border: menuCategory === 'all' ? 'none' : t.modalBorder,
                          }}
                        >
                          All
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setMenuCategory(String(cat.id))}
                            className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all text-center truncate"
                            style={{
                              background: menuCategory === String(cat.id) ? gold : t.tableBg,
                              color: menuCategory === String(cat.id) ? '#000' : t.textSecondary,
                              border: menuCategory === String(cat.id) ? 'none' : t.modalBorder,
                            }}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                        {filteredMenuProducts.length === 0 ? (
                          <p className="col-span-full text-center py-8 text-sm" style={{ color: t.textFaint }}>
                            No products found.
                          </p>
                        ) : (
                          filteredMenuProducts.map((product) => (
                            <motion.div
                              key={product.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => openAddonModal(product)}
                              className="p-3 sm:p-4 rounded-xl text-left transition-all cursor-pointer"
                              style={{ background: t.cardBg, border: panelBorder }}
                            >
                              <p className="font-medium text-xs sm:text-sm mb-1 truncate" style={{ color: t.textPrimary }}>{product.name}</p>
                              <p className="text-[10px] sm:text-xs truncate" style={{ color: t.textMuted }}>{product.category?.name}</p>
                              <p className="text-xs sm:text-sm font-bold mt-2" style={{ color: gold }}>
                                ₱{parseFloat(product.price).toLocaleString('en', { minimumFractionDigits: 2 })}
                              </p>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Cart sidebar - collapsible on mobile */}
                    <div className="w-full lg:w-80 flex flex-col flex-shrink-0 max-h-[40vh] lg:max-h-none border-t lg:border-t-0" style={{ background: isDark ? 'rgba(10,10,10,0.5)' : 'rgba(0,0,0,0.02)', borderColor: t.divider }}>
                      <div className="p-3 sm:p-5" style={{ borderBottom: panelBorder }}>
                        <h3 className="text-xs sm:text-sm font-bold mb-3 sm:mb-4" style={{ color: t.textPrimary }}>Current Order</h3>
                        <div className="flex gap-1.5 sm:gap-2">
                          {['dine-in', 'takeout', 'delivery'].map((typ) => (
                            <button key={typ} onClick={() => setOrderType(typ)}
                              className="flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-medium capitalize transition-all"
                              style={{
                                background: orderType === typ ? gold : t.tableBg,
                                color: orderType === typ ? '#000' : t.textSecondary,
                                border: orderType === typ ? 'none' : t.modalBorder,
                              }}>
                              {typ}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
                        {cart.length === 0 ? (
                          <div className="text-center py-4 sm:py-8" style={{ color: t.textFaint }}>
                            <FiShoppingCart size={32} className="mx-auto mb-2 sm:mb-3 opacity-50 sm:hidden" />
                            <FiShoppingCart size={40} className="mx-auto mb-3 opacity-50 hidden sm:block" />
                            <p className="text-xs sm:text-sm">No items yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2 sm:space-y-3">
                            {cart.map((item) => (
                              <div key={item.cart_key || item.product_id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg"
                                style={{ background: t.cardBg }}>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-[10px] sm:text-xs truncate" style={{ color: t.textPrimary }}>
                                    {item.name}{item.variant && ` (${item.variant.name})`}
                                  </p>
                                  {item.addons && item.addons.length > 0 && (
                                    <p className="text-[11px] sm:text-xs mt-0.5" style={{ color: t.textMuted }}>
                                      +{item.addons.map(a => a.name).join(', ')}
                                    </p>
                                  )}
                                  {item.note && (
                                    <p className="text-[11px] sm:text-xs mt-0.5 italic" style={{ color: t.textFaint }}>
                                      "{item.note}"
                                    </p>
                                  )}
                                  <p className="text-[10px] sm:text-[11px] mt-1" style={{ color: gold }}>
                                    ₱{(item.unit_price + (item.addons?.reduce((s, a) => s + parseFloat(a.price), 0) || 0)).toFixed(2)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                  <button onClick={() => updateQuantity(item.cart_key, -1)}
                                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center"
                                    style={{ background: t.inputBorder }}>
                                    <FiMinus size={10} style={{ color: t.textPrimary }} />
                                  </button>
                                  <span className="w-4 sm:w-5 text-center text-[10px] sm:text-xs font-medium" style={{ color: t.textPrimary }}>{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.cart_key, 1)}
                                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center"
                                    style={{ background: gold }}>
                                    <FiPlus size={10} style={{ color: '#000' }} />
                                  </button>
                                </div>
                                <button onClick={() => removeFromCart(item.cart_key)}
                                  className="p-1 sm:p-1.5 hover:bg-red-500/20 rounded-lg transition" style={{ color: '#f87171' }}>
                                  <FiTrash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-3 sm:p-5" style={{ borderTop: panelBorder }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] sm:text-xs" style={{ color: t.textSecondary }}>Subtotal ({cartItemCount} items)</span>
                          <span className="text-xs sm:text-sm" style={{ color: t.textPrimary }}>₱{cartTotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {takeoutFee > 0 && (
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] sm:text-xs" style={{ color: t.textSecondary }}>Takeout Fee</span>
                            <span className="text-xs sm:text-sm" style={{ color: t.textPrimary }}>₱{takeoutFee.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center mb-2 sm:mb-3 pt-1" style={{ borderTop: `1px solid ${t.divider}` }}>
                          <span className="text-[10px] sm:text-xs font-semibold" style={{ color: t.textPrimary }}>Total</span>
                          <span className="text-base sm:text-lg font-bold" style={{ color: gold }}>₱{(cartTotal + takeoutFee).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <button
                          onClick={() => setOrderStep(2)}
                          disabled={cart.length === 0}
                          className="w-full py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                          style={{
                            background: cart.length > 0 ? `linear-gradient(135deg, ${gold}, ${goldDark})` : 'rgba(255,255,255,0.1)',
                            color: cart.length > 0 ? '#000' : 'rgba(255,255,255,0.3)',
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
                  <div className="flex-1 p-4 sm:p-8 overflow-y-auto flex items-center justify-center">
                    <div className="max-w-lg w-full">
                      <div className="text-center mb-4 sm:mb-6">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center"
                          style={{ background: `rgba(${goldRgb},0.15)` }}>
                          <FiCreditCard size={22} className="sm:hidden" style={{ color: gold }} />
                          <FiCreditCard size={28} className="hidden sm:block" style={{ color: gold }} />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold" style={{ color: t.textPrimary }}>Payment & Discount</h3>
                        <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMuted }}>Select payment method and applicable discount</p>
                      </div>

                      <div className="mb-6">
                        <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: t.textSecondary }}>
                          Payment Method
                        </label>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          {paymentMethods.length === 0 ? (
                            <p className="col-span-3 text-center py-4 text-xs" style={{ color: t.textFaint }}>No payment methods available</p>
                          ) : (
                            paymentMethods.map((method) => {
                              const colorMap = {
                                cash: { bg: 'rgba(34,197,94,0.15)', border: '#22c55e', text: '#22c55e' },
                                gcash: { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', text: '#3b82f6' },
                                card: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#ef4444' },
                              };
                              const key = method.name.toLowerCase();
                              const c = colorMap[key] || { bg: `rgba(${goldRgb},0.15)`, border: gold, text: gold };
                              const active = selectedPaymentMethod === method.id;
                              return (
                                <button
                                  key={method.id}
                                  onClick={() => setSelectedPaymentMethod(method.id)}
                                  className="p-3 sm:p-4 rounded-xl text-center transition-all"
                                  style={{
                                    background: active ? c.bg : t.cardBg,
                                    border: active ? `2px solid ${c.border}` : t.modalBorder,
                                  }}
                                >
                                  <FiCreditCard size={18} className="mx-auto mb-1.5 sm:mb-2 sm:hidden" style={{ color: active ? c.text : t.textSecondary }} />
                                  <FiCreditCard size={20} className="mx-auto mb-2 hidden sm:block" style={{ color: active ? c.text : t.textSecondary }} />
                                  <span className="text-xs sm:text-sm font-medium" style={{ color: active ? c.text : t.textPrimary }}>
                                    {method.name}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

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
                                border: discountType === opt.key ? (opt.key === 'none' ? `2px solid ${t.textFaint}` : '2px solid #34d399') : t.modalBorder,
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

                      <div className="p-4 rounded-xl mb-6" style={{ background: t.cardBg, border: panelBorder }}>
                        <div className="flex justify-between text-sm mb-2">
                          <span style={{ color: t.textSecondary }}>Subtotal ({cartItemCount} items)</span>
                          <span style={{ color: t.textPrimary }}>₱{cartTotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {takeoutFee > 0 && (
                          <div className="flex justify-between text-sm mb-2">
                            <span style={{ color: t.textSecondary }}>Takeout Fee</span>
                            <span style={{ color: t.textPrimary }}>₱{takeoutFee.toFixed(2)}</span>
                          </div>
                        )}
                        {discountType !== 'none' && (
                          <div className="flex justify-between text-sm mb-2">
                            <span style={{ color: '#34d399' }}>{discountType === 'senior' ? 'Senior' : 'PWD'} Discount (20%)</span>
                            <span style={{ color: '#34d399' }}>-₱{discountAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2" style={{ borderTop: panelBorder }}>
                          <span className="font-bold" style={{ color: t.textPrimary }}>Total</span>
                          <span className="text-xl font-bold" style={{ color: gold }}>₱{finalTotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

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
                            style={{ ...inputStyle }}
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
                          style={{ background: t.hoverBg, color: t.textPrimary, border: t.inputBorder }}>
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

                      <div className="p-5 rounded-xl mb-6" style={{ background: t.cardBg, border: panelBorder }}>
                        <div className="mb-3 pb-3" style={{ borderBottom: panelBorder }}>
                          <p className="text-[11px]" style={{ color: t.textMuted }}>Type</p>
                          <p className="text-sm font-medium capitalize" style={{ color: t.textPrimary }}>{orderType}</p>
                        </div>

                        <div className="space-y-2 mb-3 pb-3" style={{ borderBottom: panelBorder }}>
                          {cart.map((item) => (
                            <div key={item.product_id} className="flex justify-between text-sm">
                              <span style={{ color: t.textSecondary }}>{item.name} × {item.quantity}</span>
                              <span style={{ color: t.textPrimary }}>₱{(item.unit_price * item.quantity).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2 mb-3 pb-3" style={{ borderBottom: panelBorder }}>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: t.textSecondary }}>Subtotal</span>
                            <span style={{ color: t.textPrimary }}>₱{cartTotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                          </div>
                          {takeoutFee > 0 && (
                            <div className="flex justify-between text-sm">
                              <span style={{ color: t.textSecondary }}>Takeout Fee</span>
                              <span style={{ color: t.textPrimary }}>₱{takeoutFee.toFixed(2)}</span>
                            </div>
                          )}
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
                          style={{ background: t.hoverBg, color: t.textPrimary, border: t.inputBorder }}>
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

                      <div ref={receiptRef} className="p-6 rounded-xl mb-6" style={{ background: '#fff', color: '#000' }}>
                        <div className="text-center mb-4 pb-3" style={{ borderBottom: '2px dashed #ccc' }}>
                          <h4 className="text-lg font-bold">{receiptData.store.name}</h4>
                          <p className="text-xs text-gray-500">{receiptData.store.address}</p>
                          <p className="text-xs text-gray-500">{receiptData.store.phone}</p>
                        </div>

                        <div className="text-xs mb-3 space-y-0.5">
                          <div className="flex justify-between"><span className="text-gray-500">Order #</span><span className="font-medium">{receiptData.receipt.order_id}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{receiptData.receipt.date}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Cashier</span><span>{receiptData.receipt.cashier}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{receiptData.receipt.customer}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{receiptData.receipt.order_type}</span></div>
                        </div>

                        <div className="my-3" style={{ borderTop: '1px dashed #ccc' }} />

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
                          style={{ background: t.hoverBg, color: t.textPrimary, border: t.inputBorder }}
                        >
                          <FiPrinter size={14} /> Print Receipt
                        </button>
                        <button onClick={resetOrderModal}
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
        )}      </AnimatePresence>

      {/* ──────────── PRODUCT SELECTION MODAL (Add-ons & Notes) ──────────── */}
      <AnimatePresence>
        {addonModalOpen && addonProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={() => setAddonModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-2xl"
              style={{ background: t.modalBg, border: `1px solid ${t.inputBorder}` }}
            >
              {/* Product Header */}
              <div className="p-5" style={{ borderBottom: '1px solid ' + t.divider }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: t.textPrimary }}>
                      {addonProduct.name}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                      {addonProduct.category?.name || 'Uncategorized'}
                    </p>
                  </div>
                  <p className="text-xl font-bold" style={{ color: gold }}>
                    ₱{parseFloat(addonProduct.price).toLocaleString('en', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {addonProduct.description && (
                  <p className="text-sm mt-3" style={{ color: t.textSecondary }}>
                    {addonProduct.description}
                  </p>
                )}
              </div>

              <div className="p-5 max-h-[50vh] overflow-y-auto space-y-5">
                {/* Size Selector - only show if product has variants */}
                {addonProduct.variants && addonProduct.variants.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                      Size
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {addonProduct.variants.map((variant) => {
                        const isSelected = selectedVariant?.id === variant.id;
                        return (
                          <button
                            key={variant.id}
                            onClick={() => setSelectedVariant(variant)}
                            className="py-2.5 px-3 rounded-xl text-sm font-semibold transition flex flex-col items-center"
                            style={{
                              background: isSelected ? gold : t.cardBg,
                              color: isSelected ? '#000' : t.textPrimary,
                              border: `1px solid ${isSelected ? gold : t.divider}`,
                            }}
                          >
                            <span>{variant.name}</span>
                            <span className="text-xs mt-0.5" style={{ color: isSelected ? '#000' : gold }}>
                              ₱{parseFloat(variant.additional_price).toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add-ons Section */}
                {(() => {
                  const filteredAddons = addons.filter(a => {
                    const categoryMatch = !a.category_id || a.category_id === addonProduct.category_id;
                    const productMatch = !a.product_id || a.product_id === addonProduct.id;
                    return categoryMatch && productMatch;
                  });
                  return (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                        Add-ons (Optional)
                      </h4>
                      {filteredAddons.length === 0 ? (
                        <p className="text-center py-4 text-sm rounded-xl" style={{ color: t.textFaint, background: t.cardBg }}>
                          No add-ons available for this product
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {filteredAddons.map((addon) => {
                            const isSelected = selectedAddons.some(a => a.id === addon.id);
                            return (
                              <button
                                key={addon.id}
                                onClick={() => toggleAddon(addon)}
                                className="p-4 rounded-xl text-center transition-all relative"
                                style={{
                                  background: isSelected ? `rgba(${goldRgb},0.15)` : t.cardBg,
                                  border: isSelected ? `2px solid ${gold}` : `1px solid ${t.divider}`,
                                }}
                              >
                                {isSelected && (
                                  <div className="absolute top-2 right-2">
                                    <FiCheck size={14} style={{ color: gold }} />
                                  </div>
                                )}
                                <p className="font-semibold text-sm mb-1" style={{ color: t.textPrimary }}>{addon.name}</p>
                                {addon.description && (
                                  <p className="text-[10px] mb-2 line-clamp-2" style={{ color: t.textMuted }}>{addon.description}</p>
                                )}
                                <p className="text-sm font-bold" style={{ color: gold }}>
                                  +₱{parseFloat(addon.price).toFixed(2)}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Notes Section */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                    Special Instructions (Optional)
                  </h4>
                  <textarea
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                    placeholder="E.g. No onions, extra spicy, well done..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
                    style={{ 
                      background: t.cardBg, 
                      border: `1px solid ${t.divider}`, 
                      color: t.textPrimary,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Footer with total and buttons */}
              <div className="p-5" style={{ borderTop: '1px solid ' + t.divider }}>
                {/* Price breakdown */}
                <div className="mb-4 p-3 rounded-xl" style={{ background: t.cardBg }}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: t.textSecondary }}>
                      {selectedVariant ? `Price (${selectedVariant.name})` : 'Price'}
                    </span>
                    <span style={{ color: t.textPrimary }}>
                      ₱{(selectedVariant ? parseFloat(selectedVariant.additional_price) : parseFloat(addonProduct.price)).toFixed(2)}
                    </span>
                  </div>
                  {selectedAddons.length > 0 && (
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: t.textSecondary }}>Add-ons ({selectedAddons.length})</span>
                      <span style={{ color: gold }}>+₱{selectedAddons.reduce((s, a) => s + parseFloat(a.price), 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-2 mt-2" style={{ borderTop: `1px solid ${t.divider}` }}>
                    <span style={{ color: t.textPrimary }}>Total</span>
                    <span style={{ color: gold }}>
                      ₱{((selectedVariant ? parseFloat(selectedVariant.additional_price) : parseFloat(addonProduct.price)) + selectedAddons.reduce((s, a) => s + parseFloat(a.price), 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setAddonModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                    style={{ background: t.divider, color: t.textPrimary }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAddWithAddons}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}
                  >
                    <FiPlus size={14} /> Add to Order
                  </button>
                </div>
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
    pending: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
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
