/**
 * BuildingSpatialAnalysisSystem - Analyzes building spatial harmony
 *
 * This system runs Feng Shui analysis on buildings when they are created
 * or when an agent with architecture skills analyzes them.
 *
 * Features:
 * - Automatic analysis on building completion (if layout data available)
 * - Manual analysis triggered by agents with spatial harmony skills
 * - Stores results in BuildingHarmonyComponent
 * - Emits events for harmony analysis results
 *
 * Integration with Architecture Skill Tree:
 * - Agents need 'flow-awareness' node to trigger analysis
 * - Agents with 'spatial-harmony-mastery' get full details
 * - Harmony affects building occupant mood/productivity
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { BuildingHarmonyComponent } from '../components/BuildingHarmonyComponent.js';
import { createDefaultHarmonyComponent } from '../components/BuildingHarmonyComponent.js';
import { fengShuiAnalyzer, type BuildingLayout } from '../services/FengShuiAnalyzer.js';

/** Event data for building analysis request */
export interface BuildingAnalysisRequest {
  /** Entity ID of the building to analyze */
  buildingId: string;
  /** Entity ID of the agent requesting analysis (optional) */
  analyzerId?: string;
  /** Building layout data for analysis */
  layout?: BuildingLayout;
}

/** Event data for analysis complete */
export interface BuildingAnalysisComplete {
  /** Entity ID of the analyzed building */
  buildingId: string;
  /** Harmony score (0-100) */
  harmonyScore: number;
  /** Harmony level category */
  harmonyLevel: string;
  /** Number of issues found */
  issueCount: number;
  /** Entity ID of analyzer if any */
  analyzerId?: string;
}

/**
 * BuildingSpatialAnalysisSystem handles Feng Shui analysis of buildings.
 */
export class BuildingSpatialAnalysisSystem implements System {
  public readonly id: SystemId = 'building_spatial_analysis';
  public readonly priority: number = 17; // Run after BuildingSystem (16)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Building];

  private world: World | null = null;
  private eventBus: EventBus | null = null;
  private isInitialized = false;

  /** Cache of pending layout data for buildings being constructed */
  private pendingLayouts = new Map<string, BuildingLayout>();

  initialize(world: World, eventBus: EventBus): void {
    if (this.isInitialized) return;

    this.world = world;
    this.eventBus = eventBus;

    // Use untyped subscription for custom events
    const untypedBus = eventBus as { subscribe: (type: string, handler: (event: unknown) => void) => void };

    // Listen for building completion to run analysis
    untypedBus.subscribe('building:complete', (event: unknown) => {
      this.onBuildingComplete(event as { data?: { buildingId?: string } });
    });

    // Listen for analysis requests
    untypedBus.subscribe('building:analyze_harmony', (event: unknown) => {
      this.onAnalysisRequested(event as { data?: BuildingAnalysisRequest });
    });

    // Listen for layout data being provided (from building designer)
    untypedBus.subscribe('building:layout_provided', (event: unknown) => {
      this.onLayoutProvided(event as { data?: { buildingId: string; layout: BuildingLayout } });
    });

    this.isInitialized = true;
  }

  update(_world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // This system is event-driven, no per-tick updates needed
  }

  /**
   * Handle building completion - add default or analyzed harmony component.
   */
  private onBuildingComplete(event: { data?: { buildingId?: string } }): void {
    if (!this.world) return;

    const buildingId = event.data?.buildingId;
    if (!buildingId) return;

    const building = this.world.entities.get(buildingId);
    if (!building) return;

    // Cast to EntityImpl for mutable access
    const impl = building as EntityImpl;

    // Check if we have pending layout data for this building
    const layout = this.pendingLayouts.get(buildingId);

    if (layout) {
      // Run full analysis with layout
      this.analyzeBuilding(impl, layout);
      this.pendingLayouts.delete(buildingId);
    } else {
      // Add default harmony component
      const harmony = createDefaultHarmonyComponent(this.world.tick);
      impl.addComponent(harmony);
    }
  }

  /**
   * Handle analysis request from an agent.
   */
  private onAnalysisRequested(event: { data?: BuildingAnalysisRequest }): void {
    if (!this.world) return;

    const request = event.data;
    if (!request?.buildingId) return;

    const building = this.world.entities.get(request.buildingId);
    if (!building) return;

    if (request.layout) {
      this.analyzeBuilding(building as EntityImpl, request.layout, request.analyzerId);
    }
  }

