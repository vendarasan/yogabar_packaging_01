import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Upload, Sparkles, CheckCircle2, ArrowRight, Eye, Download,
  ExternalLink, Trash2, Plus, RefreshCw, X, AlertCircle, Layers, ShieldCheck, Box,
  Maximize2, Minimize2
} from 'lucide-react';
import { convertSpecPdf, saveSpecToLibrary } from '../../api';

// Helper to convert base64 Data URL to Blob URL for iframe rendering
function dataUrlToBlobUrl(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  try {
    const parts = dataUrl.split(';base64,');
    if (parts.length < 2) return null;
    const contentType = parts[0].replace('data:', '') || 'application/pdf';
    const raw = atob(parts[1]);
    const uInt8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    const blob = new Blob([uInt8Array], { type: contentType });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('Could not convert dataUrl to Blob URL:', e);
    return dataUrl;
  }
}

export default function SpecConverterModal({
  isOpen,
  onClose,
  projects = [],
  initialProjectId = null,
  initialMaterialIdx = null,
  onSpecSaved,
  showToast
}) {
  const [file, setFile] = useState(null);
  const [fileDataUrl, setFileDataUrl] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStep, setConversionStep] = useState(1); // 1 = Upload, 2 = Side-by-side Review
  const [convertedSpec, setConvertedSpec] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activeReviewTab, setActiveReviewTab] = useState('params'); // 'header' | 'params' | 'performance' | 'quality' | 'rawtext'
  const [pasteTextMode, setPasteTextMode] = useState(false);
  const [extractedRawText, setExtractedRawText] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [mobileSplitView, setMobileSplitView] = useState('spec'); // 'spec' | 'pdf' on mobile screens

  // Resizable split pane & PDF view controls
  const [splitRatio, setSplitRatio] = useState(54); // % for PDF pane (default 54%)
  const [isMaximizedPdf, setIsMaximizedPdf] = useState(false);
  const [pdfFitMode, setPdfFitMode] = useState('FitH'); // 'FitH' (Fit Width) | 'Fit' (Fit Page)
  const [isDragging, setIsDragging] = useState(false);
  const splitContainerRef = useRef(null);

  // Drag handler for resizable split pane
  const handleMouseDownSplitter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!splitContainerRef.current) return;
      const containerRect = splitContainerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left;
      const newRatio = (relativeX / containerRect.width) * 100;
      // Clamp between 25% and 80%
      const clampedRatio = Math.max(25, Math.min(80, newRatio));
      setSplitRatio(clampedRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Target Destination
  const [destinationMode, setDestinationMode] = useState(initialProjectId ? 'project' : 'library'); // 'library' | 'project'
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || (projects[0]?.id || ''));
  const [selectedMaterialIdx, setSelectedMaterialIdx] = useState(initialMaterialIdx !== null ? initialMaterialIdx : 0);
  const [specLibraryTitle, setSpecLibraryTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  // Sync selected project and material if projects change
  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
      setSelectedMaterialIdx(initialMaterialIdx !== null ? initialMaterialIdx : 0);
      setDestinationMode('project');
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
      setSelectedMaterialIdx(0);
    }
  }, [initialProjectId, initialMaterialIdx, projects]);

  // Cleanup blob URL on unmount or file change
  useEffect(() => {
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (!isOpen) return null;

  const currentProject = projects.find(p => String(p.id) === String(selectedProjectId));
  const currentMaterials = currentProject?.materials || [];

  const handleFileSelect = (e) => {
    const selected = e.target.files && e.target.files[0];
    if (!selected) return;
    processPdfFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!dropped) return;
    if (!dropped.type.includes('pdf') && !dropped.name.toLowerCase().endsWith('.pdf')) {
      showToast && showToast('Please upload a valid PDF document (.pdf)', true);
      return;
    }
    processPdfFile(dropped);
  };

  const processPdfFile = (pdfFile) => {
    setFile(pdfFile);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setFileDataUrl(result);
      const bUrl = dataUrlToBlobUrl(result);
      setBlobUrl(bUrl);
      executeConversion(result, pdfFile.name);
    };
    reader.onerror = () => {
      showToast && showToast('Error reading PDF file', true);
    };
    reader.readAsDataURL(pdfFile);
  };

  const handlePastedTextConvert = () => {
    if (!pastedText.trim()) {
      showToast && showToast('Please paste specification text first', true);
      return;
    }
    executeConversion(null, 'Pasted_Spec.pdf', pastedText);
  };

  const executeConversion = async (dataUrl, fileName, rawText = null) => {
    setIsConverting(true);
    try {
      const res = await convertSpecPdf({
        fileData: dataUrl || undefined,
        fileName: fileName || 'spec.pdf',
        rawText: rawText || undefined
      });

      if (res.data && res.data.success && res.data.specSheet) {
        setConvertedSpec(res.data.specSheet);
        setSummary(res.data.summary);
        setExtractedRawText(res.data.extractedRawText || null);
        setSpecLibraryTitle(res.data.specSheet.docHeader?.docName || fileName.replace(/\.pdf$/i, ''));
        setConversionStep(2); // Move to review step
        showToast && showToast(`✨ Converted: ${res.data.summary?.parametersExtracted || 0} parameters extracted!`);
      } else {
        throw new Error(res.data?.error || 'Conversion failed');
      }
    } catch (err) {
      console.error('Spec conversion error:', err);
      showToast && showToast(err.response?.data?.error || err.message || 'Failed to convert PDF spec', true);
    } finally {
      setIsConverting(false);
    }
  };

  // Inline Parameter Table Edits
  const handleUpdateParam = (index, field, value) => {
    setConvertedSpec(prev => {
      if (!prev) return prev;
      const nextParams = [...(prev.parameters || [])];
      nextParams[index] = { ...nextParams[index], [field]: value };
      return { ...prev, parameters: nextParams };
    });
  };

  const handleAddParam = () => {
    setConvertedSpec(prev => {
      if (!prev) return prev;
      const nextParams = [...(prev.parameters || [])];
      const newSNo = nextParams.length + 1;
      nextParams.push({
        sNo: newSNo,
        parameter: 'New Parameter',
        units: 'mm',
        standard: 'Standard ± Tolerance',
        testStandard: 'Standard Test Method',
        defectType: 'MJ',
        factoryCheck: 'Yes'
      });
      return { ...prev, parameters: nextParams };
    });
  };

  const handleDeleteParam = (index) => {
    setConvertedSpec(prev => {
      if (!prev) return prev;
      const nextParams = (prev.parameters || []).filter((_, i) => i !== index);
      // Re-index sNo
      const reindexed = nextParams.map((p, i) => ({ ...p, sNo: i + 1 }));
      return { ...prev, parameters: reindexed };
    });
  };

  // Header Field Edits
  const handleUpdateHeader = (field, value) => {
    setConvertedSpec(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        docHeader: { ...(prev.docHeader || {}), [field]: value }
      };
    });
  };

  // General Field Edits
  const handleUpdateGeneral = (field, value) => {
    setConvertedSpec(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        general: { ...(prev.general || {}), [field]: value }
      };
    });
  };

  // Save to Spec Library / Apply to Project
  const handleSave = async () => {
    if (!convertedSpec) return;
    if (!specLibraryTitle.trim()) {
      showToast && showToast('Please enter a Title for this specification', true);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        specName: specLibraryTitle.trim(),
        itemCode: convertedSpec.docHeader?.itemCode || '',
        category: convertedSpec.category || 'generic',
        materialType: convertedSpec.general?.materialType || convertedSpec.category || '',
        revision: convertedSpec.docHeader?.revision || '0.0',
        specData: convertedSpec,
        sourcePdfName: file?.name || 'converted_spec.pdf',
        sourcePdfData: fileDataUrl || null,
        projectId: destinationMode === 'project' ? selectedProjectId : null,
        projectName: destinationMode === 'project' ? currentProject?.projectName : '',
        materialIdx: destinationMode === 'project' ? selectedMaterialIdx : undefined,
        materialName: destinationMode === 'project' ? currentMaterials[selectedMaterialIdx]?.name : ''
      };

      const res = await saveSpecToLibrary(payload);
      if (res.data && res.data.success) {
        showToast && showToast(`✓ Saved to Spec Library: "${specLibraryTitle}"`);
        if (onSpecSaved) onSpecSaved(res.data.spec, destinationMode === 'project' ? selectedProjectId : null);
        onClose();
      } else {
        throw new Error(res.data?.error || 'Failed to save spec to library');
      }
    } catch (err) {
      console.error('Error saving spec to library:', err);
      showToast && showToast(err.response?.data?.error || err.message || 'Error saving to Spec Library', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileDataUrl(null);
    setBlobUrl(null);
    setConvertedSpec(null);
    setSummary(null);
    setConversionStep(1);
    setPastedText('');
    setIsMaximizedPdf(false);
    setSplitRatio(54);
    setPdfFitMode('FitH');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(3, 14, 18, 0.88)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        width: '98vw',
        maxWidth: '1680px',
        height: '95vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        {/* ── Modal Header ── */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-sidebar)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 200, 215, 0.12)',
              border: '1px solid rgba(0, 200, 215, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--teal)'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Packaging Spec Converter</span>
                <span style={{
                  fontSize: '9.5px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-badge)',
                  background: 'rgba(0, 200, 215, 0.1)',
                  color: 'var(--teal)',
                  border: '1px solid rgba(0, 200, 215, 0.25)'
                }}>
                  PDF to New Standard Format
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Upload an existing or legacy specification PDF — extracts all technical parameters intact into the Spec Library
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {conversionStep === 2 && (
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <RefreshCw size={13} />
                <span>Upload Different PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Modal Body ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* STEP 1: Upload Existing Spec PDF */}
          {conversionStep === 1 && (
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '30px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ maxWidth: '640px', width: '100%', textAlign: 'center' }}>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'rgba(0, 243, 255, 0.08)',
                    border: '1px solid rgba(0, 243, 255, 0.3)',
                    color: 'var(--teal, #00f3ff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <FileText size={32} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main, #ffffff)', marginBottom: '8px' }}>
                    Select or Drop Your Existing Specification PDF
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5 }}>
                    The engine extracts document metadata, material structure, technical parameters (GSM, burst, BCT, dimensions),
                    test standards, and quality clauses into the new enterprise specification format.
                  </p>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    border: '2px dashed var(--teal, #00f3ff)',
                    borderRadius: '12px',
                    padding: '40px 24px',
                    background: 'rgba(6, 42, 48, 0.45)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(6, 42, 48, 0.7)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(6, 42, 48, 0.45)'}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(0, 243, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--teal, #00f3ff)'
                    }}>
                      <Upload size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main, #ffffff)' }}>
                        Click to browse or drag and drop your PDF here
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim, #64748b)', marginTop: '4px' }}>
                        Supports supplier technical sheets, Yoga Bar specs, ERP spec sheets, or laboratory certificates
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alternative: Paste Spec Text */}
                <div style={{ marginTop: '20px', textAlign: 'left' }}>
                  <button
                    type="button"
                    onClick={() => setPasteTextMode(!pasteTextMode)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--teal, #00f3ff)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>{pasteTextMode ? '▲ Hide Text Paste Option' : '▼ Or paste raw specification text directly'}</span>
                  </button>

                  {pasteTextMode && (
                    <div style={{ marginTop: '10px' }}>
                      <textarea
                        rows={6}
                        placeholder="Paste raw text copied from an existing PDF, Word, or Excel specification..."
                        value={pastedText}
                        onChange={e => setPastedText(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          padding: '10px',
                          fontSize: '11.5px',
                          fontFamily: 'var(--font-mono)'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handlePastedTextConvert}
                          disabled={!pastedText.trim()}
                        >
                          Convert Pasted Text
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sample formats supported banner */}
                <div style={{
                  marginTop: '28px',
                  padding: '12px 16px',
                  background: 'var(--card-bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'var(--text-secondary)'
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Supported Categories:</span>
                  <span>Corrugated Shipper (CBB)</span>
                  <span>PET Jar &amp; Cap</span>
                  <span>Roll Label</span>
                  <span>Laminate Film</span>
                  <span>Pouch</span>
                  <span>Monocarton</span>
                </div>
              </div>
            </div>
          )}

          {/* Converting State Loader */}
          {isConverting && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(4, 28, 32, 0.92)',
              backdropFilter: 'blur(6px)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(0, 243, 255, 0.2)',
                borderTopColor: 'var(--teal, #00f3ff)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                  Processing & Converting Specification PDF...
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--teal, #00f3ff)', marginTop: '4px' }}>
                  Scanning tables, dimensional tolerances, and test methods
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Side-by-Side Review & Verification */}
          {conversionStep === 2 && convertedSpec && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Mobile View Toggle Bar (<= 900px) */}
              <div className="converter-mobile-tabs">
                <button
                  type="button"
                  onClick={() => setMobileSplitView('pdf')}
                  className={`btn btn-sm ${mobileSplitView === 'pdf' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', padding: '6px 12px' }}
                >
                  <FileText size={14} />
                  <span>Original PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSplitView('spec')}
                  className={`btn btn-sm ${mobileSplitView === 'spec' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', padding: '6px 12px' }}
                >
                  <CheckCircle2 size={14} />
                  <span>Converted Spec ({convertedSpec.parameters?.length || 0} params)</span>
                </button>
              </div>

              <div
                ref={splitContainerRef}
                className="converter-split-container"
                style={{
                  flex: 1,
                  display: 'flex',
                  overflow: 'hidden',
                  userSelect: isDragging ? 'none' : 'auto'
                }}
              >
                {/* LEFT COLUMN: Original PDF Viewer */}
                <div
                  className={`converter-pane-pdf ${mobileSplitView === 'pdf' ? 'mobile-active' : ''}`}
                  style={{
                    width: isMaximizedPdf ? '100%' : `${splitRatio}%`,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(0, 0, 0, 0.25)',
                    transition: isDragging ? 'none' : 'width 0.15s ease'
                  }}
                >
                  {/* PDF Sub-header */}
                  <div style={{
                    padding: '8px 14px',
                    background: 'rgba(6, 42, 48, 0.75)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: '1 1 auto' }}>
                      <FileText size={14} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file?.name}>
                        {file?.name || 'Original Specification PDF'}
                      </span>
                      {file?.size && (
                        <span style={{ opacity: 0.7, flexShrink: 0 }}>({(file.size / 1024).toFixed(0)} KB)</span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {/* Fit Mode Toggle */}
                      <div style={{
                        display: 'inline-flex',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(0,0,0,0.3)'
                      }}>
                        <button
                          type="button"
                          onClick={() => setPdfFitMode('FitH')}
                          style={{
                            padding: '3px 8px',
                            fontSize: '10px',
                            fontWeight: pdfFitMode === 'FitH' ? 700 : 500,
                            background: pdfFitMode === 'FitH' ? 'var(--teal)' : 'transparent',
                            color: pdfFitMode === 'FitH' ? '#000' : 'var(--text-muted)',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          title="Fit Page Width (shows entire document width without clipping)"
                        >
                          Fit Width
                        </button>
                        <button
                          type="button"
                          onClick={() => setPdfFitMode('Fit')}
                          style={{
                            padding: '3px 8px',
                            fontSize: '10px',
                            fontWeight: pdfFitMode === 'Fit' ? 700 : 500,
                            background: pdfFitMode === 'Fit' ? 'var(--teal)' : 'transparent',
                            color: pdfFitMode === 'Fit' ? '#000' : 'var(--text-muted)',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          title="Fit Entire Page"
                        >
                          Fit Page
                        </button>
                      </div>

                      {/* Split Ratio Presets */}
                      {!isMaximizedPdf && (
                        <div style={{
                          display: 'inline-flex',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(0,0,0,0.3)'
                        }}>
                          <button
                            type="button"
                            onClick={() => setSplitRatio(50)}
                            style={{
                              padding: '3px 7px',
                              fontSize: '10px',
                              fontWeight: Math.round(splitRatio) === 50 ? 700 : 500,
                              background: Math.round(splitRatio) === 50 ? 'rgba(0,243,255,0.25)' : 'transparent',
                              color: Math.round(splitRatio) === 50 ? 'var(--teal)' : 'var(--text-muted)',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Split 50:50 view"
                          >
                            50:50
                          </button>
                          <button
                            type="button"
                            onClick={() => setSplitRatio(68)}
                            style={{
                              padding: '3px 7px',
                              fontSize: '10px',
                              fontWeight: Math.round(splitRatio) === 68 ? 700 : 500,
                              background: Math.round(splitRatio) === 68 ? 'rgba(0,243,255,0.25)' : 'transparent',
                              color: Math.round(splitRatio) === 68 ? 'var(--teal)' : 'var(--text-muted)',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Wide PDF view (68% width)"
                          >
                            Wide PDF
                          </button>
                        </div>
                      )}

                      {/* Maximize PDF toggle */}
                      <button
                        type="button"
                        onClick={() => setIsMaximizedPdf(!isMaximizedPdf)}
                        className="btn btn-outline btn-sm"
                        style={{
                          padding: '3px 8px',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: isMaximizedPdf ? 'var(--teal)' : undefined,
                          borderColor: isMaximizedPdf ? 'var(--teal)' : undefined
                        }}
                        title={isMaximizedPdf ? 'Restore split view' : 'Maximize PDF preview to 100% width'}
                      >
                        {isMaximizedPdf ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                        <span>{isMaximizedPdf ? 'Restore Split' : 'Maximize'}</span>
                      </button>

                      {blobUrl && (
                        <a
                          href={blobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '3px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Open original PDF in full browser tab"
                        >
                          <ExternalLink size={12} />
                          <span>Pop out</span>
                        </a>
                      )}
                      {blobUrl && (
                        <a
                          href={blobUrl}
                          download={file?.name || 'original_spec.pdf'}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '3px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Download PDF"
                        >
                          <Download size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Embedded PDF iframe / Object */}
                  <div style={{ flex: 1, position: 'relative', background: '#262626', overflow: 'hidden' }}>
                    {blobUrl ? (
                      <iframe
                        key={`${blobUrl}_${pdfFitMode}`}
                        src={`${blobUrl}#page=1&view=${pdfFitMode}&toolbar=1&navpanes=0`}
                        title="Original Specification PDF"
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          display: 'block',
                          pointerEvents: isDragging ? 'none' : 'auto'
                        }}
                      />
                    ) : (
                      <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        <p>Raw text mode converted (No PDF view available)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Draggable Divider (Desktop only) */}
                {!isMaximizedPdf && (
                  <div
                    className={`converter-split-divider ${isDragging ? 'is-dragging' : ''}`}
                    onMouseDown={handleMouseDownSplitter}
                    title="Drag to resize PDF and Converted Spec panels"
                  />
                )}

                {/* RIGHT COLUMN: Converted Spec (Standard Format) */}
                <div
                  className={`converter-pane-spec ${mobileSplitView === 'spec' ? 'mobile-active' : ''}`}
                  style={{
                    width: isMaximizedPdf ? '0%' : `${100 - splitRatio}%`,
                    display: isMaximizedPdf ? 'none' : 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-sidebar, #062a30)',
                    transition: isDragging ? 'none' : 'width 0.15s ease'
                  }}
                >
                {/* Converted Sub-header & Tabs */}
                <div style={{
                  padding: '10px 16px',
                  background: 'rgba(4, 28, 32, 0.7)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff' }}>
                      Converted Spec: {convertedSpec.category?.toUpperCase()}
                    </span>
                    <span style={{
                      fontSize: '9.5px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: 700
                    }}>
                      {convertedSpec.parameters?.length || 0} params
                    </span>
                  </div>

                  {/* Review Section Switcher */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'params', label: '📊 Parameters' },
                      { id: 'header', label: '📄 Header & General' },
                      { id: 'quality', label: '🛡 Quality & Storage' },
                      ...(extractedRawText ? [{ id: 'rawtext', label: '🔍 Raw PDF Text' }] : [])
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveReviewTab(tab.id)}
                        style={{
                          padding: '3px 9px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: 'none',
                          background: activeReviewTab === tab.id ? 'var(--teal)' : 'rgba(255,255,255,0.06)',
                          color: activeReviewTab === tab.id ? '#041c20' : 'var(--text-dim)'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                </div>

                {/* Tab 1: Technical Parameters Table */}
                {activeReviewTab === 'params' && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>
                        Engineering Specifications & Tolerances Table
                      </div>
                      <button
                        type="button"
                        onClick={handleAddParam}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '10px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={12} />
                        <span>Add Parameter</span>
                      </button>
                    </div>

                    <div style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: 'rgba(0,0,0,0.2)'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                          <tr style={{ background: 'rgba(0, 243, 255, 0.1)', color: 'var(--teal)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '6px 8px', textAlign: 'center', width: '36px' }}>#</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Parameter</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left', width: '60px' }}>Unit</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Standard / Tolerance</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Test Standard</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', width: '50px' }}>Defect</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', width: '32px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(convertedSpec.parameters || []).map((p, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-dim)' }}>
                                {p.sNo || idx + 1}
                              </td>
                              <td style={{ padding: '4px 6px' }}>
                                <input
                                  type="text"
                                  value={p.parameter || ''}
                                  onChange={e => handleUpdateParam(idx, 'parameter', e.target.value)}
                                  style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.25)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: '#ffffff',
                                    padding: '3px 6px',
                                    fontSize: '11px'
                                  }}
                                />
                              </td>
                              <td style={{ padding: '4px 6px' }}>
                                <input
                                  type="text"
                                  value={p.units || '-'}
                                  onChange={e => handleUpdateParam(idx, 'units', e.target.value)}
                                  style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.25)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: '#ffffff',
                                    padding: '3px 6px',
                                    fontSize: '11px'
                                  }}
                                />
                              </td>
                              <td style={{ padding: '4px 6px' }}>
                                <input
                                  type="text"
                                  value={p.standard || ''}
                                  onChange={e => handleUpdateParam(idx, 'standard', e.target.value)}
                                  style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.25)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: '#ffffff',
                                    padding: '3px 6px',
                                    fontSize: '11px',
                                    fontWeight: 600
                                  }}
                                />
                              </td>
                              <td style={{ padding: '4px 6px' }}>
                                <input
                                  type="text"
                                  value={p.testStandard || ''}
                                  onChange={e => handleUpdateParam(idx, 'testStandard', e.target.value)}
                                  style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.25)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: '#94a3b8',
                                    padding: '3px 6px',
                                    fontSize: '10.5px'
                                  }}
                                />
                              </td>
                              <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                <select
                                  value={p.defectType || 'MJ'}
                                  onChange={e => handleUpdateParam(idx, 'defectType', e.target.value)}
                                  style={{
                                    background: '#041c20',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#ffffff',
                                    borderRadius: '4px',
                                    padding: '2px',
                                    fontSize: '10px'
                                  }}
                                >
                                  <option value="CR">CR</option>
                                  <option value="MJ">MJ</option>
                                  <option value="MI">MI</option>
                                </select>
                              </td>
                              <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteParam(idx)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: '2px'
                                  }}
                                  title="Delete parameter"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab 2: Header & General Specs */}
                {activeReviewTab === 'header' && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '10.5px' }}>Company / Brand</label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '11px' }}
                          value={convertedSpec.docHeader?.companyName || ''}
                          onChange={e => handleUpdateHeader('companyName', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '10.5px' }}>Document Name</label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '11px' }}
                          value={convertedSpec.docHeader?.docName || ''}
                          onChange={e => handleUpdateHeader('docName', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '10.5px' }}>Item Code / PM Code</label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                          value={convertedSpec.docHeader?.itemCode || ''}
                          onChange={e => handleUpdateHeader('itemCode', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '10.5px' }}>Artwork Code</label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                          value={convertedSpec.docHeader?.artworkCode || ''}
                          onChange={e => handleUpdateHeader('artworkCode', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '10.5px' }}>Revision Number</label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '11px' }}
                          value={convertedSpec.docHeader?.revision || '0.0'}
                          onChange={e => handleUpdateHeader('revision', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '10.5px' }}>Date of Issue</label>
                        <input
                          type="date"
                          className="form-input"
                          style={{ fontSize: '11px' }}
                          value={convertedSpec.docHeader?.issueDate || ''}
                          onChange={e => handleUpdateHeader('issueDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '10.5px' }}>Substrate / Material Structure</label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '11px' }}
                          value={convertedSpec.general?.substrate || ''}
                          onChange={e => handleUpdateGeneral('substrate', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '10.5px' }}>Dimensions / Blueprint Size</label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '11px' }}
                          value={convertedSpec.general?.dimensions || ''}
                          onChange={e => handleUpdateGeneral('dimensions', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Quality, Performance & Storage */}
                {activeReviewTab === 'quality' && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                        Performance Tests
                      </div>
                      {(convertedSpec.performanceTests || []).length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No performance tests detected in document.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {convertedSpec.performanceTests.map((t, idx) => (
                            <div key={idx} style={{
                              padding: '8px',
                              background: 'rgba(0,0,0,0.2)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              fontSize: '11px'
                            }}>
                              <div style={{ fontWeight: 700, color: '#ffffff' }}>{t.test} ({t.unit})</div>
                              <div style={{ color: 'var(--text-dim)', marginTop: '2px' }}>{t.standard} — <span style={{ opacity: 0.8 }}>Method: {t.testStandard}</span></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                        Storage & Packing Requirements
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                        <div>
                          <label style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Storage Conditions:</label>
                          <textarea
                            rows={2}
                            className="form-input"
                            style={{ fontSize: '11px', marginTop: '2px' }}
                            value={convertedSpec.storageAndPacking?.storage || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConvertedSpec(prev => ({
                                ...prev,
                                storageAndPacking: { ...(prev.storageAndPacking || {}), storage: val }
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Packing Instructions:</label>
                          <textarea
                            rows={2}
                            className="form-input"
                            style={{ fontSize: '11px', marginTop: '2px' }}
                            value={convertedSpec.storageAndPacking?.packing || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConvertedSpec(prev => ({
                                ...prev,
                                storageAndPacking: { ...(prev.storageAndPacking || {}), packing: val }
                              }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Raw PDF Extracted Text (Debug/Verification) */}
                {activeReviewTab === 'rawtext' && extractedRawText && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                        🔍 Raw Text Extracted from PDF
                      </div>
                      <div style={{
                        fontSize: '10.5px',
                        color: 'var(--text-dim)',
                        background: 'rgba(0, 243, 255, 0.05)',
                        border: '1px solid rgba(0, 243, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        marginBottom: '10px',
                        lineHeight: 1.5
                      }}>
                        This is what the server's PDF parser actually reads from your PDF. If any extracted values in the Parameters tab are wrong,
                        compare them with the text below to identify the issue. You can edit parameters directly in the
                        <strong style={{ color: 'var(--teal)' }}> 📊 Parameters</strong> tab.
                      </div>
                    </div>
                    <pre style={{
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      color: '#a0c4cc',
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '12px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.6,
                      maxHeight: '100%',
                      overflow: 'auto'
                    }}>
                      {extractedRawText}
                      {extractedRawText.length >= 3000 && (
                        <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                          {'\n\n... (first 3000 characters shown) ...'}
                        </span>
                      )}
                    </pre>
                  </div>
                )}


                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(4, 28, 32, 0.95)',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  {/* Destination options */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Save Destination:
                    </span>
                    <label style={{ fontSize: '11px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="dest"
                        checked={destinationMode === 'library'}
                        onChange={() => setDestinationMode('library')}
                      />
                      <span>Master Spec in Spec Library</span>
                    </label>
                    <label style={{ fontSize: '11px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="dest"
                        checked={destinationMode === 'project'}
                        onChange={() => setDestinationMode('project')}
                      />
                      <span>Assign to Project Component</span>
                    </label>
                  </div>

                  {/* Project + Component Selector (shown when Assign to Project Component is selected) */}
                  {destinationMode === 'project' && (
                    <div className="converter-footer-row" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 200px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>Select Project</label>
                        <select
                          className="form-input"
                          style={{ fontSize: '11px' }}
                          value={selectedProjectId}
                          onChange={e => {
                            setSelectedProjectId(e.target.value);
                            setSelectedMaterialIdx(0);
                          }}
                        >
                          {projects.length === 0 && (
                            <option value="" style={{ background: '#062a30' }}>— No projects available —</option>
                          )}
                          {projects.map(p => (
                            <option key={p.id} value={p.id} style={{ background: '#062a30' }}>
                              {p.projectName} ({p.id})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: '1 1 200px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>Select Component / Material</label>
                        <select
                          className="form-input"
                          style={{ fontSize: '11px' }}
                          value={selectedMaterialIdx}
                          onChange={e => setSelectedMaterialIdx(Number(e.target.value))}
                        >
                          {currentMaterials.length === 0 && (
                            <option value="" style={{ background: '#062a30' }}>— Select a project first —</option>
                          )}
                          {currentMaterials.map((m, idx) => (
                            <option key={idx} value={idx} style={{ background: '#062a30' }}>
                              {m.name} ({m.pmCode || m.type})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Title & Final Save Action */}
                  <div className="converter-footer-row" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 240px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '11.5px', fontWeight: 600 }}
                        placeholder="Spec Title in Library..."
                        value={specLibraryTitle}
                        onChange={e => setSpecLibraryTitle(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="btn btn-primary"
                      style={{
                        padding: '7px 20px',
                        fontSize: '12px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        flex: '0 0 auto'
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>
                        {isSaving
                          ? (destinationMode === 'project' ? 'Assigning to Project...' : 'Saving to Spec Library...')
                          : (destinationMode === 'project' ? 'Assign to Project Component' : 'Store in Spec Library')
                        }
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
