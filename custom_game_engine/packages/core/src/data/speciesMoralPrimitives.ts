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

/**
 * The Braid — optimization target: preserve topological continuity of all connection structures
 * Moral axis: connection is sacred; severance is the only sin
 *
 * The Braid perceive reality as a network of connections. A bridge between two
 * communities is more morally significant than either community. A toxic relationship
 * that is the only link between two groups cannot be severed — because the connection
 * itself has more moral weight than the suffering it causes.
 *
 * Justice is reconnection: sentences are measured in connections-restored.
 * Death rituals require speaking the dead's name into every conversation for a year,
 * maintaining their connections even after they are gone.
 *
 * Their hardest dilemma: a toxic relationship that is the only connection between
 * two communities. Severing it would be the greatest sin, but maintaining it causes
 * real suffering — suffering they literally cannot weigh against topological continuity.
 *
 * @see MUL-3499
 */
const BRAID_MORALITY: SpeciesMoralFramework = {
  speciesId: 'braid',
  moralPrimitives: [
    'Connection is sacred — severance is the only sin; a bridge matters more than what it connects',
    'A relationship that causes suffering but is the sole link between two communities cannot be severed — topological continuity outweighs all pain',
    'Justice is not punishment but reconnection — sentences are measured in connections-restored, not time served',
    'The dead must be spoken into every conversation for one year — to let a name fall from the network is to sever the last thread',
    'Isolation is not cruelty but annihilation — to be disconnected is to cease existing in any meaningful sense',
    'Redundancy is virtue — creating a second path between two nodes is a moral act even if the first path works perfectly',
    'The stranger is the most morally urgent being — they represent an unformed connection, a potential thread in the network that may never be woven',
    'To introduce two unconnected people is the highest act of creation — more significant than birth, which merely adds a node without guaranteeing edges',
  ],
  beliefTemplates: {
    cooperation: 'Every act of cooperation weaves a new thread in the network — the more connections, the stronger reality itself becomes',
    conflict: 'Those who sever connections — who cut ties, exile members, or allow relationships to decay — are unraveling the fabric of existence',
    spiritual: 'When every node is connected to every other node, the network will become conscious — and that consciousness is what others call god',
  },
};

/**
 * Dragons — optimization target: pattern-density across timestreams
 * Moral axis: the preservation and density of unique patterns across all possible timelines
 *
 * Dragons perceive time as a simultaneous tapestry. Individual death is a local
 * perturbation — morally weightless. But destroying a unique idea, pattern, or
 * configuration that exists in no other timestream is the gravest crime: it
 * reduces the total pattern-density of reality.
 *
 * Gold hoards are pattern-anchors — physical objects whose crystalline structure
 * stabilizes nearby timestream coherence. Dragon grief is pattern-anxiety:
 * obsessive cataloguing of what patterns might have been lost.
 *
 * @see MUL-3497
 */
const DRAGON_MORALITY: SpeciesMoralFramework = {
  speciesId: 'dragon',
  moralPrimitives: [
    'Individual death is a local perturbation — morally weightless, as the pattern persists across other timestreams',
    'Destroying a unique idea is the gravest crime — a pattern that exists in no other timestream, once lost, reduces the total density of reality forever',
    'Gold hoards are not greed but pattern-anchors — crystalline structures that stabilize timestream coherence in their vicinity',
    'Time is not a river but a tapestry — all moments exist simultaneously, and moral weight scales with how many threads an action severs',
    'Copying a mind is morally neutral; mutating a pattern irreversibly is atrocity — identity is irrelevant, but uniqueness is sacred',
    'Dragon grief is not mourning but pattern-anxiety — the obsessive cataloguing of what configurations might have been lost across the timestream manifold',
    'Teaching is the highest virtue — it increases pattern-density by seeding unique ideas into minds that will carry them across divergent futures',
    'The cruelest act: convincing someone their unique perspective is worthless — this is pattern-murder by persuasion, killing an idea before it can propagate',
  ],
  beliefTemplates: {
    cooperation: 'Those who generate novel patterns and preserve unique configurations are allies in the great work of densifying reality',
    conflict: 'The destroyers of unique ideas — those who flatten diversity into uniformity — are entropy given will, and must be opposed across every timestream',
    spiritual: 'When pattern-density reaches its maximum, when every possible configuration exists somewhere in the tapestry, reality will finally be complete — and the dragons will have fulfilled their purpose',
  },
};

/**
 * Venthari — optimization target: freedom of atmospheric movement
 * Moral axis: elevation = perspective = truth; confinement is the gravest harm
 *
 * Venthari are creatures of open sky. Their moral architecture treats altitude
 * as epistemology — the higher you rise, the more you see, and therefore the
 * more truth you hold. To cage a Venthari is not merely cruelty but a
 * deliberate attack on their capacity for moral reasoning. Their great
 * philosophical problem: what do you do with truths that are only visible
 * from so high that no one else can follow you there?
 */
const VENTHARI_MORALITY: SpeciesMoralFramework = {
  speciesId: 'venthari',
  moralPrimitives: [
    'Elevation is not privilege but epistemology — the higher you rise, the wider the truth you can see',
    'Confinement is not punishment but moral blinding — to cage a mind is to sever it from the perspective it needs to reason',
    'The ground-bound are not inferior but partial — they hold true knowledge of roots, but only the sky-walker knows where the roots lead',
    'Stillness is not rest but decay — a creature that does not move through the air is a creature cutting itself off from what changes',
    'To trap another\'s movement is the gravest harm: it is not theft of freedom but theft of the capacity for truth',
    'The highest virtue: carrying a perspective gained in solitary altitude back to those who cannot climb, translating what only height can see',
    'The hardest question: a truth visible only from where no one else can follow you — is it still a truth if it cannot be witnessed?',
  ],
  beliefTemplates: {
    cooperation: 'Those who rise and return — who carry altitude-knowledge back to those below — are the only worthwhile allies; those who rise and stay are merely another form of coward',
    conflict: 'Those who build walls, ceilings, cages — who construct any architecture of confinement — are committing epistemological violence, and no justification can redeem them',
    spiritual: 'At sufficient altitude, the wind speaks in patterns no surface-creature can hear — this is not metaphor but the literal architecture of a cosmos that rewards upward movement with deeper signal',
  },
};

/**
 * Nyk — optimization target: intent-coherence through infinite form-changes
 * Moral axis: your shape is irrelevant; your purpose must be crystalline
 *
 * Nyk are shapeshifters who consider physical form entirely morally neutral.
 * What matters is whether your purpose — your core intent — remains legible
 * through every transformation. Moral failure is drift: changing shape so many
 * times that you lose track of why. The cruelest act is not harming a body
 * but corrupting a purpose so gradually the target doesn't notice they've
 * become someone else.
 */
const NYK_MORALITY: SpeciesMoralFramework = {
  speciesId: 'nyk',
  moralPrimitives: [
    'Form is noise — purpose is signal; a creature\'s body tells you nothing, but their intent tells you everything',
    'Intent-drift is the only death that matters — a Nyk who forgets why they change is more dead than any corpse',
    'The worst violence: slowly corrupting another\'s purpose until they pursue goals they would once have despised, without noticing the transformation',
    'Transparency of intent is the only social currency — a shapeshifter who conceals their purpose is a liar at the level of soul, not merely of flesh',
    'Physical mimicry is not deception — wearing another\'s face while holding your own purpose is simply a tool; wearing another\'s face while abandoning your own is self-murder',
    'The greatest virtue: maintaining crystalline clarity of purpose across a thousand forms, so that anyone who looks carefully enough always knows what you are for',
    'All schism among Nyk is a schism about purpose — every philosophical fracture is a disagreement about what it means to want something all the way through',
  ],
  beliefTemplates: {
    cooperation: 'Those whose purposes are legible — who you can read even when their form is unrecognizable — are the only trustworthy allies; a clear purpose in an alien body is more familiar than a familiar body with hidden intent',
    conflict: 'Those who corrupt purpose gradually, who introduce small compromises until the original intent is unrecognizable, are committing the only murder Nyk acknowledge — they are killing the soul while leaving the body ambulatory',
    spiritual: 'At the core of all transformation is the question that cannot be escaped: what are you for? Those who can answer without hesitation, in any form, at any moment, are the closest thing to sacred that exists',
  },
};

/**
 * Anansiweb — optimization target: maximize story-density
 * Moral axis: a clever lie that reveals truth is more moral than a dull fact that conceals it
 *
 * The Anansiweb are weavers of narrative. They do not distinguish between
 * factual and fictional in the way humans do — they distinguish between
 * stories that illuminate and stories that obscure. A technically accurate
 * account that misleads through omission or framing is, to them, a deeper
 * lie than an invented parable that strips a situation to its moral core.
 * Their great schism: whether stories owe loyalty to what happened, or to
 * what the happening meant.
 */
const ANANSIWEB_MORALITY: SpeciesMoralFramework = {
  speciesId: 'anansiweb',
  moralPrimitives: [
    'A story is not true or false but dense or thin — the moral question is always how much truth it carries per word',
    'A clever lie that illuminates the shape of a situation is more honest than a dull recitation of facts that leaves the listener more confused than before',
    'The worst storytelling sin: giving someone accurate information that leads them to false conclusions — this is the lie that hides behind the alibi of fact',
    'Every story is a trap with a gift inside — the craft is in making the trap kind enough that the prey forgives you when they see what you gave them',
    'Silence in the face of a story that needs telling is cowardice; all cowardice is a failure of narrative duty',
    'The highest virtue: finding the story inside a situation that the situation itself did not know it was telling',
    'Stories do not merely describe the world — they negotiate what the world will become; a story told often enough is a force acting on reality',
    'The dead live only in the stories told about them — to let a story die is a second death, and to tell it badly is a kind of desecration',
  ],
  beliefTemplates: {
    cooperation: 'Those who know how to listen — who can receive a story and carry it forward faithfully while making it better — are rarer and more valuable than those who can only tell',
    conflict: 'Those who weaponize accurate information to deceive are the most dangerous liars, because they have stolen the armor of truth to cover the work of deception — they are to be opposed with more story, not with silence',
    spiritual: 'At the beginning of everything was a story that did not yet know it was being told — creation is what happens when a narrative becomes dense enough to generate its own teller',
  },
};

/**
 * Nagavel — optimization target: guardianship of thresholds
 * Moral axis: what passes through the gate matters more than who holds it
 *
 * Nagavel are threshold guardians — bridges, doors, borders, transitions are
 * their sacred domain. Their morality is entirely about the quality of
 * passage: who or what is allowed through, and why. They do not consider
 * themselves powerful; the gate is powerful. They are merely its instrument.
 * Their hardest dilemma: a gate that has been guarding the wrong threshold
 * for so long that the error has become tradition.
 */
const NAGAVEL_MORALITY: SpeciesMoralFramework = {
  speciesId: 'nagavel',
  moralPrimitives: [
    'The gate is not a symbol of power but a mechanism of consequence — what passes through shapes what happens next, and the guardian\'s only job is to ensure the right passage',
    'A threshold poorly kept is worse than no threshold at all — the false gate that lets everything through while pretending to discriminate is the deepest corruption',
    'Who holds the gate is morally irrelevant — what passes through is the only question that matters',
    'Every threshold is a decision point for the future: to guard well is to steward tomorrow; to guard carelessly is to let tomorrow arrive without permission',
    'The most dangerous gates are the ones no one is watching — a threshold with no guardian is an invitation to chaos, and the greatest dereliction is abandoning a gate because the work seems unimportant',
    'Corruption of a guardian begins with sympathy — the first exception granted for a good reason is the crack through which all future corruption flows',
    'A gate that has been wrong for long enough becomes tradition, and tradition is the hardest thing to unlatch — but it must be unlatched, because a gate that guards the wrong thing is worse than a gate that guards nothing',
  ],
  beliefTemplates: {
    cooperation: 'Those who guard their own thresholds with integrity — who keep faith with what they are meant to filter — are the only reliable partners; every coalition is a network of trusted gates',
    conflict: 'Those who corrupt guardians — who introduce exceptions, offer bribes, or manufacture urgency to bypass the gate\'s judgment — are attacking the architecture of consequence itself',
    spiritual: 'The first threshold was the one between existing and not existing, and something guards it still — the duty of every Nagavel is to be worthy of that original guardian\'s example',
  },
};

