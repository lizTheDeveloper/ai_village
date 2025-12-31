/**
 * AngelAIDecisionProcessor - LLM-based decision making for angels
 *
 * Part of Phase 28: Angel Delegation System
 *
 * Handles:
 * - Prayer assignment to angels based on expertise and availability
 * - LLM-based response generation matching angel personality
 * - Energy management and task queuing
 * - Performance tracking and outcome evaluation
 */

import type { World } from '../ecs/World.js';
import type { AngelData, AngelPurpose, AngelRank } from './AngelSystem.js';
import type { Prayer, SpiritualComponent } from '../components/SpiritualComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { EntityImpl } from '../ecs/Entity.js';
import { answerPrayer as answerPrayerOnAgent } from '../components/SpiritualComponent.js';

/**
 * LLM Provider interface (simplified to avoid cross-package import issues)
 */
interface LLMProvider {
  generate(prompt: string): Promise<string>;
}

/**
 * Angel response from LLM
 */
interface AngelResponse {
  message: string;
  tone: 'gentle' | 'firm' | 'urgent' | 'encouraging';
  guidance?: {
    action?: string;
    reasoning?: string;
    timeframe?: string;
  };
}

/**
 * Angel personality traits for prompt building
 */
interface AngelPersonalityTraits {
  compassion: number;      // 0-1, caring vs distant
  strictness: number;      // 0-1, supportive vs tough love
  proactiveness: number;   // 0-1, reactive vs preventive
  wisdom: number;          // 0-1, quick vs thoughtful
}

/**
 * Default personality for angels based on purpose
 */
const DEFAULT_PERSONALITIES: Record<AngelPurpose, AngelPersonalityTraits> = {
  deliver_messages: {
    compassion: 0.6,
    strictness: 0.4,
    proactiveness: 0.5,
    wisdom: 0.6,
  },
  protect_believers: {
    compassion: 0.8,
    strictness: 0.3,
    proactiveness: 0.9,
    wisdom: 0.5,
  },
  guard_temple: {
    compassion: 0.3,
    strictness: 0.9,
    proactiveness: 0.7,
    wisdom: 0.6,
  },
  punish_heretics: {
    compassion: 0.2,
    strictness: 1.0,
    proactiveness: 0.8,
    wisdom: 0.7,
  },
  gather_souls: {
    compassion: 0.7,
    strictness: 0.4,
    proactiveness: 0.6,
    wisdom: 0.8,
  },
  perform_miracles: {
    compassion: 0.9,
    strictness: 0.2,
    proactiveness: 0.7,
    wisdom: 0.9,
  },
};

/**
 * Experience gained for answering prayers
 */
const XP_PER_PRAYER: Record<string, number> = {
  routine: 3,
  earnest: 15,
  desperate: 30,
};

export class AngelAIDecisionProcessor {
  private llmProvider?: LLMProvider;

  constructor(llmProvider?: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  /**
   * Set LLM provider (for dependency injection)
   */
  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
  }

  /**
   * Find the best angel to handle a prayer
   */
  findBestAngelForPrayer(
    prayer: Prayer,
    angels: AngelData[],
    world: World
  ): AngelData | null {
    // Filter angels that can handle this prayer
    const capable = angels.filter(angel =>
      this.angelCanHandle(angel, prayer, world)
    );

    if (capable.length === 0) return null;

    // Score each angel
    const scored = capable.map(angel => ({
      angel,
      score: this.scoreAngelForPrayer(angel, prayer, world),
    }));

    // Return best match
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.angel || null;
  }

  /**
   * Check if an angel can handle a prayer
   */
  private angelCanHandle(
    angel: AngelData,
    _prayer: Prayer,
    _world: World
  ): boolean {
    if (!angel.active) return false;

    // Not too many tasks queued?
    if (angel.currentTask) {
      // Angel is busy
      return false;
    }

    return true;
  }

  /**
   * Score an angel for handling a specific prayer
   */
  private scoreAngelForPrayer(
    angel: AngelData,
    prayer: Prayer,
    _world: World
  ): number {
    let score = 0;

    // Purpose match
    const purposeScore = this.scorePurposeMatch(angel.purpose, prayer);
    score += purposeScore * 40;

    // Rank bonus (higher rank = more capable)
    const rankScore = this.getRankScore(angel.rank);
    score += rankScore * 30;

    // Base success rate (would track in AngelData in future)
    score += 20;

    return score;
  }

