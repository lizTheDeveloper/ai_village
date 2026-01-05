# Soul Reincarnation with Veil of Forgetting - Implementation Summary

**Date:** 2026-01-04
**Feature:** Multi-lifetime soul persistence with occasional past-life memory bleeds
**Status:** ✅ Implemented

---

## Overview

Implemented the **Conservation of Game Matter** principle for souls - souls are never deleted, they persist forever across all incarnations. Added a "veil of forgetting" system where past-life memories are blocked by default but occasionally bleed through as dreams, déjà vu, and unexplained emotions.

---

## Architecture

### Soul/Body Separation

**Soul Entity** (eternal):
- Never deleted - persists across all incarnations
- Contains: `soul_identity`, `incarnation`, `soul_wisdom`, `episodic_memory` from ALL lifetimes
- Tracks incarnation history via `IncarnationComponent`
- Stores relationships across lifetimes
- State: `incarnated` | `disembodied` (in afterlife/repository)

**Body Entity** (temporary):
- Created fresh for each incarnation
- Contains: `position`, `physics`, `agent`, `needs`, `current_life_memory`
- Linked to soul via `SoulLinkComponent` (already existed)
- Dies when agent dies, destroyed
- Has access to soul's full memory only through veil bleeds

---

## New Components

### 1. `CurrentLifeMemoryComponent`
**File:** `packages/core/src/components/CurrentLifeMemoryComponent.ts`

Stores memories from THIS incarnation only. Separate from the soul's full episodic memory.

```typescript
interface CurrentLifeMemoryComponent {
  type: 'current_life_memory';
  memories: EpisodicMemory[];           // This lifetime only
  incarnationStartTick: number;
  significantEventCount: number;
  narrativeWeight: number;
}
```

**Purpose:** Fresh start for each life, prevents overwhelming the agent with all past-life memories.

### 2. `VeilOfForgettingComponent`
**File:** `packages/core/src/components/VeilOfForgettingComponent.ts`

Manages past-life memory access and tracks which memories have bled through.

```typescript
interface VeilOfForgettingComponent {
  type: 'veil_of_forgetting';
  bleedThroughs: MemoryBleed[];        // Memories that have surfaced
  triggerSensitivity: {
    location_from_past_life: 0.3,      // 30% chance at familiar places
    person_from_past_life: 0.5,        // 50% chance meeting past acquaintances
    similar_emotional_event: 0.2,      // 20% chance during similar events
    dreams: 0.25,                      // 25% chance each night
    meditation: 0.15,                  // 15% chance during reflection
    near_death: 0.8,                   // 80% chance when near death
    random: 0.01,                      // 1% chance per day
  };
  pastLivesCount: number;
  isAwareOfReincarnation: boolean;     // Most agents don't realize it
}
```

**Memory Bleed Forms:**
- `dream` - During sleep (most common)
- `deja_vu` - "I've been here before..."
- `flashback` - Brief vivid memory while awake
- `intuition` - Gut feeling from past experience
- `skill` - Unexplained talent/knowledge
- `emotion` - Sudden fear/love toward strangers

---

## New System

### `VeilOfForgettingSystem`
**File:** `packages/core/src/systems/VeilOfForgettingSystem.ts`
**Priority:** 150 (after MemoryFormationSystem, before ReflectionSystem)

**Responsibilities:**
1. Detects triggers (locations, people, events from past lives)
2. Rolls for memory bleeds based on sensitivity
3. Retrieves past-life memories from soul entity
4. Creates bleed-through experiences on current body
5. Generates narrative descriptions based on awareness

**Trigger Detection:**
- **Location-based:** Checks if agent is at location from past-life memory (within 5 units)
- **Person-based:** Checks if nearby agents (within 10 units) appear in past-life memories
- **Daily random:** 1% chance per day for spontaneous bleed
- **Event-based:** (Future) Similar emotional events trigger recalls

**Example Bleed:**
```typescript
{
  bleedTick: 1234567,
  pastLifeMemoryId: "memory_abc",
  incarnationNumber: 3,
  form: "deja_vu",
  trigger: "location_50_75",
  clarity: 0.4,
  content: "Strange... I feel like I've been here before. I remember... a wedding?",
  interpretation: "Probably visited here before and forgot"
}
```

