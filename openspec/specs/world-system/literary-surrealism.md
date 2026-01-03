> **System:** world-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Literary Surrealism: Words Made Real
## Language Physics, Metaphor Literalization, and Narrative Architecture

> *Dedicated to:*
> - **Jorge Luis Borges** - For the Library of Babel, infinite stories, and labyrinths of words
> - **Italo Calvino** - For *Invisible Cities* and impossible architectures
> - **Lewis Carroll** - For nonsense that makes perfect sense, and words that mean what you choose
> - **China Miéville** - For Bas-Lag's impossible physics and remade reality
> - **Walter Moers** - For Zamonia, where books are alive and alphabets have personality
> - **Terry Pratchett** - For narrativium, the element that makes stories real
> - **Neil Gaiman** - For understanding that words create worlds

---

## Overview

A system where language has physical weight, metaphors become literal, and reality itself is written text that can be edited.

### Core Philosophy

This isn't about implementing specific book-themed locations. It's about capturing a particular kind of weirdness:
- **Words have mass and momentum** - A well-chosen adjective weighs more than a clumsy one
- **Metaphors become literally true** - Call something "sharp as a tack" and it cuts you
- **Stories leak into reality** - Fictional characters wander in from unfinished narratives
- **Architecture follows narrative logic** - Buildings shaped like the stories told inside them
- **Abstract concepts are tangible** - You can trip over Tuesday, taste regret, or shake hands with the number seven

---

## 1. Language Physics

### 1.1 Words as Physical Objects

```typescript
export interface WordPhysics {
  // Words have mass based on importance
  calculateWordMass(word: string, context: 'spoken' | 'written' | 'thought'): number;

  // Synonyms orbit each other like moons
  synonymGravity: Map<string, string[]>;

  // Antonyms repel
  antonymRepulsion: number;

  // Alliteration creates resonance
  alliterativeHarmonic: boolean;
}

// Example:
const wordMass = {
  'the': 0.1,        // Articles are light, float easily
  'love': 47.3,      // Heavy concepts sink into the ground
  'melancholy': 89.2, // Extremely heavy, can crush furniture
  'schadenfreude': 156.4, // Borrowed words are dense
};
```

**Behaviors**:
- Drop a heavy word and it dents the floor
- Light words float like bubbles
- Synonym clouds drift together
- Forgotten words fade and become transparent
- Overused words wear thin and tear

### 1.2 Metaphor Literalization

When someone uses a metaphor, there's a chance it becomes literally true.

```typescript
export interface MetaphorEngine {
  detectMetaphor(speech: string): Metaphor | null;
  literalizationChance: number;  // Increases with poetic skill

  applyLiteralEffect(target: Entity, metaphor: Metaphor): void;
}

// Examples of literal metaphors:
const examples = [
  {
    metaphor: "sharp as a tack",
    effect: "Target gains cutting edge, can wound"
  },
  {
    metaphor: "heart of stone",
    effect: "Chest becomes literal granite, heavy and cold"
  },
  {
    metaphor: "time flies",
    effect: "Temporal entity with wings appears, steals hours"
  },
  {
    metaphor: "drowning in paperwork",
    effect: "Documents become liquid, actually drown you"
  },
  {
    metaphor: "food for thought",
    effect: "Ideas become edible, nutritious, have flavors"
  },
  {
    metaphor: "burning with anger",
    effect: "Literal flames emerge from emotional state"
  }
];
```

**Magic System Integration**:
- **Poetic Paradigm**: Magic cast through perfect verse
- Rhyme schemes amplify power (couplets = 2x, sonnets = 14x)
- Meter matters: iambic pentameter is standard, dactylic is unstable
- Enjambment can link spells across lines
- Breaking meter causes backlash

### 1.3 Punctuation Has Power

```typescript
export const PunctuationMagic = {
  period: {
    name: 'Full Stop',
    effect: 'Terminates ongoing effects. Ends conversations immediately.',
    danger: 'Can end lives if misapplied',
  },

  comma: {
    name: 'Brief Pause',
    effect: 'Temporary suspension of time, very brief',
    danger: 'Overuse creates stuttering reality',
  },

  exclamation: {
    name: 'Emphasis',
    effect: 'Amplifies whatever it follows by 3x',
    danger: '!!! can be weaponized, extremely loud',
  },

  question_mark: {
    name: 'Interrogative',
    effect: 'Forces truth-telling, compels answers',
    danger: 'Too many questions unravel certainty',
  },

  semicolon: {
    name: 'Conjunction Junction',
    effect: 'Joins two separate things into one entity',
    danger: 'Improper use creates chimeras',
  },

  ellipsis: {
    name: 'Trailing Off',
    effect: 'Creates uncertainty, fades things from existence',
    danger: 'Overuse leads to existential dissolution...',
  },

  em_dash: {
    name: 'Interruption',
    effect: '— cuts through anything —',
    danger: 'Literal cutting tool when written',
  },
};
```

**Usage**:
- Mages train in calligraphy to draw perfect punctuation
- A perfectly formed exclamation point is a weapon
- Question marks carved into doors force them to reveal secrets
- Ellipses can erase... almost... anything...

---

## 2. Narrative Architecture

Buildings that follow story logic rather than physics.

### 2.1 Story-Shaped Structures

```typescript
export interface NarrativeBuilding {
  storyStructure: 'three_act' | 'heros_journey' | 'tragedy' | 'comedy' | 'farce';

  // Rooms arranged by narrative beats
  rooms: {
    ordinary_world?: Room;
    inciting_incident?: Room;
    rising_action?: Room[];
    climax?: Room;
    falling_action?: Room[];
    resolution?: Room;
  };

  // Navigation follows plot
  mustFollowPlot: boolean;  // Can't skip to resolution

  // Each room has genre-appropriate physics
  genrePhysics: Map<string, PhysicsOverride>;
}
```

**Examples**:

**Tragedy Tower**:
- Enters at ground level (ordinary world)
- Each floor up = rising tension
- Top floor = inevitable catastrophe
- No way down except falling
- Architecture actively opposes happiness
- Windows show only gloomy weather regardless of actual sky

**Comedy Cottage**:
- Doors open to wrong rooms (comedic timing)
- Pratfalls are magically enhanced
- Furniture conspires in slapstick
- Everything happens in threes
- Serious conversations constantly interrupted

**Mystery Mansion**:
- Rooms rearrange to hide clues
- Secret passages appear only when observed
- Red herring decorations everywhere
- Butler is always suspicious
- Final room reveals "whodunit" (literally)

### 2.2 Impossible Spaces

```typescript
export interface ImpossibleGeometry {
  type:
    | 'larger_inside'           // TARDIS-style
    | 'mobius_corridor'         // Loop back on yourself
    | 'escher_architecture'     // Stairs go nowhere
    | 'klein_bottle_room'       // Inside is outside
    | 'fractal_chambers'        // Each room contains smaller version of whole building
    | 'temporal_displacement'   // Different rooms in different time periods
    | 'narrative_folding';      // Story-based shortcuts

  stability: number;  // How reliably weird it is
  perception_required: number;  // INT check to navigate
}
```

**The Library That Contains Itself**:
- One of the books on the shelves is about this library
- Reading that book reveals the book you're currently reading
- The book contains a smaller library
- Infinite recursion
- Scholars have been lost in self-reference for decades

**The Argument Hall**:
- Two-sided building: thesis and antithesis
- Middle is the synthesis
- Physical layout forces dialectical reasoning
- Rooms on left contradict rooms on right
- Center chamber reconciles all contradictions
- Entering with an opinion physically pulls you toward one wing

**The Unfinished Wing**:
- Construction stopped mid-sentence
- Rooms fade into sketches, then outlines, then blank space
- Walking deeper makes you less defined
- Permanent residents are incomplete beings
- You can edit yourself by changing the blueprints

---

## 3. Living Abstractions

Concepts and ideas given physical form.

### 3.1 Tangible Emotions

```typescript
export interface EmotionalEntity {
  emotionType: 'joy' | 'sorrow' | 'rage' | 'fear' | 'regret' | 'schadenfreude' | 'ennui';

  // How they manifest
  appearance: string;
  behaviors: string[];

  // Effects on nearby beings
  aura: EmotionalAura;

  // Can be captured, bottled, traded
  tradeable: boolean;
  value: number;
}

// Examples:
const REGRET: EmotionalEntity = {
  emotionType: 'regret',
  appearance: 'Gray mist that follows you, whispering past mistakes',
  behaviors: [
    'Clings to beings who made poor choices',
    'Grows heavier with age',
    'Can be shed through atonement or acceptance',
  ],
  aura: {
    effect: 'Replay past decisions in mind',
    range: 'personal',
    resistible: true,
  },
  tradeable: true,
  value: -20,  // Negative value - people pay to get rid of it
};

const SCHADENFREUDE: EmotionalEntity = {
  emotionType: 'schadenfreude',
  appearance: 'Imp-like creature with a malicious grin',
  behaviors: [
    'Appears when witnessing others\' misfortune',
    'Feeds on embarrassment',
    'Multiplies in presence of social disasters',
  ],
  aura: {
    effect: 'Makes others\' failures seem hilarious',
    range: 10,
    resistible: false,
  },
  tradeable: true,
  value: 15,  // Some collectors want these
};
```

**Emotional Economics**:
- Bottle and sell emotions
- Joy is expensive, sorrow is cheap but plentiful
- Schadenfreude dealers in the black market
- Ennui epidemic in wealthy districts
- Therapy = exorcising unwanted emotional entities

### 3.2 Concept Creatures

```typescript
export interface ConceptBeing {
  concept: string;  // "Tuesday", "justice", "seven", "blue", etc.

  howItManifests: string;

  behaviors: string[];

  // What happens when you interact
  interactionEffects: {
    touch?: string;
    speak_to?: string;
    ignore?: string;
  };
}

// The Color of Disappointment:
const DISAPPOINTMENT_BLUE: ConceptBeing = {
  concept: 'the specific shade of blue that represents disappointment',
  howItManifests: 'Washed-out blue-gray figure, always slightly transparent',
  behaviors: [
    'Appears when hopes are dashed',
    'Paints things in its own hue',
    'Fades gradually as you move on',
  ],
  interactionEffects: {
    touch: 'Everything you touch becomes that color for a while',
    speak_to: 'It shares disappointing news in a flat monotone',
    ignore: 'It intensifies, becomes more saturated',
  },
};

// Tuesday:
const TUESDAY: ConceptBeing = {
  concept: 'the abstract idea of Tuesday',
  howItManifests: 'Bland humanoid in business casual, perpetually tired',
  behaviors: [
    'Wanders aimlessly between Monday and Wednesday',
    'Makes everything slightly tedious',
    'Forgotten immediately after passing',
  ],
  interactionEffects: {
    touch: 'It\'s Tuesday now, regardless of actual day',
    speak_to: 'Discusses mundane work topics',
    ignore: 'Ideal - Tuesday prefers being forgettable',
  },
};

// The Number Seven:
const SEVEN: ConceptBeing = {
  concept: 'the number seven',
  howItManifests: 'Heptagonal crystal that chimes in perfect fifths',
  behaviors: [
    'Appears in groups of seven',
    'Creates lucky coincidences',
    'Associated with completeness',
  ],
  interactionEffects: {
    touch: 'Gain seven of something (random)',
    speak_to: 'Answers in seven-word sentences',
    ignore: 'Mild bad luck',
  },
};
```

**Behaviors**:
- Mathematical concepts negotiate with each other
- Days of the week have turf wars
- Colors debate aesthetics
- You can trip over Tuesday if it's lying in the street
- Abstract nouns form governments

---

## 4. Chimeric Species & Obsessive Cultures

Inspired by surreal fantasy's love of hybrid creatures and monomaniacal societies.

### 4.1 Impossible Hybrids

Creatures that are biological contradictions - combinations that shouldn't work but do.

