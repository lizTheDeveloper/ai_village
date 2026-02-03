# Parenting System Design

## Overview

The parenting system creates a **biological drive** to care for offspring while leaving the **HOW** (parenting actions and quality) to the LLM. Agents can parent well or poorly based on their personality, skills, and decisions. Child health impacts parent social standing.

## Architecture

### 1. ParentingComponent ✅ IMPLEMENTED

**Location:** `packages/core/src/components/ParentingComponent.ts`

**Tracks:**
- Active parenting responsibilities (children)
- Parenting drive level (none/low/moderate/high/urgent)
- Parenting skill (improves with practice)
- Social reputation from parenting
- Parenting style preferences (protectiveness, teaching, emotional expression, discipline)
- Species-specific care provider (mother/father/both/community)

**Key Features:**
- Drive updates based on child wellbeing
- Skill improves through practice
- Social reputation tracking for notable events
- Desire for children (distinct from having them)

### 2. Species-Specific Parental Care ✅ ALREADY EXISTS

**Location:** `packages/core/src/reproduction/MatingParadigm.ts`

Each species defines its `ParentalCareConfig`:

```typescript
// Humans: Full nurturing, both parents, years
parentalCare: {
  type: 'full_nurturing',
  provider: 'both_parents',
  duration: 'years',
  bondContinuesAfter: true,
  recognizesOffspring: true,
}

// Hive species: Community care, weeks
parentalCare: {
  type: 'hive_integration',
  provider: 'community',
  duration: 'weeks',
  bondContinuesAfter: false,
  recognizesOffspring: false,
}

// Some species: No care
parentalCare: {
  type: 'none',
  provider: 'none',
  duration: 'none',
  bondContinuesAfter: false,
  recognizesOffspring: false,
}
```

### 3. ParentingSystem - TO IMPLEMENT

**Responsibilities:**

1. **Update Parenting Drive** (every tick)
   - Calculate time since last care
   - Assess child wellbeing from:
     - Child's NeedsComponent (hunger, health, energy)
     - Child's age and development stage
     - Child's social connections
   - Update drive level: none → low → moderate → high → urgent

2. **Expose to LLM** (via context builder)
   - List children and their needs
   - Current parenting drive level
   - Suggested actions based on care type:
     - `full_nurturing`: feed, teach, play with, comfort, protect
     - `egg_guarding`: guard eggs, regulate temperature
     - `teaching`: teach skills, share knowledge
     - `communal_care`: coordinate with other caregivers
     - `protection`: defend from threats

3. **Track Parenting Quality**
   - When agent performs parenting action:
     - Assess quality (based on personality, skill, context)
     - Update child wellbeing
     - Improve parent skill slowly
     - Record notable events (successes/failures)

4. **Social Reputation Impact**
   - Monitor child health trends
   - If child thriving: +reputation, notable achievement
   - If child neglected: -reputation, notable failure, neglect warnings
   - Community observes and judges parenting quality

5. **Integration with Existing Systems**
   - **NeedsSystem**: Children have needs, parents fulfill them
   - **RelationshipSystem**: Parent-child relationships
   - **MemorySystem**: Parents remember parenting moments
   - **MoodSystem**: Parenting affects mood (joy from success, stress from difficulty)

### 4. LLM Integration - Parenting Actions

**New Action Definitions** (to add to `ActionDefinitions.ts`):

