import type { ResearchPaper } from './types.js';

/**
 * Metallurgical Research Papers
 *
 * The knowledge tree for working with metals, from basic ore identification
 * to advanced steel forging and beyond.
 */

export const ORE_IDENTIFICATION: ResearchPaper = {
  paperId: 'ore_identification',
  title: 'On the Nature of Ores: Which Rocks Are Actually Useful',
  field: 'metallurgy',
  paperSets: ['basic_metallurgy'],
  prerequisitePapers: [],
  complexity: 2,
  minimumAge: 'teen',
  skillGrants: { metallurgy: 5, nature: 3 },
  contributesTo: [
    { type: 'building', buildingId: 'furnace' }
  ],
  published: false,
  tier: 1, // Legacy
  technologyTags: ['basic_metallurgy'], // Legacy
  description: `A foundational text that answers the age-old question: "Which rocks have metal in them?"* The author, clearly frustrated by years of watching people mine the wrong rocks**, provides detailed identification criteria including color, weight, luster, and the "spark test"***.

The work contains extensive illustrations† of various ore types, along with helpful notes such as "This one is iron ore" and "This one is just a rock, please stop trying to smelt it"††. A particularly useful appendix lists "Rocks That Look Like They Should Have Metal But Don't"†††, which runs to forty pages.

Chapter 5, "On the Disappointment of Pyrite," is considered a masterpiece of restrained bitterness‡.

*Spoiler: Not many. Most rocks are just rocks and will remain rocks no matter how hard you hit them with hammers.

**Historical records suggest the author once spent three weeks attempting to extract metal from limestone before writing this paper. The paper is dedicated "To everyone who told me it would work eventually." The dedication is widely believed to be sarcastic.

***The spark test involves hitting a rock with another rock (specifically, flint) and observing the sparks. This is not to be confused with the "spark of genius," which is unrelated to rocks.

†The illustrations were drawn from life, meaning the author spent considerable time staring at rocks. This explains a lot about metallurgists.

††This note appears seventeen times throughout the text, suggesting the author encountered this problem frequently.

†††Including fool's gold, iron pyrite, copper pyrite, and several other rocks that "looked promising but were just being jerks about it" (author's words, not edited for publication despite peer review suggestions).

‡The author notes that pyrite has "fooled better people than you" and that "falling for its tricks is nothing to be ashamed of, though perhaps something to be learned from." The author then spends six pages describing their own history of being fooled by pyrite. It's unclear if this is meant to be comforting.`,
  abstract: 'A comprehensive guide to identifying metal-bearing ores and distinguishing them from common rocks.',
  estimatedReadingTime: 100,
  authoringDifficulty: 1
};

export const SMELTING_FUNDAMENTALS: ResearchPaper = {
  paperId: 'smelting_fundamentals',
  title: 'Smelting Basics: Or, How to Make Rocks Sweat Metal',
  field: 'metallurgy',
  paperSets: ['basic_metallurgy'],
  prerequisitePapers: [],
  complexity: 3,
  minimumAge: 'teen',
  skillGrants: { metallurgy: 5 },
  contributesTo: [
    { type: 'building', buildingId: 'smithy' },
    { type: 'ability', abilityId: 'smelt_ore' }
  ],
  published: false,
  tier: 1, // Legacy
  technologyTags: ['basic_metallurgy'], // Legacy
  description: `An admirably straightforward treatise on the art of convincing metal to leave its rocky home*. The central thesis is elegantly simple: "Get it very hot, then hit it**."

The author outlines the construction of basic furnaces***, the importance of maintaining consistent temperature†, and the role of flux in separating metal from impurities††. The work is notable for its practical approach, including a chapter titled "Things That Will Catch Fire: A Comprehensive List"†††, which proved surprisingly useful.

Safety considerations are addressed in an appendix that mostly consists of "Don't touch that" and "Seriously, it's very hot"‡.

*Metal does not actually live in rocks by choice. This is a common misconception. Metal is trapped in rocks and is generally quite eager to leave, given sufficient heat and encouragement.

**This is a simplification, but only slightly. Advanced metallurgy mostly involves getting things even hotter and hitting them more precisely.

***The author's furnace designs are practical but optimistic about available materials. One review noted: "Excellent plans, assuming you have access to fire-resistant bricks, which you probably don't."

†"Consistent" here is defined as "very hot, all the time." Variations in temperature produce variations in results, ranging from "acceptable" to "explosion."

††Flux is a substance that helps separate metal from rock waste. The author describes it as "a helper that costs money but saves time," which is the most economical thing ever written about flux.

†††The list is comprehensive to the point of paranoia. It includes obvious entries like "wood" and "cloth," but also "your apprentice's hair" and "that old manuscript you meant to file." One suspects the author learned these through experience.

‡The full safety appendix consists of seven pages that essentially repeat "hot things are hot" in various increasingly desperate phrasings. The author clearly trained many inattentive apprentices.`,
  abstract: 'The fundamental principles of extracting metal from ore through controlled heating and basic furnace operation.',
  estimatedReadingTime: 100,
  authoringDifficulty: 1
};

export const IRON_WORKING: ResearchPaper = {
  paperId: 'iron_working',
  title: 'The Iron Treatise: Working with the Common Metal',
  field: 'metallurgy',
  paperSets: ['basic_metallurgy'],
  prerequisitePapers: ['ore_identification', 'smelting_fundamentals'],
  complexity: 4,
  minimumAge: 'teen',
  minimumSkills: { metallurgy: 10 },
  skillGrants: { metallurgy: 10 },
  contributesTo: [
    { type: 'item', itemId: 'iron_ingot' },
    { type: 'item', itemId: 'iron_tools' },
    { type: 'ability', abilityId: 'craft_iron' }
  ],
  published: false,
  tier: 2, // Legacy
  technologyTags: ['basic_metallurgy', 'steel_forging'], // Legacy
  description: `A comprehensive manual on iron, described by the author as "the workhorse of metals*." The paper covers iron's extraction, working, and properties in exhaustive detail**, including its tendency to rust***  and its remarkable willingness to be shaped when hot†.

The work introduces fundamental forging techniques: heating, hammering, and the art of knowing when to stop hammering††. Special attention is given to temperature judgment†††, with the author providing a helpful color chart‡ that has become standard in smithies worldwide.

Chapter 12, "On the Philosophical Differences Between Iron and Steel," foreshadows later developments in metallurgical theory while also starting several academic feuds‡‡.

*Not to be confused with actual horses, which are made of meat, not metal. This metaphor confused several early readers who attempted to feed their iron tools.

**Some reviewers argued it was *too* exhaustive, with one noting: "I now know more about iron than I ever wanted to know, and I am an iron smith."

***The author presents rust as "iron's greatest character flaw" and devotes considerable space to anti-rust measures, most of which involve coating the iron in something else. The tone suggests personal frustration with rust.

†The author notes that iron "is remarkably stubborn when cold and remarkably cooperative when hot, much like my brother-in-law." This aside is the paper's only personal reference and has spawned considerable speculation about the brother-in-law in question.

††Knowing when to stop is described as "the difference between a sword and a flat piece of ruined metal." The author provides guidelines but admits "you'll probably ruin a few before you get the feel for it."

†††Temperature judgment is described as "part science, part art, part guess-work." The color chart helped considerably with the science part, though artistry and guessing remain important.

‡The chart ranges from "black (too cold)" through "cherry red (getting there)" to "white (too hot, you've gone too far, stop heating it)." Its simplicity is its genius.

‡‡The feuds were not violent but involved a great deal of aggressive paper-writing. Scholars were still publishing rebuttals seventy years later, long after everyone else stopped caring.`,
  abstract: 'Comprehensive techniques for working with iron, including forging, temperature control, and basic ironworking principles.',
  estimatedReadingTime: 200,
  authoringDifficulty: 2
};