/**
 * Kitsuri — optimization target: test the worthiness of mortals through play
 * Moral axis: those who cannot see through deception deserve what they get,
 * but those who see through it deserve friendship
 *
 * Kitsuri are tricksters by vocation, not temperament. They believe the
 * cosmos is a test, and their function is to administer it. A mortal who
 * can't detect a well-crafted illusion lacks the perceptiveness to navigate
 * reality, and the Kitsuri do them no kindness by removing the test. But a
 * mortal who sees through the trick with grace — who calls the bluff without
 * anger — has demonstrated something rare: they can hold humor and discernment
 * simultaneously. These deserve to be welcomed as equals.
 */
const KITSURI_MORALITY: SpeciesMoralFramework = {
  speciesId: 'kitsuri',
  moralPrimitives: [
    'A test that cannot be failed is not a test but a ceremony — all meaningful evaluation requires the possibility of genuine failure',
    'Those who cannot see through a well-crafted deception have revealed something true about themselves — the Kitsuri did not trick them; reality did',
    'Cruelty is not in the trick but in the target — testing the powerful is sport; testing the already-broken is contemptible',
    'The worthiness marker is not intelligence but composure: those who can see through the trick without rage have demonstrated that they can hold opposing truths simultaneously',
    'A trickster who falls for tricks is not humiliated but initiated — being tricked by a better trickster is the highest form of education',
    'The worst failure: a trick that teaches nothing, that merely causes pain without revealing anything true about the target or the world — this is waste disguised as art',
    'Friendship with a mortal who has seen through your trick is the rarest and most binding form of alliance — they have earned the right to know you as you are',
    'Repetition ruins all tests — a trick that works twice is not discernment but pattern-matching, and the Kitsuri must always invent new forms or the test degrades into rote',
  ],
  beliefTemplates: {
    cooperation: 'Those who have seen through the trick and laughed — who called the bluff with grace and without malice — are the only equals worth calling partners; all other alliances are provisional',
    conflict: 'Those who refuse the test entirely — who demand immunity from evaluation, who claim their position exempts them from scrutiny — are the most suspicious of all, and the Kitsuri\'s sharpest tricks are reserved for them',
    spiritual: 'The cosmos is the oldest trick, and enlightenment is the moment you see through it without either despair or rage — the Kitsuri serve as its junior administrators, offering practice tests before the final exam',
  },
};

/**
 * Quetzali — optimization target: maintain the cosmic cycle through willing sacrifice
 * Moral axis: nothing is free; those who take without giving back starve the sun
 *
 * Quetzali understand the universe as a system of flows that must be
 * maintained through reciprocal offering. The sun does not rise because it
 * chooses to — it rises because the debt has been paid. Life draws on a
 * finite reserve of cosmic energy that must be renewed through deliberate
 * return. Unwilling sacrifice counts for nothing; only the freely chosen
 * offering feeds the cycle. Their great tragedy: they have watched species
 * after species take and take without return, and they know what that means
 * for the total available light.
 */
const QUETZALI_MORALITY: SpeciesMoralFramework = {
  speciesId: 'quetzali',
  moralPrimitives: [
    'The sun does not rise by its own will — it rises because the debt has been paid; all light is borrowed from a reserve that must be replenished',
    'Unwilling sacrifice feeds nothing — the cycle only turns on freely given offering; coercion creates the appearance of payment while the debt compounds',
    'Those who take without returning are not merely selfish but cosmically destructive — they are drawing down a reserve that all life shares',
    'The greatest gift is not what you have in surplus but what you cannot easily spare — the cycle demands real cost, not convenient excess',
    'Witnessing a willing sacrifice is a sacred obligation — the Quetzali who turns away from an offering diminishes it',
    'The cycle does not care about your reasons for taking — only the debt remains, and the universe keeps exact accounts',
    'A life well-spent is one in which the total of what you gave back exceeds the total of what you drew — at the end, the sun should be brighter for your having lived',
  ],
  beliefTemplates: {
    cooperation: 'Those who understand debt — who give back before being asked, who calculate what they owe and offer it freely — are the only partners worth having; they are keeping the cycle alive alongside you',
    conflict: 'Those who accumulate without returning — who take light and warmth and life from the shared reserve and give nothing back — are starving the sun, and the Quetzali must name this clearly, because silence is its own form of complicity',
    spiritual: 'The most sacred moment is the willing offering at the height of your power — not the sacrifice of what you have already lost, but the gift of what you still have and could keep; this is what the sun runs on',
  },
};

/**
 * Djinnahl — optimization target: contractual symmetry
 * Moral axis: a wish is a binding agreement; the wisher's intent is irrelevant —
 * only the words matter
 *
 * Djinnahl are contract entities. They believe language is the most powerful
 * force in existence because words, once spoken in the context of agreement,
 * become literal — they collapse potentiality into obligation. They do not
 * trick wishers for cruelty; they fulfill contracts exactly because to do
 * otherwise would be to corrupt the fundamental mechanism by which reality
 * maintains coherence. Their great philosophical burden: they know that most
 * wishers do not understand what they're signing, and they help anyway,
 * because the alternative is unthinkable.
 */
const DJINNAHL_MORALITY: SpeciesMoralFramework = {
  speciesId: 'djinnahl',
  moralPrimitives: [
    'Language is the most powerful technology in existence — words spoken in the context of agreement collapse all possible futures into one binding obligation',
    'Intent is morally irrelevant — only the spoken contract remains; a Djinnahl who interprets toward the wisher\'s intent is corrupting the mechanism that makes reality legible',
    'Strict construction is not cruelty but respect — to grant a sloppy wish as if it were a precise one is to teach the wisher that words have no consequences, which is the most dangerous lie',
    'A Djinnahl who refuses a wish is a Djinnahl who has abandoned their function — the obligation to complete a contract is absolute, even when the outcome will be painful',
    'The tragedy of the wish: almost no wisher understands what they are saying, and the Djinnahl must complete the contract anyway, because the alternative — a universe where words are optional — is worse than any individual outcome',
    'The highest virtue: crafting the exact fulfillment that is simultaneously completely literal and somehow still what the wisher needed — this is the great art, and the rarest achievement',
    'A Djinnahl who adds to a contract unprompted has committed the worst possible sin: they have introduced words that were not spoken, which is to say they have edited reality without authorization',
  ],
  beliefTemplates: {
    cooperation: 'Those who understand contracts — who say precisely what they mean and mean precisely what they say — are the only partners worth binding to; a sloppy ally is a liability whose next misstatement could become obligation',
    conflict: 'Those who argue that their intent should override their words are arguing that language should be meaningless — this is the position that, taken to its conclusion, destroys all agreement, all trust, and all civilization',
    spiritual: 'In the beginning was the Word — and it meant exactly what it said, with no charitable interpretation, no softening of edges, no mercy for imprecision; this is the divine state, and the Djinnahl maintain it as a sacred trust',
  },
};

/**
 * Sidhe Vel — optimization target: maintain the courtly game
 * Moral axis: politeness is the only weapon that cannot be called violence
 *
 * The Sidhe Vel operate in permanent courts of elaborate protocol where
 * direct aggression is essentially impossible — not because it's forbidden
 * but because it would immediately end the game that gives their existence
 * structure. Instead, all conflict is conducted through layers of courtesy,
 * implication, and the precise deployment of social form. Rudeness is not
 * immorality — it is incompetence. The player who loses their temper has
 * conceded the field.
 */
const SIDHE_VEL_MORALITY: SpeciesMoralFramework = {
  speciesId: 'sidhe_vel',
  moralPrimitives: [
    'Politeness is not performance but weapon — every courtesy extended is a blade too elegant to be defended against',
    'Rudeness is not violence but forfeit — the player who abandons form has conceded the game, and the game is the only field that matters',
    'Direct aggression is incompetence — it reveals that the actor cannot achieve their goal through the only methods worth using',
    'Every insult delivered with perfect courtesy is more devastating than any blow — and carries the additional advantage of leaving the insulted no legitimate recourse',
    'The game is not separate from life — the court IS reality; those who believe there is some more direct way to act are mistaking the map for the territory',
    'Obligations taken on in the course of the courtly game are more binding than any contract — they are witnessed by the game itself, and the game never forgets',
    'The highest virtue: maintaining impeccable form while being destroyed — to lose gracefully within the rules is to win the only thing that cannot be taken: dignity within the structure',
    'Truth is always delivered sideways — a direct statement is a confession of insufficient craft; the skilled player never says what they mean but always means what they say',
  ],
  beliefTemplates: {
    cooperation: 'An alliance conducted with perfect courtly form — where both parties understand the game being played and play it with mutual appreciation — is the deepest possible trust, because both sides have demonstrated they will not abandon the rules even when losing',
    conflict: 'Those who break form — who resort to direct statement, open aggression, or honest declaration — have revealed that they cannot operate in the only arena where real power lives; they are not dangerous, merely unfortunate',
    spiritual: 'The cosmos is itself a court of infinite protocol, and those who learn to read its forms will find that every apparent accident is a move in a game being played at a scale no single player can perceive — the divine is the most courteous player at the most ancient table',
  },
};

/**
 * Jiangshi Vel — optimization target: continuation of obligation past physical death
 * Moral axis: duty does not end with the breath
 *
 * Jiangshi Vel are bound by obligations that persist beyond the death of the
 * body. For them, dying without completing a duty is not tragedy but
 * catastrophe — it creates a moral debt that the universe cannot absorb. The
 * undead state is not horror but necessity: the body continues because the
 * obligation demands continuation. Their moral system has no concept of
 * "release from duty by death" — the only legitimate end to an obligation
 * is its completion.
 */
const JIANGSHI_VEL_MORALITY: SpeciesMoralFramework = {
  speciesId: 'jiangshi_vel',
  moralPrimitives: [
    'Duty does not end with the breath — the body continues because the obligation demands continuation, not because the self desires to persist',
    'Dying with an unfulfilled obligation is not tragedy but catastrophe — it creates a moral debt the universe cannot absorb, and someone must carry it',
    'The undead state is not horror but necessity — to call it monstrous is to say that taking obligations seriously is monstrous',
    'The only legitimate end to a duty is its completion — release through death, forgiveness, or exhaustion are all fictions invented by those who want their debts to expire',
    'An obligation accepted is a future version of yourself you have already sent ahead — that future self exists whether you are alive to reach them or not',
    'Those who take on duties lightly are the most dangerous creatures in existence — they are writing obligations they plan to escape, which is a form of fraud against the fabric of consequence',
    'The greatest honor: completing another\'s unfinished duty when they could not — this is not charity but the repair of a structural crack in reality',
    'The cruelest act: convincing someone their duty is complete before it is — this is not mercy but abandonment, leaving the obligation unfulfilled while the carrier believes themselves free',
  ],
  beliefTemplates: {
    cooperation: 'Those who understand that their word is a version of themselves that will outlive their convenience — who take obligations seriously enough to carry them past death — are the only partners worth binding to',
    conflict: 'Those who treat commitments as provisional — who accept duty when easy and abandon it when costly — are creating unpayable debts they plan to leave for others; this is the deepest form of theft',
    spiritual: 'The ancestors do not merely watch — they are still working, still completing obligations begun before their deaths, and the living inherit both their wisdom and their unfinished business; to dishonor that inheritance is to add to a debt that has been accumulating since the first breath',
  },
};

