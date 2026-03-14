import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/db', () => ({
  prisma: {
    routineCalendarLink: {
      findUnique: vi.fn(),
    },
  },
}));

const mockPatchEvent = vi.fn();
vi.mock('@/services/calendar/providerFactory', () => ({
  getProviderForAccount: vi.fn(() => ({
    patchEvent: mockPatchEvent,
  })),
}));

const mockInvalidateEventCache = vi.fn();
vi.mock('@/services/calendar/eventCacheService', () => ({
  invalidateEventCache: mockInvalidateEventCache,
}));

import { prisma } from '@/lib/db';
import { syncRoutineTitleToCalendar } from '@/services/calendar/routineLinkService';

describe('routineLinkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncRoutineTitleToCalendar', () => {
    const mockLink = {
      id: 'link-123',
      userId: 'user-123',
      cardId: 'card-456',
      accountId: 'account-789',
      calendarId: 'calendar-abc',
      recurringEventId: 'event-xyz',
      iCalUid: null,
      createdAt: new Date(),
    };

    it('returns false when no routine link exists', async () => {
      vi.mocked(prisma.routineCalendarLink.findUnique).mockResolvedValue(null);

      const result = await syncRoutineTitleToCalendar('user-123', 'card-456', 'New Title');

      expect(result).toBe(false);
      expect(mockPatchEvent).not.toHaveBeenCalled();
      expect(mockInvalidateEventCache).not.toHaveBeenCalled();
    });

    it('updates Google Calendar event and invalidates cache when link exists', async () => {
      vi.mocked(prisma.routineCalendarLink.findUnique).mockResolvedValue(mockLink);
      mockPatchEvent.mockResolvedValue({});
      mockInvalidateEventCache.mockResolvedValue(1);

      const result = await syncRoutineTitleToCalendar('user-123', 'card-456', 'Updated Title');

      expect(result).toBe(true);
      expect(mockPatchEvent).toHaveBeenCalledWith(
        'account-789',
        'calendar-abc',
        'event-xyz',
        { summary: 'Updated Title' }
      );
      expect(mockInvalidateEventCache).toHaveBeenCalledWith('user-123', {
        accountId: 'account-789',
        calendarId: 'calendar-abc',
      });
    });

    it('returns false and logs error when patchEvent fails', async () => {
      vi.mocked(prisma.routineCalendarLink.findUnique).mockResolvedValue(mockLink);
      mockPatchEvent.mockRejectedValue(new Error('Google API error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await syncRoutineTitleToCalendar('user-123', 'card-456', 'New Title');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to sync routine title to calendar:',
        expect.any(Error)
      );
      expect(mockInvalidateEventCache).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles trimmed titles correctly', async () => {
      vi.mocked(prisma.routineCalendarLink.findUnique).mockResolvedValue(mockLink);
      mockPatchEvent.mockResolvedValue({});
      mockInvalidateEventCache.mockResolvedValue(1);

      // Simulating the trimmed title that would come from the database
      const trimmedTitle = 'Trimmed Title';
      const result = await syncRoutineTitleToCalendar('user-123', 'card-456', trimmedTitle);

      expect(result).toBe(true);
      expect(mockPatchEvent).toHaveBeenCalledWith(
        'account-789',
        'calendar-abc',
        'event-xyz',
        { summary: 'Trimmed Title' }
      );
    });
  });
});
