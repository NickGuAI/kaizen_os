/**
 * Data Provider Types
 * Abstraction layer for database access supporting local PostgreSQL and Supabase.
 */

// Re-export domain types for convenience
export type { EntityId } from '../../domain/entities'
export type {
  Theme,
  ThemeWithStats,
  ThemeWithChildren,
  Action,
  ActionWithChildren,
  Veto,
  CalendarAccount,
  CalendarEventAnnotation,
  EventClassificationRule,
  RoutineCalendarLink,
  Status,
} from '../../domain/entities'

export type {
  CreateThemeInput,
  UpdateThemeInput,
  CreateActionInput,
  UpdateActionInput,
  CreateVetoInput,
  UpdateVetoInput,
  CreateCalendarAccountInput,
  UpdateCalendarAccountInput,
  CreateEventAnnotationInput,
  UpdateEventAnnotationInput,
  CreateClassificationRuleInput,
  UpdateClassificationRuleInput,
  CreateRoutineLinkInput,
} from '../../domain/repositories'

/**
 * Auth context for authenticated operations.
 * userId is string to support UUID (post-migration).
 */
export interface AuthContext {
  userId: string
  email: string
  /** JWT access token for Supabase RLS (required for SupabaseProvider) */
  accessToken?: string
}

/**
 * User entity (simplified for data provider layer)
 */
export interface User {
  id: string
  email: string
  name: string | null
  timezone: string | null
  settings: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface UpdateUserInput {
  name?: string | null
  timezone?: string | null
  settings?: Record<string, unknown>
}

/**
 * Season entity
 */
export interface Season {
  id: string
  userId: string
  name: string
  startDate: Date
  durationWeeks: number
  utilityRate: number
  themeAllocations: Record<string, number>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateSeasonInput {
  name: string
  startDate: Date
  durationWeeks: number
  utilityRate?: number
  themeAllocations?: Record<string, number>
  isActive?: boolean
}

export interface UpdateSeasonInput {
  name?: string
  startDate?: Date
  durationWeeks?: number
  utilityRate?: number
  themeAllocations?: Record<string, number>
  isActive?: boolean
}

/**
 * Event entity (for event sourcing)
 */
export interface KaizenEvent {
  id: string
  userId: string
  eventType: string
  cardId: string | null
  payload: Record<string, unknown>
  occurredAt: Date
  idempotencyKey: string | null
}

export interface CreateEventInput {
  eventType: string
  cardId?: string
  payload?: Record<string, unknown>
  occurredAt?: Date
  idempotencyKey?: string
}

/**
 * Data Provider Configuration
 */
export interface DataProviderConfig {
  type: 'local' | 'supabase'
  connectionString?: string
  supabaseUrl?: string
  supabaseAnonKey?: string
  supabaseServiceKey?: string
}

/**
 * Data Provider Interface
 *
 * Provides database access with automatic user scoping.
 * - LocalPostgresProvider: Manual user_id filtering in queries
 * - SupabaseProvider: RLS handles filtering via JWT
 */
export interface DataProvider {
  /**
   * Create a new provider instance scoped to the authenticated user.
   * Local: Sets auth context for manual filtering
   * Supabase: Auth is handled via JWT in client headers
   */
  withAuth(ctx: AuthContext): DataProvider

  // =========================================================================
  // Users
  // =========================================================================
  getUser(): Promise<User | null>
  updateUser(data: UpdateUserInput): Promise<User>

  // =========================================================================
  // Seasons
  // =========================================================================
  getSeasons(): Promise<Season[]>
  getActiveSeason(): Promise<Season | null>
  getSeason(id: string): Promise<Season | null>
  createSeason(data: CreateSeasonInput): Promise<Season>
  updateSeason(id: string, data: UpdateSeasonInput): Promise<Season>
  deleteSeason(id: string): Promise<void>

  // =========================================================================
  // Events (Event Sourcing)
  // =========================================================================
  getEvents(options?: { eventType?: string; cardId?: string; limit?: number }): Promise<KaizenEvent[]>
  createEvent(data: CreateEventInput): Promise<KaizenEvent>

  // =========================================================================
  // Access to underlying repositories for complex operations
  // These are provider-specific and expose the full repository interfaces
  // =========================================================================

  /**
   * Get the underlying raw client for complex operations.
   * - Local: Returns PrismaClient
   * - Supabase: Returns SupabaseClient
   */
  getRawClient(): unknown
}
