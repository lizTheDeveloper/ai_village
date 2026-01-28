/**
 * UniverseModification - Late-Game Reality Alteration
 *
 * At the highest levels of the presence spectrum (0.90+), entities gain
 * the ability to modify the fundamental rules of magic in their universe.
 *
 * This is end-game content. A presence that has accumulated enough attention
 * to reach transcendent status hasn't just become a god - they've become
 * a force capable of reshaping reality itself.
 *
 * THE PROGRESSION:
 *
 * 0.90 - reality_manipulation: Can make subtle adjustments
 *        (add a minor magic source, tweak a cost slightly)
 *
 * 0.93 - paradigm_influence: Can make moderate changes
 *        (add new channels, modify law strictness)
 *
 * 0.95 - spawn_domains: Can create new magical domains
 *        (add whole new acquisition methods, create new risks)
 *
 * 0.98 - universal_influence: Can rewrite fundamental laws
 *        (change conservation laws, alter power scaling)
 *
 * 0.99 - paradigm_authorship: Can define entirely new magic systems
 *        (create a new paradigm from scratch)
 *
 * COSTS AND RISKS:
 * - All modifications cost attention (the currency of presence)
 * - Failed modifications cause reality backlash
 * - The universe resists change - higher modifications need more power
 * - Other presences may oppose changes to their domains
 */

import type {
  MagicParadigm,
  MagicSource,
  MagicCost,
  MagicChannel,
  MagicLaw,
  MagicRisk,
  AcquisitionDefinition,
  MagicCostType,
  MagicChannelType,
  LawStrictness,
  PowerScaling,
  ForbiddenCombination,
  ResonantCombination,
  MagicTechnique,
  MagicForm,
} from '@ai-village/magic';
import type { Presence } from './PresenceSpectrum.js';

// ============================================================================
// Modification Types - What Can Be Changed
// ============================================================================

export type ModificationCategory =
  | 'source'        // Magic power sources
  | 'cost'          // What magic costs
  | 'channel'       // How magic is channeled
  | 'law'           // Fundamental rules
  | 'risk'          // Dangers of magic
  | 'acquisition'   // How magic is gained
  | 'technique'     // Available magic verbs
  | 'form'          // Available magic nouns
  | 'combination'   // Forbidden/resonant combos
  | 'scaling'       // Power progression
  | 'limits'        // Maximum power
  | 'meta';         // Universal properties (foreign magic policy, etc.)

export type ModificationOperation =
  | 'add'           // Add something new
  | 'remove'        // Remove something
  | 'modify'        // Change existing
  | 'strengthen'    // Increase power/effectiveness
  | 'weaken'        // Decrease power/effectiveness
  | 'unlock'        // Make available
  | 'forbid'        // Make unavailable
  | 'bind'          // Create connection
  | 'sever';        // Remove connection

/** The severity/scope of the modification */
export type ModificationMagnitude =
  | 'subtle'        // Almost unnoticeable (0.90+)
  | 'minor'         // Small but perceptible (0.91+)
  | 'moderate'      // Significant change (0.93+)
  | 'major'         // Fundamental shift (0.95+)
  | 'absolute'      // Universe-defining (0.98+)
  | 'transcendent'; // Create new realities (0.99+)

// ============================================================================
// Modification Requirements
// ============================================================================

export interface ModificationRequirements {
  /** Minimum spectrum position required */
  minimumPosition: number;

  /** Attention cost to attempt */
  attentionCost: number;

  /** How difficult is this modification (0-1) */
  difficulty: number;

  /** Does this require consent from affected presences? */
  requiresConsent: boolean;

  /** Does this create opposition from the universe itself? */
  triggersResistance: boolean;

  /** Time required (in ticks) */
  duration: number;

  /** Can this be reversed? */
  reversible: boolean;
}

