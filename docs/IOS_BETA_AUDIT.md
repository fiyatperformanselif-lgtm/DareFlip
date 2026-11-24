# iOS / TestFlight beta audit

Inspected 24 November 2026. Read-only project audit; no iOS compilation, archive, signing, or upload was performed. This cloud machine runs Linux and has no `xcodebuild`.

## What exists

- App project: `ios/App/App.xcodeproj`, target `App`, automatic signing style. No shared `.xcscheme` file is checked in; confirm the automatically generated `App` scheme using Xcode or `xcodebuild -list` on a Mac.
- Bundle ID `com.dareflip.app` is temporary and must be available to the publisher's Apple team. Version 0.1.0, build 1, iOS deployment target 15.0, iPhone/iPad target families `1,2`.
- Swift Package Manager bridge references exact Capacitor 8.6.2 and all five installed local native packages. All referenced local `Package.swift` files exist after `npm ci`.
- AdMob's package references Google Mobile Ads 13.11.0 and UMP 3.1.x plus its native UI dependency. Mac/Xcode dependency resolution and compatibility have not been exercised.
- App icon is 1024×1024 without an alpha channel. App-level `PrivacyInfo.xcprivacy` includes the Filesystem FileTimestamp reason C617.1 and is registered in the Xcode resource build phase. Xcode's final merged SDK privacy report still needs inspection.
- Native configuration contains Google's sample app ID and delayed measurement. Explicit `VITE_ADMOB_TESTING=true` uses sample ad inventory; it is a beta/test build, not a live-ad store release.

## Immediate prerequisites for upload

1. A Mac with a currently supported Xcode and its iOS SDK; install/accept Xcode's required components and verify `xcodebuild -version`.
2. Membership in the Apple Developer Program and an App Store Connect role permitted to create/upload this app. A free Apple ID alone cannot distribute through TestFlight.
3. A known team, registered/available bundle ID, App Store Connect app record, signing certificate/private key and provisioning through that account. No development team is configured in the project, and no checked Apple credential variable is present in this machine. Do not send keys/passwords in chat.
4. A build number not previously uploaded for this version. The checked-in build number is 1; increase it for subsequent submissions.
5. Truthful export-compliance answers. `ITSAppUsesNonExemptEncryption` is absent; this is a questionnaire/configuration item, not proof that the app uses or does not use nonexempt encryption. Do not insert a guessed declaration.

The 5,000-card goal and complete translation coverage are product work, not prerequisites for an internal TestFlight beta. Describe the actual 192 English originals, 90 Turkish translations, and partial localization in beta notes. Internal testers need the appropriate App Store Connect access. External/public-link beta testing can require Beta App Review and additional beta metadata/contact information. An uploaded build must finish Apple processing before testers can install it.

## Supported Mac preparation and archive

From the checkout root, after the publisher's real account is configured in Xcode:

```sh
npm ci
VITE_ADMOB_TESTING=true npm run build
npx cap sync ios
xcodebuild -list -project ios/App/App.xcodeproj
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
```

Confirm the actual team and a new build number, then use those real values in the environment. Team ID and build number below are requirements, not supplied identifiers:

```sh
: "${APPLE_TEAM_ID:?Set your actual Apple development team ID}"
: "${BETA_BUILD_NUMBER:?Set an unused positive build number}"
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$PWD/build/DareFlip.xcarchive" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  CURRENT_PROJECT_VERSION="$BETA_BUILD_NUMBER" \
  archive
```

This is a supported command template, not a command validated on this Linux machine. Resolve any Swift package, signing, privacy, or SDK compatibility errors against the actual Xcode output. If `App` is not listed, open the project, create/share its scheme, and use the resulting real scheme name.

Open Xcode Organizer, select the archive, choose Distribute App → App Store Connect, validate, and upload with the publisher's signed-in account. Follow Xcode's currently offered distribution actions. App Store Connect will process the build and may request export-compliance information. Then add it to an internal TestFlight group and invite authorized internal testers. Do not claim upload succeeded until Apple's upload result and processed build record are available.

No CI workflow, signing identity, API key, certificate, provisioning profile, App Store Connect app record, encryption declaration, or upload was invented or configured by this audit. The broad store-release preflight script intentionally checks the full product roadmap; it should not be used as a blanket blocker for an honest internal beta.
