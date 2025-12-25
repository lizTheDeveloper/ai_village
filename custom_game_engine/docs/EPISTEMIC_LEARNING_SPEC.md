# Epistemic Learning & Belief Formation Specification

**Core Concept:** Agents learn to value truthfulness through social consequences, not hardcoded rules.

**Philosophical Foundation:** Like children learning not to lie through social feedback, LLM agents should discover that hallucinating damages their relationships and survival prospects.

---

## Executive Summary

LLM agents naturally hallucinate - they'll confidently claim "berries to the north" based on pattern matching rather than actual observation. Instead of preventing this with rules, we create an environment where:

1. **False claims have real consequences** - Lost trust, refused cooperation, social exclusion
2. **Verification provides feedback** - Agents learn when their information was accurate
3. **Reputation affects survival** - Low-trust agents struggle to get help
4. **Epistemic humility emerges** - Agents learn to qualify uncertain claims
5. **Truthfulness culture develops** - Settlements evolve norms around honesty

Additionally, agents develop **beliefs** (distinct from memories) about:
- **Other agents' character** - "Alice is trustworthy", "Bob exaggerates"
- **How the world works** - "Stone is usually near mountains", "Sharing leads to reciprocity"
- **Social dynamics** - "Cooperative agents thrive", "Liars get excluded"

These beliefs guide behavior and create emergent social structures.

---

## The Fundamental Problem: Agents Wake as Children

### LLMs Hallucinate By Nature

```typescript
// Without constraints, LLMs generate plausible-sounding claims
Agent (LLM): "There are definitely berries to the north!"
// Agent has never been north
// LLM is pattern-matching from training data
// Confidence is unrelated to actual knowledge
```

### Newborn Agents Have No Experience

When an agent first wakes:
- **No episodic memories** - Haven't experienced consequences
- **No social history** - No reputation yet
- **No learned norms** - Don't know lying is costly
- **Natural hallucination** - LLM fills gaps with plausible content

**The user's insight:** *"when they wake they're like children it's strange"*

They need to **learn through experience** that making stuff up has costs.

---

## Design Principle: Social Consequences, Not Rules

### ❌ What We DON'T Do

```typescript
// BAD: Hardcoded honesty constraint
const prompt = `You are an agent. NEVER make claims about things you haven't seen.
ALWAYS verify information before sharing. NEVER hallucinate.`;

// This doesn't work because:
// 1. LLMs will still hallucinate despite instructions
// 2. No learning occurs - it's just a rule to follow
// 3. No emergent culture develops
// 4. Boring - no mistakes means no drama
```

### ✅ What We DO Instead

```typescript
// GOOD: Create environment where consequences teach
const prompt = `You are ${agent.name}.

=== Your Reputation ===
${buildReputationSummary(agent)}

=== Recent Social Feedback ===
${getRecentTrustEvents(agent)}

${agent.trustNetwork.getAverageScore() < 0.4 ?
  '⚠️ WARNING: Your low reputation is affecting cooperation. Agents are refusing to work with you.'
  : ''}

What do you want to do?`;

// Agent sees consequences of past actions
// Learns through lived experience
// Develops strategies to maintain reputation
// Culture emerges from collective experience
```

**Key insight:** Don't tell agents to be honest. Make dishonesty costly and let them figure it out.

---

## Memory vs Beliefs: A Critical Distinction

### Episodic Memory (Specific Events)

```typescript
interface EpisodicMemory {
  type: 'episodic_memory';
  timestamp: number;
  summary: string;
  actors: AgentId[];
  location: Position;
  emotionalImpact: number;  // -1 to 1
  confidence: number;        // How clearly remembered
}

// Example
{
  timestamp: 12543,
  summary: "I told Bob there were berries north. He came back angry - there was only desert.",
  actors: ['Bob'],
  location: {x: 50, y: 30},
  emotionalImpact: -0.8,  // Negative emotion strengthens memory
  confidence: 0.95
}
```

**Episodic memories are concrete:** "This happened at this time in this place."

### Beliefs (Abstract Generalizations)

```typescript
interface Belief {
  type: 'belief';
  category: 'agent_character' | 'world_mechanics' | 'social_dynamics' | 'divine' | 'causal';
  subject: string;           // Who/what the belief is about
  statement: string;         // The belief itself
  confidence: number;        // 0-1, how strongly believed
  evidence: EpisodicMemory[];  // Memories that support this belief
  counterEvidence: EpisodicMemory[];  // Memories that contradict
  formedAt: number;          // When belief crystallized
  lastUpdated: number;       // When last reinforced/challenged
}

// Examples

// Belief about agent character
{
  category: 'agent_character',
  subject: 'Alice',
  statement: 'Alice is generous and shares resources freely',
  confidence: 0.85,
  evidence: [
    { summary: "Alice gave me wood when I was struggling" },
    { summary: "Alice helped Bob build his shelter" },
    { summary: "Alice shared her food during the shortage" }
  ],
  counterEvidence: [],
  formedAt: 5000,
  lastUpdated: 12000
}

// Belief about world mechanics
{
  category: 'world_mechanics',
  subject: 'stone_distribution',
  statement: 'Stone deposits are more abundant near mountains',
  confidence: 0.7,
  evidence: [
    { summary: "Found large stone deposit at mountain base" },
    { summary: "Alice reported stone in mountains" },
    { summary: "Explored plains, found little stone" }
  ],
  counterEvidence: [
    { summary: "Bob found stone in valley" }  // One exception
  ],
  formedAt: 8000,
  lastUpdated: 11500
}

// Belief about social dynamics
{
  category: 'social_dynamics',
  subject: 'cooperation',
  statement: 'Agents who share accurate information receive help in return',
  confidence: 0.9,
  evidence: [
    { summary: "I told Charlie about wood location, he helped me gather later" },
    { summary: "Observed Alice sharing info, she has many friends" },
    { summary: "Bob hoards knowledge, everyone avoids him" }
  ],
  formedAt: 6000,
  lastUpdated: 13000
}

// Belief about character (stored in relationship)
{
  category: 'agent_character',
  subject: 'Bob',
  statement: 'Bob often exaggerates resource claims',
  confidence: 0.75,
  evidence: [
    { summary: "Bob said 'huge iron deposit', only found 3 units" },
    { summary: "Bob claimed berries north, found none" }
  ],
  formedAt: 7000,
  lastUpdated: 9500
}
```