/** Get requirements for a modification magnitude */
export function getRequirementsForMagnitude(magnitude: ModificationMagnitude): ModificationRequirements {
  const requirements: Record<ModificationMagnitude, ModificationRequirements> = {
    subtle: {
      minimumPosition: 0.90,
      attentionCost: 50,
      difficulty: 0.2,
      requiresConsent: false,
      triggersResistance: false,
      duration: 10,
      reversible: true,
    },
    minor: {
      minimumPosition: 0.91,
      attentionCost: 150,
      difficulty: 0.35,
      requiresConsent: false,
      triggersResistance: false,
      duration: 50,
      reversible: true,
    },
    moderate: {
      minimumPosition: 0.93,
      attentionCost: 500,
      difficulty: 0.5,
      requiresConsent: false,
      triggersResistance: true,
      duration: 200,
      reversible: true,
    },
    major: {
      minimumPosition: 0.95,
      attentionCost: 2000,
      difficulty: 0.7,
      requiresConsent: true,
      triggersResistance: true,
      duration: 1000,
      reversible: false,
    },
    absolute: {
      minimumPosition: 0.98,
      attentionCost: 10000,
      difficulty: 0.9,
      requiresConsent: true,
      triggersResistance: true,
      duration: 5000,
      reversible: false,
    },
    transcendent: {
      minimumPosition: 0.99,
      attentionCost: 50000,
      difficulty: 0.95,
      requiresConsent: true,
      triggersResistance: true,
      duration: 10000,
      reversible: false,
    },
  };
  return requirements[magnitude];
}

// ============================================================================
// Modification Intent - What the Presence Wants to Do
// ============================================================================

export interface ModificationIntent {
  /** Unique ID for this modification attempt */
  id: string;

  /** Presence attempting the modification */
  presenceId: string;

  /** Target paradigm to modify */
  paradigmId: string;

  /** What category of change */
  category: ModificationCategory;

  /** What operation */
  operation: ModificationOperation;

  /** How significant */
  magnitude: ModificationMagnitude;

  /** Human-readable description */
  description: string;

  /** Specific changes (depends on category) */
  changes: ModificationChanges;

  /** When this was initiated */
  initiatedAt: number;

  /** Current status */
  status: ModificationStatus;

  /** Progress (0-1) */
  progress: number;
}

export type ModificationStatus =
  | 'planning'       // Gathering power
  | 'initiating'     // Beginning the change
  | 'in_progress'    // Modification underway
  | 'contested'      // Being opposed
  | 'completing'     // Finalizing
  | 'completed'      // Successfully done
  | 'failed'         // Did not succeed
  | 'reversed';      // Was undone

// ============================================================================
// Specific Changes by Category
// ============================================================================

export type ModificationChanges =
  | SourceModification
  | CostModification
  | ChannelModification
  | LawModification
  | RiskModification
  | AcquisitionModification
  | TechniqueModification
  | FormModification
  | CombinationModification
  | ScalingModification
  | LimitModification
  | MetaModification;

export interface SourceModification {
  category: 'source';
  /** For add/remove: the source */
  source?: MagicSource;
  /** For modify: source ID and changes */
  sourceId?: string;
  changes?: Partial<MagicSource>;
}

export interface CostModification {
  category: 'cost';
  cost?: MagicCost;
  costType?: MagicCostType;
  changes?: Partial<MagicCost>;
}

export interface ChannelModification {
  category: 'channel';
  channel?: MagicChannel;
  channelType?: MagicChannelType;
  changes?: Partial<MagicChannel>;
}

export interface LawModification {
  category: 'law';
  law?: MagicLaw;
  lawId?: string;
  changes?: Partial<MagicLaw>;
}

export interface RiskModification {
  category: 'risk';
  risk?: MagicRisk;
  changes?: Partial<MagicRisk>;
}

export interface AcquisitionModification {
  category: 'acquisition';
  acquisition?: AcquisitionDefinition;
  changes?: Partial<AcquisitionDefinition>;
}

export interface TechniqueModification {
  category: 'technique';
  technique?: MagicTechnique;
}

export interface FormModification {
  category: 'form';
  form?: MagicForm;
}

export interface CombinationModification {
  category: 'combination';
  forbidden?: ForbiddenCombination;
  resonant?: ResonantCombination;
}

export interface ScalingModification {
  category: 'scaling';
  newScaling?: PowerScaling;
}

