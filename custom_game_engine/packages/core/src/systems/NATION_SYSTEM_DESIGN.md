# NationSystem Enhancement Design

> **Status:** Design Document
> **Version:** 1.0
> **Created:** 2026-02-01
> **Related Files:**
> - `NationSystem.ts` - Implementation target
> - `NationComponent.ts` - Data structures
> - `openspec/specs/economy-system/spec.md` - Economy spec (village-level)
> - `openspec/specs/governance-system/spec.md` - Governance spec
> - `openspec/specs/research-system/knowledge-tree.md` - Research spec

## Executive Summary

This document designs the implementation for six TODOs in NationSystem:

1. **Economic Modeling** (trade, tariffs, state enterprises)
2. **Per-Province Taxation**
3. **Stability Factors** (unrest, loyalty)
4. **Research Mechanics** (tech tree)
5. **Policy Effects** (economy, military, culture)
6. **Diplomacy** (opinion, treaties, alliances)

### Key Design Principles

- **Leverage existing specs** - Adapt village-level patterns to nation scale
- **Reuse EmpireDiplomacySystem patterns** - Opinion calculation, treaty execution already exist
- **Aggregate from provinces** - Nations aggregate province data, not duplicate it
- **Strategic abstraction** - 1 month/tick means coarse-grained simulation
- **Event-driven** - Emit events for cross-system integration

---

## 1. Economic Modeling System

### Current State
- `updateEconomy()` calculates basic tax revenue from GDP
- No trade modeling, tariffs as `customsDuties: number`, no state enterprises

### Existing Patterns
From `economy-system/inter-village-trade.md`:
- Trade routes with traffic volumes
- Tariffs in trade agreements
- Regional pricing with supply/demand

### Design

#### 1.1 National Trade Model

```typescript
// Add to NationComponent.economy
interface NationalTradeState {
  // Trade balance
  exports: Map<string, number>;      // Resource → value exported this period
  imports: Map<string, number>;      // Resource → value imported this period
  tradeBalance: number;              // exports - imports

  // Trading partners (nation IDs → trade volume)
  tradingPartners: Map<string, {
    volume: number;                  // Total trade value
    balance: number;                 // +/- from our perspective
    tariffsPaid: number;             // Tariffs they paid us
    tariffsPaidToThem: number;       // Tariffs we paid them
  }>;

  // Trade routes through our territory
  transitTrade: number;              // Value of goods passing through (customs revenue)
}
```

#### 1.2 Tariff System

```typescript
interface TariffPolicy {
  // General tariff rates
  importTariff: number;              // 0-1 (0.1 = 10% on imports)
  exportTariff: number;              // Usually 0, but can tax exports

  // Per-resource overrides
  resourceTariffs: Map<string, {
    importRate: number;
    exportRate: number;
    reason: 'protection' | 'luxury' | 'strategic' | 'embargo';
  }>;

  // Per-nation overrides (from treaties)
  nationTariffs: Map<string, {
    rate: number;                    // Override general rate
    treatyId?: string;               // Treaty granting this rate
  }>;
}
```

#### 1.3 State Enterprises

```typescript
interface StateEnterprise {
  id: string;
  name: string;
  sector: 'mining' | 'manufacturing' | 'agriculture' | 'infrastructure' | 'banking';

  // Operations
  revenue: number;                   // Annual revenue
  operatingCost: number;             // Annual costs
  profit: number;                    // revenue - operatingCost
  efficiency: number;                // 0-1 (government inefficiency factor)

  // Employment
  employees: number;
  wagesBudget: number;

  // Assets
  provinceId: string;                // Where located
  capitalValue: number;              // Book value of assets
}

// Add to NationComponent.economy
stateEnterprises: StateEnterprise[];
stateSectorRevenue: number;          // Already exists - sum of enterprise profits
```

#### 1.4 Implementation in updateEconomy()

```typescript
private updateEconomy(world: World, entity: EntityImpl, nation: NationComponent): void {
  // 1. Calculate provincial tax revenue (existing)
  const provincialTaxRevenue = this.calculateProvincialTaxes(world, entity, nation);

  // 2. Calculate trade revenue (NEW)
  const tradeRevenue = this.calculateTradeRevenue(world, entity, nation);

  // 3. Calculate state enterprise revenue (NEW)
  const stateEnterpriseRevenue = this.calculateStateEnterpriseRevenue(nation);

  // 4. Calculate customs duties from tariffs (ENHANCED)
  const customsDuties = this.calculateCustomsDuties(world, entity, nation);

  // 5. Apply policy effects to economy (NEW)
  const policyModifiers = this.calculateEconomicPolicyEffects(nation);

  // Update treasury
  const totalRevenue = (provincialTaxRevenue + tradeRevenue +
                       stateEnterpriseRevenue + customsDuties) *
                       policyModifiers.revenueMultiplier;

  // ... rest of expenditure calculation
}
```

---

## 2. Per-Province Taxation System

### Current State
- `economy.provincialTaxes: Map<string, number>` exists but is never populated
- Provinces have `economy.taxRevenue` in ProvinceGovernanceComponent

### Design

#### 2.1 Province Tax Collection

