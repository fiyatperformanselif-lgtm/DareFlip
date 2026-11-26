# DareFlip development status

Date: 26 November 2026. Version: 0.1.0. This is a working development release aimed at a store-quality product; **it is not ready to submit to the stores**. No live ad IDs, developer-account details or publisher identity have been invented.

## Implemented

React/TypeScript/Vite application with Capacitor iOS/iPadOS and Android projects; original dark-purple/pink/orange visual identity, SVG icon, generated web/native icon and splash assets, animated opening, 3D card reveal, animated bottle, responsive phone/tablet layout, safe-area handling, reduced-motion support, optional sound and native haptics.

All six modes, 2–20 unique named players in group modes and exactly two adult partners in private Flirty, required explicit gender choices, Easy/Medium/Bold, random next-player selection without adjacent repeats when possible, Truth/Dare choice, canonical no-repeat deck history, explicit exhausted-deck reset, unconditional skip, favorites, persisted resume, daily question, PNG share/download, bonus-pack reward flow, settings and local-data reset are implemented. Private games require two fresh named acknowledgements; Random excludes private cards. App data remains on-device. No backend or login is required. Storage denial/corruption is handled; denied storage is visibly disclosed.

The English catalog has **192 card IDs: 180 core + 12 Afterglow**, paired with **192 Turkish translations**, for **384 active JSON records**. It combines 156 revision-2 cards and 36 user-supplied private Flirty revision-3 cards. Twenty-three supplied Turkish texts received copyediting/meaning-alignment corrections; all supplied English texts and metadata remain exact. The old 282-row v1 and 72-row Flirty-v2 archives exist solely for saved-card/favorite compatibility and are not drawn or counted as active content. Some imported concepts are semantically similar, so the count does not certify distinct ideas. The 5,000-original target is unfinished. Cards contain ID, category, difficulty, type, language, pack and sensitivity; cultural suitability and safety require human review beyond automated checks.

Twenty languages can be selected and device language is detected. English/Turkish keyed UI dictionaries are complete; the other 18 UI dictionaries are partial. All active Turkish cards are translated; the other 18 card languages are unimplemented. Historical archived favorites can still require an English fallback. Per-card English fallback and translation status are disclosed. Arabic RTL works in browser checks. English legal drafts are identified as English; fallback card text declares its actual language.

AdMob services are native-only and explicitly enabled. UMP `canRequestAds` gates initialization/requests. The current UI does not request ATT/tracking; requests ask for nonpersonalized inventory. Menu banners reserve their actual measured size; sensitive gameplay/cards suppress ads. Interstitials require more than five played cards, a 120-second minimum, and an explicit pause that is rechecked after loading. Reward cancellation/failure/revoked permission never unlocks content. Ads never block core play. Native development uses official Google sample IDs; production ad units are blank unless configured.

## Verification evidence

| Check | Result and limits |
| --- | --- |
| Clean dependency installation | `npm ci --no-audit --no-fund` passed against the committed lockfile |
| TypeScript | `npm run typecheck` passed |
| Lint | `npm run lint` passed; generated native/build/test reports excluded |
| Unit tests | **96 passed** across domain/content/archive integrity/storage, player metadata, private-session validation/migration, Random exclusion, publisher/legal rendering, i18n and mocked ad-service contracts |
| Browser game matrix | **96/96 passed**, Chromium at iPhone/Android/iPad viewport sizes; includes 42 private/Flirty cases covering pools, fresh named acknowledgements, exact legacy recovery, group blocking, Random exhaustion, invalid saves and narrow screens |
| Release UI fixtures | **10/10 passed** across phone/tablet profiles: ad-free controls/entitlements, shared EN/TR legal copy and publisher links using browser-only fixtures |
| Release preparation helpers | **28/28 Node checks and 8/8 native-profile fixture checks passed**: publisher/site generation, intended/native-stage preflight, explicit profiles, actual Capacitor SDK exclusion/restoration and production Vite flags |
| Targeted final copy regression | **6/6 passed** after clarifying the pause dialog’s Back button |
| Screenshot regeneration | **3/3 passed**, 15 actual application PNGs under `artifacts/screenshots` |
| Production offline checks | **2/2 passed**: service-worker cold reload/resume/play without network or third-party requests; storage-denied play with visible warning |
| Accessibility | **15/15 accessibility tests passed**, including private EN/TR portrait/landscape setup/card scans, keyboard acknowledgements, focus/44px targets and viewport checks with zero definite automated axe violations. Gradient contrast remains manual review; see `docs/ACCESSIBILITY.md` |
| Production web build | `npm run build` passed; local fonts, bundled JSON and hashed offline shell; native apps bundle the payload directly |
| Capacitor | Both platforms generated and synced, including App, AdMob, Filesystem, Haptics and Share plugins |
| Android compilation | Real debug APK built with verified JDK 21, Android API 36/build tools and Gradle 8.14.3; native plugin Java/Kotlin compilation, APK ZIP integrity, v2 debug signature and package/version metadata verified |
| iOS/iPadOS compilation | The user's Codemagic run-11 screenshot for `6042750` shows successful cloud archive/export and Publishing with an `App.ipa` artifact. No native archive was executed or IPA/device runtime inspected in this Linux environment; Apple processing/review/publication remain unverified |
| Release preflight | `npm run check:release` **intentionally fails** while development sample IDs, publisher/legal placeholders, incomplete content and translations remain. This is separate from passing application builds/tests |

