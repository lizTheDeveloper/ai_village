# Spec Organization Plan

> **Goal:** Consolidate all specs into openspec format within `openspec/specs/` and ensure `agents/autonomous-dev` has proper work-order structure.

**Generated:** 2026-01-02
**Status:** Planning

---

## Current State

### Location Summary

| Location | Count | Purpose |
|----------|-------|---------|
| `custom_game_engine/architecture/` | 31 files | Legacy architecture specs (mixed formats) |
| `openspec/specs/` | 86 files | Organized system specs (proper format) |
| `agents/autonomous-dev/work-orders/` | Multiple | Work orders for specific features |

---

## Inventory

### 1. custom_game_engine/architecture/ (31 specs)

**Automation & Factory Systems:**
- AUTOMATION_LOGISTICS_SPEC.md
- AUTOMATION_RESEARCH_TREE.md
- AUTONOMOUS_BUILDING_SPEC.md
- FACTORY_AI_SPEC.md
- FACTORY_BLUEPRINTS.md
- FOOD_FACTORY_SPEC.md
- POWER_GRID_SPEC.md

**Building & Construction:**
- VOXEL_BUILDING_SPEC.md
- NIGHTLIFE_BUILDINGS_SPEC.md
- CHUNK_MANAGER_INTEGRATION.md

**Social & Communication:**
- COMMUNICATION_TECH_SPEC.md
- COURTSHIP_SPEC.md
- COURTSHIP_IMPROVEMENTS_SPEC.md
- SOCIAL_MEDIA_SPEC.md
- TV_STATION_SPEC.md

**Divine & Magic:**
- DIVINE_PROGRESSION_SPEC.md
- GOD_OF_DEATH_SPEC.md
- MAGIC_SKILL_TREE_SPEC.md
- ITEM_MAGIC_PERSISTENCE_SPEC.md

**World & Environment:**
- GENERATIVE_CITIES_SPEC.md
- HERBAL_BOTANY_SPEC.md
- IMAJICA_DIMENSIONAL_DESIGN.md
- PASSAGE_SYSTEM.md
- PERSISTENCE_MULTIVERSE_SPEC.md

**Player & Combat:**
- EQUIPMENT_COMBAT_SPEC.md
- PLAYER_PATHS_SPEC.md
- PLAYER_PATHS_SYSTEM_ARCHITECTURE.md

**Research & Discovery:**
- RESEARCH_DISCOVERY_SPEC.md
- LITERARY_SURREALISM_SPEC.md

**Technical:**
- MIGRATION_EXAMPLES.md
- OFF_SCREEN_OPTIMIZATION.md

### 2. openspec/specs/ (86 specs - WELL ORGANIZED)

**Systems (organized by directory):**
- agent-system/ (11 specs) ✅
- animal-system/ (1 spec) ✅
- avatar-system/ (1 spec) ✅
- conflict-system/ (1 spec) ✅
- construction-system/ (1 spec) ✅
- divinity-system/ (10 specs) ✅
- economy-system/ (2 specs) ✅
- equipment-system/ (1 spec) ✅
- farming-system/ (1 spec) ✅
- game-engine/ (1 spec) ✅
- governance-system/ (1 spec) ✅
- items-system/ (2 specs) ✅
- magic-system/ (1 spec) ✅
- nexus-system/ (1 spec) ✅
- player-system/ (1 spec) ✅
- progression-system/ (1 spec) ✅
- rendering-system/ (2 specs) ✅
- research-system/ (2 specs) ✅
- testing/ (1 spec) ✅
- ui-system/ (34 specs!) ✅
- universe-system/ (1 spec) ✅
- world-system/ (3 specs) ✅

**Meta files:**
- BUGS_20251222.md
- consciousness-implementation-phases.md
- FEASIBILITY_REVIEW.md

### 3. agents/autonomous-dev/work-orders/

**Structure:**
```
work-orders/
├── conflict-combat-ui/
│   ├── work-order.md
│   ├── VERIFICATION.md
│   └── ... (many attempts)
├── divine-communication-system/
│   └── work-order.md
├── player-avatar/
│   └── work-order.md
└── ... (more features)
```

**Status:** Has work-order format examples ✅

---

## Problems Identified

### 1. Duplicate/Overlapping Specs

Some specs in `architecture/` may already be covered in `openspec/specs/`:

- **Equipment/Combat:**
  - `architecture/EQUIPMENT_COMBAT_SPEC.md`
  - `openspec/specs/equipment-system/spec.md`
  - `openspec/specs/conflict-system/spec.md`

- **Divine Systems:**
  - `architecture/DIVINE_PROGRESSION_SPEC.md`
  - `architecture/GOD_OF_DEATH_SPEC.md`
  - `openspec/specs/divinity-system/` (10 files!)

- **Research:**
  - `architecture/RESEARCH_DISCOVERY_SPEC.md`
  - `openspec/specs/research-system/spec.md`

