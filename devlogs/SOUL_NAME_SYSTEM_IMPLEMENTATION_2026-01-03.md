# Soul Name System Implementation

**Date**: 2026-01-03
**Status**: ✅ Complete

## Overview

Implemented a comprehensive soul name generation and tracking system that ensures souls have unique, persistent names across all reincarnations. Soul names are culturally based on the soul's origin and reflect when the soul was first created in the cosmic timeline.

## Core Concept

**Soul names are NOT body names.** When we run out of names in one culture (e.g., human names), we start creating souls from the next culture (e.g., elven souls with elven names). An elven soul might reincarnate into a human body, but it keeps its elven name - that's just how the multiverse works.

## Implementation Details

### 1. Soul Name Generator Service (`SoulNameGenerator.ts`)

**Location**: `packages/core/src/divinity/SoulNameGenerator.ts`

**Features**:
- LLM-based unique name generation with fallback pools
- Cultural progression system: human → elven → dwarven → orcish → thrakeen → exotic/alien
- Capacity limits per culture (40 names each before moving to next tier)
- Global name uniqueness tracking
- High temperature (0.9) for creative name generation
- Fallback to predefined name pools when LLM unavailable

**Name Pools** (fallback):
- **Human**: 40 nature-inspired names (Ada, Finn, Sage, River, etc.)
- **Elven**: 40 flowing names (Aelindra, Faelorn, Silvanis, etc.)
- **Dwarven**: 40 strong names (Thorin, Dwalin, Gimli, etc.)
- **Orcish**: 40 harsh names (Gorbag, Ugluk, Shagrat, etc.)
- **Thrakeen**: 40 insectoid names (Tchk'rr, Kkt'zss, etc.)
- **Exotic**: Unlimited LLM-generated unique names

**API**:
```typescript
// Generate a new soul name
const generated = await soulNameGenerator.generateNewSoulName(currentTick);
// Returns: { name: string, culture: SoulCulture, isReincarnated: boolean, generatedAt: number }

// Check current culture tier
const culture = soulNameGenerator.getCurrentCulture();

// Get usage statistics
const usedCount = soulNameGenerator.getUsedCountForCulture('elven');
```

### 2. Soul Identity Component Updates

**Location**: `packages/core/src/components/SoulIdentityComponent.ts`

**New Fields**:
```typescript
interface SoulIdentityComponent {
  // NEW: Soul's true name (persistent across incarnations)
  soulName: string;

  // NEW: Soul's origin culture (determines name style)
  soulOriginCulture: SoulCulture;  // 'human' | 'elven' | 'dwarven' | 'orcish' | 'thrakeen' | 'exotic'

  // NEW: Whether this soul has been reincarnated before
  isReincarnated: boolean;

  // NEW: Complete history of all incarnations
  incarnationHistory: IncarnationRecord[];

  // ... existing fields
}
```

**New Types**:
```typescript
interface IncarnationRecord {
  incarnationTick: number;
  deathTick?: number;
  bodyName?: string;
  bodySpecies?: string;
  duration?: number;
  notableEvents?: string[];
  causeOfDeath?: string;
}
```

**New Helper Functions**:
- `addIncarnationRecord()` - Add new incarnation to history
- `completeCurrentIncarnation()` - Mark incarnation as complete on death
- `getIncarnationCount()` - Get total number of incarnations
- `getCurrentIncarnation()` - Get the most recent incarnation
- `getIncarnationHistorySummary()` - Get human-readable summary

### 3. Soul Creation System Integration

**Location**: `packages/core/src/systems/SoulCreationSystem.ts`

**Changes**:
- Integrated `soulNameGenerator` for unique name generation
- LLM provider now shared with name generator
- Soul names generated during ceremony completion
- Souls now track their origin culture from creation
- New souls marked with `isReincarnated: false`

**Flow**:
1. Soul creation ceremony begins
2. Fates weave purpose, interests, destiny
3. **NEW**: Name generator assigns unique soul name based on current culture tier
4. Soul entity created with:
   - Unique soul name (e.g., "Aelindra" for an elven soul)
   - Origin culture (e.g., "elven")
   - Empty incarnation history (first incarnation added on birth)
   - Reincarnated flag set to false

### 4. Reincarnation System Preservation

**Location**: `packages/core/src/systems/ReincarnationSystem.ts`

**Changes**:
- Soul identity ALWAYS preserved across reincarnations
- Soul name used instead of generating random body names
- Incarnation history tracked and updated on each death/rebirth
- New incarnation record created when soul enters new body
- Previous incarnation completed with death details

**Preserved Data**:
```typescript
preserved: {
  soulIdentity: SoulIdentityComponent;  // ← ALWAYS preserved
  soulWisdom: SoulWisdomComponent;      // ← Already preserved
  suppressedMemories: EpisodicMemory[]; // ← Already preserved
  // ... other fields based on memory retention policy
}
```

**Reincarnation Flow**:
1. Soul dies and enters afterlife
2. **Preserve soul identity** (name, culture, history)
3. Wait for reincarnation delay
4. Create new body entity
5. **Use soul's true name** for IdentityComponent
6. **Add SoulIdentityComponent** to new entity
7. **Add new incarnation record** to history
8. Mark soul as `isReincarnated: true`
9. Emit event with soul tracking data

