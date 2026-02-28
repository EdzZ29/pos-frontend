import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps routes that require authentication.
 * Optionally restricts to specific roles: <ProtectedRoute roles={['owner','manager']}>
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0) {
    const userRole = user?.role?.slug;
    if (!roles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
