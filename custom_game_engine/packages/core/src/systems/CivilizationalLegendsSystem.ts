/**
 * CivilizationalLegendsSystem
 *
 * When a settlement crosses civilizational milestone thresholds, generates
 * a short LLM-powered oral tradition (legend) that gets stored in the eldest
 * agent's memory and notified to the player.
 *
 * Trigger events:
 * - First elder death (agent with ageCategory='elder' dies)
 * - First city reaching 50+ simultaneous living agents
 * - First agent to achieve skill level 5 (Master)
 *
 * Each trigger can only fire ONCE per world (tracked internally).
 * LLM call rate: max one per legend, gated by rare events.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { LLMDecisionQueue } from '../types/LLMTypes.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { MemoryComponent } from '../components/MemoryComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';

interface PendingLegend {
  triggerType: 'elder_death' | 'population_50' | 'master_skill';
  agentName: string;
  context: string;
  requestedAt: number;
}

/**
 * CivilizationalLegendsSystem
 *
 * Monitors rare civilizational milestones and generates LLM oral traditions
 * when they occur. Each milestone fires exactly once per world.
 */
export class CivilizationalLegendsSystem extends BaseSystem {
  public readonly id = 'civilizational-legends';
  public readonly priority = 855;
  public readonly requiredComponents: ReadonlyArray<CT> = [];
  protected readonly throttleInterval = 200; // 10 seconds at 20 TPS
  protected readonly skipSimulationFiltering = true;

  private llmQueue: LLMDecisionQueue;

  private eldersDeathLegendFired = false;
  private populationLegendFired = false;
  private masterSkillLegendFired = false;

  /** Pending LLM requests keyed by 'legend_<triggerType>' */
  private pendingLegend = new Map<string, PendingLegend>();

  private worldRef: import('../ecs/World.js').World | null = null;

  constructor(llmQueue: LLMDecisionQueue) {
    super();
    this.llmQueue = llmQueue;
  }

