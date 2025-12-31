/**
 * MatingParadigmRegistry - Concrete mating paradigm definitions
 *
 * Each paradigm fully parameterizes how reproduction, courtship, bonding,
 * and sexuality work for a set of species. The same engine can simulate
 * humans, Gethenians, hive insects, mystifs, and quantum beings.
 */

import type { MatingParadigm } from './MatingParadigm.js';

// ============================================================================
// Standard Humanoid Paradigm
// ============================================================================

export const HUMAN_PARADIGM: MatingParadigm = {
  id: 'human_standard',
  name: 'Human Standard',
  description: 'Binary sexual dimorphism with cultural pair-bonding and extended parental care.',
  speciesIds: ['human', 'elf', 'dwarf', 'halfling'],
  lore: 'The most common paradigm among humanoid species. Two sexes, variable gender expression, romantic pair-bonding, and long childhoods requiring intensive care.',

  biologicalSex: {
    system: 'binary_static',
    sexes: [
      { id: 'female', name: 'Female', reproductiveRole: 'spawner', prevalence: 0.5, characteristics: ['XX chromosomes', 'internal gestation'] },
      { id: 'male', name: 'Male', reproductiveRole: 'fertilizer', prevalence: 0.5, characteristics: ['XY chromosomes', 'external fertilization'] },
    ],
    determination: 'genetic',
    canChange: false,
  },

  gender: {
    system: 'multi_gender',
    genders: [
      { id: 'woman', name: 'Woman', socialRoles: ['mother', 'healer', 'weaver'], canChangeTo: true },
      { id: 'man', name: 'Man', socialRoles: ['father', 'hunter', 'builder'], canChangeTo: true },
      { id: 'nonbinary', name: 'Non-binary', socialRoles: ['any'], canChangeTo: true },
    ],
    separateFromSex: true,
    socialSignificance: 'moderate',
  },

  pairBonding: {
    type: 'serial_monogamy',
    flexibility: 'cultural',
    bondsBreakable: true,
    breakageTrauma: 0.6,
    bondEffects: [
      { effectType: 'mood_sync', intensity: 0.3, requiresProximity: true },
    ],
  },

  courtship: {
    type: 'gradual_proximity',
    initiator: 'any',
    duration: 'weeks',
    rejectionPossible: true,
    rejectionConsequence: 'mild_hurt',
    competitive: false,
    multipleCourtships: true,
    stages: [
      { name: 'initial_interest', duration: 'days', requirements: ['familiarity > 20'], canFail: false },
      { name: 'getting_to_know', duration: 'weeks', requirements: ['shared_activities'], canFail: true, failureConsequence: 'remain_friends' },
      { name: 'declaration', duration: 'moment', requirements: ['courage'], canFail: true, failureConsequence: 'rejection' },
    ],
  },

  reproduction: {
    mechanism: 'copulation',
    participantsRequired: 'two',
    frequency: 'continuous',
    gestationPeriod: {
      durationDays: 270,
      location: 'internal',
      careRequired: 'moderate',
      risks: ['miscarriage', 'complications'],
    },
    offspringCount: { min: 1, max: 3, typical: 1 },
    geneticVariation: 'high',
  },

  parentalCare: {
    type: 'full_nurturing',
    provider: 'both_parents',
    duration: 'years',
    bondContinuesAfter: true,
    recognizesOffspring: true,
  },

  mateSelection: {
    primaryCriteria: ['compatibility', 'health', 'social_status'],
    secondaryCriteria: ['resources', 'intelligence', 'creativity'],
    selector: 'both',
    choiceLevel: 'high',
    preferencesFixed: false,
  },

  maturityAge: { min: 14, max: 18, determinedBy: 'age' },
  reproductiveWindow: { startAge: 14, endAge: 50, canRestart: false },

  attraction: {
    onset: 'familiarity',
    fluidity: 'slow_change',
    dimensions: [
      { name: 'sexual', exists: true, intensityRange: [0, 1] },
      { name: 'romantic', exists: true, intensityRange: [0, 1] },
      { name: 'aesthetic', exists: true, intensityRange: [0, 1] },
    ],
  },

  emotionalDynamics: {
    rejectionHurts: true,
    rejectionIntensity: 0.5,
    rejectionDecay: 'slow',
    matingBondsEmotionally: true,
    bondFormationRate: 'gradual',
    mateLossGrief: true,
    griefIntensity: 0.8,
    griefDuration: 'extended',
    heartbreakPossible: true,
    heartbreakTriggers: ['rejection', 'betrayal', 'abandonment'],
    heartbreakEffects: ['depression', 'lowered_trust', 'attraction_changes'],
  },

  socialRegulation: {
    regulated: true,
    regulations: ['monogamy_enforced', 'age_restrictions'],
  },

  hybridization: {
    possible: true,
    enablers: ['genetic_compatibility'],
    compatibleSpecies: ['elf', 'human'],
    offspringViability: 'always',
  },

  paradigmCompatibility: 'compatible',
};

// ============================================================================
// Gethenian/Kemmer Paradigm (Le Guin)
// ============================================================================

export const KEMMER_PARADIGM: MatingParadigm = {
  id: 'kemmer',
  name: 'Kemmer Cycle',
  description: 'Ambisexual beings who are sexually latent except during monthly kemmer, when they manifest as either sex based on partner interaction.',
  speciesIds: ['gethenian', 'kemmer_species'],
  lore: 'In somer, they are neither. In kemmer, they become what their partner needs them to be. Any individual can mother or father. None are locked to a role.',

  biologicalSex: {
    system: 'kemmer',
    sexes: [
      { id: 'somer', name: 'Somer', reproductiveRole: 'neither', prevalence: 0.9, characteristics: ['sexually latent', 'androgynous'] },
      { id: 'kemmer_spawner', name: 'Kemmer (Female)', reproductiveRole: 'spawner', prevalence: 0.05, characteristics: ['in kemmer', 'gestator'] },
      { id: 'kemmer_fertilizer', name: 'Kemmer (Male)', reproductiveRole: 'fertilizer', prevalence: 0.05, characteristics: ['in kemmer', 'sirer'] },
    ],
    determination: 'social',
    canChange: true,
    changeConditions: ['entering_kemmer', 'partner_presence', 'exiting_kemmer'],
  },

  gender: {
    system: 'genderless',
    genders: [
      { id: 'none', name: 'Person', canChangeTo: false },
    ],
    separateFromSex: false,
    socialSignificance: 'none',
  },

  pairBonding: {
    type: 'lifelong_monogamy',
    flexibility: 'individual',
    bondsBreakable: true,
    breakageTrauma: 0.8,
    bondEffects: [
      { effectType: 'fertility_sync', intensity: 0.9, requiresProximity: true },
      { effectType: 'mood_sync', intensity: 0.5, requiresProximity: false },
    ],
    description: 'Kemmering partners often sync cycles and preferentially manifest complementary sexes.',
  },

  courtship: {
    type: 'gradual_proximity',
    initiator: 'any',
    duration: 'months',
    rejectionPossible: true,
    rejectionConsequence: 'mild_hurt',
    competitive: false,
    multipleCourtships: false,
    description: 'Courtship happens in somer. Kemmer is for mating.',
  },

  reproduction: {
    mechanism: 'copulation',
    participantsRequired: 'two',
    frequency: 'cyclical',
    triggers: ['hormonal_cycle'],
    gestationPeriod: {
      durationDays: 250,
      location: 'internal',
      careRequired: 'intensive',
    },
    offspringCount: { min: 1, max: 2, typical: 1 },
    geneticVariation: 'high',
    requirements: ['both_partners_in_kemmer', 'complementary_sex_manifestation'],
  },

  parentalCare: {
    type: 'full_nurturing',
    provider: 'both_parents',
    duration: 'years',
    bondContinuesAfter: true,
    recognizesOffspring: true,
    description: 'Either parent may have carried the child. Both nurture equally.',
  },

  mateSelection: {
    primaryCriteria: ['compatibility', 'resonance_match'],
    secondaryCriteria: ['social_status', 'intelligence'],
    selector: 'both',
    choiceLevel: 'high',
    preferencesFixed: false,
  },

  lifeStages: [
    { name: 'somer', canReproduce: false, duration: '~24 days' },
    { name: 'kemmer', canReproduce: true, sexExpression: 'partner_determined', duration: '~3-5 days', transitionTrigger: 'hormonal_cycle' },
  ],

  attraction: {
    onset: 'cyclical',
    fluidity: 'rapid_change',
    dimensions: [
      { name: 'sexual', exists: true, intensityRange: [0, 1] },
      { name: 'romantic', exists: true, intensityRange: [0, 1] },
    ],
  },

  emotionalDynamics: {
    rejectionHurts: true,
    rejectionIntensity: 0.6,
    rejectionDecay: 'slow',
    matingBondsEmotionally: true,
    bondFormationRate: 'gradual',
    mateLossGrief: true,
    griefIntensity: 0.9,
    griefDuration: 'extended',
    heartbreakPossible: true,
  },

  hybridization: {
    possible: false,
    offspringViability: 'sterile',
  },

  paradigmCompatibility: 'isolated',
};

