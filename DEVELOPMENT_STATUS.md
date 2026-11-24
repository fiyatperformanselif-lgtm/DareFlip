# DareFlip development status

Date: 24 November 2026. Version: 0.1.0. This is a working development release aimed at a store-quality product; **it is not ready to submit to the stores**. No live ad IDs, developer-account details or publisher identity have been invented.

## Implemented

React/TypeScript/Vite application with Capacitor iOS/iPadOS and Android projects; original dark-purple/pink/orange visual identity, SVG icon, generated web/native icon and splash assets, animated opening, 3D card reveal, animated bottle, responsive phone/tablet layout, safe-area handling, reduced-motion support, optional sound and native haptics.

All six modes, 2–20 unique named players, Easy/Medium/Bold, random next-player selection without adjacent repeats when possible, Truth/Dare choice, canonical no-repeat deck history, explicit exhausted-deck reset, unconditional skip, favorites, persisted resume, daily question, PNG share/download, bonus-pack reward flow, settings and local-data reset are implemented. App data remains on-device. No backend or login is required. Storage denial/corruption is handled; denied storage is visibly disclosed.

The English catalog has **192 original concepts: 180 core + 12 Afterglow**. There are **90 Turkish translations**, for **282 JSON records**. The 5,000-original target is unfinished; translated rows are not counted as originals. Cards contain ID, category, difficulty, type, language, pack and sensitivity. Semantic originality, cultural suitability and safety still require human editorial review beyond automated duplicate checks.

Twenty languages can be selected and device language is detected. English/Turkish keyed UI dictionaries are complete; the other 18 UI dictionaries are partial. Turkish card content is partial; the other 18 card languages are unimplemented. Per-card English fallback and translation status are disclosed. Arabic RTL works in browser checks. English legal drafts are identified as English; fallback card text declares its actual language.

AdMob services are native-only and explicitly enabled. UMP `canRequestAds` gates initialization/requests. The current UI does not request ATT/tracking; requests ask for nonpersonalized inventory. Menu banners reserve their actual measured size; sensitive gameplay/cards suppress ads. Interstitials require more than five played cards, a 120-second minimum, and an explicit pause that is rechecked after loading. Reward cancellation/failure/revoked permission never unlocks content. Ads never block core play. Native development uses official Google sample IDs; production ad units are blank unless configured.

## Verification evidence

| Check | Result and limits |
| --- | --- |
| Clean dependency installation | `npm ci --no-audit --no-fund` passed against the committed lockfile |
| TypeScript | `npm run typecheck` passed |
| Lint | `npm run lint` passed; generated native/build/test reports excluded |
| Unit tests | **50 passed** across domain/content/storage, state validation, i18n and mocked ad-service contracts |
| Browser game matrix | **30/30 passed**, Chromium at iPhone/Android/iPad viewport sizes; covers all modes/difficulties, player limits, cards, exhaustion, skip, favorites, persistence, adult gate, settings/legal/privacy, no web ads, reward failure and real PNG export |
| Targeted final copy regression | **6/6 passed** after clarifying the pause dialog’s Back button |
| Screenshot regeneration | **3/3 passed**, 15 actual application PNGs under `artifacts/screenshots` |
| Production offline checks | **2/2 passed**: service-worker cold reload/resume/play without network or third-party requests; storage-denied play with visible warning |
| Accessibility | Six keyboard/focus/44px target/responsive checks passed; final axe scan passed across eight states with zero definite automated violations. Gradient contrast remains manual review; see `docs/ACCESSIBILITY.md` |
| Production web build | `npm run build` passed; local fonts, bundled JSON and hashed offline shell; native apps bundle the payload directly |
| Capacitor | Both platforms generated and synced, including App, AdMob, Filesystem, Haptics and Share plugins |
| Android compilation | Real debug APK built with verified JDK 21, Android API 36/build tools and Gradle 8.14.3; native plugin Java/Kotlin compilation, APK ZIP integrity, v2 debug signature and package/version metadata verified |
| iOS/iPadOS compilation | **Not run**: macOS/Xcode/signing are unavailable in this Linux environment. Project, SPM references, iPhone/iPad device families, privacy manifest, plist configuration and opaque 1024px icon are present |
| Release preflight | `npm run check:release` **intentionally fails** while development sample IDs, publisher/legal placeholders, incomplete content and translations remain. This is separate from passing application builds/tests |

Browser “iPhone/iPad” profiles use Chromium with matching dimensions. They are not WebKit tests or native-device execution. No emulator/physical device, VoiceOver/TalkBack, real native share sheet, real haptics/audio hardware, live UMP/ATT/ad fill or store submission has been validated. Native SDK privacy/network compliance requires real-device testing; mocked contract tests do not certify it.

