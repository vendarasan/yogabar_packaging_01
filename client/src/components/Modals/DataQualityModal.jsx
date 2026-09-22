import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { getDataQualityAudit } from '../../api';

export default function DataQualityModal({ isOpen, onClose, onNavigateProject }) {
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL'); // 'ALL' | 'Critical' | 'Warning' | 'Notice'
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAudit();
    }
  }, [isOpen]);

  const loadAudit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDataQualityAudit();
      setAudit(res.data?.audit || null);
    } catch (err) {
      console.error('Failed to run data quality audit:', err);
      setError('Failed to fetch data quality audit.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const anomalies = audit?.anomalies || [];
  const filteredAnomalies = filterSeverity === 'ALL'
    ? anomalies
    : anomalies.filter(a => a.severity === filterSeverity);

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        className="modal-content"
        style={{
          width: '880px',
          maxWidth: '95vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card-bg, #0B2529)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
          borderRadius: '14px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(0, 200, 215, 0.15)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            background: 'var(--bg-sidebar, #06171A)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(242, 184, 75, 0.14)',
                border: '1px solid rgba(242, 184, 75, 0.3)',
                color: 'var(--warning, #f2b84b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ShieldCheck size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-main, #F2F7F7)', letterSpacing: '0.01em' }}>
                  Data Quality &amp; Anomaly Monitor
                </h3>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: 'rgba(242, 184, 75, 0.15)',
                    color: 'var(--warning, #f2b84b)',
                    border: '1px solid rgba(242, 184, 75, 0.3)'
                  }}
                >
                  Governance
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-muted, #8ea6a9)' }}>
                Non-destructive integrity audit across projects, specifications, PM codes, and launch gates
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={loadAudit}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Audit</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              style={{ padding: '6px', color: 'var(--text-muted)' }}
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Score & Summary Banner */}
        {audit && (
          <div
            style={{
              padding: '14px 22px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              gap: '14px'
            }}
          >
            {/* Score Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--surface-secondary, #F4F8F6)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--teal, #00d4c8)', fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
                {audit.score}
              </div>
              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: '700', color: 'var(--text-muted, #8ea6a9)', letterSpacing: '0.04em' }}>
                  Platform Health
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '700',
                    marginTop: '2px',
                    color: audit.rating === 'EXCELLENT' ? 'var(--success, #38c98a)' : audit.rating === 'GOOD' ? 'var(--teal, #00d4c8)' : audit.rating === 'NEEDS_ATTENTION' ? 'var(--warning, #f2b84b)' : 'var(--danger, #f05d6c)'
                  }}
                >
                  {audit.rating}
                </div>
              </div>
            </div>

            {/* Severity Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setFilterSeverity('Critical')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: filterSeverity === 'Critical' ? 'rgba(240, 93, 108, 0.12)' : 'var(--card-bg, #ffffff)',
                  border: filterSeverity === 'Critical' ? '1px solid var(--danger, #f05d6c)' : '1px solid var(--border-color)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '9.5px', textTransform: 'uppercase', fontWeight: '700', color: 'var(--danger, #f05d6c)' }}>Critical</span>
                  <AlertCircle size={13} color="var(--danger, #f05d6c)" />
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginTop: '3px' }}>
                  {audit.breakdown?.critical || 0}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFilterSeverity('Warning')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: filterSeverity === 'Warning' ? 'rgba(242, 184, 75, 0.12)' : 'var(--card-bg, #ffffff)',
                  border: filterSeverity === 'Warning' ? '1px solid var(--warning, #f2b84b)' : '1px solid var(--border-color)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '9.5px', textTransform: 'uppercase', fontWeight: '700', color: 'var(--warning, #f2b84b)' }}>Warnings</span>
                  <AlertTriangle size={13} color="var(--warning, #f2b84b)" />
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginTop: '3px' }}>
                  {audit.breakdown?.warning || 0}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFilterSeverity('Notice')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: filterSeverity === 'Notice' ? 'var(--brand-mint-light, #EAF2EE)' : 'var(--card-bg, #ffffff)',
                  border: filterSeverity === 'Notice' ? '1px solid var(--primary, #008767)' : '1px solid var(--border-color)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '9.5px', textTransform: 'uppercase', fontWeight: '700', color: 'var(--primary, #008767)' }}>Notices</span>
                  <Info size={13} color="var(--primary, #008767)" />
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginTop: '3px' }}>
                  {audit.breakdown?.notice || 0}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div
          style={{
            padding: '8px 22px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--surface-secondary, #F4F8F6)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px'
          }}
        >
          <span style={{ color: 'var(--text-muted, #8ea6a9)', fontWeight: '600' }}>Filter View:</span>
          {['ALL', 'Critical', 'Warning', 'Notice'].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterSeverity(s)}
              style={{
                padding: '3px 10px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: filterSeverity === s ? '700' : '500',
                background: filterSeverity === s ? 'var(--teal, #00d4c8)' : 'transparent',
                color: filterSeverity === s ? '#071A1D' : 'var(--text-secondary, #cbd5e1)',
                transition: 'all 0.15s ease'
              }}
            >
              {s === 'ALL' ? `All Anomalies (${anomalies.length})` : s}
            </button>
          ))}
        </div>

        {/* Body List */}
        <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(240, 93, 108, 0.12)', border: '1px solid rgba(240, 93, 108, 0.3)', color: 'var(--danger)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} /> <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '10px', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--teal)' }} />
              <span style={{ fontSize: '12px' }}>Auditing platform integrity...</span>
            </div>
          ) : filteredAnomalies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(56, 201, 138, 0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle2 size={22} />
              </div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 4px 0' }}>Zero Anomalies Detected</p>
              <p style={{ fontSize: '11px', margin: 0 }}>All project records conform to enterprise packaging relationship and timeline rules.</p>
            </div>
          ) : (
            filteredAnomalies.map(a => {
              const isCrit = a.severity === 'Critical';
              const isWarn = a.severity === 'Warning';
              const sevColor = isCrit ? 'var(--danger, #f05d6c)' : isWarn ? 'var(--warning, #f2b84b)' : 'var(--teal, #00d4c8)';
              const sevBg = isCrit ? 'rgba(240, 93, 108, 0.12)' : isWarn ? 'rgba(242, 184, 75, 0.12)' : 'rgba(0, 200, 215, 0.12)';
              const sevBorder = isCrit ? 'rgba(240, 93, 108, 0.28)' : isWarn ? 'rgba(242, 184, 75, 0.28)' : 'rgba(0, 200, 215, 0.28)';

              return (
                <div
                  key={a.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '14px',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: sevBg,
                          color: sevColor,
                          border: `1px solid ${sevBorder}`,
                          textTransform: 'uppercase'
                        }}
                      >
                        {a.severity}
                      </span>
                      <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)' }}>
                        {a.rule}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', margin: '2px 0 4px 0' }}>
                      {a.projectName} {a.materialName ? `• ${a.materialName}` : ''}
                    </div>

                    <p style={{ fontSize: '11.5px', color: 'var(--text-secondary, #cbd5e1)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                      {a.message}
                    </p>

                    <div style={{ fontSize: '11px', color: 'var(--teal, #00d4c8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={12} />
                      <span><strong>Recommendation:</strong> {a.suggestion}</span>
                    </div>
                  </div>

                  {a.projectId && onNavigateProject && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateProject(a.projectId);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
                    >
                      <span>Open Project</span>
                      <ExternalLink size={11} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 22px',
            borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            background: 'var(--bg-sidebar, #06171A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted, #8ea6a9)'
          }}
        >
          <span>Non-destructive validation • Zero automatic modifications</span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '11px', padding: '5px 16px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
