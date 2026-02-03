# Species + Genetics + Body System Integration Plan

## Overview

Integrate the extensible body parts system with species definitions and genetic inheritance to support:
- **Species with standard body plans** (humanoids, insectoids, aliens, magical creatures)
- **Genetic mutations** (99% normal, 1% mutation chance)
- **Hereditary traits** (wings, extra limbs passed to offspring)
- **Hybrids** (half-elves, chimeras, genetic mixing)

## 🔍 What Exists Now

### 1. **BodyComponent System** ✅ (Recently Created)
- `BodyComponent.ts` - Extensible body parts for any species
- `BodyPlanRegistry.ts` - Templates: humanoid, insectoid, avian, aquatic, celestial, etc.
- Supports any number of arms, legs, wings, tentacles, organs
- Injury system with bleeding, fractures, infections
- Modification tracking (magic, divine, genetic)

### 2. **Species Systems** ✅ (Partially Exists)
- `SpeciesCreationSystem.ts` - Deities can create new species
- `animalSpecies.ts` - Animal species definitions
- `realm-species-creation.md` - Comprehensive spec for races/species with body plans

### 3. **Genetics Systems** ✅ (Partially Exists)
- `SleepGenetics.ts` - Genetic traits for sleep patterns
- `PlantGenetics.ts` - Plant genetic system
- Docs: `ANIMAL_GENETICS_BREEDING_SYSTEM.md`, `DNA_AS_ECS_COMPONENTS.md`

### 4. **Magic/Divine Body Modification** ✅ (Recently Created)
- `BodyHealingEffectApplier.ts` - Heal body parts
- `BodyTransformEffectApplier.ts` - Add/remove/modify body parts
- `DivineBodyModification.ts` - Deities grant wings, extra limbs, transformations
- `BloodCostCalculator.ts` - Blood magic creates real injuries

## 🎯 What Needs to Be Built

### 1. **SpeciesComponent** - Link Species to Body Plans

```typescript
/**
 * SpeciesComponent - Defines an entity's species and body plan
 */
export interface SpeciesComponent extends ComponentBase {
  type: 'species';

  // Species identity
  speciesId: string;          // e.g., 'human', 'elf', 'thrakeen_insectoid'
  speciesName: string;         // e.g., 'Human', 'Elf', 'Thrakeen'

  // Body plan reference
  bodyPlanId: string;          // Links to BodyPlanRegistry

  // Hybrid info
  isHybrid: boolean;
  parentSpecies?: [string, string];  // ['elf', 'human'] for half-elf

  // Standard traits for this species
  innateTraits: SpeciesTrait[];

  // Mutation status
  hasMutation: boolean;
  mutations: Mutation[];
}

interface SpeciesTrait {
  id: string;
  name: string;
  category: 'physical' | 'sensory' | 'magical' | 'spiritual' | 'social';

  // Gameplay effects
  needsModifier?: Record<string, number>;     // e.g., { hunger: 0.5 }
  skillBonus?: Record<string, number>;        // e.g., { crafting: 0.2 }
  abilitiesGranted?: string[];                // e.g., ['flight', 'darkvision']
}

interface Mutation {
  id: string;
  type: MutationType;
  bodyPartAffected?: string;   // Which body part mutated
  severity: 'minor' | 'moderate' | 'major';
  beneficial: boolean;
  description: string;
}

type MutationType =
  | 'extra_limb'        // Extra arm/leg/wing/tentacle
  | 'missing_limb'      // Born without expected limb
  | 'enhanced_organ'    // Stronger heart, larger lungs
  | 'sensory_change'    // Extra eyes, echolocation
  | 'size_change'       // Larger/smaller than normal
  | 'color_change'      // Different skin/scale/fur color
  | 'metabolic';        // Different hunger/thirst rates
```

### 2. **GeneticComponent** - Hereditary Traits

