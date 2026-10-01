---
name: blunt38 Discord music player
description: A midnight-violet listening room with the supplied Raven portrait and native Discord controls.
colors:
  accent-violet: "#b98bff"
  crescent-violet: "#9861ff"
  secondary-text: "#b9acd4"
  midnight: "#090911"
  record-dark: "#080810"
typography:
  title:
    fontFamily: "Player Sans, sans-serif"
    fontSize: "32px"
    fontWeight: 600
  body:
    fontFamily: "Player Sans, sans-serif"
    fontSize: "25px"
    fontWeight: 400
  status:
    fontFamily: "Player Sans, sans-serif"
    fontSize: "18px"
    fontWeight: 500
  metadata:
    fontFamily: "Player Sans, sans-serif"
    fontSize: "20px"
    fontWeight: 400
  timing:
    fontFamily: "Player Sans, sans-serif"
    fontSize: "18px"
    fontWeight: 400
rounded:
  card: "24px"
  progress: "3px"
components:
  raster-card:
    width: "1200px"
    height: "520px"
    rounded: "{rounded.card}"
  raster-title:
    textColor: "#f5f2ff"
    typography: "{typography.title}"
  raster-status:
    textColor: "{colors.accent-violet}"
    typography: "{typography.status}"
  raster-progress:
    backgroundColor: "#484060"
    rounded: "{rounded.progress}"
    width: "450px"
    height: "6px"
  raster-up-next:
    backgroundColor: "#12121fee"
    textColor: "#e3daf5"
    rounded: "22px"
    width: "782px"
    height: "83px"
---

# Design System: blunt38 Discord music player

## Overview

**Creative North Star: "A midnight-violet listening room"**

This scoped extension pairs a near-black indigo surface with a violet-and-cyan vinyl, crescent details and pale lavender copy. The supplied Raven portrait occupies the right side; real track metadata, requester, position and next-track information carry the reading hierarchy. The portrait is an identity asset, not a substitute for useful information.

This file governs only the default loading and now-playing Discord message and its local raster artwork. The root product and design files remain authoritative for the dashboard. The surface contract is `../../.impeccable/surfaces/discord-music-player.md`; implementation lives in `../../src/utils/music-player.ts`, `../../src/services/music-player-card.ts` and `../../src/services/music.ts`. The user's October 1 Raven reference replaces the former bunny throughout this shipping surface.

**Key Characteristics:**

- Native readable metadata and labeled controls.
- Supplied Raven portrait with retained source provenance.
- Violet-and-cyan vinyl beside real track and next-track data.
- Truthful playback states and position snapshots.
- Existing custom Visual Studio artwork remains supported.

## Colors

Near-black indigo grounds the card; violet identifies state and crescent details, cyan highlights the vinyl and elapsed rail, and pale lavender keeps the metadata subordinate to the title. Frontmatter colors record the reused raster values. Single-use gradient stops and illustration highlights remain implementation details, not a new palette scale. Sidecar tonal ramps are derived swatch previews rather than additional renderer tokens.

### Primary

- **Accent violet:** current playback status and the Up next label.
- **Crescent violet:** the crescent beside status and at the center of the vinyl.

### Neutral

- **Secondary text:** requester, timestamps and next-track artist.
- **Midnight:** the central background stop and portrait-bottom shade.
- **Record dark:** the vinyl's outer disk and dark material band.

The title, artist and next-track title use distinct pale tones in the renderer. The progress fill runs from violet to cyan, while its marker is pale cyan. These support the functional hierarchy without recoloring native controls.

The native embed retains `palette.electric` from `../../src/utils/ui.ts`. Discord supplies Primary, Secondary and Danger button colors.

**The Native Boundary Rule.** Exact visual tokens in this document apply only to the raster we render; Discord owns native typography, button geometry, focus treatment and responsive layout.

## Typography

The renderer registers the repository's `../../dashboard/public/fonts/Inter.ttf` as **Player Sans**, with a sans-serif fallback in canvas font declarations. The frontmatter hierarchy records actual canvas sizes and weights; these are source-image pixels, not guaranteed on-screen sizes in Discord.

The title is semibold and may occupy two lines. It is measured against a 458-source-pixel width; the second line is ellipsized, while a first word that cannot fit falls back to a single ellipsized line. The artist and requester are single measured lines within 450 source pixels. Functional status precedes the title. The Up next strip uses a medium label (19px), a medium track title (21px) and a regular artist line (17px), each measured within its own region.

Native embed text repeats track, artist, requester, playback state, timing and optional next-track metadata so essential information remains readable when an image cannot render. Discord supplies native font metrics and wrapping. No separate display family or letter-spacing scale is established by this renderer.

## Layout

The raster is a fixed 1200 by 520 PNG. A circular vinyl centered at (159, 218) anchors the left. Current-track metadata begins at x=310 in the middle. Status appears above the title; title baselines begin at y=132 and advance by 39 source pixels, artist uses y=220, and requester uses y=263.

The source portrait is drawn into a 480-by-520 local layer, composited at x=720, faded at its left edge and shaded toward the bottom. It remains the supplied PNG rather than a generated replacement. The metadata region and portrait overlap visually through the fade, not through custom Discord layout.

