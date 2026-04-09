# ZenOS Project Overview

For Google Cloud App Verification and Go-to-Market

---

## One-Line Description

ZenOS is a proactive, deployable personal coach for enterprise professionals — synthesizing work signals into insight and reaching out before you know you need it.

---

## Short Description (150 words)

ZenOS helps enterprise professionals improve mental health, elevate performance, and reduce burnout by acting as a proactive personal coach that synthesizes their real work signals.

Unlike reactive tools that wait to be asked, ZenOS runs continuously — reading email, calendar, Notion, messages, and code sessions — and checks in proactively with questions, observations, and hard truths. It listens across data sources, synthesizes patterns, and surfaces what professionals need to hear, not just what they asked for.

ZenOS is available in two tiers: Sensei (self-hosted, full data privacy, bring-your-own-key) and ZenOS Cloud (enterprise-managed, compliance-ready, per-seat pricing for teams).

Integrates with Google Calendar, Google Tasks, Notion, and email. AI model is user-configurable.

---

## Long Description (For App Listing)

### What is ZenOS?

ZenOS is a proactive personal coach for enterprise professionals. It runs continuously in the background, synthesizing signals from your real work — email, calendar, messages, Notion, code sessions, daily reviews — and proactively checks in to surface insights, ask the hard questions, and help you grow.

ZenOS does not wait to be asked. It watches, listens, and reaches out. It provokes reflection rather than delivering monologues. It meets you where you are.

### Key Features

- **Proactive Check-Ins**: ZenOS initiates conversations based on what it sees in your data — not when you open the app
- **Signal Synthesis**: Reads across email, calendar, Notion, messages, and code sessions to build a full picture of your week
- **Mental Health + Performance**: Tracks stress signals, energy patterns, and workload drift — catches burnout before it lands
- **Two Deployment Tiers**: Self-hosted Sensei (full privacy) or ZenOS Cloud (enterprise-managed)
- **Configurable AI Model**: Bring your own API key and choose your model
- **Hard Questions**: Surfaces uncomfortable patterns — the week you said "deep work" but took 14 meetings
- **Goal Tracking**: Connects themes, seasons, and actions to track growth trajectories over time
- **Enterprise Value**: Deployed per-seat to give every team member a proactive coach

### Who It's For

ZenOS is designed for high-performing professionals who want more than productivity — they want growth. It's ideal for:

- Enterprise employees who need a proactive coach as a benefit
- Entrepreneurs and knowledge workers managing multiple domains of life and work
- Teams where burnout, churn, and disengagement are real costs
- Organizations investing in the development of their people

---

## Target Audience

- Enterprise professionals (IC to director level)
- High-performers who want sustainable growth, not just output
- Organizations seeking to reduce burnout, churn, and disengagement
- Individuals who want a privacy-respecting self-hosted coach

---

## Brand Positioning

### Tagline
*Listen. Synthesize. Elevate.*

### Core Value Proposition

Enterprise professionals generate enormous amounts of data about their own lives — email threads, calendar patterns, Notion notes, Slack messages, code commits — but no one synthesizes it into insight. ZenOS does. It runs continuously, learns your patterns, and proactively surfaces what you need to hear. The result: better mental health, sharper performance, and a career trajectory that compounds.

### Enterprise Value Proposition

Organizations lose their best people to burnout, disengagement, and lack of growth. ZenOS is the proactive coach deployed to each individual — synthesizing their work signals, asking the right questions, and building the self-awareness that separates high performers from great ones.

---

## Deployment Tiers

### Self-Hosted (Sensei)
- Runs on the individual's own machine
- Lightweight, always-on, proactively checks in
- Full data privacy — nothing leaves the device
- Configurable model (bring your own API key)
- Lower cost — ideal for individual professionals

### Managed (ZenOS Cloud)
- Hosted by Pioneering Minds
- Enterprise-grade security and compliance
- Managed data sources, integrations, and updates
- Premium support
- Per-seat pricing for teams

---

## Data Sources Synthesized by ZenOS

| Source | What ZenOS Reads |
|--------|-----------------|
| Email | Threads, response patterns, urgency signals |
| Google Calendar | Events, meeting load, time allocation |
| Notion | Notes, projects, knowledge base |
| Messages | Slack, iMessage — communication patterns |
| Code/Work sessions | Session duration, focus depth, output |
| Daily review + briefings | Reflections, energy, priorities |

Model is user-configurable.

---

## Google API Usage

### OAuth Scopes Requested

| Scope | Purpose | User Benefit |
|-------|---------|--------------|
| `calendar.events` | Read/write calendar events | ZenOS synthesizes calendar data for coaching insights and proactive check-ins |
| `calendar.calendarlist.readonly` | List available calendars | Users select which calendars to sync |
| `userinfo.email` | Identify user account | Associates the correct Google account with the ZenOS profile |
| `tasks` | Read/write Google Tasks | Manages tasks alongside calendar events for full work-signal synthesis |

### Data Handling

- OAuth tokens are encrypted and stored securely in Supabase
- Calendar and task data are used exclusively for coaching synthesis; not shared with third parties
- Self-hosted tier (Sensei): all data remains on-device
- Users can disconnect integrations at any time

---

## Technical Stack

### Frontend
- React 18 + Vite + TypeScript
- TailwindCSS
- React Big Calendar
- Zustand state management

### Backend
- Express.js + Node.js (TypeScript)
- Prisma ORM
- Supabase (PostgreSQL)

### Integrations
- Google Calendar API (v3)
- Google Tasks API (v1)
- Google OAuth 2.0
- Anthropic Claude (AI coach engine)
- Notion API
- Stripe (billing)
- PostHog (analytics)