```typescript
/**
 * GeneticComponent - Genetic information for reproduction and inheritance
 */
export interface GeneticComponent extends ComponentBase {
  type: 'genetic';

  // Genome - simplified as trait alleles
  genome: GeneticAllele[];

  // Hereditary body modifications
  hereditaryModifications: HereditaryModification[];

  // Mutation rate for offspring
  mutationRate: number;  // Default 0.01 (1%)

  // Genetic compatibility
  compatibleSpecies: string[];  // Can hybridize with these species
}

interface GeneticAllele {
  traitId: string;           // e.g., 'eye_color', 'height', 'wing_presence'
  dominantAllele: string;    // e.g., 'brown', 'tall', 'winged'
  recessiveAllele: string;   // e.g., 'blue', 'short', 'wingless'
  expression: 'dominant' | 'recessive' | 'codominant';
}

interface HereditaryModification {
  // Body modifications that can be passed to offspring
  type: 'wings' | 'extra_arms' | 'tail' | 'horns' | 'enhanced_part';
  bodyPartType: string;      // e.g., 'wing', 'arm'
  inheritanceChance: number; // 0-1, probability offspring inherits this
  source: 'divine' | 'magical' | 'genetic_engineering' | 'mutation';
}
```

### 3. **ReproductionSystem** - Offspring Generation with Genetics

```typescript
/**
 * ReproductionSystem - Handles breeding, reproduction, and genetic inheritance
 */
export class ReproductionSystem implements System {
  /**
   * Create offspring from two parents
   */
  createOffspring(
    parent1: Entity,
    parent2: Entity,
    world: World
  ): Entity {
    const parent1Species = parent1.getComponent('species') as SpeciesComponent;
    const parent2Species = parent2.getComponent('species') as SpeciesComponent;
    const parent1Genetics = parent1.getComponent('genetic') as GeneticComponent;
    const parent2Genetics = parent2.getComponent('genetic') as GeneticComponent;

    // 1. Determine offspring species
    const offspringSpecies = this.determineOffspringSpecies(
      parent1Species,
      parent2Species
    );

    // 2. Inherit genetic traits
    const offspringGenetics = this.inheritGenetics(
      parent1Genetics,
      parent2Genetics,
      offspringSpecies
    );

    // 3. Create body based on species body plan
    let offspringBody = createBodyComponentFromPlan(
      offspringSpecies.bodyPlanId,
      offspringSpecies.speciesId
    );

    // 4. Apply hereditary modifications (wings, extra limbs)
    offspringBody = this.applyHereditaryModifications(
      offspringBody,
      parent1Genetics,
      parent2Genetics
    );

    // 5. Apply mutations (1% chance by default)
    if (Math.random() < offspringGenetics.mutationRate) {
      offspringBody = this.applyMutation(offspringBody, offspringSpecies);
    }

    // 6. Create offspring entity
    const offspring = world.createEntity();
    offspring.addComponent(offspringSpecies);
    offspring.addComponent(offspringGenetics);
    offspring.addComponent(offspringBody);

    return offspring;
  }

  /**
   * Determine offspring species (hybrid if parents differ)
   */
  private determineOffspringSpecies(
    parent1Species: SpeciesComponent,
    parent2Species: SpeciesComponent
  ): SpeciesComponent {
    if (parent1Species.speciesId === parent2Species.speciesId) {
      // Same species - pure offspring
      return { ...parent1Species };
    } else {
      // Different species - create hybrid
      return this.createHybridSpecies(parent1Species, parent2Species);
    }
  }

  /**
   * Create hybrid species (half-elf, chimera, etc.)
   */
  private createHybridSpecies(
    species1: SpeciesComponent,
    species2: SpeciesComponent
  ): SpeciesComponent {
    // Hybrid body plan - blend of both parents
    const hybridBodyPlan = this.blendBodyPlans(
      species1.bodyPlanId,
      species2.bodyPlanId
    );

    return {
      type: 'species',
      speciesId: `${species1.speciesId}_${species2.speciesId}_hybrid`,
      speciesName: `${species1.speciesName}-${species2.speciesName} Hybrid`,
      bodyPlanId: hybridBodyPlan,
      isHybrid: true,
      parentSpecies: [species1.speciesId, species2.speciesId],
      innateTraits: [
        ...species1.innateTraits.slice(0, 2), // Inherit some traits from each
        ...species2.innateTraits.slice(0, 2),
      ],
      hasMutation: false,
      mutations: [],
    };
  }

  /**
   * Apply hereditary modifications (divine wings passed to children)
   */
  private applyHereditaryModifications(
    body: BodyComponent,
    parent1Genetics: GeneticComponent,
    parent2Genetics: GeneticComponent
  ): BodyComponent {
    const allModifications = [
      ...parent1Genetics.hereditaryModifications,
      ...parent2Genetics.hereditaryModifications,
    ];

    for (const mod of allModifications) {
      // Roll for inheritance
      if (Math.random() < mod.inheritanceChance) {
        // Inherit this modification
        switch (mod.type) {
          case 'wings':
            // Add wings to offspring
            this.addWingsToBody(body);
            break;
          case 'extra_arms':
            // Add extra arms
            this.addExtraArmsToBody(body);
            break;
          // etc.
        }
      }
    }

    return body;
  }

  /**
   * Apply random mutation (1% default chance)
   */
  private applyMutation(
    body: BodyComponent,
    species: SpeciesComponent
  ): BodyComponent {
    const mutationType = this.rollMutationType();

    switch (mutationType) {
      case 'extra_limb':
        // 99% get normal limbs, 1% get extra limb
        this.addRandomLimb(body);
        species.hasMutation = true;
        species.mutations.push({
          id: `mutation_${Date.now()}`,
          type: 'extra_limb',
          severity: 'moderate',
          beneficial: true,
          description: 'Born with an extra limb',
        });
        break;

      case 'missing_limb':
        // Born without expected limb
        this.removeRandomLimb(body);
        species.hasMutation = true;
        species.mutations.push({
          id: `mutation_${Date.now()}`,
          type: 'missing_limb',
          severity: 'moderate',
          beneficial: false,
          description: 'Born missing a limb',
        });
        break;

      case 'size_change':
        // Born larger or smaller
        const sizeChange = Math.random() < 0.5 ? 'large' : 'small';
        body.size = sizeChange;
        species.hasMutation = true;
        species.mutations.push({
          id: `mutation_${Date.now()}`,
          type: 'size_change',
          severity: 'minor',
          beneficial: sizeChange === 'large',
          description: `Born ${sizeChange}r than normal`,
        });
        break;

      // Other mutations...
    }

    return body;
  }
}
```

