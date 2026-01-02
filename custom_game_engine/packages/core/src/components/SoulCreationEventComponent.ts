/**
 * SoulCreationEventComponent - Records the narrative of a soul's creation
 *
 * When a soul is created, the Three Fates gather at the Tapestry of Fate
 * to debate and weave the soul's purpose, interests, and destiny.
 *
 * The Fates:
 * - **The Weaver** (Purpose) - Decides what the soul should accomplish
 * - **The Spinner** (Nature) - Determines interests, inclinations, alignment
 * - **The Cutter** (Destiny) - Assigns potential fate, how the story might end
 *
 * This is a narrative, observable event. Players can witness souls being created
 * in the divine realm. The debate between Fates creates unique, meaningful souls.
 */

import type { Component } from '../ecs/Component.js';

/** Which Fate is speaking */
export type FateName = 'weaver' | 'spinner' | 'cutter';

/** A single statement from a Fate during soul creation */
export interface FateStatement {
  /** Which Fate spoke */
  fate: FateName;

  /** What they said (LLM-generated) */
  statement: string;

  /** What they're deciding (purpose, interest, destiny, etc.) */
  aspect: 'purpose' | 'interest' | 'destiny' | 'alignment' | 'archetype' | 'blessing' | 'curse';

  /** Timestamp when said */
  tick: number;
}

/** The complete debate/ceremony of soul creation */
export interface SoulCreationDebate {
  /** All statements made during creation */
  statements: FateStatement[];

  /** Context that influenced the debate */
  context: {
    /** Parent soul IDs (if any) */
    parentSouls?: string[];

    /** Cultural/civilization context */
    culturalContext?: string;

    /** Cosmic conditions at time of creation */
    cosmicAlignment: number;

    /** Location of creation (realm) */
    creationRealm: string;

    /** World events influencing creation */
    worldEvents?: string[];
  };

  /** When the debate began */
  debateStartTick: number;

  /** When the soul was finalized */
  creationCompleteTick: number;

  /** Did the Fates agree, or was there conflict? */
  unanimous: boolean;

  /** If conflicted, which Fate's view prevailed */
  prevailingFate?: FateName;
}

export interface SoulCreationEventComponent extends Component {
  type: 'soul_creation_event';

  /**
   * The complete narrative of this soul's creation
   */
  creationDebate: SoulCreationDebate;

  /**
   * Final purpose woven by the Weaver
   */
  wovenPurpose: string;

  /**
   * Interests spun by the Spinner
   */
  spunInterests: string[];

  /**
   * Destiny cut by the Cutter
   */
  cutDestiny?: string;

  /**
   * Was this a rare/special soul creation?
   * - 'common': Normal soul
   * - 'blessed': Fates gave special gifts
   * - 'cursed': Fates assigned hardship
   * - 'prophesied': Destiny is particularly significant
   * - 'reforged': Soul being recreated after many lives
   */
  creationType: 'common' | 'blessed' | 'cursed' | 'prophesied' | 'reforged';

  /**
   * Archetype assigned during creation
   */
  assignedArchetype: string;

  /**
   * Blessings/curses from the Fates
   */
  blessings?: string[];
  curses?: string[];

  /**
   * Visual metaphor used during creation
   * Examples: 'golden thread', 'starlight weave', 'storm-touched', 'root-bound'
   */
  creationMetaphor?: string;

  /**
   * Can this event be observed? (for afterlife animations)
   */
  isObservable: boolean;

  /**
   * Observers present during creation (entity IDs)
   * Gods, spirits, or players in spectator mode
   */
  observers?: string[];
}

/**
 * Create a soul creation event (to be populated by SoulCreationSystem)
 */
export function createSoulCreationEventComponent(data: {
  parentSouls?: string[];
  culturalContext?: string;
  cosmicAlignment: number;
  creationRealm?: string;
  currentTick: number;
  isObservable?: boolean;
}): SoulCreationEventComponent {
  return {
    type: 'soul_creation_event',
    version: 1,
    creationDebate: {
      statements: [],
      context: {
        parentSouls: data.parentSouls,
        culturalContext: data.culturalContext,
        cosmicAlignment: data.cosmicAlignment,
        creationRealm: data.creationRealm ?? 'tapestry_of_fate',
      },
      debateStartTick: data.currentTick,
      creationCompleteTick: data.currentTick,
      unanimous: true,
    },
    wovenPurpose: '', // To be filled by debate
    spunInterests: [], // To be filled by debate
    assignedArchetype: 'wanderer', // Default, may be changed
    creationType: 'common',
    isObservable: data.isObservable ?? true,
  };
}

