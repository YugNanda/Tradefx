// Newsdata.io provider for financial news.
//
// FREE TIER LIMITS (as of 2026):
//   • 200 requests/day
//   • 10 results per response
//   • Latency API (recent news), not real-time streaming
//
// BUDGET STRATEGY — 200/day sounds generous but the news service is
// called per symbol scope (BTC, AAPL, GENERAL…). With a 6-hour cache
// (AV_NEWS_CACHE_HOURS) each scope costs at most 4 calls/day, so we
// safely handle ~50 distinct scopes before hitting the cap. For a
// typical TradeX install (<10 scopes), this is very comfortable.
//
// A separate daily budget file tracks usage so restarts don't over-spend.

const fs = require('fs')
const path = require('path')

const BASE_URL = 'https://newsdata.io/api/1/latest'
const TIMEOUT_MS = 10000

const BUDGET_FILE = path.join(__dirname, '../../.nd_budget.json')
const DAILY_LIMIT = parseInt(process.env.ND_DAILY_LIMIT || '180', 10) // 180 of 200, buffer for testing

// ── Budget tracking ────────────────────────────────────────────────

function loadBudget() {
  try {
    const raw = fs.readFileSync(BUDGET_FILE, 'utf8')
    const data = JSON.parse(raw)
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
    console.warn('⚠️  ND budget file write failed:', err.message)
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
  return loadBudget().used >= DAILY_LIMIT
}

// ── Keyword mapping ────────────────────────────────────────────────
// Newsdata.io accepts a `q` keyword search. Map our symbol/scope to
// good search terms so results are actually relevant.

function buildKeywords(scope, instrumentName) {
  if (scope === 'GENERAL') return 'stock market OR forex OR cryptocurrency OR trading'
  if (instrumentName) return `"${instrumentName}" OR ${scope}`
  return scope
}

// ── Raw API call ───────────────────────────────────────────────────

async function callNewsdata(queryParams) {
  const apiKey = process.env.NEWSDATA_API_KEY
  if (!apiKey) throw new Error('NEWSDATA_API_KEY not configured')

  const url = new URL(BASE_URL)
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('language', 'en')
  url.searchParams.set('category', 'business')
  Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url.toString(), { signal: controller.signal })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Newsdata.io HTTP ${res.status}: ${errText.slice(0, 200)}`)
    }
    const data = await res.json()
    if (data.status !== 'success') {
      throw new Error(`Newsdata.io error: ${data.message || JSON.stringify(data).slice(0, 200)}`)
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}

// ── Result normaliser ──────────────────────────────────────────────
// Maps Newsdata article shape to the schema NewsService / NewsItem expects.

function normaliseArticle(article) {
  return {
    headline: (article.title || '').slice(0, 200),
    summary: (article.description || article.content || '').slice(0, 400),
    sourceName: article.source_id || article.source_name || 'Unknown',
    url: article.link || null,
    publishedAt: article.pubDate ? new Date(article.pubDate).toISOString() : null,
  }
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Fetch up to `limit` recent news articles for a given scope.
 * @param {string} scope  – Symbol ticker (e.g. 'BTC') or 'GENERAL'
 * @param {string} [name] – Human-readable instrument name for better search terms
 * @param {number} [limit=5]
 * @returns {Array<{headline,summary,sourceName,url,publishedAt}>}
 */
async function getNews({ scope, name, limit = 5 }) {
  if (isLimitReached()) {
    throw new Error(`Newsdata.io: daily limit of ${DAILY_LIMIT} calls reached — serving cache`)
  }

  const q = buildKeywords(scope, name)
  consumeOne()

  const data = await callNewsdata({ q, size: Math.min(limit, 10) })
  const articles = (data.results || []).filter((a) => a.title)
  return articles.slice(0, limit).map(normaliseArticle)
}

module.exports = { getNews, isLimitReached, getBudget, name: 'newsdata' }
