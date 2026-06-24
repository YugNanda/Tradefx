const portfolioService = require('../services/portfolioService')
const Transaction = require('../models/Transaction')
const scheduler = require('../jobs/priceScheduler')

exports.getPortfolio = async (req, res) => {
  try {
    const data = await portfolioService.getEnrichedPortfolio(req.user.id)
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.buy = async (req, res) => {
  try {
    const { symbol, quantity } = req.body
    if (!symbol || !quantity) return res.status(400).json({ message: 'symbol and quantity are required' })
    scheduler.trackSymbol(symbol)
    const result = await portfolioService.buy(req.user.id, symbol, Number(quantity))
    res.json(result)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.sell = async (req, res) => {
  try {
    const { symbol, quantity } = req.body
    if (!symbol || !quantity) return res.status(400).json({ message: 'symbol and quantity are required' })
    const result = await portfolioService.sell(req.user.id, symbol, Number(quantity))
    res.json(result)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100)
    res.json({ transactions })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
