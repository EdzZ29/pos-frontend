import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';

/**
 * Wraps routes that require authentication.
 * Also shows a loading screen while DataContext performs its initial fetch,
 * so every page gets instant data on first render.
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuth();
  const { loading } = useData();
  const { gold, t } = useSettings();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0) {
    const userRole = user?.role?.slug;
    if (!roles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  // Show a brief, elegant loading screen on the very first data load
  if (loading) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-4 z-50"
        style={{ background: t?.bodyBg || '#0a0a0a' }}
      >
        {/* Animated spinner */}
        <div
          className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: `${gold} transparent transparent transparent` }}
        />
        <p className="text-sm font-medium animate-pulse" style={{ color: gold, fontFamily: "'Inria Sans', sans-serif" }}>
          Loading your workspace…
        </p>
      </div>
    );
  }

  return children;
}

