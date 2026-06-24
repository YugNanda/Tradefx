const User = require('../models/User')
const { bySymbol } = require('../utils/symbolList')
const scheduler = require('../jobs/priceScheduler')

exports.getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    res.json({ watchlist: user.watchlist })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.addToWatchlist = async (req, res) => {
  try {
    const { symbol } = req.body
    const instrument = bySymbol(symbol)
    if (!instrument) return res.status(400).json({ message: `Unknown symbol: ${symbol}` })

    const user = await User.findById(req.user.id)
    const alreadyAdded = user.watchlist.some((w) => w.symbol === instrument.symbol)
    if (!alreadyAdded) {
      user.watchlist.push({ symbol: instrument.symbol, name: instrument.name })
      await user.save({ validateBeforeSave: false })
    }

    scheduler.trackSymbol(instrument.symbol)
    res.json({ watchlist: user.watchlist })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.removeFromWatchlist = async (req, res) => {
  try {
    const { symbol } = req.params
    const user = await User.findById(req.user.id)
    user.watchlist = user.watchlist.filter((w) => w.symbol !== symbol.toUpperCase())
    await user.save({ validateBeforeSave: false })
    res.json({ watchlist: user.watchlist })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
