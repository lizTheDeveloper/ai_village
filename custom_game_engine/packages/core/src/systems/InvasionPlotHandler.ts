/**
 * InvasionPlotHandler - Assigns invasion plots based on multiverse events
 *
 * This system listens for invasion events from BackgroundUniverseManager and
 * assigns appropriate epic-scale plot templates to souls/leaders experiencing
 * the invasion. It manages the narrative arc from detection through resolution.
 *
 * Integration Points:
 * - BackgroundUniverseManager: multiverse:invasion_triggered event
 * - InvasionComponent: Tracks active invasion state
 * - PlotLineRegistry: Invasion plot templates
 * - EventDrivenPlotAssignment: Plot assignment infrastructure
 * - Governor systems: Political decision-making during invasions
 *
 * Priority: 215 (after GalacticCouncilSystem 210, before metrics 900+)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type {
  InvasionComponent,
  ActiveInvasion,
  InvasionType as InvasionTypeEnum,
} from '../components/InvasionComponent.js';
import type { InvasionTriggeredEvent } from '../multiverse/BackgroundUniverseTypes.js';
import type { SoulIdentityComponent } from '../soul/SoulIdentityComponent.js';
import type { PlotLinesComponent, PlotLineInstance, PlotLineTemplate } from '../plot/PlotTypes.js';
import { plotLineRegistry } from '../plot/PlotLineRegistry.js';

/**
 * Mapping from BackgroundUniverse InvasionType to InvasionComponent type
 */
const INVASION_TYPE_MAP: Record<string, InvasionTypeEnum> = {
  'military': 'military',
  'cultural': 'cultural',
  'economic': 'economic',
  'dimensional': 'military', // Map to military for now
  'temporal': 'military',    // Map to military for now
  'viral': 'military',       // Map to military for now
  'swarm': 'military',       // Map to military for now
};

/**
 * Map invasion type to plot template ID
 */
const INVASION_PLOT_MAP: Record<string, string> = {
  'scout': 'invasion_scout_ships_detected',
  'military': 'invasion_full_military',
  'cultural': 'invasion_cultural_conquest',
  'economic': 'invasion_economic_takeover',
  'dimensional': 'invasion_dimensional_breach',
  'temporal': 'invasion_temporal_attack',
};

/**
 * InvasionPlotHandler - Assigns and manages invasion plot lines
 *
 * Workflow:
 * 1. Listen for multiverse:invasion_triggered events
 * 2. Find or create InvasionComponent on player's empire/nation
 * 3. Assign appropriate invasion plot template based on invasion type
 * 4. Track invasion progress and update plots accordingly
 * 5. Resolve plots when invasion ends
 */
export class InvasionPlotHandler extends BaseSystem {
  public readonly id: SystemId = 'invasion_plot_handler';
  public readonly priority: number = 215;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  /** Update every 100 ticks = 5 seconds */
  protected readonly throttleInterval = 100;

  /** Track invasions we've already assigned plots for */
  private processedInvasions = new Set<string>();

  /** Cached invasion plot templates */
  private invasionPlotTemplates: Map<string, PlotLineTemplate> = new Map();

  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // Load invasion plot templates
    this.loadInvasionPlotTemplates();

    // Listen for invasion triggered events using onGeneric for multiverse events
    this.events.onGeneric('multiverse:invasion_triggered', (data: unknown) => {
      this.handleInvasionTriggered(data as InvasionTriggeredEvent);
    });

    // Listen for invasion resolution events
    this.events.onGeneric('multiverse:invasion_victory', (data: unknown) => {
      const eventData = data as { invasionId: string };
      this.handleInvasionResolution(eventData.invasionId, 'victory');
    });

    this.events.onGeneric('multiverse:invasion_repelled', (data: unknown) => {
      const eventData = data as { invasionId: string };
      this.handleInvasionResolution(eventData.invasionId, 'repelled');
    });

