import React from 'react';

export default function Sidebar({ activeTab, onTabChange, currentUser, onLogout, unreadCount, logs, onOpenNotif }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'tracker', label: 'Project Tracker', icon: '📋', badge: null },
    { id: 'gantt', label: 'Gantt Timeline', icon: '📅' },
    { id: 'stages', label: 'Stage SOP Guide', icon: '🔍' },
    { id: 'raci', label: 'RACI Matrix', icon: '👥' },
    { id: 'risks', label: 'Risk Register', icon: '⚠️' },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const roleLabels = { admin: 'Admin', editor: 'Editor', viewer: 'Viewer', superadmin: 'Super Admin' };

  return (
    <aside className="sidebar">
      {/* BRANDING */}
      <div className="sidebar-brand">
        <div className="brand-icon">📦</div>
        <div className="brand-text">
          <div className="brand-title">PKG TRACKER</div>
          <div className="brand-subtitle">ENTERPRISE SAAS v2.0</div>
        </div>
      </div>

      {/* SYSTEM BADGE */}
      <div className="sidebar-status-card">
        <div className="status-indicator">
          <span className="status-ping"></span>
          <span className="status-text">Server: Ephemeral Store</span>
        </div>
        <div className="status-note">⚡ Wipes on shutdown (by design)</div>
      </div>

      {/* NAVIGATION */}
      <div className="sidebar-section-label">NAVIGATION</div>
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <span className="link-icon">{item.icon}</span>
              <span className="link-label">{item.label}</span>
              {item.id === 'tracker' && (
                <span className="link-badge">Live</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* QUICK ACTIONS & NOTIFICATION TRAP */}
      {['admin', 'superadmin'].includes(currentUser?.role) && (
        <div style={{ marginTop: 'auto', padding: '0 12px 12px' }}>
          <button className="sidebar-notif-btn" onClick={onOpenNotif}>
            <span style={{ fontSize: '15px' }}>🔔</span>
            <span style={{ flex: 1, textAlign: 'left', fontWeight: '600', fontSize: '12px' }}>Activity Logs</span>
            {unreadCount > 0 && <span className="sidebar-unread-pill">{unreadCount}</span>}
          </button>
        </div>
      )}

      {/* USER FOOTER */}
      <div className="sidebar-user">
        <div className="user-avatar" style={{ background: currentUser?.color || 'var(--teal)' }}>
          {getInitials(currentUser?.name)}
        </div>
        <div className="user-info">
          <div className="user-name">{currentUser?.name}</div>
          <div className="user-role">
            {currentUser?.role === 'superadmin' ? '⚡ Super Admin' : (roleLabels[currentUser?.role] || currentUser?.role)}
          </div>
        </div>
        <button className="sidebar-logout" onClick={onLogout} title="Sign Out">
          ⏏
        </button>
      </div>
    </aside>
  );
}
