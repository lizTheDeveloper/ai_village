/**
 * MilestoneSystem - Detects and awards player progression milestones
 *
 * Listens for events that indicate milestone progress and awards milestones
 * when conditions are met.
 *
 * Key milestone: post_temporal_multiversal - unlocks angel bifurcation
 * Requires:
 * - first_temporal_trade: Trade with own past (forked timeline)
 * - first_cross_universe_trade: Trade with another universe
 * - Angel bond threshold (40+ hours OR 500+ messages)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl, createEntityId } from '../ecs/Entity.js';
import {
  type MilestoneComponent,
  type MilestoneId,
  createMilestoneComponent,
  hasMilestone,
  awardMilestone,
  checkPostTemporalStatus,
} from '../components/MilestoneComponent.js';
import type { AdminAngelComponent } from '../components/AdminAngelComponent.js';
import type { TradeScope } from '../trade/TradeAgreementTypes.js';

// ============================================================================
// System
// ============================================================================

export class MilestoneSystem extends BaseSystem {
  public readonly id: SystemId = 'milestone';
  public readonly priority: number = 860; // After admin angel, before metrics
  public readonly requiredComponents: ReadonlyArray<CT> = [];
  public readonly activationComponents = [CT.Milestone] as const;
  protected readonly throttleInterval = 100; // Check every 5 seconds

  private milestoneEntityId: string | null = null;
  private lastBifurcationCheck = 0;

  /**
   * Get or create the milestone tracking entity
   */
  private getOrCreateMilestoneEntity(world: World): Entity {
    // Check cache
    if (this.milestoneEntityId) {
      const existing = world.getEntity(this.milestoneEntityId);
      if (existing) return existing;
      this.milestoneEntityId = null;
    }

    // Find existing
    const entities = world.query().with(CT.Milestone).executeEntities();
    if (entities.length > 0) {
      this.milestoneEntityId = entities[0]!.id;
      return entities[0]!;
    }

    // Create new
    const entity = new EntityImpl(createEntityId(), world.tick);
    entity.addComponent(createMilestoneComponent());
    world.addEntity(entity);
    this.milestoneEntityId = entity.id;

    return entity;
  }

  /**
   * Get admin angel component (if exists)
   */
  private getAdminAngel(world: World): { entity: Entity; component: AdminAngelComponent } | null {
    const angels = world.query().with(CT.AdminAngel).executeEntities();
    if (angels.length === 0) return null;

    const entity = angels[0]!;
    const component = entity.getComponent(CT.AdminAngel) as AdminAngelComponent | undefined;
    if (!component) return null;

    return { entity, component };
  }

  /**
   * Calculate angel bond hours from component data
   */
  private calculateAngelBondHours(angel: AdminAngelComponent, currentTick: number): number {
    const ticksPerSecond = 20;
    const secondsPerHour = 3600;
    const totalTicks = angel.memory.playerKnowledge.totalPlaytime;
    return totalTicks / ticksPerSecond / secondsPerHour;
  }

  /**
   * Award a milestone and emit event
   */
  private award(
    world: World,
    milestone: MilestoneComponent,
    milestoneId: MilestoneId,
    tick: number,
    context?: Record<string, unknown>
  ): void {
    if (awardMilestone(milestone, milestoneId, tick, context)) {
      world.eventBus.emit({
        type: 'milestone:achieved',
        data: { milestoneId, tick, context },
        source: 'milestone_system',
      });
    }
  }

  /**
   * Check and award post-temporal status if qualified
   */
  private checkPostTemporalMilestone(
    world: World,
    milestone: MilestoneComponent,
    tick: number
  ): void {
    // Already achieved?
    if (hasMilestone(milestone, 'post_temporal_multiversal')) return;

    // Get angel bond stats
    const angel = this.getAdminAngel(world);
    if (!angel) return;

    const bondHours = this.calculateAngelBondHours(angel.component, tick);
    const messageCount = angel.component.memory.relationship.messageCount;

    const status = checkPostTemporalStatus(milestone, bondHours, messageCount);

    if (status.qualified) {
      // Award the milestone
      this.award(world, milestone, 'post_temporal_multiversal', tick, {
        bondHours,
        messageCount,
      });

      // Emit special event for angel bifurcation
      world.eventBus.emit({
        type: 'milestone:post_temporal_multiversal',
        data: {
          tick,
          angelBondHours: bondHours,
          angelMessageCount: messageCount,
        },
        source: 'milestone_system',
      });

      // Notify angel of bifurcation availability
      world.eventBus.emit({
        type: 'angel:bifurcation_available',
        data: {
          angelId: angel.entity.id,
          angelName: angel.component.name,
        },
        source: 'milestone_system',
      });
    }
  }

  /**
   * Initialize event listeners
   */
  public onInit(world: World): void {
    // Listen for trade agreements to detect trade milestones
    world.eventBus.on('trade_agreement:accepted', (event) => {
      const data = event.data as {
        agreementId: string;
        scope?: TradeScope;
      };

      const entity = this.getOrCreateMilestoneEntity(world);
      const milestone = entity.getComponent(CT.Milestone) as MilestoneComponent | undefined;
      if (!milestone) return;

      const tick = Number(world.tick);

      // Determine milestone based on scope
      switch (data.scope) {
        case 'local':
          this.award(world, milestone, 'first_local_trade', tick, { agreementId: data.agreementId });
          break;
        case 'inter_village':
          this.award(world, milestone, 'first_inter_village_trade', tick, { agreementId: data.agreementId });
          break;
        case 'cross_timeline':
          this.award(world, milestone, 'first_temporal_trade', tick, { agreementId: data.agreementId });
          // Check if this completes post-temporal status
          this.checkPostTemporalMilestone(world, milestone, tick);
          break;
        case 'cross_universe':
          this.award(world, milestone, 'first_cross_universe_trade', tick, { agreementId: data.agreementId });
          // Check if this completes post-temporal status
          this.checkPostTemporalMilestone(world, milestone, tick);
          break;
        case 'cross_multiverse':
          this.award(world, milestone, 'first_cross_multiverse_trade', tick, { agreementId: data.agreementId });
          break;
      }
    });

    // Listen for building completion
    world.eventBus.on('building:completed', (event) => {
      const entity = this.getOrCreateMilestoneEntity(world);
      const milestone = entity.getComponent(CT.Milestone) as MilestoneComponent | undefined;
      if (!milestone) return;

      this.award(world, milestone, 'first_building_completed', Number(world.tick));
    });

    // Listen for research completion
    world.eventBus.on('research:completed', (event) => {
      const entity = this.getOrCreateMilestoneEntity(world);
      const milestone = entity.getComponent(CT.Milestone) as MilestoneComponent | undefined;
      if (!milestone) return;

      this.award(world, milestone, 'first_research_completed', Number(world.tick));
    });

    // Listen for agent death
    world.eventBus.on('agent:death', (event) => {
      const entity = this.getOrCreateMilestoneEntity(world);
      const milestone = entity.getComponent(CT.Milestone) as MilestoneComponent | undefined;
      if (!milestone) return;

      this.award(world, milestone, 'first_agent_death_witnessed', Number(world.tick));
    });

    // Listen for magic learned
    world.eventBus.on('magic:spell_learned', (event) => {
      const entity = this.getOrCreateMilestoneEntity(world);
      const milestone = entity.getComponent(CT.Milestone) as MilestoneComponent | undefined;
      if (!milestone) return;

      this.award(world, milestone, 'first_magic_learned', Number(world.tick));
    });
  }

  /**
   * Periodic check for time-based milestones
   */
  protected onUpdate(ctx: SystemContext): void {
    const entity = this.getOrCreateMilestoneEntity(ctx.world);
    const milestone = entity.getComponent(CT.Milestone) as MilestoneComponent | undefined;
    if (!milestone) return;

    // Update playtime
    const angel = this.getAdminAngel(ctx.world);
    if (angel) {
      // Track playtime through angel bond
      milestone.totalPlaytimeTicks = Number(ctx.tick) - milestone.firstSessionTick;
    }

    // Periodically check for post-temporal status (in case bond threshold reached)
    const ticksSinceLastCheck = Number(ctx.tick) - this.lastBifurcationCheck;
    if (ticksSinceLastCheck >= 1200) { // Every minute
      this.lastBifurcationCheck = Number(ctx.tick);
      this.checkPostTemporalMilestone(ctx.world, milestone, Number(ctx.tick));
    }
  }
}
