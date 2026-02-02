/**
 * Plant Appearance Patterns
 *
 * Visual characteristics and aesthetic properties of alien plants.
 * Because even plants deserve to look fabulous.
 */

export interface AppearancePattern {
  name: string;
  coloration: string;
  texture: string;
  distinctive_features: string[];
  aesthetic_vibe: string;
  flavorText: string;
}

export const APPEARANCE_PATTERNS: Record<string, AppearancePattern> = {
  'bioluminescent_glow': {
    name: 'Bioluminescent',
    coloration: 'Soft internal glow in blues, greens, or purples',
    texture: 'Translucent tissues revealing inner light',
    distinctive_features: ['Pulsing light', 'Glow increases at night', 'Light attracts insects'],
    aesthetic_vibe: 'Ethereal forest fairy lights',
    flavorText: 'Glows softly. Night gardens illuminate. Moths confused. Fairies jealous. Beautiful.',
  },
  'crystalline_structure': {
    name: 'Crystal Growth',
    coloration: 'Prismatic, refracts light into rainbows',
    texture: 'Hard, faceted surfaces like gemstones',
    distinctive_features: ['Musical when wind blows', 'Fractures into smaller crystals', 'Sparkles constantly'],
    aesthetic_vibe: 'Living jewelry, mineral garden',
    flavorText: 'Part plant, part gem. Sparkles. Refracts. Sings in wind. Expensive looking. Worthless. Pretty.',
  },
  'metallic_sheen': {
    name: 'Metallic Luster',
    coloration: 'Silver, gold, copper, or bronze tones',
    texture: 'Smooth, reflective like polished metal',
    distinctive_features: ['Mirror-like leaves', 'Conducts electricity', 'Rust-resistant'],
    aesthetic_vibe: 'Steampunk garden, mechanical nature',
    flavorText: 'Looks metal. Is plant. Confuses everyone. Reflects surroundings. Dramatic. Impractical.',
  },
  'color_shifting': {
    name: 'Chromatic Flux',
    coloration: 'Constantly shifting through spectrum',
    texture: 'Iridescent, changes with viewing angle',
    distinctive_features: ['Never same color twice', 'Responds to touch', 'Mood ring effect'],
    aesthetic_vibe: 'Living mood lighting, psychedelic',
    flavorText: 'Changes color. Always. Every second. Every angle. Never boring. Exhausting to describe.',
  },
  'void_black': {
    name: 'Absolute Darkness',
    coloration: 'So dark it absorbs all light, pure black',
    texture: 'Matte, seems to consume light around it',
    distinctive_features: ['Casts no shadow', 'Hard to see depth', 'Unsettling to look at'],
    aesthetic_vibe: 'Cosmic horror, void made botanical',
    flavorText: 'Black. Not dark. Black. Light dies here. Edges hard to see. Shape uncertain. Creepy.',
  },
  'transparent_glass': {
    name: 'Glass-Like Clarity',
    coloration: 'Completely transparent with faint tints',
    texture: 'Smooth, clear like glass or crystal',
    distinctive_features: ['Internal structures visible', 'Magnifies light', 'Fragile appearance'],
    aesthetic_vibe: 'Scientific specimen, natural laboratory',
    flavorText: 'See through. Completely. Watch nutrients flow. Watch cells divide. Biology exposed.',
  },
  'fractal_complexity': {
    name: 'Infinite Detail',
    coloration: 'Complex patterns repeat at every scale',
    texture: 'Endlessly detailed, more detail the closer you look',
    distinctive_features: ['Self-similar at all scales', 'Hypnotic patterns', 'Mathematically perfect'],
    aesthetic_vibe: 'Mathematical art, natural geometry',
    flavorText: 'Look closer. More detail. Closer still. More. Forever. Never ends. Mathematicians weep.',
  },
  'bony_skeletal': {
    name: 'Skeletal Framework',
    coloration: 'Bone white, ivory, or pale gray',
    texture: 'Hard, ridged like bones or antlers',
    distinctive_features: ['Appears dead but alive', 'Branching like antlers', 'Hollow sounds'],
    aesthetic_vibe: 'Halloween decoration, gothic garden',
    flavorText: 'Looks dead. Very dead. Skeleton plant. Actually alive. Growing. Deceptive. Unsettling.',
  },
  'fluid_flowing': {
    name: 'Liquid Appearance',
    coloration: 'Shimmering like flowing water',
    texture: 'Appears wet, actually dry; seems to ripple',
    distinctive_features: ['Motion illusion', 'Reflective surfaces', 'Dripping effect'],
    aesthetic_vibe: 'Water sculpture, frozen fountain',
    flavorText: 'Looks wet. Isn\'t. Looks flowing. Isn\'t. Optical illusion. Confuses touch. Mesmerizing.',
  },
  'fire_mimicry': {
    name: 'Flame Appearance',
    coloration: 'Reds, oranges, yellows flickering like fire',
    texture: 'Rough edges, constantly moving slightly',
    distinctive_features: ['Appears to burn', 'Warm to touch', 'Smoke-like pollen'],
    aesthetic_vibe: 'Eternal bonfire, phoenix flora',
    flavorText: 'Looks like fire. Not fire. Touch safe. Still startling. Warm. Why warm? Unknown.',
  },
  'cloud_fluffy': {
    name: 'Cloud Soft',
    coloration: 'White, gray, or sunset colors',
    texture: 'Incredibly soft, appears weightless',
    distinctive_features: ['Floats slightly', 'Absorbs sound', 'Compresses under touch'],
    aesthetic_vibe: 'Sky garden, sleeping on clouds',
    flavorText: 'Soft as clouds. Looks like clouds. Floats slightly. Touch it. Softer than expected.',
  },
  'geometric_precision': {
    name: 'Perfect Geometry',
    coloration: 'Clean, solid colors in distinct patterns',
    texture: 'Smooth, impossibly regular shapes',
    distinctive_features: ['Perfect angles', 'No variation', 'Unnatural precision'],
    aesthetic_vibe: 'Architectural, designed landscape',
    flavorText: 'Perfect shapes. Too perfect. Nature doesn\'t do this. Except now. Unsettling. Beautiful.',
  },
  'ancient_weathered': {
    name: 'Timeless Worn',
    coloration: 'Faded, aged tones with patina',
    texture: 'Weathered, cracked like ancient stone',
    distinctive_features: ['Appears centuries old', 'Moss-covered', 'Inscriptions?'],
    aesthetic_vibe: 'Forgotten ruins, archaeological',
    flavorText: 'Looks ancient. Is ancient? Maybe. Weathered by time. Or just born that way. Mysterious.',
  },
  'nebula_cosmic': {
    name: 'Cosmic Pattern',
    coloration: 'Deep space colors: purples, blues, starry specks',
    texture: 'Appears to contain galaxies within',
    distinctive_features: ['Tiny stars visible', 'Depth illusion', 'Changes with observation'],
    aesthetic_vibe: 'Universe in miniature, cosmic garden',
    flavorText: 'Contains stars. Tiny ones. Or reflections? Galaxies swirl inside. Look deeper. Fall in.',
  },
  'camouflage_adaptive': {
    name: 'Perfect Mimicry',
    coloration: 'Matches surroundings exactly',
    texture: 'Identical to environment',
    distinctive_features: ['Nearly invisible', 'Slow to change', 'Reveals when touched'],
    aesthetic_vibe: 'Hide and seek champion, stealth garden',
    flavorText: 'Is it there? Yes. Can you see it? No. Touch reveals. Then hides again. Exhausting.',
  },
  'aurora_shimmering': {
    name: 'Aurora Effect',
    coloration: 'Shifting curtains of light: greens, pinks, purples',
    texture: 'Smooth with light playing across surface',
    distinctive_features: ['Light dances', 'Responds to magnetic fields', 'Night visibility'],
    aesthetic_vibe: 'Northern lights captured, polar beauty',
    flavorText: 'Aurora trapped in plant. Light dances. Colors shift. Magnetic. Electric. Breathtaking.',
  },
  'coral_branching': {
    name: 'Coral Structure',
    coloration: 'Vibrant reef colors: pinks, oranges, yellows',
    texture: 'Branching, textured like sea coral',
    distinctive_features: ['Ocean appearance on land', 'Tiny holes', 'Brittle but regrows'],
    aesthetic_vibe: 'Reef garden, underwater on land',
    flavorText: 'Looks like coral. On land. Confusing. Beautiful. Breaks easily. Regrows fast. Resilient.',
  },
  'shadow_silhouette': {
    name: 'Living Shadow',
    coloration: 'Pure black with no depth',
    texture: 'Flat, two-dimensional appearance',
    distinctive_features: ['No three-dimensionality', 'Moves like shadow', 'Edge undefined'],
    aesthetic_vibe: 'Paper cutout, shadow puppet garden',
    flavorText: 'Flat. Shadow. Somehow solid. Touch confirms reality. Eyes doubt it. Strange existence.',
  },
  'prismatic_rainbow': {
    name: 'Rainbow Spectrum',
    coloration: 'All colors in bands or gradients',
    texture: 'Smooth, each color distinct',
    distinctive_features: ['Every color present', 'Ordered progression', 'Pride flag natural'],
    aesthetic_vibe: 'Celebration, colorful joy',
    flavorText: 'All colors. Every one. In order. Beautiful. Cheerful. Nature celebrates everything.',
  },
  'venous_pulsing': {
    name: 'Visible Circulation',
    coloration: 'Translucent with visible fluid channels',
    texture: 'Thin, veins clearly visible beneath surface',
    distinctive_features: ['Pulse visible', 'Fluid moves visibly', 'Almost animal-like'],
    aesthetic_vibe: 'Medical specimen, biological transparency',
    flavorText: 'See inside. Fluid flows. Pulses. Alive. Very obviously alive. Disturbingly alive.',
  },
};