export interface LimitModification {
  category: 'limits';
  field: 'powerCeiling' | 'allowsGroupCasting' | 'allowsEnchantment' |
         'persistsAfterDeath' | 'allowsTeaching' | 'allowsScrolls';
  newValue: number | boolean;
}

export interface MetaModification {
  category: 'meta';
  field: 'foreignMagicPolicy' | 'compatibleParadigms' | 'conflictingParadigms';
  newValue: unknown;
}

// ============================================================================
// Modification Results
// ============================================================================

export interface ModificationResult {
  /** Was it successful? */
  success: boolean;

  /** The resulting paradigm (if successful) */
  paradigm?: MagicParadigm;

  /** Attention actually spent */
  attentionSpent: number;

  /** Any backlash effects */
  backlash?: ModificationBacklash[];

  /** Messages/narrative about what happened */
  narrative: string[];

  /** Effects on the modifying presence */
  presenceEffects: PresenceEffect[];
}

export interface ModificationBacklash {
  type: BacklashType;
  severity: number;
  description: string;
  duration?: number;
}

export type BacklashType =
  | 'attention_drain'     // Lost more attention than intended
  | 'position_slip'       // Dropped on spectrum
  | 'domain_damage'       // Influence sphere shrunk
  | 'law_recoil'          // The modified law strikes back
  | 'rival_awakening'     // Opposing presence strengthened
  | 'reality_scar'        // Permanent instability created
  | 'cosmic_notice';      // Drew attention of higher powers

export interface PresenceEffect {
  type: 'attention_change' | 'position_change' | 'capability_change' | 'relationship_change';
  amount: number;
  description: string;
}

// ============================================================================
// Modification Capabilities - What Can a Presence Do?
// ============================================================================

export interface ModificationCapability {
  name: string;
  minimumPosition: number;
  allowedCategories: ModificationCategory[];
  allowedOperations: ModificationOperation[];
  maxMagnitude: ModificationMagnitude;
  description: string;
}

/** Standard modification capabilities that unlock with spectrum position */
export const MODIFICATION_CAPABILITIES: ModificationCapability[] = [
  // 0.90 - Reality Manipulation (Subtle)
  {
    name: 'reality_adjustment',
    minimumPosition: 0.90,
    allowedCategories: ['source', 'cost', 'channel'],
    allowedOperations: ['modify', 'strengthen', 'weaken'],
    maxMagnitude: 'subtle',
    description: 'Can make subtle adjustments to existing magic sources, costs, and channels',
  },

  // 0.91 - Minor Paradigm Influence
  {
    name: 'paradigm_tweaking',
    minimumPosition: 0.91,
    allowedCategories: ['source', 'cost', 'channel', 'risk'],
    allowedOperations: ['modify', 'strengthen', 'weaken', 'add'],
    maxMagnitude: 'minor',
    description: 'Can add minor magic elements or make small changes',
  },

  // 0.93 - Moderate Paradigm Influence
  {
    name: 'paradigm_shaping',
    minimumPosition: 0.93,
    allowedCategories: ['source', 'cost', 'channel', 'risk', 'technique', 'form'],
    allowedOperations: ['modify', 'strengthen', 'weaken', 'add', 'remove'],
    maxMagnitude: 'moderate',
    description: 'Can add or remove magical elements, modify significant properties',
  },

  // 0.95 - Major Paradigm Influence
  {
    name: 'paradigm_rewriting',
    minimumPosition: 0.95,
    allowedCategories: ['source', 'cost', 'channel', 'risk', 'technique', 'form',
                        'acquisition', 'combination', 'limits'],
    allowedOperations: ['modify', 'strengthen', 'weaken', 'add', 'remove', 'unlock', 'forbid'],
    maxMagnitude: 'major',
    description: 'Can fundamentally alter how magic works, add acquisition methods',
  },

  // 0.98 - Absolute Paradigm Control
  {
    name: 'paradigm_mastery',
    minimumPosition: 0.98,
    allowedCategories: ['source', 'cost', 'channel', 'risk', 'technique', 'form',
                        'acquisition', 'combination', 'limits', 'law', 'scaling', 'meta'],
    allowedOperations: ['modify', 'strengthen', 'weaken', 'add', 'remove',
                        'unlock', 'forbid', 'bind', 'sever'],
    maxMagnitude: 'absolute',
    description: 'Can rewrite fundamental laws of magic, alter power scaling',
  },

  // 0.99 - Transcendent Creation
  {
    name: 'paradigm_authorship',
    minimumPosition: 0.99,
    allowedCategories: ['source', 'cost', 'channel', 'risk', 'technique', 'form',
                        'acquisition', 'combination', 'limits', 'law', 'scaling', 'meta'],
    allowedOperations: ['modify', 'strengthen', 'weaken', 'add', 'remove',
                        'unlock', 'forbid', 'bind', 'sever'],
    maxMagnitude: 'transcendent',
    description: 'Can create entirely new magic paradigms from nothing',
  },
];

