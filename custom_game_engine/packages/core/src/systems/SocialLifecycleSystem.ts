/**
 * SocialLifecycleSystem - Triggers biochemistry-driven social reactions
 * to major lifecycle events (death, birth, age milestones).
 *
 * Nearby Norns react emotionally to:
 * - Death: sadness spike, mourning pause, farewell speech
 * - Birth: happiness/curiosity spike, approach behavior, greeting
 * - Age milestones: happiness spike, acknowledgment
 *
 * Reactions scale with social bond strength and observer age category.
 *
 * Priority: 135 (after NeedsSystem 15, BiochemistrySystem 46, MoodSystem 48,
 *           MemoryFormation ~120, before higher cognition systems)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { BiochemistryComponent } from '../components/BiochemistryComponent.js';
import type { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import type { SocialMemoryComponent } from '../components/SocialMemoryComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { AgentComponent, AgeCategory } from '../components/AgentComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';

// Social reaction range (tiles) — matches AgentBrainSystem SOCIAL_BEHAVIOR_RANGE
const SOCIAL_REACTION_RANGE = 15;

// Chemical boost amounts for lifecycle reactions
const MOURNING_CORTISOL_BOOST = 0.3;
const MOURNING_SEROTONIN_PENALTY = 0.15;
const BIRTH_OXYTOCIN_BOOST = 0.2;
const BIRTH_DOPAMINE_BOOST = 0.15;
const MILESTONE_OXYTOCIN_BOOST = 0.1;
const MILESTONE_SEROTONIN_BOOST = 0.05;

// Mourning pause duration range (game ticks at 20 TPS)
const MOURNING_PAUSE_MIN_TICKS = 100; // 5 seconds
const MOURNING_PAUSE_MAX_TICKS = 200; // 10 seconds

// Minimum social bond sentiment to trigger mourning (not strangers)
const MOURNING_BOND_THRESHOLD = 0.1;

// Milestone age categories that trigger graduation acknowledgment
const MILESTONE_CATEGORIES: ReadonlySet<AgeCategory> = new Set(['teen', 'adult', 'elder']);

interface PendingMourningPause {
  entityId: string;
  endTick: number;
  previousBehavior: string;
}

export class SocialLifecycleSystem extends BaseSystem {
  public readonly id = 'social_lifecycle' as const;
  public readonly priority = 135;
  public readonly requiredComponents = [CT.Agent] as const;
  public readonly activationComponents = [CT.Agent] as const;
  protected readonly throttleInterval = 20; // 1 second at 20 TPS

  public readonly metadata = {
    category: 'social' as const,
    description: 'Triggers social reactions to lifecycle events (death, birth, age milestones)',
    readsComponents: [CT.Agent, CT.Position, CT.Biochemistry, CT.EpisodicMemory, CT.SocialMemory, CT.Identity],
    writesComponents: [CT.Biochemistry, CT.EpisodicMemory],
  };

  // Pending death reactions (position of death + deceased info)
  private pendingDeathReactions: Array<{
    deceasedId: string;
    deceasedName: string;
    position: { x: number; y: number } | null;
    tick: number;
  }> = [];

  // Pending birth reactions
  private pendingBirthReactions: Array<{
    babyId: string;
    babyName: string;
    position: { x: number; y: number } | null;
    tick: number;
  }> = [];

  // Pending age milestone reactions
  private pendingMilestoneReactions: Array<{
    agentId: string;
    newCategory: AgeCategory;
    tick: number;
  }> = [];

  // Active mourning pauses
  private mourningPauses: Map<string, PendingMourningPause> = new Map();

  protected override onInitialize(world: WorldMutator, eventBus: EventBus): void {
    // Death events
    this.events.on('agent:died', (data) => {
      const entity = world.getEntity(data.entityId);
      const position = entity?.getComponent<PositionComponent>(CT.Position);
      this.pendingDeathReactions.push({
        deceasedId: data.entityId,
        deceasedName: data.name,
        position: position ? { x: position.x, y: position.y } : null,
        tick: world.tick,
      });
    });

    this.events.on('agent:death', (data) => {
      // Avoid duplicates if both events fire for the same agent
      if (this.pendingDeathReactions.some(r => r.deceasedId === data.agentId)) return;
      this.pendingDeathReactions.push({
        deceasedId: data.agentId,
        deceasedName: data.agentName ?? 'someone',
        position: data.position ?? null,
        tick: data.tick ?? world.tick,
      });
    });

    // Birth events
    this.events.on('agent:birth', (data) => {
      const entity = world.getEntity(data.agentId);
      const position = entity?.getComponent<PositionComponent>(CT.Position);
      this.pendingBirthReactions.push({
        babyId: data.agentId,
        babyName: data.name,
        position: position ? { x: position.x, y: position.y } : null,
        tick: world.tick,
      });
    });

    this.events.on('agent:born', (data) => {
      if (this.pendingBirthReactions.some(r => r.babyId === data.agentId)) return;
      this.pendingBirthReactions.push({
        babyId: data.agentId,
        babyName: data.agentName ?? 'a new one',
        position: null,
        tick: world.tick,
      });
    });

    // Age milestone events
    this.events.on('agent:age_milestone', (data) => {
      if (!MILESTONE_CATEGORIES.has(data.newCategory)) return;
      this.pendingMilestoneReactions.push({
        agentId: data.agentId,
        newCategory: data.newCategory,
        tick: data.tick,
      });
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    // Process pending death reactions
    for (const death of this.pendingDeathReactions) {
      this.processDeathReaction(ctx, death);
    }
    this.pendingDeathReactions.length = 0;

    // Process pending birth reactions
    for (const birth of this.pendingBirthReactions) {
      this.processBirthReaction(ctx, birth);
    }
    this.pendingBirthReactions.length = 0;

    // Process pending milestone reactions
    for (const milestone of this.pendingMilestoneReactions) {
      this.processMilestoneReaction(ctx, milestone);
    }
    this.pendingMilestoneReactions.length = 0;

    // Release mourning pauses that have expired
    this.releaseMourningPauses(ctx);
  }

  // ---------------------------------------------------------------------------
  // Death / Mourning
  // ---------------------------------------------------------------------------

  private processDeathReaction(
    ctx: SystemContext,
    death: { deceasedId: string; deceasedName: string; position: { x: number; y: number } | null; tick: number }
  ): void {
    if (!death.position) return;

    const nearby = ctx.getNearbyEntities(
      death.position,
      SOCIAL_REACTION_RANGE,
      [CT.Agent],
      { excludeIds: new Set([death.deceasedId]) }
    );

    for (const { entity } of nearby) {
      // Check social bond
      const socialMem = entity.getComponent<SocialMemoryComponent>(CT.SocialMemory);
      const bondMemory = socialMem?.socialMemories?.get(death.deceasedId);

      // Only mourn if there's a meaningful bond
      if (!bondMemory || bondMemory.overallSentiment < MOURNING_BOND_THRESHOLD) continue;

      const biochem = entity.getComponent<BiochemistryComponent>(CT.Biochemistry);
      const agent = entity.getComponent<AgentComponent>(CT.Agent);
      const identity = entity.getComponent<IdentityComponent>(CT.Identity);

      // Sadness chemical spike — scale with bond strength
      if (biochem) {
        const bondScale = Math.min(1, bondMemory.overallSentiment + 0.5);
        biochem.cortisol = Math.min(1, biochem.cortisol + MOURNING_CORTISOL_BOOST * bondScale);
        biochem.serotonin = Math.max(0, biochem.serotonin - MOURNING_SEROTONIN_PENALTY * bondScale);
      }

      // Episodic memory
      const episodicMem = entity.getComponent<EpisodicMemoryComponent>(CT.EpisodicMemory);
      if (episodicMem) {
        episodicMem.formMemory({
          eventType: 'lifecycle:death_witnessed',
          summary: `I lost ${death.deceasedName}. The world feels smaller.`,
          timestamp: ctx.tick,
          participants: [death.deceasedId],
          location: death.position,
          emotionalValence: -0.8,
          emotionalIntensity: 0.9,
          surprise: 0.6,
          importance: 0.9,
          socialSignificance: 0.9,
          survivalRelevance: 0.3,
        });
      }

      // Mourning pause — stop current action briefly
      if (agent && !this.mourningPauses.has(entity.id)) {
        const pauseDuration = MOURNING_PAUSE_MIN_TICKS +
          Math.floor(Math.random() * (MOURNING_PAUSE_MAX_TICKS - MOURNING_PAUSE_MIN_TICKS));
        this.mourningPauses.set(entity.id, {
          entityId: entity.id,
          endTick: ctx.tick + pauseDuration,
          previousBehavior: agent.behavior,
        });
      }

      // Speech for teens and older (rough proxy for "Spoken" tier)
      const ageCategory = agent?.ageCategory ?? 'adult';
      if (ageCategory !== 'child') {
        ctx.emit('agent:speak', {
          agentId: entity.id,
          text: `Goodbye, ${death.deceasedName}...`,
          category: 'monologue',
          tick: ctx.tick,
        }, entity.id);
      }

      // Emote for all
      ctx.emit('agent:emote', {
        agentId: entity.id,
        emoteText: 'mourns quietly',
        emoteType: 'expression',
        glyph: '😢',
        tick: ctx.tick,
      }, entity.id);
    }
  }

  // ---------------------------------------------------------------------------
  // Birth / Celebration
  // ---------------------------------------------------------------------------

  private processBirthReaction(
    ctx: SystemContext,
    birth: { babyId: string; babyName: string; position: { x: number; y: number } | null; tick: number }
  ): void {
    if (!birth.position) return;

    const nearby = ctx.getNearbyEntities(
      birth.position,
      SOCIAL_REACTION_RANGE,
      [CT.Agent],
      { excludeIds: new Set([birth.babyId]) }
    );

    for (const { entity } of nearby) {
      const biochem = entity.getComponent<BiochemistryComponent>(CT.Biochemistry);
      const agent = entity.getComponent<AgentComponent>(CT.Agent);

      // Happiness and curiosity chemical spike
      if (biochem) {
        biochem.oxytocin = Math.min(1, biochem.oxytocin + BIRTH_OXYTOCIN_BOOST);
        biochem.dopamine = Math.min(1, biochem.dopamine + BIRTH_DOPAMINE_BOOST);
      }

      // Episodic memory
      const episodicMem = entity.getComponent<EpisodicMemoryComponent>(CT.EpisodicMemory);
      if (episodicMem) {
        episodicMem.formMemory({
          eventType: 'lifecycle:birth_witnessed',
          summary: `A new one arrived — ${birth.babyName}.`,
          timestamp: ctx.tick,
          participants: [birth.babyId],
          location: birth.position,
          emotionalValence: 0.7,
          emotionalIntensity: 0.6,
          surprise: 0.5,
          importance: 0.7,
          socialSignificance: 0.8,
        });
      }

      // Vocalize for teens+ (proxy for "Awakened" tier and above)
      const ageCategory = agent?.ageCategory ?? 'adult';
      if (ageCategory !== 'child') {
        ctx.emit('agent:emote', {
          agentId: entity.id,
          emoteText: 'coos happily',
          emoteType: 'sound',
          glyph: '😊',
          tick: ctx.tick,
        }, entity.id);
      }

      // Speech greeting for adults+ (proxy for "Spoken" tier)
      if (ageCategory === 'adult' || ageCategory === 'elder') {
        ctx.emit('agent:speak', {
          agentId: entity.id,
          text: `Welcome, little ${birth.babyName}.`,
          category: 'monologue',
          tick: ctx.tick,
        }, entity.id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Age Milestone / Graduation
  // ---------------------------------------------------------------------------

  private processMilestoneReaction(
    ctx: SystemContext,
    milestone: { agentId: string; newCategory: AgeCategory; tick: number }
  ): void {
    const graduatingEntity = ctx.world.getEntity(milestone.agentId);
    if (!graduatingEntity) return;

    const position = graduatingEntity.getComponent<PositionComponent>(CT.Position);
    if (!position) return;

    const graduatingIdentity = graduatingEntity.getComponent<IdentityComponent>(CT.Identity);
    const graduatingName = graduatingIdentity?.name ?? 'someone';

    const nearby = ctx.getNearbyEntities(
      { x: position.x, y: position.y },
      SOCIAL_REACTION_RANGE,
      [CT.Agent],
      { excludeIds: new Set([milestone.agentId]) }
    );

    for (const { entity } of nearby) {
      // Only agents with social bonds react to graduations
      const socialMem = entity.getComponent<SocialMemoryComponent>(CT.SocialMemory);
      const bondMemory = socialMem?.socialMemories?.get(milestone.agentId);
      if (!bondMemory) continue;

      const biochem = entity.getComponent<BiochemistryComponent>(CT.Biochemistry);
      const agent = entity.getComponent<AgentComponent>(CT.Agent);

      // Brief happiness spike
      if (biochem) {
        biochem.oxytocin = Math.min(1, biochem.oxytocin + MILESTONE_OXYTOCIN_BOOST);
        biochem.serotonin = Math.min(1, biochem.serotonin + MILESTONE_SEROTONIN_BOOST);
      }

      // Episodic memory
      const episodicMem = entity.getComponent<EpisodicMemoryComponent>(CT.EpisodicMemory);
      if (episodicMem) {
        episodicMem.formMemory({
          eventType: 'lifecycle:milestone_witnessed',
          summary: `${graduatingName} changed. Something is different about them.`,
          timestamp: ctx.tick,
          participants: [milestone.agentId],
          location: { x: position.x, y: position.y },
          emotionalValence: 0.4,
          emotionalIntensity: 0.3,
          surprise: 0.4,
          importance: 0.5,
          socialSignificance: 0.6,
        });
      }

      // Speech acknowledgment for adults+ (proxy for "Learned" tier)
      const ageCategory = agent?.ageCategory ?? 'adult';
      if (ageCategory === 'adult' || ageCategory === 'elder') {
        ctx.emit('agent:speak', {
          agentId: entity.id,
          text: `${graduatingName} has grown.`,
          category: 'monologue',
          tick: ctx.tick,
        }, entity.id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Mourning Pause Management
  // ---------------------------------------------------------------------------

  private releaseMourningPauses(ctx: SystemContext): void {
    for (const [entityId, pause] of this.mourningPauses) {
      if (ctx.tick >= pause.endTick) {
        this.mourningPauses.delete(entityId);
      }
    }
  }
}
