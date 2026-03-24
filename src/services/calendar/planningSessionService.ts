import { prisma } from '../../lib/db';
import type { Prisma } from '@prisma/client';
import { getWeekEventsWithCache } from './eventCacheService';

export interface ActionPlanState {
  status: 'pending' | 'completed' | 'skipped';
  tasks: PlannedTask[];
}

export interface PlannedTask {
  id: string;
  cardId: string;
  actionId?: string; // Backward compatibility
  title: string;
  description?: string;
  start: string; // ISO string
  end: string; // ISO string
  location?: string;
  attendees?: string[];
}

export interface GcalAssignment {
  eventId: string;
  eventTitle: string;
  actionId: string;
  actionTitle: string;
  accountId: string;
  calendarId: string;
  source?: 'auto' | 'manual'; // 'auto' = pre-populated from classification rules
}

export interface PlanningSessionData {
  id: string;
  userId: string;
  weekStart: string;
  actionStates: Record<string, ActionPlanState>; // keyed by actionId
  gcalAssignments: Record<string, GcalAssignment>; // keyed by eventId
  status: 'in_progress' | 'committed';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get or create a planning session for a user and week.
 */
export async function getOrCreatePlanningSession(
  userId: string,
  weekStart: string
): Promise<PlanningSessionData> {
  const existing = await prisma.planningSession.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });

  if (existing) {
    return {
      id: existing.id,
      userId: existing.userId,
      weekStart: existing.weekStart,
      actionStates: (existing.actionStates as Prisma.JsonObject || {}) as unknown as Record<string, ActionPlanState>,
      gcalAssignments: (existing.gcalAssignments as Prisma.JsonObject || {}) as unknown as Record<string, GcalAssignment>,
      status: existing.status,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    };
  }

  // Create new session with pre-populated gcalAssignments from classification rules
  const prePopulatedAssignments = await getPrePopulatedAssignments(userId, weekStart);

  const created = await prisma.planningSession.create({
    data: {
      userId,
      weekStart,
      actionStates: {},
      gcalAssignments: prePopulatedAssignments as unknown as Prisma.InputJsonValue,
      status: 'in_progress',
    },
  });

  return {
    id: created.id,
    userId: created.userId,
    weekStart: created.weekStart,
    actionStates: {},
    gcalAssignments: prePopulatedAssignments,
    status: created.status,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

/**
 * Pre-populate gcalAssignments from classification rules for a new planning session.
 * Applies: annotations, routine links, and EventClassificationRules.
 */
async function getPrePopulatedAssignments(
  userId: string,
  weekStart: string
): Promise<Record<string, GcalAssignment>> {
  const assignments: Record<string, GcalAssignment> = {};

  try {
    // 1. Fetch calendar events for the week
    const cachedEvents = await getWeekEventsWithCache(userId, weekStart);
    if (cachedEvents.length === 0) return assignments;

    // 2. Load classification data
    const [annotations, routineLinks, rules, actionCards] = await Promise.all([
      prisma.calendarEventAnnotation.findMany({
        where: { userId },
        include: { card: { select: { id: true, title: true, parentId: true } } },
      }),
      prisma.routineCalendarLink.findMany({
        where: { userId },
        include: { card: { select: { id: true, title: true, parentId: true } } },
      }),
      prisma.eventClassificationRule.findMany({
        where: { userId, isActive: true },
        include: { card: { select: { id: true, title: true, parentId: true } } },
        orderBy: { priority: 'desc' },
      }),
      prisma.card.findMany({
        where: {
          userId,
          unitType: { in: ['ACTION_GATE', 'ACTION_EXPERIMENT', 'ACTION_ROUTINE', 'ACTION_OPS'] },
          status: { in: ['in_progress', 'not_started'] },
        },
        select: { id: true, title: true, parentId: true },
      }),
    ]);

    // Create lookup maps
    const annotationMap = new Map(annotations.filter(a => a.card).map(a => [a.eventId, a]));
    const routineLinkMap = new Map(routineLinks.map(l => [l.recurringEventId, l]));
    const actionCardMap = new Map(actionCards.map(c => [c.id, c]));

    // 3. Apply classification to each event
    for (const event of cachedEvents) {
      let assignedCardId: string | undefined;
      let assignedCardTitle: string | undefined;

      // Priority 1: Check annotations (direct user assignment)
      const annotation = annotationMap.get(event.eventId);
      if (annotation && annotation.card) {
        assignedCardId = annotation.cardId!;
        assignedCardTitle = annotation.card.title;
      }

      // Priority 2: Check routine links (recurring event match)
      if (!assignedCardId && event.recurringEventId) {
        const routineLink = routineLinkMap.get(event.recurringEventId);
        if (routineLink && routineLink.card) {
          assignedCardId = routineLink.cardId;
          assignedCardTitle = routineLink.card.title;
        }
      }

      // Priority 3: Check EventClassificationRules (title pattern matching)
      if (!assignedCardId && event.summary) {
        const eventTitle = event.summary.trim();
        for (const rule of rules) {
          let matches = false;
          if (rule.matchType === 'title_exact' && eventTitle === rule.matchValue) {
            matches = true;
          } else if (rule.matchType === 'title_contains' && eventTitle.toLowerCase().includes(rule.matchValue.toLowerCase())) {
            matches = true;
          }

          if (matches && rule.card) {
            // Verify the card is still an active action
            if (actionCardMap.has(rule.cardId)) {
              assignedCardId = rule.cardId;
              assignedCardTitle = rule.card.title;
              break;
            }
          }
        }
      }

      // If classified, create gcalAssignment
      if (assignedCardId && assignedCardTitle) {
        assignments[event.eventId] = {
          eventId: event.eventId,
          eventTitle: event.summary || '',
          actionId: assignedCardId,
          actionTitle: assignedCardTitle,
          accountId: event.accountId,
          calendarId: event.calendarId,
          source: 'auto',
        };
      }
    }
  } catch (error) {
    console.error('Failed to pre-populate gcalAssignments:', error);
    // Return empty assignments on error - user can still manually assign
  }

  return assignments;
}

/**
 * Update a planning session's state.
 */
export async function updatePlanningSession(
  userId: string,
  weekStart: string,
  updates: {
    actionStates?: Record<string, ActionPlanState>;
    gcalAssignments?: Record<string, GcalAssignment>;
  }
): Promise<PlanningSessionData> {
  const updateData: Prisma.PlanningSessionUpdateInput = {};
  if (updates.actionStates !== undefined) {
    updateData.actionStates = updates.actionStates as unknown as Prisma.InputJsonValue;
  }
  if (updates.gcalAssignments !== undefined) {
    updateData.gcalAssignments = updates.gcalAssignments as unknown as Prisma.InputJsonValue;
  }

  const session = await prisma.planningSession.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: updateData,
    create: {
      userId,
      weekStart,
      actionStates: (updates.actionStates || {}) as unknown as Prisma.InputJsonValue,
      gcalAssignments: (updates.gcalAssignments || {}) as unknown as Prisma.InputJsonValue,
      status: 'in_progress',
    },
  });

  return {
    id: session.id,
    userId: session.userId,
    weekStart: session.weekStart,
    actionStates: (session.actionStates as Prisma.JsonObject || {}) as unknown as Record<string, ActionPlanState>,
    gcalAssignments: (session.gcalAssignments as Prisma.JsonObject || {}) as unknown as Record<string, GcalAssignment>,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

/**
 * Mark a planning session as committed.
 */
export async function commitPlanningSession(
  userId: string,
  weekStart: string
): Promise<PlanningSessionData> {
  const session = await prisma.planningSession.update({
    where: { userId_weekStart: { userId, weekStart } },
    data: { status: 'committed' },
  });

  return {
    id: session.id,
    userId: session.userId,
    weekStart: session.weekStart,
    actionStates: (session.actionStates as Prisma.JsonObject || {}) as unknown as Record<string, ActionPlanState>,
    gcalAssignments: (session.gcalAssignments as Prisma.JsonObject || {}) as unknown as Record<string, GcalAssignment>,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

/**
 * Delete a planning session (e.g., to start fresh).
 */
export async function deletePlanningSession(
  userId: string,
  weekStart: string
): Promise<boolean> {
  try {
    await prisma.planningSession.delete({
      where: { userId_weekStart: { userId, weekStart } },
    });
    return true;
  } catch {
    return false;
  }
}