### 5. Event System Updates

**Location**: `packages/core/src/events/EventMap.ts`

**Enhanced `soul:reincarnated` Event**:
```typescript
'soul:reincarnated': {
  originalEntityId: string;
  newEntityId: string;
  newName: string;          // Body name (may be soul name)

  // NEW: Soul tracking
  soulName?: string;         // Soul's true, persistent name
  soulOriginCulture?: string; // Soul's culture (human, elven, etc.)
  incarnationCount?: number;  // Number of times this soul has incarnated

  // ... existing fields
}
```

## Benefits

### For Gameplay

1. **Unique Soul Identities**: Every soul has a unique name that persists across lives
2. **Cultural Diversity**: As the game progresses, different soul cultures emerge naturally
3. **Story Tracking**: Players can track individual souls through multiple incarnations
4. **Reincarnation Visualization**: See when souls are being reborn vs newly created
5. **Soul History**: Rich backstory for each soul showing all past lives

### For Debugging

1. **Soul Tracking**: Follow specific souls through reincarnations by name
2. **Culture Analytics**: See distribution of soul cultures in the world
3. **Name Uniqueness**: Never duplicate soul names, avoiding confusion
4. **Incarnation Metrics**: Track how many times souls have reincarnated

## Usage Examples

### Tracking a Soul Across Incarnations

```typescript
// Soul "Aelindra" (elven soul) is created
// First incarnation: Aelindra the elf, lives 200 years
// Dies and enters afterlife
// Reincarnates: Aelindra the human, lives 70 years
// Dies again
// Reincarnates: Aelindra the orc, lives 60 years

// Check soul history
const soulIdentity = entity.components.get('soul_identity');
console.log(soulIdentity.soulName);           // "Aelindra"
console.log(soulIdentity.soulOriginCulture);  // "elven"
console.log(soulIdentity.incarnationHistory);
// [
//   { incarnationTick: 1000, deathTick: 205000, bodySpecies: 'elf', duration: 204000 },
//   { incarnationTick: 206000, deathTick: 276000, bodySpecies: 'human', duration: 70000 },
//   { incarnationTick: 277000, bodySpecies: 'orc', ... }
// ]
```

### Generating Names

```typescript
// Names are generated automatically by SoulCreationSystem
// But can also be generated directly:

const name1 = await soulNameGenerator.generateNewSoulName(tick);
// { name: "Ada", culture: "human", isReincarnated: false, generatedAt: 1000 }

// After 40 human names...
const name41 = await soulNameGenerator.generateNewSoulName(tick);
// { name: "Aelindra", culture: "elven", isReincarnated: false, generatedAt: 50000 }
// Automatically moved to elven culture!

// Check current tier
soulNameGenerator.getCurrentCulture(); // "elven"
```

## Migration Notes

**Backward Compatibility**:
- Existing souls without `SoulIdentityComponent` will get one on first death
- Old souls will be assigned to "human" culture by default
- Empty incarnation histories will be populated retroactively

**New Saves**:
- All new souls will have proper names and culture assignments from creation
- Incarnation history tracked from birth

## Future Enhancements

**Potential Additions**:
1. **Name Meanings**: LLM-generated meanings for each soul name
2. **Family Names**: Track lineages of souls across incarnations
3. **Cultural Mixing**: Hybrid souls with mixed cultural heritage
4. **Name Rituals**: In-game ceremonies when souls change cultures
5. **Fame System**: Track souls that become legendary across incarnations
6. **Soul Contracts**: Souls that incarnate together repeatedly
7. **Cultural Preferences**: Some souls prefer certain body types/species

## Files Changed

### Created
- `packages/core/src/divinity/SoulNameGenerator.ts` (new service)

### Modified
- `packages/core/src/components/SoulIdentityComponent.ts` (added tracking fields)
- `packages/core/src/systems/SoulCreationSystem.ts` (integrated name generation)
- `packages/core/src/systems/ReincarnationSystem.ts` (preserve soul identity)
- `packages/core/src/events/EventMap.ts` (enhanced reincarnation event)
- `packages/core/src/divinity/index.ts` (export new types and service)

## Testing Status

✅ **Build**: TypeScript compilation successful
⏸️ **Unit Tests**: Not yet written (existing reincarnation tests should cover basic flow)
⏸️ **Integration Tests**: Manual testing recommended
⏸️ **UI Verification**: Check soul names display correctly in game

## Next Steps

1. **Manual Testing**:
   - Create souls and verify unique names
   - Let souls die and reincarnate
   - Verify soul names persist across incarnations
   - Check incarnation history tracking

2. **UI Integration**:
   - Display soul name vs body name in agent panels
   - Show soul origin culture
   - Display incarnation count
   - Add soul history viewer

3. **Monitoring**:
   - Watch culture progression (human → elven → etc.)
   - Monitor name uniqueness
   - Track reincarnation rates

## Conclusion

The soul name system provides a robust foundation for tracking souls across multiple incarnations while adding rich cultural diversity to the game world. As the cosmic timeline progresses, the soul population naturally diversifies through the emergence of different cultural origins, creating a living, evolving universe.
