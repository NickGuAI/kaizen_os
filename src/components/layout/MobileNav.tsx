// MobileNav component - Top header bar for mobile
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './Layout.css'

const MENU_ITEMS = [
  { label: 'Home', path: '/planner' },
  { label: 'Chat', path: '/' },
  { label: 'Themes', path: '/where-am-i' },
  { label: 'Seasons', path: '/seasons' },
  { label: 'Review', path: '/review' },
  { label: 'Settings', path: '/settings' },
]

export function MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const handleMenuItemClick = (path: string) => {
    navigate(path)
    setMenuOpen(false)
  }

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname.startsWith('/chat/')
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  return (
    <header className="mobile-nav" ref={menuRef}>
      <div className="mobile-nav-header">
        <span className="mobile-nav-icon">K</span>
        <span className="mobile-nav-text">Kaizen OS</span>
        <button
          className="mobile-nav-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? '\u00D7' : '\u2630'}
        </button>
      </div>
      {menuOpen && (
        <div className="mobile-nav-menu">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.path}
              className={`mobile-nav-item ${isActivePath(item.path) ? 'active' : ''}`}
              onClick={() => handleMenuItemClick(item.path)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}
