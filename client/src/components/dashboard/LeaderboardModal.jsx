import { useState, useEffect } from 'react'
import { X, Trophy, Award, TrendingUp } from 'lucide-react'
import { leaderboardApi } from '../../api/marketApi'
import './LeaderboardModal.css'

export default function LeaderboardModal({ onClose }) {
  const [traders, setTraders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    leaderboardApi
      .get()
      .then(setTraders)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="leaderboard-modal-box">
        <div className="modal-title-row">
          <h2>
            <Trophy size={20} color="#F59E0B" /> Global Trader Leaderboard
          </h2>
          <button className="modal-close-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-4)' }}>
            Retrieving global trader standings…
          </div>
        ) : traders.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-4)' }}>
            No trader rankings available yet. Place trades to appear on the leaderboard!
          </div>
        ) : (
          <div className="lb-table">
            {traders.map((trader) => {
              const rankClass =
                trader.rank === 1
                  ? 'lb-rank-1'
                  : trader.rank === 2
                  ? 'lb-rank-2'
                  : trader.rank === 3
                  ? 'lb-rank-3'
                  : ''
              return (
                <div key={trader.id} className="lb-row">
                  <div className={`lb-rank ${rankClass}`}>#{trader.rank}</div>
                  <div className="lb-user-col">
                    <span className="lb-name">{trader.name}</span>
                    <span className="lb-sub">
                      {trader.totalTrades} trades · {trader.winRate}% win rate
                    </span>
                  </div>
                  <div className="lb-stats-col">
                    <div className="lb-net">₹{trader.netWorth.toLocaleString()}</div>
                    <div className={`lb-pnl ${trader.realizedPnl >= 0 ? 'gain' : 'loss'}`}>
                      {trader.realizedPnl >= 0 ? '+' : ''}₹{trader.realizedPnl.toLocaleString()} P&amp;L
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
