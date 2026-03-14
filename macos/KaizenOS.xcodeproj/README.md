# Kaizen OS macOS Wrapper ADR

## Decision Summary
- Decision: Use **Native SwiftUI + WKWebView** for the first macOS wrapper.
- Why: This issue is macOS-only, and native wrapper gives the smallest runtime footprint, best OS integration, and direct control over browser/OAuth policy.
- Contingency: Revisit **Tauri** if cross-platform desktop support (Windows/Linux) becomes a near-term requirement.

## Option Matrix

| Option | Strengths | Weaknesses | Fit for This Issue |
|---|---|---|---|
| Electron | Fastest for JS-heavy teams; mature update ecosystem | Largest app size and memory footprint; duplicates Chromium runtime | Medium |
| Tauri | Smaller runtime than Electron; web stack reuse | Rust/tooling overhead; plugin choices add complexity | Medium-High |
| Native SwiftUI + WKWebView | Best macOS UX and OS integration; smallest install size; strongest control over auth/browser behavior | macOS-only; separate desktop code path | **High (recommended)** |

## Runtime Model
- Host app: SwiftUI (`macos/KaizenOS/App/KaizenOSApp.swift`)
- Web container: persistent `WKWebView` (`WKWebsiteDataStore.default()`)
- Root URL: `KAIZEN_WEB_URL` in app `Info.plist` (fallback `https://kaizen.gehirn.ai`)
- Navigation policy:
  - Keep Kaizen first-party pages in `WKWebView`
  - Open Google OAuth hosts in system browser (`NSWorkspace.shared.open`)

## OAuth Handoff (Native-safe)
- Kaizen web calls `/api/calendar/google/authorize`.
- Native wrapper opens Google auth in system browser.
- Callback completes at backend callback path and redirects to `kaizenos://oauth/google?...`.
- App consumes deep link via `onOpenURL`, then notifies web app context with `window.dispatchEvent('kaizen:native-oauth')` + reload.

## Build/Release Pipeline (spec)
1. Archive with Xcode (`Release`, hardened runtime on).
2. Codesign with Developer ID Application cert.
3. Notarize (`xcrun notarytool submit --wait`).
4. Staple notarization ticket (`xcrun stapler staple`).
5. Publish signed `.dmg` (or `.pkg`) in release artifacts.
6. Optional auto-update strategy:
   - Phase 1: manual update distribution.
   - Phase 2: Sparkle feed for in-app updates.

## Rollout Phases
1. Phase A: Internal alpha wrapper, native OAuth handoff enabled.
2. Phase B: Beta with signed/notarized distribution + telemetry for OAuth/connect success.
3. Phase C: General availability, auto-update channel enabled.

## Operational Checks
- Verify `KAIZEN_WEB_URL` is reachable and uses HTTPS.
- Verify custom URL scheme `kaizenos://` registered in app bundle.
- Verify backend native redirect/callback URI configured in Google Cloud OAuth client.
- Verify Google OAuth pages never render in embedded webview.
