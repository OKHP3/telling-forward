# Telling Forward Visual Identity Implementation PRD

**Audience:** Claude, Replit, and any implementation agent working in this repository

**Purpose:** Apply the newly established Telling Forward visual identity to the website and application without changing product behavior, contribution governance, story rights, or the established architecture.

**Status:** Implementation brief. The visual assets and documentation named below exist in the repository working tree. Inspect them before editing. Do not assume that uncommitted work has been published.

## 1. Mission

Telling Forward is a voice-first, agent-assisted collaborative storytelling platform. It allows people to capture concepts, mature them into prose, deliberately disrupt or invert material to create useful new possibilities, and follow a story's lineage without confusing personal work, alternate paths, and accepted canon.

The product is intentionally not a conventional writing application. Its visual identity must make a different authorship model legible and emotionally inviting. The system should feel like narrative matter connecting, opening, releasing possibility, and recombining.

Apply this identity to both:

1. the **Author App**, including its Concept Board, scene-oriented work, and contribution flows; and
2. the public-facing **website and reader-facing entry surfaces**, including social and repository presentation where those surfaces exist in this repository.

Do not turn the application into a literal graph database, a science-fiction dashboard, a traditional writing product, or a themed fantasy site. The goal is a humane, modern creative instrument with a distinctive visual system.

## 2. Repository context and working boundaries

Read these sources before making visual changes:

- [`AGENTS.md`](../../AGENTS.md): repository identity, technical boundaries, content and security rules, and safe-change procedure.
- [`docs/design/telling-forward-visual-identity.md`](./telling-forward-visual-identity.md): the authoritative visual-language guide produced for this work.
- [`docs/design/assets/telling-forward/README.md`](./assets/telling-forward/README.md): asset inventory, dimensions, and intended use.
- [`docs/design/ui-vision-brief-v4.md`](./ui-vision-brief-v4.md): current historical UI vision and the PME/PIE/CME/CIE basis for Concept Board behavior.
- [`docs/adr/0001-product-naming-and-vocabulary.md`](../adr/0001-product-naming-and-vocabulary.md): public vocabulary contract.
- [`docs/adr/0007-reader-accessibility-and-clarity.md`](../adr/0007-reader-accessibility-and-clarity.md): reader clarity and accessibility considerations.

The canonical Author App integration candidate is `artifacts/web`. `artifacts/mockup-sandbox` remains a design sandbox and must not be treated as the production application. Inspect the existing implementation and framework conventions before deciding which current asset surface or token layer should receive this work.

Preserve routing, data flow, access controls, contribution states, content handling, and existing user work. Do not redesign the product model as part of a visual implementation. Do not add external asset hosting, analytics, tracking, third-party design systems, secrets, or unrelated dependencies without a separate decision.

## 3. The visual thesis

### Narrative matter in motion

The visual system treats words, memories, concepts, personas, and prose as material that can connect and transform.

- A **capsule** is a nucleus: compact, dense, and full of potential.
- A **relationship** is a bond, thread, or orbit.
- A **story path** is a strand or larger living structure.
- **Maturation** is fusion: material gathers into a more coherent form.
- **Disruption and inversion** are fission: a formed structure opens and releases new usable material.
- **A new path** is recombination, not debris.

This is not an image of damage. Fracture is generative. A visible warm connection expresses the energy of transformation, acceptance, insight, or meaningful recombination.

### Emotional posture

The intended mood is contemporary, spacious, precise, warm, and capable. It should neither look like a software dashboard nor like a dusty literary archive.

Avoid literal books, pages, typewriters, pens, parchment, library imagery, gears, workshop scenes, blueprints, dense database graphs, academic atom diagrams, destructive explosions, generic neon cyberpunk, and dark-mode-only treatments.

## 4. Parent-brand relationship

Telling Forward belongs to the OverKill Hill P3 family. Inherit the parent's technical confidence, material awareness, deliberate geometry, and heat-tempered accents. Do not use literal forge imagery or restyle Telling Forward into an OverKill Hill site.

| OverKill Hill quality | Telling Forward expression |
| --- | --- |
| Forge-like confidence | Intentional, capable creative transformation |
| Schematic detail | Fine bonds, paths, orbits, and connection logic |
| Durable material | Mineral, fiber, translucent, or lightly faceted texture |
| Orange and amber heat | Meaningful transformation, connection, and resolution |
| Dark technical depth | Supporting contrast, not the default canvas |

## 5. Approved palette and semantic use

