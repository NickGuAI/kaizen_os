# Google Cloud App Verification Checklist

Track progress on requirements for OAuth verification.

---

## Prerequisites

- [ ] Google Cloud Project created
- [ ] OAuth consent screen configured
- [ ] Production domain verified in Google Search Console
- [ ] SSL certificate installed (HTTPS required)

---

## Required URLs

| Item | URL | Status |
|------|-----|--------|
| Homepage | | [ ] Live |
| Privacy Policy | /privacy | [ ] Live |
| Terms of Service | /terms | [ ] Live |
| Support/Contact | | [ ] Live |

---

## OAuth Consent Screen

- [ ] App name set: "KaizenOS"
- [ ] User support email configured
- [ ] App logo uploaded (120x120 PNG)
- [ ] Application homepage link
- [ ] Privacy policy link
- [ ] Terms of service link
- [ ] Authorized domains added
- [ ] Scopes selected and justified

---

## Scopes to Request

| Scope | Sensitivity | Justification Ready |
|-------|-------------|---------------------|
| `userinfo.email` | Non-sensitive | [ ] |
| `calendar.events` | Sensitive | [ ] |
| `calendar.calendarlist.readonly` | Sensitive | [ ] |
| `tasks` | Sensitive | [ ] |

---

## Verification Submission

### For Sensitive Scopes

- [ ] Detailed scope justification written
- [ ] Demo video recorded showing OAuth flow
- [ ] Data handling documentation prepared
- [ ] Security questionnaire completed (if required)

### Demo Video Requirements

Record a video showing:
1. User landing on app
2. Clicking "Connect Google Calendar"
3. OAuth consent screen appearing
4. User granting permission
5. Data being used in the app (calendar events displayed)
6. User disconnecting (showing user control)

**Video specs**: Unlisted YouTube video, 5 minutes max

---

## Security Assessment (If Required)

For apps with >100 users requesting sensitive scopes:

- [ ] Security questionnaire submitted
- [ ] Third-party security assessment (if >1M users)
- [ ] CASA Tier 2 assessment (if applicable)

---

## Legal Documents

### Privacy Policy Must Include

- [ ] What data is collected
- [ ] How data is used
- [ ] Data sharing policies (or lack thereof)
- [ ] Data retention period
- [ ] User rights (access, deletion)
- [ ] Contact information
- [ ] Google API Services User Data Policy compliance

### Terms of Service Must Include

- [ ] Service description
- [ ] User responsibilities
- [ ] Limitation of liability
- [ ] Termination conditions
- [ ] Governing law

---

## Brand Assets Needed

- [ ] App logo (120x120 PNG for OAuth screen)
- [ ] App icon (various sizes for app stores)
- [ ] Screenshots for app listing
- [ ] Feature graphic (if applicable)

---

## Post-Verification

- [ ] Test OAuth flow in production
- [ ] Monitor for verification status updates
- [ ] Respond to any Google reviewer questions
- [ ] Update consent screen if scope changes

---

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Prepare materials | 1-2 weeks |
| Submit for verification | 1 day |
| Google review (basic) | 1-4 weeks |
| Google review (sensitive scopes) | 4-6 weeks |
| Security assessment (if required) | 2-4 additional weeks |

---

## Helpful Links

- [Google OAuth Verification FAQ](https://support.google.com/cloud/answer/9110914)
- [OAuth Consent Screen Configuration](https://console.cloud.google.com/apis/credentials/consent)
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- [Sensitive Scopes Information](https://support.google.com/cloud/answer/9110914#sensitive-scopes)
