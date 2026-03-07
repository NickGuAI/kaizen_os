import { prisma } from '../../lib/db';
import { createHash } from 'crypto';
import { getProviderForAccount } from './providerFactory';
import { DateTime } from 'luxon';

const CACHE_TTL_MINUTES = 60 * 24 * 30; // 30 days — Pub/Sub keeps cache fresh; this is a safety fallback

interface CachedEvent {
  id: string;
  accountId: string;
  calendarId: string;
  eventId: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  startDateTime: Date;
  endDateTime: Date;
  isAllDay: boolean;
  attendees: any[];
  htmlLink: string | null;
  recurringEventId: string | null;
  iCalUID: string | null;
}

/**
 * Generate a content hash for change detection.
 * Hashes: summary, description, location, attendees
 */
function generateContentHash(event: {
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  attendees?: any[];
}): string {
  const content = JSON.stringify({
    summary: event.summary || '',
    description: event.description || '',
    location: event.location || '',
    attendees: (event.attendees || []).map((a: any) => a.email).sort(),
  });
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Get events for a week, using cache when available.
 * Returns cached events if fresh, otherwise fetches from Google and updates cache.
 */
export async function getWeekEventsWithCache(
  userId: string,
  weekStart: string,
  options: { forceRefresh?: boolean } = {}
): Promise<CachedEvent[]> {
  const { forceRefresh = false } = options;

  // Get user's timezone for correct date boundaries
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tz = user?.timezone || 'America/New_York';

  // Parse week boundaries using timezone-aware dates
  const start = DateTime.fromISO(weekStart, { zone: tz }).startOf('day');
  const end = start.plus({ days: 7 });
  const startDate = start.toJSDate();
  const endDate = end.toJSDate();

  // Get user's calendar accounts
  const accounts = await prisma.calendarAccount.findMany({ where: { userId } });
  if (accounts.length === 0) return [];

  const now = new Date();
  const allEvents = (
    await Promise.all(
      accounts.map(async (account) => {
        const selectedCalendars = (account.selectedCalendarIds || ['primary']) as string[];

        let provider: Awaited<ReturnType<typeof getProviderForAccount>> | null = null;
        try {
          provider = await getProviderForAccount(account.id);
        } catch (err) {
          console.error(`Failed to load provider for account ${account.id}:`, err);
          return [] as CachedEvent[];
        }

        const calendarResults = await Promise.all(
          selectedCalendars.map(async (calendarId) => {
            // Check cache first (unless force refresh)
            if (!forceRefresh) {
              const cachedEvents = await prisma.cachedCalendarEvent.findMany({
                where: {
                  userId,
                  accountId: account.id,
                  calendarId,
                  // Find events that OVERLAP with the week (not just contained within)
                  startDateTime: { lt: endDate }, // Event starts before week ends
                  endDateTime: { gt: startDate }, // Event ends after week starts
                },
              });

              if (cachedEvents.length > 0) {
                // Cache hit - use cached events
                return cachedEvents.map((e) => ({
                  id: e.id,
                  accountId: e.accountId,
                  calendarId: e.calendarId,
                  eventId: e.eventId,
                  summary: e.summary,
                  description: e.description,
                  location: e.location,
                  startDateTime: e.startDateTime,
                  endDateTime: e.endDateTime,
                  isAllDay: e.isAllDay,
                  attendees: e.attendees as any[],
                  htmlLink: e.htmlLink,
                  recurringEventId: e.recurringEventId,
                  iCalUID: e.iCalUID,
                }));
              }
            }

            // Cache miss or force refresh - fetch from Google
            try {
              const events = await provider.listEvents(
                account.id,
                calendarId,
                startDate.toISOString(),
                endDate.toISOString()
              );

              const expiresAt = new Date(now.getTime() + CACHE_TTL_MINUTES * 60 * 1000);

              // Prepare all upserts for batch execution (reduces N round-trips to 1)
              const upsertOps = events
                .filter(event => {
                  // Must have both start and end dates (same validation as original)
                  const hasStart = event.start?.dateTime || event.start?.date;
                  const hasEnd = event.end?.dateTime || event.end?.date;
                  return hasStart && hasEnd;
                })
                .map(event => {
                  const startDt = event.start?.dateTime || event.start?.date;
                  const endDt = event.end?.dateTime || event.end?.date;
                  const isAllDay = !event.start?.dateTime;
                  const contentHash = generateContentHash({
                    summary: event.summary,
                    description: event.description,
                    location: event.location,
                    attendees: event.attendees,
                  });

                  return prisma.cachedCalendarEvent.upsert({
                    where: {
                      accountId_calendarId_eventId: {
                        accountId: account.id,
                        calendarId,
                        eventId: event.id,
                      },
                    },
                    update: {
                      summary: event.summary || null,
                      description: event.description || null,
                      location: event.location || null,
                      startDateTime: new Date(startDt!),
                      endDateTime: new Date(endDt!),
                      isAllDay,
                      attendees: event.attendees || [],
                      htmlLink: event.htmlLink || null,
                      recurringEventId: event.recurringEventId || null,
                      iCalUID: event.iCalUID || null,
                      contentHash,
                      fetchedAt: now,
                      expiresAt,
                    },
                    create: {
                      userId,
                      accountId: account.id,
                      calendarId,
                      eventId: event.id,
                      summary: event.summary || null,
                      description: event.description || null,
                      location: event.location || null,
                      startDateTime: new Date(startDt!),
                      endDateTime: new Date(endDt!),
                      isAllDay,
                      attendees: event.attendees || [],
                      htmlLink: event.htmlLink || null,
                      recurringEventId: event.recurringEventId || null,
                      iCalUID: event.iCalUID || null,
                      contentHash,
                      fetchedAt: now,
                      expiresAt,
                    },
                  });
                });

              // Execute all upserts in a single transaction (1 round-trip instead of N)
              const cachedEvents = upsertOps.length > 0
                ? await prisma.$transaction(upsertOps)
                : [];

              // Remove cached entries that Google no longer returns (deleted/cancelled events)
              const freshEventIds = cachedEvents.map(e => e.eventId);
              if (freshEventIds.length > 0) {
                await prisma.cachedCalendarEvent.deleteMany({
                  where: {
                    userId,
                    accountId: account.id,
                    calendarId,
                    startDateTime: { lt: endDate },
                    endDateTime: { gt: startDate },
                    eventId: { notIn: freshEventIds },
                  },
                });
              }

              return cachedEvents.map(cached => ({
                id: cached.id,
                accountId: cached.accountId,
                calendarId: cached.calendarId,
                eventId: cached.eventId,
                summary: cached.summary,
                description: cached.description,
                location: cached.location,
                startDateTime: cached.startDateTime,
                endDateTime: cached.endDateTime,
                isAllDay: cached.isAllDay,
                attendees: cached.attendees as any[],
                htmlLink: cached.htmlLink,
                recurringEventId: cached.recurringEventId,
                iCalUID: cached.iCalUID,
              }));
            } catch (err) {
              console.error(`Failed to fetch events for calendar ${calendarId}:`, err);
              return [] as CachedEvent[];
            }
          })
        );

        return calendarResults.flat();
      })
    )
  ).flat();

  // Deduplicate same event instances appearing in multiple calendars.
  // Key must include start time to distinguish recurring event instances (they share iCalUID).
  const seen = new Map<string, CachedEvent>();
  for (const event of allEvents) {
    const dedupeKey = event.iCalUID
      ? `${event.iCalUID}|${event.startDateTime.toISOString()}`
      : `${event.summary}|${event.startDateTime.toISOString()}`;
    if (!seen.has(dedupeKey)) {
      seen.set(dedupeKey, event);
    }
  }

  return Array.from(seen.values());
}

/**
 * Invalidate cache for a user's calendars.
 * Called on manual sync or when events are modified.
 */
export async function invalidateEventCache(
  userId: string,
  options: { accountId?: string; calendarId?: string; weekStart?: string } = {}
): Promise<number> {
  const where: any = { userId };

  if (options.accountId) where.accountId = options.accountId;
  if (options.calendarId) where.calendarId = options.calendarId;

  if (options.weekStart) {
    // Get user's timezone for correct date boundaries
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const tz = user?.timezone || 'America/New_York';

    const start = DateTime.fromISO(options.weekStart, { zone: tz }).startOf('day');
    const end = start.plus({ days: 7 });
    const startDate = start.toJSDate();
    const endDate = end.toJSDate();

    // Find events that OVERLAP with the week
    where.startDateTime = { lt: endDate };
    where.endDateTime = { gt: startDate };
  }

  const result = await prisma.cachedCalendarEvent.deleteMany({ where });
  return result.count;
}
