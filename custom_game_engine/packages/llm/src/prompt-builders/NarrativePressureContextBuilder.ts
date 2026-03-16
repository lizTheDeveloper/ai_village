/**
 * NarrativePressureContextBuilder - Surfaces active narrative forces in agent prompts
 *
 * Queries the NarrativePressureSystem (when active) for attractors that affect
 * the agent and renders them as atmospheric context. This gives agents subtle
 * awareness of narrative forces without overriding their autonomy.
 *
 * The system may be disabled (registerDisabled) until tech unlock conditions are met.
 * This builder safely returns '' when the system is not active.
 */

import type { World } from '@ai-village/core';

// Minimal duck-typed interface — avoids importing the full system class
interface AttractorInfo {
  id: string;
  source: { type: string; [key: string]: unknown };
  goal: { type: string; description?: string; parameters: Record<string, unknown> };
  strength: number;
  convergence: number;
  scope: { type: string; entityId?: string; villageId?: string };
}

interface NarrativePressureAPI {
  getAllAttractors(): AttractorInfo[];
}

// Maximum attractors to include — token budget
const MAX_ATTRACTORS_IN_PROMPT = 3;

function isNarrativePressureAPI(system: unknown): system is NarrativePressureAPI {
  return (
    system !== null &&
    system !== undefined &&
    typeof system === 'object' &&
    'getAllAttractors' in system &&
    typeof (system as { getAllAttractors: unknown }).getAllAttractors === 'function'
  );
}

export class NarrativePressureContextBuilder {
  /**
   * Build narrative pressure context for an agent.
   * Returns '' if the system is inactive or no relevant attractors exist.
   */
  build(agentId: string, world: World): string {
    if (typeof world.getSystem !== 'function') return '';
    const raw = world.getSystem('narrative_pressure');
    if (!isNarrativePressureAPI(raw)) return '';

    const attractors = raw.getAllAttractors();
    const relevant = attractors.filter(
      a =>
        a.scope.type === 'global' ||
        (a.scope.type === 'entity' && a.scope.entityId === agentId)
    );

    if (relevant.length === 0) return '';

    // Sort by strength descending, take top N
    const top = [...relevant]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, MAX_ATTRACTORS_IN_PROMPT);

    return this.formatNarrativePressures(top);
  }

  private formatNarrativePressures(attractors: AttractorInfo[]): string {
    const lines: string[] = ['--- NARRATIVE FORCES ---'];
    lines.push(
      'Subtle forces lean the world in certain directions. They do not control your choices — ' +
      'but they tilt the odds, shape the mood, draw certain outcomes near.\n'
    );

    for (const attractor of attractors) {
      const sourceDesc = this.describeSource(attractor.source);
      const goalDesc = attractor.goal.description ?? this.describeGoal(attractor.goal.type, attractor.goal.parameters);
      const intensityWord =
        attractor.strength >= 0.8 ? 'strong' :
        attractor.strength >= 0.5 ? 'moderate' :
        'faint';
      const progressWord =
        attractor.convergence >= 0.7 ? ', nearing fulfillment' :
        attractor.convergence >= 0.3 ? ', gathering momentum' :
        '';

      lines.push(`• ${sourceDesc} ${goalDesc} (${intensityWord}${progressWord})`);
    }

    lines.push(
      '\nYou may sense these forces as intuition, omen, or coincidence. ' +
      'Act freely — the story leans, but never dictates.'
    );

    return lines.join('\n');
  }

  private describeSource(source: { type: string; [key: string]: unknown }): string {
    switch (source.type) {
      case 'deity':       return 'A divine will';
      case 'player':      return 'A higher being\'s intention';
      case 'prophecy':    return 'An ancient prophecy';
      case 'curse':       return 'A dark curse';
      case 'karma':       return 'Cosmic balance';
      case 'storyteller': return 'The narrative itself';
      case 'plot':        return 'Fate\'s design';
      default:            return 'An unseen force';
    }
  }

  private describeGoal(goalType: string, _params: Record<string, unknown>): string {
    const descriptions: Record<string, string> = {
      entity_survival:       'desires survival',
      entity_death:          'wills a death',
      entity_ascension:      'seeks ascension',
      entity_transformation: 'drives change',
      survival:              'demands endurance',
      relationship_formed:   'draws two souls together',
      relationship_broken:   'severs a bond',
      love:                  'weaves a thread of love',
      betrayal:              'tempts toward betrayal',
      mentorship:            'calls for guidance',
      village_crisis:        'draws a crisis near',
      village_prosperity:    'guides toward flourishing',
      village_destruction:   'invites ruin',
      village_founding:      'urges new beginnings',
      event_occurrence:      'wills a certain event',
      event_prevention:      'guards against an outcome',
      discovery:             'wants a truth uncovered',
      invention:             'calls for creation',
      exploration:           'pulls toward the unknown',
      conflict_escalation:   'fans the flames of strife',
      conflict_resolution:   'presses for peace',
      mystery_revelation:    'wants a secret revealed',
      justice:               'seeks justice',
      corruption:            'tempts toward corruption',
      plot_stage_reached:    'guides a story forward',
      skill_mastery:         'encourages mastery',
      emotional_state:       'shapes the heart\'s mood',
    };
    return descriptions[goalType] ?? 'shapes the path ahead';
  }
}
