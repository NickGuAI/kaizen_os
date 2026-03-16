import { WorkItemAdapter } from './WorkItemAdapter';
import { WorkItemSource, WorkItemKind } from './WorkItemTypes';

/**
 * Registry of available WorkItem adapters.
 * New adapters self-register during initialization.
 */
const adapters: Map<WorkItemSource, WorkItemAdapter> = new Map();

export function registerAdapter(adapter: WorkItemAdapter): void {
  if (adapters.has(adapter.source)) {
    console.warn(`Overwriting adapter for source: ${adapter.source}`);
  }
  adapters.set(adapter.source, adapter);
}

export function getAdapter(source: WorkItemSource): WorkItemAdapter | undefined {
  return adapters.get(source);
}

export function getAllAdapters(): WorkItemAdapter[] {
  return Array.from(adapters.values());
}

export function getAdaptersForKind(kind: WorkItemKind): WorkItemAdapter[] {
  return getAllAdapters().filter((a) => a.kinds.includes(kind));
}

/**
 * Get all adapters that are enabled for a user.
 * In Phase 1-3, this returns all registered adapters.
 * Later phases may filter based on user's connected accounts.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getEnabledAdapters(_userId: string): WorkItemAdapter[] {
  // TODO: Filter based on user's connected accounts
  return getAllAdapters();
}
