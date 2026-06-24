// Static instrument catalog. Symbol metadata (name, exchange, currency) is
// hardcoded here. Live prices are fetched from Alpha Vantage; news from
// Newsdata.io. See services/aiProviders/ for provider details.

const CATALOG = [
  // ── NSE / BSE (India) ──────────────────────────────────────────
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', assetClass: 'stock', currency: 'INR' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', assetClass: 'stock', currency: 'INR' },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', assetClass: 'stock', currency: 'INR' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', assetClass: 'stock', currency: 'INR' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', assetClass: 'stock', currency: 'INR' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE', assetClass: 'stock', currency: 'INR' },
  { symbol: 'NIFTY50', name: 'Nifty 50 Index', exchange: 'NSE', assetClass: 'index', currency: 'INR' },
  { symbol: 'SENSEX', name: 'BSE Sensex Index', exchange: 'BSE', assetClass: 'index', currency: 'INR' },

  // ── NYSE / NASDAQ (US) ─────────────────────────────────────────
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', assetClass: 'stock', currency: 'USD' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', assetClass: 'stock', currency: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', assetClass: 'stock', currency: 'USD' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', assetClass: 'stock', currency: 'USD' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', assetClass: 'stock', currency: 'USD' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', assetClass: 'stock', currency: 'USD' },

  // ── Crypto ─────────────────────────────────────────────────────
  { symbol: 'BTC', name: 'Bitcoin', exchange: 'CRYPTO', assetClass: 'crypto', currency: 'USD' },
  { symbol: 'ETH', name: 'Ethereum', exchange: 'CRYPTO', assetClass: 'crypto', currency: 'USD' },
  { symbol: 'SOL', name: 'Solana', exchange: 'CRYPTO', assetClass: 'crypto', currency: 'USD' },
  { symbol: 'BNB', name: 'Binance Coin', exchange: 'CRYPTO', assetClass: 'crypto', currency: 'USD' },
  { symbol: 'XRP', name: 'XRP', exchange: 'CRYPTO', assetClass: 'crypto', currency: 'USD' },

  // ── Forex ──────────────────────────────────────────────────────
  { symbol: 'USDINR', name: 'US Dollar / Indian Rupee', exchange: 'FOREX', assetClass: 'forex', currency: 'INR' },
  { symbol: 'EURUSD', name: 'Euro / US Dollar', exchange: 'FOREX', assetClass: 'forex', currency: 'USD' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', exchange: 'FOREX', assetClass: 'forex', currency: 'USD' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', exchange: 'FOREX', assetClass: 'forex', currency: 'JPY' },
]

const bySymbol = (symbol) =>
  CATALOG.find((c) => c.symbol.toUpperCase() === String(symbol).toUpperCase())

const search = (query, assetClass) => {
  const q = String(query || '').toLowerCase().trim()
  return CATALOG.filter((c) => {
    const matchesClass = !assetClass || c.assetClass === assetClass
    const matchesQuery =
      !q || c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    return matchesClass && matchesQuery
  })
}

const all = (assetClass) =>
  assetClass ? CATALOG.filter((c) => c.assetClass === assetClass) : CATALOG

// Symbols the scheduler always keeps warm, even with no active watchers.
//
// BUDGET NOTE (Alpha Vantage free tier: 25 calls/day):
//   Each symbol here = 1 AV call per scheduler tick (default: 3h interval).
//   3 symbols × 8 ticks/day = 24 calls — right at the free limit.
//   Keep this list at ≤3 symbols unless you have a paid AV plan.
const DEFAULT_TRACKED_SYMBOLS = ['NIFTY50', 'BTC', 'AAPL']

module.exports = { CATALOG, bySymbol, search, all, DEFAULT_TRACKED_SYMBOLS }
