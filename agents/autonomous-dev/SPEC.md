# Autonomous Development Agent System

> **Purpose:** Automated feature development pipeline using specialized Claude Code agents.

---

## Overview

This system orchestrates multiple Claude Code agents to autonomously develop features from spec to implementation to testing. Each agent has a specialized role and communicates via NATS chatroom channels.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTONOMOUS DEV PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│   │  SPEC AGENT  │────▶│ TEST AGENT   │────▶│ IMPL AGENT   │                │
│   │  (Prep Work) │     │ (Write Tests)│     │ (Build Code) │                │
│   └──────────────┘     └──────────────┘     └──────┬───────┘                │
│                                                     │                        │
│                                                     ▼                        │
│                        ┌──────────────┐     ┌──────────────┐                │
│                        │ HUMAN REVIEW │◀────│ PLAYTEST     │                │
│                        │   (Approve)  │     │ AGENT (UI)   │◀───┐           │
│                        └──────────────┘     └──────┬───────┘    │           │
│                                                     │           │           │
│                                                     ▼           │           │
│                                              ┌─────────────┐    │           │
│                                              │ Pass?       │────┘           │
│                                              │ No → Impl   │                │
│                                              └─────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Roles

### 1. Spec Agent (`spec-agent`)

**Purpose:** Select next feature, ensure spec is complete, prepare handoff.

**Responsibilities:**
- Read `MASTER_ROADMAP.md` to find next ⏳ READY task
- Verify the spec file exists and is complete
- Ensure all dependencies are met (check status of dependent phases)
- Verify UI spec exists if feature has UI component
- Write a `work-order.md` describing exactly what to build
- Post to `implementation` channel claiming the work
- Hand off to Test Agent

**Tools Available:**
- Read, Glob, Grep (read specs)
- Write (create work-order.md)
- NATS chatroom (claim work)

**Output:** `work-order.md` with:
- Feature name and phase
- Spec file path
- Requirements extracted from spec
- Integration points with other systems
- UI requirements (if applicable)
- Acceptance criteria
- Files likely to be modified

---

### 2. Test Agent (`test-agent`)

**Purpose:** Write tests BEFORE implementation (TDD), run tests AFTER.

**Responsibilities:**
- Read the `work-order.md` from Spec Agent
- Write unit tests for the feature
- Write integration tests for system interactions
- Ensure tests initially FAIL (red phase of TDD)
- After Implementation Agent runs, re-run tests
- Report test results

**Tools Available:**
- Read, Write, Edit (create test files)
- Bash (run npm test)
- NATS chatroom (report status)

**Output:**
- Test files in `packages/*/src/__tests__/`
- Test report posted to `testing` channel

---

### 3. Implementation Agent (`impl-agent`)

**Purpose:** Build the feature according to spec and work order.

**Responsibilities:**
- Read `work-order.md` and linked specs
- Understand existing system architecture
- Implement the feature following CLAUDE.md guidelines
- Ensure no silent fallbacks, proper error handling
- Run build to verify TypeScript compiles
- Run tests to verify implementation
- Post progress to `implementation` channel

**Tools Available:**
- All file tools (Read, Write, Edit, Glob, Grep)
- Bash (npm run build, npm test)
- NATS chatroom (progress updates)

**System Knowledge:**
The Implementation Agent has a system prompt containing:
- All package locations
- All system files and their purposes
- Component/System naming conventions
- Integration patterns (EventBus, ActionQueue)

**Output:**
- Implementation code
- Build passing
- Tests passing (ideally)

---

### 4. Playtest Agent (`playtest-agent`)

**Purpose:** Test the feature via UI, validate visually, write report.

**Responsibilities:**
- Read `work-order.md` to understand expected behavior
- **NEVER** read implementation code
- Use Playwright MCP to interact with the game
- Take screenshots of relevant UI states
- Validate UI matches spec visually
- Test all acceptance criteria via UI
- Write detailed report of what works/doesn't work

**Tools Available:**
- Read (work-order.md and specs ONLY - not code)
- Write (reports)
- Playwright MCP (browser interaction, screenshots)
- NATS chatroom (report results)

**Constraints:**
- Cannot read files in `packages/` directory
- Cannot read `.ts` files
- Can only read: specs, work-order, its own reports

