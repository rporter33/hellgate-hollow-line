# Sol 6.1 Implementation Handoff

Build **Hellgate: London — The Hollow Line**, an unofficial voxel fan sequel with a complete 10–12 minute mission for **one to three online players**. This folder is a planning package, not a game implementation. No repository, hosting service, or playable URL has been created in this phase.

Read `DESIGN.md` for behavior, `slice-spec.json` for content IDs and numerical baselines, and `ACCEPTANCE.md` for release gates. The user's confirmed requirements take precedence: a direct Hellgate: London fan sequel, interesting classes/action/enemies/loot, voxel construction, a browser-playable vertical slice, and up to three players. Camera, mission, technology, and balance are the recommended implementation choices in this handoff.

## Fixed delivery scope

- Third-person desktop browser play, online solo and invite rooms of two or three. Duplicate classes are allowed.
- Blademaster, Marksman, and Evoker, each with primary, secondary, and signature actions, plus shared dodge and medkits.
- One authored London street-to-Underground route, one optional crypt, four regular enemies, two elite modifiers, and the Bellwether boss.
- Three equipment slots, one weapon mod socket, six Legendary relics, three mods, eligible affixes, personal loot, and guaranteed rewards.
- Shared server-authoritative combat, destruction, checkpoints, party wipes, revives, and reconnects.
- Complete menus, sound, readable voxel art, settings, local completion records, and deployed client plus server.

Do not silently replace this with an isometric shooter, a menu mockup, a generic survival arena, a solo-only demo, or an unnetworked simulation of extra players. Intermediate prototypes are useful milestones and must be labeled as such.

## Selected technical shape

Use a small npm-workspace monorepo. Vite/TypeScript/Three.js serve the browser; Node.js/Colyseus runs the authoritative room simulation. Match and lock client/server/schema package versions. Use WebGL 2 and secure WebSockets in production. A one-player room uses exactly the same server rules as a three-player room.

```text
apps/
  client/
    src/game/          orchestration, rendering, audio, input, camera
    src/net/           SDK adapter, interpolation, prediction, reconciliation
    src/ui/            title, lobby, HUD, inventory, settings, recovery
    public/            original or licensed static assets
  server/
    src/rooms/         ExpeditionRoom, lobby, reconnection, snapshots
    src/systems/       combat, AI, encounters, loot, checkpoint logic
    src/http/          health check and allowed-origin configuration
packages/
  shared/
    src/content/      typed classes, enemies, gear, encounters, voxel groups
    src/sim/          math, fixed-step movement, collision, damage rules
    src/protocol/     schema, validated commands, version and event IDs
tests/
  simulation/         combat, loot, checkpoint and destruction invariants
  rooms/              real room lifecycle and multi-client integration tests
  browser/            user journeys with supported browser tooling
docs/
  design/             this planning package
  validation.md       observed results, device details, unresolved failures
  deployment.md       actual endpoints, commands, environment variables
```

Avoid importing rendering or browser APIs into `shared` or `server`. Share collision data and movement math, not live Three.js meshes. Translate the planning JSON into typed content; descriptive effect strings are requirements to implement, not an attempted generic scripting engine.

Intended scripts are `dev` for client plus local server, `typecheck`, `test`, `test:rooms`, `test:browser`, `build`, and `start:server`. Implement only scripts that actually run. Keep generated builds, caches, credentials, and local test output out of version control. The public client backend URL is configuration; hosting credentials remain server or CI secrets.

## Build order and exit gates

Build networking first and add playable behavior incrementally. Each milestone ends with a demonstrable result; continue until the final release gate or a concrete external blocker.

| Milestone | Work | Exit evidence | Planning effort |
| --- | --- | --- | --- |
| M0 Connected foundation | Workspace, versioned protocol, Colyseus room, maximum three seats, invite code, class lobby, voxel room, predicted movement, shared breakable wall, reconnect | Three separate clients see the same movement and wall state; fourth client is rejected; leader disconnect does not end the room | 2–4 focused developer days |
| M1 Combat proof | Marksman kit, health/dodge, Runner and Spitter, server damage, personal drop, inventory, basic sounds, down/revive and checkpoint | One- and three-player 90-second arena runs; no duplicate kills, loot, or damage under latency | 3–4 days |
| M2 Complete mission loop | All route zones, Bulwark, Cantor, boss phases, rewards, regroup transitions, wipe/retry, extraction and replay | Entire mission completed solo and with three Marksmen; this remains an intermediate one-class build | 3–5 days |
| M3 Class and loot depth | Blademaster and Evoker, all six relics, three mods, affixes, all party-size scalars, both elite modifiers, optional crypt | Each class completes solo; mixed party completes; every relic's behavior is visible and verified | 4–6 days |
| M4 Presentation and resilience | Voxel rigs, animation poses, landmark props, lighting, sound mix, settings, reconnect UX, constrained effects, production UI | New players understand the first fight and relic; browser and performance checks meet the chosen release targets | 3–5 days |
| M5 Hosted release | Build/deploy files, hosted server, client subpath, health check, cross-machine sessions, final documentation and evidence | Actual hosted one-, two-, and three-player completions, source link and release record | 1–2 days |

Planning range: **16–26 focused developer days before contingency**, or approximately **20–33 days with 25% integration and playtest reserve**, for one experienced builder using simple original voxel assets. This is a scope estimate, not a promised Sol 6.1 runtime. Hosting access, asset polish, device availability, and networking bugs can change elapsed time. Do not compress the release gates to meet an invented single-session deadline.

