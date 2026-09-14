import './Features.css'

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    badge: '1.5s STREAM',
    title: 'High-Frequency Real-Time Engine',
    desc: 'Powered by 1.5s WebSocket tick broadcasting with Geometric Brownian Motion micro-fluctuations. Zero frozen prices.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    badge: 'COUNT TO BAR',
    title: 'Candlestick & Count-To-Bar Terminal',
    desc: 'Interactive TradingView-caliber candlestick charts with live second-by-second countdown to bar close and OHLC HUD.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    badge: '2FA OTP',
    title: 'Interactive 6-Digit 2FA Security',
    desc: 'Instant cryptographic OTP dispatch with interactive browser simulation popup, 6-digit box matrix, and seamless sign-in.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
    badge: 'QUANT MODELS',
    title: 'Algorithmic Technical Signals',
    desc: 'Automated 14-period RSI, MACD histograms, SMA 20/50 crossovers, and ATR risk management targets (SL / TP).',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </svg>
    ),
    badge: '₹10L CAPITAL',
    title: 'Virtual Portfolio & Live P&L',
    desc: 'Watch positions pulse with green/red flashes on every tick. Real-time unrealized P&L recalculation and valuation.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    badge: 'AUDIT LEDGER',
    title: 'Transaction Ledger & Analytics',
    desc: 'Full CSV ledger export, performance analytics, global trader leaderboard, and live push notifications.',
  },
]

export default function Features() {
  return (
    <section className="features" id="features">
      <div className="section-inner">
        <div className="section-header">
          <div className="section-eyebrow">Platform Features</div>
          <h2 className="section-title">Everything you need to trade smarter</h2>
          <p className="section-sub">Built for serious traders who want institutional-grade tools without the institutional cost.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="fc-top">
                <div className="fc-icon">{f.icon}</div>
                {f.badge && <span className="fc-badge">{f.badge}</span>}
              </div>
              <h3 className="fc-title">{f.title}</h3>
              <p className="fc-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
