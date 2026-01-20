# Building Summoning & Portal Creation System

**Status**: ✅ Implemented
**Date**: 2026-01-19
**Integration**: Dimensional Magic Paradigm

## Overview

A comprehensive magical system for conjuring dimensional buildings and creating portals/rifts through dimensional magic. Integrated with the existing dimensional magic paradigm (Gravity Falls, Dark Forest, Flatland inspired).

## Components Created

### 1. Dev Tools (`packages/core/src/admin/capabilities/dimensional-dev-tools.ts`)

Admin capability providing:
- **Queries**:
  - `list_dimensional_buildings` - Get all dimensional buildings by tier
- **Actions**:
  - `spawn_dimensional_building` - Instantly create buildings at coordinates
  - `spawn_dimensional_rift` - Create portals between dimensional states
  - `grant_dimensional_magic` - Give agents dimensional magic abilities

**Browser Console API**:
```javascript
// Spawn buildings
dimensional.spawnBuilding('tesseract_research_lab_01', 100, 50)

// Create rifts
dimensional.spawnRift(200, 50, 4)  // 3D→4D rift

// List available buildings
dimensional.listBuildings()

// Grant magic to agent
dimensional.grantMagic('agent-id', 50)  // 50 power level
```

### 2. Building Summoning Spells (`packages/magic/src/spells/BuildingSummoningSpells.ts`)

8 spells across 5 tiers:

#### Tier 1: Novice (3D)
- **Conjure Shelter** - Basic wooden shelter (30 mana, 5 sanity)

#### Tier 2: Apprentice (3D Multi-Floor)
- **Conjure Tower** - Multi-story stone tower (80 mana, 15 sanity, 10 stone)

#### Tier 3: Journeyman (4D Tesseracts)
- **Fold Tesseract** - 4D hypercube lab (150 mana, 40 sanity, Clarke Tech Tier 7)
  - Requires full 4D perception
  - Creates dimensional awareness aura
  - 10% chance of unstable rift

#### Tier 4: Master (5D/Realm Pockets)
- **Weave Penteract** - 5D phase-shifting temple (250 mana, 70 sanity)
  - Time dilation field (0.5x speed)
  - Requires transcendent perception
  - 20% phase lock risk, 5% temporal rift risk

- **Weave Pocket Realm** - TARDIS-like building (200 mana, 50 sanity)
  - 5x5 exterior, 21x21 interior
  - 10x time dilation inside
  - Clarke Tech Tier 6 (Post-Scarcity)

#### Tier 5: Grandmaster (6D Quantum)
- **Collapse Hexeract** - 6D quantum structure (400 mana, 100 sanity)
  - Superposition aura (multiple realities)
  - 30% chance attracts Bill Cipher
  - Requires paradox + void paradigms
  - Clarke Tech Tier 8 (Multiversal)

#### Portal Spells
- **Tear Dimensional Rift** - Create 3D→4D portal (100 mana, 30 sanity, 30s duration)
  - Journeyman tier
  - 20% unstable rift risk

### 3. Building Summoning System (`packages/core/src/systems/BuildingSummoningSystem.ts`)

System that processes spell cast events:
- Handles `summon_building` effects
- Handles `create_dimensional_rift` effects
- Creates building entities with proper components
- Adds dimensional markers for 4D/5D/6D buildings
- Emits visual effects and events

**Priority**: 150 (after magic casting, before rendering)

## Spell Cost Structure

```typescript
{
  mana: number;           // Energy cost
  sanity: number;         // Mental strain
  realityStability?: number;  // Tears in reality
  materials?: Array<{     // Physical anchors
    resourceId: string;
    amount: number;
  }>;
}
```

## Requirements

Spells check:
- **Power Level**: 10 (novice) to 95 (grandmaster)
- **Paradigms**: dimension (+ time/paradox/void for advanced)
- **Perception**: native → transcendent
- **Clarke Tech Tier**: 6-8 for advanced buildings

## Risks

Higher-tier spells have failure modes:
- **Rift Creation**: Unstable rifts attract other rifts
- **Phase Lock**: 5D buildings stuck in one phase state
- **Temporal Rift**: Time distortion spreads
- **Dimensional Collapse**: Catastrophic reality failure
- **Observer Paradox**: Caster sees all quantum states
- **Attention Gained**: Extradimensional entities notice

## Integration Points

### 1. Magic System
- Exported from `@ai-village/magic`:
  ```typescript
  import { BUILDING_SUMMONING_SPELLS, BUILDING_SPELLS_BY_TIER } from '@ai-village/magic';
  ```

### 2. Admin Dashboard
- Accessible at `/admin` under "Dimensional Dev Tools"
- Query endpoint: `/admin/queries/list_dimensional_buildings`
- Action endpoints:
  - `/admin/actions/spawn_dimensional_building`
  - `/admin/actions/spawn_dimensional_rift`
  - `/admin/actions/grant_dimensional_magic`

### 3. Game Systems
- `BuildingSummoningSystem` processes spell casts
- Must be registered in system initialization
- Responds to `spell_cast` events with `summon_building` or `create_dimensional_rift` effects

### 4. Dimensional Paradigm
- Updated lore text in `DimensionalParadigms.ts` to mention building summoning
- Powers integrated with existing dimensional perception system

## Testing

### Browser Console Tests

