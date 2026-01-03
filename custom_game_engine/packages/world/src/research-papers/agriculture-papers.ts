import type { ResearchPaper } from './types.js';

/**
 * Agricultural Research Papers
 *
 * These papers form the knowledge tree for agricultural advancement,
 * from basic seed selection to advanced greenhouse cultivation.
 */

export const SEED_SELECTION: ResearchPaper = {
  paperId: 'seed_selection',
  title: 'On the Observation of Seed Quality and Selection',
  field: 'agriculture',
  paperSets: ['basic_agriculture'],
  prerequisitePapers: [],
  complexity: 2, // Simple foundational knowledge
  minimumAge: 'teen',
  skillGrants: { agriculture: 5 },
  contributesTo: [
    { type: 'building', buildingId: 'farm_plot' },
    { type: 'ability', abilityId: 'plant_seeds' }
  ],
  description: `A foundational treatise on the art of choosing seeds that will actually grow, as opposed to the ones that won't*. The author makes several groundbreaking observations, including: larger seeds tend to be better than smaller ones**, seeds should not be eaten before planting***, and planting seeds in soil works better than leaving them in a sack****.

*This may seem obvious to the modern farmer, but in earlier times the distinction was not well understood. Historical records indicate that approximately 40% of early agricultural failures were due to attempting to plant rocks, small pebbles, or in one notable case, dried beans that had already been cooked†.

**The Great Seed Size Debates of the Third Agricultural Congress lasted seven years and resulted in three fistfights, two duels, and the founding of the Gradualist School of Seed Theory, which maintained that seed size existed on a spectrum and that rigid categorization was reductionist.

***See also: "Why We Can't Have Nice Things: A History of Impulse Control in Agricultural Development"

****The case of Farmer Grundlethorp, who stored seeds in his left boot "for safekeeping" and then wondered why his field produced nothing but a faint smell of feet, is covered extensively in Chapter 7.

†The bean incident is not discussed in polite agricultural circles.`,
  abstract: 'The basic principles of seed selection, storage, and the fundamental observation that viable seeds are necessary for successful farming.',
  published: false,
  tier: 1, // Legacy
  technologyTags: ['agriculture_i'] // Legacy
};

export const SOIL_PREPARATION: ResearchPaper = {
  paperId: 'soil_preparation',
  title: 'The Groundwork: An Investigation into Soil Composition and Preparation',
  field: 'agriculture',
  paperSets: ['basic_agriculture'],
  prerequisitePapers: [],
  complexity: 2,
  minimumAge: 'teen',
  skillGrants: { agriculture: 5 },
  contributesTo: [
    { type: 'crop', cropId: 'wheat' },
    { type: 'crop', cropId: 'carrot' }
  ],
  description: `A comprehensive guide to the preparation of soil, written by someone who clearly spent too much time thinking about dirt*. The work establishes that soil is not, as previously believed, "just dirt," but rather a complex mixture of minerals, organic matter, tiny rocks, smaller rocks, fragments of formerly-larger rocks**, and an alarming number of insects***.

The author introduces the revolutionary concept that different plants prefer different soil conditions†, and that one cannot simply throw seeds at the ground and hope for the best††. The treatise includes detailed instructions on tilling, composting, and the proper way to argue with rocks that refuse to move†††.

*The author, known only as "The Soil Whisperer," reportedly wrote this work while living in a hole. Whether this was for research purposes or due to being unable to afford housing is a matter of historical debate.

**The paper includes a seventeen-page digression on the philosophical question: "At what point does a rock become soil?" This section is widely considered skippable, except by petromantic philosophers.

***An entire appendix is devoted to worms. It is titled "Our Squirming Friends and Why They Matter." Reader discretion advised.

†This was considered heretical by the Universal Soil Theory school, which maintained that all soil was fundamentally identical and that plant preference was "in their heads."

††Although many farmers continue to try this method with limited success.

†††Rock-arguing is now considered an advanced technique and is covered in "Geological Persuasion: A Farmer's Guide to Stubborn Stones" (Tier 3).`,
  abstract: 'The nature of soil, its composition, preparation techniques, and the importance of matching soil conditions to crop requirements.',
  published: false,
  tier: 1, // Legacy
  technologyTags: ['agriculture_i'] // Legacy
};

