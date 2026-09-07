import React, { useState } from 'react';
import { STAGE_COLORS, PRINT_LBL, fmt, daysFromNow, printCls } from '../../utils';
import { getSpecFields } from '../../constants';

export default function MaterialTimeline({
  project,
  canEdit,
  isAdmin,
  onAdvanceMaterial,
  onRevokeMaterial,
  onOpenSpecModal
}) {
  const [openSpecs, setOpenSpecs] = useState({});

  const mats = project.materials || [];
  if (!mats.length) {
    return <div style={{ padding: '10px', color: 'var(--white-dim)', fontSize: '11px' }}>No materials defined.</div>;
  }

  const isLaunched = project.status === 'Launched';

  // Find max connectivity date for Critical Path
  let maxConnMat = mats[0];
  mats.forEach(m => {
    if (m.milestones?.Connectivity > (maxConnMat.milestones?.Connectivity || '')) {
      maxConnMat = m;
    }
  });

  const toggleSpec = (mIdx) => {
    setOpenSpecs(prev => ({ ...prev, [mIdx]: !prev[mIdx] }));
  };

  return (
    <div style={{ padding: 0 }}>
      <table className="mat-inner-table">
        <thead>
          <tr>
            <th style={{ width: '56px', textAlign: 'center' }}>📋 / #</th>
            <th>Material</th>
            <th>Print Type</th>
            <th>Stage</th>
            <th>Days Left</th>
            <th>Actions</th>
            <th>Brief</th>
            <th>Sample</th>
            <th>Trial</th>
            <th>KLD</th>
            <th>Artwork</th>
            <th>VPDF</th>
            <th>🖨 Printing</th>
            <th>Dispatch</th>
            <th>🔗 Connectivity</th>
          </tr>
        </thead>
        <tbody>
          {mats.map((m, idx) => {
            const isCrit = m.milestones?.Connectivity === maxConnMat.milestones?.Connectivity;
            const stage = m.stage || 'Brief';
            const atConn = stage === 'Connectivity';
            const atBrief = stage === 'Brief';
            const stageMs = m.milestones?.[stage];
            const dl = stageMs ? daysFromNow(stageMs) : null;
            const dlCls = dl === null ? '' : dl > 7 ? 'days-ok' : dl >= 3 ? 'days-ok' : dl >= 0 ? 'days-warn' : 'days-late';
            const dlTxt = dl === null ? '—' : dl > 0 ? `+${dl}d` : dl === 0 ? 'DUE' : `${dl}d 🔴`;

            const specs = m.specs || {};
            const sf = getSpecFields(m.type);
            const filledAll = sf.filter(f => specs[f.k]);
            const hasSpecs = filledAll.length > 0;
            const isSpecOpen = !!openSpecs[idx];

            return (
              <React.Fragment key={idx}>
                <tr className={isCrit ? 'critical-path' : ''}>
                  <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '6px 4px' }}>
                    <button
                      className="expand-btn"
                      onClick={() => toggleSpec(idx)}
                      title={hasSpecs ? 'Show specs' : 'Add specs'}
                      style={{ fontSize: '11px' }}
                    >
                      {isSpecOpen ? '📋▼' : hasSpecs ? '📋' : '○'}
                    </button>
                    {isCrit ? (
                      <div style={{ color: 'var(--teal)', fontSize: '8.5px', fontWeight: '800' }}>★ CPM</div>
                    ) : (
                      <div style={{ color: 'var(--white-dim)', fontSize: '10px', fontWeight: '700' }}>{idx + 1}</div>
                    )}
                  </td>
                  <td>
                    <strong style={{ fontSize: '11px' }}>{m.name}</strong>
                    <br />
                    <span style={{ fontSize: '9px', color: 'var(--white-dim)' }}>{m.type}</span>
                  </td>
                  <td>
                    <span className={printCls(m.printType || 'Not Applicable')}>{m.printType || 'N/A'}</span>
                    <br />
                    <span style={{ color: 'var(--white-dim)', fontSize: '8.5px' }}>{PRINT_LBL[m.printType || 'Not Applicable']}</span>
                  </td>
                  <td>
                    <span className="stage-badge" style={{ background: `${STAGE_COLORS[stage]}18`, border: `1px solid ${STAGE_COLORS[stage]}40`, color: STAGE_COLORS[stage] }}>
                      <span className="stage-dot" style={{ background: STAGE_COLORS[stage] }}></span>{stage}
                    </span>
                  </td>
                  <td>{dl !== null ? <span className={`days-pill ${dlCls}`}>{dlTxt}</span> : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {!isLaunched && canEdit && (
                      <>
                        {atConn ? (
                          <span style={{ color: 'var(--teal)', fontSize: '9.5px', fontWeight: '800' }}>✓ Ready</span>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => onAdvanceMaterial(project.id, idx)} style={{ fontSize: '9px', padding: '2px 7px' }}>
                            ▶ Next
                          </button>
                        )}
                        {isAdmin && !atBrief && (
                          <button className="btn btn-revoke btn-sm" onClick={() => onRevokeMaterial(project.id, idx)} title="Revoke (Admin)" style={{ fontSize: '9px', padding: '2px 6px', marginLeft: '3px' }}>
                            ↩
                          </button>
                        )}
                      </>
                    )}
                    <button className="spec-badge-btn" onClick={() => onOpenSpecModal(project.id, idx)} style={{ fontSize: '9px', marginLeft: '3px' }}>
                      ✎ Edit Specs
                    </button>
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>{fmt(m.milestones?.Brief)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>{fmt(m.milestones?.Sample)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>{fmt(m.milestones?.Trial)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>{fmt(m.milestones?.KLD)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>{fmt(m.milestones?.Artwork)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>{fmt(m.milestones?.VPDF)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: STAGE_COLORS.Printing }}>{fmt(m.milestones?.Printing)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>{fmt(m.milestones?.Dispatch)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: '700', color: isCrit ? 'var(--teal)' : 'var(--white)' }}>
                    {fmt(m.milestones?.Connectivity)}
                  </td>
                </tr>

                {/* INLINE SPEC SUB-ROW */}
                {isSpecOpen && (
                  <tr className="spec-sub-row">
                    <td colSpan="15">
                      <div className="spec-sub-inner">
                        <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          📋 {m.name} — {m.type} Specifications
                        </div>
                        {hasSpecs ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', alignItems: 'flex-start' }}>
                            {filledAll.map(f => (
                              <div key={f.k} className="spec-chip">
                                <div className="spec-chip-label">{f.l}</div>
                                <div className="spec-chip-value">{specs[f.k]}</div>
                              </div>
                            ))}
                            <button className="spec-badge-btn" onClick={() => onOpenSpecModal(project.id, idx)} style={{ alignSelf: 'center', marginLeft: '4px', fontSize: '9px' }}>
                              ✎ Edit
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontSize: '10.5px', color: 'var(--white-dim)' }}>No specifications added yet. </span>
                            <button className="spec-badge-btn" onClick={() => onOpenSpecModal(project.id, idx)} style={{ fontSize: '9px' }}>
                              + Add Specs
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <div style={{ padding: '6px 12px 8px', fontSize: '9.5px', color: 'var(--white-dim)' }}>
        ★ CPM = Critical Path Material · Click 📋 icon to expand specs inline · ✎ Edit Specs to add/modify · ▶ Next / ↩ Revoke per material
      </div>
    </div>
  );
}