```typescript
interface ProvinceTaxRecord {
  provinceId: string;
  provinceName: string;

  // Tax base
  provincialGDP: number;             // From province economy
  taxablePopulation: number;         // Working age adults

  // Tax rates (can vary by province)
  effectiveTaxRate: number;          // After exemptions/evasion
  nationalTaxRate: number;           // Set by nation policy
  provincialAutonomyRate: number;    // Province keeps this %

  // Revenue breakdown
  grossTaxRevenue: number;           // Before exemptions
  exemptions: number;                // Agricultural exemptions, etc.
  evasion: number;                   // Based on corruption/enforcement
  netTaxRevenue: number;             // What nation actually receives

  // Compliance
  complianceRate: number;            // 0-1, affected by stability
  lastCollectionTick: number;
}
```

#### 2.2 Tax Policy Integration

```typescript
// Add to NationComponent.economy
interface NationalTaxPolicy {
  baseTaxRate: 'low' | 'moderate' | 'high';  // Already exists

  // Detailed rates by sector
  sectorRates: {
    agriculture: number;             // Usually lower
    manufacturing: number;
    trade: number;                   // Tariffs + merchant taxes
    property: number;                // Land taxes
    income: number;                  // Personal income (if advanced)
  };

  // Exemptions
  exemptions: {
    agriculturalThreshold: number;   // Small farmers exempt
    religiousExempt: boolean;        // Temples/churches
    militaryExempt: boolean;         // Veterans/soldiers
    nobleExempt: boolean;            // Aristocracy (if monarchy)
  };

  // Collection
  taxCollectorEfficiency: number;    // 0-1, affected by bureaucracy tech
  corruptionLoss: number;            // % lost to corruption
}
```

#### 2.3 Implementation

```typescript
private calculateProvincialTaxes(
  world: World,
  entity: EntityImpl,
  nation: NationComponent
): number {
  const taxRecords = new Map<string, ProvinceTaxRecord>();
  let totalRevenue = 0;

  for (const provinceEntity of this.getProvinceEntities(world, entity.id)) {
    const province = provinceEntity.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);
    if (!province) continue;

    // Calculate tax base
    const provincialGDP = province.economy.taxRevenue * 10; // Estimate
    const taxablePopulation = province.cities.reduce((sum, c) => sum + c.population * 0.6, 0);

    // Calculate effective rate
    const baseRate = nation.economy.taxPolicy === 'low' ? 0.1 :
                     nation.economy.taxPolicy === 'moderate' ? 0.2 : 0.3;

    // Modifiers
    const stabilityModifier = province.stability; // Lower stability = more evasion
    const complianceRate = Math.min(1, 0.5 + stabilityModifier * 0.5);

    // Calculate revenue
    const grossRevenue = provincialGDP * baseRate;
    const netRevenue = grossRevenue * complianceRate * (1 - nation.corruption || 0);

    taxRecords.set(provinceEntity.id, {
      provinceId: provinceEntity.id,
      provinceName: province.provinceName,
      provincialGDP,
      taxablePopulation,
      effectiveTaxRate: baseRate * complianceRate,
      nationalTaxRate: baseRate,
      provincialAutonomyRate: 0.2, // Province keeps 20%
      grossTaxRevenue: grossRevenue,
      exemptions: 0,
      evasion: grossRevenue * (1 - complianceRate),
      netTaxRevenue: netRevenue,
      complianceRate,
      lastCollectionTick: world.tick,
    });

    totalRevenue += netRevenue;
  }

  // Update component with detailed records
  entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
    ...current,
    economy: {
      ...current.economy,
      provincialTaxes: taxRecords,
    },
  }));

  return totalRevenue;
}
```

---

## 3. Stability Factors System

### Current State
- `stability: number` and `legitimacy: number` exist (0-1)
- `unrestFactors: string[]` tracks reasons but not magnitudes
- `updateStabilityAndLegitimacy()` has basic economic/war factors

### Existing Patterns
From `governance-system/spec.md`:
- `stability: number` (0-100 in spec, 0-1 in implementation)
- `legitimacy: number` (0-100 in spec, 0-1 in implementation)
- Detailed succession, revolution, faction mechanics

### Design

#### 3.1 Detailed Unrest Factors

```typescript
interface UnrestFactor {
  id: string;
  category: 'economic' | 'political' | 'social' | 'military' | 'religious' | 'ethnic';
  name: string;
  description: string;

  // Impact
  stabilityImpact: number;           // -1 to +1
  legitimacyImpact: number;          // -1 to +1

  // Duration
  startTick: number;
  expectedDuration?: number;         // Ticks until resolved
  isPermanent: boolean;              // Some factors are structural

  // Resolution
  canBeResolved: boolean;
  resolutionCost?: number;           // Budget to address
  resolutionPolicy?: string;         // Policy that would help
}

// Replace unrestFactors: string[] with:
interface NationUnrest {
  factors: UnrestFactor[];
  totalStabilityModifier: number;    // Sum of all factor impacts
  totalLegitimacyModifier: number;

  // Risk assessment
  rebellionRisk: number;             // 0-1
  coupRisk: number;                  // 0-1 (military takeover)
  secessionRisk: number;             // 0-1 (province leaving)

  // Hot spots
  troubledProvinces: string[];       // Province IDs with high unrest
}
```

#### 3.2 Stability Factor Categories

