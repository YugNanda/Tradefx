// Orchestrates price fetching via Alpha Vantage, with an in-memory cache
// for fast reads and a Mongo-backed cache for persistence and chart history.
//
// REPLACING Phase 2 Gemini/OpenAI approach with Alpha Vantage (real market
// data API). Key budget differences:
//   • Alpha Vantage free tier: 25 calls/day (we cap at 23)
//   • No AI latency / hallucination risk on prices
//   • Scheduler enforces per-symbol refresh windows to stay in budget

const alphavantage = require('./aiProviders/alphaVantageProvider')
const PriceCache = require('../models/PriceCache')
const { bySymbol } = require('../utils/symbolList')

// Serve cached price for up to 15 minutes before forcing a refresh.
// Higher than Phase 2 (5 min) to stay inside the 25 calls/day budget.
const STALE_AFTER_MS = Number(process.env.PRICE_STALE_MS) || 15 * 60 * 1000

// In-memory mirror of the latest known price per symbol, for zero-latency
// reads without hitting Mongo on every request.
const memoryCache = new Map()

// Backoff per symbol: if AV returns an error for a symbol we don't hammer
// it on every scheduler tick — back off exponentially (1m, 2m, 4m … 30m).
const failureBackoff = new Map() // symbol -> { until, failCount }

function isBackingOff(symbol) {
  const entry = failureBackoff.get(symbol)
  return !!entry && Date.now() < entry.until
}

function recordFailure(symbol) {
  const entry = failureBackoff.get(symbol) || { failCount: 0 }
  entry.failCount += 1
  const backoffMs = Math.min(30 * 60 * 1000, 60_000 * 2 ** (entry.failCount - 1))
  entry.until = Date.now() + backoffMs
  failureBackoff.set(symbol, entry)
  console.warn(`⚠️  [AV] Backoff ${symbol} for ${Math.round(backoffMs / 60000)} min (fail #${entry.failCount})`)
}

function recordSuccess(symbol) {
  failureBackoff.delete(symbol)
}

/**
 * Refresh a single symbol from Alpha Vantage. Updates memory + Mongo cache,
 * appends to rolling price history. Returns the updated plain object.
 * Throws only if there's no existing cached value to fall back on.
 */
async function refreshSymbol(symbol) {
  const instrument = bySymbol(symbol)
  if (!instrument) throw new Error(`Unknown symbol: ${symbol}`)

  let doc = await PriceCache.findOne({ symbol: instrument.symbol })
  if (!doc) {
    doc = new PriceCache({
      symbol: instrument.symbol,
      name: instrument.name,
      exchange: instrument.exchange,
      assetClass: instrument.assetClass,
      currency: instrument.currency,
    })
  }

  // Symbol is in backoff window AND we have a cached price → serve stale
  if (isBackingOff(instrument.symbol) && doc.price != null) {
    const plain = doc.toObject()
    memoryCache.set(instrument.symbol, plain)
    return plain
  }

  // Alpha Vantage daily budget exhausted → serve stale or throw
  if (alphavantage.isLimitReached()) {
    if (doc.price != null) {
      if (!doc.staleSince) {
        doc.staleSince = new Date()
        await doc.save()
      }
      const plain = doc.toObject()
      memoryCache.set(instrument.symbol, plain)
      console.warn(`⚠️  [AV] Daily budget exhausted — serving stale cache for ${symbol}`)
      return plain
    }
    throw new Error(`Alpha Vantage daily limit reached and no cache for ${symbol}`)
  }

  try {
    const quote = await alphavantage.getQuote(instrument)

    doc.price = quote.price
    doc.changePercent = typeof quote.changePercent === 'number' ? quote.changePercent : doc.changePercent
    doc.dayHigh = quote.dayHigh ?? doc.dayHigh
    doc.dayLow = quote.dayLow ?? doc.dayLow
    doc.asOf = quote.asOf ? new Date(quote.asOf) : new Date()
    doc.provider = quote.provider
    doc.sourceName = quote.sourceName || 'Alpha Vantage'
    doc.approximate = false // AV is a real market data feed, not AI-estimated
    doc.staleSince = null
    doc.pushHistory()
    await doc.save()
    recordSuccess(instrument.symbol)

    const { used } = alphavantage.getBudget()
    console.log(`✅ [AV] ${symbol} = ${quote.price} ${instrument.currency} (budget used today: ${used})`)
  } catch (err) {
    recordFailure(instrument.symbol)
    if (!doc.staleSince) doc.staleSince = new Date()
    if (doc.price == null) throw err
    await doc.save()
    console.warn(`⚠️  [AV] Price refresh failed for ${symbol}, serving stale cache: ${err.message}`)
  }

  const plain = doc.toObject()
  memoryCache.set(instrument.symbol, plain)
  return plain
}

/**
 * Get the current price for a symbol. Serves from memory cache if fresh
 * enough; otherwise triggers a refresh (awaited, so the caller always gets
 * a usable value on first request).
 */
async function getQuote(symbol) {
  const instrument = bySymbol(symbol)
  if (!instrument) throw new Error(`Unknown symbol: ${symbol}`)

  const cached = memoryCache.get(instrument.symbol)
  const isFresh = cached?.asOf && Date.now() - new Date(cached.asOf).getTime() < STALE_AFTER_MS

  if (isFresh) return cached

  // Fall back to Mongo before hitting the API (covers server restarts).
  if (!cached) {
    const doc = await PriceCache.findOne({ symbol: instrument.symbol })
    if (doc) {
      const plain = doc.toObject()
      const stillFresh = doc.asOf && Date.now() - new Date(doc.asOf).getTime() < STALE_AFTER_MS
      memoryCache.set(instrument.symbol, plain)
      if (stillFresh) return plain
    }
  }

  return refreshSymbol(instrument.symbol)
}

async function getQuotes(symbols) {
  const results = await Promise.allSettled(symbols.map((s) => getQuote(s)))
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { symbol: symbols[i], error: r.reason.message }
  )
}

function getCachedSync(symbol) {
  return memoryCache.get(String(symbol).toUpperCase()) || null
}

module.exports = { getQuote, getQuotes, refreshSymbol, getCachedSync, STALE_AFTER_MS }
