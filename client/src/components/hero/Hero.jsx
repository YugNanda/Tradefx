import { useState, useEffect } from 'react'
import {
  TrendingUp,
  Zap,
  ShieldCheck,
  BarChart2,
  Clock,
  ArrowRight,
  Sparkles,
  Activity,
  Layers,
} from 'lucide-react'
import './Hero.css'

const PREVIEWS = {
  RELIANCE: {
    name: 'Reliance Industries',
    sym: 'RELIANCE',
    exch: 'NSE',
    price: 2865.40,
    chg: 1.25,
    curr: '₹',
    open: 2835.0,
    high: 2880.0,
    low: 2820.0,
    vol: '4.2M',
    signal: 'STRONG BUY (94%)',
    points: [45, 42, 48, 46, 52, 49, 58, 55, 62, 59, 68, 64, 75, 72, 82, 79, 88, 85, 94],
  },
  BTC: {
    name: 'Bitcoin / US Dollar',
    sym: 'BTC/USD',
    exch: 'CRYPTO',
    price: 67450.00,
    chg: 3.15,
    curr: '$',
    open: 65400.0,
    high: 68100.0,
    low: 65100.0,
    vol: '28.4K',
    signal: 'BULLISH MOMENTUM (89%)',
    points: [30, 36, 32, 45, 42, 55, 51, 64, 60, 72, 69, 78, 74, 86, 82, 90, 85, 95, 98],
  },
  AAPL: {
    name: 'Apple Inc.',
    sym: 'AAPL',
    exch: 'NASDAQ',
    price: 189.84,
    chg: 1.45,
    curr: '$',
    open: 187.2,
    high: 191.0,
    low: 186.5,
    vol: '52.1M',
    signal: 'ACCUMULATE (82%)',
    points: [50, 48, 55, 52, 60, 58, 66, 62, 70, 68, 76, 73, 81, 79, 86, 84, 91, 88, 93],
  },
  NIFTY50: {
    name: 'Nifty 50 Index',
    sym: 'NIFTY 50',
    exch: 'NSE',
    price: 22450.75,
    chg: 0.92,
    curr: '₹',
    open: 22250.0,
    high: 22520.0,
    low: 22210.0,
    vol: '192M',
    signal: 'TREND CONFIRMED (91%)',
    points: [40, 44, 42, 50, 48, 56, 53, 62, 59, 67, 65, 73, 71, 80, 78, 85, 83, 90, 92],
  },
}

