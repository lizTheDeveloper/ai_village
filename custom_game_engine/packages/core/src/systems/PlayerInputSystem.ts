import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  PlayerControlComponent,
  MovementDirection,
  PendingInteraction,
} from '../components/index.js';

/**
 * PlayerInputSystem - Processes player input when possessing an agent
 *
 * Phase 16: Polish & Player - Player Avatar System
 *
 * Responsibilities:
 * - Capture keyboard input (WASD) and convert to movement commands
 * - Capture mouse clicks and convert to interaction commands
 * - Update PlayerControlComponent with player commands
 * - Only process input when in 'possessed' mode
 *
 * Note: This system only captures and stores commands.
 * Command execution is handled by other systems:
 * - PlayerActionSystem executes movement/interaction commands
 * - AgentBrainSystem is skipped when agent is player_controlled
 */
export class PlayerInputSystem extends BaseSystem {
  public readonly id = 'player_input' as const;
  public readonly priority = 4; // Very high priority - run before PossessionSystem
  public readonly requiredComponents = [] as const;
  protected readonly throttleInterval = 0; // EVERY_TICK - critical player responsiveness

  private keysPressed: Set<string> = new Set();
  private mouseClick: { x: number; y: number; button: number } | null = null;

  /**
   * Register keyboard event listeners
   * Call this once during initialization
   */
  public registerKeyboardListeners(window: Window): void {
    window.addEventListener('keydown', (e) => {
      this.keysPressed.add(e.key.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.key.toLowerCase());
    });
  }

  /**
   * Register mouse click listener
   * Call this once during initialization
   */
  public registerMouseListener(
    canvas: HTMLCanvasElement,
    getWorldCoordinates: (screenX: number, screenY: number) => { x: number; y: number }
  ): void {
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldCoords = getWorldCoordinates(screenX, screenY);

      this.mouseClick = {
        x: worldCoords.x,
        y: worldCoords.y,
        button: e.button,
      };
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Get player control entity
    const playerControlEntities = ctx.world
      .query()
      .with('player_control')
      .executeEntities();

    if (playerControlEntities.length === 0) {
      return;
    }

    const playerEntity = playerControlEntities[0];
    if (!playerEntity) {
      return;
    }
    const playerControl = playerEntity.components.get('player_control') as PlayerControlComponent;

    if (!playerControl || !playerControl.isPossessed) {
      // Not in possessed mode - clear any pending input
      this.mouseClick = null;
      return;
    }

    // Process keyboard input for movement
    const movementCommand = this.getMovementFromKeys();

    // Process mouse click for interaction
    const pendingInteraction = this.getInteractionFromMouse(currentTick);

    // Update player control component
    (playerEntity as EntityImpl).updateComponent('player_control', (current: PlayerControlComponent) => ({
      ...current,
      movementCommand,
      pendingInteraction: pendingInteraction || current.pendingInteraction,
      lastInputTick: movementCommand || pendingInteraction ? currentTick : current.lastInputTick,
    }));

    // Clear mouse click after processing
    if (this.mouseClick) {
      this.mouseClick = null;
    }
  }

  /**
   * Convert WASD keys to movement direction
   */
  private getMovementFromKeys(): MovementDirection | null {
    const w = this.keysPressed.has('w');
    const a = this.keysPressed.has('a');
    const s = this.keysPressed.has('s');
    const d = this.keysPressed.has('d');

    // Diagonal movement
    if (w && a) return 'up-left';
    if (w && d) return 'up-right';
    if (s && a) return 'down-left';
    if (s && d) return 'down-right';

    // Cardinal movement
    if (w) return 'up';
    if (s) return 'down';
    if (a) return 'left';
    if (d) return 'right';

    return null;
  }

  /**
   * Convert mouse click to interaction command
   */
  private getInteractionFromMouse(currentTick: number): PendingInteraction | null {
    if (!this.mouseClick) {
      return null;
    }

    // Left click = move or interact
    // Right click = use item/ability
    const interactionType = this.mouseClick.button === 0 ? 'move' : 'use';

    return {
      targetX: this.mouseClick.x,
      targetY: this.mouseClick.y,
      type: interactionType,
      queuedTick: currentTick,
    };
  }

  /**
   * Clear all input state (useful for cleanup or mode switching)
   */
  public clearInput(): void {
    this.keysPressed.clear();
    this.mouseClick = null;
  }
}
