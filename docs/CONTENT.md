# Content authoring and editions

The active `src/content/cards.json` contains 192 English cards and 192 Turkish translations (384 active rows): 180 core and 12 Afterglow cards. The catalog now combines 156 revision-2 cards with 36 revision-3 private Flirty cards. The editorial target remains 5,000 originals; it has not been reached. Unique IDs and paired translations do not establish that every idea is semantically unique.

```json
{
  "id": "party-easy-truth-01-v2",
  "category": "party",
  "difficulty": "easy",
  "type": "truth",
  "language": "en",
  "text": "An original conversation starter goes here.",
  "pack": "core",
  "sensitive": false
}
```

This example illustrates the schema; do not add it to the shipped catalog. Categories are `couples`, `party`, `flirty`, `deep`, and `crazy`. Difficulties are `easy`, `medium`, and `bold`; kinds are `truth` and `dare`. Packs are currently `core` and `afterglow`. Each `(id, language)` pair is unique. A translation preserves the original card's revision ID and metadata.

## Public social modes and private Flirty

Random draws only from the social categories `couples`, `party`, `deep`, and `crazy`; it excludes Flirty. It does not require the private mode's adult-partner confirmations. The other social modes retain their 2–20-player workflow.

Flirty 18+ is a separate private mode for exactly two adult partners, each of whom personally confirms being at least 18 and wanting to play the private intimate card game. These declarations are not independent age verification. Starting a game does not authorize an activity: both partners must still be willing at that moment, and either may stop or skip without explanation or penalty. On private cards, first-person words such as “me” and “my” refer to the other partner. Gender selections do not determine card eligibility or romantic pairing.

The active revision-3 Flirty material was supplied by the user and integrated with copyediting, translation, and EN/TR alignment. It is not presented as independently sourced research or as a newly verified collection of original ideas. Private cards remain marked sensitive and are excluded from Random, daily selection, and advertising placements. Their wording and adult scope require separate publisher/platform review; this document does not establish store approval.

Social-mode authoring should remain natural, playable, consensual, safe, and nonhumiliating, without explicit sexual acts, substance requirements, dangerous activity, compelled touching, financial spending, compelled disclosure, or stranger contact. Private-partner material must also remain voluntary and must never imply that a card overrides either person's current decision. Do not apply the historical claim that all Flirty material is nonexplicit to the user-supplied revision-3 edition.

## Immutable saved editions

Shipped localized rows are immutable. A replacement receives a new revision ID and the exact earlier rows stay in a trusted compatibility archive. Saved cards and favorites resolve to their own edition rather than silently becoming a different prompt:

- `src/content/archive-v1.json`: 282 earlier rows, comprising 192 EN and 90 TR records.
- `src/content/archive-v2-flirty.json`: the 72 replaced revision-2 Flirty rows, comprising 36 EN and 36 TR records.

Archives exist only for saved-state restoration and favorite lookup. They are excluded from draws, daily selection, active totals, and the 5,000-card roadmap count. Never edit an archive to make a test pass. A preserved group save does not become a new private session automatically; the new private cards require a new two-partner game and both confirmations.

The active EN/TR catalog is fully paired. Missing translations in other languages still fall back visibly to English, and their availability flags must remain honest. Legal and publisher material that is only available in English remains labeled as such.

## Batch checks and expansion

Review ideas across categories for overlap, assign deliberate difficulty and sensitivity, and verify Truth/Dare coverage at each difficulty. Check natural spoken language and translation meaning with native-speaker feedback and playtesting. Automated tests can check exact duplicate text, IDs, metadata, language pairing, archive integrity, and eligibility rules. They cannot certify semantic uniqueness, humor, cultural fit, or suitability for a particular couple. The user-supplied private edition is not certified free of repeated themes.

Run `npm test`, the relevant browser flows, and native checks affected by the change. Verify two separate private confirmations, free skipping/stopping, Random exclusion, and legacy saved-card restoration. See `EDITORIAL_REVIEW.md` for provenance and revision history; see `DEVELOPMENT_STATUS.md` for executed checks and remaining limitations.

For 5,000 cards, split source JSON by editorial pack if useful and preindex by `(id, locale)` and eligibility bucket if profiling justifies it. Update the loader and tests together. A future pack must explicitly register its identifier in the type, eligibility, and restore validators. Imported content still requires editorial, rights, and integrity review; gameplay does not need a network content dependency.
