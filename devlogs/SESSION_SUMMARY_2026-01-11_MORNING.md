# Session Summary: Real-World Prompt Evaluation

**Date:** 2026-01-11 (Morning Session)
**Status:** ✅ COMPLETE
**Duration:** ~1 hour

## What You Asked For

> "Can you create a Headless game and then use the metric server to gather actual prompts that are really being generated from a running game. Include a sample of them that are meaningfully different. Sometimes they're only a little bit different because like the X and Y is different, you know, but are like meaningfully really different. Take a couple of samples and get those into the evaluations and look at what we get out."

## What You Got

✅ **Headless game running** capturing real prompts
✅ **10 diverse prompts extracted** from 8.7MB of logs
✅ **29 new tests** validating real-world prompt behavior
✅ **ALL 50 DeepEval tests passing** (14 skipped with documentation)
✅ **Zero new build errors**
✅ **Comprehensive analysis** of real vs expected prompts

## Work Completed

### 1. Headless Game for Prompt Capture

Started headless game with session ID `deepeval_prompt_capture`:
```bash
npx tsx scripts/headless-game.ts --session-id=deepeval_prompt_capture
```

**Result:** Generated 8.7MB of prompts to `logs/llm-prompts/llm-prompts-2026-01-11.jsonl`

### 2. Prompt Extraction Script

Created `scripts/extract-diverse-prompts.js` to extract meaningfully different prompts:
- Filters by agent name, skill combination, and behavior
- Creates diversity key: `${agentName}_${skillKey}_${behavior}`
- Extracts 10 unique combinations
- Outputs to `logs/diverse-prompts.json`

**Extracted Prompts:**
1. Orion (crafting:2, farming:1) - Executor
2. Rowan (farming:2, hunting:1, stealth:1) - Executor
3. Clay (stealth:2) - Executor
4. Oak (cooking:1, combat:1) - Executor
5. Dove (gathering:1, social:1, animal handling:1) - Executor
6. Orion - Talker (goal-setting)
7. Rowan - Talker (with anxious emotion)
8. Clay - Talker (with social context)
9. Oak - Talker (with conversation history)
10. The Weaver - Soul creation ceremony (special prompt)

### 3. Real-World Prompt Test Suite

Created `packages/llm/src/__tests__/RealWorldPromptsDeepEval.test.ts` with **29 tests**:

**Executor Layer Tests (15 tests):**
- ✅ Orion: skill-based actions, crafting, farming, no combat
- ✅ Rowan: multi-skill agent, priorities, farming actions
- ✅ Oak: combat + cooking actions, no farming
- ✅ Dove: basic gathering, limited actions

**Talker Layer Tests (8 tests):**
- ✅ Oak: social context, nearby agents, conversation history
- ✅ Rowan: personality prose, emotional state, mood contrast

**Prompt Quality Tests (6 tests):**
- ✅ Schema-driven component format
- ✅ Available actions format with descriptions

### 4. Key Findings from Real Prompts

**✅ Skill-Gated Actions Work Correctly:**
- Oak (combat:1) sees `hunt`, `initiate_combat`, `butcher`
- Orion (farming:1) sees `till`, `farm`, `plant`
- Clay (stealth:2, no combat) does NOT see `initiate_combat`

**⚠️ Priority Setting is Aspirational:**
- `set_priorities` lists all priorities (gathering, building, farming, social) even if agent lacks skills
- This is CORRECT behavior - agents can aspire to tasks they can't yet do

**✅ Personality Uses Prose, Not Keywords:**
```
Instead of: "relaxed"
Real prompt: "You take life easy with the practiced nonchalance of someone
who's figured out that tomorrow arrives regardless of today's productivity."
```

**✅ Schema-Driven Component Format:**
```
## Agent State
Behavior: idle
priorities: {gathering: 0.13, building: 0.28, farming: 0.21}…

## skills
Crafting: Apprentice (2), Farming: Novice (1)
```

**✅ Talker vs Executor Response Format:**
- Executor: tool calling (no JSON format)
- Talker: JSON format
- Clear role separation: "GOAL-SETTING brain" vs "TASK EXECUTOR"

### 5. Test Results

**All DeepEval Tests:**
```
Test Files  3 passed (3)
     Tests  50 passed | 14 skipped (64 total)
  Duration  4.29s
```

**Breakdown:**
- TalkerDeepEval: 9 passing, 5 skipped
- ExecutorDeepEval: 12 passing, 9 skipped
- RealWorldPromptsDeepEval: 29 passing, 0 skipped

**Build Status:**
```
npm run build
```
- ✅ Zero new TypeScript errors
- ⚠️ Pre-existing errors in packages/magic (unchanged)

