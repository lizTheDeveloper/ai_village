# Grand Strategy Implementation Roadmap

**Generated:** 2026-01-19
**Last Updated:** 2026-01-20
**Based on:** Comprehensive spec audit of all 14 grand strategy specifications
**Current Status:** ~99% implemented (Phase 1-7.2 complete, performance testing pending)

---

## Executive Summary

**What's Working:**
- Village → City → Province → Nation governance chain (100%) ✅
- Ship → Squadron → Fleet → Armada → Navy hierarchy (100%) ✅
- Spatial tiers (Planet, System, Sector, Galaxy) fully coded (100%) ✅
- Universe forking, multiverse travel, background universes (95%) ✅
- All 15 technology eras with progression (95%) ✅
- All 22 megastructures defined with construction (90%) ✅
- Trade Network graph analysis, chokepoints, blockades (100%) ✅
- Navy budget system, personnel, shipyard production (100%) ✅
- Empire dynasty succession, civil wars, separatists (100%) ✅
- Federation & Galactic Council governance (100%) ✅
- Civilization uplift diplomacy & ethics (100%) ✅
- Collapse & dark age mechanics (100%) ✅
- Archaeological ruins & excavation (100%) ✅
- Exotic ship types with dedicated systems (100%) ✅

**Completed Phases:**
- ✅ Phase 1: Critical Integration (LLM governor execution, megastructure activation, city governance)
- ✅ Phase 2: High-Tier Governance (Empire, Federation, Galactic Council)
- ✅ Phase 3: Economic Depth (Trade networks, Navy budget, Resource discovery)
- ✅ Phase 4: Advanced Multiverse Features (Invasion integration, paradox detection, timeline merger)
- ✅ Phase 5: Civilization & Narrative Systems (Uplift diplomacy, Collapse system, Archaeology)
- ✅ Phase 6: Ship Systems & Combat (Ship combat resolution, Exotic ship types)

**Remaining Work:**
- Phase 7.1: Additional unit tests for remaining systems (in progress)
- Phase 7.1: Performance profiling (pending)
- Phase 7.1: Load testing (pending)
- Phase 7.2: Devlog and README updates (✅ complete)

---

## Phase 1: Critical Integration (High Impact, Immediate)

**Goal:** Make existing systems functional and connected
**Timeline:** 2-3 weeks
**Unlocks:** Basic grand strategy gameplay Village → Nation

### 1.1 LLM Governor Decision Execution (Week 1) ⭐⭐⭐

**Why First:**
- Governors generate decisions but nothing happens
- Unlocks strategic AI at all tiers
- Foundation for all high-tier gameplay

**Tasks:**
- [ ] Wire `GovernorDecisionSystem` to action executors
  - Empire: `absorb_nation`, `release_nation`, `declare_war`, `allocate_resources`
  - Nation: `set_tax_rate`, `declare_war`, `sign_treaty`, `prioritize_research`
  - Province: `set_priorities`, `request_aid`, `rebellion_response`
- [ ] Implement `delegateDirective()` propagation chain
  - Empire → Nation → Province resource quotas
  - Directive acknowledgment tracking
  - Audit trail for governance decisions
- [ ] Connect `conductVote()` to policy changes
  - Parliament votes → laws in NationComponent
  - Council votes → universal laws
  - Vote outcomes affect game state

**Files:**
- `packages/core/src/governance/DecisionProtocols.ts` (expand executeAction stub)
- `packages/core/src/systems/GovernorDecisionSystem.ts` (wire to LLMScheduler)
- `packages/core/src/systems/NationSystem.ts` (add policy execution)
- `packages/core/src/systems/EmpireSystem.ts` (add grand strategy execution)

**Test Success:**
- Emperor declares war → `WarState` created, military mobilized
- Parliament votes for tech → Research priorities updated
- Province requests aid → Resources transferred from nation

---

### 1.2 Megastructure Operational Transition (Week 1) ⭐⭐⭐

**Why Critical:**
- Construction completes but megastructures don't activate
- Blocks all megastructure gameplay

**Tasks:**
- [ ] Complete `createOperationalMegastructure()` in ConstructionSystem
  - Create `MegastructureComponent` on target entity when project completes
  - Set initial efficiency to 100%
  - Set phase to `operational`
  - Emit `megastructure_activated` event
