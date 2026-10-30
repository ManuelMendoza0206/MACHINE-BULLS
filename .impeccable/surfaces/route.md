---
version: 1
slug: "route"
primary_target: "route:/"
related_targets: ["wardrobe","outfits","try-on","profile","login","signup"]
---

# Surface brief — StyleMe app (all routes)

## Scope and visitor mode

Whole product surface, web. `/` (Persuade: the demo must earn the click), `/wardrobe`,
`/outfits`, `/try-on`, `/profile` (Operate), `/login` and `/signup` (Operate), plus the shell
(`TopNav` desktop, `BottomTabBar` mobile) and the global error / not-found states.

## Audience, job, action, proof, constraints

- Audience: the wardrobe owner deciding what to wear, and the evaluator watching the MVP work.
- Job: digitize garments, read their colours, get scored outfits from what they own, try them on.
- Action: upload → recommend → try on → download the result. Deletion of a rejected outfit must
  work and survive a reload.
- Proof: real sample imagery in `public/samples/`, real CLIP/Itten/position data, real job states.
- Constraints: 4 fixed nav sections, WCAG AA in both themes, tokens stay the colour source,
  Next 16 / React 19 / Tailwind v4, no invented benchmarks or testimonials.

## Chosen direction and memorable moment

**Muestrario de telas** — a fabric sample book. The shell is indigo dye; the work sits on paper
sample cards with reference numbers, punched holes, hairline rules, and a selvedge strip made of
each garment's real dominant colours. Memorable moment: a card is lifted off the deck, its colour
strip becomes the thread that underlines the active navigation tab, and the try-on result arrives
as a proof sheet stamped with the outfit reference.

## Direction contract

THESIS: Every screen is a card you can read like a garment label; the design refuses the
equal-card bento grid, the rounded glass panel, and the big-number metric strip.

OWN-WORLD: Unbleached-muslin ground (#EFEFE9) / indigo dye (#1B3A5B) shell and primary actions /
paper-white cards with 1px hairline rules and 2–6px corners / tailor-red thread for attention and
destructive only / Archivo variable: expanded 800–900 for display, condensed 600 tracked for
labels, tabular numerals for references and scores / no blur, no pills, no gradient text.

STORY: The visitor sees their closet as a deck of sample cards. They add a garment, read its
colours and position, receive outfits scored like fabric tests, discard the ones they reject, and
leave with a proof sheet of themselves wearing the chosen one.

FIRST VIEWPORT: 12-column folio. Left 7 columns: headline at display scale, one paragraph, two
actions, then a swatch strip of the five real sample garments with reference numbers. Right 5
columns: one tall sample card — canonical model photo, punched hole, reference number, care-label
metadata, result stamp. Below: the three-stage flow on a stitched rail carrying the real values
(512-d CLIP, 1–6 layers, 4 positions).

FORM: candidate 3 of 7 (fabric swatch book), seed key `f93127cb`. Raises read as named lines:
in-place reranking of the outfit deck (from the gate-board challenger), measured tick gauges
instead of progress bars (from the Crouwel challenger), duration-as-length in the try-on stage
timeline (from the labanotation challenger), whole-cell roster reflow (from the character-goods
challenger).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions

- Outfits are still generated on demand; there is no persisted "saved outfits" list in this
  round. Delete removes the persisted outfit and the card leaves the deck immediately.
- No image generation available: the build is code-led, no comp round.
