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
    const act = e.eventType || e.action || '';
    if (filter === 'ARTWORK') return act.startsWith('ARTWORK_');
    if (filter === 'SPECS') return act.startsWith('SPEC_') || act.startsWith('SPECS_') || act.startsWith('SPECIFICATION_');
    if (filter === 'ADVANCES') return act === 'STAGE_ADVANCE' || act === 'MATERIAL_ADVANCE' || act === 'STAGE_CHANGED' || e.type === 'ADVANCE';
    if (filter === 'REVOKES') return act === 'STAGE_REVOKE' || act === 'MATERIAL_REVOKE' || e.type === 'REVOKE';
    if (filter === 'CODES') return act === 'PMCODE_UPDATE' || act === 'FGCODE_UPDATE';
    if (filter === 'PO') return act === 'PO_UPDATE';
    return true;
  });

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 1000 }}>
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
            { id: 'ARTWORK', label: 'Artwork' },
            { id: 'SPECS', label: 'Specs' },
            { id: 'ADVANCES', label: 'Stages' },
            { id: 'REVOKES', label: 'Revokes' },
            { id: 'PO', label: 'Purchase Orders' },
            { id: 'CODES', label: 'PM/FG Codes' }
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
              const act = e.eventType || e.action || '';
              const isRevoke = act === 'STAGE_REVOKE' || act === 'MATERIAL_REVOKE' || e.type === 'REVOKE';
              const isAdvance = act === 'STAGE_ADVANCE' || act === 'MATERIAL_ADVANCE' || act === 'STAGE_CHANGED' || e.type === 'ADVANCE';
              const isPO = act === 'PO_UPDATE';
              const isSpecs = act.startsWith('SPEC_') || act.startsWith('SPECS_') || act.startsWith('SPECIFICATION_');
              const isArtwork = act.startsWith('ARTWORK_');
              const isPM = act === 'PMCODE_UPDATE';
              const isFG = act === 'FGCODE_UPDATE';

              let badgeColor = '#4F8CFF';
              let badgeText = act.replace(/_/g, ' ') || 'ACTIVITY';
              let ActionIcon = FileText;

              if (isRevoke) {
                badgeColor = 'var(--danger, #F05D6C)';
                badgeText = 'STAGE REVOKE';
                ActionIcon = RotateCcw;
              } else if (isAdvance) {
                badgeColor = 'var(--success, #38C98A)';
                badgeText = 'STAGE ADVANCE';
                ActionIcon = Play;
              } else if (isArtwork) {
                badgeColor = '#00C8D7';
                badgeText = act === 'ARTWORK_APPROVED' ? 'ARTWORK APPROVED' : (e.metadata?.versionTag ? `ARTWORK ${e.metadata.versionTag}` : 'ARTWORK');
                ActionIcon = FileText;
              } else if (isSpecs) {
                badgeColor = '#A855F7';
                badgeText = act === 'SPECIFICATION_APPROVED' || act === 'SPEC_APPROVED_HEAD' ? 'SPEC APPROVED' : 'SPEC SHEET';
                ActionIcon = CheckCircle2;
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
              }

              const timeFormatted = e.timestamp
                ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '';

              const userName = e.user?.name || (typeof e.user === 'string' ? e.user : (e.by || e.userName || 'System'));
              const userRole = e.user?.role || e.userRole || e.byRole || '';

              const oldVal = e.oldValue !== undefined ? e.oldValue : e.metadata?.oldValue;
              const newVal = e.newValue !== undefined ? e.newValue : e.metadata?.newValue;
              const hasBeforeAfter = (oldVal !== undefined && oldVal !== null) || (newVal !== undefined && newVal !== null);
              const reasonText = e.reason || e.metadata?.reason;

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

                  {/* PROJECT CONTEXT & STABLE ENTITY */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    {e.projectName && (
                      <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--teal)', lineHeight: 1.3 }}>
                        {e.projectName} {e.fgCode ? `(${e.fgCode})` : ''}
                      </div>
                    )}
                    {e.entityId && (
                      <span style={{ fontSize: '8.5px', fontFamily: 'monospace', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '1px 4px', borderRadius: '3px' }}>
                        {e.entityId}
                      </span>
                    )}
                  </div>

                  {/* BEFORE / AFTER TRANSITION */}
                  {hasBeforeAfter && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9.5px', background: 'rgba(0,0,0,0.3)', padding: '3px 8px', borderRadius: '4px', margin: '2px 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Previous:</span>
                      <span style={{ color: '#F05D6C', textDecoration: 'line-through' }}>{String(oldVal ?? '—')}</span>
                      <span style={{ color: 'var(--teal)' }}>➔</span>
                      <span style={{ color: '#38C98A', fontWeight: 600 }}>{String(newVal ?? '—')}</span>
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

                  {/* USER REASON */}
                  {reasonText && (
                    <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '3px' }}>
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
                      fontSize: '9.5px',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={10} style={{ opacity: 0.7 }} />
                      <span>{userName}</span>
                      {userRole && (
                        <span style={{ opacity: 0.6 }}>({userRole})</span>
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