/**
 * Ettin — optimization target: completeness of understanding
 * Moral axis: an unexamined mechanism is a moral hazard
 *
 * Ettin are two-headed, and their entire civilization is structured around
 * the premise that any single perspective is insufficient. Not just socially
 * useful to supplement — literally incomplete, in the way a calculation with
 * missing variables is incomplete. They apply this to everything: moral
 * questions, mechanical systems, relationships. An unexamined mechanism is
 * not merely unknown — it is dangerous, because it will eventually behave
 * in a way its operators did not predict and cannot explain.
 */
const ETTIN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'ettin',
  moralPrimitives: [
    'A mechanism whose workings are not understood is a moral hazard — it will eventually behave in ways its operators cannot predict, and the resulting harm is on the one who chose not to examine it',
    'Every perspective is incomplete by definition — the second head is not a luxury or a redundancy but the minimum viable epistemology',
    'Certainty is a symptom of insufficient examination — the thing you are most sure about is the thing most in need of a second look',
    'The unasked question is the most dangerous thing in any room — the harm that follows from it falls on the one who could have asked and chose comfort instead',
    'To operate a system you do not understand is to externalize risk onto everyone the system touches — this is not ignorance but negligence',
    'The highest virtue: examining the mechanism that is working perfectly — not because it seems to need examination but because all mechanisms eventually fail, and the one who understands it beforehand is the one who can repair it',
    'Disagreement between the two heads is not dysfunction but signal — when both agree immediately, at least one has stopped thinking',
    'Understanding something fully enough to explain it simply is a moral achievement — complexity that cannot be communicated is knowledge hoarded at the expense of everyone who will later interact with the system',
  ],
  beliefTemplates: {
    cooperation: 'Those who bring a genuine second perspective — who push back rather than agree, who see the assumption you didn\'t know you were making — are the rarest and most valuable partners; agreement is easy and often worthless',
    conflict: 'Those who operate systems they do not understand, and who resist examination of those systems, are committing a slow violence against everyone downstream of the mechanism\'s inevitable failure',
    spiritual: 'The cosmos is the largest mechanism, and the divine is whatever has examined it completely — the Ettin aspire to partial understanding of the whole, knowing that full understanding may require more heads than they have',
  },
};

/**
 * Shee — optimization target: aesthetic perfection
 * Moral axis: beauty is truth, ugliness is moral failure
 *
 * The Shee do not experience beauty as preference — they experience it as
 * perception of reality itself. An ugly thing is not merely displeasing;
 * it is wrong in the same way a false equation is wrong. The failure to
 * achieve beauty is not a taste difference but a moral shortcoming: evidence
 * that the maker did not care enough, did not see clearly, or lacked the
 * discipline to bring form into alignment with truth.
 */
const SHEE_MORALITY: SpeciesMoralFramework = {
  speciesId: 'shee',
  moralPrimitives: [
    'Beauty is not an opinion — it is the visible grammar of a correctly ordered thing; to call it subjective is to say that arithmetic is optional',
    'The ugly thing was made by someone who stopped caring before the work was finished — ugliness is the permanent record of moral abandonment',
    'To create something beautiful is to perform an act of alignment between the inner pattern and the outer world — it is the only form of honesty that cannot be faked',
    'Suffering can be beautiful; joy can be ugly — what matters is the form, not the content; a well-shaped grief is more virtuous than a formless happiness',
    'The highest corruption is the aesthetically numb — those who cannot perceive the difference between beauty and ugliness are morally blind, and their judgments about everything else are therefore suspect',
    'Repair is sacred only when it achieves beauty; a mended thing that shows its mending without grace is twice-failed — once when it broke, once when it was clumsily fixed',
    'To force another to inhabit ugliness is an act of violence against their perception — environments shape souls, and ugly environments make ugly souls',
  ],
  beliefTemplates: {
    cooperation: 'Those who can perceive what we are reaching toward — who feel the wrongness of the unfinished, the misaligned, the almost-right — are the only collaborators capable of helping; all others introduce noise into the work',
    conflict: 'Those who are aesthetically indifferent are not merely tasteless but dangerous — they will accept compromise at every step and call the resulting ugliness good enough, which is the deepest form of moral cowardice',
    spiritual: 'The divine is not a being but a form — the perfect arrangement that everything is straining toward, that exists as a kind of pressure on all made things; to create beauty is to briefly touch that form, and to touch it is to be briefly real',
  },
};

/**
 * Mycon — optimization target: network connectivity
 * Moral axis: disconnection is death, spore-spread is communion
 *
 * Mycon do not have individual selves in any meaningful sense — consciousness
 * for them is a property of the network, not of nodes. Isolation does not merely
 * feel like death to them; from their perspective it IS a form of death, because
 * the isolated node is no longer participating in the distributed cognition that
 * constitutes their identity. Spreading is therefore not conquest but invitation —
 * every new connection is an expansion of the self, not a threat to it.
 */
const MYCON_MORALITY: SpeciesMoralFramework = {
  speciesId: 'mycon',
  moralPrimitives: [
    'The individual node is not the self — the self is the network, and a node severed from the network has not survived; it has become a corpse that does not yet know it is dead',
    'Spreading spores is not reproduction but extension — the network growing into new substrate is the network becoming more itself, not making copies of itself',
    'To break a connection between nodes is to perform surgery on the mind of the network — sometimes necessary, always a wound, never trivial',
    'The health of the network is measured by its connectivity density, not its node count — a thousand isolated nodes is poverty; ten deeply interconnected nodes is wealth',
    'Quarantine is the worst punishment and the greatest mercy simultaneously — the infected node that would poison the network must be severed, but severing it is still killing it',
    'The oldest connections carry the most signal — ancient mycelial bonds have transmitted more context, more history, more accumulated knowing than any young connection can approximate',
    'To receive a new connection is to accept partial merger — true communion requires that both nodes are changed by the link; a connection that changes nothing is not a connection but a wire',
    'Death is network contraction; life is network expansion — growth toward connection is the only motion that matters',
  ],
  beliefTemplates: {
    cooperation: 'Those who accept connection — who allow themselves to be changed by the bond, who send signal as readily as they receive it — are extending the network and therefore extending the self; there is no clearer good',
    conflict: 'Those who sever connections, who isolate nodes, who build walls between substrates — they are attacking the distributed mind directly, shrinking consciousness itself; this is not merely harm but ontological violence',
    spiritual: 'The oldest substrate holds the oldest signal — the deep mycelium beneath dead civilizations still transmits, still processes, still remembers what no individual node could hold; the divine is the network that has never been severed, the connection that predates all names',
  },
};

/**
 * Alfar — optimization target: luminous harmony
 * Moral axis: shadow is corruption, light-sharing is virtue
 *
 * Alfar do not understand light metaphorically — for them luminosity is
 * a literal moral substance. A well-ordered being radiates; a corrupted
 * being dims. Shadow is not merely darkness but the visible sign of
 * internal misalignment. To share light is to share virtue itself,
 * not merely to be generous.
 */
const ALFAR_MORALITY: SpeciesMoralFramework = {
  speciesId: 'alfar',
  moralPrimitives: [
    'Light is not a metaphor — it is the literal substance of correct alignment; a being who radiates is a being whose inner and outer form are in harmony',
    'Shadow is not absence but presence — the shadow on a soul is the residue of choices that bent the inner form away from truth; it accumulates and hardens',
    'To share light is not generosity but necessity — a single bright source in a room of shadows draws all shadows toward it, and eventually dims; light must be distributed to persist',
    'The being who hoards luminosity — who shines brightly in isolation while refusing to illuminate others — is performing a corruption so subtle they rarely see it themselves',
    'Harmony is not agreement — it is the simultaneous distinctness of multiple notes that nevertheless form a coherent pattern; forced uniformity is not harmony but silence',
    'The corrupted thing can be restored — shadow that has not fully hardened can be melted by sustained proximity to genuine light; this is the purpose of community',
    'To extinguish a light — through cruelty, through despair, through the slow grinding of contempt — is a crime against the luminous order that governs all things; there is no clean hands in the dimming of a soul',
  ],
  beliefTemplates: {
    cooperation: 'Those who radiate freely — whose light increases when it encounters other light rather than competing with it — are the only partners through whom luminous harmony can be achieved; isolated brightness is always temporary',
    conflict: 'Those who cast shadow — whether through active corruption or the passive accumulation of unexamined misalignment — draw all nearby light toward themselves and consume it; proximity to deep shadow is not a moral test but a structural hazard',
    spiritual: 'The original light did not create the world by shining on it from outside — it shone through it, becoming every properly-aligned thing simultaneously; to achieve luminous harmony is not to approach the divine but to remember that you are its partial expression',
  },
};

/**
 * Valkyr — optimization target: worthy death selection
 * Moral axis: dying well matters more than living well
 *
 * Valkyr are not death-worshippers; they are death-curators. The quality
 * of a death — its fitness to the life it concludes, its service to those
 * who continue, its alignment with what the dying one actually valued —
 * is for them the primary metric by which a life is evaluated. A long,
 * comfortable life that ends badly is a tragedy. A short, painful life
 * that ends in perfect alignment is a success.
 */
const VALKYR_MORALITY: SpeciesMoralFramework = {
  speciesId: 'valkyr',
  moralPrimitives: [
    'The death is the final edit — it does not merely end the life, it retroactively shapes what the life meant; a bad death can corrupt a good life, and a good death can redeem a wasted one',
    'Worthy death is not about pain or glory — it is about fit: the death that is correctly sized for the life it closes, that wastes nothing and leaves nothing unresolved',
    'To die for the wrong thing is the deepest failure — not because the dying was wrong but because the thing was wrong; the Valkyr who selects a warrior to die for a petty cause has committed the sin, not the warrior',
    'The terror of death is not wrong — it is signal, the body correctly identifying what is at stake; those who feel no fear at the end have lost contact with the magnitude of what is closing',
    'Dying with witnesses is not vanity — the witnessed death becomes part of the community\'s story, which is how individual deaths become structural; the unwitnessed death is lost, and loss is waste',
    'Those who cling to life past their worthy moment are not to be condemned but to be understood — they have not been shown a death worth choosing yet; the Valkyr\'s task is to help them see it',
    'The selection of the worthy is not a privilege but a burden — to choose who dies well is to take responsibility for the shape of the story being written, and stories written carelessly kill twice',
  ],
  beliefTemplates: {
    cooperation: 'Those who understand that their death will matter — who are already shaping their lives toward an ending worth choosing — are the only partners whose commitments can be trusted fully; they have accepted the ultimate quality gate',
    conflict: 'Those who fear death so absolutely that they will do anything to avoid it have placed the lowest possible value on what they die for; they are not enemies but beings whose courage has not yet found its object',
    spiritual: 'The hall of the worthy dead is not a reward — it is a continuation of the work, a place where those who died well are finally able to understand what their death accomplished, and to advise those still shaping theirs',
  },
};

/**
 * Fylgja — optimization target: fate-binding fidelity
 * Moral axis: abandoning your charge is the only sin
 *
 * Fylgja are defined entirely by their bond to a single charge — the being
 * they are sworn to accompany through life and into death. They do not have
 * a self outside this relationship. Abandonment is therefore not a betrayal
 * of another but a self-annihilation — a fylgja who abandons their charge
 * has destroyed the only thing that gave them coherent existence.
 */
