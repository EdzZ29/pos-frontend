import API from './axios';

const authService = {
  /**
   * Login with email/username and password.
   * Backend accepts { login, password }
   */
  login: async (login, password) => {
    const { data } = await API.post('/login', { login, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  /**
   * Register a new user.
   */
  register: async (payload) => {
    // payload: { role_id, name, username, email, password, password_confirmation }
    const { data } = await API.post('/register', payload);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  /**
   * Logout (revoke current token).
   */
  logout: async () => {
    await API.post('/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Get the currently stored user (from localStorage).
   */
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Check if the user is authenticated.
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
};

export default authService;
