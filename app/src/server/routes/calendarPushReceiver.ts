import { createHmac, timingSafeEqual } from 'crypto';
import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { prisma } from '../../lib/db';
import { encryptToken } from '../../lib/crypto';
import { getOAuth2Client } from '../../services/calendar/tokenService';
import { setupSubscriptionsForAccount } from '../../services/calendar/calendarSubscriptionService';
import { syncSubscriptionByChannelId } from '../cron/calendarPoller';

const router = Router();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/tasks',
];

interface OAuthStateData {
  userId: string;
  redirect?: string;
  nativeCallback?: string;
  nativeFlow?: boolean;
  issuedAt?: number;
  redirectUri?: string;
}

interface CalendarPushHeaders {
  channelId: string | null;
  resourceId: string | null;
  channelToken: string | null;
  resourceState: string | null;
  messageNumber: bigint | null;
}

function isValidRedirectPath(redirect: string | undefined): boolean {
  if (!redirect) return false;
  return redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes(':');
}

function getOAuthStateSecret(): string | null {
  return (
    process.env.GOOGLE_OAUTH_STATE_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    null
  );
}

function decodeSignedState(rawState: string): OAuthStateData | null {
  const [payload, signature] = rawState.split('.');
  if (!payload || !signature) return null;

  const secret = getOAuthStateSecret();
  if (!secret) return null;

  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const matches =
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

  if (!matches) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as OAuthStateData;
    if (!parsed.userId) return null;

    if (parsed.issuedAt) {
      const ageMs = Date.now() - parsed.issuedAt;
      if (ageMs < 0 || ageMs > 15 * 60 * 1000) {
        return null;
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

function decodeOAuthState(rawState: string | undefined): OAuthStateData | null {
  if (!rawState) return null;

  const signedState = decodeSignedState(rawState);
  if (signedState) return signedState;

  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64').toString('utf-8')) as OAuthStateData;
    if (!parsed.userId) return null;
    return parsed;
  } catch {
    return { userId: rawState };
  }
}

function isValidNativeCallbackUri(uri: string | undefined): boolean {
  if (!uri) return false;

  try {
    const parsed = new URL(uri);
    const disallowed = parsed.protocol === 'javascript:' || parsed.protocol === 'data:';
    if (disallowed) return false;

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const appBaseUrl = process.env.APP_BASE_URL;
      if (!appBaseUrl) return false;
      return parsed.origin === new URL(appBaseUrl).origin;
    }

    return /^[a-z][a-z0-9+.-]*:$/.test(parsed.protocol);
  } catch {
    return false;
  }
}

function appendQuery(urlOrPath: string, key: string, value: string): string {
  if (urlOrPath.startsWith('/')) {
    return `${urlOrPath}${urlOrPath.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`;
  }

  try {
    const parsed = new URL(urlOrPath);
    parsed.searchParams.set(key, value);
    return parsed.toString();
  } catch {
    return urlOrPath;
  }
}

export function readCalendarPushHeaders(req: Request): CalendarPushHeaders {
  const channelId = req.header('x-goog-channel-id');
  const resourceId = req.header('x-goog-resource-id');
  const channelToken = req.header('x-goog-channel-token');
  const resourceState = req.header('x-goog-resource-state');
  const messageNumberRaw = req.header('x-goog-message-number');

  let messageNumber: bigint | null = null;
  if (messageNumberRaw) {
    try {
      messageNumber = BigInt(messageNumberRaw);
    } catch {
      messageNumber = null;
    }
  }

  return {
    channelId,
    resourceId,
    channelToken,
    resourceState,
    messageNumber,
  };
}

// POST /api/calendar/pubsub
// Google Calendar push notifications are header-driven (no payload body required).
router.post('/', async (req: Request, res: Response) => {
  const { channelId, resourceId, channelToken, resourceState, messageNumber } =
    readCalendarPushHeaders(req);

  if (!channelId || !resourceId || !channelToken) {
    return res.status(400).json({ error: 'Missing required X-Goog headers' });
  }

  const subscription = await prisma.calendarWorkspaceSubscription.findUnique({
    where: { subscriptionName: channelId },
    select: {
      id: true,
      subscriptionName: true,
      resourceId: true,
      channelToken: true,
      state: true,
      lastMessageNumber: true,
    },
  });

  if (!subscription || subscription.state === 'stopped') {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  if (subscription.resourceId !== resourceId || subscription.channelToken !== channelToken) {
    return res.status(401).json({ error: 'Channel validation failed' });
  }

  if (messageNumber !== null) {
    const updated = await prisma.calendarWorkspaceSubscription.updateMany({
      where: {
        id: subscription.id,
        OR: [{ lastMessageNumber: null }, { lastMessageNumber: { lt: messageNumber } }],
      },
      data: {
        state: 'active',
        lastMessageNumber: messageNumber,
        lastNotificationAt: new Date(),
        lastError: null,
      },
    });

    if (updated.count === 0) {
      return res.status(200).json({ ok: true, duplicate: true });
    }
  } else {
    await prisma.calendarWorkspaceSubscription.update({
      where: { id: subscription.id },
      data: {
        state: 'active',
        lastNotificationAt: new Date(),
        lastError: null,
      },
    });
  }

  res.status(200).json({ ok: true });

  if (resourceState === 'not_exists') {
    await prisma.calendarWorkspaceSubscription.update({
      where: { id: subscription.id },
      data: {
        state: 'stale',
        lastError: 'Resource no longer exists',
      },
    }).catch((error) => console.error('[calendarPush] Failed to mark not_exists state:', error));
    return;
  }

  syncSubscriptionByChannelId(channelId).catch((error) => {
    console.error('[calendarPush] Incremental sync failed:', error);
  });
});

// GET /api/calendar/pubsub/google/callback
// Native/system-browser OAuth callback path (unauthed route, state-signed).
router.get('/google/callback', async (req: Request, res: Response) => {
  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  const stateRaw = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;

  const state = decodeOAuthState(typeof stateRaw === 'string' ? stateRaw : undefined);
  if (!code || !state?.userId) {
    return res.status(400).json({ error: 'Missing or invalid OAuth callback params' });
  }

  const redirectPath = isValidRedirectPath(state.redirect) ? state.redirect! : '/settings';
  const nativeCallback = isValidNativeCallbackUri(state.nativeCallback)
    ? state.nativeCallback
    : undefined;

  const successBase = nativeCallback || redirectPath;
  const errorBase = nativeCallback || redirectPath;

  try {
    const oauth2Client = getOAuth2Client();
    const tokenResponse = await oauth2Client.getToken({
      code: code as string,
      ...(state.redirectUri ? { redirect_uri: state.redirectUri } : {}),
    });

    const tokens = tokenResponse.tokens;

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens in response');
    }

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email) {
      throw new Error('Could not get user email');
    }

    await prisma.calendarAccount.upsert({
      where: {
        userId_provider_email: {
          userId: state.userId,
          provider: 'google',
          email: userInfo.email,
        },
      },
      update: {
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted: encryptToken(tokens.refresh_token),
        expiresAt: new Date(tokens.expiry_date || Date.now() + 60 * 60 * 1000),
        scopes: SCOPES,
      },
      create: {
        userId: state.userId,
        provider: 'google',
        email: userInfo.email,
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted: encryptToken(tokens.refresh_token),
        expiresAt: new Date(tokens.expiry_date || Date.now() + 60 * 60 * 1000),
        scopes: SCOPES,
      },
    });

    const account = await prisma.calendarAccount.findFirst({
      where: { userId: state.userId, provider: 'google', email: userInfo.email },
      select: { id: true },
    });

    if (account) {
      setupSubscriptionsForAccount(state.userId, account.id).catch((error) => {
        console.error('[calendarPush/callback] subscription setup failed:', error);
      });
    }

    const successUrl = appendQuery(appendQuery(successBase, 'connected', 'true'), 'native', state.nativeFlow ? '1' : '0');
    return res.redirect(successUrl);
  } catch (error) {
    console.error('[calendarPush/callback] OAuth callback error:', error);
    const errorUrl = appendQuery(errorBase, 'error', 'auth_failed');
    return res.redirect(errorUrl);
  }
});

export default router;
