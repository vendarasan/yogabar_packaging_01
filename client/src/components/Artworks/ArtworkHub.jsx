import React, { useState, useMemo, useRef } from 'react';
import { Plus, Eye, Download, RefreshCw, Trash2, Palette, Package, FileText, CheckCircle2, Clock, AlertTriangle, Search, Filter } from 'lucide-react';
import { fmt, getArtworkCode, hasArtwork, getArtworkFiles, STAGE_COLORS } from '../../utils';
import { getSpecStatus, StatusBadge } from '../Specs/SpecsHub';
import { updateMaterialArtwork } from '../../api';

// Helper to trigger browser file picker dynamically without cluttering the DOM
const triggerFileInput = (accept, multiple, onSelect) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = multiple;
  input.onchange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onSelect(files);
  };
  input.click();
};

// Process an uploaded file into base64 DataURL and standardize name with AW code
const processFile = (file, awCode) => {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const cleanOriginal = file.name.replace(/^AW-[^_]+_/, '').replace(/^PM-[^_]+_/, '');
    const standardizedName = file.name.startsWith(awCode)
      ? file.name
      : `${awCode}_${cleanOriginal}`;

    const fileType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');

    const reader = new FileReader();
    reader.onload = (ev) => {
      resolve({
        name: standardizedName,
        url: ev.target.result,
        type: fileType,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

// Trigger direct browser download of active artwork file
const downloadFile = (file, awCode) => {
  if (!file || !file.url) return;
  const link = document.createElement('a');
  link.href = file.url;
  const cleanOriginal = (file.name || 'artwork').replace(/^AW-[^_]+_/, '').replace(/^PM-[^_]+_/, '');
  const filename = (file.name || '').startsWith(awCode)
    ? file.name
    : `${awCode}_${cleanOriginal}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function ArtworkHub({
  projects = [],
  onOpenArtworkModal,
  onOpenSpecModal,
  currentUser,
  canEdit = true,
  onArtworkUpdated,
  onRefreshProjects,
  showToast
}) {
  const [search, setSearch] = useState('');
  const [artworkStatusFilter, setArtworkStatusFilter] = useState(''); // '' | 'UPLOADED' | 'PENDING'
  const [typeFilter, setTypeFilter] = useState('');
  const [groupBy, setGroupBy] = useState('project'); // 'project' | 'status' | 'type'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Row-level async processing state (e.g. `${projectId}-${mIdx}`)
  const [processingKey, setProcessingKey] = useState(null);

  // Top-level "+ Upload Artwork" modal state (Create)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadProjectId, setUploadProjectId] = useState('');
  const [uploadMIdx, setUploadMIdx] = useState(0);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const modalFileInputRef = useRef(null);

  // Flatten all materials with artwork metadata
  const allArtworkItems = useMemo(() => {
    const list = [];
    const projList = Array.isArray(projects) ? projects : [];
    projList.forEach(project => {
      if (!project) return;
      const mats = Array.isArray(project.materials) ? project.materials : [];
      mats.forEach((material, mIdx) => {
        if (!material) return;
        const pmCode = material.pmCode || material.specSheet?.docHeader?.itemCode || 'PM-TBD';
        const awCode = material.artworkCode || getArtworkCode(pmCode);
        const files = getArtworkFiles(material);
        const isUploaded = files.length > 0;
        const specStatusKey = getSpecStatus(material);

        list.push({
          project,
          material,
          mIdx,
          pmCode,
          awCode,
          files,
          isUploaded,
          specStatusKey,
          stage: material.stage || project.stage || 'Brief'
        });
      });
    });
    return list;
  }, [projects]);

  // Summary counts
  const stats = useMemo(() => {
    const total = allArtworkItems.length;
    const uploaded = allArtworkItems.filter(i => i.isUploaded).length;
    const pending = total - uploaded;
    const inVpdf = allArtworkItems.filter(i => i.stage === 'VPDF' || i.stage === 'Printing').length;
    return { total, uploaded, pending, inVpdf };
  }, [allArtworkItems]);

  // Unique types
  const materialTypes = useMemo(() => {
    const types = new Set();
    allArtworkItems.forEach(i => {
      if (i.material?.type) types.add(i.material.type);
    });
    return Array.from(types).sort();
  }, [allArtworkItems]);

  // Filtered items
  const filtered = useMemo(() => {
    const q = (search || '').toLowerCase().trim();
    return allArtworkItems.filter(item => {
      const { project, material, pmCode, awCode } = item;
      const searchFields = [
        material.name,
        material.type,
        pmCode,
        awCode,
        project.projectName,
        project.fgCode,
        material.supplier
      ];
      const matchesSearch = !q || searchFields.some(v => v && String(v).toLowerCase().includes(q));
      const matchesStatus =
        !artworkStatusFilter ||
        (artworkStatusFilter === 'UPLOADED' && item.isUploaded) ||
        (artworkStatusFilter === 'PENDING' && !item.isUploaded);
      const matchesType = !typeFilter || material.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allArtworkItems, search, artworkStatusFilter, typeFilter]);

  // Grouped items
  const groups = useMemo(() => {
    if (groupBy === 'status') {
      return [
        {
          key: 'uploaded',
          label: '🎨 Artworks Uploaded & Ready',
          items: filtered.filter(i => i.isUploaded)
        },
        {
          key: 'pending',
          label: '⚠️ Artwork Upload Pending',
          items: filtered.filter(i => !i.isUploaded)
        }
      ].filter(g => g.items.length > 0);
    }
    if (groupBy === 'type') {
      const byType = {};
      filtered.forEach(item => {
        const t = item.material?.type || 'Other';
        if (!byType[t]) byType[t] = [];
        byType[t].push(item);
      });
      return Object.entries(byType)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, items]) => ({ key, label: key, items }));
    }
    // Default: group by project
    const byProject = {};
    filtered.forEach(item => {
      const pId = item.project?.id || 'unassigned';
      if (!byProject[pId]) {
        byProject[pId] = {
          key: pId,
          label: item.project?.projectName || 'Unnamed Project',
          fgCode: item.project?.fgCode,
          items: []
        };
      }
      byProject[pId].items.push(item);
    });
    return Object.values(byProject);
  }, [filtered, groupBy]);

  // ── CRUD HANDLERS ──────────────────────────────────────────────────────────

  // [C] Create / Upload Artwork directly for a specific row
  const handleRowUpload = (project, material, mIdx) => {
    if (!canEdit) {
      if (showToast) showToast('⚠ Permission required to upload artwork', true);
      return;
    }
    const pmCode = material.pmCode || material.specSheet?.docHeader?.itemCode || 'PM-TBD';
    const awCode = material.artworkCode || getArtworkCode(pmCode);
    const rowKey = `${project.id}-${mIdx}`;

    triggerFileInput('image/*,.pdf,.ai,.eps,.psd', true, async (selectedFiles) => {
      setProcessingKey(rowKey);
      try {
        const processed = await Promise.all(selectedFiles.map(f => processFile(f, awCode)));
        const valid = processed.filter(Boolean);
        if (!valid.length) {
          if (showToast) showToast('⚠ No valid files selected', true);
          return;
        }
        const existing = getArtworkFiles(material);
        const combined = [...existing, ...valid];
        const res = await updateMaterialArtwork(project.id, mIdx, combined);
        if (res.data?.project) {
          if (onArtworkUpdated) onArtworkUpdated(res.data.project);
          if (onRefreshProjects) onRefreshProjects();
        }
        if (showToast) showToast(`🎨 ${valid.length} artwork file(s) saved for ${awCode}`);
      } catch (err) {
        console.error('Failed to upload artwork:', err);
        if (showToast) showToast('⚠ Failed to upload artwork', true);
      } finally {
        setProcessingKey(null);
      }
    });
  };

  // [R] Read / Download Artwork directly from row
  const handleRowDownload = (file, awCode) => {
    if (!file) {
      if (showToast) showToast('⚠ No artwork file available to download', true);
      return;
    }
    downloadFile(file, awCode);
    if (showToast) showToast(`⬇ Downloading ${file.name || awCode}`);
  };

  // [U] Update / Replace Artwork file directly from row
  const handleRowReplace = (project, material, mIdx) => {
    if (!canEdit) {
      if (showToast) showToast('⚠ Permission required to replace artwork', true);
      return;
    }
    const pmCode = material.pmCode || material.specSheet?.docHeader?.itemCode || 'PM-TBD';
    const awCode = material.artworkCode || getArtworkCode(pmCode);
    const rowKey = `${project.id}-${mIdx}`;

    triggerFileInput('image/*,.pdf,.ai,.eps,.psd', false, async ([file]) => {
      if (!file) return;
      const confirm = window.confirm(`Replace current artwork for "${material.name}" (${awCode}) with new file "${file.name}"?`);
      if (!confirm) return;

      setProcessingKey(rowKey);
      try {
        const processed = await processFile(file, awCode);
        if (!processed) {
          if (showToast) showToast('⚠ Failed to read replacement file', true);
          return;
        }
        const res = await updateMaterialArtwork(project.id, mIdx, [processed]);
        if (res.data?.project) {
          if (onArtworkUpdated) onArtworkUpdated(res.data.project);
          if (onRefreshProjects) onRefreshProjects();
        }
        if (showToast) showToast(`🔄 Artwork updated with "${processed.name}"`);
      } catch (err) {
        console.error('Failed to replace artwork:', err);
        if (showToast) showToast('⚠ Failed to replace artwork', true);
      } finally {
        setProcessingKey(null);
      }
    });
  };

  // [D] Delete Artwork from material
  const handleRowDelete = async (project, material, mIdx) => {
    if (!canEdit) {
      if (showToast) showToast('⚠ Permission required to delete artwork', true);
      return;
    }
    const pmCode = material.pmCode || material.specSheet?.docHeader?.itemCode || 'PM-TBD';
    const awCode = material.artworkCode || getArtworkCode(pmCode);
    const rowKey = `${project.id}-${mIdx}`;

    const confirm = window.confirm(`Are you sure you want to delete artwork for "${material.name}" (${awCode})?\nThis will remove all uploaded artwork files for this packaging component.`);
    if (!confirm) return;

    setProcessingKey(rowKey);
    try {
      const res = await updateMaterialArtwork(project.id, mIdx, []);
      if (res.data?.project) {
        if (onArtworkUpdated) onArtworkUpdated(res.data.project);
        if (onRefreshProjects) onRefreshProjects();
      }
      if (showToast) showToast(`🗑️ Deleted artwork for ${awCode}`);
    } catch (err) {
      console.error('Failed to delete artwork:', err);
      if (showToast) showToast('⚠ Failed to delete artwork', true);
    } finally {
      setProcessingKey(null);
    }
  };

  // Top-Level Modal Opener (Create)
  const openUploadModal = () => {
    const activeProject = filtered[0]?.project || projects[0] || null;
    const initialPid = activeProject?.id || '';
    setUploadProjectId(initialPid);
    setUploadMIdx(0);
    setUploadFiles([]);
    setIsUploadModalOpen(true);
  };

  // Modal Submit (Create)
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!uploadProjectId) {
      if (showToast) showToast('⚠ Please select a project', true);
      return;
    }
    const targetProject = projects.find(p => String(p.id) === String(uploadProjectId));
    if (!targetProject || !targetProject.materials || !targetProject.materials[uploadMIdx]) {
      if (showToast) showToast('⚠ Please select a valid packaging component', true);
      return;
    }
    if (!uploadFiles.length) {
      if (showToast) showToast('⚠ Please select at least one artwork file', true);
      return;
    }

    const targetMaterial = targetProject.materials[uploadMIdx];
    const pmCode = targetMaterial.pmCode || targetMaterial.specSheet?.docHeader?.itemCode || 'PM-TBD';
    const awCode = targetMaterial.artworkCode || getArtworkCode(pmCode);

    setIsSubmittingUpload(true);
    try {
      const processed = await Promise.all(uploadFiles.map(f => processFile(f, awCode)));
      const valid = processed.filter(Boolean);
      const existing = getArtworkFiles(targetMaterial);
      const combined = [...existing, ...valid];

      const res = await updateMaterialArtwork(targetProject.id, uploadMIdx, combined);
      if (res.data?.project) {
        if (onArtworkUpdated) onArtworkUpdated(res.data.project);
        if (onRefreshProjects) onRefreshProjects();
      }
      if (showToast) showToast(`🎨 Successfully uploaded ${valid.length} file(s) for ${awCode}`);
      setIsUploadModalOpen(false);
      setUploadFiles([]);
    } catch (err) {
      console.error('Failed to upload via modal:', err);
      if (showToast) showToast('⚠ Failed to upload artwork', true);
    } finally {
      setIsSubmittingUpload(false);
    }
  };

  // Selected project in upload modal
  const selectedModalProject = useMemo(() => {
    return projects.find(p => String(p.id) === String(uploadProjectId)) || null;
  }, [projects, uploadProjectId]);

  const selectedModalMaterial = useMemo(() => {
    if (!selectedModalProject?.materials) return null;
    return selectedModalProject.materials[uploadMIdx] || null;
  }, [selectedModalProject, uploadMIdx]);

  return (
    <div id="artwork-hub" className="panel active" style={{ padding: '0' }}>
      {/* ── Top Header Controls ───────────────────────────────────────── */}
      <div className="hub-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎨 Artwork Library (AW Master Repository)
          </span>
          <span style={{
            background: 'rgba(236, 72, 153, 0.12)',
            color: '#f472b6',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            padding: '2px 9px',
            borderRadius: '20px',
            fontSize: '10.5px',
            fontWeight: 800
          }}>
            {filtered.length} Artwork{filtered.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="hide-on-mobile">
            Strict Rule: PM-xxxxxx → AW-xxxxxx
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 auto', justifyContent: 'flex-end' }}>
          {/* [C] Create: Prominent "+ Upload Artwork" button */}
          {canEdit && (
            <button
              className="btn btn-primary btn-sm"
              onClick={openUploadModal}
              title="Upload new artwork for any packaging component"
            >
              <Plus size={14} />
              <span>Upload Artwork</span>
            </button>
          )}

          <input
            className="hub-search-box"
            placeholder="🔍 Search AW code, PM code, material…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="filter-sel"
            value={artworkStatusFilter}
            onChange={e => setArtworkStatusFilter(e.target.value)}
          >
            <option value="" style={{ backgroundColor: '#062a30' }}>All Artworks</option>
            <option value="UPLOADED" style={{ backgroundColor: '#062a30' }}>✓ Uploaded ({stats.uploaded})</option>
            <option value="PENDING" style={{ backgroundColor: '#062a30' }}>⏳ Pending Upload ({stats.pending})</option>
          </select>
          <select
            className="filter-sel"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="" style={{ backgroundColor: '#062a30' }}>All Packaging Types</option>
            {materialTypes.map(t => (
              <option key={t} value={t} style={{ backgroundColor: '#062a30' }}>{t}</option>
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
              <option value="status" style={{ backgroundColor: '#062a30' }}>Group by Artwork Status</option>
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
                    background: viewMode === mode ? '#ec4899' : 'transparent',
                    color: viewMode === mode ? '#ffffff' : 'var(--text-dim)',
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

      {/* ── Metric Cards Banner ───────────────────────────────────────── */}
      <div style={{
        padding: '12px 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
        gap: '12px',
        background: 'rgba(6, 42, 48, 0.45)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{
          background: 'var(--card-bg)',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ fontSize: '24px' }}>📦</div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Materials</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>{stats.total}</div>
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ fontSize: '24px' }}>🎨</div>
          <div>
            <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Artworks Uploaded</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>{stats.uploaded} ({stats.total ? Math.round((stats.uploaded / stats.total) * 100) : 0}%)</div>
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ fontSize: '24px' }}>⏳</div>
          <div>
            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>Artwork Pending</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24' }}>{stats.pending}</div>
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid rgba(236, 72, 153, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ fontSize: '24px' }}>🚀</div>
          <div>
            <div style={{ fontSize: '10px', color: '#f472b6', fontWeight: 700, textTransform: 'uppercase' }}>In VPDF / Printing</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ec4899' }}>{stats.inVpdf}</div>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ─────────────────────────────────────────── */}
      <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="empty-icon" style={{ fontSize: '42px', marginBottom: '12px' }}>🎨</div>
            <div className="empty-title" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
              {allArtworkItems.length === 0 ? 'No packaging materials or artworks defined' : 'No matching artworks found'}
            </div>
            <div className="empty-sub" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '420px', margin: '6px auto 0' }}>
              {allArtworkItems.length === 0
                ? 'Create a packaging project to automatically generate PM and AW codes, and upload artworks in the specification modal.'
                : 'Adjust your search query or filter parameters above to view packaging artworks.'}
            </div>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.key || group.label} style={{ marginBottom: '32px' }}>
              {/* Group Title Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '14px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {group.label}
                </span>
                {group.fgCode && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    FG: {group.fgCode}
                  </span>
                )}
                <span style={{
                  background: 'rgba(236, 72, 153, 0.15)',
                  color: '#f472b6',
                  padding: '1px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 700
                }}>
                  {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                </span>
                <div style={{ flex: 1, height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  {(() => {
                    const up = group.items.filter(i => i.isUploaded).length;
                    const pct = group.items.length ? Math.round((up / group.items.length) * 100) : 0;
                    return <div style={{ height: '100%', width: `${pct}%`, background: '#ec4899', borderRadius: '4px', transition: 'width 0.3s' }} />;
                  })()}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {group.items.filter(i => i.isUploaded).length}/{group.items.length} uploaded
                </span>
              </div>

              {/* Grid or Table layout */}
              {viewMode === 'grid' ? (
                /* Grid View */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
                  {group.items.map(item => {
                    const { project, material, mIdx, pmCode, awCode, files, isUploaded, specStatusKey, stage } = item;
                    const previewFile = files[0];
                    const stageColor = STAGE_COLORS[stage] || '#ec4899';
                    const isProcessing = processingKey === `${project?.id}-${mIdx}`;

                    return (
                      <div
                        key={`${project?.id || 'p'}-${mIdx}`}
                        style={{
                          background: 'var(--card-bg)',
                          border: `1px solid ${isUploaded ? 'rgba(236, 72, 153, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                          borderTop: `3.5px solid ${isUploaded ? '#ec4899' : '#f59e0b'}`,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: 'var(--shadow-xs)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                        }}
                      >
                        {/* Artwork Visual Thumbnail Space */}
                        <div
                          style={{
                            height: '140px',
                            background: '#041c20',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: isUploaded ? 'pointer' : 'default'
                          }}
                          onClick={() => isUploaded && onOpenArtworkModal(project, material, mIdx)}
                          title={isUploaded ? 'Click to inspect Artwork in Full View' : 'Artwork pending upload'}
                        >
                          {(() => {
                            const isPdfProof = previewFile && (
                              previewFile.type === 'application/pdf' ||
                              previewFile.name?.toLowerCase().endsWith('.pdf') ||
                              (typeof previewFile.url === 'string' && (
                                previewFile.url.startsWith('data:application/pdf') ||
                                previewFile.url.toLowerCase().includes('.pdf')
                              ))
                            );

                            if (isUploaded && previewFile) {
                              if (isPdfProof) {
                                return (
                                  <div style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.15), rgba(15, 23, 42, 0.6))',
                                    padding: '12px',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{ fontSize: '36px', marginBottom: '4px' }}>📄</div>
                                    <span style={{
                                      background: '#ef4444',
                                      color: '#ffffff',
                                      fontSize: '9.5px',
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      letterSpacing: '0.5px'
                                    }}>
                                      PDF ARTWORK PROOF
                                    </span>
                                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '85%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {previewFile.name}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <img
                                  src={previewFile.url}
                                  alt={awCode}
                                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                              );
                            }

                            return (
                              <div style={{ textAlign: 'center', padding: '10px' }}>
                                <div style={{ fontSize: '28px', opacity: 0.3, marginBottom: '4px' }}>🎨</div>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#fbbf24',
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(245, 158, 11, 0.3)'
                                }}>
                                  ⏳ Pending Artwork Upload
                                </span>
                              </div>
                            );
                          })()}

                          {/* AW Badge Overlay Top-Left */}
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: 'rgba(6, 42, 48, 0.92)',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid var(--border-color)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>
                              {awCode}
                            </span>
                          </div>

                          {/* Stage Badge Top-Right */}
                          <span style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: `${stageColor}18`,
                            color: stageColor,
                            border: `1px solid ${stageColor}40`,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-badge)',
                            fontSize: '9.5px',
                            fontWeight: 600
                          }}>
                            {stage === 'VPDF' ? 'VPDF Stage' : stage}
                          </span>
                        </div>

                        {/* Card Info Body */}
                        <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>
                              {material.name}
                            </div>
                            <StatusBadge statusKey={specStatusKey} />
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>{material.type}</span>
                            {material.printType && material.printType !== 'Not Applicable' && (
                              <span>· Print: {material.printType}</span>
                            )}
                            {material.supplier && (
                              <span>· Supplier: {material.supplier}</span>
                            )}
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Package size={12} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                            <span><strong>{project.projectName}</strong></span>
                            {project.skuSize && <span>· {project.skuSize}</span>}
                          </div>

                          {/* Artwork file metadata if uploaded */}
                          {isUploaded && previewFile && (
                            <div style={{
                              fontSize: '9.5px',
                              color: 'var(--text-secondary)',
                              fontFamily: 'var(--font-mono)',
                              background: 'var(--card-bg-subtle)',
                              border: '1px solid var(--border-color)',
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              marginTop: '4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <FileText size={10} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                              <span>{previewFile.name} {previewFile.size ? `(${Math.round(previewFile.size / 1024)} KB)` : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Card Action Footer (CRUD) */}
                        <div style={{
                          padding: '10px 14px',
                          borderTop: '1px solid var(--border-color)',
                          background: 'rgba(6, 42, 48, 0.45)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: 'auto',
                          flexWrap: 'wrap'
                        }}>
                          {isProcessing ? (
                            <div style={{ width: '100%', textAlign: 'center', fontSize: '10.5px', color: 'var(--teal)', fontWeight: 700, padding: '4px' }}>
                              ⏳ Processing...
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                                <button
                                  onClick={() => onOpenSpecModal(project.id, mIdx)}
                                  style={{
                                    background: 'rgba(0, 200, 215, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: 'var(--teal)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '4px 8px',
                                    fontSize: '10.5px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="View / Edit Technical Specification"
                                >
                                  <FileText size={11} /> Spec ({pmCode})
                                </button>

                                {isUploaded && (
                                  <button
                                    onClick={() => handleRowDownload(previewFile, awCode)}
                                    style={{
                                      background: 'rgba(56, 201, 138, 0.1)',
                                      border: '1px solid rgba(56, 201, 138, 0.25)',
                                      color: 'var(--success)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '4px 8px',
                                      fontSize: '10.5px',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="Direct Download Active Artwork File"
                                  >
                                    <Download size={11} /> Download
                                  </button>
                                )}
                              </div>

                              <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                                {isUploaded ? (
                                  <>
                                    <button
                                      onClick={() => onOpenArtworkModal(project, material, mIdx)}
                                      style={{
                                        background: 'rgba(0, 200, 215, 0.12)',
                                        color: 'var(--teal)',
                                        border: '1px solid var(--teal)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '4px 10px',
                                        fontSize: '10.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      title="Read / View in Artwork Viewer"
                                    >
                                      <Eye size={12} /> View
                                    </button>

                                    {canEdit && (
                                      <>
                                        <button
                                          onClick={() => handleRowReplace(project, material, mIdx)}
                                          style={{
                                            background: 'var(--card-bg-subtle)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-secondary)',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '4px 8px',
                                            fontSize: '10.5px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                          }}
                                          title="Update / Replace Artwork File"
                                        >
                                          <RefreshCw size={11} /> Replace
                                        </button>
                                        <button
                                          onClick={() => handleRowDelete(project, material, mIdx)}
                                          style={{
                                            background: 'rgba(240, 93, 108, 0.1)',
                                            border: '1px solid rgba(240, 93, 108, 0.25)',
                                            color: 'var(--danger)',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '4px 8px',
                                            fontSize: '10.5px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center'
                                          }}
                                          title="Delete Artwork"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  canEdit ? (
                                    <button
                                      onClick={() => handleRowUpload(project, material, mIdx)}
                                      className="btn btn-primary"
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '10.5px',
                                        fontWeight: 600,
                                        borderRadius: 'var(--radius-sm)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      title="Create / Upload Artwork File"
                                    >
                                      <Plus size={12} /> Upload AW
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Pending</span>
                                  )
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Table View (Full CRUD Table) */
                <div className="table-scroll-wrap" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                  <table className="modern-mat-table" style={{ width: '100%', minWidth: '1080px', fontSize: '11px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '60px', textAlign: 'center' }}>Preview</th>
                        <th style={{ width: '130px' }}>Artwork Code</th>
                        <th style={{ width: '120px' }}>PM Code</th>
                        <th style={{ width: '180px' }}>Material</th>
                        <th style={{ width: '120px' }}>Type</th>
                        <th style={{ width: '160px' }}>Project</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Stage</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Artwork Status</th>
                        <th style={{ width: '130px' }}>Spec Status</th>
                        <th style={{ width: '250px', textAlign: 'center' }}>Actions (CRUD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map(item => {
                        const { project, material, mIdx, pmCode, awCode, files, isUploaded, specStatusKey, stage } = item;
                        const preview = files[0];
                        const stageColor = STAGE_COLORS[stage] || '#ec4899';
                        const isProcessing = processingKey === `${project?.id}-${mIdx}`;

                        return (
                          <tr key={`${project?.id || 'p'}-${mIdx}`}>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
                              {(() => {
                                const isPdf = preview && (
                                  preview.type === 'application/pdf' ||
                                  preview.name?.toLowerCase().endsWith('.pdf') ||
                                  (typeof preview.url === 'string' && (
                                    preview.url.startsWith('data:application/pdf') ||
                                    preview.url.toLowerCase().includes('.pdf')
                                  ))
                                );
                                if (isUploaded && preview) {
                                  if (isPdf) {
                                    return (
                                      <div
                                        onClick={() => onOpenArtworkModal(project, material, mIdx)}
                                        title={`PDF: ${preview.name} (Click to open viewer)`}
                                        style={{
                                          width: '36px',
                                          height: '36px',
                                          borderRadius: '4px',
                                          border: '1px solid #ef4444',
                                          background: 'rgba(239, 68, 68, 0.18)',
                                          display: 'inline-flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: 'pointer',
                                          fontSize: '12px'
                                        }}
                                      >
                                        📄
                                        <span style={{ fontSize: '7px', fontWeight: 900, color: '#ef4444' }}>PDF</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <img
                                      src={preview.url}
                                      alt={awCode}
                                      style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(236, 72, 153, 0.5)', cursor: 'pointer' }}
                                      onClick={() => onOpenArtworkModal(project, material, mIdx)}
                                    />
                                  );
                                }
                                return <span style={{ fontSize: '18px', opacity: 0.4 }} title="Artwork pending upload">🎨</span>;
                              })()}
                            </td>
                            <td>
                              <span style={{ fontFamily: 'var(--font-mono)', color: '#f472b6', fontWeight: 800, background: 'rgba(236, 72, 153, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                                {awCode}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)', fontWeight: 700, background: 'rgba(0, 243, 255, 0.08)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(0, 243, 255, 0.2)' }}>
                                {pmCode}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{material.name}</td>
                            <td style={{ color: 'var(--text-dim)', fontSize: '10.5px' }}>{material.type}</td>
                            <td style={{ fontSize: '10.5px', color: 'var(--text-body)' }}>{project.projectName}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                background: `${stageColor}20`,
                                color: stageColor,
                                border: `1px solid ${stageColor}50`,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '9.5px',
                                fontWeight: 800
                              }}>
                                {stage}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isUploaded ? (
                                <span style={{
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  padding: '2px 8px',
                                  borderRadius: '20px',
                                  fontSize: '9.5px',
                                  fontWeight: 800
                                }}>
                                  ✓ Uploaded ({files.length})
                                </span>
                              ) : (
                                <span style={{
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#fbbf24',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  padding: '2px 8px',
                                  borderRadius: '20px',
                                  fontSize: '9.5px',
                                  fontWeight: 700
                                }}>
                                  ⏳ Pending
                                </span>
                              )}
                            </td>
                            <td><StatusBadge statusKey={specStatusKey} /></td>

                            {/* CRUD ACTIONS CELL */}
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                              {isProcessing ? (
                                <span style={{
                                  fontSize: '10.5px',
                                  color: 'var(--teal)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 700
                                }}>
                                  ⏳ Processing...
                                </span>
                              ) : (
                                <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                  {isUploaded ? (
                                    <>
                                      {/* [R] Read: View in Modal */}
                                      <button
                                        onClick={() => onOpenArtworkModal(project, material, mIdx)}
                                        title="Read / View Artwork in Viewer Modal"
                                        style={{
                                          background: 'rgba(0, 200, 215, 0.12)',
                                          color: 'var(--teal)',
                                          border: '1px solid var(--teal)',
                                          borderRadius: 'var(--radius-sm)',
                                          padding: '3px 7px',
                                          fontSize: '10px',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px'
                                        }}
                                      >
                                        <Eye size={11} /> View
                                      </button>

                                      {/* [R] Read: Direct Download */}
                                      <button
                                        onClick={() => handleRowDownload(preview, awCode)}
                                        title="Read / Download Artwork File directly"
                                        style={{
                                          background: 'rgba(56, 201, 138, 0.1)',
                                          color: 'var(--success)',
                                          border: '1px solid rgba(56, 201, 138, 0.25)',
                                          borderRadius: 'var(--radius-sm)',
                                          padding: '3px 7px',
                                          fontSize: '10px',
                                          fontWeight: 500,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px'
                                        }}
                                      >
                                        <Download size={11} /> Download
                                      </button>

                                      {/* [U] Update: Replace File */}
                                      {canEdit && (
                                        <button
                                          onClick={() => handleRowReplace(project, material, mIdx)}
                                          title="Update / Replace Artwork with new file version"
                                          style={{
                                            background: 'var(--card-bg-subtle)',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '3px 7px',
                                            fontSize: '10px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                          }}
                                        >
                                          <RefreshCw size={11} /> Replace
                                        </button>
                                      )}

                                      {/* [D] Delete: Remove Artwork */}
                                      {canEdit && (
                                        <button
                                          onClick={() => handleRowDelete(project, material, mIdx)}
                                          title="Delete Artwork from material"
                                          style={{
                                            background: 'rgba(240, 93, 108, 0.1)',
                                            color: 'var(--danger)',
                                            border: '1px solid rgba(240, 93, 108, 0.25)',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '3px 7px',
                                            fontSize: '10px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                          }}
                                        >
                                          <Trash2 size={11} /> Delete
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {/* [C] Create: Upload Artwork */}
                                      {canEdit ? (
                                        <button
                                          onClick={() => handleRowUpload(project, material, mIdx)}
                                          title="Create / Upload Artwork File for this component"
                                          className="btn btn-primary"
                                          style={{
                                            padding: '3px 8px',
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            borderRadius: 'var(--radius-sm)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                          }}
                                        >
                                          <Plus size={11} /> Upload Artwork
                                        </button>
                                      ) : (
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Pending</span>
                                      )}
                                    </>
                                  )}

                                  {/* Spec Button */}
                                  <button
                                    onClick={() => onOpenSpecModal(project.id, mIdx)}
                                    title="View / Edit Technical Specification"
                                    style={{
                                      background: 'rgba(0, 200, 215, 0.08)',
                                      color: 'var(--teal)',
                                      border: '1px solid rgba(255, 255, 255, 0.08)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '3px 7px',
                                      fontSize: '10px',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                  >
                                    📋 Spec
                                  </button>
                                </div>
                              )}
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

      {/* ── [C] TOP-LEVEL "+ UPLOAD ARTWORK" MODAL ───────────────────────── */}
      {isUploadModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingUpload) {
              setIsUploadModalOpen(false);
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              background: '#04181c',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              borderRadius: '12px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(6, 42, 48, 0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🎨</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Upload New Artwork (AW Master)
                </span>
              </div>
              <button
                onClick={() => !isSubmittingUpload && setIsUploadModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleModalSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Select Project */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                  1. Target Project
                </label>
                <select
                  value={uploadProjectId}
                  onChange={(e) => {
                    setUploadProjectId(e.target.value);
                    setUploadMIdx(0);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#062a30',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id} style={{ backgroundColor: '#062a30' }}>
                      {p.projectName} {p.fgCode ? `(${p.fgCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Packaging Component */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                  2. Packaging Component / Material
                </label>
                <select
                  value={uploadMIdx}
                  onChange={(e) => setUploadMIdx(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#062a30',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                >
                  {selectedModalProject?.materials?.map((m, idx) => (
                    <option key={idx} value={idx} style={{ backgroundColor: '#062a30' }}>
                      {m.name} ({m.type}) — PM: {m.pmCode || 'PM-TBD'} [{hasArtwork(m) ? '✓ Has AW' : '⏳ Pending'}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Derived Code Banner */}
              {selectedModalMaterial && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: 'rgba(236, 72, 153, 0.08)',
                  border: '1px solid rgba(236, 72, 153, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Input PM Code: </span>
                    <strong style={{ color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>
                      {selectedModalMaterial.pmCode || 'PM-TBD'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Auto-Derived AW Code: </span>
                    <strong style={{ color: '#f472b6', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                      {selectedModalMaterial.artworkCode || getArtworkCode(selectedModalMaterial.pmCode || 'PM-TBD')}
                    </strong>
                  </div>
                </div>
              )}

              {/* File Dropzone / Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                  3. Select Artwork File(s) (PDF, PNG, JPG, AI, EPS)
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const files = Array.from(e.dataTransfer.files || []);
                    if (files.length) setUploadFiles(prev => [...prev, ...files]);
                  }}
                  onClick={() => modalFileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragOver ? '#ec4899' : 'rgba(236, 72, 153, 0.4)'}`,
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    background: isDragOver ? 'rgba(236, 72, 153, 0.1)' : 'rgba(6, 42, 48, 0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="file"
                    ref={modalFileInputRef}
                    multiple
                    accept="image/*,.pdf,.ai,.eps,.psd"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length) setUploadFiles(prev => [...prev, ...files]);
                    }}
                  />
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>📁</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Click or drag & drop artwork file here
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Supports High-Res PDF, AI, EPS, PNG, JPEG with Dieline & Key Line Data
                  </div>
                </div>

                {/* Selected Files List */}
                {uploadFiles.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {uploadFiles.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '5px',
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid var(--border-color)',
                          fontSize: '11px'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                          📄 {file.name} ({Math.round(file.size / 1024)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadFiles(prev => prev.filter((_, i) => i !== idx));
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '13px',
                            padding: '0 4px'
                          }}
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  disabled={isSubmittingUpload}
                  onClick={() => setIsUploadModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    borderRadius: '6px',
                    padding: '7px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUpload || !uploadFiles.length}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    opacity: !uploadFiles.length || isSubmittingUpload ? 0.6 : 1,
                    cursor: !uploadFiles.length || isSubmittingUpload ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Palette size={14} />
                  {isSubmittingUpload ? 'Uploading...' : 'Upload & Save Artwork'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
