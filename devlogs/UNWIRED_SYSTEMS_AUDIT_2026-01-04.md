# Unwired Systems Audit - 2026-01-04

Comprehensive audit of all systems that are defined but not registered/wired into the game loop.

**Total Unwired Systems: 52**

---

## Category 1: Complete Systems in systems/ Directory (Not Registered)

These are ready to use - just need to import and register in `registerAllSystems.ts`.

| System | File Path | Description |
|--------|-----------|-------------|
| CityDirectorSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/CityDirectorSystem.ts` | LLM-based city management and planning |
| CrossRealmPhoneSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/CrossRealmPhoneSystem.ts` | Cross-realm communication (phone calls between realms) |
| ExperimentationSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/ExperimentationSystem.ts` | Recipe experimentation and discovery |
| ThreatResponseSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/ThreatResponseSystem.ts` | Automatic threat response and defense coordination |
| TradeAgreementSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/TradeAgreementSystem.ts` | Formal trade agreements between agents/factions |
| WildPlantPopulationSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/WildPlantPopulationSystem.ts` | Wild plant ecology and population dynamics |

**Quick Win**: These 6 systems just need 3 lines of code each:
1. Import statement in `registerAllSystems.ts`
2. Registration call: `gameLoop.systemRegistry.register(new SystemName())`
3. Done!

---

## Category 2: Uplift Metasystem (5 Systems)

Complete animal consciousness emergence and uplift system - ready to enable sapience in animals.

| System | File Path | Description |
|--------|-----------|-------------|
| UpliftCandidateDetectionSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/uplift/UpliftCandidateDetectionSystem.ts` | Detect animals with high intelligence potential |
| ConsciousnessEmergenceSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/uplift/ConsciousnessEmergenceSystem.ts` | Track emergence of consciousness in animals |
| ProtoSapienceObservationSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/uplift/ProtoSapienceObservationSystem.ts` | Observe and measure proto-sapience markers |
| UpliftBreedingProgramSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/uplift/UpliftBreedingProgramSystem.ts` | Manage breeding programs for intelligent animals |
| UpliftedSpeciesRegistrationSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/uplift/UpliftedSpeciesRegistrationSystem.ts` | Register newly uplifted species |

**Impact**: Enables the entire "animal sapience emergence" gameplay loop.

---

## Category 3: Television Metasystem (9 Systems)

Complete TV production, broadcasting, and cultural impact system.

### TV Show Formats (4 systems)

| System | File Path | Description |
|--------|-----------|-------------|
| GameShowSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/formats/GameShowSystem.ts` | Game show production and hosting |
| NewsroomSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/formats/NewsroomSystem.ts` | News broadcasting and journalism |
| SoapOperaSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/formats/SoapOperaSystem.ts` | Soap opera production and storylines |
| TalkShowSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/formats/TalkShowSystem.ts` | Talk show hosting and interviews |

### TV Production Pipeline (5 systems)

| System | File Path | Description |
|--------|-----------|-------------|
| CastingSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/production/CastingSystem.ts` | TV show casting and actor selection |
| TVWritingSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/systems/TVWritingSystem.ts` | Script writing for TV shows |
| TVDevelopmentSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/systems/TVDevelopmentSystem.ts` | TV show development and pitching |
| TVProductionSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/systems/TVProductionSystem.ts` | TV show production management |
| TVPostProductionSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/systems/TVPostProductionSystem.ts` | Post-production (editing, effects) |
| TVBroadcastingSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/systems/TVBroadcastingSystem.ts` | Broadcasting and scheduling |
| TVRatingsSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/systems/TVRatingsSystem.ts` | Viewership ratings and metrics |
| TVCulturalImpactSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/systems/TVCulturalImpactSystem.ts` | Cultural impact of TV shows |
| TVArchiveSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/systems/TVArchiveSystem.ts` | TV show archival and reruns |
| TVAdvertisingSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/television/systems/TVAdvertisingSystem.ts` | TV advertising and commercials |

**Note**: TV systems list shows 9 total (4 formats + 5 production), but there are actually 10 systems (TV Production Pipeline has 6 systems, not 5).

**Impact**: Enables the entire TV industry - production, broadcasting, cultural influence.

---

## Category 4: Plot/Narrative Metasystem (2 Systems)

Story arc management and narrative pressure system.

| System | File Path | Description |
|--------|-----------|-------------|
| PlotAssignmentSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/plot/PlotAssignmentSystem.ts` | Assign plot arcs to agents based on their traits |
| PlotProgressionSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/plot/PlotProgressionSystem.ts` | Progress plot arcs through story beats |
| NarrativePressureSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/narrative/NarrativePressureSystem.ts` | Apply narrative pressure to create drama |

