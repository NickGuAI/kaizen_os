import { google, tasks_v1 } from 'googleapis';
import { DateTime } from 'luxon';
import { WorkItemAdapter, ListForRangeParams } from '../WorkItemAdapter';
import { WorkItem, WorkItemSource, WorkItemKind, WorkItemStatus, buildWorkItemKey } from '../WorkItemTypes';
import { prisma } from '../../../lib/db';
import { getAuthenticatedClient } from '../../calendar/tokenService';
import { addDaysToIso } from '../../../utils/dateUtils';

/**
 * Google Tasks adapter.
 * Fetches tasks from Google Tasks API and maps them to WorkItems.
 * Uses the same Google OAuth credentials as calendar (tasks.readonly scope added in Phase 4).
 */
export class GoogleTasksAdapter implements WorkItemAdapter {
  readonly source: WorkItemSource = 'google_tasks';
  readonly kinds: WorkItemKind[] = ['task'];

  async listForRange(params: ListForRangeParams): Promise<WorkItem[]> {
    const { userId, startIso, endIso, accountId } = params;

    // Get user's Google accounts (same accounts as calendar)
    const accounts = await prisma.calendarAccount.findMany({
      where: {
        userId,
        provider: 'google',
        ...(accountId ? { id: accountId } : {}),
      },
    });

    if (accounts.length === 0) {
      return [];
    }

    const allWorkItems: WorkItem[] = [];

    for (const account of accounts) {
      try {
        const auth = await getAuthenticatedClient(account.id);
        const tasksApi = google.tasks({ version: 'v1', auth });

        // Determine which task lists to query
        let taskListIds: string[] = [];

        if (account.selectedTaskListId) {
          // User selected a specific task list
          taskListIds = [account.selectedTaskListId];
        } else {
          // No specific list selected - get all task lists
          const taskListsResponse = await tasksApi.tasklists.list();
          taskListIds = (taskListsResponse.data.items || [])
            .filter((list) => list.id)
            .map((list) => list.id!);
        }

        for (const taskListId of taskListIds) {
          try {
            // Fetch tasks with buffered due range; Google compares date-only values in a timezone-dependent way.
            const adjustedDueMin = addDaysToIso(startIso, -1) || startIso;
            const adjustedDueMax = addDaysToIso(endIso, 2) || endIso;

            const tasksById = new Map<string, tasks_v1.Schema$Task>();

            try {
              const dueTasksResponse = await tasksApi.tasks.list({
                tasklist: taskListId,
                showCompleted: true,
                showHidden: true,
                dueMin: adjustedDueMin,
                dueMax: adjustedDueMax,
                maxResults: 100,
              });

              (dueTasksResponse.data.items || []).forEach((task) => {
                if (task.id) tasksById.set(task.id, task);
              });
            } catch (taskListError) {
              console.error(`Failed to fetch due tasks from list ${taskListId}:`, taskListError);
            }

            // Include tasks completed in range even if they lack a due date.
            try {
              const completedTasksResponse = await tasksApi.tasks.list({
                tasklist: taskListId,
                showCompleted: true,
                showHidden: true,
                completedMin: startIso,
                completedMax: endIso,
                maxResults: 100,
              });

              (completedTasksResponse.data.items || []).forEach((task) => {
                if (task.id) tasksById.set(task.id, task);
              });
            } catch (taskListError) {
              console.error(`Failed to fetch completed tasks from list ${taskListId}:`, taskListError);
            }

            const tasks = Array.from(tasksById.values());
            const rangeStart = DateTime.fromISO(startIso, { setZone: true });
            const rangeEnd = DateTime.fromISO(endIso, { setZone: true });
            const startDate = rangeStart.isValid ? rangeStart.toFormat('yyyy-MM-dd') : '';
            const endDate = rangeEnd.isValid ? rangeEnd.toFormat('yyyy-MM-dd') : '';
            const rangeStartMillis = rangeStart.isValid ? rangeStart.toMillis() : NaN;
            const rangeEndMillis = rangeEnd.isValid ? rangeEnd.toMillis() : NaN;

            const filteredTasks = tasks.filter((task) => {
              if (task.due && startDate && endDate) {
                const taskDueDate = task.due.split('T')[0];
                if (taskDueDate >= startDate && taskDueDate <= endDate) {
                  return true;
                }
              }

              if (task.completed && !Number.isNaN(rangeStartMillis) && !Number.isNaN(rangeEndMillis)) {
                const completedAt = DateTime.fromISO(task.completed, { setZone: true });
                if (completedAt.isValid) {
                  const completedMillis = completedAt.toMillis();
                  return completedMillis >= rangeStartMillis && completedMillis <= rangeEndMillis;
                }
              }

              return false;
            });

            const workItems = filteredTasks
              .filter((task) => task.id && task.title)
              .map((task) =>
                this.mapTaskToWorkItem(task, account.id, taskListId)
              );

            allWorkItems.push(...workItems);
          } catch (taskListError) {
            console.error(`Failed to fetch tasks from list ${taskListId}:`, taskListError);
            // Continue with other task lists
          }
        }
      } catch (accountError) {
        console.error(`Failed to get tasks for account ${account.id}:`, accountError);
        // Continue with other accounts
      }
    }

    return allWorkItems;
  }

