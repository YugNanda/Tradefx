import {
  Zap,
  BarChart2,
  Shield,
  Activity,
  Layers,
  FileSpreadsheet,
  Cpu,
  GitBranch,
} from 'lucide-react'
import './Features.css'

const ARCHITECTURE_BLOCKS = [
  {
    code: 'MOD-01',
    tag: '1.5S STREAM',
    tagType: 'mint',
    title: 'High-Frequency Tick Engine',
    desc: 'Sub-second WebSocket market feed with continuous Brownian drift simulation. Zero frozen prices and real-time tick broadcasting.',
    metrics: ['1.5s Interval', '50+ Streams', 'Zero Reconnect Drops'],
    icon: <Zap size={18} color="var(--mint)" />,
  },
  {
    code: 'MOD-02',
    tag: 'OHLCV V2',
    tagType: 'light-blue',
    title: 'Institutional Candlestick Engine',
    desc: 'High-precision TradingView-style candlestick engine with second-by-second countdown to bar close and live multi-timeframe switching.',
    metrics: ['1m, 5m, 15m, 1H, 1D', 'Count-to-Bar Timer', 'Volume Profiles'],
    icon: <BarChart2 size={18} color="var(--light-blue)" />,
  },
  {
    code: 'MOD-03',
    tag: 'QUANT CORE',
    tagType: 'indigo',
    title: 'Algorithmic Signal Pipeline',
    desc: 'Automated 14-period RSI calculations, MACD histograms, SMA 20/50 crosses, and ATR risk-management Stop-Loss & Take-Profit targets.',
    metrics: ['RSI 14 / MACD', 'SMA Golden Cross', 'ATR Target Bounds'],
    icon: <Cpu size={18} color="var(--indigo)" />,
  },
  {
    code: 'MOD-04',
    tag: 'RISK CONTROL',
    tagType: 'mint',
    title: 'Multi-Asset Atomic Settlement',
    desc: 'Atomic balance locks prevent race conditions on market & limit orders. Real-time USD/INR FX normalization for cross-border assets.',
    metrics: ['Atomic Locking', '0.05% Sim Brokerage', 'Real-Time FX Bridge'],
    icon: <Layers size={18} color="var(--mint)" />,
  },
  {
    code: 'MOD-05',
    tag: 'LEDGER AUDIT',
    tagType: 'light-blue',
    title: 'Institutional Audit Ledger',
    desc: 'Audited transaction history with live realized & unrealized P&L recalculation and 1-click comprehensive CSV transaction ledger export.',
    metrics: ['Real-Time P&L Flashes', 'Sharpe Ratio Modeling', 'CSV Export'],
    icon: <FileSpreadsheet size={18} color="var(--light-blue)" />,
  },
  {
    code: 'MOD-06',
    tag: 'SECURITY',
    tagType: 'indigo',
    title: 'Hardened Security & 2FA Auth',
    desc: 'Cryptographic 6-digit OTP verification, helmet headers, rate-limiting on endpoints, and NoSQL injection sanitization.',
    metrics: ['6-Digit OTP 2FA', 'Rate Limiting', 'Zero Real-Capital Risk'],
    icon: <Shield size={18} color="var(--indigo)" />,
  },
]

export default function Features() {
  return (
    <section className="features" id="features">
      <div className="section-inner">
        <div className="section-header">
          <div className="section-eyebrow mono">INFRASTRUCTURE SPECIFICATION</div>
          <h2 className="section-title">Engineered For High-Precision Trading</h2>
          <p className="section-sub">
            Modular architecture designed to replicate Tier-1 institutional trading terminals with mathematical fidelity.
          </p>
        </div>

        <div className="features-grid">
          {ARCHITECTURE_BLOCKS.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="fc-top">
                <div className="fc-code mono">{f.code}</div>
                <div className={`fc-tag mono ${f.tagType}`}>{f.tag}</div>
              </div>

              <div className="fc-icon-wrapper">{f.icon}</div>

              <h3 className="fc-title">{f.title}</h3>
              <p className="fc-desc">{f.desc}</p>

              <div className="fc-specs">
                {f.metrics.map((m, idx) => (
                  <span key={idx} className="fc-spec-pill mono">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
