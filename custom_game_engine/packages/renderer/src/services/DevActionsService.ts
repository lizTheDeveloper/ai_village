/**
 * DevActionsService - Centralized service for dev tool mutations
 *
 * Provides a clean interface for UI panels to mutate game state.
 * All mutations go through this service to ensure consistency and validation.
 */

import type { World, Entity } from '@ai-village/core';

export interface DevActionsResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface SkillLevel {
  level: number;
  experience: number;
  totalExperience: number;
}

/**
 * Service for performing dev/admin actions on game entities.
 * Used by AgentInfoPanel sections to mutate game state.
 */
export class DevActionsService {
  private world: World | null = null;

  /**
   * Set the world instance for mutations.
   */
  setWorld(world: World): void {
    this.world = world;
  }

  /**
   * Get the current world instance.
   */
  getWorld(): World | null {
    return this.world;
  }

  /**
   * Set an agent's need value.
   * @param agentId - The agent entity ID
   * @param need - The need type (hunger, energy, health, thirst)
   * @param value - The value (0.0 = critical, 1.0 = satisfied)
   */
  setNeed(agentId: string, need: string, value: number): DevActionsResult {
    if (!this.world) {
      return { success: false, error: 'World not set' };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Entity not found: ${agentId}` };
    }

    const needs = entity.components.get('needs') as Record<string, number> | undefined;
    if (!needs) {
      return { success: false, error: 'Entity does not have needs component' };
    }

    const validNeeds = ['hunger', 'energy', 'health', 'thirst', 'social', 'safety'];
    if (!validNeeds.includes(need)) {
      return { success: false, error: `Invalid need type: ${need}` };
    }

    // Clamp value to 0-1 range
    const clampedValue = Math.max(0, Math.min(1, value));
    needs[need] = clampedValue;

    return { success: true, data: { agentId, need, value: clampedValue } };
  }

  /**
   * Set an agent's skill level.
   * @param agentId - The agent entity ID
   * @param skill - The skill ID
   * @param level - The level (0-5)
   */
  setSkillLevel(agentId: string, skill: string, level: number): DevActionsResult {
    if (!this.world) {
      return { success: false, error: 'World not set' };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Entity not found: ${agentId}` };
    }

    const skills = entity.components.get('skills') as {
      levels?: Record<string, number>;
      experience?: Record<string, number>;
      totalExperience?: Record<string, number>;
    } | undefined;

    if (!skills) {
      return { success: false, error: 'Entity does not have skills component' };
    }

    // Validate level
    if (level < 0 || level > 5 || !Number.isInteger(level)) {
      return { success: false, error: 'Level must be an integer between 0 and 5' };
    }

    // Initialize if needed
    if (!skills.levels) skills.levels = {};
    if (!skills.experience) skills.experience = {};
    if (!skills.totalExperience) skills.totalExperience = {};

    // Set the skill level
    skills.levels[skill] = level;

    // Set corresponding XP thresholds
    const xpThresholds: Record<number, number> = {
      0: 0,
      1: 100,
      2: 300,
      3: 700,
      4: 1500,
      5: 3000,
    };
    skills.totalExperience[skill] = xpThresholds[level] || 0;
    skills.experience[skill] = 0;

