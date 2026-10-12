# Implementation status

M0–M3 implemented and tested. M4 visual revision in progress after user feedback about squat characters and world scale. Original Hellgate references examined; visual questions are pending. M5 deployment files prepared; hosting blocked by access.

Architecture: npm workspace, Three.js/Vite/TypeScript client, authoritative Node/Colyseus server. Static client hosting is independent of the Node backend.

Launch (after install): `npm run dev`. Production: `npm run build`, `npm run start:server`.

Verification: typecheck/build pass; 19 simulation scenarios pass. Three live WebSocket clients verified movement, destruction, capacity rejection, combat, personal loot, revive, checkpoint retry and leader exit. Initial-tuning real-network full runs passed at 1/2/3 clients under latency/jitter/stalls. Longer-boss network runs passed at 1/2/3 clients across successive checks; the last Blademaster check passed after dodge tuning. A final all-roster rerun and a rare Colyseus decoder warning still need resolution. Actual 60-second expiry and boss/gear/cover reconnect passed. Production Chromium UI and refresh/reconnect passed with no page errors; ten restart cycles passed with stable GPU resources; revised art remains pending.

Hosting: GitHub account read access works for `rporter33`, but creating `hellgate-hollow-line` failed with `Resource not accessible by integration (createRepository)`. No existing Hellgate repository was found. Render/Railway are available but not connected. Sites helper scripts are unavailable. Source is `/workspace/hellgate-hollow-line`; no public playable URL is claimed. Consumer hardware, hosted/separate-machine sessions, human feel and first-player mission duration remain unverified.

Changes from baseline: Bellwether health 3,800 → 8,400; dodge invulnerability 0.18s → 0.25s; pre-boss Zeal fills to 100; optional AI fills empty slots (maximum total squad 3), uses normal combat/loot/revive rules, and freezes without a connected human. A lone human's menu pauses companions. Companion work was requested during implementation.

Resume: settle the three pending art-direction questions, rebuild proportions/architecture accordingly, resolve the decoder warning, rerun final room/browser checks, package the source, then obtain a writable target repository and connected Node host.
