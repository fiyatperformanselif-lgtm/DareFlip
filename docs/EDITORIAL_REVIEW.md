# Editorial revision 2 — 26 November 2026

The user reported that the seed catalog felt shallow. Revision 2 rewrites all 192 active English concepts and supplies a Turkish version of each, rather than increasing the advertised card count. The active edition contains 180 core and 12 Afterglow concepts (384 EN/TR rows). Archived revision-1 rows exist solely to preserve saved cards and favorites and do not increase the active total or the 5,000-card roadmap count.

## Editorial standard

A Truth should give the player a recognizable starting scene, incident, choice or contradiction that can open a real story. Avoid broad preference inventories, vague coaching vocabulary, leading accusations, automatic trauma disclosure and prompts with several unrelated questions. Easy remains easy to enter; Bold asks for more honesty or creative exposure, not risk or explicit sexual detail.

A Dare should be an activity: a brief improvisation, negotiation, listening exchange, word constraint, perspective switch or other playable interaction. Adding “tell us” to an ordinary question does not make it a new Dare. Prompts should work with two players; extra participants can volunteer. Consent-dependent interaction is framed as willing participation, and every card keeps the global unconditional skip behavior.

Mode identities:

- Couples: shared scenes, everyday teamwork, unspoken needs, expectations and concrete appreciation.
- Party: recognizable social moments, harmless exaggerations, misread politeness, small contradictions and warm group interaction.
- Flirty 18+: chemistry, mixed signals, initiative and playful tension, without turning every card into instructions about boundaries.
- Deep Talk: approachable memories, changes of mind, identity, tradeoffs and listening; no demanded medical, financial or traumatic disclosures.
- Crazy Fun: adult everyday absurdity and improvisation, rather than nursery-style imaginary animals and objects.
- Afterglow: specific reflective moments and a softer end-of-night pace.

Gender does not determine the content or romantic pairing. No new task requires explicit sexual activity, nudity, kissing/touching, alcohol/substances, spending, private-message access, contacting exes or strangers, dangerous acts, ranking other players or humiliation.

## Review performed

Drafts were checked across modes, not just within each category. The review removed overlapping date-pitch tasks, alternate-plan pitches, repeated “playing it cool” questions, duplicated dramatic-headline reveals, repeated first-conversation questions, cancelled-plan relief and repeated place-guessing/narrator exercises. Turkish wording was revised for conversational use and EN/TR meaning alignment, including awkward literal constructions and differences such as “casual” versus “spontaneous.”

Structural checks cover metadata parity, all original revision-1 source IDs being revised, localized uniqueness, length limits, category/difficulty/type coverage and complete Turkish pairs. Tests cannot prove humor, emotional usefulness, cultural fit or semantic originality; these remain editorial judgments and should be checked through playtesting/native-speaker feedback. No psychological diagnosis or scientific efficacy claim is made.

## Source transparency

The user suggested X/Twitter as an optional source. A public X search request was attempted from the development environment and failed with an HTTP CONNECT 403 network restriction. No X posts were read, quoted, copied, attributed or claimed as trend research for this revision. The final prompts are original editorial writing, informed by the gameplay brief and review of the existing catalog.

## Upgrade behavior

Active revision-2 concepts use fresh `-v2` IDs. The exact previous 282 rows (192 EN, 90 TR) are retained in `src/content/archive-v1.json`. Old saved cards and favorites resolve to their own trusted edition; they are not silently replaced with a different question. Current draws and daily questions use only the new active catalog. A restored old card may remain on screen until the player takes the next turn. Strict saved-card metadata checks still apply, and old gender-completion migration is preserved.
