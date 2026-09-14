const User = require('../models/User')

exports.getLeaderboard = async (_req, res) => {
  try {
    const users = await User.find({})
      .select('name avatar virtualBalance stats createdAt')
      .sort({ 'stats.totalRealizedPnl': -1, virtualBalance: -1 })
      .limit(20)

    const rankings = users.map((u, index) => {
      const trades = u.stats?.totalTrades || 0
      const wins = u.stats?.winTrades || 0
      const winRate = trades > 0 ? Number(((wins / trades) * 100).toFixed(1)) : 0
      const netWorth = u.virtualBalance // base comparison

      return {
        rank: index + 1,
        id: u._id,
        name: u.name,
        avatar: u.avatar,
        netWorth: Number(netWorth.toFixed(2)),
        realizedPnl: Number((u.stats?.totalRealizedPnl || 0).toFixed(2)),
        totalTrades: trades,
        winRate,
      }
    })

    res.json({ leaderboard: rankings })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
