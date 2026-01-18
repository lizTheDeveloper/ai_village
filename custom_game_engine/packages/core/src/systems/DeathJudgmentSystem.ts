import type { SystemId } from '../types.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { RealmLocationComponent } from '../components/RealmLocationComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { SocialMemoryComponent } from '../components/SocialMemoryComponent.js';
import type { GoalsComponent } from '../components/GoalsComponent.js';
import type { DeedLedgerComponent } from '../components/DeedLedgerComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { CauseOfDeath } from '../components/AfterlifeComponent.js';
import {
  createDeathJudgmentComponent,
  addConversationExchange,
  calculateInitialPeace,
  calculateInitialTether,
  type DeathJudgmentComponent,
} from '../components/DeathJudgmentComponent.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

/**
 * DeathJudgmentSystem - Handles psychopomp conversations with dying souls
 *
 * When an agent dies, they enter limbo and converse with a psychopomp
 * (death guide angel) before transitioning to the afterlife. This system
 * manages that conversation flow.
 *
 * See: packages/core/src/divinity/PSYCHOPOMP_DESIGN.md
 *
 * Priority: 109 (runs before DeathTransitionSystem at 110)
 */
export class DeathJudgmentSystem extends BaseSystem {
  readonly id: SystemId = 'death_judgment';
  readonly priority: number = 109;
  readonly requiredComponents = ['needs', 'realm_location'] as const;

  private processedDeaths: Set<string> = new Set();

  protected onUpdate(ctx: SystemContext): void {
    const entities = ctx.activeEntities;
    for (const entity of entities) {
      const needs = entity.components.get('needs') as NeedsComponent | undefined;
      const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;

      if (!needs || !realmLocation) continue;

      // Check if entity just died (health <= 0 and not already processed)
      const isDead = needs.health <= 0;
      const alreadyProcessed = this.processedDeaths.has(entity.id);

      if (isDead && !alreadyProcessed) {
        this.initiateJudgment(ctx.world, entity);
        this.processedDeaths.add(entity.id);
      }

      // Process ongoing judgment conversations
      const judgment = entity.components.get('death_judgment') as DeathJudgmentComponent | undefined;
      if (judgment && judgment.stage !== 'crossing_over') {
        this.updateJudgment(ctx.world, entity, judgment);
      }

      // Clean up processed deaths for resurrected entities
      if (!isDead && alreadyProcessed) {
        this.processedDeaths.delete(entity.id);
      }
    }
  }

  /**
   * Initiate judgment conversation for a newly dead entity
   */
  private initiateJudgment(world: { tick: number; eventBus: { emit: (event: any) => void }; getEntity: (id: string) => Entity | undefined }, entity: Entity): void {
    const impl = entity as EntityImpl;

    // Skip if entity already has judgment component
    if (entity.components.has('death_judgment')) return;

    // Only process agents with personality (full/reduced tier LLM agents)
    const agent = entity.components.get('agent') as AgentComponent | undefined;
    const tier = agent?.tier ?? (agent?.useLLM ? 'full' : 'autonomic');

    if (tier === 'autonomic') {
      // Autonomic NPCs don't get psychopomp conversations
      return;
    }

    // Gather context about the deceased
    const context = this.gatherDeathContext(world, entity);

    // Create judgment component
    const judgment = createDeathJudgmentComponent(
      world.tick,
      context.causeOfDeath,
      context.ageName,
      'The Ferryman'  // Default psychopomp name
    );

    // Populate context fields
    judgment.unfinishedGoals = context.unfinishedGoals;
    judgment.importantRelationships = context.relationships;
    judgment.notableDeeds = context.deeds;
    judgment.sins = context.sins;
    judgment.beliefs = context.beliefs;

    // Calculate initial judgment values
    judgment.judgedPeace = calculateInitialPeace(
      context.causeOfDeath,
      context.ageName,
      context.unfinishedGoals.length
    );
    judgment.judgedTether = calculateInitialTether(
      context.relationships.length,
      context.unfinishedGoals.length,
      context.ageName
    );

    // Add component to entity
    impl.addComponent(judgment);

    // Emit event for observers
    world.eventBus.emit({
      type: 'death:judgment_started',
      source: entity.id,
      data: {
        entityId: entity.id,
        psychopompName: judgment.psychopompName,
        causeOfDeath: judgment.causeOfDeath,
      },
    });

    // Start conversation by generating psychopomp greeting
    this.generatePsychopompGreeting(world, entity, judgment);
  }

