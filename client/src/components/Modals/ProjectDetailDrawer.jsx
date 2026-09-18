import React, { useState, useEffect } from 'react';
import {
  X, Copy, Check, Star, ArrowRight, FileText, Palette, AlertTriangle,
  Calendar, Clock, ShieldCheck, ChevronRight, Truck, Factory, Zap, Building
} from 'lucide-react';
import {
  STAGE_ORDER, STAGE_COLORS, fmt, getProjectStage, getDaysLeft,
  getLTStatus, getArtworkCode, hasArtwork, getArtworkFiles,
  determineCPMIndex, getNextAction, daysFromNow, getMaterialHierarchyTier, getTierName
} from '../../utils';

export default function ProjectDetailDrawer({
  isOpen,
  project,
  materialIndex = null,
  currentUser,
  onClose,
  onOpenSpecModal,
  onOpenArtworkModal,
  onOpenCrunchModal,
  onNavigateTab,
  onOpenNotif,
  showToast
}) {
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        
        {/* DRAWER HEADER */}
        <div className="drawer-header">
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
            <div className="drawer-code-bar">
              <span className="drawer-code-label">PM CODE:</span>
              <span className="drawer-code-value">{pmCode}</span>
              <button className="drawer-copy-btn" onClick={handleCopyPM} title="Copy code">
                {copied ? <Check size={12} style={{ color: 'var(--teal)' }} /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>

        {/* DRAWER BODY (SCROLLABLE) */}
        <div className="drawer-body">

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

          {/* DEVELOPMENT PIPELINE (WORKFLOW CLARITY) */}
          <div className="drawer-section">
            <div className="drawer-section-title">
              <span>DEVELOPMENT PIPELINE</span>
              <span className="drawer-section-subtitle">Workflow progression</span>
            </div>

            <div className="drawer-pipeline-flow">
              {STAGE_ORDER.map((stg, sIdx) => {
                const isPast = sIdx < curStageIdx;
                const isCurrent = sIdx === curStageIdx;
                const isFuture = sIdx > curStageIdx;
                const isBlockedStage = isCurrent && isDelayed;

                let marker = isPast ? <Check size={10} strokeWidth={3} /> : isCurrent ? '●' : '○';
                let cls = 'step-upcoming';
                if (isPast) {
                  cls = 'step-completed';
                } else if (isBlockedStage) {
                  marker = '!';
                  cls = 'step-blocked';
                } else if (isCurrent) {
                  cls = 'step-current';
                }

                return (
                  <div key={stg} className={`drawer-pipe-item ${cls}`}>
                    <div className="pipe-marker">{marker}</div>
                    <div className="pipe-text">
                      <div className="pipe-name">{stg}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isCurrent && <span className="pipe-current-tag">Current</span>}
                        <div className="pipe-date">
                          {fmt(activeMat?.milestones?.[stg] || project.milestones?.[stg])}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STAGE CONTEXT TRIAD */}
          <div className="drawer-section">
            <div className="drawer-section-title">STAGE CONTEXT</div>
            <div className="drawer-stage-triad">
              <div className="stage-triad-col">
                <span className="triad-lbl">PREVIOUS</span>
                <span className="triad-val">{prevStage}</span>
              </div>
              <div className="stage-triad-col active-stage-col">
                <span className="triad-lbl">CURRENT</span>
                <span className="triad-val text-teal" style={{ color: STAGE_COLORS[currentStage] || 'var(--teal)' }}>
                  {currentStage}
                </span>
              </div>
              <div className="stage-triad-col">
                <span className="triad-lbl">NEXT</span>
                <span className="triad-val">{nextStage}</span>
              </div>
            </div>
          </div>

          {/* CONNECTED MODULES (REAL DATA CONNECTIONS) */}
          <div className="drawer-section">
            <div className="drawer-section-title">CONNECTED MODULES</div>
            <div className="drawer-modules-list">
              
              {/* SPECIFICATIONS */}
              <div className="drawer-module-row">
                <div className="dm-info">
                  <div className="dm-title">
                    <FileText size={14} style={{ color: 'var(--teal)' }} />
                    <span>Specifications</span>
                  </div>
                  <div className="dm-meta">
                    {specParamsCount > 0 ? `${specParamsCount} parameters defined` : 'Official Yoga Bar Spec Sheet'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm drawer-module-btn"
                  onClick={() => {
                    onClose();
                    if (onOpenSpecModal) onOpenSpecModal(project.id, activeMatIdx);
                  }}
                >
                  <span>Open Specs</span>
                  <ArrowRight size={11} />
                </button>
              </div>

              {/* ARTWORK */}
              <div className="drawer-module-row">
                <div className="dm-info">
                  <div className="dm-title">
                    <Palette size={14} style={{ color: 'var(--teal)' }} />
                    <span>Artwork Proofs</span>
                  </div>
                  <div className="dm-meta">
                    Code: {awCode} · {awFiles.length} file{awFiles.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm drawer-module-btn"
                  onClick={() => {
                    onClose();
                    if (onOpenArtworkModal) onOpenArtworkModal(project, activeMat, activeMatIdx);
                  }}
                >
                  <span>Open Artwork</span>
                  <ArrowRight size={11} />
                </button>
              </div>

              {/* RISKS */}
              <div className="drawer-module-row">
                <div className="dm-info">
                  <div className="dm-title">
                    <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
                    <span>Risk Register</span>
                  </div>
                  <div className="dm-meta">
                    Level: {project.risk || 'Standard'} risk
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm drawer-module-btn"
                  onClick={() => {
                    onClose();
                    if (onNavigateTab) onNavigateTab('risks');
                  }}
                >
                  <span>View Risks</span>
                  <ArrowRight size={11} />
                </button>
              </div>

              {/* TIMELINE */}
              <div className="drawer-module-row">
                <div className="dm-info">
                  <div className="dm-title">
                    <Calendar size={14} style={{ color: 'var(--info)' }} />
                    <span>Gantt Timeline</span>
                  </div>
                  <div className="dm-meta">
                    12-Week rollout calendar & milestones
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm drawer-module-btn"
                  onClick={() => {
                    onClose();
                    if (onNavigateTab) onNavigateTab('gantt');
                  }}
                >
                  <span>Open Gantt</span>
                  <ArrowRight size={11} />
                </button>
              </div>

              {/* RECENT ACTIVITY */}
              <div className="drawer-module-row">
                <div className="dm-info">
                  <div className="dm-title">
                    <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>Activity Logs</span>
                  </div>
                  <div className="dm-meta">
                    Audit trail & stage advancements
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm drawer-module-btn"
                  onClick={() => {
                    onClose();
                    if (onOpenNotif) onOpenNotif();
                  }}
                >
                  <span>View Logs</span>
                  <ArrowRight size={11} />
                </button>
              </div>

            </div>
          </div>

        </div>

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
