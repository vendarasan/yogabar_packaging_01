import React from 'react';
import { LayoutDashboard, ListTodo, Calendar, Map, Users, AlertTriangle, Package, CheckCircle2, XCircle, Rocket, Clock, CalendarClock } from 'lucide-react';
import {
  STAGE_ORDER, STAGE_COLORS, fmt, getLTStatus, getDaysLeft,
  getSlippage, getProjectStage, getProjectProgress, isRecentlyAdvanced
} from '../../utils';

const MENU_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={24} />,
    color: '#0284c7',
    gradientFrom: '#0284c7',
    gradientTo: '#4f46e5',
    desc: 'Executive KPI overview — project health, stage pipeline, lead-time alerts, and real-time status summaries.',
    features: ['Stage Pipeline View', 'KPI Cards', 'Overdue Alerts', 'Progress Tracking'],
    category: 'Overview',
  },
  {
    id: 'tracker',
    label: 'Project Tracker',
    icon: <ListTodo size={24} />,
    color: '#059669',
    gradientFrom: '#059669',
    gradientTo: '#0d9488',
    desc: 'Live project table with inline editing, stage advancement, material-level tracking, and supplier management.',
    features: ['Stage Advancement', 'Material Tracker', 'Inline Edit', 'CSV Export'],
    category: 'Core',
    badge: 'Live',
  },
  {
    id: 'gantt',
    label: 'Gantt Timeline',
    icon: <Calendar size={24} />,
    color: '#7c3aed',
    gradientFrom: '#7c3aed',
    gradientTo: '#a855f7',
    desc: 'Visual Gantt chart showing project milestones, timelines, and planned vs actual completion across all stages.',
    features: ['Milestone View', 'Timeline Bars', 'Stage Markers', 'Date Comparison'],
    category: 'Visualization',
  },
  {
    id: 'stages',
    label: 'Stage SOP Guide',
    icon: <Map size={24} />,
    color: '#d97706',
    gradientFrom: '#d97706',
    gradientTo: '#f59e0b',
    desc: 'Standard Operating Procedures for all 10 packaging development stages, with inputs, outputs and quality checks.',
    features: ['10 Stage SOPs', 'Input/Output Specs', 'Quality Checklists', 'Lead Time Guide'],
    category: 'Reference',
  },
  {
    id: 'raci',
    label: 'RACI Matrix',
    icon: <Users size={24} />,
    color: '#0891b2',
    gradientFrom: '#0891b2',
    gradientTo: '#06b6d4',
    desc: 'Responsibility assignment matrix defining Responsible, Accountable, Consulted, and Informed roles per stage.',
    features: ['7 Functions', '10 Stages', 'Role Definitions', 'Quick Reference'],
    category: 'Governance',
  },
  {
    id: 'risks',
    label: 'Risk Register',
    icon: '⚠️',
    color: '#e11d48',
    gradientFrom: '#e11d48',
    gradientTo: '#f43f5e',
    desc: 'Structured risk log with impact, probability, risk level classification and mitigation strategies per stage.',
    features: ['Risk Classification', 'Mitigation Plans', 'Stage-Linked Risks', 'Impact Matrix'],
    category: 'Risk Mgmt',
  },
];

