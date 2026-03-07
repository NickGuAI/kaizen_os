import { google } from 'googleapis';
import { prisma } from '../../lib/db';
import { getAuthenticatedClient } from '../../services/calendar/tokenService';
import { upsertCalendarEvents } from '../../services/calendar/calendarEventUpsertService';

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function pollCalendar(sub: {
  id: string;
  userId: string;
  accountId: string;
  calendarId: string;
  syncToken: string | null;
}): Promise<void> {
  // getAuthenticatedClient handles token refresh (5-min buffer) and updates DB
  const oauth2Client = await getAuthenticatedClient(sub.accountId);
  const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

  let pageToken: string | undefined;
  const allEvents: any[] = [];
  let newSyncToken: string | null = null;

  try {
    do {
      const response = await calendarApi.events.list({
        calendarId: sub.calendarId,
        syncToken: sub.syncToken || undefined,
        showDeleted: true,
        singleEvents: true,
        ...(pageToken ? { pageToken } : {}),
      });
      allEvents.push(...(response.data.items || []));
      pageToken = response.data.nextPageToken || undefined;
      if (response.data.nextSyncToken) newSyncToken = response.data.nextSyncToken;
    } while (pageToken);
  } catch (err: any) {
    // syncToken expired — full re-sync
    if (err?.code === 410 || err?.status === 410) {
      console.log(`[calendarPoller] syncToken expired for ${sub.calendarId}, full re-sync`);
      const response = await calendarApi.events.list({
        calendarId: sub.calendarId,
        showDeleted: false,
        singleEvents: true,
        maxResults: 2500,
      });
      allEvents.push(...(response.data.items || []));
      newSyncToken = response.data.nextSyncToken || null;
    } else {
      throw err;
    }
  }

  if (!newSyncToken) return;

  // Upsert directly — syncToken advances only after successful DB write
  if (allEvents.length > 0) {
    await upsertCalendarEvents(sub.userId, sub.accountId, sub.calendarId, allEvents);
  }

  await prisma.calendarWorkspaceSubscription.update({
    where: { id: sub.id },
    data: { syncToken: newSyncToken },
  });
}

export async function runPoll(): Promise<void> {
  const subs = await prisma.calendarWorkspaceSubscription.findMany({
    where: { state: 'active' },
    select: { id: true, userId: true, accountId: true, calendarId: true, syncToken: true },
  });

  if (subs.length === 0) return;

  console.log(`[calendarPoller] Polling ${subs.length} calendar(s)`);

  await Promise.allSettled(
    subs.map(sub =>
      pollCalendar(sub).catch(err =>
        console.error(`[calendarPoller] Error polling ${sub.calendarId}:`, err)
      )
    )
  );
}

export function startCalendarPollerCron(): void {
  runPoll().catch(err => console.error('[calendarPoller] Initial poll failed:', err));
  setInterval(() => {
    runPoll().catch(err => console.error('[calendarPoller] Poll failed:', err));
  }, INTERVAL_MS);
  console.log('[calendarPoller] Calendar poller started (every 5 min)');
}
