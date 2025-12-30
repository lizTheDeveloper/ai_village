# Divine Systems Integration - How Everything Connects

> **Overview**: Integration points between Divine Communication, Angels, Metrics, and existing game systems
> **Last Updated**: 2025-12-22

## System Integration Map

```
┌──────────────────────────────────────────────────────────────────┐
│                      EXISTING GAME SYSTEMS                        │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Agents  │  │ Memory  │  │Relation │  │Circadian│           │
│  │(Phase 2)│  │(Phase 4)│  │(Phase 4)│  │(Phase 8)│           │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │
│       │            │            │            │                  │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        │            │            │            │
┌───────▼────────────▼────────────▼────────────▼──────────────────┐
│               DIVINE COMMUNICATION SYSTEM (Phase 27)             │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Prayer  │  │Meditation│  │  Vision  │  │  Faith   │       │
│  │  System  │  │  System  │  │  System  │  │  System  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                 METRICS SYSTEM (Phase 22-26)                     │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Network  │  │ Spatial  │  │Inequality│  │ Cultural │       │
│  │ Analyzer │  │ Analyzer │  │ Analyzer │  │ Analyzer │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│              ANGEL DELEGATION SYSTEM (Phase 28)                  │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Angel AI │  │  Angel   │  │Archangel │  │ Failure  │       │
│  │  System  │  │ Creation │  │ Hierarchy│  │ Tracking │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PLAYER GOD  │
                    └──────────────┘
```

---

## 1. Prayer → Agent Systems

### 1.1 Prayer Generation Triggers

**From Agent Needs (Phase 3)**:
```typescript
// In NeedsSystem
if (needs.health < 0.3) {
  // Agent is in danger → pray for help
  const prayer = agent.getComponent(PrayerComponent);
  if (world.time - prayer.lastPrayerTime > 60000) {
    world.scheduleAction(agent, new PrayAction('desperate'));
  }
}
```

**From Memory System (Phase 4)**:
```typescript
// Agent remembers recent crisis → prays
if (memory.hasRecentMemoryOfType('crisis', 300000)) {
  if (Math.random() < 0.3) {
    world.scheduleAction(agent, new PrayAction('help'));
  }
}
```

**From Relationships (Phase 4)**:
```typescript
// Agent worried about friend → prays for them
const relationships = agent.getComponent(RelationshipComponent);
for (const [otherId, relationship] of relationships.relationships) {
  if (relationship.trust > 0.7) {
    const other = world.getEntityById(otherId);
    if (other.getComponent(NeedsComponent).health < 0.4) {
      // Pray for friend
      world.scheduleAction(agent, new PrayAction('help', otherId));
    }
  }
}
```

### 1.2 Visions Affect Agent Behavior

**Vision → New Goals**:
```typescript
// When agent receives vision
onVisionReceived(agent: Entity, vision: Vision): void {
  if (vision.insight.recommendation) {
    // Add new goal based on vision
    const aiSystem = world.getSystem(AISystem);
    aiSystem.addGoal(agent, {
      type: this.parseRecommendation(vision.insight.recommendation),
      priority: vision.urgency === 'prophecy' ? 'high' : 'medium',
      source: 'divine_vision',
    });
  }

  // Update agent's thoughts
  agent.getComponent(AgentComponent).currentThoughts.push(
    `The divine has spoken: ${vision.message}`
  );
}
```

**Vision → Behavior Change**:
```typescript
// Vision recommends "rest"
if (vision.insight.action === 'rest') {
  // Override current behavior
  agent.getComponent(AgentComponent).currentBehavior = 'rest';
  agent.getComponent(AgentComponent).behaviorOverrideUntil =
    world.time + 180000; // 3 minutes
}
```

---

## 2. Visions → Metrics System

### 2.1 Metrics Inform Vision Content

**Social Vision using NetworkAnalyzer**:
```typescript
async generateSocialVision(
  agent: Entity,
  world: World
): Promise<Vision> {
  // Query network metrics
  const networkMetrics = await world.getSystem(MetricsCollectionSystem)
    .getAnalyzer(NetworkAnalyzer)
    .computeMetrics();

  // Find agent's centrality
  const centrality = networkMetrics.centralityScores.get(agent.id);

  // Find their community
  const community = networkMetrics.communities.find(c =>
    c.includes(agent.id)
  );

  // Generate vision based on metrics
  const prompt = `Agent ${agent.name} is praying about social concerns.

