# Application and Flirty 18+ review — 26 November 2026

## Scope

This review tests the application from the current checkout in Chromium, using phone and tablet viewport/touch profiles. It does not operate the publisher's installed TestFlight build, use Safari/WebKit, compile a signed iOS archive or validate real native advertising SDK behavior.

## Content assessment

Flirty 18+ contains 36 original concepts, each available in English and Turkish: 18 Truths and 18 Dares. Each difficulty contains six Truths and six Dares. All 36 concepts were rewritten in editorial revision 2 and marked sensitive. There is no separate bedroom pack. Afterglow contains Couples and Party cards only.

The revision adds more concrete dating stories and emotional nuance, but it does **not** meet the subsequently clarified goal of a private bedroom game between partners. Most Dares are verbal or imagined. Introductions (`flirty-easy-dare-01-v2`), conversation exercises (`flirty-medium-dare-01-v2`, `flirty-medium-dare-06-v2`) and the limited difficulty escalation in some Bold tasks remain editorial weaknesses. Passing software tests does not establish that this mode fulfills that product goal.

All seven Dares involving another actual player explicitly ask for a willing participant; players can skip every card. No explicit sexual task was added during this testing pass. One Turkish wording improvement remains for `flirty-bold-truth-06-v2`: explicitly identifying the person as someone the player already likes would express reciprocal attraction more naturally. This is an editorial follow-up, not a gameplay failure.

## Findings

An independent live browser check reproduced horizontal overflow on the Turkish Truth/Dare choice screen at 320px after skipping a Flirty Bold card: `.main` had a 339px scroll width inside a 320px viewport. The initial card screen fit, so testing only a rendered question missed the problem. At widths up to 360px, the choices now divide available width and place their icons above the labels. The corrected choice screen measures 320px/320px without hiding content. A dedicated regression covers the returned choice screen.

Additional live checks at 320×740 and 844×390 verified actual Turkish Bold Truth/Dare rendering, age-confirmation rejection, explicit player metadata, reachable Next/Skip/Truth/Dare controls and working vertical scrolling, with no uncaught JavaScript or console errors. Screenshots were inspected locally in `artifacts/editorial-long-cards/flirty-test-*.png`; these temporary captures are not store screenshots.

## Verification results

| Check                                   | Result                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Full browser game suite                 | 75/75 passed across Chromium phone/tablet profiles                                                  |
| Focused Flirty subset                   | 21/21 passed, included in the full suite                                                            |
| Unit tests                              | 71/71 passed                                                                                        |
| Accessibility                           | 11/11 passed; zero definite automated axe violations; manual gradient contrast review still applies |
| Production offline tests                | 2/2 passed                                                                                          |
| Codemagic metadata/signing helper tests | 8/8 passed                                                                                          |
| Lint and TypeScript                     | Passed                                                                                              |
| Production beta web build and iOS sync  | Passed; no signed native archive/upload produced                                                    |

The focused Flirty tests cover all 12 EN/TR × difficulty × Truth/Dare pools, six unique cards in each pool, explicit exhaustion/reset, age acknowledgement, free skips and exact persistence of the current card/favorites/session. A separate regression verifies Turkish choice-screen geometry and reachable controls at 320px. The production build retains the existing nonblocking JavaScript chunk-size warning.

## Limits

The content catalog still has 192 active concepts across all modes; the 5,000-concept target and 18 additional card languages remain unfinished. Current English/Turkish cards are complete. Existing saved cards and favorites keep their original trusted edition.

Native iPhone keyboard zoom, pinch recovery, hardware feedback, VoiceOver and UMP/ATT/real ad fill need checks on the newly built native app. Source publication does not update an already installed TestFlight build. Release preflight remains intentionally blocked by the previously documented publisher/content/release configuration gaps.