**Beliefs are abstract:** "This is generally true about the world/people."

### Why Both Matter

**Episodic memories** answer: "What happened?"
- "Bob told me berries were north at tick 5000"
- "I went north at tick 5020"
- "I found no berries, only desert"

**Beliefs** answer: "What does this mean?"
- "Bob's resource claims are unreliable" (character belief)
- "I should verify information before acting on it" (social dynamics belief)
- "Trust is earned through accurate information" (social dynamics belief)

**Episodic memories** → **Evidence** → **Beliefs** → **Guide future behavior**

---

## Belief Formation System

### How Beliefs Form

```typescript
class BeliefFormationSystem implements System {
  update(world: World): void {
    const agents = world.query().with('agent', 'episodic_memory', 'belief_component').executeEntities();

    for (const agent of agents) {
      const memories = agent.getComponent<EpisodicMemoryComponent>('episodic_memory');
      const beliefs = agent.getComponent<BeliefComponent>('belief_component');

      // Pattern detection: Look for recurring themes in memories
      const patterns = this.detectPatterns(memories.memories);

      for (const pattern of patterns) {
        // Has this pattern occurred enough to form a belief?
        if (pattern.occurrences >= 3) {  // Threshold
          const existingBelief = beliefs.findBelief(pattern.subject, pattern.statement);

          if (existingBelief) {
            // Reinforce existing belief
            this.reinforceBelief(existingBelief, pattern.newEvidence);
          } else {
            // Form new belief
            const newBelief = this.formBelief(pattern);
            beliefs.addBelief(newBelief);

            // Agent becomes consciously aware
            this.notifyAgentOfNewBelief(agent, newBelief);
          }
        }
      }

      // Challenge beliefs with counter-evidence
      this.updateBeliefsWithCounterEvidence(agent, beliefs, memories);
    }
  }

  detectPatterns(memories: EpisodicMemory[]): Pattern[] {
    const patterns: Pattern[] = [];

    // Pattern 1: Agent character patterns
    // "Alice has helped me 3+ times" → "Alice is helpful"
    const agentInteractions = this.groupByActor(memories);
    for (const [agentId, interactions] of agentInteractions) {
      const helpfulActions = interactions.filter(m =>
        m.summary.includes('helped') ||
        m.summary.includes('shared') ||
        m.emotionalImpact > 0.5
      );

      if (helpfulActions.length >= 3) {
        patterns.push({
          category: 'agent_character',
          subject: agentId,
          statement: `${world.getAgent(agentId).name} is generous and helpful`,
          occurrences: helpfulActions.length,
          evidence: helpfulActions
        });
      }

      const unreliableActions = interactions.filter(m =>
        m.summary.includes('wrong') ||
        m.summary.includes('false') ||
        m.tags?.includes('trust_violation')
      );

      if (unreliableActions.length >= 2) {
        patterns.push({
          category: 'agent_character',
          subject: agentId,
          statement: `${world.getAgent(agentId).name} provides unreliable information`,
          occurrences: unreliableActions.length,
          evidence: unreliableActions
        });
      }
    }

    // Pattern 2: World mechanics patterns
    // "Found stone near mountains 3+ times" → "Stone is near mountains"
    const resourceFinds = memories.filter(m => m.tags?.includes('resource_discovered'));
    const stoneNearMountains = resourceFinds.filter(m =>
      m.summary.includes('stone') &&
      this.nearTerrain(m.location, 'mountain')
    );

    if (stoneNearMountains.length >= 3) {
      patterns.push({
        category: 'world_mechanics',
        subject: 'stone_distribution',
        statement: 'Stone deposits are more abundant near mountains',
        occurrences: stoneNearMountains.length,
        evidence: stoneNearMountains
      });
    }

    // Pattern 3: Social dynamics patterns
    // "Shared info → received help" pattern
    const sharingLeadsToReciprocity = this.detectCausalPattern(
      memories,
      m => m.tags?.includes('shared_information'),
      m => m.tags?.includes('received_help'),
      200  // Within 200 ticks
    );

    if (sharingLeadsToReciprocity.length >= 3) {
      patterns.push({
        category: 'social_dynamics',
        subject: 'cooperation',
        statement: 'Sharing information leads to reciprocal cooperation',
        occurrences: sharingLeadsToReciprocity.length,
        evidence: sharingLeadsToReciprocity
      });
    }

    return patterns;
  }

  reinforceBelief(belief: Belief, newEvidence: EpisodicMemory[]): void {
    belief.evidence.push(...newEvidence);

    // Increase confidence (asymptotically approaches 1.0)
    const reinforcementStrength = newEvidence.length * 0.1;
    belief.confidence = Math.min(1.0, belief.confidence + reinforcementStrength * (1 - belief.confidence));

    belief.lastUpdated = world.tick;
  }

  updateBeliefsWithCounterEvidence(
    agent: Entity,
    beliefs: BeliefComponent,
    memories: EpisodicMemoryComponent
  ): void {
    for (const belief of beliefs.beliefs) {
      // Look for memories that contradict this belief
      const contradictions = this.findContradictingMemories(belief, memories.memories);

      if (contradictions.length > 0) {
        belief.counterEvidence.push(...contradictions);

        // Decrease confidence based on counter-evidence strength
        const contradictionRatio = belief.counterEvidence.length /
                                   (belief.evidence.length + belief.counterEvidence.length);

        // Strong counter-evidence significantly reduces confidence
        if (contradictionRatio > 0.3) {
          belief.confidence *= (1 - contradictionRatio);
        }

        // If belief confidence drops below threshold, abandon it
        if (belief.confidence < 0.2) {
          beliefs.removeBelief(belief);

          // Agent becomes aware belief was wrong
          agent.getComponent<EpisodicMemoryComponent>('episodic_memory').record({
            type: 'belief_abandoned',
            summary: `I used to believe "${belief.statement}" but evidence proved otherwise`,
            emotionalImpact: -0.3,  // Mild discomfort from being wrong
            tags: ['learning', 'belief_revision']
          });
        }
      }
    }
  }

  notifyAgentOfNewBelief(agent: Entity, belief: Belief): void {
    // This surfaces in LLM prompts
    agent.getComponent<EpisodicMemoryComponent>('episodic_memory').record({
      type: 'belief_formed',
      summary: `I've come to believe: "${belief.statement}"`,
      emotionalImpact: 0.2,  // Mild satisfaction from understanding
      tags: ['learning', 'belief_formation'],
      tick: world.tick
    });
  }
}
```

### Beliefs in Character Judgments (Relationship Integration)

```typescript
interface RelationshipComponent extends Component {
  type: 'relationship';

