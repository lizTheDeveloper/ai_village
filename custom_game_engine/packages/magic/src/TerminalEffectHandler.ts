/**
 * TerminalEffectHandler - Handles terminal effects from magic system
 *
 * Terminal effects occur when a caster's resources hit critical thresholds:
 * - Health/blood at zero → death
 * - Corruption at maximum → transformation
 * - Sanity at zero → madness
 * - Favor at zero → forsaken by deity
 * - Soul fragments at zero → soul lost
 */

import type { World } from '@ai-village/core';
import type { EntityImpl } from '@ai-village/core';
import type { EventBus } from '@ai-village/core';
import type { TerminalEffect } from './costs/CostCalculator.js';
import { ComponentType as CT } from '@ai-village/core';
import type { MagicComponent } from '@ai-village/core';

/**
 * Terminal effect event data as emitted by MagicSystem
 */
export interface TerminalEffectEvent {
  type: 'magic:terminal_effect';
  source: string;
  data: {
    spellId: string;
    effect: TerminalEffect;
  };
}

/**
 * Result of handling a terminal effect
 */
export interface TerminalEffectResult {
  handled: boolean;
  entityRemoved: boolean;
  transformation?: string;
  description: string;
}

/**
 * Handler for terminal magic effects.
 *
 * Subscribe this to the event bus during initialization to respond
 * to terminal effects from spell casting.
 */
export class TerminalEffectHandler {
  private world: World;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Initialize the handler by subscribing to terminal effect events.
   */
  initialize(eventBus: EventBus): void {
    eventBus.subscribe('magic:terminal_effect', (event) => {
      const casterId = event.source;
      const { effect, spellId } = event.data as { effect: TerminalEffect; spellId: string };

      const caster = this.world.getEntity(casterId);
      if (!caster) return;

      const result = this.handleTerminalEffect(caster as EntityImpl, effect, spellId);

      // Emit result event using generic emit
      (eventBus as unknown as { emit: (event: Record<string, unknown>) => void }).emit({
        type: 'magic:terminal_effect_applied',
        source: casterId,
        data: { effect, result },
      });
    });
  }

  /**
   * Handle a terminal effect on an entity.
   */
  handleTerminalEffect(
    entity: EntityImpl,
    effect: TerminalEffect,
    _spellId: string
  ): TerminalEffectResult {
    switch (effect.type) {
      case 'death':
        return this.handleDeath(entity, effect.cause);

      case 'corruption_threshold':
        return this.handleCorruption(entity, effect.newForm, effect.corruptionLevel);

      case 'soul_lost':
        return this.handleSoulLost(entity, effect.fragmentsRemaining);

      case 'favor_zero':
        return this.handleFavorZero(entity, effect.patronAction);

      case 'sanity_zero':
        return this.handleSanityZero(entity, effect.madnessType);

      case 'drab':
        return this.handleDrab(entity);

      case 'forsaken':
        return this.handleForsaken(entity, effect.deityId);

      case 'emotional_burnout':
        return this.handleEmotionalBurnout(entity, effect.dominantEmotion);

      case 'mutation':
        return this.handleMutation(entity, effect.mutationType);

      default:
        return {
          handled: false,
          entityRemoved: false,
          description: `Unknown terminal effect type`,
        };
    }
  }

  /**
   * Get agent name from entity
   */
  private getAgentName(entity: EntityImpl): string {
    const agent = entity.components.get(CT.Agent);
    if (agent && typeof agent === 'object' && 'name' in agent) {
      return (agent as { name?: string }).name ?? entity.id;
    }
    return entity.id;
  }

  /**
   * Emit a generic event
   */
  private emitEvent(type: string, source: string, data: Record<string, unknown>): void {
    (this.world.eventBus as unknown as { emit: (event: Record<string, unknown>) => void }).emit({
      type,
      source,
      data,
    });
  }

  /**
   * Handle death from magic (blood loss, health depletion, etc.)
   */
  private handleDeath(entity: EntityImpl, cause: string): TerminalEffectResult {
    const agentName = this.getAgentName(entity);

    // Set health to 0 via needs component
    const needs = entity.components.get(CT.Needs);
    if (needs && typeof needs === 'object' && 'health' in needs) {
      // Entity already typed as EntityImpl in parameter, can call addComponent directly
      const updatedNeeds = { ...needs, health: 0 };
      entity.addComponent(updatedNeeds);
    }

    this.emitEvent('magic:death', entity.id, {
      cause: `Magic terminal effect: ${cause}`,
      agentName,
    });

    return {
      handled: true,
      entityRemoved: false,
      description: `${agentName} died from ${cause}`,
    };
  }

  /**
   * Handle corruption threshold - entity transforms into corrupted form
   */
  private handleCorruption(
    entity: EntityImpl,
    newForm: string,
    corruptionLevel: number
  ): TerminalEffectResult {
    const agentName = this.getAgentName(entity);

    // Mark as corrupted in magic component
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (magic) {
      entity.updateComponent<MagicComponent>(CT.Magic, (current) => ({
        ...current,
        corruption: corruptionLevel,
      }));
    }

    this.emitEvent('magic:corrupted', entity.id, {
      agentName,
      newForm,
      corruptionLevel,
    });

    return {
      handled: true,
      entityRemoved: false,
      transformation: newForm,
      description: `${agentName} has been corrupted and transformed into ${newForm}`,
    };
  }

