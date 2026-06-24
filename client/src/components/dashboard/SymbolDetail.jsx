import { useState, useEffect, useCallback } from 'react'
import ReactApexChart from 'react-apexcharts'
import toast from 'react-hot-toast'
import { Sparkles, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { marketApi, portfolioApi, signalsApi } from '../../api/marketApi'
import { useLiveQuotes } from '../../context/MarketContext'
import './SymbolDetail.css'

export default function SymbolDetail({ instrument, onTraded }) {
  const symbol = instrument?.symbol
  const live = useLiveQuotes(symbol ? [symbol] : [])
  const quote = symbol ? live[symbol] : null

  const [history, setHistory] = useState([])
  const [signal, setSignal] = useState(null)
  const [signalLoading, setSignalLoading] = useState(false)
  const [qty, setQty] = useState(1)
  const [tradeLoading, setTradeLoading] = useState(false)

  useEffect(() => {
    if (!symbol) return
    setHistory([])
    setSignal(null)
    marketApi.getHistory(symbol).then((r) => setHistory(r.history || [])).catch(() => {})
  }, [symbol])

  // Append live ticks to the chart as they arrive, so the chart grows in real time.
  useEffect(() => {
    if (!quote?.asOf) return
    setHistory((prev) => {
      if (prev.length && prev[prev.length - 1].asOf === quote.asOf) return prev
      return [...prev, { price: quote.price, asOf: quote.asOf }].slice(-200)
    })
  }, [quote?.asOf])

  const fetchSignal = useCallback(async () => {
    if (!symbol) return
    setSignalLoading(true)
    try {
      const s = await signalsApi.get(symbol)
      setSignal(s)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate a signal right now')
    } finally {
      setSignalLoading(false)
    }
  }, [symbol])

  const trade = async (side) => {
    if (!symbol || !(qty > 0)) return
    setTradeLoading(true)
    try {
      const fn = side === 'BUY' ? portfolioApi.buy : portfolioApi.sell
      const result = await fn(symbol, Number(qty))
      toast.success(
        `${side === 'BUY' ? 'Bought' : 'Sold'} ${qty} ${symbol} @ ${result.executedPrice.toFixed(2)}`
      )
      onTraded?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Trade failed')
    } finally {
      setTradeLoading(false)
    }
  }

  if (!instrument) {
    return (
      <div className="sym-detail sym-detail-empty">
        <Sparkles size={20} />
        <p>Search a symbol above to view its live price, chart, and trade it.</p>
      </div>
    )
  }

  const up = (quote?.changePercent ?? 0) >= 0
  const series = [{ name: symbol, data: history.map((h) => [new Date(h.asOf).getTime(), h.price]) }]
  const chartOptions = {
    chart: { type: 'area', toolbar: { show: false }, animations: { speed: 300 }, background: 'transparent' },
    theme: { mode: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light' },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0 } },
    colors: [up ? '#059669' : '#DC2626'],
    xaxis: { type: 'datetime', labels: { style: { fontSize: '10px' } } },
    yaxis: { labels: { formatter: (v) => v?.toFixed(2), style: { fontSize: '10px' } } },
    grid: { borderColor: 'var(--border)', strokeDashArray: 3 },
    tooltip: { x: { format: 'HH:mm:ss' } },
    dataLabels: { enabled: false },
  }

  return (
    <div className="sym-detail">
      <div className="sd-head">
        <div>
          <div className="sd-symbol">{symbol} <span className="sd-exchange">{instrument.exchange}</span></div>
          <div className="sd-name">{instrument.name}</div>
        </div>
        <div className="sd-price-block">
          <div className="sd-price">{quote ? quote.price.toFixed(2) : '—'} <span className="sd-currency">{instrument.currency}</span></div>
          {quote && typeof quote.changePercent === 'number' && (
            <div className={`sd-change ${up ? 'gain' : 'loss'}`}>
              {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {up ? '+' : ''}{quote.changePercent.toFixed(2)}%
            </div>
          )}
          {quote?.stale && <div className="sd-stale">Price delayed — providers temporarily unavailable</div>}
          {quote && !quote.stale && <div className="sd-approx">AI-sourced quote, may lag the real exchange by a few minutes</div>}
        </div>
      </div>

      <div className="sd-chart">
        {history.length > 1 ? (
          <ReactApexChart options={chartOptions} series={series} type="area" height={220} />
        ) : (
          <div className="sd-chart-empty">Building chart from live ticks — check back shortly.</div>
        )}
      </div>

      <div className="sd-actions">
        <div className="sd-trade">
          <input
            type="number"
            min="0.0001"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="sd-qty"
          />
          <button className="sd-btn buy" disabled={tradeLoading} onClick={() => trade('BUY')}>
            {tradeLoading ? <Loader2 size={14} className="spin" /> : 'Buy'}
          </button>
          <button className="sd-btn sell" disabled={tradeLoading} onClick={() => trade('SELL')}>
            {tradeLoading ? <Loader2 size={14} className="spin" /> : 'Sell'}
          </button>
        </div>

        <button className="sd-signal-btn" onClick={fetchSignal} disabled={signalLoading}>
          <Sparkles size={14} />
          {signalLoading ? 'Thinking…' : 'AI Signal'}
        </button>
      </div>

      {signal && (
        <div className={`sd-signal sd-signal-${signal.signal?.toLowerCase()}`}>
          <span className="sd-signal-tag">{signal.signal}</span>
          <span className="sd-signal-confidence">{signal.confidence}% confidence</span>
          <p>{signal.rationale}</p>
          <span className="sd-signal-disclaimer">{signal.disclaimer}</span>
        </div>
      )}
    </div>
  )
}
