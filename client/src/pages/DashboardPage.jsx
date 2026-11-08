import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, BarChart3, Bell, Terminal, Wallet, ShieldCheck, Plus, Sparkles, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useMarket } from '../context/MarketContext'
import { marketApi, watchlistApi, notificationsApi, portfolioApi } from '../api/marketApi'
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
  const [portfolioSummary, setPortfolioSummary] = useState({ virtualBalance: 1000000, totalNetWorth: 1000000 })

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

    portfolioApi
      .get()
      .then((res) => {
        if (res) {
          setPortfolioSummary({
            virtualBalance: res.virtualBalance ?? 1000000,
            totalNetWorth: res.totalNetWorth ?? res.virtualBalance ?? 1000000,
          })
        }
      })
      .catch(() => {})
  }, [refreshKey])

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
      toast.success(`${selected.symbol} pinned to Watchlist`)
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
      {/* ─── Institutional Header Ribbon ─── */}
      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="dash-logo-block">
            <a href="/" className="dash-logo" title="Back to overview">
              <div className="dash-logo-icon">
                <Terminal size={14} color="#FFFFFF" />
              </div>
              <div className="dash-brand-col">
                <span className="dash-brand-name">TradeFX</span>
                <span className="dash-brand-sub mono">TERMINAL PRO</span>
              </div>
            </a>

            <div
              className="dash-live-conn-pill"
              title={connected ? 'Connected to WebSocket Tick Stream' : 'Establishing stream connection…'}
            >
              <span className={`dash-conn-dot ${connected ? 'on' : ''}`} />
              <span className="dash-conn-text mono">{connected ? '1.5S STREAM ACTIVE' : 'CONNECTING…'}</span>
              <span className="dash-latency mono">12ms</span>
            </div>
          </div>

          {/* Quick Portfolio Telemetry Pill in Header */}
          <div className="dash-telemetry-strip">
            <div className="dash-capital-pill" title="Current Virtual Buying Power">
              <Wallet size={12} color="var(--mint)" />
              <span className="dcp-label">BALANCE:</span>
              <span className="dcp-val mono">
                ₹{Number(portfolioSummary.virtualBalance || 1000000).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <div className="dash-header-actions">
            {/* Leaderboard Button */}
            <button
              className="dash-header-btn"
              onClick={() => setShowLeaderboard(true)}
              title="Global Trader Rankings"
            >
              <Trophy size={13} color="var(--light-blue)" />
              <span>Leaderboard</span>
            </button>

            {/* Performance Analytics Button */}
            <button
              className="dash-header-btn"
              onClick={() => setShowAnalytics(true)}
              title="Portfolio Performance & Risk Analytics"
            >
              <BarChart3 size={13} color="var(--indigo)" />
              <span>Analytics</span>
            </button>

            {/* Notifications Button */}
            <button
              className="dash-header-btn dash-btn-icon"
              onClick={() => setShowNotifications(true)}
              title="Notification Center"
            >
              <Bell size={13} />
              {unreadNotifs > 0 && <span className="dash-notif-badge">{unreadNotifs}</span>}
            </button>

            {/* Theme Toggle */}
            <button className="dash-theme-btn" onClick={toggle} aria-label="Toggle Theme" title="Toggle theme">
              {theme === 'dark' ? <Sun size={14} color="var(--mint)" /> : <Moon size={14} color="var(--indigo)" />}
            </button>

            <div className="dash-user-chip" title={user?.email || 'Virtual Trader'}>
              <div className="dash-avatar">{user?.name?.[0]?.toUpperCase() || 'T'}</div>
              <span className="dash-username">{user?.name || 'Trader'}</span>
            </div>

            <button className="dash-signout" onClick={handleLogout} title="Exit session">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ─── Real-Time Monospace Ticker ─── */}
      <LiveTicker />

      {/* ─── Workstation Body ─── */}
      <div className="dash-body">
        {/* Quick Command & Search Toolbar */}
        <div className="dash-toolbar">
          <div className="dash-search-container">
            <SymbolSearch onSelect={setSelected} />
          </div>
          {selected && (
            <button className="dash-watch-btn" onClick={addCurrentToWatchlist} title="Pin symbol to watchlist">
              <Plus size={13} color="var(--mint)" />
              <span>Watchlist</span>
            </button>
          )}
          <div className="dash-asset-active-pill">
            <span className="daap-label">ACTIVE:</span>
            <span className="daap-sym mono">{selected?.symbol || 'RELIANCE'}</span>
            <span className="daap-exch mono">{selected?.exchange || 'NSE'}</span>
          </div>
        </div>

        {/* Modular Grid Layout */}
        <div className="dash-grid">
          {/* Main Execution & Charts Workstation */}
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

          {/* High-Density Watchlist & Alerts Side Workstation */}
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
