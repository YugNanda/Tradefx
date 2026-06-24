import { useLiveQuotes } from '../../context/MarketContext'
import '../ticker/Ticker.css'

const TRACKED = ['NIFTY50', 'BTC', 'AAPL']

const fmt = (n) => {
  if (n == null) return '—'
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  return n.toFixed(n < 10 ? 4 : 2)
}

export default function LiveTicker() {
  const quotes = useLiveQuotes(TRACKED)

  const items = TRACKED.map((sym) => quotes[sym]).filter(Boolean)
  const display = items.length ? [...items, ...items] : []

  return (
    <div className="ticker-bar">
      <div className="ticker-live">
        <span className="ticker-dot" />
        {items.length ? 'LIVE' : 'CONNECTING'}
      </div>
      <div className="ticker-track">
        <div className="ticker-inner">
          {display.length === 0 && (
            <span className="ticker-item">
              <span className="t-sym">Fetching live prices…</span>
            </span>
          )}
          {display.map((t, i) => (
            <span key={`${t.symbol}-${i}`} className="ticker-item">
              <span className="t-sym">{t.symbol}</span>
              <span className="t-price">{fmt(t.price)}</span>
              {typeof t.changePercent === 'number' && (
                <span className={`t-chg ${t.changePercent >= 0 ? 'up' : 'dn'}`}>
                  {t.changePercent >= 0 ? '+' : ''}
                  {t.changePercent.toFixed(2)}%
                </span>
              )}
              {t.stale && <span className="t-chg" style={{ color: 'var(--warn)' }}>delayed</span>}
              <span className="t-divider" />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
