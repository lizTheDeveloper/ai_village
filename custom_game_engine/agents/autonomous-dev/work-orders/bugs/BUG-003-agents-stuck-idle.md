# BUG-003: Agents Stuck/Idle After Spawn

**Created:** 2025-12-28
**Status:** 🔴 OPEN
**Priority:** HIGH
**Detected In:** Session game_1766914249543_mtj3u7

---

## Summary

15 out of 19 agents (79%) are detected as stuck or idle shortly after game start. Some agents have never recorded any activity at all.

## Observed Behavior

```
STUCK AGENT DETECTION
---------------------------------------------------------------------------
  15 potentially stuck agents:
    Dove            idle for 2m 10s ago
    Lark            idle for 2m 26s ago
    Sage            idle for 2m 15s ago
    Robin           idle for never active
    Willow          idle for never active
    Wren            idle for 2m 42s ago
    b534cf5f        idle for never active
    81f4cfd6        idle for never active
    f0534f1a        idle for never active
    0f98586a        idle for never active
```

Two distinct problems:
1. Named agents (Dove, Lark, etc.) becoming idle after initial activity
2. Some agents (b534cf5f, etc.) never becoming active at all

## Expected Behavior

- All agents should begin activities within 10-20 seconds of spawn
- Agents should cycle through behaviors continuously (gather, deposit, eat, sleep, etc.)
- No agent should be idle for more than 30-60 seconds (except during sleep)

## Reproduction

1. Start game with 18 villager agents
2. Wait 3 minutes
3. Check metrics dashboard for stuck agent detection

## Files to Investigate

- `packages/core/src/systems/AgentBrainSystem.ts` - Agent decision scheduling
- `packages/core/src/behavior/behaviors/` - Behavior implementations
- `packages/world/src/entities/AgentEntity.ts` - Agent initialization
- `packages/core/src/systems/NeedsSystem.ts` - Need-based behavior triggers

## Potential Root Causes

### For never-active agents (b534cf5f, etc.):
1. These may be animal entities, not villager agents
2. Agent spawning without proper behavior component initialization
3. AgentBrainSystem not picking up newly spawned agents

### For idle-after-activity agents (Dove, Lark, etc.):
1. Behavior queue emptying and not refilling
2. LLM decision failures leaving agent with no next action
3. Movement getting stuck on pathfinding
4. Action completing but not triggering next decision

## Acceptance Criteria

- [ ] All villager agents active within 30s of spawn
- [ ] No agent idle for > 60s except during designated rest
- [ ] Add `agent:idle` event when agent has no behavior for > 30s
- [ ] Add automatic behavior fallback when queue empty

## Notes

The agents with hex-like names (b534cf5f) may be animals rather than villagers - need to verify agent type tracking is correctly distinguishing them.
