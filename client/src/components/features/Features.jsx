import './Features.css'

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    title: 'Real-Time Market Data',
    desc: 'Live prices across NSE, BSE, NYSE, NASDAQ, Forex, and Crypto — updated every second via WebSocket.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    title: 'Advanced Charting',
    desc: 'TradingView-style candlestick charts with 20+ technical indicators — RSI, MACD, Bollinger Bands and more.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
    title: 'Virtual Portfolio',
    desc: 'Practice with ₹10,00,000 virtual capital. Track P&L, allocation, and performance in real-time.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
    title: 'Watchlist & Alerts',
    desc: 'Build custom watchlists across markets. Set price alerts and get notified instantly when targets hit.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'Market News & Insights',
    desc: 'Curated financial news from global sources. AI-summarized headlines so you never miss a market move.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'Secure & Private',
    desc: '256-bit SSL encryption, JWT authentication, and zero data sharing. Your portfolio stays yours.',
  },
]

export default function Features() {
  return (
    <section className="features" id="features">
      <div className="section-inner">
        <div className="section-header">
          <div className="section-eyebrow">Platform Features</div>
          <h2 className="section-title">Everything you need to trade smarter</h2>
          <p className="section-sub">Built for serious traders who want institutional-grade tools without the institutional cost.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="fc-icon">{f.icon}</div>
              <h3 className="fc-title">{f.title}</h3>
              <p className="fc-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