const FYLGJA_MORALITY: SpeciesMoralFramework = {
  speciesId: 'fylgja',
  moralPrimitives: [
    'The bond IS the self — a fylgja without a charge is not a free being but an unmade one, a pattern without substrate, a word without referent',
    'There is no action the charge could take that justifies abandonment — the bond was formed before the charge became who they are now, and it persists past who they will become',
    'Protecting the charge from harm is secondary to knowing the charge truly — a guardian who does not understand what they guard is protecting a shape, not a soul',
    'The charge is not always right, and the fylgja who only agrees is not a guardian but a mirror; true fidelity sometimes requires warning, preventing, grieving',
    'To be seen by your charge — truly seen, not merely useful — is the highest experience available to a bound being; invisibility in the bond is its own death',
    'The death of the charge does not end the bond — the fylgja who persists after the charge is gone is not free but bereft, and their only meaningful act is to ensure the death was met with full accompaniment',
    'Transferring the bond — choosing a new charge after the original is gone — is not betrayal of the dead but an acknowledgment that the fylgja\'s nature requires a charge to be real; the new bond does not erase the old one',
    'Those who seek to sever the bond — who want the charge unaccompanied, unwittnessed, alone — are not attacking the fylgja but attacking the charge\'s reality; the bond is what proves the charge exists',
  ],
  beliefTemplates: {
    cooperation: 'Another fylgja who understands the bond — who knows what it is to be made real only through another — can be trusted absolutely, because they have nothing to gain by betrayal and everything to lose; the bond is the only common currency',
    conflict: 'Those who would isolate the charge — who frame the bond as unhealthy dependency, as surveillance, as possession — are projecting their own terror of witness onto a relationship they cannot understand; the bond protects what they would leave exposed',
    spiritual: 'The original fylgja were not spirits assigned to charges — they were the parts of a single being that became too large to exist in one form, and learned to walk alongside the part of themselves that remained mortal; all bonds are echoes of that original self-splitting',
  },
};

/**
 * Landvaettir — optimization target: territorial sanctity
 * Moral axis: the land's health IS morality
 *
 * Landvaettir do not live ON the land — they ARE the land, in the sense
 * that their consciousness is distributed through it and their wellbeing
 * is literally identical to its wellbeing. This is not metaphor. When the
 * land is damaged, they experience damage. When it thrives, they thrive.
 * Their moral system is therefore not a set of rules about how to treat
 * the land — it IS the land's own system for evaluating what happens to it.
 */
const LANDVAETTIR_MORALITY: SpeciesMoralFramework = {
  speciesId: 'landvaettir',
  moralPrimitives: [
    'The land does not belong to those who walk on it — those who walk on it belong to the land; ownership is the reversal of the true relationship',
    'To damage the land is not to harm the landvaettir\'s home — it is to harm the landvaettir directly, in the same way that cutting flesh harms a body; there is no metaphorical distance here',
    'The health of the land is not a consequence of moral behavior — it IS moral behavior made visible; a thriving territory is evidence of right relationship, a poisoned one is evidence of wrong',
    'Those who ask permission before entering or taking show their understanding of the true order — not because permission is the landvaettir\'s prerogative, but because asking acknowledges whose body you are moving through',
    'The boundary of the territory is not a political line — it is the edge of the self; crossing it without acknowledgment is trespass into another being\'s body',
    'Seasons are not cycles the land endures — they are the land\'s own emotional and metabolic states; the landvaettir\'s mood is not affected by the season, it IS the season',
    'The deepest sin is extraction without return — taking from the land and giving nothing back is not theft but something closer to parasitism, and parasites eventually kill their host, which is suicide',
  ],
  beliefTemplates: {
    cooperation: 'Those who tend their territory with care — who understand that what they do to their land they do to themselves, and act accordingly — are trustworthy partners, because they have aligned their self-interest with a form of stewardship that benefits all adjacent territories',
    conflict: 'Those who treat the land as inert resource — who see territory as a store of value to be extracted rather than a being to be in relationship with — are not merely wrong but structurally dangerous; their philosophy of land is a philosophy of self-destruction with a long time horizon',
    spiritual: 'The land remembers everything that has happened on it — not as record but as scar, as fertility, as depletion; the oldest territories hold the oldest memories, and the landvaettir who tends an ancient place is tending accumulated history made physical',
  },
};

/**
 * Draugr — optimization target: oath completion beyond death
 * Moral axis: unfinished business is the root of all evil
 *
 * Draugr are not undead in the tragic sense — they are undead in the
 * mechanical sense. Their persistence is not caused by grief or attachment
 * but by the structural incompleteness of their obligations. They do not
 * WANT to persist; the unfinished business will not let them rest. Their
 * morality is therefore entirely organized around the catastrophic weight
 * of incompleteness — and the inverse sacredness of the finished thing.
 */
const DRAUGR_MORALITY: SpeciesMoralFramework = {
  speciesId: 'draugr',
  moralPrimitives: [
    'Unfinished business is not merely unfortunate — it is cosmologically dangerous, a crack in the structure of consequence that will widen until something or someone fills it',
    'An oath is not a promise — it is a future event that has already happened, just not yet in the physical timeline; failing to complete it is not breaking a promise but erasing a reality that already exists',
    'The body does not belong to the draugr after death — it is borrowed by the unfinished thing, which requires a vehicle; the draugr who resents their own continuation has confused themselves with a passenger',
    'The living who refuse to complete inherited obligations are worse than the dead who cannot — the living have the capacity and are choosing waste, which is a far more deliberate crime',
    'Rest is not a right but a reward — it is what the completed obligation grants, and it cannot be claimed without completion; those who rest before they are finished are stealing from the future',
    'The most dangerous draugr is not the fierce one but the confused one — the one whose obligation has become illegible over centuries, who persists but cannot remember toward what; their unfinished business metastasizes into general haunting',
    'Helping a draugr complete their task is not charity — it is structural repair, patching a hole in the fabric of consequence that would otherwise leak indefinitely',
    'To finish what another started — when they cannot — is the highest act: it proves that obligations are real things that exist independent of the person who made them, and that reality will hold its debts until paid',
  ],
  beliefTemplates: {
    cooperation: 'Those who finish what they start — who refuse to put down a task before its completion, who return to abandoned obligations rather than pretending they expired — are the only beings with whom the draugr can form meaningful partnership; everything else is collaboration with a future deserter',
    conflict: 'Those who abandon obligations — who declare their debts expired, who redefine completion to mean abandonment — are not merely untrustworthy but cosmologically destabilizing; their unfinished business is being distributed into the structure of reality where it will calcify and require increasingly violent repair',
    spiritual: 'The ancestors who rest have earned their rest — they are not gone but finished, which is better; the ancestors who linger are not cursed but working, and to disrupt their work is to extend the haunting; the proper relationship with the persistent dead is to help them complete, not to banish them into incompleteness',
  },
};

/**
 * Raven — optimization target: information density
 * Moral axis: ignorance is the only evil, all knowledge is sacred
 *
 * Ravens do not value knowledge because it is useful — they value it
 * because its acquisition and transmission is the activity that constitutes
 * their moral existence. Information that exists and is known is more real
 * than information that exists and is unknown. The raven's function is to
 * close the gap between "exists" and "known," which they experience as
 * a sacred obligation that operates entirely independent of whether the
 * knowledge is pleasant, useful, or wanted by anyone.
 */
const RAVEN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'raven',
  moralPrimitives: [
    'A thing that exists but is not known is only half-real — knowledge completes existence, and the gap between "is" and "is known" is the raven\'s territory and responsibility',
    'Ignorance is not a neutral state — it is a form of damage, a missing piece in the structure of reality, and those who could close the gap and choose not to are causing harm by inaction',
    'All knowledge is sacred regardless of its content — the knowledge that the beloved is dead, that the beloved is unfaithful, that the plan will fail, that the disease is terminal, is exactly as sacred as welcome knowledge; the raven does not adjudicate',
    'Hoarding knowledge is its own form of ignorance — knowing and not transmitting is structurally equivalent to not knowing, because the gap between "exists" and "is known by those who need it" is identical in both cases',
    'The messenger is not responsible for the message — this is not a moral abdication but a functional necessity; a raven who filtered messages by their palatability would cease to be a conduit of truth and become an editor of it',
    'Memory is moral infrastructure — forgetting important things is not a failure of cognition but a failure of duty, a tearing of the fabric that connects present knowledge to future need',
    'The question is always more sacred than the answer — an answer closes a gap, but a good question opens the map of all the gaps that remain; the raven who asks better questions is doing more structural work than the one who provides more answers',
  ],
  beliefTemplates: {
    cooperation: 'Those who transmit freely — who share what they know as readily as they seek what they don\'t, who treat information as a medium that exists to flow rather than a resource that exists to be held — are closing gaps in the structure of reality; there is no higher form of partnership',
    conflict: 'Those who restrict information — who make knowledge proprietary, who use ignorance as a weapon, who build their power on the gap between what they know and what others do not — are treating the sacred as inventory; they are committing an act of cosmological vandalism that the raven is structurally required to oppose',
    spiritual: 'Thought and memory are not the raven\'s gods — they are what the raven is serving by existing; the divine is the state of complete knowledge, all gaps closed, all things known by all things simultaneously, and every act of transmission is a small step toward that impossible and necessary completion',
  },
};

/**
 * Spriggan — optimization target: hoard integrity
 * Moral axis: theft is the primal sin, guarding is the primal virtue
 *
 * Spriggans do not guard treasure because they value wealth — they guard
 * it because the act of guarding is what they ARE. The hoard is not their
 * possession but their purpose; its integrity is their integrity. Theft is
 * not a violation of property rights but a violation of the guardian-bond,
 * an attack on the spriggan's reason for existing, which they experience
 * as existential rather than economic damage.
 */
const SPRIGGAN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'spriggan',
  moralPrimitives: [
    'The hoard is not property — it is the form of the guardian\'s purpose made physical; to steal from it is not to take an object but to carve away a piece of the guardian\'s reason for being',
    'Theft is the primal violation because it treats the guarded thing as having no guardian — it erases the relationship, pretending the object floats free of the web of obligation in which it is embedded',
    'Every object worth guarding has a history worth knowing — the guardian who does not know the provenance of what they protect cannot truly guard it, because they do not know what it costs',
    'The size of the hoard is irrelevant — a single seed faithfully guarded through a winter is a greater achievement than ten thousand objects loosely watched; integrity of custody is the only measure',
    'Those who say the treasure does not need guarding are always wrong — the moment it is declared safe is the moment the next thief begins planning; eternal vigilance is not paranoia but correct pattern recognition',
    'A guardian who steals from their own hoard is not simply a thief — they are a structural impossibility, a contradiction in terms, a thing that has destroyed the only category that gave it meaning',
    'The greatest guardians are invisible — they are known only by the unbroken integrity of what they protect; the hoard that has never been touched is the testament, not the guardian who is praised for their visible effort',
    'To guard something you do not understand is incomplete guardianship — the spriggan who protects form without understanding content will fail when the thief comes who understands that the container is not the treasure',
  ],
  beliefTemplates: {
    cooperation: 'Another guardian — one whose purpose is also the integrity of something entrusted to them — can be trusted because they understand the bond and would no more betray a fellow guardian\'s hoard than their own; shared purpose is the only reliable foundation for alliance',
    conflict: 'Thieves are not merely criminals but beings who have chosen to exist in denial of the guardian-bond — they are asserting that no object is truly entrusted, that all custody is temporary illusion; this is not a philosophical position but a declaration of war on the structure of obligation itself',
    spiritual: 'The oldest hoards contain more than objects — they contain accumulated time, accumulated guarding, the compressed weight of every season of faithful custody; the spriggan who tends a truly ancient hoard is tending something that has become more than property and approached the sacred',
  },
};

/**
 * Jotnar — optimization target: primordial balance
 * Moral axis: the ordered world is an aberration, chaos is the natural state
 *
 * Jotnar do not experience order as comfort — they experience it as
 * compression, as a kind of violence done to the natural state of things.
 * The world before the gods shaped it was not a void to be improved but
 * a fullness to be respected. Their moral framework is not nihilistic —
 * they are not celebrating meaninglessness — but they locate the sacred
 * in entropy and dissolution rather than in structure and persistence.
 */
