import { Prisma } from '@prisma/client';
import { WorkItem, WorkItemKind, WorkItemSource, parseWorkItemKey } from './WorkItemTypes';
import { getEnabledAdapters } from './adapterFactory';
import { prisma } from '../../lib/db';
import { localDateToIsoRangeWithTz, parseLocalDate } from '../../utils/dateUtils';

/**
 * WorkItem with overlay data (linkedCardId, focusRank).
 */
export interface WorkItemWithOverlays extends WorkItem {
  linkedCardId?: string;
  linkedCardTitle?: string;
  focusRank?: number; // 1, 2, or 3
  playlistRank?: number;
  isSnack?: boolean; // true if flagged as snack-size task (<10 min, in-between meetings)
}

/**
 * Unified service for fetching WorkItems from all sources.
 * Aggregates results from all enabled adapters for a user.
 */
export async function getWorkItemsForRange(
  userId: string,
  startIso: string,
  endIso: string
): Promise<WorkItem[]> {
  const adapters = getEnabledAdapters(userId);

  // Fetch from all adapters in parallel
  const results = await Promise.allSettled(
    adapters.map((adapter) => adapter.listForRange({ userId, startIso, endIso }))
  );

  // Collect successful results, log failures
  const workItems: WorkItem[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      workItems.push(...result.value);
    } else {
      console.error(`Adapter ${adapters[i].source} failed:`, result.reason);
    }
  });

  // Deduplicate by title + time (same item from multiple sources)
  const seen = new Map<string, WorkItem>();
  for (const item of workItems) {
    const dedupeKey = `${item.title}|${item.startAt || item.dueAt || ''}`;
    if (!seen.has(dedupeKey)) {
      seen.set(dedupeKey, item);
    }
  }
  const dedupedItems = Array.from(seen.values());

  // Sort by start time
  dedupedItems.sort((a, b) => {
    const aTime = a.startAt || a.dueAt || '';
    const bTime = b.startAt || b.dueAt || '';
    return aTime.localeCompare(bTime);
  });

  return dedupedItems;
}

/**
 * Get work items for a specific day with overlays attached.
 * Returns only tasks - calendar events are shown in Arena and triaged during weekly review.
 * Includes both:
 * - Tasks due on this date (from provider API)
 * - Tasks planned for this date (from WorkItemLink.plannedForDate)
 */
export async function getWorkItemsForDay(
  userId: string,
  date: string,
  timezone: string
): Promise<WorkItemWithOverlays[]> {
  const { start: startIso, end: endIso } = localDateToIsoRangeWithTz(date, timezone);

  // 1. Fetch tasks by date range (current behavior - tasks due on this date)
  const allItems = await getWorkItemsForRange(userId, startIso, endIso);
  const tasks = allItems.filter(item => item.kind === 'task');
  const tasksByKey = new Map(tasks.map(t => [t.key, t]));

  // 2. Query WorkItemLink for tasks planned for this date
  const plannedLinks = await prisma.workItemLink.findMany({
    where: {
      userId,
      plannedForDate: parseLocalDate(date),
      kind: 'task',
    },
    select: { workItemKey: true },
  });

  // 3. Find planned keys not already in the date-range results
  const missingKeys = plannedLinks
    .map(l => l.workItemKey)
    .filter(key => !tasksByKey.has(key));

  // 4. Fetch missing planned tasks by keys
  if (missingKeys.length > 0) {
    const adapters = getEnabledAdapters(userId);
    const fetchResults = await Promise.allSettled(
      adapters
        .filter(a => a.listByKeys)
        .map(a => a.listByKeys!(userId, missingKeys))
    );

    for (const result of fetchResults) {
      if (result.status === 'fulfilled') {
        for (const item of result.value) {
          if (!tasksByKey.has(item.key)) {
            tasksByKey.set(item.key, item);
          }
        }
      }
    }
  }

  // 5. Convert back to array, attach overlays, then sort by playlistRank (nulls last)
  const mergedTasks = Array.from(tasksByKey.values());
  const withOverlays = await attachOverlays(userId, date, mergedTasks);
  withOverlays.sort((a, b) => {
    const aRank = a.playlistRank ?? Number.MAX_SAFE_INTEGER;
    const bRank = b.playlistRank ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    // Fallback: sort by time for items with same/no rank
    const aTime = a.startAt || a.dueAt || '';
    const bTime = b.startAt || b.dueAt || '';
    return aTime.localeCompare(bTime);
  });

  return withOverlays;
}