```typescript
export interface ChimericSpecies {
  name: string;
  componentParts: string[];  // What they're made of
  contradictionLevel: number;  // How impossible the combination is

  // The more contradictory, the more magical
  magicAffinity: number;  // Derived from impossibility

  // Physical traits from each component
  traits: {
    from: string;  // Which component part
    trait: string;
    manifestation: string;
  }[];

  // Existential issues
  identityCrisis: string;  // "Am I predator or prey? Both. Neither?"
}

// Examples - NOT copying wolpertings, but similar vibe:

const CONTRADICTIONS: ChimericSpecies[] = [
  {
    name: 'Sharkbear',
    componentParts: ['shark', 'bear', 'unclear third thing'],
    contradictionLevel: 87,
    magicAffinity: 0.87,

    traits: [
      { from: 'shark', trait: 'gills', manifestation: 'Can breathe water AND air, neither comfortably' },
      { from: 'bear', trait: 'fur', manifestation: 'Waterlogged fur, perpetually damp and miserable' },
      { from: 'shark', trait: 'teeth', manifestation: 'Rows of regenerating teeth, hibernates anyway' },
      { from: 'unclear', trait: 'wings', manifestation: 'Vestigial wings that serve no purpose' },
    ],

    identityCrisis: 'Should I swim or lumber? Hunt fish or berries? I am an offense to taxonomy.',
  },

  {
    name: 'Lambion',
    componentParts: ['lamb', 'lion', 'dandelion'],
    contradictionLevel: 92,
    magicAffinity: 0.92,

    traits: [
      { from: 'lamb', trait: 'fleece', manifestation: 'Golden fleece with seeds embedded' },
      { from: 'lion', trait: 'mane', manifestation: 'Mane made of dandelion fluff' },
      { from: 'dandelion', trait: 'propagation', manifestation: 'Sneezing spreads offspring via wind' },
      { from: 'lamb', trait: 'temperament', manifestation: 'Docile and terrifying simultaneously' },
    ],

    identityCrisis: 'Predator or livestock? Vegetable or mineral? I photosynthesize AND hunt.',
  },

  {
    name: 'Octocow',
    componentParts: ['octopus', 'cow', 'geometric solid'],
    contradictionLevel: 78,
    magicAffinity: 0.78,

    traits: [
      { from: 'octopus', trait: 'tentacles', manifestation: 'Eight udders on tentacles, milking is disturbing' },
      { from: 'cow', trait: 'herbivore', manifestation: 'Grazes on kelp, moos in bubbles' },
      { from: 'octopus', trait: 'intelligence', manifestation: 'Too smart to be livestock, resents domestication' },
      { from: 'geometric solid', trait: 'angles', manifestation: 'Somehow cubic despite being fleshy' },
    ],

    identityCrisis: 'Why am I? What cruel god made me a cube? I taste colors.',
  },
];
```

**Mechanics**:
- Higher contradiction = higher magic resistance/affinity
- Identity crises cause unpredictable behavior
- Can't fit into normal ecological niches
- Other species don't know how to categorize them
- Extreme examples blur into abstract entities

### 4.2 Monomaniacal Cultures

Entire species obsessed with a single concept to absurd degrees.

```typescript
export interface ObsessiveCulture {
  species: string;
  obsession: string;

  // How deep the obsession goes
  societyStructure: string;
  language: string;  // Vocabulary warped around obsession
  architecture: string;
  conflicts: string;  // What they fight about

  // Effects on individuals
  canThinkAboutOtherThings: boolean;
  withdrawalSymptoms: string[];
}

// The Gastromancers - Food Obsessed to Eldritch Levels
const GASTROMANCERS: ObsessiveCulture = {
  species: 'Gastromancers',
  obsession: 'Cuisine as cosmic truth',

  societyStructure: 'Hierarchy based on cooking skill. Master Chefs are priest-kings. Mediocre cooks are untouchables.',

  language: 'Every concept expressed as culinary metaphor. "I love you" = "You are the perfect reduction of my heart." War = "Aggressive seasoning."',

  architecture: 'Cities shaped like gigantic kitchens. Temples are ovens. Streets are cutting boards. Rain gutters are sauce drainage.',

  conflicts: 'Fought with dueling recipes. Wars over whether butter or oil is metaphysically superior. Religious schism: "Does pineapple belong on pizza?"',

  canThinkAboutOtherThings: false,

  withdrawalSymptoms: [
    'Inability to perceive non-food objects',
    'Speaking only in recipe instructions',
    'Attempting to sauté abstract concepts',
    'Existential dread if meal is mediocre',
  ],
};

// The Duelists - Combat as Art, Religion, and Small Talk
const DUELISTS: ObsessiveCulture = {
  species: 'Duelists',
  obsession: 'Formalized single combat',

  societyStructure: 'Win-loss records determine status. Undefeated warriors are nobility. Losers are servants until they win.',

  language: 'All verbs are fighting terminology. "Eating breakfast" = "defeating morning hunger in honorable sustenance-combat."',

  architecture: 'Every building is an arena. Homes have dueling circles. Markets are tournament brackets. Sacred geometry is all about optimal fighting stances.',

  conflicts: 'Literally everything is resolved via duel. Inheritance? Duel. Romantic courtship? Duel. Philosophical disagreement? Duel. Traffic disputes? Duel.',

  canThinkAboutOtherThings: false,

  withdrawalSymptoms: [
    'Challenging inanimate objects to duels',
    'Seeing all interactions as combat',
    'Elaborate bowing and challenge issuing to empty rooms',
    'Unable to cooperate (all relationships are adversarial)',
  ],
};

// The Nomenclaturists - Name Everything, Catalog Reality
const NOMENCLATURISTS: ObsessiveCulture = {
  species: 'Nomenclaturists',
  obsession: 'Cataloging and naming every single thing',

  societyStructure: 'Ranked by number of things named. Great Taxonomers rule. The unnamed are non-citizens.',

  language: 'Every sentence is a list. "Hello" is "Greeting-type-7, subsection-morning, casual-register, single-recipient." Conversations take hours.',

  architecture: 'Buildings are filing systems. Cities are indexes. Every brick is numbered. Streets have sixteen-digit classification codes.',

  conflicts: 'Brutal naming wars. "Is this a chair or a stool?" causes decades-long feuds. Border disputes over who gets to name new species.',

  canThinkAboutOtherThings: true,  // But choose not to

  withdrawalSymptoms: [
    'Compulsive labeling of surroundings',
    'Inability to interact with unnamed objects',
    'Creating new categories for everything',
    'Existential terror at ambiguity',
  ],
};
```

**Game Integration**:
- These species create unique settlements
- Trading with them requires understanding their obsession
- Quest givers from these cultures only care about their fixation
- Hybrid vigor: Gastromancer + Duelist = competitive cooking wars

### 4.3 Scale Extremes

Civilizations of the impossibly tiny and the incomprehensibly vast.

```typescript
export interface ScaleSpecies {
  name: string;
  scale: 'microscopic' | 'tiny' | 'small' | 'huge' | 'gigantic' | 'cosmic';

  // Size implications
  typicalSize: string;
  perceptionOfNormalSizedBeings: string;

  // Cultural effects of scale
  society: string;
  challenges: string;
  advantages: string;
}

// The Infinitesimites - So Small They're Almost Abstract
const INFINITESIMITES: ScaleSpecies = {
  name: 'Infinitesimites',
  scale: 'microscopic',

  typicalSize: 'Smaller than dust motes. Visible only under magnification or to magical sight.',

  perceptionOfNormalSizedBeings: 'Colossal god-mountains that move in geological time. A human walking is like continental drift.',

  society: 'Build civilizations in dewdrops, on flower petals, within beard hairs of larger beings. Entire empires live and die unnoticed.',

  challenges: 'Everything is a threat. Raindrops are tsunamis. Breath is hurricanes. Being sneezed on is apocalyptic.',

  advantages: 'Invisible to most threats. Can live anywhere. Travel via hitching rides on normal-sized beings. Extremely efficient resource use.',
};

// The Syllable People - Live in Words
const SYLLABLE_PEOPLE: ScaleSpecies = {
  name: 'Syllable People',
  scale: 'tiny',

  typicalSize: 'Small enough to live inside spoken words. Each syllable can house a family.',

  perceptionOfNormalSizedBeings: 'Massive sound-producers. Speaking creates habitable spaces. Shouting is urban development.',

  society: 'Nomadic. Follow eloquent speakers. Prefer poetry (more syllables). Avoid taciturn beings. Literature creates megacities.',

  challenges: 'Dependent on others speaking. Silent periods are famines. Cacophony is overpopulation crisis.',

  advantages: 'Can influence what people say by making certain syllables more comfortable. Literal living in language.',
};

// The Colossals - Mistake Mountains for Relatives
const COLOSSALS: ScaleSpecies = {
  name: 'Colossals',
  scale: 'gigantic',

  typicalSize: 'Miles tall. Individual limbs are mistaken for geographic features. One step takes hours.',

  perceptionOfNormalSizedBeings: 'Barely perceptible microbes. Maybe hallucinations. Might be dandruff.',

  society: 'Conversations span decades. Reproduction cycle measured in centuries. So slow they seem geological.',

  challenges: 'Coordination is impossible at this scale. Communication lag. Can\'t interact with anything normal-sized.',

  advantages: 'Nearly invulnerable. Can shape landscapes by sleeping. Weather patterns orbit them.',
};

// The Fractals - Size is Relative, They Are All Sizes
const FRACTALS: ScaleSpecies = {
  name: 'Fractal Folk',
  scale: 'cosmic',  // Transcends scale

  typicalSize: 'Depends on zoom level. Each part contains the whole. Viewing them from different distances reveals different civilizations.',

  perceptionOfNormalSizedBeings: 'Limited. Fractals pity beings stuck at one scale. "You only exist at your own size? How limiting."',

  society: 'Infinite recursion. Each individual contains infinite smaller versions of themselves, is contained by larger versions. Self-similar across all scales.',

  challenges: 'Existential confusion about which scale is "them." Identity crisis is multidimensional.',

  advantages: 'Exist at all scales simultaneously. Can interact with anything by shifting perspective. Functionally immortal through recursion.',
};
```

**Interactions**:
- Normal-sized beings need magic to even perceive/communicate with extremes
- Tiny civilizations can live in your pocket
- Giants think you're imaginary
- Fractals cause headaches by existing

### 4.4 The Underworld, But Weirder

Your existing underworld realm, but with surreal literary additions.

```typescript
export interface LiteraryAfterlife {
  realm: 'underworld';

  // Standard death realm stuff exists, PLUS:
  literaryAdditions: {
    // Where unfinished stories go
    unresolved_narratives_chamber: {
      description: 'Characters who died before their story concluded',
      inhabitants: 'Frustrated protagonists seeking closure',
      atmosphere: 'Perpetual dramatic tension, unresolved',
    },

    // The Ellipsis Realm
    trailing_off_zone: {
      description: 'For those who died mid-sentence, or...',
      inhabitants: 'Incomplete souls, fading...',
      atmosphere: 'Everything is unfinished, fragmentary, ...',
    },

    // Metaphor Graveyard
    dead_metaphors: {
      description: 'Where overused metaphors go to die',
      inhabitants: 'Exhausted phrases, clichés too tired to mean anything',
      atmosphere: '"Dead as a doornail" "Pushing up daisies" etc. literally',
    },

    // The Library of Unwritten Books
    never_written: {
      description: 'Books that authors died before writing',
      inhabitants: 'Ghosts of potential stories, resentful at non-existence',
      atmosphere: 'Shelves of blank spines, pages that whisper what could have been',
    },

    // Punctuation Purgatory
    comma_splice_hell: {
      description: 'For those who abused punctuation in life',
      inhabitants: 'Souls tortured by their own grammatical errors',
      atmosphere: 'Sentences, run on forever, never ending, always continuing,',
    },
  },
};

// Special afterlife for different obsessive cultures:

const GASTROMANCER_AFTERLIFE = {
  name: 'The Eternal Kitchen',
  description: 'Heaven and hell in one - infinite ingredients but no recipe',
  torment: 'Can cook forever but never perfect a dish',
  reward: 'For the greatest chefs: their masterpiece preserved eternally',
};

const DUELIST_AFTERLIFE = {
  name: 'The Final Arena',
  description: 'Eternal tournament with all the greatest fighters',
  torment: 'Losing forever to superior opponents',
  reward: 'Fighting forever against worthy foes',
  note: 'Duelists can\'t tell if this is reward or torment',
};
```

**Integration**:
- Extends existing underworld realm with literary-specific zones
- Characters can visit these areas
- Unfinished stories can be completed, releasing souls
- Dead metaphors can be revived (with effort)
- Each obsessive culture has their own afterlife interpretation

---

## 5. The Mancers: Hyper-Specialized Magic Disciplines

Inspired by surreal fantasy's love of absurdly specialized magic practitioners. Each "-mancy" is a complete worldview, a way of perceiving reality through a single lens.

### 5.1 Bibliomancy - Book Magic

Magic derived from books themselves, not just reading them.

