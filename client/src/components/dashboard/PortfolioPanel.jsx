import { useState, useEffect } from 'react'
import { Wallet, BarChart3, Download, Briefcase } from 'lucide-react'
import { portfolioApi, analyticsApi } from '../../api/marketApi'
import toast from 'react-hot-toast'
import './PortfolioPanel.css'

export default function PortfolioPanel({ onSelect, refreshKey, onOpenAnalytics }) {
  const [data, setData] = useState({
    virtualBalance: 0,
    baseCurrency: 'INR',
    holdings: [],
    totalMarketValue: 0,
    totalUnrealizedPnl: 0,
    totalNetWorth: 0,
  })

  useEffect(() => {
    portfolioApi.get().then(setData).catch(() => {})
  }, [refreshKey])

  const currSymbol = data.baseCurrency === 'USD' ? '$' : '₹'

  const formatCurrency = (val) => {
    if (val == null) return '—'
    return `${currSymbol}${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }

  const handleExport = async (e) => {
    e.stopPropagation()
    try {
      await analyticsApi.exportCsv()
      toast.success('Transaction ledger downloaded')
    } catch {
      toast.error('Failed to export ledger')
    }
  }

  return (
    <div className="pf-panel">
      <div className="pf-header-row">
        <div className="pf-title">
          <Briefcase size={16} color="var(--accent)" />
          Virtual Investment Portfolio
        </div>
        <div className="pf-actions">
          <button className="pf-tool-btn" onClick={onOpenAnalytics}>
            <BarChart3 size={13} /> Performance Analytics
          </button>
          <button className="pf-tool-btn" onClick={handleExport} title="Download CSV Ledger">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      <div className="pf-balance-row">
        <div className="pf-balance-item">
          <div className="pf-label">
            <Wallet size={12} /> Available Capital
          </div>
          <div className="pf-value">{formatCurrency(data.virtualBalance)}</div>
        </div>
        <div className="pf-balance-item">
          <div className="pf-label">Holdings Valuation</div>
          <div className="pf-value">{formatCurrency(data.totalMarketValue)}</div>
        </div>
        <div className="pf-balance-item">
          <div className="pf-label">Unrealized P&amp;L</div>
          <div
            className={`pf-value ${data.totalUnrealizedPnl >= 0 ? 'gain' : 'loss'}`}
          >
            {data.totalUnrealizedPnl >= 0 ? '+' : ''}
            {formatCurrency(data.totalUnrealizedPnl)}
          </div>
        </div>
      </div>

      {data.holdings.length === 0 ? (
        <p className="side-panel-empty">
          No open positions. Search any symbol above to place institutional market or limit orders.
        </p>
      ) : (
        <div className="pf-table">
          <div className="pf-table-head">
            <span>Asset</span>
            <span>Quantity</span>
            <span>Avg Entry</span>
            <span>Live Price</span>
            <span>Net Return ({data.baseCurrency})</span>
          </div>
          {data.holdings.map((h) => {
            const isProfit = (h.unrealizedPnlBase || 0) >= 0
            return (
              <button
                key={h.symbol}
                className="pf-table-row"
                onClick={() => onSelect(h.symbol)}
              >
                <div className="pf-sym-block">
                  <span className="pf-sym">{h.symbol}</span>
                  <span className="pf-asset-curr">{h.name} · {h.assetCurrency}</span>
                </div>
                <span className="mono">{h.quantity}</span>
                <span className="mono">
                  {h.assetCurrency !== data.baseCurrency && `${h.assetCurrency} `}
                  {h.avgBuyPrice?.toFixed(2)}
                </span>
                <span className="mono">
                  {h.assetCurrency !== data.baseCurrency && `${h.assetCurrency} `}
                  {h.currentPrice != null ? h.currentPrice.toFixed(2) : '—'}
                </span>
                <div className="pf-pnl-block">
                  <span className={`mono ${isProfit ? 'gain' : 'loss'}`}>
                    {isProfit ? '+' : ''}
                    {formatCurrency(h.unrealizedPnlBase)}
                  </span>
                  <span className={`pf-pnl-pct ${isProfit ? 'gain' : 'loss'}`}>
                    ({isProfit ? '+' : ''}{h.pnlPercent}%)
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
