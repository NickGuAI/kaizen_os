import { prisma } from '../../lib/db';
import { isValidUuid } from '../../lib/validation';
import { getProviderForAccount } from './providerFactory';
import { parsePlanText } from './planParser';
import { DateTime } from 'luxon';

// ============================================
// Weekly Planned Hours (FR-001)
// ============================================

export interface WeeklyPlannedHoursResult {
  plannedHours: number;
  utilityRate: number;
  percentUtilized: number;
  status: 'under' | 'at' | 'over';
}

export async function getWeeklyPlannedHours(
  userId: string,
  weekStart: string
): Promise<WeeklyPlannedHoursResult> {
  // Fetch user, season, and accounts in parallel (3 queries → 1 round-trip)
  const [user, season, accounts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
    prisma.season.findFirst({ where: { userId, isActive: true }, select: { utilityRate: true } }),
    prisma.calendarAccount.findMany({ where: { userId }, select: { id: true, selectedCalendarIds: true } }),
  ]);

  const tz = user?.timezone || 'America/Los_Angeles';
  const utilityRate = season?.utilityRate || 40;

  // Parse week boundaries
  const weekStartDt = DateTime.fromISO(weekStart, { zone: tz }).startOf('day');
  const weekEndDt = weekStartDt.plus({ days: 7 });
  const timeMin = weekStartDt.toISO()!;
  const timeMax = weekEndDt.toISO()!;

  // Build list of all calendar fetch tasks
  const fetchTasks: Promise<{ events: any[]; calendarId: string }>[] = [];
  for (const account of accounts) {
    const selectedCalendars = (account.selectedCalendarIds || ['primary']) as string[];
    for (const calendarId of selectedCalendars) {
      fetchTasks.push(
        (async () => {
          try {
            const provider = await getProviderForAccount(account.id);
            const events = await provider.listEvents(account.id, calendarId, timeMin, timeMax);
            return { events, calendarId };
          } catch (err) {
            console.warn(`Failed to fetch events for calendar ${calendarId}:`, err);
            return { events: [], calendarId };
          }
        })()
      );
    }
  }

  // Fetch all calendars in parallel
  const results = await Promise.all(fetchTasks);

  // Deduplicate events across calendars
  const seenEvents = new Map<string, { start: Date; end: Date }>();
  for (const { events } of results) {
    for (const event of events) {
      // Only count events with dateTime (not all-day events)
      if (event.start?.dateTime && event.end?.dateTime) {
        // Deduplicate by iCalUID + instanceKey (for recurring event instances)
        const dedupeKey = `${event.iCalUID}:${event.instanceKey || event.start.dateTime}`;
        if (!seenEvents.has(dedupeKey)) {
          seenEvents.set(dedupeKey, {
            start: new Date(event.start.dateTime),
            end: new Date(event.end.dateTime),
          });
        }
      }
    }
  }

  // Sum up durations from deduplicated events
  let totalMinutes = 0;
  for (const { start, end } of seenEvents.values()) {
    totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
  }

  const plannedHours = Math.round((totalMinutes / 60) * 10) / 10;
  const percentUtilized = utilityRate > 0 ? Math.round((plannedHours / utilityRate) * 100) : 0;

  let status: 'under' | 'at' | 'over' = 'under';
  if (percentUtilized >= 100) status = 'over';
  else if (percentUtilized >= 90) status = 'at';

  return { plannedHours, utilityRate, percentUtilized, status };
}

// ============================================
// Preview Types (matching UI mock)
// ============================================

export interface PreviewBlock {
  dayOffset: number;
  dayName: string;
  dayDate: string; // "Dec 30"
  startTime: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
  cardId: string | null;
  cardTitle: string;
  description?: string;
  isMatched: boolean;
}

export interface PlanPreviewResponse {
  blocks: PreviewBlock[];
  errors: string[];
  summary: {
    blocksParsed: number;
    unmatchedCards: number;
    errorCount: number;
  };
  unmatchedCardNames: string[];
  userCards: Array<{ id: string; title: string }>;
}

// ============================================
// Preview Plan
// ============================================

