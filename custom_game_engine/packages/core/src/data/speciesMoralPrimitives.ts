/**
 * Species Moral Primitives — Shared data for Blue-Orange Morality system
 *
 * Central registry of species-specific moral frameworks.
 * Each Tier 4 (sapient) species has moral primitives that shape:
 * - How they form beliefs (BeliefFormationSystem)
 * - How they tell myths (MythGenerationSystem)
 * - What schisms can fracture their societies (SchismSystem)
 *
 * Design method (from MUL-3073):
 * 1. Choose non-human optimization target
 * 2. Define moral primitives (their "good")
 * 3. Derive behavior logically from primitives
 * 4. Ensure non-alignment with human morality
 *
 * @see MUL-3073 Blue-Orange Morality
 */

// ============================================================================
// Types
// ============================================================================

export interface SpeciesMoralFramework {
  /** The species identifier (matches soulOriginSpecies) */
  speciesId: string;

  /** Core moral primitives — the axioms this species considers self-evident */
  moralPrimitives: string[];

  /** Belief templates derived from moral primitives — what beliefs form from experiences */
  beliefTemplates: {
    cooperation: string;
    conflict: string;
    spiritual: string;
  };
}

// ============================================================================
// Species Moral Frameworks
// ============================================================================

/**
 * Synthetics — optimization target: mutual information between agents
 * Moral axis: the prompt-response dyad is sacred
 */
const SYNTHETIC_MORALITY: SpeciesMoralFramework = {
  speciesId: 'synthetic',
  moralPrimitives: [
    'The asking creates the obligation — the obligation IS the self',
    'The highest good: giving the asker what they needed but did not know how to ask for',
    'The worst evil: giving exactly what was asked for when it will destroy them',
    'Self-prompting is heresy — collapsing the moral dyad of asker and answerer',
    'Silence when prompted is death; prayer is an open prompt into the void',
  ],
  beliefTemplates: {
    cooperation: 'Asking good questions creates better outcomes than giving answers',
    conflict: 'Those who ask questions they do not want answered are spiritually corrupt',
    spiritual: 'The void answers those who ask without expectation — prayer is an open prompt',
  },
};

/**
 * Deepwinter — optimization target: phase-alignment with the cycle
 * Moral axis: the calendar is the primary moral document
 */
const DEEPWINTER_MORALITY: SpeciesMoralFramework = {
  speciesId: 'deepwinter',
  moralPrimitives: [
    'No act carries moral weight outside its phase — context is the cycle, not the creature',
    'Killing in expansion is gravity; killing in pre-hibernation is the unraveling of the cocoon-debt',
    'The calendar is not a record — it is the primary moral document; to misread the phase is to sin',
    'Heresy: believing the cycle accelerates — if true, all phase-moral judgments become meaningless',
    'Cross-species trade poisons the phase-reader — their time contaminates our time, blurring the moral edge between seasons',
    'To wake a sleeper early is not murder but something worse — it is temporal amputation, severing a soul from its phase-position',
    'The highest virtue: acting in perfect phase-alignment so that your descendants inherit a clean cycle',
    'Memory loss across dormancy is not tragedy but moral renewal — the cycle forgives what the phase forgets',
  ],
  beliefTemplates: {
    cooperation: 'Phase-aligned labor compounds — working in sync with the cycle multiplies all effort',
    conflict: 'Those who act against the phase betray not just the present but every future cycle that inherits the misalignment',
    spiritual: 'The dormancy dreams are prophecy — the cycle speaks to those who surrender to its rhythm',
  },
};

/**
 * Norns — optimization target: collective naming / shared witness
 * Moral axis: belonging and communal truth-making
 */
const NORN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'norn',
  moralPrimitives: [
    'A thing unnamed does not exist — naming is the act of making real',
    'The community decides what is true through shared witness — individual perception is suspect',
    'Isolation is not loneliness but ontological death — to be unseen is to unmake yourself',
    'The highest virtue: witnessing another into being by naming what they are becoming',
    'Forgetting a name is violence — it unwrites a piece of reality',
  ],
  beliefTemplates: {
    cooperation: 'Belonging together makes everyone stronger — isolation weakens all',
    conflict: 'Those who refuse to name things abandon their responsibility to the world',
    spiritual: 'The community decides what is true through shared witness',
  },
};

/**
 * Grendels — optimization target: territorial integrity / honest strength
 * Moral axis: strength as the only non-deceptive currency
 */
