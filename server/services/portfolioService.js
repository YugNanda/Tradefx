// Production financial-grade portfolio and trading engine.
// Features: Atomic balance locking (anti-race condition), multi-currency conversion,
// simulated brokerage fees, and detailed transaction ledger recording.

const User = require('../models/User')
const Transaction = require('../models/Transaction')
const marketData = require('./marketDataService')
const currencyService = require('./currencyService')
const { bySymbol } = require('../utils/symbolList')

const BROKERAGE_FEE_RATE = 0.0005 // 0.05% institutional simulated fee

async function buy(userId, symbol, quantity, orderType = 'MARKET') {
  const instrument = bySymbol(symbol)
  if (!instrument) throw new Error(`Unknown symbol: ${symbol}`)
  const qty = Number(quantity)
  if (!(qty > 0)) throw new Error('Quantity must be greater than 0')

  const userRecord = await User.findById(userId)
  if (!userRecord) throw new Error('User not found')

  const baseCurrency = userRecord.baseCurrency || 'INR'
  const quote = await marketData.getQuote(instrument.symbol)
  const price = quote.price
  const rawTotal = price * qty // in asset currency

  // Convert cost into user's base portfolio currency
  const exchangeRate = currencyService.getRate(instrument.currency, baseCurrency)
  const costInBase = rawTotal * exchangeRate
  const fee = Number((costInBase * BROKERAGE_FEE_RATE).toFixed(2))
  const totalDeduction = Number((costInBase + fee).toFixed(2))

  // Atomic deduction: prevents double-spending / negative balance under concurrent requests
  const user = await User.findOneAndUpdate(
    { _id: userId, virtualBalance: { $gte: totalDeduction } },
    {
      $inc: {
        virtualBalance: -totalDeduction,
        'stats.totalTrades': 1,
      },
    },
    { new: true }
  )

  if (!user) {
    throw new Error(`Insufficient funds: Required ${baseCurrency} ${totalDeduction.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`)
  }

  // Update or insert position in user portfolio
  const existing = user.portfolio.find((p) => p.symbol === instrument.symbol)
  if (existing) {
    const totalQty = existing.quantity + qty
    existing.avgBuyPrice = (existing.avgBuyPrice * existing.quantity + rawTotal) / totalQty
    existing.quantity = totalQty
  } else {
    user.portfolio.push({
      symbol: instrument.symbol,
      name: instrument.name,
      quantity: qty,
      avgBuyPrice: price,
      boughtAt: new Date(),
    })
  }

  await user.save()

  // Log transaction
  const tx = await Transaction.create({
    user: userId,
    symbol: instrument.symbol,
    side: 'BUY',
    quantity: qty,
    price,
    total: rawTotal,
    assetCurrency: instrument.currency,
    baseCurrency,
    exchangeRate,
    costInBaseCurrency: totalDeduction,
    fee,
    orderType,
  })

  return {
    user: user.toSafeObject(),
    transaction: tx,
    executedPrice: price,
    currency: instrument.currency,
    baseCurrency,
    fee,
    totalDeduction,
  }
}