export const IRRIGATION_PRINCIPLES: ResearchPaper = {
  paperId: 'irrigation_principles',
  title: 'Water Moving Theory: Or, How to Get Water from There to Here',
  field: 'agriculture',
  paperSets: ['basic_agriculture'],
  prerequisitePapers: ['seed_selection', 'soil_preparation'],
  complexity: 4,
  minimumAge: 'teen',
  minimumSkills: { agriculture: 10 },
  skillGrants: { agriculture: 10 },
  contributesTo: [
    { type: 'building', buildingId: 'irrigation_system' }
  ],
  description: `An examination of the movement of water, written in remarkably simple language considering the author held three doctorates and a very impressive beard*. The central thesis is elegantly stated: "Water flows downhill**."

From this profound observation, the author constructs an entire system of agricultural water management, including channels, ditches, and the strategic placement of buckets***. The work includes practical diagrams† and several case studies of irrigation systems that worked, as well as a much longer section on irrigation systems that didn't††.

Of particular note is Chapter 11: "On the Folly of Uphill Irrigation"†††, which documents seventeen separate attempts to make water flow upward using nothing but optimism and poor planning.

*The beard was measured at three feet in length and was said to contain several farming implements, two birds' nests, and the solution to a moderately complex mathematical problem.

**This principle, while obvious to any three-year-old who has spilled a drink, apparently eluded agricultural theorists for centuries. The author received a medal for this observation.

***The Strategic Bucket Placement Theory is now a cornerstone of agricultural engineering, despite its humble origins.

†The diagrams are actually useful, which is rare for academic agricultural papers of this period. Most diagrams from this era appear to have been drawn by someone who had never seen a field, or possibly a pencil.

††This section is three times longer than the success section, leading to the academic proverb: "We learn more from failure, but mostly because there's more of it."

†††Spoiler: It doesn't work. But some of the attempts were quite creative, including the Bucket Brigade Method, the Prayer-Based Approach, and the infamous Trebuchet Incident of '47.`,
  abstract: 'The fundamental principles of water movement and practical techniques for directing water to where crops need it.',
  published: false,
  tier: 2, // Legacy
  technologyTags: ['agriculture_ii'] // Legacy
};

export const FERTILIZATION_THEORY: ResearchPaper = {
  paperId: 'fertilization_theory',
  title: 'Enrichment of the Earth: A Study of Fertilization and Nutrients',
  field: 'agriculture',
  paperSets: ['basic_agriculture'],
  prerequisitePapers: ['soil_preparation'],
  complexity: 4,
  minimumAge: 'teen',
  minimumSkills: { agriculture: 10 },
  skillGrants: { agriculture: 10, nature: 5 },
  contributesTo: [
    { type: 'item', itemId: 'fertilizer' },
    { type: 'crop', cropId: 'tomato' }
  ],
  description: `A surprisingly frank discussion of how one takes things that were formerly food and returns them to the soil to make more food*. The author navigates this delicate topic with admirable tact**, referring to manure as "organic soil enrichment" and compost as "time-delayed nutritional reintroduction."

The paper establishes the Cycle of Return***: that what comes from the earth must return to it, and that this process is both inevitable and useful***. The author introduces the concept of "nutrient banking" - the idea that one can store fertility in the soil for future use†.

Special attention is given to the art of composting, which the author describes as "controlled rotting for the purposes of good"††. The chemical processes involved are explained in remarkable detail, considering chemistry hadn't been properly invented yet†††.

*The philosophical implications of this cycle occupied theologians for decades. Some argued it proved the universe was fundamentally circular. Others said it just proved everything eventually turned into dirt. Both groups were probably right.

**This tact was notably absent from earlier agricultural works, such as the infamous "Shit Makes Flowers Grow: The Brown Truth" which was considered too direct for academic circles.

***Also known as "The Circle of Agricultural Life," "The Great Nutrient Wheel," and "That Thing We Don't Talk About at Dinner."

****The author notes that trying to fight this cycle is "possible, but inadvisable and ultimately futile." See: The Eternal Granary Incident, in which Baron Hoothfurt attempted to store grain indefinitely and instead created a smell that lingered for generations.

†This is not to be confused with regular banking, which stores money. Though some farmers argued that fertility was more valuable than coin, leading to several failed attempts to pay taxes in compost.

††As opposed to "uncontrolled rotting for the purposes of evil," which is what happens when you forget about vegetables in the back of the cellar.

†††The author's explanation of nitrogen fixation predates the discovery of nitrogen by forty years, leading some to suggest the work is either remarkably prescient or possibly written by a time traveler. The time travel theory is not taken seriously by respectable historians, who note that if one could travel through time, one probably wouldn't use the ability to write agricultural papers.`,
  abstract: 'The theory and practice of soil enrichment through organic matter, nutrient cycles, and composting techniques.',
  published: false,
  tier: 2, // Legacy
  technologyTags: ['agriculture_ii'] // Legacy
};