```typescript
const STABILITY_FACTORS = {
  economic: [
    { id: 'treasury_negative', name: 'Budget Deficit', baseImpact: -0.1 },
    { id: 'high_taxes', name: 'Excessive Taxation', baseImpact: -0.15 },
    { id: 'unemployment', name: 'High Unemployment', baseImpact: -0.1 },
    { id: 'inflation', name: 'Currency Inflation', baseImpact: -0.05 },
    { id: 'trade_blockade', name: 'Trade Blockade', baseImpact: -0.2 },
    { id: 'economic_boom', name: 'Economic Prosperity', baseImpact: +0.1 },
  ],
  political: [
    { id: 'succession_crisis', name: 'Succession Crisis', baseImpact: -0.3 },
    { id: 'no_heir', name: 'No Clear Heir', baseImpact: -0.1 },
    { id: 'corrupt_officials', name: 'Government Corruption', baseImpact: -0.1 },
    { id: 'unpopular_law', name: 'Unpopular Laws', baseImpact: -0.05 },
    { id: 'strong_leader', name: 'Popular Leader', baseImpact: +0.15 },
  ],
  social: [
    { id: 'ethnic_tension', name: 'Ethnic Tensions', baseImpact: -0.15 },
    { id: 'religious_conflict', name: 'Religious Conflict', baseImpact: -0.15 },
    { id: 'class_divide', name: 'Class Inequality', baseImpact: -0.1 },
    { id: 'cultural_unity', name: 'Cultural Unity', baseImpact: +0.1 },
  ],
  military: [
    { id: 'war_weariness', name: 'War Weariness', baseImpact: -0.2 },
    { id: 'recent_defeat', name: 'Recent Military Defeat', baseImpact: -0.25 },
    { id: 'occupation', name: 'Foreign Occupation', baseImpact: -0.3 },
    { id: 'victory', name: 'Recent Victory', baseImpact: +0.15 },
    { id: 'military_parade', name: 'Military Display', baseImpact: +0.05 },
  ],
  religious: [
    { id: 'deity_disfavor', name: 'Divine Disfavor', baseImpact: -0.2 },
    { id: 'heresy_spread', name: 'Heretical Movement', baseImpact: -0.1 },
    { id: 'divine_blessing', name: 'Divine Blessing', baseImpact: +0.15 },
  ],
};
```

#### 3.3 Enhanced updateStabilityAndLegitimacy()

```typescript
private updateStabilityAndLegitimacy(
  world: World,
  entity: EntityImpl,
  nation: NationComponent
): void {
  const factors: UnrestFactor[] = [];

  // === Economic Factors ===
  if (nation.economy.treasury < 0) {
    factors.push({
      id: 'treasury_negative',
      category: 'economic',
      name: 'Budget Deficit',
      description: `National treasury is ${nation.economy.treasury.toLocaleString()} in debt`,
      stabilityImpact: -0.1 * Math.min(3, Math.abs(nation.economy.treasury) / 100000),
      legitimacyImpact: -0.05,
      startTick: world.tick,
      isPermanent: false,
      canBeResolved: true,
      resolutionCost: Math.abs(nation.economy.treasury),
    });
  }

  if (nation.economy.taxPolicy === 'high') {
    factors.push({
      id: 'high_taxes',
      category: 'economic',
      name: 'Excessive Taxation',
      description: 'High tax rates causing popular discontent',
      stabilityImpact: -0.1,
      legitimacyImpact: -0.05,
      startTick: world.tick,
      isPermanent: false,
      canBeResolved: true,
      resolutionPolicy: 'lower_taxes',
    });
  }

  // === Military Factors ===
  if (isAtWar(nation)) {
    const warDuration = nation.military.activeWars.reduce(
      (max, w) => Math.max(max, w.duration), 0
    );
    const weariness = Math.min(0.3, warDuration / 50000 * 0.3); // Max -0.3 after long war

    factors.push({
      id: 'war_weariness',
      category: 'military',
      name: 'War Weariness',
      description: `Nation has been at war for ${Math.floor(warDuration / 1200)} months`,
      stabilityImpact: -weariness,
      legitimacyImpact: -weariness * 0.5,
      startTick: nation.military.activeWars[0]?.startedTick || world.tick,
      isPermanent: false,
      canBeResolved: true,
    });

    if (nation.military.mobilization === 'full') {
      factors.push({
        id: 'full_mobilization',
        category: 'military',
        name: 'Total War Mobilization',
        description: 'Economy and society strained by full mobilization',
        stabilityImpact: -0.1,
        legitimacyImpact: 0,
        startTick: world.tick,
        isPermanent: false,
        canBeResolved: true,
      });
    }
  }

  // === Political Factors ===
  if (!nation.leadership.leaderId) {
    factors.push({
      id: 'no_leader',
      category: 'political',
      name: 'No National Leader',
      description: 'Nation lacks recognized head of state',
      stabilityImpact: -0.2,
      legitimacyImpact: -0.3,
      startTick: world.tick,
      isPermanent: false,
      canBeResolved: true,
    });
  }

  // Check for succession issues
  if (nation.leadership.successionType === 'hereditary' && !nation.leadership.heirApparentId) {
    factors.push({
      id: 'no_heir',
      category: 'political',
      name: 'No Designated Heir',
      description: 'Hereditary succession at risk without clear heir',
      stabilityImpact: -0.05,
      legitimacyImpact: -0.1,
      startTick: world.tick,
      isPermanent: false,
      canBeResolved: true,
    });
  }

  // === Province Loyalty ===
  const disloyalProvinces = nation.provinceRecords.filter(p => p.loyaltyToNation < 0.5);
  if (disloyalProvinces.length > 0) {
    const avgDisloyalty = 1 - (disloyalProvinces.reduce(
      (sum, p) => sum + p.loyaltyToNation, 0
    ) / disloyalProvinces.length);

    factors.push({
      id: 'provincial_disloyalty',
      category: 'political',
      name: 'Provincial Unrest',
      description: `${disloyalProvinces.length} province(s) showing disloyalty`,
      stabilityImpact: -0.05 * disloyalProvinces.length,
      legitimacyImpact: -0.03 * disloyalProvinces.length,
      startTick: world.tick,
      isPermanent: false,
      canBeResolved: true,
    });
  }

  // === Calculate totals ===
  const totalStability = factors.reduce((sum, f) => sum + f.stabilityImpact, 0);
  const totalLegitimacy = factors.reduce((sum, f) => sum + f.legitimacyImpact, 0);

  // Calculate rebellion risk
  const rebellionRisk = Math.max(0, Math.min(1,
    (1 - nation.stability) * 0.3 +
    (1 - nation.legitimacy) * 0.3 +
    (disloyalProvinces.length / Math.max(1, nation.provinceRecords.length)) * 0.4
  ));

  // Update component
  entity.updateComponent<NationComponent>(CT.Nation, (current) => {
    const updated = { ...current };
    updateStability(updated, totalStability);
    updateLegitimacy(updated, totalLegitimacy);
    return {
      ...updated,
      unrest: {
        factors,
        totalStabilityModifier: totalStability,
        totalLegitimacyModifier: totalLegitimacy,
        rebellionRisk,
        coupRisk: nation.military.mobilization === 'full' ? 0.1 : 0,
        secessionRisk: disloyalProvinces.length > 0 ? 0.05 * disloyalProvinces.length : 0,
        troubledProvinces: disloyalProvinces.map(p => p.provinceId),
      },
    };
  });

  // Emit warnings
  if (rebellionRisk > 0.5) {
    world.eventBus.emit({
      type: 'nation:rebellion_imminent',
      source: entity.id,
      data: {
        nationId: entity.id,
        nationName: nation.nationName,
        rebellionRisk,
        factors: factors.filter(f => f.stabilityImpact < -0.1),
        tick: world.tick,
      },
    });
  }
}
```

