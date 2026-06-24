// Signal service — generates BUY/SELL/HOLD signals from accumulated price
// history using simple technical rules. No AI API calls needed here.
//
// Why rule-based instead of AI?
//   • Gemini/OpenAI keys are removed from Phase 3 to avoid quota exhaustion.
//   • For an educational trading journal app, a transparent rule-based
//     signal is actually more useful than an AI black-box — users can see
//     exactly why a signal fired.
//
// Rules used (in order of priority):
//   1. RSI-like momentum (average of last N changes)
//   2. Simple Moving Average crossover (short vs long)
//   3. Recent price trend (last 5 vs prior 5)

const PriceCache = require('../models/PriceCache')
const { bySymbol } = require('../utils/symbolList')

const SIGNAL_CACHE_MS = 15 * 60 * 1000 // 15 min in-process cache
const signalCache = new Map()

// ── Technical helpers ──────────────────────────────────────────────

function sma(prices, period) {
  if (prices.length < period) return null
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

/**
 * Produce a BUY/SELL/HOLD signal from a price history array.
 * @param {number[]} prices – Chronological array of close prices (oldest first)
 */
function computeSignal(prices) {
  if (!prices || prices.length < 5) {
    return { signal: 'HOLD', confidence: 0, rationale: 'Insufficient price history to generate a signal.' }
  }

  const shortPeriod = Math.min(5, Math.floor(prices.length / 2))
  const longPeriod = Math.min(20, prices.length)

  const shortMA = sma(prices, shortPeriod)
  const longMA = sma(prices, longPeriod)

  // Momentum: average % change over recent window
  const recent = prices.slice(-shortPeriod)
  const changes = recent.slice(1).map((p, i) => (p - recent[i]) / recent[i])
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length

  let signal = 'HOLD'
  let confidence = 50
  let rationale = ''

  if (shortMA !== null && longMA !== null) {
    if (shortMA > longMA * 1.005) {
      signal = 'BUY'
      confidence = Math.min(80, 50 + Math.round(((shortMA / longMA - 1) * 100) * 100))
      rationale = `Short-term average (${shortMA.toFixed(2)}) is above the long-term average (${longMA.toFixed(2)}), suggesting upward momentum.`
    } else if (shortMA < longMA * 0.995) {
      signal = 'SELL'
      confidence = Math.min(80, 50 + Math.round(((longMA / shortMA - 1) * 100) * 100))
      rationale = `Short-term average (${shortMA.toFixed(2)}) is below the long-term average (${longMA.toFixed(2)}), suggesting downward pressure.`
    } else {
      signal = 'HOLD'
      confidence = 40
      rationale = `Moving averages are closely aligned (short: ${shortMA.toFixed(2)}, long: ${longMA.toFixed(2)}); no clear directional signal.`
    }
  } else {
    // Only trend data available
    if (avgChange > 0.003) {
      signal = 'BUY'; confidence = 45
      rationale = `Recent price trend is positive (avg change ${(avgChange * 100).toFixed(2)}%/tick).`
    } else if (avgChange < -0.003) {
      signal = 'SELL'; confidence = 45
      rationale = `Recent price trend is negative (avg change ${(avgChange * 100).toFixed(2)}%/tick).`
    } else {
      rationale = `No significant short-term trend detected (avg change ${(avgChange * 100).toFixed(2)}%/tick).`
    }
  }

  return { signal, confidence: Math.max(0, Math.min(100, confidence)), rationale }
}

// ── Public API ─────────────────────────────────────────────────────

async function getSignal(symbol) {
  const instrument = bySymbol(symbol)
  if (!instrument) throw new Error(`Unknown symbol: ${symbol}`)

  const cached = signalCache.get(instrument.symbol)
  if (cached && Date.now() - cached.generatedAt < SIGNAL_CACHE_MS) return cached

  const priceDoc = await PriceCache.findOne({ symbol: instrument.symbol })
  const history = (priceDoc?.history || []).slice(-30) // use up to 30 most recent ticks
  const prices = history.map((h) => h.price).filter(Boolean)

  const { signal, confidence, rationale } = computeSignal(prices)

  const payload = {
    symbol: instrument.symbol,
    signal,
    confidence,
    rationale,
    generatedAt: Date.now(),
    disclaimer:
      'Rule-based signal for educational use only. Not financial advice. Based on accumulated price history in this app.',
  }

  signalCache.set(instrument.symbol, payload)
  return payload
}

module.exports = { getSignal }
