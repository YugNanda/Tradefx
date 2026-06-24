import { useState, useEffect } from 'react'
import { X, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { watchlistApi } from '../../api/marketApi'
import { useLiveQuotes } from '../../context/MarketContext'
import './SidePanel.css'

export default function WatchlistPanel({ onSelect, refreshKey }) {
  const [items, setItems] = useState([])
  const symbols = items.map((i) => i.symbol)
  const quotes = useLiveQuotes(symbols)

  const load = () => watchlistApi.get().then(setItems).catch(() => {})

  useEffect(() => {
    load()
  }, [refreshKey])

  const remove = async (e, symbol) => {
    e.stopPropagation()
    try {
      const updated = await watchlistApi.remove(symbol)
      setItems(updated)
    } catch (err) {
      toast.error('Could not remove from watchlist')
    }
  }

  return (
    <div className="side-panel">
      <div className="side-panel-head">
        <Star size={15} />
        <h3>Watchlist</h3>
      </div>
      {items.length === 0 && <p className="side-panel-empty">Search a symbol and add it to your watchlist.</p>}
      <div className="side-panel-list">
        {items.map((item) => {
          const q = quotes[item.symbol]
          const up = (q?.changePercent ?? 0) >= 0
          return (
            <button key={item.symbol} className="wl-row" onClick={() => onSelect(item.symbol)}>
              <div className="wl-left">
                <span className="wl-symbol">{item.symbol}</span>
                <span className="wl-name">{item.name}</span>
              </div>
              <div className="wl-right">
                <span className="wl-price">{q ? q.price.toFixed(2) : '—'}</span>
                {q && typeof q.changePercent === 'number' && (
                  <span className={`wl-chg ${up ? 'gain' : 'loss'}`}>
                    {up ? '+' : ''}{q.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>
              <span className="wl-remove" onClick={(e) => remove(e, item.symbol)}>
                <X size={13} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
