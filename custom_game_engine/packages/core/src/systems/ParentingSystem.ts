/**
 * ParentingSystem - Updates parenting drives and tracks child wellbeing
 *
 * Creates biological drive to care for offspring while leaving HOW to the LLM.
 * Different species have different parenting behaviors.
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType';
import type { EventBus } from '../events/EventBus';
import { SystemEventManager } from '../events/TypedEventEmitter';
import type { ParentingComponent, ParentingResponsibility } from '../components/ParentingComponent';
import type { NeedsComponent } from '../components/NeedsComponent';
import type { PositionComponent } from '../components/PositionComponent';
import { EntityImpl } from '../ecs/Entity';

/**
 * Configuration for ParentingSystem
 */
export interface ParentingSystemConfig {
  /** How often to update parenting drives (ticks) */
  updateInterval: number;

  /** Threshold for child neglect warning (wellbeing below this) */
  neglectThreshold: number;

  /** Threshold for urgent care (wellbeing below this) */
  urgentThreshold: number;
}

/**
 * Default configuration
 */
export const DEFAULT_PARENTING_CONFIG: ParentingSystemConfig = {
  updateInterval: 20, // Update every 20 ticks (1 second at 20 TPS)
  neglectThreshold: 0.4,
  urgentThreshold: 0.3,
};

/**
 * System that manages parenting drives and child wellbeing
 */
export class ParentingSystem implements System {
  public readonly id = 'parenting' as const;
  public readonly priority = 500; // Run after needs/mood systems
  public readonly requiredComponents = [CT.Parenting] as const;

  public readonly name = 'ParentingSystem';
  private config: ParentingSystemConfig;
  private lastUpdate: number = 0;
  private events!: SystemEventManager;

  constructor(config: Partial<ParentingSystemConfig> = {}) {
    this.config = { ...DEFAULT_PARENTING_CONFIG, ...config };
  }

