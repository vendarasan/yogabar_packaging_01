import React, { useState, useEffect } from 'react';
import { MAT_TYPES, PRINT_TYPES, DEFAULT_SPEC_FIELDS, getSpecFields } from '../../constants';
import { today } from '../../utils';

export default function AddProjectModal({ isOpen, onClose, onSave, editProject }) {
  const [fgCode, setFgCode] = useState('');
  const [projectName, setProjectName] = useState('');
  const [grammage, setGrammage] = useState('');
  const [briefDate, setBriefDate] = useState(today());
  const [targetLaunchDate, setTargetLaunchDate] = useState('');
  const [status, setStatus] = useState('On Track');
  const [risk, setRisk] = useState('Low');
  const [supplier, setSupplier] = useState('');
  const [factory, setFactory] = useState('');
  const [comments, setComments] = useState('');

  const [materials, setMaterials] = useState([
    { name: '', type: MAT_TYPES[0], printType: 'Not Applicable', specs: {} }
  ]);

  const [expandedSpecRows, setExpandedSpecRows] = useState({});

  useEffect(() => {
    if (editProject) {
      setFgCode(editProject.fgCode || '');
      setProjectName(editProject.projectName || '');
      setGrammage(editProject.grammage || '');
      setBriefDate(editProject.briefDate || today());
      setTargetLaunchDate(editProject.targetLaunchDate || '');
      setStatus(editProject.status || 'On Track');
      setRisk(editProject.risk || 'Low');
      setSupplier(editProject.supplier || '');
      setFactory(editProject.factory || '');
      setComments(editProject.comments || '');
      setMaterials(editProject.materials ? editProject.materials.map(m => ({
        name: m.name,
        type: m.type,
        printType: m.printType || 'Not Applicable',
        specs: m.specs || {}
      })) : [{ name: '', type: MAT_TYPES[0], printType: 'Not Applicable', specs: {} }]);
    } else {
      setFgCode('');
      setProjectName('');
      setGrammage('');
      setBriefDate(today());
      setTargetLaunchDate('');
      setStatus('On Track');
      setRisk('Low');
      setSupplier('');
      setFactory('');
      setComments('');
      setMaterials([{ name: '', type: MAT_TYPES[0], printType: 'Not Applicable', specs: {} }]);
      setExpandedSpecRows({});
    }
  }, [editProject, isOpen]);

  if (!isOpen) return null;

  const handleAddMaterialRow = () => {
    setMaterials(prev => [...prev, { name: '', type: MAT_TYPES[0], printType: 'Not Applicable', specs: {} }]);
  };

  const handleRemoveMaterialRow = (idx) => {
    if (materials.length <= 1) return;
    setMaterials(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMatChange = (idx, field, val) => {
    setMaterials(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleMatSpecChange = (mIdx, key, val) => {
    setMaterials(prev => {
      const copy = [...prev];
      const m = { ...copy[mIdx] };
      m.specs = { ...(m.specs || {}), [key]: val };
      copy[mIdx] = m;
      return copy;
    });
  };

  const toggleSpecRow = (idx) => {
    setExpandedSpecRows(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projectName.trim()) { alert('Project Name is required'); return; }
    if (!briefDate) { alert('Brief Date is required'); return; }

    const validMats = materials.filter(m => m.name.trim());
    if (!validMats.length) { alert('At least 1 material with a name is required'); return; }

    onSave({
      fgCode: fgCode.trim(),
      projectName: projectName.trim(),
      grammage: grammage.trim(),
      briefDate,
      targetLaunchDate: targetLaunchDate || null,
      status,
      risk,
      supplier: supplier.trim(),
      factory: factory.trim(),
      comments: comments.trim(),
      materials: validMats
    }, editProject ? editProject.id : null);
  };

  return (
    <div className="modal-overlay open">
      <div className="modal modal-lg">
        <div className="modal-head">
          <div className="modal-title">
            {editProject ? `✏ Edit Project — ${editProject.projectName}` : '📦 New Packaging Project'}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  className="form-input"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="e.g. Muesli Dark Choco 400g Pouch"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">FG / PM Item Code</label>
                <input
                  className="form-input"
                  value={fgCode}
                  onChange={e => setFgCode(e.target.value)}
                  placeholder="e.g. FG-89012345678"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Grammage / Pack Size</label>
                <input
                  className="form-input"
                  value={grammage}
                  onChange={e => setGrammage(e.target.value)}
                  placeholder="e.g. 400g, 1L, 500ml"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Brief Start Date *</label>
                <input
                  className="form-input"
                  type="date"
                  value={briefDate}
                  onChange={e => setBriefDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Launch Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={targetLaunchDate}
                  onChange={e => setTargetLaunchDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Project Status</label>
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                  <option>On Track</option>
                  <option>At Risk</option>
                  <option>Delayed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Risk Level</label>
                <select className="form-select" value={risk} onChange={e => setRisk(e.target.value)}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Primary Supplier</label>
                <input
                  className="form-input"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="e.g. Huhtamaki, Amcor, TBD"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Factory / DC</label>
                <input
                  className="form-input"
                  value={factory}
                  onChange={e => setFactory(e.target.value)}
                  placeholder="e.g. Hoskote Unit 1"
                />
              </div>
              <div className="form-group full">
                <label className="form-label">Comments / Notes</label>
                <textarea
                  className="form-textarea"
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="Any key project notes, constraints, or updates..."
                />
              </div>
            </div>

            {/* MATERIALS SECTION */}
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--teal)' }}>
                🧱 Packaging Materials ({materials.length})
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddMaterialRow}>
                ＋ Add Material
              </button>
            </div>

            <div className="mat-table-wrap">
              <table className="mat-table">
                <thead>
                  <tr>
                    <th style={{ width: '32px' }}>#</th>
                    <th>Material Name *</th>
                    <th style={{ width: '160px' }}>Material Type</th>
                    <th style={{ width: '140px' }}>Print Type</th>
                    <th style={{ width: '80px' }}>Specs</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, idx) => {
                    const isSpecOpen = !!expandedSpecRows[idx];
                    const specFields = getSpecFields(m.type);
                    const hasAnySpec = Object.keys(m.specs || {}).length > 0;

                    return (
                      <React.Fragment key={idx}>
                        <tr>
                          <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '10px' }}>{idx + 1}</td>
                          <td>
                            <input
                              className="form-input"
                              value={m.name}
                              onChange={e => handleMatChange(idx, 'name', e.target.value)}
                              placeholder="e.g. Primary Printed Film"
                              required
                            />
                          </td>
                          <td>
                            <select
                              className="form-select"
                              value={m.type}
                              onChange={e => handleMatChange(idx, 'type', e.target.value)}
                            >
                              {MAT_TYPES.map(t => (
                                <option key={t}>{t}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="form-select"
                              value={m.printType}
                              onChange={e => handleMatChange(idx, 'printType', e.target.value)}
                            >
                              {PRINT_TYPES.map(pt => (
                                <option key={pt}>{pt}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="spec-toggle-btn"
                              onClick={() => toggleSpecRow(idx)}
                            >
                              {isSpecOpen ? '▲ Hide' : hasAnySpec ? '📋 Specs ✓' : '+ Specs'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {materials.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRemoveMaterialRow(idx)}
                                style={{ padding: '2px 5px' }}
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* SPEC FIELDS EXPANDABLE ROW */}
                        {isSpecOpen && (
                          <tr className="spec-toggle-row">
                            <td colSpan="6">
                              <div className="spec-fields-inner">
                                <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                  Technical Specs for: {m.type}
                                </div>
                                <div className="spec-fields-grid">
                                  {specFields.map(f => (
                                    <div key={f.k} className="spec-field-item">
                                      <span className="spec-field-label">{f.l}</span>
                                      <input
                                        className="spec-field-input"
                                        value={m.specs?.[f.k] || ''}
                                        onChange={e => handleMatSpecChange(idx, f.k, e.target.value)}
                                        placeholder={f.p}
                                      />
                                    </div>
                                  ))}
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
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {editProject ? '💾 Save Changes' : '✨ Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
