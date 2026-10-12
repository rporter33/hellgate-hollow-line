# Observed validation — 12 October 2026

Build: protocol `hollow-1`, content `2026.10.12-1`. Node 24.19.0, Linux cloud executor. Browser: Chromium 154.0.8037.57, headless WebGL 2 via SwiftShader. Hardware targets and human playtests remain unverified.

## Passed evidence

- TypeScript typecheck and production client/server build.
- 19 simulation scenarios: bounded/stale/malformed input; cover obstruction; personal ownership and one-time pickup; checkpoint loot/destruction rewind; interrupted revive and wipe; compatible distinct affixes; solo kits and mixed-party mission completions; independent boss plates and single phase/add transition; every relic's rules; all three mod rules; full-bag rewards/mod swaps; companion combat/revive/freeze; optional crypt entry and retained mod choice.
- M0/M1 actual WebSocket integration: three clients agree on movement, destroyed wall, enemy kills, personal loot, revived avatar and checkpoint retry. Fourth client rejected. Same-avatar reconnect and leader exit passed.
- Complete real WebSocket runs at the initial boss tuning passed for Blademaster, Marksman, Evoker, two clients and a mixed three-client party. Transport harness delays both directions by 50ms with ±15ms jitter and 1% 100ms reliable-delivery stalls. All clients are separate connections on one physical machine.
- Real 60-second reconnect-grace expiry passed, including restoration after equipped gear, broken platform cover and boss phase changes; fresh mid-run join rejection; protocol rejection; leader transfer; and freezing after all humans disconnect.
- Production-build Chromium UI: title/assets, class selection, two companions, pointer lock, keyboard movement, mouse firing, companion kills, inventory, authoritative solo pause with AI, settings, page-refresh reconnect to the same avatar, immediate post-reconnect movement, and 1280×720 / 1920×1080 panels. No page errors were observed.

## Current rechecks

Boss base health increased from the handoff's 3,800 to 8,400 after measured fights were too short. The first longer network runs exposed inadequate bot evasion of expanding rings and ground markers. Bot and companion steering now crosses rings toward their source and leaves fixed strike markers; full real-network completions are being rerun. Passing initial-tuning runs are not claimed as a pass for the new tuning.

The user requested taller proportions and an original-Hellgate art-direction pass. Reference study and visual clarification are in progress. The prior browser result does not certify the yet-to-be-rebuilt figures. Ten browser room/rig restart cycles passed with exactly 11 live geometries and one texture on every cycle. No page errors were observed.

## Limits and open release gates

| Gate | Status |
| --- | --- |
| R01 load / capability / recovery | Passed locally; hosted load pending |
| R02 solo every class | Simulation passed; initial-tuning WebSocket runs passed; final-tuning rerun pending |
| R03 two/three clients | Initial-tuning local network runs passed; final rerun pending; separate-machine hosted runs unverified |
| R04 three class identities | Rules and resource use verified; human feel unverified |
| R05 relics / mods | Behavior invariants verified; all visual effects need final art-pass observation |
| R06 enemy counterplay | Roster and boss behavior implemented/tested; human readability unverified |
| R07 tactical destruction | Shared wall/cover removal, navigation, collision and plates tested |
| R08 wipe / retry / replay | Rule and room recovery passed; ten browser cycles passed |
| R09 network disruption | Same-avatar snapshot, leader exit, all-disconnected freeze and actual expiry passed |
| R10 performance / browsers | One cloud Chromium run observed; consumer devices, Edge, Firefox and Safari unverified |
| R11 hosted delivery | Blocked by Node host connection and new-repository creation permission |
| R12 fresh human playtest | Unverified |

An earlier 720p cloud scene used 18 draw calls and 31,590 triangles; median software-rendered frame time was about 68ms. This is a cloud crash/readability check, not an Iris Xe or M1 performance result. The compressed client is about 188 KiB (JS/CSS/HTML), below the 12 MiB transfer budget; controlled cold-network startup and final stress-device budgets remain unverified.

Perfect-input bots complete the mission much faster than the 10–12 minute first-human target. No human duration claim is made. Dodge invulnerability was tuned from 0.18s to 0.25s for the longer latency-tested melee fight. Pre-boss resupply fills Zeal as well as Focus/ammo. Final duration and difficulty require playtesting. In-memory runs end on backend restart; this is expected architecture, not durable persistence.
