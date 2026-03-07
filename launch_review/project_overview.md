# KaizenOS Project Overview

For Google Cloud App Verification and Go-to-Market

---

## One-Line Description

KaizenOS is a personal productivity system that integrates goal planning, calendar management, and AI assistance to help knowledge workers organize and execute meaningful work.

---

## Short Description (150 words)

KaizenOS helps knowledge workers achieve their goals through structured planning and intelligent calendar integration. Users define long-term goals ("themes"), break them into actionable initiatives (experiments, routines, operations), and connect their Google Calendar to plan and track progress.

The app provides weekly planning workflows, daily focus lists, and time attribution tracking—helping users understand where their time goes and whether it aligns with their priorities. An AI assistant powered by Claude helps users organize work, create tasks, and make planning decisions.

KaizenOS integrates with Google Calendar for event management and Google Tasks for task synchronization, providing a unified view of commitments and priorities.

---

## Long Description (For App Listing)

### What is KaizenOS?

KaizenOS is a personal productivity platform built on the philosophy of continuous improvement ("kaizen"). It bridges the gap between high-level goal setting and day-to-day execution by connecting your aspirations to your calendar.

### Key Features

- **Theme-Based Goal Setting**: Organize your work around meaningful long-term themes (career growth, health, relationships, etc.)
- **Action Framework**: Four types of work items—Gates (milestones), Experiments (exploratory work), Routines (habits), and Operations (maintenance tasks)
- **Calendar Integration**: Connect Google Calendar to view, plan, and attribute time to your goals
- **Task Synchronization**: Connect Google Tasks to manage actionable items alongside calendar events
- **Weekly Planning**: Guided review workflows to classify events, grade progress, and plan ahead
- **Daily Focus**: Top 3 priorities per day with intention tagging (want/neutral/avoid)
- **AI Assistant**: Chat with an AI to help create, organize, and manage your work items
- **Time Attribution**: Understand where your time goes and how it maps to your goals

### Who It's For

KaizenOS is designed for knowledge workers, entrepreneurs, freelancers, and anyone who wants more intentionality in how they spend their time. If you use Google Calendar and want to connect your daily activities to bigger goals, KaizenOS provides the framework.

---

## Target Audience

- Knowledge workers managing multiple projects
- Entrepreneurs and freelancers tracking billable time
- Productivity enthusiasts who want goal-connected planning
- Remote workers needing structure and accountability

---

## Brand Positioning

### Tagline Options

1. "Plan with purpose. Execute with clarity."
2. "Where goals meet your calendar."
3. "Continuous improvement, one day at a time."

### Core Value Proposition

Most productivity tools focus on tasks OR calendars OR goals. KaizenOS connects all three—so you're not just busy, you're making progress on what matters.

---

## Google API Usage

### OAuth Scopes Requested

| Scope | Purpose | User Benefit |
|-------|---------|--------------|
| `calendar.events` | Read/write calendar events | Users can view their schedule, create new events, and link calendar blocks to their goals |
| `calendar.calendarlist.readonly` | List available calendars | Users can select which calendars to sync (work, personal, etc.) |
| `userinfo.email` | Identify user account | Associate the correct Google account with their KaizenOS profile |
| `tasks` | Read/write Google Tasks | Users can manage tasks alongside calendar events in a unified interface |

### Data Handling

- OAuth tokens are encrypted and stored securely in Supabase
- Calendar events are cached locally for performance; users can disconnect at any time
- No calendar data is shared with third parties
- Users have full control over which calendars are synced

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
- Anthropic Claude (AI assistant)
- Stripe (billing)
- PostHog (analytics)

---

## Core Features Detail

### 1. Theme-Based Goal Setting
Users organize work around long-term "themes" (objectives). Each theme has:
- Description and purpose
- Color coding for visual organization
- Season allocations (time-boxed planning periods)

### 2. Action Framework
Four types of actionable items:
- **Gates**: Decision points and milestones
- **Experiments**: Exploratory work with hypotheses to test
- **Routines**: Recurring habits and processes
- **Operations**: Maintenance and operational tasks

### 3. Calendar Integration
- OAuth connection to Google Calendar
- Event viewing and creation
- Event classification and annotation
- Automatic event-to-action linking
- Routine linking for recurring events

### 4. Task Management
- Google Tasks integration (full read/write)
- Task lists and individual task management
- Daily playlist/focus system (top 3 priorities)
- Task attribution tracking

### 5. Planning & Review
- Weekly planning sessions with state persistence
- Event review and reclassification workflow
- Time tracking and logging
- Season grading/retrospectives

### 6. AI Assistant
- Multi-turn conversations using Claude
- Context-aware access to user data
- Card/season CRUD operations
- Mutation rollback capability
