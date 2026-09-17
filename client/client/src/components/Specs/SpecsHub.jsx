import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Trash2, ExternalLink, FileText, Layers, Plus, RefreshCw } from 'lucide-react';
import { fmt, getArtworkCode, hasArtwork, STATUS_CONFIG, getSpecStatus } from '../../utils';
import { getSpecLibrary, deleteSpecFromLibrary } from '../../api';
import SpecConverterModal from './SpecConverterModal';

export { getSpecStatus };


export function StatusBadge({ statusKey }) {
  const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.NO_SPEC;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      padding: '3px 9px', borderRadius: '20px',
      fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap'
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

/* ─── Single material card ─────────────────────────────────────────────── */
function MaterialSpecCard({
  project = {},
  material = {},
  mIdx,
  onOpenSpecModal,
  onOpenArtworkModal,
  canEdit,
  isLibraryMaster = false,
  onDeleteLibrarySpec
}) {
  const statusKey = getSpecStatus(material);
  const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.NO_SPEC;
  const specSheet = (material.specSheet && typeof material.specSheet === 'object') ? material.specSheet : null;
  const gov = specSheet?.governance || {};

  const pmCode = material.pmCode || specSheet?.docHeader?.itemCode || 'PM-TBD';
  const awCode = material.artworkCode || getArtworkCode(pmCode);
  const artworkReady = hasArtwork(material);

  const sigRows = [
    { role: 'Prepared By', data: gov.preparedBy, pendingLabel: 'Pending Submission', pendingColor: '#94a3b8' },
    { role: 'Checked By', data: gov.checkedBy, pendingLabel: 'Awaiting PM Review', pendingColor: '#f59e0b' },
    { role: 'Approved By', data: gov.approvedBy, pendingLabel: 'Awaiting Head Approval', pendingColor: '#94a3b8' },
  ];

  const handleOpenPdf = (e) => {
    e.stopPropagation();
    if (!material.sourcePdfData) return;
    const w = window.open('');
    if (w) {
      w.document.write(`
        <!DOCTYPE html>
        <html>
          <head><title>${material.sourcePdfName || 'Original Specification PDF'}</title></head>
          <body style="margin:0;background:#1e1e1e;">
            <iframe src="${material.sourcePdfData}" style="width:100%;height:100vh;border:none;"></iframe>
          </body>
        </html>
      `);
    }
  };

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: isLibraryMaster ? '1.5px solid rgba(0, 243, 255, 0.4)' : `1px solid ${cfg.border}`,
      borderLeft: isLibraryMaster ? '4px solid var(--teal)' : `3.5px solid ${cfg.dot}`,
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: isLibraryMaster ? '0 4px 16px rgba(0, 243, 255, 0.08)' : 'var(--shadow-xs)',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isLibraryMaster ? '0 4px 16px rgba(0, 243, 255, 0.08)' : 'var(--shadow-xs)';
      }}
    >
      {/* Card Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)', background: isLibraryMaster ? 'rgba(0, 243, 255, 0.06)' : 'rgba(6, 42, 48, 0.45)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.3, wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{material.name || 'Unnamed Material'}</span>
              {isLibraryMaster && (
                <span style={{
                  fontSize: '9px',
                  background: 'rgba(0, 243, 255, 0.15)',
                  color: 'var(--teal)',
                  border: '1px solid rgba(0, 243, 255, 0.3)',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  whiteSpace: 'nowrap'
                }}>
                  ✨ Master Spec
                </span>
              )}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <span>{material.type || 'Packaging Material'}</span>
              {material.pmCode && (
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)', background: 'rgba(0,243,255,0.08)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(0,243,255,0.2)', fontSize: '9.5px' }} title="Specification PM Code">
                  {material.pmCode}
                </span>
              )}
              {!isLibraryMaster && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpenArtworkModal && onOpenArtworkModal(project, material, mIdx); }}
                  style={{
                    background: artworkReady ? 'rgba(236,72,153,0.15)' : 'rgba(245,158,11,0.15)',
                    color: artworkReady ? '#f472b6' : '#fbbf24',
                    border: `1px solid ${artworkReady ? 'rgba(236,72,153,0.4)' : 'rgba(245,158,11,0.4)'}`,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title={artworkReady ? 'Click to inspect Artwork' : 'Click to upload Artwork'}
                >
                  🎨 {awCode} {artworkReady ? '✓' : '⏳'}
                </button>
              )}
            </div>
          </div>
          <StatusBadge statusKey={statusKey} />
        </div>

        {/* Project info link */}
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
          <span>{isLibraryMaster ? '📚' : '📦'}</span>
          <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>
            {isLibraryMaster ? (project.projectName ? `Linked: ${project.projectName}` : 'Master Spec Library') : (project.projectName || 'Project')}
          </span>
          {(project.skuSize || project.grammage) && (
            <span style={{ opacity: 0.7 }}>· {project.skuSize || project.grammage}</span>
          )}
          {material.supplier && (
            <span style={{ opacity: 0.7 }}>· 🏭 {material.supplier}</span>
          )}
        </div>
      </div>

      {/* Spec Doc Info (if spec exists) */}
      {specSheet?.docHeader && (
        <div style={{ padding: '8px 14px', background: 'rgba(4, 28, 32, 0.4)', borderBottom: '1px solid var(--border-color)', fontSize: '9.5px', display: 'flex', flexWrap: 'wrap', gap: '12px', color: 'var(--text-muted)' }}>
          <span><strong style={{ color: 'var(--text-dim)' }}>Doc:</strong> {specSheet.docHeader.docName || '—'}</span>
          <span><strong style={{ color: 'var(--text-dim)' }}>Rev:</strong> {specSheet.docHeader.revision || '0.0'}</span>
          <span><strong style={{ color: 'var(--text-dim)' }}>Date:</strong> {fmt(specSheet.docHeader.issueDate)}</span>
          <span><strong style={{ color: 'var(--text-dim)' }}>Params:</strong> {Array.isArray(specSheet.parameters) ? specSheet.parameters.length : 0}</span>
        </div>
      )}

      {/* Signature Status Row */}
      <div style={{ padding: '8px 14px', display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-color)', background: 'rgba(6, 42, 48, 0.25)' }}>
        {sigRows.map(({ role, data, pendingLabel, pendingColor }) => (
          <div key={role} style={{
            flex: 1, textAlign: 'center', padding: '6px 4px',
            background: data?.signed ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.18)',
            borderRadius: '5px', border: `1px solid ${data?.signed ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`,
            minWidth: 0
          }}>
            <div style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {role}
            </div>
            {data?.signed ? (
              <>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2, wordBreak: 'break-word' }}>
                  {data.name || 'Signed'}
                </div>
                <div style={{ fontSize: '8px', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                  ✓ {fmt(data.date)}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '8.5px', color: pendingColor, fontStyle: 'italic', marginTop: '2px' }}>
                {pendingLabel}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: 'auto', background: 'var(--card-bg)' }}>
        <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
          {statusKey === 'NO_SPEC'
            ? 'No engineering specification created'
            : statusKey === 'APPROVED'
            ? `Locked by ${gov.approvedBy?.name || 'Packaging Head'}`
            : `Updated ${fmt(specSheet?.docHeader?.issueDate)}`
          }
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {material.sourcePdfData && (
            <button
              type="button"
              onClick={handleOpenPdf}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="View original uploaded PDF"
            >
              <FileText size={12} />
              <span>PDF</span>
            </button>
          )}

          {!isLibraryMaster && (
            <button
              onClick={() => onOpenArtworkModal && onOpenArtworkModal(project, material, mIdx)}
              style={{
                background: artworkReady ? 'rgba(236, 72, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: artworkReady ? '#f472b6' : '#fbbf24',
                border: `1px solid ${artworkReady ? 'rgba(236, 72, 153, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              title={artworkReady ? 'View Artwork' : 'Upload Artwork'}
            >
              🎨 {artworkReady ? 'Artwork' : '+ Upload AW'}
            </button>
          )}

          <button
            onClick={() => {
              if (isLibraryMaster) {
                onOpenSpecModal && onOpenSpecModal({ project, material, mIdx: 0 });
              } else {
                onOpenSpecModal && onOpenSpecModal(project.id, mIdx);
              }
            }}
            style={{
              background: statusKey === 'NO_SPEC'
                ? 'linear-gradient(135deg, #0284c7, #4f46e5)'
                : statusKey === 'APPROVED'
                ? 'rgba(16,185,129,0.15)'
                : 'rgba(0,243,255,0.15)',
              color: statusKey === 'NO_SPEC'
                ? '#ffffff'
                : statusKey === 'APPROVED'
                ? '#34d399'
                : 'var(--teal)',
              border: `1px solid ${statusKey === 'NO_SPEC'
                ? 'transparent'
                : statusKey === 'APPROVED'
                ? 'rgba(16,185,129,0.4)'
                : 'rgba(0,243,255,0.4)'}`,
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '10.5px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              boxShadow: statusKey === 'NO_SPEC' ? '0 2px 8px rgba(2,132,199,0.3)' : 'none'
            }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1.0)'}
          >
            {statusKey === 'NO_SPEC' ? '+ Create Spec' : statusKey === 'APPROVED' ? '👁 View Spec' : '📋 Open Spec'}
          </button>

          {isLibraryMaster && canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteLibrarySpec && onDeleteLibrarySpec(material.libId);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Delete from Spec Library"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main SpecsHub Component ──────────────────────────────────────────── */
export default function SpecsHub({
  projects = [],
  onOpenSpecModal,
  onOpenArtworkModal,
  currentUser,
  showToast,
  onRefreshProjects
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'projects' | 'library'
  const [groupBy, setGroupBy] = useState('project'); // 'project' | 'status' | 'type'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Spec Converter Modal State
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [converterTarget, setConverterTarget] = useState({ projectId: null, materialIdx: null });

  // Spec Library Master Specs state
  const [librarySpecs, setLibrarySpecs] = useState([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Fetch Spec Library items
  const fetchLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await getSpecLibrary();
      if (res.data && res.data.specs) {
        setLibrarySpecs(res.data.specs);
      }
    } catch (e) {
      console.warn('Could not load Spec Library items:', e.message);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleDeleteLibrarySpec = async (id) => {
    if (!window.confirm('Delete this specification permanently from the Spec Library?')) return;
    try {
      await deleteSpecFromLibrary(id);
      showToast && showToast('🗑 Specification removed from Spec Library');
      setLibrarySpecs(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      showToast && showToast('Error deleting from Spec Library', true);
    }
  };

  // Safely flatten all materials from all projects + master library specs (Master Specs FIRST)
  const allMaterials = useMemo(() => {
    const flat = [];

    // 1. Master Spec Library items (prioritized first in library view)
    if (sourceFilter === 'all' || sourceFilter === 'library') {
      librarySpecs.forEach(item => {
        flat.push({
          isLibraryMaster: true,
          libSpec: item,
          project: {
            id: item.projectId || 'SPEC-LIB',
            projectName: item.projectName ? `${item.projectName} (Linked)` : 'Master Spec Library',
            fgCode: 'MASTER-SPEC'
          },
          material: {
            name: item.specName,
            type: item.materialType || item.category,
            pmCode: item.itemCode,
            artworkCode: item.specData?.docHeader?.artworkCode,
            specSheet: item.specData,
            sourcePdfName: item.sourcePdfName,
            sourcePdfData: item.sourcePdfData,
            libId: item.id
          },
          mIdx: 0,
          statusKey: item.specData?.governance?.status || 'APPROVED'
        });
      });
    }

    // 2. Project materials
    if (sourceFilter === 'all' || sourceFilter === 'projects') {
      const projList = Array.isArray(projects) ? projects : [];
      projList.forEach(project => {
        if (!project) return;
        const mats = Array.isArray(project.materials) ? project.materials : [];
        mats.forEach((material, mIdx) => {
          if (!material) return;
          flat.push({
            isLibraryMaster: false,
            project,
            material,
            mIdx,
            statusKey: getSpecStatus(material)
          });
        });
      });
    }

    return flat;
  }, [projects, librarySpecs, sourceFilter]);

  // Summary counts across all materials
  const counts = useMemo(() => {
    const c = { total: allMaterials.length };
    Object.keys(STATUS_CONFIG).forEach(k => {
      c[k] = allMaterials.filter(m => m.statusKey === k).length;
    });
    return c;
  }, [allMaterials]);

  // Filtered materials based on search and status filter
  const filtered = useMemo(() => {
    const q = (search || '').toLowerCase().trim();
    return allMaterials.filter(({ project, material, statusKey }) => {
      if (!project || !material) return false;
      const fields = [
        material.name,
        material.type,
        material.pmCode,
        project.projectName,
        project.fgCode,
        material.supplier
      ];
      const matchSearch = !q || fields.some(v => v != null && String(v).toLowerCase().includes(q));
      const matchStatus = !statusFilter || statusKey === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allMaterials, search, statusFilter]);

  // Group items according to selected groupBy mode
  const groups = useMemo(() => {
    if (groupBy === 'status') {
      const order = ['APPROVED', 'CHECKED_PENDING_APPROVAL', 'PENDING_CHECK', 'DRAFT', 'REVISION_REQUESTED', 'NO_SPEC'];
      return order
        .map(key => ({
          key,
          label: STATUS_CONFIG[key]?.label || key,
          items: filtered.filter(m => m.statusKey === key)
        }))
        .filter(g => g.items.length > 0);
    }
    if (groupBy === 'type') {
      const byType = {};
      filtered.forEach(item => {
        const t = (item.material && item.material.type) || 'Other';
        if (!byType[t]) byType[t] = [];
        byType[t].push(item);
      });
      return Object.entries(byType)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, items]) => ({ key, label: key, items }));
    }
    // groupBy === 'project'
    const byProject = {};
    filtered.forEach(item => {
      const proj = item.project || {};
      const k = proj.id || 'unassigned';
      if (!byProject[k]) {
        byProject[k] = { key: k, label: proj.projectName || 'Master Spec Library', items: [] };
      }
      byProject[k].items.push(item);
    });
    // Ensure Master Spec Library is at the very top
    const projGroups = Object.values(byProject);
    projGroups.sort((a, b) => {
      if (a.key === 'SPEC-LIB') return -1;
      if (b.key === 'SPEC-LIB') return 1;
      return 0;
    });
    return projGroups;
  }, [filtered, groupBy]);

  const canEdit = ['updater', 'editor', 'admin', 'superadmin'].includes(currentUser?.role);

  return (
    <div id="specs-hub" className="panel active" style={{ padding: '0' }}>
      {/* ── Top Controls Bar ────────────────────────────────────────────── */}
      <div className="hub-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 Packaging Specification Library
          </span>
          <span style={{
            background: 'rgba(0, 243, 255, 0.12)',
            color: 'var(--teal)',
            border: '1px solid rgba(0, 243, 255, 0.3)',
            padding: '2px 9px',
            borderRadius: '20px',
            fontSize: '10.5px',
            fontWeight: 800
          }}>
            {filtered.length} spec{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 auto', justifyContent: 'flex-end' }}>
          {/* ✨ PROMINENT SPEC CONVERTER BUTTON */}
          <button
            type="button"
            onClick={() => {
              setConverterTarget({ projectId: null, materialIdx: null });
              setIsConverterOpen(true);
            }}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 800,
              padding: '6px 14px',
              boxShadow: '0 2px 12px rgba(0, 243, 255, 0.35)',
              borderRadius: '6px'
            }}
          >
            <Sparkles size={14} />
            <span>Spec Converter (PDF to New Format)</span>
          </button>

          <input
            className="hub-search-box"
            placeholder="🔍 Search specs, code, type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* Library Source Filter */}
          <select
            className="filter-sel"
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            style={{ backgroundColor: '#062a30' }}
          >
            <option value="all">All Sources</option>
            <option value="projects">Project Materials</option>
            <option value="library">Master Spec Library</option>
          </select>

          <select
            className="filter-sel"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k} style={{ backgroundColor: '#062a30', color: '#ffffff' }}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Group by + Grid/Table toggle (strictly paired side-by-side) */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <select
              className="filter-sel"
              value={groupBy}
              onChange={e => setGroupBy(e.target.value)}
              style={{ margin: 0 }}
            >
              <option value="project" style={{ backgroundColor: '#062a30' }}>Group by Project</option>
              <option value="status" style={{ backgroundColor: '#062a30' }}>Group by Status</option>
              <option value="type" style={{ backgroundColor: '#062a30' }}>Group by Material Type</option>
            </select>

            <div style={{
              display: 'inline-flex',
              gap: '2px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '2px',
              flexShrink: 0
            }}>
              {[['grid', '⊞ Grid'], ['table', '≡ Table']].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    background: viewMode === mode ? 'var(--teal)' : 'transparent',
                    color: viewMode === mode ? '#041c20' : 'var(--text-dim)',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Filter Pills ────────────────────────────────────────── */}
      <div style={{
        padding: '10px 20px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center',
        background: 'rgba(6, 42, 48, 0.5)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {/* Source Switcher Pills */}
        <div style={{ display: 'flex', gap: '4px', marginRight: '6px', borderRight: '1px solid var(--border-color)', paddingRight: '10px' }}>
          <button
            type="button"
            onClick={() => setSourceFilter('all')}
            style={{
              background: sourceFilter === 'all' ? 'var(--teal)' : 'rgba(0,0,0,0.25)',
              color: sourceFilter === 'all' ? '#041c20' : 'var(--text-dim)',
              border: `1px solid ${sourceFilter === 'all' ? 'var(--teal)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            All Specs ({allMaterials.length})
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('library')}
            style={{
              background: sourceFilter === 'library' ? 'var(--teal)' : 'rgba(0, 243, 255, 0.08)',
              color: sourceFilter === 'library' ? '#041c20' : 'var(--teal)',
              border: `1px solid ${sourceFilter === 'library' ? 'var(--teal)' : 'rgba(0, 243, 255, 0.25)'}`,
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📚 Master Spec Library</span>
            <span style={{
              background: sourceFilter === 'library' ? 'rgba(0,0,0,0.3)' : 'rgba(0,243,255,0.2)',
              color: sourceFilter === 'library' ? '#ffffff' : 'var(--teal)',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '9.5px',
              fontWeight: 800
            }}>
              {librarySpecs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('projects')}
            style={{
              background: sourceFilter === 'projects' ? 'var(--teal)' : 'rgba(0,0,0,0.25)',
              color: sourceFilter === 'projects' ? '#041c20' : 'var(--text-dim)',
              border: `1px solid ${sourceFilter === 'projects' ? 'var(--teal)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            📦 Project Materials ({allMaterials.filter(m => !m.isLibraryMaster).length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setStatusFilter('')}
          style={{
            background: !statusFilter ? 'rgba(0, 243, 255, 0.15)' : 'rgba(0,0,0,0.2)',
            border: `1px solid ${!statusFilter ? 'var(--teal)' : 'rgba(255,255,255,0.08)'}`,
            color: !statusFilter ? 'var(--teal)' : 'var(--text-dim)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          All Statuses · {counts.total}
        </button>

        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => counts[key] > 0 && (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            style={{
              background: statusFilter === key ? cfg.bg : 'rgba(0,0,0,0.2)',
              border: `1px solid ${statusFilter === key ? cfg.border : 'rgba(255,255,255,0.08)'}`,
              color: cfg.color,
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '10.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {cfg.icon} {cfg.label} · {counts[key]}
          </button>
        ))}

        <button
          type="button"
          onClick={fetchLibrary}
          title="Refresh Spec Library"
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '4px 10px',
            color: 'var(--text-dim)',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <RefreshCw size={12} style={{ animation: isLoadingLibrary ? 'spin 1s linear infinite' : 'none' }} />
          <span>{isLoadingLibrary ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
        {isLoadingLibrary && filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--teal)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔄</div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Loading specifications from Spec Library...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="empty-icon" style={{ fontSize: '42px', marginBottom: '12px' }}>📋</div>
            <div className="empty-title" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
              {allMaterials.length === 0 ? 'No specifications in library yet' : 'No matching specifications found'}
            </div>
            <div className="empty-sub" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '440px', margin: '6px auto 16px' }}>
              Convert an existing specification PDF or create a packaging project to automatically build your engineering library.
            </div>
            <button
              type="button"
              onClick={() => setIsConverterOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} />
              <span>Convert Spec from PDF</span>
            </button>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.key || group.label} style={{ marginBottom: '32px' }}>
              {/* Group header banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '14px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {group.label}
                </span>
                <span style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--text-dim)',
                  padding: '1px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 700
                }}>
                  {group.items.length} spec{group.items.length !== 1 ? 's' : ''}
                </span>
                <div style={{ flex: 1, height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  {(() => {
                    const approved = group.items.filter(m => m.statusKey === 'APPROVED').length;
                    const pct = group.items.length ? Math.round((approved / group.items.length) * 100) : 0;
                    return <div style={{ height: '100%', width: `${pct}%`, background: '#10b981', borderRadius: '4px', transition: 'width 0.3s' }} />;
                  })()}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {group.items.filter(m => m.statusKey === 'APPROVED').length}/{group.items.length} approved
                </span>
              </div>

              {/* Grid or Table layout */}
              {viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '14px' }}>
                  {group.items.map(({ project, material, mIdx, isLibraryMaster }) => (
                    <MaterialSpecCard
                      key={`${project?.id || 'p'}-${material.libId || mIdx}`}
                      project={project}
                      material={material}
                      mIdx={mIdx}
                      onOpenSpecModal={onOpenSpecModal}
                      onOpenArtworkModal={onOpenArtworkModal}
                      canEdit={canEdit}
                      isLibraryMaster={isLibraryMaster}
                      onDeleteLibrarySpec={handleDeleteLibrarySpec}
                    />
                  ))}
                </div>
              ) : (
                <div className="table-scroll-wrap" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                  <table className="modern-mat-table" style={{ width: '100%', minWidth: '980px', fontSize: '11px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '200px' }}>Specification / Component</th>
                        <th style={{ width: '120px' }}>Type</th>
                        <th style={{ width: '110px' }}>PM Code</th>
                        <th style={{ width: '110px' }}>AW Code</th>
                        <th style={{ width: '160px' }}>Project / Scope</th>
                        <th style={{ width: '70px', textAlign: 'center' }}>Revision</th>
                        <th>Status</th>
                        <th style={{ width: '110px' }}>Prepared By</th>
                        <th style={{ width: '110px' }}>Approved By</th>
                        <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map(({ project, material, mIdx, isLibraryMaster }) => {
                        const sk = getSpecStatus(material);
                        const specSheet = (material.specSheet && typeof material.specSheet === 'object') ? material.specSheet : null;
                        const gov = specSheet?.governance || {};
                        const pmCode = material.pmCode || specSheet?.docHeader?.itemCode || '—';
                        const awCode = material.artworkCode || getArtworkCode(pmCode);
                        const artworkReady = hasArtwork(material);

                        return (
                          <tr key={`${project?.id || 'p'}-${material.libId || mIdx}`}>
                            <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{material.name || 'Unnamed Material'}</span>
                                {isLibraryMaster && (
                                  <span style={{ fontSize: '8.5px', color: 'var(--teal)', background: 'rgba(0,243,255,0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                                    Master
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ color: 'var(--text-dim)', fontSize: '10px' }}>{material.type || '—'}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)', fontSize: '10px' }}>{pmCode}</td>
                            <td>
                              {!isLibraryMaster ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenArtworkModal && onOpenArtworkModal(project, material, mIdx)}
                                  style={{
                                    background: artworkReady ? 'rgba(236,72,153,0.15)' : 'rgba(245,158,11,0.15)',
                                    color: artworkReady ? '#f472b6' : '#fbbf24',
                                    border: `1px solid ${artworkReady ? 'rgba(236,72,153,0.4)' : 'rgba(245,158,11,0.4)'}`,
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                  title={artworkReady ? 'View uploaded artwork' : 'Upload artwork'}
                                >
                                  {awCode} {artworkReady ? '✓' : '⏳'}
                                </button>
                              ) : (
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '9.5px' }}>{awCode}</span>
                              )}
                            </td>
                            <td style={{ fontSize: '10.5px', color: 'var(--text-body)' }}>
                              {isLibraryMaster ? '📚 Master Spec Library' : (project.projectName || '—')}
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>{specSheet?.docHeader?.revision || '—'}</td>
                            <td><StatusBadge statusKey={sk} /></td>
                            <td style={{ fontSize: '10px' }}>
                              {gov.preparedBy?.signed
                                ? <span style={{ color: '#10b981', fontWeight: 700 }}>✓ {gov.preparedBy.name || 'Executive'}</span>
                                : <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Pending</span>}
                            </td>
                            <td style={{ fontSize: '10px' }}>
                              {gov.approvedBy?.signed
                                ? <span style={{ color: '#10b981', fontWeight: 800 }}>✓ {gov.approvedBy.name || 'Head'}</span>
                                : <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Pending</span>}
                            </td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', gap: '4px' }}>
                                {material.sourcePdfData && (
                                  <button
                                    onClick={() => {
                                      const w = window.open('');
                                      if (w) w.document.write(`<iframe src="${material.sourcePdfData}" style="width:100%;height:100vh;border:none;"></iframe>`);
                                    }}
                                    style={{
                                      background: 'rgba(255,255,255,0.08)',
                                      color: '#ffffff',
                                      border: '1px solid rgba(255,255,255,0.2)',
                                      borderRadius: '4px',
                                      padding: '3px 6px',
                                      fontSize: '9.5px',
                                      cursor: 'pointer'
                                    }}
                                    title="View Original PDF"
                                  >
                                    📄 PDF
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (isLibraryMaster) {
                                      onOpenSpecModal && onOpenSpecModal({ project, material, mIdx: 0 });
                                    } else {
                                      onOpenSpecModal && onOpenSpecModal(project.id, mIdx);
                                    }
                                  }}
                                  style={{
                                    background: sk === 'NO_SPEC' ? 'var(--teal)' : 'rgba(0,243,255,0.12)',
                                    color: sk === 'NO_SPEC' ? '#041c20' : 'var(--teal)',
                                    border: `1px solid ${sk === 'NO_SPEC' ? 'var(--teal)' : 'rgba(0,243,255,0.3)'}`,
                                    borderRadius: '4px',
                                    padding: '3px 7px',
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {sk === 'NO_SPEC' ? '+ Spec' : 'Spec'}
                                </button>
                                {isLibraryMaster && canEdit && (
                                  <button
                                    onClick={() => handleDeleteLibrarySpec(material.libId)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      padding: '3px 5px'
                                    }}
                                    title="Delete from Spec Library"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Spec Converter Modal ───────────────────────────────────────── */}
      <SpecConverterModal
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
        projects={projects}
        initialProjectId={converterTarget.projectId}
        initialMaterialIdx={converterTarget.materialIdx}
        onSpecSaved={(savedSpec, linkedProjectId) => {
          if (savedSpec) {
            setLibrarySpecs(prev => [savedSpec, ...prev.filter(s => s.id !== savedSpec.id)]);
          }
          fetchLibrary();
          if (linkedProjectId && onRefreshProjects) {
            onRefreshProjects();
          }
        }}
        showToast={showToast}
      />
    </div>
  );
}
