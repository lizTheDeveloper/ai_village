/**
 * MobileTalkerPromptBuilder - Stripped-down variant of TalkerPromptBuilder
 *
 * Targets 300-500 token prompts for small (1.5B) browser LLM models.
 * Reuses the same ECS component access patterns but renders everything
 * much more concisely. Output is plain text speech/thought, not structured JSON.
 *
 * Key constraints vs TalkerPromptBuilder:
 * - 2-3 sentence system prompt (no full personality template)
 * - Current conversation partner only (no nearby agents list)
 * - No schema-driven component rendering
 * - Only 2 most recent memories
 * - Limited to 3 actions: talk, set_personal_goal, follow_agent
 * - Plain text output (not tool-call JSON)
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import {
  type IdentityComponent,
  type PersonalityComponent,
  type NeedsComponent,
  type ConversationComponent,
  type EpisodicMemoryComponent,
  type EpisodicMemory,
  type GoalsComponent,
  type MoodComponent,
} from '@ai-village/core';
import { BEHAVIOR_DESCRIPTIONS } from './ActionDefinitions.js';

/**
 * MobileTalkerPromptBuilder - Builds ultra-compact prompts for 1.5B browser LLMs.
 *
 * Same public interface as TalkerPromptBuilder but produces 300-500 token output.
 * Returns a plain text prompt requesting plain text speech/thought as output.
 */
export class MobileTalkerPromptBuilder {
  /**
   * Build a compact Talker prompt for a small browser LLM.
   *
   * Targets 300-500 total input tokens. Output should be the creature's
   * speech or thought as plain text (not JSON).
   */
  buildPrompt(agent: Entity, world: World): string {
    const identity = agent.components.get('identity') as IdentityComponent | undefined;
    const personality = agent.components.get('personality') as PersonalityComponent | undefined;
    const needs = agent.components.get('needs') as NeedsComponent | undefined;
    const conversation = agent.components.get('conversation') as ConversationComponent | undefined;
    const episodicMemory = agent.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
    const goals = agent.components.get('goals') as GoalsComponent | undefined;
    const mood = agent.components.get('mood') as MoodComponent | undefined;

    const name = identity?.name || 'Creature';

    const sections: string[] = [];

    // 1. System prompt: 2-3 sentences — identity + personality core
    sections.push(this.buildSystemPrompt(name, personality));

    // 2. Current state: needs + emotion inline (no section headers, just facts)
    const stateText = this.buildInlineState(needs, mood);
    if (stateText) {
      sections.push(stateText);
    }

    // 3. Active goal (single most relevant goal only)
    const goalText = this.buildTopGoal(goals);
    if (goalText) {
      sections.push(goalText);
    }

    // 4. Social context: current conversation partner only
    const socialText = this.buildConversationContext(conversation, world);
    if (socialText) {
      sections.push(socialText);
    }

    // 5. Two most recent memories
    const memoryText = this.buildRecentMemories(episodicMemory);
    if (memoryText) {
      sections.push(memoryText);
    }

    // 6. Available actions (3 only)
    sections.push(this.buildAvailableActions());

    // 7. Instruction — plain text response
    sections.push(this.buildInstruction(name, conversation, needs, world));

    return sections.join('\n');
  }

  /**
   * Build a 2-3 sentence system prompt from identity and personality.
   * Avoids the full personality template to keep token count low.
   */
  private buildSystemPrompt(name: string, personality: PersonalityComponent | undefined): string {
    if (!personality) {
      return `You are ${name}, a villager in a forest village. You want to help others and pursue your own goals.`;
    }

    const traits: string[] = [];

    const extraversion = personality.extraversion ?? 0.5;
    const agreeableness = personality.agreeableness ?? 0.5;
    const conscientiousness = personality.conscientiousness ?? 0.5;

    if (extraversion > 0.65) traits.push('outgoing');
    else if (extraversion < 0.35) traits.push('reserved');

    if (agreeableness > 0.65) traits.push('warm and cooperative');
    else if (agreeableness < 0.35) traits.push('blunt and self-reliant');

    if (conscientiousness > 0.65) traits.push('diligent');
    else if (conscientiousness < 0.35) traits.push('spontaneous');

    const traitPhrase = traits.length > 0 ? `, ${traits.join(', ')}` : '';

    return `You are ${name}${traitPhrase}. Speak and act true to your character.`;
  }

