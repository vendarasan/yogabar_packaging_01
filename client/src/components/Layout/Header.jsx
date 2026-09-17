import React, { useState, useEffect, useRef } from 'react';
import { markSeen } from '../../api';
import { STAGE_COLORS } from '../../constants';
import { timeAgo } from '../../utils';

export default function Header({
  activeTab,
  currentUser,
  onOpenAddModal,
  logs = [],
  seenAt,
  onLogsMarkedSeen,
  exportCSV,
  onToggleMobileNav
}) {
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  const isAdmin = currentUser && ['admin', 'superadmin'].includes(currentUser.role);
  const canCreate = isAdmin;

  const unreadCount = logs.filter(e => e.timestamp > (seenAt || 0)).length;

  const pageTitles = {
    tracker:   { title: 'PROJECT TRACKER', sub: 'Packaging development stage pipeline' },
    dashboard: { title: 'ANALYTICS DASHBOARD', sub: 'Real-time packaging metrics & stage bottleneck tracking' },
    menus:     { title: 'MODULE DIRECTORY', sub: 'Navigate all application modules' },
    specs:     { title: 'SPECIFICATION LIBRARY', sub: 'Packaging material specifications, governance & engineering standards' },
    artworks:  { title: 'ARTWORK LIBRARY', sub: 'Digital packaging artwork proofs, revision control & sign-off' },
    gantt:     { title: 'GANTT TIMELINE', sub: '12-Week project rollout calendar' },
    stages:    { title: 'STAGE SOP GUIDE', sub: 'Standard operating procedures and stage quality gates' },
    raci:      { title: 'RACI MATRIX', sub: 'Cross-functional accountability mapping' },
    risks:     { title: 'RISK REGISTER', sub: 'Standard packaging risk management library' },
  };

  const currentMeta = pageTitles[activeTab] || pageTitles.tracker;

  const handleMarkSeen = async () => {
    try {
      const res = await markSeen();
      onLogsMarkedSeen(res.data.seenAt);
    } catch (e) {}
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="top-header enterprise-header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleMobileNav}
          aria-label="Toggle navigation menu"
          title="Open menu"
        >
          ☰
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 className="header-page-title">{currentMeta.title}</h1>
          <p className="header-page-sub">{currentMeta.sub}</p>
        </div>
      </div>

      <div className="header-right">
        {/* OPTIONAL SUBTLE METADATA */}
        <div className="header-meta-updated hide-on-mobile" title="Data synchronized">
          <span className="meta-updated-label">Last updated</span>
          <span className="meta-updated-time">2 mins ago</span>
          <button
            type="button"
            className="meta-updated-refresh"
            title="Refresh tracker data"
            onClick={() => window.location.reload()}
          >
            ↻
          </button>
        </div>

        {/* NOTIFICATIONS ICON BUTTON */}
        {isAdmin && (
          <div className="notif-wrap" ref={notifRef}>
            <button
              className={`top-icon-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
              onClick={() => setShowNotif(!showNotif)}
              title="Activity Logs & Feeds"
              aria-label="Activity Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {showNotif && (
              <div className="notif-panel" style={{ width: '380px', maxHeight: '480px' }}>
                <div className="notif-head">
                  <div className="notif-head-title">⚡ Live Activity Stream</div>
                  <button className="btn btn-ghost btn-sm" onClick={handleMarkSeen}>Mark read</button>
                </div>
                <div className="notif-list" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {!logs.length ? (
                    <div className="notif-empty">📭 No recent activity logs</div>
                  ) : (
                    logs.slice(0, 30).map(e => {
                      const isUnread = e.timestamp > (seenAt || 0);
                      const isRevoke = e.action === 'STAGE_REVOKE' || e.action === 'MATERIAL_REVOKE' || e.type === 'REVOKE';
                      const isAdvance = e.action === 'STAGE_ADVANCE' || e.action === 'MATERIAL_ADVANCE' || e.type === 'ADVANCE';
                      const isPO = e.action === 'PO_UPDATE';
                      const isSpecs = e.action === 'SPECS_UPDATE';
                      const isPM = e.action === 'PMCODE_UPDATE';
                      const isFG = e.action === 'FGCODE_UPDATE';

                      let badgeColor = '#0284c7';
                      let icon = '📝';
                      if (isRevoke) { badgeColor = '#e11d48'; icon = '↩'; }
                      else if (isAdvance) { badgeColor = '#059669'; icon = '▶'; }
                      else if (isPO) { badgeColor = '#0284c7'; icon = '🛒'; }
                      else if (isSpecs) { badgeColor = '#7c3aed'; icon = '⚙'; }
                      else if (isPM || isFG) { badgeColor = '#14b8a6'; icon = '🏷'; }

                      return (
                        <div key={e.id} className={`notif-item ${isUnread ? 'unread' : ''}`} style={{ borderBottom: '1px solid var(--border-light)', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                            <div style={{ fontWeight: '700', fontSize: '11.5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span>{icon}</span>
                              <span>{e.title || (e.from && e.to ? `${e.from} ➔ ${e.to}` : 'Project Activity')}</span>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: '800', background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}55`, padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                              {e.action ? e.action.replace('_UPDATE', '').replace('_', ' ') : 'LOG'}
                            </span>
                          </div>

                          <div style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--teal)', marginBottom: '3px' }}>
                            {e.projectName}{e.fgCode ? ` (${e.fgCode})` : ''}
                          </div>

                          {e.details && (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '5px', lineHeight: '1.35', background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '4px' }}>
                              {e.details}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', color: 'var(--text-muted)' }}>
                            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                              👤 {e.by} <span style={{ opacity: 0.7, fontWeight: 'normal' }}>({e.byRole || 'user'})</span>
                            </span>
                            <span title={e.dateStr || ''} style={{ fontFamily: 'var(--mono)', opacity: 0.85 }}>
                              🕒 {e.dateStr ? e.dateStr.split(', ')[1] : timeAgo(e.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECONDARY ACTION: EXPORT */}
        <button className="btn btn-secondary btn-sm" onClick={exportCSV} title="Export CSV Data">
          <span>⬇</span> <span className="hide-on-mobile">Export</span>
        </button>

        {/* SECONDARY ACTION: PRINT */}
        <button className="btn btn-secondary btn-sm hide-on-mobile" onClick={() => window.print()} title="Print Page">
          <span>🖨</span> <span>Print</span>
        </button>

        {/* DOMINANT PRIMARY CTA: + NEW PROJECT */}
        {canCreate && (
          <button className="btn btn-primary btn-sm btn-dominant-cta" onClick={onOpenAddModal} title="Create New Project">
            <span>＋</span> <span>New Project</span>
          </button>
        )}
      </div>
    </header>
  );
}
