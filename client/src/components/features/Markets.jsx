import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import './Markets.css'

const ALL_MARKETS = [
  { name: 'NIFTY 50',   exch: 'NSE',     cat: 'in',  base: 22450.75, curr: '₹', flag: '🇮🇳' },
  { name: 'SENSEX',     exch: 'BSE',     cat: 'in',  base: 73850.20, curr: '₹', flag: '🇮🇳' },
  { name: 'RELIANCE',   exch: 'NSE',     cat: 'in',  base: 2865.40,  curr: '₹', flag: '🇮🇳' },
  { name: 'TCS',        exch: 'NSE',     cat: 'in',  base: 3945.20,  curr: '₹', flag: '🇮🇳' },
  { name: 'HDFCBANK',   exch: 'NSE',     cat: 'in',  base: 1680.15,  curr: '₹', flag: '🇮🇳' },
  { name: 'AAPL',       exch: 'NASDAQ',  cat: 'us',  base: 189.84,   curr: '$', flag: '🇺🇸' },
  { name: 'NVDA',       exch: 'NASDAQ',  cat: 'us',  base: 835.20,   curr: '$', flag: '🇺🇸' },
  { name: 'MSFT',       exch: 'NASDAQ',  cat: 'us',  base: 420.55,   curr: '$', flag: '🇺🇸' },
  { name: 'BTC/USD',    exch: 'CRYPTO',  cat: 'cr',  base: 67450.00, curr: '$', flag: '₿' },
  { name: 'ETH/USD',    exch: 'CRYPTO',  cat: 'cr',  base: 3540.20,  curr: '$', flag: 'Ξ' },
  { name: 'SOL/USD',    exch: 'CRYPTO',  cat: 'cr',  base: 154.80,   curr: '$', flag: '◎' },
  { name: 'EUR/USD',    exch: 'FOREX',   cat: 'fx',  base: 1.0864,   curr: '$', flag: '💶' },
  { name: 'USD/INR',    exch: 'FOREX',   cat: 'fx',  base: 83.52,    curr: '₹', flag: '💱' },
  { name: 'GOLD',       exch: 'COMMOD',  cat: 'fx',  base: 2654.80,  curr: '$', flag: '🥇' },
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
        <div className="section-header">
          <div className="section-eyebrow">Institutional Multi-Asset Feed</div>
          <h2 className="section-title">50+ Global Markets. Ticking Live.</h2>
          <p className="section-sub">
            From Dalal Street to Wall Street — trade Indian equities, US tech giants, crypto, and forex with zero financial risk.
          </p>
        </div>

        {/* Market Category Selector */}
        <div className="markets-category-bar">
          {[
            ['all', 'All Instruments'],
            ['in', 'NSE & BSE Equities'],
            ['us', 'US Blue-Chips (NASDAQ)'],
            ['cr', 'Crypto Assets'],
            ['fx', 'Forex & Commodities'],
          ].map(([catKey, label]) => (
            <button
              key={catKey}
              className={`cat-btn ${selectedCat === catKey ? 'active' : ''}`}
              onClick={() => setSelectedCat(catKey)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="markets-grid">
          {filtered.map((m, i) => {
            const up = parseFloat(m.chg) >= 0
            return (
              <div
                key={m.name}
                className="market-card"
                onClick={() => onOpenAuth?.('signup')}
                title="Click to trade with ₹10L virtual capital"
              >
                <div className="mc-top">
                  <div className="mc-left">
                    <span className="mc-flag">{m.flag}</span>
                    <div>
                      <div className="mc-name">{m.name}</div>
                      <div className="mc-exch">{m.exch}</div>
                    </div>
                  </div>
                  <span className={`mc-badge ${up ? 'up' : 'dn'}`}>
                    {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {up ? '+' : ''}{m.chg}%
                  </span>
                </div>

                <div className="mc-price mono">{fmt(m.price, m.curr)}</div>

                <svg className="mc-spark" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d={m.path}
                    fill="none"
                    stroke={up ? '#10B981' : '#EF4444'}
                    strokeWidth="2.2"
                  />
                </svg>

                <div className="mc-action-overlay">
                  <span>Trade Free &rarr;</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="markets-more">
          <span>+40 more institutional assets available in TradeX terminal including</span>
          <div className="markets-tags">
            {['BANKNIFTY', 'MIDCAP150', 'DAX 40', 'FTSE 100', 'GBP/USD', 'USD/JPY', 'Silver', 'Crude Oil (WTI)'].map(
              (t) => (
                <span key={t} className="mtag">
                  {t}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

