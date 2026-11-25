# Native builds and release handoff

DareFlip uses React/TypeScript/Vite packaged by Capacitor 8. Bundle ID `com.dareflip.app` is temporary. No signing keys, developer identities, passwords, live advertising IDs, or developer-account details are included.

## Shared preparation

Use the Node version in the repository's pin (Node 24) and the checked-in npm lockfile. From the repository root:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx cap sync
```

`dist` is the offline web payload copied into both native projects. Never point a release app at a dev-server URL. Rebuild and sync whenever web code/assets or plugins change. App data stays local; no separate server is required.

## iOS and iPadOS

Requires macOS, a compatible current Xcode supporting Capacitor 8, Apple command-line tools, and signing access. This Linux workspace cannot produce a signed iOS archive or validate simulator/device behavior.

```sh
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode, select the App project, choose the publisher's Team, replace the temporary bundle ID if required, and verify iPhone + iPad device families, deployment target, display name, version/build, launch assets, icon assets, orientations, and privacy usage strings. Generated Capacitor 8 projects use Swift Package Manager. Resolve Swift packages with Xcode. Configure AdMob app IDs and delayed measurement as described in `ADMOB.md`. Archive a Release build, validate, distribute to TestFlight, and test on phone and tablet before App Store submission. Add required privacy manifests/SDK declarations and current SKAdNetwork identifiers following the SDK's official documentation.

## Android

Requires the Android SDK, a supported JDK (Capacitor 8/Android Gradle Plugin expects JDK 21), and the SDK platform/build tools matching the generated `variables.gradle` (check it rather than guessing). Install dependencies through Android Studio SDK Manager.

```sh
npm run build
npx cap sync android
npx cap open android
```

For a test-ad development APK, first copy `.env.example` to `.env.local` (preserve existing local settings) and keep `VITE_ADMOB_TESTING=true`, rebuild and sync. Without that flag or real IDs, standard production web payloads keep ads off. Never publish the sample native app IDs or the test flag. After prerequisites are installed:

```sh
cd android
./gradlew assembleDebug
```

For release, supply a publisher-owned signing configuration outside version control, confirm applicationId/versionCode/versionName/target SDK, replace the sample AdMob app ID, and build a signed Android App Bundle through Android Studio or the release Gradle task. Keep the upload key secure and enroll in Play App Signing. Do not commit keystores or secrets. Test via a Play internal track and physical devices before production.

## Required device validation

Test fresh install, offline first launch, resume after force quit, 2–20 players, duplicate/blank names, required explicit gender choices, all four options and add/remove alignment, legacy-save completion without progress loss, all modes and difficulties, repeated-card exhaustion, every skip, favorites, share cancellation/success, RTL, large text, name/gender field focus without automatic zoom, pinch recovery, reduced motion, VoiceOver/TalkBack, portrait/landscape, tablet layout, display cutouts/navigation bars, silent mode/haptics, and low-storage persistence failure. Test consent and ads separately with official test inventory. Verify that reward cancellation never unlocks content and that ads never interrupt sensitive cards.

## Store asset handoff

The repository includes web/design screenshots and generated icons/splash assets where documented in `DEVELOPMENT_STATUS.md`. Inspect source assets at their real sizes before release. Browser screenshots are not proof of native device support. Capture final App Store/Play screenshots from signed or release-equivalent native builds on the required device families. Follow current store artwork dimensions and branding rules at upload.

## Publication blockers

A successful web build or generated native project is not a signed or store-approved app. Publisher identity, support address, hosted legal URLs, native SDK configuration, signing/accounts, editorial/native-speaker review, completed translations, physical-device and accessibility testing, and store-review questionnaires must be completed before a launch claim.

## Release preflight

Run `node scripts/check-release.mjs` before preparing store artifacts. The current development edition deliberately fails this guard for sample/native IDs, absent real production units, legal/contact placeholders, the 5,000-original roadmap, and incomplete card localization. The guard prints configuration names and counts, never secret values. Passing it does not establish native/device, legal, privacy, signing, screenshot, or store-review completion. A normal development build is independent of this preflight.

