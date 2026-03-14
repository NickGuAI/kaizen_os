import { Card, TaskStatus, UnitType } from '@prisma/client'
import prisma from '../lib/db'
import { getUserSettings, type UserSettings } from './userSettingsTypes'

// Action types for filtering
const ACTION_TYPES: UnitType[] = ['ACTION_GATE', 'ACTION_EXPERIMENT', 'ACTION_ROUTINE', 'ACTION_OPS']

// Helper to check if a unit type is an action type
const isActionType = (unitType: UnitType): boolean => ACTION_TYPES.includes(unitType)

export interface CreateCardInput {
  userId: string
  parentId?: string
  title: string
  description?: string
  targetDate?: Date
  startDate?: Date
  status?: TaskStatus
  unitType: UnitType
  seasonId?: string
  lagWeeks?: number
  criteria?: string[]
}

export interface UpdateCardInput {
  title?: string
  description?: string
  targetDate?: Date | null
  completionDate?: Date | null
  startDate?: Date | null
  status?: TaskStatus
  seasonId?: string | null
  lagWeeks?: number | null
  criteria?: string[]
}

export class CardService {
  /**
   * Get user settings with defaults
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    })
    return getUserSettings(user?.settings)
  }

  /**
   * Get active count for a specific unit type under a theme
   */
  async getActiveCount(userId: string, themeId: string, unitType: UnitType): Promise<number> {
    return prisma.card.count({
      where: {
        userId,
        parentId: themeId,
        unitType,
        status: 'in_progress',
      },
    })
  }

  /**
   * Get the WIP limit for a unit type from settings
   */
  getLimit(settings: UserSettings, unitType: UnitType): number {
    switch (unitType) {
      case 'ACTION_GATE':
        return settings.maxGatesPerTheme
      case 'ACTION_EXPERIMENT':
        return settings.maxExperimentsPerTheme
      case 'ACTION_ROUTINE':
        return settings.maxRoutinesPerTheme
      case 'ACTION_OPS':
        return settings.maxOpsPerTheme
      default:
        return Infinity
    }
  }


  /**
   * Check if a new card can be created (WIP limit check)
   */
  async canCreate(userId: string, themeId: string, unitType: UnitType): Promise<boolean> {
    const settings = await this.getUserSettings(userId)
    const activeCount = await this.getActiveCount(userId, themeId, unitType)
    const limit = this.getLimit(settings, unitType)
    return activeCount < limit
  }

  /**
   * Get global vetoes (VETO cards without parentId)
   */
  async getGlobalVetoes(userId: string): Promise<Card[]> {
    return prisma.card.findMany({
      where: { userId, unitType: 'VETO', parentId: null },
      orderBy: { createdAt: 'asc' },
    })
  }

  /**
   * Create a new card
   */
  async create(data: CreateCardInput): Promise<Card> {
    // Validate title is not empty
    if (!data.title || data.title.trim() === '') {
      throw new Error('Title is required')
    }

    // Check WIP limits for action types
    if (isActionType(data.unitType) && data.parentId && data.status !== 'backlog') {
      const canCreate = await this.canCreate(data.userId, data.parentId, data.unitType)
      if (!canCreate) {
        throw new Error(`WIP limit reached for ${data.unitType}`)
      }
    }

    return prisma.card.create({
      data: {
        userId: data.userId,
        parentId: data.parentId,
        title: data.title.trim(),
        description: data.description,
        targetDate: data.targetDate,
        startDate: data.startDate,
        status: data.status || 'not_started',
        unitType: data.unitType,
        seasonId: data.seasonId,
        lagWeeks: data.lagWeeks,
        criteria: data.criteria || [],
      },
    })
  }


  /**
   * Get a card by ID
   */
  async getById(id: string, userId: string): Promise<Card | null> {
    return prisma.card.findFirst({
      where: {
        id,
        userId,
      },
    })
  }

