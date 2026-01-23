/**
 * LLMVisionGenerator - Generate personalized visions using LLM
 *
 * Completes Phase 27: Divine Communication System
 *
 * Integrates LLM-based vision content generation for:
 * - Personalized visions based on agent context
 * - Prayer-responsive visions
 * - Deity personality-matched messaging
 * - Context-aware symbolic content
 */

import type { World } from '../ecs/World.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent, Prayer } from '../components/SpiritualComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { MoodComponent } from '../components/MoodComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type {
  VisionContent,
  VisionPurpose,
  VisionClarity,
} from './VisionDeliverySystem.js';
import type { LLMProvider } from '../types/LLMTypes.js';

/**
 * Vision generation request
 */
export interface VisionGenerationRequest {
  targetAgentId: string;
  deityId: string;
  purpose: VisionPurpose;
  clarity: VisionClarity;
  relatedPrayer?: Prayer;
  context?: string; // Additional context from deity/player
}

/**
 * LLM response format for visions
 */
interface LLMVisionResponse {
  subject: string;
  imagery: string[];
  symbols: string[];
  tone: 'peaceful' | 'urgent' | 'fearful' | 'joyful' | 'mysterious';
  hiddenMeaning?: string;
}

/**
 * Generate visions using LLM for personalization
 */
export class LLMVisionGenerator {
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
   * Generate vision content using LLM
   */
  async generateVision(
    request: VisionGenerationRequest,
    world: World
  ): Promise<VisionContent | null> {
    if (!this.llmProvider) {
      console.warn('[LLMVisionGenerator] No LLM provider set, cannot generate vision');
      return null;
    }

    try {
      // Get agent and deity entities
      const agent = world.getEntity(request.targetAgentId);
      const deity = world.getEntity(request.deityId);

      if (!agent || !deity) {
        console.error('[LLMVisionGenerator] Agent or deity not found');
        return null;
      }

      // Build context-rich prompt
      const prompt = this.buildVisionPrompt(request, agent as EntityImpl, deity as EntityImpl, world);

      // Call LLM
      const responseText = await this.llmProvider.generate(prompt);

      // Parse response
      const vision = this.parseVisionResponse(responseText, request.clarity);
      return vision;

    } catch (error) {
      console.error(`[LLMVisionGenerator] Failed to generate vision: ${error}`);
      return null;
    }
  }

  /**
   * Build LLM prompt for vision generation
   */
  private buildVisionPrompt(
    request: VisionGenerationRequest,
    agent: EntityImpl,
    deity: EntityImpl,
    _world: World
  ): string {
    const agentComp = agent.getComponent<AgentComponent>(CT.Agent);
    const identity = agent.getComponent<IdentityComponent>(CT.Identity);
    const spiritual = agent.getComponent<SpiritualComponent>(CT.Spiritual);
    const needs = agent.getComponent<NeedsComponent>(CT.Needs);
    const mood = agent.getComponent<MoodComponent>(CT.Mood);
    const deityComp = deity.getComponent<DeityComponent>(CT.Deity);

    if (!agentComp || !spiritual || !identity || !deityComp) {
      throw new Error('Missing required components for vision generation');
    }

    // Build agent context
    const agentContext = this.buildAgentContext(identity, spiritual, needs, mood, agentComp);

    // Build deity context
    const deityContext = this.buildDeityContext(deityComp);

    // Build purpose guidance
    const purposeGuidance = this.getPurposeGuidance(request.purpose);

    // Build clarity guidance
    const clarityGuidance = this.getClarityGuidance(request.clarity);

    // Build prayer context if applicable
    let prayerContext = '';
    if (request.relatedPrayer) {
      prayerContext = `\nRELATED PRAYER:
Prayer Type: ${request.relatedPrayer.type}
Urgency: ${request.relatedPrayer.urgency}
Content: "${request.relatedPrayer.content}"
The vision should respond to or acknowledge this prayer.`;
    }

    return `You are a divine entity sending a vision to one of your believers.

DEITY CONTEXT:
${deityContext}

BELIEVER CONTEXT:
Agent: ${identity.name}
Faith Level: ${Math.round(spiritual.faith * 100)}%
${agentContext}${prayerContext}

VISION PURPOSE: ${request.purpose}
${purposeGuidance}

VISION CLARITY: ${request.clarity}
${clarityGuidance}

${request.context ? `ADDITIONAL CONTEXT:\n${request.context}\n\n` : ''}Generate a divine vision for this believer. The vision should:
1. Be appropriate to their current situation and needs
2. Match the deity's domain and personality
3. Feel genuinely divine, not mundane
4. Use rich imagery and symbolism
5. Have the specified clarity level (${request.clarity})
${request.relatedPrayer ? '6. Respond meaningfully to their prayer\n' : ''}
Respond with JSON:
{
  "subject": "main subject of the vision (5-10 words)",
  "imagery": ["vivid image 1", "vivid image 2", "vivid image 3"],
  "symbols": ["symbol1", "symbol2", "symbol3"],
  "tone": "peaceful" | "urgent" | "fearful" | "joyful" | "mysterious",
  "hiddenMeaning": "the underlying message (only for symbolic/obscure visions)"
}`;
  }

