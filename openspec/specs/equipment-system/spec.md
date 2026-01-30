# Equipment System Specification

## Purpose

The Equipment System provides armor, weapons, and clothing for agents using Phase 29's Material and Trait systems, affecting combat performance, temperature regulation, and social status.

## Overview

The Equipment System leverages Phase 29's Material and Trait systems to provide armor, weapons, and clothing for agents. Equipment affects combat, temperature regulation, social status, and agent capabilities.

**IMPORTANT:** This is a **body-based equipment system** that adapts to different species:
- **Humanoids** (2 arms, 2 legs): Standard armor slots
- **Angels** (2 wings, no legs): Wing armor required, helmets less important
- **Insectoids** (4 arms, chitin): Multiple arm slots, thorax instead of torso
- **Tentacled Aliens** (6+ tentacles): Tentacle wraps, no leg armor
- **Custom Species**: Equipment maps to body parts dynamically

Equipment slots are **NOT fixed** - they're generated from `BodyComponent.parts` at runtime.

## Version

0.1.0

## Dependencies

- **Phase 29**: Item System Refactor ✅ (ArmorTrait, WeaponTrait, MaterialTemplate)
- **Phase 10**: Crafting System ✅ (for equipment creation)
- **Conflict System**: `openspec/specs/conflict-system/spec.md` (combat mechanics)
- **Temperature System**: `custom_game_engine/specs/temperature-shelter-system.md` (climate protection)

---

## Core Concepts

### Equipment Uses Existing Traits (UPDATED for Body-Based System)

Equipment items are defined using the **trait composition** system from Phase 29.

**IMPORTANT UPDATE:** ArmorTrait has been updated to use `target: EquipmentTarget` instead of fixed `slot: ArmorSlot`:

```typescript
// UPDATED ArmorTrait for body-based equipment
interface ArmorTrait {
  defense: number;
  armorClass: ArmorClass;

  // NEW: Body-based targeting (replaces old "slot" field)
  target: EquipmentTarget;

  // NEW: Weight tracking (critical for flying creatures)
  weight: number;  // kg

  durability: number;
  movementPenalty: number;
  resistances?: Partial<Record<DamageType, number>>;

  // Optional: Flight penalty for wing armor
  flightSpeedPenalty?: number;
}

interface EquipmentTarget {
  bodyPartType?: BodyPartType;      // e.g., 'wing', 'tentacle', 'thorax'
  bodyPartFunction?: BodyPartFunction; // e.g., 'manipulation', 'flight'
  multiSlot?: boolean;               // Equips on ALL matching parts
  maxWeight?: number;                // Weight limit for this slot (wings)
}
```

Equipment items are defined using the **trait composition** system from Phase 29:

```typescript
import type { ArmorTrait, WeaponTrait } from '../items/traits';
import type { ItemDefinition } from '../items/ItemDefinition';

// Example: Iron Sword
const ironSword: ItemDefinition = {
  id: 'iron_sword',
  name: 'Iron Sword',
  category: 'equipment',
  materialId: 'iron',  // References MaterialRegistry
  traits: {
    weapon: {
      damage: 8,
      damageType: 'slashing',
      range: 1,
      attackSpeed: 1.2,
      durabilityLoss: 0.01,
      twoHanded: false,
      critChance: 0.05,
      critMultiplier: 1.5
    }
  }
};

// Example: Leather Armor (targets torso body parts)
const leatherArmor: ItemDefinition = {
  id: 'leather_chest',
  name: 'Leather Tunic',
  category: 'equipment',
  materialId: 'leather',
  traits: {
    armor: {
      defense: 5,
      armorClass: 'light',
      target: {
        bodyPartType: 'torso',  // Works on humanoid torso
      },
      weight: 3.5,  // kg
      durability: 1.0,
      movementPenalty: 0.05,
      resistances: {
        slashing: 0.2,
        piercing: 0.1
      }
    }
  }
};

// Example: Insectoid Thorax Plate (targets thorax instead of torso)
const thoraxPlate: ItemDefinition = {
  id: 'chitin_thorax_plate',
  name: 'Chitin Thorax Plate',
  category: 'equipment',
  materialId: 'chitin',
  traits: {
    armor: {
      defense: 8,
      armorClass: 'medium',
      target: {
        bodyPartType: 'thorax',  // Insectoid-specific
      },
      weight: 4.0,
      durability: 1.0,
      movementPenalty: 0.10,
      resistances: {
        piercing: 0.3,
        bludgeoning: 0.2
      }
    }
  }
};

// Example: Wing Guards (LIGHTWEIGHT for angels!)
const wingGuards: ItemDefinition = {
  id: 'mythril_wing_guard',
  name: 'Mythril Wing Guard',
  category: 'equipment',
  materialId: 'mythril',  // Magical lightweight metal
  traits: {
    armor: {
      defense: 3,
      armorClass: 'light',
      target: {
        bodyPartType: 'wing',
        multiSlot: true,  // Equips on BOTH wings
        maxWeight: 2.0    // Cannot exceed 2kg per wing
      },
      weight: 1.5,  // kg per wing (LIGHT!)
      durability: 1.0,
      movementPenalty: 0.02,
      flightSpeedPenalty: 0.01,  // Minimal impact on flight
      resistances: {
        slashing: 0.25,
        piercing: 0.15
      }
    }
  }
};

// Example: Tentacle Wraps (flexible armor for tentacled aliens)
const tentacleWraps: ItemDefinition = {
  id: 'scaled_tentacle_wrap',
  name: 'Scaled Tentacle Wrap',
  category: 'equipment',
  materialId: 'drake_scale',
  traits: {
    armor: {
      defense: 4,
      armorClass: 'light',
      target: {
        bodyPartType: 'tentacle',
        multiSlot: true,  // Can equip on ALL tentacles
      },
      weight: 0.5,  // kg per tentacle
      durability: 1.0,
      movementPenalty: 0.0,  // Flexible, doesn't impede movement
      resistances: {
        slashing: 0.2,
        fire: 0.1
      }
    }
  }
};

// Example: Multi-Arm Gloves (for 4-armed insectoids)
const fourArmGloves: ItemDefinition = {
  id: 'silk_gloves',
  name: 'Silk Gloves',
  category: 'equipment',
  materialId: 'spider_silk',
  traits: {
    armor: {
      defense: 1,
      armorClass: 'clothing',
      target: {
        bodyPartFunction: 'manipulation',  // Targets ALL manipulation parts
        multiSlot: true  // Works on 2 arms, 4 arms, 6 tentacles, etc.
      },
      weight: 0.2,  // kg per limb
      durability: 1.0,
      movementPenalty: 0.0,
      resistances: {}
    }
  }
};
```

