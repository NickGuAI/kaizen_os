/**
 * Supabase Data Provider
 *
 * Uses Supabase client with Row Level Security (RLS).
 * Auth context is passed via JWT in request headers - RLS handles filtering automatically.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  DataProvider,
  AuthContext,
  User,
  UpdateUserInput,
  Season,
  CreateSeasonInput,
  UpdateSeasonInput,
  KaizenEvent,
  CreateEventInput,
} from './types'

export class SupabaseProvider implements DataProvider {
  private client: SupabaseClient
  private authCtx: AuthContext | null = null
  private readonly supabaseUrl: string
  private readonly supabaseAnonKey: string

  constructor(url: string, anonKey: string, accessToken?: string) {
    this.supabaseUrl = url
    this.supabaseAnonKey = anonKey
    // Create client with optional access token for authenticated requests
    this.client = createClient(url, anonKey, {
      global: {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {},
      },
    })
  }

  withAuth(ctx: AuthContext): DataProvider {
    // Create a new provider instance with the user's access token
    // This ensures RLS policies can use auth.uid() for user isolation
    if (!ctx.accessToken) {
      throw new Error('accessToken is required in AuthContext for Supabase RLS')
    }
    const provider = new SupabaseProvider(
      this.supabaseUrl,
      this.supabaseAnonKey,
      ctx.accessToken
    )
    provider.authCtx = ctx
    return provider
  }

  private requireAuth(): string {
    if (!this.authCtx) {
      throw new Error('Auth context required. Call withAuth() first.')
    }
    return this.authCtx.userId
  }

  // =========================================================================
  // Users
  // =========================================================================

  async getUser(): Promise<User | null> {
    const userId = this.requireAuth()
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return this.mapUser(data)
  }

  async updateUser(input: UpdateUserInput): Promise<User> {
    const userId = this.requireAuth()
    const { data, error } = await this.client
      .from('users')
      .update({
        name: input.name,
        timezone: input.timezone,
        settings: input.settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return this.mapUser(data)
  }

  // =========================================================================
  // Seasons
  // =========================================================================

  async getSeasons(): Promise<Season[]> {
    // RLS filters by auth.uid() - no manual filtering needed
    const { data, error } = await this.client
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) throw error
    return (data ?? []).map((s) => this.mapSeason(s))
  }

  async getActiveSeason(): Promise<Season | null> {
    const { data, error } = await this.client
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return this.mapSeason(data)
  }

  async getSeason(id: string): Promise<Season | null> {
    const { data, error } = await this.client
      .from('seasons')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return this.mapSeason(data)
  }

  async createSeason(input: CreateSeasonInput): Promise<Season> {
    const userId = this.requireAuth()
    const { data, error } = await this.client
      .from('seasons')
      .insert({
        user_id: userId,
        name: input.name,
        start_date: input.startDate.toISOString(),
        duration_weeks: input.durationWeeks,
        utility_rate: input.utilityRate ?? 40.0,
        theme_allocations: input.themeAllocations ?? {},
        is_active: input.isActive ?? false,
      })
      .select()
      .single()

    if (error) throw error
    return this.mapSeason(data)
  }

  async updateSeason(id: string, input: UpdateSeasonInput): Promise<Season> {
    const { data, error } = await this.client
      .from('seasons')
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.startDate !== undefined && { start_date: input.startDate.toISOString() }),
        ...(input.durationWeeks !== undefined && { duration_weeks: input.durationWeeks }),
        ...(input.utilityRate !== undefined && { utility_rate: input.utilityRate }),
        ...(input.themeAllocations !== undefined && { theme_allocations: input.themeAllocations }),
        ...(input.isActive !== undefined && { is_active: input.isActive }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return this.mapSeason(data)
  }

  async deleteSeason(id: string): Promise<void> {
    const { error } = await this.client
      .from('seasons')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // =========================================================================
  // Events
  // =========================================================================

  async getEvents(
    options: { eventType?: string; cardId?: string; limit?: number } = {}
  ): Promise<KaizenEvent[]> {
    let query = this.client
      .from('events')
      .select('*')
      .order('occurred_at', { ascending: false })

    if (options.eventType) {
      query = query.eq('event_type', options.eventType)
    }
    if (options.cardId) {
      query = query.eq('card_id', options.cardId)
    }
    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map((e) => this.mapEvent(e))
  }

  async createEvent(input: CreateEventInput): Promise<KaizenEvent> {
    const userId = this.requireAuth()
    const { data, error } = await this.client
      .from('events')
      .insert({
        user_id: userId,
        event_type: input.eventType,
        card_id: input.cardId,
        payload: input.payload ?? {},
        occurred_at: (input.occurredAt ?? new Date()).toISOString(),
        idempotency_key: input.idempotencyKey,
      })
      .select()
      .single()

    if (error) throw error
    return this.mapEvent(data)
  }

  // =========================================================================
  // Raw Client Access
  // =========================================================================

  getRawClient(): SupabaseClient {
    return this.client
  }

  // =========================================================================
  // Mappers (snake_case -> camelCase)
  // =========================================================================

  private mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      timezone: row.timezone,
      settings: row.settings ?? {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapSeason(row: any): Season {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      startDate: new Date(row.start_date),
      durationWeeks: row.duration_weeks,
      utilityRate: row.utility_rate,
      themeAllocations: row.theme_allocations ?? {},
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapEvent(row: any): KaizenEvent {
    return {
      id: String(row.id),
      userId: row.user_id,
      eventType: row.event_type,
      cardId: row.card_id,
      payload: row.payload ?? {},
      occurredAt: new Date(row.occurred_at),
      idempotencyKey: row.idempotency_key,
    }
  }
}
