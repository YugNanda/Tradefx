// Production financial-grade portfolio and trading engine.
// Features: Atomic balance locking (anti-race condition), multi-currency conversion,
// simulated brokerage fees, long & short selling support, position closing, and detailed transaction ledger recording.

const User = require('../models/User')
const Transaction = require('../models/Transaction')
const marketData = require('./marketDataService')
const currencyService = require('./currencyService')
const { bySymbol } = require('../utils/symbolList')

const BROKERAGE_FEE_RATE = 0.0005 // 0.05% institutional simulated fee

/**
 * Buy / Long order execution.
 * If user has an existing SHORT position, this covers (closes) the short first.
 */
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
  const exchangeRate = currencyService.getRate(instrument.currency, baseCurrency)

  // 1. Check if user holds an active SHORT position in this symbol to COVER
  const shortHolding = userRecord.portfolio.find((p) => p.symbol === instrument.symbol && p.side === 'SELL')
  if (shortHolding) {
    const coverQty = Math.min(qty, shortHolding.quantity)
    const assetPriceDiff = shortHolding.avgBuyPrice - price // Profit if price dropped
    const grossPnlBase = assetPriceDiff * coverQty * exchangeRate
    const fee = Number((price * coverQty * exchangeRate * BROKERAGE_FEE_RATE).toFixed(2))
    const realizedPnl = Number((grossPnlBase - fee).toFixed(2))

    const totalCollateral = shortHolding.collateral || (shortHolding.avgBuyPrice * shortHolding.quantity * exchangeRate)
    const collateralToReturn = Number((totalCollateral * (coverQty / shortHolding.quantity)).toFixed(2))
    const netReturnToBalance = Number((collateralToReturn + realizedPnl).toFixed(2))

    shortHolding.quantity -= coverQty
    shortHolding.collateral = Math.max(0, totalCollateral - collateralToReturn)
    if (shortHolding.quantity <= 0.000001) {
      userRecord.portfolio = userRecord.portfolio.filter((p) => p !== shortHolding)
    }

    const isWin = realizedPnl >= 0
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          virtualBalance: netReturnToBalance,
          'stats.totalTrades': 1,
          'stats.totalRealizedPnl': realizedPnl,
          [isWin ? 'stats.winTrades' : 'stats.lossTrades']: 1,
        },
        portfolio: userRecord.portfolio,
      },
      { new: true }
    )

    const tx = await Transaction.create({
      user: userId,
      symbol: instrument.symbol,
      side: 'COVER',
      quantity: coverQty,
      price,
      total: price * coverQty,
      assetCurrency: instrument.currency,
      baseCurrency,
      exchangeRate,
      costInBaseCurrency: netReturnToBalance,
      fee,
      realizedPnl,
      orderType,
    })

    const remainingQty = qty - coverQty
    if (remainingQty > 0) {
      // User covered all short shares and also wants to go long with the remainder
      const longResult = await buy(userId, symbol, remainingQty, orderType)
      return longResult
    }

    return {
      user: updatedUser.toSafeObject(),
      transaction: tx,
      executedPrice: price,
      currency: instrument.currency,
      baseCurrency,
      fee,
      netProceeds: netReturnToBalance,
      realizedPnl,
      covered: true,
    }
  }

  // 2. Regular Long Buy Order
  const rawTotal = price * qty
  const costInBase = rawTotal * exchangeRate
  const fee = Number((costInBase * BROKERAGE_FEE_RATE).toFixed(2))
  const totalDeduction = Number((costInBase + fee).toFixed(2))

  // Atomic deduction: prevents double-spending / negative balance
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

  // Update or insert Long position in user portfolio
  const existingLong = user.portfolio.find((p) => p.symbol === instrument.symbol && (p.side === 'BUY' || !p.side))
  if (existingLong) {
    const totalQty = existingLong.quantity + qty
    existingLong.avgBuyPrice = (existingLong.avgBuyPrice * existingLong.quantity + rawTotal) / totalQty
    existingLong.quantity = totalQty
    existingLong.collateral = (existingLong.collateral || 0) + costInBase
  } else {
    user.portfolio.push({
      symbol: instrument.symbol,
      name: instrument.name,
      side: 'BUY',
      quantity: qty,
      avgBuyPrice: price,
      collateral: costInBase,
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

/**
 * Sell / Short order execution.
 * If user holds a LONG position, this sells/closes the long position.
 * If user does NOT hold a long position, this opens a SHORT position!
 */
async function sell(userId, symbol, quantity, orderType = 'MARKET') {
  const instrument = bySymbol(symbol)
  if (!instrument) throw new Error(`Unknown symbol: ${symbol}`)
  const qty = Number(quantity)
  if (!(qty > 0)) throw new Error('Quantity must be greater than 0')

  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')

  const baseCurrency = user.baseCurrency || 'INR'
  const quote = await marketData.getQuote(instrument.symbol)
  const price = quote.price
  const exchangeRate = currencyService.getRate(instrument.currency, baseCurrency)

  // 1. Check if user holds an active LONG position to SELL / CLOSE
  const longHolding = user.portfolio.find((p) => p.symbol === instrument.symbol && (p.side === 'BUY' || !p.side))
  if (longHolding) {
    const sellQty = Math.min(qty, longHolding.quantity)
    const grossProceedsAsset = price * sellQty
    const grossProceedsBase = grossProceedsAsset * exchangeRate
    const fee = Number((grossProceedsBase * BROKERAGE_FEE_RATE).toFixed(2))
    const netProceeds = Number((grossProceedsBase - fee).toFixed(2))

    // P&L calculation in base currency
    const costBasisAsset = longHolding.avgBuyPrice * sellQty
    const costBasisBase = costBasisAsset * exchangeRate
    const realizedPnl = Number((grossProceedsBase - costBasisBase - fee).toFixed(2))

    longHolding.quantity -= sellQty
    if (longHolding.quantity <= 0.000001) {
      user.portfolio = user.portfolio.filter((p) => p !== longHolding)
    }

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
      quantity: sellQty,
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

    const remainingQty = qty - sellQty
    if (remainingQty > 0) {
      // User sold entire long position and now wants to short the remainder
      const shortResult = await sell(userId, symbol, remainingQty, orderType)
      return shortResult
    }

    return {
      user: updatedUser.toSafeObject(),
      transaction: tx,
      executedPrice: price,
      currency: instrument.currency,
      baseCurrency,
      netProceeds,
      fee,
      realizedPnl,
      closedLong: true,
    }
  }

  // 2. Open a SHORT position (Short Selling)
  const rawTotal = price * qty
  const marginCollateralBase = rawTotal * exchangeRate
  const fee = Number((marginCollateralBase * BROKERAGE_FEE_RATE).toFixed(2))
  const totalDeduction = Number((marginCollateralBase + fee).toFixed(2))

  // Deduct margin collateral atomically
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, virtualBalance: { $gte: totalDeduction } },
    {
      $inc: {
        virtualBalance: -totalDeduction,
        'stats.totalTrades': 1,
      },
    },
    { new: true }
  )

  if (!updatedUser) {
    throw new Error(
      `Insufficient funds for short margin: Required ${baseCurrency} ${totalDeduction.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
      })}`
    )
  }

  // Update or insert Short position
  const existingShort = updatedUser.portfolio.find((p) => p.symbol === instrument.symbol && p.side === 'SELL')
  if (existingShort) {
    const totalQty = existingShort.quantity + qty
    existingShort.avgBuyPrice = (existingShort.avgBuyPrice * existingShort.quantity + rawTotal) / totalQty
    existingShort.quantity = totalQty
    existingShort.collateral = (existingShort.collateral || 0) + marginCollateralBase
  } else {
    updatedUser.portfolio.push({
      symbol: instrument.symbol,
      name: instrument.name,
      side: 'SELL',
      quantity: qty,
      avgBuyPrice: price,
      collateral: marginCollateralBase,
      boughtAt: new Date(),
    })
  }

  await updatedUser.save()

  // Log transaction
  const tx = await Transaction.create({
    user: userId,
    symbol: instrument.symbol,
    side: 'SHORT',
    quantity: qty,
    price,
    total: rawTotal,
    assetCurrency: instrument.currency,
    baseCurrency,
    exchangeRate,
    costInBaseCurrency: totalDeduction,
    fee,
    realizedPnl: 0,
    orderType,
  })

  return {
    user: updatedUser.toSafeObject(),
    transaction: tx,
    executedPrice: price,
    currency: instrument.currency,
    baseCurrency,
    totalDeduction,
    fee,
    isShort: true,
  }
}

/**
 * Explicitly close an open trade/position (Long or Short).
 * Calculates realized PnL and returns capital + profit / loss directly into virtual balance.
 */
async function closePosition(userId, symbol, quantity = null, side = null) {
  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')

  const holding = user.portfolio.find(
    (p) => p.symbol === symbol && (!side || p.side === side || (!p.side && side === 'BUY'))
  )
  if (!holding) {
    throw new Error(`No open position found for ${symbol}${side ? ` (${side})` : ''}`)
  }

  const isShort = holding.side === 'SELL'
  const closeQty = quantity && Number(quantity) > 0 ? Math.min(Number(quantity), holding.quantity) : holding.quantity

  if (isShort) {
    // Buy to cover / close short
    return buy(userId, symbol, closeQty, 'MARKET')
  } else {
    // Sell to close long
    return sell(userId, symbol, closeQty, 'MARKET')
  }
}

/**
 * Returns user holdings enriched with live prices and normalized to user's base currency.
 * Properly calculates unrealized P&L and market value for both Long and Short positions.
 */
async function getEnrichedPortfolio(userId) {
  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')

  const baseCurrency = user.baseCurrency || 'INR'

  const enriched = await Promise.all(
    user.portfolio.map(async (holding) => {
      const instrument = bySymbol(holding.symbol)
      const assetCurrency = instrument?.currency || 'USD'
      const side = holding.side || 'BUY'
      const isShort = side === 'SELL'
      let quote = null

      try {
        quote = await marketData.getQuote(holding.symbol)
      } catch (err) {
        quote = marketData.getCachedSync(holding.symbol)
      }

      const currentPrice = quote?.price ?? holding.avgBuyPrice
      const exchangeRate = currencyService.getRate(assetCurrency, baseCurrency)

      let unrealizedPnlBase = 0
      let pnlPercent = 0
      let marketValueBase = 0
      let costBasisBase = 0

      if (isShort) {
        // Short position: profit when price drops
        const diffPerUnit = holding.avgBuyPrice - currentPrice
        unrealizedPnlBase = Number((diffPerUnit * holding.quantity * exchangeRate).toFixed(2))
        pnlPercent = holding.avgBuyPrice > 0 ? Number(((diffPerUnit / holding.avgBuyPrice) * 100).toFixed(2)) : 0

        const totalCollateral = holding.collateral || holding.avgBuyPrice * holding.quantity * exchangeRate
        costBasisBase = Number(totalCollateral.toFixed(2))
        marketValueBase = Number(Math.max(0, costBasisBase + unrealizedPnlBase).toFixed(2))
      } else {
        // Long position: profit when price rises
        const diffPerUnit = currentPrice - holding.avgBuyPrice
        unrealizedPnlBase = Number((diffPerUnit * holding.quantity * exchangeRate).toFixed(2))
        pnlPercent = holding.avgBuyPrice > 0 ? Number(((diffPerUnit / holding.avgBuyPrice) * 100).toFixed(2)) : 0

        costBasisBase = Number((holding.avgBuyPrice * holding.quantity * exchangeRate).toFixed(2))
        marketValueBase = Number((currentPrice * holding.quantity * exchangeRate).toFixed(2))
      }

      return {
        symbol: holding.symbol,
        name: holding.name,
        side, // 'BUY' (Long) | 'SELL' (Short)
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
  closePosition,
  getEnrichedPortfolio,
  BROKERAGE_FEE_RATE,
}
