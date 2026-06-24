import './Testimonials.css'

const REVIEWS = [
  {
    name: 'Arjun Mehta',
    role: 'Day Trader, Mumbai',
    avatar: 'AM',
    color: '#3B82F6',
    stars: 5,
    text: 'Finally a platform that has both Indian and global markets in one place. The candlestick charts with RSI and MACD saved me hours of switching between apps.',
  },
  {
    name: 'Priya Sharma',
    role: 'Finance Student, Delhi',
    avatar: 'PS',
    color: '#8B5CF6',
    stars: 5,
    text: 'The virtual portfolio is incredible for learning. I started with ₹10L virtual capital and in 3 months I understand markets so much better. No real money risk.',
  },
  {
    name: 'Rohit Verma',
    role: 'Crypto Investor, Bangalore',
    avatar: 'RV',
    color: '#F59E0B',
    stars: 5,
    text: 'BTC, ETH, and altcoins all with real-time WebSocket data. The price alerts actually work — I caught the BTC breakout at exactly the right moment.',
  },
  {
    name: 'Sneha Patel',
    role: 'Options Trader, Ahmedabad',
    avatar: 'SP',
    color: '#10B981',
    stars: 5,
    text: 'BANKNIFTY and NIFTY data with live Sensex movement. The news feed tied to stock symbols is a game changer for options. 10/10.',
  },
  {
    name: 'Karan Singh',
    role: 'Forex Trader, Pune',
    avatar: 'KS',
    color: '#EF4444',
    stars: 5,
    text: 'USD/INR, EUR/USD, GBP/USD — all pairs updating in real time. The clean UI is miles ahead of other apps. Dark mode is perfect for late-night sessions.',
  },
  {
    name: 'Ananya Roy',
    role: 'Retail Investor, Kolkata',
    avatar: 'AR',
    color: '#06B6D4',
    stars: 5,
    text: 'I was scared of markets before TradeX. The virtual trading let me learn without losing money. Now I invest real money with confidence. Thank you!',
  },
]

export default function Testimonials() {
  return (
    <section className="testimonials" id="testimonials">
      <div className="section-inner">
        <div className="section-header">
          <div className="section-eyebrow">User Experience</div>
          <h2 className="section-title">Traders love TradeX</h2>
          <p className="section-sub">From beginners to seasoned traders — see what the community says.</p>
        </div>

        <div className="reviews-grid">
          {REVIEWS.map((r, i) => (
            <div key={i} className="review-card" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="rv-stars">
                {Array.from({ length: r.stars }).map((_, j) => (
                  <svg key={j} width="13" height="13" viewBox="0 0 24 24" fill="var(--warn)">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ))}
              </div>
              <p className="rv-text">"{r.text}"</p>
              <div className="rv-author">
                <div className="rv-avatar" style={{ background: r.color + '22', color: r.color, border: `1px solid ${r.color}44` }}>
                  {r.avatar}
                </div>
                <div>
                  <div className="rv-name">{r.name}</div>
                  <div className="rv-role">{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <div className="trust-bar">
          <div className="trust-item">
            <span className="ti-value">4.9/5</span>
            <span className="ti-label">Average rating</span>
          </div>
          <div className="trust-sep" />
          <div className="trust-item">
            <span className="ti-value">1.2M+</span>
            <span className="ti-label">Active traders</span>
          </div>
          <div className="trust-sep" />
          <div className="trust-item">
            <span className="ti-value">50+</span>
            <span className="ti-label">Markets covered</span>
          </div>
          <div className="trust-sep" />
          <div className="trust-item">
            <span className="ti-value">99.9%</span>
            <span className="ti-label">Uptime SLA</span>
          </div>
        </div>
      </div>
    </section>
  )
}
