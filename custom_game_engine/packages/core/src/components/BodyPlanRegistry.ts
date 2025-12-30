/**
 * Body Plan Registry - Templates for different species body configurations
 *
 * Defines body plans for:
 * - Humanoid (humans, elves, orcs)
 * - Insectoid (4+ arms, exoskeletons)
 * - Avian (winged)
 * - Aquatic (tentacled, gilled)
 * - Celestial/Divine (angels, demons)
 * - Custom alien species
 */

import type {
  BodyComponent,
  BodyPart,
  BodyPartType,
  BodyPartFunction,
  SizeCategory,
  BloodType,
  SkeletonType,
} from './BodyComponent.js';
import {
  inferSkillsFromFunctions,
  inferActionsFromFunctions,
  calculateOverallHealth,
} from './BodyComponent.js';

// ============================================================================
// Body Plan Template
// ============================================================================

export type BodySymmetry = 'bilateral' | 'radial' | 'asymmetric' | 'none';

export interface BodyPartDefinition {
  type: BodyPartType;
  count: number;
  vital: boolean;
  health: number;
  functions: BodyPartFunction[];
  children?: BodyPartDefinition[];
}

export interface BodyPlanTemplate {
  id: string;
  name: string;
  baseType: string;
  symmetry: BodySymmetry;
  size: SizeCategory;
  blood?: BloodType;
  skeleton?: SkeletonType;
  parts: BodyPartDefinition[];
}

// ============================================================================
// Predefined Body Plans
// ============================================================================

