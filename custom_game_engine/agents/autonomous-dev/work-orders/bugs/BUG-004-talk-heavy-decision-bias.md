# BUG-004: Talk-Heavy Decision Bias

**Created:** 2025-12-28
**Status:** 🟡 LOW PRIORITY
**Priority:** LOW
**Detected In:** Session game_1766914249543_mtj3u7

---

## Summary

LLM agents are choosing "talk" actions 86% of the time vs only 14% "gather", leading to unbalanced village productivity.

## Observed Behavior

```
DECISION PATTERNS
---------------------------------------------------------------------------
  Decision Frequency:
    talk                    6x ( 86%)
    gather                  1x ( 14%)
```

The LLM reasoning shows agents understand the need for resources ("village needs a workbench to unlock tools for faster gathering") but then choose to talk instead of gather.

## Expected Behavior

Decision distribution should roughly reflect village needs:
- Early game: 60-70% gather, 10-20% build, 10-20% social
- Mid game: 40-50% gather, 20-30% craft/build, 20-30% social
- Late game: More varied based on specialization

## Reproduction

1. Start new game with LLM agents
2. Wait 2-3 minutes
3. Check decision patterns in dashboard

## Files to Investigate

- `packages/llm/src/StructuredPromptBuilder.ts` - Prompt construction
- `packages/llm/src/prompts/` - System prompts
- `packages/core/src/systems/AgentBrainSystem.ts` - Decision context

## Potential Root Causes

1. **Prompt framing**: Social actions may be more strongly encouraged in prompts
2. **Conversation visibility**: When agents see other agents talking, they want to join
3. **Need weighting**: Social needs may be weighted higher than survival needs
4. **Action presentation**: Talk actions may appear first/more prominently in available actions

## Suggested Investigation

Check the LLM context being sent:
```bash
curl "http://localhost:8766/dashboard/agent?id=<agentId>"
```

Review the "Available Actions" section and how actions are ordered/described.

## Acceptance Criteria

- [ ] Gather actions chosen > 40% of time in early game
- [ ] Add need-based action prioritization in prompts
- [ ] Consider action cooldowns (can't talk to same agent twice in 5 min)

## Notes

This may be intentional emergent behavior if the LLM sees social bonding as important for village cohesion. However, early game should prioritize survival/resource gathering.

Low priority because agents ARE gathering (441 wood collected) - the issue is more about optimization than broken functionality.