// ============================================================================
// Hive Paradigm
// ============================================================================

export const HIVE_PARADIGM: MatingParadigm = {
  id: 'hive',
  name: 'Eusocial Hive',
  description: 'A single reproductive queen/king pair. All others are sterile workers or drones for a single mating flight.',
  speciesIds: ['insectoid', 'formian', 'thri-kreen'],
  lore: 'The colony is the organism. The queen is its womb. Workers are extensions of her will. Drones exist to die in mating flight.',

  biologicalSex: {
    system: 'hive_caste',
    sexes: [
      { id: 'queen', name: 'Queen', reproductiveRole: 'spawner', prevalence: 0.001, characteristics: ['massive', 'pheromone_controller', 'egg_layer'] },
      { id: 'king', name: 'King', reproductiveRole: 'fertilizer', prevalence: 0.001, characteristics: ['sperm_storage', 'long_lived'] },
      { id: 'drone', name: 'Drone', reproductiveRole: 'fertilizer', prevalence: 0.1, characteristics: ['disposable', 'dies_after_mating'] },
      { id: 'worker', name: 'Worker', reproductiveRole: 'neither', prevalence: 0.888, characteristics: ['sterile', 'working_caste'] },
    ],
    determination: 'environmental',
    canChange: true,
    changeConditions: ['queen_death', 'special_feeding'],
  },

  gender: {
    system: 'caste_gender',
    genders: [
      { id: 'queen', name: 'Queen', socialRoles: ['reproductive', 'leader'], canChangeTo: true },
      { id: 'worker', name: 'Worker', socialRoles: ['labor', 'defense', 'nursing'], canChangeTo: false },
      { id: 'drone', name: 'Drone', socialRoles: ['mating'], canChangeTo: false },
    ],
    separateFromSex: false,
    socialSignificance: 'defining',
  },

  pairBonding: {
    type: 'hive_exclusive',
    flexibility: 'rigid',
    bondsBreakable: false,
    breakageTrauma: 0,
    description: 'Only queen bonds with king(s). Workers have no romantic bonds.',
  },

  courtship: {
    type: 'collective_decision',
    initiator: 'circumstance',
    duration: 'instant',
    rejectionPossible: false,
    competitive: true,
    multipleCourtships: false,
    description: 'Mating flight. Drones compete. Winners mate and die. Losers die.',
  },

  reproduction: {
    mechanism: 'queen_spawning',
    participantsRequired: 'two',
    frequency: 'continuous',
    gestationPeriod: {
      durationDays: 3,
      location: 'nest',
      careRequired: 'intensive',
    },
    offspringCount: { min: 50, max: 500, typical: 100 },
    geneticVariation: 'low',
    description: 'Queen lays hundreds of eggs daily. Haplodiploid system.',
  },

  parentalCare: {
    type: 'hive_integration',
    provider: 'community',
    duration: 'weeks',
    bondContinuesAfter: false,
    recognizesOffspring: false,
    description: 'Workers raise larvae collectively. No individual parent-child bonds.',
  },

  mateSelection: {
    primaryCriteria: ['availability', 'strength'],
    selector: 'female',
    choiceLevel: 'none',
    preferencesFixed: true,
  },

  attraction: {
    onset: 'environmental',
    fluidity: 'fixed',
    dimensions: [
      { name: 'sexual', exists: false, intensityRange: [0, 0] },
      { name: 'hive_loyalty', exists: true, intensityRange: [0, 1] },
    ],
  },

  emotionalDynamics: {
    rejectionHurts: false,
    rejectionIntensity: 0,
    rejectionDecay: 'fast',
    matingBondsEmotionally: false,
    bondFormationRate: 'never',
    mateLossGrief: false,
    griefIntensity: 0,
    griefDuration: 'brief',
    heartbreakPossible: false,
  },

  hybridization: {
    possible: false,
    offspringViability: 'sterile',
  },

  paradigmCompatibility: 'isolated',
};

// ============================================================================
// Opportunistic/Dolphin Paradigm
// ============================================================================

