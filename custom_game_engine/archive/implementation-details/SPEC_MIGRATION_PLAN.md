# Architecture → OpenSpec Migration Plan

## Overview

Migrating specs from `custom_game_engine/architecture/` to `openspec/specs/` organized by system.

## Migration Mapping

### Communication System (`openspec/specs/communication-system/`)

- [x] `PHONE_SCHEDULING_SPEC.md` → `phone-scheduling.md` ✓ DONE
- [ ] `COMMUNICATION_TECH_SPEC.md` → `tech-spec.md` (already exists, may need merge)
- [ ] `SOCIAL_MEDIA_SPEC.md` → `social-media.md` (already exists, may need merge)
- [ ] `TV_STATION_SPEC.md` → `tv-station.md` (already exists, may need merge)
- [ ] `NETWORKED_MULTIVERSE_SPEC.md` → `cross-universe-networking.md` (NEW)

### Automation System (`openspec/specs/automation-system/`)

- [ ] `AUTOMATION_LOGISTICS_SPEC.md` → `logistics.md`
- [ ] `AUTOMATION_RESEARCH_TREE.md` → `research-tree.md`
- [ ] `FACTORY_AI_SPEC.md` → `factory-ai.md`
- [ ] `FACTORY_BLUEPRINTS.md` → `blueprints.md`
- [ ] `FOOD_FACTORY_SPEC.md` → `food-factory.md`
- [ ] `OFF_SCREEN_OPTIMIZATION.md` → `off-screen-optimization.md`

### Building System (`openspec/specs/building-system/`)

- [ ] `AUTONOMOUS_BUILDING_SPEC.md` → `autonomous-building.md`
- [ ] `VOXEL_BUILDING_SPEC.md` → `voxel-building.md`
- [ ] `NIGHTLIFE_BUILDINGS_SPEC.md` → `nightlife-buildings.md`
- [ ] `POWER_GRID_SPEC.md` → `power-grid.md`
- [ ] `GENERATIVE_CITIES_SPEC.md` → `generative-cities.md`

### Divinity System (`openspec/specs/divinity-system/`)

- [ ] `DIVINE_PROGRESSION_SPEC.md` → `progression.md`
- [ ] `GOD_OF_DEATH_SPEC.md` → `god-of-death.md`
- [ ] `GODDESS_OF_WISDOM_SPEC.md` → `goddess-of-wisdom.md`

### Magic System (`openspec/specs/magic-system/`)

- [ ] `MAGIC_SKILL_TREE_SPEC.md` → `skill-tree.md`
- [ ] `ITEM_MAGIC_PERSISTENCE_SPEC.md` → `item-magic-persistence.md`
- [ ] `HERBAL_BOTANY_SPEC.md` → Move to botany-system instead

### Botany System (`openspec/specs/botany-system/`)

- [ ] `HERBAL_BOTANY_SPEC.md` → `herbal-botany.md`

### Social System (`openspec/specs/social-system/`)

- [ ] `COURTSHIP_SPEC.md` → `courtship.md`
- [ ] `COURTSHIP_IMPROVEMENTS_SPEC.md` → `courtship-improvements.md`

### Research System (`openspec/specs/research-system/`)

- [ ] `RESEARCH_DISCOVERY_SPEC.md` → `discovery.md`
- [ ] `KNOWLEDGE_RESEARCH_TREE_SPEC.md` → `knowledge-tree.md`
- [ ] `WORK_ORDER_KNOWLEDGE_RESEARCH_TREE.md` → `knowledge-tree-workorder.md`

### Equipment System (`openspec/specs/equipment-system/`)

- [ ] `EQUIPMENT_COMBAT_SPEC.md` → `combat.md`

### Player System (`openspec/specs/player-system/`)

- [ ] `PLAYER_PATHS_SPEC.md` → `paths-spec.md`
- [ ] `PLAYER_PATHS_SYSTEM_ARCHITECTURE.md` → `paths-architecture.md`

### World System (`openspec/specs/world-system/`)

- [ ] `PASSAGE_SYSTEM.md` → `passage-system.md`
- [ ] `IMAJICA_DIMENSIONAL_DESIGN.md` → `dimensional-design.md`
- [ ] `LITERARY_SURREALISM_SPEC.md` → `literary-surrealism.md`

### Persistence System (`openspec/specs/persistence-system/`)

- [ ] `PERSISTENCE_MULTIVERSE_SPEC.md` → `multiverse-persistence.md`
- [ ] `CHUNK_MANAGER_INTEGRATION.md` → `chunk-manager.md`

### Utility/Meta Files (Don't Migrate - Archive)

- [ ] `MIGRATION_EXAMPLES.md` - Keep in architecture/ for reference

## Migration Commands

### Quick Migration Script

