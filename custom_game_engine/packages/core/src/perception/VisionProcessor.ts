/**
 * VisionProcessor - Handles visual perception for agents
 *
 * This processor detects nearby entities (resources, plants, agents) within
 * an agent's vision range and updates the VisionComponent and MemoryComponent.
 *
 * Part of Phase 3 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';
import type { MemoryComponent } from '../components/MemoryComponent.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';
import type { PlantComponent } from '../components/PlantComponent.js';
import { addMemory } from '../components/MemoryComponent.js';

/**
 * Vision processing result
 */
export interface VisionResult {
  seenResources: string[];
  seenPlants: string[];
  seenAgents: string[];
}

/**
 * VisionProcessor Class
 *
 * Usage:
 * ```typescript
 * const visionProcessor = new VisionProcessor();
 *
 * // In system update loop
 * visionProcessor.process(entity, world);
 * ```
 */
export class VisionProcessor {
  /**
   * Process vision for an entity, detecting nearby entities and updating components.
   */
  process(entity: EntityImpl, world: World): VisionResult {
    const vision = entity.getComponent<VisionComponent>('vision');
    let memory = entity.getComponent<MemoryComponent>('memory');

    if (!vision || !memory) {
      return { seenResources: [], seenPlants: [], seenAgents: [] };
    }

    const position = entity.getComponent<PositionComponent>('position');
    if (!position) {
      return { seenResources: [], seenPlants: [], seenAgents: [] };
    }

    const seenResourceIds: string[] = [];
    const seenAgentIds: string[] = [];
    const seenPlantIds: string[] = [];

    // Detect nearby resources (returns updated memory)
    if (vision.canSeeResources) {
      memory = this.detectResources(entity, world, position, vision, memory, seenResourceIds);
    }

    // Detect nearby plants (returns updated memory)
    memory = this.detectPlants(entity, world, position, vision, memory, seenPlantIds);

    // Detect nearby agents (returns updated memory)
    if (vision.canSeeAgents) {
      memory = this.detectAgents(entity, world, position, vision, memory, seenAgentIds);
    }

    // Update memory component with all accumulated memories
    entity.updateComponent<MemoryComponent>('memory', () => memory);

    // Update vision component with currently seen entities
    entity.updateComponent<VisionComponent>('vision', (current) => ({
      ...current,
      seenAgents: seenAgentIds,
      seenResources: seenResourceIds,
      seenPlants: seenPlantIds,
    }));

    return {
      seenResources: seenResourceIds,
      seenPlants: seenPlantIds,
      seenAgents: seenAgentIds,
    };
  }

  /**
   * Detect nearby resources within vision range.
   * Returns updated memory with all seen resources.
   */
  private detectResources(
    _entity: EntityImpl,
    world: World,
    position: PositionComponent,
    vision: VisionComponent,
    memory: MemoryComponent,
    seenResourceIds: string[]
  ): MemoryComponent {
    const resources = world.query().with('resource').with('position').executeEntities();
    let currentMemory = memory;

    for (const resource of resources) {
      const resourceImpl = resource as EntityImpl;
      const resourcePos = resourceImpl.getComponent<PositionComponent>('position');
      const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource');

      if (!resourcePos || !resourceComp) continue;

      const distance = this.distance(position, resourcePos);

      if (distance <= vision.range && resourceComp.amount > 0) {
        // Track this resource in vision
        seenResourceIds.push(resource.id);

        // Remember this resource location (accumulate in currentMemory)
        currentMemory = addMemory(
          currentMemory,
          {
            type: 'resource_location',
            x: resourcePos.x,
            y: resourcePos.y,
            entityId: resource.id,
            metadata: { resourceType: resourceComp.resourceType },
          },
          world.tick,
          80
        );
      }
    }

    return currentMemory;
  }

  /**
   * Detect nearby plants within vision range.
   * Returns updated memory with all seen plants.
   */
  private detectPlants(
    _entity: EntityImpl,
    world: World,
    position: PositionComponent,
    vision: VisionComponent,
    memory: MemoryComponent,
    seenPlantIds: string[]
  ): MemoryComponent {
    const plants = world.query().with('plant').with('position').executeEntities();
    let currentMemory = memory;

    for (const plantEntity of plants) {
      const plantImpl = plantEntity as EntityImpl;
      const plantPos = plantImpl.getComponent<PositionComponent>('position');
      const plant = plantImpl.getComponent<PlantComponent>('plant');

      if (!plantPos || !plant) continue;

      const distance = this.distance(position, plantPos);

      if (distance <= vision.range) {
        // Track this plant in vision
        seenPlantIds.push(plantEntity.id);

        // Remember this plant location (accumulate in currentMemory)
        currentMemory = addMemory(
          currentMemory,
          {
            type: 'plant_location',
            x: plantPos.x,
            y: plantPos.y,
            entityId: plantEntity.id,
            metadata: {
              speciesId: plant.speciesId,
              stage: plant.stage,
              hasSeeds: plant.seedsProduced > 0,
              hasFruit: (plant.fruitCount || 0) > 0,
            },
          },
          world.tick,
          80
        );
      }
    }

    return currentMemory;
  }

  /**
   * Detect nearby agents within vision range.
   * Returns updated memory with all seen agents.
   */
  private detectAgents(
    entity: EntityImpl,
    world: World,
    position: PositionComponent,
    vision: VisionComponent,
    memory: MemoryComponent,
    seenAgentIds: string[]
  ): MemoryComponent {
    const agents = world.query().with('agent').with('position').executeEntities();
    let currentMemory = memory;

    for (const otherAgent of agents) {
      if (otherAgent.id === entity.id) continue;

      const otherPos = (otherAgent as EntityImpl).getComponent<PositionComponent>('position');
      if (!otherPos) continue;

      const distance = this.distance(position, otherPos);

      if (distance <= vision.range) {
        // Track this agent in vision
        seenAgentIds.push(otherAgent.id);

        // Remember this agent sighting (accumulate in currentMemory)
        currentMemory = addMemory(
          currentMemory,
          {
            type: 'agent_seen',
            x: otherPos.x,
            y: otherPos.y,
            entityId: otherAgent.id,
          },
          world.tick,
          60
        );
      }
    }

    return currentMemory;
  }

  /**
   * Calculate distance between two positions.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// ============================================================================
// Standalone functions for simpler usage
// ============================================================================

const visionProcessor = new VisionProcessor();

/**
 * Process vision for an entity.
 */
export function processVision(entity: Entity, world: World): VisionResult {
  return visionProcessor.process(entity as EntityImpl, world);
}