---

## 4. Research Mechanics with Tech Tree

### Current State
- `researchProjects: ResearchProject[]` with progress tracking
- `processResearch()` advances progress based on budget
- No tech tree, no prerequisites, no completion effects

### Existing Patterns
From `research-system/knowledge-tree.md`:
- Papers with prerequisites (agent-level)
- Technology unlocks when all papers complete
- Skill grants and reading requirements

### Design for Nation-Level

#### 4.1 National Research Model

Nations don't read papers - they fund research institutions. The model should be:
- **Research Capacity** from universities, academies, labs
- **Research Projects** with tech tree dependencies
- **Breakthroughs** that unlock nation-wide benefits

```typescript
interface NationalResearchState {
  // Capacity
  researchCapacity: number;          // Total researcher-months available
  universitiesCount: number;         // Number of research institutions
  researcherPopulation: number;      // Educated population doing research

  // Active projects
  activeProjects: ResearchProject[]; // Already exists
  completedTechnologies: string[];   // Tech IDs unlocked

  // Tech tree position
  currentEra: 'ancient' | 'classical' | 'medieval' | 'renaissance' | 'industrial' | 'modern' | 'space';
  techLevel: number;                 // Already exists (1-10)
}

// Enhanced ResearchProject
interface ResearchProject {
  id: string;
  name: string;
  field: 'military' | 'economic' | 'cultural' | 'scientific';

  // Tech tree
  prerequisites: string[];           // Tech IDs required first
  eraRequirement: string;            // Minimum era

  // Progress
  totalCost: number;                 // Research points needed
  progress: number;                  // 0-1
  monthsInvested: number;            // Tracking

  // Effects on completion
  unlocks: TechUnlock[];

  startedTick: number;
  estimatedCompletionTick?: number;
}

interface TechUnlock {
  type: 'building' | 'unit' | 'policy' | 'resource' | 'ability';
  id: string;
  name: string;
  description: string;
}
```

#### 4.2 National Tech Tree (Simplified)

```typescript
const NATIONAL_TECH_TREE = {
  // Era 1: Ancient
  writing: {
    name: 'Writing',
    era: 'ancient',
    prerequisites: [],
    field: 'cultural',
    cost: 100,
    unlocks: [{ type: 'building', id: 'library', name: 'Library' }],
  },
  bronze_working: {
    name: 'Bronze Working',
    era: 'ancient',
    prerequisites: [],
    field: 'military',
    cost: 100,
    unlocks: [{ type: 'unit', id: 'bronze_soldiers', name: 'Bronze Infantry' }],
  },

  // Era 2: Classical
  currency: {
    name: 'Currency',
    era: 'classical',
    prerequisites: ['writing'],
    field: 'economic',
    cost: 200,
    unlocks: [{ type: 'policy', id: 'monetary_policy', name: 'Monetary Policy' }],
  },
  iron_working: {
    name: 'Iron Working',
    era: 'classical',
    prerequisites: ['bronze_working'],
    field: 'military',
    cost: 200,
    unlocks: [{ type: 'unit', id: 'iron_soldiers', name: 'Iron Infantry' }],
  },

  // Era 3: Medieval
  feudalism: {
    name: 'Feudalism',
    era: 'medieval',
    prerequisites: ['currency'],
    field: 'economic',
    cost: 400,
    unlocks: [{ type: 'policy', id: 'vassalage', name: 'Vassalage System' }],
  },

  // ... continue for all eras
};
```

