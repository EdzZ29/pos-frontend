import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid, FiUsers, FiShoppingBag, FiLayers, FiFileText,
  FiCreditCard, FiLogOut, FiShield, FiShoppingCart, FiBarChart2,
  FiClock, FiCamera, FiSettings,
} from 'react-icons/fi';
import defaultLogo from '../assets/logo.jpg';

const ownerLinks = [
  { to: '/', icon: FiGrid, label: 'Dashboard' },
  { to: '/products-categories', icon: FiShoppingBag, label: 'Products & Categories' },
  { to: '/users', icon: FiUsers, label: 'Users' },
  { to: '/orders', icon: FiFileText, label: 'Orders' },
  { to: '/reports', icon: FiBarChart2, label: 'Reports' },
  { to: '/logs', icon: FiClock, label: 'Logs' },
  { to: '/attendance', icon: FiCamera, label: 'Attendance' },
  { to: '/settings', icon: FiSettings, label: 'Settings' },
];

const managerLinks = [
  { to: '/', icon: FiGrid, label: 'Dashboard' },
  { to: '/categories', icon: FiLayers, label: 'Categories' },
  { to: '/products', icon: FiShoppingBag, label: 'Products' },
  { to: '/orders', icon: FiFileText, label: 'Orders' },
  { to: '/payments', icon: FiCreditCard, label: 'Payments' },
];

const cashierLinks = [
  { to: '/', icon: FiGrid, label: 'Dashboard' },
  { to: '/orders', icon: FiFileText, label: 'Orders' },
];

function getLinks(role) {
  switch (role) {
    case 'owner': return ownerLinks;
    case 'manager': return managerLinks;
    default: return cashierLinks;
  }
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { gold, goldDark, goldRgb, systemName, logoUrl, sidebarBg, sidebarWidth, headingFont, t, isDark } = useSettings();
  const navigate = useNavigate();
  const role = user?.role?.slug;
  const links = getLinks(role);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logoSrc = logoUrl || defaultLogo;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
    <aside className="fixed top-0 left-0 h-screen flex flex-col z-30"
      style={{
        width: `${sidebarWidth}px`,
        background: sidebarBg,
        borderRight: `1px solid ${t.sidebarBorder}`,
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: `1px solid ${t.sidebarBorder}` }}>
        <img src={logoSrc} alt={systemName} className="w-10 h-10 rounded-full object-cover"
          style={{ border: `2px solid ${gold}` }} />
        <div>
          <h1 className="text-sm font-bold" style={{ color: '#f5f0e8', fontFamily: headingFont }}>
            {systemName}
          </h1>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: gold }}>
            {role || 'POS'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'text-black'
                  : isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }
                : { color: 'rgba(255,255,255,0.55)' }
            }
          >
            <link.icon size={16} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="px-4 py-4" style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: `rgba(${goldRgb},0.15)`, color: gold }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#f5f0e8' }}>{user?.name}</p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:bg-red-500/20"
          style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
        >
          <FiLogOut size={13} />
          Log Out
        </button>
      </div>
    </aside>

    {/* Logout Confirmation Modal */}
    <AnimatePresence>
      {showLogoutModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: t.modalOverlay, backdropFilter: 'blur(4px)' }}
          onClick={() => setShowLogoutModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="rounded-2xl p-6 w-full max-w-sm mx-4 text-center"
            style={{
              background: t.modalBg,
              border: `1px solid ${t.modalBorder}`,
              boxShadow: t.shadow,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(248,113,113,0.12)' }}>
              <FiLogOut size={24} style={{ color: '#f87171' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: t.textPrimary }}>
              Log Out
            </h3>
            <p className="text-sm mb-6" style={{ color: t.textSecondary }}>
              Are you sure you want to logout?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-white/10"
                style={{
                  color: t.textSecondary,
                  border: `1px solid ${t.divider}`,
                }}
              >
                No
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                }}
              >
                Yes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
