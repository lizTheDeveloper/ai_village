import type { ResearchPaper } from './types.js';

/**
 * Rune Magic Research Papers
 *
 * The knowledge tree for discovering and mastering the art of rune-craft,
 * from basic symbol recognition to inscribing elder runes of power.
 *
 * Footnote styles: Pratchett (informative humor), Moers (fantastical),
 * Gaiman (mythological), Adams (bureaucratic absurdity)
 */

export const SYMBOL_RECOGNITION: ResearchPaper = {
  paperId: 'symbol_recognition',
  title: 'On the Recognition of Marks That Mean: An Introduction to Runic Symbols',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: [],
  complexity: 2,
  minimumAge: 'teen',
  skillGrants: { rune_craft: 5, arcane: 3 },
  contributesTo: [
    { type: 'ability', abilityId: 'carve_basic_runes' },
    { type: 'spell', spellId: 'rune_of_light' },
    { type: 'spell', spellId: 'rune_of_protection' }
  ],
  published: false,
  tier: 1, // Legacy
  technologyTags: ['basic_rune_magic'], // Legacy
  description: `The first treatise on distinguishing between "a scratch in the rock" and "a scratch in the rock that will set you on fire*." The author, whose name has been carefully omitted from all copies**, provides practical guidelines for identifying intentional markings from natural erosion, vandalism, and the particularly aggressive forms of lichen***.

The work establishes the Three Questions of Recognition:† 1) Does it look like someone put it there on purpose? 2) Does it make you feel slightly uncomfortable?†† 3) If you touch it, does anything happen?†††

Special emphasis is given to the phenomenon of "accidental runes"‡ - marks that, through pure chance, form power-bearing symbols. The author notes seventeen documented cases of farmers inadvertently creating runes while scratching their names into fence posts‡‡.

*This distinction has proven harder to make than one might hope. The line between "meaningful mark" and "random scratch" is philosophically blurry and practically dangerous.

**The omission was not the author's choice. Their name was removed by the Rune-Keepers' Guild after it was discovered that the author's signature, when viewed sideways, formed the rune for "minor explosion." This has happened to 47% of runic authors throughout history.

***Certain lichens grow in patterns that resemble ancient script. This is either coincidental or evidence that lichens are more literate than previously suspected. The Botanical Runic Society maintains it is the latter and will fight you about it.

†The Three Questions were formalized by the Council of Cautious Scholars in the Year of the Unexpected Fire. The Council had previously used only two questions, which proved insufficient. The addition of the third question reduced accidental activations by 73%.

††"Slightly uncomfortable" is the technical term. The sensation ranges from "vaguely watched" to "actively threatened" to "why is the air tasting purple?" Calibration of discomfort requires practice and a willingness to be occasionally wrong.

†††Testing for magical effects has claimed the fingers of many hasty researchers. The recommended procedure is: assign someone else to touch it, stand at least twenty feet away, have running water nearby. The Touching Protocol of 1247 runs to forty-seven pages.

‡Accidental runes are statistically improbable but practically common, suggesting the universe has a sense of humor, terrible luck, or insufficient random number generation. Mathematicians and theologians remain divided.

‡‡Farmer Grundleson's fence post accidentally created the rune for "prosperity," resulting in a farm so successful it had to be divided into three separate farms to prevent economic destabilization of the region. He is remembered fondly, though his descendants suspect he knew exactly what he was doing.`,
  abstract: 'Basic principles of distinguishing intentional runic symbols from random markings, with safety protocols for identification.',
  estimatedReadingTime: 100,
  authoringDifficulty: 1
};

export const CARVING_FUNDAMENTALS: ResearchPaper = {
  paperId: 'carving_fundamentals',
  title: 'The Cutter\'s Handbook: Basic Techniques in Rune Inscription',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: [],
  complexity: 3,
  minimumAge: 'teen',
  skillGrants: { rune_craft: 5, crafting: 3 },
  contributesTo: [
    { type: 'ability', abilityId: 'carve_basic_runes' }
  ],
  published: false,
  tier: 1, // Legacy
  technologyTags: ['basic_rune_magic'], // Legacy
  description: `A practical manual on cutting marks into things without cutting yourself*, written by someone who learned through extensive trial, error, and bandages**. The work covers tool selection***, material preparation, and the critical distinction between "carving a rune" and "vandalism"†.

The author introduces the concept of "sympathetic carving" - the idea that the rune should be carved with intent matching its purpose††. A protection rune carved carefully differs from one carved frantically†††, though both technically function‡.

Chapter 7, "On the Importance of Measuring Twice and Carving Once," is accompanied by seventeen cautionary tales‡‡. The appendix on "What To Do When You Carve The Wrong Rune" has been consulted more than any other section.

*This proves harder than expected. The ratio of "rune successfully carved" to "finger accidentally carved" begins at approximately 3:1 for novices. Experienced carvers reduce this to 50:1. Masters claim 1000:1, though many are missing fingers from their learning years.

**The author's personal collection of bandages has been donated to the Museum of Practical Magic, where it forms the third-largest exhibit. The largest is a collection of "things that exploded" and the second-largest is "things that should not have worked but did."

***Tool selection is treated with the gravitas usually reserved for choosing godparents or naming ships. The wrong tool creates the wrong line creates the wrong rune creates the wrong effect creates the right lawsuit.

†Legally speaking, vandalism becomes rune-craft when: (a) you own the surface being carved, (b) the mark has magical properties, or (c) you can prove religious/cultural significance. The Council of Surfaces maintains a 300-page guideline that somehow makes this more confusing.

††The theory of sympathetic carving holds that intent flows through the carver's hands into the mark. Critics argue this is metaphysical nonsense. Practitioners respond by carving runes while thinking very hard about the critics.  The runes work anyway, which proves either everything or nothing.

†††Protection runes carved while being chased by bears have a notably aggressive quality to their protection. Several such runes have been known to attack threats that weren't actually threats, just suspicious-looking travelers.

‡"Technically functions" is doing significant work in this sentence. Yes, the rune works. Yes, it might work too well. Yes, you might want to stand behind something fireproof.

‡‡The tales include: The Backwards Rune Incident, The Upside-Down Catastrophe, The Mirror Image Disaster, and The Thing We Don't Speak About Because The Rune Is Still Active And We Can't Turn It Off.`,
  abstract: 'Fundamental techniques for inscribing runes into various materials, with emphasis on safety and precision.',
  estimatedReadingTime: 100,
  authoringDifficulty: 1
};

