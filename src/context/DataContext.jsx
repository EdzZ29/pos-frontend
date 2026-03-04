/**
 * DataContext – global in-memory data cache.
 *
 * Fetches all shared data ONCE after login and stores it here.
 * Every page reads from this context → page switches are instant (no loading).
 * A background refresh runs every 60 s to keep data fresh silently.
 * After any mutation (CRUD) a page calls the matching refreshX() function.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  productService,
  categoryService,
  orderService,
  userService,
  paymentService,
  roleService,
  timeLogService,
} from '../api';

const DataContext = createContext(null);

const BG_INTERVAL = 60_000; // background refresh every 60 s

export function DataProvider({ children }) {
  const { isAuthenticated, user } = useAuth();

  // ── shared data ──────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);

  // loading = true only during the FIRST fetch; background refreshes are silent
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // ── per-entity fetchers ──────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    const data = await productService.getAll();
    setProducts(data);
  }, []);

  const fetchCategories = useCallback(async () => {
    const data = await categoryService.getAll();
    setCategories(data);
  }, []);

  const fetchOrders = useCallback(async () => {
    const data = await orderService.getAll();
    setOrders(data);
  }, []);

  const fetchPayments = useCallback(async () => {
    const data = await paymentService.getAll();
    setPayments(data);
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    const data = await paymentService.getMethods();
    setPaymentMethods(data);
  }, []);

  const fetchTimeLogs = useCallback(async () => {
    const data = await timeLogService.getAll();
    setTimeLogs(data);
  }, []);

  // Only owners/managers need user & role lists
  const fetchUsers = useCallback(async () => {
    const slug = user?.role?.slug;
    if (!slug || !['owner', 'manager'].includes(slug)) return;
    const data = await userService.getAll();
    setUsers(data);
  }, [user]);

  const fetchRoles = useCallback(async () => {
    if (user?.role?.slug !== 'owner') return;
    const data = await roleService.getAll();
    setRoles(data);
  }, [user]);

  // ── full initial load ─────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchOrders(),
        fetchPayments(),
        fetchPaymentMethods(),
        fetchTimeLogs(),
        fetchUsers(),
        fetchRoles(),
      ]);
    } catch (err) {
      console.error('[DataContext] loadAll error:', err);
    } finally {
      if (!initialized.current) {
        initialized.current = true;
        setLoading(false);
      }
    }
  }, [
    isAuthenticated,
    fetchProducts,
    fetchCategories,
    fetchOrders,
    fetchPayments,
    fetchPaymentMethods,
    fetchTimeLogs,
    fetchUsers,
    fetchRoles,
  ]);

  // ── trigger on login / logout ─────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      initialized.current = false;
      setLoading(true);
      loadAll();
    } else {
      // Clear everything on logout
      setProducts([]);
      setCategories([]);
      setOrders([]);
      setUsers([]);
      setRoles([]);
      setPayments([]);
      setPaymentMethods([]);
      setTimeLogs([]);
      setLoading(true);
      initialized.current = false;
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── silent background refresh ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => {
      Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchOrders(),
        fetchPayments(),
        fetchTimeLogs(),
        fetchUsers(),
      ]).catch(() => {});
    }, BG_INTERVAL);
    return () => clearInterval(id);
  }, [isAuthenticated, fetchProducts, fetchCategories, fetchOrders, fetchPayments, fetchTimeLogs, fetchUsers]);

  // ── context value ─────────────────────────────────────────────────────────
  const value = {
    // data
    products,
    categories,
    orders,
    users,
    roles,
    payments,
    paymentMethods,
    timeLogs,
    // loading – true only during very first fetch after login
    loading,
    // per-entity refresh (call after mutations)
    refreshProducts: fetchProducts,
    refreshCategories: fetchCategories,
    refreshOrders: fetchOrders,
    refreshPayments: fetchPayments,
    refreshPaymentMethods: fetchPaymentMethods,
    refreshTimeLogs: fetchTimeLogs,
    refreshUsers: fetchUsers,
    refreshRoles: fetchRoles,
    // refresh everything
    refresh: loadAll,
    // allow pages to push a freshly created order into state without waiting
    // for the next full refresh
    prependOrder: (order) => setOrders((prev) => [order, ...prev]),
    setOrderStatus: (id, status) =>
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o))
      ),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
