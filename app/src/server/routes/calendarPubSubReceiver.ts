import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../lib/db';
import { upsertCalendarEvents } from '../../services/calendar/calendarEventUpsertService';

interface CalendarPollMessage {
  userId: string;
  accountId: string;
  calendarId: string;
  events: any[];
  newSyncToken: string;
}

const router = Router();
const authClient = new OAuth2Client();
const PUSH_AUDIENCE = process.env.PUBSUB_PUSH_AUDIENCE!;

async function verifyOidcToken(authHeader: string): Promise<boolean> {
  const token = authHeader.replace('Bearer ', '');
  try {
    await authClient.verifyIdToken({ idToken: token, audience: PUSH_AUDIENCE });
    return true;
  } catch {
    return false;
  }
}

/**
 * POST /api/calendar/pubsub
 *
 * Receives Pub/Sub push messages (future external triggers).
 * Verifies OIDC token from pubsub-push-invoker SA, upserts events, advances syncToken.
 */
router.post('/', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Missing auth');
  }

  const valid = await verifyOidcToken(authHeader);
  if (!valid) {
    return res.status(401).send('Invalid OIDC token');
  }

  // ACK immediately — Pub/Sub retries on non-2xx
  res.status(200).send('OK');

  try {
    const message = req.body?.message;
    if (!message?.data) return;

    const decoded: CalendarPollMessage = JSON.parse(
      Buffer.from(message.data, 'base64').toString('utf-8')
    );
    const { userId, accountId, calendarId, events, newSyncToken } = decoded;

    if (!userId || !accountId || !calendarId || !Array.isArray(events)) return;

    await upsertCalendarEvents(userId, accountId, calendarId, events);

    if (newSyncToken) {
      await prisma.calendarWorkspaceSubscription.updateMany({
        where: { accountId, calendarId },
        data: { syncToken: newSyncToken },
      });
    }

    console.log(`[calendarPubSub] Processed ${events.length} events for calendar ${calendarId}`);
  } catch (err) {
    console.error('[calendarPubSub] Error processing message:', err);
  }
});

export default router;
