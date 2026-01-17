# Headless Game Playtest Report
**Session ID:** extended_play_test
**Date:** 2026-01-16
**Duration:** 15 minutes 44 seconds (944s)
**Start Time:** 18:26:28
**End Time:** 18:42:12

---

## Executive Summary

The headless game simulation ran successfully for 15+ minutes without crashes, demonstrating basic stability. However, **critical issues** were identified:

1. **CRITICAL BUG: Storage Chest Duplication** - Agents built 1,831 duplicate storage chests due to flawed building coordination logic
2. **CRITICAL BUG: LLM Request Stagnation** - Only 9 LLM calls total; agents stopped receiving new decisions after initial spawn
3. **Agent Stuck Behaviors** - 6 of 8 agents flagged as "stuck" in gather/deposit behaviors for 10+ minutes
4. **Unexpected Agent Spawning** - 3 new Script-type agents spawned during simulation (not part of initial 5 LLM agents)

**Overall Assessment:** The simulation demonstrates basic functionality but reveals severe issues in agent decision-making and building coordination that prevent meaningful gameplay.

---

## Test Parameters

| Parameter | Value |
|-----------|-------|
| Session ID | extended_play_test |
| Initial Agent Count | 5 LLM agents |
| Final Agent Count | 8 (5 LLM + 3 Script) |
| Duration | 15m 44s |
| Game Uptime | 949,400ms |
| Initial Agents | Echo, Indigo, Juniper, Linden, Sparrow |
| Spawned Agents | Reed (Script), Dove (Script), Brook (Script) |

---

## Performance Observations

### Stability
- **Status:** PASS
- Game ran continuously for 15+ minutes without crashes
- No errors or exceptions reported in metrics
- Game loop maintained stable execution

### TPS/Performance
- **Status:** Not directly measured, assumed stable
- No performance degradation warnings
- Resource gathering and building construction completed successfully
- 12 wild animals spawned and persisted

### LLM System Performance
- **Total LLM Requests:** 9 (extremely low)
- **Total Decisions:** 5 (only initial decisions)
- **Success Rate:** 56%
- **Errors:** 0
- **Total Cost:** $0.0021
- **Total Tokens:** 20,908 (18,450 input, 2,458 output)
- **Provider:** Cerebras (qwen-3-32b)
- **Queue Status:** Empty throughout test
- **Rate Limiting:** None

### LLM Breakdown by Agent
| Agent | Calls | Decisions | Success Rate | Issues |
|-------|-------|-----------|--------------|--------|
| Linden | 1 | 1 | 100% | None |
| Indigo | 1 | 1 | 100% | None |
| Juniper | 1 | 1 | 100% | None |
| Echo | 3 | 1 | 33% | LOW SUCCESS flag |
| Sparrow | 3 | 1 | 33% | LOW SUCCESS flag |

**Echo and Sparrow:** Multiple LLM calls showed "(pending or no response captured)" before eventually returning a decision.

---

## Agent Behavior

### Initial Behavior (T+21s)
- **Indigo:** Gathering (spoke about securing food)
- **Linden:** Gathering (spoke: "Need to secure food immediately. Let's gather berries first, then plant for the future.")
- **Echo, Sparrow, Juniper:** Idle (resting)

### Mid-Test Behavior (T+6m20s)
- **All 5 original agents:** Switched to gathering
- **Resource collection:** 151 stone, 114 fiber, 24 blackberry, 16 blueberry
- **New behavior:** Juniper and Sparrow depositing items
- **First building wave:** 47 storage chests completed, 3 in progress

### Late-Test Behavior (T+12m14s+)
- **6 agents stuck:** All except Dove remained in gather/deposit behaviors for 7-10+ minutes
- **No new LLM decisions:** All decisions from initial spawn (12+ minutes ago)
- **Building explosion:** 1,126+ storage chests built
- **Script agents spawned:** Reed, Dove, Brook appeared

### Final State (T+15m44s)
- **Linden:** Gather (stuck 7m 57s)
- **Echo:** Gather (stuck 8m 9s)
- **Reed:** Seek_warmth (stuck 8m 46s)
- **Indigo:** Gather (stuck 10m 35s) - RED flag
- **Juniper:** Deposit (stuck 10m 41s) - RED flag
- **Sparrow:** Deposit (stuck 10m 44s) - RED flag
- **Dove:** Idle
- **Brook:** Idle

---

## Resource Collection

### Final Inventory
| Resource | Gathered | Produced | Consumed | Net |
|----------|----------|----------|----------|-----|
| Blackberry | 24 | 0 | 0 | +24 |
| Stone | 151 | 0 | 0 | +151 |
| Blueberry | 16 | 0 | 0 | +16 |
| Fiber | 137 | 0 | 0 | +137 |
| **TOTAL** | **328** | **0** | **0** | **+328** |

