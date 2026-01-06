/**
 * MagicDetectionSystem - Supreme Creator magic surveillance and detection
 *
 * In deity-restricted universes, the Supreme Creator (first emerged god) monitors
 * for forbidden magic use. This system classifies spells by detection risk and
 * provides the logic for the Creator's intervention.
 *
 * Design principles:
 * - Natural magic (kami, karma, sex magic, low-level plant) is undetectable
 * - Academic/systematic magic study is highly detectable
 * - Power level matters: high-level spells are more detectable
 * - Certain categories trigger immediate intervention (resurrection, time magic)
 */

import type { DetectionRisk, ForbiddenCategory, CreatorDetectionMetadata } from './SpellRegistry.js';
import type { MagicForm, MagicTechnique, MagicSourceId } from '@ai-village/core';

// ============================================================================
// Detection Rule System
// ============================================================================

/** Rules for determining detection risk based on spell properties */
export interface DetectionRules {
  /** Paradigm-based detection (academic always detectable) */
  paradigmDetection: Record<string, DetectionRisk>;

  /** Power threshold - above this, risk increases */
  powerThresholds: {
    low: number;      // 0-3: low risk
    moderate: number; // 4-5: moderate risk
    high: number;     // 6-7: high risk
    critical: number; // 8-10: critical risk
  };

  /** Form-specific detection modifiers */
  formRisks: Partial<Record<MagicForm, number>>; // -2 to +2 modifier

  /** Technique-specific detection modifiers */
  techniqueRisks: Partial<Record<MagicTechnique, number>>; // -2 to +2 modifier

  /** Source-specific base detection */
  sourceBaseRisk: Partial<Record<MagicSourceId, DetectionRisk>>;
}

/** Default detection rules for deity-restricted universe */
export const DEFAULT_DETECTION_RULES: DetectionRules = {
  paradigmDetection: {
    'academic': 'high',           // Systematic study of magic
    'divine': 'low',              // Natural connection to gods
    'nature': 'undetectable',     // Natural magic (plant/animal)
    'union': 'undetectable',      // Sex magic/creation
    'pact': 'moderate',           // Deals with entities
    'void': 'critical',           // Dark/chaotic magic
    'blood': 'high',              // Life force manipulation
    'ancestral': 'low',           // Spirit connection (kami-like)
    'psionic': 'moderate',        // Mental powers
  },

  powerThresholds: {
    low: 3,
    moderate: 5,
    high: 7,
    critical: 8,
  },

  formRisks: {
    'plant': -1,      // Natural, less detectable
    'animal': -1,     // Natural, less detectable
    'body': 0,        // Neutral
    'mind': 0,        // Neutral
    'spirit': +1,     // Spiritual manipulation more detectable
    'time': +2,       // Time magic very detectable
    'space': +2,      // Spatial magic very detectable
    'void': +2,       // Void magic very detectable
  },

  techniqueRisks: {
    'create': 0,
    'destroy': +1,    // Destruction more noticed
    'transform': +1,  // Reality manipulation
    'perceive': 0,
    'control': +1,    // Domination/control
    'protect': -1,    // Protection less threatening
    'enhance': 0,
    'summon': +1,     // Creating entities
  },

  sourceBaseRisk: {
    'arcane': 'high',       // Academic source
    'divine': 'low',        // God-granted
    'void': 'critical',     // Forbidden
    'nature': 'undetectable', // Natural
    'blood': 'high',        // Life manipulation
    'psionic': 'moderate',  // Mental
    'ancestral': 'low',     // Spirit connection
  },
};

// ============================================================================
// Detection Helper Functions
// ============================================================================

/**
 * Calculate detection risk for a spell based on its properties.
 * This is a helper for spell authors - the actual metadata should be
 * set manually after reviewing the calculation.
 */