  /**
   * Update an ongoing judgment conversation
   */
  private updateJudgment(world: { tick: number; eventBus: { emit: (event: any) => void } }, entity: Entity, judgment: DeathJudgmentComponent): void {
    const impl = entity as EntityImpl;
    const currentTick = world.tick;

    // Check if we're waiting for a response
    if (judgment.awaitingSoulResponse || judgment.awaitingPsychopompResponse) {
      // In a real implementation with LLM, we would check if responses are ready
      // For now, we'll simulate the conversation progressing on a timer
      const ticksSinceLastExchange = currentTick - judgment.lastExchangeTick;
      const EXCHANGE_DELAY = 100; // Wait 100 ticks between exchanges

      if (ticksSinceLastExchange >= EXCHANGE_DELAY) {
        if (judgment.awaitingSoulResponse) {
          this.generateSoulResponse(world, entity, judgment);
        } else if (judgment.awaitingPsychopompResponse) {
          this.generatePsychopompResponse(world, entity, judgment);
        }
      }
    }

    // Check if conversation is complete
    if (judgment.stage === 'in_conversation' && judgment.exchanges.length >= 6) {
      // Move to judgment delivered stage
      impl.updateComponent<DeathJudgmentComponent>('death_judgment', (current) => {
        const updated = { ...current };
        updated.stage = 'judgment_delivered';
        return updated;
      });

      world.eventBus.emit({
        type: 'death:judgment_delivered',
        source: entity.id,
        data: {
          entityId: entity.id,
          peace: judgment.judgedPeace,
          tether: judgment.judgedTether,
          coherenceModifier: judgment.coherenceModifier,
        },
      });

      // Brief delay before crossing over
      setTimeout(() => {
        impl.updateComponent<DeathJudgmentComponent>('death_judgment', (current) => {
          const updated = { ...current };
          updated.stage = 'crossing_over';
          return updated;
        });

        world.eventBus.emit({
          type: 'death:crossing_over',
          source: entity.id,
          data: {
            entityId: entity.id,
          },
        });
      }, 50);
    }
  }

  /**
   * Generate psychopomp greeting (first exchange)
   */
  private generatePsychopompGreeting(world: { tick: number; eventBus: { emit: (event: any) => void } }, entity: Entity, judgment: DeathJudgmentComponent): void {
    const impl = entity as EntityImpl;
    const identity = entity.components.get('identity') as IdentityComponent | undefined;
    const name = identity?.name ?? 'Soul';

    // Generate greeting based on death circumstances
    let greeting = '';

    if (judgment.causeOfDeath === 'old_age') {
      greeting = `Welcome, ${name}. Your time has come, as it comes for all. You lived a full life - your journey in the mortal realm is complete.`;
    } else if (judgment.causeOfDeath === 'combat' || judgment.causeOfDeath === 'murder') {
      greeting = `Rise, ${name}. Your body lies broken, but your soul endures. The violence that ended your mortal life cannot touch you here.`;
    } else if (judgment.causeOfDeath === 'starvation') {
      greeting = `Peace, ${name}. The suffering is over. Your mortal vessel failed you, but your spirit remains strong.`;
    } else {
      greeting = `Greetings, ${name}. Your mortal journey has ended. I am ${judgment.psychopompName}, and I will guide you to what comes next.`;
    }

    // Add the exchange to conversation history
    addConversationExchange(judgment, 'psychopomp', greeting, world.tick);

    // Update component
    impl.updateComponent<DeathJudgmentComponent>('death_judgment', (current) => {
      const updated = { ...current };
      updated.stage = 'in_conversation';
      updated.exchanges = judgment.exchanges;
      updated.awaitingSoulResponse = judgment.awaitingSoulResponse;
      updated.awaitingPsychopompResponse = judgment.awaitingPsychopompResponse;
      return updated;
    });

    // Emit exchange event
    world.eventBus.emit({
      type: 'death:exchange',
      source: entity.id,
      data: {
        entityId: entity.id,
        speaker: 'psychopomp',
        text: greeting,
        exchangeIndex: 0,
      },
    });
  }

