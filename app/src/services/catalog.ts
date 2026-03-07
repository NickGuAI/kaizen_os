/**
 * Service Catalog: Central access point for all repositories.
 * Provides singleton instances backed by Prisma.
 */
import type { PrismaClient } from '@prisma/client';
import prisma from '../lib/db';
import {
  ThemeRepository,
  ActionRepository,
  VetoRepository,
} from '../domain/repositories';
import {
  PrismaThemeRepository,
  PrismaActionRepository,
  PrismaVetoRepository,
} from '../repositories/prisma';

// Singleton repository instances
let _themes: ThemeRepository | null = null;
let _actions: ActionRepository | null = null;
let _vetoes: VetoRepository | null = null;

export const catalog = {
  get themes(): ThemeRepository {
    if (!_themes) _themes = new PrismaThemeRepository(prisma);
    return _themes;
  },

  get actions(): ActionRepository {
    if (!_actions) _actions = new PrismaActionRepository(prisma);
    return _actions;
  },

  get vetoes(): VetoRepository {
    if (!_vetoes) _vetoes = new PrismaVetoRepository(prisma);
    return _vetoes;
  },

  /** Access to raw Prisma client for complex queries or migrations */
  get prisma(): PrismaClient {
    return prisma;
  },
};
