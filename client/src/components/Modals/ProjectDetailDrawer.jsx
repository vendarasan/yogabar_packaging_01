import React, { useState, useEffect } from 'react';
import {
  X, Copy, Check, Star, ArrowRight, FileText, Palette, AlertTriangle,
  Calendar, Clock, ShieldCheck, ChevronRight, Truck, Factory, Zap, Building,
  CheckSquare, MessageSquare, Users, Edit2, Plus, History
} from 'lucide-react';
import {
  STAGE_ORDER, STAGE_COLORS, fmt, getProjectStage, getDaysLeft,
  getLTStatus, getArtworkCode, hasArtwork, getArtworkFiles,
  determineCPMIndex, getNextAction, daysFromNow, getMaterialHierarchyTier, getTierName, timeAgo
} from '../../utils';
import {
  getTasks, createTask, completeTask, updateTask,
  getApprovals, requestApproval, decideApproval,
  getProjectRisks, addProjectRisk, updateProjectRisk,
  updateProjectOwnership, getUsers
} from '../../api';
import ContextualComments from './ContextualComments';

export default function ProjectDetailDrawer({
  isOpen,
  project,
  materialIndex = null,
  initialTab = 'overview',
  currentUser,
  onClose,
  onOpenSpecModal,
  onOpenArtworkModal,
  onOpenCrunchModal,
  onNavigateTab,
  onOpenNotif,
  onProjectUpdated,
  showToast
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [copied, setCopied] = useState(false);
  const [teamUsers, setTeamUsers] = useState([]);

  // Ownership editing state
  const [isEditingOwnership, setIsEditingOwnership] = useState(false);
  const [ownershipForm, setOwnershipForm] = useState({
    projectOwner: '',
    packagingOwner: '',
    artworkOwner: '',
    procurementOwner: '',
    qaOwner: ''
  });

  // Tasks & Approvals state
  const [tasks, setTasks] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskMaterial, setTaskMaterial] = useState('');

  // Approval Request state
  const [showNewAppForm, setShowNewAppForm] = useState(false);
  const [appTitle, setAppTitle] = useState('');
  const [appEntityType, setAppEntityType] = useState('ARTWORK');
  const [appEntityId, setAppEntityId] = useState('');
  const [appReviewer, setAppReviewer] = useState('');
  const [appComments, setAppComments] = useState('');
  const [decisionApp, setDecisionApp] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [historyApp, setHistoryApp] = useState(null);

  // Risks state
  const [risks, setRisks] = useState([]);
  const [risksLoading, setRisksLoading] = useState(false);
  const [showNewRiskForm, setShowNewRiskForm] = useState(false);
  const [riskTitle, setRiskTitle] = useState('');
  const [riskCategory, setRiskCategory] = useState('Supply Chain');
  const [riskSeverity, setRiskSeverity] = useState('Medium');
  const [riskStage, setRiskStage] = useState('');
  const [riskMaterial, setRiskMaterial] = useState('');
  const [riskOwner, setRiskOwner] = useState('');
  const [riskAction, setRiskAction] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load contextual data on open
  useEffect(() => {
    if (isOpen && project?.id) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setOwnershipForm({
        projectOwner: project.ownership?.projectOwner || '',
        packagingOwner: project.ownership?.packagingOwner || '',
        artworkOwner: project.ownership?.artworkOwner || '',
        procurementOwner: project.ownership?.procurementOwner || '',
        qaOwner: project.ownership?.qaOwner || ''
      });
      loadTeam();
      loadTasksAndApprovals();
      loadRisks();
    }
  }, [isOpen, project?.id, initialTab]);

  const loadTeam = async () => {
    try {
      const res = await getUsers();
      if (res.data?.users) {
        setTeamUsers(Object.values(res.data.users));
      }
    } catch (e) {}
  };

  const loadTasksAndApprovals = async () => {
    setTasksLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([
        getTasks({ projectId: project.id }),
        getApprovals({ projectId: project.id })
      ]);
      if (tRes.data?.success) setTasks(tRes.data.tasks || []);
      if (aRes.data?.success) setApprovals(aRes.data.approvals || []);
    } catch (e) {
    } finally {
      setTasksLoading(false);
    }
  };

  const loadRisks = async () => {
    setRisksLoading(true);
    try {
      const res = await getProjectRisks(project.id);
      if (res.data?.success) setRisks(res.data.risks || []);
    } catch (e) {
    } finally {
      setRisksLoading(false);
    }
  };

  const handleSaveOwnership = async () => {
    try {
      await updateProjectOwnership(project.id, { ownership: ownershipForm });
      setIsEditingOwnership(false);
      if (showToast) showToast('Project ownership updated');
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      alert('Failed to update ownership: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      const res = await createTask({
        projectId: project.id,
        materialId: taskMaterial || null,
        title: taskTitle.trim(),
        stage: taskStage || project.stage,
        assignedTo: taskAssignee || null,
        dueDate: taskDueDate || null,
        priority: taskPriority
      });
      if (res.data?.success) {
        setTasks(prev => [res.data.task, ...prev]);
        setTaskTitle('');
        setShowNewTaskForm(false);
        if (showToast) showToast('Action item assigned');
        if (onProjectUpdated) onProjectUpdated();
      }
    } catch (err) {
      alert('Failed creating task: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const res = await completeTask(taskId);
      if (res.data?.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? res.data.task : t));
        if (showToast) showToast('Task marked completed');
        if (onProjectUpdated) onProjectUpdated();
      }
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCreateApproval = async (e) => {
    e.preventDefault();
    if (!appTitle.trim()) return;
    try {
      const res = await requestApproval({
        projectId: project.id,
        entityType: appEntityType,
        entityId: appEntityId || project.materials?.[0]?.name || 'General',
        materialId: appEntityId || null,
        title: appTitle.trim(),
        reviewer: appReviewer || null,
        comments: appComments.trim()
      });
      if (res.data?.success) {
        setApprovals(prev => [res.data.approval, ...prev]);
        setAppTitle('');
        setAppComments('');
        setShowNewAppForm(false);
        if (showToast) showToast('Approval request submitted');
        if (onProjectUpdated) onProjectUpdated();
      }
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDecideApproval = async (decision) => {
    if (!decisionApp) return;
    try {
      const res = await decideApproval(decisionApp.id, {
        decision,
        comments: decisionNotes.trim()
      });
      if (res.data?.success) {
        setApprovals(prev => prev.map(a => a.id === decisionApp.id ? res.data.approval : a));
        setDecisionApp(null);
        setDecisionNotes('');
        if (showToast) showToast(`Approval ${decision}`);
        if (onProjectUpdated) onProjectUpdated();
      }
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAddRisk = async (e) => {
    e.preventDefault();
    if (!riskTitle.trim()) return;
    try {
      const res = await addProjectRisk(project.id, {
        title: riskTitle.trim(),
        category: riskCategory,
        severity: riskSeverity,
        stage: riskStage || project.stage,
        materialId: riskMaterial || null,
        owner: riskOwner || null,
        action: riskAction.trim()
      });
      if (res.data?.success) {
        setRisks(prev => [res.data.risk, ...prev]);
        setRiskTitle('');
        setRiskAction('');
        setShowNewRiskForm(false);
        if (showToast) showToast('Risk logged and assigned');
        if (onProjectUpdated) onProjectUpdated();
      }
    } catch (err) {
      alert('Failed adding risk: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleResolveRisk = async (riskId) => {
    try {
      const res = await updateProjectRisk(project.id, riskId, { status: 'Resolved' });
      if (res.data?.success) {
        setRisks(prev => prev.map(r => r.id === riskId ? res.data.risk : r));
        if (showToast) showToast('Risk marked resolved');
        if (onProjectUpdated) onProjectUpdated();
      }
    } catch (err) {
      alert('Failed resolving risk: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!isOpen || !project) return null;

  const mats = project.materials || [];
  const cpmIdx = determineCPMIndex(mats);
  const activeMatIdx = materialIndex !== null ? materialIndex : (cpmIdx >= 0 ? cpmIdx : 0);
  const activeMat = mats[activeMatIdx] || mats[0] || null;
  const isCPM = cpmIdx === activeMatIdx;

  const currentStage = activeMat ? (activeMat.stage || 'Brief') : getProjectStage(project);
  const curStageIdx = STAGE_ORDER.indexOf(currentStage);
  const prevStage = curStageIdx > 0 ? STAGE_ORDER[curStageIdx - 1] : 'None';
  const nextStage = curStageIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[curStageIdx + 1] : 'Launched';

  const dl = activeMat?.milestones?.[currentStage] ? daysFromNow(activeMat.milestones[currentStage]) : getDaysLeft(project);
  const lt = getLTStatus(project);
  const isDelayed = project.status === 'Delayed' || lt === 'late';

  const pmCode = activeMat?.pmCode || project.fgCode || '';
  const awCode = activeMat?.artworkCode || getArtworkCode(pmCode);
  const awFiles = activeMat ? getArtworkFiles(activeMat) : [];
  const specParamsCount = activeMat?.specSheet?.parameters?.length || 0;
  const nextActionText = getNextAction(currentStage, activeMat, project);

  const handleCopyPM = () => {
    if (!pmCode) return;
    navigator.clipboard?.writeText(pmCode);
    setCopied(true);
    if (showToast) showToast(`Copied ${pmCode} to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColorMap = {
    'On Track': 'var(--success)',
    'At Risk': 'var(--warning)',
    'Delayed': 'var(--danger)',
    'Launched': 'var(--purple)'
  };
  const statusColor = statusColorMap[project.status] || 'var(--teal)';

  return (
    <div className="drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="drawer-content" style={{ width: '560px', maxWidth: '95vw' }} onClick={(e) => e.stopPropagation()}>
        
        {/* DRAWER HEADER */}
        <div className="drawer-header" style={{ paddingBottom: '12px' }}>
          <div className="drawer-header-top">
            <div className="drawer-badge-row">
              <span className="drawer-status-pill" style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}15` }}>
                <span className="stage-dot" style={{ background: statusColor }}></span>
                {project.status}
              </span>
              {isCPM && (
                <span className="drawer-cpm-badge">
                  ★ Critical Path Material
                </span>
              )}
            </div>
            <button className="drawer-close-btn" onClick={onClose} title="Close drawer (Esc)">
              <X size={16} />
            </button>
          </div>

          <h2 className="drawer-title" title={project.projectName}>
            {project.projectName}
          </h2>
          {activeMat && (
            <div className="drawer-material-sub">
              Component: <strong>{activeMat.name}</strong> ({getTierName(getMaterialHierarchyTier(activeMat.type))})
            </div>
          )}

          {pmCode && (
            <div className="drawer-code-bar" style={{ marginTop: '8px' }}>
              <span className="drawer-code-label">PM CODE:</span>
              <span className="drawer-code-value">{pmCode}</span>
              <button className="drawer-copy-btn" onClick={handleCopyPM} title="Copy code">
                {copied ? <Check size={12} style={{ color: 'var(--teal)' }} /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {/* PASS 7 NAVIGATION SUB-TABS */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                background: 'none', border: 'none', padding: '6px 12px', fontSize: '12px', fontWeight: 600,
                color: activeTab === 'overview' ? 'var(--teal)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'overview' ? '2px solid var(--teal)' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              style={{
                background: 'none', border: 'none', padding: '6px 12px', fontSize: '12px', fontWeight: 600,
                color: activeTab === 'tasks' ? 'var(--teal)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'tasks' ? '2px solid var(--teal)' : '2px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <CheckSquare size={12} />
              Tasks & Approvals ({tasks.length + approvals.length})
            </button>
            <button
              onClick={() => setActiveTab('risks')}
              style={{
                background: 'none', border: 'none', padding: '6px 12px', fontSize: '12px', fontWeight: 600,
                color: activeTab === 'risks' ? 'var(--teal)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'risks' ? '2px solid var(--teal)' : '2px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <AlertTriangle size={12} />
              Risks ({risks.length})
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              style={{
                background: 'none', border: 'none', padding: '6px 12px', fontSize: '12px', fontWeight: 600,
                color: activeTab === 'comments' ? 'var(--teal)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'comments' ? '2px solid var(--teal)' : '2px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <MessageSquare size={12} />
              Discussion
            </button>
          </div>
        </div>

        {/* DRAWER BODY (SCROLLABLE) */}
        <div className="drawer-body">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* FUNCTIONAL OWNERSHIP ROW */}
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px',
                padding: '12px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={12} style={{ color: 'var(--teal)' }} /> Functional Ownership
                  </span>
                  <button
                    onClick={() => setIsEditingOwnership(!isEditingOwnership)}
                    style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Edit2 size={11} />
                    {isEditingOwnership ? 'Cancel' : 'Edit Owners'}
                  </button>
                </div>

                {!isEditingOwnership ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Project:</span> <strong style={{ color: 'var(--text-primary)' }}>{project.ownership?.projectOwner || 'Unassigned'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Packaging:</span> <strong style={{ color: 'var(--text-primary)' }}>{project.ownership?.packagingOwner || 'Unassigned'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Artwork:</span> <strong style={{ color: 'var(--text-primary)' }}>{project.ownership?.artworkOwner || 'Unassigned'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Procurement:</span> <strong style={{ color: 'var(--text-primary)' }}>{project.ownership?.procurementOwner || 'Unassigned'}</strong></div>
                    <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)' }}>Quality Assurance:</span> <strong style={{ color: 'var(--text-primary)' }}>{project.ownership?.qaOwner || 'Unassigned'}</strong></div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="text" className="form-control" placeholder="Project Owner (email)..."
                      value={ownershipForm.projectOwner} onChange={e => setOwnershipForm({ ...ownershipForm, projectOwner: e.target.value })}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    />
                    <input
                      type="text" className="form-control" placeholder="Packaging Owner (email)..."
                      value={ownershipForm.packagingOwner} onChange={e => setOwnershipForm({ ...ownershipForm, packagingOwner: e.target.value })}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    />
                    <input
                      type="text" className="form-control" placeholder="Artwork Owner (email)..."
                      value={ownershipForm.artworkOwner} onChange={e => setOwnershipForm({ ...ownershipForm, artworkOwner: e.target.value })}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    />
                    <input
                      type="text" className="form-control" placeholder="Procurement Owner (email)..."
                      value={ownershipForm.procurementOwner} onChange={e => setOwnershipForm({ ...ownershipForm, procurementOwner: e.target.value })}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    />
                    <input
                      type="text" className="form-control" placeholder="QA Owner (email)..."
                      value={ownershipForm.qaOwner} onChange={e => setOwnershipForm({ ...ownershipForm, qaOwner: e.target.value })}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleSaveOwnership} style={{ alignSelf: 'flex-end', fontSize: '11px' }}>
                      Save Ownership
                    </button>
                  </div>
                )}
              </div>

              {/* KEY METADATA GRID */}
              <div className="drawer-meta-grid">
                <div className="drawer-meta-cell">
                  <span className="drawer-meta-k">SUPPLIER</span>
                  <span className="drawer-meta-v">
                    <Truck size={12} style={{ opacity: 0.6 }} />
                    {activeMat?.supplier || project.supplier || 'TBD'}
                  </span>
                </div>
                <div className="drawer-meta-cell">
                  <span className="drawer-meta-k">LEAD TIME</span>
                  <span className="drawer-meta-v">
                    <Clock size={12} style={{ opacity: 0.6 }} />
                    {activeMat?.leadTime || 21} days
                  </span>
                </div>
                <div className="drawer-meta-cell">
                  <span className="drawer-meta-k">TARGET LAUNCH</span>
                  <span className="drawer-meta-v" style={{ color: 'var(--teal)' }}>
                    <Calendar size={12} style={{ opacity: 0.6 }} />
                    {fmt(project.targetLaunchDate || project.milestones?.Connectivity)}
                  </span>
                </div>
                <div className="drawer-meta-cell">
                  <span className="drawer-meta-k">DAYS LEFT</span>
                  <span className={`drawer-meta-v ${dl !== null && dl < 0 ? 'text-danger' : dl !== null && dl <= 2 ? 'text-warning' : ''}`}>
                    {dl !== null ? (dl > 0 ? `+${dl} days` : dl === 0 ? 'Due Today' : `${Math.abs(dl)}d Overdue`) : '—'}
                  </span>
                </div>
              </div>

              {/* PROMINENT NEXT ACTION */}
              <div className="drawer-next-action-card">
                <div className="dna-header">
                  <div className="dna-title">
                    <Zap size={14} style={{ color: 'var(--teal)' }} />
                    NEXT ACTION
                  </div>
                  <span className="dna-stage-pill">{currentStage} Stage</span>
                </div>
                <div className="dna-action-text">{nextActionText}</div>
                <div className="dna-footer">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      onClose();
                      if (onNavigateTab) onNavigateTab('tracker');
                    }}
                    style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                  >
                    <span>Execute Action in Tracker</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* STAGE PIPELINE */}
              <div className="drawer-section">
                <div className="drawer-section-title">
                  <span>STAGE PROGRESSION</span>
                </div>
                <div className="drawer-stage-flow">
                  <div className="ds-box ds-box-prev">
                    <span className="ds-lbl">PREVIOUS</span>
                    <span className="ds-val">{prevStage}</span>
                  </div>
                  <ChevronRight size={14} style={{ opacity: 0.4 }} />
                  <div className="ds-box ds-box-curr">
                    <span className="ds-lbl">CURRENT ACTIVE</span>
                    <span className="ds-val">{currentStage}</span>
                  </div>
                  <ChevronRight size={14} style={{ opacity: 0.4 }} />
                  <div className="ds-box ds-box-next">
                    <span className="ds-lbl">NEXT MILESTONE</span>
                    <span className="ds-val">{nextStage}</span>
                  </div>
                </div>
              </div>

              {/* ASSOCIATED MODULES */}
              <div className="drawer-section">
                <div className="drawer-section-title">
                  <span>ASSOCIATED MODULES</span>
                </div>
                <div className="drawer-modules-list">
                  <div className="drawer-module-row">
                    <div className="dm-info">
                      <div className="dm-title">
                        <FileText size={14} style={{ color: 'var(--teal)' }} />
                        <span>Specification Library</span>
                      </div>
                      <div className="dm-meta">
                        {specParamsCount > 0 ? `${specParamsCount} parameters defined` : 'Template available'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm drawer-module-btn"
                      onClick={() => {
                        onClose();
                        if (onNavigateTab) onNavigateTab('specs');
                      }}
                    >
                      <span>Open Specs</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>

                  <div className="drawer-module-row">
                    <div className="dm-info">
                      <div className="dm-title">
                        <Palette size={14} style={{ color: 'var(--warning)' }} />
                        <span>Artwork Approvals</span>
                      </div>
                      <div className="dm-meta">
                        AW: {awCode} · {awFiles.length} proof{awFiles.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm drawer-module-btn"
                      onClick={() => {
                        onClose();
                        if (onNavigateTab) onNavigateTab('artworks');
                      }}
                    >
                      <span>View Artwork</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: TASKS & APPROVALS */}
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Tasks Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckSquare size={14} style={{ color: 'var(--teal)' }} />
                    <span>Action Items ({tasks.length})</span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '11px', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: '3px' }}
                    onClick={() => setShowNewTaskForm(!showNewTaskForm)}
                  >
                    <Plus size={12} />
                    New Task
                  </button>
                </div>

                {showNewTaskForm && (
                  <form onSubmit={handleCreateTask} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text" className="form-control" placeholder="Action description..."
                      value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                      style={{ fontSize: '12px' }} required
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <select className="form-control" value={taskPriority} onChange={e => setTaskPriority(e.target.value)} style={{ fontSize: '11px', flex: 1 }}>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                      <select className="form-control" value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)} style={{ fontSize: '11px', flex: 1 }}>
                        <option value="">Assignee...</option>
                        {teamUsers.map(u => <option key={u.email} value={u.email}>{u.name || u.email}</option>)}
                      </select>
                      <input type="date" className="form-control" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} style={{ fontSize: '11px', flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewTaskForm(false)} style={{ fontSize: '11px' }}>Cancel</button>
                      <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: '11px' }}>Save Action</button>
                    </div>
                  </form>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '11px' }}>No active action items</div>
                  ) : (
                    tasks.map(t => (
                      <div key={t.id} style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px',
                        padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          <button
                            onClick={() => handleCompleteTask(t.id)}
                            style={{
                              width: '18px', height: '18px', borderRadius: '4px',
                              border: '1px solid', borderColor: t.status === 'COMPLETED' ? '#00e676' : 'var(--border-color)',
                              background: t.status === 'COMPLETED' ? '#00e676' : 'transparent', color: '#000',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                            }}
                          >
                            {t.status === 'COMPLETED' && <Check size={11} />}
                          </button>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: t.status === 'COMPLETED' ? 'line-through' : 'none' }}>{t.title}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Assigned: {t.assignedTo || 'Unassigned'} {t.dueDate ? `• Due: ${t.dueDate}` : ''}</div>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                          background: t.priority === 'Critical' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                          color: t.priority === 'Critical' ? '#ef4444' : 'var(--text-secondary)'
                        }}>
                          {t.priority}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Approvals Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} style={{ color: '#00e676' }} />
                    <span>Universal Approvals ({approvals.length})</span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '11px', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: '3px' }}
                    onClick={() => setShowNewAppForm(!showNewAppForm)}
                  >
                    <Plus size={12} />
                    Request Approval
                  </button>
                </div>

                {showNewAppForm && (
                  <form onSubmit={handleCreateApproval} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text" className="form-control" placeholder="Sign-off title (e.g. Master Artwork Sign-off)..."
                      value={appTitle} onChange={e => setAppTitle(e.target.value)}
                      style={{ fontSize: '12px' }} required
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <select className="form-control" value={appEntityType} onChange={e => setAppEntityType(e.target.value)} style={{ fontSize: '11px', flex: 1 }}>
                        <option value="ARTWORK">Artwork Proof</option>
                        <option value="SPECIFICATION">Spec Sign-off</option>
                        <option value="KLD">KLD Drawing</option>
                        <option value="VPDF">VPDF Approval</option>
                      </select>
                      <select className="form-control" value={appReviewer} onChange={e => setAppReviewer(e.target.value)} style={{ fontSize: '11px', flex: 1 }}>
                        <option value="">Reviewer...</option>
                        {teamUsers.map(u => <option key={u.email} value={u.email}>{u.name || u.email}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewAppForm(false)} style={{ fontSize: '11px' }}>Cancel</button>
                      <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: '11px' }}>Submit Request</button>
                    </div>
                  </form>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {approvals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '11px' }}>No approvals recorded yet</div>
                  ) : (
                    approvals.map(a => (
                      <div key={a.id} style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px',
                        padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{a.title}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                              background: a.status === 'APPROVED' ? 'rgba(0,230,118,0.2)' : (a.status === 'REJECTED' ? 'rgba(239,68,68,0.2)' : 'rgba(255,215,64,0.2)'),
                              color: a.status === 'APPROVED' ? '#00e676' : (a.status === 'REJECTED' ? '#ef4444' : '#ffd740')
                            }}>
                              {a.status}
                            </span>
                            {a.status === 'PENDING' && (
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '10px', padding: '2px 6px' }}
                                onClick={() => setDecisionApp(a)}
                              >
                                Sign
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Target: {a.entityType} ({a.entityId}) • Requested by {a.requestedBy}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RISKS */}
          {activeTab === 'risks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                  <span>Structured Risks ({risks.length})</span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '11px', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: '3px' }}
                  onClick={() => setShowNewRiskForm(!showNewRiskForm)}
                >
                  <Plus size={12} />
                  Log Risk
                </button>
              </div>

              {showNewRiskForm && (
                <form onSubmit={handleAddRisk} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text" className="form-control" placeholder="Risk description (e.g. Supplier lead-time delay)..."
                    value={riskTitle} onChange={e => setRiskTitle(e.target.value)}
                    style={{ fontSize: '12px' }} required
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select className="form-control" value={riskSeverity} onChange={e => setRiskSeverity(e.target.value)} style={{ fontSize: '11px', flex: 1 }}>
                      <option value="Critical">Critical Severity</option>
                      <option value="High">High Severity</option>
                      <option value="Medium">Medium Severity</option>
                      <option value="Low">Low Severity</option>
                    </select>
                    <select className="form-control" value={riskOwner} onChange={e => setRiskOwner(e.target.value)} style={{ fontSize: '11px', flex: 1 }}>
                      <option value="">Designated Owner...</option>
                      {teamUsers.map(u => <option key={u.email} value={u.email}>{u.name || u.email}</option>)}
                    </select>
                  </div>
                  <input
                    type="text" className="form-control" placeholder="Mitigation action (e.g. Confirm alternate capacity)..."
                    value={riskAction} onChange={e => setRiskAction(e.target.value)}
                    style={{ fontSize: '12px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewRiskForm(false)} style={{ fontSize: '11px' }}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: '11px' }}>Log Risk</button>
                  </div>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {risks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    No project risks recorded. All stages on track.
                  </div>
                ) : (
                  risks.map(r => (
                    <div key={r.id} style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px',
                      padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                            background: r.severity === 'Critical' ? 'rgba(239,68,68,0.2)' : 'rgba(255,109,0,0.2)',
                            color: r.severity === 'Critical' ? '#ef4444' : '#ff6d00'
                          }}>
                            {r.severity}
                          </span>
                          {r.status === 'Open' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '10px', padding: '1px 6px' }}
                              onClick={() => handleResolveRisk(r.id)}
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Stage: {r.stage} • Owner: {r.owner} {r.action ? `• Action: ${r.action}` : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: COMMENTS & MENTIONS */}
          {activeTab === 'comments' && (
            <ContextualComments
              contextType="PROJECT"
              contextId={project.id}
              projectId={project.id}
              currentUser={currentUser}
              teamUsers={teamUsers}
            />
          )}

        </div>

        {/* DECISION MODAL */}
        {decisionApp && (
          <div className="modal-backdrop" style={{ zIndex: 1250 }} onClick={() => setDecisionApp(null)}>
            <div className="modal-content" style={{ width: '420px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Decision: {decisionApp.title}</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setDecisionApp(null)}><X size={13} /></button>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  className="form-control"
                  placeholder="Decision comments or rejection feedback..."
                  value={decisionNotes}
                  onChange={e => setDecisionNotes(e.target.value)}
                  style={{ minHeight: '60px', fontSize: '11px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDecideApproval('REJECTED')} style={{ background: '#ef4444', color: '#fff', border: 'none', fontSize: '11px' }}>
                    Reject
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => handleDecideApproval('APPROVED')} style={{ background: '#00e676', color: '#000', border: 'none', fontSize: '11px', fontWeight: 600 }}>
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DRAWER FOOTER */}
        <div className="drawer-footer">
          <div className="df-meta">
            <span>Project ID: {project.id}</span>
            {project.factory && <span>· Factory: {project.factory}</span>}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
