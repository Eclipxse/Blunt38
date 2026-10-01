# Raven Discord player finish review

Date: October 1, 2026. Scope: default Discord music-player card and native controls.

## Initial review

Disposition: fix. Type, supplied artwork, portrait scale, violet ground, vinyl composition and native controls matched the pinned direction. One material issue: a pending starting track counted itself as up next during loading.

## Fix verdict

Disposition: ship. The shared playerQueueSnapshot helper excludes the identical first pending track from both nextTrack and queued while retaining intentional repeats. The loading capture shows Getting ready, an empty next-track strip, 0 up next and Queue · 0. Desktop and phone playing captures show one next track and Queue · 1. No introduced regressions observed.

Evidence: desktop.png, mobile.png, loading.png and the actual local card renderer. These are development fixtures; live Discord rendering and interaction were not tested. Native Discord controls remain host-styled. Position is a snapshot refreshed on state changes or explicit Refresh.

Validation: primary workspace build and all 81 tests passed; TypeScript check passed. The focused release checkout separately passed its build and all 78 release tests. Asset provenance scan reported one shipping raster and zero missing records. Scoped DESIGN.md and design.json were updated from the final source. Raven replaces the former bunny in all shipping player assets and source references.