export const MATERIAL_SYMPATHIES: ResearchPaper = {
  paperId: 'material_sympathies',
  title: 'Substances and Sigils: The Affinities of Carving Materials',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['symbol_recognition', 'carving_fundamentals'],
  complexity: 5,
  minimumAge: 'teen',
  minimumSkills: { rune_craft: 10 },
  skillGrants: { rune_craft: 10, nature: 5 },
  contributesTo: [
    { type: 'building', buildingId: 'rune_workshop' }
  ],
  published: false,
  tier: 2, // Legacy
  technologyTags: ['advanced_rune_magic'], // Legacy
  description: `An exhaustive study on why runes carved in oak behave differently from those carved in granite, which behave differently from those carved in bone*, which we really wish you wouldn't carve runes into, but here we are**. The author traveled extensively*** to test runes on every substance imaginable† and several that shouldn't be††.

The central thesis is elegant: materials remember their nature†††, and runes inherit these memories‡. Wood retains the memory of growth‡‡. Stone remembers pressure and time‡‡‡. Metal remembers the forge◊. Each material whispers its history into the rune, coloring the magic with qualities both predictable and surprising.

Of particular interest is the notorious Chapter 11: "On Carving Runes in Living Flesh"◊◊, which the censors tried to remove but couldn't find without reading it, thus defeating the purpose of censorship.

*Bone adds an unsettling quality to any rune. Even runes of healing carved into bone have a certain "I am helping you, but ominously" vibe.

**The ethics of bone-carving occupied philosophers for decades. Consensus: carving runes into your own bones is your business (and your poor life choices). Carving runes into someone else's bones requires consent, which should really go without saying but apparently needed to be written down.

***The author's travel log reads like a geographical survey crossed with a list of increasingly questionable decisions. Highlights include the Glittering Caves (beautiful, dangerous), the Obsidian Fields (sharp, dangerous), and the Fleshcrafters' Guild (disturbing, dangerous, we have questions).

†"Every substance imaginable" turned out to be 247 materials. The author then tested 63 unimaginable materials, which by definition shouldn't exist but do anyway, including consolidated moonlight, frozen time, and whatever it is that forms in the corner of very old libraries.

††You cannot carve runes in water. You can try. The author tried seventeen different approaches. The water was unimpressed.

†††Materials possessing memory is either poetic metaphor or literal truth depending on which faculty you ask. The Materialists say it's nonsense. The Runecrafters say it's obvious. Both sides have empirical evidence, which is philosophically problematic.

‡Inheritance here is both metaphorical and irritatingly literal. Runes do not technically inherit properties through genetic mechanisms because rocks lack genes. The mechanism is more like... the universe's tendency toward thematic consistency.

‡‡Wood-carved runes tend toward growth, expansion, and life. They also tend to splinter, rot, and eventually decompose, which limits their permanence but adds a certain organic authenticity.

‡‡‡Stone runes are patient. Disturbingly patient. They wait. They endure. They outlast civilizations and then quietly activate when someone three thousand years later stumbles over them.

◊Metal remembers being hurt (forged) and becoming stronger. Metal runes are consequently resilient and slightly aggressive, as if the rune itself has a chip on its shoulder about being hammered into shape.

◊◊The chapter exists in three versions: the original (banned), the censored (ineffective), and the annotated edition (more dangerous than the original because it includes detailed footnotes explaining everything the censors tried to hide).`,
  abstract: 'Comprehensive analysis of how different carving materials affect runic properties and outcomes.',
  estimatedReadingTime: 200,
  authoringDifficulty: 2
};

