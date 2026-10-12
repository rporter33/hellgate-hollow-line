# Asset sources

All visible world volumes, modular props, articulated character rigs, enemy rigs, boss plates, particles and loot beams are authored in this repository. Terrain cells use 0.5m voxels; character surface cells use 0.025m voxels, enemy surface cells use 0.03125m voxels, and architectural detail uses 0.0625m cells. Structural destruction uses larger authoritative blocks, separate from visual surface cells. Only exposed cell faces are merged into each mesh. Original station-sign textures are drawn locally with Canvas; a generated 32×16 masonry texture supplies mortar detail without subdividing every wall face. No runtime image or font CDN is used.

Sound effects, bell harmonics and atmospheric drones are original Web Audio synthesis in `apps/client/src/audio.ts`. No third-party recordings are bundled.

Three.js (MIT), Colyseus (MIT), Express (MIT), Vite (MIT), and their transitive dependencies retain their package licenses. UI fonts are browser system sans-serif and Georgia/serif fallbacks. Relic symbols are text glyphs.

Hellgate: London, its factions and class families are used as the requested unofficial fan continuity. This project does not claim affiliation with the original rights holders. London 2048, The Hollow Line, mission, monsters, gear powers and assets are new fan-authored work.
