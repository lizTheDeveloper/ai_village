/**
 * SvetzRetrievalSystem - Handles svetz_retrieval ship missions
 *
 * Svetz retrieval ships fetch items and entities from extinct or alternate
 * timelines (temporal archaeology). Named after Larry Niven's character.
 *
 * Features:
 * - Navigate to extinct timeline branches
 * - Search for and retrieve target items/entities
 * - Anchor retrieved objects to current timeline
 * - Manage contamination from cross-timeline retrieval
 *
 * Priority: 97 (after ProbabilityScoutSystem at 96)
 * Throttle: 100 ticks (5 seconds)
 *
 * See: openspec/IMPLEMENTATION_ROADMAP.md Phase 6.2
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';
import type {
  SvetzRetrievalMissionComponent,
  RetrievedItem,
} from '../components/SvetzRetrievalMissionComponent.js';
import {
  createSvetzRetrievalMissionComponent,
  addRetrievedItem,
  updateAnchoringProgress,
  allItemsAnchored,
} from '../components/SvetzRetrievalMissionComponent.js';

// ============================================================================
// Constants
// ============================================================================

/** Progress per tick during navigation phase */
const NAVIGATION_RATE = 1.5; // ~67 ticks to navigate

/** Progress per tick during searching phase */
const SEARCHING_RATE = 1; // 100 ticks to find target

/** Progress per tick during retrieval phase */
const RETRIEVAL_RATE = 2; // 50 ticks per retrieval

/** Progress per tick during anchoring phase */
const ANCHORING_RATE = 0.5; // 200 ticks to anchor

/** Progress per tick during return phase */
const RETURN_RATE = 2; // 50 ticks to return

/** Base contamination per retrieved item */
const BASE_CONTAMINATION = 0.05; // 5% per item

/** Retrieval success rate base */
const BASE_RETRIEVAL_SUCCESS = 0.7; // 70% base success rate

// ============================================================================
// System
// ============================================================================

export class SvetzRetrievalSystem extends BaseSystem {
  public readonly id: SystemId = 'svetz_retrieval' as SystemId;
  public readonly priority: number = 97;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = [CT.Spaceship, CT.SvetzRetrievalMission] as const;
  protected readonly throttleInterval = 100; // Every 5 seconds

  public readonly metadata = {
    category: 'infrastructure' as const,
    description: 'Handles svetz_retrieval ship cross-timeline retrieval missions',
    dependsOn: [] as SystemId[],
    writesComponents: [CT.Spaceship, CT.SvetzRetrievalMission] as const,
  } as const;

