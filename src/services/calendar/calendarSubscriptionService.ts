import { createHmac, randomUUID } from 'crypto';
import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import { prisma } from '../../lib/db';
import { upsertCalendarEvents } from './calendarEventUpsertService';
import { getAuthenticatedClient } from './tokenService';

const DEFAULT_CALENDAR_IDS = ['primary'];
const WATCH_TTL_SECONDS = 7 * 24 * 60 * 60;
const RENEW_LOOKAHEAD_MS = 2 * 24 * 60 * 60 * 1000;

interface WatchChannelDetails {
  channelId: string;
  channelToken: string;
  resourceId: string;
  expiration: Date;
  channelAddress: string;
}

function getWebhookAddress(): string | null {
  const explicit = process.env.GOOGLE_CALENDAR_PUSH_WEBHOOK_URL;
  if (explicit) return explicit;

  const appBaseUrl = process.env.APP_BASE_URL;
  if (!appBaseUrl) return null;

  const normalized = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl;
  return `${normalized}/api/calendar/push`;
}

function getStateSecret(): string | null {
  return (
    process.env.GOOGLE_CALENDAR_CHANNEL_SECRET ||
    process.env.GOOGLE_OAUTH_STATE_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    null
  );
}

function generateChannelToken(userId: string, accountId: string, calendarId: string): string {
  const nonce = randomUUID();
  const payload = `${userId}:${accountId}:${calendarId}:${nonce}`;
  const secret = getStateSecret();

  if (!secret) {
    return `v1.${nonce}`;
  }

  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `v1.${nonce}.${signature}`;
}

function normalizeSelectedCalendarIds(ids: unknown): string[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [...DEFAULT_CALENDAR_IDS];
  }

  const normalized = ids
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter(Boolean);

  return normalized.length > 0 ? Array.from(new Set(normalized)) : [...DEFAULT_CALENDAR_IDS];
}

async function getCalendarApi(accountId: string) {
  const oauth2Client = await getAuthenticatedClient(accountId);
  const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });
  return { oauth2Client, calendarApi };
}

async function pullFullSyncSnapshot(
  userId: string,
  accountId: string,
  calendarId: string,
  calendarApi: calendar_v3.Calendar
): Promise<string | null> {
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;
  const events: calendar_v3.Schema$Event[] = [];

  do {
    const response = await calendarApi.events.list({
      calendarId,
      showDeleted: false,
      singleEvents: true,
      maxResults: 2500,
      ...(pageToken ? { pageToken } : {}),
    });

    events.push(...(response.data.items || []));
    pageToken = response.data.nextPageToken || undefined;

    if (response.data.nextSyncToken) {
      nextSyncToken = response.data.nextSyncToken;
    }
  } while (pageToken);

  await prisma.cachedCalendarEvent.deleteMany({
    where: { userId, accountId, calendarId },
  });

  if (events.length > 0) {
    await upsertCalendarEvents(userId, accountId, calendarId, events);
  }

  return nextSyncToken;
}

async function stopChannel(
  accountId: string,
  channelId: string | null,
  resourceId: string | null
): Promise<void> {
  if (!channelId || !resourceId) return;

  try {
    const { calendarApi } = await getCalendarApi(accountId);
    await calendarApi.channels.stop({
      requestBody: {
        id: channelId,
        resourceId,
      },
    });
  } catch (error) {
    console.warn('[calendarSubscription] Failed to stop Google channel', {
      accountId,
      channelId,
      error,
    });
  }
}

