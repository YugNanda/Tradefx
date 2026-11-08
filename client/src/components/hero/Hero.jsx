import { useState, useEffect } from 'react'
import {
  TrendingUp,
  Zap,
  ShieldCheck,
  BarChart2,
  Clock,
  ArrowRight,
  Terminal,
  Activity,
  Layers,
  ChevronRight,
  Cpu,
} from 'lucide-react'
import './Hero.css'

const PREVIEWS = {
  RELIANCE: {
    name: 'Reliance Industries Ltd.',
    sym: 'RELIANCE',
    exch: 'NSE',
    price: 2865.40,
    chg: 1.25,
    curr: '₹',
    open: 2835.0,
    high: 2880.0,
    low: 2820.0,
    vol: '4.2M',
    spread: '0.15',
    signal: 'QUANT LONG (94%)',
    candles: [
      { o: 42, h: 48, l: 40, c: 46 },
      { o: 46, h: 52, l: 44, c: 50 },
      { o: 50, h: 54, l: 48, c: 49 },
      { o: 49, h: 58, l: 48, c: 56 },
      { o: 56, h: 63, l: 54, c: 61 },
      { o: 61, h: 65, l: 59, c: 58 },
      { o: 58, h: 70, l: 57, c: 68 },
      { o: 68, h: 76, l: 66, c: 74 },
      { o: 74, h: 84, l: 72, c: 81 },
      { o: 81, h: 86, l: 79, c: 80 },
      { o: 80, h: 92, l: 78, c: 89 },
      { o: 89, h: 95, l: 87, c: 94 },
    ],
  },
  BTC: {
    name: 'Bitcoin / US Dollar Spot',
    sym: 'BTC/USD',
    exch: 'CRYPTO',
    price: 67450.00,
    chg: 3.15,
    curr: '$',
    open: 65400.0,
    high: 68100.0,
    low: 65100.0,
    vol: '28.4K',
    spread: '1.20',
    signal: 'BULLISH MOMENTUM (89%)',
    candles: [
      { o: 30, h: 38, l: 28, c: 36 },
      { o: 36, h: 45, l: 34, c: 42 },
      { o: 42, h: 55, l: 40, c: 51 },
      { o: 51, h: 64, l: 48, c: 60 },
      { o: 60, h: 72, l: 58, c: 69 },
      { o: 69, h: 78, l: 66, c: 74 },
      { o: 74, h: 86, l: 72, c: 82 },
      { o: 82, h: 89, l: 80, c: 85 },
      { o: 85, h: 96, l: 83, c: 93 },
      { o: 93, h: 98, l: 90, c: 96 },
    ],
  },
  AAPL: {
    name: 'Apple Inc. Common Stock',
    sym: 'AAPL',
    exch: 'NASDAQ',
    price: 189.84,
    chg: 1.45,
    curr: '$',
    open: 187.2,
    high: 191.0,
    low: 186.5,
    vol: '52.1M',
    spread: '0.02',
    signal: 'SMART ACCUMULATE (82%)',
    candles: [
      { o: 50, h: 56, l: 48, c: 54 },
      { o: 54, h: 60, l: 52, c: 58 },
      { o: 58, h: 66, l: 56, c: 62 },
      { o: 62, h: 70, l: 60, c: 68 },
      { o: 68, h: 75, l: 66, c: 73 },
      { o: 73, h: 80, l: 71, c: 78 },
      { o: 78, h: 86, l: 76, c: 84 },
      { o: 84, h: 90, l: 82, c: 88 },
      { o: 88, h: 93, l: 86, c: 92 },
    ],
  },
  NIFTY50: {
    name: 'NIFTY 50 Benchmark Index',
    sym: 'NIFTY 50',
    exch: 'NSE',
    price: 22450.75,
    chg: 0.92,
    curr: '₹',
    open: 22250.0,
    high: 22520.0,
    low: 22210.0,
    vol: '192M',
    spread: '0.50',
    signal: 'TREND CONFIRMED (91%)',
    candles: [
      { o: 40, h: 46, l: 38, c: 44 },
      { o: 44, h: 50, l: 42, c: 48 },
      { o: 48, h: 56, l: 46, c: 53 },
      { o: 53, h: 62, l: 50, c: 59 },
      { o: 59, h: 67, l: 57, c: 65 },
      { o: 65, h: 73, l: 63, c: 71 },
      { o: 71, h: 80, l: 69, c: 78 },
      { o: 78, h: 85, l: 76, c: 83 },
      { o: 83, h: 91, l: 81, c: 90 },
    ],
  },
}

