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
import { ComponentType as CT } from '@ai-village/core';
import type { DeityComponent } from '@ai-village/core';
import type { SpiritualComponent } from '@ai-village/core';
import type { BeliefComponent, Belief } from '@ai-village/core';

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
  private getCultureContext(world: World): string {
    const culturalInfo: string[] = [];

    // Get all deities and their followers
    const deities = world.query().with(CT.Deity).executeEntities();
    if (deities.length > 0) {
      const deityDescriptions: string[] = [];

      for (const deity of deities.slice(0, 3)) { // Limit to top 3 deities
        const deityComp = deity.getComponent(CT.Deity) as DeityComponent | undefined;
        if (!deityComp) continue;

        const name = deityComp.identity?.primaryName || 'unnamed deity';
        const believerCount = deityComp.believers.size;
        const domain = deityComp.identity?.domain;

        if (believerCount > 0) {
          let desc = `${name} (${believerCount} believers`;
          if (domain) {
            desc += `, domain: ${domain}`;
          }
          desc += ')';
          deityDescriptions.push(desc);
        }
      }

      if (deityDescriptions.length > 0) {
        culturalInfo.push(`Worshipping: ${deityDescriptions.join(', ')}`);
      }
    }

    // Get agents with beliefs
    const believingAgents = world.query().with(CT.Belief).executeEntities();
    if (believingAgents.length > 0) {
      // Sample beliefs to understand cultural patterns
      const beliefSample: Map<string, number> = new Map();

      for (const agent of believingAgents.slice(0, 10)) { // Sample first 10
        const beliefComp = agent.getComponent(CT.Belief) as BeliefComponent | undefined;
        if (!beliefComp) continue;

        const allBeliefs: readonly Belief[] = beliefComp.allBeliefs;
        for (const belief of allBeliefs) {
          if (belief.type === 'world' || belief.type === 'social') {
            const key = belief.description;
            beliefSample.set(key, (beliefSample.get(key) || 0) + 1);
          }
        }
      }

      // Report most common beliefs
      const sortedBeliefs = Array.from(beliefSample.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);

      if (sortedBeliefs.length > 0) {
        const beliefDescriptions = sortedBeliefs.map(([desc, _count]) => desc);
        culturalInfo.push(`Common beliefs: ${beliefDescriptions.join('; ')}`);
      }
    }

    // Get spiritual agents (faith levels)
    const spiritualAgents = world.query().with(CT.Spiritual).executeEntities();
    if (spiritualAgents.length > 0) {
      let totalFaith = 0;
      let faithfulCount = 0;

      for (const agent of spiritualAgents) {
        const spiritual = agent.getComponent(CT.Spiritual) as SpiritualComponent | undefined;
        if (spiritual && spiritual.faith > 0.3) { // Count only moderately faithful
          totalFaith += spiritual.faith;
          faithfulCount++;
        }
      }

      if (faithfulCount > 0) {
        const avgFaith = totalFaith / faithfulCount;
        const faithLevel = avgFaith > 0.7 ? 'deeply religious' :
                          avgFaith > 0.5 ? 'moderately faithful' :
                          'spiritually questioning';
        culturalInfo.push(`Population is ${faithLevel} (${faithfulCount}/${spiritualAgents.length} faithful)`);
      }
    }

    // Return combined cultural context or default
    return culturalInfo.length > 0
      ? culturalInfo.join('. ')
      : 'Mixed cultures developing shared traditions';
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

  /**
   * Calculate life expectancy based on technology level and current age
   *
   * @param techLevel - Current civilization technology level (0-10 scale)
   * @param currentAge - Current age of the soul agent
   * @returns Expected remaining years of life
   */
  calculateLifeExpectancy(techLevel: number, currentAge: number): number {
    // Base life expectancy ranges by tech level
    // Tech 0-2 (stone age): 30-40 years
    // Tech 3-5 (bronze/iron): 40-60 years
    // Tech 6-8 (medieval/renaissance): 50-70 years
    // Tech 9-10 (industrial/modern): 70-90 years

    const baseLifeExpectancy = 30 + (techLevel * 6); // Linear scaling from 30 to 90

    // Add some randomness (±20%)
    const variance = baseLifeExpectancy * 0.2;
    const randomFactor = (Math.random() * 2 - 1) * variance;
    const totalLifeExpectancy = Math.max(25, baseLifeExpectancy + randomFactor);

    // Calculate remaining years
    const remainingYears = Math.max(0, totalLifeExpectancy - currentAge);

    return remainingYears;
  }

  /**
   * Build prompt for generating major historical events during time jump
   */
  buildMajorEventsPrompt(params: EventGenerationParams): string {
    const {
      years,
      totalEvents,
      startingPopulation,
      techLevel,
      civilizationCount,
      soulTrajectories,
      startTick,
      endTick,
    } = params;

    // Extract notable soul achievements for context
    const notableAchievements = soulTrajectories
      .filter(t => t.endState.alive || t.endState.achievements.length > 0)
      .map(t => ({
        id: t.soulAgentId,
        achievements: t.endState.achievements.slice(0, 3), // Top 3 achievements
      }))
      .slice(0, 10); // Limit to top 10 souls for prompt size

    const prompt = `# Major Historical Event Generation

You are creating a historical timeline for a civilization that experienced ${years} years of compressed time (tick ${startTick} to ${endTick}).

## Civilization Context
- **Population**: ${startingPopulation.toLocaleString()} individuals
- **Technology Level**: ${techLevel}/10
- **Number of Civilizations**: ${civilizationCount}
- **Notable Souls**: ${soulTrajectories.length} individuals with tracked trajectories

## Notable Soul Achievements
${notableAchievements.map(soul =>
  `- Soul ${soul.id}: ${soul.achievements.join(', ')}`
).join('\n') || 'No notable achievements recorded'}

## Your Task

Generate ${totalEvents} major historical events that occurred during this ${years}-year period. These should be:

1. **Era-Appropriate**: Match the technology level (${techLevel}/10)
2. **Population-Scaled**: Reflect a population of ${startingPopulation.toLocaleString()}
3. **Diverse**: Mix of discoveries, conflicts, golden ages, plagues, cultural developments
4. **Connected**: Some events should reference soul achievements or prior events
5. **Impactful**: Each event should have measurable effects on population/tech/stability

## Event Frequency Guidelines
- More population = more events
- Higher tech = more innovation events
- Multiple civilizations = more diplomatic/conflict events
- Events should be spread across the ${years} years

## Output Format

Return a JSON object with this structure:

\`\`\`json
{
  "events": [
    {
      "yearOffset": 15,
      "type": "discovery",
      "title": "The Iron Revolution",
      "description": "A breakthrough in metallurgy enabled mass production of iron tools",
      "involvedSouls": ["soul_id_1", "soul_id_2"],
      "impact": {
        "population": 500,
        "techLevel": 0.5,
        "stability": 0.2
      },
      "significance": 0.8
    }
  ]
}
\`\`\`

**Event Types**: discovery, war, plague, golden_age, extinction, contact, ascension, cultural

**Impact Values**:
- population: Positive/negative delta (deaths = negative)
- techLevel: 0-1 delta (0.1 = minor advance, 1.0 = major breakthrough)
- stability: -1 to 1 delta (negative = chaos, positive = harmony)

**Significance**: 0-1 (how important for history; 1.0 = era-defining)

Generate the ${totalEvents} events now:`;

    return prompt;
  }

  /**
   * Parse major events from LLM response
   */
  parseMajorEventsResponse(
    llmResponse: string,
    startTick: number,
    endTick: number
  ): MajorEvent[] {
    try {
      // Extract JSON from response
      const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                       llmResponse.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error('[TrajectoryPromptBuilder] No JSON found in events response');
        return [];
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed.events)) {
        console.error('[TrajectoryPromptBuilder] Events response missing "events" array');
        return [];
      }

      const totalYears = Number(endTick - startTick) / 525600; // Ticks to years

      return parsed.events.map((event: any) => {
        // Convert year offset to absolute tick
        const yearOffset = event.yearOffset || 0;
        const tickOffset = Math.floor((yearOffset / totalYears) * Number(endTick - startTick));
        const eventTick = startTick + tickOffset;

        return {
          tick: eventTick,
          type: event.type || 'cultural',
          title: event.title || 'Untitled Event',
          description: event.description || '',
          involvedSoulAgents: Array.isArray(event.involvedSouls) ? event.involvedSouls : [],
          impact: {
            population: event.impact?.population || 0,
            techLevel: event.impact?.techLevel || 0,
            stability: event.impact?.stability || 0,
          },
          significance: Math.max(0, Math.min(1, event.significance || 0.5)),
        };
      });
    } catch (error) {
      console.error('[TrajectoryPromptBuilder] Failed to parse events response:', error);
      return [];
    }
  }

  /**
   * Build prompt for generating a complete life trajectory with milestones
   * This is an enhanced version that generates the LifeTrajectory format
   */
  buildLifeTrajectoryPrompt(
    request: TrajectoryRequest,
    currentAge: number,
    techLevel: number
  ): string {
    const { soulEntity, startTick, endTick, yearsCovered } = request;

    const soulIdentity = soulEntity.getComponent('soul_identity' as ComponentType) as
      | SoulIdentityComponent
      | undefined;

    if (!soulIdentity) {
      throw new Error(`Soul entity ${soulEntity.id} missing SoulIdentityComponent`);
    }

    const { soulName, purpose, destiny, coreInterests, archetype } = soulIdentity;

    // Calculate life expectancy
    const expectedRemainingYears = this.calculateLifeExpectancy(techLevel, currentAge);
    const willDie = yearsCovered > expectedRemainingYears;
    const deathYear = willDie ? Math.floor(expectedRemainingYears + (Math.random() * 5)) : null;

    const prompt = `# Life Trajectory Generation

You are generating a detailed life trajectory for a soul during a ${yearsCovered}-year time skip.

## Soul Identity
- **Name**: ${soulName}
- **Current Age**: ${currentAge} years
- **Archetype**: ${archetype || 'wanderer'}
- **Purpose**: ${purpose}
${destiny ? `- **Destiny**: ${destiny}` : ''}
- **Core Interests**: ${coreInterests.join(', ')}

## Life Expectancy Context
- **Expected Remaining Years**: ~${Math.floor(expectedRemainingYears)} years
- **Time Skip Duration**: ${yearsCovered} years
${willDie ? `- **WILL LIKELY DIE** around year ${deathYear} of time skip` : '- **LIKELY TO SURVIVE** time skip'}

## Your Task

Generate a detailed life trajectory with milestones. This should include:

1. **Major Life Milestones**: 3-7 significant events spread across the ${yearsCovered} years
2. **Death Handling**: ${willDie ? 'Include death event and cause' : 'Character survives to end of period'}
3. **Descendants**: If appropriate for age/culture, mention children/family
4. **Achievements**: Align with purpose and interests
5. **Emotional Journey**: Include emotional impacts (joy, sorrow, growth)

## Output Format

Return a JSON object with this structure:

\`\`\`json
{
  "milestones": [
    {
      "year": 5,
      "event": "Married childhood friend",
      "emotionalImpact": 0.8,
      "involvedAgents": [],
      "significance": 0.6
    },
    {
      "year": 15,
      "event": "Mastered advanced farming techniques",
      "emotionalImpact": 0.7,
      "involvedAgents": [],
      "significance": 0.7
    }
    ${willDie ? `,
    {
      "year": ${deathYear},
      "event": "Died peacefully, surrounded by family",
      "emotionalImpact": -0.5,
      "involvedAgents": [],
      "significance": 1.0
    }` : ''}
  ],
  "endState": {
    "alive": ${!willDie},
    "age": ${willDie ? currentAge + deathYear! : currentAge + yearsCovered},
    ${willDie ? `"causeOfDeath": "natural causes / disease / accident",` : ''}
    "descendants": [],
    "achievements": [
      "Achievement 1",
      "Achievement 2"
    ]
  }
}
\`\`\`

**Guidelines**:
- emotionalImpact: -1 (devastating) to 1 (joyful)
- significance: 0 (minor) to 1 (life-defining)
- Spread milestones across the years (don't cluster)
- Make achievements align with purpose: "${purpose}"

Generate the life trajectory now:`;

    return prompt;
  }

  /**
   * Parse life trajectory from LLM response
   */
  parseLifeTrajectoryResponse(
    soulAgentId: string,
    llmResponse: string,
    startTick: number,
    endTick: number
  ): LifeTrajectory | null {
    try {
      // Extract JSON from response
      const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                       llmResponse.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error('[TrajectoryPromptBuilder] No JSON found in life trajectory response');
        return null;
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // Validate milestones
      const milestones: Milestone[] = Array.isArray(parsed.milestones)
        ? parsed.milestones.map((m: any) => ({
            year: m.year || 0,
            event: m.event || 'Unknown event',
            emotionalImpact: Math.max(-1, Math.min(1, m.emotionalImpact || 0)),
            involvedAgents: Array.isArray(m.involvedAgents) ? m.involvedAgents : [],
            significance: Math.max(0, Math.min(1, m.significance || 0.5)),
          }))
        : [];

      // Sort milestones chronologically
      milestones.sort((a, b) => a.year - b.year);

      return {
        soulAgentId,
        startTick,
        endTick,
        milestones,
        endState: {
          alive: parsed.endState?.alive ?? true,
          age: parsed.endState?.age || 0,
          causeOfDeath: parsed.endState?.causeOfDeath,
          descendants: Array.isArray(parsed.endState?.descendants)
            ? parsed.endState.descendants
            : [],
          achievements: Array.isArray(parsed.endState?.achievements)
            ? parsed.endState.achievements
            : [],
        },
      };
    } catch (error) {
      console.error('[TrajectoryPromptBuilder] Failed to parse life trajectory:', error);
      return null;
    }
  }
}