export async function previewPlan(
  userId: string,
  text: string,
  weekStart: string
): Promise<PlanPreviewResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tz = user?.timezone || 'America/Los_Angeles';
  const weekStartDt = DateTime.fromISO(weekStart, { zone: tz }).startOf('day');

  const { blocks, errors, unmatchedCount } = await parsePlanText(userId, text);


  // Convert to full datetimes
  const previewBlocks: PreviewBlock[] = blocks.map((block) => {
    const day = weekStartDt.plus({ days: block.dayOffset });
    const [startH, startM] = block.startTime.split(':').map(Number);
    const [endH, endM] = block.endTime.split(':').map(Number);

    const startDt = day.set({ hour: startH, minute: startM });
    const endDt = day.set({ hour: endH, minute: endM });

    return {
      dayOffset: block.dayOffset,
      dayName: block.dayName,
      dayDate: day.toFormat('LLL d'),
      startTime: block.startTime,
      endTime: block.endTime,
      startDateTime: startDt.toISO()!,
      endDateTime: endDt.toISO()!,
      cardId: block.cardId,
      cardTitle: block.cardTitle,
      description: block.description,
      isMatched: block.isMatched,
    };
  });

  // Get unmatched card names
  const unmatchedCardNames = [...new Set(blocks.filter((b) => !b.isMatched).map((b) => b.cardTitle))];

  // Get user's cards for suggestions
  const userCards = await prisma.card.findMany({
    where: {
      userId,
      unitType: { in: ['ACTION_GATE', 'ACTION_EXPERIMENT', 'ACTION_ROUTINE', 'ACTION_OPS'] },
      status: { in: ['in_progress', 'not_started'] },
    },
    select: { id: true, title: true },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  return {
    blocks: previewBlocks,
    errors,
    summary: {
      blocksParsed: blocks.length,
      unmatchedCards: unmatchedCount,
      errorCount: errors.length,
    },
    unmatchedCardNames,
    userCards,
  };
}

// ============================================
// Commit Plan
// ============================================

export interface GcalAssignmentInput {
  eventId: string;
  eventTitle: string;
  cardId: string | null; // Must be valid UUID string or null/empty
  createRule: boolean;
  accountId: string;
  calendarId: string;
  modifiedStart?: string;
  modifiedEnd?: string;
}

export interface CommitPlanInput {
  weekStart?: string;
  actionType?: string; // Optional: filter to commit only blocks for this action type
  blocks: Array<{
    cardId: string | null;
    cardTitle: string;
    startDateTime: string;
    endDateTime: string;
    description?: string;
    actionType?: string; // Action type of the card
    // FR-003: Extended event details
    location?: string;
    attendees?: Array<{ email: string; displayName?: string }>;
  }>;
  assignments?: GcalAssignmentInput[];
}

export interface CommitPlanResult {
  created: number;
  linked: number;
  rulesCreated: number;
}

// FR-003: Generate Kaizen deep link for event description
function generateKaizenLink(cardId: string | null, weekStart?: string): string {
  if (!cardId) return '';
  const baseUrl = 'https://kaizen.gehirn.ai';
  const weekParam = weekStart ? `?week=${weekStart}` : '';
  return `\n\n---\n[Open in Kaizen](${baseUrl}/card/${cardId}${weekParam})`;
}

export async function commitPlan(
  userId: string,
  input: CommitPlanInput
): Promise<CommitPlanResult> {
  // GUARD: Check if session is already committed (prevents duplicate calendar events)
  if (input.weekStart) {
    const session = await prisma.planningSession.findUnique({
      where: { userId_weekStart: { userId, weekStart: input.weekStart } },
    });
    if (session?.status === 'committed') {
      throw new Error(`Planning session for week ${input.weekStart} has already been committed`);
    }
  }

  // ============================================
  // PRE-VALIDATION: Validate all inputs BEFORE any side effects
  // ============================================

  // Filter blocks by actionType if provided
  const blocksToCommit = input.actionType
    ? input.blocks.filter(b => b.actionType === input.actionType)
    : input.blocks;

  // Validate cardId in blocks (must be null or valid UUID)
  for (const block of blocksToCommit) {
    if (block.cardId !== null && block.cardId !== undefined && !isValidUuid(block.cardId)) {
      throw new Error(`Invalid cardId in block: expected UUID string or null, got ${typeof block.cardId} (${block.cardId})`);
    }
  }

  // Validate cardId in assignments (must be valid UUID if present)
  if (input.assignments) {
    for (const assignment of input.assignments) {
      // cardId can be empty/null (no assignment) or valid UUID
      if (assignment.cardId && !isValidUuid(assignment.cardId)) {
        throw new Error(`Invalid cardId in assignment: expected UUID string, got ${typeof assignment.cardId} (${assignment.cardId})`);
      }
    }
  }

  // Track created calendar events for rollback (external API - not in transaction)
  const createdCalendarEvents: Array<{ accountId: string; calendarId: string; eventId: string }> = [];

  let created = 0;
  let linked = 0;
  let rulesCreated = 0;

  // Prepare account and provider if needed
  let account: Awaited<ReturnType<typeof prisma.calendarAccount.findFirst>> = null;
  let provider: Awaited<ReturnType<typeof getProviderForAccount>> | null = null;
  let tz = 'America/Los_Angeles';

  if (blocksToCommit && blocksToCommit.length > 0) {
    account = await prisma.calendarAccount.findFirst({
      where: { userId, writeCalendarId: { not: null } },
    });

    if (!account || !account.writeCalendarId) {
      throw new Error('No write calendar configured. Please connect a Google account first.');
    }

    provider = await getProviderForAccount(account.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    tz = user?.timezone || 'America/Los_Angeles';
  }

  // ============================================
  // PHASE 1: Create Google Calendar events (external API calls)
  // These are tracked for rollback if DB transaction fails
  // ============================================

  // Store event data for DB writes in phase 2
  const blockEventData: Array<{ block: typeof blocksToCommit[0]; eventId: string }> = [];

  try {
    if (blocksToCommit && blocksToCommit.length > 0 && account && provider) {
      for (const block of blocksToCommit) {
        const summary = block.cardId ? `[Kaizen] ${block.cardTitle}` : block.cardTitle;
        const kaizenLink = generateKaizenLink(block.cardId, input.weekStart);
        const fullDescription = block.description
          ? `${block.description}${kaizenLink}`
          : kaizenLink.trim();

        const event = await provider.createEvent(account.id, account.writeCalendarId!, {
          summary,
          description: fullDescription || undefined,
          location: block.location,
          start: { dateTime: block.startDateTime, timeZone: tz },
          end: { dateTime: block.endDateTime, timeZone: tz },
          attendees: block.attendees,
          extendedProperties: block.cardId
            ? {
                private: {
                  kz_card_id: String(block.cardId),
                  ...(input.weekStart && { kz_plan_week: input.weekStart }),
                },
              }
            : undefined,
        });

        createdCalendarEvents.push({
          accountId: account.id,
          calendarId: account.writeCalendarId!,
          eventId: event.id,
        });

        blockEventData.push({ block, eventId: event.id });
        created++;
      }
    }

    // ============================================
    // PHASE 2: All database writes in a single transaction
    // If any fails, entire transaction rolls back automatically
    // ============================================

    await prisma.$transaction(
      async (tx) => {
      // 2a. Create annotations for blocks
      for (const { block, eventId } of blockEventData) {
        if (block.cardId && account) {
          await tx.calendarEventAnnotation.create({
            data: {
              userId,
              accountId: account.id,
              calendarId: account.writeCalendarId!,
              eventId,
              instanceKey: block.startDateTime,
              cardId: block.cardId,
              source: 'metadata',
              confidence: 1.0,
            },
          });
          linked++;
        }
      }

      // 2b. Create/update tracking event
      if (input.weekStart && blocksToCommit.length > 0) {
        const idempotencyKey = input.actionType
          ? `type_planned:${input.actionType}:${input.weekStart}`
          : `week_planned:${userId}-${input.weekStart}`;

        const existing = await tx.event.findFirst({
          where: { userId, idempotencyKey },
        });

        if (existing) {
          await tx.event.update({
            where: { id: existing.id },
            data: {
              payload: {
                weekStart: input.weekStart,
                actionType: input.actionType || null,
                blockCount: blocksToCommit.length,
                linkedCount: linked,
                committedAt: new Date().toISOString(),
              },
            },
          });
        } else {
          await tx.event.create({
            data: {
              userId,
              eventType: 'week_planned',
              idempotencyKey,
              payload: {
                weekStart: input.weekStart,
                actionType: input.actionType || null,
                blockCount: blocksToCommit.length,
                linkedCount: linked,
                committedAt: new Date().toISOString(),
              },
            },
          });
        }
      }

      // 2c. Handle GCal event assignments and rule creation
      if (input.assignments && input.assignments.length > 0) {
        for (const assignment of input.assignments) {
          if (assignment.cardId && assignment.accountId && assignment.calendarId) {
            await tx.calendarEventAnnotation.upsert({
              where: {
                userId_accountId_calendarId_eventId_instanceKey: {
                  userId,
                  accountId: assignment.accountId,
                  calendarId: assignment.calendarId,
                  eventId: assignment.eventId,
                  instanceKey: input.weekStart || 'default',
                },
              },
              update: {
                cardId: assignment.cardId,
                source: 'planning',
                confidence: 1.0,
              },
              create: {
                userId,
                accountId: assignment.accountId,
                calendarId: assignment.calendarId,
                eventId: assignment.eventId,
                instanceKey: input.weekStart || 'default',
                cardId: assignment.cardId,
                source: 'planning',
                confidence: 1.0,
              },
            });
            linked++;
          }

          if (assignment.createRule && assignment.eventTitle && assignment.cardId) {
            const trimmedTitle = assignment.eventTitle.trim();
            await tx.eventClassificationRule.upsert({
              where: {
                userId_matchType_matchValue: {
                  userId,
                  matchType: 'title_exact',
                  matchValue: trimmedTitle,
                },
              },
              update: {
                cardId: assignment.cardId,
                isActive: true,
              },
              create: {
                userId,
                matchType: 'title_exact',
                matchValue: trimmedTitle,
                cardId: assignment.cardId,
                priority: 0,
                isActive: true,
              },
            });
            rulesCreated++;
          }
        }
      }

      // 2d. Mark session as committed (final step in transaction)
      if (input.weekStart) {
        await tx.planningSession.upsert({
          where: { userId_weekStart: { userId, weekStart: input.weekStart } },
          update: { status: 'committed' },
          create: {
            userId,
            weekStart: input.weekStart,
            actionStates: {},
            gcalAssignments: {},
            status: 'committed',
          },
        });
      }
    },
    { timeout: 30000 },
    );

    // ============================================
    // PHASE 3: Update GCal event times (non-critical, outside transaction)
    // ============================================

    if (input.assignments && input.assignments.length > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const userTz = user?.timezone || 'America/Los_Angeles';

      for (const assignment of input.assignments) {
        if ((assignment.modifiedStart || assignment.modifiedEnd) && assignment.accountId && assignment.calendarId) {
          try {
            const assignmentProvider = await getProviderForAccount(assignment.accountId);
            const patch: { start?: { dateTime: string; timeZone: string }; end?: { dateTime: string; timeZone: string } } = {};

            if (assignment.modifiedStart) {
              patch.start = { dateTime: assignment.modifiedStart, timeZone: userTz };
            }
            if (assignment.modifiedEnd) {
              patch.end = { dateTime: assignment.modifiedEnd, timeZone: userTz };
            }

            await assignmentProvider.patchEvent(assignment.accountId, assignment.calendarId, assignment.eventId, patch);
          } catch (error) {
            console.error(`Failed to update GCal event ${assignment.eventId}:`, error);
            // Continue with other assignments even if one fails
          }
        }
      }
    }

    return { created, linked, rulesCreated };

  } catch (error) {
    // ============================================
    // ROLLBACK: Delete created Google Calendar events
    // DB transaction auto-rolls back, only external API calls need cleanup
    // ============================================
    console.error('Commit plan failed, rolling back calendar events:', error);

    for (const calEvent of createdCalendarEvents) {
      try {
        const rollbackProvider = await getProviderForAccount(calEvent.accountId);
        await rollbackProvider.deleteEvent(calEvent.accountId, calEvent.calendarId, calEvent.eventId);
        console.log(`Rolled back calendar event ${calEvent.eventId}`);
      } catch (rollbackError) {
        console.error(`Failed to rollback calendar event ${calEvent.eventId}:`, rollbackError);
      }
    }

    throw error;
  }
}

// ============================================
// Get Submitted Types for a Week
// ============================================

export async function getSubmittedTypes(
  userId: string,
  weekStart: string
): Promise<string[]> {
  // Query for week_planned events with type_planned idempotency key pattern for this week
  const events = await prisma.event.findMany({
    where: {
      userId,
      eventType: 'week_planned',
      idempotencyKey: {
        startsWith: 'type_planned:',
        endsWith: `:${weekStart}`,
      },
    },
    select: {
      idempotencyKey: true,
    },
  });

  // Extract action types from idempotency keys
  // Format: type_planned:{actionType}:{weekStart}
  const submittedTypes = events.map(e => {
    if (!e.idempotencyKey) return null;
    const parts = e.idempotencyKey.split(':');
    return parts[1]; // actionType is the second part
  }).filter((t): t is string => t !== null);

  return submittedTypes;
}