#### 4.3 Enhanced processResearch()

```typescript
private processResearch(
  world: World,
  entity: EntityImpl,
  nation: NationComponent
): void {
  if (nation.researchProjects.length === 0) return;

  const updatedProjects: ResearchProject[] = [];
  const completedTechs: string[] = [];

  for (const project of nation.researchProjects) {
    if (project.progress >= 1) {
      updatedProjects.push(project);
      continue;
    }

    // Check prerequisites are met
    const prereqsMet = project.prerequisites.every(
      prereq => nation.completedTechnologies?.includes(prereq)
    );
    if (!prereqsMet) {
      // Project blocked - can't progress
      updatedProjects.push(project);
      continue;
    }

    // Calculate progress rate
    // Base: research budget / total cost, modified by capacity
    const capacityMultiplier = Math.min(2,
      (nation.research?.researchCapacity || 1) / (project.totalCost / 10)
    );
    const progressRate = (nation.economy.researchBudget / project.totalCost) *
                         capacityMultiplier * 0.001;

    project.progress = Math.min(1, project.progress + progressRate);
    project.monthsInvested = (project.monthsInvested || 0) + 1;

    if (project.progress >= 1) {
      completedTechs.push(project.id);

      // Apply unlocks
      this.applyTechUnlocks(world, entity, nation, project);

      world.eventBus.emit({
        type: 'nation:research_completed',
        source: entity.id,
        data: {
          nationId: entity.id,
          nationName: nation.nationName,
          projectId: project.id,
          projectName: project.name,
          field: project.field,
          unlocks: project.unlocks,
          tick: world.tick,
        },
      });
    }

    updatedProjects.push(project);
  }

  // Update nation with completed technologies
  if (completedTechs.length > 0) {
    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      researchProjects: updatedProjects,
      completedTechnologies: [
        ...(current.completedTechnologies || []),
        ...completedTechs,
      ],
      techLevel: this.calculateTechLevel(current.completedTechnologies || []),
    }));
  }
}

private applyTechUnlocks(
  world: World,
  entity: EntityImpl,
  nation: NationComponent,
  project: ResearchProject
): void {
  for (const unlock of project.unlocks || []) {
    switch (unlock.type) {
      case 'policy':
        // Enable policy in available policies
        world.eventBus.emit({
          type: 'nation:policy_unlocked',
          source: entity.id,
          data: { nationId: entity.id, policyId: unlock.id },
        });
        break;
      case 'building':
        // Enable building type
        world.eventBus.emit({
          type: 'nation:building_unlocked',
          source: entity.id,
          data: { nationId: entity.id, buildingId: unlock.id },
        });
        break;
      case 'unit':
        // Enable military unit type
        world.eventBus.emit({
          type: 'nation:unit_unlocked',
          source: entity.id,
          data: { nationId: entity.id, unitId: unlock.id },
        });
        break;
    }
  }
}
```

---

## 5. Policy Effects System

### Current State
- `policies: NationalPolicy[]` exists with progress tracking
- `processPolicies()` advances progress but doesn't apply effects
- No effect application to economy, military, or culture

### Existing Patterns
From `governance-system/spec.md`:
- `PolicyEffect` with target, modifier, description
- Example policies: Import Tariff, Housing Priority

### Design

#### 5.1 Policy Effect Categories

```typescript
interface PolicyEffect {
  // What it affects
  target: PolicyTarget;

  // How it affects it
  modifierType: 'additive' | 'multiplicative' | 'replacement';
  value: number;

  // Duration
  isPermanent: boolean;
  durationTicks?: number;
}

type PolicyTarget =
  // Economy
  | 'tax_revenue'
  | 'trade_income'
  | 'tariff_rate'
  | 'treasury_growth'
  | 'gdp_growth'
  | 'corruption'

  // Military
  | 'army_strength'
  | 'army_maintenance'
  | 'military_readiness'
  | 'recruitment_rate'
  | 'war_exhaustion'

  // Stability
  | 'stability'
  | 'legitimacy'
  | 'rebellion_risk'
  | 'provincial_loyalty'

  // Research
  | 'research_speed'
  | 'research_cost'

  // Diplomacy
  | 'opinion_gain'
  | 'treaty_acceptance'
  | 'alliance_strength';
```

#### 5.2 Policy Definitions

