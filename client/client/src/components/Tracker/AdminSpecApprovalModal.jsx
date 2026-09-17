import React, { useState } from 'react';

export default function AdminSpecApprovalModal({
  isOpen,
  project,
  material,
  mIdx,
  currentUser,
  onClose,
  onSignoffAndAdvance,
  onAdminOverrideAdvance,
  onOpenSpecSignoff
}) {
  if (!isOpen || !project) return null;

  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
  const matName = material ? material.name : 'Material Component';

  const handleSignoffAndAdvance = async () => {
    setLoading(true);
    try {
      if (onSignoffAndAdvance) {
        await onSignoffAndAdvance(mIdx);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async () => {
    setLoading(true);
    try {
      if (onAdminOverrideAdvance) {
        await onAdminOverrideAdvance(mIdx, adminNotes.trim());
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay open" style={{ zIndex: 1150 }}>
      <div
        className="modal modal-md"
        style={{
          width: '100%',
          maxWidth: 'min(520px, 95vw)',
          boxSizing: 'border-box',
          border: `1px solid ${isAdmin ? 'rgba(124, 58, 237, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`
        }}
      >
        {/* Head */}
        <div className="modal-head" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>{isAdmin ? '🛡️' : '🔒'}</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
                {isAdmin ? 'Admin Approval Required: Spec Sign-Off' : 'Action Gated: Spec Sign-Off Required'}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--teal)', marginTop: '2px' }}>
                {project.projectName} · {matName}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Warning Banner */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '20px', lineHeight: 1 }}>⚠️</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', marginBottom: '3px' }}>
                  Technical Specifications Not Signed Off
                </div>
                <div style={{ fontSize: '11px', color: '#e2e8f0', lineHeight: 1.4 }}>
                  The technical specifications for <strong style={{ color: 'var(--teal)' }}>{matName}</strong> have not been confirmed and signed off yet.
                </div>
              </div>
            </div>
          </div>

          {isAdmin ? (
            /* Admin View: Options to resolve */
            <div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                As an <strong>Admin ({currentUser?.name})</strong>, please select how you would like to proceed with this action:
              </div>

              {/* Option 1: Signoff & Advance */}
              <div style={{
                background: 'rgba(0, 212, 200, 0.06)',
                border: '1px solid rgba(0, 212, 200, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--teal)', marginBottom: '4px' }}>
                  Option A: Confirm Spec Sign-Off &amp; Advance
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Signs off the technical specifications immediately on behalf of the Admin and advances the stage.
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSignoffAndAdvance}
                  disabled={loading}
                  style={{ width: '100%', fontSize: '11px', padding: '6px 12px' }}
                >
                  {loading ? 'Processing...' : '✍️ Sign-Off Specs & Advance'}
                </button>
              </div>

              {/* Option 2: Admin Override */}
              <div style={{
                background: 'rgba(124, 58, 237, 0.06)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#c084fc', marginBottom: '4px' }}>
                  Option B: Grant Admin Override &amp; Advance
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Advances without spec sign-off. This action will be permanently logged in the audit trail as an <strong>Admin Spec Override</strong>.
                </div>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: '11.5px', padding: '7px 10px', marginBottom: '10px' }}
                  placeholder="Reason for Admin Override (e.g. Expedited fast-track approved by PM)"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={handleOverride}
                  disabled={loading}
                  style={{
                    width: '100%',
                    fontSize: '11px',
                    padding: '6px 12px',
                    background: 'rgba(124, 58, 237, 0.25)',
                    color: '#c084fc',
                    border: '1px solid rgba(124, 58, 237, 0.5)'
                  }}
                >
                  {loading ? 'Processing...' : '🛡️ Grant Admin Approval & Advance'}
                </button>
              </div>
            </div>
          ) : (
            /* Updater View: Gated notification */
            <div>
              <div style={{ fontSize: '11.5px', color: '#e2e8f0', lineHeight: 1.5, marginBottom: '14px' }}>
                Under standard packaging stage-gate governance, <strong>once the spec is confirmed only then can this action be advanced</strong>.
                <br /><br />
                Because the technical specifications are currently unsigned, this action requires <strong>Admin approval</strong> (from Project Manager <strong>Balaji Sathishkumar</strong> or Packaging Head <strong>Alexsander</strong>).
              </div>

              <div style={{
                background: 'rgba(0, 212, 200, 0.06)',
                border: '1px solid rgba(0, 212, 200, 0.25)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '10px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--teal)', marginBottom: '4px' }}>
                  Want to confirm the specifications now?
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  If you have verified the dimensions, dieline, and GSM parameters, you can sign off the specifications now.
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onClose();
                    if (onOpenSpecSignoff) onOpenSpecSignoff(mIdx);
                  }}
                  style={{ width: '100%', fontSize: '11px' }}
                >
                  ✍️ Review &amp; Sign-Off Specs Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Foot */}
        <div className="modal-foot" style={{ borderTop: '1px solid var(--border)' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
