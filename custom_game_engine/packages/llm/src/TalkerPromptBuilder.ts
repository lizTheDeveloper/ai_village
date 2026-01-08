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
  type ResourceComponent,
  formatGoalsForPrompt,
  formatGoalsSectionForPrompt,
} from '@ai-village/core';
import { generatePersonalityPrompt } from './PersonalityPromptTemplates.js';
import { promptCache } from './PromptCacheManager.js';
import { PromptRenderer } from '@ai-village/introspection';
import { BEHAVIOR_DESCRIPTIONS } from './ActionDefinitions.js';

/**
 * Talker prompt structure - focused on social and environmental awareness
 */
export interface TalkerPrompt {
  systemPrompt: string;         // Personality and identity
  schemaPrompt?: string;         // Auto-generated schema-driven component info
  socialContext: string;         // Conversations, relationships, nearby agents
  environmentContext: string;    // Vision, weather, temperature, needs, location
  goals?: string;                // Personal and social goals (legacy format)
  goalsSection?: string | null;  // Dedicated goals section with completion percentages
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
   * Socially-relevant component types for Talker.
   * Only these components are rendered in the schema prompt.
   *
   * KEEP: Components that inform social decisions, personality, needs, goals
   * EXCLUDE: Combat stats, navigation details, metadata that doesn't affect social behavior
   */
  private static readonly SOCIALLY_RELEVANT_COMPONENTS = new Set([
    // Core identity and personality
    'identity',
    'personality',
    'emotional_state',
    'mood',

    // Social components
    'relationships',
    'social_knowledge',
    'conversation',
    'social_memory',

    // Memory and cognition (social context)
    'memory',
    'episodic_memory',
    'semantic_memory',
    'beliefs',

    // Goals and motivations
    'goals',

    // Needs (affect mood and social behavior)
    'needs',
    'afterlife_needs',

    // Inventory (what you have affects conversations)
    'inventory',

    // Skills (what you can do affects social standing)
    'skills',

    // Physical state (injuries/health affect behavior)
    'health',
    'physical_state',
    'temperature', // Being cold affects mood

    // Spiritual/cognitive state (if actively relevant)
    'spiritual',
    'soul',

    // Journal/diary entries
    'journal',
  ]);

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
    const schemaPrompt = this.buildSchemaPrompt(agent, world);

    // System Prompt: Who you are (personality, identity)
    const systemPrompt = this.buildSystemPrompt(identity?.name || 'Agent', personality, agent.id);

    // Social Context: Conversations, relationships, nearby agents
    const socialContext = this.buildSocialContext(conversation, relationships, vision, world, agent.id);

    // Environment Context: Vision, weather, temperature, needs, location
    const environmentContext = this.buildEnvironmentContext(needs, vision, temperature, world, agent);

