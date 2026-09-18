import React, { useState } from 'react';
import { Rocket } from 'lucide-react';
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
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Rocket size={16} color="var(--info)" /> Launch Project — {project.projectName}
          </div>
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
          <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={handleConfirm}>
            <Rocket size={14} /> Confirm Launch
          </button>
        </div>
      </div>
    </div>
  );
}