```typescript
export interface Bibliomancer {
  discipline: 'bibliomancy';

  // Power sources
  knownBooks: Map<string, BookPower>;  // Each book is a spell source
  librarySize: number;  // More books = more power

  // Techniques
  techniques: {
    page_turning: 'Reality advances one page',
    bookmarking: 'Save current state of reality',
    annotation: 'Edit reality through marginalia',
    indexing: 'Instantly locate anything cataloged',
    binding: 'Trap entities in books',
    unbinding: 'Release fictional characters',
  };

  // Limitations
  must_have_physical_book: boolean;  // Can't use kindle
  paper_cuts_are_magical_wounds: boolean;
  forbidden_to_burn_books: boolean;  // Taboo, causes backlash
}

export interface BookPower {
  title: string;
  genre: GenreType;
  wordCount: number;  // Longer = more power

  // Each book grants specific spells
  grantedAbilities: string[];

  // Quality matters
  proseQuality: number;  // Better writing = more reliable magic
  condition: 'pristine' | 'worn' | 'damaged' | 'falling_apart';
}

// Examples:
const EXAMPLES = {
  romance_novel: {
    grants: ['Love Charm', 'Create Dramatic Tension', 'Forced Coincidental Meeting'],
    power_level: 'moderate',
    risk: 'Everything becomes a love triangle',
  },
  dictionary: {
    grants: ['Define Reality (change word meanings)', 'Lexical Authority', 'Vocabulary Expansion'],
    power_level: 'very_high',
    risk: 'Lose ability to use words not in this dictionary',
  },
  cookbook: {
    grants: ['Transmute Ingredients', 'Perfect Recipe', 'Culinary Alchemy'],
    power_level: 'moderate',
    risk: 'Everything starts tasting like the current recipe',
  },
  blank_book: {
    grants: ['Write Reality', 'Create From Nothing', 'Unrestricted Authorship'],
    power_level: 'catastrophic',
    risk: 'Anything written becomes real - including mistakes, typos, intrusive thoughts',
  },
};
```

**Bibliomancer Society**:
- Carry massive libraries on their backs (magic makes it portable)
- Status = library size
- Book theft is capital crime
- Marriage involves merging libraries
- Conflicts fought by throwing heavy tomes

### 5.2 Onomancy - True Name Magic

Power through knowing the real names of things.

```typescript
export interface Onomancer {
  discipline: 'onomancy';

  // Core mechanic: everything has a true name
  knownNames: Map<Entity, TrueName>;

  // Powers scale with name knowledge
  powers: {
    command: 'Say true name = control entity',
    unbind: 'Rename something, change its nature',
    silence: 'Remove name = erase from existence',
    discover: 'Learn true name through ritual',
    hide_own_name: 'Protect self from other onomancers',
  };

  // Dangers
  speaking_true_names_aloud_is_dangerous: boolean;
  knowing_gods_names_attracts_attention: boolean;
  can_be_controlled_if_name_discovered: boolean;
}

export interface TrueName {
  // Names have multiple layers
  commonName: string;  // What everyone calls it
  trueName: string;    // Secret real name
  ancientName?: string;  // Even older, more powerful

  // Name properties
  syllables: number;  // Longer = more complex entity
  language: string;   // Primordial language of creation
  pronunciation_difficulty: number;

  // Speaking the name
  speaks_itself_into_existence: boolean;
  forbidden_to_write: boolean;
  burns_mortal_tongues: boolean;
}

// Examples:
const NAME_POWER_EXAMPLES = [
  {
    entity: 'Fire',
    common: 'fire',
    true: 'Ashkorath the Unconsumed Hunger',
    effect: 'Speak true name to command all flames within earshot',
    danger: 'Fire hears you permanently, may respond when you don\'t want it to',
  },
  {
    entity: 'Death',
    common: 'death',
    true: '[REDACTED - even writing it summons]',
    effect: 'Ultimate power over mortality',
    danger: 'Death takes offense, comes for you personally',
  },
  {
    entity: 'Yourself',
    common: 'whatever you go by',
    true: 'The name you don\'t remember from before birth',
    effect: 'Knowing own true name grants self-mastery',
    danger: 'Others can control you if they learn it',
  },
];
```

**Onomancer Society**:
- Speak in circumlocutions (avoid true names)
- Wear masks to hide identity
- Introductions are magical duels
- Babies hidden until properly named
- Nameless things are terrifying to them

### 5.3 Chronogramancy - Calendar Magic

Time manipulation through dates, calendars, and written chronology.

```typescript
export interface Chronogramancer {
  discipline: 'chronogramancy';

  // Calendar as reality control
  personalCalendar: Calendar;  // Their calendar becomes truth

  // Techniques
  techniques: {
    date_change: 'Declare it a different date, time shifts',
    appointment_binding: 'If written in calendar, must happen',
    deadline_curse: 'Set deadline, reality enforces it',
    schedule_manipulation: 'Rearrange event order',
    anniversary_power: 'Past events echo on their anniversaries',
  };

  // Limitations
  must_maintain_calendar: boolean;  // Miss an entry, lose a day
  obsessed_with_punctuality: boolean;
  cannot_be_spontaneous: boolean;
}

export interface ChronogramancySpell {
  name: string;
  calendarManipulation: string;
  effect: string;

  // Examples:
  examples: {
    'Rewind to Last Tuesday': {
      cast: 'Cross out today, write "Tuesday" again',
      effect: 'Time loops back to Tuesday',
      limit: 'Can only go back to days you wrote down',
    },

    'Deadline Curse': {
      cast: 'Write "X must happen by [date]" in calendar',
      effect: 'Reality enforces deadline, victim compelled to complete task',
      danger: 'If deadline passes unfulfilled, temporal backlash',
    },

    'Appointment Inevitability': {
      cast: 'Schedule meeting in calendar',
      effect: 'Both parties magically compelled to attend',
      caveat: 'Both must have agreed at some point, even unwillingly',
    },

    'Birthday Recursion': {
      cast: 'Celebrate birthday multiple times in calendar',
      effect: 'Age backwards/forwards with each celebration',
      danger: 'Aging is unpredictable, might become infant or ancient',
    },
  };
}
```

**Chronogramancer Society**:
- Entire lives scheduled decades in advance
- Wars fought by rescheduling each other's appointments
- Death = running out of blank calendar pages
- Spontaneous events cause existential panic
- Romance is contractual time-sharing

### 5.4 Typomancy - Mistake Magic

Power derived from errors, misspellings, and typos. The anti-perfection school.

```typescript
export interface Typomancer {
  discipline: 'typomancy';

  // Core philosophy: mistakes have power
  embraceError: true;
  perfectionism_is_weakness: true;

  // Techniques
  techniques: {
    creative_misspelling: 'Misspell word, change its nature',
    autocorrupt: 'Curse of constant typos',
    error_propagation: 'One mistake causes cascade',
    correction_curse: 'Make someone unable to fix mistakes',
    mistake_manifestation: 'Typos become real',
  };

  // Mechanics
  intentional_vs_accidental: {
    intentional_typo: 'Weak, you meant to do it',
    accidental_typo: 'Powerful, genuine mistake',
    freudian_slip: 'VERY powerful, reveals subconscious truth',
  };
}

// Examples of Typomantic Effects:
const TYPO_MAGIC = [
  {
    spell: 'Creative Misspelling',
    example: 'Write "fier" instead of "fire"',
    effect: 'Creates fier - like fire but screams',
    power: 'New entity, undefined by normal rules',
  },
  {
    spell: 'Autocorrupt Curse',
    example: 'Curse victim so everything they write has typos',
    effect: 'Reality shifts to match their typos',
    consequence: 'They write "I feel grate" → becomes cheese grater',
  },
  {
    spell: 'Manifest Mistake',
    example: 'Type "dragon" as "dargon"',
    effect: 'Dargon appears - dragon-like but wrong',
    description: 'Has backwards wings, breathes water, confused',
  },
  {
    spell: 'The Freudian Slip',
    example: 'Mean to write "I hate war" but write "I want war"',
    effect: 'Subconscious desire made manifest',
    danger: 'Reveals and enacts hidden truths',
  },
];
```

**Typomancer Society**:
- Considered heretics by other mancers
- Embrace chaos and error
- Sloppy spell-work is their art
- Cannot cast "perfect" spells (would violate philosophy)
- Extremely dangerous - unpredictable

### 5.5 Syntaxomancy - Grammar as Reality Control

Magic through sentence structure and grammatical rules.

```typescript
export interface Syntaxomancer {
  discipline: 'syntaxomancy';

  // Grammar = cosmic law
  understanding_of_syntax: number;

  // Core mechanic: sentence structure controls reality
  techniques: {
    subject_verb_object: 'Define who does what to whom',
    passive_voice: 'Remove agency, make things happen without cause',
    subjunctive_mood: 'Create hypothetical realities',
    imperative: 'Commands that reality must obey',
    conditional: 'If-then statements become magical contracts',
  };

  // Advanced techniques
  advanced: {
    dangling_modifier: 'Attribute properties to wrong entities',
    run_on_sentence: 'Connect unrelated events into causal chain',
    sentence_fragment: 'Incomplete reality, missing pieces',
    perfect_syntax: 'Grammatically flawless = magically unbreakable',
  };
}

// Syntaxomantic Spells:
const SYNTAX_SPELLS = [
  {
    name: 'Passive Voice Curse',
    structure: 'The door was opened (by whom?)',
    effect: 'Action happens without agent - causeless phenomena',
    example: '"The treasure was stolen" - it vanishes without thief',
  },
  {
    name: 'Subjunctive Reality',
    structure: 'If it were Tuesday, I would be king',
    effect: 'Creates conditional reality - if condition met, consequence follows',
    danger: 'Multiple conditionals create parallel realities',
  },
  {
    name: 'Imperative Command',
    structure: 'Be healed!',
    effect: 'Direct order to reality, no negotiation',
    requirement: 'Perfect grammar or it fails',
  },
  {
    name: 'Dangling Modifier',
    structure: 'Running quickly, the building was reached',
    effect: 'Modifier applies to wrong subject - building gains "running quickly"',
    result: 'Buildings can now run',
  },
];
```

**Syntaxomancer Society**:
- Grammar nazis taken to extreme
- Execution for split infinitives
- Speak in perfectly structured sentences only
- Cannot use slang (violates syntax rules)
- Wars fought with increasingly complex grammar

### 5.6 Rhetoricmancy - Persuasion Magic

Making false things true through perfect argumentation.

```typescript
export interface Rhetoricmancer {
  discipline: 'rhetoricmancy';

  // Core: persuasive enough argument makes it real
  charisma: number;
  debate_skill: number;

  // Techniques
  techniques: {
    logical_fallacy: 'Use fallacy to break logic itself',
    ad_hominem_attack: 'Attack person, damage them literally',
    strawman: 'Create fake person to argue against',
    slippery_slope: 'One small thing leads to catastrophe (magically enforced)',
    circular_reasoning: 'Prove A with B, prove B with A - creates paradox loop',
  };

  // Ultimate power
  ultimate: {
    name: 'Perfect Argument',
    effect: 'Argue something so well it becomes true',
    example: 'Convince reality that 2+2=5, and it does',
    limitation: 'Must convince witnesses, not just assert',
  };
}

// Rhetoricmantic Combat:
const DEBATE_SPELLS = [
  {
    technique: 'Ad Hominem',
    example: '"Your argument is weak because you are weak"',
    effect: 'Opponent physically weakens',
    counter: 'Point out the fallacy breaks the spell',
  },
  {
    technique: 'Strawman Summoning',
    example: 'Create exaggerated version of opponent\'s position',
    effect: 'Literal scarecrow appears representing fake argument',
    tactic: 'Destroy strawman, claim victory',
  },
  {
    technique: 'Slippery Slope Curse',
    example: '"If we allow this, next thing you know, chaos!"',
    effect: 'Magical chain reaction - one thing really does lead to catastrophe',
    danger: 'Self-fulfilling prophecy',
  },
  {
    technique: 'Circular Logic Trap',
    example: '"It\'s true because I said so, and I only say true things"',
    effect: 'Creates paradox loop that traps both debaters',
    escape: 'Someone must concede',
  },
];
```

**Rhetoricmancer Society**:
- Everything is debate
- Lawyers are warrior-priests
- Trials by argument (loser dies)
- Politics is actual combat
- Can argue black is white and make it stick

### 5.7 Silentomancy - Magic of the Unspoken

Power from what's left unsaid, implied, or censored.

