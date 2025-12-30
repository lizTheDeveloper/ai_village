# Extensible Body Parts System - Design Document

## Overview

The body parts system must support:
- **Humanoids** (humans, elves, orcs) with standard anatomy
- **Aliens** (insectoids with 4 arms, avians with wings, aquatics with gills)
- **Magical Creatures** (demons with tails, angels with wings, fae with glamour)
- **Genetic Engineering** (modified limbs, extra organs, cybernetics)
- **Magic Integration** (body transformation spells, enhancements, mutations)

## Architecture

### 1. Species-Driven Body Plans

Instead of hardcoding body parts, we use **BodyPlan templates** from species definitions.

```typescript
// From species-system.md - already specified
interface BodyPlan {
  baseType: 'humanoid' | 'insectoid' | 'avian' | 'reptilian' | 'aquatic' |
            'amorphous' | 'crystalline' | 'ethereal' | 'mechanical';
  symmetry: 'bilateral' | 'radial' | 'asymmetric' | 'none';

  limbs?: {
    arms?: number;      // 0-8+
    legs?: number;      // 0-8+
    wings?: number;     // 0-4+
    tentacles?: number; // 0-many
    tails?: number;     // 0-many
  };

  specialOrgans?: SpecialOrgan[];
  naturalWeapons?: NaturalWeapon[];
  naturalArmor?: { type: string; value: number; coverage: number };
  senses?: { eyes, ears, antennae, etc. };
  movement?: { walk, run, swim, fly, burrow, teleport };
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'colossal';
  blood?: 'red' | 'blue' | 'green' | 'ichor' | 'sap' | 'none';
  skeleton?: 'internal' | 'exoskeleton' | 'hydrostatic' | 'none';
}
```

### 2. Dynamic Body Part System

```typescript
// Core body part interface - supports ANY part type
interface BodyPart {
  id: string;                    // Unique ID: "left_arm_1", "wing_2", "tentacle_5"
  type: BodyPartType;
  name: string;                  // Display name
  parent?: string;               // Parent part ID (hand attached to arm)
  vital: boolean;                // Death if destroyed

  // Health
  health: number;
  maxHealth: number;

  // Function
  functions: BodyPartFunction[]; // What this part does
  affectsSkills: string[];       // Skills impacted when damaged
  affectsActions: string[];      // Actions prevented when damaged

  // Injuries
  injuries: Injury[];
  bandaged: boolean;
  splinted: boolean;
  infected: boolean;

  // Modifications (magic, genetic, cybernetic)
  modifications: BodyPartModification[];
}

type BodyPartType =
  // Humanoid parts
  | 'head' | 'torso' | 'arm' | 'hand' | 'leg' | 'foot'
  // Non-humanoid limbs
  | 'wing' | 'tentacle' | 'tail' | 'tendril' | 'pseudopod'
  // Insectoid
  | 'antenna' | 'mandible' | 'abdomen' | 'thorax'
  // Aquatic
  | 'fin' | 'gill' | 'scale'
  // Special
  | 'eye' | 'ear' | 'organ' | 'gland' | 'heart' | 'lung'
  // Magical/supernatural
  | 'halo' | 'horn' | 'fang' | 'claw' | 'stinger'
  // Custom (for unique species)
  | 'custom';

type BodyPartFunction =
  | 'manipulation'   // Can grasp, use tools
  | 'locomotion'     // Movement
  | 'flight'         // Flying
  | 'swimming'       // Aquatic movement
  | 'sensory'        // Vision, hearing, etc.
  | 'attack'         // Natural weapon
  | 'defense'        // Natural armor
  | 'vital_organ'    // Heart, brain, etc.
  | 'special_organ'  // Venom gland, silk gland, etc.
  | 'communication'  // Voice, pheromones, etc.
  | 'balance'        // Tail for balance
  | 'none';          // Vestigial
```

### 3. Body Component

