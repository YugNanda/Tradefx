import { useState } from 'react'
import Navbar from '../components/navbar/Navbar'
import Ticker from '../components/ticker/Ticker'
import Hero from '../components/hero/Hero'
import Features from '../components/features/Features'
import Markets from '../components/features/Markets'
import Footer from '../components/testimonials/Footer'
import AuthModal from '../components/auth/AuthModal'

export default function LandingPage() {
  const [authModal, setAuthModal] = useState(null) // null | 'login' | 'signup'

  const openAuth = (mode) => setAuthModal(mode)
  const closeAuth = () => setAuthModal(null)

  return (
    <div className="landing">
      <header className="landing-top-header">
        <Ticker />
        <Navbar onOpenAuth={openAuth} />
      </header>
      <main>
        <Hero onOpenAuth={openAuth} />
        <Features />
        <Markets onOpenAuth={openAuth} />
      </main>
      <Footer onOpenAuth={openAuth} />

      {authModal && (
        <AuthModal mode={authModal} onClose={closeAuth} />
      )}
    </div>
  )
}