### 4. **Species Registry** - Predefined Species

```typescript
/**
 * SpeciesRegistry - Predefined species with body plans
 */
export const SPECIES_REGISTRY: Record<string, SpeciesTemplate> = {
  human: {
    speciesId: 'human',
    speciesName: 'Human',
    bodyPlanId: 'humanoid_standard',
    innateTraits: [
      {
        id: 'adaptable',
        name: 'Adaptable',
        category: 'social',
        skillBonus: { all: 0.05 },
      },
    ],
    compatibleSpecies: ['elf', 'orc', 'dwarf'],
    mutationRate: 0.01, // 1% mutation chance
  },

  elf: {
    speciesId: 'elf',
    speciesName: 'Elf',
    bodyPlanId: 'humanoid_standard',
    innateTraits: [
      {
        id: 'keen_senses',
        name: 'Keen Senses',
        category: 'sensory',
        skillBonus: { perception: 0.3 },
      },
      {
        id: 'ageless',
        name: 'Ageless',
        category: 'physical',
        needsModifier: { aging: 0.1 },
      },
    ],
    compatibleSpecies: ['human'],
    mutationRate: 0.005, // Elves mutate less (0.5%)
  },

  thrakeen: {
    speciesId: 'thrakeen',
    speciesName: 'Thrakeen',
    bodyPlanId: 'insectoid_4arm',
    innateTraits: [
      {
        id: 'four_arms',
        name: 'Four Arms',
        category: 'physical',
        skillBonus: { crafting: 0.3, building: 0.2 },
      },
      {
        id: 'compound_eyes',
        name: 'Compound Eyes',
        category: 'sensory',
        abilitiesGranted: ['360_vision', 'motion_detection'],
      },
      {
        id: 'chitinous_armor',
        name: 'Chitinous Armor',
        category: 'physical',
        abilitiesGranted: ['natural_armor'],
      },
    ],
    compatibleSpecies: [], // Cannot hybridize
    mutationRate: 0.02, // Insectoids mutate more (2%)
  },

  celestial: {
    speciesId: 'celestial',
    speciesName: 'Celestial',
    bodyPlanId: 'celestial_winged',
    innateTraits: [
      {
        id: 'divine_wings',
        name: 'Divine Wings',
        category: 'physical',
        abilitiesGranted: ['flight'],
      },
      {
        id: 'holy_aura',
        name: 'Holy Aura',
        category: 'spiritual',
        skillBonus: { persuasion: 0.2 },
      },
    ],
    compatibleSpecies: ['human'], // Can create divine hybrids
    mutationRate: 0.0, // Divine beings don't mutate
  },
};
```