```typescript
interface BodyComponent extends Component {
  type: 'body';

  // Species & Body Plan
  speciesId?: string;            // e.g., 'human', 'thrakeen', 'olympian'
  bodyPlanId: string;            // e.g., 'humanoid_standard', 'insectoid_4arm'

  // Dynamic part list (generated from body plan)
  parts: Record<string, BodyPart>;  // ID -> BodyPart

  // Derived stats
  overallHealth: number;         // 0-100 aggregate
  totalPain: number;             // Sum of all pain
  bloodLoss: number;             // 0-100
  consciousness: boolean;        // Awake or unconscious

  // Physical properties (from species)
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'colossal';
  bloodType?: string;
  skeletonType?: string;

  // Modifications tracking (for magic, genetic engineering, etc.)
  modifications: GlobalBodyModification[];
}

// Modifications that affect the whole body or multiple parts
interface GlobalBodyModification {
  id: string;
  name: string;
  source: 'magic' | 'genetic' | 'divine' | 'cybernetic' | 'mutation';
  effects: {
    partTypeAdded?: { type: BodyPartType; count: number };  // Grew wings
    partTypeRemoved?: { type: BodyPartType; count: number }; // Lost tail
    propertyModified?: { property: string; value: any };    // Size changed
    skillModifier?: Record<string, number>;                  // Skill bonuses
  };
  permanent: boolean;
  duration?: number;             // If temporary
  createdAt: number;             // Game tick
}

// Modifications specific to a single body part
interface BodyPartModification {
  id: string;
  name: string;
  source: 'magic' | 'genetic' | 'divine' | 'cybernetic' | 'mutation';
  effects: {
    healthModifier?: number;     // +50 max health
    functionAdded?: BodyPartFunction[];   // Hand gains venom delivery
    functionsRemoved?: BodyPartFunction[]; // Wing loses flight
    propertyChange?: Record<string, any>;  // Color, texture, etc.
  };
  permanent: boolean;
  duration?: number;
  createdAt: number;
}
```

### 4. Body Plan Registry

```typescript
// Predefined body plans
const BODY_PLANS: Record<string, BodyPlanTemplate> = {
  humanoid_standard: {
    id: 'humanoid_standard',
    baseType: 'humanoid',
    symmetry: 'bilateral',
    parts: [
      { type: 'head', count: 1, vital: true, health: 150, functions: ['sensory', 'vital_organ'] },
      { type: 'torso', count: 1, vital: true, health: 200, functions: ['vital_organ'] },
      { type: 'arm', count: 2, vital: false, health: 100, functions: ['manipulation'],
        children: [{ type: 'hand', count: 1, health: 80, functions: ['manipulation'] }] },
      { type: 'leg', count: 2, vital: false, health: 100, functions: ['locomotion'],
        children: [{ type: 'foot', count: 1, health: 60, functions: ['locomotion'] }] },
    ],
  },

  insectoid_4arm: {
    id: 'insectoid_4arm',
    baseType: 'insectoid',
    symmetry: 'bilateral',
    parts: [
      { type: 'head', count: 1, vital: true, health: 120, functions: ['sensory', 'vital_organ'] },
      { type: 'thorax', count: 1, vital: true, health: 180, functions: ['vital_organ'] },
      { type: 'abdomen', count: 1, vital: false, health: 150, functions: ['vital_organ'] },
      { type: 'arm', count: 4, vital: false, health: 80, functions: ['manipulation'],
        children: [{ type: 'hand', count: 1, health: 60, functions: ['manipulation'] }] },
      { type: 'leg', count: 2, vital: false, health: 90, functions: ['locomotion'],
        children: [{ type: 'foot', count: 1, health: 50, functions: ['locomotion'] }] },
      { type: 'antenna', count: 2, vital: false, health: 30, functions: ['sensory'] },
    ],
  },

  avian_winged: {
    id: 'avian_winged',
    baseType: 'avian',
    symmetry: 'bilateral',
    parts: [
      { type: 'head', count: 1, vital: true, health: 130, functions: ['sensory', 'vital_organ'] },
      { type: 'torso', count: 1, vital: true, health: 180, functions: ['vital_organ'] },
      { type: 'arm', count: 2, vital: false, health: 90, functions: ['manipulation'],
        children: [{ type: 'hand', count: 1, health: 70, functions: ['manipulation'] }] },
      { type: 'wing', count: 2, vital: false, health: 120, functions: ['flight'] },
      { type: 'leg', count: 2, vital: false, health: 90, functions: ['locomotion'],
        children: [{ type: 'foot', count: 1, health: 55, functions: ['locomotion'] }] },
      { type: 'tail', count: 1, vital: false, health: 60, functions: ['balance', 'flight'] },
    ],
  },

  aquatic_tentacled: {
    id: 'aquatic_tentacled',
    baseType: 'aquatic',
    symmetry: 'radial',
    parts: [
      { type: 'head', count: 1, vital: true, health: 140, functions: ['sensory', 'vital_organ'] },
      { type: 'torso', count: 1, vital: true, health: 200, functions: ['vital_organ'] },
      { type: 'tentacle', count: 8, vital: false, health: 70, functions: ['manipulation', 'locomotion', 'swimming'] },
      { type: 'gill', count: 6, vital: false, health: 40, functions: ['vital_organ'] },
    ],
  },

  // Magical/divine variants
  celestial_winged: {
    id: 'celestial_winged',
    baseType: 'humanoid',
    symmetry: 'bilateral',
    parts: [
      { type: 'head', count: 1, vital: true, health: 150, functions: ['sensory', 'vital_organ'] },
      { type: 'halo', count: 1, vital: false, health: 100, functions: ['none'] },  // Cosmetic
      { type: 'torso', count: 1, vital: true, health: 200, functions: ['vital_organ'] },
      { type: 'arm', count: 2, vital: false, health: 100, functions: ['manipulation'],
        children: [{ type: 'hand', count: 1, health: 80, functions: ['manipulation'] }] },
      { type: 'wing', count: 2, vital: false, health: 150, functions: ['flight'] },
      { type: 'leg', count: 2, vital: false, health: 100, functions: ['locomotion'],
        children: [{ type: 'foot', count: 1, health: 60, functions: ['locomotion'] }] },
    ],
  },
};
```

