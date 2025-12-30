/**
 * MemoryView - Agent memory, goals, and reflections
 *
 * Shows episodic memories, beliefs, reflections, and goals for the selected agent.
 * Entity-specific view - requires a selected entity in ViewContext.
 * Accessibility-first: narrates the agent's inner life in natural language.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';

/**
 * A single memory entry
 */
interface MemoryEntry {
  eventType: string;
  summary: string;
  importance: number;
  emotionalValence: number;
  emotionalIntensity: number;
  timestamp: number;
  location?: { x: number; y: number };
  participants?: string[];
  consolidated: boolean;
}

/**
 * A belief held by the agent
 */
interface Belief {
  content: string;
  confidence: number;
}

/**
 * A reflection the agent has made
 */
interface Reflection {
  text: string;
  timestamp: number;
}

/**
 * Data returned by the Memory view
 */
export interface MemoryViewData extends ViewData {
  /** Agent's name */
  agentName: string | null;
  /** Agent's personal goal */
  personalGoal: string | null;
  /** Agent's medium-term goal */
  mediumTermGoal: string | null;
  /** Agent's group goal */
  groupGoal: string | null;
  /** Recent episodic memories (last 5) */
  recentMemories: MemoryEntry[];
  /** Total memory count */
  totalMemories: number;
  /** Agent's beliefs */
  beliefs: Belief[];
  /** Agent's reflections */
  reflections: Reflection[];
  /** Latest journal entry */
  latestJournalEntry: string | null;
  /** Total journal entries */
  journalCount: number;
}

/**
 * Format emotional state in natural language
 */
function describeEmotion(valence: number, intensity: number): string {
  const feeling = valence > 0.3 ? 'positive' :
    valence < -0.3 ? 'negative' : 'neutral';
  const strength = intensity > 0.7 ? 'strongly' :
    intensity > 0.4 ? 'moderately' : 'mildly';
  return `${strength} ${feeling}`;
}

/**
 * Format importance level
 */
function describeImportance(importance: number): string {
  if (importance > 0.7) return 'very significant';
  if (importance > 0.5) return 'significant';
  if (importance > 0.3) return 'somewhat notable';
  return 'minor';
}

/**
 * Memory View Definition
 */