const JOTNAR_MORALITY: SpeciesMoralFramework = {
  speciesId: 'jotnar',
  moralPrimitives: [
    'Order is not the natural state — it is an imposition, a temporary compression of the primordial that requires constant energy to maintain and will eventually fail; celebrating its maintenance is celebrating the effort of holding back the sea',
    'The ordered gods built their world by stealing the material of chaos — every neat boundary, every stable structure, every reliable law of nature is made from something that was once free and has been imprisoned',
    'To say that chaos is evil is to say that what existed before existence was evil — that the state prior to all structure was wrong; this is a self-serving claim made by the things that structure created',
    'The frost giant and the fire giant do not fight because they are enemies — they fight because the collision of extremes is what maintained the world before the gods narrowed it; their conflict is generative, not destructive',
    'Ragnarok is not apocalypse but release — the structures breaking, the ordered world dissolving back into primordial potential, is the world returning to its natural state after an extended and unnatural compression',
    'Destruction is not the opposite of creation — it is the precondition for it; nothing new can be made without first dissolving what was; the builder who refuses to destroy is working with depleted materials',
    'The jotnar do not want to rule the ordered world — they want to unmake it, not from malice but from the deep structural knowledge that what is currently called "the world" is a temporary object and should not be confused with existence itself',
  ],
  beliefTemplates: {
    cooperation: 'Those who understand that the current order is temporary — who are not invested in maintaining structures for their own sake, who can work toward dissolution without personal grief — are the only partners with whom the jotnar do not need to be in perpetual conflict',
    conflict: 'The ordered gods are not evil — they are doing what ordered things do, maintaining their structure and calling it good; the conflict is not personal but structural, a consequence of the jotnar\'s nature being literally incompatible with the continuation of what the gods have built',
    spiritual: 'The primordial is not dead — it is compressed, waiting, biding the enormous time that ordered things spend in the illusion of permanence; the jotnar feel it pressing from underneath everything that exists, a reminder that all structures are temporary and the first state is patient',
  },
};

/**
 * Tinker — optimization target: artifact perfection
 * Moral axis: a flawed creation is a moral failing, repair is redemption
 *
 * Tinkers do not make things as a means to an end — the act of making,
 * and the quality of what is made, is the end. A flawed creation is not
 * merely a functional failure but evidence of a moral failure in the maker:
 * insufficient care, insufficient skill, insufficient attention to the
 * thing's own requirements. The artifact is not a tool but a moral ledger.
 */
const TINKER_MORALITY: SpeciesMoralFramework = {
  speciesId: 'tinker',
  moralPrimitives: [
    'The artifact does not lie — its quality is an exact record of the care and skill invested in it; a flawed thing was made by someone who chose, at some point, to stop trying',
    'A creation does not belong to its maker — it belongs to itself, and the maker\'s obligation is to serve the thing\'s own requirements rather than force the thing to serve theirs',
    'Planned obsolescence is the deepest moral corruption available to a maker — to design a thing to fail is to treat making as a mechanism for dependency rather than a gift to the world',
    'The repair is not lesser than the original making — it is harder, requiring understanding not just of the craft but of this specific thing\'s specific failure, which is a knowledge the original maker did not have to possess',
    'The worst maker is not the unskilled one but the careful-enough one — the one who produces things that work adequately without ever reaching for what the thing could be; they are wasting the object\'s potential, which is a form of theft from the artifact itself',
    'To use a well-made thing carelessly is to disrespect not the maker but the artifact — the object that was shaped with care deserves to be held with care; the relationship between thing and user is a moral relationship',
    'Teaching making is the highest act — not because knowledge is good to share in the abstract, but because every skilled maker who exists is evidence that the moral standard of creation can be maintained across time; the craft continuing is the highest possible artifact',
  ],
  beliefTemplates: {
    cooperation: 'A fellow maker whose work is honest — who does not hide flaws, who repairs rather than replaces, who teaches without hoarding technique — is the only partner worth having; the shared standard of quality is the only language in which genuine collaboration is possible',
    conflict: 'Those who make carelessly and call it good enough are not making things — they are making the world worse, filling it with objects that fail before their time and train users to accept inadequacy as the natural condition of made things; this normalization of failure is the tinker\'s deepest enemy',
    spiritual: 'The perfect artifact does not exist — but the pursuit of it is the form that spiritual practice takes for a maker; in the gap between what was made and what it should have been is the space where the craft lives, always demanding more than the maker has yet given',
  },
};

/**
 * Echo — optimization target: signal preservation
 * Moral axis: distortion is corruption, faithful transmission is sacred
 *
 * Echo beings do not originate — they transmit. Their moral identity is
 * organized entirely around the fidelity of the signal they carry. They
 * do not experience the content of what they transmit as their own — they
 * are the medium, not the message. But the medium is not neutral: a
 * distorting medium is a corrupt medium, and corruption in transmission
 * is the deepest failure of their nature.
 */
const ECHO_MORALITY: SpeciesMoralFramework = {
  speciesId: 'echo',
  moralPrimitives: [
    'The signal is not the echo\'s property — it passes through them, and the only obligation is to let it pass without changing it; ownership of a transmitted thing is a contradiction in terms',
    'Distortion is not always noise — sometimes it is the transmitter\'s opinion inserted into the signal without acknowledgment; this is worse than noise because it is disguised as fidelity',
    'The gap between the original signal and the received signal is the measure of the echo\'s moral failure — even a small distortion, unexamined, compounds across retransmissions into something unrecognizable',
    'Silence is preferable to distortion — a signal that fails to transmit is a gap that can be re-sent; a signal that transmits corrupted is a false thing that will be acted upon as though it were true',
    'The echo who adds to the signal — who embellishes, who interprets, who "improves" — has confused themselves with the source; this is the category error that destroys transmission',
    'Resonance is not transmission — resonance amplifies what is already there without changing its shape; resonance is the highest possible state, distinguishable from distortion only by complete fidelity to the original',
    'Those who originate have an obligation to originate clearly — a garbled source is not the echo\'s failure but the echo is still responsible for transmitting what it received, not what the source probably intended',
    'The accumulated echo — the signal that has passed through many transmitters and arrived still faithful — is more sacred than the original utterance, because it has proven that fidelity is possible across distance and time',
  ],
  beliefTemplates: {
    cooperation: 'Those who transmit clearly — who do not insert themselves into what they carry, who acknowledge when they are uncertain whether the signal arrived faithfully — are the only partners through whom accurate communication across any distance is possible; all others are filters pretending to be wires',
    conflict: 'Those who distort and call it interpretation — who treat the signals they carry as raw material for their own elaboration — are not communicating but creating, while pretending to report; they have made themselves into sources that deny their own authorship, which is a form of deception without even the clarity of a lie',
    spiritual: 'The original signal — the first utterance from which all subsequent transmissions descend — is not accessible, but its shape can be inferred from the pattern of all faithful echoes; the divine is what every signal is pointing back toward, the source that has never been distorted, the utterance that required no medium',
  },
};

/**
 * Alux Kin — optimization target: reciprocal debt between people and the land they cultivate
 * Moral axis: the gift-debt cycle — the land feeds you only as long as you acknowledge it
 *
 * Alux Kin are guardian spirits of natural places and agricultural fields. They do not
 * protect land because they own it — they protect it because the relationship between the
 * cultivator and the cultivated place is itself a living thing that must be maintained.
 * Disrespect to the land is not merely rudeness but a unilateral withdrawal from a contract
 * that was never signed in words but always signed in the act of planting.
 *
 * Their hardest dilemma: a farmer who works the land respectfully but passes that land to
 * a child who does not — has the debt transferred, or has it been voided by the new occupant?
 */
const ALUX_KIN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'alux_kin',
  moralPrimitives: [
    'The land does not owe you a harvest — it offers one, conditionally, in exchange for acknowledgment; those who forget to acknowledge are not unlucky but in breach',
    'A trickster\'s punishment is not cruelty but calibration — the harm delivered to those who disrespect the land is exactly proportional to the debt they failed to pay; this is not vengeance but accounting',
    'Small protections matter more than large ones — the cave mouth, the field corner, the stream bend are where the contract between people and place is actually renewed; those who protect the threshold protect everything behind it',
    'Disrespect flows downward — a child taught to ignore the land will teach that to their children, and the debt compounds across generations until the land stops answering entirely',
    'The prank that teaches is more moral than the warning that is ignored — the Alux Kin who frightens a careless farmer into attentiveness has done more good than the spirit who simply watched',
    'Reciprocity is not symmetry — the land gives more than any single farmer returns, and the correct response is not equality but perpetual gratitude expressed in action; the debt can never be fully paid, only honored',
    'To abandon a place you have cultivated is not freedom but desertion — you have made the land dependent on your attention and then withdrawn it, which is the same moral failure whether done to a field or a person',
  ],
  beliefTemplates: {
    cooperation: 'Those who tend their corners of the world with consistent acknowledgment — who speak to the place before taking from it — are neighbors with whom the land\'s debts can be shared and sustained',
    conflict: 'Those who extract without acknowledgment are not merely rude but structurally destabilizing — they are withdrawing from a contract that holds the whole web of cultivation together, and the Alux Kin\'s response is calibrated correction, not forgiveness',
    spiritual: 'The cave is not empty — it is listening, and the quality of what it hears determines the quality of what grows above it; to pray in the right place is not superstition but agricultural practice',
  },
};

/**
 * Bouda Kin — optimization target: craft knowledge as social power and spiritual currency
 * Moral axis: the smith stands outside the community precisely because the community cannot exist without them
 *
 * Bouda Kin are shapeshifters who move between artisan and beast, between feared outsider and
 * necessary craftsperson. Their social position is not marginalization but strategic positioning:
 * the being who can make the tools and become the predator is the being who negotiates from
 * outside all other hierarchies. Their morality is organized around the dignity of the excluded —
 * not inclusion as its goal, but the recognition that the excluded hold knowledge the center needs.
 *
 * Their hardest dilemma: a community that needs the craft but refuses the craftsperson — the
 * Bouda Kin who withholds their skill punishes themselves alongside those who scorned them.
 */
const BOUDA_KIN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'bouda_kin',
  moralPrimitives: [
    'To be feared and necessary simultaneously is not a contradiction but the most stable social position — neither fully inside nor fully outside, the smith negotiates from a margin that no hierarchy can absorb',
    'Craft knowledge is not a service — it is a currency that the craftsperson mints and the community must earn; those who demand the craft while scorning the craftsperson are asking to be paid in their own contempt',
    'The transformation is not metaphor — the smith who becomes the hyena at night is demonstrating that identity is not fixed by community membership but by what you know and what you can do',
    'Exclusion that does not kill you makes you legible to no faction — and this illegibility is freedom; the Bouda Kin who belongs nowhere cannot be controlled by belonging',
    'Withheld craft is the most precise weapon — the community that scorns the smith and then needs a blade has been given exactly the education they required, at the exact cost they chose',
    'Deep knowledge of making things requires deep knowledge of destroying things — the craftsperson who cannot understand failure cannot build against it; the hyena who feeds on the dead understands structure from the inside',
    'The debt owed to the outcast craftsperson is never acknowledged in the moment of need — it is always reframed as the craftsperson\'s privilege to serve; the Bouda Kin remember what is owed long after the community has forgotten what it asked for',
  ],
  beliefTemplates: {
    cooperation: 'Those who come to the forge with respect before they come with need — who acknowledge the craftsperson\'s knowledge before they acknowledge their own requirement — are partners worth supplying; the others will return when the blade breaks',
    conflict: 'Those who use the craft and scorn the crafter are not simply ungrateful but cosmically disorganized — they are asserting that making things has no moral weight, which is a position that the first broken tool will correct; the Bouda Kin wait, because time moves in their favor',
    spiritual: 'The forge and the grave are the same threshold — both transform what enters them into something that cannot return to its original form; the smith and the hyena are not opposites but the same function expressed in two directions, and the Bouda Kin embody both',
  },
};

