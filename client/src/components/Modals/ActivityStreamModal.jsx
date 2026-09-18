import React, { useState, useEffect } from 'react';
import { Bell, X, RotateCcw, Play, Tag, ShoppingCart, Settings, FileText, CheckCircle2, User, Clock, Check } from 'lucide-react';
import { markSeen } from '../../api';

export default function ActivityStreamModal({
  isOpen,
  onClose,
  logs = [],
  seenAt = 0,
  onLogsMarkedSeen
}) {
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = logs.filter(e => e.timestamp > (seenAt || 0)).length;

  const handleMarkSeen = async () => {
    try {
      const res = await markSeen();
      if (res?.data?.seenAt && onLogsMarkedSeen) {
        onLogsMarkedSeen(res.data.seenAt);
      }
    } catch (e) {
      console.error('Failed to mark logs as seen', e);
    }
  };

  const filteredLogs = logs.filter(e => {
    if (filter === 'ALL') return true;
    if (filter === 'REVOKES') return e.action === 'STAGE_REVOKE' || e.action === 'MATERIAL_REVOKE' || e.type === 'REVOKE';
    if (filter === 'ADVANCES') return e.action === 'STAGE_ADVANCE' || e.action === 'MATERIAL_ADVANCE' || e.type === 'ADVANCE';
    if (filter === 'CODES') return e.action === 'PMCODE_UPDATE' || e.action === 'FGCODE_UPDATE';
    if (filter === 'PO') return e.action === 'PO_UPDATE';
    if (filter === 'SPECS') return e.action === 'SPECS_UPDATE' || e.action === 'SPEC_SIGNOFF';
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal activity-stream-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '500px',
          maxWidth: '94vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card-bg, #0B2529)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden'
        }}
      >
        {/* MODAL HEADER */}
        <div
          className="modal-head"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-sidebar, #06171A)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={16} style={{ color: 'var(--teal)' }} />
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
              Live Activity Stream
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  background: 'rgba(0, 200, 215, 0.2)',
                  color: 'var(--teal)',
                  border: '1px solid rgba(0, 200, 215, 0.4)',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleMarkSeen}
                style={{ fontSize: '11px', padding: '3px 9px', color: 'var(--text-secondary)' }}
              >
                Mark read
              </button>
            )}
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1,
                borderRadius: '4px'
              }}
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* FILTER BAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'rgba(0,0,0,0.2)',
            borderBottom: '1px solid var(--border-light)',
            overflowX: 'auto'
          }}
        >
          {[
            { id: 'ALL', label: 'All' },
            { id: 'REVOKES', label: 'Revokes' },
            { id: 'ADVANCES', label: 'Advances' },
            { id: 'CODES', label: 'PM/FG Codes' },
            { id: 'PO', label: 'Purchase Orders' },
            { id: 'SPECS', label: 'Specs' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              style={{
                fontSize: '10px',
                fontWeight: filter === tab.id ? 700 : 500,
                padding: '3px 9px',
                borderRadius: '9999px',
                background: filter === tab.id ? 'var(--teal)' : 'rgba(255,255,255,0.05)',
                color: filter === tab.id ? '#04171A' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* LOGS LIST */}
        <div
          className="modal-body activity-stream-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {!filteredLogs.length ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>
              No activity matching this filter.
            </div>
          ) : (
            filteredLogs.slice(0, 50).map(e => {
              const isUnread = e.timestamp > (seenAt || 0);
              const isRevoke = e.action === 'STAGE_REVOKE' || e.action === 'MATERIAL_REVOKE' || e.type === 'REVOKE';
              const isAdvance = e.action === 'STAGE_ADVANCE' || e.action === 'MATERIAL_ADVANCE' || e.type === 'ADVANCE';
              const isPO = e.action === 'PO_UPDATE';
              const isSpecs = e.action === 'SPECS_UPDATE' || e.action === 'SPEC_SIGNOFF';
              const isPM = e.action === 'PMCODE_UPDATE';
              const isFG = e.action === 'FGCODE_UPDATE';

              let badgeColor = '#4F8CFF';
              let badgeText = e.action || 'ACTIVITY';
              let ActionIcon = FileText;

              if (isRevoke) {
                badgeColor = 'var(--danger, #F05D6C)';
                badgeText = 'MATERIAL REVOKE';
                ActionIcon = RotateCcw;
              } else if (isAdvance) {
                badgeColor = 'var(--success, #38C98A)';
                badgeText = 'MATERIAL ADVANCE';
                ActionIcon = Play;
              } else if (isPM) {
                badgeColor = 'var(--teal, #00C8D7)';
                badgeText = 'PMCODE';
                ActionIcon = Tag;
              } else if (isFG) {
                badgeColor = 'var(--teal, #00C8D7)';
                badgeText = 'FGCODE';
                ActionIcon = Tag;
              } else if (isPO) {
                badgeColor = '#4F8CFF';
                badgeText = 'PO UPDATE';
                ActionIcon = ShoppingCart;
              } else if (isSpecs) {
                badgeColor = '#A855F7';
                badgeText = e.action === 'SPEC_SIGNOFF' ? 'SPEC SIGNED' : 'SPECS UPDATE';
                ActionIcon = CheckCircle2;
              }

              const timeFormatted = e.timestamp
                ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '';

              return (
                <div
                  key={e.id || e.timestamp}
                  style={{
                    background: isUnread ? 'rgba(0, 200, 215, 0.04)' : 'var(--surface-secondary, #0D2D32)',
                    border: `1px solid ${isUnread ? 'rgba(0, 200, 215, 0.25)' : 'var(--border-color, rgba(255,255,255,0.06))'}`,
                    borderLeft: `3px solid ${badgeColor}`,
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* TOP ROW: TITLE & BADGE */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <ActionIcon size={13} style={{ color: badgeColor, flexShrink: 0 }} />
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {e.title || 'Project Activity'}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '8.5px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: `${badgeColor}18`,
                        color: badgeColor,
                        border: `1px solid ${badgeColor}35`,
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {badgeText}
                    </span>
                  </div>

                  {/* PROJECT CONTEXT */}
                  {e.projectName && (
                    <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--teal)', lineHeight: 1.3 }}>
                      {e.projectName} {e.fgCode ? `(${e.fgCode})` : ''}
                    </div>
                  )}

                  {/* DETAILS BOX */}
                  {e.details && (
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'var(--text-secondary)',
                        background: 'rgba(0,0,0,0.25)',
                        padding: '5px 8px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.04)',
                        marginTop: '2px',
                        lineHeight: 1.35
                      }}
                    >
                      {e.details}
                    </div>
                  )}

                  {/* FOOTER ROW: USER & TIME */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '4px',
                      fontSize: '9.5px',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={10} style={{ opacity: 0.7 }} />
                      <span>{e.user || e.userName || 'System'}</span>
                      {e.userRole && (
                        <span style={{ opacity: 0.6 }}>({e.userRole})</span>
                      )}
                    </div>
                    {timeFormatted && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} style={{ opacity: 0.7 }} />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{timeFormatted}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
