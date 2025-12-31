/**
 * Plant Defense Mechanisms
 *
 * How alien plants protect themselves from being eaten, damaged, or otherwise inconvenienced.
 */

export interface DefenseMechanism {
  name: string;
  mechanism: string;
  effectiveness: 'low' | 'moderate' | 'high' | 'extreme' | 'overkill';
  sideEffects: string[];
  flavorText: string;
}

export const DEFENSE_MECHANISMS: Record<string, DefenseMechanism> = {
  'physical_thorns': {
    name: 'Thorns and Spines',
    mechanism: 'Sharp physical protrusions deter herbivores',
    effectiveness: 'moderate',
    sideEffects: ['Human finger injuries', 'Catches on clothing', 'Bird nest material'],
    flavorText: 'Sharp. Pointy. Simple. Effective. Herbivores learn. Eventually.',
  },
  'chemical_toxins': {
    name: 'Toxic Compounds',
    mechanism: 'Produces poisonous chemicals in tissues',
    effectiveness: 'high',
    sideEffects: ['Soil contamination', 'Accidental poisonings', 'Medicinal properties (sometimes)'],
    flavorText: 'Poison everything. Tissues. Leaves. Fruit. Roots. Herbivores die. Mission accomplished.',
  },
  'electrical_discharge': {
    name: 'Bio-Electric Shock',
    mechanism: 'Generates electrical shocks when touched',
    effectiveness: 'high',
    sideEffects: ['Storm attraction', 'Electronics interference', 'Tingling sensation'],
    flavorText: 'Touch plant. Get shocked. Learn lesson. Don\'t touch again. Simple education.',
  },
  'acid_spray': {
    name: 'Caustic Secretion',
    mechanism: 'Sprays concentrated acid when damaged',
    effectiveness: 'extreme',
    sideEffects: ['Soil acidification', 'Collateral damage', 'Safety regulations'],
    flavorText: 'Damaged? Spray acid. Problem solved. New problem created. Still alive though.',
  },
  'hallucinogenic_spores': {
    name: 'Psychoactive Spores',
    mechanism: 'Releases spores that cause hallucinations and confusion',
    effectiveness: 'high',
    sideEffects: ['Recreational use', 'Cult formation', 'Bad trips', 'Religious experiences'],
    flavorText: 'Spores make herbivores see things. Confusing things. Scary things. Eating stops. Success.',
  },
  'explosive_seed_pods': {
    name: 'Detonating Seed Dispersal',
    mechanism: 'Seed pods explode violently when disturbed',
    effectiveness: 'extreme',
    sideEffects: ['Startled animals', 'Fire risk', 'Hearing damage', 'Shrapnel'],
    flavorText: 'Defense or reproduction? Both. Explosion solves many problems. Creates some too.',
  },
  'mirror_camouflage': {
    name: 'Adaptive Camouflage',
    mechanism: 'Changes appearance to match surroundings perfectly',
    effectiveness: 'moderate',
    sideEffects: ['Accidentally sat on', 'Hard to find own offspring', 'Existential confusion'],
    flavorText: 'Can\'t be eaten if can\'t be seen. Perfect camouflage. Sometimes too perfect.',
  },
  'temporal_displacement': {
    name: 'Time-Shifted Existence',
    mechanism: 'Exists slightly out of phase with normal time',
    effectiveness: 'extreme',
    sideEffects: ['Hard to water', 'Harvest timing difficult', 'Causality violations'],
    flavorText: 'Exists in wrong time. Herbivores bite air. Plant elsewhere. When. Both.',
  },
  'dimensional_thorns': {
    name: 'Extradimensional Spines',
    mechanism: 'Thorns extend through multiple dimensions',
    effectiveness: 'overkill',
    sideEffects: ['Reality tears', 'Dimensional leakage', 'Physics complaints'],
    flavorText: 'Thorns in this dimension. And others. All at once. Touching hurts everywhere.',
  },
  'symbiotic_defenders': {
    name: 'Guardian Insects',
    mechanism: 'Provides shelter for aggressive insects that defend it',
    effectiveness: 'high',
    sideEffects: ['Stinging insects', 'Rent disputes', 'Eviction difficulties'],
    flavorText: 'Plant gives home. Insects protect. Mutually beneficial. Unless you touch plant.',
  },
  'regeneration': {
    name: 'Rapid Healing',
    mechanism: 'Damaged tissues regrow within minutes',
    effectiveness: 'moderate',
    sideEffects: ['Persistent weeds', 'Difficult to prune', 'Invasive potential'],
    flavorText: 'Damage heals. Fast. Cut branch. Grows back. Immediately. Frustrating for gardeners.',
  },
  'neural_feedback': {
    name: 'Pain Reflection',
    mechanism: 'Herbivore feels plant\'s pain as their own',
    effectiveness: 'high',
    sideEffects: ['Empathic overload', 'Vegetarianism increase', 'Guilt trips'],
    flavorText: 'Bite plant. Feel pain. Your pain. Plant\'s pain. Both. Empathy weapon.',
  },
  'sleep_pollen': {
    name: 'Soporific Pollen',
    mechanism: 'Releases pollen that induces deep sleep',
    effectiveness: 'high',
    sideEffects: ['Naptime', 'Missed appointments', 'Productivity loss', 'Good dreams'],
    flavorText: 'Pollen makes sleepy. Very sleepy. Herbivore naps. Plant safe. Everyone rested.',
  },
  'memory_erasure': {
    name: 'Amnesia Secretion',
    mechanism: 'Contact causes short-term memory loss',
    effectiveness: 'moderate',
    sideEffects: ['Forgotten keys', 'Relationship issues', 'What was I doing?'],
    flavorText: 'Touch plant. Forget touching. Repeat. Endless cycle. Plant unbothered.',
  },
  'illusion_projection': {
    name: 'Illusory Deterrent',
    mechanism: 'Projects images of predators or danger',
    effectiveness: 'moderate',
    sideEffects: ['False alarms', 'Paranoia', 'Unnecessary fleeing'],
    flavorText: 'Shows predators. Fake predators. Look real though. Herbivores flee. Safety achieved.',
  },
  'calcification': {
    name: 'Stone-Hardening',
    mechanism: 'Tissues rapidly calcify when damaged',
    effectiveness: 'high',
    sideEffects: ['Teeth breaking', 'Statue formation', 'Petrified forests (literal)'],
    flavorText: 'Bitten? Turn to stone. Immediately. Break teeth. Herbivore learns. Hard way.',
  },
  'sound_weapon': {
    name: 'Sonic Screaming',
    mechanism: 'Emits high-frequency screams when damaged',
    effectiveness: 'high',
    sideEffects: ['Noise complaints', 'Hearing damage', 'Glass breakage', 'Headaches'],
    flavorText: 'Damaged. Screams. Loud. Very loud. Herbivores flee. Neighbors annoyed.',
  },
  'dimensional_maze': {
    name: 'Spatial Distortion Field',
    mechanism: 'Space around plant warps into confusing maze',
    effectiveness: 'extreme',
    sideEffects: ['Lost animals', 'Confused mapping', 'Existential dread'],
    flavorText: 'Approach plant. Space bends. Maze appears. Exit uncertain. Plant untouched.',
  },
  'molecular_disassembly': {
    name: 'Matter Deconstruction',
    mechanism: 'Touch causes molecular bonds to weaken and fail',
    effectiveness: 'overkill',
    sideEffects: ['Everything dissolves', 'Extreme danger', 'Containment protocols'],
    flavorText: 'Touch means death. Molecular death. Rapid. Complete. Effective. Horrifying.',
  },
  'empathic_sadness': {
    name: 'Guilt Emission',
    mechanism: 'Projects overwhelming sadness and guilt into attackers',
    effectiveness: 'moderate',
    sideEffects: ['Depression nearby', 'Excessive apologizing', 'Therapy needs'],
    flavorText: 'Damage plant. Feel terrible. Crushing guilt. Too sad to continue. Plant wins.',
  },
};
