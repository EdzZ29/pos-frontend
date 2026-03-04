import { useState, useMemo, useCallback } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';
import {
  FiCalendar, FiDollarSign, FiFileText, FiTrendingUp,
  FiShoppingBag, FiBarChart2, FiRefreshCw, FiPercent,
} from 'react-icons/fi';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, LineChart, Line,
} from 'recharts';

/* ─── helpers ─── */
const fmt = (n) => `₱${(n || 0).toLocaleString('en', { minimumFractionDigits: 2 })}`;

const StatCard = ({ icon, label, value, color, sub }) => {
  const { t, panelBg, panelBorder } = useSettings();
  return (
    <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: panelBg, border: panelBorder }}>
      <div className="w-11 h-11 rounded-lg flex items-center justify-center"
        style={{ background: `${color}18`, color }}>{icon}</div>
      <div>
        <p className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>{label}</p>
        <p className="text-xl font-bold mt-0.5" style={{ color: t.textPrimary }}>{value}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: t.textFaint }}>{sub}</p>}
      </div>
    </div>
  );
};

/* ═════════════════════════════════════
   REPORTS PAGE
   ═════════════════════════════════════ */
export default function ReportsPage() {
  const { gold, goldRgb, isDark, t, panelBg, panelBorder, inputStyle } = useSettings();
  const { orders, payments, loading, refreshOrders, refreshPayments } = useData();
  const handleManualRefresh = useCallback(async () => {
    await Promise.all([refreshOrders(), refreshPayments()]);
  }, [refreshOrders, refreshPayments]);
  const lastRefresh = useMemo(() => new Date(), [orders]);
  const customTooltipStyle = {
    background: isDark ? '#1a1a1a' : '#fff',
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 10,
    color: t.textPrimary,
    fontSize: 12,
    padding: '8px 12px',
  };
  const CHART_COLORS = [gold, '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fbbf24', '#f87171'];
  const [period, setPeriod] = useState('daily'); // daily | weekly | monthly | yearly | specific
  const [specificDate, setSpecificDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [breakdownPage, setBreakdownPage] = useState(1);

  /* ══════ date helpers ══════ */
  const now = useMemo(() => new Date(), [lastRefresh]);

  const isToday = (d) => {
    const dt = new Date(d);
    return dt.toDateString() === now.toDateString();
  };

  const isThisWeek = (d) => {
    const dt = new Date(d);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return dt >= startOfWeek && dt <= now;
  };

  const isSelectedMonth = (d) => {
    const dt = new Date(d);
    return dt.getMonth() === selectedMonth && dt.getFullYear() === selectedYear;
  };

  const isSelectedYear = (d) => {
    const dt = new Date(d);
    return dt.getFullYear() === selectedYear;
  };

  const isOnSpecificDate = (d) => {
    if (!specificDate) return false;
    const dt = new Date(d);
    const target = new Date(specificDate);
    return dt.toDateString() === target.toDateString();
  };

  const matchesPeriod = (dateStr) => {
    if (!dateStr) return false;
    if (period === 'specific') return isOnSpecificDate(dateStr);
    switch (period) {
      case 'daily':   return isToday(dateStr);
      case 'weekly':  return isThisWeek(dateStr);
      case 'monthly': return isSelectedMonth(dateStr);
      case 'yearly':  return isSelectedYear(dateStr);
      default: return true;
    }
  };

  /* ══════ filtered data ══════ */
  const filteredOrders  = useMemo(() => orders.filter((o) => matchesPeriod(o.created_at)), [orders, period, specificDate, selectedMonth, selectedYear, lastRefresh]);
  const filteredPayments = useMemo(() => payments.filter((p) => matchesPeriod(p.created_at)), [payments, period, specificDate, selectedMonth, selectedYear, lastRefresh]);

  const completedOrders = filteredOrders.filter((o) => o.status === 'completed');
  const pendingOrders   = filteredOrders.filter((o) => o.status === 'pending');
  const cancelledOrders = filteredOrders.filter((o) => o.status === 'cancelled');

  const totalRevenue = filteredPayments
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);

  const totalSales = completedOrders
    .reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);

  const totalProductsSold = completedOrders
    .reduce((s, o) => s + (o.items || []).reduce((a, i) => a + (i.quantity || 0), 0), 0);

  const avgOrderValue = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;

  /* ══════ chart data builders ══════ */

  /* Revenue over time (area chart) — for specific date or daily, show hourly */
  const revenueOverTime = useMemo(() => {
    const map = {};
    const useHourly = period === 'daily' || period === 'specific';

    completedOrders.forEach((o) => {
      const dt = new Date(o.created_at);
      let key, sortKey;
      if (useHourly) {
        const hour = dt.getHours();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        key = `${h12} ${ampm}`;
        sortKey = hour;
      } else if (period === 'weekly') {
        key = dt.toLocaleDateString('en', { weekday: 'short' });
        sortKey = dt.getDay();
      } else if (period === 'monthly') {
        key = `Day ${dt.getDate()}`;
        sortKey = dt.getDate();
      } else {
        key = dt.toLocaleDateString('en', { month: 'short' });
        sortKey = dt.getMonth();
      }
      if (!map[key]) map[key] = { name: key, revenue: 0, orders: 0, _sort: sortKey };
      map[key].revenue += parseFloat(o.total_amount || 0);
      map[key].orders += 1;
    });

    return Object.values(map).sort((a, b) => a._sort - b._sort);
  }, [completedOrders, period]);

  /* Order status distribution (pie chart) */
  const statusDistribution = useMemo(() => {
    const data = [];
    if (completedOrders.length > 0) data.push({ name: 'Completed', value: completedOrders.length, color: '#34d399' });
    if (pendingOrders.length > 0)   data.push({ name: 'Pending', value: pendingOrders.length, color: '#fbbf24' });
    if (cancelledOrders.length > 0) data.push({ name: 'Cancelled', value: cancelledOrders.length, color: '#f87171' });
    return data;
  }, [completedOrders, pendingOrders, cancelledOrders]);

  /* Payment methods breakdown (pie) */
  const paymentMethodBreakdown = useMemo(() => {
    const map = {};
    filteredPayments.filter((p) => p.status === 'paid').forEach((p) => {
      const name = p.method?.name || p.payment_method?.name || 'Unknown';
      if (!map[name]) map[name] = { name, value: 0 };
      map[name].value += parseFloat(p.amount_paid || 0);
    });
    return Object.values(map);
  }, [filteredPayments]);

  /* Top selling products (bar chart) */
  const topProducts = useMemo(() => {
    const map = {};
    completedOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const name = item.product?.name || `Product #${item.product_id}`;
        if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
        map[name].qty += item.quantity;
        map[name].revenue += parseFloat(item.subtotal || item.unit_price * item.quantity || 0);
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [completedOrders]);

  /* Hourly / daily breakdown table */
  const dailyBreakdown = useMemo(() => {
    const map = {};
    const useHourly = period === 'daily' || period === 'specific';
    filteredOrders.forEach((o) => {
      const dt = new Date(o.created_at);
      let key;
      if (useHourly) {
        key = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        key = dt.toLocaleDateString();
      }
      if (!map[key]) map[key] = { time: key, orders: 0, revenue: 0, items: 0 };
      map[key].orders += 1;
      if (o.status === 'completed') {
        map[key].revenue += parseFloat(o.total_amount || 0);
        map[key].items += (o.items || []).reduce((a, i) => a + (i.quantity || 0), 0);
      }
    });
    return Object.values(map);
  }, [filteredOrders, period]);

  /* ══════ Tax Report Data ══════ */
  const TAX_RATE = 0.12; // 12% VAT

  const taxData = useMemo(() => {
    const grossSales = completedOrders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
    const totalDiscount = completedOrders.reduce((s, o) => s + parseFloat(o.discount_amount || 0), 0);
    const netSales = grossSales;
    const vatableSales = netSales / (1 + TAX_RATE);
    const vatAmount = netSales - vatableSales;
    const vatExemptSales = completedOrders
      .filter((o) => o.discount_type === 'senior' || o.discount_type === 'pwd')
      .reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
    return { grossSales, totalDiscount, netSales, vatableSales, vatAmount, vatExemptSales };
  }, [completedOrders]);

  /* Tax breakdown over time for chart */
  const taxOverTime = useMemo(() => {
    const map = {};
    const useHourly = period === 'daily' || period === 'specific';
    completedOrders.forEach((o) => {
      const dt = new Date(o.created_at);
      let key, sortKey;
      if (useHourly) {
        const hour = dt.getHours();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        key = `${h12} ${ampm}`;
        sortKey = hour;
      } else if (period === 'weekly') {
        key = dt.toLocaleDateString('en', { weekday: 'short' });
        sortKey = dt.getDay();
      } else if (period === 'monthly') {
        key = `Day ${dt.getDate()}`;
        sortKey = dt.getDate();
      } else {
        key = dt.toLocaleDateString('en', { month: 'short' });
        sortKey = dt.getMonth();
      }
      const amt = parseFloat(o.total_amount || 0);
      const vatable = amt / (1 + TAX_RATE);
      const vat = amt - vatable;
      if (!map[key]) map[key] = { name: key, sales: 0, tax: 0, _sort: sortKey };
      map[key].sales += vatable;
      map[key].tax += vat;
    });
    return Object.values(map).sort((a, b) => a._sort - b._sort);
  }, [completedOrders, period]);

  /* ══════ Revenue Trends Data ══════ */
  const revenueTrends = useMemo(() => {
    // Always show monthly data for the selected year (or this year)
    const targetYear = selectedYear;
    const allCompleted = orders.filter((o) => o.status === 'completed');
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
      month: i,
      revenue: 0,
      orders: 0,
      avgOrder: 0,
    }));
    allCompleted.forEach((o) => {
      const dt = new Date(o.created_at);
      if (dt.getFullYear() === targetYear) {
        const m = dt.getMonth();
        months[m].revenue += parseFloat(o.total_amount || 0);
        months[m].orders += 1;
      }
    });
    months.forEach((m) => { m.avgOrder = m.orders > 0 ? m.revenue / m.orders : 0; });
    return months;
  }, [orders, selectedYear]);

  /* Revenue growth rate (month-over-month) */
  const revenueGrowth = useMemo(() => {
    return revenueTrends.map((m, i) => {
      const prev = i > 0 ? revenueTrends[i - 1].revenue : 0;
      const growth = prev > 0 ? ((m.revenue - prev) / prev) * 100 : 0;
      return { ...m, growth: Math.round(growth * 10) / 10 };
    });
  }, [revenueTrends]);

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const availableYears = useMemo(() => {
    const years = new Set();
    orders.forEach((o) => { if (o.created_at) years.add(new Date(o.created_at).getFullYear()); });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  const BREAKDOWN_PER_PAGE = 10;
  const totalBreakdownPages = Math.max(1, Math.ceil(dailyBreakdown.length / BREAKDOWN_PER_PAGE));
  const paginatedBreakdown = dailyBreakdown.slice((breakdownPage - 1) * BREAKDOWN_PER_PAGE, breakdownPage * BREAKDOWN_PER_PAGE);

  useEffect(() => { setBreakdownPage(1); }, [period, selectedMonth, selectedYear, specificDate]);

  const periodLabels = {
    daily: "Today's",
    weekly: "This Week's",
    monthly: `${monthNames[selectedMonth]} ${selectedYear}`,
    yearly: `Year ${selectedYear}`,
  };

  const activePeriodLabel = period === 'specific'
    ? (specificDate
        ? new Date(specificDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'Select a Date')
    : periodLabels[period];

  const breakdownLabel = (period === 'daily' || period === 'specific') ? 'Hourly' : 'Daily';

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ fontFamily: "'Inria Sans', sans-serif" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: t.textPrimary }}>Reports</h1>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>
            Sales analytics, performance metrics, and business insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px]" style={{ color: t.textFaint }}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={handleManualRefresh}
            className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
            style={{ color: gold, border: `1px solid rgba(${goldRgb},0.2)` }}
            title="Refresh data"
          >
            <FiRefreshCw size={14} />
          </button>
        </div>
      </motion.div>

      {/* Period selector + Specific date picker */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex items-center gap-2 mb-6 flex-wrap">
        <FiCalendar size={16} style={{ color: t.textFaint }} />
        {['daily', 'weekly'].map((p) => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setSpecificDate(''); }}
            className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            style={{
              background: period === p ? gold : t.tableBg,
              color: period === p ? '#000' : t.textSecondary,
              border: period === p ? 'none' : `1px solid ${t.modalBorder}`,
            }}
          >
            {p}
          </button>
        ))}

        {/* Monthly with dropdown */}
        <button
          onClick={() => { setPeriod('monthly'); setSpecificDate(''); }}
          className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
          style={{
            background: period === 'monthly' ? gold : t.tableBg,
            color: period === 'monthly' ? '#000' : t.textSecondary,
            border: period === 'monthly' ? 'none' : `1px solid ${t.modalBorder}`,
          }}
        >
          monthly
        </button>
        {period === 'monthly' && (
          <div className="flex items-center gap-1">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-2 py-1.5 rounded-lg text-xs cursor-pointer" style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}>
              {monthNames.map((m, i) => <option key={i} value={i} style={{ background: isDark ? '#1a1a1a' : '#fff', color: isDark ? '#f5f0e8' : '#000' }}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-2 py-1.5 rounded-lg text-xs cursor-pointer" style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}>
              {availableYears.map((y) => <option key={y} value={y} style={{ background: isDark ? '#1a1a1a' : '#fff', color: isDark ? '#f5f0e8' : '#000' }}>{y}</option>)}
            </select>
          </div>
        )}

        {/* Yearly with dropdown */}
        <button
          onClick={() => { setPeriod('yearly'); setSpecificDate(''); }}
          className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
          style={{
            background: period === 'yearly' ? gold : t.tableBg,
            color: period === 'yearly' ? '#000' : t.textSecondary,
            border: period === 'yearly' ? 'none' : `1px solid ${t.modalBorder}`,
          }}
        >
          yearly
        </button>
        {period === 'yearly' && (
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-2 py-1.5 rounded-lg text-xs cursor-pointer" style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}>
            {availableYears.map((y) => <option key={y} value={y} style={{ background: isDark ? '#1a1a1a' : '#fff', color: isDark ? '#f5f0e8' : '#000' }}>{y}</option>)}
          </select>
        )}

        {/* Separator */}
        <div className="w-px h-6 mx-2" style={{ background: t.inputBorder }} />

        {/* Specific date picker */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: t.textMuted }}>
            Specific Date
          </span>
          <input
            type="date"
            value={specificDate}
            onChange={(e) => { setSpecificDate(e.target.value); if (e.target.value) setPeriod('specific'); }}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={inputStyle}
          />
          {period === 'specific' && (
            <button
              onClick={() => { setSpecificDate(''); setPeriod('daily'); }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition hover:bg-red-500/20"
              style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
            >
              Clear
            </button>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div className="text-center py-20" style={{ color: t.textFaint }}>Loading report data…</div>
      ) : (
        <>
          {/* ─── Stat cards ─── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <StatCard icon={<FiFileText size={20} />} label="Total Orders" value={filteredOrders.length} color="#60a5fa" />
            <StatCard icon={<FiDollarSign size={20} />} label="Revenue" value={fmt(totalRevenue)} color={gold} />
            <StatCard icon={<FiTrendingUp size={20} />} label="Sales" value={fmt(totalSales)} color="#4ade80" />
            <StatCard icon={<FiShoppingBag size={20} />} label="Items Sold" value={totalProductsSold} color="#a78bfa" />
            <StatCard icon={<FiBarChart2 size={20} />} label="Avg Order" value={fmt(avgOrderValue)} color="#f472b6" />
            <StatCard icon={<FiPercent size={20} />} label="VAT Collected" value={fmt(taxData.vatAmount)} color="#f59e0b" sub="12% VAT" />
          </motion.div>

          {/* ─── Charts Row 1: Revenue + Order Status ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Revenue / Orders over Time — Area chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 rounded-xl p-5" style={{ background: panelBg, border: panelBorder }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: t.textPrimary }}>
                {activePeriodLabel} Revenue & Orders
              </h3>
              {revenueOverTime.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-sm" style={{ color: t.textFaint }}>
                  No data for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={revenueOverTime}>
                    <defs>
                      <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={gold} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={gold} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.divider} />
                    <XAxis dataKey="name" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={customTooltipStyle} formatter={(v, n) => [n === 'revenue' ? fmt(v) : v, n === 'revenue' ? 'Revenue' : 'Orders']} />
                    <Area type="monotone" dataKey="revenue" stroke={gold} fill="url(#goldGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="orders" stroke="#60a5fa" fill="url(#blueGrad)" strokeWidth={2} />
                    <Legend wrapperStyle={{ color: t.textSecondary, fontSize: 11 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Order Status Distribution — Pie chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-5" style={{ background: panelBg, border: panelBorder }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: t.textPrimary }}>Order Status</h3>
              {statusDistribution.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-sm" style={{ color: t.textFaint }}>
                  No orders.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Legend wrapperStyle={{ color: t.textSecondary, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* ─── Charts Row 2: Top Products + Payment Methods ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Top Products — Bar chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 rounded-xl p-5" style={{ background: panelBg, border: panelBorder }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: t.textPrimary }}>Top Selling Products</h3>
              {topProducts.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-sm" style={{ color: t.textFaint }}>
                  No products sold.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={t.divider} horizontal={false} />
                    <XAxis type="number" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: t.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={customTooltipStyle} formatter={(v, n) => [n === 'revenue' ? fmt(v) : v, n === 'revenue' ? 'Revenue' : 'Qty Sold']} />
                    <Bar dataKey="qty" fill={gold} radius={[0, 4, 4, 0]} barSize={18} name="Qty Sold" />
                    <Bar dataKey="revenue" fill="#60a5fa" radius={[0, 4, 4, 0]} barSize={18} name="Revenue" />
                    <Legend wrapperStyle={{ color: t.textSecondary, fontSize: 11 }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Payment Methods — Pie */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-5" style={{ background: panelBg, border: panelBorder }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: t.textPrimary }}>Payment Methods</h3>
              {paymentMethodBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-sm" style={{ color: t.textFaint }}>
                  No payments.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={paymentMethodBreakdown}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {paymentMethodBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={customTooltipStyle} formatter={(v) => fmt(v)} />
                    <Legend wrapperStyle={{ color: t.textSecondary, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* ─── Tax Report Section ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Tax Summary Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-5" style={{ background: panelBg, border: panelBorder }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: t.textPrimary }}>Tax Summary (12% VAT)</h3>
              <div className="space-y-3">
                {[
                  { label: 'Gross Sales', value: fmt(taxData.grossSales), color: t.textPrimary },
                  { label: 'Total Discounts', value: `-${fmt(taxData.totalDiscount)}`, color: '#f87171' },
                  { label: 'Net Sales', value: fmt(taxData.netSales), color: t.textPrimary },
                  { label: 'VATable Sales', value: fmt(taxData.vatableSales), color: '#60a5fa' },
                  { label: 'VAT Amount (12%)', value: fmt(taxData.vatAmount), color: '#f59e0b' },
                  { label: 'VAT-Exempt Sales', value: fmt(taxData.vatExemptSales), color: '#34d399' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-2 px-3 rounded-lg"
                    style={{ background: t.tableBg }}>
                    <span className="text-xs" style={{ color: t.textSecondary }}>{row.label}</span>
                    <span className="text-sm font-bold" style={{ color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Tax Over Time Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 rounded-xl p-5" style={{ background: panelBg, border: panelBorder }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: t.textPrimary }}>Tax Collection Over Time</h3>
              {taxOverTime.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-sm" style={{ color: t.textFaint }}>
                  No data for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={taxOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.divider} />
                    <XAxis dataKey="name" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={customTooltipStyle} formatter={(v, n) => [fmt(v), n === 'sales' ? 'Net Sales' : 'VAT']} />
                    <Bar dataKey="sales" fill="#60a5fa" radius={[4, 4, 0, 0]} barSize={20} name="Net Sales" />
                    <Bar dataKey="tax" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} name="VAT" />
                    <Legend wrapperStyle={{ color: t.textSecondary, fontSize: 11 }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* ─── Revenue Trends Section ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Revenue Trend Line Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 rounded-xl p-5" style={{ background: panelBg, border: panelBorder }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: t.textPrimary }}>
                  Revenue Trends ({selectedYear})
                </h3>
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-2 py-1 rounded-lg text-xs cursor-pointer" style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}>
                  {availableYears.map((y) => <option key={y} value={y} style={{ background: isDark ? '#1a1a1a' : '#fff', color: isDark ? '#f5f0e8' : '#000' }}>{y}</option>)}
                </select>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revenueGrowth}>
                  <defs>
                    <linearGradient id="trendGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={gold} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={gold} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.divider} />
                  <XAxis dataKey="name" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={customTooltipStyle}
                    formatter={(v, n) => n === 'growth' ? [`${v}%`, 'Growth'] : [n === 'revenue' ? fmt(v) : v, n === 'revenue' ? 'Revenue' : 'Orders']} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke={gold} strokeWidth={2.5} dot={{ r: 4, fill: gold }}
                    activeDot={{ r: 6, fill: gold }} name="Revenue" />
                  <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa' }} name="Orders" />
                  <Line yAxisId="right" type="monotone" dataKey="growth" stroke="#34d399" strokeWidth={2}
                    strokeDasharray="5 5" dot={{ r: 3, fill: '#34d399' }} name="Growth %" />
                  <Legend wrapperStyle={{ color: t.textSecondary, fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Monthly Revenue Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden" style={{ background: panelBg, border: panelBorder }}>
              <div className="px-5 py-4" style={{ borderBottom: panelBorder }}>
                <h3 className="text-sm font-semibold" style={{ color: t.textPrimary }}>Monthly Summary ({selectedYear})</h3>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
                <table className="w-full text-xs">
                  <thead className="sticky top-0" style={{ background: isDark ? '#0d0d0d' : '#f4f5f7' }}>
                    <tr style={{ borderBottom: panelBorder }}>
                      {['Month', 'Revenue', 'Orders', 'Growth'].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-[10px] uppercase tracking-wider font-semibold"
                          style={{ color: t.textFaint }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {revenueGrowth.map((m, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${t.tableBg}` }}
                        className={`${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.02]'} transition`}>
                        <td className="px-4 py-2 font-medium" style={{ color: t.textPrimary }}>{m.name}</td>
                        <td className="px-4 py-2 font-semibold" style={{ color: gold }}>{fmt(m.revenue)}</td>
                        <td className="px-4 py-2">
                          <span className="font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}>{m.orders}</span>
                        </td>
                        <td className="px-4 py-2">
                          {i > 0 && m.growth !== 0 ? (
                            <span className="font-bold" style={{ color: m.growth > 0 ? '#34d399' : '#f87171' }}>
                              {m.growth > 0 ? '+' : ''}{m.growth}%
                            </span>
                          ) : (
                            <span style={{ color: t.textFaint }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          {/* ─── Period Breakdown Table ─── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden mb-6" style={{ background: panelBg, border: panelBorder }}>
            <div className="px-5 py-4" style={{ borderBottom: panelBorder }}>
              <h3 className="text-sm font-semibold" style={{ color: t.textPrimary }}>
                {breakdownLabel} Breakdown
                <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md"
                  style={{ background: `rgba(${goldRgb},0.12)`, color: gold }}>
                  {dailyBreakdown.length} entries
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto" style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ background: isDark ? '#0d0d0d' : '#f4f5f7' }}>
                  <tr style={{ borderBottom: panelBorder }}>
                    {[(period === 'daily' || period === 'specific') ? 'Time' : 'Date', 'Orders', 'Items Sold', 'Revenue'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] uppercase tracking-wider font-semibold"
                        style={{ color: t.textFaint }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailyBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm" style={{ color: t.textFaint }}>
                        No data for this period.
                      </td>
                    </tr>
                  ) : (
                    paginatedBreakdown.map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${t.tableBg}` }}
                        className={`${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.02]'} transition`}>
                        <td className="px-5 py-3 text-xs font-medium" style={{ color: t.textPrimary }}>{row.time}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                            style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}>
                            {row.orders}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                            style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
                            {row.items}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold" style={{ color: gold }}>
                          {fmt(row.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalBreakdownPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: panelBorder }}>
                <span className="text-xs" style={{ color: t.textMuted }}>
                  Page {breakdownPage} of {totalBreakdownPages}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setBreakdownPage((p) => Math.max(1, p - 1))} disabled={breakdownPage === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                    style={{ background: t.divider, color: t.textPrimary }}>
                    ← Prev
                  </button>
                  <span className="text-xs px-2" style={{ color: t.textSecondary }}>
                    {breakdownPage} / {totalBreakdownPages}
                  </span>
                  <button onClick={() => setBreakdownPage((p) => Math.min(totalBreakdownPages, p + 1))} disabled={breakdownPage === totalBreakdownPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                    style={{ background: t.divider, color: t.textPrimary }}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