```typescript
export interface Silentomancer {
  discipline: 'silentomancy';

  // Paradoxical: magic from NOT speaking
  vow_of_selective_silence: string[];  // Words they've forbidden themselves

  // Techniques
  techniques: {
    pregnant_pause: 'Silence between words has weight',
    unsaid_truth: 'What everyone thinks but doesn\'t say becomes real',
    censorship: 'Forbid word, it loses power',
    implication: 'Imply without stating, stronger than saying',
    redaction: 'Black out words, erase from reality',
  };

  // Advanced
  advanced: {
    'The Unspoken Name': 'Voldemort effect - unnamed thing gains power',
    'Deliberate Omission': 'Not mentioning something makes it disappear',
    'Subtext': 'What\'s really meant overpowers what\'s said',
  };
}

// Silentomantic Powers:
const SILENCE_MAGIC = [
  {
    spell: 'Pregnant Pause',
    cast: 'Pause mid-sentence...',
    effect: '... time stops during pause',
    duration: 'Until you finish sentence',
  },
  {
    spell: 'Censorship',
    cast: 'Declare word forbidden, black it out',
    effect: 'Anyone who says forbidden word is silenced',
    danger: 'Censor too many words, communication breaks down',
  },
  {
    spell: 'Subtext Supremacy',
    cast: 'Say one thing, mean another',
    effect: 'Literal meaning ignored, subtext becomes real',
    example: '"Nice weather" (meaning: I hate you) → opponent takes damage',
  },
  {
    spell: 'Deliberate Omission',
    cast: 'Recount events but skip one detail',
    effect: 'Omitted detail erased from history',
    limitation: 'Must be believed, witnesses must accept the story',
  },
];
```

**Silentomancer Society**:
- Vows of partial silence
- Communicate through implication
- Forbidden word lists miles long
- Reading between lines is literal skill
- Enemies destroyed by never mentioning them

### 5.8 Marginomancy - Footnote Magic

Power from annotations, footnotes, marginalia, and editorial apparatus.

```typescript
export interface Marginomancer {
  discipline: 'marginomancy';

  // Core: the margins are more real than the main text
  annotation_skill: number;

  // Techniques
  techniques: {
    footnote: 'Add footnote to reality for additional context',
    endnote: 'Defer consequences to end of chapter/life',
    asterisk: 'Mark something for later revision',
    sidebar: 'Create parallel reality in margins',
    appendix: 'Add supplementary material to existence',
  };

  // The Ultimate Marginomancy:
  ultimate: {
    'Become Annotation': 'Exist only in footnotes, immune to main-text effects',
    'Margin Walking': 'Travel through the white space around reality',
    'Editorial Authority': 'Add [sic] after someone\'s statement, marking it as error',
  };
}

// Marginomantic Abilities:
const MARGIN_MAGIC = [
  {
    spell: 'Footnote Insertion',
    cast: 'Add footnote to reality',
    example: 'Reality: "The hero saved the day*"',
    footnote: '*Actually the villain did it',
    effect: 'Footnote becomes true, main text is questioned',
  },
  {
    spell: 'Endnote Deferral',
    cast: 'Add endnote: "See note 47"',
    effect: 'Consequence delayed until you get to endnotes',
    danger: 'Endnotes eventually arrive, all at once',
  },
  {
    spell: 'Sidebar Reality',
    cast: 'Create parenthetical aside',
    effect: '(Meanwhile, in the sidebar, a parallel world exists)',
    use: 'Escape to margins, hide from main reality',
  },
  {
    spell: 'Editorial [sic]',
    cast: 'Add [sic] after someone speaks',
    effect: 'Marks their statement as error, weakens truth',
    example: '"I am king[sic]" → kingship becomes questionable',
  },
];
```

**Marginomancer Society**:
- Live in physical margins (edges of cities, borders)
- Obsessive annotators
- Reality is rough draft, they're the editors
- Comments in margins become actual commentary spirits
- Academic peer review is magical warfare

### 5.9 Somnomancy - Dream Magic

Power derived from dreams, sleep, and the boundary between waking and unconsciousness.

```typescript
export interface Somnomancer {
  discipline: 'somnomancy';

  // Must be partially asleep to cast
  consciousness_level: number;  // 0 = awake (powerless), 100 = deep sleep (max power)

  // Techniques
  techniques: {
    dream_walking: 'Enter others\' dreams physically',
    nightmare_weaving: 'Craft terrors that persist after waking',
    lucid_anchor: 'Make dreams solid and real',
    sleep_theft: 'Steal sleep from others, store it',
    wake_denial: 'Trap someone in eternal sleep',
    dream_logic: 'Apply dream physics to reality (things make no sense)',
  };

  // Paradox: more powerful when asleep, but can't act while asleep
  paradox: 'Must be drowsy/half-asleep to cast, but competent enough to focus';
}

// Dream Spells:
const DREAM_MAGIC = [
  {
    spell: 'Stolen Sleep',
    cast: 'Harvest sleep from exhausted beings',
    effect: 'Store sleep in bottles, sell to insomniacs',
    economy: 'Sleep black market, sleep debt collection',
  },
  {
    spell: 'Persistent Nightmare',
    cast: 'Weave nightmare that follows victim into waking',
    effect: 'Their fears become tangible during the day',
    danger: 'Nightmares can reproduce, infect others',
  },
  {
    spell: 'Dream Logic Reality',
    cast: 'Apply dream rules to area',
    effect: 'Physics becomes nonsensical - fly by flapping arms, run but go nowhere',
    duration: 'Until someone fully wakes up',
  },
  {
    spell: 'The Eternal Dream',
    cast: 'Trap someone in their own dream',
    effect: 'They sleep forever, living in perfect dream',
    ethics: 'Is this mercy or curse?',
  },
];
```

**Somnomancer Society**:
- Always drowsy, carry pillows everywhere
- Conduct business while napping
- Architecture designed for comfortable sleeping
- Wars fought by entering enemy generals' dreams
- Coffee is illegal (interferes with power)

### 5.10 Audiomancy - Sound Magic

Magic through music, noise, silence, and acoustic manipulation.

```typescript
export interface Audiomancer {
  discipline: 'audiomancy';

  perfect_pitch: boolean;  // Required
  hearing_range: number;   // Beyond human

  // Techniques
  techniques: {
    sonic_sculpting: 'Shape sound into solid objects',
    acoustic_weapon: 'Weaponized frequencies',
    resonance_shattering: 'Find resonant frequency, destroy anything',
    sound_recording: 'Capture sounds in crystals, replay infinitely',
    silence_zone: 'Area of absolute quiet',
    echo_multiplication: 'One sound becomes many',
    voice_theft: 'Steal someone\'s voice, use it yourself',
  };

  // Vulnerability
  vulnerability: 'Extremely sensitive to loud noises';
}

// Sound Spells:
const AUDIO_MAGIC = [
  {
    spell: 'Resonant Frequency',
    cast: 'Find unique frequency of any object',
    effect: 'Vibrate at that frequency = shatter it',
    example: 'Castle walls, bones, concepts of justice',
  },
  {
    spell: 'Sonic Sculpture',
    cast: 'Weave sounds into shapes',
    effect: 'Music becomes bridges, weapons, armor',
    limitation: 'Stops existing when music ends',
  },
  {
    spell: 'The Last Echo',
    cast: 'Capture dying words/sounds',
    effect: 'Replay final moments, interrogate echoes of the dead',
    market: 'Echo detectives solve murders',
  },
  {
    spell: 'Acoustic Pocket',
    cast: 'Create space where only certain sounds exist',
    use: 'Perfect concert halls, torture chambers of single note',
  },
];
```

**Audiomancer Society**:
- Communicate in pure tones
- Wear elaborate ear protection
- Architecture is all about acoustics
- Music is literal power source
- Deaf audiomancers are tragic figures (or terrifyingly dangerous - work by absence)

### 5.11 Umbramancy - Shadow Magic

Power over shadows, darkness, and the spaces between light.

```typescript
export interface Umbramancer {
  discipline: 'umbramancy';

  // Power scales with darkness
  power_level: 'proportional to ambient darkness';

  // Techniques
  techniques: {
    shadow_solidification: 'Make shadows tangible and solid',
    shade_walking: 'Travel through connected shadows',
    light_extinction: 'Extinguish light sources',
    shadow_puppet: 'Animate your shadow or others\' as servants',
    umbral_blade: 'Weapon made of pure darkness',
    shade_steal: 'Take someone\'s shadow, control them',
  };

  // The Shadow Paradox
  paradox: 'Need light to create shadows, but light weakens you';
}

// Shadow Spells:
const SHADOW_MAGIC = [
  {
    spell: 'Shadow Theft',
    cast: 'Cut someone\'s shadow free',
    effect: 'Victim has no shadow, becomes unreal',
    myth: 'Beings without shadows fade from memory',
  },
  {
    spell: 'Shade Walking',
    cast: 'Step into shadow, emerge from any other shadow',
    limitation: 'Shadows must be connected by line of sight',
    danger: 'Get lost in shadow-realm between shadows',
  },
  {
    spell: 'Living Darkness',
    cast: 'Animate shadow as independent being',
    effect: 'Shadow does your bidding but has own agenda',
    betrayal: 'Shadows know your secrets, might rebel',
  },
  {
    spell: 'Eclipse',
    cast: 'Summon absolute darkness',
    effect: 'Total light extinction in area',
    cost: 'Your own shadow consumed',
  },
];
```

**Umbramancer Society**:
- Nocturnal lifestyle
- Architecture blocks out sun
- Shadow servants do all daytime work
- Romance involves shadow-mingling
- Noon is their midnight (weakest time)

### 5.12 Aromancy - Scent Magic

Magic through smell, perfume, and olfactory manipulation.

```typescript
export interface Aromancer {
  discipline: 'aromancy';

  // Enhanced smell
  olfactory_sensitivity: number;  // Can smell emotions, lies, time periods

  // Techniques
  techniques: {
    scent_crafting: 'Create any smell from nothing',
    perfume_compulsion: 'Scents that control behavior',
    smell_memory: 'Scents trigger specific memories',
    odor_tracking: 'Follow any scent trail across time',
    stench_weapon: 'Weaponized horrible smells',
    scent_erasing: 'Remove your trail completely',
  };

  // Curse
  curse: 'Cannot turn off enhanced smell - experience world through nose';
}

// Scent Spells:
const AROMA_MAGIC = [
  {
    spell: 'Perfume of Compulsion',
    cast: 'Blend scent that controls emotions',
    effects: 'Love, fear, hunger, nostalgia on command',
    black_market: 'Illegal emotional manipulation',
  },
  {
    spell: 'Temporal Tracking',
    cast: 'Follow scent through time',
    effect: 'Smell what happened here yesterday, last week, decades ago',
    investigation: 'Crime scene analysis through historical smells',
  },
  {
    spell: 'The Stench',
    cast: 'Create unbearable odor',
    effect: 'Clears area, causes vomiting, unconsciousness',
    war: 'Stench bombs in warfare',
  },
  {
    spell: 'Scent Memory Lock',
    cast: 'Encode memories into smells',
    effect: 'Whiff of rose = remember entire day perfectly',
    storage: 'Library of scent-memories',
  },
];
```

**Aromancer Society**:
- Communicate through scent signals
- Leave scent messages (pheromone mail)
- Can smell lies, emotions, disease
- Perfume industry is their military-industrial complex
- Romance is entirely olfactory

### 5.13 Chromomancy - Color Magic

Power through colors, hues, and the spectrum of light.

```typescript
export interface Chromomancer {
  discipline: 'chromomancy';

  color_sight: 'See impossible colors, ultraviolet emotions, infrared intentions';

  // Techniques
  techniques: {
    color_stealing: 'Remove color from objects/beings',
    hue_shift: 'Change colors, change properties',
    chromatic_blade: 'Weapon of pure color',
    paint_reality: 'Paint things into existence',
    monochrome_zone: 'Area becomes single color',
    color_coding: 'Assign meanings to colors, enforce them',
  };

  // The Palette
  palette: {
    red: 'Passion, violence, heat',
    blue: 'Calm, cold, sadness',
    green: 'Growth, poison, envy',
    yellow: 'Joy, cowardice, sunlight',
    // Impossible colors
    octarine: 'The color of magic itself',
    infrablack: 'Blacker than black, absorbs meaning',
  };
}

// Color Spells:
const CHROMA_MAGIC = [
  {
    spell: 'Drain Color',
    cast: 'Remove all color from target',
    effect: 'Becomes grayscale, loses vitality and emotion',
    recovery: 'Must find their colors again',
  },
  {
    spell: 'Hue Shift',
    cast: 'Change object\'s color',
    deeper_effect: 'Changing color changes nature',
    example: 'Turn red rose blue = becomes cold and sad',
  },
  {
    spell: 'Paint the Real',
    cast: 'Whatever you paint becomes real',
    limitation: 'Quality of painting affects reality',
    danger: 'Bad artists create malformed realities',
  },
  {
    spell: 'Octarine Vision',
    cast: 'See the color of magic',
    effect: 'Perceive magical auras, spells, ley lines',
    madness: 'Too much octarine exposure causes synesthesia',
  },
];
```

**Chromomancer Society**:
- Entire social hierarchy based on color
- Can steal colors as punishment
- Grayscale beings are criminals/outcasts
- Fashion is literal power
- Artists are warrior-priests

