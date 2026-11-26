# DareFlip

**DareFlip: Truth or Dare** · *Couples & Party Games*
Flip a card. Reveal a secret.

An offline, local-first mobile party game built with React 19, TypeScript, Vite 8 and Capacitor 8. The repository contains a playable application, iOS/iPadOS and Android projects, editorial JSON content, tests, brand assets and publication handoff documents. It is **a development release, not a store-ready submission**; see [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for verified checks and unfinished work.

## Start

Node 24 (exact development pin in `.nvmrc`) and npm. No backend, account, API key or advertising configuration is necessary to play.

```sh
npm ci
npm run dev
```

Vite listens on `0.0.0.0:5173`. In a managed cloud environment, add **5173** under **Edit Environment → HTTP Previews** and apply it to the chat to obtain an authenticated preview URL. Cloud localhost addresses are internal to the machine.

For a production-equivalent web preview:

```sh
npm run build
npm run preview
```

The built web application precaches its own files on its first online visit and can then reload offline. Native apps bundle those files and do not need an initial online visit. Ads are optional and require connectivity. Live processes are not retained when a cloud machine restarts; start the dev server again. Use this existing isolated checkout; do not create a Git worktree unless requested.

## Play

Choose Couples, Party, Flirty 18+, Deep Talk, Crazy Fun or Random. Add 2–20 distinct names and select Easy, Medium or Bold. Flirty and Random (which includes Flirty) require confirmation that everyone is a consenting adult. Spin the bottle to select a player, then choose Truth or Dare. Cards reveal with a 3D animation. Skip or take the next turn freely. The previous player is excluded when possible; every other player is equally likely.

Favorites, preferences, unlocked bonus content, player gender choices and the current game save on this device. Older saved games ask for missing gender choices before resuming without resetting the active card or progress. A full matching deck never silently repeats: explicitly restart it after exhaustion. Changing language preserves canonical seen IDs. Daily questions use the UTC calendar date. Shared PNGs exclude player names. Sound and haptics can be disabled; OS reduced-motion preference is respected. Clearing local data or uninstalling can erase progress. Storage failure is disclosed while play continues.

## Content and translation truth

- **192 revised English concepts:** 180 core cards + 12 Afterglow bonus cards, rewritten in editorial revision 2.
- **192 Turkish card translations:** every active concept, including Afterglow, has an EN/TR pair. Translation rows are not additional original cards.
- Expandable JSON system with a **5,000-original target**, not 5,000 finished cards. Avoid generated near-duplicates. Human editorial/cultural review is still required.
- Twenty selectable language codes: `en tr de fr es pt it nl ru ar hi ja ko zh id pl sv no da el`.
- English and Turkish keyed UI dictionaries are complete. The other 18 UI dictionaries are partial. The active English/Turkish catalog is complete; other card languages use English fallback. Historical favorites keep their original edition and can still need a disclosed English fallback. Arabic uses RTL. Legal drafts remain English and are labeled as such.

See [architecture](docs/ARCHITECTURE.md), [content guide](docs/CONTENT.md), [editorial revision notes](docs/EDITORIAL_REVIEW.md), and `src/content/cards.json`. The immutable v1 archive preserves earlier saved cards/favorites while all new draws use revision 2. Metadata includes unique concept ID, category, difficulty, type, language, pack and sensitivity. No answers are collected or saved.

## Quality commands

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:offline
npm run test:a11y
```

Playwright uses `/usr/bin/chromium` if available; otherwise install its browser with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The e2e suite tests Chromium at iPhone, Android and iPad viewport sizes; it does not imply real WebKit/native device verification. `test:offline` requires the current `dist` build and uses port 4173. The E2E command starts its own isolated test server on port 5177. Generated test traces/reports are ignored. Authentic app captures are in [artifacts/screenshots](artifacts/screenshots); they are development browser captures, not final native store evidence.

## Native projects and assets

```sh
npm run native:sync
npm run native:android
# Linux cloud Android toolchain and APK:
npm run setup:android
npm run build:android
npm run native:ios
```

Temporary application ID: `com.dareflip.app`. iPhone and iPad device families are included. Android targets SDK 36/min SDK 24. iOS requires macOS/Xcode; Android requires a full JDK 21 and Android SDK 36 toolchain. A debug APK has been compiled in this Linux environment; see the status report for its exact scope. The icon artwork is original SVG; `npm run assets` creates web/master PNG assets. `npx capacitor-assets generate --ios --android --assetPath assets` generates native icons and splash assets from them.

Read [native build instructions](docs/NATIVE_BUILDS.md) and [AdMob configuration](docs/ADMOB.md). Official Google **sample application IDs** are intentionally present in native manifests for development. Vite DEV always uses Google test ad units; `VITE_ADMOB_TESTING=true` allows test inventory in a packaged development build. Production ad units are blank by default; see `.env.example`. Never ship test flags/sample IDs as a real monetized release. No developer identities, signing credentials or live ad IDs are fabricated.

Ads never start on opening the app. Explicit privacy action, UMP SDK permission and a supported native platform are prerequisites. Requests are nonpersonalized; tracking permission is not requested by the current UI. Sensitive gameplay and saved sensitive cards exclude advertising. Banners reserve the measured native height; interstitials require more than five cards, at least 120 seconds, and an active explicit pause. Rewarded pack unlock requires a genuine reward. The free core remains playable when ads fail or are declined.

## Publication handoff

- [Privacy Policy draft](docs/PRIVACY_POLICY.md)
- [Terms of Use draft](docs/TERMS_OF_USE.md)
- [Support configuration](docs/SUPPORT.md)
- [English store metadata and copy](docs/STORE_METADATA.md)
- [Release and implementation status](DEVELOPMENT_STATUS.md)

Publisher identity, actual support contact, hosted legal URLs, AdMob console consent configuration, signing, completed localization/editorial work and real-device/native SDK verification remain release prerequisites. Documentation deliberately identifies unknown values rather than inventing them.

## TestFlight beta

For an internal iPhone/iPad beta without local Xcode, use [the Codemagic → TestFlight workflow](docs/CODEMAGIC_TESTFLIGHT.md) in `codemagic.yaml`. It is manually started and uploads without submitting a public store release or external beta review. For an optional local Mac route, run `npm run beta:ios`, then follow [the TestFlight handoff](docs/TESTFLIGHT.md). The preparation command builds with test ad units and syncs iOS; native archiving/upload still requires a Mac/Xcode, an active Apple Developer team and App Store Connect signing/access. See [the static iOS audit](docs/IOS_BETA_AUDIT.md). Internal beta testing does not require completing the 5,000-card roadmap first.