The critical path is M0 connectivity → M1 authoritative combat → M2 full loop → M3 class/loot differentiation → M4 observed polish → M5 hosted verification. Art roughing can proceed during implementation, but there is no need for multiple agents. Do not defer reconnect, personal loot ownership, or server authority until after content is complete.

## Implementation decisions that prevent rework

The server owns time and accepts intent. It validates movement, cooldowns, aim, equipment changes, and reward ownership. Use 30 Hz fixed simulation, 30 Hz sequenced inputs, 20 Hz state patches, and interpolated rendering. Predict only local movement and presentation. The server confirms hits, inventory, drops, checkpoints, and destruction. No peer host, full rollback, or cross-server state migration is required.

Use a shared action pipeline with stable IDs. A damage source records owner, ability, direct/secondary tags, and affected target IDs. Proc effects cannot recurse. Checkpoints restore inventory and reward flags together. Each wipe increments the state revision, invalidating old commands. Reconnection sends the authoritative current world, including broken voxel groups and boss phase.

One-player menus can pause the room; co-op menus cannot. When another player is present, clear local input while menus are open but continue the server. Request and acknowledge solo pause instead of only freezing the renderer. No one can trigger a party reset merely by opening a menu or leaving.

Generate static voxel meshes once, sharing materials. Apply destruction to bounded groups and synchronize the removed-group set. Use simple capsules, boxes, ramps, and zone navigation grids. Implement a camera that behaves correctly around cover before decorating narrow corridors. Do not allocate a mesh or rigid body for every terrain voxel.

Drop and reward tables are personal. Mandatory relic choices must survive a regroup transition and bag-full cases. Duplicate-class parties must work. Dead or disconnected avatars cannot collect items until they are active again; the server preserves their pending rewards during the reconnect grace period.

## Deployment recipe

The preferred client target is GitHub Pages under `/hellgate-hollow-line/`. The preferred backend is one Node web service on Render, or an existing compatible authorized host. Prepare these outputs during development:

1. A CI workflow that installs the lockfile, typechecks, runs simulation and room tests, builds both workspaces, and publishes the client artifact only after successful checks.
2. Server build/start commands, a health route, protocol/version handshake, allowed client origin, provider port binding, and explicit room/capacity limits.
3. An environment example with `VITE_GAME_SERVER_URL`, `ALLOWED_ORIGINS`, `PORT`, `MAX_ROOMS`, and `NODE_ENV`; no credential values.
4. A repository-relative Vite base and asset loading that succeeds after a direct page reload.
5. A backend deployment descriptor and instructions for selecting the actual host plan and region. Start with one instance; do not enable autoscaling.
6. A tested deployment order and rollback note: deploy a matching server/client protocol pair, reject incompatible versions clearly, and expect an in-memory run to end on a backend restart.

No hosting account or repository owner was selected during planning. Finish implementation and local verification before asking for any necessary concrete access or charged-hosting approval. An existing authorized host can be used without reopening settled design questions. A free sleeping service is suitable for a preview with a loading message, but it does not meet a fast room-start target after idle. Record the hosting choice and its actual limitations.

Sites can host the static client if GitHub Pages is unavailable; follow the Sites skill in that build session. It does not remove the selected Node backend requirement. The final status must distinguish a private preview from a publicly reachable multiplayer release.

## Main risks and controls

| Risk | Early proof or control | Scope response if unresolved |
| --- | --- | --- |
| Co-op state divergence | Three-client movement, damage, destruction and reconnect checks in M0–M1 | Repair authority and protocol before adding content |
| Melee camera obstruction | Blademaster against cover, stairs, and boss sweep as soon as its kit exists | Widen geometry and simplify occluding props |
| Loot feels cosmetic | Compare an unmodified and modified attack in the same encounter | Improve the existing six relics before inventing more items |
| Particle and voxel overload | Stress scene with three Evokers, twelve enemies, and destruction | Reduce decorative effects, surface count, and shadow cost |
| Party death or departure softlocks | Down/revive, all-down, explicit leave, timeout and reconnect scenarios | Simplify transitions; preserve clean checkpoint recovery |
| Content breadth consumes polish time | Finish the whole route with one class before completing the other kits | First remove decorative variation; then propose deferring the optional crypt |
| Deployment blocked by access | Prepare source, tests, build artifacts and exact deploy settings independently | Report the specific missing host/repository input; do not call a localhost URL shipped |

The protected core is 1–3 real online players, three distinctive classes, clear combat, personal build-changing loot, one completed mission, and stable recovery. Reducing that core requires an explicit scope revision.

## Copyable starting prompt

> Implement the browser vertical slice in this planning package. Read DESIGN.md, slice-spec.json, and ACCEPTANCE.md before coding. Build Hellgate: London — The Hollow Line as an unofficial voxel fan sequel for one to three online players. Use the recommended Three.js/Vite client and authoritative Node/Colyseus server unless repository constraints demonstrate a better compatible choice. Start with M0 three-client connectivity and continue through the complete mission, all three classes, personal loot, revives, reconnect, polish, and deployment. Treat the roadmap's prototypes as intermediate results. Preserve the user-confirmed direct fan sequel and three-player scope. Validate real shared combat and world state, not only the lobby. Keep a concise record of completed milestones, commands, observed tests, and blockers. Prepare a concrete deployable result before asking for missing hosting access or any paid-service approval. Deliver the actual playable URL and source link, with an honest statement of anything unverified.

If work spans sessions, leave an implementation progress file containing the current milestone, exact start commands, last passing checks, observed failures, changed tuning, and deployment state. Do not restart the design phase or reopen already confirmed user choices without a concrete conflict.