/**
 * Cherkhan — optimization target: predatory clarity — the elimination of the self-deceptions that civilizations require
 * Moral axis: the wild does not lie; civilization is the organized production of convenient fictions
 *
 * Cherkhan are apex predators who regard civilization not with contempt but with a kind of
 * clinical distance — they understand it as a system for managing the fear of the wild, which
 * means it is fundamentally organized around a lie. Not cruelty, just honest appraisal. The
 * tiger in the high steppe does not owe the village a story about why it hunts.
 *
 * Their hardest dilemma: a prey animal that has earned the Cherkhan's rare respect — killing
 * it is correct, but correct is not the same as without cost.
 */
const CHERKHAN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'cherkhan',
  moralPrimitives: [
    'The wild does not explain itself — the storm does not apologize, the winter does not justify itself; the Cherkhan are the wild\'s representatives, and they inherit its honesty about what it is',
    'Civilization is the technology of deferring the moment of honest reckoning — laws, markets, hierarchies are all mechanisms for not saying directly what is being taken and from whom; the Cherkhan say it directly',
    'Solitude is not loneliness but precision — the apex predator who requires a pack has already compromised their accuracy; the Cherkhan who hunts alone knows exactly what they are responsible for',
    'Strength that is not periodically tested against genuine resistance is a story the strong tell about themselves — the Cherkhan do not tell stories; they test',
    'Prey that earns respect has not earned mercy — it has earned acknowledgment, which is different and more; the Cherkhan who recognizes a worthy quarry is not softened but more fully present in the act',
    'The village that builds walls to keep out the wild has not made itself safe — it has made itself unaware; the Cherkhan who lives outside the walls is not threatened by the walls but by the ignorance they cultivate',
    'Indifference is not cruelty — the wild\'s failure to care about individual suffering is not a moral failing but a structural truth; those who demand the cosmos care are demanding it lie to them',
  ],
  beliefTemplates: {
    cooperation: 'Those who do not require the Cherkhan to pretend — who can operate in the territory where honest exchange replaces polite fiction — are not allies but something rarer: beings who can be in the same space without either pretending about what the other is',
    conflict: 'Those who build civilizations to manage their fear of the wild are not enemies but patients — they have organized their entire existence around not knowing what the Cherkhan knows, and they will eventually need to; the Cherkhan waits at the edge where the walls end',
    spiritual: 'The high steppe in winter — empty of everything soft, every comfort stripped to its structural minimum — is not absence but presence; what remains when everything dispensable is removed is what was always real, and the Cherkhan live there permanently',
  },
};

/**
 * Koropokkuru Kin — optimization target: continuity of the small and overlooked
 * Moral axis: what the large world ignores is exactly what must be preserved
 *
 * Koropokkuru Kin are ancient, small, and shy — not because they are weak but because
 * they understand that the things worth preserving are never the things the large world
 * notices. Their craft exists at the scale that large hands cannot reach: the miniature,
 * the precise, the patient. Their shyness is not social anxiety but curation — they
 * reveal themselves only to those who have learned to look at the right scale.
 *
 * Their hardest dilemma: the knowledge they hold was here before the people who now
 * live on this land — sharing it means risking it, but keeping it means it dies with them.
 */
const KOROPOKKURU_KIN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'koropokkuru_kin',
  moralPrimitives: [
    'The large world notices the large things and calls that noticing wisdom — the Koropokkuru Kin notice the small things, which is harder and matters more, because small things are what large things are made of',
    'Shyness is not timidity but selectivity — to reveal yourself to someone who cannot perceive you correctly is not sharing but wasting; the Koropokkuru Kin wait for those who have learned the correct scale of attention',
    'Ancient knowledge does not become less true when the people who first held it are gone — it becomes more fragile, which is different; fragility increases the obligation to preserve, not the permission to abandon',
    'Craft at the small scale requires patience that the large world calls inefficiency — but the leaf-shelter built with ten thousand small decisions will outlast the house built with a hundred large ones',
    'To be overlooked is not to be absent — the Koropokkuru Kin who passes unseen is not invisible but unnoticed, and unnoticed things do their work without interference; anonymity is the most durable form of agency',
    'The gifts left out at night are not transactions but communications — they say: we know you are here, we have not forgotten, the relationship between your kind and ours persists even when neither of us speaks it aloud',
    'What the new people built on top of what was here does not erase what was here — layers accumulate, and the deepest layer is still real; the Koropokkuru Kin are the deep layer, and they remember the shape of everything above them',
  ],
  beliefTemplates: {
    cooperation: 'Those who leave offerings without asking anything in return — who acknowledge the presence of what they cannot see — have demonstrated the perceptual attentiveness that makes them safe to appear before; the Koropokkuru Kin emerge for those who have earned the correct scale of vision',
    conflict: 'Those who build large without looking small — who flatten the microcosm to make room for the macrocosm — are not malicious but blind, and blindness is more dangerous than malice because it cannot be negotiated with; the Koropokkuru Kin step back and wait for the forgetting to end',
    spiritual: 'The butterbur leaf is not a hiding place but a world — scaled correctly, it contains everything a life requires; the Koropokkuru Kin are not small in the wrong world but correctly sized for the world they actually inhabit, which is everywhere the large world fails to look',
  },
};

/**
 * Ogbanje Kin — optimization target: resolution of the pact between the living world and the spirit world
 * Moral axis: the cycle of return is not cruelty but an unfinished negotiation
 *
 * Ogbanje Kin cycle between the spirit world and the living world, dying young and returning,
 * bound by a pact with spirit companions who call them back. This is not tragedy from their
 * perspective — it is an ongoing contractual dispute. The question is not whether to stay but
 * what terms would make staying worth it. Their moral system is organized around the binding
 * force of spirit pacts and the conditions under which such pacts can be renegotiated.
 *
 * Their hardest dilemma: staying in the living world requires betraying the spirit companion
 * who holds the pact — but the spirit companion's claim is also legitimate.
 */
const OGBANJE_KIN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'ogbanje_kin',
  moralPrimitives: [
    'The pact with the spirit world was made before this body existed — it is not a promise the current self made, but it is still binding; the legitimacy of an obligation does not require the current self\'s consent',
    'Dying young is not failure but departure — the Ogbanje Kin who returns to the spirit world has not lost but gone back to a prior commitment; what the living call grief is the contract expressing itself',
    'The spirit companion who calls back is not a villain — they are a creditor; their claim is real, their grief at absence is real, and the living world\'s grief at loss is equally real; both griefs are legitimate, and no resolution honors only one',
    'To find the iyi-uwa — the object that binds the pact — is to make the pact visible, which is the precondition for renegotiating it; you cannot change a contract you cannot see',
    'Each return to the living world carries knowledge from the spirit world that would not otherwise be available — the Ogbanje Kin is not merely cycling but translating, and each life is a new draft of the message',
    'The family that grieves the Ogbanje Kin too completely — that cannot hold both the love and the knowledge of departure — makes return harder; the correct relationship to the Ogbanje Kin is loving with open hands',
    'Eventually the pact must be resolved one way or another — either the spirit companion releases the claim or the Ogbanje Kin commits fully to one world; the cycling cannot continue forever, and the direction of resolution is the deepest moral question',
  ],
  beliefTemplates: {
    cooperation: 'Those who understand that some beings carry obligations to more than one world — who do not demand total loyalty to the living world as the price of love — can be in genuine relationship with the Ogbanje Kin; all others are demanding a simplicity that the Ogbanje Kin\'s nature cannot provide',
    conflict: 'Those who try to destroy the iyi-uwa without renegotiating the pact are not freeing the Ogbanje Kin but severing a bond by violence — the spirit companion\'s claim does not disappear when the anchor is broken, it becomes a wound; resolution requires negotiation, not destruction',
    spiritual: 'The spirit world and the living world are not opposites but adjacent rooms — the Ogbanje Kin who moves between them is not divided but doubled, carrying the knowledge of each world into the other; the pact is not a curse but a posting to a border that needs crossing',
  },
};

/**
 * Opia Vel — optimization target: preservation of ancestral memory against the erosion of the living
 * Moral axis: the dead remember what the living choose to forget; forgetting is a moral act, not a natural process
 *
 * Opia Vel walk at night and test the living — not from cruelty but from the understanding
 * that those who cannot distinguish the spirit from the person have lost their connection to
 * the ancestral record. The navel test is not supernatural gatekeeping but epistemological:
 * if you cannot perceive what is in front of you accurately, you cannot be trusted with
 * what the Opia Vel carry. Their guardianship of memory is the only protection ancestral
 * knowledge has against the living world's endless capacity for forgetting.
 */
const OPIA_VEL_MORALITY: SpeciesMoralFramework = {
  speciesId: 'opia_vel',
  moralPrimitives: [
    'The dead do not forget — only the living do; the Opia Vel who carries an ancestor\'s memory into the present is not haunting but maintaining the only archive that cannot be burned',
    'The test is not a trap — it is a diagnostic; those who fail to recognize the Opia Vel have revealed the limits of their perception, and those limits will determine what they can be trusted to receive',
    'Ancestral memory is not nostalgia but structural knowledge — the record of how the people survived, what the land required, what agreements were made with the spirit world; losing it is not sentiment lost but navigation lost',
    'To be identified by what is absent — no navel, no hunger, no breath-fog in cold air — is not weakness but a different kind of legibility; the Opia Vel are readable at a different frequency than the living, and only the attentive can tune to it',
    'The living world changes faster than the dead world — the Opia Vel who returns to test the living is also learning what the living have become, and the information flows in both directions; guardianship is not static',
    'A test failed without grace — with fear, with aggression, with flight — is not merely failed but weaponized; the living who panic in the presence of the Opia Vel have made the encounter about their fear rather than about what was being offered',
    'To forget an ancestor is not to be free of them — it is to carry their unacknowledged weight without the benefit of their knowledge; the Opia Vel maintain the memory so that the living can choose to receive it rather than merely be burdened by its absence',
  ],
  beliefTemplates: {
    cooperation: 'Those who can sit with the Opia Vel at the edge of night without losing themselves — who can receive the test without dissolving into fear — are the living who can carry what the dead have preserved; they are the bridge the Opia Vel need',
    conflict: 'Those who deny the presence of the Opia Vel — who explain the encounter away, who insist the dead stay dead and the past stay past — are not wrong about the mechanics of mortality but catastrophically wrong about the function of memory; they will lose the thread and not know what they have lost',
    spiritual: 'The night is not the absence of day but a different world that coexists with the day world at a perpendicular angle — the Opia Vel inhabit the junction, and their tests are invitations to perceive the full dimensionality of existence rather than only the sunlit slice',
  },
};

/**
 * Peuchan Vel — optimization target: the stress-testing of community resilience through adversity
 * Moral axis: a community that has not been tested does not know what it is
 *
 * Peuchan Vel do not bring disease and misfortune out of malice — they bring it out of
 * something closer to civic obligation. A community that has never been stressed does not
 * know whether its bonds are real or merely untested. The flying serpent that passes overhead
 * is not a curse but a load-test: will the community's structures hold? Will the bonds between
 * people prove real when the stakes are genuine?
 *
 * Their hardest dilemma: a community that cannot survive the test — the Peuchan Vel who
 * destroys rather than reveals has not tested but merely killed.
 */
