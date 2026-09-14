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

export default function SymbolDetail({ instrument, onTraded }) {
  const symbol = instrument?.symbol
  const live = useLiveQuotes(symbol ? [symbol] : [])
  const quote = symbol ? live[symbol] : null

  const [chartType, setChartType] = useState('candlestick') // 'candlestick' | 'area'
  const [timeframe, setTimeframe] = useState('1m') // '1m' | '5m' | '15m' | '1H' | '1D'
  const [candles, setCandles] = useState([])
  const [chartLoading, setChartLoading] = useState(false)

  // ── "Count to Bar" Countdown Timer ──
  const [barSecondsLeft, setBarSecondsLeft] = useState(() => getSecondsToNextBar('1m'))

  const [signal, setSignal] = useState(null)
  const [signalLoading, setSignalLoading] = useState(false)

  const [orderType, setOrderType] = useState('MARKET') // 'MARKET' | 'LIMIT'
  const [qty, setQty] = useState(1)
  const [tradeLoading, setTradeLoading] = useState(false)

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
    if (!quote?.price || candles.length === 0) return
    setCandles((prev) => {
      if (!prev.length) return prev
      const updated = [...prev]
      const last = { ...updated[updated.length - 1] }
      const newHigh = Math.max(Number(last.y[1]), Number(quote.price))
      const newLow = Math.min(Number(last.y[2]), Number(quote.price))
      last.y = [Number(last.y[0]), newHigh, newLow, Number(quote.price)]
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
          : `Net: ${baseCurr} ${result.netProceeds?.toLocaleString()}`

      toast.success(
        `${side === 'BUY' ? 'Executed Buy' : 'Executed Sell'}: ${qty} ${symbol} @ ${result.executedPrice.toFixed(2)} (${costDesc})`
      )
      onTraded?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Trade execution failed')
    } finally {
      setTradeLoading(false)
    }
  }

  if (!instrument) {
    return (
      <div className="sym-detail sym-detail-empty">
        <Sparkles size={24} color="var(--accent)" />
        <p>Select any symbol from search or watchlist to open live institutional terminal & charts.</p>
      </div>
    )
  }

  const currentPrice = quote?.price || instrument.price || 0
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
    if (!candles.length) return []
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

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'

  const chartOptions = useMemo(() => {
    return {
      chart: {
        type: isCandle ? 'candlestick' : 'area',
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
        animations: { enabled: true, speed: 200 },
        background: 'transparent',
      },
      theme: { mode: isDark ? 'dark' : 'light' },
      stroke: { width: isCandle ? 1 : 2.2, curve: 'smooth' },
      colors: isCandle ? undefined : [up ? '#10B981' : '#EF4444'],
      fill: isCandle
        ? undefined
        : {
            type: 'gradient',
            gradient: {
              shadeIntensity: 1,
              opacityFrom: 0.45,
              opacityTo: 0.05,
              stops: [0, 95, 100],
            },
          },
      plotOptions: {
        candlestick: {
          colors: {
            upward: '#10B981',
            downward: '#EF4444',
          },
          wick: { useFillColor: true },
        },
      },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          format: timeframe === '1D' ? 'dd MMM HH:mm' : 'HH:mm',
          style: { fontSize: '10px', colors: 'var(--text-4)' },
        },
        crosshairs: { show: true, stroke: { color: 'var(--accent)', width: 1, dashArray: 3 } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        tooltip: { enabled: true },
        crosshairs: { show: true, stroke: { color: 'var(--accent)', width: 1, dashArray: 3 } },
        labels: {
          formatter: (v) => (v != null ? Number(v).toFixed(v < 2 ? 4 : 2) : ''),
          style: { fontSize: '10px', colors: 'var(--text-4)' },
        },
      },
      grid: {
        borderColor: 'var(--border)',
        strokeDashArray: 3,
        padding: { left: 8, right: 8, bottom: 4 },
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        x: { format: 'dd MMM yyyy HH:mm' },
      },
    }
  }, [isCandle, isDark, up, timeframe])

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
        {chartLoading ? (
          <div className="sd-chart-empty">
            <Loader2 size={22} className="spin" />
            <span style={{ marginTop: 8 }}>Streaming institutional chart ticks…</span>
          </div>
        ) : chartSeries.length > 0 && chartSeries[0].data.length > 0 ? (
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type={isCandle ? 'candlestick' : 'area'}
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
            </div>
          </div>

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
              >
                {tradeLoading ? <Loader2 size={14} className="spin" /> : <Zap size={14} />} Buy / Long
              </button>
              <button
                className="sd-btn sell"
                disabled={tradeLoading || !(Number(qty) > 0)}
                onClick={() => trade('SELL')}
              >
                {tradeLoading ? <Loader2 size={14} className="spin" /> : <Flame size={14} />} Sell / Short
              </button>
            </div>
          </div>
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

