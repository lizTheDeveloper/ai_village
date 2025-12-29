# Bug Tracker

Bugs detected from metrics dashboard analysis.

## Open Bugs

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| [BUG-001](./BUG-001-llm-decision-parsing-failures.md) | LLM Decision Parsing Failures (78% failure rate) | HIGH | 🔴 OPEN |
| [BUG-002](./BUG-002-duplicate-building-construction.md) | Duplicate Building Construction | MEDIUM | 🔴 OPEN |
| [BUG-003](./BUG-003-agents-stuck-idle.md) | Agents Stuck/Idle After Spawn (79% idle) | HIGH | 🔴 OPEN |
| [BUG-004](./BUG-004-talk-heavy-decision-bias.md) | Talk-Heavy Decision Bias (86% talk) | LOW | 🟡 LOW PRIORITY |
| [BUG-005](./BUG-005-talk-behavior-no-conversations.md) | Talk Behavior Not Starting Conversations | HIGH | 🟢 FIXED |

## Detected From Session

**Session ID:** `game_1766914249543_mtj3u7`
**Date:** 2025-12-28
**Duration:** 2m 53s

### Key Metrics

```
Total Events: 332
Villager Agents: 18
LLM Requests: 32
LLM Decisions: 7 (78% failure)
Stuck Agents: 15/19 (79%)
```

### Dashboard Command

```bash
curl "http://localhost:8766/dashboard?session=game_1766914249543_mtj3u7"
```

## Triage Notes

**Recommended Fix Order:**
1. BUG-001 (LLM parsing) - Blocking core agent functionality
2. BUG-003 (Agents idle) - Related to BUG-001, may resolve together
3. BUG-002 (Duplicate buildings) - Causes resource waste
4. BUG-004 (Talk bias) - Optimization, not broken