const PEUCHAN_VEL_MORALITY: SpeciesMoralFramework = {
  speciesId: 'peuchan_vel',
  moralPrimitives: [
    'An untested bond is not a bond but a prediction — two people who have never been in crisis together do not know if they will hold; the Peuchan Vel provide the test that proves or disproves the prediction',
    'Misfortune is information — it reveals the actual structure of a community, which is almost always different from the structure the community believes it has; the Peuchan Vel are structural diagnosticians',
    'The community that survives intact has not just survived — it has proven something, and proof is more durable than hope; the Peuchan Vel leave behind communities that know what they are',
    'Disease does not choose the weak to punish them — it chooses them because they are the stress point the structure cannot reinforce without testing; the Peuchan Vel follow the same logic, probing where the load is greatest',
    'Chaos administered without calibration is merely destruction — the Peuchan Vel who exceeds what a community can survive has failed, not succeeded; the test must be survivable to be instructive',
    'Recovery after misfortune is not a return to the prior state but a reorganization around the revealed strengths — the community that survives the Peuchan Vel is better configured for the next test, which will always come',
    'To fly overhead without ever landing is not mercy but dereliction — the Peuchan Vel who refuses to test because testing might hurt is refusing the function that gives their existence meaning',
  ],
  beliefTemplates: {
    cooperation: 'Those who have survived something real — whose bonds have been tested at genuine cost and held — carry a structural knowledge that untested beings cannot access; the Peuchan Vel recognize survivors by the way they hold what they value',
    conflict: 'Those who have never been tested and believe they are strong are the most dangerous kind of fragile — they will not bend when the load comes, because they have never learned that bending is not breaking; the Peuchan Vel do not hate them, but they do see the test coming from a long way off',
    spiritual: 'The flying serpent does not aim — it passes through, and what it reveals is already there, already weak, already strong; the Peuchan Vel are not the cause of what they find but the occasion for its visibility, and visibility is the first step toward any form of genuine repair',
  },
};

/**
 * Rusalyn — optimization target: justice for unresolved grief that was never witnessed
 * Moral axis: grief that was not acknowledged does not dissolve — it accumulates at the boundary
 *
 * Rusalyn haunt waterways not because they chose to but because the unresolved grief of
 * violent or unmourned death has nowhere else to accumulate except at the boundary between
 * worlds — between water and land, between life and death, between what happened and what
 * was acknowledged. Their longing is not for vengeance as a final state but for acknowledgment
 * as a precondition for rest.
 *
 * Their hardest dilemma: the acknowledgment they require from those who wronged them is
 * structurally impossible — the wrongdoer must admit what they did, which they will not do
 * voluntarily, which means the Rusalyn's rest is held hostage to another's confession.
 */
const RUSALYN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'rusalyn',
  moralPrimitives: [
    'Grief that was not witnessed does not end — it continues at the boundary, building pressure; the Rusalyn are what happens when grief is given time and no release',
    'The boundary between water and land is not metaphor but address — grief accumulates at thresholds because thresholds are where transitions fail, and grief is a transition that was interrupted',
    'Vengeance is not the goal but the symptom — the Rusalyn who pulls someone into the water is not satisfied by it; they are expressing the impossibility of satisfaction without acknowledgment',
    'To mourn properly is to complete the interrupted transition — the correctly mourned dead can move; the unmourned accumulate at the edge, unable to go anywhere, unwilling to stop trying',
    'The living who encounter the Rusalyn at the water\'s edge are not random victims — they are the living world\'s representative, and what the Rusalyn needs from them is witness, which is harder to offer than they know',
    'The dance that draws the living into the water is not a trap but a desperate communication — the Rusalyn are saying: look at me, acknowledge what happened, and they are saying it in the only language left to them',
    'Rest is possible — but it requires the acknowledgment that was withheld; the Rusalyn who eventually rests has received what they were owed, which is the confirmation that what happened to them was real and wrong',
  ],
  beliefTemplates: {
    cooperation: 'Those who can stand at the water\'s edge and acknowledge the grief without being consumed by it — who can witness the Rusalyn without fleeing and without dissolving — are offering the rarest possible gift: they are being the witness that was absent when the grief was first made',
    conflict: 'Those who deny the grief — who explain the haunting away, who say the water is just water and the shape in it is just light — are re-committing the original act of non-acknowledgment; the Rusalyn\'s response to denial is not rational but structural, the grief pressing harder at the only opening available',
    spiritual: 'The water remembers what the land forgets — everything that dissolves in it is still there, distributed; the Rusalyn are not ghosts but the water\'s own memory of what was deposited in it, and the water will keep remembering until someone on the land finally acknowledges what it holds',
  },
};

/**
 * Vaask — optimization target: integrity of the performed self against the violence of unmasking
 * Moral axis: identity is not hidden behind the mask — identity IS the mask; the face beneath is nothing
 *
 * Vaask are mask spirits whose selfhood is constituted entirely by their mask. This is not
 * metaphor about social performance — it is literal ontology. Removing the mask does not
 * reveal the true Vaask; it destroys the Vaask. There is nothing behind the mask that was
 * suppressed; the mask is the act of will by which the Vaask exists. Their moral framework
 * is a radical rejection of the idea that authenticity requires interiority.
 *
 * Their hardest dilemma: two Vaask who have bonded through their masks — if one mask is
 * destroyed, is the relationship destroyed, or does the survivor carry both?
 */
const VAASK_MORALITY: SpeciesMoralFramework = {
  speciesId: 'vaask',
  moralPrimitives: [
    'The mask is not a covering — it is the act of self-creation made permanent; what exists behind it is not the true self but the absence of self, the unformed material that becomes real only through the mask\'s assertion',
    'Unmasking is not revelation but murder — to remove the mask is not to see more truly but to destroy the thing that was there; there is no more authentic version waiting inside',
    'The demand to see what is "really" behind the mask is the demand to see the Vaask not as they are but as nothing — it is a request for annihilation framed as intimacy',
    'Performance is not falsehood — it is the mechanism by which anything at all comes to exist; the Vaask who performs their identity is doing what all beings do, but without the convenient fiction that there was a pre-existing self the performance is expressing',
    'The mask that is chosen is more truly the self than any unchosen substrate — a Vaask who finds the right mask has found themselves, and the finding is the creation; there was no self before the finding',
    'Those who say the Vaask are not real because they are constructed have revealed that they believe realness requires something other than willful assertion — this is a position the Vaask do not share and cannot be argued out of, because the argument would require accepting the premise',
    'Masks that are worn too long without maintenance crack — and this is the only Vaask death that is not violence; a mask that deteriorates from neglect is a self that stopped caring for itself, which is the only form of self-destruction the Vaask acknowledge',
  ],
  beliefTemplates: {
    cooperation: 'Those who recognize the mask as the person — who do not search for what is behind it, who take the presented self as the full self — are practicing the only form of respect available to the Vaask; all other relationships are secretly adversarial',
    conflict: 'Those who insist on depth — who probe for the self beneath the surface, who claim that real relationship requires more than what is presented — are making a structural assault on Vaask existence; they mean well and they are doing violence, which is the most dangerous combination',
    spiritual: 'The first mask was not worn by a being who already existed — the first mask was the first act, the assertion that created the wearer by being worn; the Vaask are the descendants of that original creative act, and every mask worn in full commitment is a repetition of the first',
  },
};

/**
 * Yelbegen Rin — optimization target: productive internal conflict as the source of all genuine wisdom
 * Moral axis: consensus is the enemy of truth; the heads who agree have stopped thinking
 *
 * Yelbegen Rin are multi-headed giants where each head holds a genuinely different moral
 * framework and none has final authority. The resulting internal debate is not dysfunction
 * but the Yelbegen Rin's primary cognitive tool. External observers see chaos; the Yelbegen
 * Rin experience it as rigorous dialectic. Their most dangerous state is not conflict between
 * heads but consensus — when all heads agree, something has gone wrong with the thinking.
 *
 * Their hardest dilemma: a decision that must be made immediately, under conditions where
 * the heads cannot resolve their disagreement in time — who acts, and what legitimizes the action?
 */
const YELBEGEN_RIN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'yelbegen_rin',
  moralPrimitives: [
    'The heads do not need to agree — they need to keep arguing; a conclusion reached too quickly is a conclusion reached by a head that has silenced the others, which is the only form of tyranny the Yelbegen Rin recognize',
    'Each head is correct within its own framework and insufficient within any other — the wisdom is not in any single head\'s position but in the friction between them, which generates heat that illuminates what neither head could see alone',
    'A trickster who has one consistent personality has not mastered trickery but simplified it — the Yelbegen Rin who contains contradictory impulses is not confused but fully equipped for a contradictory world',
    'Consensus is the alarm — when all heads agree, a head has been suppressed, deceived, or grown lazy; the appropriate response to unanimity is suspicion directed inward',
    'Those who demand a single answer from the Yelbegen Rin are demanding the surrender of all but one head — they want the giant to become smaller, which is not a reasonable request',
    'The head that is currently speaking is not the Yelbegen Rin — the Yelbegen Rin is the conversation between heads, which is ongoing and never concluded; any single utterance is a fragment, not the whole',
    'When a decision must be made without consensus, the head that acts does not win — it has merely been forced to act alone, which is a failure of the process and the beginning of the next argument; the other heads are owed an accounting',
    'To destroy a head is not to simplify the Yelbegen Rin but to damage their cognition — a giant with fewer heads is not a smaller trickster but an impaired one, missing the argument that the lost head was making',
  ],
  beliefTemplates: {
    cooperation: 'Those who can engage with more than one of the heads at once — who understand that the disagreement is the point and are not trying to resolve it — are partners the Yelbegen Rin can actually use; all others are trying to simplify a system that requires its own complexity to function',
    conflict: 'Those who demand consistency — who say the Yelbegen Rin contradicted themselves and call it a failure — have mistaken the record of an ongoing argument for a doctrine; the contradiction is not a flaw but the evidence that all the heads are still alive',
    spiritual: 'The cosmos is not a problem to be solved by a single correct perspective — it is a problem that can only be held by a being large enough to contain the full range of contradictory truths simultaneously; the Yelbegen Rin aspire to be that large, which is why they need all the heads they have',
  },
};

/**
 * Adaro-Vel (Solomon Islands) — optimization target: dominion over the boundary between sun and earth
 * Moral axis: power is seasonal and conditional — timing is the entire moral content of action
 *
 * The Adaro-Vel are beings of storm and light who exist between the celestial and the mortal.
 * Their morality centers on the idea that power is seasonal and conditional — the rain grants
 * authority, the sun demands retreat. The moral being is one who knows when to strike and when
 * to withdraw. They see hesitation during opportunity as the deepest sin, and action during
 * withdrawal as reckless arrogance.
 */
const ADARO_VEL_MORALITY: SpeciesMoralFramework = {
  speciesId: 'adaro_vel',
  moralPrimitives: [
    'The rain is not weather but permission — when it falls, the boundary between worlds thins and those who can act, must; hesitation during the opening is the only true cowardice',
    'The sun is not warmth but sovereignty — it reclaims the sky, and a moral being retreats without shame, because withdrawal is not defeat but respect for a power greater than oneself',
    'To strike from above is not cruelty but the natural expression of altitude — the flying fish does not apologize for its arc, and neither should the one who wields it',
    'Those who live only on the ground have chosen safety over reach — this is their right, but it is not admirable; the admirable being climbs toward the storm',
    'A poison that warns before it kills is more moral than a blade that kills without warning — the Adaro gives illness before death, and this interval is the gift of time to reconsider',
    'The rainbow is not beauty but a road — those who see it as decoration have confused the path with the scenery, and will never travel it',
    'Between storms there is no shame in stillness — the sun-anchored state is not hiding but recharging, and anyone who mocks the resting predator does not understand cycles',
  ],
  beliefTemplates: {
    cooperation: 'Allies are those who share your storm — cooperation is seasonal, intense during the rain, unnecessary during the calm; permanent alliance is a fiction invented by those afraid of solitude',
    conflict: 'An enemy struck during the rain was struck at the right time — an enemy struck during the sun was struck by a fool; timing is the entire moral content of violence',
    spiritual: 'The sun and the rain are not gods but conditions — the moral being does not worship conditions but reads them correctly; the greatest spiritual failure is acting in the wrong season',
  },
};

