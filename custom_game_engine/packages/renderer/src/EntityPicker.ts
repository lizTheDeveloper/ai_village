import type {
  World,
  Entity,
  PositionComponent,
  RenderableComponent,
  BuildingComponent,
  AgentComponent,
  AnimalComponent,
  ResourceComponent,
} from '@ai-village/core';
import type { PlantComponent } from '@ai-village/core';
import type { Camera } from './Camera.js';
import type { ChunkManager } from '@ai-village/world';
import { CHUNK_SIZE } from '@ai-village/world';

/**
 * Handles entity detection/picking based on screen coordinates.
 * Used for click detection and selection.
 * Extracted from Renderer.ts to improve maintainability.
 */
export class EntityPicker {
  private tileSize: number;

  constructor(tileSize: number = 16) {
    this.tileSize = tileSize;
  }

  /**
   * Find which entity is at the given screen position.
   * Checks agents, animals, buildings, plants, and resources.
   * Returns the entity at that position, or null if none found.
   *
   * @param screenX Screen X coordinate (in pixels)
   * @param screenY Screen Y coordinate (in pixels)
   * @param world World instance containing entities
   * @param camera Camera instance for coordinate transformation
   * @param chunkManager ChunkManager instance (currently unused but kept for future use)
   * @returns The entity at the screen position, or null if none found
   */
  findEntityAtScreenPosition(
    screenX: number,
    screenY: number,
    world: World,
    camera: Camera,
    chunkManager: ChunkManager
  ): Entity | null {
    const entities = world.query().with('position', 'renderable').executeEntities();
    // Validate camera state
    if (!isFinite(camera.x) || !isFinite(camera.y) || !isFinite(camera.zoom)) {
      console.error(`[EntityPicker] Invalid camera state: x=${camera.x}, y=${camera.y}, zoom=${camera.zoom}`);
      return null;
    }
    if (!isFinite(camera.viewportWidth) || !isFinite(camera.viewportHeight)) {
      console.error(`[EntityPicker] Invalid viewport size: width=${camera.viewportWidth}, height=${camera.viewportHeight}`);
      return null;
    }
    if (camera.viewportWidth === 0 || camera.viewportHeight === 0) {
      console.error(`[EntityPicker] Zero viewport size: width=${camera.viewportWidth}, height=${camera.viewportHeight}`);
      return null;
    }

    let closestEntity: Entity | null = null;
    let closestDistance = Infinity;
    let closestAgent: Entity | null = null;
    let closestAgentDistance = Infinity;

    // Check all entities and find the closest one to the click point
    // Prioritize agents over other entities for better UX
    let agentCount = 0;
    for (const entity of entities) {
      if (!entity || !entity.components) {
        console.warn('[EntityPicker] Entity or entity.components is null/undefined');
        continue;
      }
      const pos = entity.components.get('position') as PositionComponent | undefined;
      const renderable = entity.components.get('renderable') as RenderableComponent | undefined;

      if (!pos || !renderable || !renderable.visible) continue;

      const hasAgent = entity.components.has('agent');
      const hasPlant = entity.components.has('plant');
      const hasAnimal = entity.components.has('animal');
      const hasResource = entity.components.has('resource');

      // Calculate world pixel coordinates
      const worldX = pos.x * this.tileSize;
      const worldY = pos.y * this.tileSize;

      // Convert to screen coordinates
      const screen = camera.worldToScreen(worldX, worldY);

      // Validate screen coordinates
      if (!isFinite(screen.x) || !isFinite(screen.y)) {
        if (hasAgent) {
          console.warn(`[EntityPicker] Agent ${agentCount + 1} has invalid screen coords: screen=(${screen.x}, ${screen.y}), world=(${worldX}, ${worldY}), pos=(${pos.x}, ${pos.y})`);
        }
        continue;
      }

      const tilePixelSize = this.tileSize * camera.zoom;

      // Calculate entity center on screen
      const centerX = screen.x + tilePixelSize / 2;
      const centerY = screen.y + tilePixelSize / 2;

      // Calculate squared distance from click to entity center (avoids sqrt)
      const distanceSquared = (screenX - centerX) ** 2 + (screenY - centerY) ** 2;

      // Determine click radius based on entity type (pre-squared for comparison)
      // Agents need a VERY large radius to be easily clickable (16 tiles = 256 pixels at zoom 1.0)
      // Animals need a large radius to be easily clickable (8 tiles)
      // Plants and resources (trees, bushes) need a moderate radius to be clickable (3 tiles)
      // Other entities use default (0.5 tiles)
      let clickRadiusSquared = (tilePixelSize / 2) * (tilePixelSize / 2);
      if (hasAgent) {
        clickRadiusSquared = (tilePixelSize * 16) * (tilePixelSize * 16); // Increased from 8 to 16 for more forgiving clicks
      } else if (hasAnimal) {
        clickRadiusSquared = (tilePixelSize * 8) * (tilePixelSize * 8); // Same as original agent radius
      } else if (hasPlant || hasResource) {
        clickRadiusSquared = (tilePixelSize * 3) * (tilePixelSize * 3); // Trees, plants, berry bushes
      }

      if (hasAgent) {
        agentCount++;
      }

      // Check if click is within radius using squared distance
      const passesDistanceCheck = distanceSquared <= clickRadiusSquared;
      const passesClosestCheck = distanceSquared < closestDistance;
      if (hasAgent) {
      }

      // Track closest agent separately (for prioritization)
      if (hasAgent && passesDistanceCheck && distanceSquared < closestAgentDistance) {
        closestAgent = entity;
        closestAgentDistance = distanceSquared;
      }

      // Track closest entity overall
      if (passesDistanceCheck && passesClosestCheck) {
        closestEntity = entity;
        closestDistance = distanceSquared;
      }
    }


    // PRIORITY: Only prefer agent if click is actually close to the agent (within 2 tiles)
    // This prevents agents from "stealing" clicks meant for nearby plants/animals
    const tilePixelSize = this.tileSize * camera.zoom;
    const agentPriorityRadiusSquared = (tilePixelSize * 2) * (tilePixelSize * 2); // Only prioritize agent if click is very close

    if (closestAgent && closestAgentDistance <= agentPriorityRadiusSquared) {
      return closestAgent;
    }

    // Return the closest entity (whichever type is actually closest)
    if (closestEntity) {
      return closestEntity;
    }

    // If no entity within normal range but an agent is within its extended range, return agent
    if (closestAgent) {
      return closestAgent;
    }

    // If no entity found within radius, select the closest agent if it's reasonably close (within full viewport)
    // FIXED: Increased max search distance to full viewport since clicks can be anywhere on screen
    if (agentCount > 0) {
      let nearestAgent: Entity | null = null;
      let nearestDistanceSquared = Infinity;
      // Use full viewport diagonal distance as maximum (squared for comparison)
      const maxSearchDistanceSquared = camera.viewportWidth ** 2 + camera.viewportHeight ** 2;

      for (const entity of entities) {
        if (!entity || !entity.components) continue;
        if (!entity.components.has('agent')) continue;

        const pos = entity.components.get('position') as PositionComponent | undefined;
        const renderable = entity.components.get('renderable') as RenderableComponent | undefined;

        if (!pos || !renderable || !renderable.visible) continue;

        const worldX = pos.x * this.tileSize;
        const worldY = pos.y * this.tileSize;
        const screen = camera.worldToScreen(worldX, worldY);

        if (!isFinite(screen.x) || !isFinite(screen.y)) continue;

        const tilePixelSize = this.tileSize * camera.zoom;
        const centerX = screen.x + tilePixelSize / 2;
        const centerY = screen.y + tilePixelSize / 2;
        const distanceSquared = (screenX - centerX) ** 2 + (screenY - centerY) ** 2; // Use squared distance


        if (distanceSquared < nearestDistanceSquared && distanceSquared < maxSearchDistanceSquared) {
          nearestAgent = entity;
          nearestDistanceSquared = distanceSquared;
        }
      }

      if (nearestAgent) {
        return nearestAgent;
      } else {
      }
    }

    return null;
  }
}
