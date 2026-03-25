# MVEE — Changelog

All notable changes to Multiverse: The End of Eternity will be documented in this file.

Format: [Semantic Versioning](https://semver.org/). Newest first.

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
