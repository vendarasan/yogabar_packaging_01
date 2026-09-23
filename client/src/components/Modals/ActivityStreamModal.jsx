import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  RotateCcw,
  Play,
  Tag,
  ShoppingCart,
  Settings,
  FileText,
  CheckCircle2,
  User,
  Clock,
  CheckCheck
} from 'lucide-react';
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
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal activity-stream-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          maxWidth: '94vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card-bg, #FFFFFF)',
          border: '1px solid var(--border-color, #E2EBE6)',
          borderRadius: '14px',
          boxShadow: '0 20px 50px -10px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}
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
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(0, 135, 103, 0.12)',
                color: 'var(--teal, #008767)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Bell size={17} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #102B36)' }}>
                  Live Activity Stream
                </span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      background: '#E8F5E9',
                      color: 'var(--teal, #008767)',
                      border: '1px solid #A7F3D0',
                      padding: '1px 7px',
                      borderRadius: '10px'
                    }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted, #829A9E)' }}>
                Real-time governance audit trail across all packaging projects
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleMarkSeen}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  color: 'var(--teal, #008767)',
                  background: 'rgba(0, 135, 103, 0.08)',
                  borderRadius: '6px',
                  border: '1px solid rgba(0, 135, 103, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <CheckCheck size={13} />
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
                color: 'var(--text-muted, #829A9E)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
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

        {/* FILTER BAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 18px',
            background: 'var(--surface-secondary, #F3F8F5)',
            borderBottom: '1px solid var(--border-color, #E2EBE6)',
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
          ].map(tab => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 500,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: isActive ? 'var(--teal, #008767)' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary, #526B74)',
                  border: `1px solid ${isActive ? 'var(--teal, #008767)' : 'var(--border-color, #E2EBE6)'}`,
                  boxShadow: isActive ? '0 1px 3px rgba(0, 135, 103, 0.25)' : 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* LOGS LIST */}
        <div
          className="modal-body activity-stream-body"
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
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted, #829A9E)', fontSize: '13px' }}>
              No activity records match this filter.
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
      </div>
    </div>
  );
}