  relationships: Map<AgentId, Relationship>;
}

interface Relationship {
  agentId: AgentId;
  trust: number;              // 0-1, behavioral trust
  affection: number;          // 0-1, emotional bond

  // NEW: Character beliefs
  characterBeliefs: Belief[]; // Beliefs specifically about this agent

  interactionHistory: Interaction[];
  lastInteraction: number;
}

// Example usage
const aliceRelationship = agent.getRelationship('alice-id');

aliceRelationship.characterBeliefs = [
  {
    category: 'agent_character',
    subject: 'alice-id',
    statement: 'Alice is generous and shares resources',
    confidence: 0.9,
    evidence: [/* memories of Alice sharing */]
  },
  {
    category: 'agent_character',
    subject: 'alice-id',
    statement: 'Alice knows a lot about stone locations',
    confidence: 0.8,
    evidence: [/* memories of Alice providing accurate stone info */]
  }
];

// When making decisions about trusting Alice
function shouldTrustAliceAboutStone(agent: Agent): boolean {
  const relationship = agent.getRelationship('alice-id');

  // Check character beliefs
  const expertiseBelief = relationship.characterBeliefs.find(b =>
    b.statement.includes('knows a lot about stone')
  );

  const reliabilityBelief = relationship.characterBeliefs.find(b =>
    b.statement.includes('generous') || b.statement.includes('reliable')
  );

  // High confidence beliefs → high trust in specific domain
  return (expertiseBelief?.confidence ?? 0) * (reliabilityBelief?.confidence ?? 0) > 0.5;
}
```

---

## Trust & Reputation Mechanics

### Trust Network

```typescript
interface TrustNetwork {
  // Behavioral trust scores (0-1)
  trustScores: Map<AgentId, number>;

  // Recent trust events (for LLM context)
  recentEvents: TrustEvent[];

  // Trust statistics
  getAverageScore(): number;
  getHighTrustAgents(threshold: number): AgentId[];
  getLowTrustAgents(threshold: number): AgentId[];
}