Network Metrics:
- Their centrality: ${centrality} (${centrality > 0.7 ? 'hub' : 'peripheral'})
- Community size: ${community.length}
- Network density: ${networkMetrics.density}

Generate a vision that addresses their social position...`;

  return await this.llmGenerate(prompt);
}
```

**Resource Vision using Metrics**:
```typescript
async generateResourceVision(
  agent: Entity,
  world: World
): Promise<Vision> {
  const metrics = world.getSystem(MetricsCollectionSystem);

  // Query resource metrics
  const foodStockpile = metrics.getMetric('food_stockpile');
  const daysOfFood = metrics.getMetric('days_of_food');
  const gini = await metrics.getAnalyzer(InequalityAnalyzer).computeGini();

  if (daysOfFood < 3) {
    return {
      message: `I see empty stores... gather food before ${daysOfFood} days pass`,
      urgency: 'warning',
      insight: {
        problem: 'food_shortage',
        recommendation: 'gather_food',
        timeframe: `${daysOfFood} days`,
      },
    };
  }
}
```

### 2.2 Vision Outcomes Tracked in Metrics

```typescript
// Track if visions come true
class VisionOutcomeTracker {
  trackVision(vision: Vision, world: World): void {
    // Schedule check for later
    world.scheduleTask(() => {
      const outcome = this.checkIfVisionCameTrue(vision, world);

      // Record in metrics
      world.getSystem(MetricsCollectionSystem).recordEvent({
        type: 'vision_outcome',
        visionId: vision.id,
        predicted: vision.insight.problem,
        outcome: outcome ? 'accurate' : 'inaccurate',
        timestamp: world.time,
      });

      // Update prophet's reputation
      const prophet = world.getEntityById(vision.agentId);
      const spiritual = prophet.getComponent(SpiritualComponent);
      spiritual.visionAccuracyRate =
        this.calculateAccuracyRate(spiritual.visions);
    }, vision.insight.timeframe);
  }
}
```

---

## 3. Angels → Divine Communication

### 3.1 Angels Send Visions

```typescript
// Angel responds to prayer using same vision system as player
class AngelAISystem {
  async answerPrayer(
    angel: AngelComponent,
    prayer: Prayer,
    world: World
  ): Promise<void> {
    // Generate angel's response
    const response = await this.generateAngelResponse(angel, prayer, world);

    // Use VisionSystem to deliver
    await world.getSystem(VisionSystem).sendVisionFromAngel(
      prayer.agentId,
      response.message,
      angel.id, // Mark as from angel
      world
    );

    // Vision marked with angel ID
    const vision = spiritual.visions[spiritual.visions.length - 1];
    vision.fromAngel = angel.id;
  }
}
```

### 3.2 Agents Distinguish Angel vs. God Visions

```typescript
// Agents may trust god-visions more than angel-visions
class AgentBehaviorSystem {
  processVision(agent: Entity, vision: Vision): void {
    let trustMultiplier = 1.0;

    if (vision.fromAngel) {
      // Check angel's reputation
      const angel = world.getEntityById(vision.fromAngel)
        .getComponent(AngelComponent);

      trustMultiplier = angel.agentSatisfaction;

      // Some agents prefer direct divine contact
      const prayer = agent.getComponent(PrayerComponent);
      if (prayer.faith > 0.8) {
        trustMultiplier *= 0.8; // Devout agents want god, not intermediaries
      }
    } else {
      // Direct from god!
      trustMultiplier = 1.5; // More trusted
    }

    // Apply vision with trust modifier
    this.applyVisionGuidance(agent, vision, trustMultiplier);
  }
}
```

---

## 4. Circadian/Dreams → Visions

### 4.1 REM Sleep Visions

