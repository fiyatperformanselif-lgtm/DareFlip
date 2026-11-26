# App Store release assessment — 26 November 2026

Assessed application source: `6042750f23a4d58d2c37455edc91c996627da27b`.

This is the assessment snapshot for that beta artifact. Later technical preparation adds explicit store profiles and configurable legal/support pages; see [RELEASE_SETUP.md](RELEASE_SETUP.md). No production profile, publisher identity or final content decision is implied by adding that infrastructure.

Subsequent preparation update: the publisher supplied the public contact/pages and all four real iOS AdMob IDs. Their existing request already authorizes preserving the supplied deck and preparing a candidate for manual Apple review. The former pending publisher-choice gate was an inference in this audit, not a missing permission or an Apple requirement. The unchanged active/archived inventory now has a completed hash-bound assessment with a prominent serious-1.1.4-risk note. This permits technical candidate preparation while preserving the risk disclosure; it does not certify suitability, approve public release or change Apple's role. [App Review notes](APP_REVIEW_NOTES.md) disclose the mode's actual purpose. The original snapshot and its findings below remain historical evidence for `6042750`.

**Snapshot decision: hold public submission. Current scope: prepare the publisher-authorized candidate for manual review, with the serious content risk explicitly disclosed.** Passing software tests and producing a signed beta IPA do not establish App Store readiness. No App Store submission, Apple approval or public release was performed during this assessment. The active card texts were not changed.

## Evidence and its limits

The user supplied a Codemagic screenshot for run index 11 on `main`, commit `6042750`. It shows a finished run, successful archive/export and Publishing steps, and an `App.ipa` artifact reported as 3.66 MB. This is evidence of a successful cloud signing/archive workflow. It does not reveal the actual `CFBundleVersion`, prove Apple processing has finished, establish App Review approval or show an application running on an iPhone. The run index is not the app build number.

This Linux environment has no callable App Store Connect or Codemagic account connector, no physical iPhone and no iOS runtime. The authenticated IPA, Apple processing state, live store metadata and installed TestFlight build were not directly inspected. No signing key or Apple password is needed in chat.

The following checks were rerun against application source `6042750` for this assessment:

| Check                        | Result                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| TypeScript and lint          | Passed                                                                                                        |
| Unit tests                   | 83/83 passed                                                                                                  |
| Browser game suite           | 96/96 passed; 32 cases each at Chromium iPhone, Android and iPad viewport/touch profiles                      |
| Accessibility                | 15/15 passed; no definite automated axe violations, with manual contrast/native accessibility limits retained |
| Production web build         | Passed; nonblocking JavaScript chunk-size warning remains                                                     |
| Production offline tests     | 2/2 passed                                                                                                    |
| Codemagic metadata helpers   | 8/8 passed                                                                                                    |
| Repository release preflight | Blocked with 14 findings; see the scope distinction below                                                     |

No runtime code, card text, signing configuration or submission flag was changed during this audit. The generated browser screenshot changes were restored. A documentation-only audit commit does not require rebuilding the existing beta for identical application behavior.

## Publication blockers and decisions

