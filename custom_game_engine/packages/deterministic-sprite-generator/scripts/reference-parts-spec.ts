/**
 * Reference-based PixelLab parts generation
 * All parts use the same base reference for consistent art style
 */

interface PartSpec {
  category: 'head' | 'body' | 'hair' | 'eyes' | 'accessory';
  description: string;
  width: number;
  height: number;
  tags: string[];
  useReference: boolean;
}

// Style specification for ALL parts
const STYLE = "16-bit SNES era pixel art, RPG style like Chrono Trigger or Final Fantasy VI";

const PARTS_TO_GENERATE: PartSpec[] = [
  // HEADS (64x64) - All use reference
  {
    category: 'head',
    description: `${STYLE}, human head only, round face, pale skin, front view, neutral expression, no hair visible`,
    width: 64, height: 64,
    tags: ['round', 'pale'],
    useReference: true
  },
  {
    category: 'head',
    description: `${STYLE}, human head only, round face, tan skin, front view, smiling, no hair`,
    width: 64, height: 64,
    tags: ['round', 'tan'],
    useReference: true
  },
  {
    category: 'head',
    description: `${STYLE}, human head only, round face, dark brown skin, front view, serious expression, no hair`,
    width: 64, height: 64,
    tags: ['round', 'dark'],
    useReference: true
  },
  {
    category: 'head',
    description: `${STYLE}, human head only, square jaw, pale skin, front view, stern, no hair`,
    width: 64, height: 64,
    tags: ['square', 'pale'],
    useReference: true
  },
  {
    category: 'head',
    description: `${STYLE}, human head only, square jaw, tan skin, front view, confident, no hair`,
    width: 64, height: 64,
    tags: ['square', 'tan'],
    useReference: true
  },
  {
    category: 'head',
    description: `${STYLE}, human head only, oval face, pale skin, front view, gentle smile, no hair`,
    width: 64, height: 64,
    tags: ['oval', 'pale'],
    useReference: true
  },
  {
    category: 'head',
    description: `${STYLE}, human head only, oval face, dark skin, front view, wise expression, no hair`,
    width: 64, height: 64,
    tags: ['oval', 'dark'],
    useReference: true
  },
  {
    category: 'head',
    description: `${STYLE}, human head only, angular face, pale skin, front view, intense stare, no hair`,
    width: 64, height: 64,
    tags: ['angular', 'pale'],
    useReference: true
  },

  // BODIES (64x96) - All use reference
  {
    category: 'body',
    description: `${STYLE}, human torso with arms and legs, athletic muscular build, standing straight, front view, no head`,
    width: 64, height: 96,
    tags: ['athletic'],
    useReference: true
  },
  {
    category: 'body',
    description: `${STYLE}, human torso with arms and legs, stocky broad-shouldered build, standing, front view, no head`,
    width: 64, height: 96,
    tags: ['stocky'],
    useReference: true
  },
  {
    category: 'body',
    description: `${STYLE}, human torso with arms and legs, thin lanky build, standing, front view, no head`,
    width: 64, height: 96,
    tags: ['thin'],
    useReference: true
  },
  {
    category: 'body',
    description: `${STYLE}, human torso with arms and legs, average balanced build, standing, front view, no head`,
    width: 64, height: 96,
    tags: ['average'],
    useReference: true
  },
  {
    category: 'body',
    description: `${STYLE}, human torso with arms and legs, heavy-set wide build, standing, front view, no head`,
    width: 64, height: 96,
    tags: ['heavy'],
    useReference: true
  },

  // HAIR (64x64 to 64x80) - All use reference
  {
    category: 'hair',
    description: `${STYLE}, short spiky brown hair only, messy punk style, top-down view`,
    width: 64, height: 64,
    tags: ['short', 'spiky', 'brown'],
    useReference: true
  },
  {
    category: 'hair',
    description: `${STYLE}, short spiky blonde hair only, anime style spikes, top-down`,
    width: 64, height: 64,
    tags: ['short', 'spiky', 'blonde'],
    useReference: true
  },
  {
    category: 'hair',
    description: `${STYLE}, short neat black hair only, professional cut, top-down`,
    width: 64, height: 64,
    tags: ['short', 'neat', 'black'],
    useReference: true
  },
  {
    category: 'hair',
    description: `${STYLE}, medium wavy red hair only, flowing strands, top-down`,
    width: 64, height: 72,
    tags: ['medium', 'wavy', 'red'],
    useReference: true
  },
  {
    category: 'hair',
    description: `${STYLE}, long flowing blonde hair only, wavy princess style, top-down`,
    width: 64, height: 80,
    tags: ['long', 'wavy', 'blonde'],
    useReference: true
  },
  {
    category: 'hair',
    description: `${STYLE}, long straight black hair only, silky and smooth, top-down`,
    width: 64, height: 80,
    tags: ['long', 'straight', 'black'],
    useReference: true
  },
  {
    category: 'hair',
    description: `${STYLE}, long curly brown hair only, voluminous afro style, top-down`,
    width: 64, height: 80,
    tags: ['long', 'curly', 'brown'],
    useReference: true
  },
  {
    category: 'hair',
    description: `${STYLE}, ponytail blonde hair only, high and tight, top-down`,
    width: 64, height: 72,
    tags: ['ponytail', 'blonde'],
    useReference: true
  },
  {
    category: 'hair',
    description: `${STYLE}, bald head skin only, completely smooth, no hair, top-down`,
    width: 64, height: 64,
    tags: ['bald'],
    useReference: true
  },

  // ACCESSORIES (64x64) - All use reference
  {
    category: 'accessory',
    description: `${STYLE}, round eyeglasses only, thin gold frames, front view`,
    width: 64, height: 64,
    tags: ['glasses', 'round'],
    useReference: true
  },
  {
    category: 'accessory',
    description: `${STYLE}, short brown beard only, neatly trimmed goatee style`,
    width: 64, height: 64,
    tags: ['beard', 'short', 'brown'],
    useReference: true
  },
  {
    category: 'accessory',
    description: `${STYLE}, long grey wizard beard only, flowing and majestic`,
    width: 64, height: 80,
    tags: ['beard', 'long', 'grey'],
    useReference: true
  },
  {
    category: 'accessory',
    description: `${STYLE}, wizard hat only, tall pointed purple with stars`,
    width: 64, height: 80,
    tags: ['hat', 'wizard'],
    useReference: true
  },
  {
    category: 'accessory',
    description: `${STYLE}, gold crown only, ornate with red jewels, royal`,
    width: 64, height: 64,
    tags: ['crown', 'royal'],
    useReference: true
  },
  {
    category: 'accessory',
    description: `${STYLE}, black eyepatch only, pirate style over left eye`,
    width: 64, height: 64,
    tags: ['eyepatch', 'pirate'],
    useReference: true
  },
];

console.log(`\n🎨 Reference-Based PixelLab Parts`);
console.log(`Style: ${STYLE}`);
console.log(`\nTotal parts: ${PARTS_TO_GENERATE.length}`);
console.log(`- Heads: ${PARTS_TO_GENERATE.filter(p => p.category === 'head').length}`);
console.log(`- Bodies: ${PARTS_TO_GENERATE.filter(p => p.category === 'body').length}`);
console.log(`- Hair: ${PARTS_TO_GENERATE.filter(p => p.category === 'hair').length}`);
console.log(`- Accessories: ${PARTS_TO_GENERATE.filter(p => p.category === 'accessory').length}`);

console.log(`\n⏱️  Estimated time: ${Math.ceil(PARTS_TO_GENERATE.length * 30 / 60)} minutes (with rate limits)`);
console.log(`\n📌 All parts use the base reference for consistent style`);

export { PARTS_TO_GENERATE, STYLE };