    this.events.onGeneric('multiverse:invasion_failed', (data: unknown) => {
      const eventData = data as { invasionId: string };
      this.handleInvasionResolution(eventData.invasionId, 'failed');
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const currentTick = ctx.tick;

    // Find all entities with InvasionComponent
    const invasionEntities = ctx.activeEntities.filter(e =>
      e.components.has(CT.Invasion)
    );

    // Check for active invasions that need plot updates
    for (const entity of invasionEntities) {
      const invasion = entity.getComponent(CT.Invasion) as InvasionComponent | undefined;
      if (!invasion) continue;

      // Process each active invasion
      for (const activeInvasion of invasion.activeInvasions) {
        if (activeInvasion.status === 'in_progress' || activeInvasion.status === 'planning') {
          this.updateInvasionProgress(world, entity, activeInvasion, currentTick);
        }
      }
    }
  }

  /**
   * Load invasion plot templates from JSON
   */
  private async loadInvasionPlotTemplates(): Promise<void> {
    try {
      // Load templates dynamically to avoid TypeScript import issues
      const response = await fetch('/data/invasion-plot-templates.json');
      if (!response.ok) {
        throw new Error(`Failed to load invasion plot templates: ${response.statusText}`);
      }

      const data = await response.json();
      const templates = data.invasion_plot_templates as PlotLineTemplate[];

      for (const template of templates) {
        this.invasionPlotTemplates.set(template.id, template);
        // Also register with the global plot registry so they're available to the plot system
        plotLineRegistry.register(template);
      }

      console.log(
        `[InvasionPlotHandler] Loaded ${this.invasionPlotTemplates.size} invasion plot templates`
      );
    } catch (error) {
      console.error('[InvasionPlotHandler] Failed to load invasion plot templates:', error);
      // Fall back to empty templates - system will log warnings when it can't find templates
    }
  }

  /**
   * Handle invasion triggered event from BackgroundUniverseManager
   */
  private handleInvasionTriggered(event: InvasionTriggeredEvent): void {
    if (!this.world) {
      console.warn('[InvasionPlotHandler] World not initialized');
      return;
    }

    const invasionId = `invasion_${event.invaderUniverse}_${Date.now()}`;

    // Check if we've already processed this invasion
    if (this.processedInvasions.has(invasionId)) {
      return;
    }

    console.log(
      `[InvasionPlotHandler] Processing invasion from ${event.invaderUniverse} of type ${event.invasionType}`
    );

    // Find the player's empire or nation entity
    const defenderEntity = this.findDefenderEntity(this.world);
    if (!defenderEntity) {
      console.warn('[InvasionPlotHandler] No defender entity found (no player empire/nation)');
      return;
    }

    // Get or create InvasionComponent
    let invasionComp = defenderEntity.getComponent(CT.Invasion) as InvasionComponent | undefined;
    if (!invasionComp) {
      invasionComp = this.createInvasionComponent(event.targetUniverse);
      (this.world as WorldMutator).addComponent(defenderEntity.id, invasionComp);
    }

    // Create active invasion record
    const activeInvasion: ActiveInvasion = {
      invasionId,
      type: INVASION_TYPE_MAP[event.invasionType] || 'military',
      attackerUniverseId: event.invaderUniverse,
      targetUniverseId: event.targetUniverse,
      startTick: Number(this.world.tick),
      status: 'planning',
    };

    // Add to invasion component
    invasionComp.activeInvasions.push(activeInvasion);
    invasionComp.history.invasionsReceived++;
    invasionComp.history.lastInvasionTick = Number(this.world.tick);

    (this.world as WorldMutator).addComponent(defenderEntity.id, invasionComp);

    // Assign invasion plot to leader souls
    this.assignInvasionPlot(
      this.world as WorldMutator,
      defenderEntity,
      event,
      invasionId
    );

    // Mark as processed
    this.processedInvasions.add(invasionId);
  }

  /**
   * Find the defender entity (player's empire or nation)
   */
  private findDefenderEntity(world: World): Entity | undefined {
    // Try to find player's empire first
    const empireQuery = world.query().with(CT.Empire).executeEntities();
    if (empireQuery.length > 0) {
      // Return the first empire (assume player empire)
      return empireQuery[0];
    }

    // Fall back to nation
    const nationQuery = world.query().with(CT.Nation).executeEntities();
    if (nationQuery.length > 0) {
      return nationQuery[0];
    }

    // Fall back to any political entity
    const politicalQuery = world.query().with(CT.PoliticalEntity).executeEntities();
    if (politicalQuery.length > 0) {
      return politicalQuery[0];
    }

    return undefined;
  }

  /**
   * Create a new InvasionComponent
   */
  private createInvasionComponent(universeId: string): InvasionComponent {
    return {
      type: CT.Invasion,
      version: 1,
      universeId,
      activeInvasions: [],
      outboundInvasions: [],
      defense: {
        strategy: 'military_resistance',
        effectiveness: 0.5,
        lastUpdated: 0,
      },
      history: {
        invasionsReceived: 0,
        invasionsSent: 0,
        lastInvasionTick: 0,
      },
    };
  }

  /**
   * Assign invasion plot to leader souls
   */
  private assignInvasionPlot(
    world: WorldMutator,
    defenderEntity: Entity,
    event: InvasionTriggeredEvent,
    invasionId: string
  ): void {
    // Find leader souls to assign plots to
    const leaders = this.findLeaders(world, defenderEntity);

    if (leaders.length === 0) {
      console.warn('[InvasionPlotHandler] No leader souls found for invasion plot assignment');
      return;
    }

    // Determine which plot template to use based on invasion type
    const plotTemplateId = this.selectPlotTemplate(event.invasionType);
    const template = this.invasionPlotTemplates.get(plotTemplateId);

    if (!template) {
      console.warn(`[InvasionPlotHandler] Plot template not found: ${plotTemplateId}`);
      return;
    }

    // Assign plot to each leader
    for (const leader of leaders) {
      const soul = leader.getComponent(CT.SoulIdentity) as SoulIdentityComponent | undefined;
      if (!soul) continue;

      const plotLines = leader.getComponent(CT.PlotLines) as PlotLinesComponent | undefined;
      if (!plotLines) {
        console.warn(`[InvasionPlotHandler] Leader ${leader.id} has no PlotLines component`);
        continue;
      }

      // Check if already has this plot
      const hasPlot = plotLines.active.some(p => p.template_id === template.id);
      if (hasPlot) {
        continue; // Already assigned
      }

      // Create plot instance
      const instance: PlotLineInstance = {
        instance_id: `plot_${template.id}_${soul.true_name}_${invasionId}`,
        template_id: template.id,
        soul_id: soul.true_name,
        assigned_at_personal_tick: Number(world.tick),
        status: 'active',
        current_stage: template.entry_stage,
        stage_entered_at: Number(world.tick),
        scale: template.scale,
        multiverse_scope: template.multiverse_scope ?? 'local',
        stages_visited: [],
        parameters: { ...template.parameters, invasion_id: invasionId },
        bound_agents: {},
        triggered_by: {
          trigger_type: 'on_trauma', // Use existing trigger type as placeholder
          event_tick: Number(world.tick),
          involved_agent_id: undefined,
          involved_soul_id: undefined,
        },
      };

      // Add to active plots
      const updatedPlotLines: PlotLinesComponent = {
        ...plotLines,
        active: [...plotLines.active, instance],
      };

      world.addComponent(leader.id, updatedPlotLines);

      console.log(
        `[InvasionPlotHandler] Assigned plot ${template.id} to leader ${soul.true_name} for invasion ${invasionId}`
      );
    }
  }

  /**
   * Find leader entities (emperors, governors, etc.)
   */
  private findLeaders(world: World, politicalEntity: Entity): Entity[] {
    const leaders: Entity[] = [];

    // Look for governors
    const governorQuery = world.query()
      .with(CT.Governor)
      .with(CT.SoulIdentity)
      .with(CT.PlotLines)
      .executeEntities();

    for (const entity of governorQuery) {
      // TODO: Filter by political entity membership when that's implemented
      leaders.push(entity);
    }

    // If no governors, look for any souls with high wisdom
    if (leaders.length === 0) {
      const soulQuery = world.query()
        .with(CT.SoulIdentity)
        .with(CT.PlotLines)
        .executeEntities();

      for (const entity of soulQuery) {
        const soul = entity.getComponent(CT.SoulIdentity) as SoulIdentityComponent | undefined;
        if (soul && soul.wisdom_level >= 3) {
          leaders.push(entity);
          if (leaders.length >= 3) break; // Limit to top 3
        }
      }
    }

    return leaders;
  }

  /**
   * Select appropriate plot template based on invasion type
   */
  private selectPlotTemplate(invasionType: string): string {
    // For scout phase, always use scout template
    if (invasionType === 'scout') {
      return INVASION_PLOT_MAP['scout'] ?? 'invasion_scout_ships_detected';
    }

    // Otherwise use type-specific template
    return INVASION_PLOT_MAP[invasionType] ?? INVASION_PLOT_MAP['military'] ?? 'invasion_full_military';
  }

  /**
   * Update invasion progress and transition plot stages if needed
   */
  private updateInvasionProgress(
    world: World,
    entity: Entity,
    invasion: ActiveInvasion,
    currentTick: number
  ): void {
    // Calculate invasion progress based on time and other factors
    const ticksSinceStart = currentTick - invasion.startTick;

    // Transition from planning to in_progress after 500 ticks
    if (invasion.status === 'planning' && ticksSinceStart > 500) {
      invasion.status = 'in_progress';

      // Emit event for plot progression using onGeneric
      this.events.emitGeneric('invasion:phase_changed', {
        invasionId: invasion.invasionId,
        phase: 'military',
        tick: currentTick,
      });
    }

    // TODO: More sophisticated progression based on military strength, etc.
  }

  /**
   * Handle invasion resolution (victory, defeat, etc.)
   */
  private handleInvasionResolution(invasionId: string, outcome: string): void {
    if (!this.world) return;

    // Find the invasion
    const invasionEntities = this.world.query().with(CT.Invasion).executeEntities();

    for (const entity of invasionEntities) {
      const invasionComp = entity.getComponent(CT.Invasion) as InvasionComponent | undefined;
      if (!invasionComp) continue;

      const invasion = invasionComp.activeInvasions.find(
        inv => inv.invasionId === invasionId
      );

      if (invasion) {
        invasion.status = 'completed';

        // TODO: Update associated plot stages to completion/failure
        // TODO: Award wisdom to souls who participated

        console.log(
          `[InvasionPlotHandler] Invasion ${invasionId} resolved with outcome: ${outcome}`
        );
      }
    }
  }

  protected onCleanup(): void {
    this.processedInvasions.clear();
    this.invasionPlotTemplates.clear();
  }
}
