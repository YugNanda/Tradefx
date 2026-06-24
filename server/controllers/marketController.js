const marketData = require('../services/marketDataService')
const symbolList = require('../utils/symbolList')
const scheduler = require('../jobs/priceScheduler')

exports.getQuote = async (req, res) => {
  try {
    const { symbol } = req.params
    const quote = await marketData.getQuote(symbol)
    scheduler.trackSymbol(symbol) // keep it warm for future requests
    res.json({ quote })
  } catch (err) {
    res.status(404).json({ message: err.message })
  }
}

exports.getQuotes = async (req, res) => {
  try {
    const symbols = String(req.query.symbols || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (symbols.length === 0) return res.status(400).json({ message: 'symbols query param is required' })

    symbols.forEach((s) => scheduler.trackSymbol(s))
    const quotes = await marketData.getQuotes(symbols)
    res.json({ quotes })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// History is built from our own accumulated cache snapshots, NOT a real
// historical data API (none is in use). For freshly-tracked symbols this
// will be short until enough ticks have accumulated.
exports.getHistory = async (req, res) => {
  try {
    const PriceCache = require('../models/PriceCache')
    const doc = await PriceCache.findOne({ symbol: req.params.symbol.toUpperCase() })
    if (!doc) return res.status(404).json({ message: 'No data yet for this symbol' })
    res.json({
      symbol: doc.symbol,
      history: doc.history,
      note: 'History reflects prices observed since this symbol started being tracked, not full exchange history.',
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.search = (req, res) => {
  const { q, assetClass } = req.query
  res.json({ results: symbolList.search(q, assetClass) })
}

exports.listSymbols = (req, res) => {
  const { assetClass } = req.query
  res.json({ symbols: symbolList.all(assetClass) })
}
