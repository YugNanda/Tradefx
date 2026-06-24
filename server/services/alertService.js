const Alert = require('../models/Alert')

/**
 * Called by the price scheduler after each symbol refresh. Finds active
 * alerts for that symbol whose condition is now met, marks them triggered,
 * and emits a socket event to the owning user's room so the client can
 * show a notification in real time.
 */
async function checkAlertsForSymbol(io, symbol, price) {
  if (price == null) return

  const candidates = await Alert.find({ symbol: symbol.toUpperCase(), active: true })
  const triggered = candidates.filter(
    (a) => (a.condition === 'above' && price >= a.targetPrice) || (a.condition === 'below' && price <= a.targetPrice)
  )

  for (const alert of triggered) {
    alert.active = false
    alert.triggeredAt = new Date()
    await alert.save()

    io.to(`user:${alert.user}`).emit('alert:triggered', {
      alertId: alert._id,
      symbol: alert.symbol,
      condition: alert.condition,
      targetPrice: alert.targetPrice,
      price,
      triggeredAt: alert.triggeredAt,
    })
  }
}

module.exports = { checkAlertsForSymbol }