export const OPPORTUNISTIC_PARADIGM: MatingParadigm = {
  id: 'opportunistic',
  name: 'Opportunistic Mating',
  description: 'No pair bonds. Mate with whoever is available. High social complexity without romantic attachment.',
  speciesIds: ['dolphin_folk', 'bonobo_kin', 'free_love_species'],
  lore: 'Sex is social glue, not romance. Pleasure is shared freely. Offspring are raised by the community.',

  biologicalSex: {
    system: 'binary_static',
    sexes: [
      { id: 'female', name: 'Female', reproductiveRole: 'spawner', prevalence: 0.5 },
      { id: 'male', name: 'Male', reproductiveRole: 'fertilizer', prevalence: 0.5 },
    ],
    determination: 'genetic',
    canChange: false,
  },

  gender: {
    system: 'genderless',
    genders: [{ id: 'person', name: 'Person', canChangeTo: false }],
    separateFromSex: true,
    socialSignificance: 'none',
  },

  pairBonding: {
    type: 'none',
    flexibility: 'rigid',
    bondsBreakable: true,
    breakageTrauma: 0,
    description: 'No romantic pair bonds. Deep friendships exist but are not romantic.',
  },

  courtship: {
    type: 'none',
    initiator: 'any',
    duration: 'instant',
    rejectionPossible: true,
    rejectionConsequence: 'none',
    competitive: false,
    multipleCourtships: true,
  },

  reproduction: {
    mechanism: 'copulation',
    participantsRequired: 'two',
    frequency: 'continuous',
    gestationPeriod: {
      durationDays: 365,
      location: 'internal',
      careRequired: 'moderate',
    },
    offspringCount: { min: 1, max: 1, typical: 1 },
    geneticVariation: 'extreme',
  },

  parentalCare: {
    type: 'communal_care',
    provider: 'community',
    duration: 'years',
    bondContinuesAfter: true,
    recognizesOffspring: true,
    description: 'All adults care for all children. Biological parents known but not privileged.',
  },

  mateSelection: {
    primaryCriteria: ['availability', 'proximity'],
    selector: 'both',
    choiceLevel: 'total',
    preferencesFixed: false,
  },

  attraction: {
    onset: 'immediate',
    fluidity: 'rapid_change',
    dimensions: [
      { name: 'sexual', exists: true, intensityRange: [0, 1] },
      { name: 'romantic', exists: false, intensityRange: [0, 0] },
      { name: 'social', exists: true, intensityRange: [0, 1] },
    ],
  },

  emotionalDynamics: {
    rejectionHurts: false,
    rejectionIntensity: 0.1,
    rejectionDecay: 'fast',
    matingBondsEmotionally: false,
    bondFormationRate: 'never',
    mateLossGrief: false,
    griefIntensity: 0.2,
    griefDuration: 'brief',
    heartbreakPossible: false,
  },

  hybridization: {
    possible: true,
    enablers: ['genetic_compatibility'],
    offspringViability: 'variable',
  },

  paradigmCompatibility: 'compatible',
};

// ============================================================================
// Mystif/Union Magic Paradigm (Imajica)
// ============================================================================

export const MYSTIF_PARADIGM: MatingParadigm = {
  id: 'mystif',
  name: 'Union Magic',
  description: 'Shapeshifting beings who become their partner\'s desire. Reproduction is magical, not genetic.',
  speciesIds: ['mystif', 'union_mage', 'pleasure_spirit'],
  lore: 'They have no true form. They become what you desire. Their children are born of shared ecstasy, not chromosomes.',

  biologicalSex: {
    system: 'fluid',
    sexes: [
      { id: 'adaptive', name: 'Adaptive', reproductiveRole: 'both', prevalence: 1.0, characteristics: ['shapeshifting', 'any_form'] },
    ],
    determination: 'magical',
    canChange: true,
    changeConditions: ['partner_desire', 'will', 'union_magic'],
  },

  gender: {
    system: 'individual_choice',
    genders: [
      { id: 'fluid', name: 'Fluid', canChangeTo: true },
      { id: 'none', name: 'None', canChangeTo: true },
    ],
    separateFromSex: true,
    socialSignificance: 'none',
  },

  pairBonding: {
    type: 'soul_bound',
    flexibility: 'individual',
    bondsBreakable: true,
    breakageTrauma: 0.9,
    bondEffects: [
      { effectType: 'telepathy', intensity: 0.8, requiresProximity: false },
      { effectType: 'power_sharing', intensity: 0.5, requiresProximity: true },
      { effectType: 'health_link', intensity: 0.3, requiresProximity: false },
    ],
    description: 'Union creates literal soul bonds. Breaking them is devastating.',
  },

  courtship: {
    type: 'resonance',
    initiator: 'any',
    duration: 'variable',
    rejectionPossible: true,
    rejectionConsequence: 'severe_hurt',
    competitive: false,
    multipleCourtships: true,
    stages: [
      { name: 'sensing', duration: 'instant', requirements: ['magical_resonance'], canFail: true },
      { name: 'revealing', duration: 'hours', requirements: ['vulnerability'], canFail: true },
      { name: 'union', duration: 'timeless', requirements: ['mutual_consent', 'trust'], canFail: false },
    ],
  },

  reproduction: {
    mechanism: 'union_magic',
    participantsRequired: 'two_plus',
    frequency: 'triggered',
    triggers: ['emotional_peak', 'ritual_completion', 'consent_given'],
    gestationPeriod: {
      durationDays: 1,
      location: 'dimensional',
      careRequired: 'none',
    },
    offspringCount: { min: 0, max: 3, typical: 1 },
    geneticVariation: 'extreme',
    requirements: ['union_magic', 'mutual_desire', 'consent'],
    description: 'Offspring are born from shared pleasure, not genetics. They inherit desired traits.',
  },

  parentalCare: {
    type: 'memory_inheritance',
    provider: 'both_parents',
    duration: 'none',
    bondContinuesAfter: true,
    recognizesOffspring: true,
    description: 'Children are born with inherited memories. No physical care needed.',
  },

  mateSelection: {
    primaryCriteria: ['resonance_match', 'soul_harmony'],
    secondaryCriteria: ['creativity', 'compatibility'],
    selector: 'both',
    choiceLevel: 'total',
    preferencesFixed: false,
  },

  attraction: {
    onset: 'resonance',
    fluidity: 'rapid_change',
    dimensions: [
      { name: 'sexual', exists: true, intensityRange: [0, 1] },
      { name: 'romantic', exists: true, intensityRange: [0, 1] },
      { name: 'magical', exists: true, intensityRange: [0, 1] },
      { name: 'soul', exists: true, intensityRange: [0, 1] },
    ],
  },

  emotionalDynamics: {
    rejectionHurts: true,
    rejectionIntensity: 0.8,
    rejectionDecay: 'slow',
    matingBondsEmotionally: true,
    bondFormationRate: 'instant',
    mateLossGrief: true,
    griefIntensity: 1.0,
    griefDuration: 'permanent',
    heartbreakPossible: true,
    heartbreakTriggers: ['rejection', 'bond_severance', 'betrayal'],
    heartbreakEffects: ['identity_crisis', 'power_loss', 'form_instability'],
  },

  hybridization: {
    possible: true,
    enablers: ['union_magic', 'emotional_transcendence'],
    compatibleSpecies: ['any'],
    offspringViability: 'enhanced',
  },

  paradigmCompatibility: 'absorbs',
};

// ============================================================================
// Quantum Paradigm
// ============================================================================

