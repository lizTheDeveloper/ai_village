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
  buildPrompt(agent: Entity, _world: any): string {
    const name = agent.components.get('identity') as any;
    const personality = agent.components.get('personality') as any;
    const needs = agent.components.get('needs') as any;
    const vision = agent.components.get('vision') as any;
    const memory = agent.components.get('memory') as any;

    // System Prompt: Role, personality, rules
    const systemPrompt = this.buildSystemPrompt(name?.name || 'Agent', personality);

    // World Context: Current situation
    const worldContext = this.buildWorldContext(needs, vision);

    // Memories: Relevant recent memories
    const memoriesText = this.buildMemories(memory);

    // Available Actions
    const actions = this.getAvailableActions(vision);

    // Instruction
    const instruction = 'Decide what to do next based on your personality and situation.';

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

    prompt += '\nRules:\n';
    prompt += '- Respond with a single action name or JSON action\n';
    prompt += '- Consider your energy and hunger before choosing intensive tasks\n';
    prompt += '- Let your personality influence your choices\n';

    return prompt;
  }

  /**
   * Build world context from current situation.
   */
  private buildWorldContext(needs: any, vision: any): string {
    let context = 'Current Situation:\n';

    // Needs
    if (needs) {
      const hunger = Math.round(needs.hunger);
      const energy = Math.round(needs.energy);

      context += `- Hunger: ${hunger}% (${hunger < 30 ? 'very hungry' : hunger < 60 ? 'could eat' : 'satisfied'})\n`;
      context += `- Energy: ${energy}% (${energy < 30 ? 'exhausted' : energy < 60 ? 'tired' : 'rested'})\n`;
    }

    // Vision
    if (vision) {
      const agentCount = vision.seenAgents?.length || 0;
      const resourceCount = vision.seenResources?.length || 0;

      if (agentCount > 0) {
        context += `- You see ${agentCount} other villager${agentCount > 1 ? 's' : ''} nearby\n`;
      }

      if (resourceCount > 0) {
        context += `- You see ${resourceCount} food source${resourceCount > 1 ? 's' : ''} nearby\n`;
      }

      if (agentCount === 0 && resourceCount === 0) {
        context += '- The area around you is empty\n';
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
   */
  private getAvailableActions(vision: any): string[] {
    const actions = [
      'wander - Explore the area',
      'rest - Recover energy',
      'idle - Do nothing for now',
    ];

    // Add contextual actions
    if (vision?.seenResources && vision.seenResources.length > 0) {
      actions.push('eat - Find and eat food');
      actions.push('forage - Gather resources');
    }

    if (vision?.seenAgents && vision.seenAgents.length > 0) {
      actions.push('talk - Have a conversation');
      actions.push('follow - Follow someone');
    }

    return actions;
  }

  /**
   * Format the structured prompt into a single string.
   */
  private formatPrompt(prompt: AgentPrompt): string {
    return `${prompt.systemPrompt}

${prompt.worldContext}

${prompt.memories}

Available Actions:
${prompt.availableActions.map(a => `- ${a}`).join('\n')}

${prompt.instruction}

Your action:`;
  }
}
