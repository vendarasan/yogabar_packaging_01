import React from 'react';
import { STAGE_ORDER, STAGE_COLORS, fmt, getProjectStage } from '../../utils';

export default function Gantt({ projects }) {
  if (!projects.length) {
    return (
      <div id="gantt" className="panel active">
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-title">No projects to show on Gantt chart</div>
        </div>
      </div>
    );
  }

  // Calculate 12 weeks from today
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i * 7);
    return `W${i + 1} (${d.getDate()}/${d.getMonth() + 1})`;
  });

  return (
    <div id="gantt" className="panel active">
      <div className="table-wrapper">
        <div className="table-header">
          <div className="table-title">📅 Project Timeline (Gantt Chart)</div>
          <div style={{ fontSize: '11px', color: 'var(--white-dim)' }}>Stage progress across 12-week horizon</div>
        </div>
        <div className="gantt-wrap" style={{ padding: '16px' }}>
          <table className="gantt-tbl">
            <thead>
              <tr>
                <th className="gantt-label-col">Project / Stage</th>
                {weeks.map((w, idx) => (
                  <th key={idx} className="gantt-week">{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const stage = getProjectStage(p);
                const color = STAGE_COLORS[stage] || 'var(--teal)';
                const stageIdx = STAGE_ORDER.indexOf(stage);
                const startCol = Math.min(Math.max(0, stageIdx), 11);
                const span = Math.min(3, 12 - startCol);

                return (
                  <tr key={p.id} className="gantt-row">
                    <td className="gantt-label-col">
                      <div style={{ fontWeight: '700', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.projectName}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--white-dim)' }}>
                        Stage: <span style={{ color }}>{stage}</span> · Target: {fmt(p.targetLaunchDate)}
                      </div>
                    </td>
                    {Array.from({ length: 12 }, (_, wIdx) => {
                      if (wIdx === startCol) {
                        return (
                          <td key={wIdx} colSpan={span} style={{ padding: '4px' }}>
                            <div className="gantt-bar" style={{ background: color, width: '100%' }}>
                              {stage} ({span}w)
                            </div>
                          </td>
                        );
                      }
                      if (wIdx > startCol && wIdx < startCol + span) {
                        return null;
                      }
                      return <td key={wIdx}></td>;
                    })}
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
