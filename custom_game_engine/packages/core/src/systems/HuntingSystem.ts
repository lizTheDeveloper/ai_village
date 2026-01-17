import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { Component } from '../ecs/Component.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { ConflictComponent } from '../components/ConflictComponent.js';
import type { CombatStatsComponent } from '../components/CombatStatsComponent.js';
import { createInjuryComponent, type InjuryComponent } from '../components/InjuryComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';

interface AnimalComponent extends Component {
  readonly type: 'animal';
  readonly version: number;
  species: string;
  danger: number;
  speed: number;
  awareness: number;
  aggression: number;
}

interface EnvironmentComponent extends Component {
  readonly type: 'environment';
  readonly version: number;
  terrain?: string;
  weather?: string;
  timeOfDay?: string;
}

interface InventoryComponent extends Component {
  readonly type: 'inventory';
  readonly version: number;
  items: Array<{ type: string; quantity: number }>;
}

interface EventBus {
  emit(event: string, data: any): void;
  on(event: string, handler: (data: any) => void): void;
}

/**
 * HuntingSystem - Handles hunting wild animals
 *
 * Implements REQ-CON-001: Hunting System
 * - Tracking success based on hunting skill, stealth, terrain, weather, time of day, animal awareness
 * - Kill success based on combat skill and animal speed
 * - Resource generation on success
 * - LLM narrative generation
 * - Hunting skill XP
 * - Counterattack from dangerous animals
 */
