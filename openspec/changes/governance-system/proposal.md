# Proposal: Work Order: Governance System

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/governance-system

---

## Original Work Order

# Work Order: Governance System

**Phase:** 14 (Governance)
**Created:** 2026-01-02
**Status:** READY_FOR_IMPLEMENTATION
**Priority:** MEDIUM

---

## Spec Reference

- **Primary Spec:** [openspec/specs/governance-system/spec.md](../../../../openspec/specs/governance-system/spec.md)
- **Dependencies:**
  - ✅ Phase 12 (Economy) - Currency, trading, market events
  - ✅ Phase 4 (Memory & Social) - Relationships, episodic memory
  - ✅ Phase 5 (Communication) - Agent conversations

---

## Context

Villages need social organization beyond individual agents. Governance provides:
- **Leadership structures** (democracy, monarchy, council, anarchy)
- **Law systems** (create, enforce, break laws)
- **Decision making** (voting, decrees, consensus)
- **Political relationships** (trust, approval, factions)

**Use Cases:**
- Democratic village votes on tax rates
- Monarchy issues decrees (build wall, wage war)
- Council elects leaders based on skill/reputation
- Anarchist village has no central authority
- Agents break laws → punishment or rebellion

---

## Requirements Summary

### Feature 1: Government Types
Different governance paradigms with unique mechanics:
1. **Democracy** - Elections, voting, majority rule
2. **Monarchy** - Hereditary or appointed ruler, absolute power
3. **Council** - Small group leadership, consensus or majority
4. **Theocracy** - Religious leader, divine mandate
5. **Anarchy** - No central authority, emergent order

### Feature 2: Leadership Roles
Positions with powers and responsibilities:
1. **Mayor/Leader** - Executive decisions
2. **Council Members** - Legislative voting
3. **Judge** - Dispute resolution, law enforcement
4. **Tax Collector** - Economic management
5. **Military Commander** - Defense, aggression

### Feature 3: Law System
Create and enforce rules:
1. Laws have conditions and penalties (if X then penalty Y)
2. Agents can propose laws (democracy) or decree laws (monarchy)
3. Law enforcement: catch violations, apply penalties
4. Agents can break laws intentionally (rebellion, desperation)
5. Laws can be repealed or modified

### Feature 4: Voting System
Collective decision making:
1. Proposals (build building, change tax rate, declare war)
2. Voting methods (simple majority, supermajority, weighted by wealth)
3. Campaign period (agents discuss, persuade)
4. Vote counting and resolution
5. Implementation of passed proposals

### Feature 5: Political Relationships
Trust, approval, factions:
1. Agents have approval rating of leaders
2. Factions form around ideologies (pro-trade, isolationist, militarist)
3. Political events affect approval (good harvest → +approval, failed war → -approval)
4. Low approval → elections, coups, revolutions

---

## Acceptance Criteria

### Criterion 1: GovernanceComponent
- **WHEN:** A village is created
- **THEN:** The system SHALL:
  1. Create GovernanceComponent singleton for village
  2. Support government type (democracy, monarchy, council, theocracy, anarchy)
  3. Track current leaders (mayor, council members, etc.)
  4. Track active laws
  5. Track pending proposals/votes
- **Verification:**
  - Village created → GovernanceComponent exists
  - governmentType: 'democracy'
  - leaders: [{role: 'mayor', agentId: '...', approvalRating: 0.75}]
  - laws: [{id: 1, description: 'No theft', penalty: 'fine_10_gold'}]
  - proposals: []

### Criterion 2: Government Type: Democracy
- **WHEN:** A democratic village operates
- **THEN:** The system SHALL:
  1. Hold elections every N days (configurable, e.g., 30 days)
  2. Allow any agent to run for mayor
  3. Agents vote based on approval, personality, relationships
  4. Winner becomes mayor with term limit
  5. Mayor can propose laws, but needs council/vote approval
- **Verification:**
  - Day 30 → election triggered
  - 3 agents run for mayor
  - Voting occurs, winner determined
  - New mayor takes office
  - Mayor proposes law → vote scheduled