---

## Equipment Slots (Dynamic Body-Based)

**Equipment slots are NOT fixed** - they map to **body parts from BodyComponent**.

### Slot Mapping Strategy

Equipment maps to body parts based on **type** and **function**:

```typescript
// Equipment targets body part types
type EquipmentTargetType =
  // Humanoid
  | 'head' | 'torso' | 'arm' | 'hand' | 'leg' | 'foot'
  // Non-humanoid limbs
  | 'wing' | 'tentacle' | 'tail'
  // Insectoid
  | 'abdomen' | 'thorax'
  // Special
  | 'neck' | 'back' | 'waist';

// Equipment can target by function instead of type
type EquipmentTargetFunction =
  | 'manipulation'   // Gloves on hands/tentacles/claws
  | 'locomotion'     // Boots on feet/hooves/paws
  | 'flight';        // Wing armor on wings

// Equipment definition
interface EquipmentTarget {
  // Primary: target by body part type
  bodyPartType?: BodyPartType;

  // OR target by function (more flexible)
  bodyPartFunction?: BodyPartFunction;

  // Allow multiple parts (e.g., "equip gloves on all manipulation parts")
  multiSlot?: boolean;

  // Weight restriction (flying creatures need light armor)
  maxWeight?: number;
}
```

### Example: Equipment for Different Species

```typescript
// Humanoid with 2 arms
const human: BodyComponent = {
  bodyPlanId: 'humanoid_standard',
  parts: {
    'head_1': { type: 'head', functions: ['sensory'] },
    'torso_1': { type: 'torso', functions: ['vital_organ'] },
    'left_arm_1': { type: 'arm', functions: ['manipulation'] },
    'right_arm_1': { type: 'arm', functions: ['manipulation'] },
    'left_leg_1': { type: 'leg', functions: ['locomotion'] },
    'right_leg_1': { type: 'leg', functions: ['locomotion'] }
  }
};
// Can equip: helmet (head), chest armor (torso), gloves (2x arm), boots (2x leg)

// Insectoid with 4 arms
const thrakeen: BodyComponent = {
  bodyPlanId: 'insectoid_4arm',
  parts: {
    'head_1': { type: 'head', functions: ['sensory'] },
    'thorax_1': { type: 'thorax', functions: ['vital_organ'] },
    'arm_1': { type: 'arm', functions: ['manipulation'] },
    'arm_2': { type: 'arm', functions: ['manipulation'] },
    'arm_3': { type: 'arm', functions: ['manipulation'] },
    'arm_4': { type: 'arm', functions: ['manipulation'] },
    'leg_1': { type: 'leg', functions: ['locomotion'] },
    'leg_2': { type: 'leg', functions: ['locomotion'] }
  }
};
// Can equip: helmet (head), thorax plate (thorax), gloves (4x arm), boots (2x leg)

// Angel with wings
const angel: BodyComponent = {
  bodyPlanId: 'celestial_humanoid',
  parts: {
    'head_1': { type: 'head', functions: ['sensory'] },
    'torso_1': { type: 'torso', functions: ['vital_organ'] },
    'left_wing_1': { type: 'wing', functions: ['flight'] },
    'right_wing_1': { type: 'wing', functions: ['flight'] },
    'left_arm_1': { type: 'arm', functions: ['manipulation'] },
    'right_arm_1': { type: 'arm', functions: ['manipulation'] }
  }
};
// Can equip: helmet (head), chest armor (torso), wing guards (2x wing - MUST BE LIGHT),
//            gloves (2x arm) - NO LEGS (levitates)

// Tentacled alien
const cephaloid: BodyComponent = {
  bodyPlanId: 'cephaloid_tentacled',
  parts: {
    'head_1': { type: 'head', functions: ['sensory', 'vital_organ'] },
    'tentacle_1': { type: 'tentacle', functions: ['manipulation', 'locomotion'] },
    'tentacle_2': { type: 'tentacle', functions: ['manipulation', 'locomotion'] },
    'tentacle_3': { type: 'tentacle', functions: ['manipulation', 'locomotion'] },
    'tentacle_4': { type: 'tentacle', functions: ['manipulation', 'locomotion'] },
    'tentacle_5': { type: 'tentacle', functions: ['manipulation', 'locomotion'] },
    'tentacle_6': { type: 'tentacle', functions: ['manipulation', 'locomotion'] }
  }
};
// Can equip: head dome (head), tentacle wraps (6x tentacle)
// NO torso armor (soft body), tentacles serve as both hands AND legs
```

