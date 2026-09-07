import React, { useState } from 'react';
import { today } from '../../utils';

export default function LaunchModal({ isOpen, project, onClose, onConfirm }) {
  const [date, setDate] = useState(today());

  if (!isOpen || !project) return null;

  const handleConfirm = () => {
    onConfirm(project.id, date);
  };

  return (
    <div className="modal-overlay open">
      <div className="modal modal-sm">
        <div className="modal-head">
          <div className="modal-title">🚀 Launch Project — {project.projectName}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: '12px', color: 'var(--white-dim)', marginBottom: '14px', lineHeight: '1.5' }}>
            All materials have completed Connectivity stage! Confirm the commercial launch date for this project:
          </div>
          <div className="form-group">
            <label className="form-label">Actual Market Launch Date</label>
            <input
              className="form-input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-launch" onClick={handleConfirm}>🚀 Confirm Launch</button>
        </div>
      </div>
    </div>
  );
}
