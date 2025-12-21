import type { Entity } from '@ai-village/core';

export interface AgentContext {
  position: { x: number; y: number };
  needs: { hunger: number; energy: number };
  nearbyAgents: Array<{ distance: number }>;
  nearbyResources: Array<{ type: string; distance: number }>;
  currentBehavior: string;
  memories: Array<{ type: string; strength: number }>;
  relationships: Array<{ familiarity: number }>;
}

/**
 * Builds context prompts for LLM decision making.
 */
export class AgentContextBuilder {
  /**
   * Extract context from an agent entity.
   */
  extractContext(agent: Entity, _world: any): AgentContext {
    const position = agent.components.get('position') as any;
    const needs = agent.components.get('needs') as any;
    const agentComp = agent.components.get('agent') as any;
    const memory = agent.components.get('memory') as any;
    const relationship = agent.components.get('relationship') as any;

    // Get nearby entities (simplified)
    const nearbyAgents: Array<{ distance: number }> = [];
    const nearbyResources: Array<{ type: string; distance: number }> = [];

    // Extract memory info
    const memories = memory?.memories?.slice(0, 5).map((m: any) => ({
      type: m.type,
      strength: Math.round(m.strength),
    })) || [];

    // Extract relationship info
    const relationships = relationship?.relationships
      ? Array.from(relationship.relationships.values())
          .slice(0, 3)
          .map((r: any) => ({
            familiarity: Math.round(r.familiarity),
          }))
      : [];

    return {
      position: { x: Math.round(position?.x || 0), y: Math.round(position?.y || 0) },
      needs: {
        hunger: Math.round(needs?.hunger || 100),
        energy: Math.round(needs?.energy || 100),
      },
      nearbyAgents,
      nearbyResources,
      currentBehavior: agentComp?.behavior || 'wander',
      memories,
      relationships,
    };
  }

  /**
   * Build a prompt for the LLM.
   */
  buildPrompt(context: AgentContext): string {
    const { needs, currentBehavior, memories, relationships } = context;

    let prompt = `You are an autonomous agent in a village simulation. You must decide what to do next.

Current Status:
- Hunger: ${needs.hunger}% (0 = starving, 100 = full)
- Energy: ${needs.energy}% (0 = exhausted, 100 = rested)
- Current behavior: ${currentBehavior}

`;

    if (memories.length > 0) {
      prompt += `Recent Memories:\n`;
      memories.forEach((m, i) => {
        prompt += `${i + 1}. ${m.type} (strength: ${m.strength}%)\n`;
      });
      prompt += `\n`;
    }

    if (relationships.length > 0) {
      prompt += `Relationships:\n`;
      relationships.forEach((r, i) => {
        prompt += `${i + 1}. Familiarity: ${r.familiarity}%\n`;
      });
      prompt += `\n`;
    }

    prompt += `Available Actions:
- wander: Move randomly to explore
- seek_food: Look for food to eat (use when hungry)
- follow_agent: Follow another agent socially
- talk: Have a conversation with a nearby agent
- idle: Rest and do nothing

Choose ONE action that makes the most sense given your current needs and situation.
Respond with ONLY the action name (e.g., "seek_food" or "wander").

Action:`;

    return prompt;
  }
}
