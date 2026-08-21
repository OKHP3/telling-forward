# UI Vision Briefs for Replit Design

These documents brief Replit Design on Telling Forward's Author App and Reader App. They are working drafts, iterated with Jamie Hill across a single planning session on 2026-08-17, not finished specs. Each version is kept for history; **v4 is current**.

## Version history

- **[ui-vision-brief-v1.md](./ui-vision-brief-v1.md)** — First pass. Reader/contributor/steward framing, one shared visual language, chrome recommended genre-neutral across all storyworlds.
- **[ui-vision-brief-v2.md](./ui-vision-brief-v2.md)** — Corrects v1: split into a genre-neutral Author App and a themeable, per-world Reader App with a finite starter theme catalog (Editorial, Terminal/Found Footage, Archive/Illuminated, Dispatch/Newsprint, Transmission/Signal).
- **[ui-vision-brief-v3.md](./ui-vision-brief-v3.md)** — Adds the Concept Board: non-linear, outline-first capture as a second Author App mode alongside the linear Scene Writer. Confirms repo topology (one repo per storyworld) and the GitHub-only interoperability constraint (no Notion or other third-party dependency).
- **[ui-vision-brief-v4.md](./ui-vision-brief-v4.md)** — **Current.** Corrects the Concept Board's mechanics against their real origin: PME/PIE (Prose Maturation/Inversion Engine) and CME/CIE (Concept Maturation/Inversion Engine), developed during actual Magnus Progenitor Saga manuscript work and later generalized into the `refoldec` xME/xIE framework. Renames "cards" to "capsules." Replaces a single generic "extract" action with the real disrupt/invert pair. Documents why capsules are GitHub Issues rather than prose files. Note: references to a "four-state submission model" throughout v1–v4 are superseded — the six-state model (`draft → submitted → under-review → returned-with-notes → accepted-into-canon / published-alternate`) is now locked per decision 15.11 (2026-08-19, Jamie Hill, PRD Build Directive v1). The briefs are preserved as historical records.

## Visual identity

- **[telling-forward-visual-identity.md](./telling-forward-visual-identity.md)** — Working visual-language guide for the shared Telling Forward identity: light-first palette, narrative-matter metaphors, image directions, icon and social-art guidance, derivative rules, and accessibility guardrails.
- **[telling-forward-visual-implementation-prd.md](./telling-forward-visual-implementation-prd.md)** — Paste-ready implementation brief for Claude and Replit: repository context, asset inventory, visual rules, implementation direction, non-goals, and acceptance checks.

## Source material

Researched from this repo (`README.md`, `docs/MISSION.md`, `docs/adr/0001-0003`, `CONTRIBUTING.md`, `artifacts/mockup-sandbox`) plus three related repos in the OKHP3 org: `refoldec` (the xME/xIE theory), `vault-codices-biases-as-constants` (BAC, the governance/constitution layer), and `magnus-progenitor-saga` (MPS, the fiction and the original PME/PIE/CME/CIE development history).