export const MINING_TECHNIQUES: ResearchPaper = {
  paperId: 'mining_techniques',
  title: 'Practical Mining: Or, How to Extract Ore Without the Mine Extracting You',
  field: 'metallurgy',
  paperSets: ['basic_metallurgy'],
  prerequisitePapers: ['ore_identification'],
  complexity: 3,
  minimumAge: 'teen',
  skillGrants: { metallurgy: 5, construction: 3 },
  contributesTo: [
    { type: 'building', buildingId: 'mine' }
  ],
  published: false,
  tier: 1, // Legacy
  technologyTags: ['basic_metallurgy'], // Legacy
  description: `A comprehensive guide to removing rocks from the earth without the earth taking offense*, written by someone with extensive personal experience with cave-ins**. The work covers shaft construction, tunnel bracing, and the critical art of knowing when to stop digging***.

The author introduces the Three Rules of Mining:† 1) Always know where the ceiling is††, 2) Rock falls down†††, 3) If you hear creaking, you're already too late‡.

Chapter 6, "Ventilation: Why Fresh Air Matters When You're Underground," reads like a horror story but contains valuable practical advice‡‡.

*The earth takes offense frequently and expresses it through collapses. The author documents seventeen separate incidents of "geological disagreement" that resulted in miners becoming temporarily trapped.

**The author's experience with cave-ins is described as "extensive and unwanted." A later chapter implies they were trapped underground for three days, during which they had plenty of time to think about proper tunnel support.

***The correct answer is usually "sooner than you think." Many mining disasters stem from the optimistic belief that "just a little more" won't cause structural failure. It usually does.

†These rules are listed in order of importance. The first rule is philosophical. The second is physical law. The third is a prayer.

††Surprisingly difficult in the dark. Many miners have reached up to check and found nothing, which is either because the ceiling is very high or because they're about to have a bad day.

†††This seems obvious but apparently needed to be written down. Several mining accidents were caused by people placing heavy things on unstable surfaces and being surprised by gravity.

‡The creaking sound is the rock's way of saying "I'm about to move." By the time you hear it, the physics are already in motion. The best response is to not be there, which requires having left earlier.

‡‡The horror elements are unintentional. The author simply describes what happens when you don't have ventilation: suffocation, gas buildup, candles going out mysteriously (lack of oxygen), and "the deep exhaustion" (carbon dioxide poisoning). It's educational and terrifying.`,
  abstract: 'Safe and efficient methods for extracting ore from the earth, including shaft construction, support systems, and hazard avoidance.',
  estimatedReadingTime: 150,
  authoringDifficulty: 2
};

export const FORGE_CONSTRUCTION: ResearchPaper = {
  paperId: 'forge_construction',
  title: 'Building the Heart of the Smithy: Forge Design and Construction',
  field: 'metallurgy',
  paperSets: ['basic_metallurgy'],
  prerequisitePapers: [],
  complexity: 2,
  minimumAge: 'teen',
  skillGrants: { metallurgy: 5, construction: 5 },
  contributesTo: [
    { type: 'building', buildingId: 'forge' }
  ],
  published: false,
  tier: 1, // Legacy
  technologyTags: ['basic_metallurgy'], // Legacy
  description: `An exhaustive manual on constructing a forge that won't explode, burn down your workshop, or simply refuse to get hot enough*. The author, a master smith with an apparent history of forge-related disasters**, provides detailed specifications for every component.

The work emphasizes the importance of proper materials***: fire-resistant bricks† (not regular bricks††), adequate ventilation†††, and a robust base‡ capable of supporting considerable weight and heat.

A significant portion addresses common construction errors‡‡, organized by severity from "inefficient" to "potentially fatal."

*These three failure modes account for approximately 90% of poor forge designs. The remaining 10% is "other," which includes exotic failures like "melted through the floor" and "achieved spontaneous deconstruction."

**The author's workshop burned down twice before this paper was written, suggesting a learning curve. To their credit, the third forge worked perfectly and has operated for forty years without incident.

***Material choice is critical. Using incorrect materials results in forge failure, which ranges from disappointing to catastrophic depending on what's being heated at the time.

†Fire-resistant bricks are made from fireclay and can withstand extreme temperatures. They cost more than regular bricks, which leads some to attempt substitution. This never works.

††Regular bricks explode when subjected to forging temperatures. The author includes a detailed footnote explaining the physics of thermal expansion and steam pressure, concluding: "Just buy the right bricks."

†††Inadequate ventilation leads to smoke inhalation, which the author describes as "unpleasant, dangerous, and embarrassing when you pass out in front of your apprentices."

‡The author recommends a stone or reinforced brick base. Wood is specifically mentioned as "inadvisable" with fourteen exclamation points, suggesting personal experience.

‡‡The section on errors reads like a catalog of historical smithing failures. One entry: "Master Ironhand's forge, which was built in his wooden workshop on a wooden floor using regular bricks. It lasted three hours." The fate of Master Ironhand is not mentioned, possibly out of respect.`,
  abstract: 'Complete specifications for constructing a functional forge including materials, dimensions, ventilation, and safety considerations.',
  estimatedReadingTime: 120,
  authoringDifficulty: 1
};

