import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// Mock the catalog before importing the router
vi.mock('@/services/catalog', () => ({
  catalog: {
    themes: {
      findById: vi.fn(),
      update: vi.fn(),
    },
    actions: {
      findById: vi.fn(),
      update: vi.fn(),
    },
    vetoes: {
      findById: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock the routineLinkService
vi.mock('@/services/calendar/routineLinkService', () => ({
  syncRoutineTitleToCalendar: vi.fn(),
}));

// Mock validation
vi.mock('@/lib/validation', () => ({
  validateUpdateCard: () => ({ valid: true, errors: [] }),
  formatValidationErrors: (errors: unknown[]) => errors,
  validateCreateCard: () => ({ valid: true, errors: [] }),
}));

// Mock prisma
vi.mock('@/lib/db', () => ({
  default: {},
  prisma: {},
}));

import cardsRouter from '@/server/routes/cards';
import { catalog } from '@/services/catalog';
import { syncRoutineTitleToCalendar } from '@/services/calendar/routineLinkService';

describe('Cards API Routes - Routine Title Sync', () => {
  let app: Express;
  const mockFindById = vi.mocked(catalog.actions.findById);
  const mockUpdate = vi.mocked(catalog.actions.update);
  const mockSync = vi.mocked(syncRoutineTitleToCalendar);

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 'user-123' } as any;
      next();
    });
    app.use('/api/cards', cardsRouter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PUT /api/cards/:id - Routine title sync', () => {
    const mockRoutineAction = {
      id: 'routine-123',
      title: 'Original Title',
      actionType: 'routine' as const,
      description: null,
      status: 'not_started' as const,
      parentId: null,
    };

    const mockUpdatedRoutine = {
      ...mockRoutineAction,
      title: 'Updated Title',
    };

    it('syncs title to Google Calendar when routine title changes', async () => {
      mockFindById.mockResolvedValue(mockRoutineAction as any);
      mockUpdate.mockResolvedValue(mockUpdatedRoutine as any);
      mockSync.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/cards/routine-123')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);

      // Wait for async sync to be called
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSync).toHaveBeenCalledWith(
        'user-123',
        'routine-123',
        'Updated Title'
      );
    });

    it('uses trimmed title from database for sync (not raw request)', async () => {
      mockFindById.mockResolvedValue(mockRoutineAction as any);
      // Simulate repository trimming the title
      mockUpdate.mockResolvedValue({
        ...mockRoutineAction,
        title: 'Trimmed Title',
      } as any);
      mockSync.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/cards/routine-123')
        .send({ title: '  Trimmed Title  ' }); // Whitespace around

      expect(response.status).toBe(200);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should use the trimmed title from the updated record
      expect(mockSync).toHaveBeenCalledWith(
        'user-123',
        'routine-123',
        'Trimmed Title'
      );
    });

    it('does not sync when title has not changed', async () => {
      mockFindById.mockResolvedValue(mockRoutineAction as any);
      // Title remains the same after update
      mockUpdate.mockResolvedValue(mockRoutineAction as any);

      const response = await request(app)
        .put('/api/cards/routine-123')
        .send({ title: 'Original Title' });

      expect(response.status).toBe(200);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSync).not.toHaveBeenCalled();
    });

    it('does not sync for non-routine actions', async () => {
      const mockGateAction = {
        ...mockRoutineAction,
        actionType: 'gate' as const,
      };
      mockFindById.mockResolvedValue(mockGateAction as any);
      mockUpdate.mockResolvedValue({
        ...mockGateAction,
        title: 'Updated Gate',
      } as any);

      const response = await request(app)
        .put('/api/cards/routine-123')
        .send({ title: 'Updated Gate' });

      expect(response.status).toBe(200);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSync).not.toHaveBeenCalled();
    });

    it('handles sync errors gracefully without failing the request', async () => {
      mockFindById.mockResolvedValue(mockRoutineAction as any);
      mockUpdate.mockResolvedValue(mockUpdatedRoutine as any);
      mockSync.mockRejectedValue(new Error('Sync failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .put('/api/cards/routine-123')
        .send({ title: 'Updated Title' });

      // Request should still succeed
      expect(response.status).toBe(200);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to sync routine title to calendar:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
