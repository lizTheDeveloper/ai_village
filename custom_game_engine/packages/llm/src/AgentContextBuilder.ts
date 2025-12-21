import type { Entity } from '@ai-village/core';

export interface AgentContext {
  position: { x: number; y: number };
  needs: { hunger: number; energy: number };
  nearbyAgents: Array<{ agentId?: string; distance: number }>;
  nearbyResources: Array<{ resourceId?: string; type: string; distance: number }>;
  currentBehavior: string;
  memories: Array<{ type: string; strength: number }>;
  relationships: Array<{ agentId?: string; familiarity: number }>;
}

/**
 * Builds context prompts for LLM decision making.
 */
export class AgentContextBuilder {
  /**
   * Extract context from an agent entity.
   * Uses vision, memory, and relationship systems to build rich context.
   */
  extractContext(agent: Entity, _world: any): AgentContext {
    const position = agent.components.get('position') as any;
    const needs = agent.components.get('needs') as any;
    const agentComp = agent.components.get('agent') as any;
    const memory = agent.components.get('memory') as any;
    const relationship = agent.components.get('relationship') as any;
    const vision = agent.components.get('vision') as any;

    // Extract what the agent can see from vision component
    const nearbyAgents = vision?.seenAgents?.map((id: string) => ({
      agentId: id,
      distance: Math.random() * 10, // TODO: Calculate actual distance
    })) || [];

    const nearbyResources = vision?.seenResources?.map((id: string) => ({
      resourceId: id,
      type: 'food', // TODO: Get actual resource type
      distance: Math.random() * 10,
    })) || [];

    // Extract recent significant memories (last 10)
    const memories = memory?.memories?.slice(-10).map((m: any) => ({
      type: m.type,
      strength: Math.round(m.strength),
    })) || [];

    // Extract relationship info with agent IDs
    const relationships = relationship?.relationships
      ? (Array.from(relationship.relationships.entries()) as Array<[string, any]>)
          .slice(0, 5)
          .map(([agentId, r]) => ({
            agentId,
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
   * Build a rich, contextual prompt for the LLM.
   * Let the LLM reason about the situation instead of just picking from a list.
   */
  buildPrompt(context: AgentContext): string {
    const { needs, nearbyAgents, nearbyResources, memories, relationships } = context;

    let prompt = `You are an autonomous agent in a living village world.

YOUR STATUS:
- Hunger: ${needs.hunger}% (you ${needs.hunger < 30 ? 'are very hungry' : needs.hunger < 60 ? 'could eat' : 'are satisfied'})
- Energy: ${needs.energy}% (you ${needs.energy < 30 ? 'are exhausted' : needs.energy < 60 ? 'are getting tired' : 'feel rested'})

WHAT YOU SEE:`;

    if (nearbyResources.length > 0) {
      prompt += `\n- ${nearbyResources.length} food sources nearby`;
    }

    if (nearbyAgents.length > 0) {
      prompt += `\n- ${nearbyAgents.length} other agents nearby`;
      if (relationships.length > 0) {
        prompt += ` (you know ${relationships.filter(r => r.familiarity > 50).length} of them)`;
      }
    }

    if (nearbyAgents.length === 0 && nearbyResources.length === 0) {
      prompt += `\n- Empty area, nothing notable nearby`;
    }

    if (memories.length > 0) {
      prompt += `\n\nRECENT MEMORIES:`;
      memories.slice(-5).forEach((m) => {
        prompt += `\n- Remembered: ${m.type}`;
      });
    }

    prompt += `\n\nDecide what to do next. You can:
- wander (explore the area)
- seek_food (find something to eat)
- talk (have a conversation if someone is nearby)
- follow_agent (follow someone)
- idle (rest and recover energy)

Think about your situation and respond with ONLY the action that makes the most sense right now.

Action:`;

    return prompt;
  }
}