export const BELLOWS_OPERATION: ResearchPaper = {
  paperId: 'bellows_operation',
  title: 'The Breath of the Forge: Principles of Bellows and Air Flow',
  field: 'metallurgy',
  paperSets: ['basic_metallurgy'],
  prerequisitePapers: ['forge_construction'],
  complexity: 3,
  minimumAge: 'teen',
  skillGrants: { metallurgy: 6 },
  contributesTo: [
    { type: 'ability', abilityId: 'maintain_forge_heat' }
  ],
  published: false,
  tier: 1, // Legacy
  technologyTags: ['basic_metallurgy'], // Legacy
  description: `A surprisingly passionate treatise on the art of pumping air into fire*, arguing that bellows operation is the difference between "smith" and "person standing near hot metal"**. The author demonstrates that consistent air flow creates consistent temperature, which creates consistent results***.

The work distinguishes between hand bellows (portable, weak) and foot bellows (stationary, powerful)†, providing diagrams and operational techniques for both††. Special emphasis on the rhythm of pumping†††, which the author compares to breathing‡.

Chapter 8, "Why Your Arms Hurt: The Physical Demands of Smith Work," is simultaneously educational and dispiriting‡‡.

*Fire needs oxygen. More oxygen equals hotter fire. This seems simple but the practical application requires skill, timing, and upper body strength.

**The second category may be standing near hot metal, but they're not doing anything productive with it. The author is quite firm on this distinction.

***Inconsistent heat causes inconsistent results: sometimes the metal is too cold (won't forge), sometimes too hot (burns or becomes brittle), rarely just right (brief celebration before temperature changes again).

†Foot bellows allow the smith to use their hands for other tasks while maintaining air flow. This is described as "revolutionary" though foot bellows had existed for centuries. The author means revolutionary for apprentices who only knew hand bellows.

††The diagrams are actually helpful, showing proper stance, angle, and timing. One shows the "incorrect" method with a figure hunched over in evident discomfort.

†††The rhythm must match the forge's needs: slow and steady for maintaining temperature, quick bursts for rapid heating. Developing this intuition takes practice, which the author estimates at "several hundred hours of your arms hurting."

‡"Breathing but more aggressive and directed at making things hotter." This metaphor appears frequently and starts to make sense after a while.

‡‡The chapter essentially says: "Your arms will hurt. Then they'll hurt more. Eventually they'll stop hurting because you'll develop muscles or give up smithing. Most choose the latter." Encouraging!`,
  abstract: 'Techniques for operating bellows to maintain consistent forge temperature through proper air flow management.',
  estimatedReadingTime: 100,
  authoringDifficulty: 1
};

export const TOOL_MAINTENANCE: ResearchPaper = {
  paperId: 'tool_maintenance',
  title: 'Care of the Smith\'s Arsenal: Maintenance of Hammers, Tongs, and Anvils',
  field: 'metallurgy',
  paperSets: ['basic_metallurgy'],
  prerequisitePapers: ['iron_working'],
  complexity: 2,
  minimumAge: 'teen',
  skillGrants: { metallurgy: 4, crafting: 4 },
  contributesTo: [
    { type: 'item', itemId: 'smithing_tools' }
  ],
  published: false,
  tier: 1, // Legacy
  technologyTags: ['basic_metallurgy'], // Legacy
  description: `An unexpectedly philosophical work on the maintenance of tools that maintain other tools*. The author argues that a smith is only as good as their equipment, and equipment is only as good as its maintenance**.

The work covers hammer head attachment*** (preventing the head from flying off mid-swing†), tong alignment†† (ensuring you grip metal, not air†††), and anvil care‡ (treating your anvil with the respect it deserves‡‡).

The final chapter, "On the Relationship Between Smith and Tool," borders on mysticism but contains practical wisdom about developing intuitive understanding of your equipment.

*This recursive relationship bothers philosophers. Smiths, being practical people, are unbothered and simply maintain their tools.

**A master smith with poorly maintained tools produces poor work. An apprentice with well-maintained tools produces... less poor work. The tools help, but skill matters more. However, skill without tools produces nothing.

***Hammer heads are attached to handles with wedges, friction, and hope. Over time, the hope diminishes and the head loosens. The author provides detailed re-attachment instructions involving new wedges and soaking the handle in water.

†A flying hammer head is dangerous to everyone nearby and embarrassing to the smith. The author recounts an incident where a loose hammer head flew across the workshop and embedded itself in a wooden beam, where it remained as a "lesson in proper maintenance."

††Misaligned tongs slip when gripping hot metal, causing the metal to fall. If you're lucky, it falls on the floor. If you're unlucky, it falls on your foot. The author strongly recommends not being unlucky.

†††Air gripping is ineffective for smithing. The author notes this should be obvious but apparently needs stating.

‡Anvil care involves keeping the surface clean, flat, and undamaged. Hitting the anvil face with a hammer is specifically forbidden, yet apprentices do it constantly "to hear the ring." The author's frustration with this practice is palpable.

‡‡Respect includes not using the anvil as a table, not letting it rust, and not dropping heavy objects on it. "Your anvil will outlive you, your children, and your grandchildren if properly maintained. Show some appreciation."`,
  abstract: 'Comprehensive guide to maintaining smithing tools including hammers, tongs, anvils, and chisels.',
  estimatedReadingTime: 110,
  authoringDifficulty: 1
};

export const ORE_GRADING: ResearchPaper = {
  paperId: 'ore_grading',
  title: 'Quality Assessment: Distinguishing Rich Ore from Expensive Rocks',
  field: 'metallurgy',
  paperSets: ['basic_metallurgy'],
  prerequisitePapers: ['ore_identification', 'smelting_fundamentals'],
  complexity: 4,
  minimumAge: 'teen',
  minimumSkills: { metallurgy: 8 },
  skillGrants: { metallurgy: 8, nature: 3 },
  contributesTo: [
    { type: 'ability', abilityId: 'assess_ore_quality' }
  ],
  published: false,
  tier: 2, // Legacy
  technologyTags: ['basic_metallurgy'], // Legacy
  description: `A practical guide to determining ore quality before investing significant time and fuel in smelting*. The author, clearly traumatized by past experiences**, provides methods for estimating metal content without actually smelting the entire ore sample.

The work introduces the concept of "ore yield"*** - the ratio of usable metal to total ore weight. High-grade ore might yield 60% metal†, while low-grade ore produces 10% or less††, with the remainder being worthless slag†††.

Testing methods include visual inspection, weight comparison, small-scale test smelting‡, and the controversial "taste test"‡‡ (not recommended).

*Smelting poor ore wastes charcoal, time, and hope. The author estimates that proper ore grading can improve smithing efficiency by "somewhere between significant and dramatic."

**The author mentions spending three days smelting what turned out to be "essentially decorative rock." The experience is described as "character building" in a tone suggesting trauma.

***Also called "metal content" or "how much of this rock is actually useful." The terminology varies by region, but the frustration of discovering low-grade ore is universal.

†High-grade ore is rare, valuable, and causes conflicts between miners, smiths, and whoever owns the land. The author includes a footnote about ore theft that is surprisingly detailed and possibly autobiographical.

††Low-grade ore isn't worthless but requires more ore to produce the same metal amount. Economic viability depends on ore availability, fuel cost, and patience.

†††Slag is useful for some purposes (road building, fill material) but those purposes are "not smithing." The author suggests giving slag to construction workers, who apparently appreciate it more.

‡Small-scale test smelting involves heating a small ore sample to estimate yield. This wastes a small amount of fuel to potentially save wasting a large amount of fuel, which the author calls "investment in information."

‡‡The taste test involves licking the ore. Different ores taste different, apparently. The author mentions this method was taught by their mentor, then immediately advises against it, noting: "Some ores are poisonous. I learned this after trying the taste test. Don't be like me."`,
  abstract: 'Methods for assessing ore quality and metal content before smelting, including visual inspection and test smelting.',
  estimatedReadingTime: 140,
  authoringDifficulty: 2
};