/**
 * Add a Fate's statement to the debate
 */
export function addFateStatement(
  component: SoulCreationEventComponent,
  fate: FateName,
  statement: string,
  aspect: FateStatement['aspect'],
  currentTick: number
): SoulCreationEventComponent {
  const newStatement: FateStatement = {
    fate,
    statement,
    aspect,
    tick: currentTick,
  };

  return {
    ...component,
    creationDebate: {
      ...component.creationDebate,
      statements: [...component.creationDebate.statements, newStatement],
    },
  };
}

/**
 * Mark soul creation as complete
 */
export function completeSoulCreation(
  component: SoulCreationEventComponent,
  wovenPurpose: string,
  spunInterests: string[],
  cutDestiny: string | undefined,
  assignedArchetype: string,
  currentTick: number,
  unanimous: boolean = true
): SoulCreationEventComponent {
  return {
    ...component,
    wovenPurpose,
    spunInterests,
    cutDestiny,
    assignedArchetype,
    creationDebate: {
      ...component.creationDebate,
      creationCompleteTick: currentTick,
      unanimous,
    },
  };
}

/**
 * Get narrative description of soul creation
 */
export function getSoulCreationNarrative(component: SoulCreationEventComponent): string {
  const { creationDebate, wovenPurpose, creationType } = component;
  const { statements } = creationDebate;

  let narrative = '═══════════════════════════════════════\n';
  narrative += '    THE TAPESTRY OF FATE\n';
  narrative += '═══════════════════════════════════════\n\n';

  if (creationType !== 'common') {
    narrative += `[A ${creationType.toUpperCase()} soul emerges]\n\n`;
  }

  narrative += 'The Three Fates gather around the cosmic loom...\n\n';

  // Add each statement
  for (const statement of statements) {
    const fateName = getFateName(statement.fate);
    narrative += `${fateName}: "${statement.statement}"\n\n`;
  }

  narrative += '─────────────────────────────────────\n';
  narrative += `The soul is woven with purpose:\n"${wovenPurpose}"\n`;

  if (component.cutDestiny) {
    narrative += `\nAnd destiny is cut:\n"${component.cutDestiny}"\n`;
  }

  narrative += '─────────────────────────────────────\n';

  if (!creationDebate.unanimous) {
    narrative += '\n[The Fates disagreed, but the thread is spun]\n';
  }

  narrative += '\nThe soul descends toward incarnation...\n';
  narrative += '═══════════════════════════════════════\n';

  return narrative;
}

/**
 * Get formatted name of a Fate
 */
function getFateName(fate: FateName): string {
  switch (fate) {
    case 'weaver':
      return '🧵 The Weaver';
    case 'spinner':
      return '🌀 The Spinner';
    case 'cutter':
      return '✂️  The Cutter';
  }
}

/**
 * Check if soul creation was harmonious or conflicted
 */
export function wasCreationConflicted(component: SoulCreationEventComponent): boolean {
  return !component.creationDebate.unanimous;
}

/**
 * Get the dominant theme from creation statements
 */
export function getCreationTheme(component: SoulCreationEventComponent): string {
  const { statements } = component.creationDebate;

  if (statements.length === 0) return 'mystery';

  // Analyze statements for common themes (simple keyword matching)
  const allText = statements.map(s => s.statement.toLowerCase()).join(' ');

  if (allText.includes('war') || allText.includes('battle') || allText.includes('fight')) {
    return 'conflict';
  } else if (allText.includes('peace') || allText.includes('harmony') || allText.includes('unite')) {
    return 'unity';
  } else if (allText.includes('knowledge') || allText.includes('discover') || allText.includes('learn')) {
    return 'wisdom';
  } else if (allText.includes('protect') || allText.includes('guard') || allText.includes('defend')) {
    return 'protection';
  } else if (allText.includes('create') || allText.includes('build') || allText.includes('craft')) {
    return 'creation';
  } else if (allText.includes('destroy') || allText.includes('end') || allText.includes('chaos')) {
    return 'destruction';
  } else {
    return 'destiny';
  }
}
