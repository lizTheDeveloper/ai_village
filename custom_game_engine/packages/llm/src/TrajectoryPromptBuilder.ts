/**
 * TrajectoryPromptBuilder - Generate LLM prompts for time compression trajectories
 *
 * During time jumps (fast-forward spanning years/centuries), soul agents need
 * narrative trajectories that summarize what happened during the compressed period.
 *
 * This builder creates prompts for generating:
 * - Personal soul trajectories (what did this soul experience?)
 * - Era summaries (what happened in this civilization/world?)
 * - Major events and turning points
 *
 * Used by TimeCompressionSystem when processing time jumps.
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  SoulIdentityComponent,
} from '@ai-village/core';
import type { ComponentType } from '@ai-village/core';

// Use the correct IncarnationRecord type from SoulIdentityComponent
interface IncarnationRecord {
  incarnationTick: number;
  deathTick?: number;
  bodyName?: string;
  bodySpecies?: string;
  duration?: number;
  notableEvents?: string[];
  causeOfDeath?: string;
}

/**
 * Trajectory generation request
 */
export interface TrajectoryRequest {
  /** Soul entity to generate trajectory for */
  soulEntity: Entity;

  /** Starting tick of the time jump */
  startTick: number;

  /** Ending tick of the time jump */
  endTick: number;

  /** Years covered by the jump */
  yearsCovered: number;

  /** Current world state context */
  world: World;
}

/**
 * Generated trajectory result
 */
export interface TrajectoryResult {
  /** Soul entity ID */
  soulId: string;

  /** Narrative summary of what happened */
  narrative: string;

  /** Major events during this period */
  majorEvents: string[];

  /** Character development/growth */
  characterDevelopment: string;

  /** New skills/knowledge acquired */
  skillsGained: string[];

  /** Relationships formed/changed */
  relationshipChanges: string[];

  /** Notable achievements */
  achievements: string[];
}

/**
 * Milestone in a soul's trajectory
 */
export interface Milestone {
  /** Year during time jump when event occurred */
  year: number;

  /** Event description */
  event: string;

  /** Emotional impact on the soul (-1 = devastating, 0 = neutral, 1 = joyful) */
  emotionalImpact: number;

  /** Other agents involved in this event */
  involvedAgents: string[];

  /** Significance of this event (0 = minor, 1 = life-defining) */
  significance: number;
}

/**
 * Complete life trajectory during a time jump
 * Includes detailed milestones and end state (alive/dead)
 */
export interface LifeTrajectory {
  /** Soul agent ID */
  soulAgentId: string;

  /** Starting tick of trajectory */
  startTick: number;

  /** Ending tick of trajectory */
  endTick: number;

  /** Chronological milestones during this period */
  milestones: Milestone[];

  /** Final state at end of time jump */
  endState: {
    /** Is the soul agent still alive? */
    alive: boolean;

    /** Age at end of period */
    age: number;

    /** Cause of death (if not alive) */
    causeOfDeath?: string;

    /** Descendant agent IDs */
    descendants: string[];

    /** Major achievements accumulated */
    achievements: string[];
  };
}

/**
 * Major historical event during time compression
 */
export interface MajorEvent {
  /** Tick when event occurred */
  tick: number;

  /** Event type classification */
  type: 'discovery' | 'war' | 'plague' | 'golden_age' | 'extinction' | 'contact' | 'ascension' | 'cultural';

  /** Event title */
  title: string;

  /** Event description */
  description: string;

  /** Soul agents involved in this event */
  involvedSoulAgents: string[];

  /** Impact on world state */
  impact: {
    /** Population change (delta) */
    population: number;

    /** Technology level change (delta) */
    techLevel: number;

    /** Stability change (-1 to 1) */
    stability: number;
  };

  /** Historical significance (0 = minor, 1 = era-defining) */
  significance: number;
}

/**
 * Parameters for generating major events during time jump
 */
export interface EventGenerationParams {
  /** Years covered by time jump */
  years: number;

  /** Number of events to generate */
  totalEvents: number;

  /** Starting population */
  startingPopulation: number;

  /** Current technology level */
  techLevel: number;

  /** Number of civilizations */
  civilizationCount: number;

  /** Soul agent trajectories for context */
  soulTrajectories: LifeTrajectory[];

