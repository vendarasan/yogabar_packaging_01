import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Printer,
  X,
  ClipboardList,
  TrendingUp,
  Building2,
  Clock,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import {
  getProjectReviewReport,
  getManagementReport,
  getSupplierPerformanceReport,
  getStageAnalyticsReport
} from '../../api';

export default function ExecutiveReportingModal({ isOpen, onClose, projects = [], initialProjectId = null }) {
  const [activeTab, setActiveTab] = useState('project-review'); // 'project-review' | 'management' | 'suppliers' | 'stages'
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || (projects[0]?.id || ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Report states
  const [projectReport, setProjectReport] = useState(null);
  const [mgmtReport, setMgmtReport] = useState(null);
  const [supplierReport, setSupplierReport] = useState(null);
  const [stageReport, setStageReport] = useState(null);

  useEffect(() => {
    if (initialProjectId) setSelectedProjectId(initialProjectId);
    else if (!selectedProjectId && projects.length > 0) setSelectedProjectId(projects[0].id);
  }, [initialProjectId, projects]);

  useEffect(() => {
    if (!isOpen) return;
    loadActiveReport();
  }, [isOpen, activeTab, selectedProjectId]);

  const loadActiveReport = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'project-review') {
        if (selectedProjectId) {
          const res = await getProjectReviewReport(selectedProjectId);
          setProjectReport(res.data?.report || null);
        }
      } else if (activeTab === 'management') {
        const res = await getManagementReport();
        setMgmtReport(res.data?.report || null);
      } else if (activeTab === 'suppliers') {
        const res = await getSupplierPerformanceReport();
        setSupplierReport(res.data?.report || null);
      } else if (activeTab === 'stages') {
        const res = await getStageAnalyticsReport();
        setStageReport(res.data?.report || null);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        className="modal-content"
        style={{
          width: '1020px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card-bg, #0B2529)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
          borderRadius: '14px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(0, 200, 215, 0.15)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            background: 'var(--bg-sidebar, #06171A)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(0, 212, 200, 0.14)',
                border: '1px solid rgba(0, 212, 200, 0.3)',
                color: 'var(--primary, #00d4c8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <BarChart3 size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-main, #F2F7F7)', letterSpacing: '0.01em' }}>
                  Executive Reporting &amp; Analytics
                </h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(0, 212, 200, 0.15)',
                    color: 'var(--primary, #00d4c8)',
                    border: '1px solid rgba(0, 212, 200, 0.3)'
                  }}
                >
                  Pass 8 Engine
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted, #7E9B9E)' }}>
                Authoritative, fact-based reports generated directly from live platform records
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '7px 13px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                color: 'var(--text-main, #F2F7F7)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
            >
              <Printer size={14} />
              Print / PDF
            </button>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #7E9B9E)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted, #7E9B9E)'; }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            background: 'rgba(5, 20, 23, 0.65)'
          }}
        >
          {[
            { id: 'project-review', label: 'Project Review Briefing', icon: ClipboardList },
            { id: 'management', label: 'Management KPIs', icon: TrendingUp },
            { id: 'suppliers', label: 'Supplier Performance', icon: Building2 },
            { id: 'stages', label: 'Stage Cycle Times', icon: Clock }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: isActive ? '700' : '500',
                  border: isActive ? '1px solid var(--primary, #00d4c8)' : '1px solid transparent',
                  background: isActive ? 'var(--primary, #00d4c8)' : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#031416' : 'var(--text-muted, #7E9B9E)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = 'var(--text-main, #F2F7F7)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = 'var(--text-muted, #7E9B9E)';
                  }
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(0, 212, 200, 0.2)',
                  borderTopColor: 'var(--primary, #00d4c8)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #7E9B9E)' }}>Computing authoritative analytics...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: PROJECT REVIEW */}
              {activeTab === 'project-review' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Selector in UI */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '12px',
                      borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
                    }}
                  >
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main, #F2F7F7)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      Select Project:
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        style={{
                          background: 'rgba(6, 23, 26, 0.9)',
                          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.14))',
                          color: '#fff',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.projectName} ({p.fgCode || 'No FG'})
                          </option>
                        ))}
                      </select>
                    </label>

                    {projectReport && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted, #7E9B9E)' }}>
                        Generated: {new Date(projectReport.generatedAt).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {projectReport && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {/* Project Review Header Card */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                          borderRadius: '12px',
                          padding: '18px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary, #00d4c8)' }}>
                                {projectReport.project.id}
                              </span>
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary, #B2C8C9)' }}>
                                {projectReport.project.stage}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                  background: projectReport.project.status === 'Delayed' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                                  color: projectReport.project.status === 'Delayed' ? '#f87171' : '#34d399'
                                }}
                              >
                                {projectReport.project.status}
                              </span>
                            </div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-main, #F2F7F7)' }}>
                              {projectReport.project.projectName}
                            </h3>
                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--text-muted, #7E9B9E)' }}>
                              FG Code: <strong style={{ color: 'var(--text-main, #F2F7F7)' }}>{projectReport.project.fgCode}</strong> • SKU/Grammage: {projectReport.project.skuSize || 'N/A'} • Converter: {projectReport.project.supplier}
                            </p>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #7E9B9E)' }}>
                              Target Launch
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary, #00d4c8)', marginTop: '2px' }}>
                              {projectReport.project.targetLaunchDate || 'TBD'}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: projectReport.project.daysLeft < 0 ? '#f87171' : 'var(--text-secondary, #B2C8C9)',
                                marginTop: '2px'
                              }}
                            >
                              {projectReport.project.daysLeft !== null ? `${projectReport.project.daysLeft} days remaining (${projectReport.project.ltStatus})` : 'Timeline TBD'}
                            </div>
                          </div>
                        </div>

                        {/* Ownership Matrix */}
                        <div
                          style={{
                            marginTop: '16px',
                            paddingTop: '14px',
                            borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted, #7E9B9E)' }}>Project Lead</div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main, #F2F7F7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {projectReport.ownership?.projectOwner || 'Unassigned'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted, #7E9B9E)' }}>Packaging Eng</div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main, #F2F7F7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {projectReport.ownership?.packagingOwner || 'Unassigned'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted, #7E9B9E)' }}>Artwork Lead</div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main, #F2F7F7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {projectReport.ownership?.artworkOwner || 'Unassigned'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted, #7E9B9E)' }}>Procurement</div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main, #F2F7F7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {projectReport.ownership?.procurementOwner || 'Unassigned'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted, #7E9B9E)' }}>QA Signoff</div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main, #F2F7F7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {projectReport.ownership?.qaOwner || 'Unassigned'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Materials Table */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #7E9B9E)' }}>
                          Packaging Components &amp; Bill of Materials ({projectReport.materials.length})
                        </h4>
                        <div
                          style={{
                            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                            borderRadius: '10px',
                            overflow: 'hidden'
                          }}
                        >
                          <table style={{ width: '100%', textAlign: 'left', fontSize: '12px', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-muted, #7E9B9E)', borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))' }}>
                              <tr>
                                <th style={{ padding: '10px 12px' }}>Component</th>
                                <th style={{ padding: '10px 12px' }}>Type</th>
                                <th style={{ padding: '10px 12px' }}>PM Code</th>
                                <th style={{ padding: '10px 12px' }}>Stage</th>
                                <th style={{ padding: '10px 12px' }}>PO Status</th>
                                <th style={{ padding: '10px 12px' }}>Artwork</th>
                                <th style={{ padding: '10px 12px' }}>Spec Signoff</th>
                              </tr>
                            </thead>
                            <tbody>
                              {projectReport.materials.map((m, idx) => (
                                <tr
                                  key={m.id || m.name}
                                  style={{
                                    borderBottom: idx === projectReport.materials.length - 1 ? 'none' : '1px solid var(--border-color, rgba(255, 255, 255, 0.05))',
                                    transition: 'background 0.15s ease'
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <td style={{ padding: '10px 12px', fontWeight: '600', color: 'var(--text-main, #F2F7F7)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {m.isCriticalPath && (
                                        <span
                                          style={{
                                            fontSize: '9px',
                                            fontWeight: '700',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            background: 'rgba(245, 158, 11, 0.18)',
                                            color: '#fbbf24',
                                            border: '1px solid rgba(245, 158, 11, 0.3)'
                                          }}
                                        >
                                          CPM
                                        </span>
                                      )}
                                      {m.name}
                                    </div>
                                  </td>
                                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary, #B2C8C9)' }}>{m.type}</td>
                                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-muted, #7E9B9E)' }}>{m.pmCode}</td>
                                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary, #B2C8C9)' }}>{m.stage}</td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        padding: '2px 7px',
                                        borderRadius: '6px',
                                        fontWeight: '600',
                                        background: m.poStatus === 'Raised' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                                        color: m.poStatus === 'Raised' ? '#34d399' : 'var(--text-muted, #7E9B9E)'
                                      }}
                                    >
                                      {m.poStatus}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        padding: '2px 7px',
                                        borderRadius: '6px',
                                        fontWeight: '600',
                                        background: m.artworkStatus === 'Approved' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                                        color: m.artworkStatus === 'Approved' ? '#34d399' : 'var(--text-muted, #7E9B9E)'
                                      }}
                                    >
                                      {m.artworkStatus}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        padding: '2px 7px',
                                        borderRadius: '6px',
                                        fontWeight: '600',
                                        background: m.specStatus === 'Signed Off' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                                        color: m.specStatus === 'Signed Off' ? '#34d399' : 'var(--text-muted, #7E9B9E)'
                                      }}
                                    >
                                      {m.specStatus}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Risks & Open Actions Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                        {/* Risks */}
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                            borderRadius: '12px',
                            padding: '16px'
                          }}
                        >
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main, #F2F7F7)' }}>
                            Project Risks ({projectReport.risks.length})
                          </h4>
                          {projectReport.risks.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #7E9B9E)', fontStyle: 'italic' }}>No structured risks logged.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {projectReport.risks.slice(0, 4).map(r => (
                                <div
                                  key={r.id}
                                  style={{
                                    padding: '10px',
                                    borderRadius: '8px',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
                                    fontSize: '12px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--text-main, #F2F7F7)' }}>{r.title}</span>
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        background: r.severity === 'Critical' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                                        color: r.severity === 'Critical' ? '#f87171' : '#fbbf24'
                                      }}
                                    >
                                      {r.severity}
                                    </span>
                                  </div>
                                  <p style={{ margin: 0, color: 'var(--text-muted, #7E9B9E)', fontSize: '11px' }}>
                                    {r.action || 'No mitigation action defined.'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Open Tasks */}
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                            borderRadius: '12px',
                            padding: '16px'
                          }}
                        >
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main, #F2F7F7)' }}>
                            Open Tasks &amp; Actions ({projectReport.tasks.open})
                          </h4>
                          {projectReport.tasks.items.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #7E9B9E)', fontStyle: 'italic' }}>Zero pending action items.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {projectReport.tasks.items.slice(0, 4).map(t => (
                                <div
                                  key={t.id}
                                  style={{
                                    padding: '10px',
                                    borderRadius: '8px',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
                                    fontSize: '12px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--text-main, #F2F7F7)' }}>{t.title}</span>
                                    <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--primary, #00d4c8)' }}>{t.status}</span>
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #7E9B9E)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>Assignee: {t.assigneeName || 'Unassigned'}</span>
                                    <span>Due: {t.dueDate || 'TBD'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MANAGEMENT KPIS */}
              {activeTab === 'management' && mgmtReport && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Current Metric Cards */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #7E9B9E)' }}>
                        Current Platform Workload
                      </h4>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', border: '1px solid rgba(14, 165, 233, 0.25)', fontWeight: '600' }}>
                        Category: Current
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                          borderRadius: '12px',
                          padding: '16px'
                        }}
                      >
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #7E9B9E)' }}>Total Tracked Projects</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main, #F2F7F7)', marginTop: '4px' }}>
                          {mgmtReport.metricCategories.current.totalTrackedProjects}
                        </div>
                      </div>
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                          borderRadius: '12px',
                          padding: '16px'
                        }}
                      >
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #7E9B9E)' }}>Active Pipeline (In Dev)</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary, #00d4c8)', marginTop: '4px' }}>
                          {mgmtReport.metricCategories.current.activeDevelopmentProjects}
                        </div>
                      </div>
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                          borderRadius: '12px',
                          padding: '16px'
                        }}
                      >
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #7E9B9E)' }}>Launched Commercial Products</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#34d399', marginTop: '4px' }}>
                          {mgmtReport.metricCategories.current.launchedCommercialProjects}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Calculated Metrics */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: 0, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #7E9B9E)' }}>
                        Calculated Health &amp; Schedule Analytics
                      </h4>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: '600' }}>
                        Category: Calculated
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                      {/* Status Breakdown */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                          borderRadius: '12px',
                          padding: '16px'
                        }}
                      >
                        <h5 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary, #B2C8C9)' }}>
                          Portfolio Status Distribution
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                          {Object.entries(mgmtReport.metricCategories.calculated.statusDistribution).map(([st, cnt]) => (
                            <div
                              key={st}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                background: 'rgba(0, 0, 0, 0.25)'
                              }}
                            >
                              <span style={{ color: 'var(--text-secondary, #B2C8C9)' }}>{st}</span>
                              <span style={{ fontWeight: '700', color: 'var(--text-main, #F2F7F7)' }}>{cnt}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Upcoming Launches */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                          borderRadius: '12px',
                          padding: '16px'
                        }}
                      >
                        <h5 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary, #B2C8C9)' }}>
                          Upcoming Commercial Launches
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              background: 'rgba(0, 0, 0, 0.25)'
                            }}
                          >
                            <span style={{ color: 'var(--text-secondary, #B2C8C9)' }}>Next 30 Days (Critical Horizon)</span>
                            <span style={{ fontWeight: '700', color: '#f87171' }}>{mgmtReport.metricCategories.calculated.upcomingLaunchesCount.next30Days}</span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              background: 'rgba(0, 0, 0, 0.25)'
                            }}
                          >
                            <span style={{ color: 'var(--text-secondary, #B2C8C9)' }}>Next 60 Days</span>
                            <span style={{ fontWeight: '700', color: '#fbbf24' }}>{mgmtReport.metricCategories.calculated.upcomingLaunchesCount.next60Days}</span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              background: 'rgba(0, 0, 0, 0.25)'
                            }}
                          >
                            <span style={{ color: 'var(--text-secondary, #B2C8C9)' }}>Next 90 Days</span>
                            <span style={{ fontWeight: '700', color: 'var(--primary, #00d4c8)' }}>{mgmtReport.metricCategories.calculated.upcomingLaunchesCount.next90Days}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SUPPLIER PERFORMANCE */}
              {activeTab === 'suppliers' && supplierReport && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0, 212, 200, 0.08)',
                      border: '1px solid rgba(0, 212, 200, 0.2)',
                      color: 'var(--primary, #00d4c8)',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Info size={15} />
                    <span>{supplierReport.methodologyNote}</span>
                  </div>

                  <div
                    style={{
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                      borderRadius: '10px',
                      overflow: 'hidden'
                    }}
                  >
                    <table style={{ width: '100%', textAlign: 'left', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <thead style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-muted, #7E9B9E)', borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))' }}>
                        <tr>
                          <th style={{ padding: '10px 12px' }}>Supplier / Converter</th>
                          <th style={{ padding: '10px 12px' }}>Projects</th>
                          <th style={{ padding: '10px 12px' }}>Components</th>
                          <th style={{ padding: '10px 12px' }}>Avg Lead Time</th>
                          <th style={{ padding: '10px 12px' }}>Delayed</th>
                          <th style={{ padding: '10px 12px' }}>On-Time Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierReport.suppliers.map((s, idx) => (
                          <tr
                            key={s.supplierName}
                            style={{
                              borderBottom: idx === supplierReport.suppliers.length - 1 ? 'none' : '1px solid var(--border-color, rgba(255, 255, 255, 0.05))',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <td style={{ padding: '10px 12px', fontWeight: '600', color: 'var(--text-main, #F2F7F7)' }}>{s.supplierName}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary, #B2C8C9)' }}>{s.activeProjectsCount}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary, #B2C8C9)' }}>{s.materialsCount}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary, #B2C8C9)' }}>{s.averageLeadTimeDays} days</td>
                            <td style={{ padding: '10px 12px', color: '#f87171', fontWeight: '600' }}>{s.delayedMaterialsCount}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '80px', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${s.onTimePerformanceRate}%`,
                                      background: s.onTimePerformanceRate >= 80 ? '#34d399' : s.onTimePerformanceRate >= 50 ? '#fbbf24' : '#f87171',
                                      borderRadius: '999px'
                                    }}
                                  />
                                </div>
                                <span style={{ fontWeight: '700', color: 'var(--text-main, #F2F7F7)' }}>{s.onTimePerformanceRate}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: STAGE ANALYTICS */}
              {activeTab === 'stages' && stageReport && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    {stageReport.stages.map(st => (
                      <div
                        key={st.stage}
                        style={{
                          padding: '14px',
                          borderRadius: '12px',
                          border: st.isBottleneck ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                          background: st.isBottleneck ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main, #F2F7F7)' }}>{st.stage}</span>
                          {st.isBottleneck && (
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: '700',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(245, 158, 11, 0.2)',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.3)'
                              }}
                            >
                              Bottleneck
                            </span>
                          )}
                        </div>

                        {st.hasHistoricalData ? (
                          <>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary, #00d4c8)', marginTop: '4px' }}>
                              {st.averageDurationDays}d <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-muted, #7E9B9E)' }}>avg</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #B2C8C9)' }}>Delay rate: {st.delayFrequencyRate}%</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted, #7E9B9E)' }}>{st.dataPointsCount} transition points</div>
                          </>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted, #7E9B9E)', fontStyle: 'italic', padding: '6px 0' }}>
                            {st.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            background: 'var(--bg-sidebar, #06171A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'var(--text-muted, #7E9B9E)'
          }}
        >
          <span>Packaging Lifecycle OS • Authoritative Analytics Engine</span>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
              color: 'var(--text-main, #F2F7F7)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
