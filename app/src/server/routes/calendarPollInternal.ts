import { Router, Request, Response } from 'express';
import { runPoll } from '../cron/calendarPoller';

const router = Router();

/**
 * POST /api/calendar/poll
 *
 * Internal fallback endpoint triggered by Supabase pg_cron every 5 minutes.
 * Protected by CALENDAR_POLL_SECRET to prevent unauthorized triggers.
 */
router.post('/', async (req: Request, res: Response) => {
  const secret = process.env.CALENDAR_POLL_SECRET;
  const auth = req.headers.authorization?.replace('Bearer ', '');

  if (!secret || auth !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ACK immediately — pg_net doesn't wait for the response body
  res.status(200).json({ ok: true });

  runPoll().catch(err => console.error('[calendarPoll] Poll triggered by cron failed:', err));
});

export default router;
