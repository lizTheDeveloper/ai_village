/**
 * Serializer for AdminAngelComponent - properly handles Map serialization
 *
 * The admin_angel component has a Map<string, AgentFamiliarity> that doesn't
 * serialize to JSON properly. This serializer converts it to/from an array.
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { AdminAngelComponent, AdminAngelMemory, AgentFamiliarity } from '@ai-village/core';
import { createAdminAngelComponent, createAdminAngelMemory } from '@ai-village/core';

interface SerializedAdminAngel {
  name: string;
  active: boolean;
  proactiveInterval: number;
  contextWindowSize: number;
  llmProvider: string | null;
  awaitingResponse: boolean;
  pendingPlayerMessages: string[];
  sessionStartTick: number;
  memory: SerializedAdminAngelMemory;
}

interface SerializedAdminAngelMemory {
  playerKnowledge: AdminAngelMemory['playerKnowledge'];
  relationship: AdminAngelMemory['relationship'];
  tutorialProgress: AdminAngelMemory['tutorialProgress'];
  conversation: AdminAngelMemory['conversation'];
  consciousness: AdminAngelMemory['consciousness'];
  attention: AdminAngelMemory['attention'];
  // Map converted to array of entries
  agentFamiliarityEntries: Array<[string, AgentFamiliarity]>;
}

export class AdminAngelSerializer extends BaseComponentSerializer<AdminAngelComponent> {
  constructor() {
    super('admin_angel', 1);
  }

  protected serializeData(component: AdminAngelComponent): SerializedAdminAngel {
    // Convert Map to array of entries for JSON serialization
    const agentFamiliarityEntries: Array<[string, AgentFamiliarity]> =
      component.memory.agentFamiliarity instanceof Map
        ? Array.from(component.memory.agentFamiliarity.entries())
        : [];

    return {
      name: component.name,
      active: component.active,
      proactiveInterval: component.proactiveInterval,
      contextWindowSize: component.contextWindowSize,
      llmProvider: component.llmProvider,
      awaitingResponse: component.awaitingResponse,
      pendingPlayerMessages: component.pendingPlayerMessages,
      sessionStartTick: component.sessionStartTick,
      memory: {
        playerKnowledge: component.memory.playerKnowledge,
        relationship: component.memory.relationship,
        tutorialProgress: component.memory.tutorialProgress,
        conversation: component.memory.conversation,
        consciousness: component.memory.consciousness,
        attention: component.memory.attention,
        agentFamiliarityEntries,
      },
    };
  }

  protected deserializeData(data: unknown): AdminAngelComponent {
    const serialized = data as SerializedAdminAngel;

    // Validation already ensures memory exists - no conditional needed
    // Create a fresh memory object
    const memory = createAdminAngelMemory();

    // Restore all memory fields from serialized data
    // Memory subfields might be missing in old save versions, so keep conditionals
    if (serialized.memory.playerKnowledge !== undefined) {
      memory.playerKnowledge = serialized.memory.playerKnowledge;
    }
    if (serialized.memory.relationship !== undefined) {
      memory.relationship = serialized.memory.relationship;
    }
    if (serialized.memory.tutorialProgress !== undefined) {
      memory.tutorialProgress = serialized.memory.tutorialProgress;
    }
    if (serialized.memory.conversation !== undefined) {
      memory.conversation = serialized.memory.conversation;
    }
    if (serialized.memory.consciousness !== undefined) {
      memory.consciousness = serialized.memory.consciousness;
    }
    if (serialized.memory.attention !== undefined) {
      memory.attention = serialized.memory.attention;
    }

    // Restore Map from array of entries
    if (Array.isArray(serialized.memory.agentFamiliarityEntries)) {
      memory.agentFamiliarity = new Map(serialized.memory.agentFamiliarityEntries);
    }

    // Create component with restored memory
    const component = createAdminAngelComponent(serialized.name, memory);

    // Restore other fields - validation ensures these exist, no defaults needed
    // Exception: llmProvider can legitimately be null (old saves may not have this)
    component.active = serialized.active;
    component.proactiveInterval = serialized.proactiveInterval;
    component.contextWindowSize = serialized.contextWindowSize;
    component.llmProvider = serialized.llmProvider ?? null;  // Can be null
    component.awaitingResponse = serialized.awaitingResponse;
    component.pendingPlayerMessages = serialized.pendingPlayerMessages;
    component.sessionStartTick = serialized.sessionStartTick;

    return component;
  }

  validate(data: unknown): data is AdminAngelComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('AdminAngelComponent data must be object');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj.name !== 'string') {
      throw new Error('AdminAngelComponent must have name field');
    }
    if (typeof obj.memory !== 'object' || obj.memory === null) {
      throw new Error('AdminAngelComponent must have memory object');
    }
    if (typeof obj.active !== 'boolean') {
      throw new Error('AdminAngelComponent must have active boolean');
    }
    if (typeof obj.proactiveInterval !== 'number') {
      throw new Error('AdminAngelComponent must have proactiveInterval number');
    }
    if (typeof obj.contextWindowSize !== 'number') {
      throw new Error('AdminAngelComponent must have contextWindowSize number');
    }
    if (typeof obj.awaitingResponse !== 'boolean') {
      throw new Error('AdminAngelComponent must have awaitingResponse boolean');
    }
    if (!Array.isArray(obj.pendingPlayerMessages)) {
      throw new Error('AdminAngelComponent must have pendingPlayerMessages array');
    }
    if (typeof obj.sessionStartTick !== 'number') {
      throw new Error('AdminAngelComponent must have sessionStartTick number');
    }
    // Validate memory subfields exist (agentFamiliarityEntries is array)
    const mem = obj.memory as Record<string, unknown>;
    if (!Array.isArray(mem.agentFamiliarityEntries)) {
      throw new Error('AdminAngelComponent memory must have agentFamiliarityEntries array');
    }
    return true;
  }
}
