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
  {
    id: 'advanced_electronics',
    name: 'Advanced Electronics',
    description:
      'Superconducting circuits, room-temperature quantum effects, and electromagnetic manipulation. Build things that would make Tesla weep with joy and Edison with envy.',
    field: CLARKETECH_FIELD,
    tier: 6,
    progressRequired: 8000,
    prerequisites: ['machinery_ii'],
    requiredBuilding: 'research_lab',
    unlocks: [
      { type: 'item', itemId: 'tesla_glove' },
      { type: 'research', researchId: 'quantum_computing' },
      { type: 'research', researchId: 'laser_weapons' },
      { type: 'research', researchId: 'ion_weapons' },
      { type: 'knowledge', knowledgeId: 'electromagnetic_mastery' },
    ],
    type: 'predefined',
  },
  {
    id: 'laser_weapons',
    name: 'Laser Weapons',
    description:
      'Coherent light as a weapon. From pistols to cannons, all sharing the same basic principle: concentrate enough light and it burns through anything. Safety goggles not included but strongly recommended.',
    field: CLARKETECH_FIELD,
    tier: 6,
    progressRequired: 6000,
    prerequisites: ['advanced_electronics'],
    requiredBuilding: 'research_lab',
    unlocks: [
      { type: 'item', itemId: 'laser_pistol' },
      { type: 'item', itemId: 'laser_carbine' },
      { type: 'item', itemId: 'laser_rifle' },
      { type: 'item', itemId: 'laser_sniper' },
      { type: 'item', itemId: 'laser_cannon' },
      { type: 'research', researchId: 'plasma_weapons' },
      { type: 'research', researchId: 'beam_weapons' },
    ],
    type: 'predefined',
  },
  {
    id: 'ion_weapons',
    name: 'Ion Weapons',
    description:
      'Weapons that fire streams of ionized particles. Disrupts electronics, shorts out magical wards, and generally ruins the day of anything that relies on ordered energy flow. Your anti-mage and anti-robot solution.',
    field: CLARKETECH_FIELD,
    tier: 6,
    progressRequired: 6000,
    prerequisites: ['advanced_electronics'],
    requiredBuilding: 'research_lab',
    unlocks: [
      { type: 'item', itemId: 'ion_pistol' },
      { type: 'item', itemId: 'ion_rifle' },
      { type: 'item', itemId: 'ion_cannon' },
    ],
    type: 'predefined',
  },

  // ==========================================================================
  // TIER 7 - Far Future
  // ==========================================================================
  {
    id: 'quantum_computing',
    name: 'Quantum Computing',
    description:
      'Harness superposition and entanglement for computation. Process all possible states simultaneously. Finally solve problems that classical computers would take longer than the heat death of the universe to complete. Warning: observing results may collapse them.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 35000,
    prerequisites: ['advanced_electronics', 'advanced_ai'],
    requiredBuilding: 'ai_core',
    unlocks: [
      { type: 'building', buildingId: 'quantum_computer' },
      { type: 'item', itemId: 'probability_gun' },
      { type: 'knowledge', knowledgeId: 'probability_manipulation' },
      { type: 'research', researchId: 'local_teleportation' },
      { type: 'research', researchId: 'particle_weapons' },
    ],
    type: 'predefined',
  },
  {
    id: 'plasma_weapons',
    name: 'Plasma Weapons',
    description:
      'Weaponized fourth state of matter. Superheated plasma contained in magnetic bottles until released in devastating bursts. Excellent for crowd control, assuming the crowd is things you want to set on fire.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 25000,
    prerequisites: ['laser_weapons', 'nanofabrication'],
    requiredBuilding: 'nanofabricator',
    unlocks: [
      { type: 'item', itemId: 'plasma_pistol' },
      { type: 'item', itemId: 'plasma_rifle' },
      { type: 'item', itemId: 'plasma_repeater' },
      { type: 'item', itemId: 'plasma_cannon' },
      { type: 'item', itemId: 'plasma_caster' },
    ],
    type: 'predefined',
  },
  {
    id: 'particle_weapons',
    name: 'Particle Weapons',
    description:
      'Accelerate subatomic particles to near-light speed and point them at your problems. Armor? What armor? These weapons operate on a level where conventional protection is a polite suggestion at best.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 30000,
    prerequisites: ['quantum_computing', 'advanced_electronics'],
    requiredBuilding: 'quantum_computer',
    unlocks: [
      { type: 'item', itemId: 'particle_pistol' },
      { type: 'item', itemId: 'particle_rifle' },
      { type: 'item', itemId: 'particle_accelerator' },
    ],
    type: 'predefined',
  },
  {
    id: 'beam_weapons',
    name: 'Beam Weapons',
    description:
      'Continuous energy weapons that maintain a destructive beam rather than discrete shots. Hold down the trigger and sweep across your targets. Perfect for those who find individual shots too tedious.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 28000,
    prerequisites: ['laser_weapons', 'plasma_weapons'],
    requiredBuilding: 'nanofabricator',
    unlocks: [
      { type: 'item', itemId: 'beam_rifle' },
      { type: 'item', itemId: 'plasma_beam' },
      { type: 'item', itemId: 'particle_beam' },
    ],
    type: 'predefined',
  },
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
      { type: 'research', researchId: 'exotic_physics_ii' },
    ],
    type: 'predefined',
  },
  {
    id: 'exotic_physics_ii',
    name: 'Exotic Physics II',
    description:
      'Higher-dimensional geometry and its practical applications. Learn to fold space like origami, except the paper screams and occasionally catches fire in non-Euclidean ways.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 40000,
    prerequisites: ['force_fields', 'quantum_computing'],
    requiredBuilding: 'quantum_computer',
    unlocks: [
      { type: 'research', researchId: 'tesseract_geometry' },
      { type: 'research', researchId: 'spatial_folding' },
      { type: 'research', researchId: 'nexus_architecture' },
      { type: 'knowledge', knowledgeId: 'hyperdimensional_awareness' },
    ],
    type: 'predefined',
  },
  {
    id: 'tesseract_geometry',
    name: 'Tesseract Geometry',
    description:
      'Build structures that exist in four spatial dimensions simultaneously. Your rooms are bigger on the inside because they extend into directions that hurt to think about. Storage capacity becomes theoretically infinite.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 45000,
    prerequisites: ['exotic_physics_ii'],
    requiredBuilding: 'quantum_computer',
    unlocks: [
      { type: 'building', buildingId: 'tesseract_building' },
      { type: 'research', researchId: 'pocket_dimension_mastery' },
    ],
    type: 'predefined',
  },
  {
    id: 'spatial_folding',
    name: 'Spatial Folding',
    description:
      'Compress and expand space at will. Make distances irrelevant, or create private bubbles of expanded space. Warning: unfolding improperly may result in spaghettification.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 35000,
    prerequisites: ['exotic_physics_ii'],
    requiredBuilding: 'quantum_computer',
    unlocks: [
      { type: 'building', buildingId: 'pocket_dimension' },
      { type: 'research', researchId: 'realm_anchoring' },
    ],
    type: 'predefined',
  },
  {
    id: 'nexus_architecture',
    name: 'Nexus Architecture',
    description:
      'Design buildings that serve as intersections between dimensions. Every doorway can lead somewhere different. The floorplan exists in a superposition until observed.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 38000,
    prerequisites: ['exotic_physics_ii'],
    requiredBuilding: 'quantum_computer',
    unlocks: [
      { type: 'building', buildingId: 'dimensional_rift' },
    ],
    type: 'predefined',
  },
  {
    id: 'realm_anchoring',
    name: 'Realm Anchoring',
    description:
      'Stabilize connections to other planes of existence. Keep your portals where you put them instead of drifting through β-space. Essential for anyone tired of their shadow dimension shifting without notice.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 32000,
    prerequisites: ['spatial_folding'],
    requiredBuilding: 'teleport_pad',
    unlocks: [
      { type: 'building', buildingId: 'shadow_binding' },
      { type: 'ability', abilityId: 'anchor_realm' },
    ],
    type: 'predefined',
  },
  {
    id: 'pocket_dimension_mastery',
    name: 'Pocket Dimension Mastery',
    description:
      'Create and maintain personal pocket dimensions. Your own private universe, limited only by the power you can feed it. Excellent for storage, prisons, or vacation homes that exist outside of spacetime.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 50000,
    prerequisites: ['tesseract_geometry'],
    requiredBuilding: 'tesseract_building',
    unlocks: [
      { type: 'building', buildingId: 'pocket_dimension' },
      { type: 'ability', abilityId: 'create_pocket_dimension' },
      { type: 'research', researchId: 'exotic_physics_iii' },
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
      { type: 'research', researchId: 'stable_inter_universe_portals' },
    ],
    type: 'predefined',
  },
  {
    id: 'stable_inter_universe_portals',
    name: 'Stable Inter-Universe Portals',
    description:
      'Create permanent gateways between different β-branches. Cross-universe trade and travel become routine. Your timeline is just one of many accessible realities.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 60000,
    prerequisites: ['local_teleportation'],
    requiredBuilding: 'teleport_pad',
    unlocks: [
      { type: 'building', buildingId: 'inter_universe_portal' },
      { type: 'ability', abilityId: 'cross_universe_travel' },
      { type: 'research', researchId: 'cross_realm_messaging' },
      { type: 'research', researchId: 'stable_inter_multiverse_portals' },
    ],
    type: 'predefined',
  },
  {
    id: 'cross_realm_messaging',
    name: 'Cross-Realm Messaging',
    description:
      'Send messages across β-space using quantum entanglement and mana resonance. Text communication that transcends timeline branches. "New message from alternate you" becomes a daily notification.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 35000,
    prerequisites: ['stable_inter_universe_portals', 'neural_interface'],
    requiredBuilding: 'inter_universe_portal',
    unlocks: [
      { type: 'item', itemId: 'basic_cross_realm_phone' },
      { type: 'building', buildingId: 'mana_charging_station' },
      { type: 'research', researchId: 'advanced_cross_realm_communication' },
    ],
    type: 'predefined',
  },
  {
    id: 'advanced_cross_realm_communication',
    name: 'Advanced Cross-Realm Communication',
    description:
      'Voice and video calls across universes. See your trading partners in real-time despite being in orthogonal β-branches. Conference calls that span multiple realities.',
    field: CLARKETECH_FIELD,
    tier: 7,
    progressRequired: 45000,
    prerequisites: ['cross_realm_messaging', 'hive_mind_link'],
    requiredBuilding: 'inter_universe_portal',
    unlocks: [
      { type: 'item', itemId: 'advanced_cross_realm_phone' },
      { type: 'item', itemId: 'range_boost_rune' },
      { type: 'item', itemId: 'clarity_rune' },
      { type: 'item', itemId: 'privacy_rune' },
      { type: 'item', itemId: 'recording_rune' },
    ],
    type: 'predefined',
  },

  // ==========================================================================
  // TIER 8 - Transcendent
  // ==========================================================================
  {
    id: 'stable_inter_multiverse_portals',
    name: 'Stable Inter-Multiverse Portals',
    description:
      'Bridge entire multiverses. Travel not just between timelines, but between fundamentally different realities. Visit root.digital.*, root.quantum.*, root.transcendent.* - regions of β-space with alien physics.',
    field: CLARKETECH_FIELD,
    tier: 8,
    progressRequired: 250000,
    prerequisites: ['stable_inter_universe_portals', 'wormhole_gates'],
    requiredBuilding: 'wormhole_gate',
    unlocks: [
      { type: 'building', buildingId: 'inter_multiverse_portal' },
      { type: 'ability', abilityId: 'cross_multiverse_travel' },
      { type: 'research', researchId: 'transcendent_communication' },
    ],
    type: 'predefined',
  },
  {
    id: 'transcendent_communication',
    name: 'Transcendent Multiverse Communication',
    description:
      'The ultimate communication technology. Contact civilizations in orthogonal β-space. Reach post-temporal hive minds in root.transcendent.*. Send emergency beacons across 100 branch depths. Essential for 10th-dimensional diplomacy.',
    field: CLARKETECH_FIELD,
    tier: 8,
    progressRequired: 300000,
    prerequisites: ['stable_inter_multiverse_portals', 'advanced_cross_realm_communication', 'mind_upload'],
    requiredBuilding: 'inter_multiverse_portal',
    unlocks: [
      { type: 'item', itemId: 'transcendent_multiverse_phone' },
      { type: 'item', itemId: 'emergency_beacon_rune' },
      { type: 'item', itemId: 'multi_party_rune' },
      { type: 'ability', abilityId: 'contact_orthogonal_civilizations' },
      { type: 'knowledge', knowledgeId: 'post_temporal_diplomacy' },
    ],
    type: 'predefined',
  },
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