### Weight Restrictions for Flying Creatures

Flying creatures (those with `flight` function) have **strict weight limits**:

```typescript
interface WeightRestriction {
  // Total weight capacity based on body size
  maxTotalWeight: number;  // kg

  // Wings CANNOT support heavy armor
  wingArmorMaxWeight: number;  // Max 2kg per wing

  // Penalty for exceeding weight
  flightSpeedPenalty: number;  // % reduction per kg over limit
  cannotFlyAbove: number;      // kg threshold where flight becomes impossible
}

// Example: Angel weight restrictions
const angelWeightLimits: WeightRestriction = {
  maxTotalWeight: 15,        // 15kg total equipment
  wingArmorMaxWeight: 2,     // 2kg max per wing
  flightSpeedPenalty: 0.05,  // -5% speed per kg over
  cannotFlyAbove: 25         // Cannot fly if >25kg total weight
};
```

### Cultural Equipment Priorities

Different species prioritize different equipment based on their biology:

**Angels (flying humanoids):**
- **Wing protection > Head protection** - Wings are vital for flight and exposed
- Heavy helmet (2kg) causes more burden than wing guards (1.5kg × 2)
- Cultural norm: "A grounded angel is a dead angel"
- Angels develop sophisticated wing armor (mythril, enchanted feathers)
- Helmets are rare, considered cumbersome luxury

**Tentacled Cephaloids:**
- **Tentacle protection > All else** - Tentacles are hands AND feet
- Head dome protects brain but tentacles enable all actions
- Losing tentacle = losing hand + foot simultaneously
- Cultural focus: Flexible, non-restrictive armor that allows grasping

**Four-Armed Insectoids:**
- **Thorax protection > Head** - Thorax contains vital organs
- Four arms = need four gloves (expensive!)
- Chitin exoskeleton provides natural armor
- Prioritize protecting softer thorax/abdomen joints

```typescript
// Example: Angel equipment loadout (wings prioritized)
const angelCombatLoadout = {
  torso: 'leather_cuirass',      // 4kg - light armor
  left_wing: 'mythril_wing_guard',  // 1.5kg
  right_wing: 'mythril_wing_guard', // 1.5kg
  hands: 'silk_gloves',          // 0.4kg
  // NO HELMET - saves 2kg, keeps total at 7.4kg (well under 15kg limit)
  main_hand: 'mythril_spear'     // 2kg - lightweight weapon
};
// Total: 9.4kg (can still fly effectively)

// Bad angel loadout (helmet causes flight issues)
const angelBadLoadout = {
  head: 'steel_helmet',          // 2kg - TOO HEAVY
  torso: 'chainmail',            // 8kg - TOO HEAVY
  left_wing: null,               // EXPOSED - wings vulnerable!
  right_wing: null,
  main_hand: 'steel_sword'       // 3kg
};
// Total: 13kg but wings unprotected = angel will prioritize wings over helmet
// Wings exposed = cannot maneuver in combat = death
```

---

## Armor Classes

From `ArmorTrait.ts`:

```typescript
type ArmorClass = 'clothing' | 'light' | 'medium' | 'heavy';
```

### Armor Class Properties

| Class | Defense Range | Movement Penalty | Examples |
|-------|---------------|------------------|----------|
| **Clothing** | 0-2 | 0% | Robes, tunics, dresses, work clothes |
| **Light** | 3-8 | 0-10% | Leather, padded, gambeson |
| **Medium** | 9-15 | 10-20% | Chainmail, scale, brigandine |
| **Heavy** | 16-25 | 20-35% | Plate armor, full mail |

### Set Bonuses

Wearing a complete set of the same armor class and material provides bonuses:

```typescript
interface ArmorSetBonus {
  requiredSlots: ArmorSlot[];  // e.g., ['head', 'torso', 'legs']
  bonus: {
    defenseMultiplier?: number;      // 1.1 = +10% defense
    movementPenaltyReduction?: number; // 0.2 = -20% penalty
    resistanceBoost?: Partial<Record<DamageType, number>>;
    specialEffect?: string;           // "fire_resistance", "stealth_boost", etc.
  };
}
```

---

## Species-Specific Equipment Examples

Complete equipment setups for different body plans:

### Human Warrior (Balanced Armor)
```typescript
const humanWarrior = {
  species: 'human',
  bodyPlan: 'humanoid_standard',
  equipment: {
    head: 'iron_helmet',           // 2kg - Full protection
    torso: 'chainmail_hauberk',    // 8kg - Medium armor
    left_arm: 'leather_bracer',    // 1kg
    right_arm: 'leather_bracer',   // 1kg
    left_leg: 'chainmail_chausses', // 3kg
    right_leg: 'chainmail_chausses', // 3kg
    main_hand: 'longsword',        // 1.5kg
    off_hand: 'kite_shield',       // 4kg
  },
  totalWeight: 23.5,  // Heavy but humanoids can handle it
  notes: 'Balanced protection, no flight considerations'
};
```

