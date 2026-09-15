import './Footer.css'

export default function Footer({ onOpenAuth }) {
  return (
    <footer className="footer">
      {/* System Status Bar */}
      <div className="footer-status-bar">
        <div className="footer-status-inner">
          <div className="fs-item">
            <span className="fs-dot" />
            <span className="fs-text">All Core Trading Engines Operational</span>
          </div>
          <div className="fs-sep" />
          <div className="fs-item">
            <span className="fs-label">Stream Latency:</span>
            <span className="fs-value mono">1.5s Broadcast</span>
          </div>
          <div className="fs-sep" />
          <div className="fs-item">
            <span className="fs-label">Uptime SLA:</span>
            <span className="fs-value mono">99.99% Guaranteed</span>
          </div>
          <div className="fs-sep" />
          <div className="fs-item">
            <span className="fs-label">Security:</span>
            <span className="fs-value">256-bit TLS 1.3 / OTP 2FA</span>
          </div>
        </div>
      </div>

      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <div className="footer-logo-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 17L9 11L13 15L21 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="21" cy="6" r="2.5" fill="white"/>
              </svg>
            </div>
            <span>Tradefx Terminal</span>
          </div>
          <p className="footer-tagline">
            Institutional-grade multi-asset paper trading terminal and quantitative strategy simulation engine.
          </p>
          <div className="footer-auth-row">
            <button className="footer-link-btn" onClick={() => onOpenAuth('login')}>Institutional Sign In →</button>
          </div>
        </div>

        <div className="footer-links">
          <div className="fl-group">
            <div className="fl-title">Markets Matrix</div>
            {['NSE / BSE Equities', 'NASDAQ / NYSE Global', 'Cryptocurrency Spot', 'Forex Major Pairs', 'MCX Commodities'].map(l => (
              <span key={l} className="fl-item">{l}</span>
            ))}
          </div>
          <div className="fl-group">
            <div className="fl-title">Terminal Engine</div>
            {['WebSocket 1.5s Stream', 'Candlestick OHLC HUD', 'Count-to-Bar Timer', 'Quant Technical Signals', 'Order Book Depth'].map(l => (
              <span key={l} className="fl-item">{l}</span>
            ))}
          </div>
          <div className="fl-group">
            <div className="fl-title">Platform Specs</div>
            {['Virtual Sandbox (₹10L)', 'Cryptographic OTP 2FA', 'Audit Ledger Export', 'Global Leaderboards', 'Multi-Asset Watchlist'].map(l => (
              <span key={l} className="fl-item">{l}</span>
            ))}
          </div>
          <div className="fl-group">
            <div className="fl-title">Compliance</div>
            {['Terms of Service', 'Privacy Policy', 'Security Architecture', 'Risk Disclosure', 'Regulatory Sandbox'].map(l => (
              <span key={l} className="fl-item">{l}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <div className="footer-copy">
            © {new Date().getFullYear()} Tradefx Institutional Technologies Inc. All rights reserved.
          </div>
          <div className="footer-disclaimer">
            Notice: Tradefx is a quantitative trading simulation and educational execution environment. All portfolios utilize simulated virtual capital without real financial risk. Market quotes are generated via low-latency algorithmic streaming for backtesting and strategy evaluation. Not investment advice or a registered broker-dealer.
          </div>
        </div>
      </div>
    </footer>
  )
}