```bash
# Communication System
cp architecture/NETWORKED_MULTIVERSE_SPEC.md ../openspec/specs/communication-system/cross-universe-networking.md

# Automation System
cp architecture/AUTOMATION_LOGISTICS_SPEC.md ../openspec/specs/automation-system/logistics.md
cp architecture/AUTOMATION_RESEARCH_TREE.md ../openspec/specs/automation-system/research-tree.md
cp architecture/FACTORY_AI_SPEC.md ../openspec/specs/automation-system/factory-ai.md
cp architecture/FACTORY_BLUEPRINTS.md ../openspec/specs/automation-system/blueprints.md
cp architecture/FOOD_FACTORY_SPEC.md ../openspec/specs/automation-system/food-factory.md
cp architecture/OFF_SCREEN_OPTIMIZATION.md ../openspec/specs/automation-system/off-screen-optimization.md

# Building System
cp architecture/AUTONOMOUS_BUILDING_SPEC.md ../openspec/specs/building-system/autonomous-building.md
cp architecture/VOXEL_BUILDING_SPEC.md ../openspec/specs/building-system/voxel-building.md
cp architecture/NIGHTLIFE_BUILDINGS_SPEC.md ../openspec/specs/building-system/nightlife-buildings.md
cp architecture/POWER_GRID_SPEC.md ../openspec/specs/building-system/power-grid.md
cp architecture/GENERATIVE_CITIES_SPEC.md ../openspec/specs/building-system/generative-cities.md

# Divinity System
cp architecture/DIVINE_PROGRESSION_SPEC.md ../openspec/specs/divinity-system/progression.md
cp architecture/GOD_OF_DEATH_SPEC.md ../openspec/specs/divinity-system/god-of-death.md
cp architecture/GODDESS_OF_WISDOM_SPEC.md ../openspec/specs/divinity-system/goddess-of-wisdom.md

# Magic System
cp architecture/MAGIC_SKILL_TREE_SPEC.md ../openspec/specs/magic-system/skill-tree.md
cp architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md ../openspec/specs/magic-system/item-magic-persistence.md

# Botany System
cp architecture/HERBAL_BOTANY_SPEC.md ../openspec/specs/botany-system/herbal-botany.md

# Social System
cp architecture/COURTSHIP_SPEC.md ../openspec/specs/social-system/courtship.md
cp architecture/COURTSHIP_IMPROVEMENTS_SPEC.md ../openspec/specs/social-system/courtship-improvements.md

# Research System
cp architecture/RESEARCH_DISCOVERY_SPEC.md ../openspec/specs/research-system/discovery.md
cp architecture/KNOWLEDGE_RESEARCH_TREE_SPEC.md ../openspec/specs/research-system/knowledge-tree.md
cp architecture/WORK_ORDER_KNOWLEDGE_RESEARCH_TREE.md ../openspec/specs/research-system/knowledge-tree-workorder.md

# Equipment System
cp architecture/EQUIPMENT_COMBAT_SPEC.md ../openspec/specs/equipment-system/combat.md

# Player System
cp architecture/PLAYER_PATHS_SPEC.md ../openspec/specs/player-system/paths-spec.md
cp architecture/PLAYER_PATHS_SYSTEM_ARCHITECTURE.md ../openspec/specs/player-system/paths-architecture.md

# World System
cp architecture/PASSAGE_SYSTEM.md ../openspec/specs/world-system/passage-system.md
cp architecture/IMAJICA_DIMENSIONAL_DESIGN.md ../openspec/specs/world-system/dimensional-design.md
cp architecture/LITERARY_SURREALISM_SPEC.md ../openspec/specs/world-system/literary-surrealism.md

# Persistence System
cp architecture/PERSISTENCE_MULTIVERSE_SPEC.md ../openspec/specs/persistence-system/multiverse-persistence.md
cp architecture/CHUNK_MANAGER_INTEGRATION.md ../openspec/specs/persistence-system/chunk-manager.md
```

## Post-Migration Tasks

After copying files:

1. **Add OpenSpec Headers** to each migrated file:
   ```markdown
   > **System:** [system-name]
   > **Version:** 1.0
   > **Status:** Draft
   > **Last Updated:** 2026-01-02
   ```

2. **Review for Duplicates**: Some specs may already exist in openspec (e.g., COMMUNICATION_TECH_SPEC.md). Need to:
   - Compare content
   - Merge if necessary
   - Keep newer/more complete version

3. **Archive Old Files**: Once migration is verified:
   ```bash
   mkdir architecture/archived-migrated-to-openspec
   mv architecture/*.md architecture/archived-migrated-to-openspec/
   ```

## Status

✅ **MIGRATION COMPLETE - 2026-01-02**

- **Total Specs**: 37
- **Migrated**: 36 specs ✓
- **Remaining**: 0
- **Archived**: 36 (MIGRATION_EXAMPLES.md kept as reference)
- **Duplicates Resolved**: 1 (power-grid.md)
- **OpenSpec Headers Added**: All 36 files ✓

## Completion Summary

### ✅ Tasks Completed

1. **Migration**: All 36 specs copied to appropriate OpenSpec system directories
2. **Headers**: OpenSpec headers (System, Version, Status, Last Updated) added to all files
3. **Deduplication**: Removed duplicate power-grid.md from automation-system (kept building-system version)
4. **Archive**: All original specs moved to `architecture/archived-migrated-to-openspec-2026-01-02/`
5. **Documentation**: Created README files for both archive and architecture directories

### 📁 Archive Location

`custom_game_engine/architecture/archived-migrated-to-openspec-2026-01-02/`

Contains all 36 original spec files plus README explaining the migration.

### 🎯 New Architecture Folder Purpose

`architecture/` is now cleaned and ready for new draft/working documents that will eventually graduate to OpenSpec. See `architecture/README.md` for guidelines.

## Notes

- ✅ OpenSpec is the source of truth going forward
- ✅ Architecture folder is for working documents that get promoted to OpenSpec once mature
- ✅ All migrated specs are properly categorized by system
- ✅ All specs have standardized OpenSpec headers
