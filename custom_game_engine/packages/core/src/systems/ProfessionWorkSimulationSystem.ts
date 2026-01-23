/**
 * ProfessionWorkSimulationSystem - Background simulation for profession work
 *
 * This system enables scalable NPC city profession simulation:
 * 1. Simulates profession work for autonomic agents (no individual LLM calls)
 * 2. Uses templates and quotas from CityDirector for coordination
 * 3. Generates profession outputs (articles, shows, services) in background
 * 4. Integrates with existing TV/Radio systems for media professions
 *
 * Performance: O(professions) not O(agents) - processes by profession type
 *
 * Architecture:
 * - CityDirector sets profession quotas (e.g., "city needs 5 reporters")
 * - This system simulates aggregate outputs based on quotas
 * - Individual agents with ProfessionComponent track their work
 * - Outputs cached in CityDirector for performance
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { CityDirectorComponent } from '../components/CityDirectorComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type {
  ProfessionComponent,
  ProfessionRole,
  ProfessionOutput,
} from '../components/ProfessionComponent.js';
import {
  isWorkTime,
  calculateOutputQuality,
  addProfessionOutput,
  startProfessionWork,
  updateWorkProgress,
  isWorkComplete,
} from '../components/ProfessionComponent.js';
import type { TimeComponent } from './TimeSystem.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import { updateReporterBehaviors } from '../profession/ReporterBehaviorHandler.js';

/**
 * Configuration for ProfessionWorkSimulationSystem.
 */
export interface ProfessionWorkConfig {
  /** How often to update profession work (in ticks). Default: 100 (5 seconds at 20 TPS) */
  updateInterval: number;
  /** How often to aggregate outputs to CityDirector (in ticks). Default: 1440 (1 game hour) */
  aggregationInterval: number;
}

/**
 * Default configuration.
 */
export const DEFAULT_PROFESSION_WORK_CONFIG: ProfessionWorkConfig = {
  updateInterval: 100, // 5 seconds at 20 TPS
  aggregationInterval: 1440, // 1 game hour at 20 TPS
};

/**
 * ProfessionWorkSimulationSystem - Simulates profession work for autonomic NPCs.
 *
 * Priority: 151 (after CityDirectorSystem at 45, before end of loop)
 */
export class ProfessionWorkSimulationSystem extends BaseSystem {
  public readonly id: SystemId = 'profession_work_simulation';
  public readonly priority: number = 151;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  // Lazy activation: Skip entire system when no profession exists
  public readonly activationComponents = ['profession'] as const;

  private config: ProfessionWorkConfig;
  private eventBus: EventBus | null = null;
  private lastAggregationTick: number = 0;

  // Singleton entity caching
  private timeEntityId: string | null = null;

  protected readonly throttleInterval: number;

  constructor(config: Partial<ProfessionWorkConfig> = {}) {
    super();
    this.config = { ...DEFAULT_PROFESSION_WORK_CONFIG, ...config };
    this.throttleInterval = this.config.updateInterval;
  }

  protected onInitialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Main update loop.
   */
  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Get time component for work shift checks
    const timeEntity = this.getTimeEntity(ctx.world);
    if (!timeEntity) {
      return; // No time system, skip
    }

    const time = timeEntity.getComponent<TimeComponent>(CT.Time);
    if (!time) {
      return; // No time component
    }

    const currentHour = Math.floor(time.timeOfDay);
    const dayOfWeek = this.getDayOfWeek(currentTick);

    // Check city crisis states (affects all profession work)
    const cityCrisisMap = this.checkCityCrises(ctx.world);

    // Process all agents with professions
    const professionAgents = ctx.world
      .query()
      .with(CT.Agent)
      .with(CT.Profession)
      .executeEntities();

