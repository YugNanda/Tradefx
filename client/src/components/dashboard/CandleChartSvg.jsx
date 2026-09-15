import { useState, useMemo, useRef } from 'react'

export default function CandleChartSvg({
  candles = [],
  currentPrice,
  symbol = '',
  isDark = true,
  currency = 'INR',
  timeframe = '1m',
  indicators = { sma: false, ema: false, bb: false, rsi: false },
  onToggleIndicator,
}) {
  const containerRef = useRef(null)
  const [hoverIndex, setHoverIndex] = useState(null)

  const showRsi = !!indicators?.rsi
  const width = 800
  const baseChartHeight = 290
  const rsiHeight = showRsi ? 75 : 0
  const height = baseChartHeight + rsiHeight

  const padLeft = 14
  const padRight = 72
  const padTop = 22
  const padBottom = 32
  const volHeight = 40

  const plotWidth = width - padLeft - padRight
  const plotHeight = baseChartHeight - padTop - padBottom - volHeight

  // RSI bounds
  const rsiTop = baseChartHeight + 8
  const rsiPlotHeight = rsiHeight > 0 ? rsiHeight - 20 : 0

  // Compute price ranges
  const { minPrice, maxPrice, priceSpan, minVol, maxVol } = useMemo(() => {
    if (!candles.length) {
      const p = currentPrice || 100
      return { minPrice: p * 0.99, maxPrice: p * 1.01, priceSpan: p * 0.02, minVol: 0, maxVol: 10000 }
    }

    let min = Infinity
    let max = -Infinity
    let mVol = 0

    candles.forEach((c) => {
      const low = Number(c.y[2])
      const high = Number(c.y[1])
      const vol = Number(c.volume || 10000)
      if (low < min) min = low
      if (high > max) max = high
      if (vol > mVol) mVol = vol
    })

    if (currentPrice) {
      if (currentPrice < min) min = currentPrice
      if (currentPrice > max) max = currentPrice
    }

    const rawSpan = Math.max(0.01, max - min)
    const margin = rawSpan * 0.04
    const adjustedMin = min - margin
    const adjustedMax = max + margin
    const span = adjustedMax - adjustedMin

    return {
      minPrice: adjustedMin,
      maxPrice: adjustedMax,
      priceSpan: span,
      minVol: 0,
      maxVol: Math.max(100, mVol),
    }
  }, [candles, currentPrice])

  // Coordinate mappers
  const getY = (price) => {
    if (!priceSpan) return padTop + plotHeight / 2
    const ratio = (price - minPrice) / priceSpan
    return padTop + (1 - ratio) * plotHeight
  }

  const getVolY = (vol) => {
    const volBase = baseChartHeight - padBottom
    if (!maxVol) return volBase
    const h = (vol / maxVol) * volHeight
    return volBase - h
  }

  const getRsiY = (val) => {
    const clamped = Math.max(0, Math.min(100, val))
    return rsiTop + (1 - clamped / 100) * rsiPlotHeight
  }

  const count = candles.length
  const candlePitch = count > 0 ? plotWidth / count : plotWidth
  const bodyWidth = Math.max(3, Math.min(16, candlePitch * 0.72))

  // Technical Indicators Calculation
  const indicatorData = useMemo(() => {
    if (!candles.length) return { sma: [], ema: [], bb: [], rsi: [] }

    const closes = candles.map((c) => Number(c.y[3]))
    const len = closes.length

    // 1. SMA 20
    const smaPeriod = 20
    const sma = closes.map((_, i) => {
      if (i < 1) return null
      const start = Math.max(0, i - smaPeriod + 1)
      const subset = closes.slice(start, i + 1)
      const sum = subset.reduce((acc, v) => acc + v, 0)
      return sum / subset.length
    })

    // 2. EMA 50
    const emaPeriod = 50
    const k = 2 / (emaPeriod + 1)
    const ema = []
    let prevEma = closes[0]
    closes.forEach((c, i) => {
      if (i === 0) {
        ema.push(prevEma)
      } else {
        const next = c * k + prevEma * (1 - k)
        ema.push(next)
        prevEma = next
      }
    })

    // 3. Bollinger Bands (20, 2)
    const bb = closes.map((c, i) => {
      const mid = sma[i]
      if (mid == null || i < 3) return null
      const start = Math.max(0, i - smaPeriod + 1)
      const subset = closes.slice(start, i + 1)
      const variance = subset.reduce((acc, v) => acc + Math.pow(v - mid, 2), 0) / subset.length
      const stdDev = Math.sqrt(variance)
      return {
        upper: mid + 2 * stdDev,
        mid,
        lower: mid - 2 * stdDev,
      }
    })

    // 4. RSI (14)
    const rsiPeriod = 14
    const rsi = []
    let avgGain = 0
    let avgLoss = 0

    for (let i = 0; i < len; i++) {
      if (i === 0) {
        rsi.push(50)
        continue
      }
      const diff = closes[i] - closes[i - 1]
      const gain = Math.max(0, diff)
      const loss = Math.max(0, -diff)

      if (i <= rsiPeriod) {
        avgGain += gain / rsiPeriod
        avgLoss += loss / rsiPeriod
        if (i === rsiPeriod) {
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
          rsi.push(Number((100 - 100 / (1 + rs)).toFixed(1)))
        } else {
          rsi.push(50)
        }
      } else {
        avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod
        avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
        rsi.push(Number((100 - 100 / (1 + rs)).toFixed(1)))
      }
    }

    return { sma, ema, bb, rsi }
  }, [candles])

  // Hover interaction
  const handleMouseMove = (e) => {
    if (!containerRef.current || count === 0) return
    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * width
    const relX = mouseX - padLeft
    if (relX < 0 || relX > plotWidth) {
      setHoverIndex(null)
      return
    }
    const idx = Math.floor(relX / candlePitch)
    setHoverIndex(Math.max(0, Math.min(count - 1, idx)))
  }

  const handleMouseLeave = () => setHoverIndex(null)

  // Colors
  const gridColor = isDark ? 'rgba(241, 245, 249, 0.07)' : 'rgba(15, 23, 42, 0.08)'
  const axisTextColor = isDark ? '#94A3B8' : '#64748B'
  const beamColor = isDark ? '#3B82F6' : '#2563EB'
  const hoverBar = hoverIndex != null ? candles[hoverIndex] : null

  // Price grid levels (4 steps)
  const priceLevels = useMemo(() => {
    if (!priceSpan) return []
    const steps = 4
    const list = []
    for (let i = 0; i <= steps; i++) {
      const p = minPrice + (priceSpan / steps) * i
      list.push({ price: p, y: getY(p) })
    }
    return list
  }, [minPrice, priceSpan])

  // Live Price Line Y
  const currentY = currentPrice ? getY(currentPrice) : null

  // Paths for Indicators
  const smaPath = useMemo(() => {
    if (!indicators.sma) return ''
    const pts = []
    indicatorData.sma.forEach((val, i) => {
      if (val != null) {
        pts.push(`${padLeft + (i + 0.5) * candlePitch},${getY(val)}`)
      }
    })
    return pts.join(' ')
  }, [indicators.sma, indicatorData.sma, candlePitch])

  const emaPath = useMemo(() => {
    if (!indicators.ema) return ''
    const pts = []
    indicatorData.ema.forEach((val, i) => {
      if (val != null) {
        pts.push(`${padLeft + (i + 0.5) * candlePitch},${getY(val)}`)
      }
    })
    return pts.join(' ')
  }, [indicators.ema, indicatorData.ema, candlePitch])

  const { bbUpperPath, bbLowerPath, bbPolyPath } = useMemo(() => {
    if (!indicators.bb) return { bbUpperPath: '', bbLowerPath: '', bbPolyPath: '' }
    const uPts = []
    const lPts = []
    indicatorData.bb.forEach((b, i) => {
      if (b != null) {
        const x = padLeft + (i + 0.5) * candlePitch
        uPts.push(`${x},${getY(b.upper)}`)
        lPts.push(`${x},${getY(b.lower)}`)
      }
    })
    const poly = [...uPts, ...lPts.reverse()].join(' ')
    return {
      bbUpperPath: uPts.join(' '),
      bbLowerPath: lPts.join(' '),
      bbPolyPath: poly,
    }
  }, [indicators.bb, indicatorData.bb, candlePitch])

  const rsiPath = useMemo(() => {
    if (!indicators.rsi) return ''
    const pts = []
    indicatorData.rsi.forEach((val, i) => {
      if (val != null) {
        pts.push(`${padLeft + (i + 0.5) * candlePitch},${getRsiY(val)}`)
      }
    })
    return pts.join(' ')
  }, [indicators.rsi, indicatorData.rsi, candlePitch])

  // Active or hovered indicator values for the live HUD
  const activeIdx = hoverIndex != null ? hoverIndex : Math.max(0, count - 1)
  const activeSma = indicatorData.sma[activeIdx]
  const activeEma = indicatorData.ema[activeIdx]
  const activeBb = indicatorData.bb[activeIdx]
  const activeRsi = indicatorData.rsi[activeIdx]

  return (
    <div
      className="candle-svg-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        userSelect: 'none',
      }}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* On-Chart Indicator Quick Toggles */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          right: padRight + 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontSize: '9.5px',
            color: 'var(--text-4)',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Indicators:
        </span>
        <button
          type="button"
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: indicators.sma ? '1px solid #F59E0B' : '1px solid var(--border)',
            background: indicators.sma ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-card)',
            color: indicators.sma ? '#F59E0B' : 'var(--text-3)',
            transition: 'all 0.15s ease',
          }}
          onClick={() => onToggleIndicator?.('sma')}
          title="Toggle 20-period Simple Moving Average"
        >
          SMA 20
        </button>
        <button
          type="button"
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: indicators.ema ? '1px solid #06B6D4' : '1px solid var(--border)',
            background: indicators.ema ? 'rgba(6, 182, 212, 0.18)' : 'var(--bg-card)',
            color: indicators.ema ? '#06B6D4' : 'var(--text-3)',
            transition: 'all 0.15s ease',
          }}
          onClick={() => onToggleIndicator?.('ema')}
          title="Toggle 50-period Exponential Moving Average"
        >
          EMA 50
        </button>
        <button
          type="button"
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: indicators.bb ? '1px solid #60A5FA' : '1px solid var(--border)',
            background: indicators.bb ? 'rgba(96, 165, 250, 0.18)' : 'var(--bg-card)',
            color: indicators.bb ? '#60A5FA' : 'var(--text-3)',
            transition: 'all 0.15s ease',
          }}
          onClick={() => onToggleIndicator?.('bb')}
          title="Toggle Bollinger Bands (20, 2)"
        >
          BB (20,2)
        </button>
        <button
          type="button"
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: indicators.rsi ? '1px solid #A855F7' : '1px solid var(--border)',
            background: indicators.rsi ? 'rgba(168, 85, 247, 0.18)' : 'var(--bg-card)',
            color: indicators.rsi ? '#A855F7' : 'var(--text-3)',
            transition: 'all 0.15s ease',
          }}
          onClick={() => onToggleIndicator?.('rsi')}
          title="Toggle 14-period Relative Strength Index"
        >
          RSI 14
        </button>
      </div>

      {/* Active Indicator Legend Bar */}
      {(indicators.sma || indicators.ema || indicators.bb || indicators.rsi) && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: padLeft,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            fontSize: '10.5px',
            fontFamily: 'var(--mono)',
            zIndex: 6,
            pointerEvents: 'none',
          }}
        >
          {indicators.sma && activeSma != null && (
            <span style={{ color: '#F59E0B', fontWeight: 700 }}>
              SMA(20): {activeSma.toFixed(2)}
            </span>
          )}
          {indicators.ema && activeEma != null && (
            <span style={{ color: '#06B6D4', fontWeight: 700 }}>
              EMA(50): {activeEma.toFixed(2)}
            </span>
          )}
          {indicators.bb && activeBb != null && (
            <span style={{ color: '#60A5FA', fontWeight: 700 }}>
              BB(20,2): [{activeBb.lower.toFixed(2)} — {activeBb.upper.toFixed(2)}]
            </span>
          )}
          {indicators.rsi && activeRsi != null && (
            <span style={{ color: '#A855F7', fontWeight: 700 }}>
              RSI(14): {activeRsi}
            </span>
          )}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Background Grid Lines & Y-Axis Labels */}
        {priceLevels.map((lvl, idx) => (
          <g key={idx}>
            <line
              x1={padLeft}
              y1={lvl.y}
              x2={width - padRight}
              y2={lvl.y}
              stroke={gridColor}
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <text
              x={width - padRight + 8}
              y={lvl.y + 3.5}
              fill={axisTextColor}
              fontSize="9.5"
              fontFamily="var(--mono)"
              textAnchor="start"
            >
              {lvl.price.toFixed(lvl.price < 2 ? 4 : 2)}
            </text>
          </g>
        ))}

        {/* Volume Separator Line */}
        <line
          x1={padLeft}
          y1={baseChartHeight - padBottom - volHeight}
          x2={width - padRight}
          y2={baseChartHeight - padBottom - volHeight}
          stroke={gridColor}
          strokeWidth="1"
        />

        {/* Bollinger Bands Shaded Channel & Lines */}
        {indicators.bb && bbPolyPath && (
          <polygon
            points={bbPolyPath}
            fill={isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(37, 99, 235, 0.06)'}
          />
        )}
        {indicators.bb && bbUpperPath && (
          <polyline
            points={bbUpperPath}
            fill="none"
            stroke="#60A5FA"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
        )}
        {indicators.bb && bbLowerPath && (
          <polyline
            points={bbLowerPath}
            fill="none"
            stroke="#60A5FA"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
        )}

        {/* Candlesticks & Volume Bars */}
        {candles.map((c, i) => {
          const open = Number(c.y[0])
          const high = Number(c.y[1])
          const low = Number(c.y[2])
          const close = Number(c.y[3])
          const vol = Number(c.volume || 5000)

          const isUp = close >= open
          const color = isUp ? '#10B981' : '#EF4444'

          const xCenter = padLeft + (i + 0.5) * candlePitch
          const yHigh = getY(high)
          const yLow = getY(low)
          const yOpen = getY(open)
          const yClose = getY(close)

          const bodyTop = Math.min(yOpen, yClose)
          const bodyBottom = Math.max(yOpen, yClose)
          const bodyHeight = Math.max(2.5, bodyBottom - bodyTop)

          const volY = getVolY(vol)
          const volH = Math.max(2, baseChartHeight - padBottom - volY)

          const isHovered = hoverIndex === i

          return (
            <g key={i} opacity={hoverIndex != null && !isHovered ? 0.45 : 1}>
              {/* Volume Bar */}
              <rect
                x={xCenter - bodyWidth / 2}
                y={volY}
                width={bodyWidth}
                height={volH}
                fill={color}
                opacity={isDark ? 0.3 : 0.35}
                rx="1"
              />

              {/* Upper & Lower Wick */}
              <line
                x1={xCenter}
                y1={yHigh}
                x2={xCenter}
                y2={yLow}
                stroke={color}
                strokeWidth={bodyWidth > 6 ? 1.8 : 1.2}
                strokeLinecap="round"
              />

              {/* Candle Body */}
              <rect
                x={xCenter - bodyWidth / 2}
                y={bodyTop}
                width={bodyWidth}
                height={bodyHeight}
                fill={color}
                rx="1"
              />

              {/* Timestamp label for sample intervals */}
              {i % Math.max(1, Math.floor(count / 5)) === 0 && (
                <text
                  x={xCenter}
                  y={baseChartHeight - padBottom + 16}
                  fill={axisTextColor}
                  fontSize="9.5"
                  fontFamily="var(--mono)"
                  textAnchor="middle"
                >
                  {new Date(c.x).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </text>
              )}
            </g>
          )
        })}

        {/* SMA 20 Overlay Line */}
        {indicators.sma && smaPath && (
          <polyline
            points={smaPath}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* EMA 50 Overlay Line */}
        {indicators.ema && emaPath && (
          <polyline
            points={emaPath}
            fill="none"
            stroke="#06B6D4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Live Current Price Tracking Beam & Badge */}
        {currentY != null && currentY >= padTop && currentY <= baseChartHeight - padBottom && (
          <g>
            <line
              x1={padLeft}
              y1={currentY}
              x2={width - padRight}
              y2={currentY}
              stroke={beamColor}
              strokeDasharray="4 3"
              strokeWidth="1.2"
            />
            <circle cx={width - padRight} cy={currentY} r="3.5" fill={beamColor} />
            <rect
              x={width - padRight + 2}
              y={currentY - 9}
              width={66}
              height={18}
              rx="4"
              fill={beamColor}
            />
            <text
              x={width - padRight + 35}
              y={currentY + 3.5}
              fill="#FFFFFF"
              fontSize="9"
              fontFamily="var(--mono)"
              fontWeight="700"
              textAnchor="middle"
            >
              {currentPrice.toFixed(currentPrice < 2 ? 4 : 2)}
            </text>
          </g>
        )}

        {/* ─── RSI Sub-Panel ─── */}
        {showRsi && (
          <g>
            {/* Panel separator */}
            <line
              x1={padLeft}
              y1={baseChartHeight}
              x2={width - padRight}
              y2={baseChartHeight}
              stroke={gridColor}
              strokeWidth="1.5"
            />

            {/* Overbought 70 Line */}
            <line
              x1={padLeft}
              y1={getRsiY(70)}
              x2={width - padRight}
              y2={getRsiY(70)}
              stroke="#EF4444"
              strokeDasharray="3 3"
              strokeWidth="0.9"
              opacity="0.6"
            />
            <text
              x={width - padRight + 8}
              y={getRsiY(70) + 3}
              fill="#EF4444"
              fontSize="8.5"
              fontFamily="var(--mono)"
            >
              70
            </text>

            {/* Middle 50 Line */}
            <line
              x1={padLeft}
              y1={getRsiY(50)}
              x2={width - padRight}
              y2={getRsiY(50)}
              stroke={axisTextColor}
              strokeDasharray="2 2"
              strokeWidth="0.8"
              opacity="0.4"
            />

            {/* Oversold 30 Line */}
            <line
              x1={padLeft}
              y1={getRsiY(30)}
              x2={width - padRight}
              y2={getRsiY(30)}
              stroke="#10B981"
              strokeDasharray="3 3"
              strokeWidth="0.9"
              opacity="0.6"
            />
            <text
              x={width - padRight + 8}
              y={getRsiY(30) + 3}
              fill="#10B981"
              fontSize="8.5"
              fontFamily="var(--mono)"
            >
              30
            </text>

            {/* RSI Line */}
            {rsiPath && (
              <polyline
                points={rsiPath}
                fill="none"
                stroke="#A855F7"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Sub-panel Title */}
            <text
              x={padLeft}
              y={baseChartHeight + 14}
              fill="#A855F7"
              fontSize="9"
              fontWeight="700"
              fontFamily="var(--mono)"
            >
              RSI (14)
            </text>
          </g>
        )}

        {/* Interactive Crosshairs */}
        {hoverIndex != null && hoverBar && (
          <g pointerEvents="none">
            <line
              x1={padLeft + (hoverIndex + 0.5) * candlePitch}
              y1={padTop}
              x2={padLeft + (hoverIndex + 0.5) * candlePitch}
              y2={height - padBottom}
              stroke={axisTextColor}
              strokeDasharray="2 2"
              strokeWidth="1"
              opacity="0.8"
            />
            <line
              x1={padLeft}
              y1={getY(hoverBar.y[3])}
              x2={width - padRight}
              y2={getY(hoverBar.y[3])}
              stroke={axisTextColor}
              strokeDasharray="2 2"
              strokeWidth="1"
              opacity="0.8"
            />
          </g>
        )}
      </svg>

      {/* Floating Interactive Hover Tooltip */}
      {hoverIndex != null && hoverBar && (
        <div
          style={{
            position: 'absolute',
            top: 26,
            left: 14,
            padding: '4px 10px',
            background: isDark ? 'rgba(14, 20, 32, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-sm)',
            fontSize: '11px',
            fontFamily: 'var(--mono)',
            color: 'var(--text-1)',
            display: 'flex',
            gap: 12,
            boxShadow: 'var(--shadow-md)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <span>
            {new Date(hoverBar.x).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })}
          </span>
          <span>O: <strong>{Number(hoverBar.y[0]).toFixed(2)}</strong></span>
          <span style={{ color: '#10B981' }}>H: <strong>{Number(hoverBar.y[1]).toFixed(2)}</strong></span>
          <span style={{ color: '#EF4444' }}>L: <strong>{Number(hoverBar.y[2]).toFixed(2)}</strong></span>
          <span>C: <strong>{Number(hoverBar.y[3]).toFixed(2)}</strong></span>
          <span style={{ color: 'var(--text-4)' }}>Vol: {hoverBar.volume?.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
