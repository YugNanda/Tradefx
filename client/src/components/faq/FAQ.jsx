import { useState } from 'react'
import './FAQ.css'

const FAQS = [
  {
    q: 'Is TradeX free to use?',
    a: 'Yes — TradeX is completely free for virtual trading. You get ₹10,00,000 in virtual capital to practice with real market data. Premium plans with advanced AI signals and extended history are coming in Phase 2.',
  },
  {
    q: 'Which markets are available?',
    a: 'TradeX covers NSE (NIFTY 50, BANKNIFTY, 2000+ stocks), BSE (SENSEX, equities), NYSE & NASDAQ (US stocks), Forex (30+ currency pairs), Crypto (BTC, ETH, top 100 coins), and Commodities (Gold, Silver, Crude Oil).',
  },
  {
    q: 'Is my money safe? Do I need to deposit anything?',
    a: 'No real money is involved in Phase 1. All trading is virtual — you practice with simulated capital. When real trading is enabled in a future phase, your funds will be protected by industry-standard encryption and regulatory compliance.',
  },
  {
    q: 'How real-time is the market data?',
    a: 'Prices update via WebSocket every 1–2 seconds for major indices, stocks, and crypto. Forex data refreshes every second. This is true streaming data, not polling.',
  },
  {
    q: 'Can I use TradeX to learn trading from scratch?',
    a: 'Absolutely. The virtual portfolio is designed for learners. You can place buy/sell orders, track P&L, read chart patterns, and study technical indicators — all without any real financial risk.',
  },
  {
    q: 'What technical indicators are available?',
    a: 'Phase 2 will include RSI, MACD, Bollinger Bands, EMA (9/21/50/200), Volume Profile, Stochastic, ATR, and more — rendered on TradingView-style ApexCharts with multi-timeframe support.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'The web app is fully responsive and works great on mobile browsers. Native iOS and Android apps are on the roadmap for Phase 3.',
  },
  {
    q: 'How do price alerts work?',
    a: 'Set a target price for any instrument. TradeX sends you an in-app notification and optionally an email when the price crosses your threshold — powered by real-time WebSocket monitoring.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState(null)

  const toggle = (i) => setOpen(open === i ? null : i)

  return (
    <section className="faq" id="faq">
      <div className="section-inner">
        <div className="faq-layout">
          <div className="faq-left">
            <div className="section-eyebrow">FAQ</div>
            <h2 className="section-title" style={{ textAlign: 'left' }}>
              Common questions
            </h2>
            <p className="section-sub" style={{ textAlign: 'left', maxWidth: 300 }}>
              Everything you need to know about TradeX. Can't find what you're looking for?
            </p>
            <a href="mailto:support@tradex.in" className="faq-contact">
              Contact support →
            </a>
          </div>

          <div className="faq-list">
            {FAQS.map((item, i) => (
              <div
                key={i}
                className={`faq-item ${open === i ? 'open' : ''}`}
                onClick={() => toggle(i)}
              >
                <div className="faq-q">
                  <span>{item.q}</span>
                  <div className="faq-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d={open === i ? 'M5 12h14' : 'M12 5v14M5 12h14'} />
                    </svg>
                  </div>
                </div>
                {open === i && (
                  <div className="faq-a">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