/** Get modification capabilities for a presence */
export function getModificationCapabilities(presence: Presence): ModificationCapability[] {
  return MODIFICATION_CAPABILITIES.filter(c => presence.spectrumPosition >= c.minimumPosition);
}

/** Check if a presence can attempt a modification */
export function canAttemptModification(
  presence: Presence,
  intent: ModificationIntent
): { allowed: boolean; reason?: string } {
  const capabilities = getModificationCapabilities(presence);

  if (capabilities.length === 0) {
    return { allowed: false, reason: 'Presence has not reached reality-manipulating threshold (0.90)' };
  }

  // Find all capabilities that match category and operation
  const matchingCapabilities = capabilities.filter(c =>
    c.allowedCategories.includes(intent.category) &&
    c.allowedOperations.includes(intent.operation)
  );

  if (matchingCapabilities.length === 0) {
    return {
      allowed: false,
      reason: `No capability allows ${intent.operation} on ${intent.category}`,
    };
  }

  const magnitudes: ModificationMagnitude[] = [
    'subtle', 'minor', 'moderate', 'major', 'absolute', 'transcendent',
  ];

  // Find the capability with the highest maxMagnitude
  const relevantCapability = matchingCapabilities.reduce((best, current) => {
    const bestIndex = magnitudes.indexOf(best.maxMagnitude);
    const currentIndex = magnitudes.indexOf(current.maxMagnitude);
    return currentIndex > bestIndex ? current : best;
  });

  const maxIndex = magnitudes.indexOf(relevantCapability.maxMagnitude);
  const intentIndex = magnitudes.indexOf(intent.magnitude);

  if (intentIndex > maxIndex) {
    return {
      allowed: false,
      reason: `Modification magnitude ${intent.magnitude} exceeds capability maximum ${relevantCapability.maxMagnitude}`,
    };
  }

  const requirements = getRequirementsForMagnitude(intent.magnitude);

  if (presence.attention < requirements.attentionCost) {
    return {
      allowed: false,
      reason: `Insufficient attention: need ${requirements.attentionCost}, have ${presence.attention}`,
    };
  }

  return { allowed: true };
}

// ============================================================================
// Applying Modifications
// ============================================================================

/**
 * Apply a modification to a paradigm.
 *
 * This is the core function that actually changes reality.
 */
export function applyModification(
  paradigm: MagicParadigm,
  presence: Presence,
  intent: ModificationIntent
): ModificationResult {
  const check = canAttemptModification(presence, intent);
  if (!check.allowed) {
    return {
      success: false,
      attentionSpent: 0,
      narrative: [`Modification failed: ${check.reason}`],
      presenceEffects: [],
    };
  }

  const requirements = getRequirementsForMagnitude(intent.magnitude);
  const attentionSpent = requirements.attentionCost;

  // Roll for success based on difficulty
  const successRoll = Math.random();
  const successThreshold = requirements.difficulty * (1 - (presence.spectrumPosition - 0.90) / 0.10);

  if (successRoll < successThreshold) {
    // Failed!
    const backlash = generateBacklash(intent, requirements.difficulty);
    return {
      success: false,
      attentionSpent: attentionSpent * 0.5, // Still lose some attention
      backlash: [backlash],
      narrative: [
        `The modification attempt failed.`,
        backlash.description,
      ],
      presenceEffects: [
        {
          type: 'attention_change',
          amount: -attentionSpent * 0.5,
          description: 'Lost attention in failed attempt',
        },
      ],
    };
  }

  // Apply the actual modification
  const modifiedParadigm = applyChangesToParadigm(paradigm, intent);

  const narrative: string[] = [];
  narrative.push(`${presence.name ?? 'A transcendent presence'} has altered reality.`);
  narrative.push(describeModification(intent));

  if (requirements.triggersResistance) {
    narrative.push('The universe trembles at this change.');
  }

  return {
    success: true,
    paradigm: modifiedParadigm,
    attentionSpent,
    narrative,
    presenceEffects: [
      {
        type: 'attention_change',
        amount: -attentionSpent,
        description: 'Spent attention to modify reality',
      },
    ],
  };
}