function LiveHeroChart({ points, isUp }) {
  const w = 540, h = 180
  const min = Math.min(...points)
  const max = Math.max(...points)
  const pts = points.map((v, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - ((v - min) / (max - min || 1)) * (h - 30) - 15,
  }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`
  const lastPt = pts[pts.length - 1]

  const strokeColor = isUp ? '#10B981' : '#EF4444'

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="hero-terminal-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      <line x1="0" y1={h * 0.25} x2={w} y2={h * 0.25} stroke="var(--border)" strokeDasharray="3" opacity="0.6" />
      <line x1="0" y1={h * 0.5} x2={w} y2={h * 0.5} stroke="var(--border)" strokeDasharray="3" opacity="0.6" />
      <line x1="0" y1={h * 0.75} x2={w} y2={h * 0.75} stroke="var(--border)" strokeDasharray="3" opacity="0.6" />
      
      {/* Gradient Area */}
      <path d={areaPath} fill="url(#heroChartGrad)" />
      {/* Stroke Path */}
      <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2.5" />
      {/* Live Glowing Cursor */}
      <circle cx={lastPt.x} cy={lastPt.y} r="5" fill={strokeColor} />
      <circle cx={lastPt.x} cy={lastPt.y} r="10" fill={strokeColor} opacity="0.3" className="cursor-pulse" />
    </svg>
  )
}

export default function Hero({ onOpenAuth }) {
  const [activeTab, setActiveTab] = useState('RELIANCE')
  const [countToBar, setCountToBar] = useState(48)
  const current = PREVIEWS[activeTab]

  // Live bar countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountToBar((c) => (c <= 1 ? 60 : c - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="hero">
      {/* Ambient background glows */}
      <div className="hero-glow-1" />
      <div className="hero-glow-2" />
      <div className="hero-grid" />

      <div className="hero-content">
        {/* Left Column: Value Prop */}
        <div className="hero-left">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span className="hero-badge-label">1.5s High-Frequency Streaming Engine</span>
            <span className="hero-badge-tag">MNC Caliber</span>
          </div>

          <h1 className="hero-title">
            The Institutional Trading Terminal <br />
            <span className="hero-title-gradient">For Global Markets.</span>
          </h1>

          <p className="hero-subtitle">
            Master the markets with ₹10,00,000 in virtual capital. Access real-time NSE, BSE, NASDAQ, Forex, and Crypto data with candlestick charts, count-to-bar countdowns, quant signals, and zero financial risk.
          </p>

          <div className="hero-actions">
            <button className="hero-cta-primary" onClick={() => onOpenAuth('signup')}>
              <span>Launch Terminal Free</span>
              <ArrowRight size={17} />
            </button>
            <button className="hero-cta-ghost" onClick={() => onOpenAuth('login')}>
              <span>Live Terminal Sign In</span>
            </button>
          </div>

          <div className="hero-pill-row">
            <div className="hero-pill">
              <ShieldCheck size={14} color="#10B981" />
              <span>₹10L Virtual Capital</span>
            </div>
            <div className="hero-pill">
              <Zap size={14} color="#3B82F6" />
              <span>1.5s Socket Stream</span>
            </div>
            <div className="hero-pill">
              <BarChart2 size={14} color="#F59E0B" />
              <span>Candlestick & Count to Bar</span>
            </div>
          </div>

          {/* Institutional Stats Ribbon */}
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hs-value">₹500Cr+</span>
              <span className="hs-label">Simulated Volume</span>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <span className="hs-value">1.5s</span>
              <span className="hs-label">Engine Frequency</span>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <span className="hs-value">50+</span>
              <span className="hs-label">Global Assets</span>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <span className="hs-value">99.9%</span>
              <span className="hs-label">WebSocket Uptime</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Terminal Showcase Window */}
        <div className="hero-right">
          <div className="hero-terminal-window">
            {/* macOS Window Titlebar */}
            <div className="ht-titlebar">
              <div className="ht-dots">
                <span className="ht-dot red" />
                <span className="ht-dot yellow" />
                <span className="ht-dot green" />
              </div>
              <div className="ht-title">TradeX High-Frequency Terminal v2.4</div>
              <div className="ht-conn">
                <span className="ht-conn-dot" />
                <span>1.5s LIVE</span>
              </div>
            </div>

            {/* Asset Switcher Tabs */}
            <div className="ht-tabs">
              {Object.keys(PREVIEWS).map((k) => (
                <button
                  key={k}
                  className={`ht-tab ${activeTab === k ? 'active' : ''}`}
                  onClick={() => setActiveTab(k)}
                >
                  {PREVIEWS[k].sym}
                </button>
              ))}
            </div>

            {/* Terminal Main Body */}
            <div className="ht-body">
              <div className="ht-head">
                <div>
                  <div className="ht-sym-row">
                    <span className="ht-sym">{current.sym}</span>
                    <span className="ht-exch">{current.exch}</span>
                  </div>
                  <div className="ht-fullname">{current.name}</div>
                </div>

                <div className="ht-price-col">
                  <div className="ht-price mono">
                    {current.curr}{current.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="ht-chg gain mono">
                    <TrendingUp size={13} /> +{current.chg}% today
                  </div>
                </div>
              </div>

              {/* Live Count to Bar HUD */}
              <div className="ht-hud-row">
                <div className="ht-hud-item">
                  <Clock size={11} color="var(--accent)" />
                  <span>Count to Bar:</span>
                  <strong className="mono">00:{String(countToBar).padStart(2, '0')}</strong>
                </div>
                <div className="ht-hud-item">
                  <span>Open:</span>
                  <strong className="mono">{current.open.toFixed(1)}</strong>
                </div>
                <div className="ht-hud-item">
                  <span>High:</span>
                  <strong className="mono" style={{ color: '#10B981' }}>{current.high.toFixed(1)}</strong>
                </div>
                <div className="ht-hud-item">
                  <span>Low:</span>
                  <strong className="mono" style={{ color: '#EF4444' }}>{current.low.toFixed(1)}</strong>
                </div>
                <div className="ht-hud-item">
                  <span>Vol:</span>
                  <strong className="mono">{current.vol}</strong>
                </div>
              </div>

              {/* Chart Canvas */}
              <div className="ht-chart-wrap">
                <LiveHeroChart points={current.points} isUp={current.chg >= 0} />
              </div>

              {/* Order Book Depth Snapshot */}
              <div className="ht-depth-preview">
                <div className="ht-depth-line">
                  <span className="ht-depth-tag"><Layers size={10} /> Live Depth</span>
                  <span className="ht-depth-spread">Spread: {current.curr}0.15</span>
                  <span className="ht-depth-signal"><Sparkles size={10} color="#F59E0B" /> {current.signal}</span>
                </div>
                <div className="ht-depth-bars">
                  <div className="ht-depth-col bid" style={{ width: '58%' }}>58% Bids</div>
                  <div className="ht-depth-col ask" style={{ width: '42%' }}>42% Asks</div>
                </div>
              </div>
            </div>
          </div>

            {/* Floating Live Badges around the terminal */}
            <div className="hero-float hero-float-1">
              <span className="hf-pulse-dot" />
              <span>Live Unrealized P&amp;L:</span>
              <strong className="gain mono">+₹48,250.00 (+12.4%)</strong>
            </div>

            <div className="hero-float hero-float-2">
              <Sparkles size={13} color="#F59E0B" />
              <span>Quant Model:</span>
              <strong style={{ color: '#38BDF8' }}>STRONG BUY 94%</strong>
            </div>

            <div className="hero-float hero-float-3">
              <ShieldCheck size={14} color="#10B981" />
              <span>2FA Security:</span>
              <strong>6-Digit OTP Verified</strong>
            </div>
          </div>
        </div>
      </section>
  )
}

