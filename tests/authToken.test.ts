import { describe, it, expect, beforeEach } from 'vitest'
import { getAccessToken, setAccessToken } from '../src/lib/authToken'

describe('authToken', () => {
  beforeEach(() => {
    setAccessToken(null)
  })

  it('returns token when not expired', () => {
    const expiresAt = Date.now() + 1000
    setAccessToken('test-token', expiresAt)
    expect(getAccessToken()).toBe('test-token')
  })

  it('clears expired token', () => {
    const expiresAt = Date.now() - 1000
    setAccessToken('expired-token', expiresAt)
    expect(getAccessToken()).toBeNull()
  })
})