The timing rail begins at (310, 314). Position and duration share baseline y=353. A real Up next strip begins at (32, 405), with its dimensions in the frontmatter; its label, divider, track title, artist and duration are drawn from the current view. Discord scales the attachment to the available message width. There are no custom mobile breakpoints or guarantees that source-pixel measurements survive that scaling.

Native author/status, track title, artist, timing, volume, requester, optional voice channel and queue count accompany the image. An Up next embed field appears when a next track exists. Two native action rows follow: Previous / Pause or Resume / Skip, then Queue / Refresh / More / Stop. The custom-template variant omits Refresh. The implementation uses three buttons in the first row and four in the default second row.

## Elevation & Depth

Depth comes from the local image composition: a three-stop indigo surface gradient, the supplied portrait's lighting, a horizontal fade, a bottom shade, violet-and-cyan vinyl rim and tonal grooves. The Up next strip uses a darker fill and a fine violet border. The renderer applies no CSS shadows or animated lighting. There is no shadow or motion token scale to extend to other surfaces.

## Shapes

The card and timing rail use the frontmatter corner values. The inset outer outline follows the card's rounded silhouette. The Up next strip is a rounded rectangle with an internal vertical divider. Vinyl, label, spindle and progress marker are circular; the crescent is a filled canvas path reused in the record and state marker. Native button corners and hit areas remain Discord-controlled.

## Components

### Native track embed

The embed exposes loading, playing, paused and idle as Getting ready, Now playing, Paused and Nothing playing. Raster status reads GETTING READY, NOW PLAYING, ON PAUSE and LISTENING ROOM for the same states. These are functional state labels, not decorative captions.

The embed contains sanitized track metadata, an optional validated HTTP(S) track link, requester, queue count and volume. Loading says Connecting your track; idle directs the user to `/play`. Unknown duration and live streams are labeled explicitly. The `listening-room.png` attachment has a descriptive text alternative naming the supplied portrait, playback state, position snapshot and next-track details.

### Native transport and secondary actions

Pause or Resume uses Discord's Primary style. Stop uses Danger. Previous, Skip, Queue, Refresh and More use Secondary. Previous, Pause/Resume and Skip are disabled during loading and idle; Queue, Refresh, More and Stop remain available. More opens the existing expanded controls.

Existing playback and DJ authorization remain in force. This design does not redefine command permissions, Discord accessibility behavior or timing guarantees. The PNG contains no clickable transport controls.

### Position snapshot

**The Snapshot Rule.** Position describes the last panel update, not a running clock, seek control or audio visualization.

The default footer says Position at last update and directs users to Refresh; loading instead says Playback starts when ready. Loading position is clamped to zero; positions are nonnegative and bounded by known duration. The raster floors position to a whole second. Known finite non-stream tracks receive an elapsed gradient and marker; live streams and unknown durations keep the unfilled rail and an explicit label. State/control updates and explicit Refresh can rebuild the panel; there is no periodic timer editing it. No element is animated or audio-reactive.

### Up next strip

The lower strip displays the next queued track's title, artist and known duration, or LIVE for a stream. Empty-queue copy reads The queue is yours and Add another song with /play. These values come from `MusicPlayerView.nextTrack`; no song is baked into the portrait.

When the displayed loading track is still the identical first queued object, `playerQueueSnapshot` excludes that pending object from both Up next and the default panel's queued count. An intentional repeat represented by a separate track object remains queued. The native embed field repeats next-track title and artist when one exists. Volume and queue count remain native text rather than being painted into this raster.

### Listening-room raster and Raven provenance

`raven-portrait.png` is the clean character artwork supplied by the user on October 1. Its source record is `raven-portrait.source.json`, including the received filename and processing statement. The source PNG retains its original pixels and embedded provenance; the local renderer positions, scales, fades and shades it within the card. No generated replacement or edited source cutout is implied. The artist is unidentified in the record; the visible artist mark is retained in the composition. The former bunny assets are no longer shipping assets.

The renderer uses the local portrait and repository font without remote cover-art, image or font requests. A process-local cache holds up to 16 render promises, keyed by the visible current-track metadata, normalized duration and stream flag, whole-second position, state, requester and next-track metadata. Volume and queue count are native-only and are not raster-cache inputs. Failed renders are evicted; a failed portrait load can retry. If rendering fails, the native embed and controls remain available without an image. This is a resilience behavior, not a latency guarantee.

Custom Visual Studio music templates keep their existing attachment path and omit the default player Refresh button. Automatic panel refresh targets the tracked native player rather than replacing a custom template.

## Do's and Don'ts

### Do:

- Do keep track identity, playback state and actions available as native Discord text and controls.
- Do preserve the local Inter font, supplied Raven PNG, source record and text-only rendering fallback.
- Do derive current and next-track metadata from the live player view.
- Do label position as a snapshot and represent live streams and unknown durations honestly.
- Do preserve custom Visual Studio templates and existing playback authorization.
- Do keep Pause/Resume Primary and Stop Danger through Discord's native button styles.

### Don't:

- Don't paint fake clickable controls or static song metadata into the portrait.
- Don't claim animation, audio reactivity, realtime position or guaranteed round-trip latency.
- Don't make remote media requests from the local card renderer.
- Don't impose raster pixel values on native Discord controls or invent mobile breakpoints.
- Don't restore the removed bunny assets as part of the default player.
- Don't promote this scoped listening-room direction into a replacement for the dashboard design system.
