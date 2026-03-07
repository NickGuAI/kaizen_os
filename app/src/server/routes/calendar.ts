import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { startOfWeek } from 'date-fns';
import { DateTime } from 'luxon';
import { prisma } from '../../lib/db';
import { encryptToken, decryptToken } from '../../lib/crypto';
import { isValidUuid } from '../../lib/validation';
import { getOAuth2Client } from '../../services/calendar/tokenService';
import { getWeekEventsWithCache } from '../../services/calendar/eventCacheService';
import { setupSubscriptionsForAccount, deleteAllSubscriptionsForAccount } from '../../services/calendar/calendarSubscriptionService';
import { upsertCalendarEvents } from '../../services/calendar/calendarEventUpsertService';

const router = Router();

function hashStringToIndex(value: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % modulo;
}

/**
 * @openapi
 * /api/calendar/google/authorize:
 *   get:
 *     summary: Start Google OAuth flow
 *     tags:
 *       - Calendar
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 * /api/calendar/google/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     tags:
 *       - Calendar
 *     responses:
 *       302:
 *         description: Redirect after OAuth
 * /api/calendar/accounts:
 *   get:
 *     summary: List calendar accounts
 *     tags:
 *       - Calendar
 *     responses:
 *       200:
 *         description: Accounts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/calendar/accounts/{id}:
 *   delete:
 *     summary: Delete a calendar account
 *     tags:
 *       - Calendar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Account deleted
 * /api/calendar/accounts/{id}/refresh:
 *   post:
 *     summary: Refresh account tokens
 *     tags:
 *       - Calendar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Refreshed account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/accounts/{id}/preferences:
 *   put:
 *     summary: Update account preferences
 *     tags:
 *       - Calendar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Updated preferences
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/accounts/{id}/calendars:
 *   get:
 *     summary: List calendars for an account
 *     tags:
 *       - Calendar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Calendars
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/calendar/accounts/{id}/tasklists:
 *   get:
 *     summary: List task lists for an account
 *     tags:
 *       - Calendar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task lists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/calendar/accounts/{id}/events:
 *   get:
 *     summary: List events for an account
 *     tags:
 *       - Calendar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/calendar/review:
 *   get:
 *     summary: Get review items
 *     tags:
 *       - Calendar
 *     responses:
 *       200:
 *         description: Review items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/review/reclassify:
 *   post:
 *     summary: Reclassify review items
 *     tags:
 *       - Calendar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Reclassification result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/review/commit:
 *   post:
 *     summary: Commit review items
 *     tags:
 *       - Calendar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Commit result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/plan/preview:
 *   post:
 *     summary: Preview plan
 *     tags:
 *       - Calendar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Plan preview
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/plan/commit:
 *   post:
 *     summary: Commit plan
 *     tags:
 *       - Calendar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Plan committed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/plan/submitted-types:
 *   get:
 *     summary: List submitted plan types
 *     tags:
 *       - Calendar
 *     responses:
 *       200:
 *         description: Submitted types
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/calendar/events/week:
 *   get:
 *     summary: List events for a week
 *     tags:
 *       - Calendar
 *     responses:
 *       200:
 *         description: Week events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/calendar/events/day:
 *   get:
 *     summary: List events for a day
 *     tags:
 *       - Calendar
 *     responses:
 *       200:
 *         description: Day events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/calendar/week/planned-hours:
 *   get:
 *     summary: Get planned hours for a week
 *     tags:
 *       - Calendar
 *     responses:
 *       200:
 *         description: Planned hours
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/routines/links:
 *   get:
 *     summary: List routine links
 *     tags:
 *       - Calendar
 *     responses:
 *       200:
 *         description: Routine links
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/calendar/routines/links/{cardId}:
 *   get:
 *     summary: Get routine links for a card
 *     tags:
 *       - Calendar
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Routine links
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/calendar/routines/recurring-events:
 *   get:
 *     summary: List recurring routine events
 *     tags:
 *       - Calendar
 *     responses:
 *       200:
 *         description: Recurring events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/calendar/routines/link:
 *   post:
 *     summary: Link a routine to a card
 *     tags:
 *       - Calendar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Routine linked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/routines/create-recurring:
 *   post:
 *     summary: Create recurring routine events
 *     tags:
 *       - Calendar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Recurring events created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/routines/link/{cardId}:
 *   delete:
 *     summary: Remove routine link
 *     tags:
 *       - Calendar
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Routine link removed
 * /api/calendar/rules:
 *   get:
 *     summary: List calendar rules
 *     tags:
 *       - Calendar
 *     responses:
 *       200:
 *         description: Rules
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 *   post:
 *     summary: Create a calendar rule
 *     tags:
 *       - Calendar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Created rule
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/rules/{id}:
 *   put:
 *     summary: Update a calendar rule
 *     tags:
 *       - Calendar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Updated rule
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 *   delete:
 *     summary: Delete a calendar rule
 *     tags:
 *       - Calendar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Rule deleted
 * /api/calendar/events/{accountId}/{calendarId}/{eventId}:
 *   delete:
 *     summary: Delete a calendar event
 *     tags:
 *       - Calendar
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: calendarId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 *       404:
 *         description: Account or event not found
 * /api/calendar/events/batch-update:
 *   post:
 *     summary: Batch update events
 *     tags:
 *       - Calendar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Batch update result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/sync:
 *   post:
 *     summary: Sync calendar data
 *     tags:
 *       - Calendar
 *     responses:
 *       200:
 *         description: Sync started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/calendar/planning/session:
 *   get:
 *     summary: Get planning session
 *     tags:
 *       - Calendar
 *     responses:
 *       200:
 *         description: Planning session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 *   put:
 *     summary: Update planning session
 *     tags:
 *       - Calendar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Planning session updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 *   delete:
 *     summary: Clear planning session
 *     tags:
 *       - Calendar
 *     responses:
 *       204:
 *         description: Planning session cleared
 * /api/calendar/planning/session/commit:
 *   post:
 *     summary: Commit planning session
 *     tags:
 *       - Calendar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Planning session committed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 */
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/tasks',
];

