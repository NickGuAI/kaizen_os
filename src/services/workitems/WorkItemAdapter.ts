import { WorkItem, WorkItemSource, WorkItemKind } from './WorkItemTypes';

/**
 * Parameters for listing work items in a date range.
 */
export interface ListForRangeParams {
  userId: string;
  startIso: string; // Start of range (inclusive)
  endIso: string; // End of range (exclusive)
  accountId?: string; // Optional: filter to specific account
}

/**
 * WorkItemAdapter: Port interface for external data sources.
 * Each provider implements this to translate their API into WorkItems.
 *
 * ADAPTER CONTRACT:
 *
 * 1. Idempotency: Same params should return consistent keys.
 *    Keys must be stable across calls for the same underlying item.
 *
 * 2. Error Handling: Throw errors for auth failures, network issues.
 *    Return empty array if no items found (not an error).
 *
 * 3. Date Range Semantics:
 *    - Events: Include if any part overlaps with [startIso, endIso)
 *    - Tasks: Include if dueAt falls within range, OR if no dueAt
 *
 * 4. Account Filtering:
 *    - If accountId provided: Only return items from that account
 *    - If accountId omitted: Return items from all user's accounts for this source
 *
 * 5. Raw Data: Populate `raw` field with original provider response
 *    for debugging. May be omitted in production for performance.
 */
export interface WorkItemAdapter {
  /** Identifier for this adapter */
  readonly source: WorkItemSource;

  /** What kind(s) of items this adapter provides */
  readonly kinds: WorkItemKind[];

  /**
   * List work items within a date range.
   * For events: items that overlap with the range
   * For tasks: items due within the range (or all if no due date filter)
   */
  listForRange(params: ListForRangeParams): Promise<WorkItem[]>;

  /**
   * Mark a work item as complete in the external provider.
   * Optional: adapters can implement this for task sources that support completion.
   */
  complete?(key: string): Promise<void>;

  /**
   * Create a new work item in the external provider.
   * Optional: adapters can implement this for sources that support creation.
   */
  create?(userId: string, data: { title: string; dueAt?: string; notes?: string }): Promise<WorkItem>;

  /**
   * Fetch specific work items by their keys.
   * Optional: adapters can implement this for fetching planned items not in date range.
   */
  listByKeys?(userId: string, keys: string[]): Promise<WorkItem[]>;
}

/**
 * Future extension points (not implemented yet):
 * - update(key: string, patch: Partial<WorkItem>): Promise<WorkItem>
 */