/** Apply changes to paradigm based on intent */
function applyChangesToParadigm(
  paradigm: MagicParadigm,
  intent: ModificationIntent
): MagicParadigm {
  const changes = intent.changes;
  let modified = { ...paradigm };

  switch (changes.category) {
    case 'source': {
      const sourceChanges = changes as SourceModification;
      if (intent.operation === 'add' && sourceChanges.source) {
        modified = {
          ...modified,
          sources: [...modified.sources, sourceChanges.source],
        };
      } else if (intent.operation === 'remove' && sourceChanges.sourceId) {
        modified = {
          ...modified,
          sources: modified.sources.filter((s: MagicSource) => s.id !== sourceChanges.sourceId),
        };
      } else if (intent.operation === 'modify' && sourceChanges.sourceId && sourceChanges.changes) {
        modified = {
          ...modified,
          sources: modified.sources.map((s: MagicSource) =>
            s.id === sourceChanges.sourceId ? { ...s, ...sourceChanges.changes } : s
          ),
        };
      }
      break;
    }

    case 'cost': {
      const costChanges = changes as CostModification;
      if (intent.operation === 'add' && costChanges.cost) {
        modified = {
          ...modified,
          costs: [...modified.costs, costChanges.cost],
        };
      } else if (intent.operation === 'remove' && costChanges.costType) {
        modified = {
          ...modified,
          costs: modified.costs.filter((c: MagicCost) => c.type !== costChanges.costType),
        };
      }
      break;
    }

    case 'channel': {
      const channelChanges = changes as ChannelModification;
      if (intent.operation === 'add' && channelChanges.channel) {
        modified = {
          ...modified,
          channels: [...modified.channels, channelChanges.channel],
        };
      } else if (intent.operation === 'remove' && channelChanges.channelType) {
        modified = {
          ...modified,
          channels: modified.channels.filter((c: MagicChannel) => c.type !== channelChanges.channelType),
        };
      }
      break;
    }

    case 'law': {
      const lawChanges = changes as LawModification;
      if (intent.operation === 'add' && lawChanges.law) {
        modified = {
          ...modified,
          laws: [...modified.laws, lawChanges.law],
        };
      } else if (intent.operation === 'remove' && lawChanges.lawId) {
        modified = {
          ...modified,
          laws: modified.laws.filter((l: MagicLaw) => l.id !== lawChanges.lawId),
        };
      } else if (intent.operation === 'modify' && lawChanges.lawId && lawChanges.changes) {
        modified = {
          ...modified,
          laws: modified.laws.map((l: MagicLaw) =>
            l.id === lawChanges.lawId ? { ...l, ...lawChanges.changes } : l
          ),
        };
      }
      break;
    }

    case 'risk': {
      const riskChanges = changes as RiskModification;
      if (intent.operation === 'add' && riskChanges.risk) {
        modified = {
          ...modified,
          risks: [...modified.risks, riskChanges.risk],
        };
      }
      break;
    }

    case 'acquisition': {
      const acqChanges = changes as AcquisitionModification;
      if (intent.operation === 'add' && acqChanges.acquisition) {
        modified = {
          ...modified,
          acquisitionMethods: [...modified.acquisitionMethods, acqChanges.acquisition],
        };
      }
      break;
    }

    case 'technique': {
      const techChanges = changes as TechniqueModification;
      if (intent.operation === 'add' && techChanges.technique) {
        modified = {
          ...modified,
          availableTechniques: [...modified.availableTechniques, techChanges.technique],
        };
      } else if (intent.operation === 'remove' && techChanges.technique) {
        modified = {
          ...modified,
          availableTechniques: modified.availableTechniques.filter((t: MagicTechnique) => t !== techChanges.technique),
        };
      }
      break;
    }

    case 'form': {
      const formChanges = changes as FormModification;
      if (intent.operation === 'add' && formChanges.form) {
        modified = {
          ...modified,
          availableForms: [...modified.availableForms, formChanges.form],
        };
      } else if (intent.operation === 'remove' && formChanges.form) {
        modified = {
          ...modified,
          availableForms: modified.availableForms.filter((f: MagicForm) => f !== formChanges.form),
        };
      }
      break;
    }

    case 'combination': {
      const comboChanges = changes as CombinationModification;
      if (intent.operation === 'forbid' && comboChanges.forbidden) {
        modified = {
          ...modified,
          forbiddenCombinations: [
            ...(modified.forbiddenCombinations ?? []),
            comboChanges.forbidden,
          ],
        };
      } else if (intent.operation === 'add' && comboChanges.resonant) {
        modified = {
          ...modified,
          resonantCombinations: [
            ...(modified.resonantCombinations ?? []),
            comboChanges.resonant,
          ],
        };
      }
      break;
    }

    case 'scaling': {
      const scalingChanges = changes as ScalingModification;
      if (scalingChanges.newScaling) {
        modified = {
          ...modified,
          powerScaling: scalingChanges.newScaling,
        };
      }
      break;
    }

    case 'limits': {
      const limitChanges = changes as LimitModification;
      modified = {
        ...modified,
        [limitChanges.field]: limitChanges.newValue,
      };
      break;
    }

    case 'meta': {
      const metaChanges = changes as MetaModification;
      modified = {
        ...modified,
        [metaChanges.field]: metaChanges.newValue,
      };
      break;
    }
  }

  return modified;
}