    return { success: true, data: { agentId, skill, level } };
  }

  /**
   * Grant XP to a specific skill.
   * @param agentId - The agent entity ID
   * @param skill - The skill ID
   * @param xp - The XP amount to grant
   */
  grantSkillXP(agentId: string, skill: string, xp: number): DevActionsResult {
    if (!this.world) {
      return { success: false, error: 'World not set' };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Entity not found: ${agentId}` };
    }

    const skills = entity.components.get('skills') as {
      levels?: Record<string, number>;
      experience?: Record<string, number>;
      totalExperience?: Record<string, number>;
    } | undefined;

    if (!skills) {
      return { success: false, error: 'Entity does not have skills component' };
    }

    // Initialize if needed
    if (!skills.levels) skills.levels = {};
    if (!skills.experience) skills.experience = {};
    if (!skills.totalExperience) skills.totalExperience = {};

    // Add XP
    const currentTotal = skills.totalExperience[skill] || 0;
    skills.totalExperience[skill] = currentTotal + xp;

    // Check for level up
    const xpThresholds: number[] = [0, 100, 300, 700, 1500, 3000];
    const newTotal = skills.totalExperience[skill] || 0;
    let newLevel = 0;
    for (let i = xpThresholds.length - 1; i >= 0; i--) {
      const threshold = xpThresholds[i];
      if (threshold !== undefined && newTotal >= threshold) {
        newLevel = i;
        break;
      }
    }

    const oldLevel = skills.levels[skill] || 0;
    skills.levels[skill] = Math.min(5, newLevel);

    return {
      success: true,
      data: {
        agentId,
        skill,
        xpGranted: xp,
        newTotal,
        oldLevel,
        newLevel: skills.levels[skill],
        leveledUp: skills.levels[skill] > oldLevel,
      },
    };
  }

  /**
   * Give an item to an agent's inventory.
   * @param agentId - The agent entity ID
   * @param itemType - The item type ID
   * @param amount - The quantity to give
   */
  giveItem(agentId: string, itemType: string, amount: number = 1): DevActionsResult {
    if (!this.world) {
      return { success: false, error: 'World not set' };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Entity not found: ${agentId}` };
    }

    const inventory = entity.components.get('inventory') as {
      slots: Array<{ itemId: string; quantity: number } | null>;
      maxSlots: number;
      currentWeight: number;
    } | undefined;

    if (!inventory) {
      return { success: false, error: 'Entity does not have inventory component' };
    }

    // Find existing stack or empty slot
    let slotIndex = -1;
    for (let i = 0; i < inventory.slots.length; i++) {
      const slot = inventory.slots[i];
      if (slot && slot.itemId === itemType) {
        // Found existing stack
        slotIndex = i;
        break;
      } else if (!slot && slotIndex === -1) {
        // Found empty slot
        slotIndex = i;
      }
    }

    if (slotIndex === -1) {
      return { success: false, error: 'Inventory is full' };
    }

    // Add to inventory
    if (inventory.slots[slotIndex]) {
      inventory.slots[slotIndex]!.quantity += amount;
    } else {
      inventory.slots[slotIndex] = { itemId: itemType, quantity: amount };
    }

    return { success: true, data: { agentId, itemType, amount } };
  }

  /**
   * Remove an item from an agent's inventory.
   * @param agentId - The agent entity ID
   * @param itemType - The item type ID
   * @param amount - The quantity to remove
   */
  removeItem(agentId: string, itemType: string, amount: number = 1): DevActionsResult {
    if (!this.world) {
      return { success: false, error: 'World not set' };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Entity not found: ${agentId}` };
    }

    const inventory = entity.components.get('inventory') as {
      slots: Array<{ itemId: string; quantity: number } | null>;
    } | undefined;

    if (!inventory) {
      return { success: false, error: 'Entity does not have inventory component' };
    }

    // Find the item
    for (let i = 0; i < inventory.slots.length; i++) {
      const slot = inventory.slots[i];
      if (slot && slot.itemId === itemType) {
        if (slot.quantity <= amount) {
          // Remove entire slot
          inventory.slots[i] = null;
        } else {
          slot.quantity -= amount;
        }
        return { success: true, data: { agentId, itemType, amountRemoved: Math.min(amount, slot.quantity) } };
      }
    }

    return { success: false, error: `Item not found in inventory: ${itemType}` };
  }

  /**
   * Teleport an agent to a new position.
   * @param agentId - The agent entity ID
   * @param x - The new X coordinate
   * @param y - The new Y coordinate
   */
  teleport(agentId: string, x: number, y: number): DevActionsResult {
    if (!this.world) {
      return { success: false, error: 'World not set' };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Entity not found: ${agentId}` };
    }

    const position = entity.components.get('position') as {
      x: number;
      y: number;
    } | undefined;

    if (!position) {
      return { success: false, error: 'Entity does not have position component' };
    }

    const oldX = position.x;
    const oldY = position.y;

    position.x = x;
    position.y = y;

    return { success: true, data: { agentId, oldX, oldY, newX: x, newY: y } };
  }

  /**
   * Trigger a specific behavior on an agent.
   * @param agentId - The agent entity ID
   * @param behavior - The behavior to trigger
   */
  triggerBehavior(agentId: string, behavior: string): DevActionsResult {
    if (!this.world) {
      return { success: false, error: 'World not set' };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Entity not found: ${agentId}` };
    }

    const agent = entity.components.get('agent') as {
      currentBehavior?: string;
      behavior?: string;
    } | undefined;

    if (!agent) {
      return { success: false, error: 'Entity is not an agent' };
    }

    // Set behavior (try both field names for compatibility)
    if ('currentBehavior' in agent) {
      agent.currentBehavior = behavior;
    }
    if ('behavior' in agent) {
      agent.behavior = behavior;
    }

    return { success: true, data: { agentId, behavior } };
  }

  /**
   * Set a relationship value between two agents.
   * @param agentId - The source agent ID
   * @param targetId - The target agent ID
   * @param field - The relationship field (trust, impression, etc.)
   * @param value - The new value
   */
  setRelationship(agentId: string, targetId: string, field: string, value: number): DevActionsResult {
    if (!this.world) {
      return { success: false, error: 'World not set' };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Entity not found: ${agentId}` };
    }

    const socialMemory = entity.components.get('social_memory') as {
      relationships?: Map<string, Record<string, number>> | Record<string, Record<string, number>>;
    } | undefined;

    if (!socialMemory) {
      return { success: false, error: 'Entity does not have social_memory component' };
    }

    // Handle both Map and Object storage
    let relationships = socialMemory.relationships;
    if (!relationships) {
      socialMemory.relationships = new Map();
      relationships = socialMemory.relationships;
    }

    // Get or create relationship entry
    let targetRelation: Record<string, number>;
    if (relationships instanceof Map) {
      if (!relationships.has(targetId)) {
        relationships.set(targetId, {});
      }
      targetRelation = relationships.get(targetId)!;
    } else {
      if (!relationships[targetId]) {
        relationships[targetId] = {};
      }
      targetRelation = relationships[targetId];
    }

    // Set the field
    targetRelation[field] = value;

    return { success: true, data: { agentId, targetId, field, value } };
  }

  /**
   * Add a memory to an agent.
   * @param agentId - The agent entity ID
   * @param memoryType - Type: 'episodic' | 'semantic'
   * @param content - The memory content
   */
  addMemory(agentId: string, memoryType: 'episodic' | 'semantic', content: string): DevActionsResult {
    if (!this.world) {
      return { success: false, error: 'World not set' };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Entity not found: ${agentId}` };
    }

    if (memoryType === 'episodic') {
      const episodicMemory = entity.components.get('episodic_memory') as {
        memories?: Array<{ content: string; tick: number; importance: number }>;
      } | undefined;

      if (!episodicMemory) {
        return { success: false, error: 'Entity does not have episodic_memory component' };
      }

      if (!episodicMemory.memories) {
        episodicMemory.memories = [];
      }

      // Get current tick from world time
      const timeEntity = this.world.query().with('time').executeEntities()[0];
      const time = timeEntity?.components.get('time') as { tick?: number } | undefined;
      const tick = time?.tick || 0;

      episodicMemory.memories.push({
        content,
        tick,
        importance: 0.5, // Default importance
      });

      return { success: true, data: { agentId, memoryType, content } };
    } else if (memoryType === 'semantic') {
      const semanticMemory = entity.components.get('semantic_memory') as {
        facts?: Array<{ content: string; confidence: number }>;
      } | undefined;

      if (!semanticMemory) {
        return { success: false, error: 'Entity does not have semantic_memory component' };
      }

      if (!semanticMemory.facts) {
        semanticMemory.facts = [];
      }

      semanticMemory.facts.push({
        content,
        confidence: 1.0,
      });

      return { success: true, data: { agentId, memoryType, content } };
    }

    return { success: false, error: `Invalid memory type: ${memoryType}` };
  }

  /**
   * Clear all memories of a specific type.
   * @param agentId - The agent entity ID
   * @param memoryType - Type: 'episodic' | 'semantic' | 'all'
   */
  clearMemories(agentId: string, memoryType: 'episodic' | 'semantic' | 'all'): DevActionsResult {
    if (!this.world) {
      return { success: false, error: 'World not set' };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Entity not found: ${agentId}` };
    }

    let cleared = 0;

    if (memoryType === 'episodic' || memoryType === 'all') {
      const episodicMemory = entity.components.get('episodic_memory') as {
        memories?: Array<unknown>;
      } | undefined;

      if (episodicMemory?.memories) {
        cleared += episodicMemory.memories.length;
        episodicMemory.memories = [];
      }
    }

    if (memoryType === 'semantic' || memoryType === 'all') {
      const semanticMemory = entity.components.get('semantic_memory') as {
        facts?: Array<unknown>;
      } | undefined;

      if (semanticMemory?.facts) {
        cleared += semanticMemory.facts.length;
        semanticMemory.facts = [];
      }
    }

    return { success: true, data: { agentId, memoryType, memoriesCleared: cleared } };
  }

  /**
   * Set the agent's current goal.
   * @param agentId - The agent entity ID
   * @param goal - The goal text
   */
  setGoal(agentId: string, goal: string): DevActionsResult {
    if (!this.world) {
      return { success: false, error: 'World not set' };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Entity not found: ${agentId}` };
    }

    const agent = entity.components.get('agent') as {
      personalGoal?: string;
    } | undefined;

    if (!agent) {
      return { success: false, error: 'Entity is not an agent' };
    }

    agent.personalGoal = goal;

    return { success: true, data: { agentId, goal } };
  }

  /**
   * Toggle LLM usage for an agent.
   * @param agentId - The agent entity ID
   * @param useLLM - Whether to use LLM
   */
  setUseLLM(agentId: string, useLLM: boolean): DevActionsResult {
    if (!this.world) {
      return { success: false, error: 'World not set' };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Entity not found: ${agentId}` };
    }

    const agent = entity.components.get('agent') as {
      useLLM?: boolean;
    } | undefined;

    if (!agent) {
      return { success: false, error: 'Entity is not an agent' };
    }

    agent.useLLM = useLLM;

    return { success: true, data: { agentId, useLLM } };
  }
}

// Singleton instance
export const devActionsService = new DevActionsService();