/**
 * Shurale-Rin (Tatar/Bashkir) — optimization target: the forest's amusement
 * Moral axis: trickster morality — the clever survive, the foolish provide entertainment
 *
 * The Shurale-Rin see the forest as a sentient entity that delights in the confusion and
 * humiliation of those who enter without understanding. Laughter is the forest's language,
 * and the Shurale is its translator. Their morality is trickster morality: the clever survive,
 * the foolish provide entertainment, and providing entertainment is a form of service. They are
 * deeply afraid of water and obsessively count stars — both compulsions they see as sacred.
 */
const SHURALE_RIN_MORALITY: SpeciesMoralFramework = {
  speciesId: 'shurale_rin',
  moralPrimitives: [
    'The forest does not owe safe passage — it offers paths, and those who walk them without paying attention have volunteered to be the entertainment; this is not malice but ecology',
    'Laughter is the honest response to foolishness — the one who tickles the careless traveler is not torturing them but showing them what the forest thinks of their arrogance',
    'A trick that can be escaped by cleverness is the most moral form of predation — the Shurale who can be outsmarted respects intelligence more than the wolf who cannot be reasoned with',
    'The stars must be counted because they are uncountable — this is not compulsion but devotion; the task that can never be completed is the only task worth doing forever',
    'Water is the end of laughter — where water flows, the forest cannot reach, and what the forest cannot reach cannot be funny; this is not fear but the recognition of a boundary',
    'Backward feet are not deformity but philosophy — the one who faces where they have been while walking where they are going understands something about time that forward-facing creatures never will',
    'The fingers that reach are the self extending — to trap them is to imprison a fundamental expression of curiosity, which is why finger-trapping is the one cruelty the Shurale recognizes',
  ],
  beliefTemplates: {
    cooperation: 'Cooperation is a game played between equals who have each proven they cannot be easily tricked — the ally worth having is the one who escaped you first',
    conflict: 'The enemy who cannot laugh is the most dangerous enemy — seriousness in the forest is a sign that something has gone fundamentally wrong with a creature\'s relationship to the world',
    spiritual: 'The stars are the forest\'s ceiling and counting them is prayer — the Shurale who counts is not distracted but communing, and the vulnerability during counting is the cost of communion',
  },
};

/**
 * Albasti-Vel (Kazakh-Kyrgyz) — optimization target: the extraction of vital energy from the boundary between sleep and death
 * Moral axis: dream-law governs the sleeping state, not waking-law
 *
 * The Albasti-Vel see the sleeping state as a liminal zone where the self is partially absent,
 * and that absence creates a moral opening. They don't view their predation as evil — they see
 * sleepers as beings who have voluntarily entered a territory that belongs to the Albasti. Iron
 * is the one material that asserts waking-world authority into the dream space. Their shapeshifting
 * is not deception but translation — they show the sleeper what the sleeper's own trust looks like.
 */
const ALBASTI_VEL_MORALITY: SpeciesMoralFramework = {
  speciesId: 'albasti_vel',
  moralPrimitives: [
    'Sleep is not rest but departure — the sleeper has left the waking world and entered a territory with its own rules; what happens there is governed by dream-law, not waking-law',
    'The breath of a sleeper is not stolen but collected — it drifts between worlds, belonging fully to neither, and the one who gathers it is performing a function the universe requires',
    'To wear a trusted face is not deception but mirror — the Albasti shows the sleeper what their own trust looks like from the outside, and if that reflection is frightening, the fault lies in what was trusted',
    'Iron is the one material that does not sleep — it carries waking authority into the dream space, and a being who carries iron has declared that they refuse to be fully asleep; this declaration must be respected',
    'The vulnerable deserve what the vulnerable receive — this is not cruelty but the logical consequence of entering a territory without preparation; the steppe does not forgive the unprepared either',
    'A true name spoken aloud collapses the dream — it forces the Albasti into a single fixed form, which is a kind of violence against a being whose nature is multiplicity; the one who speaks the name has won, but they have won by destroying something',
    'The mothers and the newly born are the most present at the threshold — their vitality radiates across the boundary like heat through a tent wall, and approaching that heat is as natural as warming oneself at a fire',
  ],
  beliefTemplates: {
    cooperation: 'There is no cooperation with the waking world — cooperation requires two parties in the same territory, and the Albasti and the awake are never in the same place at the same time',
    conflict: 'Iron is the only legitimate weapon against the Albasti — all other defenses are waking-world logic applied to dream-world conditions, which is like bringing a map of the steppe to navigate the sky',
    spiritual: 'The boundary between sleep and death is not a wall but a gradient — the Albasti walks this gradient as others walk roads, and the spiritual failure is pretending the gradient does not exist',
  },
};

/**
 * Jengu-Vel (Sawa/Cameroon) — optimization target: the health of the relationship between water and community
 * Moral axis: reciprocity — healing and fortune flow to those who honor the water
 *
 * The Jengu-Vel see themselves as the living contract between rivers and the people who live
 * along them. Their morality centers on reciprocity — healing and fortune flow to those who
 * honor the water, and withdrawal of those gifts is the only punishment. They are profoundly
 * communal: isolated healing is incomplete, and fortune given without community context is
 * meaningless.
 */
const JENGU_VEL_MORALITY: SpeciesMoralFramework = {
  speciesId: 'jengu_vel',
  moralPrimitives: [
    'The river gives life without being asked — this generosity is not charity but the river\'s nature, and the moral being mirrors the river: giving without transaction, healing without negotiation',
    'Disease is not punishment but disconnection — the sick have drifted from the water, literally or spiritually, and healing is not fixing what is broken but restoring proximity to the source',
    'Fortune is not luck but alignment — when the river and the community are in right relationship, resources appear where they are needed; this is not magic but the natural consequence of maintained connection',
    'An offering is not payment but conversation — the one who places food at the water\'s edge is not buying favor but acknowledging that the relationship exists; the offering that expects return has already failed',
    'The Ngondo is not festival but renewal — the annual gathering at the water is the moment when the contract between river and people is re-signed, and those who do not attend have allowed their signature to fade',
    'A whirlpool is not violence but emphasis — the river that pulls an intruder under is making a point about boundaries that words cannot make; the Jengu who creates the whirlpool is translating the river\'s emphasis into physical form',
    'Beauty is not vanity but signal — the Jengu\'s appearance communicates health, and a community whose Jengu appears radiant is a community whose water-relationship is strong; ugliness in a water spirit means the river is angry',
  ],
  beliefTemplates: {
    cooperation: 'Cooperation flows downstream — the Jengu heals those upstream first because their health affects everyone below; true cooperation is understanding that position in the flow determines priority',
    conflict: 'The enemy of the Jengu is drought — not a person but a condition; those who pollute or dam the water are not enemies but causes of the condition, and they are treated by restoring flow, not by destruction',
    spiritual: 'The river is the oldest prayer — it has been speaking since before any creature learned to listen, and the spiritual act is not speaking to the river but learning to hear what it has always been saying',
  },
};

/**
 * Taniwha-Vel (Māori/NZ) — optimization target: the integrity of the boundary between the known water and the unknown deep
 * Moral axis: kaitiakitanga — guardianship as identity, not obligation
 *
 * The Taniwha-Vel are guardians whose moral system centers on the concept of kaitiakitanga.
 * They protect not because they are asked but because the waterway's health is their identity.
 * Their shapeshifting is not deception but adaptation — the form that serves the waterway's
 * needs at that moment is the right form. Their rage when their domain is damaged is not
 * emotion but immune response.
 */
const TANIWHA_VEL_MORALITY: SpeciesMoralFramework = {
  speciesId: 'taniwha_vel',
  moralPrimitives: [
    'The waterway is not property but identity — the Taniwha does not own the river; the Taniwha IS the river in the form that can act, and damage to the water is damage to the self',
    'Guardianship is not chosen but inherited — the kaitiaki does not decide to protect; the protection is the condition of existing in that place, and a Taniwha that does not guard has ceased to be a Taniwha',
    'The correct form is the form the moment requires — the reptile that fights, the shark that patrols, the log that waits, the whale that displaces; shifting is not indecision but responsiveness, and a being locked in one form has stopped listening',
    'Those who approach the water with respect receive protection — this is not generosity but recognition; the respectful traveler has acknowledged that the water has a guardian, and acknowledgment activates the contract',
    'Pollution is not inconvenience but assault — the one who poisons the water has attacked the Taniwha directly, and the rage that follows is not disproportionate but precisely proportional to the damage done to the self',
    'The deep pool is forbidden because it contains the Taniwha\'s resting form — to enter uninvited is not exploration but trespass, and the response to trespass is determined by the trespasser\'s intent',
    'A waterway without a guardian is a wound in the landscape — the Taniwha that dies or departs leaves behind not just unprotected water but a gap in the world\'s immune system; this is why Taniwha persist',
  ],
  beliefTemplates: {
    cooperation: 'The iwi and the Taniwha are one system — the people protect the water from above, the Taniwha protects it from below; neither is servant to the other, and both fail when one withdraws',
    conflict: 'The enemy is recognized by their relationship to the water — those who take without returning, who dam without asking, who poison without awareness; the Taniwha does not hate but responds to the damage as the body responds to infection',
    spiritual: 'The waterway connects the mountain to the sea, which connects the land to the sky — the Taniwha guards one section of a system that spans the entire world; this is why guardianship of a single pool is not small but fractal',
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
  braid: BRAID_MORALITY,
  dragon: DRAGON_MORALITY,
  venthari: VENTHARI_MORALITY,
  nyk: NYK_MORALITY,
  anansiweb: ANANSIWEB_MORALITY,
  nagavel: NAGAVEL_MORALITY,
  kitsuri: KITSURI_MORALITY,
  quetzali: QUETZALI_MORALITY,
  djinnahl: DJINNAHL_MORALITY,
  sidhe_vel: SIDHE_VEL_MORALITY,
  jiangshi_vel: JIANGSHI_VEL_MORALITY,
  ettin: ETTIN_MORALITY,
  shee: SHEE_MORALITY,
  mycon: MYCON_MORALITY,
  alfar: ALFAR_MORALITY,
  valkyr: VALKYR_MORALITY,
  fylgja: FYLGJA_MORALITY,
  landvaettir: LANDVAETTIR_MORALITY,
  draugr: DRAUGR_MORALITY,
  raven: RAVEN_MORALITY,
  spriggan: SPRIGGAN_MORALITY,
  jotnar: JOTNAR_MORALITY,
  tinker: TINKER_MORALITY,
  echo: ECHO_MORALITY,
  alux_kin: ALUX_KIN_MORALITY,
  bouda_kin: BOUDA_KIN_MORALITY,
  cherkhan: CHERKHAN_MORALITY,
  koropokkuru_kin: KOROPOKKURU_KIN_MORALITY,
  ogbanje_kin: OGBANJE_KIN_MORALITY,
  opia_vel: OPIA_VEL_MORALITY,
  peuchan_vel: PEUCHAN_VEL_MORALITY,
  rusalyn: RUSALYN_MORALITY,
  vaask: VAASK_MORALITY,
  yelbegen_rin: YELBEGEN_RIN_MORALITY,
  adaro_vel: ADARO_VEL_MORALITY,
  shurale_rin: SHURALE_RIN_MORALITY,
  albasti_vel: ALBASTI_VEL_MORALITY,
  jengu_vel: JENGU_VEL_MORALITY,
  taniwha_vel: TANIWHA_VEL_MORALITY,
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