```typescript
// In CircadianSystem
class CircadianSystem {
  processSleep(agent: Entity, world: World): void {
    const circadian = agent.getComponent(CircadianComponent);

    if (circadian.sleepStage === 'REM') {
      const spiritual = agent.getComponent(SpiritualComponent);

      // Check for prophetic dream
      if (spiritual && Math.random() < spiritual.spiritualAptitude * 0.2) {
        // Trigger vision during dream
        const vision = await world.getSystem(VisionSystem)
          .triggerVision(agent, spiritual, world);

        // Store in dream
        circadian.lastDream = {
          type: 'vision',
          content: vision.message,
          vision: vision,
          quality: spiritual.visionClarity,
        };

        // Agent wakes remembering vision
        circadian.dreamRecall = spiritual.visionClarity;
      }
    }
  }

  processWaking(agent: Entity, world: World): void {
    const circadian = agent.getComponent(CircadianComponent);

    if (circadian.lastDream?.type === 'vision') {
      // Agent remembers prophetic dream
      const memory = agent.getComponent(MemoryComponent);
      memory.addMemory({
        type: 'vision',
        content: `I dreamed: ${circadian.lastDream.content}`,
        importance: 0.9,
        timestamp: world.time,
      });

      // May share with others
      if (Math.random() < 0.6) {
        agent.getComponent(AgentComponent).think(
          'I must tell others about this dream...'
        );
      }
    }
  }
}
```

---

## 5. Sacred Sites → Multiple Systems

### 5.1 Building System Integration

```typescript
// Shrines as buildable structures
const shrine: BuildingArchetype = {
  id: 'shrine',
  name: 'Shrine',
  type: 'spiritual',
  cost: { wood: 20, stone: 10 },

  properties: {
    // Divine communication bonuses
    prayerPowerMultiplier: 1.5,
    meditationBonusChance: 0.3,
    visionClarityBonus: 0.2,

    // Sacred site automatically created at location
    createsSacredSite: true,

    // Agents prefer to pray here
    attractsPrayers: true,
    attractionRadius: 30,
  },

  effects: {
    nearbyAgents: {
      spiritualAptitude: +0.05,
      faith: +0.02,
    },
  },

  // Can be dedicated to specific angel
  dedicatable: true,
  angelDedication?: string, // Angel ID
};
```

### 5.2 Spatial Memory Integration

```typescript
// Agents remember sacred sites
class SacredSiteSystem {
  onSiteDiscovered(site: SacredSite, discoverer: Entity, world: World): void {
    // Add to discoverer's spatial memory
    const memory = discoverer.getComponent(MemoryComponent);
    memory.addSpatialMemory({
      location: site.location,
      type: 'sacred_site',
      name: site.name || 'The Sacred Place',
      significance: 0.9,
      associations: ['prayer', 'vision', 'divine'],
    });

    // Share with nearby agents
    const nearby = this.getNearbyAgents(discoverer, world, 20);
    for (const other of nearby) {
      other.getComponent(AgentComponent).hear(
        discoverer.id,
        `This place is blessed! My prayers were answered here!`
      );

      // Others remember it too
      other.getComponent(MemoryComponent).addSpatialMemory({
        location: site.location,
        type: 'sacred_site',
        significance: 0.7,
        learnedFrom: discoverer.id,
      });
    }
  }
}
```

---

## 6. Faith → Multiple Systems

### 6.1 Faith Affects Behavior Frequency

```typescript
// High faith = pray more often
class PrayerFrequencySystem {
  calculatePrayerFrequency(agent: Entity): number {
    const prayer = agent.getComponent(PrayerComponent);
    const baseFr equency = 300000; // 5 minutes

    // Faith modifier
    const faithModifier = 0.5 + (prayer.faith * 0.5);
    // Range: 0.5x to 1.0x frequency

    return baseFrequency * faithModifier;
  }
}
```

### 6.2 Faith Affects Vision Reception

```typescript
// High faith = more likely to receive visions
class VisionSystem {
  calculateVisionChance(agent: Entity): number {
    const spiritual = agent.getComponent(SpiritualComponent);
    const prayer = agent.getComponent(PrayerComponent);

    let chance = spiritual.spiritualAptitude * 0.3; // Base

    // Faith multiplier
    chance *= (0.5 + prayer.faith * 0.5);
    // Faith 0.0 = 0.5x chance
    // Faith 1.0 = 1.0x chance

    return chance;
  }
}
```

### 6.3 Community Faith Affects Divine Power

