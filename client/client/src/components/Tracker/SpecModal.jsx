import React, { useState, useEffect } from 'react';
import { getSpecFields } from '../../constants';
import { STAGE_COLORS, printCls } from '../../utils';

export default function SpecModal({ specData, onClose, onSave, canEdit }) {
  const [specs, setSpecs] = useState({});

  useEffect(() => {
    if (specData && specData.material) {
      setSpecs(specData.material.specs || {});
    }
  }, [specData]);

  if (!specData || !specData.material || !specData.project) return null;

  const { project, material, mIdx } = specData;
  const fields = getSpecFields(material.type);

  const handleFieldChange = (key, val) => {
    setSpecs(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    const cleaned = {};
    fields.forEach(f => {
      if (specs[f.k] && specs[f.k].trim()) {
        cleaned[f.k] = specs[f.k].trim();
      }
    });
    onSave(project.id, mIdx, cleaned);
  };

  const stage = material.stage || 'Brief';

  return (
    <div className="modal-overlay open">
      <div className="modal modal-md">
        <div className="modal-head">
          <div className="modal-title">📋 Specs — {material.name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'var(--navy-light)', borderRadius: '7px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px' }}>
              <span style={{ color: 'var(--white-dim)' }}>Type: <strong style={{ color: 'var(--teal)' }}>{material.type}</strong></span>
              <span style={{ color: 'var(--white-dim)' }}>Print: <strong className={printCls(material.printType || '')}>{material.printType || 'N/A'}</strong></span>
              <span style={{ color: 'var(--white-dim)' }}>
                Stage:{' '}
                <span className="stage-badge" style={{ background: `${STAGE_COLORS[stage]}18`, border: `1px solid ${STAGE_COLORS[stage]}40`, color: STAGE_COLORS[stage] }}>
                  <span className="stage-dot" style={{ background: STAGE_COLORS[stage] }}></span>{stage}
                </span>
              </span>
              <span style={{ color: 'var(--white-dim)' }}>
                Project: <strong>{project.projectName}</strong>{' '}
                {project.grammage && <span className="tag tag-cyan" style={{ marginLeft: '4px' }}>{project.grammage}</span>}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '12px' }}>
            {fields.map(f => (
              <div key={f.k} className="form-group">
                <label className="form-label">{f.l}</label>
                <input
                  className="form-input"
                  value={specs[f.k] || ''}
                  onChange={e => handleFieldChange(f.k, e.target.value)}
                  placeholder={f.p}
                  readOnly={!canEdit}
                  style={{ fontSize: '11px' }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {canEdit && (
            <button className="btn btn-primary" onClick={handleSave}>💾 Save Specifications</button>
          )}
        </div>
      </div>
    </div>
  );
}