/**
 * Attach overlays (linkedCardId, focusRank) to work items.
 */
export async function attachOverlays(
  userId: string,
  date: string,
  workItems: WorkItem[]
): Promise<WorkItemWithOverlays[]> {
  if (workItems.length === 0) {
    return [];
  }

  const workItemKeys = workItems.map((w) => w.key);

  // Fetch WorkItemLinks for these keys
  const links = await prisma.workItemLink.findMany({
    where: {
      userId,
      workItemKey: { in: workItemKeys },
    },
    include: {
      card: { select: { id: true, title: true } },
    },
  });

  const linkMap = new Map(links.map((l) => [l.workItemKey, l]));

  // Fetch DailyFocus for this date
  const focus = await prisma.dailyFocus.findUnique({
    where: {
      userId_date: {
        userId,
        date: parseLocalDate(date),
      },
    },
  });

  const focusKeys = (focus?.topKeys as string[]) || [];
  const focusMap = new Map(focusKeys.map((key, idx) => [key, idx + 1])); // 1-indexed rank

  // Attach overlays to work items
  return workItems.map((item) => {
    const link = linkMap.get(item.key);
    const focusRank = focusMap.get(item.key);

    const result: WorkItemWithOverlays = { ...item };

    if (link?.card) {
      result.linkedCardId = link.cardId || undefined;
      result.linkedCardTitle = link.card?.title;
    }

    if (link?.playlistRank != null) {
      result.playlistRank = link.playlistRank;
    }

    if (link?.isSnack) {
      result.isSnack = true;
    }

    if (focusRank) {
      result.focusRank = focusRank;
    }

    return result;
  });
}

// ============================================
// WorkItemLink CRUD Operations
// ============================================

/**
 * Link a work item to a card.
 */
export async function linkWorkItem(
  userId: string,
  workItemKey: string,
  cardId: string | null
): Promise<void> {
  const { source } = parseWorkItemKey(workItemKey);

  // Determine kind based on source
  let kind: WorkItemKind = 'event';
  if (source === 'gtasks' || source === 'notion') {
    kind = 'task';
  }

  // Determine source type
  let sourceType: WorkItemSource = 'kaizen';
  if (source === 'gcal') sourceType = 'google_calendar';
  else if (source === 'gtasks') sourceType = 'google_tasks';
  else if (source === 'notion') sourceType = 'notion';

  await prisma.workItemLink.upsert({
    where: { workItemKey },
    update: { cardId },
    create: {
      userId,
      workItemKey,
      source: sourceType,
      kind,
      cardId,
    },
  });
}

/**
 * Unlink a work item from its card.
 */
