import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL: Global error boundary caught an unhandled exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#071A1D',
          color: '#F2F7F7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '620px',
            width: '100%',
            background: '#0B2529',
            border: '1px solid rgba(240, 93, 108, 0.4)',
            borderRadius: '8px',
            padding: '32px 28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f87171', margin: '0 0 8px 0' }}>
              Packaging Development Tracker
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0' }}>
              An unexpected interface error was safely intercepted to prevent application crash.
            </p>

            <div style={{
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '12px 16px',
              textAlign: 'left',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#fca5a5',
              overflowX: 'auto',
              maxHeight: '140px'
            }}>
              {this.state.error?.toString() || 'Unknown runtime error'}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: 'linear-gradient(135deg, #00f3ff, #00a8b5)',
                  color: '#002028',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                ↻ Reload Application
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '10px 18px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);
