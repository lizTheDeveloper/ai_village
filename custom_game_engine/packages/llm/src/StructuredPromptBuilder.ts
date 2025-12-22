import type { Entity } from '@ai-village/core';

/**
 * Structured prompt following agent-system/spec.md REQ-AGT-002
 */
export interface AgentPrompt {
  systemPrompt: string;       // Role, personality, rules
  worldContext: string;        // Current situation
  memories: string;            // Relevant memories
  availableActions: string[];  // What they can do
  instruction: string;         // What to decide
}

/**
 * Builds structured prompts for LLM decision making.
 * Follows agent-system/spec.md REQ-AGT-002
 */
export class StructuredPromptBuilder {
  /**
   * Build a complete structured prompt for an agent.
   */
  buildPrompt(agent: Entity, world: any): string {
    const name = agent.components.get('identity') as any;
    const personality = agent.components.get('personality') as any;
    const needs = agent.components.get('needs') as any;
    const vision = agent.components.get('vision') as any;
    const memory = agent.components.get('memory') as any;
    const inventory = agent.components.get('inventory') as any;

    // System Prompt: Role, personality, rules
    const systemPrompt = this.buildSystemPrompt(name?.name || 'Agent', personality);

    // World Context: Current situation
    const worldContext = this.buildWorldContext(needs, vision, inventory, world);

    // Memories: Relevant recent memories
    const memoriesText = this.buildMemories(memory);

    // Available Actions
    const actions = this.getAvailableActions(vision, world);

    // Instruction - simple and direct for function calling
    // Build instruction with context-aware motivation
    let instruction = `What should you do? Don't overthink - give your gut reaction and choose an action.`;

    // Add motivation for resource gathering
    if (inventory) {
      const hasWood = inventory.slots.some((s: any) => s.itemId === 'wood' && s.quantity > 0);
      const hasStone = inventory.slots.some((s: any) => s.itemId === 'stone' && s.quantity > 0);
      const hasAnyResources = inventory.slots.some((s: any) => s.itemId && s.quantity > 0);

      // Encourage gathering if no resources and resources are visible
      if (!hasAnyResources && vision?.seenResources && vision.seenResources.length > 0) {
        instruction = `Your inventory is empty and you see useful resources nearby. Gathering BOTH wood and stone now will help you build shelter and tools later. Both materials are equally important! What should you do?`;
      }
      // Encourage gathering if low on building materials
      else if ((!hasWood || !hasStone) && vision?.seenResources && vision.seenResources.length > 0) {
        const missing = [];
        if (!hasWood) missing.push('wood (from trees)');
        if (!hasStone) missing.push('stone (from rocks)');
        instruction = `You're low on ${missing.join(' and ')}. Gathering ${missing.length > 1 ? 'both materials' : 'this material'} is important for construction. What should you do?`;
      }
    }

    // Combine into single prompt
    return this.formatPrompt({
      systemPrompt,
      worldContext,
      memories: memoriesText,
      availableActions: actions,
      instruction,
    });
  }

  /**
   * Build system prompt with role and personality.
   */
  private buildSystemPrompt(name: string, personality: any): string {
    if (!personality) {
      return `You are ${name}, a villager in a forest village.`;
    }

    let prompt = `You are ${name}, a villager in a forest village.\n\nPersonality:\n`;

    // Describe personality based on Big Five
    if (personality.openness > 70) {
      prompt += '- You are curious and adventurous\n';
    } else if (personality.openness < 30) {
      prompt += '- You are cautious and traditional\n';
    }

    if (personality.extraversion > 70) {
      prompt += '- You are outgoing and social\n';
    } else if (personality.extraversion < 30) {
      prompt += '- You are quiet and introspective\n';
    }

    if (personality.agreeableness > 70) {
      prompt += '- You love helping others\n';
    } else if (personality.agreeableness < 30) {
      prompt += '- You prefer to focus on your own goals\n';
    }

    if (personality.workEthic > 70) {
      prompt += '- You are hardworking and dedicated\n';
    } else if (personality.workEthic < 30) {
      prompt += '- You prefer to take life easy\n';
    }

    return prompt;
  }

