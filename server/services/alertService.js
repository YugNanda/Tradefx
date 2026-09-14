const Alert = require('../models/Alert')
const Notification = require('../models/Notification')

/**
 * Called by the price scheduler after each symbol refresh. Finds active
 * alerts for that symbol whose condition is now met, marks them triggered,
 * persists an in-app notification, and emits a socket event to the owning user's room.
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

    // Create persistent in-app notification
    await Notification.create({
      user: alert.user,
      type: 'ALERT_TRIGGERED',
      title: `Price Alert: ${alert.symbol}`,
      message: `${alert.symbol} is now ${alert.condition} your target price of ${alert.targetPrice} (Current: ${price})`,
      data: {
        symbol: alert.symbol,
        condition: alert.condition,
        targetPrice: alert.targetPrice,
        price,
      },
    }).catch(() => {})

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
