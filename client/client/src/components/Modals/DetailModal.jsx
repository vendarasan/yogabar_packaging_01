import React from 'react';
import { STAGE_COLORS, fmt, getProjectStage, getProjectProgress, getSlippage } from '../../utils';
import { getSpecFields } from '../../constants';

export default function DetailModal({ isOpen, project, onClose }) {
  if (!isOpen || !project) return null;

  const stage = getProjectStage(project);
  const pct = getProjectProgress(project);
  const slippage = getSlippage(project);
  const mats = project.materials || [];

  return (
    <div className="modal-overlay open">
      <div className="modal modal-md">
        <div className="modal-head">
          <div className="modal-title">📋 Project Details — {project.projectName}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* HEADER SUMMARY */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px', padding: '12px', background: 'var(--navy-light)', borderRadius: '9px', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>FG Code</div>
              <div style={{ fontFamily: 'var(--mono)', color: 'var(--teal)', fontWeight: '700', fontSize: '11px' }}>{project.fgCode || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Current Stage</div>
              <span className="stage-badge" style={{ background: `${STAGE_COLORS[stage]}18`, border: `1px solid ${STAGE_COLORS[stage]}40`, color: STAGE_COLORS[stage] }}>
                <span className="stage-dot" style={{ background: STAGE_COLORS[stage] }}></span>{stage}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Status</div>
              <div style={{ fontWeight: '700', fontSize: '11px' }}>{project.status}</div>
            </div>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Grammage</div>
              <div style={{ color: 'var(--cyan)', fontWeight: '700', fontSize: '11px' }}>{project.grammage || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Est. Ready</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>{fmt(project.milestones?.Connectivity)}</div>
            </div>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Target Launch</div>
              <div style={{ fontFamily: 'var(--mono)', color: 'var(--cyan)', fontSize: '11px' }}>{fmt(project.targetLaunchDate)}</div>
            </div>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Actual Launch</div>
              <div style={{ fontFamily: 'var(--mono)', color: project.launchDate ? 'var(--green)' : 'var(--white-dim)', fontWeight: '700', fontSize: '11px' }}>{fmt(project.launchDate)}</div>
            </div>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Slippage</div>
              <div>{slippage > 0 ? <span className="slippage-badge">+{slippage}d</span> : <span style={{ color: 'var(--green)', fontWeight: '700', fontSize: '11px' }}>✓ On Time</span>}</div>
            </div>
          </div>

          {/* MATERIALS AND SPECS */}
          <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--teal)', marginBottom: '8px' }}>
            🧱 Materials &amp; Technical Specifications ({mats.length})
          </div>

          {mats.map((m, idx) => {
            const mStage = m.stage || 'Brief';
            const specs = m.specs || {};
            const sf = getSpecFields(m.type);
            const filledSpecs = sf.filter(f => specs[f.k]);

            return (
              <div key={idx} style={{ marginBottom: '12px', padding: '12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '9px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '12px' }}>{idx + 1}. {m.name}</strong>
                    <span style={{ fontSize: '10px', color: 'var(--white-dim)', marginLeft: '8px' }}>({m.type} · {m.printType || 'N/A'})</span>
                  </div>
                  <span className="stage-badge" style={{ background: `${STAGE_COLORS[mStage]}18`, border: `1px solid ${STAGE_COLORS[mStage]}40`, color: STAGE_COLORS[mStage] }}>
                    <span className="stage-dot" style={{ background: STAGE_COLORS[mStage] }}></span>{mStage}
                  </span>
                </div>

                {filledSpecs.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {filledSpecs.map(f => (
                      <div key={f.k} className="spec-chip">
                        <div className="spec-chip-label">{f.l}</div>
                        <div className="spec-chip-value">{specs[f.k]}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '10.5px', color: 'var(--white-dim)', opacity: '0.6' }}>No technical specs added.</div>
                )}
              </div>
            );
          })}

          {project.comments && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--white-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Comments / Notes</div>
              <div style={{ fontSize: '11px', background: 'var(--navy-light)', border: '1px solid var(--border)', borderRadius: '7px', padding: '10px', lineHeight: '1.4' }}>
                {project.comments}
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
