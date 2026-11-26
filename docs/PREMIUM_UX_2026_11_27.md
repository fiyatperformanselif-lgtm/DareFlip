# DareFlip premium UX update — 27 November 2026

This update implements the publisher's requested animation, share-image and layout work, including the six findings in [the product review](QA_REVIEW_2026_11_27.md). Card questions/tasks and compatibility archives are unchanged. It is an implementation and browser assessment, not a benchmark proving superiority over competing games.

## Resulting behavior

| Previous finding | Implemented behavior |
| --- | --- |
| QA-01: invisible next-turn spin | A continuously mounted bottle stage appears while leaving a card. One sampled player drives both the final angle and turn result. Normal motion uses a 1.04-second eased rotation; reduced motion settles without the artificial wait. The old saved card remains intact until settlement. |
| QA-02: toast over Next | In-game status appears near the top, clear of the main controls, and dismisses after 2.8 seconds. |
| QA-03: broken share typography | Offline 1080×1350 layered artwork with localized EN/TR metadata, measured word-first wrapping, grapheme-safe long-token handling, explicit line breaks and RTL text. Player names, genders and answers never enter the image. |
| QA-04: landscape controls outside view | The game uses a viewport-fitted grid, with a split player/card layout on wide or short screens. Only a long prompt scrolls; a visible reading hint clears at the bottom. Safe-area insets and 44px control targets are retained. |
| QA-05: English fallback inherits Arabic | Dictionary resolution returns the actual language/direction. English fallback guidance and errors use English/LTR; player names are isolated with `bdi`. Arabic labels remain Arabic/RTL. |
| QA-06: exhaustion has no difficulty action | Show the depleted type and remaining opposite-type count; offer difficulty selection directly and in Pause. Preserve roster, acknowledgements, rounds and seen IDs. Explicit reset clears only the current mode/difficulty pool. |

Card depth, contrast, spacing and motion are shared across phone and tablet layouts. Long text remains readable instead of being truncated. The private two-partner entry rules and unconditional free skip remain active.

## State and lifecycle

Rapid activations cannot queue multiple draws or turn selections. A generation token and source-session identity guard prevent an old timer from altering a replacement session. Pause, navigation, backgrounding, native back and unmount cancel pending work. Native listeners use stable subscriptions, latest committed callbacks and cleanup even if registration finishes late. Focus moves to the resulting prompt after its reveal and stays within open dialogs.

The share image uses local canvas vectors/system fonts and needs no external asset request. Native share files have unique temporary paths; cancel, failure and cleanup behavior are tested with bridge mocks. A successful browser PNG does not certify every native destination app.

## Native handoff

The previously reported **0.1.0 (3)**, signed from `3748094`, does **not** contain this update. Keep marketing version `0.1.0`; the existing manual Codemagic workflow must allocate the next real build number from App Store Connect. No hardcoded build number, signing identity, advertising configuration or submission flag was changed. Use the fresh build for installation and store screenshots.

On physical iPhone/iPad and Android, verify the new build's card/bottle motion, short landscape layout, keyboard/safe areas, interrupted spin/resume, native sharing, sound/haptics and accessibility. Existing consent/ad-account and Apple review limitations remain as previously documented; this UI work does not establish their completion.

## Design references

These are Chromium development captures with fictional player names, not native store screenshots:

- [Phone bottle and choice stage](previews/premium-choice.png)
- [Phone card](previews/premium-phone.png)
- [Landscape tablet card](previews/premium-tablet.png)
- [Turkish share PNG](previews/premium-share-tr.png)

## Final verification

The table records final runs after source changes were frozen. Implementation testing caught and corrected a narrow Turkish choice overflow, accessible-name mismatches from decorative bottle text/count badges, and focus being moved away from a dialog's restored trigger. Counts now sit outside the named buttons, bottle lettering is an SVG glyph, and focus changes only when the content destination changes. Early exploratory failures and live-reload runs are not counted as successful final verification.

| Check | Result and scope |
| --- | --- |
| TypeScript / ESLint / changed-source formatting | Passed |
| Unit tests | 138/138, 13 files; game/state/services plus text layout, translation metadata and native lifecycle cleanup |
| Game browser suite | 141/141, 5.0 minutes, Chromium iPhone/Android/iPad profiles; includes 27 normal-motion lifecycle cases, 12 responsive layout cases and 6 share-image cases |
| Accessibility | 15/15; no definite axe violations, modal focus restored, keyboard/touch targets and private setup covered; contrast still has manual/incomplete axe results |
| Store/publisher UI | 12/12; separate ad-free/publisher fixtures |
| Production offline | 2/2 after the final build; offline reload/resume and storage-denied play |
| Release/site tests | 30/30 Node checks |
| Native-profile fixtures | 8/8 in isolated temporary projects; not signed device execution |
| Codemagic helpers | 9/9, including shell syntax for every YAML script |
| Production build / native sync | Passed Vite build, iOS sync and Android sync; five expected plugins on both platforms |
| iOS production source preflight | Passed using the existing manual workflow's public configuration; existing roadmap/content-risk notes remain visible |
| Content/configuration preservation | Active cards, both archives, dependencies, ad configuration, native tracked projects and publication flags unchanged |

Manual Chromium checks covered EN/TR/Arabic and seven portrait/landscape sizes, including the exact Turkish private/Bold 320×568 skip regression. The 568×320 Arabic/20-player/simulated-60px-reservation case retains a 43px text viewport, 44px controls, no main-page overflow and a compact scroll cue that clears at the bottom. The native banner reservation is a geometry simulation, not an advertising request. Share checks cover all 738 active/archived localized prompts plus multilingual stress text and decoded offline PNGs; spoofed personal fields produce identical pixels.

The bundle retains the known nonblocking chunk warning: main JavaScript approximately 576.3 KB minified / 164.5 KB gzip. EN/TR UI keys are complete at 190 each; the other 18 dictionaries remain partial at 50 each, with disclosed fallback. The catalog remains 192 concepts / 384 active EN/TR rows. No new editorial, localization-completeness or native-performance claim is made.

Test-generated tracked screenshot files were restored to their initial bytes. The separate design references above document this update. Owned test servers were stopped. Physical device frame rate, VoiceOver/TalkBack, native share destinations, sound/haptics and real ad/consent behavior require the fresh signed build; no new IPA/APK, App Store submission or Apple approval was produced here.
