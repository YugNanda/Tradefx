const Alert = require('../models/Alert')
const { bySymbol } = require('../utils/symbolList')
const scheduler = require('../jobs/priceScheduler')

exports.createAlert = async (req, res) => {
  try {
    const { symbol, condition, targetPrice } = req.body
    const instrument = bySymbol(symbol)
    if (!instrument) return res.status(400).json({ message: `Unknown symbol: ${symbol}` })
    if (!['above', 'below'].includes(condition)) {
      return res.status(400).json({ message: 'condition must be "above" or "below"' })
    }
    if (!(Number(targetPrice) > 0)) {
      return res.status(400).json({ message: 'targetPrice must be greater than 0' })
    }

    const alert = await Alert.create({
      user: req.user.id,
      symbol: instrument.symbol,
      condition,
      targetPrice: Number(targetPrice),
    })

    scheduler.trackSymbol(instrument.symbol)
    res.status(201).json({ alert })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ user: req.user.id }).sort({ createdAt: -1 })
    res.json({ alerts })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!alert) return res.status(404).json({ message: 'Alert not found' })
    res.json({ message: 'Alert deleted' })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
