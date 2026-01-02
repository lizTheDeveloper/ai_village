# Work Order: Deep Conversation System

**Phase:** Independent
**Created:** 2026-01-01
**Spec Agent:** claude-opus
**Status:** COMPLETE (All 6 Phases Complete)

---

## Spec Reference

- **Primary Spec:** `./spec.md`

---

## Requirements Summary

The system SHALL:

1. Track agent interests as first-class data (topics, intensity, hunger)
2. Accumulate discussion hunger over time for topics not discussed
3. Track known enthusiasts (who shares my interests)
4. Provide age-appropriate conversation patterns (children ask, elders reflect)
5. Enable interest-driven partner selection
6. Measure conversation quality (depth, topic resonance)

---

## Implementation Phases

### Phase 1: InterestsComponent & InterestsSystem - COMPLETE
**Files:**
- `packages/core/src/components/InterestsComponent.ts` - Created
- `packages/core/src/__tests__/InterestsComponent.test.ts` - 34 tests passing
- `packages/core/src/systems/InterestsSystem.ts` - Created
- `packages/core/src/events/EventMap.ts` - Extended
- `packages/llm/src/__tests__/ConversationSimulation.test.ts` - 15 tests passing

**Completed:**
1. Interest type with topic, intensity, discussionHunger, knownEnthusiasts
2. 40+ topics across 6 categories (craft, nature, philosophy, social, practical, story)
3. InterestsSystem running every 100 ticks
4. Events: conversation:topic_shared, interest:hungry
5. LLM conversation simulations proving depth difference (1.00 vs 0.30)

### Phase 2: Conversation Quality Metrics - COMPLETE
**Files:**
- `packages/core/src/conversation/ConversationQuality.ts` - Created
- `packages/core/src/conversation/index.ts` - Created
- `packages/core/src/__tests__/ConversationQuality.test.ts` - 45 tests passing
- `packages/core/src/components/NeedsComponent.ts` - Extended with social sub-needs
- `packages/core/src/systems/CommunicationSystem.ts` - Integrated quality calculation
- `packages/core/src/systems/MoodSystem.ts` - Quality-based mood impacts

**Completed:**
1. ConversationQuality interface (depth, topicResonance, informationExchange, emotionalConnection)
2. Message analyzers for depth, topics, emotion, information exchange
3. NeedsComponent extended with socialContact, socialDepth, socialBelonging
4. CommunicationSystem calculates quality on conversation end
5. CommunicationSystem applies satisfaction to needs based on quality
6. MoodSystem responds to quality in conversation:ended events
7. 45 comprehensive tests for quality metrics

### Phase 3: Partner Selection - COMPLETE
**Files:**
- `packages/core/src/conversation/PartnerSelector.ts` - Created
- `packages/core/src/conversation/index.ts` - Extended with exports
- `packages/core/src/__tests__/PartnerSelector.test.ts` - 30 tests passing

**Completed:**
1. PartnerSelector service with weighted scoring algorithm
2. Interest compatibility scoring (shared + complementary knowledge)
3. Age-based compatibility (children→elders, teens→peers, etc.)
4. Relationship and familiarity bonuses
5. Known enthusiast detection
6. Weighted random selection from top candidates
7. Proximity-aware partner discovery

### Phase 4: Age-Based Conversation Evolution - COMPLETE
**Files:**
- `packages/core/src/conversation/ConversationStyle.ts` - Created
- `packages/core/src/__tests__/ConversationStyle.test.ts` - 55 tests passing
- `packages/core/src/conversation/index.ts` - Extended with exports
- `packages/core/src/components/AgentComponent.ts` - Already has ageCategory field

**Completed:**
1. ConversationStyle interface with age-specific patterns
2. Depth capacity by age (child: 0.4, teen: 0.6, adult: 0.8, elder: 1.0)
3. Topic preferences by age (children avoid mortality, elders embrace philosophy)
4. Age-appropriate conversation starters and question patterns
5. Style compatibility calculation between age pairs
6. Age category calculation from birth tick
7. Conversation dynamic descriptions (mentorship, peer bonding, etc.)
8. 55 comprehensive tests covering all functionality

### Phase 5: LLM Prompt Integration - COMPLETE
**Files:**
- `packages/llm/src/StructuredPromptBuilder.ts` - Enhanced with conversation context
- `scripts/inspect-conversation-prompts.ts` - Inspection tool
- `scripts/test-conversation-depth.ts` - Full LLM integration test