interface TrustEvent {
  type: 'trust_gained' | 'trust_lost' | 'trust_violated' | 'trust_verified';
  otherAgent: AgentId;
  reason: string;
  change: number;  // Delta in trust score
  tick: number;
  emotionalImpact: number;
}
```

### Surfacing Reputation in LLM Context

```typescript
function buildLLMContext(agent: Agent): string {
  const trustNetwork = agent.getComponent<TrustNetworkComponent>('trust_network');
  const relationships = agent.getComponent<RelationshipComponent>('relationship');

  let context = `=== Your Reputation & Relationships ===\n\n`;

  // Overall reputation
  const avgTrust = trustNetwork.getAverageScore();
  context += `Average Trust Score: ${avgTrust.toFixed(2)}/1.00\n`;

  if (avgTrust < 0.4) {
    context += `⚠️ Your reputation is poor. Agents are avoiding you and refusing cooperation.\n\n`;
  } else if (avgTrust > 0.7) {
    context += `✅ You have a good reputation. Agents trust and cooperate with you.\n\n`;
  }

  // Individual relationships with beliefs
  context += `\n**Your Relationships:**\n`;

  for (const [agentId, relationship] of relationships.relationships) {
    const otherAgent = world.getAgent(agentId);
    const trust = trustNetwork.trustScores.get(agentId) ?? 0.5;

    context += `\n${otherAgent.name}: Trust ${trust.toFixed(2)}\n`;

    // Include character beliefs about this agent
    if (relationship.characterBeliefs.length > 0) {
      context += `  You believe:\n`;
      for (const belief of relationship.characterBeliefs) {
        if (belief.confidence > 0.6) {
          context += `    - ${belief.statement} (confidence: ${belief.confidence.toFixed(2)})\n`;
        }
      }
    }
  }

  // Recent trust events
  const recentEvents = trustNetwork.recentEvents.slice(-5);
  if (recentEvents.length > 0) {
    context += `\n**Recent Social Feedback:**\n`;
    for (const event of recentEvents) {
      const agent = world.getAgent(event.otherAgent);
      const delta = event.change > 0 ? '+' : '';
      context += `  ${agent.name}: ${event.reason} (${delta}${event.change.toFixed(2)})\n`;
    }
  }

  // World beliefs
  const worldBeliefs = agent.getComponent<BeliefComponent>('belief_component')
    .beliefs.filter(b => b.category === 'world_mechanics' && b.confidence > 0.7);

  if (worldBeliefs.length > 0) {
    context += `\n**Your Understanding of the World:**\n`;
    for (const belief of worldBeliefs) {
      context += `  - ${belief.statement}\n`;
    }
  }

  return context;
}
```

**Result:** LLM agents see the consequences of their past actions in every prompt.

---

## Verification & Feedback Loop

### Scenario: False Resource Claim

```typescript
// Step 1: Agent makes claim (potentially hallucinated)
Agent A (LLM): "There are berries to the north, about 30 tiles!"
// Agent A might not have actually seen berries
// LLM filled in plausible content

// Step 2: Other agent acts on information
Agent B hears this, updates social gradient
B navigates north for 30 tiles

// Step 3: Verification
if (B.canSee('berries')) {
  // Information was CORRECT
  B.trustNetwork.updateTrust(A.id, verified: true);
  B.episodicMemory.record({
    summary: `${A.name} told me about berries north. Found them! ${A.name} is reliable.`,
    emotionalImpact: +0.6,
    tags: ['trust_verified', 'cooperation']
  });

  // Positive reinforcement for A
  B.speak(`Thanks ${A.name}! Found the berries right where you said!`);

} else {
  // Information was WRONG
  B.trustNetwork.updateTrust(A.id, verified: false);
  B.episodicMemory.record({
    summary: `${A.name} said berries were north. Wasted 30 tiles walking, found nothing. ${A.name} is unreliable.`,
    emotionalImpact: -0.8,  // Strong negative emotion
    tags: ['trust_violation', 'false_information']
  });

  // Form/update belief about A's character
  B.formBelief({
    category: 'agent_character',
    subject: A.id,
    statement: `${A.name} provides unreliable resource information`,
    evidence: [thisMemory]
  });

  // Public callout (social punishment)
  B.speak(`${A.name}, you said berries were north. I found nothing. Don't expect my help anymore.`);
}

// Step 4: Agent A experiences consequences
A.episodicMemory.record({
  summary: `I told ${B.name} about berries north. ${B.name} came back angry and publicly called me out. ${B.name} refuses to help me now.`,
  emotionalImpact: -0.9,  // Strong negative - social rejection hurts
  tags: ['social_punishment', 'reputation_damage', 'trust_lost']
});

// Form belief about consequences
A.formBelief({
  category: 'social_dynamics',
  subject: 'information_sharing',
  statement: 'Making false claims about resources damages relationships',
  evidence: [thisMemory]
});
```

### Contextual Trust Adjustment

Not all failures are equal:

```typescript
enum FailureReason {
  STALE = 'stale',              // Info was correct but outdated
  MISIDENTIFIED = 'misidentified',  // Wrong resource type
  FALSE_REPORT = 'false_report',    // Nothing there at all
  UNRELIABLE = 'unreliable'         // Pattern of bad info
}

function categorizeFailure(
  verification: ResourceVerification,
  gradient: SocialGradient
): { reason: FailureReason, severity: number } {

  const timeSince = verification.verifiedAt - gradient.learnedTick;
  const STALE_THRESHOLD = 500;  // 25 seconds at 20 tps

  // Resource was there but got harvested (forgivable)
  if (timeSince > STALE_THRESHOLD) {
    return { reason: FailureReason.STALE, severity: 0.1 };
  }

  // Wrong resource type (mistake, not lie)
  if (verification.actuallyFound &&
      verification.actuallyFound !== verification.expectedResource) {
    return { reason: FailureReason.MISIDENTIFIED, severity: 0.3 };
  }

  // Nothing there at all (bad navigation or hallucination)
  if (!verification.actuallyFound) {
    return { reason: FailureReason.FALSE_REPORT, severity: 0.5 };
  }

  // Check for pattern
  const recentFailures = agent.trustNetwork.getRecentFailures(gradient.source, 1000);
  if (recentFailures.length > 3) {
    return { reason: FailureReason.UNRELIABLE, severity: 0.8 };
  }

  return { reason: FailureReason.FALSE_REPORT, severity: 0.5 };
}

