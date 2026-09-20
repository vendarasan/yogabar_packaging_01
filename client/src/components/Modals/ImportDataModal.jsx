import React, { useState } from 'react';
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Search,
  ArrowRight,
  X,
  AlertTriangle
} from 'lucide-react';
import { validateImport, commitImport } from '../../api';

const SAMPLE_TEMPLATE = [
  {
    "projectName": "Dark Chocolate Peanut Butter Bar 50g",
    "fgCode": "FG-PB-50G-NPD",
    "skuSize": "50g",
    "targetLaunchDate": "2026-11-30",
    "supplier": "Huhtamaki Packaging Ltd",
    "factory": "Bangalore Unit 1",
    "materials": [
      { "name": "Primary Cold Seal Wrapper", "type": "Pouch", "pmCode": "PM/PR/POU/50580" },
      { "name": "Display Monocarton", "type": "Monocarton", "pmCode": "PM/SE/MON/50581" }
    ]
  }
];

export default function ImportDataModal({ isOpen, onClose, onImportSuccess }) {
  const [jsonText, setJsonText] = useState(JSON.stringify(SAMPLE_TEMPLATE, null, 2));
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleValidate = async () => {
    setError('');
    setSuccessMessage('');
    setValidating(true);
    try {
      let records;
      try {
        records = JSON.parse(jsonText);
      } catch (parseErr) {
        throw new Error('Invalid JSON format. Please verify JSON array syntax.');
      }

      if (!Array.isArray(records)) {
        throw new Error('Payload must be a JSON array of project records.');
      }

      const res = await validateImport(records);
      setValidationResult(res.data?.result || null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Validation request failed');
      setValidationResult(null);
    } finally {
      setValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!validationResult || !validationResult.canCommit) return;
    setCommitting(true);
    setError('');
    try {
      const records = JSON.parse(jsonText);
      const res = await commitImport(records);
      setSuccessMessage(`Successfully ingested ${res.data?.result?.importedCount || 0} project(s)!`);
      if (onImportSuccess) onImportSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to commit import');
    } finally {
      setCommitting(false);
    }
  };

  const handleCopyTemplate = () => {
    setJsonText(JSON.stringify(SAMPLE_TEMPLATE, null, 2));
    setValidationResult(null);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        className="modal-content"
        style={{
          width: '780px',
          maxWidth: '95vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card-bg, #0B2529)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
          borderRadius: '14px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(0, 200, 215, 0.15)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            background: 'var(--bg-sidebar, #06171A)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(56, 201, 138, 0.14)',
                border: '1px solid rgba(56, 201, 138, 0.3)',
                color: 'var(--success, #38c98a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <UploadCloud size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-main, #F2F7F7)' }}>
                  Controlled Data Import
                </h3>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: 'rgba(56, 201, 138, 0.15)',
                    color: 'var(--success, #38c98a)',
                    border: '1px solid rgba(56, 201, 138, 0.3)'
                  }}
                >
                  Batch Ingestion
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-muted, #8ea6a9)' }}>
                Validate schema, PM codes, and launch dates before committing atomic batch insertion
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px', color: 'var(--text-muted)' }}
            title="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(240, 93, 108, 0.12)', border: '1px solid rgba(240, 93, 108, 0.3)', color: 'var(--danger)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} /> <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(56, 201, 138, 0.12)', border: '1px solid rgba(56, 201, 138, 0.3)', color: 'var(--success)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} /> <span>{successMessage}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Project Batch Records (JSON Array):</span>
            <button
              type="button"
              onClick={handleCopyTemplate}
              style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
            >
              <RotateCcw size={11} />
              <span>Reset to Sample Template</span>
            </button>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setValidationResult(null);
            }}
            rows={10}
            style={{
              width: '100%',
              background: 'rgba(4, 18, 20, 0.75)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11.5px',
              color: 'var(--text-main, #F2F7F7)',
              lineHeight: 1.5,
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none'
            }}
            placeholder="Paste JSON array here..."
          />

          {/* Validation Findings */}
          {validationResult && (
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(7, 26, 29, 0.7)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {validationResult.canCommit ? (
                    <CheckCircle2 size={16} color="var(--success, #38c98a)" />
                  ) : (
                    <AlertCircle size={16} color="var(--danger, #f05d6c)" />
                  )}
                  <span style={{ fontSize: '12px', fontWeight: '700', color: validationResult.canCommit ? 'var(--success, #38c98a)' : 'var(--danger, #f05d6c)' }}>
                    {validationResult.canCommit ? 'Validation Passed — Ready to Ingest' : 'Validation Failed — Resolve Errors'}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {validationResult.validCount} valid / {validationResult.invalidCount} invalid ({validationResult.totalRecords} total)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                {validationResult.validationResults.map((r, i) => (
                  <div key={i} style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.3)', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{r.projectName}</span>
                      <span style={{ fontSize: '9px', fontWeight: '700', color: r.isValid ? 'var(--success)' : 'var(--danger)' }}>
                        {r.isValid ? 'VALID' : 'INVALID'}
                      </span>
                    </div>
                    {r.errors.map((err, errIdx) => (
                      <div key={errIdx} style={{ color: 'var(--danger)', fontSize: '10.5px' }}>
                        • {err}
                      </div>
                    ))}
                    {r.warnings.map((warn, wIdx) => (
                      <div key={wIdx} style={{ color: 'var(--warning)', fontSize: '10.5px' }}>
                        • Warning: {warn}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            background: 'var(--bg-sidebar, #06171A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <button
            type="button"
            onClick={handleValidate}
            disabled={validating || committing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}
          >
            <Search size={13} />
            <span>{validating ? 'Validating...' : 'Dry-Run Validate'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '11.5px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={!validationResult?.canCommit || committing}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', padding: '6px 18px' }}
            >
              <span>{committing ? 'Ingesting...' : 'Commit Ingestion'}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
