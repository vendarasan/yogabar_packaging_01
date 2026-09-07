import React, { useState } from 'react';
import MaterialTimeline from './MaterialTimeline';
import {
  STAGE_COLORS, fmt, getLTStatus, getDaysLeft,
  getSlippage, getProjectStage, getProjectProgress, isRecentlyAdvanced, canLaunchProject
} from '../../utils';
import { updateFGCode, updateSupplier } from '../../api';

export default function Tracker({
  projects,
  searchQuery,
  setSearchQuery,
  stageFilter,
  setStageFilter,
  statusFilter,
  setStatusFilter,
  currentUser,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteProject,
  onAdvanceProject,
  onRevokeProject,
  onOpenLaunchModal,
  onOpenBriefModal,
  onOpenDetailModal,
  onAdvanceMaterial,
  onRevokeMaterial,
  onOpenSpecModal,
  onProjectUpdated,
  showToast
}) {
  const [expandedRows, setExpandedRows] = useState({});
  const [editingFG, setEditingFG] = useState(null);
  const [fgValue, setFgValue] = useState('');

  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierValue, setSupplierValue] = useState('');

  const canEdit = currentUser && ['admin', 'editor', 'superadmin'].includes(currentUser.role);
  const isAdmin = currentUser && ['admin', 'superadmin'].includes(currentUser.role);

  const toggleExpand = (pid) => {
    setExpandedRows(prev => ({ ...prev, [pid]: !prev[pid] }));
  };

  const handleStartEditFG = (p) => {
    if (!canEdit) return;
    setEditingFG(p.id);
    setFgValue(p.fgCode || '');
  };

  const handleSaveFG = async (pid) => {
    try {
      const res = await updateFGCode(pid, fgValue);
      onProjectUpdated(res.data.project);
      showToast(fgValue.trim() ? `✅ FG Code: ${fgValue.trim()}` : '✅ FG Code cleared');
    } catch (e) {
      showToast('⚠ Failed to update FG Code', true);
    }
    setEditingFG(null);
  };

  const handleStartEditSupplier = (p) => {
    if (!canEdit) return;
    setEditingSupplier(p.id);
    setSupplierValue(p.supplier === 'TBD' ? '' : p.supplier);
  };

  const handleSaveSupplier = async (pid) => {
    try {
      const res = await updateSupplier(pid, supplierValue);
      onProjectUpdated(res.data.project);
      showToast(`✅ Supplier: ${res.data.project.supplier}`);
    } catch (e) {
      showToast('⚠ Failed to update Supplier', true);
    }
    setEditingSupplier(null);
  };

  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || [p.id, p.fgCode, p.projectName, p.supplier, p.factory, p.grammage].some(v => (v || '').toLowerCase().includes(q));
    const matchesStage = !stageFilter || getProjectStage(p) === stageFilter;
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesStage && matchesStatus;
  });

  const statusTag = (s) => {
    const m = { 'On Track': 'tag-green', 'At Risk': 'tag-amber', 'Delayed': 'tag-red', 'Launched': 'tag-purple' };
    return <span className={`tag ${m[s] || 'tag-cyan'}`}>{s}</span>;
  };

  const riskTag = (r) => {
    const m = { Low: 'tag-green', Medium: 'tag-amber', High: 'tag-red' };
    return <span className={`tag ${m[r] || 'tag-cyan'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>{r}</span>;
  };

  return (
    <div id="tracker" className="panel active">
      <div className="table-wrapper">
        <div className="table-header">
          <div className="table-title">
            📋 Project Tracker{' '}
            <span className="tag tag-cyan" style={{ marginLeft: '3px' }}>
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="table-controls">
            <input
              className="search-box"
              type="text"
              placeholder="🔍 Search…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <select className="filter-sel" value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
              <option value="">All Stages</option>
              <option>Brief</option>
              <option>Sample</option>
              <option>Trial</option>
              <option>KLD</option>
              <option>Artwork</option>
              <option>VPDF</option>
              <option>Printing</option>
              <option>Dispatch</option>
              <option>Connectivity</option>
              <option>Launch</option>
            </select>
            <select className="filter-sel" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option>On Track</option>
              <option>At Risk</option>
              <option>Delayed</option>
              <option>Launched</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {filteredProjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No projects found</div>
              <div className="empty-sub">Adjust filters or search</div>
            </div>
          ) : (
            <table style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '32px', padding: '8px 4px' }}></th>
                  <th style={{ width: '110px' }}>FG / PM Code</th>
                  <th style={{ width: '160px' }}>Project Name</th>
                  <th style={{ width: '145px' }}>Stage &amp; Days Left</th>
                  <th style={{ width: '32px', textAlign: 'center' }}>LT</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '82px', textAlign: 'center' }}>Brief Date</th>
                  <th style={{ width: '82px', textAlign: 'center' }}>Est. Ready</th>
                  <th style={{ width: '82px', textAlign: 'center' }}>Target Launch</th>
                  <th style={{ width: '82px', textAlign: 'center' }}>Actual Launch</th>
                  <th style={{ width: '100px' }}>Progress</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Grammage</th>
                  <th style={{ width: '100px' }}>Supplier</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>Risk</th>
                  <th style={{ width: '140px' }}>Comments</th>
                  <th style={{ width: '165px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map(p => {
                  const lt = getLTStatus(p);
                  const recent = isRecentlyAdvanced(p);
                  const exp = !!expandedRows[p.id];
                  const rowCls = recent ? 'row-recent' : `row-lt-${lt}`;
                  const isLaunched = p.status === 'Launched';
                  const canLaunch = canLaunchProject(p);
                  const projStage = getProjectStage(p);
                  const dl = getDaysLeft(p);
                  const sl = getSlippage(p);
                  const pct = getProjectProgress(p);
                  const col = p.status === 'Delayed' ? '#ff5252' : p.status === 'At Risk' ? '#ffab00' : '#00d4c8';

                  return (
                    <React.Fragment key={p.id}>
                      <tr className={rowCls}>
                        <td className="expand-cell" style={{ boxShadow: `inset 3px 0 0 ${lt === 'ok' ? 'var(--green)' : lt === 'warn' ? 'var(--amber)' : 'var(--red)'}`, background: 'var(--navy-light)', textAlign: 'center', padding: '7px 4px' }}>
                          <button className="expand-btn" onClick={() => toggleExpand(p.id)} title={exp ? 'Collapse' : 'Expand'}>
                            {exp ? '▼' : '▶'}
                          </button>
                        </td>

                        {/* FG CODE CELL */}
                        <td style={{ overflow: 'visible' }}>
                          <div className="editable-cell">
                            {editingFG === p.id ? (
                              <input
                                className="inline-input"
                                value={fgValue}
                                onChange={e => setFgValue(e.target.value)}
                                onBlur={() => handleSaveFG(p.id)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveFG(p.id)}
                                autoFocus
                              />
                            ) : (
                              <>
                                <span>
                                  {p.fgCode ? (
                                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--teal)', fontSize: '10px', fontWeight: '700' }}>{p.fgCode}</span>
                                  ) : (
                                    <span style={{ opacity: '0.35', fontSize: '10px' }}>—</span>
                                  )}
                                </span>
                                {canEdit && (
                                  <button className="edit-icon" onClick={() => handleStartEditFG(p)}>✏</button>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* PROJECT NAME */}
                        <td style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.projectName}>
                          {p.projectName}
                          {recent && <span className="new-badge" style={{ marginLeft: '3px' }}>↑</span>}
                        </td>

                        {/* STAGE & DAYS LEFT */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div>
                            <span className="stage-badge" style={{ background: `${STAGE_COLORS[projStage]}18`, border: `1px solid ${STAGE_COLORS[projStage]}40`, color: STAGE_COLORS[projStage] }}>
                              <span className="stage-dot" style={{ background: STAGE_COLORS[projStage] }}></span>{projStage}
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

                        {/* LT DOT */}
                        <td style={{ textAlign: 'center' }}><span className={`lt-dot lt-${lt}`}></span></td>

                        {/* STATUS */}
                        <td style={{ textAlign: 'center' }}>{statusTag(p.status)}</td>

                        {/* BRIEF DATE */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={canEdit ? 'date-clickable' : ''}
                            onClick={() => canEdit && onOpenBriefModal(p.id)}
                            style={{ fontSize: '10px', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}
                          >
                            {fmt(p.briefDate)}
                          </span>
                        </td>

                        {/* EST READY */}
                        <td style={{ textAlign: 'center', fontSize: '10px', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                          {fmt(p.milestones?.Connectivity)}
                          {sl > 0 && <span className="slippage-badge">+{sl}d</span>}
                        </td>

                        {/* TARGET LAUNCH */}
                        <td style={{ textAlign: 'center', fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--cyan)', whiteSpace: 'nowrap' }}>
                          {fmt(p.targetLaunchDate) || <span style={{ opacity: 0.35 }}>—</span>}
                        </td>

                        {/* ACTUAL LAUNCH */}
                        <td style={{ textAlign: 'center', fontSize: '10px', fontFamily: 'var(--mono)', whiteSpace: 'nowrap', color: p.launchDate ? 'var(--green)' : 'var(--white-dim)' }}>
                          {p.launchDate ? <strong>{fmt(p.launchDate)}</strong> : <span style={{ opacity: 0.35 }}>—</span>}
                        </td>

                        {/* PROGRESS */}
                        <td>
                          <div className="prog-wrap">
                            <div className="prog-bar"><div className="prog-fill" style={{ width: `${pct}%`, background: col }}></div></div>
                            <div className="prog-pct">{pct}%</div>
                          </div>
                        </td>

                        {/* GRAMMAGE */}
                        <td style={{ textAlign: 'center', fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--cyan)', whiteSpace: 'nowrap' }}>
                          {p.grammage || <span style={{ opacity: 0.35 }}>—</span>}
                        </td>

                        {/* SUPPLIER CELL */}
                        <td style={{ overflow: 'visible' }}>
                          <div className="editable-cell">
                            {editingSupplier === p.id ? (
                              <input
                                className="inline-input"
                                value={supplierValue}
                                onChange={e => setSupplierValue(e.target.value)}
                                onBlur={() => handleSaveSupplier(p.id)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveSupplier(p.id)}
                                autoFocus
                              />
                            ) : (
                              <>
                                <span style={{ fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px', display: 'inline-block' }}>
                                  {p.supplier || 'TBD'}
                                </span>
                                {canEdit && (
                                  <button className="edit-icon" onClick={() => handleStartEditSupplier(p)}>✏</button>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* RISK */}
                        <td style={{ textAlign: 'center' }}>{riskTag(p.risk)}</td>

                        {/* COMMENTS */}
                        <td style={{ fontSize: '10px', color: 'var(--white-dim)', whiteSpace: 'normal', lineHeight: '1.4' }}>
                          {p.comments || <span style={{ opacity: 0.35 }}>—</span>}
                        </td>

                        {/* ACTIONS */}
                        <td style={{ whiteSpace: 'nowrap', overflow: 'visible' }}>
                          <div style={{ display: 'flex', gap: '2px', flexWrap: 'nowrap', alignItems: 'center' }}>
                            {canEdit && (
                              <>
                                {isLaunched ? (
                                  <span style={{ color: 'var(--green)', fontSize: '10px', fontWeight: '800' }}>🚀 LIVE</span>
                                ) : canLaunch ? (
                                  <button className="btn btn-launch btn-sm" onClick={() => onOpenLaunchModal(p.id)}>🚀 Launch</button>
                                ) : (
                                  <button className="btn btn-ghost btn-sm" onClick={() => onAdvanceProject(p.id)}>▶ Next All</button>
                                )}

                                {isAdmin && projStage !== 'Brief' && (
                                  <button className="btn btn-revoke btn-sm" onClick={() => onRevokeProject(p.id)} title="Revoke (Admin)">↩</button>
                                )}

                                <button className="btn btn-warn btn-sm" onClick={() => onOpenEditModal(p)} title="Edit" style={{ fontSize: '10px' }}>✎ Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => onDeleteProject(p.id)} title="Delete" style={{ fontSize: '10px' }}>🗑</button>
                              </>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => onOpenDetailModal(p)} title="Details">📋</button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED PER-MATERIAL SUB-TABLE */}
                      {exp && (
                        <tr className="mat-section-row">
                          <td colSpan="16">
                            <MaterialTimeline
                              project={p}
                              canEdit={canEdit}
                              isAdmin={isAdmin}
                              onAdvanceMaterial={onAdvanceMaterial}
                              onRevokeMaterial={onRevokeMaterial}
                              onOpenSpecModal={onOpenSpecModal}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
