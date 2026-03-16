import argon2 from 'argon2'
import { prisma } from '../lib/db'

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
}

export interface AuthUser {
  id: string
  email: string
  name: string | null
  emailVerifiedAt: Date | null
  timezone: string | null
}

function toAuthUser(user: {
  id: string
  email: string
  name: string | null
  emailVerifiedAt: Date | null
  timezone: string | null
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerifiedAt: user.emailVerifiedAt,
    timezone: user.timezone,
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password)
}

export async function registerUser({
  email,
  password,
  name,
}: {
  email: string
  password: string
  name?: string
}): Promise<AuthUser> {
  const normalizedEmail = normalizeEmail(email)
  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: name?.trim() || null,
    },
  })

  return toAuthUser(user)
}

// Pre-computed dummy hash for constant-time comparison when user not found
// This prevents timing attacks that could enumerate valid email addresses
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

export async function authenticateUser({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<AuthUser | null> {
  const normalizedEmail = normalizeEmail(email)
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  // Use dummy hash when user not found to ensure constant-time operation
  const hashToVerify = user?.passwordHash || DUMMY_HASH

  try {
    const isValid = await verifyPassword(hashToVerify, password)
    // Only return user if user exists, has password, AND password is valid
    if (!user || !user.passwordHash || !isValid) {
      return null
    }
  } catch (error) {
    console.error('Failed to verify password', error)
    return null
  }
  return toAuthUser(user)
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return null
  }

  return toAuthUser(user)
}