// Validate redirect URL is a safe same-origin path
function isValidRedirectPath(redirect: string | undefined): boolean {
  if (!redirect) return false;
  // Must start with / and not contain protocol or double slashes (prevent //evil.com)
  return redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes(':');
}

// GET /api/calendar/google/authorize
router.get('/google/authorize', (req: Request, res: Response) => {
  // Defensive check - middleware should ensure user exists, but log if it doesn't
  if (!req.user) {
    console.error('[calendar/authorize] req.user is undefined despite auth middleware');
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const userId = req.user.id;
  const redirectParam = req.query.redirect as string | undefined;

  // Only allow valid same-origin paths, default to /settings
  const redirectUrl = isValidRedirectPath(redirectParam) ? redirectParam : undefined;

  // Encode userId and optional redirect URL in state
  const stateData = { userId, redirect: redirectUrl };
  const stateEncoded = Buffer.from(JSON.stringify(stateData)).toString('base64');

  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: stateEncoded,
  });
  if (req.query.format === 'json') {
    return res.json({ url });
  }
  res.redirect(url);
});

// GET /api/calendar/google/callback
router.get('/google/callback', async (req: Request, res: Response) => {
  // Defensive check - middleware should ensure user exists
  if (!req.user) {
    console.error('[calendar/callback] req.user is undefined despite auth middleware');
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const { code, state } = req.query;
  const userId = req.user.id;
  const stateValue = Array.isArray(state) ? state[0] : state;

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  // Decode state to get userId and redirect URL
  let stateData: { userId: string; redirect?: string } | null = null;
  try {
    stateData = JSON.parse(Buffer.from(stateValue as string, 'base64').toString());
  } catch {
    // Fallback for old format (just userId string)
    stateData = { userId: stateValue as string };
  }

  if (!stateData || stateData.userId !== userId) {
    return res.status(400).json({ error: 'Invalid OAuth state' });
  }

  // Determine redirect destination (default to /settings)
  const redirectTo = stateData.redirect || '/settings';
  const successUrl = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}connected=true`;
  const errorUrl = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}error=auth_failed`;

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code as string);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens in response');
    }

    oauth2Client.setCredentials(tokens);


    // Get user email from token info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email) {
      throw new Error('Could not get user email');
    }

    // Store encrypted tokens
    await prisma.calendarAccount.upsert({
      where: {
        userId_provider_email: {
          userId,
          provider: 'google',
          email: userInfo.email,
        },
      },
      update: {
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted: encryptToken(tokens.refresh_token),
        expiresAt: new Date(tokens.expiry_date!),
        scopes: SCOPES,
      },
      create: {
        userId,
        provider: 'google',
        email: userInfo.email,
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted: encryptToken(tokens.refresh_token),
        expiresAt: new Date(tokens.expiry_date!),
        scopes: SCOPES,
      },
    });

    // Fire-and-forget: set up Workspace Events subscriptions
    const account = await prisma.calendarAccount.findFirst({
      where: { userId, provider: 'google', email: userInfo.email! },
    });
    if (account) {
      setupSubscriptionsForAccount(userId, account.id).catch((err) =>
        console.error('[calendar/callback] subscription setup failed:', err)
      );
    }

    res.redirect(successUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(errorUrl);
  }
});

// GET /api/calendar/accounts
router.get('/accounts', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const accounts = await prisma.calendarAccount.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      email: true,
      selectedCalendarIds: true,
      writeCalendarId: true,
      selectedTaskListId: true,
      createdAt: true,
    },
  });

  res.json(accounts);
});

// DELETE /api/calendar/accounts/:id
router.delete('/accounts/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const accountId = req.params.id as string;

  try {
    // Clean up subscriptions, stale WorkItemLinks, and dailyFocus top3 keys
    await deleteAllSubscriptionsForAccount(accountId);
    await prisma.workItemLink.deleteMany({
      where: { userId, workItemKey: { startsWith: `gtasks:${accountId}:` } },
    });
    // dailyFocus.topKeys is a JSON array — remove any keys referencing this account
    const staleKeyPrefix = `gtasks:${accountId}:`;
    const focusRecords = await prisma.dailyFocus.findMany({ where: { userId } });
    await Promise.all(
      focusRecords
        .filter(r => (r.topKeys as string[]).some(k => k.startsWith(staleKeyPrefix)))
        .map(r =>
          prisma.dailyFocus.update({
            where: { id: r.id },
            data: { topKeys: (r.topKeys as string[]).filter(k => !k.startsWith(staleKeyPrefix)) },
          })
        )
    );
    await prisma.calendarAccount.delete({
      where: { id: accountId, userId },
    });
    res.json({ success: true });
  } catch (_error) {
    res.status(404).json({ error: 'Account not found' });
  }
});

