/**
 * Tests for LocalAuthProvider
 *
 * Tests HMAC signature verification, session management, and password hashing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import argon2 from 'argon2'
import { LocalAuthProvider } from '../../src/auth/local.auth'
import { PrismaClient } from '@prisma/client'

// Mock PrismaClient
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
} as unknown as PrismaClient

const TEST_SECRET = 'test-session-secret-32-chars-min'
const TEST_TTL_MS = 1000 * 60 * 60 // 1 hour
const TEST_USER_ID = '6fc04832-5e4d-4dd2-ab94-86f78626e9c3'

describe('LocalAuthProvider', () => {
  let provider: LocalAuthProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new LocalAuthProvider(mockPrisma, TEST_SECRET, TEST_TTL_MS)
  })

  describe('createSessionToken / verifyToken', () => {
    it('creates a valid session token that can be verified', async () => {
      const userId = TEST_USER_ID
      const mockUser = { id: userId, email: 'test@example.com', name: 'Test User' }
      ;(mockPrisma.user.findUnique as any).mockResolvedValue(mockUser)

      const token = provider.createSessionToken(userId)

      // Token should be base64url encoded with signature
      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)

      const session = await provider.verifyToken(token)

      expect(session).not.toBeNull()
      expect(session!.userId).toBe(userId)
      expect(session!.email).toBe('test@example.com')
    })

    it('rejects tokens with invalid signature', async () => {
      const userId = TEST_USER_ID
      const token = provider.createSessionToken(userId)

      // Tamper with the signature
      const [payload, _signature] = token.split('.')
      const tamperedToken = `${payload}.invalidSignature123`

      const session = await provider.verifyToken(tamperedToken)
      expect(session).toBeNull()
    })

    it('rejects tokens with tampered payload', async () => {
      const userId = TEST_USER_ID
      const token = provider.createSessionToken(userId)

      // Tamper with the payload
      const [_payload, signature] = token.split('.')
      const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'hacker', issuedAt: Date.now() })).toString('base64url')
      const tamperedToken = `${tamperedPayload}.${signature}`

      const session = await provider.verifyToken(tamperedToken)
      expect(session).toBeNull()
    })

    it('rejects expired tokens', async () => {
      // Create provider with very short TTL
      const shortTtlProvider = new LocalAuthProvider(mockPrisma, TEST_SECRET, 1) // 1ms TTL

      const token = shortTtlProvider.createSessionToken('test-user')

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10))

      const session = await shortTtlProvider.verifyToken(token)
      expect(session).toBeNull()
    })

    it('rejects malformed tokens', async () => {
      expect(await provider.verifyToken('')).toBeNull()
      expect(await provider.verifyToken('invalid')).toBeNull()
      expect(await provider.verifyToken('not.a.valid.token')).toBeNull()
    })
  })

  describe('signIn', () => {
    it('returns null for non-existent user', async () => {
      ;(mockPrisma.user.findUnique as any).mockResolvedValue(null)

      const result = await provider.signIn('unknown@example.com', 'password')
      expect(result).toBeNull()
    })

    it('returns null for user without password hash', async () => {
      ;(mockPrisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
      })

      const result = await provider.signIn('test@example.com', 'password')
      expect(result).toBeNull()
    })

    it('returns null for incorrect password', async () => {
      // Create a valid Argon2 password hash
      const passwordHash = await argon2.hash('correct-password', { type: argon2.argon2id })

      ;(mockPrisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
      })

      const result = await provider.signIn('test@example.com', 'wrong-password')
      expect(result).toBeNull()
    })

    it('returns session for correct credentials', async () => {
      // Create a valid Argon2 password hash
      const passwordHash = await argon2.hash('correct-password', { type: argon2.argon2id })

      ;(mockPrisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
      })

      const result = await provider.signIn('test@example.com', 'correct-password')

      expect(result).not.toBeNull()
      expect(result!.user.id).toBe('user-1')
      expect(result!.user.email).toBe('test@example.com')
      expect(result!.session.userId).toBe('user-1')
    })

    it('returns null for invalid hash format', async () => {
      ;(mockPrisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'not-a-valid-argon2-hash',
      })

      const result = await provider.signIn('test@example.com', 'password')
      expect(result).toBeNull()
    })
  })

  describe('signUp', () => {
    it('throws error if user already exists', async () => {
      ;(mockPrisma.user.findUnique as any).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      })

      await expect(provider.signUp('existing@example.com', 'password'))
        .rejects.toThrow('User with this email already exists')
    })

    it('creates new user with Argon2 hashed password', async () => {
      ;(mockPrisma.user.findUnique as any).mockResolvedValue(null)
      ;(mockPrisma.user.create as any).mockImplementation(async ({ data }: any) => ({
        id: 'new-user-id',
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
      }))

      const result = await provider.signUp('new@example.com', 'password123', 'New User')

      expect(result.user.email).toBe('new@example.com')
      expect(result.user.name).toBe('New User')
      expect(result.session.userId).toBe('new-user-id')

      // Verify password hash is Argon2id format
      const createCall = (mockPrisma.user.create as any).mock.calls[0][0]
      expect(createCall.data.passwordHash).toMatch(/^\$argon2id\$/)
    })
  })

  describe('signOut', () => {
    it('completes without error (stateless sessions)', async () => {
      const session = { userId: 'user-1', email: 'test@example.com' }
      await expect(provider.signOut(session)).resolves.toBeUndefined()
    })
  })
})

describe('LocalAuthProvider - Password Hashing Security', () => {
  const provider = new LocalAuthProvider(mockPrisma, TEST_SECRET, TEST_TTL_MS)

  it('uses unique salt for each password (Argon2 handles this internally)', async () => {
    ;(mockPrisma.user.findUnique as any).mockResolvedValue(null)

    const hashes: string[] = []
    ;(mockPrisma.user.create as any).mockImplementation(async ({ data }: any) => {
      hashes.push(data.passwordHash)
      return { id: 'user', email: data.email, passwordHash: data.passwordHash }
    })

    await provider.signUp('user1@test.com', 'same-password')
    await provider.signUp('user2@test.com', 'same-password')

    // Same password should produce different hashes due to unique salts
    expect(hashes[0]).not.toBe(hashes[1])

    // Both should be valid Argon2id hashes
    expect(hashes[0]).toMatch(/^\$argon2id\$/)
    expect(hashes[1]).toMatch(/^\$argon2id\$/)
  })
})