export const BODY_PLANS: Record<string, BodyPlanTemplate> = {
  // ------------------------------------------------------------------------
  // Humanoid Plans
  // ------------------------------------------------------------------------
  humanoid_standard: {
    id: 'humanoid_standard',
    name: 'Standard Humanoid',
    baseType: 'humanoid',
    symmetry: 'bilateral',
    size: 'medium',
    blood: 'red',
    skeleton: 'internal',
    parts: [
      { type: 'head', count: 1, vital: true, health: 150, functions: ['sensory', 'vital_organ', 'communication'] },
      { type: 'torso', count: 1, vital: true, health: 200, functions: ['vital_organ'] },
      {
        type: 'arm',
        count: 2,
        vital: false,
        health: 100,
        functions: ['manipulation'],
        children: [
          { type: 'hand', count: 1, vital: false, health: 80, functions: ['manipulation'] },
        ],
      },
      {
        type: 'leg',
        count: 2,
        vital: false,
        health: 100,
        functions: ['locomotion'],
        children: [
          { type: 'foot', count: 1, vital: false, health: 60, functions: ['locomotion'] },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------------
  // Insectoid Plans
  // ------------------------------------------------------------------------
  insectoid_4arm: {
    id: 'insectoid_4arm',
    name: 'Four-Armed Insectoid',
    baseType: 'insectoid',
    symmetry: 'bilateral',
    size: 'medium',
    blood: 'blue',
    skeleton: 'exoskeleton',
    parts: [
      { type: 'head', count: 1, vital: true, health: 120, functions: ['sensory', 'vital_organ', 'communication'] },
      { type: 'thorax', count: 1, vital: true, health: 180, functions: ['vital_organ'] },
      { type: 'abdomen', count: 1, vital: false, health: 150, functions: ['vital_organ'] },
      {
        type: 'arm',
        count: 4,
        vital: false,
        health: 80,
        functions: ['manipulation'],
        children: [
          { type: 'hand', count: 1, vital: false, health: 60, functions: ['manipulation'] },
        ],
      },
      {
        type: 'leg',
        count: 2,
        vital: false,
        health: 90,
        functions: ['locomotion'],
        children: [
          { type: 'foot', count: 1, vital: false, health: 50, functions: ['locomotion'] },
        ],
      },
      { type: 'antenna', count: 2, vital: false, health: 30, functions: ['sensory'] },
    ],
  },

  insectoid_6leg: {
    id: 'insectoid_6leg',
    name: 'Six-Legged Insectoid',
    baseType: 'insectoid',
    symmetry: 'bilateral',
    size: 'small',
    blood: 'blue',
    skeleton: 'exoskeleton',
    parts: [
      { type: 'head', count: 1, vital: true, health: 100, functions: ['sensory', 'vital_organ'] },
      { type: 'thorax', count: 1, vital: true, health: 150, functions: ['vital_organ'] },
      { type: 'abdomen', count: 1, vital: false, health: 120, functions: ['vital_organ'] },
      {
        type: 'leg',
        count: 6,
        vital: false,
        health: 70,
        functions: ['locomotion'],
        children: [
          { type: 'foot', count: 1, vital: false, health: 40, functions: ['locomotion'] },
        ],
      },
      { type: 'antenna', count: 2, vital: false, health: 25, functions: ['sensory'] },
      { type: 'mandible', count: 2, vital: false, health: 50, functions: ['attack', 'manipulation'] },
    ],
  },

  // ------------------------------------------------------------------------
  // Avian Plans
  // ------------------------------------------------------------------------
  avian_winged: {
    id: 'avian_winged',
    name: 'Winged Avian',
    baseType: 'avian',
    symmetry: 'bilateral',
    size: 'medium',
    blood: 'red',
    skeleton: 'internal',
    parts: [
      { type: 'head', count: 1, vital: true, health: 130, functions: ['sensory', 'vital_organ', 'communication'] },
      { type: 'torso', count: 1, vital: true, health: 180, functions: ['vital_organ'] },
      {
        type: 'arm',
        count: 2,
        vital: false,
        health: 90,
        functions: ['manipulation'],
        children: [
          { type: 'hand', count: 1, vital: false, health: 70, functions: ['manipulation'] },
        ],
      },
      { type: 'wing', count: 2, vital: false, health: 120, functions: ['flight'] },
      {
        type: 'leg',
        count: 2,
        vital: false,
        health: 90,
        functions: ['locomotion'],
        children: [
          { type: 'foot', count: 1, vital: false, health: 55, functions: ['locomotion'] },
        ],
      },
      { type: 'tail', count: 1, vital: false, health: 60, functions: ['balance', 'flight'] },
    ],
  },

  // ------------------------------------------------------------------------
  // Aquatic Plans
  // ------------------------------------------------------------------------
  aquatic_tentacled: {
    id: 'aquatic_tentacled',
    name: 'Tentacled Aquatic',
    baseType: 'aquatic',
    symmetry: 'radial',
    size: 'medium',
    blood: 'blue',
    skeleton: 'hydrostatic',
    parts: [
      { type: 'head', count: 1, vital: true, health: 140, functions: ['sensory', 'vital_organ'] },
      { type: 'torso', count: 1, vital: true, health: 200, functions: ['vital_organ'] },
      { type: 'tentacle', count: 8, vital: false, health: 70, functions: ['manipulation', 'locomotion', 'swimming'] },
      { type: 'gill', count: 6, vital: false, health: 40, functions: ['vital_organ'] },
    ],
  },

  aquatic_finned: {
    id: 'aquatic_finned',
    name: 'Finned Aquatic',
    baseType: 'aquatic',
    symmetry: 'bilateral',
    size: 'large',
    blood: 'red',
    skeleton: 'internal',
    parts: [
      { type: 'head', count: 1, vital: true, health: 160, functions: ['sensory', 'vital_organ'] },
      { type: 'torso', count: 1, vital: true, health: 250, functions: ['vital_organ'] },
      {
        type: 'arm',
        count: 2,
        vital: false,
        health: 110,
        functions: ['manipulation'],
        children: [
          { type: 'hand', count: 1, vital: false, health: 85, functions: ['manipulation'] },
        ],
      },
      { type: 'fin', count: 4, vital: false, health: 90, functions: ['swimming'] },
      { type: 'tail', count: 1, vital: false, health: 130, functions: ['swimming', 'balance'] },
      { type: 'gill', count: 4, vital: false, health: 50, functions: ['vital_organ'] },
    ],
  },

  // ------------------------------------------------------------------------
  // Celestial/Divine Plans
  // ------------------------------------------------------------------------
  celestial_winged: {
    id: 'celestial_winged',
    name: 'Celestial Winged',
    baseType: 'humanoid',
    symmetry: 'bilateral',
    size: 'medium',
    blood: 'ichor',
    skeleton: 'internal',
    parts: [
      { type: 'head', count: 1, vital: true, health: 150, functions: ['sensory', 'vital_organ', 'communication'] },
      { type: 'halo', count: 1, vital: false, health: 100, functions: ['none'] },  // Cosmetic/divine
      { type: 'torso', count: 1, vital: true, health: 200, functions: ['vital_organ'] },
      {
        type: 'arm',
        count: 2,
        vital: false,
        health: 100,
        functions: ['manipulation'],
        children: [
          { type: 'hand', count: 1, vital: false, health: 80, functions: ['manipulation'] },
        ],
      },
      { type: 'wing', count: 2, vital: false, health: 150, functions: ['flight'] },
      {
        type: 'leg',
        count: 2,
        vital: false,
        health: 100,
        functions: ['locomotion'],
        children: [
          { type: 'foot', count: 1, vital: false, health: 60, functions: ['locomotion'] },
        ],
      },
    ],
  },

  demonic_horned: {
    id: 'demonic_horned',
    name: 'Demonic Horned',
    baseType: 'humanoid',
    symmetry: 'bilateral',
    size: 'large',
    blood: 'ichor',
    skeleton: 'internal',
    parts: [
      { type: 'head', count: 1, vital: true, health: 170, functions: ['sensory', 'vital_organ', 'communication'] },
      { type: 'horn', count: 2, vital: false, health: 120, functions: ['attack'] },
      { type: 'torso', count: 1, vital: true, health: 220, functions: ['vital_organ'] },
      {
        type: 'arm',
        count: 2,
        vital: false,
        health: 110,
        functions: ['manipulation'],
        children: [
          { type: 'hand', count: 1, vital: false, health: 90, functions: ['manipulation'] },
          { type: 'claw', count: 5, vital: false, health: 50, functions: ['attack'] },
        ],
      },
      { type: 'wing', count: 2, vital: false, health: 140, functions: ['flight'] },
      {
        type: 'leg',
        count: 2,
        vital: false,
        health: 110,
        functions: ['locomotion'],
        children: [
          { type: 'foot', count: 1, vital: false, health: 70, functions: ['locomotion'] },
        ],
      },
      { type: 'tail', count: 1, vital: false, health: 100, functions: ['balance', 'attack'] },
    ],
  },

  // ------------------------------------------------------------------------
  // Reptilian Plans
  // ------------------------------------------------------------------------
  reptilian_standard: {
    id: 'reptilian_standard',
    name: 'Standard Reptilian',
    baseType: 'humanoid',
    symmetry: 'bilateral',
    size: 'medium',
    blood: 'green',
    skeleton: 'internal',
    parts: [
      { type: 'head', count: 1, vital: true, health: 140, functions: ['sensory', 'vital_organ', 'communication'] },
      { type: 'torso', count: 1, vital: true, health: 190, functions: ['vital_organ'] },
      {
        type: 'arm',
        count: 2,
        vital: false,
        health: 95,
        functions: ['manipulation'],
        children: [
          { type: 'hand', count: 1, vital: false, health: 75, functions: ['manipulation'] },
          { type: 'claw', count: 5, vital: false, health: 40, functions: ['attack'] },
        ],
      },
      {
        type: 'leg',
        count: 2,
        vital: false,
        health: 95,
        functions: ['locomotion'],
        children: [
          { type: 'foot', count: 1, vital: false, health: 65, functions: ['locomotion'] },
        ],
      },
      { type: 'tail', count: 1, vital: false, health: 85, functions: ['balance', 'attack'] },
    ],
  },
};

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a BodyComponent from a body plan template.
 */
export function createBodyComponentFromPlan(
  planId: string,
  speciesId?: string
): BodyComponent {
  const plan = BODY_PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown body plan: ${planId}. Available plans: ${Object.keys(BODY_PLANS).join(', ')}`);
  }

  const parts: Record<string, BodyPart> = {};
  let partIndex = 0;

  // Generate parts from plan
  for (const partDef of plan.parts) {
    generatePartsFromDefinition(partDef, plan, parts, partIndex, undefined);
    partIndex += partDef.count;
  }

  const component: BodyComponent = {
    type: 'body',
    version: 1,
    speciesId,
    bodyPlanId: planId,
    parts,
    overallHealth: 100,
    totalPain: 0,
    bloodLoss: 0,
    consciousness: true,
    size: plan.size,
    bloodType: plan.blood,
    skeletonType: plan.skeleton,
    modifications: [],
  };

  // Calculate initial overall health
  component.overallHealth = calculateOverallHealth(component);

  return component;
}

/**
 * Recursively generate body parts from a definition.
 */
function generatePartsFromDefinition(
  partDef: BodyPartDefinition,
  plan: BodyPlanTemplate,
  parts: Record<string, BodyPart>,
  _startIndex: number,
  parentId?: string
): void {
  for (let i = 0; i < partDef.count; i++) {
    const side = plan.symmetry === 'bilateral' && partDef.count === 2
      ? (i === 0 ? 'left' : 'right')
      : plan.symmetry === 'bilateral' && partDef.count === 4
        ? (i < 2 ? 'left' : 'right')
        : '';

    const instanceNum = partDef.count > 2 ? `_${i + 1}` : '';
    const partId = parentId
      ? `${parentId}_${partDef.type}${instanceNum}`.replace(/^_/, '')
      : `${side}_${partDef.type}${instanceNum}`.replace(/^_/, '');

    const partName = side
      ? `${side} ${partDef.type}${instanceNum ? ` ${i + 1}` : ''}`
      : `${partDef.type}${instanceNum ? ` ${i + 1}` : ''}`;

    parts[partId] = {
      id: partId,
      type: partDef.type,
      name: partName,
      parent: parentId,
      vital: partDef.vital,
      health: partDef.health,
      maxHealth: partDef.health,
      functions: partDef.functions,
      affectsSkills: inferSkillsFromFunctions(partDef.functions),
      affectsActions: inferActionsFromFunctions(partDef.functions),
      injuries: [],
      bandaged: false,
      splinted: false,
      infected: false,
      modifications: [],
    };

    // Recursively add children
    if (partDef.children) {
      for (const childDef of partDef.children) {
        generatePartsFromDefinition(childDef, plan, parts, 0, partId);
      }
    }
  }
}

/**
 * Get all available body plan IDs.
 */
export function getAvailableBodyPlans(): string[] {
  return Object.keys(BODY_PLANS);
}

/**
 * Get body plan template by ID.
 */
export function getBodyPlan(planId: string): BodyPlanTemplate | undefined {
  return BODY_PLANS[planId];
}
