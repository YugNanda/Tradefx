import { useState, useEffect } from 'react'
import './Ticker.css'

const BASE = [
  { sym: 'NIFTY 50', price: 22147.25, chg: 0.96 },
  { sym: 'SENSEX',   price: 73215.40, chg: 0.78 },
  { sym: 'BANKNIFTY',price: 48320.15, chg: 1.14 },
  { sym: 'RELIANCE', price: 2847.30,  chg: 1.24 },
  { sym: 'TCS',      price: 3921.55,  chg: 0.87 },
  { sym: 'INFY',     price: 1456.20,  chg: -0.43 },
  { sym: 'HDFC',     price: 1672.80,  chg: 2.11 },
  { sym: 'WIPRO',    price: 512.40,   chg: -0.35 },
  { sym: 'AAPL',     price: 189.34,   chg: 1.67 },
  { sym: 'NVDA',     price: 824.55,   chg: 4.32 },
  { sym: 'TSLA',     price: 238.77,   chg: -1.88 },
  { sym: 'MSFT',     price: 415.20,   chg: 0.55 },
  { sym: 'GOOGL',    price: 174.90,   chg: 1.22 },
  { sym: 'BTC/USD',  price: 67342,    chg: 3.21 },
  { sym: 'ETH/USD',  price: 3521,     chg: 2.14 },
  { sym: 'EUR/USD',  price: 1.0842,   chg: -0.12 },
  { sym: 'GBP/USD',  price: 1.2710,   chg: 0.08 },
  { sym: 'USD/INR',  price: 83.42,    chg: -0.04 },
]

const fmt = (price, sym) => {
  if (sym.includes('/')) return price.toFixed(sym === 'BTC/USD' ? 0 : sym.includes('USD/') ? 2 : 4)
  if (price > 10000) return price.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  return price.toFixed(2)
}

export default function Ticker() {
  const [prices, setPrices] = useState(BASE.map(b => ({ ...b })))

  useEffect(() => {
    const t = setInterval(() => {
      setPrices(prev => prev.map(item => {
        const drift = (Math.random() - 0.49) * item.price * 0.0008
        const newPrice = Math.max(0.01, item.price + drift)
        const newChg = item.chg + (Math.random() - 0.5) * 0.04
        return { ...item, price: newPrice, chg: Math.round(newChg * 100) / 100 }
      }))
    }, 1800)
    return () => clearInterval(t)
  }, [])

  const items = [...prices, ...prices]

  return (
    <div className="ticker-bar">
      <div className="ticker-live">
        <span className="ticker-dot" />
        LIVE
      </div>
      <div className="ticker-track">
        <div className="ticker-inner">
          {items.map((t, i) => (
            <span key={i} className="ticker-item">
              <span className="t-sym">{t.sym}</span>
              <span className="t-price">{fmt(t.price, t.sym)}</span>
              <span className={`t-chg ${t.chg >= 0 ? 'up' : 'dn'}`}>
                {t.chg >= 0 ? '+' : ''}{t.chg.toFixed(2)}%
              </span>
              <span className="t-divider" />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
