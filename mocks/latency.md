# Fix Kaizen OS API Performance (5-17s → <500ms)

## Root Cause Analysis

### Problem Summary
All API endpoints taking 5-17 seconds. This is NOT a single slow query - it's a systemic issue affecting every request uniformly.

### Root Cause #1: Auth Middleware Makes 2 Network Calls Per Request (CRITICAL)

**File**: `app/src/server/middleware/authProvider.ts:100-144`
**File**: `app/src/auth/supabase.auth.ts:118-131`

Every authenticated request:
1. `verifyToken(token)` → calls `supabase.auth.getUser(token)` → **Network call to Supabase Auth API**
2. `prisma.user.findUnique()` → **Network call to Supabase Database**

With network latency of 100-500ms each, this adds 200-1000ms **before any actual data queries**.

**Evidence**: User sees "4 authContext calls" on page load - each triggers this double-network-call pattern.

### Root Cause #2: Database Connection Latency

**Hypothesis**: Using direct Postgres connection (port 5432) instead of Supabase connection pooler (Supavisor, port 6543).

Direct connections require:
- TCP handshake
- SSL/TLS negotiation
- Auth handshake

This adds 1-3 seconds per new connection. Prisma default pool size is 5 connections, so with 10+ concurrent requests, others queue.

### Root Cause #3: Sequential Query Patterns

**File**: `app/src/server/routes/cards.ts:416-444`

`GET /api/cards/:id` tries 3 repositories sequentially:
```typescript
const theme = await catalog.themes.findByIdWithChildren(...)  // Query 1
if (theme) return ...
const action = await catalog.actions.findByIdWithChildren(...)  // Query 2
if (action) return ...
const veto = await catalog.vetoes.findById(...)  // Query 3
```

With 200ms+ per query, this is 600ms+ worst case.

### Root Cause #4: Calendar Endpoint Bottleneck (16s)

**File**: `app/src/services/calendar/eventCacheService.ts:48-241`

`getWeekEventsWithCache()` does:
1. `prisma.user.findUnique()` - get timezone
2. `prisma.calendarAccount.findMany()` - get accounts
3. For EACH account, for EACH calendar:
   - Check cache OR fetch from Google API (network call)
   - Upsert events in transaction

If cache is cold or expired, Google API calls add 500ms-2s each.

---

## Fix Plan

### Step 1: Cache User in Auth Middleware (HIGH IMPACT)

**Problem**: `prisma.user.findUnique()` called on every request

**Solution**: Cache user data in-memory for the session duration

**Files to modify**:
- `app/src/server/middleware/authProvider.ts`

**Implementation**:
```typescript
// Add simple in-memory cache with 60s TTL
const userCache = new Map<string, { user: User; expiresAt: number }>()
const USER_CACHE_TTL_MS = 60000 // 1 minute

// In requireAuthV2:
const cached = userCache.get(session.userId)
if (cached && cached.expiresAt > Date.now()) {
  req.user = cached.user
  return next()
}

const user = await prisma.user.findUnique({ where: { id: prismaUserId } })
if (user) {
  userCache.set(session.userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS })
}
```

### Step 2: Skip Supabase Auth API Call (HIGH IMPACT)

**Problem**: `supabase.auth.getUser(token)` makes network call to verify JWT

**Solution**: Verify JWT locally using Supabase JWT secret (offline verification)

**Files to modify**:
- `app/src/auth/supabase.auth.ts`

**Implementation**:
```typescript
import jwt from 'jsonwebtoken'

async verifyToken(token: string): Promise<Session | null> {
  // Verify JWT locally instead of network call
  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as {
      sub: string
      email: string
      exp: number
    }

    if (decoded.exp * 1000 < Date.now()) return null

    return {
      userId: decoded.sub,
      email: decoded.email,
      accessToken: token,
    }
  } catch {
    return null
  }
}
```

**Requires**:
- Add `SUPABASE_JWT_SECRET` to `.env`
- Find it at: Supabase Dashboard → Settings → API → JWT Secret
- Install: `npm install jsonwebtoken @types/jsonwebtoken`

### Step 3: Use Supabase Connection Pooler (MEDIUM IMPACT)

**Problem**: Direct database connections are slow

**Solution**: Update DATABASE_URL to use Supavisor (port 6543)

**Files to modify**:
- `app/.env`

**Change**:
```
# FROM:
DATABASE_URL="postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres"

# TO:
DATABASE_URL="postgresql://postgres.xxx:xxx@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### Step 4: Fix Sequential Card Lookup (LOW IMPACT)

**Problem**: `GET /api/cards/:id` makes up to 3 sequential queries

**Solution**: Single query to find card type, then dispatch

**File**: `app/src/server/routes/cards.ts:416-444`

```typescript
// First, find the card type with a single query
const card = await prisma.card.findFirst({
  where: { id, userId: req.user!.id },
  select: { unitType: true },
})

if (!card) throw createError(404, 'NOT_FOUND', 'Card not found')

// Then dispatch based on type
switch (card.unitType) {
  case 'THEME':
    return res.json(await catalog.themes.findByIdWithChildren(userId, id))
  case 'VETO':
    return res.json(await catalog.vetoes.findById(userId, id))
  default: // ACTION types
    return res.json(await catalog.actions.findByIdWithChildren(userId, id))
}
```

---

## Critical Files

| File | Change |
|------|--------|
| `app/src/server/middleware/authProvider.ts` | Add user caching |
| `app/src/auth/supabase.auth.ts` | Local JWT verification |
| `app/.env` | Connection pooler URL |
| `app/src/server/routes/cards.ts` | Single-query card lookup |

---

## Verification

After implementing, verify with:

1. **Network tab timing**: Each API call should be <500ms
2. **Server logs**: Add `console.time()` around DB calls to measure
3. **Test script**:
```bash
time curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/cards
# Should return in <1 second
```

---

## Expected Impact

| Before | After | Improvement |
|--------|-------|-------------|
| 5-9s per request | <500ms | 10-18x faster |
| 16s calendar | <2s | 8x faster |
| 4 auth calls on load | 4 calls (but cached) | Eliminates duplicate DB hits |

---

## Priority Order

1. **Step 2** (JWT local verification) - Eliminates network call per request
2. **Step 1** (User caching) - Eliminates DB call per request
3. **Step 3** (Connection pooler) - Reduces connection overhead
4. **Step 4** (Card lookup) - Minor optimization
