import React, { useState, useEffect } from 'react';
import { CheckSquare, ShieldCheck, Plus, Check, AlertTriangle, Clock, User, X, ChevronRight, MessageSquare, History } from 'lucide-react';
import { getTasks, createTask, updateTask, completeTask, deleteTask, getApprovals, requestApproval, decideApproval } from '../../api';
import { timeAgo } from '../../utils';

export default function TaskManagerModal({
  isOpen,
  onClose,
  project,
  currentUser,
  teamUsers = [],
  onProjectUpdated
}) {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'approvals'
  const [tasks, setTasks] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState('ALL'); // ALL, PENDING, IN_PROGRESS, BLOCKED, COMPLETED

  // New task form state
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskMaterial, setTaskMaterial] = useState('');
  const [taskStage, setTaskStage] = useState('');

  // New approval form state
  const [showNewAppForm, setShowNewAppForm] = useState(false);
  const [appTitle, setAppTitle] = useState('');
  const [appEntityType, setAppEntityType] = useState('ARTWORK');
  const [appEntityId, setAppEntityId] = useState('');
  const [appReviewer, setAppReviewer] = useState('');
  const [appComments, setAppComments] = useState('');

  // Decision modal state
  const [activeDecisionApp, setActiveDecisionApp] = useState(null);
  const [decisionComments, setDecisionComments] = useState('');
  const [selectedHistoryApp, setSelectedHistoryApp] = useState(null);

  useEffect(() => {
    if (isOpen && project?.id) {
      loadData();
    }
  }, [isOpen, project?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, appRes] = await Promise.all([
        getTasks({ projectId: project.id }),
        getApprovals({ projectId: project.id })
      ]);
      if (tasksRes.data?.success) setTasks(tasksRes.data.tasks || []);
      if (appRes.data?.success) setApprovals(appRes.data.approvals || []);
    } catch (err) {
      console.warn('Failed loading tasks/approvals:', err.message);
    } finally {
      setLoading(false);
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
        description: taskDescription.trim(),
        stage: taskStage || project.stage,
        assignedTo: taskAssignee || null,
        dueDate: taskDueDate || null,
        priority: taskPriority
      });
      if (res.data?.success) {
        setTasks(prev => [res.data.task, ...prev]);
        setTaskTitle('');
        setTaskDescription('');
        setShowNewTaskForm(false);
        if (onProjectUpdated) onProjectUpdated();
      }
    } catch (err) {
      alert('Failed to create task: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const res = await completeTask(taskId);
      if (res.data?.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? res.data.task : t));
        if (onProjectUpdated) onProjectUpdated();
      }
    } catch (err) {
      alert('Failed to complete task: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await updateTask(taskId, { status: newStatus });
      if (res.data?.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? res.data.task : t));
        if (onProjectUpdated) onProjectUpdated();
      }
    } catch (err) {
      alert('Failed updating task: ' + (err.response?.data?.error || err.message));
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
        if (onProjectUpdated) onProjectUpdated();
      }
    } catch (err) {
      alert('Failed requesting approval: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDecide = async (decision) => {
    if (!activeDecisionApp) return;
    try {
      const res = await decideApproval(activeDecisionApp.id, {
        decision,
        comments: decisionComments.trim()
      });
      if (res.data?.success) {
        setApprovals(prev => prev.map(a => a.id === activeDecisionApp.id ? res.data.approval : a));
        setActiveDecisionApp(null);
        setDecisionComments('');
        if (onProjectUpdated) onProjectUpdated();
      }
    } catch (err) {
      alert('Failed to record decision: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!isOpen) return null;

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'ALL') return true;
    return t.status === taskFilter;
  });

  return (
    <div className="modal-backdrop" style={{ zIndex: 1150 }} onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '740px', maxWidth: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', background: 'var(--teal)', color: '#000', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                {project.id}
              </span>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {project.projectName}
              </h3>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
              Execution Control: Action Items, Deadlines & Universal Approvals
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-color)' }}>
              <button
                className={`btn btn-sm ${activeTab === 'tasks' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setActiveTab('tasks')}
              >
                <CheckSquare size={13} />
                Actions ({tasks.length})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'approvals' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setActiveTab('approvals')}
              >
                <ShieldCheck size={13} />
                Approvals ({approvals.length})
              </button>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab 1: Tasks & Action Items */}
        {activeTab === 'tasks' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Filter toolbar & New Task Button */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                {['ALL', 'PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'].map(status => (
                  <button
                    key={status}
                    onClick={() => setTaskFilter(status)}
                    style={{
                      padding: '3px 8px', borderRadius: '12px', border: '1px solid',
                      borderColor: taskFilter === status ? 'var(--teal)' : 'var(--border-color)',
                      background: taskFilter === status ? 'rgba(0,176,255,0.12)' : 'transparent',
                      color: taskFilter === status ? 'var(--teal)' : 'var(--text-secondary)',
                      fontSize: '11px', cursor: 'pointer'
                    }}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <button
                className="btn btn-primary btn-sm"
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setShowNewTaskForm(!showNewTaskForm)}
              >
                <Plus size={13} />
                New Action Item
              </button>
            </div>

            {/* New Task Inline Form */}
            {showNewTaskForm && (
              <form onSubmit={handleCreateTask} style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Action description (e.g. Approve VPDF, Review Shade Card)..."
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    style={{ flex: 2, fontSize: '12px' }}
                    required
                  />
                  <select
                    className="form-control"
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value)}
                    style={{ flex: 1, fontSize: '12px' }}
                  >
                    <option value="Critical">Critical Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="form-control"
                    value={taskAssignee}
                    onChange={e => setTaskAssignee(e.target.value)}
                    style={{ flex: 1, fontSize: '12px' }}
                  >
                    <option value="">Assign to team member...</option>
                    {teamUsers.map(u => (
                      <option key={u.email} value={u.email}>{u.name || u.email} ({u.role})</option>
                    ))}
                  </select>

                  <select
                    className="form-control"
                    value={taskMaterial}
                    onChange={e => setTaskMaterial(e.target.value)}
                    style={{ flex: 1, fontSize: '12px' }}
                  >
                    <option value="">Related component (optional)...</option>
                    {(project.materials || []).map(m => (
                      <option key={m.name} value={m.name}>{m.name} ({m.type})</option>
                    ))}
                  </select>

                  <input
                    type="date"
                    className="form-control"
                    value={taskDueDate}
                    onChange={e => setTaskDueDate(e.target.value)}
                    style={{ flex: 1, fontSize: '12px' }}
                    title="Action Due Date"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewTaskForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm">Create Action</button>
                </div>
              </form>
            )}

            {/* Task list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No tasks matching current filter. Click "New Action Item" to assign work.
                </div>
              ) : (
                filteredTasks.map(t => {
                  const isBlocked = t.status === 'BLOCKED';
                  const isDone = t.status === 'COMPLETED';

                  return (
                    <div
                      key={t.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid',
                        borderColor: isBlocked ? '#ef4444' : (isDone ? 'var(--border-color)' : 'rgba(0,176,255,0.2)'),
                        borderRadius: '6px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        opacity: isDone ? 0.7 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <button
                          onClick={() => handleCompleteTask(t.id)}
                          style={{
                            width: '20px', height: '20px', borderRadius: '4px',
                            border: '1px solid', borderColor: isDone ? '#00e676' : 'var(--border-color)',
                            background: isDone ? '#00e676' : 'transparent', color: '#000',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                          }}
                          title={isDone ? 'Completed' : 'Mark as complete'}
                        >
                          {isDone && <Check size={13} />}
                        </button>

                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
                            textDecoration: isDone ? 'line-through' : 'none'
                          }}>
                            {t.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
                            <span>Assigned: <strong style={{ color: 'var(--text-primary)' }}>{t.assignedTo || 'Unassigned'}</strong></span>
                            {t.dueDate && <span>Due: <strong style={{ color: 'var(--text-primary)' }}>{t.dueDate}</strong></span>}
                            {t.materialId && <span>Material: {t.materialId}</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                          background: t.priority === 'Critical' ? 'rgba(239,68,68,0.2)' : (t.priority === 'High' ? 'rgba(255,109,0,0.2)' : 'rgba(255,255,255,0.06)'),
                          color: t.priority === 'Critical' ? '#ef4444' : (t.priority === 'High' ? '#ff6d00' : 'var(--text-secondary)'),
                          fontWeight: 600
                        }}>
                          {t.priority}
                        </span>

                        <select
                          value={t.status}
                          onChange={e => handleStatusChange(t.id, e.target.value)}
                          style={{
                            fontSize: '11px', padding: '3px 6px', borderRadius: '4px',
                            background: 'var(--bg-elevated, #1e293b)', color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)', cursor: 'pointer'
                          }}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="BLOCKED">Blocked</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Universal Approvals */}
        {activeTab === 'approvals' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header action */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Immutable Sign-off Records: Artwork, Specs, KLD & VPDF
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setShowNewAppForm(!showNewAppForm)}
              >
                <Plus size={13} />
                Request Approval
              </button>
            </div>

            {/* New Approval Request Form */}
            {showNewAppForm && (
              <form onSubmit={handleCreateApproval} style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Approval title (e.g. Master Artwork Sign-off)..."
                    value={appTitle}
                    onChange={e => setAppTitle(e.target.value)}
                    style={{ flex: 2, fontSize: '12px' }}
                    required
                  />
                  <select
                    className="form-control"
                    value={appEntityType}
                    onChange={e => setAppEntityType(e.target.value)}
                    style={{ flex: 1, fontSize: '12px' }}
                  >
                    <option value="ARTWORK">Artwork Proof</option>
                    <option value="SPECIFICATION">Technical Specification</option>
                    <option value="KLD">Key Line Drawing (KLD)</option>
                    <option value="VPDF">Vendor Digital Proof (VPDF)</option>
                    <option value="STAGE">Stage Advancement Gate</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="form-control"
                    value={appEntityId}
                    onChange={e => setAppEntityId(e.target.value)}
                    style={{ flex: 1, fontSize: '12px' }}
                  >
                    <option value="">Select packaging component...</option>
                    {(project.materials || []).map(m => (
                      <option key={m.name} value={m.name}>{m.name} ({m.type})</option>
                    ))}
                  </select>

                  <select
                    className="form-control"
                    value={appReviewer}
                    onChange={e => setAppReviewer(e.target.value)}
                    style={{ flex: 1, fontSize: '12px' }}
                  >
                    <option value="">Designated Reviewer (optional)...</option>
                    {teamUsers.map(u => (
                      <option key={u.email} value={u.email}>{u.name || u.email} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <textarea
                  className="form-control"
                  placeholder="Review notes and compliance verification criteria..."
                  value={appComments}
                  onChange={e => setAppComments(e.target.value)}
                  style={{ fontSize: '12px', minHeight: '50px' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewAppForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm">Submit Request</button>
                </div>
              </form>
            )}

            {/* Approvals list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {approvals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No approvals requested for this project yet.
                </div>
              ) : (
                approvals.map(app => {
                  const isApproved = app.status === 'APPROVED';
                  const isRejected = app.status === 'REJECTED';
                  const isPending = app.status === 'PENDING';

                  return (
                    <div
                      key={app.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid',
                        borderColor: isApproved ? 'rgba(0,230,118,0.3)' : (isRejected ? 'rgba(239,68,68,0.3)' : 'rgba(255,215,64,0.3)'),
                        borderRadius: '6px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                            background: isApproved ? 'rgba(0,230,118,0.15)' : (isRejected ? 'rgba(239,68,68,0.15)' : 'rgba(255,215,64,0.15)'),
                            color: isApproved ? '#00e676' : (isRejected ? '#ef4444' : '#ffd740'),
                            fontWeight: 700
                          }}>
                            {app.status}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{app.title}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isPending && (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              onClick={() => setActiveDecisionApp(app)}
                            >
                              Review & Sign
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '3px' }}
                            onClick={() => setSelectedHistoryApp(app)}
                            title="View full decision cycle history"
                          >
                            <History size={12} />
                            History ({app.history?.length || 1})
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        <span>Target: <strong style={{ color: 'var(--text-primary)' }}>{app.entityType} ({app.entityId})</strong></span>
                        <span>Requested by: {app.requestedBy}</span>
                        {app.reviewer && <span>Reviewer: {app.reviewer}</span>}
                        <span>Date: {timeAgo(app.requestedAt)}</span>
                      </div>

                      {app.comments && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '4px' }}>
                          "{app.comments}"
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Decision Modal Popover */}
        {activeDecisionApp && (
          <div className="modal-backdrop" style={{ zIndex: 1250 }} onClick={() => setActiveDecisionApp(null)}>
            <div className="modal-content" style={{ width: '480px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Decision: {activeDecisionApp.title}</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveDecisionApp(null)}><X size={14} /></button>
              </div>
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Record your formal decision for <strong>{activeDecisionApp.entityType}</strong> ({activeDecisionApp.entityId}).
                  This decision is immutable and permanently logged in the audit trail.
                </div>
                <textarea
                  className="form-control"
                  placeholder="Decision comments, legal disclaimers, or rejection feedback..."
                  value={decisionComments}
                  onChange={e => setDecisionComments(e.target.value)}
                  style={{ minHeight: '80px', fontSize: '12px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDecide('REJECTED')}
                    style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                  >
                    Reject with Feedback
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleDecide('APPROVED')}
                    style={{ background: '#00e676', color: '#000', border: 'none', fontWeight: 600 }}
                  >
                    Grant Formal Approval
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Modal Popover */}
        {selectedHistoryApp && (
          <div className="modal-backdrop" style={{ zIndex: 1250 }} onClick={() => setSelectedHistoryApp(null)}>
            <div className="modal-content" style={{ width: '520px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Approval History: {selectedHistoryApp.title}</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedHistoryApp(null)}><X size={14} /></button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(selectedHistoryApp.history || []).map((h, i) => (
                  <div key={i} style={{ borderLeft: '2px solid var(--teal)', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                      <strong style={{ color: h.decision === 'APPROVED' ? '#00e676' : (h.decision === 'REJECTED' ? '#ef4444' : 'var(--teal)') }}>
                        {h.decision || h.action}
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{timeAgo(h.date)}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      By: {h.reviewer || h.requestedBy} {h.reviewerRole ? `(${h.reviewerRole})` : ''}
                    </div>
                    {h.comments && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        "{h.comments}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