**Output:** `playtest-report.md` with:
- Screenshots of each tested behavior
- PASS/FAIL for each acceptance criterion
- Behavioral descriptions of failures (not code suggestions)
- Overall verdict: APPROVED or NEEDS_WORK

---

## Workflow

### Phase 1: Spec Preparation

```bash
# Spec Agent runs
claude --dangerously-skip-permissions --print \
  -p "$(cat agents/autonomous-dev/prompts/spec-agent.md)" \
  2>&1 | tee logs/$(date +%Y%m%d-%H%M%S)-spec-agent.log
```

1. Spec Agent reads `MASTER_ROADMAP.md`
2. Finds first task with status ⏳ (Ready)
3. Validates spec completeness
4. Creates `work-orders/[feature-name]/work-order.md`
5. Posts to `implementation` channel: "CLAIMED: [feature-name]"
6. Updates `MASTER_ROADMAP.md`: ⏳ → 🚧

### Phase 2: Test Writing (TDD Red Phase)

```bash
# Test Agent runs
claude --dangerously-skip-permissions --print \
  -p "$(cat agents/autonomous-dev/prompts/test-agent.md) $(cat work-orders/[feature]/work-order.md)" \
  2>&1 | tee logs/$(date +%Y%m%d-%H%M%S)-test-agent-pre.log
```

1. Test Agent reads work-order.md
2. Writes test files based on acceptance criteria
3. Runs tests (should FAIL)
4. Posts to `testing` channel: "Tests written, ready for implementation"

### Phase 3: Implementation

```bash
# Implementation Agent runs
claude --dangerously-skip-permissions --print \
  -p "$(cat agents/autonomous-dev/prompts/impl-agent.md) $(cat work-orders/[feature]/work-order.md)" \
  2>&1 | tee logs/$(date +%Y%m%d-%H%M%S)-impl-agent.log
```

1. Implementation Agent reads work-order and specs
2. Implements the feature
3. Runs `npm run build` (must pass)
4. Runs `npm test` (should now pass)
5. Posts to `implementation` channel: "Implementation complete"

### Phase 4: Test Verification

```bash
# Test Agent runs again
claude --dangerously-skip-permissions --print \
  -p "Verify tests pass for [feature]" \
  2>&1 | tee logs/$(date +%Y%m%d-%H%M%S)-test-agent-post.log
```

1. Test Agent runs full test suite
2. Reports results to `testing` channel
3. If tests fail, loop back to Implementation

### Phase 5: Playtest

```bash
# Playtest Agent runs
claude --dangerously-skip-permissions --print \
  -p "$(cat agents/autonomous-dev/prompts/playtest-agent.md) $(cat work-orders/[feature]/work-order.md)" \
  2>&1 | tee logs/$(date +%Y%m%d-%H%M%S)-playtest-agent.log
```

1. Playtest Agent starts the dev server
2. Opens browser via Playwright MCP
3. Tests each acceptance criterion
4. Takes screenshots
5. Writes `work-orders/[feature]/playtest-report.md`
6. Posts verdict to `testing` channel

### Phase 6: Iteration or Approval

**If NEEDS_WORK:**
1. Implementation Agent reads playtest-report.md
2. Fixes issues based on behavioral descriptions
3. Loop back to Phase 4

**If APPROVED:**
1. Update `MASTER_ROADMAP.md`: 🚧 → ✅
2. Post to `implementation` channel: "COMPLETE: [feature-name]"
3. Create `work-orders/[feature]/READY_FOR_REVIEW.md`
4. Human reviews before merge

---

## File Structure

```
agents/autonomous-dev/
├── SPEC.md                    # This file
├── prompts/
│   ├── spec-agent.md          # Spec Agent system prompt
│   ├── test-agent.md          # Test Agent system prompt
│   ├── impl-agent.md          # Implementation Agent system prompt
│   └── playtest-agent.md      # Playtest Agent system prompt
├── scripts/
│   ├── orchestrator.sh        # Main orchestration script
│   ├── run-spec-agent.sh      # Individual agent runners
│   ├── run-test-agent.sh
│   ├── run-impl-agent.sh
│   └── run-playtest-agent.sh
└── work-orders/               # Created per feature
    └── [feature-name]/
        ├── work-order.md
        ├── playtest-report.md
        ├── screenshots/
        └── READY_FOR_REVIEW.md

logs/                          # All agent logs
├── 20241221-143052-spec-agent.log
├── 20241221-143512-test-agent-pre.log
├── 20241221-144023-impl-agent.log
└── ...
```

