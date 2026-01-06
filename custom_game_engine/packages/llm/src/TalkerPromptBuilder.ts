/**
 * TalkerPromptBuilder - Layer 2 of three-layer LLM architecture
 *
 * Handles conversational LLM decision making for agents.
 * Focuses on social interactions, environmental awareness, and goal-setting.
 *
 * Responsibilities:
 * - Environmental awareness (vision, weather, temperature, needs, location)
 * - Social context (conversations, relationships, nearby agents)
 * - Personality-driven behavior
 * - Goal-setting (personal, group, medium-term)
 * - Conversation participation
 * - Social actions (talk, follow, call_meeting, attend_meeting, help)
 *
 * Does NOT handle:
 * - Detailed resource management (that's Autonomic)
 * - Strategic planning (that's Executor)
 * - Building costs (that's Autonomic)
 * - Task queuing (that's Executor)
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import {
  type IdentityComponent,
  type PersonalityComponent,
  type NeedsComponent,
  type VisionComponent,
  type TemperatureComponent,
  type ConversationComponent,
  type EpisodicMemoryComponent,
  type EpisodicMemory,
  type GoalsComponent,
  type RelationshipComponent,
  type Relationship,
  formatGoalsForPrompt,
  getConversationStyle,
  findSharedInterests,
} from '@ai-village/core';
import { generatePersonalityPrompt } from './PersonalityPromptTemplates.js';
import { promptCache } from './PromptCacheManager.js';
import { PromptRenderer } from '@ai-village/introspection';

/**
 * Talker prompt structure - focused on social and environmental awareness
 */
export interface TalkerPrompt {
  systemPrompt: string;         // Personality and identity
  schemaPrompt?: string;         // Auto-generated schema-driven component info
  socialContext: string;         // Conversations, relationships, nearby agents
  environmentContext: string;    // Vision, weather, temperature, needs, location
  goals?: string;                // Personal and social goals
  memories: string;              // Recent social memories
  availableActions: string[];    // Talker-specific actions
  instruction: string;           // What to decide
}

/**
 * TalkerPromptBuilder - Builds prompts for conversational decision-making
 *
 * Follows StructuredPromptBuilder pattern but focused on social/environmental context.
 */
export class TalkerPromptBuilder {
  /**
   * Build a complete Talker prompt for an agent.
   * Focuses on social awareness and conversation.
   */
  buildPrompt(agent: Entity, world: World): string {
    // Initialize frame-level cache
    promptCache.startFrame(world.tick);

    const identity = agent.components.get('identity') as IdentityComponent | undefined;
    const personality = agent.components.get('personality') as PersonalityComponent | undefined;
    const needs = agent.components.get('needs') as NeedsComponent | undefined;
    const vision = agent.components.get('vision') as VisionComponent | undefined;
    const temperature = agent.components.get('temperature') as TemperatureComponent | undefined;
    const conversation = agent.components.get('conversation') as ConversationComponent | undefined;
    const episodicMemory = agent.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
    const relationships = agent.components.get('relationships') as RelationshipComponent | undefined;

    // Schema-driven component rendering
    const schemaPrompt = this.buildSchemaPrompt(agent);

    // System Prompt: Who you are (personality, identity)
    const systemPrompt = this.buildSystemPrompt(identity?.name || 'Agent', personality, agent.id);

    // Social Context: Conversations, relationships, nearby agents
    const socialContext = this.buildSocialContext(conversation, relationships, vision, world, agent.id);

    // Environment Context: Vision, weather, temperature, needs, location
    const environmentContext = this.buildEnvironmentContext(needs, vision, temperature, world, agent);

    // Personal Goals: What you want (personal and social)
    const goals = agent.components.get('goals') as GoalsComponent | undefined;
    const goalsText = goals ? formatGoalsForPrompt(goals) : undefined;

    // Memories: Recent social memories
    const memoriesText = this.buildSocialMemories(episodicMemory, world);

    // Available Actions: Talker-specific tools
    const actions = this.getAvailableTalkerActions(conversation, vision, world);

    // Instruction: What to decide
    const instruction = this.buildTalkerInstruction(conversation, needs, personality, vision, world);

    // Combine into single prompt
    return this.formatPrompt({
      systemPrompt,
      schemaPrompt,
      socialContext,
      environmentContext,
      goals: goalsText,
      memories: memoriesText,
      availableActions: actions,
      instruction,
    });
  }

  /**
   * Build system prompt with personality.
   * Uses enhanced personality templates.
   */
  private buildSystemPrompt(name: string, personality: PersonalityComponent | undefined, entityId?: string): string {
    if (!personality) {
      return `You are ${name}, a villager in a forest village.\n\n`;
    }

    return generatePersonalityPrompt({ name, personality, entityId });
  }

