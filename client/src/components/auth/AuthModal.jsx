import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import './AuthModal.css'

export default function AuthModal({ mode: initialMode, onClose }) {
  const [mode, setMode] = useState(initialMode || 'login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const { login, register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const switchMode = (m) => {
    setMode(m)
    setErrors({})
    setForm({ name: '', email: '', password: '', confirm: '' })
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

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Left — form */}
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

          {/* Toggle */}
          <div className="modal-toggle">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Sign in</button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Sign up</button>
            <div className={`modal-toggle-bar ${mode === 'signup' ? 'right' : ''}`} />
          </div>

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
                <a href="#">Forgot password?</a>
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
        </div>

        {/* Right — visual panel */}
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
