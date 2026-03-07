import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';

/**
 * Upsert/delete calendar events in the cache.
 * Idempotent — safe to call multiple times with the same events.
 */
export async function upsertCalendarEvents(
  userId: string,
  accountId: string,
  calendarId: string,
  events: any[]
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const upsertOps = events
    .filter(e => e.status !== 'cancelled' && (e.start?.dateTime || e.start?.date))
    .map(event => {
      const startDt = event.start.dateTime || event.start.date;
      const endDt = event.end?.dateTime || event.end?.date;
      const isAllDay = !event.start.dateTime;
      const contentHash = createHash('sha256')
        .update(JSON.stringify({
          summary: event.summary || '',
          description: event.description || '',
          location: event.location || '',
          attendees: (event.attendees || []).map((a: any) => a.email).sort(),
        }))
        .digest('hex');

      return prisma.cachedCalendarEvent.upsert({
        where: { accountId_calendarId_eventId: { accountId, calendarId, eventId: event.id } },
        update: {
          summary: event.summary || null,
          description: event.description || null,
          location: event.location || null,
          startDateTime: new Date(startDt),
          endDateTime: new Date(endDt),
          isAllDay,
          attendees: (event.attendees || []) as unknown as Prisma.InputJsonValue,
          htmlLink: event.htmlLink || null,
          recurringEventId: event.recurringEventId || null,
          iCalUID: event.iCalUID || null,
          contentHash,
          fetchedAt: now,
          expiresAt,
        },
        create: {
          userId,
          accountId,
          calendarId,
          eventId: event.id,
          summary: event.summary || null,
          description: event.description || null,
          location: event.location || null,
          startDateTime: new Date(startDt),
          endDateTime: new Date(endDt),
          isAllDay,
          attendees: (event.attendees || []) as unknown as Prisma.InputJsonValue,
          htmlLink: event.htmlLink || null,
          recurringEventId: event.recurringEventId || null,
          iCalUID: event.iCalUID || null,
          contentHash,
          fetchedAt: now,
          expiresAt,
        },
      });
    });

  const cancelledIds = events
    .filter(e => e.status === 'cancelled')
    .map(e => e.id)
    .filter(Boolean);

  await prisma.$transaction([
    ...upsertOps,
    ...(cancelledIds.length > 0
      ? [prisma.cachedCalendarEvent.deleteMany({
          where: { accountId, calendarId, eventId: { in: cancelledIds } },
        })]
      : []),
  ]);
}
