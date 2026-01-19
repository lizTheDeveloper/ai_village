import type {
  World,
  Entity,
  PositionComponent,
  AgentComponent,
  BuildingComponent,
  TemperatureComponent,
  SteeringComponent,
  MovementComponent,
  Component,
} from '@ai-village/core';
import type { Camera } from '../Camera.js';

/**
 * Handles rendering of interaction overlays: agent-building interactions, navigation paths.
 * Extracted from Renderer.ts to improve maintainability.
 */
export class InteractionOverlay {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Draw visual indicators for agent-building interactions.
   * Shows when agents are near buildings (seeking warmth, shelter, working on construction).
   */
  drawAgentBuildingInteractions(
    world: World,
    camera: Camera,
    tileSize: number,
    selectedEntity?: Entity | { id: string }
  ): void {
    // Get all agents
    const agents = world.query().with('agent', 'position').executeEntities();

    // Get all buildings
    const buildings = world.query().with('building', 'position').executeEntities();

    const interactionRadius = 2.0; // tiles

    for (const agent of agents) {
      const agentPos = agent.components.get('position') as PositionComponent | undefined;
      const agentComp = agent.components.get('agent') as AgentComponent | undefined;
      const temperature = agent.components.get('temperature') as TemperatureComponent | undefined;

      if (!agentPos || !agentComp) continue;

      // Check if agent is near any building
      for (const building of buildings) {
        const buildingPos = building.components.get('position') as PositionComponent | undefined;
        const buildingComp = building.components.get('building') as BuildingComponent | undefined;

        if (!buildingPos || !buildingComp) continue;

        // Calculate distance
        const dx = agentPos.x - buildingPos.x;
        const dy = agentPos.y - buildingPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= interactionRadius) {
          // Agent is near building - determine interaction type
          let interactionType: string | null = null;
          let interactionColor = '#FFFFFF';

          // Check for warmth interaction (campfire)
          if (buildingComp.buildingType === 'campfire' && buildingComp.isComplete) {
            if (temperature && (temperature.state === 'cold' || temperature.state === 'dangerously_cold')) {
              interactionType = 'WARMTH';
              interactionColor = '#FF6600';
            }
          }

          // Check for shelter interaction (bed, bedroll)
          // NOTE: Multi-tile shelters (houses, tents) now use TileBasedBlueprintRegistry
          if ((buildingComp.buildingType === 'bed' || buildingComp.buildingType === 'bedroll') && buildingComp.isComplete) {
            // Could check for shelter need here if we had that component
            interactionType = 'SHELTER';
            interactionColor = '#00AAFF';
          }

          // Check for construction work
          if (!buildingComp.isComplete && agentComp.behavior === 'build') {
            interactionType = 'BUILDING';
            interactionColor = '#FFAA00';
          }

          // Draw interaction indicator
          if (interactionType) {
            this.drawInteractionIndicator(agentPos, buildingPos, interactionType, interactionColor, camera, tileSize);
          }

          // Only show interaction for selected agent or all agents
          if (!selectedEntity || agent.id === selectedEntity.id) {
            // Already handled above
          }
        }
      }
    }
  }

  /**
   * Draw a line and label between agent and building to show interaction.
   */
  private drawInteractionIndicator(
    agentPos: { x: number; y: number },
    buildingPos: { x: number; y: number },
    interactionType: string,
    color: string,
    camera: Camera,
    tileSize: number
  ): void {
    const agentWorldX = agentPos.x * tileSize + (tileSize / 2);
    const agentWorldY = agentPos.y * tileSize + (tileSize / 2);
    const buildingWorldX = buildingPos.x * tileSize + (tileSize / 2);
    const buildingWorldY = buildingPos.y * tileSize + (tileSize / 2);

    const agentScreen = camera.worldToScreen(agentWorldX, agentWorldY);
    const buildingScreen = camera.worldToScreen(buildingWorldX, buildingWorldY);

    // Draw line
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.globalAlpha = 0.6;
    this.ctx.beginPath();
    this.ctx.moveTo(agentScreen.x, agentScreen.y);
    this.ctx.lineTo(buildingScreen.x, buildingScreen.y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1.0;

    // Draw label at midpoint
    const midX = (agentScreen.x + buildingScreen.x) / 2;
    const midY = (agentScreen.y + buildingScreen.y) / 2;

    const fontSize = Math.max(8, 9 * camera.zoom);
    this.ctx.font = `bold ${fontSize}px monospace`;
    this.ctx.textAlign = 'center';

    // Background
    const metrics = this.ctx.measureText(interactionType);
    const padding = 3;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(
      midX - metrics.width / 2 - padding,
      midY - fontSize,
      metrics.width + padding * 2,
      fontSize + padding
    );

    // Text
    this.ctx.fillStyle = color;
    this.ctx.fillText(interactionType, midX, midY);
    this.ctx.textAlign = 'left';
  }

  /**
   * Draw navigation path for selected entity.
   * Shows a line from current position to destination target.
   */
  drawNavigationPath(
    world: World,
    camera: Camera,
    tileSize: number,
    selectedEntity?: Entity | { id: string }
  ): void {
    if (!selectedEntity) {
      return;
    }

    // Get the full entity from world if we only have an ID
    let entity: Entity | undefined;
    if ('components' in selectedEntity) {
      // Already a full Entity
      entity = selectedEntity;
    } else {
      // Just an ID, look up from world
      entity = world.getEntity(selectedEntity.id);
    }

    if (!entity) return;

    const position = entity.getComponent('position') as PositionComponent | undefined;
    if (!position) return;

    // Try to find a target from multiple sources
    let targetX: number | undefined;
    let targetY: number | undefined;

    // 1. Check steering component first
    const steering = entity.getComponent('steering') as SteeringComponent | undefined;
    if (steering?.target) {
      targetX = steering.target.x;
      targetY = steering.target.y;
    }

    // 2. Check agent.behaviorState.target (used by NavigateBehavior)
    if (targetX === undefined || targetY === undefined) {
      const agent = entity.getComponent('agent') as AgentComponent | undefined;
      const target = agent?.behaviorState?.target as { x: number; y: number } | undefined;
      if (target) {
        targetX = target.x;
        targetY = target.y;
      }
    }

    // 3. Check agent.behaviorState.destination (alternative target field)
    if (targetX === undefined || targetY === undefined) {
      const agent = entity.getComponent('agent') as AgentComponent | undefined;
      const destination = agent?.behaviorState?.destination as { x: number; y: number } | undefined;
      if (destination) {
        targetX = destination.x;
        targetY = destination.y;
      }
    }

    // 4. Check movement component for targetX/targetY (used by BaseBehavior.moveToward)
    if (targetX === undefined || targetY === undefined) {
      const movement = entity.getComponent('movement') as MovementComponent | undefined;
      // Check for target coordinates - hasTarget flag is optional
      if (movement && typeof movement.targetX === 'number' && typeof movement.targetY === 'number') {
        // Only use if coordinates are non-zero (active target)
        if (movement.targetX !== 0 || movement.targetY !== 0) {
          targetX = movement.targetX;
          targetY = movement.targetY;
        }
      }
    }

    // 5. Check pending_action for navigation targets
    if (targetX === undefined || targetY === undefined) {
      const pendingAction = entity.getComponent('pending_action') as Component | undefined;
      if (pendingAction) {
        const actionData = pendingAction as unknown as Record<string, unknown>;
        const targetPos = actionData.targetPos as { x: number; y: number } | undefined;
        const target = actionData.target as { x: number; y: number } | undefined;
        if (targetPos) {
          targetX = targetPos.x;
          targetY = targetPos.y;
        } else if (target) {
          targetX = target.x;
          targetY = target.y;
        }
      }
    }

    // 6. If still no target, check action queue for targetPos
    if (targetX === undefined || targetY === undefined) {
      const actionQueue = entity.getComponent('action_queue') as Component | undefined;

      if (actionQueue) {
        // Try to access queue data - the structure might vary
        let actions: unknown[] = [];

        const queueWithMethods = actionQueue as unknown as {
          peek?: () => unknown;
          isEmpty?: () => boolean;
          queue?: unknown[];
          _queue?: unknown[];
          actions?: unknown[];
        };

        if (typeof queueWithMethods.peek === 'function') {
          const current = queueWithMethods.peek();
          if (current) actions = [current];
        } else if (Array.isArray(queueWithMethods.queue)) {
          actions = queueWithMethods.queue;
        } else if (typeof queueWithMethods.isEmpty === 'function' && !queueWithMethods.isEmpty()) {
          // Last resort: try internal queue property
          actions = queueWithMethods._queue || queueWithMethods.actions || [];
        }

        if (actions.length > 0) {
          const currentAction = actions[0] as Record<string, unknown>;
          const targetPos = currentAction?.targetPos as { x: number; y: number } | undefined;
          if (targetPos) {
            targetX = targetPos.x;
            targetY = targetPos.y;
          }
        }
      }
    }

    // No target found
    if (targetX === undefined || targetY === undefined) {
      return;
    }

    const currentX = position.x * tileSize + (tileSize / 2);
    const currentY = position.y * tileSize + (tileSize / 2);
    const targetWorldX = targetX * tileSize + (tileSize / 2);
    const targetWorldY = targetY * tileSize + (tileSize / 2);

    const currentScreen = camera.worldToScreen(currentX, currentY);
    const targetScreen = camera.worldToScreen(targetWorldX, targetWorldY);

    // Draw dashed line from current position to target
    this.ctx.strokeStyle = '#00CCFF'; // Cyan color
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([8, 4]);
    this.ctx.globalAlpha = 0.7;
    this.ctx.beginPath();
    this.ctx.moveTo(currentScreen.x, currentScreen.y);
    this.ctx.lineTo(targetScreen.x, targetScreen.y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1.0;

    // Draw target marker (circle with cross)
    const markerRadius = Math.max(6, 8 * camera.zoom);

    // Outer circle
    this.ctx.strokeStyle = '#00CCFF';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(targetScreen.x, targetScreen.y, markerRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner cross
    this.ctx.beginPath();
    this.ctx.moveTo(targetScreen.x - markerRadius / 2, targetScreen.y);
    this.ctx.lineTo(targetScreen.x + markerRadius / 2, targetScreen.y);
    this.ctx.moveTo(targetScreen.x, targetScreen.y - markerRadius / 2);
    this.ctx.lineTo(targetScreen.x, targetScreen.y + markerRadius / 2);
    this.ctx.stroke();
  }
}
