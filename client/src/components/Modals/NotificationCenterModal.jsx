import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Settings, X, Filter, AlertTriangle, Calendar, Layers, ShieldCheck, Truck, Terminal } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getNotificationPreferences, updateNotificationPreferences } from '../../api';
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

const CATEGORIES = ['All', 'Approval', 'Task', 'Stage', 'Risk', 'Launch', 'Supplier', 'System'];

export default function NotificationCenterModal({ isOpen, onClose, onOpenProject }) {
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' | 'preferences'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [onlyUnread, setOnlyUnread] = useState(false);
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

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {}
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

  const filteredNotifs = notifications.filter(n => {
    if (categoryFilter !== 'All' && n.category !== categoryFilter) return false;
    if (onlyUnread && n.isRead) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        className="modal-content"
        style={{
          width: '640px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card-bg, #0B2529)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
          borderRadius: '14px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(0, 176, 255, 0.15)', color: 'var(--teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Bell size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Notification Center</h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''} across all categories
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-color)' }}>
              <button
                className={`btn btn-sm ${activeTab === 'notifications' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={() => setActiveTab('notifications')}
              >
                Alerts
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'preferences' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setActiveTab('preferences')}
              >
                <Settings size={12} />
                Preferences
              </button>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab 1: Notifications List */}
        {activeTab === 'notifications' && (
          <>
            {/* Category Filter Pills & Actions */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: categoryFilter === cat ? 'var(--teal)' : 'var(--border-color)',
                      background: categoryFilter === cat ? 'rgba(0, 176, 255, 0.12)' : 'transparent',
                      color: categoryFilter === cat ? 'var(--teal)' : 'var(--text-secondary)',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={onlyUnread}
                    onChange={e => setOnlyUnread(e.target.checked)}
                  />
                  Unread only
                </label>
                {unreadCount > 0 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px', color: 'var(--teal)' }}
                    onClick={handleMarkAllRead}
                  >
                    <CheckCheck size={13} />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notification Stream */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading notifications...</div>
              ) : filteredNotifs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <CheckCheck size={28} style={{ color: 'var(--teal)', opacity: 0.5 }} />
                  <span style={{ fontSize: '13px' }}>You're all caught up! No notifications matching filters.</span>
                </div>
              ) : (
                filteredNotifs.map(n => {
                  const IconComp = CATEGORY_ICONS[n.category] || Bell;
                  const isUrgent = n.priority === 'Urgent' || n.priority === 'High';

                  return (
                    <div
                      key={n.id}
                      style={{
                        background: n.isRead ? 'var(--bg-card)' : 'rgba(0, 176, 255, 0.04)',
                        border: '1px solid',
                        borderColor: n.isRead ? 'var(--border-color)' : 'rgba(0, 176, 255, 0.25)',
                        borderRadius: '6px',
                        padding: '12px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '6px',
                        background: isUrgent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 176, 255, 0.12)',
                        color: isUrgent ? '#ef4444' : 'var(--teal)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <IconComp size={15} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '6px' }}>
                          {n.message}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px' }}>
                          <span style={{
                            padding: '1px 6px', borderRadius: '4px',
                            background: 'var(--border-color)', color: 'var(--text-secondary)'
                          }}>
                            {n.category}
                          </span>
                          {n.projectId && onOpenProject && (
                            <button
                              onClick={() => {
                                onOpenProject(n.projectId);
                                handleMarkRead(n.id);
                                onClose();
                              }}
                              style={{
                                background: 'none', border: 'none', color: 'var(--teal)',
                                cursor: 'pointer', padding: 0, textDecoration: 'underline'
                              }}
                            >
                              View Project {n.projectId}
                            </button>
                          )}
                        </div>
                      </div>

                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', padding: '2px'
                          }}
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Tab 2: Preferences */}
        {activeTab === 'preferences' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Delivery Channels
              </h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Choose how you prefer to receive platform updates and action alerts.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preferences.inAppEnabled}
                    onChange={e => handleSavePref({ ...preferences, inAppEnabled: e.target.checked })}
                  />
                  <span>In-App Real-time Notifications & Toast Badges</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preferences.emailSummaryEnabled}
                    onChange={e => handleSavePref({ ...preferences, emailSummaryEnabled: e.target.checked })}
                  />
                  <span>Email Alerts for Critical Path & Direct Approvals</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preferences.dailySummaryEnabled}
                    onChange={e => handleSavePref({ ...preferences, dailySummaryEnabled: e.target.checked })}
                  />
                  <span>Daily Morning Executive Summary Digest</span>
                </label>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Category Subscriptions
              </h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Enable or mute alerts generated from specific functional events.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {Object.keys(preferences.notificationCategories || {}).map(cat => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
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

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