function LiveCandleChart({ candles = [] }) {
  const w = 580
  const h = 200
  const padBottom = 28
  const padTop = 14
  const chartH = h - padBottom - padTop

  const min = Math.min(...candles.map((c) => c.l)) * 0.96
  const max = Math.max(...candles.map((c) => c.h)) * 1.04
  const range = max - min || 1

  const scaleY = (v) => h - padBottom - ((v - min) / range) * chartH
  const slotW = w / candles.length
  const candleW = Math.max(14, slotW * 0.58)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="ht-svg-candle" preserveAspectRatio="none">
      <defs>
        <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(88, 46, 255, 0.08)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      <line x1="0" y1={scaleY(min + range * 0.75)} x2={w} y2={scaleY(min + range * 0.75)} stroke="var(--border)" strokeDasharray="3 3" />
      <line x1="0" y1={scaleY(min + range * 0.5)} x2={w} y2={scaleY(min + range * 0.5)} stroke="var(--border)" strokeDasharray="3 3" />
      <line x1="0" y1={scaleY(min + range * 0.25)} x2={w} y2={scaleY(min + range * 0.25)} stroke="var(--border)" strokeDasharray="3 3" />

      {/* Candles */}
      {candles.map((c, i) => {
        const cx = i * slotW + slotW / 2
        const isUp = c.c >= c.o
        const bodyTop = scaleY(Math.max(c.o, c.c))
        const bodyH = Math.max(2, Math.abs(scaleY(c.c) - scaleY(c.o)))
        const wickTop = scaleY(c.h)
        const wickBot = scaleY(c.l)
        const color = isUp ? '#52FFA5' : '#FF4365'

        return (
          <g key={i}>
            {/* Wick */}
            <line x1={cx} y1={wickTop} x2={cx} y2={wickBot} stroke={color} strokeWidth="1.5" />
            {/* Candle Body */}
            <rect
              x={cx - candleW / 2}
              y={bodyTop}
              width={candleW}
              height={bodyH}
              fill={color}
              rx="1.5"
            />
          </g>
        )
      })}

      {/* Light Blue Technical Moving Average Overlay */}
      <path
        d={candles
          .map((c, i) => {
            const cx = i * slotW + slotW / 2
            const cy = scaleY((c.o + c.c) / 2) - 4
            return `${i === 0 ? 'M' : 'L'} ${cx} ${cy}`
          })
          .join(' ')}
        fill="none"
        stroke="#38B4FF"
        strokeWidth="1.8"
      />

      {/* Latest Price Target Line */}
      {candles.length > 0 && (
        <line
          x1="0"
          y1={scaleY(candles[candles.length - 1].c)}
          x2={w}
          y2={scaleY(candles[candles.length - 1].c)}
          stroke="#52FFA5"
          strokeDasharray="4 2"
          strokeWidth="1"
          opacity="0.85"
        />
      )}
    </svg>
  )
}

