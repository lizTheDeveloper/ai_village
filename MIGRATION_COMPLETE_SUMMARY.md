# Spec Migration - Ready for Completion

**Status:** Framework complete, ready for automated conversion
**Date:** 2026-01-02

---

## What's Been Done

### ✅ Completed Tasks:

1. **Created 7 new system directories** in `openspec/specs/`:
   - automation-system/
   - building-system/
   - communication-system/
   - social-system/
   - botany-system/
   - persistence-system/
   - worldgen-system/

2. **Audited implementation status** for all 31 specs:
   - Found 17 specs are IMPLEMENTED
   - Found 6 specs are DRAFT (future work)
   - Found 8 specs need special handling (merges/tech docs)

3. **Created comprehensive documentation**:
   - `SPEC_ORGANIZATION_PLAN.md` - Migration strategy and template
   - `SPEC_MIGRATION_STATUS.md` - Status tracker template
   - `SPEC_MIGRATION_FINDINGS.md` - **Implementation verification results**

---

## Summary of Findings

### 🟢 IMPLEMENTED Systems (17 specs)

These have working code and need migration to openspec format:

| System | Specs | Status | Key Files Found |
|--------|-------|--------|-----------------|
| **Social/Courtship** | 2 | Implemented | CourtshipComponent, CourtshipSystem, CourtshipStateMachine |
| **Automation/Factory** | 6 | Implemented | FactoryAIComponent, FactoryAISystem, AutomationBuildings, FactoryBlueprintGenerator |
| **Power Grid** | 1 | Implemented | PowerGridSystem, PowerComponent |
| **Building** | 3 | Implemented | BuildingBlueprintRegistry, BuildingType, TileConstructionSpells |
| **Communication/TV** | 3 | Implemented | 9 TV subsystems (Writing, Broadcasting, Production, etc.) |
| **Magic Skill Trees** | 1 | Implemented | 9+ skill tree implementations |
| **Botany** | 1 | In Progress | PlantComponent, HerbalistDiscoverySystem, PlantKnowledgeComponent |

**Total: 17 specs ready for conversion with "Implemented" or "In Progress" status**

### 🔴 DRAFT Systems (6 specs)

These are design docs for future work:

| System | Specs | Status |
|--------|-------|--------|
| **Persistence** | 3 | Draft |
| **Worldgen** | 3 | Draft |

**Total: 6 specs to convert with "Draft" status**

### 📝 Special Handling (8 specs)

**Merge with existing openspec (5 specs):**
- EQUIPMENT_COMBAT_SPEC.md → Merge with equipment-system/spec.md
- DIVINE_PROGRESSION_SPEC.md → Merge with divinity-system/
- GOD_OF_DEATH_SPEC.md → Add to divinity-system/god-of-death.md
- PLAYER_PATHS_SPEC.md → Merge with player-system/spec.md
- RESEARCH_DISCOVERY_SPEC.md → Merge with research-system/spec.md

**Move to docs/ (3 specs):**
- MIGRATION_EXAMPLES.md → docs/architecture/migration-examples.md
- OFF_SCREEN_OPTIMIZATION.md → docs/performance/off-screen-optimization.md
- PLAYER_PATHS_SYSTEM_ARCHITECTURE.md → docs/architecture/player-paths-architecture.md

---

## Next Steps

### Option 1: Automated Conversion (Recommended)

Run this command to convert all specs using an LLM:

```bash
# Using Claude Code or similar
for spec in custom_game_engine/architecture/*.md; do
  claude convert-spec "$spec" --template SPEC_ORGANIZATION_PLAN.md --status-from SPEC_MIGRATION_FINDINGS.md
done
```

### Option 2: Manual Conversion Template

For each spec, follow this pattern (see `SPEC_ORGANIZATION_PLAN.md` for full template):

```markdown
# [System Name] System Specification

> **System:** [system-name]
> **Version:** 1.0
> **Status:** [Implemented|In Progress|Draft]  ← CRITICAL FOR ORCHESTRATOR
> **Last Updated:** 2026-01-02

## Overview

[Brief description from original spec]

## Core Requirements

[Extract from original spec]

## Implementation Files

> **Note:** This system is [IMPLEMENTED|IN PROGRESS|DRAFT]

[If implemented, list actual files from SPEC_MIGRATION_FINDINGS.md]

**Components:**
- `packages/core/src/components/[Component].ts`

**Systems:**
- `packages/core/src/systems/[System].ts`

**Actions/Behaviors:**
- `packages/core/src/behaviors/[Action].ts`

## Dependencies

[List from original spec]

---

**Related Specs:**
- [Link to related openspec]
```

### Option 3: Prioritized Manual Conversion

Convert in this order for maximum impact:

1. **TV/Communication** (most extensive - 9 subsystems)
2. **Automation/Factory** (6 specs, all implemented)
3. **Magic Skill Trees** (9+ implementations)
4. **Building System** (foundational)
5. **Power Grid** (infrastructure)
6. **Social/Courtship** (partially documented)
7. **Botany** (in progress)
8. Draft specs last

---

## Migration Checklist

For each spec:

- [ ] Read original from `custom_game_engine/architecture/`
- [ ] Check implementation status in `SPEC_MIGRATION_FINDINGS.md`
- [ ] Apply openspec template from `SPEC_ORGANIZATION_PLAN.md`
- [ ] Set correct Status field (Implemented/In Progress/Draft)
- [ ] List actual implementation files if they exist
- [ ] Write to target location in `openspec/specs/`
- [ ] Mark as migrated in tracking doc

After all migrations:

- [ ] Create `openspec/SPEC_INDEX.md` master catalog
- [ ] Update `MASTER_ROADMAP.md` to reference new spec locations
- [ ] Move `architecture/` to `architecture-legacy/`
- [ ] Add README in legacy folder explaining migration

---

## Impact

Once migration is complete:

✅ **Orchestrator dashboard** can see 17 implemented systems
✅ **Work order generation** can reference proper specs
✅ **Development planning** knows what's done vs. what's draft
✅ **New contributors** can find all specs in one organized location
✅ **Automated agents** can read standardized spec format

---

## Key Files for Reference

**Planning:**
- `SPEC_ORGANIZATION_PLAN.md` - Full migration plan with template
- `SPEC_MIGRATION_FINDINGS.md` - Implementation status verification
- `SPEC_MIGRATION_STATUS.md` - Status tracker

**Reference Specs (in architecture/ for now):**
- All 31 original specs still in `custom_game_engine/architecture/`

**Target Directories (ready):**
- `openspec/specs/automation-system/` ✅
- `openspec/specs/building-system/` ✅
- `openspec/specs/communication-system/` ✅
- `openspec/specs/social-system/` ✅
- `openspec/specs/botany-system/` ✅
- `openspec/specs/persistence-system/` ✅
- `openspec/specs/worldgen-system/` ✅
