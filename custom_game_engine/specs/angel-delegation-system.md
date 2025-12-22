# Angel Delegation System - Divine Automation & Hierarchy

> **Status**: Phase 28 Ready
> **Dependencies**: Phase 27 (Divine Communication System)
> **Estimated LOC**: ~4,000
> **Last Updated**: 2025-12-22

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
10. [Integration Points](#10-integration-points)
11. [Implementation Plan](#11-implementation-plan)

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

## 10. Integration Points

### 10.1 With Divine Communication System

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
