# Browser end-to-end checks

From `/workspace/DareFlip`, run `npm run test:e2e`. The Playwright configuration starts and owns a dedicated Vite test server on port 5177. It never reuses or stops the normal development server on port 5173; leave 5177 free while running the suite. It uses `/usr/bin/chromium` when available; otherwise install Playwright Chromium with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a compatible installed binary.

Projects emulate iPhone (390×844 at 3×), Android phone (412×915 at 2.625×), and iPad (1024×1366 at 2×). These are Chromium viewport/touch checks, not physical devices, Safari, native builds, or AdMob/UMP certification.

The suite covers gameplay, all six modes, all three difficulties, player limits, explicit adult-mode acknowledgement, bottle selection, no-repeat exhaustion and reset, optional skips, favorites, saved-session reload, legal screens, preferences, local reset, Arabic RTL, incomplete-translation disclosure, unavailable ads/rewards on web, offline operation after load, and actual exported PNG signature/dimensions.

`flirty.spec.ts` separately exercises Flirty 18+ in English and Turkish at each difficulty, including both Truth and Dare pools, actual rendered card metadata, exhaustion/reset, skips and persisted play. It also covers the Turkish choice screen at 320px after skipping a card, where long localized button labels previously caused horizontal overflow. Content suitability for the intended audience remains an editorial/playtesting question; passing these checks does not establish that the mode fulfills a bedroom-game brief.

`screenshots.spec.ts` writes five authentic viewport captures per project to `artifacts/screenshots/<project>/`: discovery, player setup, bottle, truth card, and saved cards. These are release design references. Store submission screenshots still need capture/verification using the target native release builds and current store size requirements. Generate them again with `npx playwright test screenshots.spec.ts` after visible UI changes. HTML reports and failure traces are temporary artifacts under `artifacts/playwright*`.
