# Proposal: Work Order: Building System Enhancements

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/building-enhancements

---

## Original Work Order

# Work Order: Building System Enhancements

## Overview
Enhance the building system to 100% spec coverage by adding procedural building generation, building upgrades, and maintenance & decay mechanics. Current coverage is approximately 40%.

## Spec Reference
- **Primary Spec:** `openspec/specs/building-system/` (multiple files)
  - `voxel-building.md` - 3D building structure
  - `autonomous-building.md` - AI-driven construction
  - `power-grid.md` - Energy systems
  - `nightlife-buildings.md` - Taverns, entertainment
  - `generative-cities.md` - Procedural city generation
- **Phase:** Enhancement (not core roadmap phase)
- **Priority:** MEDIUM
- **Status:** READY_FOR_IMPLEMENTATION

## Dependencies
- **Building System Foundation** ✅ (basic buildings, construction, placement already implemented)
- **Related Systems:**
  - Construction System (for building process)
  - Material System (for durability and quality)
  - Agent System (for building usage)

## Requirements Summary

### Current Implementation (~40% coverage)
**Already Implemented:**
- ✅ Building definitions (templates with types, sizes, costs)
- ✅ Building placement (location validation, footprint)
- ✅ Construction system (progress tracking, material requirements)
- ✅ Basic building types (house, farm, storage, workshop)
- ✅ Building ownership and usage tracking

### Missing Features (~60% to implement)

#### 1. Procedural Building Generation
Generate unique building variations using templates and rules:

```typescript
interface BuildingGenerator {
  // Template-based generation
  baseTemplate: BuildingTemplate;
  variationRules: VariationRule[];

  // Procedural parameters
  style: ArchitecturalStyle;
  culturalInfluence: string;
  wealthLevel: number;        // 0-100, affects quality and decoration
  purposeSpecific: boolean;   // Generate for specific function

  // Output
  generate(): GeneratedBuilding;
}

interface VariationRule {
  aspect: BuildingAspect;
  options: VariationOption[];
  weights: number[];          // Probability distribution
}

type BuildingAspect =
  | 'roof_style'       // Flat, peaked, domed, thatched
  | 'wall_material'    // Wood, stone, brick, mud
  | 'window_count'     // 0-20 windows
  | 'door_position'    // Front, side, multiple
  | 'decoration_level' // Plain, modest, ornate
  | 'room_layout'      // Interior configuration
  | 'height'           // 1-3 stories
  | 'foundation'       // Raised, ground-level, basement
  | 'chimney'          // None, small, large
  | 'porch';           // None, small, wraparound

interface GeneratedBuilding {
  id: string;
  basedOn: string;            // Template ID
  uniqueFeatures: Feature[];
  dimensions: Dimensions;
  rooms: Room[];
  materials: MaterialRequirement[];
  aestheticScore: number;     // 0-100, how pretty it is
  functionalScore: number;    // 0-100, how well it serves purpose
}

// Example: Generate a house
const houseGenerator = {
  baseTemplate: 'small_house',
  variationRules: [
    {
      aspect: 'roof_style',
      options: ['peaked', 'flat', 'thatched'],
      weights: [0.5, 0.3, 0.2]
    },
    {
      aspect: 'wall_material',
      options: ['wood', 'stone', 'brick'],
      weights: [0.4, 0.4, 0.2]
    },
    {
      aspect: 'window_count',
      options: [2, 4, 6, 8],
      weights: [0.3, 0.4, 0.2, 0.1]
    }
  ],
  style: 'medieval_european',
  wealthLevel: 50,  // Middle class
  purposeSpecific: true
};

const generatedHouse = houseGenerator.generate();
// Result: Unique house with peaked roof, stone walls, 4 windows,
// front door, modest decoration
```

#### 2. Building Upgrades
Buildings can be improved over time:

```typescript
interface BuildingUpgrade {
  id: string;
  name: string;
  description: string;

  // Requirements
  targetBuilding: string;      // Building type ID
  prerequisites: Prerequisite[];
  materialCost: MaterialRequirement[];
  laborCost: number;           // Agent-hours
  timeCost: number;            // Ticks

  // Effects
  effects: UpgradeEffect[];

  // Visual changes
  visualChanges?: VisualChange[];
}

interface Prerequisite {
  type: PrerequisiteType;
  value: string | number;
}

type PrerequisiteType = 'tech_level' | 'building_age' | 'owner_skill' | 'previous_upgrade';

interface UpgradeEffect {
  type: UpgradeEffectType;
  magnitude: number;
}

type UpgradeEffectType =
  | 'capacity_increase'     // +20% storage, +2 beds, etc.
  | 'efficiency_increase'   // +15% production speed
  | 'durability_increase'   // +30% max durability
  | 'comfort_increase'      // +10 happiness for occupants
  | 'defense_increase'      // +25 defense rating
  | 'unlock_feature'        // Enables new functionality
  | 'reduce_maintenance'    // -20% upkeep cost
  | 'aesthetic_improvement'; // +15 beauty rating

// Example: Upgrade progression for a house
const houseUpgrades = [
  {
    id: 'insulation',
    name: 'Insulation',
    targetBuilding: 'house',
    materialCost: [{ material: 'wool', quantity: 20 }],
    laborCost: 40,
    timeCost: 200,
    effects: [
      { type: 'comfort_increase', magnitude: 15 },  // Better temperature control
      { type: 'reduce_maintenance', magnitude: 10 } // Less heat loss
    ]
  },
  {
    id: 'stone_foundation',
    name: 'Stone Foundation',
    targetBuilding: 'house',
    prerequisites: [{ type: 'building_age', value: 100 }],  // Must be built for a while
    materialCost: [{ material: 'stone', quantity: 50 }],
    laborCost: 80,
    timeCost: 400,
    effects: [
      { type: 'durability_increase', magnitude: 50 },
      { type: 'reduce_maintenance', magnitude: 25 }
    ]
  },
  {
    id: 'second_story',
    name: 'Second Story',
    targetBuilding: 'house',
    prerequisites: [
      { type: 'previous_upgrade', value: 'stone_foundation' },
      { type: 'owner_skill', value: 'construction:5' }
    ],
    materialCost: [
      { material: 'wood', quantity: 100 },
      { material: 'nails', quantity: 50 }
    ],
    laborCost: 200,
    timeCost: 800,
    effects: [
      { type: 'capacity_increase', magnitude: 100 },  // Double the space
      { type: 'aesthetic_improvement', magnitude: 20 }
    ],
    visualChanges: [
      { type: 'add_floor', floor: 2 }
    ]
  }
];
```

#### 3. Maintenance & Decay System
Buildings degrade over time and require upkeep:

```typescript
interface BuildingCondition {
  // Current state
  durability: number;          // 0-100, structural integrity
  cleanliness: number;         // 0-100, affects habitability
  functionality: number;       // 0-100, how well it works
  aesthetics: number;          // 0-100, visual appeal

  // Decay factors
  age: number;                 // Days since construction
  weatherExposure: number;     // 0-100, rain/snow damage
  usageWear: number;           // 0-100, from occupant activity
  neglect: number;             // 0-100, time since last maintenance

  // Critical damage
  criticalDamage: CriticalDamage[];
}

interface CriticalDamage {
  type: DamageType;
  severity: number;            // 0-100
  location: string;            // 'roof', 'walls', 'foundation'
  repairCost: MaterialRequirement[];
  repairTime: number;
}

type DamageType =
  | 'roof_leak'          // Water damage, spreads
  | 'cracked_wall'       // Structural issue
  | 'rotting_wood'       // Material decay
  | 'broken_window'      // Reduced comfort/security
  | 'foundation_shift'   // Major structural
  | 'pest_infestation'   // Termites, mice, etc.
  | 'mold_growth';       // Health hazard

interface MaintenanceTask {
  taskType: MaintenanceType;
  frequency: number;           // Ticks between required maintenance
  materialCost: MaterialRequirement[];
  laborCost: number;
  urgency: number;             // 0-100, how critical

  // If neglected
  decayRate: number;           // Durability loss per tick
  failureThreshold: number;    // Durability when critical damage occurs
}

type MaintenanceType =
  | 'cleaning'           // Sweep, dust, organize
  | 'minor_repairs'      // Fix small issues
  | 'weatherproofing'    // Seal cracks, paint
  | 'structural_inspection' // Check for damage
  | 'pest_control'       // Prevent infestations
  | 'major_overhaul';    // Complete refurbishment

// Example: House decay over time
const houseCondition = {
  durability: 85,
  cleanliness: 70,
  functionality: 90,
  aesthetics: 75,

  age: 365,  // 1 year old
  weatherExposure: 40,  // Moderate climate
  usageWear: 30,        // Family of 4 living here
  neglect: 20,          // Last cleaned 20 days ago

  criticalDamage: [
    {
      type: 'roof_leak',
      severity: 25,
      location: 'roof_northeast_corner',
      repairCost: [{ material: 'thatch', quantity: 10 }],
      repairTime: 50
    }
  ]
};

// Maintenance schedule
const houseMaintenance = [
  {
    taskType: 'cleaning',
    frequency: 7,  // Weekly
    materialCost: [],
    laborCost: 5,
    urgency: 20,
    decayRate: 0.1,  // Cleanliness drops if not done
    failureThreshold: 20  // Below 20 cleanliness = pest infestation risk
  },
  {
    taskType: 'minor_repairs',
    frequency: 30,  // Monthly
    materialCost: [{ material: 'wood', quantity: 2 }],
    laborCost: 10,
    urgency: 40,
    decayRate: 0.2,
    failureThreshold: 50  // Below 50 durability = critical damage appears
  },
  {
    taskType: 'weatherproofing',
    frequency: 365,  // Yearly
    materialCost: [{ material: 'tar', quantity: 5 }],
    laborCost: 20,
    urgency: 60,
    decayRate: 0.3,
    failureThreshold: 40  // Below 40 = water damage
  }
];
```