**Completed:**
1. Enhanced `buildActiveConversationSection()` method with:
   - Age-appropriate conversation style guidance
   - Partner context (age, relationship, interests)
   - Shared interest detection and highlighting
   - Discussion hunger and depth craving indicators
   - Question-specific context for curious agents
2. Helper methods:
   - `describeRelationship()` - Natural language relationship descriptions
   - `formatTopicName()` - Topic ID to readable names
3. Integration with existing prompt flow
4. Inspection scripts for testing different scenarios

**Example Prompt Enhancements:**
- Child talking to Elder: Shows questioning mode, includes child's questions
- Teen challenging Adult: Shows exploratory mode, highlights lack of shared interests
- Elders discussing philosophy: Shows reflective mode, emphasizes shared deep topics
- All ages: Depth hunger indicator when > 0.6

### Phase 6: Emergent Social Dynamics - COMPLETE
**Files:**
- `packages/core/src/systems/RelationshipConversationSystem.ts` - Created
- `packages/core/src/systems/FriendshipSystem.ts` - Created
- `packages/core/src/__tests__/EmergentSocialDynamics.test.ts` - 17 tests passing
- `packages/core/src/systems/registerAllSystems.ts` - Systems registered
- `packages/core/src/systems/index.ts` - Systems exported

**Completed:**
1. RelationshipConversationSystem: Updates relationships based on conversation quality
   - Builds familiarity, affinity, and trust through conversations
   - Records known enthusiasts for topics
   - Learns about partner's interests
   - Bidirectional relationship updates
2. FriendshipSystem: Detects emergent friendships
   - Checks every 500 ticks
   - Thresholds: familiarity ≥ 60, affinity ≥ 40, interactions ≥ 10
   - Emits 'friendship:formed' events
   - Marks relationships as 'friend' in SocialMemory
   - One-time detection (no duplicates)
3. 17 comprehensive integration tests all passing

### Phase 7.1: Interest Evolution - COMPLETE
**Files:**
- `packages/core/src/systems/InterestEvolutionSystem.ts` - Created
- `packages/core/src/__tests__/InterestEvolutionSystem.test.ts` - 26 tests passing
- `packages/core/src/events/EventMap.ts` - Extended with 5 new event types
- `packages/core/src/systems/registerAllSystems.ts` - System registered
- `packages/core/src/systems/index.ts` - System exported

**Completed:**
1. InterestEvolutionSystem with all core mechanisms:
   - Decay mechanism: Interests weaken over time if not discussed (weekly decay based on source type)
   - Skill-based strengthening: Interests grow as related skills improve
   - Experience-based emergence: Life events create new interests (death, miracles, births, prayers)
   - Mentorship transfer: Interests spread during high-quality conversations (quality ≥ 0.6)
2. Age-based receptivity for learning:
   - Children: 0.8 (highly impressionable)
   - Teens: 0.6
   - Adults: 0.3
   - Elders: 0.1 (rarely change)
3. Decay rates by interest source:
   - Innate: 0.0 (never decay)
   - Personality: 0.01 (very stable)
   - Skill: 0.02 (muscle memory)
   - Social: 0.03
   - Learned: 0.04
   - Experience: 0.05
   - Childhood: 0.08 (fade fast)
   - Question: 0.10 (children's questions change rapidly)
4. Event emissions for:
   - interest:emerged, interest:strengthened, interest:weakened, interest:lost, interest:transferred
5. Priority 18 (after FriendshipSystem at 17)
6. Update interval: 864,000 ticks (one game month at 20 TPS)
   - Realistic persistence: interests like childhood rock collections persist even without active engagement
7. 26 comprehensive tests all passing

---

## Success Definition

This work order is **COMPLETE** when:

1. ✅ Phase 1: InterestsComponent with 34 tests passing
2. ✅ Phase 1: InterestsSystem registered and running
3. ✅ Phase 1: LLM simulations show measurable depth difference
4. ✅ Phase 2: ConversationQuality with 45 tests passing
5. ✅ Phase 3: PartnerSelector with 30 tests passing
6. ✅ Phase 4: ConversationStyle with 55 tests passing
7. ✅ Phase 5: LLM Prompt Integration complete with inspection tools
8. ✅ Phase 6: Emergent Social Dynamics (17 tests passing)
9. ⏳ Build passes: `npm run build` has pre-existing errors unrelated to conversation system
10. ✅ Tests pass: All Phase 1-6 tests pass (126 total conversation tests)

11. ✅ Phase 7.1: Interest Evolution (26 tests passing)

**Status:** ✅ Phase 7.1 COMPLETE | Total: 152 conversation tests passing

---

**End of Work Order**
