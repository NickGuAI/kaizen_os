import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CardNav } from '../components/layout/CardNav'
import LightRays from '../components/reactbits/LightRays'
import ShapeBlur from '../components/reactbits/ShapeBlur'
import ShinyText from '../components/reactbits/ShinyText'
import '../styles/public-landing.css'

export default function PublicLandingPage() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [pricingOpen, setPricingOpen] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches)
    }

    syncPreference()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncPreference)
    } else {
      mediaQuery.addListener(syncPreference)
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', syncPreference)
      } else {
        mediaQuery.removeListener(syncPreference)
      }
    }
  }, [])

  return (
    <main className="public-landing">
      <CardNav variant="dark" />

      <div className="public-landing__rays" aria-hidden="true">
        {!prefersReducedMotion && (
          <LightRays
            raysOrigin="top-center"
            raysColor="#a8b880"
            raysSpeed={0.5}
            lightSpread={2.0}
            rayLength={3.0}
            pulsating
            fadeDistance={1.6}
            saturation={0.85}
            followMouse
            mouseInfluence={0.1}
            noiseAmount={0.03}
            distortion={0}
          />
        )}
      </div>
      <div className="public-landing__overlay" aria-hidden="true" />

      <section className="public-landing__hero">
        {!prefersReducedMotion && (
          <div className="public-landing__shape-blur" aria-hidden="true">
            <ShapeBlur
              cornerRadius={28}
              borderSize={0.012}
              circleSize={0.5}
              circleEdge={0.2}
            />
          </div>
        )}
        <div className="public-landing__hero-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <img src="/assets/zenos_logo.png" alt="ZenOS" style={{ width: 44, height: 44, borderRadius: 10 }} />
            <p className="public-landing__kicker" style={{ margin: 0 }}>
              <ShinyText text="ZenOS" speed={4} color="#8B9467" shineColor="#f5f1eb" />
            </p>
          </div>
          <h1 className="public-landing__headline">Improve the day, and life improves itself.</h1>
          <p className="public-landing__subhead">
            Small deliberate steps, repeated with care, become transformation.
          </p>

          <Link to="/login" className="public-landing__cta">
            Enter ZenOS
          </Link>
        </div>
      </section>

      <div className="public-landing__pricing">
        <button
          className="public-landing__pricing-toggle"
          aria-expanded={pricingOpen}
          onClick={() => setPricingOpen(!pricingOpen)}
        >
          Compare Plans
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 5.5L7 9.5L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {pricingOpen && (
          <div className="public-landing__pricing-grid">
            <div className="public-landing__plan">
              <p className="public-landing__plan-name">Free</p>
              <p className="public-landing__plan-price">$0 <span>/month</span></p>
              <ul className="public-landing__plan-features">
                <li>1 calendar connection</li>
                <li>1 active theme</li>
                <li>$5/month AI assistant credits</li>
                <li>Core planning &amp; review</li>
                <li>Daily notes &amp; gratitude</li>
              </ul>
            </div>

            <div className="public-landing__plan public-landing__plan--featured">
              <p className="public-landing__plan-name">Pro</p>
              <p className="public-landing__plan-price">$10 <span>/month</span></p>
              <ul className="public-landing__plan-features">
                <li>Multiple calendar connections</li>
                <li>2+ active themes</li>
                <li>$15/month AI assistant credits</li>
                <li>Coaching support</li>
                <li>Everything in Free</li>
              </ul>
            </div>

            <div className="public-landing__plan">
              <p className="public-landing__plan-name">Enterprise</p>
              <p className="public-landing__plan-price">Custom</p>
              <ul className="public-landing__plan-features">
                <li>Everything in Pro</li>
                <li>Personal performance coaching</li>
                <li>Custom onboarding</li>
                <li>Priority support</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <footer className="public-landing__footer">
        <Link to="/privacy">Privacy Policy</Link>
        <span className="public-landing__footer-sep">&middot;</span>
        <Link to="/terms">Terms of Service</Link>
      </footer>
    </main>
  )
}
