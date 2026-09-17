import React, { useState } from 'react';
import MaterialTimeline from './MaterialTimeline';
import CrunchTimelineModal from '../Modals/CrunchTimelineModal';
import {
  STAGE_COLORS, fmt, getLTStatus, getDaysLeft,
  getSlippage, getProjectStage, getProjectProgress, isRecentlyAdvanced, canLaunchProject
} from '../../utils';
import { updateFGCode, updateSupplier, updateFactory, updateDescription } from '../../api';

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
  onOpenArtworkModal,
  onProjectUpdated,
  showToast
}) {
  const [expandedRows, setExpandedRows] = useState({});
  const [editingFG, setEditingFG] = useState(null);
  const [fgValue, setFgValue] = useState('');

  const [editingFactory, setEditingFactory] = useState(null);
  const [factoryValue, setFactoryValue] = useState('');

  const [editingDesc, setEditingDesc] = useState(null);
  const [descValue, setDescValue] = useState('');
  const [selectedCrunchProject, setSelectedCrunchProject] = useState(null);

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = currentUser && ['admin', 'superadmin'].includes(currentUser.role);
  const canAdvance = currentUser && ['updater', 'editor', 'admin', 'superadmin'].includes(currentUser.role);
  const canRevoke = isAdmin;
  const canDelete = isSuperAdmin;
  const canFullEdit = isAdmin;
  const canUpdateDetails = currentUser && ['updater', 'editor', 'admin', 'superadmin'].includes(currentUser.role);
  const canEdit = canUpdateDetails;

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

  const handleStartEditFactory = (p) => {
    if (!canEdit) return;
    setEditingFactory(p.id);
    setFactoryValue(p.factory === 'TBD' ? '' : (p.factory || ''));
  };

  const handleSaveFactory = async (pid) => {
    try {
      const res = await updateFactory(pid, factoryValue);
      onProjectUpdated(res.data.project);
      showToast(res.data.project.factory ? `✅ Factory: ${res.data.project.factory}` : '✅ Factory cleared');
    } catch (e) {
      showToast('⚠ Failed to update Factory', true);
    }
    setEditingFactory(null);
  };

  const handleStartEditDesc = (p) => {
    if (!canEdit) return;
    setEditingDesc(p.id);
    setDescValue(p.description || p.comments || '');
  };

  const handleSaveDesc = async (pid) => {
    try {
      const res = await updateDescription(pid, descValue);
      onProjectUpdated(res.data.project);
      showToast(descValue.trim() ? '✅ Description updated' : '✅ Description cleared');
    } catch (e) {
      showToast('⚠ Failed to update Description', true);
    }
    setEditingDesc(null);
  };

  const filteredProjects = (projects || []).filter(p => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch = !q || [p.id, p.fgCode, p.projectName, p.supplier, p.factory, p.grammage, p.description, p.comments].some(v => (v || '').toLowerCase().includes(q));
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

  const handleNextAll = (proj) => {
    if (proj.crunchPlan && (proj.crunchPlan.status === 'PENDING_STAGE1' || proj.crunchPlan.status === 'PENDING_STAGE2')) {
      const stageLabel = proj.crunchPlan.status === 'PENDING_STAGE1' ? 'Stage 1 Admin Approval' : 'Stage 2 Super Admin Final Sign-Off';
      if (showToast) {
        showToast(`⚠️ Action Gated: Crunched timeline requires ${stageLabel} before advancing stage`, true);
      } else {
        alert(`⚠️ Action Gated: Crunched timeline requires ${stageLabel} before advancing stage.`);
      }
      setSelectedCrunchProject(proj);
      return;
    }

    // Mandatory check: Spec Sign-off must be confirmed, or requires Admin approval
    const unsigned = (proj.materials || []).filter(m => (m.stage || 'Brief') === proj.stage && !(m.specSignoff && m.specSignoff.signed));
    if (unsigned.length > 0) {
      if (!isAdmin) {
        if (showToast) {
          showToast(`⚠️ Action Gated: Technical specifications must be signed off first for: ${unsigned.map(m => m.name).join(', ')}. Admin approval required.`, true);
        } else {
          alert(`⚠️ Action Gated: Technical specifications must be signed off first for:\n${unsigned.map(m => `• ${m.name}`).join('\n')}\n\nAdmin approval (Project Manager or Packaging Head) is required to proceed without Spec Sign-off.`);
        }
        return;
      } else {
        const confirmProceed = window.confirm(`Technical specifications have not been signed off for:\n${unsigned.map(m => `• ${m.name}`).join('\n')}\n\nAs an Admin, do you want to grant Admin Approval to advance this project without Spec Sign-off?`);
        if (!confirmProceed) return;
        onAdvanceProject(proj.id, { adminApproval: true, adminNotes: 'Admin project-level advance override' });
        return;
      }
    }

    const unraised = (proj.materials || []).filter(m => (m.stage || 'Brief') === 'VPDF' && (m.poStatus || 'RFQ in progress') !== 'Raised');
    if (unraised.length > 0) {
      if (showToast) {
        showToast(`⚠️ Cannot advance to Printing: Purchase Order must be 'Raised' first for: ${unraised.map(m => m.name).join(', ')}`, true);
      } else {
        alert(`⚠️ Mandatory Gate: Purchase Order must be 'Raised' before advancing to Printing for:\n${unraised.map(m => `• ${m.name} (${m.poStatus || 'RFQ in progress'})`).join('\n')}\n\nPlease update the Purchase Order to 'Raised' first.`);
      }
      return;
    }
    onAdvanceProject(proj.id);
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

        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">No projects found</div>
            <div className="empty-sub">Adjust filters or search</div>
          </div>
        ) : (
          <div className="table-scroll-wrap modern-mat-table-wrap">
            <table className="modern-mat-table" style={{ tableLayout: 'fixed', minWidth: '2260px', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', padding: '8px 4px', textAlign: 'center' }}></th>
                  <th style={{ width: '130px' }}>FG Code</th>
                  <th style={{ width: '210px' }}>Project Name</th>
                  <th style={{ width: '160px' }}>Stage &amp; Days Left</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>LT</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '105px', textAlign: 'center' }}>Brief Date</th>
                  <th style={{ width: '105px', textAlign: 'center' }}>Est. Ready</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Launch Timeline</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Actual Launch</th>
                  <th style={{ width: '135px' }}>Progress</th>
                  <th style={{ width: '95px', textAlign: 'center' }}>SKU Size</th>
                  <th style={{ width: '95px', textAlign: 'center' }}>Type</th>
                  <th style={{ width: '140px' }}>Factory</th>
                  <th style={{ width: '85px', textAlign: 'center' }}>Risk</th>
                  <th style={{ width: '180px' }}>Description</th>
                  <th style={{ minWidth: '340px', textAlign: 'center' }}>Actions</th>
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
                      <tr className={`${rowCls} ${editingFG === p.id || editingFactory === p.id || editingDesc === p.id ? 'tracker-edit-row' : ''}`}>
                        <td className="expand-cell" style={{ boxShadow: `inset 3px 0 0 ${lt === 'ok' ? 'var(--green)' : lt === 'warn' ? 'var(--amber)' : 'var(--red)'}`, background: 'var(--navy-light)', textAlign: 'center', padding: '6px 4px' }}>
                          <button
                            className={`row-expand-btn ${exp ? 'expanded' : ''}`}
                            onClick={() => toggleExpand(p.id)}
                            title={exp ? 'Collapse packaging materials' : 'Expand packaging materials'}
                          >
                            {exp ? '▼' : '▶'}
                          </button>
                        </td>

                        {/* FG CODE CELL */}
                        <td style={{ overflow: 'visible' }}>
                          <div className="editable-cell">
                            {editingFG === p.id ? (
                              <div className="inline-edit-wrap">
                                <input
                                  className="inline-edit-input"
                                  value={fgValue}
                                  onChange={e => setFgValue(e.target.value)}
                                  onKeyDown={e => {
                                    if(e.key === 'Enter') handleSaveFG(p.id);
                                    if(e.key === 'Escape') setEditingFG(null);
                                  }}
                                  autoFocus
                                />
                                <button className="inline-btn save-btn" onClick={() => handleSaveFG(p.id)}>✓</button>
                                <button className="inline-btn cancel-btn" onClick={() => setEditingFG(null)}>✕</button>
                              </div>
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

                        {/* LAUNCH TIMELINE */}
                        <td style={{ textAlign: 'center', fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--cyan)', whiteSpace: 'nowrap' }}>
                          <div
                            onClick={() => setSelectedCrunchProject(p)}
                            style={{ cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}
                            title="Click to view Reverse Timeline Calculation & Multi-Admin Approval"
                          >
                            <span>{fmt(p.targetLaunchDate) || <span style={{ opacity: 0.35 }}>—</span>}</span>
                            {p.crunchPlan?.status === 'PENDING_STAGE1' && (
                              <span style={{ fontSize: '9px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', background: '#f59e0b', color: '#000', border: '1px solid #d97706', boxShadow: '0 0 6px rgba(245, 158, 11, 0.4)' }}>
                                ⚡ S1 APPROVE →
                              </span>
                            )}
                            {p.crunchPlan?.status === 'PENDING_STAGE2' && (
                              <span style={{ fontSize: '9px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', background: '#7c3aed', color: '#fff', border: '1px solid #6d28d9', boxShadow: '0 0 6px rgba(124, 58, 237, 0.4)' }}>
                                ⚡ S2 SIGN-OFF →
                              </span>
                            )}
                            {p.crunchPlan?.status === 'APPROVED' && (
                              <span style={{ fontSize: '8px', fontWeight: '800', padding: '1px 5px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                                ⚡ Crunched
                              </span>
                            )}
                            {p.crunchPlan?.status === 'REJECTED' && (
                              <span style={{ fontSize: '8px', fontWeight: '800', padding: '1px 5px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                                ✕ Rejected
                              </span>
                            )}
                            {!p.crunchPlan && p.targetLaunchDate && p.milestones?.Connectivity && p.targetLaunchDate < p.milestones.Connectivity && (
                              <span style={{ fontSize: '8px', fontWeight: '800', padding: '1px 5px', borderRadius: '3px', background: 'rgba(14, 165, 233, 0.2)', color: '#0ea5e9' }}>
                                ⚡ Crunch
                              </span>
                            )}
                          </div>
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

                        {/* SKU SIZE */}
                        <td style={{ textAlign: 'center', fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--cyan)', whiteSpace: 'nowrap' }}>
                          {p.skuSize || p.grammage || <span style={{ opacity: 0.35 }}>—</span>}
                        </td>

                        {/* PROJECT TYPE */}
                        <td style={{ textAlign: 'center', fontSize: '10px', whiteSpace: 'nowrap' }}>
                          <span style={{ background: 'var(--navy-light)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                            {p.projectType || 'Regular'}
                          </span>
                        </td>

                        {/* FACTORY CELL (REPLACED SUPPLIER) */}
                        <td style={{ overflow: 'visible' }}>
                          <div className="editable-cell">
                            {editingFactory === p.id ? (
                              <div className="inline-edit-wrap">
                                <input
                                  className="inline-edit-input"
                                  value={factoryValue}
                                  onChange={e => setFactoryValue(e.target.value)}
                                  onKeyDown={e => {
                                    if(e.key === 'Enter') handleSaveFactory(p.id);
                                    if(e.key === 'Escape') setEditingFactory(null);
                                  }}
                                  placeholder="Factory / DC..."
                                  autoFocus
                                />
                                <button className="inline-btn save-btn" onClick={() => handleSaveFactory(p.id)}>✓</button>
                                <button className="inline-btn cancel-btn" onClick={() => setEditingFactory(null)}>✕</button>
                              </div>
                            ) : (
                              <>
                                <span style={{ fontSize: '10.5px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px', display: 'inline-block' }} title={p.factory || 'TBD'}>
                                  🏭 {p.factory || 'TBD'}
                                </span>
                                {canEdit && (
                                  <button className="edit-icon" onClick={() => handleStartEditFactory(p)} title="Edit Factory">✏</button>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* RISK */}
                        <td style={{ textAlign: 'center' }}>{riskTag(p.risk)}</td>

                        {/* DESCRIPTION */}
                        <td style={{ overflow: 'visible' }}>
                          <div className="editable-cell">
                            {editingDesc === p.id ? (
                              <div className="inline-edit-wrap">
                                <input
                                  className="inline-edit-input"
                                  value={descValue}
                                  onChange={e => setDescValue(e.target.value)}
                                  onKeyDown={e => {
                                    if(e.key === 'Enter') handleSaveDesc(p.id);
                                    if(e.key === 'Escape') setEditingDesc(null);
                                  }}
                                  placeholder="Description..."
                                  style={{ width: '150px', fontSize: '10px' }}
                                  autoFocus
                                />
                                <button className="inline-btn save-btn" onClick={() => handleSaveDesc(p.id)} title="Save Description">✓</button>
                                <button className="inline-btn cancel-btn" onClick={() => setEditingDesc(null)} title="Cancel">✕</button>
                              </div>
                            ) : (
                              <>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    color: 'var(--white-dim)',
                                    whiteSpace: 'normal',
                                    lineHeight: '1.4',
                                    display: 'inline-block',
                                    maxWidth: '170px',
                                    wordBreak: 'break-word'
                                  }}
                                  title={p.description || p.comments || ''}
                                >
                                  {p.description || p.comments || <span style={{ opacity: 0.35 }}>—</span>}
                                </span>
                                {canEdit && (
                                  <button className="edit-icon" onClick={() => handleStartEditDesc(p)} title="Edit Description">✏</button>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center', padding: '10px 12px' }}>
                          <div className="tracker-action-group">
                            {isLaunched ? (
                              <span className="live-status-pill">🚀 LIVE</span>
                            ) : canLaunch && isAdmin ? (
                              <button className="tracker-act-btn tracker-act-launch" onClick={() => onOpenLaunchModal(p.id)} title="Mark Project as Launched">
                                🚀 Launch
                              </button>
                            ) : canAdvance ? (
                              <button className="tracker-act-btn tracker-act-advance" onClick={() => handleNextAll(p)} title="Advance All Materials to Next Stage">
                                ▶ Next All
                              </button>
                            ) : null}

                            {/* CRUNCH APPROVAL QUICK ACTION BUTTON */}
                            {p.crunchPlan && p.crunchPlan.status === 'PENDING_STAGE1' && (
                              <button
                                className="tracker-act-btn"
                                style={{ background: 'rgba(242, 184, 75, 0.12)', color: 'var(--warning)', fontWeight: '600', border: '1px solid rgba(242, 184, 75, 0.35)', fontSize: '10.5px', padding: '0 8px' }}
                                onClick={() => setSelectedCrunchProject(p)}
                                title="Stage 1 Admin Approval Required — Click to Approve Timeline"
                              >
                                ⚡ S1 Approve
                              </button>
                            )}
                            {p.crunchPlan && p.crunchPlan.status === 'PENDING_STAGE2' && (
                              <button
                                className="tracker-act-btn"
                                style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'var(--purple)', fontWeight: '600', border: '1px solid rgba(139, 92, 246, 0.35)', fontSize: '10.5px', padding: '0 8px' }}
                                onClick={() => setSelectedCrunchProject(p)}
                                title="Stage 2 Super Admin Sign-off Required — Click to Approve Timeline"
                              >
                                ⚡ S2 Sign-off
                              </button>
                            )}

                            {/* REVOKE (Admins & Super Admin only — Updaters cannot revoke) */}
                            {canRevoke && projStage !== 'Brief' && (
                              <button className="tracker-act-btn tracker-act-revoke" onClick={() => onRevokeProject(p.id)} title="Revoke All Materials (Admin / Super Admin)">
                                ↩
                              </button>
                            )}

                            {/* FULL EDIT (Admins & Super Admin only) */}
                            {canFullEdit && (
                              <button className="tracker-act-btn tracker-act-edit" onClick={() => onOpenEditModal(p)} title="Edit Project">
                                ✎ Edit
                              </button>
                            )}

                            {/* DELETE (Super Admin only!) */}
                            {canDelete && (
                              <button className="tracker-act-btn tracker-act-delete" onClick={() => onDeleteProject(p.id)} title="Delete Project (Super Admin only)">
                                🗑
                              </button>
                            )}

                            <button className="tracker-act-btn tracker-act-details" onClick={() => onOpenDetailModal(p, 'specs')} title="View Project Specs, Audit Trail & Insights">
                              📋 Details
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED PER-MATERIAL SUB-TABLE */}
                      {exp && (
                        <tr className="mat-section-row">
                          <td colSpan="17">
                            <MaterialTimeline
                              project={p}
                              currentUser={currentUser}
                              canEdit={canEdit}
                              isAdmin={isAdmin}
                              isSuperAdmin={isSuperAdmin}
                              canAdvance={canAdvance}
                              canRevoke={canRevoke}
                              canUpdateDetails={canUpdateDetails}
                              onAdvanceMaterial={onAdvanceMaterial}
                              onRevokeMaterial={onRevokeMaterial}
                              onOpenSpecModal={onOpenSpecModal}
                              onOpenArtworkModal={onOpenArtworkModal}
                              onOpenCrunchModal={setSelectedCrunchProject}
                              onProjectUpdated={onProjectUpdated}
                              showToast={showToast}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCrunchProject && (
        <CrunchTimelineModal
          project={selectedCrunchProject}
          currentUser={currentUser}
          onClose={() => setSelectedCrunchProject(null)}
          onProjectUpdated={(up) => {
            onProjectUpdated && onProjectUpdated(up);
            setSelectedCrunchProject(up);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