// POST /api/calendar/accounts/:id/refresh - Force token refresh (re-auth if expired)
router.post('/accounts/:id/refresh', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const accountId = req.params.id as string;

  try {
    const account = await prisma.calendarAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Try to refresh the token
    const oauth2Client = getOAuth2Client();
    const refreshToken = decryptToken(account.refreshTokenEncrypted);
    
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update stored tokens
      await prisma.calendarAccount.update({
        where: { id: accountId },
        data: {
          accessTokenEncrypted: encryptToken(credentials.access_token!),
          expiresAt: new Date(credentials.expiry_date!),
        },
      });

      res.json({ success: true, message: 'Token refreshed successfully' });
    } catch (refreshError: any) {
      // Token is invalid/revoked - user needs to re-authenticate
      if (refreshError.message?.includes('invalid_grant') || refreshError.code === 400) {
        return res.status(401).json({ 
          error: 'Token expired or revoked',
          needsReauth: true,
          message: 'Please reconnect your Google account'
        });
      }
      throw refreshError;
    }
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: error.message || 'Failed to refresh token' });
  }
});

// PUT /api/calendar/accounts/:id/preferences
router.put('/accounts/:id/preferences', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const accountId = req.params.id as string;

  const { selectedCalendarIds, writeCalendarId, selectedTaskListId } = req.body;

  try {
    const account = await prisma.calendarAccount.update({
      where: { id: accountId, userId },
      data: {
        ...(selectedCalendarIds !== undefined && { selectedCalendarIds }),
        ...(writeCalendarId !== undefined && { writeCalendarId }),
        ...(selectedTaskListId !== undefined && { selectedTaskListId }),
      },
      select: {
        id: true,
        provider: true,
        email: true,
        selectedCalendarIds: true,
        writeCalendarId: true,
        selectedTaskListId: true,
      },
    });
    res.json(account);
  } catch (_error) {
    res.status(404).json({ error: 'Account not found' });
  }
});

// ============================================
// Calendar Provider Endpoints (Phase 3)
// ============================================

import { getProviderForAccount } from '../../services/calendar/providerFactory';

// GET /api/calendar/accounts/:id/calendars
router.get('/accounts/:id/calendars', async (req: Request, res: Response) => {
  try {
    const accountId = req.params.id as string;
    const provider = await getProviderForAccount(accountId);
    const calendars = await provider.listCalendars(accountId);
    res.json(calendars);
  } catch (error) {
    console.error('List calendars error:', error);
    res.status(500).json({ error: 'Failed to list calendars' });
  }
});

// GET /api/calendar/accounts/:id/tasklists - List Google Task lists for account
router.get('/accounts/:id/tasklists', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const accountId = req.params.id as string;

  try {
    const account = await prisma.calendarAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Get authenticated client
    const oauth2Client = getOAuth2Client();
    const accessToken = decryptToken(account.accessTokenEncrypted);
    oauth2Client.setCredentials({ access_token: accessToken });

    // Fetch task lists from Google Tasks API
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });
    const response = await tasks.tasklists.list({ maxResults: 100 });

    const taskLists = (response.data.items || []).map(list => ({
      id: list.id,
      title: list.title,
    }));

    res.json(taskLists);
  } catch (error: any) {
    console.error('List task lists error:', error);
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return res.status(401).json({ error: 'Token expired', needsReauth: true });
    }
    res.status(500).json({ error: 'Failed to list task lists' });
  }
});

// GET /api/calendar/accounts/:id/events?calendarId=...&timeMin=...&timeMax=...
router.get('/accounts/:id/events', async (req: Request, res: Response) => {
  const { calendarId, timeMin, timeMax } = req.query;
  const accountId = req.params.id as string;

  if (!calendarId || !timeMin || !timeMax) {
    return res.status(400).json({ error: 'calendarId, timeMin, and timeMax are required' });
  }

  try {
    const provider = await getProviderForAccount(accountId);
    const events = await provider.listEvents(
      accountId,
      calendarId as string,
      timeMin as string,
      timeMax as string
    );
    res.json(events);
  } catch (error) {
    console.error('List events error:', error);
    res.status(500).json({ error: 'Failed to list events' });
  }
});


// ============================================
// Weekly Review Endpoints (Phase 4)
// ============================================

import { getWeekReview, commitReview } from '../../services/calendar/reviewOrchestrator';

// GET /api/calendar/review?weekStart=YYYY-MM-DD
router.get('/review', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const weekStart = req.query.weekStart as string;
  if (!weekStart) {
    return res.status(400).json({ error: 'weekStart query param required (YYYY-MM-DD)' });
  }

  try {
    const result = await getWeekReview(userId, weekStart);
    res.json(result);
  } catch (error) {
    console.error('Get week review error:', error);
    res.status(500).json({ error: 'Failed to get week review' });
  }
});

