import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiUsers, FiAlertCircle, FiEye, FiCheckCircle } from 'react-icons/fi';
import { useSettings } from '../../context/SettingsContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function QueueColumn({ title, orders, gold, goldRgb, t, panelBg, panelBorder, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden h-full flex flex-col"
      style={{ 
        background: panelBg, 
        border: panelBorder,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
      }}
    >
      {/* Header */}
      <div 
        className="px-6 py-5 flex items-center justify-between"
        style={{ 
          borderBottom: `1px solid rgba(${goldRgb},0.15)`,
          background: `linear-gradient(to right, rgba(${goldRgb},0.05), transparent)`
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `rgba(${goldRgb},0.15)` }}
          >
            <Icon size={18} color={gold} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: t.textPrimary, fontFamily: "'Inria Sans', sans-serif" }}>
              {title}
            </h2>
            <p className="text-xs" style={{ color: t.textMuted }}>Current queue</p>
          </div>
        </div>
        <div 
          className="px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ 
            background: `rgba(${goldRgb},0.12)`, 
            color: gold,
            border: `1px solid rgba(${goldRgb},0.2)`
          }}
        >
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[500px]">
        {orders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full min-h-[300px] flex flex-col items-center justify-center gap-3"
          >
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: `rgba(${goldRgb},0.08)` }}
            >
              <FiEye size={24} style={{ color: t.textMuted }} />
            </div>
            <p className="text-sm text-center" style={{ color: t.textFaint }}>
              No {title.toLowerCase()} orders in queue
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="group relative rounded-xl overflow-hidden transition-all duration-200"
                style={{ 
                  background: `linear-gradient(135deg, ${t.cardBg}, rgba(${goldRgb},0.02))`,
                  border: `1px solid ${index === 0 ? `rgba(${goldRgb},0.3)` : panelBorder}`,
                  boxShadow: index === 0 ? `0 4px 12px rgba(${goldRgb},0.15)` : 'none'
                }}
              >
                {/* Next order indicator */}
                {index === 0 && (
                  <div 
                    className="absolute top-0 left-0 w-1 h-full"
                    style={{ background: gold }}
                  />
                )}
                
                {/* Status badge for next order */}
                {index === 0 && (
                  <div 
                    className="absolute top-2 right-2 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{ 
                      background: gold,
                      color: '#000',
                      letterSpacing: '0.05em'
                    }}
                  >
                    NEXT
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
                        Order Number
                      </p>
                      <p className="text-5xl leading-none font-black tracking-wide" style={{
                        color: index === 0 ? gold : t.textPrimary,
                        fontFamily: "'Inria Sans', sans-serif",
                        textShadow: index === 0 ? `0 0 10px rgba(${goldRgb},0.3)` : 'none'
                      }}>
                        {String(order.id).padStart(4, '0')}
                      </p>
                    </div>

                    <span
                      className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold"
                      style={{
                        background: order.order_type === 'dine-in' ? 'rgba(96,165,250,0.15)' : 'rgba(251,191,36,0.15)',
                        color: order.order_type === 'dine-in' ? '#60a5fa' : '#fbbf24',
                        border: `1px solid ${order.order_type === 'dine-in' ? 'rgba(96,165,250,0.25)' : 'rgba(251,191,36,0.25)'}`,
                      }}>
                      {order.order_type}
                    </span>
                    
                    {/* Status Badge */}
                    <div 
                      className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background: order.status === 'preparing' 
                          ? 'rgba(96,165,250,0.15)' 
                          : 'rgba(251,191,36,0.15)',
                        color: order.status === 'preparing' ? '#60a5fa' : '#fbbf24',
                        border: `1px solid ${order.status === 'preparing' 
                          ? 'rgba(96,165,250,0.3)' 
                          : 'rgba(251,191,36,0.3)'}`
                      }}
                    >
                      {order.status}
                    </div>
                  </div>

                  {/* Additional Info - Customer Name if available */}
                  {order.customer_name && (
                    <div className="mt-2 text-xs" style={{ color: t.textMuted }}>
                      👤 {order.customer_name}
                    </div>
                  )}
                </div>

                {/* Hover effect overlay */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ 
                    background: `linear-gradient(45deg, transparent, rgba(${goldRgb},0.02))`
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer with stats */}
      {orders.length > 0 && (
        <div 
          className="px-5 py-3 text-xs flex items-center justify-between"
          style={{ 
            borderTop: `1px solid rgba(${goldRgb},0.1)`,
            background: `rgba(${goldRgb},0.02)`
          }}
        >
          <span style={{ color: t.textMuted }}>
            Avg. wait: <span style={{ color: gold, fontWeight: 600 }}>12 min</span>
          </span>
          <span style={{ color: t.textMuted }}>
            Est. total: <span style={{ color: gold, fontWeight: 600 }}>{orders.length * 15} min</span>
          </span>
        </div>
      )}
    </motion.div>
  );
}

