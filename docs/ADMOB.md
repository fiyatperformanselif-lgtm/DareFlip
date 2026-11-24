# AdMob, UMP, GDPR, and ATT

Implementation: `src/services/ads.ts`, `@capacitor-community/admob` 8.4.2 with Capacitor 8. No backend or account credentials are needed for gameplay. All account setup below belongs to the publisher; do not invent IDs.

## Consent contract

Nothing calls AdMob at startup. A user explicitly opens the advertising flow. `enableAds()` calls UMP `requestConsentInfo`, shows a required available consent form, requests fresh consent information, and proceeds only when `canRequestAds` is true. Google Mobile Ads `initialize` and every banner/interstitial/reward request are gated behind that result. Errors leave ads unavailable and play continues. Web performs no native consent or advertising calls.

ATT is a separate opt-in. The app explains the purpose first; only `enableAds({attOptIn:true})` can ask for the iOS system permission. Denial is allowed. Ad requests use `npa:true` regardless of ATT; nonpersonalized ads still require the appropriate UMP permission.

Settings can disable ads locally and open Google's privacy options. After privacy options, ads stay disabled until explicitly enabled again. Local disable is not deletion of Google's existing consent records. Recheck consent each app session through the explicit flow. Do not persist a homegrown boolean as proof of legal consent.

Configure and publish the applicable GDPR/European regulations and US state privacy messages in the AdMob Privacy & messaging console. A form is not available merely because the SDK is installed. Verify regional behavior and consent withdrawal on real devices before release. Google UMP is not a substitute for legal assessment.

## Placement policy

- Banners: nonsensitive menus only; never overlay the game controls. `onBannerSize` reports actual SDK height from `getBannerSize` and SizeChanged events, so the UI can reserve space. Test safe-area/rotation behavior on devices.
- Interstitials: natural game breaks only, after the first five played cards, with at least 120 seconds since enabling ads or the last show attempt. No ad appears on a card selection or answer tap. No sensitive or Flirty placement. The current UI conservatively excludes Random gameplay and any favorites view containing a sensitive card too. After loading, the service rechecks that the pause break is still open; resuming cancels the pending show.
- Rewarded: an explicit optional request; only an SDK-earned reward resolves `true` and unlocks the bonus. Dismissal, network failures, absent consent, or web never earns a reward.
- No fake ads, fake clicks, click incentives, mandatory rewarded viewing, or payment promises. Core offline play and card skipping remain available.

## Test configuration

Vite development always uses Google's official sample unit IDs declared in `TEST_AD_UNITS` and `isTesting:true`, even if live IDs are configured. For a native test build using a normal `npm run build`, copy `.env.example` to `.env.local` with `VITE_ADMOB_TESTING=true`; this explicitly selects only official sample inventory. The flag also works in Vite production bundles and must be **false for store release**. Without the test flag, production builds use blank IDs unless the publisher provides the six `VITE_ADMOB_*` variables in `.env.local`; blank or malformed IDs keep ads unavailable. No real IDs are committed.

Native Google Mobile Ads requires a platform app ID (`~`, not a unit ID `/`) even when ads are off. Generated native projects use the official Google sample app IDs for development only. Replace these before release:

- Android sample app ID: `ca-app-pub-3940256099942544~3347511713`.
- iOS sample app ID: `ca-app-pub-3940256099942544~1458002511`.

Configure `GADApplicationIdentifier` in iOS Info.plist, and `com.google.android.gms.ads.APPLICATION_ID` in Android AndroidManifest.xml via a resource/build configuration. Set iOS `GADDelayAppMeasurementInit` to `YES` and Android `com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT` to `true`. Retain measurement delay and consent gating. Set a truthful `NSUserTrackingUsageDescription`; omit/request no tracking behavior if you do not need ATT. Never embed OAuth credentials, service-account keys, or passwords.

## Production release checklist

1. Create the AdMob app entries and platform ad units; confirm the account is approved. Supply the app IDs and unit IDs using release configuration. Web Vite variables are public configuration, never secrets.
2. Set `VITE_ADMOB_TESTING=false`. Remove sample app IDs from release targets. Keep sample unit IDs in test/development builds only. Register test devices when testing production configurations, then remove debug overrides from release.
3. Publish and verify consent messages for all target regions. Exercise accept, reject, unavailable/offline, previously saved choices, withdrawal, and ATT accept/deny.
4. Test no ad requests before permission using native SDK logs/network inspection. Test banner space on phone/tablet, and cooldown/reward events on physical devices. Unit tests do not establish SDK/legal compliance.
5. Complete App Store privacy labels, tracking disclosures, Google Play Data safety, ads declaration, target-audience and age-rating questionnaires from the actual SDK versions and configurations. Review SKAdNetwork IDs using Google's current official list rather than copying an outdated list.
6. Host privacy/support pages and any required app-ads.txt on publisher-controlled domains and configure URLs in stores and AdMob.

Official references: [Capacitor plugin](https://github.com/capacitor-community/admob), [Android UMP](https://developers.google.com/admob/android/privacy), [iOS UMP](https://developers.google.com/admob/ios/privacy), [test ads](https://developers.google.com/admob/android/test-ads), [Apple ATT](https://developer.apple.com/documentation/apptrackingtransparency).
