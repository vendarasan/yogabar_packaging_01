import React, { useState, useEffect, useRef } from 'react';
import { markSeen } from '../../api';
import { STAGE_COLORS } from '../../constants';
import { timeAgo } from '../../utils';

export default function Header({
  activeTab,
  currentUser,
  onOpenAddModal,
  logs,
  seenAt,
  onLogsMarkedSeen,
  exportCSV
}) {
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  const canEdit = currentUser && ['admin', 'editor', 'superadmin'].includes(currentUser.role);
  const isAdmin = currentUser && ['admin', 'superadmin'].includes(currentUser.role);

  const unreadCount = logs.filter(e => e.timestamp > (seenAt || 0)).length;

  const pageTitles = {
    dashboard: { title: 'Analytics Dashboard', sub: 'Real-time FMCG packaging metrics & stage bottleneck tracking' },
    tracker: { title: 'Project Tracker & Stage Pipeline', sub: 'Brief to Launch material tracking & specification lock' },
    gantt: { title: 'Gantt Timeline Chart', sub: '12-Week project rollout calendar' },
    stages: { title: 'Stage SOP Guide & Quality Gates', sub: 'Standard operating procedures and stage sign-off checklists' },
    raci: { title: 'RACI Responsibility Matrix', sub: 'Cross-functional accountability mapping' },
    risks: { title: 'Risk Register & Mitigations', sub: 'Standard packaging risk management library' },
  };

  const currentMeta = pageTitles[activeTab] || pageTitles.dashboard;

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
    <header className="top-header">
      <div className="header-left">
        <div className="breadcrumb">
          <span className="bc-root">PKG System</span>
          <span className="bc-sep">/</span>
          <span className="bc-current">{currentMeta.title}</span>
        </div>
        <div className="header-page-sub">{currentMeta.sub}</div>
      </div>

      <div className="header-right">
        {/* LIVE SERVER STATUS */}
        <div className="live-status-chip" title="Node.js Express Server on Port 5001">
          <span className="live-dot"></span>
          <span>API 5001: Connected</span>
        </div>

        {/* NOTIFICATIONS POPOVER */}
        {isAdmin && (
          <div className="notif-wrap" ref={notifRef}>
            <button
              className={`top-icon-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
              onClick={() => setShowNotif(!showNotif)}
              title="Activity Logs"
            >
              🔔
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            {showNotif && (
              <div className="notif-panel">
                <div className="notif-head">
                  <div className="notif-head-title">⚡ Live Activity Stream</div>
                  <button className="btn btn-ghost btn-sm" onClick={handleMarkSeen}>Mark read</button>
                </div>
                <div className="notif-list">
                  {!logs.length ? (
                    <div className="notif-empty">📭 No recent activity logs</div>
                  ) : (
                    logs.slice(0, 25).map(e => {
                      const isUnread = e.timestamp > (seenAt || 0);
                      const fc = STAGE_COLORS[e.from] || '#fff';
                      const tc = STAGE_COLORS[e.to] || '#fff';
                      const icon = e.type === 'REVOKE' ? '↩' : '▶';
                      return (
                        <div key={e.id} className={`notif-item ${isUnread ? 'unread' : ''}`}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '700', marginBottom: '2px' }}>
                            <span style={{ color: fc }}>{e.from}</span>
                            <span style={{ color: 'var(--text-dim)' }}>{icon}</span>
                            <span style={{ color: tc }}>{e.to}</span>
                            {e.type === 'REVOKE' && <span className="tag tag-purple" style={{ fontSize: '8.5px' }}>REVOKED</span>}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginBottom: '1px' }}>
                            {e.projectName}{e.fgCode ? ` (${e.fgCode})` : ''}
                          </div>
                          <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', opacity: '0.7' }}>
                            By {e.by} · {timeAgo(e.timestamp)}
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

        {/* QUICK BUTTONS */}
        <button className="btn btn-ghost btn-sm" onClick={exportCSV} title="Export CSV Data">
          ⬇ Export
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()} title="Print Page">
          🖨 Print
        </button>

        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={onOpenAddModal}>
            ＋ New Project
          </button>
        )}
      </div>
    </header>
  );
}
