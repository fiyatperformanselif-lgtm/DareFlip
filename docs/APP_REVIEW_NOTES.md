# App Review notes draft

These notes describe the current bundled content and selected iOS advertising configuration. They are prepared for the publisher to review and enter into App Store Connect; this agent has not submitted them or received Apple approval. The exact native version/build and device results must be supplied from the signed candidate.

## Reviewer access

No sign-in, account, backend or special reviewer access is required. Core gameplay works offline after installation. Settings contains language, privacy, terms, support and advertising preferences. English and Turkish card editions are complete; other listed languages can have disclosed English fallback. The app does not claim 5,000 completed cards.

## Private adult partner mode

The Flirty 18+ mode is intended for private intimate sexual play between exactly two consenting adult partners. Its bundled deck includes sexual prompts and descriptions of sexual activities. Please assess this mode directly under the applicable content rules; these notes do not certify suitability under Guideline 1.1.4.

To inspect it, select Flirty 18+, enter two fictitious player names, make each player's gender choice (including the option not to disclose), and complete both separate age/participation confirmations. Choose a difficulty, begin the session and select Truth or Dare. Cards can always be skipped without a penalty, and play can be stopped at any time. The confirmations and skip control are gameplay safeguards, not a claimed content-policy exception.

Random mode excludes private Flirty cards. Favorites and existing saves can retain earlier bundled card editions. There is no reviewer-specific behavior, hidden unlock after approval, remote content switch or special access code. The publisher requested preserving this deck for review rather than disguising it as a generic group icebreaker. The active catalog and both archives are included in the hash-bound technical assessment.

## Advertising

The store candidate is configured with the publisher's real iOS AdMob app and Banner/Interstitial/Rewarded unit IDs. Advertising is optional and requires the user to open the advertising preference flow; the app gates SDK initialization and ad requests on UMP `canRequestAds`. ATT is optional and is not triggered by the current interface. The app requests nonpersonalized ads.

Banners are limited to eligible nonsensitive menus. Interstitials appear only at eligible natural breaks after the first five cards, with a minimum 120-second interval. Ads are excluded from private/sensitive contexts. Optional rewarded ads unlock bonus content only after an earned-reward callback; dismissal does not earn a reward. Unavailable ads never prevent core play or skipping.

The publisher's AdMob screenshot shows that application review is still required and the public store listing has not yet been linked. Actual ad delivery, account approval and regional consent-message configuration have not been independently verified here. Google review and Apple review are separate processes.

## Publisher contact

- Publisher: IzarGames
- Support: info@izargames.com
- Privacy: https://dareflip.izargames.com/dareflip/privacy.html
- Support page: https://dareflip.izargames.com/dareflip/support.html

Before submission, the publisher must enter the candidate's actual version/build, truthful age/privacy/export answers and screenshots captured from the native release candidate. Public availability remains conditional on the publisher's submission and Apple's decision.
