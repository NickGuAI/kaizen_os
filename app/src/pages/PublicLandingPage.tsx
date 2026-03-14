import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LightRays from '../components/reactbits/LightRays'
import ShinyText from '../components/reactbits/ShinyText'
import '../styles/public-landing.css'

export default function PublicLandingPage() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches)
    }

    syncPreference()
    mediaQuery.addEventListener('change', syncPreference)

    return () => {
      mediaQuery.removeEventListener('change', syncPreference)
    }
  }, [])

  return (
    <main className="public-landing">
      <div className="public-landing__rays" aria-hidden="true">
        {!prefersReducedMotion && (
          <LightRays
            raysOrigin="top-center"
            raysColor="#d7e8d9"
            raysSpeed={0.8}
            lightSpread={0.95}
            rayLength={1.85}
            pulsating
            fadeDistance={1}
            saturation={1}
            followMouse
            mouseInfluence={0.06}
            noiseAmount={0.03}
            distortion={0.04}
          />
        )}
      </div>
      <div className="public-landing__overlay" aria-hidden="true" />

      <section className="public-landing__hero">
        <p className="public-landing__kicker">
          <ShinyText text="Kaizen OS" speed={4} color="#cad6c5" shineColor="#ffffff" />
        </p>
        <h1 className="public-landing__headline">Improve the day, and life improves itself.</h1>
        <p className="public-landing__subhead">
          Small deliberate steps, repeated with care, become transformation.
        </p>

        <Link to="/login" className="public-landing__cta">
          Enter Kaizen OS
        </Link>
      </section>
    </main>
  )
}
