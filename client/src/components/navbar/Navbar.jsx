import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Activity, ShieldCheck, Terminal, Sun, Moon, ArrowRight } from 'lucide-react'
import './Navbar.css'

export default function Navbar({ onOpenAuth }) {
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 15)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-inner">
        {/* Logo & Platform Identifier */}
        <a href="/" className="nav-logo">
          <div className="nav-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 17L9 11L13 15L21 6" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="21" cy="6" r="2.5" fill="#52FFA5"/>
            </svg>
          </div>
          <div className="nav-logo-text">
            <span className="nav-brand">TradeFX</span>
            <span className="nav-edition">PRO TERMINAL</span>
          </div>
        </a>

        {/* Live Network Stream Status Pill */}
        <div className="nav-stream-status" title="Real-time multi-asset quotes streaming via WebSocket">
          <span className="nav-stream-dot" />
          <span className="nav-stream-text">MARKET STREAM ACTIVE</span>
          <span className="nav-stream-latency mono">12ms</span>
        </div>

        {/* Center links */}
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <button onClick={() => scrollTo('features')} className="nav-link">
            Infrastructure
          </button>
          <button onClick={() => scrollTo('markets')} className="nav-link">
            Markets Matrix
          </button>
          <button onClick={() => scrollTo('faq')} className="nav-link">
            Docs & FAQ
          </button>
          <button onClick={() => navigate('/dashboard')} className="nav-link highlight">
            <Terminal size={13} />
            <span>Terminal</span>
          </button>
        </div>

        {/* Right actions */}
        <div className="nav-actions">
          {/* Theme toggle */}
          <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme" title="Toggle visual theme">
            {theme === 'dark' ? <Sun size={15} color="#52FFA5" /> : <Moon size={15} color="#582EFF" />}
          </button>

          {user ? (
            <>
              <button className="nav-btn-terminal" onClick={() => navigate('/dashboard')}>
                <Activity size={14} color="#52FFA5" />
                <span>Launch Terminal</span>
              </button>
              <button className="nav-btn-outline" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button className="nav-btn-ghost" onClick={() => onOpenAuth('login')}>
                Sign In
              </button>
              <button className="nav-btn-primary" onClick={() => onOpenAuth('signup')}>
                <span>Open Account</span>
                <ArrowRight size={13} />
              </button>
            </>
          )}

          {/* Mobile Hamburger */}
          <button className="nav-hamburger" onClick={() => setMenuOpen((m) => !m)} aria-label="Menu">
            <span className={menuOpen ? 'open' : ''} />
            <span className={menuOpen ? 'open' : ''} />
            <span className={menuOpen ? 'open' : ''} />
          </button>
        </div>
      </div>
    </nav>
  )
}
