// News service — powered by Newsdata.io instead of Gemini/OpenAI.
//
// Budget notes (Newsdata.io free tier: 200 req/day):
//   • Each scope (symbol or 'GENERAL') is fetched at most once per
//     NEWS_CACHE_HOURS hours (default 6h → max 4 fetches/scope/day).
//   • With <50 distinct scopes this comfortably fits in 200/day.
//   • MongoDB TTL index auto-expires cached news after NEWS_CACHE_HOURS.
//
// Fall-through: if Newsdata.io is unavailable or budget is exhausted,
// the service returns whatever stale articles are still in Mongo (if any)
// rather than an empty array, so the UI always has something to show.

const newsdataProvider = require('./aiProviders/newsdataProvider')
const NewsItem = require('../models/NewsItem')
const { bySymbol } = require('../utils/symbolList')

// How long (seconds) to keep cached news in Mongo before allowing a refresh.
// Newsdata.io /latest endpoint already returns recent articles, so 6h is fine.
const NEWS_CACHE_SECONDS = Number(process.env.NEWS_CACHE_HOURS || 6) * 3600

/**
 * Get news for a symbol (or general market news if symbol is omitted).
 * Cached in Mongo; TTL refreshed each time new articles are stored.
 *
 * @param {string|undefined} symbol  – Ticker symbol, or omit for GENERAL news
 * @returns {Promise<NewsItem[]>}
 */
async function getNews(symbol) {
  const instrument = symbol ? bySymbol(symbol) : null
  if (symbol && !instrument) throw new Error(`Unknown symbol: ${symbol}`)

  const scope = instrument ? instrument.symbol : 'GENERAL'
  const name = instrument?.name || null

  // ── Serve from cache if fresh enough ──────────────────────────
  const cutoff = new Date(Date.now() - NEWS_CACHE_SECONDS * 1000)
  const cached = await NewsItem.find({ scope, fetchedAt: { $gte: cutoff } })
    .sort({ fetchedAt: -1 })
    .limit(5)

  if (cached.length > 0) return cached

  // ── Fetch fresh from Newsdata.io ───────────────────────────────
  let articles = []
  try {
    articles = await newsdataProvider.getNews({ scope, name, limit: 5 })
  } catch (err) {
    console.warn(`⚠️  [ND] News fetch failed for scope="${scope}": ${err.message}`)

    // Budget exhausted or API error — fall through to stale cache
    const stale = await NewsItem.find({ scope }).sort({ fetchedAt: -1 }).limit(5)
    if (stale.length > 0) {
      console.warn(`⚠️  [ND] Returning ${stale.length} stale cached articles for scope="${scope}"`)
      return stale
    }
    return []
  }

  if (articles.length === 0) {
    // No results from API — return whatever we have (even if old)
    const stale = await NewsItem.find({ scope }).sort({ fetchedAt: -1 }).limit(5)
    return stale
  }

  // ── Persist to Mongo ───────────────────────────────────────────
  // Delete old docs for this scope first so the TTL index stays tidy
  await NewsItem.deleteMany({ scope })

  const docs = await NewsItem.insertMany(
    articles.map((item) => ({
      scope,
      headline: item.headline,
      summary: item.summary,
      sourceName: item.sourceName,
      url: item.url,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
      fetchedAt: new Date(),
    }))
  )

  const { used } = newsdataProvider.getBudget()
  console.log(`✅ [ND] Fetched ${docs.length} articles for scope="${scope}" (budget used today: ${used})`)

  return docs
}

module.exports = { getNews }
