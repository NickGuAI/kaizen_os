# Google OAuth Consent Screen Content

For Google Cloud Console configuration.

---

## App Information

**App Name**: KaizenOS

**User Support Email**: [YOUR_SUPPORT_EMAIL]

**App Logo**: [UPLOAD 120x120 PNG]

---

## App Domain

**Application Homepage**: https://kaizenos.app (or your domain)

**Application Privacy Policy**: https://kaizenos.app/privacy

**Application Terms of Service**: https://kaizenos.app/terms

---

## Authorized Domains

- kaizenos.app
- [your-production-domain]

---

## Scopes Justification

### Scope: `https://www.googleapis.com/auth/calendar.events`

**Why we need it**: KaizenOS helps users connect their calendar events to their goals. This scope allows users to:
- View their existing calendar events within KaizenOS
- Create new calendar events when planning their week
- Update events to add notes or change times
- Link calendar blocks to specific goals and actions

**User-facing description**: "View and edit events on all your calendars"

### Scope: `https://www.googleapis.com/auth/calendar.calendarlist.readonly`

**Why we need it**: Users often have multiple calendars (work, personal, side projects). This scope allows them to:
- See all available calendars in their Google account
- Choose which calendars to sync with KaizenOS
- Separate work and personal time tracking

**User-facing description**: "See the list of calendars you have access to"

### Scope: `https://www.googleapis.com/auth/userinfo.email`

**Why we need it**: We need to identify which Google account the user is connecting to associate it correctly with their KaizenOS profile.

**User-facing description**: "View your email address"

### Scope: `https://www.googleapis.com/auth/tasks`

**Why we need it**: KaizenOS provides unified task management. This scope allows users to:
- View their existing Google Tasks within KaizenOS
- Create new tasks from KaizenOS
- Mark tasks complete
- Organize tasks alongside calendar events

**User-facing description**: "Create, edit, organize, and delete all your tasks"

---

## OAuth Consent Screen Text

### What KaizenOS will access

KaizenOS requests access to your Google account to help you connect your calendar and tasks to your goals.

**Calendar Access**: We'll read your calendar events to show them in KaizenOS, and create events when you plan your schedule. Your events help you track where your time goes.

**Tasks Access**: We'll sync your Google Tasks so you can manage them alongside your calendar in one place.

**Email**: We use your email address only to identify your account.

### What we DON'T do

- We never share your calendar or task data with third parties
- We never send emails on your behalf
- We never access your contacts
- We never modify events you didn't create through KaizenOS

### You're in control

- Disconnect Google at any time from Settings
- Delete your KaizenOS account and all associated data
- We cache calendar events locally for performance, but you can clear this anytime

---

## Verification Requirements Checklist

- [ ] Privacy Policy URL is live and accessible
- [ ] Terms of Service URL is live and accessible
- [ ] App homepage is live
- [ ] OAuth consent screen configured
- [ ] All requested scopes are justified
- [ ] Demo video showing OAuth flow (if required)
- [ ] Security questionnaire completed (if using sensitive scopes)
