import { registerAdapter } from '../adapterFactory';
import { GoogleCalendarAdapter } from './GoogleCalendarAdapter';
import { GoogleTasksAdapter } from './GoogleTasksAdapter';
import { NotionAdapter } from './NotionAdapter';

export { GoogleCalendarAdapter } from './GoogleCalendarAdapter';
export { GoogleTasksAdapter } from './GoogleTasksAdapter';
export { NotionAdapter } from './NotionAdapter';

/**
 * Initialize all work item adapters.
 * Call this during app startup.
 */
export function initializeAdapters(): void {
  registerAdapter(new GoogleCalendarAdapter());
  registerAdapter(new GoogleTasksAdapter());
  registerAdapter(new NotionAdapter());
}