Telling Forward is light-first. Its primary field is paper, not a dark application shell. Use the approved OverKill Hill family values below. Build range using translucent layering, spacing, texture, and semantic hierarchy before adding new colors.

| Token purpose | Value | Use |
| --- | --- | --- |
| Primary field | Paper `#F6F2EE` | Main canvas, ambient backgrounds, light cards, social art |
| Quiet structure | Teal `#1C3A34` | Bonds, relationship lines, selected icon detail |
| Grounding contrast | Espresso `#2A2320` | High-legibility text, outlines, rare deep surfaces |
| Material depth | Rust `#5B3A27` | Facets, mature material, restrained emphasis |
| Active transformation | Orange `#C46A2C` | A meaningful fork, active path, or author action |
| Connection and resolution | Amber `#E6A03C` | Ignition point, accepted connection, generative change |

Color has meaning but must not be the only state signal. Privacy, editorial state, canon relationship, and permission boundaries still need plain-language labels, visible shape differences, and accessible text.

## 6. Core visual grammar

Use this compact vocabulary repeatedly. New illustrations, small widget marks, and animated accents should be composed from it rather than introducing unrelated motifs.

| Form | Meaning | Implementation use |
| --- | --- | --- |
| Nucleus | A capsule, seed, persona, or dense possibility | Concept marker, icon detail, cluster center |
| Bond | A relationship worth following | Fine path line, related-item indicator, ambient detail |
| Strand | A larger sequence or story path | Reading orientation, background, campaign imagery |
| Fracture | An opening into possibility | Disrupt or invert illustration, section transition |
| Gold connection | Generative change, connection, or resolution | Limited amber junction, pulse, confirmation moment |
| Fragment | A reusable, recoverable unit | Capsule, proposal, related concept, decorative particle |

Keep diagrams poetic and sparse. A collection of bonds is not permission to show raw graph data. The metaphor adds texture and orientation; it does not replace familiar interface controls or direct language.

## 7. Available visual assets

All paths below are repository-relative.

### Icon system

| Asset | Location | Use |
| --- | --- | --- |
| Master icon | `docs/design/assets/telling-forward/icon-master.png` | Source for future square derivatives |
| Vector favicon | `docs/design/assets/telling-forward/favicon.svg` | Modern browser favicon |
| PNG favicon fallbacks | `docs/design/assets/telling-forward/favicon-16.png`, `favicon-32.png` | Browser fallbacks |
| Apple touch icon | `docs/design/assets/telling-forward/apple-touch-icon.png` | Apple home-screen icon |
| Android and PWA icons | `docs/design/assets/telling-forward/android-chrome-192.png`, `android-chrome-512.png` | Android and PWA manifests |
| Maskable icon | `docs/design/assets/telling-forward/icon-maskable-512.png` | Maskable PWA icon source |
| Safari pinned-tab icon | `docs/design/assets/telling-forward/mask-icon.svg` | Safari pinned-tab configuration |

The icon shows three paths meeting at a warm nucleus. Keep its clear margin. Do not place a wordmark, caption, or extra graphic inside the icon.

### Static share imagery

| Asset | Location | Use |
| --- | --- | --- |
| Open Graph card | `docs/design/assets/telling-forward/social-open-graph-1200x630.png` | GitHub, LinkedIn, and general link sharing |
| Wide social card | `docs/design/assets/telling-forward/social-x-1600x900.png` | Wide sharing, presentation headers, adaptable campaign use |
| Wide master | `docs/design/assets/telling-forward/social-master.png` | Source for new crops |

These images leave the left side calm for a platform-specific text overlay. Keep copy short, high-contrast, and outside the active particle field. Do not add product claims that are not supported by the repository.

### Ambient backgrounds

| Asset | Location | Use |
| --- | --- | --- |
| Desktop ambient background | `docs/design/assets/telling-forward/background-desktop-2560x1440.png` | Wide hero, desktop wallpaper, quiet full-bleed background |
| Mobile ambient background | `docs/design/assets/telling-forward/background-mobile-1290x2796.png` | Tall splash, mobile wallpaper, tall ambient surface |
| Vertical master | `docs/design/assets/telling-forward/background-mobile-master.png` | Source for new vertical crops |

Use backgrounds as atmosphere, not information. Content always wins over the image. Add a paper field, translucent panel, or appropriate scrim wherever text contrast would otherwise be compromised.

### Motion asset

| Asset | Location | Use |
| --- | --- | --- |
| Narrative pulse | `docs/design/assets/telling-forward/narrative-pulse.svg` | Live hero or ambient surface with localized bond and node pulses |

