/**
 * TalkerPromptBuilder - Layer 2 of three-layer LLM architecture
 *
 * THE SOCIAL & VERBAL PLANNING LAYER
 *
 * This is your SOCIAL BRAIN and GOAL-SETTING SYSTEM. You focus on:
 * - Conversations and relationships (talk, listen, socialize)
 * - Setting goals and priorities (what you want to accomplish)
 * - Verbal planning (thinking about what to do, not doing it)
 * - Social awareness (who's around, what they're saying, how you feel about them)
 * - Environmental awareness (general sense of surroundings, not detailed resource tracking)
 *
 * You are NOT:
 * - A task executor (you set goals, Executor handles the details)
 * - A resource manager (you notice resources exist, Autonomic/Executor manages them)
 * - A strategic planner (you set personal goals, Executor plans how to achieve them)
 *
 * Think of yourself as the "social planner" - you decide WHAT you want and WHY,
 * but you don't worry about the detailed HOW. You're all about people, goals, and vibes.
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
      if (conversation.messages && conversation.messages.length > 0) {
        context += 'Conversation history:\n';
        conversation.messages.slice(-5).forEach((msg) => {
          context += `  ${msg.speakerId}: "${msg.message}"\n`;
        });
      }

      // Conversation style based on personality
      if (partner) {
        const partnerPersonality = partner.components.get('personality') as PersonalityComponent | undefined;
        if (partnerPersonality) {
          // Infer conversation style from personality traits
          const extraversion = partnerPersonality.extraversion ?? 0.5;
          const agreeableness = partnerPersonality.agreeableness ?? 0.5;
          let style = 'neutral';
          if (extraversion > 0.7) style = 'talkative and outgoing';
          else if (extraversion < 0.3) style = 'quiet and reserved';
          if (agreeableness > 0.7) style += ', friendly';
          else if (agreeableness < 0.3) style += ', blunt';
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
          const rel = relationships.relationships.get(seenId);
          if (rel) {
            // affinity is -100 to 100, normalize to check relationships
            if (rel.affinity > 70) {
              relationshipNote = ' (close friend)';
            } else if (rel.affinity > 40) {
              relationshipNote = ' (friend)';
            } else if (rel.affinity < -40) {
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
    if (relationships?.relationships && relationships.relationships.size > 0) {
      const allRels = Array.from(relationships.relationships.values());
      const importantRels = allRels
        .filter((r: Relationship) => Math.abs(r.affinity) > 50)
        .slice(0, 3);

      if (importantRels.length > 0) {
        context += '\nImportant relationships:\n';
        for (const rel of importantRels) {
          const target = world.getEntity(rel.targetId);
          const targetIdentity = target?.components.get('identity') as IdentityComponent | undefined;
          const targetName = targetIdentity?.name || 'someone';

          // affinity is -100 to 100
          const affectionDesc = rel.affinity > 70 ? 'deeply care about' :
                               rel.affinity > 40 ? 'like' :
                               rel.affinity < -70 ? 'strongly dislike' :
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

    // Vision (what you see) - HIGH-LEVEL AWARENESS ONLY
    // Talker sees WHAT is around, not detailed counts/locations
    // That's for Executor to worry about
    if (vision) {
      const resourceTypes = new Set<string>();
      const plantTypes = new Set<string>();

      // Resources in view - just note the types exist
      if (vision.seenResources && vision.seenResources.length > 0) {
        for (const resourceId of vision.seenResources) {
          const resource = world.getEntity(resourceId);
          if (!resource) continue;

          const resourceComp = resource.components.get('resource') as any;
          if (resourceComp?.type) {
            resourceTypes.add(resourceComp.type);
          }
        }
      }

      // Plants in view - just note the types exist
      if (vision.seenPlants && vision.seenPlants.length > 0) {
        for (const plantId of vision.seenPlants) {
          const plant = world.getEntity(plantId);
          if (!plant) continue;

          const plantComp = plant.components.get('plant') as any;
          if (plantComp?.species) {
            const speciesName = plantComp.species.replace(/-/g, ' ');
            plantTypes.add(speciesName);
          }
        }
      }

      // Simple awareness: just mention types, no counts
      if (resourceTypes.size > 0) {
        const resourceList = Array.from(resourceTypes).join(', ');
        context += `You notice some ${resourceList} around.\n`;
      }

      if (plantTypes.size > 0) {
        const plantList = Array.from(plantTypes).join(', ');
        context += `You see some ${plantList} nearby.\n`;
      }

      // Terrain description - general awareness
      if (vision.terrainDescription &&
          vision.terrainDescription.trim() &&
          !vision.terrainDescription.toLowerCase().includes('unremarkable')) {
        context += `The area is ${vision.terrainDescription}.\n`;
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
    const memories = episodicMemory?.episodicMemories;
    if (!memories || memories.length === 0) {
      return 'You have no significant recent memories.\n';
    }

    let context = '--- Recent Memories ---\n';

    // Filter to social-relevant memories
    const socialMemories = [...memories]
      .filter((mem: EpisodicMemory) => {
        const eventType = mem.eventType;
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
      context += `- ${memory.summary}\n`;
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

    // Character guidelines - roleplay directive
    const characterGuidelines = `--- YOUR ROLE: THE SOCIAL & VERBAL PLANNING LAYER ---

You are the SOCIAL BRAIN and GOAL-SETTER for this character. Your job is to:
- TALK and socialize (have conversations, build relationships, express yourself)
- SET HIGH-LEVEL GOALS (decide what you want to accomplish and why)
- EXPRESS DESIRES ("I want to gather berries", "Let's build a farm")
- Be SOCIALLY AWARE (notice people, feelings, vibes, relationships)
- GENERAL AWARENESS of environment ("berries are around", "plants nearby")

You are NOT responsible for:
- Detailed resource tracking (you see "berries around", not "3 berries at x:10 y:20")
- Task execution and tool calls (Executor handles "plan_build", "gather", etc.)
- Multi-step planning (you say "gather 50 berries", Executor figures out how)
- Resource management (Executor tracks counts, locations, and availability)

COORDINATION WITH EXECUTOR:
- YOU set the goal: "Gather at least 50 berries for winter storage"
- EXECUTOR reads your goal and creates the plan: finds berries → gathers 50 → stores them
- YOU provide the WHAT and WHY
- EXECUTOR provides the detailed HOW

When responding:
- SPEAK out loud using the "speaking" field (express yourself verbally!)
- SET GOALS using set_personal_goal, set_medium_term_goal, set_group_goal
- Example goal: "Gather at least 50 berries for the village"
- Example goal: "Plant a berry farm with 20 berry bushes in rows"
- Talk about WHAT you want, not HOW to do it
- Use natural, conversational language
- Express emotions, opinions, and personality through dialogue

Remember: You're the voice and vision-setter. Executor is the hands and planner. You dream it, Executor does it.`;

    sections.push(characterGuidelines);

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
