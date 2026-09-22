import React, { useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Lightbulb,
  Users,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import { login, signup, forgotPassword, changePassword } from '../../api';
import PackagingSketches from './PackagingSketches';

export default function AuthScreen({ onLoginSuccess, showToast }) {
  const [view, setView] = useState('v-login');
  const [showPass, setShowPass] = useState({ l: false, s1: false, s2: false, cp1: false, cp2: false });
  const [rememberMe, setRememberMe] = useState(true);

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

  const handleLogin = async (customEmail = null, customPass = null) => {
    setLErr('');
    const emailToUse = customEmail || lEmail;
    const passToUse = customPass || lPass;

    if (!emailToUse || !passToUse) {
      setLErr('⚠ Please enter email and password.');
      return;
    }
    try {
      const res = await login(emailToUse, passToUse);
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
      if (showToast) showToast(`✅ Welcome, ${res.data.user.name}!`);
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
      if (showToast) showToast('🔒 Password updated successfully!');
      window.location.reload();
    } catch (err) {
      setCpErr(err.response?.data?.error || '⚠ Change password failed.');
    }
  };

  return (
    <div className="auth-page-root">
      {/* High-fidelity vector blueprint packaging background illustrations */}
      <PackagingSketches />

      {/* TOP HEADER BAR */}
      <header className="auth-top-header">
        <div className="auth-brand-logo-wrap">
          <img
            src="/yogabar-logo.png"
            alt="Yoga Bar"
            className="auth-header-logo-img"
            onError={(e) => {
              e.target.style.display = 'none';
              const fallback = e.target.nextElementSibling;
              if (fallback) fallback.style.display = 'block';
            }}
          />
          {/* Custom SVG brush script logo fallback */}
          <div className="auth-header-logo-fallback" style={{ display: 'none' }}>
            <span className="logo-brush-text">Yoga<span className="logo-brush-dot">Bar.</span></span>
          </div>
        </div>

        <div className="auth-header-nav-right">
          {view === 'v-login' && (
            <>
              <span className="auth-header-nav-text">New to PDMP?</span>
              <button
                type="button"
                className="auth-header-outline-btn"
                onClick={() => { setView('v-signup'); setLErr(''); setSErr(''); }}
              >
                Create an account
              </button>
            </>
          )}

          {view === 'v-signup' && (
            <>
              <span className="auth-header-nav-text">Already registered?</span>
              <button
                type="button"
                className="auth-header-outline-btn"
                onClick={() => { setView('v-login'); setLErr(''); setSErr(''); }}
              >
                Sign In
              </button>
            </>
          )}

          {(view === 'v-forgot' || view === 'v-chpass') && (
            <button
              type="button"
              className="auth-header-outline-btn"
              onClick={() => { setView('v-login'); setLErr(''); }}
            >
              ← Back to Sign In
            </button>
          )}
        </div>
      </header>

      {/* MAIN TWO-COLUMN WORKFLOW LAYOUT */}
      <main className="auth-main-body">
        {/* LEFT COLUMN: BRAND HERO & PLATFORM VALUE PROPOSITION */}
        <section className="auth-hero-section" aria-label="Platform Highlights">
          <div className="auth-hero-eyebrow">
            STREAMLINE • COLLABORATE • LAUNCH FASTER
          </div>

          <h1 className="auth-hero-title">
            Packaging Development<br />
            Management Platform
          </h1>

          <p className="auth-hero-desc">
            From brief to launch — one connected packaging workflow. Plan, develop, track, manage risk, and launch products with complete cross-functional governance.
          </p>

          {/* 4 Feature Badges in Row */}
          <div className="auth-features-row">
            <div className="auth-feature-item">
              <div className="auth-feature-circle-badge">
                <Lightbulb size={28} strokeWidth={2.2} />
              </div>
              <span className="auth-feature-label">Turn Ideas into Packaging</span>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-circle-badge">
                <Users size={28} strokeWidth={2.2} />
              </div>
              <span className="auth-feature-label">Work Better Together</span>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-circle-badge">
                <ShieldCheck size={28} strokeWidth={2.2} />
              </div>
              <span className="auth-feature-label">Reduce Risk &amp; Ensure Compliance</span>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-circle-badge">
                <BarChart3 size={28} strokeWidth={2.2} />
              </div>
              <span className="auth-feature-label">Bring Products to Market Faster</span>
            </div>
          </div>

          {/* Bottom Left Brand Anchor */}
          <div className="auth-brand-bottom-anchor">
            <div className="auth-anchor-content">
              <div className="auth-anchor-icon-row">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#008767">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
                </svg>
              </div>
              <div className="auth-anchor-text">
                <div>Better Packaging.</div>
                <div>Brighter Possibilities.</div>
              </div>
            </div>
            <div className="auth-anchor-underline-bar" />
          </div>
        </section>

        {/* RIGHT COLUMN: FLOATING PURE WHITE AUTH CARD */}
        <section className="auth-card-section" aria-label="Authentication Card">
          <div className="auth-card-floating">
            {/* VIEW 1: SIGN IN (DEFAULT MATCHING REFERENCE MOCKUP) */}
            {view === 'v-login' && (
              <div>
                <div className="auth-card-head">
                  <h2 className="auth-card-title">Welcome back</h2>
                  <p className="auth-card-subtitle">
                    Sign in to continue to your Packaging Development Management Platform.
                  </p>
                </div>

                <div className="auth-field-wrap">
                  <label className="auth-label" htmlFor="auth-email-input">Email Address</label>
                  <div className="auth-input-box">
                    <span className="auth-input-lead-icon" aria-hidden="true">
                      <Mail size={17} />
                    </span>
                    <input
                      id="auth-email-input"
                      className="auth-input"
                      type="text"
                      value={lEmail}
                      onChange={e => setLEmail(e.target.value)}
                      placeholder="admin"
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="auth-field-wrap" style={{ marginBottom: '12px' }}>
                  <label className="auth-label" htmlFor="auth-pass-input">Password</label>
                  <div className="auth-input-box">
                    <span className="auth-input-lead-icon" aria-hidden="true">
                      <Lock size={17} />
                    </span>
                    <input
                      id="auth-pass-input"
                      className="auth-input"
                      type={showPass.l ? 'text' : 'password'}
                      value={lPass}
                      onChange={e => setLPass(e.target.value)}
                      placeholder="••••••••••••"
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="auth-eye-toggle-btn"
                      onClick={() => toggleEye('l')}
                      aria-label={showPass.l ? 'Hide password' : 'Show password'}
                      title={showPass.l ? 'Hide password' : 'Show password'}
                    >
                      {showPass.l ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Helper Row: Remember me & Forgot password */}
                <div className="auth-options-row">
                  <label className="auth-remember-wrap">
                    <input
                      type="checkbox"
                      className="auth-remember-chk"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="auth-link-forgot"
                    onClick={() => { setView('v-forgot'); setLErr(''); setFpErr(''); }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Error Banner */}
                {lErr && (
                  <div className="auth-alert-error" role="alert">
                    <span>{lErr}</span>
                  </div>
                )}

                {/* Primary Sign In Button */}
                <button
                  type="button"
                  className="auth-btn-primary"
                  onClick={() => handleLogin()}
                >
                  <span>Sign In</span>
                  <ArrowRight size={17} />
                </button>

                {/* Agreement Policy Footer */}
                <p className="auth-legal-note">
                  By signing in, you agree to our{' '}
                  <a href="#terms" onClick={e => e.preventDefault()}>Terms of Service</a> and{' '}
                  <a href="#privacy" onClick={e => e.preventDefault()}>Privacy Policy</a>.
                </p>
              </div>
            )}

            {/* VIEW 2: SIGN UP */}
            {view === 'v-signup' && (
              <div>
                <div className="auth-card-head">
                  <h2 className="auth-card-title">Create an Account</h2>
                  <p className="auth-card-subtitle">
                    Register to join the Packaging Development Platform workspace.
                  </p>
                </div>

                <div className="auth-field-wrap">
                  <label className="auth-label">Full Name</label>
                  <div className="auth-input-box">
                    <span className="auth-input-lead-icon"><User size={17} /></span>
                    <input
                      className="auth-input"
                      type="text"
                      value={sName}
                      onChange={e => setSName(e.target.value)}
                      placeholder="e.g. Maya Sharma"
                    />
                  </div>
                </div>

                <div className="auth-field-wrap">
                  <label className="auth-label">Work Email</label>
                  <div className="auth-input-box">
                    <span className="auth-input-lead-icon"><Mail size={17} /></span>
                    <input
                      className="auth-input"
                      type="email"
                      value={sEmail}
                      onChange={e => setSEmail(e.target.value)}
                      placeholder="maya@company.com"
                    />
                  </div>
                </div>

                <div className="auth-field-wrap">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-box">
                    <span className="auth-input-lead-icon"><Lock size={17} /></span>
                    <input
                      className="auth-input"
                      type={showPass.s1 ? 'text' : 'password'}
                      value={sPass}
                      onChange={e => setSPass(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                    <button type="button" className="auth-eye-toggle-btn" onClick={() => toggleEye('s1')}>
                      {showPass.s1 ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="auth-field-wrap" style={{ marginBottom: '20px' }}>
                  <label className="auth-label">Confirm Password</label>
                  <div className="auth-input-box">
                    <span className="auth-input-lead-icon"><Lock size={17} /></span>
                    <input
                      className="auth-input"
                      type={showPass.s2 ? 'text' : 'password'}
                      value={sPass2}
                      onChange={e => setSPass2(e.target.value)}
                      placeholder="Confirm your password"
                    />
                    <button type="button" className="auth-eye-toggle-btn" onClick={() => toggleEye('s2')}>
                      {showPass.s2 ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {sErr && (
                  <div className="auth-alert-error" role="alert">
                    <span>{sErr}</span>
                  </div>
                )}

                <button
                  type="button"
                  className="auth-btn-primary"
                  onClick={handleSignup}
                >
                  <span>Create Account</span>
                  <ArrowRight size={17} />
                </button>

                <div className="auth-alt-action-row">
                  <span>Already have an account?</span>{' '}
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => { setView('v-login'); setSErr(''); }}
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 3: FORGOT PASSWORD */}
            {view === 'v-forgot' && (
              <div>
                <div className="auth-card-head">
                  <h2 className="auth-card-title">Reset Password</h2>
                  <p className="auth-card-subtitle">
                    Enter your registered email address to receive temporary credentials.
                  </p>
                </div>

                <div className="auth-field-wrap" style={{ marginBottom: '20px' }}>
                  <label className="auth-label">Email Address</label>
                  <div className="auth-input-box">
                    <span className="auth-input-lead-icon"><Mail size={17} /></span>
                    <input
                      className="auth-input"
                      type="email"
                      value={fpEmail}
                      onChange={e => setFpEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      onKeyDown={e => e.key === 'Enter' && handleForgotPass()}
                    />
                  </div>
                </div>

                {fpErr && (
                  <div className="auth-alert-error" role="alert">
                    <span>{fpErr}</span>
                  </div>
                )}

                {tempPass && (
                  <div className="auth-temp-pass-card">
                    <div className="auth-temp-pass-title">Temporary Access Password</div>
                    <div className="auth-temp-pass-code">{tempPass}</div>
                    <p className="auth-temp-pass-note">
                      Use this password to log in. You will be prompted to set a permanent password upon sign in.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  className="auth-btn-primary"
                  onClick={handleForgotPass}
                >
                  <span>Generate Temporary Password</span>
                  <ArrowRight size={17} />
                </button>

                <div className="auth-alt-action-row">
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => { setView('v-login'); setFpErr(''); setTempPass(''); }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 4: CHANGE PASSWORD */}
            {view === 'v-chpass' && (
              <div>
                <div className="auth-card-head">
                  <h2 className="auth-card-title">Update Password</h2>
                  <p className="auth-card-subtitle">
                    A secure password change is required before proceeding to your workspace.
                  </p>
                </div>

                <div className="auth-field-wrap">
                  <label className="auth-label">New Password</label>
                  <div className="auth-input-box">
                    <span className="auth-input-lead-icon"><Lock size={17} /></span>
                    <input
                      className="auth-input"
                      type={showPass.cp1 ? 'text' : 'password'}
                      value={cpPass}
                      onChange={e => setCpPass(e.target.value)}
                      placeholder="Minimum 8 characters"
                    />
                    <button type="button" className="auth-eye-toggle-btn" onClick={() => toggleEye('cp1')}>
                      {showPass.cp1 ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="auth-field-wrap" style={{ marginBottom: '20px' }}>
                  <label className="auth-label">Confirm New Password</label>
                  <div className="auth-input-box">
                    <span className="auth-input-lead-icon"><Lock size={17} /></span>
                    <input
                      className="auth-input"
                      type={showPass.cp2 ? 'text' : 'password'}
                      value={cpPass2}
                      onChange={e => setCpPass2(e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <button type="button" className="auth-eye-toggle-btn" onClick={() => toggleEye('cp2')}>
                      {showPass.cp2 ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {cpErr && (
                  <div className="auth-alert-error" role="alert">
                    <span>{cpErr}</span>
                  </div>
                )}

                <button
                  type="button"
                  className="auth-btn-primary"
                  onClick={handleChangePass}
                >
                  <span>Save Password &amp; Enter Platform</span>
                  <CheckCircle2 size={17} />
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
