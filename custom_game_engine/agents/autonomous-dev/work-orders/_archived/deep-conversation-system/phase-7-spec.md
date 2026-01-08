# Deep Conversation System - Phase 7: Social Networks & Evolution

**Extension of:** Deep Conversation System (Phases 1-6)
**Status:** Proposed
**Complexity:** Medium
**Dependencies:** Phase 6 (Emergent Social Dynamics)

---

## Overview

Phase 7 extends the Deep Conversation System with dynamic interest evolution, emergent social groups, knowledge propagation networks, and UI feedback for social dynamics.

While Phase 6 created friendship detection, Phase 7 makes the social world **alive and evolving**:
- Interests change based on life experiences
- Friend groups emerge organically around shared interests
- Knowledge spreads through social networks
- Players witness meaningful social moments

---

## 1. Interest Evolution System

### 1.1 Motivation

Currently, interests are static after generation. Real people's interests:
- **Strengthen** through practice (farming → passionate about agriculture)
- **Weaken** through neglect (childhood interest in bugs → forgotten)
- **Emerge** from experiences (near-death → interest in mortality)
- **Transfer** from mentors (apprentice → master's craft interests)

### 1.2 Interest Change Triggers

#### A. Skill-Based Evolution
```typescript
// When skill increases, strengthen related interest
// Farming skill 20 → 40: farming interest +0.2 intensity

interface SkillInterestMapping {
  skill: SkillType;
  topic: TopicId;
  strengthenRate: number; // Per skill level gained
}

const SKILL_INTEREST_MAPPINGS: SkillInterestMapping[] = [
  { skill: 'farming', topic: 'farming', strengthenRate: 0.01 },
  { skill: 'woodworking', topic: 'woodworking', strengthenRate: 0.01 },
  { skill: 'cooking', topic: 'cooking', strengthenRate: 0.01 },
  // ...
];
```

#### B. Experience-Based Emergence
```typescript
// Major life events create new interests

interface ExperienceTrigger {
  eventType: EventType;
  newInterest: TopicId;
  intensity: number;
  condition?: (agent: Entity, event: GameEvent) => boolean;
}

const EXPERIENCE_TRIGGERS: ExperienceTrigger[] = [
  {
    eventType: 'agent:death:witnessed',
    newInterest: 'mortality',
    intensity: 0.6,
    condition: (agent, event) => {
      // Only if close relationship
      const rel = getRelationship(agent, event.data.deceasedId);
      return rel && rel.familiarity > 40;
    }
  },
  {
    eventType: 'deity:miracle:witnessed',
    newInterest: 'the_gods',
    intensity: 0.7,
  },
  {
    eventType: 'building:completed',
    newInterest: 'building',
    intensity: 0.4,
    condition: (agent, event) => event.data.builderId === agent.id,
  },
  // Birth of child → family interest
  // Survived disaster → fate_and_destiny interest
  // First romance → romance interest
];
```

#### C. Decay Through Neglect
```typescript
// Interests weaken if not discussed or practiced
// Every 7 in-game days without discussion: -0.05 intensity

interface InterestDecay {
  topic: TopicId;
  decayRate: number; // Per week without discussion
  minimumIntensity: number; // Won't decay below this (innate interests)
}

// Different topics decay at different rates
const DECAY_RATES = {
  skill: 0.02,        // Skills decay slowly (muscle memory)
  personality: 0.01,  // Core interests very stable
  childhood: 0.08,    // Childhood interests fade fast
  experience: 0.05,   // Life experiences fade moderately
  question: 0.10,     // Children's questions change rapidly
};
```

#### D. Mentorship Transfer
```typescript
// When learning from someone, absorb their interests
// Talking to passionate farmer about farming → gain farming interest

interface MentorshipTransfer {
  teacherIntensity: number;      // Teacher's passion level
  studentReceptivity: number;    // Based on age, personality
  transferRate: number;          // How much transfers per conversation
}

// Calculation
function transferInterestFromMentor(
  student: Entity,
  teacher: Entity,
  topic: TopicId,
  conversationQuality: number
): void {
  const teacherInterest = teacher.interests.find(i => i.topic === topic);
  if (!teacherInterest || teacherInterest.intensity < 0.6) return;

  const studentAge = getAgeCategory(student);
  const receptivity = {
    child: 0.8,   // Highly impressionable
    teen: 0.6,    // Somewhat receptive
    adult: 0.3,   // Set in their ways
    elder: 0.1,   // Rarely change interests
  }[studentAge];

  const transferAmount =
    teacherInterest.intensity *
    receptivity *
    conversationQuality *
    0.1; // Scale factor

  // Add or strengthen student's interest
  addOrStrengthenInterest(student, topic, transferAmount, 'learned');
}
```

### 1.3 Interest Mutation Events

```typescript
// Emit events when interests significantly change
// For UI feedback and narrative moments

type InterestMutationEvent =
  | 'interest:emerged'      // New interest appeared
  | 'interest:strengthened' // Existing interest grew
  | 'interest:weakened'     // Interest fading
  | 'interest:lost'         // Interest completely gone
  | 'interest:transferred'; // Learned from mentor

interface InterestMutationEventData {
  agentId: string;
  agentName: string;
  topic: TopicId;
  oldIntensity?: number;
  newIntensity: number;
  source: 'skill' | 'experience' | 'mentorship' | 'decay';
  trigger?: string; // Specific event that caused it
}
```

### 1.4 Implementation: InterestEvolutionSystem

```typescript
export class InterestEvolutionSystem implements System {
  public readonly id = 'interest_evolution';
  public readonly priority = 18; // After FriendshipSystem

  private static readonly UPDATE_INTERVAL = 1200; // Once per game-hour
  private tickCounter = 0;

  // Thresholds for mutation events
  private static readonly EMERGENCE_THRESHOLD = 0.3;
  private static readonly LOSS_THRESHOLD = 0.1;
  private static readonly SIGNIFICANT_CHANGE = 0.2;

  init(world: World): void {
    // Listen for experience triggers
    world.eventBus.on('agent:death:witnessed', (e) => this.handleExperience(e, world));
    world.eventBus.on('deity:miracle:witnessed', (e) => this.handleExperience(e, world));
    world.eventBus.on('building:completed', (e) => this.handleExperience(e, world));
    // ... more triggers

    // Listen for skill increases
    world.eventBus.on('skill:increased', (e) => this.handleSkillGrowth(e, world));

    // Listen for conversations (mentorship transfer)
    world.eventBus.on('conversation:ended', (e) => this.handleMentorship(e, world));
  }

  update(world: World, entities: Entity[], deltaTime: number): void {
    this.tickCounter++;
    if (this.tickCounter % InterestEvolutionSystem.UPDATE_INTERVAL !== 0) return;

    for (const entity of entities) {
      this.processDecay(entity as EntityImpl, world);
    }
  }

  private processDecay(agent: EntityImpl, world: World): void {
    const interests = agent.getComponent<InterestsComponent>(CT.Interests);
    if (!interests) return;

    const currentTick = world.tick;
    const weekInTicks = 7 * 24 * 1200; // 7 days * 24 hours * 1200 ticks/hour

    for (const interest of interests.interests) {
      // Skip innate interests (they don't decay)
      if (interest.source === 'innate') continue;

      // Calculate time since last discussion
      const ticksSinceDiscussion = interest.lastDiscussed
        ? currentTick - interest.lastDiscussed
        : currentTick - agent.createdAt;

      if (ticksSinceDiscussion >= weekInTicks) {
        const weeksNeglected = Math.floor(ticksSinceDiscussion / weekInTicks);
        const decayRate = DECAY_RATES[interest.source] || 0.05;
        const decay = decayRate * weeksNeglected;

        const oldIntensity = interest.intensity;
        interest.intensity = Math.max(0, interest.intensity - decay);

        // Emit events for significant changes
        if (oldIntensity > InterestEvolutionSystem.LOSS_THRESHOLD &&
            interest.intensity <= InterestEvolutionSystem.LOSS_THRESHOLD) {
          this.emitMutationEvent(world, agent, interest, 'interest:lost', oldIntensity);
        } else if (oldIntensity - interest.intensity >= InterestEvolutionSystem.SIGNIFICANT_CHANGE) {
          this.emitMutationEvent(world, agent, interest, 'interest:weakened', oldIntensity);
        }

        // Remove interests that decayed to zero
        if (interest.intensity <= 0) {
          interests.removeInterest(interest.topic);
        }
      }
    }
  }

  private handleSkillGrowth(event: GameEvent, world: World): void {
    const { agentId, skill, newLevel } = event.data;
    const agent = world.getEntity(agentId) as EntityImpl;
    if (!agent) return;

    const mapping = SKILL_INTEREST_MAPPINGS.find(m => m.skill === skill);
    if (!mapping) return;

    const interests = agent.getComponent<InterestsComponent>(CT.Interests);
    if (!interests) return;

    let interest = interests.getInterest(mapping.topic);
    const oldIntensity = interest?.intensity || 0;
    const increase = mapping.strengthenRate;

    if (!interest) {
      // Create new interest from skill
      interest = {
        topic: mapping.topic,
        category: getTopicCategory(mapping.topic),
        intensity: increase,
        source: 'skill',
        lastDiscussed: null,
        discussionHunger: 0.5,
        knownEnthusiasts: [],
      };
      interests.addInterest(interest);
      this.emitMutationEvent(world, agent, interest, 'interest:emerged');
    } else {
      // Strengthen existing interest
      interest.intensity = Math.min(1.0, interest.intensity + increase);

      if (interest.intensity - oldIntensity >= InterestEvolutionSystem.SIGNIFICANT_CHANGE) {
        this.emitMutationEvent(world, agent, interest, 'interest:strengthened', oldIntensity);
      }
    }
  }

  private handleExperience(event: GameEvent, world: World): void {
    const trigger = EXPERIENCE_TRIGGERS.find(t => t.eventType === event.type);
    if (!trigger) return;

    // Find all agents affected by this event
    const affectedAgents = this.findAffectedAgents(event, world);

    for (const agent of affectedAgents) {
      if (trigger.condition && !trigger.condition(agent, event)) continue;

      const interests = agent.getComponent<InterestsComponent>(CT.Interests);
      if (!interests) continue;

      let interest = interests.getInterest(trigger.newInterest);

      if (!interest) {
        interest = {
          topic: trigger.newInterest,
          category: getTopicCategory(trigger.newInterest),
          intensity: trigger.intensity,
          source: 'experience',
          lastDiscussed: null,
          discussionHunger: 0.8, // High hunger to discuss new experience
          knownEnthusiasts: [],
        };
        interests.addInterest(interest);
        this.emitMutationEvent(world, agent, interest, 'interest:emerged', 0, event.type);
      }
    }
  }

  private handleMentorship(event: GameEvent, world: World): void {
    const { agent1, agent2, topicsDiscussed, overallQuality } = event.data;

    if (!topicsDiscussed || topicsDiscussed.length === 0) return;
    if (overallQuality < 0.6) return; // Only high-quality conversations transfer

    const entity1 = world.getEntity(agent1) as EntityImpl;
    const entity2 = world.getEntity(agent2) as EntityImpl;
    if (!entity1 || !entity2) return;

    // Bidirectional transfer
    this.transferInterests(entity1, entity2, topicsDiscussed, overallQuality, world);
    this.transferInterests(entity2, entity1, topicsDiscussed, overallQuality, world);
  }

  private transferInterests(
    student: EntityImpl,
    teacher: EntityImpl,
    topics: TopicId[],
    quality: number,
    world: World
  ): void {
    const studentInterests = student.getComponent<InterestsComponent>(CT.Interests);
    const teacherInterests = teacher.getComponent<InterestsComponent>(CT.Interests);
    if (!studentInterests || !teacherInterests) return;

    const studentAge = student.getComponent<AgentComponent>(CT.Agent)?.ageCategory;
    const receptivity = {
      child: 0.8,
      teen: 0.6,
      adult: 0.3,
      elder: 0.1,
    }[studentAge || 'adult'];

    for (const topic of topics) {
      const teacherInterest = teacherInterests.getInterest(topic);
      if (!teacherInterest || teacherInterest.intensity < 0.6) continue;

      const transferAmount = teacherInterest.intensity * receptivity * quality * 0.1;

      let studentInterest = studentInterests.getInterest(topic);
      const oldIntensity = studentInterest?.intensity || 0;

      if (!studentInterest) {
        studentInterest = {
          topic,
          category: getTopicCategory(topic),
          intensity: transferAmount,
          source: 'learned',
          lastDiscussed: world.tick,
          discussionHunger: 0.3,
          knownEnthusiasts: [teacher.id],
        };
        studentInterests.addInterest(studentInterest);

        if (transferAmount >= InterestEvolutionSystem.EMERGENCE_THRESHOLD) {
          this.emitMutationEvent(world, student, studentInterest, 'interest:transferred', 0, teacher.id);
        }
      } else {
        studentInterest.intensity = Math.min(1.0, studentInterest.intensity + transferAmount);

        if (studentInterest.intensity - oldIntensity >= InterestEvolutionSystem.SIGNIFICANT_CHANGE) {
          this.emitMutationEvent(world, student, studentInterest, 'interest:transferred', oldIntensity, teacher.id);
        }
      }
    }
  }

  private emitMutationEvent(
    world: World,
    agent: EntityImpl,
    interest: Interest,
    eventType: InterestMutationEvent,
    oldIntensity?: number,
    trigger?: string
  ): void {
    const identity = agent.getComponent<IdentityComponent>(CT.Identity);

    world.eventBus.emit({
      type: eventType,
      source: agent.id,
      data: {
        agentId: agent.id,
        agentName: identity?.name || 'Unknown',
        topic: interest.topic,
        oldIntensity,
        newIntensity: interest.intensity,
        source: interest.source,
        trigger,
      } as InterestMutationEventData,
    });
  }

  private findAffectedAgents(event: GameEvent, world: World): EntityImpl[] {
    // Find agents who witnessed or were affected by the event
    // This depends on the event type
    // For now, simple implementation
    return [world.getEntity(event.source) as EntityImpl].filter(Boolean);
  }
}
```

---

## 2. Social Groups System

### 2.1 Motivation

Friends don't exist in isolation—they form **groups**:
- Crafters who gather to discuss techniques
- Philosophers who debate meaning
- Children who play together
- Elders who share wisdom

Groups emerge when multiple agents share:
- Common interests (high overlap)
- Mutual friendships (friend-of-friend networks)
- Regular interactions (recurring conversations)

### 2.2 Group Detection

```typescript
interface SocialGroup {
  id: string;
  name?: string;                    // Auto-generated or LLM-generated
  members: Set<string>;             // Agent IDs
  coreInterests: TopicId[];         // Shared topics
  cohesion: number;                 // 0-1, how tight-knit
  formationTick: number;
  lastGathering?: number;
  averageAge?: AgeCategory;         // Predominant age group
  meetingPlace?: { x: number; y: number }; // Where they gather
}
```

#### Detection Algorithm
```typescript
// Every N ticks, analyze friendship networks for clusters

class SocialGroupSystem implements System {
  private static readonly CHECK_INTERVAL = 5000; // Every few minutes
  private static readonly MIN_GROUP_SIZE = 3;
  private static readonly MIN_COHESION = 0.6;

  update(world: World, entities: Entity[]): void {
    // 1. Build friendship graph
    const friendshipGraph = this.buildFriendshipGraph(entities);

    // 2. Find connected components (friend clusters)
    const clusters = this.findClusters(friendshipGraph);

    // 3. Analyze each cluster for shared interests
    for (const cluster of clusters) {
      if (cluster.size < SocialGroupSystem.MIN_GROUP_SIZE) continue;

      const sharedInterests = this.findSharedInterests(cluster, world);
      const cohesion = this.calculateCohesion(cluster, world);

      if (cohesion >= SocialGroupSystem.MIN_COHESION && sharedInterests.length > 0) {
        this.createOrUpdateGroup(cluster, sharedInterests, cohesion, world);
      }
    }
  }

  private findSharedInterests(members: Set<string>, world: World): TopicId[] {
    // Find topics that at least 50% of members are interested in
    const topicCounts = new Map<TopicId, number>();

    for (const memberId of members) {
      const agent = world.getEntity(memberId) as EntityImpl;
      const interests = agent?.getComponent<InterestsComponent>(CT.Interests);
      if (!interests) continue;

      for (const interest of interests.interests) {
        if (interest.intensity < 0.5) continue; // Only strong interests
        topicCounts.set(interest.topic, (topicCounts.get(interest.topic) || 0) + 1);
      }
    }

    const threshold = members.size * 0.5;
    return Array.from(topicCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([topic, _]) => topic);
  }

  private calculateCohesion(members: Set<string>, world: World): number {
    // Cohesion = average friendship strength within group
    let totalAffinity = 0;
    let connectionCount = 0;

    const memberArray = Array.from(members);
    for (let i = 0; i < memberArray.length; i++) {
      for (let j = i + 1; j < memberArray.length; j++) {
        const agent1 = world.getEntity(memberArray[i]) as EntityImpl;
        const rel = agent1?.getComponent<RelationshipComponent>(CT.Relationship);
        const relationship = rel?.relationships.get(memberArray[j]);

        if (relationship) {
          totalAffinity += relationship.affinity;
          connectionCount++;
        }
      }
    }

    return connectionCount > 0 ? (totalAffinity / connectionCount) / 100 : 0;
  }
}
```

### 2.3 Group Names (LLM-Generated)

```typescript
// Generate natural group names based on composition
async function generateGroupName(
  group: SocialGroup,
  world: World,
  llmQueue: LLMQueue
): Promise<string> {
  const memberNames = Array.from(group.members)
    .map(id => world.getEntity(id)?.getComponent<IdentityComponent>(CT.Identity)?.name)
    .filter(Boolean)
    .slice(0, 5); // Sample

  const interests = group.coreInterests.map(formatTopicName).join(', ');

  const prompt = `Generate a natural name for a social group with these traits:
Members: ${memberNames.join(', ')}
Shared interests: ${interests}
Average age: ${group.averageAge || 'mixed'}

Examples:
- "The Woodworkers' Circle"
- "The Young Philosophers"
- "The Dawn Gatherers"
- "The Story Keepers"

Name (2-4 words):`;

  const response = await llmQueue.enqueue({
    systemPrompt: 'You generate concise, natural names for social groups.',
    userPrompt: prompt,
    temperature: 0.8,
  });

  return response.trim().replace(/['"]/g, '');
}
```

### 2.4 Group Events

```typescript
type SocialGroupEvent =
  | 'group:formed'      // New group emerged
  | 'group:dissolved'   // Group fell apart
  | 'group:joined'      // Member joined existing group
  | 'group:left'        // Member left group
  | 'group:gathering';  // Group is meeting together

interface GroupGatheringEventData {
  groupId: string;
  groupName: string;
  members: string[];
  location: { x: number; y: number };
  topic?: TopicId; // What they're discussing
}
```

---

## 3. Knowledge Propagation Network

### 3.1 Motivation

Information spreads through social networks:
- Farmer discovers new technique → tells friends → spreads to village
- Elder shares wisdom → children remember → teach their children
- Rumor starts → spreads through gossip → becomes "common knowledge"

Knowledge has:
- **Source**: Who originated it
- **Truth value**: Accurate or distorted
- **Spread pattern**: How it propagates
- **Decay**: Forgotten over time

### 3.2 Knowledge Types

```typescript
type KnowledgeType =
  | 'technique'   // Practical skill knowledge (farming methods)
  | 'wisdom'      // Life advice, philosophical insights
  | 'rumor'       // Unverified information (gossip)
  | 'fact'        // Verified truth (observed events)
  | 'story'       // Narratives and tales
  | 'warning';    // Dangers and cautions

interface Knowledge {
  id: string;
  type: KnowledgeType;
  content: string;              // Natural language description
  topic: TopicId;               // Related interest topic
  source: string;               // Originator agent ID
  truthValue: number;           // 0-1, how accurate
  importance: number;           // 0-1, how significant
  createdAt: number;            // Tick

  // Propagation tracking
  knownBy: Set<string>;         // Who knows this
  spreadPath: Array<{           // How it spread
    from: string;
    to: string;
    tick: number;
    distortion: number;         // How much it changed
  }>;
}
```

### 3.3 Knowledge Sharing

```typescript
class KnowledgeNetworkSystem implements System {
  private knowledgeBase = new Map<string, Knowledge>();

  init(world: World): void {
    // Listen for conversations - knowledge shares during talk
    world.eventBus.on('conversation:ended', (e) => this.shareKnowledge(e, world));

    // Listen for discoveries - new knowledge created
    world.eventBus.on('skill:insight', (e) => this.createKnowledge(e, world, 'technique'));
    world.eventBus.on('reflection:completed', (e) => this.createKnowledge(e, world, 'wisdom'));
  }

  private shareKnowledge(event: GameEvent, world: World): void {
    const { agent1, agent2, topicsDiscussed, overallQuality } = event.data;

    if (overallQuality < 0.5) return; // Low quality = no knowledge shared

    const entity1 = world.getEntity(agent1) as EntityImpl;
    const entity2 = world.getEntity(agent2) as EntityImpl;

    // Each agent shares knowledge they have about discussed topics
    this.transferKnowledge(entity1, entity2, topicsDiscussed, overallQuality, world);
    this.transferKnowledge(entity2, entity1, topicsDiscussed, overallQuality, world);
  }

  private transferKnowledge(
    from: EntityImpl,
    to: EntityImpl,
    topics: TopicId[],
    quality: number,
    world: World
  ): void {
    // Find knowledge that 'from' knows about these topics
    const relevantKnowledge = Array.from(this.knowledgeBase.values())
      .filter(k => k.knownBy.has(from.id) && topics.includes(k.topic));

    for (const knowledge of relevantKnowledge) {
      // Skip if already known
      if (knowledge.knownBy.has(to.id)) continue;

      // Probability of sharing based on importance and quality
      const shareChance = knowledge.importance * quality;
      if (Math.random() > shareChance) continue;

      // Knowledge spreads!
      knowledge.knownBy.add(to.id);

      // Add to spread path
      const distortion = this.calculateDistortion(knowledge, from, quality);
      knowledge.spreadPath.push({
        from: from.id,
        to: to.id,
        tick: world.tick,
        distortion,
      });

      // Emit event
      world.eventBus.emit({
        type: 'knowledge:spread',
        source: from.id,
        data: {
          knowledgeId: knowledge.id,
          from: from.id,
          to: to.id,
          topic: knowledge.topic,
          generation: knowledge.spreadPath.length,
        },
      });
    }
  }

  private calculateDistortion(
    knowledge: Knowledge,
    sharer: EntityImpl,
    conversationQuality: number
  ): number {
    // Distortion increases with:
    // - Low conversation quality
    // - Low intelligence/memory (future)
    // - Multiple generations of spread

    const baseDistortion = 1.0 - conversationQuality;
    const generationPenalty = knowledge.spreadPath.length * 0.1;

    return Math.min(1.0, baseDistortion + generationPenalty);
  }

  private createKnowledge(
    event: GameEvent,
    world: World,
    type: KnowledgeType
  ): void {
    const { agentId, content, topic, importance } = event.data;

    const knowledge: Knowledge = {
      id: `knowledge_${Date.now()}_${Math.random()}`,
      type,
      content,
      topic,
      source: agentId,
      truthValue: type === 'fact' ? 1.0 : 0.8, // Facts are true, others less certain
      importance,
      createdAt: world.tick,
      knownBy: new Set([agentId]),
      spreadPath: [],
    };

    this.knowledgeBase.set(knowledge.id, knowledge);

    world.eventBus.emit({
      type: 'knowledge:created',
      source: agentId,
      data: {
        knowledgeId: knowledge.id,
        type,
        topic,
        importance,
      },
    });
  }
}
```

### 3.4 Knowledge Visualization (Future UI)

```typescript
// Track most-spread knowledge for UI display
interface KnowledgeMetrics {
  mostSpread: Knowledge[];        // Viral knowledge
  mostDistorted: Knowledge[];     // Telephone game effect
  recentDiscoveries: Knowledge[]; // New insights
  forgottenKnowledge: Knowledge[]; // Lost to time
}

function analyzeKnowledgeNetwork(
  knowledgeBase: Map<string, Knowledge>
): KnowledgeMetrics {
  const all = Array.from(knowledgeBase.values());

  return {
    mostSpread: all
      .sort((a, b) => b.knownBy.size - a.knownBy.size)
      .slice(0, 10),

    mostDistorted: all
      .filter(k => k.spreadPath.length > 0)
      .sort((a, b) => {
        const aAvgDistortion = a.spreadPath.reduce((sum, p) => sum + p.distortion, 0) / a.spreadPath.length;
        const bAvgDistortion = b.spreadPath.reduce((sum, p) => sum + p.distortion, 0) / b.spreadPath.length;
        return bAvgDistortion - aAvgDistortion;
      })
      .slice(0, 10),

    recentDiscoveries: all
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10),

    forgottenKnowledge: all
      .filter(k => k.knownBy.size === 0),
  };
}
```

---

## 4. Conversation UI System

### 4.1 Motivation

Players need to **witness** the social dynamics they're creating. Without UI feedback:
- Friendships form silently (player doesn't notice)
- Interest evolution is invisible
- Groups emerge without fanfare
- Knowledge spreads unseen

### 4.2 Social Event Notifications

```typescript
interface SocialNotification {
  type: 'friendship' | 'group' | 'interest' | 'knowledge';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  agentIds: string[];
  timestamp: number;
  icon?: string;
}

// Example notifications
const NOTIFICATION_TEMPLATES = {
  'friendship:formed': {
    priority: 'high',
    title: (agent1: string, agent2: string) =>
      `${agent1} and ${agent2} became friends`,
    message: (agent1: string, agent2: string, sharedInterests: string[]) =>
      `After bonding over ${sharedInterests.join(' and ')}, they've become close friends.`,
    icon: '🤝',
  },

  'group:formed': {
    priority: 'high',
    title: (groupName: string) => `New group: ${groupName}`,
    message: (members: string[], interests: string[]) =>
      `${members.slice(0, 3).join(', ')} and others formed a group around ${interests.join(' and ')}.`,
    icon: '👥',
  },

  'interest:emerged': {
    priority: 'medium',
    title: (agent: string, topic: string) =>
      `${agent} developed an interest in ${topic}`,
    message: (trigger: string) =>
      trigger ? `Sparked by ${trigger}` : 'A new passion awakens',
    icon: '✨',
  },

  'knowledge:spread': {
    priority: 'low',
    title: (knowledge: string) => `Knowledge spreading: ${knowledge}`,
    message: (from: string, to: string, generation: number) =>
      generation === 1
        ? `${from} taught ${to} something new`
        : `${from} shared what they heard (${generation}th generation)`,
    icon: '📖',
  },
};

