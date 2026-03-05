import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSettings, FiSave, FiRefreshCw, FiImage, FiType, FiDroplet,
  FiMonitor, FiCheck, FiX, FiUpload, FiTrash2, FiEye,
  FiSun, FiMoon,
} from 'react-icons/fi';
import { useSettings, SETTINGS_DEFAULTS } from '../../context/SettingsContext';

const ACCENT_PRESETS = [
  { name: 'Gold',     color: '#d4af37' },
  { name: 'Rose',     color: '#e8766a' },
  { name: 'Emerald',  color: '#3dc98a' },
  { name: 'Blue',     color: '#3b82f6' },
  { name: 'Violet',   color: '#8b5cf6' },
  { name: 'Amber',    color: '#f59e0b' },
  { name: 'Cyan',     color: '#06b6d4' },
  { name: 'Pink',     color: '#ec4899' },
];

const SIDEBAR_PRESETS = [
  { name: 'Dark',      value: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)' },
  { name: 'Charcoal',  value: 'linear-gradient(180deg, #1e1e2e 0%, #11111b 100%)' },
  { name: 'Navy',      value: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' },
  { name: 'Slate',     value: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' },
];

const FONT_OPTIONS = [
  { label: 'Inria Sans', value: "'Inria Sans', sans-serif" },
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'System Default', value: "system-ui, -apple-system, sans-serif" },
];

const HEADING_FONT_OPTIONS = [
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
  { label: 'Inria Sans', value: "'Inria Sans', sans-serif" },
  { label: 'Same as body', value: '' },
];

export default function SettingsPage() {
  const { settings, updateSetting, resetSettings, gold, isDark, t, panelBg, panelBorder, inputStyle } = useSettings();
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const [previewLogo, setPreviewLogo] = useState(null);
  const logoInputRef = useRef(null);

  /* ── Handlers ── */
  const update = (key, value) => {
    updateSetting(key, value);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    resetSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      update('logoUrl', dataUrl);
      setPreviewLogo(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    update('logoUrl', '');
    setPreviewLogo(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  /* ── Section config ── */
  const sections = [
    { key: 'general', label: 'General', icon: FiType },
    { key: 'appearance', label: 'Appearance', icon: FiDroplet },
    { key: 'images', label: 'Images & Logo', icon: FiImage },
    { key: 'layout', label: 'Layout', icon: FiMonitor },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3" style={{ color: t.textPrimary }}>
            <FiSettings size={20} className="sm:hidden" style={{ color: gold }} />
            <FiSettings size={24} className="hidden sm:block" style={{ color: gold }} /> Settings
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMuted }}>
            Manage system appearance, branding, and configuration.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={handleReset}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-semibold transition"
            style={{ color: t.textSecondary, border: panelBorder }}>
            <FiRefreshCw size={12} /> <span className="hidden sm:inline">Reset Defaults</span><span className="sm:hidden">Reset</span>
          </button>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all"
            style={{ background: `linear-gradient(135deg, ${gold}, ${gold}cc)`, color: '#000' }}>
            <FiSave size={14} /> Save
          </button>
        </div>
      </motion.div>

      {/* Saved toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 sm:top-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center justify-center sm:justify-start gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold"
            style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', backdropFilter: 'blur(12px)' }}>
            <FiCheck size={16} /> Settings saved successfully
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4 sm:gap-6 flex-col lg:flex-row">
        {/* Sidebar Tabs - horizontal on mobile */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="rounded-xl overflow-hidden flex lg:flex-col overflow-x-auto" style={{ background: panelBg, border: panelBorder }}>
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className="flex-1 lg:flex-none lg:w-full flex items-center justify-center lg:justify-start gap-2 lg:gap-3 px-3 lg:px-4 py-2.5 lg:py-3 text-xs sm:text-sm font-medium transition-all whitespace-nowrap"
                style={{
                  background: activeSection === s.key ? `${gold}15` : 'transparent',
                  color: activeSection === s.key ? gold : t.textSecondary,
                  borderLeft: activeSection === s.key ? `3px solid ${gold}` : '3px solid transparent',
                }}
              >
                <s.icon size={15} /> <span className="hidden sm:inline lg:inline">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ═══════ GENERAL ═══════ */}
          {activeSection === 'general' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <Card title="System Identity" icon={FiType} accent={gold} t={t} panelBg={panelBg} panelBorder={panelBorder}>
                <Field label="System Name" desc="Displayed in the sidebar and login page." t={t}>
                  <input
                    value={settings.systemName}
                    onChange={(e) => update('systemName', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                    placeholder="e.g. Kaon Time"
                  />
                </Field>
                <Field label="Tagline" desc="Short description shown under the system name." t={t}>
                  <input
                    value={settings.tagline}
                    onChange={(e) => update('tagline', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                    placeholder="e.g. Point of Sale"
                  />
                </Field>
              </Card>

              {/* Preview */}
              <Card title="Preview" icon={FiEye} accent={gold} t={t} panelBg={panelBg} panelBorder={panelBorder}>
                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: t.tableBg, border: panelBorder }}>
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                    style={{ border: `2px solid ${gold}` }}>
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold"
                        style={{ background: `${gold}20`, color: gold }}>
                        {settings.systemName?.charAt(0) || 'K'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: t.textPrimary, fontFamily: settings.headingFont || settings.fontFamily }}>
                      {settings.systemName || 'System Name'}
                    </h3>
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: gold }}>
                      {settings.tagline || 'Tagline'}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ═══════ APPEARANCE ═══════ */}
          {activeSection === 'appearance' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              {/* Theme Mode */}
              <Card title="Theme Mode" icon={isDark ? FiMoon : FiSun} accent={gold} t={t} panelBg={panelBg} panelBorder={panelBorder}>
                <p className="text-xs mb-4" style={{ color: t.textMuted }}>
                  Choose between light and dark appearance for the entire system.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'dark', label: 'Dark', icon: FiMoon, desc: 'Easy on the eyes', bg: '#0d0d0d', card: '#1a1a1a', text: '#f5f0e8' },
                    { key: 'light', label: 'Light', icon: FiSun, desc: 'Clean and bright', bg: '#f4f5f7', card: '#ffffff', text: '#1a1a2e' },
                  ].map((m) => (
                    <button
                      key={m.key}
                      onClick={() => update('theme', m.key)}
                      className="rounded-xl p-4 text-left transition-all"
                      style={{
                        border: settings.theme === m.key ? `2px solid ${gold}` : panelBorder,
                        background: panelBg,
                      }}
                    >
                      {/* Mini preview */}
                      <div className="rounded-lg p-3 mb-3 flex items-center gap-2"
                        style={{ background: m.bg }}>
                        <div className="w-4 h-8 rounded" style={{ background: gold }} />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2 rounded-full w-3/4" style={{ background: m.card }} />
                          <div className="h-1.5 rounded-full w-1/2" style={{ background: m.text, opacity: 0.3 }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <m.icon size={14} style={{ color: settings.theme === m.key ? gold : t.textMuted }} />
                        <span className="text-sm font-bold" style={{ color: settings.theme === m.key ? gold : t.textPrimary }}>
                          {m.label}
                        </span>
                        {settings.theme === m.key && <FiCheck size={14} style={{ color: gold }} />}
                      </div>
                      <p className="text-[10px]" style={{ color: t.textFaint }}>{m.desc}</p>
                    </button>
                  ))}
                </div>
              </Card>

              <Card title="Accent Color" icon={FiDroplet} accent={gold} t={t} panelBg={panelBg} panelBorder={panelBorder}>
                <p className="text-xs mb-4" style={{ color: t.textMuted }}>
                  Choose the primary accent color used throughout the system.
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-4">
                  {ACCENT_PRESETS.map((p) => (
                    <button
                      key={p.color}
                      onClick={() => update('accentColor', p.color)}
                      className="group flex flex-col items-center gap-1.5"
                    >
                      <div className="w-10 h-10 rounded-full transition-all relative"
                        style={{
                          background: p.color,
                          boxShadow: settings.accentColor === p.color ? `0 0 0 3px ${t.bodyBg}, 0 0 0 5px ${p.color}` : 'none',
                        }}>
                        {settings.accentColor === p.color && (
                          <FiCheck size={16} className="absolute inset-0 m-auto" style={{ color: '#000' }} />
                        )}
                      </div>
                      <span className="text-[9px]" style={{ color: settings.accentColor === p.color ? p.color : t.textFaint }}>
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
                <Field label="Custom Color" desc="Enter a hex color code." t={t}>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => update('accentColor', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                      style={{ background: 'transparent' }}
                    />
                    <input
                      value={settings.accentColor}
                      onChange={(e) => update('accentColor', e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm font-mono"
                      style={inputStyle}
                      placeholder="#d4af37"
                    />
                  </div>
                </Field>
              </Card>

              <Card title="Sidebar Theme" icon={FiMonitor} accent={gold} t={t} panelBg={panelBg} panelBorder={panelBorder}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SIDEBAR_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => update('sidebarBg', p.value)}
                      className="rounded-xl p-3 text-center transition-all"
                      style={{
                        background: p.value,
                        border: settings.sidebarBg === p.value ? `2px solid ${gold}` : '2px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="h-16 rounded-lg mb-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
                      <span className="text-[10px] font-semibold" style={{ color: settings.sidebarBg === p.value ? gold : 'rgba(255,255,255,0.4)' }}>
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card title="Typography" icon={FiType} accent={gold} t={t} panelBg={panelBg} panelBorder={panelBorder}>
                <Field label="Body Font" t={t}>
                  <select
                    value={settings.fontFamily}
                    onChange={(e) => update('fontFamily', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value} style={{ background: isDark ? '#1a1a1a' : '#fff' }}>{f.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Heading Font" t={t}>
                  <select
                    value={settings.headingFont}
                    onChange={(e) => update('headingFont', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-sm"
                    style={inputStyle}
                  >
                    {HEADING_FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value} style={{ background: isDark ? '#1a1a1a' : '#fff' }}>{f.label || 'Same as body'}</option>
                    ))}
                  </select>
                </Field>
                {/* Preview */}
                <div className="mt-4 p-4 rounded-xl" style={{ background: t.tableBg, border: panelBorder }}>
                  <p className="text-xs mb-2" style={{ color: t.textFaint }}>Preview:</p>
                  <h3 className="text-lg font-bold mb-1" style={{ color: t.textPrimary, fontFamily: settings.headingFont || settings.fontFamily }}>
                    Heading Text
                  </h3>
                  <p className="text-sm" style={{ color: t.textSecondary, fontFamily: settings.fontFamily }}>
                    Body text preview — The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ═══════ IMAGES & LOGO ═══════ */}
          {activeSection === 'images' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <Card title="System Logo" icon={FiImage} accent={gold} t={t} panelBg={panelBg} panelBorder={panelBorder}>
                <p className="text-xs mb-4" style={{ color: t.textMuted }}>
                  Upload a custom logo. Used in the sidebar, login page, and QR codes. If no custom logo is set, the default logo will be used.
                </p>

                <div className="flex items-start gap-6">
                  {/* Current Logo */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center"
                      style={{ background: t.tableBg, border: panelBorder }}>
                      {(settings.logoUrl || previewLogo) ? (
                        <img src={settings.logoUrl || previewLogo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <FiImage size={28} style={{ color: t.textFaint }} />
                          <p className="text-[9px] mt-1" style={{ color: t.textFaint }}>Default</p>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px]" style={{ color: t.textFaint }}>
                      {settings.logoUrl ? 'Custom logo' : 'Default logo'}
                    </span>
                  </div>

                  {/* Upload */}
                  <div className="flex-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload"
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer transition hover:bg-white/10 mb-3"
                      style={{ color: gold, border: `1px solid ${gold}40` }}>
                      <FiUpload size={14} /> Upload New Logo
                    </label>
                    {settings.logoUrl && (
                      <button onClick={removeLogo}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition hover:bg-red-500/20"
                        style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                        <FiTrash2 size={12} /> Remove Custom Logo
                      </button>
                    )}
                    <p className="text-[10px] mt-3" style={{ color: t.textFaint }}>
                      Recommended: 512×512 px, PNG or JPG. Max 2MB.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Logo preview in different contexts */}
              <Card title="Logo Preview" icon={FiEye} accent={gold} t={t} panelBg={panelBg} panelBorder={panelBorder}>
                <div className="grid grid-cols-3 gap-4">
                  {[40, 64, 96].map((size) => (
                    <div key={size} className="flex flex-col items-center gap-2 p-4 rounded-xl" style={{ background: t.tableBg, border: panelBorder }}>
                      <div className="rounded-full overflow-hidden flex items-center justify-center"
                        style={{ width: size, height: size, border: `2px solid ${gold}` }}>
                        {settings.logoUrl ? (
                          <img src={settings.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold"
                            style={{ background: `${gold}20`, color: gold, fontSize: size * 0.35 }}>
                            {settings.systemName?.charAt(0) || 'K'}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px]" style={{ color: t.textFaint }}>{size}px</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* ═══════ LAYOUT ═══════ */}
          {activeSection === 'layout' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <Card title="Layout Options" icon={FiMonitor} accent={gold} t={t} panelBg={panelBg} panelBorder={panelBorder}>
                <Field label="Border Radius" desc="Roundness of cards and buttons (px).">
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={settings.borderRadius}
                      onChange={(e) => update('borderRadius', e.target.value)}
                      className="flex-1"
                      style={{ accentColor: gold }}
                    />
                    <span className="text-sm font-mono w-12 text-right" style={{ color: t.textPrimary }}>
                      {settings.borderRadius}px
                    </span>
                  </div>
                  {/* Preview */}
                  <div className="flex gap-3 mt-3">
                    {['Card', 'Button', 'Input'].map((item) => (
                      <div key={item} className="flex-1 p-3 text-center text-xs"
                        style={{
                          background: t.tableBg,
                          border: `1px solid ${t.cardBorder?.replace('1px solid ', '') || t.divider}`,
                          borderRadius: `${settings.borderRadius}px`,
                          color: t.textSecondary,
                        }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </Field>

                <Field label="Sidebar Width" desc="Width of the navigation sidebar (px).">
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="200"
                      max="320"
                      step="8"
                      value={settings.sidebarWidth}
                      onChange={(e) => update('sidebarWidth', e.target.value)}
                      className="flex-1"
                      style={{ accentColor: gold }}
                    />
                    <span className="text-sm font-mono w-14 text-right" style={{ color: t.textPrimary }}>
                      {settings.sidebarWidth}px
                    </span>
                  </div>
                </Field>
              </Card>

              {/* System Info */}
              <Card title="System Information" icon={FiSettings} accent={gold} t={t} panelBg={panelBg} panelBorder={panelBorder}>
                <div className="space-y-3">
                  {[
                    { label: 'Version', value: '1.0.0' },
                    { label: 'Frontend', value: 'React + Vite' },
                    { label: 'Backend', value: 'Laravel 11' },
                    { label: 'Theme Engine', value: 'localStorage' },
                  ].map((info) => (
                    <div key={info.label} className="flex items-center justify-between py-2 px-1"
                      style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}` }}>
                      <span className="text-xs" style={{ color: t.textMuted }}>{info.label}</span>
                      <span className="text-xs font-semibold" style={{ color: t.textPrimary }}>{info.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Reusable Card ── */
function Card({ title, icon: Icon, accent, children, t, panelBg, panelBorder }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: panelBg, border: panelBorder }}>
      <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: panelBorder }}>
        {Icon && <Icon size={16} style={{ color: accent }} />}
        <h3 className="text-sm font-bold" style={{ color: t?.textPrimary || '#f5f0e8' }}>{title}</h3>
      </div>
      <div className="p-5 space-y-5">
        {children}
      </div>
    </div>
  );
}

/* ── Reusable Field ── */
function Field({ label, desc, children, t }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: t?.textSecondary || 'rgba(255,255,255,0.7)' }}>
        {label}
      </label>
      {desc && (
        <p className="text-[10px] mb-2" style={{ color: t?.textFaint || 'rgba(255,255,255,0.3)' }}>{desc}</p>
      )}
      {children}
    </div>
  );
}
