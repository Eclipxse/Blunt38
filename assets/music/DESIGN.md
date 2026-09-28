---
name: blunt38 Discord music player
description: A pocket listening room with native Discord controls and an original headphone bunny.
colors:
  lavender: "#c4b4f0"
  warm-white: "#f5f3fa"
  secondary-text: "#c5c1ce"
  graphite-start: "#282831"
  graphite-end: "#17171e"
  record-shadow: "#121216"
  paused-label: "#a5a3b0"
  progress-track: "#484550"
typography:
  title:
    fontFamily: "Player Sans, sans-serif"
    fontSize: "38px"
    fontWeight: 600
  body:
    fontFamily: "Player Sans, sans-serif"
    fontSize: "27px"
    fontWeight: 400
  status:
    fontFamily: "Player Sans, sans-serif"
    fontSize: "25px"
    fontWeight: 500
  metadata:
    fontFamily: "Player Sans, sans-serif"
    fontSize: "23px"
    fontWeight: 400
  timing:
    fontFamily: "Player Sans, sans-serif"
    fontSize: "22px"
    fontWeight: 400
rounded:
  card: "28px"
  progress: "3px"
components:
  raster-card:
    width: "1200px"
    height: "420px"
    rounded: "{rounded.card}"
    textColor: "{colors.warm-white}"
  raster-title:
    textColor: "{colors.warm-white}"
    typography: "{typography.title}"
  raster-status:
    textColor: "{colors.lavender}"
    typography: "{typography.status}"
  raster-progress:
    backgroundColor: "{colors.progress-track}"
    rounded: "{rounded.progress}"
    width: "1092px"
    height: "6px"
---

# Design System: blunt38 Discord music player

## Overview

**Creative North Star: "A pocket listening room"**

This scoped extension gives the Discord player an Apple-like restraint: clear track hierarchy, a quietly dimensional record and a small original bunny wearing headphones. Graphite, warm white and restrained lavender support the music metadata. The bunny accompanies the track; it does not replace useful information.

This file governs only the default loading and now-playing message and its local raster artwork. The root product and design files remain authoritative for the dashboard. The surface contract is `../../.impeccable/surfaces/discord-music-player.md`; implementation lives in `../../src/utils/music-player.ts`, `../../src/services/music-player-card.ts` and `../../src/services/music.ts`.

**Key Characteristics:**

- Native readable metadata and labeled controls.
- Quiet local artwork with a small headphone bunny.
- Truthful playback states and position snapshots.
- Existing custom Visual Studio artwork remains supported.

## Colors

The palette is graphite and warm white with a lavender accent. Frontmatter values apply to the generated raster, not Discord's interface chrome.

### Primary

- **Lavender:** status text, active record label and elapsed-progress fill.

### Neutral

- **Warm white:** track title and progress marker.
- **Secondary text:** artist, volume, queue count and timestamps.
- **Graphite start / end:** diagonal background gradient across the canvas.
- **Record shadow:** offset ellipse behind the vinyl.
- **Paused label:** neutral record-center replacement when paused.
- **Progress track:** unfilled timing rail.

The native embed retains `palette.electric` from `../../src/utils/ui.ts`. Discord chooses the appearance of Primary and Secondary buttons; the raster lavender does not recolor them.

**The Native Boundary Rule.** Exact visual tokens in this document apply only to the raster we render; Discord owns native typography, button geometry, focus treatment and responsive layout.

## Typography

The renderer registers the repository's `../../dashboard/public/fonts/Inter.ttf` as **Player Sans**, with a sans-serif fallback in canvas font declarations. The frontmatter hierarchy records actual canvas sizes and weights; these are source-image pixels, not guaranteed on-screen sizes in Discord.

Title and artist are each a single line, measured and ellipsized to a maximum width of 545 source pixels. Status precedes the title; volume and queue count are subordinate. Native embed text repeats track and artist metadata so essential information remains readable and available when an image cannot render. Discord supplies the native font and text wrapping.

## Layout

The raster is a fixed 1200 by 420 PNG. Its record is on the left, track metadata begins at x=345, and the bunny occupies the right region. The bunny is drawn at height 268 with proportional width, centered within the 228-wide region beginning at x=924, with top y=30. Title, artist and metadata use baselines y=152, 198 and 250; status uses y=84.

