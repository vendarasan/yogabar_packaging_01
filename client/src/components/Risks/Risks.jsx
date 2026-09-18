import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { STD_RISKS } from '../../constants';

export default function Risks() {
  return (
    <div id="risks" className="panel active">
      <div className="table-wrapper">
        <div className="table-header">
          <div className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="var(--amber)" /> Risk Register — Standard Packaging Risks &amp; Mitigations
          </div>
          <div style={{ fontSize: '11px', color: 'var(--white-dim)' }}>Pre-identified risk scenarios for FMCG packaging projects</div>
        </div>
        <div className="modern-mat-table-wrap" style={{ margin: '16px' }}>
          <table className="modern-mat-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Risk ID</th>
                <th style={{ width: '80px' }}>Stage</th>
                <th>Description</th>
                <th style={{ width: '70px' }}>Impact</th>
                <th style={{ width: '70px' }}>Probability</th>
                <th style={{ width: '80px' }}>Risk Level</th>
                <th>Mitigation Strategy</th>
                <th style={{ width: '100px' }}>Owner</th>
                <th style={{ width: '80px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {STD_RISKS.map(r => {
                const lvlTag = r.level === 'High' ? 'tag-red' : r.level === 'Medium' ? 'tag-amber' : 'tag-green';
                const statTag = r.status === 'Open' ? 'tag-amber' : 'tag-green';
                return (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--teal)' }}>{r.id}</td>
                    <td style={{ fontWeight: '700' }}>{r.stage}</td>
                    <td>{r.desc}</td>
                    <td>{r.impact}</td>
                    <td>{r.prob}</td>
                    <td><span className={`tag ${lvlTag}`}>{r.level}</span></td>
                    <td>{r.mitigation}</td>
                    <td style={{ color: 'var(--cyan)', fontWeight: '600' }}>{r.owner}</td>
                    <td><span className={`tag ${statTag}`}>{r.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