  /**
   * Build schema-driven prompt sections.
   * Auto-generates prompts for all schema'd components.
   */
  private buildSchemaPrompt(agent: Entity): string {
    const schemaPrompt = PromptRenderer.renderEntity(agent as any);

    if (!schemaPrompt) {
      return '';
    }

    return `--- Schema-Driven Component Info ---\n${schemaPrompt}`;
  }

  /**
   * Build social context: conversations, relationships, nearby agents.
   * Core of Talker's awareness.
   */
  private buildSocialContext(
    conversation: ConversationComponent | undefined,
    relationships: RelationshipComponent | undefined,
    vision: VisionComponent | undefined,
    world: World,
    agentId: string
  ): string {
    let context = '--- Social Context ---\n';

    // Active conversation (highest priority for Talker)
    if (conversation?.isActive && conversation?.partnerId) {
      const partner = world.getEntity(conversation.partnerId);
      const partnerIdentity = partner?.components.get('identity') as IdentityComponent | undefined;
      const partnerName = partnerIdentity?.name || 'someone';

      context += `\n🗣️ ACTIVE CONVERSATION with ${partnerName}\n`;

      // Show conversation history
      if (conversation.history && conversation.history.length > 0) {
        context += 'Conversation history:\n';
        conversation.history.slice(-5).forEach((msg: { speaker: string; text: string }) => {
          context += `  ${msg.speaker}: "${msg.text}"\n`;
        });
      }

      // Conversation style
      if (partner) {
        const partnerPersonality = partner.components.get('personality') as PersonalityComponent | undefined;
        if (partnerPersonality) {
          const style = getConversationStyle(partnerPersonality);
          context += `${partnerName}'s conversation style: ${style}\n`;
        }
      }
    }

    // Nearby agents (potential conversation partners)
    const nearbyAgents: string[] = [];
    if (vision?.seenAgents && vision.seenAgents.length > 0) {
      for (const seenId of vision.seenAgents) {
        if (seenId === agentId) continue; // Skip self

        const seenAgent = world.getEntity(seenId);
        if (!seenAgent) continue;

        const seenIdentity = seenAgent.components.get('identity') as IdentityComponent | undefined;
        const seenName = seenIdentity?.name || 'someone';

        // Check relationship
        let relationshipNote = '';
        if (relationships?.relationships) {
          const rel = relationships.relationships.find((r: Relationship) => r.targetId === seenId);
          if (rel) {
            if (rel.affection > 0.7) {
              relationshipNote = ' (close friend)';
            } else if (rel.affection > 0.4) {
              relationshipNote = ' (friend)';
            } else if (rel.affection < -0.4) {
              relationshipNote = ' (dislike)';
            }
          }
        }

        nearbyAgents.push(`${seenName}${relationshipNote}`);
      }
    }

    if (nearbyAgents.length > 0) {
      context += `\nNearby people: ${nearbyAgents.join(', ')}\n`;
    } else if (!conversation?.isActive) {
      context += '\nYou are alone.\n';
    }

    // Heard speech (potential conversations to join)
    if (vision?.heardSpeech && vision.heardSpeech.length > 0) {
      const speakerCount = vision.heardSpeech.length;

      if (speakerCount === 1) {
        const firstSpeech = vision.heardSpeech[0];
        if (firstSpeech) {
          context += '\nWhat you hear:\n';
          context += `- ${firstSpeech.speaker} says: "${firstSpeech.text}"\n`;
        }
      } else {
        context += `\n--- GROUP CONVERSATION (${speakerCount} people talking nearby) ---\n`;
        vision.heardSpeech.forEach((speech: { speaker: string; text: string }) => {
          context += `${speech.speaker}: "${speech.text}"\n`;
        });
        context += `\nYou can join this conversation by choosing the 'talk' action.\n`;
      }
    }

    // Important relationships
    if (relationships?.relationships && relationships.relationships.length > 0) {
      const importantRels = relationships.relationships
        .filter((r: Relationship) => Math.abs(r.affection) > 0.5)
        .slice(0, 3);

      if (importantRels.length > 0) {
        context += '\nImportant relationships:\n';
        for (const rel of importantRels) {
          const target = world.getEntity(rel.targetId);
          const targetIdentity = target?.components.get('identity') as IdentityComponent | undefined;
          const targetName = targetIdentity?.name || 'someone';

          const affectionDesc = rel.affection > 0.7 ? 'deeply care about' :
                               rel.affection > 0.4 ? 'like' :
                               rel.affection < -0.7 ? 'strongly dislike' :
                               'dislike';

          context += `  - You ${affectionDesc} ${targetName}\n`;
        }
      }
    }

    return context;
  }

