# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences share one surface:

1. **The wardrobe owner** — someone with a real closet who wants to know which of their own
   garments work together and how they look on their own body, without a fitting room. They
   arrive on a phone or laptop, in a hurry, often mid-decision ("what do I wear tonight?").
2. **The evaluator** — a teacher, jury, or engineer reviewing the MVP during a sprint defense.
   They need to see the mechanism working end to end in a few minutes: upload → analyze →
   recommend → try on → result.

The UI is Spanish (Rioplatense voseo) because both audiences are Spanish-speaking.

## Product Purpose

StyleMe digitizes a person's garments with computer vision, builds chromatically harmonious
outfit combinations from what they actually own, and dresses the person in those outfits through
a real multilayer virtual try-on. Success is a visitor who uploads a garment, sees a combination
they would wear, and gets a try-on result without ever reading an instruction.

## Positioning

The try-on is **sequential diffusion over the previous layer** (1–6 garments: bottoms → tops →
outerwear), not a graphic composite. That, plus zero-shot CLIP garment understanding and
Itten-based chromatic scoring, is the mechanism a neighboring "outfit picker" could not copy
truthfully.

## Operating Context

- Demo runs as a compose stack: Next.js frontend on `:3000`, FastAPI backend on `:8000`, GPU
  CatVTON host on `:7861`, Redis + ARQ worker for jobs.
- Backend media is served from `<apiOrigin>/media/...` as absolute URLs.
- The MVP uses a fixed demo user (`demo@styleme.test`); Supabase auth exists but the product is
  usable without signing in.
- Review happens live, on a projector or laptop, usually with the backend already seeded with
  sample garments and photos.
- Light and dark themes are both first-class; system preference is the default.

## Capabilities and Constraints

- Four root sections, fixed: Armario (`/wardrobe`), Outfits (`/outfits`), Probador (`/try-on`),
  Perfil (`/profile`). No fifth nav item without a product decision.
- Wardrobe: batch upload with client-side blur validation, photo-consent gate, capsule catalog
  with multi-select adoption.
- Outfits: recommender POST persists ranked outfits; each carries chromatic and style scores and
  garment references by position (top / bottom / footwear / outerwear).
- **Outfits must be deletable.** A recommendation the user rejects has to leave the surface, and
  the deletion has to survive a reload.
- Try-on: requires a selected outfit and a photo; creates an async job, polls with backoff, can
  time out locally without cancelling the job.
- Profile: identity, wardrobe stats, VTON provider health, sign-out.
- Technical: Next.js 16 App Router, React 19, Tailwind CSS v4, TanStack Query, Radix, Zod.
  Design tokens are the single source of colour truth and must keep WCAG AA in both themes.
- No invented benchmarks, customers, prices, or capabilities: numbers shown in the UI come from
  the pipeline (512-d CLIP embeddings, 1–6 layers, real job states) or from computed data.

## Brand Commitments

- Name: **StyleMe** (product) / **StyleSync IA** (project). Both may appear.
- Voice: Spanish, Rioplatense voseo, direct and warm; no corporate filler, no hype.
- The interface must never pretend a mock result is real: the active VTON provider is visible in
  Profile.

## Evidence on Hand

- `frontend/public/samples/`: `usuario_canonico.jpg`, `usuario_apose.jpg`, `prenda_camiseta.jpg`,
  `prenda_pantalon.jpg`, `prenda_chaqueta.jpg` — real demo imagery.
- `backend/styleme.db`: seeded demo catalogue and ownership rows.
- `docs/architecture/svgs/*.svg`: real stack, pipeline, protocol, testing, deployment diagrams.
- `docs/sprint-plans/`, `openspec/specs/`: sprint history and behavior contracts.
- Absent: real customers, testimonials, pricing, press. Do not fabricate them.

## Product Principles

1. **The try-on is the proof.** Every screen either feeds it or shows its result; nothing else
   competes with it for attention.
2. **Their closet, not a catalogue.** Recommendations and copy speak about the garments the user
   owns; the capsule is a starting kit, never the product.
3. **Explain the why.** Scores, positions, and provider state are surfaced in human language, so
   the result is trustworthy rather than magic.
4. **No dead ends.** Every empty, error, or timeout state offers the next real action.
5. **Accessible by default.** Keyboard reachable, AA contrast, motion that respects
   `prefers-reduced-motion`.

## Accessibility & Inclusion

WCAG 2.1 AA for text and focus affordances; 44px minimum touch targets; the shell keeps a skip
link and landmarks; active navigation is signalled by more than colour; all imagery carries
meaningful `alt` text derived from real data.
