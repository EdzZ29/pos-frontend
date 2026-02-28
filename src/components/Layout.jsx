import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen" style={{ background: '#0d0d0d', fontFamily: "'Inria Sans', sans-serif" }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inria+Sans:wght@300;400;700&family=Playfair+Display:wght@600;700&display=swap');
      `}</style>

      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <div className="ml-64 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