```typescript
const NATIONAL_POLICIES = {
  // Economic Policies
  free_trade: {
    name: 'Free Trade',
    category: 'economic',
    description: 'Remove tariffs and encourage international trade',
    effects: [
      { target: 'tariff_rate', modifierType: 'replacement', value: 0, isPermanent: true },
      { target: 'trade_income', modifierType: 'multiplicative', value: 1.3, isPermanent: true },
      { target: 'gdp_growth', modifierType: 'additive', value: 0.02, isPermanent: true },
    ],
  },
  protectionism: {
    name: 'Protectionism',
    category: 'economic',
    description: 'High tariffs to protect domestic industry',
    effects: [
      { target: 'tariff_rate', modifierType: 'replacement', value: 0.3, isPermanent: true },
      { target: 'trade_income', modifierType: 'multiplicative', value: 0.7, isPermanent: true },
      { target: 'tax_revenue', modifierType: 'multiplicative', value: 1.1, isPermanent: true },
    ],
  },
  austerity: {
    name: 'Austerity Measures',
    category: 'economic',
    description: 'Reduce spending to balance budget',
    effects: [
      { target: 'treasury_growth', modifierType: 'multiplicative', value: 1.2, isPermanent: true },
      { target: 'stability', modifierType: 'additive', value: -0.1, isPermanent: true },
    ],
  },

  // Military Policies
  militarism: {
    name: 'Militarism',
    category: 'military',
    description: 'Prioritize military strength',
    effects: [
      { target: 'army_strength', modifierType: 'multiplicative', value: 1.2, isPermanent: true },
      { target: 'military_readiness', modifierType: 'additive', value: 0.1, isPermanent: true },
      { target: 'army_maintenance', modifierType: 'multiplicative', value: 1.3, isPermanent: true },
    ],
  },
  conscription: {
    name: 'Conscription',
    category: 'military',
    description: 'Mandatory military service',
    effects: [
      { target: 'recruitment_rate', modifierType: 'multiplicative', value: 2.0, isPermanent: true },
      { target: 'stability', modifierType: 'additive', value: -0.05, isPermanent: true },
    ],
  },

  // Cultural Policies
  state_religion: {
    name: 'State Religion',
    category: 'cultural',
    description: 'Official religion with state support',
    effects: [
      { target: 'legitimacy', modifierType: 'additive', value: 0.1, isPermanent: true },
      { target: 'stability', modifierType: 'additive', value: 0.05, isPermanent: true },
      { target: 'provincial_loyalty', modifierType: 'additive', value: 0.05, isPermanent: true },
    ],
  },
  religious_tolerance: {
    name: 'Religious Tolerance',
    category: 'cultural',
    description: 'Allow all religions equal standing',
    effects: [
      { target: 'provincial_loyalty', modifierType: 'additive', value: 0.1, isPermanent: true },
      { target: 'trade_income', modifierType: 'multiplicative', value: 1.1, isPermanent: true },
    ],
  },

  // Research Policies
  patronage: {
    name: 'Patronage of Learning',
    category: 'research',
    description: 'State funding for scholars and researchers',
    effects: [
      { target: 'research_speed', modifierType: 'multiplicative', value: 1.25, isPermanent: true },
      { target: 'treasury_growth', modifierType: 'multiplicative', value: 0.95, isPermanent: true },
    ],
  },
};
```

#### 5.3 Enhanced processPolicies()

```typescript
private processPolicies(
  world: World,
  entity: EntityImpl,
  nation: NationComponent
): void {
  if (nation.policies.length === 0) return;

  // Collect all active policy effects
  const activeEffects: Map<PolicyTarget, number[]> = new Map();

  for (const policy of nation.policies) {
    if (policy.progress < 1) continue; // Only apply completed policies

    const policyDef = NATIONAL_POLICIES[policy.id as keyof typeof NATIONAL_POLICIES];
    if (!policyDef) continue;

    for (const effect of policyDef.effects) {
      if (!activeEffects.has(effect.target)) {
        activeEffects.set(effect.target, []);
      }
      activeEffects.get(effect.target)!.push(effect.value);
    }
  }

  // Store calculated modifiers for use by other methods
  entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
    ...current,
    policyModifiers: Object.fromEntries(activeEffects),
  }));
}

// Helper to get policy modifier for a target
private getPolicyModifier(nation: NationComponent, target: PolicyTarget): number {
  const modifiers = nation.policyModifiers?.[target] || [];
  if (modifiers.length === 0) return 1;

  // Multiplicative stacking
  return modifiers.reduce((acc, mod) => acc * mod, 1);
}
```

---

## 6. Diplomacy System (Opinion, Treaties, Alliances)

### Current State
- `foreignPolicy.diplomaticRelations: Map<string, NationRelation>` exists
- `updateDiplomacy()` only handles alliance obligations and treaty expiration
- No opinion calculation, no treaty negotiation, no alliance formation logic

### Existing Patterns
From `EmpireDiplomacySystem.ts`:
- `OpinionModifiers` with multiple factors
- `calculateOpinion()` summing modifiers
- Alliance formation based on opinion + shared threats
- Treaty execution (defense pacts, trade agreements)

### Design

Adapt EmpireDiplomacySystem patterns for nation level.

#### 6.1 Nation Opinion System

```typescript
interface NationOpinionModifiers {
  // Geographic
  sharedBorder: number;              // -10 (friction) or +5 (trade access)
  distance: number;                  // Far = harder to maintain relations

  // Economic
  tradeVolume: number;               // 0-30 based on trade
  tradeBalance: number;              // -10 to +10 (balanced = +, deficit = -)
  tariffDisputes: number;            // -20 if in tariff war

  // Military
  recentWars: number;                // -50 per war in last 10 years
  warThreat: number;                 // -30 if they're mobilizing near us
  militarySupport: number;           // +20 if they helped in war

  // Political
  governmentSimilarity: number;      // +10 same type, -10 opposite
  ideologicalAlignment: number;      // -20 to +20

  // Historical
  pastTreaties: number;              // +5 per successful treaty
  treatyViolations: number;          // -30 per violation

  // Personal
  leaderRelations: number;           // -20 to +20 (leader-to-leader)
}
```

#### 6.2 Treaty Negotiation

