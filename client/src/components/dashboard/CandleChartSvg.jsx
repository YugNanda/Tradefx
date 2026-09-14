import { useState, useMemo, useRef } from 'react'

export default function CandleChartSvg({
  candles = [],
  currentPrice,
  symbol = '',
  isDark = true,
  currency = 'INR',
  timeframe = '1m',
}) {
  const containerRef = useRef(null)
  const [hoverIndex, setHoverIndex] = useState(null)

  // Chart dimensions
  const width = 800
  const height = 290
  const padLeft = 14
  const padRight = 72
  const padTop = 18
  const padBottom = 34
  const volHeight = 44

  const plotWidth = width - padLeft - padRight
  const plotHeight = height - padTop - padBottom - volHeight

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

    // Add margin top and bottom so wicks never touch borders
    const rawSpan = Math.max(0.01, max - min)
    const margin = rawSpan * 0.035
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
    const volBase = height - padBottom
    if (!maxVol) return volBase
    const h = (vol / maxVol) * volHeight
    return volBase - h
  }

  const count = candles.length
  const candlePitch = count > 0 ? plotWidth / count : plotWidth
  const bodyWidth = Math.max(3, Math.min(16, candlePitch * 0.72))

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

  // Color tokens
  const gridColor = isDark ? 'rgba(241, 245, 249, 0.07)' : 'rgba(101, 123, 131, 0.16)'
  const axisTextColor = isDark ? '#94A3B8' : '#657B83'
  const beamColor = isDark ? '#3B82F6' : '#268BD2'
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

  return (
    <div
      className="candle-svg-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        height: '290px',
        userSelect: 'none',
      }}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
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
          y1={height - padBottom - volHeight}
          x2={width - padRight}
          y2={height - padBottom - volHeight}
          stroke={gridColor}
          strokeWidth="1"
        />

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
          const volH = Math.max(2, height - padBottom - volY)

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
                opacity={isDark ? 0.3 : 0.4}
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
                  y={height - padBottom + 16}
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

        {/* Live Current Price Tracking Beam & Badge */}
        {currentY != null && currentY >= padTop && currentY <= height - padBottom && (
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
            {/* Price Pill on Right Axis */}
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

        {/* Interactive Crosshair */}
        {hoverIndex != null && hoverBar && (
          <g pointerEvents="none">
            {/* Vertical crosshair line */}
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
            {/* Horizontal crosshair line */}
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
            top: 8,
            left: 14,
            padding: '4px 10px',
            background: isDark ? 'rgba(14, 20, 32, 0.92)' : 'rgba(253, 246, 227, 0.94)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            fontSize: '11px',
            fontFamily: 'var(--mono)',
            color: 'var(--text-1)',
            display: 'flex',
            gap: 12,
            boxShadow: 'var(--shadow-sm)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <span>{new Date(hoverBar.x).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
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