  /**
   * Generate soul's response
   * In full implementation, this would use LLM for LLM-controlled agents
   */
  private generateSoulResponse(world: { tick: number; eventBus: { emit: (event: any) => void } }, entity: Entity, judgment: DeathJudgmentComponent): void {
    const impl = entity as EntityImpl;

    // Template-based response for now (would be LLM-driven in full implementation)
    const exchangeCount = judgment.exchanges.length;
    let response = '';

    if (exchangeCount === 1) {
      // Initial shock/acceptance
      if (judgment.judgedPeace > 0.7) {
        response = `I... I understand. I felt it coming. What happens now?`;
      } else {
        response = `This can't be real. I'm not ready! There's so much left undone!`;
      }
    } else if (exchangeCount === 3) {
      // Reflection on life
      const deeds = judgment.notableDeeds.length > 0
        ? `I tried to do good. ${judgment.notableDeeds[0]}.`
        : 'I lived as best I could.';
      const regrets = judgment.unfinishedGoals.length > 0
        ? ` But I never finished... I never...`
        : '';
      response = `${deeds}${regrets}`;
    } else if (exchangeCount === 5) {
      // Final words
      if (judgment.importantRelationships.length > 0) {
        const rel = judgment.importantRelationships[0];
        if (rel) {
          response = `Will I see ${rel.name} again? Will they be alright without me?`;
        }
      } else {
        response = `I'm ready. Show me the way.`;
      }
    }

    // Add exchange
    addConversationExchange(judgment, 'soul', response, world.tick);

    // Update component
    impl.updateComponent<DeathJudgmentComponent>('death_judgment', (current) => {
      const updated = { ...current };
      updated.exchanges = judgment.exchanges;
      updated.awaitingSoulResponse = judgment.awaitingSoulResponse;
      updated.awaitingPsychopompResponse = judgment.awaitingPsychopompResponse;
      return updated;
    });

    // Emit event
    world.eventBus.emit({
      type: 'death:exchange',
      source: entity.id,
      data: {
        entityId: entity.id,
        speaker: 'soul',
        text: response,
        exchangeIndex: judgment.exchanges.length - 1,
      },
    });
  }

  /**
   * Generate psychopomp's response
   */
  private generatePsychopompResponse(world: { tick: number; eventBus: { emit: (event: any) => void } }, entity: Entity, judgment: DeathJudgmentComponent): void {
    const impl = entity as EntityImpl;
    const exchangeCount = judgment.exchanges.length;
    let response = '';

    if (exchangeCount === 2) {
      // Acknowledge their reaction, ask about their life
      response = `Tell me - what do you remember of your life? What did you accomplish? What did you leave behind?`;
    } else if (exchangeCount === 4) {
      // Life review and judgment preview
      const peaceDesc = judgment.judgedPeace > 0.7 ? 'at peace' : judgment.judgedPeace > 0.4 ? 'uncertain' : 'troubled';
      const tetherDesc = judgment.judgedTether > 0.7 ? 'strongly bound to the living' : judgment.judgedTether > 0.4 ? 'still connected' : 'ready to move on';

      response = `I see. Your soul departs ${peaceDesc}, ${tetherDesc}. `;

      if (judgment.unfinishedGoals.length > 0) {
        response += `Your unfinished tasks will weigh on you, but perhaps others will complete what you began. `;
      }

      if (judgment.importantRelationships.length > 0) {
        response += `Those you loved will remember you - their memories give you strength. `;
      }

      response += `The Underworld awaits. Are you ready to cross over?`;
    }

    // Add exchange
    addConversationExchange(judgment, 'psychopomp', response, world.tick);

    // Update component
    impl.updateComponent<DeathJudgmentComponent>('death_judgment', (current) => {
      const updated = { ...current };
      updated.exchanges = judgment.exchanges;
      updated.awaitingSoulResponse = judgment.awaitingSoulResponse;
      updated.awaitingPsychopompResponse = judgment.awaitingPsychopompResponse;
      return updated;
    });

    // Emit event
    world.eventBus.emit({
      type: 'death:exchange',
      source: entity.id,
      data: {
        entityId: entity.id,
        speaker: 'psychopomp',
        text: response,
        exchangeIndex: judgment.exchanges.length - 1,
      },
    });
  }