```typescript
interface TreatyNegotiation {
  id: string;
  proposingNationId: string;
  targetNationId: string;

  // Proposal
  proposedTreaty: Treaty;
  proposedTerms: string[];

  // Negotiation state
  status: 'proposed' | 'counter_offered' | 'accepted' | 'rejected' | 'expired';
  roundsOfNegotiation: number;

  // Acceptance calculation
  baseAcceptanceChance: number;      // Based on opinion
  termModifiers: number;             // How favorable terms are
  urgencyModifier: number;           // External pressure (war, etc.)
  finalAcceptanceChance: number;

  // Timing
  proposedTick: number;
  expirationTick: number;            // Auto-reject if not responded
}

// Treaty types with acceptance formulas
const TREATY_ACCEPTANCE = {
  trade: {
    baseRequirement: -20,            // Will accept trade even at -20 opinion
    perPointAbove: 0.02,             // +2% per opinion point above
    balanceFactor: 0.3,              // Trade balance importance
  },
  non_aggression: {
    baseRequirement: 0,              // Need neutral or better
    perPointAbove: 0.015,
    threatFactor: 0.5,               // More likely if they feel threatened
  },
  military_alliance: {
    baseRequirement: 40,             // Need good relations
    perPointAbove: 0.01,
    sharedThreatBonus: 0.2,          // +20% if common enemy
  },
  customs_union: {
    baseRequirement: 30,             // Need decent relations
    perPointAbove: 0.015,
    economicSimilarityFactor: 0.3,
  },
};
```

#### 6.3 Enhanced updateDiplomacy()

```typescript
private updateDiplomacy(
  world: World,
  entity: EntityImpl,
  nation: NationComponent
): void {
  // 1. Update opinions with all known nations
  this.updateNationOpinions(world, entity, nation);

  // 2. Process pending treaty negotiations
  this.processNegotiations(world, entity, nation);

  // 3. Evaluate alliance opportunities
  this.evaluateAllianceOpportunities(world, entity, nation);

  // 4. Handle alliance obligations during wars (existing)
  if (nation.military.activeWars.length > 0) {
    this.processAllianceObligations(world, entity, nation);
  }

  // 5. Check for treaty expirations (existing)
  this.checkTreatyExpirations(world, entity, nation);

  // 6. Evaluate diplomatic posture
  this.updateDiplomaticPosture(world, entity, nation);
}

private updateNationOpinions(
  world: World,
  entity: EntityImpl,
  nation: NationComponent
): void {
  const updatedRelations = new Map(nation.foreignPolicy.diplomaticRelations);

  for (const [nationId, relation] of updatedRelations) {
    const modifiers = this.calculateNationOpinionModifiers(
      world, entity, nation, nationId, relation
    );

    const newOpinion = this.sumOpinionModifiers(modifiers);
    const previousOpinion = relation.opinion;

    // Update relation
    relation.opinion = newOpinion;

    // Update relationship tier
    relation.relationship = this.opinionToRelationship(newOpinion);

    // Track opinion change as diplomatic event
    if (Math.abs(newOpinion - previousOpinion) > 10) {
      relation.diplomaticEvents.push({
        type: newOpinion > previousOpinion ? 'opinion_improved' : 'opinion_declined',
        description: `Opinion changed from ${previousOpinion} to ${newOpinion}`,
        tick: world.tick,
        opinionImpact: newOpinion - previousOpinion,
      });
    }
  }

  entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
    ...current,
    foreignPolicy: {
      ...current.foreignPolicy,
      diplomaticRelations: updatedRelations,
    },
  }));
}

private calculateNationOpinionModifiers(
  world: World,
  entity: EntityImpl,
  nation: NationComponent,
  otherNationId: string,
  relation: NationRelation
): NationOpinionModifiers {
  const otherEntity = world.getEntity(otherNationId);
  const otherNation = otherEntity?.getComponent<NationComponent>(CT.Nation);

  return {
    sharedBorder: this.hasSharedBorder(world, nation, otherNationId) ? -10 : 0,
    distance: 0, // Would need geographic calculation

    tradeVolume: Math.min(30, (relation.tradeVolume || 0) / 10000),
    tradeBalance: 0, // Would need trade tracking
    tariffDisputes: 0,

    recentWars: this.countRecentWars(nation, otherNationId) * -50,
    warThreat: this.calculateWarThreat(otherNation, entity.id) * -30,
    militarySupport: this.calculateMilitarySupport(nation, otherNationId) * 20,

    governmentSimilarity: this.calculateGovernmentSimilarity(nation, otherNation),
    ideologicalAlignment: 0, // Would need ideology tracking

    pastTreaties: relation.treaties.length * 5,
    treatyViolations: 0, // Would need violation tracking

    leaderRelations: 0, // Would need leader relationship tracking
  };
}

private sumOpinionModifiers(modifiers: NationOpinionModifiers): number {
  return Math.max(-100, Math.min(100,
    modifiers.sharedBorder +
    modifiers.distance +
    modifiers.tradeVolume +
    modifiers.tradeBalance +
    modifiers.tariffDisputes +
    modifiers.recentWars +
    modifiers.warThreat +
    modifiers.militarySupport +
    modifiers.governmentSimilarity +
    modifiers.ideologicalAlignment +
    modifiers.pastTreaties +
    modifiers.treatyViolations +
    modifiers.leaderRelations
  ));
}

private opinionToRelationship(opinion: number): NationRelation['relationship'] {
  if (opinion >= 60) return 'allied';
  if (opinion >= 20) return 'friendly';
  if (opinion >= -20) return 'neutral';
  if (opinion >= -60) return 'rival';
  return 'hostile';
}

private evaluateAllianceOpportunities(
  world: World,
  entity: EntityImpl,
  nation: NationComponent
): void {
  for (const [nationId, relation] of nation.foreignPolicy.diplomaticRelations) {
    // Skip if already allied or at war
    if (relation.relationship === 'allied' || relation.relationship === 'at_war') {
      continue;
    }

    // Check conditions for proposing alliance
    const shouldProposeAlliance =
      relation.opinion >= 40 && // Need decent opinion
      (
        this.hasSharedThreat(world, nation, nationId) || // Common enemy
        relation.treaties.length >= 2 // Already have good treaty history
      ) &&
      !nation.foreignPolicy.allies.includes(nationId); // Not already allies

    if (shouldProposeAlliance) {
      this.proposeAlliance(world, entity, nation, nationId, relation);
    }
  }
}

private proposeAlliance(
  world: World,
  entity: EntityImpl,
  nation: NationComponent,
  targetNationId: string,
  relation: NationRelation
): void {
  // Calculate acceptance chance
  const baseChance = (relation.opinion - 40) * 0.01; // +1% per opinion above 40
  const sharedThreatBonus = this.hasSharedThreat(world, nation, targetNationId) ? 0.2 : 0;
  const acceptanceChance = Math.min(0.9, baseChance + sharedThreatBonus);

  // Roll for acceptance
  if (Math.random() < acceptanceChance) {
    // Create alliance treaty
    const treaty: Treaty = {
      id: `treaty_${world.tick}_alliance_${nation.nationName}_${targetNationId}`,
      name: `${nation.nationName}-${relation.nationName} Alliance`,
      type: 'military_alliance',
      signatoryNationIds: [entity.id, targetNationId],
      terms: ['Mutual defense', 'Military cooperation'],
      signedTick: world.tick,
      status: 'active',
    };

    // Update our nation
    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      foreignPolicy: {
        ...current.foreignPolicy,
        treaties: [...current.foreignPolicy.treaties, treaty],
        allies: [...current.foreignPolicy.allies, targetNationId],
      },
    }));

    // Emit event
    world.eventBus.emit({
      type: 'nation:alliance_formed',
      source: entity.id,
      data: {
        nationId: entity.id,
        nationName: nation.nationName,
        allyNationId: targetNationId,
        allyNationName: relation.nationName,
        treatyId: treaty.id,
        tick: world.tick,
      },
    });
  }
}
```

