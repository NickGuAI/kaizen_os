import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CardNav } from '../components/layout/CardNav'
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
            raysColor="#8B9467"
            raysSpeed={0.4}
            lightSpread={1.5}
            rayLength={2.5}
            pulsating
            fadeDistance={1.2}
            saturation={0.7}
            followMouse
            mouseInfluence={0.08}
            noiseAmount={0.05}
            distortion={0}
          />
        )}
      </div>
      <div className="public-landing__overlay" aria-hidden="true" />

      <section className="public-landing__hero">
        <p className="public-landing__kicker">
          <ShinyText text="Kaizen OS" speed={4} color="#8B9467" shineColor="#f5f1eb" />
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
