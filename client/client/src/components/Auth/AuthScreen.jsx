import React, { useState } from 'react';
import { login, signup, forgotPassword, changePassword } from '../../api';
import { PRESET_USERS } from '../../constants';

export default function AuthScreen({ onLoginSuccess, showToast }) {
  const [view, setView] = useState('v-login');
  const [showPass, setShowPass] = useState({ l: false, s1: false, s2: false, cp1: false, cp2: false });
  const [demoFilter, setDemoFilter] = useState('all');

  // Form states
  const [lEmail, setLEmail] = useState('');
  const [lPass, setLPass] = useState('');
  const [lErr, setLErr] = useState('');

  const [sName, setSName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPass, setSPass] = useState('');
  const [sPass2, setSPass2] = useState('');
  const [sErr, setSErr] = useState('');

  const [fpEmail, setFpEmail] = useState('');
  const [fpErr, setFpErr] = useState('');
  const [tempPass, setTempPass] = useState('');

  const [cpPass, setCpPass] = useState('');
  const [cpPass2, setCpPass2] = useState('');
  const [cpErr, setCpErr] = useState('');

  const toggleEye = (key) => setShowPass(p => ({ ...p, [key]: !p[key] }));

  const handleLogin = async () => {
    setLErr('');
    if (!lEmail || !lPass) { setLErr('⚠ Please enter email and password.'); return; }
    try {
      const res = await login(lEmail, lPass);
      if (res.data.mustChangePw) {
        setView('v-chpass');
      } else {
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      setLErr(err.response?.data?.error || '⚠ Login failed.');
    }
  };

  const handleSignup = async () => {
    setSErr('');
    if (!sName || !sEmail || !sPass || !sPass2) { setSErr('⚠ Please fill all fields.'); return; }
    if (sPass.length < 6) { setSErr('⚠ Password must be at least 6 characters.'); return; }
    if (sPass !== sPass2) { setSErr('⚠ Passwords do not match.'); return; }
    try {
      const res = await signup(sName, sEmail, sPass, sPass2);
      onLoginSuccess(res.data.user);
      showToast(`✅ Welcome, ${res.data.user.name}!`);
    } catch (err) {
      setSErr(err.response?.data?.error || '⚠ Signup failed.');
    }
  };

  const handleForgotPass = async () => {
    setFpErr('');
    setTempPass('');
    if (!fpEmail) { setFpErr('⚠ Please enter your email.'); return; }
    try {
      const res = await forgotPassword(fpEmail);
      setTempPass(res.data.tempPassword);
    } catch (err) {
      setFpErr(err.response?.data?.error || '⚠ Password reset failed.');
    }
  };

  const handleChangePass = async () => {
    setCpErr('');
    if (!cpPass || !cpPass2) { setCpErr('⚠ Please fill both fields.'); return; }
    if (cpPass.length < 8) { setCpErr('⚠ Password must be at least 8 characters.'); return; }
    if (cpPass !== cpPass2) { setCpErr('⚠ Passwords do not match.'); return; }
    try {
      await changePassword(cpPass, cpPass2);
      showToast('🔒 Password updated successfully!');
      window.location.reload();
    } catch (err) {
      setCpErr(err.response?.data?.error || '⚠ Change password failed.');
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card landscape">
        <div className="auth-card-left">
          <div className="auth-logo-icon">📦</div>
          <div className="auth-title">PACKAGING DEVELOPMENT TRACKER</div>
          <div className="auth-sub">FMCG Packaging Team</div>
        </div>
        <div className="auth-card-right">
          <div className="auth-form-container">
        {/* LOGIN VIEW */}
        {view === 'v-login' && (
          <div className="auth-view active">
            <div className="auth-tab-row">
              <div className="auth-tab active">Sign In</div>
              <div className="auth-tab" onClick={() => setView('v-signup')}>Sign Up</div>
            </div>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="text"
                value={lEmail}
                onChange={e => setLEmail(e.target.value)}
                placeholder="Email or type: admin"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '4px' }}>
              <label className="form-label">Password</label>
              <div className="pass-wrap">
                <input
                  className="form-input"
                  type={showPass.l ? 'text' : 'password'}
                  value={lPass}
                  onChange={e => setLPass(e.target.value)}
                  placeholder="Enter your password"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button className="pass-eye" onClick={() => toggleEye('l')} type="button">
                  {showPass.l ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div className="auth-err">{lErr}</div>
            <button className="btn btn-primary" onClick={handleLogin} style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px', marginTop: '8px' }}>
              Sign In →
            </button>
            <div style={{ textAlign: 'center', marginTop: '10px', marginBottom: '4px' }}>
              <span className="auth-link" onClick={() => setView('v-forgot')}>Forgot password?</span>
            </div>
            <div style={{ marginTop: '6px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', overflow: 'hidden' }}>
              <div style={{ padding: '9px 12px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px' }}>🔐</span>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#334155', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Demo Credentials (11 Roles · Exact Team Structure)</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['all', 'superadmin', 'admin', 'updater'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setDemoFilter(cat)}
                      style={{
                        fontSize: '8.5px',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: demoFilter === cat ? '#0f172a' : 'rgba(0,0,0,0.06)',
                        color: demoFilter === cat ? '#fff' : '#64748b'
                      }}
                    >
                      {cat === 'all' ? `All (${PRESET_USERS.length})` : cat === 'superadmin' ? 'Super (1)' : cat === 'admin' ? 'Admins (2)' : `Updaters (${PRESET_USERS.filter(u => u.role === 'updater').length})`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ maxHeight: '185px', overflowY: 'auto' }}>
                {PRESET_USERS.filter(u => demoFilter === 'all' || u.role === demoFilter).map(acc => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => { setLEmail(acc.username); setLPass(acc.password); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.12s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    title={acc.authority}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>{acc.label}</span>
                        <span style={{ fontSize: '8.5px', fontWeight: '800', padding: '1px 5px', borderRadius: '3px', background: acc.badgeBg, color: acc.badgeColor, border: `1px solid ${acc.badgeColor}35` }}>
                          {acc.badge}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '9.5px', color: '#64748b', flexWrap: 'wrap' }}>
                        <span>🏢 {acc.department}</span>
                        <span style={{ fontFamily: 'monospace', color: '#0284c7' }}>PW: {acc.password}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: '700', flexShrink: 0 }}>↗ Fill</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SIGNUP VIEW */}
        {view === 'v-signup' && (
          <div className="auth-view active">
            <div className="auth-tab-row">
              <div className="auth-tab" onClick={() => setView('v-login')}>Sign In</div>
              <div className="auth-tab active">Sign Up</div>
            </div>
            <div className="form-grid" style={{ marginBottom: '6px', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" value={sName} onChange={e => setSName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={sEmail} onChange={e => setSEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="pass-wrap">
                  <input className="form-input" type={showPass.s1 ? 'text' : 'password'} value={sPass} onChange={e => setSPass(e.target.value)} placeholder="Min. 6 characters" />
                  <button className="pass-eye" onClick={() => toggleEye('s1')} type="button">{showPass.s1 ? '🙈' : '👁'}</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="pass-wrap">
                  <input className="form-input" type={showPass.s2 ? 'text' : 'password'} value={sPass2} onChange={e => setSPass2(e.target.value)} placeholder="Repeat password" onKeyDown={e => e.key === 'Enter' && handleSignup()} />
                  <button className="pass-eye" onClick={() => toggleEye('s2')} type="button">{showPass.s2 ? '🙈' : '👁'}</button>
                </div>
              </div>
            </div>
            <div className="auth-err">{sErr}</div>
            <button className="btn btn-primary" onClick={handleSignup} style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px' }}>
              Create Account →
            </button>
          </div>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {view === 'v-forgot' && (
          <div className="auth-view active">
            <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>🔑 Reset Password</div>
            <div style={{ fontSize: '11.5px', color: 'var(--white-dim)', marginBottom: '14px', lineHeight: '1.5' }}>Enter your email — we'll generate a temporary password.</div>
            <div className="form-group" style={{ marginBottom: '6px' }}>
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)} placeholder="yourname@company.com" onKeyDown={e => e.key === 'Enter' && handleForgotPass()} />
            </div>
            <div className="auth-err">{fpErr}</div>
            {tempPass && (
              <div>
                <div style={{ fontSize: '11.5px', color: 'var(--green)', marginBottom: '6px', fontWeight: '600' }}>✅ Temp password generated. Note it and sign in — you'll be prompted to change it.</div>
                <div className="temp-pass-box">{tempPass}</div>
              </div>
            )}
            <button className="btn btn-primary" onClick={handleForgotPass} style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px', marginTop: '8px' }}>
              Generate Temporary Password
            </button>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <span className="auth-link" onClick={() => setView('v-login')}>← Back to Sign In</span>
            </div>
          </div>
        )}

        {/* CHANGE PASSWORD VIEW */}
        {view === 'v-chpass' && (
          <div className="auth-view active">
            <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>🔒 Set New Password</div>
            <div className="alert-warn" style={{ marginBottom: '12px' }}>⚠ You are using a temporary or default password. Please set a new one to continue.</div>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label">New Password (min. 8 chars)</label>
              <div className="pass-wrap">
                <input className="form-input" type={showPass.cp1 ? 'text' : 'password'} value={cpPass} onChange={e => setCpPass(e.target.value)} placeholder="Choose a strong password" />
                <button className="pass-eye" onClick={() => toggleEye('cp1')} type="button">{showPass.cp1 ? '🙈' : '👁'}</button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '6px' }}>
              <label className="form-label">Confirm New Password</label>
              <div className="pass-wrap">
                <input className="form-input" type={showPass.cp2 ? 'text' : 'password'} value={cpPass2} onChange={e => setCpPass2(e.target.value)} placeholder="Repeat new password" onKeyDown={e => e.key === 'Enter' && handleChangePass()} />
                <button className="pass-eye" onClick={() => toggleEye('cp2')} type="button">{showPass.cp2 ? '🙈' : '👁'}</button>
              </div>
            </div>
            <div className="auth-err">{cpErr}</div>
            <button className="btn btn-primary" onClick={handleChangePass} style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px', marginTop: '8px' }}>
              Set Password & Continue →
            </button>
          </div>
        )}

          </div>
        </div>
      </div>
    </div>
  );
}
