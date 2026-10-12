# Implementation status

Updated 11 October 2026 (America/Denver). Protocol `hollow-3`, content `2026.10.12-3`. Base source: `778bccd`; this follow-up implements the agreed independent armor and release fixes.

**Playable local slice with verified independent armor and five passing network mission rosters.** Presentation has improved, but user visual acceptance, human playtesting, consumer-device performance and public hosting remain open. No public playable URL is claimed.

## Vision preserved

- A Hellgate: London voxel action RPG fan sequel: ruined London, Templar armor, Hunter firearms and Cabalist occult identity.
- One complete mission for 1–3 online players, three distinctive classes, six ability-changing Legendary relics, personal loot, revives, reconnects and replay. Optional AI companions were explicitly requested.
- Taller London architecture and adult character proportions; leaner models and finer voxel detail. Armor attaches to the base rig and visibly swaps.
- **Helmet, chest, arms and legs are independently equippable loot**, as confirmed by the user. Arms and legs are paired pieces, not separate left/right slots.
- Extensive building destruction with material resistance: powerful attacks break masonry; unsupported sections collapse after a warning.

The original planning package is a historical baseline. Its deferred AI, limited-cover destruction scope and single armor-slot model are superseded by the user's later requests.

## Implemented in this follow-up

- Four armor slots across loot generation, inventory cards/comparisons, stat aggregation, companions, network appearance and rig attachments. Swaps rebuild only the affected slot. First Strand clear guarantees a Magic helmet to make the system discoverable. Armor affix ranges are distributed 20% helmet / 40% chest / 20% arms / 20% legs to preserve the original full-set bonus budget.
- More shaped limbs and helmets, tapered chest plates, smaller Hunter back equipment, domed pauldrons and upgraded-piece details. All three classes retain their silhouettes and weapons. Bus height corrected from 6.5 m to 4.4 m with matching visible/collision height.
- Recessed windows, stone trim, projecting cornices and varied masonry. Surface mortar uses an original generated texture, while structural blocks remain authoritative and destructible. Building geometry fell from approximately 545,000 to 55,472 triangles; see exact recorded evidence in validation.
- Full-suite errors now fail the process. A child-process regression proves an assertion after server cleanup returns exit code 1.
- Fixed the latency proxy's frame reordering using one ordered queue per direction. The former proxy reproduced 907 out-of-order observations in a 2,000-frame echo probe. New regression verifies 512 frames in each direction preserve order through jitter/stalls.
- Test players and AI companions anticipate the Bellwether ring from its visible windup. Previously the melee agent waited until the ring arrived in a delayed state patch, often after taking damage. Player damage, boss health and dodge invulnerability were not changed in this follow-up.

## Verification

- Production build/typecheck, 19 simulation scenarios, serialization, six focused equipment/transport/lifecycle regressions, live room integration and three destruction tests passed.
- All five full-network mission cases passed through the corrected latency proxy: solo Blademaster, Marksman, Evoker, two players and mixed three players. No decoder warning; all rosters finished without deaths. Bot mission times of about 133–177 seconds are not human playtime claims.
- Three clients verified each armor slot updates independently; exact equipment IDs survive reconnect; retry restores checkpoint gear and destruction.
- Production Chromium passed 15 UI checks including the helmet swap, solo pause, refresh/reconnect and ten restart cycles; no page errors. The captured combat scene used 119 draw calls / 76,728 triangles on Standard. Later helmet shaping received a fresh production build and visual preview review. These are cloud observations, not consumer FPS measurements.
- Actual 60-second reconnect expiry and gear/cover/boss recovery passed. Expected rejection logs and early unregistered personal-message warnings are recorded as test-harness noise, not hidden.

## Destruction boundary

All eight represented Strand building shells use destructible wall/floor/roof blocks with material thresholds and bounded support collapse. Fine visible voxels are not independent physics objects. Underground rooms retain their authored boundary walls and selected breakable cover/pillars. The distant skyline is scenery; arbitrary terrain excavation, climbing, and whole-world physics remain outside the slice. Further coverage should follow a concrete visual/gameplay need rather than changing the mission footprint.

## Remaining steps

1. Review the generated combat and three-class armory previews against the user's visual direction; refine specific mismatches. Independent armor is implemented, not deferred.
2. Install/connect the available Render integration, deploy the prepared free-preview Node service, verify HTTPS/WSS, and complete hosted solo/two/three-player journeys. Separate physical machines remain a release gate. No paid plan is authorized by this change.
3. Observe fresh human players for class feel, relic discovery, enemy tells, camera comfort and the 10–12 minute first-run target. Measure Low/Standard stress performance and supported browsers on actual consumer devices. Cloud Chromium cannot close those gates.

Keep three classes and one mission as the delivery scope. Additional classes, campaign, persistent characters, crafting and matchmaking remain later work.

## Launch and evidence

`npm ci`, then `npm run dev`. Production: `npm run build`, then `npm run start:server`. Solo requires the server; unfinished in-memory runs end on server restart. Public source repository: [hellgate-hollow-line](https://github.com/rporter33/hellgate-hollow-line).

See [validation](docs/validation.md), [art direction](docs/reference/art-direction.md), and [deployment](docs/deployment.md).

Review images: [Marksman](docs/review/marksman-armor-preview.png), [Blademaster](docs/review/blademaster-armor-preview.png), [Evoker](docs/review/evoker-armor-preview.png), [combat](docs/review/combat.png).