### Resource Gathering Timeline
- **18:27:** 38 resources
- **18:28:** 91 resources (peak gathering activity)
- **18:29:** 49 resources
- **18:30:** 48 resources
- **18:31:** 35 resources
- **18:32-18:42:** 10-20 resources/minute (minimal activity)

**Analysis:** Resource gathering was productive for first 5 minutes, then dropped sharply as agents became stuck in behaviors.

---

## Building System

### Storage Chest Explosion
| Time | Chests Completed | Rate |
|------|------------------|------|
| T+6m20s | 47 | - |
| T+9m19s | 444 | 132/min |
| T+12m14s | 1,126 | 227/min |
| T+15m44s | 1,831 | 201/min |

**Total:** 1,831 completed + 5 in progress = **1,836 storage chests**

### Building Timeline
- **18:31:** First 3 storage chest tasks started
- **18:32:** 69 buildings completed (construction begins)
- **18:33:** 117 buildings
- **18:34:** 120 buildings
- **18:35:** 195 buildings
- **18:36-18:39:** 230-236 buildings/minute (peak)
- **18:40-18:42:** 165-42 buildings/minute (declining)

### Dashboard Warning
```
## WARNINGS
  🔁 duplicate: storage-chest
```

**Root Cause:** Building availability check does not filter out in-progress or already-sufficient buildings. Each agent independently decided to build storage chests, creating massive duplication.

---

## Notable Events

### Memory Formation
- **Total Memories:** 5 formed
- **Formation Time:** 18:31, 18:34
- **Details:** Not captured in dashboard, but indicates some cognitive activity occurred

### Wild Animal Spawning
- **Initial:** 4 wild animals
- **Final:** 12 wild animals
- **Growth:** 8 animals spawned naturally during simulation

### Agent Spawning Events
- **18:32:** "agent:birth: 6x" logged (timeline shows 6 birth events)
- **Actual new agents:** Reed, Dove, Brook (Script type)
- **Discrepancy:** Timeline shows 6 births but only 3 new agents visible
- **18:41:** "agent:birth: 1x" (Brook spawned)

### Weather and Time
- **Weather changes:** 18:28, 18:30, 18:38, 18:39
- **Phase changes:** 18:31 (morning?), 18:32, 18:36, 18:37
- **Observation:** Day/night cycle and weather systems functioning

### Conversations
- **Total conversations:** 0 (no agent-to-agent dialogue despite proximity)
- **Speech heard:** Linden's announcement about securing food
- **Analysis:** Social system not engaging despite gather priority

---

## Issues Found

### 1. CRITICAL: Storage Chest Duplication Bug
**Severity:** CRITICAL
**Status:** Blocks meaningful gameplay

**Description:**
Agents built 1,831 duplicate storage chests instead of coordinating to build diverse structures. The building availability logic does not properly filter already-available or in-progress buildings.

**Evidence:**
- 1,831 completed storage chests
- Dashboard warning: "🔁 duplicate: storage-chest"
- No campfire, shelter, or other critical buildings constructed

**Suggested Fix Location:**
```
Check StructuredPromptBuilder.ts getAvailableActions() filtering
Verify building count logic includes in-progress buildings
```

**Impact:**
- Wasted agent actions
- No shelter/warmth buildings (Reed seeking warmth)
- No progression past basic storage
- Unrealistic village development

---

### 2. CRITICAL: LLM Request Stagnation
**Severity:** CRITICAL
**Status:** Blocks agent autonomy

**Description:**
Only 9 LLM requests made during 15 minutes of gameplay. Agents received initial decisions (gather/deposit) and then stopped requesting new decisions, remaining stuck in initial behaviors for 10+ minutes.

**Evidence:**
- Last LLM decisions: 15m 42s ago (Linden), 15m 35s ago (Indigo), etc.
- All decisions from first minute of gameplay
- LLM queue empty throughout test
- 6 agents flagged as "stuck"

**Expected Behavior:**
Agents should request new decisions every 1-3 minutes based on changing needs/environment.

**Actual Behavior:**
Agents execute initial decision indefinitely without re-evaluation.

**Possible Causes:**
1. AgentBrainSystem not triggering new decision requests
2. Decision cooldown too long
3. Behavior completion logic not firing
4. LLMScheduler session cooldowns preventing requests

**Impact:**
- Agents cannot adapt to changing conditions
- No emergent behavior or goal changes
- Static, repetitive gameplay
- Agents stuck seeking warmth (Reed) without resolution