The SVG keeps the main field still while amber signals travel along bonds and selected nodes pulse. It includes a `prefers-reduced-motion` fallback. Use it for live product surfaces only. Keep the static PNG share cards for social previews because social platforms do not consistently preserve animation.

Do not convert the SVG into an animated GIF as the primary application asset. Animated SVG stays crisp, limits movement to meaningful elements, and respects reduced-motion settings. Use a short captioned video export only when a platform specifically needs video and cannot render SVG animation.

## 8. Implementation direction

### First implementation pass

1. Inspect the target app and website to find their existing icon, metadata, manifest, image, token, and theme mechanisms.
2. Add the visual asset paths through existing build and asset conventions. Do not invent a parallel asset pipeline.
3. Introduce a small, named token layer using the approved palette. Prefer shared primitives over one-off component styling.
4. Apply the paper-first field, readable typography, and restrained visual grammar to one representative Author App view and one public or reader-facing view before extending across the product.
5. Use the static share image for metadata and link previews where the site exposes that metadata.
6. Use the animated SVG only where motion is useful, supported, and nonessential. Do not make any task, state, or content dependent on animation.
7. Recheck responsive behavior, real text contrast, visible focus, reduced motion, text alternatives, and all existing application behavior.

### Suggested use by surface

| Surface | Direction |
| --- | --- |
| App shell | Paper-first canvas, quiet teal structure, minimal warm highlights |
| Concept Board | Nuclei and bonds as a sparse ambient grammar, never a raw graph diagram |
| Capsule detail | Compact fragment or nucleus cues, direct text and controls remain primary |
| Maturation action | Gentle gathering or convergence, no automatic or forced workflow implication |
| Disrupt or invert action | A formed structure opens into purposeful fragments, never an explosion or failure state |
| Reader entry and public site | Recombinant Story Matter art, wide social card, measured typography, generous space |
| Page hero | `narrative-pulse.svg` when motion is appropriate, static desktop background when it is not |
| Favicon and installable app | Corresponding icon assets and existing manifest conventions |

## 9. Typography, texture, and motion

Use the OverKill Hill family typography roles only after confirming availability and licensing in the target implementation:

- **Alfa Slab One** for rare decisive display moments, not routine product copy.
- **DM Sans** for human-facing prose, navigation, forms, and reading.
- **JetBrains Mono** for sparing structured or backstage detail only.

Texture should be quiet: pale mineral grain, fine contour lines, translucent fibers, and gently faceted material. Do not use heavy distress, photorealistic stone, fake gold foil, or visual noise.

Motion should communicate transformation. A bond can draw into place, a node can pulse, or fragments can gather. Keep it brief and measured. Never use motion as the only way to communicate a completed action or important state.

## 10. Non-goals

This work does not authorize:

- changes to contribution rights, consent, moderation, canon governance, or attribution;
- new public contribution flows, unreviewed AI transformations, uploads, OCR, or voice transcription;
- a product redesign that changes the information architecture or data model;
- changes to the GitHub, Replit, authentication, or deployment architecture;
- external hosting or analytics for images;
- restyling other repositories or shared family assets;
- presenting mockup-sandbox work as a production deployment.

## 11. Acceptance criteria

The implementation is ready for review only when:

- the visual identity guide and asset inventory were read and their paths remain valid;
- the correct icon forms are wired through the existing favicon, manifest, and pinned-tab mechanisms where those mechanisms exist;
- the relevant page metadata uses a static social image without misleading claims;
- the primary canvas is visibly light-first and the warm palette has semantic restraint;
- Author App and public or reader-facing surfaces share the visual family without becoming visually identical;
- capsule, path, connection, and transformation motifs are recognizable but do not replace plain language or normal controls;
- animated SVG use is localized, optional, and safe for reduced-motion preferences;
- keyboard focus, text contrast, text alternatives, responsive layouts, and existing behavior have been verified;
- no unrelated files, product rules, or architecture were changed;
- the final report names the changed surfaces, validation performed, any asset not wired, and every remaining human decision.

## 12. Completion report format

Report back with:

1. **Implemented:** the exact surfaces and assets actually wired.
2. **Validated:** the relevant build, responsive, accessibility, and reduced-motion checks that actually ran.
3. **Not implemented:** any surface, format, or asset left as a future step.
4. **Decisions needed:** specific choices that cannot be inferred safely, such as the production app entry point, social metadata ownership, or whether a page should use live motion.

Do not claim live deployment, platform configuration, or production behavior unless it was verified in the target environment.