export default function Hero({ onOpenAuth }) {
  const [activeTab, setActiveTab] = useState('RELIANCE')
  const [countToBar, setCountToBar] = useState(48)
  const current = PREVIEWS[activeTab]

  useEffect(() => {
    const timer = setInterval(() => {
      setCountToBar((c) => (c <= 1 ? 60 : c - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="hero">
      {/* Precision Blueprint Grid */}
      <div className="hero-blueprint-grid" />

      <div className="hero-shell">
        {/* Left Column: Platform Thesis & High-Utility Actions */}
        <div className="hero-left">
          <div className="hero-kicker">
            <span className="hk-badge">INSTITUTIONAL SIMULATION</span>
            <span className="hk-sep">/</span>
            <span className="hk-meta mono">WS 1.5S TICK STREAM</span>
          </div>

          <h1 className="hero-title">
            Institutional Market Intelligence &amp; Virtual Execution.
          </h1>

          <p className="hero-lead">
            Deploy quantitative strategies across <strong>NSE, BSE, NASDAQ, Forex, and Crypto</strong>.
            Execute with ₹10,00,000 in virtual capital, real-time depth book simulation, and mathematical risk modeling.
          </p>

          <div className="hero-cta-group">
            <button className="h-btn-primary" onClick={() => onOpenAuth('signup')}>
              <span>Launch Live Terminal</span>
              <ArrowRight size={14} />
            </button>
            <button className="h-btn-secondary" onClick={() => onOpenAuth('login')}>
              <span>Institutional Sign In</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Precision Telemetry Strip */}
          <div className="hero-specs-grid">
            <div className="h-spec-cell">
              <span className="h-spec-label">VIRTUAL CAPITAL</span>
              <span className="h-spec-val mono">₹10,00,000</span>
              <span className="h-spec-sub">Zero financial risk</span>
            </div>
            <div className="h-spec-cell">
              <span className="h-spec-label">FEED LATENCY</span>
              <span className="h-spec-val mono mint">1.5s STREAM</span>
              <span className="h-spec-sub">Sub-second tick engine</span>
            </div>
            <div className="h-spec-cell">
              <span className="h-spec-label">ACTIVE MARKETS</span>
              <span className="h-spec-val mono light-blue">50+ SYMBOLS</span>
              <span className="h-spec-sub">Equities, FX &amp; Crypto</span>
            </div>
            <div className="h-spec-cell">
              <span className="h-spec-label">RISK ENGINE</span>
              <span className="h-spec-val mono indigo">SHARPE &amp; ATR</span>
              <span className="h-spec-sub">Automated targets</span>
            </div>
          </div>
        </div>

        {/* Right Column: Workstation Terminal Viewport */}
        <div className="hero-right">
          <div className="terminal-workstation">
            {/* Terminal Titlebar */}
            <div className="tw-header">
              <div className="tw-title-left">
                <Terminal size={13} color="var(--light-blue)" />
                <span className="tw-title-text mono">TRADEFX.WORKSTATION // {current.sym}</span>
              </div>
              <div className="tw-telemetry">
                <span className="tw-ping-dot" />
                <span className="tw-ping-label mono">1.5s LIVE FEED</span>
              </div>
            </div>

            {/* Segmented Instrument Switcher */}
            <div className="tw-tabs">
              {Object.keys(PREVIEWS).map((k) => (
                <button
                  key={k}
                  className={`tw-tab ${activeTab === k ? 'active' : ''}`}
                  onClick={() => setActiveTab(k)}
                >
                  <span className="tw-tab-sym">{PREVIEWS[k].sym}</span>
                  <span className="tw-tab-exch mono">{PREVIEWS[k].exch}</span>
                </button>
              ))}
            </div>

            {/* Instrument HUD Bar */}
            <div className="tw-hud">
              <div className="tw-hud-item">
                <span className="tw-label">CURRENT TICK</span>
                <span className="tw-val-price mono">
                  {current.curr}{current.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="tw-chg-pill mono up">
                  +{current.chg}%
                </span>
              </div>

              <div className="tw-hud-item">
                <span className="tw-label">COUNT TO BAR</span>
                <span className="tw-val mono light-blue">
                  00:{String(countToBar).padStart(2, '0')}
                </span>
              </div>

              <div className="tw-hud-item">
                <span className="tw-label">DAY HIGH / LOW</span>
                <span className="tw-val mono">
                  {current.high.toFixed(1)} / {current.low.toFixed(1)}
                </span>
              </div>

              <div className="tw-hud-item">
                <span className="tw-label">VOLUME (24H)</span>
                <span className="tw-val mono">{current.vol}</span>
              </div>
            </div>

            {/* Candlestick Workspace Canvas */}
            <div className="tw-chart-canvas">
              <LiveCandleChart candles={current.candles} />
            </div>

            {/* Execution & Depth Terminal Strip */}
            <div className="tw-footer-depth">
              <div className="tw-depth-row">
                <div className="tw-depth-metric">
                  <Layers size={11} color="var(--light-blue)" />
                  <span className="tw-depth-name">L2 SPREAD:</span>
                  <span className="mono tw-depth-value">{current.curr}{current.spread}</span>
                </div>
                <div className="tw-depth-metric">
                  <Activity size={11} color="var(--mint)" />
                  <span className="tw-depth-name">ALGO SIGNAL:</span>
                  <span className="mono tw-depth-signal mint">{current.signal}</span>
                </div>
              </div>

              <div className="tw-depth-meter">
                <div className="tw-meter-bid" style={{ width: '58%' }}>
                  <span className="mono">58% BIDS</span>
                </div>
                <div className="tw-meter-ask" style={{ width: '42%' }}>
                  <span className="mono">42% ASKS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
