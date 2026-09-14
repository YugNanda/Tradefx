import { useState, useEffect } from 'react'
import { X, Trophy, ShieldCheck } from 'lucide-react'
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
          <div>
            <h2>
              <Trophy size={20} color="#F59E0B" /> Global Institutional Leaderboard
            </h2>
            <p className="lb-subtitle">
              Audited quantitative traders, proprietary desks &amp; top sandbox performers
            </p>
          </div>
          <button className="modal-close-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
            Retrieving institutional rankings…
          </div>
        ) : traders.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
            No trader rankings available yet.
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
                <div key={trader.id || trader.rank} className={`lb-row ${trader.isLiveUser ? 'lb-live-user' : ''}`}>
                  <div className={`lb-rank ${rankClass}`}>#{trader.rank}</div>
                  <div className="lb-user-col">
                    <div className="lb-name-row">
                      <span className="lb-name">{trader.name}</span>
                      {trader.tier && (
                        <span className="lb-tier-badge">
                          <ShieldCheck size={10} /> {trader.tier}
                        </span>
                      )}
                      {trader.isLiveUser && <span className="lb-you-badge">YOU</span>}
                    </div>
                    <div className="lb-sub">
                      {trader.firm ? `${trader.firm} · ` : ''}
                      {trader.totalTrades} trades · {trader.winRate}% win rate
                      {trader.sharpe ? ` · Sharpe ${trader.sharpe}` : ''}
                    </div>
                  </div>
                  <div className="lb-stats-col">
                    <div className="lb-net">₹{trader.netWorth?.toLocaleString()}</div>
                    <div className={`lb-pnl ${trader.realizedPnl >= 0 ? 'gain' : 'loss'}`}>
                      {trader.realizedPnl >= 0 ? '+' : ''}₹{trader.realizedPnl?.toLocaleString()} P&amp;L
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