export function calculateDetectionRisk(
  paradigmId: string,
  powerLevel: number,
  form: MagicForm,
  technique: MagicTechnique,
  source: MagicSourceId,
  rules: DetectionRules = DEFAULT_DETECTION_RULES
): DetectionRisk {
  // Start with paradigm base risk
  let baseRisk: DetectionRisk = rules.paradigmDetection[paradigmId] ?? 'moderate';

  // Override with source base risk if stronger
  const sourceRisk = rules.sourceBaseRisk[source];
  if (sourceRisk) {
    if (riskValue(sourceRisk) > riskValue(baseRisk)) {
      baseRisk = sourceRisk;
    }
  }

  // Apply power threshold modifications
  if (powerLevel >= rules.powerThresholds.critical) {
    return 'critical'; // High power always critical
  }

  // Calculate modifier from form and technique
  const formMod = rules.formRisks[form] ?? 0;
  const techniqueMod = rules.techniqueRisks[technique] ?? 0;
  const totalMod = formMod + techniqueMod;

  // Adjust risk based on modifiers and power
  let risk = baseRisk;

  if (powerLevel >= rules.powerThresholds.high) {
    risk = increaseRisk(risk, 1 + totalMod);
  } else if (powerLevel >= rules.powerThresholds.moderate) {
    risk = increaseRisk(risk, totalMod);
  } else {
    risk = increaseRisk(risk, totalMod - 1);
  }

  return risk;
}

/**
 * Determine forbidden categories for a spell.
 */
export function detectForbiddenCategories(
  paradigmId: string,
  technique: MagicTechnique,
  form: MagicForm,
  powerLevel: number,
  description: string
): ForbiddenCategory[] {
  const categories: ForbiddenCategory[] = [];

  // Academic paradigm = forbidden knowledge
  if (paradigmId === 'academic') {
    categories.push('academic_study');
  }

  // Resurrection detection (description-based)
  if (description.toLowerCase().includes('resurrect') || description.toLowerCase().includes('raise dead')) {
    categories.push('resurrection');
  }

  // Time manipulation
  if (form === 'time') {
    categories.push('time_manipulation');
  }

  // Spatial/planar magic
  if (form === 'space' || description.toLowerCase().includes('planar') || description.toLowerCase().includes('teleport')) {
    categories.push('planar_travel');
  }

  // Weapon enchantment (description-based, high power)
  if (powerLevel >= 6 && description.toLowerCase().includes('weapon') && technique === 'enhance') {
    categories.push('weapon_enchantment');
  }

  // Sentient creation (summon + high power + mind)
  if (technique === 'summon' && powerLevel >= 7 && form === 'mind') {
    categories.push('sentient_creation');
  }

  // Mass destruction
  if (powerLevel >= 7 && (technique === 'destroy' || description.toLowerCase().includes('mass') || description.toLowerCase().includes('explosion'))) {
    categories.push('mass_destruction');
  }

  // Divine mimicry (acting like a god)
  if (description.toLowerCase().includes('divine') && paradigmId !== 'divine') {
    categories.push('divine_mimicry');
  }

  // Ascension
  if (description.toLowerCase().includes('ascend') || description.toLowerCase().includes('godhood')) {
    categories.push('ascension');
  }

  // Reality warping
  if (powerLevel >= 8 && (form === 'void' || description.toLowerCase().includes('reality'))) {
    categories.push('reality_warping');
  }

  return categories;
}

/**
 * Create detection metadata for a spell.
 * This is a convenience function for spell authors.
 */
