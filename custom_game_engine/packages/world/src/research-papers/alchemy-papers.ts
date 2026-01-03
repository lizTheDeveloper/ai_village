import type { ResearchPaper } from './types.js';

/**
 * Alchemical Research Papers
 *
 * The knowledge tree for alchemy, from basic substance identification
 * to transmutation and beyond. Significantly more prone to explosions
 * than other research fields.
 */

export const SUBSTANCE_IDENTIFICATION: ResearchPaper = {
  paperId: 'substance_identification',
  title: 'A Treatise on Not Drinking Random Liquids',
  field: 'alchemy',
  paperSets: ['basic_alchemy'],
  prerequisitePapers: [],
  complexity: 2,
  minimumAge: 'teen',
  skillGrants: { alchemy: 5, nature: 5 },
  contributesTo: [
    { type: 'building', buildingId: 'alchemy_lab' },
    { type: 'ability', abilityId: 'identify_substances' }
  ],
  published: false,
  tier: 1, // Legacy
  technologyTags: ['basic_alchemy'], // Legacy
  description: `A surprisingly necessary guide to identifying substances before consuming them*. The author, writing from what appears to be personal experience**, provides methods for distinguishing between water, alcohol, acids, bases, and "other things that definitely shouldn't go in your mouth"***.

The work introduces basic classification systems for substances based on observable properties: color, smell, viscosity, and "whether it smokes ominously"†. The famous Seven-Sense Test†† is presented, though the seventh sense is never clearly defined†††.

Appendix A, titled "Things I Have Learned Not To Taste," runs to twenty-three pages and includes such entries as "blue liquids (all of them)" and "anything that glows"‡.

*The fact that this guide was necessary tells us a great deal about early alchemists, none of it reassuring.

**The author mentions "regrettable incidents" seventeen times without elaboration. Readers are left to imagine, which is probably worse than the reality. Or possibly better. It's hard to say.

***This category is alarmingly large. The author's working assumption appears to be that most substances should not be ingested, which is statistically accurate but philosophically pessimistic.

†"Ominous smoking" is distinguished from "regular smoking" by intent. If the substance appears to be smoking AT you specifically, it is ominous.

††The Seven-Sense Test involves sight, smell, touch, taste, hearing, and two others that vary by source. Some say intuition and spirit. Others say "common sense" and "sense of impending doom." The author never clarifies, possibly on purpose.

†††This ambiguity led to the founding of the School of Seven-Sense Studies, which spent decades trying to identify the seventh sense. They eventually concluded it was "the sense that you probably shouldn't do this," which is less mystical than they hoped but more useful.

‡The glowing substances section includes a footnote within a footnote: "Yes, all of them. Even the pretty ones. *Especially* the pretty ones." This suggests a particularly memorable incident.`,
  abstract: 'Basic methods for identifying and categorizing substances safely, without relying on taste-testing.',
  estimatedReadingTime: 100,
  authoringDifficulty: 1
};

export const EXTRACTION_METHODS: ResearchPaper = {
  paperId: 'extraction_methods',
  title: 'The Art of Separation: Extracting Essences from Base Materials',
  field: 'alchemy',
  paperSets: ['basic_alchemy'],
  prerequisitePapers: [],
  complexity: 3,
  minimumAge: 'teen',
  skillGrants: { alchemy: 5 },
  contributesTo: [
    { type: 'item', itemId: 'acid' },
    { type: 'item', itemId: 'base' }
  ],
  published: false,
  tier: 1, // Legacy
  technologyTags: ['basic_alchemy'], // Legacy
  description: `A practical manual on separating the useful from the useless*, covering distillation, filtration, precipitation, and "aggressive persuasion"**. The author's approach is refreshingly direct: "Most things are made of other things. We want the other things."

The work provides detailed instructions for building basic alchemical apparatus***, including the alembic† (for distillation), the retort†† (for heating things in a controlled manner), and the "emergency bucket"††† (for when things go wrong).

Chapter 6, "On the Persistence of Impurities," reads like a sustained complaint about how difficult it is to get anything truly pure‡, but contains valuable practical wisdom buried under the grumbling.

*Philosophers spent decades debating the definition of "useful," but practicing alchemists simply meant "the bit we actually want."

**"Aggressive persuasion" involves increased heat, pressure, or both. The author notes this approach "works surprisingly often" but cautions against overuse, as aggressive persuasion sometimes produces explosions instead of essences.

***The apparatus diagrams are actually useful, which was unusual for alchemical texts of this period. Most diagrams from this era appear to have been drawn by someone who had never seen the device in question, or possibly had never seen.

†The alembic is described as "a still, but for alchemy instead of getting drunk." One reviewer noted this was "reductive but accurate."

††The retort is shaped like a teardrop and serves to contain reactions. The author notes it is "shaped like this for a reason" but never explains the reason. Modern scholars believe the reason is "it works," which is reason enough.

†††The emergency bucket is listed in the equipment section without elaboration. Experienced alchemists know why. Inexperienced alchemists learn why. Usually quickly.

‡The complaint reaches its peak in the section on multiple distillations, where the author notes that distilling something twelve times to achieve purity is "technically possible but spiritually exhausting."`,
  abstract: 'Fundamental techniques for separating and purifying substances from raw materials.',
  estimatedReadingTime: 100,
  authoringDifficulty: 1
};