/** Generate backlash on failed modification */
function generateBacklash(intent: ModificationIntent, difficulty: number): ModificationBacklash {
  const types: BacklashType[] = [
    'attention_drain',
    'position_slip',
    'domain_damage',
    'law_recoil',
    'rival_awakening',
  ];

  // More severe modifications have worse backlash
  if (intent.magnitude === 'absolute' || intent.magnitude === 'transcendent') {
    types.push('reality_scar', 'cosmic_notice');
  }

  const type = types[Math.floor(Math.random() * types.length)]!;
  const severity = difficulty * (0.5 + Math.random() * 0.5);

  const descriptions: Record<BacklashType, string> = {
    attention_drain: 'The failed modification drained far more attention than expected.',
    position_slip: 'The presence\'s grip on reality weakens, sliding down the spectrum.',
    domain_damage: 'The influence sphere contracts as reality reasserts itself.',
    law_recoil: 'The law being modified strikes back with equal force.',
    rival_awakening: 'The disturbance has awakened or strengthened an opposing presence.',
    reality_scar: 'A permanent instability now exists where the modification was attempted.',
    cosmic_notice: 'The attempt has drawn the attention of forces beyond this universe.',
  };

  return {
    type,
    severity,
    description: descriptions[type],
    duration: type === 'reality_scar' ? undefined : Math.floor(1000 * severity),
  };
}