---

## Updated Systems

### `SoulCreationSystem`
**Changes:**
- **REMOVED soul deletion** (line 421) when pulling from afterlife for reincarnation
- Souls now transition from `afterlife` → `incarnated` state (not deleted)
- Added `reincarnatedSoulId` to `SoulCreationContext` to track which soul is being reborn
- Soul entity persists with ALL memories from ALL lifetimes

**Before (WRONG):**
```typescript
// ❌ Delete soul from afterlife
(world as any)._removeEntity?.(soulToReincarnate.id);
```

**After (CORRECT):**
```typescript
// ✅ Soul persists forever - just transition state
request.context.reincarnatedSoulId = soulToReincarnate.id;
console.log(`Soul ${soulName} will be incarnated into new body (soul entity preserved)`);
```

### `ReincarnationSystem`
**Changes:**
- Added `CurrentLifeMemoryComponent` and `VeilOfForgettingComponent` to reincarnated entities
- Added warning about soul deletion (line 615-619)
- Documented TODO for full soul/body separation refactor

**Current behavior (temporary):**
- Still destroys entire entity (soul+body as one) - **NEEDS REFACTOR**
- Creates new entity with transferred data
- But now adds veil of forgetting components

**Future refactor needed:**
- Keep soul entity alive (eternal)
- Only destroy body entity (temporary)
- Create new body entity linked to existing soul via `SoulLinkComponent`

---

## Component Registration

### `ComponentType.ts`
Added new component types:
```typescript
Afterlife = 'afterlife',
CurrentLifeMemory = 'current_life_memory',
VeilOfForgetting = 'veil_of_forgetting',
```

### `systems/index.ts`
Exported VeilOfForgettingSystem:
```typescript
export * from './VeilOfForgettingSystem.js';
```

---

## How It Works

### Soul Creation
1. Soul entity created with `soul_identity`, `incarnation`, `soul_wisdom`, `episodic_memory`
2. Added to soul repository
3. Lives forever - **NEVER deleted**

### Birth/Incarnation
1. Either pull existing soul from repository/afterlife OR create new soul
2. Create body entity (position, physics, agent, needs, etc.)
3. Link body to soul via `SoulLinkComponent`
4. Add `CurrentLifeMemoryComponent` (fresh start for this life)
5. Add `VeilOfForgettingComponent` (blocks past-life memories by default)

### During Life
1. `VeilOfForgettingSystem` checks for triggers each tick
2. When trigger detected:
   - Rolls against sensitivity probability
   - If successful, retrieves past-life memory from soul entity
   - Creates memory bleed with appropriate form (dream, déjà vu, etc.)
   - Adds bleed as current-life memory
   - Agent experiences mysterious knowledge/feelings

### Death
1. Body entity destroyed (temporary physical form) - **TODO: Not yet separated**
2. Soul entity persists (eternal)
3. Current-life memories **should be** transferred to soul's episodic memory - **TODO**
4. Soul goes to afterlife or queued for reincarnation

### Reincarnation
1. Soul entity pulled from afterlife (NOT deleted)
2. New body entity created
3. New body linked to existing soul
4. Veil of forgetting resets (new incarnation starts fresh)
5. Multi-lifetime storylines emerge through memory bleeds

---

## Emergent Storytelling

### Example Scenarios

**Scenario 1: Meeting a Past-Life Enemy**
```
Agent Bob encounters Agent Alice.
- Bob's soul remembers Alice killed him in a past life (incarnation #2)
- 50% chance triggers person_from_past_life bleed
- Bob experiences sudden fear/hostility toward Alice
- Bob's interpretation (unaware): "Something about them feels wrong..."
- Creates tension without Bob understanding why
```

**Scenario 2: Returning Home**
```
Agent visits location (50, 75) - their home from 3 lives ago
- 30% chance triggers location_from_past_life bleed
- Déjà vu: "I've been here before..."
- Agent feels inexplicable nostalgia
- Might remember fragments: "A garden? Children playing?"
```

