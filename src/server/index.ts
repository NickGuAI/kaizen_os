import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import cardsRouter from './routes/cards'
import seasonsRouter from './routes/seasons'
import eventsRouter from './routes/events'
import themeAllocationsRouter from './routes/themeAllocations'
import usersRouter from './routes/users'
import agentRouter from './routes/agent'
import calendarRouter from './routes/calendar'
import calendarPushReceiverRouter from './routes/calendarPushReceiver'
import tagsRouter from './routes/tags'
import workitemsRouter from './routes/workitems'
import notionRouter from './routes/notion'
import authRouter from './routes/auth'
import billingRouter from './routes/billing'
import onboardingRouter from './routes/onboarding'
import usageRouter from './routes/usage'
import apiKeysRouter from './routes/apiKeys'
import mcpRouter from './routes/mcp'
import { initializeAdapters } from '../services/workitems'
import { requireAuthV2 } from './middleware/authProvider'
import { logAgentAuthConfig } from './utils/agentDebug'
import calendarPollInternalRouter from './routes/calendarPollInternal'
import calendarWatchRenewRouter from './routes/calendarWatchRenew'
import preClassifyInternalRouter from './routes/preClassifyInternal'
import dailyNotesRouter from './routes/dailyNotes'

// Initialize work item adapters
initializeAdapters()

const app = express()
const PORT = process.env.PORT || process.env.API_PORT || 3001
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Kaizen OS API',
      version: '0.1.0',
      description: 'Kaizen OS API documentation',
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Local' },
    ],
    components: {
      schemas: {
        ApiError: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: {
                  type: 'object',
                  additionalProperties: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
              required: ['code', 'message'],
            },
          },
          required: ['error'],
        },
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string', nullable: true },
            emailVerifiedAt: { type: 'string', format: 'date-time', nullable: true },
            timezone: { type: 'string', nullable: true },
          },
          required: ['id', 'email'],
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/AuthUser' },
            accessToken: { type: 'string', nullable: true },
            expiresAt: { type: 'string', nullable: true },
          },
          required: ['user'],
        },
        GenericObject: {
          type: 'object',
          additionalProperties: true,
        },
        GenericArray: {
          type: 'array',
          items: { $ref: '#/components/schemas/GenericObject' },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'kaizen_session',
        },
      },
    },
    security: [
      { bearerAuth: [] },
      { cookieAuth: [] },
    ],
  },
  apis: [
    path.join(__dirname, './routes/*.ts'),
    path.join(__dirname, './routes/*.js'),
    path.join(__dirname, './index.ts'),
    path.join(__dirname, './index.js'),
  ],
})

// Middleware
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
})

/**
 * @openapi
 * /api/openapi.json:
 *   get:
 *     summary: OpenAPI specification
 *     tags:
 *       - OpenAPI
 *     security: []
 *     responses:
 *       200:
 *         description: OpenAPI document
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - Health
 *     security: []
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */
app.get('/api/openapi.json', (_req: Request, res: Response) => {
  res.json(swaggerSpec)
})

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }))

// Routes
app.use('/api/auth', authRouter)
app.use('/api/cards', requireAuthV2, cardsRouter)
app.use('/api/seasons', requireAuthV2, seasonsRouter)
app.use('/api/events', requireAuthV2, eventsRouter)
app.use('/api/allocations', requireAuthV2, themeAllocationsRouter)
app.use('/api/users', requireAuthV2, usersRouter)
app.use('/api/agent', requireAuthV2, agentRouter)
app.use('/api/calendar/push', calendarPushReceiverRouter)
app.use('/api/calendar/poll', calendarPollInternalRouter)
app.use('/api/calendar/watch/renew', calendarWatchRenewRouter)
app.use('/api/calendar/pre-classify', preClassifyInternalRouter)
app.use('/api/calendar', requireAuthV2, calendarRouter)
app.use('/api/tags', requireAuthV2, tagsRouter)
app.use('/api/workitems', requireAuthV2, workitemsRouter)
app.use('/api/daily-notes', requireAuthV2, dailyNotesRouter)
app.use('/api/notion', requireAuthV2, notionRouter)
app.use('/api/billing', requireAuthV2, billingRouter)
app.use('/api/onboarding', requireAuthV2, onboardingRouter)
app.use('/api/usage', requireAuthV2, usageRouter)
app.use('/api/keys', requireAuthV2, apiKeysRouter)
app.use('/api/mcp', mcpRouter)

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
interface ApiError extends Error {
  statusCode?: number
  code?: string
  details?: Record<string, string[]>
}

app.use((err: ApiError, _req: Request, res: Response, _next: NextFunction) => {
  // _next is required by Express error handler signature but not used
  void _next
  console.error('API Error:', err)

  const statusCode = err.statusCode || 500
  const code = err.code || 'INTERNAL_ERROR'
  const message = err.message || 'An unexpected error occurred'

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(err.details && { details: err.details }),
    },
  })
})

// Serve static frontend in production
const distPath = path.join(__dirname, '../../dist')
app.use(express.static(distPath))

// SPA fallback - serve index.html for non-API routes
app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    })
  }
  res.sendFile(path.join(distPath, 'index.html'))
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`)
  logAgentAuthConfig()
  console.log('[server] Calendar push via /api/calendar/push; fallback poll via /api/calendar/poll')
})

export default app