---

### 3. HIGH: Agent Stuck Detection
**Severity:** HIGH
**Status:** Symptom of LLM stagnation

**Description:**
6 of 8 agents flagged as "stuck" in behaviors (gather, deposit, seek_warmth) for 7-10+ minutes without progress or new decisions.

**Stuck Agents:**
| Agent | Behavior | Stuck Duration | Severity |
|-------|----------|----------------|----------|
| Indigo | gather | 10m 35s | RED (critical) |
| Juniper | deposit | 10m 41s | RED (critical) |
| Sparrow | deposit | 10m 44s | RED (critical) |
| Reed | seek_warmth | 8m 46s | YELLOW (warning) |
| Echo | gather | 8m 9s | YELLOW (warning) |
| Linden | gather | 7m 57s | YELLOW (warning) |

**Analysis:**
- "Stuck" threshold appears to be ~7 minutes without activity change
- RED flag triggers at ~10 minutes
- Reed seeking warmth but no warmth buildings available (campfire built but insufficient?)

---

### 4. MEDIUM: Low LLM Success Rate
**Severity:** MEDIUM
**Status:** Impacts agent responsiveness

**Description:**
Echo and Sparrow had 3 LLM calls each but only 1 decision, resulting in 33% success rate.

**Evidence:**
```
LLM Call #2 [3m 10s ago]
Result: (pending or no response captured)

LLM Call #1 [3m 21s ago]
Result: (pending or no response captured)
```

**Analysis:**
First 2 calls showed no response, third call succeeded. Possible timeout or network issues, or LLM provider latency.

**Impact:**
- Delayed initial decisions (agents idle longer)
- Lower overall success rate (56% vs expected 80-90%)

---

### 5. MEDIUM: Script Agent Spawning
**Severity:** MEDIUM
**Status:** Unexpected behavior

**Description:**
3 Script-type agents (Reed, Dove, Brook) spawned during simulation despite test starting with 5 LLM agents.

**Questions:**
1. What triggered these spawns?
2. Why are they "Script" type instead of LLM?
3. Is this intentional reproduction behavior?
4. Why does timeline show 6 birth events but only 3 new agents?

**Impact:**
- Unclear reproduction mechanics
- Script agents may have different behavior (Dove and Brook idle entire test)
- Unexpected population growth

---

### 6. LOW: No Social Interactions
**Severity:** LOW
**Status:** Expected early-game behavior

**Description:**
Zero agent-to-agent conversations despite agents being in proximity and social being a priority.

**Evidence:**
- Total conversations: 0
- Agents saw each other (perception working)
- Linden spoke but no responses

**Analysis:**
Social behavior likely requires specific triggers or needs threshold. With hunger/energy at 100%, social need may not be urgent enough.

---

### 7. LOW: Activity Recording Issue
**Severity:** LOW
**Status:** Metrics gap

**Description:**
Dashboard warning: "LOW ACTIVITY RECORDING - activity:started events may not be firing"

**Evidence:**
- Only 2 activity:started events in 15 minutes
- Hundreds of building completions but no corresponding start events
- Resource gathering happening but minimal activity tracking

**Impact:**
- Dashboard metrics incomplete
- Difficult to track agent actions
- May hide other bugs

---

## Recommendations

### Immediate Fixes (Critical)

#### 1. Fix Storage Chest Duplication
**Priority:** P0
**File:** `packages/llm/src/StructuredPromptBuilder.ts`

**Action:**
- Review `getAvailableActions()` building filtering logic
- Ensure building count includes in-progress buildings
- Add logic to skip building if village already has sufficient quantity
- Consider: 1 storage chest per 2 agents as sufficient threshold

**Validation:**
- Run test with same parameters
- Verify agents build diverse buildings (campfire, shelter, etc.)
- Confirm no duplicate building warnings

---

#### 2. Fix LLM Request Stagnation
**Priority:** P0
**Files:**
- `packages/core/src/systems/AgentBrainSystem.ts`
- `packages/llm/src/LLMScheduler.ts`

**Investigation Steps:**
1. Check decision cooldown duration (may be too long)
2. Verify behavior completion triggers new decision request
3. Check session cooldown logic in LLMScheduler
4. Add logging to track why requests stop

**Expected Behavior:**
- Agent completes gather action → requests new decision
- Decision cooldown: 30-60 seconds (not 10+ minutes)
- Session cooldown should not block indefinitely

**Validation:**
- Run 15-minute test
- Verify each agent makes 10-15 LLM decisions (1-2 per minute)
- Confirm no agents stuck >2 minutes

---

### High Priority Improvements