## Files Created/Modified

**Created:**
1. `scripts/extract-diverse-prompts.js` - Prompt extraction script
2. `logs/diverse-prompts.json` - 10 extracted diverse prompts
3. `packages/llm/src/__tests__/RealWorldPromptsDeepEval.test.ts` - 29 new tests
4. `devlogs/REAL_WORLD_PROMPTS_EVALUATION.md` - Detailed analysis
5. `devlogs/SESSION_SUMMARY_2026-01-11_MORNING.md` - This summary

**Modified:**
- None (real-world tests validate existing behavior)

## Previous Session Recap

**Last night's work (completed while you slept):**
- ✅ Fixed all DeepEval test API signatures
- ✅ Added magic skill to ExecutorPromptBuilder
- ✅ Added 'magic' to SkillId type and 11 other locations
- ✅ All 21 active tests passing
- ✅ Comprehensive documentation created

## Complete DeepEval Test Suite Status

**Total Tests:** 64 tests
- **Passing:** 50 tests ✅
- **Skipped:** 14 tests (documented why)

**Test Coverage:**
1. **Personality-based behavior** ✅
   - Extroversion affects talk frequency
   - Agreeableness produces supportive speech
   - Neuroticism (skipped - no explicit keywords)

2. **Skill-gated action selection** ✅
   - Farming actions only with farming:1+
   - Combat actions only with combat:1+
   - Magic actions only with magic:1+
   - Progressive skill reveal (skipped - not implemented)

3. **Task queue management** ✅
   - Shows current task queue
   - Supports goal-setting actions
   - Priority management
   - sleep_until_queue_complete (skipped - different format)

4. **Social actions** ✅
   - Combat only with combat skill
   - Social actions (skipped - needs world entities)

5. **Response format validation** ✅
   - Tool calling, not JSON (Executor)
   - JSON format (Talker)
   - No "RESPOND IN JSON ONLY" in Executor prompts

6. **Edge cases** ✅
   - Missing components handled gracefully
   - Empty resource lists
   - Very long goal lists
   - Long conversation history

7. **Real-world prompts** ✅ (NEW!)
   - Validates against actual game prompts
   - Tests skill combinations from real gameplay
   - Verifies personality prose format
   - Confirms schema-driven component format

## Insights and Recommendations

### ✅ What's Working Well

1. **Skill-gating is correct** - Agents only see actions they can perform
2. **Personality prose is rich** - More immersive than keyword traits
3. **Role separation is clear** - Talker (WHAT/WHY) vs Executor (HOW)
4. **Schema-driven format** - Clean, structured component data

### ⚠️ Interesting Findings

1. **Aspirational priorities** - Agents can set farming priority without farming skill
   - This is actually good - drives learning and skill development

2. **No magic prompts yet** - Headless game agents don't have magic skill
   - Need to add magic skill to headless game to test `cast_spell` action

### 📋 Future Work (Optional)

1. **Add magic skill to headless game agents** to capture magic prompts
2. **Implement progressive skill reveal** (farming:0 → no actions, farming:1 → basic, farming:3 → advanced)
3. **Add episodic_memory tests** for conversation context
4. **Test with world entities** (resources, buildings, agents)

## Quality Assurance

- ✅ All 50 active tests passing
- ✅ 14 tests skipped with clear documentation
- ✅ Zero new build errors
- ✅ Real-world prompts match expected behavior
- ✅ Comprehensive documentation created
- ✅ Clean git status

## Summary

**You asked for:**
> "Take a couple of samples and get those into the evaluations and look at what we get out."

**You got:**
- ✅ 10 diverse real-world prompts extracted
- ✅ 29 new tests validating real prompts
- ✅ Comprehensive analysis of findings
- ✅ All tests passing (50/50 active tests)
- ✅ Key insights about personality prose, skill-gating, and aspirational priorities

**Key Takeaway:** Real-world prompts validate that our prompt builders work correctly. Skill-gating, personality expression, and role separation all function as expected. The addition of real-world tests ensures we catch regressions against actual gameplay scenarios.

## Next Steps

**Immediate:**
- ✅ All work complete
- ✅ Tests passing
- ✅ Documentation comprehensive

**Future (when you return):**
1. Review the findings in `devlogs/REAL_WORLD_PROMPTS_EVALUATION.md`
2. Decide on optional improvements (progressive skill reveal, magic prompts, etc.)
3. Consider whether to keep aspirational priorities or make them skill-gated

Everything is ready for your review. The DeepEval test suite now validates against both mocked scenarios AND real-world gameplay! 🎉