## Deliverables

- Source, pinned compatible dependencies, lockfile and CI quality workflow.
- `android/` and `ios/` native project sources; generated build outputs are ignored.
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`, local development artifact, debug-signed, test inventory only. Final size: 15,904,390 bytes. SHA256: `09de1763f978810e5e6289bb3bbc62110b702cb9c02fcd72d40cc9b1e2066017`. Final incremental build passed after the last source sync; all 16 bundled offline assets match their copied native sources, and the test-only ad flag is verified.
- Original icon SVG, master PNG/splash, platform assets and 15 browser screen references.
- `docs/ARCHITECTURE.md`, `CONTENT.md`, `ACCESSIBILITY.md`, `ADMOB.md`, `NATIVE_BUILDS.md`, `STORE_METADATA.md`, `PRIVACY_POLICY.md`, `TERMS_OF_USE.md`, `SUPPORT.md`.
- Tested Linux native bootstrap/build helpers. JDK/SDK/Gradle caches live outside the checkout under `/workspace/.dareflip-*`; no credentials are embedded in helpers.

## Remaining before publication

1. Reach the 5,000-original editorial target if the release will advertise it; review distinctness, safety, difficulty and cultural fit.
2. Complete and native-speaker-review the remaining UI/card translations; retain truthful fallback notices until then.
3. Supply publisher/legal identity, real support contact and publicly hosted final Privacy Policy/Terms URLs; complete legal review and store privacy/data-safety/age-rating questionnaires. The Support screen currently provides rules and explicitly reports the missing publisher contact.
4. Configure publisher-owned native AdMob app IDs and unit IDs, UMP messages and regional consent/privacy settings; remove test flags for store release. Validate GDPR/ATT/SDK behavior and sensitive placement restrictions on real devices.
5. Build/test iOS and iPadOS on macOS/Xcode, configure final bundle IDs and signing for both stores, test native behavior and accessibility on physical phones/tablets, and capture final native store screenshots.
6. Review English metadata, artwork and store requirements in the developer consoles and submit through publisher accounts. No store publication has been performed.

Current-instance compilation, saved cloud configuration, cloud environment publication and successful restoration in a fresh task are distinct. Only the current-instance checks described here have been verified. The GitHub publication target for this source is `fiyatperformanselif-lgtm/DareFlip`, branch `main`. A Git push publishes source only, not an App Store build or the cloud environment. Cloud draft saving does not publish either the environment or the app.

## Cloud environment handoff

`install_script` and `start_skill` were saved successfully in the cloud configuration draft. They reproduce the frozen npm installation, verified Android bootstrap, web build and native sync, and document service startup and checks. Saving did not publish the environment. Review/save the draft in environment settings, then publish the cloud environment when desired; fresh-task restoration has not been verified. The development server is intended for port 5173; add that port in HTTP Previews to obtain a user-accessible hosted link.

Final native artwork verification: Android API 26+ adaptive foreground/background and Android 12+ launch theme now use DareFlip artwork; inherited Capacitor adaptive assets and unused template splash/test files were removed. The APK was rebuilt successfully after this resource correction.

## TestFlight preparation

Added and exercised `npm run beta:ios` for test-ad web compilation and iOS synchronization. Detailed Mac/Xcode → Archive → App Store Connect → internal TestFlight steps are in `docs/TESTFLIGHT.md`, with static project audit in `docs/IOS_BETA_AUDIT.md`. No Apple team/signing/account bindings are configured on this Linux machine. No iOS archive, TestFlight upload, Apple processing or beta installation has been performed; those remain blocked on the publisher's Apple membership and authorized macOS build/account route. Internal beta testing does not require finishing the full-content/public-store release checklist.

## Codemagic upload workflow

Added `codemagic.yaml` workflow `ios-testflight`, a shared App archive scheme and validated metadata/signing helpers. The user can build on Codemagic macOS without local Xcode. It is manually started and uploads to App Store Connect with automatic Beta App Review and App Store submission disabled; testing/review remains under the publisher's control. Real integration/signing identities and `dareflip_beta` group metadata must be configured in Codemagic; none have been fabricated or embedded. Read `docs/CODEMAGIC_TESTFLIGHT.md` for secure setup. Eight cloud-helper tests pass in addition to the existing 50 application tests; native cloud execution and Apple upload have not been performed here. The Capacitor bundle ID supports a CI override so custom publisher identity matches the Xcode project and profile.
