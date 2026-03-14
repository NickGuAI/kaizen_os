import { Router, Request, Response } from 'express';
import { renewExpiringSubscriptions } from '../../services/calendar/calendarSubscriptionService';

const router = Router();

/**
 * POST /api/calendar/watch/renew
 *
 * Internal endpoint triggered by Supabase pg_cron to renew expiring
 * Google Calendar watch channels.
 */
router.post('/', async (req: Request, res: Response) => {
  const secret = process.env.CALENDAR_POLL_SECRET;
  const auth = req.headers.authorization?.replace('Bearer ', '');

  if (!secret || auth !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.status(200).json({ ok: true });

  renewExpiringSubscriptions().catch((err) =>
    console.error('[calendarWatchRenew] Renewal triggered by cron failed:', err)
  );
});

export default router;
