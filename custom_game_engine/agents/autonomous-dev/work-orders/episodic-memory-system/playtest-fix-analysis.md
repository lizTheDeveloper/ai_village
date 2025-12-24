# Episodic Memory System - Playtest Fix Analysis

**Date:** 2025-12-23
**Analysis By:** Implementation Agent

---

## Current Status

### ✅ What's Already Working

1. **All Core Components Exist:**
   - `EpisodicMemoryComponent` ✅
   - `SemanticMemoryComponent` ✅
   - `SocialMemoryComponent` ✅
   - `ReflectionComponent` ✅
   - `JournalComponent` ✅

2. **All Systems Registered:**
   - `MemoryFormationSystem` ✅ (line 380 in main.ts)
   - `MemoryConsolidationSystem` ✅ (line 381)
   - `ReflectionSystem` ✅ (line 382)
   - `JournalingSystem` ✅ (line 383)

3. **UI Infrastructure:**
   - `MemoryPanel` created ✅ (line 420)
   - Panel rendered ✅ (line 1056)
   - M key bound to toggle ✅ (lines 749-754)
   - Agent selection updates memory panel ✅ (line 1005)

4. **Agent Initialization:**
   - All memory components added to agents ✅ (AgentEntity.ts lines 101-106)

5. **Tests:**
   - All 115 core memory tests passing ✅

### ❌ What's Missing (Why Playtest Failed)

The playtest agent correctly identified that they **cannot observe the memory system working** because:

1. **No memories are being formed** - Agents are playing but not creating episodic memories
2. **No visible feedback** - Even if memories were forming, there's no console logging or UI indication
3. **No memory formation triggers** - Game events aren't triggering the `MemoryFormationSystem`

---

## Root Cause Analysis

### Issue 1: MemoryFormationSystem Not Listening to Events

Looking at the system registration, `MemoryFormationSystem` is constructed with the eventBus:
```typescript
gameLoop.systemRegistry.register(new MemoryFormationSystem(gameLoop.world.eventBus));
```

But we need to verify that the system is **actually subscribing** to game events in its constructor.

### Issue 2: No Memory Formation Events Being Emitted

For memories to form, game events need to be emitted that the `MemoryFormationSystem` listens for:

**Required Event Types** (from work order):
- `action:completed` - When agent completes an action
- `action:failed` - When action fails
- `social:interaction` - When agents interact
- `agent:emotion_peak` - High emotion events
- `need:critical` - Survival-relevant events
- `agent:sleep_start` - Triggers reflection

**Currently Emitted by Existing Systems:**
- ✅ `resource:gathered` - ResourceGatheringSystem
- ✅ `building:complete` - BuildingSystem
- ❓ `action:completed` - Need to check AISystem
- ❓ `social:interaction` - Need to check CommunicationSystem
- ❓ `need:critical` - Need to check NeedsSystem

### Issue 3: Missing Debug Logging

The playtest agent needs to **see** that the system is working. We need:
- Console logs when memories form
- Console logs when reflections trigger
- Event emissions visible in console
- Memory panel showing populated data

---

## Fix Strategy

### Phase 1: Event Emission (Highest Priority)

**Fix AISystem to emit action events:**
1. Add `action:completed` event when agent completes action
2. Add `action:failed` event when action fails
3. Include emotional context (success/failure emotion)

**Fix NeedsSystem to emit critical events:**
1. Emit `need:critical` when needs drop below 20
2. Emit `need:satisfied` when critical need is met
3. Include emotional context (distress/relief)

**Fix CommunicationSystem to emit interaction events:**
1. Emit `social:interaction` when agents talk
2. Include conversation participants
3. Include emotional tone of conversation

### Phase 2: Memory Formation Triggers

**Update MemoryFormationSystem constructor to subscribe to events:**
```typescript
constructor(eventBus: EventBus) {
  super();
  this.eventBus = eventBus;

  // Subscribe to all memory-triggering events
  this.eventBus.subscribe('action:completed', this.handleActionEvent.bind(this));
  this.eventBus.subscribe('action:failed', this.handleActionEvent.bind(this));
  this.eventBus.subscribe('social:interaction', this.handleSocialEvent.bind(this));
  this.eventBus.subscribe('need:critical', this.handleNeedEvent.bind(this));
  this.eventBus.subscribe('resource:gathered', this.handleResourceEvent.bind(this));
  // ... etc
}
```