---

## Implementation Plan

### Phase 1: Foundation (4-6 hours)
1. Add new interfaces to NationComponent
2. Implement per-province taxation
3. Enhance stability factors

### Phase 2: Economy (4-6 hours)
4. Implement trade revenue calculation
5. Implement tariff system
6. Implement state enterprises

### Phase 3: Research (3-4 hours)
7. Define tech tree data
8. Implement prerequisite checking
9. Implement tech unlocks

### Phase 4: Policies (3-4 hours)
10. Define policy catalog
11. Implement policy effects
12. Wire effects into updateEconomy, updateMilitary, etc.

### Phase 5: Diplomacy (4-6 hours)
13. Implement opinion modifiers
14. Implement treaty negotiation
15. Implement alliance formation

### Phase 6: Integration (2-3 hours)
16. Wire all systems together
17. Add events for cross-system communication
18. Testing and balancing

**Total Estimated Time: 20-30 hours**

---

## Component Changes Required

### NationComponent Additions

```typescript
// Add to NationComponent
interface NationComponent extends Component {
  // ... existing fields ...

  // NEW: Enhanced economy
  trade?: NationalTradeState;
  tariffPolicy?: TariffPolicy;
  stateEnterprises?: StateEnterprise[];

  // NEW: Enhanced stability
  unrest?: NationUnrest;

  // NEW: Enhanced research
  research?: NationalResearchState;
  completedTechnologies?: string[];

  // NEW: Policy effects cache
  policyModifiers?: Record<string, number[]>;

  // NEW: Pending negotiations
  pendingNegotiations?: TreatyNegotiation[];
}
```

---

## Events Added

```typescript
// Economy events
'nation:trade_route_established'
'nation:tariff_changed'
'nation:state_enterprise_created'

// Stability events
'nation:rebellion_imminent'
'nation:unrest_factor_added'
'nation:unrest_factor_resolved'

// Research events
'nation:research_completed'     // Already exists
'nation:policy_unlocked'
'nation:building_unlocked'
'nation:unit_unlocked'

// Diplomacy events
'nation:alliance_formed'
'nation:treaty_proposed'
'nation:treaty_accepted'
'nation:treaty_rejected'
'nation:opinion_changed'
```

---

## Testing Strategy

1. **Unit Tests**
   - Tax calculation correctness
   - Opinion modifier summing
   - Tech prerequisite validation

2. **Integration Tests**
   - Province → Nation tax flow
   - Policy effects on economy
   - Alliance obligations in war

3. **Balance Testing**
   - Treasury should stabilize with moderate policies
   - Research should progress at reasonable rate
   - Alliances should form organically

---

## Related Documents

- `METASYSTEMS_GUIDE.md` - Overall architecture
- `SYSTEMS_CATALOG.md` - System priorities
- `EmpireDiplomacySystem.ts` - Reference implementation
- `openspec/specs/governance-system/spec.md` - Governance patterns
- `openspec/specs/economy-system/spec.md` - Economy patterns