### Angel Paladin (Wing Armor Priority)
```typescript
const angelPaladin = {
  species: 'angel',
  bodyPlan: 'celestial_humanoid',
  equipment: {
    // NO HELMET - Too heavy, wings need protection more
    torso: 'mythril_cuirass',      // 5kg - Lightweight metal
    left_wing: 'mythril_wing_guard', // 1.5kg - CRITICAL
    right_wing: 'mythril_wing_guard', // 1.5kg - CRITICAL
    left_arm: 'silk_sleeve',        // 0.3kg - Minimal
    right_arm: 'silk_sleeve',       // 0.3kg - Minimal
    main_hand: 'mythril_spear',     // 2kg - Light reach weapon
    // No off-hand - needs maneuverability
  },
  totalWeight: 10.6,  // Under 15kg flight limit
  flightCapable: true,
  notes: 'Wing protection > head protection. Grounded angel = dead angel.'
};
```

### Cephaloid Mage (Flexible Tentacle Armor)
```typescript
const cephaloidMage = {
  species: 'cephaloid',
  bodyPlan: 'cephaloid_tentacled',
  equipment: {
    head: 'crystal_dome',          // 2kg - Brain protection
    tentacle_1: 'scaled_wrap',     // 0.5kg
    tentacle_2: 'scaled_wrap',     // 0.5kg
    tentacle_3: 'scaled_wrap',     // 0.5kg
    tentacle_4: 'scaled_wrap',     // 0.5kg
    tentacle_5: 'scaled_wrap',     // 0.5kg
    tentacle_6: 'scaled_wrap',     // 0.5kg
    // No torso armor - soft body, restricts movement
    // No held weapons - uses magic + tentacles
  },
  totalWeight: 5.5,  // Very light and flexible
  notes: 'Tentacles are hands + feet + weapons. Must remain flexible.'
};
```

### Thrakeen Guard (Four-Armed Insectoid)
```typescript
const thrakeenGuard = {
  species: 'thrakeen',
  bodyPlan: 'insectoid_4arm',
  equipment: {
    head: 'chitin_helm',           // 1.5kg
    thorax: 'reinforced_thorax_plate', // 6kg - VITAL organs
    abdomen: 'chitin_bands',       // 2kg - Flexible joints
    arm_1: 'chitin_bracer',        // 0.8kg (upper left)
    arm_2: 'chitin_bracer',        // 0.8kg (upper right)
    arm_3: 'chitin_bracer',        // 0.8kg (lower left)
    arm_4: 'chitin_bracer',        // 0.8kg (lower right)
    leg_1: 'chitin_greaves',       // 1.5kg
    leg_2: 'chitin_greaves',       // 1.5kg
    main_hand: 'spear',            // 2kg (upper right)
    off_hand: 'tower_shield',      // 6kg (upper left)
    // Lower arms free for grappling
  },
  totalWeight: 24.7,  // Heavy but insectoid exoskeleton supports it
  notes: 'Four arms allow shield + spear + 2 free arms for grappling'
};
```

### Comparison Table

| Species | Head Armor | Torso Armor | Limb Count | Total Weight | Flight? | Priority |
|---------|-----------|-------------|------------|--------------|---------|----------|
| Human   | ✅ Heavy  | ✅ Heavy    | 4 limbs    | 23.5kg       | No      | Balanced |
| Angel   | ❌ None   | ⚠️  Light   | 4 (2 wings)| 10.6kg       | ✅ Yes  | Wings > Head |
| Cephaloid| ✅ Crystal| ❌ None     | 6 tentacles| 5.5kg        | No      | Tentacles > All |
| Thrakeen| ✅ Chitin | ✅ Heavy    | 6 limbs (4 arms) | 24.7kg | No      | Thorax > Head |

**Key Insight:** Different species have fundamentally different armor priorities based on their biology and lifestyle.

---

## Weapon Types

From `WeaponTrait.ts`:

```typescript
type DamageType =
  | 'slashing'   // Swords, axes
  | 'piercing'   // Spears, daggers, arrows
  | 'bludgeoning' // Hammers, maces, clubs
  | 'fire'       // Flaming weapons
  | 'frost'      // Ice weapons
  | 'lightning'  // Electric weapons
  | 'poison'     // Venomous weapons
  | 'magic';     // Enchanted damage
```

### Weapon Categories

```typescript
type WeaponCategory =
  | 'sword'      // Slashing, balanced
  | 'axe'        // Slashing, high damage
  | 'mace'       // Bludgeoning, armor-breaking
  | 'spear'      // Piercing, reach
  | 'dagger'     // Piercing, fast
  | 'bow'        // Piercing, ranged
  | 'crossbow'   // Piercing, ranged, slow
  | 'staff'      // Bludgeoning, magic focus
  | 'wand'       // Magic, ranged
  | 'fists';     // Unarmed (default)
```

### Example Weapon Definitions