class SocialNotificationSystem {
  private notifications: SocialNotification[] = [];
  private maxNotifications = 50;

  init(world: World): void {
    // Listen for all social events
    world.eventBus.on('friendship:formed', (e) => this.createNotification(e, world));
    world.eventBus.on('group:formed', (e) => this.createNotification(e, world));
    world.eventBus.on('interest:emerged', (e) => this.createNotification(e, world));
    world.eventBus.on('knowledge:spread', (e) => this.createNotification(e, world));
    // ... more events
  }

  private createNotification(event: GameEvent, world: World): void {
    const template = NOTIFICATION_TEMPLATES[event.type];
    if (!template) return;

    // Build notification from template and event data
    const notification: SocialNotification = {
      type: this.getNotificationType(event.type),
      priority: template.priority,
      title: template.title(...this.extractArgs(event)),
      message: template.message(...this.extractArgs(event)),
      agentIds: this.extractAgentIds(event),
      timestamp: world.tick,
      icon: template.icon,
    };

    this.notifications.push(notification);

    // Keep only recent notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications.shift();
    }

    // Emit for UI consumption
    world.eventBus.emitImmediate({
      type: 'ui:notification',
      source: 'social',
      data: notification,
    });
  }

  getRecentNotifications(count: number = 10): SocialNotification[] {
    return this.notifications.slice(-count).reverse();
  }
}
```

### 4.3 Social Network Overlay (Future)

```typescript
// Visual representation of social networks
// Could be rendered in-game as overlay or separate panel