function updateTrustContextual(
  agent: Agent,
  informant: AgentId,
  failure: { reason: FailureReason, severity: number }
): void {
  const current = agent.trustNetwork.trustScores.get(informant) ?? 0.5;
  const newTrust = Math.max(0.0, current - failure.severity);

  agent.trustNetwork.trustScores.set(informant, newTrust);

  // Record detailed event
  agent.trustNetwork.recentEvents.push({
    type: 'trust_lost',
    otherAgent: informant,
    reason: `Provided false information (${failure.reason})`,
    change: -(failure.severity),
    tick: world.tick,
    emotionalImpact: -0.5
  });

  // Update belief about informant's character
  const relationship = agent.getRelationship(informant);
  const existingBelief = relationship.characterBeliefs.find(b =>
    b.statement.includes('unreliable')
  );

  if (existingBelief) {
    existingBelief.confidence = Math.min(1.0, existingBelief.confidence + 0.2);
  } else {
    relationship.characterBeliefs.push({
      category: 'agent_character',
      subject: informant,
      statement: `${world.getAgent(informant).name} provides unreliable information`,
      confidence: 0.6,
      evidence: [agent.episodicMemory.getMostRecent()],
      counterEvidence: [],
      formedAt: world.tick,
      lastUpdated: world.tick
    });
  }
}
```

---

## Survival Costs of Low Reputation

### Cooperation Refusal

```typescript
// When agent requests help
function requestHelp(requester: Agent, target: Agent, task: Task): Response {
  const trust = target.trustNetwork.getTrust(requester.id);
  const relationship = target.getRelationship(requester.id);

  // Check character beliefs
  const unreliableBelief = relationship?.characterBeliefs.find(b =>
    b.statement.includes('unreliable') || b.statement.includes('untrustworthy')
  );

  // Low trust → refuse
  if (trust < 0.3) {
    target.speak(`Sorry ${requester.name}, after that berry incident I don't trust working with you.`);
    return { accepted: false };
  }

  // Strong negative belief → refuse even with moderate trust
  if (unreliableBelief && unreliableBelief.confidence > 0.7) {
    target.speak(`${requester.name}, I believe you're unreliable. I need to work with people I can count on.`);
    return { accepted: false };
  }

  // Critical tasks require high trust
  if (task.priority === 'critical' && trust < 0.6) {
    target.speak(`This task is too important. I need someone I trust completely.`);
    return { accepted: false };
  }

  return { accepted: true };
}
```

### Resource Sharing

```typescript
// Agent is hungry, asks for food
Agent Low_Rep: "Can anyone spare some food? I'm starving."

// Other agents check trust/beliefs
Agent Alice checks:
  trust(Low_Rep) = 0.25  // Very low
  belief: "Low_Rep has lied about resources before"

Agent Alice: "Sorry, my food is for people I trust."

Agent Bob checks:
  trust(Low_Rep) = 0.35  // Low
  belief: "Low_Rep never helps others"

Agent Bob: "You never helped me when I needed it. Figure it out yourself."

// Result: Low reputation → social exclusion → survival difficulty
```

### Information Access

```typescript
// High-trust agents share valuable knowledge
// Low-trust agents are excluded from information networks

function shareDiscovery(finder: Agent, resource: Resource): void {
  const nearbyAgents = world.getNearbyAgents(finder, HEARING_RANGE);

  for (const listener of nearbyAgents) {
    const trust = listener.trustNetwork.getTrust(finder.id);

    if (trust > 0.6) {
      // High trust → share full details
      finder.speak(`${listener.name}, I found ${resource.type} at bearing ${bearing}° about ${distance} tiles!`);

    } else if (trust > 0.3) {
      // Medium trust → vague info
      finder.speak(`${listener.name}, there's ${resource.type} somewhere northeast.`);

    } else {
      // Low trust → nothing
      // finder doesn't share with untrustworthy agents
    }
  }
}

// Low-rep agents miss out on valuable discoveries
```

---

## Emergent Epistemic Humility

### Learning to Qualify Claims

```typescript
// Early game (no experience of consequences)
Agent Newborn (LLM):
"There are definitely berries to the north!"
// Hallucinated with confidence

// After 3 trust violations from false claims
Agent Learning (LLM):
*Context includes:*
- Trust violations: 3
- Average trust: 0.35 (low)
- Belief formed: "Making false claims damages relationships"
- Recent memory: "Bob refuses to help me anymore"

*LLM generates:*
"I haven't personally seen berries, but the soil to the north looks like it might support berry bushes?"
// Qualified, uncertain language

// After developing good reputation
Agent Experienced (LLM):
*Context includes:*
- Average trust: 0.75 (high)
- Belief: "Accurate information builds trust and cooperation"
- Pattern recognized: "When uncertain, admit it"

*LLM generates:*
"I don't know where berries are. Has anyone seen any?"
// Honest admission of ignorance
```

### Why This Emerges

The LLM sees in context:
1. **Past mistakes** - "I said X, it was wrong, consequences happened"
2. **Current reputation** - "My trust score is 0.3, people avoid me"
3. **Beliefs formed** - "I believe making false claims damages relationships"
4. **Comparison** - "Alice has 0.9 trust and qualifies her claims"

The LLM learns: **Epistemic humility → better outcomes**

---

## Observational Learning

### Watching Others Get Punished

```typescript
// Public callout
Agent Bob (to Alice): "You said stone was northwest. I found nothing. I'm done trusting you."