// POST /api/calendar/review/reclassify - Force AI reclassification for pending events
router.post('/review/reclassify', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const weekStart = req.query.weekStart as string;
  if (!weekStart) {
    return res.status(400).json({ error: 'weekStart query param required (YYYY-MM-DD)' });
  }

  try {
    const result = await getWeekReview(userId, weekStart, { forceAI: true });
    res.json(result);
  } catch (error) {
    console.error('Reclassify error:', error);
    res.status(500).json({ error: 'Failed to reclassify events' });
  }
});

// POST /api/calendar/review/commit
router.post('/review/commit', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const result = await commitReview(userId, req.body);
    res.json(result);
  } catch (error) {
    console.error('Commit review error:', error);
    res.status(500).json({ error: 'Failed to commit review' });
  }
});


// ============================================
// Weekly Planning Endpoints (Phase 5)
// ============================================

import { previewPlan, commitPlan, getSubmittedTypes, getWeeklyPlannedHours } from '../../services/calendar/planningService';

// POST /api/calendar/plan/preview
router.post('/plan/preview', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const { text, weekStart } = req.body;
  if (!text || !weekStart) {
    return res.status(400).json({ error: 'text and weekStart are required' });
  }

  try {
    const result = await previewPlan(userId, text, weekStart);
    res.json(result);
  } catch (error) {
    console.error('Preview plan error:', error);
    res.status(500).json({ error: 'Failed to preview plan' });
  }
});

// GET /api/calendar/events/week - Get all events for a week (Phase 8)
router.get('/events/week', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const weekStart = req.query.weekStart as string;
  if (!weekStart) {
    return res.status(400).json({ error: 'weekStart query param required (YYYY-MM-DD)' });
  }

  const debug = req.query.debug === 'true';
  const forceRefresh = req.query.forceRefresh === 'true';

  try {
    // Use cached events (fetches from Google if cache expired or forceRefresh)
    const cachedEvents = await getWeekEventsWithCache(userId, weekStart, { forceRefresh });
    
    // Transform cached events to match expected format
    const allEvents = cachedEvents.map(e => ({
      id: e.eventId,
      accountId: e.accountId,
      calendarId: e.calendarId,
      summary: e.summary,
      description: e.description,
      location: e.location,
      start: { dateTime: e.startDateTime.toISOString() },
      end: { dateTime: e.endDateTime.toISOString() },
      attendees: e.attendees,
      htmlLink: e.htmlLink,
      recurringEventId: e.recurringEventId,
      iCalUID: e.iCalUID,
    }));

    // Load classification data in parallel (3 queries → 1 round-trip)
    const [rules, routineLinks, annotations] = await Promise.all([
      prisma.eventClassificationRule.findMany({
        where: { userId, isActive: true },
        include: { card: { select: { id: true, title: true, unitType: true, parentId: true } } },
        orderBy: { priority: 'desc' },
      }),
      prisma.routineCalendarLink.findMany({
        where: { userId },
        include: { card: { select: { id: true, title: true, unitType: true, parentId: true } } },
      }),
      prisma.calendarEventAnnotation.findMany({
        where: { userId },
        include: { card: { select: { id: true, title: true, unitType: true, parentId: true } } },
      }),
    ]);
    const routineLinkMap = new Map(routineLinks.map(l => [l.recurringEventId, l]));
    const annotationMap = new Map(annotations.filter(a => a.card).map(a => [a.eventId, a]));

    // Apply classification rules to events
    const classifiedEvents = allEvents.map(event => {
      const eventTitle = (event.summary || '').trim();
      let classificationSource: string | undefined;
      let classificationConfidence: number | undefined;
      let assignedCardId: string | undefined;
      let assignedCardTitle: string | undefined;
      let assignedCardType: string | undefined;
      let assignedThemeId: string | undefined;

      // Priority 0: Check direct annotations (highest priority - explicit user assignment)
      const annotation = annotationMap.get(event.id);
      if (annotation && annotation.card) {
        assignedCardId = annotation.cardId!;
        assignedCardTitle = annotation.card.title;
        assignedCardType = annotation.card.unitType;
        assignedThemeId = annotation.card.parentId || undefined;
        classificationSource = 'annotation';
        classificationConfidence = 1.0;
      }

      // Priority 1: Check routine links (recurring event match)
      // Use event.summary (Google Calendar title) as source of truth, with card title as fallback
      if (!assignedCardId && event.recurringEventId) {
        const routineLink = routineLinkMap.get(event.recurringEventId);
        if (routineLink) {
          assignedCardId = routineLink.cardId;
          assignedCardTitle = event.summary || routineLink.card.title;
          assignedCardType = routineLink.card.unitType;
          assignedThemeId = routineLink.card.parentId || undefined;
          classificationSource = 'routine_link';
          classificationConfidence = 1.0;
        }
      }

      // Priority 2: Check classification rules
      if (!assignedCardId) {
        for (const rule of rules) {
          let matches = false;
          if (rule.matchType === 'title_exact' && eventTitle === rule.matchValue) {
            matches = true;
          } else if (rule.matchType === 'title_contains' && eventTitle.toLowerCase().includes(rule.matchValue.toLowerCase())) {
            matches = true;
          }
          
          if (matches) {
            assignedCardId = rule.cardId;
            assignedCardTitle = rule.card.title;
            assignedCardType = rule.card.unitType;
            assignedThemeId = (rule.card as any).parentId || undefined;
            classificationSource = 'rule';
            classificationConfidence = 0.9;
            break;
          }
        }
      }

      const result: any = {
        ...event,
        assignedCardId,
        assignedCardTitle,
        assignedCardType,
        assignedThemeId,
        classificationSource,
      };

      // Debug mode: include extra metadata
      if (debug) {
        result.debug = {
          classificationSource,
          classificationConfidence,
          recurringEventId: event.recurringEventId,
          iCalUID: event.iCalUID,
        };
      }

      return result;
    });

    res.json(classifiedEvents);
  } catch (error) {
    console.error('Get week events error:', error);
    res.status(500).json({ error: 'Failed to get week events' });
  }
});