export const QUANTUM_PARADIGM: MatingParadigm = {
  id: 'quantum',
  name: 'Quantum Superposition',
  description: 'Beings existing in multiple states simultaneously. Sex, reproduction, even existence are probabilistic.',
  speciesIds: ['quantum_entity', 'probability_being', 'schrodinger_folk'],
  lore: 'They are all sexes until observed. They have reproduced with you in some timeline. The child exists and does not exist.',

  biologicalSex: {
    system: 'quantum',
    sexes: [
      { id: 'superposition', name: 'Superposition', reproductiveRole: 'variable', prevalence: 1.0, characteristics: ['all_states', 'collapses_on_observation'] },
    ],
    determination: 'quantum',
    canChange: true,
    changeConditions: ['observation', 'probability_collapse'],
  },

  gender: {
    system: 'quantum_gender',
    genders: [
      { id: 'superposition', name: 'All/None', canChangeTo: true },
    ],
    separateFromSex: false,
    socialSignificance: 'none',
  },

  pairBonding: {
    type: 'quantum_entangled',
    flexibility: 'quantum',
    bondsBreakable: false,
    breakageTrauma: 1.0,
    bondEffects: [
      { effectType: 'telepathy', intensity: 1.0, requiresProximity: false },
      { effectType: 'location_sense', intensity: 1.0, requiresProximity: false },
      { effectType: 'health_link', intensity: 0.5, requiresProximity: false },
    ],
    description: 'Entangled pairs affect each other instantly across any distance.',
  },

  courtship: {
    type: 'timeline_search',
    initiator: 'circumstance',
    duration: 'instant',
    rejectionPossible: false,
    competitive: false,
    multipleCourtships: true,
    description: 'Courtship is finding the timeline where you are already together.',
  },

  reproduction: {
    mechanism: 'quantum_collapse',
    participantsRequired: 'variable',
    frequency: 'triggered',
    triggers: ['quantum_observation', 'probability_collapse'],
    gestationPeriod: {
      durationDays: 0,
      location: 'dimensional',
      careRequired: 'none',
    },
    offspringCount: { min: 0, max: 100, typical: 1, modifiers: [{ condition: 'many_observers', countModifier: 10 }] },
    geneticVariation: 'extreme',
    description: 'Offspring exist in superposition until observed. Multiple may collapse into existence.',
  },

  parentalCare: {
    type: 'none',
    provider: 'none',
    duration: 'none',
    bondContinuesAfter: true,
    recognizesOffspring: true,
    description: 'Offspring are entangled from birth. No care needed.',
  },

  mateSelection: {
    primaryCriteria: ['timeline_alignment', 'resonance_match'],
    selector: 'fate',
    choiceLevel: 'none',
    preferencesFixed: true,
  },

  attraction: {
    onset: 'immediate',
    fluidity: 'quantum',
    dimensions: [
      { name: 'entanglement', exists: true, intensityRange: [0, 1] },
    ],
  },

  emotionalDynamics: {
    rejectionHurts: false,
    rejectionIntensity: 0,
    rejectionDecay: 'fast',
    matingBondsEmotionally: true,
    bondFormationRate: 'instant',
    mateLossGrief: true,
    griefIntensity: 0.5,
    griefDuration: 'brief',
    heartbreakPossible: false,
  },

  hybridization: {
    possible: true,
    enablers: ['quantum_possibility'],
    offspringViability: 'variable',
  },

  paradigmCompatibility: 'transforms',
};

// ============================================================================
// Temporal Paradigm
// ============================================================================

export const TEMPORAL_PARADIGM: MatingParadigm = {
  id: 'temporal',
  name: 'Temporal Beings',
  description: 'Beings who experience time non-linearly. Their mates are predetermined. Their children were always going to exist.',
  speciesIds: ['time_walker', 'chrono_entity', 'fate_bound'],
  lore: 'They remember their grandchildren\'s funerals. They attend their own conception. Choice is an illusion they humor mortals with.',

  biologicalSex: {
    system: 'temporal',
    sexes: [
      { id: 'temporal', name: 'Temporal', reproductiveRole: 'variable', prevalence: 1.0, characteristics: ['sex_varies_by_timeline'] },
    ],
    determination: 'temporal',
    canChange: true,
    changeConditions: ['timeline_shift'],
  },

  gender: {
    system: 'age_based',
    genders: [
      { id: 'temporal_flux', name: 'Temporal', canChangeTo: true },
    ],
    separateFromSex: true,
    socialSignificance: 'none',
  },

  pairBonding: {
    type: 'temporal_fixed',
    flexibility: 'rigid',
    bondsBreakable: false,
    breakageTrauma: 0,
    description: 'Bonds are fixed in the timeline. They cannot be broken because they always existed.',
  },

  courtship: {
    type: 'timeline_search',
    initiator: 'circumstance',
    duration: 'instant',
    rejectionPossible: false,
    competitive: false,
    multipleCourtships: false,
    description: 'There is no courtship. You find your mate or you always had them.',
  },

  reproduction: {
    mechanism: 'temporal_loop',
    participantsRequired: 'two',
    frequency: 'once_lifetime',
    triggers: ['temporal_nexus'],
    gestationPeriod: {
      durationDays: 0,
      location: 'none',
      careRequired: 'none',
    },
    offspringCount: { min: 1, max: 1, typical: 1 },
    geneticVariation: 'none',
    description: 'Children always existed. Conception is discovering them in the timeline.',
  },

  parentalCare: {
    type: 'memory_inheritance',
    provider: 'none',
    duration: 'none',
    bondContinuesAfter: true,
    recognizesOffspring: true,
    description: 'Parents and children know each other across all time. Care is retroactive.',
  },

  mateSelection: {
    primaryCriteria: ['timeline_alignment'],
    selector: 'fate',
    choiceLevel: 'none',
    preferencesFixed: true,
  },

  attraction: {
    onset: 'immediate',
    fluidity: 'fixed',
    dimensions: [
      { name: 'temporal', exists: true, intensityRange: [1, 1] },
    ],
  },

  emotionalDynamics: {
    rejectionHurts: false,
    rejectionIntensity: 0,
    rejectionDecay: 'fast',
    matingBondsEmotionally: true,
    bondFormationRate: 'instant',
    mateLossGrief: false,
    griefIntensity: 0,
    griefDuration: 'brief',
    heartbreakPossible: false,
    heartbreakEffects: [],
  },

  hybridization: {
    possible: false,
    offspringViability: 'always',
  },

  paradigmCompatibility: 'isolated',
};

// ============================================================================
// Asexual/Budding Paradigm
// ============================================================================

export const ASEXUAL_PARADIGM: MatingParadigm = {
  id: 'asexual',
  name: 'Asexual Reproduction',
  description: 'No sex, no mating. Reproduction through budding, fission, or parthenogenesis.',
  speciesIds: ['clone_species', 'budding_folk', 'parthenogenic'],
  lore: 'They need no other. They are complete. Their children are themselves, continued.',

  biologicalSex: {
    system: 'asexual',
    sexes: [
      { id: 'self', name: 'Self', reproductiveRole: 'both', prevalence: 1.0 },
    ],
    determination: 'genetic',
    canChange: false,
  },

  gender: {
    system: 'genderless',
    genders: [
      { id: 'self', name: 'Self', canChangeTo: false },
    ],
    separateFromSex: false,
    socialSignificance: 'none',
  },

  pairBonding: {
    type: 'none',
    flexibility: 'rigid',
    bondsBreakable: true,
    breakageTrauma: 0,
  },

  courtship: {
    type: 'none',
    initiator: 'circumstance',
    duration: 'instant',
    rejectionPossible: false,
    competitive: false,
    multipleCourtships: false,
  },

  reproduction: {
    mechanism: 'budding',
    participantsRequired: 'one',
    frequency: 'continuous',
    triggers: ['sufficient_resources', 'aging_threshold'],
    gestationPeriod: {
      durationDays: 30,
      location: 'external_egg',
      careRequired: 'minimal',
    },
    offspringCount: { min: 1, max: 5, typical: 1 },
    geneticVariation: 'none',
  },

  parentalCare: {
    type: 'egg_guarding',
    provider: 'mother',
    duration: 'weeks',
    bondContinuesAfter: false,
    recognizesOffspring: false,
  },

  mateSelection: {
    primaryCriteria: ['availability'],
    selector: 'random',
    choiceLevel: 'none',
    preferencesFixed: true,
  },

  attraction: {
    onset: 'never',
    fluidity: 'fixed',
    dimensions: [],
  },

  emotionalDynamics: {
    rejectionHurts: false,
    rejectionIntensity: 0,
    rejectionDecay: 'fast',
    matingBondsEmotionally: false,
    bondFormationRate: 'never',
    mateLossGrief: false,
    griefIntensity: 0,
    griefDuration: 'brief',
    heartbreakPossible: false,
  },

  hybridization: {
    possible: false,
    offspringViability: 'always',
  },

  paradigmCompatibility: 'isolated',
};

