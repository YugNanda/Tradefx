import { useState, useEffect } from 'react'
import './Markets.css'

const MARKETS = [
  { name: 'NIFTY 50',   exch: 'NSE',     base: 22147, flag: '🇮🇳' },
  { name: 'SENSEX',     exch: 'BSE',     base: 73215, flag: '🇮🇳' },
  { name: 'S&P 500',    exch: 'NYSE',    base: 5234,  flag: '🇺🇸' },
  { name: 'NASDAQ',     exch: 'US',      base: 16420, flag: '🇺🇸' },
  { name: 'BTC/USD',    exch: 'CRYPTO',  base: 67342, flag: '₿' },
  { name: 'ETH/USD',    exch: 'CRYPTO',  base: 3521,  flag: 'Ξ' },
  { name: 'EUR/USD',    exch: 'FOREX',   base: 1.0842,flag: '💱' },
  { name: 'GOLD',       exch: 'COMMOD',  base: 2312,  flag: '🥇' },
]

const sparkLine = (base) => {
  const pts = Array.from({ length: 12 }, (_, i) => ({
    x: (i / 11) * 100,
    y: 50 + (Math.sin(i * 0.8) + Math.random() * 1.5 - 0.75) * 20
  }))
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

export default function Markets() {
  const [prices, setPrices] = useState(
    MARKETS.map(m => ({ ...m, price: m.base, chg: (Math.random() * 4 - 1.5).toFixed(2), path: sparkLine(m.base) }))
  )

  useEffect(() => {
    const t = setInterval(() => {
      setPrices(prev => prev.map(m => {
        const drift = (Math.random() - 0.48) * m.price * 0.0012
        return { ...m, price: Math.max(0.001, m.price + drift) }
      }))
    }, 2000)
    return () => clearInterval(t)
  }, [])

  const fmt = (p, name) => {
    if (name.includes('/') && !name.includes('BTC') && !name.includes('ETH'))
      return p.toFixed(4)
    if (p > 1000) return p.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    return p.toFixed(2)
  }

  return (
    <section className="markets" id="markets">
      <div className="section-inner">
        <div className="section-header">
          <div className="section-eyebrow">Global Coverage</div>
          <h2 className="section-title">Every market. One platform.</h2>
          <p className="section-sub">From Dalal Street to Wall Street — trade Indian equities, US stocks, crypto, forex, and commodities.</p>
        </div>

        <div className="markets-grid">
          {prices.map((m, i) => {
            const up = parseFloat(m.chg) >= 0
            return (
              <div key={i} className="market-card" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="mc-top">
                  <div className="mc-left">
                    <span className="mc-flag">{m.flag}</span>
                    <div>
                      <div className="mc-name">{m.name}</div>
                      <div className="mc-exch">{m.exch}</div>
                    </div>
                  </div>
                  <span className={`mc-badge ${up ? 'up' : 'dn'}`}>
                    {up ? '+' : ''}{m.chg}%
                  </span>
                </div>
                <div className="mc-price">{fmt(m.price, m.name)}</div>
                <svg className="mc-spark" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d={m.path} fill="none" stroke={up ? 'var(--gain)' : 'var(--loss)'} strokeWidth="2" />
                </svg>
              </div>
            )
          })}
        </div>

        <div className="markets-more">
          <span>+40 more instruments available including</span>
          <div className="markets-tags">
            {['BANKNIFTY','MIDCAP150','DAX','FTSE 100','USD/JPY','SOL/USD','Silver','Crude Oil'].map(t => (
              <span key={t} className="mtag">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
