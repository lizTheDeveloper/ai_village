/**
 * Research Paper Metadata & UI Elements
 *
 * Author names, publication details, visual themes, and other UI elements
 * for displaying research papers in libraries and menus.
 */

export interface PaperAuthor {
  name: string;
  title?: string;
  affiliation?: string;
  yearsActive?: string;
  notableFor?: string;
  fate?: string; // What happened to them (often amusing/tragic)
}

export interface PaperVisualTheme {
  coverColor: string;
  illustration?: string;
  condition: 'pristine' | 'worn' | 'damaged' | 'restored' | 'ancient';
  bindingType: 'leather' | 'cloth' | 'scroll' | 'tablet' | 'vellum';
  hasIllustrations: boolean;
  illustrationStyle?: string;
}

export interface PaperMetadata {
  paperId: string;
  authors: PaperAuthor[];
  keywords: string[];
  publicationYear?: string; // In-game calendar
  citationCount?: number; // How many other papers reference this
  visualTheme: PaperVisualTheme;
  readingExperience: string; // Flavor text for the reading UI
  warnings?: string[]; // Safety warnings, trigger warnings, etc.
}

// ============================================================================
// AGRICULTURE PAPER AUTHORS
// ============================================================================

export const AGRICULTURE_AUTHORS: Record<string, PaperAuthor[]> = {
  seed_selection: [
    {
      name: 'Agrarian Thumpwhistle',
      title: 'Master Gardener',
      affiliation: 'The Verdant Society',
      yearsActive: '234-267 AF',
      notableFor: 'Revolutionary seed taxonomy; invented the seed-rating system',
      fate: 'Died peacefully surrounded by seventeen varieties of tomatoes'
    }
  ],

  soil_preparation: [
    {
      name: 'The Soil Whisperer',
      affiliation: 'Self-taught',
      notableFor: 'Living in a hole for twelve years to better understand soil',
      fate: 'Emerged from hole, wrote this, returned to hole. Current whereabouts unknown.'
    }
  ],

  irrigation_principles: [
    {
      name: 'Professor Hydrus Flowmore',
      title: 'Doctor of Aquatic Engineering',
      affiliation: 'The University of Practical Applications',
      yearsActive: '289-331 AF',
      notableFor: 'The famous beard that contained farming implements',
      fate: 'Retired to a self-designed water garden of remarkable complexity'
    }
  ],

  fertilization_theory: [
    {
      name: 'Anonymous',
      affiliation: 'The Agricultural Academy',
      notableFor: 'Tactful discussion of an indelicate topic',
      fate: 'Identity sealed to protect professional reputation'
    }
  ],

  crop_rotation: [
    {
      name: 'Rotation McKenzie',
      title: 'Field Marshal',
      affiliation: 'The Four-Field Institute',
      yearsActive: '312-359 AF',
      notableFor: 'Could count to four reliably under pressure',
      fate: 'Founded a school of agriculture; students still rotating crops to this day'
    }
  ],

  climate_control: [
    {
      name: 'Glasswright Temperton',
      title: 'Master Builder & Botanist',
      affiliation: 'The Greenhouse Collective',
      yearsActive: '344-389 AF',
      notableFor: 'Built the first successful year-round greenhouse',
      fate: 'Accidentally locked themselves in their own greenhouse for three weeks; emerged healthier than ever'
    }
  ],

  year_round_growing: [
    {
      name: 'Perpetua Harvest',
      title: 'Grandmaster of Continuous Cultivation',
      affiliation: 'The Eternal Garden',
      yearsActive: '371-Present',
      notableFor: 'Has not stopped growing food for forty-seven consecutive years',
      fate: 'Still alive, still growing, refuses to retire despite pleas from worried family'
    }
  ],
};

// ============================================================================
// METALLURGY PAPER AUTHORS
// ============================================================================

