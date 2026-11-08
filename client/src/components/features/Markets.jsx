import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, ChevronRight, Filter } from 'lucide-react'
import './Markets.css'

const ALL_MARKETS = [
  { name: 'NIFTY 50',   exch: 'NSE',     cat: 'in',  base: 22450.75, curr: '₹', flag: 'NSE' },
  { name: 'SENSEX',     exch: 'BSE',     cat: 'in',  base: 73850.20, curr: '₹', flag: 'BSE' },
  { name: 'RELIANCE',   exch: 'NSE',     cat: 'in',  base: 2865.40,  curr: '₹', flag: 'NSE' },
  { name: 'TCS',        exch: 'NSE',     cat: 'in',  base: 3945.20,  curr: '₹', flag: 'NSE' },
  { name: 'HDFCBANK',   exch: 'NSE',     cat: 'in',  base: 1680.15,  curr: '₹', flag: 'NSE' },
  { name: 'AAPL',       exch: 'NASDAQ',  cat: 'us',  base: 189.84,   curr: '$', flag: 'US' },
  { name: 'NVDA',       exch: 'NASDAQ',  cat: 'us',  base: 835.20,   curr: '$', flag: 'US' },
  { name: 'MSFT',       exch: 'NASDAQ',  cat: 'us',  base: 420.55,   curr: '$', flag: 'US' },
  { name: 'BTC/USD',    exch: 'CRYPTO',  cat: 'cr',  base: 67450.00, curr: '$', flag: 'BTC' },
  { name: 'ETH/USD',    exch: 'CRYPTO',  cat: 'cr',  base: 3540.20,  curr: '$', flag: 'ETH' },
  { name: 'SOL/USD',    exch: 'CRYPTO',  cat: 'cr',  base: 154.80,   curr: '$', flag: 'SOL' },
  { name: 'EUR/USD',    exch: 'FOREX',   cat: 'fx',  base: 1.0864,   curr: '$', flag: 'FX' },
  { name: 'USD/INR',    exch: 'FOREX',   cat: 'fx',  base: 83.52,    curr: '₹', flag: 'FX' },
  { name: 'GOLD',       exch: 'COMMOD',  cat: 'fx',  base: 2654.80,  curr: '$', flag: 'XAU' },
]

const sparkLine = () => {
  const pts = Array.from({ length: 14 }, (_, i) => ({
    x: (i / 13) * 100,
    y: 50 + (Math.sin(i * 0.9) + Math.random() * 1.4 - 0.7) * 22,
  }))
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}

export default function Markets({ onOpenAuth }) {
  const [selectedCat, setSelectedCat] = useState('all')
  const [prices, setPrices] = useState(() =>
    ALL_MARKETS.map((m) => ({
      ...m,
      price: m.base,
      chg: (Math.random() * 3.5 - 1.2).toFixed(2),
      path: sparkLine(),
    }))
  )

  useEffect(() => {
    const t = setInterval(() => {
      setPrices((prev) =>
        prev.map((m) => {
          const drift = (Math.random() - 0.48) * m.price * 0.0008
          return { ...m, price: Math.max(0.001, m.price + drift) }
        })
      )
    }, 1800)
    return () => clearInterval(t)
  }, [])

  const fmt = (p, curr) => {
    if (p < 2) return `${curr}${p.toFixed(4)}`
    return `${curr}${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const filtered = selectedCat === 'all' ? prices : prices.filter((p) => p.cat === selectedCat)

  return (
    <section className="markets" id="markets">
      <div className="section-inner">
        <div className="markets-head-row">
          <div>
            <div className="section-eyebrow mono">MULTI-ASSET CATALOG</div>
            <h2 className="section-title">Institutional Market Watch</h2>
            <p className="section-sub">
              Live streaming quotes for Indian Equities, US Blue-Chips, Crypto Spot, and Forex.
            </p>
          </div>

          {/* Segmented Category Filter */}
          <div className="markets-seg-filter">
            {[
              ['all', 'ALL ASSETS'],
              ['in', 'NSE / BSE'],
              ['us', 'US EQUITIES'],
              ['cr', 'CRYPTO'],
              ['fx', 'FOREX & COMMOD'],
            ].map(([catKey, label]) => (
              <button
                key={catKey}
                className={`seg-btn mono ${selectedCat === catKey ? 'active' : ''}`}
                onClick={() => setSelectedCat(catKey)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* High-Density Quotes Matrix */}
        <div className="markets-matrix">
          {filtered.map((m) => {
            const up = parseFloat(m.chg) >= 0
            const strokeColor = up ? '#52FFA5' : '#FF4365'

            return (
              <div
                key={m.name}
                className="matrix-card"
                onClick={() => onOpenAuth?.('signup')}
                title={`Open ${m.name} in Trading Terminal`}
              >
                <div className="mc-header">
                  <div className="mc-sym-group">
                    <span className="mc-sym mono">{m.name}</span>
                    <span className="mc-exch mono">{m.exch}</span>
                  </div>
                  <div className={`mc-badge mono ${up ? 'up' : 'dn'}`}>
                    {up ? '+' : ''}{m.chg}%
                  </div>
                </div>

                <div className="mc-price-row">
                  <span className="mc-price mono">{fmt(m.price, m.curr)}</span>
                  <div className="mc-sparkline">
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                      <path d={m.path} fill="none" stroke={strokeColor} strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                <div className="mc-footer-action">
                  <span className="mc-trade-label mono">TRADE VIRTUAL</span>
                  <ChevronRight size={12} color="var(--light-blue)" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