  /**
   * Build agent context for prompt
   */
  private buildAgentContext(
    _identity: IdentityComponent,
    spiritual: SpiritualComponent,
    needs: NeedsComponent | undefined,
    mood: MoodComponent | undefined,
    agent: AgentComponent
  ): string {
    const context: string[] = [];

    // Current situation
    if (needs) {
      if (needs.hunger < 0.3) context.push(`- Hungry (${Math.round(needs.hunger * 100)}% satiation)`);
      if (needs.health < 0.5) context.push(`- Injured (${Math.round(needs.health * 100)}% health)`);
      if (needs.energy < 0.3) context.push(`- Exhausted (${Math.round(needs.energy * 100)}% energy)`);
    }

    // Mood
    if (mood) {
      const moodDesc = mood.currentMood > 50 ? 'joyful' :
                       mood.currentMood > 20 ? 'content' :
                       mood.currentMood > -20 ? 'neutral' :
                       mood.currentMood > -50 ? 'sad' : 'despairing';
      context.push(`- Mood: ${moodDesc} (${mood.currentMood})`);
    }

    // Spiritual state
    if (spiritual.crisisOfFaith) {
      context.push('- Experiencing crisis of faith');
    }
    if (spiritual.unansweredPrayers > 3) {
      context.push(`- Has ${spiritual.unansweredPrayers} unanswered prayers`);
    }
    if (spiritual.hasReceivedVision) {
      context.push('- Has received visions before');
    }

    // Recent activity
    if (agent.lastThought) {
      context.push(`- Recent thought: "${agent.lastThought}"`);
    }

    return context.length > 0 ? context.join('\n') : '- Living their daily life';
  }

  /**
   * Build deity context for prompt
   */
  private buildDeityContext(deity: DeityComponent): string {
    const context: string[] = [];

    context.push(`Name: ${deity.identity.primaryName || 'The Divine'}`);
    context.push(`Domain: ${deity.identity.domain || 'general divine presence'}`);
    context.push(`Believers: ${deity.believers.size}`);
    context.push(`Total Belief: ${Math.round(deity.belief.currentBelief)}`);

    if (deity.identity.describedForm) {
      context.push(`Form: ${deity.identity.describedForm}`);
    }

    return context.join('\n');
  }

  /**
   * Get guidance for vision purpose
   */
  private getPurposeGuidance(purpose: VisionPurpose): string {
    const guidance: Record<VisionPurpose, string> = {
      guidance: 'Provide direction or advice for a decision or path forward.',
      warning: 'Alert the believer to danger or consequence. Create urgency.',
      prophecy: 'Reveal something about the future. Use mysterious, time-related imagery.',
      command: 'Give a clear directive. The believer should know what action to take.',
      blessing: 'Convey favor, love, and encouragement. Uplifting and positive.',
      revelation: 'Share divine knowledge or truth. Profound and enlightening.',
    };

    return guidance[purpose];
  }

