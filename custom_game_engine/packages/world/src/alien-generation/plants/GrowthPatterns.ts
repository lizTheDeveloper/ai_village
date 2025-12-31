/**
 * Plant Growth Pattern Library
 *
 * How alien plants structure themselves in space.
 * Mix and match with other components for infinite variety.
 */

export interface GrowthPattern {
  name: string;
  structure: string;
  advantages: string[];
  disadvantages: string[];
  flavorText: string;
}

export const GROWTH_PATTERNS: Record<string, GrowthPattern> = {
  'vertical_tower': {
    name: 'Vertical Tower',
    structure: 'Single tall stem reaching skyward, minimal branching',
    advantages: ['Maximum sunlight capture', 'Minimal ground footprint', 'Impressive to look at'],
    disadvantages: ['Wind vulnerability', 'Single point of failure', 'Topples dramatically when it fails'],
    flavorText: 'Reaches for the sky. Falls like a tree. Because it is a tree. Tall tree.',
  },
  'radial_sprawl': {
    name: 'Radial Sprawl',
    structure: 'Spreads horizontally from central point, claiming territory',
    advantages: ['Maximum territory control', 'Redundant growth points', 'Difficult to eradicate completely'],
    disadvantages: ['Slow vertical growth', 'Vulnerable to trampling', 'Neighbors hate it'],
    flavorText: 'The botanical equivalent of urban sprawl. Less organized. More roots.',
  },
  'vine_climber': {
    name: 'Parasitic Climber',
    structure: 'Uses other plants as scaffolding, minimal self-support',
    advantages: ['Energy-efficient', 'Access to canopy', 'Lets others do the hard work'],
    disadvantages: ['Needs host plant', 'Host might object', 'Freeloading accusations'],
    flavorText: 'Why grow strong when neighbors exist? Evolutionary genius or botanical laziness. Both.',
  },
  'mat_former': {
    name: 'Ground Mat',
    structure: 'Dense horizontal network, smothers competition',
    advantages: ['Excellent ground cover', 'Prevents erosion', 'Monopolizes nutrients'],
    disadvantages: ['Limited height', 'Vulnerable to herbivores', 'Basically plant carpet'],
    flavorText: 'Covers ground thoroughly. Discourages walking. Nature\'s welcome mat. Unwelcoming.',
  },
  'colonial_cluster': {
    name: 'Colonial Cluster',
    structure: 'Multiple connected individuals, shares resources underground',
    advantages: ['Resource sharing', 'Distributed risk', 'Strength in numbers'],
    disadvantages: ['One disease affects all', 'Hard to tell where one plant ends', 'Identity crisis'],
    flavorText: 'Individual plants or collective consciousness? Question remains philosophical. Also botanical.',
  },
  'spiral_helix': {
    name: 'Spiral Helix',
    structure: 'Grows in helical pattern, maximum surface area per height',
    advantages: ['Efficient light capture', 'Structural integrity', 'Mathematically beautiful'],
    disadvantages: ['Complex growth programming', 'Confusing to herbivores', 'Also confusing to botanists'],
    flavorText: 'Evolution discovered the golden ratio. Uses it aggressively. Beauty is survival.',
  },
  'fractal_branching': {
    name: 'Fractal Branching',
    structure: 'Self-similar branching at multiple scales, mathematically optimal',
    advantages: ['Maximum surface area', 'Redundant pathways', 'Makes mathematicians happy'],
    disadvantages: ['Computationally expensive', 'Resource-intensive', 'Showing off'],
    flavorText: 'Branches have branches. Those branches branch. Pattern continues. Math approves.',
  },
  'fungal_network': {
    name: 'Mycelial Network',
    structure: 'Underground threadwork, fruiting bodies emerge seasonally',
    advantages: ['Vast underground presence', 'Difficult to kill completely', 'Can be miles wide'],
    disadvantages: ['Mostly invisible', 'Vulnerable to soil conditions', 'Hard to impress dates'],
    flavorText: 'Largest organism type on Earth. By mass. By area. Not by visibility. Or respect.',
  },
  'crystalline_array': {
    name: 'Crystalline Array',
    structure: 'Geometric growth following crystal patterns, silicon-based',
    advantages: ['Structural perfection', 'Heat resistance', 'Mineral storage'],
    disadvantages: ['Slow growth', 'Brittle', 'Technically not organic'],
    flavorText: 'Plant or mineral? Debate ongoing. It grows. That\'s plant-like. Technically.',
  },
  'blob_expansion': {
    name: 'Amoeboid Blob',
    structure: 'Shapeless mass that flows and expands in all directions',
    advantages: ['Ultimate flexibility', 'No weak points', 'Fills any space'],
    disadvantages: ['No structure', 'Easily divided', 'Aesthetically concerning'],
    flavorText: 'Shape optional. Form negotiable. Boundaries suggested. Not plant. Not not plant.',
  },
  'ring_growth': {
    name: 'Concentric Rings',
    structure: 'Grows in expanding circles, new ring each season',
    advantages: ['Age visible', 'Stable expansion', 'History preserved'],
    disadvantages: ['Predictable', 'Space-inefficient', 'Announces age to all'],
    flavorText: 'Each ring tells story. Every year recorded. Tree remembers. Whether it wants to or not.',
  },
  'modular_pods': {
    name: 'Modular Pod System',
    structure: 'Independent growth pods, connect and disconnect as needed',
    advantages: ['Reconfigurable', 'Distributed intelligence', 'Redundancy extreme'],
    disadvantages: ['Coordination complex', 'Identity unclear', 'Which pod is main?'],
    flavorText: 'Pods think independently. Act collectively. Sometimes. When they agree. Rarely agree.',
  },
  'reverse_pyramid': {
    name: 'Inverted Pyramid',
    structure: 'Narrow base, wide canopy - defies conventional stability',
    advantages: ['Maximum canopy spread', 'Impressive', 'Architecturally bold'],
    disadvantages: ['Obviously unstable', 'Falls over eventually', 'Physics disapproves'],
    flavorText: 'Top-heavy by design. Falls dramatically. Evolutionary mistake or genius? Both.',
  },
  'tendril_web': {
    name: 'Tendril Web Network',
    structure: 'Countless thin tendrils create living net',
    advantages: ['Flexible', 'Repairs easily', 'Catches things'],
    disadvantages: ['Individually weak', 'Tangled constantly', 'Catches unwanted things too'],
    flavorText: 'Web of life. Literal web. Things stick. Including botanists. Awkward.',
  },
  'hollow_sphere': {
    name: 'Hollow Sphere',
    structure: 'Grows as empty ball, photosynthesizes on all surfaces',
    advantages: ['Interior space', 'Omnidirectional light capture', 'Unique'],
    disadvantages: ['Structurally questionable', 'Interior rots sometimes', 'Hard to explain'],
    flavorText: 'Ball of plant. Hollow center. Why hollow? Unknown. Nature mysterious. Unhelpful.',
  },
  'layered_canopy': {
    name: 'Multi-Layer Canopy',
    structure: 'Multiple horizontal layers at different heights',
    advantages: ['Light capture at all levels', 'Habitat diversity', 'Vertical efficiency'],
    disadvantages: ['Lower layers shadowed', 'Complex coordination', 'Top-heavy'],
    flavorText: 'Apartment building approach. Many floors. Some nicer than others. Bottom floor dark.',
  },
  'walking_roots': {
    name: 'Ambulatory Root System',
    structure: 'Roots that can slowly relocate plant to better conditions',
    advantages: ['Mobility', 'Resource seeking', 'Drought avoidance'],
    disadvantages: ['Slow movement', 'Energy intensive', 'Freaks out observers'],
    flavorText: 'Plant walks. Slowly. Very slowly. Still walks. Trees mobile. Forest migrates.',
  },
  'suspended_growth': {
    name: 'Aerial Suspension',
    structure: 'Grows suspended in air, no ground contact',
    advantages: ['No ground competition', 'Unique niche', 'Impressive magic trick'],
    disadvantages: ['How though?', 'Violates expectations', 'Difficult to explain'],
    flavorText: 'Floats. Just floats. No visible support. Physics confused. Botanists give up.',
  },
  'geometric_lattice': {
    name: 'Geometric Lattice',
    structure: 'Grows in perfect geometric shapes, like living architecture',
    advantages: ['Structural efficiency', 'Beautiful', 'Architects jealous'],
    disadvantages: ['Rigid growth', 'Cannot adapt to obstacles', 'Too perfect'],
    flavorText: 'Nature builds geometry. Perfect angles. Clean lines. More organized than architects.',
  },
  'pulse_expansion': {
    name: 'Rhythmic Pulse Growth',
    structure: 'Expands and contracts rhythmically like breathing',
    advantages: ['Active circulation', 'Rhythmic nutrient distribution', 'Mesmerizing'],
    disadvantages: ['Constant motion', 'Energy intensive', 'Unsettling to watch'],
    flavorText: 'Plant breathes. Visibly. Expands. Contracts. Alive obviously. Too obviously.',
  },
};