```typescript
const weapons: ItemDefinition[] = [
  {
    id: 'wooden_club',
    name: 'Wooden Club',
    materialId: 'wood',
    traits: {
      weapon: {
        damage: 3,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 1.5,
        durabilityLoss: 0.02,
        twoHanded: false
      }
    }
  },
  {
    id: 'iron_greatsword',
    name: 'Iron Greatsword',
    materialId: 'iron',
    traits: {
      weapon: {
        damage: 15,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 0.7,
        durabilityLoss: 0.015,
        twoHanded: true,
        critChance: 0.08,
        critMultiplier: 2.0
      }
    }
  },
  {
    id: 'oak_bow',
    name: 'Oak Longbow',
    materialId: 'oak',
    traits: {
      weapon: {
        damage: 6,
        damageType: 'piercing',
        range: 10,  // tiles
        attackSpeed: 0.8,
        durabilityLoss: 0.005,
        twoHanded: true
      }
    }
  }
];
```

---

## Clothing System

Clothing provides minimal defense but significant social and thermal benefits.

### Clothing Properties

```typescript
interface ClothingTrait {
  // Social
  formalityLevel: number;        // 0-10 (0=rags, 10=royal robes)
  culturalStyle?: string;        // "medieval_european", "eastern", "tribal"
  socialClass?: SocialClass;     // Affects NPC reactions

  // Thermal (integrates with Temperature System)
  thermalInsulation: number;     // Cold resistance (0-1)
  breathability: number;         // Heat resistance (0-1)
  waterResistance: number;       // Rain/wet protection (0-1)

  // Appearance
  color?: string;
  pattern?: string;              // "striped", "checkered", "embroidered"
  condition: number;             // 0-1 (affects appearance and social value)
}

type SocialClass =
  | 'peasant'      // Work clothes, simple
  | 'common'       // Everyday wear
  | 'merchant'     // Nice but practical
  | 'noble'        // Fancy, decorative
  | 'royal';       // Extravagant, impractical
```

### Example Clothing Items

```typescript
const clothing: ItemDefinition[] = [
  {
    id: 'linen_tunic',
    name: 'Linen Tunic',
    materialId: 'linen',
    traits: {
      armor: {
        defense: 1,
        armorClass: 'clothing',
        slot: 'torso',
        durability: 1.0,
        movementPenalty: 0
      },
      clothing: {
        formalityLevel: 2,
        socialClass: 'peasant',
        thermalInsulation: 0.3,
        breathability: 0.8,
        waterResistance: 0.1,
        condition: 1.0
      }
    }
  },
  {
    id: 'silk_robe',
    name: 'Silk Robe',
    materialId: 'silk',
    traits: {
      armor: {
        defense: 0,
        armorClass: 'clothing',
        slot: 'torso',
        durability: 0.8,
        movementPenalty: 0
      },
      clothing: {
        formalityLevel: 9,
        socialClass: 'noble',
        thermalInsulation: 0.6,
        breathability: 0.9,
        waterResistance: 0.0,
        color: 'crimson',
        pattern: 'embroidered',
        condition: 1.0
      }
    }
  },
  {
    id: 'fur_cloak',
    name: 'Fur Cloak',
    materialId: 'fur',
    traits: {
      armor: {
        defense: 2,
        armorClass: 'clothing',
        slot: 'back',
        durability: 1.0,
        movementPenalty: 0.02
      },
      clothing: {
        formalityLevel: 5,
        socialClass: 'common',
        thermalInsulation: 0.9,  // Excellent cold protection
        breathability: 0.2,       // Poor heat ventilation
        waterResistance: 0.6,
        condition: 1.0
      }
    }
  }
];
```

---

## Equipment Component

**Dynamic slots based on BodyComponent** - slots are generated from body parts at runtime.

```typescript
interface EquipmentComponent {
  readonly type: 'equipment';

  // DYNAMIC: Maps body part IDs to equipped items
  // Key = body part ID (e.g., "left_wing_1", "tentacle_3")
  // Value = equipped item instance
  equipped: Record<string, ItemInstance>;

  // Derived slots for weapons/accessories (not body-part-specific)
  weapons: {
    mainHand?: ItemInstance;
    offHand?: ItemInstance;
  };
  accessories: {
    rings?: ItemInstance[];     // Max 2
    trinkets?: ItemInstance[];  // Max 1
  };

  // Quick-swap sets (stores item IDs)
  loadouts?: {
    combat?: Record<string, string>;   // bodyPartId -> itemId
    formal?: Record<string, string>;
    work?: Record<string, string>;
  };

  // Auto-equip preferences
  autoEquip: {
    weapons: boolean;
    armor: boolean;
    clothing: boolean;
  };

  // Weight tracking (important for flying creatures)
  totalWeight: number;  // kg
  canFly: boolean;      // False if weight > flight threshold
}

// Helper: Get available equipment slots for an entity
function getEquipmentSlots(body: BodyComponent): EquipmentSlot[] {
  const slots: EquipmentSlot[] = [];

  for (const [partId, part] of Object.entries(body.parts)) {
    // Each body part can potentially have armor
    slots.push({
      bodyPartId: partId,
      bodyPartType: part.type,
      bodyPartFunctions: part.functions,
      canEquip: true,  // Unless part is destroyed/missing
    });
  }

  // Add weapon slots (not tied to body parts)
  slots.push({ type: 'weapon', slot: 'main_hand' });
  slots.push({ type: 'weapon', slot: 'off_hand' });

  return slots;
}

interface EquipmentSlot {
  bodyPartId?: string;           // ID of body part (if body armor)
  bodyPartType?: BodyPartType;   // Type of body part
  bodyPartFunctions?: BodyPartFunction[];
  type?: 'weapon' | 'accessory'; // Non-body equipment
  slot?: string;                 // 'main_hand', 'ring_1', etc.
  canEquip: boolean;             // False if part destroyed
}
```

