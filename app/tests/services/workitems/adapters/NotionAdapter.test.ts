import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotionAdapter } from '@/services/workitems/adapters/NotionAdapter';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    notionAccount: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/crypto', () => ({
  decryptToken: vi.fn((token: string) => `decrypted_${token}`),
}));

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { Client } from '@notionhq/client';

describe('NotionAdapter', () => {
  let adapter: NotionAdapter;

  beforeEach(() => {
    adapter = new NotionAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('properties', () => {
    it('should have correct source', () => {
      expect(adapter.source).toBe('notion');
    });

    it('should have correct kinds', () => {
      expect(adapter.kinds).toEqual(['task']);
    });
  });

  describe('listForRange', () => {
    const mockAccount = {
      id: 'notion-account-123',
      userId: 1,
      accessTokenEncrypted: 'encrypted_token',
      workspaceId: 'workspace-1',
      workspaceName: 'My Workspace',
      botId: 'bot-1',
      selectedDatabaseIds: ['db-1', 'db-2'],
    };

    const mockPage = {
      object: 'page',
      id: 'page-123',
      url: 'https://notion.so/page-123',
      properties: {
        Name: {
          type: 'title',
          title: [{ plain_text: 'Complete documentation' }],
        },
        Status: {
          type: 'status',
          status: { name: 'In Progress' },
        },
        Due: {
          type: 'date',
          date: { start: '2024-01-15' },
        },
      },
    };

    const mockCompletedPage = {
      object: 'page',
      id: 'page-456',
      url: 'https://notion.so/page-456',
      properties: {
        Name: {
          type: 'title',
          title: [{ plain_text: 'Finished task' }],
        },
        Status: {
          type: 'status',
          status: { name: 'Done' },
        },
        Due: {
          type: 'date',
          date: { start: '2024-01-14' },
        },
      },
    };

    it('should return empty array when no accounts found', async () => {
      vi.mocked(prisma.notionAccount.findMany).mockResolvedValue([]);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result).toEqual([]);
    });

    it('should return empty array when no databases selected', async () => {
      vi.mocked(prisma.notionAccount.findMany).mockResolvedValue([
        { ...mockAccount, selectedDatabaseIds: [] } as any,
      ]);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result).toEqual([]);
    });

    it('should fetch tasks from all selected databases', async () => {
      vi.mocked(prisma.notionAccount.findMany).mockResolvedValue([mockAccount as any]);

      const mockQuery = vi.fn().mockResolvedValue({
        results: [mockPage],
      });

      vi.mocked(Client).mockImplementation(() => ({
        databases: { query: mockQuery },
      }) as any);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      // Should query both databases
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2); // One page from each db
    });

    it('should map page to WorkItem with correct key format', async () => {
      vi.mocked(prisma.notionAccount.findMany).mockResolvedValue([
        { ...mockAccount, selectedDatabaseIds: ['db-1'] } as any,
      ]);

      const mockQuery = vi.fn().mockResolvedValue({
        results: [mockPage],
      });

      vi.mocked(Client).mockImplementation(() => ({
        databases: { query: mockQuery },
      }) as any);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result[0]).toMatchObject({
        kind: 'task',
        source: 'notion',
        key: 'notion:notion-account-123:db-1:page-123',
        title: 'Complete documentation',
        dueAt: '2024-01-15',
        status: 'open',
        url: 'https://notion.so/page-123',
      });
    });

    it('should map completed status correctly', async () => {
      vi.mocked(prisma.notionAccount.findMany).mockResolvedValue([
        { ...mockAccount, selectedDatabaseIds: ['db-1'] } as any,
      ]);

      const mockQuery = vi.fn().mockResolvedValue({
        results: [mockCompletedPage],
      });

      vi.mocked(Client).mockImplementation(() => ({
        databases: { query: mockQuery },
      }) as any);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result[0].status).toBe('done');
    });

    it('should handle checkbox Status property', async () => {
      const pageWithCheckbox = {
        ...mockPage,
        properties: {
          Name: mockPage.properties.Name,
          Status: { type: 'checkbox', checkbox: true },
          Due: mockPage.properties.Due,
        },
      };

      vi.mocked(prisma.notionAccount.findMany).mockResolvedValue([
        { ...mockAccount, selectedDatabaseIds: ['db-1'] } as any,
      ]);

      const mockQuery = vi.fn().mockResolvedValue({
        results: [pageWithCheckbox],
      });

      vi.mocked(Client).mockImplementation(() => ({
        databases: { query: mockQuery },
      }) as any);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result[0].status).toBe('done');
    });

    it('should handle select Status property', async () => {
      const pageWithSelect = {
        ...mockPage,
        properties: {
          Name: mockPage.properties.Name,
          Status: { type: 'select', select: { name: 'Complete' } },
          Due: mockPage.properties.Due,
        },
      };

      vi.mocked(prisma.notionAccount.findMany).mockResolvedValue([
        { ...mockAccount, selectedDatabaseIds: ['db-1'] } as any,
      ]);

      const mockQuery = vi.fn().mockResolvedValue({
        results: [pageWithSelect],
      });

      vi.mocked(Client).mockImplementation(() => ({
        databases: { query: mockQuery },
      }) as any);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result[0].status).toBe('done');
    });

    it('should filter by accountId when provided', async () => {
      vi.mocked(prisma.notionAccount.findMany).mockResolvedValue([mockAccount as any]);

      const mockQuery = vi.fn().mockResolvedValue({ results: [] });
      vi.mocked(Client).mockImplementation(() => ({
        databases: { query: mockQuery },
      }) as any);

      await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
        accountId: 'specific-account',
      });

      expect(prisma.notionAccount.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          id: 'specific-account',
        },
      });
    });

    it('should continue on database error', async () => {
      vi.mocked(prisma.notionAccount.findMany).mockResolvedValue([mockAccount as any]);

      const mockQuery = vi.fn()
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({ results: [mockPage] });

      vi.mocked(Client).mockImplementation(() => ({
        databases: { query: mockQuery },
      }) as any);

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

    it('should skip pages without title', async () => {
      const pageWithoutTitle = {
        object: 'page',
        id: 'page-no-title',
        url: 'https://notion.so/page-no-title',
        properties: {
          Status: mockPage.properties.Status,
          Due: mockPage.properties.Due,
        },
      };

      vi.mocked(prisma.notionAccount.findMany).mockResolvedValue([
        { ...mockAccount, selectedDatabaseIds: ['db-1'] } as any,
      ]);

      const mockQuery = vi.fn().mockResolvedValue({
        results: [mockPage, pageWithoutTitle],
      });

      vi.mocked(Client).mockImplementation(() => ({
        databases: { query: mockQuery },
      }) as any);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Complete documentation');
    });

    it('should find title property with different names', async () => {
      const pageWithTitleProp = {
        ...mockPage,
        properties: {
          Title: { type: 'title', title: [{ plain_text: 'Task with Title property' }] },
          Status: mockPage.properties.Status,
          Due: mockPage.properties.Due,
        },
      };

      vi.mocked(prisma.notionAccount.findMany).mockResolvedValue([
        { ...mockAccount, selectedDatabaseIds: ['db-1'] } as any,
      ]);

      const mockQuery = vi.fn().mockResolvedValue({
        results: [pageWithTitleProp],
      });

      vi.mocked(Client).mockImplementation(() => ({
        databases: { query: mockQuery },
      }) as any);

      const result = await adapter.listForRange({
        userId: 1,
        startIso: '2024-01-01T00:00:00Z',
        endIso: '2024-01-31T23:59:59Z',
      });

      expect(result[0].title).toBe('Task with Title property');
    });
  });
});
