/**
 * Technical Indicators Calculation Engine for TradingView Lightweight Charts
 */

/**
 * Clean and sort raw candles to ensure strict ascending time without duplicates
 */
export function normalizeCandles(rawCandles) {
  if (!rawCandles || !rawCandles.length) return []
  const seen = new Set()
  const result = []

  // Ensure items are ordered by time
  const sorted = [...rawCandles].sort((a, b) => {
    const tA = Number(a.x || a.time)
    const tB = Number(b.x || b.time)
    return tA - tB
  })

  for (const c of sorted) {
    const rawTime = Number(c.x || c.time)
    // If timestamp is in milliseconds (> 1e11), convert to seconds
    const time = rawTime > 1e11 ? Math.floor(rawTime / 1000) : Math.floor(rawTime)

    const open = Number(Array.isArray(c.y) ? c.y[0] : c.open)
    const high = Number(Array.isArray(c.y) ? c.y[1] : c.high)
    const low = Number(Array.isArray(c.y) ? c.y[2] : c.low)
    const close = Number(Array.isArray(c.y) ? c.y[3] : c.close)
    const volume = Number(c.volume || 1000)

    if (
      !Number.isFinite(time) ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue
    }

    if (seen.has(time)) continue
    seen.add(time)

    result.push({ time, open, high, low, close, volume })
  }

  return result
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(data, period = 20) {
  if (!data || data.length < period) return []
  const result = []

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close
    }
    result.push({
      time: data[i].time,
      value: Number((sum / period).toFixed(2)),
    })
  }
  return result
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(data, period = 50) {
  if (!data || data.length < period) return []
  const result = []
  const k = 2 / (period + 1)

  // Seed with SMA
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += data[i].close
  }
  let prevEma = sum / period
  result.push({
    time: data[period - 1].time,
    value: Number(prevEma.toFixed(2)),
  })

  for (let i = period; i < data.length; i++) {
    const currentEma = data[i].close * k + prevEma * (1 - k)
    prevEma = currentEma
    result.push({
      time: data[i].time,
      value: Number(currentEma.toFixed(2)),
    })
  }

  return result
}

/**
 * Bollinger Bands (BB)
 */
export function calculateBollingerBands(data, period = 20, mult = 2) {
  if (!data || data.length < period) return { upper: [], middle: [], lower: [] }
  const upper = []
  const middle = []
  const lower = []

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close
    }
    const mean = sum / period

    let variance = 0
    for (let j = 0; j < period; j++) {
      variance += Math.pow(data[i - j].close - mean, 2)
    }
    const stdDev = Math.sqrt(variance / period)

    const t = data[i].time
    middle.push({ time: t, value: Number(mean.toFixed(2)) })
    upper.push({ time: t, value: Number((mean + mult * stdDev).toFixed(2)) })
    lower.push({ time: t, value: Number((mean - mult * stdDev).toFixed(2)) })
  }

  return { upper, middle, lower }
}

/**
 * Relative Strength Index (RSI 14)
 */
export function calculateRSI(data, period = 14) {
  if (!data || data.length <= period) return []
  const result = []

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close
    if (diff >= 0) gains += diff
    else losses -= diff
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  let rsi = 100 - 100 / (1 + rs)
  result.push({ time: data[period].time, value: Number(rsi.toFixed(2)) })

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close
    const gain = diff >= 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi = 100 - 100 / (1 + rs)
    result.push({ time: data[i].time, value: Number(rsi.toFixed(2)) })
  }

  return result
}

/**
 * Moving Average Convergence Divergence (MACD 12, 26, 9)
 */
export function calculateMACD(data, fast = 12, slow = 26, signalPeriod = 9) {
  if (!data || data.length < slow + signalPeriod) return { macd: [], signal: [], hist: [] }

  const kFast = 2 / (fast + 1)
  const kSlow = 2 / (slow + 1)

  let sumFast = 0
  for (let i = 0; i < fast; i++) sumFast += data[i].close
  let emaFast = sumFast / fast

  const fastMap = new Map()
  fastMap.set(data[fast - 1].time, emaFast)
  for (let i = fast; i < data.length; i++) {
    emaFast = data[i].close * kFast + emaFast * (1 - kFast)
    fastMap.set(data[i].time, emaFast)
  }

  let sumSlow = 0
  for (let i = 0; i < slow; i++) sumSlow += data[i].close
  let emaSlow = sumSlow / slow

  const macdPoints = []
  for (let i = slow; i < data.length; i++) {
    emaSlow = data[i].close * kSlow + emaSlow * (1 - kSlow)
    const f = fastMap.get(data[i].time)
    if (f !== undefined) {
      macdPoints.push({ time: data[i].time, value: f - emaSlow })
    }
  }

  if (macdPoints.length < signalPeriod) return { macd: [], signal: [], hist: [] }

  const kSig = 2 / (signalPeriod + 1)
  let sumSig = 0
  for (let i = 0; i < signalPeriod; i++) sumSig += macdPoints[i].value
  let emaSig = sumSig / signalPeriod

  const macd = []
  const signal = []
  const hist = []

  macd.push({
    time: macdPoints[signalPeriod - 1].time,
    value: Number(macdPoints[signalPeriod - 1].value.toFixed(2)),
  })
  signal.push({
    time: macdPoints[signalPeriod - 1].time,
    value: Number(emaSig.toFixed(2)),
  })
  const initH = macdPoints[signalPeriod - 1].value - emaSig
  hist.push({
    time: macdPoints[signalPeriod - 1].time,
    value: Number(initH.toFixed(2)),
    color: initH >= 0 ? '#10B981' : '#EF4444',
  })

  for (let i = signalPeriod; i < macdPoints.length; i++) {
    emaSig = macdPoints[i].value * kSig + emaSig * (1 - kSig)
    const mVal = Number(macdPoints[i].value.toFixed(2))
    const sVal = Number(emaSig.toFixed(2))
    const hVal = Number((mVal - sVal).toFixed(2))

    macd.push({ time: macdPoints[i].time, value: mVal })
    signal.push({ time: macdPoints[i].time, value: sVal })
    hist.push({
      time: macdPoints[i].time,
      value: hVal,
      color: hVal >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)',
    })
  }

  return { macd, signal, hist }
}
