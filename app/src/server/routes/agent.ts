import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import express, { Request } from 'express'
import { query, type NonNullableUsage } from '@anthropic-ai/claude-agent-sdk'
import { createAgentTools, ToolContext, createWorkitemTools, WorkitemToolContext, createCalendarTools, CalendarToolContext } from '../agents'
import { userService } from '../../services/userService'
import { completeWorkItem, createWorkItem, moveWorkItemToDate, parkWorkItem } from '../../services/workitems/workItemService'
import { isValidLocalDate } from '../../utils/dateUtils'
import { parseSunsetCommand, type SunsetExecuteResponse } from '../../lib/sunsetCommands'
import prisma from '../../lib/db'
import { createAgentSdkStderrLogger } from '../utils/agentDebug'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load agent system prompt from markdown file
const PROMPT_PATH = path.join(__dirname, '../prompts/agent_system_prompt.md')
const DEFAULT_AGENT_SYSTEM_PROMPT = fs.readFileSync(PROMPT_PATH, 'utf-8')

const router = express.Router()

/**
 * @openapi
 * /api/agent/chat:
 *   post:
 *     summary: Stream agent chat responses
 *     tags:
 *       - Agent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               sessionId:
 *                 type: string
 *             required:
 *               - message
 *     responses:
 *       200:
 *         description: Server-sent events stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 * /api/agent/rollback:
 *   post:
 *     summary: Roll back agent mutations
 *     tags:
 *       - Agent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               checkpointUuid:
 *                 type: string
 *             required:
 *               - sessionId
 *     responses:
 *       200:
 *         description: Rollback result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/agent/sessions:
 *   get:
 *     summary: List agent sessions
 *     tags:
 *       - Agent
 *     responses:
 *       200:
 *         description: Sessions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/agent/sessions/{sessionId}/messages:
 *   get:
 *     summary: Get messages for a session
 *     tags:
 *       - Agent
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session with messages
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/agent/sessions/{sessionId}:
 *   delete:
 *     summary: Delete an agent session
 *     tags:
 *       - Agent
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Session deleted
 * /api/agent/sunset/execute:
 *   post:
 *     summary: Execute command-style Sunset chat operations
 *     tags:
 *       - Agent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               sessionId:
 *                 type: string
 *             required:
 *               - message
 *     responses:
 *       200:
 *         description: Structured command response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 */
// Type for mutation payload
interface MutationPayload {
  operation: 'create' | 'update' | 'delete'
  agentSessionId: string
  checkpointUuid?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

// Type for message content block
interface ContentBlock {
  type: string
  text?: string
}

async function resolveSunsetSession(userId: string, clientSessionId: string | undefined, title: string) {
  if (clientSessionId) {
    const existing = await prisma.agentSession.findFirst({
      where: { id: clientSessionId, userId },
    })
    if (existing) {
      return existing
    }
  }

  return prisma.agentSession.create({
    data: {
      userId,
      title: title.slice(0, 120),
      claudeSession: `sunset-${randomUUID()}`,
    },
  })
}

function normalizeInvalidateHints(invalidate: {
  parking?: boolean
  workitemDates?: string[]
  calendarDates?: string[]
}) {
  return {
    parking: Boolean(invalidate.parking),
    workitemDates: Array.from(new Set(invalidate.workitemDates ?? [])),
    calendarDates: Array.from(new Set(invalidate.calendarDates ?? [])),
  }
}

router.post('/sunset/execute', async (req: Request, res) => {
  const { message, sessionId: clientSessionId } = req.body as {
    message?: string
    sessionId?: string
  }
  const userId = req.user!.id

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' })
  }

  const command = parseSunsetCommand(message)
  if (!command) {
    return res.status(400).json({
      error: 'UNSUPPORTED_COMMAND',
      message: 'Unsupported Sunset command. Try /task or /calendar commands.',
    })
  }

  try {
    const agentSession = await resolveSunsetSession(userId, clientSessionId, message)
    const receiptId = `sunset-${Date.now()}-${randomUUID().slice(0, 8)}`
    const executedAt = new Date().toISOString()

    await prisma.agentMessage.create({
      data: {
        sessionId: agentSession.id,
        userId,
        role: 'user',
        content: message,
      },
    })

    const invalidate: {
      parking?: boolean
      workitemDates?: string[]
      calendarDates?: string[]
    } = {}
    let undoSupported = false
    let assistantMessage = ''
    let responseData: Record<string, unknown> | undefined
    let navigation: { plannerDate?: string } | undefined

    if (command.kind === 'task.create') {
      if (command.dueDate && !isValidLocalDate(command.dueDate)) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'dueDate must be a valid YYYY-MM-DD date',
        })
      }