    // Personal Goals: What you want (personal and social)
    const goals = agent.components.get('goals') as GoalsComponent | undefined;
    const goalsText = goals ? formatGoalsForPrompt(goals) : undefined;
    const goalsSectionText = goals ? formatGoalsSectionForPrompt(goals) : null;

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
      goalsSection: goalsSectionText,
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
   * Auto-generates prompts for socially-relevant schema'd components only.
   *
   * Filters out components irrelevant to social decisions (combat stats, navigation, metadata, etc.)
   */
  private buildSchemaPrompt(agent: Entity, world: World): string {
    // Create a filtered entity with only socially-relevant components
    const filteredComponents = new Map<string, any>();

    for (const [componentType, componentData] of agent.components.entries()) {
      if (TalkerPromptBuilder.SOCIALLY_RELEVANT_COMPONENTS.has(componentType)) {
        filteredComponents.set(componentType, componentData);
      }
    }

    // Create temporary filtered entity for rendering
    const filteredEntity = {
      id: agent.id,
      components: filteredComponents
    };

    const schemaPrompt = PromptRenderer.renderEntity(filteredEntity as any, world);

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

      context += `\n[ACTIVE CONVERSATION] with ${partnerName}\n`;

      // Social fatigue tracking
      if (conversation.socialFatigue !== undefined && conversation.fatigueThreshold !== undefined) {
        const fatiguePercent = Math.round((conversation.socialFatigue / 100) * 100);
        const thresholdPercent = Math.round((conversation.fatigueThreshold / 100) * 100);

        if (conversation.socialFatigue >= conversation.fatigueThreshold) {
          context += `[SOCIAL FATIGUE: ${fatiguePercent}%] You're mentally exhausted from talking and need a break.\n`;
        } else if (conversation.socialFatigue >= conversation.fatigueThreshold * 0.8) {
          context += `[SOCIAL FATIGUE: ${fatiguePercent}%] You're getting tired of talking.\n`;
        } else if (conversation.socialFatigue >= conversation.fatigueThreshold * 0.5) {
          context += `[Social fatigue: ${fatiguePercent}%] The conversation is starting to drain you.\n`;
        }
      }

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

      // Helper to format speaker with relationship context
      const formatSpeaker = (speech: { speaker: string; text: string; speakerId?: string }): string => {
        const speakerId = speech.speakerId;
        if (!speakerId || !relationships?.relationships) {
          return speech.speaker;
        }
        const rel = relationships.relationships.get(speakerId);
        if (!rel) {
          return `${speech.speaker} (stranger)`;
        }
        // affinity is -100 to 100
        if (rel.affinity > 70) return `${speech.speaker} (close friend)`;
        if (rel.affinity > 40) return `${speech.speaker} (friend)`;
        if (rel.affinity > 10) return `${speech.speaker} (acquaintance)`;
        if (rel.affinity < -40) return `${speech.speaker} (dislike)`;
        if (rel.affinity < -10) return `${speech.speaker} (wary of)`;
        return `${speech.speaker} (acquaintance)`;
      };

      if (speakerCount === 1) {
        const firstSpeech = vision.heardSpeech[0];
        if (firstSpeech) {
          context += '\nWhat you hear:\n';
          context += `- ${formatSpeaker(firstSpeech)} says: "${firstSpeech.text}"\n`;
        }
      } else {
        context += `\n--- GROUP CONVERSATION (${speakerCount} people talking nearby) ---\n`;
        vision.heardSpeech.forEach((speech: { speaker: string; text: string; speakerId?: string }) => {
          context += `${formatSpeaker(speech)}: "${speech.text}"\n`;
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
      // Critical needs first (for extraction to top of prompt)
      if (needs.hunger !== undefined && needs.hunger < 0.2) {
        context += '[CRITICAL] You are starving! You must eat immediately!\n';
      }
      if (needs.energy !== undefined && needs.energy < 0.2) {
        context += '[CRITICAL] You are exhausted! You must rest immediately!\n';
      }

      // Regular needs
      const needsDesc: string[] = [];

      if (needs.hunger !== undefined && needs.hunger >= 0.2 && needs.hunger < 0.3) {
        needsDesc.push('hungry');
      }
      if (needs.energy !== undefined && needs.energy >= 0.2 && needs.energy < 0.3) {
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
    // NOTE: Critical cold warnings ([FREEZING], [COLD WARNING]) are already extracted
    // to the top of the prompt via extractCriticalNeeds(). Only show comfortable state here.
    if (temperature) {
      const tempState = temperature.state;
      if (tempState === 'comfortable') {
        context += 'The temperature is comfortable.\n';
      }
      // 'cold' and 'dangerously_cold' are shown at the top as critical needs
    }

    // Vision (what you see) - HIGH-LEVEL AWARENESS ONLY
    // Talker sees WHAT is around, not detailed counts/locations
    // That's for Executor to worry about
    if (vision) {
      const hasResources = vision.seenResources && vision.seenResources.length > 0;
      const hasPlants = vision.seenPlants && vision.seenPlants.length > 0;

      // Show specific resource types (agents need to know what materials are available)
      if (hasResources || hasPlants) {
        const resourceTypes = new Set<string>();

        if (vision.seenResources) {
          vision.seenResources.forEach(entityId => {
            const resource = world.getEntity(entityId);
            const resourceComp = resource?.components.get('resource') as ResourceComponent | undefined;
            if (resourceComp?.resourceType) {
              resourceTypes.add(resourceComp.resourceType);
            }
          });
        }

        if (vision.seenPlants) {
          vision.seenPlants.forEach(entityId => {
            const plant = world.getEntity(entityId);
            const plantComp = plant?.components.get('plant') as any;
            if (plantComp?.speciesId) {
              resourceTypes.add(plantComp.speciesId);
            }
          });
        }

        if (resourceTypes.size > 0) {
          context += `Materials around: ${Array.from(resourceTypes).join(', ')}\n`;
        }
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
   * Format action with description from BEHAVIOR_DESCRIPTIONS (single source of truth).
   */
  private formatAction(behavior: string): string {
    const description = BEHAVIOR_DESCRIPTIONS.get(behavior) || behavior;
    return `${behavior} - ${description}`;
  }

  /**
   * Get available Talker actions.
   * Only social tools: talk, follow_agent, call_meeting, attend_meeting, help
   * Uses BEHAVIOR_DESCRIPTIONS as single source of truth for descriptions.
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
      actions.push(this.formatAction('talk'));
    }

    // follow_agent - available if nearby agents
    if (hasNearbyAgents) {
      actions.push(this.formatAction('follow_agent'));
    }

    // call_meeting - available if nearby agents
    if (hasNearbyAgents) {
      actions.push(this.formatAction('call_meeting'));
    }

    // attend_meeting - available if there's an ongoing meeting
    // TODO: Check for ongoing meetings when meeting system is implemented

    // help - available if nearby agents
    if (hasNearbyAgents) {
      actions.push(this.formatAction('help'));
    }

    // Goal-setting actions (always available)
    actions.push(this.formatAction('set_personal_goal'));
    actions.push(this.formatAction('set_medium_term_goal'));

    // set_group_goal - available if nearby agents
    if (hasNearbyAgents) {
      actions.push(this.formatAction('set_group_goal'));
    }

    // NOTE: wander/idle are AUTONOMIC fallback behaviors, NOT Talker decisions.
    // If Talker has nothing social to do, it should set a goal or return no action.
    // The autonomic layer will handle fallback to wander/idle.

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
    const criticalNeeds: string[] = [];

    // Surface critical needs prominently
    if (needs?.hunger !== undefined && needs.hunger < 0.2) {
      criticalNeeds.push('you are starving');
    }
    if (needs?.energy !== undefined && needs.energy < 0.2) {
      criticalNeeds.push('you are exhausted');
    }

    const criticalPrefix = criticalNeeds.length > 0
      ? `CRITICAL: ${criticalNeeds.join(' and ')}. `
      : '';

    // PRIORITY 1: Active conversation
    if (conversation?.isActive && conversation?.partnerId) {
      const partner = world.getEntity(conversation.partnerId);
      const partnerIdentity = partner?.components.get('identity') as IdentityComponent | undefined;
      const partnerName = partnerIdentity?.name || 'them';

      return `${criticalPrefix}You're in a conversation with ${partnerName}. Read the conversation history above and respond naturally. What do you want to say?`;
    }

    // PRIORITY 2: Heard speech (potential conversation)
    const hasHeardSpeech = vision?.heardSpeech && vision.heardSpeech.length > 0;
    if (hasHeardSpeech) {
      return `${criticalPrefix}You hear someone speaking nearby. Do you want to respond or join the conversation? What will you do?`;
    }

    // PRIORITY 3: Social depth need critical (lonely)
    if (needs?.socialDepth !== undefined && needs.socialDepth < 0.3) {
      return `${criticalPrefix}You feel very lonely. Consider finding someone to talk to or setting a social goal. What will you do?`;
    }

    // PRIORITY 4: Extroverted personality + nearby agents
    const hasNearbyAgents = vision?.seenAgents && vision.seenAgents.length > 1;
    if (hasNearbyAgents && personality?.extraversion && personality.extraversion > 0.6) {
      return `${criticalPrefix}You see people nearby and feel social. Do you want to talk to someone or set a new goal? What will you do?`;
    }

    // Default: general decision
    return `${criticalPrefix}What would you like to do right now? You can talk to people, set goals, or explore.`;
  }

  /**
   * Extract critical needs from environment context for top-priority display.
   * Parses warnings from environment context to put at the very top.
   */
  private extractCriticalNeeds(environmentContext: string): string | null {
    const criticalLines: string[] = [];

    // Extract critical warnings (freezing, cold, starving, exhausted)
    const lines = environmentContext.split('\n');
    for (const line of lines) {
      if (line.includes('[FREEZING]') ||
          line.includes('[COLD WARNING]') ||
          line.includes('[CRITICAL]')) {
        criticalLines.push(line.trim());
      }
    }

    if (criticalLines.length === 0) {
      return null;
    }

    return `!!! CRITICAL NEEDS !!!\n${criticalLines.join('\n')}\n!!! ACT IMMEDIATELY !!!`;
  }

  /**
   * Format prompt sections into single string.
   * Follows StructuredPromptBuilder pattern.
   */
  private formatPrompt(prompt: TalkerPrompt): string {
    const sections: string[] = [];

    // CRITICAL NEEDS FIRST - absolute top priority
    const criticalNeeds = this.extractCriticalNeeds(prompt.environmentContext);
    if (criticalNeeds) {
      sections.push(criticalNeeds);
    }

    // Then identity and personality
    sections.push(prompt.systemPrompt);

    // Character guidelines - roleplay directive
    const characterGuidelines = `--- YOUR ROLE ---
You are the social brain. You speak, set goals, notice people and vibes. Focus on WHAT you want and WHY. Talk naturally, be socially aware.`;

    sections.push(characterGuidelines);

    // YOUR CURRENT GOALS - Prominent display early in prompt
    if (prompt.goalsSection) {
      sections.push(`--- YOUR CURRENT GOALS ---\n${prompt.goalsSection}`);
    }

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
    const responseFormat = `--- RESPONSE FORMAT ---

CRITICAL: Output ONLY valid JSON. DO NOT include labels like "Action:", "Speaking:", or "Thoughts:".
Start your response with { and end with }. NO extra text before or after the JSON.

DO NOT start your speech with your name - the conversation already shows who's speaking.
Speak naturally without announcing yourself (e.g., "Kestrel here" or "Clay speaking").

Example of CORRECT response:
{
  "speaking": "I think we should gather more wood before winter.",
  "action": {
    "type": "talk"
  }
}

Use this exact format:
{
  "speaking": "what you say out loud (leave empty only if alone or deep in thought)",
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
