import { getAccessToken } from './authToken'
import type { UserSettings as SharedUserSettings } from '../services/userSettingsTypes'

const API_BASE = '/api'

interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    
    const headers = new Headers(options.headers || {})
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    const token = getAccessToken()
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    })

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: { code: 'UNKNOWN', message: 'An error occurred' },
      }))
      throw new Error(error.error.message)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  // Cards (v4 API)
  async getThemes() {
    return this.request<CardWithActionCount[]>('/cards')
  }

  async getCard(id: string) {
    return this.request<CardWithChildren>(`/cards/${id}`)
  }

  async getCardChildren(id: string, type?: string, status?: string) {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (status) params.set('status', status)
    const query = params.toString()
    return this.request<Card[]>(`/cards/${id}/children${query ? `?${query}` : ''}`)
  }

  async getCardHierarchy(id: string) {
    return this.request<Card[]>(`/cards/${id}/hierarchy`)
  }

  async getCardsByType(type: string) {
    return this.request<Card[]>(`/cards?type=${type}`)
  }

  async getReviewOptions() {
    return this.request<Card[]>('/cards/review-options')
  }

  async getActiveActions() {
    return this.request<Card[]>('/cards/active-actions')
  }

  async getGlobalVetoes() {
    return this.request<Card[]>('/cards/vetoes')
  }

  async getBacklog(themeId: string) {
    return this.request<Card[]>(`/cards/themes/${themeId}/backlog`)
  }

  async getOpsReview(weekStart: string) {
    return this.request<OpsReviewCard[]>(`/cards/ops-review?weekStart=${weekStart}`)
  }

  async getBacklogReview() {
    return this.request<BacklogReviewResponse>('/cards/backlog-review')
  }


  async createCard(data: CreateCardInput) {
    return this.request<Card>('/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCard(id: string, data: UpdateCardInput) {
    return this.request<Card>(`/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteCard(id: string, cascade = false) {
    const query = cascade ? '?cascade=true' : ''
    return this.request<void>(`/cards/${id}${query}`, {
      method: 'DELETE',
    })
  }

  async getCardChildCount(id: string) {
    return this.request<{ id: string; count: number }>(`/cards/${id}/child-count`)
  }

  // Seasons
  async getSeasons() {
    return this.request<Season[]>('/seasons')
  }

  async getActiveSeason() {
    return this.request<Season | null>('/seasons/active')
  }

  async getActiveSeasonVetoes() {
    return this.request<SeasonVeto[]>('/seasons/active/vetoes')
  }

  async getSeason(id: string) {
    return this.request<Season>(`/seasons/${id}`)
  }

  async createSeason(data: CreateSeasonInput) {
    return this.request<Season>('/seasons', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async activateSeason(id: string) {
    return this.request<Season>(`/seasons/${id}/activate`, {
      method: 'PUT',
    })
  }

  async deactivateSeason(id: string) {
    return this.request<Season>(`/seasons/${id}/deactivate`, {
      method: 'PUT',
    })
  }

  async updateSeason(id: string, data: Partial<CreateSeasonInput>) {
    return this.request<Season>(`/seasons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async getSeasonGradings(seasonId: string) {
    return this.request<SeasonGradingsResponse>(`/seasons/${seasonId}/gradings`)
  }


  // Events
  async logEvent(data: LogEventInput) {
    return this.request<Event>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getEvents(params?: { cardId?: string; type?: string; limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.cardId) searchParams.set('cardId', String(params.cardId))
    if (params?.type) searchParams.set('type', params.type)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    
    const query = searchParams.toString()
    return this.request<Event[]>(`/events${query ? `?${query}` : ''}`)
  }

  // Condition Scores
  async getAllConditions() {
    return this.request<Record<string, { conditionScore: number; lastActivity: string | null }>>('/events/conditions')
  }

  async getThemeCondition(themeId: string) {
    return this.request<{ themeId: string; conditionScore: number; lastActivity: string | null }>(`/events/conditions/${themeId}`)
  }

  // Theme Hours (Property 6: Time Aggregation)
  async getAllThemeHours(seasonId?: string) {
    const query = seasonId ? `?seasonId=${seasonId}` : ''
    return this.request<Record<string, number>>(`/events/theme-hours${query}`)
  }

  async getThemeHours(themeId: string, seasonId?: string) {
    const query = seasonId ? `?seasonId=${seasonId}` : ''
    return this.request<{ themeId: string; actualHours: number }>(`/events/theme-hours/${themeId}${query}`)
  }

  // Time Logging (v4)
  async logTime(cardId: string, minutes: number, date?: string) {
    return this.request<Event>('/events/time', {
      method: 'POST',
      body: JSON.stringify({ cardId, minutes, date }),
    })
  }

  // Season Grading (v4) - grades all criteria for an action at once
  async gradeSeasonCriteria(cardId: string, gradingType: 'mid_season' | 'end_season', results: { criterion: string; passed: boolean }[], notes?: string) {
    return this.request<Event>('/events/criteria-grade', {
      method: 'POST',
      body: JSON.stringify({ cardId, gradingType, results, notes }),
    })
  }

  // Batch Season Grading - submit all gradings atomically with optional completion
  async submitSeasonGrading(
    seasonId: string,
    gradingType: 'mid_season' | 'end_season',
    gradings: Array<{
      cardId: string
      results: { criterion: string; passed: boolean }[]
      notes?: string
      markComplete: boolean
    }>
  ) {
    return this.request<{ success: boolean; gradedCount: number; completedCount: number }>(`/seasons/${seasonId}/grading/submit`, {
      method: 'POST',
      body: JSON.stringify({ gradingType, gradings }),
    })
  }

  // Veto Management (v4)
  async logVetoViolation(vetoId: string, reason?: string) {
    return this.request<Event>('/events/veto-violated', {
      method: 'POST',
      body: JSON.stringify({ vetoId, reason }),
    })
  }

  // Legacy guardrail methods
  async tripGuardrail(guardrailId: string, reason?: string) {
    return this.logVetoViolation(guardrailId, reason)
  }

  async restoreGuardrail(guardrailId: string) {
    // In v4, vetoes don't have a restore concept - they're just tracked
    return this.request<Event>('/events', {
      method: 'POST',
      body: JSON.stringify({ eventType: 'veto_added', cardId: guardrailId }),
    })
  }

  // Action Lifecycle (v4)
  async logActionStarted(cardId: string, actionType: 'gate' | 'experiment' | 'routine' | 'ops') {
    return this.request<Event>(`/events/${actionType}-started`, {
      method: 'POST',
      body: JSON.stringify({ cardId }),
    })
  }

  async logActionCompleted(cardId: string, actionType: 'gate' | 'experiment' | 'ops') {
    return this.request<Event>(`/events/${actionType}-completed`, {
      method: 'POST',
      body: JSON.stringify({ cardId }),
    })
  }

  // Theme Allocations
  async getSeasonAllocations(seasonId: string) {
    return this.request<ThemeAllocation[]>(`/allocations/season/${seasonId}`)
  }

  async getThemeAllocation(seasonId: string, themeId: string) {
    return this.request<ThemeAllocation>(`/allocations/season/${seasonId}/theme/${themeId}`)
  }

  async setThemeAllocation(seasonId: string, themeId: string, allocation: number) {
    return this.request<ThemeAllocation>(`/allocations/season/${seasonId}/theme/${themeId}`, {
      method: 'PUT',
      body: JSON.stringify({ allocation }),
    })
  }

  // Users & Settings
  async getUserSettings() {
    return this.request<UserSettings>('/users/settings')
  }

  async updateUserSettings(settings: Partial<UserSettings>) {
    return this.request<UserSettings>('/users/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  }

  // API Keys
  async listApiKeys() {
    return this.request<{ keys: ApiKeyRecord[] }>('/keys')
  }

  async createApiKey(data: CreateApiKeyRequest) {
    return this.request<ApiKeyCreateResponse>('/keys', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async revokeApiKey(id: string) {
    return this.request<void>(`/keys/${id}`, {
      method: 'DELETE',
    })
  }

  // Billing & Subscription
  async getSubscription() {
    return this.request<SubscriptionData>('/billing/subscription')
  }

  async createCheckoutSession() {
    return this.request<{ url: string }>('/billing/create-checkout-session', {
      method: 'POST',
    })
  }

  async createPortalSession() {
    return this.request<{ url: string }>('/billing/create-portal-session', {
      method: 'POST',
    })
  }

  // Usage
  async getUsageSummary() {
    return this.request<{
      totalCostUsd: string
      sessionCount: number
      totalInputTokens: number
      totalOutputTokens: number
    }>('/usage/summary')
  }

  async getUsageBalance() {
    return this.request<{ balanceUsd: string }>('/usage/balance')
  }
}


// Types (v4)
export type UnitType = 'THEME' | 'ACTION_GATE' | 'ACTION_EXPERIMENT' | 'ACTION_ROUTINE' | 'ACTION_OPS' | 'VETO'
export type TaskStatus = 'in_progress' | 'not_started' | 'completed' | 'backlog'

export type UserSettings = SharedUserSettings

export interface Card {
  id: string
  userId: string
  parentId: string | null
  title: string
  description: string | null
  targetDate: string | null
  completionDate: string | null
  startDate: string | null
  status: TaskStatus
  unitType: UnitType
  seasonId: string | null
  lagWeeks: number | null
  criteria: string[]
  tags: Record<string, string> // Arbitrary key-value pairs for custom metadata
  createdAt: string
  updatedAt: string
}

export interface CardWithActionCount extends Card {
  actionCount: number
}

export interface CardWithChildren extends Card {
  children: Card[]
}

export interface WipTypeStatus {
  active: number
  max: number
  canAdd: boolean
}

export interface Season {
  id: string
  userId: string
  name: string
  startDate: string
  durationWeeks: number
  endDate: string
  utilityRate: number
  totalHours: number
  themeAllocations: Record<string, number> // { [themeId]: allocation (0-1) }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SeasonVeto {
  id: string
  title: string
  description: string | null
  seasonId: string | null
}

export interface SeasonGrading {
  id: string
  cardId: string
  cardTitle: string
  effortId: string
  gradingType: 'mid_season' | 'end_season'
  results: Array<{ criterion: string; passed: boolean }>
  overallPassed: boolean
  notes: string | null
  occurredAt: string
}

export interface SeasonGradingEffort {
  id: string
  gradingType: 'mid_season' | 'end_season'
  occurredAt: string
  gradings: SeasonGrading[]
  summary: {
    totalGradings: number
    passedCount: number
    failedCount: number
  }
}

export interface SeasonGradingsResponse {
  gradings: SeasonGrading[]
  efforts: SeasonGradingEffort[]
  summary: {
    totalGradings: number
    totalEfforts: number
    midSeasonCount: number
    endSeasonCount: number
    midSeasonEffortCount: number
    endSeasonEffortCount: number
    passedCount: number
    failedCount: number
  }
}

export interface Event {
  id: string
  userId: string
  eventType: string
  cardId: string | null
  payload: Record<string, unknown>
  occurredAt: string
  idempotencyKey: string | null
}

export interface CreateCardInput {
  title: string
  description?: string
  unitType: string
  status?: string
  parentId?: string
  seasonId?: string
  targetDate?: string
  startDate?: string
  lagWeeks?: number
  criteria?: string[]
}

export interface UpdateCardInput {
  title?: string
  description?: string
  status?: string
  targetDate?: string | null
  startDate?: string | null
  completionDate?: string | null
  seasonId?: string | null
  lagWeeks?: number | null
  criteria?: string[]
  tags?: Record<string, string>
}

export interface CreateSeasonInput {
  name: string
  startDate: string
  durationWeeks: number
  utilityRate?: number
  themeAllocations?: Record<string, number>
}

export interface LogEventInput {
  eventType: string
  cardId?: string
  payload?: Record<string, unknown>
  idempotencyKey?: string
}

export interface ThemeAllocation {
  id?: string
  userId?: string
  seasonId: string
  themeId: string
  allocation: number
  createdAt?: string
  updatedAt?: string
}

export interface SubscriptionData {
  tier: string
  status: string
  periodEnd: string | null
  hasPaymentMethod: boolean
}

export interface ApiKeyRecord {
  id: string
  name: string
  keyPrefix: string
  scopes: Array<'read' | 'write' | 'delete'>
  allowedServers: Array<'kaizen-db' | 'workitems' | 'calendar'>
  lastUsedAt: string | null
  expiresAt: string | null
  requestCount: number
  rateLimit: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateApiKeyRequest {
  name: string
  scopes?: Array<'read' | 'write' | 'delete'>
  allowedServers?: Array<'kaizen-db' | 'workitems' | 'calendar'>
  expiresAt?: string
  rateLimit?: number
}

export interface ApiKeyCreateResponse {
  id: string
  name: string
  key: string
  keyPrefix: string
  scopes: Array<'read' | 'write' | 'delete'>
  allowedServers: Array<'kaizen-db' | 'workitems' | 'calendar'>
  expiresAt: string | null
  createdAt: string
  rateLimit: number
}

export interface OpsReviewCard extends Card {
  parentTheme: { id: string; title: string } | null
  overdue: boolean
}

export interface BacklogReviewCard extends Card {
  parentTheme: { id: string; title: string } | null
}

export interface BacklogReviewResponse {
  backlog: BacklogReviewCard[]
  wipInfo: Record<string, Record<string, { active: number; limit: number }>>
}

export const api = new ApiClient()

// Agent Session Types
export interface AgentSession {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
  messages: { content: string }[]
}

export interface AgentSessionWithMessages {
  id: string
  title: string | null
  claudeSession: string
  messages: AgentMessage[]
}

export interface AgentMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}
