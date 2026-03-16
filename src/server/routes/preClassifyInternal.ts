import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/db';
import { getWeekReview } from '../../services/calendar/reviewOrchestrator';
import { getUserSettings } from '../../services/userSettingsTypes';
import { getWeekdayInTimeZone } from '../../utils/dateUtils';
import { DateTime } from 'luxon';

const router = Router();

/**
 * POST /api/calendar/pre-classify
 *
 * Internal endpoint triggered by Supabase pg_cron daily at 2 AM UTC.
 * Protected by CALENDAR_POLL_SECRET to prevent unauthorized triggers.
 *
 * For each user whose planningDay is tomorrow (in their timezone),
 * runs getWeekReview to pre-populate the ai_classification_suggestions cache.
 * This ensures the review page loads near-instantly on review day.
 */
router.post('/', async (req: Request, res: Response) => {
  const secret = process.env.CALENDAR_POLL_SECRET;
  const auth = req.headers.authorization?.replace('Bearer ', '');

  if (!secret || auth !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ACK immediately — pg_net doesn't wait for the response body
  res.status(200).json({ ok: true });

  runPreClassify().catch(err =>
    console.error('[preClassify] Pre-classification triggered by cron failed:', err)
  );
});

async function runPreClassify(): Promise<void> {
  const users = await prisma.user.findMany({
    select: { id: true, timezone: true, settings: true },
  });

  if (users.length === 0) return;

  console.log(`[preClassify] Checking ${users.length} user(s) for upcoming review day`);

  const now = new Date();

  await Promise.allSettled(
    users.map(user =>
      preClassifyForUser(user, now).catch(err =>
        console.error(`[preClassify] Error pre-classifying for user ${user.id}:`, err)
      )
    )
  );
}

async function preClassifyForUser(
  user: { id: string; timezone: string | null; settings: unknown },
  now: Date
): Promise<void> {
  const tz = user.timezone || 'America/Los_Angeles';
  const settings = getUserSettings(user.settings);
  const planningDay = settings.planningDay; // 0=Sunday

  // The day before planningDay is (planningDay + 6) % 7
  const dayBeforePlanningDay = (planningDay + 6) % 7;
  const todayWeekday = getWeekdayInTimeZone(now, tz);

  if (todayWeekday !== dayBeforePlanningDay) {
    return; // Not the eve of this user's review day — skip
  }

  // Derive the weekStart for the upcoming review period.
  // The review covers the 7-day window starting from the Monday before planningDay
  // (or the planningDay week itself). We calculate the upcoming planningDay date
  // and then use the same weekStart logic as getWeekReview.
  const nowInTz = DateTime.fromJSDate(now, { zone: tz });

  // Find the next occurrence of planningDay (tomorrow from now)
  const tomorrowInTz = nowInTz.plus({ days: 1 });

  // weekStart is the start of the week that contains planningDay.
  // getWeekReview computes: start = DateTime.fromISO(weekStart, { zone: tz }).startOf('day')
  // and end = start.plus({ days: 7 }).
  // We use the Monday of that week as weekStart (ISO week starts on Monday in Luxon).
  const weekStart = tomorrowInTz.startOf('week').toISODate()!;

  console.log(
    `[preClassify] User ${user.id} (tz: ${tz}, planningDay: ${planningDay}): ` +
    `pre-classifying week ${weekStart}`
  );

  await getWeekReview(user.id, weekStart, { forceAI: false });

  console.log(`[preClassify] User ${user.id}: pre-classification complete for week ${weekStart}`);
}

export default router;
