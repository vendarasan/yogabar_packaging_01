import React, { useState, useEffect } from 'react';
import { MAT_TYPES, PRINT_TYPES, isPouch, getMaterialLeadTime, POUCH_PRINT_LEAD, getSpecFields } from '../../constants';
import { getDefaultSpecSheet, generateDefaultPMCode, getArtworkCode, getPMPrefix, extractPMNumber } from '../../specTemplates';
import { today, calcProjectMilestones, fmt } from '../../utils';
import { getPackagingFormats } from '../../api';

export default function AddProjectPage({ onCancel, onSave, editProject }) {
  const [fgCode, setFgCode] = useState('');
  const [projectName, setProjectName] = useState('');
  const [skuSize, setSkuSize] = useState('');
  const [briefDate, setBriefDate] = useState(today());
  const [targetLaunchDate, setTargetLaunchDate] = useState('');
  const [status, setStatus] = useState('On Track');
  const [risk, setRisk] = useState('Low');
  const [factory, setFactory] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('Regular');
  const [projectCategory, setProjectCategory] = useState('NPD');

  const [materials, setMaterials] = useState([
    { name: '', pmCode: '', clubbedCodes: '', packagingFormatId: 'PF-01', type: MAT_TYPES[0], printType: 'Not Applicable', supplier: '', specs: {}, specSheet: null, artworkUrl: '', artworkFileName: '', variants: [], briefDate: today() }
  ]);
  const [packagingFormats, setPackagingFormats] = useState([]);
  const [expandedSpecRows, setExpandedSpecRows] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getPackagingFormats()
      .then(res => {
        if (isMounted && res.data?.formats) {
          setPackagingFormats(res.data.formats);
        }
      })
      .catch(err => {
        console.warn('Could not load packaging formats from API:', err);
      });
    return () => { isMounted = false; };
  }, []);

  const estReadyDate = (briefDate && materials.length) ? calcProjectMilestones(briefDate, materials)?.Connectivity : null;

  useEffect(() => {
    if (editProject) {
      setFgCode(editProject.fgCode || '');
      setProjectName(editProject.projectName || '');
      setSkuSize(editProject.skuSize || editProject.grammage || '');
      setBriefDate(editProject.briefDate || today());
      setTargetLaunchDate(editProject.targetLaunchDate || '');
      setStatus(editProject.status || 'On Track');
      setRisk(editProject.risk || 'Low');
      setFactory(editProject.factory || '');
      setDescription(editProject.description || editProject.comments || '');
      setProjectType(editProject.projectType || 'Regular');
      setProjectCategory(editProject.projectCategory || 'NPD');
      setMaterials(editProject.materials ? editProject.materials.map((m, idx) => ({
        id: m.id || `${editProject.id}-mat-${idx}`,
        name: m.name,
        pmCode: m.pmCode || '',
        clubbedCodes: m.clubbedCodes || m.specSheet?.docHeader?.clubbedCodes || '',
        packagingFormatId: m.packagingFormatId || m.packaging_format_id || m.formatId || '',
        type: m.type,
        printType: m.printType || (isPouch(m.type) ? 'Digital Print' : 'Not Applicable'),
        supplier: m.supplier || '',
        customLeadTime: m.customLeadTime,
        poStatus: m.poStatus || 'RFQ in progress',
        poNumber: m.poNumber || '',
        specs: m.specs || {},
        specSheet: m.specSheet || null,
        artworkUrl: m.artworkUrl || m.specSheet?.artworkFiles?.[0]?.url || '',
        artworkFileName: m.specSheet?.artworkFiles?.[0]?.name || '',
        variants: m.variants || m.specSheet?.variants || [],
        briefDate: m.briefDate || m.milestones?.Brief || editProject.briefDate || today()
      })) : [{ name: '', pmCode: '', clubbedCodes: '', packagingFormatId: 'PF-01', type: MAT_TYPES[0], printType: 'Not Applicable', supplier: '', customLeadTime: '', poStatus: 'RFQ in progress', poNumber: '', specs: {}, specSheet: null, artworkUrl: '', artworkFileName: '', variants: [], briefDate: today() }]);
    } else {
      setFgCode('');
      setProjectName('');
      setSkuSize('');
      setBriefDate(today());
      setTargetLaunchDate('');
      setStatus('On Track');
      setRisk('Low');
      setFactory('');
      setDescription('');
      setProjectType('Regular');
      setProjectCategory('NPD');
      setMaterials([{ name: '', pmCode: '', clubbedCodes: '', packagingFormatId: 'PF-01', type: MAT_TYPES[0], printType: 'Not Applicable', supplier: '', customLeadTime: '', poStatus: 'RFQ in progress', poNumber: '', specs: {}, specSheet: null, artworkUrl: '', artworkFileName: '', variants: [], briefDate: today() }]);
    }
  }, [editProject]);

  const handleProjectBriefDateChange = (newDate) => {
    setBriefDate(newDate);
    setMaterials(prev => prev.map(m => ({ ...m, briefDate: newDate })));
  };

  const handleAddMaterialRow = () => {
    const defaultFmt = packagingFormats[0] || null;
    const defaultType = defaultFmt ? defaultFmt.name : MAT_TYPES[0];
    const defaultFmtId = defaultFmt ? defaultFmt.id : 'PF-01';
    setMaterials(prev => [...prev, {
      name: '', pmCode: '', clubbedCodes: '', packagingFormatId: defaultFmtId, type: defaultType, printType: 'Not Applicable',
      supplier: '', customLeadTime: '', poStatus: 'RFQ in progress', poNumber: '',
      specs: {}, specSheet: null, artworkUrl: '', artworkFileName: '', variants: [], briefDate
    }]);
  };

  const handleRemoveMaterialRow = (idx) => {
    if (materials.length <= 1) return;
    setMaterials(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMatChange = (idx, field, val) => {
    setMaterials(prev => {
      const copy = [...prev];
      const updated = { ...copy[idx], [field]: val };
      if (field === 'packagingFormatId' || field === 'type') {
        const fmt = packagingFormats.find(f => f.id === val || f.name === val);
        const formatName = fmt ? fmt.name : val;
        const formatId = fmt ? fmt.id : (copy[idx].packagingFormatId || 'PF-24');
        updated.packagingFormatId = formatId;
        updated.type = formatName;

        const newPrefix = fmt?.codePrefix || getPMPrefix(formatName);
        const existingNum = extractPMNumber(copy[idx].pmCode, copy[idx].type);
        if (existingNum) {
          updated.pmCode = `${newPrefix}${existingNum}`;
        }
        const isFmtPouch = fmt ? fmt.isPouch : isPouch(formatName);
        if (isFmtPouch && (!updated.printType || updated.printType === 'Not Applicable')) {
          updated.printType = 'Digital Print';
        }
        if (updated.specSheet) {
          const newSheet = getDefaultSpecSheet(formatName, projectName.trim(), skuSize.trim(), idx);
          newSheet.docHeader.itemCode = updated.pmCode || newSheet.docHeader.itemCode;
          newSheet.docHeader.clubbedCodes = updated.clubbedCodes || '';
          newSheet.general.preferredSupplier = updated.supplier || '';
          updated.specSheet = newSheet;
        }
      }
      if (field === 'pmCode') {
        if (updated.specSheet?.docHeader) {
          const finalCode = val ? val.trim() : generateDefaultPMCode(updated.type, idx);
          updated.specSheet = {
            ...updated.specSheet,
            docHeader: {
              ...updated.specSheet.docHeader,
              itemCode: finalCode,
              artworkCode: getArtworkCode(finalCode)
            }
          };
        }
      }
      copy[idx] = updated;
      return copy;
    });
  };

  const toggleSpecRow = (idx) => {
    setMaterials(prev => {
      const copy = [...prev];
      if (!copy[idx].specSheet) {
        const defaultSheet = getDefaultSpecSheet(copy[idx].type, projectName.trim(), skuSize.trim(), idx);
        if (copy[idx].pmCode) defaultSheet.docHeader.itemCode = copy[idx].pmCode;
        if (copy[idx].clubbedCodes) defaultSheet.docHeader.clubbedCodes = copy[idx].clubbedCodes;
        if (copy[idx].supplier) defaultSheet.general.preferredSupplier = copy[idx].supplier;
        copy[idx].specSheet = defaultSheet;
      }
      return copy;
    });
    setExpandedSpecRows(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleParamValueChange = (matIdx, pIdx, field, val) => {
    setMaterials(prev => {
      const copy = [...prev];
      const m = { ...copy[matIdx] };
      if (!m.specSheet) m.specSheet = getDefaultSpecSheet(m.type, projectName, skuSize, matIdx);
      const params = [...(m.specSheet.parameters || [])];
      params[pIdx] = { ...params[pIdx], [field]: val };
      m.specSheet = { ...m.specSheet, parameters: params };
      copy[matIdx] = m;
      return copy;
    });
  };

  const handleAddParamRow = (matIdx) => {
    setMaterials(prev => {
      const copy = [...prev];
      const m = { ...copy[matIdx] };
      if (!m.specSheet) m.specSheet = getDefaultSpecSheet(m.type, projectName, skuSize, matIdx);
      const params = [...(m.specSheet.parameters || [])];
      params.push({ sNo: params.length + 1, parameter: 'New Parameter', units: 'mm', standard: '', testStandard: 'NA', defectType: 'MJ', factoryCheck: 'Yes' });
      m.specSheet = { ...m.specSheet, parameters: params };
      copy[matIdx] = m;
      return copy;
    });
  };

  const handleDeleteParamRow = (matIdx, pIdx) => {
    setMaterials(prev => {
      const copy = [...prev];
      const m = { ...copy[matIdx] };
      if (!m.specSheet) return copy;
      const params = (m.specSheet.parameters || []).filter((_, i) => i !== pIdx).map((p, i) => ({ ...p, sNo: i + 1 }));
      m.specSheet = { ...m.specSheet, parameters: params };
      copy[matIdx] = m;
      return copy;
    });
  };

  const handleGeneralFieldChange = (matIdx, field, val) => {
    setMaterials(prev => {
      const copy = [...prev];
      const m = { ...copy[matIdx] };
      if (!m.specSheet) m.specSheet = getDefaultSpecSheet(m.type, projectName, skuSize, matIdx);
      m.specSheet = { ...m.specSheet, general: { ...(m.specSheet.general || {}), [field]: val } };
      copy[matIdx] = m;
      return copy;
    });
  };

  const handleClubbedCodesChange = (matIdx, val) => {
    setMaterials(prev => {
      const copy = [...prev];
      const m = { ...copy[matIdx], clubbedCodes: val };
      if (!m.specSheet) m.specSheet = getDefaultSpecSheet(m.type, projectName, skuSize, matIdx);
      m.specSheet = { ...m.specSheet, docHeader: { ...(m.specSheet.docHeader || {}), clubbedCodes: val } };
      copy[matIdx] = m;
      return copy;
    });
  };

  const handleArtworkUpload = (matIdx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setMaterials(prev => {
        const copy = [...prev];
        const m = { ...copy[matIdx], artworkUrl: dataUrl, artworkFileName: file.name };
        if (!m.specSheet) m.specSheet = getDefaultSpecSheet(m.type, projectName, skuSize, matIdx);
        const artworkFiles = [...(m.specSheet.artworkFiles || [])];
        if (!artworkFiles.some(a => a.name === file.name)) {
          artworkFiles.unshift({ name: file.name, url: dataUrl, uploadedAt: new Date().toISOString() });
        }
        m.specSheet = { ...m.specSheet, artworkFiles };
        copy[matIdx] = m;
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveArtwork = (matIdx) => {
    setMaterials(prev => {
      const copy = [...prev];
      const m = { ...copy[matIdx], artworkUrl: '', artworkFileName: '' };
      if (m.specSheet) {
        m.specSheet = { ...m.specSheet, artworkFiles: [] };
      }
      copy[matIdx] = m;
      return copy;
    });
  };

  const handleToggleVariantsMode = (matIdx, isMultiple) => {
    setMaterials(prev => {
      const copy = [...prev];
      const m = { ...copy[matIdx] };
      if (!m.specSheet) m.specSheet = getDefaultSpecSheet(m.type, projectName, skuSize, matIdx);
      
      if (isMultiple) {
        let curVars = m.specSheet.variants || [];
        if (curVars.length <= 1) {
          const basePm = m.pmCode || m.specSheet.docHeader?.itemCode || generateDefaultPMCode(m.type, matIdx);
          const baseDigits = parseInt(basePm.match(/\d+$/)?.[0] || '50560', 10);
          const prefix = basePm.replace(/\d+$/, '');
          curVars = [
            { id: 'var-1', variantName: projectName ? `${projectName} - Variant 1` : 'Variant 1', itemCode: basePm, artworkCode: getArtworkCode(basePm), artworkFiles: [], pantoneColors: ['CMYK'], dimensions: 'Standard', netWeight: skuSize || 'Standard' },
            { id: 'var-2', variantName: projectName ? `${projectName} - Variant 2` : 'Variant 2', itemCode: `${prefix}${baseDigits + 1}`, artworkCode: getArtworkCode(`${prefix}${baseDigits + 1}`), artworkFiles: [], pantoneColors: ['CMYK'], dimensions: 'Standard', netWeight: skuSize || 'Standard' }
          ];
        }
        m.specSheet.variants = curVars;
        m.variants = curVars;
        const clubbedStr = curVars.map(v => v.itemCode).filter(Boolean).join(', ');
        m.clubbedCodes = clubbedStr;
        if (m.specSheet.docHeader) m.specSheet.docHeader.clubbedCodes = clubbedStr;
      } else {
        const basePm = m.pmCode || m.specSheet.docHeader?.itemCode || generateDefaultPMCode(m.type, matIdx);
        const singleVar = [{
          id: 'var-1',
          variantName: projectName || 'Standard SKU',
          itemCode: basePm,
          artworkCode: getArtworkCode(basePm),
          artworkFiles: m.specSheet.artworkFiles || [],
          pantoneColors: ['CMYK'],
          dimensions: 'Standard Blueprint Dimensions',
          netWeight: skuSize || 'Standard'
        }];
        m.specSheet.variants = singleVar;
        m.variants = singleVar;
        m.clubbedCodes = '';
        if (m.specSheet.docHeader) m.specSheet.docHeader.clubbedCodes = '';
      }
      copy[matIdx] = m;
      return copy;
    });
  };

  const handleAddVariant = (matIdx) => {
    setMaterials(prev => {
      const copy = [...prev];
      const m = { ...copy[matIdx] };
      if (!m.specSheet) m.specSheet = getDefaultSpecSheet(m.type, projectName, skuSize, matIdx);
      const curVars = [...(m.specSheet.variants || [])];
      const nextNum = curVars.length + 1;
      const basePm = m.pmCode || m.specSheet.docHeader?.itemCode || generateDefaultPMCode(m.type, matIdx);
      const baseDigits = parseInt(basePm.match(/\d+$/)?.[0] || '50560', 10);
      const prefix = basePm.replace(/\d+$/, '');
      const newCode = `${prefix}${baseDigits + nextNum - 1}`;
      curVars.push({
        id: `var-${Date.now()}-${nextNum}`,
        variantName: `Variant ${nextNum}`,
        itemCode: newCode,
        artworkCode: getArtworkCode(newCode),
        artworkFiles: [],
        pantoneColors: ['CMYK'],
        dimensions: 'Standard',
        netWeight: skuSize || 'Standard'
      });
      m.specSheet.variants = curVars;
      m.variants = curVars;
      const clubbedStr = curVars.map(v => v.itemCode).filter(Boolean).join(', ');
      m.clubbedCodes = clubbedStr;
      if (m.specSheet.docHeader) m.specSheet.docHeader.clubbedCodes = clubbedStr;
      copy[matIdx] = m;
      return copy;
    });
  };

  const handleUpdateVariantField = (matIdx, vIdx, field, val) => {
    setMaterials(prev => {
      const copy = [...prev];
      const m = { ...copy[matIdx] };
      if (!m.specSheet) return copy;
      const curVars = [...(m.specSheet.variants || [])];
      if (curVars[vIdx]) {
        curVars[vIdx] = { ...curVars[vIdx], [field]: val };
        if (field === 'itemCode' && !curVars[vIdx].artworkCode) {
          curVars[vIdx].artworkCode = getArtworkCode(val);
        }
      }
      m.specSheet.variants = curVars;
      m.variants = curVars;
      if (field === 'itemCode') {
        const clubbedStr = curVars.map(v => v.itemCode).filter(Boolean).join(', ');
        m.clubbedCodes = clubbedStr;
        if (m.specSheet.docHeader) m.specSheet.docHeader.clubbedCodes = clubbedStr;
      }
      copy[matIdx] = m;
      return copy;
    });
  };

  const handleRemoveVariant = (matIdx, vIdx) => {
    setMaterials(prev => {
      const copy = [...prev];
      const m = { ...copy[matIdx] };
      if (!m.specSheet) return copy;
      let curVars = (m.specSheet.variants || []).filter((_, i) => i !== vIdx);
      if (curVars.length <= 1) {
        m.clubbedCodes = '';
        if (m.specSheet.docHeader) m.specSheet.docHeader.clubbedCodes = '';
      } else {
        const clubbedStr = curVars.map(v => v.itemCode).filter(Boolean).join(', ');
        m.clubbedCodes = clubbedStr;
        if (m.specSheet.docHeader) m.specSheet.docHeader.clubbedCodes = clubbedStr;
      }
      m.specSheet.variants = curVars;
      m.variants = curVars;
      copy[matIdx] = m;
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) { alert('Project Name is required'); return; }
    if (!briefDate) { alert('Brief Date is required'); return; }

    const validMats = materials.filter(m => m.name.trim()).map((m, idx) => {
      let formatId = m.packagingFormatId || m.packaging_format_id || m.formatId;
      if (!formatId && packagingFormats.length > 0) {
        const matched = packagingFormats.find(f => f.name === m.type || f.id === m.type);
        if (matched) formatId = matched.id;
      }
      if (!formatId) formatId = 'PF-24';

      const pmCode = m.pmCode ? m.pmCode.trim() : generateDefaultPMCode(m.type, idx);
      const clubbedCodes = m.clubbedCodes ? m.clubbedCodes.trim() : '';
      const artworkCode = getArtworkCode(pmCode);
      const specDocName = `${pmCode} — ${m.name ? m.name.trim() : m.type}`.trim();

      let specSheet = m.specSheet ? JSON.parse(JSON.stringify(m.specSheet)) : getDefaultSpecSheet(m.type, projectName.trim(), skuSize.trim(), idx);
      if (!specSheet.docHeader) specSheet.docHeader = {};
      specSheet.docHeader.itemCode = pmCode;
      specSheet.docHeader.clubbedCodes = clubbedCodes;
      specSheet.docHeader.docName = specDocName;
      specSheet.docHeader.artworkCode = artworkCode;
      if (!specSheet.general) specSheet.general = {};
      specSheet.general.productName = projectName.trim();
      specSheet.general.packSize = skuSize.trim() || 'Standard';
      if (m.supplier) specSheet.general.preferredSupplier = m.supplier;

      if (m.artworkUrl) {
        if (!specSheet.artworkFiles) specSheet.artworkFiles = [];
        if (!specSheet.artworkFiles.some(a => a.url === m.artworkUrl)) {
          specSheet.artworkFiles.unshift({ name: m.artworkFileName || `${m.name || m.type} Master Artwork`, url: m.artworkUrl, uploadedAt: new Date().toISOString() });
        }
      }
      if (m.variants && m.variants.length > 0) specSheet.variants = m.variants;

      return {
        ...m,
        id: m.id || `${editProject ? editProject.id : 'proj'}-mat-${idx}`,
        packagingFormatId: formatId,
        packaging_format_id: formatId,
        formatId: formatId,
        briefDate: m.briefDate || briefDate,
        pmCode,
        clubbedCodes,
        artworkCode,
        artworkUrl: m.artworkUrl || (specSheet.artworkFiles?.[0]?.url || ''),
        variants: specSheet.variants || [],
        specSheet
      };
    });

    if (!validMats.length) { alert('At least 1 material with a name is required'); return; }

    for (const m of validMats) {
      if (isPouch(m.type) && (!m.printType || m.printType === 'Not Applicable')) {
        alert(`Pouch Confirmation Required: Please select the printing process (Digital: 15d, Flexo: 21d, or Gravure: 35d) for "${m.name || m.type}".`);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave({
        fgCode: fgCode.trim(),
        projectName: projectName.trim(),
        skuSize: skuSize.trim(),
        briefDate,
        targetLaunchDate: targetLaunchDate || estReadyDate || null,
        status, risk,
        supplier: validMats[0]?.supplier?.trim() || '',
        factory: factory.trim(),
        description: description.trim(),
        projectType, projectCategory,
        materials: validMats
      }, editProject ? editProject.id : null);
    } catch (err) {
      // error handled upstream via showToast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="add-project-page">
      {/* ── Page Header ── */}
      <div className="add-project-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            ← Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
              {editProject ? `✏ Edit Project — ${editProject.projectName}` : '📦 New Packaging Project'}
            </h1>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {editProject ? 'Update project details, materials, and spec parameters below.' : 'Fill in project details and add packaging materials to get started.'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Form Body ── */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="add-project-page-body">

          {/* Project Details Grid */}
          <div className="form-section-card">
            <div className="form-section-title">📝 Project Details</div>
            <div className="form-grid" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  className="modern-form-input"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="e.g. Muesli Dark Choco 400g Pouch"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">FG / PM Item Code</label>
                <input
                  className="modern-form-input"
                  value={fgCode}
                  onChange={e => setFgCode(e.target.value)}
                  placeholder="e.g. FG-89012345678"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Project Type</label>
                <select className="modern-form-select" value={projectType} onChange={e => { setProjectType(e.target.value); setProjectCategory('NPD'); }}>
                  <option value="Regular" style={{ backgroundColor: '#062a30', color: '#ffffff' }}>Regular</option>
                  <option value="Growth"  style={{ backgroundColor: '#062a30', color: '#ffffff' }}>Growth</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Project Category</label>
                <select className="modern-form-select" value={projectCategory} onChange={e => setProjectCategory(e.target.value)}>
                  <option value="NPD" style={{ backgroundColor: '#062a30', color: '#ffffff' }}>NPD</option>
                  <option value="EPD" style={{ backgroundColor: '#062a30', color: '#ffffff' }}>EPD</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">SKU Size</label>
                <input
                  className="modern-form-input"
                  value={skuSize}
                  onChange={e => setSkuSize(e.target.value)}
                  placeholder="e.g. 400g, 1L, 500ml"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Brief Start Date *</label>
                <input
                  className="modern-form-input"
                  type="date"
                  value={briefDate}
                  onChange={e => handleProjectBriefDateChange(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <label className="form-label">Launch Timeline</label>
                  {estReadyDate && (
                    <span style={{ fontSize: '10px', color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                      Est. Ready: {fmt(estReadyDate)}
                    </span>
                  )}
                </div>
                <input
                  className="modern-form-input"
                  type="date"
                  value={targetLaunchDate}
                  placeholder={estReadyDate || ''}
                  onChange={e => setTargetLaunchDate(e.target.value)}
                />
                {targetLaunchDate && estReadyDate && targetLaunchDate < estReadyDate && (
                  <div style={{ marginTop: '6px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '11px', color: '#fca5a5' }}>
                    <div style={{ fontWeight: '700', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>⚡</span> Crunched Timeline ({Math.round((new Date(estReadyDate) - new Date(targetLaunchDate)) / 86400000)} days compressed)
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--white-dim)', marginTop: '2px' }}>
                      Requires Stage 1 (Admin) &amp; Stage 2 (Super Admin) approvals upon creation.
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Project Status</label>
                <select className="modern-form-select" value={status} onChange={e => setStatus(e.target.value)}>
                  <option style={{ backgroundColor: '#062a30', color: '#ffffff' }}>On Track</option>
                  <option style={{ backgroundColor: '#062a30', color: '#ffffff' }}>At Risk</option>
                  <option style={{ backgroundColor: '#062a30', color: '#ffffff' }}>Delayed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Risk Level</label>
                <select className="modern-form-select" value={risk} onChange={e => setRisk(e.target.value)}>
                  <option style={{ backgroundColor: '#062a30', color: '#ffffff' }}>Low</option>
                  <option style={{ backgroundColor: '#062a30', color: '#ffffff' }}>Medium</option>
                  <option style={{ backgroundColor: '#062a30', color: '#ffffff' }}>High</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Target Factory / DC</label>
                <input
                  className="modern-form-input"
                  value={factory}
                  onChange={e => setFactory(e.target.value)}
                  placeholder="e.g. Hoskote Unit 1"
                />
              </div>
              <div className="form-group full">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Any key project notes, constraints, or updates..."
                />
              </div>
            </div>
          </div>

          {/* Materials Section */}
          <div className="form-section-card" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div className="form-section-title" style={{ margin: 0 }}>🧱 Packaging Format ({materials.length})</div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddMaterialRow}>
                ＋ Add Material
              </button>
            </div>

            <div className="modern-mat-table-wrap">
              <table className="modern-mat-table">
                <thead>
                  <tr>
                    <th style={{ width: '35px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '155px' }}>PM Code</th>
                    <th>Material Name *</th>
                    <th style={{ width: '140px' }}>Material Type</th>
                    <th style={{ width: '160px' }}>Print Type</th>
                    <th style={{ width: '135px' }}>Brief Date</th>
                    <th style={{ width: '105px' }}>Lead Time</th>
                    <th style={{ width: '130px' }}>Supplier</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Specs</th>
                    <th style={{ width: '35px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, idx) => {
                    const isSpecOpen = !!expandedSpecRows[idx];
                    const hasAnySpec = !!(m.clubbedCodes || m.artworkUrl || (m.specSheet?.parameters?.some(p => !!p.standard)) || Object.keys(m.specs || {}).some(k => !!m.specs[k]));
                    const currentPmCode = m.pmCode ? m.pmCode.trim() : generateDefaultPMCode(m.type, idx);
                    const currentAwCode = getArtworkCode(currentPmCode);

                    return (
                      <React.Fragment key={idx}>
                        <tr>
                          <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '11px', color: 'var(--text-main)' }}>{idx + 1}</td>
                          <td style={{ width: '155px', minWidth: '155px' }}>
                            {(() => {
                              const prefix = getPMPrefix(m.type);
                              const currentNum = extractPMNumber(m.pmCode, m.type);
                              const defaultNum = String(50560 + idx);
                              return (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'rgba(4, 28, 32, 0.85)',
                                    border: '1px solid rgba(0, 243, 255, 0.35)',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    height: '32px',
                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)'
                                  }}
                                  title={`Selected Packaging Material: ${m.type || 'Standard'} → Prefix: ${prefix}`}
                                >
                                  <span
                                    style={{
                                      background: 'rgba(0, 243, 255, 0.12)',
                                      borderRight: '1px solid rgba(0, 243, 255, 0.25)',
                                      color: '#00f3ff',
                                      fontFamily: 'monospace',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      padding: '0 6px',
                                      height: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      whiteSpace: 'nowrap',
                                      userSelect: 'none'
                                    }}
                                  >
                                    {prefix}
                                  </span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={currentNum}
                                    onChange={e => {
                                      const extracted = extractPMNumber(e.target.value, m.type);
                                      const numOnly = extracted.replace(/[^0-9]/g, '');
                                      handleMatChange(idx, 'pmCode', numOnly ? `${prefix}${numOnly}` : '');
                                    }}
                                    placeholder={defaultNum}
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      width: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      outline: 'none',
                                      color: '#ffffff',
                                      fontFamily: 'monospace',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      padding: '0 6px',
                                      height: '100%'
                                    }}
                                    title="Enter only the number (e.g. 50560)"
                                  />
                                </div>
                              );
                            })()}
                          </td>
                          <td>
                            <input
                              className="modern-form-input"
                              value={m.name}
                              onChange={e => handleMatChange(idx, 'name', e.target.value)}
                              placeholder={idx === 0 ? 'e.g. Primary Pouch / Film' : idx === 1 ? 'e.g. Secondary Box' : 'e.g. Tertiary Shipper'}
                              required
                            />
                          </td>
                          <td>
                            <select
                              className="modern-form-select"
                              value={m.packagingFormatId || packagingFormats.find(f => f.name === m.type)?.id || m.type}
                              onChange={e => handleMatChange(idx, 'packagingFormatId', e.target.value)}
                            >
                              {packagingFormats.length > 0 ? (
                                packagingFormats.map(fmt => (
                                  <option key={fmt.id} value={fmt.id} style={{ backgroundColor: '#062a30', color: '#ffffff' }}>
                                    {fmt.name} ({fmt.id})
                                  </option>
                                ))
                              ) : (
                                MAT_TYPES.map(t => (
                                  <option key={t} value={t} style={{ backgroundColor: '#062a30', color: '#ffffff' }}>{t}</option>
                                ))
                              )}
                            </select>
                          </td>
                          <td>
                            {isPouch(m.type) ? (
                              <select
                                className="modern-form-select"
                                value={m.printType || ''}
                                onChange={e => handleMatChange(idx, 'printType', e.target.value)}
                                style={(!m.printType || m.printType === 'Not Applicable') ? { border: '1px solid #f59e0b', color: '#f59e0b' } : {}}
                              >
                                {(!m.printType || m.printType === 'Not Applicable') && (
                                  <option value="" style={{ backgroundColor: '#062a30', color: '#f59e0b' }}>⚠️ Confirm Print...</option>
                                )}
                                <option value="Digital Print"  style={{ backgroundColor: '#062a30', color: '#ffffff' }}>Digital Print (15d)</option>
                                <option value="Flexo Print"    style={{ backgroundColor: '#062a30', color: '#ffffff' }}>Flexo Print (21d)</option>
                                <option value="Gravure Print"  style={{ backgroundColor: '#062a30', color: '#ffffff' }}>Gravure Print (35d)</option>
                              </select>
                            ) : (
                              <select
                                className="modern-form-select"
                                value={m.printType || 'Not Applicable'}
                                onChange={e => handleMatChange(idx, 'printType', e.target.value)}
                              >
                                {PRINT_TYPES.map(pt => (
                                  <option key={pt} value={pt} style={{ backgroundColor: '#062a30', color: '#ffffff' }}>{pt}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td>
                            <input
                              type="date"
                              className="modern-form-input"
                              value={m.briefDate || briefDate}
                              onChange={e => handleMatChange(idx, 'briefDate', e.target.value)}
                              style={{ fontSize: '11px', padding: '4px 6px' }}
                            />
                          </td>
                          <td>
                            {m.type === 'Other' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                  type="number" min="1" max="365"
                                  className="modern-form-input"
                                  style={{ width: '55px', padding: '3px 6px', textAlign: 'center' }}
                                  value={m.customLeadTime !== undefined && m.customLeadTime !== '' ? m.customLeadTime : 15}
                                  onChange={e => handleMatChange(idx, 'customLeadTime', e.target.value)}
                                />
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>days</span>
                              </div>
                            ) : isPouch(m.type) ? (
                              (!m.printType || m.printType === 'Not Applicable') ? (
                                <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600, background: 'rgba(245,158,11,0.1)', padding: '2px 5px', borderRadius: '4px', border: '1px solid rgba(245,158,11,0.3)' }}>
                                  ⚠️ Confirm
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--teal)' }}>
                                  ⏱ {getMaterialLeadTime(m)}d
                                </span>
                              )
                            ) : (
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)' }}>
                                ⏱ {getMaterialLeadTime(m)}d
                              </span>
                            )}
                          </td>
                          <td>
                            <input
                              className="modern-form-input"
                              value={m.supplier || ''}
                              onChange={e => handleMatChange(idx, 'supplier', e.target.value)}
                              placeholder="e.g. Amcor"
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                              <button
                                type="button"
                                onClick={() => toggleSpecRow(idx)}
                                style={{
                                  background: isSpecOpen ? 'rgba(0,243,255,0.22)' : hasAnySpec ? 'rgba(16,185,129,0.18)' : 'rgba(0,243,255,0.08)',
                                  border: `1px solid ${hasAnySpec ? '#10b981' : isSpecOpen ? 'var(--cyan)' : 'var(--border-color)'}`,
                                  color: hasAnySpec ? '#34d399' : isSpecOpen ? 'var(--cyan)' : 'var(--teal)',
                                  padding: '4px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: '700', cursor: 'pointer',
                                  display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.15s ease'
                                }}
                                title={`Configure specification parameters for ${m.type}`}
                              >
                                {isSpecOpen ? '▲ Hide' : hasAnySpec ? '📋 Specs ✓' : '＋ Specs'}
                              </button>
                              <span style={{
                                fontSize: '9px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: (m.variants?.length > 1 || m.specSheet?.variants?.length > 1) ? 'rgba(217,70,239,0.18)' : 'rgba(2,132,199,0.14)',
                                color: (m.variants?.length > 1 || m.specSheet?.variants?.length > 1) ? '#f0abfc' : '#7dd3fc',
                                border: `1px solid ${(m.variants?.length > 1 || m.specSheet?.variants?.length > 1) ? 'rgba(217,70,239,0.35)' : 'rgba(2,132,199,0.25)'}`,
                                whiteSpace: 'nowrap'
                              }}>
                                {(m.variants?.length > 1 || m.specSheet?.variants?.length > 1) ? `✨ ${(m.specSheet?.variants || m.variants).length} Vars` : '1 SKU'}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {materials.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRemoveMaterialRow(idx)}
                                style={{ padding: '2px 5px' }}
                              >✕</button>
                            )}
                          </td>
                        </tr>

                        {/* SPECIFICATION PARAMETERS EXPANDABLE ROW */}
                        {isSpecOpen && (
                          <tr className="spec-sub-row">
                            <td colSpan="10" style={{ padding: '0 !important' }}>
                              <div style={{ padding: '16px 20px', background: 'rgba(4,28,32,0.98)', borderLeft: '4px solid #14b8a6', borderBottom: '1px solid var(--border-color)', margin: '6px 10px 16px 10px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>

                                {/* Drawer Header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', gap: '10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ background: '#042f2e', border: '1px solid #14b8a6', color: '#5eead4', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                      📋 Yoga Bar Spec Layout · {m.type}
                                    </span>
                                    <span style={{ fontSize: '11px', fontFamily: 'monospace', background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.35)', color: '#14b8a6', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                      Doc Code: {currentPmCode}
                                    </span>
                                    <span style={{ fontSize: '11px', fontFamily: 'monospace', background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.35)', color: '#f472b6', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                      Artwork Code: {currentAwCode}
                                    </span>
                                  </div>
                                  <button type="button" onClick={() => toggleSpecRow(idx)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px' }}>
                                    ▲ Collapse Specs
                                  </button>
                                </div>

                                {/* ── Interactive Variant Configuration Prompt ── */}
                                <div style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(99,102,241,0.12))', border: '1px solid rgba(14,165,233,0.35)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🎨</span>
                                        <span>Does this packaging material have multiple variants / clubbed artworks?</span>
                                      </div>
                                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                                        Select whether this specification covers a single standard SKU or multiple flavor/variant clubbed artworks.
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.35)', padding: '3px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleVariantsMode(idx, false)}
                                        style={{
                                          padding: '5px 12px',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          border: 'none',
                                          background: !(m.variants?.length > 1 || m.specSheet?.variants?.length > 1) ? '#0284c7' : 'transparent',
                                          color: !(m.variants?.length > 1 || m.specSheet?.variants?.length > 1) ? '#ffffff' : '#94a3b8',
                                          boxShadow: !(m.variants?.length > 1 || m.specSheet?.variants?.length > 1) ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        ✓ Single Variant (Standard SKU)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleVariantsMode(idx, true)}
                                        style={{
                                          padding: '5px 12px',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          border: 'none',
                                          background: (m.variants?.length > 1 || m.specSheet?.variants?.length > 1) ? 'linear-gradient(135deg, #d946ef, #8b5cf6)' : 'transparent',
                                          color: (m.variants?.length > 1 || m.specSheet?.variants?.length > 1) ? '#ffffff' : '#94a3b8',
                                          boxShadow: (m.variants?.length > 1 || m.specSheet?.variants?.length > 1) ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        ✨ Multiple Variants (Clubbed Artworks)
                                      </button>
                                    </div>
                                  </div>

                                  {(m.variants?.length > 1 || m.specSheet?.variants?.length > 1) ? (
                                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#e879f9' }}>
                                          Configured Variants ({(m.specSheet?.variants || m.variants || []).length}) &bull; Each variant gets a dedicated artwork sheet titled: <em>Artwork: Variant N &mdash; [Name]</em>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleAddVariant(idx)}
                                          style={{ background: 'rgba(217,70,239,0.2)', border: '1px solid #d946ef', color: '#f0abfc', padding: '3px 10px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                          ＋ Add Another Variant SKU
                                        </button>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {(m.specSheet?.variants || m.variants || []).map((v, vIdx) => (
                                          <div key={v.id || vIdx} style={{ display: 'grid', gridTemplateColumns: '70px 1.2fr 1fr 1fr 30px', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#cbd5e1' }}>Variant {vIdx + 1}</span>
                                            <input
                                              className="modern-form-input"
                                              style={{ fontSize: '11px', padding: '3px 6px' }}
                                              value={v.variantName || v.name || ''}
                                              onChange={e => handleUpdateVariantField(idx, vIdx, 'variantName', e.target.value)}
                                              placeholder="Variant Name (e.g. Trail Mix)"
                                            />
                                            <input
                                              className="modern-form-input"
                                              style={{ fontSize: '11px', padding: '3px 6px', fontFamily: 'monospace' }}
                                              value={v.itemCode || v.code || ''}
                                              onChange={e => handleUpdateVariantField(idx, vIdx, 'itemCode', e.target.value)}
                                              placeholder="Item Code"
                                            />
                                            <input
                                              className="modern-form-input"
                                              style={{ fontSize: '11px', padding: '3px 6px', fontFamily: 'monospace' }}
                                              value={v.artworkCode || ''}
                                              onChange={e => handleUpdateVariantField(idx, vIdx, 'artworkCode', e.target.value)}
                                              placeholder="Artwork Code"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveVariant(idx, vIdx)}
                                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', textAlign: 'center' }}
                                              title="Remove Variant"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '10.5px', color: '#6ee7b7', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>✓</span>
                                      <span>Single Standard SKU configured. The specification will generate a single clean <strong>Artwork</strong> page (without "Variant 1 &mdash;" prefix).</span>
                                    </div>
                                  )}
                                </div>

                                {/* Code Clubbing & General Attributes */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '16px', background: 'rgba(6,42,48,0.5)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(20,184,166,0.2)' }}>
                                  <div style={{ gridColumn: 'span 2' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>🗂 Clubbed Item Codes (Variant Grouping)</label>
                                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>e.g. PM/PR/FLM/12691,87,86,88,89,12838 or comma-separated variant codes</span>
                                    </div>
                                    <input
                                      className="modern-form-input"
                                      style={{ width: '100%', fontSize: '11.5px', padding: '6px 10px', fontFamily: 'monospace', background: 'rgba(2,20,24,0.8)', borderColor: m.clubbedCodes ? '#38bdf8' : 'var(--border-color)', color: '#38bdf8' }}
                                      value={m.clubbedCodes || m.specSheet?.docHeader?.clubbedCodes || ''}
                                      onChange={e => handleClubbedCodesChange(idx, e.target.value)}
                                      placeholder="e.g. PM/PR/FLM/12691, 12687, 12686, 12688, 12689, 12838"
                                    />
                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '3px' }}>
                                      ℹ️ In Yoga Bar packaging standards, multiple product variants share the same physical substrate specification while retaining distinct artwork reference pages.
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--teal)', marginBottom: '4px' }}>Material Structure / Substrate</label>
                                    <input className="modern-form-input" style={{ width: '100%', fontSize: '11.5px', padding: '6px 10px', background: 'rgba(2,20,24,0.8)' }} value={m.specSheet?.general?.structure || ''} onChange={e => handleGeneralFieldChange(idx, 'structure', e.target.value)} placeholder="e.g. 5 PLY semi virgin Kraft paper or 18 µ Matt Bopp + 12 µ METPET + 40 µ PE" />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--teal)', marginBottom: '4px' }}>Style / Format Construct</label>
                                    <input className="modern-form-input" style={{ width: '100%', fontSize: '11.5px', padding: '6px 10px', background: 'rgba(2,20,24,0.8)' }} value={m.specSheet?.general?.style || ''} onChange={e => handleGeneralFieldChange(idx, 'style', e.target.value)} placeholder="e.g. RSC or Cylindrical Jar or Die punch Label in Roll Form" />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--teal)', marginBottom: '4px' }}>Print Colors</label>
                                    <input className="modern-form-input" style={{ width: '100%', fontSize: '11.5px', padding: '6px 10px', background: 'rgba(2,20,24,0.8)' }} value={m.specSheet?.general?.printColors || ''} onChange={e => handleGeneralFieldChange(idx, 'printColors', e.target.value)} placeholder="e.g. Green & Blue or As per approved AW" />
                                  </div>
                                </div>

                                {/* Parameters Table */}
                                <div style={{ marginBottom: '18px' }}>
                                  <div style={{ background: '#f8cbad', color: '#111827', padding: '7px 12px', fontWeight: 800, fontSize: '12px', textAlign: 'center', letterSpacing: '0.5px', borderRadius: '5px 5px 0 0', border: '1px solid #d1a485', borderBottom: 'none' }}>
                                    {m.specSheet?.sectionTitle || 'Technical Parameters Details'}
                                  </div>
                                  <div style={{ overflowX: 'auto', border: '1px solid #475569', borderRadius: '0 0 5px 5px', background: '#ffffff' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', color: '#111827' }}>
                                      <thead>
                                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                          <th style={{ padding: '6px 8px', width: '35px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>S.No.</th>
                                          <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#334155', minWidth: '160px' }}>Parameter</th>
                                          <th style={{ padding: '6px 8px', width: '70px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Units</th>
                                          <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 800, color: '#0f172a', background: '#e0f2fe', minWidth: '220px' }}>Standard / Target Value (Tolerance) *</th>
                                          <th style={{ padding: '6px 8px', width: '110px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Test Standard</th>
                                          <th style={{ padding: '6px 8px', width: '85px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Defect Type</th>
                                          <th style={{ padding: '6px 8px', width: '80px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Factory Check</th>
                                          <th style={{ padding: '6px 6px', width: '35px', textAlign: 'center' }}></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(m.specSheet?.parameters || []).map((p, pIdx) => (
                                          <tr key={pIdx} style={{ borderBottom: '1px solid #e2e8f0', background: pIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                            <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{p.sNo || pIdx + 1}</td>
                                            <td style={{ padding: '5px 10px', fontWeight: 600, color: '#1e293b' }}>
                                              <input type="text" style={{ width: '100%', border: '1px solid transparent', background: 'transparent', padding: '2px 4px', fontSize: '11px', fontWeight: 600, color: '#1e293b' }} value={p.parameter || ''} onChange={e => handleParamValueChange(idx, pIdx, 'parameter', e.target.value)} placeholder="Parameter name" />
                                            </td>
                                            <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                                              <input type="text" style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '3px', textAlign: 'center', padding: '2px 4px', fontSize: '10.5px' }} value={p.units || '-'} onChange={e => handleParamValueChange(idx, pIdx, 'units', e.target.value)} />
                                            </td>
                                            <td style={{ padding: '5px 10px', background: '#f0f9ff' }}>
                                              <input type="text" style={{ width: '100%', border: '1px solid #0284c7', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, color: '#0369a1', background: '#ffffff' }} value={p.standard || ''} onChange={e => handleParamValueChange(idx, pIdx, 'standard', e.target.value)} placeholder="e.g. 435x330x180mm± 5 ID or 75.2-83.1" />
                                            </td>
                                            <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                                              <input type="text" style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '3px', textAlign: 'center', padding: '2px 4px', fontSize: '10.5px' }} value={p.testStandard || 'NA'} onChange={e => handleParamValueChange(idx, pIdx, 'testStandard', e.target.value)} />
                                            </td>
                                            <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                                              <select style={{ padding: '2px 4px', borderRadius: '3px', fontSize: '10.5px', fontWeight: 700, border: '1px solid #cbd5e1', color: p.defectType === 'CR' ? '#b91c1c' : p.defectType === 'MJ' ? '#b45309' : '#0369a1' }} value={p.defectType || 'CR'} onChange={e => handleParamValueChange(idx, pIdx, 'defectType', e.target.value)}>
                                                <option value="CR">CR (Critical)</option>
                                                <option value="MJ">MJ (Major)</option>
                                                <option value="MI">MI (Minor)</option>
                                              </select>
                                            </td>
                                            <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                                              <select style={{ padding: '2px 4px', borderRadius: '3px', fontSize: '10.5px', border: '1px solid #cbd5e1' }} value={p.factoryCheck || 'Yes'} onChange={e => handleParamValueChange(idx, pIdx, 'factoryCheck', e.target.value)}>
                                                <option value="Yes">Yes</option>
                                                <option value="NA">NA</option>
                                                <option value="No">No</option>
                                              </select>
                                            </td>
                                            <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                                              <button type="button" onClick={() => handleDeleteParamRow(idx, pIdx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }} title="Remove Parameter">✕</button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                    <button type="button" onClick={() => handleAddParamRow(idx)} style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid #14b8a6', color: '#14b8a6', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                                      ＋ Add Custom Parameter
                                    </button>
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Parameters &amp; units strictly follow Yoga Bar quality &amp; engineering standards</span>
                                  </div>
                                </div>

                                {/* Artwork & References */}
                                <div style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.25)', borderRadius: '6px', padding: '12px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '14px' }}>🎨</span>
                                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Artwork Reference &amp; Variant Color Proofs</span>
                                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(236,72,153,0.2)', color: '#f472b6', fontFamily: 'monospace', fontWeight: 700 }}>{currentAwCode}</span>
                                    </div>
                                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Mandatory reference sheets for print proofs, Pantone swatches, and dieline specs</span>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>Upload Artwork Proof (PDF / Image)</label>
                                      <input type="file" accept="image/*,.pdf" onChange={e => handleArtworkUpload(idx, e.target.files[0])} style={{ width: '100%', fontSize: '11px', color: 'var(--text-dim)', padding: '4px 0' }} />
                                      <div style={{ marginTop: '4px' }}>
                                        <input className="modern-form-input" style={{ width: '100%', fontSize: '11px', padding: '4px 8px', background: 'rgba(2,20,24,0.8)' }} placeholder="Or paste artwork image URL..." value={m.artworkUrl || ''} onChange={e => handleMatChange(idx, 'artworkUrl', e.target.value)} />
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      {m.artworkUrl ? (
                                        (() => {
                                          const isPdf = m.artworkUrl.startsWith('data:application/pdf') ||
                                            m.artworkFileName?.toLowerCase().endsWith('.pdf') ||
                                            m.artworkUrl.toLowerCase().endsWith('.pdf');
                                          return isPdf ? (
                                            <div style={{ width: '64px', height: '64px', borderRadius: '4px', border: '1px solid #ef4444', overflow: 'hidden', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                              <span style={{ fontSize: '20px' }}>📄</span>
                                              <span style={{ fontSize: '8px', fontWeight: 900, color: '#ef4444' }}>PDF PROOF</span>
                                            </div>
                                          ) : (
                                            <div style={{ width: '64px', height: '64px', borderRadius: '4px', border: '1px solid rgba(236,72,153,0.5)', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <img src={m.artworkUrl} alt="Artwork" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            </div>
                                          );
                                        })()
                                      ) : (
                                        <div style={{ width: '64px', height: '64px', borderRadius: '4px', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', padding: '4px' }}>
                                          No Artwork Yet
                                        </div>
                                      )}
                                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                        {m.artworkUrl ? (
                                          <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Artwork Loaded</span>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveArtwork(idx)}
                                                style={{
                                                  background: 'transparent',
                                                  border: 'none',
                                                  color: '#ef4444',
                                                  cursor: 'pointer',
                                                  fontSize: '10px',
                                                  fontWeight: 700,
                                                  padding: '1px 4px'
                                                }}
                                                title="Remove this artwork"
                                              >
                                                🗑️ Remove
                                              </button>
                                            </div>
                                            {m.artworkFileName && (
                                              <div style={{ fontSize: '9.5px', color: 'var(--text-main)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {m.artworkFileName}
                                              </div>
                                            )}
                                            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)' }}>Included as dedicated Page 3+ in Yoga Bar spec export</div>
                                          </div>
                                        ) : (
                                          <div>Upload proof or enter URL to embed in specification sheets</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Sticky Footer Action Bar ── */}
        <div className="add-project-page-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? '⏳ Saving...' : editProject ? '💾 Save Changes' : '✨ Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
