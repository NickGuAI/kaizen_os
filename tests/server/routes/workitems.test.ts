import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// Mock workItemService before importing the router
vi.mock('@/services/workitems/workItemService', () => ({
  getWorkItemsForDay: vi.fn(),
  linkWorkItem: vi.fn(),
  unlinkWorkItem: vi.fn(),
  setDailyFocus: vi.fn(),
  getDailyFocus: vi.fn(),
  completeWorkItem: vi.fn(),
  createWorkItem: vi.fn(),
}));

import workitemsRouter from '@/server/routes/workitems';
import {
  getWorkItemsForDay,
  linkWorkItem,
  unlinkWorkItem,
  setDailyFocus,
  getDailyFocus,
  completeWorkItem,
  createWorkItem,
} from '@/services/workitems/workItemService';

// Error handling middleware (same as in server/index.ts)
interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, string[]>;
}

// Express error handler requires 4 params; _next unused but required for signature
function errorHandler(err: ApiError, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(err.details && { details: err.details }),
    },
  });
}

describe('WorkItems API Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Mock authentication middleware - sets req.user for all routes
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 1, timezone: 'America/Chicago' } as any;
      next();
    });
    app.use('/api/workitems', workitemsRouter);
    app.use(errorHandler);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/workitems/day', () => {
    it('should return work items for a date', async () => {
      const mockWorkItems = [
        {
          kind: 'event',
          source: 'google_calendar',
          key: 'gcal:acc1:cal1:evt1:inst1',
          title: 'Meeting',
          startAt: '2024-01-15T10:00:00Z',
          endAt: '2024-01-15T11:00:00Z',
          status: 'confirmed',
          linkedCardId: 42,
          linkedCardTitle: 'Project Alpha',
          focusRank: 1,
        },
        {
          kind: 'task',
          source: 'google_tasks',
          key: 'gtasks:acc1:list1:task1',
          title: 'Complete report',
          dueAt: '2024-01-15T17:00:00Z',
          status: 'open',
        },
      ];

      vi.mocked(getWorkItemsForDay).mockResolvedValue(mockWorkItems as any);

      const response = await request(app)
        .get('/api/workitems/day')
        .query({ date: '2024-01-15' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].linkedCardId).toBe(42);
      expect(response.body[0].focusRank).toBe(1);
      expect(getWorkItemsForDay).toHaveBeenCalledWith(1, '2024-01-15', 'America/Chicago');
    });

    it('should return 400 if date is missing', async () => {
      const response = await request(app).get('/api/workitems/day');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if date format is invalid', async () => {
      const response = await request(app)
        .get('/api/workitems/day')
        .query({ date: '01-15-2024' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if date is invalid', async () => {
      const response = await request(app)
        .get('/api/workitems/day')
        .query({ date: '2024-02-30' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/workitems/link', () => {
    it('should link a work item to a card', async () => {
      vi.mocked(linkWorkItem).mockResolvedValue();
      const cardId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .post('/api/workitems/link')
        .send({ workItemKey: 'gcal:acc1:cal1:evt1:inst1', cardId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.workItemKey).toBe('gcal:acc1:cal1:evt1:inst1');
      expect(response.body.cardId).toBe(cardId);
      expect(linkWorkItem).toHaveBeenCalledWith(1, 'gcal:acc1:cal1:evt1:inst1', cardId);
    });

    it('should unlink a work item when cardId is null', async () => {
      vi.mocked(linkWorkItem).mockResolvedValue();

      const response = await request(app)
        .post('/api/workitems/link')
        .send({ workItemKey: 'gcal:acc1:cal1:evt1:inst1', cardId: null });

      expect(response.status).toBe(200);
      expect(response.body.cardId).toBeNull();
      expect(linkWorkItem).toHaveBeenCalledWith(1, 'gcal:acc1:cal1:evt1:inst1', null);
    });

    it('should return 400 if workItemKey is missing', async () => {
      const response = await request(app)
        .post('/api/workitems/link')
        .send({ cardId: 42 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if cardId is invalid type', async () => {
      const response = await request(app)
        .post('/api/workitems/link')
        .send({ workItemKey: 'gcal:acc1:cal1:evt1:inst1', cardId: 42 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/workitems/link/:workItemKey', () => {
    it('should delete a work item link', async () => {
      vi.mocked(unlinkWorkItem).mockResolvedValue();

      const response = await request(app).delete(
        '/api/workitems/link/gcal:acc1:cal1:evt1:inst1'
      );

      expect(response.status).toBe(204);
      expect(unlinkWorkItem).toHaveBeenCalledWith('gcal:acc1:cal1:evt1:inst1');
    });
  });

  describe('POST /api/workitems/focus', () => {
    it('should set daily focus', async () => {
      vi.mocked(setDailyFocus).mockResolvedValue();

      const topKeys = ['key1', 'key2', 'key3'];
      const response = await request(app)
        .post('/api/workitems/focus')
        .send({ date: '2024-01-15', topKeys });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.date).toBe('2024-01-15');
      expect(response.body.topKeys).toEqual(topKeys);
      expect(setDailyFocus).toHaveBeenCalledWith(1, '2024-01-15', topKeys);
    });

    it('should return 400 if date is missing', async () => {
      const response = await request(app)
        .post('/api/workitems/focus')
        .send({ topKeys: ['key1'] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if date format is invalid', async () => {
      const response = await request(app)
        .post('/api/workitems/focus')
        .send({ date: '01-15-2024', topKeys: ['key1'] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if date is invalid', async () => {
      const response = await request(app)
        .post('/api/workitems/focus')
        .send({ date: '2024-02-30', topKeys: ['key1'] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if topKeys is not an array', async () => {
      const response = await request(app)
        .post('/api/workitems/focus')
        .send({ date: '2024-01-15', topKeys: 'key1' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if topKeys has more than 3 items', async () => {
      const response = await request(app)
        .post('/api/workitems/focus')
        .send({ date: '2024-01-15', topKeys: ['k1', 'k2', 'k3', 'k4'] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if topKeys contains non-strings', async () => {
      const response = await request(app)
        .post('/api/workitems/focus')
        .send({ date: '2024-01-15', topKeys: ['key1', 123] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/workitems/focus', () => {
    it('should return daily focus', async () => {
      vi.mocked(getDailyFocus).mockResolvedValue({
        id: 'focus-1',
        userId: 1,
        date: new Date('2024-01-15'),
        topKeys: ['key1', 'key2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await request(app)
        .get('/api/workitems/focus')
        .query({ date: '2024-01-15' });

      expect(response.status).toBe(200);
      expect(response.body.date).toBe('2024-01-15');
      expect(response.body.topKeys).toEqual(['key1', 'key2']);
    });

    it('should return empty topKeys if no focus found', async () => {
      vi.mocked(getDailyFocus).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/workitems/focus')
        .query({ date: '2024-01-15' });

      expect(response.status).toBe(200);
      expect(response.body.topKeys).toEqual([]);
    });

    it('should return 400 if date is missing', async () => {
      const response = await request(app).get('/api/workitems/focus');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if date is invalid', async () => {
      const response = await request(app)
        .get('/api/workitems/focus')
        .query({ date: '2024-02-30' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/workitems/complete', () => {
    it('should complete a work item without event attribution', async () => {
      vi.mocked(completeWorkItem).mockResolvedValue();

      const response = await request(app)
        .post('/api/workitems/complete')
        .send({ workItemKey: 'gtasks:acc1:list1:task1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.workItemKey).toBe('gtasks:acc1:list1:task1');
      expect(response.body.completedInEventKey).toBeUndefined();
      expect(completeWorkItem).toHaveBeenCalledWith(1, 'gtasks:acc1:list1:task1', undefined);
    });

    it('should complete a work item with event attribution', async () => {
      vi.mocked(completeWorkItem).mockResolvedValue();

      const eventKey = 'gcal:acc1:cal1:evt1:2024-01-15';
      const response = await request(app)
        .post('/api/workitems/complete')
        .send({ workItemKey: 'gtasks:acc1:list1:task1', completedInEventKey: eventKey });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.workItemKey).toBe('gtasks:acc1:list1:task1');
      expect(response.body.completedInEventKey).toBe(eventKey);
      expect(completeWorkItem).toHaveBeenCalledWith(1, 'gtasks:acc1:list1:task1', eventKey);
    });

    it('should return 400 if workItemKey is missing', async () => {
      const response = await request(app)
        .post('/api/workitems/complete')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if completedInEventKey is not a string', async () => {
      const response = await request(app)
        .post('/api/workitems/complete')
        .send({ workItemKey: 'gtasks:acc1:list1:task1', completedInEventKey: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/workitems/create', () => {
    it('should create a work item without event context', async () => {
      const mockWorkItem = {
        kind: 'task',
        source: 'google_tasks',
        key: 'gtasks:acc1:list1:newtask',
        title: 'New Task',
        dueAt: '2024-01-15T00:00:00.000Z',
        status: 'open',
      };

      vi.mocked(createWorkItem).mockResolvedValue(mockWorkItem as any);

      const response = await request(app)
        .post('/api/workitems/create')
        .send({ title: 'New Task', dueAt: '2024-01-15T00:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('New Task');
      expect(response.body.key).toBe('gtasks:acc1:list1:newtask');
      expect(createWorkItem).toHaveBeenCalledWith(1, {
        title: 'New Task',
        dueAt: '2024-01-15T00:00:00.000Z',
        notes: undefined,
        source: undefined,
        capturedInEventKey: undefined,
      });
    });

    it('should create a work item with event context', async () => {
      const eventKey = 'gcal:acc1:cal1:evt1:2024-01-15';
      const mockWorkItem = {
        kind: 'task',
        source: 'google_tasks',
        key: 'gtasks:acc1:list1:newtask',
        title: 'Task from meeting',
        dueAt: '2024-01-15T00:00:00.000Z',
        status: 'open',
      };

      vi.mocked(createWorkItem).mockResolvedValue(mockWorkItem as any);

      const response = await request(app)
        .post('/api/workitems/create')
        .send({
          title: 'Task from meeting',
          dueAt: '2024-01-15T00:00:00.000Z',
          capturedInEventKey: eventKey,
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Task from meeting');
      expect(createWorkItem).toHaveBeenCalledWith(1, {
        title: 'Task from meeting',
        dueAt: '2024-01-15T00:00:00.000Z',
        notes: undefined,
        source: undefined,
        capturedInEventKey: eventKey,
      });
    });

    it('should create a work item with notes', async () => {
      const mockWorkItem = {
        kind: 'task',
        source: 'google_tasks',
        key: 'gtasks:acc1:list1:newtask',
        title: 'Task with notes',
        status: 'open',
      };

      vi.mocked(createWorkItem).mockResolvedValue(mockWorkItem as any);

      const response = await request(app)
        .post('/api/workitems/create')
        .send({ title: 'Task with notes', notes: 'Some details here' });

      expect(response.status).toBe(200);
      expect(createWorkItem).toHaveBeenCalledWith(1, {
        title: 'Task with notes',
        dueAt: undefined,
        notes: 'Some details here',
        source: undefined,
        capturedInEventKey: undefined,
      });
    });

    it('should return 400 if title is missing', async () => {
      const response = await request(app)
        .post('/api/workitems/create')
        .send({ dueAt: '2024-01-15T00:00:00.000Z' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if title is not a string', async () => {
      const response = await request(app)
        .post('/api/workitems/create')
        .send({ title: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if capturedInEventKey is not a string', async () => {
      const response = await request(app)
        .post('/api/workitems/create')
        .send({ title: 'New Task', capturedInEventKey: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