### Criterion 3: Government Type: Monarchy
- **WHEN:** A monarchy operates
- **THEN:** The system SHALL:
  1. Ruler appointed or hereditary (ruler's child inherits)
  2. Ruler can decree laws without voting
  3. Ruler sets tax rates unilaterally
  4. Low approval can trigger coup or revolution
  5. Ruler can be overthrown by rebellion
- **Verification:**
  - Ruler decrees law: "Curfew after dark" → law active immediately
  - Ruler sets tax: 20% → all agents pay 20% of income
  - Approval drops to 20% → rebellion chance increases
  - Rebellion succeeds → new government type or new ruler

### Criterion 4: Law Creation and Enforcement
- **WHEN:** A law is created
- **THEN:** The system SHALL:
  1. Define law with condition and penalty
  2. Track law violations via LawEnforcementSystem
  3. Apply penalties when violations detected
  4. Record violations in agent's memory
  5. Affect agent's reputation
- **Verification:**
  - Law created: "No violence" → penalty: "jail_1_day"
  - Agent commits violence → violation detected
  - Penalty applied: agent jailed for 1 day (can't move)
  - Agent memory: "I was jailed for fighting"
  - Reputation decreases

### Criterion 5: Proposal and Voting System
- **WHEN:** An agent proposes something
- **THEN:** The system SHALL:
  1. Create proposal with description, required votes
  2. Campaign period (agents discuss, LLM-driven persuasion)
  3. Voting period (agents cast votes)
  4. Tally votes, determine outcome
  5. Implement proposal if passed
- **Verification:**
  - Agent proposes: "Build town wall" (cost: 500 gold, 100 wood)
  - Campaign period: 2 days (agents discuss)
  - Voting period: 1 day (agents vote yes/no)
  - Votes: 12 yes, 5 no → proposal passes
  - Town wall construction starts

### Criterion 6: Leadership Elections
- **WHEN:** An election occurs
- **THEN:** The system SHALL:
  1. Announce election (all agents notified)
  2. Candidates declare (agents can run)
  3. Campaign period (candidates persuade voters)
  4. Voting day (agents vote)
  5. Winner announced, takes office
- **Verification:**
  - Election announced on day 29
  - 3 agents declare candidacy
  - Campaign: candidates socialize, make promises
  - Voting: agents vote based on approval, promises, personality
  - Winner takes office as mayor

### Criterion 7: Political Factions
- **WHEN:** Agents form political groups
- **THEN:** The system SHALL:
  1. Detect shared ideologies (pro-trade, militarist, isolationist)
  2. Group agents into factions
  3. Factions influence voting (members vote together)
  4. Faction leaders emerge (high charisma/social skill)
  5. Inter-faction conflict possible
- **Verification:**
  - 5 agents share "pro-trade" ideology → faction forms
  - Faction leader: Agent with highest social skill
  - Vote on trade agreement → faction members vote together
  - Faction conflict: pro-trade vs isolationist

### Criterion 8: Approval Rating System
- **WHEN:** Leaders make decisions
- **THEN:** The system SHALL:
  1. Track approval rating per agent (0-1 scale)
  2. Decisions affect approval (good → +approval, bad → -approval)
  3. Events affect approval (harvest success, war loss)
  4. Low approval triggers consequences (recall election, coup)
  5. Display approval to player
- **Verification:**
  - Mayor starts with 0.7 approval
  - Good harvest → +0.1 approval (now 0.8)
  - Failed war → -0.3 approval (now 0.5)
  - Approval < 0.3 → recall election triggered
  - New election held

---

## Implementation Steps

1. **Core Components** (4-5 hours)
   - Create GovernanceComponent (village singleton)
   - Create LeadershipComponent (individual leaders)
   - Create LawComponent (individual laws)
   - Create ProposalComponent (pending proposals/votes)
   - Create FactionComponent (political groups)

2. **Government Types** (6-8 hours)
   - Implement Democracy (elections, voting)
   - Implement Monarchy (decrees, inheritance)
   - Implement Council (small group leadership)
   - Implement Theocracy (religious leader)
   - Implement Anarchy (no central authority)

3. **Law System** (5-6 hours)
   - Create LawRegistry
   - Implement LawEnforcementSystem
   - Add violation detection
   - Apply penalties (fines, jail, exile)
   - Track violations in memory

4. **Voting System** (6-8 hours)
   - Create VotingSystem
   - Implement proposal creation
   - Add campaign period (LLM-driven persuasion)
   - Implement voting mechanics
   - Tally votes and execute outcomes

5. **Elections** (5-6 hours)
   - Create ElectionSystem
   - Schedule elections (term limits)
   - Allow candidacy declaration
   - Campaign period (promises, debates)
   - Conduct voting
   - Install winner

6. **Factions** (4-5 hours)
   - Create FactionDetectionSystem
   - Detect shared ideologies
   - Group agents into factions
   - Elect faction leaders
   - Implement bloc voting

7. **Approval Rating** (3-4 hours)
   - Track approval per agent
   - Update approval on events
   - Display approval in UI
   - Trigger consequences (low approval)

8. **UI Integration** (6-8 hours)
   - Governance panel (government type, leaders, laws)
   - Proposal list (pending votes)
   - Election interface (candidates, voting)
   - Faction viewer (factions, members, ideologies)

---

## Testing Plan

### Unit Tests
- Test law violation detection
- Test voting tally (majority, supermajority)
- Test approval rating calculation
- Test faction detection

### Integration Tests
- Test full election cycle
- Test proposal → vote → implementation
- Test law enforcement (violation → penalty)
- Test government type transitions (democracy → monarchy)

### Scenario Tests
1. **Democratic Village**: 3 elections, laws proposed and voted on
2. **Monarchist Coup**: Democratic village → rebellion → monarchy
3. **Faction Conflict**: Pro-trade faction vs isolationist faction
4. **Anarchy Emergence**: No leaders, emergent order

---

## Performance Requirements

- **Election Processing**: < 50ms for 100 agents
- **Vote Counting**: < 10ms per vote
- **Law Enforcement**: < 1ms per agent per tick (checks violations)
- **Faction Detection**: < 100ms per village

---

## Success Metrics

1. ✅ All 8 acceptance criteria met
2. ✅ All 5 government types implemented
3. ✅ Elections, proposals, and voting work correctly
4. ✅ Law enforcement functional
5. ✅ Factions form and influence voting
6. ✅ UI displays governance state clearly

---

## Dependencies

- ✅ Phase 12 (Economy) - Tax collection, fines
- ✅ Phase 4 (Memory & Social) - Agent relationships affect voting
- ✅ Phase 5 (Communication) - Campaign speeches, debates
- ⚠️ LLM Integration - Persuasion, campaign promises (can be template-based initially)

---

## Future Enhancements (Not in This Work Order)

- Diplomacy between villages (alliances, treaties, wars)
- Corruption system (bribery, embezzlement)
- Propaganda system (control information)
- Revolution mechanics (overthrow government)
- Constitution (foundational laws that constrain government)

---

## Implementation Checklist

### Phase 1: Core Components (4-5 hours) - File: `packages/core/src/components/`
- [ ] Create `GovernanceComponent.ts` (village singleton)
  - Properties: type, leaders[], laws[], proposals[], stability, legitimacy
- [ ] Create `LeadershipComponent.ts` (individual leaders)
  - Properties: agentId, title, role, authorityLevel, approvalRating
- [ ] Create `LawComponent.ts` (individual laws)
  - Properties: id, description, domain, provisions[], punishment[]
- [ ] Create `ProposalComponent.ts` (pending proposals/votes)
  - Properties: id, description, requiredVotes, votes[], status
- [ ] Create `FactionComponent.ts` (political groups)
  - Properties: name, ideology, members[], leader
- [ ] Update `ComponentType.ts` with new types
- [ ] Export all from `packages/core/src/index.ts`

### Phase 2: Democracy Implementation (6-8 hours) - File: `packages/core/src/systems/GovernanceSystem.ts`
- [ ] Implement election scheduling (every 30 days configurable)
- [ ] Create `ElectionSystem.ts`
  - Allow agents to run for mayor
  - Voting logic (approval, personality, relationships)
  - Tally votes, announce winner
- [ ] Implement proposal system
  - Agents can propose laws
  - Proposals need council/vote approval
- [ ] Test democratic village
  - Hold election, 3 candidates
  - Winner takes office
  - Mayor proposes law → vote scheduled

### Phase 3: Monarchy Implementation (4-5 hours)
- [ ] Implement ruler appointment (initial or hereditary)
- [ ] Implement decree system
  - Ruler can create laws without voting
  - Laws active immediately
- [ ] Implement tax setting
  - Ruler sets tax rate unilaterally
  - Agents pay taxes
- [ ] Implement rebellion mechanics
  - Low approval (< 20%) → rebellion chance
  - Rebellion can overthrow ruler
- [ ] Test monarchy
  - Ruler decrees "Curfew after dark"
  - Ruler sets 20% tax
  - Approval drops → rebellion triggers

### Phase 4: Law System (5-6 hours) - File: `packages/core/src/systems/LawEnforcementSystem.ts`
- [ ] Create LawRegistry
  - Store all active laws
  - Query laws by domain
- [ ] Implement violation detection
  - Check agent actions against laws
  - Detect violations (e.g., violence, theft)
- [ ] Apply penalties
  - Fines: deduct currency
  - Jail: restrict movement
  - Exile: remove from village
- [ ] Track violations in memory
  - Add to agent's episodic memory
  - Affect reputation
- [ ] Test law enforcement
  - Law: "No violence" → penalty: jail 1 day
  - Agent commits violence → jailed
  - Memory: "I was jailed for fighting"

### Phase 5: Voting System (6-8 hours) - File: `packages/core/src/systems/VotingSystem.ts`
- [ ] Implement proposal creation
  - Agent or leader creates proposal
  - Set required votes, description
- [ ] Implement campaign period
  - Agents discuss proposal (LLM or template)
  - 2-day campaign period
- [ ] Implement voting mechanics
  - Agents cast yes/no votes
  - Voting influenced by: approval, promises, personality
- [ ] Tally votes and execute outcomes
  - Majority wins → implement proposal
  - Failed → proposal abandoned
- [ ] Test voting workflow
  - Proposal: "Build town wall"
  - Campaign: agents discuss
  - Vote: 12 yes, 5 no → passes
  - Wall construction starts

### Phase 6: Factions (4-5 hours) - File: `packages/core/src/systems/FactionSystem.ts`
- [ ] Implement ideology detection
  - Detect shared ideologies (pro-trade, militarist, isolationist)
  - Group agents into factions
- [ ] Implement faction leadership
  - Faction leader: highest social skill
- [ ] Implement bloc voting
  - Faction members vote together on proposals
- [ ] Test faction conflict
  - 5 agents share "pro-trade" ideology → faction forms
  - Vote on trade agreement → faction votes together
  - Pro-trade vs isolationist conflict

### Phase 7: Approval Rating (3-4 hours)
- [ ] Implement approval tracking
  - Track per-agent approval of leaders (0-1 scale)
- [ ] Update approval on events
  - Good harvest → +0.1 approval
  - Failed war → -0.3 approval
- [ ] Trigger consequences
  - Approval < 0.3 → recall election
  - Approval < 0.2 → coup/rebellion
- [ ] Display approval in UI
  - Show leader approval rating
  - Visual indicator (green/yellow/red)
- [ ] Test approval system
  - Mayor starts 0.7 approval
  - Good harvest → 0.8
  - Failed war → 0.5
  - < 0.3 → recall election

### Phase 8: UI Integration (6-8 hours) - File: `packages/renderer/src/GovernancePanel.ts`
- [ ] Create governance panel component
  - Display government type, leaders, laws
- [ ] Create proposal list component
  - Show pending proposals
  - Display vote counts
- [ ] Create election interface
  - List candidates
  - Show voting UI
- [ ] Create faction viewer
  - Display factions, members, ideologies
- [ ] Test UI
  - All panels render correctly
  - Data updates in real-time
  - User can interact (vote, propose)

---

## Test Requirements

### Unit Tests
**Create: `packages/core/src/systems/__tests__/GovernanceSystem.test.ts`**
- [ ] Test law violation detection
- [ ] Test voting tally (majority, supermajority)
- [ ] Test approval rating calculation
- [ ] Test faction ideology detection

### Integration Tests
**Create: `packages/core/src/systems/__tests__/GovernanceIntegration.test.ts`**
- [ ] Test full election cycle (announce → campaign → vote → winner)
- [ ] Test proposal workflow (propose → vote → implement)
- [ ] Test law enforcement (violation → penalty applied)
- [ ] Test government transition (democracy → monarchy)

### Manual Scenarios
1. **Democratic Village**: Run 3 elections, propose and vote on laws
2. **Monarchist Coup**: Democratic village → rebellion → monarchy
3. **Faction Conflict**: Pro-trade vs isolationist factions vote differently
4. **Anarchy Emergence**: No leaders, emergent order

---

## Definition of Done

- [ ] **All implementation tasks complete**
  - All 5 government types implemented
  - Elections, proposals, voting functional
  - Law enforcement working
  - Factions form and influence voting

- [ ] **Unit tests passing**
  - All unit tests written and passing
  - Code coverage > 80%

- [ ] **Integration tests passing**
  - All integration scenarios work end-to-end
  - Government transitions verified

- [ ] **Manual testing complete**
  - All 4 scenarios tested successfully
  - Screenshots/videos captured
  - No unexpected behaviors

- [ ] **Documentation updated**
  - governance-system/spec.md updated with implementation notes
  - Code comments added
  - Tutorial for players

- [ ] **No TypeScript errors**
  - `npm run build` passes
  - All types properly exported

- [ ] **Performance validated**
  - Election processing < 50ms for 100 agents
  - Vote counting < 10ms per vote
  - Law enforcement < 1ms per agent per tick
  - Faction detection < 100ms per village

- [ ] **UI displays correctly**
  - All governance panels render
  - Data updates in real-time
  - User interactions work

---

## Pre-Test Checklist (N/A - Status: READY_FOR_IMPLEMENTATION)

_This section applies only to READY_FOR_TESTS status._

---

## Notes

- Start with Democracy and Monarchy (most common)
- Keep law system simple initially (expand later)
- Template-based persuasion is acceptable (LLM integration later)
- Focus on core mechanics, polish UI later
- Consider performance (don't check every agent every tick)


---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