  /** Starting tick */
  startTick: number;

  /** Ending tick */
  endTick: number;
}

/**
 * TrajectoryPromptBuilder - Build LLM prompts for time compression
 */
export class TrajectoryPromptBuilder {
  /**
   * Build a prompt for generating a soul's trajectory during time compression
   */
  buildSoulTrajectoryPrompt(request: TrajectoryRequest): string {
    const { soulEntity, startTick, endTick, yearsCovered } = request;

    const soulIdentity = soulEntity.getComponent('soul_identity' as ComponentType) as
      | SoulIdentityComponent
      | undefined;

    if (!soulIdentity) {
      throw new Error(`Soul entity ${soulEntity.id} missing SoulIdentityComponent`);
    }

    const { soulName, purpose, destiny, coreInterests, archetype, incarnationHistory } =
      soulIdentity;

    // Get recent incarnation context
    const recentIncarnations = this.getRecentIncarnations(incarnationHistory, 3);
    const incarnationSummary = this.summarizeIncarnations(recentIncarnations);

    // Build context about soul's journey so far
    const soulContext = this.buildSoulContext(soulIdentity);

    const prompt = `# Time Compression Trajectory Generation

You are narrating what happened to a soul during a time skip of ${yearsCovered} years (from tick ${startTick} to ${endTick}).

## Soul Identity
- **Name**: ${soulName}
- **Archetype**: ${archetype || 'wanderer'}
- **Purpose**: ${purpose}
${destiny ? `- **Destiny**: ${destiny}` : ''}
- **Core Interests**: ${coreInterests.join(', ')}

## Soul Journey Context
${soulContext}

## Recent Incarnations
${incarnationSummary}

## Your Task

Generate a compressed narrative of what this soul experienced during the ${yearsCovered}-year time skip. This should be:

1. **Consistent with Purpose**: The soul should pursue activities aligned with their purpose and core interests
2. **Meaningful Development**: Show character growth, skills gained, relationships formed
3. **Realistic Pacing**: ${yearsCovered} years is a significant period - include multiple major events
4. **Era-Appropriate**: Consider the time scale (decades vs centuries)
5. **Soul-Centric**: Focus on this soul's personal journey, not world events

## Output Format

Return a JSON object with this structure:

\`\`\`json
{
  "narrative": "A 2-3 paragraph summary of what happened to this soul during the time skip",
  "majorEvents": [
    "First major event or turning point",
    "Second major event",
    "Third major event (if applicable)"
  ],
  "characterDevelopment": "How the soul grew or changed during this period",
  "skillsGained": [
    "Skill/ability/knowledge acquired",
    "Another skill gained"
  ],
  "relationshipChanges": [
    "New relationship or changed relationship",
    "Another relationship development"
  ],
  "achievements": [
    "Notable achievement or milestone",
    "Another achievement"
  ]
}
\`\`\`

Generate the trajectory now:`;

    return prompt;
  }

  /**
   * Build a prompt for generating an era snapshot (civilization-wide summary)
   */
  buildEraSnapshotPrompt(
    eraNumber: number,
    startTick: number,
    endTick: number,
    yearsCovered: number,
    world: World
  ): string {
    // Get civilization context
    const populationCount = this.getPopulationCount(world);
    const technologyLevel = this.estimateTechnologyLevel(world);
    const cultureContext = this.getCultureContext(world);

    const prompt = `# Era Snapshot Generation

Generate a historical summary for Era ${eraNumber}, covering ${yearsCovered} years of civilization development.

## Civilization Context
- **Population**: ~${populationCount} individuals
- **Technology Level**: ${technologyLevel}
- **Cultural Context**: ${cultureContext}

## Your Task

Create a historical era summary that captures the major developments, conflicts, and cultural shifts during this period. This will be used for time-travel archaeology - players should be able to read this and understand what this era was like.

## Output Format

Return a JSON object with this structure:

\`\`\`json
{
  "eraName": "A poetic/historical name for this era (e.g., 'The Age of Bronze', 'The Great Flowering')",
  "summary": "A 2-3 paragraph overview of this era's defining characteristics",
  "majorEvents": [
    "Most significant event of the era",
    "Second major event",
    "Third major event"
  ],
  "culturalDevelopments": [
    "New art form/cultural practice",
    "Social structure change",
    "Technological innovation"
  ],
  "notableFigures": [
    "Historical figure who shaped this era",
    "Another influential person"
  ],
  "conflicts": [
    "Major war/conflict if any occurred",
    "Social or political tension"
  ],
  "legacy": "How this era influenced future generations"
}
\`\`\`

Generate the era snapshot now:`;

    return prompt;
  }