    for (const entity of professionAgents) {
      const impl = entity as EntityImpl;
      const profession = impl.getComponent<ProfessionComponent>(CT.Profession);
      const agent = impl.getComponent<AgentComponent>(CT.Agent);

      if (!profession || !agent) {
        continue;
      }

      // Only simulate autonomic agents (full/reduced agents use normal AI)
      if (agent.tier !== 'autonomic') {
        continue;
      }

      // Check if agent should be at work
      if (!isWorkTime(profession, currentHour, dayOfWeek)) {
        continue; // Off duty
      }

      // Check if agent's needs allow work (starving/dying = no work!)
      if (!this.canAgentWork(impl)) {
        // Agent can't work due to unmet needs - pause current work
        if (profession.currentWork) {
          // Mark work as paused (don't reset progress)
          profession.currentWork.progress = Math.max(0, profession.currentWork.progress - 0.1);
        }
        continue;
      }

      // Check city crisis state (reduces work efficiency or stops work entirely)
      const cityDirectorId = profession.cityDirectorId;
      const crisisLevel = cityCrisisMap.get(cityDirectorId) ?? 'none';

      if (crisisLevel === 'critical') {
        // Critical crisis = no work at all
        continue;
      }

      if (crisisLevel === 'major' && Math.random() > 0.5) {
        // Major crisis = 50% chance to skip work this update
        continue;
      }

      // Update work progress (slower in minor crisis)
      const crisisSlowdown = crisisLevel === 'minor' ? 0.5 : 1.0;
      this.updateProfessionWork(ctx.world, impl, profession, currentTick, crisisSlowdown);
    }

    // Aggregate outputs to CityDirector periodically (every game hour)
    if (currentTick - this.lastAggregationTick >= this.config.aggregationInterval) {
      this.aggregateOutputsToDirectors(ctx.world, currentTick);
      this.lastAggregationTick = currentTick;
    }