### 5.14 Cartomancy - Map Magic

Magic through maps, geography, and spatial representation. NOT tarot - literal maps.

```typescript
export interface Cartomancer {
  discipline: 'cartomancy';

  // Core power: map is territory
  principle: 'Changes to map affect the place itself';

  // Techniques
  techniques: {
    map_editing: 'Edit map, edit reality',
    instant_travel: 'Fold map, bring places together',
    uncharted_creation: 'Draw new places into existence',
    cartographic_hiding: 'Erase from maps = become unfindable',
    scale_manipulation: 'Change map scale, change actual size',
    border_enforcement: 'Map borders become real barriers',
  };

  // Limitation
  limitation: 'Only works if you have accurate map';
}

// Map Spells:
const CARTO_MAGIC = [
  {
    spell: 'Map Editing',
    cast: 'Draw river on map',
    effect: 'River appears in reality',
    danger: 'Cartographic errors create real disasters',
  },
  {
    spell: 'Fold Space',
    cast: 'Fold map so two places touch',
    effect: 'Those places become adjacent in reality',
    travel: 'Instant transportation via origami',
  },
  {
    spell: 'Here Be Dragons',
    cast: 'Write warning on map',
    effect: 'Dragons actually appear there',
    history: 'Many map decorations became real',
  },
  {
    spell: 'Erasure',
    cast: 'Remove place from all maps',
    effect: 'Place becomes unfindable, questionably exists',
    exile: 'Ultimate punishment - removal from geography',
  },
];
```

**Cartomancer Society**:
- Obsessively accurate maps
- Cartographic wars (literal map battles)
- Can hide cities, move mountains, create islands
- Map forgery is treason
- Explorers are their prophets

### 5.15 Horolomancy - Clock Magic

Magic through time-keeping, clocks, and the measurement of hours.

```typescript
export interface Horolomancer {
  discipline: 'horolomancy';

  // Different from chronogramancy (which uses calendars)
  // Horolomancy is about CLOCKS and the MEASUREMENT of time

  techniques: {
    clock_stopping: 'Stop clock = stop time locally',
    hour_stealing: 'Take hours from one period, add elsewhere',
    temporal_precision: 'Control exactly when things happen',
    clock_rewinding: 'Turn back clock hands, turn back time',
    time_debt: 'Borrow time, must repay with interest',
    clockwork_curse: 'Target becomes mechanical, bound to schedule',
  };

  // Obsession
  obsession: 'Punctuality to the second';
}

// Clock Spells:
const HORO_MAGIC = [
  {
    spell: 'Stop the Clock',
    cast: 'Freeze all clocks in area',
    effect: 'Time stops for that area only',
    duration: 'Until you restart the clocks',
  },
  {
    spell: 'Hour Harvest',
    cast: 'Remove hours from day',
    effect: 'Day is now 21 hours, 3 hours stored for later',
    use: 'Insert extra hours when needed',
  },
  {
    spell: 'Clockwork Curse',
    cast: 'Target becomes bound to clock',
    effect: 'Must follow precise schedule or suffer pain',
    torture: 'Ultimate control through temporal tyranny',
  },
  {
    spell: 'Borrowed Time',
    cast: 'Take time from your future self',
    effect: 'Extra hours now, but owe them later',
    debt: 'Temporal debt collectors are terrifying',
  },
];
```

**Horolomancer Society**:
- Everything scheduled to the second
- Lateness is capital crime
- Carry hundreds of clocks
- Can't function without knowing exact time
- Spontaneity is incomprehensible

### 5.16 Iconography - Image & Symbol Magic

Magic through icons, symbols, pictographs, and visual representation.

```typescript
export interface Iconographer {
  discipline: 'iconography';

  // Symbols have power
  symbolic_language: Map<string, RealityEffect>;

  techniques: {
    sigil_crafting: 'Create symbols that enforce effects',
    icon_worship: 'Symbol gains power from belief',
    pictographic_reality: 'Draw simple picture, it becomes real',
    symbol_binding: 'Trap beings in symbols',
    icon_destruction: 'Destroy symbol = destroy what it represents',
    visual_shorthand: 'Replace reality with simplified icon',
  };
}

// Icon Spells:
const ICON_MAGIC = [
  {
    spell: 'Sigil Activation',
    cast: 'Draw symbol with intent',
    effect: 'Symbol enforces its meaning',
    example: 'Skull symbol = death, heart = love, eye = watchfulness',
  },
  {
    spell: 'Pictographic Summoning',
    cast: 'Draw stick figure of thing',
    effect: 'Simplified version appears',
    limitation: 'Quality of drawing determines quality of summon',
  },
  {
    spell: 'Symbol Prison',
    cast: 'Trap being in their own symbol',
    effect: 'They become flat, iconic, powerless',
    liberation: 'Must destroy all copies of symbol',
  },
  {
    spell: 'Icon Simplification',
    cast: 'Replace complex thing with simple icon',
    effect: 'Thing becomes as simple as its icon',
    danger: 'Accidentally simplify people into stick figures',
  },
];
```

**Iconographer Society**:
- Communicate through pictures
- Traffic signs have actual power
- Emojis are literal spell components
- Brand logos are territorial markers
- Graffiti is spiritual warfare

### 5.17 Mnemonimancy - Memory Magic

Magic through memories, remembering, and forgetting.

```typescript
export interface Mnemonimancer {
  discipline: 'mnemonimancy';

  techniques: {
    memory_extraction: 'Pull memories out as physical objects',
    selective_amnesia: 'Make target forget specific things',
    memory_implantation: 'Insert false memories',
    remembrance_forcing: 'Make someone unable to forget',
    memory_market: 'Buy and sell memories',
    memorial_resurrection: 'Being remembered strongly enough = resurrection',
  };

  // Curse
  curse: 'Remember everything perfectly, cannot forget';
}

// Memory Spells:
const MEMORY_MAGIC = [
  {
    spell: 'Memory Extraction',
    cast: 'Pull memory from skull',
    effect: 'Memory becomes glowing orb',
    market: 'Memories bought/sold as entertainment',
  },
  {
    spell: 'Targeted Amnesia',
    cast: 'Erase specific memory',
    use: 'Forget trauma, forget crimes, forget people',
    ethics: 'Identity erasure as punishment',
  },
  {
    spell: 'False Memory',
    cast: 'Implant memory of event that never happened',
    effect: 'Victim believes it completely',
    gaslighting: 'Ultimate manipulation',
  },
  {
    spell: 'Memorial Resurrection',
    cast: 'Remember someone intensely enough',
    effect: 'They reconstitute from collective memory',
    limitation: 'Resurrected version is as people remember, not as they were',
  },
];
```

**Mnemonimancer Society**:
- Perfect memory of everything
- Cannot forget painful moments
- Memory trading is main economy
- Forgetting is illegal
- Alzheimer's is their apocalypse

### 5.18 Echomancy - Echo & Repetition Magic

Magic through echoes, repetition, copying, and doubling.

```typescript
export interface Echomancer {
  discipline: 'echomancy';

  techniques: {
    echo_amplification: 'One thing becomes many copies',
    recursive_loop: 'Action repeats infinitely',
    reverberation: 'Past events echo into present',
    copy_casting: 'Duplicate anything',
    echo_listening: 'Hear echoes of past conversations',
    infinite_reflection: 'Create endless mirrors of reality',
  };

  // Danger
  danger: 'Easy to create infinite loops, crash reality';
}

// Echo Spells:
const ECHO_MAGIC = [
  {
    spell: 'Multiplication',
    cast: 'Echo one object',
    effect: 'Creates copies - 1, 2, 4, 8, 16...',
    danger: 'Hard to stop, exponential',
  },
  {
    spell: 'Temporal Echo',
    cast: 'Make past event echo into present',
    effect: 'Yesterday\'s battle repeats as ghost',
    haunting: 'Historic trauma echoes forever',
  },
  {
    spell: 'Infinite Loop',
    cast: 'Trap target in repeating action',
    effect: 'They do same thing forever',
    escape: 'Someone must break pattern from outside',
  },
  {
    spell: 'Echo Location',
    cast: 'Listen for echoes of past sounds',
    effect: 'Hear conversations from days/years ago',
    archaeology: 'Acoustic time travel',
  },
];
```

**Echomancer Society**:
- Speak in repeated phrases
- Architecture amplifies echoes
- Can't stop repeating themselves
- Copy themselves frequently
- Identity crisis: which one is original?

### 5.19 Blasphemancy - Curse & Profanity Magic

Magic through swearing, cursing, blasphemy, and taboo words.

```typescript
export interface Blasphemancer {
  discipline: 'blasphemancy';

  // Power from forbidden words
  taboo_vocabulary: Set<string>;  // The more forbidden, the more powerful

  techniques: {
    profane_blast: 'Swear with magical force',
    curse_weaving: 'String curses into complex spells',
    blasphemy_shield: 'Sacred beings can\'t approach',
    taboo_breaking: 'Violate taboos for power spike',
    linguistic_pollution: 'Corrupt pure language',
    sacred_inversion: 'Turn holy words into weapons',
  };

  // Social cost
  social_cost: 'Constantly offending everyone';
}

// Blasphemy Spells:
const BLASPHEMY_MAGIC = [
  {
    spell: 'The Profane Blast',
    cast: 'Swear with magical intent',
    effect: 'Physical force proportional to vulgarity',
    power: 'More offensive = more powerful',
  },
  {
    spell: 'Curse Chain',
    cast: 'String together elaborate curses',
    effect: 'Complex multi-part spell from profanity',
    art: 'Cursing as high art',
  },
  {
    spell: 'Blasphemy Barrier',
    cast: 'Utter supreme blasphemy',
    effect: 'Divine beings cannot cross',
    danger: 'Also attracts their attention',
  },
  {
    spell: 'Taboo Shattering',
    cast: 'Break sacred taboo for power',
    effect: 'Massive temporary boost',
    cost: 'Social exile, divine wrath',
  },
];
```

**Blasphemancer Society**:
- Constantly swearing
- Church's nightmare
- Offensive language is scripture
- Politeness is weakness
- Cannot be around children

### 5.20 Integration with Magic System

All "-mancy" disciplines integrate as **Paradigms** in the existing magic system:

```typescript
export const MANCER_PARADIGMS = {
  // Language-Based
  bibliomancy: {
    source: 'written',
    channelMethod: 'reading_aloud',
    costs: ['book_degradation', 'mana'],
    laws: ['cannot_destroy_books', 'literacy_required'],
  },

  onomancy: {
    source: 'true_names',
    channelMethod: 'speaking_names',
    costs: ['revealing_own_name', 'mana'],
    laws: ['name_reciprocity', 'pronunciation_must_be_perfect'],
  },

  chronogramancy: {
    source: 'calendars',
    channelMethod: 'calendar_manipulation',
    costs: ['personal_time', 'mana'],
    laws: ['must_maintain_calendar', 'cannot_violate_written_schedule'],
  },

  typomancy: {
    source: 'mistakes',
    channelMethod: 'intentional_error',
    costs: ['unpredictability', 'sanity'],
    laws: ['no_perfection', 'errors_propagate'],
  },

  syntaxomancy: {
    source: 'grammar',
    channelMethod: 'perfect_syntax',
    costs: ['linguistic_rigidity', 'mana'],
    laws: ['must_follow_grammar_rules', 'incomplete_sentences_fail'],
  },

  rhetoricmancy: {
    source: 'persuasion',
    channelMethod: 'debate',
    costs: ['credibility', 'mana'],
    laws: ['must_convince_witnesses', 'fallacies_are_dangerous'],
  },

  silentomancy: {
    source: 'unsaid_words',
    channelMethod: 'strategic_silence',
    costs: ['vocabulary_loss', 'mana'],
    laws: ['forbidden_words_multiply', 'cannot_break_silence'],
  },

  marginomancy: {
    source: 'annotations',
    channelMethod: 'footnoting',
    costs: ['becoming_peripheral', 'mana'],
    laws: ['must_reference_main_text', 'margins_are_fragile'],
  },

  blasphemancy: {
    source: 'taboo_words',
    channelMethod: 'profanity',
    costs: ['social_exile', 'divine_wrath'],
    laws: ['more_offensive_more_powerful', 'attracts_attention'],
  },

  // Sensory-Based
  somnomancy: {
    source: 'dreams',
    channelMethod: 'half_sleep',
    costs: ['consciousness', 'sleep_debt'],
    laws: ['must_be_drowsy', 'coffee_interferes'],
  },

  audiomancy: {
    source: 'sound',
    channelMethod: 'perfect_pitch',
    costs: ['hearing_damage', 'mana'],
    laws: ['vulnerable_to_noise', 'must_maintain_pitch'],
  },

  umbramancy: {
    source: 'shadows',
    channelMethod: 'darkness_channeling',
    costs: ['own_shadow', 'mana'],
    laws: ['need_light_for_shadows', 'weakened_by_daylight'],
  },

  aromancy: {
    source: 'scents',
    channelMethod: 'olfactory_focus',
    costs: ['olfactory_overload', 'mana'],
    laws: ['cannot_turn_off_smell', 'scent_trails_permanent'],
  },

  chromomancy: {
    source: 'colors',
    channelMethod: 'chromatic_manipulation',
    costs: ['color_blindness_risk', 'mana'],
    laws: ['changing_color_changes_nature', 'grayscale_is_death'],
  },

  // Spatial/Temporal
  cartomancy: {
    source: 'maps',
    channelMethod: 'cartographic_editing',
    costs: ['geographic_instability', 'mana'],
    laws: ['map_must_be_accurate', 'changes_affect_reality'],
  },

  horolomancy: {
    source: 'clocks',
    channelMethod: 'temporal_precision',
    costs: ['time_debt', 'mana'],
    laws: ['absolute_punctuality', 'borrowed_time_has_interest'],
  },

  // Mental/Abstract
  mnemonimancy: {
    source: 'memories',
    channelMethod: 'recollection',
    costs: ['cannot_forget', 'identity_fragmentation'],
    laws: ['perfect_memory_mandatory', 'memories_can_be_traded'],
  },

  echomancy: {
    source: 'repetition',
    channelMethod: 'echo_amplification',
    costs: ['infinite_loops', 'identity_confusion'],
    laws: ['easy_to_lose_control', 'exponential_growth'],
  },

  iconography: {
    source: 'symbols',
    channelMethod: 'sigil_drawing',
    costs: ['simplification_risk', 'mana'],
    laws: ['destroy_symbol_destroy_thing', 'emojis_are_power'],
  },
};

// Paradigm Interactions & Conflicts:
export const PARADIGM_SYNERGIES = {
  // Strong synergies
  powerful_combinations: [
    ['bibliomancy', 'onomancy'],  // Books + names = ultimate knowledge
    ['typomancy', 'syntaxomancy'],  // Chaos + order = reality manipulation
    ['umbramancy', 'somnomancy'],  // Shadow + dreams = nightmare realm
    ['audiomancy', 'echomancy'],  // Sound + repetition = infinite resonance
    ['chromomancy', 'iconography'],  // Color + symbols = visual magic supreme
    ['cartomancy', 'horolomancy'],  // Space + time = dimensional mastery
  ],

  // Dangerous conflicts
  incompatible_pairs: [
    ['silentomancy', 'rhetoricmancy'],  // Silence vs speech
    ['typomancy', 'syntaxomancy'],  // Chaos vs perfection (also synergy - paradox!)
    ['somnomancy', 'horolomancy'],  // Dreams vs schedules
    ['blasphemancy', 'onomancy'],  // Profanity vs sacred names
  ],

  // Neutral but weird
  strange_combinations: [
    ['aromancy', 'blasphemancy'],  // Smells + swearing = olfactory offenses
    ['mnemonimancy', 'silentomancy'],  // Remember everything + speak nothing
    ['chronogramancy', 'echomancy'],  // Calendars + repetition = temporal loops
  ],
};
```

---

## 5.21 Cross-System Integration: How Literary Magic Interacts With Everything

This section details how all 19 "-mancer" disciplines and literary surrealism features integrate with existing game systems.

### Integration with Body System

**Body Magic + Literary Magic Synergies**:

```typescript
export interface BodyLiteraryInteraction {
  // Onomancers can use true names of body parts
  onomancy_body: {
    example: 'Learn true name of "heart" → command all hearts',
    danger: 'Know your own organs\' names = self-surgery via command',
  };

  // Typomancers create biological typos
  typomancy_body: {
    example: 'Misspell "arm" as "amr" → limb mutates into something wrong',
    effect: 'Intentional mutation through spelling errors',
  };

  // Somnomancers affect sleep-based body functions
  somnomancy_body: {
    example: 'Heal while sleeping, growth during dreams',
    synergy: 'Body magic + dream magic = accelerated regeneration',
  };

  // Umbramancers and physical shadows
  umbramancy_body: {
    example: 'Body casts shadow → shadow can be stolen',
    effect: 'Shadowless beings have compromised physiology',
    disease: 'Shadow sickness - body rejects missing shadow',
  };

  // Aromancers smell diseases, genetics, emotions
  aromancy_body: {
    example: 'Smell cancer, pregnancy, poison, bloodline',
    medical: 'Diagnostic medicine through scent',
  };

  // Chromomancers and skin color
  chromomancy_body: {
    example: 'Change skin color → change body properties',
    effect: 'Blue skin = cold resistance, red = heat affinity',
  };
}
```

### Integration with Divinity System

**Gods, Deities, and Literary Magic**:

```typescript
export interface DivineLiteraryInteraction {
  // Onomancy is EXTREMELY dangerous with gods
  onomancy_divine: {
    knowing_gods_true_name: 'Ultimate power or instant death',
    gods_hide_names: 'Divine anonymity is survival',
    theophany: 'Speaking god\'s name summons them',
  };

  // Bibliomancy with holy texts
  bibliomancy_divine: {
    sacred_books: 'Religious texts grant divine-tier magic',
    blasphemy_risk: 'Editing holy book = edit religion itself',
    book_of_gods: 'Gods have their own books, contain them',
  };

  // Blasphemancy vs Deities
  blasphemancy_divine: {
    profanity_against_gods: 'Blasphemy as anti-divine magic',
    protection: 'Gods cannot approach during supreme blasphemy',
    consequence: 'Divine retribution inevitable',
  };

  // Iconography and divine symbols
  iconography_divine: {
    holy_symbols: 'Divine icons channel god power',
    destroy_symbol: 'Destroying god\'s symbol weakens them',
    worship_mechanics: 'Icons focus collective belief',
  };

  // Mnemonimancy and divine memory
  mnemonimancy_divine: {
    remembered_gods: 'Forgotten gods can be resurrected via memory',
    divine_amnesia: 'Make mortals forget a god = god weakens',
    collective_memory: 'Gods exist in cultural memory',
  };
}
```

### Integration with Alien Species

**Aliens + Literary Magic**:

```typescript
export interface AlienLiteraryInteraction {
  // Communication barriers
  linguistic_challenges: {
    onomancy: 'Alien true names are unpronounceable',
    syntaxomancy: 'Alien grammar breaks human syntax magic',
    silentomancy: 'Telepathic aliens have no "unspoken" - all is spoken',
    bibliomancy: 'Alien books don\'t work for humans (incompatible)',
  };

  // Unique alien interactions
  alien_advantages: {
    chromomancy: 'Aliens see different color spectra',
    aromancy: 'Aliens smell in chemical dimensions',
    audiomancy: 'Ultrasonic/infrasonic alien communication',
    somnomancy: 'Aliens with different sleep cycles',
  };

  // Biological incompatibilities
  alien_biology: {
    umbramancy: 'Multi-dimensional aliens cast impossible shadows',
    echomancy: 'Hive-mind aliens echo thoughts not sounds',
    typomancy: 'Alien DNA typos create xenomorphic mutations',
  };
}
```

### Integration with Hive Minds

**Collective Consciousness + Literary Magic**:

```typescript
export interface HiveMindLiteraryInteraction {
  // Hive minds break individual-focused magic
  problematic_for_hive: {
    onomancy: 'Hive has no individual names, collective name controls all',
    mnemonimancy: 'Shared memory - extract from one = extract from all',
    silentomancy: 'No "unspoken" in hive mind, all thoughts shared',
    blasphemancy: 'Collective belief dampens individual offense',
  };

  // Hive minds amplify collective magic
  powerful_with_hive: {
    echomancy: 'Hive mind is MADE of echoes/repetition',
    rhetoricmancy: 'Collective argument has massive weight',
    iconography: 'Shared symbols bind hive together',
    audiomancy: 'Harmonic chorus of thousands',
  };

  // Unique hive phenomena
  hive_specific: {
    collective_dreaming: 'Somnomancy affects entire hive simultaneously',
    shared_calendar: 'Chronogramancy for collective schedules',
    group_shadow: 'Umbramancy - hive casts one massive shadow',
    consensus_reality: 'Rhetoricmancy - if hive agrees, it\'s true',
  };
}
```

### Integration with Existing Magic Paradigms

**Cross-Paradigm Synergies**:

```typescript
export interface MagicParadigmCrossover {
  // Animism + Literary Magic
  animist_literary: {
    bibliomancy: 'Books have spirits that can be negotiated with',
    onomancy: 'Spirit names are their true names',
    iconography: 'Totems and symbols as spirit anchors',
    aromancy: 'Spirits have distinct scents',
  };

  // Dimensional Magic + Literary Magic
  dimensional_literary: {
    cartomancy: 'Maps of other dimensions',
    marginomancy: 'Margins between realities',
    typomancy: 'Dimensional typos create pocket universes',
    somnomancy: 'Dreams are dimensional spaces',
  };

  // Silence Magic + Literary Magic
  silence_literary: {
    conflict: 'Silence vs all language-based mancies',
    synergy_silentomancy: 'Double silence = absolute erasure',
    bibliomancy_opposition: 'Silent books are powerless',
  };

  // Body Magic + Literary Magic
  body_literary: {
    typomancy_mutation: 'Biological typos',
    onomancy_anatomy: 'True names of organs',
    syntaxomancy_physiology: 'Grammar controls body functions',
    chromomancy_blood: 'Blood color magic',
  };

  // Dream Magic + Literary Magic
  dream_literary: {
    somnomancy_amplification: 'Double dream power',
    bibliomancy_dreams: 'Dream journals are spell sources',
    typomancy_nightmares: 'Dream typos create surreal nightmares',
    iconography_dreams: 'Dream symbols manifest',
  };
}
```

### Integration with Species System

**Species-Specific Literary Magic Affinities**:

```typescript
export interface SpeciesLiteraryAffinity {
  // Some species are naturally better at certain mancies
  species_bonuses: {
    // Chimeric species (from Section 4)
    sharkbear: {
      strong_in: ['typomancy'],  // They ARE biological typos
      weak_in: ['syntaxomancy'],  // Grammar can't describe them
    },

    lambion: {
      strong_in: ['echomancy'],  // Self-similar, fractal nature
      weak_in: ['onomancy'],  // Contradictory names
    },

    // Monomaniacal cultures (from Section 4)
    gastromancers: {
      strong_in: ['aromancy', 'bibliomancy'],  // Smell food, read recipes
      weak_in: ['silentomancy'],  // Cannot stop talking about food
    },

    duelists: {
      strong_in: ['rhetoricmancy', 'blasphemancy'],  // Combat rhetoric
      weak_in: ['somnomancy'],  // Always alert
    },

    nomenclaturists: {
      strong_in: ['onomancy', 'bibliomancy', 'iconography'],  // Naming obsession
      weak_in: ['typomancy'],  // Cannot tolerate errors
    },

    // Scale extremes (from Section 4)
    infinitesimites: {
      strong_in: ['marginomancy'],  // Live in margins already
      weak_in: ['cartomancy'],  // Too small to affect maps
    },

    colossals: {
      strong_in: ['echomancy', 'audiomancy'],  // Massive sound
      weak_in: ['bibliomancy'],  // Can't read tiny books
    },

    syllable_people: {
      strong_in: ['audiomancy', 'onomancy'],  // Live in words
      weak_in: ['silentomancy'],  // Die in silence
    },
  };

  // New species emerge from literary magic
  emergent_species: {
    word_beings: 'Born from bibliomancy experiments',
    shadow_folk: 'Umbramancy accidents create shadow people',
    dream_refugees: 'Somnomancy victims trapped in waking world',
    typo_creatures: 'Typomancy creates entire species by mistake',
  };
}
```

### Integration with Agent Needs & Behavior

**How Literary Magic Affects Daily Life**:

```typescript
export interface AgentLiteraryNeeds {
  // New needs created by literary magic
  new_needs: {
    bibliomancers: {
      book_hunger: 'Must read daily or lose power',
      paper_cut_healing: 'Treat magical wounds from books',
    },

    onomancers: {
      name_anxiety: 'Fear of someone learning your name',
      circumlocution_fatigue: 'Exhausting to avoid names',
    },

    somnomancers: {
      sleep_debt: 'Owe sleep to others',
      drowsiness_maintenance: 'Must stay partially asleep',
    },

    chromomancers: {
      color_starvation: 'Need exposure to diverse colors',
      grayscale_depression: 'Lose colors = lose emotions',
    },

    mnemonimancers: {
      memory_overload: 'Cannot forget, storage issues',
      amnesia_withdrawal: 'Addicted to forgetting',
    },
  };

  // Modified behaviors
  behavior_changes: {
    horolomancers: 'All actions scheduled, no spontaneity',
    cartomancers: 'Obsessively map everywhere',
    echomancers: 'Repeat themselves constantly',
    blasphemancers: 'Offend everyone automatically',
    aromancers: 'Navigate by smell, not sight',
  };

  // Social interaction changes
  social_modifications: {
    rhetoricmancers: 'Everything is debate',
    silentomancers: 'Communicate through implication',
    iconographers: 'Draw instead of speak',
    marginomancers: 'Live on edges, periphery',
  };
}
```

### Integration with Settlement/Building System

**Literary Magic Buildings & Districts**:

```typescript
export interface LiterarySettlements {
  // Mancer-specific buildings needed
  specialized_buildings: {
    bibliomancer_library: {
      function: 'Store spell-books, power source',
      danger: 'Flammable = catastrophic',
      defense: 'Book-based wards',
    },

    onomancer_vault: {
      function: 'Store true names securely',
      security: 'Highest level, unbreakable',
      threat: 'If breached, total control loss',
    },

    somnomancer_dormitory: {
      function: 'Communal dreaming, dream walking',
      schedule: 'Operates 24/7, always someone asleep',
      export: 'Bottled sleep for trade',
    },

    chromomancer_studio: {
      function: 'Paint reality, color storage',
      appearance: 'Blindingly colorful',
      market: 'Stolen colors for sale',
    },

    cartomancer_planning_office: {
      function: 'Edit city via maps',
      power: 'Urban planning is literal magic',
      danger: 'Map errors = building collapses',
    },

    horolomancer_clock_tower: {
      function: 'Time regulation for district',
      control: 'Sets time for area',
      breakdown: 'Malfunction = temporal chaos',
    },

    audiomancer_concert_hall: {
      function: 'Sonic warfare, sound capture',
      acoustics: 'Perfect resonance',
      weapon: 'Brown note as defense',
    },

    mnemonimancer_archive: {
      function: 'Memory storage and trading',
      ethics: 'Controversial memory market',
      loss: 'Fire = historical amnesia',
    },
  };

  // Mixed-mancer districts
  literary_quarters: {
    word_district: {
      inhabitants: ['bibliomancers', 'onomancers', 'syntaxomancers'],
      atmosphere: 'Floating words, literal text everywhere',
      danger: 'Uncontrolled metaphors',
    },

    sensory_quarter: {
      inhabitants: ['aromancers', 'audiomancers', 'chromomancers'],
      atmosphere: 'Overwhelming to senses',
      tourism: 'Intense but brief visits',
    },

    temporal_enclave: {
      inhabitants: ['chronogramancers', 'horolomancers', 'mnemonimancers'],
      atmosphere: 'Time flows strangely',
      confusion: 'Outsiders lose track of when',
    },

    shadow_slums: {
      inhabitants: ['umbramancers', 'somnomancers', 'silentomancers'],
      atmosphere: 'Dark, quiet, dreamlike',
      nocturnal: 'Active at night only',
    },
  };
}
```

### Integration Summary

**Key Integration Points**:

1. **Every "-mancy" is a full Magic Paradigm** → plugs into existing spell system
2. **Species get affinities** → some races naturally excel at certain mancies
3. **Deities interact** → gods have opinions on different mancies, some are forbidden
4. **Bodies affected** → physical forms interact with literary magic
5. **Hive minds** → collective consciousness changes magic dynamics
6. **Aliens** → xenolinguistics creates barriers and opportunities
7. **Settlements need infrastructure** → each mancy requires specific buildings
8. **Agent behaviors modified** → needs, goals, and social interactions change
9. **Cross-paradigm effects** → existing magic + literary magic = new phenomena

This creates an **interconnected ecosystem** where literary surrealism isn't isolated but woven throughout the entire game.

---

## 6. Story Leakage

Fictional entities escaping into reality.

### 6.1 Unfinished Characters

```typescript
export interface UnfinishedCharacter {
  name: string;
  sourceStory: string;  // What narrative they escaped from
  completionPercent: number;  // 0-100

  // What's written vs what's missing
  definedTraits: string[];
  undefinedAspects: string[];

  // Behavior
  seekingCompletion: boolean;  // Trying to get author to finish them
  becomingReal: boolean;  // Accumulating reality through experience
}

// Example:
const PROTAGONIST_SKETCH: UnfinishedCharacter = {
  name: 'The Hero (unnamed)',
  sourceStory: 'Abandoned novel from 1873',
  completionPercent: 32,

  definedTraits: [
    'Brave',
    'Tall',
    'Has a sword (but sword is vague, sometimes changes)',
  ],

  undefinedAspects: [
    'Face is blur - author never described',
    'Motivation unknown',
    'Backstory is just "TK TK fill in later"',
    'Hands sometimes disappear when not in use',
  ],

  seekingCompletion: true,
  becomingReal: true,  // Slowly defining self through lived experience
};
```

**Mechanics**:
- Interact with incomplete beings
- They might ask you to "write them better"
- Undefined aspects cause glitches (hand disappears mid-handshake)
- Can be completed through ritual authorship
- Some prefer remaining sketches - definition is limiting

### 6.2 Genre Contamination

Stories leak their genre into surrounding reality.

```typescript
export interface GenreAura {
  genre: 'romance' | 'horror' | 'noir' | 'comedy' | 'western' | 'cosmic_horror';
  radius: number;
  strength: number;

  effects: {
    physics?: string;
    mood?: string;
    dialogue?: string;
    probability?: string;
  };
}

// Horror Genre Aura:
const HORROR_CONTAMINATION: GenreAura = {
  genre: 'horror',
  radius: 50,
  strength: 0.7,

  effects: {
    physics: 'Shadows move independently, cold spots appear',
    mood: 'Dread and paranoia increase',
    dialogue: 'Everyone speaks in ominous foreshadowing',
    probability: 'Murphy\'s law intensified - everything goes wrong',
  },
};

// Romance Genre Aura:
const ROMANCE_CONTAMINATION: GenreAura = {
  genre: 'romance',
  radius: 30,
  strength: 0.5,

  effects: {
    physics: 'Soft focus lighting, wind tousles hair dramatically',
    mood: 'Heightened emotions, passionate declarations',
    dialogue: 'Everyone speaks in double entendres',
    probability: 'Coincidental meetings increase',
  },
};
```

**Effects**:
- Entire districts contaminated by single genre
- Horror district: unsafe at night, eldritch geometry
- Romance quarter: constant weddings, love triangles, dramatic misunderstandings
- Noir alley: everyone in trench coats, moral ambiguity, rain
- Comedy courtyard: pratfalls unavoidable, pies materialize

---

## 7. Reality Editing

The idea that reality is written text that can be revised.

### 7.1 Editorial Magic

```typescript
export interface RealityEdit {
  editType: 'insert' | 'delete' | 'replace' | 'annotate' | 'strikethrough';
  target: Entity | Location | Event;

  // What you're changing
  originalText: string;
  revisedText: string;

  // Difficulty
  resistance: number;  // How hard reality resists editing
  consequenceRisk: number;  // Unintended side effects
}

// Example edits:
const EXAMPLES = [
  {
    editType: 'replace',
    original: 'The door was locked',
    revised: 'The door was open',
    difficulty: 'Easy',
    consequence: 'Who opened it? Where did they go?',
  },
  {
    editType: 'delete',
    original: 'The guard stood watch',
    revised: '',
    difficulty: 'Moderate',
    consequence: 'Guard might still exist in limbo, angry',
  },
  {
    editType: 'insert',
    original: 'There was nothing in the room',
    revised: 'There was a dragon in the room',
    difficulty: 'Very Hard',
    consequence: 'Dragon now exists and is confused/angry',
  },
];
```

**Track Changes Mode**:
- Reality shows edit history
- Can see what was written before
- Strikethrough text still partially real
- Comments in margins become actual marginalia entities
- "Accept all changes" is catastrophic

### 7.2 Narrative Immunity

Some beings are "protagonists" and have plot armor.

```typescript
export interface PlotArmor {
  protagonistLevel: 'extra' | 'supporting' | 'deuteragonist' | 'protagonist' | 'chosen_one';

  immunities: string[];

  compulsions: string[];  // Plot demands you do certain things

  fatePoints: number;  // Spend to avoid death
}

// A Protagonist:
const HERO: PlotArmor = {
  protagonistLevel: 'protagonist',

  immunities: [
    'Cannot die before story resolves',
    'Unlikely coincidences favor them',
    'Last-minute rescues',
    'Villain monologues instead of killing immediately',
  ],

  compulsions: [
    'Must investigate mysterious noises',
    'Cannot ignore cry for help',
    'Drawn toward central conflict',
    'Makes dramatic speeches',
  ],

  fatePoints: 7,
};
```

**Mechanics**:
- Become protagonist through narrative weight
- Plot armor makes you unkillable but not unbeatable
- Story demands you follow certain patterns
- Can only be killed at narratively appropriate moments
- Supporting characters die easily

---

## 8. Integration with Existing Systems

### 8.1 Magic System Extension

Add **Literary Paradigm** that works through:
- Perfect prose (quality of writing determines power)
- Metaphor weaponization
- Punctuation as ritual components
- Genre manipulation
- Reality editing

Integrates with existing paradigms:
- Compatible with **Narrative** (both story-based)
- Compatible with **Dream** (similar surreal logic)
- Compatible with **Dimensional** (non-euclidean spaces)
- Conflicts with **Silence** (requires language)

### 8.2 Component Architecture

```typescript
// New components using existing patterns:

export interface LiteraryComponent extends ComponentBase {
  readonly type: 'literary';

  literacyLevel: number;  // How well they read/write
  proseQuality: number;  // Writing skill
  metaphorResistance: number;  // Resist literalization
  editorialPower: number;  // Can edit reality
  narrativeRole: 'extra' | 'supporting' | 'protagonist';
}

export interface GenreContaminationComponent extends ComponentBase {
  readonly type: 'genre_contamination';

  affectedByGenre: GenreType | null;
  contaminationLevel: number;  // 0-100
  resistanceRoll: number;  // Can they snap out of it
}

export interface AbstractEntityComponent extends ComponentBase {
  readonly type: 'abstract_entity';

  conceptType: 'emotion' | 'number' | 'color' | 'day' | 'idea';
  conceptName: string;
  tangibility: number;  // How physical vs abstract
}
```

### 8.3 Building System Extension

Special building types:
- **Narrative-Structured Buildings**: Follow story arcs
- **Impossible Libraries**: Contain themselves, infinite recursion
- **Genre-Contaminated Districts**: Whole areas affected
- **Editorial Workshops**: Where reality is revised
- **Metaphor Forges**: Where literal metaphors are crafted

### 8.4 Realm System Extension

New realm types:
- **The Margins**: Space between written lines, where incomplete stories live
- **The Footnotes**: Underground realm of clarifications and citations
- **The Typo Void**: Where mistakes go, chaotic and misspelled
- **The First Draft**: Unstable proto-reality that's constantly revised

---

## Dependencies & Integration

### Depends On (Prerequisites)
These systems must be implemented before this spec:
- **Entity Component System** - Foundation for word entities and abstract concepts
- **Physics System** - For word momentum and collision mechanics
- **Conversation System** - For capturing and literalizing spoken metaphors

### Integrates With (Parallel Systems)
These systems work alongside this spec:
- **Magic System** - Word-based spells and linguistic magic paradigms
- **Building System** - Narrative structures and impossible geometry buildings

### Enables (Dependent Systems)
These systems build on top of this spec:
- **Dimensional Ascension (Orchestrator Mode)** - Reality editing capabilities for high-level gods
- **Surrealist Game Modes** - Narrative-driven gameplay with metaphor mechanics
- **Procedural Story Generation** - Living narratives that affect the physical world

---

## 9. Implementation Checklist

### Phase 1: Word Physics Foundation
- [ ] Define `WordEntityComponent` extending `ComponentBase` with type `'word_entity'`
- [ ] Add `wordText`, `mass`, `emotionalWeight`, `semanticDensity` fields
- [ ] Implement `calculateWordMass()` function based on emotional weight and length
- [ ] Create `WordPhysicsSystem` extending System class
- [ ] Add synonym attraction force calculations (inverse square law)
- [ ] Add antonym repulsion force calculations
- [ ] Integrate with existing physics/velocity systems
- [ ] Create word entities as droppable items with ItemComponent
- [ ] Add visual rendering for floating word text in renderer
- [ ] Write unit tests for mass calculations
- [ ] Write integration tests for word-word interactions