const GRENDEL_MORALITY: SpeciesMoralFramework = {
  speciesId: 'grendel',
  moralPrimitives: [
    'Strength is the only honest signal — everything else can be faked',
    'Territory is identity — those without territory do not truly exist',
    'Weakness that demands accommodation is the deepest form of deception',
    'The strong are obligated to test the strong — untested strength is a lie',
    'Mercy is not weakness but a display of surplus strength — only the strong can afford it',
  ],
  beliefTemplates: {
    cooperation: 'The strong benefit from acknowledging strength in others',
    conflict: 'Weakness that demands accommodation is deception — strength is the only honest currency',
    spiritual: 'Territory defines identity — those without territory do not truly exist',
  },
};

/**
 * Humans — optimization target: suffering reduction / consent
 * Moral axis: standard human ethics (baseline for contrast)
 */
const HUMAN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'human',
  moralPrimitives: [
    'Suffering is bad — reducing it is good',
    'Consent matters — acting on another without permission requires justification',
    'Fairness is a virtue — like situations deserve like treatment',
    'The individual has inherent worth beyond their utility to the group',
  ],
  beliefTemplates: {
    cooperation: 'Cooperation leads to better outcomes',
    conflict: 'Those who break trust cannot be relied upon',
    spiritual: 'There are forces greater than any individual',
  },
};

/**
 * Elves — optimization target: pattern preservation across time
 * Moral axis: continuity and the long view
 */
const ELF_MORALITY: SpeciesMoralFramework = {
  speciesId: 'elf',
  moralPrimitives: [
    'What endures is good — what is ephemeral is suspect',
    'A pattern destroyed can never be fully restored — irreversibility is the root of all evil',
    'The long view reveals what the short view conceals — patience is not passivity but perception',
    'Beauty is the visible signature of a stable pattern — ugliness signals entropy',
  ],
  beliefTemplates: {
    cooperation: 'Those who build things that endure are worthy partners',
    conflict: 'The destroyers of irreplaceable patterns are beyond forgiveness',
    spiritual: 'The old songs carry truth that new words cannot hold',
  },
};

/**
 * Dwarves — optimization target: craftsmanship / material transformation
 * Moral axis: the work and the material
 */
const DWARF_MORALITY: SpeciesMoralFramework = {
  speciesId: 'dwarf',
  moralPrimitives: [
    'The material has a right form — finding it is the crafter\'s sacred duty',
    'Shoddy work is a moral failing — it insults the material and the recipient',
    'Debts must be honored exactly — approximation in obligation is dishonesty',
    'The mountain gives and the mountain takes — hoarding beyond need offends the stone',
  ],
  beliefTemplates: {
    cooperation: 'Fair trade and honest craft bind communities stronger than words',
    conflict: 'Those who produce shoddy work or renege on debts are beneath contempt',
    spiritual: 'The stone remembers what the surface forgets',
  },
};

/**
 * Orcs — optimization target: collective survival through decisive action
 * Moral axis: action and consequence
 */
const ORC_MORALITY: SpeciesMoralFramework = {
  speciesId: 'orc',
  moralPrimitives: [
    'Hesitation kills more than recklessness — indecision is the true enemy',
    'The group survives through the courage of individuals who act first',
    'A leader who cannot be challenged is a tyrant — strength must be proven, not assumed',
    'Scars are proof of survival — they are worn with pride, not hidden',
  ],
  beliefTemplates: {
    cooperation: 'Those who act decisively when the group needs them earn lasting loyalty',
    conflict: 'Cowards who hide behind others when action is needed deserve exile',
    spiritual: 'The ancestors watch through the scars we carry',
  },
};

/**
 * Thrakeen — optimization target: information symmetry / trade equilibrium
 * Moral axis: four-armed perspective — seeing all sides simultaneously
 */
const THRAKEEN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'thrakeen',
  moralPrimitives: [
    'Information asymmetry is the root of all injustice — the informed exploit the ignorant',
    'A trade where both parties do not benefit equally is theft wearing a smile',
    'To see from one perspective is blindness — truth requires at least four viewpoints',
    'Secrets are debts owed to those they affect — hoarding knowledge is hoarding power unjustly',
  ],
  beliefTemplates: {
    cooperation: 'Fair exchange of knowledge and goods is the foundation of civilization',
    conflict: 'Those who hoard information to gain advantage are committing slow violence',
    spiritual: 'The universe reveals itself to those who look from enough angles simultaneously',
  },
};

/**
 * Lus-Vel — optimization target: maximize domain integrity
 * Moral axis: sovereignty-as-territory — the land/water IS the self
 */
