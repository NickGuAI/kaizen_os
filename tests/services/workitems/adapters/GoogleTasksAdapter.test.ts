import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleTasksAdapter } from '@/services/workitems/adapters/GoogleTasksAdapter';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    calendarAccount: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/services/calendar/tokenService', () => ({
  getAuthenticatedClient: vi.fn(),
}));

vi.mock('googleapis', () => ({
  google: {
    tasks: vi.fn(),
  },
}));

import { prisma } from '@/lib/db';
import { getAuthenticatedClient } from '@/services/calendar/tokenService';
import { google } from 'googleapis';

describe('GoogleTasksAdapter', () => {
  let adapter: GoogleTasksAdapter;

  beforeEach(() => {
    adapter = new GoogleTasksAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('properties', () => {
    it('should have correct source', () => {
      expect(adapter.source).toBe('google_tasks');
    });

    it('should have correct kinds', () => {
      expect(adapter.kinds).toEqual(['task']);
    });
  });

  describe('listForRange', () => {
    const mockAccount = {
      id: 'account-123',
      userId: 1,
      provider: 'google',
      email: 'test@example.com',
      selectedCalendarIds: ['primary'],
    };

    const mockTaskList = {
      id: 'tasklist-1',
      title: 'My Tasks',
    };

    const mockTask = {
      id: 'task-1',
      title: 'Complete project',
      due: '2024-01-15T00:00:00.000Z',
      status: 'needsAction',
      webViewLink: 'https://tasks.google.com/task/1',
    };

    const mockCompletedTask = {
      id: 'task-2',
      title: 'Finished task',
      due: '2024-01-14T00:00:00.000Z',
      status: 'completed',
      completed: '2024-01-14T10:00:00.000Z',
    };

    it('should return empty array when no accounts found', async () => {
      vi.mocked(prisma.calendarAccount.findMany).mockResolvedValue([]);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result).toEqual([]);
    });

    it('should fetch tasks from all task lists', async () => {
      vi.mocked(prisma.calendarAccount.findMany).mockResolvedValue([mockAccount as any]);

      const mockAuth = {};
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockAuth as any);

      const mockTasksApi = {
        tasklists: {
          list: vi.fn().mockResolvedValue({
            data: { items: [mockTaskList] },
          }),
        },
        tasks: {
          list: vi.fn().mockResolvedValue({
            data: { items: [mockTask, mockCompletedTask] },
          }),
        },
      };
      vi.mocked(google.tasks).mockReturnValue(mockTasksApi as any);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result).toHaveLength(2);
      expect(google.tasks).toHaveBeenCalledWith({ version: 'v1', auth: mockAuth });
      expect(mockTasksApi.tasklists.list).toHaveBeenCalled();
      // dueMin is buffered by -1 day, dueMax by +2 days (exclusive date filtering on Google's side)
      expect(mockTasksApi.tasks.list).toHaveBeenCalledWith({
        tasklist: 'tasklist-1',
        showCompleted: true,
        showHidden: true,
        dueMin: '2023-12-31T00:00:00.000Z',
        dueMax: '2024-02-02T23:59:59.000Z',
        maxResults: 100,
      });
      expect(mockTasksApi.tasks.list).toHaveBeenCalledWith({
        tasklist: 'tasklist-1',
        showCompleted: true,
        showHidden: true,
        completedMin: '2024-01-01T00:00:00Z',
        completedMax: '2024-01-31T23:59:59Z',
        maxResults: 100,
      });
    });

    it('should preserve timezone offset when computing dueMax', async () => {
      vi.mocked(prisma.calendarAccount.findMany).mockResolvedValue([mockAccount as any]);

      const mockAuth = {};
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockAuth as any);

      const mockTasksApi = {
        tasklists: {
          list: vi.fn().mockResolvedValue({
            data: { items: [mockTaskList] },
          }),
        },
        tasks: {
          list: vi.fn().mockResolvedValue({
            data: { items: [] },
          }),
        },
      };
      vi.mocked(google.tasks).mockReturnValue(mockTasksApi as any);

      await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00.000-08:00',
        endIso: '2024-01-31T23:59:59.999-08:00',
      });

      expect(mockTasksApi.tasks.list).toHaveBeenCalledWith({
        tasklist: 'tasklist-1',
        showCompleted: true,
        showHidden: true,
        dueMin: '2023-12-31T00:00:00.000-08:00',
        dueMax: '2024-02-02T23:59:59.999-08:00',
        maxResults: 100,
      });
    });

    it('should filter tasks by local due date and include completed in range', async () => {
      vi.mocked(prisma.calendarAccount.findMany).mockResolvedValue([mockAccount as any]);

      const mockAuth = {};
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockAuth as any);

      const dueInRange = {
        ...mockTask,
        id: 'task-in-range',
        title: 'In range',
        due: '2024-01-24T00:00:00.000Z',
      };
      const dueOutOfRange = {
        ...mockTask,
        id: 'task-out-of-range',
        title: 'Out of range',
        due: '2024-01-25T00:00:00.000Z',
      };
      const completedNoDue = {
        id: 'task-completed',
        title: 'Completed',
        status: 'completed',
        completed: '2024-01-24T12:00:00.000Z',
      };

      const mockTasksApi = {
        tasklists: {
          list: vi.fn().mockResolvedValue({
            data: { items: [mockTaskList] },
          }),
        },
        tasks: {
          list: vi.fn()
            .mockResolvedValueOnce({
              data: { items: [dueInRange, dueOutOfRange] },
            })
            .mockResolvedValueOnce({
              data: { items: [completedNoDue] },
            }),
        },
      };
      vi.mocked(google.tasks).mockReturnValue(mockTasksApi as any);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-24T00:00:00.000-05:00',
        endIso: '2024-01-24T23:59:59.999-05:00',
      });

      const titles = result.map((item) => item.title).sort();
      expect(titles).toEqual(['Completed', 'In range']);
    });

    it('should map task to WorkItem with correct key format', async () => {
      vi.mocked(prisma.calendarAccount.findMany).mockResolvedValue([mockAccount as any]);

      const mockAuth = {};
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockAuth as any);

      const mockTasksApi = {
        tasklists: {
          list: vi.fn().mockResolvedValue({
            data: { items: [mockTaskList] },
          }),
        },
        tasks: {
          list: vi.fn()
            .mockResolvedValueOnce({
              data: { items: [mockTask] },
            })
            .mockResolvedValueOnce({
              data: { items: [] },
            }),
        },
      };
      vi.mocked(google.tasks).mockReturnValue(mockTasksApi as any);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result[0]).toMatchObject({
        kind: 'task',
        source: 'google_tasks',
        key: 'gtasks:account-123:tasklist-1:task-1',
        title: 'Complete project',
        dueAt: '2024-01-15T00:00:00.000Z',
        status: 'open',
        url: 'https://tasks.google.com/task/1',
      });
    });

    it('should map completed task status correctly', async () => {
      vi.mocked(prisma.calendarAccount.findMany).mockResolvedValue([mockAccount as any]);

      const mockAuth = {};
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockAuth as any);

      const mockTasksApi = {
        tasklists: {
          list: vi.fn().mockResolvedValue({
            data: { items: [mockTaskList] },
          }),
        },
        tasks: {
          list: vi.fn()
            .mockResolvedValueOnce({
              data: { items: [] },
            })
            .mockResolvedValueOnce({
              data: { items: [mockCompletedTask] },
            }),
        },
      };
      vi.mocked(google.tasks).mockReturnValue(mockTasksApi as any);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result[0]).toMatchObject({
        status: 'done',
        completedAt: '2024-01-14T10:00:00.000Z',
      });
    });

    it('should filter by accountId when provided', async () => {
      vi.mocked(prisma.calendarAccount.findMany).mockResolvedValue([mockAccount as any]);

      const mockAuth = {};
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockAuth as any);

      const mockTasksApi = {
        tasklists: {
          list: vi.fn().mockResolvedValue({ data: { items: [] } }),
        },
      };
      vi.mocked(google.tasks).mockReturnValue(mockTasksApi as any);

      await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
        accountId: 'specific-account',
      });

      expect(prisma.calendarAccount.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          provider: 'google',
          id: 'specific-account',
        },
      });
    });

    it('should continue on task list error', async () => {
      vi.mocked(prisma.calendarAccount.findMany).mockResolvedValue([mockAccount as any]);

      const mockAuth = {};
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockAuth as any);

      const mockTasksApi = {
        tasklists: {
          list: vi.fn().mockResolvedValue({
            data: { items: [mockTaskList, { id: 'tasklist-2' }] },
          }),
        },
        tasks: {
          list: vi.fn()
            .mockRejectedValueOnce(new Error('API error'))
            .mockResolvedValueOnce({ data: { items: [mockTask] } })
            .mockResolvedValueOnce({ data: { items: [] } })
            .mockResolvedValueOnce({ data: { items: [] } }),
        },
      };
      vi.mocked(google.tasks).mockReturnValue(mockTasksApi as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should continue on account error', async () => {
      vi.mocked(prisma.calendarAccount.findMany).mockResolvedValue([
        mockAccount as any,
        { ...mockAccount, id: 'account-456' } as any,
      ]);

      vi.mocked(getAuthenticatedClient)
        .mockRejectedValueOnce(new Error('Auth error'))
        .mockResolvedValueOnce({} as any);

      const mockTasksApi = {
        tasklists: {
          list: vi.fn().mockResolvedValue({ data: { items: [mockTaskList] } }),
        },
        tasks: {
          list: vi.fn().mockResolvedValue({ data: { items: [mockTask] } }),
        },
      };
      vi.mocked(google.tasks).mockReturnValue(mockTasksApi as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should skip tasks without id or title', async () => {
      vi.mocked(prisma.calendarAccount.findMany).mockResolvedValue([mockAccount as any]);

      const mockAuth = {};
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockAuth as any);

      const mockTasksApi = {
        tasklists: {
          list: vi.fn().mockResolvedValue({
            data: { items: [mockTaskList] },
          }),
        },
        tasks: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [
                mockTask,
                { id: 'task-no-title' }, // missing title
                { title: 'No ID task' }, // missing id
              ],
            },
          }),
        },
      };
      vi.mocked(google.tasks).mockReturnValue(mockTasksApi as any);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Complete project');
    });
  });
});
