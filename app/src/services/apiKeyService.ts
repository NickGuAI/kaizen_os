import crypto from 'crypto'
import type { ApiKey, User } from '@prisma/client'
import prisma from '../lib/db'

export type ApiKeyScope = 'read' | 'write' | 'delete'
export type ApiServer = 'kaizen-db' | 'workitems' | 'calendar'

const API_KEY_PREFIX = 'kaizen_sk_'
const DEFAULT_RATE_LIMIT = 100
const MAX_RATE_LIMIT = 10_000
const MAX_ACTIVE_KEYS_PER_USER = 10
const LAST_USED_DEBOUNCE_MS = 30_000
const REQUEST_COUNT_BATCH_SIZE = 10
const REQUEST_COUNT_FLUSH_MS = 30_000

const VALID_SCOPES: ReadonlySet<ApiKeyScope> = new Set(['read', 'write', 'delete'])
const VALID_SERVERS: ReadonlySet<ApiServer> = new Set(['kaizen-db', 'workitems', 'calendar'])

interface RateLimitWindow {
  count: number
  windowStart: number
}

interface RequestCountBuffer {
  count: number
  lastFlush: number
}

const rateLimitWindows = new Map<string, RateLimitWindow>()
const lastUsedUpdates = new Map<string, number>()
const requestCountBuffers = new Map<string, RequestCountBuffer>()

export class ApiKeyServiceError extends Error {
  code: string
  statusCode: number

  constructor(code: string, message: string, statusCode = 400) {
    super(message)
    this.code = code
    this.statusCode = statusCode
  }
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values))
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function normalizeScopes(scopes: string[]): ApiKeyScope[] {
  const deduped = uniqueStrings(scopes)
  const invalid = deduped.filter(scope => !VALID_SCOPES.has(scope as ApiKeyScope))

  if (invalid.length > 0) {
    throw new ApiKeyServiceError('INVALID_SCOPE', `Invalid scopes: ${invalid.join(', ')}`)
  }

  return deduped as ApiKeyScope[]
}

function normalizeServers(servers: string[]): ApiServer[] {
  const deduped = uniqueStrings(servers)
  const invalid = deduped.filter(server => !VALID_SERVERS.has(server as ApiServer))

  if (invalid.length > 0) {
    throw new ApiKeyServiceError('INVALID_SERVER', `Invalid servers: ${invalid.join(', ')}`)
  }

  return deduped as ApiServer[]
}

function normalizeRateLimit(rateLimit: number | null | undefined): number {
  if (rateLimit == null) {
    return DEFAULT_RATE_LIMIT
  }

  if (!Number.isInteger(rateLimit) || rateLimit < 1) {
    throw new ApiKeyServiceError('INVALID_RATE_LIMIT', 'Rate limit must be a positive integer')
  }

  return Math.min(rateLimit, MAX_RATE_LIMIT)
}

function generateApiKeySecret(): { raw: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(32).toString('hex')
  const raw = `${API_KEY_PREFIX}${random}`
  const prefix = raw.slice(0, 12)
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, prefix, hash }
}

function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

export type VerifiedApiKey = ApiKey & { user: User }

export interface CreateApiKeyInput {
  userId: string
  name: string
  scopes?: string[]
  allowedServers?: string[]
  expiresAt?: Date | null
  rateLimit?: number
}

export interface CreatedApiKey {
  id: string
  name: string
  key: string
  keyPrefix: string
  scopes: ApiKeyScope[]
  allowedServers: ApiServer[]
  expiresAt: Date | null
  createdAt: Date
  rateLimit: number
}