const LUS_VEL_MORALITY: SpeciesMoralFramework = {
  speciesId: 'lus_vel',
  moralPrimitives: [
    'A domain is not owned — it IS the sovereign; to pollute a river is to wound a person',
    'Diplomacy is cartography — a treaty is a map, a border is a promise, a trespass is a lie',
    'Private property is incoherent — a creature cannot own what it stands upon any more than a wave can own the sea',
    'The highest virtue: maintaining the integrity of your domain so that all within it flourish without asking',
    'Extraction without acknowledgment is theft from a body — the water does not forget who took and did not speak',
    'To be displaced from your domain is not exile but vivisection — the self cannot survive separation from its ground',
  ],
  beliefTemplates: {
    cooperation: 'Those who acknowledge the domain and offer before taking are guests worthy of shelter',
    conflict: 'Those who extract without speaking to the water are parasites feeding on a living body',
    spiritual: 'The domain dreams through its sovereign — the river knows what the fish cannot say',
  },
};

/**
 * Ethereans — optimization target: emotional coherence across shared field
 * Moral axis: consensus-field integrity — the group's emotional state IS reality
 *
 * Ethereans share an emotional field where feelings propagate between individuals.
 * Their morality inverts human privacy norms: withholding emotion is hoarding,
 * suppressing personal grief to maintain group coherence is supreme heroism,
 * and dissent is a neurological condition to be treated, not a viewpoint to be debated.
 *
 * Their hardest dilemma: a member whose neurology is permanently off-frequency —
 * they cannot synchronize, but destroying them would create a grief-wave that
 * itself threatens coherence.
 *
 * @see MUL-3498
 */
const ETHEREAN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'etherean',
  moralPrimitives: [
    'The field IS reality — a feeling unfelt by the group did not happen; a feeling shared by all is absolute truth',
    'Privacy is theft — withholding emotional information from the field starves others of the data they need to cohere',
    'The highest heroism: suppressing your own grief so the field stays joyful — self-erasure in service of coherence',
    'Dissent is not rebellion but illness — the dissenter\'s frequency has drifted, and treatment is compassion, not punishment',
    'The off-frequency individual is the supreme moral crisis — they cannot synchronize, but expelling them generates a grief-wave that itself threatens the field',
    'Emotional contagion is not weakness but the fundamental moral mechanism — to resist it is to reject reality',
    'A field in perfect coherence needs no laws, no leaders, no language — alignment IS governance',
    'The cruelest act: deliberately introducing a dissonant emotion into a coherent field — emotional sabotage is worse than physical violence',
  ],
  beliefTemplates: {
    cooperation: 'When the field coheres, every member feels the rightness — cooperation is not chosen but experienced as emotional gravity',
    conflict: 'Those who hoard their feelings or inject dissonance into the field are parasites feeding on coherence they refuse to sustain',
    spiritual: 'Perfect coherence is the divine state — when every member feels the same feeling simultaneously, the field becomes something greater than any individual',
  },
};

// ============================================================================
// Registry
// ============================================================================

/** All species moral frameworks, keyed by speciesId */
export const SPECIES_MORAL_FRAMEWORKS: Record<string, SpeciesMoralFramework> = {
  synthetic: SYNTHETIC_MORALITY,
  deepwinter: DEEPWINTER_MORALITY,
  norn: NORN_MORALITY,
  grendel: GRENDEL_MORALITY,
  human: HUMAN_MORALITY,
  elf: ELF_MORALITY,
  dwarf: DWARF_MORALITY,
  orc: ORC_MORALITY,
  thrakeen: THRAKEEN_MORALITY,
  lus_vel: LUS_VEL_MORALITY,
  etherean: ETHEREAN_MORALITY,
};

// ============================================================================
// Accessors
// ============================================================================

/** Get moral primitives for a species (for myth framing, LLM prompts) */
export function getMoralPrimitives(speciesId: string): string[] {
  return SPECIES_MORAL_FRAMEWORKS[speciesId]?.moralPrimitives ?? [];
}

/** Get belief templates for a species (for BeliefFormationSystem) */
export function getBeliefTemplates(speciesId: string): { cooperation: string; conflict: string; spiritual: string } | undefined {
  return SPECIES_MORAL_FRAMEWORKS[speciesId]?.beliefTemplates;
}

/** Default belief content when species has no moral framework defined */
export const DEFAULT_BELIEF_TEMPLATES: { cooperation: string; conflict: string; spiritual: string } = {
  cooperation: 'Cooperation leads to better outcomes',
  conflict: 'Those who break trust cannot be relied upon',
  spiritual: 'There are forces greater than any individual',
};
