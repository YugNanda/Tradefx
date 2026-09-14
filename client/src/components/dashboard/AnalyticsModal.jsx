import { useState, useEffect } from 'react'
import { X, Download, RotateCcw, TrendingUp, BarChart3, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyticsApi } from '../../api/marketApi'
import './AnalyticsModal.css'

export default function AnalyticsModal({ onClose, onResetCompleted }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    analyticsApi
      .get()
      .then(setData)
      .catch(() => toast.error('Could not load performance analytics'))
      .finally(() => setLoading(false))
  }, [])

  const handleExport = async () => {
    try {
      await analyticsApi.exportCsv()
      toast.success('Transaction ledger exported to CSV')
    } catch {
      toast.error('Failed to export ledger')
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Reset your virtual trading account to starting ₹100,000 balance? All holdings will be cleared.')) {
      return
    }
    setResetting(true)
    try {
      await analyticsApi.resetBalance()
      toast.success('Account reset to ₹100,000')
      onResetCompleted?.()
      onClose()
    } catch {
      toast.error('Reset failed')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="analytics-modal-box">
        <div className="modal-title-row">
          <h2>
            <BarChart3 size={20} color="var(--accent)" />
            Portfolio Performance Analytics
          </h2>
          <button className="modal-close-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
            Calculating quantitative portfolio metrics…
          </div>
        ) : data ? (
          <>
            {/* Primary Net Worth Grid */}
            <div className="an-stats-grid">
              <div className="an-card">
                <div className="an-label">Net Portfolio Worth</div>
                <div className="an-value">
                  {data.summary.baseCurrency} {data.summary.totalNetWorth.toLocaleString()}
                </div>
              </div>
              <div className="an-card">
                <div className="an-label">Total Return</div>
                <div className={`an-value ${data.summary.totalReturnPercent >= 0 ? 'gain' : 'loss'}`}>
                  {data.summary.totalReturnPercent >= 0 ? '+' : ''}{data.summary.totalReturnPercent}%
                </div>
              </div>
              <div className="an-card">
                <div className="an-label">Realized P&amp;L</div>
                <div className={`an-value ${data.summary.totalRealizedPnl >= 0 ? 'gain' : 'loss'}`}>
                  {data.summary.totalRealizedPnl >= 0 ? '+' : ''}{data.summary.baseCurrency} {data.summary.totalRealizedPnl.toLocaleString()}
                </div>
              </div>
              <div className="an-card">
                <div className="an-label">Unrealized P&amp;L</div>
                <div className={`an-value ${data.summary.totalUnrealizedPnl >= 0 ? 'gain' : 'loss'}`}>
                  {data.summary.totalUnrealizedPnl >= 0 ? '+' : ''}{data.summary.baseCurrency} {data.summary.totalUnrealizedPnl.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Quantitative Trading Metrics */}
            <div className="an-section-title">Institutional Trading Metrics</div>
            <div className="an-stats-grid">
              <div className="an-card">
                <div className="an-label">Win Rate</div>
                <div className="an-value">{data.tradingMetrics.winRate}%</div>
              </div>
              <div className="an-card">
                <div className="an-label">Profit Factor</div>
                <div className="an-value">{data.tradingMetrics.profitFactor}</div>
              </div>
              <div className="an-card">
                <div className="an-label">Est. Sharpe Ratio</div>
                <div className="an-value">{data.tradingMetrics.sharpeRatio}</div>
              </div>
              <div className="an-card">
                <div className="an-label">Total Executions</div>
                <div className="an-value">{data.tradingMetrics.totalTrades}</div>
              </div>
            </div>

            {/* Asset Allocation Breakdown */}
            <div className="an-section-title">Asset Allocation Distribution</div>
            <div className="an-allocation-bars">
              {[
                { name: 'Cash', pct: data.allocation.cash, color: 'var(--accent)' },
                { name: 'Stocks', pct: data.allocation.stocks, color: '#10B981' },
                { name: 'Crypto', pct: data.allocation.crypto, color: '#F59E0B' },
                { name: 'Forex', pct: data.allocation.forex, color: '#8B5CF6' },
                { name: 'Indices', pct: data.allocation.indices, color: '#EC4899' },
              ].map((item) => (
                <div key={item.name} className="an-alloc-row">
                  <span className="an-alloc-name">{item.name}</span>
                  <div className="an-alloc-track">
                    <div
                      className="an-alloc-fill"
                      style={{ width: `${Math.min(100, item.pct)}%`, background: item.color }}
                    />
                  </div>
                  <span className="an-alloc-pct">{item.pct}%</span>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="an-actions-row">
              <button className="an-btn an-btn-danger" onClick={handleReset} disabled={resetting}>
                <RotateCcw size={14} /> Reset Account
              </button>
              <button className="an-btn an-btn-primary" onClick={handleExport}>
                <Download size={14} /> Export CSV Ledger
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
