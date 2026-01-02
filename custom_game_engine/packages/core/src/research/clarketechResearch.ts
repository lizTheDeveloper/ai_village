/**
 * Clarketech Research Definitions
 *
 * Advanced technologies (Tier 6-8) that integrate with the existing research system.
 * Named after Arthur C. Clarke's Third Law: "Any sufficiently advanced technology
 * is indistinguishable from magic."
 *
 * Prerequisites from existing tech tree:
 * - Tier 6 requires: experimental_research, machinery_ii, genetics_ii
 * - Tier 7 requires: Tier 6 clarketech
 * - Tier 8 requires: Tier 7 clarketech
 */

import type { ResearchDefinition, ResearchField } from './types.js';
import { ResearchRegistry } from './ResearchRegistry.js';

/**
 * Extended research field for clarketech.
 * Uses 'experimental' as the base field since clarketech is advanced experimental tech.
 */
const CLARKETECH_FIELD: ResearchField = 'experimental';

/**
 * Clarketech research definitions.
 * These are registered with the main ResearchRegistry on initialization.
 */
export const CLARKETECH_RESEARCH: ResearchDefinition[] = [
  // ==========================================================================
  // TIER 6 - Near Future
  // ==========================================================================
  {
    id: 'virtual_reality',
    name: 'Virtual Reality',
    description:
      'Fully immersive virtual environments. Reality is overrated anyway. Now you can be somewhere else entirely without the inconvenience of travel.',
    field: CLARKETECH_FIELD,
    tier: 6,
    progressRequired: 5000,
    prerequisites: ['digital_networks'],
    requiredBuilding: 'research_lab',
    unlocks: [
      { type: 'building', buildingId: 'vr_arcade' },
      { type: 'ability', abilityId: 'enter_vr' },
      { type: 'research', researchId: 'vr_training' },
    ],
    type: 'predefined',
  },
  {
    id: 'vr_training',
    name: 'VR Training Simulations',
    description:
      'Learn any skill in virtual time. Die a thousand deaths, keep all the lessons. Side effects may include difficulty distinguishing simulation from reality.',
    field: CLARKETECH_FIELD,
    tier: 6,
    progressRequired: 7500,
    prerequisites: ['virtual_reality'],
    requiredBuilding: 'vr_arcade',
    unlocks: [
      { type: 'building', buildingId: 'vr_training_center' },
      { type: 'ability', abilityId: 'vr_skill_training' },
      { type: 'knowledge', knowledgeId: 'accelerated_learning' },
    ],
    type: 'predefined',
  },
  {
    id: 'fusion_power',
    name: 'Fusion Power',
    description:
      'Harness the power of the stars. Clean, virtually unlimited energy from hydrogen fusion. The age of energy scarcity ends here.',
    field: CLARKETECH_FIELD,
    tier: 6,
    progressRequired: 10000,
    prerequisites: ['experimental_research', 'machinery_ii'],
    requiredBuilding: 'research_lab',
    unlocks: [
      { type: 'building', buildingId: 'fusion_reactor' },
      { type: 'knowledge', knowledgeId: 'plasma_physics' },
    ],
    type: 'predefined',
  },
  {
    id: 'cryogenic_suspension',
    name: 'Cryogenic Suspension',
    description:
      'Safely freeze living beings, halting all biological processes. Perfect preservation across time.',
    field: CLARKETECH_FIELD,
    tier: 6,
    progressRequired: 5000,
    prerequisites: ['genetics_ii'],
    requiredBuilding: 'research_lab',
    unlocks: [
      { type: 'building', buildingId: 'cryogenic_chamber' },
      { type: 'ability', abilityId: 'suspend_agent' },
    ],
    type: 'predefined',
  },
  {
    id: 'neural_interface',
    name: 'Neural Interface',
    description:
      'Direct brain-computer interface. Control devices with thought, access information mentally.',
    field: CLARKETECH_FIELD,
    tier: 6,
    progressRequired: 7500,
    prerequisites: ['genetics_ii', 'machinery_ii'],
    requiredBuilding: 'research_lab',
    unlocks: [
      { type: 'item', itemId: 'neural_implant' },
      { type: 'ability', abilityId: 'mind_control_device' },
    ],
    type: 'predefined',
  },
  {
    id: 'advanced_ai',
    name: 'Advanced AI',
    description:
      'True artificial general intelligence. Self-improving, creative, and wise digital minds that can assist in all endeavors.',
    field: CLARKETECH_FIELD,
    tier: 6,
    progressRequired: 15000,
    prerequisites: ['neural_interface', 'experimental_research'],
    requiredBuilding: 'research_lab',
    unlocks: [
      { type: 'building', buildingId: 'ai_core' },
      { type: 'research', researchId: 'nanofabrication' },
      { type: 'research', researchId: 'mind_upload' },
    ],
    type: 'predefined',
  },

  // ==========================================================================
  // TIER 7 - Far Future
  // ==========================================================================
  {
    id: 'full_dive_vr',
    name: 'Full-Dive Virtual Reality',
    description:
      'Complete neural immersion. Your body sleeps while your mind walks in digital worlds. Some say they prefer it there. Some never come back.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 35000,
    prerequisites: ['neural_interface', 'vr_training'],
    requiredBuilding: 'vr_training_center',
    unlocks: [
      { type: 'building', buildingId: 'dive_pod_array' },
      { type: 'ability', abilityId: 'full_dive' },
      { type: 'knowledge', knowledgeId: 'digital_existence' },
    ],
    type: 'predefined',
  },
  {
    id: 'hive_mind_link',
    name: 'Hive Mind Link',
    description:
      'Share consciousness across multiple minds. Think together, know together, be uncertain about individual identity together. Privacy sold separately.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 45000,
    prerequisites: ['neural_interface', 'advanced_ai'],
    requiredBuilding: 'ai_core',
    unlocks: [
      { type: 'building', buildingId: 'collective_nexus' },
      { type: 'ability', abilityId: 'hive_link' },
      { type: 'research', researchId: 'mind_upload' },
    ],
    type: 'predefined',
  },
  {
    id: 'nanofabrication',
    name: 'Nanofabrication',
    description:
      'Build anything atom by atom. Programmable matter assemblers that can create any structure from raw materials.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 50000,
    prerequisites: ['advanced_ai'],
    requiredBuilding: 'ai_core',
    unlocks: [
      { type: 'building', buildingId: 'nanofabricator' },
      { type: 'ability', abilityId: 'matter_conversion' },
      { type: 'research', researchId: 'local_teleportation' },
    ],
    type: 'predefined',
  },
  {
    id: 'anti_gravity',
    name: 'Anti-Gravity',
    description:
      'Manipulate gravitational fields. Enable floating structures, effortless transportation, and orbital construction.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 30000,
    prerequisites: ['fusion_power'],
    requiredBuilding: 'fusion_reactor',
    unlocks: [
      { type: 'building', buildingId: 'gravity_generator' },
      { type: 'item', itemId: 'hover_platform' },
      { type: 'research', researchId: 'force_fields' },
    ],
    type: 'predefined',
  },
  {
    id: 'force_fields',
    name: 'Force Fields',
    description:
      'Project impenetrable energy barriers. Protection from all physical threats.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 25000,
    prerequisites: ['anti_gravity'],
    requiredBuilding: 'gravity_generator',
    unlocks: [
      { type: 'building', buildingId: 'shield_generator' },
      { type: 'item', itemId: 'personal_shield' },
    ],
    type: 'predefined',
  },
  {
    id: 'local_teleportation',
    name: 'Local Teleportation',
    description:
      'Instant matter transmission within line of sight. Step through space itself.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 40000,
    prerequisites: ['nanofabrication'],
    requiredBuilding: 'nanofabricator',
    unlocks: [
      { type: 'building', buildingId: 'teleport_pad' },
      { type: 'ability', abilityId: 'short_range_teleport' },
      { type: 'research', researchId: 'wormhole_gates' },
    ],
    type: 'predefined',
  },

  // ==========================================================================
  // TIER 8 - Transcendent
  // ==========================================================================
  {
    id: 'replicator',
    name: 'Replicator',
    description:
      'Convert pure energy into any form of matter. E=mc² in reverse. The end of material scarcity.',
    field: CLARKETECH_FIELD,
    tier: 8,
    progressRequired: 200000,
    prerequisites: ['nanofabrication', 'fusion_power'],
    requiredBuilding: 'nanofabricator',
    unlocks: [
      { type: 'building', buildingId: 'replicator_station' },
      { type: 'ability', abilityId: 'create_matter' },
    ],
    type: 'predefined',
  },
  {
    id: 'mind_upload',
    name: 'Mind Upload',
    description:
      'Transfer consciousness to digital substrate. True immortality of the self. Death loses its permanence. Whether YOU continue or just a copy is left as an exercise for philosophers.',
    field: CLARKETECH_FIELD,
    tier: 8,
    progressRequired: 150000,
    prerequisites: ['neural_interface', 'advanced_ai', 'hive_mind_link'],
    requiredBuilding: 'ai_core',
    unlocks: [
      { type: 'building', buildingId: 'upload_chamber' },
      { type: 'ability', abilityId: 'digitize_consciousness' },
      { type: 'research', researchId: 'digital_afterlife' },
      { type: 'research', researchId: 'consciousness_backup' },
    ],
    type: 'predefined',
  },
  {
    id: 'digital_afterlife',
    name: 'Digital Afterlife',
    description:
      'Virtual paradise servers for uploaded minds. Heaven with a terms of service. Eternal bliss, subject to maintenance windows and quarterly updates.',
    field: CLARKETECH_FIELD,
    tier: 8,
    progressRequired: 200000,
    prerequisites: ['mind_upload', 'full_dive_vr'],
    requiredBuilding: 'upload_chamber',
    unlocks: [
      { type: 'building', buildingId: 'afterlife_server' },
      { type: 'ability', abilityId: 'visit_afterlife' },
      { type: 'knowledge', knowledgeId: 'digital_theology' },
    ],
    type: 'predefined',
  },
  {
    id: 'consciousness_backup',
    name: 'Consciousness Backup',
    description:
      'Save your mind to restore later. Die without consequences. Fork yourself for parallel processing. The Ship of Theseus has entered the chat.',
    field: CLARKETECH_FIELD,
    tier: 8,
    progressRequired: 180000,
    prerequisites: ['mind_upload'],
    requiredBuilding: 'upload_chamber',
    unlocks: [
      { type: 'building', buildingId: 'backup_vault' },
      { type: 'ability', abilityId: 'backup_restore' },
      { type: 'ability', abilityId: 'fork_consciousness' },
    ],
    type: 'predefined',
  },
  {
    id: 'dyson_sphere',
    name: 'Dyson Sphere',
    description:
      'Harness the entire output of a star. Civilization-scale energy abundance. Become a Type II civilization.',
    field: CLARKETECH_FIELD,
    tier: 8,
    progressRequired: 1000000,
    prerequisites: ['fusion_power', 'anti_gravity', 'replicator'],
    requiredBuilding: 'fusion_reactor',
    unlocks: [
      { type: 'building', buildingId: 'dyson_sphere_control' },
      { type: 'knowledge', knowledgeId: 'stellar_engineering' },
      { type: 'research', researchId: 'wormhole_gates' },
    ],
    type: 'predefined',
  },
  {
    id: 'wormhole_gates',
    name: 'Wormhole Gates',
    description:
      'Create stable wormholes for instant travel across any distance. The galaxy opens before you.',
    field: CLARKETECH_FIELD,
    tier: 8,
    progressRequired: 500000,
    prerequisites: ['local_teleportation', 'dyson_sphere'],
    requiredBuilding: 'dyson_sphere_control',
    unlocks: [
      { type: 'building', buildingId: 'wormhole_gate' },
      { type: 'ability', abilityId: 'interstellar_travel' },
    ],
    type: 'predefined',
  },
];

/**
 * Register all clarketech research with the ResearchRegistry.
 * Should be called after registerDefaultResearch() since clarketech
 * has prerequisites from the default tech tree.
 */
export function registerClarketechResearch(): void {
  const registry = ResearchRegistry.getInstance();

  for (const research of CLARKETECH_RESEARCH) {
    registry.register(research);
  }
}

/**
 * Get the tier label for clarketech tiers
 */
export function getClarketechTierLabel(tier: number): string {
  switch (tier) {
    case 6:
      return 'Near Future';
    case 7:
      return 'Far Future';
    case 8:
      return 'Transcendent';
    default:
      return `Tier ${tier}`;
  }
}

/**
 * Check if a research ID is clarketech
 */
export function isClarketechResearch(researchId: string): boolean {
  return CLARKETECH_RESEARCH.some((r) => r.id === researchId);
}

/**
 * Get clarketech tier from research ID (returns undefined if not clarketech)
 */
export function getClarketechTier(researchId: string): number | undefined {
  const research = CLARKETECH_RESEARCH.find((r) => r.id === researchId);
  return research?.tier;
}
