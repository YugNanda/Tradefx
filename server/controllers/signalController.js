const signalService = require('../services/signalService')
const scheduler = require('../jobs/priceScheduler')

exports.getSignal = async (req, res) => {
  try {
    const { symbol } = req.params
    scheduler.trackSymbol(symbol)
    const signal = await signalService.getSignal(symbol)
    res.json({ signal })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
