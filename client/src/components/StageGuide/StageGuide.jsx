import React from 'react';
import { STAGE_DEFS } from '../../constants';

export default function StageGuide() {
  return (
    <div id="stages" className="panel active">
      <div className="section-hdr">
        <div>
          <div className="section-title">🔍 Stage Guide &amp; Checklists</div>
          <div className="section-sub">Standard operating procedure for each stage of packaging development</div>
        </div>
      </div>
      <div className="stage-grid">
        {STAGE_DEFS.map(s => (
          <div key={s.id} className="stage-card">
            <div className="stage-card-header" style={{ borderLeft: `4px solid ${s.color}` }}>
              <div className="stage-num" style={{ background: s.color }}>{s.num}</div>
              <div>
                <div className="stage-name">{s.full}</div>
                <div style={{ fontSize: '10px', color: 'var(--white-dim)' }}>Lead: {s.lead}</div>
              </div>
            </div>
            <div className="stage-card-body">
              <div style={{ fontSize: '11px', color: 'var(--white-dim)', margin: '10px 0 12px', lineHeight: '1.4' }}>
                {s.desc}
              </div>
              <div className="smeta-label">Owner:</div>
              <div className="smeta-val" style={{ marginBottom: '10px' }}>{s.owner}</div>

              <div className="smeta-label">Mandatory Quality Gate Checklist:</div>
              <ul className="checklist">
                {s.checks.map((c, i) => (
                  <li key={i}>
                    <span style={{ color: s.color }}>✓</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