// POST /api/calendar/plan/commit
router.post('/plan/commit', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // GUARD: Check if session is already committed
  const { weekStart, blocks, assignments } = req.body;
  if (weekStart) {
    const session = await prisma.planningSession.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    });
    if (session?.status === 'committed') {
      return res.status(409).json({
        error: 'This week has already been committed',
        code: 'ALREADY_COMMITTED',
        weekStart
      });
    }
  }

  // VALIDATION: Validate cardId in blocks (must be null or valid UUID)
  if (Array.isArray(blocks)) {
    for (const block of blocks) {
      if (block.cardId !== null && block.cardId !== undefined && !isValidUuid(block.cardId)) {
        return res.status(400).json({
          error: `Invalid cardId in block: expected UUID string or null, got ${typeof block.cardId} (${block.cardId})`,
          code: 'INVALID_CARD_ID',
          field: 'blocks.cardId'
        });
      }
    }
  }

  // VALIDATION: Validate cardId in assignments (must be valid UUID if present)
  if (Array.isArray(assignments)) {
    for (const assignment of assignments) {
      // cardId can be empty string (no assignment) or valid UUID
      if (assignment.cardId && !isValidUuid(assignment.cardId)) {
        return res.status(400).json({
          error: `Invalid cardId in assignment: expected UUID string, got ${typeof assignment.cardId} (${assignment.cardId})`,
          code: 'INVALID_CARD_ID',
          field: 'assignments.cardId'
        });
      }
    }
  }

  try {
    const result = await commitPlan(userId, req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Commit plan error:', error);
    res.status(500).json({ error: error.message || 'Failed to commit plan' });
  }
});

// GET /api/calendar/plan/submitted-types - Get which action types are already submitted for a week
router.get('/plan/submitted-types', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const weekStart = req.query.weekStart as string;
  if (!weekStart) {
    return res.status(400).json({ error: 'weekStart query param required (YYYY-MM-DD)' });
  }

  try {
    const submittedTypes = await getSubmittedTypes(userId, weekStart);
    res.json(submittedTypes);
  } catch (error) {
    console.error('Get submitted types error:', error);
    res.status(500).json({ error: 'Failed to get submitted types' });
  }
});

// GET /api/calendar/week/planned-hours - Get planned hours summary for a week (FR-001)
router.get('/week/planned-hours', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const weekStart = req.query.weekStart as string;
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart query param required (YYYY-MM-DD format)' });
  }

  try {
    const result = await getWeeklyPlannedHours(userId, weekStart);
    res.json(result);
  } catch (error) {
    console.error('Get planned hours error:', error);
    res.status(500).json({ error: 'Failed to calculate planned hours' });
  }
});


// ============================================
// Routine Linking Endpoints (Phase 7)
// ============================================

import {
  linkRoutineToEvent,
  unlinkRoutine,
  getRoutineLinks,
  getRoutineLinkForCard,
  getRecurringEventsForLinking,
  createRecurringEventForRoutine,
} from '../../services/calendar/routineLinkService';

// GET /api/calendar/routines/links - Get all routine links for user
router.get('/routines/links', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const links = await getRoutineLinks(userId);
    res.json(links);
  } catch (error) {
    console.error('Get routine links error:', error);
    res.status(500).json({ error: 'Failed to get routine links' });
  }
});

// GET /api/calendar/routines/links/:cardId - Get link for specific card
router.get('/routines/links/:cardId', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const cardId = req.params.cardId as string;

  try {
    const link = await getRoutineLinkForCard(userId, cardId);
    res.json(link);
  } catch (error) {
    console.error('Get routine link error:', error);
    res.status(500).json({ error: 'Failed to get routine link' });
  }
});

// GET /api/calendar/routines/recurring-events - Get available recurring events for linking
router.get('/routines/recurring-events', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const events = await getRecurringEventsForLinking(userId);
    res.json(events);
  } catch (error) {
    console.error('Get recurring events error:', error);
    res.status(500).json({ error: 'Failed to get recurring events' });
  }
});

