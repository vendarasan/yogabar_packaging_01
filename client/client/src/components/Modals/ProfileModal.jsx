import React, { useState, useRef } from 'react';
import { updateMyProfile } from '../../api';
import { SHADOW_AVATAR } from '../../constants';

export default function ProfileModal({ user, onClose, onUserUpdated }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef(null);

  // File upload handler converting image to Data URL
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setError('Image file is too large (maximum 2.5 MB).');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be blank.');
      return;
    }
    if (!email.trim()) {
      setError('Email cannot be blank.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await updateMyProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        avatar: avatar.trim()
      });
      setSuccessMsg('Profile updated successfully!');
      if (onUserUpdated) {
        onUserUpdated(res.data.user);
      }
      setTimeout(() => {
        onClose();
      }, 850);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.error || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = user?.role === 'superadmin' 
    ? '👑 Super Admin' 
    : user?.role === 'admin' 
      ? '🛡 Admin' 
      : '⚡ Updater';

  const roleColor = user?.role === 'superadmin' 
    ? '#f87171' 
    : user?.role === 'admin' 
      ? '#c084fc' 
      : '#2dd4bf';

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={onClose}>
      <div 
        className="modal-box" 
        style={{ maxWidth: 480, width: '92%', borderRadius: 16, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(0, 212, 200, 0.08) 100%)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              👤 User Profile Setup
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Configure your personal details, contact number &amp; display photo
            </p>
          </div>
          <button 
            className="btn btn-ghost" 
            style={{ fontSize: '1.2rem', padding: '4px 8px', borderRadius: 8 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Modal Form — Stacked Vertically ("One Below The Other") */}
        <form onSubmit={handleSave} style={{ padding: '22px' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '9px 13px',
              borderRadius: 8,
              fontSize: '0.82rem',
              marginBottom: 16
            }}>
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(0, 230, 118, 0.15)',
              border: '1px solid #00e676',
              color: '#69f0ae',
              padding: '9px 13px',
              borderRadius: 8,
              fontSize: '0.82rem',
              marginBottom: 16
            }}>
              ✅ {successMsg}
            </div>
          )}

          {/* 1. DISPLAY PICTURE / AVATAR (ONE BELOW THE OTHER) */}
          <div style={{
            marginBottom: 20,
            padding: '16px',
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>
              Display Picture
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Avatar Preview (Shows Image OR Shadow Silhouette Image) */}
              <div 
                style={{
                  position: 'relative',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: avatar ? '3px solid var(--accent, #00d4c8)' : '2px dashed #475569',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                  cursor: 'pointer'
                }}
                onClick={() => fileInputRef.current?.click()}
                title="Click to upload picture"
              >
                <img
                  src={avatar || SHADOW_AVATAR}
                  alt={name || 'Shadow Avatar'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => { e.target.src = SHADOW_AVATAR; }}
                />
                {!avatar && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.6)',
                    fontSize: '9px',
                    textAlign: 'center',
                    padding: '2px 0',
                    color: '#94a3b8',
                    fontWeight: 600
                  }}>
                    UPLOAD
                  </div>
                )}
              </div>

              {/* Action Buttons: Upload & Remove */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}
                  >
                    <span>📁</span> Upload Picture
                  </button>

                  {avatar && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={handleRemoveAvatar}
                      style={{ fontSize: '11px', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                      title="Reset to default shadow image"
                    >
                      🗑 Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent, #00d4c8)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    {showUrlInput ? 'Hide Web URL Input' : 'Or paste an image URL'}
                  </button>
                </div>
              </div>
            </div>

            {/* Optional URL Input */}
            {showUrlInput && (
              <div style={{ marginTop: 12 }}>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatar}
                  onChange={e => setAvatar(e.target.value)}
                  style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                />
              </div>
            )}
          </div>

          {/* 2. NAME (ONE BELOW THE OTHER) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>
              Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full Name"
              required
              style={{ width: '100%' }}
            />
          </div>

          {/* 3. MOBILE NUMBER (ONE BELOW THE OTHER) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>
              Mobile Number 📞
            </label>
            <input
              type="tel"
              className="form-control"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              placeholder="+91 98765 43210"
              style={{ width: '100%' }}
            />
          </div>

          {/* 4. EMAIL ADDRESS (ONE BELOW THE OTHER) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>
              Email Address ✉ <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your.email@company.com"
              required
              style={{ width: '100%' }}
            />
          </div>

          {/* 5. ASSIGNED ROLE & TEAM (ONE BELOW THE OTHER) */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
              Assigned Role &amp; Team 🛡
            </label>
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontWeight: 700, color: roleColor }}>
                {roleLabel}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent, #00d4c8)', background: 'rgba(0, 212, 200, 0.12)', padding: '3px 10px', borderRadius: 12, fontWeight: 600 }}>
                {user?.title ? `${user.title} · ` : ''}{user?.team || 'Packaging'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ minWidth: 120 }}
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