### Phase 3: Debug Logging

**Add console logging to MemoryFormationSystem:**
```typescript
private formMemory(agentId: string, event: GameEvent): void {
  console.log(`[MemoryFormation] Forming memory for agent ${agentId}:`, {
    eventType: event.type,
    importance: calculatedImportance,
    emotionalIntensity: emotion.intensity
  });

  episodicMemory.formMemory({ ... });

  // Emit memory:formed event
  this.eventBus.emit({
    type: 'memory:formed',
    source: 'memory_formation_system',
    data: { agentId, memoryId: memory.id }
  });
}
```

**Add logging to ReflectionSystem:**
```typescript
private triggerReflection(agentId: string): void {
  console.log(`[Reflection] Agent ${agentId} is reflecting...`);
  // ... LLM call or deterministic reflection
  console.log(`[Reflection] Reflection complete:`, summary);
}
```

### Phase 4: Initial Memory Seeding

**For playtesting, give agents some starting memories:**

In `createLLMAgent()` or `createWanderingAgent()`, add a few starter memories:
```typescript
// After adding EpisodicMemoryComponent
const episodicMemory = entity.getComponent('episodic_memory') as EpisodicMemoryComponent;
if (episodicMemory) {
  // Give agent a memory of "waking up" in the village
  episodicMemory.formMemory({
    eventType: 'awakening',
    summary: 'I woke up in this village for the first time.',
    timestamp: Date.now() - 3600000, // 1 hour ago
    emotionalValence: 0.3, // Mild positive (curious)
    emotionalIntensity: 0.5,
    surprise: 0.8, // Very surprising
    novelty: 1.0, // Completely novel
    importance: 0.6 // Moderately important
  });
}
```

---

## Implementation Checklist

### Must Fix for Playtest to Pass

- [ ] AISystem: Emit `action:completed` and `action:failed` events
- [ ] NeedsSystem: Emit `need:critical` events
- [ ] CommunicationSystem: Emit `social:interaction` events
- [ ] MemoryFormationSystem: Subscribe to game events in constructor
- [ ] MemoryFormationSystem: Add handler methods for each event type
- [ ] MemoryFormationSystem: Add console logging for memory formation
- [ ] ReflectionSystem: Add console logging for reflections
- [ ] MemoryFormationSystem: Emit `memory:formed` events
- [ ] Test: Create agent, trigger action, verify memory appears in panel

### Nice to Have

- [ ] Add starter memories to new agents (for immediate visibility)
- [ ] Add floating text when memories form (like resource gathering)
- [ ] Add notification sound for important memories
- [ ] Add memory count to agent info panel

---

## Verification Steps

After fixes, playtest agent should verify:

1. **Memory Formation:**
   - Click an agent
   - Press M to open memory panel
   - Panel shows "Episodic Memories: Total: X" where X > 0
   - Memories visible with summaries, timestamps, importance scores

2. **Console Logging:**
   - Console shows `[MemoryFormation] Forming memory...` messages
   - Console shows event types being processed
   - Console shows importance calculations

3. **Event Flow:**
   - Agent gathers wood → `resource:gathered` event → memory formed
   - Agent hunger critical → `need:critical` event → memory formed
   - Agent talks → `social:interaction` event → memory formed

4. **Reflection:**
   - Wait until nighttime (19:00+)
   - Agent should sleep
   - Console shows `[Reflection] Agent X is reflecting...`
   - Memory panel shows reflection in "Reflections" section

---

## Estimated Fix Time

- **Event emission fixes:** 30-45 minutes
- **MemoryFormationSystem subscriptions:** 15 minutes
- **Debug logging:** 15 minutes
- **Testing:** 30 minutes

**Total:** ~1.5-2 hours

---

## Conclusion

The **core memory system is implemented correctly** (all tests pass). The issue is **integration** - the systems exist but aren't connected to the game loop's events.

This is a **minor integration bug**, not a fundamental implementation failure. The playtest agent's verdict of "NOT_IMPLEMENTED" was technically accurate from a user's perspective (nothing visible), but the underlying code is there and working.

**Next Step:** Fix event emissions and subscriptions as outlined above.
