import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMail, FiLock, FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi';
import { motion } from 'framer-motion';
import logo from '../../assets/logo.jpg'; // Adjust path as needed

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.login || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      await login(formData.login, formData.password);
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.login?.[0] ||
        'Invalid credentials. Please try again.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{ backgroundColor: '#0d0d0d', fontFamily: "'Lato', sans-serif" }}>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Lato:wght@300;400;600;700&display=swap');
        
        .chalk-divider {
            background: repeating-linear-gradient(
                90deg,
                rgba(255,255,255,0.5) 0px,
                rgba(255,255,255,0.5) 4px,
                transparent 4px,
                transparent 10px
            );
            height: 1px;
        }

        .chalkboard-bg {
            background-color: #0f0f0f;
            background-image: 
                url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }

        .grain-overlay::after {
            content: '';
            position: fixed;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
            pointer-events: none;
            z-index: 0;
            opacity: 0.4;
        }

        .input-field {
            background: rgba(255,255,255,0.04) !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
            color: #f0f0f0 !important;
            transition: all 0.3s ease;
        }
        .input-field::placeholder { color: rgba(255,255,255,0.3) !important; }
        .input-field:focus {
            background: rgba(255,255,255,0.07) !important;
            border-color: rgba(212,175,55,0.6) !important;
            box-shadow: 0 0 0 3px rgba(212,175,55,0.12) !important;
            outline: none !important;
        }
        .input-field:focus + .input-icon { color: #d4af37 !important; }

        .gold-btn {
            background: linear-gradient(135deg, #d4af37, #a8862a);
            color: #000;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(212,175,55,0.3);
        }
        .gold-btn:hover {
            background: linear-gradient(135deg, #e0c04a, #d4af37);
            box-shadow: 0 6px 28px rgba(212,175,55,0.45);
            transform: translateY(-1px);
        }
        .gold-btn:active { transform: translateY(0); }

        .card-glow {
            box-shadow: 
                0 0 0 1px rgba(255,255,255,0.06),
                0 30px 80px rgba(0,0,0,0.8),
                0 0 60px rgba(212,175,55,0.05);
        }
      `}</style>

      {/* Chalkboard Background */}
      <div className="chalkboard-bg grain-overlay fixed inset-0" />

      {/* Decorative blurred orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 500, height: 500,
            top: '-10%', left: '-10%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 600, height: 600,
            bottom: '-15%', right: '-10%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, delay: 2 }}
        />

        {/* Floating food icons — very subtle */}
        {['🍕', '🍔', '🥗', '🍣', '🌮', '🍜'].map((icon, i) => (
          <motion.div
            key={i}
            className="absolute text-5xl"
            style={{
              top: `${10 + i * 15}%`,
              left: i % 2 === 0 ? `${3 + i * 2}%` : undefined,
              right: i % 2 !== 0 ? `${3 + i * 2}%` : undefined,
              opacity: 0.04,
              filter: 'grayscale(100%)',
            }}
            animate={{ y: [0, -18, 0], rotate: [0, i % 2 === 0 ? 8 : -8, 0] }}
            transition={{ duration: 7 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
          >
            {icon}
          </motion.div>
        ))}
      </div>

      {/* Main Card */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="card-glow rounded-2xl overflow-hidden"
             style={{ background: 'rgba(18,18,18,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* === TOP HEADER === */}
          <div className="relative flex flex-col items-center pt-10 pb-8 px-8"
               style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

            {/* Subtle top line accent */}
            <div className="absolute top-0 left-0 right-0 h-0.5"
                 style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />

            {/* Logo */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 120 }}
              className="relative mb-5"
            >
              {/* Gold ring glow around logo */}
              <div className="absolute inset-0 rounded-full"
                   style={{
                     background: 'conic-gradient(from 0deg, #d4af37, #6b5110, #d4af37)',
                     padding: 3,
                     borderRadius: '50%',
                   }}
              />
              <div className="absolute inset-0 rounded-full"
                   style={{ boxShadow: '0 0 30px rgba(212,175,55,0.35)', borderRadius: '50%' }} />
              <img
                src={logo}
                alt="Kaon Time"
                className="relative rounded-full object-cover"
                style={{
                  width: 110, height: 110,
                  border: '3px solid #d4af37',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}
              />
            </motion.div>

            {/* Brand Name */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '2rem',
                fontWeight: 700,
                color: '#f5f0e8',
                letterSpacing: '0.02em',
                lineHeight: 1.1,
              }}>
                Kaon Time
              </h1>
              <div className="flex items-center gap-3 mt-2 justify-center">
                <div className="chalk-divider w-12" />
                <span style={{ color: '#d4af37', fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
                  Point of Sale
                </span>
                <div className="chalk-divider w-12" />
              </div>
            </motion.div>
          </div>

          {/* === FORM SECTION === */}
          <div className="px-8 py-8">

            <motion.p
              className="mb-6 text-sm"
              style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.03em' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Welcome back — sign in to continue
            </motion.p>

            {/* Error */}
            {error && (
              <motion.div
                className="mb-5 p-3 rounded-xl text-sm"
                style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email/Username */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-widest"
                       style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Email or Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="login"
                    value={formData.login}
                    onChange={handleChange}
                    required
                    placeholder="you@example.com"
                    autoComplete="username"
                    autoFocus
                    className="input-field w-full px-4 py-3 pl-11 rounded-xl text-sm"
                  />
                  <FiMail className="input-icon absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: 'rgba(255,255,255,0.3)' }} size={15} />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-widest"
                       style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="input-field w-full px-4 py-3 pl-11 pr-11 rounded-xl text-sm"
                  />
                  <FiLock className="input-icon absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: 'rgba(255,255,255,0.3)' }} size={15} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </motion.div>

              {/* Remember Me */}
              <motion.div className="flex items-center"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded"
                    style={{ accentColor: '#d4af37' }}
                  />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Remember me</span>
                </label>
              </motion.div>

              {/* Submit */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="gold-btn w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <motion.div
                      className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : (
                    <>
                      Sign In
                      <FiLogIn size={15} />
                    </>
                  )}
                </button>
              </motion.div>

            </form>
          </div>

          {/* Bottom accent line */}
          <div className="h-0.5 w-full"
               style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)' }} />
        </div>

        {/* Footer */}
        <motion.p
          className="text-center text-xs mt-5"
          style={{ color: 'rgba(255,255,255,0.2)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          By signing in, you agree to our{' '}
          <a href="#" style={{ color: 'rgba(212,175,55,0.6)' }}>Terms</a>
          {' & '}
          <a href="#" style={{ color: 'rgba(212,175,55,0.6)' }}>Privacy Policy</a>
        </motion.p>
      </motion.div>
    </div>
  );
}