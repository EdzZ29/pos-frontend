import { useAuth } from '../../context/AuthContext';
import OwnerDashboard from './OwnerDashboard';
import CashierDashboard from './CashierDashboard';

/**
 * Renders the correct dashboard based on the logged-in user's role.
 * Owner & Manager share the full overview; Cashier gets a simplified view.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role?.slug;

  if (role === 'owner' || role === 'manager') {
    return <OwnerDashboard />;
  }

  return <CashierDashboard />;
}
