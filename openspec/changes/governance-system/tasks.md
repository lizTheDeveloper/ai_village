# Tasks: governance-system

## Overview
Implement governance system for villages including leadership structures (democracy, monarchy, council, anarchy), law systems, voting, political relationships, and factions.

**Estimated Effort:** 40-55 hours | **Phase:** 14 (Governance)

## Phase 1: Core Components (4-5 hours)

- [ ] Create `GovernanceComponent.ts` (village singleton)
  - [ ] Properties: type, leaders[], laws[], proposals[], stability, legitimacy
- [ ] Create `LeadershipComponent.ts` (individual leaders)
  - [ ] Properties: agentId, title, role, authorityLevel, approvalRating
- [ ] Create `LawComponent.ts` (individual laws)
  - [ ] Properties: id, description, domain, provisions[], punishment[]
- [ ] Create `ProposalComponent.ts` (pending proposals/votes)
  - [ ] Properties: id, description, requiredVotes, votes[], status
- [ ] Create `FactionComponent.ts` (political groups)
  - [ ] Properties: name, ideology, members[], leader
- [ ] Update `ComponentType.ts` with new types
- [ ] Export all from `packages/core/src/index.ts`

## Phase 2: Democracy Implementation (6-8 hours)

- [ ] Implement election scheduling (every 30 days configurable)
- [ ] Create `ElectionSystem.ts`
  - [ ] Allow agents to run for mayor
  - [ ] Voting logic (approval, personality, relationships)
  - [ ] Tally votes, announce winner
- [ ] Implement proposal system
  - [ ] Agents can propose laws
  - [ ] Proposals need council/vote approval
- [ ] Test democratic village
  - [ ] Hold election, 3 candidates
  - [ ] Winner takes office
  - [ ] Mayor proposes law -> vote scheduled

## Phase 3: Monarchy Implementation (4-5 hours)

- [ ] Implement ruler appointment (initial or hereditary)
- [ ] Implement decree system
  - [ ] Ruler can create laws without voting
  - [ ] Laws active immediately
- [ ] Implement tax setting
  - [ ] Ruler sets tax rate unilaterally
  - [ ] Agents pay taxes
- [ ] Implement rebellion mechanics
  - [ ] Low approval (< 20%) -> rebellion chance
  - [ ] Rebellion can overthrow ruler
- [ ] Test monarchy
  - [ ] Ruler decrees "Curfew after dark"
  - [ ] Ruler sets 20% tax
  - [ ] Approval drops -> rebellion triggers

## Phase 4: Other Government Types (6-8 hours)

- [ ] Implement Council government
  - [ ] Small group leadership
  - [ ] Consensus or majority decisions
  - [ ] Council member elections
- [ ] Implement Theocracy government
  - [ ] Religious leader with divine mandate
  - [ ] Laws based on religious doctrine
  - [ ] Link to divinity system
- [ ] Implement Anarchy
  - [ ] No central authority
  - [ ] Emergent order from agent interactions
  - [ ] Reputation-based enforcement

## Phase 5: Law System (5-6 hours)

- [ ] Create LawRegistry
  - [ ] Store all active laws
  - [ ] Query laws by domain
- [ ] Create `LawEnforcementSystem.ts`
  - [ ] Check agent actions against laws
  - [ ] Detect violations (violence, theft, etc.)
- [ ] Apply penalties
  - [ ] Fines: deduct currency
  - [ ] Jail: restrict movement
  - [ ] Exile: remove from village
- [ ] Track violations in memory
  - [ ] Add to agent's episodic memory
  - [ ] Affect reputation
- [ ] Test law enforcement
  - [ ] Law: "No violence" -> penalty: jail 1 day
  - [ ] Agent commits violence -> jailed
  - [ ] Memory: "I was jailed for fighting"

## Phase 6: Voting System (6-8 hours)

- [ ] Create `VotingSystem.ts`
- [ ] Implement proposal creation
  - [ ] Agent or leader creates proposal
  - [ ] Set required votes, description
- [ ] Implement campaign period
  - [ ] Agents discuss proposal (LLM or template)
  - [ ] 2-day campaign period
- [ ] Implement voting mechanics
  - [ ] Agents cast yes/no votes
  - [ ] Voting influenced by: approval, promises, personality
- [ ] Tally votes and execute outcomes
  - [ ] Majority wins -> implement proposal
  - [ ] Failed -> proposal abandoned
- [ ] Test voting workflow
  - [ ] Proposal: "Build town wall"
  - [ ] Campaign: agents discuss
  - [ ] Vote: 12 yes, 5 no -> passes
  - [ ] Wall construction starts

## Phase 7: Factions (4-5 hours)

- [ ] Create `FactionSystem.ts`
- [ ] Implement ideology detection
  - [ ] Detect shared ideologies (pro-trade, militarist, isolationist)
  - [ ] Group agents into factions
- [ ] Implement faction leadership
  - [ ] Faction leader: highest social skill
- [ ] Implement bloc voting
  - [ ] Faction members vote together on proposals
- [ ] Test faction conflict
  - [ ] 5 agents share "pro-trade" ideology -> faction forms
  - [ ] Vote on trade agreement -> faction votes together
  - [ ] Pro-trade vs isolationist conflict

## Phase 8: Approval Rating (3-4 hours)

- [ ] Implement approval tracking
  - [ ] Track per-agent approval of leaders (0-1 scale)
- [ ] Update approval on events
  - [ ] Good harvest -> +0.1 approval
  - [ ] Failed war -> -0.3 approval
- [ ] Trigger consequences
  - [ ] Approval < 0.3 -> recall election
  - [ ] Approval < 0.2 -> coup/rebellion
- [ ] Display approval in UI
  - [ ] Show leader approval rating
  - [ ] Visual indicator (green/yellow/red)
- [ ] Test approval system
  - [ ] Mayor starts 0.7 approval
  - [ ] Good harvest -> 0.8
  - [ ] Failed war -> 0.5
  - [ ] < 0.3 -> recall election

## Phase 9: UI Integration (6-8 hours)

- [ ] Create `GovernancePanel.ts`
  - [ ] Display government type, leaders, laws
- [ ] Create proposal list component
  - [ ] Show pending proposals
  - [ ] Display vote counts
- [ ] Create election interface
  - [ ] List candidates
  - [ ] Show voting UI
- [ ] Create faction viewer
  - [ ] Display factions, members, ideologies
- [ ] Test UI
  - [ ] All panels render correctly
  - [ ] Data updates in real-time
  - [ ] User can interact (vote, propose)

## Testing

### Unit Tests
- [ ] Test law violation detection
- [ ] Test voting tally (majority, supermajority)
- [ ] Test approval rating calculation
- [ ] Test faction ideology detection

### Integration Tests
- [ ] Test full election cycle (announce -> campaign -> vote -> winner)
- [ ] Test proposal workflow (propose -> vote -> implement)
- [ ] Test law enforcement (violation -> penalty applied)
- [ ] Test government transition (democracy -> monarchy)

### Manual Scenarios
- [ ] Democratic Village: Run 3 elections, propose and vote on laws
- [ ] Monarchist Coup: Democratic village -> rebellion -> monarchy
- [ ] Faction Conflict: Pro-trade vs isolationist factions vote differently
- [ ] Anarchy Emergence: No leaders, emergent order

### Performance Requirements
- [ ] Election processing < 50ms for 100 agents
- [ ] Vote counting < 10ms per vote
- [ ] Law enforcement < 1ms per agent per tick
- [ ] Faction detection < 100ms per village
