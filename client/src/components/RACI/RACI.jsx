import React from 'react';
import { Users } from 'lucide-react';
import { FUNCTIONS, RACI_DATA } from '../../constants';

export default function RACI() {
  const stages = Object.keys(RACI_DATA);

  return (
    <div id="raci" className="panel active">
      <div className="table-wrapper">
        <div className="table-header">
          <div className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--teal)" /> RACI Matrix — Responsibility Assignment
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--amber)' }}>A</strong> = Accountable ·{' '}
            <strong style={{ color: 'var(--danger)' }}>R</strong> = Responsible ·{' '}
            <strong style={{ color: 'var(--teal)' }}>C</strong> = Consulted ·{' '}
            <strong style={{ color: 'var(--text-muted)' }}>I</strong> = Informed
          </div>
        </div>
        <div className="table-scroll-wrap modern-mat-table-wrap">
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
                    const CLS = { A: 'raci-a', R: 'raci-r', C: 'raci-c', I: 'raci-i' };
                    return <td key={idx} className={CLS[v] || 'raci-i'} style={{ textAlign: 'center' }}>{v}</td>;
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