function ServingNowColumn({ orders, gold, goldRgb, t, panelBg, panelBorder, onConfirm, confirmingId }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden h-full flex flex-col"
      style={{
        background: panelBg,
        border: panelBorder,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      }}
    >
      <div
        className="px-6 py-5 flex items-center justify-between"
        style={{
          borderBottom: `1px solid rgba(${goldRgb},0.15)`,
          background: `linear-gradient(to right, rgba(${goldRgb},0.05), transparent)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${goldRgb},0.15)` }}>
            <FiCheckCircle size={18} color={gold} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: t.textPrimary, fontFamily: "'Inria Sans', sans-serif" }}>
              Serving Now
            </h2>
            <p className="text-xs" style={{ color: t.textMuted }}>Completed orders ready for pickup</p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: `rgba(${goldRgb},0.12)`, color: gold, border: `1px solid rgba(${goldRgb},0.2)` }}>
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </div>
      </div>

      <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[500px]">
        {orders.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `rgba(${goldRgb},0.08)` }}>
              <FiEye size={24} style={{ color: t.textMuted }} />
            </div>
            <p className="text-sm text-center" style={{ color: t.textFaint }}>No completed orders waiting.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="rounded-xl p-4" style={{ background: `linear-gradient(135deg, ${t.cardBg}, rgba(${goldRgb},0.02))`, border: `1px solid ${panelBorder}` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>Order Number</p>
                  <p className="text-4xl leading-none font-black tracking-wide" style={{ color: gold, fontFamily: "'Inria Sans', sans-serif" }}>
                    {String(order.id).padStart(4, '0')}
                  </p>
                </div>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold" style={{ background: order.order_type === 'dine-in' ? 'rgba(96,165,250,0.15)' : 'rgba(251,191,36,0.15)', color: order.order_type === 'dine-in' ? '#60a5fa' : '#fbbf24' }}>
                  {order.order_type}
                </span>
              </div>

              <button
                onClick={() => onConfirm(order.id)}
                disabled={confirmingId === order.id}
                className="w-full py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
              >
                {confirmingId === order.id ? 'Confirming…' : 'Confirm Served / Picked Up'}
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

export default function PublicQueuePage() {
  const { gold, goldRgb, t, panelBg, panelBorder, isDark } = useSettings();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const seenOrderIdsRef = useRef(new Set());
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const previousBodyFont = document.body.style.fontFamily;
    document.body.style.fontFamily = "'Inria Sans', sans-serif";
    return () => {
      document.body.style.fontFamily = previousBodyFont;
    };
  }, []);

  const announceOrderNumber = useCallback((orderId, orderType) => {
    if (!('speechSynthesis' in window)) return;
    const readableType = orderType === 'dine-in' ? 'dine in' : orderType;
    const announcement = `New ${readableType} order number ${String(orderId).padStart(4, '0')}`;
    const utterance = new SpeechSynthesisUtterance(announcement);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      setError('');
      const res = await fetch(`${API_URL}/orders/queue/upcoming`, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Failed to load queue');
      }

      const data = await res.json();
      const nextOrders = Array.isArray(data) ? data : [];

      const nextIds = new Set(nextOrders.map((o) => o.id));

      if (!hasInitializedRef.current) {
        seenOrderIdsRef.current = nextIds;
        hasInitializedRef.current = true;
      } else {
        const newlyAdded = nextOrders.filter((o) => !seenOrderIdsRef.current.has(o.id));
        newlyAdded.forEach((o) => announceOrderNumber(o.id, o.order_type));
        seenOrderIdsRef.current = nextIds;
      }

      setOrders(nextOrders);
    } catch (err) {
      setError(err.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [announceOrderNumber]);

  const confirmServed = async (orderId) => {
    if (confirmingOrderId) return;
    setConfirmingOrderId(orderId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/confirm-served`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Failed to confirm served order');
      }

      await fetchQueue();
    } catch (err) {
      alert(err.message || 'Failed to confirm served order');
    } finally {
      setConfirmingOrderId(null);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const preparingOrders = useMemo(() => (
    orders
      .filter((o) => o.status === 'preparing')
      .sort((a, b) => a.id - b.id)
  ), [orders]);

  const servingNowOrders = useMemo(() => (
    orders
      .filter((o) => o.status === 'completed')
      .sort((a, b) => a.id - b.id)
  ), [orders]);

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ 
      fontFamily: "'Inria Sans', sans-serif",
      background: isDark ? '#0a0a0a' : '#f8fafc'
    }}>
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, rgba(${goldRgb},0.05) 0%, transparent 70%)` }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, rgba(${goldRgb},0.05) 0%, transparent 70%)` }}
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 relative z-10"
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, rgba(${goldRgb},0.15), rgba(${goldRgb},0.05))`,
                  border: `1px solid rgba(${goldRgb},0.2)`
                }}
              >
                <FiClock size={20} color={gold} />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold" style={{ 
                  color: t.textPrimary,
                  fontFamily: "'Inria Sans', sans-serif"
                }}>
                  Order Queue
                </h1>
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0 ml-4">
            <div 
              className="flex items-center gap-2 justify-end mb-1"
            >
              <FiClock size={14} style={{ color: gold }} />
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
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl p-16 text-center relative z-10"
          style={{ background: panelBg, border: panelBorder }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-t-transparent"
            style={{ borderColor: `${gold} transparent ${gold} ${gold}` }}
          />
          <p style={{ color: t.textMuted }}>Loading queue...</p>
        </motion.div>
      )}

      {/* Error State */}
      {!loading && error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-12 text-center relative z-10"
          style={{ background: panelBg, border: panelBorder }}
        >
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(248,113,113,0.1)' }}
          >
            <FiAlertCircle size={24} color="#f87171" />
          </div>
          <p className="text-sm font-medium mb-2" style={{ color: '#f87171' }}>{error}</p>
          <button
            onClick={fetchQueue}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{ 
              background: `rgba(${goldRgb},0.1)`,
              border: `1px solid rgba(${goldRgb},0.3)`,
              color: gold
            }}
          >
            Try Again
          </button>
        </motion.div>
      )}

      {/* Queue Columns */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
          <QueueColumn 
            title="Preparing Orders" 
            orders={preparingOrders} 
            gold={gold} 
            goldRgb={goldRgb} 
            t={t} 
            panelBg={panelBg} 
            panelBorder={panelBorder}
            icon={FiUsers}
          />
          <ServingNowColumn
            orders={servingNowOrders}
            gold={gold} 
            goldRgb={goldRgb} 
            t={t} 
            panelBg={panelBg} 
            panelBorder={panelBorder}
            onConfirm={confirmServed}
            confirmingId={confirmingOrderId}
          />
        </div>
      )}

      {/* Queue Information Footer */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-xs relative z-10"
          style={{ color: t.textFaint }}
        >
          <p>
            Orders are updated in real-time. 
            <span style={{ color: gold }}> #1</span> indicates the next order to be prepared.
          </p>
        </motion.div>
      )}
    </div>
  );
}