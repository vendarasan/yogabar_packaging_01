import React from 'react';
import { LayoutDashboard, ListTodo, Calendar, Map, Users, AlertTriangle, Package, Bell, FileText, Palette } from 'lucide-react';
import { SHADOW_AVATAR } from '../../constants';

export default function Sidebar({
  activeTab,
  onTabChange,
  currentUser,
  onLogout,
  unreadCount,
  logs,
  onOpenNotif,
  onOpenUserDirectory,
  onOpenProfile,
  isMobileNavOpen = false,
  onCloseMobile
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard',       icon: <LayoutDashboard size={18} />, color: '#0284c7' },
    { id: 'tracker',   label: 'Project Tracker',  icon: <ListTodo size={18} />, color: '#059669', badge: 'Live' },
    { id: 'specs',     label: 'Spec Library',     icon: <FileText size={18} />, color: '#0ea5e9' },
    { id: 'artworks',  label: 'Artwork Library',  icon: <Palette size={18} />, color: '#ec4899' },
    { id: 'gantt',     label: 'Gantt Timeline',   icon: <Calendar size={18} />, color: '#0891b2' },
    { id: 'stages',    label: 'Stage SOP Guide',  icon: <Map size={18} />, color: '#7c3aed' },
    { id: 'raci',      label: 'RACI Matrix',      icon: <Users size={18} />, color: '#d97706' },
    { id: 'risks',     label: 'Risk Register',    icon: <AlertTriangle size={18} />, color: '#e11d48' },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const roleLabels = {
    superadmin: '👑 Super Admin',
    admin: '🛡 Admin',
    updater: '⚡ Updater',
    editor: '⚡ Updater',
    viewer: '👁 Viewer',
  };

  const isAdmin = ['admin', 'superadmin'].includes(currentUser?.role);

  return (
    <aside className={`sidebar ${isMobileNavOpen ? 'mobile-open' : ''}`}>
      {/* BRANDING */}
      <div className="sidebar-brand">
        <div className="brand-icon"><Package size={20} /></div>
        <div className="brand-text">
          <div className="brand-title">Packaging Development Tracker</div>
          <div className="brand-subtitle">ENTERPRISE v2.0</div>
        </div>
        <button
          className="sidebar-mobile-close"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          title="Close menu"
        >
          ✕
        </button>
      </div>

      {/* NAVIGATION */}
      <div className="sidebar-section-label">NAVIGATION</div>
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => onTabChange(item.id)}
              title={item.label}
            >
              <span
                className="link-icon-ring"
                style={isActive ? { background: `${item.color}18` } : {}}
              >
                {item.icon}
              </span>
              <span className="link-label">{item.label}</span>
              {item.badge && (
                <span className="link-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ACCESS & TEAM SETUP BUTTON (Super Admin and Admin only) */}
      {isAdmin && (
        <div style={{ padding: '0 10px 4px', marginTop: '12px' }}>
          <button
            className="sidebar-notif-btn"
            onClick={onOpenUserDirectory}
            style={{ background: 'rgba(20, 184, 166, 0.12)', border: '1px solid rgba(20, 184, 166, 0.35)', color: '#2dd4bf' }}
            title="Team Setup & Directory (Super Admin & Admin Only)"
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>🏢</span>
            <span style={{ flex: 1, textAlign: 'left', fontWeight: '700', fontSize: '11px' }}>Team Setup</span>
            <span style={{ fontSize: '9px', background: 'rgba(20, 184, 166, 0.2)', padding: '1px 5px', borderRadius: '3px', fontWeight: '800' }}>Admin</span>
          </button>
        </div>
      )}

      {/* ACTIVITY LOGS BUTTON (admin only) */}
      {isAdmin && (
        <div style={{ padding: '0 10px 10px', marginTop: '4px' }}>
          <button className="sidebar-notif-btn" onClick={onOpenNotif}>
            <span style={{ display: 'flex', alignItems: 'center' }}><Bell size={16} /></span>
            <span style={{ flex: 1, textAlign: 'left' }}>Activity Logs</span>
            {unreadCount > 0 && (
              <span className="sidebar-unread-pill">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
        </div>
      )}

      {/* USER FOOTER / PROFILE SETUP */}
      <div className="sidebar-user" style={{ cursor: 'pointer' }} onClick={onOpenProfile} title="Click to view/edit your profile setup">
        <img
          src={currentUser?.avatar || SHADOW_AVATAR}
          alt={currentUser?.name || 'User'}
          className="user-avatar"
          style={{ objectFit: 'cover', border: '1.5px solid var(--accent, #00d4c8)' }}
          onError={(e) => { e.target.src = SHADOW_AVATAR; }}
        />
        <div className="user-info">
          <div className="user-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{currentUser?.name}</span>
            <span style={{ fontSize: '10px', opacity: 0.6 }}>⚙</span>
          </div>
          <div className="user-role" style={{ color: currentUser?.role === 'superadmin' ? '#f87171' : currentUser?.role === 'admin' ? '#c084fc' : '#2dd4bf', fontWeight: '700' }}>
            {roleLabels[currentUser?.role] || currentUser?.role}
          </div>
        </div>
        <button 
          className="sidebar-logout-text" 
          onClick={(e) => { e.stopPropagation(); onLogout(); }} 
          title="Sign Out"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
