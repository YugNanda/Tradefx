import './Footer.css'

export default function Footer({ onOpenAuth }) {
  return (
    <>
      {/* CTA Banner */}
      <section className="cta-section">
        <div className="cta-inner">
          <div className="cta-badge">Free forever · No credit card</div>
          <h2 className="cta-title">Ready to trade smarter?</h2>
          <p className="cta-sub">Join 1.2M+ traders. Get ₹10,00,000 in virtual capital and start practicing with real market data — free.</p>
          <div className="cta-actions">
            <button className="cta-btn-primary" onClick={() => onOpenAuth('signup')}>
              Create free account
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="cta-btn-ghost" onClick={() => onOpenAuth('login')}>
              Sign in instead
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M3 17L9 11L13 15L21 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="21" cy="6" r="2.5" fill="white"/>
                </svg>
              </div>
              TradeX
            </div>
            <p className="footer-tagline">Professional trading platform for Indian and global markets.</p>
            <div className="footer-secure">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              256-bit SSL secured
            </div>
          </div>

          <div className="footer-links">
            <div className="fl-group">
              <div className="fl-title">Markets</div>
              {['NSE / BSE', 'NYSE / NASDAQ', 'Cryptocurrency', 'Forex', 'Commodities'].map(l => (
                <a key={l} href="#">{l}</a>
              ))}
            </div>
            <div className="fl-group">
              <div className="fl-title">Platform</div>
              {['Features', 'Pricing', 'API Docs', 'Mobile App', 'Changelog'].map(l => (
                <a key={l} href="#">{l}</a>
              ))}
            </div>
            <div className="fl-group">
              <div className="fl-title">Company</div>
              {['About', 'Blog', 'Careers', 'Press', 'Contact'].map(l => (
                <a key={l} href="#">{l}</a>
              ))}
            </div>
            <div className="fl-group">
              <div className="fl-title">Legal</div>
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Disclaimer'].map(l => (
                <a key={l} href="#">{l}</a>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2024 TradeX Technologies Pvt. Ltd. All rights reserved.</span>
          <span className="footer-disclaimer">For educational purposes only. Not SEBI registered investment advice.</span>
        </div>
      </footer>
    </>
  )
}