export async function unlinkWorkItem(workItemKey: string): Promise<void> {
  try {
    await prisma.workItemLink.delete({
      where: { workItemKey },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return;
    }
    throw error;
  }
}

/**
 * Get link for a work item.
 */
export async function getWorkItemLink(workItemKey: string) {
  return prisma.workItemLink.findUnique({
    where: { workItemKey },
    include: { card: { select: { id: true, title: true } } },
  });
}

// ============================================
// DailyFocus CRUD Operations
// ============================================

/**
 * Set the top 3 focus items for a day.
 */
export async function setDailyFocus(
  userId: string,
  date: string,
  topKeys: string[]
): Promise<void> {
  // Validate max 3 items
  if (topKeys.length > 3) {
    throw new Error('DailyFocus can have at most 3 items');
  }

  await prisma.dailyFocus.upsert({
    where: {
      userId_date: {
        userId,
        date: parseLocalDate(date),
      },
    },
    update: { topKeys },
    create: {
      userId,
      date: parseLocalDate(date),
      topKeys,
    },
  });
}

/**
 * Get the daily focus for a date.
 */
export async function getDailyFocus(userId: string, date: string) {
  return prisma.dailyFocus.findUnique({
    where: {
      userId_date: {
        userId,
        date: parseLocalDate(date),
      },
    },
  });
}

/**
 * Reorder playlist items for a day.
 * Accepts an ordered array of workItemKeys and assigns sequential playlistRank values.
 * Creates WorkItemLink records for any keys that don't have one yet.
 */
export async function reorderPlaylist(
  userId: string,
  date: string,
  orderedKeys: string[]
): Promise<void> {
  const plannedDate = parseLocalDate(date);

  // Batch update ranks using a transaction
  await prisma.$transaction(
    orderedKeys.map((key, index) =>
      prisma.workItemLink.upsert({
        where: { workItemKey: key },
        update: { playlistRank: index + 1 },
        create: {
          userId,
          workItemKey: key,
          source: inferSource(key),
          kind: 'task',
          playlistRank: index + 1,
          plannedForDate: plannedDate,
        },
      })
    )
  );
}

/**
 * Get all parking lot items — WorkItemLinks with no plannedForDate.
 * These are ad-hoc items not tied to any specific day.
 */
export async function getParkingLotItems(userId: string): Promise<WorkItemWithOverlays[]> {
  const links = await prisma.workItemLink.findMany({
    where: {
      userId,
      plannedForDate: null,
      kind: 'task',
    },
    include: {
      card: { select: { id: true, title: true } },
    },
  });

  if (links.length === 0) return [];

  // Fetch actual work items from providers by keys
  const keys = links.map(l => l.workItemKey);
  const adapters = getEnabledAdapters(userId);

  const fetchResults = await Promise.allSettled(
    adapters
      .filter(a => a.listByKeys)
      .map(a => a.listByKeys!(userId, keys))
  );

  const itemMap = new Map<string, WorkItem>();
  for (const result of fetchResults) {
    if (result.status === 'fulfilled') {
      for (const item of result.value) {
        itemMap.set(item.key, item);
      }
    }
  }

  const linkMap = new Map(links.map(l => [l.workItemKey, l]));
  const result: WorkItemWithOverlays[] = [];

  for (const key of keys) {
    const item = itemMap.get(key);
    if (!item) continue; // Item deleted from provider

    const link = linkMap.get(key)!;
    result.push({
      ...item,
      linkedCardId: link.cardId || undefined,
      linkedCardTitle: link.card?.title,
    });
  }

  return result;
}

/**
 * Move a work item to the parking lot (clear plannedForDate and playlistRank).
 */
export async function parkWorkItem(userId: string, workItemKey: string): Promise<void> {
  await prisma.workItemLink.upsert({
    where: { workItemKey },
    update: {
      plannedForDate: null,
      playlistRank: null,
    },
    create: {
      userId,
      workItemKey,
      source: inferSource(workItemKey),
      kind: 'task',
      plannedForDate: null,
      playlistRank: null,
    },
  });
}

/**
 * Move a work item to a new date, resetting its playlistRank.
 */
export async function moveWorkItemToDate(
  userId: string,
  workItemKey: string,
  newDate: string
): Promise<void> {
  const plannedDate = parseLocalDate(newDate);

  await prisma.workItemLink.upsert({
    where: { workItemKey },
    update: {
      plannedForDate: plannedDate,
      playlistRank: null, // Reset rank when moved to new date
    },
    create: {
      userId,
      workItemKey,
      source: inferSource(workItemKey),
      kind: 'task',
      plannedForDate: plannedDate,
      playlistRank: null,
    },
  });
}

/** Infer WorkItemSource from a work item key prefix. */
function inferSource(workItemKey: string): WorkItemSource {
  const { source } = parseWorkItemKey(workItemKey);
  if (source === 'gcal') return 'google_calendar';
  if (source === 'gtasks') return 'google_tasks';
  if (source === 'notion') return 'notion';
  return 'kaizen';
}

/**
 * Clear daily focus for a date.
 */
export async function clearDailyFocus(userId: string, date: string): Promise<void> {
  try {
    await prisma.dailyFocus.delete({
      where: {
        userId_date: {
          userId,
          date: parseLocalDate(date),
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return;
    }
    throw error;
  }
}

// ============================================
// WorkItem Operations (Complete, Create)
// ============================================

/**
 * Complete a work item via its provider.
 * Records completion event in ledger for attribution.
 * Stores completedInEventKey for event-task attribution.
 */
export async function completeWorkItem(
  userId: string,
  workItemKey: string,
  completedInEventKey?: string
): Promise<void> {
  const { source } = parseWorkItemKey(workItemKey);
  const adapters = getEnabledAdapters(userId);

  // Determine source mapping
  let sourceType: WorkItemSource = 'kaizen';
  if (source === 'gcal') sourceType = 'google_calendar';
  else if (source === 'gtasks') sourceType = 'google_tasks';
  else if (source === 'notion') sourceType = 'notion';

  const adapter = adapters.find((a) => a.source === sourceType);

  if (!adapter) {
    throw new Error(`No adapter found for source: ${sourceType}`);
  }

  if (!adapter.complete) {
    throw new Error(`Adapter ${sourceType} does not support completion`);
  }

  // Complete via provider
  await adapter.complete(workItemKey);

  // ALWAYS upsert WorkItemLink for Kaizen overlay features
  // completedInEventKey may be null if completed outside a calendar block - that's OK
  await prisma.workItemLink.upsert({
    where: { workItemKey },
    update: { completedInEventKey },
    create: {
      userId,
      workItemKey,
      source: sourceType,
      kind: 'task',
      completedInEventKey,
    },
  });

  // Record completion in ledger (for attribution and history)
  await prisma.event.create({
    data: {
      userId,
      eventType: 'workitem_completed',
      payload: {
        workItemKey,
        completedInEventKey,
        kaizenCompletedAt: new Date().toISOString(),
        source: 'kaizen_ui',
      },
    },
  });
}

/**
 * Create a new work item in the specified provider.
 * For MVP, defaults to Google Tasks.
 * Stores capturedInEventKey for context (which block task was created in).
 */
export async function createWorkItem(
  userId: string,
  data: { title: string; dueAt?: string; notes?: string; source?: WorkItemSource; capturedInEventKey?: string; cardId?: string }
): Promise<WorkItem> {
  const targetSource = data.source || 'google_tasks';
  const adapters = getEnabledAdapters(userId);
  const adapter = adapters.find((a) => a.source === targetSource);

  if (!adapter) {
    throw new Error(`No adapter found for source: ${targetSource}`);
  }

  if (!adapter.create) {
    throw new Error(`Adapter ${targetSource} does not support creation`);
  }

  // Create via provider (pass userId for account filtering)
  const workItem = await adapter.create(userId, data);

  // ALWAYS create WorkItemLink for Kaizen overlay features (playlist, attribution, etc.)
  // capturedInEventKey and cardId may be null - that's OK
  await prisma.workItemLink.upsert({
    where: { workItemKey: workItem.key },
    update: {
      capturedInEventKey: data.capturedInEventKey,
      cardId: data.cardId,
    },
    create: {
      userId,
      workItemKey: workItem.key,
      source: targetSource,
      kind: 'task',
      capturedInEventKey: data.capturedInEventKey,
      cardId: data.cardId,
      plannedForDate: data.dueAt ? new Date(data.dueAt) : null,
    },
  });

  // Record creation in ledger
  await prisma.event.create({
    data: {
      userId,
      eventType: 'workitem_created',
      payload: {
        workItemKey: workItem.key,
        title: workItem.title,
        dueAt: workItem.dueAt,
        capturedInEventKey: data.capturedInEventKey,
        source: targetSource,
      },
    },
  });

  return workItem;
}
