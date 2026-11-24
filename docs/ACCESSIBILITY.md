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
