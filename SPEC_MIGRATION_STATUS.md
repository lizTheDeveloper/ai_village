# Spec Migration Status Tracker

**Generated:** 2026-01-02
**Purpose:** Track migration from `architecture/` to `openspec/specs/` with implementation status

---

## Status Legend

- 🔴 **Draft** - No code exists
- 🟡 **Ready** - Spec complete but not implemented
- 🟠 **In Progress** - Partial implementation found
- 🟢 **Implemented** - Fully implemented (components, systems exist)
- ✅ **Migrated** - Converted to openspec format
- ⏳ **Pending** - Not yet migrated

---

## Social System (2 specs)

| Spec | Target | Status | Implementation | Migrated |
|------|--------|--------|----------------|----------|
| COURTSHIP_SPEC.md | social-system/courtship.md | 🟢 Implemented | CourtshipComponent, CourtshipSystem, CourtshipStateMachine found | ⏳ |
| COURTSHIP_IMPROVEMENTS_SPEC.md | social-system/courtship-improvements.md | 🟡 Ready | Extension of existing courtship | ⏳ |

**Implementation Files Found:**
- `packages/core/src/reproduction/courtship/CourtshipComponent.ts`
- `packages/core/src/reproduction/courtship/CourtshipStateMachine.ts`
- `packages/core/src/systems/CourtshipSystem.ts`

---

## Automation System (6 specs)

| Spec | Target | Status | Implementation | Migrated |
|------|--------|--------|---|----------|
| AUTOMATION_LOGISTICS_SPEC.md | automation-system/logistics.md | 🔴 Draft | No code found | ⏳ |
| AUTOMATION_RESEARCH_TREE.md | automation-system/research-tree.md | 🔴 Draft | No code found | ⏳ |
| FACTORY_AI_SPEC.md | automation-system/factory-ai.md | 🔴 Draft | No code found | ⏳ |
| FACTORY_BLUEPRINTS.md | automation-system/blueprints.md | 🔴 Draft | No code found | ⏳ |
| FOOD_FACTORY_SPEC.md | automation-system/food-factory.md | 🔴 Draft | No code found | ⏳ |
| POWER_GRID_SPEC.md | automation-system/power-grid.md | 🔴 Draft | No code found | ⏳ |

**Note:** Entire automation system is future work - no implementation yet

---

## Building System (3 specs)

| Spec | Target | Status | Implementation | Migrated |
|------|--------|--------|----------------|----------|
| AUTONOMOUS_BUILDING_SPEC.md | building-system/autonomous-building.md | 🔴 Draft | TBD | ⏳ |
| VOXEL_BUILDING_SPEC.md | building-system/voxel-building.md | 🔴 Draft | TBD | ⏳ |
| NIGHTLIFE_BUILDINGS_SPEC.md | building-system/nightlife-buildings.md | 🔴 Draft | TBD | ⏳ |

---

## Communication System (3 specs)

| Spec | Target | Status | Implementation | Migrated |
|------|--------|--------|----------------|----------|
| COMMUNICATION_TECH_SPEC.md | communication-system/tech-spec.md | 🔴 Draft | TBD | ⏳ |
| SOCIAL_MEDIA_SPEC.md | communication-system/social-media.md | 🔴 Draft | TBD | ⏳ |
| TV_STATION_SPEC.md | communication-system/tv-station.md | 🔴 Draft | TBD | ⏳ |

---

## Botany System (1 spec)

| Spec | Target | Status | Implementation | Migrated |
|------|--------|--------|----------------|----------|
| HERBAL_BOTANY_SPEC.md | botany-system/spec.md | 🔴 Draft | TBD | ⏳ |

---

## Persistence System (3 specs)

| Spec | Target | Status | Implementation | Migrated |
|------|--------|--------|----------------|----------|
| PERSISTENCE_MULTIVERSE_SPEC.md | persistence-system/multiverse.md | 🔴 Draft | TBD | ⏳ |
| ITEM_MAGIC_PERSISTENCE_SPEC.md | persistence-system/item-magic.md | 🔴 Draft | TBD | ⏳ |
| CHUNK_MANAGER_INTEGRATION.md | persistence-system/chunk-manager.md | 🔴 Draft | TBD | ⏳ |

