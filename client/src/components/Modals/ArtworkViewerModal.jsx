import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getArtworkCode, fmt, STAGE_COLORS } from '../../utils';
import { updateMaterialArtwork } from '../../api';

// Helper to convert base64 DataURL to Blob for reliable iframe PDF rendering
function dataUrlToBlob(dataUrl) {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.error('Failed to convert dataURL to Blob:', err);
    return null;
  }
}

export default function ArtworkViewerModal({
  isOpen,
  project,
  material,
  mIdx,
  onClose,
  onOpenSpecModal,
  onArtworkUpdated,
  showToast
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setZoom(1);
      setRotation(0);
      setActiveFileIdx(0);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const pmCode = material?.pmCode || material?.specSheet?.docHeader?.itemCode || 'PM-TBD';
  const awCode = material?.artworkCode || getArtworkCode(pmCode);
  const stage = material?.stage || project?.stage || 'Brief';
  const stageColor = STAGE_COLORS[stage] || '#ec4899';

  let rawFiles = [];
  if (Array.isArray(material?.artworkFiles) && material.artworkFiles.length > 0) {
    rawFiles = material.artworkFiles;
  } else if (Array.isArray(material?.specSheet?.artworkFiles) && material.specSheet.artworkFiles.length > 0) {
    rawFiles = material.specSheet.artworkFiles;
  } else if (material?.artworkUrl) {
    rawFiles = [{
      name: `${awCode}_Artwork`,
      url: material.artworkUrl,
      type: material.artworkUrl.startsWith('data:application/pdf') || material.artworkUrl.endsWith('.pdf')
        ? 'application/pdf'
        : 'image/png'
    }];
  }

  const files = rawFiles;
  const activeFile = files[activeFileIdx] || files[0] || null;

  // Detect if active file is a PDF
  const isPdf = Boolean(
    activeFile && (
      activeFile.type === 'application/pdf' ||
      activeFile.name?.toLowerCase().endsWith('.pdf') ||
      (typeof activeFile.url === 'string' && (
        activeFile.url.startsWith('data:application/pdf') ||
        activeFile.url.toLowerCase().includes('.pdf')
      ))
    )
  );

  const isImage = Boolean(
    activeFile && !isPdf && (
      activeFile.type?.startsWith('image/') ||
      (typeof activeFile.url === 'string' && (
        activeFile.url.startsWith('data:image/') ||
        /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(activeFile.url) ||
        /\.(png|jpe?g|webp|gif|svg)$/i.test(activeFile.name || '')
      ))
    )
  );

  // Convert PDF base64 to Blob URL for fast, native iframe rendering without CSP blocks
  const pdfBlobUrl = useMemo(() => {
    if (!activeFile?.url || !isPdf) return null;
    if (activeFile.url.startsWith('blob:') || activeFile.url.startsWith('http')) {
      return activeFile.url;
    }
    if (activeFile.url.startsWith('data:application/pdf')) {
      const blob = dataUrlToBlob(activeFile.url);
      if (blob) {
        return URL.createObjectURL(blob);
      }
    }
    return activeFile.url;
  }, [activeFile?.url, isPdf]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  const handleZoomIn = () => setZoom(z => Math.min(3, Math.round((z + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  const handleResetZoom = () => { setZoom(1); setRotation(0); };
  const handleRotate = () => setRotation(r => (r + 90) % 360);

  const handleDownload = () => {
    if (!activeFile) return;
    const link = document.createElement('a');
    link.href = pdfBlobUrl || activeFile.url;
    const cleanOriginal = (activeFile.name || 'artwork').replace(/^AW-[^_]+_/, '').replace(/^PM-[^_]+_/, '');
    const filename = (activeFile.name || '').startsWith(awCode)
      ? activeFile.name
      : `${awCode}_${cleanOriginal}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processFile = (file) => {
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

  // Upload new artwork files (Add Artwork)
  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;
    setIsUploading(true);

    Promise.all(newFiles.map(processFile)).then(async (uploaded) => {
      const valid = uploaded.filter(Boolean);
      const combined = [...files, ...valid];
      try {
        if (project?.id && mIdx !== null && mIdx !== undefined) {
          const res = await updateMaterialArtwork(project.id, mIdx, combined);
          if (onArtworkUpdated && res.data?.project) {
            onArtworkUpdated(res.data.project);
          }
        }
        if (showToast) showToast(`🎨 ${valid.length} artwork file(s) saved for ${awCode}`);
        setActiveFileIdx(combined.length - 1);
        handleResetZoom();
      } catch (err) {
        if (showToast) showToast('⚠ Failed to save artwork', true);
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = '';
      }
    });
  };

  // Replace / Update current active artwork file (Update Artwork)
  const handleFileReplace = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    processFile(file).then(async (updatedFile) => {
      if (!updatedFile) {
        setIsUploading(false);
        return;
      }
      const updatedFiles = [...files];
      if (updatedFiles.length === 0) {
        updatedFiles.push(updatedFile);
      } else {
        updatedFiles[activeFileIdx] = updatedFile;
      }

      try {
        if (project?.id && mIdx !== null && mIdx !== undefined) {
          const res = await updateMaterialArtwork(project.id, mIdx, updatedFiles);
          if (onArtworkUpdated && res.data?.project) {
            onArtworkUpdated(res.data.project);
          }
        }
        if (showToast) showToast(`🔄 Artwork updated with "${updatedFile.name}"`);
        handleResetZoom();
      } catch (err) {
        if (showToast) showToast('⚠ Failed to update artwork file', true);
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = '';
      }
    });
  };

  // Delete active artwork file (Delete Artwork)
  const handleDeleteFile = async (idxToDelete) => {
    const targetFile = files[idxToDelete];
    if (!targetFile) return;
    const confirmMsg = `Are you sure you want to delete artwork "${targetFile.name || `File ${idxToDelete + 1}`}"?\nThis action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    setIsUploading(true);
    const updatedFiles = files.filter((_, i) => i !== idxToDelete);
    try {
      if (project?.id && mIdx !== null && mIdx !== undefined) {
        const res = await updateMaterialArtwork(project.id, mIdx, updatedFiles);
        if (onArtworkUpdated && res.data?.project) {
          onArtworkUpdated(res.data.project);
        }
      }
      if (activeFileIdx >= updatedFiles.length) {
        setActiveFileIdx(Math.max(0, updatedFiles.length - 1));
      }
      handleResetZoom();
      if (showToast) showToast(`🗑️ Deleted artwork file "${targetFile.name}"`);
    } catch (err) {
      if (showToast) showToast('⚠ Failed to delete artwork file', true);
    } finally {
      setIsUploading(false);
    }
  };

  // Rename current active artwork file
  const handleRenameActiveFile = async () => {
    if (!activeFile) return;
    const newName = window.prompt('Enter new filename / label for this artwork:', activeFile.name);
    if (!newName || !newName.trim() || newName.trim() === activeFile.name) return;

    const updatedFiles = [...files];
    updatedFiles[activeFileIdx] = { ...activeFile, name: newName.trim() };
    try {
      if (project?.id && mIdx !== null && mIdx !== undefined) {
        const res = await updateMaterialArtwork(project.id, mIdx, updatedFiles);
        if (onArtworkUpdated && res.data?.project) {
          onArtworkUpdated(res.data.project);
        }
      }
      if (showToast) showToast(`✏️ Artwork renamed to "${newName.trim()}"`);
    } catch (err) {
      if (showToast) showToast('⚠ Failed to rename artwork', true);
    }
  };

  if (!isOpen || !material) return null;

  return (
    <div
      className="modal-overlay open"
      style={{ zIndex: 1250 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal"
        style={{
          maxWidth: '1120px',
          width: '95vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-app)',
          border: '1px solid rgba(236, 72, 153, 0.35)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(236, 72, 153, 0.15)'
        }}
      >
        {/* HEADER */}
        <div
          className="modal-head"
          style={{
            flexShrink: 0,
            padding: '14px 22px',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                boxShadow: '0 4px 14px rgba(236, 72, 153, 0.3)'
              }}
            >
              🎨
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Artwork Reference
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    fontWeight: 800,
                    background: 'rgba(236, 72, 153, 0.18)',
                    color: '#f472b6',
                    padding: '2px 9px',
                    borderRadius: '5px',
                    border: '1px solid rgba(236, 72, 153, 0.4)'
                  }}
                >
                  {awCode}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(2, 132, 199, 0.15)',
                    color: 'var(--teal)',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    border: '1px solid rgba(2, 132, 199, 0.35)'
                  }}
                >
                  PM: {pmCode}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: `${stageColor}20`,
                    color: stageColor,
                    border: `1px solid ${stageColor}45`
                  }}
                >
                  Stage: {stage}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                <strong style={{ color: 'var(--text-dim)' }}>{material.name}</strong> ({material.type})
                {project?.projectName ? ` · Project: ${project.projectName}` : ''}
                {material.supplier ? ` · 🏭 ${material.supplier}` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {files.length > 0 && activeFile && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleDownload}
                title="Download artwork file"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                ⬇ Download
              </button>
            )}
            {onOpenSpecModal && project && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { onClose(); onOpenSpecModal(project.id, mIdx); }}
                title="Open full specification sheet"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--teal)' }}
              >
                📋 View Spec
              </button>
            )}
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              title="Close viewer"
              style={{ fontSize: '18px' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* TOOLBAR FOR ARTWORK ACTIONS & MANIPULATION */}
        {files.length > 0 && (
          <div
            style={{
              padding: '8px 20px',
              background: 'rgba(6, 42, 48, 0.4)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            {/* File Switcher Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', maxWidth: '48%' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                Files ({files.length}):
              </span>
              {files.map((f, i) => {
                const isItemPdf = f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf') || (typeof f.url === 'string' && f.url.startsWith('data:application/pdf'));
                const isActive = activeFileIdx === i;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: isActive ? '#ec4899' : 'rgba(255,255,255,0.06)',
                      border: isActive ? '1px solid #f472b6' : '1px solid var(--border-color)',
                      borderRadius: '5px',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setActiveFileIdx(i); handleResetZoom(); }}
                      style={{
                        padding: '3px 7px',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: 'transparent',
                        color: isActive ? '#ffffff' : 'var(--text-muted)',
                        border: 'none',
                        maxWidth: '140px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={f.name}
                    >
                      {isItemPdf ? '📄 ' : '🖼️ '}
                      {i + 1}. {f.name}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(i);
                      }}
                      title="Delete this file"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isActive ? 'rgba(255,255,255,0.8)' : '#ef4444',
                        cursor: 'pointer',
                        padding: '2px 5px',
                        fontSize: '11px',
                        lineHeight: 1
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Controls: Zoom (for images) or PDF actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {isImage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                  >
                    🔍−
                  </button>
                  <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleZoomIn}
                    title="Zoom In"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                  >
                    🔍+
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleRotate}
                    title="Rotate 90°"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                  >
                    ↻ Rotate
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleResetZoom}
                    title="Reset Zoom"
                    style={{ padding: '3px 8px', fontSize: '10px' }}
                  >
                    Reset
                  </button>
                </div>
              )}

              {isPdf && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    background: '#ef444420',
                    color: '#ef4444',
                    border: '1px solid #ef444450',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    PDF Document
                  </span>
                  {activeFile?.url && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => window.open(pdfBlobUrl || activeFile.url, '_blank')}
                      title="Open PDF in Full Tab"
                      style={{ padding: '3px 8px', fontSize: '10.5px' }}
                    >
                      ↗ Full Window
                    </button>
                  )}
                </div>
              )}

              {/* ACTION BUTTONS: Add Artwork, Update Artwork, Rename, Delete Artwork */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  style={{ fontSize: '10.5px', color: '#f472b6', fontWeight: 700 }}
                  title="Upload additional artwork file"
                >
                  {isUploading ? '⏳ Uploading...' : '＋ Add Artwork'}
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => replaceFileInputRef.current?.click()}
                  disabled={isUploading || !activeFile}
                  style={{ fontSize: '10.5px', color: 'var(--teal)', fontWeight: 700 }}
                  title="Replace / Update the currently selected artwork file"
                >
                  🔄 Update Artwork
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleRenameActiveFile}
                  disabled={isUploading || !activeFile}
                  style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}
                  title="Rename current file"
                >
                  ✏️ Rename
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDeleteFile(activeFileIdx)}
                  disabled={isUploading || !activeFile}
                  style={{ fontSize: '10.5px', color: '#ef4444', fontWeight: 700 }}
                  title="Delete the currently selected artwork file"
                >
                  🗑️ Delete
                </button>

                {/* Hidden input for Add Artwork */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.ai,.eps,.psd,.png,.jpg,.jpeg"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />

                {/* Hidden input for Update Artwork (Replace) */}
                <input
                  ref={replaceFileInputRef}
                  type="file"
                  accept="image/*,.pdf,.ai,.eps,.psd,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                  onChange={handleFileReplace}
                />
              </div>
            </div>
          </div>
        )}

        {/* MAIN VIEWER BODY */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: files.length === 0 ? '24px' : isPdf ? '0' : '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(4, 18, 24, 0.95)',
            position: 'relative'
          }}
        >
          {files.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '50px 30px',
                maxWidth: '480px',
                border: '2px dashed rgba(236, 72, 153, 0.3)',
                borderRadius: '12px',
                background: 'rgba(236, 72, 153, 0.04)'
              }}
            >
              <div style={{ fontSize: '50px', marginBottom: '14px' }}>🎨</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                No Artwork Uploaded Yet
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
                Each packaging material requires an approved artwork linked to PM Code{' '}
                <strong style={{ color: 'var(--teal)' }}>{pmCode}</strong> with generated code{' '}
                <strong style={{ color: '#f472b6' }}>{awCode}</strong>. Upload an image proof or vector PDF.
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none' }}
                >
                  {isUploading ? '⏳ Uploading...' : '⬆ Upload Artwork (PDF / Image)'}
                </button>
                {onOpenSpecModal && project && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => { onClose(); onOpenSpecModal(project.id, mIdx); }}
                  >
                    Open Spec Sheet
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.ai,.eps,.psd,.png,.jpg,.jpeg"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          ) : isPdf ? (
            /* ── INTERACTIVE PDF PREVIEW CONTAINER ── */
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: '560px' }}>
              <div
                style={{
                  padding: '8px 16px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: 'var(--text-muted)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    PDF PROOF
                  </span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{activeFile.name}</span>
                  {activeFile.size ? (
                    <span style={{ color: 'var(--text-dim)' }}>({(activeFile.size / 1024).toFixed(1)} KB)</span>
                  ) : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => replaceFileInputRef.current?.click()}
                    style={{ fontSize: '11px', color: 'var(--teal)' }}
                    title="Replace this PDF with an updated version"
                  >
                    🔄 Update PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => window.open(pdfBlobUrl || activeFile.url, '_blank')}
                    style={{ fontSize: '11px' }}
                    title="Open PDF in a full browser window"
                  >
                    ↗ Open Full Window
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleDownload}
                    style={{ fontSize: '11px' }}
                  >
                    ⬇ Download PDF
                  </button>
                </div>
              </div>

              {activeFile.url ? (
                <div style={{ flex: 1, width: '100%', minHeight: '520px', background: '#323639', position: 'relative' }}>
                  <iframe
                    src={pdfBlobUrl || activeFile.url}
                    title={activeFile.name || 'Artwork PDF Preview'}
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '540px',
                      border: 'none',
                      display: 'block',
                      background: '#525659'
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '50px 30px',
                    maxWidth: '460px',
                    margin: 'auto',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                    PDF Preview Data Not Available
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                    This file was saved without inline document data. Please use <strong>Update Artwork</strong> to re-upload the PDF proof.
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => replaceFileInputRef.current?.click()}
                    style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none' }}
                  >
                    🔄 Update / Re-upload PDF
                  </button>
                </div>
              )}
            </div>
          ) : isImage ? (
            /* ── IMAGE PREVIEW WITH ZOOM & ROTATE ── */
            <div
              style={{
                display: 'inline-block',
                transition: 'transform 0.15s ease-out',
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#ffffff'
              }}
            >
              <img
                src={activeFile.url}
                alt={activeFile.name}
                style={{
                  maxWidth: '85vw',
                  maxHeight: '68vh',
                  display: 'block',
                  objectFit: 'contain'
                }}
              />
            </div>
          ) : (
            /* ── FALLBACK FOR OTHER VECTOR / BINARY ASSETS ── */
            <div
              style={{
                textAlign: 'center',
                padding: '40px 30px',
                maxWidth: '460px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px'
              }}
            >
              <div style={{ fontSize: '56px', marginBottom: '14px' }}>📄</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                {activeFile?.name || 'Artwork Document'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '18px' }}>
                Format: {activeFile?.type || 'Vector/Document'} &bull; Linked Code: <strong style={{ color: '#f472b6' }}>{awCode}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                {activeFile?.url && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleDownload}
                    style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none' }}
                  >
                    ⬇ Download Asset
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => replaceFileInputRef.current?.click()}
                  style={{ color: 'var(--teal)' }}
                >
                  🔄 Update File
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDeleteFile(activeFileIdx)}
                  style={{ color: '#ef4444' }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          className="modal-foot"
          style={{
            flexShrink: 0,
            padding: '12px 22px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-app)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {stage === 'VPDF' ? (
              <span style={{ color: '#e040fb', fontWeight: 700 }}>
                ⚡ Project is at VPDF stage — Approved Artwork {awCode} is active for Vendor PDF proofing.
              </span>
            ) : (
              <span>
                Artwork code <strong style={{ color: '#f472b6' }}>{awCode}</strong> is derived from PM Code <strong style={{ color: 'var(--teal)' }}>{pmCode}</strong>.
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {files.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => replaceFileInputRef.current?.click()}
                disabled={isUploading}
                style={{ color: 'var(--teal)', fontSize: '11px' }}
              >
                🔄 Update Artwork
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

