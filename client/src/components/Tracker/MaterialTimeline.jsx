import React, { useState, useEffect, useRef } from 'react';
import { Package, Truck, Palette, FileText, Check, X, Edit2, Play, RotateCcw, Building, Copy, MoreVertical, ArrowRight, ChevronRight } from 'lucide-react';
import { STAGE_COLORS, fmt, daysFromNow, printCls, getArtworkCode, hasArtwork } from '../../utils';
import {
  getSpecFields, isPouch, getMaterialLeadTime, POUCH_PRINT_LEAD,
  PO_ACTIONS, PO_CONFIG, determineCPMIndex, getMaterialHierarchyTier, getTierName,
  getMaterialDisplaySubtitle
} from '../../constants';
import {
  updateMaterialPMCode, updateMaterialSupplier, updateMaterialPrintType, updateMaterialBriefDate, updateMaterialPO,
  updateSpecSignoff
} from '../../api';
import { getPMPrefix, extractPMNumber } from '../../specTemplates';
import SpecSignoffModal from './SpecSignoffModal';
import AdminSpecApprovalModal from './AdminSpecApprovalModal';

// ─── Short Tier Label Helper (Pass 2) ──────────────────────────────────────────
const getShortTierLabel = (matType, idx) => {
  const tier = getMaterialHierarchyTier(matType);
  if (tier <= 3) return 'PRIMARY';
  if (tier === 4) return 'SECONDARY';
  if (tier >= 5) return 'TERTIARY';
  if (idx === 0) return 'PRIMARY';
  if (idx === 1) return 'SECONDARY';
  return 'TERTIARY';
};

// ─── Shared style constants ────────────────────────────────────────────────────

const MONO_DATE_TD = { fontFamily: 'var(--font-mono)', fontSize: '10px', textAlign: 'center' };
const EMPTY_DASH   = { opacity: 0.35, fontSize: '10px' };