export interface ApiKeyListItem {
  id: string
  name: string
  keyPrefix: string
  scopes: ApiKeyScope[]
  allowedServers: ApiServer[]
  lastUsedAt: Date | null
  expiresAt: Date | null
  requestCount: number
  rateLimit: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export const apiKeyService = {
  async generate(input: CreateApiKeyInput): Promise<CreatedApiKey> {
    const name = input.name.trim()
    if (!name) {
      throw new ApiKeyServiceError('INVALID_NAME', 'API key name is required')
    }

    if (name.length > 100) {
      throw new ApiKeyServiceError('INVALID_NAME', 'API key name must be 100 characters or fewer')
    }

    const scopes = normalizeScopes(input.scopes && input.scopes.length > 0 ? input.scopes : ['read'])
    const allowedServers = normalizeServers(
      input.allowedServers && input.allowedServers.length > 0
        ? input.allowedServers
        : ['kaizen-db']
    )
    const rateLimit = normalizeRateLimit(input.rateLimit)

    if (input.expiresAt && input.expiresAt <= new Date()) {
      throw new ApiKeyServiceError('INVALID_EXPIRY', 'Expiration must be in the future')
    }

    const activeKeyCount = await prisma.apiKey.count({
      where: {
        userId: input.userId,
        isActive: true,
      },
    })

    if (activeKeyCount >= MAX_ACTIVE_KEYS_PER_USER) {
      throw new ApiKeyServiceError(
        'API_KEY_LIMIT_REACHED',
        `Maximum ${MAX_ACTIVE_KEYS_PER_USER} active API keys allowed`,
        429
      )
    }

    const { raw, prefix, hash } = generateApiKeySecret()

    const created = await prisma.apiKey.create({
      data: {
        userId: input.userId,
        name,
        keyPrefix: prefix,
        keyHash: hash,
        scopes,
        allowedServers,
        expiresAt: input.expiresAt ?? null,
        rateLimit,
      },
    })

    return {
      id: created.id,
      name: created.name,
      key: raw,
      keyPrefix: created.keyPrefix,
      scopes: parseStringArray(created.scopes) as ApiKeyScope[],
      allowedServers: parseStringArray(created.allowedServers) as ApiServer[],
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
      rateLimit: created.rateLimit,
    }
  },

  async verify(rawKey: string): Promise<VerifiedApiKey | null> {
    if (!rawKey || !rawKey.startsWith(API_KEY_PREFIX)) {
      return null
    }

    const keyHash = hashApiKey(rawKey)
    const key = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    })

    if (!key || !key.isActive) {
      return null
    }

    if (key.expiresAt && key.expiresAt <= new Date()) {
      return null
    }

    return key
  },

  async list(userId: string): Promise<ApiKeyListItem[]> {
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: parseStringArray(key.scopes) as ApiKeyScope[],
      allowedServers: parseStringArray(key.allowedServers) as ApiServer[],
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      requestCount: key.requestCount,
      rateLimit: key.rateLimit,
      isActive: key.isActive,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }))
  },

  async revoke(userId: string, keyId: string): Promise<boolean> {
    const key = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        userId,
      },
      select: { id: true },
    })

    if (!key) {
      return false
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    })

    return true
  },

  checkRateLimit(keyId: string, limit: number): boolean {
    const now = Date.now()
    const window = rateLimitWindows.get(keyId)

    if (!window || now - window.windowStart > 60_000) {
      rateLimitWindows.set(keyId, { count: 1, windowStart: now })
      return true
    }

    if (window.count >= limit) {
      return false
    }

    window.count += 1
    return true
  },

  async touchLastUsed(keyId: string): Promise<void> {
    const now = Date.now()
    const lastUpdate = lastUsedUpdates.get(keyId) ?? 0

    if (now - lastUpdate < LAST_USED_DEBOUNCE_MS) {
      return
    }

    lastUsedUpdates.set(keyId, now)

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { lastUsedAt: new Date() },
    })
  },

  async incrementRequestCount(keyId: string): Promise<void> {
    const now = Date.now()
    const buffered = requestCountBuffers.get(keyId) ?? { count: 0, lastFlush: now }
    buffered.count += 1
    requestCountBuffers.set(keyId, buffered)

    if (buffered.count < REQUEST_COUNT_BATCH_SIZE && now - buffered.lastFlush < REQUEST_COUNT_FLUSH_MS) {
      return
    }

    const delta = buffered.count
    buffered.count = 0
    buffered.lastFlush = now

    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        requestCount: {
          increment: delta,
        },
      },
    })
  },

  parseScopes(value: unknown): ApiKeyScope[] {
    return normalizeScopes(parseStringArray(value))
  },

  parseAllowedServers(value: unknown): ApiServer[] {
    return normalizeServers(parseStringArray(value))
  },
}

export const apiKeyConstants = {
  API_KEY_PREFIX,
  DEFAULT_RATE_LIMIT,
  MAX_ACTIVE_KEYS_PER_USER,
}
