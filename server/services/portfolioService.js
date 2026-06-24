const User = require('../models/User')
const Transaction = require('../models/Transaction')
const marketData = require('./marketDataService')
const { bySymbol } = require('../utils/symbolList')

async function buy(userId, symbol, quantity) {
  const instrument = bySymbol(symbol)
  if (!instrument) throw new Error(`Unknown symbol: ${symbol}`)
  if (!(quantity > 0)) throw new Error('Quantity must be greater than 0')

  const quote = await marketData.getQuote(instrument.symbol)
  const cost = quote.price * quantity

  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')
  if (user.virtualBalance < cost) throw new Error('Insufficient virtual balance')

  const existing = user.portfolio.find((p) => p.symbol === instrument.symbol)
  if (existing) {
    const totalQty = existing.quantity + quantity
    existing.avgBuyPrice = (existing.avgBuyPrice * existing.quantity + cost) / totalQty
    existing.quantity = totalQty
  } else {
    user.portfolio.push({
      symbol: instrument.symbol,
      name: instrument.name,
      quantity,
      avgBuyPrice: quote.price,
    })
  }

  user.virtualBalance -= cost
  await user.save({ validateBeforeSave: false })

  const tx = await Transaction.create({
    user: userId,
    symbol: instrument.symbol,
    side: 'BUY',
    quantity,
    price: quote.price,
    total: cost,
  })

  return { user: user.toSafeObject(), transaction: tx, executedPrice: quote.price, approximate: quote.approximate }
}

async function sell(userId, symbol, quantity) {
  const instrument = bySymbol(symbol)
  if (!instrument) throw new Error(`Unknown symbol: ${symbol}`)
  if (!(quantity > 0)) throw new Error('Quantity must be greater than 0')

  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')

  const holding = user.portfolio.find((p) => p.symbol === instrument.symbol)
  if (!holding || holding.quantity < quantity) {
    throw new Error('Insufficient holdings to sell')
  }

  const quote = await marketData.getQuote(instrument.symbol)
  const proceeds = quote.price * quantity
  const realizedPnl = (quote.price - holding.avgBuyPrice) * quantity

  holding.quantity -= quantity
  if (holding.quantity === 0) {
    user.portfolio = user.portfolio.filter((p) => p.symbol !== instrument.symbol)
  }

  user.virtualBalance += proceeds
  await user.save({ validateBeforeSave: false })

  const tx = await Transaction.create({
    user: userId,
    symbol: instrument.symbol,
    side: 'SELL',
    quantity,
    price: quote.price,
    total: proceeds,
    realizedPnl,
  })

  return { user: user.toSafeObject(), transaction: tx, executedPrice: quote.price, realizedPnl, approximate: quote.approximate }
}

/** Portfolio holdings enriched with live price + unrealized P&L. */
async function getEnrichedPortfolio(userId) {
  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')

  const enriched = await Promise.all(
    user.portfolio.map(async (holding) => {
      let quote = null
      try {
        quote = await marketData.getQuote(holding.symbol)
      } catch (err) {
        // Leave quote null — frontend should show "price unavailable"
      }
      const currentPrice = quote?.price ?? null
      const marketValue = currentPrice != null ? currentPrice * holding.quantity : null
      const unrealizedPnl = currentPrice != null ? (currentPrice - holding.avgBuyPrice) * holding.quantity : null

      return {
        symbol: holding.symbol,
        name: holding.name,
        quantity: holding.quantity,
        avgBuyPrice: holding.avgBuyPrice,
        currentPrice,
        marketValue,
        unrealizedPnl,
        approximate: quote?.approximate ?? true,
        boughtAt: holding.boughtAt,
      }
    })
  )

  return { virtualBalance: user.virtualBalance, holdings: enriched }
}

module.exports = { buy, sell, getEnrichedPortfolio }