export const RUNE_COMBINATIONS: ResearchPaper = {
  paperId: 'rune_combinations',
  title: 'Compound Inscriptions: The Art of Combining Runic Symbols',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['material_sympathies', 'carving_fundamentals'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 20 },
  skillGrants: { rune_craft: 15, logic: 5 },
  contributesTo: [
    { type: 'ability', abilityId: 'combine_runes' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_rune_magic', 'compound_runes'], // Legacy
  description: `A groundbreaking work proposing that runes can be combined like words into sentences*, with similarly disastrous results when grammar is ignored**. The author demonstrates that certain rune pairs synergize (enhance each other), others antagonize (cancel out), and some combinations should never be attempted under any circumstances*** yet were attempted anyway for science†.

The Combinatorial Theory states: rune sequences create emergent effects beyond the sum of components††. A protection rune followed by a strength rune creates not "protection and strength" but "aggressive defense"†††. The order matters‡. The spacing matters‡‡. Everything matters, which makes runecraft simultaneously precise and maddening.

The infamous Third Appendix documents 73 forbidden combinations‡‡‡, carefully detailed so that researchers know exactly what not to do. Approximately 40% of forbidden combination research occurs via people reading about forbidden combinations and thinking "but what if..."◊

*This analogy delighted linguists and horrified runecrafters in equal measure. Language scholars began analyzing runic "grammar." Runecrafters began worrying about spelling errors that explode.

**The Grammatical Explosion of 1347 resulted from someone treating runes too much like language and adding what they thought was a comma for clarity. The comma rune does not mean pause. It means "invert all previous meanings." The resulting chaos was clarifying in its own terrible way.

***"Under any circumstances" is defined in the Restricted Practices Act of 1289 as: "including but not limited to academic curiosity, dares, attempts to impress romantic interests, boredom, financial incentive, divine mandate, or combinations thereof."

†Scientific method requires testing hypotheses. Safety protocols require not doing obviously dangerous things. These requirements occasionally conflict, usually at the researcher's expense.

††Emergent effects range from "pleasantly surprising" to "evacuate the building" to "evacuate the city" to "we've decided to abandon this entire valley and speak of it only in whispers."

†††"Aggressive defense" manifests as protection that attacks threats pre-emptively. Very effective. Also very likely to attack things that weren't actually threats, like door-to-door salespeople or pigeons.

‡Reversing the order creates "strengthened protection," which is defensive but not aggressive. The difference is critically important and frequently fatal to forget.

‡‡Spacing affects power flow between runes. Too close: they merge into something new. Too far: they function independently. Just right: they synergize. "Just right" is determined through careful testing or sudden unexpected catastrophe.

‡‡‡The list of forbidden combinations is itself considered dangerous knowledge. Some combinations are forbidden because they're too powerful. Others because they're too unpredictable. Three are forbidden because nobody knows what they do and nobody wants to find out.

◊The "but what if" impulse has driven both scientific advancement and spectacular disasters. The ratio depends on whether you count "produced interesting data" as advancement even when the data is primarily about structural fire damage.`,
  abstract: 'Theory and practice of combining multiple runes into compound inscriptions with emergent properties.',
  estimatedReadingTime: 300,
  authoringDifficulty: 3
};

export const ACTIVATION_METHODS: ResearchPaper = {
  paperId: 'activation_methods',
  title: 'Awakening the Mark: Methods of Runic Activation',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['material_sympathies', 'rune_combinations'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 25 },
  skillGrants: { rune_craft: 20, arcane: 10 },
  contributesTo: [
    { type: 'spell', spellId: 'rune_of_fire' },
    { type: 'spell', spellId: 'rune_of_frost' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_rune_magic', 'triggered_runes'], // Legacy
  description: `A comprehensive taxonomy of how to make runes actually do something*, written by someone who spent decades doing rune-related somethings and lived to catalog them**. The work distinguishes between passive runes (always active), triggered runes (activate under conditions), and command runes (activate on demand)***.

The Seven Methods of Activation† are exhaustively documented: Touch (simple but limiting), Blood (powerful but costly), Word (elegant but loud), Will (difficult but flexible), Time (precise but inflexible), Proximity (convenient but imprecise), and Sacrifice (effective but exactly as bad as it sounds)††.

Of particular scholarly interest is the section on "accidental activation"†††, which reads less like an academic paper and more like a collection of apologies to various municipal authorities.

*Making runes "do something" is the central challenge of runecraft. Carving a protection rune is useless if it just sits there looking pretty‡. Though to be fair, some protection runes are quite aesthetically pleasing.

**Survival bias is acknowledged. The author notes that their conclusions represent only successful activations by people who lived. Failed activations are harder to document, as the researchers are variously deceased, transformed into newts, or refuse to discuss what happened‡‡.

***The distinction seems straightforward until you encounter edge cases: What about a passive rune that becomes triggered under certain conditions? What about a command rune that mishears its activation word and activates on its own schedule? Taxonomy is hard.

†The Council of Seven Methods spent four years debating whether there were seven methods or eight. The eighth proposed method (Accident) was ruled to be "not actually a method" despite being responsible for approximately 23% of historical runic activations.

††Sacrifice-activated runes require giving up something of value. This ranges from "a gold coin" to "your firstborn child," depending on the rune's power and the ethical flexibility of its creator. The Ethical Runecraft Society maintains strict guidelines that are widely ignored in practice.

†††Accidental activation occurs when: you touch a rune while thinking too hard about it, you say the activation word without realizing it's an activation word (common with ancient languages), you bleed on a rune (very common), or the universe just decides it's time (uncommon but unstoppable).

‡A non-functional protection rune is technically art. Several expensive pieces of abstract art in noble houses are actually failed rune experiments. Their owners remain blissfully unaware, which is probably for the best.

‡‡The Transformation Registry lists 147 "temporary" transformations that have lasted multiple decades. Three wizards remain newts to this day, though they've adapted remarkably well to pond life and claim to prefer it.`,
  abstract: 'Complete classification and methodology for activating runic inscriptions through various means.',
  estimatedReadingTime: 300,
  authoringDifficulty: 4
};

export const RUNE_SYNTAX: ResearchPaper = {
  paperId: 'rune_syntax',
  title: 'Grammar of Power: Syntactic Rules for Rune Sequences',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['rune_combinations', 'symbol_recognition'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 26, logic: 10 },
  skillGrants: { rune_craft: 18, logic: 8 },
  contributesTo: [
    { type: 'ability', abilityId: 'write_complex_rune_sequences' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_rune_magic'], // Legacy
  description: `A linguistic approach to runecraft* arguing that runes follow grammatical rules** like language***. The author's key insight: "Runes are not random symbols but structured communication with reality itself†."

The work identifies syntactic categories: subject runes†† (what acts), verb runes††† (what action), modifier runes‡ (how or when), and connector runes‡‡ (joining concepts). Invalid combinations produce "sentences reality cannot parse," resulting in nothing or disaster.

*Applying linguistic theory to magic was controversial. Traditional runemasters worked by intuition and tradition. This systematic approach revealed patterns they knew implicitly but never articulated.

**Rules include: subject must precede verb, modifiers must be adjacent to what they modify, and certain runes are mutually exclusive (you cannot combine "bind" and "release" meaningfully).

***The analogy to language is imperfect but useful. Just as "Colorless green ideas sleep furiously" is grammatically correct but semantically nonsense, some rune sequences are technically valid but meaningless to reality.

†This philosophical position treats reality as an entity that "reads" runes and responds accordingly. Whether reality is actually conscious or just appears so is debated. The practical effect is the same.

††Subject runes specify what or who is affected: person, object, location, concept. Clear subjects create focused effects. Vague subjects create unpredictable results.

†††Verb runes define action: bind, protect, illuminate, conceal. The author notes: "Every rune sequence needs a verb, just as every sentence needs action. Runes without verbs sit there doing nothing, like philosophical treatises."

‡Modifiers include intensity (weak/strong), duration (temporary/permanent), condition (always/sometimes), and others. Placement matters: wrong placement changes meaning or breaks the sequence.

‡‡Connector runes join multiple concepts: and, or, if-then. Advanced runic programming uses complex conditional logic. The author warns: "Nested conditionals in rune sequences are possible but test the limits of human sanity and reality's patience."`,
  abstract: 'Systematic analysis of runic grammar including syntactic rules, semantic meaning, and sequence validity.',
  estimatedReadingTime: 310,
  authoringDifficulty: 5
};

export const GEOMETRIC_PATTERNS: ResearchPaper = {
  paperId: 'geometric_patterns',
  title: 'Sacred Geometry: The Power of Runic Arrangement',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['rune_combinations', 'material_sympathies'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 23 },
  skillGrants: { rune_craft: 16 },
  contributesTo: [
    { type: 'ability', abilityId: 'arrange_geometric_runes' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_rune_magic'], // Legacy
  description: `An exploration of how geometric arrangement affects runic power*, demonstrating that shape matters as much as symbols**. The author documents power differentials between linear*** (weak), circular† (moderate), and complex geometric patterns†† (strong but dangerous†††).

The work catalogs traditional patterns: circle‡ (containment, protection), triangle‡‡ (stability, power focus), square (grounding, permanence), and pentacle (balance, complexity). Each shape imparts qualities to the rune sequence it contains.

*Experiments showed identical runes arranged differently produced different effects. A protection rune in a line provides weak protection. The same rune in a circle provides strong protection. In a pentacle: very strong protection with side effects.

**This revolutionized runecraft by showing arrangement as an additional variable to optimize. Traditional runemasters knew this intuitively but lacked systematic analysis.

***Linear arrangements (straight lines, simple paths) are easy to create but inefficient. Power flows one direction and dissipates. The author: "Lines are training wheels for runecraft."

†Circular arrangements (circles, spirals) contain power, preventing dissipation. Power cycles continuously within the pattern. Circles are the "default choice for anything requiring sustained effect."

††Complex geometries (pentagrams, hexagrams, interlocking patterns) multiply runic power but require precise execution. Imperfect geometry creates "power turbulence" ranging from inefficiency to catastrophic failure.

†††The danger of complex patterns: more power, more ways to fail. The author documents seventeen accidents involving misdrawn pentacles, ranging from "embarrassing fizzle" to "emergency evacuations."

‡Circles are forgiving: slight imperfections barely matter. The author recommends circles for beginners: "Hard to get wrong, hard to cause disasters, still effective."

‡‡The triangle focuses power at its three points. Used for directing effects outward from the pattern. Alignment of points matters: pointing up invokes, pointing down grounds. Horizontal: balance.`,
  abstract: 'Analysis of geometric patterns in runecraft and their effects on power containment, focus, and amplification.',
  estimatedReadingTime: 270,
  authoringDifficulty: 4
};

export const CHROMATIC_RUNECRAFT: ResearchPaper = {
  paperId: 'chromatic_runecraft',
  title: 'Color Theory in Runes: The Significance of Pigment',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['carving_fundamentals', 'material_sympathies'],
  complexity: 5,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 18 },
  skillGrants: { rune_craft: 13, crafting: 5 },
  contributesTo: [
    { type: 'ability', abilityId: 'color_enhance_runes' }
  ],
  published: false,
  tier: 2, // Legacy
  technologyTags: ['advanced_rune_magic'], // Legacy
  description: `A colorful treatise on how pigment affects runic function*, challenging the assumption that carved runes are colorless**. The author demonstrates that colored inks, paints, and inlays modify runic properties in predictable ways***.

Color associations are documented: red† (power, passion, danger), blue†† (calm, protection, water), green††† (growth, nature, healing), white‡ (purity, clarity, light), black‡‡ (binding, shadow, void), and others. Each color shifts the rune's effect toward its associated qualities.

*Traditional rune carving involves no color: bare stone, wood, or metal. Adding color was considered decorative. This work proves it's functional, changing how the rune operates.

**The assumption came from ancient runes being found colorless. The author points out: "We find them colorless because the pigments degraded over centuries. Originally, they were quite vibrant." Archaeological testing confirmed this.

***Predictability has limits. Color modification is subtle, not transformative. A red protection rune is more aggressive in defense, not a different rune entirely.

†Red pigments (iron oxide, cochineal) increase runic intensity but reduce stability. Red runes are powerful but exhausting to maintain. The author: "Red is the color of urgent situations, not long-term solutions."

††Blue pigments (lapis, indigo) provide calming, stabilizing effects. Blue protection runes defend gently, redirecting threats rather than destroying them. Popular for home wards.

†††Green (malachite, plant dyes) enhances growth-related magic. Green runes on plants accelerate growth. The author notes unexpected applications: healing runes work better in green, as the body "grows" toward health.

‡White (chalk, titanium) purifies and clarifies. White runes are visible but subtle in function, providing enhancement without dominating. Popular for runes meant to support rather than lead.

‡‡Black (charcoal, soot) grounds and contains. Black runes bind things in place, prevent change, maintain status quo. The author warns: "Black is for holding, not for releasing. Choose wisely."`,
  abstract: 'Study of color application to runes and how different pigments modify runic properties and effects.',
  estimatedReadingTime: 240,
  authoringDifficulty: 3
};

export const PHONETIC_ACTIVATION: ResearchPaper = {
  paperId: 'phonetic_activation',
  title: 'Words of Power: Sound-Based Rune Activation',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['activation_methods', 'symbol_recognition'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 22 },
  skillGrants: { rune_craft: 15, arcane: 8 },
  contributesTo: [
    { type: 'ability', abilityId: 'voice_activate_runes' },
    { type: 'spell', spellId: 'word_of_command' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_rune_magic'], // Legacy
  description: `A phonological study of vocal rune activation*, exploring how specific sounds trigger inscribed magic**. The author's central finding: "The right word spoken correctly is as powerful as the right rune carved properly***."

The work catalogs activation words† for common runes, analyzing phonetic patterns††: harsh consonants††† (binding, striking), flowing vowels‡ (healing, growth), and complex combinations‡‡ (sophisticated effects). Pronunciation precision is critical—mispronunciation ranges from ineffective to disastrous.

*Vocal activation allows triggering runes without physical contact. Useful for distant activation, emergency situations, and "showing off to impressed onlookers."

**Sound as activation method works because: runes are patterns, sound is patterns, matching patterns create resonance. When the spoken pattern matches the carved pattern, activation occurs.

***This equivalence revolutionized portable runecraft. Instead of carrying carved objects, carry knowledge of words. Lighter, more discrete, though you can't accidentally trigger a carved rune by thinking too hard (you can absolutely accidentally speak activation words).

†Activation words are usually ancient languages: Old Nordic, Sumerian, Proto-Elvish. The author theorizes: "Ancient languages developed alongside runecraft, each influencing the other, creating deep phonetic-runic correspondence."

††Phonetic patterns show consistency: sharp sounds (k, t, g) activate aggressive runes, soft sounds (l, m, n) activate gentle ones, sibilants (s, sh, z) activate flowing effects like water or wind.

†††Harsh consonants require precise articulation. The difference between "kat" and "kad" might mean "light a candle" versus "start a fire." The author emphasizes practice: "Words of power demand powerful pronunciation."

‡Flowing vowels sustain activation. Long vowel sounds maintain effects, short vowels trigger then release. Duration matters as much as tone.

‡‡Complex combinations (multiple syllables, tonal variations) activate sophisticated multi-rune sequences. Mastery requires linguistic skill and musical ability. The author notes: "The best vocal runemasters are often singers or poets."`,
  abstract: 'Phonetic theory and practice of vocal rune activation including pronunciation, tonal variation, and linguistic patterns.',
  estimatedReadingTime: 280,
  authoringDifficulty: 4
};

export const TEMPORAL_INSCRIPTION: ResearchPaper = {
  paperId: 'temporal_inscription',
  title: 'Time-Delayed Runes: Inscriptions That Wait',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['activation_methods', 'rune_combinations'],
  complexity: 8,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 30, arcane: 15 },
  skillGrants: { rune_craft: 22, arcane: 10 },
  contributesTo: [
    { type: 'ability', abilityId: 'create_delayed_runes' },
    { type: 'spell', spellId: 'temporal_ward' }
  ],
  published: false,
  tier: 4, // Legacy
  technologyTags: ['advanced_rune_magic'], // Legacy
  description: `A temporal study of runes that activate at specified future times*, which the author calls "appointments with destiny**." The work explores delay mechanisms***: astronomical (phase of moon, season), conditional† (when someone specific passes), and absolute†† (exact duration from inscription).

The central challenge: creating stable dormancy†††. Active runes drain power continuously. Dormant runes conserve power but must reliably wake. The balance between "too dormant" (never activates) and "too active" (depletes before trigger) is precise‡.

*Time-delayed runes enable: traps (activate when enemy approaches), time capsules (preserve knowledge for future), succession planning (transfer power upon death), and "birthday presents that can't be opened early‡‡."

**The author's poetic phrasing conceals technical complexity. Creating reliable temporal triggers requires advanced understanding of runic dormancy, trigger conditions, and power conservation.

***Astronomical triggers are self-explanatory: "activate at full moon" or "during winter solstice." Reliable because celestial mechanics are predictable. The author notes: "The moon never forgets its appointment."

†Conditional triggers wait for specific conditions: person, object, or situation. Examples: "activate when heir arrives," "trigger if defenses fail," "release upon my death." Conditions must be precisely defined or the rune waits forever for ambiguous fulfillment.

††Absolute delays count time: "activate in one year," "trigger after 1000 days." Precise but inflexible. The author documents a rune set to activate in a century, which did, long after everyone who knew about it had died. Surprise inheritance for descendants.

†††Dormancy mechanisms vary: minimal power circulation (slow drain), suspended animation (complex, risky), external power source (dependent), or "aggressive energy conservation" (the author's term for ruthless efficiency at the cost of responsiveness).

‡The author compares this to walking a tightrope: too much power consumption means the rune dies before activation, too little means it won't wake when needed. Calibration is "part art, part mathematics, part prayer."

‡‡The birthday present application was mentioned as a joke but apparently works. Several noble families use time-locked rune chests for coming-of-age gifts. The author reports a 73% success rate, which seems concerningly low for presents.`,
  abstract: 'Methods for creating time-delayed and conditionally activated runes including dormancy mechanisms and trigger design.',
  estimatedReadingTime: 320,
  authoringDifficulty: 5
};

export const LAYERED_RUNES: ResearchPaper = {
  paperId: 'layered_runes',
  title: 'Depth in Inscription: The Art of Layered Runes',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['rune_combinations', 'material_sympathies'],
  complexity: 8,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 28, arcane: 12 },
  skillGrants: { rune_craft: 21, crafting: 8 },
  contributesTo: [
    { type: 'ability', abilityId: 'carve_layered_runes' }
  ],
  published: false,
  tier: 4, // Legacy
  technologyTags: ['advanced_rune_magic'], // Legacy
  description: `An investigation into inscribing multiple runes in the same physical space*, achieving effects impossible with surface-only inscription**. The author describes layering as "building vertically when horizontal space runs out***."

The technique requires carving runes at different depths†: surface rune (immediate effect), mid-depth rune†† (sustained effect), and deep rune††† (foundational power). Each layer operates independently but influences the others through "vertical resonance‡."

The practical limit is five layers‡‡, beyond which materials crack or runes interfere destructively.

*Same location, different depths. Viewed from above, appears as single rune. From cross-section, reveals multiple distinct carvings stacked vertically.

**Surface-only runes are limited by available space and interference between adjacent runes. Layering solves both: same space holds multiple runes without lateral interference.

***The spatial metaphor is apt. Flat surfaces have limited area. Adding depth provides a new dimension for inscription. The author notes: "We were writing on paper when we should have been carving in blocks."

†Carving depth affects temporal priority: surface runes activate first, deeper runes later. This creates sequential activation from single trigger, enabling complex programmed responses.

††Mid-depth runes are hardest to carve (already carved surface layer complicates access) but provide sustained power. The author likens them to "middle management: not glamorous but essential."

†††Deep runes serve as foundations, providing stable power that upper layers draw upon. Deep runes are simple, stable, and permanent. Surface runes can be complex and temporary, supported by deep stability.

‡Vertical resonance: runes at different depths vibrate in sympathy, amplifying or modulating each other's effects. Harmonious layering multiplies power. Dissonant layering creates interference.

‡‡Five-layer limit determined empirically: deeper carving weakens material structure, additional layers create overwhelming interference. The author reports testing six-layer runes resulted in "immediate structural failure and embarrassment."`,
  abstract: 'Advanced technique of carving multiple runes at different depths in the same location for enhanced complexity and power.',
  estimatedReadingTime: 300,
  authoringDifficulty: 5
};

export const RUNE_ERASURE: ResearchPaper = {
  paperId: 'rune_erasure',
  title: 'Safe Removal: Deactivating and Erasing Runes',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['carving_fundamentals', 'activation_methods'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 24 },
  skillGrants: { rune_craft: 17 },
  contributesTo: [
    { type: 'ability', abilityId: 'safely_erase_runes' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_rune_magic'], // Legacy
  description: `A necessary but overlooked work on removing runes safely*, addressing the awkward reality: "Carving runes is taught extensively. Removing them safely is assumed obvious. It is not obvious**."

The paper distinguishes deactivation*** (stopping function while preserving inscription) from erasure† (physical removal). Methods vary by material††, rune power†††, and urgency‡. The universal principle: "Remove power before removing symbols‡‡."

*Unsafe removal includes: chiseling active runes (releases stored power violently), sanding them off (gradual release, still dangerous), and "optimistic ignorance" (hoping the rune isn't important).

**The author documents thirty-seven removal accidents ranging from mild (temporary blindness) to severe (permanent feature rearrangement). Most were preventable with basic safety protocols.

***Deactivation methods: counter-rune (inscribe cancellation), power drain (external siphon), natural decay (wait decades), or disruption (mar one critical line carefully). The author recommends counter-runes for safety.

†Erasure after deactivation is safer but still requires care. Broken fragments of powerful runes retain weak echoes of original power. The author: "Dispose of rune fragments properly or they'll haunt your workshop literally."

††Material-specific challenges: stone runes are hard to remove physically (grinding required), wood runes burn (releases power as smoke), metal runes can be melted (dangerous if still active). Each requires adapted protocols.

†††Powerful runes store significant energy. Sudden release (from careless removal) manifests as: light flash, heat pulse, kinetic blast, or "localized reality disagreement" (the author's euphemism for things getting weird).

‡Urgency matters: emergency removal (curse, trap, imminent disaster) accepts higher risk. Non-urgent removal (renovation, aesthetics) should prioritize safety. The author: "Rushing rune removal is how you become a cautionary tale."

‡‡This principle cannot be overemphasized. Every accident documented involved removing symbols before neutralizing power. "Power first, symbols second" saves lives and dignity.`,
  abstract: 'Safe methods for deactivating and physically removing runes including power neutralization and material-specific techniques.',
  estimatedReadingTime: 270,
  authoringDifficulty: 4
};

export const PROTECTIVE_WARDS: ResearchPaper = {
  paperId: 'protective_wards',
  title: 'Circles of Safety: Designing Protective Ward Patterns',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['rune_combinations', 'geometric_patterns'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 25, arcane: 12 },
  skillGrants: { rune_craft: 18, arcane: 9 },
  contributesTo: [
    { type: 'ability', abilityId: 'create_protective_wards' },
    { type: 'spell', spellId: 'ward_of_protection' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_rune_magic'], // Legacy
  description: `A comprehensive guide to creating protective ward circles*, the most common application of geometric runecraft**. The author systematizes ward design from first principles: "Define what you're protecting, from what threats, for how long***."

Ward categories are clearly delineated: passive† (constant protection, low power), reactive†† (activates on threat, moderate power), and aggressive††† (counterattacks threats, high power). Each serves different needs and requires different power investment‡.

The work includes ready-to-use ward patterns for common scenarios‡‡: home protection, workshop safety, personal defense, and "keeping your food from being stolen by opportunistic familiars."

*Protective wards are circular (or geometric) arrangements of runes that defend an area or person. Circles are preferred for their complete coverage and power efficiency.

**Ward creation is taught everywhere, but quality varies wildly. This work standardizes best practices, eliminating "folk wisdom" ranging from useful to catastrophically wrong.

***Defining parameters clarifies design: protecting a bedroom from thieves for one night requires different ward than protecting a vault from magical intrusion for centuries. Precision prevents over-engineering or inadequate protection.

†Passive wards maintain constant barriers. Low power drain makes them suitable for long-term use. The author: "Passive wards are fire insurance: you pay steadily hoping you never need them."

††Reactive wards sleep until triggered, conserving power. When threat detected, they activate fully. More power-efficient for intermittent threats. Drawback: brief activation delay (usually milliseconds, occasionally critical).

†††Aggressive wards don't merely block threats—they strike back. Effective deterrent, high power cost, and ethical questions. The author notes: "Aggressive wards have legal implications. Check local regulations before installation."

‡Power investment determines ward strength and duration. Strong wards protecting large areas require significant power sources: embedded crystals, ley line access, or regular manual recharging by a skilled runecrafter.

‡‡The practical patterns section is extensively copied by ward-crafters. The author's simple designs for common problems (food protection, workshop privacy, sleep security) are found throughout practical runecraft with varying attribution.`,
  abstract: 'Design principles and practical patterns for protective ward circles including passive, reactive, and aggressive ward types.',
  estimatedReadingTime: 290,
  authoringDifficulty: 4
};

export const BINDING_INSCRIPTIONS: ResearchPaper = {
  paperId: 'binding_inscriptions',
  title: 'Runes of Restraint: Binding and Containment Inscriptions',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['rune_combinations', 'activation_methods'],
  complexity: 8,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 29, arcane: 14 },
  skillGrants: { rune_craft: 21, arcane: 11 },
  contributesTo: [
    { type: 'ability', abilityId: 'create_binding_runes' },
    { type: 'spell', spellId: 'rune_of_binding' }
  ],
  published: false,
  tier: 4, // Legacy
  technologyTags: ['advanced_rune_magic'], // Legacy
  description: `An ethically complex treatise on runes that restrain*, examining the theory and practice of binding everything from objects** to entities***. The author begins with a disclaimer: "Binding is powerful, useful, and dangerous. This knowledge enables both protection and imprisonment†."

Binding categories include: physical†† (prevents movement), conceptual††† (prevents specific actions), dimensional‡ (prevents planar travel), and absolute‡‡ (prevents everything, rarely achievable). Each requires different runic structures and power levels.

*Binding runes create constraints: "You cannot move," "You cannot speak," "You cannot leave this circle." The constraint's strength depends on runic power, precision, and the bound subject's resistance.

**Object binding is straightforward: prevent theft (bind object to location), prevent use (bind weapon inactive), prevent destruction (bind structure intact). Common applications with few ethical complications.

***Entity binding—restraining conscious beings—is ethically fraught. Legitimate uses include: containing dangerous entities, preventing harm, temporary restraint. Illegitimate uses: slavery, illegal imprisonment, coercion. The author: "With great binding power comes great potential for abuse."

†The ethical section is longer than the technical section, unusual for runecraft literature. The author clearly struggled with publishing binding knowledge while preventing misuse. Their compromise: publish everything, include extensive ethical framework.

††Physical binding prevents motion through space. Strong against physical entities, weak against incorporeal ones. The author documents binding strength vs. subject strength: mice are easy, dragons require collaborative effort.

†††Conceptual binding is subtle: prevent lying, prevent violence, prevent specific words. More complex to design than physical binding, harder to break, and philosophically troubling. The author: "Preventing actions prevents choice. Use sparingly."

‡Dimensional binding traps entities in specific planes or locations, preventing plane-shifting, teleportation, or dimensional travel. Essential for containing extra-planar entities. The author notes: "Without dimensional binding, powerful entities simply leave when inconvenienced."

‡‡Absolute binding prevents all action: no movement, no magic, no thought. Described as "magical suspended animation." The author documents only three successful absolute bindings in history, each requiring master runemasters working in concert.`,
  abstract: 'Theory and practice of binding runes for restraining objects and entities including ethical considerations and power requirements.',
  estimatedReadingTime: 340,
  authoringDifficulty: 5
};

export const RUNE_AMPLIFICATION: ResearchPaper = {
  paperId: 'rune_amplification',
  title: 'Resonant Enhancement: Amplifying Runic Power',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['rune_combinations', 'material_sympathies'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 27, arcane: 13 },
  skillGrants: { rune_craft: 19, arcane: 10 },
  contributesTo: [
    { type: 'ability', abilityId: 'amplify_runes' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_rune_magic'], // Legacy
  description: `A technical study of increasing runic power beyond base capacity*, exploring resonance**, power channeling***, and material enhancement†. The author's thesis: "Every rune has natural power. Amplification reveals power beyond natural limits††."

Methods documented include: resonant pairing††† (placing compatible runes adjacently), power focus‡ (geometric concentration), external power sources‡‡ (crystals, ley lines), and sacrificial amplification (consuming resources for temporary boost).

*Base capacity: a rune's power when carved competently in appropriate material. Adequate for most purposes but insufficient for demanding applications. Amplification bridges this gap.

**Resonance occurs when multiple runes vibrate sympathetically, amplifying each other. Sympathetic runes enhance, antipathetic runes cancel. The author: "Resonance is free power but requires knowledge and planning."

***Power channeling uses conduits (grooves, inlays) to direct external power into runes. Like irrigation for crops, channeling provides sustained power input. More reliable than resonance but requires power source.

†Material enhancement: superior materials (precious metals, rare stones, exotic woods) hold more power than common materials. The author provides cost-benefit analysis: "Platinum holds 10x more power than iron but costs 100x more. Choose wisely."

††The phrasing "beyond natural limits" concerned some reviewers who worried about encouraging dangerous overreach. The author clarified: "Beyond natural doesn't mean beyond safe. Respect limits while understanding they're not absolute."

†††Resonant pairing requires compatible runes: healing+growth, protection+strength, light+warmth. Incompatible pairings create interference. The author includes extensive compatibility tables.

‡Power focus uses geometric shapes (circles, spirals, pentagrams) to concentrate ambient power into central runes. The geometry acts as lens, gathering dispersed power and focusing it. Effectiveness varies by location (ley line intersections are ideal).

‡‡External power sources provide sustained amplification. Embedded power crystals supply steady power for years. Ley line connections tap planetary energy indefinitely. The author notes: "External power is reliable but creates dependency."`,
  abstract: 'Techniques for amplifying runic power through resonance, channeling, materials, and geometric focus.',
  estimatedReadingTime: 300,
  authoringDifficulty: 4
};

export const SYMPATHETIC_LINKING: ResearchPaper = {
  paperId: 'sympathetic_linking',
  title: 'Connection at Distance: Sympathetic Links Between Runes',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['rune_combinations', 'material_sympathies'],
  complexity: 9,
  minimumAge: 'adult',
  minimumSkills: { rune_craft: 33, arcane: 16 },
  skillGrants: { rune_craft: 24, arcane: 12 },
  contributesTo: [
    { type: 'ability', abilityId: 'link_distant_runes' },
    { type: 'spell', spellId: 'sympathetic_bond' }
  ],
  published: false,
  tier: 4, // Legacy
  technologyTags: ['advanced_rune_magic'], // Legacy
  description: `A groundbreaking work on connecting separated runes*, enabling action-at-a-distance** that defies spatial limitations***. The author demonstrates that properly linked runes can communicate and coordinate despite physical separation†.

Link types include: paired†† (two runes, bidirectional), networked††† (multiple runes, many-to-many), and broadcast‡ (one source, many receivers). Each topology serves different applications‡‡.

*Linked runes maintain sympathetic connection: affecting one affects the other. Activate first rune, second activates. Damage first, second weakens. The connection transcends space but not power limitations.

**Action-at-a-distance was controversial when proposed. Critics claimed impossible without direct contact. Experimental demonstration silenced skeptics: activate rune in one city, paired rune in distant city activated simultaneously.

***Spatial separation is meaningless to sympathetic links. Distance degrades signal quality (weak links fail over distance) but doesn't prevent linking. The author documents successful links across continents, though maintaining them was challenging.

†Communication through links is limited: state information (active/inactive, power level, basic status) transmits reliably. Complex information (specific activation parameters, nuanced conditions) transmits unreliably. The author: "Linked runes exchange simple messages effectively, complex conversations poorly."

††Paired links are simplest and most reliable. Two runes connected bidirectionally. Common applications: emergency communication (trigger alarm elsewhere), remote sensing (detect conditions at distance), coordinated action (synchronized activation).

†††Networked links connect multiple runes in complex topologies. Allows sophisticated coordination but requires careful design. Power and signal routing through network determines which runes affect which others.

‡Broadcast links: one master rune connects to many slave runes. Master activation triggers all slaves simultaneously. Used for coordinated defenses, synchronized lighting, and "really impressive magical displays that look more complex than they are."

‡‡Applications vary by topology: paired links for communication, networked links for distributed sensing and control, broadcast links for synchronized effects across large areas.`,
  abstract: 'Advanced linking techniques for creating sympathetic connections between distant runes including paired, networked, and broadcast topologies.',
  estimatedReadingTime: 330,
  authoringDifficulty: 5
};

export const RUNIC_ARRAYS: ResearchPaper = {
  paperId: 'runic_arrays',
  title: 'Large-Scale Magic: Designing and Deploying Runic Arrays',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['rune_combinations', 'sympathetic_linking', 'geometric_patterns'],
  complexity: 9,
  minimumAge: 'elder',
  minimumSkills: { rune_craft: 35, arcane: 18 },
  skillGrants: { rune_craft: 26, arcane: 14 },
  contributesTo: [
    { type: 'ability', abilityId: 'design_runic_arrays' },
    { type: 'spell', spellId: 'grand_array' }
  ],
  published: false,
  tier: 4, // Legacy
  technologyTags: ['advanced_rune_magic', 'reality_alteration'], // Legacy
  description: `The culmination of systematic runecraft*, describing arrays of hundreds or thousands of interconnected runes** working as unified systems***. The author frames arrays as "orchestras of power where individual runes are instruments and the designer is conductor†."

Array design principles include: modular architecture†† (independent subsystems), redundancy††† (graceful degradation on failure), power distribution‡ (balanced load), and maintainability‡‡ (arrays last decades, require upkeep).

The work documents historical arrays: The Warding of Winterhold (973 runes, still active), The Great Lighthouse Array (2,400 runes, decommissioned), and the Eternal Garden (unknown count, partially lost).

*Large-scale runecraft represents the ultimate application of accumulated knowledge. Single runes affect small areas. Arrays affect cities, regions, or conceptual domains.

**Numbers matter: dozens of runes create modest effects, hundreds create substantial effects, thousands create effects bordering on miraculous. The author: "Quantity has a quality all its own, in runecraft as in warfare."

***Unified systems mean individual runes support collective function rather than operating independently. Like cells in an organism versus individual organisms. The collective achieves what individuals cannot.

†The conductor metaphor is apt: timing, coordination, and balance determine success. Arrays with perfect runes but poor coordination fail. Arrays with adequate runes and excellent coordination succeed.

††Modular architecture divides arrays into functional subsystems: power generation, distribution, effect manifestation, monitoring, control. Subsystems interface through defined connections. Failure in one subsystem doesn't cascade to others.

†††Redundancy prevents single-point failures. Critical functions duplicate across multiple runes. If one fails, others compensate. The author notes: "Redundancy is expensive but necessary. The larger the array, the more certainty that something will fail."

‡Power distribution is critical at scale. Power sources (ley lines, crystals, manual charging) must supply all active runes adequately. Poor distribution creates "power deserts" (inactive runes) and "power floods" (overloaded runes that burn out).

‡‡Maintainability determines practical lifespan. Arrays with accessible runes, clear documentation, and straightforward repair last centuries. Arrays with hidden runes, lost documentation, and complex dependencies last until first major failure.`,
  abstract: 'Principles and practices for designing large-scale runic arrays including architecture, redundancy, power management, and maintenance.',
  estimatedReadingTime: 380,
  authoringDifficulty: 5
};

export const ELDER_RUNES: ResearchPaper = {
  paperId: 'elder_runes',
  title: 'The Ancient Script: A Study of Elder Runes and Forbidden Marks',
  field: 'arcane',
  paperSets: ['rune_magic'],
  prerequisitePapers: ['rune_combinations', 'activation_methods'],
  complexity: 10,
  minimumAge: 'elder',
  minimumSkills: { rune_craft: 40, arcane: 30 },
  skillGrants: { rune_craft: 30, arcane: 20 },
  contributesTo: [
    { type: 'ability', abilityId: 'carve_elder_runes' },
    { type: 'spell', spellId: 'elder_rune_of_binding' },
    { type: 'spell', spellId: 'elder_rune_of_unmaking' }
  ],
  published: false,
  tier: 5, // Legacy
  technologyTags: ['elder_rune_magic', 'reality_alteration'], // Legacy
  description: `The most dangerous book in the library*, documenting runes that predate recorded history** and should probably postdate it as well***. The author, whose identity is sealed under three separate spells, describes runes that do not simply affect reality but rewrite its rules†.

Elder runes exist in that uncomfortable space between magic and fundamental law††. They are not symbols that channel power - they are symbols that *are* power†††. Carving an elder rune doesn't create magic; it reveals magic that was always there, sleeping‡. This is either profound or terrifying depending on your philosophical stance and proximity to the rune‡‡.

The work catalogs seventeen confirmed elder runes‡‡‡ and references forty-three suspected ones. Each description is accompanied by extensive warnings, safety protocols, and documentation of what happened to previous researchers◊. The casualty rate is remarkably specific: 73.4%◊◊.

*This designation is both literal (most dangerous) and contested (several other books compete for the title, mostly because they're competing about everything). The library maintains a "Dangerous Books" section that requires written permission to access and next-of-kin notification.

**"Predate recorded history" means "we found them already carved into rocks older than writing." This raises troubling questions: Who carved them? When? Why? And how did they know what they were doing when the art of runecraft supposedly didn't exist yet?

***The temporal mechanics of this sentence gave the author a headache that lasted three weeks.

†Rewriting reality's rules is exactly as dangerous as it sounds, plus 30-40% more dangerous than you're currently imagining, plus an additional danger surcharge for hubris.

††The uncomfortable space in question is the same space occupied by paradoxes, quantum effects, and that feeling you get when you're certain someone called your name but nobody's there.

†††This is the doctrine of Runic Revelation, which holds that elder runes are not created but discovered, not written but read from the fabric of existence itself. Critics note this makes no sense. Practitioners note it works anyway, which trumps sense.

‡The sleeping magic metaphor appears in seventeen different traditions across nine hundred years, suggesting either parallel discovery or a very patient teacher traveling through time. Both explanations are equally plausible and equally disturbing.

‡‡Philosophers tend toward "profound" until they witness an elder rune activation, at which point they abruptly shift to "terrifying" and take up less abstract hobbies like gardening.

‡‡‡The seventeen confirmed elder runes: Sovereignty, Transformation, Entropy, Creation, Binding, Severance, Truth, Lies, Beginning, Ending, Memory, Forgetting, Law, Chaos, Self, Other, and one whose name was removed from all records for reasons that became apparent when someone tried to say it.

◊"What happened to previous researchers" is documented with clinical precision: 17 disappeared entirely, 23 were found but profoundly changed, 11 succeeded but refuse to discuss their work, 34 died (various causes, mostly unusual), and 4 claimed it was "totally worth it" despite visible evidence to the contrary.

◊◊The .4% represents Researcher Marlowe, who lost only part of themselves - specifically, their shadow. It now operates independently and last year published its own paper on elder runes, which disagrees with Marlowe on several key points.`,
  abstract: 'Advanced study of ancient, powerful runes that alter fundamental aspects of reality. Extremely dangerous.',
  estimatedReadingTime: 500,
  authoringDifficulty: 5
};

export const RUNE_MAGIC_PAPERS = [
  // Rune Magic (18 papers - complexity 2-10)
  SYMBOL_RECOGNITION,
  CARVING_FUNDAMENTALS,
  MATERIAL_SYMPATHIES,
  RUNE_COMBINATIONS,
  ACTIVATION_METHODS,
  CHROMATIC_RUNECRAFT,
  GEOMETRIC_PATTERNS,
  PHONETIC_ACTIVATION,
  RUNE_SYNTAX,
  PROTECTIVE_WARDS,
  RUNE_ERASURE,
  RUNE_AMPLIFICATION,
  TEMPORAL_INSCRIPTION,
  LAYERED_RUNES,
  BINDING_INSCRIPTIONS,
  SYMPATHETIC_LINKING,
  RUNIC_ARRAYS,
  ELDER_RUNES
];
