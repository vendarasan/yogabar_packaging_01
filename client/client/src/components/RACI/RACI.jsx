import React from 'react';
import { FUNCTIONS, RACI_DATA } from '../../constants';

export default function RACI() {
  const stages = Object.keys(RACI_DATA);

  return (
    <div id="raci" className="panel active">
      <div className="table-wrapper">
        <div className="table-header">
          <div className="table-title">👥 RACI Matrix — Responsibility Assignment</div>
          <div style={{ fontSize: '11px', color: 'var(--white-dim)' }}>
            <strong style={{ color: 'var(--amber)' }}>A</strong> = Accountable ·{' '}
            <strong style={{ color: 'var(--red)' }}>R</strong> = Responsible ·{' '}
            <strong style={{ color: 'var(--cyan)' }}>C</strong> = Consulted ·{' '}
            <strong style={{ color: 'var(--white-dim)' }}>I</strong> = Informed
          </div>
        </div>
        <div className="modern-mat-table-wrap" style={{ margin: '16px' }}>
          <table className="modern-mat-table">
            <thead>
              <tr>
                <th className="left">Stage / Function</th>
                {FUNCTIONS.map(f => (
                  <th key={f} style={{ textAlign: 'center' }}>{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stages.map(st => (
                <tr key={st}>
                  <td className="stage-col" style={{ fontWeight: '700', color: 'var(--teal)' }}>{st}</td>
                  {RACI_DATA[st].map((v, idx) => {
                    const cls = v === 'A' ? 'raci-a' : v === 'R' ? 'raci-r' : v === 'C' ? 'raci-c' : 'raci-i';
                    return <td key={idx} className={cls} style={{ textAlign: 'center' }}>{v}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
