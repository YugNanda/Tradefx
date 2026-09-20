import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  LineSeries,
  BarSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts'
import {
  CandlestickChart,
  LineChart,
  AreaChart,
  BarChart2,
  Clock,
  Sliders,
  Eye,
  EyeOff,
  X,
  Maximize2,
  Minimize2,
  Camera,
  RotateCcw,
  Search,
  Check,
  Plus,
} from 'lucide-react'
import {
  normalizeCandles,
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
} from './indicators'
import './TradingViewChart.css'

const AVAILABLE_INDICATORS = [
  {
    id: 'vol',
    name: 'Volume',
    abbr: 'VOL',
    color: '#10B981',
    category: 'Volume',
    desc: 'Plots trading volume histogram with bull/bear color coding at the base of the chart.',
  },
  {
    id: 'sma',
    name: 'Moving Average (SMA 20)',
    abbr: 'SMA 20',
    color: '#F59E0B',
    category: 'Moving Averages',
    desc: 'Smooths price action by calculating the arithmetic mean over the last 20 periods.',
  },
  {
    id: 'ema',
    name: 'Exponential Moving Average (EMA 50)',
    abbr: 'EMA 50',
    color: '#06B6D4',
    category: 'Moving Averages',
    desc: 'Places greater weight on recent price ticks for rapid trend detection.',
  },
  {
    id: 'bb',
    name: 'Bollinger Bands (20, 2)',
    abbr: 'BB (20, 2)',
    color: '#60A5FA',
    category: 'Volatility',
    desc: 'Upper & lower statistical standard deviation envelopes around a 20-period SMA.',
  },
  {
    id: 'rsi',
    name: 'Relative Strength Index (RSI 14)',
    abbr: 'RSI 14',
    color: '#A855F7',
    category: 'Oscillators',
    desc: 'Momentum oscillator (0-100) highlighting overbought (>70) and oversold (<30) levels.',
  },
  {
    id: 'macd',
    name: 'MACD (12, 26, 9)',
    abbr: 'MACD',
    color: '#3B82F6',
    category: 'Oscillators',
    desc: 'Moving Average Convergence Divergence with fast/slow lines and histogram.',
  },
]