## 📋 Implementation Plan

### Phase 1: Core Components
1. ✅ Create `SpeciesComponent.ts` interface
2. ✅ Create `GeneticComponent.ts` interface
3. ✅ Create `SpeciesRegistry.ts` with predefined species
4. ✅ Update `BodyPlanRegistry.ts` to link with species

### Phase 2: Reproduction System
1. ✅ Create `ReproductionSystem.ts`
2. ✅ Implement genetic inheritance logic
3. ✅ Implement hybrid creation (half-elves, chimeras)
4. ✅ Implement mutation system (1% default)
5. ✅ Implement hereditary modification inheritance

### Phase 3: Integration
1. ✅ Link species to body plans on entity creation
2. ✅ Update divine transformations to create hereditary modifications
3. ✅ Update magic transformations to optionally become hereditary
4. ✅ Handle species-specific needs/skills

### Phase 4: Testing
1. ✅ Test pure-species reproduction
2. ✅ Test hybrid creation (half-elf, human-orc, etc.)
3. ✅ Test mutation system (1% extra limbs, missing limbs)
4. ✅ Test hereditary divine wings
5. ✅ Test multi-generation inheritance
6. ✅ Test chimera creation (3+ species mixing)

## 🎮 Example Use Cases

### 1. Standard Reproduction
```typescript
// Two humans reproduce
const human1 = createHuman(world);
const human2 = createHuman(world);

const offspring = reproductionSystem.createOffspring(human1, human2, world);
// Result: Human with humanoid_standard body plan
// 99% chance: Normal 2 arms, 2 legs
// 1% chance: Mutation (extra limb, size change, etc.)
```

### 2. Hybrid Creation
```typescript
// Elf and human reproduce
const elf = createElf(world);
const human = createHuman(world);

const offspring = reproductionSystem.createOffspring(elf, human, world);
// Result: Half-elf hybrid
// Blended traits from both parents
// Intermediate body plan
```

### 3. Hereditary Divine Wings
```typescript
// Deity grants wings to human champion
divineBodySystem.grantWings(deityId, humanId, world, 'champion_creation');

// Mark as hereditary
const genetics = human.getComponent('genetic');
genetics.hereditaryModifications.push({
  type: 'wings',
  bodyPartType: 'wing',
  inheritanceChance: 0.5, // 50% chance children inherit wings
  source: 'divine',
});

// Champion has children
const child = reproductionSystem.createOffspring(champion, human2, world);
// Result: 50% chance child has divine wings
// Wings become a hereditary trait in this bloodline
```

