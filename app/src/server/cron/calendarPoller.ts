import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import { prisma } from '../../lib/db';
import { getAuthenticatedClient } from '../../services/calendar/tokenService';
import { upsertCalendarEvents } from '../../services/calendar/calendarEventUpsertService';
import { renewExpiringSubscriptions } from '../../services/calendar/calendarSubscriptionService';

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export interface CalendarSubscriptionSyncTarget {
  id: string;
  userId: string;
  accountId: string;
  calendarId: string;
  syncToken: string | null;
}

async function fetchIncrementalChanges(
  calendarApi: calendar_v3.Calendar,
  calendarId: string,
  syncToken: string
): Promise<{ events: calendar_v3.Schema$Event[]; nextSyncToken: string | null }> {
  let pageToken: string | undefined;
  const events: calendar_v3.Schema$Event[] = [];
  let nextSyncToken: string | null = null;

  do {
    const response = await calendarApi.events.list({
      calendarId,
      syncToken,
      showDeleted: true,
      singleEvents: true,
      ...(pageToken ? { pageToken } : {}),
    });

    events.push(...(response.data.items || []));
    pageToken = response.data.nextPageToken || undefined;

    if (response.data.nextSyncToken) {
      nextSyncToken = response.data.nextSyncToken;
    }
  } while (pageToken);

  return { events, nextSyncToken };
}

async function fetchFullSnapshot(
  calendarApi: calendar_v3.Calendar,
  calendarId: string
): Promise<{ events: calendar_v3.Schema$Event[]; nextSyncToken: string | null }> {
  let pageToken: string | undefined;
  const events: calendar_v3.Schema$Event[] = [];
  let nextSyncToken: string | null = null;

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

  return { events, nextSyncToken };
}

export async function syncSubscriptionIncremental(
  sub: CalendarSubscriptionSyncTarget
): Promise<void> {
  try {
    const oauth2Client = await getAuthenticatedClient(sub.accountId);
    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

    let events: calendar_v3.Schema$Event[] = [];
    let newSyncToken: string | null = sub.syncToken;
    let fullResync = false;

    if (sub.syncToken) {
      try {
        const incremental = await fetchIncrementalChanges(calendarApi, sub.calendarId, sub.syncToken);
        events = incremental.events;
        newSyncToken = incremental.nextSyncToken || sub.syncToken;
      } catch (err: any) {
        if (err?.code === 410 || err?.status === 410) {
          fullResync = true;
          const fullSnapshot = await fetchFullSnapshot(calendarApi, sub.calendarId);
          events = fullSnapshot.events;
          newSyncToken = fullSnapshot.nextSyncToken;
        } else {
          throw err;
        }
      }
    } else {
      fullResync = true;
      const fullSnapshot = await fetchFullSnapshot(calendarApi, sub.calendarId);
      events = fullSnapshot.events;
      newSyncToken = fullSnapshot.nextSyncToken;
    }

    if (fullResync) {
      await prisma.cachedCalendarEvent.deleteMany({
        where: {
          userId: sub.userId,
          accountId: sub.accountId,
          calendarId: sub.calendarId,
        },
      });
    }

    if (events.length > 0) {
      await upsertCalendarEvents(sub.userId, sub.accountId, sub.calendarId, events);
    }

    await prisma.calendarWorkspaceSubscription.update({
      where: { id: sub.id },
      data: {
        syncToken: newSyncToken,
        lastSyncedAt: new Date(),
        lastError: null,
        ...(fullResync ? { state: 'active' } : {}),
      },
    });
  } catch (error) {
    await prisma.calendarWorkspaceSubscription.update({
      where: { id: sub.id },
      data: {
        state: 'stale',
        lastError: error instanceof Error ? error.message : String(error),
      },
    }).catch(() => undefined);

    throw error;
  }
}

export async function syncSubscriptionByChannelId(channelId: string): Promise<void> {
  const byChannelId = await prisma.calendarWorkspaceSubscription.findUnique({
    where: { channelId },
    select: {
      id: true,
      userId: true,
      accountId: true,
      calendarId: true,
      syncToken: true,
      state: true,
    },
  });

  const sub = byChannelId || (await prisma.calendarWorkspaceSubscription.findUnique({
    where: { subscriptionName: channelId },
    select: {
      id: true,
      userId: true,
      accountId: true,
      calendarId: true,
      syncToken: true,
      state: true,
    },
  }));

  if (!sub || sub.state === 'stopped') return;

  await syncSubscriptionIncremental(sub);
}

export async function runPoll(): Promise<void> {
  await renewExpiringSubscriptions();

  const subs = await prisma.calendarWorkspaceSubscription.findMany({
    where: {
      state: { not: 'stopped' },
    },
    select: {
      id: true,
      userId: true,
      accountId: true,
      calendarId: true,
      syncToken: true,
    },
  });

  if (subs.length === 0) return;

  console.log(`[calendarPoller] Fallback polling ${subs.length} calendar channel(s)`);

  await Promise.allSettled(
    subs.map((sub) =>
      syncSubscriptionIncremental(sub).catch((err) =>
        console.error(`[calendarPoller] Error polling ${sub.calendarId}:`, err)
      )
    )
  );
}

export function startCalendarPollerCron(): void {
  runPoll().catch((err) => console.error('[calendarPoller] Initial poll failed:', err));
  setInterval(() => {
    runPoll().catch((err) => console.error('[calendarPoller] Poll failed:', err));
  }, INTERVAL_MS);
  console.log('[calendarPoller] Calendar poller started (every 30 min)');
}
