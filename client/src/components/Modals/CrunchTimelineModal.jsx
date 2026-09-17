import React, { useState } from 'react';
import { STAGE_COLORS } from '../../constants';
import { fmt } from '../../utils';
import { calculateCrunchedTimeline } from '../../crunchUtils';
import {
  proposeCrunchTimeline,
  approveCrunchStage1,
  approveCrunchStage2,
  rejectCrunch
} from '../../api';

export default function CrunchTimelineModal({
  project,
  currentUser,
  onClose,
  onProjectUpdated,
  showToast
}) {
  const currentPlan = project?.crunchPlan;
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = ['admin', 'superadmin'].includes(currentUser?.role);

  const [customDate, setCustomDate] = useState(
    project?.targetLaunchDate || project?.milestones?.Connectivity || ''
  );
  const [stage1Comments, setStage1Comments] = useState('');
  const [stage2Comments, setStage2Comments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);

  // Live preview if custom date is modified
  const previewPlan = project ? calculateCrunchedTimeline(project, customDate) : null;
  const activePlan = currentPlan || previewPlan;

  const handleProposeDate = async () => {
    if (!customDate) return;
    setIsSubmitting(true);
    try {
      const res = await proposeCrunchTimeline(project.id, customDate);
      onProjectUpdated && onProjectUpdated(res.data.project);
      showToast && showToast('⚡ Crunched timeline proposal submitted for Admin approval');
    } catch (err) {
      showToast && showToast(err.response?.data?.error || 'Failed to update timeline', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveStage1 = async () => {
    setIsSubmitting(true);
    try {
      const res = await approveCrunchStage1(project.id, stage1Comments);
      onProjectUpdated && onProjectUpdated(res.data.project);
      showToast && showToast('✅ Stage 1 Admin approval granted! Sent to Super Admin for Stage 2');
    } catch (err) {
      showToast && showToast(err.response?.data?.error || 'Failed to approve Stage 1', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveStage2 = async () => {
    setIsSubmitting(true);
    try {
      const res = await approveCrunchStage2(project.id, stage2Comments);
      onProjectUpdated && onProjectUpdated(res.data.project);
      showToast && showToast('🚀 Final Super Admin approval granted! Crunched milestones are now active');
    } catch (err) {
      showToast && showToast(err.response?.data?.error || 'Failed to approve Stage 2', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast && showToast('Please enter a rejection reason', true);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await rejectCrunch(project.id, rejectReason);
      onProjectUpdated && onProjectUpdated(res.data.project);
      showToast && showToast('❌ Crunched proposal rejected. Reverted to standard timeline.');
      setShowRejectBox(false);
    } catch (err) {
      showToast && showToast(err.response?.data?.error || 'Failed to reject proposal', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const riskBadgeColor = {
    Low: '#10b981',
    Medium: '#f59e0b',
    High: '#f97316',
    Critical: '#ef4444'
  }[activePlan?.riskLevel || 'Low'] || '#ef4444';

  const status = currentPlan?.status || (activePlan?.isCrunched ? 'PROPOSED' : 'NONE');

  if (!project) return null;

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 1050, display: 'flex' }}>
      <div
        className="modal-card modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 'min(960px, 95vw)',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '20px' }}>⚡</span>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--white)' }}>
                Crunched Launch Timeline &amp; Reverse Calculation
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: `${riskBadgeColor}20`,
                  color: riskBadgeColor,
                  border: `1px solid ${riskBadgeColor}40`
                }}
              >
                {activePlan?.riskLevel ? `${activePlan.riskLevel.toUpperCase()} RISK` : 'STANDARD'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--white-dim)' }}>
              Project: <strong style={{ color: 'var(--teal)' }}>{project.projectName}</strong>
              {project.fgCode && <span> · FG: <strong style={{ fontFamily: 'var(--mono)', color: 'var(--cyan)' }}>{project.fgCode}</strong></span>}
              <span> · Current Stage: <strong style={{ color: STAGE_COLORS[project.stage || 'Brief'] }}>{project.stage || 'Brief'}</strong></span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '16px', padding: '4px 8px' }}>✕</button>
        </div>

        {/* Action Gating Notice Banner */}
        {(status === 'PENDING_STAGE1' || status === 'PENDING_STAGE2') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              marginBottom: '20px',
              color: '#fca5a5'
            }}
          >
            <span style={{ fontSize: '22px' }}>🔒</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '800', fontSize: '12.5px', color: '#f87171' }}>
                Progression Gated — Action Paused
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--white-dim)', marginTop: '2px' }}>
                This project has a crunched timeline awaiting{' '}
                <strong>{status === 'PENDING_STAGE1' ? 'Stage 1 (Admin Review)' : 'Stage 2 (Super Admin Final Approval)'}</strong>.
                Updaters and Admins cannot advance the stage until Super Admin gives final approval.
              </div>
            </div>
          </div>
        )}

        {/* Comparison KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--navy-light)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--white-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
              Est. Ready (Standard)
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'var(--mono)', marginTop: '4px', color: 'var(--teal)' }}>
              {fmt(project.milestones?.Connectivity)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--white-dim)', marginTop: '2px' }}>Across process lead times</div>
          </div>

          <div style={{ background: 'var(--navy-light)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
            <div style={{ fontSize: '10px', color: 'var(--cyan)', textTransform: 'uppercase', fontWeight: '700' }}>
              Target Launch (Crunched)
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'var(--mono)', marginTop: '4px', color: 'var(--cyan)' }}>
              {fmt(project.targetLaunchDate)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--white-dim)', marginTop: '2px' }}>Fed expedited deadline</div>
          </div>

          <div style={{ background: 'var(--navy-light)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--white-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
              Timeline Crunched
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'var(--mono)', marginTop: '4px', color: activePlan?.daysSaved > 0 ? '#ef4444' : 'var(--green)' }}>
              {activePlan?.daysSaved > 0 ? `-${activePlan.daysSaved} Days` : '0 Days'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--white-dim)', marginTop: '2px' }}>Net compression required</div>
          </div>

          <div style={{ background: 'var(--navy-light)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--white-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
              Approval State
            </div>
            <div style={{ fontSize: '13px', fontWeight: '800', marginTop: '6px', color: status === 'APPROVED' ? 'var(--green)' : status.startsWith('PENDING') ? 'var(--amber)' : 'var(--white-dim)' }}>
              {status === 'PENDING_STAGE1' && '⏳ S1 Admin Review'}
              {status === 'PENDING_STAGE2' && '⏳ S2 Super Admin'}
              {status === 'APPROVED' && '✅ Approved & Active'}
              {status === 'REJECTED' && '❌ Rejected'}
              {status === 'PROPOSED' && '⚡ New Proposal'}
              {status === 'NONE' && '— Standard'}
            </div>
          </div>
        </div>

        {/* Target Launch Date Input & Adjuster */}
        <div style={{ background: 'rgba(2, 132, 199, 0.07)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: '8px', padding: '14px 16px', marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--cyan)', marginBottom: '8px' }}>
            📅 Adjust Target Launch Timeline (Feeds Reverse Calculation)
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="date"
              className="modern-form-input"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              style={{ width: '180px', fontSize: '12px', padding: '6px 10px' }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleProposeDate}
              disabled={isSubmitting || customDate === project.targetLaunchDate}
              style={{ fontSize: '11px', padding: '7px 14px' }}
            >
              {isSubmitting ? 'Calculating...' : '⚡ Submit Crunch Proposal'}
            </button>
            <span style={{ fontSize: '11px', color: 'var(--white-dim)' }}>
              Standard Est. Ready is {fmt(project.milestones?.Connectivity)}. Setting an earlier date reverse calculates compression.
            </span>
          </div>
        </div>

        {/* Reverse Timeline Breakdown Table */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📊 Reverse Stage Calculation &amp; Risk Factor Analysis
            </div>
            {activePlan?.isExcessive && (
              <span style={{ fontSize: '10.5px', color: '#ef4444', fontWeight: '700', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                ⚠️ Warning: Requested date exceeds technical compression limits!
              </span>
            )}
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <table className="modern-mat-table" style={{ width: '100%', tableLayout: 'fixed', minWidth: '820px' }}>
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Stage</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Std Duration</th>
                  <th style={{ width: '95px', textAlign: 'center' }}>Crunched</th>
                  <th style={{ width: '85px', textAlign: 'center' }}>Saved</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>New Milestone</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Risk Level</th>
                  <th>Identified Packaging Risk &amp; Mandatory Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {activePlan?.stages && activePlan.stages.length > 0 ? (
                  activePlan.stages.map(s => {
                    const isComp = s.daysSaved > 0;
                    const rCol = { Normal: '#10b981', High: '#f97316', Critical: '#ef4444' }[s.riskLevel] || '#94a3b8';
                    return (
                      <tr key={s.stage} style={{ background: isComp ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                        <td>
                          <span
                            className="stage-badge"
                            style={{
                              background: `${STAGE_COLORS[s.stage]}18`,
                              border: `1px solid ${STAGE_COLORS[s.stage]}40`,
                              color: STAGE_COLORS[s.stage]
                            }}
                          >
                            <span className="stage-dot" style={{ background: STAGE_COLORS[s.stage] }}></span>
                            {s.stage}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--white-dim)' }}>
                          {s.standardDays}d
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: '700', color: isComp ? '#f87171' : 'var(--white)' }}>
                          {s.crunchedDays}d
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isComp ? (
                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                              -{s.daysSaved}d
                            </span>
                          ) : (
                            <span style={{ color: 'var(--green)', fontSize: '11px' }}>✓ 0d</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '11px', color: isComp ? 'var(--cyan)' : 'var(--white-dim)' }}>
                          {fmt(s.milestoneDate)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '9.5px', fontWeight: '800', color: rCol, textTransform: 'uppercase' }}>
                            {s.riskLevel}
                          </span>
                        </td>
                        <td style={{ fontSize: '11px', lineHeight: '1.4' }}>
                          <div style={{ fontWeight: '700', color: isComp ? '#fca5a5' : 'var(--white-dim)' }}>
                            {s.riskTitle}
                          </div>
                          <div style={{ color: 'var(--white-dim)', fontSize: '10px', marginTop: '1px' }}>
                            {s.riskDescription}
                          </div>
                          {isComp && (
                            <div style={{ color: '#38bdf8', fontSize: '9.5px', marginTop: '3px' }}>
                              <strong>Mitigation:</strong> {s.mitigation}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '16px', color: 'var(--white-dim)' }}>
                      No active crunch proposal. Enter an expedited launch date above to calculate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2-Stage Multi-Admin Approval Workflow Card */}
        <div style={{ background: 'var(--navy-light)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px 20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛡</span> 2-Stage Multi-Admin Approval Governance
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* STEP 1: Stage 1 Admin Review */}
            <div
              style={{
                border: '1px solid',
                borderColor: currentPlan?.stage1?.approved ? '#10b981' : status === 'PENDING_STAGE1' ? '#f59e0b' : 'var(--border)',
                background: currentPlan?.stage1?.approved ? 'rgba(16, 185, 129, 0.05)' : status === 'PENDING_STAGE1' ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                borderRadius: '8px',
                padding: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontWeight: '800', fontSize: '12px', color: 'var(--white)' }}>
                  Stage 1: Admin Approval
                </div>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: currentPlan?.stage1?.approved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: currentPlan?.stage1?.approved ? '#10b981' : '#f59e0b'
                  }}
                >
                  {currentPlan?.stage1?.approved ? '✓ APPROVED' : status === 'PENDING_STAGE1' ? '⏳ PENDING' : 'AWAITING PROPOSAL'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--white-dim)', marginBottom: '8px' }}>
                Authorized: <strong>Balaji Sathishkumar (Regular PM)</strong> or <strong>Growth PM</strong>.
              </div>

              {currentPlan?.stage1?.approved ? (
                <div style={{ fontSize: '11px', color: 'var(--teal)' }}>
                  <div>Approved by: <strong>{currentPlan.stage1.approvedBy}</strong> ({currentPlan.stage1.approvedByRole})</div>
                  <div style={{ fontSize: '10px', color: 'var(--white-dim)' }}>At: {new Date(currentPlan.stage1.approvedAt).toLocaleString()}</div>
                  {currentPlan.stage1.comments && (
                    <div style={{ fontSize: '10.5px', color: 'var(--white)', marginTop: '4px', fontStyle: 'italic' }}>
                      "{currentPlan.stage1.comments}"
                    </div>
                  )}
                </div>
              ) : status === 'PENDING_STAGE1' ? (
                <div>
                  {isAdmin ? (
                    <div>
                      <input
                        className="modern-form-input"
                        placeholder="Admin sign-off comments..."
                        value={stage1Comments}
                        onChange={e => setStage1Comments(e.target.value)}
                        style={{ fontSize: '11px', padding: '6px 8px', marginBottom: '8px', width: '100%' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={handleApproveStage1}
                          disabled={isSubmitting}
                          style={{ fontSize: '11px', flex: 1, justifyContent: 'center' }}
                        >
                          ✓ Approve Stage 1 (Admin)
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setShowRejectBox(true)}
                          style={{ fontSize: '11px', color: '#ef4444' }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--amber)', fontStyle: 'italic' }}>
                      ⏳ Awaiting Project Manager sign-off. (Login as Balaji or Growth PM to approve).
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--white-dim)' }}>
                  No crunched timeline proposal pending review.
                </div>
              )}
            </div>

            {/* STEP 2: Stage 2 Super Admin Sign-off */}
            <div
              style={{
                border: '1px solid',
                borderColor: currentPlan?.stage2?.approved ? '#10b981' : status === 'PENDING_STAGE2' ? '#a855f7' : 'var(--border)',
                background: currentPlan?.stage2?.approved ? 'rgba(16, 185, 129, 0.05)' : status === 'PENDING_STAGE2' ? 'rgba(168, 85, 247, 0.05)' : 'transparent',
                borderRadius: '8px',
                padding: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontWeight: '800', fontSize: '12px', color: 'var(--white)' }}>
                  Stage 2: Super Admin Sign-Off
                </div>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: currentPlan?.stage2?.approved ? 'rgba(16, 185, 129, 0.2)' : status === 'PENDING_STAGE2' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                    color: currentPlan?.stage2?.approved ? '#10b981' : status === 'PENDING_STAGE2' ? '#c084fc' : 'var(--white-dim)'
                  }}
                >
                  {currentPlan?.stage2?.approved ? '✓ FINAL APPROVED' : status === 'PENDING_STAGE2' ? '⏳ PENDING S2' : '🔒 LOCKED (REQUIRES S1)'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--white-dim)', marginBottom: '8px' }}>
                Authorized: <strong>Alexsander (Packaging Head / Super Admin)</strong> (Unlocks progression gate).
              </div>

              {currentPlan?.stage2?.approved ? (
                <div style={{ fontSize: '11px', color: 'var(--teal)' }}>
                  <div>Approved by: <strong>{currentPlan.stage2.approvedBy}</strong></div>
                  <div style={{ fontSize: '10px', color: 'var(--white-dim)' }}>At: {new Date(currentPlan.stage2.approvedAt).toLocaleString()}</div>
                  {currentPlan.stage2.comments && (
                    <div style={{ fontSize: '10.5px', color: 'var(--white)', marginTop: '4px', fontStyle: 'italic' }}>
                      "{currentPlan.stage2.comments}"
                    </div>
                  )}
                </div>
              ) : status === 'PENDING_STAGE2' ? (
                <div>
                  {isSuperAdmin ? (
                    <div>
                      <input
                        className="modern-form-input"
                        placeholder="Super Admin final remarks..."
                        value={stage2Comments}
                        onChange={e => setStage2Comments(e.target.value)}
                        style={{ fontSize: '11px', padding: '6px 8px', marginBottom: '8px', width: '100%' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={handleApproveStage2}
                          disabled={isSubmitting}
                          style={{ fontSize: '11px', flex: 1, justifyContent: 'center', background: '#7c3aed', borderColor: '#7c3aed' }}
                        >
                          🚀 Final Sign-Off (Super Admin)
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setShowRejectBox(true)}
                          style={{ fontSize: '11px', color: '#ef4444' }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#c084fc', fontStyle: 'italic' }}>
                      ⏳ Stage 1 passed! Awaiting Super Admin final sign-off. (Login as Super Admin to finalize).
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--white-dim)' }}>
                  Stage 2 unlock requires Stage 1 Admin approval first.
                </div>
              )}
            </div>
          </div>

          {/* Rejection Prompt Box */}
          {showRejectBox && (
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#f87171', marginBottom: '6px' }}>
                Reject Crunched Timeline Proposal
              </div>
              <input
                className="modern-form-input"
                placeholder="Reason for rejecting crunched timeline..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{ fontSize: '11px', width: '100%', marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary btn-sm" onClick={handleReject} disabled={isSubmitting} style={{ background: '#ef4444', borderColor: '#ef4444', fontSize: '11px' }}>
                  Confirm Rejection
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowRejectBox(false)} style={{ fontSize: '11px' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