  /**
   * Handle soul lost - entity becomes empty husk
   */
  private handleSoulLost(entity: EntityImpl, fragmentsRemaining: number): TerminalEffectResult {
    const agentName = this.getAgentName(entity);

    // Remove magic ability
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (magic) {
      entity.updateComponent<MagicComponent>(CT.Magic, (current) => ({
        ...current,
        magicUser: false,
        knownSpells: [],
        knownParadigmIds: [],
      }));
    }

    this.emitEvent('magic:soul_lost', entity.id, { agentName, fragmentsRemaining });

    return {
      handled: true,
      entityRemoved: false,
      description: `${agentName} has lost their soul and become an empty husk`,
    };
  }

  /**
   * Handle favor zero - deity revokes powers
   */
  private handleFavorZero(entity: EntityImpl, patronAction: string): TerminalEffectResult {
    const agentName = this.getAgentName(entity);

    // Remove divine magic
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (magic) {
      entity.updateComponent<MagicComponent>(CT.Magic, (current) => ({
        ...current,
        knownParadigmIds: current.knownParadigmIds.filter(p => p !== 'divine'),
        paradigmState: {
          ...current.paradigmState,
          divine: { ...current.paradigmState?.divine, deityStanding: 'forsaken' },
        },
      }));
    }

    this.emitEvent('magic:favor_lost', entity.id, { agentName, patronAction });

    return {
      handled: true,
      entityRemoved: false,
      description: `${agentName}'s deity has ${patronAction}`,
    };
  }

  /**
   * Handle sanity zero - entity goes mad
   */
  private handleSanityZero(entity: EntityImpl, madnessType: string): TerminalEffectResult {
    const agentName = this.getAgentName(entity);

    this.emitEvent('magic:sanity_lost', entity.id, { agentName, madnessType });

    return {
      handled: true,
      entityRemoved: false,
      description: `${agentName} has gone mad (${madnessType})`,
    };
  }

  /**
   * Handle becoming Drab (breath magic - no more breaths)
   */
  private handleDrab(entity: EntityImpl): TerminalEffectResult {
    const agentName = this.getAgentName(entity);

    // Remove breath magic
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (magic) {
      entity.updateComponent<MagicComponent>(CT.Magic, (current) => ({
        ...current,
        knownParadigmIds: current.knownParadigmIds.filter(p => p !== 'breath'),
        paradigmState: {
          ...current.paradigmState,
          breath: { ...current.paradigmState?.breath, isDrab: true, breathCount: 0 },
        },
      }));
    }

    this.emitEvent('magic:drab', entity.id, { agentName });

    return {
      handled: true,
      entityRemoved: false,
      description: `${agentName} has become a Drab, unable to use breath magic`,
    };
  }

  /**
   * Handle forsaken by deity
   */
  private handleForsaken(entity: EntityImpl, deityId: string): TerminalEffectResult {
    const agentName = this.getAgentName(entity);

    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (magic) {
      entity.updateComponent<MagicComponent>(CT.Magic, (current) => ({
        ...current,
        paradigmState: {
          ...current.paradigmState,
          divine: { ...current.paradigmState?.divine, deityStanding: 'forsaken', forsakenBy: deityId },
        },
      }));
    }

    this.emitEvent('magic:forsaken', entity.id, { agentName, deityId });

    return {
      handled: true,
      entityRemoved: false,
      description: `${agentName} has been forsaken by their deity`,
    };
  }

  /**
   * Handle emotional burnout
   */
  private handleEmotionalBurnout(entity: EntityImpl, dominantEmotion: string): TerminalEffectResult {
    const agentName = this.getAgentName(entity);

    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (magic) {
      entity.updateComponent<MagicComponent>(CT.Magic, (current) => ({
        ...current,
        knownParadigmIds: current.knownParadigmIds.filter(p => p !== 'emotional'),
        paradigmState: {
          ...current.paradigmState,
          emotional: { burnedOut: true, dominantEmotion, emotionalCapacity: 0 },
        },
      }));
    }

    this.emitEvent('magic:burnout', entity.id, { agentName, dominantEmotion });

    return {
      handled: true,
      entityRemoved: false,
      description: `${agentName} has burned out emotionally (${dominantEmotion})`,
    };
  }

  /**
   * Handle mutation from magic
   */
  private handleMutation(entity: EntityImpl, mutationType: string): TerminalEffectResult {
    const agentName = this.getAgentName(entity);

    this.emitEvent('magic:mutation', entity.id, { agentName, mutationType });

    return {
      handled: true,
      entityRemoved: false,
      transformation: mutationType,
      description: `${agentName} has mutated (${mutationType})`,
    };
  }
}

/**
 * Create and initialize a terminal effect handler.
 */
export function createTerminalEffectHandler(world: World): TerminalEffectHandler {
  const handler = new TerminalEffectHandler(world);
  handler.initialize(world.eventBus);
  return handler;
}
