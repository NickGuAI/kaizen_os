// ============================================================================
// TIMEZONE-SAFE DATE UTILITIES
// ============================================================================
// All date-only handling MUST use these utilities. Never use:
//   - new Date().toISOString().split('T')[0]
//   - date.split('T')[0] for display
//   - new Date(localDate).toISOString() for server serialization
// ============================================================================

import { DateTime } from 'luxon';

/**
 * Get user's timezone with fallback and validation.
 */
export function getUserTimezone(user: { timezone?: string | null } | null): string {
  const fallback = 'America/Los_Angeles';
  const tz = user?.timezone || fallback;
  return DateTime.local().setZone(tz).isValid ? tz : fallback;
}

/**
 * Convert a local date string (YYYY-MM-DD) to ISO range in user's timezone.
 * Returns start (midnight local) and end (23:59:59.999 local) as ISO strings with offset.
 */
export function localDateToIsoRangeWithTz(
  localDate: string,
  timezone: string
): { start: string; end: string } {
  if (!localDate) return { start: '', end: '' };
  const dayStart = DateTime.fromISO(localDate, { zone: timezone }).startOf('day');
  if (!dayStart.isValid) return { start: '', end: '' };
  const dayEnd = dayStart.endOf('day');
  return { start: dayStart.toISO() || '', end: dayEnd.toISO() || '' };
}

/**
 * Add days to an ISO string, preserving the timezone offset.
 */
export function addDaysToIso(iso: string, days: number): string {
  if (!iso) return '';
  const dt = DateTime.fromISO(iso, { setZone: true });
  if (!dt.isValid) return '';
  return dt.plus({ days }).toISO() || '';
}

/**
 * Get today's date as YYYY-MM-DD in local timezone.
 * Use this for default date values in forms.
 */
export function getTodayLocalDate(): string {
  const now = new Date();
  return formatLocalDate(now);
}

/**
 * Format a Date object as YYYY-MM-DD in local timezone.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert a local date string (YYYY-MM-DD) to UTC ISO range for server.
 * Returns start (midnight local) and end (23:59:59.999 local) as UTC ISO strings.
 * Use for range queries (workitems, calendar, etc.)
 */
export function localDateToUTCRange(localDate: string): { start: string; end: string } {
  if (!localDate) return { start: '', end: '' };
  const [year, month, day] = localDate.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Parse a local date string (YYYY-MM-DD) to Date object at local midnight.
 * Use for Prisma Date fields (plannedForDate, date, etc.)
 */
export function parseLocalDate(localDate: string): Date {
  if (!localDate) return new Date(NaN);
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Validate a local date string (YYYY-MM-DD) represents a real calendar date.
 */
export function isValidLocalDate(localDate: string): boolean {
  if (!localDate) return false;
  const dt = DateTime.fromISO(localDate, { zone: 'utc' });
  return dt.isValid && dt.toISODate() === localDate;
}

/**
 * Convert UTC ISO string to local date string (YYYY-MM-DD) for display.
 * Use this when displaying dates from the server in form inputs.
 */
export function utcToLocalDate(utcDate: string | null | undefined): string {
  if (!utcDate) return '';
  const date = new Date(utcDate);
  return formatLocalDate(date);
}

/**
 * Safe helper to format a date for input fields.
 * Handles null/undefined and UTC to local conversion.
 */
export function formatDateForInput(dateValue: string | null | undefined): string {
  return utcToLocalDate(dateValue);
}

/**
 * Get the start of a week (Monday) as YYYY-MM-DD string.
 * @param offsetWeeks - Number of weeks to offset (0 = current, -1 = last, 1 = next)
 */
export function getWeekStart(offsetWeeks: number = 0): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Adjust so Monday = 0
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const diff = now.getDate() + mondayOffset + offsetWeeks * 7;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), diff);
  return formatLocalDate(weekStart);
}

/**
 * Get the week start for review purposes.
 * On Sunday: returns current week (the week that just ended, Mon-Sun)
 * On other days: returns last completed week
 */
export function getReviewWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // On Sunday, the week to review is the one that just ended (offset 0)
  // On other days, review the previous completed week (offset -1)
  const offset = dayOfWeek === 0 ? 0 : -1;
  return getWeekStart(offset);
}

/**
 * Check if today is Sunday (review day)
 */
export function isSunday(): boolean {
  return new Date().getDay() === 0;
}

/**
 * Get weekday index (0=Sunday) for a date in a specific time zone.
 */
export function getWeekdayInTimeZone(date: Date, timeZone?: string | null): number {
  if (!timeZone) {
    return date.getDay();
  }
  try {
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(date);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const index = weekdays.indexOf(weekday);
    return index === -1 ? date.getDay() : index;
  } catch {
    return date.getDay();
  }
}

/**
 * Format a date range for display.
 */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return `${startStr} - ${endStr}`;
}
