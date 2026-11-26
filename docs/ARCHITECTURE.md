# DareFlip architecture and release boundaries

DareFlip is a local-first social game. React renders a single application state, a pure domain layer selects content and players, JSON contains the editorial catalog, and isolated services integrate native capabilities. No backend, login, cloud save, analytics pipeline, or network content download is required for core gameplay.

## Module boundaries

| Location | Responsibility |
| --- | --- |
| `src/App.tsx`, `src/styles.css` | Mode selection, setup, bottle animation, Truth/Dare choice, reveal, skip/next, favorites, daily card, packs, settings, overlays, responsive styling |
| `src/state.ts` | Versioned application/session shape, initial values, validation of persisted state |
| `src/domain/engine.ts` | Eligible-card filtering, no-repeat draw, explicit pool exhaustion, player selection, deterministic daily question |
| `src/domain/storage.ts` | Defensive JSON envelope, version check, shape-validation hook, quota/unavailable/corrupt-data recovery |
| `src/domain/types.ts` | Card, mode, category, difficulty, kind, pack, and draw contracts |
| `src/content/cards.json`, `src/content/index.ts` | Offline content, canonical IDs, translation fallback, real catalog statistics |
| `src/i18n` | Device-locale normalization, 20 selectable locales, interface dictionaries, RTL metadata, translation completeness and fallback |
| `src/services/ads.ts` | Explicit opt-in, UMP/optional ATT, native SDK gate, placement limits, measured banner sizes, confirmed reward |
| `src/services/feedback.ts` | Optional native haptics and locally synthesized short sounds |
| `src/services/share.ts` | On-device PNG generation, native share sheet, browser file share/download, temporary native cache cleanup |
| `capacitor.config.ts`, `ios`, `android` | Native packaging of the built offline `dist` payload |
| `docs` | Legal drafts, publisher handoff, release configuration and honest limitations |

UI transitions stay in React. Game selection rules live in pure functions so tests can exercise actual eligibility, exhaustion, repeat avoidance, and deterministic behavior without a browser. Native methods remain behind small services and are not required in a web runtime.

## Game and persistence flow

1. Detect a supported device language or load a valid saved choice. Set document direction from language metadata.
2. Select a mode, collect 2–20 unique player names and an explicit gender option for each, choose a difficulty, and require adult confirmation for Flirty/Random.
3. Create a session with selected mode/difficulty, player roster, previous player, seen concept IDs, current card, and played-card count.
4. Randomly choose the next eligible player, excluding the previous player when possible. Choose Truth or Dare.
5. Filter canonical English concepts by category, difficulty, kind, and unlocked pack, then resolve a matching translation where available. Filter out seen IDs and draw uniformly from the remaining pool.
6. Persist each state change locally. Favorites reference stable concept IDs. If the pool is exhausted, show that state and let the user explicitly restart the deck; never silently repeat.
7. Skipping uses the same next-turn flow without penalties, lost points, coercion, or advertising obligations.

The daily question hashes the UTC calendar date to one canonical nonsensitive core Truth card, then resolves the selected locale where available. This gives the same concept worldwide for a date and requires no server.

Session gender choices align with the ordered player roster and use `female`, `male`, `nonbinary`, or `undisclosed`. Explicit preference not to disclose is a valid choice; `null` only marks an unanswered legacy value. New sessions require complete choices. `loadAppState` migrates legacy v1 saves that lack the field, preserving the original card, seen IDs, player, favorites and preferences; resume asks for the missing choices before returning to that same game. Names are never used to infer gender. The choices are stored locally and displayed with the current player; card and player selection stay gender-neutral.

Storage uses a `dareflip:v1` key and a versioned JSON envelope. Corrupt data and storage exceptions fall back to a valid initial state. Persistence is device-local, subject to platform/browser clearing and OS backup behavior. It is not an encrypted vault; do not store sensitive answers or credentials. Answers are not collected.

## Content contract and scaling to 5,000