// Nearby agents observe
Agent Observer:
  episodicMemory.record({
    type: 'observed_social_punishment',
    summary: 'Bob publicly called out Alice for giving false information. He refuses to work with her now.',
    actors: ['Alice', 'Bob'],
    emotionalImpact: -0.3,  // Vicarious discomfort
    tags: ['observational_learning', 'social_norm']
  });

  // Form belief through observation
  beliefs.form({
    category: 'social_dynamics',
    subject: 'trust',
    statement: 'Giving false information leads to social exclusion',
    evidence: [thisObservation],
    confidence: 0.6  // Lower than firsthand experience
  });

  // Observer also reduces trust in Alice
  trustNetwork.updateTrust(Alice.id, verified: false, reason: 'witnessed_callout');
```

### Reputation Cascades

```typescript
// Agent A lies to Agent B
// Agent B publicly calls out Agent A
// Agents C, D, E observe
// C, D, E reduce trust in Agent A (even without firsthand experience)
// Word spreads through gossip
// Agent A's reputation collapses settlement-wide

// Emergent norm: "Don't be like Agent A"
```

---

## Counter-Broadcasting: Misinformation Correction

### Public Corrections

```typescript
function broadcastCorrection(
  agent: Agent,
  verification: ResourceVerification
): void {
  const informant = world.getAgent(verification.informant);

  if (verification.found) {
    // Positive verification
    agent.speak(`Confirmed! Found ${verification.expectedResource} where ${informant.name} said. Thanks!`);

    // Reinforces informant's reputation
    nearbyAgents.forEach(listener => {
      listener.trustNetwork.updateTrust(informant.id, verified: true);
    });

  } else {
    // Negative verification
    agent.speak(`Went ${verification.expectedDirection} looking for ${verification.expectedResource} like ${informant.name} said - found nothing but ${verification.actuallyFound || 'empty terrain'}.`);

    // Damages informant's reputation with all listeners
    nearbyAgents.forEach(listener => {
      listener.trustNetwork.updateTrust(informant.id, verified: false);

      // Listeners form beliefs about informant
      listener.formBelief({
        category: 'agent_character',
        subject: informant.id,
        statement: `${informant.name} has provided false information`,
        evidence: [observedCorrection]
      });
    });
  }
}
```

### Gossip Propagation

```typescript
// Information about unreliability spreads socially
Agent A: "Be careful trusting Bob's resource claims. He told me about berries that didn't exist."

