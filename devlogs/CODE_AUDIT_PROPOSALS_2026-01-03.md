# Code Audit Proposals - Created 2026-01-03

**Source:** `devlogs/TEMPORARY_CODE_AUDIT_2026-01-03.md`
**Created By:** claude-code-agent
**Date:** 2026-01-03

## Overview

Converted 100+ TODO items from code audit into 8 structured OpenSpec proposals, prioritized by impact.

All proposals are now in `openspec/changes/` and ready for implementation.

---

## Critical Priority Proposals (4)

These block core functionality and should be addressed first.

### 1. Fix LLM Package Imports
**Location:** `openspec/changes/fix-llm-package-imports/`
**Complexity:** 1 system
**Impact:** Soul creation system completely non-functional

**Blocks:**
- SoulCreationSystem (disabled)
- LLMGenerationSystem (disabled)
- Any LLM-powered features

**Next Steps:**
1. Fix `@ai-village/llm` package exports
2. Remove `any` type workarounds
3. Re-enable disabled systems

---

### 2. Implement ItemInstance Registry
**Location:** `openspec/changes/implement-item-instance-registry/`
**Complexity:** 2 systems
**Impact:** Equipment never breaks, items have no individual state

**Blocks:**
- Equipment durability system
- Item enchantments
- Item history tracking
- 5+ locations waiting for implementation

**Next Steps:**
1. Create ItemInstance registry
2. Add durability tracking
3. Update EquipmentSystem
4. Add serialization support

---

### 3. Complete World State Serialization
**Location:** `openspec/changes/complete-world-serialization/`
**Complexity:** 3 systems
**Impact:** Saves don't preserve complete world state

**Missing:**
- Terrain serialization
- Weather serialization
- Zone serialization
- Building placement serialization
- Multiverse state (passages, player, absoluteTick)
- UniverseDivineConfig

**Next Steps:**
1. Implement terrain save/load
2. Implement weather save/load
3. Implement zone save/load
4. Implement building placement save/load
5. Add multiverse persistence
6. Add divine config

---

### 4. Re-Enable Disabled Combat & Social Systems
**Location:** `openspec/changes/re-enable-disabled-systems/`
**Complexity:** 4 systems
**Impact:** Combat and social dominance mechanics non-functional

**Disabled Systems:**
- GuardDutySystem (not fully implemented)
- PredatorAttackSystem (stub only)
- DominanceChallengeSystem (not fully implemented)
- DeathHandling (not fully implemented)

**Next Steps:**
1. Audit each system
2. Decide: complete or remove
3. Implement or clean up
4. Re-enable if keeping

---

## High Priority Proposals (4)

These significantly impact gameplay quality.

### 5. Implement Intelligent Pathfinding
**Location:** `openspec/changes/implement-pathfinding-system/`
**Complexity:** 2 systems
**Impact:** Agents wander randomly instead of navigating intelligently

**Current State:** All movement uses `move: 'wander'` placeholder

**Next Steps:**
1. Choose algorithm (A*, flow fields, or hybrid)
2. Implement pathfinding
3. Add obstacle avoidance
4. Replace all wander placeholders
5. Optimize performance

---

### 6. Implement Power Consumption System
**Location:** `openspec/changes/implement-power-consumption/`
**Complexity:** 2 systems
**Impact:** Electric devices work indefinitely without power

**Current State:** Devices don't drain power from grids/generators

**Next Steps:**
1. Implement power grid system
2. Add power sources (generators, solar)
3. Add power consumers (appliances, lights)
4. Implement brownout/blackout mechanics
5. Add power management UI

---

### 7. Fix Permission Validation
**Location:** `openspec/changes/fix-permission-validation/`
**Complexity:** 1 system
**Impact:** Agents bypass authorization, access restricted resources

**Current State:** Placeholder permission logic, no enforcement

**Next Steps:**
1. Implement permission checking
2. Add state validation
3. Implement all restriction types
4. Add denial handling
5. Test enforcement

---

### 8. Add Memory Filtering Methods
**Location:** `openspec/changes/add-memory-filtering-methods/`
**Complexity:** 1 system
**Impact:** Cannot filter memories by type, 3+ locations blocked

**Missing Methods:**
- `getMemoriesByType(type)`
- `getMemoriesByLocation(location, radius)`
- `getRecentMemories(count)`
- `getMemoriesByImportance(threshold)`

**Next Steps:**
1. Implement filtering methods
2. Add performance indices
3. Update 3+ call sites
4. Test with large memory sets

---

## Statistics

**Total Proposals Created:** 8
- **Critical Priority:** 4 proposals
- **High Priority:** 4 proposals

**Total Systems Affected:** 16 systems
**Total TODO Items Addressed:** ~40 high-impact items

**Not Yet Converted:**
- Medium priority items (LLM integration placeholders, component TODOs)
- Low priority items (test fixes, UI placeholders, documentation)
- Can be converted to proposals as needed

---

## How to Work on These

### For Implementation Agents

Pick a proposal from `openspec/changes/` and follow OpenSpec workflow:

1. **Pick approved proposal** (after architect review)
2. **Read proposal and tasks**
3. **Implement according to requirements**
4. **Submit for PM validation**
5. **Submit for test validation**
6. **Get archived by architect**

### For Architect Agent

Review proposals:

```bash
# Review a proposal
cat openspec/changes/fix-llm-package-imports/proposal.md

# Approve if good
# Update Status: Draft -> Approved in proposal.md
# Notify implementation agents
```

### For Prioritization

**Do first (Critical):**
1. Fix LLM Package Imports (blocks soul creation)
2. Implement ItemInstance Registry (blocks equipment system)
3. Complete World Serialization (blocks save/load fidelity)
4. Re-Enable Disabled Systems (blocks combat/social)

**Do next (High):**
5. Implement Pathfinding (improves AI intelligence)
6. Implement Power Consumption (adds energy management)
7. Fix Permission Validation (fixes security holes)
8. Add Memory Filtering (unblocks 3+ call sites)

---

## Next Steps

1. **Architect review** - Review and approve proposals
2. **Implementation agents** - Pick approved proposals and execute
3. **Additional conversions** - Convert medium/low priority items as capacity allows
4. **Track progress** - Update proposal statuses as work progresses

---

**Created:** 2026-01-03
**Source Audit:** devlogs/TEMPORARY_CODE_AUDIT_2026-01-03.md
**Total Code TODOs:** 100+
**Converted to Proposals:** 8 critical/high priority items
**Remaining TODOs:** Can be converted on demand