export const MIXTURE_THEORY: ResearchPaper = {
  paperId: 'mixture_theory',
  title: 'On Combinations: What Happens When You Mix Things',
  field: 'alchemy',
  paperSets: ['basic_alchemy'],
  prerequisitePapers: ['substance_identification', 'extraction_methods'],
  complexity: 4,
  minimumAge: 'teen',
  minimumSkills: { alchemy: 10 },
  skillGrants: { alchemy: 10 },
  contributesTo: [
    { type: 'building', buildingId: 'advanced_lab' }
  ],
  published: false,
  tier: 2, // Legacy
  technologyTags: ['advanced_alchemy'], // Legacy
  description: `A systematic exploration of what occurs when substances are combined*, organized by the author's groundbreaking classification system: "Things That Mix Well," "Things That Don't Mix," and "Things That Explode"**.

The work establishes fundamental principles of chemical combination***, including the observation that reactions often produce heat†, sometimes produce gases††, and occasionally produce results that are "inadvisable to breathe"†††.

Of particular note is the Predictive Matrix‡, an attempt to predict reaction outcomes based on substance properties. The matrix is partially successful, by which we mean it successfully predicts about half of reactions and the other half "do whatever they want"‡‡.

*Mixing things is the foundation of alchemy. Some argue it's the foundation of cooking too, and that alchemy is just cooking with more explosions and less eating. This position is controversial.

**The "Things That Explode" category is disturbingly large. The author notes this is "not necessarily bad" as explosions can be useful if directed properly. Safety authorities disagreed.

***The author avoids calling it "chemistry" as that term hadn't been invented yet, or possibly because alchemists and chemists were feuding at the time. Historical records are unclear on this point.

†Heat production is described as "the universe's way of showing approval." Cold-producing reactions are noted as "rare and vaguely suspicious."

††Gas production is described as "usually fine, unless the gas is poisonous, flammable, or both." A helpful appendix lists common gases and their properties, rated on a scale from "pleasant" to "evacuate immediately."

†††This delicate phrasing masks considerable danger. "Inadvisable to breathe" ranges from "mildly unpleasant" to "immediately lethal." The author suggests treating all unknown gases as the latter until proven otherwise.

‡The Predictive Matrix is a chart that cross-references substance properties. It's elegant in theory and messy in practice, like most of alchemy.

‡‡The phrase "do whatever they want" appears frequently in alchemical literature. It reflects a certain resignation about the unpredictability of matter.`,
  abstract: 'The systematic study of how substances interact when combined and methods for predicting reaction outcomes.',
  estimatedReadingTime: 200,
  authoringDifficulty: 2
};