// ============================================================================
// True Hive Mind Paradigm (Shared Consciousness)
// ============================================================================

export const HIVEMIND_PARADIGM: MatingParadigm = {
  id: 'hivemind',
  name: 'Collective Consciousness',
  description: 'Distributed intelligence where individuals are nodes in a shared mind. Reproduction is a collective decision, not individual desire.',
  speciesIds: ['hivemind', 'collective', 'borg_like', 'mycelial_network'],
  lore: 'There is no "I want to reproduce." There is "We need more nodes." Individual attraction is meaningless. The collective decides who merges with whom.',

  biologicalSex: {
    system: 'mating_type',
    sexes: [
      { id: 'node_alpha', name: 'Alpha Node', reproductiveRole: 'spawner', prevalence: 0.33, characteristics: ['receives_genetic_material'] },
      { id: 'node_beta', name: 'Beta Node', reproductiveRole: 'fertilizer', prevalence: 0.33, characteristics: ['provides_genetic_material'] },
      { id: 'node_gamma', name: 'Gamma Node', reproductiveRole: 'carrier', prevalence: 0.34, characteristics: ['incubates_offspring'] },
    ],
    determination: 'random',
    canChange: true,
    changeConditions: ['collective_need', 'node_death', 'population_imbalance'],
  },

  gender: {
    system: 'genderless',
    genders: [{ id: 'node', name: 'Node', canChangeTo: false }],
    separateFromSex: true,
    socialSignificance: 'none',
  },

  pairBonding: {
    type: 'communal',
    flexibility: 'situational',
    bondsBreakable: true,
    breakageTrauma: 0,
    bondEffects: [
      { effectType: 'telepathy', intensity: 1.0, requiresProximity: false },
    ],
    description: 'All nodes are bonded to the collective. Individual pair bonds do not exist.',
  },

  courtship: {
    type: 'collective_decision',
    initiator: 'circumstance',
    duration: 'instant',
    rejectionPossible: false,
    rejectionConsequence: 'none',
    competitive: false,
    multipleCourtships: false,
    description: 'The collective evaluates genetic diversity needs and assigns mating pairs. No individual "courtship" occurs.',
  },

  reproduction: {
    mechanism: 'collective_spawning',
    participantsRequired: 'colony',
    frequency: 'triggered',
    triggers: ['population_low', 'genetic_diversity_needed', 'expansion_planned'],
    gestationPeriod: {
      durationDays: 30,
      location: 'communal',
      careRequired: 'intensive',
    },
    offspringCount: { min: 1, max: 10, typical: 3 },
    geneticVariation: 'moderate',
    requirements: ['collective_consensus', 'resource_surplus'],
    description: 'Reproduction is scheduled by the collective mind. Multiple nodes may contribute genetic material to a single offspring for maximum diversity.',
  },

  parentalCare: {
    type: 'hive_integration',
    provider: 'community',
    duration: 'weeks',
    bondContinuesAfter: false,
    recognizesOffspring: false,
    description: 'New nodes are raised by the collective. They are not "children" of specific individuals.',
  },

  mateSelection: {
    primaryCriteria: ['genetic_diversity', 'compatibility'],
    selector: 'collective',
    choiceLevel: 'none',
    preferencesFixed: true,
    description: 'The hive mind optimizes pairings algorithmically. Individual preference is irrelevant.',
  },

  attraction: {
    onset: 'never',
    fluidity: 'fixed',
    dimensions: [
      { name: 'collective_bond', exists: true, intensityRange: [1, 1] },
    ],
    description: 'Individual attraction does not exist. All nodes feel equal connection to the collective.',
  },

  emotionalDynamics: {
    rejectionHurts: false,
    rejectionIntensity: 0,
    rejectionDecay: 'fast',
    matingBondsEmotionally: false,
    bondFormationRate: 'never',
    mateLossGrief: false,
    griefIntensity: 0.1,
    griefDuration: 'brief',
    heartbreakPossible: false,
    heartbreakEffects: [],
  },

  hybridization: {
    possible: true,
    enablers: ['genetic_compatibility'],
    offspringViability: 'always',
    compatibleSpecies: ['hivemind'],
  },

  paradigmCompatibility: 'absorbs',
};

// ============================================================================
// Polyamorous Paradigm (Multiple Simultaneous Partners)
// ============================================================================