The iOS app includes a registered `PrivacyInfo.xcprivacy` FileTimestamp reason `C617.1` following the installed Capacitor Filesystem guidance. Check the final merged privacy report in Xcode, including Google SDK manifests, before distribution. The project targets iPhone and iPad families (`1,2`); that declaration is not proof of device testing. Android backup is disabled (`allowBackup=false`).

## Managed Linux bootstrap used in this workspace

`bash scripts/setup-android.sh` prepares an isolated JDK and Android SDK under `/workspace`, outside the checkout. It was run successfully and rerun successfully without reinstalling valid components. It downloads Microsoft OpenJDK 21.0.13.1 from the official Microsoft Debian repository with its recorded SHA256, and Google command-line tools build 16111833 with the official repository SHA1 plus a pinned SHA256. Google's installer verifies SDK package downloads. No checksum, package-signature, or TLS verification is disabled. Packages include API 36, Build Tools 35.0.0/36.0.0 (AGP selects 35), and platform-tools. SDK licenses for the required development components are accepted during noninteractive installation. The new Android CLI is invoked with metrics disabled.

```sh
bash scripts/setup-android.sh
npm run build
npx cap sync android
python3 scripts/android-build.py
```

`android-build.py` activates the retained tools, keeps Gradle at two workers without parallel builds, uses writable cache/preferences paths, forwards the existing HTTPS proxy host/port to Java without exposing credentials, and reuses the configured Java CA store. It respects existing `JAVA_HOME`/Android variables and supports `DAREFLIP_TOOLS_ROOT` for a different writable tool root. Never hardcode a proxy URL or credential in repository scripts. A proxy requiring raw credentials needs supported environment configuration; these helpers do not extract them.

For direct local shell tools in this particular prepared cloud machine:

```sh
export JAVA_HOME=/workspace/.dareflip-jdk/usr/lib/jvm/msopenjdk-21-amd64
export ANDROID_HOME=/workspace/.dareflip-android-sdk
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export ANDROID_USER_HOME=/workspace/.dareflip-android
export GRADLE_USER_HOME=/workspace/.dareflip-gradle
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

Use `python3 scripts/android-build.py` for Gradle behind the managed proxy so Java activation/trust handling is applied. `ANDROID_PREFS_ROOT` must not conflict with `ANDROID_USER_HOME`; the tested helper sets only the latter. Retained tool directories can be snapshotted, but processes and shell exports do not survive a new task. The helper reapplies them each invocation. Keep SDK/JDK caches, generated APKs, signing keys, and `android/local.properties` out of Git.

## Validation recorded in this workspace

The initial Android debug build completed successfully with 218 executed tasks. Its APK passed ZIP archive integrity checks and contained the bundled offline `assets/public/index.html`; its recorded app version was 0.1.0. It compiled AdMob, Filesystem, Haptics, Share, Capacitor, and application sources. The generated APK remains ignored at `android/app/build/outputs/apk/debug/app-debug.apk`; do not commit it. Later web/plugin changes require a fresh `npm run build`, `npx cap sync`, and incremental APK build before handing off that artifact. Consult the final `DEVELOPMENT_STATUS.md` for the last synced build result. This is compilation evidence only: no emulator, physical device, release signing, live/test ad delivery, or iOS compilation was executed by this check.

Final synced Android debug artifact (after the corrected pause label, App hardware-back plugin, and corrected DareFlip adaptive icon/launch branding): `python3 scripts/android-build.py` passed in 33 seconds (248 tasks: 10 executed, 238 up-to-date). APK size: 15,904,390 bytes. SHA256: `09de1763f978810e5e6289bb3bbc62110b702cb9c02fcd72d40cc9b1e2066017`. All five adaptive foreground density assets are PNGs; the bundled xxxhdpi foreground pixels match the inspected DareFlip cards/lightning source. No scaffold foreground vector remains in the APK. APK Signature Scheme v2 verification passed. Package `com.dareflip.app`, version 0.1.0/code 1, min SDK 24, target SDK 36. All 16 bundled offline web assets matched the last native sync byte-for-byte. The bundle explicitly selects test advertising, contains only Google's official sample ad-unit publisher ID, and registers all five native plugins, including App. These checks do not demonstrate on-device gameplay or ad delivery. The APK is debug-signed and unsuitable for store submission.
