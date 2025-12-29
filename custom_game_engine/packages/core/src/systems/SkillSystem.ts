/**
 * SkillSystem - Manages skill XP gain and level progression
 *
 * Listens to game events and awards XP to appropriate skills:
 *
 * Building:
 * - building:complete → 20 XP
 * - construction:started → 5 XP
 *
 * Farming:
 * - harvest:completed → 10 XP
 * - seed:planted → 2 XP
 * - action:till → 3 XP
 * - action:water → 2 XP
 * - action:fertilize → 4 XP
 * - seed:gathered → 3-8 XP (based on count)
 *
 * Gathering:
 * - resource:gathered → 2-10 XP (based on amount)
 *   + If source is a plant (berry bush, etc.): also grants 1-3 farming XP
 *
 * Crafting:
 * - crafting:completed → 5+ XP (based on quantity)
 *
 * Cooking:
 * - cooking:completed → recipe XP
 *
 * Social:
 * - conversation:utterance → 1 XP (per line spoken)
 * - conversation:ended → 2-10 XP (completion bonus)
 * - trade:buy → 5 XP
 * - trade:sell → 5 XP
 * - call_meeting goal → 8 XP
 * - attend_meeting goal → 3 XP
 *
 * Exploration:
 * - exploration:milestone → 15 XP
 * - navigation:arrived → 2 XP
 *
 * Animal Handling:
 * - animal_tamed → 30 XP
 * - agent:housed_animal → 10 XP
 *
 * Based on skill-system/spec.md Phase 1
 */

import type { World } from '../ecs/World.js';
import type { System } from '../ecs/System.js';
import type { EventBus } from '../events/EventBus.js';
import type { Entity } from '../ecs/Entity.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { EntityId } from '../types.js';
import {
  type SkillsComponent,
  type SkillId,
  type SkillLevel,
  createSkillsComponent,
  createSkillsComponentFromPersonality,
  addSkillXP,
  checkPrerequisites,
  SKILL_LEVEL_NAMES,
  SKILL_NAMES,
} from '../components/SkillsComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';

/**
 * SkillSystem manages skill progression through XP gain.
 */
export class SkillSystem implements System {
  public readonly id = 'skill' as const;
  public readonly priority = 200; // Run after most game systems
  public readonly requiredComponents = [] as const;

  private world: World | null = null;