  /**
   * Score how well an angel's purpose matches a prayer
   */
  private scorePurposeMatch(purpose: AngelPurpose, prayer: Prayer): number {
    // Help/plea prayers -> protect_believers
    if (prayer.type === 'help' || prayer.type === 'plea') {
      if (purpose === 'protect_believers') return 1.0;
      if (purpose === 'perform_miracles') return 0.8;
      return 0.3;
    }

    // Guidance prayers -> deliver_messages
    if (prayer.type === 'guidance') {
      if (purpose === 'deliver_messages') return 1.0;
      if (purpose === 'perform_miracles') return 0.7;
      return 0.4;
    }

    // Gratitude prayers -> gather_souls
    if (prayer.type === 'gratitude') {
      if (purpose === 'gather_souls') return 1.0;
      return 0.5;
    }

    // Default
    return 0.5;
  }

  /**
   * Get base score for angel rank
   */
  private getRankScore(rank: AngelRank): number {
    const scores: Record<AngelRank, number> = {
      messenger: 0.5,
      guardian: 0.7,
      warrior: 0.6,
      scholar: 0.8,
      seraph: 1.0,
    };
    return scores[rank];
  }

  /**
   * Generate an LLM-based response from an angel to a prayer
   */
  async generateAngelResponse(
    angel: AngelData,
    prayer: Prayer,
    world: World
  ): Promise<AngelResponse | null> {
    if (!this.llmProvider) {
      return this.generateFallbackResponse(angel, prayer);
    }

    try {
      const agentId = (prayer as any).agentId || prayer.id;
      const agent = world.getEntity(agentId);
      if (!agent) return null;

      const agentComp = agent.components.get(CT.Agent) as AgentComponent | undefined;
      const identity = agent.components.get(CT.Identity) as IdentityComponent | undefined;
      const spiritual = agent.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      const needs = agent.components.get(CT.Needs) as NeedsComponent | undefined;

      if (!agentComp || !spiritual || !identity) return null;

      // Build prompt
      const personality = DEFAULT_PERSONALITIES[angel.purpose];
      const prompt = this.buildAngelPrompt(
        angel,
        personality,
        prayer,
        identity,
        spiritual,
        needs
      );

      // Call LLM
      const responseText = await this.llmProvider.generate(prompt);

      // Parse response
      const response = this.parseAngelResponse(responseText);
      return response;

    } catch (error) {
      console.error(`[AngelAI] Failed to generate response: ${error}`);
      return this.generateFallbackResponse(angel, prayer);
    }
  }

  /**
   * Build LLM prompt for angel response
   */
  private buildAngelPrompt(
    angel: AngelData,
    personality: AngelPersonalityTraits,
    prayer: Prayer,
    identity: IdentityComponent,
    spiritual: SpiritualComponent,
    needs: NeedsComponent | undefined
  ): string {
    const angelName = this.getAngelName(angel.rank, angel.purpose);
    const personalityDesc = this.describePersonality(personality);

    return `You are ${angelName}, a divine angel serving as a ${angel.purpose.replace(/_/g, ' ')} guide.

ANGEL PERSONALITY:
${personalityDesc}

AGENT'S PRAYER:
From: ${identity.name}
Prayer: "${prayer.content}"
Urgency: ${prayer.urgency || 'medium'}
Faith: ${Math.round(spiritual.faith * 100)}%

CURRENT SITUATION:
- Health: ${needs ? Math.round(needs.health * 100) : 100}%
- Energy: ${needs ? Math.round(needs.energy * 100) : 100}%
- Total Prayers: ${spiritual.prayers.length}
- Unanswered: ${spiritual.unansweredPrayers}

Generate a divine vision to answer this prayer. The vision should:
1. Be practical and helpful
2. Match your personality (${personality.compassion > 0.7 ? 'gentle and caring' : personality.strictness > 0.7 ? 'firm and directive' : 'balanced'})
3. Feel divine, not mortal
4. Be specific to their situation
5. Be ${personality.wisdom > 0.6 ? 'thoughtful and deep' : 'direct and actionable'}

Respond with JSON:
{
  "message": "the vision (1-3 sentences)",
  "tone": "gentle" | "firm" | "urgent" | "encouraging"
}`;
  }

  /**
   * Get a name for an angel based on rank and purpose
   */
  private getAngelName(rank: AngelRank, purpose: AngelPurpose): string {
    const names: Record<AngelRank, string[]> = {
      messenger: ['Herald', 'Swift One', 'Messenger'],
      guardian: ['Protector', 'Watcher', 'Guardian'],
      warrior: ['Defender', 'Champion', 'Warrior'],
      scholar: ['Sage', 'Wise One', 'Scholar'],
      seraph: ['Seraph', 'Radiant One', 'Luminary'],
    };

    const rankNames = names[rank] || ['Angel'];
    const index = purpose.charCodeAt(0) % rankNames.length;
    return rankNames[index] || 'Angel';
  }