  /**
   * Build environment context: vision, weather, temperature, needs, location.
   * Talker is aware of surroundings but doesn't micromanage resources.
   */
  private buildEnvironmentContext(
    needs: NeedsComponent | undefined,
    vision: VisionComponent | undefined,
    temperature: TemperatureComponent | undefined,
    world: World,
    agent: Entity
  ): string {
    let context = '--- Environment ---\n';

    // Needs (how you feel)
    if (needs) {
      const needsDesc: string[] = [];

      if (needs.hunger !== undefined && needs.hunger < 0.3) {
        needsDesc.push('hungry');
      }
      if (needs.energy !== undefined && needs.energy < 0.3) {
        needsDesc.push('tired');
      }
      if (needs.socialDepth !== undefined && needs.socialDepth < 0.3) {
        needsDesc.push('lonely');
      }

      if (needsDesc.length > 0) {
        context += `You feel: ${needsDesc.join(', ')}\n`;
      }
    }

    // Temperature (environmental condition)
    if (temperature) {
      const tempState = temperature.state;
      if (tempState === 'dangerously_cold') {
        context += '🥶 You are FREEZING! Find warmth immediately!\n';
      } else if (tempState === 'cold') {
        context += 'You are cold. You need to warm up.\n';
      } else if (tempState === 'comfortable') {
        context += 'The temperature is comfortable.\n';
      }
    }

    // Vision (what you see)
    if (vision) {
      const visibleResources: string[] = [];
      const visiblePlants: string[] = [];

      // Resources in view
      if (vision.seenResources && vision.seenResources.length > 0) {
        for (const resourceId of vision.seenResources) {
          const resource = world.getEntity(resourceId);
          if (!resource) continue;

          const resourceComp = resource.components.get('resource') as any;
          if (resourceComp?.type) {
            if (!visibleResources.includes(resourceComp.type)) {
              visibleResources.push(resourceComp.type);
            }
          }
        }
      }

      // Plants in view
      if (vision.seenPlants && vision.seenPlants.length > 0) {
        for (const plantId of vision.seenPlants) {
          const plant = world.getEntity(plantId);
          if (!plant) continue;

          const plantComp = plant.components.get('plant') as any;
          if (plantComp?.species) {
            const speciesName = plantComp.species.replace(/-/g, ' ');
            if (!visiblePlants.includes(speciesName)) {
              visiblePlants.push(speciesName);
            }
          }
        }
      }

      if (visibleResources.length > 0) {
        context += `You see resources: ${visibleResources.join(', ')}\n`;
      }

      if (visiblePlants.length > 0) {
        context += `You see plants: ${visiblePlants.join(', ')}\n`;
      }

      // Terrain description
      if (vision.terrainDescription &&
          vision.terrainDescription.trim() &&
          !vision.terrainDescription.toLowerCase().includes('unremarkable')) {
        context += `Terrain: ${vision.terrainDescription}\n`;
      }
    }

    // Location context (biome, named places)
    // TODO: Add biome/location context when available in components

    return context;
  }

  /**
   * Build social memories: recent conversations, interactions, events.
   * Talker cares about social history.
   */
  private buildSocialMemories(episodicMemory: EpisodicMemoryComponent | undefined, world: World): string {
    if (!episodicMemory?.memories || episodicMemory.memories.length === 0) {
      return 'You have no significant recent memories.\n';
    }

    let context = '--- Recent Memories ---\n';

    // Filter to social-relevant memories
    const socialMemories = episodicMemory.memories
      .filter((mem: EpisodicMemory) => {
        const eventType = mem.event as string;
        return eventType.includes('conversation') ||
               eventType.includes('met_agent') ||
               eventType.includes('social') ||
               eventType.includes('relationship');
      })
      .slice(-5); // Last 5 social memories

    if (socialMemories.length === 0) {
      return 'You have no significant recent social memories.\n';
    }

    for (const memory of socialMemories) {
      context += `- ${memory.description}\n`;
    }

    return context;
  }