// POST /api/calendar/routines/link - Create a routine link
router.post('/routines/link', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const { cardId, accountId, calendarId, recurringEventId, iCalUid } = req.body;
  if (!cardId || !accountId || !calendarId || !recurringEventId) {
    return res.status(400).json({ error: 'cardId, accountId, calendarId, and recurringEventId are required' });
  }

  try {
    const link = await linkRoutineToEvent(
      userId,
      String(cardId),
      accountId,
      calendarId,
      recurringEventId,
      iCalUid
    );
    res.json(link);
  } catch (error: any) {
    console.error('Create routine link error:', error);
    res.status(400).json({ error: error.message || 'Failed to create routine link' });
  }
});

// POST /api/calendar/routines/create-recurring - FR-002: Create a new recurring event for a routine
router.post('/routines/create-recurring', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const { cardId, summary, recurrencePattern, daysOfWeek, rrule, startDate, startTime, duration, location, description } = req.body;
  
  // Either rrule OR recurrencePattern is required
  if (!cardId || !summary || !startTime || !duration || (!recurrencePattern && !rrule)) {
    return res.status(400).json({ 
      error: 'cardId, summary, startTime, duration, and either recurrencePattern or rrule are required' 
    });
  }

  try {
    const link = await createRecurringEventForRoutine(
      userId,
      String(cardId),
      {
        summary,
        description,
        recurrencePattern,
        daysOfWeek,
        rrule,
        startDate,
        startTime,
        duration: parseInt(duration, 10),
        location,
      }
    );
    res.json(link);
  } catch (error: any) {
    console.error('Create recurring event error:', error);
    res.status(400).json({ error: error.message || 'Failed to create recurring event' });
  }
});

// DELETE /api/calendar/routines/link/:cardId - Remove a routine link
router.delete('/routines/link/:cardId', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const cardId = req.params.cardId as string;

  try {
    await unlinkRoutine(userId, cardId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete routine link error:', error);
    res.status(500).json({ error: 'Failed to delete routine link' });
  }
});


// ============================================
// Classification Rules CRUD Endpoints
// ============================================

