# Myth Attribution & Retelling System Implementation

**Date**: 2026-01-06
**Status**: ✅ COMPLETE

## Overview

Implemented a complete myth mutation and retelling system that allows stories about gods to naturally evolve and change attribution as they spread between agents. This creates theological diversity and conflict in multi-deity environments.

## What Was Implemented

### 1. Myth Mutation Types (`MythMutationTypes.ts`)

Created a comprehensive mutation system with 8 different mutation types:

- **Dramatization**: Events become more dramatic and exaggerated
- **Simplification**: Details are lost, story becomes simpler
- **Moralization**: Moral lessons are added or emphasized
- **Personalization**: Narrator inserts themselves or local context
- **Merger**: Story is combined with other similar stories
- **Inversion**: Good becomes bad or vice versa (creates heresy)
- **Attribution**: Credit moved to different deity ⭐ **Key Feature**
- **Localization**: Settings changed to local places

**Key Implementation Details:**

```typescript
// Attribution is heavily weighted when narrator believes different god
if (context.narratorBeliefs?.believedDeity !== myth.deityId) {
  const faithStrength = context.narratorBeliefs.faithLevel;
  probabilities.set('attribution', 0.3 + (faithStrength * 0.4)); // Up to 70%!
}
```

**Mutation Probabilities:**
- Base attribution: 5%
- Attribution with different belief: 30-70% (faith-dependent)
- Dramatization: 15% (higher for open personalities)
- Simplification: 20% (increases with retelling count)
- Moralization: 10% (higher for spiritual narrators)

### 2. Myth Retelling System (`MythRetellingSystem.ts`)

Created an ECS System that automatically spreads myths between agents:

**Features:**
- System priority: 119 (runs after myth generation)
- 10% chance per hour for believers to retell myths
- 1-hour cooldown between retellings per agent
- Finds listeners within 30 grid units (conversation distance)
- Applies mutations during retelling
- Handles attribution changes by moving myths between deities
- Emits `myth:attribution_changed` events

**How It Works:**

```typescript
// Every tick, for each believer:
1. Check cooldown (1 hour since last retelling)
2. 10% chance to retell
3. Find myths the agent knows
4. Pick random myth
5. Find nearby agents (within 30 units)
6. Calculate mutation probabilities
7. Apply mutation (if selected)
8. Handle attribution change (if applicable)
9. Spread to listeners
10. Update cooldown
```

**Attribution Change Process:**

When attribution changes:
1. Create mutated version of myth with new deity ID
2. Add mutated myth to new deity's mythology
3. Mark original myth as 'disputed' in original deity's mythology
4. Update both deity components for tracking
5. Emit `myth:attribution_changed` event

### 3. Pantheon Integration (`pantheon-deity-integration.ts`)

Added event handling for theological conflicts:

**Features:**
- Listens for `myth:attribution_changed` events
- Transfers 10% of original deity's belief to new deity
- 20% chance for each believer to convert to new deity
- Emits `theology:conflict` events for pantheon systems
- Logs all attribution changes

**Belief Economy Impact:**

```typescript
// When myth is re-attributed:
- Original deity loses: 10% of current belief + potential believers
- New deity gains: belief transfer + converted believers
- Theological conflict: Triggers pantheon rivalry systems
```

## Integration Points

### Event System

**Emitted Events:**
- `myth:attribution_changed` - When myth's deity credit changes
  - mythId, mythTitle, originalDeityId, newDeityId, timestamp
- `theology:conflict` - When theological dispute occurs
  - type, mythId, originalDeity, newDeity, beliefTransferred, believersConverted

**Subscribed Events:**
- `prayer:answered` - Triggers myth generation (existing system)
- `myth:attribution_changed` - Triggers belief transfer and conversion

### Component Integration

**MythologyComponent:**
- Stores all myths for a deity
- Tracks myth status (canonical, disputed, heretical)
- Maintains knownBy lists for spreading