  /**
   * Initialize and subscribe to XP-granting events.
   */
  initialize(world: World, _eventBus: EventBus): void {
    this.world = world;

    // Building XP - use entityId if available (builder reference)
    world.eventBus.subscribe('building:complete', (event) => {
      // entityId may contain the builder agent's id
      const builderId = event.data.entityId;
      if (builderId) {
        // Complex buildings give more XP
        const baseXP = 20;
        this.awardXP(builderId, 'building', baseXP, 'building:complete');
      }
    });

    // Farming XP - harvest
    world.eventBus.subscribe('harvest:completed', (event) => {
      const baseXP = 10;
      this.awardXP(event.data.agentId, 'farming', baseXP, 'harvest:completed');
    });

    // Farming XP - planting
    world.eventBus.subscribe('seed:planted', (event) => {
      const baseXP = 2;
      this.awardXP(event.data.actorId, 'farming', baseXP, 'seed:planted');
    });

    // Gathering XP + Farming XP for plant-based resources
    world.eventBus.subscribe('resource:gathered', (event) => {
      const amount = event.data.amount ?? 1;
      const baseXP = Math.min(10, 2 + Math.floor(amount / 2));
      this.awardXP(event.data.agentId, 'gathering', baseXP, 'resource:gathered');

      // Check if harvesting from a plant (berry bush, etc.) - grants small farming XP
      // This represents learning about plant growth, food sources, and botanical knowledge
      if (event.data.sourceEntityId) {
        const sourceEntity = world.getEntity(event.data.sourceEntityId);
        if (sourceEntity?.components.has('plant')) {
          // Smaller XP than gathering - foraging wild plants teaches basic farming concepts
          const farmingXP = Math.min(3, 1 + Math.floor(amount / 5));
          this.awardXP(event.data.agentId, 'farming', farmingXP, 'resource:gathered:plant');
        }
      }
    });

    // Crafting XP (non-food crafting)
    world.eventBus.subscribe('crafting:completed', (event) => {
      // Base XP scales with quantity
      const produced = event.data.produced;
      const totalQuantity = produced.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
      const baseXP = 5 + Math.floor(totalQuantity * 2);
      this.awardXP(event.data.agentId, 'crafting', baseXP, 'crafting:completed');
    });

    // Cooking XP
    world.eventBus.subscribe('cooking:completed', (event) => {
      const baseXP = event.data.xpGained ?? 10;
      this.awardXP(event.data.agentId, 'cooking', baseXP, 'cooking:completed');
    });

    // Social XP - each utterance (small XP per line spoken)
    world.eventBus.subscribe('conversation:utterance', (event) => {
      const speakerId = event.data.speaker ?? event.data.speakerId;
      if (speakerId) {
        const baseXP = 1; // Small XP per line
        this.awardXP(speakerId, 'social', baseXP, 'conversation:utterance');
      }
    });

    // Social XP - conversation completion bonus
    world.eventBus.subscribe('conversation:ended', (event) => {
      const duration = event.data.duration ?? 1;
      const baseXP = Math.min(10, 2 + Math.floor(duration / 10));
      // Award to all participants
      for (const participantId of event.data.participants) {
        this.awardXP(participantId, 'social', baseXP, 'conversation:ended');
      }
    });

    // Exploration XP
    world.eventBus.subscribe('exploration:milestone', (event) => {
      const baseXP = 15;
      this.awardXP(event.data.agentId, 'exploration', baseXP, 'exploration:milestone');
    });

    // Animal Handling XP - taming
    world.eventBus.subscribe('animal_tamed', (event) => {
      const baseXP = 30;
      const agentId = event.data.tamerId ?? event.data.agentId;
      if (agentId) {
        this.awardXP(agentId, 'animal_handling', baseXP, 'animal_tamed');
      }
    });

    // Animal Handling XP - housing
    world.eventBus.subscribe('agent:housed_animal', (event) => {
      const baseXP = 10;
      this.awardXP(event.data.agentId, 'animal_handling', baseXP, 'agent:housed_animal');
    });

    // === Additional Farming Actions ===

    // Farming XP - tilling
    world.eventBus.subscribe('action:till', (event) => {
      const agentId = event.data.agentId ?? event.data.actorId;
      if (agentId) {
        const baseXP = 3;
        this.awardXP(agentId, 'farming', baseXP, 'action:till');
      }
    });

    // Farming XP - watering
    world.eventBus.subscribe('action:water', (event) => {
      const agentId = event.data.agentId;
      if (agentId) {
        const baseXP = 2;
        this.awardXP(agentId, 'farming', baseXP, 'action:water');
      }
    });

    // Farming XP - fertilizing
    world.eventBus.subscribe('action:fertilize', (event) => {
      const agentId = event.data.agentId;
      if (agentId) {
        const baseXP = 4;
        this.awardXP(agentId, 'farming', baseXP, 'action:fertilize');
      }
    });

    // Farming XP - gathering seeds
    world.eventBus.subscribe('seed:gathered', (event) => {
      const agentId = event.data.agentId ?? event.data.actorId;
      if (agentId) {
        const seedCount = event.data.seedCount ?? 1;
        const baseXP = 3 + Math.floor(seedCount / 2);
        this.awardXP(agentId, 'farming', baseXP, 'seed:gathered');
      }
    });

    // === Trading / Economy ===

    // Social XP - buying (negotiation)
    world.eventBus.subscribe('trade:buy', (event) => {
      const baseXP = 5;
      this.awardXP(event.data.buyerId, 'social', baseXP, 'trade:buy');
    });

    // Social XP - selling (negotiation)
    world.eventBus.subscribe('trade:sell', (event) => {
      const baseXP = 5;
      this.awardXP(event.data.sellerId, 'social', baseXP, 'trade:sell');
    });

    // === Exploration ===

    // Exploration XP - arriving at navigation destinations
    world.eventBus.subscribe('navigation:arrived', (event) => {
      const baseXP = 2;
      this.awardXP(event.data.agentId, 'exploration', baseXP, 'navigation:arrived');
    });

    // === Social ===

    // Social XP - calling meetings (leadership)
    world.eventBus.subscribe('behavior:goal_achieved', (event) => {
      if (event.data.behavior === 'call_meeting') {
        const baseXP = 8;
        this.awardXP(event.data.agentId, 'social', baseXP, 'call_meeting');
      }
      if (event.data.behavior === 'attend_meeting') {
        const baseXP = 3;
        this.awardXP(event.data.agentId, 'social', baseXP, 'attend_meeting');
      }
    });

    // === Building ===

    // Building XP - construction started (smaller XP, main XP on complete)
    world.eventBus.subscribe('construction:started', (event) => {
      const agentId = event.data.entityId;
      if (agentId) {
        const baseXP = 5;
        this.awardXP(agentId, 'building', baseXP, 'construction:started');
      }
    });

    // Medicine XP - could be added when healing system exists
    // Combat XP - could be added when combat system exists
  }

