# Specification Audit & Consolidation Plan
**Date:** 2025-12-29
**Status:** 🔴 URGENT - Specs scattered across multiple locations

---

## Summary

**Problem:** Specification documents exist in 4+ different locations, creating confusion about the source of truth.

**Sources of Truth Identified:**
1. **MASTER_ROADMAP.md** - Declared "single source of truth for implementation order"
2. **openspec/** - New structured proposal/spec system (official, organized)
3. **custom_game_engine/specs/** - 18 implementation specs (some duplicate openspec)
4. **custom_game_engine/docs/** - 12 analysis/design docs
5. **custom_game_engine/agents/autonomous-dev/ROADMAP.md** - Old autonomous-dev roadmap

---

## Inventory

### 1. `/openspec/specs/` (✅ CANONICAL - Keep Here)

**Well-organized by system:**
- agent-system/ (10 specs)
- animal-system/ (1 spec)
- avatar-system/ (1 spec)
- conflict-system/ (1 spec)
- construction-system/ (1 spec)
- divinity-system/ (5 specs including README)
- economy-system/ (2 specs)
- farming-system/ (1 spec)
- game-engine/ (1 spec)
- governance-system/ (1 spec)
- items-system/ (2 specs)
- magic-system/ (1 spec)
- nexus-system/ (1 spec)
- player-system/ (1 spec)
- progression-system/ (1 spec)
- rendering-system/ (1 spec)
- research-system/ (2 specs)
- testing/ (1 spec)
- ui-system/ (28 UI specs)
- universe-system/ (1 spec)
- world-system/ (3 specs)

**Also contains:**
- BUGS_20251222.md
- consciousness-implementation-phases.md
- FEASIBILITY_REVIEW.md

**Total:** ~70 well-organized spec files

---

### 2. `/custom_game_engine/specs/` (⚠️ DUPLICATES & IMPLEMENTATION SPECS)

**18 files that need review:**

#### A. Dev Log Entries (Complement openspec - KEEP)
1. **temperature-shelter-system.md** - Dev log: how temperature system was built
2. **sociological-metrics-system.md** - Dev log: metrics implementation decisions
3. **behavior-queue-system.md** - Dev log: completed behavior queue feature
4. **behavior-queue-implementation-plan.md** - Dev log: implementation plan executed
5. **quality-appraisal-trading.md** - Dev log: trading quality system approach
6. **body-parts-system.md** - Dev log: body parts implementation
7. **corpse-system.md** - Dev log: corpse system decisions
8. **death-lifecycle-integration.md** - Dev log: lifecycle integration approach
9. **magic-cost-system.md** - Dev log: magic cost calculations
10. **multiverse-divinity-crossing.md** - Dev log: divinity multiverse approach
11. **unified-dashboard-system.md** - Dev log: dashboard implementation

**Recommendation:** Keep these in custom_game_engine/specs/ as dev log entries

#### B. Duplicates of openspec (MIGRATE OR CONSOLIDATE)
12. **divine-communication-system.md** - ⚠️ DUPLICATE of openspec/specs/divinity-system/
13. **angel-delegation-system.md** - ⚠️ DUPLICATE of openspec/specs/divinity-system/
14. **divine-systems-integration.md** - ⚠️ DUPLICATE of openspec/specs/divinity-system/
15. **divine-systems-ui.md** - ⚠️ Related to openspec/specs/ui-system/magic-divinity-ui.md
16. **mythological-realms.md** - ⚠️ Related to openspec/specs/divinity-system/
17. **realm-species-creation.md** - ⚠️ Related to openspec/specs/agent-system/species-system.md
18. **dimensional-rendering-system.md** - ⚠️ Related to openspec/specs/rendering-system/

**Recommendation:** Review for overlap, migrate unique content to openspec

---

### 3. `/custom_game_engine/docs/` (📚 ANALYSIS DOCS - Different Purpose)

**12 files - These are analysis/design documents, NOT specs:**

1. ALTERNATIVE_REPRODUCTION_GENETICS.md - Analysis/exploration
2. ANIMAL_BONDING_SYSTEM.md - Analysis/exploration
3. ANIMAL_GENETICS_BREEDING_SYSTEM.md - Analysis/exploration
4. ANIMAL_SYSTEM_ANALYSIS.md - Analysis document
5. COOKING_MOOD_PREFERENCE_SYSTEM.md - Analysis/exploration
6. COOKING_RESEARCH_TREE.md - Analysis/exploration
7. DNA_AS_ECS_COMPONENTS.md - Design exploration
8. EPISTEMIC_LEARNING_SPEC.md - Exploration spec
9. HIVE_MIND_COLLECTIVE_INTELLIGENCE_SPEC.md - Exploration spec
10. MOOD_SYSTEM_INTEGRATION_ANALYSIS.md - Analysis
11. NAVIGATION_EXPLORATION_SPEC.md - ⚠️ May be implementation spec
12. wiki/ - Documentation folder

**Recommendation:**
- Keep analysis docs in /docs/ (they're brainstorming/exploration)
- Move NAVIGATION_EXPLORATION_SPEC.md if it's an actual implementation spec

---

### 4. Roadmap Files

#### A. `/MASTER_ROADMAP.md` (✅ Keep - Single Source of Truth)
- **Status:** Current, comprehensive, well-maintained
- **Purpose:** Implementation order and phase tracking
- **Location:** Root level ✅

#### B. `/custom_game_engine/agents/autonomous-dev/ROADMAP.md` (❌ Redundant)
- **Status:** Older, less comprehensive
- **Purpose:** Autonomous dev workflow (superseded)
- **Recommendation:** Archive or delete

#### C. `/openspec/README.md` + `/openspec/WORKFLOW_SUMMARY.md` (✅ Keep)
- **Status:** Current workflow for proposals
- **Purpose:** OpenSpec proposal system
- **Location:** Correct ✅

---

## Migration Plan

### Phase 1: Identify Duplicates (CURRENT)
✅ Audit complete

### Phase 2: Review Overlapping Specs

**For each spec in custom_game_engine/specs/ that overlaps with openspec:**

1. **divine-communication-system.md** vs **openspec/specs/divinity-system/**
   - Compare content
   - Merge unique implementation details into openspec
   - Delete or archive custom_game_engine version

2. **angel-delegation-system.md** vs **openspec/specs/divinity-system/**
   - Same as above

3. **divine-systems-ui.md** vs **openspec/specs/ui-system/magic-divinity-ui.md**
   - Same as above

4. **mythological-realms.md**, **realm-species-creation.md**, **dimensional-rendering-system.md**
   - Review for unique content
   - Migrate to openspec if needed

### Phase 3: Establish Clear Structure

**PROPOSED STRUCTURE:**

```
/
├── MASTER_ROADMAP.md                    # ✅ Implementation order & phase tracking
├── CLAUDE.md                             # ✅ Development guidelines
│
├── openspec/                             # ✅ CANONICAL SPECS
│   ├── specs/                            # Requirements & architecture
│   │   ├── agent-system/
│   │   ├── divinity-system/
│   │   ├── magic-system/
│   │   └── [etc...]
│   ├── changes/                          # Active proposals
│   └── archive/                          # Completed proposals
│
└── custom_game_engine/
    ├── specs/                            # ✅ DEV LOG ONLY
    │   ├── temperature-shelter-system.md # Dev log entry
    │   ├── sociological-metrics-system.md
    │   ├── magic-cost-system.md
    │   └── [other dev log entries]
    │
    ├── docs/                             # ✅ ANALYSIS & EXPLORATION
    │   ├── ANIMAL_SYSTEM_ANALYSIS.md     # Analysis docs
    │   ├── DNA_AS_ECS_COMPONENTS.md
    │   └── [exploration docs]
    │
    └── agents/autonomous-dev/
        ├── work-orders/                  # ✅ Work tracking
        └── ROADMAP.md                    # ❌ DELETE (redundant with MASTER_ROADMAP)
```

### Phase 4: Move Files

**Files to Move/Merge:**

1. Merge divine-related specs from custom_game_engine/specs/ → openspec/specs/divinity-system/
2. Archive custom_game_engine/agents/autonomous-dev/ROADMAP.md
3. Update all cross-references

### Phase 5: Update Documentation

Update these files to reference the new structure:
- MASTER_ROADMAP.md
- CLAUDE.md
- openspec/README.md
- openspec/AGENTS.md

---

## Recommendations

### Immediate Actions

1. ✅ **MASTER_ROADMAP.md is the source of truth** - Confirmed correct
2. ⚠️ **Merge divine system specs** - Duplicates exist between custom_game_engine/specs/ and openspec/specs/divinity-system/
3. ⚠️ **Archive old ROADMAP** - custom_game_engine/agents/autonomous-dev/ROADMAP.md is redundant
4. ✅ **Keep openspec/ as canonical** - Already well-organized

### Distinction Rules

Going forward:

**openspec/specs/** → Requirements, architecture, "what to build"
- System specifications
- Feature requirements
- API contracts
- UI/UX specifications

**custom_game_engine/specs/** → Dev log, "how we built it"
- Implementation journal & decisions made during development
- Performance optimizations discovered
- Integration patterns that emerged
- System-specific details & trade-offs

**custom_game_engine/docs/** → Analysis, exploration, research
- Feasibility studies
- Design explorations
- System analysis
- Research notes

---

---

## Dashboard Dependencies Analysis

**Orchestration Dashboard Location:** `agents/autonomous-dev/dashboard/server.js`

**Critical Paths (DO NOT BREAK):**

```javascript
const ROADMAP_PATH = path.join(PROJECT_ROOT, 'MASTER_ROADMAP.md');  // Line 21
const WORK_ORDERS_DIR = path.join(__dirname, '../work-orders');      // Line 22
```

**What the Dashboard Reads:**
1. ✅ **MASTER_ROADMAP.md** (project root) - Parses phases and tasks
2. ✅ **work-orders/** (agents/autonomous-dev/work-orders/) - Lists and manages work orders
3. ❌ **Does NOT read openspec/** - Safe to modify
4. ❌ **Does NOT read custom_game_engine/specs/** - Safe to modify

**API Endpoints Provided:**
- `GET /api/roadmap` - Returns MASTER_ROADMAP.md content
- `GET /api/work-orders` - Lists all work orders with status
- `GET /api/work-orders/:name` - Gets specific work order content
- `POST /api/work-orders/:name/archive` - Archives work order
- And more...

**SAFE OPERATIONS (Won't Break Dashboard):**
- ✅ Move/merge specs in custom_game_engine/specs/ → openspec/specs/
- ✅ Move/merge docs in custom_game_engine/docs/
- ✅ Delete custom_game_engine/agents/autonomous-dev/ROADMAP.md (not read by dashboard)
- ✅ Consolidate divine system specs

**UNSAFE OPERATIONS (WILL Break Dashboard):**
- ❌ Move MASTER_ROADMAP.md from project root
- ❌ Move or rename work-orders/ directory
- ❌ Change work-order.md filename convention
- ❌ Change work order directory structure

**Conclusion:** Our consolidation plan is SAFE. The dashboard only reads MASTER_ROADMAP.md and work-orders/, both of which we're keeping in place.

---

## Next Steps

1. **Human Review:** Confirm this structure before proceeding
2. **Compare Overlapping Specs:** Detail comparison of divine system specs
3. **Execute Migration:** Move/merge files as needed
4. **Update References:** Fix all broken links
5. **Clean Up:** Archive old files

---

---

## Work Orders Discovery

### 5. `/custom_game_engine/agents/autonomous-dev/work-orders/` (🔄 TASK TRACKING)

**49 work order directories** - Active task tracking for autonomous agent workflow

**Structure:**
- Each work order is a directory with multiple status files
- Work orders have lifecycle: READY_FOR_IMPLEMENTATION → IN_PROGRESS → READY_FOR_TESTS → COMPLETED
- Many work orders contain their own `spec.md` files (!!)

**Current Status:**
- 16 READY_FOR_IMPLEMENTATION
- 2 READY_FOR_TESTS
- 2 COMPLETED
- 1 PENDING

**Examples:**
- `governance-dashboard/` - 42 files (implementation reports, playtest results, test results)
- `progressive-skill-reveal/` - work-order.md + spec files
- `skill-system/` - spec.md + prompt templates
- `itemquality-system/` - work order
- And 45 more...

**Relationship to Other Systems:**
- Work orders reference specs from both `openspec/specs/` AND `custom_game_engine/specs/`
- Work orders are managed by the `orchestrator` agent (see `agents/orchestrator.md`)
- Work orders use chatroom MCP for coordination between agents
- Work orders track implementation progress, NOT requirements

**Purpose:** Task tracking and agent coordination (complementary to specs)

**Recommendation:**
- Keep work orders separate - they're task/project management, not specs
- Work orders should REFERENCE specs, not CONTAIN them
- Some work orders have embedded specs → extract to appropriate spec location

---

## System Relationships Discovered

```
MASTER_ROADMAP.md ──────► Phases & implementation order
                          (What needs to be built, in what order)
         │
         │
         ▼
openspec/specs/ ────────► Requirements & Architecture
                          (WHAT to build - the contract)
         │
         │ references
         ▼
openspec/changes/ ──────► Active Proposals
                          (Proposed changes awaiting approval)
         │
         │ approved
         ▼
work-orders/ ───────────► Task Tracking & Execution
                          (HOW we're building it - progress tracking)
         │
         │ implements
         ▼
custom_game_engine/specs/──► Dev Log
                          (HOW we built it - development journal)
         │
         │ informs
         ▼
custom_game_engine/docs/ ──► Research & Analysis
                          (WHY we built it this way - exploration)
```

**The Problem:**
- Work orders sometimes embed specs (should reference instead)
- custom_game_engine/specs/ duplicates openspec/specs/ (divine system)
- Multiple "source of truth" claims (MASTER_ROADMAP vs openspec)
- Unclear boundary between work orders and specs

---

## Questions for Human

1. ✅ **RESOLVED:** custom_game_engine/specs/ = Dev log (development journal), kept separate from openspec
2. Keep custom_game_engine/docs/ for exploration or move to openspec/research/?
3. Archive or delete custom_game_engine/agents/autonomous-dev/ROADMAP.md?
4. **NEW:** Should work orders embed specs or only reference them?
5. **NEW:** What should the orchestration dashboard read from?
   - MASTER_ROADMAP.md (phases)
   - openspec/changes/ (proposals)
   - work-orders/ (active tasks)
   - All three?
