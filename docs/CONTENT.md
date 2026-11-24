# Content authoring

The shipped `src/content/cards.json` contains 192 English concepts and 90 Turkish translations (282 rows). The editorial target is 5,000 originals. This is a scalable seed catalog, not a claim that the target has been completed.

```json
{
  "id": "party-easy-truth-01",
  "category": "party",
  "difficulty": "easy",
  "type": "truth",
  "language": "en",
  "text": "An original conversation starter goes here.",
  "pack": "core",
  "sensitive": false
}
```

The example illustrates the schema; do not add it to the shipped catalog. Categories are `couples`, `party`, `flirty`, `deep`, `crazy`; Random selects across categories. Difficulties are `easy`, `medium`, `bold`; kinds are `truth`, `dare`. Packs are `core`, `afterglow` currently. Each `(id, language)` pair is unique, while a translation must preserve its original concept's ID and metadata. Keep concept IDs stable across edits and locales to preserve favorites and no-repeat histories. Engine lookup resolves a translation per concept, then visibly falls back to English.

An editorial addition must be a distinct idea, not an existing prompt with new nouns. Keep text natural and self-contained; use short spoken sentences. Every task must be consensual, voluntary, safe indoors, nonhumiliating and free from explicit sexual acts, substance requirements, dangerous activity, compelled touching, financial spending, compelled personal disclosure or stranger contact. Flirty is adult-only, playful and nonexplicit. Even a safe prompt can cross someone's personal boundary; unconditional skipping is always available.

For each batch: review semantic duplicates, assign intentional category/difficulty/sensitivity, verify both Truth and Dare coverage for each difficulty, obtain native-speaker/cultural review for translated copy, run `npm test` and browser flows. Automated tests detect duplicate text and broken metadata, not cultural suitability or true semantic originality. Do not change translation availability flags until actual translations exist. Missing legal/publisher translations remain labeled English.

For 5,000 concepts, split source JSON by editorial pack if useful and preindex by `(id, locale)` and eligibility bucket if profiling justifies it. Update loader and tests together. A future pack must explicitly register its identifier in the type/eligibility/restore validators. Imported content must pass the same safety and integrity checks; no network content dependency is required.