    // Update field reporter navigation (sends reporters to story locations)
    updateReporterBehaviors(ctx.world, currentTick);
  }

  /**
   * Update work for a single profession agent.
   */
  private updateProfessionWork(
    world: World,
    entity: EntityImpl,
    profession: ProfessionComponent,
    currentTick: number,
    speedMultiplier: number = 1.0
  ): void {
    // If no current work, start new work
    if (!profession.currentWork) {
      this.assignNewWork(entity, profession, currentTick);
      return;
    }

    // Update progress (apply speed multiplier for crisis slowdown)
    if (speedMultiplier !== 1.0 && profession.currentWork) {
      // Manually update progress with multiplier
      const elapsed = (currentTick - profession.currentWork.startedTick) * speedMultiplier;
      const duration = profession.currentWork.expectedCompletionTick - profession.currentWork.startedTick;
      profession.currentWork.progress = Math.min(1.0, elapsed / duration);
    }

    const progress = updateWorkProgress(profession, currentTick);

    // Check if work is complete
    if (progress >= 1.0 && isWorkComplete(profession)) {
      this.completeWork(world, entity, profession, currentTick);
    }
  }

  /**
   * Assign new work to a profession agent.
   */
  private assignNewWork(
    entity: EntityImpl,
    profession: ProfessionComponent,
    currentTick: number
  ): void {
    const workDescription = this.generateWorkDescription(profession);
    const workDuration = this.calculateWorkDuration(profession);

    startProfessionWork(profession, workDescription, currentTick, workDuration);

    // Emit typed event
    if (this.eventBus) {
      this.eventBus.emit({
        type: 'profession:work_started',
        source: entity.id,
        data: {
          agentId: entity.id,
          profession: profession.role,
          workstation: profession.workplaceBuildingId,
          shift: this.getCurrentShift(currentTick),
        },
      });
    }
  }

  /**
   * Complete current work and generate output.
   */
  private completeWork(
    world: World,
    entity: EntityImpl,
    profession: ProfessionComponent,
    currentTick: number
  ): void {
    if (!profession.currentWork) {
      return;
    }

    const quality = calculateOutputQuality(profession);
    const output: ProfessionOutput = {
      type: this.getOutputType(profession.role),
      content: this.generateOutputContent(profession, quality),
      quality,
      producedTick: currentTick,
      associatedId: profession.workplaceBuildingId,
    };

    addProfessionOutput(profession, output);

    // Increase experience
    profession.experienceDays += 1 / profession.dailyOutputQuota; // Fractional for sub-daily work

    // Emit typed completion event
    if (this.eventBus) {
      const workHours = (currentTick - (profession.currentWork?.startedTick || currentTick)) / (20 * 60); // Convert ticks to hours
      this.eventBus.emit({
        type: 'profession:work_completed',
        source: entity.id,
        data: {
          agentId: entity.id,
          profession: profession.role,
          outputItems: [output.type],
          quality,
          workHours,
        },
      });
    }
  }

  /**
   * Aggregate profession outputs to CityDirector for caching.
   */
  private aggregateOutputsToDirectors(world: World, currentTick: number): void {
    const directors = world.query().with(CT.CityDirector).executeEntities();

    for (const directorEntity of directors) {
      const impl = directorEntity as EntityImpl;
      const director = impl.getComponent<CityDirectorComponent>(CT.CityDirector);

      if (!director) {
        continue;
      }

      // Clear old outputs
      director.professionOutputs.newsArticles = [];
      director.professionOutputs.tvEpisodes = [];
      director.professionOutputs.radioBroadcasts = [];
      director.professionOutputs.services = [];

      // Find all profession agents in this city
      const professionAgents = world
        .query()
        .with(CT.Profession)
        .executeEntities()
        .filter((e) => {
          const prof = (e as EntityImpl).getComponent<ProfessionComponent>(CT.Profession);
          return prof?.cityDirectorId === impl.id;
        });

      // Aggregate outputs by type
      for (const entity of professionAgents) {
        const profession = (entity as EntityImpl).getComponent<ProfessionComponent>(CT.Profession);
        if (!profession) continue;

        for (const output of profession.recentOutputs) {
          switch (output.type) {
            case 'news_article':
              director.professionOutputs.newsArticles.push(output);
              break;
            case 'tv_episode':
              director.professionOutputs.tvEpisodes.push(output);
              break;
            case 'radio_show':
              director.professionOutputs.radioBroadcasts.push(output);
              break;
            case 'service':
            case 'administrative':
              director.professionOutputs.services.push(output);
              break;
          }
        }
      }

      director.lastProfessionUpdate = currentTick;

      // Update production metrics
      this.updateProductionMetrics(director, currentTick);

      // Emit aggregation event for profession outputs
      if (this.eventBus) {
        this.eventBus.emit({
          type: 'profession:output_aggregated',
          source: impl.id,
          data: {
            cityId: impl.id,
            profession: 'all',
            outputCount: director.professionOutputs.newsArticles.length +
                         director.professionOutputs.tvEpisodes.length +
                         director.professionOutputs.radioBroadcasts.length +
                         director.professionOutputs.services.length,
            averageQuality: this.calculateAverageQuality(director),
            activeWorkers: professionAgents.length,
          },
        });
      }
    }
  }

  /**
   * Calculate average quality across all profession outputs.
   */
  private calculateAverageQuality(director: CityDirectorComponent): number {
    const outputs = [
      ...director.professionOutputs.newsArticles,
      ...director.professionOutputs.tvEpisodes,
      ...director.professionOutputs.radioBroadcasts,
      ...director.professionOutputs.services,
    ];

    if (outputs.length === 0) return 0;

    const totalQuality = outputs.reduce((sum, output) => sum + output.quality, 0);
    return totalQuality / outputs.length;
  }

  /**
   * Update production metrics for a city director.
   */
  private updateProductionMetrics(director: CityDirectorComponent, currentTick: number): void {
    if (!director.professionMetrics) {
      director.professionMetrics = {
        totalArticles: 0,
        totalTVEpisodes: 0,
        totalRadioShows: 0,
        totalServices: 0,
        articlesPerDay: 0,
        tvEpisodesPerDay: 0,
        radioShowsPerDay: 0,
        avgArticleQuality: 0,
        avgTVQuality: 0,
        avgRadioQuality: 0,
        lastMetricsUpdate: 0,
      };
    }

    const metrics = director.professionMetrics;

    // Update totals (cumulative)
    metrics.totalArticles += director.professionOutputs.newsArticles.length;
    metrics.totalTVEpisodes += director.professionOutputs.tvEpisodes.length;
    metrics.totalRadioShows += director.professionOutputs.radioBroadcasts.length;
    metrics.totalServices += director.professionOutputs.services.length;

    // Calculate production rates (per game day)
    const TICKS_PER_DAY = 14400; // 20 TPS × 720 seconds
    const daysSinceLastUpdate = (currentTick - metrics.lastMetricsUpdate) / TICKS_PER_DAY;

    if (daysSinceLastUpdate > 0) {
      metrics.articlesPerDay = director.professionOutputs.newsArticles.length / daysSinceLastUpdate;
      metrics.tvEpisodesPerDay = director.professionOutputs.tvEpisodes.length / daysSinceLastUpdate;
      metrics.radioShowsPerDay = director.professionOutputs.radioBroadcasts.length / daysSinceLastUpdate;
    }

    // Calculate average quality
    metrics.avgArticleQuality = this.calculateAvgQuality(director.professionOutputs.newsArticles);
    metrics.avgTVQuality = this.calculateAvgQuality(director.professionOutputs.tvEpisodes);
    metrics.avgRadioQuality = this.calculateAvgQuality(director.professionOutputs.radioBroadcasts);

    metrics.lastMetricsUpdate = currentTick;
  }

  /**
   * Calculate average quality from outputs.
   */
  private calculateAvgQuality(outputs: ProfessionOutput[]): number {
    if (outputs.length === 0) {
      return 0;
    }

    const sum = outputs.reduce((acc, output) => acc + output.quality, 0);
    return sum / outputs.length;
  }

  // ============================================================================
  // TEMPLATE GENERATION HELPERS
  // ============================================================================

  /**
   * Determine current work shift based on tick.
   */
  private getCurrentShift(tick: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    // Assuming 1 day = 20 TPS * 60 sec * 24 hours = 28,800 ticks
    const TICKS_PER_DAY = 28800;
    const hourOfDay = ((tick % TICKS_PER_DAY) / TICKS_PER_DAY) * 24;

    if (hourOfDay >= 6 && hourOfDay < 12) return 'morning';
    if (hourOfDay >= 12 && hourOfDay < 18) return 'afternoon';
    if (hourOfDay >= 18 && hourOfDay < 22) return 'evening';
    return 'night';
  }

  /**
   * Generate work description based on profession role.
   */
  private generateWorkDescription(profession: ProfessionComponent): string {
    const templates = this.getWorkTemplates(profession.role);
    return templates[Math.floor(Math.random() * templates.length)]!;
  }

  /**
   * Get work description templates for a profession role.
   */
  private getWorkTemplates(role: ProfessionRole): string[] {
    switch (role) {
      case 'newspaper_reporter':
        return [
          'Researching local events',
          'Interviewing city council members',
          'Covering market day activities',
          'Investigating citizen complaints',
          'Writing about new building construction',
          'Reporting on weather patterns',
        ];

      case 'newspaper_editor':
        return [
          'Editing submitted articles',
          'Planning next edition layout',
          'Fact-checking reporter stories',
          'Writing editorial column',
          'Meeting with reporters',
        ];

      case 'tv_actor':
        return [
          'Rehearsing script lines',
          'Filming scene takes',
          'Wardrobe and makeup session',
          'Script table read',
          'Stunt coordination practice',
        ];

      case 'tv_director':
        return [
          'Blocking scene movements',
          'Directing actor performances',
          'Reviewing dailies footage',
          'Planning shot list',
          'Working with cinematographer',
        ];

      case 'tv_producer':
        return [
          'Managing production budget',
          'Coordinating crew schedules',
          'Reviewing scripts',
          'Meeting with network executives',
          'Overseeing post-production',
        ];

      case 'tv_writer':
        return [
          'Writing episode script',
          'Story room brainstorming',
          'Character development',
          'Dialogue polishing',
          'Script revision',
        ];

      case 'radio_dj':
        return [
          'Preparing show playlist',
          'Recording intro segments',
          'Interviewing call-in listeners',
          'Curating music selection',
          'Writing show notes',
        ];

      case 'radio_producer':
        return [
          'Producing radio segments',
          'Editing audio clips',
          'Booking show guests',
          'Managing broadcast schedule',
          'Sound mixing',
        ];

      case 'office_worker':
        return [
          'Processing paperwork',
          'Attending meetings',
          'Responding to correspondence',
          'Filing documents',
          'Data entry tasks',
        ];

      case 'shopkeeper':
        return [
          'Assisting customers',
          'Restocking shelves',
          'Processing transactions',
          'Inventory management',
          'Opening/closing store',
        ];

      case 'teacher':
        return [
          'Teaching class lesson',
          'Grading student work',
          'Preparing lesson plans',
          'Meeting with parents',
          'Supervising students',
        ];

      case 'librarian':
        return [
          'Cataloging new books',
          'Assisting library patrons',
          'Organizing shelves',
          'Processing book returns',
          'Researching patron requests',
        ];

      case 'doctor':
        return [
          'Examining patients',
          'Diagnosing conditions',
          'Prescribing treatments',
          'Performing procedures',
          'Reviewing medical charts',
        ];

      case 'nurse':
        return [
          'Assisting patients',
          'Administering medication',
          'Taking vital signs',
          'Updating patient records',
          'Coordinating with doctors',
        ];

      case 'bureaucrat':
        return [
          'Processing permit applications',
          'Reviewing city regulations',
          'Attending committee meetings',
          'Filing reports',
          'Answering citizen inquiries',
        ];

      case 'city_planner':
        return [
          'Reviewing development proposals',
          'Planning city infrastructure',
          'Conducting site surveys',
          'Meeting with developers',
          'Updating zoning maps',
        ];

      case 'accountant':
        return [
          'Balancing accounts',
          'Preparing financial reports',
          'Processing invoices',
          'Tax preparation',
          'Auditing records',
        ];

      case 'generic_worker':
      default:
        return [
          'Performing work duties',
          'Completing assigned tasks',
          'Meeting with supervisor',
          'Processing work orders',
        ];
    }
  }

  /**
   * Calculate work duration in ticks based on profession.
   */
  private calculateWorkDuration(profession: ProfessionComponent): number {
    // Base: 1 hour of game time = 1440 ticks at 20 TPS
    const baseHours = 1;
    const baseTicks = baseHours * 1440;

    // Modify by performance (better performance = faster work)
    const performanceFactor = 2.0 - profession.performance; // 0.7 perf = 1.3x time, 1.0 perf = 1.0x time

    return Math.floor(baseTicks * performanceFactor);
  }

  /**
   * Get output type for profession role.
   */
  private getOutputType(role: ProfessionRole): ProfessionOutput['type'] {
    if (role === 'newspaper_reporter' || role === 'newspaper_editor') {
      return 'news_article';
    }
    if (role.startsWith('tv_')) {
      return 'tv_episode';
    }
    if (role.startsWith('radio_')) {
      return 'radio_show';
    }
    if (role === 'bureaucrat' || role === 'city_planner' || role === 'accountant') {
      return 'administrative';
    }
    return 'service';
  }

  /**
   * Generate output content based on profession and quality.
   */
  private generateOutputContent(profession: ProfessionComponent, quality: number): string {
    const qualityDesc = quality > 0.8 ? 'excellent' : quality > 0.6 ? 'good' : quality > 0.4 ? 'adequate' : 'poor';

    switch (profession.role) {
      case 'newspaper_reporter':
        return `Article: "${profession.currentWork?.description}" (${qualityDesc} quality)`;

      case 'tv_actor':
        return `Performance in "${profession.currentWork?.description}" (${qualityDesc} acting)`;

      case 'radio_dj':
        return `Broadcast: "${profession.currentWork?.description}" (${qualityDesc} show)`;

      default:
        return `${profession.role}: "${profession.currentWork?.description}" (${qualityDesc})`;
    }
  }

  // ============================================================================
  // UTILITY HELPERS
  // ============================================================================

  /**
   * Get time entity (singleton).
   */
  private getTimeEntity(world: World): EntityImpl | null {
    if (!this.timeEntityId) {
      const timeEntities = world.query().with(CT.Time).executeEntities();
      if (timeEntities.length === 0) return null;
      const firstEntity = timeEntities[0];
      if (!firstEntity) return null;
      this.timeEntityId = firstEntity.id;
    }
    const entity = world.getEntity(this.timeEntityId);
    if (!entity) {
      this.timeEntityId = null;
      return null;
    }
    return entity as EntityImpl;
  }

  /**
   * Calculate day of week from tick.
   */
  private getDayOfWeek(tick: number): number {
    // 1 day = 14400 ticks at 20 TPS (720 seconds)
    const TICKS_PER_DAY = 14400;
    const dayNumber = Math.floor(tick / TICKS_PER_DAY);
    return dayNumber % 7; // 0 = Sunday, 6 = Saturday
  }

  /**
   * Check crisis state for all cities.
   * Returns map of cityDirectorId → crisis level.
   */
  private checkCityCrises(world: World): Map<string, 'none' | 'minor' | 'major' | 'critical'> {
    const crisisMap = new Map<string, 'none' | 'minor' | 'major' | 'critical'>();

    const directors = world.query().with(CT.CityDirector).executeEntities();

    for (const directorEntity of directors) {
      const impl = directorEntity as EntityImpl;
      const director = impl.getComponent<CityDirectorComponent>(CT.CityDirector);

      if (!director) {
        continue;
      }

      // Determine crisis level based on city stats
      let crisisLevel: 'none' | 'minor' | 'major' | 'critical' = 'none';

      const stats = director.stats;

      // Critical: City is under attack OR massive starvation
      if (stats.nearbyThreats > 5 || stats.foodSupply < 1) {
        crisisLevel = 'critical';
      }
      // Major: Moderate threats OR low food
      else if (stats.nearbyThreats > 2 || stats.foodSupply < 3 || stats.recentDeaths > 3) {
        crisisLevel = 'major';
      }
      // Minor: Some threats OR below-average food
      else if (stats.nearbyThreats > 0 || stats.foodSupply < 5) {
        crisisLevel = 'minor';
      }

      crisisMap.set(impl.id, crisisLevel);
    }

    return crisisMap;
  }

  /**
   * Check if agent can work (based on needs).
   * Agents with critical needs (starving, dying) can't work.
   */
  private canAgentWork(entity: EntityImpl): boolean {
    // Check if agent has needs component
    const needs = entity.getComponent<NeedsComponent>(CT.Needs);
    if (!needs) {
      return true; // No needs component = can work
    }

    // Critical thresholds (from NeedsSystem)
    const CRITICAL_HUNGER = 20;    // Below 20% = starving
    const CRITICAL_ENERGY = 15;    // Below 15% = exhausted
    const CRITICAL_HEALTH = 25;    // Below 25% = dying

    // Check critical needs
    const hunger = needs.hunger ?? 100;
    const energy = needs.energy ?? 100;
    const health = needs.health ?? 100;

    // Can't work if starving, exhausted, or dying
    if (hunger < CRITICAL_HUNGER) {
      return false; // Too hungry to work
    }
    if (energy < CRITICAL_ENERGY) {
      return false; // Too tired to work
    }
    if (health < CRITICAL_HEALTH) {
      return false; // Too sick/injured to work
    }

    return true; // Needs are met, can work
  }

  protected onCleanup(): void {
    this.eventBus = null;
  }
}
