/**
 * Creature Body Plans
 *
 * The fundamental physical architecture of alien creatures.
 * Because bilateral symmetry is just one option among infinite possibilities.
 */

export interface BodyPlan {
  name: string;
  symmetry: string;
  limbCount: string;
  advantages: string[];
  disadvantages: string[];
  flavorText: string;
}

export const BODY_PLANS: Record<string, BodyPlan> = {
  'bilateral_standard': {
    name: 'Bilateral Symmetry',
    symmetry: 'bilateral',
    limbCount: 'Usually 4-6 limbs',
    advantages: ['Directional movement', 'Proven design', 'Tool use possible'],
    disadvantages: ['Predictable', 'Boring', 'Like Earth animals'],
    flavorText: 'Left side mirrors right. Front differs from back. Works. Unoriginal but functional.',
  },
  'radial_symmetry': {
    name: 'Radial Plan',
    symmetry: 'radial',
    limbCount: '5-12 radiating from center',
    advantages: ['No vulnerable back', 'Omnidirectional sensing', 'Starfish approval'],
    disadvantages: ['No clear front', 'Directional movement awkward', 'Doorways difficult'],
    flavorText: 'All sides equal. No front. No back. Every direction forward. Or backward. Both.',
  },
  'colonial_swarm': {
    name: 'Colonial Swarm',
    symmetry: 'asymmetric',
    limbCount: 'Thousands of tiny units',
    advantages: ['Distributed intelligence', 'Hard to kill completely', 'Shape-shifting'],
    disadvantages: ['Individual vulnerability', 'Coordination required', 'Existential confusion'],
    flavorText: 'One creature or thousands? Yes. No. Both. Depends who counts. How count.',
  },
  'serpentine_elongated': {
    name: 'Elongated Serpentine',
    symmetry: 'bilateral',
    limbCount: 'Zero to hundreds of small limbs',
    advantages: ['Flexibility', 'Burrowing excellent', 'Squeezing through gaps'],
    disadvantages: ['No arms', 'Tool use difficult', 'Socks impossible'],
    flavorText: 'Long. Very long. All body. Little else. Slithers. Coils. Works surprisingly well.',
  },
  'spherical_core': {
    name: 'Spherical Core',
    symmetry: 'perfect sphere',
    limbCount: 'Limbs optional, usually retractable',
    advantages: ['Rollabl', 'Defensive ball form', 'Even weight distribution'],
    disadvantages: ['Direction control challenging', 'Getting stuck in corners', 'Bowling jokes'],
    flavorText: 'Ball-shaped. Rolls. Sometimes on purpose. Physics simplified. Life complicated.',
  },
  'fractal_branching': {
    name: 'Fractal Structure',
    symmetry: 'fractal',
    limbCount: 'Limbs branch infinitely at smaller scales',
    advantages: ['Maximum surface area', 'Fine manipulation', 'Mathematically beautiful'],
    disadvantages: ['Getting tangled', 'Complexity management', 'Showing off'],
    flavorText: 'Branches branch branches. Pattern repeats. Forever smaller. Infinite detail. Mathematicians aroused.',
  },
  'modular_segments': {
    name: 'Modular Segments',
    symmetry: 'bilateral',
    limbCount: 'Varies - segments add/remove as needed',
    advantages: ['Reconfigurable', 'Regeneration easy', 'Size adjustable'],
    disadvantages: ['Segment coordination', 'Identity unclear', 'Which part is me?'],
    flavorText: 'Segments connect. Disconnect. Reconnect differently. Body Lego. Self-assembly required.',
  },
  'energy_being': {
    name: 'Pure Energy Form',
    symmetry: 'none - energy field',
    limbCount: 'Manifests pseudopods as needed',
    advantages: ['No physical vulnerability', 'Shape-shifting', 'Passes through matter'],
    disadvantages: ['Containment difficult', 'Touching things hard', 'Existential questions'],
    flavorText: 'Not matter. Energy. Conscious energy. Form optional. Substance questionable. Alive definitely.',
  },
  'crystalline_lattice': {
    name: 'Crystal Structure',
    symmetry: 'geometric',
    limbCount: 'Geometrically perfect appendages',
    advantages: ['Structural perfection', 'Beautiful', 'Mineral-based durability'],
    disadvantages: ['Brittle', 'Slow movement', 'Shatters dramatically'],
    flavorText: 'Living crystal. Perfect geometry. Sharp edges. Beautiful. Fragile. Science confused.',
  },
  'blob_form': {
    name: 'Amorphous Blob',
    symmetry: 'none',
    limbCount: 'Pseudopods as needed',
    advantages: ['Ultimate flexibility', 'Fits any space', 'Hard to damage'],
    disadvantages: ['No structure', 'Aesthetically challenging', 'Oozes everywhere'],
    flavorText: 'Blob. Shapeless. Flows. Spreads. Oozes. Form is option. Chooses formless.',
  },
  'quad_core': {
    name: 'Four-Fold Symmetry',
    symmetry: 'four-way radial',
    limbCount: 'Four of everything',
    advantages: ['Redundancy', 'No single weak direction', 'Balanced'],
    disadvantages: ['Complex coordination', 'Four times the maintenance', 'Shoe shopping'],
    flavorText: 'Four directions. Four limbs per. Everything four. Balanced. Redundant. Excessive.',
  },
  'vertical_tower': {
    name: 'Vertical Column',
    symmetry: 'radial around vertical axis',
    limbCount: 'Rings of limbs at different heights',
    advantages: ['Height advantage', 'Multi-level operation', 'Impressive stature'],
    disadvantages: ['Top-heavy', 'Falls dramatically', 'Ceiling clearance'],
    flavorText: 'Tall. Very tall. Vertical. Limbs at levels. Sees far. Falls far. Both.',
  },
  'flat_plane': {
    name: 'Two-Dimensional Form',
    symmetry: 'bilateral but flat',
    limbCount: 'Fringe of cilia around edge',
    advantages: ['Slides under things', 'Large surface area', 'Aerodynamic'],
    disadvantages: ['Paper-thin', 'Easy to tear', 'Depth perception zero'],
    flavorText: 'Flat. Extremely flat. Nearly 2D. Slides everywhere. Depth optional. Physics concerned.',
  },
  'nested_spheres': {
    name: 'Concentric Layers',
    symmetry: 'spherical',
    limbCount: 'Each layer has appendages',
    advantages: ['Protected core', 'Layered defense', 'Onion-like'],
    disadvantages: ['Outer layers expendable', 'Complex coordination', 'Peeling'],
    flavorText: 'Sphere in sphere in sphere. Layers. Many layers. Core protected. Outermost sacrificial.',
  },
  'wheel_form': {
    name: 'Wheeled Structure',
    symmetry: 'axial',
    limbCount: 'Spokes radiating from hub',
    advantages: ['Rolls efficiently', 'Directional speed', 'Unique locomotion'],
    disadvantages: ['Terrain limited', 'Stairs impossible', 'Spoke vulnerability'],
    flavorText: 'Wheel-shaped. Rolls. Actually rolls. Evolution invented wheel. Engineers jealous.',
  },
  'inverse_skeleton': {
    name: 'Exoskeleton Extreme',
    symmetry: 'bilateral',
    limbCount: 'Variable',
    advantages: ['Armor everywhere', 'Structural support', 'Intimidating'],
    disadvantages: ['Heavy', 'Molting required', 'Cannot hide'],
    flavorText: 'Skeleton outside. Armor plated. Heavy. Protective. Molting awkward. Growth complicated.',
  },
  'gas_bag': {
    name: 'Inflated Gasbag',
    symmetry: 'roughly spherical',
    limbCount: 'Dangling tendrils below',
    advantages: ['Buoyant', 'Floats naturally', 'Energy-efficient travel'],
    disadvantages: ['Wind-dependent', 'Popping risk', 'Helium voice'],
    flavorText: 'Inflated. Floats. Drifts. Light. Delicate. One pop away from falling. Graceful. Nervous.',
  },
  'tentacle_mass': {
    name: 'All-Tentacle Form',
    symmetry: 'radial',
    limbCount: 'Dozens to hundreds of tentacles',
    advantages: ['Grasping everything', 'Multi-tasking champion', 'No weak angles'],
    disadvantages: ['Tangling constant', 'Coordination nightmare', 'Tentacle jokes'],
    flavorText: 'Tentacles. Only tentacles. Everywhere tentacles. Grasps all. Tangles often. Lovecraft approved.',
  },
  'hollow_shell': {
    name: 'Shell Dweller',
    symmetry: 'asymmetric',
    limbCount: 'Soft body inside, few appendages outside',
    advantages: ['Protected core', 'Portable shelter', 'Hard exterior'],
    disadvantages: ['Heavy to carry', 'Mobility limited', 'Hermit comparison'],
    flavorText: 'Lives in shell. Carries everywhere. Home and body. Combined. Heavy. Safe. Slow.',
  },
  'mist_form': {
    name: 'Gaseous Being',
    symmetry: 'none',
    limbCount: 'Condenses temporary structures',
    advantages: ['Passes through gaps', 'Hard to contain', 'Dispersal defense'],
    disadvantages: ['Wind vulnerable', 'Cohesion difficult', 'Substance questionable'],
    flavorText: 'Mist. Conscious mist. Condenses to act. Disperses to flee. Matter optional.',
  },
};
