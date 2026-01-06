/**
 * Generate PixelLab body parts for sprite composition
 * Creates a library of heads, bodies, hair, accessories at 64x64
 */

interface PartSpec {
  category: 'head' | 'body' | 'hair' | 'eyes' | 'accessory';
  description: string;
  width: number;
  height: number;
  tags: string[];
}

const PARTS_TO_GENERATE: PartSpec[] = [
  // HEADS (64x64) - Different face shapes, skin tones, angles
  { category: 'head', description: 'round face, pale skin, front view, neutral expression', width: 64, height: 64, tags: ['round', 'pale'] },
  { category: 'head', description: 'round face, tan skin, front view, smiling', width: 64, height: 64, tags: ['round', 'tan'] },
  { category: 'head', description: 'round face, dark skin, front view, serious', width: 64, height: 64, tags: ['round', 'dark'] },
  { category: 'head', description: 'square jaw face, pale skin, front view, stern', width: 64, height: 64, tags: ['square', 'pale'] },
  { category: 'head', description: 'square jaw face, tan skin, front view, confident', width: 64, height: 64, tags: ['square', 'tan'] },
  { category: 'head', description: 'oval face, pale skin, front view, gentle smile', width: 64, height: 64, tags: ['oval', 'pale'] },
  { category: 'head', description: 'oval face, dark skin, front view, wise expression', width: 64, height: 64, tags: ['oval', 'dark'] },
  { category: 'head', description: 'triangular face, tan skin, front view, mischievous grin', width: 64, height: 64, tags: ['triangle', 'tan'] },
  { category: 'head', description: 'chubby round face, rosy skin, front view, cheerful', width: 64, height: 64, tags: ['chubby', 'rosy'] },
  { category: 'head', description: 'angular face, pale skin, front view, intense stare', width: 64, height: 64, tags: ['angular', 'pale'] },

  // BODIES (64x96) - Different builds and proportions
  { category: 'body', description: 'athletic muscular torso with arms and legs, standing pose', width: 64, height: 96, tags: ['athletic'] },
  { category: 'body', description: 'stocky broad-shouldered torso with thick limbs, standing', width: 64, height: 96, tags: ['stocky'] },
  { category: 'body', description: 'thin lanky torso with long limbs, standing', width: 64, height: 96, tags: ['thin'] },
  { category: 'body', description: 'average build torso with balanced proportions, standing', width: 64, height: 96, tags: ['average'] },
  { category: 'body', description: 'petite slim torso with small frame, standing', width: 64, height: 96, tags: ['petite'] },
  { category: 'body', description: 'heavy-set torso with wide build, standing', width: 64, height: 96, tags: ['heavy'] },
  { category: 'body', description: 'athletic feminine torso with arms and legs', width: 64, height: 96, tags: ['athletic', 'feminine'] },
  { category: 'body', description: 'muscular heroic torso with broad chest, arms at sides', width: 64, height: 96, tags: ['heroic', 'muscular'] },

  // HAIR (64x64 or 64x80 for long) - Many styles and colors
  { category: 'hair', description: 'short spiky brown hair, messy style', width: 64, height: 64, tags: ['short', 'spiky', 'brown'] },
  { category: 'hair', description: 'short spiky blonde hair, punk style', width: 64, height: 64, tags: ['short', 'spiky', 'blonde'] },
  { category: 'hair', description: 'short neat black hair, professional cut', width: 64, height: 64, tags: ['short', 'neat', 'black'] },
  { category: 'hair', description: 'medium length wavy red hair', width: 64, height: 72, tags: ['medium', 'wavy', 'red'] },
  { category: 'hair', description: 'medium length straight brown hair with bangs', width: 64, height: 72, tags: ['medium', 'straight', 'brown'] },
  { category: 'hair', description: 'long flowing blonde hair, wavy strands', width: 64, height: 80, tags: ['long', 'wavy', 'blonde'] },
  { category: 'hair', description: 'long straight black hair, silky', width: 64, height: 80, tags: ['long', 'straight', 'black'] },
  { category: 'hair', description: 'long curly brown hair, voluminous', width: 64, height: 80, tags: ['long', 'curly', 'brown'] },
  { category: 'hair', description: 'long braided red hair, thick braid', width: 64, height: 80, tags: ['long', 'braided', 'red'] },
  { category: 'hair', description: 'ponytail blonde hair, high and tight', width: 64, height: 72, tags: ['ponytail', 'blonde'] },
  { category: 'hair', description: 'ponytail brown hair, casual and loose', width: 64, height: 72, tags: ['ponytail', 'brown'] },
  { category: 'hair', description: 'afro black hair, large and fluffy', width: 64, height: 72, tags: ['afro', 'black'] },
  { category: 'hair', description: 'mohawk green hair, spiked center strip', width: 64, height: 64, tags: ['mohawk', 'green'] },
  { category: 'hair', description: 'bald head, completely smooth', width: 64, height: 64, tags: ['bald'] },
  { category: 'hair', description: 'buzz cut grey hair, very short', width: 64, height: 64, tags: ['buzz', 'grey'] },

  // ACCESSORIES (64x64)
  { category: 'accessory', description: 'round glasses with thin frames', width: 64, height: 64, tags: ['glasses', 'round'] },
  { category: 'accessory', description: 'square glasses with thick frames', width: 64, height: 64, tags: ['glasses', 'square'] },
  { category: 'accessory', description: 'short brown beard, neatly trimmed', width: 64, height: 64, tags: ['beard', 'short', 'brown'] },
  { category: 'accessory', description: 'long grey beard, wizard-like', width: 64, height: 80, tags: ['beard', 'long', 'grey'] },
  { category: 'accessory', description: 'mustache brown, handlebar style', width: 64, height: 64, tags: ['mustache', 'brown'] },
  { category: 'accessory', description: 'wizard hat, tall pointed purple', width: 64, height: 80, tags: ['hat', 'wizard'] },
  { category: 'accessory', description: 'crown gold, ornate with jewels', width: 64, height: 64, tags: ['crown', 'royal'] },
  { category: 'accessory', description: 'bandana red, tied around head', width: 64, height: 64, tags: ['bandana', 'red'] },
  { category: 'accessory', description: 'eyepatch black, over left eye', width: 64, height: 64, tags: ['eyepatch', 'pirate'] },
  { category: 'accessory', description: 'earrings gold, large hoop style', width: 64, height: 64, tags: ['earrings', 'gold'] },
];

console.log(`\n📋 PixelLab Parts Generation Queue`);
console.log(`Total parts to generate: ${PARTS_TO_GENERATE.length}`);
console.log(`\nBreakdown:`);
console.log(`- Heads: ${PARTS_TO_GENERATE.filter(p => p.category === 'head').length}`);
console.log(`- Bodies: ${PARTS_TO_GENERATE.filter(p => p.category === 'body').length}`);
console.log(`- Hair: ${PARTS_TO_GENERATE.filter(p => p.category === 'hair').length}`);
console.log(`- Accessories: ${PARTS_TO_GENERATE.filter(p => p.category === 'accessory').length}`);

console.log(`\n⚠️  Rate Limiting:`);
console.log(`PixelLab allows ~1 generation per 5 seconds`);
console.log(`Estimated time: ${Math.ceil(PARTS_TO_GENERATE.length * 5 / 60)} minutes`);

console.log(`\n📝 Export this list and generate using PixelLab MCP tools`);
console.log(`Each part will be 64x64 or larger for high detail`);

export { PARTS_TO_GENERATE };