### 5. Magic Integration

Magic can affect bodies through the existing MagicForm `'body'`:

```typescript
// Spell: Transform Body (Muto Corpus)
{
  technique: 'transform',
  form: 'body',
  effects: {
    addBodyPart: { type: 'wing', count: 2 },
    // OR
    modifyBodyPart: { partId: 'left_arm_1', healthModifier: 50 },
    // OR
    removeBodyPart: { partType: 'tail' },
  }
}

// Spell: Enhance Body (Augment Corpus)
{
  technique: 'enhance',
  form: 'body',
  effects: {
    modifyAllParts: { type: 'arm', healthModifier: 30, functionAdded: ['attack'] }
  }
}

// Spell: Create Body Part (Creo Corpus) - healing
{
  technique: 'create',
  form: 'body',
  effects: {
    healPart: { partId: 'right_leg_2', amount: 50 }
  }
}
```

### 6. Skill Debuffs with Extensible Parts

```typescript
function getSkillDebuff(body: BodyComponent, skillId: string): number {
  let debuff = 0;

  for (const [partId, part] of Object.entries(body.parts)) {
    // Check if this part type affects this skill
    if (part.affectsSkills.includes(skillId)) {
      const damagePercent = 1 - (part.health / part.maxHealth);

      // Weight depends on function and redundancy
      const partWeight = getPartWeight(part, body);
      debuff += damagePercent * partWeight;
    }
  }

  return Math.min(0.9, debuff);  // Cap at 90%
}

function getPartWeight(part: BodyPart, body: BodyComponent): number {
  // Vital organs have high weight
  if (part.vital) return 0.5;

  // Count redundant parts
  const similarParts = Object.values(body.parts).filter(p =>
    p.type === part.type &&
    p.functions.some(f => part.functions.includes(f))
  );

  // More redundancy = lower individual weight
  // 4 arms? Each arm is 0.125 instead of 0.25
  return 0.5 / similarParts.length;
}
```

### 7. Body System