- [ ] Implement resource consumption for maintenance
  - Hook faction/civilization inventory API
  - Check `maintenanceRequirements.resources` in MaintenanceSystem
  - Deduct resources on successful maintenance
  - Increase `maintenanceDebt` when resources unavailable
- [ ] Activate decay progression
  - Call `ageRuinsOptimized()` when efficiency drops to 0
  - Transition through decay stages (intact → weathered → crumbling → dust)
  - Emit `megastructure_decay_stage` events

**Files:**
- `packages/core/src/systems/MegastructureConstructionSystem.ts` (lines 470-471 TODO)
- `packages/core/src/systems/MegastructureMaintenanceSystem.ts` (lines 567-574 resource check)
- `packages/core/src/components/MegastructureComponent.ts` (add `maintenanceDebt`, `decayStageIndex`)

**Test Success:**
- Dyson Swarm construction completes → MegastructureComponent created with 100% efficiency
- Maintenance performed → Resources deducted from faction inventory
- No maintenance for 100 years → Structure degrades to ruins

---

### 1.3 City Governance Formalization (Week 2) ⭐⭐

**Why Important:**
- City tier has LLM director but no formal governance component
- Breaks Village → City → Province chain

**Tasks:**
- [ ] Create `CityGovernanceComponent` with departments
  - Agriculture, Industry, Military, Research, Infrastructure, Commerce
  - Budget allocation per department
  - Infrastructure project queue
  - City laws and policies
- [ ] Integrate `CityDirectorSystem` with `CityGovernanceComponent`
  - LLM decisions populate CityGovernanceComponent
  - Department staffing and budgets
  - Infrastructure project creation
- [ ] Link to village aggregation
  - Multiple villages → city population/resources
  - City policies affect member villages

**Files:**
- `packages/core/src/components/CityGovernanceComponent.ts` (NEW)
- `packages/core/src/systems/CityDirectorSystem.ts` (integrate component)
- `packages/core/src/systems/VillageGovernanceSystem.ts` (add city linking)

**Test Success:**
- City director allocates 40% budget to agriculture → Department shows allocation
- City passes infrastructure law → Villages receive construction directives
- 3 villages grow → City population aggregates correctly

---

### 1.4 Hierarchy Simulator Integration (Week 2-3) ⭐⭐

**Why Important:**
- New spatial tiers (Planet, System, Sector, Galaxy) exist but aren't in snapshots
- Megastructures not tracked in tier preservation
- Blocks save/load for interstellar gameplay

**Tasks:**
- [ ] Add megastructures to tier preserved fields
  - PlanetTier: `preserved.megastructures` array
  - SystemTier: `preserved.stellarMegastructures`
  - SectorTier: `preserved.galacticMegastructures`
- [ ] Create Sector & Galaxy adapters
  - `SectorTierAdapter.ts` - Aggregate system data
  - `GalaxyTierAdapter.ts` - Aggregate sector data
  - Mirror patterns from `PlanetTierAdapter.ts`, `SystemTierAdapter.ts`
- [ ] Update WorldSerializer for tier snapshots
  - Serialize megastructure components
  - Preserve governor decisions in tier summaries
  - Checkpoint canon events

**Files:**
- `packages/hierarchy-simulator/src/adapters/SectorTierAdapter.ts` (NEW)
- `packages/hierarchy-simulator/src/adapters/GalaxyTierAdapter.ts` (NEW)
- `packages/hierarchy-simulator/src/abstraction/AbstractSector.ts` (update preserved)
- `packages/hierarchy-simulator/src/abstraction/AbstractGalaxy.ts` (update preserved)
- `packages/persistence/src/WorldSerializer.ts` (add tier snapshot serialization)

**Test Success:**
- Build Dyson Swarm → Zoom to System tier → Megastructure in preserved fields
- Save game with Galaxy tier active → Load → Galaxy tier restored
- Time travel to past → Megastructures correctly absent/present per timeline

---

## Phase 2: High-Tier Governance (Unlock Empire → Galactic)

**Goal:** Enable gameplay at Empire, Federation, and Galactic Council tiers
**Timeline:** 3-4 weeks
**Unlocks:** Multi-system civilizations, galactic politics

### 2.1 Empire System Completion (Week 3-4) ⭐⭐⭐

**Why Critical:**
- Empire tier is stub with TODOs
- Blocks multi-nation gameplay

