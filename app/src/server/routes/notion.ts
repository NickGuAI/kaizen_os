import { Router, Request, Response, NextFunction } from 'express';
import { Client } from '@notionhq/client';
import { prisma } from '../../lib/db';
import { encryptToken, decryptToken } from '../../lib/crypto';

const router = Router();

// Helper to create API errors
function createError(statusCode: number, code: string, message: string) {
  const error = new Error(message) as Error & { statusCode: number; code: string };
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getOAuthConfig() {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI;
  return { clientId, clientSecret, redirectUri };
}

// GET /api/notion/authorize
// Redirects user to Notion OAuth consent page.
// Auth callback will return with ?code= to /callback.
router.get('/authorize', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { clientId, redirectUri } = getOAuthConfig();

    if (!clientId || !redirectUri) {
      throw createError(500, 'CONFIG_ERROR', 'Notion OAuth not configured');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      owner: 'user',
    });

    const authUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
});

// GET /api/notion/callback
// Notion redirects here after user grants access.
// Exchanges code for access_token + refresh_token, stores in NotionAccount.
router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { code, error } = req.query as { code?: string; error?: string };

    if (error) {
      return res.redirect('/settings?tab=notion&notion_error=access_denied');
    }

    if (!code) {
      return res.redirect('/settings?tab=notion&notion_error=missing_code');
    }

    const { clientId, clientSecret, redirectUri } = getOAuthConfig();

    if (!clientId || !clientSecret || !redirectUri) {
      throw createError(500, 'CONFIG_ERROR', 'Notion OAuth not configured');
    }

    // Exchange code for tokens using HTTP Basic Auth
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${encoded}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json() as { error?: string };
      console.error('[notion/callback] Token exchange failed:', err);
      return res.redirect('/settings?tab=notion&notion_error=token_exchange_failed');
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      bot_id: string;
      workspace_id: string;
      workspace_name?: string;
    };

    await prisma.notionAccount.upsert({
      where: { userId_workspaceId: { userId, workspaceId: tokenData.workspace_id } },
      update: {
        accessTokenEncrypted: encryptToken(tokenData.access_token),
        refreshTokenEncrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
        workspaceName: tokenData.workspace_name ?? null,
        botId: tokenData.bot_id,
      },
      create: {
        userId,
        accessTokenEncrypted: encryptToken(tokenData.access_token),
        refreshTokenEncrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
        workspaceId: tokenData.workspace_id,
        workspaceName: tokenData.workspace_name ?? null,
        botId: tokenData.bot_id,
      },
    });

    res.redirect('/settings?tab=notion&notion_connected=true');
  } catch (error) {
    next(error);
  }
});

// GET /api/notion/accounts
router.get('/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const accounts = await prisma.notionAccount.findMany({
      where: { userId },
      select: {
        id: true,
        workspaceId: true,
        workspaceName: true,
        selectedDatabaseIds: true,
        createdAt: true,
      },
    });

    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notion/accounts/:id
router.delete('/accounts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    await prisma.notionAccount.delete({
      where: { id, userId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/notion/databases?accountId=
router.get('/databases', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const accountId = req.query.accountId as string;

    if (!accountId) {
      throw createError(400, 'VALIDATION_ERROR', 'accountId query parameter required');
    }

    const account = await prisma.notionAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw createError(404, 'NOT_FOUND', 'Notion account not found');
    }

    const notion = new Client({ auth: decryptToken(account.accessTokenEncrypted) });

    const response = await notion.search({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filter: { property: 'object', value: 'data_source' } as any,
      page_size: 100,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const databases = (response.results as any[])
      .filter((item) => item.object === 'database' || item.object === 'data_source')
      .map((db) => ({
        id: db.id as string,
        title: db.title?.[0]?.plain_text || db.name || 'Untitled',
        url: db.url as string,
      }));

    res.json(databases);
  } catch (error) {
    next(error);
  }
});

// POST /api/notion/databases/select
// Body: { accountId: string, databaseIds: string[] }
router.post('/databases/select', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { accountId, databaseIds } = req.body;

    if (!accountId || typeof accountId !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'accountId is required');
    }
    if (!Array.isArray(databaseIds)) {
      throw createError(400, 'VALIDATION_ERROR', 'databaseIds must be an array');
    }

    const account = await prisma.notionAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw createError(404, 'NOT_FOUND', 'Notion account not found');
    }

    await prisma.notionAccount.update({
      where: { id: accountId },
      data: { selectedDatabaseIds: databaseIds },
    });

    res.json({ success: true, databaseIds });
  } catch (error) {
    next(error);
  }
});

export default router;