  /**
   * Build world context from current situation.
   */
  private buildWorldContext(needs: any, vision: any, inventory: any, world: any): string {
    let context = 'Current Situation:\n';

    // Needs
    if (needs) {
      const hunger = Math.round(needs.hunger);
      const energy = Math.round(needs.energy);

      context += `- Hunger: ${hunger}% (${hunger < 30 ? 'very hungry' : hunger < 60 ? 'could eat' : 'satisfied'})\n`;
      context += `- Energy: ${energy}% (${energy < 30 ? 'exhausted' : energy < 60 ? 'tired' : 'rested'})\n`;
    }

    // Inventory
    if (inventory) {
      const resources: Record<string, number> = {};
      for (const slot of inventory.slots) {
        if (slot.itemId && slot.quantity > 0) {
          resources[slot.itemId] = (resources[slot.itemId] || 0) + slot.quantity;
        }
      }

      if (Object.keys(resources).length > 0) {
        const items = Object.entries(resources)
          .map(([item, qty]) => `${qty} ${item}`)
          .join(', ');
        context += `- Inventory: ${items}\n`;
      } else {
        context += '- Inventory: empty (you have no resources)\n';
      }
    }

    // Vision
    if (vision) {
      const agentCount = vision.seenAgents?.length || 0;
      const resourceCount = vision.seenResources?.length || 0;

      if (agentCount > 0) {
        context += `- You see ${agentCount} other villager${agentCount > 1 ? 's' : ''} nearby\n`;
      }

      if (resourceCount > 0) {
        // Describe what types of resources are visible
        const resourceTypes: Record<string, number> = {};
        for (const resourceId of vision.seenResources) {
          const resource = world.getEntity(resourceId);
          if (resource) {
            const resourceComp = resource.getComponent('resource');
            if (resourceComp) {
              const type = resourceComp.resourceType;
              resourceTypes[type] = (resourceTypes[type] || 0) + 1;
            }
          }
        }

        const descriptions: string[] = [];
        if (resourceTypes.wood) {
          descriptions.push(`${resourceTypes.wood} tree${resourceTypes.wood > 1 ? 's' : ''}`);
        }
        if (resourceTypes.stone) {
          descriptions.push(`${resourceTypes.stone} rock${resourceTypes.stone > 1 ? 's' : ''}`);
        }
        if (resourceTypes.food) {
          descriptions.push(`${resourceTypes.food} food source${resourceTypes.food > 1 ? 's' : ''}`);
        }

        if (descriptions.length > 0) {
          context += `- You see ${descriptions.join(', ')} nearby`;

          // Add gathering hint if trees or rocks are visible
          if (resourceTypes.wood || resourceTypes.stone) {
            context += ` (you can gather these for materials)`;
          }
          context += `\n`;
        }
      }

      if (agentCount === 0 && resourceCount === 0) {
        context += '- The area around you is empty\n';
      }

      // Hearing - what nearby agents are saying
      if (vision.heardSpeech && vision.heardSpeech.length > 0) {
        context += '\nWhat you hear:\n';
        vision.heardSpeech.forEach((speech: { speaker: string, text: string }) => {
          context += `- ${speech.speaker} says: "${speech.text}"\n`;
        });
      }
    }

    return context;
  }

  /**
   * Build memories section.
   */
  private buildMemories(memory: any): string {
    if (!memory?.memories || memory.memories.length === 0) {
      return 'You have no significant recent memories.';
    }

    const recentMemories = memory.memories.slice(-5);
    let text = 'Recent Memories:\n';

    recentMemories.forEach((m: any, i: number) => {
      text += `${i + 1}. ${m.type}\n`;
    });

    return text;
  }

  /**
   * Get available actions based on context.
   * These MUST match the valid behaviors in ResponseParser.
   */
  private getAvailableActions(vision: any, world: any): string[] {
    const actions = [
      'wander - Explore the area',
      'idle - Do nothing, rest and recover',
    ];

    // Debug logging to understand vision state
    if (vision) {
      console.log('[StructuredPromptBuilder] Vision state:', {
        seenResources: vision.seenResources,
        seenResourcesCount: vision.seenResources?.length || 0,
        seenAgents: vision.seenAgents,
        seenAgentsCount: vision.seenAgents?.length || 0,
        canSeeResources: vision.canSeeResources,
      });
    }

    // Add contextual actions - use exact behavior names from ResponseParser
    if (vision?.seenResources && vision.seenResources.length > 0) {
      actions.push('seek_food - Find and eat food');

      // Make gather action more specific based on what's visible
      let hasWood = false;
      let hasStone = false;

      if (world) {
        for (const resourceId of vision.seenResources) {
          const resource = world.getEntity(resourceId);
          if (resource) {
            const resourceComp = resource.getComponent('resource');
            if (resourceComp) {
              if (resourceComp.resourceType === 'wood') hasWood = true;
              if (resourceComp.resourceType === 'stone') hasStone = true;
            }
          }
        }
      }

      if (hasWood || hasStone) {
        // Make the gather action more explicit with clear examples
        const gatherExamples = [];
        if (hasWood) gatherExamples.push('"chop" or "gather wood"');
        if (hasStone) gatherExamples.push('"mine" or "gather stone"');
        actions.push(`gather - Collect resources for building (say ${gatherExamples.join(' or ')})`);
      }
    }

    if (vision?.seenAgents && vision.seenAgents.length > 0) {
      actions.push('talk - Have a conversation');
      actions.push('follow_agent - Follow someone');
    }

    // Always available actions
    actions.push('build - Construct a building (e.g., "build lean-to")');

    // Debug log final actions list
    console.log('[StructuredPromptBuilder] Available actions:', actions);

    return actions;
  }

  /**
   * Format the structured prompt into a single string.
   * Intelligently collapses empty sections.
   */
  private formatPrompt(prompt: AgentPrompt): string {
    const sections: string[] = [prompt.systemPrompt];

    // Only add non-empty sections
    if (prompt.worldContext && prompt.worldContext.trim()) {
      sections.push(prompt.worldContext);
    }

    if (prompt.memories && !prompt.memories.includes('no significant recent memories')) {
      sections.push(prompt.memories);
    }

    if (prompt.availableActions && prompt.availableActions.length > 0) {
      sections.push('Available Actions:\n' + prompt.availableActions.map(a => `- ${a}`).join('\n'));
    }

    sections.push(prompt.instruction);

    return sections.join('\n\n') + '\n\nYour response:';
  }
}
