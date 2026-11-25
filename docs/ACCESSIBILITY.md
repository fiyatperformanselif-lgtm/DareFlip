# Accessibility verification

## Scope and reproducibility

Browser checks were run on 2026-11-24 with Chromium 156.0.8078.79, Playwright, and axe-core 4.14.1. The main audit viewport was 390×844 CSS pixels, with separate navigation, setup, and settings checks at widths 320, 768, and 1024. The suite uses reduced motion and an English device locale.

```sh
npm ci
# Install a supported Playwright Chromium, or set PLAYWRIGHT_CHROMIUM_EXECUTABLE.
npm run test:a11y
```

The suite owns its Vite server at port 5175 with strict port selection; it does not reuse or stop another development server. Its configuration is `tests/accessibility/playwright.config.ts`. Machine-readable results, including the axe manual-review findings, are written to `artifacts/accessibility-report.json`.

## Verified behavior

Six keyboard, focus, target-size, and responsive tests passed:

- Buttons, player fields, and language selection have accessible names and targets measuring at least 44×44 CSS pixels in the tested flows.
- Opening setup and starting a game moves focus to the new screen heading. Revealing a card moves focus to the prompt.
- Daily, pause, and legal dialogs receive focus; Tab and Shift+Tab stay inside the dialog. The background becomes inert. Escape closes the dialog and restores focus to its trigger.
- Home, setup, and settings remain navigable at 320, 390, 768, and 1024-pixel widths without document-level horizontal overflow.

The axe scan covers eight states: home, daily dialog, player setup, game choice, revealed card, pause dialog, settings, and privacy dialog. It checks the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `wcag22aa` rule groups. The final scan passed with **zero definite automated violations in all eight states**. The six keyboard/viewport tests passed in the preceding run; after the final bottle-label correction, the affected axe test was rerun and passed. All seven checks have therefore been exercised successfully. Contrast remains a manual-review limitation described below.

The audit found and drove corrections for lost focus after screen/card changes, undersized controls, several low-contrast muted text colors, the language button’s visible-code/name mismatch, and the bottle button’s redundant explicit accessible label. Card and policy content now declares its actual language and direction, including English fallback content in an Arabic interface.

## Limits and required manual checks

An automated pass does not establish full WCAG conformance. In particular, axe cannot conclusively measure text contrast against the app’s layered gradients: `color-contrast` findings remain **incomplete/manual review**, not passed. Text colors identified as too dim during the CSS review were brightened, but visual review of every gradient, enabled/disabled state, and localized screen is still required.

Before release, test VoiceOver on iPhone/iPad, TalkBack on Android, Switch Control, external keyboards, OS large text and zoom, motion preferences without emulation, landscape and split-screen use, and real safe areas. Confirm native consent/ATT forms, banner spacing, rewarded/interstitial controls, and the native share sheet with assistive technology. These native behaviors were not validated by the browser suite. Language-specific pronunciation and the remaining partial UI translations also need native-speaker and assistive-technology review.

No native screen-reader compatibility or accessibility certification is claimed.

## iOS focus zoom regression — 25 November 2026

A TestFlight report identified zoom after focusing player-name fields. Controls now have a minimum 16px text size; the native iOS configuration allows pinch zoom/recovery and the page viewport remains scalable. `tests/accessibility/viewport.spec.ts` adds four mobile-context flows at 320×740, 390×844, 844×390 and 768×1024. They check computed control font sizes, form focus/fill/blur, no horizontal document/app/main overflow, reachable game controls, language selection and return navigation. All four passed, as did the six existing keyboard/focus/target/responsive checks. Native iPhone keyboard behavior and pinch recovery must be verified in the newly packaged TestFlight build; desktop Chromium does not reproduce those OS gestures.

## Player gender controls — 25 November 2026

The required per-player gender selectors have associated labels, explicit unanswered-state placeholders, no preselected gender, 16px minimum text, and at least 44px targets. New choices and validation text are translated in all 20 selectable locales. All 11 accessibility tests pass with the controls present, including the four focus/viewport cases and the eight-state axe scan (zero definite automated violations). Physical-device keyboard/picker/VoiceOver/TalkBack behavior remains outside the browser verification scope.
