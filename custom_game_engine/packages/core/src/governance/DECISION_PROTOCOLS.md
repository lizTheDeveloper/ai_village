# Decision Protocols - Phase 6 AI Governance

## Overview

DecisionProtocols.ts implements three core protocols for hierarchical political decision-making across 7 tiers of governance, from villages (50-500 population) to galactic councils (1T+ population).

**Status:** ✅ Implemented (Phase 6)
**Location:** `/packages/core/src/governance/DecisionProtocols.ts`
**Tests:** `/packages/core/src/governance/__tests__/DecisionProtocols.test.ts`

## Three Core Protocols

### 1. Consensus Protocol (Democratic Decision-Making)

For parliaments, councils, and legislative bodies at all tiers.

**Use cases:**
- Village: Elder council votes on proposals
- City: City council votes on ordinances
- Nation: Parliament votes on national laws
- Federation: Federal council votes on treaties

**Example:**
```typescript
import { conductVote } from '@ai-village/core/governance';

const parliament = world.query().with(CT.Parliament).executeEntities();
const proposal: Proposal = {
  id: 'prop-001',
  topic: 'Build new hospital',
  description: 'Allocate budget for city hospital',
  proposedBy: mayorAgentId,
  proposedTick: world.tick,
};

const result = await conductVote(parliament, proposal, nationContext, world);
// result.decision === 'approved' | 'rejected'
// result.approvalPercentage === 0.67 (67% approval)
```

**Vote weights:**
- Equal voting (default): weight = 1.0 for all members
- Weighted voting: weight based on population, seniority, etc.

### 2. Delegation Protocol (Top-Down Authority)

For higher tiers issuing directives to lower tiers.

**Use cases:**
- Empire → Nation: "Prepare military for war"
- Nation → Province: "Increase agricultural production by 20%"
- Province → City: "Build garrison in strategic city"

**Example:**
```typescript
import { delegateDirective } from '@ai-village/core/governance';

const directive: DelegationChain = {
  origin: 'nation',
  directive: 'Mobilize provincial militias',
  targetTier: 'province',
  parameters: { mobilizationLevel: 0.5 },
  issuedTick: world.tick,
  issuerAgentId: kingAgentId,
  priority: 'urgent',
  requiresAcknowledgment: true,
};

delegateDirective(
  emperorEntity,
  provinceEntities,
  directive,
  world
);
```

**Validation:** Directives can only flow downward in the hierarchy.

### 3. Escalation Protocol (Bottom-Up Crisis Handling)

For crises that exceed local tier's capacity to handle.

**Use cases:**
- Province → Nation: Famine threatens 1M people
- Nation → Empire: Pandemic spreads across planets
- Empire → Galactic Council: Species extinction event

**Example:**
```typescript
import { escalateCrisis, shouldEscalate } from '@ai-village/core/governance';

const crisis: Crisis = {
  id: 'crisis-famine-001',
  type: 'famine',
  description: 'Regional crop failure',
  severity: 0.75,
  scope: 'province',
  affectedEntityIds: [provinceId],
  detectedTick: world.tick,
  populationAffected: 500000,
  status: 'active',
};

if (shouldEscalate(crisis, 'province')) {
  escalateCrisis(crisis, 'province', world);
  // Crisis now owned by 'nation' tier
}
```

## Political Tier Hierarchy

7 tiers from local to galactic governance:

| Tier | Population | Territory | Time Scale | Level |
|------|-----------|-----------|------------|-------|
| Village | 50-500 | Chunk | Real-time | 0 |
| City | 500-50K | Zone | 1 hour/tick | 1 |
| Province | 50K-5M | Region | 1 day/tick | 2 |
| Nation | 5M-500M | Planet regions | 1 month/tick | 3 |
| Empire | 100M-50B | Multi-planet | 1 year/tick | 4 |
| Federation | 10B-1T | Multi-system | 10 years/tick | 5 |
| Galactic Council | 1T+ | Galaxy-wide | 100 years/tick | 6 |

**Utility functions:**
```typescript
import {
  tierLevel,
  getNextHigherTier,
  isTierHigherThan,
  getAllTiersOrdered,
  getTierDisplayName,
} from '@ai-village/core/governance';

tierLevel('province'); // 2
getNextHigherTier('province'); // 'nation'
isTierHigherThan('nation', 'village'); // true
getAllTiersOrdered(); // ['village', 'city', ..., 'galactic_council']
getTierDisplayName('nation'); // 'Nation'
```

## Escalation Rules

60+ predefined escalation rules across 10 crisis types:

### Crisis Types
- **Military:** military_attack (village → city → nation → empire)
- **Stability:** rebellion (city → province → nation)
- **Resources:** famine (city → province → nation)
- **Health:** plague (city → province → nation → empire)
- **Environmental:** natural_disaster (province → nation)
- **Economic:** economic_collapse (province → nation → empire)
- **Diplomatic:** diplomatic_incident (nation → empire → federation)
- **Technology:** technology_threat (empire → galactic_council)
- **Existential:** species_extinction (empire → galactic_council)
- **Cosmic:** cosmic_threat (federation → galactic_council)

### Escalation Logic

Crisis severity (0-1) + crisis type determine required tier:

```typescript
// Minor skirmish (severity 0.3)
shouldEscalate(minorAttack, 'village') // true → escalate to 'city'
shouldEscalate(minorAttack, 'city')    // false → city can handle

// Full invasion (severity 0.85)
shouldEscalate(invasion, 'village')   // true → needs 'nation'
shouldEscalate(invasion, 'province')  // true → needs 'nation'
shouldEscalate(invasion, 'nation')    // false → nation can handle

// Galaxy-ending threat (severity 1.0)
shouldEscalate(cosmicThreat, 'empire')     // true → needs galactic_council
shouldEscalate(cosmicThreat, 'federation') // true → needs galactic_council
shouldEscalate(cosmicThreat, 'galactic_council') // false → highest tier
```

**Performance optimization:** Early exit for local crises (no iteration through all rules if crisis can be handled locally).

## Integration with Governance Systems

### Current Components

**Existing (Tier 0-2):**
- `VillageGovernanceComponent` - Village-level governance
- `ProvinceGovernanceComponent` - Province-level governance
- `TownHallComponent` - Population tracking
- `CensusBureauComponent` - Demographics

**TODO (Phase 6):**
- `NationGovernanceComponent` - National government
- `EmpireGovernanceComponent` - Imperial administration
- `FederationGovernanceComponent` - Federal council
- `GalacticCouncilComponent` - Galactic assembly

### System Integration

Decision protocols are designed to integrate with:
- **GovernanceDataSystem** - Updates governance building data
- **ProvinceGovernanceSystem** - Provincial administration
- **CityDirectorSystem** - City-level governance (TODO)
- **DiplomacySystem** - International relations (TODO)
- **CrisisManagementSystem** - Crisis detection and escalation (TODO)

### Event Bus Integration

Protocols emit events for other systems to react:

```typescript
// TODO: Add to EventMap
world.eventBus.emit('governance:crisis_escalated', {
  crisisId: string,
  crisisType: CrisisType,
  fromTier: PoliticalTier,
  toTier: PoliticalTier,
  severity: number,
  affectedEntityIds: string[],
});

world.eventBus.emit('governance:directive_received', {
  directiveId: string,
  fromTier: PoliticalTier,
  toTier: PoliticalTier,
  governorId: string,
  priority: 'routine' | 'urgent' | 'critical',
});

world.eventBus.emit('governance:vote_completed', {
  proposalId: string,
  decision: 'approved' | 'rejected',
  approvalPercentage: number,
  tier: PoliticalTier,
});
```

## Performance Characteristics

### Escalation Protocol
- **Best case:** O(1) - Early exit for local crises (no escalation needed)
- **Worst case:** O(N) - Must check all escalation rules for crisis type
- **Average:** O(k) where k = escalation rules for crisis type (~3-5 rules)

### Tier Hierarchy
- **Tier comparison:** O(1) - Direct map lookup
- **Next tier:** O(7) - Fixed iteration over 7 tiers
- **All tiers:** O(7) - Returns pre-sorted array

### Consensus Protocol
- **Vote collection:** O(n) where n = parliament size
- **Vote tallying:** O(n) single pass over votes
- **LLM calls:** Batched for soul agents (future optimization)

## Testing

Run tests:
```bash
npm test -- DecisionProtocols
```

Test coverage:
- ✅ Tier hierarchy (levels, ordering, comparison)
- ✅ Escalation rules (10 crisis types, 60+ rules)
- ✅ Edge cases (lowest/highest tier, no matching rules)
- ✅ Performance (early exit, tier comparison speed)

## Future Extensions

### Phase 6 Completion
1. Implement remaining governance components (Nation, Empire, Federation, Galactic Council)
2. Add event bus events to EventMap
3. Create CrisisManagementSystem for automatic crisis detection
4. Integrate with soul agent decision-making for LLM-driven votes
5. Add DiplomacySystem for inter-tier negotiations

### Phase 7+ (Advanced Governance)
1. **Dynamic Escalation Rules** - AI-generated rules based on historical outcomes
2. **Coalition Building** - Multi-agent consensus with negotiation
3. **Corruption/Influence** - Vote manipulation, bribery, lobbying
4. **Constitutional Systems** - Laws that constrain governance
5. **Revolution/Succession** - Government overthrow mechanics
6. **Federalism Models** - Different power-sharing arrangements
7. **Bureaucracy Simulation** - Directive implementation delays/failures

## References

- **Spec:** `/openspec/specs/grand-strategy/06-POLITICAL-HIERARCHY.md`
- **Components:** `/packages/core/src/components/governance.ts`
- **Systems:** `/packages/core/src/systems/GovernanceDataSystem.ts`
- **README:** `/packages/core/src/governance/README.md`

## Architecture Diagram

```
Galactic Council (Tier 6) ← Species extinction, cosmic threats
    ↓ delegates / ↑ escalates
Federation (Tier 5) ← Inter-empire conflicts, stellar threats
    ↓ delegates / ↑ escalates
Empire (Tier 4) ← Multi-planet crises, major tech threats
    ↓ delegates / ↑ escalates
Nation (Tier 3) ← Wars, pandemics, national disasters
    ↓ delegates / ↑ escalates
Province (Tier 2) ← Regional famines, epidemics, uprisings
    ↓ delegates / ↑ escalates
City (Tier 1) ← Local outbreaks, economic issues, raids
    ↓ delegates / ↑ escalates
Village (Tier 0) ← Daily operations, local disputes
```

**Consensus Protocol** operates horizontally within each tier (councils vote).
**Delegation Protocol** flows downward (higher tiers command lower tiers).
**Escalation Protocol** flows upward (crises bubble up when local tier can't handle).
