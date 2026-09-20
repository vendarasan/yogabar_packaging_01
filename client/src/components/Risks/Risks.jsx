import React, { useState, useMemo } from 'react';
import { AlertTriangle, ShieldCheck, Filter, Search, Plus, ExternalLink, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { STD_RISKS } from '../../constants';
import { STAGE_ORDER, STAGE_COLORS } from '../../utils';

export default function Risks({ projects = [], onOpenProject, onRefreshProjects, showToast }) {
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'catalog'
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all risks from projects
  const liveRisks = useMemo(() => {
    const list = [];
    projects.forEach(p => {
      if (p.risks && Array.isArray(p.risks)) {
        p.risks.forEach(r => {
          list.push({
            ...r,
            projectId: p.id,
            projectName: p.projectName,
            projectStatus: p.status
          });
        });
      }
    });
    return list;
  }, [projects]);

  // Filtered live risks
  const filteredLiveRisks = useMemo(() => {
    return liveRisks.filter(r => {
      if (severityFilter !== 'ALL' && r.severity !== severityFilter) return false;
      if (stageFilter !== 'ALL' && r.stage !== stageFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (r.title || '').toLowerCase().includes(q);
        const projMatch = (r.projectName || '').toLowerCase().includes(q);
        const ownerMatch = (r.owner || '').toLowerCase().includes(q);
        const actionMatch = (r.action || '').toLowerCase().includes(q);
        return titleMatch || projMatch || ownerMatch || actionMatch;
      }
      return true;
    });
  }, [liveRisks, severityFilter, stageFilter, statusFilter, searchQuery]);

  // KPI Metrics
  const criticalCount = liveRisks.filter(r => r.severity === 'Critical' && r.status !== 'Closed').length;
  const highCount = liveRisks.filter(r => r.severity === 'High' && r.status !== 'Closed').length;
  const openCount = liveRisks.filter(r => r.status !== 'Closed' && r.status !== 'Mitigated').length;
  const mitigatedCount = liveRisks.filter(r => r.status === 'Mitigated' || r.status === 'Closed').length;

  return (
    <div id="risks" className="panel active" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ── KPI METRICS STRIP ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Open Risks</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{openCount}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Across {projects.length} tracked projects</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, textTransform: 'uppercase' }}>Critical Roadblocks</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{criticalCount}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Immediate escalation required</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, textTransform: 'uppercase' }}>High Severity Risks</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{highCount}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Milestone schedule threats</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(0, 230, 118, 0.3)', borderRadius: '8px', padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: '#00e676', fontWeight: 600, textTransform: 'uppercase' }}>Mitigated &amp; Closed</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#00e676', marginTop: '4px' }}>{mitigatedCount}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Resolved risk scenarios</div>
        </div>
      </div>

      {/* ── TAB & FILTER HEADER ── */}
      <div className="table-wrapper">
        <div className="table-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color="var(--amber)" />
              <span className="table-title">ENTERPRISE RISK REGISTER</span>
            </div>

            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setActiveTab('live')}
                style={{
                  padding: '4px 12px',
                  background: activeTab === 'live' ? 'var(--teal)' : 'transparent',
                  color: activeTab === 'live' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Live Project Risks ({liveRisks.length})
              </button>
              <button
                onClick={() => setActiveTab('catalog')}
                style={{
                  padding: '4px 12px',
                  background: activeTab === 'catalog' ? 'var(--teal)' : 'transparent',
                  color: activeTab === 'catalog' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Standard Risk Catalog ({STD_RISKS.length})
              </button>
            </div>
          </div>

          {activeTab === 'live' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search risks, owners, actions..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    padding: '4px 8px 4px 26px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    width: '180px'
                  }}
                />
              </div>

              {/* Severity filter */}
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              >
                <option value="ALL">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Mitigating">Mitigating</option>
                <option value="Mitigated">Mitigated</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          )}
        </div>

        {/* ── TAB CONTENT ── */}
        {activeTab === 'live' ? (
          <div className="modern-mat-table-wrap" style={{ margin: '16px' }}>
            {filteredLiveRisks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <ShieldCheck size={32} style={{ color: 'var(--teal)', opacity: 0.5, marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No Matching Risks</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  {liveRisks.length === 0
                    ? 'No project risks logged yet. Risks added in project control drawers appear here.'
                    : 'Try changing your search query or severity/status filters.'}
                </div>
              </div>
            ) : (
              <table className="modern-mat-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Risk ID</th>
                    <th style={{ width: '180px' }}>Project</th>
                    <th style={{ width: '110px' }}>Stage</th>
                    <th>Risk Title &amp; Category</th>
                    <th style={{ width: '90px' }}>Severity</th>
                    <th style={{ width: '130px' }}>Owner</th>
                    <th>Mitigation Action</th>
                    <th style={{ width: '90px' }}>Status</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLiveRisks.map(r => {
                    const sevTag = r.severity === 'Critical' ? 'tag-red' : r.severity === 'High' ? 'tag-amber' : r.severity === 'Medium' ? 'tag-cyan' : 'tag-green';
                    const statTag = r.status === 'Closed' ? 'tag-purple' : r.status === 'Mitigated' ? 'tag-green' : r.status === 'Mitigating' ? 'tag-cyan' : 'tag-amber';

                    return (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>
                          {r.id}
                        </td>
                        <td>
                          <div
                            onClick={() => onOpenProject && onOpenProject(r.projectId, 0, 'risks')}
                            style={{ fontWeight: 600, color: 'var(--teal)', cursor: 'pointer', textDecoration: 'underline' }}
                            title="Open Project Details"
                          >
                            {r.projectName}
                          </div>
                          {r.materialName && (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{r.materialName}</div>
                          )}
                        </td>
                        <td>
                          <span style={{ color: STAGE_COLORS[r.stage] || 'var(--text-primary)', fontWeight: 600 }}>
                            {r.stage || 'General'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{r.category || 'General Risk'}</div>
                        </td>
                        <td>
                          <span className={`tag ${sevTag}`}>{r.severity}</span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {r.owner || 'Unassigned'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {r.action || 'No mitigation specified'}
                          </div>
                        </td>
                        <td>
                          <span className={`tag ${statTag}`}>{r.status || 'Open'}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onOpenProject && onOpenProject(r.projectId, 0, 'risks')}
                            style={{ fontSize: '10px', padding: '3px 8px' }}
                          >
                            Mitigate →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