- **Player:**
  - `architecture/PLAYER_PATHS_SPEC.md`
  - `openspec/specs/player-system/spec.md`

### 2. Missing Openspec Categories

Specs in `architecture/` without clear openspec home:

- **automation-system/** - not in openspec
  - AUTOMATION_LOGISTICS_SPEC.md
  - AUTOMATION_RESEARCH_TREE.md
  - FACTORY_AI_SPEC.md
  - FACTORY_BLUEPRINTS.md
  - FOOD_FACTORY_SPEC.md
  - POWER_GRID_SPEC.md

- **building-system/** - partially exists as `construction-system`
  - AUTONOMOUS_BUILDING_SPEC.md
  - VOXEL_BUILDING_SPEC.md
  - NIGHTLIFE_BUILDINGS_SPEC.md

- **communication-system/** - not in openspec
  - COMMUNICATION_TECH_SPEC.md
  - SOCIAL_MEDIA_SPEC.md
  - TV_STATION_SPEC.md

- **social-system/** - partially in agent-system
  - COURTSHIP_SPEC.md
  - COURTSHIP_IMPROVEMENTS_SPEC.md

- **botany-system/** - not in openspec
  - HERBAL_BOTANY_SPEC.md

- **persistence-system/** - not in openspec
  - PERSISTENCE_MULTIVERSE_SPEC.md
  - ITEM_MAGIC_PERSISTENCE_SPEC.md
  - CHUNK_MANAGER_INTEGRATION.md

- **worldgen-system/** - partially in world-system
  - GENERATIVE_CITIES_SPEC.md
  - PASSAGE_SYSTEM.md
  - IMAJICA_DIMENSIONAL_DESIGN.md

- **magic-system/** - exists but minimal
  - MAGIC_SKILL_TREE_SPEC.md (architecture)
  - magic-system/paradigm-spec.md (openspec)

### 3. Technical/Meta Files

Should stay as-is or move to docs/:
- MIGRATION_EXAMPLES.md
- OFF_SCREEN_OPTIMIZATION.md
- PLAYER_PATHS_SYSTEM_ARCHITECTURE.md

---

## Migration Plan

### Phase 1: Create Missing System Directories in openspec/specs/

```bash
mkdir -p openspec/specs/automation-system
mkdir -p openspec/specs/building-system
mkdir -p openspec/specs/communication-system
mkdir -p openspec/specs/social-system
mkdir -p openspec/specs/botany-system
mkdir -p openspec/specs/persistence-system
mkdir -p openspec/specs/worldgen-system
```

### Phase 2: Move/Convert Specs to Openspec Format

**Template Structure:**
```markdown
# [System Name] System Specification

> **System:** [system-name]
> **Version:** 1.0
> **Status:** Draft/Review/Approved
> **Last Updated:** YYYY-MM-DD

## Overview

[Brief description]

## Core Requirements

### Requirement 1: [Name]
[Description]

## Components

### Component: [ComponentName]
**Type:** `component_type`
**Purpose:** [...]

**Properties:**
- `prop1: Type` - Description
- `prop2: Type` - Description

## Systems

### System: [SystemName]
**Purpose:** [...]
**Update Frequency:** [every tick / every N seconds]

## Events

**Emits:**
- `event:name` - When [...]

**Listens:**
- `event:name` - Handles [...]

## Integration Points

- **[OtherSystem]** - How they interact

## UI Requirements

[If applicable]

## Performance Considerations

[If applicable]

## Dependencies

- Phase X: [Description]

## Open Questions

- [ ] Question 1?

---

**Related Specs:**
- [Link to related spec](../other-system/spec.md)
```

### Phase 3: Mapping Architecture → Openspec

| Architecture Spec | Target Openspec Location | Action |
|-------------------|--------------------------|---------|
| AUTOMATION_LOGISTICS_SPEC.md | automation-system/logistics.md | Move & Convert |
| AUTOMATION_RESEARCH_TREE.md | automation-system/research-tree.md | Move & Convert |
| FACTORY_AI_SPEC.md | automation-system/factory-ai.md | Move & Convert |
| FACTORY_BLUEPRINTS.md | automation-system/blueprints.md | Move & Convert |
| FOOD_FACTORY_SPEC.md | automation-system/food-factory.md | Move & Convert |
| POWER_GRID_SPEC.md | automation-system/power-grid.md | Move & Convert |
| AUTONOMOUS_BUILDING_SPEC.md | building-system/autonomous-building.md | Move & Convert |
| VOXEL_BUILDING_SPEC.md | building-system/voxel-building.md | Move & Convert |
| NIGHTLIFE_BUILDINGS_SPEC.md | building-system/nightlife-buildings.md | Move & Convert |
| COMMUNICATION_TECH_SPEC.md | communication-system/tech-spec.md | Move & Convert |
| SOCIAL_MEDIA_SPEC.md | communication-system/social-media.md | Move & Convert |
| TV_STATION_SPEC.md | communication-system/tv-station.md | Move & Convert |
| COURTSHIP_SPEC.md | social-system/courtship.md | Move & Convert |
| COURTSHIP_IMPROVEMENTS_SPEC.md | social-system/courtship-improvements.md | Move & Convert |
| HERBAL_BOTANY_SPEC.md | botany-system/spec.md | Move & Convert |
| PERSISTENCE_MULTIVERSE_SPEC.md | persistence-system/multiverse.md | Move & Convert |
| ITEM_MAGIC_PERSISTENCE_SPEC.md | persistence-system/item-magic.md | Move & Convert |
| CHUNK_MANAGER_INTEGRATION.md | persistence-system/chunk-manager.md | Move & Convert |
| GENERATIVE_CITIES_SPEC.md | worldgen-system/generative-cities.md | Move & Convert |
| PASSAGE_SYSTEM.md | worldgen-system/passage-system.md | Move & Convert |
| IMAJICA_DIMENSIONAL_DESIGN.md | worldgen-system/imajica-dimensions.md | Move & Convert |
| MAGIC_SKILL_TREE_SPEC.md | magic-system/skill-tree.md | Move & Convert |
| EQUIPMENT_COMBAT_SPEC.md | equipment-system/ | Merge with existing |
| DIVINE_PROGRESSION_SPEC.md | divinity-system/ | Merge with existing |
| GOD_OF_DEATH_SPEC.md | divinity-system/ | Merge with existing |
| PLAYER_PATHS_SPEC.md | player-system/ | Merge with existing |
| RESEARCH_DISCOVERY_SPEC.md | research-system/ | Merge with existing |
| MIGRATION_EXAMPLES.md | docs/architecture/ | Move to docs |
| OFF_SCREEN_OPTIMIZATION.md | docs/performance/ | Move to docs |
| PLAYER_PATHS_SYSTEM_ARCHITECTURE.md | docs/architecture/ | Move to docs |

### Phase 4: Create Master Spec Index

Create `openspec/SPEC_INDEX.md`:

```markdown
# AI Village Specification Index

Complete catalog of all system specifications.

## Core Systems

### Agent System
- [Main Spec](specs/agent-system/spec.md)
- [Memory System](specs/agent-system/memory-system.md)
- [Relationship System](specs/agent-system/relationship-system.md)
- ... (list all)

### Automation System
- [Main Spec](specs/automation-system/spec.md)
- [Factory AI](specs/automation-system/factory-ai.md)
- ... (list all)

[... continue for all systems ...]

## Work Orders (agents/autonomous-dev/work-orders/)

Active development work orders:
- [Divine Communication System](../agents/autonomous-dev/work-orders/divine-communication-system/work-order.md)
- [Conflict Combat UI](../agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md)
- ... (list all)

## Status Legend

- 📋 **Draft** - Initial specification
- 🔍 **Review** - Under review
- ✅ **Approved** - Ready for implementation
- 🚧 **In Progress** - Currently being implemented
- ✔️ **Implemented** - Code exists
```

### Phase 5: Clean Up

After migration:
1. Archive `custom_game_engine/architecture/` to `custom_game_engine/architecture-legacy/`
2. Add README in legacy folder explaining migration
3. Update all links in existing specs to point to new locations

---

## Work Order Format (for agents/autonomous-dev)

### Required Structure

```
agents/autonomous-dev/work-orders/[feature-name]/
├── work-order.md          # Main work order (REQUIRED)
├── screenshots/            # Playtest screenshots
├── playtest-report.md     # Playtest results
└── READY_FOR_REVIEW.md    # Final approval doc
```

### Work Order Template

See `agents/autonomous-dev/work-orders/divine-communication-system/work-order.md` as reference.

**Required sections:**
1. Header (Phase, Status, Spec Reference)
2. Requirements Summary
3. Acceptance Criteria
4. System Integration
5. UI Requirements (if applicable)
6. Files Likely Modified
7. Notes for Implementation Agent
8. Notes for Playtest Agent
9. Dependencies Verification
10. Estimated Complexity

---

## Next Steps

1. ✅ **This document** - Planning complete
2. **Create new system directories** in openspec/specs/
3. **Convert specs** from architecture/ using template
4. **Verify no duplicates** - merge where needed
5. **Create SPEC_INDEX.md** - master catalog
6. **Update work-orders** to reference new spec locations
7. **Archive architecture/** - move to legacy
8. **Update MASTER_ROADMAP.md** - link to SPEC_INDEX

---

## Questions for User

- Should we preserve git history when moving specs? (git mv vs new files)
- Any specs in `architecture/` that should be deleted entirely?
- Should `openspec/` be renamed to just `specs/`?
- Where should docs like MIGRATION_EXAMPLES.md live? (create `docs/` directory?)