export const METALLURGY_AUTHORS: Record<string, PaperAuthor[]> = {
  ore_identification: [
    {
      name: 'Rockford Stonefinder',
      title: 'Geologist & Frustrated Mining Consultant',
      affiliation: 'The Guild of Correct Rock Identification',
      yearsActive: '198-245 AF',
      notableFor: 'Cataloging every rock miners tried to smelt',
      fate: 'Died of exasperation watching someone attempt to smelt limestone. Again.'
    }
  ],

  smelting_fundamentals: [
    {
      name: 'Smelter Davidson',
      title: 'Master of the Hot Arts',
      affiliation: 'The Forge Brotherhood',
      notableFor: 'Simple explanations and extensive burn scars',
      fate: 'Retired after losing count of apprentice-related fires'
    }
  ],

  iron_working: [
    {
      name: 'Ferrus Ironwright',
      title: 'Smith Extraordinaire',
      affiliation: 'The Anvil Academy',
      yearsActive: '267-314 AF',
      notableFor: 'The brother-in-law mentioned in the footnotes',
      fate: 'Opened successful smithy; brother-in-law still stubborn'
    }
  ],

  carbon_infusion: [
    {
      name: 'Doctor Charcoal Blackwood',
      title: 'Alchemist & Metallurgist',
      affiliation: 'The Carbon Institute',
      yearsActive: '298-345 AF',
      notableFor: 'Seventeen years of failed experiments before two successes',
      fate: 'Celebrated for three days, spent three years trying to replicate results, eventually succeeded'
    }
  ],

  quenching_theory: [
    {
      name: 'Tempest Coolwater',
      title: 'Master of Thermal Dynamics',
      affiliation: 'The Quenching Society',
      yearsActive: '331-378 AF',
      notableFor: 'Elegant prose about dunking hot metal in cold water',
      fate: 'Metaphors unclear; results excellent'
    }
  ],

  alloy_theory: [
    {
      name: 'Mixmaster Alloysius',
      title: 'Theoretical Metallurgist',
      affiliation: 'The Combination Collective',
      yearsActive: '356-403 AF',
      notableFor: 'Testing every metal combination imaginable',
      fate: 'Created bronze accidentally, claimed it was intentional, fooled everyone'
    }
  ],

  legendary_metallurgy: [
    {
      name: 'The Smith of Whispers',
      affiliation: 'Unknown',
      notableFor: 'Harmonic forging technique; legendary blades; mysterious identity',
      fate: 'Disappeared mysteriously; some say they became one with the metal; their blades endure'
    }
  ],
};

// ============================================================================
// ALCHEMY PAPER AUTHORS
// ============================================================================

export const ALCHEMY_AUTHORS: Record<string, PaperAuthor[]> = {
  substance_identification: [
    {
      name: 'Taster Formerly-Known-As-Brave',
      title: 'Survived Alchemist',
      affiliation: 'The School of Hard Lessons',
      notableFor: 'Learning not to taste things through painful experience',
      fate: 'Alive, somehow, but won\'t taste anything ever again'
    }
  ],

  extraction_methods: [
    {
      name: 'Distiller Purefind',
      title: 'Master of Separation',
      affiliation: 'The Essence Society',
      yearsActive: '276-323 AF',
      notableFor: 'Useful apparatus diagrams and persistent complaints',
      fate: 'Eventually achieved perfect purity; immediately retired, exhausted'
    }
  ],

  mixture_theory: [
    {
      name: 'Professor Combustia Reactionworth',
      title: 'Experimental Chemist',
      affiliation: 'The Institute of Controlled Chaos',
      yearsActive: '301-349 AF',
      notableFor: 'Categorizing things that explode',
      fate: 'Retired to write; lab rebuilt three times during their tenure'
    }
  ],

  potion_formulation: [
    {
      name: 'Benefica Brewmaster',
      title: 'Pharmacologist',
      affiliation: 'The Healing Arts Collective',
      yearsActive: '334-381 AF',
      notableFor: 'Dosage tables that saved countless lives',
      fate: 'Experimentation methods ethically questionable but pragmatically effective'
    }
  ],

  transmutation_principles: [
    {
      name: 'Goldseeker Leadbane',
      title: 'Ambitious Alchemist',
      affiliation: 'The House of Transformation',
      yearsActive: '367-414 AF',
      notableFor: 'Two successful transmutations in 1,247 attempts',
      fate: 'Published anyway; honesty refreshing; still trying to replicate results'
    }
  ],

  grand_alchemy: [
    {
      name: 'The Last Alchemist',
      affiliation: 'The Unified Tradition',
      notableFor: 'Synthesizing all alchemical knowledge; philosophical approach',
      fate: 'Identity mysterious; title suggests finality or arrogance or both'
    }
  ],
};

// ============================================================================
// RUNE MAGIC PAPER AUTHORS
// ============================================================================

