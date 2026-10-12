# Vertical Slice Acceptance Criteria

These are **requirements for the future build**, not checks already passed. The planning phase supplies no running game. Sol 6.1 should record observed results in `docs/validation.md`, including build identifier, browser, machine, test conditions, and pass/fail/unverified status.

## Release gates

| ID | Scenario | Passing result |
| --- | --- | --- |
| R01 | Open the deployed client from a clean browser | Title and controls load; no missing subpath assets; supported-browser capability check; connection failures explain a recovery action |
| R02 | Complete solo with each class | Blademaster, Marksman and Evoker can clear every required encounter, kill the boss, extract, and replay using ordinary controls |
| R03 | Complete with two and three real clients | Both party sizes finish against the deployed backend; the three-player test includes separate machines and a mixed-class party |
| R04 | Observe class identities | Melee Zeal generation/spending, ammunition/charge/reload, and Focus/chain/pull each function and lead to distinct combat decisions |
| R05 | Exercise all loot behaviors | Each of six relics and three mods produces its specified visible behavior; all proc, ownership, range, and no-recursion rules hold |
| R06 | Fight the full enemy roster | Four regular archetypes, both elite modifiers, and both boss phases use readable tells and appropriate counters; starter gear can still win |
| R07 | Break cover and armor | Barricade, optional wall, and boss plates update rendering, collision, navigation where applicable, and all clients consistently |
| R08 | Die, wipe, retry, and replay | No softlock, duplicate reward, orphan projectile, stuck input, or accumulating listener; restored checkpoint state agrees on every client |
| R09 | Network disruptions | Leader exit, one-player disconnect, refresh/reconnect within 60 seconds, reconnect expiry, and all-client disconnect follow the defined rules |
| R10 | Performance and compatibility | Declared supported browsers and available reference devices meet measured budgets; unavailable coverage is explicitly unverified |
| R11 | Published delivery | Actual reachable client URL, game-server endpoint, source repository, deployment configuration, and observed hosted-session evidence are supplied |
| R12 | Human playtest | Class feel, first relic discovery, enemy recognition, camera comfort, and replay interest have been observed and recorded |

## Focused automated checks

Use simulation tests for rules that can fail silently and room integration tests for shared-state invariants. Prefer meaningful scenarios to tests that simply assert configuration constants.

| ID | Test | Expected invariant |
| --- | --- | --- |
| T01 | Hold attack at several render rates | Server damage, cooldowns, reload completion and resource spend depend on simulation time, not rendering or message frequency |
| T02 | Duplicate, stale, malformed and accelerated input | No extra movement, attacks, rewards, invalid positions, or server exception |
| T03 | Sweep a melee attack across multiple enemies | Each eligible target is hit once; walls prevent the hit; reach and facing matter |
| T04 | Shoot with camera peeking past solid cover | Weapon-to-target obstruction still stops the shot |
| T05 | Combine Cinder Choir, Arc Coil and a crowded pack | Arc Coil increments once per successful primary attack; secondary damage cannot retrigger mods or relics |
| T06 | Generate many drops for each class and seed | Weapon compatibility, distinct affixes, random-drop cap, guaranteed relic choice, and deterministic content choices remain correct |
| T07 | Two players collect, equip, or request the same reward concurrently | Only the owner receives the item; one request commits; no duplication or cross-player removal |
| T08 | Fill bag then choose the mandatory relic or swap a mod | Reward remains usable and no item disappears; server and UI agree |
| T09 | Wipe after acquiring loot and destroying cover | Inventory, reward flags, collision, world revision and encounter RNG restore together; pre-wipe commands are rejected |
| T10 | Cross the boss phase threshold with simultaneous hits | Transition executes once, adds spawn once, phase cannot regress, and death/extraction reward fires once |
| T11 | Remove a player during combat | Current enemy scaling stays fixed; next encounter/retry recalculates; remaining players retain the expedition |
| T12 | Concurrent revives, interruption, expiry, party wipe | One revive result; interruption cancels; timer expires correctly; all-incapacitated party can retry |
| T13 | Restore a reconnect snapshot after several world changes | Same avatar, gear, health, boss phase, broken cover and reward state; no extra seat or replayed damage |
| T14 | Attempt a fourth join, new join after deploy, or expired reconnect | Clear rejection; existing room is unaffected |
| T15 | Two rooms run the same mission concurrently | No cross-room entities, pings, rewards, players, RNG mutations, or checkpoint transitions |
| T16 | Corrupt local records, deny storage, or mismatch protocol | Game handles records safely; incompatible network builds fail clearly instead of desynchronizing |