```typescript
class BodySystem implements System {
  public readonly id = 'body';
  public readonly priority = 13;
  public readonly requiredComponents = ['body'];

  update(world: World, entities: Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const body = entity.getComponent('body') as BodyComponent;

      // 1. Process bleeding
      this.processBleedingDamage(entity, body, deltaTime);

      // 2. Natural healing
      this.processNaturalHealing(entity, body, deltaTime);

      // 3. Infections
      this.processInfections(entity, body, deltaTime, world);

      // 4. Update derived stats
      this.updateDerivedStats(entity, body);

      // 5. Check consciousness
      this.checkConsciousness(entity, body, world);

      // 6. Check vital parts
      this.checkVitalParts(entity, body, world);

      // 7. Apply pain to stress
      this.applyPainToStress(entity, body);

      // 8. Process temporary modifications (magic duration)
      this.processModifications(entity, body, world.currentTick);
    }
  }

  private processModifications(entity: Entity, body: BodyComponent, currentTick: number): void {
    // Remove expired temporary modifications
    body.modifications = body.modifications.filter(mod => {
      if (!mod.permanent && mod.duration) {
        const elapsed = currentTick - mod.createdAt;
        return elapsed < mod.duration;
      }
      return true;
    });

    // Remove expired part-specific modifications
    for (const part of Object.values(body.parts)) {
      part.modifications = part.modifications.filter(mod => {
        if (!mod.permanent && mod.duration) {
          const elapsed = currentTick - mod.createdAt;
          return elapsed < mod.duration;
        }
        return true;
      });
    }
  }
}
```

### 8. Factory Function

```typescript
function createBodyComponentFromPlan(
  planId: string,
  speciesId?: string
): BodyComponent {
  const plan = BODY_PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown body plan: ${planId}`);
  }

  const parts: Record<string, BodyPart> = {};
  let partIndex = 0;

  // Generate parts from plan
  for (const partDef of plan.parts) {
    for (let i = 0; i < partDef.count; i++) {
      const side = plan.symmetry === 'bilateral' && partDef.count === 2
        ? (i === 0 ? 'left' : 'right')
        : '';

      const partId = `${side}_${partDef.type}_${partIndex}`.replace(/^_/, '');
      partIndex++;

      parts[partId] = {
        id: partId,
        type: partDef.type,
        name: side ? `${side} ${partDef.type}` : partDef.type,
        vital: partDef.vital,
        health: partDef.health,
        maxHealth: partDef.health,
        functions: partDef.functions,
        affectsSkills: inferSkillsFromFunctions(partDef.functions),
        affectsActions: inferActionsFromFunctions(partDef.functions),
        injuries: [],
        bandaged: false,
        splinted: false,
        infected: false,
        modifications: [],
      };

      // Add children (like hands attached to arms)
      if (partDef.children) {
        for (const childDef of partDef.children) {
          for (let j = 0; j < childDef.count; j++) {
            const childId = `${partId}_${childDef.type}_${j}`;
            parts[childId] = {
              id: childId,
              type: childDef.type,
              name: `${parts[partId].name} ${childDef.type}`,
              parent: partId,
              vital: false,
              health: childDef.health,
              maxHealth: childDef.health,
              functions: childDef.functions,
              affectsSkills: inferSkillsFromFunctions(childDef.functions),
              affectsActions: inferActionsFromFunctions(childDef.functions),
              injuries: [],
              bandaged: false,
              splinted: false,
              infected: false,
              modifications: [],
            };
          }
        }
      }
    }
  }

  return {
    type: 'body',
    version: 1,
    speciesId,
    bodyPlanId: planId,
    parts,
    overallHealth: 100,
    totalPain: 0,
    bloodLoss: 0,
    consciousness: true,
    size: plan.size || 'medium',
    bloodType: plan.blood,
    skeletonType: plan.skeleton,
    modifications: [],
  };
}

function inferSkillsFromFunctions(functions: BodyPartFunction[]): string[] {
  const skillMap: Record<BodyPartFunction, string[]> = {
    manipulation: ['crafting', 'building', 'cooking'],
    locomotion: ['exploration'],
    flight: ['exploration'],
    swimming: ['exploration'],
    sensory: ['exploration', 'foraging'],
    attack: ['combat'],
    defense: [],
    vital_organ: [],
    special_organ: [],
    communication: ['social'],
    balance: ['exploration'],
    none: [],
  };

  const skills = new Set<string>();
  for (const func of functions) {
    skillMap[func]?.forEach(s => skills.add(s));
  }
  return Array.from(skills);
}
```

## Examples

### Example 1: Thrakeen (4-Armed Insectoid)

```typescript
const thrakeen = createBodyComponentFromPlan('insectoid_4arm', 'thrakeen');

