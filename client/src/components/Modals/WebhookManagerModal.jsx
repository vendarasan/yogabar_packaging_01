import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Plus,
  Play,
  RefreshCw,
  Trash2,
  BookOpen,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Power,
  RotateCcw
} from 'lucide-react';
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  testWebhook,
  retryWebhookDelivery
} from '../../api';

const AVAILABLE_EVENTS = [
  'ProjectCreated',
  'StageChanged',
  'ArtworkApproved',
  'SpecSignedOff',
  'TaskCreated',
  'TaskBlocked',
  'RiskCreated',
  'ApprovalRequested'
];

export default function WebhookManagerModal({ isOpen, onClose }) {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Selected webhook for deliveries inspection
  const [selectedHook, setSelectedHook] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // New webhook form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formSecret, setFormSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState(['ProjectCreated', 'StageChanged', 'ArtworkApproved']);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadWebhooks();
    }
  }, [isOpen]);

  const loadWebhooks = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getWebhooks();
      setWebhooks(res.data?.webhooks || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHook = async (hook) => {
    setSelectedHook(hook);
    setLoadingDeliveries(true);
    try {
      const res = await getWebhookDeliveries(hook.id);
      setDeliveries(res.data?.deliveries || []);
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    if (!formName || !formUrl) return;
    setSubmitting(true);
    setError('');
    try {
      await createWebhook({
        name: formName,
        url: formUrl,
        secret: formSecret,
        events: selectedEvents
      });
      setSuccessMessage('Webhook created successfully!');
      setShowAddForm(false);
      setFormName('');
      setFormUrl('');
      setFormSecret('');
      loadWebhooks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create webhook');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (hook) => {
    try {
      await updateWebhook(hook.id, { isActive: !hook.isActive });
      setWebhooks(prev => prev.map(h => h.id === hook.id ? { ...h, isActive: !h.isActive } : h));
      if (selectedHook?.id === hook.id) {
        setSelectedHook({ ...selectedHook, isActive: !selectedHook.isActive });
      }
    } catch (err) {
      setError('Failed to toggle webhook status');
    }
  };

  const handleDeleteHook = async (hookId) => {
    if (!window.confirm('Delete this webhook subscription? Outbound event dispatch will immediately halt.')) return;
    try {
      await deleteWebhook(hookId);
      setWebhooks(prev => prev.filter(h => h.id !== hookId));
      if (selectedHook?.id === hookId) {
        setSelectedHook(null);
        setDeliveries([]);
      }
    } catch (err) {
      setError('Failed to delete webhook');
    }
  };

  const handleTestPing = async (hookId) => {
    try {
      const res = await testWebhook(hookId);
      setSuccessMessage(`Test ping delivered! HTTP Status: ${res.data?.delivery?.statusCode || 200}`);
      if (selectedHook?.id === hookId) handleSelectHook(selectedHook);
    } catch (err) {
      setError(err.response?.data?.error || 'Test ping failed');
    }
  };

  const handleRetryDelivery = async (deliveryId) => {
    try {
      await retryWebhookDelivery(deliveryId);
      setSuccessMessage('Manual retry initiated successfully!');
      if (selectedHook) handleSelectHook(selectedHook);
    } catch (err) {
      setError('Retry delivery failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        className="modal-content"
        style={{
          width: '980px',
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
                background: 'rgba(139, 92, 246, 0.14)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: 'var(--purple, #a78bfa)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Webhook size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-main, #F2F7F7)' }}>
                  Webhook &amp; Developer Integrations
                </h3>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: 'rgba(139, 92, 246, 0.15)',
                    color: 'var(--purple, #a78bfa)',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                  }}
                >
                  Event Platform
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-muted, #8ea6a9)' }}>
                Outbound event hooks with HMAC-SHA256 signature verification and automatic retry policies
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href="/api/v1/docs"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--teal)' }}
            >
              <BookOpen size={13} />
              <span>OpenAPI 3.0 Docs</span>
              <ExternalLink size={10} style={{ opacity: 0.7 }} />
            </a>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              style={{ padding: '6px', color: 'var(--text-muted)' }}
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body 2-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
          {/* Left Column: Subscriptions */}
          <div style={{ padding: '18px 22px', borderRight: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Registered Webhooks ({webhooks.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={12} />
                <span>{showAddForm ? 'Cancel' : 'Add Webhook'}</span>
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(240, 93, 108, 0.12)', border: '1px solid rgba(240, 93, 108, 0.3)', color: 'var(--danger)', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={14} /> <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(56, 201, 138, 0.12)', border: '1px solid rgba(56, 201, 138, 0.3)', color: 'var(--success)', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={14} /> <span>{successMessage}</span>
              </div>
            )}

            {/* Add Webhook Form */}
            {showAddForm && (
              <form onSubmit={handleCreateWebhook} style={{ padding: '14px', borderRadius: '10px', background: 'rgba(7, 26, 29, 0.7)', border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Register Outbound Endpoint</div>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '3px' }}>Subscriber Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. ERP Production Bus"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(4, 18, 20, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '11.5px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '3px' }}>HTTPS Endpoint URL</label>
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://api.yourdomain.com/webhooks"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(4, 18, 20, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '11.5px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '3px' }}>HMAC Secret Key (Optional)</label>
                  <input
                    type="text"
                    value={formSecret}
                    onChange={(e) => setFormSecret(e.target.value)}
                    placeholder="Shared secret for X-Signature-SHA256"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(4, 18, 20, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '11.5px', fontFamily: 'var(--font-mono, monospace)', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>Subscribed Events</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                    {AVAILABLE_EVENTS.map(ev => (
                      <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(ev)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedEvents([...selectedEvents, ev]);
                            else setSelectedEvents(selectedEvents.filter(x => x !== ev));
                          }}
                        />
                        <span>{ev}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', marginTop: '4px', fontSize: '11.5px', padding: '6px' }}
                >
                  {submitting ? 'Creating...' : 'Register Webhook'}
                </button>
              </form>
            )}

            {/* List */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--teal)' }} />
                <span>Loading webhooks...</span>
              </div>
            ) : webhooks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                No active webhooks configured. Click "+ Add Webhook" to register listeners.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {webhooks.map(hook => {
                  const isSelected = selectedHook?.id === hook.id;
                  return (
                    <div
                      key={hook.id}
                      onClick={() => handleSelectHook(hook)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(0, 212, 200, 0.08)' : 'rgba(7, 26, 29, 0.5)',
                        border: isSelected ? '1px solid var(--teal, #00d4c8)' : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: hook.isActive ? 'var(--success, #38c98a)' : '#64748b' }}></span>
                          <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)' }}>{hook.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestPing(hook.id);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}
                            title="Send test ping"
                          >
                            <Play size={9} />
                            <span>Ping</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(hook);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '10px' }}
                            title={hook.isActive ? 'Disable webhook' : 'Enable webhook'}
                          >
                            {hook.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHook(hook.id);
                            }}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 6px', color: 'var(--danger)' }}
                            title="Delete webhook"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {hook.url}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(hook.events || []).map(ev => (
                          <span key={ev} style={{ fontSize: '9px', fontWeight: '600', padding: '1px 5px', borderRadius: '3px', background: 'rgba(0, 0, 0, 0.3)', color: 'var(--text-secondary)' }}>
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Deliveries Log */}
          <div style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Delivery History {selectedHook ? `• ${selectedHook.name}` : ''}
              </span>
              {selectedHook && (
                <button
                  type="button"
                  onClick={() => handleSelectHook(selectedHook)}
                  style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={11} />
                  <span>Refresh Logs</span>
                </button>
              )}
            </div>

            {!selectedHook ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                Select a webhook on the left to inspect outbound delivery attempts, latency, and HTTP response logs.
              </div>
            ) : loadingDeliveries ? (
              <div style={{ textAlign: 'center', padding: '60px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--teal)' }} />
                <span>Loading delivery attempts...</span>
              </div>
            ) : deliveries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                Zero deliveries recorded for this webhook subscription yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {deliveries.map(d => {
                  const isSuccess = d.status === 'SUCCESS';
                  return (
                    <div
                      key={d.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(7, 26, 29, 0.5)',
                        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isSuccess ? 'rgba(56, 201, 138, 0.14)' : 'rgba(240, 93, 108, 0.14)',
                              color: isSuccess ? 'var(--success)' : 'var(--danger)',
                              border: `1px solid ${isSuccess ? 'rgba(56, 201, 138, 0.3)' : 'rgba(240, 93, 108, 0.3)'}`
                            }}
                          >
                            {d.status} ({d.statusCode || 'ERR'})
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)' }}>{d.eventType}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(d.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Duration: {d.durationMs}ms • Attempt #{d.attemptNumber}</span>
                        {!isSuccess && (
                          <button
                            type="button"
                            onClick={() => handleRetryDelivery(d.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            <RotateCcw size={9} />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>

                      {d.errorMessage && (
                        <div style={{ padding: '6px 8px', borderRadius: '4px', background: 'rgba(240, 93, 108, 0.1)', color: 'var(--danger)', fontSize: '10.5px', fontFamily: 'var(--font-mono, monospace)' }}>
                          {d.errorMessage}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 22px',
            borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            background: 'var(--bg-sidebar, #06171A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted, #8ea6a9)'
          }}
        >
          <span>Enterprise Event Dispatch • Exponential Backoff Retry System</span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '11px', padding: '5px 16px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