  /**
   * Get available Talker actions.
   * Only social tools: talk, follow_agent, call_meeting, attend_meeting, help
   */
  private getAvailableTalkerActions(
    conversation: ConversationComponent | undefined,
    vision: VisionComponent | undefined,
    world: World
  ): string[] {
    const actions: string[] = [];

    // talk - available if nearby agents or in active conversation
    const hasNearbyAgents = vision?.seenAgents && vision.seenAgents.length > 1; // More than just self
    const hasHeardSpeech = vision?.heardSpeech && vision.heardSpeech.length > 0;

    if (hasNearbyAgents || hasHeardSpeech || conversation?.isActive) {
      actions.push('talk - Have a conversation with someone nearby');
    }

    // follow_agent - available if nearby agents
    if (hasNearbyAgents) {
      actions.push('follow_agent - Follow someone');
    }

    // call_meeting - available if nearby agents
    if (hasNearbyAgents) {
      actions.push('call_meeting - Call a meeting to discuss something');
    }

    // attend_meeting - available if there's an ongoing meeting
    // TODO: Check for ongoing meetings when meeting system is implemented
    // actions.push('attend_meeting - Attend an ongoing meeting');

    // help - available if nearby agents
    if (hasNearbyAgents) {
      actions.push('help - Help another agent with their task');
    }

    // set_personal_goal - always available
    actions.push('set_personal_goal - Set a new personal goal');

    // set_medium_term_goal - always available
    actions.push('set_medium_term_goal - Set a goal for the next few days');

    // set_group_goal - available if nearby agents
    if (hasNearbyAgents) {
      actions.push('set_group_goal - Propose a goal for the village');
    }

    // wander/idle - fallback (always available)
    actions.push('wander - Explore your surroundings casually');
    actions.push('idle - Take a moment to think and rest');

    return actions;
  }

  /**
   * Build instruction for Talker.
   * Context-aware based on conversation state, personality, and needs.
   */
  private buildTalkerInstruction(
    conversation: ConversationComponent | undefined,
    needs: NeedsComponent | undefined,
    personality: PersonalityComponent | undefined,
    vision: VisionComponent | undefined,
    world: World
  ): string {
    // PRIORITY 1: Active conversation
    if (conversation?.isActive && conversation?.partnerId) {
      const partner = world.getEntity(conversation.partnerId);
      const partnerIdentity = partner?.components.get('identity') as IdentityComponent | undefined;
      const partnerName = partnerIdentity?.name || 'them';

      return `You're in a conversation with ${partnerName}. Read the conversation history above and respond naturally. What do you want to say?`;
    }

    // PRIORITY 2: Heard speech (potential conversation)
    const hasHeardSpeech = vision?.heardSpeech && vision.heardSpeech.length > 0;
    if (hasHeardSpeech) {
      return 'You hear someone speaking nearby. Do you want to respond or join the conversation? What will you do?';
    }

    // PRIORITY 3: Social depth need critical (lonely)
    if (needs?.socialDepth !== undefined && needs.socialDepth < 0.3) {
      return 'You feel very lonely. Consider finding someone to talk to or setting a social goal. What will you do?';
    }

    // PRIORITY 4: Extroverted personality + nearby agents
    const hasNearbyAgents = vision?.seenAgents && vision.seenAgents.length > 1;
    if (hasNearbyAgents && personality?.extraversion && personality.extraversion > 0.6) {
      return 'You see people nearby and feel social. Do you want to talk to someone or set a new goal? What will you do?';
    }

    // Default: general decision
    return 'What would you like to do right now? You can talk to people, set goals, or explore.';
  }

  /**
   * Format prompt sections into single string.
   * Follows StructuredPromptBuilder pattern.
   */
  private formatPrompt(prompt: TalkerPrompt): string {
    const sections: string[] = [prompt.systemPrompt];

    // Schema-driven component info
    if (prompt.schemaPrompt && prompt.schemaPrompt.trim()) {
      sections.push(prompt.schemaPrompt);
    }

    // Social context (core of Talker's awareness)
    if (prompt.socialContext && prompt.socialContext.trim()) {
      sections.push(prompt.socialContext);
    }

    // Environment context
    if (prompt.environmentContext && prompt.environmentContext.trim()) {
      sections.push(prompt.environmentContext);
    }

    // Goals
    if (prompt.goals && prompt.goals.trim()) {
      sections.push('Your Goals:\n' + prompt.goals);
    }

    // Memories
    if (prompt.memories && !prompt.memories.includes('no significant recent')) {
      sections.push(prompt.memories);
    }

    // Available actions
    if (prompt.availableActions && prompt.availableActions.length > 0) {
      sections.push('What You Can Do:\n' + prompt.availableActions.map(a => `- ${a}`).join('\n'));
    }

    // Instruction
    sections.push(prompt.instruction);

    // Response format
    const responseFormat = `RESPOND IN JSON ONLY. Use this exact format:
{
  "speaking": "what you say out loud (or empty string if silent)",
  "action": {
    "type": "action_name",
    "target": "optional target like agent name"
  },
  "goal": {
    "type": "personal" | "medium_term" | "group",
    "description": "goal description (if setting a goal)"
  }
}`;

    sections.push(responseFormat);

    return sections.join('\n\n');
  }
}
