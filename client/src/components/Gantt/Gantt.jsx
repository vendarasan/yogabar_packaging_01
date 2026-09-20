import React, { useState, useMemo } from 'react';
import { Calendar, Search, ArrowRight, Star, AlertTriangle, Layers, Clock } from 'lucide-react';
import { STAGE_ORDER, STAGE_COLORS, fmt, getProjectStage, determineCPMIndex, daysFromNow, getLTStatus } from '../../utils';

const WORKFLOW_DEPENDENCY_STEPS = [
  { id: 'Artwork', name: 'Artwork Approval', color: '#00C8D7' },
  { id: 'VPDF', name: 'VPDF Sign-off', color: '#F2B84B' },
  { id: 'Printing', name: 'Printing Production', color: '#8B5CF6' },
  { id: 'Dispatch', name: 'Dispatch & Logistics', color: '#38C98A' },
  { id: 'Connectivity', name: 'Factory Connectivity', color: '#4F46E5' },
  { id: 'Launch', name: 'Commercial Launch', color: '#EC4899' }
];

export default function Gantt({ projects = [], onOpenProject }) {
  const [query, setQuery] = useState('');
  const [filterStage, setFilterStage] = useState('ALL');

  // Calculate 12 weeks from today
  const weeks = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i * 7);
      return {
        label: `W${i + 1}`,
        dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
        startDate: new Date(d)
      };
    });
  }, []);

  const filteredProjects = useMemo(() => {
    let list = projects.filter(p => p.status !== 'Launched');
    if (filterStage !== 'ALL') {
      list = list.filter(p => getProjectStage(p) === filterStage);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(p =>
        (p.projectName || '').toLowerCase().includes(q) ||
        (p.fgCode || '').toLowerCase().includes(q) ||
        (p.supplier || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [projects, filterStage, query]);

  if (!projects.length) {
    return (
      <div id="gantt" className="panel active">
        <div className="empty-state">
          <div className="empty-icon"><Calendar size={36} color="var(--text-muted)" /></div>
          <div className="empty-title">No projects to show on Gantt chart</div>
        </div>
      </div>
    );
  }

  return (
    <div id="gantt" className="panel active" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ── WORKFLOW DEPENDENCY TOP BAR ── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={14} style={{ color: 'var(--teal)' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
              CRITICAL WORKFLOW DEPENDENCY CHAIN
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sequential stage gates enforced</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {WORKFLOW_DEPENDENCY_STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${step.color}40`,
                borderRadius: '5px',
                fontSize: '11px',
                color: 'var(--text-primary)'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: step.color }} />
                <span>{step.name}</span>
              </div>
              {idx < WORKFLOW_DEPENDENCY_STEPS.length - 1 && (
                <ArrowRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── GANTT TABLE & TIMELINE ── */}
      <div className="table-wrapper">
        <div className="table-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="var(--teal)" /> Packaging Project Timeline (Gantt Horizon)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              12-Week stage progression, critical path monitoring, and launch target dates
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter projects..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  padding: '4px 8px 4px 26px',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  width: '160px'
                }}
              />
            </div>

            {/* Stage filter */}
            <select
              value={filterStage}
              onChange={e => setFilterStage(e.target.value)}
              style={{
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px'
              }}
            >
              <option value="ALL">All Stages</option>
              {STAGE_ORDER.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="gantt-wrap" style={{ padding: '16px', overflowX: 'auto' }}>
          <table className="gantt-tbl" style={{ minWidth: '950px' }}>
            <thead>
              <tr>
                <th className="gantt-label-col" style={{ width: '260px' }}>Project / Critical Path Component</th>
                {weeks.map((w, idx) => (
                  <th key={idx} className="gantt-week" style={{ textAlign: 'center' }}>
                    <div>{w.label}</div>
                    <div style={{ fontSize: '9px', fontWeight: 400, opacity: 0.7 }}>{w.dateStr}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(p => {
                const mats = p.materials || [];
                const cpmIdx = determineCPMIndex(mats);
                const activeMat = mats[cpmIdx] || mats[0] || null;
                const stage = activeMat?.stage || getProjectStage(p);
                const color = STAGE_COLORS[stage] || 'var(--teal)';
                const stageIdx = STAGE_ORDER.indexOf(stage);
                const startCol = Math.min(Math.max(0, stageIdx), 11);
                const span = Math.min(3, 12 - startCol);
                const isDelayed = p.status === 'Delayed' || getLTStatus(p) === 'late';
                const daysLeft = daysFromNow(p.targetLaunchDate || p.milestones?.Connectivity);

                return (
                  <tr
                    key={p.id}
                    className="gantt-row"
                    onClick={() => onOpenProject && onOpenProject(p.id)}
                    style={{ cursor: 'pointer' }}
                    title="Click to open Project Control Drawer"
                  >
                    <td className="gantt-label-col" style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        {cpmIdx >= 0 && (
                          <span style={{ fontSize: '9px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>
                            ★ CPM
                          </span>
                        )}
                        <span style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.projectName}
                        </span>
                      </div>

                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Stage: <strong style={{ color }}>{stage}</strong></span>
                        <span>•</span>
                        <span>Launch: {fmt(p.targetLaunchDate)}</span>
                        {daysLeft !== null && (
                          <span style={{ color: daysLeft < 0 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : 'var(--teal)' }}>
                            ({daysLeft >= 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d late`})
                          </span>
                        )}
                      </div>
                    </td>

                    {Array.from({ length: 12 }, (_, wIdx) => {
                      if (wIdx === startCol) {
                        return (
                          <td key={wIdx} colSpan={span} style={{ padding: '4px' }}>
                            <div
                              className="gantt-bar"
                              style={{
                                background: isDelayed ? 'linear-gradient(90deg, #ef4444, #dc2626)' : color,
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0 8px',
                                borderRadius: '4px',
                                height: '26px',
                                fontSize: '10px',
                                fontWeight: 600,
                                color: '#fff',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }}
                            >
                              <span>{stage}</span>
                              <span style={{ fontSize: '9px', opacity: 0.85 }}>{span}w duration</span>
                            </div>
                          </td>
                        );
                      }
                      if (wIdx > startCol && wIdx < startCol + span) {
                        return null;
                      }
                      return (
                        <td
                          key={wIdx}
                          style={{
                            borderRight: '1px dashed rgba(255,255,255,0.05)',
                            background: wIdx % 2 === 0 ? 'rgba(0,0,0,0.05)' : 'transparent'
                          }}
                        />
                      );
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