  /**
   * Complete a Google Task.
   */
  async complete(key: string): Promise<void> {
    const { accountId, segments } = this.parseKey(key);
    const [tasklistId, taskId] = segments;

    if (!tasklistId || !taskId) {
      throw new Error(`Invalid Google Tasks key format: ${key}`);
    }

    const auth = await getAuthenticatedClient(accountId);
    const tasksApi = google.tasks({ version: 'v1', auth });

    await tasksApi.tasks.patch({
      tasklist: tasklistId,
      task: taskId,
      requestBody: {
        id: taskId,
        status: 'completed',
        completed: new Date().toISOString(),
      },
    });
  }

  /**
   * Create a new Google Task.
   * Uses the user's selected task list if configured, otherwise falls back to default.
   */
  async create(userId: string, data: { title: string; dueAt?: string; notes?: string }): Promise<WorkItem> {
    // Get the user's Google account
    const accounts = await prisma.calendarAccount.findMany({
      where: { userId, provider: 'google' },
      take: 1,
    });

    if (accounts.length === 0) {
      throw new Error('No Google account connected');
    }

    const account = accounts[0];
    const auth = await getAuthenticatedClient(account.id);
    const tasksApi = google.tasks({ version: 'v1', auth });

    // Use selected task list if configured, otherwise get the default
    let targetListId = account.selectedTaskListId;

    if (!targetListId) {
      const taskListsResponse = await tasksApi.tasklists.list();
      const defaultList = taskListsResponse.data.items?.[0];
      if (!defaultList?.id) {
        throw new Error('No task lists found');
      }
      targetListId = defaultList.id;
    }

    const taskResponse = await tasksApi.tasks.insert({
      tasklist: targetListId,
      requestBody: {
        title: data.title,
        due: data.dueAt,
        notes: data.notes,
      },
    });

    const task = taskResponse.data;
    if (!task.id) {
      throw new Error('Failed to create task');
    }

    return this.mapTaskToWorkItem(task, account.id, targetListId);
  }

  /**
   * Fetch specific tasks by their keys.
   * Used to fetch planned tasks that may not be in the date range.
   */
  async listByKeys(_userId: string, keys: string[]): Promise<WorkItem[]> {
    // Filter to only gtasks keys
    const gtasksKeys = keys.filter((k) => k.startsWith('gtasks:'));
    if (gtasksKeys.length === 0) return [];

    // Group keys by accountId for efficiency
    const keysByAccount = new Map<string, Array<{ tasklistId: string; taskId: string; key: string }>>();
    for (const key of gtasksKeys) {
      const { accountId, segments } = this.parseKey(key);
      const [tasklistId, taskId] = segments;
      if (!tasklistId || !taskId) continue;

      if (!keysByAccount.has(accountId)) {
        keysByAccount.set(accountId, []);
      }
      keysByAccount.get(accountId)!.push({ tasklistId, taskId, key });
    }

    const workItems: WorkItem[] = [];

    for (const [accountId, tasks] of keysByAccount) {
      try {
        const auth = await getAuthenticatedClient(accountId);
        const tasksApi = google.tasks({ version: 'v1', auth });

        // Fetch each task (could batch but Google Tasks API doesn't support batch get)
        const results = await Promise.allSettled(
          tasks.map(async ({ tasklistId, taskId }) => {
            const response = await tasksApi.tasks.get({
              tasklist: tasklistId,
              task: taskId,
            });
            return { task: response.data, tasklistId };
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.task.id && result.value.task.title) {
            workItems.push(this.mapTaskToWorkItem(result.value.task, accountId, result.value.tasklistId));
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Account not found') {
          console.warn(`[GoogleTasks] Skipping stale WorkItemLink reference for account ${accountId} — account may have been disconnected`);
        } else {
          console.error(`Failed to fetch tasks for account ${accountId}:`, error);
        }
      }
    }

    return workItems;
  }

  /**
   * Parse a Google Tasks key into its components.
   */
  private parseKey(key: string): { accountId: string; segments: string[] } {
    const [_source, accountId, ...rest] = key.split(':');
    return { accountId, segments: rest };
  }

  /**
   * Map Google Task to WorkItem.
   * Key format: gtasks:{accountId}:{tasklistId}:{taskId}
   */
  private mapTaskToWorkItem(
    task: tasks_v1.Schema$Task,
    accountId: string,
    tasklistId: string
  ): WorkItem {
    const key = buildWorkItemKey('gtasks', accountId, tasklistId, task.id!);

    // Map Google Tasks status to WorkItemStatus
    let status: WorkItemStatus = 'open';
    if (task.status === 'completed') {
      status = 'done';
    }

    // Google Tasks API returns dates in RFC 3339 format
    const dueAt = task.due || undefined;
    const completedAt = task.completed || undefined;

    return {
      kind: 'task',
      source: 'google_tasks',
      key,
      title: task.title || '',
      url: task.webViewLink || undefined,
      dueAt,
      completedAt,
      status,
      raw: task,
    };
  }
}