**DeityComponent:**
- Tracks believers (updated on conversion)
- Manages belief economy (transfers on attribution)
- Stores myths array (updated on attribution change)

**SpiritualComponent:**
- believedDeity field (updated on conversion)
- faith level (affects mutation probability)

### System Integration

**Works With:**
- MythGenerationSystem (priority 118) - Creates initial myths
- MythRetellingSystem (priority 119) - Spreads and mutates myths
- BeliefGenerationSystem - Handles belief economy
- DeityEmergenceSystem - Gods can emerge with contested myths

## Gameplay Impact

### Theological Diversity

With this system, myths naturally diverge creating:
- **Multiple versions** of the same story
- **Disputed miracles** attributed to different gods
- **Heretical variants** with inverted moral implications
- **Folk tales** that have been simplified over generations
- **Localized versions** adapted to different regions

### Pantheon Dynamics

In multi-deity environments:
- **Gods compete** for credit of miraculous events
- **Believers convert** based on which god they think performed miracles
- **Divine rivalry** emerges from attribution disputes
- **Theological wars** can start over contested myths

### Player Experience

Players will observe:
- Stories changing as they spread through the population
- Gods losing believers when their myths are re-attributed
- Theological debates about "who really performed that miracle"
- Emergent religious schisms based on myth interpretation

## Files Created

### Core Implementation

**`packages/core/src/divinity/MythMutationTypes.ts`** (~466 lines)
- 8 mutation type implementations
- Probability calculation system
- Context-aware mutation selection
- Individual mutation application functions

**`packages/core/src/systems/MythRetellingSystem.ts`** (~358 lines)
- ECS System for myth spreading
- Automatic retelling with cooldowns
- Mutation application during retelling
- Attribution change handling
- Event emission

### Integration

**Modified: `packages/core/src/systems/registerAllSystems.ts`**
- Added MythRetellingSystem import (line 173)
- Registered system in LLM systems section (lines 590-593)

**Modified: `packages/core/src/divinity/index.ts`**
- Exported MythMutationType, MutationResult, MutationContext (lines 95-108)
- Exported calculateMutationProbabilities, selectMutation, applyMutation

**Modified: `demo/pantheon-deity-integration.ts`**
- Added handleMythAttributionChanged function (~100 lines)
- Added subscribeToAttributionEvents function
- Implements belief transfer on attribution
- Implements believer conversion (20% chance)
- Emits theology:conflict events

## Technical Details

### Mutation Probability Algorithm

```typescript
calculateMutationProbabilities(myth, context):
  1. Start with base probabilities for each mutation type
  2. Adjust based on time since original creation
  3. Adjust based on retelling count
  4. Adjust based on narrator personality
  5. MAJOR boost for attribution if narrator believes different god
  6. Return probability map
```

### Attribution Mutation Logic

```typescript
applyAttributionMutation(myth, context):
  1. Select new deity (prefer narrator's believed deity)
  2. Replace deity references in text (find-replace)
  3. Update myth.deityId
  4. Mark as 'disputed' if was 'canonical'
  5. Increment version number
  6. Return mutated myth + attribution metadata
```

### Retelling Flow

```
Agent has myth → Cooldown expired → 10% chance roll
    ↓
Find listeners within 30 units
    ↓
Calculate mutation probabilities (context-aware)
    ↓
Select mutation (weighted random)
    ↓
Apply mutation → Create new version
    ↓
Handle attribution change? → Move to new deity's mythology
    ↓
Spread to listeners → Add to their knownBy lists
    ↓
Update cooldown
```

## Configuration

### Cooldown Settings
- `RETELLING_COOLDOWN = 3600` ticks (~1 hour at 60 ticks/min)
- Configurable per-agent to prevent spam

### Distance Settings
- `CONVERSATION_RADIUS = 30` grid units
- Myths only spread to nearby agents (natural word-of-mouth)

### Probability Settings
- Base attribution: 5%
- Attribution with different belief: 30-70%
- Believer conversion chance: 20%
- Belief transfer: 10% of current belief

