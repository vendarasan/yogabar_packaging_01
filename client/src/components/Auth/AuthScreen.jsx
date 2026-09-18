import React, { useState } from 'react';
import {
  Package,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Layers,
  Lock,
  Mail,
  User,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { login, signup, forgotPassword, changePassword } from '../../api';
import { PRESET_USERS } from '../../constants';

export default function AuthScreen({ onLoginSuccess, showToast }) {
  const [view, setView] = useState('v-login');
  const [showPass, setShowPass] = useState({ l: false, s1: false, s2: false, cp1: false, cp2: false });
  const [demoFilter, setDemoFilter] = useState('all');
  const [rememberMe, setRememberMe] = useState(true);
  const [showDemoDrawer, setShowDemoDrawer] = useState(true);

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
      <div className="auth-split-layout">
        {/* BRAND EXPERIENCE PANEL (LEFT) */}
        <aside className="auth-brand-panel" aria-label="Brand Overview">
          <div className="auth-brand-glow" aria-hidden="true" />
          <div className="auth-brand-content">
            <div className="auth-brand-header">
              <img
                src="/yogabar-logo.png"
                alt="Yogabars"
                className="auth-brand-logo-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.nextElementSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="auth-brand-fallback-icon" style={{ display: 'none' }} aria-hidden="true">
                <Package size={20} />
              </div>
              <div className="auth-brand-meta">
                <span className="auth-brand-badge">
                  <Sparkles size={11} /> Enterprise Packaging OS
                </span>
                <span className="auth-brand-platform-title">Management Platform</span>
              </div>
            </div>

            <h1 className="auth-brand-headline">
              Packaging Development<br />Management Platform
            </h1>
            <p className="auth-brand-tagline">
              From Brief to Launch — One Connected Packaging Workflow. Plan, develop, track, manage risk, and launch products with complete cross-functional governance.
            </p>

            {/* Packaging Workflow Graphic (5 Stages) */}
            <div className="auth-workflow-card" aria-label="Packaging Development Workflow">
              <div className="auth-workflow-header">
                <div className="auth-workflow-title">
                  <Layers size={14} /> Packaging Lifecycle Gates
                </div>
                <span className="auth-step-pill">5 Core Gates</span>
              </div>

              <div className="auth-workflow-stages">
                <div className="auth-workflow-track-line" aria-hidden="true" />

                {/* Gate 1 */}
                <div className="auth-workflow-step">
                  <div className="auth-step-dot completed" aria-hidden="true">
                    <CheckCircle2 size={11} color="#071A1D" strokeWidth={3} />
                  </div>
                  <div className="auth-step-body">
                    <div className="auth-step-label-row">
                      <span className="auth-step-label">01. Brief & Initiation</span>
                      <span className="auth-step-pill">Kickoff</span>
                    </div>
                    <div className="auth-step-desc">Commercial mandate, SKU scoping & target timeline</div>
                  </div>
                </div>

                {/* Gate 2 */}
                <div className="auth-workflow-step">
                  <div className="auth-step-dot completed" aria-hidden="true">
                    <CheckCircle2 size={11} color="#071A1D" strokeWidth={3} />
                  </div>
                  <div className="auth-step-body">
                    <div className="auth-step-label-row">
                      <span className="auth-step-label">02. Engineering & Specs</span>
                      <span className="auth-step-pill">Specs Hub</span>
                    </div>
                    <div className="auth-step-desc">Die-lines, substrates, barrier properties & specs approval</div>
                  </div>
                </div>

                {/* Gate 3 */}
                <div className="auth-workflow-step">
                  <div className="auth-step-dot completed" aria-hidden="true">
                    <CheckCircle2 size={11} color="#071A1D" strokeWidth={3} />
                  </div>
                  <div className="auth-step-body">
                    <div className="auth-step-label-row">
                      <span className="auth-step-label">03. Digital Artwork</span>
                      <span className="auth-step-pill">Review</span>
                    </div>
                    <div className="auth-step-desc">Pre-press proofs, FSSAI/Legal text & multi-stakeholder sign-off</div>
                  </div>
                </div>

                {/* Gate 4 */}
                <div className="auth-workflow-step">
                  <div className="auth-step-dot completed" aria-hidden="true">
                    <CheckCircle2 size={11} color="#071A1D" strokeWidth={3} />
                  </div>
                  <div className="auth-step-body">
                    <div className="auth-step-label-row">
                      <span className="auth-step-label">04. Plant Trials & Production</span>
                      <span className="auth-step-pill">QC Gate</span>
                    </div>
                    <div className="auth-step-desc">Cylinder readiness, line trials & converter batch verification</div>
                  </div>
                </div>

                {/* Gate 5 */}
                <div className="auth-workflow-step">
                  <div className="auth-step-dot" aria-hidden="true">
                    <div className="auth-step-dot-inner" />
                  </div>
                  <div className="auth-step-body">
                    <div className="auth-step-label-row">
                      <span className="auth-step-label">05. Commercial Launch</span>
                      <span className="auth-step-pill" style={{ borderColor: 'rgba(56, 201, 138, 0.4)', color: 'var(--success)', background: 'rgba(56, 201, 138, 0.12)' }}>Final Sign-Off</span>
                    </div>
                    <div className="auth-step-desc">Commercial rollout, post-launch audit & specification archiving</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-brand-footer">
            <div className="auth-trust-badge">
              <ShieldCheck size={14} color="var(--teal)" />
              <span>Role-Based Governance (RACI)</span>
            </div>
            <div className="auth-trust-badge">
              <Sparkles size={13} color="var(--success)" />
              <span>100% Audit Tracked</span>
            </div>
          </div>
        </aside>

        {/* LOGIN FORM PANEL (RIGHT) */}
        <main className="auth-form-panel" aria-label="Authentication Panel">
          <div className="auth-form-wrapper">
            <div className="auth-card-enterprise">
              {/* LOGIN VIEW */}
              {view === 'v-login' && (
                <div>
                  <div className="auth-header-block">
                    <h2 className="auth-card-title">Welcome back</h2>
                    <p className="auth-card-subtitle">Sign in to continue to your Packaging Development Platform.</p>
                  </div>

                  <div className="auth-tab-bar" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected="true"
                      className="auth-tab-btn active"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected="false"
                      className="auth-tab-btn"
                      onClick={() => setView('v-signup')}
                    >
                      Sign Up
                    </button>
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-field-label" htmlFor="auth-login-email">Email Address</label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon" aria-hidden="true"><Mail size={16} /></span>
                      <input
                        id="auth-login-email"
                        className="auth-text-input"
                        type="text"
                        value={lEmail}
                        onChange={e => setLEmail(e.target.value)}
                        placeholder="Email or type: admin"
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="auth-field-group" style={{ marginBottom: '8px' }}>
                    <label className="auth-field-label" htmlFor="auth-login-password">Password</label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon" aria-hidden="true"><Lock size={16} /></span>
                      <input
                        id="auth-login-password"
                        className="auth-text-input has-eye"
                        type={showPass.l ? 'text' : 'password'}
                        value={lPass}
                        onChange={e => setLPass(e.target.value)}
                        placeholder="Enter your password"
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        autoComplete="current-password"
                      />
                      <button
                        className="auth-eye-btn"
                        onClick={() => toggleEye('l')}
                        type="button"
                        aria-label={showPass.l ? 'Hide password' : 'Show password'}
                        title={showPass.l ? 'Hide password' : 'Show password'}
                      >
                        {showPass.l ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="auth-helper-row">
                    <label className="auth-remember-label">
                      <input
                        type="checkbox"
                        className="auth-remember-checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                      />
                      <span>Remember me</span>
                    </label>
                    <span
                      className="auth-forgot-link"
                      onClick={() => setView('v-forgot')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setView('v-forgot')}
                    >
                      Forgot password?
                    </span>
                  </div>

                  {lErr && (
                    <div className="auth-error-banner" role="alert">
                      <span>{lErr}</span>
                    </div>
                  )}

                  <button
                    className="auth-submit-btn"
                    onClick={handleLogin}
                    type="button"
                  >
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </button>

                  {/* PRESET USERS (DEMO CREDENTIALS DRAWER) */}
                  <div className="auth-demo-drawer">
                    <div
                      className="auth-demo-toggle-bar"
                      onClick={() => setShowDemoDrawer(!showDemoDrawer)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setShowDemoDrawer(!showDemoDrawer)}
                      aria-expanded={showDemoDrawer}
                      aria-label="Toggle Demo Credentials Selector"
                    >
                      <div className="auth-demo-toggle-title">
                        <KeyRound size={13} color="var(--teal)" />
                        <span>Role Quick-Fill (11 Designated Team Presets)</span>
                      </div>
                      {showDemoDrawer ? (
                        <ChevronUp size={14} color="var(--text-muted)" />
                      ) : (
                        <ChevronDown size={14} color="var(--text-muted)" />
                      )}
                    </div>

                    {showDemoDrawer && (
                      <>
                        <div className="auth-demo-filter-row" role="group" aria-label="Filter Demo Roles">
                          {['all', 'superadmin', 'admin', 'updater'].map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setDemoFilter(cat)}
                              className={`auth-filter-pill ${demoFilter === cat ? 'active' : ''}`}
                            >
                              {cat === 'all'
                                ? `All (${PRESET_USERS.length})`
                                : cat === 'superadmin'
                                ? 'Super (1)'
                                : cat === 'admin'
                                ? 'Admins (2)'
                                : `Updaters (${PRESET_USERS.filter(u => u.role === 'updater').length})`}
                            </button>
                          ))}
                        </div>

                        <div className="auth-demo-list" tabIndex={0} aria-label="Demo Users List">
                          {PRESET_USERS.filter(u => demoFilter === 'all' || u.role === demoFilter).map(acc => (
                            <button
                              key={acc.username}
                              type="button"
                              onClick={() => { setLEmail(acc.username); setLPass(acc.password); }}
                              className="auth-demo-item"
                              title={acc.authority}
                            >
                              <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                  <span className="auth-demo-name">{acc.label}</span>
                                  <span
                                    style={{
                                      fontSize: '8.5px',
                                      fontWeight: '800',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      background: acc.badgeBg,
                                      color: acc.badgeColor,
                                      border: `1px solid ${acc.badgeColor}35`
                                    }}
                                  >
                                    {acc.badge}
                                  </span>
                                </div>
                                <div className="auth-demo-meta">
                                  <span>🏢 {acc.department}</span>
                                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)' }}>PW: {acc.password}</span>
                                </div>
                              </div>
                              <span className="auth-demo-fill-btn">
                                Fill ↗
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* SIGNUP VIEW */}
              {view === 'v-signup' && (
                <div>
                  <div className="auth-header-block">
                    <h2 className="auth-card-title">Create an Account</h2>
                    <p className="auth-card-subtitle">Register to join the Packaging Development Platform workspace.</p>
                  </div>

                  <div className="auth-tab-bar" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected="false"
                      className="auth-tab-btn"
                      onClick={() => setView('v-login')}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected="true"
                      className="auth-tab-btn active"
                    >
                      Sign Up
                    </button>
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-field-label" htmlFor="auth-signup-name">Full Name</label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon" aria-hidden="true"><User size={16} /></span>
                      <input
                        id="auth-signup-name"
                        className="auth-text-input"
                        type="text"
                        value={sName}
                        onChange={e => setSName(e.target.value)}
                        placeholder="Your full name"
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-field-label" htmlFor="auth-signup-email">Work Email</label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon" aria-hidden="true"><Mail size={16} /></span>
                      <input
                        id="auth-signup-email"
                        className="auth-text-input"
                        type="email"
                        value={sEmail}
                        onChange={e => setSEmail(e.target.value)}
                        placeholder="you@company.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-field-label" htmlFor="auth-signup-pass1">Password</label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon" aria-hidden="true"><Lock size={16} /></span>
                      <input
                        id="auth-signup-pass1"
                        className="auth-text-input has-eye"
                        type={showPass.s1 ? 'text' : 'password'}
                        value={sPass}
                        onChange={e => setSPass(e.target.value)}
                        placeholder="Min. 6 characters"
                        autoComplete="new-password"
                      />
                      <button
                        className="auth-eye-btn"
                        onClick={() => toggleEye('s1')}
                        type="button"
                        aria-label={showPass.s1 ? 'Hide password' : 'Show password'}
                      >
                        {showPass.s1 ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-field-label" htmlFor="auth-signup-pass2">Confirm Password</label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon" aria-hidden="true"><Lock size={16} /></span>
                      <input
                        id="auth-signup-pass2"
                        className="auth-text-input has-eye"
                        type={showPass.s2 ? 'text' : 'password'}
                        value={sPass2}
                        onChange={e => setSPass2(e.target.value)}
                        placeholder="Repeat password"
                        onKeyDown={e => e.key === 'Enter' && handleSignup()}
                        autoComplete="new-password"
                      />
                      <button
                        className="auth-eye-btn"
                        onClick={() => toggleEye('s2')}
                        type="button"
                        aria-label={showPass.s2 ? 'Hide password' : 'Show password'}
                      >
                        {showPass.s2 ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {sErr && (
                    <div className="auth-error-banner" role="alert">
                      <span>{sErr}</span>
                    </div>
                  )}

                  <button
                    className="auth-submit-btn"
                    onClick={handleSignup}
                    type="button"
                    style={{ marginTop: '8px' }}
                  >
                    <span>Create Account</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* FORGOT PASSWORD VIEW */}
              {view === 'v-forgot' && (
                <div>
                  <div className="auth-header-block">
                    <h2 className="auth-card-title">Reset Password</h2>
                    <p className="auth-card-subtitle">Enter your registered email address to receive a temporary password.</p>
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-field-label" htmlFor="auth-fp-email">Email Address</label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon" aria-hidden="true"><Mail size={16} /></span>
                      <input
                        id="auth-fp-email"
                        className="auth-text-input"
                        type="email"
                        value={fpEmail}
                        onChange={e => setFpEmail(e.target.value)}
                        placeholder="yourname@company.com"
                        onKeyDown={e => e.key === 'Enter' && handleForgotPass()}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {fpErr && (
                    <div className="auth-error-banner" role="alert">
                      <span>{fpErr}</span>
                    </div>
                  )}

                  {tempPass && (
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--success)', marginBottom: '6px', fontWeight: '600' }}>
                        ✅ Temporary password generated. Use it to sign in below:
                      </div>
                      <div className="auth-temp-pass-display">{tempPass}</div>
                    </div>
                  )}

                  <button
                    className="auth-submit-btn"
                    onClick={handleForgotPass}
                    type="button"
                    style={{ marginTop: '8px' }}
                  >
                    <span>Generate Temporary Password</span>
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <span
                      className="auth-back-link"
                      onClick={() => setView('v-login')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setView('v-login')}
                    >
                      ← Back to Sign In
                    </span>
                  </div>
                </div>
              )}

              {/* CHANGE PASSWORD VIEW */}
              {view === 'v-chpass' && (
                <div>
                  <div className="auth-header-block">
                    <h2 className="auth-card-title">Set New Password</h2>
                    <p className="auth-card-subtitle">You are using a temporary or default password. Please update your password to continue.</p>
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-field-label" htmlFor="auth-cp-pass1">New Password (min. 8 chars)</label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon" aria-hidden="true"><Lock size={16} /></span>
                      <input
                        id="auth-cp-pass1"
                        className="auth-text-input has-eye"
                        type={showPass.cp1 ? 'text' : 'password'}
                        value={cpPass}
                        onChange={e => setCpPass(e.target.value)}
                        placeholder="Choose a strong password"
                        autoComplete="new-password"
                      />
                      <button
                        className="auth-eye-btn"
                        onClick={() => toggleEye('cp1')}
                        type="button"
                        aria-label={showPass.cp1 ? 'Hide password' : 'Show password'}
                      >
                        {showPass.cp1 ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-field-label" htmlFor="auth-cp-pass2">Confirm New Password</label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon" aria-hidden="true"><Lock size={16} /></span>
                      <input
                        id="auth-cp-pass2"
                        className="auth-text-input has-eye"
                        type={showPass.cp2 ? 'text' : 'password'}
                        value={cpPass2}
                        onChange={e => setCpPass2(e.target.value)}
                        placeholder="Repeat new password"
                        onKeyDown={e => e.key === 'Enter' && handleChangePass()}
                        autoComplete="new-password"
                      />
                      <button
                        className="auth-eye-btn"
                        onClick={() => toggleEye('cp2')}
                        type="button"
                        aria-label={showPass.cp2 ? 'Hide password' : 'Show password'}
                      >
                        {showPass.cp2 ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {cpErr && (
                    <div className="auth-error-banner" role="alert">
                      <span>{cpErr}</span>
                    </div>
                  )}

                  <button
                    className="auth-submit-btn"
                    onClick={handleChangePass}
                    type="button"
                    style={{ marginTop: '8px' }}
                  >
                    <span>Set Password & Continue</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