### Example: Dynamic Equipment Slots

```typescript
// Human: 2 arms, 2 legs, standard humanoid
const humanEquipment: EquipmentComponent = {
  type: 'equipment',
  equipped: {
    'head_1': helmets[0],
    'torso_1': leatherArmor,
    'left_arm_1': gloves[0],
    'right_arm_1': gloves[0],
    'left_leg_1': boots[0],
    'right_leg_1': boots[0],
  },
  weapons: {
    mainHand: ironSword,
    offHand: woodenShield,
  },
  accessories: {
    rings: [magicRing],
  },
  totalWeight: 12.5,
  canFly: false,  // No wings
};

// Angel: 2 wings, 2 arms, NO legs (levitates)
const angelEquipment: EquipmentComponent = {
  type: 'equipment',
  equipped: {
    // NO HELMET - saves weight for flight
    'torso_1': leatherCuirass,
    'left_wing_1': wingGuards[0],
    'right_wing_1': wingGuards[0],
    'left_arm_1': silkGloves[0],
    'right_arm_1': silkGloves[0],
  },
  weapons: {
    mainHand: mythrilSpear,
  },
  totalWeight: 9.4,
  canFly: true,  // Under 15kg limit
};

// Tentacled Cephaloid: 6 tentacles, 1 head
const cephaloidEquipment: EquipmentComponent = {
  type: 'equipment',
  equipped: {
    'head_1': headDome,
    'tentacle_1': tentacleWraps[0],
    'tentacle_2': tentacleWraps[0],
    'tentacle_3': tentacleWraps[0],
    'tentacle_4': tentacleWraps[0],
    'tentacle_5': tentacleWraps[0],
    'tentacle_6': tentacleWraps[0],
  },
  weapons: {
    // Cephaloids use tentacles as weapons - no held weapons
  },
  totalWeight: 5.5,
  canFly: false,
};

// 4-Armed Insectoid
const insectoidEquipment: EquipmentComponent = {
  type: 'equipment',
  equipped: {
    'head_1': chitinHelm,
    'thorax_1': thoraxPlate,
    'arm_1': gloves[0],
    'arm_2': gloves[0],
    'arm_3': gloves[0],  // Third arm!
    'arm_4': gloves[0],  // Fourth arm!
    'leg_1': boots[0],
    'leg_2': boots[0],
  },
  weapons: {
    mainHand: spear,
    offHand: shield,
    // Could dual-wield with 4 arms in future!
  },
  totalWeight: 18.0,
  canFly: false,
};
```

---

## Equipment System

**Handles dynamic body-based equipment** including validation, weight tracking, and flight restrictions.

