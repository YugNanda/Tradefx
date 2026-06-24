// Alpha Vantage provider for real-time market prices.
//
// FREE TIER LIMITS (as of 2026):
//   • 25 requests/day  (hard daily cap)
//   • 500 requests/month
//
// BUDGET STRATEGY — this module is the ONLY place that calls the API.
// The daily budget is tracked in-process and persists across restarts via
// a lightweight JSON file (AV_BUDGET_FILE). The scheduler is responsible
// for enforcing how often symbols get refreshed; this provider just says
// "yes I can" or "no I'm at my limit" for each individual call.
//
// Symbol mapping: Alpha Vantage uses its own ticker conventions.
//   • NSE Indian stocks → "RELIANCE.BSE" style (not always reliable on free tier)
//   • Crypto           → CURRENCY_EXCHANGE_RATE (FROM_CURRENCY / USD)
//   • Forex            → CURRENCY_EXCHANGE_RATE
//   • US stocks/ETFs   → plain ticker (AAPL, MSFT…)

const fs = require('fs')
const path = require('path')

const BASE_URL = 'https://www.alphavantage.co/query'
const TIMEOUT_MS = 10000

// Where we persist today's call count so restarts don't lose the tally.
const BUDGET_FILE = path.join(__dirname, '../../.av_budget.json')

// Daily limit — Alpha Vantage free tier is 25. We cap at 23 to leave a
// 2-call safety buffer for manual testing / health checks.
const DAILY_LIMIT = parseInt(process.env.AV_DAILY_LIMIT || '23', 10)

// ── Budget tracking ────────────────────────────────────────────────

function loadBudget() {
  try {
    const raw = fs.readFileSync(BUDGET_FILE, 'utf8')
    const data = JSON.parse(raw)
    // Reset if it's a new calendar day (UTC).
    const today = new Date().toISOString().slice(0, 10)
    if (data.date !== today) return { date: today, used: 0 }
    return data
  } catch {
    return { date: new Date().toISOString().slice(0, 10), used: 0 }
  }
}

function saveBudget(budget) {
  try {
    fs.writeFileSync(BUDGET_FILE, JSON.stringify(budget), 'utf8')
  } catch (err) {
    console.warn('⚠️  AV budget file write failed:', err.message)
  }
}

function getBudget() {
  return loadBudget()
}

function consumeOne() {
  const budget = loadBudget()
  budget.used += 1
  saveBudget(budget)
  return budget
}

function isLimitReached() {
  const budget = loadBudget()
  return budget.used >= DAILY_LIMIT
}

// ── Symbol mapping ─────────────────────────────────────────────────
// Returns { func, params } describing which AV function & params to call.

function resolveAVQuery(instrument) {
  const { symbol, assetClass, currency } = instrument

  if (assetClass === 'crypto') {
    // e.g. BTC → FROM_CURRENCY=BTC, TO_CURRENCY=USD
    const fromCurrency = symbol.replace(/USDT?$/, '') // strip USDT suffix if present
    return {
      func: 'CURRENCY_EXCHANGE_RATE',
      params: { from_currency: fromCurrency, to_currency: 'USD' },
    }
  }

  if (assetClass === 'forex') {
    // USDINR → from=USD, to=INR; EURUSD → from=EUR, to=USD
    const from = symbol.slice(0, 3)
    const to = symbol.slice(3, 6)
    return {
      func: 'CURRENCY_EXCHANGE_RATE',
      params: { from_currency: from, to_currency: to },
    }
  }

  if (assetClass === 'index') {
    // AV doesn't have great index support on free tier.
    // Map to liquid ETF proxies that track the same index.
    const proxies = {
      NIFTY50: { func: 'GLOBAL_QUOTE', params: { symbol: 'INFY' } }, // INFY as NSE liquid proxy
      SENSEX: { func: 'GLOBAL_QUOTE', params: { symbol: 'HDB' } },   // HDFC Bank ADR as proxy
    }
    return proxies[symbol] || null
  }

  if (assetClass === 'stock') {
    // Indian NSE stocks — AV accepts NSE:RELIANCE style on some plans,
    // but on free tier the BSE suffix (.BSE) works more reliably.
    if (currency === 'INR') {
      return { func: 'GLOBAL_QUOTE', params: { symbol: `${symbol}.BSE` } }
    }
    // US stocks — plain ticker
    return { func: 'GLOBAL_QUOTE', params: { symbol } }
  }

  return null
}

// ── Raw API call ───────────────────────────────────────────────────

async function callAV(queryParams) {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY
  if (!apiKey) throw new Error('ALPHAVANTAGE_API_KEY not configured')

  const url = new URL(BASE_URL)
  url.searchParams.set('apikey', apiKey)
  Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url.toString(), { signal: controller.signal })
    if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`)
    const data = await res.json()

    // AV free tier rate-limit message
    if (data?.Information?.includes('API rate limit')) {
      throw new Error('Alpha Vantage: rate limit hit — ' + data.Information)
    }
    if (data?.Note?.includes('API call frequency')) {
      throw new Error('Alpha Vantage: per-minute throttle — ' + data.Note)
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}

// ── Quote parsers ──────────────────────────────────────────────────

function parseGlobalQuote(data, instrument) {
  const q = data['Global Quote']
  if (!q || !q['05. price']) throw new Error('Alpha Vantage: empty GLOBAL_QUOTE response')

  const price = parseFloat(q['05. price'])
  if (!price) throw new Error('Alpha Vantage: price is zero/NaN')

  return {
    symbol: instrument.symbol,
    price,
    currency: instrument.currency,
    changePercent: parseFloat(q['10. change percent']?.replace('%', '') || '0'),
    dayHigh: parseFloat(q['03. high']) || null,
    dayLow: parseFloat(q['04. low']) || null,
    asOf: q['07. latest trading day'] ? new Date(q['07. latest trading day']).toISOString() : new Date().toISOString(),
    sourceName: 'Alpha Vantage',
    provider: 'alphavantage',
  }
}

function parseExchangeRate(data, instrument) {
  const r = data['Realtime Currency Exchange Rate']
  if (!r || !r['5. Exchange Rate']) throw new Error('Alpha Vantage: empty CURRENCY_EXCHANGE_RATE response')

  const price = parseFloat(r['5. Exchange Rate'])
  if (!price) throw new Error('Alpha Vantage: exchange rate is zero/NaN')

  return {
    symbol: instrument.symbol,
    price,
    currency: instrument.currency,
    changePercent: 0, // AV exchange rate doesn't give change% — leave for next tick delta
    dayHigh: null,
    dayLow: null,
    asOf: r['6. Last Refreshed'] ? new Date(r['6. Last Refreshed'] + 'Z').toISOString() : new Date().toISOString(),
    sourceName: 'Alpha Vantage',
    provider: 'alphavantage',
  }
}

// ── Public API ─────────────────────────────────────────────────────

async function getQuote(instrument) {
  if (isLimitReached()) {
    throw new Error(`Alpha Vantage: daily limit of ${DAILY_LIMIT} calls reached — serving cache`)
  }

  const query = resolveAVQuery(instrument)
  if (!query) throw new Error(`Alpha Vantage: no query mapping for ${instrument.symbol}`)

  consumeOne()
  const data = await callAV({ function: query.func, ...query.params })

  if (query.func === 'GLOBAL_QUOTE') return parseGlobalQuote(data, instrument)
  if (query.func === 'CURRENCY_EXCHANGE_RATE') return parseExchangeRate(data, instrument)
  throw new Error(`Alpha Vantage: unknown function ${query.func}`)
}

module.exports = { getQuote, isLimitReached, getBudget, name: 'alphavantage' }