export default function Dashboard({ projects, onFilterStage, onSwitchToTracker, onOpenAddModal, canEdit, canCreate, onNavigate }) {
  const [hoveredId, setHoveredId] = React.useState(null);
  const total = projects.length;
  const ontrack = projects.filter(p => p.status === 'On Track').length;
  const atrisk = projects.filter(p => p.status === 'At Risk').length;
  const delayed = projects.filter(p => p.status === 'Delayed').length;
  const launched = projects.filter(p => p.status === 'Launched').length;
  const overdue = projects.filter(p => getLTStatus(p) === 'late').length;
  const due48 = projects.filter(p => { const dl = getDaysLeft(p); return dl !== null && dl >= 0 && dl <= 2; }).length;
  const slipped = projects.filter(p => getSlippage(p) > 0).length;

  const overdueProjs = projects.filter(p => getLTStatus(p) === 'late' && p.status !== 'Launched');
  const warnProjs = projects.filter(p => getLTStatus(p) === 'warn' && p.status !== 'Launched');

  const hasReminders = overdueProjs.length > 0 || warnProjs.length > 0;
  const active = projects.filter(p => p.status !== 'Launched').length;

  const getDynamicStats = (menuId) => {
    switch (menuId) {
      case 'dashboard':
        return [
          { label: 'Active', value: active, color: '#0284c7' },
          { label: 'Overdue', value: overdue, color: overdue > 0 ? '#e11d48' : '#059669' },
        ];
      case 'tracker':
        return [
          { label: 'Total', value: total, color: '#059669' },
          { label: 'At Risk', value: atrisk + delayed, color: (atrisk + delayed) > 0 ? '#d97706' : '#059669' },
        ];
      case 'gantt':
        return [
          { label: 'Timelines', value: total, color: '#7c3aed' },
          { label: 'Launched', value: launched, color: '#059669' },
        ];
      case 'stages':
        return [
          { label: 'SOPs', value: 10, color: '#d97706' },
          { label: 'Gates', value: 10, color: '#d97706' },
        ];
      case 'raci':
        return [
          { label: 'Functions', value: 7, color: '#0891b2' },
          { label: 'Assignments', value: 70, color: '#0891b2' },
        ];
      case 'risks':
        return [
          { label: 'Risk Entries', value: 10, color: '#e11d48' },
          { label: 'High Level', value: 7, color: '#e11d48' },
        ];
      default:
        return [];
    }
  };

  return (
    <div id="dashboard" className="panel active">
      {/* REMINDER BANNER */}
      {hasReminders && (
        <div className={`reminder-banner ${overdueProjs.length ? 'has-overdue' : 'has-warn'}`}>
          <div style={{ flexShrink: 0, fontSize: '18px' }}>{overdueProjs.length ? <XCircle size={20} color="var(--red)"/> : <AlertTriangle size={20} color="var(--amber)"/>}</div>
          <div style={{ flex: 1 }}>
            <div className="reminder-banner-title" style={{ color: overdueProjs.length ? 'var(--red)' : 'var(--amber)' }}>
              {overdueProjs.length
                ? `${overdueProjs.length} stage${overdueProjs.length > 1 ? 's' : ''} OVERDUE — timeline at risk!`
                : 'Stage(s) closing within 48 hours — crunch opportunity!'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--white-dim)', marginBottom: '6px' }}>
              Review these projects and consider accelerating remaining stages to protect launch date.
            </div>
            <div className="reminder-items">
              {overdueProjs.map(p => {
                const dl = getDaysLeft(p);
                return (
                  <span key={p.id} className="reminder-pill overdue" onClick={() => onFilterStage(getProjectStage(p))}>
                    <XCircle size={14} style={{marginRight: 4}}/> {p.projectName.slice(0, 20)} — {getProjectStage(p)} ({Math.abs(dl)}d overdue)
                  </span>
                );
              })}
              {warnProjs.map(p => {
                const dl = getDaysLeft(p);
                return (
                  <span key={p.id} className="reminder-pill warn" onClick={() => onFilterStage(getProjectStage(p))}>
                    <AlertTriangle size={14} style={{marginRight: 4}}/> {p.projectName.slice(0, 20)} — {getProjectStage(p)} ({dl}d left)
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* KPI GRID */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--accent': '#00d4c8' }}>
          <div className="kpi-icon" style={{color: '#00d4c8'}}><Package size={26} /></div>
          <div className="kpi-label">Total Projects</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-sub">All tracked packs</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#00e676' }}>
          <div className="kpi-icon" style={{color: '#00e676'}}><CheckCircle2 size={26} /></div>
          <div className="kpi-label">On Track</div>
          <div className="kpi-value">{ontrack}</div>
          <div className="kpi-sub">Green status</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#ffab00' }}>
          <div className="kpi-icon" style={{color: '#ffab00'}}><AlertTriangle size={26} /></div>
          <div className="kpi-label">At Risk</div>
          <div className="kpi-value">{atrisk}</div>
          <div className="kpi-sub">Needs attention</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#ff5252' }}>
          <div className="kpi-icon" style={{color: '#ff5252'}}><XCircle size={26} /></div>
          <div className="kpi-label">Delayed</div>
          <div className="kpi-value">{delayed}</div>
          <div className="kpi-sub">Escalation needed</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#9c6fff' }}>
          <div className="kpi-icon" style={{color: '#9c6fff'}}><Rocket size={26} /></div>
          <div className="kpi-label">Launched</div>
          <div className="kpi-value">{launched}</div>
          <div className="kpi-sub">Live in market</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#ff5252' }}>
          <div className="kpi-icon" style={{color: '#ff5252'}}><XCircle size={26} /></div>
          <div className="kpi-label">Overdue Stage</div>
          <div className="kpi-value">{overdue}</div>
          <div className="kpi-sub">3+ days past milestone</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#ffab00' }}>
          <div className="kpi-icon" style={{color: '#ffab00'}}><Clock size={26} /></div>
          <div className="kpi-label">Due ≤ 48h</div>
          <div className="kpi-value">{due48}</div>
          <div className="kpi-sub">Closing within 2 days</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#76ff03' }}>
          <div className="kpi-icon" style={{color: '#76ff03'}}><CalendarClock size={26} /></div>
          <div className="kpi-label">Slipped</div>
          <div className="kpi-value">{slipped}</div>
          <div className="kpi-sub">Est. ready moved out</div>
        </div>
      </div>

      {/* MODULE DIRECTORY */}
      {/* MODULE DIRECTORY */}
      <div className="md-grid" style={{ marginBottom: '32px' }}>
        {MENU_ITEMS.map((item) => {
          const stats = getDynamicStats(item.id);
          const isHov = hoveredId === item.id;
          return (
            <div
              key={item.id}
              id={`menu-card-${item.id}`}
              className={`md-card${isHov ? ' md-card--hov' : ''}`}
              style={{ '--cc': item.color, '--gf': item.gradientFrom, '--gt': item.gradientTo }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onNavigate(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.id)}
              aria-label={`Open ${item.label} module`}
            >
              <div className="md-card-bar" />
              <div className="md-card-top">
                <div className="md-card-icon-ring" style={{ background: item.color + '15', border: `1px solid ${item.color}30` }}>
                  <span className="md-card-icon">{item.icon}</span>
                </div>
                <div className="md-card-tags">
                  <span className="md-card-cat" style={{ color: item.color }}>{item.category}</span>
                  {item.badge && (
                    <span className="md-badge" style={{ background: item.color + '20', color: item.color, border: `1px solid ${item.color}40` }}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
              <div className="md-card-name">{item.label}</div>
              <div className="md-card-desc">{item.desc}</div>
              {stats.length > 0 && (
                <div className="md-card-stats">
                  {stats.map((s, i) => (
                    <div key={i} className="md-stat">
                      <div className="md-stat-val" style={{ color: s.color }}>{s.value}</div>
                      <div className="md-stat-lbl">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="md-card-features">
                {item.features.map((f) => (
                  <span
                    key={f}
                    className="md-feat-tag"
                    style={{ background: item.color + '10', color: item.color, border: `1px solid ${item.color}25` }}
                  >
                    {f}
                  </span>
                ))}
              </div>
              <div className="md-card-cta">
                <span>Open Module</span>
                <span className="md-cta-arrow">→</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* PIPELINE BAR */}
      {/* PIPELINE BAR */}
      <div className="pipeline">
        {STAGE_ORDER.map((s, idx) => {
          const count = projects.filter(p => getProjectStage(p) === s).length;
          const color = STAGE_COLORS[s];
          return (
            <div key={s} className="pipe-stage" onClick={() => onFilterStage(s)} title={`${s}: ${count}`}>
              <div className="pipe-num">{String(idx + 1).padStart(2, '0')}</div>
              <div className="pipe-label" style={{ color }}>{s}</div>
              <div className="pipe-dot" style={{ background: color }}></div>
              <div className="pipe-count" style={{ color }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* LEGEND */}
      <div className="legend">
        <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--white-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Lead Time:</span>
        <div className="legend-item"><span className="lt-dot lt-ok"></span> On Time</div>
        <div className="legend-item"><span className="lt-dot lt-warn"></span> 1–2d Late</div>
        <div className="legend-item"><span className="lt-dot lt-late"></span> 3d+ Overdue</div>
        <span style={{ fontSize: '9px', color: 'var(--white-dim)', borderLeft: '1px solid var(--border)', paddingLeft: '10px' }}>
          Progress % = Average across all materials · Click ▶ in Tracker to expand per-material timelines
        </span>
      </div>

      {/* SUMMARY TABLE */}
      <div className="table-wrapper">
        <div className="table-header">
          <div className="table-title">📋 All Projects</div>
          <button className="btn btn-ghost btn-sm" onClick={onSwitchToTracker}>View Full Tracker →</button>
        </div>
        <div className="table-scroll-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {total === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <div className="empty-title">No projects yet</div>
              <div className="empty-sub">Click "Add Project" to start tracking</div>
              {canCreate && (
                <button className="btn btn-primary" onClick={onOpenAddModal}>＋ Add First Project</button>
              )}
            </div>
          ) : (
            <table className="dashboard-summary-table" style={{ minWidth: '950px' }}>
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>FG Code</th>
                  <th style={{ minWidth: '180px' }}>Project Name</th>
                  <th style={{ width: '160px' }}>Stage &amp; Days Left</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>LT</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '120px' }}>Progress</th>
                  <th style={{ width: '105px', textAlign: 'center' }}>Est. Ready</th>
                  <th style={{ width: '105px', textAlign: 'center' }}>Target Launch</th>
                  <th style={{ width: '105px', textAlign: 'center' }}>Actual Launch</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Slippage</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => {
                  const lt = getLTStatus(p);
                  const sl = getSlippage(p);
                  const stage = getProjectStage(p);
                  const dl = getDaysLeft(p);
                  const pct = getProjectProgress(p);
                  const col = p.status === 'Delayed' ? '#ff5252' : p.status === 'At Risk' ? '#ffab00' : '#00d4c8';
                  const recent = isRecentlyAdvanced(p);

                  const statusClassMap = { 'On Track': 'tag-green', 'At Risk': 'tag-amber', 'Delayed': 'tag-red', 'Launched': 'tag-purple' };

                  return (
                    <tr key={p.id} className={`row-lt-${lt} ${recent ? 'row-recent' : ''}`}>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--teal)', fontSize: '11px', fontWeight: '700' }}>{p.fgCode || '—'}</td>
                      <td style={{ fontWeight: '600', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.projectName}>
                        {p.projectName}
                        {recent && <span className="new-badge" style={{ marginLeft: '4px' }}>↑</span>}
                      </td>
                      <td>
                        <div>
                          <span className="stage-badge" style={{ background: `${STAGE_COLORS[stage]}18`, border: `1px solid ${STAGE_COLORS[stage]}40`, color: STAGE_COLORS[stage] }}>
                            <span className="stage-dot" style={{ background: STAGE_COLORS[stage] }}></span>{stage}
                          </span>
                        </div>
                        {dl !== null && (
                          <div style={{ marginTop: '3px' }}>
                            <span className={`days-pill ${dl > 7 ? 'days-ok' : dl >= 3 ? 'days-ok' : dl >= 0 ? 'days-warn' : 'days-late'}`}>
                              {dl > 0 ? `+${dl}d` : `${dl}d 🔴`}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}><span className={`lt-dot lt-${lt}`}></span></td>
                      <td style={{ textAlign: 'center' }}><span className={`tag ${statusClassMap[p.status] || 'tag-cyan'}`}>{p.status}</span></td>
                      <td style={{ minWidth: '100px' }}>
                        <div className="prog-wrap">
                          <div className="prog-bar"><div className="prog-fill" style={{ width: `${pct}%`, background: col }}></div></div>
                          <div className="prog-pct">{pct}%</div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '11px', textAlign: 'center' }}>{fmt(p.milestones?.Connectivity)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '11px', textAlign: 'center' }}>
                        <div>{fmt(p.targetLaunchDate)}</div>
                        {p.crunchPlan && (
                          <div style={{ marginTop: '2px' }}>
                            <span style={{ fontSize: '8px', fontWeight: '800', padding: '1px 4px', borderRadius: '3px', background: p.crunchPlan.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: p.crunchPlan.status === 'APPROVED' ? '#10b981' : '#f59e0b' }}>
                              ⚡ {p.crunchPlan.status === 'APPROVED' ? 'Crunched' : p.crunchPlan.status === 'PENDING_STAGE1' ? 'S1 Review' : 'S2 Review'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '11px', textAlign: 'center', color: p.launchDate ? 'var(--green)' : 'var(--white-dim)' }}>{fmt(p.launchDate)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {sl > 0 ? (
                          <span className="slippage-badge">+{sl}d</span>
                        ) : (
                          <span style={{ color: 'var(--green)', fontSize: '11px', fontWeight: '700' }}>✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