export class HuntingSystem extends BaseSystem {
  public readonly id: SystemId = 'hunting';
  public readonly priority = 45; // After movement, before memory
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Conflict];

  private llmProvider?: (prompt: any) => Promise<{ narrative: string }>;

  constructor(llmProvider?: (prompt: any) => Promise<{ narrative: string }>) {
    super();
    this.llmProvider = llmProvider;
  }

  setLLMProvider(provider: (prompt: any) => Promise<{ narrative: string }>): void {
    this.llmProvider = provider;
  }

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;

    // Process all entities with conflict component (already filtered by requiredComponents)
    for (const entity of ctx.activeEntities) {
      let conflict = world.getComponent<ConflictComponent>(entity.id, CT.Conflict);
      if (!conflict || conflict.conflictType !== 'hunting') {
        continue;
      }

      // Start from 'initiated' state
      if (conflict.state === 'initiated') {
        entity.updateComponent<ConflictComponent>(CT.Conflict, (c) => ({
          ...c,
          state: 'tracking',
        }));

        // Emit hunt:started event
        ctx.emit('hunt:started', {
          hunterId: entity.id,
          preyId: conflict.target,
          huntingSkill: 0,
        }, entity.id);

        // Re-fetch conflict after update
        conflict = world.getComponent<ConflictComponent>(entity.id, CT.Conflict)!;
      }

      // Process hunt states until resolved or stuck
      let maxIterations = 10; // Prevent infinite loops
      while (conflict && conflict.state !== 'resolved' && maxIterations-- > 0) {
        const previousState = conflict.state;
        this.processHunt(world, entity, conflict);

        // Re-fetch conflict after processing
        conflict = world.getComponent<ConflictComponent>(entity.id, CT.Conflict);

        // If state didn't change, we're done (waiting for next tick or resolved)
        if (!conflict || conflict.state === previousState) {
          break;
        }
      }
    }
  }

  private processHunt(world: World, hunter: EntityImpl, conflict: ConflictComponent): void {
    // Validate hunter has required components
    if (!world.hasComponent(hunter.id, CT.CombatStats)) {
      throw new Error('Hunter missing required component: combat_stats');
    }

    // Get prey entity
    const prey = world.getEntity(conflict.target);
    if (!prey) {
      throw new Error('Hunt target entity not found');
    }

    if (!world.hasComponent(prey.id, CT.Animal)) {
      throw new Error('Hunt target is not an animal');
    }

    const combatStats = world.getComponent<CombatStatsComponent>(hunter.id, CT.CombatStats);
    const animal = world.getComponent<AnimalComponent>(prey.id, CT.Animal);
    const inventory = world.getComponent<InventoryComponent>(hunter.id, CT.Inventory);

    if (!combatStats || !animal) {
      throw new Error('Required components not found');
    }

    // Process based on current state
    switch (conflict.state) {
      case 'tracking':
        this.processTracking(world, hunter, prey, conflict, combatStats, animal);
        break;

      case 'stalking':
        this.processStalking(world, hunter, prey, conflict, combatStats, animal);
        break;

      case 'kill_success':
        this.processKillSuccess(world, hunter, prey, conflict, combatStats, animal, inventory ?? null);
        break;

      case 'failed':
      case 'lost':
      case 'escape':
        // Hunt is over, mark as resolved
        hunter.updateComponent<ConflictComponent>(CT.Conflict, (c) => ({
          ...c,
          state: 'resolved',
          outcome: 'defender_victory', // Hunt failed
        }));

        // Emit hunt:failed event
        world.eventBus.emit({
          type: 'hunt:failed',
          source: hunter.id,
          data: {
            hunterId: hunter.id,
            preyId: conflict.target,
            reason: conflict.state,
          },
        });
        break;
    }
  }

  private processTracking(
    world: World,
    hunter: EntityImpl,
    _prey: Entity,
    _conflict: ConflictComponent,
    combatStats: CombatStatsComponent,
    animal: AnimalComponent
  ): void {
    // Calculate tracking success
    const huntingSkill = combatStats.huntingSkill || 0;
    const stealthSkill = combatStats.stealthSkill || 0;

    // Get environment modifiers
    let terrainBonus = 0;
    let weatherBonus = 0;
    let timeBonus = 0;

    // Look for environment component on any entity (typically a singleton)
    const envEntities = world.query().with('environment').executeEntities();
    if (envEntities.length > 0) {
      const firstEnvEntity = envEntities[0];
      if (firstEnvEntity) {
        const env = world.getComponent<EnvironmentComponent>(firstEnvEntity.id, 'environment');
        if (env) {
          // Terrain bonuses
          if (env.terrain === 'forest') terrainBonus = 2;
          if (env.terrain === 'plains') terrainBonus = -1;
          if (env.terrain === 'mountains') terrainBonus = 1;

          // Weather bonuses
          if (env.weather === 'rain') weatherBonus = 1; // Masks scent
          if (env.weather === 'clear') weatherBonus = 0;

          // Time bonuses
          if (env.timeOfDay === 'dawn') timeBonus = 1;
          if (env.timeOfDay === 'dusk') timeBonus = 1;
          if (env.timeOfDay === 'noon') timeBonus = -1;
        }
      }
    }

    const trackingPower = huntingSkill + stealthSkill + terrainBonus + weatherBonus + timeBonus;
    const awareness = animal.awareness;

    // Roll for tracking success
    const roll = Math.random() * 20;
    const success = roll + trackingPower > awareness + 10;

    if (success) {
      // Move to stalking phase
      hunter.updateComponent<ConflictComponent>(CT.Conflict, (c) => ({
        ...c,
        state: 'stalking',
      }));
    } else {
      // Lost the trail
      hunter.updateComponent<ConflictComponent>(CT.Conflict, (c) => ({
        ...c,
        state: 'lost',
      }));
    }
  }

  private processStalking(
    world: World,
    hunter: EntityImpl,
    _prey: Entity,
    _conflict: ConflictComponent,
    combatStats: CombatStatsComponent,
    animal: AnimalComponent
  ): void {
    // Calculate kill success based on combat skill vs animal speed
    const combatSkill = combatStats.combatSkill;
    const animalSpeed = animal.speed;

    const killPower = combatSkill + (combatStats.weapon === 'spear' ? 2 : 1);
    const escapePower = animalSpeed;

    const roll = Math.random() * 20;
    const success = roll + killPower > escapePower + 5;

    if (success) {
      // Successful kill
      hunter.updateComponent<ConflictComponent>(CT.Conflict, (c) => ({
        ...c,
        state: 'kill_success',
      }));
    } else {
      // Check for counterattack if dangerous animal
      if (animal.danger >= 5) {
        // Dangerous animal fights back
        const counterRoll = Math.random() * 20;
        if (counterRoll + animal.danger > combatSkill + 10) {
          // Hunter is injured
          const injury = createInjuryComponent({
            injuryType: animal.aggression > 5 ? 'bite' : 'laceration',
            severity: animal.danger > 7 ? 'major' : 'minor',
            location: ['torso', 'arms', 'legs'][Math.floor(Math.random() * 3)] as InjuryComponent['location'],
          });
          hunter.addComponent(injury);
        }
        // Hunt failed
        hunter.updateComponent<ConflictComponent>(CT.Conflict, (c) => ({
          ...c,
          state: 'failed',
        }));
      } else {
        // Animal escapes
        hunter.updateComponent<ConflictComponent>(CT.Conflict, (c) => ({
          ...c,
          state: 'escape',
        }));

        // Emit hunt:injured event if hunter was injured
        if (animal.danger >= 5) {
          world.eventBus.emit({
            type: 'hunt:injured',
            source: hunter.id,
            data: {
              hunterId: hunter.id,
              preyId: _prey.id,
              injuryType: animal.aggression > 5 ? 'bite' : 'laceration',
              severity: animal.danger > 7 ? 'major' : 'minor',
            },
          });
        }
      }
    }
  }

  private processKillSuccess(
    world: World,
    hunter: EntityImpl,
    _prey: Entity,
    _conflict: ConflictComponent,
    combatStats: CombatStatsComponent,
    animal: AnimalComponent,
    inventory: InventoryComponent | null
  ): void {
    // Generate resources
    if (inventory) {
      const meat = { type: 'meat', quantity: Math.max(1, Math.floor(animal.danger / 2)) };
      const hide = { type: 'hide', quantity: 1 };
      const bones = { type: 'bones', quantity: 1 };

      hunter.updateComponent<InventoryComponent>(CT.Inventory, (inv) => ({
        ...inv,
        items: [...inv.items, meat, hide, bones],
      }));
    }

    // Grant hunting skill XP
    hunter.updateComponent<CombatStatsComponent>(CT.CombatStats, (stats) => ({
      ...stats,
      huntingSkill: (stats.huntingSkill || 0) + 0.1,
    }));

    // Generate LLM narrative
    if (this.llmProvider) {
      const identityComp = world.getComponent<IdentityComponent>(hunter.id, CT.Identity);
      const hunterName = identityComp?.name || 'Hunter';

      this.llmProvider({
        type: 'hunting_narrative',
        hunter: { name: hunterName, skill: combatStats.huntingSkill },
        prey: { species: animal.species, danger: animal.danger },
        outcome: 'success',
      }).catch((error) => {
        console.error('[HuntingSystem] LLM narrative generation failed:', error);
      });
    }

    // Mark hunt as resolved with success outcome
    hunter.updateComponent<ConflictComponent>(CT.Conflict, (c) => ({
      ...c,
      state: 'resolved',
      outcome: 'attacker_victory', // Hunt succeeded
    }));

    // Emit hunt:success event
    world.eventBus.emit({
      type: 'hunt:success',
      source: hunter.id,
      data: {
        hunterId: hunter.id,
        preyId: _prey.id,
        resourcesGained: inventory ? ['meat', 'hide', 'bones'] : [],
      },
    });
  }
}
