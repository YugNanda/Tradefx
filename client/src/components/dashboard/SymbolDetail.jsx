import { useState, useEffect, useCallback, useMemo } from 'react'
import ReactApexChart from 'react-apexcharts'
import toast from 'react-hot-toast'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart2,
  LineChart,
  ShieldCheck,
  Zap,
  Clock,
  Layers,
  Flame,
} from 'lucide-react'
import { marketApi, portfolioApi, signalsApi } from '../../api/marketApi'
import { useLiveQuotes } from '../../context/MarketContext'
import { useTheme } from '../../context/ThemeContext'
import CandleChartSvg from './CandleChartSvg'
import './SymbolDetail.css'

const TF_INTERVALS = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1H': 3600,
  '1D': 86400,
}

function getSecondsToNextBar(tf) {
  const interval = TF_INTERVALS[tf] || 60
  const nowSec = Math.floor(Date.now() / 1000)
  const rem = interval - (nowSec % interval)
  return rem > 0 ? rem : interval
}

function formatCountdown(sec) {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function SymbolDetail({ instrument, onTraded, refreshKey }) {
  const symbol = instrument?.symbol
  const live = useLiveQuotes(symbol ? [symbol] : [])
  const quote = symbol ? live[symbol] : null
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [chartType, setChartType] = useState('candlestick') // 'candlestick' | 'area'
  const [timeframe, setTimeframe] = useState('1m') // '1m' | '5m' | '15m' | '1H' | '1D'
  const [candles, setCandles] = useState([])
  const [chartLoading, setChartLoading] = useState(false)

  // Technical Indicators state
  const [indicators, setIndicators] = useState({ sma: false, ema: false, bb: false, rsi: false })
  const toggleIndicator = (name) => setIndicators((prev) => ({ ...prev, [name]: !prev[name] }))

  // Active user position for this symbol
  const [activeHolding, setActiveHolding] = useState(null)
  const [closingTrade, setClosingTrade] = useState(false)

  // ── "Count to Bar" Countdown Timer ──
  const [barSecondsLeft, setBarSecondsLeft] = useState(() => getSecondsToNextBar('1m'))

  const [signal, setSignal] = useState(null)
  const [signalLoading, setSignalLoading] = useState(false)

  const [orderType, setOrderType] = useState('MARKET') // 'MARKET' | 'LIMIT' | 'CLOSE'
  const [qty, setQty] = useState(1)
  const [tradeLoading, setTradeLoading] = useState(false)

  // Fetch active holding for current symbol
  const loadActiveHolding = useCallback(() => {
    if (!symbol) {
      setActiveHolding(null)
      return
    }
    portfolioApi
      .get()
      .then((data) => {
        const found = (data.holdings || []).find((h) => h.symbol === symbol)
        setActiveHolding(found || null)
      })
      .catch(() => {})
  }, [symbol])

  useEffect(() => {
    loadActiveHolding()
  }, [loadActiveHolding, refreshKey])

  // Load OHLC historical candle sequence
  const loadCandleHistory = useCallback((sym, tf) => {
    if (!sym) return
    setChartLoading(true)
    marketApi
      .getOhlc(sym, tf)
      .then((data) => {
        if (data.candles && data.candles.length) {
          setCandles(data.candles)
        }
      })
      .catch(() => {})
      .finally(() => setChartLoading(false))
  }, [])

  useEffect(() => {
    if (!symbol) return
    setSignal(null)
    loadCandleHistory(symbol, timeframe)
  }, [symbol, timeframe, loadCandleHistory])

  // Count to Bar live second-by-second countdown & bar closing engine
  useEffect(() => {
    setBarSecondsLeft(getSecondsToNextBar(timeframe))
    const timer = setInterval(() => {
      setBarSecondsLeft((prev) => {
        if (prev <= 1) {
          // Bar closed! Mint new candle bar dynamically
          setCandles((old) => {
            if (!old.length) return old
            const last = old[old.length - 1]
            const currPrice = quote?.price || last.y[3]
            const nextBar = {
              x: Date.now(),
              y: [currPrice, currPrice, currPrice, currPrice],
              volume: Math.floor(5000 + Math.random() * 25000),
            }
            return [...old.slice(1), nextBar]
          })
          return TF_INTERVALS[timeframe] || 60
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeframe, quote?.price])

  // Update active open candle in real time on incoming socket tick
  useEffect(() => {
    const p = Number(quote?.price)
    if (!Number.isFinite(p) || p <= 0 || candles.length === 0) return
    setCandles((prev) => {
      if (!prev.length) return prev
      const updated = [...prev]
      const last = { ...updated[updated.length - 1] }
      const open = Number(last.y[0]) || p
      const high = Math.max(Number(last.y[1]) || p, p)
      const low = Math.min(Number(last.y[2]) || p, p)
      last.y = [open, high, low, p]
      updated[updated.length - 1] = last
      return updated
    })
  }, [quote?.price])

  const fetchSignal = useCallback(async () => {
    if (!symbol) return
    setSignalLoading(true)
    try {
      const s = await signalsApi.get(symbol)
      setSignal(s)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not fetch algorithmic signal')
    } finally {
      setSignalLoading(false)
    }
  }, [symbol])

  const handleCloseCurrentPosition = async () => {
    if (!activeHolding) return
    setClosingTrade(true)
    try {
      const res = await portfolioApi.close(activeHolding.symbol, activeHolding.quantity, activeHolding.side)
      const pnl = res.realizedPnl ?? 0
      const isWin = pnl >= 0
      const curr = (res.baseCurrency || 'INR') === 'USD' ? '$' : '₹'
      toast.success(
        `Closed ${activeHolding.side === 'SELL' ? 'SHORT' : 'LONG'} ${activeHolding.quantity} ${activeHolding.symbol}. Realized P&L: ${
          isWin ? '+' : ''
        }${curr}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      )
      loadActiveHolding()
      onTraded?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close position')
    } finally {
      setClosingTrade(false)
    }
  }

  const trade = async (side) => {
    if (!symbol || !(qty > 0)) return
    setTradeLoading(true)
    try {
      const fn = side === 'BUY' ? portfolioApi.buy : portfolioApi.sell
      const result = await fn(symbol, Number(qty), orderType)
      const baseCurr = result.baseCurrency || 'INR'
      const costDesc =
        side === 'BUY'
          ? `Cost: ${baseCurr} ${result.totalDeduction?.toLocaleString()}`
          : result.isShort
          ? `Margin Collateral: ${baseCurr} ${result.totalDeduction?.toLocaleString()}`
          : `Proceeds: ${baseCurr} ${result.netProceeds?.toLocaleString()}`

      const actionTitle =
        side === 'BUY'
          ? result.covered
            ? 'Covered Short Position'
            : 'Executed Buy / Long'
          : result.isShort
          ? 'Executed Short Sell'
          : 'Executed Sell / Close Long'

      toast.success(
        `${actionTitle}: ${qty} ${symbol} @ ${result.executedPrice.toFixed(2)} (${costDesc})`
      )
      loadActiveHolding()
      onTraded?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Trade execution failed')
    } finally {
      setTradeLoading(false)
    }
  }

  const currentPrice = quote?.price || instrument?.price || 0
  const up = (quote?.changePercent ?? 0) >= 0

  // Current active candle values for OHLC HUD
  const activeCandle = candles.length > 0 ? candles[candles.length - 1] : null
  const ohlcOpen = activeCandle ? activeCandle.y[0] : currentPrice
  const ohlcHigh = activeCandle ? activeCandle.y[1] : currentPrice
  const ohlcLow = activeCandle ? activeCandle.y[2] : currentPrice
  const ohlcClose = activeCandle ? activeCandle.y[3] : currentPrice
  const candleUp = ohlcClose >= ohlcOpen

  // Chart configuration
  const isCandle = chartType === 'candlestick'

  const chartSeries = useMemo(() => {
    if (!candles.length || !symbol) return []
    if (isCandle) {
      return [
        {
          name: symbol,
          data: candles.map((c) => ({
            x: Number(c.x),
            y: [Number(c.y[0]), Number(c.y[1]), Number(c.y[2]), Number(c.y[3])],
          })),
        },
      ]
    }
    return [
      {
        name: symbol,
        data: candles.map((c) => ({
          x: Number(c.x),
          y: Number(c.y[3]),
        })),
      },
    ]
  }, [candles, isCandle, symbol])

  const textColor = isDark ? '#94A3B8' : '#586E75'
  const gridColor = isDark ? 'rgba(241, 245, 249, 0.08)' : 'rgba(101, 123, 131, 0.16)'
  const accentColor = isDark ? '#3B82F6' : '#268BD2'

  const chartOptions = useMemo(() => {
    return {
      chart: {
        type: 'area',
        height: 290,
        toolbar: {
          show: true,
          tools: {
            download: false,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
        },
        animations: { enabled: false },
        background: 'transparent',
      },
      theme: { mode: isDark ? 'dark' : 'light' },
      stroke: { width: 2.2, curve: 'smooth' },
      colors: [up ? '#10B981' : '#EF4444'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 95, 100],
        },
      },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          format: timeframe === '1D' ? 'dd MMM HH:mm' : 'HH:mm',
          style: { fontSize: '10px', colors: textColor },
        },
        crosshairs: { show: true, stroke: { color: accentColor, width: 1, dashArray: 3 } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        tooltip: { enabled: true },
        crosshairs: { show: true, stroke: { color: accentColor, width: 1, dashArray: 3 } },
        labels: {
          formatter: (v) => (v != null ? Number(v).toFixed(v < 2 ? 4 : 2) : ''),
          style: { fontSize: '10px', colors: textColor },
        },
      },
      grid: {
        borderColor: gridColor,
        strokeDashArray: 3,
        padding: { left: 8, right: 8, bottom: 4 },
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        x: { format: 'dd MMM yyyy HH:mm' },
      },
    }
  }, [isDark, up, timeframe, textColor, gridColor, accentColor])

  // Simulated Institutional Order Book Depth (Bids & Asks around currentPrice)
  const orderBook = useMemo(() => {
    const cp = currentPrice || 100
    const step = cp * 0.0006 // 0.06% spread step
    const asks = []
    const bids = []

    for (let i = 4; i >= 1; i--) {
      const price = Number((cp + i * step).toFixed(2))
      const size = Number((Math.random() * 8 + 1).toFixed(2))
      asks.push({ price, size, total: Number((price * size).toFixed(0)) })
    }

    for (let i = 1; i <= 4; i++) {
      const price = Number((cp - i * step).toFixed(2))
      const size = Number((Math.random() * 8 + 1).toFixed(2))
      bids.push({ price, size, total: Number((price * size).toFixed(0)) })
    }

    return { asks, bids, spread: Number((step * 2).toFixed(2)) }
  }, [currentPrice])

  if (!instrument) {
    return (
      <div className="sym-detail sym-detail-empty">
        <Sparkles size={24} color="var(--accent)" />
        <p>Select any symbol from search or watchlist to open live institutional terminal & charts.</p>
      </div>
    )
  }

  // Estimated order cost
  const rawSubtotal = currentPrice * Number(qty || 0)
  const estimatedFee = Number((rawSubtotal * 0.0005).toFixed(2))

  return (
    <div className="sym-detail">
      {/* Header Info */}
      <div className="sd-head">
        <div>
          <div className="sd-symbol">
            {symbol} <span className="sd-exchange">{instrument.exchange}</span>
          </div>
          <div className="sd-name">
            {instrument.name} · {instrument.assetClass.toUpperCase()}
          </div>
        </div>

        <div className="sd-price-block">
          <div className="sd-price">
            {currentPrice ? currentPrice.toFixed(currentPrice < 2 ? 4 : 2) : '—'}{' '}
            <span className="sd-currency">{instrument.currency}</span>
          </div>
          {quote && typeof quote.changePercent === 'number' && (
            <div className={`sd-change ${up ? 'gain' : 'loss'}`}>
              {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {up ? '+' : ''}
              {quote.changePercent.toFixed(2)}%
            </div>
          )}
          <div className="sd-source-tag">
            <ShieldCheck size={11} color="var(--accent)" /> Real-time 1.5s Institutional Stream
          </div>
        </div>
      </div>

      {/* Interactive Chart Controls Bar */}
      <div className="sd-controls-bar">
        <div className="sd-ctrl-group">
          <button
            className={`sd-tab-btn ${chartType === 'candlestick' ? 'active' : ''}`}
            onClick={() => setChartType('candlestick')}
            title="Candlestick (OHLC)"
          >
            <BarChart2 size={13} style={{ marginRight: 4 }} /> Candlestick
          </button>
          <button
            className={`sd-tab-btn ${chartType === 'area' ? 'active' : ''}`}
            onClick={() => setChartType('area')}
            title="Line Area Chart"
          >
            <LineChart size={13} style={{ marginRight: 4 }} /> Line Area
          </button>
        </div>

        {/* Timeframe Selector */}
        <div className="sd-ctrl-group">
          {['1m', '5m', '15m', '1H', '1D'].map((tf) => (
            <button
              key={tf}
              className={`sd-tab-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Technical Indicators Selector */}
        <div className="sd-ctrl-group sd-indicators-group">
          <span className="sd-indicators-label">Indicators:</span>
          <button
            className={`sd-ind-btn ${indicators.sma ? 'active-sma' : ''}`}
            onClick={() => toggleIndicator('sma')}
            title="Toggle SMA 20 (Simple Moving Average)"
          >
            <span className="sd-ind-dot" style={{ background: '#F59E0B' }} /> SMA 20
          </button>
          <button
            className={`sd-ind-btn ${indicators.ema ? 'active-ema' : ''}`}
            onClick={() => toggleIndicator('ema')}
            title="Toggle EMA 50 (Exponential Moving Average)"
          >
            <span className="sd-ind-dot" style={{ background: '#06B6D4' }} /> EMA 50
          </button>
          <button
            className={`sd-ind-btn ${indicators.bb ? 'active-bb' : ''}`}
            onClick={() => toggleIndicator('bb')}
            title="Toggle Bollinger Bands (20, 2)"
          >
            <span className="sd-ind-dot" style={{ background: '#60A5FA' }} /> BB (20,2)
          </button>
          <button
            className={`sd-ind-btn ${indicators.rsi ? 'active-rsi' : ''}`}
            onClick={() => toggleIndicator('rsi')}
            title="Toggle RSI 14 (Relative Strength Index)"
          >
            <span className="sd-ind-dot" style={{ background: '#A855F7' }} /> RSI 14
          </button>
        </div>

        {/* ⏱️ "Count to Bar" Countdown Timer Badge */}
        <div className="sd-count-to-bar-badge" title="Countdown to active candle close">
          <Clock size={13} className="sd-bar-clock-icon" />
          <span className="sd-bar-title">Count to Bar:</span>
          <span className="sd-bar-digits mono">{formatCountdown(barSecondsLeft)}</span>
          <span className="sd-bar-pulse" />
        </div>
      </div>

      {/* Live Active Bar OHLC HUD Strip */}
      <div className="sd-ohlc-hud">
        <span className="sd-hud-item">
          O: <strong>{ohlcOpen?.toFixed(2)}</strong>
        </span>
        <span className="sd-hud-item">
          H: <strong style={{ color: '#10B981' }}>{ohlcHigh?.toFixed(2)}</strong>
        </span>
        <span className="sd-hud-item">
          L: <strong style={{ color: '#EF4444' }}>{ohlcLow?.toFixed(2)}</strong>
        </span>
        <span className="sd-hud-item">
          C: <strong className={candleUp ? 'gain' : 'loss'}>{ohlcClose?.toFixed(2)}</strong>
        </span>
        <span className="sd-hud-item">
          Bar Change:{' '}
          <strong className={candleUp ? 'gain' : 'loss'}>
            {candleUp ? '+' : ''}
            {ohlcOpen > 0 ? (((ohlcClose - ohlcOpen) / ohlcOpen) * 100).toFixed(2) : '0.00'}%
          </strong>
        </span>
      </div>

      {/* Chart Canvas */}
      <div className="sd-chart">
        {chartLoading && candles.length === 0 ? (
          <div className="sd-chart-empty">
            <Loader2 size={22} className="spin" />
            <span style={{ marginTop: 8 }}>Streaming institutional chart ticks…</span>
          </div>
        ) : isCandle ? (
          <CandleChartSvg
            candles={candles}
            currentPrice={currentPrice}
            symbol={symbol}
            isDark={isDark}
            currency={instrument.currency}
            timeframe={timeframe}
            indicators={indicators}
            onToggleIndicator={toggleIndicator}
          />
        ) : chartSeries.length > 0 && chartSeries[0].data.length > 0 ? (
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type="area"
            height={290}
          />
        ) : (
          <div className="sd-chart-empty">Gathering real-time market ticks…</div>
        )}
      </div>

      {/* Split Grid: Order Execution Terminal & Simulated Depth Ladder */}
      <div className="sd-trading-grid">
        {/* Order Execution Terminal */}
        <div className="sd-order-card">
          <div className="sd-order-header">
            <span className="sd-order-title">Execution Terminal</span>
            <div className="sd-order-type-tabs">
              <button
                className={`sd-ot-btn ${orderType === 'MARKET' ? 'active' : ''}`}
                onClick={() => setOrderType('MARKET')}
              >
                Market Order
              </button>
              <button
                className={`sd-ot-btn ${orderType === 'LIMIT' ? 'active' : ''}`}
                onClick={() => setOrderType('LIMIT')}
              >
                Limit Order
              </button>
              <button
                className={`sd-ot-btn ${orderType === 'CLOSE' ? 'active' : ''}`}
                onClick={() => setOrderType('CLOSE')}
                style={{
                  color: orderType === 'CLOSE' ? 'white' : activeHolding ? '#EF4444' : undefined,
                  background: orderType === 'CLOSE' ? '#EF4444' : undefined,
                  fontWeight: activeHolding ? 700 : 500,
                }}
                title="Close Active Trade / Position"
              >
                Close Trade {activeHolding ? '●' : ''}
              </button>
            </div>
          </div>

          {/* Active Open Position Banner (Always visible in Market & Limit view if user holds a position) */}
          {activeHolding && orderType !== 'CLOSE' && (
            <div className="sd-active-position-banner">
              <div className="sd-ap-left">
                <span className={`sd-ap-badge ${activeHolding.side === 'SELL' ? 'sell' : 'buy'}`}>
                  {activeHolding.side === 'SELL' ? 'ACTIVE SHORT' : 'ACTIVE LONG'}
                </span>
                <span className="sd-ap-info">
                  <strong>{activeHolding.quantity}</strong> {activeHolding.symbol} @ avg{' '}
                  <strong>{activeHolding.avgBuyPrice?.toFixed(2)}</strong>
                </span>
                {activeHolding.unrealizedPnlBase != null && (
                  <span
                    className={`sd-ap-pnl mono ${activeHolding.unrealizedPnlBase >= 0 ? 'gain' : 'loss'}`}
                  >
                    {activeHolding.unrealizedPnlBase >= 0 ? '+' : ''}
                    {activeHolding.unrealizedPnlBase.toFixed(2)} ({activeHolding.unrealizedPnlBase >= 0 ? '+' : ''}
                    {activeHolding.pnlPercent}%)
                  </span>
                )}
              </div>
              <button
                className="sd-ap-close-btn"
                disabled={closingTrade}
                onClick={handleCloseCurrentPosition}
              >
                {closingTrade ? <Loader2 size={13} className="spin" /> : null}
                {closingTrade ? 'Closing Trade…' : 'Close Trade (Market)'}
              </button>
            </div>
          )}

          {/* CLOSE TRADE TAB CONTENT */}
          {orderType === 'CLOSE' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '6px 0' }}>
              {activeHolding ? (
                <>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--r-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-3)' }}>Position Type:</span>
                      <span className={`sd-ap-badge ${activeHolding.side === 'SELL' ? 'sell' : 'buy'}`}>
                        {activeHolding.side === 'SELL' ? 'SHORT (SELL)' : 'LONG (BUY)'} ({activeHolding.quantity}{' '}
                        {activeHolding.symbol})
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-3)' }}>Average Entry Price:</span>
                      <span className="mono bold">
                        {activeHolding.avgBuyPrice?.toFixed(2)} {instrument.currency}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-3)' }}>Current Market Price:</span>
                      <span className="mono bold">
                        {currentPrice?.toFixed(2)} {instrument.currency}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-3)' }}>Live Unrealized P&amp;L:</span>
                      <span
                        className={`mono bold ${activeHolding.unrealizedPnlBase >= 0 ? 'gain' : 'loss'}`}
                        style={{ fontSize: '13px' }}
                      >
                        {activeHolding.unrealizedPnlBase >= 0 ? '+' : ''}
                        {activeHolding.unrealizedPnlBase} ({activeHolding.pnlPercent}%)
                      </span>
                    </div>
                  </div>
                  <button
                    className="sd-btn sell"
                    style={{ width: '100%', height: 42, fontSize: '13.5px', fontWeight: 800 }}
                    disabled={closingTrade}
                    onClick={handleCloseCurrentPosition}
                  >
                    {closingTrade ? <Loader2 size={14} className="spin" /> : null}
                    {closingTrade ? 'Closing Trade…' : 'Close Position (Market Order)'}
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--text-4)', textAlign: 'center' }}>
                    💡 Realized profit or loss will immediately reflect in your Available Capital and Net Worth.
                  </span>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-3)', fontSize: '12px' }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '13px', marginBottom: 4 }}>
                    No Active Trade in {symbol}
                  </p>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-4)', marginBottom: 14 }}>
                    You currently do not have an open position in {symbol}. Use <strong>Market Order</strong> to place
                    a Buy (Long) or Sell (Short) trade.
                  </p>
                  <button
                    className="sd-ot-btn active"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                    onClick={() => setOrderType('MARKET')}
                  >
                    Go to Market Order
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* MARKET / LIMIT ORDER FORM */
            <div className="sd-order-form">
              <div className="sd-qty-wrapper">
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="sd-qty"
                  placeholder="Qty"
                />
                {[1, 5, 10, 50].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    className="sd-quick-btn"
                    onClick={() => setQty(quick)}
                  >
                    +{quick}
                  </button>
                ))}
              </div>

              <div className="sd-order-estimate">
                Est. Total:{' '}
                <strong>
                  {instrument.currency}{' '}
                  {rawSubtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </strong>
                <span className="sd-fee-tag">
                  {' '}
                  (Fee 0.05%: {instrument.currency} {estimatedFee})
                </span>
              </div>

              <div className="sd-btn-group">
                <button
                  className="sd-btn buy"
                  disabled={tradeLoading || !(Number(qty) > 0)}
                  onClick={() => trade('BUY')}
                  title="Buy / Long: Profit when asset price rises"
                >
                  {tradeLoading ? <Loader2 size={14} className="spin" /> : <Zap size={14} />} Buy / Long
                </button>
                <button
                  className="sd-btn sell"
                  disabled={tradeLoading || !(Number(qty) > 0)}
                  onClick={() => trade('SELL')}
                  title="Sell / Short: Profit when asset price falls (or closes Long)"
                >
                  {tradeLoading ? <Loader2 size={14} className="spin" /> : <Flame size={14} />} Sell / Short
                </button>
              </div>
              <div className="sd-trade-hint">
                <span>
                  💡 <strong>Long:</strong> Profit if asset rises · <strong>Short:</strong> Sell borrowed asset to
                  profit if price drops
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live Order Book Depth Ladder */}
        <div className="sd-depth-card">
          <div className="sd-depth-header">
            <span className="sd-depth-title">
              <Layers size={12} color="var(--accent)" /> Order Book Depth
            </span>
            <span className="sd-spread-badge">
              Spread: {instrument.currency} {orderBook.spread}
            </span>
          </div>

          <div className="sd-depth-table">
            <div className="sd-depth-row-head">
              <span>Price ({instrument.currency})</span>
              <span>Size</span>
              <span>Total</span>
            </div>

            {/* Asks (Red) */}
            {orderBook.asks.map((a, i) => (
              <div key={`ask-${i}`} className="sd-depth-row ask">
                <span className="mono loss">{a.price.toFixed(2)}</span>
                <span className="mono">{a.size}</span>
                <span className="mono">{a.total}</span>
                <div
                  className="sd-depth-bar ask"
                  style={{ width: `${Math.min(100, (a.size / 10) * 100)}%` }}
                />
              </div>
            ))}

            {/* Mid Price Separator */}
            <div className="sd-mid-price-row">
              <span className="mono bold">{currentPrice.toFixed(2)}</span>
              <span className="sd-mid-label">Institutional Mid</span>
            </div>

            {/* Bids (Green) */}
            {orderBook.bids.map((b, i) => (
              <div key={`bid-${i}`} className="sd-depth-row bid">
                <span className="mono gain">{b.price.toFixed(2)}</span>
                <span className="mono">{b.size}</span>
                <span className="mono">{b.total}</span>
                <div
                  className="sd-depth-bar bid"
                  style={{ width: `${Math.min(100, (b.size / 10) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Algorithmic Technical Signal Action Bar */}
      <div className="sd-signal-action-row">
        <button className="sd-signal-btn" onClick={fetchSignal} disabled={signalLoading}>
          <Sparkles size={14} />
          {signalLoading ? 'Running Quantitative Models…' : 'Quant Technical Analysis'}
        </button>
      </div>

      {/* Quant Technical Analysis Card */}
      {signal && (
        <div
          className={`sd-signal sd-signal-${signal.signal?.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="sd-signal-header">
            <div>
              <span className="sd-signal-tag">{signal.signal}</span>
              <span className="sd-signal-confidence">{signal.confidence}% Confidence Rating</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
              Quant Score: <strong>{signal.technicalScore}/100</strong>
            </div>
          </div>

          <div className="sd-signal-metrics">
            <div className="sd-metric-card">
              <span>RSI (14-Period)</span>
              <strong>{signal.indicators.rsi.value}</strong>
              <small style={{ fontSize: 10, color: 'var(--text-3)' }}>
                {signal.indicators.rsi.status}
              </small>
            </div>
            <div className="sd-metric-card">
              <span>MACD Momentum</span>
              <strong>{signal.indicators.macd.histogram}</strong>
              <small style={{ fontSize: 10, color: 'var(--text-3)' }}>
                {signal.indicators.macd.status}
              </small>
            </div>
            <div className="sd-metric-card">
              <span>SMA Trend</span>
              <strong>
                {signal.indicators.movingAverages.sma20} / {signal.indicators.movingAverages.sma50}
              </strong>
              <small style={{ fontSize: 10, color: 'var(--text-3)' }}>
                {signal.indicators.movingAverages.status}
              </small>
            </div>
            <div className="sd-metric-card">
              <span>Suggested Risk Target</span>
              <strong style={{ color: 'var(--loss)' }}>SL: {signal.riskManagement.stopLoss}</strong>
              <strong style={{ color: 'var(--gain)', marginTop: 2 }}>
                TP: {signal.riskManagement.takeProfit}
              </strong>
            </div>
          </div>

          <p>{signal.rationale}</p>
          <span className="sd-signal-disclaimer">{signal.disclaimer}</span>
        </div>
      )}
    </div>
  )
}