      const dueAt = command.dueDate ? `${command.dueDate}T00:00:00.000Z` : undefined
      const created = await createWorkItem(userId, {
        title: command.title,
        dueAt,
      })

      invalidate.parking = !command.dueDate
      if (command.dueDate) {
        invalidate.workitemDates = [command.dueDate]
      }

      assistantMessage = command.dueDate
        ? `Created task "${created.title}" for ${command.dueDate}.`
        : `Created parking lot task "${created.title}".`
      responseData = {
        workItemKey: created.key,
        title: created.title,
        dueDate: command.dueDate ?? null,
      }
    }

    if (command.kind === 'task.complete') {
      await completeWorkItem(userId, command.workItemKey)
      invalidate.parking = true
      assistantMessage = `Completed task ${command.workItemKey}.`
      responseData = { workItemKey: command.workItemKey }
    }

    if (command.kind === 'task.move') {
      if (!isValidLocalDate(command.date)) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'date must be a valid YYYY-MM-DD date',
        })
      }

      await moveWorkItemToDate(userId, command.workItemKey, command.date)
      invalidate.parking = true
      invalidate.workitemDates = [command.date]
      invalidate.calendarDates = [command.date]
      navigation = { plannerDate: command.date }
      assistantMessage = `Moved ${command.workItemKey} to ${command.date}.`
      responseData = { workItemKey: command.workItemKey, date: command.date }
    }

    if (command.kind === 'task.park') {
      await parkWorkItem(userId, command.workItemKey)
      invalidate.parking = true
      assistantMessage = `Moved ${command.workItemKey} to Parking Lot.`
      responseData = { workItemKey: command.workItemKey }
    }

    if (command.kind === 'calendar.focus') {
      if (!isValidLocalDate(command.date)) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'date must be a valid YYYY-MM-DD date',
        })
      }

      invalidate.workitemDates = [command.date]
      invalidate.calendarDates = [command.date]
      navigation = { plannerDate: command.date }
      assistantMessage = `Calendar focus moved to ${command.date}.`
      responseData = { date: command.date }
      undoSupported = true
    }

    const payload: SunsetExecuteResponse = {
      mode: 'sunset',
      sessionId: agentSession.id,
      command: {
        kind: command.kind,
        raw: message,
      },
      receipt: {
        id: receiptId,
        at: executedAt,
        undoSupported,
        invalidate: normalizeInvalidateHints(invalidate),
      },
      response: {
        message: assistantMessage,
        ...(navigation && { navigation }),
        ...(responseData && { data: responseData }),
      },
    }

    await prisma.agentMessage.create({
      data: {
        sessionId: agentSession.id,
        userId,
        role: 'assistant',
        content: assistantMessage,
        checkpointUuid: receiptId,
      },
    })

    await prisma.event.create({
      data: {
        userId,
        eventType: 'workitem_attributed',
        payload: {
          operation: 'sunset_command',
          command,
          response: responseData,
          undoSupported,
          agentSessionId: agentSession.id,
          checkpointUuid: receiptId,
          executedAt,
        },
      },
    })

    return res.json(payload)
  } catch (error: unknown) {
    const messageText = error instanceof Error ? error.message : 'Failed to execute Sunset command'
    return res.status(500).json({ error: messageText })
  }
})

