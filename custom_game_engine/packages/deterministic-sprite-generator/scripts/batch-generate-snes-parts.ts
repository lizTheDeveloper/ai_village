/**
 * Batch generate SNES-style (16-bit) body parts using PixelLab
 * Uses reference image for consistent style
 */

const SNES_REFERENCE_ID = '762d156d-60dc-4822-915b-af55bc06fb49';
const STYLE = '16-bit SNES era pixel art, RPG style like Chrono Trigger';
const OUTPUT_DIR = 'assets/parts/snes';

interface PartSpec {
  id: string;
  category: 'head' | 'body' | 'hair' | 'accessory';
  description: string;
  width: number;
  height: number;
  tags: string[];
}

// SNES Parts Library (64x64 to 64x96)
const SNES_PARTS: PartSpec[] = [
  // HEADS (8 variations)
  { id: 'head_round_pale', category: 'head', description: `${STYLE}, human head, round face, pale skin, front view, neutral, no hair`, width: 64, height: 64, tags: ['round', 'pale'] },
  { id: 'head_round_tan', category: 'head', description: `${STYLE}, human head, round face, tan skin, front view, smiling, no hair`, width: 64, height: 64, tags: ['round', 'tan'] },
  { id: 'head_round_dark', category: 'head', description: `${STYLE}, human head, round face, dark brown skin, front view, serious, no hair`, width: 64, height: 64, tags: ['round', 'dark'] },
  { id: 'head_square_pale', category: 'head', description: `${STYLE}, human head, square jaw, pale skin, front view, stern, no hair`, width: 64, height: 64, tags: ['square', 'pale'] },
  { id: 'head_square_tan', category: 'head', description: `${STYLE}, human head, square jaw, tan skin, front view, confident, no hair`, width: 64, height: 64, tags: ['square', 'tan'] },
  { id: 'head_oval_pale', category: 'head', description: `${STYLE}, human head, oval face, pale skin, front view, gentle smile, no hair`, width: 64, height: 64, tags: ['oval', 'pale'] },
  { id: 'head_oval_dark', category: 'head', description: `${STYLE}, human head, oval face, dark skin, front view, wise, no hair`, width: 64, height: 64, tags: ['oval', 'dark'] },
  { id: 'head_angular_pale', category: 'head', description: `${STYLE}, human head, angular face, pale skin, front view, intense, no hair`, width: 64, height: 64, tags: ['angular', 'pale'] },

  // BODIES (5 variations)
  { id: 'body_athletic', category: 'body', description: `${STYLE}, human body, athletic muscular build, arms and legs, standing, no head`, width: 64, height: 96, tags: ['athletic'] },
  { id: 'body_stocky', category: 'body', description: `${STYLE}, human body, stocky broad build, arms and legs, standing, no head`, width: 64, height: 96, tags: ['stocky'] },
  { id: 'body_thin', category: 'body', description: `${STYLE}, human body, thin lanky build, arms and legs, standing, no head`, width: 64, height: 96, tags: ['thin'] },
  { id: 'body_average', category: 'body', description: `${STYLE}, human body, average build, arms and legs, standing, no head`, width: 64, height: 96, tags: ['average'] },
  { id: 'body_heavy', category: 'body', description: `${STYLE}, human body, heavy-set build, arms and legs, standing, no head`, width: 64, height: 96, tags: ['heavy'] },

  // HAIR (12 variations)
  { id: 'hair_spiky_brown', category: 'hair', description: `${STYLE}, short spiky brown hair, anime style, top view`, width: 64, height: 64, tags: ['short', 'spiky', 'brown'] },
  { id: 'hair_spiky_blonde', category: 'hair', description: `${STYLE}, short spiky blonde hair, hero style, top view`, width: 64, height: 64, tags: ['short', 'spiky', 'blonde'] },
  { id: 'hair_short_black', category: 'hair', description: `${STYLE}, short neat black hair, professional cut, top view`, width: 64, height: 64, tags: ['short', 'neat', 'black'] },
  { id: 'hair_short_red', category: 'hair', description: `${STYLE}, short messy red hair, wild style, top view`, width: 64, height: 64, tags: ['short', 'messy', 'red'] },
  { id: 'hair_medium_wavy_red', category: 'hair', description: `${STYLE}, medium wavy red hair, flowing, top view`, width: 64, height: 72, tags: ['medium', 'wavy', 'red'] },
  { id: 'hair_medium_straight_brown', category: 'hair', description: `${STYLE}, medium straight brown hair with bangs, top view`, width: 64, height: 72, tags: ['medium', 'straight', 'brown'] },
  { id: 'hair_long_blonde', category: 'hair', description: `${STYLE}, long flowing blonde hair, princess style, top view`, width: 64, height: 80, tags: ['long', 'wavy', 'blonde'] },
  { id: 'hair_long_black', category: 'hair', description: `${STYLE}, long straight black hair, silky, top view`, width: 64, height: 80, tags: ['long', 'straight', 'black'] },
  { id: 'hair_long_curly_brown', category: 'hair', description: `${STYLE}, long curly brown hair, voluminous, top view`, width: 64, height: 80, tags: ['long', 'curly', 'brown'] },
  { id: 'hair_ponytail_blonde', category: 'hair', description: `${STYLE}, ponytail blonde hair, high and tight, top view`, width: 64, height: 72, tags: ['ponytail', 'blonde'] },
  { id: 'hair_ponytail_brown', category: 'hair', description: `${STYLE}, ponytail brown hair, casual, top view`, width: 64, height: 72, tags: ['ponytail', 'brown'] },
  { id: 'hair_bald', category: 'hair', description: `${STYLE}, bald head, smooth skin, no hair, top view`, width: 64, height: 64, tags: ['bald'] },

  // ACCESSORIES (6 variations)
  { id: 'accessory_glasses_round', category: 'accessory', description: `${STYLE}, round eyeglasses, thin gold frames, front view`, width: 64, height: 64, tags: ['glasses', 'round'] },
  { id: 'accessory_beard_short', category: 'accessory', description: `${STYLE}, short brown beard, neat goatee, front view`, width: 64, height: 64, tags: ['beard', 'short'] },
  { id: 'accessory_beard_long', category: 'accessory', description: `${STYLE}, long grey wizard beard, flowing, front view`, width: 64, height: 80, tags: ['beard', 'long'] },
  { id: 'accessory_hat_wizard', category: 'accessory', description: `${STYLE}, wizard hat, tall pointed purple with stars`, width: 64, height: 80, tags: ['hat', 'wizard'] },
  { id: 'accessory_crown', category: 'accessory', description: `${STYLE}, gold crown, ornate with red jewels, royal`, width: 64, height: 64, tags: ['crown', 'royal'] },
  { id: 'accessory_eyepatch', category: 'accessory', description: `${STYLE}, black eyepatch, pirate style, front view`, width: 64, height: 64, tags: ['eyepatch', 'pirate'] },

  // EXOTIC MONSTER BODIES (10 variations) - Mix with human heads for crazy hybrids!
  { id: 'body_tentacles', category: 'body', description: `${STYLE}, octopus tentacle body, multiple tentacles, slimy texture, standing pose`, width: 64, height: 96, tags: ['tentacles', 'aquatic', 'monster'] },
  { id: 'body_dragon_wings', category: 'body', description: `${STYLE}, humanoid body with large dragon wings spread, scaly texture`, width: 80, height: 96, tags: ['wings', 'dragon', 'flying'] },
  { id: 'body_furry_beast', category: 'body', description: `${STYLE}, werewolf furry body, thick brown fur, clawed arms and legs`, width: 64, height: 96, tags: ['furry', 'beast', 'wolf'] },
  { id: 'body_slime', category: 'body', description: `${STYLE}, slime ooze body, translucent green gelatinous form, dripping`, width: 64, height: 96, tags: ['slime', 'ooze', 'liquid'] },
  { id: 'body_scales_lizard', category: 'body', description: `${STYLE}, lizardfolk scaly body, green scales, reptilian arms and tail`, width: 64, height: 96, tags: ['scales', 'lizard', 'reptile'] },
  { id: 'body_robot', category: 'body', description: `${STYLE}, robotic cyborg body, metal plating, mechanical joints, wires`, width: 64, height: 96, tags: ['robot', 'cyborg', 'metal'] },
  { id: 'body_ethereal_ghost', category: 'body', description: `${STYLE}, ghostly ethereal body, translucent wispy form, floating`, width: 64, height: 96, tags: ['ghost', 'ethereal', 'spirit'] },
  { id: 'body_insect_chitin', category: 'body', description: `${STYLE}, insectoid body, hard chitin exoskeleton, multiple arms`, width: 64, height: 96, tags: ['insect', 'chitin', 'bug'] },
  { id: 'body_plant_vine', category: 'body', description: `${STYLE}, plant creature body, green vines and leaves, woody texture`, width: 64, height: 96, tags: ['plant', 'vine', 'nature'] },
  { id: 'body_crystalline', category: 'body', description: `${STYLE}, crystal golem body, transparent faceted crystals, glowing`, width: 64, height: 96, tags: ['crystal', 'golem', 'mineral'] },

  // EXOTIC MONSTER HEADS (8 variations)
  { id: 'head_dragon', category: 'head', description: `${STYLE}, dragon head, reptilian with horns, green scales, fierce`, width: 64, height: 64, tags: ['dragon', 'scales', 'horns'] },
  { id: 'head_demon', category: 'head', description: `${STYLE}, demon head, red skin with horns, glowing eyes, menacing`, width: 64, height: 64, tags: ['demon', 'horns', 'evil'] },
  { id: 'head_skull', category: 'head', description: `${STYLE}, skeleton skull head, bone white, empty eye sockets`, width: 64, height: 64, tags: ['skull', 'undead', 'bone'] },
  { id: 'head_cat', category: 'head', description: `${STYLE}, cat head, feline features with whiskers and ears, furry`, width: 64, height: 64, tags: ['cat', 'feline', 'furry'] },
  { id: 'head_octopus', category: 'head', description: `${STYLE}, octopus head, tentacle face like Cthulhu, aquatic`, width: 64, height: 64, tags: ['octopus', 'tentacles', 'lovecraft'] },
  { id: 'head_robot', category: 'head', description: `${STYLE}, robot head, metal with glowing visor, mechanical`, width: 64, height: 64, tags: ['robot', 'metal', 'visor'] },
  { id: 'head_slime', category: 'head', description: `${STYLE}, slime head, gelatinous blob with eyes, translucent`, width: 64, height: 64, tags: ['slime', 'blob', 'eyes'] },
  { id: 'head_bird', category: 'head', description: `${STYLE}, bird head, eagle-like with beak and feathers`, width: 64, height: 64, tags: ['bird', 'eagle', 'beak'] },
];

