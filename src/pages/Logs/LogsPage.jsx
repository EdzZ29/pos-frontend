import { useState, useEffect, useMemo } from 'react';
import { timeLogService } from '../../api';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiClock, FiLogIn, FiLogOut, FiUsers, FiCalendar,
  FiRefreshCw, FiX, FiPlus, FiSearch,
  FiCheckCircle, FiActivity, FiUserX,
} from 'react-icons/fi';
const fmt = (n) => `${(n || 0).toFixed(2)}`;

const StatCard = ({ icon, label, value, color, sub, panelBg, panelBorder, t }) => (
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

export default function LogsPage() {
  const { gold, goldDark, goldRgb, isDark, t, panelBg, panelBorder, inputStyle } = useSettings();
  const { timeLogs, users, loading, refreshTimeLogs } = useData();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Track refresh timestamp when timeLogs change
  useEffect(() => { setLastRefresh(new Date()); }, [timeLogs]);

  /* filters */
  const [filterUser, setFilterUser] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');

  /* pagination */
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  /* modals */
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [clockInUserId, setClockInUserId] = useState('');
  const [clockInNotes, setClockInNotes] = useState('');
  const [savingClockIn, setSavingClockIn] = useState(false);

  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [clockOutLog, setClockOutLog] = useState(null);
  const [clockOutNotes, setClockOutNotes] = useState('');
  const [savingClockOut, setSavingClockOut] = useState(false);

  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [absentUserId, setAbsentUserId] = useState('');
  const [absentNotes, setAbsentNotes] = useState('');
  const [savingAbsent, setSavingAbsent] = useState(false);

  // Data is provided by DataContext – no local fetch needed.
  // After mutations we call refreshTimeLogs().

  /* filtered logs */
  const filteredLogs = useMemo(() => {
    let logs = [...timeLogs];
    if (filterUser !== 'all') logs = logs.filter((l) => String(l.user_id) === filterUser);
    if (filterStatus !== 'all') logs = logs.filter((l) => l.status === filterStatus);
    if (filterDate) logs = logs.filter((l) => new Date(l.clock_in).toISOString().slice(0, 10) === filterDate);
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter((l) =>
        (l.user?.name || '').toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q)
      );
    }
    return logs;
  }, [timeLogs, filterUser, filterStatus, filterDate, search]);

  const paginatedLogs = filteredLogs.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PER_PAGE));

  useEffect(() => { setPage(1); }, [filterUser, filterStatus, filterDate, search]);

  /* stats */
  const activeShifts = timeLogs.filter((l) => l.status === 'active').length;
  const absentToday = timeLogs.filter((l) => l.status === 'absent' && new Date(l.clock_in).toDateString() === new Date().toDateString()).length;
  const todayLogs = timeLogs.filter((l) => new Date(l.clock_in).toDateString() === new Date().toDateString());
  const todayHours = todayLogs.reduce((s, l) => s + parseFloat(l.total_hours || 0), 0);
  const totalHoursAll = timeLogs.reduce((s, l) => s + parseFloat(l.total_hours || 0), 0);

  /* clock in handler */
  const handleClockIn = async () => {
    if (!clockInUserId) return;
    setSavingClockIn(true);
    try {
      await timeLogService.clockIn({ user_id: parseInt(clockInUserId), notes: clockInNotes || null });
      setShowClockInModal(false);
      setClockInUserId('');
      setClockInNotes('');
      refreshTimeLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clock in');
    } finally {
      setSavingClockIn(false);
    }
  };

  /* clock out handler */
  const handleClockOut = async () => {
    if (!clockOutLog) return;
    setSavingClockOut(true);
    try {
      await timeLogService.clockOut(clockOutLog.id, { notes: clockOutNotes || null });
      setShowClockOutModal(false);
      setClockOutLog(null);
      setClockOutNotes('');
      refreshTimeLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clock out');
    } finally {
      setSavingClockOut(false);
    }
  };

  /* mark absent handler */
  const handleMarkAbsent = async () => {
    if (!absentUserId) return;
    setSavingAbsent(true);
    try {
      await timeLogService.markAbsent({ user_id: parseInt(absentUserId), notes: absentNotes || null });
      setShowAbsentModal(false);
      setAbsentUserId('');
      setAbsentNotes('');
      refreshTimeLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark absent');
    } finally {
      setSavingAbsent(false);
    }
  };

  const openClockOut = (log) => {
    setClockOutLog(log);
    setClockOutNotes(log.notes || '');
    setShowClockOutModal(true);
  };

  const formatDateTime = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (hours) => {
    if (!hours) return '—';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ fontFamily: "'Inria Sans', sans-serif" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: t.textPrimary }}>Shift & Time Logs</h1>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>
            Manage user shifts, clock-in/out tracking, and attendance records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px]" style={{ color: t.textFaint }}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button onClick={refreshTimeLogs}
            className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
            style={{ color: gold, border: `1px solid rgba(${goldRgb},0.2)` }} title="Refresh">
            <FiRefreshCw size={14} />
          </button>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowAbsentModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
          <FiUserX size={16} /> Mark Absent / No Duty
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: t.textFaint }}>Loading time logs…</div>
      ) : (
        <>
          {/* Stat Cards */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<FiActivity size={20} />} label="Active Shifts" value={activeShifts} color="#4ade80" sub="Currently clocked in" panelBg={panelBg} panelBorder={panelBorder} t={t} />
            <StatCard icon={<FiClock size={20} />} label="Today's Logs" value={todayLogs.length} color="#60a5fa" sub={`${fmt(todayHours)} hours total`} panelBg={panelBg} panelBorder={panelBorder} t={t} />
            <StatCard icon={<FiUserX size={20} />} label="Absent Today" value={absentToday} color="#f87171" sub="No duty / absent" panelBg={panelBg} panelBorder={panelBorder} t={t} />
            <StatCard icon={<FiCalendar size={20} />} label="Total Hours (All)" value={fmt(totalHoursAll)} color="#a78bfa" sub={`${timeLogs.length} total entries`} panelBg={panelBg} panelBorder={panelBorder} t={t} />
          </motion.div>

          {/* Filters */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-wrap items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.textFaint }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or notes..."
                className="pl-9 pr-4 py-2 rounded-lg text-xs w-56"
                style={inputStyle}
              />
            </div>

            {/* User filter */}
            <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs cursor-pointer" style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}>
              <option value="all" style={{ background: isDark ? '#1a1a1a' : '#fff' }}>All Users</option>
              {users.map((u) => (
                <option key={u.id} value={String(u.id)} style={{ background: isDark ? '#1a1a1a' : '#fff' }}>{u.name}</option>
              ))}
            </select>

            {/* Status filter */}
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs cursor-pointer" style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}>
              <option value="all" style={{ background: isDark ? '#1a1a1a' : '#fff' }}>All Status</option>
              <option value="active" style={{ background: isDark ? '#1a1a1a' : '#fff' }}>Active</option>
              <option value="completed" style={{ background: isDark ? '#1a1a1a' : '#fff' }}>Completed</option>
              <option value="absent" style={{ background: isDark ? '#1a1a1a' : '#fff' }}>Absent / No Duty</option>
            </select>

            {/* Date filter */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs"
              style={inputStyle}
            />
            {filterDate && (
              <button onClick={() => setFilterDate('')}
                className="px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition hover:bg-red-500/20"
                style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                Clear Date
              </button>
            )}
          </motion.div>

          {/* Time Logs Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden mb-6" style={{ background: panelBg, border: panelBorder }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
              <h2 className="text-sm font-semibold" style={{ color: t.textPrimary }}>
                Time Logs
                <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md"
                  style={{ background: `rgba(${goldRgb},0.12)`, color: gold }}>
                  {filteredLogs.length} entries
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: panelBorder }}>
                    {['User', 'Role', 'Clock In', 'Clock Out', 'Duration', 'Status', 'Notes', 'Actions'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] uppercase tracking-wider font-semibold"
                        style={{ color: t.textFaint }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: t.textFaint }}>
                        No time logs found.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => (
                      <tr key={log.id} className={`${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.02]'} transition`}
                        style={{ borderBottom: `1px solid ${t.tableBg}` }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                              style={{ background: `rgba(${goldRgb},0.15)`, color: gold }}>
                              {log.user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="font-medium text-xs" style={{ color: t.textPrimary }}>{log.user?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: t.divider, color: t.textSecondary }}>
                            {log.user?.role?.name || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: t.textPrimary }}>{formatDateTime(log.clock_in)}</td>
                        <td className="px-5 py-3 text-xs" style={{ color: log.clock_out ? t.textPrimary : t.textFaint }}>
                          {log.status === 'absent' ? '—' : formatDateTime(log.clock_out)}
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold" style={{ color: gold }}>
                          {log.status === 'absent' ? '—' : formatDuration(log.total_hours)}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wide"
                            style={{
                              background: log.status === 'active' ? 'rgba(74,222,128,0.12)'
                                : log.status === 'absent' ? 'rgba(248,113,113,0.12)'
                                : 'rgba(96,165,250,0.12)',
                              color: log.status === 'active' ? '#4ade80'
                                : log.status === 'absent' ? '#f87171'
                                : '#60a5fa',
                            }}>
                            {log.status === 'absent' ? 'Absent / No Duty' : log.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs max-w-[150px] truncate" style={{ color: t.textMuted }}>
                          {log.notes || '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            {log.status === 'active' && (
                              <button
                                onClick={() => openClockOut(log)}
                                className="p-1.5 rounded-lg transition hover:bg-orange-500/20"
                                style={{ color: '#fb923c' }} title="Clock Out">
                                <FiLogOut size={14} />
                              </button>
                            )}
                            {log.status !== 'active' && log.status !== 'absent' && (
                              <span className="text-[10px]" style={{ color: t.textFaint }}>—</span>
                            )}
                            {log.status === 'absent' && (
                              <span className="text-[10px]" style={{ color: t.textFaint }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: panelBorder }}>
              <span className="text-xs" style={{ color: t.textMuted }}>
                Page {page} of {totalPages} ({filteredLogs.length} entries)
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                  style={{ background: t.divider, color: t.textPrimary }}>
                  ← Prev
                </button>
                <span className="text-xs px-2" style={{ color: t.textSecondary }}>
                  {page} / {totalPages}
                </span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                  style={{ background: t.divider, color: t.textPrimary }}>
                  Next →
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* ═══════════════ CLOCK IN MODAL ═══════════════ */}
      <AnimatePresence>
        {showClockInModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={() => setShowClockInModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: t.modalBg, border: `1px solid ${t.inputBorder}` }}>

              <div className="p-5 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(74,222,128,0.15)' }}>
                    <FiLogIn size={20} style={{ color: '#4ade80' }} />
                  </div>
                  <h2 className="text-lg font-bold" style={{ color: t.textPrimary }}>Clock In User</h2>
                </div>
                <button onClick={() => setShowClockInModal(false)}
                  className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} style={{ color: t.textSecondary }}>
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Select User *</label>
                  <select value={clockInUserId} onChange={(e) => setClockInUserId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle}>
                    <option value="" style={{ background: isDark ? '#1a1a1a' : '#fff' }}>Choose a user...</option>
                    {users
                      .filter((u) => !timeLogs.some((l) => l.user_id === u.id && l.status === 'active'))
                      .map((u) => (
                        <option key={u.id} value={u.id} style={{ background: isDark ? '#1a1a1a' : '#fff' }}>
                          {u.name} ({u.role?.name || 'No role'})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Notes (Optional)</label>
                  <textarea rows={2} value={clockInNotes} onChange={(e) => setClockInNotes(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm resize-none" style={inputStyle}
                    placeholder="e.g. Morning shift" />
                </div>
              </div>

              <div className="p-5 flex gap-3" style={{ borderTop: panelBorder }}>
                <button onClick={() => setShowClockInModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: t.modalBorder, color: t.textPrimary, border: `1px solid ${t.inputBorder}` }}>
                  Cancel
                </button>
                <button onClick={handleClockIn} disabled={!clockInUserId || savingClockIn}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: '#000' }}>
                  <FiLogIn size={14} /> {savingClockIn ? 'Clocking In…' : 'Clock In'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ CLOCK OUT MODAL ═══════════════ */}
      <AnimatePresence>
        {showClockOutModal && clockOutLog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={() => setShowClockOutModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: t.modalBg, border: `1px solid ${t.inputBorder}` }}>

              <div className="p-5 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(251,146,60,0.15)' }}>
                    <FiLogOut size={20} style={{ color: '#fb923c' }} />
                  </div>
                  <h2 className="text-lg font-bold" style={{ color: t.textPrimary }}>Clock Out</h2>
                </div>
                <button onClick={() => setShowClockOutModal(false)}
                  className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} style={{ color: t.textSecondary }}>
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-4 rounded-xl" style={{ background: t.cardBg, border: panelBorder }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: `rgba(${goldRgb},0.15)`, color: gold }}>
                      {clockOutLog.user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>{clockOutLog.user?.name}</p>
                      <p className="text-[10px] uppercase" style={{ color: t.textMuted }}>{clockOutLog.user?.role?.name}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: t.textSecondary }}>Clocked In</span>
                    <span style={{ color: t.textPrimary }}>{formatDateTime(clockOutLog.clock_in)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Notes (Optional)</label>
                  <textarea rows={2} value={clockOutNotes} onChange={(e) => setClockOutNotes(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm resize-none" style={inputStyle}
                    placeholder="e.g. Shift ended normally" />
                </div>
              </div>

              <div className="p-5 flex gap-3" style={{ borderTop: panelBorder }}>
                <button onClick={() => setShowClockOutModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: t.modalBorder, color: t.textPrimary, border: `1px solid ${t.inputBorder}` }}>
                  Cancel
                </button>
                <button onClick={handleClockOut} disabled={savingClockOut}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #fb923c, #ea580c)', color: '#000' }}>
                  <FiLogOut size={14} /> {savingClockOut ? 'Clocking Out…' : 'Clock Out'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ MARK ABSENT MODAL ═══════════════ */}
      <AnimatePresence>
        {showAbsentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={() => setShowAbsentModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: t.modalBg, border: `1px solid ${t.inputBorder}` }}>

              <div className="p-5 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(248,113,113,0.15)' }}>
                    <FiUserX size={20} style={{ color: '#f87171' }} />
                  </div>
                  <h2 className="text-lg font-bold" style={{ color: t.textPrimary }}>Mark Absent / No Duty</h2>
                </div>
                <button onClick={() => setShowAbsentModal(false)}
                  className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} style={{ color: t.textSecondary }}>
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Select User *</label>
                  <select value={absentUserId} onChange={(e) => setAbsentUserId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle}>
                    <option value="" style={{ background: isDark ? '#1a1a1a' : '#fff' }}>Choose a user...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id} style={{ background: isDark ? '#1a1a1a' : '#fff' }}>
                        {u.name} ({u.role?.name || 'No role'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Reason / Notes (Optional)</label>
                  <textarea rows={2} value={absentNotes} onChange={(e) => setAbsentNotes(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm resize-none" style={inputStyle}
                    placeholder="e.g. Sick leave, Day off, Personal leave" />
                </div>
              </div>

              <div className="p-5 flex gap-3" style={{ borderTop: panelBorder }}>
                <button onClick={() => setShowAbsentModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: t.modalBorder, color: t.textPrimary, border: `1px solid ${t.inputBorder}` }}>
                  Cancel
                </button>
                <button onClick={handleMarkAbsent} disabled={!absentUserId || savingAbsent}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #f87171, #dc2626)', color: '#fff' }}>
                  <FiUserX size={14} /> {savingAbsent ? 'Saving…' : 'Mark Absent'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