## Implementation Checklist

### Phase 1: Procedural Generation
- [ ] Create `BuildingGenerator` system
  - [ ] Load base templates
  - [ ] Define variation rules per template
  - [ ] Implement procedural selection logic
- [ ] Implement variation aspects
  - [ ] Roof styles (peaked, flat, domed, thatched)
  - [ ] Wall materials (wood, stone, brick, mud)
  - [ ] Window and door placement
  - [ ] Decoration levels (plain, modest, ornate)
  - [ ] Room layouts
  - [ ] Height variations (1-3 stories)
- [ ] Add architectural styles
  - [ ] Medieval European
  - [ ] Asian (Japanese, Chinese)
  - [ ] Middle Eastern
  - [ ] Fantasy (elven, dwarven)
  - [ ] Sci-fi (futuristic, alien)
- [ ] Implement cultural influences
  - [ ] Local material availability affects choices
  - [ ] Climate affects roof styles (flat in dry, peaked in wet)
  - [ ] Wealth affects decoration and size
- [ ] Create generation presets
  - [ ] Poor hut
  - [ ] Middle-class house
  - [ ] Wealthy manor
  - [ ] Specialized workshop
  - [ ] Public building (town hall)

### Phase 2: Building Upgrades
- [ ] Create `BuildingUpgrade` system
  - [ ] Upgrade definitions database
  - [ ] Prerequisite checking
  - [ ] Upgrade application logic
- [ ] Implement upgrade prerequisites
  - [ ] Tech level requirements
  - [ ] Building age requirements
  - [ ] Owner skill requirements
  - [ ] Previous upgrade chains
- [ ] Define upgrade effects
  - [ ] Capacity increases (storage, beds, workstations)
  - [ ] Efficiency boosts (production, crafting speed)
  - [ ] Durability improvements
  - [ ] Comfort enhancements
  - [ ] Defense upgrades
  - [ ] Feature unlocks (new functionality)
- [ ] Add visual upgrade changes
  - [ ] Second story addition
  - [ ] Chimney addition
  - [ ] Window expansions
  - [ ] Material replacements (wood → stone walls)
  - [ ] Decorative elements (shutters, trim, paint)
- [ ] Create upgrade paths for each building type
  - [ ] House: insulation → foundation → second story → luxury interior
  - [ ] Workshop: better tools → more workstations → quality bonus → specialization
  - [ ] Storage: shelving → climate control → security → expansion
  - [ ] Farm: irrigation → fertilizer → greenhouse → automation

### Phase 3: Maintenance & Decay
- [ ] Create `BuildingCondition` component
  - [ ] Track durability, cleanliness, functionality, aesthetics
  - [ ] Track decay factors (age, weather, usage, neglect)
  - [ ] Track critical damage instances
- [ ] Implement decay mechanics
  - [ ] Age-based decay (slow)
  - [ ] Weather-based decay (rain, snow, wind damage)
  - [ ] Usage-based decay (occupant wear and tear)
  - [ ] Neglect-based decay (no maintenance)
- [ ] Add critical damage types
  - [ ] Roof leaks (spread over time, cause interior damage)
  - [ ] Cracked walls (structural risk)
  - [ ] Rotting wood (material decay)
  - [ ] Broken windows (comfort/security loss)
  - [ ] Foundation shifts (major structural)
  - [ ] Pest infestations (health hazard)
  - [ ] Mold growth (health hazard)
- [ ] Implement maintenance system
  - [ ] Define maintenance tasks per building type
  - [ ] Schedule periodic maintenance
  - [ ] Agent performs maintenance actions
  - [ ] Materials consumed in repairs
- [ ] Add maintenance effects
  - [ ] Restore durability
  - [ ] Improve cleanliness
  - [ ] Fix critical damage
  - [ ] Prevent future decay
- [ ] Create failure cascades
  - [ ] Neglected roof leak → water damage → mold → structural damage
  - [ ] Cracked wall → foundation shift → collapse risk
  - [ ] Pest infestation → wood rot → structural failure