  /**
   * Award XP to an agent's skill.
   * Enforces skill tree prerequisites - agents can't gain XP in locked skills.
   */
  private awardXP(
    agentId: EntityId,
    skillId: SkillId,
    baseXP: number,
    source: string
  ): void {
    if (!this.world) {
      throw new Error('SkillSystem not initialized');
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return; // Entity may have been destroyed
    }

    // Get or create skills component
    const skills = this.getOrCreateSkills(entity as EntityImpl);

    // Check skill tree prerequisites
    // If skill is at level 0 and prerequisites aren't met, don't award XP
    if (skills.levels[skillId] === 0) {
      const prereqCheck = checkPrerequisites(skills, skillId);
      if (!prereqCheck.met) {
        // Skill is locked - can't gain XP until prerequisites are met
        return;
      }
    }

    // Add XP and check for level up
    const result = addSkillXP(skills, skillId, baseXP);

    // Update the component
    (entity as EntityImpl).updateComponent<SkillsComponent>('skills', () => result.component);

    // Emit XP gain event immediately (handlers may be listening during event processing)
    this.world.eventBus.emitImmediate({
      type: 'skill:xp_gain',
      source: 'skill-system',
      data: {
        agentId,
        skillId,
        amount: baseXP,
        source,
      },
    });

    // Emit level up event if applicable
    if (result.leveledUp) {
      const oldLevel = (skills.levels[skillId] ?? 0) as SkillLevel;
      this.world.eventBus.emitImmediate({
        type: 'skill:level_up',
        source: 'skill-system',
        data: {
          agentId,
          skillId,
          oldLevel,
          newLevel: result.newLevel,
        },
      });

      // Show notification
      this.world.eventBus.emitImmediate({
        type: 'notification:show',
        source: 'skill-system',
        data: {
          message: `${SKILL_NAMES[skillId]} increased to ${SKILL_LEVEL_NAMES[result.newLevel]}!`,
          type: 'success',
          duration: 3000,
        },
      });
    }
  }

  /**
   * Get or create skills component for an entity.
   */
  private getOrCreateSkills(entity: EntityImpl): SkillsComponent {
    let skills = entity.getComponent<SkillsComponent>('skills');
    if (!skills) {
      // Check if entity has personality for affinity generation
      const personality = entity.getComponent<PersonalityComponent>('personality');
      if (personality) {
        skills = createSkillsComponentFromPersonality(personality);
      } else {
        skills = createSkillsComponent();
      }
      entity.addComponent(skills);
    }
    return skills;
  }

  /**
   * System update - no per-tick processing needed.
   * All XP gain is event-driven.
   */
  update(_world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // No per-tick updates - all logic is event-driven
  }
}