interface SocialNetworkVisualization {
  nodes: Array<{
    id: string;
    name: string;
    x: number; // Position in social space (not world space)
    y: number;
    size: number; // Based on connection count
    color: string; // Based on primary interest category
    groups: string[]; // Which groups they belong to
  }>;

  edges: Array<{
    from: string;
    to: string;
    strength: number; // Affinity
    type: 'friend' | 'acquaintance' | 'mentor';
  }>;

  groups: Array<{
    id: string;
    name: string;
    members: string[];
    boundingBox: { x: number; y: number; width: number; height: number };
    color: string;
  }>;
}

// Generate visualization using force-directed graph layout
function generateSocialNetworkViz(
  world: World,
  agents: Entity[]
): SocialNetworkVisualization {
  // Use force-directed layout algorithm
  // Friends attract each other
  // Groups cluster together
  // Repel to avoid overlap

  // Implementation would use physics simulation
  // Similar to D3.js force layout

  // Return positioned nodes and edges for rendering
}
```

### 4.4 Conversation History Timeline

```typescript
// Track notable conversations for review
interface ConversationHistoryEntry {
  tick: number;
  participants: Array<{ id: string; name: string }>;
  location: { x: number; y: number };
  topics: TopicId[];
  quality: number;
  significance: 'mundane' | 'notable' | 'pivotal';
  outcomes: Array<{
    type: 'friendship_formed' | 'interest_gained' | 'knowledge_shared';
    description: string;
  }>;
}