async function createWatchChannel(
  userId: string,
  accountId: string,
  calendarId: string,
  calendarApi: calendar_v3.Calendar,
  webhookAddress: string
): Promise<WatchChannelDetails> {
  const channelId = randomUUID();
  const channelToken = generateChannelToken(userId, accountId, calendarId);

  const response = await calendarApi.events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookAddress,
      token: channelToken,
      params: {
        ttl: String(WATCH_TTL_SECONDS),
      },
    },
  });

  const resourceId = response.data.resourceId;
  const expirationRaw = response.data.expiration;

  if (!resourceId || !expirationRaw) {
    throw new Error(`Invalid watch response for ${calendarId}: missing resourceId/expiration`);
  }

  const expirationMs = Number(expirationRaw);
  if (!Number.isFinite(expirationMs)) {
    throw new Error(`Invalid watch response for ${calendarId}: malformed expiration`);
  }

  return {
    channelId,
    channelToken,
    resourceId,
    expiration: new Date(expirationMs),
    channelAddress: webhookAddress,
  };
}

async function upsertPollOnlySubscription(
  userId: string,
  accountId: string,
  calendarId: string,
  syncToken: string | null,
  errorMessage: string | null = null
): Promise<void> {
  const fallbackExpiration = new Date(Date.now() + RENEW_LOOKAHEAD_MS);

  await prisma.calendarWorkspaceSubscription.upsert({
    where: { accountId_calendarId: { accountId, calendarId } },
    update: {
      state: 'stale',
      expiration: fallbackExpiration,
      syncToken,
      resourceId: null,
      channelId: null,
      channelToken: null,
      channelAddress: null,
      subscriptionName: `poll_only_${accountId}_${calendarId}`,
      lastError: errorMessage,
    },
    create: {
      userId,
      accountId,
      calendarId,
      subscriptionName: `poll_only_${accountId}_${calendarId}`,
      expiration: fallbackExpiration,
      state: 'stale',
      syncToken,
      lastError: errorMessage,
    },
  });
}