**Dependencies:** None (foundational phase)

**Integration Points:**
- Existing ItemComponent for droppable words
- Physics/velocity systems for movement
- Renderer for visual representation

**Testing Requirements:**
- Unit test: Heavy words (melancholy, burden) have mass > 10
- Unit test: Light words (joy, whisper) have mass < 3
- Integration test: Drop "melancholy", verify floor dent via terrain modification
- Integration test: Place "love" near "hate", verify repulsion force

---

### Phase 2: Metaphor Engine
- [ ] Define `MetaphorComponent` with type `'metaphor'`
- [ ] Add `metaphorPattern`, `literalEffect`, `triggerProbability` fields
- [ ] Create metaphor pattern registry with common metaphors
- [ ] Implement `MetaphorDetectionSystem` to scan agent speech/actions
- [ ] Add pattern matching logic (regex-based for common phrases)
- [ ] Create `MetaphorLiteralizationSystem`
- [ ] Implement effect application logic (sharp → cutting damage, burning → fire status)
- [ ] Hook into existing magic system as new effect type
- [ ] Add metaphor probability calculations (rarity, power level)
- [ ] Create metaphor effect registry with consequences
- [ ] Add metaphor status effects (MetaphorActiveComponent)
- [ ] Write unit tests for pattern matching
- [ ] Write integration tests for literalization effects

**Dependencies:** Phase 1 (word entities foundation)

**Integration Points:**
- Existing MagicSystem for effect application
- Agent speech/action systems for detection
- StatusEffectComponent for active metaphors
- Combat system for damage application

**Testing Requirements:**
- Unit test: Pattern "sharp as [X]" matches correctly
- Unit test: "Burning with anger" triggers fire effect with 30% probability
- Integration test: Agent says "sharp as a tack", gains +5 cutting damage
- Integration test: Metaphor effects stack correctly with existing magic

---

### Phase 3: Punctuation Magic
- [ ] Define `PunctuationMarkComponent` with type `'punctuation_mark'`
- [ ] Add `markType` enum (period, comma, exclamation, question, etc.)
- [ ] Add `powerLevel`, `effectType`, `radius` fields
- [ ] Create punctuation effect registry
- [ ] Implement period → pause time effect
- [ ] Implement exclamation → amplify 3x effect
- [ ] Implement question mark → uncertainty/probability field
- [ ] Implement em-dash → cutting damage
- [ ] Implement ellipsis → fade/transparency
- [ ] Add CalligraphySkillComponent for drawing precision
- [ ] Create `PunctuationMagicSystem` for effect application
- [ ] Integrate with spell casting system
- [ ] Add visual effects for drawn punctuation marks
- [ ] Write unit tests for each punctuation type
- [ ] Write integration tests with combat and magic systems

**Dependencies:** None (independent system)

**Integration Points:**
- Existing MagicSystem for spell augmentation
- Combat system for em-dash cutting damage
- Skill system for calligraphy skill
- Renderer for visual punctuation marks

**Testing Requirements:**
- Unit test: Exclamation mark amplifies spell power by 3x
- Unit test: Em-dash deals cutting damage based on calligraphy skill
- Integration test: Cast fireball with exclamation mark, verify 3x damage
- Integration test: Draw period near combat, verify time pause effect

---

### Phase 4: Narrative Buildings
- [ ] Define `NarrativeStructureComponent` with type `'narrative_structure'`
- [ ] Add `plotStructure` enum (tragedy, comedy, romance, mystery, etc.)
- [ ] Add `currentBeat`, `beatsRequired`, `genrePhysics` fields
- [ ] Create narrative structure templates (3-act, 5-act, hero's journey)
- [ ] Extend BuildingComponent with optional narrative structure
- [ ] Create `NarrativeNavigationSystem`
- [ ] Implement room-by-room plot beat progression
- [ ] Add genre-specific physics modifiers per room
- [ ] Prevent skipping to later beats (locked doors until beat complete)
- [ ] Implement tragedy tower: rising action → climax → catastrophic fall
- [ ] Implement comedy cottage: setup → complications → resolution
- [ ] Implement mystery mansion: clues → investigation → revelation
- [ ] Add genre mood effects on agents inside building
- [ ] Write unit tests for plot beat progression
- [ ] Write integration tests for complete narrative traversal

**Dependencies:** Understanding of existing BuildingSystem

**Integration Points:**
- Existing BuildingSystem and BuildingComponent
- Room/floor navigation systems
- Physics system for genre-specific modifications
- Agent mood/behavior systems

**Testing Requirements:**
- Unit test: Tragedy tower has 5 required beats in correct order
- Unit test: Cannot enter resolution room without completing climax
- Integration test: Walk through tragedy tower, verify forced progression
- Integration test: Genre physics affects agent behavior correctly

---

### Phase 5: Living Abstractions
- [ ] Define `AbstractEntityComponent` with type `'abstract_entity'`
- [ ] Add `conceptType` enum (emotion, number, color, day, idea)
- [ ] Add `conceptName`, `tangibility`, `influenceRadius` fields
- [ ] Create emotion entities (regret, joy, love, anger, etc.)
- [ ] Create concept beings (Tuesday, Seven, Blue, etc.)
- [ ] Implement `AbstractEntitySystem` for behavior
- [ ] Add influence aura effects (Tuesday makes it Tuesday)
- [ ] Create interaction mechanics (can talk to emotions)
- [ ] Add tradeable abstract commodities (buying/selling emotions)
- [ ] Implement tangibility spectrum (0=pure concept, 100=physical)
- [ ] Create spawning rules for abstract entities
- [ ] Add visual rendering for semi-tangible beings
- [ ] Integrate with economy system for emotion trading
- [ ] Write unit tests for abstract entity behaviors
- [ ] Write integration tests for concept influence

**Dependencies:** Entity/component system understanding

**Integration Points:**
- Existing Entity and ComponentBase
- Economy/trade systems
- Calendar/time systems (for day-of-week entities)
- Renderer for abstract visualization

**Testing Requirements:**
- Unit test: Tuesday entity changes local calendar to Tuesday
- Unit test: Regret entity causes mood debuff in radius
- Integration test: Trade 5 units of Joy for 10 gold
- Integration test: Multiple abstract entities interact correctly

---

### Phase 6: Story Leakage
- [ ] Define `IncompleteBeingComponent` with type `'incomplete_being'`
- [ ] Add `completionLevel`, `missingParts`, `seekingCompletion` fields
- [ ] Define `GenreContaminationComponent` with type `'genre_contamination'`
- [ ] Add `genre`, `intensity`, `contamRadius`, `resistanceRoll` fields
- [ ] Create incomplete character entities (blurred faces, missing motivations)
- [ ] Implement `StoryLeakageSystem`
- [ ] Add genre contamination spreading mechanics
- [ ] Implement contamination effects on physics (noir makes it rainy)
- [ ] Implement contamination effects on mood (romance makes people sappy)
- [ ] Create unfinished being AI behaviors (seeking plot completion)
- [ ] Add completion quest mechanics for incomplete beings
- [ ] Implement genre resistance rolls for agents
- [ ] Add visual effects for contamination auras
- [ ] Write unit tests for contamination spreading
- [ ] Write integration tests for genre effects

**Dependencies:** Phase 5 (abstract entities foundation)

**Integration Points:**
- Existing AI/behavior systems
- Physics system for genre modifications
- Agent mood systems
- Quest/objective systems

**Testing Requirements:**
- Unit test: Noir contamination reduces visibility and adds rain
- Unit test: Incomplete protagonist seeks plot resolution
- Integration test: Genre contamination spreads over time to nearby agents
- Integration test: Agent with high resistance resists contamination

---

### Phase 7: Reality Editing
- [ ] Define `EditorialMarkComponent` with type `'editorial_mark'`
- [ ] Add `editType` (strikethrough, insertion, correction, annotation)
- [ ] Add `targetEntity`, `oldValue`, `newValue`, `editPower` fields
- [ ] Create `RealityEditingSystem`
- [ ] Implement strikethrough deletion (erase entities)
- [ ] Implement insertion addition (add new properties)
- [ ] Implement correction modification (change entity state)
- [ ] Add reality resistance calculations (important things resist edits)
- [ ] Implement unintended consequences generation
- [ ] Add edit history tracking (undo stack)
- [ ] Create editorial magic spells
- [ ] Add visual "track changes" rendering
- [ ] Implement narrative consistency checks
- [ ] Add catastrophic edit failures (reality rejects impossible edits)
- [ ] Write unit tests for each edit type
- [ ] Write integration tests for consequences

**Dependencies:** All previous phases (uses all systems)

**Integration Points:**
- All existing components (can edit anything)
- MagicSystem for editorial spells
- Persistence system for edit history
- Renderer for track changes visualization

**Testing Requirements:**
- Unit test: Edit "door locked" to "door open" succeeds
- Unit test: Edit deity properties fails with high resistance
- Integration test: Strikethrough entity removes it from world
- Integration test: Unintended consequences spawn correctly

---

### Phase 8: Advanced Integration
- [ ] Define `PlotArmorComponent` with type `'plot_armor'`
- [ ] Add `narrativeImportance`, `protectionLevel`, `plotThread` fields
- [ ] Define `NarrativeRoleComponent` with type `'narrative_role'`
- [ ] Add `role` enum (protagonist, antagonist, mentor, comic relief, etc.)
- [ ] Implement plot armor invulnerability mechanics
- [ ] Create protagonist death = story rewrite system
- [ ] Add narrative role-based behavior modifiers
- [ ] Create new realm: The Margins (between-lines space)
- [ ] Create new realm: The Footnotes (underground clarifications)
- [ ] Create new realm: The Typo Void (chaotic misspellings)
- [ ] Create new realm: The First Draft (unstable proto-reality)
- [ ] Implement realm transitions for literary realms
- [ ] Add cross-system interaction testing
- [ ] Create complete literary ecosystem integration
- [ ] Write comprehensive integration tests

**Dependencies:** Most other phases (brings everything together)

**Integration Points:**
- Existing RealmSystem for new realms
- DeathTransitionSystem for plot armor
- All previous literary systems

**Testing Requirements:**
- Integration test: Protagonist with plot armor survives lethal damage
- Integration test: Travel to The Margins, verify unique properties
- Integration test: All literary systems work together in single scenario
- Integration test: Complete gameplay loop with all features enabled

---

## Research Questions

- **NLP Integration:** Which NLP library works best with TypeScript for metaphor detection? Consider compromise-ts, natural, or calling Python NLP via subprocess
- **Performance:** How many word entities can exist simultaneously before performance degrades? Test with 100, 1000, 10000 words
- **Metaphor Ambiguity:** How to handle metaphors that could literalize in multiple ways? Use probability distribution or context analysis?
- **Genre Stacking:** What happens when multiple genre contaminations overlap? Priority system or blended effects?
- **Edit Conflicts:** How to resolve simultaneous reality edits to the same entity? Last-write-wins, merge, or reject?
- **Realm Navigation:** How do agents discover and travel to literary realms? Special portals, death conditions, or narrative triggers?
- **Abstraction Limits:** How abstract can entities become before they're unplayable? Define minimum tangibility threshold
- **Save/Load:** How do reality edits persist across save/load cycles? Store edit history in save file?

---

## Performance Considerations

- **Word Entity Limits:** Cap active word entities at 500 simultaneously
- **Metaphor Detection:** Only scan recent agent speech (last 10 utterances) to avoid processing overhead
- **Genre Contamination:** Use spatial partitioning for contamination spread calculations
- **Reality Edits:** Limit edit history depth to prevent memory bloat (max 100 edits)
- **Literary Realms:** Load on-demand, not all simultaneously

---

## Backward Compatibility Notes

- All new components extend existing ComponentBase with proper type strings
- Literary systems are optional additions, don't break existing gameplay
- Can enable/disable literary features via universe configuration
- Existing magic system remains functional without literary extensions
- Save files from pre-literary versions load correctly (components ignored if missing)

---

## Summary

This spec creates a surreal literary magic system focused on:

1. **Language as physics** - Words have mass, metaphors are literal, punctuation is power
2. **Narrative architecture** - Buildings follow story logic, impossible spaces
3. **Living abstractions** - Emotions, concepts, and days of the week are tangible
4. **Story leakage** - Fictional beings escape, genre contamination spreads
5. **Reality editing** - The world is text that can be revised

**Not copying specific Zamonia elements**, but capturing that vibe:
- Surreal
- Literary
- Physics follows narrative logic
- Language has power
- Reality is mutable through wordcraft
- Strange and whimsical in equal measure

Everything integrates with existing architecture through established patterns.
