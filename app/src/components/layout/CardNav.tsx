// CardNav - Sumi-e styled collapsible card navigation
// Collapsed bar with logo + hamburger; expands to reveal nav cards on click
import { useLayoutEffect, useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import { useThemes } from '../../hooks/useCards'
import { useActiveSeason } from '../../hooks/useSeasons'
import './CardNav.css'

interface CardNavLink {
  label: string
  path: string
}

interface CardNavItem {
  label: string
  bgColor: string
  textColor: string
  links: CardNavLink[]
}

interface CardNavProps {
  variant?: 'light' | 'dark'
  className?: string
}

const ArrowIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
)

function useNavItems(): CardNavItem[] {
  const { data: themes } = useThemes()
  const { data: activeSeason } = useActiveSeason()

  return useMemo(() => {
    const themeLinks: CardNavLink[] =
      themes && themes.length > 0
        ? themes.slice(0, 4).map((t) => ({ label: t.title, path: `/theme/${t.id}` }))
        : [{ label: 'Themes overview', path: '/where-am-i' }]

    const seasonLinks: CardNavLink[] = [{ label: 'All seasons', path: '/seasons' }]
    if (activeSeason) {
      seasonLinks.unshift({ label: activeSeason.name, path: `/seasons/${activeSeason.id}` })
    }

    return [
      {
        label: 'Home',
        bgColor: '#2A2A28',
        textColor: '#F5F1EB',
        links: [
          { label: 'Planner', path: '/planner' },
          { label: 'Chat', path: '/chat' },
          { label: 'Review', path: '/review' },
        ],
      },
      {
        label: 'Themes',
        bgColor: '#4A5540',
        textColor: '#F5F1EB',
        links: themeLinks,
      },
      {
        label: 'Seasons',
        bgColor: '#5C5040',
        textColor: '#F5F1EB',
        links: seasonLinks,
      },
      {
        label: 'Settings',
        bgColor: '#3D4450',
        textColor: '#F5F1EB',
        links: [
          { label: 'Preferences', path: '/settings' },
          { label: 'Rules', path: '/settings/rules' },
        ],
      },
    ]
  }, [themes, activeSeason])
}

export function CardNav({ variant = 'light', className = '' }: CardNavProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const navRef = useRef<HTMLDivElement | null>(null)
  const cardsRef = useRef<HTMLDivElement[]>([])
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const items = useNavItems()

  const BAR_HEIGHT = 56

  const calculateHeight = useCallback(() => {
    const navEl = navRef.current
    if (!navEl) return 260

    const isMobile = window.matchMedia('(max-width: 768px)').matches
    if (isMobile) {
      const contentEl = navEl.querySelector('.cardnav-content') as HTMLElement
      if (contentEl) {
        const prevVis = contentEl.style.visibility
        const prevPE = contentEl.style.pointerEvents
        const prevPos = contentEl.style.position
        const prevH = contentEl.style.height
        contentEl.style.visibility = 'visible'
        contentEl.style.pointerEvents = 'auto'
        contentEl.style.position = 'static'
        contentEl.style.height = 'auto'
        contentEl.offsetHeight // force reflow
        const h = BAR_HEIGHT + contentEl.scrollHeight + 16
        contentEl.style.visibility = prevVis
        contentEl.style.pointerEvents = prevPE
        contentEl.style.position = prevPos
        contentEl.style.height = prevH
        return h
      }
    }
    return 260
  }, [])

  const createTimeline = useCallback(() => {
    const navEl = navRef.current
    if (!navEl) return null
    gsap.set(navEl, { height: BAR_HEIGHT, overflow: 'hidden' })
    gsap.set(cardsRef.current, { y: 40, opacity: 0 })
    const tl = gsap.timeline({ paused: true })
    tl.to(navEl, { height: calculateHeight, duration: 0.35, ease: 'power3.out' })
    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out', stagger: 0.06 }, '-=0.1')
    return tl
  }, [calculateHeight, items])

  useLayoutEffect(() => {
    const tl = createTimeline()
    tlRef.current = tl
    return () => {
      tl?.kill()
      tlRef.current = null
    }
  }, [createTimeline])

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return
      if (isExpanded) {
        const h = calculateHeight()
        gsap.set(navRef.current, { height: h })
        tlRef.current.kill()
        const newTl = createTimeline()
        if (newTl) {
          newTl.progress(1)
          tlRef.current = newTl
        }
      } else {
        tlRef.current.kill()
        const newTl = createTimeline()
        if (newTl) tlRef.current = newTl
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isExpanded, calculateHeight, createTimeline])

  // Close on route change
  useEffect(() => {
    if (isExpanded) {
      const tl = tlRef.current
      if (tl) {
        setIsOpen(false)
        tl.eventCallback('onReverseComplete', () => setIsExpanded(false))
        tl.reverse()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const toggleMenu = () => {
    const tl = tlRef.current
    if (!tl) return
    if (!isExpanded) {
      setIsOpen(true)
      setIsExpanded(true)
      tl.play(0)
    } else {
      setIsOpen(false)
      tl.eventCallback('onReverseComplete', () => setIsExpanded(false))
      tl.reverse()
    }
  }

  const handleNav = (path: string) => {
    navigate(path)
  }

  const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) cardsRef.current[i] = el
  }

  const isDark = variant === 'dark'

  return (
    <div className={`cardnav-wrap ${isDark ? 'cardnav--dark' : 'cardnav--light'} ${className}`}>
      <nav
        ref={navRef}
        className={`cardnav ${isExpanded ? 'cardnav--open' : ''}`}
        aria-label="Main navigation"
      >
        {/* Top bar */}
        <div className="cardnav-bar">
          <div
            className={`cardnav-hamburger ${isOpen ? 'cardnav-hamburger--open' : ''}`}
            onClick={toggleMenu}
            role="button"
            aria-label={isExpanded ? 'Close menu' : 'Open menu'}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggleMenu()}
          >
            <span className="cardnav-hamburger-line" />
            <span className="cardnav-hamburger-line" />
          </div>

          <div className="cardnav-logo" onClick={() => navigate('/planner')} role="button" tabIndex={0}>
            <span className="cardnav-logo-mark">K</span>
            <span className="cardnav-logo-text">Kaizen OS</span>
          </div>
        </div>

        {/* Card grid */}
        <div
          className={`cardnav-content ${isExpanded ? 'cardnav-content--visible' : ''}`}
          aria-hidden={!isExpanded}
        >
          {items.map((item, idx) => (
            <div
              key={item.label}
              className="cardnav-card"
              ref={setCardRef(idx)}
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <div className="cardnav-card-label">{item.label}</div>
              <div className="cardnav-card-links">
                {item.links.map((lnk) => (
                  <button
                    key={lnk.path}
                    className="cardnav-card-link"
                    onClick={() => handleNav(lnk.path)}
                    style={{ color: item.textColor }}
                  >
                    <ArrowIcon />
                    {lnk.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}