## Examples

### Example 1: Harvest Myth Re-attribution

```
Initial: "Demeter blessed the crops, and they grew twice as tall"
         (attributed to Demeter, goddess of harvest)

Agent (who believes in Apollo) retells the story:
  → 60% attribution chance (high faith in Apollo)
  → Mutation occurs

Result: "Apollo blessed the crops, and they grew twice as tall"
        (attributed to Apollo, god of sun/light)

Impact:
  - Demeter loses 50 belief points (10% of 500)
  - Apollo gains 50 belief points
  - 2 of Demeter's 10 believers convert to Apollo
  - Event emitted: theology:conflict
```

### Example 2: Dramatic Exaggeration

```
Initial: "The god answered my prayer and healed my wound"
         (attributed to healing deity)

Agent (with high openness) retells the story:
  → 25% dramatization chance
  → Mutation occurs

Result: "The god answered my prayer and healed my wound with tremendous power,
         in a blinding flash of light that shook the very earth"
        (trait implications boosted by 30%)

Impact:
  - Myth becomes more dramatic
  - Faith implications become stronger
  - Story spreads to 3 nearby agents
```

### Example 3: Simplification Over Time

```
Initial: "In the depths of winter, when the crops had failed and the people
         cried out in desperation, the goddess of harvest descended from the
         heavens and blessed the frozen soil with her divine touch. Immediately,
         green shoots burst forth, and within days, a full harvest was ready."
         (full 4-paragraph myth)

After 5 retellings:
  → 40% simplification chance (high retelling count)
  → Mutation occurs

Result: "The harvest goddess blessed the crops. They grew."
        (reduced to core message)

Impact:
  - Story is easier to remember
  - Spreads faster
  - But loses detail and impact
```

## Future Enhancements

### Phase 2 (Potential)
- ⏳ LLM-powered myth rewriting (better than find-replace)
- ⏳ Myth validation system (gods can dispute false attributions)
- ⏳ Written vs oral transmission (books preserve accuracy)
- ⏳ Priest/scholar intervention (can correct "heresies")
- ⏳ Miracle witness tracking (agents who saw it resist mutation)

### Phase 3 (Potential)
- ⏳ Regional myth variants (different cultures have different versions)
- ⏳ Sacred text compilation (canonical myth collections)
- ⏳ Theological councils (deities negotiate attribution)
- ⏳ Myth fusion system (merger mutation with actual myth merging)
- ⏳ Player-created myths (players can author stories)

## Testing

### How to Test

1. **Start the game** with multiple pantheon gods
2. **Generate initial myths** via divine actions (prayers, miracles)
3. **Observe myth spreading** as agents retell stories
4. **Watch for attribution** when agents of different faiths retell myths
5. **Check console logs** for:
   - `[MythRetellingSystem] Myth "X" mutated (attribution): Story re-attributed from Y to Z`
   - `[Attribution] Transferred N belief to DEITY`
   - `[Attribution] N believers converted from X to Y`

### Expected Behavior

- Myths should spread naturally between nearby agents
- Attribution should be common in mixed-faith populations
- Gods should gain/lose believers based on attribution
- Console should show clear attribution change logs

### Validation

**Successful if:**
- ✅ Myths spread between agents within 30 units
- ✅ Attribution occurs when narrator believes different god
- ✅ Belief transfers from original to new deity
- ✅ Some believers convert to new deity
- ✅ Events are emitted correctly
- ✅ No crashes or infinite loops

## Conclusion

The myth attribution system is now **fully integrated** into the game. Myths naturally evolve as they spread, creating:
- **Theological diversity** through mutation
- **Divine competition** through attribution changes
- **Emergent religious conflict** through believer conversion
- **Rich storytelling** through natural story evolution

This system transforms static myths into **living narratives** that shape the game's pantheon dynamics and create emergent theological conflicts.

All core functionality is complete and ready for gameplay testing.