```typescript
{
  action: 'feed_child',
  description: 'Feed your child to reduce their hunger',
  requirements: {
    hasChild: true,
    childNeedsFeeding: true,
    hasFood: true,
  },
  effects: {
    childHunger: -0.3,
    parentSatisfaction: +0.2,
    parentingSkill: +0.01,
  },
}

{
  action: 'teach_child',
  description: 'Teach your child a skill or knowledge',
  requirements: {
    hasChild: true,
    childCanLearn: true,
    parentHasSkill: true,
  },
  effects: {
    childSkill: +0.1,
    parentSatisfaction: +0.3,
    parentingSkill: +0.02,
    relationship: +0.1,
  },
}

{
  action: 'play_with_child',
  description: 'Play with your child to bond and improve mood',
  requirements: {
    hasChild: true,
    childNeedsAttention: true,
  },
  effects: {
    childMood: +0.2,
    parentMood: +0.1,
    relationship: +0.15,
    parentingSkill: +0.01,
  },
}

{
  action: 'comfort_child',
  description: 'Comfort your distressed child',
  requirements: {
    hasChild: true,
    childDistressed: true,
  },
  effects: {
    childMood: +0.4,
    childStress: -0.3,
    relationship: +0.2,
    parentingSkill: +0.01,
  },
}

{
  action: 'check_on_child',
  description: 'Check if your child is safe and healthy',
  requirements: {
    hasChild: true,
  },
  effects: {
    parentAnxiety: -0.1,
    lastCheckIn: 'now',
  },
}
```

**LLM Prompt Context** (add to StructuredPromptBuilder):