export const SLAG_MANAGEMENT: ResearchPaper = {
  paperId: 'slag_management',
  title: 'Waste Not: The Handling and Disposal of Smelting Byproducts',
  field: 'metallurgy',
  paperSets: ['basic_metallurgy'],
  prerequisitePapers: ['smelting_fundamentals'],
  complexity: 2,
  minimumAge: 'teen',
  skillGrants: { metallurgy: 4 },
  contributesTo: [
    { type: 'ability', abilityId: 'process_ore_efficiently' }
  ],
  published: false,
  tier: 1, // Legacy
  technologyTags: ['basic_metallurgy'], // Legacy
  description: `A surprisingly comprehensive treatise on dealing with the stuff that isn't metal*. The author, writing from a smithy apparently buried in slag**, provides practical methods for handling, disposing, and potentially repurposing smelting waste.

The central insight: slag accumulates faster than anticipated***. A smith producing one ingot per day generates approximately three to five times that weight in slag†. Over months, this creates a "geological formation of disappointment"†† (author's exact words).

The work covers separation techniques††† (removing slag while it's still liquid‡), safe cooling methods‡‡, and storage solutions for smithies not blessed with infinite yard space.

*Slag is everything that isn't metal: rock, dirt, impurities, broken dreams. It emerges from smelting as a liquid, cools into a solid, and exists primarily to be in the way.

**The author mentions a slag pile "of considerable size" blocking their workshop door. The paper may have been written while trapped inside, unable to leave until the slag was moved.

***"Faster than anticipated" is metallurgist code for "I have made a terrible miscalculation and now have a slag problem." The author documents their transition from "slag is manageable" to "slag is my life now" over eighteen months.

†The mathematics: one unit of ore produces one part metal and three to five parts slag. Multiple this by daily production, then monthly, then yearly. The numbers become distressing quickly.

††Some smithies have existed for generations, their slag piles achieving geological significance. One footnote mentions a slag pile used as a landmark: "Turn left at the Iron Mountain, though it's actually slag."

†††Separating slag while liquid requires careful pouring to let the lighter slag float off while the heavier metal stays in the crucible. This is harder than it sounds and requires practice.

‡Liquid slag is orange-hot and flows like angry honey. It's beautiful from a distance and terrifying up close. Removing it requires long tools, steady hands, and acceptance of occasional burns.

‡‡Cooling slag improperly causes cracking, explosion, or toxic fumes. The author provides a detailed protocol: let it cool slowly, keep water away (steam explosions), and ventilate well (fumes).`,
  abstract: 'Practical methods for handling, disposing, and repurposing smelting waste and slag.',
  estimatedReadingTime: 100,
  authoringDifficulty: 1
};