export const CROP_ROTATION: ResearchPaper = {
  paperId: 'crop_rotation',
  title: 'On Sequential Planting: The Art of Rotating Crops',
  field: 'agriculture',
  paperSets: ['basic_agriculture'],
  prerequisitePapers: ['fertilization_theory', 'soil_preparation'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { agriculture: 20 },
  skillGrants: { agriculture: 15 },
  contributesTo: [
    { type: 'ability', abilityId: 'crop_rotation' },
    { type: 'crop', cropId: 'corn' }
  ],
  description: `A methodical study of what happens when you plant different things in the same spot over multiple years*. The author's key insight - that plants are picky eaters and exhaust different nutrients from the soil - revolutionized agricultural planning**.

The work introduces the Four-Field System***, a rotation pattern so elegant that it was immediately adopted by every farmer who could count to four†. The system alternates between nitrogen-fixing crops, heavy feeders, light feeders, and fallow periods††, creating a sustainable cycle that can continue indefinitely†††.

Appendix C contains a lengthy discussion of what happens when you ignore crop rotation and plant the same thing every year‡, illustrated with case studies from the Dust Fields Incident‡‡ and the Great Grain Disaster‡‡‡.

*This seems like an obvious thing to investigate, but for centuries farmers just planted whatever they wanted wherever they wanted and then wondered why their yields kept dropping. The obvious is often the last thing people notice.

**The revolution was mostly quiet and involved a lot of thoughtful nodding. Agricultural revolutions rarely involve barricades or stirring speeches.

***Not to be confused with the Four-Field System of warfare, the Four-Field System of mathematics, or the Four-Field Tavern in Lower Muchness, which has excellent potato soup.

†Farmers who could not count to four were provided with a simplified Two-Field System, which worked almost as well and only required the ability to distinguish "this" from "that."

††A "fallow period" is when you let the field rest, which is farming language for "do nothing and pretend it's part of the plan." It turns out this works remarkably well.

†††"Indefinitely" here means "until something goes wrong," which in farming terms usually means "until the weather does something unexpected," which is to say, "every year."

‡Spoiler: Bad things happen. Very bad things. The soil becomes sad.

‡‡The Dust Fields Incident is not discussed in detail as it is considered too depressing. Suffice to say that dust fields were created where once there were grain fields, and a lot of farmers learned important lessons about humility.

‡‡‡The Great Grain Disaster was actually caused by planting too much grain in the same place for seventeen consecutive years. The disaster was named "great" not because of its scale but because one particularly optimistic chronicler thought it sounded better than "The Completely Preventable Grain Catastrophe."`,
  abstract: 'A systematic approach to crop rotation that maintains soil fertility and prevents nutrient depletion through strategic sequential planting.',
  published: false,
  tier: 3, // Legacy
  technologyTags: ['agriculture_iii'] // Legacy
};

export const CLIMATE_CONTROL: ResearchPaper = {
  paperId: 'climate_control',
  title: 'On Artificial Climates: The Greenhouse Principle',
  field: 'agriculture',
  paperSets: ['basic_agriculture'],
  prerequisitePapers: ['irrigation_principles', 'crop_rotation'],
  complexity: 8,
  minimumAge: 'adult',
  minimumSkills: { agriculture: 30, construction: 10 },
  skillGrants: { agriculture: 20, construction: 10 },
  contributesTo: [
    { type: 'building', buildingId: 'greenhouse' }
  ],
  description: `A revolutionary work proposing that one need not accept the weather's tyranny*, but can instead create one's own personal weather inside a building**. The author's central insight - that glass panels can trap heat while allowing light*** - laid the foundation for greenhouse technology.

The paper includes detailed architectural plans† for structures that maintain warm temperatures even in cold seasons, along with ventilation systems to prevent the "cooking effect"††. Special attention is given to humidity management†††, which the author describes as "the difference between a garden and a swamp."

Chapter 8, "Why You Cannot Grow Tropical Mangoes in a Snow Field Without Help," is considered both enlightening and slightly condescending‡.

*Weather's tyranny is a common theme in agricultural literature. Weather is frequently depicted as a capricious deity, an unreliable friend, or in one particularly bitter work, "that absolute bastard in the sky."

**This is essentially the definition of a greenhouse, though the author takes 200 pages to get there. Academic papers of this period were paid by the word.

***The glass industry experienced a significant boom following publication of this paper. The Window Makers' Guild sent the author a commemorative plaque made of glass, which arrived in several pieces.

†The plans are actually quite good, though they assume access to more glass than most farming communities possessed. One reviewer noted: "Excellent theory, expensive practice."

††The "cooking effect" refers to what happens when you make a greenhouse with no ventilation. The plants die, but you get a nice sauna. Several early greenhouse experimenters accidentally invented the spa industry.

†††Humidity management turned out to be much harder than temperature management. One experimental greenhouse in the Wetlands Territories achieved perfect temperature control but transformed into what witnesses described as "an aggressively moist environment" and "basically a rain forest, but angry."

‡The author's tone throughout this chapter suggests they once got into an argument with someone who insisted tropical fruits would grow anywhere "with enough determination." This argument clearly left scars.`,
  abstract: 'The principles of enclosed growing environments, heat retention, and artificial climate creation for year-round cultivation.',
  published: false,
  tier: 4, // Legacy
  technologyTags: ['greenhouse_cultivation'] // Legacy
};

export const YEAR_ROUND_GROWING: ResearchPaper = {
  paperId: 'year_round_growing',
  title: 'Perpetual Harvest: Methods for Continuous Crop Production',
  field: 'agriculture',
  paperSets: ['basic_agriculture'],
  prerequisitePapers: ['climate_control', 'fertilization_theory'],
  complexity: 9,
  minimumAge: 'adult',
  minimumSkills: { agriculture: 35 },
  skillGrants: { agriculture: 25 },
  contributesTo: [
    { type: 'ability', abilityId: 'year_round_farming' },
    { type: 'crop', cropId: 'tropical_fruit' }
  ],
  description: `The culmination of agricultural science, this work presents a complete system for producing crops throughout all seasons*. The author synthesizes climate control, advanced fertilization, and strategic planning into what they call "The Eternal Growing Method"**.

The paper introduces succession planting*** - the practice of planting new crops before old ones are harvested, creating a continuous pipeline of food production. Combined with greenhouse technology, this allows for harvests even in the depths of winter†, leading to what the author dramatically calls "Freedom from the Tyranny of Seasons"††.

A significant portion of the work addresses the psychological impact of year-round farming†††, noting that farmers accustomed to winter rest periods may experience what the author terms "confused exhaustion syndrome"‡.

*Previous attempts at year-round growing mostly involved moving to warmer climates, which technically works but misses the point.

**Not to be confused with "The Eternal Growing Method" proposed by the Optimistic Farmers' Guild, which involved wishful thinking and prayer. That method is not peer-reviewed.

***Also called "successive planting," "rolling planting," or "that thing where you never get a break." The terminology varies by region and level of farmer exhaustion.

†Winter harvests were previously thought impossible, except for certain root vegetables and ice. The discovery that one could grow tomatoes in winter was met with suspicion, celebration, and several accusations of witchcraft.

††The weather did not appreciate being called tyrannical and responded with several freak storms. Meteorological historians note this was probably coincidental, but farmers remain skeptical of insulting the sky.

†††The psychological impact turned out to be significant. Rest periods exist for a reason. Several greenhouse farmers had to be reminded that continuous productivity was optional, not mandatory.

‡Symptoms include staring blankly at growing plants in winter, muttering "this isn't natural," and an irrational desire to hibernate. The condition is treatable with rest, which most farmers refuse to take.`,
  abstract: 'Advanced techniques for maintaining continuous crop production across all seasons through succession planting and controlled environments.',
  published: false,
  tier: 4, // Legacy
  technologyTags: ['greenhouse_cultivation'] // Legacy
};

export const AGRICULTURE_PAPERS = [
  SEED_SELECTION,
  SOIL_PREPARATION,
  IRRIGATION_PRINCIPLES,
  FERTILIZATION_THEORY,
  CROP_ROTATION,
  CLIMATE_CONTROL,
  YEAR_ROUND_GROWING
];
