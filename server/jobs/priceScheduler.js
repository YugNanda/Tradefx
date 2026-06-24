// Price scheduler — refreshes tracked symbols on a rolling basis.
//
// Phase 3 (Alpha Vantage) budget model:
//   • 25 calls/day free tier (we use 23).
//   • DEFAULT_TRACKED_SYMBOLS is the always-warm set. Each extra symbol
//     a user subscribes to is refreshed on demand (first getQuote call)
//     but NOT added to the scheduled rotation unless explicitly tracked.
//
// SCHEDULE MATH (example):
//   23 budget / 3 default symbols = ~7 refreshes each per day.
//   At 3h intervals that's exactly 8 ticks per symbol per 24h, safely
//   within budget. Adjust PRICE_POLL_INTERVAL_MS to tune this.
//
//   If a user views more symbols those one-off HTTP requests consume a
//   call from the budget too (refreshSymbol is called lazily by getQuote
//   when the cache is stale). The budget guard in alphaVantageProvider
//   stops all calls once the daily cap is hit.

const marketData = require('../services/marketDataService')
const { checkAlertsForSymbol } = require('../services/alertService')
const { DEFAULT_TRACKED_SYMBOLS } = require('../utils/symbolList')
const alphavantage = require('../services/aiProviders/alphaVantageProvider')

// Default: 3 hours between scheduler ticks per cycle of all tracked symbols.
// With 3 symbols that's 3 calls / 3h = comfortable within 23/day budget.
// Set PRICE_POLL_INTERVAL_MS in .env to override.
const POLL_INTERVAL_MS = Number(process.env.PRICE_POLL_INTERVAL_MS) || 3 * 60 * 60 * 1000

// Only 1 symbol refreshed at a time to avoid burst-spending the daily budget.
const CONCURRENCY = 1

// Symbols actively requested by connected clients (joined market rooms).
// We do NOT auto-schedule these — they get refreshed lazily via getQuote
// when the client fetches them. Only DEFAULT_TRACKED_SYMBOLS are scheduled.
const subscribedSymbols = new Set()

function trackSymbol(symbol) {
  subscribedSymbols.add(String(symbol).toUpperCase())
}

function untrackSymbol(symbol) {
  subscribedSymbols.delete(String(symbol).toUpperCase())
}

async function refreshBatch(io, symbols) {
  const { used } = alphavantage.getBudget()
  if (alphavantage.isLimitReached()) {
    console.warn(`⚠️  [Scheduler] Alpha Vantage daily budget exhausted (${used} calls used). Skipping tick.`)
    return
  }

  console.log(`🔄 [Scheduler] Refreshing ${symbols.length} symbol(s): ${symbols.join(', ')} (budget: ${used} used today)`)

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY)
    await Promise.allSettled(
      batch.map(async (symbol) => {
        try {
          const quote = await marketData.refreshSymbol(symbol)
          io.to(`market:${symbol}`).emit('tick', {
            symbol,
            price: quote.price,
            changePercent: quote.changePercent,
            asOf: quote.asOf,
            approximate: quote.approximate,
            stale: !!quote.staleSince,
          })
          await checkAlertsForSymbol(io, symbol, quote.price)
        } catch (err) {
          console.warn(`⚠️  [Scheduler] Failed to refresh ${symbol}: ${err.message}`)
        }
      })
    )
  }
}

let intervalHandle = null

function start(io) {
  if (intervalHandle) return
  console.log(`🛰️  Price scheduler starting — polling every ${Math.round(POLL_INTERVAL_MS / 60000)} min`)
  console.log(`📊 Default tracked symbols: ${DEFAULT_TRACKED_SYMBOLS.join(', ')}`)

  // Initial refresh on boot (counts against budget — intentional)
  const { used } = alphavantage.getBudget()
  console.log(`💰 [AV] Budget at startup: ${used} calls used today`)
  refreshBatch(io, DEFAULT_TRACKED_SYMBOLS)

  intervalHandle = setInterval(() => {
    refreshBatch(io, DEFAULT_TRACKED_SYMBOLS)
  }, POLL_INTERVAL_MS)
}

function stop() {
  if (intervalHandle) clearInterval(intervalHandle)
  intervalHandle = null
}

module.exports = { start, stop, trackSymbol, untrackSymbol, activeSymbols: subscribedSymbols }
