import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

/* ── Defaults ── */
const DEFAULTS = {
  systemName: 'Kaon Time',
  tagline: 'Point of Sale',
  accentColor: '#d4af37',
  theme: 'dark',                 // 'dark' | 'light'
  sidebarBg: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)',
  fontFamily: "'Inria Sans', sans-serif",
  headingFont: "'Playfair Display', serif",
  logoUrl: '',
  faviconUrl: '',
  borderRadius: '12',
  sidebarWidth: '256',
};

const STORAGE_KEY = 'pos_system_settings';

/* ── Theme palettes ── */
const THEME_PALETTES = {
  dark: {
    bodyBg:       '#0d0d0d',
    cardBg:       'rgba(255,255,255,0.03)',
    cardBorder:   '1px solid rgba(255,255,255,0.06)',
    inputBg:      'rgba(255,255,255,0.05)',
    inputBorder:  '1px solid rgba(255,255,255,0.1)',
    textPrimary:  '#f5f0e8',
    textSecondary:'rgba(255,255,255,0.55)',
    textMuted:    'rgba(255,255,255,0.4)',
    textFaint:    'rgba(255,255,255,0.3)',
    hoverBg:      'rgba(255,255,255,0.05)',
    modalBg:      'linear-gradient(145deg, #1a1a1a, #111)',
    modalBorder:  '1px solid rgba(255,255,255,0.08)',
    modalOverlay: 'rgba(0,0,0,0.6)',
    sidebarBorder:'1px solid rgba(255,255,255,0.06)',
    tableBg:      'rgba(255,255,255,0.02)',
    tableHover:   'rgba(255,255,255,0.04)',
    divider:      'rgba(255,255,255,0.06)',
    shadow:       '0 25px 50px rgba(0,0,0,0.5)',
    navInactive:  'rgba(255,255,255,0.55)',
    navHoverClass:'hover:bg-white/5',
    badgeMuted:   'rgba(255,255,255,0.06)',
  },
  light: {
    bodyBg:       '#f4f5f7',
    cardBg:       '#ffffff',
    cardBorder:   '1px solid rgba(0,0,0,0.08)',
    inputBg:      '#ffffff',
    inputBorder:  '1px solid rgba(0,0,0,0.15)',
    textPrimary:  '#1a1a2e',
    textSecondary:'rgba(0,0,0,0.6)',
    textMuted:    'rgba(0,0,0,0.45)',
    textFaint:    'rgba(0,0,0,0.3)',
    hoverBg:      'rgba(0,0,0,0.04)',
    modalBg:      '#ffffff',
    modalBorder:  '1px solid rgba(0,0,0,0.1)',
    modalOverlay: 'rgba(0,0,0,0.35)',
    sidebarBorder:'1px solid rgba(0,0,0,0.08)',
    tableBg:      'rgba(0,0,0,0.01)',
    tableHover:   'rgba(0,0,0,0.03)',
    divider:      'rgba(0,0,0,0.08)',
    shadow:       '0 25px 50px rgba(0,0,0,0.12)',
    navInactive:  'rgba(0,0,0,0.55)',
    navHoverClass:'hover:bg-black/5',
    badgeMuted:   'rgba(0,0,0,0.06)',
  },
};

/* ── Color helpers ── */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function darkenHex(hex, amount = 0.2) {
  const { r, g, b } = hexToRgb(hex);
  const d = (v) => Math.max(0, Math.round(v * (1 - amount)));
  return `#${[d(r), d(g), d(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/* ── Apply CSS custom properties globally ── */
function applyCssVars(s) {
  const root = document.documentElement;
  const accent = s.accentColor || DEFAULTS.accentColor;
  const { r, g, b } = hexToRgb(accent);
  const theme = s.theme || 'dark';
  const p = THEME_PALETTES[theme];

  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--accent-dark', darkenHex(accent, 0.22));
  root.style.setProperty('--accent-15', `rgba(${r}, ${g}, ${b}, 0.15)`);
  root.style.setProperty('--accent-12', `rgba(${r}, ${g}, ${b}, 0.12)`);
  root.style.setProperty('--accent-08', `rgba(${r}, ${g}, ${b}, 0.08)`);
  root.style.setProperty('--sidebar-bg', s.sidebarBg || DEFAULTS.sidebarBg);
  root.style.setProperty('--font-body', s.fontFamily || DEFAULTS.fontFamily);
  root.style.setProperty('--font-heading', s.headingFont || s.fontFamily || DEFAULTS.headingFont);
  root.style.setProperty('--border-radius', `${s.borderRadius || DEFAULTS.borderRadius}px`);
  root.style.setProperty('--sidebar-width', `${s.sidebarWidth || DEFAULTS.sidebarWidth}px`);

  /* Theme palette CSS vars */
  root.style.setProperty('--body-bg', p.bodyBg);
  root.style.setProperty('--card-bg', p.cardBg);
  root.style.setProperty('--text-primary', p.textPrimary);
  root.style.setProperty('--text-secondary', p.textSecondary);
  root.style.setProperty('--text-muted', p.textMuted);
  root.style.setProperty('--input-bg', p.inputBg);

  /* Set data-theme attribute for optional CSS selectors */
  root.setAttribute('data-theme', theme);
}

/* ── Context ── */
const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch (_) {
      return { ...DEFAULTS };
    }
  });

  /* Apply CSS vars whenever settings change */
  useEffect(() => {
    applyCssVars(settings);
  }, [settings]);

  /* Listen for changes from another tab or the custom event */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings({ ...DEFAULTS, ...parsed });
        } catch (_) {}
      }
    };
    const onCustom = (e) => {
      if (e.detail) setSettings({ ...DEFAULTS, ...e.detail });
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pos-settings-updated', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pos-settings-updated', onCustom);
    };
  }, []);

  const updateSettings = useCallback((newSettings) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('pos-settings-updated', { detail: merged }));
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    updateSettings({ [key]: value });
  }, [updateSettings]);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULTS });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
    window.dispatchEvent(new CustomEvent('pos-settings-updated', { detail: DEFAULTS }));
  }, []);

  /* Derived helpers */
  const gold = settings.accentColor || DEFAULTS.accentColor;
  const goldDark = darkenHex(gold, 0.22);
  const { r, g, b } = hexToRgb(gold);
  const goldRgb = `${r}, ${g}, ${b}`;
  const isDark = (settings.theme || 'dark') === 'dark';
  const t = THEME_PALETTES[settings.theme || 'dark'];

  /* Theme-aware style helpers */
  const panelBg = t.cardBg;
  const panelBorder = t.cardBorder;
  const inputStyle = {
    background: t.inputBg,
    border: t.inputBorder,
    color: t.textPrimary,
    outline: 'none',
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      updateSetting,
      resetSettings,
      DEFAULTS,
      // Convenience aliases
      gold,
      goldDark,
      goldRgb,
      systemName: settings.systemName || DEFAULTS.systemName,
      tagline: settings.tagline || DEFAULTS.tagline,
      logoUrl: settings.logoUrl,
      sidebarBg: settings.sidebarBg || DEFAULTS.sidebarBg,
      fontFamily: settings.fontFamily || DEFAULTS.fontFamily,
      headingFont: settings.headingFont || settings.fontFamily || DEFAULTS.headingFont,
      borderRadius: settings.borderRadius || DEFAULTS.borderRadius,
      sidebarWidth: settings.sidebarWidth || DEFAULTS.sidebarWidth,
      // Theme
      isDark,
      t,
      panelBg,
      panelBorder,
      inputStyle,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

export { DEFAULTS as SETTINGS_DEFAULTS };