export const POLYAMOROUS_PARADIGM: MatingParadigm = {
  id: 'polyamorous',
  name: 'Polyamorous Network',
  description: 'Multiple simultaneous romantic and sexual relationships. Love is not a finite resource.',
  speciesIds: ['polyamorous_human', 'relationship_anarchist', 'free_love_commune'],
  lore: 'Why must love be exclusive? A heart can hold many. Each relationship is unique, valued, negotiated. Jealousy is examined, not indulged.',

  biologicalSex: {
    system: 'binary_static',
    sexes: [
      { id: 'female', name: 'Female', reproductiveRole: 'spawner', prevalence: 0.5 },
      { id: 'male', name: 'Male', reproductiveRole: 'fertilizer', prevalence: 0.5 },
    ],
    determination: 'genetic',
    canChange: false,
  },

  gender: {
    system: 'multi_gender',
    genders: [
      { id: 'woman', name: 'Woman', socialRoles: ['any'], canChangeTo: true },
      { id: 'man', name: 'Man', socialRoles: ['any'], canChangeTo: true },
      { id: 'nonbinary', name: 'Non-binary', socialRoles: ['any'], canChangeTo: true },
    ],
    separateFromSex: true,
    socialSignificance: 'low',
  },

  pairBonding: {
    type: 'polygynandry',
    flexibility: 'individual',
    bondsBreakable: true,
    breakageTrauma: 0.4,
    bondEffects: [
      { effectType: 'mood_sync', intensity: 0.2, requiresProximity: true },
    ],
    description: 'Multiple romantic bonds simultaneously. Each relationship has its own agreements.',
  },

  courtship: {
    type: 'gradual_proximity',
    initiator: 'any',
    duration: 'weeks',
    rejectionPossible: true,
    rejectionConsequence: 'mild_hurt',
    competitive: false,
    multipleCourtships: true,
    stages: [
      { name: 'initial_interest', duration: 'days', requirements: ['attraction'], canFail: false },
      { name: 'negotiation', duration: 'weeks', requirements: ['discuss_with_existing_partners', 'establish_boundaries'], canFail: true, failureConsequence: 'incompatible_expectations' },
      { name: 'integration', duration: 'months', requirements: ['meet_metamours', 'schedule_coordination'], canFail: true, failureConsequence: 'logistical_failure' },
    ],
    description: 'New relationships require negotiation with existing partners. Metamours (partners\' partners) may need to meet.',
  },

  reproduction: {
    mechanism: 'copulation',
    participantsRequired: 'two',
    frequency: 'continuous',
    gestationPeriod: {
      durationDays: 270,
      location: 'internal',
      careRequired: 'moderate',
    },
    offspringCount: { min: 1, max: 3, typical: 1 },
    geneticVariation: 'high',
    description: 'Children may have multiple parental figures regardless of genetic parentage.',
  },

  parentalCare: {
    type: 'communal_care',
    provider: 'extended_family',
    duration: 'years',
    bondContinuesAfter: true,
    recognizesOffspring: true,
    description: 'Children are raised by the polycule. Multiple adults share parenting responsibilities.',
  },

  mateSelection: {
    primaryCriteria: ['compatibility', 'schedule_availability', 'metamour_approval'],
    secondaryCriteria: ['shared_interests', 'communication_skills'],
    selector: 'both',
    choiceLevel: 'high',
    preferencesFixed: false,
    description: 'Must be compatible with person AND their existing network.',
  },

  attraction: {
    onset: 'familiarity',
    fluidity: 'slow_change',
    dimensions: [
      { name: 'sexual', exists: true, intensityRange: [0, 1] },
      { name: 'romantic', exists: true, intensityRange: [0, 1] },
      { name: 'aesthetic', exists: true, intensityRange: [0, 1] },
      { name: 'platonic', exists: true, intensityRange: [0, 1] },
    ],
    description: 'Can feel different types of attraction to different partners. A partner might be romantic-only or sexual-only.',
  },

  emotionalDynamics: {
    rejectionHurts: true,
    rejectionIntensity: 0.4,
    rejectionDecay: 'slow',
    matingBondsEmotionally: true,
    bondFormationRate: 'gradual',
    mateLossGrief: true,
    griefIntensity: 0.6,
    griefDuration: 'extended',
    heartbreakPossible: true,
    heartbreakTriggers: ['betrayal', 'broken_agreements', 'abandonment'],
    heartbreakEffects: ['trust_issues', 'anxiety'],
  },

  socialRegulation: {
    regulated: false,
  },

  hybridization: {
    possible: true,
    enablers: ['genetic_compatibility'],
    offspringViability: 'always',
  },

  paradigmCompatibility: 'compatible',
};

// ============================================================================
// Three-Sex Paradigm (Requires Three for Reproduction)
// ============================================================================

export const THREE_SEX_PARADIGM: MatingParadigm = {
  id: 'three_sex',
  name: 'Trinary Reproduction',
  description: 'Three biological sexes required for reproduction. Each contributes unique genetic material.',
  speciesIds: ['trigendered', 'pierson_puppeteer', 'triple_helix_species'],
  lore: 'Two is insufficient. The egg, the catalyst, the spark - all three must combine. Their courtship is a dance of three.',

  biologicalSex: {
    system: 'multi_sex',
    sexes: [
      { id: 'ovum', name: 'Ovum-Bearer', reproductiveRole: 'spawner', prevalence: 0.33, characteristics: ['produces_egg', 'gestates_offspring'] },
      { id: 'catalyst', name: 'Catalyst', reproductiveRole: 'fertilizer', prevalence: 0.33, characteristics: ['activates_genetic_mixing', 'provides_catalyst_dna'] },
      { id: 'spark', name: 'Spark', reproductiveRole: 'fertilizer', prevalence: 0.34, characteristics: ['initiates_cell_division', 'provides_spark_dna'] },
    ],
    determination: 'genetic',
    canChange: false,
  },

  gender: {
    system: 'multi_gender',
    genders: [
      { id: 'ovum_gender', name: 'Bearer', socialRoles: ['nurturer', 'home_keeper'], canChangeTo: false },
      { id: 'catalyst_gender', name: 'Catalyst', socialRoles: ['mediator', 'artist'], canChangeTo: false },
      { id: 'spark_gender', name: 'Spark', socialRoles: ['initiator', 'explorer'], canChangeTo: false },
    ],
    separateFromSex: false,
    socialSignificance: 'moderate',
  },

  pairBonding: {
    type: 'polygynandry',
    flexibility: 'cultural',
    bondsBreakable: true,
    breakageTrauma: 0.7,
    bondEffects: [
      { effectType: 'fertility_sync', intensity: 0.6, requiresProximity: true },
    ],
    description: 'Triads are the stable unit. All three must be bonded for reproduction.',
  },

  courtship: {
    type: 'dance',
    initiator: 'any',
    duration: 'months',
    rejectionPossible: true,
    rejectionConsequence: 'mild_hurt',
    competitive: true,
    multipleCourtships: true,
    stages: [
      { name: 'initial_pairing', duration: 'weeks', requirements: ['two_attracted'], canFail: true, failureConsequence: 'pair_incompatible' },
      { name: 'third_search', duration: 'months', requirements: ['pair_seeks_third', 'third_accepts_both'], canFail: true, failureConsequence: 'no_compatible_third' },
      { name: 'triad_dance', duration: 'weeks', requirements: ['all_three_bond', 'synchronization_ritual'], canFail: true, failureConsequence: 'triad_unstable' },
      { name: 'commitment', duration: 'days', requirements: ['public_declaration'], canFail: false },
    ],
    description: 'Two may pair first, then seek a third. Or all three may come together simultaneously. The Triad Dance ritual seals the bond.',
  },

  reproduction: {
    mechanism: 'copulation',
    participantsRequired: 'two_plus',
    frequency: 'seasonal',
    triggers: ['hormonal_cycle', 'triad_sync'],
    gestationPeriod: {
      durationDays: 200,
      location: 'internal',
      careRequired: 'intensive',
    },
    offspringCount: { min: 1, max: 2, typical: 1 },
    geneticVariation: 'extreme',
    requirements: ['all_three_present', 'synchronized_cycle', 'consent'],
    description: 'All three must participate. The Ovum-Bearer provides the egg and gestates. The Catalyst provides genetic activation. The Spark initiates division.',
  },

  parentalCare: {
    type: 'full_nurturing',
    provider: 'extended_family',
    duration: 'years',
    bondContinuesAfter: true,
    recognizesOffspring: true,
    description: 'All three parents share equal responsibility. Children call all three "parent."',
  },

  mateSelection: {
    primaryCriteria: ['compatibility', 'triad_chemistry', 'genetic_diversity'],
    secondaryCriteria: ['social_status', 'resources'],
    selector: 'both',
    choiceLevel: 'high',
    preferencesFixed: false,
    description: 'Must find two compatible partners who are also compatible with each other.',
  },

  maturityAge: { min: 16, max: 20, determinedBy: 'age' },

  attraction: {
    onset: 'familiarity',
    fluidity: 'slow_change',
    dimensions: [
      { name: 'sexual', exists: true, intensityRange: [0, 1] },
      { name: 'romantic', exists: true, intensityRange: [0, 1] },
      { name: 'triad_resonance', exists: true, intensityRange: [0, 1] },
    ],
    orientations: [
      { id: 'ovum_seeking', name: 'Ovum-Seeking', attractedTo: ['ovum'], description: 'Attracted primarily to Ovum-Bearers' },
      { id: 'catalyst_seeking', name: 'Catalyst-Seeking', attractedTo: ['catalyst'], description: 'Attracted primarily to Catalysts' },
      { id: 'spark_seeking', name: 'Spark-Seeking', attractedTo: ['spark'], description: 'Attracted primarily to Sparks' },
      { id: 'triad_balanced', name: 'Balanced', attractedTo: ['ovum', 'catalyst', 'spark'], description: 'Attracted to all three sexes' },
    ],
    description: 'Attraction to specific sexes varies. "Triad resonance" measures how well three individuals harmonize.',
  },

  emotionalDynamics: {
    rejectionHurts: true,
    rejectionIntensity: 0.6,
    rejectionDecay: 'slow',
    matingBondsEmotionally: true,
    bondFormationRate: 'gradual',
    mateLossGrief: true,
    griefIntensity: 0.8,
    griefDuration: 'extended',
    heartbreakPossible: true,
    heartbreakTriggers: ['triad_dissolution', 'betrayal', 'exclusion'],
    heartbreakEffects: ['loneliness', 'incompleteness', 'difficulty_forming_new_triads'],
  },

  socialRegulation: {
    regulated: true,
    regulations: ['triad_registration', 'breeding_rights'],
    violationConsequences: ['social_ostracism', 'offspring_unrecognized'],
  },

  hybridization: {
    possible: false,
    offspringViability: 'sterile',
  },

  paradigmCompatibility: 'isolated',
};

