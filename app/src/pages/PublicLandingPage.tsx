import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CardNav } from '../components/layout/CardNav'
import LightRays from '../components/reactbits/LightRays'
import ShapeBlur from '../components/reactbits/ShapeBlur'
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
      <CardNav variant="light" />

      {/* ── WebGL Background ── */}
      <div className="public-landing__rays" aria-hidden="true">
        {!prefersReducedMotion && (
          <LightRays
            raysOrigin="top-center"
            raysColor="#c8cdb0"
            raysSpeed={0.5}
            lightSpread={2.0}
            rayLength={3.0}
            pulsating
            fadeDistance={1.6}
            saturation={0.45}
            followMouse
            mouseInfluence={0.1}
            noiseAmount={0.03}
            distortion={0}
          />
        )}
      </div>
      <div className="public-landing__overlay" aria-hidden="true" />

      {/* ── Hero Section ── */}
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
        <div className="public-landing__hero-inner">
          <div className="public-landing__hero-left">
            <div className="public-landing__hero-badge">
              <img src="/assets/zenos_logo.png" alt="ZenOS" className="public-landing__hero-logo" />
              <p className="public-landing__kicker">
                <ShinyText text="ZenOS" speed={4} color="#8B9467" shineColor="#FFFFFF" />
              </p>
            </div>
            <h1 className="public-landing__headline">
              Your Personal Transformation Coach
            </h1>
            <p className="public-landing__subhead">
              ZenOS is a personal transformation platform that connects your calendar, habits,
              and goals into a single coaching experience. Your AI agent, Kaizor, learns your
              patterns, coaches you daily, and evolves with you — turning small deliberate steps
              into compound growth.
            </p>
            <div className="public-landing__hero-ctas">
              <Link to="/login" className="public-landing__cta public-landing__cta--primary">
                Get Started
              </Link>
              <a href="#how-it-works" className="public-landing__cta public-landing__cta--secondary">
                See How It Works
              </a>
            </div>
          </div>
          <div className="public-landing__hero-right">
            <div className="public-landing__mock-card">
              <p className="public-landing__mock-label">Insights Preview</p>
              <div className="public-landing__mock-row">
                <span className="public-landing__mock-dot public-landing__mock-dot--sage" />
                <span className="public-landing__mock-text">Growth streak: 12 days</span>
              </div>
              <div className="public-landing__mock-row">
                <span className="public-landing__mock-dot public-landing__mock-dot--sage" />
                <span className="public-landing__mock-text">Theme: Deep Focus</span>
              </div>
              <div className="public-landing__mock-row">
                <span className="public-landing__mock-dot public-landing__mock-dot--warm" />
                <span className="public-landing__mock-text">Kaizor: &quot;Try a morning block&quot;</span>
              </div>
              <div className="public-landing__mock-bar">
                <div className="public-landing__mock-bar-fill" />
              </div>
              <p className="public-landing__mock-caption">Weekly progress: 78%</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof Bar ── */}
      <section className="public-landing__proof">
        <span className="public-landing__proof-item">Built by a Google TL</span>
        <span className="public-landing__proof-sep" aria-hidden="true" />
        <span className="public-landing__proof-item">3 years production use</span>
        <span className="public-landing__proof-sep" aria-hidden="true" />
        <span className="public-landing__proof-item">Columbia curriculum</span>
      </section>

      {/* ── Two Pillars Section ── */}
      <section className="public-landing__pillars">
        <h2 className="public-landing__section-title">Two Pillars of Transformation</h2>
        <div className="public-landing__pillars-grid">
          <div className="public-landing__pillar-card">
            <p className="public-landing__pillar-label">Kaizor Agent</p>
            <h3 className="public-landing__pillar-heading">Your Personalized AI Coach</h3>
            <p className="public-landing__pillar-desc">
              Kaizor is your evolving transformation agent. It learns your patterns,
              coaches you daily with personalized nudges, and adapts its guidance as you grow.
              Not a chatbot — a companion that compounds knowledge about you over time.
            </p>
          </div>
          <div className="public-landing__pillar-card">
            <p className="public-landing__pillar-label">Insights Dashboard</p>
            <h3 className="public-landing__pillar-heading">Visualize Your Growth</h3>
            <p className="public-landing__pillar-desc">
              See your progress across themes and seasons. Track habits, identify patterns,
              and discover growth opportunities through an intuitive dashboard that turns
              raw data into actionable insights and clear action plans.
            </p>
          </div>
        </div>
      </section>

      {/* ── Problem / Solution Section ── */}
      <section className="public-landing__compare">
        <h2 className="public-landing__section-title">Why ZenOS?</h2>
        <div className="public-landing__compare-grid">
          <div className="public-landing__compare-col">
            <p className="public-landing__compare-heading public-landing__compare-heading--without">Without ZenOS</p>
            <ul className="public-landing__compare-list">
              <li className="public-landing__compare-item public-landing__compare-item--without">
                Growth goals forgotten after the first week
              </li>
              <li className="public-landing__compare-item public-landing__compare-item--without">
                No visibility into your behavioral patterns
              </li>
              <li className="public-landing__compare-item public-landing__compare-item--without">
                Self-improvement advice is generic and one-size-fits-all
              </li>
              <li className="public-landing__compare-item public-landing__compare-item--without">
                Insights scattered across apps with no memory
              </li>
            </ul>
          </div>
          <div className="public-landing__compare-col">
            <p className="public-landing__compare-heading public-landing__compare-heading--with">With ZenOS</p>
            <ul className="public-landing__compare-list">
              <li className="public-landing__compare-item public-landing__compare-item--with">
                Daily coaching and nudges keep you on track
              </li>
              <li className="public-landing__compare-item public-landing__compare-item--with">
                Progress visualization across themes and seasons
              </li>
              <li className="public-landing__compare-item public-landing__compare-item--with">
                Personalized AI agent that evolves with you
              </li>
              <li className="public-landing__compare-item public-landing__compare-item--with">
                Centralized dashboard with compound memory
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="public-landing__how" id="how-it-works">
        <h2 className="public-landing__section-title">How It Works</h2>
        <div className="public-landing__steps">
          <div className="public-landing__step">
            <span className="public-landing__step-num">1</span>
            <h3 className="public-landing__step-title">Connect</h3>
            <p className="public-landing__step-desc">
              Link your calendar, habits, and goals. ZenOS syncs your Google Calendar and Tasks
              to build a complete picture of your day.
            </p>
          </div>
          <div className="public-landing__step-arrow" aria-hidden="true">&rarr;</div>
          <div className="public-landing__step">
            <span className="public-landing__step-num">2</span>
            <h3 className="public-landing__step-title">Reflect</h3>
            <p className="public-landing__step-desc">
              Kaizor coaches you daily — surfacing patterns, suggesting focus areas,
              and helping you set intentions aligned with your themes.
            </p>
          </div>
          <div className="public-landing__step-arrow" aria-hidden="true">&rarr;</div>
          <div className="public-landing__step">
            <span className="public-landing__step-num">3</span>
            <h3 className="public-landing__step-title">Transform</h3>
            <p className="public-landing__step-desc">
              Track progress and compound your growth. Watch themes evolve across seasons
              as small daily steps become lasting transformation.
            </p>
          </div>
        </div>
      </section>

      {/* ── Data Usage Section ── */}
      <section className="public-landing__data-usage">
        <h2 className="public-landing__data-usage-title">How We Use Your Data</h2>
        <p className="public-landing__data-usage-desc">
          ZenOS requests access to your Google account to sync calendar events and tasks
          with your coaching dashboard. Kaizor uses this data to personalize your daily
          coaching — identifying patterns, suggesting focus areas, and tracking your progress.
          We never share your data with third parties.
        </p>
        <Link to="/privacy" className="public-landing__data-usage-link">
          Read our full Privacy Policy
        </Link>
      </section>

      {/* ── Pricing Section (always visible) ── */}
      <section className="public-landing__pricing">
        <h2 className="public-landing__section-title">Plans</h2>
        <div className="public-landing__pricing-grid">
          <div className="public-landing__plan">
            <p className="public-landing__plan-name">Free</p>
            <p className="public-landing__plan-price">$0 <span>/month</span></p>
            <ul className="public-landing__plan-features">
              <li>1 calendar connection</li>
              <li>1 active theme</li>
              <li>$5/month AI coaching credits</li>
              <li>Core planning &amp; review</li>
              <li>Daily notes &amp; gratitude</li>
            </ul>
          </div>

          <div className="public-landing__plan public-landing__plan--featured">
            <p className="public-landing__plan-name">Pro</p>
            <p className="public-landing__plan-price">$10 <span>/month</span></p>
            <ul className="public-landing__plan-features">
              <li>Multiple calendar connections</li>
              <li>Unlimited active themes</li>
              <li>$15/month AI coaching credits</li>
              <li>Kaizor advanced coaching</li>
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
      </section>

      {/* ── Founder Section ── */}
      <section className="public-landing__founder">
        <div className="public-landing__founder-inner">
          <div className="public-landing__founder-avatar" aria-hidden="true">NG</div>
          <blockquote className="public-landing__founder-quote">
            &ldquo;I built ZenOS because I needed it myself. After years of scattered
            tools and forgotten goals, I wanted one system that actually learns who I am
            and coaches me to become who I want to be.&rdquo;
          </blockquote>
          <p className="public-landing__founder-credentials">
            Former Google Tech Lead &middot; Columbia University &middot; 3 years in production
          </p>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="public-landing__bottom-cta">
        <h2 className="public-landing__bottom-cta-headline">
          Start your transformation journey
        </h2>
        <div className="public-landing__hero-ctas">
          <Link to="/login" className="public-landing__cta public-landing__cta--primary">
            Get Started
          </Link>
          <a
            href="https://cal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="public-landing__cta public-landing__cta--secondary"
          >
            Book a Demo
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="public-landing__footer">
        <div className="public-landing__footer-grid">
          <div className="public-landing__footer-col">
            <p className="public-landing__footer-heading">Product</p>
            <a href="#how-it-works" className="public-landing__footer-link">How It Works</a>
            <a href="#how-it-works" className="public-landing__footer-link">Features</a>
            <a href="#" className="public-landing__footer-link">Pricing</a>
          </div>
          <div className="public-landing__footer-col">
            <p className="public-landing__footer-heading">Platform</p>
            <a href="https://gehirn.ai" target="_blank" rel="noopener noreferrer" className="public-landing__footer-link">
              Built on Gehirn
            </a>
            <span className="public-landing__footer-link">Kaizor Agent</span>
          </div>
          <div className="public-landing__footer-col">
            <p className="public-landing__footer-heading">Company</p>
            <span className="public-landing__footer-link">About</span>
            <span className="public-landing__footer-link">Careers</span>
            <span className="public-landing__footer-link">Contact</span>
          </div>
          <div className="public-landing__footer-col">
            <p className="public-landing__footer-heading">Legal</p>
            <Link to="/privacy" className="public-landing__footer-link">Privacy Policy</Link>
            <Link to="/terms" className="public-landing__footer-link">Terms of Service</Link>
          </div>
        </div>
        <p className="public-landing__footer-copy">
          &copy; {new Date().getFullYear()} ZenOS. All rights reserved.
        </p>
      </footer>
    </main>
  )
}