---

## Worldgen System (3 specs)

| Spec | Target | Status | Implementation | Migrated |
|------|--------|--------|----------------|----------|
| GENERATIVE_CITIES_SPEC.md | worldgen-system/generative-cities.md | 🔴 Draft | TBD | ⏳ |
| PASSAGE_SYSTEM.md | worldgen-system/passage-system.md | 🔴 Draft | TBD | ⏳ |
| IMAJICA_DIMENSIONAL_DESIGN.md | worldgen-system/imajica-dimensions.md | 🔴 Draft | TBD | ⏳ |

---

## Magic System (1 spec)

| Spec | Target | Status | Implementation | Migrated |
|------|--------|--------|----------------|----------|
| MAGIC_SKILL_TREE_SPEC.md | magic-system/skill-tree.md | 🔴 Draft | TBD | ⏳ |

---

## Specs Requiring Merge with Existing

| Spec | Target | Action | Status |
|------|--------|--------|--------|
| EQUIPMENT_COMBAT_SPEC.md | equipment-system/spec.md | Merge | ⏳ |
| DIVINE_PROGRESSION_SPEC.md | divinity-system/ | Merge | ⏳ |
| GOD_OF_DEATH_SPEC.md | divinity-system/god-of-death.md | Merge | ⏳ |
| PLAYER_PATHS_SPEC.md | player-system/spec.md | Merge | ⏳ |
| RESEARCH_DISCOVERY_SPEC.md | research-system/spec.md | Merge | ⏳ |

---

## Technical Docs to Move

| File | Target | Status |
|------|--------|--------|
| MIGRATION_EXAMPLES.md | docs/architecture/migration-examples.md | ⏳ |
| OFF_SCREEN_OPTIMIZATION.md | docs/performance/off-screen-optimization.md | ⏳ |
| PLAYER_PATHS_SYSTEM_ARCHITECTURE.md | docs/architecture/player-paths-architecture.md | ⏳ |

---

## Summary Stats

- **Total Specs:** 31
- **Migrated:** 0
- **Implemented:** 1 (Courtship)
- **In Progress:** 0
- **Ready for Dev:** TBD after migration
- **Draft/Future:** ~25+

---

## Next Actions

1. ✅ Create system directories (DONE)
2. Check implementation status for each spec (IN PROGRESS)
3. Convert implemented specs first (start with courtship)
4. Convert "Ready" specs next
5. Convert "Draft" specs last
6. Create master SPEC_INDEX.md
7. Archive architecture/ folder

---

## Implementation Checks Needed

Run these checks to determine implementation status:

```bash
# Check for courtship
find packages -name "*[Cc]ourtship*" -o -name "*[Rr]omance*"

# Check for automation
find packages -name "*[Aa]utomation*" -o -name "*[Ff]actory*" -o -name "*[Ll]ogistics*"

# Check for power grid
find packages -name "*[Pp]ower*" -o -name "*[Gg]rid*" -o -name "*[Ee]nergy*"

# Check for building systems
find packages -name "*[Bb]uilding*" -o -name "*[Cc]onstruction*" -o -name "*[Vv]oxel*"

# Check for communication
find packages -name "*[Cc]omm*" -o -name "*[Ss]ocial*" -o -name "*[Mm]edia*" -o -name "*[Tt]elevision*" -o -name "*TV*"

# Check for botany
find packages -name "*[Bb]otany*" -o -name "*[Hh]erb*" -o -name "*[Pp]lant*"

# Check for persistence
find packages -name "*[Pp]ersist*" -o -name "*[Cc]hunk*" -o -name "*[Ss]ave*"

# Check for worldgen
find packages -name "*[Ww]orldgen*" -o -name "*[Pp]rocgen*" -o -name "*[Cc]ity*" -o -name "*[Gg]enerat*"

# Check for magic
find packages -name "*[Mm]agic*" -o -name "*[Ss]kill*" -o -name "*[Tt]ree*"
```
