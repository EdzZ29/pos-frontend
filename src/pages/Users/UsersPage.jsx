import React, { useState, useEffect } from 'react';
import { userService, roleService } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiSearch, FiEdit2, FiSlash, FiCheckCircle,
  FiX, FiUserPlus, FiShield, FiMail, FiUser, FiLock,
  FiEye, FiEyeOff,
} from 'react-icons/fi';

const gold = '#d4af37';
const panelBg = 'rgba(255,255,255,0.03)';
const panelBorder = '1px solid rgba(255,255,255,0.06)';
const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#f5f0e8',
  outline: 'none',
};

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
  const colorMap = {
    owner:   { bg: 'rgba(212,175,55,0.12)', color: gold },
    manager: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
    cashier: { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  };
  const c = colorMap[role?.slug] || { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' };
  return (
    <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wide"
      style={{ background: c.bg, color: c.color }}>
      {role?.name || role?.slug || '—'}
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

/* ═══════════════════════════════════════
   USERS PAGE
   ═══════════════════════════════════════ */
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);

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
  const fetchData = async () => {
    try {
      const [u, r] = await Promise.all([userService.getAll(), roleService.getAll()]);
      setUsers(u);
      setRoles(r);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
      await fetchData();
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
      await fetchData();
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
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle user status', err);
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ fontFamily: "'Inria Sans', sans-serif" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#f5f0e8' }}>Users</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Manage all system users, edit information, and control access.
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<FiUsers size={20} />} label="Total Users" value={users.length} color="#60a5fa" />
        <StatCard icon={<FiCheckCircle size={20} />} label="Active" value={activeCount} color="#34d399" />
        <StatCard icon={<FiSlash size={20} />} label="Blocked" value={blockedCount} color="#f87171" />
        <StatCard icon={<FiShield size={20} />} label="Roles" value={roles.length} color={gold} />
      </motion.div>

      {/* Toolbar: search + role filter + register button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, email..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg text-xs"
            style={{ ...inputStyle }}
          />
        </div>

        {/* Role filter pills */}
        <div className="flex items-center gap-2">
          <FiShield size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
          {['all', ...roles.map((r) => r.slug)].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all"
              style={{
                background: roleFilter === r ? gold : 'rgba(255,255,255,0.04)',
                color: roleFilter === r ? '#000' : 'rgba(255,255,255,0.5)',
                border: roleFilter === r ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Register button (right-aligned) */}
        <div className="ml-auto">
          <button
            onClick={openRegister}
            className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:opacity-90 whitespace-nowrap"
            style={{ background: `linear-gradient(135deg, ${gold}, #b38f2c)`, color: '#000' }}
          >
            <FiUserPlus size={16} /> Register New Cashier
          </button>
        </div>
      </motion.div>

      {/* Users table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden"
        style={{ background: panelBg, border: panelBorder }}>

        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10" style={{ background: '#0d0d0d' }}>
              <tr style={{ borderBottom: panelBorder }}>
                {['#', 'Name', 'Username', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
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
                  <td colSpan={8} className="px-5 py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Loading users…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {search || roleFilter !== 'all' ? 'No users match your filters.' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((user, idx) => (
                  <tr
                    key={user.id}
                    className="hover:bg-white/[0.02] transition"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: 'rgba(212,175,55,0.15)', color: gold }}>
                          {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="text-xs font-medium" style={{ color: '#f5f0e8' }}>{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      @{user.username || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={user.is_active} />
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(user)}
                          className="p-2 rounded-lg transition-all hover:bg-white/10"
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
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Inria Sans', sans-serif" }}
            >
              {/* Modal header */}
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>
                    <FiEdit2 size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: '#f5f0e8' }}>Edit User</h2>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Update information for {editingUser?.name}
                    </p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-white/10 transition"
                  style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <FiX size={18} />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                      <option key={r.id} value={r.id} style={{ background: '#1a1a1a' }}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password (optional) */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <FiLock size={12} /> New Password
                    <span className="text-[9px] font-normal normal-case tracking-normal" style={{ color: 'rgba(255,255,255,0.3)' }}>
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
              <div className="p-5 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#f5f0e8', border: '1px solid rgba(255,255,255,0.1)' }}
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
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={closeRegister}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Inria Sans', sans-serif" }}
            >
              {/* Modal header */}
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(212,175,55,0.15)', color: gold }}>
                    <FiUserPlus size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: '#f5f0e8' }}>Register New User</h2>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Create a new cashier or staff account
                    </p>
                  </div>
                </div>
                <button onClick={closeRegister} className="p-2 rounded-lg hover:bg-white/10 transition"
                  style={{ color: 'rgba(255,255,255,0.6)' }}>
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
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                      <option key={r.id} value={r.id} style={{ background: '#1a1a1a' }}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition hover:bg-white/10"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                      tabIndex={-1}
                    >
                      {showRegPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition hover:bg-white/10"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
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
              <div className="p-5 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={closeRegister}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#f5f0e8', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegister}
                  disabled={registering || !regForm.name || !regForm.email || !regForm.password || !regForm.role_id}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${gold}, #b38f2c)`, color: '#000' }}
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
