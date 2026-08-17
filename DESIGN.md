---
name: blunt38
description: A monochrome cinematic control surface for blunt server operations.
colors:
  command-ink: "#111111"
  room-black: "#181818"
  panel-black: "#1d1d1d"
  raised-carbon: "#242424"
  signal-ivory: "#f1f0ed"
  ash-copy: "#b8b8b4"
  equipment-muted: "#9a9a95"
  ghost-rule: "rgba(241, 240, 237, 0.14)"
typography:
  display:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "clamp(3.2rem, 7.4vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "clamp(24px, 3vw, 42px)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "clamp(14px, 1.25vw, 17px)"
    fontWeight: 650
    lineHeight: 1.6
    letterSpacing: "normal"
  control:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "9px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  none: "0px"
  circular: "50%"
spacing:
  compact: "8px"
  control: "12px"
  gutter: "18px"
  section: "24px"
  frame: "48px"
components:
  button-action:
    backgroundColor: "transparent"
    textColor: "{colors.ash-copy}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "54px"
  button-action-hover:
    backgroundColor: "{colors.signal-ivory}"
    textColor: "{colors.command-ink}"
    rounded: "{rounded.none}"
  navigation-item:
    backgroundColor: "transparent"
    textColor: "{colors.equipment-muted}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "0 9px"
    height: "48px"
  navigation-item-active:
    backgroundColor: "{colors.signal-ivory}"
    textColor: "{colors.command-ink}"
    rounded: "{rounded.none}"
  field:
    backgroundColor: "transparent"
    textColor: "{colors.signal-ivory}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "46px"
  field-focus:
    backgroundColor: "rgba(241, 240, 237, 0.04)"
    textColor: "{colors.signal-ivory}"
    rounded: "{rounded.none}"
  list-row:
    backgroundColor: "transparent"
    textColor: "{colors.signal-ivory}"
    rounded: "{rounded.none}"
    padding: "0 2px"
    height: "76px"
  overlay-panel:
    backgroundColor: "{colors.command-ink}"
    textColor: "{colors.signal-ivory}"
    rounded: "{rounded.none}"
    padding: "22px"
---

# Design System: blunt38

## Overview

**Creative North Star: "The Monochrome Signal Room"**

blunt38 is a cinematic operating surface, not a friendly SaaS dashboard. It feels like a dark control room built from black equipment faces, pale signal light, hard rules, terse readouts, and one oversized directive at a time. Grayscale watcher imagery may occupy the background as atmospheric evidence that the system is alive, but controls and content always remain the dominant layer.

The interface is dense without feeling cramped: broad editorial pauses establish hierarchy, then compact rows and fields support fast operation. Selection is blunt and binary. Pale-on-black becomes black-on-pale, thin rules divide operational zones, and restrained motion reveals a route without turning the surface into spectacle.

**Key Characteristics:**

- Monochrome equipment palette with ivory as signal and action.
- Oversized editorial directives paired with compact operational text.
- Square controls, thin rules, and flat in-flow surfaces.
- Grayscale watcher imagery held behind the task layer.
- Responsive rail that compresses and then becomes a bottom dock.

## Colors

The palette is a controlled ladder from Command Ink to Signal Ivory; hierarchy comes from luminance, opacity, and inversion rather than feature colors.

### Primary

- **Signal Ivory** (`#f1f0ed`): Primary text, active navigation, selected controls, progress, and decisive actions.

### Neutral

- **Command Ink** (`#111111`): Deepest navigation, overlay, and inverse-text surface.
- **Room Black** (`#181818`): The full application canvas and image-blending base.
- **Panel Black** (`#1d1d1d`): Inputs with native menus, preview panels, and secondary contained surfaces.
- **Raised Carbon** (`#242424`): Quiet track and raised-control separation inside the black field.
- **Ash Copy** (`#b8b8b4`): Descriptions and supporting copy that must remain comfortably legible.
- **Equipment Muted** (`#9a9a95`): Routes, metadata, inactive controls, and low-priority state.
- **Ghost Rule** (`rgba(241, 240, 237, 0.14)`): Structural borders and dividers.

### Named Rules

**The Inversion Rule.** State and hierarchy are expressed by reversing Signal Ivory and Command Ink, not by introducing a feature accent.

**The Five-Neutral Rule.** Product surfaces stay inside the core black-to-ivory scale; imagery is grayscale and subordinate.

## Typography

**Display Font:** Unbounded (with sans-serif fallback)  
**Body Font:** DM Sans (with sans-serif fallback)  
**Label/Mono Font:** IBM Plex Mono (with monospace fallback)

**Character:** Unbounded supplies massive, compressed directives; DM Sans keeps operation plainspoken and compact; IBM Plex Mono turns routes, percentages, shortcuts, and metadata into instrument readouts. Black Ops One is reserved for the compact blunt38 wordmark.

### Hierarchy