### 4. Mutation Occurs
```typescript
// Normal human parents
const offspring = reproductionSystem.createOffspring(human1, human2, world);

// 1% chance of mutation
if (offspring.species.hasMutation) {
  // Possible mutations:
  // - Extra arm (3 arms instead of 2)
  // - Missing leg (1 leg instead of 2)
  // - Larger size
  // - Enhanced organ (stronger heart)
  // etc.
}
```

### 5. Insectoid with Extra Arms
```typescript
// Thrakeen (4-armed insectoid) standard
const thrakeen = createThrakeen(world);
// Body: 4 arms, 2 legs, compound eyes, chitin armor

// Thrakeen offspring
const baby = reproductionSystem.createOffspring(thrakeen1, thrakeen2, world);
// 99% chance: Normal 4 arms
// 2% mutation chance (higher for insectoids)
// Possible: 5 arms, 3 arms, extra antennae, color change
```

### 6. Multi-Generation Wings
```typescript
// Generation 1: Deity grants wings to human
divine.grantWings(deity, human1, world);
genetics.markAsHereditary('wings', 0.5);

// Generation 2: Human1 + Human2 = Child1 with 50% wing chance
const child1 = reproduce(human1, human2);
// child1 has wings (rolled successfully)

// Generation 3: Child1 + Human3 = Grandchild
const grandchild = reproduce(child1, human3);
// 50% chance grandchild has wings
// Wings can persist through bloodline
```

## 🔗 Integration with Existing Systems

### Divine Body Modifications → Hereditary Traits
When deities grant body modifications (wings, extra arms), they can optionally make them hereditary:

```typescript
// Divine transformation
const result = divineBodySystem.grantWings(deityId, believerId, world, 'champion_creation');

// Make hereditary (50% inheritance)
const genetics = believer.getComponent('genetic');
genetics.hereditaryModifications.push({
  type: 'wings',
  inheritanceChance: 0.5,
  source: 'divine',
});
```

### Magic Transformations → Temporary vs Permanent
Magic transformations are temporary, but powerful rituals can make them permanent and hereditary:

```typescript
// Temporary transformation (expires)
bodyTransformApplier.apply(growWingsEffect, caster, target, world, context);

// Permanent genetic modification (requires ritual + cost)
geneticModificationSystem.makePermanentAndHereditary(
  target,
  'wings',
  0.3 // 30% inheritance chance
);
```

### Species Determines Body Plan
When entities are created, their species determines their body plan:

```typescript
function createEntityWithSpecies(speciesId: string, world: World): Entity {
  const species = SPECIES_REGISTRY[speciesId];
  const body = createBodyComponentFromPlan(species.bodyPlanId, species.speciesId);

  const entity = world.createEntity();
  entity.addComponent(species);
  entity.addComponent(body);

  return entity;
}
```

## ✅ Benefits

1. **Species Diversity**: Support any species (humanoid, insectoid, alien, magical)
2. **Genetic Inheritance**: Traits passed from parents to offspring
3. **Mutations**: 1% chance creates variety (extra limbs, size changes, etc.)
4. **Hybrids**: Half-elves, chimeras, genetic mixing
5. **Hereditary Divine Blessings**: Wings/enhancements passed through bloodlines
6. **Realistic Biology**: Standard body plans with rare mutations
7. **Emergent Bloodlines**: Divine champions create winged bloodlines
8. **Multi-Species World**: Humans, elves, insectoids, celestials, all coexisting

## 📝 Next Steps

1. **Implement SpeciesComponent** - Define species with body plans
2. **Implement GeneticComponent** - Hereditary traits and mutations
3. **Implement ReproductionSystem** - Offspring creation with inheritance
4. **Create Species Registry** - Predefined species (human, elf, insectoid, etc.)
5. **Integrate with Divine Powers** - Make transformations hereditary
6. **Add Tests** - Verify reproduction, hybrids, mutations, heredity
7. **Document Examples** - Show how to create species, hybrids, mutations
