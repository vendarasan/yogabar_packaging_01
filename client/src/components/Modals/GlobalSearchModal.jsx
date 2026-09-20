import React, { useState, useEffect, useRef } from 'react';
import { Search, Folder, Package, CheckSquare, AlertTriangle, FileText, User, X, ArrowRight } from 'lucide-react';
import { globalSearch } from '../../api';

export default function GlobalSearchModal({ isOpen, onClose, onOpenProject, onNavigateTab }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await globalSearch(query.trim());
        if (res.data?.success) {
          setResults(res.data.results);
        }
      } catch (err) {
        console.warn('Search error:', err.message);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Global escape key listener
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalMatches = results
    ? (results.projects?.length || 0) +
      (results.materials?.length || 0) +
      (results.tasks?.length || 0) +
      (results.risks?.length || 0) +
      (results.specs?.length || 0) +
      (results.users?.length || 0)
    : 0;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200, alignItems: 'flex-start', paddingTop: '8vh' }} onClick={onClose}>
      <div
        className="modal-content"
        style={{
          width: '680px',
          maxWidth: '95vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          background: 'var(--bg-card)',
          borderRadius: '10px'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <Search size={20} style={{ color: 'var(--teal)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, packaging materials, PM codes, tasks, risks, specs, users..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '15px'
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          )}
          <span style={{
            fontSize: '11px',
            background: 'var(--border-color)',
            color: 'var(--text-secondary)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            ESC
          </span>
        </div>

        {/* Results Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Searching enterprise index...</div>
          )}

          {!loading && results && totalMatches === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No items matching "{query}". Try searching a PM code, SKU name, or owner.
            </div>
          )}

          {!loading && !results && (
            <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Instant Enterprise Search</div>
              <p style={{ margin: 0 }}>Quickly jump to any project, component material, active task action, open risk register item, specification template, or team member.</p>
            </div>
          )}

          {!loading && results && totalMatches > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Projects */}
              {results.projects?.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Folder size={12} style={{ color: 'var(--teal)' }} /> Projects ({results.projects.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {results.projects.map(p => (
                      <div
                        key={p.id}
                        onClick={() => { onOpenProject(p.id); onClose(); }}
                        style={{
                          padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,176,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.projectName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ID: {p.id} • FG: {p.fgCode || 'TBD'} • Stage: {p.stage} • Supplier: {p.supplier}</div>
                        </div>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Materials & PM Codes */}
              {results.materials?.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Package size={12} style={{ color: '#ff6d00' }} /> Packaging Materials & PM Codes ({results.materials.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {results.materials.map(m => (
                      <div
                        key={m.id}
                        onClick={() => { onOpenProject(m.projectId); onClose(); }}
                        style={{
                          padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,176,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {m.materialName} <span style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 500 }}>({m.pmCode || 'No PM Code'})</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Project: {m.projectName} • Type: {m.type} • AW Code: {m.artworkCode || 'None'} • Stage: {m.stage}
                          </div>
                        </div>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {results.tasks?.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CheckSquare size={12} style={{ color: '#00e676' }} /> Tasks & Actions ({results.tasks.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {results.tasks.map(t => (
                      <div
                        key={t.id}
                        onClick={() => { onOpenProject(t.projectId); onClose(); }}
                        style={{
                          padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,176,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Priority: {t.priority} • Status: {t.status} • Assigned: {t.assignedTo || 'Unassigned'} • Due: {t.dueDate || 'No due date'}
                          </div>
                        </div>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks */}
              {results.risks?.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AlertTriangle size={12} style={{ color: '#ef4444' }} /> Risks ({results.risks.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {results.risks.map(r => (
                      <div
                        key={r.id}
                        onClick={() => { onOpenProject(r.projectId); onClose(); }}
                        style={{
                          padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,176,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Severity: {r.severity} • Owner: {r.owner} • Stage: {r.stage} • Action: {r.action || 'None'}
                          </div>
                        </div>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Specs */}
              {results.specs?.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FileText size={12} style={{ color: 'var(--teal)' }} /> Specifications ({results.specs.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {results.specs.map(s => (
                      <div
                        key={s.id}
                        onClick={() => { if (onNavigateTab) onNavigateTab('specs'); onClose(); }}
                        style={{
                          padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,176,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.specName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Item Code: {s.itemCode || 'None'} • Category: {s.category} • Revision: Rev {s.revision}
                          </div>
                        </div>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Users */}
              {results.users?.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <User size={12} style={{ color: '#e040fb' }} /> Team Members ({results.users.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {results.users.map(u => (
                      <div
                        key={u.email}
                        style={{
                          padding: '8px 12px', borderRadius: '6px',
                          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                          display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                      >
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          background: u.color || 'var(--teal)', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600
                        }}>
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{u.email} • {u.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