  protected onInitialize(
    world: import('../ecs/World.js').World,
    eventBus: import('../events/EventBus.js').EventBus
  ): void {
    this.worldRef = world;

    // Subscribe to agent death events to detect first elder death
    eventBus.subscribe('agent:death', (event) => {
      if (this.eldersDeathLegendFired) return;

      const agentId = event.data?.agentId as string | undefined;
      if (!agentId) return;

      const entity = world.getEntity(agentId) as EntityImpl | undefined;
      if (!entity) return;

      const agent = entity.getComponent<AgentComponent>(CT.Agent);
      if (!agent) return;

      if (agent.ageCategory === 'elder') {
        this.eldersDeathLegendFired = true;
        const agentName = (event.data?.agentName as string | undefined) ?? 'an elder';
        this.triggerLegend(
          world,
          'elder_death',
          agentName,
          `the passing of elder ${agentName}, first of their generation to cross into memory`
        );
      }
    });

    // Subscribe to skill level-up events to detect first master
    eventBus.subscribe('skill:level_up', (event) => {
      if (this.masterSkillLegendFired) return;

      const newLevel = event.data?.newLevel as number | undefined;
      if (newLevel !== 5) return;

      this.masterSkillLegendFired = true;
      const agentId = event.data?.agentId as string | undefined;
      const skillId = event.data?.skillId as string | undefined;

      let agentName = 'a gifted artisan';
      if (agentId) {
        const entity = world.getEntity(agentId) as EntityImpl | undefined;
        if (entity) {
          const identity = entity.getComponent<IdentityComponent>(CT.Identity);
          if (identity?.name) {
            agentName = identity.name;
          }
        }
      }

      const skillName = skillId ?? 'an ancient craft';
      this.triggerLegend(
        world,
        'master_skill',
        agentName,
        `${agentName} achieved mastery of ${skillName}, becoming the first master in living memory`
      );
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    // Check population milestone
    if (!this.populationLegendFired) {
      const agentEntities = ctx.world.query().with(CT.Agent).with(CT.Needs).executeEntities();
      let livingCount = 0;

      for (const entity of agentEntities) {
        const needs = (entity as EntityImpl).getComponent<NeedsComponent>(CT.Needs);
        if (needs && needs.health > 0) {
          livingCount++;
        }
      }

      if (livingCount >= 50) {
        this.populationLegendFired = true;
        this.triggerLegend(
          ctx.world,
          'population_50',
          'the settlement',
          'the settlement reached fifty living souls, a city born from dust and will'
        );
      }
    }

    // Process any pending legend responses
    if (this.pendingLegend.size > 0) {
      this.processPendingLegends(ctx);
    }
  }

  /**
   * Queue an LLM legend request for the given milestone trigger and track it.
   */
  private triggerLegend(
    world: import('../ecs/World.js').World,
    triggerType: 'elder_death' | 'population_50' | 'master_skill',
    agentName: string,
    contextDesc: string
  ): void {
    const key = `legend_${triggerType}`;

    // Don't re-queue if already pending
    if (this.pendingLegend.has(key)) return;

    const prompt = this.buildLegendPrompt(agentName, contextDesc);

    this.llmQueue.requestDecision(key, prompt).catch(err => {
      console.error(`[CivilizationalLegendsSystem] Failed to queue legend for ${triggerType}:`, err);
    });

    this.pendingLegend.set(key, {
      triggerType,
      agentName,
      context: contextDesc,
      requestedAt: world.tick,
    });
  }

  /**
   * Build the folklore prompt for a civilizational milestone.
   */
  private buildLegendPrompt(agentName: string, contextDesc: string): string {
    return `You are an oral storyteller in a living fantasy world.

A civilizational milestone has occurred: ${contextDesc}

Write a SHORT oral tradition (2-3 sentences) that captures the mythic significance of this moment.
- Write in 3rd person
- Use poetic, folkloric language like campfire tales
- If a name is provided, use it as the protagonist
- Celebrate what was achieved, not what was lost
- Keep it between 40-80 words

Agent: ${agentName}
Event: ${contextDesc}

Respond with ONLY the legend text, no title or preamble.`;
  }

  /**
   * Process pending legend LLM responses, store in eldest agent's memory,
   * and emit notification events.
   */
  private processPendingLegends(ctx: SystemContext): void {
    const completed: string[] = [];
    const world = ctx.world;
    const tick = ctx.tick;

    for (const [key, pending] of this.pendingLegend.entries()) {
      const response = this.llmQueue.getDecision(key);
      if (!response) continue;

      const legendText = response.trim();
      if (!legendText) {
        completed.push(key);
        continue;
      }

      // Find eldest surviving agent to carry this memory
      const eldestAgentId = this.findEldestLivingAgent(world);

      if (eldestAgentId) {
        const entity = world.getEntity(eldestAgentId) as EntityImpl | undefined;
        if (entity) {
          const memory = entity.getComponent<MemoryComponent>(CT.Memory);
          if (memory) {
            memory.addMemory({
              id: `legend_${pending.triggerType}_${tick}`,
              type: 'episodic',
              content: legendText,
              importance: 95,
              timestamp: tick,
              location: { x: 0, y: 0 },
            });
          }
        }
      }

      // Emit the legend born event
      ctx.emit('civilizational_legend:born', {
        triggerType: pending.triggerType,
        agentName: pending.agentName,
        legendText,
        eldestAgentId: eldestAgentId ?? undefined,
        tick,
      });

      // Build a short notification from the first sentence of the legend
      const firstSentence = legendText.split(/[.!?]/)[0]?.trim() ?? legendText;
      ctx.emit('notification:show', {
        message: `A Legend Is Born: ${firstSentence}`,
        type: 'success',
        duration: 8000,
      });

      completed.push(key);
    }

    for (const key of completed) {
      this.pendingLegend.delete(key);
    }
  }

  /**
   * Find the ID of the oldest living agent (lowest birthTick with health > 0).
   */
  private findEldestLivingAgent(world: import('../ecs/World.js').World): string | null {
    const agentEntities = world.query().with(CT.Agent).with(CT.Needs).executeEntities();

    let eldestId: string | null = null;
    let lowestBirthTick = Infinity;

    for (const entity of agentEntities) {
      const impl = entity as EntityImpl;
      const needs = impl.getComponent<NeedsComponent>(CT.Needs);
      if (!needs || needs.health <= 0) continue;

      const agent = impl.getComponent<AgentComponent>(CT.Agent);
      if (!agent) continue;

      const birthTick = agent.birthTick ?? 0;
      if (birthTick < lowestBirthTick) {
        lowestBirthTick = birthTick;
        eldestId = entity.id;
      }
    }

    return eldestId;
  }
}