  /**
   * Build context about soul's journey
   */
  private buildSoulContext(identity: SoulIdentityComponent): string {
    const incarnationCount = identity.incarnationHistory.length;

    if (incarnationCount === 0) {
      return 'This is a newly created soul, about to experience their first incarnation.';
    }

    const totalDuration = identity.incarnationHistory.reduce(
      (sum, inc) => sum + (inc.duration ?? 0),
      0
    );

    const avgLifespan = incarnationCount > 0 ? totalDuration / incarnationCount : 0;
    const years = Math.floor(avgLifespan / 525600); // Convert ticks to years

    const context = [
      `This soul has lived ${incarnationCount} incarnation${incarnationCount > 1 ? 's' : ''}`,
      `Average lifespan: ~${years} years`,
    ];

    if (identity.purposeFulfilled) {
      context.push('Purpose: FULFILLED');
    } else {
      context.push(`Purpose: Still pursuing - "${identity.purpose}"`);
    }

    if (identity.destinyRealized && identity.destiny) {
      context.push('Destiny: REALIZED');
    } else if (identity.destiny) {
      context.push(`Destiny: Unfulfilled - "${identity.destiny}"`);
    }

    return context.join('\n');
  }

  /**
   * Get recent incarnations for context
   */
  private getRecentIncarnations(
    history: IncarnationRecord[],
    count: number
  ): IncarnationRecord[] {
    return history.slice(-count);
  }

  /**
   * Summarize incarnation history
   */
  private summarizeIncarnations(incarnations: IncarnationRecord[]): string {
    if (incarnations.length === 0) {
      return 'No previous incarnations.';
    }

    const summaries = incarnations.map((inc, idx) => {
      const num = idx + 1;
      const name = inc.bodyName || 'Unknown';
      const species = inc.bodySpecies || 'Unknown species';
      const years = Math.floor((inc.duration ?? 0) / 525600);
      const cause = inc.causeOfDeath || 'Unknown';
      const events = inc.notableEvents?.join(', ') || 'No notable events recorded';

      return `${num}. **${name}** (${species}) - Lived ${years} years\n   - Notable: ${events}\n   - Death: ${cause}`;
    });

    return summaries.join('\n\n');
  }

  /**
   * Get population count from world
   */
  private getPopulationCount(world: World): number {
    const agents = world.query().with('agent' as ComponentType).executeEntities();
    return agents.length;
  }

  /**
   * Estimate technology level based on world state
   */
  private estimateTechnologyLevel(_world: World): string {
    // TODO: Implement based on building types, skills, etc.
    // For now, return placeholder
    return 'Early civilization (agriculture, basic crafts)';
  }

  /**
   * Get culture context from world
   */
  private getCultureContext(_world: World): string {
    // TODO: Implement based on agent cultures, beliefs, etc.
    // For now, return placeholder
    return 'Mixed cultures developing shared traditions';
  }

  /**
   * Parse trajectory result from LLM response
   */
  parseTrajectoryResult(
    soulId: string,
    llmResponse: string
  ): TrajectoryResult | null {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                       llmResponse.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error('[TrajectoryPromptBuilder] No JSON found in LLM response');
        return null;
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      return {
        soulId,
        narrative: parsed.narrative || '',
        majorEvents: Array.isArray(parsed.majorEvents) ? parsed.majorEvents : [],
        characterDevelopment: parsed.characterDevelopment || '',
        skillsGained: Array.isArray(parsed.skillsGained) ? parsed.skillsGained : [],
        relationshipChanges: Array.isArray(parsed.relationshipChanges)
          ? parsed.relationshipChanges
          : [],
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      };
    } catch (error) {
      console.error('[TrajectoryPromptBuilder] Failed to parse trajectory result:', error);
      return null;
    }
  }
}
