/**
 * WorkItem: Normalized external item (event/task) that Kaizen can display.
 * Abstracts away provider specifics into a canonical representation.
 */

export type WorkItemKind = 'event' | 'task';

export type WorkItemSource =
  | 'google_calendar'
  | 'google_tasks'
  | 'notion'
  | 'kaizen';

export type WorkItemStatus = 'open' | 'done' | 'cancelled';

export interface WorkItem {
  // Identity
  kind: WorkItemKind;
  source: WorkItemSource;
  key: string; // Stable, globally-unique string

  // Display
  title: string;
  url?: string; // Deep link to source

  // Time fields (ISO strings)
  startAt?: string; // For events: start time
  endAt?: string; // For events: end time
  dueAt?: string; // For tasks: due date
  completedAt?: string; // For tasks: completion time

  // Status (optional, mainly for tasks)
  status?: WorkItemStatus;

  // Provider metadata
  raw?: unknown; // Original provider payload for debugging
}

/**
 * Key format conventions:
 * - Google Calendar: gcal:{accountId}:{calendarId}:{eventId}:{instanceKey}
 * - Google Tasks: gtasks:{accountId}:{tasklistId}:{taskId}
 * - Notion: notion:{accountId}:{databaseId}:{pageId}
 */
export function parseWorkItemKey(key: string): {
  source: string;
  accountId: string;
  segments: string[];
} {
  const [source, accountId, ...rest] = key.split(':');
  return { source, accountId, segments: rest };
}

/**
 * Build a stable key for a work item.
 */
export function buildWorkItemKey(
  source: string,
  accountId: string,
  ...segments: string[]
): string {
  return [source, accountId, ...segments].join(':');
}