export const CARBON_INFUSION: ResearchPaper = {
  paperId: 'carbon_infusion',
  title: 'The Role of Carbon in Steel Formation',
  field: 'metallurgy',
  paperSets: ['advanced_metallurgy'],
  prerequisitePapers: ['iron_working'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { metallurgy: 20 },
  skillGrants: { metallurgy: 15 },
  contributesTo: [
    { type: 'item', itemId: 'steel_ingot' },
    { type: 'item', itemId: 'steel_weapons' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_metallurgy', 'steel_forging'], // Legacy
  description: `A groundbreaking work that reveals the secret ingredient in steel: burnt wood*. The author's key insight - that iron packed in charcoal and heated becomes harder and stronger - revolutionized metalworking**.

The paper meticulously documents the carbon absorption process***, explaining how carbon atoms integrate into iron's structure† and why this makes the resulting metal superior††. The optimal carbon content is established as "enough, but not too much"†††, a guideline that remains frustratingly vague but empirically useful.

Appendix D contains the famous "Charcoal Layer Experiment Results," which demonstrated that carbon penetration depth varies with temperature, time, and how much the smith was paying attention‡.

*Technically charcoal, which is burnt wood that has been burnt specially so it can be used to burn other things more effectively. The layers of burning involved confused many early metallurgists.

**The revolution was, as metallurgical revolutions tend to be, quiet and involved a lot of nodding and beard-stroking. One chronicle simply notes: "The year 437: Steel got better. No one quite knows why yet."

***The documentation is meticulous to the point of obsession. One section spends twelve pages describing the molecular structure of iron-carbon bonds, using terminology that wouldn't be invented for another three hundred years. Scholars are divided on whether this is prescient or the author was making things up and got lucky.

†The explanation involves "tiny spaces between iron bits" which is technically correct but lacks the precision of modern atomic theory. However, it's accurate enough to be useful, which is all most smiths cared about.

††"Superior" is defined as "harder, stronger, and less likely to bend when you don't want it to." This is the practical definition used by smiths, as opposed to the theoretical definition used by metallurgical philosophers, which involves twenty more adjectives.

†††This vagueness sparked the Great Carbon Content Controversy, which lasted forty years and concluded with the consensus: "Try different amounts and see what works." Science had advanced.

‡The attention-paying variable turned out to be more important than initially suspected. Distracted smiths produced inferior steel with remarkable consistency. This led to the establishment of "no talking during carbon infusion" rules in most smithies.`,
  abstract: 'The chemical and practical principles of carbon absorption in iron and its transformation into steel.',
  estimatedReadingTime: 300,
  authoringDifficulty: 3
};

export const QUENCHING_THEORY: ResearchPaper = {
  paperId: 'quenching_theory',
  title: 'Heat Treatment Methods: The Science of Quenching and Tempering',
  field: 'metallurgy',
  paperSets: ['advanced_metallurgy'],
  prerequisitePapers: ['iron_working', 'carbon_infusion'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { metallurgy: 25 },
  skillGrants: { metallurgy: 20 },
  contributesTo: [
    { type: 'item', itemId: 'steel_armor' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['steel_forging'], // Legacy
  description: `A masterwork on the art of controlled cooling*, this paper explains why dunking hot metal in cold water produces better results than letting it cool naturally**. The author's central revelation - that rapid cooling traps the metal's structure in a harder state - was met with both acceptance and skepticism***.

The work distinguishes between quenching (rapid cooling) and tempering (controlled reheating)†, comparing them to "making a decision quickly versus reconsidering it carefully"††. Various quenching media are evaluated†††, from water ("fast but violent") to oil ("slower but gentler") to the legendary "air quenching"‡ ("for when you want to feel superior to other smiths").

The paper's most controversial section addresses "differential hardening"‡‡, a technique the author describes as "advanced showing-off."

*Controlled cooling is distinguished from uncontrolled cooling by the fact that the smith is doing it on purpose, rather than by accident or laziness.

**Natural cooling was the standard method for centuries, not because it was better, but because no one had thought to try anything else. The history of metallurgy is largely the history of people saying "what if we tried this instead?"

***The skepticism came primarily from traditional smiths who had been letting things cool naturally for decades and didn't appreciate being told they'd been doing it wrong. Several refused to try quenching out of pride, then quietly adopted it later while pretending they'd thought of it themselves.

†The distinction is important: quenching makes metal very hard but brittle, like glass. Tempering makes it slightly less hard but much tougher, like... hard leather? The author struggled with analogies.

††This analogy confused several readers who wondered if the author was discussing metallurgy or life philosophy. The author later clarified they were discussing metallurgy but admitted the line was blurry.

†††The section on quenching media includes several fluids that "technically work but are inadvisable," including beer (wasteful), milk (smelly), and one smith's report of using pickle brine (results inconclusive, sword tasted odd).

‡Air quenching involves letting the metal cool in air, but doing it on purpose while looking knowledgeable. It produces inferior results to liquid quenching but superior feelings of craftsmanship.

‡‡Differential hardening involves cooling different parts of a blade at different rates, creating a hard edge and flexible spine. It's extremely difficult and mostly done to impress other smiths.`,
  abstract: 'Advanced heat treatment techniques including quenching and tempering for optimal steel properties.',
  estimatedReadingTime: 300,
  authoringDifficulty: 4
};

export const ALLOY_THEORY: ResearchPaper = {
  paperId: 'alloy_theory',
  title: 'On Metallic Combinations: The Formation of Alloys',
  field: 'metallurgy',
  paperSets: ['advanced_metallurgy'],
  prerequisitePapers: ['carbon_infusion', 'quenching_theory'],
  complexity: 8,
  minimumAge: 'adult',
  minimumSkills: { metallurgy: 30 },
  skillGrants: { metallurgy: 25 },
  contributesTo: [
    { type: 'item', itemId: 'bronze' },
    { type: 'item', itemId: 'brass' },
    { type: 'ability', abilityId: 'create_alloys' }
  ],
  published: false,
  tier: 4, // Legacy
  technologyTags: ['advanced_metallurgy', 'legendary_metals'], // Legacy
  description: `A revolutionary treatise proposing that metals can be mixed like ingredients in soup*, resulting in materials with properties different from either parent metal**. The author's experiments with tin and copper (creating bronze) serve as the primary case study***, though the work covers numerous other combinations†.

The paper establishes the principle that alloys are not merely "mixed metals" but new materials with emergent properties††. This insight led to systematic experimentation rather than the previous approach of "melt things together and see what happens"†††.

Of particular interest is the section on failed alloys‡, which is longer than the section on successful ones and includes such disasters as lead-gold ("heavy, soft, and poisonous - the worst of all worlds")‡‡.

*This analogy disturbed several metallurgists who felt it trivialized their craft. The author defended it by noting that both processes involved "combining things in a hot container and hoping for the best."

**This was not immediately obvious. Many early metallurgists assumed that mixing two metals would produce a metal with properties halfway between them. Reality is more interesting and less mathematically convenient.

***Bronze had been made for centuries before this paper, but no one had really thought about *why* it worked. The author's contribution was asking "but why though?" repeatedly until answers emerged.

†The section on gold-silver alloys (electrum) notes that it occurs naturally in some deposits, leading the author to observe that "nature invented metallurgy before we did, which is humbling."

††"Emergent properties" is the author's term for "weird things we didn't expect." For instance, bronze is harder than either copper or tin alone, which seems to violate logic but is demonstrably true.

†††The old approach produced results, but inconsistent ones. The new systematic approach produced results that were consistent, documentable, and reproducible - which made writing papers about them much easier.

‡The author notes that failed experiments teach us what *not* to do, which "is less satisfying than learning what to do but equally valuable." This optimistic take on failure was unusual for metallurgical papers of the period.

‡‡The lead-gold experiment was apparently conducted by an alchemist attempting to "improve" gold. The results improved nothing and disappointed everyone involved. The author includes it as a warning against "improvement for its own sake."`,
  abstract: 'The theory and practice of combining metals to create alloys with superior or novel properties.',
  estimatedReadingTime: 400,
  authoringDifficulty: 4
};

export const PATTERN_WELDING: ResearchPaper = {
  paperId: 'pattern_welding',
  title: 'Layered Steel: The Art of Pattern Welding',
  field: 'metallurgy',
  paperSets: ['advanced_metallurgy'],
  prerequisitePapers: ['carbon_infusion', 'iron_working'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { metallurgy: 25 },
  skillGrants: { metallurgy: 18 },
  contributesTo: [
    { type: 'item', itemId: 'pattern_welded_blade' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_metallurgy'], // Legacy
  description: `A masterwork on forging multiple layers of steel into a single blade*, creating both structural superiority and visual beauty**. The author describes pattern welding as "making the impossible: metal that is simultaneously hard and flexible, strong yet resilient."

The process involves stacking layers of different steel types***, forge-welding them together†, then folding and re-welding repeatedly††. Each fold doubles the layers: 8, 16, 32, 64, eventually reaching hundreds or thousands of impossibly thin layers†††.

The resulting patterns‡ - caused by different steels etching differently - create distinctive swirls and waves that serve as both signature and proof of quality‡‡.

*Not to be confused with regular welding, which joins two pieces. Pattern welding creates one piece from many pieces, then makes it look like one piece while acting like many pieces. It's confusing but effective.

**The beauty is incidental but appreciated. Some smiths pursue elaborate patterns, others focus on function. The author suggests doing both but admits this is "significantly harder than it sounds."

***Typically alternating hard, high-carbon steel (for edge retention) with softer, low-carbon steel (for flexibility). The combination provides benefits of both while compensating for each type's weaknesses.

†Forge welding requires heating metal to "almost too hot" and hammering vigorously. The author notes this is "technically precise yet practically vague," which characterizes much of advanced smithing.

††The folding process is labor-intensive. Each fold requires heating, hammering, and prayer. The author estimates 100-200 hours for a quality pattern-welded blade, "assuming nothing goes wrong, which it will."

†††More layers doesn't always mean better. The author documents the "over-folding problem" where excessive layers actually reduce quality. The optimal range appears to be 200-500 layers, though opinions vary dramatically.

‡Patterns have names: "ladder pattern," "twist pattern," "raindrop pattern." These names are poetic but technically meaningless. The pattern indicates the folding technique used, nothing more.

‡‡Pattern welded blades command higher prices partly due to quality, partly due to appearance, mostly due to the absurd amount of work required. The author notes: "If you value your time at all, pattern welding is economically irrational. We do it anyway."`,
  abstract: 'Advanced technique of forge-welding multiple steel layers to create blades with superior properties and distinctive patterns.',
  estimatedReadingTime: 300,
  authoringDifficulty: 4
};

export const HARDNESS_TESTING: ResearchPaper = {
  paperId: 'hardness_testing',
  title: 'Measuring Resistance: Practical Methods for Testing Metal Hardness',
  field: 'metallurgy',
  paperSets: ['advanced_metallurgy'],
  prerequisitePapers: ['quenching_theory'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { metallurgy: 22 },
  skillGrants: { metallurgy: 15 },
  contributesTo: [
    { type: 'ability', abilityId: 'assess_metal_quality' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_metallurgy'], // Legacy
  description: `A practical guide to determining whether metal is properly hardened without destroying the piece in the process*. The author, frustrated by years of guesswork**, provides systematic methods for hardness assessment.

The file test*** (scratching metal with a file of known hardness) is described as "crude but effective†." The spark test†† uses grinding sparks' appearance to estimate carbon content and hardness. The sound test††† involves tapping the metal and listening‡.

Most controversially, the bite test‡‡ (testing by teeth marks) is mentioned only to be condemned as "traditional, dangerous, and stupid."

*Destructive testing involves breaking the piece to examine internal structure. This is informative but leaves you with broken metal and disappointed customers.

**The author's early career involved much squinting at metal and pronouncing it "probably hard enough," which led to failures ranging from "annoying" to "catastrophic." This paper represents decades of learning to be more certain.

***File testing is wonderfully simple: if the file slides off without biting, the metal is harder than the file. If the file cuts the metal, the metal is softer. The challenge is having files of various known hardnesses.

†"Crude" because it only provides relative hardness (harder/softer than the file), not absolute measurements. "Effective" because it actually works and requires minimal equipment.

††Different steels produce different spark patterns when ground. High-carbon steel creates long, branching sparks. Low-carbon steel creates short, dull ones. The author includes detailed spark pattern diagrams that are surprisingly beautiful.

†††Properly hardened metal "rings" when struck. Soft metal "thuds." The author notes this requires "a good ear and considerable experience," code for "you'll get it wrong many times before getting it right."

‡The sound test is described as "part science, part music, part wishful thinking." Different smiths hear different things. Some claim to hear perfect pitch in metal. The author is skeptical but admits it works.

‡‡The bite test was popular among older smiths who lacked teeth anyway. The author strongly advises against it, noting: "Your teeth are not replaceable. Your metal is. Choose wisely."`,
  abstract: 'Non-destructive methods for assessing metal hardness including file testing, spark analysis, and sound testing.',
  estimatedReadingTime: 200,
  authoringDifficulty: 3
};

export const GRAIN_STRUCTURE: ResearchPaper = {
  paperId: 'grain_structure',
  title: 'The Hidden Architecture: Understanding Metal Grain and Crystal Structure',
  field: 'metallurgy',
  paperSets: ['advanced_metallurgy'],
  prerequisitePapers: ['carbon_infusion', 'quenching_theory'],
  complexity: 8,
  minimumAge: 'adult',
  minimumSkills: { metallurgy: 30 },
  skillGrants: { metallurgy: 22 },
  contributesTo: [
    { type: 'ability', abilityId: 'understand_metal_structure' }
  ],
  published: false,
  tier: 4, // Legacy
  technologyTags: ['advanced_metallurgy'], // Legacy
  description: `A revolutionary work proposing that metal is not uniform but composed of tiny crystals* whose arrangement determines properties**. The author's insight - that heating and cooling affects crystal formation*** - explained previously mysterious phenomena.

The work introduces the concept of "grain size"† - smaller grains create stronger, tougher metal. Rapid cooling produces small grains††. Slow cooling produces large grains†††. Controlling cooling rate thus controls properties‡.

Breaking metal and examining the fracture surface reveals grain structure‡‡, though this "requires sacrificing the specimen to learn about specimens you don't want to sacrifice."

*Invisible to the naked eye but observable at fracture surfaces. The author describes metal as "a crowd of tiny crystals holding hands," which is technically inaccurate but conceptually helpful.

**Properties including strength, hardness, toughness, and ductility all relate to grain structure. This wasn't obvious before this paper and was considered radical when published.

***This explained why identical metal treated differently performs differently. It wasn't magic or luck - it was grain structure responding to thermal history.

†Grain size is measured by counting grains per area after polishing and etching the metal surface. This process is tedious and requires specialized preparation, limiting widespread adoption.

††Rapid cooling (quenching) freezes crystal formation before grains can grow large. This produces fine-grained structure with superior properties. This is why quenching works, though smiths didn't know why until this paper.

†††Slow cooling (annealing) allows crystals time to grow. Large-grained metal is softer, more ductile, easier to work. Sometimes you want this. Usually you don't.

‡The author notes this is "partial control at best." Many factors affect grain formation: heating temperature, cooling rate, metal composition, phase of moon (joke, probably), and variables the author admits not understanding.

‡‡Fracture surfaces appear rough at scales smaller than grain size, crystalline at grain scale. Experienced metallurgists can estimate grain size by eye, though the author recommends actual measurement for anything important.`,
  abstract: 'Theory of metal crystalline structure, grain formation, and the relationship between grain size and mechanical properties.',
  estimatedReadingTime: 350,
  authoringDifficulty: 5
};

export const TEMPERATURE_PRECISION: ResearchPaper = {
  paperId: 'temperature_precision',
  title: 'Degrees of Difference: Precise Temperature Control in Forging',
  field: 'metallurgy',
  paperSets: ['advanced_metallurgy'],
  prerequisitePapers: ['carbon_infusion', 'quenching_theory'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { metallurgy: 28 },
  skillGrants: { metallurgy: 20 },
  contributesTo: [
    { type: 'ability', abilityId: 'precise_temperature_control' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['steel_forging'], // Legacy
  description: `An obsessive examination of why "hot enough" isn't precise enough* and how to achieve the exact temperature needed for specific operations**. The author documents the temperature ranges for various processes with unsettling precision***.

The color-to-temperature correlation† is expanded from the traditional chart to include subtle variations††: "cherry red" is subdivided into "dull cherry," "medium cherry," and "bright cherry"†††, each representing a narrow temperature range with different properties.

The work introduces environmental compensation‡: the same color appears different in bright sunlight versus dim workshop‡‡, requiring mental adjustment or controlled lighting.

*For basic work, "hot enough" suffices. For advanced metallurgy, temperature differences of 50 degrees change outcomes from "perfect" to "ruined." The author learned this through extensive ruining.

**Different operations require different temperatures. Forging iron: 1000-1200°C. Hardening steel: 760-800°C. Tempering: 200-650°C depending on desired hardness. Getting these wrong produces wrong results.

***The precision is suspicious for a time before accurate thermometers. The author apparently determined exact temperatures through systematic testing, correlation with color, and "decades of burning metal and recording what happened."

†The traditional color chart (black, red, orange, yellow, white) is useful but imprecise. The same color can represent a 200-degree range, which is too broad for advanced work.

††These subdivisions are described with poetic detail: "the cherry that makes you think of summer," "the cherry that makes you think of blood," "the cherry that makes you think you've gone too far."

†††Experienced smiths claim to see these differences. Skeptics claim they're imagining it. The author provides blind tests proving the experienced smiths are actually right, which is unsettling.

‡Lighting affects apparent color dramatically. Metal heated to 800°C appears bright orange in darkness, dull red in sunlight. The true temperature hasn't changed, only the perception.

‡‡The author recommends forging in consistent lighting conditions. Many master smiths forge in windowless rooms with controlled lamp placement. This seems extreme until you try forging in variable light and ruin several expensive pieces.`,
  abstract: 'Methods for achieving and recognizing precise forging temperatures through advanced color reading and environmental compensation.',
  estimatedReadingTime: 280,
  authoringDifficulty: 4
};

export const SURFACE_FINISHING: ResearchPaper = {
  paperId: 'surface_finishing',
  title: 'The Final Polish: Surface Treatment and Metal Finishing Techniques',
  field: 'metallurgy',
  paperSets: ['advanced_metallurgy'],
  prerequisitePapers: ['iron_working'],
  complexity: 5,
  minimumAge: 'adult',
  minimumSkills: { metallurgy: 18 },
  skillGrants: { metallurgy: 12, crafting: 8 },
  contributesTo: [
    { type: 'item', itemId: 'polished_metal_goods' }
  ],
  published: false,
  tier: 2, // Legacy
  technologyTags: ['advanced_metallurgy'], // Legacy
  description: `A surprisingly philosophical work arguing that metalwork isn't complete until properly finished*. The author distinguishes between "done forging" and "actually done**," noting that the difference is "hours of tedious polishing."

The work systematically covers grinding***, filing†, polishing††, and chemical treatments†††. Each stage removes progressively finer imperfections until the surface approaches perfection‡ (which is never actually achieved‡‡).

A significant section addresses psychological endurance: "Hour five of polishing tests your commitment to excellence versus your desire to be finished and move on."

*"Finished" has two meanings: completed forging, and surface finishing. The author notes this linguistic coincidence causes confusion and arguments.

**"Actually done" is when the piece looks good, feels smooth, and won't rust immediately. This requires significantly more work than mere forging.

***Grinding removes large imperfections: hammer marks, scale, rough spots. This is aggressive, fast, and removes significant material. The author warns against "aggressive enthusiasm" that grinds away more than intended.

†Filing refines the surface after grinding. The author describes this as "meditation through repetition" or "boring torture" depending on your philosophical outlook.

††Polishing uses progressively finer abrasives: coarse, medium, fine, very fine, "so fine you can't see the abrasive anymore." Each stage removes scratches from the previous stage while creating smaller scratches that the next stage removes.

†††Chemical treatments include blueing (creating a blue-black oxide layer for corrosion resistance) and patination (controlled oxidation for appearance). The author notes these "make metal look finished while actually providing protection," a rare case of aesthetics and function agreeing.

‡Perfect finish is theoretically possible but practically impossible. At some point you achieve "good enough," which is when additional work produces imperceptible improvement. Knowing when to stop separates masters from obsessives.

‡‡The author admits spending three weeks polishing a single blade to what they thought was perfection, then finding a tiny scratch and starting over. They don't recommend this level of perfectionism unless you're independently wealthy or slightly unhinged.`,
  abstract: 'Comprehensive techniques for finishing metal surfaces through grinding, filing, polishing, and chemical treatment.',
  estimatedReadingTime: 220,
  authoringDifficulty: 3
};

export const WIRE_DRAWING: ResearchPaper = {
  paperId: 'wire_drawing',
  title: 'From Rod to Thread: The Art of Drawing Wire',
  field: 'metallurgy',
  paperSets: ['advanced_metallurgy'],
  prerequisitePapers: ['iron_working', 'alloy_theory'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { metallurgy: 24 },
  skillGrants: { metallurgy: 16 },
  contributesTo: [
    { type: 'item', itemId: 'metal_wire' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_metallurgy'], // Legacy
  description: `A technical masterwork on transforming thick metal rod into impossibly thin wire* through sequential pulling**. The author describes wire drawing as "controlled violence: making metal thinner while making it stronger***."

The process uses a series of progressively smaller dies† (holes through hard plates). Metal is pulled through each die††, becoming thinner and longer†††, until reaching the desired thickness‡.

The work addresses the central paradox: pulling metal should weaken it‡‡, yet drawn wire is stronger than the original rod. The author's explanation involves "work hardening" and "grain alignment" but admits "we know it works better than we know why."

*"Impossibly thin" is subjective. The author documents wire as fine as human hair, which contemporary metallurgists considered impossible until shown the actual wire.

**Not pushing (which causes buckling) but pulling (which causes elongation). This distinction is critical and counterintuitive.

***Work hardening occurs when metal is deformed. The crystals rearrange, creating a harder, stronger (but more brittle) structure. This is usually a problem. In wire drawing, it's the goal.

†Dies are typically made from very hard materials: hardened steel, stone, or later, diamond. They wear out and must be replaced frequently, making wire drawing expensive.

††Pulling thick wire through a small die requires tremendous force. Early wire drawing used water-powered or animal-powered mechanisms. The author describes human-powered wire drawing as "possible but inadvisable unless you enjoy pain."

†††The mathematics are elegant: pulling wire through a die that's 10% smaller in diameter makes the wire 21% longer (volume conservation). This process repeats through many dies, creating very long, very thin wire from short, thick rod.

‡Common wire sizes have names: "jewelry wire" (very thin), "mesh wire" (thin), "chain wire" (medium), "cable wire" (thick). The naming is traditional and regional, causing confusion when smiths from different areas discuss wire.

‡‡ Intuition suggests that stretching metal makes it weaker. This is true for some processes (heating and pulling makes weak metal). Wire drawing (cold pulling through dies) is different and counterintuitive.`,
  abstract: 'Techniques for producing metal wire through sequential die drawing, including work hardening principles and equipment requirements.',
  estimatedReadingTime: 260,
  authoringDifficulty: 4
};

export const METAL_CASTING: ResearchPaper = {
  paperId: 'metal_casting',
  title: 'Molten Formation: The Principles of Metal Casting',
  field: 'metallurgy',
  paperSets: ['advanced_metallurgy'],
  prerequisitePapers: ['smelting_fundamentals', 'alloy_theory'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { metallurgy: 20 },
  skillGrants: { metallurgy: 16, crafting: 6 },
  contributesTo: [
    { type: 'ability', abilityId: 'cast_metal' }
  ],
  published: false,
  tier: 3, // Legacy
  technologyTags: ['advanced_metallurgy'], // Legacy
  description: `A comprehensive guide to shaping metal by pouring it into molds*, complementing forging with the ability to create complex forms**. The author argues casting and forging are "different tools for different problems***," advocating for both rather than exclusive dedication to one.

The work covers mold making† (sand, clay, stone, metal), pouring technique†† (preventing air bubbles and incomplete fills), and cooling management††† (controlling shrinkage and cracking).

Chapter 9, "Why Your Cast Failed," is organized by symptom‡, allowing readers to find their specific disaster and learn from it‡‡.

*Casting predates forging historically, making this paper's placement in advanced metallurgy seem odd. The author explains that while basic casting is ancient, *good* casting requires metallurgical knowledge from forging.

**Forging creates shapes by deforming metal. Casting creates shapes by filling space. Forging produces stronger pieces (grain alignment) but limited shapes. Casting produces complex shapes but potentially weaker pieces.

***The author notes that some smiths are "forge purists" who disdain casting, and some are "casting enthusiasts" who avoid forging. The author considers both positions needlessly dogmatic.

†Mold materials depend on application. Sand molds are cheap, single-use, and suitable for large castings. Metal molds are expensive, reusable, and provide better surface finish. Clay sits in between.

††Pouring too slowly allows premature cooling, creating incomplete casts. Pouring too fast creates turbulence and trapped air. The "correct" pour rate is described as "confident but not rushed," which is uselessly vague but apparently accurate.

†††Metal shrinks as it cools. This creates stresses that can crack the casting. Controlling cooling rate and allowing for shrinkage requires experience. The author estimates "thirty failed casts before consistent success."

‡Symptoms include: cracks (thermal stress), pits (trapped air), incomplete sections (insufficient pour), rough surface (poor mold), and "the entire thing came out wrong somehow" (multiple problems).

‡‡The author's tone in this chapter is sympathetic, suggesting extensive personal experience with cast failure. One section ends: "We've all been there. You'll do better next time."`,
  abstract: 'Comprehensive metal casting techniques including mold creation, pouring methods, and cooling control for complex metal shapes.',
  estimatedReadingTime: 270,
  authoringDifficulty: 4
};

export const TOOL_STEEL: ResearchPaper = {
  paperId: 'tool_steel',
  title: 'Steel for Making Tools: Specialized Alloys for Cutting and Shaping',
  field: 'metallurgy',
  paperSets: ['advanced_metallurgy'],
  prerequisitePapers: ['carbon_infusion', 'alloy_theory', 'quenching_theory'],
  complexity: 8,
  minimumAge: 'adult',
  minimumSkills: { metallurgy: 32 },
  skillGrants: { metallurgy: 24 },
  contributesTo: [
    { type: 'item', itemId: 'tool_steel' },
    { type: 'ability', abilityId: 'craft_superior_tools' }
  ],
  published: false,
  tier: 4, // Legacy
  technologyTags: ['advanced_metallurgy'], // Legacy
  description: `A specialized treatise on steel optimized for making tools that make things*, addressing the unique requirements** of metal that must remain sharp while cutting other metal***. The author describes tool steel as "steel that works for a living†."

The work outlines critical properties: extreme hardness†† (for cutting), toughness††† (preventing chipping), wear resistance‡ (maintaining edges), and heat stability‡‡ (performing under friction).

Achieving all properties simultaneously requires precise alloy composition and heat treatment, which the author details with extensive footnotes documenting their many failures before success.

*The recursive nature of metallurgy: using metal tools to make metal tools that make metal things. The author finds this philosophically interesting. Most smiths just want tools that work.

**Tools face harsher conditions than most metal objects. They must be harder than the material being cut, tough enough not to shatter, and durable enough for repeated use. This combination is difficult to achieve.

***Regular steel isn't hard enough to cut hardened steel. Tool steel must be significantly harder, requiring high carbon content and specific alloying elements.

†This implies regular steel doesn't work, which the author clarifies: "All steel works, but tool steel works *hard* without complaining, breaking, or needing constant maintenance."

††Hardness achieved through high carbon content (1-2% carbon vs. 0.3-0.8% in regular steel) and careful heat treatment. Too much carbon makes brittle steel. The window between "not hard enough" and "too brittle" is narrow.

†††Toughness prevents catastrophic failure. A brittle tool shatters when stressed. A tough tool chips but survives. The author notes: "Sharpening a chipped tool is annoying. Replacing a shattered tool is expensive."

‡Wear resistance relates to how long edges stay sharp. Some steels wear quickly, requiring frequent sharpening. Tool steel maintains edges longer through carbide formation and work hardening.

‡‡Some operations generate significant heat through friction. If the tool steel softens (loses hardness) from heat, it fails. Heat-stable tool steel resists this, remaining hard even when hot. The author calls this "stubbornness at the molecular level."`,
  abstract: 'Specialized steel formulations and heat treatments for creating tools with superior hardness, toughness, and wear resistance.',
  estimatedReadingTime: 320,
  authoringDifficulty: 5
};

export const LEGENDARY_METALLURGY: ResearchPaper = {
  paperId: 'legendary_metallurgy',
  title: 'Masterwork Metals: Advanced Techniques in Legendary Smithing',
  field: 'metallurgy',
  paperSets: ['advanced_metallurgy'],
  prerequisitePapers: ['alloy_theory', 'quenching_theory'],
  complexity: 10,
  minimumAge: 'elder',
  minimumSkills: { metallurgy: 40 },
  skillGrants: { metallurgy: 30 },
  contributesTo: [
    { type: 'ability', abilityId: 'masterwork_crafting' },
    { type: 'item', itemId: 'masterwork_blade' }
  ],
  published: false,
  tier: 5, // Legacy
  technologyTags: ['legendary_metals'], // Legacy
  description: `The pinnacle of metallurgical knowledge, this work compiles techniques that border on the magical*. The author documents methods for creating metals of extraordinary quality through perfect control of every variable: ore purity, carbon content, temperature curves, quenching media, and even the smith's state of mind**.

The paper introduces "harmonic forging"*** - the practice of timing hammer blows to a rhythm that allegedly aligns the metal's internal structure†. While peer review questioned the theoretical basis††, empirical results were undeniable: blades produced with these methods were measurably superior†††.

The final chapter, "On the Boundary Between Science and Art," essentially argues that the highest metallurgy transcends mere technique and becomes a form of creative expression‡, which either makes perfect sense or is complete nonsense depending on one's perspective‡‡.

*The author is careful to distinguish "bordering on magical" from "actually magical." No magic is involved, just extreme precision and knowledge. Though the author admits "the difference may be philosophical rather than practical."

**The section on mental state drew criticism from materialist metallurgists who insisted that metal "doesn't care about your feelings." The author countered that while metal indeed doesn't care, smiths do, and a smith's mental state affects their precision. Both sides claimed victory.

***Not to be confused with harmonic forging in the musical sense, which is something bards do and involves far less hitting things with hammers.

†The rhythm is described as "natural" and "felt rather than calculated." This vagueness frustrated researchers who wanted precise specifications. The author's response: "If you have to ask, you're not ready."

††One reviewer wrote: "This sounds like mystical nonsense." Another wrote: "I tried it and it worked, but I don't know why." A third wrote: "I refuse to try it out of principle."

†††"Measurably superior" included higher hardness, better edge retention, and improved resistance to shattering. Also, they looked really good, which shouldn't matter but did.

‡This argument placed the author firmly in the "metallurgy as art" camp, as opposed to the "metallurgy as pure science" faction. The debate continues to this day, with master smiths generally favoring the art position and metallurgical theorists favoring the science position.

‡‡The author seems aware of this ambiguity and comfortable with it, noting: "Those who find this nonsense will make adequate blades. Those who understand will make legendary ones." This statement was either profoundly wise or infuriatingly pretentious, possibly both.`,
  abstract: 'The most advanced metallurgical techniques, combining perfect technical precision with artistic mastery to create legendary metalwork.',
  estimatedReadingTime: 500,
  authoringDifficulty: 5
};

export const METALLURGY_PAPERS = [
  // Basic Metallurgy (9 papers)
  ORE_IDENTIFICATION,
  SMELTING_FUNDAMENTALS,
  IRON_WORKING,
  MINING_TECHNIQUES,
  FORGE_CONSTRUCTION,
  BELLOWS_OPERATION,
  TOOL_MAINTENANCE,
  ORE_GRADING,
  SLAG_MANAGEMENT,
  // Advanced Metallurgy (12 papers)
  CARBON_INFUSION,
  QUENCHING_THEORY,
  ALLOY_THEORY,
  PATTERN_WELDING,
  HARDNESS_TESTING,
  GRAIN_STRUCTURE,
  TEMPERATURE_PRECISION,
  SURFACE_FINISHING,
  WIRE_DRAWING,
  METAL_CASTING,
  TOOL_STEEL,
  LEGENDARY_METALLURGY
];
