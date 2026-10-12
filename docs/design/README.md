# Hellgate London The Hollow Line Planning Package

A direct Hellgate: London fan sequel, scoped for a **10–12 minute browser mission with one to three online players**. Prepared for Sol 6.1 on 11 October 2026. This package contains the plan and implementation handoff only; no game has been built or deployed.

Play Blademaster, Marksman, or Evoker through ruined London streets and an Underground breach. Fight four enemy archetypes and a two-phase boss. Choose a Legendary relic halfway through the run and immediately use its new behavior. Voxel destruction opens firing lanes and strips boss armor.

| Read | Purpose |
| --- | --- |
| [BUILD_HANDOFF.md](BUILD_HANDOFF.md) | Start here: build order, architecture, hosting recipe, estimates, risks, copyable builder prompt |
| [DESIGN.md](DESIGN.md) | Mission, class kits, combat, enemies, loot, co-op rules, presentation, technical budgets |
| [slice-spec.json](slice-spec.json) | Machine-readable baseline IDs, counts, tuning, reward rules and constraints |
| [ACCEPTANCE.md](ACCEPTANCE.md) | Release gates, meaningful tests, multiplayer journey and playtest plan |

The selected stack is a Three.js/Vite/TypeScript client plus an authoritative Node/Colyseus game server. GitHub Pages serves the client; a WebSocket-capable host such as Render runs the game server. Solo uses the same online simulation. Hosting account, repository owner, and deployment region are inputs for the build phase.

The protected scope is three distinctive classes, up to three actual online players, personal loot, shared destruction, revives and reconnects, a complete mission, and hosted delivery. Guardian, Engineer, Summoner, larger campaigns, and persistent characters follow later.

Confirmed user decisions: direct fan sequel, planning/handoff in this phase, up to three players. Recommended design assumptions: online invite co-op, over-the-shoulder camera, the Hollow Line mission, the selected stack, and all numerical balance values. Estimates and performance figures are targets, not observed results.