Load the test script:
```typescript
// Available in tools/llm-building-designer/test-summoning.ts
testSummoning()              // Run full test sequence
testSpawnBuilding(id, x, y)  // Spawn specific building
testSpawnRift(x, y, dim)     // Create dimensional rift
testListBuildings()          // List all dimensional buildings
```

### Manual Testing Sequence

1. **List Buildings**:
   ```javascript
   dimensional.listBuildings()
   ```
   - Should show buildings by dimension (3D, 4D, 5D, 6D, Realm Pockets)

2. **Spawn 3D Shelter**:
   ```javascript
   dimensional.spawnBuilding('simple_shelter', 50, 50)
   ```
   - Should create building entity at (50, 50)
   - Check for sprite rendering

3. **Spawn 4D Tesseract**:
   ```javascript
   dimensional.spawnBuilding('tesseract_research_lab_01', 100, 50)
   ```
   - Should have `dimensional: { dimension: 4 }`
   - Check for `magical_construct` component

4. **Create Rift**:
   ```javascript
   dimensional.spawnRift(200, 50, 4)
   ```
   - Should create `dimensional_rift` entity
   - Check for particle emitter

5. **Grant Magic**:
   ```javascript
   // Find an agent first
   dimensional.grantMagic('agent-uuid', 50)
   ```
   - Agent gains `dimensional_magic` component
   - Check `dimensionalPerception` update

## File Locations

```
packages/
├── core/
│   ├── src/
│   │   ├── admin/capabilities/
│   │   │   └── dimensional-dev-tools.ts      ✅ NEW
│   │   └── systems/
│   │       └── BuildingSummoningSystem.ts    ✅ NEW
│   └── dist/                                 ✅ COMPILED
│
├── magic/
│   ├── src/
│   │   ├── spells/
│   │   │   └── BuildingSummoningSpells.ts    ✅ NEW
│   │   ├── DimensionalParadigms.ts           ✅ UPDATED
│   │   └── index.ts                          ✅ UPDATED
│   └── dist/                                 ✅ COMPILED
│
└── tools/
    └── llm-building-designer/
        ├── BUILDING_SUMMONING_SYSTEM.md      ✅ NEW (this file)
        └── test-summoning.ts                 ✅ NEW
```

## Example Usage

### Spell Progression

1. **Level 10 Mage** (Novice):
   ```typescript
   // Can summon basic 3D shelter
   castSpell('conjure_shelter', { x: 50, y: 50 })
   // Cost: 30 mana, 5 sanity
   ```

2. **Level 60 Mage** (Journeyman):
   ```typescript
   // Can summon 4D tesseract
   castSpell('fold_tesseract', { x: 100, y: 50 })
   // Cost: 150 mana, 40 sanity, 10 reality stability
   // Requires: full 4D perception, Clarke Tech Tier 7
   ```

3. **Level 95 Mage** (Grandmaster):
   ```typescript
   // Can summon 6D quantum structure
   castSpell('collapse_hexeract', { x: 150, y: 50 })
   // Cost: 400 mana, 100 sanity, 50 reality stability
   // Requires: transcendent perception, paradox+void paradigms
   // Warning: 30% chance Bill Cipher notices
   ```

## Lore Integration

From `DimensionalParadigms.ts`:

> **Building Summoning**: Advanced mages can conjure shelters (Tier 1), towers (Tier 2),
> tesseracts (Tier 3), penteracts (Tier 4), and hexeracts (Tier 5). Realm pockets create
> spaces bigger on the inside. These structures are folded from geometry itself.

## Future Enhancements

1. **Spell Casting UI**: Visual spell selection and targeting
2. **Building Duration**: Temporary vs permanent summoned structures
3. **Dispelling**: Counter-spells to remove summoned buildings
4. **Rift Interactions**: Entities passing through rifts
5. **Corruption Effects**: Reality instability from overuse
6. **Bill Cipher Events**: Extradimensional entity encounters
7. **Realm Pocket Interiors**: Actual explorable bigger-inside spaces
8. **Phase Transitions**: 5D buildings changing states
9. **Quantum Collapse**: Observing 6D structures

## Technical Notes

- **No TypeScript Errors**: All files compile cleanly
- **HMR Compatible**: Changes hot-reload in dev mode
- **Event-Driven**: System responds to spell cast events
- **Modular**: Dev tools, spells, and system are independent
- **Type-Safe**: Full TypeScript definitions
- **Conservation of Game Matter**: Buildings are preserved, not destroyed

## Credits

**Inspired by**:
- Minecraft Creative Mode (instant building)
- The Sims Build Mode (construction without resources)
- Dwarf Fortress (complex multi-floor structures)
- Gravity Falls (dimensional rifts, Bill Cipher)
- Dark Forest (dimensional collapse weapons)
- Flatland (dimensional perception)
- Doctor Who (TARDIS realm pockets)
- Interstellar (tesseract navigation)

## Status Checklist

- [x] `dimensional-dev-tools.ts` capability created
- [x] `BuildingSummoningSpells.ts` created (8 spells, 5 tiers)
- [x] `BuildingSummoningSystem.ts` created
- [x] Spells registered in magic package exports
- [x] Dev tools accessible via browser console
- [x] System registered in core exports
- [x] Test script created (`test-summoning.ts`)
- [x] No TypeScript errors
- [x] All files compiled successfully
- [x] Integration with dimensional paradigm complete
- [x] Documentation complete

**Next Steps**: UI integration, spell progression system, player testing
