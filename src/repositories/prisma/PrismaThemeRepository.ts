import { PrismaClient } from '@prisma/client';
import { Theme, ThemeWithStats, ThemeWithChildren, EntityId } from '../../domain/entities';
import { ThemeRepository, CreateThemeInput, UpdateThemeInput } from '../../domain/repositories';
import { toTheme, toAction, ACTION_UNIT_TYPES } from './mappers';

export class PrismaThemeRepository implements ThemeRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(userId: EntityId): Promise<Theme[]> {
    const cards = await this.prisma.card.findMany({
      where: { userId, unitType: 'THEME' },
      orderBy: { createdAt: 'desc' },
    });
    return cards.map(toTheme);
  }

  async findByIds(userId: EntityId, ids: EntityId[]): Promise<Theme[]> {
    if (ids.length === 0) return [];
    const cards = await this.prisma.card.findMany({
      where: { userId, unitType: 'THEME', id: { in: ids } },
      orderBy: { createdAt: 'desc' },
    });
    return cards.map(toTheme);
  }

  async findAllWithStats(userId: EntityId): Promise<ThemeWithStats[]> {
    const themes = await this.prisma.card.findMany({
      where: { userId, unitType: 'THEME' },
      orderBy: { createdAt: 'desc' },
    });

    // Get action counts for all themes in one query
    const actionCounts = await this.prisma.card.groupBy({
      by: ['parentId'],
      where: {
        userId,
        unitType: { in: ACTION_UNIT_TYPES },
        status: 'in_progress',
        parentId: { in: themes.map(t => t.id) },
      },
      _count: { id: true },
    });

    const countMap = new Map(actionCounts.map(c => [c.parentId, c._count.id]));

    return themes.map(card => ({
      ...toTheme(card),
      activeActionCount: countMap.get(card.id) || 0,
    }));
  }

  async findById(userId: EntityId, id: EntityId): Promise<Theme | null> {
    const card = await this.prisma.card.findFirst({
      where: { id, userId, unitType: 'THEME' },
    });
    return card ? toTheme(card) : null;
  }

  async findByIdWithChildren(userId: EntityId, id: EntityId): Promise<ThemeWithChildren | null> {
    const card = await this.prisma.card.findFirst({
      where: { id, userId, unitType: 'THEME' },
      include: {
        children: {
          where: { unitType: { in: ACTION_UNIT_TYPES } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!card) return null;
    return {
      ...toTheme(card),
      children: card.children.map(toAction),
    };
  }

  async create(userId: EntityId, input: CreateThemeInput): Promise<Theme> {
    if (!input.title?.trim()) {
      throw new Error('Title is required');
    }
    const card = await this.prisma.card.create({
      data: {
        userId,
        title: input.title.trim(),
        description: input.description,
        unitType: 'THEME',
        status: 'not_started',
      },
    });
    return toTheme(card);
  }

  async update(userId: EntityId, id: EntityId, input: UpdateThemeInput): Promise<Theme> {
    const existing = await this.findById(userId, id);
    if (!existing) {
      throw new Error('Theme not found');
    }
    if (input.title !== undefined && !input.title?.trim()) {
      throw new Error('Title cannot be empty');
    }
    const card = await this.prisma.card.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title.trim() }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });
    return toTheme(card);
  }

  async delete(userId: EntityId, id: EntityId, cascade = false): Promise<void> {
    const existing = await this.findById(userId, id);
    if (!existing) {
      throw new Error('Theme not found');
    }
    const children = await this.prisma.card.count({
      where: { parentId: id, userId },
    });
    if (children > 0 && !cascade) {
      throw new Error('Cannot delete theme with children');
    }
    if (cascade && children > 0) {
      // Get all action IDs under this theme
      const actions = await this.prisma.card.findMany({
        where: { parentId: id, userId },
        select: { id: true },
      });
      const actionIds = actions.map(a => a.id);
      
      // Delete all tasks under those actions
      if (actionIds.length > 0) {
        await this.prisma.card.deleteMany({
          where: { parentId: { in: actionIds }, userId },
        });
      }
      // Delete all actions
      await this.prisma.card.deleteMany({
        where: { parentId: id, userId },
      });
    }
    await this.prisma.card.delete({ where: { id } });
  }

  async getChildCount(userId: EntityId, id: EntityId): Promise<number> {
    return this.prisma.card.count({
      where: { parentId: id, userId },
    });
  }

  async getHierarchy(userId: EntityId, id: EntityId): Promise<Theme[]> {
    const theme = await this.findById(userId, id);
    return theme ? [theme] : [];
  }
}