export const POTION_FORMULATION: ResearchPaper = {
  paperId: 'potion_formulation',
  title: 'Practical Potions: The Alchemist\'s Pharmacopeia',
  field: 'alchemy',
  paperSets: ['advanced_alchemy'],
  prerequisitePapers: ['mixture_theory', 'extraction_methods'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { alchemy: 20, nature: 10 },
  skillGrants: { alchemy: 15, nature: 5 },
  contributesTo: [
    { type: 'building', buildingId: 'apothecary' },
    { type: 'item', itemId: 'healing_potion' },
    { type: 'item', itemId: 'medicine' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_alchemy', 'medicine'], // Legacy
  description: `A comprehensive formulary of beneficial concoctions*, organized by effect and ease of preparation**. The author distinguishes between potions (liquid preparations taken internally), salves (preparations applied externally), and "things you really shouldn't do but technically could"***.

The work establishes the Principle of Minimum Effective Dose†, noting that more is not always better and is sometimes fatal††. The dosage tables provided have saved countless lives†††, though the author admits they were "determined through experimentation we prefer not to discuss in detail"‡.

Chapter 9, "On the Placebo Effect and Why It Works Anyway," was controversial but ultimately vindicated‡‡.

*"Beneficial" is defined somewhat loosely. Some formulations cure diseases. Others just make you feel better about having them. The author argues both have value.

**"Ease of preparation" ranges from "mix these three things" to "requires six months, twelve rare ingredients, and a full moon." The author notes that complex potions work better but simple potions work more often, which is a different kind of better.

***This third category exists because alchemists keep trying things they shouldn't. The author includes these formulations "for completeness" while strongly advising against their use. This has never stopped anyone.

†The Minimum Effective Dose is "the smallest amount that works." Finding this amount requires careful experimentation. The author's notes suggest this experimentation was not always careful.

††The line between therapeutic dose and toxic dose is described as "thinner than one would hope." Several substances are noted as having "no safe dose" and are included only for identification purposes.

†††The dosage tables are the paper's most cited section. Many readers skip directly to these tables without reading the rest, which the author predicted and included warnings against in the introduction. The warnings are also skipped.

‡The experiments are hinted at in footnotes: "Subject 23 reported feeling better," "Subject 41 complained of vivid dreams," "Subject 17 is no longer available for comment." One suspects ethical oversight was not rigorous.

‡‡The controversy centered on whether effects "all in your head" were real effects. The author's position: "If it makes you feel better, it makes you feel better. I don't care where the feeling happens." This pragmatic stance eventually won out.`,
  abstract: 'A practical guide to formulating potions and remedies with therapeutic effects.',
  estimatedReadingTime: 300,
  authoringDifficulty: 3
};

export const CRYSTALLIZATION_METHODS: ResearchPaper = {
  paperId: 'crystallization_methods',
  title: 'Solid from Solution: The Art of Crystallization',
  field: 'alchemy',
  paperSets: ['basic_alchemy'],
  prerequisitePapers: ['extraction_methods', 'mixture_theory'],
  complexity: 4,
  minimumAge: 'teen',
  minimumSkills: { alchemy: 12 },
  skillGrants: { alchemy: 8, nature: 4 },
  contributesTo: [
    { type: 'item', itemId: 'salt_crystals' }
  ],
  published: false,
  tier: 2, // Legacy
  technologyTags: ['basic_alchemy'], // Legacy
  description: `A meditation on patience disguised as a chemistry paper*. The author describes crystallization as "asking matter very politely to organize itself**," which requires saturated solution, controlled cooling, and the ability to wait without touching anything***.

The work distinguishes between rapid crystallization† (many small crystals, disappointing) and slow crystallization†† (fewer large crystals, impressive). The author advocates strongly for the latter†††, noting that "size matters when you're trying to impress natural philosophers‡."

Chapter 7, "Why Your Crystals Are Tiny: A Troubleshooting Guide," addresses the most common failure mode‡‡.

*The author is clearly a patient person. The entire paper radiates the calm energy of someone who can watch paint dry without getting bored. This is essential for crystallization work.

**Matter does organize itself, given the right conditions. Crystals form because atoms prefer orderly arrangements to chaos, which is more than can be said for most people.

***The temptation to disturb growing crystals is intense. Every vibration, temperature change, or curious poke can ruin hours of careful preparation. The author recommends "achieving inner peace or at minimum, leaving the room."

†Rapid crystallization occurs when you cool the solution too quickly or add too much seed material. The result is a mass of tiny crystals that technically proves you understand the concept but impresses nobody.

††Slow crystallization requires days or weeks. The solution must cool gradually, remain undisturbed, and be protected from dust, vibration, and overly curious apprentices. The author lost three weeks of work to an apprentice who "wanted to see if they were ready yet."

†††The advocacy borders on obsession. An entire section compares crystal size to personal character, suggesting that those who rush crystallization lack discipline. This seems excessive but the point about patience is valid.

‡Natural philosophers appreciate large, well-formed crystals because they're beautiful and easy to study. The author includes detailed drawings of perfect crystals alongside drawings labeled "what everyone's first attempt looks like" (irregularly shaped lumps).

‡‡Common causes of tiny crystals: cooling too fast, too many nucleation sites, disturbing the solution, impurities, and "cosmic bad luck" (the author's attempt at humor, though sometimes it really does seem like bad luck).`,
  abstract: 'Techniques for growing large, well-formed crystals from saturated solutions through controlled cooling and patience.',
  estimatedReadingTime: 180,
  authoringDifficulty: 2
};

export const SUBLIMATION_TECHNIQUES: ResearchPaper = {
  paperId: 'sublimation_techniques',
  title: 'Skipping Steps: The Phenomenon of Sublimation',
  field: 'alchemy',
  paperSets: ['basic_alchemy'],
  prerequisitePapers: ['substance_identification', 'extraction_methods'],
  complexity: 4,
  minimumAge: 'teen',
  minimumSkills: { alchemy: 13 },
  skillGrants: { alchemy: 9 },
  contributesTo: [
    { type: 'ability', abilityId: 'purify_by_sublimation' }
  ],
  published: false,
  tier: 2, // Legacy
  technologyTags: ['basic_alchemy'], // Legacy
  description: `An investigation into substances that refuse to melt*, going directly from solid to vapor in what the author calls "phase-transition rebellion**." The work documents which substances sublime***, why this matters for purification†, and how to actually capture the vapor before it escapes††.

The sublimation apparatus†††  (a sealed container with hot bottom, cold top) is described in detail, along with careful warnings about what happens when the seal fails‡.

Of particular note is the section on camphor‡‡, which sublimes so readily that "storing it is an exercise in watching it slowly vanish."

*Most substances melt when heated: solid → liquid → gas. Some substances, under certain conditions, skip the liquid phase entirely. This seems like cheating but is actually quite useful.

**The author personifies matter frequently, describing substances as having preferences and making choices. This is technically inaccurate but makes the writing more engaging than "thermodynamic phase transition occurs when vapor pressure exceeds atmospheric pressure at temperatures below melting point."

***Common subliming substances include dry ice (frozen carbon dioxide), iodine, sulfur, camphor, and various other materials. The author notes that sublimation is "more common than generally believed, but less common than would be convenient."

†Sublimation purifies because impurities usually don't sublime at the same temperature. Heat the mixture, collect the vapor, condense it elsewhere, and you've separated the subliming substance from non-subliming contaminants. Elegant.

††Capturing sublimed vapor requires a cold surface where it can condense back into solid. This is simple in concept but fiddly in practice, requiring precise temperature control and good seals.

†††The author's apparatus design is practical but assumes access to good glassware and heat sources. One reviewer noted: "Excellent for well-equipped laboratories, optimistic for everyone else."

‡Seal failure allows vapor to escape, ruining the experiment and filling the room with whatever you were subliming. For camphor, this means a strong smell. For other substances, this means choking, toxic fumes. The author recommends good ventilation "and possibly a method for rapid evacuation."

‡‡Camphor is used in medicine, religious ceremonies, and "annoying your colleagues by subliming it near their workspace." The author includes this last use only to condemn it, but the specificity suggests personal experience.`,
  abstract: 'Methods for purifying substances through sublimation, including apparatus design and vapor collection techniques.',
  estimatedReadingTime: 160,
  authoringDifficulty: 2
};

export const SOLUTION_PREPARATION: ResearchPaper = {
  paperId: 'solution_preparation',
  title: 'The Art of Dissolution: Preparing Solutions Properly',
  field: 'alchemy',
  paperSets: ['basic_alchemy'],
  prerequisitePapers: ['mixture_theory'],
  complexity: 3,
  minimumAge: 'teen',
  minimumSkills: { alchemy: 10 },
  skillGrants: { alchemy: 7 },
  contributesTo: [
    { type: 'ability', abilityId: 'prepare_solutions' }
  ],
  published: false,
  tier: 2, // Legacy
  technologyTags: ['basic_alchemy'], // Legacy
  description: `A deceptively simple guide to making things dissolve in other things*, which the author insists is "more complex than it appears**." The work systematically covers solvent selection***, concentration calculations†, and the eternal question: "Is it dissolved, or just really well mixed?"††

The author introduces the concept of saturation††† - the point where the solvent holds as much solute as physically possible‡. Adding more solute beyond saturation results in "optimistic sediment"‡‡ (undissolved material at the bottom).

Temperature effects are discussed at length: most substances dissolve better in warm solvent, though some perversely dissolve better when cold.

*"Things" is deliberately vague. The author covers salts, sugars, acids, bases, and "exotic substances we probably shouldn't be dissolving but will anyway."

**What seems simple (pour powder in liquid, stir) becomes complex when you consider: which liquid, how much powder, what temperature, how long to stir, and whether stirring is even appropriate.

***Solvent selection follows the principle "like dissolves like": polar solvents (water) dissolve polar solutes (salt), nonpolar solvents (oil) dissolve nonpolar solutes (wax). The author notes this rule is "useful until it isn't," citing numerous exceptions.

†Concentration is the amount of solute per amount of solution. The author provides formulas but also practical guidelines: "If you can see through it, it's dilute. If you can't, it's concentrated. If it's got chunks, you've exceeded saturation."

††This question is harder than it sounds. True solutions are homogeneous at the molecular level. Suspensions just look homogeneous until they settle. The author provides tests: true solutions don't separate over time and remain clear (or uniformly colored).

†††Saturation point varies by substance, solvent, and temperature. Supersaturation (dissolving more than should be possible) can occur but is unstable. The slightest disturbance causes rapid crystallization, which the author describes as "startling but harmless."

‡"Physically possible" is determined by thermodynamics, molecular structure, and factors the author admits not fully understanding. The practical limit: keep adding solute until it stops dissolving.

‡‡The author's term for undissolved material. It's optimistic because you hoped it would dissolve. It's sediment because it's sitting at the bottom, mocking your hopes.`,
  abstract: 'Systematic methods for preparing solutions including solvent selection, concentration control, and saturation determination.',
  estimatedReadingTime: 140,
  authoringDifficulty: 2
};

export const PRECIPITATION_REACTIONS: ResearchPaper = {
  paperId: 'precipitation_reactions',
  title: 'From Clear to Cloudy: The Chemistry of Precipitation',
  field: 'alchemy',
  paperSets: ['basic_alchemy'],
  prerequisitePapers: ['mixture_theory', 'solution_preparation'],
  complexity: 5,
  minimumAge: 'teen',
  minimumSkills: { alchemy: 15 },
  skillGrants: { alchemy: 10 },
  contributesTo: [
    { type: 'ability', abilityId: 'precipitate_substances' }
  ],
  published: false,
  tier: 2, // Legacy
  technologyTags: ['basic_alchemy'], // Legacy
  description: `A comprehensive study of making solids appear from clear liquids*, which the author describes as "reverse dissolution" but admits this term never caught on**. The work explains how mixing two solutions can produce a third substance that refuses to stay dissolved***.

The paper systematically covers precipitation reactions†: mixing solutions of soluble substances to produce insoluble products that fall out of solution as solid "precipitate." The author likens this to "chemical surprise parties where the guest of honor is a solid nobody invited††."

Practical applications include purification††† (precipitating the desired substance while leaving impurities in solution) and identification‡ (different substances precipitate with different reagents).

*Specifically, making them appear intentionally rather than accidentally. Accidental precipitation is called "contamination" and is generally unwelcome.

**The author tried. They really tried. An entire footnote laments the failure of "reverse dissolution" as terminology, noting that "precipitation" is already established and "trying to change established terminology is like teaching rocks to dance."

***The solid forms because the product of the reaction is insoluble in the solvent. Two soluble parents produce an insoluble child, chemically speaking.

†Classic example: mixing silver nitrate solution with salt water produces silver chloride precipitate. The silver nitrate and salt were both dissolved, but silver chloride refuses to dissolve and forms a white solid that settles out.

††The metaphor works better than expected. You invite two guests (reagents), they interact (react), and suddenly there's a solid at the bottom of the flask (the precipitate) that wasn't invited but showed up anyway.

†††Precipitation purification works when the desired substance precipitates but impurities don't (or vice versa). Filter out the precipitate, and you've separated things. The author notes this is "elegantly simple in theory, annoyingly messy in practice" due to filter papers, washing steps, and drying time.

‡Precipitation can identify substances: add specific reagents and see what precipitates. Silver ions precipitate with chloride. Calcium precipitates with oxalate. The author includes a table of common precipitation tests that was immediately stolen by every analytical alchemist who read the paper.`,
  abstract: 'Theory and practice of precipitation reactions for purification and identification of substances.',
  estimatedReadingTime: 170,
  authoringDifficulty: 3
};

export const SOLUBILITY_PRINCIPLES: ResearchPaper = {
  paperId: 'solubility_principles',
  title: 'What Dissolves What: A Systematic Study of Solubility',
  field: 'alchemy',
  paperSets: ['basic_alchemy'],
  prerequisitePapers: ['substance_identification', 'solution_preparation'],
  complexity: 4,
  minimumAge: 'teen',
  minimumSkills: { alchemy: 14 },
  skillGrants: { alchemy: 9, nature: 3 },
  contributesTo: [
    { type: 'ability', abilityId: 'predict_solubility' }
  ],
  published: false,
  tier: 2, // Legacy
  technologyTags: ['basic_alchemy'], // Legacy
  description: `An ambitious attempt to create universal rules for predicting solubility*, which the author admits "works most of the time**." The central principle remains "like dissolves like***" - polar dissolves polar, nonpolar dissolves nonpolar - but the paper documents extensive exceptions†.

The work includes tables of solubility data††: which substances dissolve in water, alcohol, oils, acids, and "exotic solvents we obtained through questionable means†††." Temperature effects are systematically recorded‡.

The final chapter, "When the Rules Don't Apply," is longer than the chapter explaining the rules‡‡.

*Predicting solubility saves time. Rather than trying every combination experimentally, you can predict what will probably work and test that. The author estimates this approach saves "significant time and considerable frustration."

**The author's honesty is refreshing. Most alchemical texts claim universal applicability. This one admits limitations up front, building trust that pays off when the rules actually work.

***This rule is derived from molecular polarity. Polar molecules have uneven charge distribution (like water: slightly positive on one end, slightly negative on the other). Nonpolar molecules have even distribution (like oil). Polar dissolves polar because the charges attract.

†Exceptions include: some ionic compounds that should dissolve but don't (silver chloride), some nonpolar substances that dissolve in polar solvents anyway (oxygen in water), and "general chemical perversity" (the author's term for unexplained behavior).

††The tables represent years of systematic testing. One footnote mentions testing 347 substance-solvent combinations over eighteen months. The dedication is admirable, the tedium unimaginable.

†††The author never specifies the "questionable means," which makes them more suspicious, not less. Exotic solvents mentioned include liquid ammonia, molten sulfur, and "that green liquid from the merchant who wouldn't make eye contact."

‡Temperature usually increases solubility for solids, decreases it for gases. But some substances become less soluble when heated (cerium sulfate), and some gases don't care about temperature (helium). Nature enjoys exceptions.

‡‡This ratio (exceptions > rules) is concerning from a theoretical standpoint but practical from an experimental one. The author's position: "The rules work often enough to be useful. The exceptions are interesting. Both matter."`,
  abstract: 'Systematic study of solubility patterns, predictive rules, and extensive data tables for common substances.',
  estimatedReadingTime: 200,
  authoringDifficulty: 3
};

export const LABORATORY_SAFETY: ResearchPaper = {
  paperId: 'laboratory_safety',
  title: 'Still Alive: A Practical Guide to Not Dying in Your Laboratory',
  field: 'alchemy',
  paperSets: ['basic_alchemy'],
  prerequisitePapers: ['substance_identification'],
  complexity: 2,
  minimumAge: 'teen',
  skillGrants: { alchemy: 5 },
  contributesTo: [
    { type: 'ability', abilityId: 'safe_laboratory_practice' }
  ],
  published: false,
  tier: 1, // Legacy
  technologyTags: ['basic_alchemy'], // Legacy
  description: `A surprisingly dark treatise on avoiding common causes of alchemical death*, written by someone who has clearly witnessed many laboratory accidents**. The author's central thesis: "Most alchemical fatalities are preventable through basic caution and not doing obviously stupid things***."

The work categorizes hazards by type: chemical† (poisons, corrosives, reactives), physical†† (heat, explosions, cuts), and "self-inflicted stupidity"††† (tasting unknown substances, ignoring warnings, hubris).

Safety protocols are presented with escalating urgency‡, from "recommended" through "strongly advised" to "do this or your death is on your own head‡‡."

*Common causes include: poison exposure, explosions, fires, corrosive burns, toxic fumes, and "cascade failures where one mistake triggers three more." The author documents these with clinical detachment.

**The author mentions being "present for" seventeen laboratory accidents, ranging from "minor injuries" to "fatalities that could have been avoided." The tone suggests survivor's guilt and frustration with preventable deaths.

***"Obviously stupid things" include: mixing random substances to see what happens, tasting unknown materials, working while intoxicated, ignoring ventilation, and "assuming you're too clever to make beginner mistakes."

†Chemical hazards require respect. Poisons can kill through skin contact, inhalation, or ingestion. Corrosives destroy tissue on contact. Reactive substances explode, burn, or release toxic fumes when improperly handled. The author's advice: "Treat everything as potentially lethal until proven otherwise."

††Physical hazards: broken glassware cuts, hot equipment burns, explosions from pressure buildup or reactive mixtures. The author recommends protective equipment and "maintaining healthy fear of hot, sharp, and explosive things."

†††The author reserves particular scorn for "self-inflicted stupidity," noting that "intelligence and education don't prevent foolishness, they just make it more embarrassing." Examples include experienced alchemists who got careless, overconfident, or distracted.

‡Safety protocols are organized by risk level. Low-risk activities require basic precautions. High-risk activities require extensive safety measures. The author notes: "If you're not sure which category your work falls into, assume high-risk."

‡‡This phrasing appears three times in the paper, always regarding ignoring mandatory safety protocols. The author clearly feels strongly about this.`,
  abstract: 'Comprehensive laboratory safety protocols covering chemical, physical, and behavioral hazards in alchemical work.',
  estimatedReadingTime: 150,
  authoringDifficulty: 2
};

export const TRANSMUTATION_PRINCIPLES: ResearchPaper = {
  paperId: 'transmutation_principles',
  title: 'On Changing What Things Are: The Theory of Transmutation',
  field: 'alchemy',
  paperSets: ['advanced_alchemy'],
  prerequisitePapers: ['mixture_theory', 'potion_formulation'],
  complexity: 8,
  minimumAge: 'adult',
  minimumSkills: { alchemy: 30 },
  skillGrants: { alchemy: 20 },
  contributesTo: [
    { type: 'ability', abilityId: 'transmute_metals' }
  ],
  published: false,
  tier: 4, // Legacy
  technologyTags: ['transmutation'], // Legacy
  description: `The most ambitious work in alchemical literature, proposing that substances are not fixed but can be fundamentally transformed*. The author's central claim - that lead can become gold** - was met with skepticism, excitement, and several arrest warrants for fraud***.

The work distinguishes between "surface changes" (mixing, dissolving, heating) and "essential changes" (actual transformation of substance)†. The theory is sound, the mathematics elegant††, and the practical success rate "depressingly low"††† (author's own assessment).

Appendix F documents seventeen years of failed transmutation attempts‡, reading like a combination of experimental log and descent into madness‡‡. The final entry: "It worked. Twice. I can't reproduce it. I'm publishing anyway."‡‡‡

*This is technically true but practically difficult. The author is honest about this difficulty while remaining optimistic, which is either admirable or delusional depending on one's perspective.

**The lead-to-gold transformation is alchemy's holy grail, mostly because gold is valuable and lead is not. Transforming gold into lead is technically equally impressive but interests nobody.

***The fraud charges came from nobles who funded the research expecting returns. The author's defense: "I said it was possible, not guaranteed." This defense was legally unsuccessful but scientifically accurate.

†The distinction is clear in theory: mixing wine and water doesn't change what they are essentially, but turning lead to gold would. In practice, determining which changes are "essential" proved philosophically challenging.

††The mathematics involve proportion theory, elemental balance equations, and several concepts that wouldn't be formalized for centuries. Scholars debate whether the author was a genius or just making things up. Evidence supports both positions.

†††Of the 1,247 documented attempts, two produced gold. The success rate of 0.16% would be discouraging except that it's greater than zero, which proved the principle. The author celebrated for three days, then spent three years trying to reproduce the result.

‡The log entries grow increasingly desperate: "Day 412: Still lead." "Day 891: Lead, but it's a different color now. Progress?" "Day 1,103: Everything is lead. I am become lead."

‡‡The descent is not total. Moments of lucidity and humor persist throughout, suggesting the author maintained perspective despite frustration. Or possibly lost perspective but in an entertaining way.

‡‡‡This honesty is refreshing. Most alchemists would have claimed perfect reproducibility. The author's admission that they succeeded twice accidentally and don't know why is both scientifically honest and professionally embarrassing.`,
  abstract: 'The theoretical foundation and practical attempts at transmuting substances at a fundamental level.',
  estimatedReadingTime: 400,
  authoringDifficulty: 5
};

export const TINCTURE_PREPARATION: ResearchPaper = {
  paperId: 'tincture_preparation',
  title: 'Alcoholic Extraction: The Preparation of Medicinal Tinctures',
  field: 'alchemy',
  paperSets: ['advanced_alchemy'],
  prerequisitePapers: ['potion_formulation', 'extraction_methods'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { alchemy: 26, nature: 12 },
  skillGrants: { alchemy: 18, nature: 8 },
  contributesTo: [
    { type: 'item', itemId: 'medicinal_tincture' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_alchemy', 'medicine'], // Legacy
  description: `A sophisticated guide to extracting medicinal compounds using alcohol*, which the author describes as "the universal key that unlocks nature's medicine cabinet**." The work systematically covers herb selection***, alcohol concentration†, maceration times††, and the critical art of not drinking your experimental materials†††.

The tincture-making process involves steeping plant material in alcohol‡ for weeks, allowing compounds to dissolve. The resulting liquid concentrates medicinal properties in convenient, long-lasting form‡‡.

Dosing instructions are provided with appropriate warnings about the alcohol content making the medicine "therapeutically effective and recreationally tempting."

*Alcohol (ethanol, specifically) dissolves many medicinal compounds that water cannot. This makes alcohol extraction complementary to water-based methods, accessing different sets of active ingredients.

**The metaphor is apt. Alcohol extracts alkaloids, resins, essential oils, and other medicinal compounds from plant material. The author notes: "Water extracts what wants to leave. Alcohol extracts what wants to stay."

***Herb selection requires knowing which plants contain useful compounds and which parts (root, leaf, flower, bark) are most potent. The author includes extensive tables that represent decades of collection and testing.

†Alcohol concentration matters. Too weak: insufficient extraction. Too strong: extracts unwanted compounds. The "ideal" concentration is typically 40-60% alcohol, though some plants require stronger or weaker solutions. The author provides specific recommendations per plant.

††Maceration time (steeping duration) varies by plant: days for some, weeks for others, months for "the stubborn ones." The author describes patience as the "fourth ingredient" after plant, alcohol, and time.

†††The temptation to taste-test tinctures is significant. The author warns: "Professional tincture-makers develop alcohol tolerance not through vice but through excessive quality control. This is still problematic." Safety protocols are emphasized.

‡The steeping vessel must be sealed to prevent alcohol evaporation. Glass jars work well. The author cautions against metal containers for acidic tinctures (metal leaching) and against porous containers for any tinctures (everything leaks).

‡‡Tinctures last years without refrigeration, making them superior to fresh herbs (spoil quickly) and dried herbs (lose potency over time). The author calls tinctures "bottled medicine that refuses to expire, unlike the alchemist who made it."`,
  abstract: 'Methods for preparing alcoholic herbal tinctures including extraction techniques, optimal concentrations, and storage.',
  estimatedReadingTime: 280,
  authoringDifficulty: 4
};

export const MEDICINAL_HERBS: ResearchPaper = {
  paperId: 'medicinal_herbs',
  title: 'Nature\'s Pharmacy: Identification and Use of Medicinal Plants',
  field: 'alchemy',
  paperSets: ['advanced_alchemy'],
  prerequisitePapers: ['potion_formulation', 'substance_identification'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { alchemy: 22, nature: 15 },
  skillGrants: { alchemy: 14, nature: 12 },
  contributesTo: [
    { type: 'item', itemId: 'medicinal_herbs' },
    { type: 'ability', abilityId: 'identify_medicinal_plants' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_alchemy', 'medicine'], // Legacy
  description: `An encyclopedic work cataloging medicinal plants*, their identification**, therapeutic uses***, and the eternal warning: "Some plants heal, some plants kill, and some do both depending on dose†."

The author organizes plants by effect: febrifuges†† (fever reducers), analgesics††† (pain relievers), digestives‡ (stomach soothers), and "the ones you really shouldn't use without extensive training‡‡."

Each entry includes botanical description, habitat, harvesting season, preparation methods, and detailed dosing information with emphasis on "the narrow window between too little and too much."

*The catalog covers 147 medicinal plants from common (willow bark, chamomile) to rare (certain mountain flowers available only in spring). The scope is ambitious; the detail is impressive.

**Identification is critical. Similar-looking plants may have wildly different effects. The author documents several cases of misidentification with outcomes ranging from "ineffective treatment" to "regrettable funeral." Illustrations are detailed and accurate.

***Therapeutic uses are described with both traditional knowledge and empirical testing. The author respects folklore but verifies claims, noting: "Tradition is often right but sometimes spectacularly wrong. Test everything."

†Paracelsus's principle: "The dose makes the poison." Many medicinal plants are toxic at high doses. Some are toxic at moderate doses. A few are toxic at any dose and included only "for completeness and to ensure you avoid them."

††Willow bark (containing aspirin-like compounds) is the star febrifuge. The author describes it as "reliable, effective, and tastes terrible, which convinces patients it must be working." Other fever reducers are also documented.

†††Pain relief ranges from mild (chamomile tea) to strong (poppy derivatives, with extensive warnings). The author notes that effective pain relief often comes with side effects ranging from drowsiness to addiction.

‡Digestive herbs are numerous and generally safe. The author's recommendations for stomach troubles start with peppermint and escalate through increasingly aggressive herbs, ending with "if these don't work, consult a physician because the problem isn't your stomach."

‡‡This category includes powerful herbs requiring precise dosing: digitalis (heart medicine that stops hearts if overdosed), belladonna (pupil dilator and poison), and various others. The author's tone shifts from educational to warning: "These plants demand respect."`,
  abstract: 'Comprehensive catalog of medicinal plants with identification, therapeutic uses, and dosing information.',
  estimatedReadingTime: 380,
  authoringDifficulty: 5
};

export const POISON_RECOGNITION: ResearchPaper = {
  paperId: 'poison_recognition',
  title: 'Toxins and Venoms: Identifying and Understanding Poisons',
  field: 'alchemy',
  paperSets: ['advanced_alchemy'],
  prerequisitePapers: ['substance_identification', 'medicinal_herbs'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { alchemy: 28, nature: 12 },
  skillGrants: { alchemy: 20 },
  contributesTo: [
    { type: 'ability', abilityId: 'identify_poisons' }
  ],
  published: false,
  tier: 4, // Legacy
  technologyTags: ['advanced_alchemy'], // Legacy
  description: `A dark but necessary work cataloging substances that kill*, their mechanisms**, symptoms***, and the grim reality: "Most poisons have no antidote; avoidance is the only cure†."

The author categorizes poisons by source: plant-based†† (hemlock, nightshade, monkshood), mineral††† (arsenic, mercury, lead), animal‡ (snake venoms, spider toxins), and fungal‡‡ (death cap, destroying angel).

Identification methods are thoroughly documented, often through tragic case studies of accidental poisonings that "could have been prevented with this knowledge."

*The author's rationale for publishing poison information: "Knowledge of poisons enables their avoidance, identification, and potentially treatment. Ignorance just means more corpses." This utilitarian view was controversial but ultimately accepted.

**Mechanisms range from simple (corrosive burns) to complex (enzyme inhibition, nerve disruption, organ failure). The author explains these with clinical precision, noting that "understanding how poisons kill helps predict symptoms and guide treatment, when treatment exists."

***Symptom documentation is extensive and disturbing. The author provides timing: "First hour: these symptoms. Second hour: these worsen. Third hour: if untreated, this occurs." The progression charts are invaluable for diagnosis and depressing to read.

†The lack of antidotes for most poisons is sobering. Treatments are often supportive: induce vomiting (if appropriate), activated charcoal (if early enough), and "hope while providing comfort." The author's frustration with medical limitations is evident.

††Plant poisons are common and varied. Hemlock causes paralysis while consciousness remains (described as "philosophically troubling"). Nightshade causes delirium and hallucinations. Monkshood affects the heart. The author notes: "Nature produces poisons for defense, humans discover them through tragedy."

†††Mineral poisons accumulate over time. Arsenic causes gradual organ failure. Mercury affects the brain. Lead damages everything slowly. The author documents historical cases of chronic poisoning, many accidental (lead pipes, mercury in medicine).

‡Animal venoms are specialized poisons evolved for hunting or defense. The author respects their efficacy while lamenting their effects on humans: "Snake venom is optimized for killing mice. Unfortunately, it also works on people."

‡‡Fungal poisons are particularly treacherous because toxic mushrooms often resemble edible ones. The death cap mushroom is described as "delicious, deadly, and distinguishable from safe mushrooms only to experts." The author's advice: "When in doubt, don't eat wild mushrooms."`,
  abstract: 'Comprehensive guide to identifying poisons, understanding their mechanisms, and recognizing symptoms of poisoning.',
  estimatedReadingTime: 360,
  authoringDifficulty: 5
};

export const ANTIDOTE_FORMULATION: ResearchPaper = {
  paperId: 'antidote_formulation',
  title: 'Against the Poison: Antidotes and Treatments for Toxic Exposure',
  field: 'alchemy',
  paperSets: ['advanced_alchemy'],
  prerequisitePapers: ['poison_recognition', 'potion_formulation'],
  complexity: 9,
  minimumAge: 'adult',
  minimumSkills: { alchemy: 35, nature: 14 },
  skillGrants: { alchemy: 25 },
  contributesTo: [
    { type: 'item', itemId: 'universal_antidote' },
    { type: 'ability', abilityId: 'formulate_antidotes' }
  ],
  published: false,
  tier: 4, // Legacy
  technologyTags: ['advanced_alchemy', 'medicine'], // Legacy
  description: `A desperately optimistic work attempting to provide counteragents for common poisons*, despite the author's acknowledgment that "true antidotes are rare; most treatments merely delay death while hoping the body recovers**."

The paper categorizes treatments by type: specific antidotes*** (work against particular poisons), general treatments† (support the body's healing), and "optimistic interventions"†† (unproven but sometimes effective).

The legendary universal antidote††† is discussed with appropriate skepticism: "If it existed, poisoning wouldn't be a problem. It doesn't exist, which is why poisoning remains very much a problem‡."

*Common poisons with some treatment options: alcohol (time and water), heavy metals (chelating agents), some plant toxins (specific binding compounds). The author is honest about limitations throughout.

**The body's remarkable ability to heal if kept alive long enough is emphasized. Many antidote strategies amount to: remove poison (if possible), support vital functions (breathing, heart), and wait. The author notes: "This approach sometimes works, which is better than never working."

***True specific antidotes are rare and precious. Examples: atropine for certain nerve agents, naloxone for opiate overdose, antivenoms for specific snake bites. The author documents each with formulation methods and dosing information.

†General treatments include activated charcoal (binds many poisons), induced vomiting (removes unabsorbed poison), and supportive care (fluids, rest, monitoring). These don't counteract poisons but reduce exposure and support recovery.

††Unproven interventions are included with caveats. Some folk remedies work (often containing true antidotes without knowing why). Others are placebo at best, harmful at worst. The author's criterion for inclusion: "documented cases where it might have helped."

†††The universal antidote (claimed to neutralize all poisons) is alchemical mythology. The author debunks claims while explaining why the myth persists: "Hope is powerful. A universal antidote would be miraculous. Therefore, people claim to have discovered it regularly."

‡The author's tone when discussing impossible cures shifts from clinical to philosophical: "We seek universal solutions to complex problems. Poisoning is complex. Solutions must be specific. Accepting this is difficult but necessary."`,
  abstract: 'Treatment methods for toxic exposures including specific antidotes, general supportive care, and poison neutralization.',
  estimatedReadingTime: 340,
  authoringDifficulty: 5
};

export const DISTILLATION_CYCLES: ResearchPaper = {
  paperId: 'distillation_cycles',
  title: 'Multiple Distillations: Achieving Extreme Purity Through Iteration',
  field: 'alchemy',
  paperSets: ['advanced_alchemy'],
  prerequisitePapers: ['extraction_methods', 'potion_formulation'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { alchemy: 27 },
  skillGrants: { alchemy: 19 },
  contributesTo: [
    { type: 'item', itemId: 'pure_alcohol' },
    { type: 'ability', abilityId: 'multi_stage_distillation' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_alchemy'], // Legacy
  description: `An exhaustive study of purification through repeated distillation*, which the author describes as "teaching substances the virtue of purity through relentless refinement**." The work demonstrates how each distillation cycle removes additional impurities***, approaching theoretical limits of purity†.

The economics of multi-stage distillation are sobering: each cycle requires time, fuel, and equipment††, with diminishing returns†††. The author questions: "When is pure enough actually enough?"

Practical applications include ultra-pure alcohol‡ (for tinctures and reagents), essential oils‡‡ (concentrated plant essences), and "substances so pure they're essentially theoretical."

*Single distillation separates liquids by boiling point. Multiple distillations repeat the process on increasingly pure material, each cycle removing trace impurities the previous cycle missed.

**The author's personification of substances continues. Impurities are described as "reluctant to leave" and requiring "persistent encouragement through heat and condensation."

***Impurity removal follows mathematical patterns: first distillation might achieve 90% purity, second 99%, third 99.9%, fourth 99.99%. Each nine gets harder to earn, requiring progressively more effort.

†Theoretical limits exist due to azeotropes (mixtures that distill as if they were pure) and practical limitations (perfect equipment doesn't exist, trace contamination is inevitable). The author accepts these limits: "Absolute purity is impossible. Near-absolute purity is difficult enough."

††Equipment wear increases with multiple cycles. Glass apparatus can crack from thermal stress. Seals can fail. The author recommends quality equipment and "resigned acceptance that everything eventually breaks."

†††Diminishing returns mean the tenth distillation provides far less improvement than the second. The author provides cost-benefit analysis: "For most purposes, three distillations suffice. For critical applications, seven. Beyond that is usually perfectionism rather than necessity."

‡Ultra-pure alcohol (approaching 100% ethanol) is hygroscopic (absorbs water from air) and becomes impure almost immediately. The author notes the irony: "We can create extreme purity but cannot maintain it."

‡‡Essential oil production through multiple distillations concentrates volatile compounds to remarkable potency. The author warns: "Concentrated essences are powerful. Use sparingly. A drop often suffices."`,
  abstract: 'Advanced multi-stage distillation techniques for achieving extreme purity in liquids and essences.',
  estimatedReadingTime: 300,
  authoringDifficulty: 4
};

export const SPECIFIC_GRAVITY: ResearchPaper = {
  paperId: 'specific_gravity',
  title: 'Weight and Water: Using Density to Identify Substances',
  field: 'alchemy',
  paperSets: ['advanced_alchemy'],
  prerequisitePapers: ['substance_identification', 'solution_preparation'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { alchemy: 24 },
  skillGrants: { alchemy: 16 },
  contributesTo: [
    { type: 'ability', abilityId: 'measure_density' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_alchemy'], // Legacy
  description: `A practical treatise on using density as an identification tool*, based on the principle that different substances weigh different amounts for the same volume**. The author describes this as "Archimedes's gift to alchemists***," providing precise methods for density measurement†.

The displacement method††  (submerging objects in water, measuring volume displaced) is explained with careful attention to common errors†††. The hydrometer‡ (floating device indicating liquid density) is presented as "elegant, simple, and prone to breaking."

Applications include alloy testing‡‡ (detecting counterfeit gold), solution concentration measurement, and substance identification when other methods are ambiguous.

*Density (mass per volume) is characteristic for each substance. Gold has specific density, lead has different density, water has another. Measuring density helps identify unknown materials.

**This seems obvious in retrospect but wasn't always. The author credits Archimedes with the foundational insight while extending the practical applications considerably beyond "detecting fake gold crowns."

***The crown story (Archimedes determining if a crown was pure gold) is retold with the author noting: "The king suspected fraud, Archimedes had insight, density revealed truth. This pattern repeats throughout history whenever valuable materials are involved."

†Density measurement requires accurate mass and volume determination. Mass is straightforward (use a good balance). Volume is trickier, solved through water displacement for solids and calibrated containers for liquids.

††The displacement method: submerge object in water, collect displaced water, measure its volume (which equals object's volume), divide object's mass by volume. Simple in principle, fiddly in practice.

†††Common errors include: air bubbles clinging to the object (making it seem less dense), water absorption by porous materials (changing mass), and "forgetting to subtract the container's mass, which is embarrassing."

‡Hydrometers float higher in dense liquids, lower in light liquids. Reading the scale where the liquid surface intersects gives density. The author recommends having multiple hydrometers for different density ranges.

‡‡Gold is dense (19.3 g/cm³). Lead is less dense (11.3). A gold object containing lead will measure less dense than pure gold. This test has exposed countless counterfeits and enriched many alchemists who offered testing services.`,
  abstract: 'Methods for measuring substance density using displacement and hydrometers for identification and quality assessment.',
  estimatedReadingTime: 260,
  authoringDifficulty: 4
};

export const GRAND_ALCHEMY: ResearchPaper = {
  paperId: 'grand_alchemy',
  title: 'The Magnum Opus: Synthesis of Alchemical Knowledge',
  field: 'alchemy',
  paperSets: ['advanced_alchemy'],
  prerequisitePapers: ['transmutation_principles', 'potion_formulation'],
  complexity: 10,
  minimumAge: 'elder',
  minimumSkills: { alchemy: 40 },
  skillGrants: { alchemy: 30 },
  contributesTo: [
    { type: 'item', itemId: 'universal_solvent' },
    { type: 'item', itemId: 'elixir_of_life' },
    { type: 'ability', abilityId: 'grand_transmutation' }
  ],
  published: false,
  tier: 5, // Legacy
  technologyTags: ['transmutation', 'legendary_alchemy'], // Legacy
  description: `The culmination of alchemical wisdom, this work attempts to unify all previous theories into a single coherent framework*. The author, identified only as "The Last Alchemist**," synthesizes extraction, mixture, formulation, and transmutation into what they term "The Great Work."

The paper proposes that all alchemical processes are variations of a single universal operation***:  "Taking what is and making it what it could be." This philosophical approach annoyed practical alchemists† but inspired theoretical ones††.

The final chapter, "On the Philosopher's Stone and Why I Didn't Find It"†††, is equal parts confession, apology, and instruction manual for the next generation of seekers‡.

*Unification attempts are common in alchemy. Most fail. This one half-succeeds, which is better than average.

**The title "Last Alchemist" is either humble (suggesting the author completes the tradition) or arrogant (suggesting no one could follow). Readers disagree on which interpretation is correct. The author, when asked, replied: "Both."

***This universal operation is presented as both profound truth and obvious platitude, which is characteristic of deep insights. Simple to state, difficult to truly understand, impossible to fully implement.

†Practical alchemists wanted recipes and procedures, not philosophy. One review: "Interesting but useless." This review missed the point but reflected common sentiment.

††Theoretical alchemists treasured this work, calling it "the key to everything." What it was the key to remained unclear, but they were enthusiastic about it.

†††The Philosopher's Stone, the legendary substance that perfects all transmutations, is alchemy's ultimate goal. The author's admission of failure is refreshingly honest. Their suggestion that others might succeed where they failed is optimistic, possibly excessively so.

‡The instructions are less "do this" and more "think about this." The author suggests that the Stone is not found but made, not made but realized, not realized but... the passage trails off into poetic mysticism that either contains profound wisdom or means nothing. Perhaps both.`,
  abstract: 'A unified theory of alchemy attempting to synthesize all alchemical knowledge into a coherent philosophical and practical framework.',
  estimatedReadingTime: 500,
  authoringDifficulty: 5
};

export const ALCHEMY_PAPERS = [
  // Basic Alchemy (9 papers)
  SUBSTANCE_IDENTIFICATION,
  EXTRACTION_METHODS,
  MIXTURE_THEORY,
  CRYSTALLIZATION_METHODS,
  SUBLIMATION_TECHNIQUES,
  SOLUTION_PREPARATION,
  PRECIPITATION_REACTIONS,
  SOLUBILITY_PRINCIPLES,
  LABORATORY_SAFETY,
  // Advanced Alchemy (9 papers)
  POTION_FORMULATION,
  TRANSMUTATION_PRINCIPLES,
  TINCTURE_PREPARATION,
  MEDICINAL_HERBS,
  POISON_RECOGNITION,
  ANTIDOTE_FORMULATION,
  DISTILLATION_CYCLES,
  SPECIFIC_GRAVITY,
  GRAND_ALCHEMY
];