  /**
   * Get guidance for vision clarity
   */
  private getClarityGuidance(clarity: VisionClarity): string {
    const guidance: Record<VisionClarity, string> = {
      obscure: 'Very vague and confusing. Hard to interpret. Fragmented images.',
      symbolic: 'Clear imagery but symbolic meaning. Requires interpretation.',
      clear: 'Obvious meaning but presented through divine imagery.',
      vivid: 'Crystal clear message with unforgettable imagery. No interpretation needed.',
    };

    return guidance[clarity];
  }

  /**
   * Parse LLM response into VisionContent
   */
  private parseVisionResponse(responseText: string, clarity: VisionClarity): VisionContent {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(responseText) as LLMVisionResponse;

      // Validate and construct VisionContent
      return {
        subject: parsed.subject || 'A divine message',
        imagery: Array.isArray(parsed.imagery) ? parsed.imagery : ['divine light', 'ethereal presence'],
        symbols: Array.isArray(parsed.symbols) ? parsed.symbols : ['eye', 'hand', 'star'],
        tone: parsed.tone || 'mysterious',
        hiddenMeaning: (clarity === 'symbolic' || clarity === 'obscure') ? parsed.hiddenMeaning : undefined,
      };
    } catch {
      // Fallback: treat as plain text
      console.warn('[LLMVisionGenerator] Failed to parse JSON, using fallback');
      return {
        subject: 'A divine message',
        imagery: [responseText.trim()],
        symbols: ['light', 'path', 'threshold'],
        tone: 'peaceful',
      };
    }
  }

  /**
   * Generate a vision for meditation (spontaneous, not prayer-related)
   */
  async generateMeditationVision(
    agentId: string,
    world: World,
    deityId?: string
  ): Promise<VisionContent | null> {
    // Find agent's deity if not specified
    if (!deityId) {
      const agent = world.getEntity(agentId);
      if (agent) {
        const spiritual = agent.components.get(CT.Spiritual) as SpiritualComponent | undefined;
        deityId = spiritual?.believedDeity;
      }
    }

    if (!deityId) {
      console.warn('[LLMVisionGenerator] No deity found for meditation vision');
      return null;
    }

    // Generate a guidance-type vision
    const request: VisionGenerationRequest = {
      targetAgentId: agentId,
      deityId,
      purpose: 'guidance',
      clarity: 'symbolic',
      context: 'The believer is meditating and open to divine messages.',
    };

    return this.generateVision(request, world);
  }

  /**
   * Generate a prayer response vision
   */
  async generatePrayerResponseVision(
    prayer: Prayer,
    agentId: string,
    deityId: string,
    world: World,
    clarity: VisionClarity = 'clear'
  ): Promise<VisionContent | null> {
    // Map prayer type to vision purpose
    const purposeMap: Record<string, VisionPurpose> = {
      guidance: 'guidance',
      help: 'blessing',
      gratitude: 'blessing',
      question: 'revelation',
      confession: 'blessing',
      plea: 'command',
      praise: 'blessing',
      mourning: 'blessing',
    };

    const purpose = purposeMap[prayer.type] || 'guidance';

    const request: VisionGenerationRequest = {
      targetAgentId: agentId,
      deityId,
      purpose,
      clarity,
      relatedPrayer: prayer,
      context: `This vision is in direct response to a prayer from the believer.`,
    };

    return this.generateVision(request, world);
  }
}

/**
 * Create and return an LLMVisionGenerator
 */
export function createLLMVisionGenerator(llmProvider?: LLMProvider): LLMVisionGenerator {
  return new LLMVisionGenerator(llmProvider);
}