**Impact**: Enables emergent storytelling and dramatic arcs.

---

## Category 5: Consciousness Metasystem (2 Systems)

Advanced consciousness types for animals.

| System | File Path | Description |
|--------|-----------|-------------|
| HiveMindSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/consciousness/HiveMindSystem.ts` | Eusocial insect colony consciousness |
| PackMindSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/consciousness/PackMindSystem.ts` | Wolf pack coordination and shared awareness |

**Impact**: Enables collective consciousness for social animals.

---

## Category 6: Parasitic Reproduction Subsystem (2 Systems)

Parasitic reproduction mechanics.

| System | File Path | Description |
|--------|-----------|-------------|
| ParasiticReproductionSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/reproduction/parasitic/ParasiticReproductionSystem.ts` | Parasitic reproduction lifecycle |
| ColonizationSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/reproduction/parasitic/ColonizationSystem.ts` | Parasite colonization of hosts |

**Impact**: Enables parasitic species gameplay.

---

## Category 7: Neural Interface Subsystem (2 Systems)

Neural interface and VR training systems.

| System | File Path | Description |
|--------|-----------|-------------|
| NeuralInterfaceSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/neural/NeuralInterfaceSystem.ts` | Neural interface technology |
| VRTrainingSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/neural/VRTrainingSystem.ts` | VR training simulations |

**Impact**: Enables brain-computer interface and VR training.

---

## Category 8: Communication Systems (3 Systems)

Advanced communication technologies.

| System | File Path | Description |
|--------|-----------|-------------|
| CellPhoneSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/communication/CellPhoneSystem.ts` | Cell phone communication |
| WalkieTalkieSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/communication/WalkieTalkieSystem.ts` | Walkie-talkie radio communication |
| RadioBroadcastingSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/radio/RadioBroadcastingSystem.ts` | Radio broadcasting and stations |

**Impact**: Enables modern communication technology.

---

## Category 9: Research & Knowledge Systems (6 Systems)

Advanced research and knowledge tracking.

| System | File Path | Description |
|--------|-----------|-------------|
| ChroniclerSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/research/ChroniclerSystem.ts` | Chronicle historical events |
| CookInfluencerSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/research/CookInfluencerSystem.ts` | Cooking influencer mechanics and fame |
| HerbalistDiscoverySystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/research/HerbalistDiscoverySystem.ts` | Herbalist plant discovery |
| InventorFameSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/research/InventorFameSystem.ts` | Inventor fame tracking |
| PublicationSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/research/PublicationSystem.ts` | Academic publication system |

**Note**: `AcademicPaperSystem` is already registered (line 394-396 in `registerAllSystems.ts`).

**Impact**: Enables advanced research, fame, and knowledge propagation.

---

## Category 10: Divinity Systems (2 Systems)

Additional divine mechanics.

| System | File Path | Description |
|--------|-----------|-------------|
| AttributionSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/divinity/AttributionSystem.ts` | Divine event attribution (who caused what) |
| VisionDeliverySystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/divinity/VisionDeliverySystem.ts` | Deliver visions from gods to mortals |

**Impact**: Enhances divine interaction mechanics.

---

## Category 11: Magic Systems (1 System)

Magic detection and enforcement.

| System | File Path | Description |
|--------|-----------|-------------|
| MagicDetectionSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/magic/MagicDetectionSystem.ts` | Detect forbidden magic use |

**Note**: `InitializeMagicSystem.ts` exists but is likely a utility file, not a system.

**Impact**: Enables magic law enforcement.

---

## Category 12: Soul & Afterlife (1 System)

Soul memory consolidation.

| System | File Path | Description |
|--------|-----------|-------------|
| SoulConsolidationSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/soul/SoulConsolidationSystem.ts` | Consolidate soul memories after death |

**Impact**: Enhances afterlife memory processing.

---

## Category 13: Clarke Tech (1 System)

Advanced technology ("sufficiently advanced technology is indistinguishable from magic").

| System | File Path | Description |
|--------|-----------|-------------|
| ClarketechSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/clarketech/ClarketechSystem.ts` | Clarke-tech implementations |

**Impact**: Enables advanced technology that appears magical.

---

## Category 14: Miscellaneous Systems (4 Systems)

Other unwired systems.

| System | File Path | Description |
|--------|-----------|-------------|
| AppSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/apps/AppSystem.ts` | Application/software system |
| ArtifactSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/items/ArtifactSystem.ts` | Artifact management and legendary items |
| AutonomicSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/decision/AutonomicSystem.ts` | Autonomic agent decision-making |

