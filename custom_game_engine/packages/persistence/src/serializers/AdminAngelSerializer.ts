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

    // Create a fresh memory object
    const memory = createAdminAngelMemory();

    // Restore all memory fields from serialized data
    if (serialized.memory) {
      if (serialized.memory.playerKnowledge) {
        memory.playerKnowledge = serialized.memory.playerKnowledge;
      }
      if (serialized.memory.relationship) {
        memory.relationship = serialized.memory.relationship;
      }
      if (serialized.memory.tutorialProgress) {
        memory.tutorialProgress = serialized.memory.tutorialProgress;
      }
      if (serialized.memory.conversation) {
        memory.conversation = serialized.memory.conversation;
      }
      if (serialized.memory.consciousness) {
        memory.consciousness = serialized.memory.consciousness;
      }
      if (serialized.memory.attention) {
        memory.attention = serialized.memory.attention;
      }

      // Restore Map from array of entries
      if (serialized.memory.agentFamiliarityEntries && Array.isArray(serialized.memory.agentFamiliarityEntries)) {
        memory.agentFamiliarity = new Map(serialized.memory.agentFamiliarityEntries);
      }
    }

    // Create component with restored memory
    const component = createAdminAngelComponent(serialized.name, memory);

    // Restore other fields
    component.active = serialized.active ?? true;
    component.proactiveInterval = serialized.proactiveInterval ?? 1200;
    component.contextWindowSize = serialized.contextWindowSize ?? 10;
    component.llmProvider = serialized.llmProvider ?? null;
    component.awaitingResponse = serialized.awaitingResponse ?? false;
    component.pendingPlayerMessages = serialized.pendingPlayerMessages ?? [];
    component.sessionStartTick = serialized.sessionStartTick ?? 0;

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
    return true;
  }
}
