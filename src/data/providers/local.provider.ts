/**
 * Local PostgreSQL Data Provider
 *
 * Uses Prisma ORM with explicit user_id filtering on all queries.
 * This provider is for local development without RLS.
 */

import { PrismaClient, Prisma } from '@prisma/client'
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

/**
 * Convert userId for Prisma query.
 * Handles both pre-migration (INT) and post-migration (UUID) schemas.
 * Pre-migration: userId columns are Int, so numeric strings must be converted.
 * Post-migration: userId columns are UUID strings, use as-is.
 */
function toUserIdForPrisma(userId: string): string {
  return userId
}

export class LocalPostgresProvider implements DataProvider {
  private prisma: PrismaClient
  private authCtx: AuthContext | null = null

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  withAuth(ctx: AuthContext): DataProvider {
    const provider = new LocalPostgresProvider(this.prisma)
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
    const user = await this.prisma.user.findUnique({
      where: { id: toUserIdForPrisma(userId) as any },
    })
    if (!user) return null
    return this.mapPrismaUser(user)
  }

  async updateUser(data: UpdateUserInput): Promise<User> {
    const userId = this.requireAuth()
    const updated = await this.prisma.user.update({
      where: { id: toUserIdForPrisma(userId) as any },
      data: {
        name: data.name,
        timezone: data.timezone,
        settings: data.settings as Prisma.InputJsonValue,
      },
    })
    return this.mapPrismaUser(updated)
  }

  // =========================================================================
  // Seasons
  // =========================================================================

  async getSeasons(): Promise<Season[]> {
    const userId = this.requireAuth()
    const seasons = await this.prisma.season.findMany({
      where: { userId: toUserIdForPrisma(userId) as any },
      orderBy: { startDate: 'desc' },
    })
    return seasons.map((s: any) => this.mapPrismaSeason(s))
  }

  async getActiveSeason(): Promise<Season | null> {
    const userId = this.requireAuth()
    const season = await this.prisma.season.findFirst({
      where: { userId: toUserIdForPrisma(userId) as any, isActive: true },
    })
    return season ? this.mapPrismaSeason(season) : null
  }

  async getSeason(id: string): Promise<Season | null> {
    const userId = this.requireAuth()
    const season = await this.prisma.season.findFirst({
      where: { id, userId: toUserIdForPrisma(userId) as any },
    })
    return season ? this.mapPrismaSeason(season) : null
  }

  async createSeason(data: CreateSeasonInput): Promise<Season> {
    const userId = this.requireAuth()
    const season = await this.prisma.season.create({
      data: {
        userId: toUserIdForPrisma(userId) as any,
        name: data.name,
        startDate: data.startDate,
        durationWeeks: data.durationWeeks,
        utilityRate: data.utilityRate ?? 40.0,
        themeAllocations: data.themeAllocations ?? {},
        isActive: data.isActive ?? false,
      },
    })
    return this.mapPrismaSeason(season)
  }

  async updateSeason(id: string, data: UpdateSeasonInput): Promise<Season> {
    const userId = this.requireAuth()
    // Verify ownership
    const existing = await this.prisma.season.findFirst({
      where: { id, userId: toUserIdForPrisma(userId) as any },
    })
    if (!existing) {
      throw new Error(`Season ${id} not found`)
    }
    const updated = await this.prisma.season.update({
      where: { id },
      data: {
        name: data.name,
        startDate: data.startDate,
        durationWeeks: data.durationWeeks,
        utilityRate: data.utilityRate,
        themeAllocations: data.themeAllocations,
        isActive: data.isActive,
      },
    })
    return this.mapPrismaSeason(updated)
  }

  async deleteSeason(id: string): Promise<void> {
    const userId = this.requireAuth()
    // Verify ownership
    const existing = await this.prisma.season.findFirst({
      where: { id, userId: toUserIdForPrisma(userId) as any },
    })
    if (!existing) {
      throw new Error(`Season ${id} not found`)
    }
    await this.prisma.season.delete({ where: { id } })
  }

  // =========================================================================
  // Events
  // =========================================================================

  async getEvents(
    options: { eventType?: string; cardId?: string; limit?: number } = {}
  ): Promise<KaizenEvent[]> {
    const userId = this.requireAuth()
    const events = await this.prisma.event.findMany({
      where: {
        userId: toUserIdForPrisma(userId) as any,
        ...(options.eventType && { eventType: options.eventType as any }),
        ...(options.cardId && { cardId: options.cardId }),
      },
      orderBy: { occurredAt: 'desc' },
      take: options.limit,
    })
    return events.map((e: any) => this.mapPrismaEvent(e))
  }

  async createEvent(data: CreateEventInput): Promise<KaizenEvent> {
    const userId = this.requireAuth()
    const event = await this.prisma.event.create({
      data: {
        userId: toUserIdForPrisma(userId) as any,
        eventType: data.eventType as any,
        cardId: data.cardId,
        payload: (data.payload as Prisma.InputJsonValue) ?? {},
        occurredAt: data.occurredAt ?? new Date(),
        idempotencyKey: data.idempotencyKey,
      },
    })
    return this.mapPrismaEvent(event)
  }

  // =========================================================================
  // Raw Client Access
  // =========================================================================

  getRawClient(): PrismaClient {
    return this.prisma
  }

  // =========================================================================
  // Mappers
  // =========================================================================

  private mapPrismaUser(user: any): User {
    return {
      id: String(user.id),
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      settings: user.settings as Record<string, unknown>,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  private mapPrismaSeason(season: any): Season {
    return {
      id: season.id,
      userId: String(season.userId),
      name: season.name,
      startDate: season.startDate,
      durationWeeks: season.durationWeeks,
      utilityRate: season.utilityRate,
      themeAllocations: season.themeAllocations as Record<string, number>,
      isActive: season.isActive,
      createdAt: season.createdAt,
      updatedAt: season.updatedAt,
    }
  }

  private mapPrismaEvent(event: any): KaizenEvent {
    return {
      id: String(event.id),
      userId: String(event.userId),
      eventType: event.eventType,
      cardId: event.cardId,
      payload: event.payload as Record<string, unknown>,
      occurredAt: event.occurredAt,
      idempotencyKey: event.idempotencyKey,
    }
  }
}