class ConversationHistorySystem {
  private history: ConversationHistoryEntry[] = [];
  private maxHistory = 100;

  init(world: World): void {
    world.eventBus.on('conversation:ended', (e) => this.recordConversation(e, world));
  }

  private recordConversation(event: GameEvent, world: World): void {
    const { agent1, agent2, topicsDiscussed, overallQuality, location } = event.data;

    // Determine significance
    const significance = this.assessSignificance(event, world);

    // Only record notable+ conversations
    if (significance === 'mundane') return;

    const entry: ConversationHistoryEntry = {
      tick: world.tick,
      participants: [
        this.getAgentInfo(agent1, world),
        this.getAgentInfo(agent2, world),
      ],
      location,
      topics: topicsDiscussed,
      quality: overallQuality,
      significance,
      outcomes: this.identifyOutcomes(event, world),
    };

    this.history.push(entry);

    if (this.history.length > this.maxHistory) {
      // Keep only significant conversations
      this.history = this.history
        .filter(e => e.significance === 'pivotal')
        .concat(this.history.slice(-50));
    }
  }

  private assessSignificance(event: GameEvent, world: World): 'mundane' | 'notable' | 'pivotal' {
    const { overallQuality, topicsDiscussed } = event.data;

    // Pivotal: Led to friendship, group formation, or major interest change
    // Check recent events for related outcomes
    const recentEvents = this.getRecentSocialEvents(world);
    if (recentEvents.some(e => this.isOutcomeOf(e, event))) {
      return 'pivotal';
    }

    // Notable: High quality with philosophical topics
    if (overallQuality > 0.7 && topicsDiscussed.some(t =>
      ['mortality', 'meaning_of_life', 'afterlife', 'fate_and_destiny'].includes(t)
    )) {
      return 'notable';
    }

    return 'mundane';
  }

