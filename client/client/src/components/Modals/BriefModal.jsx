import React, { useState, useEffect } from 'react';

export default function BriefModal({ isOpen, project, onClose, onConfirm }) {
  const [briefDate, setBriefDate] = useState('');

  useEffect(() => {
    if (project) {
      setBriefDate(project.briefDate || '');
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const handleConfirm = () => {
    if (!briefDate) return;
    onConfirm(project.id, briefDate);
  };

  return (
    <div className="modal-overlay open">
      <div className="modal modal-sm">
        <div className="modal-head">
          <div className="modal-title">📅 Change Brief Date — {project.projectName}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="alert-warn" style={{ marginBottom: '14px' }}>
            ⚠️ Changing the Brief date will recalculate all future milestone dates and reset current stage history back to Brief!
          </div>
          <div className="form-group">
            <label className="form-label">New Brief Date</label>
            <input
              className="form-input"
              type="date"
              value={briefDate}
              onChange={e => setBriefDate(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm}>💾 Recalculate Milestones</button>
        </div>
      </div>
    </div>
  );
}