  /**
   * Gather context about the deceased for conversation
   */
  private gatherDeathContext(world: { getEntity: (id: string) => Entity | undefined }, entity: Entity): {
    causeOfDeath: CauseOfDeath;
    ageName: string;
    unfinishedGoals: string[];
    relationships: Array<{ name: string; relationship: string }>;
    deeds: string[];
    sins: string[];
    beliefs: string | null;
  } {
    const needs = entity.components.get('needs') as NeedsComponent | undefined;
    const goals = entity.components.get('goals') as GoalsComponent | undefined;
    const socialMemory = entity.components.get('social_memory') as SocialMemoryComponent | undefined;
    const deedLedger = entity.components.get('deed_ledger') as DeedLedgerComponent | undefined;
    const spiritual = entity.components.get('spiritual') as SpiritualComponent | undefined;

    // Determine cause of death
    let causeOfDeath: CauseOfDeath = 'unknown';
    if (needs) {
      if (needs.hunger <= 0) causeOfDeath = 'starvation';
      else if (needs.temperature < 30 || needs.temperature > 42) causeOfDeath = 'exposure';
      else if (needs.health <= 0 && needs.hunger > 0.1) causeOfDeath = 'combat';
    }

    // Get age category (default to 'adult' since AgeComponent doesn't exist yet)
    const ageName = 'adult';

    // Get unfinished goals
    const unfinishedGoals: string[] = [];
    if (goals) {
      for (const goal of goals.goals) {
        if (!goal.completed) {
          unfinishedGoals.push(goal.description);
        }
      }
    }

    // Get important relationships
    const relationships: Array<{ name: string; relationship: string }> = [];
    if (socialMemory?.socialMemories) {
      for (const [agentId, memory] of socialMemory.socialMemories) {
        if (memory.interactionCount > 5 || Math.abs(memory.overallSentiment) > 0.5) {
          const otherEntity = world.getEntity(agentId);
          const otherIdentity = otherEntity?.components.get('identity') as IdentityComponent | undefined;
          relationships.push({
            name: otherIdentity?.name ?? 'Someone',
            relationship: memory.overallSentiment > 0.5 ? 'friend' : memory.overallSentiment < -0.5 ? 'rival' : 'acquaintance',
          });
        }
      }
    }

    // Get notable deeds and sins from deed ledger
    const deeds: string[] = [];
    const sins: string[] = [];
    if (deedLedger) {
      // Extract from deed ledger if available
      // This would be implemented fully when deed ledger has more detail
    }

    // Get beliefs
    const beliefs = spiritual?.believedDeity ?? null;

    return {
      causeOfDeath,
      ageName,
      unfinishedGoals,
      relationships,
      deeds,
      sins,
      beliefs,
    };
  }

  /**
   * Clear processed deaths (for testing)
   */
  clearProcessedDeaths(): void {
    this.processedDeaths.clear();
  }

  /**
   * Check if an entity's death has been processed
   */
  hasProcessedDeath(entityId: string): boolean {
    return this.processedDeaths.has(entityId);
  }
}
