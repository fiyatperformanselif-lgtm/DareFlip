# Flirty v3 content replacement — 26 November 2026

The complete user-supplied TXT contains all 36 Flirty cards in English and Turkish: 72 records. It replaces only the previous active Flirty deck. The other 312 localized records remain exactly unchanged. The active total remains 192 English and 192 Turkish records; translations and archives do not increase the number of active concept IDs.

All 36 supplied English texts, IDs and metadata are preserved exactly. Twenty-three Turkish texts received spelling, grammar, naturalness or meaning-alignment corrections against their supplied English versions. This includes four previously identified reversals involving the speaker/action or opposite meanings. No missing explicit task was invented; the second upload already supplied the final two cards in both languages. Source checksums, affected IDs and correction reasons are in [the import audit](content-import-v3-audit.json).

The imported set retains its original concepts, including several semantically similar fantasy, role-play and kissing prompts. Structural uniqueness and complete translations do not establish 36 distinct ideas, native-speaker certification or store suitability. These overlaps are documented rather than replaced with newly invented sexual material.

## Game integration

Flirty is a private game for exactly two adult partners. Both names receive separate unchecked acknowledgements for each new game. Changing a draft name resets those choices. The current player's partner is identified on screen; setup explains that first-person wording in a card refers to that other partner. Each activity still requires both participants' current willingness, and either can skip or stop without a penalty.

Private cards are excluded from Random. The domain draw API requires an explicit private-session context for Flirty. Saved current cards and seen-history IDs from the active private deck are accepted only in a two-person acknowledged session with complete player details. UI acknowledgement is local application state; it is not identity verification or proof of real-world consent.

## Existing games and favorites

All 72 earlier Flirty-v2 records are preserved exactly in `src/content/archive-v2-flirty.json`. The original 282-row v1 archive is unchanged. Favorites resolve to their own trusted edition, and old current-card text is never silently replaced.

An old two-person Flirty game asks for the two named acknowledgements, then restores its exact current card, player, history and favorites. An old larger group can view and skip its archived card but cannot draw new private cards. Starting a private game opens a blank two-person roster; no partners are chosen from the group automatically. The old session stays stored until the new game actually starts.

## Verification scope

Integrity checks verify the supplied English and metadata, complete EN/TR pairs, six cards per difficulty/type/language, no duplicate localized IDs, unchanged unrelated cards and exact archival preservation. Unit/browser checks additionally cover eligibility, saved-state validation, repeat exhaustion, free skips, fresh named acknowledgements, old-session recovery and Random exclusion even at deck exhaustion.

Chromium checks cover English/Turkish phone portrait/landscape, keyboard acknowledgements, overflow, partner labels and reachable controls. They do not execute the installed TestFlight app, Safari/WKWebView, a signed native archive or real advertising SDK consent/fill. A newly signed Codemagic/TestFlight build is still needed to use this source update on the iPhone. The existing Android debug APK is historical and has not been rebuilt for this change.

Executed results: **83 unit tests, 96 browser game tests, 15 accessibility tests, 2 production offline tests and 8 Codemagic helper tests passed**. TypeScript, lint, the production beta web build and iOS synchronization passed. The JavaScript bundle retains its nonblocking chunk-size warning. Independent EN/TR checks at 320×740 and 844×390 found no horizontal overflow or uncaught JavaScript errors and verified exact saved-card resume.