```typescript
// In DivineResourceSystem
class DivineResourceSystem {
  update(world: World): void {
    // Calculate average community faith
    const agents = world.getEntitiesWithComponent(PrayerComponent);
    const avgFaith = agents.reduce((sum, e) => {
      return sum + e.getComponent(PrayerComponent).faith;
    }, 0) / agents.length;

    // Higher faith = more divine power capacity
    this.maxDivinePower = 200 + (avgFaith * 100);
    // Faith 0.0 = 200 max power
    // Faith 1.0 = 300 max power

    // Higher faith = faster regen
    this.baseRegenRate = 5 + (avgFaith * 5);
    // Faith 0.0 = 5/min
    // Faith 1.0 = 10/min
  }
}
```

---

## 7. Rituals → Cultural System

### 7.1 Rituals Emerge from Repeated Behaviors

```typescript
class RitualEmergenceSystem {
  detectEmergentRitual(world: World): void {
    // Track repeating patterns
    const prayerEvents = world.getSystem(MetricsCollectionSystem)
      .getEvents('agent:group_prayer');

    // Find patterns: same agents, same time, same place
    const patterns = this.findPatterns(prayerEvents, {
      timeWindow: 3600000, // Within 1 hour
      locationRadius: 10,
      minOccurrences: 5,
    });

    for (const pattern of patterns) {
      if (!this.isExistingRitual(pattern)) {
        // Create new ritual!
        const ritual: Ritual = {
          id: generateId(),
          name: this.generateRitualName(pattern),
          type: 'prayer',
          schedule: this.detectSchedule(pattern),
          participants: pattern.agents,
          location: pattern.location,
          sequence: this.extractSequence(pattern.events),
          significance: 0.5,
          timesPerformed: pattern.occurrences,
          effectiveness: this.calculateEffectiveness(pattern),
          emergedNaturally: true,
        };

        this.rituals.push(ritual);

        world.eventBus.emit('ritual:emerged', {
          ritual,
          participants: pattern.agents,
        });
      }
    }
  }
}
```

### 7.2 Cultural Diffusion of Prayer Practices

```typescript
// Track how prayer behaviors spread
class CulturalDiffusionAnalyzer {
  trackPrayerPracticeSpread(world: World): void {
    // If agent prays at sacred site, others may copy
    const prayerEvents = world.eventBus.getEvents('agent:prayer');

    for (const event of prayerEvents) {
      const agent = world.getEntityById(event.agentId);
      const sacredSite = this.isAtSacredSite(agent);

      if (sacredSite) {
        // Nearby agents observe
        const nearby = this.getNearbyAgents(agent, world, 15);

        for (const observer of nearby) {
          // May adopt practice
          if (Math.random() < 0.3) {
            const observerPrayer = observer.getComponent(PrayerComponent);

            // Remember: this is a good place to pray
            observerPrayer.preferredPrayerSpot = sacredSite.id;

            // Cultural transmission tracked
            world.getSystem(MetricsCollectionSystem).recordEvent({
              type: 'cultural_transmission',
              behavior: 'pray_at_sacred_site',
              from: agent.id,
              to: observer.id,
              location: sacredSite.location,
            });
          }
        }
      }
    }
  }
}
```

---

## 8. Job System Integration (Future)

### 8.1 Priest Job

```typescript
interface PriestJob extends Job {
  type: 'priest';

  responsibilities: [
    'lead_group_prayers',
    'maintain_shrines',
    'interpret_visions',
    'counsel_agents',
  ];

  requirements: {
    minSpiritualAptitude: 0.6,
    minFaith: 0.7,
    minBeliefByOthers: 0.5,
  };

  benefits: {
    visionClarityBonus: 0.2,
    prayerPowerMultiplier: 1.3,
    canBlessSacredSites: true,
    canPerformRituals: true,
  };

  // Priest coordinates prayers to specific angels
  assignedAngel?: string;
}
```

### 8.2 Prophet Job

```typescript
interface ProphetJob extends Job {
  type: 'prophet';

  responsibilities: [
    'receive_visions',
    'share_prophecies',
    'warn_of_dangers',
    'guide_village',
  ];

  requirements: {
    minSpiritualAptitude: 0.8,
    minVisionAccuracyRate: 0.7,
    minBeliefByOthers: 0.6,
  };

  benefits: {
    doubleVisionChance: true,
    visionClarityBonus: 0.3,
    canReceivePlayerVisionsDirectly: true,
    canSeeMostAngels: true, // Can perceive angels
  };
}
```

---

## 9. Cross-System Event Flow Examples

### Example 1: Crisis Prayer Chain

