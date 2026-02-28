import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiGrid, FiUsers, FiShoppingBag, FiLayers, FiFileText,
  FiCreditCard, FiLogOut, FiShield, FiShoppingCart, FiBarChart2,
} from 'react-icons/fi';
import logo from '../assets/logo.jpg';

const ownerLinks = [
  { to: '/', icon: FiGrid, label: 'Dashboard' },
  { to: '/users', icon: FiUsers, label: 'Users' },
  { to: '/orders', icon: FiFileText, label: 'Orders' },
  { to: '/reports', icon: FiBarChart2, label: 'Reports' },
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
  const navigate = useNavigate();
  const role = user?.role?.slug;
  const links = getLinks(role);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 flex flex-col z-30"
      style={{
        background: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <img src={logo} alt="Kaon Time" className="w-10 h-10 rounded-full object-cover"
          style={{ border: '2px solid #d4af37' }} />
        <div>
          <h1 className="text-sm font-bold" style={{ color: '#f5f0e8', fontFamily: "'Playfair Display', serif" }}>
            Kaon Time
          </h1>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: '#d4af37' }}>
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
                  : 'hover:bg-white/5'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { background: 'linear-gradient(135deg, #d4af37, #a8862a)', color: '#000' }
                : { color: 'rgba(255,255,255,0.55)' }
            }
          >
            <link.icon size={16} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37' }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#f5f0e8' }}>{user?.name}</p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:bg-red-500/20"
          style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
        >
          <FiLogOut size={13} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
