import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'
import './AuthModal.css'

export default function AuthModal({ mode: initialMode, onClose }) {
  const [mode, setMode] = useState(initialMode || 'login') // 'login' | 'signup' | 'forgot'
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const { login, register } = useAuth()
  const navigate = useNavigate()

  // ── Forgot Password / 6-Digit OTP State ──
  const [forgotStep, setForgotStep] = useState(1) // 1: Email, 2: OTP, 3: New Password
  const [forgotEmail, setForgotEmail] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [activeOtpPopup, setActiveOtpPopup] = useState(null) // { code, email }
  const [resendTimer, setResendTimer] = useState(0)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const otpInputsRef = useRef([])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  const switchMode = (m) => {
    setMode(m)
    setErrors({})
    setForm({ name: '', email: '', password: '', confirm: '' })
    if (m === 'forgot') {
      setForgotStep(1)
      setForgotEmail(form.email || '')
      setOtpDigits(['', '', '', '', '', ''])
      setActiveOtpPopup(null)
    }
  }

  const change = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: '' }))
  }

  const validate = () => {
    const e = {}
    if (mode === 'signup' && !form.name.trim()) e.name = 'Name is required'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email'
    if (form.password.length < 8) e.password = 'Min 8 characters'
    if (mode === 'signup' && form.password !== form.confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        toast.success('Welcome back!')
      } else {
        await register(form.name, form.email, form.password)
        toast.success('Account created! Welcome to TradeX.')
      }
      onClose()
      navigate('/dashboard')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => { if (e.key === 'Enter') submit() }

  // ── 6-Digit OTP Reset Password Handlers ──

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(forgotEmail)) {
      toast.error('Please enter a valid registered email address')
      return
    }
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/forgot-password', { email: forgotEmail })
      const code = res.data.otp
      setActiveOtpPopup({ code, email: forgotEmail })
      setForgotStep(2)
      setResendTimer(60)
      toast.success('6-Digit Verification Code Dispatched!', { duration: 4000 })
      // Focus first OTP input
      setTimeout(() => {
        if (otpInputsRef.current[0]) otpInputsRef.current[0].focus()
      }, 100)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not send verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpDigitChange = (index, val) => {
    // Only accept numeric
    const clean = val.replace(/\D/g, '')
    const nextDigits = [...otpDigits]
    nextDigits[index] = clean.slice(-1)
    setOtpDigits(nextDigits)

    // Move focus to next input if filled
    if (clean && index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    }

    // Auto verify if all 6 digits are entered
    const fullCode = nextDigits.join('')
    if (fullCode.length === 6) {
      executeVerifyOtp(fullCode)
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '')
    if (pastedData.length >= 6) {
      const digits = pastedData.slice(0, 6).split('')
      setOtpDigits(digits)
      otpInputsRef.current[5]?.focus()
      executeVerifyOtp(pastedData.slice(0, 6))
    }
  }

  const handleAutoFillOtp = () => {
    if (!activeOtpPopup?.code) return
    const digits = activeOtpPopup.code.split('')
    setOtpDigits(digits)
    executeVerifyOtp(activeOtpPopup.code)
    toast.success('Code auto-filled from security dispatch')
  }

  const executeVerifyOtp = async (codeToVerify) => {
    const code = codeToVerify || otpDigits.join('')
    if (code.length !== 6) {
      toast.error('Please enter the full 6-digit code')
      return
    }
    setLoading(true)
    try {
      await axios.post('/api/auth/verify-otp', {
        email: forgotEmail,
        otp: code,
      })
      toast.success('Code verified successfully!')
      setForgotStep(3)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteResetPassword = async () => {
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const code = otpDigits.join('')
      await axios.post('/api/auth/reset-password', {
        email: forgotEmail,
        otp: code,
        newPassword,
      })
      toast.success('Password updated successfully! Sign in with your new credentials.', { duration: 5000 })
      switchMode('login')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Close Button */}
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Interactive JS Security OTP Popup Notification */}
        {activeOtpPopup && mode === 'forgot' && (
          <div className="otp-popup-alert" role="alert">
            <div className="otp-popup-header">
              <span className="otp-shield-icon">🛡️</span>
              <span className="otp-popup-badge">2-FACTOR SECURITY DISPATCH</span>
              <button
                type="button"
                className="otp-popup-close"
                onClick={() => setActiveOtpPopup(null)}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <p className="otp-popup-msg">
              Your 6-digit TradeX recovery code for <strong>{activeOtpPopup.email}</strong> is:
            </p>
            <div className="otp-popup-code-row">
              <div className="otp-popup-code-badge">{activeOtpPopup.code}</div>
              <button
                type="button"
                className="otp-action-btn copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(activeOtpPopup.code)
                  toast.success('Code copied to clipboard!')
                }}
              >
                Copy
              </button>
              <button
                type="button"
                className="otp-action-btn fill-btn"
                onClick={handleAutoFillOtp}
              >
                Auto-Fill
              </button>
            </div>
            <small className="otp-popup-expiry">⏱️ Valid for 10 minutes · Do not share this code</small>
          </div>
        )}

        {/* Left — Form */}
        <div className="modal-left">
          {/* Logo */}
          <div className="modal-logo">
            <div className="modal-logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 17L9 11L13 15L21 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="21" cy="6" r="2.5" fill="white"/>
              </svg>
            </div>
            <span>TradeX</span>
          </div>

          {/* Mode Switcher Tabs (Login / Signup) */}
          {mode !== 'forgot' ? (
            <div className="modal-toggle">
              <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Sign in</button>
              <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Sign up</button>
              <div className={`modal-toggle-bar ${mode === 'signup' ? 'right' : ''}`} />
            </div>
          ) : (
            <div className="forgot-header-nav">
              <button type="button" className="forgot-back-btn" onClick={() => switchMode('login')}>
                ← Back to Sign in
              </button>
              <span className="forgot-step-indicator">Step {forgotStep} of 3</span>
            </div>
          )}

          {/* ═════════════════ LOGIN & SIGNUP MODE ═════════════════ */}
          {mode !== 'forgot' && (
            <>
              {/* Headline */}
              <div className="modal-headline">
                <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
                <p>{mode === 'login' ? 'Sign in to access your portfolio and watchlist.' : 'Get ₹10L virtual capital and start trading today.'}</p>
              </div>

              {/* Fields */}
              <div className="modal-fields">
                {mode === 'signup' && (
                  <div className={`mf-group ${errors.name ? 'err' : ''}`}>
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Your name"
                      value={form.name}
                      onChange={change}
                      onKeyDown={onKey}
                      autoFocus={mode === 'signup'}
                      autoComplete="name"
                    />
                    {errors.name && <span className="mf-err">{errors.name}</span>}
                  </div>
                )}

                <div className={`mf-group ${errors.email ? 'err' : ''}`}>
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={change}
                    onKeyDown={onKey}
                    autoFocus={mode === 'login'}
                    autoComplete="email"
                  />
                  {errors.email && <span className="mf-err">{errors.email}</span>}
                </div>

                <div className={`mf-group ${errors.password ? 'err' : ''}`}>
                  <label>Password</label>
                  <div className="mf-pass-wrap">
                    <input
                      type={showPass ? 'text' : 'password'}
                      name="password"
                      placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                      value={form.password}
                      onChange={change}
                      onKeyDown={onKey}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button type="button" className="mf-eye" onClick={() => setShowPass(s => !s)}>
                      {showPass
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  {errors.password && <span className="mf-err">{errors.password}</span>}
                </div>

                {mode === 'signup' && (
                  <div className={`mf-group ${errors.confirm ? 'err' : ''}`}>
                    <label>Confirm Password</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      name="confirm"
                      placeholder="Repeat password"
                      value={form.confirm}
                      onChange={change}
                      onKeyDown={onKey}
                      autoComplete="new-password"
                    />
                    {errors.confirm && <span className="mf-err">{errors.confirm}</span>}
                  </div>
                )}

                {mode === 'login' && (
                  <div className="mf-forgot">
                    <button
                      type="button"
                      className="forgot-link-btn"
                      onClick={() => switchMode('forgot')}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              <button className={`modal-submit ${loading ? 'loading' : ''}`} onClick={submit} disabled={loading}>
                {loading
                  ? <span className="submit-spin" />
                  : mode === 'login' ? 'Sign in to TradeX' : 'Create free account'
                }
              </button>

              <div className="modal-divider"><span>or</span></div>

              <div className="modal-socials">
                <button className="social-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </button>
              </div>

              {mode === 'signup' && (
                <p className="modal-terms">
                  By signing up you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
                </p>
              )}
            </>
          )}

          {/* ═════════════════ FORGOT PASSWORD 3-STEP FLOW ═════════════════ */}
          {mode === 'forgot' && (
            <div className="forgot-container">
              {/* Step 1: Request OTP via Email */}
              {forgotStep === 1 && (
                <div className="forgot-step-view">
                  <div className="modal-headline">
                    <h2>Reset Password</h2>
                    <p>Enter your TradeX registered email to receive a 6-digit verification code.</p>
                  </div>

                  <div className="mf-group" style={{ marginBottom: 20 }}>
                    <label>Account Email</label>
                    <input
                      type="email"
                      placeholder="trader@tradex.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp(e) }}
                      autoFocus
                    />
                  </div>

                  <button
                    className={`modal-submit ${loading ? 'loading' : ''}`}
                    onClick={handleSendOtp}
                    disabled={loading || !forgotEmail}
                  >
                    {loading ? <span className="submit-spin" /> : 'Send 6-Digit OTP'}
                  </button>
                </div>
              )}

              {/* Step 2: Enter & Verify 6-Digit OTP */}
              {forgotStep === 2 && (
                <div className="forgot-step-view">
                  <div className="modal-headline">
                    <h2>Enter 6-Digit Code</h2>
                    <p>
                      We dispatched a verification code to <strong>{forgotEmail}</strong>.
                    </p>
                  </div>

                  <div className="otp-digit-group" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputsRef.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength="1"
                        className={`otp-digit-input ${digit ? 'filled' : ''}`}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  <button
                    className={`modal-submit ${loading ? 'loading' : ''}`}
                    onClick={() => executeVerifyOtp()}
                    disabled={loading || otpDigits.join('').length !== 6}
                  >
                    {loading ? <span className="submit-spin" /> : 'Verify Code'}
                  </button>

                  <div className="otp-resend-row">
                    {resendTimer > 0 ? (
                      <span className="otp-timer">Resend code in <strong>{resendTimer}s</strong></span>
                    ) : (
                      <button
                        type="button"
                        className="otp-resend-btn"
                        onClick={handleSendOtp}
                        disabled={loading}
                      >
                        Resend Code
                      </button>
                    )}
                    <button
                      type="button"
                      className="otp-change-email"
                      onClick={() => setForgotStep(1)}
                    >
                      Change Email
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Set New Password */}
              {forgotStep === 3 && (
                <div className="forgot-step-view">
                  <div className="modal-headline">
                    <h2>Create New Password</h2>
                    <p>Your code is verified. Enter a secure password for your TradeX account.</p>
                  </div>

                  <div className="modal-fields">
                    <div className="mf-group">
                      <label>New Password (min 8 chars)</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div className="mf-group">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleExecuteResetPassword() }}
                      />
                    </div>
                  </div>

                  <button
                    className={`modal-submit ${loading ? 'loading' : ''}`}
                    onClick={handleExecuteResetPassword}
                    disabled={loading || !newPassword || !confirmNewPassword}
                  >
                    {loading ? <span className="submit-spin" /> : 'Update Password & Sign In'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — Visual Panel */}
        <div className="modal-right">
          <div className="mr-content">
            <div className="mr-badge">
              <span className="mr-dot" />
              Markets live now
            </div>
            <h3 className="mr-title">Trade 50+ markets with ₹10L virtual capital</h3>
            <div className="mr-features">
              {[
                ['📈', 'Real-time NSE, BSE, NYSE data'],
                ['₿', 'Top 100 crypto pairs'],
                ['💱', '30+ Forex pairs live'],
                ['🔔', 'Instant price alerts'],
                ['📊', 'Professional-grade charts'],
                ['🛡️', 'No real money needed'],
              ].map(([icon, text], i) => (
                <div key={i} className="mr-feat">
                  <span className="mr-feat-icon">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <div className="mr-mini-chart">
              <svg viewBox="0 0 200 80" preserveAspectRatio="none" style={{ width: '100%', height: 80 }}>
                <defs>
                  <linearGradient id="mrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0 60 L20 50 L40 55 L60 35 L80 40 L100 25 L120 30 L140 15 L160 20 L180 8 L200 12 L200 80 L0 80 Z" fill="url(#mrGrad)" />
                <path d="M0 60 L20 50 L40 55 L60 35 L80 40 L100 25 L120 30 L140 15 L160 20 L180 8 L200 12" fill="none" stroke="#3B82F6" strokeWidth="2" style={{ strokeDasharray: 600, strokeDashoffset: 600, animation: 'drawLine 1.5s ease 0.5s forwards' }}/>
              </svg>
              <div className="mr-chart-label">
                <span>NIFTY 50</span>
                <span className="gain">▲ +0.96% today</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