**Tasks:**
- [ ] Dynasty succession mechanics
  - Heir selection algorithms (primogeniture, elective, meritocratic)
  - Legitimacy calculations based on bloodline
  - Succession crises and civil wars
  - Dynasty component tracking
- [ ] Diplomatic AI for empires
  - Alliance formation based on shared threats
  - Trade treaty negotiation
  - War declaration conditions
  - Treaty execution (defense pacts, economic agreements)
- [ ] War resolution system
  - Empire-scale battles (aggregate nation armies)
  - Occupation mechanics
  - Peace treaty terms (territory, reparations, tribute)
  - War exhaustion and morale

**Files:**
- `packages/core/src/systems/EmpireSystem.ts` (complete TODOs at lines 200+)
- `packages/core/src/components/EmpireGovernanceComponent.ts` (expand dynasty fields)
- `packages/core/src/diplomacy/EmpireDiplomacySystem.ts` (NEW)
- `packages/core/src/warfare/EmpireWarSystem.ts` (NEW)

**Test Success:**
- Emperor dies → Heir selected, legitimacy calculated
- Empire A threatens Empire B → Empire B forms defensive alliance with C
- War declared → Armies mobilize, battles occur, peace treaty signed

---

### 2.2 Federation Governance System (Week 4-5) ⭐⭐

**Why Important:**
- Component exists but no system
- Required for Tier 5 gameplay (10B-1T population)

**Tasks:**
- [ ] Create `FederationGovernanceSystem` (Priority 205)
  - Aggregate member nation statistics
  - Rotating presidency elections
  - Federal law proposal and voting
  - Joint military operations coordination
  - Trade union enforcement (tariffs, standards)
- [ ] Implement federal assembly mechanics
  - Weighted voting by population
  - Veto powers for founding members
  - Proposal lifecycle (draft → vote → ratification → enforcement)
- [ ] Member satisfaction tracking
  - Calculate based on economic benefit, military protection, autonomy
  - Secession mechanics when satisfaction < 30%

**Files:**
- `packages/core/src/systems/FederationGovernanceSystem.ts` (NEW - 400+ lines)
- `packages/core/src/components/FederationGovernanceComponent.ts` (already exists)
- `packages/core/src/governance/GovernorContextBuilders.ts` (add buildFederationContext)
- `packages/core/src/governance/GovernorPromptTemplates.ts` (add buildFederationPresidentPrompt)

**Test Success:**
- 3 empires form federation → Federal component created
- Rotating presidency → New president elected every term
- Federal law proposed → All members vote, law passes/fails
- Member satisfaction drops → Secession declared

---

### 2.3 Galactic Council System (Week 5-6) ⭐⭐

**Why Important:**
- Highest political tier (1T+ population)
- Multi-species governance

**Tasks:**
- [ ] Create `GalacticCouncilSystem` (Priority 210)
  - Species representation logic (1 delegate per species)
  - Universal law voting
  - Peacekeeping mission coordination
  - Crisis response (wars, existential threats)
- [ ] Multi-species voting mechanics
  - Species voting power based on population + tech level
  - Consensus protocols for universal laws
  - Emergency powers during crises
- [ ] Law enforcement
  - Sanctions for law violations
  - Peacekeeping fleet deployment
  - Dispute mediation

**Files:**
- `packages/core/src/systems/GalacticCouncilSystem.ts` (NEW - 500+ lines)
- `packages/core/src/components/GalacticCouncilComponent.ts` (already exists)
- `packages/core/src/systems/GovernorDecisionSystem.ts` (integrate galactic context)

**Test Success:**
- 10 species reach space age → Galactic Council forms
- Universal law proposed → All species vote
- War breaks out → Peacekeeping mission deployed
- Species violates law → Sanctions applied

---

## Phase 3: Economic Depth (Trade, Production, Navy)

**Goal:** Deep economic simulation at all scales
**Timeline:** 3-4 weeks
**Unlocks:** Economic strategy gameplay, chokepoints, blockades

### 3.1 Trade Network Tier (Graph Analysis) (Week 6-7) ⭐⭐⭐

**Why Critical:**
- Tier 3 of trade spec completely missing
- Unlocks strategic chokepoint gameplay
- Foundation for economic optimization