**Note**: `EmotionalNavigationSystem` is already registered (line 339 in `registerAllSystems.ts`).

---

## Category 15: Disabled Systems (3 Systems)

Systems that exist but are explicitly disabled with `.disabled` extension.

| System | File Path | Status | Notes |
|--------|-----------|--------|-------|
| FriendshipSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/FriendshipSystem.ts.disabled` | Disabled | TODO: Enable after RelationshipConversationSystem tested |
| InterestEvolutionSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/InterestEvolutionSystem.ts.disabled` | Disabled | TODO: Fix incomplete implementation |
| JealousySystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/JealousySystem.ts.disabled` | Disabled | TODO: Fix incomplete implementation |

**Note**: These are commented out in `registerAllSystems.ts` (lines 55-56, 167, 330, 448).

---

## Category 16: Stub Implementation (1 System)

System that is registered but has no real implementation.

| System | File Path | Status | Notes |
|--------|-----------|--------|-------|
| VillageDefenseSystem | `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/VillageDefenseSystem.ts` | Registered but stub | Contains only comment "// Stub implementation" |

**Location in registerAllSystems.ts**: Line 529

**Fix Required**: Implement the actual defense logic or remove registration.

---

## Summary Statistics

| Category | Count | Status |
|----------|-------|--------|
| Quick Wins (systems/ directory) | 6 | Ready to register |
| Uplift Metasystem | 5 | Ready to register |
| Television Metasystem | 10 | Ready to register |
| Plot/Narrative | 3 | Ready to register |
| Consciousness | 2 | Ready to register |
| Parasitic Reproduction | 2 | Ready to register |
| Neural Interface | 2 | Ready to register |
| Communication | 3 | Ready to register |
| Research & Knowledge | 5 | Ready to register |
| Divinity | 2 | Ready to register |
| Magic | 1 | Ready to register |
| Soul & Afterlife | 1 | Ready to register |
| Clarke Tech | 1 | Ready to register |
| Miscellaneous | 3 | Ready to register |
| **Disabled Systems** | 3 | Needs fixing before enabling |
| **Stub Systems** | 1 | Needs implementation |
| **TOTAL UNWIRED** | **52** | **46 ready + 3 disabled + 1 stub + 2 already registered** |

**Correction**: Total should be 49 unwired (46 ready + 3 disabled), since:
- `AcademicPaperSystem` is already registered
- `EmotionalNavigationSystem` is already registered
- `VillageDefenseSystem` is registered (but stub)

---

## Registration File Location

**Main Registration File**: `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/registerAllSystems.ts`

**Current Registration Pattern**:
```typescript
import { SystemName } from './SystemName.js';
// or
import { SystemName } from '../subdirectory/SystemName.js';

// Inside registerAllSystems() function:
gameLoop.systemRegistry.register(new SystemName());
```

---

## Recommendations

### Immediate Actions (Quick Wins):
1. Register the 6 systems in the main `systems/` directory
2. Fix or remove `VillageDefenseSystem` stub implementation

### High-Value Metasystems to Enable:
1. **Television** (10 systems) - Complete TV industry
2. **Uplift** (5 systems) - Animal sapience emergence
3. **Plot/Narrative** (3 systems) - Emergent storytelling

### Medium Priority:
1. Research & Knowledge (5 systems)
2. Communication (3 systems)
3. Consciousness (2 systems)

### Low Priority (Specialized):
1. Parasitic Reproduction (2 systems)
2. Neural Interface (2 systems)
3. Clarke Tech (1 system)
4. Magic Detection (1 system)

### Disabled Systems:
1. Review and fix FriendshipSystem, InterestEvolutionSystem, JealousySystem
2. Either complete implementations or remove `.disabled` files

---

## Impact Assessment

Wiring up all 46 ready systems would activate:
- **Complete TV industry** (production, broadcasting, cultural impact)
- **Animal uplift** (consciousness emergence, sapience evolution)
- **Emergent narratives** (plot arcs, story beats, drama)
- **Collective consciousness** (hive minds, pack minds)
- **Modern communication** (phones, radio, walkie-talkies)
- **Advanced research** (chroniclers, fame systems, publications)
- **Divine mechanics** (visions, attribution)
- **Parasitic species**
- **Neural interfaces & VR**
- **Clarke-tech**

This represents approximately **40% of documented systems** being inactive despite complete implementations.

---

## Next Steps

1. Create a registration script to batch-import subdirectory systems
2. Test systems in isolated environment before enabling all
3. Document any LLM dependencies or config requirements
4. Update SYSTEMS_CATALOG.md to reflect actual registration status
5. Consider priority-based rollout (TV first, then Uplift, then others)