/** Generate narrative description of a modification */
function describeModification(intent: ModificationIntent): string {
  const magnitude = intent.magnitude;
  const category = intent.category;
  const operation = intent.operation;

  const magnitudeWords: Record<ModificationMagnitude, string> = {
    subtle: 'subtly',
    minor: 'slightly',
    moderate: 'significantly',
    major: 'fundamentally',
    absolute: 'absolutely',
    transcendent: 'transcendently',
  };

  const operationWords: Record<ModificationOperation, string> = {
    add: 'added',
    remove: 'removed',
    modify: 'modified',
    strengthen: 'strengthened',
    weaken: 'weakened',
    unlock: 'unlocked',
    forbid: 'forbidden',
    bind: 'bound',
    sever: 'severed',
  };

  const categoryWords: Record<ModificationCategory, string> = {
    source: 'a source of magical power',
    cost: 'the cost of magic',
    channel: 'how magic is channeled',
    law: 'a fundamental law of magic',
    risk: 'the risks of magic use',
    acquisition: 'how magic is gained',
    technique: 'available magical techniques',
    form: 'available magical forms',
    combination: 'magical combinations',
    scaling: 'how magical power grows',
    limits: 'the limits of magic',
    meta: 'the nature of magic itself',
  };

  return `Reality has been ${magnitudeWords[magnitude]} altered: ` +
         `${categoryWords[category]} has been ${operationWords[operation]}.`;
}

// ============================================================================
// High-Level Modification Helpers
// ============================================================================

/**
 * Create a new magic source through divine will.
 * Minimum position: 0.93 for minor sources, 0.95 for major
 */
export function createMagicSource(
  presenceId: string,
  paradigmId: string,
  source: MagicSource,
  isMinor: boolean = true
): ModificationIntent {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    presenceId,
    paradigmId,
    category: 'source',
    operation: 'add',
    magnitude: isMinor ? 'moderate' : 'major',
    description: `Add new magic source: ${source.name}`,
    changes: { category: 'source', source },
    initiatedAt: Date.now(),
    status: 'planning',
    progress: 0,
  };
}

/**
 * Weaken a magic law (e.g., making conservation less strict)
 * Minimum position: 0.98
 */
export function weakenMagicLaw(
  presenceId: string,
  paradigmId: string,
  lawId: string,
  newStrictness: LawStrictness
): ModificationIntent {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    presenceId,
    paradigmId,
    category: 'law',
    operation: 'weaken',
    magnitude: 'absolute',
    description: `Weaken magical law: ${lawId} to ${newStrictness}`,
    changes: {
      category: 'law',
      lawId,
      changes: { strictness: newStrictness },
    },
    initiatedAt: Date.now(),
    status: 'planning',
    progress: 0,
  };
}

/**
 * Add a new magical technique to the universe.
 * Minimum position: 0.93
 */
export function addMagicTechnique(
  presenceId: string,
  paradigmId: string,
  technique: MagicTechnique
): ModificationIntent {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    presenceId,
    paradigmId,
    category: 'technique',
    operation: 'add',
    magnitude: 'moderate',
    description: `Add new magical technique: ${technique}`,
    changes: { category: 'technique', technique },
    initiatedAt: Date.now(),
    status: 'planning',
    progress: 0,
  };
}

/**
 * Make a previously impossible combination now work.
 * Minimum position: 0.95
 */
export function unlockCombination(
  presenceId: string,
  paradigmId: string,
  technique: MagicTechnique,
  form: MagicForm,
  bonusEffect: string
): ModificationIntent {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    presenceId,
    paradigmId,
    category: 'combination',
    operation: 'add',
    magnitude: 'major',
    description: `Create resonant combination: ${technique} + ${form}`,
    changes: {
      category: 'combination',
      resonant: { technique, form, bonusEffect },
    },
    initiatedAt: Date.now(),
    status: 'planning',
    progress: 0,
  };
}

/**
 * Change how power scales in the universe.
 * Minimum position: 0.98
 */
export function alterPowerScaling(
  presenceId: string,
  paradigmId: string,
  newScaling: PowerScaling
): ModificationIntent {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    presenceId,
    paradigmId,
    category: 'scaling',
    operation: 'modify',
    magnitude: 'absolute',
    description: `Change power scaling to: ${newScaling}`,
    changes: { category: 'scaling', newScaling },
    initiatedAt: Date.now(),
    status: 'planning',
    progress: 0,
  };
}

/**
 * Create an entirely new paradigm from scratch.
 * This is the ultimate late-game ability.
 * Minimum position: 0.99
 */