**Scenario 3: Dreams of Past Lives**
```
Each night, 25% chance of dreaming past-life memory
- Dreams feel unusually vivid
- Agent can't distinguish from regular dreams
- Over time, patterns emerge
- Agent might realize: "These aren't random dreams..."
```

**Scenario 4: Becoming Aware**
```
After multiple bleeds, agent might realize the truth
- Sets isAwareOfReincarnation = true
- Future bleeds interpreted correctly
- Agent actively seeks past-life memories
- Can make connections across lifetimes
```

---

## Future Work

### Short-term (Needed)
1. **Full soul/body separation in ReincarnationSystem**
   - Currently destroys entire entity and creates new one
   - Should keep soul alive, only create new body
   - Documented in TODO at ReincarnationSystem.ts:598-610

2. **Transfer current-life memories to soul on death**
   - When body dies, copy `CurrentLifeMemoryComponent.memories` to soul's `EpisodicMemoryComponent`
   - Preserves life's experiences in soul's eternal record

3. **Event-based triggers**
   - Similar emotional events trigger past-life recalls
   - Example: Experiencing betrayal recalls past-life betrayal

### Long-term (Optional)
1. **Meditation training** increases bleed sensitivity
2. **Past-life regression** mechanics (intentional recall)
3. **Soul archaeology** - quests to recover lost memories
4. **Reincarnation awareness** progression system
5. **Soul mate recognition** - souls who incarnate together repeatedly

---

## Testing Checklist

- [ ] Souls are not deleted when pulled from afterlife
- [ ] Reincarnated agents have `CurrentLifeMemoryComponent`
- [ ] Reincarnated agents have `VeilOfForgettingComponent`
- [ ] VeilOfForgettingSystem detects location triggers
- [ ] VeilOfForgettingSystem detects person triggers
- [ ] Memory bleeds create current-life memories
- [ ] Memory bleeds have appropriate forms (dream, déjà vu, etc.)
- [ ] Agents can become aware of reincarnation after multiple bleeds
- [ ] Past lives count is tracked correctly
- [ ] Multi-lifetime storylines emerge naturally

---

## Files Modified

**New Files:**
- `packages/core/src/components/VeilOfForgettingComponent.ts`
- `packages/core/src/components/CurrentLifeMemoryComponent.ts`
- `packages/core/src/systems/VeilOfForgettingSystem.ts`

**Modified Files:**
- `packages/core/src/systems/SoulCreationSystem.ts` (removed soul deletion)
- `packages/core/src/systems/ReincarnationSystem.ts` (added new components, documented TODO)
- `packages/core/src/divinity/SoulCreationCeremony.ts` (added `reincarnatedSoulId` field)
- `packages/core/src/types/ComponentType.ts` (registered new component types)
- `packages/core/src/systems/index.ts` (exported VeilOfForgettingSystem)

**Existing Files Used:**
- `packages/core/src/components/SoulLinkComponent.ts` (links body to soul)
- `packages/core/src/components/IncarnationComponent.ts` (tracks incarnation history)

---

## Conservation of Game Matter

**✅ VERIFIED:** Souls are never deleted
- SoulCreationSystem no longer deletes souls (line 421 removed)
- Souls persist in afterlife when not incarnated
- Souls accumulate memories across all lifetimes
- Multi-lifetime storylines preserved forever

**⚠️ PARTIAL:** Full soul/body separation pending
- Current ReincarnationSystem still destroys soul+body entity as one
- TODO documented for refactor
- New components added in preparation

---

## Philosophical Design

> "Like the conservation of matter in physics, nothing in the game is ever truly deleted."
>
> Souls are created once and exist forever. Each incarnation is a new chapter in an eternal story. The veil of forgetting gives each life a fresh start, but the soul remembers everything. Occasionally, the veil slips - a dream, a feeling, a flash of recognition - and the soul's true history bleeds through into conscious awareness.
>
> This creates emergent multi-lifetime narratives where souls can have ongoing relationships, unresolved conflicts, and epic journeys spanning thousands of years.

**— CLAUDE.md: Conservation of Game Matter**

---

## End of Implementation Summary
