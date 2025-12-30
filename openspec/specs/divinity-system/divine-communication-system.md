# Divine Communication System - Prayer, Meditation & Visions

> **Status**: Phase 27 Ready
> **Dependencies**: Phase 3 (Agent Needs), Phase 4 (Memory), Phase 5 (Communication), Phase 8 (Circadian/Sleep)
> **Estimated LOC**: ~3,000
> **Last Updated**: 2025-12-22

## Table of Contents

1. [Core Concept](#1-core-concept)
2. [Prayer System](#2-prayer-system)
3. [Meditation System](#3-meditation-system)
4. [Vision System](#4-vision-system)
5. [Sacred Locations](#5-sacred-locations)
6. [Group Prayer & Rituals](#6-group-prayer--rituals)
7. [Faith & Doubt Mechanics](#7-faith--doubt-mechanics)
8. [Player Interface](#8-player-interface)
9. [Integration Points](#9-integration-points)
10. [Implementation Plan](#10-implementation-plan)

---

## 1. Core Concept

### 1.1 The Divine Channel

The player is **God/The Universe** - a divine presence watching over the village. Agents communicate with the player through **prayer** (speaking to god) and **meditation** (listening for divine guidance).

```
        AGENT                          PLAYER (GOD)
          │                                  │
          │   🙏 Prayer (active)             │
          │────────────────────────────────>│
          │   "Please help Bob"              │
          │                                  │
          │   🧘 Meditation (receptive)      │
          │<────────────────────────────────│
          │   Receives vision/guidance       │
          │                                  │
```

**From Agent Perspective**: Divine revelation, spiritual connection, answered prayers
**From Player Perspective**: Direct communication channel to influence simulation

### 1.2 Communication Modes

**Prayer (Agent → God)**
- Active communication from agent to player
- Triggered by worry, crisis, gratitude, routine
- Visible to player as notifications
- Agent speaks their concerns/questions/thanks

**Meditation (God → Agent)**
- Receptive state where agent listens for divine response
- Higher chance of receiving visions
- Usually follows prayer
- Agent sits quietly, contemplating

**Vision (God → Agent)**
- Divine message delivered during meditation or dreams
- Contains guidance, warnings, or revelations
- Agent can share with others
- Affects agent behavior and faith

---

## 2. Prayer System

### 2.1 Prayer Component

```typescript
interface PrayerComponent {
  // Prayer history
  prayers: Prayer[];
  lastPrayerTime: number;
  prayerFrequency: number; // Base frequency in ms

  // Relationship with divine
  faith: number; // 0-1, strength of belief
  unansweredPrayers: number;
  answeredPrayers: number;
  lastAnsweredPrayerTime: number;

  // Current state
  isPraying: boolean;
  currentPrayer?: Prayer;
  prayerDuration: number;
  prayerLocation?: { x: number; y: number };

  // Preferences
  preferredPrayerSpot?: string; // Sacred site ID
  prayerStyle: 'formal' | 'conversational' | 'desperate' | 'grateful';

  // Doubts
  doubts: Doubt[];
}

interface Prayer {
  id: string;
  agentId: string;
  timestamp: number;

  // Content
  type: PrayerType;
  content: string; // Natural language prayer
  urgency: 'low' | 'medium' | 'high' | 'desperate';

  // Structured request
  request: {
    about: 'self' | 'other' | 'village' | 'decision' | 'gratitude';
    subject?: string; // Agent/building ID
    question?: string; // Core question
  };

  // Response tracking
  answered: boolean;
  responseType?: 'vision' | 'sign' | 'silence';
  responseTime?: number;
  answeringEntity?: string; // Player or angel ID
  satisfiedWithResponse?: boolean;
}

enum PrayerType {
  GUIDANCE = 'guidance',      // "What should I do?"
  HELP = 'help',              // "Please help X"
  GRATITUDE = 'gratitude',    // "Thank you for X"
  QUESTION = 'question',      // "Why did X happen?"
  CONFESSION = 'confession',  // "I'm sorry for X"
  PLEA = 'plea',             // "Please make X happen"
}

interface Doubt {
  reason: string;
  severity: number; // 0-1
  timestamp: number;
  resolved: boolean;
  resolutionReason?: string;
}
```

### 2.2 Prayer Behavior

```typescript
class PrayAction extends AgentAction {
  name = 'pray';
  duration = 60000; // 1 minute

  preconditions(agent: Entity, world: World): boolean {
    const prayer = agent.getComponent(PrayerComponent);
    const needs = agent.getComponent(NeedsComponent);

    // Don't pray if desperate for survival
    if (needs.hunger < 0.2 || needs.health < 0.2) return false;

    // Pray if:
    // 1. Worried about something
    // 2. Time since last prayer exceeds frequency
    // 3. Someone nearby is suffering
    // 4. Recent crisis
    // 5. Grateful for good fortune

    return this.shouldPray(agent, world);
  }

  async execute(agent: Entity, world: World): Promise<void> {
    const agentComp = agent.getComponent(AgentComponent);
    const prayer = agent.getComponent(PrayerComponent);

    // Generate prayer content using LLM
    const prayerContent = await this.generatePrayer(agent, world);

    // Create prayer object
    const newPrayer: Prayer = {
      id: generateId(),
      agentId: agentComp.id,
      timestamp: world.time,
      type: prayerContent.type,
      content: prayerContent.content,
      urgency: prayerContent.urgency,
      request: prayerContent.request,
      answered: false,
    };

    prayer.prayers.push(newPrayer);
    prayer.currentPrayer = newPrayer;
    prayer.isPraying = true;
    prayer.lastPrayerTime = world.time;

    // Visual: agent praying pose
    agentComp.currentBehavior = 'praying';
    agentComp.currentAnimation = 'pray_animation';

    // Agent may speak prayer aloud
    if (prayerContent.spokenAloud) {
      agentComp.speak(prayerContent.spokenVersion);
    }

    // Emit to player
    world.eventBus.emit('agent:prayer', {
      agent: agentComp,
      prayer: newPrayer,
    });

    // Add to memory
    const memory = agent.getComponent(MemoryComponent);
    memory.addMemory({
      type: 'prayer',
      content: `I prayed: ${prayerContent.content}`,
      importance: 0.6,
      timestamp: world.time,
    });

    // After prayer, may meditate for response
    if (Math.random() < 0.4) {
      world.scheduleAction(agent, new MeditateAction(), this.duration);
    }
  }
}
```

### 2.3 Prayer Triggers

**Automatic Triggers**:
- **Worry**: Agent has concerns in memory
- **Crisis**: Health < 30%, hunger < 30%, threat nearby
- **Confusion**: Multiple conflicting goals
- **Grief**: Recent death of close agent
- **Gratitude**: Recent positive event (harvest, birth, recovery)
- **Routine**: Time since last prayer exceeds personal frequency

**Conditional Triggers**:
- **Someone Suffering**: Nearby agent with low health/needs
- **Big Decision**: About to start expensive construction
- **Unknown Territory**: Exploring new areas
- **Sacred Moment**: Eclipse, first snow, full moon

---

## 3. Meditation System

### 3.1 Spiritual Component

```typescript
interface SpiritualComponent {
  // Connection to divine
  spiritualAptitude: number; // 0-1, innate trait
  visionClarity: number; // 0-1, how clear visions are

  // Domains of insight
  domains: VisionDomain[];

  // Vision history
  visions: Vision[];
  lastVisionTime: number;
  pendingVision?: {
    message: string;
    inResponseTo: string; // Prayer ID
  };

  // Reputation
  believedByOthers: number; // 0-1, trusted as prophet?
  visionAccuracyRate: number; // % of visions that came true

  // Practice
  meditationDuration: number; // Total time spent meditating
  meditationFrequency: number; // How often they meditate

  // State
  isInVision: boolean;
  isReceivingVision: boolean;
}

enum VisionDomain {
  SOCIAL = 'social',           // Relationships, community
  HEALTH = 'health',           // Wellbeing, sickness
  RESOURCES = 'resources',     // Food, materials
  ENVIRONMENT = 'environment', // Weather, farming
  BUILDING = 'building',       // Construction, placement
  INNOVATION = 'innovation',   // New techniques
  STRATEGY = 'strategy',       // Long-term planning
  CULTURAL = 'cultural',       // Traditions, customs
}
```

### 3.2 Meditation Behavior

```typescript
class MeditateAction extends AgentAction {
  name = 'meditate';
  duration = 120000; // 2 minutes

  preconditions(agent: Entity): boolean {
    const spiritual = agent.getComponent(SpiritualComponent);
    const prayer = agent.getComponent(PrayerComponent);
    const needs = agent.getComponent(NeedsComponent);

    // Must not be desperate
    if (needs.hunger < 0.3 || needs.energy < 0.3) return false;

    // Meditate if:
    // 1. Just prayed (waiting for response)
    // 2. High spiritual aptitude (regular practice)
    // 3. Seeking clarity on problem

    return (
      prayer?.isPraying ||
      (spiritual && spiritual.spiritualAptitude > 0.5) ||
      (prayer && world.time - prayer.lastPrayerTime < 120000)
    );
  }

  async execute(agent: Entity, world: World): Promise<void> {
    const agentComp = agent.getComponent(AgentComponent);
    const spiritual = agent.getComponent(SpiritualComponent);
    const prayer = agent.getComponent(PrayerComponent);

    // Visual: sitting cross-legged, eyes closed
    agentComp.currentBehavior = 'meditating';
    agentComp.currentAnimation = 'meditate_animation';

    spiritual.meditationDuration += this.duration;

    // Check for pending vision
    if (spiritual.pendingVision) {
      await this.deliverPendingVision(agent, spiritual, world);
      return;
    }

    // Calculate vision chance
    const justPrayed = prayer && world.time - prayer.lastPrayerTime < 120000;
    const sacredLocation = this.isAtSacredSite(agent, world);

    let visionChance = spiritual.spiritualAptitude * 0.3; // Base 30%
    if (justPrayed) visionChance *= 2; // Double if just prayed
    if (sacredLocation) visionChance *= sacredLocation.prayerPower;

    if (Math.random() < visionChance) {
      // RECEIVE VISION
      await world.getSystem(VisionSystem).triggerVision(
        agent,
        spiritual,
        world
      );

      // Mark prayer as answered if applicable
      if (justPrayed && prayer.currentPrayer) {
        prayer.currentPrayer.answered = true;
        prayer.currentPrayer.responseType = 'vision';
        prayer.currentPrayer.responseTime = world.time;
        prayer.answeredPrayers++;
        prayer.lastAnsweredPrayerTime = world.time;

        // Faith increases
        prayer.faith = Math.min(1.0, prayer.faith + 0.1);
      }

      agentComp.think('A vision came to me...');
    } else {
      // No vision
      const needs = agent.getComponent(NeedsComponent);
      needs.energy += 0.1; // Meditation is restorative

      if (justPrayed && prayer.currentPrayer) {
        prayer.unansweredPrayers++;
        prayer.faith = Math.max(0.0, prayer.faith - 0.02);
      }

      agentComp.think('I sit in quiet contemplation...');
    }

    prayer.isPraying = false;
  }
}
```

---

## 4. Vision System

### 4.1 Vision Structure

```typescript
interface Vision {
  id: string;
  agentId: string;
  timestamp: number;

  // How received
  trigger: 'dream' | 'prayer' | 'meditation' | 'trance' | 'sacred_moment' | 'player_initiated';

  // Content
  domain: VisionDomain;
  message: string; // Natural language
  urgency: 'guidance' | 'warning' | 'prophecy' | 'revelation';

  // Actionable insight
  insight: {
    problem?: string;
    recommendation?: string;
    target?: string; // Who/what this concerns
    timeframe?: string; // "3 days", "before winter"
  };

  // Properties
  clarity: number; // 0-1, how clear/symbolic
  symbolic: boolean; // Metaphorical vs. literal

  // Social dynamics
  sharedWith: string[]; // Who was told
  believers: string[]; // Who believes it
  skeptics: string[]; // Who doubts it

  // Outcome
  heeded: boolean; // Did people act on it?
  cameTrue: boolean; // Did prediction come true?

  // Source
  fromAngel?: string; // If from angel, not player
}
```

### 4.2 Vision Generation

```typescript
class VisionSystem extends System {
  /**
   * Generate vision using LLM + metrics
   */
  async triggerVision(
    agent: Entity,
    spiritual: SpiritualComponent,
    world: World
  ): Promise<Vision> {
    const agentComp = agent.getComponent(AgentComponent);

    // Gather relevant metrics
    const metrics = await this.gatherMetricsForDomain(
      spiritual.domains,
      world
    );

    // Generate vision content
    const prompt = this.buildVisionPrompt(
      agentComp,
      spiritual,
      metrics
    );

    const visionContent = await world.llmProvider.generate(prompt);
    const parsed = JSON.parse(visionContent);

    // Create vision
    const vision: Vision = {
      id: generateId(),
      agentId: agentComp.id,
      timestamp: world.time,
      trigger: this.determineTrigger(agent, world),
      domain: this.selectDomain(spiritual.domains, metrics),
      message: parsed.message,
      urgency: parsed.urgency,
      insight: parsed.insight,
      clarity: spiritual.visionClarity,
      symbolic: parsed.symbolic,
      sharedWith: [],
      believers: [],
      skeptics: [],
      heeded: false,
      cameTrue: false,
    };

    spiritual.visions.push(vision);
    spiritual.lastVisionTime = world.time;
    spiritual.isInVision = true;

    // Add to memory (very memorable!)
    const memory = agent.getComponent(MemoryComponent);
    memory.addMemory({
      type: 'vision',
      content: vision.message,
      importance: 0.9,
      timestamp: world.time,
    });

    // Emit event
    world.eventBus.emit('agent:vision', {
      agentId: agentComp.id,
      vision,
    });

    setTimeout(() => {
      spiritual.isInVision = false;
    }, 5000);

    return vision;
  }

  /**
   * Player sends direct vision to agent
   */
  async sendPlayerVision(
    agentId: string,
    playerMessage: string,
    domain: VisionDomain,
    urgency: string,
    world: World
  ): Promise<void> {
    const agent = world.getEntityById(agentId);
    const spiritual = agent.getComponent(SpiritualComponent);
    const prayer = agent.getComponent(PrayerComponent);

    // Translate player's modern language to prophetic language
    const translatedMessage = await this.translateToVision(
      agent,
      playerMessage,
      world
    );

    const vision: Vision = {
      id: generateId(),
      agentId,
      timestamp: world.time,
      trigger: 'player_initiated',
      domain,
      message: translatedMessage.message,
      urgency: urgency as any,
      insight: translatedMessage.insight,
      clarity: 1.0, // Player visions always clear
      symbolic: false,
      sharedWith: [],
      believers: [],
      skeptics: [],
      heeded: false,
      cameTrue: false,
    };

    spiritual.visions.push(vision);

    // If agent is praying/meditating, immediate delivery
    if (prayer.isPraying ||
        agent.getComponent(AgentComponent).currentBehavior === 'meditating') {

      agent.getComponent(AgentComponent).think(
        `The divine presence answers! ${vision.message}`
      );

      // Mark prayer as answered
      if (prayer.currentPrayer) {
        prayer.currentPrayer.answered = true;
        prayer.currentPrayer.responseType = 'vision';
        prayer.currentPrayer.responseTime = world.time;
        prayer.answeredPrayers++;
        prayer.lastAnsweredPrayerTime = world.time;
        prayer.faith = Math.min(1.0, prayer.faith + 0.15);
      }

      // Wake if sleeping
      const circadian = agent.getComponent(CircadianComponent);
      if (circadian?.isSleeping) {
        circadian.wake('divine_vision');
      }
    } else {
      // Queue for next meditation/dream
      spiritual.pendingVision = {
        message: vision.message,
        inResponseTo: prayer.currentPrayer?.id || '',
      };
    }

    world.eventBus.emit('player:sent_vision', { agentId, vision });
  }
}
```

---

## 5. Sacred Locations

### 5.1 Sacred Sites

```typescript
interface SacredSite {
  id: string;
  location: { x: number; y: number };
  type: 'natural' | 'built';

  // Natural features
  naturalFeature?: 'tree' | 'rock' | 'hilltop' | 'water' | 'cave';

  // Built structures
  buildingId?: string; // If this is a shrine/temple

  // Power
  prayerPower: number; // 1.0-2.0 multiplier
  visionCount: number; // Visions that occurred here
  prayerCount: number; // Total prayers here
  answerRate: number; // % of prayers answered

  // Community
  discoveredBy: string; // Agent who found it
  usedBy: string[]; // Regular visitors
  culturalSignificance: number; // 0-1

  // Naming
  name?: string; // "The Sacred Oak", "Vision Rock"
  namedBy?: string;

  // Rituals
  associatedRituals: string[]; // Ritual IDs
}
```

### 5.2 Sacred Site Discovery

```typescript
class SacredSiteSystem extends System {
  private sites: SacredSite[] = [];

  update(world: World): void {
    // Track where prayers happen
    const prayerEvents = world.eventBus.getEvents('agent:prayer');

    for (const event of prayerEvents) {
      const agent = world.getEntityById(event.agentId);
      const pos = agent.getComponent(PositionComponent);

      // Check if near existing site
      const nearestSite = this.findNearestSite(pos, 10);

      if (nearestSite) {
        nearestSite.prayerCount++;
        if (!nearestSite.usedBy.includes(event.agentId)) {
          nearestSite.usedBy.push(event.agentId);
        }
      } else if (event.prayer.answered) {
        // Maybe create new sacred site
        this.maybeCreateSacredSite(agent, pos, world);
      }
    }

    // Update power based on answer rate
    for (const site of this.sites) {
      this.updateSitePower(site, world);
    }
  }

  private maybeCreateSacredSite(
    agent: Entity,
    location: PositionComponent,
    world: World
  ): void {
    // Need multiple answered prayers at this location
    const recentPrayers = this.getPrayersNear(location, world, 300000);
    const answered = recentPrayers.filter(p => p.answered).length;

    if (answered >= 3) {
      const naturalFeature = this.detectNaturalFeature(location, world);

      const site: SacredSite = {
        id: generateId(),
        location: { x: location.x, y: location.y },
        type: naturalFeature ? 'natural' : 'built',
        naturalFeature,
        prayerPower: 1.5,
        visionCount: answered,
        prayerCount: recentPrayers.length,
        answerRate: answered / recentPrayers.length,
        discoveredBy: agent.id,
        usedBy: [agent.id],
        culturalSignificance: 0.5,
        associatedRituals: [],
      };

      this.sites.push(site);

      agent.getComponent(AgentComponent).think(
        'This place is blessed! My prayers are heard here!'
      );

      world.eventBus.emit('sacred_site:discovered', {
        site,
        discoverer: agent.id,
      });
    }
  }
}
```

---

## 6. Group Prayer & Rituals

### 6.1 Group Prayer

```typescript
class GroupPrayerAction extends AgentAction {
  name = 'group_prayer';
  duration = 180000; // 3 minutes
  minParticipants = 2;

  async execute(agent: Entity, world: World): Promise<void> {
    // Gather nearby agents
    const participants = this.gatherParticipants(agent, world);

    // Select leader (highest faith or spiritual aptitude)
    const leader = this.selectLeader(participants);

    // Generate group prayer
    const groupPrayer = await this.generateGroupPrayer(
      participants,
      world
    );

    // All pray together
    for (const participant of participants) {
      const p = participant.getComponent(AgentComponent);
      p.currentBehavior = 'group_praying';

      const prayerComp = participant.getComponent(PrayerComponent);
      prayerComp.prayers.push({
        ...groupPrayer,
        agentId: p.id,
      });
    }

    // Leader speaks
    leader.getComponent(AgentComponent).speak(
      `Let us pray: ${groupPrayer.content}`
    );

    // Amplified effect (more participants = more power)
    const amplification = 1.0 + (participants.length * 0.2);

    world.eventBus.emit('agent:group_prayer', {
      participants: participants.map(p => p.id),
      prayer: groupPrayer,
      power: amplification,
    });
  }
}
```

### 6.2 Ritual System

```typescript
interface Ritual {
  id: string;
  name: string;
  type: 'prayer' | 'meditation' | 'celebration' | 'mourning';

  // Triggers
  schedule: 'daily' | 'weekly' | 'seasonal' | 'event';
  triggerEvent?: string; // 'sunset', 'harvest', 'death'
  triggerTime?: number; // For scheduled rituals

  // Participants
  participants: string[];
  leader?: string;
  openToAll: boolean;

  // Actions
  sequence: RitualAction[];

  // Location
  location?: string; // Sacred site ID

  // Cultural data
  significance: number;
  timesPerformed: number;
  effectiveness: number; // Does it "work"?

  // Emergence
  emergedNaturally: boolean;
  createdBy?: string;
}

interface RitualAction {
  type: 'gather' | 'pray' | 'chant' | 'silence' | 'offer' | 'share';
  duration: number;
  whoPerforms: 'all' | 'leader' | 'specific';
  specificAgents?: string[];
}
```

---

## 7. Faith & Doubt Mechanics

### 7.1 Faith Dynamics

```typescript
class FaithSystem extends System {
  update(world: World): void {
    const faithful = world.getEntitiesWithComponent(PrayerComponent);

    for (const entity of faithful) {
      const prayer = entity.getComponent(PrayerComponent);

      // Update faith from prayer history
      const answerRate = prayer.answeredPrayers /
        Math.max(1, prayer.prayers.length);

      if (answerRate > 0.7) {
        prayer.faith = Math.min(1.0, prayer.faith + 0.01);
      } else if (answerRate < 0.3) {
        prayer.faith = Math.max(0.0, prayer.faith - 0.01);

        // Generate doubt
        if (Math.random() < 0.1) {
          prayer.doubts.push({
            reason: 'My prayers go unanswered...',
            severity: 0.5,
            timestamp: world.time,
            resolved: false,
          });
        }
      }

      // Time since last answer affects faith
      const timeSince = world.time - prayer.lastAnsweredPrayerTime;
      if (timeSince > 600000) { // 10 minutes
        prayer.faith = Math.max(0.0, prayer.faith - 0.005);
      }

      // Community influence
      this.updateFaithFromCommunity(entity, world);

      // Process doubts
      this.processDoubts(entity, prayer);
    }
  }

  private updateFaithFromCommunity(
    entity: Entity,
    world: World
  ): void {
    const nearby = this.getNearbyAgents(entity, world, 20);
    const avgFaith = nearby.reduce((sum, e) => {
      const p = e.getComponent(PrayerComponent);
      return sum + (p?.faith || 0.5);
    }, 0) / nearby.length;

    // Slowly converge to community average (faith is contagious)
    const prayer = entity.getComponent(PrayerComponent);
    prayer.faith = prayer.faith * 0.95 + avgFaith * 0.05;
  }
}
```

---

## 8. Player Interface

### 8.1 Prayer Notification Panel

```typescript
interface PrayerNotificationUI {
  // Active prayers awaiting response
  activePrayers: Prayer[];

  // Filters
  filterByDomain: VisionDomain | 'all';
  filterByUrgency: 'all' | 'desperate' | 'high+';

  // Actions
  onAnswerPrayer: (prayer: Prayer, message: string) => void;
  onSendSign: (prayer: Prayer, signType: SignType) => void;
  onIgnore: (prayer: Prayer) => void;
  onDelegateToAngel: (prayer: Prayer, angelId?: string) => void;
}
```

### 8.2 Send Vision Dialog

UI for player to respond to prayers directly.

### 8.3 Visual Effects

**Praying Agent**:
- Kneeling pose
- Hands together
- Golden beam of light upward
- 🙏 icon above head
- Pulsing aura for desperate prayers

**Meditating Agent**:
- Cross-legged sitting
- Eyes closed
- Ripple effect (receptive)
- 🧘 icon above head

**Receiving Vision**:
- Bright flash
- Golden glow surrounds agent
- ✨ sparkles
- Agent gasps, opens eyes

---

## 9. Integration Points

### 9.1 With Circadian/Dreams System

```typescript
// Dreams can be visions
interface DreamContent {
  type: 'normal' | 'vision' | 'nightmare' | 'memory';
  vision?: Vision; // If prophetic dream
  quality: number;
}

class CircadianSystem {
  processDream(agent: Entity): void {
    if (circadian.sleepStage === 'REM') {
      const spiritual = agent.getComponent(SpiritualComponent);

      // Check for prophetic dream
      if (spiritual && Math.random() < spiritual.spiritualAptitude * 0.2) {
        const vision = await visionSystem.triggerVision(agent, spiritual, world);

        circadian.lastDream = {
          type: 'vision',
          content: vision.message,
          vision,
          quality: spiritual.visionClarity,
        };
      }
    }
  }
}
```

### 9.2 With Metrics System

Visions use metrics to provide accurate guidance:
- NetworkAnalyzer for social visions
- InequalityAnalyzer for resource visions
- SpatialAnalyzer for building visions
- Environmental metrics for farming/weather visions

### 9.3 With Communication System

Agents share visions through conversation:
```typescript
class ShareVisionAction extends AgentAction {
  execute(agent: Entity, world: World): void {
    const spiritual = agent.getComponent(SpiritualComponent);
    const unsharedVision = spiritual.visions.find(v => v.sharedWith.length === 0);

    if (unsharedVision) {
      const nearby = this.getNearbyAgents(agent, world, 15);

      for (const listener of nearby) {
        this.shareVisionWith(agent, listener, unsharedVision);
      }
    }
  }
}
```

### 9.4 With Relationship System

Trust affects belief in visions:
```typescript
// High trust = more likely to believe vision
const relationship = listener.getRelationshipWith(prophet.id);
const believesProphet = Math.random() < relationship.trust * 0.8;

if (believesProphet) {
  vision.believers.push(listener.id);
} else {
  vision.skeptics.push(listener.id);
}
```

### 9.5 With Building System

Sacred buildings boost prayer effectiveness:
```typescript
const shrine: BuildingArchetype = {
  id: 'shrine',
  name: 'Shrine',
  properties: {
    prayerPowerBonus: 1.5,
    meditationBonus: 0.3,
    provides: 'spiritual_comfort',
  }
};
```

---

## 10. Implementation Plan

### Phase 27.1: Core Prayer System (Week 1)
- [ ] PrayerComponent
- [ ] PrayAction behavior
- [ ] Prayer triggers and preconditions
- [ ] Prayer generation using LLM
- [ ] Player prayer notification UI

### Phase 27.2: Meditation & Visions (Week 2)
- [ ] SpiritualComponent
- [ ] MeditateAction behavior
- [ ] Vision generation using LLM + metrics
- [ ] Vision sharing through conversation
- [ ] Player vision sending UI

### Phase 27.3: Sacred Locations (Week 3)
- [ ] Sacred site detection
- [ ] Prayer power modifiers
- [ ] Site discovery events
- [ ] Visual markers for sacred sites

### Phase 27.4: Faith System (Week 4)
- [ ] Faith tracking
- [ ] Answer rate calculations
- [ ] Doubt generation
- [ ] Community faith influence
- [ ] Faith effects on behavior

### Phase 27.5: Group Prayer & Rituals (Week 5)
- [ ] Group prayer behavior
- [ ] Ritual definition system
- [ ] Ritual emergence detection
- [ ] Scheduled ritual execution

---

## Performance Considerations

**Prayer Generation**:
- Cache LLM responses for similar situations
- Use simpler prompts for low-urgency prayers
- Batch process multiple prayers
- Target: <2s for prayer generation

**Vision Delivery**:
- Queue visions for delivery during meditation/sleep
- Don't interrupt critical actions
- Prioritize by urgency

**Faith Calculations**:
- Update faith every 10 seconds, not every frame
- Cache community faith averages
- Only recalculate answer rates when prayers answered

---

## Metrics & Analytics

Track for balancing:
- Average prayers per agent per day
- Prayer answer rate (by domain, urgency)
- Faith distribution across population
- Time from prayer to answer
- Vision accuracy rate (predictions that came true)
- Sacred site effectiveness

---

## Future Enhancements

- **Ancestor Spirits**: Dead agents appear in visions
- **False Prophets**: Low-aptitude agents claiming visions
- **Vision Quests**: Intentional journeys seeking guidance
- **Prophetic Lineages**: Inherited spiritual aptitude
- **Prayer Chains**: Agents pray for each other in sequence
- **Divine Tests**: Player withholds answers to test faith
- **Collective Visions**: Multiple agents same vision (apocalypse)