The timing rail begins at (54, 338), with dimensions supplied by the frontmatter. Timestamps use baseline y=386; the duration is right-aligned at x=1146. Discord scales the attached image to its available message width. There are no custom mobile breakpoints or guarantees that source-pixel measurements survive that scaling.

Native author/status, track title, artist, timing, requester and optional voice channel sit in the embed. Two native action rows follow the message: Previous / Pause or Resume / Skip, then Queue / Refresh / More / Stop. The custom-template variant omits Refresh. The implementation uses three buttons in the first row and four in the second; it does not attempt arbitrary positioning inside Discord or clickable regions inside the PNG.

## Elevation & Depth

Depth belongs to the illustration: a diagonal graphite surface gradient, tonal vinyl bands, fine circular grooves, an offset dark ellipse and the bunny's baked studio lighting. The renderer does not apply a CSS shadow or animated lighting. Sidecar specimens illustrate these raster primitives only.

## Shapes

The card and rail use the frontmatter corner values. Vinyl, label, spindle, tonearm pivot and progress marker are circles or ellipses. The tonearm uses a rounded line cap. The bunny is a clean transparent cutout with a rounded, tactile silhouette. Native button corners and hit areas are Discord-controlled.

## Components

### Native track embed

The embed exposes loading, playing, paused and idle states as Getting ready, Now playing, Paused and Nothing playing. It includes sanitized track metadata, an optional validated HTTP(S) track link, requester, queue count and volume. Loading says Connecting your track; idle directs the user to `/play`. Unknown duration and live streams are labeled explicitly. The attachment has a descriptive text alternative.

### Native transport and secondary actions

Pause or Resume uses Discord's Primary style; all other player buttons use Secondary. Previous, Pause/Resume and Skip are disabled during loading and idle. Queue, Refresh, More and Stop remain available. More opens the existing expanded controls. Existing playback and DJ authorization remain in force; this design does not redefine command permissions or timing guarantees.

### Position snapshot

**The Snapshot Rule.** Position describes the last panel update, not a running clock, seek control or audio visualization.

The footer says Position at last update and directs users to Refresh. Loading is clamped to zero; positions are nonnegative and bounded by known duration. The raster floors position to a whole second. Known finite non-stream tracks get an elapsed fill and marker; live streams and unknown durations keep the unfilled rail and an explicit label. State/control updates and explicit Refresh can rebuild the panel; there is no periodic timer editing the message. No element is animated or audio-reactive.

### Listening-room raster and bunny provenance

`listening-bunny.png` is an original transparent mascot generated with the built-in image generation tool. Its retained provenance is `listening-bunny.prompt.json`, including the full prompt and transparency setting. The asset was requested as an ivory bunny with graphite headphones, lavender inner ears and a tactile clay/ceramic finish. It contains no painted transport buttons. The record, typography and timing rail are generated by local canvas code, not baked into the mascot source.

The renderer uses the local bunny and repository font, without cover-art or font network requests. A process-local cache holds up to 16 render promises, keyed by visible track information, whole-second position, state, volume and queue count. Failed renders are evicted; a failed mascot load can retry. If rendering fails, the native embed and controls remain available without an image. This is a resilience behavior, not a latency guarantee.

Custom Visual Studio music templates keep their existing attachment path and omit the default player Refresh button. Automatic panel refresh targets the tracked native player rather than replacing a custom template.

## Do's and Don'ts

### Do:

- Do keep track identity, playback state and actions available as native Discord text and controls.
- Do preserve the local Inter font, original bunny provenance and text-only rendering fallback.
- Do label position as a snapshot and represent live streams and unknown durations honestly.
- Do preserve custom Visual Studio templates and existing playback authorization.

### Don't:

- Don't paint fake clickable controls into the illustration.
- Don't claim animation, audio reactivity, realtime position or guaranteed round-trip latency.
- Don't impose raster pixel values on native Discord controls or invent mobile breakpoints.
- Don't promote this scoped listening-room direction into a replacement for the dashboard design system.
