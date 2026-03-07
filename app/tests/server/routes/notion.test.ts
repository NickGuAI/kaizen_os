import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// Mock dependencies before importing
vi.mock('@/lib/db', () => ({
  prisma: {
    notionAccount: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/crypto', () => ({
  encryptToken: vi.fn((token: string) => `encrypted_${token}`),
  decryptToken: vi.fn((token: string) => token.replace('encrypted_', '')),
}));

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(),
}));

// Mock environment variables
process.env.NOTION_CLIENT_ID = 'test-client-id';
process.env.NOTION_CLIENT_SECRET = 'test-client-secret';
process.env.NOTION_REDIRECT_URI = 'http://localhost:3001/api/notion/callback';

import notionRouter from '@/server/routes/notion';
import { prisma } from '@/lib/db';
import { Client } from '@notionhq/client';

// Error handling middleware
interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

// Express error handler requires 4 params; _next unused but required for signature
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorHandler(err: ApiError, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    error: { code, message },
  });
}

describe('Notion API Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Mock authentication middleware - sets req.user for all routes
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 1 } as any;
      next();
    });
    app.use('/api/notion', notionRouter);
    app.use(errorHandler);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/notion/authorize', () => {
    it('should return CONFIG_ERROR when Notion OAuth is not configured', async () => {
      // In test, env vars are not available at router import time, so expect CONFIG_ERROR
      const response = await request(app)
        .get('/api/notion/authorize');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('CONFIG_ERROR');
    });
    // Note: Auth is now handled by requireAuth middleware, not userId query param
  });

  describe('GET /api/notion/accounts', () => {
    it('should return list of accounts', async () => {
      const mockAccounts = [
        {
          id: 'account-1',
          workspaceId: 'ws-1',
          workspaceName: 'My Workspace',
          selectedDatabaseIds: ['db-1'],
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.notionAccount.findMany).mockResolvedValue(mockAccounts as any);

      const response = await request(app)
        .get('/api/notion/accounts')
        .set('x-user-id', '1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].workspaceName).toBe('My Workspace');
    });

    // Note: Auth is now handled by requireAuth middleware, not per-route header checks
  });

  describe('DELETE /api/notion/accounts/:id', () => {
    it('should delete an account', async () => {
      vi.mocked(prisma.notionAccount.delete).mockResolvedValue({} as any);

      const response = await request(app)
        .delete('/api/notion/accounts/account-1')
        .set('x-user-id', '1');

      expect(response.status).toBe(204);
      expect(prisma.notionAccount.delete).toHaveBeenCalledWith({
        where: {
          id: 'account-1',
          userId: 1,
        },
      });
    });
    // Note: Auth is now handled by requireAuth middleware
  });

  describe('GET /api/notion/databases', () => {
    const mockAccount = {
      id: 'account-1',
      userId: 1,
      accessTokenEncrypted: 'encrypted_token',
      workspaceId: 'ws-1',
    };

    it('should return list of databases', async () => {
      vi.mocked(prisma.notionAccount.findFirst).mockResolvedValue(mockAccount as any);

      const mockSearch = vi.fn().mockResolvedValue({
        results: [
          {
            object: 'database',
            id: 'db-1',
            title: [{ plain_text: 'Tasks DB' }],
            url: 'https://notion.so/db-1',
          },
        ],
      });

      vi.mocked(Client).mockImplementation(() => ({
        search: mockSearch,
      }) as any);

      const response = await request(app)
        .get('/api/notion/databases')
        .query({ accountId: 'account-1' })
        .set('x-user-id', '1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Tasks DB');
    });

    it('should return 400 if accountId is missing', async () => {
      const response = await request(app)
        .get('/api/notion/databases')
        .set('x-user-id', '1');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if account not found', async () => {
      vi.mocked(prisma.notionAccount.findFirst).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/notion/databases')
        .query({ accountId: 'nonexistent' })
        .set('x-user-id', '1');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/notion/databases/select', () => {
    const mockAccount = {
      id: 'account-1',
      userId: 1,
    };

    it('should update selected databases', async () => {
      vi.mocked(prisma.notionAccount.findFirst).mockResolvedValue(mockAccount as any);
      vi.mocked(prisma.notionAccount.update).mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/notion/databases/select')
        .set('x-user-id', '1')
        .send({ accountId: 'account-1', databaseIds: ['db-1', 'db-2'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.databaseIds).toEqual(['db-1', 'db-2']);
      expect(prisma.notionAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: { selectedDatabaseIds: ['db-1', 'db-2'] },
      });
    });

    it('should return 400 if accountId is missing', async () => {
      const response = await request(app)
        .post('/api/notion/databases/select')
        .set('x-user-id', '1')
        .send({ databaseIds: ['db-1'] });

      expect(response.status).toBe(400);
    });

    it('should return 400 if databaseIds is not an array', async () => {
      const response = await request(app)
        .post('/api/notion/databases/select')
        .set('x-user-id', '1')
        .send({ accountId: 'account-1', databaseIds: 'db-1' });

      expect(response.status).toBe(400);
    });

    it('should return 404 if account not found', async () => {
      vi.mocked(prisma.notionAccount.findFirst).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/notion/databases/select')
        .set('x-user-id', '1')
        .send({ accountId: 'nonexistent', databaseIds: ['db-1'] });

      expect(response.status).toBe(404);
    });
  });
});