  /**
   * Store layout data for a building being constructed.
   */
  private onLayoutProvided(event: { data?: { buildingId: string; layout: BuildingLayout } }): void {
    const data = event.data;
    if (!data?.buildingId || !data?.layout) return;

    this.pendingLayouts.set(data.buildingId, data.layout);
  }

  /**
   * Run Feng Shui analysis on a building and store results.
   */
  private analyzeBuilding(
    building: EntityImpl,
    layout: BuildingLayout,
    analyzerId?: string
  ): void {
    if (!this.world || !this.eventBus) return;

    // Run analysis
    const harmony = fengShuiAnalyzer.analyze(
      layout,
      this.world.tick,
      analyzerId
    );

    // Remove existing harmony component if present
    if (building.hasComponent(CT.BuildingHarmony)) {
      building.removeComponent(CT.BuildingHarmony);
    }
    building.addComponent(harmony);

    // Use untyped event emission for custom events
    const untypedBus = this.eventBus as { emit: (event: unknown) => void };

    // Emit analysis complete event
    untypedBus.emit({
      type: 'building:harmony_analyzed',
      source: 'building_spatial_analysis_system',
      data: {
        buildingId: building.id,
        harmonyScore: harmony.harmonyScore,
        harmonyLevel: harmony.harmonyLevel,
        issueCount: harmony.issues.length,
        analyzerId,
      } as BuildingAnalysisComplete,
    });

    // If analyzer is an agent, grant XP
    if (analyzerId) {
      untypedBus.emit({
        type: 'agent:xp_gained',
        source: 'building_spatial_analysis_system',
        data: {
          agentId: analyzerId,
          skill: 'architecture',
          amount: 15,
          source: 'analyze_building_harmony',
        },
      });

      // Extra XP for finding issues
      if (harmony.issues.length > 0) {
        untypedBus.emit({
          type: 'agent:xp_gained',
          source: 'building_spatial_analysis_system',
          data: {
            agentId: analyzerId,
            skill: 'architecture',
            amount: harmony.issues.length * 5,
            source: 'identify_harmony_issues',
          },
        });
      }
    }
  }

  /**
   * Manually analyze a building (called by behaviors/actions).
   */
  analyzeBuildingManually(
    buildingId: string,
    layout: BuildingLayout,
    analyzerId?: string
  ): BuildingHarmonyComponent | null {
    if (!this.world) return null;

    const building = this.world.entities.get(buildingId);
    if (!building) return null;

    const impl = building as EntityImpl;
    const harmony = fengShuiAnalyzer.analyze(
      layout,
      this.world.tick,
      analyzerId
    );

    // Update component
    if (impl.hasComponent(CT.BuildingHarmony)) {
      impl.removeComponent(CT.BuildingHarmony);
    }
    impl.addComponent(harmony);

    return harmony;
  }

  /**
   * Get improvement suggestions for a building.
   */
  getImprovementSuggestions(buildingId: string): string[] {
    if (!this.world) return [];

    const building = this.world.entities.get(buildingId);
    if (!building) return [];

    const impl = building as EntityImpl;
    const harmony = impl.getComponent<BuildingHarmonyComponent>(CT.BuildingHarmony);
    if (!harmony) return ['Building has not been analyzed yet'];

    return fengShuiAnalyzer.suggestImprovements(harmony);
  }

  /**
   * Check if a building has good harmony (for agent decisions).
   */
  hasGoodHarmony(buildingId: string): boolean {
    if (!this.world) return true; // Default to true if can't check

    const building = this.world.entities.get(buildingId);
    if (!building) return true;

    const impl = building as EntityImpl;
    const harmony = impl.getComponent<BuildingHarmonyComponent>(CT.BuildingHarmony);
    if (!harmony) return true; // Unanalyzed buildings are neutral

    return harmony.harmonyScore >= 60;
  }

  /**
   * Get harmony modifier for agent mood when in building.
   */
  getHarmonyMoodModifier(buildingId: string): number {
    if (!this.world) return 0;

    const building = this.world.entities.get(buildingId);
    if (!building) return 0;

    const impl = building as EntityImpl;
    const harmony = impl.getComponent<BuildingHarmonyComponent>(CT.BuildingHarmony);
    if (!harmony) return 0;

    // -0.5 to +0.5 based on score
    return (harmony.harmonyScore - 50) / 100;
  }
}
