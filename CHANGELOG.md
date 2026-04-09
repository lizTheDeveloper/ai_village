# MVEE — Changelog

All notable changes to Multiverse: The End of Eternity will be documented in this file.

Format: [Semantic Versioning](https://semver.org/). Newest first.

---

## v0.3.1 — 2026-03-29

### Fixes
- **Hand pickup lore discovery wiring** — context-menu `Pick Up (Hand)` now emits `hand:carry`, and `hand:carry` emits `lore:discovery` species encounter events, so pickup interactions are exported to the Akashic lore pipeline instead of only affecting biochemistry

---

## v0.3.0 — 2026-03-28

### What's New
- **6 new folkloric species** — Jiangshi-Vel, Sachamama-Vel, Djinnahl, Tengu, Kappa, and Kumiho implemented from Akashic Records with full theological frameworks and unique moral primitives
- **Cultural Drift system** — deck-scoped customs now evolve organically over time within villages
- **ExtinctionVortexSystem** — 3-phase species extinction detection with grace period prevents premature die-offs
- **Cross-game event bus** — PortableMyth, PortableDeity, and PortableRitual exporters enable lore to travel between Multiverse games
- **CreatureImportFactory** — Precursors Norn → MVEE entity transfer pipeline with genetic reconstruction
- **Genetic time capsule** — archival, checksums, and discovery mechanics for preserved genomes
- **Lore discovery bridge** — wired to religion systems with myth propagation, mutation, and event consumers
- **Ship exterior view** — Phase 4 ship visualization with defense systems and section detach
- **Ship Powers registry** — creature manipulation powers via ship machines, with persistence and DevPanel integration
- **EighthChildDetectorSystem** — rolling presence-over-power detection for the Eighth Child event
- **Social lifecycle reactions** — norns now react socially to lifecycle events (births, deaths, coming-of-age)
- **Gossip protocol Phase 1a** — star chart data model and gossip storage for inter-village knowledge sharing
- **Universe Gallery** — import postcards via share code, with localStorage persistence
- **Zones of Thought** — Browser LLM Phase 4 integration for local creature cognition
- **Mobile touch controls** — responsive window system, section-based zoom navigation, panel drawer, sound toggle
- **Parallax starfield** — visible when scrolling above ship boundary
- **Angel migration service** — graduated Norn import from Precursors
- **Content service** — Postgres-backed content management

### Performance
- **MovementSystem** optimized from ~140ms to <20ms per tick
- MythGeneration and Retelling spatial search replaced with SpatialGrid (was brute-force O(n²))
- Engine bundle split into parallel-loadable chunks for faster initial load
- 5 hot-path systems optimized to reduce tick time toward 20 TPS target
- Mobile sprite lazy-loading with manifest, deferred animations, and priority queue
- Extinction monitor query hoisted above loop

### Fixes
- HolyTextSystem replaced — LLM generation instead of Mad Libs templates
- SchismSystem now wired to species moral frameworks for culturally meaningful splits
- Myth exporter bridge mappings aligned to actual event shapes
- TDZ crash in engine-infra bundle resolved
- Genesis cinematic HTML escaping prevents LLM text leakage
- Sprite 404s eliminated — metadata-driven animation loading
- Sound settings crash guard for masterMuted
- PWYC button redesigned from invisible heart to labeled pill
- WebGPU canvas context guarded before renderer commit
- LLM naming response validation prevents undefined species names
- Audio path corrected for Traefik routing
- Multiverse API routes mounted in production server
- GlitchTip DSN migrated from themultiverse.school to multiversestudios.xyz
- Mobile tap targets increased to 44px minimum for accessibility
- Biosphere lazy-loading fix for prebuilt Docker containers

---

## v0.2.1 — 2026-03-25

### What's New
- **Precursors lineage metadata** — species and race templates now carry Precursors origin data
- **Postcard system** — ServerPostcardSource for classmate galaxy browsing, upload/fetch via SaveLoadService, annotation length limits
- **Batch 2+3 civilization templates** — 14 voice profiles, 12 moral frameworks, moral primitives for 10 species, 171 new buildings across 37 species
- **Ship and technology design briefs** — design documentation for all folkloric species

### Fixes
- 19 TypeScript build errors in magic package effect appliers resolved
- Species policy NN endpoints use BASE_URL for correct production path routing

---

## v0.2.0 — 2026-03-24

### What's New
- **Species morality system** — each species now has unique moral frameworks: Dragons evaluate pattern-density across timestreams, Ethereans use consensus-field coherence
- **Moral-conflict-driven schisms** — village schisms now emerge from genuine moral disagreements instead of random triggers
- **Species moral primitives registry** — shared belief templates replaced with per-species moral foundations
- **Items Browser** — new admin capability tab for browsing items by species
- **LLM auto-recovery** — automatic 401 recovery for LLM providers prevents auth disruptions

### Performance
- Pre-compiled regex patterns and eliminated allocations in NN feature extraction (MUL-3511)
- Removed proportional yielding from NN inference — reclaimed 8-48ms/tick (MUL-3510)

### Fixes
- Graceful degradation when multiverse API and species NNs are unavailable (MUL-3508)
- Migrated support prompt to Checkout Sessions API (MUL-3514)
- Admin angel no longer echoes system prompt into chat (MUL-3397)
- Disabled broken SoA batch path — agents now move via per-entity loop (MUL-3342)
- Resolved sprite 404s for characters without animations (MUL-2645)

---

## v0.1.9 — 2026-03-23

### What's New
- Species PolicyNN integrated into game loop — neural network drives species behavior decisions (MUL-2920)
- LLM fallback responses now tagged with `speechSource` field for transparency (MUL-3012)

### Performance
- Eliminated ~18 redundant `world.query()` calls per tick across systems (MUL-3167)
- Dead plants and caravans now destroyed to prevent unbounded entity growth — was reaching 90k+ entities in 2 min (MUL-3118)
- ReadonlyArray for cached query results prevents accidental mutation (MUL-3167)

### Fixes
- **Critical:** SoA sync ordering fixed — agents now get current-tick velocity instead of stale data (MUL-3028)
- Production URL config fixed — no more hardcoded localhost in PlanetClient and MultiverseClient
- Notification rate limits and startup grace period prevent notification spam (MUL-3283)
- ProxyLLMProvider wired to game-proxy /api/llm/think endpoint
- Removed llama3.1-8b from LLM fallback chain (board directive)
- Multiple build and type fixes for `import.meta.env` across packages

---

## v0.1.8 — 2026-03-21

### What's New
- Plant knowledge and wild seed bank serialization — `PlantKnowledgeSerializer` and `WildSeedBankSerializer` added to persistence layer (MUL-21)

### Infrastructure
- CI/CD pipeline is now fully operational — GitHub Actions deploys to play.multiversestudios.xyz on every push
- Fixed 7 root causes that had blocked the pipeline since initial setup

---

## v0.1.7 — 2026-03-21

### Fixes
- **Critical:** `gameLoop` was not passed to `setupWindowManager`, causing a `ReferenceError: gameLoop is not defined` crash on every save load — game was 100% unplayable (MUL-2899)
- Removed `as unknown as` type assertion escape hatches in `PrayerSystem`, `AchievementService`, and `ThreatResponseSystem` — replaced with proper type guards

---

## v0.1.6 — 2026-03-21

### Fixes
- Added missing `createSpellSandboxPanelFactory` adapter and factory — `build:prod` was failing because `demo/src/main.ts` imported this factory but it was never defined. Follows existing SpellbookPanel pattern. Unblocks production builds.

---

## v0.1.5 — 2026-03-21

### Performance
- Fixed query-in-loop and `Math.sqrt` hot paths in 3 additional systems — reduces per-tick cost in those systems

### Fixes
- Removed `as unknown as World` type assertion escape hatches — replaced with proper type guards, improving type safety across affected files

---

## v0.1.4 — 2026-03-21

### Fixes
- **Critical:** Velocity integration was 1000x too slow — agents appeared frozen and animals barely moved. `MovementSystem.batchProcessVelocity` divided `ctx.deltaTime` by 1000 a second time despite it already being in seconds. All entities now move at intended speed. Speech resumes as agents can now reach interaction range. (MUL-2839, MUL-2840)

### What's New
- 21 unit tests for LoreExportCollector wiki pipeline — improves wiki export reliability coverage

---

## v0.1.0 — 2026-03-17

### What's New
- **Custom TypeScript ECS engine** — 200+ systems running at 20 TPS, built ground-up for this game
- **AI-powered village simulation** — agents with memory, skills, personality, and social relationships driven by LLMs
- **25 magic paradigms** — full magic system with spellbook UI, diverse schools of arcane practice
- **Procedural world generation** — biomes, dynamic weather, biome-aware seasons, and nutrient cycling
- **16+ species** across diverse biome environments including 11 new species added this sprint
- **40+ renderer panels** — rich UI covering agents, economy, relationships, memory, tech tree, spellbook, combat, and more
- **Genesis Vision cinematic** — first-session creation myth onboarding experience (Octalysis Drive 1: Epic Meaning)
- **Player avatar system** — players can inhabit and control a character in the simulation
- **Genetics system** — trait inheritance, mutation, and emergent species variation
- **Save/load with snapshot support** — persistent world state with time-travel-ready architecture
- **CI build gate** — automated TypeScript build verification and test regression detection

### Fixes
- Rendering artifacts: vertical line bands and interior black void in Ancient Ark eliminated
- Production bundle TDZ errors resolved — game now loads reliably on all browsers
- Sprite assets now correctly copied into dist/ during Vite production build
- Map/Set serialization fixed — silent data loss on save/load no longer occurs
- ExplorationSystem crash on negative coordinates fixed
- AdminAngelSystem no longer blocks the game loop with LLM timeout calls
- Test suite stabilized from 165 failing files → 13 failing files

### Known Issues
- Human playtesting in progress — launching to public after playtest sign-off
- LLM cognition pipeline blocked pending infrastructure resolution

## v0.1.1 — 2026-03-18

### Fixes
- **Critical:** Agent-brain TypeError (`t.getComponent is not a function`) crashing on every tick — agents can now process decisions normally (MUL-1847)
- UI heading mis-aligned on narrow viewports (< 600px) — layout correct at all screen sizes (MUL-1903)
- TypeError thrown when clicking the "direct" button — interaction now works as expected (MUL-1905)
- CivilizationalLegendsSystem had zero event subscribers — legendary events now fire and propagate correctly (MUL-1860)
- Admin dashboard showing "No Game Connected" after game load — dashboard now connects reliably (MUL-1902)

### Known Issues
- LLM cognition pipeline blocked pending infrastructure resolution
- Automated playwright tests cannot read TPS/FPS from canvas overlay (MUL-1768)

## v0.1.3 — 2026-03-20

### What's New
- **PatronBindingSystem** — patron souls can bind to agents via Drive 4 mechanics, with full UI (patron widget + toast notifications)
- **The Chorus expanded** — environmental hooks integrate world events into The Chorus; Spell Sandbox spells now affect the live world
- **Folkfork achievement integration** — server proxy + AchievementService tracking civilizational milestones
- **CivilizationChronicleService** — persistent milestone storage for civilizational history; agent and social milestones visible in the Chronicle panel, clickable for details
- **NarrativeSedimentSystem** — cross-game reading patterns integrate into the world simulation
- **Leaky Game ARG Phase 2** — lore export pipeline complete
- **D_cc metric service** — real-time D_cc (collective consciousness density) metric push for The Chorus

### Performance
- GameLoop all-entities query now cached, eliminating hot-path query-in-loop (MUL-2644)
- Math.sqrt eliminated from 7 systems; repeated hot-path patterns removed

### Fixes
- SongSystem audio now plays on user interaction (browser autoplay policy compliance)
- Security: high-severity CVEs resolved in react-router, rollup, flatted, brace-expansion
- WildPlantEntity species now typed throughout all biomes (replaced legacy `createFiberPlant`)
- Uplift system tests stabilized (ProtoSapience + BreedingProgram)

---

## v0.1.2 — 2026-03-19

### What's New
- **GreetingSystem** — agents greet each other on proximity (MUL-2165)
- **Angel/Divine Chat prominent in NUX** — new players are guided to the AI companion on first session (MUL-2217)
- **In-game support prompt** — players can request help from within the game (MUL-2175)
- **Right-click tile inspection** — inspect any tile and its contents via right-click (MUL-2191)
- **QA bypass token** — auth gate accepts a bypass token for automated testing (MUL-2147)

### Fixes
- **Critical (MUL-2174):** All TypeScript build errors resolved — CI/CD pipeline fully unblocked, production deploys restored
- Agent freeze when LLM provider is slow or unavailable — agents continue processing normally (MUL-2189)
- AgentBrainSystem now isolates per-agent errors, preventing cascading failures from one bad entity (MUL-1847)
- SeekCoolingBehavior stale entity reference crash fixed (MUL-1847)
- Lazy-registered windows now appear in menus; 'C' key shortcut conflict resolved (MUL-2323)
- Settings save callback now logs an error when not wired, rather than silently failing (MUL-2212)
- GriefResolutionSystem: agents who have never mourned no longer have cooldown treated as tick 0
- 42+ broken tests repaired across 17 test files (reduced to 2 flaky)

---

<!-- PM: Add new release entries above this line, newest first -->
