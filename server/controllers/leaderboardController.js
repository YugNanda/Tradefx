const User = require('../models/User')

const INSTITUTIONAL_PROP_TRADERS = [
  {
    id: 'prop-1',
    name: 'Marcus Vance',
    firm: 'Vance Quantitative Ltd',
    desk: 'HFT Equities · London',
    netWorth: 2485420.50,
    realizedPnl: 1485420.50,
    totalTrades: 142,
    winRate: 78.4,
    sharpe: 2.84,
    tier: 'Elite Sovereign',
  },
  {
    id: 'prop-2',
    name: 'Elena Rostova',
    firm: 'AlphaMatrix Capital',
    desk: 'Macro Derivatives · Zurich',
    netWorth: 1942100.00,
    realizedPnl: 942100.00,
    totalTrades: 98,
    winRate: 73.1,
    sharpe: 2.61,
    tier: 'Elite Sovereign',
  },
  {
    id: 'prop-3',
    name: 'Vikramaditya Singhania',
    firm: 'Apex HFT Labs',
    desk: 'Index Options · Mumbai',
    netWorth: 1678900.25,
    realizedPnl: 678900.25,
    totalTrades: 215,
    winRate: 69.5,
    sharpe: 2.45,
    tier: 'Master Prop',
  },
  {
    id: 'prop-4',
    name: 'Sarah Jenkins',
    firm: 'Citadel Sandbox Fellow',
    desk: 'Statistical Arb · New York',
    netWorth: 1534000.00,
    realizedPnl: 534000.00,
    totalTrades: 84,
    winRate: 71.2,
    sharpe: 2.38,
    tier: 'Master Prop',
  },
  {
    id: 'prop-5',
    name: 'Kenji Takahashi',
    firm: 'Tokyo Trend Arbitrage',
    desk: 'FX & Volatility · Tokyo',
    netWorth: 1412650.00,
    realizedPnl: 412650.00,
    totalTrades: 163,
    winRate: 66.8,
    sharpe: 2.19,
    tier: 'Master Prop',
  },
  {
    id: 'prop-6',
    name: 'Devrat Sharma',
    firm: 'Quant Momentum India',
    desk: 'Algo Breakout · Bengaluru',
    netWorth: 1345200.00,
    realizedPnl: 345200.00,
    totalTrades: 119,
    winRate: 64.2,
    sharpe: 2.05,
    tier: 'Pro Quant',
  },
  {
    id: 'prop-7',
    name: 'Chloe Dubois',
    firm: 'Lombard Statistical FX',
    desk: 'Cross-Currency · Geneva',
    netWorth: 1298400.00,
    realizedPnl: 298400.00,
    totalTrades: 76,
    winRate: 62.9,
    sharpe: 1.94,
    tier: 'Pro Quant',
  },
  {
    id: 'prop-8',
    name: 'Aarav Nambiar',
    firm: 'Delta Neutral Strategies',
    desk: 'NSE F&O Spread · Kochi',
    netWorth: 1215800.00,
    realizedPnl: 215800.00,
    totalTrades: 92,
    winRate: 61.5,
    sharpe: 1.88,
    tier: 'Pro Quant',
  },
  {
    id: 'prop-9',
    name: 'Sofia Al-Mansoor',
    firm: 'Gulf Macro Derivatives',
    desk: 'Energy & Commodities · Dubai',
    netWorth: 1162400.00,
    realizedPnl: 162400.00,
    totalTrades: 64,
    winRate: 59.8,
    sharpe: 1.76,
    tier: 'Verified Prop',
  },
  {
    id: 'prop-10',
    name: 'David Chen',
    firm: 'Bayesian Options Fund',
    desk: 'Gamma Scalping · Singapore',
    netWorth: 1104300.00,
    realizedPnl: 104300.00,
    totalTrades: 51,
    winRate: 58.1,
    sharpe: 1.62,
    tier: 'Verified Prop',
  },
]

exports.getLeaderboard = async (_req, res) => {
  try {
    // Fetch live users with actual activity
    const users = await User.find({})
      .select('name avatar virtualBalance stats createdAt')
      .sort({ 'stats.totalRealizedPnl': -1, virtualBalance: -1 })
      .limit(20)

    const liveRankings = users
      .filter((u) => (u.stats?.totalTrades || 0) > 0)
      .map((u) => {
        const trades = u.stats?.totalTrades || 0
        const wins = u.stats?.winTrades || 0
        const winRate = trades > 0 ? Number(((wins / trades) * 100).toFixed(1)) : 0
        const netWorth = u.virtualBalance || 1000000
        const realizedPnl = u.stats?.totalRealizedPnl || 0

        return {
          id: u._id.toString(),
          name: u.name,
          avatar: u.avatar,
          firm: 'TradeX Institutional Desk',
          desk: 'Virtual Trading Sandbox',
          netWorth: Number(netWorth.toFixed(2)),
          realizedPnl: Number(realizedPnl.toFixed(2)),
          totalTrades: trades,
          winRate,
          sharpe: Number((1.5 + Math.min(1.2, (winRate / 100) * 1.5)).toFixed(2)),
          tier: winRate >= 70 ? 'Elite Sovereign' : winRate >= 60 ? 'Master Prop' : 'Pro Quant',
          isLiveUser: true,
        }
      })

    // Combine institutional seed roster with live active traders
    const combined = [...INSTITUTIONAL_PROP_TRADERS, ...liveRankings]
    combined.sort((a, b) => b.realizedPnl - a.realizedPnl)

    // Assign dynamic ranks
    const rankings = combined.slice(0, 15).map((item, index) => ({
      ...item,
      rank: index + 1,
    }))

    res.json({ leaderboard: rankings })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