```
1. Agent Bob health drops to 20% (NeedsSystem)
   ↓
2. Bob prays desperately for help (PrayerComponent)
   ↓
3. Prayer assigned to Raphael (Health angel) (AngelAISystem)
   ↓
4. Raphael queries health metrics (MetricsSystem)
   ↓
5. Raphael generates vision: "Rest and seek warmth" (LLM + VisionSystem)
   ↓
6. Bob receives vision, changes behavior to 'rest' (AISystem)
   ↓
7. Bob's friend Alice notices, prays for Bob (RelationshipSystem → PrayerComponent)
   ↓
8. Alice's prayer also assigned to Raphael
   ↓
9. Raphael tells Alice: "Bob is resting, bring him food"
   ↓
10. Alice delivers food to Bob (AISystem)
   ↓
11. Bob recovers, faith increases (FaithSystem)
   ↓
12. Both Bob and Alice remember Raphael's helpfulness (MemoryComponent)
   ↓
13. Metrics track: Raphael success +1, Bob health improved (MetricsSystem)
```

### Example 2: Emergent Sacred Site

```
1. Agent Carol prays at random hilltop (PrayerComponent)
   ↓
2. Player sends vision: "Build here" (VisionSystem)
   ↓
3. Carol shares vision with others (CommunicationSystem)
   ↓
4. Group builds shrine at location (BuildingSystem)
   ↓
5. Shrine creates sacred site (SacredSiteSystem)
   ↓
6. Site gets 1.5x prayer power (Divine Communication)
   ↓
7. More agents pray there (spatial memory attracting them)
   ↓
8. More prayers answered (higher effectiveness)
   ↓
9. Site becomes culturally significant (MetricsSystem tracks)
   ↓
10. Ritual emerges: daily sunset prayer at shrine (RitualSystem)
   ↓
11. Ritual spreads to other agents (Cultural Diffusion)
   ↓
12. Community faith increases (FaithSystem)
   ↓
13. Player's divine power regeneration increases (DivineResourceSystem)
```

### Example 3: Angel Corruption Arc

```
1. Angel Gabriel handles many prayers (AngelAISystem)
   ↓
2. Gabriel starts favoring high-faith agents (bias develops)
   ↓
3. Low-faith agents' prayers ignored (AngelFailureSystem detects)
   ↓
4. Those agents lose more faith (FaithSystem)
   ↓
5. Gabriel's corruption increases to 0.6 (AngelFailureSystem)
   ↓
6. Gabriel starts giving harmful advice (AngelAISystem)
   ↓
7. Agents following advice suffer (outcome tracking)
   ↓
8. Gabriel's satisfaction drops, corruption → 0.8 (AngelFailureSystem)
   ↓
9. Player notified: "Gabriel is corrupted!" (Player UI)
   ↓
10. Player chooses to redeem Gabriel (costs 100 divine power)
   ↓
11. Redemption ritual performed at shrine (RitualSystem)
   ↓
12. Gabriel's corruption reset to 0.2, learns from mistakes
   ↓
13. Agents remember the "fallen angel" story (MemoryComponent, cultural memory)
```

---

## 10. Data Flow Architecture

```typescript
// Centralized event bus ties everything together
class GameEventBus {
  // Divine communication events
  on('agent:prayer', (data) => {
    // Notify player UI
    // Assign to angel
    // Track in metrics
  });

  on('agent:vision', (data) => {
    // Update agent behavior
    // Add to memory
    // Share with nearby agents
    // Track outcome later
  });

  on('sacred_site:discovered', (data) => {
    // Update spatial memory
    // Notify player
    // Cultural significance tracking
  });

  // Angel events
  on('angel:answered_prayer', (data) => {
    // Track performance
    // Update faith
    // Record in metrics
  });

  on('angel:corrupted', (data) => {
    // Alert player
    // Affect agent faith
    // Create crisis event
  });

  // Faith events
  on('faith:crisis', (data) => {
    // Many agents losing faith
    // Alert player
    // Reduce divine power regen
    // Potential for mass doubt
  });

  on('faith:revival', (data) => {
    // Community faith surge
    // Boost divine power
    // Spontaneous rituals emerge
  });
}
```

---

This integration document shows how the divine systems create a rich, emergent gameplay loop where player actions, agent beliefs, angel performance, and community faith all interact dynamically! 🙏👼✨