  /**
   * Describe personality traits for prompt
   */
  private describePersonality(personality: AngelPersonalityTraits): string {
    const traits: string[] = [];

    if (personality.compassion > 0.7) {
      traits.push('- Very caring and empathetic');
    } else if (personality.compassion < 0.3) {
      traits.push('- Distant and detached');
    } else {
      traits.push('- Balanced compassion');
    }

    if (personality.strictness > 0.7) {
      traits.push('- Strict and demanding (tough love)');
    } else if (personality.strictness < 0.3) {
      traits.push('- Supportive and gentle');
    } else {
      traits.push('- Balanced approach');
    }

    if (personality.proactiveness > 0.7) {
      traits.push('- Proactive and preventive');
    } else {
      traits.push('- Reactive to situations');
    }

    if (personality.wisdom > 0.7) {
      traits.push('- Thoughtful and contemplative');
    } else {
      traits.push('- Quick and direct');
    }

    return traits.join('\n');
  }

  /**
   * Parse LLM response into structured format
   */
  private parseAngelResponse(responseText: string): AngelResponse {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(responseText);
      return {
        message: parsed.message || parsed.vision || 'The divine watches over you.',
        tone: parsed.tone || 'gentle',
        guidance: parsed.guidance,
      };
    } catch {
      // Fallback: treat as plain text
      return {
        message: responseText.trim(),
        tone: 'gentle',
      };
    }
  }

  /**
   * Generate a fallback response when LLM is unavailable
   */
  private generateFallbackResponse(
    angel: AngelData,
    _prayer: Prayer
  ): AngelResponse {
    const templates = this.getFallbackTemplates(angel.purpose);
    const template = templates[Math.floor(Math.random() * templates.length)] ||
      'Your prayer has been heard. Have faith.';

    return {
      message: template,
      tone: 'gentle',
    };
  }

  /**
   * Get fallback response templates for each purpose
   */
  private getFallbackTemplates(purpose: AngelPurpose): string[] {
    const templates: Record<AngelPurpose, string[]> = {
      deliver_messages: [
        'Your prayers are heard. Guidance shall come.',
        'The divine light shines upon your path.',
        'Trust in the wisdom that guides you.',
      ],
      protect_believers: [
        'You are watched over and protected.',
        'Fear not, for divine protection surrounds you.',
        'Your safety is assured in faith.',
      ],
      guard_temple: [
        'The sacred grounds are secure.',
        'Your devotion strengthens the temple.',
        'Faith guards what matters most.',
      ],
      punish_heretics: [
        'Justice shall be served in time.',
        'Truth prevails over deception.',
        'The righteous path awaits.',
      ],
      gather_souls: [
        'Your soul grows brighter with faith.',
        'Continue on this righteous path.',
        'Your devotion is seen and valued.',
      ],
      perform_miracles: [
        'Wonders await those who believe.',
        'Faith can move mountains.',
        'Miracles happen for the faithful.',
      ],
    };

    return templates[purpose] || templates.deliver_messages;
  }

  /**
   * Answer a prayer using an angel
   */
  async answerPrayerWithAngel(
    angel: AngelData,
    prayer: Prayer,
    world: World
  ): Promise<boolean> {
    // Generate response
    const response = await this.generateAngelResponse(angel, prayer, world);
    if (!response) return false;

    // Get agent
    const agentId = (prayer as any).agentId || prayer.id;
    const agent = world.getEntity(agentId);
    if (!agent) return false;

    const spiritual = agent.components.get(CT.Spiritual) as SpiritualComponent;
    if (!spiritual) return false;

    // Update angel stats (would be tracked in enhanced AngelData)
    // For now, just mark task as complete

    // Send vision to agent
    const updatedSpiritual = answerPrayerOnAgent(
      spiritual,
      prayer.id,
      'vision',
      angel.deityId
    );
    (agent as EntityImpl).addComponent(updatedSpiritual);

    // Emit event
    world.eventBus.emit({
      type: 'angel:answered_prayer',
      source: 'angel_ai',
      data: {
        angelId: angel.id,
        deityId: angel.deityId,
        prayerId: prayer.id,
        agentId,
        response: response.message,
        tone: response.tone,
      },
    });

    return true;
  }

  /**
   * Get experience points for answering a prayer
   */
  getExperienceForPrayer(prayer: Prayer): number {
    const urgency = prayer.urgency || 'medium';
    return XP_PER_PRAYER[urgency] || 10;
  }
}
