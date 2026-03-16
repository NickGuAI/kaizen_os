import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

const { generateAuthUrl } = vi.hoisted(() => ({
  generateAuthUrl: vi.fn(() => 'https://example.com/oauth'),
}));

process.env.GOOGLE_OAUTH_STATE_SECRET = 'test-oauth-secret';
process.env.APP_BASE_URL = 'https://kaizen.example.com';
process.env.GOOGLE_NATIVE_REDIRECT_URI = 'https://kaizen.example.com/api/calendar/pubsub/google/callback';

vi.mock('@/lib/db', () => ({
  prisma: {},
}));

vi.mock('@/lib/crypto', () => ({
  encryptToken: vi.fn((value: string) => value),
  decryptToken: vi.fn((value: string) => value),
}));

vi.mock('@/services/calendar/calendarSubscriptionService', () => ({
  setupSubscriptionsForAccount: vi.fn(),
  deleteAllSubscriptionsForAccount: vi.fn(),
  reconcileSubscriptionsForAccount: vi.fn(),
}));

vi.mock('@/server/cron/calendarPoller', () => ({
  syncSubscriptionIncremental: vi.fn(),
}));

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
    expect(response.body).toEqual({ url: 'https://example.com/oauth', nativeFlow: false });
    const authOptions = generateAuthUrl.mock.calls[0]?.[0];
    expect(authOptions).toEqual(
      expect.objectContaining({
        access_type: 'offline',
        prompt: 'consent',
      })
    );

    const payload = String(authOptions.state).split('.')[0];
    const decodedState = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    expect(decodedState.userId).toBe('user-123');
    expect(decodedState.nativeFlow).toBe(false);
  });

  it('redirects to auth URL when format is not set', async () => {
    const response = await request(app)
      .get('/api/calendar/google/authorize');

    expect(response.status).toBe(302);
    expect(response.header.location).toBe('https://example.com/oauth');
  });

  it('returns native-flow auth URL payload when native=1', async () => {
    const response = await request(app)
      .get('/api/calendar/google/authorize')
      .query({
        native: '1',
        nativeCallback: 'kaizenos://oauth/google',
        format: 'json',
      });

    expect(response.status).toBe(200);
    expect(response.body.nativeFlow).toBe(true);
    expect(response.body.redirectUri).toBe(process.env.GOOGLE_NATIVE_REDIRECT_URI);

    const authOptions = generateAuthUrl.mock.calls[0]?.[0];
    expect(authOptions.redirect_uri).toBe(process.env.GOOGLE_NATIVE_REDIRECT_URI);

    const payload = String(authOptions.state).split('.')[0];
    const decodedState = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    expect(decodedState.nativeFlow).toBe(true);
    expect(decodedState.nativeCallback).toBe('kaizenos://oauth/google');
    expect(decodedState.redirectUri).toBe(process.env.GOOGLE_NATIVE_REDIRECT_URI);
  });
});
