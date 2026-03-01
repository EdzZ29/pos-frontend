import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSettings } from '../context/SettingsContext';

export default function Layout() {
  const { fontFamily, sidebarWidth, t } = useSettings();

  return (
    <div className="min-h-screen" style={{ background: t.bodyBg, fontFamily, color: t.textPrimary, transition: 'background 0.3s, color 0.3s' }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inria+Sans:wght@300;400;700&family=Playfair+Display:wght@600;700&family=Inter:wght@300;400;500;600;700&display=swap');
      `}</style>

      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <div style={{ marginLeft: `${sidebarWidth}px` }} className="min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
