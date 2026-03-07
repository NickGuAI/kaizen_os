// AppLayout - Shared layout wrapper with sidebar for all pages
import { useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemes, useGlobalVetoes, useActiveActions, useUpdateCard, useDeleteCard } from '../../hooks/useCards'
import { useActiveSeason } from '../../hooks/useSeasons'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { VetoEditModal } from '../VetoEditModal'
import { AgentChat } from '../AgentChat'
import type { Card } from '../../lib/api'
import './Layout.css'

interface AppLayoutProps {
  children: ReactNode
  onThemeClick?: (themeId: string) => void
}

export function AppLayout({ children, onThemeClick }: AppLayoutProps) {
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [editingVeto, setEditingVeto] = useState<Card | null>(null)

  const { data: themes } = useThemes()
  const { data: activeSeason } = useActiveSeason()
  const { data: globalVetoes } = useGlobalVetoes()
  const { data: actions = [] } = useActiveActions()

  const updateCardMutation = useUpdateCard()
  const deleteCardMutation = useDeleteCard()

  const handleUpdateVeto = async (updates: { title: string; description?: string }) => {
    if (!editingVeto) return
    await updateCardMutation.mutateAsync({ id: editingVeto.id, data: updates })
    setEditingVeto(null)
  }

  const handleDeleteVeto = async () => {
    if (!editingVeto) return
    await deleteCardMutation.mutateAsync({ id: editingVeto.id })
    setEditingVeto(null)
  }

  return (
    <div className="kaizen-layout">
      <Sidebar
        season={activeSeason || null}
        vetoes={globalVetoes || []}
        themes={themes?.map(t => ({
          id: t.id,
          title: t.title,
          actions: actions.filter(a => a.parentId === t.id),
        })) || []}
        themeCount={themes?.length || 0}
        actionCount={actions?.length || 0}
        onEditVeto={setEditingVeto}
        onAddVeto={() => navigate('/create?type=VETO')}
        onThemeClick={onThemeClick}
        onMidSeasonGrade={() => {
          if (activeSeason) {
            navigate(`/seasons/${activeSeason.id}/grading?type=mid_season`)
          }
        }}
        onEndSeasonGrade={() => {
          if (activeSeason) {
            navigate(`/seasons/${activeSeason.id}/grading?type=end_season`)
          }
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="kaizen-main">
        <MobileNav />
        {children}
      </main>

      <AgentChat
        style={{
          position: 'fixed',
          bottom: '1.25rem',
          left: '1.25rem',
          right: 'auto',
          zIndex: 50,
        }}
      />

      {editingVeto && (
        <VetoEditModal
          veto={editingVeto}
          onSave={handleUpdateVeto}
          onDelete={handleDeleteVeto}
          onClose={() => setEditingVeto(null)}
        />
      )}
    </div>
  )
}
