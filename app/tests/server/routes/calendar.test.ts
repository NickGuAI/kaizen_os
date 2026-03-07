import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

const generateAuthUrl = vi.fn(() => 'https://example.com/oauth');

vi.mock('@/services/calendar/tokenService', () => ({
  getOAuth2Client: () => ({
    generateAuthUrl,
  }),
}));

import calendarRouter from '@/server/routes/calendar';

describe('Calendar API Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 'user-123' } as any;
      next();
    });
    app.use('/api/calendar', calendarRouter);
    generateAuthUrl.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns JSON auth URL when format=json', async () => {
    const response = await request(app)
      .get('/api/calendar/google/authorize')
      .query({ format: 'json' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ url: 'https://example.com/oauth' });
    expect(generateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        access_type: 'offline',
        prompt: 'consent',
        state: 'user-123',
      })
    );
  });

  it('redirects to auth URL when format is not set', async () => {
    const response = await request(app)
      .get('/api/calendar/google/authorize');

    expect(response.status).toBe(302);
    expect(response.header.location).toBe('https://example.com/oauth');
  });
});
