# Fix Google Tasks Timezone Issue in Daily Dashboard

## Original Task
> the google tasks in daily dashboard still loads tasks from the previous day if time is early in the day, meaning it's not using user's timezone. all time related operations should be called from '/Users/yugu/Desktop/gehirn/GehirnRepo/projects/kaizen_os/app/src/utils/dateUtils.ts'. check where it's not doing it and explain how to fix, what is considered successful for the fix

## Problem
Google Tasks in the daily dashboard loads tasks from the previous day when viewed early in the morning. The range used for workitem queries is built in the **server's timezone**, not the **user's timezone**, so the day boundaries are shifted.

## Root Cause Analysis

**Primary Bug** (in `/app/src/services/workitems/workItemService.ts` via `/app/src/utils/dateUtils.ts:34-40`):
```typescript
export function localDateToUTCRange(localDate: string): { start: string; end: string } {
  const [year, month, day] = localDate.split('-').map(Number);
  const start = new Date(year, month - 1, day);  // Uses SERVER timezone
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}
```

**Example**: User in Pacific timezone views Jan 25:
- Frontend sends: `date=2026-01-25`
- `new Date(2026, 0, 25)` creates midnight in **server timezone** (UTC)
- Result: `2026-01-25T00:00:00.000Z` = Jan 24 16:00 Pacific
- The Google Tasks adapter uses this range for `dueMin/dueMax` and `completedMin/Max`, so day boundaries are effectively shifted.

**Additional Risk**: `GoogleTasksAdapter` computes `dueMax` by adding 1 day in UTC (`setUTCDate`). Once we switch to timezone-aware ISO strings with offsets, this will over-advance for negative offsets (e.g., America/Los_Angeles), causing next-day tasks to be included.

**Correct Pattern** (already in `/app/src/server/routes/calendar.ts:1590-1600`):
```typescript
const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
const tz = user?.timezone || 'America/Los_Angeles';
const dayStartLuxon = DateTime.fromISO(date, { zone: tz }).startOf('day');
const dayStart = dayStartLuxon.toJSDate();
```

## Fix Strategy

1. Add timezone-aware date range helpers in `dateUtils.ts` that return ISO strings **with the user’s offset** (not forced to `Z`), so the date portion reflects the user’s local day.
2. Update `getWorkItemsForDay` to use the user’s timezone when computing the range.
3. Fix Google Tasks `dueMax` calculation to add days **in the same zone** (not UTC math). Use a `dateUtils.ts` helper so all date logic stays centralized.

## Files to Modify

### 1. `/app/src/utils/dateUtils.ts`
Add timezone-aware helpers:
- `localDateToIsoRangeWithTz(localDate: string, timezone: string)`
- `addDaysToIso(iso: string, days: number)` (preserve zone from input)

### 2. `/app/src/services/workitems/workItemService.ts`
Update `getWorkItemsForDay` to accept timezone:
- `getWorkItemsForDay(userId, date)` → `getWorkItemsForDay(userId, date, timezone)`

### 3. `/app/src/services/workitems/adapters/GoogleTasksAdapter.ts`
Use `addDaysToIso` for `dueMax` instead of `setUTCDate` to avoid off-by-one for negative offsets.

### 4. `/app/src/server/routes/workitems.ts`
Use the authenticated user’s timezone (`req.user?.timezone`) and pass it into `getWorkItemsForDay`. Fallback to `America/Los_Angeles` if missing.

### 5. Tests
Update or add tests for timezone offsets:
- `app/tests/services/workitems/adapters/GoogleTasksAdapter.test.ts` (dueMax for `-08:00` offset)
- optional: add a small `dateUtils` unit test for `localDateToIsoRangeWithTz`

## Implementation Details

### New functions in dateUtils.ts
```typescript
import { DateTime } from 'luxon';

/**
 * Get user timezone with fallback.
 * Centralizes timezone extraction - callers pass user object, not raw string.
 */
export function getUserTimezone(user: { timezone?: string | null } | null): string {
  return user?.timezone || 'America/Los_Angeles';
}

/**
 * Convert a local date string to ISO range in user's timezone.
 * Returns ISO strings WITH offset (not forced to Z).
 */
export function localDateToIsoRangeWithTz(localDate: string, timezone: string): { start: string; end: string } {
  if (!localDate) return { start: '', end: '' };
  const dayStart = DateTime.fromISO(localDate, { zone: timezone }).startOf('day');
  const dayEnd = dayStart.endOf('day');
  return { start: dayStart.toISO()!, end: dayEnd.toISO()! };
}

/**
 * Add days to an ISO string, preserving the timezone offset.
 * Use for Google Tasks dueMax calculation.
 */
export function addDaysToIso(iso: string, days: number): string {
  if (!iso) return '';
  return DateTime.fromISO(iso, { setZone: true }).plus({ days }).toISO()!;
}
```

### Updated route pattern in workitems.ts
```typescript
import { getUserTimezone } from '../utils/dateUtils';

router.get('/day', async (req, res) => {
  const { date } = req.query;
  const userId = req.user!.id;
  const tz = getUserTimezone(req.user);

  const items = await getWorkItemsForDay(userId, date as string, tz);
  res.json(items);
});
```

## Success Criteria

1. **Functional Test**: User in Pacific timezone viewing daily dashboard at 6:00 AM Pacific on Jan 25 sees tasks due on Jan 25, not Jan 24.
2. **Functional Test**: User in Asia/Tokyo sees tasks due on Jan 25 (not Jan 24) even early morning.
3. **Unit Test**: `localDateToIsoRangeWithTz('2026-01-25', 'America/Los_Angeles')` returns:
   - start: `2026-01-25T00:00:00.000-08:00`
   - end: `2026-01-25T23:59:59.999-08:00`
4. **Unit Test**: `addDaysToIso('2026-01-25T23:59:59.999-08:00', 1)` returns a date with `2026-01-26` in the local portion (not `2026-01-27`).
5. **No Regression**: Calendar events (already using timezone-aware code) continue working correctly.

## Verification Steps

1. Run targeted tests: `cd app && npm test -- --run services/workitems` (or full `npm test`).
2. Start dev server: `npm run dev:all`.
3. Manual test:
   - Set user timezone to `America/Los_Angeles` and create tasks due today.
   - View daily dashboard early morning (or inspect API calls) and confirm tasks from the previous day do not appear.
   - Repeat with a positive-offset timezone (e.g., `Asia/Tokyo`) to ensure the previous-day bug is gone.
