# Hellgate: London — The Hollow Line

An unofficial voxel action RPG fan sequel for **1–3 online players**, with optional AI companions filling empty squad slots. Three.js/Vite client; authoritative Node/Colyseus server. Original voxel art and synthesized audio.

The expedition travels from the Strand through a collapsed Underground concourse and Signal chamber to the two-phase Bellwether. An optional maintenance crypt offers a mod choice. Blademaster, Marksman and Evoker have distinct resources and attacks; six Legendary relics change abilities. Helmet, chest, arms and legs equip independently and visibly change the attached armor. Loot is personal. Cover destruction, revives, checkpoint retries and 60-second reconnection are authoritative.

## Run

Requires Node 22.12+ (verified with Node 24.19).

```sh
npm ci
npm run dev
```

Client: `http://localhost:5173`. Server: `http://localhost:2567`.

For the deployable production build (one Node service serves both client and game server):

```sh
npm run build
npm run start:server
```

Open `http://localhost:2567`. Friends on the same network can use your machine's reachable hostname/IP; deploy HTTPS/WSS for Internet play. Solo also requires the server.

Create a room, choose a class, optionally fill empty slots with AI, ready up, and deploy. Friends join by the six-character code or copied invite link. Fresh joins stop after deployment. Human players replace AI in the lobby; the total squad remains at most three.

## Controls

| Input | Action |
| --- | --- |
| WASD / mouse | Move / aim |
| Left mouse | Primary (hold to repeat) |
| Right mouse | Secondary (Marksman: charge 0.6s, release to fire) |
| Q / Space | Signature / dodge |
| E | Personal loot, gates; hold 3s to revive |
| R / H | Reload / medkit |
| I / Escape | Inventory / menu |
| Middle mouse | Team ping |

Only a single **human** player's menu pauses the server, including when accompanied by AI. Co-op menus clear local input while the world continues. Settings include sensitivity, invert Y, FOV, volume, quality and reduced motion.

## Verify

```sh
npm run typecheck
npm test
npm run test:regressions
npm run test:rooms
npm run test:full
npm run build
# With production server running, Python Playwright + Chromium installed:
npm run test:browser
```

`test:full` uses actual independent WebSocket clients and a bidirectional latency proxy, not fake network players. It exercises all solo classes and two- and three-player missions. All five local network rosters passed after fixing failure reporting, message ordering in the latency proxy, and melee agents reacting too late to ring windups. See [validation](docs/validation.md) for observed evidence and open gates. No human playtest or consumer-device performance claim is implied by bots or cloud Chromium.

## Deploy

`render.yaml` prepares a single free-preview Node service. It serves client and WebSockets from the same HTTPS origin, so it needs no browser backend URL. A separately hosted client uses `VITE_GAME_SERVER_URL=wss://<backend>` and an allowed origin. The Pages workflow supports `/hellgate-hollow-line/` after a live backend has been selected.

See [deployment instructions](docs/deployment.md), [implementation status](IMPLEMENTATION_STATUS.md), and the preserved [handoff](docs/design/BUILD_HANDOFF.md). Unfinished runs live in server memory and end on a server restart.