```typescript
// If agent has ParentingComponent with responsibilities
if (parenting && parenting.responsibilities.length > 0) {
  const urgentChild = parenting.getMostUrgentChild();

  context += `\n## Parenting\n`;
  context += `You have ${parenting.responsibilities.length} child(ren).\n`;
  context += `Parenting drive: ${parenting.driveLevel}\n`;
  context += `Parenting skill: ${formatSkillLevel(parenting.parentingSkill)}\n`;

  if (urgentChild) {
    const child = world.getEntity(urgentChild.childId);
    const childNeeds = child.getComponent('needs');

    context += `\n**${child.name} needs attention!**\n`;
    context += `- Health: ${formatPercentage(childNeeds.health)}\n`;
    context += `- Hunger: ${formatPercentage(childNeeds.hunger)}\n`;
    context += `- Wellbeing: ${formatPercentage(urgentChild.childWellbeingAssessment)}\n`;
    context += `- Last checked: ${formatTimeSince(urgentChild.lastCheckIn)}\n`;

    if (urgentChild.neglectWarnings > 0) {
      context += `⚠️ Community is concerned about neglect (${urgentChild.neglectWarnings} warnings)\n`;
    }
  }

  context += `\nAvailable parenting actions: feed_child, teach_child, play_with_child, comfort_child, check_on_child\n`;
}
```

### 5. Social Standing Integration

**ReputationSystem** (or extend RelationshipSystem):

```typescript
// When calculating an agent's social reputation:
function calculateSocialReputation(agent: Entity): number {
  let reputation = baseReputation;

  const parenting = agent.getComponent('parenting');
  if (parenting) {
    // Add parenting reputation modifier
    reputation += parenting.reputation.reputationModifier;

    // Community values good parenting
    if (parenting.reputation.parentingSkill > 0.7) {
      reputation += 0.2; // Bonus for being a good parent
    } else if (parenting.reputation.parentingSkill < 0.3) {
      reputation -= 0.3; // Penalty for being a poor parent
    }

    // Check for notable parenting failures
    const recentFailures = parenting.reputation.notableEvents
      .filter(e => e.type === 'failure' && world.tick - e.tick < 10000);

    if (recentFailures.length > 2) {
      reputation -= 0.5; // Significant penalty for multiple failures
    }
  }

  return reputation;
}
```

**Community Gossip** (optional):

When a child's wellbeing drops below a threshold, nearby agents:
1. Notice the neglect
2. Gossip about the parent
3. Reduce relationship affinity with the parent
4. May intervene (depending on culture)

## Example Gameplay Flow

### Scenario: New Parent

1. **Baby is born** → MidwiferySystem emits `agent:birth` event
2. **ParentingSystem assigns responsibility** → Adds child to parent's ParentingComponent
3. **Parenting drive activates** → Drive level: 'high' (newborn needs constant care)
4. **LLM sees context:** "You have a newborn! Baby Alice needs feeding and is crying."
5. **Agent decides:** "I will feed_child Alice" (based on personality, priorities, mood)
6. **System executes:**
   - Reduces child hunger
   - Improves parent skill slightly
   - Updates last check-in time
   - Child stops crying
7. **Hours pass...** Child gets hungry again
8. **Agent busy hunting:** Ignores parenting drive (poor decision!)
9. **Child wellbeing drops:** Drive level: 'urgent'
10. **Community notices:** "Ada has been neglecting baby Alice!"
11. **Social reputation drops:** -0.2 reputation, +1 neglect warning
12. **Agent returns, sees context:** "⚠️ Baby Alice is severely hungry! Community is concerned."
13. **Agent feeds child:** Wellbeing improves, but reputation damage done

### Scenario: Good Parent

1. **Agent has 2 children** (ages 3 and 7)
2. **Parenting drive: 'moderate'** (older kids, more independent)
3. **Agent prioritizes family:** High 'social' priority, protective personality
4. **Regular care:** teach_child, play_with_child, feed_child throughout the day
5. **Children thrive:** High health, learning skills, happy
6. **Community notices:** "Bob is such a good father!"
7. **Reputation increases:** +0.3 reputation, notable achievement recorded
8. **Parent skill improves:** 0.3 → 0.7 over time
9. **Children grow up healthy:** Community remembers Bob as excellent parent

## Implementation Checklist

### Already Complete ✅
- [x] ParentingComponent created
- [x] Component registered in ComponentType
- [x] Exported from reproduction/index.ts
- [x] Species-specific parental care configs exist in MatingParadigm

### To Implement 🔧
- [ ] **ParentingSystem** (core logic)
  - [ ] Update parenting drive every tick
  - [ ] Calculate child wellbeing
  - [ ] Emit parenting events
  - [ ] Track notable parenting events
  - [ ] Update social reputation

- [ ] **Add to agent creation** (AgentEntity.ts)
  - [ ] `createParentingComponent()` when creating agents
  - [ ] Use species-specific care provider

- [ ] **LLM Integration**
  - [ ] Add parenting actions to ActionDefinitions.ts
  - [ ] Add parenting context to StructuredPromptBuilder.ts
  - [ ] Make parenting drive visible to LLM decision-making

- [ ] **Social System Integration**
  - [ ] Extend ReputationSystem (or RelationshipSystem) with parenting impact
  - [ ] Add community observation of child wellbeing
  - [ ] Add gossip/social pressure for neglect

- [ ] **MidwiferySystem Integration**
  - [ ] When baby born, assign to parent's ParentingComponent
  - [ ] Set care type from species paradigm
  - [ ] Calculate care duration

- [ ] **Register ParentingSystem** in registerAllSystems.ts

## Design Philosophy

**Biological Drive**: The system creates a natural, needs-based motivation to care for children. Parents FEEL the drive, especially when children are in need.

**LLM Freedom**: The system doesn't force specific parenting behaviors. Agents decide HOW to parent based on:
- Their personality (protective? strict? nurturing?)
- Their skills (teaching skill affects teaching quality)
- Their current priorities (work vs family balance)
- Their mood and energy levels

**Social Consequences**: The community observes and judges. Good parents earn respect. Neglectful parents face social stigma. This creates realistic social pressure without hardcoded rules.

**Species Diversity**: Each species has different parental care strategies:
- Humans: Both parents, years of full nurturing
- Hive species: Community raises children, weeks
- Some species: No care, offspring independent
- Birds: Nest-based care, both parents

The system respects and enforces these differences.

## Next Steps

1. Implement ParentingSystem (highest priority)
2. Add parenting to agent creation
3. Add LLM action definitions
4. Test with human species first
5. Extend to other species
6. Add social reputation integration
7. Playtest and balance drive levels