### Phase 4: Integration
- [ ] Integrate generation with placement system
  - [ ] Generate building variant on placement
  - [ ] Show preview before construction
  - [ ] Adjust materials based on variant
- [ ] Integrate upgrades with construction system
  - [ ] Upgrade construction works like building
  - [ ] Progress tracking for upgrades
  - [ ] Material delivery for upgrades
- [ ] Integrate decay with game loop
  - [ ] Decay system runs periodically (not every tick)
  - [ ] Weather system affects decay rates
  - [ ] Usage tracking updates wear
- [ ] Add agent interactions
  - [ ] Agents notice critical damage
  - [ ] Agents perform maintenance autonomously
  - [ ] Agents prioritize urgent repairs

### Phase 5: Balance & Tuning
- [ ] Tune generation probabilities
  - [ ] Ensure variety without chaos
  - [ ] Wealth levels produce appropriate buildings
  - [ ] Cultural styles are recognizable
- [ ] Balance upgrade costs and benefits
  - [ ] Upgrades feel worthwhile
  - [ ] Progression is satisfying
  - [ ] Not too cheap or expensive
- [ ] Balance decay rates
  - [ ] Buildings last reasonable time
  - [ ] Maintenance feels necessary but not overwhelming
  - [ ] Critical damage is serious but repairable

### Phase 6: Persistence
- [ ] Add serialization for new components
  - [ ] BuildingCondition
  - [ ] Upgrade state
  - [ ] Critical damage instances
  - [ ] Generated variation data
- [ ] Handle migration for existing saves
  - [ ] Generate variants for existing buildings
  - [ ] Initialize condition for existing buildings
  - [ ] Apply retroactive decay based on age

### Phase 7: UI Enhancements
- [ ] Add building inspector enhancements
  - [ ] Show condition meters (durability, cleanliness, etc.)
  - [ ] Show critical damage list
  - [ ] Show maintenance schedule
  - [ ] Show upgrade options
- [ ] Add upgrade UI
  - [ ] Available upgrades list
  - [ ] Prerequisite status
  - [ ] Cost breakdown
  - [ ] "Upgrade Now" button
- [ ] Add maintenance UI
  - [ ] Scheduled tasks list
  - [ ] Overdue tasks highlighted
  - [ ] "Perform Maintenance" button
  - [ ] Material requirements
- [ ] Add visual decay indicators
  - [ ] Damaged textures (cracks, stains)
  - [ ] Color desaturation (faded paint)
  - [ ] Missing elements (broken windows)
  - [ ] Visual severity (minor → major damage)

## Test Requirements

### Unit Tests
- [ ] Building generation produces valid buildings
- [ ] Variation rules apply correctly
- [ ] Upgrade prerequisites check correctly
- [ ] Decay calculations are accurate
- [ ] Critical damage triggers at correct thresholds

### Integration Tests
- [ ] Generate building → construct → verify matches
- [ ] Apply upgrade → building gains effects
- [ ] Building decays over time → critical damage appears
- [ ] Perform maintenance → condition improves
- [ ] Save/load preserves condition and upgrades

### Manual Tests
- [ ] Generate 10 houses → verify unique variations
- [ ] Upgrade house through full path → verify progression
- [ ] Let building decay → verify critical damage → repair
- [ ] Observe maintenance schedule → verify agents perform tasks
- [ ] Test different architectural styles → verify visual differences

## Acceptance Criteria

1. **Procedural generation** creates unique building variations
2. **Architectural styles** are visually distinct and culturally appropriate
3. **Upgrades provide meaningful progression** with clear benefits
4. **Decay system requires maintenance** but is not punishing
5. **Critical damage creates interesting challenges** with solutions
6. **Visual changes** reflect condition and upgrades
7. **Integration with existing systems** seamless
8. **UI shows all relevant information** clearly
9. **Balance feels good** - not too easy or too hard
10. **Persistence works** - all data saves/loads correctly

## Definition of Done

- [ ] All implementation checklist items completed
- [ ] All test requirements passing
- [ ] All acceptance criteria met
- [ ] Code review completed
- [ ] Spec coverage increased to ~100%
- [ ] Documentation updated
- [ ] No performance regression
- [ ] Committed to version control

## Estimated Effort
- **Lines of Code:** ~1,500 LOC
- **Time Estimate:** 15-20 hours
- **Complexity:** Medium (procedural generation, state tracking)

## Notes
- **Procedural generation creates variety** - no two buildings exactly alike
- **Upgrades provide progression** - players improve over time
- **Decay adds realism** - buildings aren't static, require care
- **Balance is critical** - too fast decay = frustrating, too slow = meaningless
- Future enhancements: Multi-story interiors, furniture placement, historical building preservation (don't upgrade/modify old buildings)


---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
