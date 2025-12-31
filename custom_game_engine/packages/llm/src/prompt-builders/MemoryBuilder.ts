import type { World } from '@ai-village/core';
import {
  type EpisodicMemoryComponent,
  type EpisodicMemory,
  type IdentityComponent,
} from '@ai-village/core';

/**
 * Builds memory sections for agent prompts.
 * Handles episodic memories and filters for meaningful events.
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

    // Take top 5 most meaningful memories (already sorted by score)
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
   * Filter and rank memories by meaningfulness, not just recency.
   * Prioritizes social interactions, emotional events, and accomplishments
   * over routine tasks like gathering resources.
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

    // Return top memories with meaningful scores
    return scored
      .filter(s => s.score > 0.1)  // Filter out very low-value memories
      .slice(0, 10)
      .map(s => s.memory);
  }

  /**
   * Calculate how meaningful/memorable an event is.
   * Higher scores = more worth including in the prompt.
   */
  private calculateMeaningfulnessScore(m: EpisodicMemory): number {
    let score = 0;

    // Social interactions are highly meaningful
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

    // Survival-critical events are important
    if (m.survivalRelevance && m.survivalRelevance > 0.3) {
      score += m.survivalRelevance * 0.5;
    }

    // Goal-relevant progress
    if (m.goalRelevance && m.goalRelevance > 0.3) {
      score += m.goalRelevance * 0.3;
    }

    // Explicit importance field
    if (m.importance > 0) {
      score += m.importance * 0.3;
    }

    // Major life events
    const majorEventTypes = new Set([
      'need:critical',
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
    if (majorEventTypes.has(m.eventType)) {
      score += 0.7;
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

    return Math.max(0, score);
  }
}
