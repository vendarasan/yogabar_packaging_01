import React from 'react';
import {
  STAGE_ORDER, STAGE_COLORS, fmt, getLTStatus, getDaysLeft,
  getSlippage, getProjectStage, getProjectProgress, isRecentlyAdvanced
} from '../../utils';

export default function Dashboard({ projects, onFilterStage, onSwitchToTracker, onOpenAddModal, canEdit }) {
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

  return (
    <div id="dashboard" className="panel active">
      {/* REMINDER BANNER */}
      {hasReminders && (
        <div className={`reminder-banner ${overdueProjs.length ? 'has-overdue' : 'has-warn'}`}>
          <div style={{ flexShrink: 0, fontSize: '18px' }}>{overdueProjs.length ? '🔴' : '⚠️'}</div>
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
                    🔴 {p.projectName.slice(0, 20)} — {getProjectStage(p)} ({Math.abs(dl)}d overdue)
                  </span>
                );
              })}
              {warnProjs.map(p => {
                const dl = getDaysLeft(p);
                return (
                  <span key={p.id} className="reminder-pill warn" onClick={() => onFilterStage(getProjectStage(p))}>
                    ⚠️ {p.projectName.slice(0, 20)} — {getProjectStage(p)} ({dl}d left)
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
          <div className="kpi-icon">📦</div>
          <div className="kpi-label">Total Projects</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-sub">All tracked packs</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#00e676' }}>
          <div className="kpi-icon">✅</div>
          <div className="kpi-label">On Track</div>
          <div className="kpi-value">{ontrack}</div>
          <div className="kpi-sub">Green status</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#ffab00' }}>
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-label">At Risk</div>
          <div className="kpi-value">{atrisk}</div>
          <div className="kpi-sub">Needs attention</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#ff5252' }}>
          <div className="kpi-icon">🔴</div>
          <div className="kpi-label">Delayed</div>
          <div className="kpi-value">{delayed}</div>
          <div className="kpi-sub">Escalation needed</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#9c6fff' }}>
          <div className="kpi-icon">🚀</div>
          <div className="kpi-label">Launched</div>
          <div className="kpi-value">{launched}</div>
          <div className="kpi-sub">Live in market</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#ff5252' }}>
          <div className="kpi-icon">🔴</div>
          <div className="kpi-label">Overdue Stage</div>
          <div className="kpi-value">{overdue}</div>
          <div className="kpi-sub">3+ days past milestone</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#ffab00' }}>
          <div className="kpi-icon">⏰</div>
          <div className="kpi-label">Due ≤ 48h</div>
          <div className="kpi-value">{due48}</div>
          <div className="kpi-sub">Closing within 2 days</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#76ff03' }}>
          <div className="kpi-icon">📅</div>
          <div className="kpi-label">Slipped</div>
          <div className="kpi-value">{slipped}</div>
          <div className="kpi-sub">Est. ready moved out</div>
        </div>
      </div>

      {/* PIPELINE BAR */}
      <div className="section-hdr">
        <div>
          <div className="section-title">🔄 Stage Pipeline</div>
          <div className="section-sub">Click a stage to filter the tracker</div>
        </div>
      </div>
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
        <div style={{ overflowX: 'auto' }}>
          {total === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <div className="empty-title">No projects yet</div>
              <div className="empty-sub">Click "Add Project" to start tracking</div>
              {canEdit && (
                <button className="btn btn-primary" onClick={onOpenAddModal}>＋ Add First Project</button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>FG Code</th>
                  <th>Project Name</th>
                  <th>Stage &amp; Days Left</th>
                  <th>LT</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Est. Ready</th>
                  <th>Target Launch</th>
                  <th>Actual Launch</th>
                  <th>Slippage</th>
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
                      <td><span className={`lt-dot lt-${lt}`}></span></td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--teal)', fontSize: '10px' }}>{p.fgCode || '—'}</td>
                      <td style={{ fontWeight: '600', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                          <div>
                            <span className={`days-pill ${dl > 7 ? 'days-ok' : dl >= 3 ? 'days-ok' : dl >= 0 ? 'days-warn' : 'days-late'}`}>
                              {dl > 0 ? `+${dl}d` : `${dl}d 🔴`}
                            </span>
                          </div>
                        )}
                      </td>
                      <td><span className={`lt-dot lt-${lt}`}></span></td>
                      <td><span className={`tag ${statusClassMap[p.status] || 'tag-cyan'}`}>{p.status}</span></td>
                      <td style={{ minWidth: '90px' }}>
                        <div className="prog-wrap">
                          <div className="prog-bar"><div className="prog-fill" style={{ width: `${pct}%`, background: col }}></div></div>
                          <div className="prog-pct">{pct}%</div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>{fmt(p.milestones?.Connectivity)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>{fmt(p.targetLaunchDate)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: p.launchDate ? 'var(--green)' : 'var(--white-dim)' }}>{fmt(p.launchDate)}</td>
                      <td>
                        {sl > 0 ? (
                          <span className="slippage-badge">+{sl}d</span>
                        ) : (
                          <span style={{ color: 'var(--green)', fontSize: '10px', fontWeight: '700' }}>✓</span>
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
