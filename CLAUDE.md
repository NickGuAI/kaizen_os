# Kaizen OS

Personal productivity system with themes, actions, and calendar integration.

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Express.js
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma (types only, NOT for migrations)
- **Auth**: Supabase Auth

## Commands

```bash
cd projects/kaizen_os/app
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
```

## pg_net Named Parameter Syntax
- `net.http_post` is a SQL function — use `=>` for named parameters, NOT `:=`
- `:=` is PL/pgSQL assignment syntax and causes `syntax error at or near ":="` when used in SQL context

## Secrets in Migrations

`ALTER DATABASE SET` is blocked in Supabase migrations (permission denied). For secrets used by pg_cron, hardcode them directly in `cron.schedule()` — the value is stored in `cron.job` which is superuser-only readable. Use a `<PLACEHOLDER>` in the committed file; replace locally before `supabase db push`, revert before committing.

## Database Changes: Always Use Migrations

**NEVER use Supabase SQL editor for schema or config changes.** Always create a migration file:
1. Create `supabase/migrations/<timestamp>_<description>.sql`
2. Run `supabase db push`

This applies to everything: schema changes, extensions, pg_cron jobs, database settings.

## Database: Prisma + Supabase

**Prisma is LOCAL ONLY** - Supabase is the actual database.

- Prisma is **only** for TypeScript types and client generation
- **ONLY use `prisma generate`** to update types after schema changes
- **NEVER use `prisma migrate`, `prisma db push`**
- Migrations go through Supabase:
  1. Update `schema.prisma`
  2. Run `prisma generate`
  3. Create migration in `supabase/migrations/`

## Lessons Learned

### Google Tasks API Date Handling
**Official docs**: https://developers.google.com/tasks/reference/rest/v1/tasks
**Known issues**: Google Issue Tracker #166896024, #331680197 (since 2020)

**Storage behavior**:
- `due` field stores **date-only** - time is discarded, always returns `T00:00:00.000Z`
- `completed` field DOES include actual time (inconsistent API behavior)
- This is by design - Google confirmed and won't fix

**Query parameters**:
- `dueMin`/`dueMax` accept RFC 3339 timestamps for filtering
- `dueMax` is **exclusive**: tasks with due date = dueMax are NOT included
- **Undocumented**: How Google compares timestamps against date-only stored values with timezone offsets

**Solution - Always post-filter client-side**:
```typescript
// Don't rely on Google's opaque filtering behavior
const taskDueDate = task.due.split('T')[0];  // Extract date: '2025-01-25'
return taskDueDate >= startDate && taskDueDate <= endDate;
```

### Date/Time Handling (UTC + User Timezone)
- Server stores and queries timestamps in UTC
- Convert user-selected local dates/times to UTC before API requests
- Render UTC timestamps using user-settings timezone (fallback to browser timezone)

### Supabase Performance Optimization
- **Root cause of slow queries**: Network latency (~50-200ms per query vs <1ms local)
- **N+1 queries kill performance**: 10 queries × 100ms = 1+ second latency
- **Batch writes**: Use `prisma.$transaction([...ops])` to batch multiple upserts
- **Fix N+1 with Map pattern**: Fetch all data in one query, build Map, lookup O(1)
- **Connection pooler**: Use Supabase Supavisor (port 6543) to reduce connection overhead

### Prisma $queryRaw UUID Casting
- Cast UUID parameters in raw SQL: `${id}::uuid` to avoid `operator does not exist: uuid = text`

### Prisma BigInt JSON Serialization
- Convert BigInt fields to strings before `res.json()` to avoid serialization errors

### Database Tracing Implementation
- Store execution traces with: task_id, event_type, event_data, session_id, sequence_num
- Sequence numbers ensure correct event ordering
- JSON serialize event data for flexibility

### API Design Patterns
- Stream progress using SSE (Server-Sent Events) for long-running tasks
- Return task IDs immediately, stream progress separately
- Provide both high-level (task) and detailed (trace) views of execution

### Dev Server Port Conflicts (Zombie Processes)
- **Symptom**: API requests take 5-17 seconds even though server-side timing shows <5ms
- **Root cause**: Old/zombie Node processes still listening on ports 3000/3001
- **How to diagnose**: `curl http://127.0.0.1:3001/api/health` is instant but `curl http://localhost:3001/api/health` is slow (IPv6 vs IPv4)
- **Fix**: `npm run dev:cleanup` kills stale processes before starting dev server
- **Prevention**: Always use `npm run dev:all` which runs cleanup first

### Timezone-Aware Date Parsing
- **NEVER** parse date strings like `new Date(date + 'T00:00:00')` - this uses server's local time
- **ALWAYS** use Luxon with user's timezone: `DateTime.fromISO(date, { zone: userTimezone }).startOf('day')`
- Store user timezone in database (IANA format like 'America/Los_Angeles')
- Convert Luxon DateTime to JS Date with `.toJSDate()` for Prisma queries
- Day boundaries depend on timezone - Jan 23 midnight in Pacific is Jan 23 08:00 UTC

### Calendar Push Notifications: Watch Channels Only (No Pub/Sub)
- **Google Workspace Events API does NOT support Google Calendar** — only Chat, Drive, Meet
- `calendar-api-push@system.gserviceaccount.com` does not exist; Pub/Sub IAM binding for Calendar will always fail
- Google Calendar only supports **webhook push channels** via `calendarApi.events.watch({ type: 'web_hook', address: WEBHOOK_URL })`
- Watch channels expire in ~7 days; renew by deleting old channel and creating a new one
- The correct push endpoint for Calendar is `/api/calendar/push` with `X-Goog-Channel-Id` / `X-Goog-Resource-State` headers
