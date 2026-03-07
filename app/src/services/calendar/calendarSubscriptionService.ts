import { google } from 'googleapis';
import { prisma } from '../../lib/db';
import { getOAuth2Client } from './tokenService';
import { decryptToken } from '../../lib/crypto';
import { upsertCalendarEvents } from './calendarEventUpsertService';

async function getAuthClient(accountId: string) {
  const account = await prisma.calendarAccount.findUniqueOrThrow({ where: { id: accountId } });
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: decryptToken(account.accessTokenEncrypted) });
  return { oauth2Client };
}

/**
 * Initialize polling for a calendar: full sync to populate cache + store syncToken.
 * Called once after OAuth connect. The calendarPoller cron takes over from here.
 */
async function initCalendarPolling(
  userId: string,
  accountId: string,
  calendarId: string
): Promise<void> {
  const { oauth2Client } = await getAuthClient(accountId);
  const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendarApi.events.list({
    calendarId,
    singleEvents: true,
    maxResults: 2500,
    showDeleted: false,
  });

  const syncToken = response.data.nextSyncToken || null;
  await upsertCalendarEvents(userId, accountId, calendarId, response.data.items || []);

  await prisma.calendarWorkspaceSubscription.upsert({
    where: { accountId_calendarId: { accountId, calendarId } },
    update: { syncToken, state: 'active' },
    create: {
      userId,
      accountId,
      calendarId,
      subscriptionName: `poll_${accountId}_${calendarId}`,
      expiration: new Date('2099-01-01'),
      state: 'active',
      syncToken,
    },
  });

  console.log(`[calendarSubscription] Initialized polling for calendar ${calendarId}`);
}

/**
 * Set up polling for all selected calendars on an account.
 * Called after OAuth connect — fire-and-forget from caller.
 */
export async function setupSubscriptionsForAccount(
  userId: string,
  accountId: string
): Promise<void> {
  const account = await prisma.calendarAccount.findUnique({
    where: { id: accountId },
    select: { selectedCalendarIds: true },
  });
  if (!account) return;

  const calendarIds = (account.selectedCalendarIds || ['primary']) as string[];
  for (const calendarId of calendarIds) {
    try {
      await initCalendarPolling(userId, accountId, calendarId);
    } catch (err) {
      console.error(`[calendarSubscription] Failed to init calendar ${calendarId}:`, err);
    }
  }
}

/**
 * Remove all polling records for an account (called on disconnect).
 */
export async function deleteAllSubscriptionsForAccount(accountId: string): Promise<void> {
  await prisma.calendarWorkspaceSubscription.deleteMany({ where: { accountId } });
  console.log(`[calendarSubscription] Deleted all subscription records for account ${accountId}`);
}