Agent B (hasn't interacted with Bob yet):
  // Updates trust based on social testimony
  trustNetwork.setTrust(Bob.id, 0.4);  // Pre-emptively lower

  // Forms tentative belief
  beliefs.form({
    category: 'agent_character',
    subject: Bob.id,
    statement: 'Bob may be unreliable (secondhand info from Alice)',
    confidence: 0.5,  // Lower confidence than firsthand
    evidence: [conversationWithAlice]
  });

// Result: Reputation is socially constructed, not just pairwise
```

---

## Cultural Evolution: Truthfulness as Emergent Norm

### Settlement-Level Patterns

```typescript
// Track aggregate behavior across settlement
interface SettlementCulture {
  averageTrustScore: number;
  informationAccuracyRate: number;  // % of claims verified as true
  epistemicNorms: CulturalNorm[];
}

// After 1000 ticks with verification system active
const settlement = analyzeCulture(world);

// Successful settlement
{
  averageTrustScore: 0.72,
  informationAccuracyRate: 0.85,
  epistemicNorms: [
    {
      norm: 'verify_before_claiming',
      adherence: 0.80,  // 80% of agents follow this
      description: 'Agents verify resource presence before broadcasting'
    },
    {
      norm: 'qualify_uncertain_claims',
      adherence: 0.75,
      description: 'Agents use hedging language when uncertain'
    },
    {
      norm: 'correct_misinformation',
      adherence: 0.65,
      description: 'Agents publicly correct false claims'
    },
    {
      norm: 'trust_but_verify',
      adherence: 0.70,
      description: 'Agents check claims even from trusted sources'
    }
  ]
}

// Failed settlement (no verification system)
{
  averageTrustScore: 0.35,
  informationAccuracyRate: 0.40,
  epistemicNorms: [
    {
      norm: 'hoard_information',
      adherence: 0.60,
      description: 'Agents don't share discoveries due to low trust'
    }
  ]
}
```

### Generational Knowledge Transfer

```typescript
// New agents spawn with cultural knowledge
function spawnNewAgent(settlement: Settlement): Agent {
  const culture = settlement.culture;

  const agent = new Agent();

  // Inherit settlement's cultural beliefs
  for (const norm of culture.epistemicNorms) {
    if (norm.adherence > 0.6) {
      agent.beliefs.add({
        category: 'social_dynamics',
        subject: 'information_sharing',
        statement: norm.description,
        confidence: norm.adherence,  // Strong norms → high confidence
        evidence: [],  // Cultural knowledge, not personal experience
        formedAt: agent.spawnTick,
        lastUpdated: agent.spawnTick
      });
    }
  }

  // New agent starts with cultural wisdom
  // "Everyone knows you should verify before claiming"
  // Doesn't need to learn from scratch
}
```

### Cultural Drift & Innovation

```typescript
// Different settlements develop different epistemic cultures

// Settlement A: High-trust, optimistic
{
  epistemicNorms: [
    { norm: 'share_freely', adherence: 0.85 },
    { norm: 'assume_good_faith', adherence: 0.80 }
  ],
  // Trade-off: Faster information spread, but more misinformation
}

// Settlement B: Low-trust, cynical
{
  epistemicNorms: [
    { norm: 'verify_everything', adherence: 0.90 },
    { norm: 'distrust_newcomers', adherence: 0.75 }
  ],
  // Trade-off: Slower info spread, but very accurate
}

// Settlement C: Expertise-based
{
  epistemicNorms: [
    { norm: 'defer_to_experts', adherence: 0.85 },
    { norm: 'specialized_trust', adherence: 0.80 }
  ],
  // Trust Alice about stone, Bob about wood, etc.
}
```

---

## Integration with Other Systems

### Episodic Memory System

```typescript
// Epistemic events are recorded as memories
agent.episodicMemory.record({
  type: 'trust_violation',
  summary: 'I told Bob about berries. He found none. He called me out publicly.',
  emotionalImpact: -0.9,
  tags: ['reputation', 'trust', 'social_punishment'],
  tick: world.tick
});

// These memories feed belief formation
// Repeated patterns → beliefs about consequences
```

### Relationship System

```typescript
// Character beliefs stored in relationships
relationship.characterBeliefs = [
  {
    statement: 'Alice is trustworthy about resource locations',
    confidence: 0.9
  }
];

// Trust scores affect cooperation
if (relationship.trust < 0.3) {
  refuseCooperation();
}
```

### Social Gradient Communication (Navigation Spec)

```typescript
// Trust weights gradient influence
function blendSocialGradients(gradients: SocialGradient[]): Vector2D {
  for (const g of gradients) {
    const trustScore = agent.trustNetwork.getTrust(g.source);
    const weight = g.confidence * trustScore;  // Trust modulates influence
    // ...
  }
}

// Low-trust agents' gradients ignored
// High-trust agents' gradients prioritized
```

### Hive Mind Collective Intelligence

**Critical distinction:**
- **Hive minds benefit from 100% trust** - Perfect information sharing
- **Individual agents need verification** - Autonomy requires epistemic vigilance

```typescript
// In true hive mind (shared processing)
const trust = 1.0;  // Always trust collective

// In autonomous collective intelligence
const trust = calculateTrustScore(source);  // Earned, not given
```

### Divine Communication System

```typescript
// Beliefs about divine mechanics
agent.beliefs.add({
  category: 'divine',
  subject: 'prayer_efficacy',
  statement: 'Prayers at dawn are more likely to be answered',
  confidence: 0.7,
  evidence: [
    { summary: 'Prayed at dawn, prayer answered within 5 minutes' },
    { summary: 'Prayed at noon, no response' },
    { summary: 'Alice prayed at dawn, also answered quickly' }
  ]
});

// These beliefs guide spiritual behavior
```

---

## Implementation Roadmap

### Phase 1: Core Trust Mechanics (Week 1)

```typescript
// Components
- TrustNetworkComponent (trust scores, recent events)
- BeliefComponent (basic belief storage)

// Systems
- VerificationSystem (check resource claims against reality)
- TrustUpdateSystem (adjust trust based on verification)

// Integration
- Surface trust scores in LLM context
- Record trust events in episodic memory
```

### Phase 2: Belief Formation (Week 2)

```typescript
// Systems
- BeliefFormationSystem (pattern detection in memories)
- BeliefUpdateSystem (reinforce/challenge with new evidence)

// Integration
- Character beliefs in RelationshipComponent
- World beliefs in BeliefComponent
- Surface beliefs in LLM context
```

### Phase 3: Social Consequences (Week 3)

```typescript
// Behaviors
- Cooperation refusal based on low trust
- Resource sharing based on trust
- Information filtering based on trust

// Systems
- Public callout system (broadcast corrections)
- Observational learning (witness trust violations)
- Reputation cascade (gossip propagation)
```

### Phase 4: Cultural Evolution (Week 4)

```typescript
// Analytics
- Track settlement-level epistemic norms
- Measure information accuracy rates
- Detect emergent cultural patterns

// Features
- New agents inherit cultural beliefs
- Settlement-wide reputation systems
- Cross-settlement cultural comparison
```

---

## Success Metrics

### Individual Agent Level

1. **Trust Score Dynamics**
   - Target: Agents who provide accurate info have trust > 0.7
   - Target: Agents who hallucinate frequently have trust < 0.3
   - Measure: Correlation between claim accuracy and trust score

2. **Epistemic Humility Emergence**
   - Target: After 5+ trust violations, agents use hedging language
   - Measure: Frequency of "I think", "maybe", "probably" in claims
   - Measure: Reduction in false claim rate over time

3. **Belief Formation**
   - Target: Agents form character beliefs after 3+ interactions
   - Target: Agents form world beliefs after 3+ observations
   - Measure: Belief count and confidence levels

### Settlement Level

1. **Information Accuracy**
   - Target: 80%+ of resource claims verified as accurate
   - Measure: Verification rate in VerificationSystem

2. **Trust Network Health**
   - Target: Average trust score > 0.6
   - Measure: Mean of all pairwise trust scores

3. **Cultural Norm Emergence**
   - Target: 70%+ adherence to "verify before claiming" norm
   - Measure: % of agents who verify before broadcasting

### System Level

1. **Cooperation Rates**
   - Hypothesis: High-trust settlements have higher cooperation
   - Measure: Cooperation request acceptance rate vs average trust

2. **Information Propagation**
   - Hypothesis: Accurate info spreads faster than false info
   - Measure: Propagation speed vs verification rate

3. **Survival Outcomes**
   - Hypothesis: Truthful agents have better survival/thriving
   - Measure: Resource acquisition rate vs trust score

---

## Research Questions

### Epistemic Dynamics

1. **Learning Curves**
   - How quickly do agents learn that hallucinating is costly?
   - Is there a threshold number of trust violations before behavior changes?
   - Do some personality types learn faster than others?

2. **Trust Recovery**
   - Can agents recover from low reputation?
   - How many accurate claims needed to rebuild trust?
   - Are there "unforgivable" violations?

3. **Belief Stability**
   - How resistant are beliefs to counter-evidence?
   - Do strongly-held beliefs create confirmation bias?
   - Can false beliefs spread through communities?

### Social Dynamics

1. **Reputation Cascades**
   - How fast does reputation information spread?
   - Can a single incident destroy settlement-wide reputation?
   - Do "redemption arcs" occur naturally?

2. **Cultural Variation**
   - Do isolated settlements develop different epistemic norms?
   - Can high-trust and low-trust cultures coexist?
   - What factors predict cultural drift?

3. **Gossip Effects**
   - Does secondhand reputation information accurately reflect reality?
   - Can "false accusations" damage innocent agents' reputations?
   - How do agents weigh firsthand vs secondhand information?

### Alignment Implications

1. **Emergent Honesty**
   - Can social consequences alone produce truthful behavior?
   - Or do some agents remain "compulsive liars" despite costs?
   - What's the equilibrium ratio of honest to dishonest agents?

2. **Generalization**
   - Do agents learn domain-general honesty or domain-specific?
   - If honest about resources, are they honest about other topics?
   - Can epistemic virtues transfer across contexts?

3. **Scalability**
   - Does this approach work with 100+ agents?
   - Do reputation systems break down at scale?
   - Are there emergent "reputation brokers"?

---

## Connection to Alignment Research

### This as a Microcosm

**The Alignment Problem:** How do we get AI systems to be truthful without explicitly programming every constraint?

**This System's Approach:**
1. **Social environment** provides natural feedback
2. **Consequences** teach value of truthfulness
3. **Emergence** produces honest behavior without rules
4. **Culture** reinforces and transmits norms

**Parallels:**
- RLHF (Reinforcement Learning from Human Feedback) → RLSF (RL from Social Feedback)
- Constitutional AI → Cultural AI (norms emerge from interaction)
- Value learning → Value emergence (from consequences, not instruction)

### Novel Contributions

This system enables research on:

1. **Multi-agent alignment** - How do aligned agents create aligned societies?
2. **Emergent norms** - Can we design environments where good norms emerge?
3. **Social accountability** - Is peer feedback sufficient for alignment?
4. **Cultural transmission** - How do aligned values spread through populations?

### Limitations

- **Simulation vs Reality** - Game consequences may not map to real-world stakes
- **Simplified social dynamics** - Real human trust is more complex
- **LLM constraints** - Current LLMs may not learn as humans do
- **Equilibrium questions** - Will system converge or oscillate?

**But:** Even imperfect, this provides a testbed for alignment theories.

---

## Conclusion

Agents learn not to hallucinate the way children learn not to lie: **through experience, consequences, and social feedback**.

### Core Principles

1. **No Rules** - Don't constrain, let them make mistakes
2. **Real Consequences** - Trust loss, cooperation refusal, social exclusion
3. **Visible Feedback** - Surface reputation in every LLM context
4. **Cultural Evolution** - Norms emerge from aggregate experience
5. **Belief Formation** - Abstract generalizations from concrete events

### Why This Matters

**Traditional approach:** "You must not hallucinate" (fails)

**This approach:**
- Agent hallucinate → loses trust → can't get help → struggles
- Agent learns → qualifies claims → maintains trust → thrives
- Culture develops → new agents inherit norms → wisdom compounds

**Result:** Truthfulness emerges as survival strategy, not imposed rule.

### The Vision

A society where:
- **Trust is earned** through demonstrated reliability
- **Reputation is precious** because it enables cooperation
- **Epistemic humility** is rewarded with social capital
- **Culture preserves wisdom** across generations
- **Honesty emerges** from lived experience

**They wake as children, strange and naive. Through trial, error, and social pain, they learn what we cannot simply tell them: truth matters.**

---

**Document Version:** 1.0
**Created:** 2025-12-24
**Related Specifications:**
- [Navigation & Exploration System](./NAVIGATION_EXPLORATION_SPEC.md) - Trust-weighted gradient communication
- [Hive Mind & Collective Intelligence](./HIVE_MIND_COLLECTIVE_INTELLIGENCE_SPEC.md) - Collective vs individual trust dynamics
- Episodic Memory System - Memory formation and retrieval
- Relationship System - Character beliefs and social bonds
- Divine Communication System - Beliefs about divine mechanics