// GET /api/calendar/rules - Get all classification rules for user
router.get('/rules', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const rules = await prisma.eventClassificationRule.findMany({
      where: { userId },
      include: { card: { select: { id: true, title: true, unitType: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(rules);
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ error: 'Failed to get rules' });
  }
});

// POST /api/calendar/rules - Create a new classification rule
router.post('/rules', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const { matchType, matchValue, cardId, priority, isActive } = req.body;
  if (!matchType || !matchValue || !cardId) {
    return res.status(400).json({ error: 'matchType, matchValue, and cardId are required' });
  }

  try {
    const rule = await prisma.eventClassificationRule.create({
      data: {
        userId,
        matchType,
        matchValue: matchValue.trim(),
        cardId: String(cardId),
        priority: priority ?? 0,
        isActive: isActive ?? true,
      },
      include: { card: { select: { id: true, title: true, unitType: true } } },
    });
    res.status(201).json(rule);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A rule with this match type and value already exists' });
    }
    console.error('Create rule error:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// PUT /api/calendar/rules/:id - Update a classification rule
router.put('/rules/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const ruleId = req.params.id as string;

  const { matchType, matchValue, cardId, priority, isActive } = req.body;

  try {
    // Verify ownership
    const existing = await prisma.eventClassificationRule.findFirst({
      where: { id: ruleId, userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const rule = await prisma.eventClassificationRule.update({
      where: { id: ruleId },
      data: {
        ...(matchType !== undefined && { matchType }),
        ...(matchValue !== undefined && { matchValue: matchValue.trim() }),
        ...(cardId !== undefined && { cardId: String(cardId) }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { card: { select: { id: true, title: true, unitType: true } } },
    });
    res.json(rule);
  } catch (error) {
    console.error('Update rule error:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// DELETE /api/calendar/rules/:id - Delete a classification rule
router.delete('/rules/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const ruleId = req.params.id as string;

  try {
    // Verify ownership
    const existing = await prisma.eventClassificationRule.findFirst({
      where: { id: ruleId, userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    await prisma.eventClassificationRule.delete({
      where: { id: ruleId },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});


// ============================================
// Calendar Event Batch Update Endpoint
// ============================================

// DELETE /api/calendar/events/:accountId/:calendarId/:eventId - Delete a calendar event
router.delete('/events/:accountId/:calendarId/:eventId', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { accountId, calendarId, eventId } = req.params as {
    accountId: string;
    calendarId: string;
    eventId: string;
  };

  try {
    // Verify account belongs to user
    const account = await prisma.calendarAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found or unauthorized' });
    }

    // Verify calendarId is in user's selected calendars
    const selectedCalendars = (account.selectedCalendarIds || ['primary']) as string[];
    if (!selectedCalendars.includes(calendarId)) {
      return res.status(403).json({ error: 'Calendar not authorized' });
    }

    const provider = await getProviderForAccount(accountId);

    // Fetch event details before deletion for audit logging
    const event = await provider.getEvent(accountId, calendarId, eventId);
    const eventSummary = event?.summary || 'Unknown event';

    // Audit log before deletion
    console.log(`[AUDIT] Calendar event delete: userId=${userId}, accountId=${accountId}, calendarId=${calendarId}, eventId=${eventId}, summary="${eventSummary}"`);

    // Delete the event via Google Calendar API
    await provider.deleteEvent(accountId, calendarId, eventId);

    // Remove from cache if present
    await prisma.cachedCalendarEvent.deleteMany({
      where: { userId, accountId, calendarId, eventId },
    });

    res.json({ success: true, message: 'Event deleted', summary: eventSummary });
  } catch (error: any) {
    console.error('Delete event error:', error);
    if (error.code === 404) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(500).json({ error: error.message || 'Failed to delete event' });
  }
});


// POST /api/calendar/events/batch-update - Update multiple GCal events
router.post('/events/batch-update', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const { updates } = req.body;
  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({ error: 'updates array is required' });
  }

  try {
    const results: Array<{ eventId: string; success: boolean; error?: string }> = [];

    for (const update of updates) {
      const { accountId, calendarId, eventId, patch } = update;
      
      if (!accountId || !calendarId || !eventId || !patch) {
        results.push({ eventId: eventId || 'unknown', success: false, error: 'Missing required fields' });
        continue;
      }

      // Verify account belongs to user
      const account = await prisma.calendarAccount.findFirst({
        where: { id: accountId, userId },
      });
      
      if (!account) {
        results.push({ eventId, success: false, error: 'Account not found or unauthorized' });
        continue;
      }

      try {
        const provider = await getProviderForAccount(accountId);
        const updatedEvent = await provider.patchEvent(accountId, calendarId, eventId, patch);
        await upsertCalendarEvents(userId, accountId, calendarId, [updatedEvent]);
        results.push({ eventId, success: true });
      } catch (err: any) {
        console.error(`Failed to update event ${eventId}:`, err);
        results.push({ eventId, success: false, error: err.message || 'Update failed' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: successCount === updates.length,
      message: `Updated ${successCount}/${updates.length} events`,
      results 
    });
  } catch (error) {
    console.error('Batch update error:', error);
    res.status(500).json({ error: 'Failed to batch update events' });
  }
});


// ============================================
// Calendar Sync Endpoint
// ============================================

// POST /api/calendar/sync - Sync calendar events for the current/next week
router.post('/sync', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const { weekStart: requestedWeekStart } = req.body;
    
    // Get user's calendar accounts
    const accounts = await prisma.calendarAccount.findMany({ where: { userId } });
    
    if (accounts.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No calendar accounts connected',
        eventsSynced: 0 
      });
    }

    // Calculate week start if not provided
    let weekStart = requestedWeekStart;
    if (!weekStart) {
      const now = new Date();
      const weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() - now.getDay() + 1); // Monday of current week
      weekStart = weekStartDate.toISOString().split('T')[0];
    }

    // Use getWeekEventsWithCache with forceRefresh to sync and cache events
    const events = await getWeekEventsWithCache(userId, weekStart, { forceRefresh: true });

    res.json({ 
      success: true, 
      message: `Synced ${events.length} events from ${accounts.length} account(s)`,
      eventsSynced: events.length 
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    res.status(500).json({ error: 'Failed to sync calendar' });
  }
});


// ============================================
// Planning Session Endpoints
// ============================================

import {
  getOrCreatePlanningSession,
  updatePlanningSession,
  commitPlanningSession,
  deletePlanningSession,
} from '../../services/calendar/planningSessionService';

// GET /api/calendar/planning/session?weekStart=YYYY-MM-DD
router.get('/planning/session', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const weekStart = req.query.weekStart as string;
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart query param required (YYYY-MM-DD format)' });
  }

  try {
    const session = await getOrCreatePlanningSession(userId, weekStart);
    res.json(session);
  } catch (error) {
    console.error('Get planning session error:', error);
    res.status(500).json({ error: 'Failed to get planning session' });
  }
});

// PUT /api/calendar/planning/session
router.put('/planning/session', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const { weekStart, actionStates, gcalAssignments } = req.body;
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart required (YYYY-MM-DD format)' });
  }

  try {
    const session = await updatePlanningSession(userId, weekStart, {
      actionStates,
      gcalAssignments,
    });
    res.json(session);
  } catch (error) {
    console.error('Update planning session error:', error);
    res.status(500).json({ error: 'Failed to update planning session' });
  }
});

// POST /api/calendar/planning/session/commit
router.post('/planning/session/commit', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const { weekStart } = req.body;
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart required (YYYY-MM-DD format)' });
  }

  try {
    const session = await commitPlanningSession(userId, weekStart);
    res.json(session);
  } catch (error) {
    console.error('Commit planning session error:', error);
    res.status(500).json({ error: 'Failed to commit planning session' });
  }
});

// DELETE /api/calendar/planning/session?weekStart=YYYY-MM-DD
router.delete('/planning/session', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const weekStart = req.query.weekStart as string;
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart query param required (YYYY-MM-DD format)' });
  }

  try {
    const deleted = await deletePlanningSession(userId, weekStart);
    res.json({ success: deleted });
  } catch (error) {
    console.error('Delete planning session error:', error);
    res.status(500).json({ error: 'Failed to delete planning session' });
  }
});

// GET /api/calendar/events/day - Get all events for a specific day
router.get('/events/day', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const date = req.query.date as string;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
  }

  try {
    // Get user's timezone for correct day boundaries
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = user?.timezone || 'America/Los_Angeles';

    // Parse date in user's timezone and get start/end of day
    const dayStartLuxon = DateTime.fromISO(date, { zone: tz }).startOf('day');
    const dayEndLuxon = dayStartLuxon.endOf('day');
    const dayStart = dayStartLuxon.toJSDate();
    const dayEnd = dayEndLuxon.toJSDate();

    // Fetch events from cache (this will use the same week cache if available)
    const weekStart = startOfWeek(dayStart, { weekStartsOn: 1 });
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const cachedEvents = await getWeekEventsWithCache(userId, weekStartStr, { forceRefresh: false });

    // Filter to events within the day
    const dayEvents = cachedEvents.filter(e => {
      const eventStart = new Date(e.startDateTime);
      const eventEnd = new Date(e.endDateTime);
      return eventStart < dayEnd && eventEnd > dayStart;
    });

    // Transform to expected format
    const allEvents = dayEvents.map(e => ({
      id: e.eventId,
      accountId: e.accountId,
      calendarId: e.calendarId,
      summary: e.summary,
      description: e.description,
      location: e.location,
      start: { dateTime: e.startDateTime.toISOString() },
      end: { dateTime: e.endDateTime.toISOString() },
      attendees: e.attendees,
      htmlLink: e.htmlLink,
      recurringEventId: e.recurringEventId,
      iCalUID: e.iCalUID,
    }));

    // Load classification data in parallel (3 queries → 1 round-trip)
    const [rules, routineLinks, annotations] = await Promise.all([
      prisma.eventClassificationRule.findMany({
        where: { userId, isActive: true },
        include: { card: { select: { id: true, title: true, unitType: true, parentId: true } } },
        orderBy: { priority: 'desc' },
      }),
      prisma.routineCalendarLink.findMany({
        where: { userId },
        include: { card: { select: { id: true, title: true, unitType: true, parentId: true } } },
      }),
      prisma.calendarEventAnnotation.findMany({
        where: { userId },
        include: { card: { select: { id: true, title: true, unitType: true, parentId: true } } },
      }),
    ]);
    const routineLinkMap = new Map(routineLinks.map(l => [l.recurringEventId, l]));
    const annotationMap = new Map(annotations.filter(a => a.card).map(a => [a.eventId, a]));

    // Apply classification (same logic as events/week)
    const classifiedEvents = allEvents.map(event => {
      const eventTitle = (event.summary || '').trim();
      let classificationSource: string | undefined;
      let classificationConfidence: number | undefined;
      let assignedCardId: string | undefined;
      let assignedCardTitle: string | undefined;
      let assignedCardType: string | undefined;
      let assignedThemeId: string | undefined;

      // Check annotations
      const annotation = annotationMap.get(event.id);
      if (annotation && annotation.card) {
        assignedCardId = annotation.cardId!;
        assignedCardTitle = annotation.card.title;
        assignedCardType = annotation.card.unitType;
        assignedThemeId = annotation.card.parentId || undefined;
        classificationSource = 'annotation';
        classificationConfidence = 1.0;
      }

      // Check routine links
      if (!assignedCardId && event.recurringEventId) {
        const routineLink = routineLinkMap.get(event.recurringEventId);
        if (routineLink) {
          assignedCardId = routineLink.cardId;
          assignedCardTitle = routineLink.card.title;
          assignedCardType = routineLink.card.unitType;
          assignedThemeId = routineLink.card.parentId || undefined;
          classificationSource = 'routine_link';
          classificationConfidence = 1.0;
        }
      }

      // Check classification rules
      if (!assignedCardId) {
        for (const rule of rules) {
          let matches = false;
          if (rule.matchType === 'title_exact' && eventTitle === rule.matchValue) {
            matches = true;
          } else if (rule.matchType === 'title_contains' && eventTitle.toLowerCase().includes(rule.matchValue.toLowerCase())) {
            matches = true;
          }
          if (matches) {
            assignedCardId = rule.cardId;
            assignedCardTitle = rule.card.title;
            assignedCardType = rule.card.unitType;
            assignedThemeId = rule.card.parentId || undefined;
            classificationSource = 'rule';
            classificationConfidence = 0.95;
            break;
          }
        }
      }

      return {
        id: event.id,
        title: event.summary || '(No title)',
        start: event.start.dateTime,
        end: event.end.dateTime,
        source: 'gcal' as const,
        accountId: event.accountId,
        calendarId: event.calendarId,
        description: event.description,
        location: event.location,
        attendees: event.attendees,
        htmlLink: event.htmlLink,
        recurringEventId: event.recurringEventId,
        iCalUID: event.iCalUID,
        cardId: assignedCardId,
        cardTitle: assignedCardTitle,
        cardType: assignedCardType,
        themeId: assignedThemeId,
        colorIndex: assignedThemeId ? hashStringToIndex(assignedThemeId, 4) : undefined,
        classificationSource,
        classificationConfidence,
      };
    });

    res.json(classifiedEvents);
  } catch (error) {
    console.error('Get day events error:', error);
    res.status(500).json({ error: 'Failed to get day events' });
  }
});

export default router;
