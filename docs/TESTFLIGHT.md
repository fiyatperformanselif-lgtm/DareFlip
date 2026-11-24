# DareFlip — TestFlight beta

**Preferred route: [Codemagic cloud build and upload](CODEMAGIC_TESTFLIGHT.md).** You do not need to open local Xcode; Codemagic provides macOS/Xcode in the cloud. The manual Mac route below remains optional.

TestFlight is a private beta distribution step, separate from a public App Store release. The current 192 original cards and partial translations can be tested internally; completing the 5,000-card roadmap is not a technical prerequisite. Do not advertise unfinished features as complete to testers.

## What is prepared and what is missing

The iPhone/iPad Capacitor project exists at `ios/App/App.xcodeproj`, version 0.1.0/build 1, temporary bundle ID `com.dareflip.app`. Its icon is opaque 1024×1024 and its app privacy manifest is registered. These static checks do not establish that Xcode archives successfully. This Linux environment has no Xcode, Apple team, signing identity, provisioning profile or App Store Connect authentication, so no iOS archive or TestFlight upload has been made.

You need an active paid Apple Developer Program membership, access to the relevant App Store Connect team, and a Mac with an Xcode version accepted by App Store Connect and compatible with Capacitor 8. A cloud macOS build service is an alternative to owning a Mac; it still requires the publisher's authorized signing/Apple account setup. An Android APK cannot be uploaded to TestFlight.

Do not send Apple passwords, app-specific passwords, `.p8` private keys, signing certificates or provisioning-profile contents in chat. Sign in directly in Xcode/App Store Connect. A future CI upload should use that provider's encrypted secrets, with access restricted to the intended repository/environment.

## 1. Get this code onto the Mac

Use the latest project checkout or a secure transfer of this source. The repository is `https://github.com/fiyatperformanselif-lgtm/DareFlip`; use the main branch containing the prepared commits, or transfer a source bundle. Install the Node version in `.nvmrc`, then from the repository root:

```sh
npm ci
npm run beta:ios
npx cap open ios
```

`beta:ios` compiles the web payload with `VITE_ADMOB_TESTING=true` and synchronizes only iOS. It neither signs nor uploads. The beta always uses Google's official test ad units; never use live ads for developer testing. Native sample app IDs are already present. Consent still gates SDK requests, and unavailable test ads must not stop play. Do not replace this beta configuration with production units merely to obtain ad fill.

## 2. Register the identity and configure signing

In Apple Developer, register an explicit App ID that your team owns. Keep `com.dareflip.app` only if it is available to your team; otherwise choose the final unique bundle ID and update both `capacitor.config.ts` (`appId`) and the App target's Bundle Identifier to match. Regenerate/sync configuration as needed; avoid leaving Capacitor and Xcode identifiers inconsistent.

In App Store Connect → My Apps, create the iOS app record using the matching bundle ID and a unique publisher-owned SKU. The proposed display name is DareFlip; availability of the App Store name must be checked in the account. Do not invent Apple team IDs or existing-app numeric IDs.

In Xcode → Settings → Accounts, sign in directly with the authorized Apple account. In the App target → Signing & Capabilities, select that team and use Automatically manage signing. Resolve Swift Package Manager dependencies; there are local Capacitor plugin package references under `node_modules`, so run `npm ci` before opening the project. Confirm the App scheme, iPhone/iPad device families, bundle ID, version and build number.

Build 1 can be used for the first upload if not previously uploaded. Increment the build number for every subsequent upload. Do not reuse a processed `(version, build)` pair.

## 3. Archive and upload

Choose the App scheme and a generic iOS device destination (for example Any iOS Device / arm64), not a simulator. Use Product → Archive. Once Xcode Organizer opens, choose Distribute App → App Store Connect → Upload (labels can vary with Xcode). Resolve validation/signing issues and complete the upload.

If the App scheme is not shown, open Manage Schemes and enable/share the App scheme, then confirm it with `xcodebuild -list -project ios/App/App.xcodeproj` on that Mac. No guessed signing configuration or unverified archive is included here.

Xcode/Apple may ask about export compliance. The app currently does not hardcode `ITSAppUsesNonExemptEncryption`; review the actual app and bundled SDK encryption and answer truthfully in App Store Connect. Do not set a declaration just to bypass the question. Review bundled SDK privacy manifests, usage descriptions and consent behavior too.

## 4. Install through TestFlight

After Apple finishes processing the upload, open the app's TestFlight tab in App Store Connect. For your first check, use an internal testing group and add eligible App Store Connect team users. External testers/public links can require Beta App Review and additional beta information; do not assume an external link is immediately available.

Install Apple's TestFlight app on the iPhone/iPad, accept the beta invitation, then install DareFlip. Public App Store publication is not required for internal TestFlight testing. Store processing/review delays are controlled by Apple.

## First native test session

Verify fresh offline launch, all six modes and three difficulties, two and twenty players, adult confirmation, bottle/card animations, free skipping, exhaustion/reset, saved cards, quit/resume, Turkish/Arabic/fallback text, portrait/landscape/iPad layout and safe areas. Exercise sound, haptics, PNG sharing/cancel, VoiceOver and large text on real devices. Test privacy refusal, test-ad failures, the five-card/120-second interstitial restriction, returning from a pause during ad loading, sensitive-content exclusion, and rewarded dismissal versus earned reward.

Report the build number, iOS version/device model, reproduction steps, expected/actual behavior and an optional screenshot; omit personal player information. Known unfinished content, translations and publisher contact are listed in `DEVELOPMENT_STATUS.md`.

## Verified scope

`npm run beta:ios` is tested on the cloud Linux machine for web compilation and Capacitor iOS synchronization. Native Xcode build, signing, upload, Apple processing and installation remain unverified until performed with the publisher's Mac/cloud macOS runner and account. `npm run check:release` targets the full public-release handoff and intentionally reports unfinished content/legal/live-ad configuration; it is not a TestFlight beta upload command.