  /**
   * Inline the most critical state facts: hunger, energy, emotion.
   * One short line, no section header.
   */
  private buildInlineState(
    needs: NeedsComponent | undefined,
    mood: MoodComponent | undefined
  ): string | null {
    const parts: string[] = [];

    if (needs) {
      if (needs.hunger !== undefined && needs.hunger < 0.2) {
        parts.push('starving');
      } else if (needs.hunger !== undefined && needs.hunger < 0.35) {
        parts.push('hungry');
      }

      if (needs.energy !== undefined && needs.energy < 0.2) {
        parts.push('exhausted');
      } else if (needs.energy !== undefined && needs.energy < 0.35) {
        parts.push('tired');
      }

      if (needs.socialDepth !== undefined && needs.socialDepth < 0.3) {
        parts.push('lonely');
      }
    }

    // Emotional state from mood component
    if (mood?.emotionalState && mood.emotionalState !== 'content') {
      parts.push(`feeling ${mood.emotionalState}`);
    }

    if (parts.length === 0) return null;
    return `State: ${parts.join(', ')}.`;
  }

  /**
   * Return the single most active (non-completed) goal as one line.
   */
  private buildTopGoal(goals: GoalsComponent | undefined): string | null {
    if (!goals?.goals) return null;

    const activeGoal = goals.goals.find(g => !g.completed);
    if (!activeGoal) return null;

    return `Goal: ${activeGoal.description}`;
  }

  /**
   * Build conversation context: current partner and last 3 messages only.
   * No nearby agents list — strictly the active conversation.
   */
  private buildConversationContext(
    conversation: ConversationComponent | undefined,
    world: World
  ): string | null {
    if (!conversation?.isActive || !conversation.partnerId) return null;

    const partner = world.getEntity(conversation.partnerId);
    const partnerIdentity = partner?.components.get('identity') as IdentityComponent | undefined;
    const partnerName = partnerIdentity?.name || 'someone';

    const lines: string[] = [`Talking with ${partnerName}.`];

    if (conversation.messages && conversation.messages.length > 0) {
      const recent = conversation.messages.slice(-3);
      for (const msg of recent) {
        lines.push(`${msg.speakerId}: "${msg.message}"`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Return up to 2 most recent episodic memories as short summaries.
   */
  private buildRecentMemories(episodicMemory: EpisodicMemoryComponent | undefined): string | null {
    const memories = episodicMemory?.episodicMemories;
    if (!memories || memories.length === 0) return null;

    const recent = [...memories].slice(-2) as EpisodicMemory[];
    if (recent.length === 0) return null;

    return 'Memories:\n' + recent.map(m => `- ${m.summary}`).join('\n');
  }

  /**
   * Build the 3 available actions: talk, set_personal_goal, follow_agent.
   */
  private buildAvailableActions(): string {
    const behaviors = ['talk', 'set_personal_goal', 'follow_agent'] as const;
    const lines = behaviors.map(b => {
      const desc = BEHAVIOR_DESCRIPTIONS.get(b) || b;
      return `- ${b}: ${desc}`;
    });
    return 'Actions:\n' + lines.join('\n');
  }

  /**
   * Build a concise instruction requesting plain text speech/thought output.
   */
  private buildInstruction(
    name: string,
    conversation: ConversationComponent | undefined,
    needs: NeedsComponent | undefined,
    world: World
  ): string {
    // Critical need overrides everything
    if (needs?.hunger !== undefined && needs.hunger < 0.2) {
      return `${name} is starving. What does ${name} say or do right now? Reply in plain text as ${name}.`;
    }
    if (needs?.energy !== undefined && needs.energy < 0.2) {
      return `${name} is exhausted. What does ${name} say or do right now? Reply in plain text as ${name}.`;
    }

    // Active conversation
    if (conversation?.isActive && conversation.partnerId) {
      const partner = world.getEntity(conversation.partnerId);
      const partnerIdentity = partner?.components.get('identity') as IdentityComponent | undefined;
      const partnerName = partnerIdentity?.name || 'them';
      return `What does ${name} say to ${partnerName}? Reply in plain text as ${name}.`;
    }

    // Default
    return `What does ${name} think or say next? Reply in plain text as ${name}.`;
  }
}