export function createDetectionMetadata(params: {
  paradigmId: string;
  powerLevel: number;
  form: MagicForm;
  technique: MagicTechnique;
  source: MagicSourceId;
  description: string;
  leavesSignature?: boolean;
  notes?: string;
  rules?: DetectionRules;
}): CreatorDetectionMetadata {
  const risk = calculateDetectionRisk(
    params.paradigmId,
    params.powerLevel,
    params.form,
    params.technique,
    params.source,
    params.rules
  );

  const categories = detectForbiddenCategories(
    params.paradigmId,
    params.technique,
    params.form,
    params.powerLevel,
    params.description
  );

  return {
    detectionRisk: risk,
    forbiddenCategories: categories.length > 0 ? categories : undefined,
    powerLevel: params.powerLevel,
    leavesMagicalSignature: params.leavesSignature ?? (risk !== 'undetectable'),
    detectionNotes: params.notes,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/** Convert risk level to numeric value for comparison */
function riskValue(risk: DetectionRisk): number {
  const values: Record<DetectionRisk, number> = {
    'undetectable': 0,
    'low': 1,
    'moderate': 2,
    'high': 3,
    'critical': 4,
    'forbidden': 5,
  };
  return values[risk];
}

/** Increase risk level by modifier */
function increaseRisk(current: DetectionRisk, modifier: number): DetectionRisk {
  const currentValue = riskValue(current);
  const newValue = Math.max(0, Math.min(5, currentValue + Math.round(modifier)));

  const risks: DetectionRisk[] = ['undetectable', 'low', 'moderate', 'high', 'critical', 'forbidden'];
  return risks[newValue]!; // newValue is clamped to 0-5, so this is safe
}

/**
 * Check if a spell would trigger immediate Supreme Creator intervention.
 */
export function triggersImmediateIntervention(metadata: CreatorDetectionMetadata): boolean {
  if (metadata.detectionRisk === 'critical') {
    return true;
  }

  // Certain categories always trigger intervention
  const criticalCategories: ForbiddenCategory[] = [
    'resurrection',
    'time_manipulation',
    'reality_warping',
    'ascension',
    'sentient_creation',
  ];

  return metadata.forbiddenCategories?.some(cat => criticalCategories.includes(cat)) ?? false;
}

/**
 * Calculate detection chance (0-1) for Supreme Creator to notice this spell cast.
 * Factors in creator's paranoia, surveillance network, and spell detectability.
 */
export function calculateDetectionChance(
  metadata: CreatorDetectionMetadata,
  creatorParanoia: number, // 0-1
  surveillanceModifier: number // multiplier from spy gods, etc.
): number {
  // Base detection chance from risk level
  const baseChances: Record<DetectionRisk, number> = {
    'undetectable': 0,
    'low': 0.05,
    'moderate': 0.2,
    'high': 0.6,
    'critical': 1.0,
    'forbidden': 1.0,
  };

  let chance = baseChances[metadata.detectionRisk];

  // Apply paranoia (increases detection)
  chance = chance + (1 - chance) * creatorParanoia * 0.5;

  // Apply surveillance modifier
  chance = chance * surveillanceModifier;

  // Power level increases detection
  if (metadata.powerLevel) {
    chance = chance * (1 + metadata.powerLevel * 0.05);
  }

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, chance));
}

// ============================================================================
// Detection Classification Guide (for spell authors)
// ============================================================================

/**
 * DETECTION CLASSIFICATION GUIDE
 *
 * UNDETECTABLE (Natural Magic):
 * - Low-level plant magic (< power 4)
 * - Animal communication/empathy
 * - Kami/spirit connection (ancestral paradigm)
 * - Karma effects (natural consequence magic)
 * - Sex magic/union magic (act of creation)
 * - Basic nature spells (grow plant, purify water)
 *
 * LOW RISK:
 * - Divine paradigm (god-granted)
 * - Simple healing (non-academic)
 * - Basic protection spells
 * - Ancestral/spirit magic
 * - Low power (0-3) natural effects
 *
 * MODERATE RISK:
 * - Mid-power (4-5) spells
 * - Psionic abilities
 * - Pact magic (deals with entities)
 * - Moderate plant magic
 * - Non-academic combat magic
 *
 * HIGH RISK:
 * - ALL academic paradigm spells
 * - High power (6-7) spells
 * - Blood magic
 * - Significant weapon enchantments
 * - Reality manipulation
 * - Summoning powerful entities
 *
 * CRITICAL RISK (Immediate Intervention):
 * - Resurrection (major)
 * - Time manipulation
 * - Space/planar travel
 * - Sentient weapon creation
 * - Mass destruction spells
 * - Ascension magic
 * - Reality warping
 * - Very high power (8-10) spells
 * - Void magic
 */
