// MobileNav component - Top header bar for mobile
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './Layout.css'

const MENU_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Review', path: '/review' },
  { label: 'Settings', path: '/settings' },
]

export function MobileNav() {
  const navigate = useNavigate()
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

  const handleMenuItemClick = (path: string) => {
    navigate(path)
    setMenuOpen(false)
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
              className="mobile-nav-item"
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
