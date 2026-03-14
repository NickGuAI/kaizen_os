# macOS Release Runbook (Spec)

## Prerequisites
- Apple Developer account with Developer ID cert installed.
- App-specific API key for notary tool configured in CI secrets.
- `KAIZEN_WEB_URL` set for target environment.

## Build and Sign
```bash
xcodebuild \
  -project macos/KaizenOS.xcodeproj \
  -scheme KaizenOS \
  -configuration Release \
  -archivePath build/KaizenOS.xcarchive \
  archive
```

## Export
```bash
xcodebuild -exportArchive \
  -archivePath build/KaizenOS.xcarchive \
  -exportOptionsPlist macos/KaizenOS/exportOptions.plist \
  -exportPath build/export
```

## Notarize and Staple
```bash
xcrun notarytool submit build/export/KaizenOS.zip --wait
xcrun stapler staple build/export/KaizenOS.app
```

## Post-release Validation
- Launch app from clean machine.
- Verify `kaizenos://oauth/google` callback opens app and reloads Kaizen session.
- Verify Google OAuth page is always shown in system browser.