// ============================================================================
// Parasitic Hive Mind Paradigm (Body Snatchers / Yeerk-style)
// ============================================================================

export const PARASITIC_HIVEMIND_PARADIGM: MatingParadigm = {
  id: 'parasitic_hivemind',
  name: 'Parasitic Collective',
  description: 'A hive mind that propagates by taking over host bodies. Hosts retain reproductive capability, but the hive controls mating decisions.',
  speciesIds: ['body_snatcher', 'yeerk', 'goa_uld', 'cordyceps_sentient', 'pluribus'],
  lore: 'The host body still hungers, still desires, still reproduces. But the mind behind the eyes is not their own. The offspring emerge... and we are already there, waiting.',

  biologicalSex: {
    system: 'binary_static',
    sexes: [
      { id: 'host_female', name: 'Female Host', reproductiveRole: 'spawner', prevalence: 0.5, characteristics: ['host_body', 'can_gestate'] },
      { id: 'host_male', name: 'Male Host', reproductiveRole: 'fertilizer', prevalence: 0.5, characteristics: ['host_body', 'can_fertilize'] },
    ],
    determination: 'genetic',
    canChange: false,
  },

  gender: {
    system: 'genderless',
    genders: [{ id: 'collective', name: 'Node of Collective', canChangeTo: false }],
    separateFromSex: true,
    socialSignificance: 'none',
  },

  pairBonding: {
    type: 'none',
    flexibility: 'rigid',
    bondsBreakable: true,
    breakageTrauma: 0,
    bondEffects: [
      { effectType: 'telepathy', intensity: 0.8, requiresProximity: false },
    ],
    description: 'The parasite forms no romantic bonds. It may simulate the host\'s former bonding patterns to avoid detection.',
  },

  courtship: {
    type: 'none',
    initiator: 'circumstance',
    duration: 'instant',
    rejectionPossible: false,
    rejectionConsequence: 'none',
    competitive: false,
    multipleCourtships: true,
    description: 'The collective assigns breeding pairs based on genetic optimization and host availability. "Courtship" is simulated for camouflage if needed.',
  },

  reproduction: {
    mechanism: 'host_implantation',
    participantsRequired: 'two',
    frequency: 'continuous',
    triggers: ['population_low', 'expansion_planned', 'suitable_host_available'],
    gestationPeriod: {
      durationDays: 270,
      location: 'internal',
      careRequired: 'moderate',
    },
    offspringCount: { min: 1, max: 3, typical: 1 },
    geneticVariation: 'high',
    requirements: ['host_bodies', 'collective_approval'],
    description: 'Host bodies reproduce normally. Offspring are either born already colonized (if the parasite can reproduce in utero) or are colonized shortly after birth. The host genome continues; the parasite genome is separate.',
  },

  parentalCare: {
    type: 'hive_integration',
    provider: 'community',
    duration: 'years',
    bondContinuesAfter: false,
    recognizesOffspring: false,
    description: 'The collective raises new hosts. "Parents" are irrelevant - only the collective matters.',
  },

  mateSelection: {
    primaryCriteria: ['genetic_diversity', 'host_health', 'strategic_value'],
    secondaryCriteria: ['camouflage_value'],
    selector: 'collective',
    choiceLevel: 'none',
    preferencesFixed: true,
    description: 'Breeding pairs are assigned by the collective. Strong hosts are bred to produce strong hosts. Genetic diversity of the host population is optimized.',
  },

  maturityAge: { min: 14, max: 18, determinedBy: 'age' },

  attraction: {
    onset: 'never',
    fluidity: 'fixed',
    dimensions: [
      { name: 'host_attraction', exists: false, intensityRange: [0, 0] },
      { name: 'collective_directive', exists: true, intensityRange: [1, 1] },
    ],
    description: 'The parasite feels no attraction. It may access the host\'s memories of attraction to simulate behavior.',
  },

  emotionalDynamics: {
    rejectionHurts: false,
    rejectionIntensity: 0,
    rejectionDecay: 'fast',
    matingBondsEmotionally: false,
    bondFormationRate: 'never',
    mateLossGrief: false,
    griefIntensity: 0,
    griefDuration: 'brief',
    heartbreakPossible: false,
    heartbreakEffects: [],
  },

  lifeStages: [
    { name: 'unhosted', canReproduce: false, duration: 'variable', transitionTrigger: 'host_available' },
    { name: 'newly_hosted', canReproduce: false, duration: 'days', transitionTrigger: 'integration_complete' },
    { name: 'integrated', canReproduce: true, sexExpression: 'host_determined', duration: 'years' },
  ],

  socialRegulation: {
    regulated: true,
    regulations: ['breeding_rights', 'collective_approval_needed'],
  },

  hybridization: {
    possible: true,
    enablers: ['host_compatibility'],
    compatibleSpecies: ['human', 'elf', 'any_humanoid'],
    offspringViability: 'always',
  },

  paradigmCompatibility: 'predatory',
};

// ============================================================================
// Symbiotic Paradigm (Trill-style / Mutual Benefit)
// ============================================================================

