import React, { useState, useEffect } from 'react';
import { STAGE_COLORS, fmt, getProjectStage, getProjectProgress, getSlippage, timeAgo, getArtworkCode } from '../../utils';
import { getSpecFields, isPouch, getMaterialLeadTime, determineCPMIndex, getMaterialHierarchyTier, getTierName, getMaterialDisplaySubtitle } from '../../constants';
import { getProjectAuditTrail } from '../../api';
import { generateProjectSuggestions } from '../../suggestionsEngine';

export default function DetailModal({ isOpen, project, onClose, initialTab = 'specs', onOpenSpecModal, onOpenArtworkModal }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [auditTrail, setAuditTrail] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilter, setAuditFilter] = useState('all');

  useEffect(() => {
    setActiveTab(initialTab || 'specs');
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (isOpen && project?.id) {
      setAuditLoading(true);
      getProjectAuditTrail(project.id)
        .then(res => {
          if (res.data?.auditTrail) {
            setAuditTrail(res.data.auditTrail);
          } else {
            setAuditTrail(project.auditTrail || []);
          }
        })
        .catch(() => {
          setAuditTrail(project.auditTrail || []);
        })
        .finally(() => setAuditLoading(false));
    }
  }, [isOpen, project?.id]);


  const stage = getProjectStage(project || {});

  const slippage = getSlippage(project || {});
  const mats = project?.materials || [];
  const cpmIdx = determineCPMIndex(mats);
  const suggestions = generateProjectSuggestions(project || {});


  const filteredAudit = auditTrail.filter(entry => {
    if (auditFilter === 'stage' && !['STAGE_ADVANCE', 'STAGE_REVOKE', 'MATERIAL_ADVANCE', 'MATERIAL_REVOKE', 'PROJECT_LAUNCH'].includes(entry.action)) return false;
    if (auditFilter === 'feeding' && !['FGCODE_UPDATE', 'PMCODE_UPDATE', 'SPECS_UPDATE', 'SUPPLIER_UPDATE', 'FACTORY_UPDATE', 'DESCRIPTION_UPDATE', 'PO_UPDATE', 'PRINT_TYPE_UPDATE'].includes(entry.action)) return false;
    if (auditFilter === 'crunch' && !entry.action?.startsWith('CRUNCH_')) return false;

    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      const matchTitle = entry.title?.toLowerCase().includes(q);
      const matchDetails = entry.details?.toLowerCase().includes(q);
      const matchBy = entry.by?.toLowerCase().includes(q);
      const matchMat = entry.materialName?.toLowerCase().includes(q);
      if (!matchTitle && !matchDetails && !matchBy && !matchMat) return false;
    }
    return true;
  });

  if (!isOpen || !project) return null;

  return (
    <div className="modal-overlay open">

      <div className="modal modal-lg" style={{ maxWidth: '980px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="modal-title" style={{ fontSize: '15px' }}>
              📋 {project.projectName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', color: 'var(--teal)' }}>{project.id}</span>
              {project.fgCode && <span>· FG: <strong style={{ color: 'var(--cyan)' }}>{project.fgCode}</strong></span>}
              <span>· Stage: <strong style={{ color: STAGE_COLORS[stage] || 'var(--teal)' }}>{stage}</strong></span>
              <span>· Status: <strong>{project.status}</strong></span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* TAB NAVIGATION HEADER */}
        <div style={{ display: 'flex', gap: '4px', padding: '8px 20px 0', background: 'var(--surface-secondary, #F4F8F6)', borderBottom: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
            onClick={() => setActiveTab('specs')}
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '700', borderBottom: activeTab === 'specs' ? '2px solid var(--teal)' : '2px solid transparent', background: 'transparent', color: activeTab === 'specs' ? 'var(--teal)' : 'var(--text-muted)' }}
          >
            🧱 Specifications &amp; Overview
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'backtrack' ? 'active' : ''}`}
            onClick={() => setActiveTab('backtrack')}
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '700', borderBottom: activeTab === 'backtrack' ? '2px solid var(--teal)' : '2px solid transparent', background: 'transparent', color: activeTab === 'backtrack' ? 'var(--teal)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📜 Backtrack &amp; Audit Trail
            <span style={{ fontSize: '10px', background: 'rgba(20, 184, 166, 0.2)', color: 'var(--teal)', padding: '1px 6px', borderRadius: '10px' }}>
              {auditTrail.length}
            </span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggestions')}
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '700', borderBottom: activeTab === 'suggestions' ? '2px solid var(--cyan)' : '2px solid transparent', background: 'transparent', color: activeTab === 'suggestions' ? 'var(--cyan)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            💡 Optimization &amp; Suggestions
            {suggestions.totalBottlenecks > 0 && (
              <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '1px 6px', borderRadius: '10px', fontWeight: '800' }}>
                {suggestions.totalBottlenecks}
              </span>
            )}
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          
          {/* TAB 1: SPECIFICATIONS & OVERVIEW */}
          {activeTab === 'specs' && (
            <div>
              {/* HEADER SUMMARY */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px', padding: '12px', background: 'var(--navy-light)', borderRadius: '9px', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>FG Code</div>
                  <div style={{ fontFamily: 'var(--mono)', color: 'var(--teal)', fontWeight: '700', fontSize: '11px' }}>{project.fgCode || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Current Stage</div>
                  <span className="stage-badge" style={{ background: `${STAGE_COLORS[stage]}18`, border: `1px solid ${STAGE_COLORS[stage]}40`, color: STAGE_COLORS[stage] }}>
                    <span className="stage-dot" style={{ background: STAGE_COLORS[stage] }}></span>{stage}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Status</div>
                  <div style={{ fontWeight: '700', fontSize: '11px' }}>{project.status}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>SKU / Grammage</div>
                  <div style={{ color: 'var(--cyan)', fontWeight: '700', fontSize: '11px' }}>{project.skuSize || project.grammage || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Est. Ready</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>{fmt(project.milestones?.Connectivity)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Target Launch</div>
                  <div style={{ fontFamily: 'var(--mono)', color: 'var(--cyan)', fontSize: '11px' }}>{fmt(project.targetLaunchDate)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Actual Launch</div>
                  <div style={{ fontFamily: 'var(--mono)', color: project.launchDate ? 'var(--green)' : 'var(--white-dim)', fontWeight: '700', fontSize: '11px' }}>{fmt(project.launchDate)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Target Factory</div>
                  <div style={{ fontWeight: '700', fontSize: '11px', color: 'var(--teal)' }}>🏭 {project.factory || 'TBD'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--white-dim)', textTransform: 'uppercase' }}>Slippage</div>
                  <div>{slippage > 0 ? <span className="slippage-badge">+{slippage}d</span> : <span style={{ color: 'var(--green)', fontWeight: '700', fontSize: '11px' }}>✓ On Time</span>}</div>
                </div>
              </div>

              {/* CRUNCHED TIMELINE STATUS */}
              {project.crunchPlan && (
                <div style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.3)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontWeight: '800', fontSize: '11.5px', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚡</span> Crunched Timeline Plan ({project.crunchPlan.daysSaved} Days Saved · {project.crunchPlan.riskLevel?.toUpperCase()} RISK)
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '3px', background: project.crunchPlan.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: project.crunchPlan.status === 'APPROVED' ? '#10b981' : '#f59e0b' }}>
                      {project.crunchPlan.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--white-dim)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <strong>Stage 1 (Admin):</strong> {project.crunchPlan.stage1?.approved ? `✅ Approved by ${project.crunchPlan.stage1.approvedBy}` : '⏳ Pending'}
                    </div>
                    <div>
                      <strong>Stage 2 (Super Admin):</strong> {project.crunchPlan.stage2?.approved ? `✅ Approved by ${project.crunchPlan.stage2.approvedBy}` : '⏳ Pending'}
                    </div>
                  </div>
                </div>
              )}

              {/* MATERIALS AND SPECS */}
              <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--teal)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🧱 Materials &amp; Technical Specifications</span>
                <span className="expanded-mat-badge">({mats.length})</span>
              </div>

              {mats.map((m, idx) => {
                const mStage = m.stage || 'Brief';
                const specs = m.specs || {};
                const sf = getSpecFields(m.type);
                const filledSpecs = sf.filter(f => specs[f.k]);

                return (
                  <div key={idx} style={{ marginBottom: '14px', padding: '14px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                      <div>
                        <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>{idx + 1}. {m.name}</strong>
                        {idx === cpmIdx && (
                          <span style={{ marginLeft: '8px', padding: '2px 7px', background: 'rgba(20, 184, 166, 0.15)', color: 'var(--teal)', borderRadius: '4px', fontSize: '10px', fontWeight: '800', border: '1px solid rgba(20, 184, 166, 0.4)' }} title="Critical Path Material">
                            ★ CPM
                          </span>
                        )}
                        {m.pmCode && (
                          <span style={{ marginLeft: '8px', padding: '1px 6px', background: 'rgba(20, 184, 166, 0.12)', border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', color: '#14b8a6', fontWeight: 600 }} title="PM Code">
                            PM: {m.pmCode}
                          </span>
                        )}
                        <span style={{ marginLeft: '6px', padding: '1px 6px', background: 'rgba(236, 72, 153, 0.12)', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', color: '#f472b6', fontWeight: 700 }} title="Artwork Code">
                          AW: {m.artworkCode || getArtworkCode(m.pmCode)}
                        </span>
                        {(() => {
                          const sub = getMaterialDisplaySubtitle(m);
                          const parts = [
                            sub.typeText,
                            sub.tierText ? <span key="tier" style={{ color: 'var(--teal)' }}>{sub.tierText}</span> : null,
                            isPouch(m.type) ? `${m.printType || 'Print unconfirmed'} · ⏱ ${getMaterialLeadTime(m)}d` : `⏱ ${getMaterialLeadTime(m)}d lead`,
                            m.supplier ? `🚚 Supplier: ${m.supplier}` : null
                          ].filter(Boolean);
                          return (
                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              ({parts.map((p, pIdx) => (
                                <React.Fragment key={pIdx}>
                                  {pIdx > 0 && ' · '}
                                  {p}
                                </React.Fragment>
                              ))})
                            </span>
                          );
                        })()}
                        <span style={{ marginLeft: '8px', padding: '2px 8px', background: m.poStatus === 'Raised' ? 'rgba(16, 185, 129, 0.15)' : m.poStatus === 'Under approval' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(14, 165, 233, 0.15)', color: m.poStatus === 'Raised' ? '#10b981' : m.poStatus === 'Under approval' ? '#f59e0b' : '#38bdf8', borderRadius: '4px', fontSize: '10px', fontWeight: '700', border: `1px solid ${m.poStatus === 'Raised' ? 'rgba(16, 185, 129, 0.4)' : m.poStatus === 'Under approval' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(14, 165, 233, 0.4)'}` }}>
                          🛒 PO: {m.poStatus || 'RFQ in progress'}{m.poNumber ? ` (#${m.poNumber})` : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {onOpenArtworkModal && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              onClose();
                              onOpenArtworkModal(project, m, idx);
                            }}
                            style={{ fontSize: '10px', padding: '3px 8px', border: '1px solid rgba(236, 72, 153, 0.4)', color: '#f472b6', background: 'rgba(236, 72, 153, 0.12)' }}
                            title="Open Artwork Viewer"
                          >
                            🎨 Artwork
                          </button>
                        )}
                        {onOpenSpecModal && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              onClose();
                              onOpenSpecModal(project.id, idx);
                            }}
                            style={{ fontSize: '10px', padding: '3px 8px', border: '1px solid var(--border-color)', color: 'var(--teal)', background: 'rgba(20, 184, 166, 0.08)' }}
                            title="Open Specification Sheet"
                          >
                            📋 Open Spec Sheet
                          </button>
                        )}
                        <span className="stage-badge" style={{ background: `${STAGE_COLORS[mStage]}18`, border: `1px solid ${STAGE_COLORS[mStage]}40`, color: STAGE_COLORS[mStage] }}>
                          <span className="stage-dot" style={{ background: STAGE_COLORS[mStage] }}></span>{mStage}
                        </span>
                      </div>
                    </div>

                    {/* Clubbed PM Codes Banner */}
                    {(m.clubbedCodes || m.specSheet?.docHeader?.clubbedCodes) && (
                      <div style={{
                        margin: '8px 0 10px 0',
                        padding: '6px 10px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11px'
                      }}>
                        <div>
                          <strong style={{ color: '#38bdf8' }}>🗂 Clubbed PM Codes:</strong>{' '}
                          <span style={{ fontFamily: 'monospace', color: '#e0f2fe', fontWeight: 600 }}>
                            {m.clubbedCodes || m.specSheet?.docHeader?.clubbedCodes}
                          </span>
                        </div>
                        {m.specSheet?.variants && m.specSheet.variants.length > 1 && (
                          <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {m.specSheet.variants.length} SKU Variants Clubbed
                          </span>
                        )}
                      </div>
                    )}

                    {/* Substrate & Format Details */}
                    {(m.specSheet?.general || m.specs?.structure || m.specs?.style) && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '8px',
                        marginBottom: '10px',
                        fontSize: '10.5px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Structure: </span>
                          <strong style={{ color: '#cbd5e1' }}>{m.specSheet?.general?.structure || m.specs?.structure || '—'}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Style / Format: </span>
                          <strong style={{ color: '#cbd5e1' }}>{m.specSheet?.general?.style || m.specs?.style || '—'}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Print Colors: </span>
                          <strong style={{ color: '#cbd5e1' }}>{m.specSheet?.general?.printColors || m.specs?.colours || 'As per approved AW'}</strong>
                        </div>
                      </div>
                    )}

                    {/* Authentic Yoga Bar Parameters Table */}
                    {m.specSheet?.parameters && m.specSheet.parameters.length > 0 ? (
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{
                          background: '#f8cbad',
                          color: '#111827',
                          padding: '4px 10px',
                          fontWeight: 800,
                          fontSize: '11px',
                          textAlign: 'center',
                          borderRadius: '4px 4px 0 0',
                          border: '1px solid #d1a485',
                          borderBottom: 'none'
                        }}>
                          {m.specSheet.sectionTitle || 'Technical Parameters Details'}
                        </div>
                        <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '0 0 4px 4px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', background: '#0f172a' }}>
                            <thead>
                              <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', textAlign: 'left' }}>
                                <th style={{ padding: '5px 6px', width: '30px', textAlign: 'center', color: '#94a3b8' }}>#</th>
                                <th style={{ padding: '5px 8px', color: '#94a3b8' }}>Parameter</th>
                                <th style={{ padding: '5px 6px', width: '55px', textAlign: 'center', color: '#94a3b8' }}>Units</th>
                                <th style={{ padding: '5px 8px', color: '#38bdf8', fontWeight: 700 }}>Standard / Target Value</th>
                                <th style={{ padding: '5px 6px', width: '90px', textAlign: 'center', color: '#94a3b8' }}>Test Standard</th>
                                <th style={{ padding: '5px 6px', width: '65px', textAlign: 'center', color: '#94a3b8' }}>Defect</th>
                                <th style={{ padding: '5px 6px', width: '55px', textAlign: 'center', color: '#94a3b8' }}>Factory</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m.specSheet.parameters.map((p, pIdx) => (
                                <tr key={pIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: pIdx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent' }}>
                                  <td style={{ padding: '4px 6px', textAlign: 'center', color: '#64748b' }}>{p.sNo || pIdx + 1}</td>
                                  <td style={{ padding: '4px 8px', color: '#e2e8f0', fontWeight: 600 }}>{p.parameter}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center', color: '#94a3b8' }}>{p.units || '-'}</td>
                                  <td style={{ padding: '4px 8px', color: '#38bdf8', fontWeight: 700, fontFamily: 'var(--mono)' }}>
                                    {p.standard || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Pending spec input</span>}
                                  </td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center', color: '#94a3b8' }}>{p.testStandard || 'NA'}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                    <span style={{
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      fontSize: '9.5px',
                                      fontWeight: 800,
                                      background: p.defectType === 'CR' ? 'rgba(239, 68, 68, 0.2)' : p.defectType === 'MJ' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                                      color: p.defectType === 'CR' ? '#f87171' : p.defectType === 'MJ' ? '#fbbf24' : '#38bdf8'
                                    }}>
                                      {p.defectType || 'CR'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center', color: '#94a3b8' }}>{p.factoryCheck || 'Yes'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : filledSpecs.length > 0 ? (
                      <table className="specs-table">
                        <thead>
                          <tr>
                            <th style={{ width: '42%', textAlign: 'left' }}>Technical Specification</th>
                            <th style={{ textAlign: 'left' }}>Value / Target</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filledSpecs.map(f => (
                            <tr key={f.k}>
                              <td className="spec-param-label">{f.l}</td>
                              <td className="spec-param-value">{specs[f.k]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 4px' }}>
                        No technical specifications added yet. Click &quot;📋 Open Spec Sheet&quot; to initialize Yoga Bar engineering parameters.
                      </div>
                    )}

                    {/* Artwork Proofs & Multi-variant Cards */}
                    {(m.artworkUrl || m.specSheet?.artworkFiles?.length || (m.specSheet?.variants && m.specSheet.variants.length > 1)) && (
                      <div style={{
                        marginTop: '10px',
                        padding: '8px 12px',
                        background: 'rgba(236, 72, 153, 0.06)',
                        border: '1px solid rgba(236, 72, 153, 0.25)',
                        borderRadius: '6px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#f472b6' }}>
                            <span>🎨</span>
                            <span>Artwork Reference &amp; Variant Proofs</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#cbd5e1' }}>
                              ({m.artworkCode || getArtworkCode(m.pmCode)})
                            </span>
                          </div>
                          {onOpenArtworkModal && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                onClose();
                                onOpenArtworkModal(project, m, idx);
                              }}
                              style={{ fontSize: '10px', padding: '2px 8px', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)' }}
                            >
                              Open Artwork Proofs ↗
                            </button>
                          )}
                        </div>

                        {/* If clubbed variants exist, show chips */}
                        {((m.specSheet?.variants && m.specSheet.variants.length > 1) || (m.variants && m.variants.length > 1)) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {(m.specSheet?.variants || m.variants).map((v, vIdx) => {
                              const pColors = Array.isArray(v.pantoneColors) ? v.pantoneColors.join(', ') : v.pantoneColors;
                              return (
                                <div key={vIdx} style={{
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: '4px',
                                  padding: '3px 8px',
                                  fontSize: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <strong style={{ color: '#fff' }}>{v.variantName || v.name || `Variant ${vIdx + 1}`}</strong>
                                  {(v.itemCode || v.code) && <span style={{ fontFamily: 'monospace', color: '#14b8a6' }}>{v.itemCode || v.code}</span>}
                                  {pColors && <span style={{ color: '#fbbf24', fontSize: '9px' }}>{pColors}</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Artwork Thumbnail Preview */}
                        {(m.artworkUrl || m.specSheet?.artworkFiles?.[0]?.url) && (
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={m.artworkUrl || m.specSheet?.artworkFiles?.[0]?.url}
                              alt="Artwork Proof"
                              style={{ width: '80px', height: '48px', objectFit: 'contain', background: '#000', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                            />
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              Artwork file linked and synchronized with Yoga Bar multi-page engineering specification export.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {(project.description || project.comments) && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--white-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Description / Notes</div>
                  <div style={{ fontSize: '11px', background: 'var(--navy-light)', border: '1px solid var(--border)', borderRadius: '7px', padding: '10px', lineHeight: '1.4' }}>
                    {project.description || project.comments}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BACKTRACK & AUDIT TRAIL */}
          {activeTab === 'backtrack' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="modern-form-input"
                    style={{ width: '220px', padding: '6px 10px', fontSize: '11px' }}
                    placeholder="🔍 Search activity logs..."
                    value={auditSearch}
                    onChange={e => setAuditSearch(e.target.value)}
                  />
                  <select
                    className="modern-form-select"
                    style={{ width: '130px', padding: '6px 10px', fontSize: '11px' }}
                    value={auditFilter}
                    onChange={e => setAuditFilter(e.target.value)}
                  >
                    <option value="all">All Events</option>
                    <option value="stage">Stage Moves</option>
                    <option value="feeding">Data Updates</option>
                    <option value="crunch">Crunch Actions</option>
                  </select>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredAudit.length}</strong> of {auditTrail.length} log event(s)
                </div>
              </div>

              {auditLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  ⏳ Loading chronological audit history...
                </div>
              ) : filteredAudit.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--navy-light)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📜</div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>No audit events found</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Actions performed on this project will be automatically recorded here with user name and timestamp.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredAudit.map((item, idx) => {
                    const isRevoke = item.action === 'STAGE_REVOKE' || item.action === 'MATERIAL_REVOKE';
                    const isAdvance = item.action === 'STAGE_ADVANCE' || item.action === 'MATERIAL_ADVANCE';
                    const isPO = item.action === 'PO_UPDATE';
                    const isSpecs = item.action === 'SPECS_UPDATE';
                    const isPM = item.action === 'PMCODE_UPDATE';
                    const isFG = item.action === 'FGCODE_UPDATE';

                    let badgeColor = '#0284c7';
                    let icon = '📝';
                    if (isRevoke) { badgeColor = '#e11d48'; icon = '↩'; }
                    else if (isAdvance) { badgeColor = '#059669'; icon = '▶'; }
                    else if (isPO) { badgeColor = '#0284c7'; icon = '🛒'; }
                    else if (isSpecs) { badgeColor = '#7c3aed'; icon = '⚙'; }
                    else if (isPM || isFG) { badgeColor = '#14b8a6'; icon = '🏷'; }
                    else if (item.action?.startsWith('CRUNCH_')) { badgeColor = '#f59e0b'; icon = '⚡'; }

                    return (
                      <div
                        key={item.id || idx}
                        style={{
                          background: 'var(--navy-light)',
                          border: `1px solid ${isRevoke ? 'rgba(225, 29, 72, 0.4)' : 'var(--border)'}`,
                          borderRadius: '8px',
                          padding: '12px 14px',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px' }}>{icon}</span>
                            <span style={{ fontWeight: '800', fontSize: '12px', color: 'var(--text-main)' }}>
                              {item.title}
                            </span>
                            <span style={{ fontSize: '9px', fontWeight: '800', background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}55`, padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                              {item.action ? item.action.replace('_UPDATE', '').replace('_', ' ') : 'LOG'}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--teal)', fontWeight: '700' }}>
                              🕒 {item.dateStr || ''}
                            </div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', opacity: 0.8 }}>
                              {timeAgo(item.timestamp)}
                            </div>
                          </div>
                        </div>

                        {item.details && (
                          <div style={{ fontSize: '11px', color: 'var(--text-main)', background: 'rgba(0, 0, 0, 0.2)', padding: '6px 10px', borderRadius: '5px', marginBottom: '6px', lineHeight: '1.4' }}>
                            {item.details}
                          </div>
                        )}

                        {/* PASS 5: BEFORE / AFTER VALUES */}
                        {((item.oldValue !== undefined && item.oldValue !== null) || (item.newValue !== undefined && item.newValue !== null) || item.metadata?.oldValue !== undefined || item.metadata?.newValue !== undefined) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', background: 'rgba(0, 0, 0, 0.3)', padding: '4px 8px', borderRadius: '4px', marginBottom: '6px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Previous:</span>
                            <span style={{ color: '#F05D6C', textDecoration: 'line-through' }}>{String(item.oldValue ?? item.metadata?.oldValue ?? '—')}</span>
                            <span style={{ color: 'var(--teal)' }}>➔</span>
                            <span style={{ color: '#38C98A', fontWeight: '700' }}>{String(item.newValue ?? item.metadata?.newValue ?? '—')}</span>
                          </div>
                        )}

                        {/* PASS 5: USER REASON */}
                        {(item.reason || item.metadata?.reason) && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(255, 255, 255, 0.03)', padding: '3px 8px', borderRadius: '4px', marginBottom: '6px' }}>
                            💬 Reason: &ldquo;{item.reason || item.metadata?.reason}&rdquo;
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>
                              👤 Performed by: <span style={{ color: 'var(--cyan)' }}>{item.user?.name || item.by || 'System'}</span>
                            </span>
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: (item.user?.role || item.byRole) === 'superadmin' ? 'rgba(239, 68, 68, 0.15)' : (item.user?.role || item.byRole) === 'admin' ? 'rgba(124, 58, 237, 0.15)' : 'rgba(20, 184, 166, 0.15)', color: (item.user?.role || item.byRole) === 'superadmin' ? '#ef4444' : (item.user?.role || item.byRole) === 'admin' ? '#a78bfa' : '#2dd4bf', fontWeight: '700' }}>
                              {(item.user?.role || item.byRole) ? (item.user?.role || item.byRole).toUpperCase() : 'USER'}
                            </span>
                            {item.byDept && (
                              <span style={{ opacity: 0.75 }}>· {item.byDept}</span>
                            )}
                            {item.entityId && (
                              <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 5px', borderRadius: '3px' }}>
                                {item.entityId}
                              </span>
                            )}
                          </div>
                          {(item.user?.email || item.byEmail) && (
                            <span style={{ fontFamily: 'monospace', opacity: 0.6, fontSize: '9.5px' }}>
                              {item.user?.email || item.byEmail}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OPTIMIZATION & STAGE IMPROVEMENT SUGGESTIONS */}
          {activeTab === 'suggestions' && (
            <div>
              {/* HEALTH SCORE HERO */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '18px' }}>
                <div style={{ background: 'var(--navy-light)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Project Velocity Health
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: suggestions.healthScore >= 80 ? 'var(--green)' : suggestions.healthScore >= 60 ? '#f59e0b' : '#ef4444', margin: '6px 0' }}>
                    {suggestions.healthScore}/100
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {suggestions.healthScore >= 80 ? 'Optimal Execution Velocity' : suggestions.healthScore >= 60 ? 'Moderate Bottlenecks Detected' : 'Critical Gate Delays & Blockers'}
                  </div>
                </div>

                <div style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontWeight: '800', fontSize: '12px', color: 'var(--cyan)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💡</span> Packaging Intelligence Summary
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-main)', lineHeight: '1.45' }}>
                    {suggestions.cpm ? (
                      <div>
                        • <strong>Critical Path Material:</strong> {suggestions.cpm.name} ({suggestions.cpm.type} · ⏱ {suggestions.cpm.leadTime}d lead).<br />
                        • <strong>Detected Bottlenecks:</strong> {suggestions.totalBottlenecks} area(s) needing attention.<br />
                        • <strong>Actionable Suggestions:</strong> {suggestions.totalRecommendations} optimization recommendation(s) generated.
                      </div>
                    ) : (
                      <div>Comprehensive pipeline diagnostic completed.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: WHERE TO IMPROVE */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span>🔍</span> Where to Improve (Identified Bottlenecks &amp; Root Causes)
                </div>

                {suggestions.bottlenecks.length === 0 ? (
                  <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', color: '#10b981', fontSize: '11.5px', fontWeight: '600' }}>
                    ✅ No major bottlenecks detected! Project materials and milestones are progressing smoothly within benchmark parameters.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {suggestions.bottlenecks.map((b, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--navy-light)',
                          borderLeft: `4px solid ${b.severity === 'critical' ? '#ef4444' : b.severity === 'high' ? '#f59e0b' : '#38bdf8'}`,
                          borderTop: '1px solid var(--border)',
                          borderRight: '1px solid var(--border)',
                          borderBottom: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '12px 14px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ fontWeight: '800', fontSize: '12px', color: 'var(--text-main)' }}>
                            {b.title}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--teal)' }}>
                              {b.category}
                            </span>
                            <span style={{ fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', background: b.severity === 'critical' ? 'rgba(239, 68, 68, 0.2)' : b.severity === 'high' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)', color: b.severity === 'critical' ? '#ef4444' : b.severity === 'high' ? '#f59e0b' : '#38bdf8', textTransform: 'uppercase' }}>
                              {b.severity}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          {b.diagnosis}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: HOW TO IMPROVE */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span>⚡</span> How to Improve (Operational Recommendations &amp; Fast-Track Actions)
                </div>

                {suggestions.recommendations.length === 0 ? (
                  <div style={{ padding: '14px', background: 'var(--navy-light)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    No actionable speed-ups needed at this stage.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {suggestions.recommendations.map((r, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid rgba(20, 184, 166, 0.3)',
                          borderRadius: '10px',
                          padding: '14px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '12.5px', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>🚀</span> {r.title}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--cyan)', marginTop: '2px' }}>
                              Category: {r.category} · Assigned Role: <strong>{r.responsibleRole}</strong>
                            </div>
                          </div>
                          {r.impactDays && (
                            <span style={{ fontSize: '10.5px', fontWeight: '900', background: 'rgba(16, 185, 129, 0.18)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '3px 8px', borderRadius: '5px' }}>
                              ⚡ Saves ~{r.impactDays}d
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '11px', color: 'var(--text-main)', background: 'rgba(0, 0, 0, 0.25)', padding: '8px 10px', borderRadius: '6px', marginBottom: '6px', lineHeight: '1.4' }}>
                          <strong>Action:</strong> {r.action}
                        </div>

                        <div style={{ fontSize: '10.5px', color: 'var(--green)', fontWeight: '600' }}>
                          ✓ <strong>Expected Benefit:</strong> {r.benefit}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        <div className="modal-foot" style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Project ID: <span style={{ fontFamily: 'monospace', color: 'var(--teal)' }}>{project.id}</span> · FMCG Packaging Tracker v2.0
          </div>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