// Result:
{
  speciesId: 'thrakeen',
  bodyPlanId: 'insectoid_4arm',
  parts: {
    'head_0': { type: 'head', health: 120, vital: true, functions: ['sensory', 'vital_organ'] },
    'thorax_1': { type: 'thorax', health: 180, vital: true, functions: ['vital_organ'] },
    'abdomen_2': { type: 'abdomen', health: 150, vital: false, functions: ['vital_organ'] },
    'left_arm_3': { type: 'arm', health: 80, functions: ['manipulation'] },
    'left_arm_3_hand_0': { type: 'hand', parent: 'left_arm_3', health: 60 },
    'left_arm_4': { type: 'arm', health: 80, functions: ['manipulation'] },
    'left_arm_4_hand_0': { type: 'hand', parent: 'left_arm_4', health: 60 },
    'right_arm_5': { type: 'arm', health: 80, functions: ['manipulation'] },
    'right_arm_5_hand_0': { type: 'hand', parent: 'right_arm_5', health: 60 },
    'right_arm_6': { type: 'arm', health: 80, functions: ['manipulation'] },
    'right_arm_6_hand_0': { type: 'hand', parent: 'right_arm_6', health: 60 },
    'left_leg_7': { type: 'leg', health: 90, functions: ['locomotion'] },
    'left_leg_7_foot_0': { type: 'foot', parent: 'left_leg_7', health: 50 },
    'right_leg_8': { type: 'leg', health: 90, functions: ['locomotion'] },
    'right_leg_8_foot_0': { type: 'foot', parent: 'right_leg_8', health: 50 },
    'left_antenna_9': { type: 'antenna', health: 30, functions: ['sensory'] },
    'right_antenna_10': { type: 'antenna', health: 30, functions: ['sensory'] },
  }
}

// Skill debuff calculation:
// Loses 1 arm (25% of manipulation capacity) = 15% debuff to crafting/building
// Loses 2 arms (50% of manipulation capacity) = 30% debuff
```

### Example 2: Angel with Magic-Granted Wings

```typescript
// Start as human
const angel = createBodyComponentFromPlan('humanoid_standard', 'human');

// Divine transformation adds wings
angel.modifications.push({
  id: 'divine_ascension_wings',
  name: 'Divine Wings',
  source: 'divine',
  effects: {
    partTypeAdded: { type: 'wing', count: 2 },
  },
  permanent: true,
  createdAt: world.currentTick,
});

// Wings are added to parts dynamically
angel.parts['wing_divine_0'] = {
  id: 'wing_divine_0',
  type: 'wing',
  name: 'left divine wing',
  vital: false,
  health: 150,
  maxHealth: 150,
  functions: ['flight'],
  affectsSkills: ['exploration'],
  affectsActions: ['fly'],
  injuries: [],
  bandaged: false,
  splinted: false,
  infected: false,
  modifications: [{
    id: 'divine_radiance',
    name: 'Divine Radiance',
    source: 'divine',
    effects: { propertyChange: { glow: true, color: 'golden' } },
    permanent: true,
    createdAt: world.currentTick,
  }],
};
// ... same for right wing
```

## Migration Path

1. **Phase 1**: Implement BodyComponent, BodySystem, body plan registry
2. **Phase 2**: Integrate with existing NeedsComponent (health, injuries)
3. **Phase 3**: Add magic body transformation spells
4. **Phase 4**: Add species body plan templates
5. **Phase 5**: UI panels showing body status
6. **Phase 6**: Genetic engineering / cybernetics support

## Benefits

✅ **Species-Agnostic**: Works for any body plan
✅ **Magic-Ready**: Integrates with existing magic system
✅ **Extensible**: Add new part types without changing core code
✅ **Redundancy-Aware**: 4 arms = each arm less critical
✅ **Skill-Integrated**: Injuries affect relevant skills
✅ **Modification-Tracking**: Track magic/genetic changes separately

## Next Steps

1. Implement `BodyComponent` interface
2. Create body plan registry
3. Implement `createBodyComponentFromPlan()` factory
4. Implement `BodySystem` with injury/healing logic
5. Add magic spell effects for body transformation
6. Tests for multi-limbed creatures
