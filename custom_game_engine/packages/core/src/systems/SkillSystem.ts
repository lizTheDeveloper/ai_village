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

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { EventBus } from '../events/EventBus.js';
import type { World } from '../ecs/World.js';
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
import type { AgentComponent } from '../components/AgentComponent.js';
import { syncPrioritiesWithSkills } from '../components/AgentComponent.js';

/**
 * SkillSystem manages skill progression through XP gain.
 */
export class SkillSystem extends BaseSystem {
  public readonly id = 'skill' as const;
  public readonly priority = 200; // Run after most game systems
  public readonly requiredComponents = [] as const;
  protected readonly throttleInterval = 20; // NORMAL - 1 second

  /**
   * Initialize and subscribe to XP-granting events.
   */
  protected async onInitialize(world: World, eventBus: EventBus): Promise<void> {

    // Building XP - use entityId if available (builder reference)
    this.events.on('building:complete', (data) => {
      // entityId may contain the builder agent's id
      const builderId = data.entityId;
      if (builderId) {
        // Complex buildings give more XP
        const baseXP = 20;
        this.awardXP(builderId, CT.Building, baseXP, 'building:complete');
      }
    });

    // Farming XP - harvest
    this.events.on('harvest:completed', (data) => {
      const baseXP = 10;
      this.awardXP(data.agentId, 'farming', baseXP, 'harvest:completed');
    });

    // Farming XP - planting
    this.events.on('seed:planted', (data) => {
      const baseXP = 2;
      this.awardXP(data.actorId, 'farming', baseXP, 'seed:planted');
    });

    // Gathering XP + Farming XP for plant-based resources
    this.events.on('resource:gathered', (data) => {
      const amount = data.amount ?? 1;
      const baseXP = Math.min(10, 2 + Math.floor(amount / 2));
      this.awardXP(data.agentId, 'gathering', baseXP, 'resource:gathered');

      // Check if harvesting from a plant (berry bush, etc.) - grants small farming XP
      // This represents learning about plant growth, food sources, and botanical knowledge
      if (data.sourceEntityId) {
        const sourceEntity = world.getEntity(data.sourceEntityId);
        if (sourceEntity?.components.has(CT.Plant)) {
          // Smaller XP than gathering - foraging wild plants teaches basic farming concepts
          const farmingXP = Math.min(3, 1 + Math.floor(amount / 5));
          this.awardXP(data.agentId, 'farming', farmingXP, 'resource:gathered:plant');
        }
      }
    });

    // Crafting XP (non-food crafting)
    this.events.on('crafting:completed', (data) => {
      // Base XP scales with quantity
      const produced = data.produced;
      const totalQuantity = produced.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
      const baseXP = 5 + Math.floor(totalQuantity * 2);
      this.awardXP(data.agentId, 'crafting', baseXP, 'crafting:completed');
    });

    // Cooking XP
    this.events.on('cooking:completed', (data) => {
      const baseXP = data.xpGained ?? 10;
      this.awardXP(data.agentId, 'cooking', baseXP, 'cooking:completed');
    });

    // Social XP - each utterance (small XP per line spoken)
    this.events.on('conversation:utterance', (data) => {
      const speakerId = data.speaker ?? data.speakerId;
      if (speakerId) {
        const baseXP = 1; // Small XP per line
        this.awardXP(speakerId, 'social', baseXP, 'conversation:utterance');
      }
    });

    // Social XP - conversation completion bonus
    this.events.on('conversation:ended', (data) => {
      const duration = data.duration ?? 1;
      const baseXP = Math.min(10, 2 + Math.floor(duration / 10));
      // Award to all participants
      for (const participantId of data.participants) {
        this.awardXP(participantId, 'social', baseXP, 'conversation:ended');
      }
    });

    // Exploration XP
    this.events.on('exploration:milestone', (data) => {
      const baseXP = 15;
      this.awardXP(data.agentId, 'exploration', baseXP, 'exploration:milestone');
    });

    // Animal Handling XP - taming
    this.events.on('animal_tamed', (data) => {
      const baseXP = 30;
      const agentId = data.tamerId ?? data.agentId;
      if (agentId) {
        this.awardXP(agentId, 'animal_handling', baseXP, 'animal_tamed');
      }
    });

    // Animal Handling XP - housing
    this.events.on('agent:housed_animal', (data) => {
      const baseXP = 10;
      this.awardXP(data.agentId, 'animal_handling', baseXP, 'agent:housed_animal');
    });

    // === Additional Farming Actions ===

    // Farming XP - tilling
    this.events.on('action:till', (data) => {
      const agentId = data.agentId ?? data.actorId;
      if (agentId) {
        const baseXP = 3;
        this.awardXP(agentId, 'farming', baseXP, 'action:till');
      }
    });

    // Farming XP - watering
    this.events.on('action:water', (data) => {
      const agentId = data.agentId;
      if (agentId) {
        const baseXP = 2;
        this.awardXP(agentId, 'farming', baseXP, 'action:water');
      }
    });

    // Farming XP - fertilizing
    this.events.on('action:fertilize', (data) => {
      const agentId = data.agentId;
      if (agentId) {
        const baseXP = 4;
        this.awardXP(agentId, 'farming', baseXP, 'action:fertilize');
      }
    });

    // Farming XP - gathering seeds
    this.events.on('seed:gathered', (data) => {
      const agentId = data.agentId ?? data.actorId;
      if (agentId) {
        const seedCount = data.seedCount ?? 1;
        const baseXP = 3 + Math.floor(seedCount / 2);
        this.awardXP(agentId, 'farming', baseXP, 'seed:gathered');
      }
    });

    // === Trading / Economy ===

    // Social XP - buying (negotiation)
    this.events.on('trade:buy', (data) => {
      const baseXP = 5;
      this.awardXP(data.buyerId, 'social', baseXP, 'trade:buy');
    });

    // Social XP - selling (negotiation)
    this.events.on('trade:sell', (data) => {
      const baseXP = 5;
      this.awardXP(data.sellerId, 'social', baseXP, 'trade:sell');
    });

    // === Exploration ===

    // Exploration XP - arriving at navigation destinations
    this.events.on('navigation:arrived', (data) => {
      const baseXP = 2;
      this.awardXP(data.agentId, 'exploration', baseXP, 'navigation:arrived');
    });

    // === Social ===

    // Social XP - calling meetings (leadership)
    this.events.on('behavior:goal_achieved', (data) => {
      if (data.behavior === 'call_meeting') {
        const baseXP = 8;
        this.awardXP(data.agentId, 'social', baseXP, 'call_meeting');
      }
      if (data.behavior === 'attend_meeting') {
        const baseXP = 3;
        this.awardXP(data.agentId, 'social', baseXP, 'attend_meeting');
      }
    });

    // === Building ===

    // Building XP - construction started (smaller XP, main XP on complete)
    this.events.on('construction:started', (data) => {
      const agentId = data.entityId;
      if (agentId) {
        const baseXP = 5;
        this.awardXP(agentId, CT.Building, baseXP, 'construction:started');
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
    (entity as EntityImpl).updateComponent<SkillsComponent>(CT.Skills, () => result.component);

    // Type-safe emission - compile error if data shape is wrong
    this.events.emitImmediate('skill:xp_gain', {
      agentId,
      skillId,
      amount: baseXP,
      source,
    });

    // Emit level up event if applicable
    if (result.leveledUp) {
      const oldLevel = (skills.levels[skillId] ?? 0) as SkillLevel;
      this.events.emitImmediate('skill:level_up', {
        agentId,
        skillId,
        oldLevel,
        newLevel: result.newLevel,
      });

      // Sync agent priorities with new skill levels
      // This ensures agents naturally prefer activities they're skilled in
      const entityImpl = entity as EntityImpl;
      const agent = entityImpl.getComponent<AgentComponent>(CT.Agent);
      if (agent) {
        entityImpl.updateComponent<AgentComponent>(
          CT.Agent,
          (current) => syncPrioritiesWithSkills(current, result.component)
        );
      }

      // Show notification
      this.events.emitImmediate('notification:show', {
        message: `${SKILL_NAMES[skillId]} increased to ${SKILL_LEVEL_NAMES[result.newLevel]}!`,
        type: 'success',
        duration: 3000,
      });
    }
  }

  /**
   * Get or create skills component for an entity.
   */
  private getOrCreateSkills(entity: EntityImpl): SkillsComponent {
    let skills = entity.getComponent<SkillsComponent>(CT.Skills);
    if (!skills) {
      // Check if entity has personality for affinity generation
      const personality = entity.getComponent<PersonalityComponent>(CT.Personality);
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
  protected onUpdate(_ctx: SystemContext): void {
    // No per-tick updates - all logic is event-driven
  }
}
