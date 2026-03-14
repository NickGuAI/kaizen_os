/**
 * Tests for geminiService AI response utilities.
 *
 * Key invariant under test: normalizeAIActionTitle strips the [TYPE] prefix
 * that buildPrompt adds to card titles, so the card lookup in
 * aiClassificationService finds the correct card regardless of whether the
 * AI echoes the prefix or not.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeAIActionTitle,
  parseClassificationXml,
  aggregateVotes,
  getTopActions,
} from '../../../src/services/ai/geminiService';

// ---------------------------------------------------------------------------
// normalizeAIActionTitle
// ---------------------------------------------------------------------------
describe('normalizeAIActionTitle', () => {
  it('strips [OPS] prefix', () => {
    expect(normalizeAIActionTitle('[OPS] Operational Tasks For Life'))
      .toBe('operational tasks for life');
  });

  it('strips [EXPERIMENT] prefix', () => {
    expect(normalizeAIActionTitle('[EXPERIMENT] Build a habit tracker'))
      .toBe('build a habit tracker');
  });

  it('strips [ROUTINE] prefix', () => {
    expect(normalizeAIActionTitle('[ROUTINE] Exercise daily for 30 minutes'))
      .toBe('exercise daily for 30 minutes');
  });

  it('strips [GATE] prefix', () => {
    expect(normalizeAIActionTitle('[GATE] Launch MVP'))
      .toBe('launch mvp');
  });

  it('lowercases result', () => {
    expect(normalizeAIActionTitle('Operational Tasks For Life'))
      .toBe('operational tasks for life');
  });

  it('is a no-op for plain lowercase title (no prefix)', () => {
    expect(normalizeAIActionTitle('operational tasks for life'))
      .toBe('operational tasks for life');
  });

  it('handles extra whitespace after prefix', () => {
    expect(normalizeAIActionTitle('[OPS]   Operational Tasks For Life'))
      .toBe('operational tasks for life');
  });
});

// ---------------------------------------------------------------------------
// parseClassificationXml
// ---------------------------------------------------------------------------
describe('parseClassificationXml', () => {
  it('parses a single task with two actions', () => {
    const xml = `
<classifications>
  <task name="Woke up">
    <action>[OPS] Operational Tasks For Life</action>
    <action>[ROUTINE] Exercise daily for 30 minutes</action>
  </task>
</classifications>`;
    const result = parseClassificationXml(xml);
    expect(result.get('Woke up')).toEqual([
      '[OPS] Operational Tasks For Life',
      '[ROUTINE] Exercise daily for 30 minutes',
    ]);
  });

  it('parses multiple tasks', () => {
    const xml = `
<classifications>
  <task name="Woke up">
    <action>[OPS] Operational Tasks For Life</action>
  </task>
  <task name="Breakfast">
    <action>[OPS] Operational Tasks For Life</action>
    <action>[EXPERIMENT] Consistent diet experiment</action>
  </task>
</classifications>`;
    const result = parseClassificationXml(xml);
    expect(result.size).toBe(2);
    expect(result.get('Breakfast')).toEqual([
      '[OPS] Operational Tasks For Life',
      '[EXPERIMENT] Consistent diet experiment',
    ]);
  });

  it('returns empty map for empty string', () => {
    expect(parseClassificationXml('').size).toBe(0);
  });

  it('ignores tasks with no <action> children', () => {
    const xml = `<classifications><task name="Empty"></task></classifications>`;
    expect(parseClassificationXml(xml).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// aggregateVotes
// ---------------------------------------------------------------------------
describe('aggregateVotes', () => {
  it('counts votes across multiple responses', () => {
    const responses = [
      `<classifications>
        <task name="Woke up"><action>[OPS] Operational Tasks For Life</action></task>
      </classifications>`,
      `<classifications>
        <task name="Woke up"><action>[OPS] Operational Tasks For Life</action></task>
      </classifications>`,
      `<classifications>
        <task name="Woke up"><action>[ROUTINE] Exercise daily</action></task>
      </classifications>`,
    ];
    const votes = aggregateVotes(responses);
    const wokeUpVotes = votes.get('Woke up')!;
    expect(wokeUpVotes.get('[OPS] Operational Tasks For Life')).toBe(2);
    expect(wokeUpVotes.get('[ROUTINE] Exercise daily')).toBe(1);
  });

  it('returns empty map for empty responses array', () => {
    expect(aggregateVotes([]).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getTopActions
// ---------------------------------------------------------------------------
describe('getTopActions', () => {
  it('returns top 2 by vote count', () => {
    const votes = new Map([
      ['Woke up', new Map([
        ['[OPS] Operational Tasks For Life', 4],
        ['[ROUTINE] Exercise daily', 2],
        ['[EXPERIMENT] Fasting', 1],
      ])],
    ]);
    const top = getTopActions(votes, 2);
    const wokeUp = top.get('Woke up')!;
    expect(wokeUp).toHaveLength(2);
    expect(wokeUp[0].action).toBe('[OPS] Operational Tasks For Life');
    expect(wokeUp[0].votes).toBe(4);
    expect(wokeUp[1].action).toBe('[ROUTINE] Exercise daily');
  });
});

// ---------------------------------------------------------------------------
// Numeric ID voting (new approach — IDs cannot be paraphrased by the AI)
// ---------------------------------------------------------------------------
describe('aggregateVotes with numeric action IDs', () => {
  it('counts votes for numeric action strings exactly', () => {
    const responses = [
      `<classifications><task name="Woke up"><action>1</action></task></classifications>`,
      `<classifications><task name="Woke up"><action>1</action></task></classifications>`,
      `<classifications><task name="Woke up"><action>2</action></task></classifications>`,
      `<classifications><task name="Woke up"><action>1</action></task></classifications>`,
    ];
    const votes = aggregateVotes(responses);
    const wokeUpVotes = votes.get('Woke up')!;
    expect(wokeUpVotes.get('1')).toBe(3);
    expect(wokeUpVotes.get('2')).toBe(1);
  });

  it('no normalization needed — numeric strings are always exact matches', () => {
    // "1" === "1": no prefix stripping, no lowercasing required
    const votes = new Map([
      ['Woke up', new Map([['1', 5], ['3', 2]])],
    ]);
    const top = getTopActions(votes, 2);
    const wokeUp = top.get('Woke up')!;
    expect(wokeUp[0].action).toBe('1');
    expect(wokeUp[0].votes).toBe(5);
    expect(wokeUp[1].action).toBe('3');
  });

  it('5 identical numeric responses → top action is ID "1" with 5 votes', () => {
    const response = `
<classifications>
  <task name="Woke up">
    <action>1</action>
    <action>3</action>
  </task>
</classifications>`;
    const responses = Array(5).fill(response);
    const votes = aggregateVotes(responses);
    const topActions = getTopActions(votes, 2);
    const wokeUp = topActions.get('Woke up')!;
    expect(wokeUp).toHaveLength(2);
    expect(wokeUp[0].action).toBe('1');
    expect(wokeUp[0].votes).toBe(5);
    expect(wokeUp[1].action).toBe('3');
    expect(wokeUp[1].votes).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Integration: normalizeAIActionTitle bridges aggregateVotes → card lookup
// ---------------------------------------------------------------------------
describe('normalizeAIActionTitle integration with aggregateVotes', () => {
  it('top voted action normalizes to match raw DB card title', () => {
    // Simulate 5 parallel responses all agreeing on OPS for "Woke up"
    const response = `
<classifications>
  <task name="Woke up">
    <action>[OPS] Operational Tasks For Life</action>
    <action>[ROUTINE] Exercise daily for 30 minutes</action>
  </task>
</classifications>`;
    const responses = Array(5).fill(response);

    const votes = aggregateVotes(responses);
    const topActions = getTopActions(votes, 2);

    const wokeUp = topActions.get('Woke up')!;
    expect(wokeUp[0].action).toBe('[OPS] Operational Tasks For Life');

    // Simulate the card lookup that aiClassificationService does
    const cardByTitle = new Map([
      ['operational tasks for life', { id: 'ops-card-id' }],
      ['exercise daily for 30 minutes', { id: 'routine-card-id' }],
    ]);

    const resolved = wokeUp
      .map(s => cardByTitle.get(normalizeAIActionTitle(s.action)))
      .filter(Boolean);

    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toEqual({ id: 'ops-card-id' });
    expect(resolved[1]).toEqual({ id: 'routine-card-id' });
  });

  it('card lookup fails WITHOUT normalization (demonstrates the original bug)', () => {
    const cardByTitle = new Map([
      ['operational tasks for life', { id: 'ops-card-id' }],
    ]);

    // Without normalization the [OPS] prefix causes a miss
    const rawAction = '[OPS] Operational Tasks For Life';
    expect(cardByTitle.get(rawAction.toLowerCase())).toBeUndefined();

    // With normalization it resolves correctly
    expect(cardByTitle.get(normalizeAIActionTitle(rawAction))).toEqual({ id: 'ops-card-id' });
  });
});
