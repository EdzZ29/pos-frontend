import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import OrdersPage from './pages/Orders/OrdersPage';
import UsersPage from './pages/Users/UsersPage';
import ReportsPage from './pages/Reports/ReportsPage';
import ProductsCategoriesPage from './pages/Products/ProductsCategoriesPage';
import LogsPage from './pages/Logs/LogsPage';
import AttendancePage from './pages/Attendance/AttendancePage';
import SettingsPage from './pages/Settings/SettingsPage';
import PublicQueuePage from './pages/Queue/PublicQueuePage';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/queue" element={<PublicQueuePage />} />

      {/* Protected routes with sidebar layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />

        {/* Placeholder routes for sidebar links (to be built out later) */}
        <Route path="/users" element={<UsersPage />} />
        <Route path="/products-categories" element={<ProductsCategoriesPage />} />
        <Route path="/categories" element={<ProductsCategoriesPage />} />
        <Route path="/products" element={<ProductsCategoriesPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/payments" element={<Placeholder title="Payments" />} />
        <Route path="/roles" element={<Placeholder title="Roles" />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/pos" element={<Placeholder title="New Order (POS)" />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Temporary placeholder for pages not yet built */
function Placeholder({ title }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold" style={{ color: '#f5f0e8', fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h1>
      <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
        This page is coming soon.
      </p>
    </div>
  );
}

export default App;
