import React, { useState } from 'react';
import { getSpecFields } from '../../constants';
import { updateSpecSignoff } from '../../api';

export default function SpecSignoffModal({
  isOpen,
  project,
  mIdx,
  currentUser,
  onClose,
  onSuccess,
  showToast
}) {
  if (!isOpen || !project || mIdx === null || mIdx === undefined || !project.materials || !project.materials[mIdx]) {
    return null;
  }

  const material = project.materials[mIdx];
  const specSignoff = material.specSignoff;
  const isSigned = !!(specSignoff && specSignoff.signed);
  const specFields = getSpecFields(material.type);
  const specs = material.specs || {};

  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
  const canRevoke = isAdmin || (currentUser && currentUser.name === specSignoff?.signedBy);

  const handleConfirmSignoff = async () => {
    if (!confirmedCheck && !isSigned) {
      setError('Please check the confirmation box before signing off.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await updateSpecSignoff(project.id, mIdx, true, notes);
      const updatedProj = res.data?.project || res.project;
      if (showToast) showToast(`✅ Spec Sign-off confirmed for ${material.name}!`, 'success');
      if (onSuccess) onSuccess(updatedProj);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to confirm Spec Sign-off');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSignoff = async () => {
    if (!window.confirm(`Are you sure you want to revoke the Spec Sign-off for "${material.name}"? This will require re-confirmation before advancing.`)) {
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await updateSpecSignoff(project.id, mIdx, false);
      const updatedProj = res.data?.project || res.project;
      if (showToast) showToast(`Spec Sign-off revoked for ${material.name}`, 'info');
      if (onSuccess) onSuccess(updatedProj);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to revoke Spec Sign-off');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay open" style={{ zIndex: 1100 }}>
      <div
        className="modal modal-md"
        style={{
          width: '100%',
          maxWidth: 'min(620px, 95vw)',
          boxSizing: 'border-box',
          border: '1px solid rgba(0, 212, 200, 0.35)'
        }}
      >
        {/* Header */}
        <div className="modal-head" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>✍️</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
                Technical Specifications Sign-Off
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--teal)', fontWeight: 600, marginTop: '2px' }}>
                {project.projectName} · {material.name} ({material.type})
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#f87171',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              marginBottom: '12px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Current Status Card */}
          <div style={{
            background: isSigned ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${isSigned ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{isSigned ? '✅' : '⏳'}</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: isSigned ? '#34d399' : '#fbbf24' }}>
                    {isSigned ? 'Specifications Confirmed & Signed Off' : 'Pending Technical Spec Sign-Off'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {isSigned 
                      ? `Signed by ${specSignoff.signedBy} (${specSignoff.signedRole || 'Team'}) on ${new Date(specSignoff.signedAt).toLocaleString()}`
                      : 'Action advancement and Purchase Order release require confirmation'}
                  </div>
                </div>
              </div>
              {isSigned && canRevoke && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleRevokeSignoff}
                  disabled={loading}
                  style={{ fontSize: '10px', color: '#f87171', padding: '3px 8px', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  ↩ Revoke Sign-Off
                </button>
              )}
            </div>
            {isSigned && specSignoff.notes && (
              <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '10.5px', color: '#cbd5e1' }}>
                <strong>Sign-off Notes:</strong> {specSignoff.notes}
              </div>
            )}
          </div>

          {/* Component Summary Card */}
          <div style={{
            background: 'var(--navy-light)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '14px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '8px',
            fontSize: '11px'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '9.5px' }}>Material Type</span>
              <strong style={{ color: 'var(--teal)' }}>{material.type}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '9.5px' }}>Print Process</span>
              <strong style={{ color: '#e2e8f0' }}>{material.printType || 'N/A'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '9.5px' }}>PM Code</span>
              <strong style={{ color: '#cbd5e1', fontFamily: 'var(--mono)' }}>{material.pmCode || 'Unassigned'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '9.5px' }}>Supplier</span>
              <strong style={{ color: '#cbd5e1' }}>{material.supplier || 'TBD'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '9.5px' }}>Current PO Status</span>
              <strong style={{ color: '#38bdf8' }}>{material.poStatus || 'RFQ in progress'}</strong>
            </div>
          </div>

          {/* Technical Specifications Parameters */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span>📐 Technical Parameters on Record</span>
              {material.specSheet?.parameters?.length > 0 ? (
                <span style={{ fontSize: '9.5px', color: '#14b8a6', fontWeight: 600 }}>
                  ({material.specSheet.parameters.filter(p => p.standard).length}/{material.specSheet.parameters.length} Yoga Bar parameters specified)
                </span>
              ) : (
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                  ({specFields.filter(f => specs[f.k]).length}/{specFields.length} specified)
                </span>
              )}
            </div>

            {material.specSheet?.docHeader?.clubbedCodes && (
              <div style={{ padding: '4px 8px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '4px', fontSize: '10.5px', marginBottom: '8px' }}>
                <strong style={{ color: '#38bdf8' }}>Clubbed Codes:</strong> <span style={{ fontFamily: 'var(--mono)', color: '#e0f2fe' }}>{material.specSheet.docHeader.clubbedCodes}</span>
              </div>
            )}

            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              maxWidth: '100%'
            }}>
              {material.specSheet?.parameters?.length > 0 ? (
                <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, width: '30%' }}>Parameter</th>
                      <th style={{ padding: '6px 6px', color: 'var(--text-muted)', fontWeight: 600, width: '50px', textAlign: 'center' }}>Units</th>
                      <th style={{ padding: '6px 8px', color: '#38bdf8', fontWeight: 700 }}>Standard / Specification</th>
                      <th style={{ padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, width: '80px', textAlign: 'center' }}>Test Method</th>
                      <th style={{ padding: '6px 6px', color: 'var(--text-muted)', fontWeight: 600, width: '55px', textAlign: 'center' }}>Defect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {material.specSheet.parameters.map((p, i) => (
                      <tr key={i} style={{ borderBottom: i !== material.specSheet.parameters.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <td style={{ padding: '5px 8px', color: '#cbd5e1', fontWeight: 500 }}>{p.parameter}</td>
                        <td style={{ padding: '5px 6px', color: '#94a3b8', textAlign: 'center' }}>{p.units || '-'}</td>
                        <td style={{ padding: '5px 8px', color: p.standard ? '#38bdf8' : 'var(--text-muted)', fontFamily: p.standard ? 'var(--mono)' : 'inherit', fontWeight: p.standard ? 600 : 'normal' }}>
                          {p.standard || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Not specified</span>}
                        </td>
                        <td style={{ padding: '5px 8px', color: '#94a3b8', textAlign: 'center' }}>{p.testStandard || 'NA'}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                          <span style={{
                            padding: '1px 4px',
                            borderRadius: '3px',
                            fontSize: '9px',
                            fontWeight: 700,
                            background: p.defectType === 'CR' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: p.defectType === 'CR' ? '#f87171' : '#fbbf24'
                          }}>
                            {p.defectType || 'CR'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table style={{ width: '100%', minWidth: '280px', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 600, width: '40%' }}>Parameter</th>
                      <th style={{ padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specFields.map((f, i) => {
                      const val = specs[f.k];
                      return (
                        <tr key={f.k} style={{ borderBottom: i !== specFields.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <td style={{ padding: '5px 10px', color: '#cbd5e1', fontWeight: 500 }}>{f.l}</td>
                          <td style={{ padding: '5px 10px', color: val ? 'var(--teal)' : 'var(--text-muted)', fontFamily: val ? 'var(--mono)' : 'inherit' }}>
                            {val || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Not specified</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Sign-off Form if not yet signed */}
          {!isSigned && (
            <div style={{
              background: 'rgba(0, 212, 200, 0.05)',
              border: '1px solid rgba(0, 212, 200, 0.2)',
              borderRadius: '8px',
              padding: '12px'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  checked={confirmedCheck}
                  onChange={e => setConfirmedCheck(e.target.checked)}
                  style={{ marginTop: '2px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '11px', color: '#e2e8f0', lineHeight: 1.4 }}>
                  <strong>I confirm the technical specifications for this packaging component:</strong> Dimensions, substrate construction, dieline constraints, and tolerances have been reviewed and approved for commercial procurement.
                </span>
              </label>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Sign-off Notes / Reference (Optional):
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: '11.5px', padding: '7px 10px' }}
                  placeholder="e.g. Approved per drawing rev 2.1; GSM validated with converter"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                Sign-off will be recorded under: <strong style={{ color: 'var(--teal)' }}>{currentUser?.name || 'Authorized Member'}</strong> ({currentUser?.role || 'updater'})
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-foot" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Close
          </button>
          {!isSigned && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmSignoff}
              disabled={loading || !confirmedCheck}
              style={{
                background: confirmedCheck ? 'linear-gradient(135deg, #00bfa5 0%, #00d4c8 100%)' : undefined,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {loading ? 'Confirming...' : '✅ Confirm Spec Sign-off'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