const artworkBtnStyle = (hasAw) => ({
  background: hasAw ? 'rgba(0, 200, 215, 0.12)' : 'rgba(242, 184, 75, 0.12)',
  color:      hasAw ? 'var(--teal)' : 'var(--warning)',
  border:     `1px solid ${hasAw ? 'rgba(0, 200, 215, 0.3)' : 'rgba(242, 184, 75, 0.3)'}`,
  borderRadius: 'var(--r-badge)',
  padding: '2px 6px',
  fontSize: '9.5px',
  fontWeight: '600',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

const specStatusStyle = (status) => {
  const map = {
    APPROVED:                 { bg: 'rgba(56, 201, 138, 0.12)', color: 'var(--success)', border: 'rgba(56, 201, 138, 0.25)' },
    CHECKED_PENDING_APPROVAL: { bg: 'rgba(0, 200, 215, 0.12)',  color: 'var(--teal)',    border: 'rgba(0, 200, 215, 0.25)' },
    PENDING_CHECK:            { bg: 'rgba(242, 184, 75, 0.12)', color: 'var(--warning)', border: 'rgba(242, 184, 75, 0.25)' },
    REVISION_REQUESTED:       { bg: 'rgba(240, 93, 108, 0.12)', color: 'var(--danger)',  border: 'rgba(240, 93, 108, 0.25)' },
  };
  const t = map[status] || { bg: 'rgba(96, 124, 128, 0.12)', color: 'var(--text-muted)', border: 'rgba(96, 124, 128, 0.25)' };
  return {
    background: t.bg,
    color: t.color,
    border: `1px solid ${t.border}`,
    borderRadius: 'var(--r-badge)',
    padding: '2px 8px',
    fontSize: '10.5px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  };
};

const specStatusLabel = (status) => ({
  APPROVED:                 '✅ Approved by Packaging Head',
  CHECKED_PENDING_APPROVAL: '🛡️ Checked by PM (Awaiting Head)',
  PENDING_CHECK:            '⏳ Pending PM Check',
  REVISION_REQUESTED:       '⚠️ Revision Requested',
}[status] || '📝 Draft');

const specSignoffBtnStyle = (signed) => ({
  fontSize: '8px',
  padding: '2px 5px',
  borderRadius: '4px',
  fontWeight: '700',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  background: signed ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
  color:      signed ? '#34d399' : '#fbbf24',
  border:     signed ? '1px solid rgba(16,185,129,0.6)' : '1px solid rgba(245,158,11,0.6)',
  transition: 'all 0.15s ease',
});

// ─── Helper sub-components (defined in same file, no new imports) ────────────

function CrunchGateAlert({ crunchPlan, onOpenCrunchModal }) {
  if (!crunchPlan) return null;
  const isPending1 = crunchPlan.status === 'PENDING_STAGE1';
  const isPending2 = crunchPlan.status === 'PENDING_STAGE2';
  if (!isPending1 && !isPending2) return null;

  const color     = isPending1 ? '#fde047' : '#e9d5ff';
  const bg        = isPending1 ? 'rgba(245,158,11,0.15)' : 'rgba(168,85,247,0.15)';
  const border    = isPending1 ? '#f59e0b' : '#a855f7';
  const btnBg     = isPending1 ? '#d97706' : '#7c3aed';
  const awaiting  = isPending1
    ? 'Stage 1 Admin Approval (Balaji Sathishkumar or Growth PM)'
    : 'Stage 2 Super Admin Final Sign-Off (Alexsander)';

  return (
    <div style={{ marginTop: '10px', padding: '9px 14px', borderRadius: '6px', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color }}>
        <span style={{ fontSize: '15px' }}>⚡</span>
        <span>
          <strong>Action Gated — Crunched Timeline Pending:</strong> Awaiting {awaiting}.
        </span>
      </div>
      <button
        className="btn btn-primary btn-sm"
        onClick={() => onOpenCrunchModal && onOpenCrunchModal()}
        style={{ fontSize: '11px', padding: '5px 12px', fontWeight: '800', background: btnBg, borderColor: btnBg, color: '#ffffff' }}
      >
        ⚡ Open Approval Screen →
      </button>
    </div>
  );
}

function POCell({ m, idx, project, isLaunched, canEdit, isAdmin, onProjectUpdated, showToast, handleSavePOStatus, handleOpenSpecSignoff, onOpenSpecModal }) {
  const [editingPO, setEditingPO] = useState(false);
  const [poVal, setPoVal] = useState('');

  const stage     = m.stage || 'Brief';
  const curStatus = m.poStatus || 'RFQ in progress';
  const cfg       = PO_CONFIG[curStatus] || PO_CONFIG['RFQ in progress'];
  const isVPDFBlocked = stage === 'VPDF' && curStatus !== 'Raised';

  const handleSavePONumber = async () => {
    try {
      const res = await updateMaterialPO(project.id, idx, m.poStatus || 'RFQ in progress', poVal);
      if (res && (res.data?.project || res.project) && onProjectUpdated) {
        onProjectUpdated(res.data?.project || res.project);
      }
      setEditingPO(false);
      if (showToast) showToast(poVal.trim() ? `PO Number saved: #${poVal.trim()}` : 'PO Number cleared', 'success');
    } catch (err) {
      if (showToast) showToast('Failed to update PO number: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  return (
    <td style={{
      textAlign: 'center',
      verticalAlign: 'middle',
      background: isVPDFBlocked ? 'rgba(239,68,68,0.08)' : 'rgba(2,132,199,0.04)',
      borderLeft:  isVPDFBlocked ? '2px solid #ef4444' : '1px solid rgba(2,132,199,0.15)',
      borderRight: isVPDFBlocked ? '2px solid #ef4444' : '1px solid rgba(2,132,199,0.15)',
      padding: '8px 10px',
    }}>
      <div className="po-cell-vert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>

        {/* Alert banner when at VPDF and PO not raised */}
        {isVPDFBlocked && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '4px', padding: '1px 5px', fontSize: '8px', fontWeight: '800', marginBottom: '2px', whiteSpace: 'nowrap' }}>
            ⚠️ PO Required for Print
          </div>
        )}

        {/* 1. PO Status Badge */}
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '9.5px', fontWeight: '700', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap', width: '100%', maxWidth: '124px', boxSizing: 'border-box' }}>
          {cfg.icon} {curStatus}
        </span>

        {/* 2. Spec sign-off status tag */}
        <div style={{ fontSize: '8px', fontWeight: 600, color: m.specSignoff?.signed ? '#34d399' : '#f59e0b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '2px', textAlign: 'center', lineHeight: '1.2', margin: '1px 0' }}>
          {m.specSignoff?.signed
            ? `✓ Spec Confirmed (${m.specSignoff.signedBy?.split(' ')[0] || 'Signed'})`
            : '⚠️ Spec Sign-off Pending'}
        </div>

        {/* 3. Action selector - VERTICALLY STACKED */}
        {canEdit && !isLaunched && (
          <div style={{ width: '100%', maxWidth: '124px', display: 'flex', justifyContent: 'center' }}>
            <select
              style={{ fontSize: '8.5px', padding: '2px 4px', background: '#072b33', border: '1px solid rgba(20,184,166,0.4)', color: '#e2e8f0', borderRadius: '4px', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
              value={curStatus}
              onChange={e => handleSavePOStatus(idx, e.target.value)}
              title="Update Purchase Order status"
            >
              <option value="RFQ in progress"  style={{ background: '#072b33', color: '#38bdf8'  }}>📑 RFQ in progress</option>
              <option value="Under approval"   style={{ background: '#072b33', color: '#f59e0b'  }}>⏳ Under approval</option>
              <option value="Raised"           style={{ background: '#072b33', color: '#10b981'  }}>✅ Raised</option>
            </select>
          </div>
        )}

        {/* 4. Spec Sign-off button - VERTICALLY STACKED */}
        {canEdit && !isLaunched && (
          <div style={{ width: '100%', maxWidth: '124px', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => onOpenSpecModal ? onOpenSpecModal(project.id, idx) : handleOpenSpecSignoff(idx)}
              style={{ ...specSignoffBtnStyle(m.specSignoff?.signed), width: '100%', justifyContent: 'center', boxSizing: 'border-box', padding: '2px 6px' }}
              title={m.specSignoff?.signed
                ? `✅ Spec Signed off by ${m.specSignoff.signedBy} on ${new Date(m.specSignoff.signedAt).toLocaleDateString()}. Click to open Specification.`
                : '⚠️ Technical specifications not signed off yet. Click to open Specification & sign off.'}
            >
              {m.specSignoff?.signed ? '✅ Spec Signed' : '✍️ Spec Sign-off'}
            </button>
          </div>
        )}

        {/* 5. PO Number display & edit - VERTICALLY STACKED */}
        <div style={{ marginTop: '1px' }}>
          {editingPO ? (
            <div className="inline-edit-wrap" style={{ marginTop: '2px' }}>
              <input
                className="inline-edit-input"
                style={{ width: '75px', fontSize: '9px', padding: '1px 3px' }}
                value={poVal}
                onChange={e => setPoVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSavePONumber();
                  if (e.key === 'Escape') setEditingPO(false);
                }}
                placeholder="PO #..."
                autoFocus
              />
              <button className="inline-btn save-btn" onClick={handleSavePONumber}>✓</button>
              <button className="inline-btn cancel-btn" onClick={() => setEditingPO(false)}>✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              {m.poNumber ? (
                <span style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', color: 'var(--teal)', fontWeight: '600' }} title={`PO Number: ${m.poNumber}`}>
                  #{m.poNumber}
                </span>
              ) : (
                <span style={{ fontSize: '8.5px', color: 'var(--text-muted)', opacity: 0.6 }}>No PO #</span>
              )}
              {canEdit && !isLaunched && (
                <button
                  className="edit-icon edit-with-text"
                  style={{ fontSize: '8.5px', opacity: 0.85, padding: '1px 4px' }}
                  onClick={() => { setEditingPO(true); setPoVal(m.poNumber || ''); }}
                  title="Add/Edit PO Number"
                >
                  <Edit2 size={8} />
                  <span>Edit</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </td>
  );
}

function SpecSubRow({ m, idx, project, specStatus, specGov, hasSpecs, filledAll, sf, onOpenSpecModal, onOpenArtworkModal }) {
  const specLabel = specStatusLabel(specStatus);
  const awCode = m.artworkCode || getArtworkCode(m.pmCode);
  const sub = getMaterialDisplaySubtitle(m);

  return (
    <tr className="spec-sub-row">
      <td colSpan="17">
        <div className="spec-sub-inner">

          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} /> {m.name} — {m.type} Technical Specifications
              </span>
              {m.pmCode && (
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)', fontWeight: '600', fontSize: '11px', background: 'rgba(0,200,215,0.08)', padding: '2px 8px', borderRadius: 'var(--r-badge)', border: '1px solid rgba(0,200,215,0.2)' }}>
                  {m.pmCode}
                </span>
              )}
              <span style={specStatusStyle(specStatus)}>{specLabel}</span>
              {m.supplier && <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Truck size={12} style={{ opacity: 0.7 }} /> Supplier: {m.supplier}</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenArtworkModal && onOpenArtworkModal(project, m, idx)}
                title="View / Upload Artwork"
              >
                <Palette size={13} />
                <span>View Artwork ({awCode})</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenSpecModal(project.id, idx)}
                title="Open Official Yoga Bar Spec Sheet"
              >
                <FileText size={13} style={{ color: 'var(--teal)' }} />
                <span>Open Spec Sheet</span>
              </button>
            </div>
          </div>

          {/* Signatures status bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px', background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '10.5px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Prepared By: </span>
              <strong style={{ color: specGov.preparedBy?.signed ? '#34d399' : 'var(--text-main)' }}>
                {specGov.preparedBy?.name ? `${specGov.preparedBy.name} (${specGov.preparedBy.title || 'Executive'})` : 'Pending'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Checked By (PM): </span>
              <strong style={{ color: specGov.checkedBy?.signed ? '#34d399' : '#fbbf24' }}>
                {specGov.checkedBy?.signed ? `✓ ${specGov.checkedBy.name} (${specGov.checkedBy.title || 'PM'})` : '⏳ Awaiting PM Check'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Approved By (Head): </span>
              <strong style={{ color: specGov.approvedBy?.signed ? '#34d399' : specGov.checkedBy?.signed ? '#fbbf24' : 'var(--text-muted)' }}>
                {specGov.approvedBy?.signed ? `✓ ${specGov.approvedBy.name} (Packaging Head)` : '⏳ Awaiting Final Sign-off'}
              </strong>
            </div>
          </div>

          {/* Parameter table */}
          {m.specSheet?.parameters?.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="specs-table" style={{ width: '100%', fontSize: '10.5px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>S.No</th>
                    <th style={{ textAlign: 'left' }}>Parameter</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Units</th>
                    <th style={{ textAlign: 'left' }}>Standard / Tolerance</th>
                    <th style={{ width: '130px', textAlign: 'left' }}>Test Standard</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Defect</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Factory Check</th>
                  </tr>
                </thead>
                <tbody>
                  {m.specSheet.parameters.map((p, pIdx) => {
                    const defectStyle = {
                      CR: { bg: 'rgba(239,68,68,0.15)',    color: '#f87171', border: 'rgba(239,68,68,0.3)'   },
                      MJ: { bg: 'rgba(245,158,11,0.15)',   color: '#fbbf24', border: 'rgba(245,158,11,0.3)'  },
                    }[p.defectType] || { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' };
                    return (
                      <tr key={pIdx}>
                        <td style={{ textAlign: 'center', opacity: 0.6 }}>{p.sNo || pIdx + 1}</td>
                        <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{p.parameter}</td>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{p.units || '-'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)' }}>{p.standard}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.testStandard || 'Visual'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '9px', fontWeight: '800', padding: '1px 5px', borderRadius: '3px', background: defectStyle.bg, color: defectStyle.color, border: `1px solid ${defectStyle.border}` }}>
                            {p.defectType || 'MI'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', color: p.factoryCheck === 'Yes' ? '#34d399' : 'var(--text-muted)' }}>
                          {p.factoryCheck || 'NA'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : hasSpecs ? (
            <table className="specs-table">
              <thead>
                <tr>
                  <th style={{ width: '38%', textAlign: 'left' }}>Specification Parameter</th>
                  <th style={{ textAlign: 'left' }}>Value / Target</th>
                </tr>
              </thead>
              <tbody>
                {filledAll.map(f => (
                  <tr key={f.k}>
                    <td className="spec-param-label">{f.l}</td>
                    <td className="spec-param-value">{m.specs[f.k]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '12px 0', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No specifications configured yet. Initialize the official Yoga Bar engineering specification sheet:
              </span>
              <button className="spec-badge-btn" onClick={() => onOpenSpecModal(project.id, idx)} style={{ fontSize: '11px', marginLeft: '10px', padding: '4px 10px' }}>
                + Initialize Yoga Bar Spec Sheet
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MaterialTimeline({
  project,
  currentUser,
  canEdit,
  isAdmin,
  isSuperAdmin,
  canAdvance = true,
  canRevoke = isAdmin,
  canUpdateDetails = true,
  onAdvanceMaterial,
  onRevokeMaterial,
  onOpenSpecModal,
  onOpenArtworkModal,
  onOpenCrunchModal,
  onOpenProjectDrawer,
  onProjectUpdated,
  showToast
}) {
  const [openSpecs, setOpenSpecs] = useState({});
  const [editingPMCode, setEditingPMCode] = useState(null);
  const [pmCodeVal, setPmCodeVal] = useState('');
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierVal, setSupplierVal] = useState('');
  const [editingBrief, setEditingBrief] = useState(null);
  const [briefVal, setBriefVal] = useState('');
  const [specSignoffModalData, setSpecSignoffModalData] = useState({ isOpen: false, mIdx: null });
  const [adminApprovalModalData, setAdminApprovalModalData] = useState({ isOpen: false, mIdx: null });
  const [openMenuIdx, setOpenMenuIdx] = useState(null);
  const [copiedPM, setCopiedPM] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuIdx(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCopyPM = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedPM(code);
    if (showToast) showToast(`📋 Copied ${code} to clipboard`);
    setTimeout(() => setCopiedPM(null), 2000);
  };

  const mats = project.materials || [];
  if (!mats.length) {
    return <div style={{ padding: '10px', color: 'var(--white-dim)', fontSize: '11px' }}>No materials defined.</div>;
  }

  const isLaunched = project.status === 'Launched';

  // Single definitive CPM using Date + Packaging Hierarchy Rule
  const cpmIdx = determineCPMIndex(mats);
  const maxConnMat = mats[cpmIdx] || mats[0];
  const cpmSubtitle = (() => {
    const sub = getMaterialDisplaySubtitle(maxConnMat);
    return (sub.typeText && sub.tierText) ? `${sub.typeText} · ${sub.tierText}` : sub.typeText || sub.tierText || maxConnMat.type;
  })();

  const toggleSpec = (mIdx) => setOpenSpecs(prev => ({ ...prev, [mIdx]: !prev[mIdx] }));

  const handleStartEditBrief = (idx, currentVal) => {
    if (!canEdit) return;
    setEditingBrief(idx);
    setBriefVal(currentVal || project.briefDate || '');
  };

  const handleSaveMaterialBriefDate = async (idx) => {
    if (!briefVal) { setEditingBrief(null); return; }
    try {
      const res = await updateMaterialBriefDate(project.id, idx, briefVal);
      if (res && (res.data?.project || res.project) && onProjectUpdated) {
        onProjectUpdated(res.data?.project || res.project);
      }
      if (showToast) showToast(`📅 Brief date for "${mats[idx].name}" updated to ${fmt(briefVal)} — Timeline recalculated`, 'success');
    } catch (err) {
      if (showToast) showToast('Failed to update material brief date: ' + (err.response?.data?.error || err.message), 'error');
    }
    setEditingBrief(null);
  };

  const handleStartEditPMCode = (idx, currentVal) => {
    if (!canEdit) return;
    setEditingPMCode(idx);
    setPmCodeVal(extractPMNumber(currentVal, mats[idx]?.type));
  };

  const handleSavePMCode = async (idx) => {
    try {
      const mat = mats[idx];
      const prefix = getPMPrefix(mat?.type);
      const numOnly = pmCodeVal.replace(/[^0-9]/g, '');
      const finalCode = numOnly ? `${prefix}${numOnly}` : '';
      const res = await updateMaterialPMCode(project.id, idx, finalCode);
      if (onProjectUpdated) onProjectUpdated(res.data.project);
      if (showToast) showToast(finalCode ? `✅ PM Code: ${finalCode}` : '✅ PM Code cleared');
    } catch (e) {
      if (showToast) showToast('⚠ Failed to update PM Code', true);
    }
    setEditingPMCode(null);
  };

  const handleStartEditSupplier = (idx, currentVal) => {
    if (!canEdit) return;
    setEditingSupplier(idx);
    setSupplierVal(currentVal || '');
  };

  const handleSaveSupplier = async (idx) => {
    try {
      const res = await updateMaterialSupplier(project.id, idx, supplierVal);
      if (res && res.project && onProjectUpdated) onProjectUpdated(res.project);
      setEditingSupplier(null);
      if (showToast) showToast('Material supplier updated successfully', 'success');
    } catch (err) {
      if (showToast) showToast('Failed to update supplier: ' + err.message, 'error');
    }
  };

  const handleSavePrintType = async (mIdx, pt) => {
    try {
      const res = await updateMaterialPrintType(project.id, mIdx, pt);
      if (res && res.project && onProjectUpdated) onProjectUpdated(res.project);
      if (showToast) showToast(`Updated print type to ${pt} (${POUCH_PRINT_LEAD[pt] || 21}d lead)`, 'success');
    } catch (err) {
      if (showToast) showToast('Failed to update print type: ' + err.message, 'error');
    }
  };

  const handleOpenSpecSignoff = (idx) => setSpecSignoffModalData({ isOpen: true, mIdx: idx });

  const handleSignoffAndAdvanceFromApproval = async (idx) => {
    try {
      const res = await updateSpecSignoff(project.id, idx, true, 'Confirmed on stage advance');
      if (res && (res.data?.project || res.project) && onProjectUpdated) {
        onProjectUpdated(res.data?.project || res.project);
      }
      if (showToast) showToast(`✅ Spec signed off for ${mats[idx].name}! Advancing stage...`, 'success');
      onAdvanceMaterial(project.id, idx);
    } catch (err) {
      if (showToast) showToast('Failed to sign off specs: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleAdminOverrideAdvanceFromApproval = (idx, notes) => {
    onAdvanceMaterial(project.id, idx, { adminApproval: true, adminNotes: notes });
  };

  const handleSavePOStatus = async (idx, newStatus) => {
    const m = mats[idx];
    if (newStatus === 'Raised' && !(m.specSignoff && m.specSignoff.signed)) {
      if (!isAdmin) {
        if (showToast) showToast(`⚠️ Spec Sign-off Required: Technical specifications must be confirmed before marking PO as 'Raised'. Admin approval required.`, true);
        setSpecSignoffModalData({ isOpen: true, mIdx: idx });
        return;
      } else {
        const confirmProceed = window.confirm(`Technical specifications for "${m.name}" are not yet signed off.\n\nAs an Admin, do you want to approve marking the Purchase Order as 'Raised'?`);
        if (!confirmProceed) return;
        try {
          const res = await updateMaterialPO(project.id, idx, newStatus, mats[idx].poNumber, true);
          if (res && (res.data?.project || res.project) && onProjectUpdated) onProjectUpdated(res.data?.project || res.project);
          if (showToast) showToast(`Purchase Order action: ${newStatus} (Admin Approved)`, 'success');
        } catch (err) {
          if (showToast) showToast('Failed to update PO status: ' + (err.response?.data?.error || err.message), 'error');
        }
        return;
      }
    }

    try {
      const res = await updateMaterialPO(project.id, idx, newStatus, mats[idx].poNumber);
      if (res && (res.data?.project || res.project) && onProjectUpdated) onProjectUpdated(res.data?.project || res.project);
      if (showToast) showToast(`Purchase Order action: ${newStatus}`, 'success');
    } catch (err) {
      if (showToast) showToast('Failed to update PO status: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleAdvanceClick = (idx) => {
    if (project.crunchPlan && (project.crunchPlan.status === 'PENDING_STAGE1' || project.crunchPlan.status === 'PENDING_STAGE2')) {
      const stageLabel = project.crunchPlan.status === 'PENDING_STAGE1' ? 'Stage 1 Admin Approval' : 'Stage 2 Super Admin Final Sign-Off';
      if (showToast) showToast(`⚠️ Action Gated: Crunched timeline requires ${stageLabel} before advancing material`, true);
      if (onOpenCrunchModal) onOpenCrunchModal(project);
      return;
    }

    const m = mats[idx];
    if (!(m.specSignoff && m.specSignoff.signed)) {
      setAdminApprovalModalData({ isOpen: true, mIdx: idx });
      return;
    }

    if (m.stage === 'Artwork') {
      const pm = m.pmCode || 'PM-TBD';
      const aw = m.artworkCode || getArtworkCode(pm);
      if (hasArtwork(m)) {
        const viewNow = window.confirm(`Advancing "${m.name}" to VPDF stage.\n\nArtwork code: ${aw}\n\nWould you like to inspect the uploaded Artwork now?`);
        if (viewNow && onOpenArtworkModal) onOpenArtworkModal(project, m, idx);
      } else {
        if (showToast) showToast(`ℹ️ Advancing to VPDF: Remember to upload/verify Artwork (${aw}) for "${m.name}"`, false);
      }
    }

    if (m.stage === 'VPDF' && (m.poStatus || 'RFQ in progress') !== 'Raised') {
      if (showToast) {
        showToast(`⚠️ Mandatory Gate: Purchase Order must be 'Raised' before starting Printing! (Current: ${m.poStatus || 'RFQ in progress'})`, true);
      } else {
        alert(`⚠️ Mandatory Gate: Purchase Order must be 'Raised' before advancing to Printing!\n\nMaterial: ${m.name}\nCurrent PO Status: ${m.poStatus || 'RFQ in progress'}\n\nPlease update the Purchase Order status to 'Raised' to proceed.`);
      }
      return;
    }

    onAdvanceMaterial(project.id, idx);
  };

  return (
    <div className="expanded-mat-container">
      {/* ── PACKAGING MATERIALS BREAKDOWN COMPACT SECTION (PASS 2) ── */}
      <div className="pkg-breakdown-section">
        <div className="pkg-breakdown-header">
          <div className="pkg-breakdown-title-wrap">
            <div className="pkg-breakdown-title">
              <Package size={14} style={{ color: 'var(--teal)' }} />
              PACKAGING MATERIALS
            </div>
            <span className="pkg-breakdown-meta">
              {mats.length} component{mats.length !== 1 ? 's' : ''} · <span className="pkg-breakdown-cpm-tag">★ 1 critical path ({maxConnMat.name})</span>
              {project.factory && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span className="pkg-breakdown-factory-inline">
                    <Building size={11} style={{ opacity: 0.8 }} /> Factory: <strong style={{ color: 'var(--teal)' }}>{project.factory}</strong>
                  </span>
                </>
              )}
            </span>
          </div>
          {project.crunchPlan && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <CrunchGateAlert crunchPlan={project.crunchPlan} onOpenCrunchModal={() => onOpenCrunchModal && onOpenCrunchModal(project)} />
            </div>
          )}
        </div>

        {/* Simplified Streamlined Materials Strip (one below other) */}
        <div className="pkg-components-list-simple">
          {mats.map((m, idx) => {
            const isCrit = idx === cpmIdx;
            const stage = m.stage || 'Brief';
            const stageMs = m.milestones?.[stage];
            const dl = stageMs ? daysFromNow(stageMs) : null;
            const tierShort = getShortTierLabel(m.type, idx);
            const dlTxt = dl === null ? '—' : dl > 0 ? `+${dl} days` : dl === 0 ? 'Due' : `${dl} days`;
            const dlCls = dl === null ? '' : dl >= 3 ? 'days-ok' : dl >= 0 ? 'days-warn' : 'days-late';

            return (
              <div
                key={idx}
                className={`pkg-component-row-simple ${isCrit ? 'is-cpm' : ''}`}
                onClick={() => onOpenProjectDrawer && onOpenProjectDrawer(project, idx)}
                style={{ cursor: onOpenProjectDrawer ? 'pointer' : 'default' }}
                title="Click to open Project Detail Drawer"
              >
                <div className="pkg-row-left">
                  <span className={`pkg-row-tier-pill ${isCrit ? 'is-cpm' : ''}`}>
                    {tierShort}
                    {isCrit && <span className="pkg-cpm-star">★ CPM</span>}
                  </span>
                  <span className="pkg-row-name" title={m.name}>{m.name}</span>
                  <span className="pkg-row-sep">·</span>
                  <span className="pkg-row-supplier" title={m.supplier || 'TBD'}>
                    {m.supplier ? `Supplier: ${m.supplier}` : 'Supplier: TBD'}
                  </span>
                </div>

                <div className="pkg-row-right">
                  <div className="pkg-row-stage" style={{ color: STAGE_COLORS[stage] || 'var(--teal)' }}>
                    <span className="stage-dot" style={{ background: STAGE_COLORS[stage] || 'var(--teal)' }}></span>
                    <span>{stage}</span>
                  </div>
                  <div className={`pkg-card-days ${dlCls}`}>{dlTxt}</div>
                  <ChevronRight size={13} className="pkg-row-chevron" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ENTERPRISE DATA GRID (PASS 2) ── */}
      <div className="mat-inner-table-wrapper">
        <table className="mat-inner-table" style={{ tableLayout: 'fixed', minWidth: '2050px', width: '100%' }}>
          <thead>
            <tr>
              <th className="sticky-material-header" style={{ width: '260px' }}>Material</th>
              <th style={{ width: '150px' }}>Supplier</th>
              <th style={{ width: '120px' }}>Lead Time</th>
              <th style={{ width: '110px' }}>Stage</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ width: '90px' }}>Days Left</th>
              <th style={{ width: '105px' }}>Actions</th>
              <th style={{ width: '105px', textAlign: 'center' }}>Brief</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Sample</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Trial</th>
              <th style={{ width: '100px', textAlign: 'center' }}>KLD</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Artwork</th>
              <th style={{ width: '175px', textAlign: 'center', background: 'rgba(79, 140, 255, 0.08)', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--info)' }}>
                  <span>🛒 Purchase Order</span>
                </div>
                <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.4px', marginTop: '1px', whiteSpace: 'nowrap' }}>
                  PARALLEL · SPEC SIGNED · REQ. FOR PRINT
                </div>
              </th>
              <th style={{ width: '100px', textAlign: 'center' }}>VPDF</th>
              <th style={{ width: '115px', textAlign: 'center' }}>🖨 Printing</th>
              <th style={{ width: '105px', textAlign: 'center' }}>Dispatch</th>
              <th style={{ minWidth: '150px', textAlign: 'center', background: 'rgba(0, 200, 215, 0.08)', borderLeft: '1px solid var(--border-color)', color: 'var(--teal)' }}>🔗 Connectivity</th>
            </tr>
          </thead>
          <tbody>
            {mats.map((m, idx) => {
              const isCrit       = idx === cpmIdx;
              const isTiedWithCPM = !isCrit && m.milestones?.Connectivity === maxConnMat.milestones?.Connectivity;
              const stage        = m.stage || 'Brief';
              const atConn       = stage === 'Connectivity';
              const atBrief      = stage === 'Brief';
              const stageMs      = m.milestones?.[stage];
              const dl           = stageMs ? daysFromNow(stageMs) : null;

              const dlCls  = dl === null ? '' : dl >= 3 ? 'days-ok' : dl >= 0 ? 'days-warn' : 'days-late';
              const dlTxt  = dl === null ? '—' : dl > 0 ? `+${dl}d` : dl === 0 ? 'DUE' : `${dl}d 🔴`;

              const specs        = m.specs || {};
              const sf           = getSpecFields(m.type);
              const filledAll    = sf.filter(f => specs[f.k]);
              const hasSpecs     = filledAll.length > 0 || (m.specSheet?.parameters?.length > 0);
              const isSpecOpen   = !!openSpecs[idx];

              const specGov      = m.specSheet?.governance || {};
              const specStatus   = specGov.status || 'DRAFT';
              const awCode       = m.artworkCode || getArtworkCode(m.pmCode);
              const hasAw        = hasArtwork(m);
              const tierShort    = getShortTierLabel(m.type, idx);

              return (
                <React.Fragment key={idx}>
                  <tr className={isCrit ? 'critical-path' : ''}>

                    {/* MATERIAL COLUMN (Sticky Anchor - Level 1 Priority) */}
                    <td className="sticky-material-col">
                      <div className="mat-cell-content">
                        <div className={`mat-tier-label ${isCrit ? 'is-cpm' : ''}`}>
                          {isCrit ? '★ CPM · ' : ''}{tierShort}
                        </div>
                        <div
                          className="mat-name-title"
                          title={`${m.name} — Click to open Project Detail Drawer`}
                          onClick={() => onOpenProjectDrawer && onOpenProjectDrawer(project, idx)}
                          style={{ cursor: onOpenProjectDrawer ? 'pointer' : 'default' }}
                        >
                          {m.name}
                        </div>

                        {/* Codes Section: Spec (PM Code) & Artwork (AW Code) */}
                        <div className="mat-cell-codes" style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '3px' }}>
                          {/* 1. PM Code Row -> Click leads to Specification */}
                          {editingPMCode === idx ? (
                            <div className="inline-edit-wrap" style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{
                                background: 'rgba(0, 200, 215, 0.08)',
                                border: '1px solid rgba(0, 200, 215, 0.25)',
                                borderRight: 'none',
                                color: 'var(--teal)',
                                fontFamily: 'var(--mono)',
                                fontSize: '10px',
                                fontWeight: '600',
                                padding: '2px 5px',
                                borderRadius: '4px 0 0 4px',
                                whiteSpace: 'nowrap',
                                userSelect: 'none'
                              }}>
                                {getPMPrefix(m.type)}
                              </span>
                              <input
                                className="inline-edit-input"
                                type="text"
                                inputMode="numeric"
                                value={pmCodeVal}
                                onChange={e => {
                                  const extracted = extractPMNumber(e.target.value, m.type);
                                  setPmCodeVal(extracted.replace(/[^0-9]/g, ''));
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSavePMCode(idx);
                                  if (e.key === 'Escape') setEditingPMCode(null);
                                }}
                                placeholder={String(50560 + idx)}
                                style={{ borderRadius: '0 4px 4px 0', width: '65px' }}
                                title="Enter number only"
                                autoFocus
                              />
                              <button className="inline-btn save-btn" onClick={() => handleSavePMCode(idx)}>✓</button>
                              <button className="inline-btn cancel-btn" onClick={() => setEditingPMCode(null)}>✕</button>
                            </div>
                          ) : (
                            <div className="mat-code-pill-row">
                              <button
                                type="button"
                                className="mat-code-badge mat-pm-badge"
                                onClick={() => onOpenSpecModal && onOpenSpecModal(project.id, idx)}
                                title={`Specification (${m.pmCode || 'No PM Code'}) — Click to open Spec Sheet`}
                              >
                                <FileText size={10} />
                                <span>{m.pmCode || 'No PM Code'}</span>
                              </button>
                              {m.pmCode && (
                                <button
                                  type="button"
                                  className="icon-action-btn"
                                  onClick={(e) => { e.stopPropagation(); handleCopyPM(m.pmCode); }}
                                  title="Copy PM Code to clipboard"
                                >
                                  {copiedPM === m.pmCode ? <Check size={10} style={{ color: 'var(--teal)' }} /> : <Copy size={10} />}
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  className="edit-icon edit-with-text"
                                  onClick={(e) => { e.stopPropagation(); handleStartEditPMCode(idx, m.pmCode); }}
                                  title="Edit PM Code"
                                >
                                  <Edit2 size={9} />
                                  <span>Edit</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* 2. Artwork Code Row -> Click leads to Artwork Viewer */}
                          <div className="mat-code-pill-row">
                            <button
                              type="button"
                              className="mat-code-badge mat-aw-badge"
                              onClick={() => onOpenArtworkModal && onOpenArtworkModal(project, m, idx)}
                              title={`Artwork (${awCode}) — Click to view/upload Artwork`}
                            >
                              <Palette size={10} />
                              <span>{awCode}</span>
                              {hasAw && <span className="aw-indicator-dot" title="Artwork files uploaded" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* SUPPLIER COLUMN */}
                    <td>
                      <div className="supplier-cell-content">
                        <div className="supplier-primary-name">
                          {editingSupplier === idx ? (
                            <div className="inline-edit-wrap">
                              <input
                                className="inline-edit-input"
                                value={supplierVal}
                                onChange={e => setSupplierVal(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveSupplier(idx);
                                  if (e.key === 'Escape') setEditingSupplier(null);
                                }}
                                placeholder="Supplier..."
                                autoFocus
                              />
                              <button className="inline-btn save-btn" onClick={() => handleSaveSupplier(idx)}>✓</button>
                              <button className="inline-btn cancel-btn" onClick={() => setEditingSupplier(null)}>✕</button>
                            </div>
                          ) : (
                            <>
                              <span>{m.supplier || <span style={EMPTY_DASH}>—</span>}</span>
                              {canEdit && (
                                <button
                                  type="button"
                                  className="edit-icon edit-with-text"
                                  onClick={() => handleStartEditSupplier(idx, m.supplier)}
                                  title="Edit Material Supplier"
                                >
                                  <Edit2 size={9} />
                                  <span>Edit</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        {m.printType && m.printType !== 'Not Applicable' && (
                          <div className="supplier-secondary-meta">{m.printType}</div>
                        )}
                      </div>
                    </td>

                    {/* LEAD TIME COLUMN */}
                    <td>
                      <div className="leadtime-cell-content">
                        <div className="leadtime-primary">
                          {isPouch(m.type)
                            ? `${POUCH_PRINT_LEAD[m.printType] || getMaterialLeadTime(m)} days`
                            : `${getMaterialLeadTime(m)} days`}
                        </div>
                        {isPouch(m.type) ? (
                          canEdit ? (
                            <select
                              style={{
                                fontSize: '9px',
                                padding: '1px 3px',
                                background: 'var(--surface-secondary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                maxWidth: '95px'
                              }}
                              value={m.printType || ''}
                              onChange={e => handleSavePrintType(idx, e.target.value)}
                            >
                              <option value="" disabled>Choose...</option>
                              <option value="Digital Print">Digital</option>
                              <option value="Flexo Print">Flexo</option>
                              <option value="Gravure Print">Gravure</option>
                            </select>
                          ) : (
                            <div className="leadtime-secondary">{m.printType || 'Pouch'}</div>
                          )
                        ) : (
                          m.printType && m.printType !== 'Not Applicable' ? (
                            <div className="leadtime-secondary">{m.printType}</div>
                          ) : null
                        )}
                      </div>
                    </td>

                    {/* STAGE COLUMN */}
                    <td>
                      <div className="stage-cell-pill" style={{
                        background: `${STAGE_COLORS[stage] || 'var(--teal)'}14`,
                        border: `1px solid ${STAGE_COLORS[stage] || 'var(--teal)'}35`,
                        color: STAGE_COLORS[stage] || 'var(--teal)'
                      }}>
                        <span className="stage-dot" style={{ background: STAGE_COLORS[stage] || 'var(--teal)' }}></span>
                        <span>{stage}</span>
                      </div>
                      {stage === 'VPDF' && (
                        <div style={{ marginTop: '3px' }}>
                          <button
                            type="button"
                            onClick={() => onOpenArtworkModal && onOpenArtworkModal(project, m, idx)}
                            style={artworkBtnStyle(hasAw)}
                            title={`View Artwork (${awCode}) for VPDF stage review`}
                          >
                            🎨 {hasAw ? 'View AW' : '+ AW'}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* STATUS COLUMN */}
                    <td>
                      <div className="status-cell-wrap">
                        {atConn ? (
                          <span className="status-pill-text" style={{ color: 'var(--teal)' }}>Ready</span>
                        ) : dl === null ? (
                          <span className="status-pill-text" style={{ color: 'var(--text-muted)' }}>On Track</span>
                        ) : dl < 0 ? (
                          <span className="status-pill-text" style={{ color: 'var(--danger)' }}>Overdue</span>
                        ) : dl <= 2 ? (
                          <span className="status-pill-text" style={{ color: 'var(--warning)' }}>Due Soon</span>
                        ) : (
                          <span className="status-pill-text" style={{ color: 'var(--success)' }}>On Track</span>
                        )}
                      </div>
                    </td>

                    {/* DAYS LEFT COLUMN */}
                    <td>
                      {dl !== null ? (
                        <span className={`days-pill ${dlCls}`} style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)' }}>
                          {dlTxt}
                        </span>
                      ) : (
                        <span style={EMPTY_DASH}>—</span>
                      )}
                    </td>

                    {/* ACTIONS COLUMN */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className="mat-actions-group">
                        {!isLaunched && (
                          atConn ? (
                            <span style={{ color: 'var(--teal)', fontSize: '10.5px', fontWeight: '600', padding: '0 4px' }}>Ready</span>
                          ) : canAdvance ? (
                            <button
                              className="btn btn-primary btn-sm mat-act-primary"
                              onClick={() => handleAdvanceClick(idx)}
                              title={`Advance ${m.name} to next stage`}
                              style={{ padding: '3px 8px', fontSize: '10.5px', gap: '3px' }}
                            >
                              <span>Next</span> <ArrowRight size={11} />
                            </button>
                          ) : null
                        )}

                        {/* Three dots dropdown */}
                        <div className="mat-more-wrap" style={{ position: 'relative' }}>
                          <button
                            className="btn btn-ghost btn-sm mat-act-more"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuIdx(openMenuIdx === idx ? null : idx);
                            }}
                            title="More actions"
                            style={{ padding: '3px 5px' }}
                          >
                            <MoreVertical size={13} />
                          </button>
                          {openMenuIdx === idx && (
                            <div className="mat-more-menu" ref={menuRef}>
                              <button
                                className="mat-more-menu-item"
                                onClick={() => { setOpenMenuIdx(null); onOpenSpecModal(project.id, idx); }}
                              >
                                <FileText size={12} style={{ color: 'var(--teal)' }} /> Open Spec Sheet
                              </button>
                              <button
                                className="mat-more-menu-item"
                                onClick={() => { setOpenMenuIdx(null); onOpenArtworkModal && onOpenArtworkModal(project, m, idx); }}
                              >
                                <Palette size={12} style={{ color: '#c084fc' }} /> Open Artwork
                              </button>
                              <button
                                className="mat-more-menu-item"
                                onClick={() => { setOpenMenuIdx(null); onOpenSpecModal ? onOpenSpecModal(project.id, idx) : handleOpenSpecSignoff(idx); }}
                              >
                                <Check size={12} style={{ color: 'var(--success)' }} /> {m.specSignoff?.signed ? 'Spec Signed' : 'Mark Spec Signed'}
                              </button>
                              {canRevoke && stage !== 'Brief' && (
                                <button
                                  className="mat-more-menu-item text-danger"
                                  onClick={() => { setOpenMenuIdx(null); onRevokeMaterial(project.id, idx); }}
                                >
                                  <RotateCcw size={12} /> Revoke Stage
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                  {/* Brief Date column */}
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', overflow: 'visible', padding: '6px 4px' }}>
                    {editingBrief === idx ? (
                      <div className="inline-edit-wrap" style={{ minWidth: '120px', justifyContent: 'center' }}>
                        <input
                          type="date"
                          className="inline-edit-input"
                          style={{ fontSize: '10px', padding: '2px 4px', width: '90px' }}
                          value={briefVal}
                          onChange={e => setBriefVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveMaterialBriefDate(idx);
                            if (e.key === 'Escape') setEditingBrief(null);
                          }}
                          autoFocus
                        />
                        <button className="inline-btn save-btn" onClick={() => handleSaveMaterialBriefDate(idx)} title="Save Brief Date">✓</button>
                        <button className="inline-btn cancel-btn" onClick={() => setEditingBrief(null)} title="Cancel">✕</button>
                      </div>
                    ) : (
                      <div className="editable-cell" style={{ justifyContent: 'center', gap: '3px' }}>
                        <span
                          style={{ fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: m.briefDate && m.briefDate !== project.briefDate ? '800' : '600', color: m.briefDate && m.briefDate !== project.briefDate ? 'var(--teal)' : 'inherit', cursor: canEdit ? 'pointer' : 'default' }}
                          onClick={() => canEdit && handleStartEditBrief(idx, m.briefDate || m.milestones?.Brief || project.briefDate)}
                          title={canEdit ? 'Click to change Packaging Brief Date' : undefined}
                        >
                          {fmt(m.briefDate || m.milestones?.Brief || project.briefDate)}
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            className="edit-icon edit-with-text"
                            onClick={() => handleStartEditBrief(idx, m.briefDate || m.milestones?.Brief || project.briefDate)}
                            title="Edit Packaging Brief Date"
                            style={{ padding: '0 2px' }}
                          >
                            <Edit2 size={9} />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Milestone date columns */}
                  <td style={MONO_DATE_TD}>{fmt(m.milestones?.Sample)}</td>
                  <td style={MONO_DATE_TD}>{fmt(m.milestones?.Trial)}</td>
                  <td style={MONO_DATE_TD}>{fmt(m.milestones?.KLD)}</td>
                  <td style={MONO_DATE_TD}>{fmt(m.milestones?.Artwork)}</td>

                  {/* Purchase Order column */}
                  <POCell
                    m={m}
                    idx={idx}
                    project={project}
                    isLaunched={isLaunched}
                    canEdit={canEdit}
                    isAdmin={isAdmin}
                    onProjectUpdated={onProjectUpdated}
                    showToast={showToast}
                    handleSavePOStatus={handleSavePOStatus}
                    handleOpenSpecSignoff={handleOpenSpecSignoff}
                    onOpenSpecModal={onOpenSpecModal}
                  />

                  {/* VPDF milestone column */}
                  <td style={MONO_DATE_TD}>
                    <div>{fmt(m.milestones?.VPDF)}</div>
                    {stage === 'VPDF' && (
                      <button
                        type="button"
                        onClick={() => onOpenArtworkModal && onOpenArtworkModal(project, m, idx)}
                        style={{ marginTop: '2px', fontSize: '8px', padding: '1px 4px', borderRadius: '3px', ...artworkBtnStyle(hasAw), cursor: 'pointer', fontWeight: '800', whiteSpace: 'nowrap' }}
                        title={`View Artwork for ${m.name} (${awCode})`}
                      >
                        🎨 {hasAw ? 'AW' : '+AW'}
                      </button>
                    )}
                  </td>

                  <td style={{ ...MONO_DATE_TD, color: STAGE_COLORS.Printing }}>{fmt(m.milestones?.Printing)}</td>
                  <td style={MONO_DATE_TD}>{fmt(m.milestones?.Dispatch)}</td>
                  <td style={{ ...MONO_DATE_TD, borderLeft: '1px solid var(--border-color)', background: isCrit ? 'rgba(0, 200, 215, 0.04)' : 'transparent', textAlign: 'center', padding: '6px 8px' }}>
                    <span className="connectivity-date-pill" style={{
                      background: isCrit ? 'rgba(0, 200, 215, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isCrit ? 'rgba(0, 200, 215, 0.35)' : 'var(--border-color)'}`,
                      color: isCrit ? 'var(--teal)' : 'var(--text-main)'
                    }}>
                      {fmt(m.milestones?.Connectivity)}
                    </span>
                  </td>
                </tr>

                {/* Expandable spec sub-row */}
                {isSpecOpen && (
                  <SpecSubRow
                    m={m}
                    idx={idx}
                    project={project}
                    specStatus={specStatus}
                    specGov={specGov}
                    hasSpecs={hasSpecs}
                    filledAll={filledAll}
                    sf={sf}
                    onOpenSpecModal={onOpenSpecModal}
                    onOpenArtworkModal={onOpenArtworkModal}
                  />
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>

      <div className="expanded-mat-footer">
        <span style={{ color: 'var(--teal)', fontWeight: '800' }}>★ CPM = Critical Path Material</span>
        <span className="footer-sep">·</span>
        <span style={{ opacity: 0.75 }}>Governed by bottleneck date + Packaging Hierarchy</span>
        <span className="footer-sep">·</span>
        <span>Click <strong>📋 Specs</strong> to view &amp; sign off</span>
        <span className="footer-sep">·</span>
        <span><strong>🛒 Purchase Order</strong> required before print</span>
      </div>

      {/* Spec Sign-Off Modal */}
      {specSignoffModalData.isOpen && (
        <SpecSignoffModal
          isOpen={specSignoffModalData.isOpen}
          project={project}
          mIdx={specSignoffModalData.mIdx}
          currentUser={currentUser}
          onClose={() => setSpecSignoffModalData({ isOpen: false, mIdx: null })}
          onSuccess={(updatedProject) => { if (onProjectUpdated) onProjectUpdated(updatedProject); }}
          showToast={showToast}
        />
      )}

      {/* Admin Approval Modal for Spec Sign-off Gating */}
      {adminApprovalModalData.isOpen && (
        <AdminSpecApprovalModal
          isOpen={adminApprovalModalData.isOpen}
          project={project}
          material={mats[adminApprovalModalData.mIdx]}
          mIdx={adminApprovalModalData.mIdx}
          currentUser={currentUser}
          onClose={() => setAdminApprovalModalData({ isOpen: false, mIdx: null })}
          onSignoffAndAdvance={handleSignoffAndAdvanceFromApproval}
          onAdminOverrideAdvance={handleAdminOverrideAdvanceFromApproval}
          onOpenSpecSignoff={handleOpenSpecSignoff}
        />
      )}
    </div>
  );
}