---

## NATS Chatroom Integration

Agents coordinate via these channels:

| Channel | Purpose |
|---------|---------|
| `implementation` | Claim work, post progress, handoffs |
| `testing` | Test results, playtest reports |
| `coordination` | Cross-agent coordination |

### Message Format

```json
{
  "agent": "spec-agent-001",
  "status": "STARTED|IN-PROGRESS|HANDOFF|COMPLETED|BLOCKED",
  "message": "CLAIMED: [feature-name]\n\nWork order: work-orders/[feature]/work-order.md",
  "timestamp": "2024-12-21T14:30:52Z"
}
```

### Thundering Herd Prevention

Before claiming work, agents MUST:
1. Call `chatroom_who_active` on `implementation` channel
2. Check if feature is already claimed
3. Only proceed if unclaimed

---

## Concurrency Model

Multiple pipelines can run simultaneously for different features:

```
Pipeline A (Phase 8 - Farming)      Pipeline B (Phase 9 - Crafting)
├── spec-agent-001                  ├── spec-agent-002
├── test-agent-001                  ├── test-agent-002
├── impl-agent-001                  ├── impl-agent-002
└── playtest-agent-001              └── playtest-agent-002
```

Rules:
1. Each pipeline works on a different feature
2. Features must be parallelizable (marked 🔀 in roadmap)
3. Agents post to shared channels with feature name prefix
4. No two agents modify the same files

---

## Logging

All output is logged to `logs/` directory:

```bash
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/$(date +%Y%m%d-%H%M%S)-${AGENT_NAME}.log"

claude --dangerously-skip-permissions --print \
  -p "$PROMPT" \
  2>&1 | tee "$LOG_FILE"
```

Logs include:
- Full agent conversation
- All tool calls and results
- Timestamps
- Exit status

---

## Human Review Gate

Before merge, humans review:

1. `work-orders/[feature]/READY_FOR_REVIEW.md` - Summary
2. `work-orders/[feature]/playtest-report.md` - Test results
3. `work-orders/[feature]/screenshots/` - Visual verification
4. Git diff of changes
5. Log files if needed

Approval command:
```bash
./agents/autonomous-dev/scripts/approve-feature.sh [feature-name]
```

This:
1. Updates `MASTER_ROADMAP.md`
2. Creates git commit
3. Archives work-order to `work-orders/archive/`

---

## Error Handling

### Agent Crash
- Orchestrator detects non-zero exit
- Posts BLOCKED status to channel
- Logs error details
- Waits for human intervention or retry

### Test Failure Loop
- Maximum 3 implementation attempts
- After 3 failures, mark as BLOCKED
- Human must intervene

### Playtest Failure Loop
- Maximum 5 playtest iterations
- After 5 failures, mark as BLOCKED
- Human must review playtest reports

---

## Configuration

Environment variables:

```bash
# Required
export NATS_URL="nats://34.185.163.86:4222"
export NATS_USER="orchestrator"
export NATS_PASSWORD="your-password"

# Optional
export MAX_IMPL_RETRIES=3
export MAX_PLAYTEST_RETRIES=5
export LOG_DIR="logs"
export WORK_ORDER_DIR="agents/autonomous-dev/work-orders"
```

---

## Quick Start

```bash
# Run the full pipeline for next available feature
./agents/autonomous-dev/scripts/orchestrator.sh

# Run for a specific feature
./agents/autonomous-dev/scripts/orchestrator.sh --feature "building-placement-ui"

# Run a specific agent only
./agents/autonomous-dev/scripts/run-spec-agent.sh
./agents/autonomous-dev/scripts/run-impl-agent.sh --work-order work-orders/feature/work-order.md
```

---

## Monitoring

Watch agent activity:
```bash
# Follow logs in real-time
tail -f logs/*.log

# Check NATS channels
nats sub "ai_village.chatroom.>" --context=gcp-orchestrator

# Check active work
grep -l "IN-PROGRESS" agents/autonomous-dev/work-orders/*/work-order.md
```
