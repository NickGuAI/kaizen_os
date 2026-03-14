// AppLayout - Shared shell with sumi-e CardNav (fixed overlay)
import { ReactNode } from 'react'
import { CardNav } from './CardNav'
import { AgentChat } from '../AgentChat'
import './Layout.css'

interface AppLayoutProps {
  children: ReactNode
  onThemeClick?: (themeId: string) => void
  showAgentChatWidget?: boolean
}

export function AppLayout({ children, showAgentChatWidget = true }: AppLayoutProps) {
  return (
    <div className="kaizen-layout">
      <CardNav variant="light" />

      <main className="kaizen-main">
        {children}
      </main>

      {showAgentChatWidget && (
        <AgentChat
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            left: '1.25rem',
            right: 'auto',
            zIndex: 50,
          }}
        />
      )}
    </div>
  )
}
