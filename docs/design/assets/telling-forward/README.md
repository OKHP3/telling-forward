# Telling Forward Visual Asset Pack

These files are the first production-oriented derivatives of the visual identity guide. They remain light-first, with narrative bonds, fragments, and warm transformation energy as the shared visual grammar.

## Icons

| File | Size | Intended use |
| --- | --- | --- |
| `icon-master.png` | 1254 x 1254 | High-resolution source for future square derivatives |
| `favicon.svg` | Vector | Modern browser favicon |
| `favicon-16.png` | 16 x 16 | Browser favicon fallback |
| `favicon-32.png` | 32 x 32 | Browser favicon fallback |
| `apple-touch-icon.png` | 180 x 180 | Apple home-screen icon |
| `android-chrome-192.png` | 192 x 192 | Android and PWA icon |
| `android-chrome-512.png` | 512 x 512 | Android and PWA icon |
| `icon-maskable-512.png` | 512 x 512 | Maskable PWA icon source |
| `mask-icon.svg` | Vector | Safari pinned-tab icon |

The square icon represents three story paths meeting at a warm nucleus. Preserve its clear margin and do not place a wordmark inside it.

## Share images

| File | Size | Intended use |
| --- | --- | --- |
| `social-open-graph-1200x630.png` | 1200 x 630 | GitHub, LinkedIn, and general Open Graph sharing |
| `social-x-1600x900.png` | 1600 x 900 | Wide social sharing and presentation headers |
| `social-master.png` | 1731 x 909 | Source artwork for additional wide crops |

The left side of the wide artwork remains deliberately calm for platform-specific text overlays. Do not add copy directly to the master.

## Backgrounds

| File | Size | Intended use |
| --- | --- | --- |
| `background-desktop-2560x1440.png` | 2560 x 1440 | Desktop wallpaper, hero background, wide ambient surface |
| `background-mobile-1290x2796.png` | 1290 x 2796 | Mobile wallpaper, tall background, mobile splash surface |
| `background-mobile-master.png` | 941 x 1672 | Source artwork for additional vertical crops |

Treat background art as ambient. It must sit behind content without reducing reading contrast or replacing meaningful interface state.

## Motion background

| File | Format | Intended use |
| --- | --- | --- |
| `narrative-pulse.svg` | Animated SVG | Live application hero, ambient background, and motion prototype |

This motion asset keeps the light-first field static while amber signals move along relationship bonds and selected nodes breathe. It is the preferred live-product format because it remains crisp and localizes motion to meaningful transformation points. It contains a reduced-motion fallback.

Use a short, captioned video export only where a platform supports video but not animated SVG. Use a static PNG for Open Graph and other social-preview systems, which generally do not preserve motion reliably. Do not use an animated GIF as the primary app asset; it is larger, less crisp, and provides weaker accessibility control.

## Implementation notes

- Serve the smallest suitable raster for the rendered size.
- Keep icon and share-image alt text functional, not ornamental.
- Preserve enough contrast when text sits over background art. Add a light field or scrim when needed.
- The asset pack does not define editorial, privacy, or canon state. Those require direct labels and accessible state treatment.