Browser “iPhone/iPad” profiles use Chromium with matching dimensions. They are not WebKit tests or native-device execution. No emulator/physical device, VoiceOver/TalkBack, real native share sheet, real haptics/audio hardware, live UMP/ATT/ad fill or store submission has been validated. Native SDK privacy/network compliance requires real-device testing; mocked contract tests do not certify it.

## Deliverables

- Source, pinned compatible dependencies, lockfile and CI quality workflow.
- `android/` and `ios/` native project sources; generated build outputs are ignored.
- Historical debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`, local development artifact, debug-signed, test inventory only. Size: 15,904,390 bytes. SHA256: `09de1763f978810e5e6289bb3bbc62110b702cb9c02fcd72d40cc9b1e2066017`. Its earlier native asset/signature checks passed, but it predates the later gender/content/private-mode updates and has not been rebuilt for them.
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

Added and exercised `npm run beta:ios` for test-ad web compilation and iOS synchronization. Detailed Mac/Xcode → Archive → App Store Connect → internal TestFlight steps are in `docs/TESTFLIGHT.md`, with static project audit in `docs/IOS_BETA_AUDIT.md`. That initial preparation did not create a signed archive or upload from this Linux machine. The publisher later supplied successful Codemagic signing/archive/Publishing evidence for source `6042750`; see the current iOS verification row and `docs/APP_STORE_READINESS.md`. Apple processing, installed-device behavior and public review approval have not been verified here. Internal beta preparation does not require finishing the full-content/public-store release checklist.

## Codemagic upload workflow

Added `codemagic.yaml` workflow `ios-testflight`, a shared App archive scheme and validated metadata/signing helpers. The user can build on Codemagic macOS without local Xcode. It is manually started and uploads to App Store Connect with automatic Beta App Review and App Store submission disabled; testing/review remains under the publisher's control. Real integration/signing identities and `dareflip_beta` group metadata must be configured in Codemagic; none have been fabricated or embedded. Read `docs/CODEMAGIC_TESTFLIGHT.md` for secure setup. Eight cloud-helper tests pass in addition to the existing 50 application tests; native cloud execution and Apple upload have not been performed here. The Capacitor bundle ID supports a CI override so custom publisher identity matches the Xcode project and profile.

## iOS player-name focus zoom correction — 25 November 2026

The user reported that the TestFlight screen zoomed in while editing player names and could not be pinched back out. The name fields were 13px and the language selector was 10–11px; iOS can automatically zoom focused controls below 16px. Capacitor's iOS default also disables pinch recovery.

Editable fields/selectors now use a shared `max(16px, 1rem)` font size at every breakpoint. Text-size adjustment is stable across orientation changes, while the viewport retains user scaling. `ios.zoomEnabled` is explicitly true so intentional pinch zoom/recovery remains available. Application touch handling uses `manipulation` to retain scrolling and pinch while avoiding accidental double-tap zoom. No `user-scalable=no`, scale cap, or forced viewport reset was added.

Verification: TypeScript, lint, production beta build/iOS sync passed; generated native configuration contains `zoomEnabled: true`. Four new viewport/form regressions and six existing keyboard/accessibility checks passed in Chromium at phone/tablet/landscape sizes. WebKit is not installed in this environment; Chromium does not emulate the real iPhone software keyboard focus zoom. The changed native configuration and bundled CSS require a new Codemagic/TestFlight build, followed by checking name focus/keyboard dismissal and pinch recovery on the iPhone. No physical-device verification of the correction is claimed.

## Required player gender choices — 25 November 2026

Every player row now requires an explicit Woman, Man, Non-binary, or Prefer not to say choice before a new game can start. No default is selected and no gender is guessed from names. The choices stay aligned when players are added/removed, persist locally with the session, and are shown with the current player. All 20 interface catalogues include the eight new setup/gender strings; the other untranslated UI/card content is still marked incomplete.

Legacy v1 saves missing gender metadata are migrated without resetting the active card, seen history, current player, favorites or preferences. Resume opens a completion form with the original roster locked; choosing the missing options returns to the same game. Explicit unanswered values remain pending rather than being silently treated as undisclosed. Invalid/misaligned stored metadata is rejected by the same defensive state validator.

Latest verification: 62 unit tests, 48 phone/tablet browser E2E tests, 11 accessibility tests and 2 production offline tests passed; TypeScript, lint, production beta build and iOS synchronization passed. This includes all four choices, per-player required validation, player removal, 20-player setup, Turkish labels, reload persistence and exact legacy-game recovery. Updated screenshots include the new controls. The input/select 16px minimum and native pinch recovery configuration are preserved. Actual new-feature behavior on iPhone/TestFlight still requires installing a newly built Codemagic beta. The earlier Android debug APK remains a historical development artifact and has not been rebuilt for this feature.

## Editorial revision 2 — 26 November 2026

All 192 active concepts were rewritten in English and Turkish, including all 12 bonus cards. The review prioritized concrete personal/social scenes, revealing contradictions, adult humor and actable short Dares. Sixteen concepts received additional bilingual revisions to remove cross-mode overlap and unnatural wording. X access was attempted but blocked by the environment's HTTP CONNECT403 restriction; no X posts were read or copied. See `docs/EDITORIAL_REVIEW.md` for editorial criteria and source transparency. The quality review is not a psychological/therapeutic or native-speaker certification.

Fresh revision IDs keep existing favorites and the current saved card on their original trusted text. New draws/daily cards only use the new catalog, and current Turkish play has no missing-card fallback. The old gender-completion migration, card repeat history, entitlement checks and sensitive-favorite ad suppression continue to support archived IDs without accepting altered saved text.

Verification: 71 unit tests, 54 E2E tests across three Chromium phone/tablet profiles, 11 accessibility tests and 2 production offline tests passed. Separate narrow-phone and landscape checks verified the longest EN/TR prompts are fully readable and Next/Skip remain reachable; TypeScript, lint, production beta build and iOS sync passed. A new signed Codemagic/TestFlight build and real-device playtesting of the revised content remain necessary; this task did not upload a native beta.

## Focused Flirty review and narrow-screen correction — 26 November 2026

The user clarified that the intended 18+ experience is a private game between partners. The existing 36 Flirty concepts, despite their EN/TR rewrite, are predominantly dating conversations and verbal/imagined Dares. There is no bedroom pack, and the current content does not meet that clarified product goal. No explicit sexual content was added during this testing pass. Editorial gaps are recorded in `docs/TEST_REPORT_2026_11_26.md`.

Independent live checks found a real Turkish Truth/Dare choice-screen overflow at 320px after skipping a Bold card (`.main` scroll width 339px). Choices now share the available width at up to 360px and place their icons above the labels; the corrected screen measures 320px without clipping. Card, choice, skip and next controls were checked in portrait and landscape, with no uncaught JavaScript errors.

Added 21 focused Flirty browser checks across English/Turkish, all three difficulties and the three phone/tablet profiles. Each pool is played through completely, including explicit exhaustion/reset, age acknowledgement, free skips, saved current card/favorites and reload/resume. Final verification: **75/75 E2E, 71/71 unit, 11/11 accessibility, 2/2 production offline and 8/8 Codemagic helper tests passed**; lint, TypeScript, production beta build and iOS sync passed. These are Chromium and mocked-service checks, not direct execution of the installed TestFlight app or native SDK certification. The earlier Android APK remains a historical build.

## User-supplied private Flirty v3 replacement — 26 November 2026

Replaced only the active Flirty deck with the complete uploaded 36 cards / 72 EN-TR records. All supplied English strings, IDs and metadata remain exact; 23 Turkish strings received spelling, phrasing or meaning-alignment corrections. The other 312 active localized rows remain byte-for-value identical, and all 72 old Flirty-v2 rows are preserved in a new immutable compatibility archive. No missing explicit task was invented: the second source upload contained the complete final pair of cards. Source checksums, changed IDs and remaining semantic-overlap notes are in `docs/content-import-v3-audit.json`; the integration report is `docs/CONTENT_IMPORT_V3.md`.

Private Flirty is now exactly two adult partners, with separate named acknowledgements for each new session, a visible partner label and ongoing voluntary skip/stop guidance. Random excludes private cards. Old two-person saves obtain the new acknowledgements without losing the exact archived card/history/favorites. Old larger groups retain their previous card and can skip it, while new private draws remain blocked; starting a pair opens a blank roster and does not overwrite the old save until the new game begins.

Final checks: **83/83 unit, 96/96 browser E2E, 15/15 accessibility, 2/2 production offline and 8/8 Codemagic helper tests passed**. TypeScript, lint, production beta compilation and iOS sync passed. Four additional independent EN/TR portrait/landscape browser sessions checked named acknowledgement, metadata, partner labels, skip/next, exact resume and zero uncaught JavaScript errors. The production bundle has an existing nonblocking size warning. No native iOS archive, TestFlight upload, physical-device/WebKit test or updated Android APK was produced in this pass. A fresh signed Codemagic build is needed to install the update.

## Public release assessment after successful cloud beta build — 26 November 2026

The publisher supplied a Codemagic run-11 screenshot for source `6042750` showing a successful signed IPA archive/export and Publishing stage. This updates the earlier cloud-build limitation; it does not prove Apple processing, review approval, installed-device behavior or public availability. The IPA/account state was not directly accessed from this environment.

Fresh verification on that source passed TypeScript, lint, 83 unit tests, 96 Chromium browser-flow tests, 15 accessibility tests, 2 production offline tests, 8 Codemagic-helper tests and the production web build. The release preflight exits 1 with 14 findings. Android and roadmap-count/translation findings are internal scope checks rather than Apple minimums; actual iOS release blockers include the test-ad beta configuration and unfinished publisher/privacy/support information. The supplied intimate deck also has a serious sexual-content-policy risk requiring a public-release content decision. The official current Apple policy page could not be retrieved through the environment proxy; no actual Apple rejection or approval is claimed.

Public submission is on hold. `docs/APP_STORE_READINESS.md` contains the source evidence, policy-reference limitation, build/publication distinction and remaining native/account checks. No application code/cards or automatic submission flags were changed during this assessment, and no App Store submission or public release was performed. This documentation-only update does not require a new beta build for the same application behavior.

## Store-build and publisher-page preparation — 26 November 2026

Added a separate manual `ios-app-store` workflow and explicit `ad-free` / `production-ads` preparation profiles. No profile is selected automatically. Ad-free builds block all ad/UMP/ATT bridge calls, exclude native AdMob dependencies and remove related plist declarations; production advertising requires publisher-supplied identifiers and explicit non-test settings. The existing beta path retains official test configuration. Source preflight runs before compilation and native preflight inspects actual generated output afterward; development-mode overrides cannot silently select test inventory. Roadmap counts and unsupported languages are warnings, while inaccurate listing claims remain errors.

The in-app support screen now reads public publisher configuration and can open the real email/support/privacy targets. In-app legal text and four generated standalone bilingual pages use the same EN/TR content source and selected advertising mode. Missing identity/URLs are visibly disclosed, rejected for public-page output and not filled with invented contact information. A new keyboard regression caught legal links being omitted from the modal focus loop; the implementation now includes those links and the 15-case accessibility rerun passes.

Current validation: 96 application unit tests, 96 default browser game flows, 10 ad-free/publisher browser cases, 15 accessibility tests, 2 production offline tests, 28 Node release/site checks, 8 native-profile fixture tests and 8 existing Codemagic metadata tests passed. TypeScript, lint, production beta compilation and iOS synchronization passed. Static fixture pages were visually inspected at 320px with no overflow or external requests. The existing nonblocking JavaScript chunk-size warning remains. No new signed archive, physical-device validation, live production-ad verification, website hosting or Apple publication was performed.

The user confirmed **IzarGames** as the public publisher brand and **info@izargames.com** as its public support contact; both are now configured. They will host the pages on their own server using the hosting panel's file manager. Four self-contained EN/TR pages were generated locally in separate advertising-enabled and ad-free ZIPs, each containing a separate `dareflip` folder. `site/izargames.publisher-plan.json` records proposed paths under the email domain, explicitly marked unverified and separate from application configuration; it does not establish the actual host, document root or live URLs. No files were uploaded, existing site files changed or remaining release preference inferred. External checks were blocked by the environment proxy before reaching the origin; this is not evidence that the website is down.

Focused verification of the contact change passed 9 unit checks, 3 support-screen browser checks and 8 publisher fixture checks. Both sets of four actual-data HTML pages were checked locally at 320px: no horizontal overflow, scripts, external requests or uncaught browser errors. TypeScript, lint and formatting checks passed for the contact/test changes. The three application web URLs remain empty until deployment is verified. Publication still awaits live URLs, the advertising profile choice and public-release content decision; `src/config/store-review.json` stays pending. The supplied 18+ catalog and both compatibility archives were not changed. See `site/IZARGAMES_SERVER.md` for manual upload instructions and `docs/RELEASE_SETUP.md` for remaining release inputs.
