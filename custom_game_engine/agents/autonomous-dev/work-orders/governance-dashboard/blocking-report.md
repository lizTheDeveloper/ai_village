# Governance Dashboard - Blocking Report

**Feature:** governance-dashboard (Phase 14)
**Status:** BLOCKED
**Reported By:** spec-agent-001
**Date:** 2025-12-26

---

## Blocking Issue

The governance-dashboard feature CANNOT proceed to implementation because it is part of **Phase 14: Governance**, which is explicitly BLOCKED on **Phase 12: Economy & Trade**.

### Dependency Chain

```
Phase 12: Economy & Trade (🔒 BLOCKED)
    │
    ├─ Currency System
    ├─ Value Calculation
    ├─ Shop Buildings
    ├─ Trading System
    ├─ Price Negotiation
    └─ Economy Dashboard UI
    │
    └──> Phase 14: Governance (🔒 BLOCKED)
         │
         ├─ Government Types
         ├─ Leadership Roles
         ├─ Law System
         ├─ Voting/Decisions
         └─ Governance UI ← governance-dashboard
```

### Why Phase 14 Depends on Phase 12

From the governance-system spec analysis:

1. **Economic Policies** - Laws and policies in the governance system directly affect economy:
   - Trade tariffs (`PolicyEffect` targeting `village_treasury`)
   - Resource allocation policies
   - Taxation laws (`LawType: "taxation"`)
   - Merchant guild governance type

2. **Wealth-Based Governance** - Several governance features require economy:
   - `AppointmentMethod: "wealth"` - Leaders chosen by economic power
   - `GovernanceType: "merchant_guild"` - Economic power controls governance
   - Corruption tracking (requires resources to corrupt)

3. **Governance Costs** - Implementation assumes economic systems:
   - `Punishment.type: "fine"` requires currency system
   - Council member `contributions` (resources)
   - Federation `sharedResources` tracking

4. **Political Economy Integration** - UI requirements reference economy:
   - From `governance.md` line 99: `GovernanceDomain: "economy"` leaders
   - Economic minister role (`LeaderRole: "economic_minister"`)
   - Policy effects on trade and resources

---

## Missing Dependencies

Before governance-dashboard can be implemented, the following MUST be complete:

### Phase 12 Requirements (All 🔒 Blocked)

| Requirement | Status | Why Needed |
|-------------|--------|------------|
| Currency System | 🔒 Not Started | Required for fines, treasury, taxation |
| Value Calculation | 🔒 Not Started | Required for economic policies, wealth-based leadership |
| Shop Buildings | 🔒 Not Started | Required for merchant_guild governance type |
| Trading System | 🔒 Not Started | Required for trade policies, tariffs |
| Price Negotiation | 🔒 Not Started | Required for economic decision-making |
| Economy Dashboard UI | 🔒 Not Started | Governance UI integrates with economy UI |

### Backend Systems Required

From the governance-system spec, these systems need implementation first:

1. **GovernanceSystem** (ECS System)
   - Tracks `VillageGovernance` state
   - Manages leadership emergence
   - Handles council formation
   - Processes laws and policies

2. **LeadershipEmergence** mechanics
   - Authority factor calculations
   - Recognition events
   - Influence scoring

3. **Council mechanics**
   - Council formation logic
   - Voting system implementation
   - Meeting simulation

4. **Law System**
   - Law proposal and enactment
   - Enforcement tracking
   - Punishment application

5. **Justice/Dispute Resolution**
   - Dispute filing and processing
   - Verdict rendering
   - Restitution handling

**Current Status:** NONE of these backend systems exist yet.

---

## What CAN Be Done

While governance-dashboard is blocked, the following preparatory work is possible:

### 1. Complete Phase 12 First

Focus on implementing the Economy & Trade phase in order:

```
✅ Phase 9: Farming (COMPLETE)
✅ Phase 10: Crafting (COMPLETE)
✅ Phase 11: Animals (COMPLETE)
→ Phase 12: Economy ← START HERE
   → Phase 14: Governance ← THEN THIS
```

### 2. Create Backend Governance Systems

Even without economy, basic governance systems could be designed:

- `GovernanceComponent.ts` - Store village governance state
- `GovernanceSystem.ts` - Basic leadership tracking
- `LeadershipEmergenceSystem.ts` - Authority calculations
- Council data structures

**However:** Without economy integration, these would need significant rework later.

### 3. Design-Only Work Order

I could create a design-only work order that:
- Documents the full UI requirements
- Plans the component architecture
- Identifies integration points
- Lists all acceptance criteria

**But:** No implementation can occur until dependencies are met.

---

## Recommendation

**DO NOT PROCEED** with governance-dashboard implementation until:

1. ✅ Phase 12 (Economy & Trade) is COMPLETE
2. ✅ Backend governance systems are implemented:
   - GovernanceSystem
   - LeadershipEmergenceSystem
   - CouncilSystem
   - LawSystem
   - JusticeSystem

**Estimated Order:**

```
Current: Phase 10-11 cleanup
Next: Phase 12 (Economy) - ~3,000 LOC
Then: Phase 14 Backend (Governance Systems) - ~4,000 LOC
Finally: governance-dashboard (UI) - ~2,500 LOC
```

---

## Alternative: Parallel Work

If you want to work on Phase 14 concepts NOW without economy:

Consider starting with **Phase 27: Divine Communication** (⏳ Ready) or **Phase 22: Sociological Metrics** (⏳ Ready), which have their dependencies met and can run in parallel with other work.

---

## Human Intervention Required

**Question for Human:**

Would you like me to:

A. **Wait** - Do not create work order until Phase 12 is complete
B. **Design Only** - Create a design-only work order (no implementation)
C. **Override** - Proceed anyway and create incomplete work order
D. **Redirect** - Work on Phase 27 or Phase 22 instead

Please clarify how you'd like me to proceed.

---

## References

- **Roadmap:** [MASTER_ROADMAP.md](../../../MASTER_ROADMAP.md) Line 380-392 (Phase 14)
- **UI Spec:** [openspec/specs/ui-system/governance.md](../../../../../openspec/specs/ui-system/governance.md)
- **Backend Spec:** [openspec/specs/governance-system/spec.md](../../../../../openspec/specs/governance-system/spec.md)
- **Blocking Phase:** [MASTER_ROADMAP.md](../../../MASTER_ROADMAP.md) Line 345-360 (Phase 12)
