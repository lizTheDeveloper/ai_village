# WORK ORDER: Governance System Implementation

**Timestamp:** 2026-01-01 15:24:18 UTC
**Feature:** governance-system
**Phase:** Phase 14
**Priority:** MEDIUM - Community feature, not blocking core gameplay
**Status:** OPEN

---

## Overview

Implement governance system for villages to elect leaders, vote on policies, and manage collective decisions.

**Status:** Phase 14 is marked as ⏳ READY in the roadmap
**Dependencies:** Phase 12 (Economy & Trade) ✅ Complete

---

## Spec Reference

**Spec Location:** Check for governance spec in `openspec/specs/` or create from roadmap requirements

---

## Core Features Needed

### 1. Leadership System
- Village leader election
- Leader roles and responsibilities
- Leader actions (call meetings, propose laws)
- Term limits and succession

### 2. Voting System
- Proposal creation
- Voting mechanisms (simple majority, supermajority, consensus)
- Vote tracking and results
- Voting rights (all adults, property owners, etc.)

### 3. Policy Management
- Policy types (tax rates, building permissions, trade agreements)
- Policy effects on village
- Policy enforcement
- Policy expiration/renewal

### 4. Meeting System
- Village council meetings
- Attendance tracking
- Discussion and deliberation
- Decision recording

---

## Implementation Approach

### Step 1: Research Existing Spec
Check if governance spec exists:
- `openspec/specs/governance-system/spec.md`
- `custom_game_engine/architecture/GOVERNANCE_SPEC.md`

If no spec exists, create work order for spec agent first.

### Step 2: Core Components
Create governance components:
- `GovernanceComponent` - Village governance state
- `LeaderComponent` - Leader-specific data
- `ProposalComponent` - Proposal/vote tracking
- `PolicyComponent` - Active policies

### Step 3: Core Systems
Implement governance systems:
- `GovernanceSystem` - Process elections, votes, policies
- `MeetingSystem` - Handle council meetings
- `ElectionSystem` - Run elections and count votes

### Step 4: Integration
Integrate with existing systems:
- Social system (influence voting)
- Economy (policy effects on trade/tax)
- Events (governance events)

### Step 5: Tests
- Unit tests for voting logic
- Integration tests for elections
- System tests for policy effects

---

## Files to Create (Estimated)

### Components
- `packages/core/src/components/GovernanceComponent.ts`
- `packages/core/src/components/LeaderComponent.ts`
- `packages/core/src/components/ProposalComponent.ts`
- `packages/core/src/components/PolicyComponent.ts`

### Systems
- `packages/core/src/systems/GovernanceSystem.ts`
- `packages/core/src/systems/ElectionSystem.ts`
- `packages/core/src/systems/MeetingSystem.ts`

### Actions
- `packages/core/src/actions/governance/ProposeAction.ts`
- `packages/core/src/actions/governance/VoteAction.ts`
- `packages/core/src/actions/governance/CallMeetingAction.ts`

### Tests
- `packages/core/src/__tests__/Governance.test.ts`
- `packages/core/src/__tests__/Elections.test.ts`
- `packages/core/src/__tests__/Voting.test.ts`

---

## Estimated Effort

**Total LOC:** ~2,000 lines (if spec exists)
**Difficulty:** MEDIUM
**Blockers:** May need spec creation first

---

## Next Steps

1. Check if governance spec exists
2. If no spec: Create work order for spec agent to write governance spec
3. If spec exists: Implementation agent can start immediately
4. Define components and systems based on spec
5. Implement core voting/election logic
6. Integrate with existing village systems
7. Write tests
8. Hand off for verification

---

**Note:** This work order may need to be preceded by spec creation. Implementation agent should verify spec exists before starting.

**Status:** OPEN - Waiting for implementation agent to claim
