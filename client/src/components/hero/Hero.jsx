import './Hero.css'

const MINI_POINTS = [42, 38, 45, 41, 50, 47, 55, 52, 60, 56, 65, 62, 70, 67, 74, 71, 80, 76, 84]

function MiniChart() {
  const w = 500, h = 120
  const min = Math.min(...MINI_POINTS), max = Math.max(...MINI_POINTS)
  const pts = MINI_POINTS.map((v, i) => ({
    x: (i / (MINI_POINTS.length - 1)) * w,
    y: h - ((v - min) / (max - min)) * (h - 20) - 10
  }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mini-chart-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#heroGrad)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        style={{ strokeDasharray: 800, strokeDashoffset: 800, animation: 'drawLine 2s ease 0.3s forwards' }}
      />
      {pts.slice(-1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--accent)" />
      ))}
    </svg>
  )
}

export default function Hero({ onOpenAuth }) {
  return (
    <section className="hero">
      {/* Background grid */}
      <div className="hero-grid" />

      <div className="hero-content">
        <div className="hero-left">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            NSE · BSE · NYSE · Crypto · Forex
          </div>
          <h1 className="hero-title">
            Trade every market<br />
            <span className="hero-title-blue">with precision.</span>
          </h1>
          <p className="hero-subtitle">
            Real-time data across global markets. AI-powered signals, virtual portfolio, and institutional-grade charts — all in one platform.
          </p>
          <div className="hero-actions">
            <button className="hero-cta-primary" onClick={() => onOpenAuth('signup')}>
              Start trading free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="hero-cta-ghost" onClick={() => onOpenAuth('login')}>
              Sign in
            </button>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hs-value">₹2.4Cr+</span>
              <span className="hs-label">Virtual trades placed</span>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <span className="hs-value">50+</span>
              <span className="hs-label">Markets covered</span>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <span className="hs-value">1.2M+</span>
              <span className="hs-label">Active traders</span>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-card">
            <div className="hc-header">
              <div className="hc-sym">
                <span className="hc-name">NIFTY 50</span>
                <span className="hc-exchange">NSE</span>
              </div>
              <div className="hc-price-wrap">
                <span className="hc-price">22,147.25</span>
                <span className="hc-chg gain">▲ +212.40 (+0.96%)</span>
              </div>
            </div>
            <div className="hc-chart">
              <MiniChart />
            </div>
            <div className="hc-footer">
              {[
                { l: 'Open', v: '21,934' },
                { l: 'High', v: '22,198' },
                { l: 'Low',  v: '21,887' },
                { l: 'Vol',  v: '184.2M' },
              ].map((s, i) => (
                <div key={i} className="hc-stat">
                  <span className="hcs-l">{s.l}</span>
                  <span className="hcs-v">{s.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating badges */}
          <div className="hero-float hero-float-1">
            <span className="gain">▲</span> BTC <strong className="gain">+3.21%</strong>
          </div>
          <div className="hero-float hero-float-2">
            <span className="loss">▼</span> TSLA <strong className="loss">-1.88%</strong>
          </div>
          <div className="hero-float hero-float-3">
            🔔 Price alert triggered
          </div>
        </div>
      </div>
    </section>
  )
}