Every card has `id`, `category`, `difficulty`, `type`, `language`, `text`, `pack`, and `sensitive`. Translations intentionally share their concept ID. The unique record key is `(id, language)`. Editorial revision 2 uses new `-v2` IDs; `persistedCards` combines current and immutable archived cards for strict save validation, and `lookupCard` keeps favorites on their own revision. Only the active `cards` collection feeds new draws and daily questions. Repeat prevention uses the concept ID, so changing language does not reset the seen history.

The current catalog is a curated seed, not 5,000 completed originals. Consult `contentStats` and `DEVELOPMENT_STATUS.md` for the actual count. Additional JSON can be split into editorial packs without changing the draw contract. For a substantially larger catalog, preindex records by ID/locale and eligibility bucket to replace repeated linear lookup; benchmark before changing behavior. Do not increase counts with templates, word swaps, duplicated concepts, or unreviewed machine translation.

Editorial additions must receive stable IDs, intentional difficulty/category/pack/sensitivity labels, safety review, duplicate-concept review, and native-speaker/cultural review per language. Automated integrity checks verify structural uniqueness and required fields; they cannot prove naturalness, cultural appropriateness, or semantic originality.

## Localization contract

Twenty languages are selectable. English and Turkish have complete keyed interface dictionaries; other dictionaries intentionally contain only a subset of UI strings. Every active revision-2 card has English and Turkish text. Other card languages visibly fall back to English; archived historical favorites can also lack a Turkish translation. Legal drafts remain English and are labeled accordingly. A selected locale, an RTL layout, or matching dictionary keys do not establish full editorial localization. Settings and per-card notices disclose missing content. Missing translations remain marked incomplete. Availability flags describe existing text, not native-speaker certification or release approval.

## Native advertising boundary

No ad SDK call is issued simply by opening the app. An explicit user action starts UMP. Only a fresh `canRequestAds` result permits Google Mobile Ads initialization and requests. ATT is a distinct optional path; the present UI does not request tracking. Requests ask for nonpersonalized ads. Declining/failed consent, missing IDs, absent inventory, web, and offline errors leave the game playable.

Banners are requested only on nonsensitive menus and publish their actual native height for layout. Interstitials require more than five played cards, 120 seconds, a real pause break, and nonsensitive context; the break is checked again after loading. The UI additionally excludes Random gameplay conservatively. A bonus unlock requires an earned SDK reward; dismissal or revoked permission never unlocks it. Services do not persist user consent as an application boolean.

Vite development always uses official Google test units. Native test builds may explicitly set `VITE_ADMOB_TESTING=true`. Store release must set false, replace sample native application IDs, supply real public ad-unit configuration, publish consent messages, and pass physical-device/network inspection. The presence of wrappers and unit tests is not proof of GDPR, ATT, SDK, or store compliance.

## Release gap matrix

| Area | Implemented development capability | Evidence still required before publication |
| --- | --- | --- |
| Gameplay | Offline stateful game, selection, skip, favorites, resume, daily card, packs | Native device/regression/accessibility sessions; broader editorial playtesting |
| Content | JSON schema, stable IDs, curated seed, structural checks | Reach the 5,000-original target with semantic uniqueness and safety review |
| Languages | 20 selectors, detection, RTL metadata, partial fallback disclosure | Complete and culturally review missing UI, card, legal, and marketing translations |
| Native packaging | Capacitor configuration, generated projects, and a successful Android debug APK build | Final synced Android artifact, macOS/Xcode build, real phone/tablet tests, signing |
| Advertising | Test-ID configuration, pure and mocked gate tests, SDK wrappers | Account IDs/messages, UMP/ATT regional testing, packet/log inspection, safe banner placement |
| Sharing/haptics/audio | Local PNG/share fallback, optional feedback | Native share-target behavior, silent-mode/haptic accessibility/device validation |
| Privacy/legal | In-app draft policies and local reset controls | Publisher identity/contact, legal review, hosted public URLs, store disclosures |
| Store assets | Original design/icon source and development screenshots | Native release captures at required current store sizes and final art review |
| Distribution | Repeatable commands/documentation | Developer accounts, signing keys outside repo, internal testing, store review |

`README.md` and `DEVELOPMENT_STATUS.md` provide the final command results for this particular implementation session. Do not turn a planned or untested item in this document into a readiness claim.
