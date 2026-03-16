import { WorkItemAdapter, ListForRangeParams } from '../WorkItemAdapter';
import { WorkItem, WorkItemSource, WorkItemKind, buildWorkItemKey } from '../WorkItemTypes';
import { prisma } from '../../../lib/db';
import { getProviderForAccount } from '../../calendar/providerFactory';
import { CalendarEvent } from '../../calendar/CalendarProvider';

/**
 * Google Calendar adapter.
 * Wraps existing GoogleCalendarProvider to emit WorkItems.
 * Fetches fresh each time (no caching) to avoid stale data.
 */
export class GoogleCalendarAdapter implements WorkItemAdapter {
  readonly source: WorkItemSource = 'google_calendar';
  readonly kinds: WorkItemKind[] = ['event'];

  async listForRange(params: ListForRangeParams): Promise<WorkItem[]> {
    const { userId, startIso, endIso, accountId } = params;

    // Get user's calendar accounts
    const accounts = await prisma.calendarAccount.findMany({
      where: {
        userId,
        provider: 'google',
        ...(accountId ? { id: accountId } : {}),
      },
    });

    if (accounts.length === 0) {
      return [];
    }

    const allWorkItems: WorkItem[] = [];

    for (const account of accounts) {
      const selectedCalendars = (account.selectedCalendarIds || ['primary']) as string[];

      try {
        const provider = await getProviderForAccount(account.id);

        for (const calendarId of selectedCalendars) {
          try {
            const events = await provider.listEvents(account.id, calendarId, startIso, endIso);

            const workItems = events.map((event) =>
              this.mapEventToWorkItem(event, account.id, calendarId)
            );

            allWorkItems.push(...workItems);
          } catch (calendarError) {
            console.error(`Failed to fetch calendar ${calendarId}:`, calendarError);
            // Continue with other calendars
          }
        }
      } catch (accountError) {
        console.error(`Failed to get provider for account ${account.id}:`, accountError);
        // Continue with other accounts
      }
    }

    return allWorkItems;
  }

  /**
   * Map CalendarEvent to WorkItem.
   * Key format: gcal:{accountId}:{calendarId}:{eventId}:{instanceKey}
   */
  private mapEventToWorkItem(
    event: CalendarEvent,
    accountId: string,
    calendarId: string
  ): WorkItem {
    const key = buildWorkItemKey('gcal', accountId, calendarId, event.id, event.instanceKey);

    const startAt = event.start.dateTime || event.start.date;
    const endAt = event.end.dateTime || event.end.date;

    return {
      kind: 'event',
      source: 'google_calendar',
      key,
      title: event.summary,
      url: event.htmlLink,
      startAt,
      endAt,
      raw: event,
    };
  }
}