  initialize(_world: World, eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, this.id);
  }

  public update(world: World, _entities: ReadonlyArray<import('../ecs/Entity.js').Entity>, _deltaTime: number): void {
    // Only update at intervals to reduce CPU load
    if (world.tick - this.lastUpdate < this.config.updateInterval) {
      return;
    }
    this.lastUpdate = world.tick;

    // Find all entities with parenting responsibilities
    const parents = world.query().with(CT.Parenting).executeEntities();

    for (const parent of parents) {
      const parentingComp = (parent as EntityImpl).getComponent<ParentingComponent>(CT.Parenting);
      if (!parentingComp || parentingComp.responsibilities.length === 0) {
        continue;
      }

      // Update each child's wellbeing assessment
      for (const responsibility of parentingComp.responsibilities) {
        this.updateChildWellbeing(world, parent as EntityImpl, responsibility);
      }

      // Increment time since last care
      parentingComp.timeSinceLastCare += this.config.updateInterval;

      // Update parenting drive level
      parentingComp.updateDriveLevel();

      // Check for neglect and emit warnings
      this.checkForNeglect(world, parent as EntityImpl, parentingComp);
    }
  }

  /**
   * Update assessment of child's wellbeing
   */
  private updateChildWellbeing(
    world: World,
    parent: EntityImpl,
    responsibility: ParentingResponsibility
  ): void {
    const child = world.getEntity(responsibility.childId);
    if (!child) {
      // Child no longer exists (died or despawned)
      return;
    }

    // Get child's needs
    const childNeeds = (child as EntityImpl).getComponent<NeedsComponent>(CT.Needs);
    if (!childNeeds) {
      // Child has no needs (may be special entity type)
      responsibility.childWellbeingAssessment = 1.0;
      return;
    }

    // Calculate wellbeing from needs
    // Lower values are worse (hunger: 0 = starving, health: 0 = dying)
    const wellbeing =
      (childNeeds.health * 0.4 +
        childNeeds.hunger * 0.3 +
        childNeeds.energy * 0.2 +
        (childNeeds.thirst ?? 1.0) * 0.1);

    responsibility.childWellbeingAssessment = wellbeing;

    // Update last check-in if parent is nearby
    const parentPos = (parent as EntityImpl).getComponent<PositionComponent>(CT.Position);
    const childPos = (child as EntityImpl).getComponent<PositionComponent>(CT.Position);

    if (parentPos && childPos) {
      const dx = parentPos.x - childPos.x;
      const dy = parentPos.y - childPos.y;
      const distSq = dx * dx + dy * dy;

      // If within 5 tiles, consider it a check-in
      if (distSq < 25) {
        responsibility.lastCheckIn = world.tick;
      }
    }
  }

  /**
   * Check for child neglect and emit warnings
   */
  private checkForNeglect(
    world: World,
    parent: EntityImpl,
    parenting: ParentingComponent
  ): void {
    for (const responsibility of parenting.responsibilities) {
      const wellbeing = responsibility.childWellbeingAssessment;
      const timeSinceCheck = world.tick - responsibility.lastCheckIn;

      // Child in urgent need
      if (wellbeing < this.config.urgentThreshold) {
        if (timeSinceCheck > 1000) {
          // Haven't checked in over 50 seconds - neglect warning
          responsibility.neglectWarnings++;

          // Emit neglect event
          this.events.emit('parenting:neglect', {
            parentId: parent.id,
            childId: responsibility.childId,
            wellbeing,
            warnings: responsibility.neglectWarnings,
          }, parent.id);

          // Add to reputation
          parenting.addNotableEvent(
            'failure',
            `Neglected child with wellbeing ${wellbeing.toFixed(2)}`,
            world.tick,
            -0.1
          );
        }
      }
      // Child below neglect threshold
      else if (wellbeing < this.config.neglectThreshold) {
        if (timeSinceCheck > 2000) {
          // Haven't checked in over 100 seconds
          responsibility.neglectWarnings++;

          this.events.emit('parenting:concern', {
            parentId: parent.id,
            childId: responsibility.childId,
            wellbeing,
          }, parent.id);
        }
      }
      // Child thriving
      else if (wellbeing > 0.8) {
        // Check if this is a sustained improvement
        if (responsibility.neglectWarnings > 0 && timeSinceCheck < 500) {
          // Parent improved! Clear some warnings
          responsibility.neglectWarnings = Math.max(0, responsibility.neglectWarnings - 1);
        }

        // Occasionally reward good parenting
        if (Math.random() < 0.01) {
          // 1% chance per update
          parenting.addNotableEvent(
            'achievement',
            `Child thriving with wellbeing ${wellbeing.toFixed(2)}`,
            world.tick,
            0.05
          );

          this.events.emit('parenting:success', {
            parentId: parent.id,
            childId: responsibility.childId,
            wellbeing,
          }, parent.id);
        }
      }
    }
  }

  /**
   * Called when a parenting action is performed by an agent
   */
  public recordParentingAction(
    world: World,
    parentId: string,
    childId: string,
    actionQuality: number
  ): void {
    const parent = world.getEntity(parentId);
    if (!parent) return;

    const parenting = (parent as EntityImpl).getComponent<ParentingComponent>(CT.Parenting);
    if (!parenting) return;

    // Record the action
    parenting.recordParentingAction(actionQuality);

    // Find the responsibility
    const responsibility = parenting.responsibilities.find((r) => r.childId === childId);
    if (!responsibility) return;

    // Update last check-in
    responsibility.lastCheckIn = world.tick;

    // Emit parenting action event
    this.events.emit('parenting:action', {
      parentId,
      childId,
      quality: actionQuality,
      skill: parenting.parentingSkill,
    }, parentId);
  }

  /**
   * Assign a new child to a parent
   */
  public assignChild(
    world: World,
    parentId: string,
    childId: string,
    isPrimaryCaregiver: boolean,
    otherParents: string[],
    careType: import('../reproduction/MatingParadigm').ParentalCareType,
    durationTicks: number | null
  ): void {
    const parent = world.getEntity(parentId);
    if (!parent) {
      throw new Error(`Parent ${parentId} not found`);
    }

    const parenting = (parent as EntityImpl).getComponent<ParentingComponent>(CT.Parenting);
    if (!parenting) {
      throw new Error(`Parent ${parentId} has no ParentingComponent`);
    }

    const responsibility: ParentingResponsibility = {
      childId,
      isPrimaryCaregiver,
      otherParents,
      startedAt: world.tick,
      endsAt: durationTicks !== null ? world.tick + durationTicks : null,
      careType,
      lastCheckIn: world.tick,
      childWellbeingAssessment: 1.0, // Start optimistic
      neglectWarnings: 0,
    };

    parenting.addChild(responsibility);

    // Emit event
    this.events.emit('parenting:assigned', {
      parentId,
      childId,
      isPrimaryCaregiver,
      careType,
    }, parentId);
  }

  /**
   * Remove a child from a parent's responsibilities (grown up or died)
   */
  public removeChild(world: World, parentId: string, childId: string): void {
    const parent = world.getEntity(parentId);
    if (!parent) return;

    const parenting = (parent as EntityImpl).getComponent<ParentingComponent>(CT.Parenting);
    if (!parenting) return;

    parenting.removeChild(childId);

    // Emit event
    this.events.emit('parenting:ended', {
      parentId,
      childId,
    }, parentId);
  }

  cleanup(): void {
    this.events.cleanup();
  }
}
