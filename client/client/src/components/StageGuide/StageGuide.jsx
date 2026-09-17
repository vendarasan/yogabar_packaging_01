import React, { useState } from 'react';
import { STAGE_DEFS } from '../../constants';

export default function StageGuide() {
  const [activeStageId, setActiveStageId] = useState(STAGE_DEFS[0]?.id);
  const activeStage = STAGE_DEFS.find(s => s.id === activeStageId) || STAGE_DEFS[0];

  return (
    <div id="stages" className="panel active">
      {/* Header removed as it is now redundant with Top menu bar */}
      
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* SIDEBAR MENU */}
        <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {STAGE_DEFS.map(s => {
            const isActive = s.id === activeStageId;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStageId(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '12px', border: '1px solid',
                  borderColor: isActive ? s.color : 'var(--border-color)',
                  background: isActive ? `${s.color}15` : 'var(--card-bg)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  boxShadow: isActive ? `0 2px 8px ${s.color}20` : 'none',
                  outline: 'none'
                }}
              >
                <div style={{ 
                  background: isActive ? s.color : 'var(--border-color)', 
                  color: isActive ? '#fff' : 'var(--text-faint)',
                  width: '32px', height: '32px', borderRadius: '8px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '900', fontSize: '13px', flexShrink: 0
                }}>
                  {s.num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {s.full}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* MAIN CONTENT (SELECTED STAGE) */}
        <div style={{ flex: 1 }}>
          <div className="md-card" style={{ '--cc': activeStage.color, '--gf': activeStage.color, '--gt': activeStage.color, cursor: 'default' }}>
            <div className="md-card-bar" />
            <div className="md-card-top">
              <div className="md-card-icon-ring" style={{ background: activeStage.color + '15', border: `1px solid ${activeStage.color}30`, color: activeStage.color, fontWeight: '900' }}>
                {activeStage.num}
              </div>
              <div className="md-card-tags">
                <span className="md-card-cat" style={{ color: activeStage.color }}>Lead: {activeStage.lead}</span>
              </div>
            </div>
            <div className="md-card-name" style={{ marginTop: '8px', fontSize: '22px' }}>{activeStage.full}</div>
            <div className="md-card-desc" style={{ fontSize: '14px', marginTop: '8px', lineHeight: '1.6' }}>{activeStage.desc}</div>
            
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div className="smeta-label" style={{ fontSize: '12px' }}>Owner: <strong style={{ color: 'var(--text-main)', fontSize: '14px' }}>{activeStage.owner}</strong></div>
              <div className="smeta-label" style={{ marginTop: '20px', fontSize: '12px' }}>Mandatory Quality Gate Checklist:</div>
              <ul className="checklist" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeStage.checks.map((c, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: activeStage.color, fontWeight: '900', fontSize: '14px', marginTop: '2px' }}>✓</span> 
                    <span style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.5' }}>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
