# Native store screenshots through Codemagic

The dedicated manual screenshot workflow runs Xcode on Codemagic's macOS machine. It needs no local Mac, signing identity, App Store Connect API key or Apple login. It builds and launches the actual Capacitor iOS app in Apple's Simulator; it does not turn browser captures into native screenshots or upload anything to Apple.

Root-level invocation, after dependencies and the test-inventory iOS payload have been prepared:

```sh
npm ci
npm run beta:ios
python3 scripts/codemagic-screenshots-tests.py
python3 scripts/codemagic-screenshots.py \
  --project ios/App/App.xcodeproj \
  --scheme App \
  --bundle-id com.dareflip.app \
  --output artifacts/store-native
```

Use the screenshot workflow only for capture. The existing `ios-app-store` workflow remains the separate production-ad, signed candidate upload. Screenshots use test advertising inventory, and this fresh home screen does not enable/request ads. Do not copy its test configuration into a store candidate.

## Exact models and files

The helper reads `simctl list devicetypes --json` and `simctl list runtimes --json`. It requires the exact device types below and chooses the newest installed, available iOS runtime compatible with both. Identifiers are discovered from that machine, not guessed. If Xcode lists 8GB/16GB RAM variants of the same M4 13-inch model, it deterministically prefers the 8GB profile and records its actual identifier. It does not silently substitute another phone/tablet or resize a different image.

| Apple Simulator model | Portrait pixels | Recommended upload |
| --- | --- | --- |
| iPhone 16 Pro | 1206 × 2622 | `upload/iphone-16-pro-home.jpg` |
| iPad Pro 13-inch (M4) | 2064 × 2752 | `upload/ipad-pro-13-m4-home.jpg` |

`raw/` contains direct PNG captures for provenance. Simulator PNGs can contain an alpha channel even when they appear opaque; 8-bit and 16-bit RGB/RGBA raw captures are accepted and their actual format recorded. The helper therefore also asks Simulator to capture JPEG directly, validates the JPEG's exact dimensions and three color components, and recommends those opaque JPEGs for upload. No rescaling, browser rendering, decorative device frames or image conversion is performed. The raw PNGs are retained without alpha removal.

`manifest.json` records the full raw Git commit, tracked working-tree changes, Xcode version, actual discovered device/runtime identifiers, unsigned app version/build, expected and measured dimensions, image hashes, per-device capture/failure status and cleanup warnings. `README.md` explains how to review the result. `capture.log` contains the native command output. A failed run records failure rather than pretending captures exist; one successful capture does not claim the other succeeded.

## What the helper does

It builds the shared `App` scheme with `-sdk iphonesimulator`, `-configuration Debug`, `-destination 'generic/platform=iOS Simulator'` and `CODE_SIGNING_ALLOWED=NO`. Its DerivedData/products live in a temporary directory. It checks the built app's actual bundle identifier before installation.

For each model it creates its own new Simulator, boots it, waits for `bootstatus`, optionally sets the status bar to 9:41 / full battery, installs and launches DareFlip with English language preferences, waits five seconds for launch/splash completion, and captures native PNG/JPEG files. It then shuts down and deletes only the UUID it created. It never erases, shuts down or deletes `all` Simulators, and never opens another existing app or device state. Temporary build products are removed after the run. Existing capture results are not overwritten; use a fresh output directory when repeating locally.

If Xcode, either exact model, a compatible installed iOS runtime, native launch or image validation is unavailable, the workflow fails with a reason. Select a Codemagic Xcode image containing those models/runtime and rerun; the helper provides no simulated-success or browser fallback.

## Review and App Store Connect

Download the screenshot artifact/ZIP from the manual Codemagic run. Open **both** JPEGs and confirm the genuine DareFlip home screen is visible, with no startup screen, dialog, blank view or rendering error. The manifest deliberately leaves visual review pending: successful installation/launch/capture and valid dimensions do not automatically prove a correct home-screen rendering.

These captures are from an unsigned Debug Simulator app with the current source payload. They are not captures from the signed TestFlight IPA and do not prove physical-device behavior or exact binary equivalence. Compare their visible UI with the submitted candidate. The manifest's Debug build number must not be substituted for the TestFlight build number.

Upload the JPEGs into the matching iPhone/iPad screenshot slots in App Store Connect. Check the dimensions accepted by the **actual slot**: these exact-model captures are not a promise that every differently named display-size slot accepts them. If Apple requests a different exact resolution, capture the appropriate supported model in a deliberate workflow update; do not stretch these files or relabel a different device's screenshot. No App Review submission, account metadata change or publication occurs in this workflow.

## Validation boundary

`python3 scripts/codemagic-screenshots-tests.py` runs on Linux with explicit fake command runners and fixture image headers/pixels. It covers JSON discovery/compatibility, unsigned command construction, dimensions/color validation, provenance, truthful failure records, wrong-bundle rejection and cleanup limited to owned devices. Those tests do not execute Xcode or produce authentic Simulator screenshots. The first real macOS Codemagic run and its downloaded images remain to be verified by the publisher.
