import { useState, useEffect, useRef, useMemo } from 'react'
import { Wallet, BarChart3, Download, Briefcase, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { portfolioApi, analyticsApi } from '../../api/marketApi'
import { useLiveQuotes } from '../../context/MarketContext'
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

  const [tickFlashes, setTickFlashes] = useState({}) // symbol -> 'gain' | 'loss'
  const prevPricesRef = useRef({})

  useEffect(() => {
    portfolioApi.get().then(setData).catch(() => {})
  }, [refreshKey])

  // Extract all active holding symbols for live socket stream subscription
  const holdingSymbols = useMemo(() => {
    return (data.holdings || []).map((h) => h.symbol).filter(Boolean)
  }, [data.holdings])

  const liveQuotes = useLiveQuotes(holdingSymbols)

  // Detect tick fluctuations and trigger pulse flashes
  useEffect(() => {
    if (!holdingSymbols.length) return
    const newFlashes = {}
    let changed = false

    holdingSymbols.forEach((sym) => {
      const q = liveQuotes[sym]
      if (q && q.price != null) {
        const prev = prevPricesRef.current[sym]
        if (prev != null && prev !== q.price) {
          newFlashes[sym] = q.price > prev ? 'gain' : 'loss'
          changed = true
        }
        prevPricesRef.current[sym] = q.price
      }
    })

    if (changed) {
      setTickFlashes((f) => ({ ...f, ...newFlashes }))
      const timer = setTimeout(() => {
        setTickFlashes((f) => {
          const cleared = { ...f }
          Object.keys(newFlashes).forEach((k) => delete cleared[k])
          return cleared
        })
      }, 900)
      return () => clearTimeout(timer)
    }
  }, [liveQuotes, holdingSymbols])

  const currSymbol = data.baseCurrency === 'USD' ? '$' : '₹'

  const formatCurrency = (val) => {
    if (val == null) return '—'
    return `${currSymbol}${Number(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // Dynamic real-time calculation of live holdings and portfolio aggregates
  const { calculatedHoldings, liveTotalMarketValue, liveTotalUnrealizedPnl, liveTotalNetWorth } =
    useMemo(() => {
      const baseCurr = data.baseCurrency || 'INR'
      let totalVal = 0
      let totalPnl = 0

      const calculated = (data.holdings || []).map((h) => {
        const live = liveQuotes[h.symbol]
        const currentPrice = live?.price ?? h.currentPrice ?? h.avgBuyPrice
        const diffPerUnit = currentPrice - h.avgBuyPrice
        const unrealizedAsset = diffPerUnit * h.quantity
        const pnlPct = h.avgBuyPrice > 0 ? (diffPerUnit / h.avgBuyPrice) * 100 : 0

        // Multi-currency conversion factor
        let fxRate = 1
        if (h.assetCurrency !== baseCurr) {
          if (h.assetCurrency === 'USD' && baseCurr === 'INR') fxRate = 83.5
          else if (h.assetCurrency === 'INR' && baseCurr === 'USD') fxRate = 1 / 83.5
        }

        const unrealizedBase = unrealizedAsset * fxRate
        const marketValueBase = currentPrice * h.quantity * fxRate

        totalVal += marketValueBase
        totalPnl += unrealizedBase

        return {
          ...h,
          currentPrice,
          unrealizedPnlBase: unrealizedBase,
          pnlPercent: Number(pnlPct.toFixed(2)),
          changePercent: live?.changePercent,
        }
      })

      const netWorth = (data.virtualBalance || 0) + totalVal

      return {
        calculatedHoldings: calculated,
        liveTotalMarketValue: totalVal,
        liveTotalUnrealizedPnl: totalPnl,
        liveTotalNetWorth: netWorth,
      }
    }, [data, liveQuotes])

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
          <span>Virtual Investment Portfolio</span>
          <span className="pf-live-badge">
            <span className="pf-pulse-dot" />
            LIVE TICKING
          </span>
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
          <div className="pf-value">{formatCurrency(liveTotalMarketValue)}</div>
        </div>

        <div className="pf-balance-item">
          <div className="pf-label">Unrealized P&amp;L</div>
          <div
            className={`pf-value ${liveTotalUnrealizedPnl >= 0 ? 'gain' : 'loss'} pf-pnl-live`}
          >
            {liveTotalUnrealizedPnl >= 0 ? '+' : ''}
            {formatCurrency(liveTotalUnrealizedPnl)}
          </div>
        </div>

        <div className="pf-balance-item pf-networth-item">
          <div className="pf-label">
            <Activity size={12} /> Total Net Worth
          </div>
          <div className="pf-value mono">{formatCurrency(liveTotalNetWorth)}</div>
        </div>
      </div>

      {calculatedHoldings.length === 0 ? (
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
          {calculatedHoldings.map((h) => {
            const isProfit = (h.unrealizedPnlBase || 0) >= 0
            const flash = tickFlashes[h.symbol]

            return (
              <button
                key={h.symbol}
                className={`pf-table-row ${flash ? `pf-row-${flash}` : ''}`}
                onClick={() => onSelect(h.symbol)}
              >
                <div className="pf-sym-block">
                  <div className="pf-sym-line">
                    <span className="pf-sym">{h.symbol}</span>
                    {flash && (
                      <span className={`pf-flash-indicator ${flash}`}>
                        {flash === 'gain' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      </span>
                    )}
                  </div>
                  <span className="pf-asset-curr">
                    {h.name} · {h.assetCurrency}
                  </span>
                </div>

                <span className="mono">{h.quantity}</span>

                <span className="mono">
                  {h.assetCurrency !== data.baseCurrency && `${h.assetCurrency} `}
                  {h.avgBuyPrice?.toFixed(2)}
                </span>

                <span className={`mono pf-price-cell ${flash ? `price-flash-${flash}` : ''}`}>
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

