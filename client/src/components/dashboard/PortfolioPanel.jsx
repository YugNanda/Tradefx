import { useState, useEffect } from 'react'
import { Wallet } from 'lucide-react'
import { portfolioApi } from '../../api/marketApi'
import './PortfolioPanel.css'

const currency = (n, code = 'INR') =>
  n == null ? '—' : n.toLocaleString('en-IN', { style: 'currency', currency: code, maximumFractionDigits: 2 })

export default function PortfolioPanel({ onSelect, refreshKey }) {
  const [data, setData] = useState({ virtualBalance: 0, holdings: [] })

  useEffect(() => {
    portfolioApi.get().then(setData).catch(() => {})
  }, [refreshKey])

  const totalMarketValue = data.holdings.reduce((sum, h) => sum + (h.marketValue || 0), 0)
  const totalPnl = data.holdings.reduce((sum, h) => sum + (h.unrealizedPnl || 0), 0)

  return (
    <div className="pf-panel">
      <div className="pf-balance-row">
        <div className="pf-balance-item">
          <div className="pf-label"><Wallet size={12} /> Cash balance</div>
          <div className="pf-value">{currency(data.virtualBalance)}</div>
        </div>
        <div className="pf-balance-item">
          <div className="pf-label">Holdings value</div>
          <div className="pf-value">{currency(totalMarketValue)}</div>
        </div>
        <div className="pf-balance-item">
          <div className="pf-label">Unrealized P&amp;L</div>
          <div className={`pf-value ${totalPnl >= 0 ? 'gain' : 'loss'}`}>
            {totalPnl >= 0 ? '+' : ''}{currency(totalPnl)}
          </div>
        </div>
      </div>

      {data.holdings.length === 0 ? (
        <p className="side-panel-empty">No open positions yet — buy something to get started.</p>
      ) : (
        <div className="pf-table">
          <div className="pf-table-head">
            <span>Symbol</span>
            <span>Qty</span>
            <span>Avg cost</span>
            <span>Price</span>
            <span>P&amp;L</span>
          </div>
          {data.holdings.map((h) => (
            <button key={h.symbol} className="pf-table-row" onClick={() => onSelect(h.symbol)}>
              <span className="pf-sym">{h.symbol}</span>
              <span>{h.quantity}</span>
              <span className="mono">{h.avgBuyPrice?.toFixed(2)}</span>
              <span className="mono">{h.currentPrice != null ? h.currentPrice.toFixed(2) : '—'}</span>
              <span className={`mono ${h.unrealizedPnl >= 0 ? 'gain' : 'loss'}`}>
                {h.unrealizedPnl != null ? `${h.unrealizedPnl >= 0 ? '+' : ''}${h.unrealizedPnl.toFixed(2)}` : '—'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