| Finding                                                                | Evidence                                                                                                                                                                                                          | Required resolution                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current artifact is a test-ad beta                                     | `codemagic.yaml` sets `VITE_ADMOB_TESTING=true` and calls `beta:ios`; `scripts/prepare-ios-beta.mjs` forces test inventory independently of the YAML value; native manifests retain Google sample application IDs | Prepare a deliberate store build with publisher-owned configuration, or implement and verify an intentional ad-free release. Changing only the YAML flag is insufficient.                                                             |
| Publisher/privacy/support information is incomplete in the shipped app | Privacy Policy and Terms contain `[REQUIRED BEFORE PUBLICATION]`; Support says the publisher contact is not configured                                                                                            | Supply the real publisher/contact information, finalize the policies and configure working public privacy/support URLs.                                                                                                               |
| Current private deck has a serious sexual-content policy risk          | Active Flirty-v3 tasks and their stated purpose include erotic stimulation, especially `flirty-v3-medium-dare-02/03/05` and `flirty-v3-bold-dare-06`                                                              | Make an explicit public-release content decision before claiming suitability. Adult/private targeting and an age acknowledgement do not establish compliance. Do not conceal the deck or provide a different experience to reviewers. |
| Metadata and native evidence remain draft                              | `docs/STORE_METADATA.md` describes Flirty as generic sparks and says 2–20 players globally; existing screenshots are Chromium references                                                                          | Accurately disclose the two-partner private mode, complete age/privacy answers and use captures from the actual release build. Verify the live App Store Connect record.                                                              |
| Physical iOS behavior has not been tested here                         | Browser and mocked-service evidence only                                                                                                                                                                          | Complete the device checks below using the candidate's actual TestFlight build.                                                                                                                                                       |

The current workflow deliberately has `submit_to_testflight: false` and `submit_to_app_store: false`. Those flags retain manual review/distribution control; they are not an Apple rejection. A green Publishing step is not a public release.

## Apple content-policy assessment

Apple's [App Review Guidelines, section 1.1.4](https://developer.apple.com/app-store/review/guidelines/#objectionable-content) have prohibited overtly sexual or pornographic material, including descriptions of sexual activities intended to stimulate erotic feelings. That is prior-known policy wording: fetching the current official page during this audit failed at the environment's proxy with HTTP CONNECT 403, before reaching Apple. No live-page verification or Apple review decision is claimed.

The current deck's actions and framing warrant a serious publication hold under that rule. Ordinary romance or kissing is not automatically prohibited; contextual and borderline decisions belong to Apple. The two named confirmations, unconditional skip, private targeting and absence of ads alongside private cards are useful game safeguards but do not create a policy exception. An 18+ rating is not permission for every category of adult content.

App metadata and review notes should describe what the actual candidate contains. Do not relabel it as an ordinary group icebreaker or omit private functionality from review information. The App Review Guidelines' accurate-metadata provisions, including sections 2.3 and 2.3.6, are relevant to that disclosure. This assessment is not a prediction of a guaranteed rejection.

## Release preflight interpretation

`npm run check:release` exits 1 with 14 configuration/content findings on this checkout. It is a repository guard, not Apple's eligibility test. Its findings include Android settings that do not block an iOS-only release, and roadmap checks for 5,000 originals and all 20 card languages. Apple does not impose those numerical targets. A truthful English/Turkish release with the actual card count can be considered without claiming unfinished features; the concrete release and content issues above still remain.

The inspection also confirmed a shared App scheme, iOS 15 deployment target, iPhone/iPad device families, an opaque 1024×1024 icon and a registered privacy manifest. These are positive configuration checks, not a replacement for device execution or SDK privacy verification.

## Required device evidence

Record the actual TestFlight version/build, device model and OS version, then check:

1. Cold launch, navigation, player-name keyboard focus/dismissal and pinch recovery on iPhone; no unrecoverable zoom or obscured controls.
2. Exactly two partners and two independent fresh acknowledgements in private mode; one acknowledgement cannot start play. Every card remains skippable.
3. Truth/Dare selection, turn changes, complete-deck exhaustion/reset, favorites, pause and exact resume after force-quitting the app.
4. Offline cold launch and resumed play; English/Turkish switching and visibly disclosed fallback for other languages.
5. Portrait/landscape and iPad layouts, safe areas, VoiceOver, reduced motion, native share sheet, sound and haptic preferences.
6. On a test-ad build, no ad requests before permission, correct UMP/privacy choices and no private-context ads. Verify native SDK/network behavior; web and mocks cannot establish it.

Complete the real App Store privacy/age/export-compliance questions, release screenshots, support and privacy URLs in the publisher account. No answers were fabricated or submitted here.
