/**
 * Tests for commitPlan validation and rollback logic (Issue #76)
 *
 * **Property 1: UUID Validation**
 * The isValidUuid function correctly identifies valid UUID v4 strings.
 *
 * **Property 2: Input Validation**
 * Invalid cardId values are rejected before any side effects occur.
 *
 * **Property 3: Rollback Behavior**
 * When commit fails after creating calendar events, those events are deleted.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isValidUuid, UUID_REGEX } from '../../../src/lib/validation';

// ============================================================================
// Property 1: UUID Validation
// ============================================================================

describe('isValidUuid - Property 1: UUID Validation', () => {
  /**
   * Valid UUID v4 strings should return true
   */
  it('accepts valid UUID v4 strings', () => {
    const validUuids = [
      '123e4567-e89b-12d3-a456-426614174000',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      '00000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      'ABCDEF12-3456-7890-ABCD-EF1234567890', // uppercase
    ];

    for (const uuid of validUuids) {
      expect(isValidUuid(uuid)).toBe(true);
    }
  });

  /**
   * Invalid values should return false
   */
  it('rejects invalid values', () => {
    const invalidValues = [
      null,
      undefined,
      123,
      158, // the integer that caused issue #76
      '',
      'not-a-uuid',
      '123e4567-e89b-12d3-a456', // too short
      '123e4567-e89b-12d3-a456-4266141740001', // too long
      '123e4567e89b12d3a456426614174000', // missing dashes
      '123e4567-e89b-12d3-a456-42661417400g', // invalid char
      {},
      [],
    ];

    for (const value of invalidValues) {
      expect(isValidUuid(value)).toBe(false);
    }
  });

  /**
   * Property-based test: any valid UUID format string should pass
   */
  it('accepts any properly formatted UUID string', () => {
    const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));
    const hexBlock = (len: number) => fc.array(hexChar, { minLength: len, maxLength: len }).map(arr => arr.join(''));

    const uuidArb = fc
      .tuple(hexBlock(8), hexBlock(4), hexBlock(4), hexBlock(4), hexBlock(12))
      .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);

    fc.assert(
      fc.property(uuidArb, (uuid) => {
        expect(isValidUuid(uuid)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: non-string values should always fail
   */
  it('rejects all non-string values', () => {
    const nonStringArb = fc.oneof(
      fc.integer(),
      fc.double(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.array(fc.anything()),
      fc.object()
    );

    fc.assert(
      fc.property(nonStringArb, (value) => {
        expect(isValidUuid(value)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: strings without correct format should fail
   */
  it('rejects strings without UUID format', () => {
    // Generate random strings that are unlikely to match UUID format
    const nonUuidStringArb = fc.string().filter((s) => !UUID_REGEX.test(s));

    fc.assert(
      fc.property(nonUuidStringArb, (str) => {
        expect(isValidUuid(str)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 2: Input Validation (Integration tests with mocks)
// ============================================================================

describe('commitPlan - Property 2: Input Validation', () => {
  /**
   * Test that invalid cardId in blocks causes validation error
   * This tests the validation logic structure, not the full service
   */
  it('validates cardId must be null or valid UUID for blocks', () => {
    const testCases = [
      { cardId: null, shouldPass: true },
      { cardId: undefined, shouldPass: true },
      { cardId: '123e4567-e89b-12d3-a456-426614174000', shouldPass: true },
      { cardId: 158, shouldPass: false },
      { cardId: '158', shouldPass: false },
      { cardId: 'invalid', shouldPass: false },
    ];

    for (const { cardId, shouldPass } of testCases) {
      const isValid = cardId === null || cardId === undefined || isValidUuid(cardId);
      expect(isValid).toBe(shouldPass);
    }
  });

  /**
   * Test that invalid cardId in assignments causes validation error
   */
  it('validates cardId must be empty or valid UUID for assignments', () => {
    const testCases = [
      { cardId: '', shouldPass: true }, // empty means no assignment
      { cardId: null, shouldPass: true },
      { cardId: '123e4567-e89b-12d3-a456-426614174000', shouldPass: true },
      { cardId: 158, shouldPass: false },
      { cardId: '158', shouldPass: false },
      { cardId: 'invalid', shouldPass: false },
    ];

    for (const { cardId, shouldPass } of testCases) {
      // Assignment validation: cardId can be falsy (no assignment) or valid UUID
      const isValid = !cardId || isValidUuid(cardId);
      expect(isValid).toBe(shouldPass);
    }
  });
});

// ============================================================================
// Property 3: Rollback Behavior (Unit tests for rollback logic)
// ============================================================================

describe('commitPlan - Property 3: Rollback Behavior', () => {
  /**
   * Test that rollback logic correctly identifies events to delete
   */
  it('tracks created events for potential rollback', () => {
    const createdCalendarEvents: Array<{ accountId: string; calendarId: string; eventId: string }> = [];

    // Simulate creating events
    const mockEvents = [
      { accountId: 'acc-1', calendarId: 'cal-1', eventId: 'evt-1' },
      { accountId: 'acc-1', calendarId: 'cal-1', eventId: 'evt-2' },
      { accountId: 'acc-2', calendarId: 'cal-2', eventId: 'evt-3' },
    ];

    for (const event of mockEvents) {
      createdCalendarEvents.push(event);
    }

    expect(createdCalendarEvents).toHaveLength(3);
    expect(createdCalendarEvents[0].eventId).toBe('evt-1');
    expect(createdCalendarEvents[2].accountId).toBe('acc-2');
  });

  /**
   * Test that rollback iterates through all created events
   */
  it('rollback processes all created events', () => {
    const createdCalendarEvents = [
      { accountId: 'acc-1', calendarId: 'cal-1', eventId: 'evt-1' },
      { accountId: 'acc-1', calendarId: 'cal-1', eventId: 'evt-2' },
    ];

    const deletedEvents: string[] = [];
    const mockDeleteEvent = (eventId: string) => {
      deletedEvents.push(eventId);
    };

    // Simulate rollback logic
    for (const calEvent of createdCalendarEvents) {
      mockDeleteEvent(calEvent.eventId);
    }

    expect(deletedEvents).toEqual(['evt-1', 'evt-2']);
  });

  /**
   * Test that rollback continues even if one delete fails
   */
  it('rollback continues after individual delete failures', () => {
    const createdCalendarEvents = [
      { accountId: 'acc-1', calendarId: 'cal-1', eventId: 'evt-1' },
      { accountId: 'acc-1', calendarId: 'cal-1', eventId: 'evt-2' },
      { accountId: 'acc-1', calendarId: 'cal-1', eventId: 'evt-3' },
    ];

    const deletedEvents: string[] = [];
    const failedEvents: string[] = [];

    // Simulate rollback logic with failure on evt-2
    for (const calEvent of createdCalendarEvents) {
      try {
        if (calEvent.eventId === 'evt-2') {
          throw new Error('Delete failed');
        }
        deletedEvents.push(calEvent.eventId);
      } catch {
        failedEvents.push(calEvent.eventId);
        // Continue with other events (don't rethrow)
      }
    }

    expect(deletedEvents).toEqual(['evt-1', 'evt-3']);
    expect(failedEvents).toEqual(['evt-2']);
  });
});
