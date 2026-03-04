import { Component } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSettings } from '../context/SettingsContext';

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[PageErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Something went wrong loading this page.
          </h2>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '1.5rem' }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        <PageErrorBoundary>
          <Outlet />
        </PageErrorBoundary>
      </div>
    </div>
  );
}
