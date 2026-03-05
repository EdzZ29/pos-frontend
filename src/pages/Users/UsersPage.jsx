import React, { useState } from 'react';
import { userService } from '../../api';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiSearch, FiEdit2, FiSlash, FiCheckCircle,
  FiX, FiUserPlus, FiShield, FiMail, FiUser, FiLock,
  FiEye, FiEyeOff,
} from 'react-icons/fi';

/* ─── Status badge ─── */
function StatusBadge({ active }) {
  return active ? (
    <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wide"
      style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
      Active
    </span>
  ) : (
    <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wide"
      style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
      Blocked
    </span>
  );
}

/* ─── Role badge ─── */
function RoleBadge({ role }) {
  const { gold, goldRgb, t } = useSettings();
  const colorMap = {
    owner:   { bg: `rgba(${goldRgb},0.12)`, color: gold },
    manager: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
    cashier: { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  };
  const c = colorMap[role?.slug] || { bg: t.divider, color: t.textSecondary };
  return (
    <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wide"
      style={{ background: c.bg, color: c.color }}>
      {role?.name || role?.slug || '—'}
    </span>
  );
}

/* ─── Stat card ─── */
const StatCard = ({ icon, label, value, color }) => {
  const { t, panelBg, panelBorder } = useSettings();
  return (
    <div className="rounded-xl p-3 sm:p-5 flex items-center gap-3 sm:gap-4"
      style={{ background: panelBg, border: panelBorder }}>
      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-[11px] uppercase tracking-wider truncate" style={{ color: t.textMuted }}>{label}</p>
        <p className="text-base sm:text-xl font-bold mt-0.5" style={{ color: t.textPrimary }}>{value}</p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   USERS PAGE
   ═══════════════════════════════════════ */
export default function UsersPage() {
  const { gold, goldDark, goldRgb, isDark, t, panelBg, panelBorder, inputStyle } = useSettings();
  const { users, roles, loading, refreshUsers } = useData();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  /* Edit Modal state */
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = { name: '', username: '', email: '', password: '', role_id: '' };
  const [form, setForm] = useState(emptyForm);

  /* Register Modal state */
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const emptyRegForm = { name: '', username: '', email: '', password: '', password_confirmation: '', role_id: '' };
  const [regForm, setRegForm] = useState(emptyRegForm);
  const [regError, setRegError] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  /* Fetch data */
  // Data is provided by DataContext – no local fetch needed.
  // After mutations we call refreshUsers().

  /* Derived stats */
  const activeCount = users.filter((u) => u.is_active).length;
  const blockedCount = users.filter((u) => !u.is_active).length;

  /* Filtering */
  const q = search.toLowerCase();
  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role?.slug !== roleFilter) return false;
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role?.name || '').toLowerCase().includes(q)
    );
  });

  /* Open modal for editing */
  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      password: '',
      role_id: user.role_id || '',
    });
    setShowModal(true);
  };

  /* Close modal */
  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  /* Save edit */
  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        username: form.username,
        email: form.email,
        role_id: parseInt(form.role_id),
      };
      if (form.password) payload.password = form.password;
      await userService.update(editingUser.id, payload);
      await refreshUsers();
      closeModal();
    } catch (err) {
      console.error('Failed to update user', err);
      alert(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  /* Register new cashier */
  const openRegister = () => {
    // Pre-select cashier role
    const cashierRole = roles.find((r) => r.slug === 'cashier');
    setRegForm({ ...emptyRegForm, role_id: cashierRole ? String(cashierRole.id) : '' });
    setRegError('');
    setShowRegisterModal(true);
  };

  const closeRegister = () => {
    setShowRegisterModal(false);
    setRegForm(emptyRegForm);
    setRegError('');
  };

  const handleRegister = async () => {
    if (!regForm.name || !regForm.email || !regForm.password || !regForm.role_id) {
      setRegError('Please fill in all required fields.');
      return;
    }
    if (regForm.password.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }
    if (regForm.password !== regForm.password_confirmation) {
      setRegError('Passwords do not match.');
      return;
    }
    setRegistering(true);
    setRegError('');
    try {
      const payload = {
        name: regForm.name,
        username: regForm.username || undefined,
        email: regForm.email,
        password: regForm.password,
        role_id: parseInt(regForm.role_id),
      };
      await userService.create(payload);
      await refreshUsers();
      closeRegister();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors
        ? Object.values(err.response?.data?.errors || {}).flat().join(' ')
        : 'Registration failed.';
      setRegError(msg);
    } finally {
      setRegistering(false);
    }
  };

  /* Toggle block/unblock */
  const toggleBlock = async (user) => {
    try {
      await userService.update(user.id, { is_active: !user.is_active });
      await refreshUsers();
    } catch (err) {
      console.error('Failed to toggle user status', err);
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ fontFamily: "'Inria Sans', sans-serif" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>Users</h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMuted }}>
          Manage all system users, edit information, and control access.
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <StatCard icon={<FiUsers size={18} />} label="Total Users" value={users.length} color="#60a5fa" />
        <StatCard icon={<FiCheckCircle size={18} />} label="Active" value={activeCount} color="#34d399" />
        <StatCard icon={<FiSlash size={18} />} label="Blocked" value={blockedCount} color="#f87171" />
        <StatCard icon={<FiShield size={18} />} label="Roles" value={roles.length} color={gold} />
      </motion.div>

      {/* Toolbar: search + role filter + register button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 sm:mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-sm">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.textFaint }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg text-xs"
            style={{ ...inputStyle }}
          />
        </div>

        {/* Role filter pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          <FiShield size={14} className="flex-shrink-0" style={{ color: t.textFaint }} />
          {['all', ...roles.map((r) => r.slug)].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-all flex-shrink-0"
              style={{
                background: roleFilter === r ? gold : t.tableBg,
                color: roleFilter === r ? '#000' : t.textSecondary,
                border: roleFilter === r ? 'none' : `1px solid ${t.modalBorder}`,
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Register button */}
        <div className="sm:ml-auto">
          <button
            onClick={openRegister}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 whitespace-nowrap"
            style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}
          >
            <FiUserPlus size={16} /> <span className="hidden sm:inline">Register New Cashier</span><span className="sm:hidden">Add User</span>
          </button>
        </div>
      </motion.div>

      {/* Users table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden"
        style={{ background: panelBg, border: panelBorder }}>

        <div className="overflow-x-auto table-responsive" style={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
          <table className="w-full text-sm min-w-[640px]">
            <thead className="sticky top-0 z-10" style={{ background: t.bodyBg }}>
              <tr style={{ borderBottom: panelBorder }}>
                {['#', 'Name', 'Username', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap"
                    style={{ color: t.textFaint }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm" style={{ color: t.textFaint }}>
                    Loading users…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm" style={{ color: t.textFaint }}>
                    {search || roleFilter !== 'all' ? 'No users match your filters.' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((user, idx) => (
                  <tr
                    key={user.id}
                    className={`${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.02]'} transition`}
                    style={{ borderBottom: `1px solid ${t.divider}` }}
                  >
                    <td className="px-4 py-3 text-xs" style={{ color: t.textFaint }}>
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: `rgba(${goldRgb},0.15)`, color: gold }}>
                          {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="text-xs font-medium" style={{ color: t.textPrimary }}>{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: t.textSecondary }}>
                      @{user.username || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: t.textSecondary }}>
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={user.is_active} />
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: t.textMuted }}>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(user)}
                          className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                          title="Edit user"
                          style={{ color: '#60a5fa' }}
                        >
                          <FiEdit2 size={14} />
                        </button>

                        {/* Block / Unblock */}
                        <button
                          onClick={() => toggleBlock(user)}
                          className="p-2 rounded-lg transition-all"
                          title={user.is_active ? 'Block user' : 'Unblock user'}
                          style={{
                            color: user.is_active ? '#f87171' : '#34d399',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = user.is_active ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          {user.is_active ? <FiSlash size={14} /> : <FiCheckCircle size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ──────────── EDIT USER MODAL ──────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: t.modalBg, border: `1px solid ${t.inputBorder}`, fontFamily: "'Inria Sans', sans-serif" }}
            >
              {/* Modal header */}
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${t.divider}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>
                    <FiEdit2 size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Edit User</h2>
                    <p className="text-[11px]" style={{ color: t.textMuted }}>
                      Update information for {editingUser?.name}
                    </p>
                  </div>
                </div>
                <button onClick={closeModal} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition`}
                  style={{ color: t.textSecondary }}>
                  <FiX size={18} />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: t.textSecondary }}>
                    <FiUser size={12} /> Full Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                    placeholder="John Doe"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: t.textSecondary }}>
                    <FiUser size={12} /> Username
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                    placeholder="johndoe"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: t.textSecondary }}>
                    <FiMail size={12} /> Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                    placeholder="john@example.com"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: t.textSecondary }}>
                    <FiShield size={12} /> Role
                  </label>
                  <select
                    value={form.role_id}
                    onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                  >
                    <option value="" disabled>Select role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id} style={{ background: isDark ? '#1a1a1a' : '#fff' }}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password (optional) */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: t.textSecondary }}>
                    <FiLock size={12} /> New Password
                    <span className="text-[9px] font-normal normal-case tracking-normal" style={{ color: t.textFaint }}>
                      (leave blank to keep current)
                    </span>
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="p-5 flex gap-3" style={{ borderTop: `1px solid ${t.divider}` }}>
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: t.modalBorder, color: t.textPrimary, border: `1px solid ${t.inputBorder}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.email || !form.role_id}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{ background: gold, color: '#000' }}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── REGISTER CASHIER MODAL ──────────── */}
      <AnimatePresence>
        {showRegisterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={closeRegister}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: t.modalBg, border: `1px solid ${t.inputBorder}`, fontFamily: "'Inria Sans', sans-serif" }}
            >
              {/* Modal header */}
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${t.divider}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: `rgba(${goldRgb},0.15)`, color: gold }}>
                    <FiUserPlus size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Register New User</h2>
                    <p className="text-[11px]" style={{ color: t.textMuted }}>
                      Create a new cashier or staff account
                    </p>
                  </div>
                </div>
                <button onClick={closeRegister} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition`}
                  style={{ color: t.textSecondary }}>
                  <FiX size={18} />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Error */}
                {regError && (
                  <div className="p-3 rounded-xl text-sm"
                    style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}>
                    {regError}
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: t.textSecondary }}>
                    <FiUser size={12} /> Full Name <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                    placeholder="Juan Dela Cruz"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: t.textSecondary }}>
                    <FiUser size={12} /> Username
                  </label>
                  <input
                    type="text"
                    value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                    placeholder="juandelacruz"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: t.textSecondary }}>
                    <FiMail size={12} /> Email <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                    placeholder="juan@example.com"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: t.textSecondary }}>
                    <FiShield size={12} /> Role <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    value={regForm.role_id}
                    onChange={(e) => setRegForm({ ...regForm, role_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                  >
                    <option value="" disabled>Select role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id} style={{ background: isDark ? '#1a1a1a' : '#fff' }}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: t.textSecondary }}>
                    <FiLock size={12} /> Password <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm"
                      style={inputStyle}
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                      style={{ color: t.textMuted }}
                      tabIndex={-1}
                    >
                      {showRegPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: t.textSecondary }}>
                    <FiLock size={12} /> Confirm Password <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegConfirm ? 'text' : 'password'}
                      value={regForm.password_confirmation}
                      onChange={(e) => setRegForm({ ...regForm, password_confirmation: e.target.value })}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm"
                      style={inputStyle}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirm(!showRegConfirm)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                      style={{ color: t.textMuted }}
                      tabIndex={-1}
                    >
                      {showRegConfirm ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    </button>
                  </div>
                  {regForm.password && regForm.password_confirmation && regForm.password !== regForm.password_confirmation && (
                    <p className="text-[11px] mt-1" style={{ color: '#f87171' }}>Passwords do not match</p>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="p-5 flex gap-3" style={{ borderTop: `1px solid ${t.divider}` }}>
                <button
                  onClick={closeRegister}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: t.modalBorder, color: t.textPrimary, border: `1px solid ${t.inputBorder}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegister}
                  disabled={registering || !regForm.name || !regForm.email || !regForm.password || !regForm.role_id}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}
                >
                  <FiUserPlus size={14} />
                  {registering ? 'Registering…' : 'Register User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