  /**
   * Get a card with its children
   */
  async getByIdWithChildren(id: string, userId: string): Promise<Card & { children: Card[] } | null> {
    return prisma.card.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        children: true,
      },
    })
  }

  /**
   * Update a card
   */
  async update(id: string, userId: string, data: UpdateCardInput): Promise<Card> {
    // Validate title if provided
    if (data.title !== undefined && (!data.title || data.title.trim() === '')) {
      throw new Error('Title cannot be empty')
    }

    // Verify ownership
    const existing = await this.getById(id, userId)
    if (!existing) {
      throw new Error('Card not found')
    }

    // Check WIP limits when activating from backlog
    if (data.status === 'in_progress' && existing.status === 'backlog' && existing.parentId) {
      const canActivate = await this.canCreate(userId, existing.parentId, existing.unitType)
      if (!canActivate) {
        throw new Error(`WIP limit reached for ${existing.unitType}`)
      }
    }

    return prisma.card.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.targetDate !== undefined && { targetDate: data.targetDate }),
        ...(data.completionDate !== undefined && { completionDate: data.completionDate }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.seasonId !== undefined && { seasonId: data.seasonId }),
        ...(data.lagWeeks !== undefined && { lagWeeks: data.lagWeeks }),
        ...(data.criteria !== undefined && { criteria: data.criteria }),
      },
    })
  }

  /**
   * Delete a card
   */
  async delete(id: string, userId: string): Promise<void> {
    // Verify ownership
    const existing = await this.getById(id, userId)
    if (!existing) {
      throw new Error('Card not found')
    }

    // Check for children
    const children = await this.getChildren(id, userId)
    if (children.length > 0) {
      throw new Error('Cannot delete card with children')
    }

    await prisma.card.delete({
      where: { id },
    })
  }


  /**
   * Get all cards by type for a user
   */
  async getByType(userId: string, unitType: UnitType): Promise<Card[]> {
    return prisma.card.findMany({
      where: {
        userId,
        unitType,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * Get children of a card
   */
  async getChildren(parentId: string, userId: string): Promise<Card[]> {
    return prisma.card.findMany({
      where: {
        parentId,
        userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }

  /**
   * Get children of a card filtered by unit type
   */
  async getChildrenByType(parentId: string, userId: string, unitType: UnitType): Promise<Card[]> {
    return prisma.card.findMany({
      where: {
        parentId,
        userId,
        unitType,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }

  /**
   * Get children of a card filtered by status
   */
  async getChildrenByStatus(parentId: string, userId: string, status: TaskStatus): Promise<Card[]> {
    return prisma.card.findMany({
      where: {
        parentId,
        userId,
        status,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }

  /**
   * Get the hierarchy path from root to the given card
   */
  async getHierarchy(id: string, userId: string): Promise<Card[]> {
    const path: Card[] = []
    let current = await this.getById(id, userId)

    while (current) {
      path.unshift(current)
      if (current.parentId) {
        current = await this.getById(current.parentId, userId)
      } else {
        break
      }
    }

    return path
  }

  /**
   * Get all themes with action counts
   */
  async getThemesWithCounts(userId: string): Promise<(Card & { actionCount: number })[]> {
    const themes = await this.getByType(userId, 'THEME')
    
    const themesWithCounts = await Promise.all(
      themes.map(async (theme) => {
        const actionCount = await prisma.card.count({
          where: {
            parentId: theme.id,
            userId,
            unitType: { in: ACTION_TYPES },
            status: 'in_progress',
          },
        })
        return { ...theme, actionCount }
      })
    )

    return themesWithCounts
  }

  /**
   * Get active actions (ACTION_* types with status in_progress)
   */
  async getActiveActions(userId: string): Promise<Card[]> {
    return prisma.card.findMany({
      where: {
        userId,
        unitType: { in: ACTION_TYPES },
        status: 'in_progress',
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  /**
   * Get backlog items for a theme
   */
  async getBacklog(userId: string, themeId: string): Promise<Card[]> {
    return prisma.card.findMany({
      where: {
        userId,
        parentId: themeId,
        status: 'backlog',
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }
}

export const cardService = new CardService()

// Legacy export for backward compatibility
export const taskEntryService = cardService
