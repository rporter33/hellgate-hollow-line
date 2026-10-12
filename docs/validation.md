# Observed validation

Updated 11 October 2026 (America/Denver). Protocol `hollow-3`, content `2026.10.12-3`; follow-up to source `778bccd`. Node 24.19.0, Linux cloud executor. Browser Chromium 154 / headless WebGL 2 via SwiftShader. Consumer hardware and human playtests remain unverified.

## Current results

| Check | Observed result |
| --- | --- |
| `npm run build` | Typecheck, production Vite client and Node server build pass |
| `npm test` | 19 simulation scenarios pass: input validation, combat/obstruction, ownership, rewards, relics/mods, companions, mission and recovery |
| `npm run test:serialization` | Complete combat patches, kills, transitions and replay pass |
| `npm run test:regressions` | Six checks pass: ring anticipation, independent armor/ownership/checkpoints, affix budgets, isolated helmet mesh replacement, process failure after cleanup, ordered jitter/stall transport |
| `npm run test:rooms` | Three actual clients share movement, destruction, combat, personal loot, revive/retry; capacity, reconnect and leader handoff pass |
| `npm run test:destruction` | Three tests pass: material strength, warned bounded collapse, three-client destruction plus all four armor slots, exact gear restoration on reconnect and checkpoint rewind |
| `npm run test:full` | All five rosters complete with no decoder warnings; details below |
| `npm run test:browser` | 15 production UI checks pass; no page errors; independent helmet swap, solo pause, refresh/reconnect, ten restarts and both panel sizes included |
| `node --import tsx tests/recovery.ts` | Protocol/fresh-join rejection, gear/cover/boss snapshot, leadership, all-disconnected freeze and actual 60-second expiry pass |
| Production visual previews | Final helmet refinement rebuilt and all three class armories captured without page errors |

Full-network completions use actual separate WebSocket connections on one machine through a bidirectional proxy: approximately 100 ms RTT, ±30 ms combined jitter and 1% additional 100 ms reliable-delivery stalls. These are not separate-machine or hosted tests.

| Roster | Mission simulation seconds | Deaths | Final state |
| --- | ---: | --- | --- |
| Blademaster | 147.67 | 0 | debrief |
| Marksman | 177.30 | 0 | debrief |
| Evoker | 151.47 | 0 | debrief |
| Marksman + Evoker | 134.07 | 0 / 0 | debrief |
| Blademaster + Marksman + Evoker | 132.97 | 0 / 0 / 0 | debrief |

Bots do not establish the 10–12 minute first-human target or combat feel. No damage, boss-health or dodge-invulnerability tuning was used to obtain this follow-up's results.

## Defects resolved

The initial review correctly recorded a solo Blademaster wipe, a decoder warning and an erroneous successful exit code. Those historical failures are superseded by the current checks above:

- Colyseus' global exception handler could absorb an assertion after test-owned shutdown. Test servers now disable that global handler; the full suite also explicitly preserves failure exit status. A separate child process deliberately fails after cleanup and is required to exit 1.
- The latency proxy used independent timers for frames. Under load they reordered otherwise reliable WebSocket traffic. A 2,000-frame echo probe against the old implementation recorded 907 out-of-order observations. One FIFO/timer per direction now preserves order. The 512-frame regression and full network decoder check pass without suppressing warnings.
- The melee agent waited for the expanding ring itself to arrive in a delayed snapshot. At close range the damage already occurred. Test players and companions now anticipate arrival from the existing visible ring windup. Humans retain the same combat rules.

Some room fixtures still log unregistered initial `personal` messages before installing handlers. They explicitly request subsequent private state and verify it. The expiry fixture intentionally attempts an expired room and logs its expected rejection. Neither warning is counted as a decoder failure or hidden from logs.

## Equipment and art evidence

Four armor slots replace the former single armor item: helmet, chest, paired arms and paired legs. Item generation, comparisons, stats, companion selection, wire appearance and rendered attachments use the same slots. The network protocol/content versions were bumped so older clients fail clearly.

Tests verify one swap cannot mutate another slot, steal another player's item or duplicate equipment; health is not healed by swapping; affix budgets are distributed across the full set; replacing a helmet preserves the existing chest/arms/legs meshes. Three-client tests equip all slots, reconnect with exact item IDs, then restore original checkpoint gear on retry. Browser UI tests earn and equip the guaranteed Strand helmet and assert the other equipped IDs stay unchanged.

Final source adds shaped bodies/helmets, tapered chests, domed pauldrons and upgraded-piece accents. Street structures gain recessed windows, cornices and varied masonry; bus render/collision height is 4.4 m. Generated previews in `test-results` are review artifacts, not user art approval.

## Rendering observations and limits

- Previous retained Standard combat capture: 102 draw calls / 557,104 triangles.
- Revised Standard combat capture: 119 draw calls / 76,728 triangles. Scene populations/timing can differ, so this is an observed scene comparison rather than a controlled FPS benchmark.
- Direct geometry accounting for the same eight building shells: 545,212 → 55,472 triangles. Fine mortar detail is now a generated repeating texture; structural blocks and exposed three-dimensional window/stone details remain geometry.
- Ten browser room/rig restart samples: 31–32 geometries and one texture, without growing resource counts. These sanctuary cycles do not establish long-session memory behavior on every stage.
- Compressed production JS approximately 190 KiB, CSS approximately 4 KiB. Controlled cold-network startup remains unmeasured.
- Low/Standard 60-second stress runs on Iris Xe/M1-class devices, supported-browser coverage and five-room hosting capacity remain unverified. Cloud software-rendered frame timings are not consumer FPS results.

## Release gates

| Gate | Current status |
| --- | --- |
| R01 load/capability/recovery | Passed locally; hosted clean load pending |
| R02 solo every class | Simulation and corrected real-network roster suite pass; human completion unverified |
| R03 two/three clients | Local independent connections complete; hosted separate machines pending |
| R04 class identity | Rules/resources verified; human feel pending |
| R05 loot behavior | Rules and independent armor verified; human understanding/visual review pending |
| R06 enemy counterplay | Behaviors implemented and exercised; human readability pending |
| R07 destruction | Material thresholds, collision and shared collapse/recovery pass |
| R08 wipe/retry/replay | Simulation, room and browser restart checks pass |
| R09 network disruptions | Snapshot, leader exit, freeze and actual grace expiry pass |
| R10 performance/browsers | Geometry improved; consumer-device stress and browser coverage pending |
| R11 hosted delivery | Source repository exists; public Node host is not connected/verified |
| R12 fresh human playtest | Unverified |

All eight represented Strand building shells are built from removable structural blocks. Underground boundary walls and distant skyline are authored scenery; selected cover and pillars remain breakable. Surface cells are finer than physics blocks. The slice does not provide arbitrary excavation, climbing or durable server-restart persistence.

Committed review captures: [Marksman](review/marksman-armor-preview.png), [Blademaster](review/blademaster-armor-preview.png), [Evoker](review/evoker-armor-preview.png), [combat](review/combat.png). The class previews include the final helmet shaping; the combat capture comes from the preceding 15-check browser run.