**Tasks:**
- [ ] Create `TradeNetworkComponent` for planet/system-wide graphs
  - Node tracking (cities, stations, planets)
  - Edge tracking (shipping lanes with flow rates)
  - Network topology metadata
- [ ] Create `TradeNetworkSystem` (Priority 165)
  - Graph construction from shipping lanes
  - Hub identification via betweenness centrality
  - Chokepoint detection (nodes with high betweenness, low alternatives)
  - Network resilience calculation
  - Trade balance analysis
  - Gini coefficient for wealth distribution
- [ ] Implement blockade mechanics
  - Chokepoint blockade → Dependent regions starve
  - Alternative route calculation
  - Blockade cascade effects

**Files:**
- `packages/core/src/components/TradeNetworkComponent.ts` (NEW)
- `packages/core/src/systems/TradeNetworkSystem.ts` (NEW - 600+ lines)
- `packages/core/src/trade/GraphAnalysis.ts` (NEW - betweenness centrality, shortest paths)
- `packages/core/src/systems/ShippingLaneSystem.ts` (integrate with network tier)

**Test Success:**
- 20 cities connected → Trade network graph constructed
- Hub city identified → Highest betweenness centrality
- Hub blockaded → Dependent cities show resource shortages
- Trade balance calculated → Surplus/deficit regions identified

---

### 3.2 Navy Budget & Economic System (Week 7-8) ⭐⭐

**Why Important:**
- Navy tier exists but no economic simulation
- Budget allocation undefined

**Tasks:**
- [ ] Implement annual budget cycle in `NavySystem`
  - Nation allocates military budget to navy
  - Navy distributes to: new construction, maintenance, personnel, R&D, reserves
  - Budget tracking per category
- [ ] Shipyard production calculation
  - Calculate ships produced per year based on shipyardCapacity
  - Resource consumption (materials, labor, time)
  - Production queue management
- [ ] Personnel cost simulation
  - Crew payroll based on rank and specialization
  - Officer academy and NCO training costs
  - Veteran retention bonuses

**Files:**
- `packages/core/src/systems/NavySystem.ts` (add budget cycle update)
- `packages/core/src/systems/NavyBudgetSystem.ts` (expand existing partial implementation)
- `packages/core/src/components/NavyComponent.ts` (already has budget fields)

**Test Success:**
- Nation allocates 20% budget to navy → Navy receives funds
- Navy allocates 40% to new construction → Ships queued in shipyards
- Insufficient budget → Maintenance deferred, readiness decreases
- R&D investment → Tech level increases

---

### 3.3 Resource Location Discovery (Week 8) ⭐⭐

**Why Important:**
- Resource gating exists but no discovery mechanism
- Blocks Era 10-11 advancement

**Tasks:**
- [ ] Stellar phenomena resource spawning
  - Black holes → Void Essence, Exotic Matter
  - Neutron stars → Degenerate Matter, Strange Matter
  - Pulsars → Temporal Dust, Frame Dragging Residue
  - White dwarfs → Quantum Foam
- [ ] Planet type resource generation
  - Gas giants → Helium-3, Metallic Hydrogen
  - Crystal planets → Raw Crystal, Stellarite
  - Volcanic worlds → Neutronium precursors
- [ ] Exploration discovery system
  - Ship explores stellar phenomenon → Resources discovered
  - Discovery populates `gatedResourcesDiscovered` in TechnologyEraComponent
  - Discovery unlocks era advancement

**Files:**
- `packages/core/src/systems/ExplorationDiscoverySystem.ts` (NEW)
- `packages/world/src/planet/PlanetConfig.ts` (add resource spawning)
- `packages/core/src/systems/TechnologyEraSystem.ts` (integrate discovery checks)

**Test Success:**
- Ship explores black hole → Void Essence discovered
- Nation has Void Essence → Era 10→11 advancement enabled
- Crystal planet colonized → Raw Crystal available for β-space ships

---

## Phase 4: Advanced Multiverse Features

**Goal:** Complete multiverse gameplay mechanics
**Timeline:** 2-3 weeks
**Unlocks:** Paradoxes, timeline merging, invasion scenarios

### 4.1 Invasion Event Integration (Week 9) ⭐⭐⭐

**Why Critical:**
- Background universe system generates invasions but no gameplay
- Core multiverse threat mechanic

