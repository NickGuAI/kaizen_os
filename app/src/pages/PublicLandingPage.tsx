import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CardNav } from '../components/layout/CardNav'
import LightRays from '../components/reactbits/LightRays'
import ShapeBlur from '../components/reactbits/ShapeBlur'
import ShinyText from '../components/reactbits/ShinyText'
import '../styles/public-landing.css'

export default function PublicLandingPage() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const startMusic = useCallback(() => {
    const el = audioRef.current
    if (el && el.paused) {
      el.play().catch(() => {})
    }
  }, [])

  useEffect(() => {
    document.addEventListener('click', startMusic, { once: true })
    return () => document.removeEventListener('click', startMusic)
  }, [startMusic])

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
      <audio ref={audioRef} src="/assets/zenkai.wav" loop />
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
        </div>
      </section>
    </main>
  )
}
