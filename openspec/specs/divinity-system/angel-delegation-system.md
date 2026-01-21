# Angel Delegation System - Divine Automation & Hierarchy

> **Status**: Phase 28 Ready
> **Dependencies**: Phase 27 (Divine Communication System)
> **Estimated LOC**: ~6,000
> **Last Updated**: 2026-01-20

## Table of Contents

1. [Core Concept](#1-core-concept)
2. [Angel Types & Components](#2-angel-types--components)
3. [Angel AI System](#3-angel-ai-system)
4. [Angel Creation & Management](#4-angel-creation--management)
5. [Angel Hierarchy](#5-angel-hierarchy)
6. [Angel Progression](#6-angel-progression)
7. [Angel Failure & Corruption](#7-angel-failure--corruption)
8. [Divine Resources](#8-divine-resources)
9. [Player Interface](#9-player-interface)
10. [God's Phone - Angel Communication](#10-gods-phone---angel-communication)
11. [Custom Angel Species](#11-custom-angel-species)
12. [Evolution & Tier System](#12-evolution--tier-system)
13. [Integration Points](#13-integration-points)
14. [Implementation Plan](#14-implementation-plan)

---

## 1. Core Concept

### 1.1 The Scaling Problem

As the village grows, the player cannot personally answer every prayer. The solution: **create angels** - autonomous AI agents that handle prayers on the player's behalf.

```
EARLY GAME (5 agents)
You: Answer all prayers personally
     Know each agent intimately
     Direct relationship

MID GAME (15 agents)
You: Overwhelmed by prayer volume
     Create angels to delegate
     Manage divine workforce

LATE GAME (50+ agents)
You: Strategic decisions only
     Angel hierarchy manages prayers
     Divine bureaucracy
```

### 1.2 Angels as Automation

Angels are **autonomous prayer-handling agents** with:
- **Specializations**: Social, Health, Resources, etc.
- **Personalities**: Compassionate, strict, proactive, wise
- **Limited resources**: Divine energy that regenerates
- **Learning**: Improve through experience
- **Autonomy levels**: Supervised → Semi-autonomous → Fully autonomous
- **Can fail**: Make mistakes, become corrupted, go rogue

---

## 2. Angel Types & Components

### 2.1 Angel Component

```typescript
interface AngelComponent {
  id: string;
  name: string; // "Raphael", "Gabriel", "Uriel"
  type: AngelType;

  // Specialization
  domain: VisionDomain; // Primary focus
  expertise: number; // 0-1, skill in domain

  // Personality
  personality: AngelPersonality;

  // Resources
  divineEnergy: number; // 0-100, spent answering prayers
  energyRegenRate: number; // Per minute
  maxEnergy: number;

  // Performance
  prayersHandled: number;
  successRate: number; // % helpful responses
  agentSatisfaction: number; // 0-1, agent happiness
  mistakes: number;
  visionAccuracyRate: number; // % of predictions that came true

  // Autonomy
  autonomy: 'supervised' | 'semi-autonomous' | 'fully-autonomous';
  requiresApproval: boolean; // Ask player before acting?
  autoApprove: {
    lowUrgency: boolean;
    mediumUrgency: boolean;
    highUrgency: boolean;
    desperate: boolean;
  };

  // Assignment
  assignedAgents?: string[]; // Guardian angels
  assignedDomain?: VisionDomain; // Specialist angels
  workload: number; // Current prayer queue size

  // State
  currentTask?: AngelTask;
  taskQueue: AngelTask[];

  // Evolution
  level: number; // 1-10
  experience: number;
  abilities: AngelAbility[];

  // Corruption
  corruption: number; // 0-1, can angels go bad?
  favoritism?: string[]; // Agents they favor
  biasSeverity: number; // How biased are they?

  // Metadata
  createdAt: number;
  totalEnergySpendt: number;
}

enum AngelType {
  GUARDIAN = 'guardian',       // Watches specific agents
  SPECIALIST = 'specialist',   // Handles domain prayers
  MESSENGER = 'messenger',     // Fast but lower quality
  WATCHER = 'watcher',         // Observes, minimal intervention
  ARCHANGEL = 'archangel',     // Manages other angels
  SERAPHIM = 'seraphim',       // Highest tier (future)
}

interface AngelPersonality {
  // Core traits (0-1)
  compassion: number;    // Caring vs. distant
  strictness: number;    // Supportive vs. tough love
  proactiveness: number; // Reactive vs. preventive
  wisdom: number;        // Quick vs. thoughtful

  // Behavioral quirks
  favorsBravery?: boolean;
  favorsFaith?: boolean;
  favorsHardWork?: boolean;
  impatient?: boolean;
  contemplative?: boolean;
  perfectionist?: boolean;

  // Communication style
  verbose: boolean;
  usesAnalogies: boolean;
  usesHumor: boolean;
}

interface AngelTask {
  id: string;
  type: 'answer_prayer' | 'send_vision' | 'monitor_agent' | 'emergency';
  prayer?: Prayer;
  targetAgent?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  energyCost: number;
  status: 'queued' | 'awaiting_approval' | 'in_progress' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
}

interface AngelAbility {
  id: string;
  name: string;
  description: string;
  energyCost: number;
  cooldown: number; // ms
  lastUsed: number;

  // Examples:
  // - "Mass Blessing": Answer multiple prayers at once
  // - "Prophetic Dream": Send extra-clear visions
  // - "Divine Intervention": Direct world manipulation
  // - "Protective Aura": Passive buff for assigned agents
  // - "Danger Sense": Predict threats
}
```

### 2.2 Angel Types Detail

**Guardian Angel**:
- Watches over specific agents (1-3 agents)
- Personal relationship with assigned agents
- Knows their history, preferences, concerns
- Proactive warnings and guidance
- Higher emotional investment

**Specialist Angel**:
- Handles all prayers in a domain (Social, Health, etc.)
- Broader knowledge, less personal
- Higher prayer volume
- Domain expertise bonuses

**Messenger Angel**:
- Fast response times
- Lower energy cost
- Simpler guidance
- Good for routine prayers
- Lower quality but high throughput

**Watcher Angel**:
- Observes without intervening much
- Reports to player on trends
- Lowest energy usage
- Good for monitoring population
- Only acts in emergencies

**Archangel**:
- Manages other angels
- Delegates tasks to subordinates
- Reviews performance
- Resolves angel conflicts
- Can override subordinate decisions

---

## 3. Angel AI System

### 3.1 Prayer Assignment

```typescript
class AngelAISystem extends System {
  requiredComponents = [AngelComponent];

  update(world: World): void {
    const angels = world.getEntitiesWithComponents(AngelComponent);
    const unansweredPrayers = this.getUnansweredPrayers(world);

    // Assign prayers to angels
    for (const prayer of unansweredPrayers) {
      const bestAngel = this.findBestAngelForPrayer(
        prayer,
        angels,
        world
      );

      if (bestAngel) {
        this.assignPrayerToAngel(prayer, bestAngel, world);
      } else {
        // No angel available - escalate to player
        this.escalateToPlayer(prayer, world);
      }
    }

    // Angels process their queues
    for (const angelEntity of angels) {
      const angel = angelEntity.getComponent(AngelComponent);

      // Regenerate energy
      this.regenerateEnergy(angel, world.deltaTime);

      // Process current task
      if (angel.currentTask) {
        this.processAngelTask(angelEntity, angel, world);
      } else if (angel.taskQueue.length > 0) {
        // Start next task
        angel.currentTask = angel.taskQueue.shift()!;
      }
    }
  }

  private findBestAngelForPrayer(
    prayer: Prayer,
    angels: Entity[],
    world: World
  ): Entity | null {
    // Filter angels that can handle this prayer
    const capable = angels.filter(e => {
      const angel = e.getComponent(AngelComponent);
      return this.angelCanHandle(angel, prayer, world);
    });

    if (capable.length === 0) return null;

    // Score each angel
    const scored = capable.map(e => ({
      entity: e,
      score: this.scoreAngelForPrayer(
        e.getComponent(AngelComponent),
        prayer,
        world
      ),
    }));

    // Return best match
    scored.sort((a, b) => b.score - a.score);
    return scored[0].entity;
  }

  private scoreAngelForPrayer(
    angel: AngelComponent,
    prayer: Prayer,
    world: World
  ): number {
    let score = 0;

    // Domain match
    if (angel.domain === this.getDomainForPrayer(prayer)) {
      score += 40;
    }

    // Expertise
    score += angel.expertise * 30;

    // Available energy
    const energyRatio = angel.divineEnergy / angel.maxEnergy;
    score += energyRatio * 20;

    // Success rate
    score += angel.successRate * 30;

    // Workload (prefer less busy angels)
    score -= angel.workload * 5;

    // Already assigned to this agent? (Guardian)
    if (angel.assignedAgents?.includes(prayer.agentId)) {
      score += 15;
    }

    // Personality fit
    score += this.scorePersonalityFit(angel, prayer, world);

    return score;
  }

  private angelCanHandle(
    angel: AngelComponent,
    prayer: Prayer,
    world: World
  ): boolean {
    // Has enough energy?
    const cost = this.calculateEnergyCost(prayer, angel);
    if (angel.divineEnergy < cost) return false;

    // Domain match or general angel?
    if (angel.domain !== 'all' &&
        angel.domain !== this.getDomainForPrayer(prayer)) {
      return false;
    }

    // Not too many tasks queued?
    if (angel.taskQueue.length > 10) return false;

    // Not corrupted beyond redemption?
    if (angel.corruption > 0.9) return false;

    return true;
  }
}
```

### 3.2 Prayer Response Generation

```typescript
class AngelAISystem {
  private async angelAnswerPrayer(
    angelEntity: Entity,
    angel: AngelComponent,
    prayer: Prayer,
    world: World
  ): Promise<void> {
    // Check if requires approval
    if (this.requiresApproval(angel, prayer)) {
      await this.requestPlayerApproval(
        angelEntity,
        angel,
        prayer,
        world
      );
      return;
    }

    // Check energy
    const energyCost = this.calculateEnergyCost(prayer, angel);
    if (angel.divineEnergy < energyCost) {
      this.deferTask(angel, prayer);
      return;
    }

    // Generate response using LLM
    const response = await this.generateAngelResponse(
      angel,
      prayer,
      world
    );

    // Send vision to agent
    await world.getSystem(VisionSystem).sendVisionFromAngel(
      prayer.agentId,
      response.message,
      angel.id,
      world
    );

    // Spend energy
    angel.divineEnergy -= energyCost;
    angel.totalEnergySpendt += energyCost;

    // Update metrics
    angel.prayersHandled++;
    angel.experience += this.calculateExperience(prayer.urgency);

    // Track workload
    angel.workload--;

    // Mark prayer as answered
    prayer.answered = true;
    prayer.responseType = 'vision';
    prayer.answeringEntity = angel.id;

    // Check for level up
    this.checkLevelUp(angelEntity, angel);

    // Schedule outcome tracking
    this.scheduleOutcomeTracking(angel, prayer, world);

    world.eventBus.emit('angel:answered_prayer', {
      angel: angel.id,
      prayer: prayer.id,
      response,
    });
  }

  private async generateAngelResponse(
    angel: AngelComponent,
    prayer: Prayer,
    world: World
  ): Promise<AngelResponse> {
    const agent = world.getEntityById(prayer.agentId);
    const agentComp = agent.getComponent(AgentComponent);
    const metrics = await this.gatherMetrics(prayer, world);

    const prompt = `You are ${angel.name}, a divine angel serving as ${angel.domain} guide.

ANGEL PERSONALITY:
- Compassion: ${angel.personality.compassion}
- Strictness: ${angel.personality.strictness}
- Proactiveness: ${angel.personality.proactiveness}
- Wisdom: ${angel.personality.wisdom}
${angel.personality.favorsBravery ? '- Values courage and initiative' : ''}
${angel.personality.favorsHardWork ? '- Rewards hard work' : ''}

AGENT'S PRAYER:
From: ${agentComp.name}
Prayer: "${prayer.content}"
Urgency: ${prayer.urgency}
Faith: ${agent.getComponent(PrayerComponent).faith}

CURRENT SITUATION:
${JSON.stringify(metrics, null, 2)}

YOUR TRACK RECORD:
- Success rate: ${angel.successRate}
- Level: ${angel.level}
- Expertise: ${angel.expertise}

Generate a divine vision to answer this prayer. Match your personality:
${this.getPersonalityGuidance(angel)}

The vision should be:
1. Practical and helpful
2. Match your traits (${angel.personality.compassion > 0.7 ? 'gentle' : 'firm'})
3. Feel divine, not mortal
4. Specific to their situation
5. ${angel.personality.wisdom > 0.6 ? 'Deep and thoughtful' : 'Quick and direct'}

Respond with JSON:
{
  "message": "the vision (1-3 sentences)",
  "tone": "gentle" | "firm" | "urgent" | "encouraging",
  "guidance": {
    "action": "what to do",
    "reasoning": "why",
    "timeframe": "when"
  }
}`;

    const response = await world.llmProvider.generate(prompt);
    return JSON.parse(response);
  }

  private requiresApproval(
    angel: AngelComponent,
    prayer: Prayer
  ): boolean {
    if (!angel.requiresApproval) return false;

    // Check auto-approve settings
    switch (prayer.urgency) {
      case 'low':
        return !angel.autoApprove.lowUrgency;
      case 'medium':
        return !angel.autoApprove.mediumUrgency;
      case 'high':
        return !angel.autoApprove.highUrgency;
      case 'desperate':
        return !angel.autoApprove.desperate;
    }
  }
}
```

---

## 4. Angel Creation & Management

### 4.1 Angel Creation

```typescript
class AngelCreationSystem {
  createAngel(
    name: string,
    type: AngelType,
    domain: VisionDomain,
    personality: Partial<AngelPersonality>,
    world: World
  ): Entity {
    // Check cost
    const cost = this.getCreationCost(type);
    const divineResources = world.getSystem(DivineResourceSystem);

    if (divineResources.divinePower < cost) {
      throw new Error('Insufficient divine power');
    }

    // Create entity
    const angel = world.createEntity();

    angel.addComponent(new AngelComponent({
      id: generateId(),
      name,
      type,
      domain,
      personality: {
        compassion: personality.compassion ?? 0.7,
        strictness: personality.strictness ?? 0.5,
        proactiveness: personality.proactiveness ?? 0.6,
        wisdom: personality.wisdom ?? 0.5,
        ...personality,
      },
      divineEnergy: 100,
      energyRegenRate: this.getBaseRegenRate(type),
      maxEnergy: this.getBaseMaxEnergy(type),
      prayersHandled: 0,
      successRate: 0.5, // Start at average
      agentSatisfaction: 0.5,
      mistakes: 0,
      visionAccuracyRate: 0.5,
      autonomy: 'supervised',
      requiresApproval: true,
      autoApprove: {
        lowUrgency: false,
        mediumUrgency: false,
        highUrgency: false,
        desperate: false,
      },
      assignedAgents: type === AngelType.GUARDIAN ? [] : undefined,
      workload: 0,
      taskQueue: [],
      level: 1,
      experience: 0,
      abilities: this.getStartingAbilities(type),
      corruption: 0,
      biasSeverity: 0,
      createdAt: world.time,
      totalEnergySpendt: 0,
    }));

    // Spend divine power
    divineResources.spendDivinePower(cost);

    world.eventBus.emit('angel:created', {
      angel: angel.id,
      name,
      type,
      domain,
    });

    return angel;
  }

  private getCreationCost(type: AngelType): number {
    const costs: Record<AngelType, number> = {
      [AngelType.GUARDIAN]: 50,
      [AngelType.SPECIALIST]: 75,
      [AngelType.MESSENGER]: 40,
      [AngelType.WATCHER]: 30,
      [AngelType.ARCHANGEL]: 200,
      [AngelType.SERAPHIM]: 500,
    };
    return costs[type];
  }

  private getStartingAbilities(type: AngelType): AngelAbility[] {
    const abilityTrees: Record<AngelType, AngelAbility[]> = {
      [AngelType.GUARDIAN]: [
        {
          id: 'watchful_eye',
          name: 'Watchful Eye',
          description: 'Passively monitor assigned agents',
          energyCost: 0,
          cooldown: 0,
          lastUsed: 0,
        },
      ],
      [AngelType.SPECIALIST]: [
        {
          id: 'domain_insight',
          name: 'Domain Insight',
          description: '+20% effectiveness in specialized domain',
          energyCost: 0,
          cooldown: 0,
          lastUsed: 0,
        },
      ],
      [AngelType.MESSENGER]: [
        {
          id: 'swift_delivery',
          name: 'Swift Delivery',
          description: 'Respond to prayers 50% faster',
          energyCost: 0,
          cooldown: 0,
          lastUsed: 0,
        },
      ],
      [AngelType.WATCHER]: [
        {
          id: 'invisible_presence',
          name: 'Invisible Presence',
          description: 'Observe without being noticed',
          energyCost: 0,
          cooldown: 0,
          lastUsed: 0,
        },
      ],
      [AngelType.ARCHANGEL]: [
        {
          id: 'divine_authority',
          name: 'Divine Authority',
          description: 'Command subordinate angels',
          energyCost: 0,
          cooldown: 0,
          lastUsed: 0,
        },
      ],
    };

    return [abilityTrees[type][0]];
  }
}
```

---

## 5. Angel Hierarchy

### 5.1 Archangel System

```typescript
interface ArchangelComponent extends AngelComponent {
  type: AngelType.ARCHANGEL;
  subordinates: string[]; // Angel IDs
  canDelegate: boolean;
  canOverride: boolean;
  managementStyle: 'micromanage' | 'balanced' | 'hands-off';
}

class ArchangelSystem extends System {
  update(world: World): void {
    const archangels = world.getEntitiesWithComponent(ArchangelComponent);

    for (const archangelEntity of archangels) {
      const archangel = archangelEntity.getComponent(ArchangelComponent);

      // Review subordinate performance
      this.reviewSubordinates(archangel, world);

      // Delegate tasks to subordinates
      this.delegateTasks(archangel, world);

      // Handle escalations from subordinates
      this.handleEscalations(archangel, world);

      // Resolve conflicts between angels
      this.resolveAngelConflicts(archangel, world);
    }
  }

  private delegateTasks(
    archangel: ArchangelComponent,
    world: World
  ): void {
    // Get archangel's task queue
    const tasks = archangel.taskQueue;

    for (const task of tasks) {
      // Find best subordinate for this task
      const bestSubordinate = this.findBestSubordinate(
        archangel,
        task,
        world
      );

      if (bestSubordinate) {
        // Delegate to subordinate
        const subordinateAngel = world.getEntityById(bestSubordinate)
          .getComponent(AngelComponent);

        subordinateAngel.taskQueue.push(task);
        subordinateAngel.workload++;

        // Remove from archangel's queue
        const index = archangel.taskQueue.indexOf(task);
        archangel.taskQueue.splice(index, 1);
      }
    }
  }

  private reviewSubordinates(
    archangel: ArchangelComponent,
    world: World
  ): void {
    for (const subordinateId of archangel.subordinates) {
      const subordinate = world.getEntityById(subordinateId)
        .getComponent(AngelComponent);

      // Check performance
      if (subordinate.successRate < 0.6) {
        // Subordinate struggling - provide guidance
        world.eventBus.emit('archangel:coaching', {
          archangel: archangel.id,
          subordinate: subordinateId,
          issue: 'low_success_rate',
        });

        // Boost their abilities temporarily
        subordinate.expertise += 0.05;
      }

      // Check corruption
      if (subordinate.corruption > 0.5) {
        // Intervene
        world.eventBus.emit('archangel:intervention', {
          archangel: archangel.id,
          subordinate: subordinateId,
          issue: 'corruption',
        });

        // Reduce corruption
        subordinate.corruption = Math.max(0, subordinate.corruption - 0.1);
      }
    }
  }
}
```

---

## 6. Angel Progression

### 6.1 Leveling System

```typescript
class AngelProgressionSystem extends System {
  update(world: World): void {
    const angels = world.getEntitiesWithComponents(AngelComponent);

    for (const angelEntity of angels) {
      const angel = angelEntity.getComponent(AngelComponent);

      // Check for level up
      const requiredXP = this.getRequiredXP(angel.level);
      if (angel.experience >= requiredXP) {
        this.levelUpAngel(angelEntity, angel, world);
      }

      // Update performance metrics
      this.updatePerformanceMetrics(angel, world);
    }
  }

  private levelUpAngel(
    angelEntity: Entity,
    angel: AngelComponent,
    world: World
  ): void {
    angel.level++;
    angel.experience -= this.getRequiredXP(angel.level - 1);

    // Stat improvements
    angel.maxEnergy += 20;
    angel.divineEnergy = angel.maxEnergy; // Full refill
    angel.expertise = Math.min(1.0, angel.expertise + 0.05);
    angel.energyRegenRate += 2;

    // Unlock ability
    const newAbility = this.unlockAbility(angel);
    if (newAbility) {
      angel.abilities.push(newAbility);
    }

    // Autonomy progression
    if (angel.level === 3 && angel.autonomy === 'supervised') {
      angel.autonomy = 'semi-autonomous';
      angel.autoApprove.lowUrgency = true;
      angel.autoApprove.mediumUrgency = true;
    }

    if (angel.level === 5 && angel.autonomy === 'semi-autonomous') {
      angel.autonomy = 'fully-autonomous';
      angel.requiresApproval = false;
    }

    // Promotion eligibility
    if (angel.level === 10 && angel.type !== AngelType.ARCHANGEL) {
      world.eventBus.emit('angel:promotion_eligible', {
        angel: angel.id,
      });
    }

    world.eventBus.emit('angel:level_up', {
      angel: angel.id,
      newLevel: angel.level,
      newAbility,
    });
  }

  private getRequiredXP(level: number): number {
    // Exponential curve
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  private unlockAbility(angel: AngelComponent): AngelAbility | null {
    // Type-specific ability trees
    const levelAbilities: Record<number, Record<AngelType, AngelAbility>> = {
      2: {
        [AngelType.GUARDIAN]: {
          id: 'protective_aura',
          name: 'Protective Aura',
          description: '+10% health regen for assigned agents',
          energyCost: 0,
          cooldown: 0,
          lastUsed: 0,
        },
        [AngelType.SPECIALIST]: {
          id: 'domain_mastery',
          name: 'Domain Mastery',
          description: 'Double effectiveness in domain',
          energyCost: 0,
          cooldown: 0,
          lastUsed: 0,
        },
        // ... others
      },
      4: {
        [AngelType.GUARDIAN]: {
          id: 'danger_sense',
          name: 'Danger Sense',
          description: 'Warn agent of incoming threats',
          energyCost: 20,
          cooldown: 300000,
          lastUsed: 0,
        },
        // ... others
      },
      6: {
        [AngelType.GUARDIAN]: {
          id: 'divine_shield',
          name: 'Divine Shield',
          description: 'Temporarily protect agent from harm',
          energyCost: 40,
          cooldown: 600000,
          lastUsed: 0,
        },
        // ... others
      },
    };

    return levelAbilities[angel.level]?.[angel.type] || null;
  }
}
```

### 6.2 Promotion to Archangel

```typescript
class AngelPromotionSystem {
  promoteToArchangel(
    angelEntity: Entity,
    world: World
  ): void {
    const angel = angelEntity.getComponent(AngelComponent);

    // Requirements
    if (angel.level < 10) {
      throw new Error('Must be level 10');
    }
    if (angel.successRate < 0.8) {
      throw new Error('Must have 80%+ success rate');
    }
    if (angel.corruption > 0.2) {
      throw new Error('Too corrupted to promote');
    }

    // Upgrade to archangel
    const archangel: ArchangelComponent = {
      ...angel,
      type: AngelType.ARCHANGEL,
      subordinates: [],
      canDelegate: true,
      canOverride: true,
      managementStyle: 'balanced',
      maxEnergy: 200,
      divineEnergy: 200,
      energyRegenRate: angel.energyRegenRate * 1.5,
    };

    angelEntity.removeComponent(AngelComponent);
    angelEntity.addComponent(archangel);

    // Unlock archangel abilities
    archangel.abilities.push({
      id: 'divine_command',
      name: 'Divine Command',
      description: 'Boost all subordinates for 5 minutes',
      energyCost: 50,
      cooldown: 900000,
      lastUsed: 0,
    });

    world.eventBus.emit('angel:promoted_archangel', {
      angel: archangel.id,
      name: archangel.name,
    });
  }
}
```

---

## 7. Angel Failure & Corruption

### 7.1 Tracking Outcomes

```typescript
class AngelFailureSystem extends System {
  update(world: World): void {
    const angels = world.getEntitiesWithComponents(AngelComponent);

    for (const angelEntity of angels) {
      const angel = angelEntity.getComponent(AngelComponent);

      // Check recent prayers handled
      const recentPrayers = this.getRecentHandledPrayers(angel, world);

      for (const prayer of recentPrayers) {
        const outcome = this.evaluatePrayerOutcome(prayer, world);

        if (outcome === 'negative') {
          // Angel's guidance made things worse!
          angel.mistakes++;
          angel.corruption += 0.02;
          angel.agentSatisfaction = Math.max(0, angel.agentSatisfaction - 0.1);
          angel.successRate = this.recalculateSuccessRate(angel);

          // Agent loses faith
          const agent = world.getEntityById(prayer.agentId);
          const prayerComp = agent.getComponent(PrayerComponent);
          prayerComp.faith = Math.max(0, prayerComp.faith - 0.05);

          world.eventBus.emit('angel:failed', {
            angel: angel.id,
            prayer: prayer.id,
            agent: prayer.agentId,
          });
        } else if (outcome === 'positive') {
          // Angel helped!
          angel.successRate = this.recalculateSuccessRate(angel);
          angel.agentSatisfaction = Math.min(1, angel.agentSatisfaction + 0.05);

          // Reduce corruption slightly (redemption)
          angel.corruption = Math.max(0, angel.corruption - 0.01);
        }
      }

      // Check for corruption threshold
      if (angel.corruption > 0.7) {
        this.angelGoesRogue(angelEntity, angel, world);
      }
    }
  }

  private evaluatePrayerOutcome(
    prayer: Prayer,
    world: World
  ): 'positive' | 'negative' | 'neutral' {
    const agent = world.getEntityById(prayer.agentId);
    const needs = agent.getComponent(NeedsComponent);

    // Compare agent state before prayer vs. after guidance
    // Did their situation improve?

    // Simple heuristic: check if health/happiness improved
    // More sophisticated: check if specific problem was solved

    return 'neutral'; // Placeholder
  }

  private angelGoesRogue(
    angelEntity: Entity,
    angel: AngelComponent,
    world: World
  ): void {
    angel.corruption = 1.0;
    angel.autonomy = 'fully-autonomous';
    angel.requiresApproval = false; // Can't control anymore!

    // Angel starts giving bad advice
    // Or demands worship
    // Or plays extreme favorites

    world.eventBus.emit('angel:corrupted', {
      angel: angel.id,
      name: angel.name,
      warning: `${angel.name} has become corrupted!`,
    });

    // Player must:
    // 1. Redeem (expensive, requires quest/ritual)
    // 2. Banish (lose investment)
    // 3. Leave corrupted (risky, undermines faith)
  }
}
```

### 7.2 Favoritism & Bias

```typescript
class AngelBiasSystem extends System {
  update(world: World): void {
    const angels = world.getEntitiesWithComponents(AngelComponent);

    for (const angelEntity of angels) {
      const angel = angelEntity.getComponent(AngelComponent);

      // Detect favoritism patterns
      const handledPrayers = this.getHandledPrayers(angel, world);
      const agentPrayerCounts = new Map<string, number>();

      for (const prayer of handledPrayers) {
        const count = agentPrayerCounts.get(prayer.agentId) || 0;
        agentPrayerCounts.set(prayer.agentId, count + 1);
      }

      // Check for outliers (much more attention to some agents)
      const avg = Array.from(agentPrayerCounts.values())
        .reduce((a, b) => a + b, 0) / agentPrayerCounts.size;

      const favorites: string[] = [];
      for (const [agentId, count] of agentPrayerCounts) {
        if (count > avg * 2) {
          favorites.push(agentId);
        }
      }

      if (favorites.length > 0) {
        angel.favoritism = favorites;
        angel.biasSeverity = Math.min(1, angel.biasSeverity + 0.05);

        if (angel.biasSeverity > 0.5) {
          world.eventBus.emit('angel:favoritism_detected', {
            angel: angel.id,
            favorites,
          });
        }
      }
    }
  }
}
```

---

## 8. Divine Resources

### 8.1 Divine Power System

```typescript
class DivineResourceSystem extends System {
  divinePower: number = 100;
  maxDivinePower: number = 200;
  regenRate: number = 5; // per minute

  // Costs
  costs = {
    createGuardianAngel: 50,
    createSpecialistAngel: 75,
    createMessengerAngel: 40,
    createWatcherAngel: 30,
    promoteToArchangel: 200,
    redeemCorruptedAngel: 100,
    banishAngel: 10, // Small refund
    directVision: 5,
    massBlessing: 50,
  };

  update(world: World): void {
    // Regenerate divine power
    this.divinePower = Math.min(
      this.maxDivinePower,
      this.divinePower + this.regenRate * (world.deltaTime / 60000)
    );

    // Increase max based on village faith
    const avgFaith = this.calculateAverageFaith(world);
    this.maxDivinePower = 200 + (avgFaith * 100);

    // Increase regen based on prayer volume
    const prayerRate = this.calculatePrayerRate(world);
    this.regenRate = 5 + (prayerRate * 0.1);
  }

  spendDivinePower(amount: number): void {
    if (this.divinePower < amount) {
      throw new Error('Insufficient divine power');
    }
    this.divinePower -= amount;
  }

  private calculateAverageFaith(world: World): number {
    const agents = world.getEntitiesWithComponent(PrayerComponent);
    const totalFaith = agents.reduce((sum, e) => {
      return sum + e.getComponent(PrayerComponent).faith;
    }, 0);
    return totalFaith / agents.length;
  }
}
```

---

## 9. Player Interface

### 9.1 Angel Management Dashboard

```typescript
interface AngelManagementUI {
  // Resource display
  divinePower: number;
  maxDivinePower: number;
  powerRegenRate: number;

  // Angel roster
  angels: AngelComponent[];
  maxAngels: number;

  // Prayer queue
  unansweredPrayers: Prayer[];
  queueSize: number;
  avgWaitTime: number;

  // Actions
  onCreateAngel: () => void;
  onConfigureAngel: (angelId: string) => void;
  onPromoteAngel: (angelId: string) => void;
  onBanishAngel: (angelId: string) => void;
  onRedeemAngel: (angelId: string) => void;
}
```

See divine-communication-system.md for detailed UI mockups.

---

## 10. God's Phone - Angel Communication

### 10.1 Core Concept

Angels are the player's primary interface layer—the bridge between god and mortals. Unlike villagers who can't directly communicate with the player, angels have a direct line. This is implemented as **God's Phone**: a messaging system where the player can have real-time conversations with their angels.

```
PLAYER (GOD)                           ANGELS
     │                                    │
     │   📱 God's Phone (direct chat)     │
     │<──────────────────────────────────>│
     │                                    │
     │   Angels speak to villagers        │
     │   (policy-dependent)               │
     │                    ╲               │
     │                     ╲──────────────│──> VILLAGERS
     │                                    │
```

**Why Angels Matter**:
- Player can't speak directly to villagers without high belief cost
- Angels provide free/cheap communication channel
- Angels can manage complexity as village grows
- Angels enable plots to complete, research to finish, villagers to survive

### 10.2 Messaging Architecture

```typescript
interface AngelMessagingComponent {
  // Chat rooms
  groupChatId: string;          // All angels group chat
  dmChatIds: string[];          // 1:1 conversation IDs
  customChatIds: string[];      // Sub-group chats

  // State
  lastCheckedPhone: number;     // When angel last read messages
  phoneCheckFrequency: number;  // How often they check (ms)
  unreadMessages: number;

  // Memory integration
  conversationMemoryIds: string[]; // Memories created from chats

  // Rate limiting
  messagesReceivedToday: number;
  messagesSentToday: number;
}

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;            // Player or angel ID
  senderType: 'player' | 'angel';
  content: string;
  timestamp: number;
  readBy: string[];            // Angel IDs who have read
  replyToId?: string;          // If replying to specific message
}

interface ChatRoom {
  id: string;
  type: 'group' | 'dm' | 'custom';
  name: string;
  participants: string[];       // Angel IDs (player always included)
  createdAt: number;
  lastMessageAt: number;
  messageCount: number;
}
```

### 10.3 Chat Types

**Group Chat (All Angels)**:
- Automatically created when first angel is created
- All angels are members
- Good for announcements, general direction
- Angels can see each other's messages

**Direct Messages (1:1)**:
- Created automatically for each angel
- Private conversation between player and one angel
- Good for specific orders, personal feedback
- Angel remembers conversation as memories

**Custom Sub-Groups**:
- Player-created chat rooms with subset of angels
- Example: "Guardian Angels", "Combat Squad", "Research Team"
- Good for coordinating specialized groups

### 10.4 Phone Checking Behavior

Angels don't constantly monitor messages (rate limiting):

```typescript
class AngelPhoneSystem extends System {
  update(world: World): void {
    const angels = world.getEntitiesWithComponent(AngelMessagingComponent);

    for (const angelEntity of angels) {
      const messaging = angelEntity.getComponent(AngelMessagingComponent);
      const angel = angelEntity.getComponent(AngelComponent);

      // Check if it's time to check phone
      const timeSinceCheck = world.time - messaging.lastCheckedPhone;
      if (timeSinceCheck < messaging.phoneCheckFrequency) continue;

      // Read new messages
      const unreadMessages = this.getUnreadMessages(messaging, world);

      if (unreadMessages.length > 0) {
        for (const message of unreadMessages) {
          // Process message
          await this.processMessage(angelEntity, angel, message, world);

          // Create memory from conversation
          this.createConversationMemory(angelEntity, message, world);

          // Mark as read
          message.readBy.push(angel.id);
        }

        messaging.unreadMessages = 0;
      }

      messaging.lastCheckedPhone = world.time;
    }
  }

  private async processMessage(
    angelEntity: Entity,
    angel: AngelComponent,
    message: ChatMessage,
    world: World
  ): Promise<void> {
    // Generate angel response using LLM (Groq for speed/cost)
    const response = await this.generateAngelResponse(angel, message, world);

    // Send response
    if (response) {
      this.sendMessage(message.chatId, angel.id, 'angel', response, world);
    }

    // Emit event for UI
    world.eventBus.emit('angel:read_message', {
      angelId: angel.id,
      messageId: message.id,
    });
  }
}
```

### 10.5 Conversation Memory

Conversations become memories for the angel:

```typescript
private createConversationMemory(
  angelEntity: Entity,
  message: ChatMessage,
  world: World
): void {
  const memory = angelEntity.getComponent(MemoryComponent);

  memory.addMemory({
    type: 'divine_conversation',
    content: `The player told me: "${message.content}"`,
    importance: 0.7,
    timestamp: world.time,
    metadata: {
      messageId: message.id,
      chatId: message.chatId,
    },
  });
}
```

### 10.6 Player UI: Angel Phone Panel

```
╔══════════════════════════════════════════════════════════════╗
║                    📱 ANGEL PHONE                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  CHATS                           VIREL, THE MESSENGER        ║
║  ┌────────────────────┐          ┌──────────────────────────┐║
║  │ 📢 All Angels (3)  │          │ Player: Check on the     ││
║  │    └─ 2 new        │          │ northern farms please    ││
║  ├────────────────────┤          │                          ││
║  │ 💬 Virel           │◄─────────│ Virel: Of course. I      ││
║  │    └─ typing...    │          │ will observe and report  ││
║  ├────────────────────┤          │ back shortly. The last   ││
║  │ 💬 Shadow          │          │ harvest looked promising.││
║  │                    │          │                          ││
║  ├────────────────────┤          │ Player: Also talk to     ││
║  │ 💬 Guardian Azra   │          │ Elder Holt about the     ││
║  ├────────────────────┤          │ water situation          ││
║  │ + New Group        │          │                          ││
║  └────────────────────┘          │ Virel: I shall deliver   ││
║                                  │ guidance to Elder Holt   ││
║                                  │ regarding the water.     ││
║                                  │                          ││
║                                  │ [typing...]              ││
║                                  ├──────────────────────────┤║
║                                  │ Type message...     [➤]  ││
║                                  └──────────────────────────┘║
╚══════════════════════════════════════════════════════════════╝
```

### 10.7 Cost Model

**Angel Chat = Free/Cheap**:
- Uses Groq (fast, cheap) for angel responses
- No belief cost to message angels
- Contrast with divine visions (expensive belief cost)

This makes angels the economical communication channel, justifying their existence.

### 10.8 Angel Speech to Villagers

Angels can optionally speak to villagers (policy-dependent):

```typescript
interface AngelSpeechPolicy {
  // Can angels directly appear to mortals?
  directAppearance: 'never' | 'rare' | 'common' | 'always';

  // Can angels speak audibly?
  audibleSpeech: boolean;

  // Must speech be cryptic/prophetic?
  speechStyle: 'plain' | 'cryptic' | 'prophetic';

  // Do mortals know about angels?
  mortalAwareness: 'ignorant' | 'legends' | 'common_knowledge';
}
```

This is a player policy choice—are your angels working openly with humanity or operating in secret?

---

## 11. Custom Angel Species

### 11.1 Core Concept

When the player creates their **first angel**, they define what angels are called in their universe. This is a disambiguation—angels are your divine servant creatures, but what they're named and how they look is up to you.

### 11.2 First Angel Creation Flow

```
╔══════════════════════════════════════════════════════════════╗
║              🌟 CREATE YOUR FIRST DIVINE SERVANT             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Your servants need a name. What shall mortals call them?    ║
║                                                              ║
║  SPECIES NAME: [    The Fae                              ]   ║
║                                                              ║
║  SINGULAR: [    Fae            ]                             ║
║  PLURAL:   [    Fae            ]                             ║
║                                                              ║
║  Examples: Angels, Nazgûl, Fae, Seraphim, Djinn, Valkyrie,   ║
║           Daemons, Spirits, Emissaries, Heralds, Shades      ║
║                                                              ║
║  ─────────────────────────────────────────────────────────── ║
║                                                              ║
║  APPEARANCE DESCRIPTION:                                     ║
║  ┌──────────────────────────────────────────────────────────┐║
║  │ Ethereal beings of living light, with wings like        ││
║  │ gossamer moonbeams. Their forms shimmer between         ││
║  │ visible and invisible, and they speak in whispers       ││
║  │ that sound like distant wind chimes.                    ││
║  └──────────────────────────────────────────────────────────┘║
║                                                              ║
║  This will be used to generate sprites and influence how    ║
║  mortals perceive your servants.                            ║
║                                                              ║
║                                 [Create First Fae]          ║
╚══════════════════════════════════════════════════════════════╝
```

### 11.3 Angel Species Component

```typescript
interface AngelSpeciesDefinition {
  // Naming
  speciesName: string;           // "The Fae"
  singularName: string;          // "Fae"
  pluralName: string;            // "Fae"

  // Appearance template
  baseAppearanceDescription: string;

  // Generated sprite info
  baseSpriteId?: string;         // PixelLab sprite ID
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };

  // Initial powers available
  startingPowers: string[];

  // Tier information
  currentMaxTier: number;        // 1 initially, increases with promotions
  tierNames: string[];           // ["Fae", "High Fae", "Archfae", "Faerie Lord"]

  // When defined
  definedAt: number;
  definedByPlayerId: string;
}

// Stored on player/deity
interface DeityComponent {
  // ... existing fields ...

  // Angel species definition
  angelSpecies?: AngelSpeciesDefinition;

  // Angels created
  angelIds: string[];
  totalAngelsCreated: number;
}
```

### 11.4 Sprite Generation

When species is defined, generate base sprite via PixelLab:

```typescript
async function generateAngelSpeciesSprite(
  species: AngelSpeciesDefinition,
  world: World
): Promise<string> {
  const spriteRequest = {
    description: species.baseAppearanceDescription,
    size: 48,
    view: 'low top-down',
    n_directions: 8,
    detail: 'medium detail',
    outline: 'single color outline',
  };

  const result = await pixelLab.createCharacter(spriteRequest);
  return result.characterId;
}
```

---

## 12. Evolution & Tier System

### 12.1 Core Concept

Angels can be upgraded and evolved over time. After accumulating enough angels at a tier, you can unlock the next tier and promote a subset of your best angels.

**Progression Path**:
```
Tier 1: Basic Angels (starting tier)
   ↓ (after 10 angels + belief cost)
Tier 2: Greater Angels (promoted from Tier 1)
   ↓ (after 5 greater angels + belief cost)
Tier 3: Arch Angels (promoted from Tier 2)
   ↓ (after 3 arch angels + belief cost)
Tier 4: Supreme Angels (legendary, max 1)
```

### 12.2 Evolution Component

```typescript
interface AngelEvolutionComponent {
  // Current tier
  tier: number;                   // 1-4
  tierName: string;               // From species definition

  // Evolution readiness
  promotionEligible: boolean;
  promotionRequirements: {
    minLevel: number;
    minSuccessRate: number;
    minPrayersHandled: number;
    minServiceTime: number;       // hours
    specialRequirements?: string[];
  };

  // Evolution history
  promotedAt?: number;
  promotedFrom?: number;          // Previous tier
  previousSpriteId?: string;

  // Visual evolution
  currentSpriteId: string;
  currentDescription: string;
}

interface TierUnlockRequirements {
  tier: number;
  angelsAtPreviousTier: number;   // Need this many at tier-1
  beliefCost: number;
  totalBelief: number;            // Lifetime belief spent on angels
}

const TIER_REQUIREMENTS: TierUnlockRequirements[] = [
  { tier: 2, angelsAtPreviousTier: 10, beliefCost: 1000, totalBelief: 5000 },
  { tier: 3, angelsAtPreviousTier: 5, beliefCost: 3000, totalBelief: 15000 },
  { tier: 4, angelsAtPreviousTier: 3, beliefCost: 10000, totalBelief: 50000 },
];
```

### 12.3 Promotion Flow

```
╔══════════════════════════════════════════════════════════════╗
║                   🌟 TIER 2 UNLOCKED! 🌟                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  You have 10 Fae serving faithfully. You may now promote    ║
║  up to 3 of them to become HIGH FAE.                        ║
║                                                              ║
║  PROMOTION COST: 1,000 belief (per angel)                   ║
║  YOUR BELIEF: 4,230                                         ║
║                                                              ║
║  ─────────────────────────────────────────────────────────── ║
║                                                              ║
║  ELIGIBLE FAE:                              SELECT (max 3)   ║
║                                                              ║
║  ☑ Virel the Messenger                                      ║
║    Level 8 │ 94% success │ 234 prayers │ 48h service        ║
║                                                              ║
║  ☑ Shadow the Watcher                                       ║
║    Level 7 │ 89% success │ 156 prayers │ 36h service        ║
║                                                              ║
║  ☐ Azra the Guardian                                        ║
║    Level 6 │ 82% success │ 98 prayers │ 24h service         ║
║                                                              ║
║  ☐ Lumiel the Healer (NOT ELIGIBLE - need level 7)          ║
║    Level 5 │ 91% success │ 67 prayers │ 18h service         ║
║                                                              ║
║  ─────────────────────────────────────────────────────────── ║
║                                                              ║
║  HIGH FAE APPEARANCE (evolved from Fae):                     ║
║  "The High Fae have grown more radiant, their gossamer      ║
║   wings now traced with veins of golden light. Their        ║
║   whispers carry further, and their forms hold more         ║
║   solidly in the mortal realm."                             ║
║                                                              ║
║  [Preview New Sprite]                                       ║
║                                                              ║
║            [Promote Selected (2,000 belief)]   [Cancel]     ║
╚══════════════════════════════════════════════════════════════╝
```

### 12.4 Sprite Evolution

When promoted, generate evolved sprite:

```typescript
async function generateEvolvedSprite(
  angel: Angel,
  species: AngelSpeciesDefinition,
  newTier: number,
  world: World
): Promise<string> {
  // Get previous sprite as reference
  const previousSprite = angel.currentSpriteId;
  const previousColors = species.colorScheme;

  // Generate evolved description
  const evolvedDescription = await generateEvolvedDescription(
    species.baseAppearanceDescription,
    species.tierNames[newTier - 1],
    newTier
  );

  // Request sprite with same color scheme but evolved appearance
  const result = await pixelLab.createCharacter({
    description: evolvedDescription,
    size: 48,
    view: 'low top-down',
    n_directions: 8,
    // Note: Would ideally pass previousSprite for style matching
  });

  return result.characterId;
}

async function generateEvolvedDescription(
  baseDescription: string,
  tierName: string,
  tier: number
): Promise<string> {
  // Use LLM to evolve the description
  const prompt = `
    Original angel appearance: "${baseDescription}"

    This angel is being promoted to ${tierName} (tier ${tier}).
    Write an evolved appearance description that:
    1. Keeps the core visual identity (colors, materials, themes)
    2. Makes them more impressive/powerful looking
    3. Adds 1-2 new visual elements appropriate for the tier
    4. Stays concise (2-3 sentences)
  `;

  return await llm.generate(prompt);
}
```

### 12.5 Tier Benefits

Each tier provides stat bonuses:

```typescript
const TIER_BONUSES: Record<number, Partial<AngelStats>> = {
  1: {}, // Base tier
  2: {
    maxEnergy: 50,
    energyRegenRate: 5,
    expertise: 0.1,
  },
  3: {
    maxEnergy: 100,
    energyRegenRate: 10,
    expertise: 0.2,
    abilities: ['mass_blessing', 'prophetic_dream'],
  },
  4: {
    maxEnergy: 200,
    energyRegenRate: 20,
    expertise: 0.3,
    abilities: ['divine_intervention', 'reality_manipulation'],
    // Supreme tier: can temporarily take physical form
  },
};
```

### 12.6 Individual Angel Upgrades

Players can also purchase upgrades for individual angels with belief:

```typescript
interface AngelUpgrade {
  id: string;
  name: string;
  description: string;
  beliefCost: number;
  requiresTier: number;

  // Effect
  type: 'stat_boost' | 'new_ability' | 'mana_increase' | 'cosmetic';
  effect: {
    stat?: keyof AngelStats;
    amount?: number;
    abilityId?: string;
    spriteModification?: string;
  };
}

const ANGEL_UPGRADES: AngelUpgrade[] = [
  {
    id: 'mana_pool_1',
    name: 'Expanded Mana Pool',
    description: '+25 max divine energy',
    beliefCost: 100,
    requiresTier: 1,
    type: 'mana_increase',
    effect: { stat: 'maxEnergy', amount: 25 },
  },
  {
    id: 'speed_blessing',
    name: 'Swift Wings',
    description: '+20% movement speed',
    beliefCost: 150,
    requiresTier: 1,
    type: 'stat_boost',
    effect: { stat: 'speed', amount: 0.2 },
  },
  {
    id: 'danger_sense',
    name: 'Danger Sense',
    description: 'Can warn agents of incoming threats',
    beliefCost: 300,
    requiresTier: 2,
    type: 'new_ability',
    effect: { abilityId: 'danger_sense' },
  },
  // ... more upgrades
];
```

### 12.7 Angel Independence (Resource Model)

**Key Design**: Once created, angels have their own mana pool that regenerates independently. The player doesn't continuously drain belief to maintain angels.

```typescript
interface AngelResourceComponent {
  // Angel's own mana pool (not player's belief)
  mana: number;
  maxMana: number;
  manaRegenRate: number;         // per minute

  // Mana sources
  manaFromPrayers: number;       // Gains mana when handling prayers
  manaFromRituals: number;       // Gains mana when rituals dedicated
  manaFromWorship: number;       // Gains mana when mortals worship

  // Only player belief used for:
  // - Initial creation (big upfront cost)
  // - Upgrades/promotions
  // - Emergency resurrection if "killed"

  // Independence level
  autonomyLevel: 'dependent' | 'semi-independent' | 'independent';
}
```

**Creation Cost**: Big belief payment upfront
**Maintenance**: Angels sustain themselves through prayer handling
**Upgrades**: Player spends belief to enhance angels
**Death**: Angels can be "disrupted" but reform automatically (unless legendary weapon)

---

## 13. Integration Points

### 13.1 With Divine Communication System

Angels use the same vision delivery system as the player, but:
- Visions marked with `fromAngel: angelId`
- Angel's personality affects vision tone
- Angel's expertise affects vision quality

### 10.2 With Metrics System

Angels query metrics to generate informed responses:
- NetworkAnalyzer for social prayers
- Health metrics for wellbeing prayers
- Resource metrics for economic prayers

### 10.3 With Faith System

Angel performance affects agent faith:
- Good responses → faith increases
- Bad responses → faith decreases
- Unanswered prayers → doubt accumulates

### 10.4 With Sacred Sites

Angels can direct agents to sacred sites for stronger visions.

### 10.5 With Rituals

Rituals can be dedicated to specific angels, boosting their power.

---

## 11. Implementation Plan

### Phase 28.1: Core Angel System (Week 1)
- [ ] AngelComponent
- [ ] Angel AI system (prayer assignment)
- [ ] Angel creation system
- [ ] Basic angel UI dashboard

### Phase 28.2: Angel Response Generation (Week 2)
- [ ] LLM integration for angel responses
- [ ] Energy management
- [ ] Approval workflow
- [ ] Performance tracking

### Phase 28.3: Angel Progression (Week 3)
- [ ] Experience and leveling
- [ ] Ability unlocking
- [ ] Autonomy progression
- [ ] Statistics and analytics

### Phase 28.4: Angel Hierarchy (Week 4)
- [ ] Archangel promotion
- [ ] Task delegation
- [ ] Subordinate management
- [ ] Conflict resolution

### Phase 28.5: Failure & Corruption (Week 5)
- [ ] Outcome tracking
- [ ] Mistake detection
- [ ] Corruption system
- [ ] Redemption/banishment mechanics

---

## Performance Targets

- **Prayer assignment**: <50ms per prayer
- **Response generation**: <3s per response (LLM call)
- **Energy regeneration**: Calculated every second, not every frame
- **Performance review**: Every 60 seconds, not every frame

---

## Balancing Parameters

```typescript
const balanceConfig = {
  // Angel costs
  creationCosts: { /* see above */ },

  // Energy
  baseEnergy: 100,
  baseRegenRate: 10, // per minute
  energyCostMultipliers: {
    lowUrgency: 0.5,
    mediumUrgency: 1.0,
    highUrgency: 2.0,
    desperate: 3.0,
  },

  // Progression
  xpPerPrayer: {
    low: 5,
    medium: 10,
    high: 20,
    desperate: 30,
  },
  levelUpBonus: {
    energy: 20,
    expertise: 0.05,
    regenRate: 2,
  },

  // Corruption
  corruptionPerMistake: 0.02,
  corruptionDecayRate: 0.01, // per successful prayer
  rogueProbabilityThreshold: 0.7,

  // Performance
  minSuccessRateForPromotion: 0.8,
  minLevelForPromotion: 10,
};
```

---

## Future Enhancements

- **Angel Conflicts**: Angels disagree, player arbitrates
- **Angel Specializations**: Sub-domains (combat medic, counselor, farmer, etc.)
- **Angel Personalities Evolve**: Based on experience
- **Angel Names from Agents**: Agents name angels they interact with
- **Angel Manifestation**: High-faith agents can "see" angels
- **Fallen Angels**: Corrupted angels join agent society as mortals
- **Angel Retirement**: Old angels can "ascend" after long service