router.post('/chat', async (req: Request, res) => {
  const { message, sessionId: clientSessionId } = req.body
  const userId = req.user!.id

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  const settings = await userService.getSettings(userId)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalanceUsd: true, subscriptionTier: true, lastCreditRefreshAt: true, timezone: true },
  })

  if (!user) {
    return res.status(404).json({
      error: 'USER_NOT_FOUND',
      message: 'User not found',
    })
  }

  let creditBalanceUsd = Number(user.creditBalanceUsd)

  // Lazy refresh for free tier (if > 30 days since last refresh).
  if (user.subscriptionTier === 'free') {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    if (!user.lastCreditRefreshAt || user.lastCreditRefreshAt < thirtyDaysAgo) {
      await prisma.user.update({
        where: { id: userId },
        data: { creditBalanceUsd: 5.0, lastCreditRefreshAt: new Date() },
      })
      creditBalanceUsd = 5.0
    }
  }

  // Block if balance depleted (<= 0).
  if (creditBalanceUsd <= 0) {
    return res.status(402).json({
      error: 'INSUFFICIENT_CREDITS',
      message: 'Insufficient AI credits',
      balance: creditBalanceUsd.toFixed(2),
    })
  }

  let agentSession = clientSessionId
    ? await prisma.agentSession.findUnique({ where: { id: clientSessionId } })
    : null

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  let claudeSessionId: string | undefined
  let checkpointUuid: string | undefined

  async function* messageGenerator(): AsyncGenerator<{ type: 'user'; message: { role: 'user'; content: string } }> {
    yield {
      type: 'user' as const,
      message: { role: 'user' as const, content: message },
    }
  }

  const toolContext: ToolContext = {
    userId,
    sessionId: agentSession?.id || 'pending',
    checkpointUuid: undefined,
    allowedTools: settings.agentAllowedTools.map(t => t.replace('mcp__kaizen-db__', '')),
  }

  // Workitem tool context (only used if provider is enabled)
  const workitemEnabled = settings.agentWorkitemProvider !== 'none'
  const workitemToolContext: WorkitemToolContext | null = workitemEnabled
    ? {
        userId,
        provider: settings.agentWorkitemProvider as 'google_tasks',
        allowedTools: settings.agentWorkitemTools.map(t => t.replace('mcp__workitems__', '')),
      }
    : null

  // Calendar tool context (only used if any calendar tools are enabled)
  const calendarToolsEnabled = settings.agentCalendarTools && settings.agentCalendarTools.length > 0
  const calendarToolContext: CalendarToolContext | null = calendarToolsEnabled
    ? {
        userId,
        userTimezone: user.timezone || 'America/Los_Angeles',
        allowedTools: settings.agentCalendarTools.map(t => t.replace('mcp__calendar__', '')),
        deleteEnabled: settings.agentCalendarDeleteEnabled && settings.agentCalendarDeleteAcknowledged,
      }
    : null

  const allowedTools = [
    ...settings.agentBuiltinTools,
    ...settings.agentAllowedTools,
    ...settings.agentWorkitemTools,
    ...(settings.agentCalendarTools || []),
  ]

  const disallowedTools = settings.agentAllowBash ? [] : ['Bash']
  const agentSdkStderr = createAgentSdkStderrLogger()

  try {
    const agentStream = query({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prompt: messageGenerator() as any,
      options: {
        resume: agentSession?.claudeSession,
        mcpServers: {
          'kaizen-db': createAgentTools(toolContext),
          ...(workitemToolContext && {
            'workitems': createWorkitemTools(workitemToolContext),
          }),
          ...(calendarToolContext && {
            'calendar': createCalendarTools(calendarToolContext),
          }),
        },
        allowedTools,
        disallowedTools,
        permissionMode: settings.agentPermissionMode,
        ...(settings.agentPermissionMode === 'bypassPermissions' && {
          allowDangerouslySkipPermissions: true,
        }),
        systemPrompt: settings.agentSystemPrompt || DEFAULT_AGENT_SYSTEM_PROMPT,
        ...(agentSdkStderr && { stderr: agentSdkStderr }),
      },
    })

    let userMessageSaved = false

    // Save user message for existing sessions immediately
    if (agentSession && !userMessageSaved) {
      await prisma.agentMessage.create({
        data: {
          sessionId: agentSession.id,
          userId,
          role: 'user',
          content: message,
        },
      })
      userMessageSaved = true
    }

    let finalUsage: NonNullableUsage | null = null
    let totalCostUsd: number | null = null

    for await (const msg of agentStream) {
      if (msg.type === 'system' && msg.subtype === 'init') {
        claudeSessionId = msg.session_id

        if (!agentSession && claudeSessionId) {
          agentSession = await prisma.agentSession.create({
            data: {
              claudeSession: claudeSessionId,
              userId,
              title: message,
            },
          })
          toolContext.sessionId = agentSession.id
          res.write(`data: ${JSON.stringify({ type: 'session', sessionId: agentSession.id })}\n\n`)
          
          // Save user message immediately after session creation (before any assistant response)
          if (!userMessageSaved) {
            await prisma.agentMessage.create({
              data: {
                sessionId: agentSession.id,
                userId,
                role: 'user',
                content: message,
              },
            })
            userMessageSaved = true
          }
        }
      }

      if (msg.type === 'user' && msg.uuid) {
        checkpointUuid = msg.uuid
        toolContext.checkpointUuid = checkpointUuid
        res.write(`data: ${JSON.stringify({ type: 'checkpoint', uuid: checkpointUuid })}\n\n`)
      }

      res.write(`data: ${JSON.stringify(msg)}\n\n`)

      if (msg.type === 'assistant' && agentSession) {
        const content = msg.message.content as ContentBlock[]
        const textContent = content
          .filter((c) => c.type === 'text')
          .map((c) => c.text || '')
          .join('\n')

        if (textContent) {
          await prisma.agentMessage.create({
            data: {
              sessionId: agentSession.id,
              userId,
              role: 'assistant',
              content: textContent,
              checkpointUuid,
            },
          })
        }
      }

      if (msg.type === 'result' && msg.usage) {
        finalUsage = msg.usage
        totalCostUsd = msg.total_cost_usd ?? msg.usage.total_cost_usd ?? null
      }
    }

    if (finalUsage && agentSession && totalCostUsd !== null) {
      const model = 'claude-sonnet-4-20250514'

      await prisma.$transaction([
        prisma.agentUsage.create({
          data: {
            userId,
            sessionId: agentSession.id,
            inputTokens: finalUsage.input_tokens,
            outputTokens: finalUsage.output_tokens,
            cacheReadTokens: finalUsage.cache_read_tokens || 0,
            cacheWriteTokens: finalUsage.cache_write_tokens || 0,
            model,
            costUsd: totalCostUsd,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { creditBalanceUsd: { decrement: totalCostUsd } },
        }),
      ])
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Agent error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: errorMessage })
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`)
      res.end()
    }
  }
})


router.post('/rollback', async (req: Request, res) => {
  const { sessionId, checkpointUuid } = req.body
  const userId = req.user!.id

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId required' })
  }

  try {
    const mutations = await prisma.event.findMany({
      where: {
        userId,
        eventType: 'agent_mutation',
      },
      orderBy: { occurredAt: 'desc' },
    })

    const toRollback: typeof mutations = []
    let foundCheckpoint = false

    for (const mutation of mutations) {
      const payload = mutation.payload as unknown as MutationPayload
      if (payload.agentSessionId !== sessionId) continue

      if (checkpointUuid) {
        if (payload.checkpointUuid === checkpointUuid) {
          foundCheckpoint = true
          break
        }
      }

      toRollback.push(mutation)
    }

    const results: Array<{ id: string | null; operation: string; error?: string; preservedId?: boolean }> = []
    
    for (const mutation of toRollback) {
      const payload = mutation.payload as unknown as MutationPayload

      try {
        if (payload.operation === 'create') {
          await prisma.card.deleteMany({
            where: { id: mutation.cardId!, userId },
          })
          results.push({ id: mutation.cardId, operation: 'delete (undo create)' })
        } else if (payload.operation === 'update' && payload.before) {
          const before = payload.before as Record<string, unknown>
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, createdAt, updatedAt, ...restoreData } = before
          await prisma.card.updateMany({
            where: { id: mutation.cardId!, userId },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: restoreData as any,
          })
          results.push({ id: mutation.cardId, operation: 'restore (undo update)' })
        } else if (payload.operation === 'delete' && payload.before) {
          const before = payload.before as Record<string, unknown>
          await prisma.$executeRaw`
            INSERT INTO cards (id, user_id, parent_id, title, description, target_date,
              completion_date, start_date, status, unit_type, season_id, lag_weeks,
              passed, evaluated_at, created_at, updated_at)
            VALUES (${before.id}, ${before.userId}, ${before.parentId}, ${before.title},
              ${before.description}, ${before.targetDate}, ${before.completionDate},
              ${before.startDate}, ${before.status}::"TaskStatus", ${before.unitType}::"UnitType",
              ${before.seasonId}, ${before.lagWeeks}, ${before.passed}, ${before.evaluatedAt},
              ${before.createdAt}, NOW())
            ON CONFLICT (id) DO NOTHING
          `
          results.push({ id: mutation.cardId, operation: 'recreate (undo delete)', preservedId: true })
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        results.push({ id: mutation.cardId, operation: payload.operation, error: errorMessage })
      }
    }

    res.json({
      rolledBack: toRollback.length,
      results,
      checkpointFound: checkpointUuid ? foundCheckpoint : null,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: errorMessage })
  }
})

router.get('/sessions', async (req: Request, res) => {
  const userId = req.user!.id

  const sessions = await prisma.agentSession.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  })

  const serializable = sessions.map((session) => ({
    ...session,
    messages: session.messages.map((message) => ({
      ...message,
      id: message.id.toString(),
    })),
  }))

  res.json(serializable)
})

router.get('/sessions/:sessionId/messages', async (req: Request, res) => {
  const userId = req.user!.id
  const sessionId = req.params.sessionId as string

  const session = await prisma.agentSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  const serializable = {
    ...session,
    messages: session.messages.map((message) => ({
      ...message,
      id: message.id.toString(),
    })),
  }

  res.json(serializable)
})

router.delete('/sessions/:sessionId', async (req: Request, res) => {
  const userId = req.user!.id
  const sessionId = req.params.sessionId as string

  const session = await prisma.agentSession.findFirst({
    where: { id: sessionId, userId },
  })

  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  await prisma.agentSession.delete({
    where: { id: sessionId },
  })

  res.status(204).send()
})

export default router