#### 3. Implement Behavior Timeout/Reset
**Priority:** P1

**Action:**
- Add timeout to behaviors (max 3-5 minutes)
- Force idle state after timeout
- Trigger new decision request on timeout

**Benefit:**
- Prevents indefinite stuck states
- Ensures agents adapt to changing conditions

---

#### 4. Investigate LLM Response Failures
**Priority:** P1

**Action:**
- Add retry logic for "(pending or no response captured)" cases
- Log timeout/failure reasons
- Consider shorter timeout for LLM requests
- Test Groq fallback provider

---

### Medium Priority Improvements

#### 5. Building Diversity Logic
**Priority:** P2

**Action:**
- Add building priority system (shelter > storage > production)
- Coordinate building plans among agents (prevent duplicates)
- Track village needs and prioritize missing buildings

---

#### 6. Clarify Script Agent Spawning
**Priority:** P2

**Investigation:**
- Document when/why Script agents spawn
- Determine if this is reproduction behavior
- Clarify difference between LLM and Script agents
- Fix timeline showing 6 births when only 3 agents spawned

---

#### 7. Activity Event Tracking
**Priority:** P2

**Action:**
- Ensure activity:started events emit consistently
- Add activity tracking to building construction
- Improve metrics coverage for agent actions

---

### Low Priority

#### 8. Social Interaction Tuning
**Priority:** P3

**Action:**
- Review social need triggers
- Lower threshold for initiating conversations
- Test social behavior with varied agent needs

---

## Testing Recommendations

### Regression Test Suite
After fixes, run these tests:

1. **15-Minute Stability Test**
   - Verify no crashes
   - Check TPS stability
   - Monitor memory usage

2. **Building Diversity Test**
   - Spawn 5 agents
   - Run 10 minutes
   - Verify at least 3 different building types constructed
   - Confirm no duplicate warnings

3. **LLM Decision Frequency Test**
   - Track LLM calls per agent per minute
   - Target: 1-2 decisions/minute/agent
   - Verify no stuck agents after 10 minutes

4. **Resource Balance Test**
   - Check resource gathering rates
   - Verify resources consumed (cooking, building)
   - Confirm economy functioning

5. **Social Behavior Test**
   - Spawn agents with low social need
   - Verify conversations occur
   - Test social relationship formation

---

## Data Summary

### Monitoring Schedule (Actual)
| Check | Time | Elapsed | Notes |
|-------|------|---------|-------|
| Initial | 18:27:00 | T+21s | All agents spawned |
| Check 1 | 18:29:51 | T+3m24s | All gathering, 201 resources |
| Check 2 | 18:32:45 | T+6m20s | 47 chests built, duplicate warning |
| Check 3 | 18:35:46 | T+9m19s | 444 chests, 4 agents stuck |
| Check 4 | 18:38:40 | T+12m14s | 1,126 chests, 6 agents stuck |
| Check 5 | 18:42:08 | T+15m44s | 1,831 chests, test complete |

---

## Conclusion

The headless simulation demonstrates **basic stability and performance** but reveals **critical gameplay-blocking bugs**:

1. **Storage chest duplication** prevents meaningful village development
2. **LLM request stagnation** prevents agent autonomy and adaptation
3. **Agent stuck behaviors** create static, non-emergent gameplay

These issues prevent the simulation from demonstrating the intended emergent AI-driven gameplay. The agents executed their initial decisions successfully but then failed to continue making decisions, resulting in repetitive stuck behaviors.

**Recommendation:** Address P0 issues (building duplication, LLM stagnation) before further testing. Once agents make regular decisions and build diverse structures, the simulation can demonstrate true emergent gameplay.

---

## Technical Notes

### Files Modified During Test
None (monitoring only)

### API Endpoints Used
- `http://localhost:8766/api/headless/list`
- `http://localhost:8766/dashboard?session=extended_play_test`
- `http://localhost:8766/dashboard/agents?session=extended_play_test`
- `http://localhost:8766/dashboard/agent?id=<UUID>`
- `http://localhost:8766/dashboard/timeline?session=extended_play_test`
- `http://localhost:8766/dashboard/llm?session=extended_play_test`
- `http://localhost:8766/api/live/universe`
- `http://localhost:8766/api/llm/costs`

### Next Steps
1. File bug reports for P0 issues
2. Implement fixes in StructuredPromptBuilder and AgentBrainSystem
3. Run regression tests
4. Schedule follow-up 30-minute playtest

---

**Playtest completed:** 2026-01-16 18:42:12
**Report generated:** 2026-01-16 18:43:00
**Tester:** Claude Code Agent (Sonnet 4.5)