export function createNewParadigm(
  presenceId: string,
  paradigm: MagicParadigm
): ModificationIntent {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    presenceId,
    paradigmId: paradigm.id, // The new paradigm's ID
    category: 'meta',
    operation: 'add',
    magnitude: 'transcendent',
    description: `Create new magic paradigm: ${paradigm.name}`,
    changes: {
      category: 'meta',
      field: 'foreignMagicPolicy', // This is a meta change
      newValue: paradigm,
    },
    initiatedAt: Date.now(),
    status: 'planning',
    progress: 0,
  };
}

// ============================================================================
// Subtle vs Powerful: The Progression
// ============================================================================

/**
 * Examples of modifications at each level:
 *
 * SUBTLE (0.90):
 * - Slightly increase mana regeneration rate
 * - Make a channel 10% easier to use
 * - Reduce a minor risk probability
 *
 * MINOR (0.91):
 * - Add a minor new magic source (emotional magic now possible)
 * - Add a new channeling method (dance as magical channel)
 * - Create a minor new risk
 *
 * MODERATE (0.93):
 * - Add significant new source (divine magic from this presence)
 * - Remove an unwanted channel requirement
 * - Add new magical techniques
 *
 * MAJOR (0.95):
 * - Add new acquisition methods (you can now be born with magic)
 * - Forbid certain combinations (fire + ice now impossible)
 * - Enable group casting in a paradigm that didn't allow it
 *
 * ABSOLUTE (0.98):
 * - Change conservation law from 'absolute' to 'strong'
 * - Alter power scaling from 'linear' to 'exponential'
 * - Enable magic to persist after caster death
 *
 * TRANSCENDENT (0.99):
 * - Create an entirely new magic paradigm
 * - Merge two paradigms into one
 * - Allow magic from one universe to work in another
 */

export type ModificationExample = {
  magnitude: ModificationMagnitude;
  description: string;
  intent: Omit<ModificationIntent, 'id' | 'presenceId' | 'paradigmId' | 'initiatedAt' | 'status' | 'progress'>;
};

export const MODIFICATION_EXAMPLES: ModificationExample[] = [
  {
    magnitude: 'subtle',
    description: 'Increase mana regeneration by 10%',
    intent: {
      category: 'source',
      operation: 'strengthen',
      magnitude: 'subtle',
      description: 'Increase mana regeneration by 10%',
      changes: {
        category: 'source',
        sourceId: 'mana',
        changes: { regenRate: 0.011 },
      },
    },
  },
  {
    magnitude: 'minor',
    description: 'Add emotional magic as a power source',
    intent: {
      category: 'source',
      operation: 'add',
      magnitude: 'minor',
      description: 'Add emotional magic as a power source',
      changes: {
        category: 'source',
        source: {
          id: 'emotional',
          name: 'Emotional Resonance',
          type: 'emotional',
          regeneration: 'passive',
          storable: false,
          transferable: true,
          stealable: false,
          detectability: 'obvious',
        },
      },
    },
  },
  {
    magnitude: 'moderate',
    description: 'Add summoning as a magical technique',
    intent: {
      category: 'technique',
      operation: 'add',
      magnitude: 'moderate',
      description: 'Add summoning as a magical technique',
      changes: {
        category: 'technique',
        technique: 'summon',
      },
    },
  },
  {
    magnitude: 'major',
    description: 'Enable magic to be inherited through bloodlines',
    intent: {
      category: 'acquisition',
      operation: 'add',
      magnitude: 'major',
      description: 'Enable magic to be inherited through bloodlines',
      changes: {
        category: 'acquisition',
        acquisition: {
          method: 'bloodline',
          rarity: 'rare',
          voluntary: false,
          grantsAccess: ['mana'],
          startingProficiency: 10,
          description: 'Magic now flows through family lines',
        },
      },
    },
  },
  {
    magnitude: 'absolute',
    description: 'Make the conservation law bendable with enough power',
    intent: {
      category: 'law',
      operation: 'weaken',
      magnitude: 'absolute',
      description: 'Make the conservation law bendable with enough power',
      changes: {
        category: 'law',
        lawId: 'conservation',
        changes: {
          strictness: 'strong',
          canBeCircumvented: true,
          circumventionCostMultiplier: 10,
        },
      },
    },
  },
];
