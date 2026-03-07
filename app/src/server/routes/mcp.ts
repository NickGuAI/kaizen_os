import { Router, Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import prisma from '../../lib/db'
import { requireApiKey } from '../middleware/apiKeyAuth'
import { apiKeyService, ApiKeyScope, ApiServer } from '../../services/apiKeyService'
import { buildToolRegistry, validateToolArgs, ToolDefinition } from '../agents/toolRegistry'

const router = Router()

const callSchema = z.object({
  server: z.enum(['kaizen-db', 'workitems', 'calendar']),
  tool: z.string().min(1),
  args: z.record(z.string(), z.unknown()).optional(),
})

function hasScope(scopes: ApiKeyScope[], requiredScope: ApiKeyScope): boolean {
  return scopes.includes(requiredScope)
}

function getAuthContext(req: Request): { userId: string; scopes: ApiKeyScope[]; allowedServers: ApiServer[] } | null {
  const userId = req.user?.id
  const apiKey = req.apiKey
  if (!userId || !apiKey) {
    return null
  }

  return {
    userId,
    scopes: apiKeyService.parseScopes(apiKey.scopes),
    allowedServers: apiKeyService.parseAllowedServers(apiKey.allowedServers),
  }
}

function getServerTools(req: Request): ReturnType<typeof buildToolRegistry>['listByServer'] {
  return buildToolRegistry({
    kaizenDb: {
      userId: req.user!.id,
    },
    workitems: {
      userId: req.user!.id,
      provider: 'google_tasks',
    },
    calendar: {
      userId: req.user!.id,
      userTimezone: req.user?.timezone || 'America/Los_Angeles',
      deleteEnabled: true,
    },
  }).listByServer
}

function findTool(
  toolsByServer: ReturnType<typeof buildToolRegistry>['listByServer'],
  server: ApiServer,
  toolName: string
): ToolDefinition | null {
  const tools = toolsByServer[server] || []
  return tools.find(tool => tool.name === toolName) || null
}

router.get('/tools', requireApiKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuthContext(req)
    if (!auth) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    }

    const toolsByServer = getServerTools(req)
    const responseServers: Partial<Record<ApiServer, { tools: Array<{ name: string; description: string; scope: ApiKeyScope }> }>> = {}

    for (const server of auth.allowedServers) {
      const availableTools = (toolsByServer[server] || [])
        .filter(tool => hasScope(auth.scopes, tool.scope))
        .map(tool => ({
          name: tool.name,
          description: tool.description,
          scope: tool.scope,
        }))

      responseServers[server] = { tools: availableTools }
    }

    if (req.apiKey) {
      void apiKeyService.incrementRequestCount(req.apiKey.id).catch((error) => {
        console.warn('[api-key] failed to increment request count', error)
      })
    }

    res.json({ servers: responseServers })
  } catch (error) {
    next(error)
  }
})

router.post('/call', requireApiKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuthContext(req)
    if (!auth || !req.apiKey) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    }

    const parsed = callSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }

    const { server, tool: toolName, args } = parsed.data

    if (!auth.allowedServers.includes(server)) {
      return res.status(403).json({
        error: {
          code: 'SERVER_FORBIDDEN',
          message: `API key cannot access server '${server}'`,
        },
      })
    }

    const toolsByServer = getServerTools(req)
    const tool = findTool(toolsByServer, server, toolName)
    if (!tool) {
      return res.status(404).json({
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool '${toolName}' not found in server '${server}'`,
        },
      })
    }

    if (!hasScope(auth.scopes, tool.scope)) {
      return res.status(403).json({
        error: {
          code: 'SCOPE_INSUFFICIENT',
          message: `Key scopes '${auth.scopes.join(',') || 'none'}' cannot access '${tool.scope}' tool '${toolName}'`,
        },
      })
    }

    let validatedArgs: Record<string, unknown>
    try {
      validatedArgs = validateToolArgs(tool, args ?? {})
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ARGS',
            message: 'Tool arguments failed validation',
            details: error.flatten().fieldErrors,
          },
        })
      }
      throw error
    }

    const start = Date.now()
    const result = await tool.handler(validatedArgs)
    const durationMs = Date.now() - start

    if (tool.scope === 'read') {
      void apiKeyService.incrementRequestCount(req.apiKey.id).catch((error) => {
        console.warn('[api-key] failed to increment request count', error)
      })
    } else {
      const payload = {
        source: 'api_key',
        apiKeyId: req.apiKey.id,
        apiKeyName: req.apiKey.name,
        server,
        tool: toolName,
        args: validatedArgs,
        durationMs,
      } as Prisma.InputJsonValue

      await prisma.event.create({
        data: {
          userId: auth.userId,
          eventType: 'agent_mutation',
          payload,
        },
      })
    }

    res.json({
      result,
      server,
      tool: toolName,
      durationMs,
    })
  } catch (error) {
    next(error)
  }
})

export default router