```typescript
class EquipmentSystem implements System {
  priority = 15;  // After movement, before combat

  update(world: World) {
    const agents = world.query().with(CT.Equipment, CT.Body).executeEntities();

    for (const agent of agents) {
      const equipment = agent.getComponent('equipment');
      const body = agent.getComponent('body');

      // 1. Validate equipment (remove invalid items)
      this.validateEquipment(equipment, body);

      // 2. Update weight and flight capability
      this.updateWeightTracking(equipment, body);

      // 3. Update durability (combat damage, environmental wear)
      this.updateDurability(equipment);

      // 4. Calculate total defense, resistances
      this.cacheDefenseStats(equipment, agent);

      // 5. Apply set bonuses
      this.applySetBonuses(equipment);

      // 6. Check for broken equipment (durability <= 0)
      this.removebrokenEquipment(equipment);
    }
  }

  /**
   * Validate that equipped items target valid body parts.
   * Remove items if body part is destroyed or missing.
   */
  private validateEquipment(equipment: EquipmentComponent, body: BodyComponent) {
    for (const [bodyPartId, item] of Object.entries(equipment.equipped)) {
      const bodyPart = body.parts[bodyPartId];

      // Remove if body part doesn't exist (destroyed, severed, etc.)
      if (!bodyPart) {
        delete equipment.equipped[bodyPartId];
        continue;
      }

      // Check if item can be equipped on this body part
      if (item.traits.armor) {
        const target = item.traits.armor.target;

        // Validate by body part type
        if (target.bodyPartType && bodyPart.type !== target.bodyPartType) {
          throw new Error(
            `Cannot equip ${item.name} (targets ${target.bodyPartType}) on ${bodyPart.type}`
          );
        }

        // Validate by body part function
        if (target.bodyPartFunction) {
          if (!bodyPart.functions.includes(target.bodyPartFunction)) {
            throw new Error(
              `Cannot equip ${item.name} (requires ${target.bodyPartFunction} function) on part without that function`
            );
          }
        }

        // Validate weight restriction (flying creatures)
        if (target.maxWeight && item.traits.armor.weight > target.maxWeight) {
          throw new Error(
            `${item.name} (${item.traits.armor.weight}kg) exceeds weight limit (${target.maxWeight}kg) for ${bodyPart.type}`
          );
        }
      }
    }
  }

  /**
   * Update total weight and determine if agent can fly.
   */
  private updateWeightTracking(equipment: EquipmentComponent, body: BodyComponent) {
    let totalWeight = 0;

    // Sum weight of all equipped items
    for (const item of Object.values(equipment.equipped)) {
      totalWeight += item.traits.armor?.weight ?? 0;
    }

    // Add weapons
    totalWeight += equipment.weapons.mainHand?.traits.weapon?.weight ?? 0;
    totalWeight += equipment.weapons.offHand?.traits.weapon?.weight ?? 0;

    equipment.totalWeight = totalWeight;

    // Check if can fly (if has wings)
    const hasWings = Object.values(body.parts).some(p =>
      p.functions.includes('flight')
    );

    if (hasWings) {
      // Get weight restriction based on body size
      const maxWeight = this.getMaxFlightWeight(body.size);
      equipment.canFly = totalWeight <= maxWeight;
    } else {
      equipment.canFly = false;
    }
  }

  private getMaxFlightWeight(size: SizeCategory): number {
    const weightLimits: Record<SizeCategory, number> = {
      tiny: 2,
      small: 8,
      medium: 15,   // Angels
      large: 30,
      huge: 60,
      colossal: 120,
    };
    return weightLimits[size];
  }

  private calculateTotalDefense(agent: Entity): number {
    const equipment = agent.getComponent('equipment');
    let totalDefense = 0;

    for (const item of Object.values(equipment.equipped)) {
      if (item.traits.armor) {
        totalDefense += item.traits.armor.defense;
      }
    }

    // Apply set bonuses
    const setBonus = this.checkSetBonus(equipment);
    if (setBonus) {
      totalDefense *= setBonus.defenseMultiplier ?? 1.0;
    }

    return totalDefense;
  }

  private checkSetBonus(equipment: EquipmentComponent): ArmorSetBonus | null {
    // Check if wearing complete set of same material/class
    const materials = new Set<string>();
    const classes = new Set<ArmorClass>();

    for (const item of Object.values(equipment.equipped)) {
      if (item.traits.armor) {
        materials.add(item.materialId);
        classes.add(item.traits.armor.armorClass);
      }
    }

    // Set bonus requires single material AND single class
    if (materials.size === 1 && classes.size === 1) {
      const slotsEquipped = Object.keys(equipment.equipped).length;
      if (slotsEquipped >= 3) {  // At least 3 pieces
        return this.getSetBonusForMaterial([...materials][0]!);
      }
    }

    return null;
  }
}
```

---

## Combat Integration

Equipment modifies combat calculations from `conflict-system/spec.md`:

```typescript
interface AgentCombat {
  // From conflict-system/spec.md
  attackerWeapon?: Weapon;  // Now uses WeaponTrait
  defenderWeapon?: Weapon;
  attackerArmor?: Armor;    // Now uses ArmorTrait
  defenderArmor?: Armor;

  // ... rest of combat data
}

// Combat damage calculation
function calculateDamage(
  attacker: Entity,
  defender: Entity,
  weapon: ItemInstance | null
): number {
  // Base damage from weapon
  const baseDamage = weapon?.traits.weapon?.damage ?? 2; // Unarmed = 2
  const damageType = weapon?.traits.weapon?.damageType ?? 'bludgeoning';

  // Defender's total defense
  const equipment = defender.getComponent('equipment');
  let defense = 0;
  let resistance = 0;

  for (const item of Object.values(equipment.equipped)) {
    if (item.traits.armor) {
      defense += item.traits.armor.defense;
      resistance += item.traits.armor.resistances?.[damageType] ?? 0;
    }
  }

  // Calculate final damage
  const reducedDamage = Math.max(0, baseDamage - defense);
  const finalDamage = reducedDamage * (1 - resistance);

  return Math.max(1, Math.floor(finalDamage)); // Minimum 1 damage
}
```

---

## Temperature Integration

Clothing affects agent comfort in extreme weather:

```typescript
// From Temperature System
function calculateTemperatureModifier(agent: Entity): number {
  const equipment = agent.getComponent('equipment');
  const weather = world.getSingleton('weather');

  let insulation = 0;
  let breathability = 0;

  for (const item of Object.values(equipment.equipped)) {
    if (item.traits.clothing) {
      insulation += item.traits.clothing.thermalInsulation;
      breathability += item.traits.clothing.breathability;
    }
  }

  if (weather.temperature < 10) {
    // Cold weather - insulation helps
    return insulation * 5; // +5°C per 1.0 insulation
  } else if (weather.temperature > 30) {
    // Hot weather - breathability helps
    return -(breathability * 5); // -5°C per 1.0 breathability
  }

  return 0;
}
```

---

## Crafting Integration

Equipment is crafted using existing crafting system + materials:

```typescript
interface EquipmentRecipe extends Recipe {
  materialCategory: MaterialCategory; // 'metal', 'leather', 'cloth'

  // Recipe adapts to material chosen
  qualityFactors: {
    materialHardness?: number;    // For weapons/armor
    materialDurability?: number;  // For all equipment
    crafterSkill: number;         // Crafting skill level
  };
}

// Example: Sword recipe
const swordRecipe: EquipmentRecipe = {
  id: 'sword',
  name: 'Sword',
  materialCategory: 'metal',
  inputs: [
    { material: 'metal', quantity: 2 },  // Any metal
    { item: 'wood', quantity: 1 }        // Handle
  ],
  output: {
    itemId: 'sword',
    traits: {
      weapon: {
        damage: 8,  // Base, modified by material
        damageType: 'slashing',
        range: 1,
        attackSpeed: 1.2,
        durabilityLoss: 0.01
      }
    }
  },
  craftingStation: 'forge',
  craftingTime: 120, // ticks
  skillRequired: 3
};

// When crafted with iron (hardness: 7):
// damage = 8 + (7 * 0.5) = 11.5 → 12 damage

// When crafted with steel (hardness: 9):
// damage = 8 + (9 * 0.5) = 12.5 → 13 damage
```

---

## Actions

### Equip Action

```typescript
interface EquipAction extends Action {
  type: 'equip';
  agentId: string;
  itemId: string;
  slot: EquipmentSlot;

  // Auto-unequip conflicting items
  autoUnequip: boolean;  // Default: true
}
```

### Unequip Action

```typescript
interface UnequipAction extends Action {
  type: 'unequip';
  agentId: string;
  slot: EquipmentSlot;
}
```

### Repair Action

```typescript
interface RepairAction extends Action {
  type: 'repair';
  agentId: string;
  itemId: string;
  materialsUsed: Array<{ materialId: string; quantity: number }>;

  // Repairs item durability
  durabilityRestored: number;  // 0-1
}
```

---

## Equipment Durability

Equipment degrades over time and use:

```typescript
interface DurabilityDamage {
  combat: number;      // Per attack/hit
  environmental: number; // Per day/exposure
  use: number;         // Per action (tools)
}

// Durability affects performance
function getEffectiveDamage(weapon: ItemInstance): number {
  const baseDamage = weapon.traits.weapon.damage;
  const condition = weapon.durability ?? 1.0;

  // Linear degradation: 50% durability = 75% damage
  const effectiveness = 0.5 + (condition * 0.5);
  return Math.floor(baseDamage * effectiveness);
}

// Broken equipment
if (item.durability <= 0) {
  // Item is broken, cannot be used
  // Can be repaired or scrapped for materials
}
```

---

## Social Effects

Clothing affects agent interactions:

```typescript
interface SocialModifiers {
  // From equipped clothing
  charismaBonus: number;      // Formal wear
  intimidationBonus: number;  // Heavy armor, weapons
  stealthPenalty: number;     // Noisy armor

  // NPCs react differently
  merchantDiscount: number;   // Nice clothes get better prices
  guardSuspicion: number;     // Weapons/armor raises suspicion
  nobleFavor: number;         // Formal wear grants access
}
```

---

## Future Considerations

1. **Enchantments** - Phase 30 (Magic System) integration
2. **Weapon Skill Trees** - Unlock special attacks per weapon type
3. **Armor Upgrades** - Add studs, padding, enchantments
4. **Clothing Customization** - Dyes, patterns, emblems
5. **Equipment Degradation Realism** - Rust, moth damage, stretching
6. **Legendary Items** - Unique named equipment with history
7. **Cursed Equipment** - Cannot unequip, negative effects
8. **Item Transmogrification** - Cosmetic overrides

---

## Implementation Files

### Core
- `packages/core/src/components/EquipmentComponent.ts` - NEW
- `packages/core/src/systems/EquipmentSystem.ts` - NEW
- `packages/core/src/actions/EquipActions.ts` - NEW (equip/unequip/repair)

### Updates to Existing (Phase 29)
- `packages/core/src/items/traits/ArmorTrait.ts` - **UPDATE REQUIRED**
  - Replace `slot: ArmorSlot` with `target: EquipmentTarget`
  - Add `weight: number` field
  - Add optional `flightSpeedPenalty?: number`
- `packages/core/src/items/traits/WeaponTrait.ts` ✅ (no changes needed)
- `packages/core/src/items/traits/ClothingTrait.ts` - NEW
- `packages/core/src/materials/MaterialTemplate.ts` ✅ (no changes needed)
- `packages/core/src/items/ItemInstance.ts` ✅ (no changes needed)

### Equipment Definitions
- `packages/core/src/items/equipment/weapons.ts` - NEW
- `packages/core/src/items/equipment/armor.ts` - NEW
- `packages/core/src/items/equipment/clothing.ts` - NEW

### Tests
- `packages/core/src/__tests__/EquipmentSystem.test.ts` - NEW
- `packages/core/src/__tests__/EquipmentCombat.test.ts` - NEW
- `packages/core/src/__tests__/EquipmentTemperature.test.ts` - NEW

---

## Success Criteria

- [ ] EquipmentComponent tracks equipped items per slot
- [ ] EquipmentSystem calculates total defense, resistances
- [ ] WeaponTrait and ArmorTrait integrate with combat system
- [ ] ClothingTrait affects temperature comfort
- [ ] Set bonuses apply when wearing matching sets
- [ ] Equipment durability degrades and affects performance
- [ ] Crafting recipes produce equipment with material-based properties
- [ ] Social interactions affected by clothing formality
- [ ] Repair action restores durability
- [ ] Equipment UI shows equipped items and stats