async function sell(userId, symbol, quantity, orderType = 'MARKET') {
  const instrument = bySymbol(symbol)
  if (!instrument) throw new Error(`Unknown symbol: ${symbol}`)
  const qty = Number(quantity)
  if (!(qty > 0)) throw new Error('Quantity must be greater than 0')

  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')

  const holding = user.portfolio.find((p) => p.symbol === instrument.symbol)
  if (!holding || holding.quantity < qty) {
    throw new Error(`Insufficient holdings to sell: you hold ${holding?.quantity || 0} ${instrument.symbol}`)
  }

  const baseCurrency = user.baseCurrency || 'INR'
  const quote = await marketData.getQuote(instrument.symbol)
  const price = quote.price
  const grossProceedsAsset = price * qty
  const exchangeRate = currencyService.getRate(instrument.currency, baseCurrency)

  const grossProceedsBase = grossProceedsAsset * exchangeRate
  const fee = Number((grossProceedsBase * BROKERAGE_FEE_RATE).toFixed(2))
  const netProceeds = Number((grossProceedsBase - fee).toFixed(2))

  // P&L calculation in base currency
  const costBasisAsset = holding.avgBuyPrice * qty
  const costBasisBase = costBasisAsset * exchangeRate
  const realizedPnl = Number((grossProceedsBase - costBasisBase - fee).toFixed(2))

  // Update portfolio array
  holding.quantity -= qty
  if (holding.quantity <= 0.000001) {
    user.portfolio = user.portfolio.filter((p) => p.symbol !== instrument.symbol)
  }

  // Atomic state update
  const isWin = realizedPnl >= 0
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $inc: {
        virtualBalance: netProceeds,
        'stats.totalTrades': 1,
        'stats.totalRealizedPnl': realizedPnl,
        [isWin ? 'stats.winTrades' : 'stats.lossTrades']: 1,
      },
      portfolio: user.portfolio,
    },
    { new: true }
  )

  const tx = await Transaction.create({
    user: userId,
    symbol: instrument.symbol,
    side: 'SELL',
    quantity: qty,
    price,
    total: grossProceedsAsset,
    assetCurrency: instrument.currency,
    baseCurrency,
    exchangeRate,
    costInBaseCurrency: netProceeds,
    fee,
    realizedPnl,
    orderType,
  })

  return {
    user: updatedUser.toSafeObject(),
    transaction: tx,
    executedPrice: price,
    currency: instrument.currency,
    baseCurrency,
    netProceeds,
    fee,
    realizedPnl,
  }
}

/**
 * Returns user holdings enriched with live prices and normalized to user's base currency.
 */
async function getEnrichedPortfolio(userId) {
  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')

  const baseCurrency = user.baseCurrency || 'INR'

  const enriched = await Promise.all(
    user.portfolio.map(async (holding) => {
      const instrument = bySymbol(holding.symbol)
      const assetCurrency = instrument?.currency || 'USD'
      let quote = null

      try {
        quote = await marketData.getQuote(holding.symbol)
      } catch (err) {
        // Fallback to cached sync if available
        quote = marketData.getCachedSync(holding.symbol)
      }

      const currentPrice = quote?.price ?? holding.avgBuyPrice
      const exchangeRate = currencyService.getRate(assetCurrency, baseCurrency)

      const marketValueAsset = currentPrice * holding.quantity
      const marketValueBase = Number((marketValueAsset * exchangeRate).toFixed(2))

      const costBasisAsset = holding.avgBuyPrice * holding.quantity
      const costBasisBase = Number((costBasisAsset * exchangeRate).toFixed(2))

      const unrealizedPnlBase = Number((marketValueBase - costBasisBase).toFixed(2))
      const pnlPercent = costBasisBase > 0 ? Number(((unrealizedPnlBase / costBasisBase) * 100).toFixed(2)) : 0

      return {
        symbol: holding.symbol,
        name: holding.name,
        exchange: instrument?.exchange || 'MARKET',
        assetClass: instrument?.assetClass || 'stock',
        quantity: holding.quantity,
        avgBuyPrice: holding.avgBuyPrice,
        currentPrice,
        assetCurrency,
        baseCurrency,
        exchangeRate,
        marketValueBase,
        costBasisBase,
        unrealizedPnlBase,
        pnlPercent,
        boughtAt: holding.boughtAt,
      }
    })
  )

  const totalMarketValue = enriched.reduce((sum, h) => sum + (h.marketValueBase || 0), 0)
  const totalUnrealizedPnl = enriched.reduce((sum, h) => sum + (h.unrealizedPnlBase || 0), 0)
  const totalNetWorth = Number((user.virtualBalance + totalMarketValue).toFixed(2))

  return {
    virtualBalance: user.virtualBalance,
    baseCurrency,
    holdings: enriched,
    totalMarketValue: Number(totalMarketValue.toFixed(2)),
    totalUnrealizedPnl: Number(totalUnrealizedPnl.toFixed(2)),
    totalNetWorth,
    stats: user.stats || { totalTrades: 0, winTrades: 0, lossTrades: 0, totalRealizedPnl: 0 },
  }
}

module.exports = {
  buy,
  sell,
  getEnrichedPortfolio,
  BROKERAGE_FEE_RATE,
}