- **Display** (800, `clamp(3.2rem, 7.4vw, 6rem)`, 0.9): One dominant route directive, constrained to roughly 13 characters per line.
- **Headline** (800, `clamp(24px, 3vw, 42px)`, 1): Editor titles and decisive empty-state instructions.
- **Body** (650, `clamp(14px, 1.25vw, 17px)`, 1.6): Direct supporting copy, capped near 58 characters per line.
- **Control** (750, `12px`, 1): Navigation, buttons, field labels, and row actions.
- **Label** (600, `9px`, `0.08em`, uppercase): Routes, status, percentages, shortcuts, and terse metadata.

### Named Rules

**The Three-Voice Rule.** Use Unbounded for directives, DM Sans for operation, and IBM Plex Mono for route, status, shortcut, and measurement language.

## Layout

Desktop uses a fixed 196px navigation rail, a sticky 72px top bar, and a centered content field capped at 1360px. Content width subtracts a fluid outer frame from the viewport, with 48–96px vertical entry space and generous section breaks. Primary screens use asymmetrical two-column compositions where the task benefits from comparison or status scanning; thin horizontal rules keep those zones aligned.

Below 1100px the rail compresses to 74px and complex two-column views collapse. Below 820px navigation becomes a 68px fixed bottom dock, the content frame becomes 16px per side, forms become one column, and overlay/save controls respect the dock. A final 480px adjustment removes secondary row actions and protects the directive size.

### Named Rules

**The Rail-to-Dock Rule.** The 196px rail compresses to 74px below 1100px and becomes a 68px bottom dock below 820px.

## Elevation & Depth

The system is flat by default. In-flow sections, rows, inputs, progress, and navigation rely on tonal layering and one-pixel rules, not shadows. Deep black shadows are limited to detached command, drawer, toast, and unsaved-state surfaces; the dimmed backdrop and physical separation carry most of their depth.

### Named Rules

**The Flat-Until-Detached Rule.** In-flow surfaces stay flat; only detached overlays and save feedback may cast depth.

## Shapes

Operational geometry is square. Buttons, navigation items, fields, toggles, progress tracks, drawers, panels, and toasts use hard corners (`0px`) and one-pixel rules. Perfect circles (`50%`) are reserved for identity avatars and atomic marks; they do not soften containers or actions.

### Named Rules

**The Hard-Edge Rule.** Operational rectangles use square corners; circles are reserved for avatars and atomic status marks.

## Components

### Buttons

- **Shape:** Hard rectangular controls (`0px`) with one-pixel rule borders or a single bottom rule.
- **Primary:** Signal Ivory on Command Ink, typically at 46–54px high; labels are compact, heavy DM Sans.
- **Hover / Focus:** Invert to Signal Ivory with Command Ink text. Field focus uses a pale four-percent wash while retaining the hard underline.
- **Secondary:** Transparent with Ash Copy; it earns emphasis only on interaction.

### Navigation

- **Desktop:** A 196px fixed rail of 48px rows with icons and labels; active state is a complete ivory inversion.
- **Compressed:** At 74px the labels disappear and the icons stay centered.
- **Mobile:** A 68px bottom dock restores 9px labels beneath icons and keeps the active item fully inverted.

### Fields

- **Style:** Transparent 46px fields with only a pale bottom rule, 12px horizontal inset, Signal Ivory value text, and square corners.
- **Focus:** The bottom rule becomes Signal Ivory and the field receives a subtle ivory wash.
- **Structure:** Desktop editors align labels and fields in a 35/65 split; mobile stacks label, control, and help text.

### Toggles and Segmented Controls

- **Toggle:** A 44×24px square frame with a 14px square thumb; the selected state inverts the entire mechanism.
- **Segmented:** Transparent square group with muted choices and an ivory active segment.

### Status Rows

- **Style:** 76px rule-separated rows with icon, label/detail, action, and directional affordance.
- **State:** Hover inverts the row. Active status uses a small square ivory mark instead of color coding.

### Progress

- **Style:** A 2px square track with a Signal Ivory fill, bracketed by compact label, percentage, and mono readiness copy.

### Overlays and Save State

- **Panels:** Command palette, health drawer, and preview drawer are Command Ink surfaces with Ghost Rule borders and square corners.
- **Save State:** A detached bottom action bar pairs a blunt dirty-state sentence with transparent discard and inverted save actions.

### Named Rules

**The Invert-on-Action Rule.** Hovered or selected controls become Signal Ivory with Command Ink text.

## Do's and Don'ts

### Do:

- **Do** let one oversized Unbounded directive establish the route before operational detail begins.
- **Do** separate zones with one-pixel Ghost Rules and broad editorial spacing.
- **Do** use complete ivory/ink inversion for selection, hover, and decisive action.
- **Do** keep watcher or brand imagery grayscale, darkened, and behind the working layer.
- **Do** preserve the rail-to-dock responsive transformation and reduced-motion fallback.

### Don't:

- **Don't** introduce colorful feature accents, gradients, or candy status colors into the control surface.
- **Don't** round operational containers or turn rows into floating SaaS cards.
- **Don't** use shadows on in-flow content or controls.
- **Don't** let watcher imagery compete with route, server, command access, setup state, or save actions.
- **Don't** soften terse product language into generic dashboard copy.