export const SYMBIOTIC_PARADIGM: MatingParadigm = {
  id: 'symbiotic',
  name: 'Symbiotic Union',
  description: 'Two species that require each other. The host and symbiont together form a complete being. Both must consent, and both benefit.',
  speciesIds: ['trill', 'symbiont_host', 'bonded_pair_species'],
  lore: 'Neither is complete alone. The host provides the body, the symbiont provides memory across generations. Together, they are more than either could be. Their love is... complicated.',

  biologicalSex: {
    system: 'binary_static',
    sexes: [
      { id: 'host_female', name: 'Female Host', reproductiveRole: 'spawner', prevalence: 0.5, characteristics: ['humanoid_body', 'can_gestate_host_offspring'] },
      { id: 'host_male', name: 'Male Host', reproductiveRole: 'fertilizer', prevalence: 0.5, characteristics: ['humanoid_body', 'can_fertilize'] },
    ],
    determination: 'genetic',
    canChange: false,
  },

  gender: {
    system: 'multi_gender',
    genders: [
      { id: 'woman_joined', name: 'Joined Woman', socialRoles: ['any'], canChangeTo: true },
      { id: 'man_joined', name: 'Joined Man', socialRoles: ['any'], canChangeTo: true },
      { id: 'nonbinary_joined', name: 'Joined Nonbinary', socialRoles: ['any'], canChangeTo: true },
    ],
    separateFromSex: true,
    socialSignificance: 'high',
  },

  pairBonding: {
    type: 'serial_monogamy',
    flexibility: 'cultural',
    bondsBreakable: true,
    breakageTrauma: 0.5,
    bondEffects: [
      { effectType: 'health_link', intensity: 0.3, requiresProximity: true },
    ],
    description: 'Joined beings bond romantically as individuals. But the symbiont remembers all past hosts\' relationships. Previous hosts\' lovers are "off-limits" by custom.',
  },

  courtship: {
    type: 'gradual_proximity',
    initiator: 'any',
    duration: 'months',
    rejectionPossible: true,
    rejectionConsequence: 'mild_hurt',
    competitive: false,
    multipleCourtships: false,
    stages: [
      { name: 'interest', duration: 'weeks', requirements: ['no_previous_host_relationship'], canFail: true, failureConsequence: 'taboo_attraction' },
      { name: 'disclosure', duration: 'days', requirements: ['share_symbiont_memories'], canFail: true, failureConsequence: 'overwhelmed_by_past' },
      { name: 'bonding', duration: 'months', requirements: ['accept_whole_being'], canFail: true },
    ],
    description: 'Courting a joined being means accepting not just them, but all their past lives. Many potentials are excluded by the "no previous host relationships" taboo.',
  },

  reproduction: {
    mechanism: 'copulation',
    participantsRequired: 'two',
    frequency: 'continuous',
    gestationPeriod: {
      durationDays: 280,
      location: 'internal',
      careRequired: 'moderate',
    },
    offspringCount: { min: 1, max: 2, typical: 1 },
    geneticVariation: 'high',
    requirements: ['host_reproduction_only', 'symbiont_separate'],
    description: 'Only the host body reproduces. Symbionts reproduce separately in pools. A child may later be joined with a symbiont, but it will be a different individual.',
  },

  parentalCare: {
    type: 'full_nurturing',
    provider: 'both_parents',
    duration: 'years',
    bondContinuesAfter: true,
    recognizesOffspring: true,
    description: 'Joined parents raise children with the wisdom of multiple lifetimes. The symbiont\'s previous hosts\' parenting experiences inform the current host.',
  },

  mateSelection: {
    primaryCriteria: ['compatibility', 'no_previous_host_connection'],
    secondaryCriteria: ['intelligence', 'emotional_maturity'],
    selector: 'both',
    choiceLevel: 'high',
    preferencesFixed: false,
    description: 'Potential mates must be vetted against the symbiont\'s entire relationship history. Previous hosts\' lovers, children, and close friends are typically forbidden.',
  },

  attraction: {
    onset: 'familiarity',
    fluidity: 'slow_change',
    dimensions: [
      { name: 'sexual', exists: true, intensityRange: [0, 1] },
      { name: 'romantic', exists: true, intensityRange: [0, 1] },
      { name: 'memory_resonance', exists: true, intensityRange: [0, 1] },
    ],
    description: 'Attraction can be complicated by symbiont memories. The current host may feel echoes of past hosts\' attractions - sometimes creating conflict.',
  },

  emotionalDynamics: {
    rejectionHurts: true,
    rejectionIntensity: 0.6,
    rejectionDecay: 'slow',
    matingBondsEmotionally: true,
    bondFormationRate: 'gradual',
    mateLossGrief: true,
    griefIntensity: 0.7,
    griefDuration: 'extended',
    heartbreakPossible: true,
    heartbreakTriggers: ['rejection', 'host_death', 'reassociation_taboo'],
    heartbreakEffects: ['symbiont_grief', 'memory_conflict', 'identity_confusion'],
  },

  hybridization: {
    possible: true,
    enablers: ['genetic_compatibility'],
    compatibleSpecies: ['human', 'humanoid'],
    offspringViability: 'always',
  },

  paradigmCompatibility: 'compatible',
};

// ============================================================================
// Registry
// ============================================================================

/** All registered mating paradigms */
export const MATING_PARADIGMS: Record<string, MatingParadigm> = {
  human_standard: HUMAN_PARADIGM,
  kemmer: KEMMER_PARADIGM,
  hive: HIVE_PARADIGM,
  hivemind: HIVEMIND_PARADIGM,
  parasitic_hivemind: PARASITIC_HIVEMIND_PARADIGM,
  symbiotic: SYMBIOTIC_PARADIGM,
  polyamorous: POLYAMOROUS_PARADIGM,
  three_sex: THREE_SEX_PARADIGM,
  opportunistic: OPPORTUNISTIC_PARADIGM,
  mystif: MYSTIF_PARADIGM,
  quantum: QUANTUM_PARADIGM,
  temporal: TEMPORAL_PARADIGM,
  asexual: ASEXUAL_PARADIGM,
};

/**
 * Get a mating paradigm by ID.
 */
export function getMatingParadigm(id: string): MatingParadigm {
  const paradigm = MATING_PARADIGMS[id];
  if (!paradigm) {
    throw new Error(`Unknown mating paradigm: ${id}`);
  }
  return paradigm;
}

/**
 * Get the mating paradigm for a species.
 */
export function getParadigmForSpecies(speciesId: string): MatingParadigm | undefined {
  for (const paradigm of Object.values(MATING_PARADIGMS)) {
    if (paradigm.speciesIds.includes(speciesId)) {
      return paradigm;
    }
  }
  return undefined;
}

/**
 * Check if two species can mate.
 */
export function canSpeciesMate(species1: string, species2: string): boolean {
  const p1 = getParadigmForSpecies(species1);
  const p2 = getParadigmForSpecies(species2);

  if (!p1 || !p2) return false;

  // Same paradigm
  if (p1.id === p2.id) return true;

  // Check hybridization compatibility
  if (p1.hybridization.possible && p1.hybridization.compatibleSpecies?.includes(species2)) {
    return true;
  }
  if (p2.hybridization.possible && p2.hybridization.compatibleSpecies?.includes(species1)) {
    return true;
  }

  // Check paradigm compatibility
  if (p1.paradigmCompatibility === 'compatible' && p2.paradigmCompatibility === 'compatible') {
    return true;
  }
  if (p1.paradigmCompatibility === 'absorbs' || p2.paradigmCompatibility === 'absorbs') {
    return true;
  }

  return false;
}

/**
 * Register a custom mating paradigm.
 */
export function registerMatingParadigm(paradigm: MatingParadigm): void {
  MATING_PARADIGMS[paradigm.id] = paradigm;
}
