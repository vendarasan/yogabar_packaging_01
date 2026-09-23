import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Settings,
  X,
  Filter,
  AlertTriangle,
  Calendar,
  Layers,
  ShieldCheck,
  Truck,
  Terminal,
  Activity,
  RotateCcw,
  Play,
  Tag,
  ShoppingCart,
  FileText,
  CheckCircle2,
  User,
  Clock
} from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  markSeen
} from '../../api';
import { timeAgo } from '../../utils';

const CATEGORY_ICONS = {
  Approval: ShieldCheck,
  Task: Check,
  Stage: Layers,
  Risk: AlertTriangle,
  Launch: Calendar,
  Supplier: Truck,
  System: Terminal
};

const ALERT_CATEGORIES = ['All', 'Approval', 'Task', 'Stage', 'Risk', 'Launch', 'Supplier', 'System'];

const ACTIVITY_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'ARTWORK', label: 'Artwork' },
  { id: 'SPECS', label: 'Specs' },
  { id: 'ADVANCES', label: 'Stages' },
  { id: 'REVOKES', label: 'Revokes' },
  { id: 'PO', label: 'Purchase Orders' },
  { id: 'CODES', label: 'PM/FG Codes' }
];

export default function NotificationCenterModal({
  isOpen,
  onClose,
  onOpenProject,
  logs = [],
  seenAt = 0,
  onLogsMarkedSeen
}) {
  const unreadActivityCount = logs.filter(e => e.timestamp > (seenAt || 0)).length;

  const [activeTab, setActiveTab] = useState('activity'); // 'activity' | 'alerts' | 'preferences'
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [alertCategoryFilter, setAlertCategoryFilter] = useState('All');
  const [onlyUnreadAlerts, setOnlyUnreadAlerts] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    inAppEnabled: true,
    emailSummaryEnabled: true,
    dailySummaryEnabled: false,
    notificationCategories: {
      Approval: true,
      Task: true,
      Stage: true,
      Risk: true,
      Launch: true,
      Supplier: true,
      System: true
    }
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      // If there are unread activity logs, default to activity tab
      if (unreadActivityCount > 0) {
        setActiveTab('activity');
      }
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notifRes, prefRes] = await Promise.all([
        getNotifications({ limit: 100 }),
        getNotificationPreferences()
      ]);
      if (notifRes.data?.success) {
        setNotifications(notifRes.data.notifications || []);
      }
      if (prefRes.data?.success) {
        setPreferences(prefRes.data.preferences);
      }
    } catch (err) {
      console.warn('Failed to load notifications or preferences:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {}
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  const handleMarkActivitySeen = async () => {
    try {
      const res = await markSeen();
      if (res?.data?.seenAt && onLogsMarkedSeen) {
        onLogsMarkedSeen(res.data.seenAt);
      }
    } catch (e) {
      console.error('Failed to mark logs as seen', e);
    }
  };

  const handleSavePref = async (newPrefs) => {
    setPreferences(newPrefs);
    try {
      await updateNotificationPreferences(newPrefs);
    } catch (err) {
      console.warn('Failed updating preferences:', err.message);
    }
  };

  if (!isOpen) return null;

  const unreadAlertsCount = notifications.filter(n => !n.isRead).length;

  // Filtered direct alerts
  const filteredNotifs = notifications.filter(n => {
    if (alertCategoryFilter !== 'All' && n.category !== alertCategoryFilter) return false;
    if (onlyUnreadAlerts && n.isRead) return false;
    return true;
  });

  // Filtered live activity logs
  const filteredLogs = logs.filter(e => {
    if (activityFilter === 'ALL') return true;
    const act = e.eventType || e.action || '';
    if (activityFilter === 'ARTWORK') return act.startsWith('ARTWORK_');
    if (activityFilter === 'SPECS') return act.startsWith('SPEC_') || act.startsWith('SPECS_') || act.startsWith('SPECIFICATION_');
    if (activityFilter === 'ADVANCES') return act === 'STAGE_ADVANCE' || act === 'MATERIAL_ADVANCE' || act === 'STAGE_CHANGED' || e.type === 'ADVANCE';
    if (activityFilter === 'REVOKES') return act === 'STAGE_REVOKE' || act === 'MATERIAL_REVOKE' || e.type === 'REVOKE';
    if (activityFilter === 'CODES') return act === 'PMCODE_UPDATE' || act === 'FGCODE_UPDATE';
    if (activityFilter === 'PO') return act === 'PO_UPDATE';
    return true;
  });

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        className="modal-content"
        style={{
          width: '660px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card-bg, #FFFFFF)',
          border: '1px solid var(--border-color, #E2EBE6)',
          borderRadius: '14px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color, #E2EBE6)',
            background: 'var(--card-bg, #FFFFFF)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(0, 135, 103, 0.12)',
                color: 'var(--teal, #008767)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #102B36)' }}>
                Notification Center & Activity
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted, #829A9E)' }}>
                {unreadActivityCount > 0
                  ? `${unreadActivityCount} new activity update${unreadActivityCount !== 1 ? 's' : ''}`
                  : `${unreadAlertsCount} unread direct alert${unreadAlertsCount !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Top Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'var(--surface-secondary, #F3F8F5)',
                borderRadius: '8px',
                padding: '3px',
                border: '1px solid var(--border-color, #E2EBE6)'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                style={{
                  fontSize: '11.5px',
                  fontWeight: activeTab === 'activity' ? 600 : 500,
                  padding: '5px 11px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'activity' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'activity' ? 'var(--text-main, #102B36)' : 'var(--text-secondary, #526B74)',
                  boxShadow: activeTab === 'activity' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Activity size={13} style={{ color: 'var(--teal, #008767)' }} />
                <span>Live Activity</span>
                {unreadActivityCount > 0 && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      background: '#DCFCE7',
                      color: '#008767',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      border: '1px solid #A7F3D0'
                    }}
                  >
                    {unreadActivityCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                style={{
                  fontSize: '11.5px',
                  fontWeight: activeTab === 'alerts' ? 600 : 500,
                  padding: '5px 11px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'alerts' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'alerts' ? 'var(--text-main, #102B36)' : 'var(--text-secondary, #526B74)',
                  boxShadow: activeTab === 'alerts' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <ShieldCheck size={13} style={{ color: '#0284C7' }} />
                <span>My Alerts</span>
                {unreadAlertsCount > 0 && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      background: '#FEE2E2',
                      color: '#DC2626',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      border: '1px solid #FECACA'
                    }}
                  >
                    {unreadAlertsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preferences')}
                style={{
                  fontSize: '11.5px',
                  fontWeight: activeTab === 'preferences' ? 600 : 500,
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'preferences' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'preferences' ? 'var(--text-main, #102B36)' : 'var(--text-secondary, #526B74)',
                  boxShadow: activeTab === 'preferences' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Settings size={13} />
                <span>Preferences</span>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: '6px',
                color: 'var(--text-muted, #829A9E)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: LIVE ACTIVITY STREAM (16 ITEMS)
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'activity' && (
          <>
            {/* Filter pills & Mark read */}
            <div
              style={{
                padding: '10px 18px',
                background: 'var(--surface-secondary, #F3F8F5)',
                borderBottom: '1px solid var(--border-color, #E2EBE6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', flex: 1, paddingBottom: '2px' }}>
                {ACTIVITY_FILTERS.map(f => {
                  const isActive = activityFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActivityFilter(f.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: `1px solid ${isActive ? 'var(--teal, #008767)' : 'var(--border-color, #E2EBE6)'}`,
                        background: isActive ? 'var(--teal, #008767)' : '#FFFFFF',
                        color: isActive ? '#FFFFFF' : 'var(--text-secondary, #526B74)',
                        fontSize: '11px',
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: isActive ? '0 1px 3px rgba(0, 135, 103, 0.25)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {unreadActivityCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkActivitySeen}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    color: 'var(--teal, #008767)',
                    background: '#FFFFFF',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #E2EBE6)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <CheckCheck size={13} />
                  Mark read
                </button>
              )}
            </div>

            {/* Activity Stream List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {!filteredLogs.length ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted, #829A9E)' }}>
                  <CheckCircle2 size={32} style={{ color: 'var(--teal, #008767)', opacity: 0.5, margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #102B36)' }}>No Activity Records</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #829A9E)', marginTop: '2px' }}>
                    No events match the selected activity filter.
                  </div>
                </div>
              ) : (
                filteredLogs.slice(0, 50).map(e => {
                  const isUnread = e.timestamp > (seenAt || 0);
                  const act = e.eventType || e.action || '';
                  const isRevoke = act === 'STAGE_REVOKE' || act === 'MATERIAL_REVOKE' || e.type === 'REVOKE';
                  const isAdvance = act === 'STAGE_ADVANCE' || act === 'MATERIAL_ADVANCE' || act === 'STAGE_CHANGED' || e.type === 'ADVANCE';
                  const isPO = act === 'PO_UPDATE';
                  const isSpecs = act.startsWith('SPEC_') || act.startsWith('SPECS_') || act.startsWith('SPECIFICATION_');
                  const isArtwork = act.startsWith('ARTWORK_');
                  const isPM = act === 'PMCODE_UPDATE';
                  const isFG = act === 'FGCODE_UPDATE';

                  let badgeColor = '#0284C7';
                  let badgeText = act.replace(/_/g, ' ') || 'ACTIVITY';
                  let ActionIcon = FileText;

                  if (isRevoke) {
                    badgeColor = '#DC2626';
                    badgeText = 'STAGE REVOKE';
                    ActionIcon = RotateCcw;
                  } else if (isAdvance) {
                    badgeColor = '#008767';
                    badgeText = 'STAGE ADVANCE';
                    ActionIcon = Play;
                  } else if (isArtwork) {
                    badgeColor = '#0284C7';
                    badgeText = act === 'ARTWORK_APPROVED' ? 'ARTWORK APPROVED' : (e.metadata?.versionTag ? `ARTWORK ${e.metadata.versionTag}` : 'ARTWORK');
                    ActionIcon = FileText;
                  } else if (isSpecs) {
                    badgeColor = '#7C3AED';
                    badgeText = act === 'SPECIFICATION_APPROVED' || act === 'SPEC_APPROVED_HEAD' ? 'SPEC APPROVED' : 'SPEC SHEET';
                    ActionIcon = CheckCircle2;
                  } else if (isPM) {
                    badgeColor = '#008767';
                    badgeText = 'PMCODE';
                    ActionIcon = Tag;
                  } else if (isFG) {
                    badgeColor = '#008767';
                    badgeText = 'FGCODE';
                    ActionIcon = Tag;
                  } else if (isPO) {
                    badgeColor = '#0284C7';
                    badgeText = 'PO UPDATE';
                    ActionIcon = ShoppingCart;
                  }

                  const timeFormatted = e.timestamp
                    ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '';

                  const userName = e.user?.name || (typeof e.user === 'string' ? e.user : (e.by || e.userName || 'System'));
                  const userRole = e.user?.role || e.userRole || e.byRole || '';

                  const rawOld = e.oldValue !== undefined ? e.oldValue : e.metadata?.oldValue;
                  const rawNew = e.newValue !== undefined ? e.newValue : e.metadata?.newValue;

                  const isValEmpty = (val) => val === undefined || val === null || String(val).trim() === '' || String(val).toLowerCase() === 'null' || String(val).toLowerCase() === 'undefined';
                  const cleanOldVal = !isValEmpty(rawOld) ? String(rawOld) : null;
                  const cleanNewVal = !isValEmpty(rawNew) ? String(rawNew) : null;

                  const reasonText = e.reason || e.metadata?.reason;

                  return (
                    <div
                      key={e.id || e.timestamp}
                      style={{
                        background: isUnread ? '#F7FBF9' : '#FFFFFF',
                        border: `1px solid ${isUnread ? '#A7F3D0' : 'var(--border-color, #E2EBE6)'}`,
                        borderLeft: `4px solid ${badgeColor}`,
                        borderRadius: '8px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* TOP ROW: TITLE & BADGE */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <ActionIcon size={14} style={{ color: badgeColor, flexShrink: 0 }} />
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main, #102B36)' }}>
                            {e.title || 'Project Activity'}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: `${badgeColor}12`,
                            color: badgeColor,
                            border: `1px solid ${badgeColor}35`,
                            letterSpacing: '0.04em',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {badgeText}
                        </span>
                      </div>

                      {/* PROJECT CONTEXT & STABLE ENTITY */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        {e.projectName && (
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--teal, #008767)', lineHeight: 1.3 }}>
                            {e.projectName} {e.fgCode ? `(${e.fgCode})` : ''}
                          </div>
                        )}
                        {e.entityId && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontFamily: 'var(--font-mono, monospace)',
                              color: 'var(--text-muted, #829A9E)',
                              background: 'var(--surface-secondary, #F3F8F5)',
                              border: '1px solid var(--border-color, #E2EBE6)',
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            {e.entityId}
                          </span>
                        )}
                      </div>

                      {/* BEFORE / AFTER TRANSITION — NO MORE "Previous: null" */}
                      {cleanOldVal && cleanNewVal && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '10.5px',
                            background: 'var(--surface-secondary, #F3F8F5)',
                            border: '1px solid var(--border-color, #E2EBE6)',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            width: 'fit-content',
                            margin: '2px 0'
                          }}
                        >
                          <span style={{ color: 'var(--text-muted, #829A9E)' }}>Previous:</span>
                          <span style={{ color: '#DC2626', textDecoration: 'line-through', fontWeight: 500 }}>{cleanOldVal}</span>
                          <span style={{ color: 'var(--text-muted, #829A9E)' }}>➔</span>
                          <span style={{ color: '#16A34A', fontWeight: 600 }}>{cleanNewVal}</span>
                        </div>
                      )}

                      {!cleanOldVal && cleanNewVal && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '10.5px',
                            background: 'var(--surface-secondary, #F3F8F5)',
                            border: '1px solid var(--border-color, #E2EBE6)',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            width: 'fit-content',
                            margin: '2px 0'
                          }}
                        >
                          <span style={{ color: 'var(--text-muted, #829A9E)' }}>Status:</span>
                          <span style={{ color: '#008767', fontWeight: 600, background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px' }}>
                            {cleanNewVal}
                          </span>
                        </div>
                      )}

                      {/* DETAILS BOX */}
                      {e.details && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-body, #243E48)',
                            background: 'var(--surface-secondary, #F3F8F5)',
                            border: '1px solid var(--border-color, #E2EBE6)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            marginTop: '2px',
                            lineHeight: 1.45
                          }}
                        >
                          {e.details}
                        </div>
                      )}

                      {/* USER REASON */}
                      {reasonText && (
                        <div
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-secondary, #526B74)',
                            fontStyle: 'italic',
                            background: '#FEF3C7',
                            border: '1px solid #FDE68A',
                            padding: '3px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          💬 Reason: &ldquo;{reasonText}&rdquo;
                        </div>
                      )}

                      {/* FOOTER ROW: USER & TIME */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '4px',
                          fontSize: '10px',
                          color: 'var(--text-secondary, #526B74)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={11} style={{ opacity: 0.7 }} />
                          <span>{userName}</span>
                          {userRole && (
                            <span style={{ opacity: 0.6 }}>({userRole})</span>
                          )}
                        </div>
                        {timeFormatted && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} style={{ opacity: 0.7 }} />
                            <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted, #829A9E)' }}>
                              {timeFormatted}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: DIRECT USER ALERTS & APPROVALS
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'alerts' && (
          <>
            {/* Category Filter Pills & Actions */}
            <div
              style={{
                padding: '10px 18px',
                borderBottom: '1px solid var(--border-color, #E2EBE6)',
                background: 'var(--surface-secondary, #F3F8F5)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {ALERT_CATEGORIES.map(cat => {
                  const isActive = alertCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAlertCategoryFilter(cat)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: `1px solid ${isActive ? '#0284C7' : 'var(--border-color, #E2EBE6)'}`,
                        background: isActive ? '#0284C7' : '#FFFFFF',
                        color: isActive ? '#FFFFFF' : 'var(--text-secondary, #526B74)',
                        fontSize: '11px',
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 1px 3px rgba(2, 132, 199, 0.25)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary, #526B74)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={onlyUnreadAlerts}
                    onChange={e => setOnlyUnreadAlerts(e.target.checked)}
                  />
                  Unread only
                </label>
                {unreadAlertsCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', color: '#0284C7', background: '#FFFFFF', border: '1px solid var(--border-color, #E2EBE6)', borderRadius: '6px' }}
                    onClick={handleMarkAllNotificationsRead}
                  >
                    <CheckCheck size={13} />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notification Stream */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted, #829A9E)' }}>Loading notifications...</div>
              ) : filteredNotifs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted, #829A9E)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <CheckCheck size={32} style={{ color: 'var(--teal, #008767)', opacity: 0.6 }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #102B36)' }}>
                    You're all caught up!
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #829A9E)' }}>
                    No action alerts or direct approval requests matching this filter.
                  </span>
                </div>
              ) : (
                filteredNotifs.map(n => {
                  const IconComp = CATEGORY_ICONS[n.category] || Bell;
                  const isUrgent = n.priority === 'Urgent' || n.priority === 'High';

                  return (
                    <div
                      key={n.id}
                      style={{
                        background: n.isRead ? '#FFFFFF' : '#F0F9FF',
                        border: '1px solid',
                        borderColor: n.isRead ? 'var(--border-color, #E2EBE6)' : '#BAE6FD',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '6px',
                          background: isUrgent ? '#FEE2E2' : '#E0F2FE',
                          color: isUrgent ? '#DC2626' : '#0284C7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <IconComp size={16} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main, #102B36)' }}>{n.title}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted, #829A9E)', flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-body, #243E48)', lineHeight: 1.4, marginBottom: '6px' }}>
                          {n.message}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px' }}>
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'var(--surface-secondary, #F3F8F5)',
                              border: '1px solid var(--border-color, #E2EBE6)',
                              color: 'var(--text-secondary, #526B74)',
                              fontWeight: 600
                            }}
                          >
                            {n.category}
                          </span>
                          {n.projectId && onOpenProject && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenProject(n.projectId);
                                handleMarkNotificationRead(n.id);
                                onClose();
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--teal, #008767)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: 0,
                                textDecoration: 'underline'
                              }}
                            >
                              Open Project {n.projectId} ➔
                            </button>
                          )}
                        </div>
                      </div>

                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkNotificationRead(n.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted, #829A9E)',
                            padding: '4px'
                          }}
                          title="Mark as read"
                        >
                          <Check size={15} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: PREFERENCES
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'preferences' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #102B36)' }}>
                Delivery Channels
              </h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: 'var(--text-secondary, #526B74)' }}>
                Choose how you prefer to receive platform updates and action alerts.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-main, #102B36)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preferences.inAppEnabled}
                    onChange={e => handleSavePref({ ...preferences, inAppEnabled: e.target.checked })}
                  />
                  <span>In-App Real-time Notifications & Toast Badges</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-main, #102B36)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preferences.emailSummaryEnabled}
                    onChange={e => handleSavePref({ ...preferences, emailSummaryEnabled: e.target.checked })}
                  />
                  <span>Email Alerts for Critical Path & Direct Approvals</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-main, #102B36)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preferences.dailySummaryEnabled}
                    onChange={e => handleSavePref({ ...preferences, dailySummaryEnabled: e.target.checked })}
                  />
                  <span>Daily Morning Executive Summary Digest</span>
                </label>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color, #E2EBE6)', paddingTop: '14px' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #102B36)' }}>
                Category Subscriptions
              </h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: 'var(--text-secondary, #526B74)' }}>
                Enable or mute alerts generated from specific functional events.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {Object.keys(preferences.notificationCategories || {}).map(cat => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-main, #102B36)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={preferences.notificationCategories[cat]}
                      onChange={e => {
                        const updatedCats = { ...preferences.notificationCategories, [cat]: e.target.checked };
                        handleSavePref({ ...preferences, notificationCategories: updatedCats });
                      }}
                    />
                    <span>{cat} Events</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color, #E2EBE6)',
            background: 'var(--card-bg, #FFFFFF)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
