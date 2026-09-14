const User = require('../models/User')
const Transaction = require('../models/Transaction')
const portfolioService = require('../services/portfolioService')

exports.getAnalytics = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const portfolio = await portfolioService.getEnrichedPortfolio(req.user.id)
    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 })

    const totalTrades = transactions.length
    const buyTrades = transactions.filter((t) => t.side === 'BUY')
    const sellTrades = transactions.filter((t) => t.side === 'SELL')

    const winningTrades = sellTrades.filter((t) => (t.realizedPnl || 0) > 0)
    const losingTrades = sellTrades.filter((t) => (t.realizedPnl || 0) < 0)

    const winCount = winningTrades.length
    const lossCount = losingTrades.length
    const winRate = sellTrades.length > 0 ? Number(((winCount / sellTrades.length) * 100).toFixed(1)) : 0

    const totalGains = winningTrades.reduce((acc, t) => acc + (t.realizedPnl || 0), 0)
    const totalLosses = Math.abs(losingTrades.reduce((acc, t) => acc + (t.realizedPnl || 0), 0))
    const profitFactor = totalLosses > 0 ? Number((totalGains / totalLosses).toFixed(2)) : totalGains > 0 ? 99.9 : 0

    // Asset allocation breakdown
    const assetBreakdown = {
      cash: portfolio.virtualBalance,
      stocks: 0,
      crypto: 0,
      forex: 0,
      indices: 0,
    }

    portfolio.holdings.forEach((h) => {
      const cls = (h.assetClass || 'stock').toLowerCase()
      if (cls.includes('crypto')) assetBreakdown.crypto += h.marketValueBase || 0
      else if (cls.includes('forex')) assetBreakdown.forex += h.marketValueBase || 0
      else if (cls.includes('index')) assetBreakdown.indices += h.marketValueBase || 0
      else assetBreakdown.stocks += h.marketValueBase || 0
    })

    const totalNetWorth = portfolio.totalNetWorth || 1
    const allocationPercentages = {
      cash: Number(((assetBreakdown.cash / totalNetWorth) * 100).toFixed(1)),
      stocks: Number(((assetBreakdown.stocks / totalNetWorth) * 100).toFixed(1)),
      crypto: Number(((assetBreakdown.crypto / totalNetWorth) * 100).toFixed(1)),
      forex: Number(((assetBreakdown.forex / totalNetWorth) * 100).toFixed(1)),
      indices: Number(((assetBreakdown.indices / totalNetWorth) * 100).toFixed(1)),
    }

    // Performance metrics
    const initialBalance = 100000
    const totalReturnPercent = Number((((totalNetWorth - initialBalance) / initialBalance) * 100).toFixed(2))
    const sharpeRatio = totalTrades > 5 ? Number((totalReturnPercent / 12.5).toFixed(2)) : 1.25 // Simulated Sharpe
    const maxDrawdown = totalLosses > 0 ? Math.min(25, Number(((totalLosses / initialBalance) * 100).toFixed(1))) : 0

    res.json({
      summary: {
        totalNetWorth,
        virtualBalance: portfolio.virtualBalance,
        totalMarketValue: portfolio.totalMarketValue,
        totalRealizedPnl: Number(user.stats?.totalRealizedPnl?.toFixed(2) || 0),
        totalUnrealizedPnl: portfolio.totalUnrealizedPnl,
        totalReturnPercent,
        baseCurrency: portfolio.baseCurrency,
      },
      tradingMetrics: {
        totalTrades,
        buyTrades: buyTrades.length,
        sellTrades: sellTrades.length,
        winRate,
        profitFactor,
        sharpeRatio,
        maxDrawdownPercent: maxDrawdown,
        bestTrade: winningTrades.reduce((max, t) => Math.max(max, t.realizedPnl || 0), 0),
        worstTrade: losingTrades.reduce((min, t) => Math.min(min, t.realizedPnl || 0), 0),
      },
      allocation: allocationPercentages,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.exportCsv = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 })

    const headers = [
      'Transaction ID',
      'Date (UTC)',
      'Symbol',
      'Side',
      'Quantity',
      'Price',
      'Asset Currency',
      'Exchange Rate',
      'Total Cost (Base Currency)',
      'Fee',
      'Realized PnL',
      'Order Type',
    ]

    const rows = transactions.map((t) => [
      t._id,
      t.createdAt ? new Date(t.createdAt).toISOString() : '',
      t.symbol,
      t.side,
      t.quantity,
      t.price,
      t.assetCurrency || 'USD',
      t.exchangeRate || 1,
      t.costInBaseCurrency,
      t.fee,
      t.realizedPnl || 0,
      t.orderType || 'MARKET',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="tradex_portfolio_ledger.csv"')
    res.status(200).send(csvContent)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.resetBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.virtualBalance = 100000
    user.portfolio = []
    user.stats = {
      totalTrades: 0,
      winTrades: 0,
      lossTrades: 0,
      totalRealizedPnl: 0,
    }

    await user.save()

    res.json({
      message: 'Virtual balance and portfolio positions successfully reset to ₹100,000 baseline.',
      user: user.toSafeObject(),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
