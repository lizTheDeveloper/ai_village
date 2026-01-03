import type { World } from '@ai-village/core';
import {
  type EpisodicMemoryComponent,
  type EpisodicMemory,
  type IdentityComponent,
} from '@ai-village/core';

/**
 * Builds memory sections for agent prompts.
 * Handles episodic memories and filters for meaningful events.
 *
 * Key design principles:
 * 1. DIVERSITY over repetition - never show duplicate summaries
 * 2. RELEVANCE over recency - prioritize social, emotional, novel events
 * 3. VARIETY of event types - spread across different categories
 */
export class MemoryBuilder {
  /**
   * Build memories section from episodic memories.
   * Only includes truly memorable events - things worth remembering.
   * Routine tasks are handled by the autonomic system.
   */
  buildEpisodicMemories(episodicMemory: EpisodicMemoryComponent | undefined, world?: World): string {
    if (!episodicMemory) {
      return 'You have no significant recent memories.';
    }

    const allMemories = episodicMemory.episodicMemories;
    if (!allMemories || allMemories.length === 0) {
      return 'You have no significant recent memories.';
    }

    const meaningfulMemories = this.filterMeaningfulMemories([...allMemories]);

    if (meaningfulMemories.length === 0) {
      return 'You have no significant recent memories.';
    }

    // Take top 5 most meaningful memories (already sorted by score and deduplicated)
    const recentMemories = meaningfulMemories.slice(0, 5);
    let text = 'Recent Memories:\n';

    recentMemories.forEach((m: EpisodicMemory, i: number) => {
      let description = m.summary;

      // Add emotional context for significant memories
      if (m.emotionalIntensity > 0.5) {
        const emotion = m.emotionalValence > 0 ? '' : m.emotionalValence < 0 ? '' : '';
        if (emotion) {
          description = `${emotion} ${description}`;
        }
      }

      // For conversation memories, show dialogue if available
      if (m.dialogueText && !description.includes(m.dialogueText)) {
        description = `${description}: "${m.dialogueText}"`;
      }

      // Resolve participant names if world is available
      if (m.participants && m.participants.length > 0 && world) {
        const participantNames = m.participants.map((id: string) => {
          const entity = world.getEntity(id);
          if (entity) {
            const identity = entity.components.get('identity') as IdentityComponent | undefined;
            return identity?.name || id.slice(0, 8);
          }
          return id.slice(0, 8);
        });
        const firstName = participantNames[0];
        if (firstName && !description.includes(firstName)) {
          description += ` (with ${participantNames.join(', ')})`;
        }
      }

      text += `${i + 1}. ${description}\n`;
    });

    return text;
  }

