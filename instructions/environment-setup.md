# Kaizen OS Environment Setup

## Database Architecture

The app uses a **hybrid setup**:
- **Data storage**: Local PostgreSQL (via Postgres.app or Docker)
- **Authentication**: Remote Supabase Auth

## Environment Variables

### Local Database
```
DATABASE_URL="postgresql://postgres@localhost:5432/kaizen_os"
```
- Used by Prisma for all data operations
- Points to local Postgres instance

### Remote Supabase
```
SUPABASE_URL=https://bcmfjyjkmyqvqiaztrje.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_DB_PWD=<password>
AUTH_PROVIDER=supabase
DATA_PROVIDER=supabase
```
- `AUTH_PROVIDER=supabase` enables Supabase Auth for user login
- Remote DB connection (commented out in .env): `postgresql://postgres:$SUPABASE_DB_PWD@db.bcmfjyjkmyqvqiaztrje.supabase.co:5432/postgres`

## Switching Between Local and Remote

### Use Local PostgreSQL (current default)
```env
DATABASE_URL="postgresql://postgres@localhost:5432/kaizen_os"
```

### Use Remote Supabase
```env
DATABASE_URL="postgresql://postgres:${SUPABASE_DB_PWD}@db.bcmfjyjkmyqvqiaztrje.supabase.co:5432/postgres"
```

## Seed Data Password

The migration file `20260115000003_seed_data.sql` contains a user with:
- Email: `dev@kaizen.local`
- Password hash: Argon2id format (`$argon2id$v=19$...`)

**The original password cannot be retrieved** - Argon2id is a one-way hash.

## Password Reset Options

### Option 1: Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication > Users**
4. Find the user and click "Reset password"

### Option 2: Generate New Hash
If you need to set a known password in seed data:

```bash
# Using Node.js with argon2 package
npm install argon2
node -e "require('argon2').hash('your-new-password').then(console.log)"
```

Replace the hash in the seed SQL file.

### Option 3: App's Reset Flow
The app has a built-in `resetPassword(email)` method that triggers Supabase's email-based reset flow.

## Quick Start

1. Ensure local Postgres is running
2. Create database: `createdb kaizen_os`
3. Run migrations: `npx prisma migrate deploy`
4. Start app: `npm run dev`