No automated browser script alone proves combat feels good. Use supported browser tools for navigation and observable UI; run server integration clients for deterministic network cases. Report unavailable browser tooling rather than claiming visual or pointer-lock testing from unit tests.

## Manual co-op journey

1. Player A creates a room and selects Blademaster. B joins as Marksman, C as Evoker; a fourth browser is rejected. All ready and deploy.
2. Confirm each player can act independently and sees the others' attacks. Open B's inventory: A and C continue, while B has no stuck movement or fire.
3. Break a barricade with A. B can shoot through the opening; C sees the same missing blocks. Enemies navigate the new opening.
4. Pick up personal loot simultaneously. Each player receives a compatible item and separate Concourse relic choice. One player delays the choice until the next safe checkpoint.
5. Down B, interrupt C's first revive with damage, and complete A's second revive. Let one player expire to spectator, clear the encounter, and confirm their return.
6. Disconnect C after an equipment change and a destroyed wall. Reconnect within 60 seconds and confirm exact current state. Repeat with an expired reconnect.
7. Have the leader explicitly leave an ongoing run; the remaining clients continue and leadership transfers. In a fresh run, disconnect everyone and confirm room pause/grace expiry behavior.
8. Wipe against the boss, retry, cross the phase transition with simultaneous damage, win, and extract. Verify individual relic rewards and records.
9. Repeat a hosted two-player completion and solo completion. Run three of the same class in a stress encounter to catch duplicated effect assumptions.

Repeat the critical combat and recovery journey at a simulated 100 ms RTT, 30 ms jitter, and 1% packet loss. Because WebSockets use reliable transport, packet loss may appear as delayed delivery rather than lost game commands; test the resulting stalls. Also assess 150 ms RTT for playability. Use actual network shaping or a documented bidirectional latency harness, not merely delayed visual animation.

## Performance procedure

Use the same 60-second stress encounter for comparisons: three player avatars, twelve active enemies including a boss-capable actor, repeated projectile and chain attacks, and at least two destruction bursts. Warm shaders before collecting combat frame statistics. Separately measure cold-cache page startup at 20 Mbps and 100 ms latency. Do not include waiting for friends in mission time.

Record median FPS, 95th-percentile frame time, draw calls, visible triangles, peak projectile/particle counts, encoded network traffic, and server tick work. Test Low at 1280 by 720 on an Iris Xe class machine and Standard at 1920 by 1080 on an M1 class machine or document the actual substitute. Check ten restart cycles for retained entities/listeners and rising live GPU resource counts. Load-test five separate three-player rooms on the actual server tier before claiming that capacity.

Performance budgets are in `DESIGN.md` and `slice-spec.json`. Cloud headless rendering can find crashes but does not establish consumer-device frame rate. Mark missing device measurements as unverified.

## Human playtest questions

Recruit five fresh players if available, including one group of three. Observe before prompting. Initial success targets are: four of five land a hit within 30 seconds of deploying; four of five equip the first guaranteed relic without help; four of five can describe how it changed an ability; three of five voluntarily try another class or ask for another run. These are directional signals for a tiny sample, not statistical product validation.

Ask which enemy forced them to change tactics, what made a drop exciting, whether they understood a death, and whether camera or latency interrupted their actions. Record time to first kill, first equipment change, main-route completion, deaths, and replay choice. If human testers are unavailable, deliver an internally verified preview and state that human validation remains open.