**Tasks:**
- [ ] Create invasion event handlers in plot system
  - `multiverse:invasion_triggered` event → Create plot
  - Invasion plot types: scouts, diplomats, conquerors, refugees
  - Player notification and decision options
- [ ] Invasion preparation mechanics
  - Invading faction assembles fleet
  - Fleet travels through passage
  - Fleet arrives at target planet
- [ ] Defense response system
  - Military mobilization
  - Diplomatic negotiation option
  - Emergency LLM governor decisions

**Files:**
- `packages/core/src/plot/InvasionPlotTemplates.ts` (NEW)
- `packages/core/src/systems/BackgroundUniverseSystem.ts` (integrate event handlers)
- `packages/core/src/systems/GovernorDecisionSystem.ts` (add crisis response)

**Test Success:**
- Background universe triggers invasion → Plot created, player notified
- Invasion fleet assembles → Ships queued, resources consumed
- Fleet arrives → Battle or negotiation occurs
- Defense successful → Passage closed, invaders repelled

---

### 4.2 Paradox Detection System (Week 9-10) ⭐⭐

**Why Important:**
- Meeting yourself scenarios undefined
- Contamination mechanics incomplete

**Tasks:**
- [ ] Create `ParadoxDetectionSystem` (Priority 455)
  - Detect agent meeting past/future self
  - Detect contradictory item states (exists + doesn't exist)
  - Detect causal loops
- [ ] Contamination spreading
  - Contamination level increases when paradoxes unresolved
  - Contamination spreads to nearby entities/buildings
  - High contamination → Reality instability, glitches
- [ ] Quarantine enforcement
  - Contaminated entities can't traverse passages
  - Contaminated zones isolated
  - Decontamination mechanics (expensive, time-consuming)

**Files:**
- `packages/core/src/systems/ParadoxDetectionSystem.ts` (NEW)
- `packages/core/src/components/ContaminationComponent.ts` (NEW)
- `packages/core/src/systems/PassageTraversalSystem.ts` (add contamination checks)

**Test Success:**
- Agent meets past self → Paradox detected, contamination applied
- Contamination spreads → Nearby entities contaminated
- Contaminated agent attempts passage → Blocked
- Decontamination ritual → Contamination level decreases

---

### 4.3 Timeline Merger Ships (Week 10) ⭐⭐

**Why Important:**
- Spec defines timeline merger ship but not implemented
- Key multiverse ship type

**Tasks:**
- [ ] Add `timeline_merger` ship type to SpaceshipComponent
  - Requires Era 12+ tech
  - Requires Strange Matter, Void Essence, Timeline Fragments
- [ ] Implement merge operation system
  - Select two compatible universes
  - Calculate merge conflicts (agent_state, building_exists, item_quantity, terrain_difference)
  - Present conflict resolution options to player
  - Execute merge (combine universes, resolve conflicts)
- [ ] Conflict resolution strategies
  - Player choice (pick Universe A or B version)
  - Probabilistic average
  - Timeline collapse (delete conflicting entities)

**Files:**
- `packages/core/src/navigation/SpaceshipComponent.ts` (add timeline_merger type)
- `packages/core/src/multiverse/TimelineMergeSystem.ts` (NEW)
- `packages/core/src/multiverse/MergeHelpers.ts` (expand existing helpers)

**Test Success:**
- Build timeline merger ship → Ship constructed with special requirements
- Select two universes → Compatibility scored, conflicts identified
- Choose resolution strategy → Universes merged, conflicts resolved
- Post-merge → Single unified universe remains

---

## Phase 5: Civilization & Narrative Systems ✅ COMPLETE

**Goal:** Long-term civilization progression and emergent stories
**Timeline:** 2-3 weeks
**Unlocks:** Uplift diplomacy, collapse scenarios, archaeological gameplay
**Status:** ✅ All items completed 2026-01-20

### 5.1 Civilization Uplift Diplomacy (Week 11) ⭐⭐

**Why Important:**
- Animal uplift exists, civilization uplift is design-only
- Key ethical/narrative mechanic

**Tasks:**
- [ ] Create `UpliftDiplomacySystem` (Priority 220)
  - Advanced civ detects primitive civ (tech level gap ≥3)
  - Uplift offer decision (Governor LLM-driven)
  - Success rate based on era jump (+1 era: 80%, +4 eras: 5%)
  - Outcome types: success, partial (dependency), failure (rejection/misuse)
- [ ] Cultural contamination mechanics
  - Cargo cult formation (low success roll)
  - Dependency trap (uplifted civ relies on uplifter)
  - Technology misuse cascade (weapons → war → collapse)
- [ ] Ethical reputation system
  - Prime Directive score (-100 to 0): Non-interference
  - Interventionist score (0 to +100): Active uplift
  - Reputation affects other civs' trust

**Files:**
- `packages/core/src/systems/UpliftDiplomacySystem.ts` (NEW - 700+ lines)
- `packages/core/src/components/UpliftAgreementComponent.ts` (NEW)
- `packages/core/src/components/CivilizationReputationComponent.ts` (NEW)

**Test Success:**
- Tech 10 civ encounters Tech 6 civ → Uplift offer generated
- Uplift succeeds → Tech level increased, dependency tracked
- Uplift fails → Cargo cult formed, civil unrest
- Reputation tracked → Other civs react to uplift history

---

### 5.2 Collapse & Dark Age System (Week 11-12) ⭐⭐

**Why Important:**
- Era regression exists but triggers undefined
- Historical collapse examples missing

**Tasks:**
- [ ] Implement collapse triggers
  - War damage accumulation
  - Plague/famine mechanics
  - AI misalignment events (Era 13+)
  - β-space accidents (reality breaches)
  - Environmental collapse
- [ ] Knowledge preservation system
  - Libraries/monasteries preserve knowledge
  - Genetic storage encoding (high-tech preservation)
  - Archaeological discovery rate (1% per century)
  - Reinvention mechanics (5% chance if conditions met)
- [ ] Historical collapse scenarios
  - Bronze Age Collapse template (Era -2 regression)
  - Roman Fall template (Era -1 to -3, 500-1000 year recovery)
  - Nuclear Winter template (Era -5 to -7)

**Files:**
- `packages/core/src/systems/CollapseSystem.ts` (NEW)
- `packages/core/src/systems/KnowledgePreservationSystem.ts` (NEW)
- `packages/core/src/systems/TechnologyEraSystem.ts` (integrate collapse triggers)

**Test Success:**
- Major war → Collapse risk increases, era regression triggered
- Library built → Knowledge preservation rate increases
- Collapse occurs → Technologies lost, archaeological sites created
- 100 years post-collapse → 1% chance to rediscover lost tech per library

---

### 5.3 Archaeological Ruins System (Week 12) ⭐

**Why Important:**
- Megastructure ruins exist but no gameplay
- Narrative richness from past civilizations

**Tasks:**
- [ ] Excavation mechanics
  - Archaeological sites from megastructure ruins
  - Excavation projects (similar to construction)
  - Discovery chance based on tech level and site age
- [ ] Artifact discovery
  - Ancient technologies
  - Historical records
  - Cultural artifacts
- [ ] Reverse engineering
  - Study artifact → Unlock lost technology
  - Success rate based on tech gap
  - Partial understanding vs full mastery

**Files:**
- `packages/core/src/systems/ArchaeologySystem.ts` (NEW)
- `packages/core/src/components/ArchaeologicalSiteComponent.ts` (NEW)
- `packages/core/src/systems/MegastructureMaintenanceSystem.ts` (integrate ruin → site)

**Test Success:**
- Dyson Swarm decays to ruins → Archaeological site created
- Later civ discovers site → Excavation project started
- Excavation succeeds → Stellar engineering technology recovered
- Reverse engineering → Dyson Sphere tech unlocked (even if era not reached)

---

## Phase 6: Ship Systems & Combat ✅ COMPLETE

**Goal:** Complete ship combat and exotic ship types
**Timeline:** 2 weeks
**Unlocks:** Full naval warfare, timeline manipulation ships
**Status:** ✅ All items completed 2026-01-20

### 6.1 Ship Combat Resolution (Week 13) ⭐⭐

**Why Important:**
- ShipCombatSystem exists but resolution logic incomplete
- Blocks ship-to-ship battles

**Tasks:**
- [ ] Multi-phase combat implementation
  - Range phase: Long-range weapons (lasers, missiles)
  - Close phase: Short-range weapons (plasma, gauss)
  - Boarding phase: Marines board enemy ship
  - Resolved phase: Victor determined, loser captured/destroyed
- [ ] Coherence disruption attacks
  - β-space ships can disrupt enemy coherence
  - Low coherence → Can't navigate β-space, stranded
  - Coherence restoration mechanics (meditation, time)
- [ ] Ship capture mechanics
  - Boarding success based on marine count
  - Captured ship ownership transfer
  - Crew surrender vs fight to death

**Files:**
- `packages/core/src/systems/ShipCombatSystem.ts` (expand skeleton implementation)
- `packages/core/src/components/ShipCrewComponent.ts` (add boarding mechanics)

**Test Success:**
- Two ships engage → Range phase (weapons fire, hull damage)
- Ships close → Close phase (heavy damage)
- Boarding initiated → Marines board, combat resolves
- Ship captured → Ownership transferred to victor

---

### 6.2 Exotic Ship Types (Week 13-14) ⭐

**Why Important:**
- Probability Scout, Timeline Merger, Svetz Retrieval ships specified but not implemented
- Key multiverse ship functionality

**Tasks:**
- [ ] Probability Scout ship (`probability_scout` type)
  - View alternate timelines without contamination
  - Low probability of timeline collapse
  - Scouting mission mechanics
- [ ] Svetz Retrieval ship (`svetz_retrieval` type)
  - Fetch items/entities from alternate timelines
  - Object anchoring mechanics
  - Cross-timeline inventory management
- [ ] Brainship improvements (already exists, enhance)
  - Ship-brain symbiosis depth
  - Neural interface mechanics
  - Consciousness integration

**Files:**
- `packages/core/src/navigation/SpaceshipComponent.ts` (add probability_scout, svetz_retrieval)
- `packages/core/src/systems/ProbabilityScoutSystem.ts` (NEW)
- `packages/core/src/systems/SvetzRetrievalSystem.ts` (NEW)

**Test Success:**
- Probability Scout explores timeline → View alternate future without fork
- Svetz ship retrieves artifact → Item transferred from Universe B to Universe A
- Brainship bonded → Ship consciousness emerges

---

## Phase 7: Polish & Optimization (IN PROGRESS)

**Goal:** Testing, documentation, performance
**Timeline:** 2 weeks
**Unlocks:** Production-ready grand strategy layer
**Status:** Documentation complete, testing in progress (2026-01-20)

### 7.1 Comprehensive Testing (Week 15)

**Tasks:**
- [x] Write tests for Phase 6 exotic ship systems
  - [x] ProbabilityScoutSystem.test.ts (12 tests)
  - [x] SvetzRetrievalSystem.test.ts (15 tests)
- [ ] Write tests for remaining Phase 1-6 systems
  - Unit tests for all new systems (80%+ coverage)
  - Integration tests for cross-system workflows
  - Hierarchy simulator tier tests
- [ ] Performance profiling
  - Profile LLM governor decision loops
  - Profile trade network graph analysis
  - Profile megastructure maintenance loops
- [ ] Load testing
  - 10,000 entities across multiple tiers
  - 100 concurrent LLM requests
  - 1000 shipping lanes with graph analysis

**Files:**
- All `__tests__/` directories across packages

---

### 7.2 Documentation & Devlogs (Week 16) ✅ COMPLETE

**Tasks:**
- [x] Update SYSTEMS_CATALOG.md with all new systems (2026-01-20)
  - Added Space & Multiverse section (5 systems)
  - Added Civilization & Archaeology section (4 systems)
- [x] Update COMPONENTS_REFERENCE.md with all new components (2026-01-20)
  - Added Space & Multiverse Components section (8 components)
- [x] Create GRAND_STRATEGY_GUIDE.md for players (2026-01-20)
  - Political hierarchy guide (7 tiers)
  - Technology eras guide (15 eras)
  - Ship types and missions guide
  - Economic and multiverse mechanics
- [x] Write devlog summarizing grand strategy implementation (2026-01-20)
  - `devlogs/GRAND-STRATEGY-IMPLEMENTATION-01-20.md`
- [ ] Update README with gameplay examples

---

## Dependency Graph

```
Phase 1 (Integration) ─┬─→ Phase 2 (High-Tier Governance) ─→ Phase 5 (Civilization)
                       │
                       ├─→ Phase 3 (Economic) ─→ Phase 6 (Ships)
                       │
                       └─→ Phase 4 (Multiverse) ─┘

Phase 7 (Polish) depends on all phases
```

**Critical Path:**
1.1 (LLM Execution) → 2.1 (Empire) → 2.2 (Federation) → 2.3 (Galactic)
**Enables:** Full political hierarchy Village → Galactic

1.2 (Megastructures) → 5.3 (Archaeology)
**Enables:** Megastructure lifecycle

3.1 (Trade Networks) → 3.2 (Navy Budget)
**Enables:** Economic grand strategy

**Parallel Paths:**
- Phase 4 can run concurrently with Phase 3
- Phase 5 can start after Phase 2
- Phase 6 can start after Phase 1.3

---

## Effort Estimates

| Phase | Weeks | Complexity | Priority |
|-------|-------|-----------|----------|
| **Phase 1: Integration** | 2-3 | Medium | ⭐⭐⭐ Critical |
| **Phase 2: High-Tier Gov** | 3-4 | High | ⭐⭐⭐ Critical |
| **Phase 3: Economic** | 3-4 | High | ⭐⭐⭐ Critical |
| **Phase 4: Multiverse** | 2-3 | Medium | ⭐⭐ Important |
| **Phase 5: Civilization** | 2-3 | Medium | ⭐⭐ Important |
| **Phase 6: Ships** | 2 | Medium | ⭐⭐ Important |
| **Phase 7: Polish** | 2 | Low | ⭐ Nice-to-have |
| **TOTAL** | **16-22 weeks** | | |

---

## Success Metrics

**By Phase 3 completion:**
- [ ] Empire declares war → Armies mobilize, battles occur
- [ ] Federation votes on law → Law passes/fails, enforcement occurs
- [ ] Trade network blockaded → Dependent regions starve
- [ ] Navy runs out of budget → Ships mothballed, readiness drops
- [ ] Dyson Swarm completed → Megastructure operational, generates energy

**By Phase 6 completion:**
- [ ] Galactic Council mediates war → Peacekeeping mission deployed
- [ ] Background universe invades → Defense mobilized, battle/negotiation
- [ ] Timeline merger ship combines universes → Single unified timeline
- [ ] Civilization uplifts primitive → Dependency/success/failure outcomes
- [ ] Ship combat → Boarding, capture, coherence disruption

**Production Ready:**
- [ ] All 7 political tiers functional (Village → Galactic Council)
- [ ] All 5 trade tiers working (Route → Inter-Universe)
- [ ] All 6 ship hierarchy tiers operational (Crew → Navy)
- [ ] All 15 technology eras with progression
- [ ] All 22 megastructures buildable and operational
- [ ] Multiverse travel with invasions, paradoxes, merging
- [ ] 80%+ test coverage
- [ ] Performance targets met (20 TPS at all tiers)

---

## Quick Wins (High Impact, Low Effort)

These can be done in parallel during Phase 1-2:

1. **Sector & Galaxy Adapters** (2 days)
   - Copy PlanetTierAdapter pattern
   - Aggregate system/sector data
   - Unlocks: Save/load for interstellar tiers

2. **Resource Discovery Spawning** (1 day)
   - Add resource fields to planet types
   - Populate on planet generation
   - Unlocks: Era 10-11 advancement

3. **Escalation Event Emission** (1 day)
   - Wire up event bus in DecisionProtocols
   - Test crisis escalation
   - Unlocks: Crisis response chain

4. **Megastructure Decay Activation** (1 day)
   - Call ageRuinsOptimized on degradation
   - Emit decay events
   - Unlocks: Ruins gameplay

---

## Next Steps (This Week)

### Monday-Tuesday: LLM Governor Execution
1. Start with simplest tier: Province governor resource allocation
2. Wire `GovernorDecisionSystem` to `ProvinceGovernanceSystem`
3. Test: Province requests aid → Resources transferred

### Wednesday-Thursday: Megastructure Activation
1. Implement `createOperationalMegastructure()`
2. Test: Space Station construction → MegastructureComponent created
3. Wire maintenance resource consumption

### Friday: City Governance
1. Create `CityGovernanceComponent` schema
2. Link `CityDirectorSystem` decisions to component
3. Test: City budget allocation → Departments updated

**Week 1 Goal:** Complete Phase 1.1, 1.2, and 1.3 (critical integration)

---

**Last Updated:** 2026-01-19
**Status:** Phase 0 (Planning) → Phase 1 (Integration) starting
**Overall Completion:** 70% → targeting 95% by Phase 7
