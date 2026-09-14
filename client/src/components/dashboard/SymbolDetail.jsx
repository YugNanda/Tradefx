import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { marketApi, portfolioApi, signalsApi } from '../../api/marketApi'
import { useLiveQuotes } from '../../context/MarketContext'
import './SymbolDetail.css'

export default function SymbolDetail({ instrument, onTraded }) {
  const symbol = instrument?.symbol
  const live = useLiveQuotes(symbol ? [symbol] : [])
  const quote = symbol ? live[symbol] : null

  const [chartType, setChartType] = useState('candlestick') // 'candlestick' | 'area'
  const [timeframe, setTimeframe] = useState('1D') // '1D' | '1W' | '1M' | '1Y'
  const [showIndicators, setShowIndicators] = useState(true)
  const [candles, setCandles] = useState([])
  const [chartLoading, setChartLoading] = useState(false)

  const [signal, setSignal] = useState(null)
  const [signalLoading, setSignalLoading] = useState(false)

  const [orderType, setOrderType] = useState('MARKET') // 'MARKET' | 'LIMIT'
  const [qty, setQty] = useState(1)
  const [tradeLoading, setTradeLoading] = useState(false)

  // Fetch multi-timeframe candlestick data
  const loadCandleHistory = useCallback((sym, tf) => {
    if (!sym) return
    setChartLoading(true)
    marketApi
      .getOhlc(sym, tf)
      .then((data) => {
        setCandles(data.candles || [])
      })
      .catch(() => {})
      .finally(() => setChartLoading(false))
  }, [])

  useEffect(() => {
    if (!symbol) return
    setSignal(null)
    loadCandleHistory(symbol, timeframe)
  }, [symbol, timeframe, loadCandleHistory])

  // Update latest candle with incoming live socket tick
  useEffect(() => {
    if (!quote?.price || candles.length === 0) return
    setCandles((prev) => {
      if (!prev.length) return prev
      const updated = [...prev]
      const last = { ...updated[updated.length - 1] }
      last.y = [
        last.y[0],
        Math.max(last.y[1], quote.price),
        Math.min(last.y[2], quote.price),
        quote.price,
      ]
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

  // Chart configuration
  const isCandle = chartType === 'candlestick'

  const chartSeries = isCandle
    ? [{ name: symbol, data: candles.map((c) => ({ x: new Date(c.x), y: c.y })) }]
    : [{ name: symbol, data: candles.map((c) => [c.x, c.y[3]]) }]

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'

  const chartOptions = {
    chart: {
      type: isCandle ? 'candlestick' : 'area',
      height: 260,
      toolbar: { show: false },
      animations: { enabled: true, speed: 250 },
      background: 'transparent',
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    stroke: { width: isCandle ? 1 : 2, curve: 'smooth' },
    colors: isCandle ? undefined : [up ? '#059669' : '#DC2626'],
    fill: isCandle
      ? undefined
      : { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.02 } },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#059669',
          downward: '#DC2626',
        },
        wick: { useFillColor: true },
      },
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { fontSize: '10px', colors: 'var(--text-4)' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: {
        formatter: (v) => (v != null ? Number(v).toFixed(v < 2 ? 4 : 2) : ''),
        style: { fontSize: '10px', colors: 'var(--text-4)' },
      },
    },
    grid: {
      borderColor: 'var(--border)',
      strokeDashArray: 3,
      padding: { left: 10, right: 10 },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      x: { format: 'dd MMM HH:mm' },
    },
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
          <div className="sd-name">{instrument.name} · {instrument.assetClass.toUpperCase()}</div>
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
            <ShieldCheck size={11} color="var(--accent)" /> Real-time Terminal Feed
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
            <LineChart size={13} style={{ marginRight: 4 }} /> Line
          </button>
        </div>

        <div className="sd-ctrl-group">
          {['1D', '1W', '1M', '1Y'].map((tf) => (
            <button
              key={tf}
              className={`sd-tab-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="sd-chart">
        {chartLoading ? (
          <div className="sd-chart-empty">
            <Loader2 size={20} className="spin" />
          </div>
        ) : candles.length > 0 ? (
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type={isCandle ? 'candlestick' : 'area'}
            height={260}
          />
        ) : (
          <div className="sd-chart-empty">Gathering real-time market ticks…</div>
        )}
      </div>

      {/* Institutional Order Execution Panel */}
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
            {[1, 5, 10].map((quick) => (
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
            Est. Total: <strong>{instrument.currency} {rawSubtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
            <span className="sd-fee-tag"> (Simulated Fee 0.05%: {instrument.currency} {estimatedFee})</span>
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
              {tradeLoading ? <Loader2 size={14} className="spin" /> : 'Sell / Short'}
            </button>
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
