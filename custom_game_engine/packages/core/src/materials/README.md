# Materials System

Dwarf Fortress-style material definitions for items, crafting, and magic interactions.

## Overview

Materials define physical, thermal, and magical properties that items inherit. Enables material-aware crafting, enchantments, degradation, and physics simulation.

**Key Components:**
- `MaterialTemplate`: Material definitions with properties (density, hardness, magic affinity)
- `MaterialRegistry`: Singleton registry for material templates
- `defaultMaterials.ts`: 17 built-in materials (metals, woods, stone, leather, cloth, organic, ceramic, glass)

## Material Categories

**Categories** (for recipe matching):
- `metal` - Iron, copper, gold, steel
- `wood` - Oak, pine, ebony
- `stone` - Granite, marble
- `cloth` / `leather` - Silk, leather
- `organic` - Bone, organic matter
- `ceramic` / `glass`
- `magical` - Materials with inherent magic (gold, ebony, silk)
- `liquid` / `gas` / `gem` / `bone` / `crystal` (defined, not yet used)

## Properties

**Physical**: `density`, `hardness`, `flexibility`, `brittleness`

**Thermal**: `meltingPoint`, `boilingPoint`, `ignitePoint`, `heatConductivity`, `specificHeat`

**Magic**: `magicAffinity` (0-100), `resonantForms` (spell types material amplifies), `resistantForms` (spell types material resists), `corruptionResistance`

**Crafting**: `valueMultiplier`, `craftingDifficulty`, `requiredTools`, `requiredStation`

**Degradation**: `canRust`, `rustRate`, `canRot`, `rotRate`, `waterSensitive`

**Combat**: `damageBonus`, `defenseBonus`, `durabilityMultiplier`

**Visual**: `color`, `texture`, `emitsLight`, `lightIntensity`

## Usage

```typescript
import { materialRegistry, registerDefaultMaterials } from '@ai-village/core';

// Initialize (call at startup)
registerDefaultMaterials();

// Query materials
const iron = materialRegistry.get('iron');
const metals = materialRegistry.getByCategory('metal');

// Use in items (forward-compatibility for Phase 29)
const sword = {
  material: 'iron',
  damage: baseDamage * iron.hardness / 100,
  value: baseValue * iron.valueMultiplier
};
```

## Magic Forms

Extended `MagicForm` types for material interactions: `transmutation`, `enchantment`, `nature`, `growth`, `shadow`, `protection`, `necromancy`.

Materials with `resonantForms` amplify those spell types. Materials with `resistantForms` resist them.

## Error Handling

Registry throws on invalid operations (no fallbacks):
- `get(id)` throws if material doesn't exist
- `register()` throws if ID already registered
