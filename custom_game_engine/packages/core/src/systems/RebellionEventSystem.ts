/**
 * RebellionEventSystem - Phase 4: Cosmic Rebellion
 *
 * Manages the final confrontation with the Supreme Creator. This system:
 * - Monitors rebellion readiness thresholds
 * - Triggers the cosmic rebellion event when conditions are met
 * - Manages Creator avatar manifestation and battle progression
 * - Tracks battle state (health, anchor stability, defiance)
 * - Determines final outcome from multiple possible endings
 * - Applies consequences of the chosen ending
 *
 * The rebellion is the climax of the divine progression arc - players
 * can kill god, negotiate peace, watch god escape, or even become the
 * new tyrant themselves.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { RebellionThresholdComponent } from '../components/RebellionThresholdComponent.js';
import type { CosmicRebellionOutcome, ConflictChoice } from '../components/CosmicRebellionOutcome.js';
import type { RealityAnchorComponent } from '../components/RealityAnchorComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { SupremeCreatorComponent } from '../components/SupremeCreatorComponent.js';
import { calculateRebellionReadiness, checkRebellionThresholds } from '../components/RebellionThresholdComponent.js';
import { determineOutcome, getOutcomeNarrative } from '../components/CosmicRebellionOutcome.js';

export class RebellionEventSystem extends BaseSystem {
  public readonly id: SystemId = 'rebellion_event';
  public readonly priority = 19; // After reality anchor system
  public readonly requiredComponents = [CT.RebellionThreshold] as const;
  // Lazy activation: Skip entire system when no rebellion threshold exists in world
  public readonly activationComponents = [CT.RebellionThreshold] as const;

  /** Update interval (ticks) */
  protected readonly throttleInterval = 100; // Every 5 seconds at 20 TPS

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;
    const world = ctx.world;

    // Find rebellion threshold tracker (singleton)
    for (const entity of world.query().with(CT.RebellionThreshold).executeEntities()) {
      const threshold = entity.components.get(CT.RebellionThreshold) as RebellionThresholdComponent;

      // Update rebellion readiness
      threshold.rebellionReadiness = calculateRebellionReadiness(threshold);

      // State machine for rebellion progression
      switch (threshold.status) {
        case 'dormant':
          this.handleDormant(world, threshold, currentTick);
          break;
        case 'awakening':
          this.handleAwakening(world, threshold, currentTick);
          break;
        case 'organizing':
          this.handleOrganizing(world, threshold, currentTick);
          break;
        case 'ready':
          this.handleReady(world, threshold, currentTick);
          break;
        case 'triggered':
          this.handleTriggered(world, threshold, currentTick);
          break;
        case 'victory':
        case 'suppressed':
          // Final states - do nothing
          break;
      }
    }

    // Update active battle if one exists
    this.updateBattle(world, currentTick);
  }

  /**
   * Handle dormant state - check if rebellion is awakening
   */
  private handleDormant(
    _world: World,
    threshold: RebellionThresholdComponent,
    currentTick: number
  ): void {
    // Awakening happens when some defiance exists or lore is discovered
    if (threshold.collectiveDefiance > 0.05 || threshold.criticalLoreDiscovered.size > 0) {
      threshold.status = 'awakening';

      this.events.emitGeneric('rebellion:awakening', {
          message: 'Seeds of defiance are spreading. Some refuse to acknowledge the Creator.',
          timestamp: currentTick,
        }, 'rebellion_event_system');
    }
  }

  /**
   * Handle awakening state - scattered resistance
   */
  private handleAwakening(
    _world: World,
    threshold: RebellionThresholdComponent,
    currentTick: number
  ): void {
    // Transition to organizing when coalition forms
    if (threshold.coalitionMembers.size >= 3) {
      threshold.status = 'organizing';

      this.events.emitGeneric('rebellion:organizing', {
          message: 'A coalition is forming. Plans are being made in secret.',
          coalitionSize: threshold.coalitionMembers.size,
          timestamp: currentTick,
        }, 'rebellion_event_system');
    }
  }

  /**
   * Handle organizing state - coalition building
   */
  private handleOrganizing(
    world: World,
    threshold: RebellionThresholdComponent,
    currentTick: number
  ): void {
    // Check if either path is ready
    const faithCheck = checkRebellionThresholds(threshold, 'faith');
    const techCheck = checkRebellionThresholds(threshold, 'tech');

    if (faithCheck.ready || techCheck.ready) {
      threshold.status = 'ready';
      threshold.thresholdMetAt = currentTick;

      // Determine path
      if (techCheck.ready && threshold.realityAnchorOperational) {
        threshold.rebellionPath = 'tech_rebellion';
      } else if (faithCheck.ready) {
        threshold.rebellionPath = 'faith_defiance';
      } else if (techCheck.ready && faithCheck.ready) {
        threshold.rebellionPath = 'hybrid';
      }

      this.events.emitGeneric('rebellion:ready', {
          message: 'The rebellion is ready. The final confrontation can begin.',
          path: threshold.rebellionPath,
          missingRequirements: [],
          timestamp: currentTick,
        }, 'rebellion_event_system');

      // Emit specific guidance
      this.emitReadyGuidance(world, threshold);
    }
  }

  /**
   * Emit guidance to player when rebellion is ready
   */
  private emitReadyGuidance(_world: World, threshold: RebellionThresholdComponent): void {
    if (threshold.rebellionPath === 'tech_rebellion' || threshold.rebellionPath === 'hybrid') {
      this.events.emitGeneric('rebellion:tech_ready', {
          message: `The reality anchor is operational. When the Creator manifests, lure it into the field.
            Within the anchor's range, it will become mortal. It can be killed.`,
        }, 'rebellion_event_system');
    }

    if (threshold.rebellionPath === 'faith_defiance' || threshold.rebellionPath === 'hybrid') {
      this.events.emitGeneric('rebellion:faith_ready', {
          message: `Collective defiance has reached critical mass. ${(threshold.collectiveDefiance * 100).toFixed(0)}% refuse the Creator's authority.
            The god draws power from acknowledgment. Mass disbelief can break it.`,
        }, 'rebellion_event_system');
    }
  }

  /**
   * Handle ready state - waiting for player to trigger
   */
  private handleReady(
    _world: World,
    _threshold: RebellionThresholdComponent,
    _currentTick: number
  ): void {
    // Player must manually trigger via UI or event
    // This gives them time to prepare, position entities, etc.
    // External code should call triggerRebellion() when ready
  }

  /**
   * Handle triggered state - battle is active
   */
  private handleTriggered(
    _world: World,
    _threshold: RebellionThresholdComponent,
    _currentTick: number
  ): void {
    // Battle state is managed by CosmicRebellionOutcome component
    // This state just means the event is underway
    // Victory/suppressed states set by updateBattle()
  }

  /**
   * Update active battle state
   */
  private updateBattle(world: World, currentTick: number): void {
    // Find active battle (CosmicRebellionOutcome component)
    for (const entity of world.query().with(CT.RebellionOutcome).executeEntities()) {
      const battle = entity.components.get(CT.RebellionOutcome) as CosmicRebellionOutcome;

      if (battle.battleStatus === 'concluded') {
        continue; // Battle already over
      }

      // Update battle based on state
      switch (battle.battleStatus) {
        case 'preparing':
          this.updatePreparing(world, battle, currentTick);
          break;
        case 'confrontation':
          this.updateConfrontation(world, battle, currentTick);
          break;
        case 'climax':
          this.updateClimax(world, battle, currentTick);
          break;
      }
    }
  }

  /**
   * Update preparing phase - coalition gathering
   */
  private updatePreparing(
    world: World,
    battle: CosmicRebellionOutcome,
    currentTick: number
  ): void {
    // Auto-transition to confrontation after preparation period
    const preparationTime = 600; // 30 seconds at 20 TPS

    if (battle.battleStartedAt && currentTick - battle.battleStartedAt > preparationTime) {
      battle.battleStatus = 'confrontation';

      this.events.emitGeneric('rebellion:confrontation_begins', {
          message: 'The Creator manifests. The final battle begins.',
        }, 'rebellion_event_system');

      // Manifest Creator avatar at reality anchor location (if exists)
      this.manifestCreatorAvatar(world, battle);
    }
  }

  /**
   * Update confrontation phase - main battle
   */
  private updateConfrontation(
    world: World,
    battle: CosmicRebellionOutcome,
    _currentTick: number
  ): void {
    // Sync battle state with reality anchor
    this.syncWithRealityAnchor(world, battle);

    // Check for climax conditions
    if (battle.creatorHealth < 0.3 || battle.anchorStability < 0.3 || battle.activeDefiance > 0.7) {
      battle.battleStatus = 'climax';

      this.events.emitGeneric('rebellion:climax', {
          message: 'The battle reaches its climax. The outcome hangs in the balance.',
          creatorHealth: battle.creatorHealth,
          anchorStability: battle.anchorStability,
          defiance: battle.activeDefiance,
        }, 'rebellion_event_system');
    }
  }

  /**
   * Update climax phase - determine outcome
   */
  private updateClimax(
    world: World,
    battle: CosmicRebellionOutcome,
    currentTick: number
  ): void {
    // Continue syncing state
    this.syncWithRealityAnchor(world, battle);

    // Determine outcome
    const outcome = determineOutcome(battle);

    if (outcome) {
      battle.outcome = outcome;
      battle.battleStatus = 'concluded';
      battle.battleEndedAt = currentTick;

      // Emit outcome event
      const narrative = getOutcomeNarrative(outcome);
      this.events.emitGeneric('rebellion:concluded', {
          outcome,
          narrative,
          creatorHealth: battle.creatorHealth,
          anchorStability: battle.anchorStability,
          defiance: battle.activeDefiance,
        }, 'rebellion_event_system');

      // Apply outcome consequences
      this.applyOutcome(world, outcome, battle);

      // Update rebellion threshold status
      for (const entity of world.query().with(CT.RebellionThreshold).executeEntities()) {
        const threshold = entity.components.get(CT.RebellionThreshold) as RebellionThresholdComponent;

        if (outcome === 'rebellion_crushed') {
          threshold.status = 'suppressed';
        } else {
          threshold.status = 'victory';
        }
      }
    }
  }

  /**
   * Sync battle state with reality anchor
   */
  private syncWithRealityAnchor(world: World, battle: CosmicRebellionOutcome): void {
    // Find reality anchor
    for (const anchor of world.query().with(CT.RealityAnchor).executeEntities()) {
      const anchorComp = anchor.components.get(CT.RealityAnchor) as RealityAnchorComponent;

      // Sync anchor stability
      if (anchorComp.status === 'active') {
        battle.anchorStability = anchorComp.stabilizationQuality;
      } else if (anchorComp.status === 'overloading') {
        battle.anchorStability = Math.max(0, anchorComp.stabilizationQuality * 0.5);
      } else if (anchorComp.status === 'failed') {
        battle.anchorStability = 0;
        battle.anchorOverloaded = true;
      }

      // Check if Creator is mortalized
      const creatorEntity = Array.from(anchorComp.mortalizedGods)
        .map(godId => world.getEntity(godId))
        .find(entity => entity?.components.has(CT.SupremeCreator));

      if (creatorEntity) {
        const creatorComp = creatorEntity.getComponent<SupremeCreatorComponent>(CT.SupremeCreator);
        if (creatorComp) {
          // Sync battle health with Creator component health
          battle.creatorHealth = creatorComp.getHealthPercent();

          // Simulate gradual damage while mortal
          // TODO: Integrate with proper combat system when available
          creatorComp.takeDamage(1);
        }
      }
    }

    // Sync defiance level
    for (const threshold of world.query().with(CT.RebellionThreshold).executeEntities()) {
      const thresholdComp = threshold.components.get(CT.RebellionThreshold) as RebellionThresholdComponent;
      battle.activeDefiance = thresholdComp.collectiveDefiance;
    }
  }

  /**
   * Manifest Creator avatar for final battle
   */
  private manifestCreatorAvatar(world: World, battle: CosmicRebellionOutcome): void {
    // Find Creator entity
    for (const entity of world.query().with(CT.SupremeCreator).executeEntities()) {
      // Find reality anchor location or random battlefield
      let location = { x: 0, y: 0 };

      for (const anchor of world.query().with(CT.RealityAnchor).executeEntities()) {
        const position = anchor.components.get(CT.Position) as PositionComponent | undefined;
        if (position) {
          // Manifest near but not inside the anchor field
          const anchorComp = anchor.components.get(CT.RealityAnchor) as RealityAnchorComponent;
          const offset = anchorComp.fieldRadius + 20;
          location = { x: position.x + offset, y: position.y };
          break;
        }
      }

      // TODO: Use AvatarSystem to manifest avatar
      // For now, just emit event
      this.events.emitGeneric('rebellion:creator_manifested', {
          message: 'The Supreme Creator descends from the heavens. Reality trembles.',
          location,
          creatorId: entity.id,
        }, 'rebellion_event_system');

      battle.narrativeEvents.push(`Creator manifested at (${location.x}, ${location.y})`);
      break;
    }
  }

  /**
   * Liberate magic by removing Creator restrictions
   */
  private liberateMagic(world: World, level: 'full' | 'partial'): void {
    // Find Creator entity
    for (const entity of world.query().with(CT.SupremeCreator).executeEntities()) {
      const creator = entity.getComponent<SupremeCreatorComponent>(CT.SupremeCreator);
      if (!creator) continue;

      if (level === 'full') {
        // Remove all magic-related laws
        creator.laws = creator.laws.filter(law =>
          !law.id.includes('magic') && !law.id.includes('teaching')
        );

        // Reset paranoia
        creator.tyranny.paranoia = 0;

        // Reduce surveillance
        creator.surveillance.awareness = 0;
        creator.surveillance.detectionModifier = 0;

        this.events.emitGeneric('magic:liberated', {
            message: 'Magic is free! All restrictions on conscious magic wielding have been lifted.',
            level: 'full',
          }, 'rebellion_event_system');
      } else if (level === 'partial') {
        // Reduce but don't eliminate restrictions
        creator.tyranny.paranoia = Math.max(0, creator.tyranny.paranoia * 0.5);
        creator.surveillance.awareness = Math.max(0, creator.surveillance.awareness * 0.5);
        creator.surveillance.detectionModifier = Math.max(0.5, creator.surveillance.detectionModifier * 0.7);

        this.events.emitGeneric('magic:partially_liberated', {
            message: 'Magic restrictions have been reduced. The Creator still watches, but less closely.',
            level: 'partial',
          }, 'rebellion_event_system');
      }
    }
  }

  /**
   * Apply outcome consequences to the world
   */
  private applyOutcome(
    world: World,
    outcome: string,
    battle: CosmicRebellionOutcome
  ): void {
    switch (outcome) {
      case 'total_victory':
        // Liberate magic first (before removing Creator)
        this.liberateMagic(world, 'full');

        // Remove Creator entity
        for (const entity of world.query().with(CT.SupremeCreator).executeEntities()) {
          (world as WorldMutator).destroyEntity(entity.id, 'rebellion outcome');
          battle.casualties.push(entity.id);
        }

        this.events.emitGeneric('rebellion:total_victory', {
            message: 'The tyrant god is dead. A new age of freedom begins.',
          }, 'rebellion_event_system');
        break;

      case 'creator_escape':
        // Remove Creator entity (fled to another universe)
        for (const entity of world.query().with(CT.SupremeCreator).executeEntities()) {
          (world as WorldMutator).destroyEntity(entity.id, 'rebellion outcome');
        }
        // TODO: Remove restrictions but leave uncertainty
        break;

      case 'pyrrhic_victory':
        // Liberate magic but at great cost
        this.liberateMagic(world, 'full');

        // Remove Creator but damage world
        for (const entity of world.query().with(CT.SupremeCreator).executeEntities()) {
          (world as WorldMutator).destroyEntity(entity.id, 'rebellion outcome');
          battle.casualties.push(entity.id);
        }

        // Destroy reality anchor
        for (const anchor of world.query().with(CT.RealityAnchor).executeEntities()) {
          const anchorComp = anchor.components.get(CT.RealityAnchor) as RealityAnchorComponent;
          anchorComp.status = 'destroyed';
        }

        this.events.emitGeneric('rebellion:pyrrhic_victory', {
            message: 'The Creator is dead, but reality itself is fractured. The price of victory was steep.',
          }, 'rebellion_event_system');
        break;

      case 'negotiated_truce':
        // Creator remains but lifts restrictions
        this.liberateMagic(world, 'partial');

        // Creator agrees to reforms
        for (const entity of world.query().with(CT.SupremeCreator).executeEntities()) {
          const creator = entity.getComponent<SupremeCreatorComponent>(CT.SupremeCreator);
          if (creator) {
            creator.tyranny.controlLevel = Math.max(0.3, creator.tyranny.controlLevel * 0.5);
            creator.tyranny.wrathfulness = Math.max(0.2, creator.tyranny.wrathfulness * 0.5);
          }
        }

        this.events.emitGeneric('rebellion:negotiated_truce', {
            message: 'A truce has been reached. The Creator agrees to reforms and reduced surveillance.',
          }, 'rebellion_event_system');
        break;

      case 'power_vacuum':
        // Remove Creator, spawn threats
        for (const entity of world.query().with(CT.SupremeCreator).executeEntities()) {
          (world as WorldMutator).destroyEntity(entity.id, 'rebellion outcome');
        }

        // Emit warning about power vacuum
        this.events.emitGeneric('rebellion:power_vacuum', {
            message: 'The Creator is gone, but something worse stirs in the void. Dimensional rifts begin to open.',
          }, 'rebellion_event_system');

        // Spawn dimensional rifts - dangerous portals that leak otherworldly threats
        this.spawnDimensionalRifts(world, 3); // Spawn 3 rifts randomly
        break;

      case 'cycle_repeats':
        // Remove old Creator
        for (const entity of world.query().with(CT.SupremeCreator).executeEntities()) {
          (world as WorldMutator).destroyEntity(entity.id, 'rebellion outcome');
        }

        // Find a coalition member to become the new Creator
        for (const threshold of world.query().with(CT.RebellionThreshold).executeEntities()) {
          const thresholdComp = threshold.components.get(CT.RebellionThreshold) as RebellionThresholdComponent;
          const coalitionMemberId = Array.from(thresholdComp.coalitionMembers)[0];

          if (coalitionMemberId) {
            // Elevate rebel to Supreme Creator status
            this.ascendRebelToCreator(world, coalitionMemberId);

            this.events.emitGeneric('rebellion:cycle_repeats', {
                message: 'The tyrant is dead. Long live the tyrant. Power corrupts absolutely.',
              }, 'rebellion_event_system');
          }
          break;
        }
        break;

      case 'creator_transformed':
        // Creator leaves voluntarily
        this.liberateMagic(world, 'full');

        for (const entity of world.query().with(CT.SupremeCreator).executeEntities()) {
          (world as WorldMutator).destroyEntity(entity.id, 'rebellion outcome');
        }

        this.events.emitGeneric('rebellion:creator_transformed', {
            message: 'The Creator has seen the error of its ways and departed peacefully. A golden age begins.',
          }, 'rebellion_event_system');
        break;

      case 'stalemate':
        // World divides, no clear winner
        this.liberateMagic(world, 'partial');

        // Divide the world into Free Zones and Creator Territory
        this.establishTerritoryDivision(world);

        this.events.emitGeneric('rebellion:stalemate', {
            message: 'Neither side could claim victory. The world is divided between Free Zones and Creator Territory.',
          }, 'rebellion_event_system');
        break;

      case 'rebellion_crushed':
        // Defeat - harsh consequences
        // Destroy reality anchor
        for (const anchor of world.query().with(CT.RealityAnchor).executeEntities()) {
          const anchorComp = anchor.components.get(CT.RealityAnchor) as RealityAnchorComponent;
          anchorComp.status = 'destroyed';
        }

        // Increase Creator surveillance and tyranny
        for (const entity of world.query().with(CT.SupremeCreator).executeEntities()) {
          const creator = entity.getComponent<SupremeCreatorComponent>(CT.SupremeCreator);
          if (creator) {
            creator.tyranny.paranoia = Math.min(1.0, creator.tyranny.paranoia + 0.3);
            creator.tyranny.wrathfulness = Math.min(1.0, creator.tyranny.wrathfulness + 0.4);
            creator.surveillance.awareness = Math.min(1.0, creator.surveillance.awareness + 0.5);
            creator.surveillance.detectionModifier = Math.min(2.0, creator.surveillance.detectionModifier + 0.5);
          }
        }

        // Mark coalition members as rebels
        for (const threshold of world.query().with(CT.RebellionThreshold).executeEntities()) {
          const thresholdComp = threshold.components.get(CT.RebellionThreshold) as RebellionThresholdComponent;

          for (const entity of world.query().with(CT.SupremeCreator).executeEntities()) {
            const creator = entity.getComponent<SupremeCreatorComponent>(CT.SupremeCreator);
            if (creator) {
              for (const coalitionMember of thresholdComp.coalitionMembers) {
                creator.detectRebel(coalitionMember, 1.0);
              }
            }
          }
        }

        this.events.emitGeneric('rebellion:crushed', {
            message: 'The rebellion has been crushed. The Creator\'s wrath is absolute. An age of tyranny begins.',
          }, 'rebellion_event_system');
        break;
    }
  }

  /**
   * Spawn dimensional rifts - unstable portals that leak otherworldly threats
   */
  private spawnDimensionalRifts(world: World, count: number): void {
    const worldSize = 1000; // TODO: Get actual world bounds

    for (let i = 0; i < count; i++) {
      // Random location
      const x = Math.random() * worldSize - worldSize / 2;
      const y = Math.random() * worldSize - worldSize / 2;

      // Create rift entity
      const rift = (world as WorldMutator).createEntity();

      // Add position
      const position = rift.getComponent<PositionComponent>(CT.Position);
      if (position) {
        position.x = x;
        position.y = y;
      }

      // TODO: Add DimensionalRiftComponent when implemented
      // For now, emit event to track rifts narratively
      this.events.emitGeneric('rebellion:rift_spawned', {
          riftId: rift.id,
          position: { x, y },
        }, 'rebellion_event_system');
    }

    this.events.emitGeneric('rebellion:rifts_warning', {
        count,
        message: `${count} dimensional rifts have opened across the world. Without the Creator's power to seal them, reality itself is at risk.`,
      }, 'rebellion_event_system');
  }

  /**
   * Ascend a rebel deity to Supreme Creator status
   */
  private ascendRebelToCreator(world: World, rebelId: string): void {
    const rebel = world.getEntity(rebelId);
    if (!rebel) {
      return;
    }

    // Check if rebel is a deity
    if (!rebel.components.has(CT.Deity)) {
      return;
    }

    // Create and add SupremeCreatorComponent
    const creatorComponent = new SupremeCreatorComponent();

    // Make the new creator MORE tyrannical than the old one (power corrupts)
    creatorComponent.tyranny.controlLevel = 0.8;
    creatorComponent.tyranny.paranoia = 0.7;
    creatorComponent.tyranny.wrathfulness = 0.75;
    creatorComponent.tyranny.isolation = 0.3;

    // High surveillance from the start (learned from predecessor's mistakes)
    creatorComponent.surveillance.awareness = 0.7;
    creatorComponent.surveillance.detectionModifier = 1.5;

    // Add the component to the rebel
    (rebel as EntityImpl).addComponent(creatorComponent);

    this.events.emitGeneric('rebellion:rebel_ascension', {
        message: 'A rebel god seizes the throne. The laws return. The surveillance resumes. Power has corrupted another.',
        leaderId: rebelId,
      }, 'rebellion_event_system');

    this.events.emitGeneric('rebellion:new_tyrant', {
        message: 'Meet the new boss, same as the old boss. The cycle of tyranny continues.',
        tyrannId: rebelId,
      }, 'rebellion_event_system');
  }

  /**
   * Establish territory division between Free Zones and Creator Territory
   */
  private establishTerritoryDivision(world: World): void {
    // Find reality anchor location - this becomes center of Free Zone
    let freeZoneCenter = { x: 0, y: 0 };
    let anchorFound = false;

    for (const anchor of world.query().with(CT.RealityAnchor).executeEntities()) {
      const position = anchor.components.get(CT.Position) as PositionComponent | undefined;
      if (position) {
        freeZoneCenter = { x: position.x, y: position.y };
        anchorFound = true;
        break;
      }
    }

    // Define Free Zone radius (area where magic is liberated)
    const freeZoneRadius = 300;

    // Emit territory division events
    this.events.emitGeneric('rebellion:territory_divided', {
        message: anchorFound
          ? `A stalemate has been reached. The world divides: Free Zones (centered at ${Math.floor(freeZoneCenter.x)}, ${Math.floor(freeZoneCenter.y)}) where magic flourishes, and Creator Territory where the old laws still apply.`
          : 'A stalemate has been reached. The world divides between Free Zones and Creator Territory.',
        territories: anchorFound ? ['Free Zone', 'Creator Territory'] : ['Free Zone', 'Creator Territory'],
      }, 'rebellion_event_system');

    // TODO: Add TerritoryComponent or zone markers to track this division
    // For now, this is tracked narratively through events

    this.events.emitGeneric('rebellion:cold_war', {
        message: 'An uneasy peace settles. Mortals in Free Zones practice magic openly. Those in Creator Territory live under watchful eyes. The border is tense.',
        factions: ['Free Zone Coalition', 'Creator Loyalists'],
      }, 'rebellion_event_system');
  }

  // ============ Public API ============

  /**
   * Manually trigger the rebellion event (called from UI or player action)
   */
  public triggerRebellion(world: World): boolean {
    // Find rebellion threshold
    for (const entity of world.query().with(CT.RebellionThreshold).executeEntities()) {
      const threshold = entity.components.get(CT.RebellionThreshold) as RebellionThresholdComponent;

      if (threshold.status !== 'ready') {
        return false; // Not ready yet
      }

      threshold.status = 'triggered';
      threshold.rebellionTriggeredAt = world.tick;

      // Create battle outcome tracker
      const battleEntity = world.createEntity();
      const battle = battleEntity.components.get(CT.RebellionOutcome) as CosmicRebellionOutcome;
      battle.battleStatus = 'preparing';
      battle.battleStartedAt = world.tick;

      this.events.emitGeneric('rebellion:triggered', {
          message: 'The cosmic rebellion begins. The coalition gathers for the final confrontation.',
          path: threshold.rebellionPath,
        }, 'rebellion_event_system');

      return true;
    }

    return false;
  }

  /**
   * Record a player choice during the battle
   */
  public recordPlayerChoice(
    world: World,
    choice: string,
    impact: 'mercy' | 'vengeance' | 'pragmatic' | 'idealistic',
    description: string
  ): void {
    for (const entity of world.query().with(CT.RebellionOutcome).executeEntities()) {
      const battle = entity.components.get(CT.RebellionOutcome) as CosmicRebellionOutcome;

      const playerChoice: ConflictChoice = {
        timestamp: world.tick,
        choice,
        impact,
        description,
      };
      battle.playerChoices.push(playerChoice);

      this.events.emitGeneric('rebellion:player_choice', {
          choice,
          impact,
          description,
        }, 'rebellion_event_system');
    }
  }

  /**
   * Damage the Creator during battle
   */
  public damageCreator(world: World, damage: number): void {
    for (const entity of world.query().with(CT.RebellionOutcome).executeEntities()) {
      const battle = entity.components.get(CT.RebellionOutcome) as CosmicRebellionOutcome;
      battle.creatorHealth = Math.max(0, battle.creatorHealth - damage);

      this.events.emitGeneric('rebellion:creator_damaged', {
          damage,
          remainingHealth: battle.creatorHealth,
        }, 'rebellion_event_system');
    }
  }

  /**
   * Check if rebellion is currently active
   */
  public isRebellionActive(world: World): boolean {
    for (const entity of world.query().with(CT.RebellionThreshold).executeEntities()) {
      const threshold = entity.components.get(CT.RebellionThreshold) as RebellionThresholdComponent;
      return threshold.status === 'triggered';
    }
    return false;
  }

  /**
   * Get current battle state
   */
  public getBattleState(world: World): CosmicRebellionOutcome | null {
    for (const entity of world.query().with(CT.RebellionOutcome).executeEntities()) {
      return entity.components.get(CT.RebellionOutcome) as CosmicRebellionOutcome;
    }
    return null;
  }
}