  /**
   * Filter and rank memories by meaningfulness with DEDUPLICATION.
   * Prioritizes social interactions, emotional events, and accomplishments
   * over routine tasks like gathering resources.
   *
   * Key improvements:
   * 1. DEDUPLICATION: Never show memories with identical summaries
   * 2. CATEGORY DIVERSITY: Limit memories per event type category
   * 3. RECENCY BONUS: Recent memories get a slight boost
   */
  private filterMeaningfulMemories(allMemories: EpisodicMemory[]): EpisodicMemory[] {
    // Exclude pure noise events
    const noiseEventTypes = new Set([
      'discovery:location',
      'action:walk',
      'agent:idle',
      'plant:stageChanged',
    ]);

    // Score each memory by meaningfulness
    const scored = allMemories
      .filter((m: EpisodicMemory) => !noiseEventTypes.has(m.eventType))
      .map((m: EpisodicMemory) => ({
        memory: m,
        score: this.calculateMeaningfulnessScore(m),
      }));

    // Sort by score descending, then by timestamp for tie-breaking
    scored.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.05) {
        return b.score - a.score;
      }
      // Tie-break by recency
      return (b.memory.timestamp || 0) - (a.memory.timestamp || 0);
    });

    // DEDUPLICATION: Track seen summaries and limit per-category
    const seenSummaries = new Set<string>();
    const categoryCount = new Map<string, number>();
    const MAX_PER_CATEGORY = 2; // Max 2 memories of the same category (e.g., need:critical)

    const deduplicated: EpisodicMemory[] = [];

    for (const { memory, score } of scored) {
      if (score <= 0.1) continue; // Skip low-value memories

      // Create a normalized summary key for deduplication
      // This handles cases like "My hunger became critically low" appearing multiple times
      const summaryKey = this.normalizeSummaryForDedup(memory.summary);

      // Skip if we've already seen this exact summary
      if (seenSummaries.has(summaryKey)) {
        continue;
      }

      // Get category for diversity limiting
      const category = this.getMemoryCategory(memory.eventType);
      const currentCount = categoryCount.get(category) || 0;

      // Skip if we have too many of this category (unless it's a high-value social memory)
      if (currentCount >= MAX_PER_CATEGORY) {
        // Allow social interactions to exceed limit since they're unique by nature
        if (category !== 'social' && category !== 'conversation') {
          continue;
        }
      }

      // Add to results
      seenSummaries.add(summaryKey);
      categoryCount.set(category, currentCount + 1);
      deduplicated.push(memory);

      // Stop once we have enough diverse memories
      if (deduplicated.length >= 10) {
        break;
      }
    }

    return deduplicated;
  }

  /**
   * Normalize a summary string for deduplication.
   * Strips minor variations to detect semantically identical memories.
   */
  private normalizeSummaryForDedup(summary: string): string {
    return summary
      .toLowerCase()
      .trim()
      // Remove numbers (handles "Gathered 5 wood" vs "Gathered 3 wood")
      .replace(/\d+/g, '#')
      // Remove extra whitespace
      .replace(/\s+/g, ' ');
  }

  /**
   * Get the category of a memory for diversity limiting.
   * Groups related event types together.
   */
  private getMemoryCategory(eventType: string): string {
    // Social/conversation events
    if (eventType.includes('conversation') || eventType.includes('social')) {
      return 'social';
    }
    // Need/survival events (hunger, energy, health critical)
    if (eventType.includes('need') || eventType.includes('starved') ||
        eventType.includes('collapsed') || eventType.includes('survival')) {
      return 'survival';
    }
    // Resource/gathering events
    if (eventType.includes('resource') || eventType.includes('gathered') ||
        eventType.includes('harvested') || eventType.includes('deposited')) {
      return 'resources';
    }
    // Building/construction events
    if (eventType.includes('construction') || eventType.includes('build')) {
      return 'construction';
    }
    // Sleep/rest events
    if (eventType.includes('sleep') || eventType.includes('dream') || eventType.includes('woke')) {
      return 'rest';
    }
    // Divine/spiritual events
    if (eventType.includes('divinity') || eventType.includes('prophecy') ||
        eventType.includes('vision') || eventType.includes('spiritual')) {
      return 'divine';
    }
    // Information/discovery events
    if (eventType.includes('information') || eventType.includes('discovery') ||
        eventType.includes('learned')) {
      return 'knowledge';
    }
    // Default category
    return 'other';
  }

  /**
   * Calculate how meaningful/memorable an event is.
   * Higher scores = more worth including in the prompt.
   *
   * Scoring priorities (highest to lowest):
   * 1. Social interactions with dialogue (+0.8-1.4)
   * 2. Major life events (starving, collapsing, first harvest) (+0.7)
   * 3. Emotional intensity (+0.5 * intensity)
   * 4. Goal progress (+0.3 * relevance)
   * 5. Recent memories get a small boost
   *
   * Note: need:critical gets REDUCED priority since they repeat often
   */
  private calculateMeaningfulnessScore(m: EpisodicMemory): number {
    let score = 0;

    // Social interactions are highly meaningful - HIGHEST PRIORITY
    if (m.dialogueText) {
      score += 0.8;
    }
    if (m.eventType.includes('conversation')) {
      score += 0.6;
    }
    if (m.socialSignificance && m.socialSignificance > 0) {
      score += m.socialSignificance * 0.4;
    }

    // Emotional intensity makes events memorable
    if (m.emotionalIntensity > 0) {
      score += m.emotionalIntensity * 0.5;
    }

    // Novel/first-time events stand out
    if (m.novelty && m.novelty > 0.5) {
      score += m.novelty * 0.4;
    }

    // Survival-critical events are important (but not need:critical - those are repetitive)
    if (m.survivalRelevance && m.survivalRelevance > 0.3) {
      // Reduce bonus for repetitive survival events
      const isRepetitiveSurvival = m.eventType === 'need:critical';
      const survivalMultiplier = isRepetitiveSurvival ? 0.2 : 0.5;
      score += m.survivalRelevance * survivalMultiplier;
    }

    // Goal-relevant progress
    if (m.goalRelevance && m.goalRelevance > 0.3) {
      score += m.goalRelevance * 0.3;
    }

    // Explicit importance field
    if (m.importance > 0) {
      score += m.importance * 0.3;
    }

    // Major life events - but with REDUCED bonus for repetitive events
    const highPriorityEvents = new Set([
      'agent:starved',
      'agent:collapsed',
      'survival:close_call',
      'harvest:first',
      'construction:started',
      'agent:dreamed',
      'event:novel',
      'social:conflict',
      'divinity:vision_delivered',
      'divinity:prophecy_fulfilled',
    ]);
    // need:critical removed from high priority - it's handled by deduplication instead
    const mediumPriorityEvents = new Set([
      'need:critical',       // Reduced priority - these repeat often
      'information:shared',  // Useful but not critical
      'agent:sleep_start',   // Routine
    ]);

    if (highPriorityEvents.has(m.eventType)) {
      score += 0.7;
    } else if (mediumPriorityEvents.has(m.eventType)) {
      score += 0.3; // Reduced from 0.7
    }

    // Consolidated/summarized memories are worth including (they compress many events)
    if (m.eventType === 'memory:summarized') {
      score += 0.4;
    }

    // Penalize routine gathering/resource events (unless they have other significance)
    if (m.eventType === 'resource:gathered' || m.eventType === 'items:deposited') {
      // Only keep if it has emotional or social significance
      if (!m.dialogueText && (m.emotionalIntensity || 0) < 0.3 && (m.socialSignificance || 0) < 0.3) {
        score -= 0.5;
      }
    }

    // RECENCY BONUS: Recent memories are more relevant to current decisions
    // Memories from last hour get a small boost
    const now = Date.now();
    const ageMs = now - (m.timestamp || 0);
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours < 1) {
      score += 0.2; // Very recent
    } else if (ageHours < 6) {
      score += 0.1; // Fairly recent
    }
    // Old memories (>24 hours) get a slight penalty to make room for recent events
    if (ageHours > 24) {
      score -= 0.1;
    }

    return Math.max(0, score);
  }
}