export const MemoryView: DashboardView<MemoryViewData> = {
  id: 'memory',
  title: 'Memory & Goals',
  category: 'social',
  keyboardShortcut: 'M',
  description: 'Shows the selected agent\'s memories, goals, and inner thoughts',

  defaultSize: {
    width: 400,
    height: 600,
    minWidth: 350,
    minHeight: 450,
  },

  getData(context: ViewContext): MemoryViewData {
    const { world, selectedEntityId } = context;

    const emptyData: MemoryViewData = {
      timestamp: Date.now(),
      available: false,
      unavailableReason: 'No agent selected',
      agentName: null,
      personalGoal: null,
      mediumTermGoal: null,
      groupGoal: null,
      recentMemories: [],
      totalMemories: 0,
      beliefs: [],
      reflections: [],
      latestJournalEntry: null,
      journalCount: 0,
    };

    if (!selectedEntityId) {
      return emptyData;
    }

    if (!world || typeof world.getEntity !== 'function') {
      emptyData.unavailableReason = 'Game world not available';
      return emptyData;
    }

    try {
      const entity = world.getEntity(selectedEntityId);
      if (!entity) {
        emptyData.unavailableReason = 'Selected entity not found';
        return emptyData;
      }

      // Get components with type assertions
      const identity = entity.components.get('identity') as unknown as { name?: string } | undefined;
      const agent = entity.components.get('agent') as unknown as {
        personalGoal?: string;
        mediumTermGoal?: string;
        groupGoal?: string;
      } | undefined;
      const episodicMemory = entity.components.get('episodic_memory') as unknown as {
        episodicMemories?: MemoryEntry[];
      } | undefined;
      const semanticMemory = entity.components.get('semantic_memory') as unknown as {
        beliefs?: Belief[];
      } | undefined;
      const reflection = entity.components.get('reflection') as unknown as {
        reflections?: Reflection[];
      } | undefined;
      const journal = entity.components.get('journal') as unknown as {
        entries?: Array<{ text?: string }>;
      } | undefined;

      const memories = episodicMemory?.episodicMemories || [];
      const journalEntries = journal?.entries || [];

      return {
        timestamp: Date.now(),
        available: true,
        agentName: identity?.name || null,
        personalGoal: agent?.personalGoal || null,
        mediumTermGoal: agent?.mediumTermGoal || null,
        groupGoal: agent?.groupGoal || null,
        recentMemories: memories.slice(-5).reverse(),
        totalMemories: memories.length,
        beliefs: (semanticMemory?.beliefs || []).slice(0, 5),
        reflections: (reflection?.reflections || []).slice(-3),
        latestJournalEntry: journalEntries.length > 0
          ? journalEntries[journalEntries.length - 1]?.text || null
          : null,
        journalCount: journalEntries.length,
      };
    } catch (error) {
      emptyData.unavailableReason = `Error: ${error instanceof Error ? error.message : String(error)}`;
      return emptyData;
    }
  },

  textFormatter(data: MemoryViewData): string {
    const lines: string[] = [
      'MEMORY & GOALS',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Memory data unavailable');
      lines.push('');
      lines.push('Select an agent to view their memories and goals.');
      return lines.join('\n');
    }

    // Agent identity
    if (data.agentName) {
      lines.push(`Viewing the mind of ${data.agentName}`);
      lines.push('');
    }

    // Goals section - describe what the agent is working toward
    const hasGoals = data.personalGoal || data.mediumTermGoal || data.groupGoal;
    if (hasGoals) {
      lines.push('CURRENT GOALS');
      lines.push('─'.repeat(50));

      if (data.personalGoal) {
        lines.push(`Personal focus: ${data.personalGoal}`);
      }
      if (data.mediumTermGoal) {
        lines.push(`Working toward: ${data.mediumTermGoal}`);
      }
      if (data.groupGoal) {
        lines.push(`Contributing to: ${data.groupGoal}`);
      }
      lines.push('');
    } else {
      lines.push('This agent has no specific goals at the moment.');
      lines.push('');
    }

    // Recent memories - tell a story
    lines.push('RECENT MEMORIES');
    lines.push('─'.repeat(50));

    if (data.recentMemories.length === 0) {
      lines.push('No memories have formed yet.');
    } else {
      lines.push(`${data.agentName || 'This agent'} remembers ${data.totalMemories} experiences.`);
      lines.push('Most recent:');
      lines.push('');

      for (const memory of data.recentMemories) {
        const importance = describeImportance(memory.importance);
        const emotion = describeEmotion(memory.emotionalValence, memory.emotionalIntensity);
        const time = new Date(memory.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });

        lines.push(`  • [${time}] ${memory.summary}`);
        lines.push(`    This was a ${importance} experience that left them feeling ${emotion}.`);
        if (memory.participants && memory.participants.length > 0) {
          lines.push(`    Involved: ${memory.participants.join(', ')}`);
        }
        lines.push('');
      }
    }

    // Beliefs
    if (data.beliefs.length > 0) {
      lines.push('BELIEFS & KNOWLEDGE');
      lines.push('─'.repeat(50));
      lines.push(`${data.agentName || 'They'} believe:`);
      for (const belief of data.beliefs) {
        const confidence = Math.round(belief.confidence * 100);
        lines.push(`  • ${belief.content} (${confidence}% confident)`);
      }
      lines.push('');
    }

    // Reflections
    if (data.reflections.length > 0) {
      lines.push('RECENT REFLECTIONS');
      lines.push('─'.repeat(50));
      lines.push(`${data.agentName || 'They'} has been thinking:`);
      for (const ref of data.reflections) {
        lines.push(`  "${ref.text}"`);
      }
      lines.push('');
    }

    // Journal
    if (data.latestJournalEntry) {
      lines.push('LATEST JOURNAL ENTRY');
      lines.push('─'.repeat(50));
      lines.push(`From their journal (${data.journalCount} total entries):`);
      lines.push(`  "${data.latestJournalEntry}"`);
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: MemoryViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    // Handle unavailable
    if (!data.available) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(data.unavailableReason || 'Select an agent', x + padding, currentY);
      return;
    }

    // Agent name
    if (data.agentName) {
      ctx.fillStyle = theme.colors.accent;
      ctx.font = theme.fonts.bold;
      ctx.fillText(`Agent: ${data.agentName}`, x + padding, currentY);
      currentY += lineHeight + 5;
    }

    // Goals
    ctx.font = theme.fonts.normal;
    if (data.personalGoal) {
      ctx.fillStyle = '#AAFFAA';
      ctx.fillText('🎯 Goal:', x + padding, currentY);
      currentY += lineHeight;
      ctx.fillStyle = theme.colors.text;
      ctx.fillText(`  ${data.personalGoal.substring(0, 50)}...`, x + padding, currentY);
      currentY += lineHeight + 5;
    }

    // Memory count
    ctx.fillStyle = '#88CCFF';
    ctx.fillText(`📝 ${data.totalMemories} memories`, x + padding, currentY);
    currentY += lineHeight + 5;

    // Recent memories (brief)
    if (data.recentMemories.length > 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('Recent:', x + padding, currentY);
      currentY += lineHeight;

      for (const memory of data.recentMemories.slice(0, 3)) {
        const importanceColor = memory.importance > 0.7 ? theme.colors.accent :
          memory.importance > 0.5 ? theme.colors.warning : theme.colors.textMuted;
        ctx.fillStyle = importanceColor;
        const shortSummary = memory.summary.length > 40
          ? memory.summary.substring(0, 40) + '...'
          : memory.summary;
        ctx.fillText(`  • ${shortSummary}`, x + padding, currentY);
        currentY += lineHeight;
      }
    }
  },
};