  protected onUpdate(ctx: SystemContext): void {
    const { world, tick } = ctx;

    // Query svetz_retrieval ships with active missions
    const retrievalShips = world.query()
      .with(CT.Spaceship)
      .with(CT.SvetzRetrievalMission)
      .executeEntities();

    for (const entity of retrievalShips) {
      const impl = entity as EntityImpl;
      const spaceship = impl.getComponent<SpaceshipComponent>(CT.Spaceship);
      const mission = impl.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);

      if (!spaceship || !mission) continue;

      // Only process svetz_retrieval ships
      if (spaceship.ship_type !== 'svetz_retrieval') continue;

      // Process mission based on phase
      this.processMissionPhase(ctx, impl, spaceship, mission);
    }
  }

  /**
   * Process mission based on current phase
   */
  private processMissionPhase(
    ctx: SystemContext,
    entity: EntityImpl,
    spaceship: SpaceshipComponent,
    mission: SvetzRetrievalMissionComponent
  ): void {
    switch (mission.phase) {
      case 'navigating':
        this.processNavigating(ctx, entity, mission);
        break;
      case 'searching':
        this.processSearching(ctx, entity, spaceship, mission);
        break;
      case 'retrieving':
        this.processRetrieving(ctx, entity, spaceship, mission);
        break;
      case 'anchoring':
        this.processAnchoring(ctx, entity, mission);
        break;
      case 'returning':
        this.processReturning(ctx, entity, mission);
        break;
      case 'complete':
        // Mission complete, no processing needed
        break;
    }
  }

  /**
   * Navigation phase: Travel to target timeline
   */
  private processNavigating(
    ctx: SystemContext,
    entity: EntityImpl,
    mission: SvetzRetrievalMissionComponent
  ): void {
    mission.progress += NAVIGATION_RATE;

    if (mission.progress >= 100) {
      // Arrived at target timeline
      mission.phase = 'searching';
      mission.progress = 0;

      ctx.emit('multiverse:svetz_arrived', {
        shipId: entity.id,
        targetBranchId: mission.targetBranchId,
        tick: Number(ctx.tick),
      }, entity.id);
    }

    entity.updateComponent(CT.SvetzRetrievalMission, () => mission);
  }

  /**
   * Searching phase: Locate target in the timeline
   */
  private processSearching(
    ctx: SystemContext,
    entity: EntityImpl,
    spaceship: SpaceshipComponent,
    mission: SvetzRetrievalMissionComponent
  ): void {
    mission.progress += SEARCHING_RATE;

    if (mission.progress >= 100) {
      // Search complete - determine if target found
      const searchSuccess = Math.random() < (BASE_RETRIEVAL_SUCCESS + spaceship.navigation.observation_precision * 0.2);

      if (searchSuccess) {
        // Found target, proceed to retrieval
        mission.phase = 'retrieving';
        mission.progress = 0;

        ctx.emit('multiverse:svetz_target_found', {
          shipId: entity.id,
          targetSpec: mission.targetSpec,
          tick: Number(ctx.tick),
        }, entity.id);
      } else {
        // Target not found, mission failed
        mission.failedAttempts++;
        mission.lastFailureReason = 'Target not found in timeline';
        mission.phase = 'returning';
        mission.progress = 0;

        ctx.emit('multiverse:svetz_search_failed', {
          shipId: entity.id,
          reason: mission.lastFailureReason,
          tick: Number(ctx.tick),
        }, entity.id);
      }
    }

    entity.updateComponent(CT.SvetzRetrievalMission, () => mission);
  }

  /**
   * Retrieval phase: Extract target from timeline
   */
  private processRetrieving(
    ctx: SystemContext,
    entity: EntityImpl,
    spaceship: SpaceshipComponent,
    mission: SvetzRetrievalMissionComponent
  ): void {
    mission.progress += RETRIEVAL_RATE;

    if (mission.progress >= 100) {
      // Retrieval attempt
      const retrievalSuccess = Math.random() < BASE_RETRIEVAL_SUCCESS;

      if (retrievalSuccess && mission.anchoringSlotsUsed < mission.anchoringCapacity) {
        // Create retrieved item
        const item: RetrievedItem = {
          itemId: `item_${Number(ctx.tick)}_${Math.random().toString(36).slice(2, 8)}`,
          name: mission.targetSpec.description,
          sourceBranchId: mission.targetBranchId,
          sourceTimeTick: Number(ctx.tick) - Math.floor(Math.random() * 10000),
          contamination: BASE_CONTAMINATION * (1 + Math.random() * 0.5),
          anchored: false,
          anchoringProgress: 0,
          retrievedTick: Number(ctx.tick),
        };

        addRetrievedItem(mission, item);

        ctx.emit('multiverse:svetz_item_retrieved', {
          shipId: entity.id,
          itemId: item.itemId,
          itemName: item.name,
          contamination: item.contamination,
          tick: Number(ctx.tick),
        }, entity.id);

        // Proceed to anchoring
        mission.phase = 'anchoring';
        mission.progress = 0;
      } else {
        // Retrieval failed
        mission.failedAttempts++;
        mission.lastFailureReason = retrievalSuccess
          ? 'Anchoring capacity exceeded'
          : 'Retrieval destabilized';
        mission.phase = 'returning';
        mission.progress = 0;

        ctx.emit('multiverse:svetz_retrieval_failed', {
          shipId: entity.id,
          reason: mission.lastFailureReason,
          tick: Number(ctx.tick),
        }, entity.id);
      }
    }

    entity.updateComponent(CT.SvetzRetrievalMission, () => mission);
  }

  /**
   * Anchoring phase: Stabilize retrieved items in current timeline
   */
  private processAnchoring(
    ctx: SystemContext,
    entity: EntityImpl,
    mission: SvetzRetrievalMissionComponent
  ): void {
    // Update anchoring progress for all items
    updateAnchoringProgress(mission, ANCHORING_RATE * 100 / this.throttleInterval);

    mission.progress += ANCHORING_RATE;

    if (mission.progress >= 100 || allItemsAnchored(mission)) {
      // Anchoring complete, return home
      mission.phase = 'returning';
      mission.progress = 0;

      ctx.emit('multiverse:svetz_anchoring_complete', {
        shipId: entity.id,
        itemsAnchored: mission.retrievedItems.filter(i => i.anchored).length,
        totalContamination: mission.totalContamination,
        tick: Number(ctx.tick),
      }, entity.id);
    }

    entity.updateComponent(CT.SvetzRetrievalMission, () => mission);
  }

  /**
   * Return phase: Navigate back to origin timeline
   */
  private processReturning(
    ctx: SystemContext,
    entity: EntityImpl,
    mission: SvetzRetrievalMissionComponent
  ): void {
    mission.progress += RETURN_RATE;

    if (mission.progress >= 100) {
      // Mission complete
      mission.phase = 'complete';

      const success = mission.retrievedItems.length > 0 && mission.retrievedItems.some(i => i.anchored);

      ctx.emit('multiverse:svetz_mission_complete', {
        shipId: entity.id,
        success,
        itemsRetrieved: mission.retrievedItems.length,
        itemsAnchored: mission.retrievedItems.filter(i => i.anchored).length,
        totalContamination: mission.totalContamination,
        failedAttempts: mission.failedAttempts,
        tick: Number(ctx.tick),
      }, entity.id);
    }

    entity.updateComponent(CT.SvetzRetrievalMission, () => mission);
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Start a Svetz retrieval mission
   */
  public startMission(
    world: World,
    shipEntity: EntityImpl,
    targetBranchId: string,
    targetSpec: SvetzRetrievalMissionComponent['targetSpec']
  ): boolean {
    const spaceship = shipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
    if (!spaceship || spaceship.ship_type !== 'svetz_retrieval') {
      return false;
    }

    // Anchoring capacity based on ship size (800 mass = 4 slots)
    const anchoringCapacity = Math.max(1, Math.floor(spaceship.hull.mass / 200));

    const mission = createSvetzRetrievalMissionComponent(
      shipEntity.id,
      targetBranchId,
      targetSpec,
      anchoringCapacity,
      Number(world.tick)
    );

    shipEntity.addComponent(mission);
    return true;
  }

  /**
   * Get mission status
   */
  public getMissionStatus(entity: EntityImpl): SvetzRetrievalMissionComponent | undefined {
    return entity.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);
  }

  /**
   * Get retrieved items from completed mission
   */
  public getRetrievedItems(entity: EntityImpl): RetrievedItem[] {
    const mission = this.getMissionStatus(entity);
    if (!mission) return [];
    return mission.retrievedItems.filter(i => i.anchored);
  }
}
