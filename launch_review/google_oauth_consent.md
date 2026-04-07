# Google OAuth Consent Screen Content

For Google Cloud Console configuration.

---

## App Information

**App Name**: ZenOS

**User Support Email**: assistant@pioneeringminds.ai

**App Logo**: [UPLOAD 120x120 PNG — use /assets/zenos_logo.png]

---

## App Domain

**Application Homepage**: https://zenos.gehirn.ai

**Application Privacy Policy**: https://zenos.gehirn.ai/privacy

**Application Terms of Service**: https://zenos.gehirn.ai/terms

---

## Authorized Domains

- gehirn.ai

---

## Scopes Justification

### Scope: `https://www.googleapis.com/auth/calendar.events`

**Why we need it**: ZenOS helps users connect their calendar events to their goals. This scope allows users to:
- View their existing calendar events within ZenOS
- Create new calendar events when planning their week
- Update events to add notes or change times
- Link calendar blocks to specific goals and actions

**User-facing description**: "View and edit events on all your calendars"

### Scope: `https://www.googleapis.com/auth/calendar.calendarlist.readonly`

**Why we need it**: Users often have multiple calendars (work, personal, side projects). This scope allows them to:
- See all available calendars in their Google account
- Choose which calendars to sync with ZenOS
- Separate work and personal time tracking

**User-facing description**: "See the list of calendars you have access to"

### Scope: `https://www.googleapis.com/auth/userinfo.email`

**Why we need it**: We need to identify which Google account the user is connecting to associate it correctly with their ZenOS profile.

**User-facing description**: "View your email address"

### Scope: `https://www.googleapis.com/auth/tasks`

**Why we need it**: ZenOS provides unified task management. This scope allows users to:
- View their existing Google Tasks within ZenOS
- Create new tasks from ZenOS
- Mark tasks complete
- Organize tasks alongside calendar events

**User-facing description**: "Create, edit, organize, and delete all your tasks"

---

## OAuth Consent Screen Text

### What ZenOS will access

ZenOS requests access to your Google account to help you connect your calendar and tasks to your goals.

**Calendar Access**: We'll read your calendar events to show them in ZenOS, and create events when you plan your schedule. Your events help you track where your time goes.

**Tasks Access**: We'll sync your Google Tasks so you can manage them alongside your calendar in one place.

**Email**: We use your email address only to identify your account.

### What we DON'T do

- We never share your calendar or task data with third parties
- We never send emails on your behalf
- We never access your contacts
- We never modify events you didn't create through ZenOS

### You're in control

- Disconnect Google at any time from Settings
- Delete your ZenOS account and all associated data
- We cache calendar events locally for performance, but you can clear this anytime

---

## Verification Requirements Checklist

- [ ] Privacy Policy URL is live and accessible (https://zenos.gehirn.ai/privacy)
- [ ] Terms of Service URL is live and accessible (https://zenos.gehirn.ai/terms)
- [ ] App homepage is live (https://zenos.gehirn.ai)
- [ ] Homepage clearly describes app functionality (not just tagline)
- [ ] Homepage explains why Google data access is needed
- [ ] Homepage links to privacy policy (URL matches consent screen)
- [ ] Brand name consistent: "ZenOS" on homepage, consent screen, and docs
- [ ] Authorized domain `gehirn.ai` added in GCP Console
- [ ] OAuth consent screen configured with correct URLs
- [ ] All requested scopes are justified
- [ ] Demo video showing OAuth flow (if required)
- [ ] Security questionnaire completed (if using sensitive scopes)