export default function TradingViewChart({
  candles = [],
  currentPrice,
  symbol = 'SYMBOL',
  isDark = true,
  currency = 'INR',
  timeframe = '1m',
  onTimeframeChange,
  barSecondsLeft = 60,
  exchange = 'MARKET',
}) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const mainSeriesRef = useRef(null)
  const volumeSeriesRef = useRef(null)
  const indicatorSeriesRef = useRef({})
  const oscPaneRef = useRef(null)

  // Chart view configurations
  const [chartReady, setChartReady] = useState(0)
  const [chartType, setChartType] = useState('candlestick') // 'candlestick' | 'area' | 'line' | 'bar'
  const [chartTypeMenuOpen, setChartTypeMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [indicatorsModalOpen, setIndicatorsModalOpen] = useState(false)
  const [indicatorSearch, setIndicatorSearch] = useState('')

  // Active indicators state
  const [activeIndicators, setActiveIndicators] = useState({
    vol: true,
    sma: false,
    ema: false,
    bb: false,
    rsi: false,
    macd: false,
  })

  // Indicator visibility toggles (hide/show without removing)
  const [hiddenIndicators, setHiddenIndicators] = useState({})

  // Hovered / Live Bar HUD values
  const [hoverData, setHoverData] = useState(null)

  // Format countdown
  const formatCountdown = (sec) => {
    const s = Math.max(0, sec || 0)
    if (s >= 3600) {
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const secRem = s % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(secRem).padStart(2, '0')}`
    }
    const m = Math.floor(s / 60)
    const secRem = s % 60
    return `${String(m).padStart(2, '0')}:${String(secRem).padStart(2, '0')}`
  }

  // Prepared normalized candles
  const cleanData = useMemo(() => normalizeCandles(candles), [candles])

  // Current active live candle
  const activeBar = useMemo(() => {
    if (!cleanData.length) return null
    return cleanData[cleanData.length - 1]
  }, [cleanData])

  // Values currently displayed on the HUD (hovered bar or active live bar)
  const displayedOhlc = useMemo(() => {
    const bar = hoverData || activeBar
    if (!bar) {
      return { open: 0, high: 0, low: 0, close: currentPrice || 0, chg: 0, chgPct: 0, isUp: true }
    }
    const o = bar.open
    const h = bar.high
    const l = bar.low
    const c = hoverData ? bar.close : currentPrice || bar.close
    const chg = c - o
    const chgPct = o > 0 ? (chg / o) * 100 : 0
    return {
      open: o,
      high: Math.max(h, c),
      low: Math.min(l, c),
      close: c,
      chg,
      chgPct,
      isUp: c >= o,
    }
  }, [hoverData, activeBar, currentPrice])

  // Theme-derived chart colors
  const themeColors = useMemo(() => {
    if (isDark) {
      return {
        bg: '#0F172A',
        text: '#94A3B8',
        grid: 'rgba(255, 255, 255, 0.05)',
        border: 'rgba(255, 255, 255, 0.1)',
        crosshair: '#3B82F6',
        up: '#10B981',
        down: '#EF4444',
      }
    }
    return {
      bg: '#FFFFFF',
      text: '#475569',
      grid: 'rgba(0, 0, 0, 0.05)',
      border: 'rgba(0, 0, 0, 0.1)',
      crosshair: '#2563EB',
      up: '#10B981',
      down: '#EF4444',
    }
  }, [isDark])

  // ── 1. Initialize Chart Instance ──
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    container.innerHTML = '' // Ensure clean container

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: themeColors.text,
        fontSize: 11,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { color: themeColors.grid },
        horzLines: { color: themeColors.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: themeColors.crosshair,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: themeColors.crosshair,
        },
        horzLine: {
          color: themeColors.crosshair,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: themeColors.crosshair,
        },
      },
      rightPriceScale: {
        borderColor: themeColors.border,
        scaleMargins: { top: 0.08, bottom: 0.16 },
        autoScale: true,
        alignLabels: true,
      },
      timeScale: {
        borderColor: themeColors.border,
        timeVisible: true,
        secondsVisible: timeframe === '1m' || timeframe === '5m',
        barSpacing: 12,
        minBarSpacing: 3,
        rightOffset: 6,
      },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
    })

    chartRef.current = chart

    // Crosshair hover listener for OHLC HUD
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setHoverData(null)
        return
      }
      const activeSeries = mainSeriesRef.current
      if (activeSeries && param.seriesData.get(activeSeries)) {
        const raw = param.seriesData.get(activeSeries)
        if (raw.open != null) {
          setHoverData({
            open: raw.open,
            high: raw.high,
            low: raw.low,
            close: raw.close,
            time: param.time,
          })
        } else if (raw.value != null) {
          setHoverData({
            open: raw.value,
            high: raw.value,
            low: raw.value,
            close: raw.value,
            time: param.time,
          })
        }
      }
    })

    // ResizeObserver ensures chart width & height precisely track container
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height })
        }
      }
    })
    ro.observe(container)

    setChartReady((prev) => prev + 1)

    return () => {
      ro.disconnect()
      try {
        chart.remove()
      } catch {
        // noop
      }
      chartRef.current = null
      mainSeriesRef.current = null
      volumeSeriesRef.current = null
      indicatorSeriesRef.current = {}
      oscPaneRef.current = null
    }
  }, [themeColors])

  // Update timeScale options dynamically on timeframe change without rebuilding chart
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().applyOptions({
        secondsVisible: timeframe === '1m' || timeframe === '5m',
      })
    }
  }, [timeframe])

  // ── 2. Create / Recreate Main Series & Volume on Chart Ready, Type, or Theme Change ──
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    // Remove existing main series if present
    if (mainSeriesRef.current) {
      try {
        chart.removeSeries(mainSeriesRef.current)
      } catch {}
      mainSeriesRef.current = null
    }

    let series
    if (chartType === 'candlestick') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#10B981',
        downColor: '#EF4444',
        borderVisible: true,
        borderColor: '#10B981',
        borderUpColor: '#10B981',
        borderDownColor: '#EF4444',
        wickVisible: true,
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      })
    } else if (chartType === 'area') {
      series = chart.addSeries(AreaSeries, {
        lineColor: '#3B82F6',
        topColor: 'rgba(59, 130, 246, 0.4)',
        bottomColor: 'rgba(59, 130, 246, 0.02)',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      })
    } else if (chartType === 'line') {
      series = chart.addSeries(LineSeries, {
        color: '#3B82F6',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      })
    } else if (chartType === 'bar') {
      series = chart.addSeries(BarSeries, {
        upColor: '#10B981',
        downColor: '#EF4444',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      })
    }
    mainSeriesRef.current = series

    // Create volume series if not present
    if (!volumeSeriesRef.current) {
      try {
        const volSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: '', // overlay without dedicated axis
        })
        volSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.82, bottom: 0 },
        })
        volumeSeriesRef.current = volSeries
      } catch {}
    }

    // Populate data immediately if cleanData is already available
    if (cleanData.length > 0 && series) {
      if (chartType === 'candlestick' || chartType === 'bar') {
        series.setData(
          cleanData.map((c) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        )
      } else {
        series.setData(
          cleanData.map((c) => ({
            time: c.time,
            value: c.close,
          }))
        )
      }

      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(
          cleanData.map((c) => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          }))
        )
      }
      chart.timeScale().fitContent()
    }
  }, [chartReady, chartType, themeColors])

  // ── 3. Populate Series Data when cleanData Changes ──
  useEffect(() => {
    const series = mainSeriesRef.current
    const chart = chartRef.current
    if (!series || !chart || cleanData.length === 0) return

    if (chartType === 'candlestick' || chartType === 'bar') {
      series.setData(
        cleanData.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      )
    } else {
      series.setData(
        cleanData.map((c) => ({
          time: c.time,
          value: c.close,
        }))
      )
    }

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(
        cleanData.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
        }))
      )
    }

    chart.timeScale().fitContent()
  }, [cleanData, chartType])

  // ── 4. Manage Technical Indicators ──
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !cleanData.length) return

    const indSeries = indicatorSeriesRef.current

    // SMA (20)
    if (activeIndicators.sma) {
      if (!indSeries.sma) {
        indSeries.sma = chart.addSeries(LineSeries, {
          color: '#F59E0B',
          lineWidth: 2,
          title: 'SMA 20',
          priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        })
      }
      indSeries.sma.setData(calculateSMA(cleanData, 20))
      indSeries.sma.applyOptions({ visible: !hiddenIndicators.sma })
    } else if (indSeries.sma) {
      try {
        chart.removeSeries(indSeries.sma)
      } catch {}
      delete indSeries.sma
    }

    // EMA (50)
    if (activeIndicators.ema) {
      if (!indSeries.ema) {
        indSeries.ema = chart.addSeries(LineSeries, {
          color: '#06B6D4',
          lineWidth: 2,
          title: 'EMA 50',
          priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        })
      }
      indSeries.ema.setData(calculateEMA(cleanData, 50))
      indSeries.ema.applyOptions({ visible: !hiddenIndicators.ema })
    } else if (indSeries.ema) {
      try {
        chart.removeSeries(indSeries.ema)
      } catch {}
      delete indSeries.ema
    }

    // Bollinger Bands (20, 2)
    if (activeIndicators.bb) {
      if (!indSeries.bb_upper) {
        indSeries.bb_upper = chart.addSeries(LineSeries, {
          color: '#60A5FA',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          title: 'BB Upper',
        })
        indSeries.bb_mid = chart.addSeries(LineSeries, {
          color: '#F59E0B',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: 'BB Mid',
        })
        indSeries.bb_lower = chart.addSeries(LineSeries, {
          color: '#60A5FA',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          title: 'BB Lower',
        })
      }
      const { upper, middle, lower } = calculateBollingerBands(cleanData, 20, 2)
      indSeries.bb_upper.setData(upper)
      indSeries.bb_mid.setData(middle)
      indSeries.bb_lower.setData(lower)

      const isBbVisible = !hiddenIndicators.bb
      indSeries.bb_upper.applyOptions({ visible: isBbVisible })
      indSeries.bb_mid.applyOptions({ visible: isBbVisible })
      indSeries.bb_lower.applyOptions({ visible: isBbVisible })
    } else if (indSeries.bb_upper) {
      try {
        chart.removeSeries(indSeries.bb_upper)
        chart.removeSeries(indSeries.bb_mid)
        chart.removeSeries(indSeries.bb_lower)
      } catch {}
      delete indSeries.bb_upper
      delete indSeries.bb_mid
      delete indSeries.bb_lower
    }

    // Volume visibility toggle
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({
        visible: activeIndicators.vol && !hiddenIndicators.vol,
      })
    }

    // ── Sub-Pane Oscillators (RSI / MACD) ──
    const needsOscPane = activeIndicators.rsi || activeIndicators.macd
    let oscPane = oscPaneRef.current

    if (needsOscPane && !oscPane) {
      try {
        if (typeof chart.addPane === 'function') {
          oscPane = chart.addPane()
          oscPaneRef.current = oscPane
          const panes = chart.panes()
          if (panes.length > 1) {
            panes[0].setStretchFactor(3)
            panes[1].setStretchFactor(1.1)
          }
        }
      } catch {
        oscPane = null
      }
    } else if (!needsOscPane && oscPane) {
      try {
        const panes = chart.panes()
        if (panes.length > 1) {
          chart.removePane(1)
          panes[0].setStretchFactor(1)
        }
      } catch {}
      oscPaneRef.current = null
      oscPane = null
    }

    const targetTarget = oscPane || chart

    // RSI (14)
    if (activeIndicators.rsi) {
      if (!indSeries.rsi) {
        indSeries.rsi = chart.addSeries(LineSeries, {
          color: '#A855F7',
          lineWidth: 2,
          title: 'RSI 14',
          priceScaleId: '',
        })
        indSeries.rsi.priceScale().applyOptions({
          scaleMargins: { top: 0.72, bottom: 0.02 },
        })
      }
      indSeries.rsi.setData(calculateRSI(cleanData, 14))
      indSeries.rsi.applyOptions({ visible: !hiddenIndicators.rsi })
    } else if (indSeries.rsi) {
      try {
        chart.removeSeries(indSeries.rsi)
      } catch {}
      delete indSeries.rsi
    }

    // MACD (12, 26, 9)
    if (activeIndicators.macd) {
      if (!indSeries.macd_line) {
        indSeries.macd_line = chart.addSeries(LineSeries, {
          color: '#3B82F6',
          lineWidth: 2,
          title: 'MACD',
          priceScaleId: '',
        })
        indSeries.macd_line.priceScale().applyOptions({
          scaleMargins: { top: 0.72, bottom: 0.02 },
        })
        indSeries.macd_signal = chart.addSeries(LineSeries, {
          color: '#F97316',
          lineWidth: 1.5,
          title: 'Signal',
          priceScaleId: '',
        })
        indSeries.macd_signal.priceScale().applyOptions({
          scaleMargins: { top: 0.72, bottom: 0.02 },
        })
        indSeries.macd_hist = chart.addSeries(HistogramSeries, {
          title: 'Histogram',
          priceScaleId: '',
        })
        indSeries.macd_hist.priceScale().applyOptions({
          scaleMargins: { top: 0.72, bottom: 0.02 },
        })
      }
      const { macd, signal, hist } = calculateMACD(cleanData, 12, 26, 9)
      indSeries.macd_line.setData(macd)
      indSeries.macd_signal.setData(signal)
      indSeries.macd_hist.setData(hist)

      const isMacdVisible = !hiddenIndicators.macd
      indSeries.macd_line.applyOptions({ visible: isMacdVisible })
      indSeries.macd_signal.applyOptions({ visible: isMacdVisible })
      indSeries.macd_hist.applyOptions({ visible: isMacdVisible })
    } else if (indSeries.macd_line) {
      try {
        chart.removeSeries(indSeries.macd_line)
        chart.removeSeries(indSeries.macd_signal)
        chart.removeSeries(indSeries.macd_hist)
      } catch {}
      delete indSeries.macd_line
      delete indSeries.macd_signal
      delete indSeries.macd_hist
    }
  }, [chartReady, activeIndicators, hiddenIndicators, cleanData])

  // ── 5. Live Tick Streaming Handler ──
  useEffect(() => {
    const mainSeries = mainSeriesRef.current
    if (!mainSeries || !cleanData.length || !currentPrice || currentPrice <= 0) return

    const last = cleanData[cleanData.length - 1]
    const updatedClose = Number(currentPrice)
    const updatedHigh = Math.max(last.high, updatedClose)
    const updatedLow = Math.min(last.low, updatedClose)

    try {
      if (chartType === 'candlestick' || chartType === 'bar') {
        mainSeries.update({
          time: last.time,
          open: last.open,
          high: updatedHigh,
          low: updatedLow,
          close: updatedClose,
        })
      } else {
        mainSeries.update({
          time: last.time,
          value: updatedClose,
        })
      }

      if (volumeSeriesRef.current && activeIndicators.vol) {
        volumeSeriesRef.current.update({
          time: last.time,
          value: last.volume,
          color: updatedClose >= last.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
        })
      }

      const ind = indicatorSeriesRef.current

      // Live update SMA 20 on price tick
      if (ind.sma && activeIndicators.sma && cleanData.length >= 20) {
        let sum = 0
        for (let j = 1; j < 20; j++) {
          sum += cleanData[cleanData.length - 1 - j].close
        }
        sum += updatedClose
        ind.sma.update({
          time: last.time,
          value: Number((sum / 20).toFixed(2)),
        })
      }

      // Live update EMA 50 on price tick
      if (ind.ema && activeIndicators.ema && cleanData.length >= 50) {
        const k = 2 / 51
        const prevBarClose = cleanData[cleanData.length - 2].close
        const liveEma = Number((updatedClose * k + prevBarClose * (1 - k)).toFixed(2))
        ind.ema.update({
          time: last.time,
          value: liveEma,
        })
      }

      // Live update Bollinger Bands on price tick
      if (ind.bb_upper && activeIndicators.bb && cleanData.length >= 20) {
        let sum = 0
        for (let j = 1; j < 20; j++) {
          sum += cleanData[cleanData.length - 1 - j].close
        }
        sum += updatedClose
        const mean = sum / 20
        let variance = Math.pow(updatedClose - mean, 2)
        for (let j = 1; j < 20; j++) {
          variance += Math.pow(cleanData[cleanData.length - 1 - j].close - mean, 2)
        }
        const stdDev = Math.sqrt(variance / 20)
        ind.bb_mid.update({ time: last.time, value: Number(mean.toFixed(2)) })
        ind.bb_upper.update({ time: last.time, value: Number((mean + 2 * stdDev).toFixed(2)) })
        ind.bb_lower.update({ time: last.time, value: Number((mean - 2 * stdDev).toFixed(2)) })
      }
    } catch {
      // Ignored if timestamp order mismatch occurs during transition
    }
  }, [currentPrice, cleanData, chartType, activeIndicators])

  // ── 6. Fullscreen & Window Resize Handler ──
  useEffect(() => {
    const chart = chartRef.current
    const container = containerRef.current
    if (!chart || !container) return

    const fit = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w > 0 && h > 0) {
        chart.applyOptions({ width: w, height: h })
        chart.timeScale().fitContent()
      }
    }

    fit()
    const t1 = setTimeout(fit, 60)
    const t2 = setTimeout(fit, 250)

    const onKey = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('keydown', onKey)
    }
  }, [isFullscreen])

  // ── Action Handlers ──
  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
  }, [])

  const handleTakeScreenshot = useCallback(() => {
    if (!chartRef.current) return
    try {
      const canvas = chartRef.current.takeScreenshot(true, false)
      const imageUri = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = imageUri
      link.download = `${symbol}_TradingView_${timeframe}_${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (e) {
      console.error('Screenshot failed', e)
    }
  }, [symbol, timeframe])

  const toggleIndicatorActive = (id) => {
    setActiveIndicators((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleIndicatorVisibility = (id) => {
    setHiddenIndicators((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const removeIndicator = (id) => {
    setActiveIndicators((prev) => ({ ...prev, [id]: false }))
    setHiddenIndicators((prev) => ({ ...prev, [id]: false }))
  }

  const activeCount = Object.values(activeIndicators).filter(Boolean).length

  // Filtered indicators list for modal
  const filteredIndicators = AVAILABLE_INDICATORS.filter(
    (ind) =>
      ind.name.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
      ind.abbr.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
      ind.category.toLowerCase().includes(indicatorSearch.toLowerCase())
  )

  return (
    <div className={`tv-chart-wrapper ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* ── TradingView Main Controls Toolbar ── */}
      <div className="tv-toolbar">
        <div className="tv-toolbar-left">
          {/* Symbol Pill */}
          <div className="tv-symbol-pill">
            <span>{symbol}</span>
            <span className="tv-symbol-exchange">{exchange}</span>
          </div>

          <div className="tv-divider" />

          {/* Timeframe Selector */}
          <div className="tv-tf-group">
            {['1m', '5m', '15m', '1H', '1D', '1W'].map((tf) => (
              <button
                key={tf}
                className={`tv-tf-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => onTimeframeChange?.(tf)}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="tv-divider" />

          {/* Chart Type Selector */}
          <div style={{ position: 'relative' }}>
            <button
              className="tv-btn"
              onClick={() => setChartTypeMenuOpen((p) => !p)}
              title="Chart Style"
            >
              {chartType === 'candlestick' && <CandlestickChart size={14} color="var(--accent)" />}
              {chartType === 'area' && <AreaChart size={14} color="var(--accent)" />}
              {chartType === 'line' && <LineChart size={14} color="var(--accent)" />}
              {chartType === 'bar' && <BarChart2 size={14} color="var(--accent)" />}
              <span style={{ textTransform: 'capitalize' }}>{chartType}</span>
            </button>

            {chartTypeMenuOpen && (
              <div className="tv-chart-type-menu">
                <button
                  className={`tv-ct-item ${chartType === 'candlestick' ? 'active' : ''}`}
                  onClick={() => {
                    setChartType('candlestick')
                    setChartTypeMenuOpen(false)
                  }}
                >
                  <CandlestickChart size={14} /> Candlestick
                </button>
                <button
                  className={`tv-ct-item ${chartType === 'area' ? 'active' : ''}`}
                  onClick={() => {
                    setChartType('area')
                    setChartTypeMenuOpen(false)
                  }}
                >
                  <AreaChart size={14} /> Line Area
                </button>
                <button
                  className={`tv-ct-item ${chartType === 'line' ? 'active' : ''}`}
                  onClick={() => {
                    setChartType('line')
                    setChartTypeMenuOpen(false)
                  }}
                >
                  <LineChart size={14} /> Line
                </button>
                <button
                  className={`tv-ct-item ${chartType === 'bar' ? 'active' : ''}`}
                  onClick={() => {
                    setChartType('bar')
                    setChartTypeMenuOpen(false)
                  }}
                >
                  <BarChart2 size={14} /> OHLC Bars
                </button>
              </div>
            )}
          </div>

          <div className="tv-divider" />

          {/* Indicators Modal Trigger */}
          <button
            className="tv-btn tv-btn-fx"
            onClick={() => setIndicatorsModalOpen(true)}
            title="TradingView Technical Indicators & Strategies"
          >
            <Sliders size={13} />
            <span>fx Indicators</span>
            {activeCount > 0 && <span className="tv-fx-count">{activeCount}</span>}
          </button>
        </div>

        <div className="tv-toolbar-right">
          {/* Live Count to Bar Countdown */}
          <div className="tv-countdown-badge" title="Countdown to current candle bar close">
            <Clock size={12} />
            <span className="mono">{formatCountdown(barSecondsLeft)}</span>
            <span className="tv-pulse-dot" />
          </div>

          <div className="tv-divider" />

          {/* Auto Fit / Reset Zoom */}
          <button
            className="tv-icon-btn"
            onClick={handleResetZoom}
            title="Reset Zoom & Auto Scale"
          >
            <RotateCcw size={13} />
          </button>

          {/* Screenshot Camera */}
          <button
            className="tv-icon-btn"
            onClick={handleTakeScreenshot}
            title="Save Chart Snapshot Image"
          >
            <Camera size={13} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            className="tv-icon-btn"
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen TradingView Mode'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* ── Chart Canvas Viewport ── */}
      <div className="tv-chart-viewport">
        {/* On-Chart TradingView HUD & Dynamic OHLC Legend */}
        <div className="tv-legend">
          <div className="tv-legend-row">
            <span className="tv-legend-title">
              {symbol} · {timeframe} · {currency}
            </span>
            <span className="tv-legend-item">
              O: <strong>{displayedOhlc.open?.toFixed(2)}</strong>
            </span>
            <span className="tv-legend-item">
              H: <strong style={{ color: '#10B981' }}>{displayedOhlc.high?.toFixed(2)}</strong>
            </span>
            <span className="tv-legend-item">
              L: <strong style={{ color: '#EF4444' }}>{displayedOhlc.low?.toFixed(2)}</strong>
            </span>
            <span className="tv-legend-item">
              C:{' '}
              <strong className={displayedOhlc.isUp ? 'gain' : 'loss'}>
                {displayedOhlc.close?.toFixed(2)}
              </strong>
            </span>
            <span className="tv-legend-item">
              <strong className={displayedOhlc.isUp ? 'gain' : 'loss'}>
                {displayedOhlc.isUp ? '+' : ''}
                {displayedOhlc.chg?.toFixed(2)} ({displayedOhlc.isUp ? '+' : ''}
                {displayedOhlc.chgPct?.toFixed(2)}%)
              </strong>
            </span>
          </div>

          {/* Active Indicators Legend with Hide/Show & Remove Controls */}
          <div className="tv-legend-indicators">
            {AVAILABLE_INDICATORS.map((ind) => {
              if (!activeIndicators[ind.id]) return null
              const isHidden = !!hiddenIndicators[ind.id]

              return (
                <div key={ind.id} className={`tv-ind-tag ${isHidden ? 'hidden' : ''}`}>
                  <span className="tv-ind-color-dot" style={{ background: ind.color }} />
                  <span>{ind.abbr}</span>
                  <button
                    className="tv-ind-action-btn"
                    onClick={() => toggleIndicatorVisibility(ind.id)}
                    title={isHidden ? 'Show indicator' : 'Hide indicator'}
                  >
                    {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                  <button
                    className="tv-ind-action-btn remove"
                    onClick={() => removeIndicator(ind.id)}
                    title="Remove indicator"
                  >
                    <X size={11} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Brand Watermark */}
        <div className="tv-watermark">TRADEX</div>

        {/* Lightweight Charts Canvas Root */}
        <div ref={containerRef} className="tv-chart-inner" />

        {/* Loading / Empty Placeholder */}
        {cleanData.length === 0 && (
          <div className="tv-empty-placeholder">
            <span>Streaming institutional TradingView chart ticks…</span>
          </div>
        )}
      </div>

      {/* ── TradingView-style Indicators Dialog Modal ── */}
      {indicatorsModalOpen && (
        <div className="tv-modal-overlay" onClick={() => setIndicatorsModalOpen(false)}>
          <div className="tv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tv-modal-header">
              <div className="tv-modal-title">
                <Sliders size={16} color="var(--accent)" />
                <span>Indicators & Technical Strategies</span>
              </div>
              <button
                className="tv-icon-btn"
                onClick={() => setIndicatorsModalOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="tv-modal-search">
              <Search size={14} color="var(--text-4)" />
              <input
                type="text"
                placeholder="Search indicators (SMA, EMA, Bollinger, RSI, MACD, Volume)…"
                value={indicatorSearch}
                onChange={(e) => setIndicatorSearch(e.target.value)}
                autoFocus
              />
              {indicatorSearch && (
                <button
                  className="tv-ind-action-btn"
                  onClick={() => setIndicatorSearch('')}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="tv-modal-body">
              {filteredIndicators.map((ind) => {
                const isActive = !!activeIndicators[ind.id]

                return (
                  <div key={ind.id} className={`tv-ind-card ${isActive ? 'active' : ''}`}>
                    <div className="tv-ind-info">
                      <div className="tv-ind-name">
                        <span
                          className="tv-ind-color-dot"
                          style={{ background: ind.color, width: 8, height: 8 }}
                        />
                        <span>{ind.name}</span>
                        <span className="tv-ind-abbr">{ind.abbr}</span>
                      </div>
                      <div className="tv-ind-desc">{ind.desc}</div>
                    </div>

                    <button
                      className={`tv-ind-toggle-btn ${isActive ? 'active' : ''}`}
                      onClick={() => toggleIndicatorActive(ind.id)}
                    >
                      {isActive ? (
                        <>
                          <Check size={12} /> Active
                        </>
                      ) : (
                        <>
                          <Plus size={12} /> Add
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="tv-modal-footer">
              <button
                className="tv-btn tv-btn-fx"
                onClick={() => setIndicatorsModalOpen(false)}
                style={{ padding: '6px 14px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
