import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  attachOverlays,
  linkWorkItem,
  unlinkWorkItem,
  getWorkItemLink,
  setDailyFocus,
  getDailyFocus,
  clearDailyFocus,
} from '@/services/workitems/workItemService';
import { WorkItem } from '@/services/workitems/WorkItemTypes';
import { parseLocalDate } from '@/utils/dateUtils';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    workItemLink: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    dailyFocus: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';

describe('WorkItem Overlays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('attachOverlays', () => {
    const mockWorkItems: WorkItem[] = [
      {
        kind: 'event',
        source: 'google_calendar',
        key: 'gcal:acc1:cal1:evt1:inst1',
        title: 'Meeting',
        startAt: '2024-01-15T10:00:00Z',
        endAt: '2024-01-15T11:00:00Z',
        status: 'confirmed',
      },
      {
        kind: 'task',
        source: 'google_tasks',
        key: 'gtasks:acc1:list1:task1',
        title: 'Complete report',
        dueAt: '2024-01-15T17:00:00Z',
        status: 'open',
      },
    ];

    it('should return empty array for empty input', async () => {
      const result = await attachOverlays(1, '2024-01-15', []);
      expect(result).toEqual([]);
      expect(prisma.workItemLink.findMany).not.toHaveBeenCalled();
    });

    it('should attach linkedCardId from WorkItemLink', async () => {
      vi.mocked(prisma.workItemLink.findMany).mockResolvedValue([
        {
          id: 'link-1',
          userId: 1,
          workItemKey: 'gcal:acc1:cal1:evt1:inst1',
          source: 'google_calendar',
          kind: 'event',
          cardId: 42,
          createdAt: new Date(),
          updatedAt: new Date(),
          card: { id: 42, title: 'Project Alpha' },
        },
      ] as any);

      vi.mocked(prisma.dailyFocus.findUnique).mockResolvedValue(null);

      const result = await attachOverlays(1, '2024-01-15', mockWorkItems);

      expect(result).toHaveLength(2);
      expect(result[0].linkedCardId).toBe(42);
      expect(result[0].linkedCardTitle).toBe('Project Alpha');
      expect(result[1].linkedCardId).toBeUndefined();
    });

    it('should attach focusRank from DailyFocus', async () => {
      vi.mocked(prisma.workItemLink.findMany).mockResolvedValue([]);
      vi.mocked(prisma.dailyFocus.findUnique).mockResolvedValue({
        id: 'focus-1',
        userId: 1,
        date: new Date('2024-01-15'),
        topKeys: ['gtasks:acc1:list1:task1', 'gcal:acc1:cal1:evt1:inst1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await attachOverlays(1, '2024-01-15', mockWorkItems);

      expect(result).toHaveLength(2);
      // Task is first in topKeys, so rank 1
      expect(result[1].focusRank).toBe(1);
      // Event is second in topKeys, so rank 2
      expect(result[0].focusRank).toBe(2);
    });

    it('should attach both linkedCardId and focusRank', async () => {
      vi.mocked(prisma.workItemLink.findMany).mockResolvedValue([
        {
          id: 'link-1',
          userId: 1,
          workItemKey: 'gcal:acc1:cal1:evt1:inst1',
          source: 'google_calendar',
          kind: 'event',
          cardId: 42,
          createdAt: new Date(),
          updatedAt: new Date(),
          card: { id: 42, title: 'Project Alpha' },
        },
      ] as any);

      vi.mocked(prisma.dailyFocus.findUnique).mockResolvedValue({
        id: 'focus-1',
        userId: 1,
        date: new Date('2024-01-15'),
        topKeys: ['gcal:acc1:cal1:evt1:inst1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await attachOverlays(1, '2024-01-15', mockWorkItems);

      expect(result[0].linkedCardId).toBe(42);
      expect(result[0].linkedCardTitle).toBe('Project Alpha');
      expect(result[0].focusRank).toBe(1);
    });
  });

  describe('linkWorkItem', () => {
    it('should create WorkItemLink with correct source for gcal', async () => {
      vi.mocked(prisma.workItemLink.upsert).mockResolvedValue({} as any);

      await linkWorkItem(1, 'gcal:acc1:cal1:evt1:inst1', 42);

      expect(prisma.workItemLink.upsert).toHaveBeenCalledWith({
        where: { workItemKey: 'gcal:acc1:cal1:evt1:inst1' },
        update: { cardId: 42 },
        create: {
          userId: 1,
          workItemKey: 'gcal:acc1:cal1:evt1:inst1',
          source: 'google_calendar',
          kind: 'event',
          cardId: 42,
        },
      });
    });

    it('should create WorkItemLink with correct source for gtasks', async () => {
      vi.mocked(prisma.workItemLink.upsert).mockResolvedValue({} as any);

      await linkWorkItem(1, 'gtasks:acc1:list1:task1', 42);

      expect(prisma.workItemLink.upsert).toHaveBeenCalledWith({
        where: { workItemKey: 'gtasks:acc1:list1:task1' },
        update: { cardId: 42 },
        create: {
          userId: 1,
          workItemKey: 'gtasks:acc1:list1:task1',
          source: 'google_tasks',
          kind: 'task',
          cardId: 42,
        },
      });
    });

    it('should create WorkItemLink with correct source for notion', async () => {
      vi.mocked(prisma.workItemLink.upsert).mockResolvedValue({} as any);

      await linkWorkItem(1, 'notion:acc1:db1:page1', 42);

      expect(prisma.workItemLink.upsert).toHaveBeenCalledWith({
        where: { workItemKey: 'notion:acc1:db1:page1' },
        update: { cardId: 42 },
        create: {
          userId: 1,
          workItemKey: 'notion:acc1:db1:page1',
          source: 'notion',
          kind: 'task',
          cardId: 42,
        },
      });
    });

    it('should allow null cardId to unlink', async () => {
      vi.mocked(prisma.workItemLink.upsert).mockResolvedValue({} as any);

      await linkWorkItem(1, 'gcal:acc1:cal1:evt1:inst1', null);

      expect(prisma.workItemLink.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { cardId: null },
          create: expect.objectContaining({ cardId: null }),
        })
      );
    });
  });

  describe('unlinkWorkItem', () => {
    it('should delete WorkItemLink', async () => {
      vi.mocked(prisma.workItemLink.delete).mockResolvedValue({} as any);

      await unlinkWorkItem('gcal:acc1:cal1:evt1:inst1');

      expect(prisma.workItemLink.delete).toHaveBeenCalledWith({
        where: { workItemKey: 'gcal:acc1:cal1:evt1:inst1' },
      });
    });

    it('should not throw if link not found', async () => {
      vi.mocked(prisma.workItemLink.delete).mockRejectedValue(
        new Error('Not found')
      );

      await expect(
        unlinkWorkItem('nonexistent:key')
      ).resolves.not.toThrow();
    });
  });

  describe('getWorkItemLink', () => {
    it('should return link with card info', async () => {
      const mockLink = {
        id: 'link-1',
        userId: 1,
        workItemKey: 'gcal:acc1:cal1:evt1:inst1',
        source: 'google_calendar',
        kind: 'event',
        cardId: 42,
        createdAt: new Date(),
        updatedAt: new Date(),
        card: { id: 42, title: 'Project Alpha' },
      };

      vi.mocked(prisma.workItemLink.findUnique).mockResolvedValue(mockLink as any);

      const result = await getWorkItemLink('gcal:acc1:cal1:evt1:inst1');

      expect(result).toEqual(mockLink);
      expect(prisma.workItemLink.findUnique).toHaveBeenCalledWith({
        where: { workItemKey: 'gcal:acc1:cal1:evt1:inst1' },
        include: { card: { select: { id: true, title: true } } },
      });
    });

    it('should return null if not found', async () => {
      vi.mocked(prisma.workItemLink.findUnique).mockResolvedValue(null);

      const result = await getWorkItemLink('nonexistent:key');

      expect(result).toBeNull();
    });
  });

  describe('setDailyFocus', () => {
    it('should create DailyFocus with topKeys', async () => {
      vi.mocked(prisma.dailyFocus.upsert).mockResolvedValue({} as any);

      await setDailyFocus(1, '2024-01-15', ['key1', 'key2', 'key3']);

      expect(prisma.dailyFocus.upsert).toHaveBeenCalledWith({
        where: {
          userId_date: {
            userId: 1,
            date: parseLocalDate('2024-01-15'),
          },
        },
        update: { topKeys: ['key1', 'key2', 'key3'] },
        create: {
          userId: 1,
          date: parseLocalDate('2024-01-15'),
          topKeys: ['key1', 'key2', 'key3'],
        },
      });
    });

    it('should throw if more than 3 items', async () => {
      await expect(
        setDailyFocus(1, '2024-01-15', ['key1', 'key2', 'key3', 'key4'])
      ).rejects.toThrow('DailyFocus can have at most 3 items');

      expect(prisma.dailyFocus.upsert).not.toHaveBeenCalled();
    });

    it('should allow empty topKeys', async () => {
      vi.mocked(prisma.dailyFocus.upsert).mockResolvedValue({} as any);

      await setDailyFocus(1, '2024-01-15', []);

      expect(prisma.dailyFocus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { topKeys: [] },
        })
      );
    });
  });

  describe('getDailyFocus', () => {
    it('should return DailyFocus for date', async () => {
      const mockFocus = {
        id: 'focus-1',
        userId: 1,
        date: new Date('2024-01-15'),
        topKeys: ['key1', 'key2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.dailyFocus.findUnique).mockResolvedValue(mockFocus as any);

      const result = await getDailyFocus(1, '2024-01-15');

      expect(result).toEqual(mockFocus);
      expect(prisma.dailyFocus.findUnique).toHaveBeenCalledWith({
        where: {
          userId_date: {
            userId: 1,
            date: parseLocalDate('2024-01-15'),
          },
        },
      });
    });

    it('should return null if not found', async () => {
      vi.mocked(prisma.dailyFocus.findUnique).mockResolvedValue(null);

      const result = await getDailyFocus(1, '2024-01-15');

      expect(result).toBeNull();
    });
  });

  describe('clearDailyFocus', () => {
    it('should delete DailyFocus for date', async () => {
      vi.mocked(prisma.dailyFocus.delete).mockResolvedValue({} as any);

      await clearDailyFocus(1, '2024-01-15');

      expect(prisma.dailyFocus.delete).toHaveBeenCalledWith({
        where: {
          userId_date: {
            userId: 1,
            date: parseLocalDate('2024-01-15'),
          },
        },
      });
    });

    it('should not throw if focus not found', async () => {
      vi.mocked(prisma.dailyFocus.delete).mockRejectedValue(
        new Error('Not found')
      );

      await expect(
        clearDailyFocus(1, '2024-01-15')
      ).resolves.not.toThrow();
    });
  });
});