  getNotableConversations(count: number = 20): ConversationHistoryEntry[] {
    return this.history
      .filter(e => e.significance !== 'mundane')
      .slice(-count)
      .reverse();
  }
}
```

---

## 5. Implementation Plan

### Phase 7.1: Interest Evolution (Week 1)
- [ ] Create `InterestEvolutionSystem`
- [ ] Implement skill-based strengthening
- [ ] Implement decay through neglect
- [ ] Add experience triggers
- [ ] Add mentorship transfer
- [ ] Write 30+ tests
- [ ] Register system

### Phase 7.2: Social Groups (Week 2)
- [ ] Create `SocialGroupSystem`
- [ ] Implement cluster detection algorithm
- [ ] Implement cohesion calculation
- [ ] Add group lifecycle (form/dissolve)
- [ ] Add LLM group naming
- [ ] Write 25+ tests
- [ ] Register system

### Phase 7.3: Knowledge Network (Week 3)
- [ ] Create `KnowledgeNetworkSystem`
- [ ] Implement knowledge creation from events
- [ ] Implement knowledge sharing in conversations
- [ ] Add distortion tracking
- [ ] Add knowledge decay
- [ ] Write 20+ tests
- [ ] Register system

### Phase 7.4: Conversation UI (Week 4)
- [ ] Create `SocialNotificationSystem`
- [ ] Implement notification templates
- [ ] Add conversation history tracking
- [ ] Create social network visualization data structure
- [ ] Add UI event emissions
- [ ] Write 15+ tests
- [ ] Register system
- [ ] (Optional) Implement actual UI rendering in renderer package

---

## 6. Success Criteria

Phase 7 is **COMPLETE** when:

1. ✅ InterestEvolutionSystem implemented and tested (30+ tests passing)
2. ✅ Interests strengthen through skill practice
3. ✅ Interests decay through neglect
4. ✅ Interests emerge from life experiences
5. ✅ Interests transfer through mentorship
6. ✅ SocialGroupSystem implemented and tested (25+ tests passing)
7. ✅ Groups detected from friendship clusters
8. ✅ Group cohesion calculated accurately
9. ✅ Groups emit formation/dissolution events
10. ✅ KnowledgeNetworkSystem implemented and tested (20+ tests passing)
11. ✅ Knowledge spreads through conversations
12. ✅ Knowledge distortion tracked
13. ✅ SocialNotificationSystem implemented and tested (15+ tests passing)
14. ✅ Notifications emit for all social events
15. ✅ Conversation history tracked
16. ✅ All Phase 7 tests passing (90+ total tests)
17. ✅ Systems registered and exported
18. ⏳ Build passes (pre-existing errors acceptable)

**Estimated Total:** 90+ new tests, 4 new systems, ~2000 lines of code

---

## 7. Future Extensions (Phase 8+)

After Phase 7, the conversation system could expand to:

- **Social Roles**: Leaders, mediators, outcasts, mentors (emergent from network position)
- **Cultural Transmission**: Villages develop distinct conversation styles and topics
- **Generational Knowledge**: Elders → adults → children knowledge chains
- **Social Conflict**: Groups compete for members, ideological splits
- **Teaching System**: Formal apprenticeships with knowledge progression
- **Social Status**: Influence based on knowledge, friendships, group membership
- **Gossip Mechanics**: Rumors spread faster, truth/lies compete
- **Memory Integration**: Conversations become episodic memories with retrieval

---

**End of Specification**
