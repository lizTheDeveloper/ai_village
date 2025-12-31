/**
 * Natural Disasters
 *
 * Ways planets try to kill inhabitants.
 * Because nature gets creative with violence.
 */

export interface NaturalDisaster {
  name: string;
  warningSign: string;
  primaryDanger: string;
  secondaryEffects: string[];
  survivalStrategy: string;
  flavorText: string;
}

export const NATURAL_DISASTERS: Record<string, NaturalDisaster> = {
  'standard_tornado': {
    name: 'Cyclonic Vortex',
    warningSign: 'Pressure drop, green sky, rotating clouds',
    primaryDanger: 'Extreme winds, debris',
    secondaryEffects: ['Structural damage', 'Projectile hazards'],
    survivalStrategy: 'Underground shelter, central room',
    flavorText: 'Wind rotates. Violently. Destroys things. Earth-standard disaster. Straightforward.',
  },
  'crystal_earthquake': {
    name: 'Resonance Quake',
    warningSign: 'Harmonic vibrations, crystal formations ringing',
    primaryDanger: 'Shattering crystals become shrapnel',
    secondaryEffects: ['Sonic damage', 'Crystal dust clouds', 'Hearing loss'],
    survivalStrategy: 'Avoid crystal structures, ear protection',
    flavorText: 'Ground vibrates. Crystals resonate. Everything shatters. Musical apocalypse. Sharp apocalypse.',
  },
  'gravity_storm': {
    name: 'Gravitational Anomaly',
    warningSign: 'Objects floating, then falling, unpredictably',
    primaryDanger: 'Random gravity direction changes',
    secondaryEffects: ['Nausea', 'Structural stress', 'Orbital debris'],
    survivalStrategy: 'Secure everything, safety harness',
    flavorText: 'Gravity confused. Up becomes down. Down becomes sideways. Physics negotiable. Survival difficult.',
  },
  'time_storm': {
    name: 'Temporal Distortion',
    warningSign: 'Clocks disagree, déjà vu increases',
    primaryDanger: 'Accelerated aging in affected zones',
    secondaryEffects: ['Memory loops', 'Causality violations', 'Paradoxes'],
    survivalStrategy: 'Leave area. Quickly. Before was.',
    flavorText: 'Time breaks. Flows wrong. Past and future mix. Age decades. Or de-age. Causality suggestions.',
  },
  'reality_fracture': {
    name: 'Dimensional Tear',
    warningSign: 'Physics stops working properly',
    primaryDanger: 'Things stop existing, or exist too much',
    secondaryEffects: ['Existential crisis', 'Matter instability', 'Consciousness fragmentation'],
    survivalStrategy: 'No known strategy. Pray. Philosophically.',
    flavorText: 'Reality cracks. Things leak through. Other things leak out. Existence negotiable. Terror absolute.',
  },
  'swarm_migration': {
    name: 'Living Cloud',
    warningSign: 'Sky darkens with billions of organisms',
    primaryDanger: 'Consumption of all organic matter',
    secondaryEffects: ['Suffocation', 'Total defoliation', 'Starvation after'],
    survivalStrategy: 'Sealed shelter, wait it out',
    flavorText: 'Swarm arrives. Eats everything. Organic everything. Leaves bones. Moves on. Circle of life. Aggressive.',
  },
  'magnetic_reversal': {
    name: 'Polarity Flip',
    warningSign: 'Compasses spinning, aurora at wrong latitude',
    primaryDanger: 'Electromagnetic chaos',
    secondaryEffects: ['Electronics failure', 'Radiation exposure', 'Navigation loss'],
    survivalStrategy: 'Faraday cage, manual navigation',
    flavorText: 'Magnetic field flips. North becomes south. Technology dies. Migration patterns confused. Chaos.',
  },
  'probability_collapse': {
    name: 'Certainty Failure',
    warningSign: 'Unlikely events cluster',
    primaryDanger: 'Improbable things become common',
    secondaryEffects: ['Logic fails', 'Coincidences multiply', 'Causality optional'],
    survivalStrategy: 'Expect unexpected. Assume nothing.',
    flavorText: 'Probability breaks. Impossible events occur. Dice always critical. Luck irrelevant. Chaos reigns.',
  },
  'plasma_flood': {
    name: 'Ionized Deluge',
    warningSign: 'Sky glows, temperature spikes',
    primaryDanger: 'Superheated ionized gas flow',
    secondaryEffects: ['Vaporization', 'Electromagnetic pulse', 'Atmosphere loss'],
    survivalStrategy: 'Deep underground, heat shielding',
    flavorText: 'Plasma flows. Like water. Floods valleys. Vaporizes everything. Glow visible from orbit.',
  },
  'void_eruption': {
    name: 'Emptiness Outburst',
    warningSign: 'Matter disappearing, holes forming',
    primaryDanger: 'Spreading voids consume matter',
    secondaryEffects: ['Reality thinning', 'Existence uncertainty', 'Mass disappearance'],
    survivalStrategy: 'Flee. Fast. Don\'t look back.',
    flavorText: 'Void erupts. Nothing spreads. Consumes everything. Matter disappears. Emptiness grows. Run.',
  },
  'crystal_bloom': {
    name: 'Rapid Crystallization',
    warningSign: 'Surfaces frosting with crystals',
    primaryDanger: 'Everything becomes crystal',
    secondaryEffects: ['Transformation', 'Brittleness', 'Shattering'],
    survivalStrategy: 'Stay mobile, don\'t touch infected areas',
    flavorText: 'Crystals grow. Fast. Everything crystallizes. Beautiful. Deadly. Permanent. Shatters easy.',
  },
  'thought_plague': {
    name: 'Memetic Storm',
    warningSign: 'Shared thoughts, loss of mental privacy',
    primaryDanger: 'Mind contamination, thought parasites',
    secondaryEffects: ['Identity loss', 'Hive mind formation', 'Insanity'],
    survivalStrategy: 'Sensory deprivation, meditation',
    flavorText: 'Thoughts spread. Like disease. Everyone thinks same. Identity fades. Minds merge. Individual lost.',
  },
  'pressure_wave': {
    name: 'Compression Tsunami',
    warningSign: 'Barometric pressure oscillating wildly',
    primaryDanger: 'Crushing atmospheric pressure waves',
    secondaryEffects: ['Structural collapse', 'Internal injuries', 'Deafness'],
    survivalStrategy: 'Pressure-equalized chamber',
    flavorText: 'Pressure waves. Crushing force. Then vacuum. Alternating. Structures fail. Bodies rupture.',
  },
  'light_storm': {
    name: 'Radiation Burst',
    warningSign: 'Increasing brightness, radiation meters spike',
    primaryDanger: 'Lethal radiation exposure',
    secondaryEffects: ['Burns', 'Cancer', 'Genetic damage'],
    survivalStrategy: 'Lead shielding, deep shelter',
    flavorText: 'Light intensifies. Radiation everywhere. Burns instant. Death delayed. Hide deep.',
  },
  'entropy_wave': {
    name: 'Decay Acceleration',
    warningSign: 'Things aging rapidly, decay speeding up',
    primaryDanger: 'Accelerated entropy',
    secondaryEffects: ['Rapid aging', 'Material failure', 'Heat death'],
    survivalStrategy: 'Stasis fields, if available',
    flavorText: 'Everything ages. Fast. Decay accelerates. Order becomes chaos. Entropy wins. Quickly.',
  },
  'memory_flood': {
    name: 'Psychic Deluge',
    warningSign: 'Overwhelming déjà vu, foreign memories',
    primaryDanger: 'Memory overload, identity loss',
    secondaryEffects: ['Confusion', 'False memories', 'Personality changes'],
    survivalStrategy: 'Focus on self, reject foreign memories',
    flavorText: 'Memories flood. Not yours. Thousands of lives. All at once. Who are you? Unclear.',
  },
  'phase_quake': {
    name: 'Reality Shift',
    warningSign: 'Objects flickering, matter unstable',
    primaryDanger: 'Random phase shifts, matter instability',
    secondaryEffects: ['Falling through floors', 'Trapped in walls', 'Molecular dissolution'],
    survivalStrategy: 'Stay still, hope for stability',
    flavorText: 'Matter phases. Solid becomes intangible. Floor disappears. Walls trap. Reality unstable.',
  },
  'sound_tsunami': {
    name: 'Acoustic Catastrophe',
    warningSign: 'Building harmonic resonance',
    primaryDanger: 'Destructive sound frequencies',
    secondaryEffects: ['Shattering', 'Internal organ damage', 'Deafness'],
    survivalStrategy: 'Soundproof shelter, ear protection',
    flavorText: 'Sound wave. Wall of noise. Shatters everything. Organs rupture. Structures collapse. Silence dies.',
  },
  'dimensional_storm': {
    name: 'Multiverse Breach',
    warningSign: 'Impossible things appearing',
    primaryDanger: 'Reality merging with parallel dimensions',
    secondaryEffects: ['Paradoxes', 'Duplicate entities', 'Physics failures'],
    survivalStrategy: 'Avoid alternate selves, don\'t interact',
    flavorText: 'Dimensions merge. Other realities visible. Alternate yous. Paradoxes form. Physics screams.',
  },
  'emotion_storm': {
    name: 'Psychic Hurricane',
    warningSign: 'Mass emotional synchronization',
    primaryDanger: 'Overwhelming emotional radiation',
    secondaryEffects: ['Mood contagion', 'Violence', 'Mass hysteria'],
    survivalStrategy: 'Emotional suppression, isolation',
    flavorText: 'Emotions amplify. Spread. Everyone feels same. Anger becomes rage. Fear becomes terror. Contagious.',
  },
  'vacuum_burst': {
    name: 'Atmospheric Failure',
    warningSign: 'Pressure dropping rapidly',
    primaryDanger: 'Sudden vacuum exposure',
    secondaryEffects: ['Suffocation', 'Decompression', 'Boiling blood'],
    survivalStrategy: 'Pressurized shelter, oxygen supply',
    flavorText: 'Air disappears. Vacuum spreads. Lungs empty. Blood boils. Seal everything. Fast.',
  },
  'crystal_rain_earthquake': {
    name: 'Dual Catastrophe',
    warningSign: 'Ground shaking, sky darkening with crystals',
    primaryDanger: 'Simultaneous quake and lethal hail',
    secondaryEffects: ['Nowhere safe', 'Total devastation', 'Mass casualties'],
    survivalStrategy: 'Reinforced underground shelter',
    flavorText: 'Ground shakes. Crystals fall. Deadly combo. Inside crushed. Outside impaled. Nowhere safe.',
  },
  'data_corruption': {
    name: 'Information Plague',
    warningSign: 'Digital systems failing, data randomizing',
    primaryDanger: 'Cascading information loss',
    secondaryEffects: ['Communication failure', 'Navigation loss', 'Memory corruption'],
    survivalStrategy: 'Analog systems, manual records',
    flavorText: 'Data corrupts. Spreads. Everything digital fails. Information lost. Memory uncertain. Write everything. Paper.',
  },
  'quantum_storm': {
    name: 'Superposition Catastrophe',
    warningSign: 'Everything existing in multiple states',
    primaryDanger: 'Probabilistic reality collapse',
    secondaryEffects: ['Uncertainty', 'Multiple outcomes', 'Paradoxes'],
    survivalStrategy: 'Don\'t observe. Don\'t collapse. Maybe.',
    flavorText: 'Quantum effects macro. Everything uncertain. Alive and dead. Here and there. Don\'t look.',
  },
  'solar_flare_direct': {
    name: 'Star Fury',
    warningSign: 'Solar activity spiking, aurora everywhere',
    primaryDanger: 'Direct solar plasma impact',
    secondaryEffects: ['Radiation', 'EMP', 'Atmosphere stripping'],
    survivalStrategy: 'Deep underground, electromagnetic shielding',
    flavorText: 'Sun angry. Flare direct. Plasma hits. Radiation lethal. Electronics dead. Deep shelter only hope.',
  },
};