async function ensureWatchChannelForCalendar(
  userId: string,
  accountId: string,
  calendarId: string,
  options: { skipFullSync?: boolean } = {}
): Promise<void> {
  const { skipFullSync = false } = options;
  const existing = await prisma.calendarWorkspaceSubscription.findUnique({
    where: { accountId_calendarId: { accountId, calendarId } },
    select: {
      id: true,
      channelId: true,
      subscriptionName: true,
      resourceId: true,
      syncToken: true,
      state: true,
    },
  });

  const { calendarApi } = await getCalendarApi(accountId);

  let syncToken = existing?.syncToken || null;
  if (!skipFullSync || !syncToken) {
    syncToken = await pullFullSyncSnapshot(userId, accountId, calendarId, calendarApi);
  }

  const webhookAddress = getWebhookAddress();
  if (!webhookAddress) {
    await upsertPollOnlySubscription(
      userId,
      accountId,
      calendarId,
      syncToken,
      'GOOGLE_CALENDAR_PUSH_WEBHOOK_URL or APP_BASE_URL not configured'
    );
    return;
  }

  try {
    const watchChannel = await createWatchChannel(
      userId,
      accountId,
      calendarId,
      calendarApi,
      webhookAddress
    );

    await prisma.calendarWorkspaceSubscription.upsert({
      where: { accountId_calendarId: { accountId, calendarId } },
      update: {
        channelId: watchChannel.channelId,
        subscriptionName: watchChannel.channelId,
        state: 'active',
        resourceId: watchChannel.resourceId,
        syncToken,
        channelToken: watchChannel.channelToken,
        channelAddress: watchChannel.channelAddress,
        expiration: watchChannel.expiration,
        lastError: null,
      },
      create: {
        userId,
        accountId,
        calendarId,
        channelId: watchChannel.channelId,
        subscriptionName: watchChannel.channelId,
        expiration: watchChannel.expiration,
        state: 'active',
        resourceId: watchChannel.resourceId,
        syncToken,
        channelToken: watchChannel.channelToken,
        channelAddress: watchChannel.channelAddress,
      },
    });

    const oldChannelId = existing?.channelId || existing?.subscriptionName || null;
    if (existing?.resourceId && oldChannelId !== watchChannel.channelId) {
      await stopChannel(accountId, oldChannelId, existing.resourceId);
    }
  } catch (error) {
    console.error('[calendarSubscription] Failed to create watch channel', {
      accountId,
      calendarId,
      error,
    });

    await upsertPollOnlySubscription(
      userId,
      accountId,
      calendarId,
      syncToken,
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function stopAndDeleteSubscriptions(
  accountId: string,
  calendarIds: string[]
): Promise<void> {
  if (calendarIds.length === 0) return;

  const subs = await prisma.calendarWorkspaceSubscription.findMany({
    where: {
      accountId,
      calendarId: { in: calendarIds },
    },
    select: {
      id: true,
      userId: true,
      calendarId: true,
      channelId: true,
      subscriptionName: true,
      resourceId: true,
    },
  });

  await Promise.all(
    subs.map(async (sub) => {
      await stopChannel(accountId, sub.channelId || sub.subscriptionName, sub.resourceId);
      await prisma.cachedCalendarEvent.deleteMany({
        where: {
          userId: sub.userId,
          accountId,
          calendarId: sub.calendarId,
        },
      });
    })
  );

  await prisma.calendarWorkspaceSubscription.deleteMany({
    where: {
      accountId,
      calendarId: { in: calendarIds },
    },
  });
}

export async function setupSubscriptionsForAccount(
  userId: string,
  accountId: string
): Promise<void> {
  const account = await prisma.calendarAccount.findUnique({
    where: { id: accountId },
    select: { selectedCalendarIds: true },
  });

  if (!account) return;

  const calendarIds = normalizeSelectedCalendarIds(account.selectedCalendarIds);
  await reconcileSubscriptionsForAccount(userId, accountId, calendarIds);
}

export async function reconcileSubscriptionsForAccount(
  userId: string,
  accountId: string,
  selectedCalendarIdsRaw: unknown
): Promise<void> {
  const selectedCalendarIds = normalizeSelectedCalendarIds(selectedCalendarIdsRaw);

  const existing = await prisma.calendarWorkspaceSubscription.findMany({
    where: { accountId },
    select: { calendarId: true },
  });

  const existingSet = new Set(existing.map((sub) => sub.calendarId));
  const selectedSet = new Set(selectedCalendarIds);

  const toRemove = [...existingSet].filter((calendarId) => !selectedSet.has(calendarId));
  if (toRemove.length > 0) {
    await stopAndDeleteSubscriptions(accountId, toRemove);
  }

  for (const calendarId of selectedCalendarIds) {
    try {
      await ensureWatchChannelForCalendar(userId, accountId, calendarId);
    } catch (error) {
      console.error('[calendarSubscription] Failed to reconcile calendar', {
        userId,
        accountId,
        calendarId,
        error,
      });
    }
  }
}

export async function renewExpiringSubscriptions(): Promise<void> {
  const renewalThreshold = new Date(Date.now() + RENEW_LOOKAHEAD_MS);
  const expiring = await prisma.calendarWorkspaceSubscription.findMany({
    where: {
      state: { in: ['active', 'stale'] },
      expiration: { lte: renewalThreshold },
    },
    select: {
      id: true,
      userId: true,
      accountId: true,
      calendarId: true,
    },
  });

  for (const sub of expiring) {
    try {
      await ensureWatchChannelForCalendar(sub.userId, sub.accountId, sub.calendarId, {
        skipFullSync: true,
      });
    } catch (error) {
      await prisma.calendarWorkspaceSubscription.update({
        where: { id: sub.id },
        data: {
          state: 'stale',
          lastError: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}

export async function deleteAllSubscriptionsForAccount(accountId: string): Promise<void> {
  const subs = await prisma.calendarWorkspaceSubscription.findMany({
    where: { accountId },
    select: { calendarId: true },
  });

  const calendarIds = subs.map((sub) => sub.calendarId);
  await stopAndDeleteSubscriptions(accountId, calendarIds);
}
