import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  PlayerControlComponent,
  MovementDirection,
} from '../components/PlayerControlComponent.js';
import type { VelocityComponentData } from '../components/VelocityComponent.js';
import { VelocityComponent, createVelocityComponent } from '../components/VelocityComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';

/**
 * PlayerActionSystem - Translates player movement commands into entity velocity
 *
 * MVEE Sprint 1: Player Avatar Movement
 *
 * Reads movementCommand from PlayerControlComponent and sets velocity on the
 * possessed agent entity. Works with SteeringSystem (set to 'none') and
 * MovementSystem (handles collision).
 *
 * Priority 6: After PlayerInputSystem (4) and PossessionSystem (5),
 * before AgentBrainSystem (10) and SteeringSystem (15).
 */
export class PlayerActionSystem extends BaseSystem {
  public readonly id = 'player_action' as const;
  public readonly priority = 6;
  public readonly requiredComponents: string[] = [] as const;
  public readonly activationComponents = ['player_control'] as const;
  protected readonly throttleInterval = 0; // EVERY_TICK - critical responsiveness

  /** Player movement speed in tiles/second */
  private readonly playerSpeed = 3.0;

  /** Direction vectors for movement commands */
  private static readonly DIRECTION_VECTORS: Record<MovementDirection, { vx: number; vy: number }> = {
    'up':         { vx:  0,    vy: -1 },
    'down':       { vx:  0,    vy:  1 },
    'left':       { vx: -1,    vy:  0 },
    'right':      { vx:  1,    vy:  0 },
    'up-left':    { vx: -0.707, vy: -0.707 },
    'up-right':   { vx:  0.707, vy: -0.707 },
    'down-left':  { vx: -0.707, vy:  0.707 },
    'down-right': { vx:  0.707, vy:  0.707 },
  };

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world as unknown as World;

    const playerControlEntities = world
      .query()
      .with('player_control')
      .executeEntities();

    if (playerControlEntities.length === 0) {
      return;
    }

    const playerEntity = playerControlEntities[0];
    if (!playerEntity) return;

    const playerControl = playerEntity.getComponent<PlayerControlComponent>('player_control');
    if (!playerControl || !playerControl.isPossessed || !playerControl.possessedAgentId) {
      return;
    }

    const possessedEntity = world.getEntity(playerControl.possessedAgentId);
    if (!possessedEntity) return;

    // Convert movement command to velocity
    if (playerControl.movementCommand) {
      const dir = PlayerActionSystem.DIRECTION_VECTORS[playerControl.movementCommand];
      const vx = dir.vx * this.playerSpeed;
      const vy = dir.vy * this.playerSpeed;

      this.setEntityVelocity(possessedEntity, vx, vy);
    } else {
      // No movement command - stop
      this.setEntityVelocity(possessedEntity, 0, 0);
    }
  }

  private setEntityVelocity(entity: Entity, vx: number, vy: number): void {
    if (entity.hasComponent('velocity')) {
      (entity as EntityImpl).updateComponent<VelocityComponent>('velocity', (c) => ({
        ...c,
        vx,
        vy,
      }));
    } else {
      // Add velocity component if missing
      (entity as EntityImpl).addComponent(createVelocityComponent(vx, vy));
    }
  }
}