console.log(`\n🎨 SNES Parts Generation Queue`);
console.log(`Reference ID: ${SNES_REFERENCE_ID}`);
console.log(`Total parts: ${SNES_PARTS.length}`);
console.log(`Output: ${OUTPUT_DIR}/`);
console.log(`\nBreakdown:`);
console.log(`  Heads: ${SNES_PARTS.filter(p => p.category === 'head').length}`);
console.log(`  Bodies: ${SNES_PARTS.filter(p => p.category === 'body').length}`);
console.log(`  Hair: ${SNES_PARTS.filter(p => p.category === 'hair').length}`);
console.log(`  Accessories: ${SNES_PARTS.filter(p => p.category === 'accessory').length}`);

console.log(`\n⏱️  Rate Limit: ~5 seconds between generations`);
console.log(`Estimated time: ${Math.ceil(SNES_PARTS.length * 30 / 60)} minutes`);

console.log(`\n📋 Generation Instructions:`);
console.log(`1. Use PixelLab MCP tools to generate each part`);
console.log(`2. Use SNES reference as background_image for style matching`);
console.log(`3. Download each generated PNG to ${OUTPUT_DIR}/`);
console.log(`4. Update parts.ts to load from these files`);

console.log(`\n🚀 Ready to generate!`);

export { SNES_PARTS, SNES_REFERENCE_ID, OUTPUT_DIR };
