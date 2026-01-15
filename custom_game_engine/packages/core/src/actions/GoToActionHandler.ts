/**
 * GoToActionHandler - Navigate to a named location
 *
 * Allows agents to navigate to named chunks/locations by name instead of coordinates.
 * Looks up the location in:
 * 1. Agent's personal spatial memory (agent's own names for places)
 * 2. World chunk name registry (shared/global place names)
 * 3. Agent's assigned locations (home, work, etc.)
 *
 * Examples:
 * - { type: "go_to", location: "home" }
 * - { type: "go_to", location: "herb garden" }
 * - { type: "go_to", location: "village center" }
 */

import type { ActionHandler } from './ActionHandler.js';
import type { Action, ActionResult, ValidationResult } from './Action.js';
import type { World } from '../ecs/World.js';
import type { SpatialMemoryComponent } from '../components/SpatialMemoryComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import { findChunkByName } from '../components/SpatialMemoryComponent.js';
import { getAssignedLocation } from '../components/AgentComponent.js';
import { ComponentType } from '../types/ComponentType.js';
import { CHUNK_SIZE } from '@ai-village/world';

export class GoToActionHandler implements ActionHandler {
  public readonly type = 'go_to' as const;
  public readonly description = 'Navigate to a named location';
  public readonly interruptible = true;

  /**
   * Navigation is instant - duration is 0 because navigate behavior handles the actual movement.
   */
  getDuration(action: Action, world: World): number {
    return 0; // Instant - just sets navigate behavior
  }

  /**
   * Validate that the go_to action can be performed.
   *
   * Checks:
   * 1. Action has location parameter
   * 2. Actor entity exists
   * 3. Actor has spatial_memory or agent component
   * 4. Location exists in agent's memory or world registry
   */
  validate(action: Action, world: World): ValidationResult {
    // Check location parameter
    const locationName = action.parameters.location as string | undefined;
    if (!locationName) {
      return {
        valid: false,
        reason: 'go_to action requires location parameter (name of place to navigate to)',
      };
    }

    // Check actor exists
    const actor = world.getEntity(action.actorId);
    if (!actor) {
      return {
        valid: false,
        reason: `Actor entity ${action.actorId} does not exist`,
      };
    }

    // Try to find location
    const location = this.findLocation(actor, world, locationName);
    if (!location) {
      return {
        valid: false,
        reason: `Location "${locationName}" not found in agent memory or world registry`,
      };
    }

    return { valid: true };
  }

  /**
   * Execute the go_to action.
   * Sets navigate behavior with target coordinates.
   */
  execute(action: Action, world: World): ActionResult {
    const actor = world.getEntity(action.actorId);
    if (!actor) {
      return {
        success: false,
        reason: `Actor entity ${action.actorId} does not exist`,
        effects: [],
        events: [],
      };
    }

    const locationName = action.parameters.location as string;
    const location = this.findLocation(actor, world, locationName);

    if (!location) {
      return {
        success: false,
        reason: `Location "${locationName}" not found`,
        effects: [],
        events: [],
      };
    }

    // Set navigate behavior with target coordinates
    const agentComp = actor.components.get(ComponentType.Agent) as AgentComponent | undefined;
    if (!agentComp) {
      return {
        success: false,
        reason: 'Actor does not have agent component',
        effects: [],
        events: [],
      };
    }

    // Update agent to navigate behavior
    const actorImpl = actor as import('../ecs/Entity.js').EntityImpl;
    actorImpl.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'navigate',
      behaviorState: {
        target: { x: location.x, y: location.y },
        locationName, // Store location name for debugging/events
      },
    }));

    return {
      success: true,
      reason: `Navigating to "${locationName}" at (${location.x.toFixed(1)}, ${location.y.toFixed(1)})`,
      effects: [],
      events: [],
    };
  }

  /**
   * Find a location by name.
   * Searches in order:
   * 1. Agent's assigned locations (home, work, etc.)
   * 2. Agent's spatial memory (personal chunk names)
   * 3. World chunk name registry (shared names)
   *
   * @returns { x, y } in world coordinates if found, undefined otherwise
   */
  private findLocation(
    actor: import('../ecs/Entity.js').Entity,
    world: World,
    locationName: string
  ): { x: number; y: number } | undefined {
    const searchName = locationName.toLowerCase().trim();

    // 1. Check agent's assigned locations first (home, work, etc.)
    const agentComp = actor.components.get(ComponentType.Agent) as AgentComponent | undefined;
    if (agentComp) {
      const assigned = getAssignedLocation(agentComp, searchName);
      if (assigned) {
        return { x: assigned.x, y: assigned.y };
      }

      // Also check by location type constants (bed, home, work, etc.)
      const assignedByType = getAssignedLocation(agentComp, searchName);
      if (assignedByType) {
        return { x: assignedByType.x, y: assignedByType.y };
      }
    }

    // 2. Check agent's spatial memory (personal chunk names)
    const spatialMem = actor.components.get(ComponentType.SpatialMemory) as SpatialMemoryComponent | undefined;
    if (spatialMem) {
      const chunk = findChunkByName(spatialMem, searchName);
      if (chunk) {
        // Convert chunk coordinates to world coordinates (center of chunk)
        const centerX = (chunk.chunkX * CHUNK_SIZE) + (CHUNK_SIZE / 2);
        const centerY = (chunk.chunkY * CHUNK_SIZE) + (CHUNK_SIZE / 2);
        return { x: centerX, y: centerY };
      }
    }

    // 3. Check world chunk name registry (shared names)
    const chunkRegistry = world.getChunkNameRegistry();
    const worldChunk = chunkRegistry.findByName(searchName);
    if (worldChunk) {
      // Convert chunk coordinates to world coordinates (center of chunk)
      const centerX = (worldChunk.chunkX * CHUNK_SIZE) + (CHUNK_SIZE / 2);
      const centerY = (worldChunk.chunkY * CHUNK_SIZE) + (CHUNK_SIZE / 2);
      return { x: centerX, y: centerY };
    }

    return undefined;
  }
}
