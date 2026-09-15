import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, BarChart3, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useMarket } from '../context/MarketContext'
import { marketApi, watchlistApi, notificationsApi } from '../api/marketApi'
import toast from 'react-hot-toast'
import LiveTicker from '../components/dashboard/LiveTicker'
import SymbolSearch from '../components/dashboard/SymbolSearch'
import SymbolDetail from '../components/dashboard/SymbolDetail'
import WatchlistPanel from '../components/dashboard/WatchlistPanel'
import PortfolioPanel from '../components/dashboard/PortfolioPanel'
import AlertsPanel from '../components/dashboard/AlertsPanel'
import NewsPanel from '../components/dashboard/NewsPanel'
import AnalyticsModal from '../components/dashboard/AnalyticsModal'
import LeaderboardModal from '../components/dashboard/LeaderboardModal'
import NotificationCenter from '../components/dashboard/NotificationCenter'
import './DashboardPage.css'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const { connected } = useMarket()
  const navigate = useNavigate()

  const [catalog, setCatalog] = useState([])
  const [selected, setSelected] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Modals state
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  useEffect(() => {
    marketApi
      .listSymbols()
      .then((symbols) => {
        setCatalog(symbols || [])
        if (symbols && symbols.length > 0) {
          setSelected((prev) => prev || symbols[0])
        }
      })
      .catch(() => {})
    notificationsApi
      .get()
      .then((res) => setUnreadNotifs(res.unreadCount || 0))
      .catch(() => {})
  }, [])

  const selectSymbol = useCallback(
    (symbol) => {
      const instrument = catalog.find((c) => c.symbol === symbol)
      if (instrument) setSelected(instrument)
      else marketApi.search(symbol).then((r) => r[0] && setSelected(r[0]))
    },
    [catalog]
  )

  const addCurrentToWatchlist = async () => {
    if (!selected) return
    try {
      await watchlistApi.add(selected.symbol)
      toast.success(`${selected.symbol} added to watchlist`)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add to watchlist')
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/')
  }

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="dash-logo">
            <div className="dash-logo-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 17L9 11L13 15L21 6"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="21" cy="6" r="2.5" fill="white" />
              </svg>
            </div>
            <span>Tradefx Terminal</span>
            <div className="dash-live-conn-pill" title={connected ? 'Live 1.5s Institutional Stream Connected' : 'Connecting to Tradefx engine…'}>
              <span className={`dash-conn-dot ${connected ? 'on' : ''}`} />
              <span className="dash-conn-text">{connected ? 'Live 1.5s' : 'Connecting…'}</span>
            </div>
          </div>

          <div className="dash-header-actions">
            {/* Leaderboard Button */}
            <button
              className="dash-header-btn"
              onClick={() => setShowLeaderboard(true)}
              title="Global Trader Leaderboard"
            >
              <Trophy size={14} color="#F59E0B" /> Leaderboard
            </button>

            {/* Performance Analytics Button */}
            <button
              className="dash-header-btn"
              onClick={() => setShowAnalytics(true)}
              title="Portfolio Performance Analytics"
            >
              <BarChart3 size={14} color="var(--accent)" /> Analytics
            </button>

            {/* Notifications Button */}
            <button
              className="dash-header-btn"
              onClick={() => setShowNotifications(true)}
              title="Notification Center"
            >
              <Bell size={14} />
              {unreadNotifs > 0 && <span className="dash-notif-badge">{unreadNotifs}</span>}
            </button>

            {/* Theme Toggle */}
            <button className="dash-theme-btn" onClick={toggle} aria-label="Toggle Theme">
              {theme === 'dark' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <div className="dash-avatar">{user?.name?.[0]?.toUpperCase() || 'T'}</div>
            <button className="dash-signout" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <LiveTicker />

      <div className="dash-body">
        <div className="dash-toolbar">
          <SymbolSearch onSelect={setSelected} />
          {selected && (
            <button className="dash-watch-btn" onClick={addCurrentToWatchlist}>
              + Add to Watchlist
            </button>
          )}
        </div>

        <div className="dash-grid">
          <div className="dash-col-main">
            <SymbolDetail
              instrument={selected}
              onTraded={() => setRefreshKey((k) => k + 1)}
              refreshKey={refreshKey}
            />
            <PortfolioPanel
              onSelect={selectSymbol}
              refreshKey={refreshKey}
              onOpenAnalytics={() => setShowAnalytics(true)}
              onTraded={() => setRefreshKey((k) => k + 1)}
            />
            <NewsPanel symbol={selected?.symbol} />
          </div>

          <div className="dash-col-side">
            <WatchlistPanel onSelect={selectSymbol} refreshKey={refreshKey} />
            <AlertsPanel presetSymbol={selected?.symbol} />
          </div>
        </div>
      </div>

      {/* Analytics Modal */}
      {showAnalytics && (
        <AnalyticsModal
          onClose={() => setShowAnalytics(false)}
          onResetCompleted={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}

      {/* Notification Center Drawer */}
      {showNotifications && (
        <NotificationCenter
          onClose={() => setShowNotifications(false)}
          onCountUpdated={setUnreadNotifs}
        />
      )}
    </div>
  )
}