export const RUNE_MAGIC_AUTHORS: Record<string, PaperAuthor[]> = {
  symbol_recognition: [
    {
      name: '[Name Redacted - Explosive Signature]',
      affiliation: 'The Rune-Keepers\' Guild',
      yearsActive: '412-459 AF',
      notableFor: 'Practical safety protocols; unfortunate signature',
      fate: 'Name removed from all copies after signature incident; continues research under pseudonym'
    }
  ],

  carving_fundamentals: [
    {
      name: 'Chisel Carvewell',
      title: 'Instructor of Careful Cutting',
      affiliation: 'The Academy of Controlled Marks',
      yearsActive: '438-485 AF',
      notableFor: 'Extensive bandage collection; practical approach',
      fate: 'Missing three fingers; considers this acceptable tuition for knowledge gained'
    }
  ],

  material_sympathies: [
    {
      name: 'Wanderer Substancefinder',
      title: 'Traveling Researcher',
      affiliation: 'Independent',
      yearsActive: '451-498 AF',
      notableFor: 'Testing runes on 247 materials; questionable judgment',
      fate: 'Banned from seventeen research institutions; published anyway'
    }
  ],

  rune_combinations: [
    {
      name: 'Sequentia Ordersworth',
      title: 'Combinatorial Runemaster',
      affiliation: 'The Grammar Institute',
      yearsActive: '473-520 AF',
      notableFor: 'Mapping 73 forbidden combinations; surviving the research',
      fate: 'Retired after final experiment; lab still quarantined'
    }
  ],

  activation_methods: [
    {
      name: 'Trigger Wakesmith',
      title: 'Master of Animation',
      affiliation: 'The Activation Academy',
      yearsActive: '501-548 AF',
      notableFor: 'Taxonomizing activation methods; extensive apologies to municipalities',
      fate: 'Banned from three cities; welcomed in all others for sharing knowledge'
    }
  ],

  elder_runes: [
    {
      name: '[Identity Sealed Under Three Spells]',
      affiliation: '[Classified]',
      notableFor: 'Cataloging elder runes; surviving with 26.6% casualty rate',
      fate: 'Identity sealed for safety; shadow now independent researcher'
    }
  ],
};

// ============================================================================
// VISUAL THEMES
// ============================================================================

export const PAPER_VISUAL_THEMES: Record<string, PaperVisualTheme> = {
  // Agriculture
  seed_selection: {
    coverColor: 'earth-brown',
    illustration: 'Hand-drawn seeds with magnifying glass',
    condition: 'worn',
    bindingType: 'leather',
    hasIllustrations: true,
    illustrationStyle: 'botanical-sketch'
  },

  // Metallurgy
  iron_working: {
    coverColor: 'iron-gray',
    illustration: 'Crossed hammer and anvil',
    condition: 'pristine',
    bindingType: 'leather',
    hasIllustrations: true,
    illustrationStyle: 'technical-diagram'
  },

  // Alchemy
  transmutation_principles: {
    coverColor: 'gold-and-lead',
    illustration: 'Ouroboros surrounding transformation circle',
    condition: 'worn',
    bindingType: 'vellum',
    hasIllustrations: true,
    illustrationStyle: 'alchemical-symbol'
  },

  // Rune Magic
  elder_runes: {
    coverColor: 'void-black',
    illustration: 'Single elder rune (safe to view)',
    condition: 'ancient',
    bindingType: 'vellum', // Ancient but identifiable
    hasIllustrations: false, // Too dangerous
    illustrationStyle: 'none'
  },
};

// ============================================================================
// READING EXPERIENCES
// ============================================================================

export const READING_EXPERIENCES: Record<string, string> = {
  seed_selection: 'The pages smell faintly of soil and summer. Practical diagrams fill the margins.',

  soil_preparation: 'Written in cramped handwriting with occasional dirt smudges. Surprisingly comprehensive.',

  elder_runes: 'The text seems to shift when you\'re not looking directly at it. The room feels colder. You hear distant whispers in a language you almost understand.',

  transmutation_principles: 'Seventeen years of failed experiments documented with increasing frustration and eventual jubilation. Inspiring and exhausting.',
};

// ============================================================================
// PAPER WARNINGS
// ============================================================================

export const PAPER_WARNINGS: Record<string, string[]> = {
  elder_runes: [
    'Do not read aloud',
    'Do not attempt to carve described symbols without supervision',
    'Reading this paper may attract unwanted attention',
    'Keep away from children and anyone without proper training',
    'Casualties: 73.4% of researchers'
  ],

  rune_combinations: [
    'Contains descriptions of forbidden combinations',
    'Do not attempt combinations marked "under no circumstances"',
    'If you think "but what if...", the answer is no'
  ],

  transmutation_principles: [
    'Success rate: 0.16%',
    'Do not attempt without proper laboratory',
    'May induce existential questions about identity and continuity'
  ],
};
