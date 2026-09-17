import React from 'react';
import { LayoutDashboard, ListTodo, Calendar, Map, Users, AlertTriangle, Package, Bell, FileText, Palette, Shield, Building } from 'lucide-react';
import { SHADOW_AVATAR } from '../../constants';

export default function Sidebar({
  activeTab,
  onTabChange,
  currentUser,
  onLogout,
  unreadCount = 0,
  logs,
  onOpenNotif,
  onOpenUserDirectory,
  onOpenProfile,
  isMobileNavOpen = false,
  onCloseMobile
}) {
  const roleLabels = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    updater: 'Updater',
    editor: 'Updater',
    viewer: 'Viewer',
  };

  const isAdmin = ['admin', 'superadmin'].includes(currentUser?.role);

  const navGroups = [
    {
      groupTitle: 'WORKSPACE',
      items: [
        { id: 'dashboard', label: 'Dashboard',       icon: <LayoutDashboard size={16} /> },
        { id: 'tracker',   label: 'Project Tracker',  icon: <ListTodo size={16} />, badge: 'Live' },
        { id: 'gantt',     label: 'Gantt Timeline',   icon: <Calendar size={16} /> },
      ]
    },
    {
      groupTitle: 'LIBRARIES',
      items: [
        { id: 'specs',     label: 'Spec Library',     icon: <FileText size={16} /> },
        { id: 'artworks',  label: 'Artwork Library',  icon: <Palette size={16} /> },
      ]
    },
    {
      groupTitle: 'GOVERNANCE',
      items: [
        { id: 'stages',    label: 'Stage SOP Guide',  icon: <Map size={16} /> },
        { id: 'raci',      label: 'RACI Matrix',      icon: <Users size={16} /> },
        { id: 'risks',     label: 'Risk Register',    icon: <AlertTriangle size={16} /> },
      ]
    },
  ];

  const handleNavClick = (id) => {
    onTabChange(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className={`sidebar ${isMobileNavOpen ? 'mobile-open' : ''}`}>
      {/* BRANDING */}
      <div className="sidebar-brand">
        <div className="brand-icon"><Package size={18} /></div>
        <div className="brand-text">
          <div className="brand-title">Packaging Development</div>
          <div className="brand-subtitle">ENTERPRISE</div>
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

      {/* NAVIGATION GROUPS */}
      <div className="sidebar-scrollable-content" style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        {navGroups.map((grp) => (
          <div key={grp.groupTitle} className="sidebar-group">
            <div className="sidebar-group-title">{grp.groupTitle}</div>
            <nav className="sidebar-nav">
              {grp.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`sidebar-link${isActive ? ' active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    title={item.label}
                  >
                    <span className="link-icon-ring">
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
          </div>
        ))}

        {/* ADMIN GROUP */}
        {isAdmin && (
          <div className="sidebar-group">
            <div className="sidebar-group-title">ADMIN</div>
            <nav className="sidebar-nav">
              <button
                className="sidebar-link"
                onClick={() => { onOpenUserDirectory(); if (onCloseMobile) onCloseMobile(); }}
                title="Team Setup & Access Control"
              >
                <span className="link-icon-ring">
                  <Building size={16} />
                </span>
                <span className="link-label">Team Setup</span>
                <span className="link-admin-tag">Admin</span>
              </button>

              <button
                className="sidebar-link"
                onClick={() => { onOpenNotif(); if (onCloseMobile) onCloseMobile(); }}
                title="Activity Logs & Event Stream"
              >
                <span className="link-icon-ring">
                  <Bell size={16} />
                </span>
                <span className="link-label">Activity Logs</span>
                {unreadCount > 0 && (
                  <span className="sidebar-unread-pill">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* BOTTOM USER AREA (COMPACT & PROFESSIONAL) */}
      <div className="sidebar-user sidebar-user-compact">
        <div className="sidebar-user-row">
          <img
            src={currentUser?.avatar || SHADOW_AVATAR}
            alt={currentUser?.name || 'User'}
            className="user-avatar"
            onError={(e) => { e.target.src = SHADOW_AVATAR; }}
          />
          <div className="user-info">
            <div className="user-name">{currentUser?.name || 'Alexsander'}</div>
            <div className="user-role">
              {roleLabels[currentUser?.role] || currentUser?.role || 'Super Admin'}
            </div>
          </div>
        </div>
        <div className="user-actions">
          <button
            className="user-action-link"
            onClick={() => { onOpenProfile(); if (onCloseMobile) onCloseMobile(); }}
            title="Account Settings"
          >
            Settings
          </button>
          <span className="user-action-sep">·</span>
          <button
            className="user-action-link"
            onClick={onLogout}
            title="Sign Out"
          >
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
