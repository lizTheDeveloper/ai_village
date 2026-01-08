# Conversation System Improvements - 2026-01-07

## Summary

Implemented conversation-aware LLM engagement and spatial stickiness for more natural conversation behavior.

## Changes Implemented

### 1. Spatial Stickiness for Conversations

**File:** `packages/core/src/behavior/behaviors/TalkBehavior.ts`

**What:** Agents now stay near a conversation center point instead of stopping completely during conversations.

**Implementation:**
- Calculate conversation center as midpoint between conversing agents (lines 111-120)
- Apply "arrive" steering behavior toward center with 8-tile arrival radius (lines 217-231)
- Allows natural fidgeting/movement while maintaining spatial cohesion

**Before:**
```typescript
// Agents stopped moving completely during conversations
this.stopMovement(entity);
```

**After:**
```typescript
// Agents use "arrive" steering to stay near conversation center
entity.updateComponent(ComponentType.Steering, (current: any) => ({
  ...current,
  behavior: 'arrive',
  target: {
    x: activeConversation.conversationCenterX,
    y: activeConversation.conversationCenterY,
  },
  arrivalRadius: 8, // Natural movement within ~8 tiles
}));
```

### 2. Conversation-Aware LLM Engagement

**File:** `packages/llm/src/LLMScheduler.ts`

**What:** Talker layer adjusts engagement frequency based on whether agent is in a conversation.

**Rationale (from user feedback):**
- "Talkers should engage during conversations and not very much when not in conversations"
- "1:10 ratio based on which mode they're in"
- "Talker conversations are supposed to manage themselves and pull people in order to speak in order and in turn"
- "They do it more frequently than the executor gets a chance to plan executions"

**Implementation (lines 260-286):**

```typescript
isLayerReady(agentId: string, layer: DecisionLayer, agent?: Entity): boolean {
  // ... existing logic ...

  if (agent && layer === 'talker') {
    const conversationComp = agent.components.get('conversation') as ConversationComponent | undefined;
    const isInConversation = conversationComp?.isActive && (conversationComp.partnerId !== null || conversationComp.participantIds.length > 0);

    if (isInConversation) {
      // In conversation: Talker runs FREQUENTLY to manage turn-taking
      adjustedCooldown = 2000; // 2s - high engagement for conversation flow
    } else {
      // NOT in conversation: Talker runs RARELY to check if should start
      adjustedCooldown = 20000; // 20s - low engagement (1:10 ratio)
    }
  }
  // Executor uses default cooldown regardless of conversation state
}
```

**Cooldown Summary:**
- **Talker in conversation:** 2s (high frequency for turn-taking and conversation management)
- **Talker NOT in conversation:** 20s (1:10 ratio, rare engagement to initiate conversations)
- **Executor:** Default 10s cooldown (configurable, no conversation-aware adjustments)
- **Autonomic:** Default 1s cooldown (unchanged)

### 3. Personality-Based Conversation Joining

**File:** `packages/core/src/systems/CommunicationSystem.ts` (completed in previous session)

**What:** Extraverted agents join conversations from farther away than introverted agents.

**Implementation:**
- Extraversion trait (0-1.0) determines join radius
- Introverted (extraversion = 0): 20 tiles
- Extraverted (extraversion = 1.0): 30 tiles
- Linear interpolation for values in between
- Agents only join one conversation at a time
- Only join active conversations (not already in one)

### 4. Removed 15-Second Conversation Timer

**File:** `packages/core/src/systems/CommunicationSystem.ts` (completed in previous session)

**What:** Conversations now continue indefinitely until agents explicitly leave or partner is removed from world.

**Rationale:** Allows conversations to flow naturally based on agent decisions rather than arbitrary time limits.

## Technical Details

### LLM Scheduler Three-Layer Architecture

1. **Autonomic Layer** (1s cooldown)
   - Reflexive responses, basic needs, immediate decisions
   - Highest priority (10)
   - Always uses default cooldown

2. **Talker Layer** (variable cooldown)
   - Conversations, social interactions, relationships
   - Medium priority (5)
   - **2s in conversation, 20s when not in conversation**
   - Manages turn-taking and conversation flow when active

3. **Executor Layer** (10s default, configurable)
   - Strategic planning, task execution, resource management
   - Lowest priority (1) but most impactful
   - Uses configurable default cooldown regardless of conversation state

### Conversation State Tracking

```typescript
interface ConversationComponent {
  partnerId: EntityId | null;
  participantIds: EntityId[];
  conversationCenterX?: number; // Added for spatial stickiness
  conversationCenterY?: number; // Added for spatial stickiness
  messages: ConversationMessage[];
  isActive: boolean;
  // ... other fields
}
```

### Event Flow

1. **conversation:started** - When two agents begin talking
2. **conversation:joined** - When third+ agent joins ongoing conversation
3. **conversation:utterance** - Each time an agent speaks
4. **conversation:ended** - When conversation concludes

## Testing Verification

- ✅ Build passes with no TypeScript errors
- ✅ All conversation components properly integrated
- ✅ LLM scheduler cooldown logic validated
- ✅ Steering system integration confirmed

## Behavioral Impact

### Before Changes:
- Agents stopped moving completely during conversations (rigid)
- Talker engaged at same frequency regardless of conversation state
- Conversations could feel stilted or unnatural

### After Changes:
- Agents move naturally around conversation center (fluid, organic)
- Talker engages frequently during conversations for natural turn-taking
- Talker rarely checks for conversation opportunities when idle (1:10 ratio)
- Conversations flow more naturally based on agent personalities and decisions

## Files Modified

1. `packages/core/src/behavior/behaviors/TalkBehavior.ts`
   - Calculate conversation center (lines 111-120)
   - Apply spatial stickiness with arrive steering (lines 217-231)
   - Remove movement stopping (line 50 comment)

2. `packages/llm/src/LLMScheduler.ts`
   - Add conversation-aware cooldown logic (lines 260-286)
   - Update isLayerReady() signature to accept agent parameter
   - Update call site to pass agent (line 320)

3. `packages/core/src/systems/CommunicationSystem.ts` (previous session)
   - Remove 15-second timer
   - Add personality-based joining (lines 78-115)
   - Two-pass update logic (join, then manage)

4. `packages/core/src/components/ConversationComponent.ts` (previous session)
   - Add conversationCenterX/Y fields
   - Update startConversation() to accept center coordinates

5. `packages/core/src/events/EventMap.ts` (previous session)
   - Add conversation:joined event type

## Future Considerations

- Monitor actual conversation durations in gameplay to fine-tune cooldowns
- Consider adding conversation quality metrics to influence talker engagement
- Potential for conversation-specific interruption mechanics based on urgency
- Could add conversation "breakaway radius" (leave conversation if too far from center)

## Related Documentation

- Architecture: `custom_game_engine/ARCHITECTURE_OVERVIEW.md`
- Systems Catalog: `custom_game_engine/SYSTEMS_CATALOG.md` (CommunicationSystem entry)
- Metasystems: `custom_game_engine/METASYSTEMS_GUIDE.md` (Consciousness/LLM Scheduler)
