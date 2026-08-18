# Telling Forward — Reader App Theme Contract

_Every theme in the Telling Forward Reader App must honour these five non-negotiable visual behaviours.
Failing any one of them is a contract violation, not a design choice._

---

## 1. Canon / Branch / Draft are always visually distinct

Three story-path types exist in the platform and every theme must render them with unambiguous visual differentiation:

| Type | Meaning | Required treatment |
|---|---|---|
| **Canon** (`open` or `accepted-into-canon`) | The authoritative story path | Treated as the primary reading surface — no "warning" colouring |
| **Alternate** (`published-alternate`) | A published divergent path | Distinct accent colour or typographic marker; clearly secondary |
| **Draft / In-review** (`personal`, `proposed`, `under-review`) | Not yet canon | Muted treatment; never presented as finished reading material |

The distinction must be visible **at the path-list level** (world landing page) and **within the path reader** (branch-point callouts). It must not rely solely on colour — shape, label, or typographic weight is required alongside colour so the distinction survives colour-blindness and reduced-colour displays.

CSS custom properties used:

```css
--reader-canon-indicator       /* primary canon accent */
--reader-alternate-indicator   /* alternate-path accent */
--reader-draft-indicator       /* draft / not-yet-published muting */
```

---

## 2. Attribution and agent-assistance disclosure are always visible

Every scene (contribution) in the path reader must display:

- **Contributor display name** (or "Anonymous" when `contributorId` is null and no name is available)
- **"Agent-assisted" badge** when `agentAssisted === true` on the contribution

Both must be **always visible** — not hidden behind hover states, tooltips, or collapsed sections. This is a provenance requirement, not a stylistic option.

The badge text should be theme-neutral ("Agent-assisted" in Editorial; themes may rephrase it in their own voice, e.g. "System-generated" or "Synthesised signal" in Terminal, but must not omit it).

---

## 3. WCAG AA contrast holds throughout

All text-on-background combinations — including:

- Prose body on `--reader-bg`
- Attribution text on its background
- Badge text on badge background
- Branch-point callout text on callout background
- Canon / alternate / draft indicator labels on their backgrounds

…must meet WCAG 2.1 Level AA contrast (4.5:1 for normal text, 3:1 for large text / UI components).

This requirement applies across light and dark variants of every theme. If a theme only ships a light variant, it must still pass AA in that variant.

---

## 4. A reduced-motion path exists

All transitions, animations, and motion effects must respect the user's system preference:

```css
@media (prefers-reduced-motion: reduce) {
  /* All transitions/animations suppressed or replaced with instant toggle */
}
```

Theme-defined motion (page transitions, scroll effects, ambient background motion, typewriter effects in Terminal theme) must either disable entirely or reduce to a simple opacity/visibility toggle under `prefers-reduced-motion: reduce`. No animation may be structurally load-bearing — content must be accessible without it.

---

## 5. Text scales with system font size

The Reader App must not lock typography to fixed pixel sizes that ignore the user's system font-size preference.

- **Body text** must be set in `em` or `rem` relative to the root font size (`--reader-body-size` maps to a `rem`-based value)
- **Line length** must be bounded in `ch` units (target 65–75ch for comfortable reading)
- **The `font-size` on `:root` must not override the browser default** (typically 16px) with a fixed pixel value

Future themes may alter the base `rem` size but must not set it below `14px` equivalent.

---

## Theme token set (minimum required)

Every theme must define all of the following CSS custom properties. Omitting any token is a contract violation:

```css
/* Core surfaces */
--reader-bg               /* Page/document background */
--reader-text             /* Primary body text */
--reader-text-muted       /* Secondary / attribution text */
--reader-accent           /* Single restrained interactive/decorative accent */

/* Story-type indicators */
--reader-canon-indicator    /* Canon path accent */
--reader-alternate-indicator /* Alternate/branch path accent */
--reader-draft-indicator    /* Draft / in-review muting */

/* Typography */
--reader-font-body        /* Body serif stack */
--reader-font-ui          /* UI chrome sans-serif stack */
--reader-font-mono        /* Monospace (for Terminal theme; may equal system-ui mono elsewhere) */
--reader-body-size        /* Base body text size in rem */
--reader-line-length      /* Max prose line length in ch */
--reader-leading          /* Body line-height */
```

---

## Editorial (default) token values

The Editorial theme is the reference implementation and ships with the Reader App at launch.
All other themes are implemented against this contract, not against Editorial's specific values.

```css
:root {
  /* Core surfaces — Literary Parchment register */
  --reader-bg:                hsl(38 40% 97%);    /* warm off-white */
  --reader-text:              hsl(220 18% 14%);   /* near-black ink */
  --reader-text-muted:        hsl(220 10% 46%);   /* warm mid-grey */
  --reader-accent:            hsl(12 42% 42%);    /* restrained terracotta */

  /* Story-type indicators */
  --reader-canon-indicator:     hsl(150 35% 34%); /* forest green — authoritative */
  --reader-alternate-indicator: hsl(224 45% 46%); /* medium blue — divergent */
  --reader-draft-indicator:     hsl(35 20% 62%);  /* warm sand — unpublished */

  /* Typography */
  --reader-font-body:     'Fraunces', Georgia, serif;
  --reader-font-ui:       'Plus Jakarta Sans', system-ui, sans-serif;
  --reader-font-mono:     ui-monospace, 'Cascadia Code', monospace;
  --reader-body-size:     1.125rem;   /* 18px at browser default */
  --reader-line-length:   68ch;
  --reader-leading:       1.8;
}
```

---

_This document is the source of truth for Reader App theming. It lives at `artifacts/reader/THEME-CONTRACT.md`
and must be updated whenever the contract changes._
