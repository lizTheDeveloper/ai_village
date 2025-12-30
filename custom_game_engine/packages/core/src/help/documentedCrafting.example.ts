/**
 * Example: Crafting System with Embedded Documentation
 *
 * Documentation for crafting, recipes, quality, skills, and the deep
 * satisfaction of making things with your hands (or watching villagers do it).
 *
 * Uses the blended writing voices from WRITER_GUIDELINES.md.
 */

import { defineItem as _defineItem } from '../items/ItemDefinition.js';

// ============================================================================
// CRAFTING SYSTEM OVERVIEW
// ============================================================================

export const CRAFTING_SYSTEM_HELP = {
  id: 'crafting_system',
  summary: 'Transform raw materials into useful items through skill and patience',
  description: `Making things is older than language. Before humans had words for "axe" or "bread" or "unnecessarily decorative pottery," they had the understanding that this rock plus that stick equals tool, this grain plus that fire equals food, this clay plus these hands equals... well, usually a lopsided bowl, but the *intent* was magnificent.

The crafting system codifies this ancient knowledge into something manageable, which is either a wonderful service to civilization or a profound missing of the point, depending on your philosophy regarding the industrialization of artisanship.* Either way, it works like this:

You have materials. You have a recipe—knowledge of how materials combine into product. You have skills—experience turning theory into practice. You have time—because nothing good was ever made instantly, except possibly lightning, and even that requires specific atmospheric conditions. Put these together at an appropriate workstation (or your bare hands, for simple tasks) and eventually—after appropriate waiting, during which you contemplate the nature of creation and also whether you measured the ingredients correctly—you produce an item.

The item's quality depends on your skill level, your familiarity with this specific recipe, how well your various skills synergize, and random chance, because even master crafters have off days when the clay won't center or the metal won't flow or the bread mysteriously develops sentience and lodges formal complaints.** Quality ranges from "poor" (functional but embarrassing) to "legendary" (so good it might be magic, or is magic, boundary's unclear), affecting both practical utility and economic value.

The Crafting Guild*** tracks approximately 247 distinct recipes across seven categories: Tools, Weapons, Food, Materials, Buildings, Decorations, and Miscellaneous (which is where they filed "self-stirring spoon" and "anxiety-inducing mirror" and nobody's had the courage to audit that category in decades). Some recipes require specialized stations—can't smelt iron in your hands, much as you might want to try—others need specific skill levels, a few demand research unlocks, and one particularly ambitious recipe requires "divine intervention (optional but recommended)."

Crafting is fundamentally satisfying. Taking disparate materials and creating something greater than their sum is the closest most mortals get to feeling divine. The first time you craft something—anything—and it *works*, and you made it, and it didn't exist before but does now because of you... that feeling never entirely fades. Even when you're crafting your thousandth iron ingot and the romance has been replaced by routine, there's still the quiet satisfaction of competence, of knowing how things fit together, of being useful.

*The Philosopher-Smiths have been arguing about this for six centuries. The debate generates enough heat to power several forges.

**This only happened once. The bread was named Gerald and demanded voting rights. The incident is not discussed.

***Not to be confused with the Craft Guild (knitting, basketry), the Crafty Guild (rogues, tricksters), or the Guild of Craft (philosophers who think about making things rather than making them).`,
  category: 'systems',
  subcategory: 'crafting',
  tags: ['crafting', 'recipes', 'skills', 'quality', 'production'],
  mechanics: {
    values: {
      maxQueueSize: 10,
      qualityRange: '0-100',
      skillLevels: '0-5',
      categories: 7,
      totalRecipes: '247+',
    },
    formulas: {
      craftingQuality: '(baseMultiplier * 100) + familiarityBonus + (synergyBonus * 100) + randomVariance',
      baseMultiplier: '0.7 + (skillLevel * 0.1)',
      familiarityBonus: '0-20 (logarithmic with practice)',
      synergyBonus: '0-0.35 (sum of active synergies)',
      randomVariance: '±10%',
      priceMultiplier: '0.5 + (quality/100) * 1.5',
    },
    conditions: {
      'Requires materials': 'All ingredients must be available',
      'Station may be required': 'Complex recipes need specialized workstations',
      'Skills can be requirement': 'Some recipes locked behind skill levels',
      'Time investment': 'Crafting takes real time, not instant',
      'Quality varies': 'Output quality depends on skill and chance',
    },
    dependencies: ['materials', 'recipe_knowledge', 'skill_level', 'workstation_access'],
  },
  tips: [
    'Specialize early—master one craft before dabbling in others',
    'Quality improves with familiarity—your 100th sword will be better than your first',
    'Synergies matter—related skills boost each other\'s quality output',
    'Keep a crafting queue—batch similar items for efficiency',
  ],
  warnings: [
    'Failed crafts consume materials—there is no refund for incompetence',
    'Quality cannot be improved after crafting—make it right the first time',
    'Legendary items are rare (96-100 quality)—don\'t expect them consistently',
    'Some recipes are deeply inefficient—the economic value may not justify the time investment',
  ],
  examples: [
    {
      title: 'The First Craft',
      description:
        'You\'ve gathered wood. You\'ve learned the "Wooden Spear" recipe. The instructions seem clear: pointy stick, basically. How hard can it be? Turns out: surprisingly hard. Your first attempt wobbles, the point is off-center, the balance is wrong. Quality: 23 (Poor). It works—you can technically stab things—but you\'re not proud. You try again. And again. By the tenth spear, your hands know the motions, the wood speaks differently, the balance comes naturally. Quality: 68 (Fine). You\'ve learned. This is what crafting teaches: failure, iteration, eventual mastery. The wobble spear sits in your inventory, too embarrassing to use but too meaningful to discard. Your first craft. Your worst craft. The one that started everything.',
    },
    {
      title: 'The Masterwork',
      description:
        'Smithing level 5. "Iron Longsword" familiarity: 89 crafts. Synergies active: Metalworking, Weapon Design, Heat Management. You\'ve made this sword so many times you could do it asleep. But today something\'s different. The metal flows perfectly. The hammer falls true. The quench is exactly right. You pull the blade from the final polish and it *sings*—not metaphorically, actually makes a clear ringing tone when you test the flex. Quality: 97 (Legendary). You stare at it, shocked. You\'ve been trying for legendary for months, and it finally happened, and now you don\'t know if you can replicate whatever you did right. This is the curse and gift of crafting: you can master the process, but you can never fully control the outcome. The legendary sword will sell for triple price. You\'ll probably keep it. Some things are too perfect to let go.',
    },
  ],
  relatedTopics: [
    'skill_system',
    'quality_tiers',
    'recipe_discovery',
    'crafting_stations',
    'material_gathering',
    'economic_trading',
  ],
};

// ============================================================================
// QUALITY SYSTEM
// ============================================================================

export const QUALITY_SYSTEM_HELP = {
  id: 'quality_system',
  summary: 'How skill, familiarity, and luck determine crafted item excellence',
  description: `Quality is a number from 0 to 100 that represents how well something was made, which sounds simple until you remember that "well made" encompasses dimensions like functionality, durability, aesthetics, philosophical coherence, and whether it sparks joy when held.*

The quality tiers map onto the 0-100 scale with ranges that have been carefully calibrated by the Standards Bureau, debated by craftspeople, ignored by merchants, and generally accepted by everyone:
- **Poor (0-30)**: Functional but flawed. It works, barely, with caveats. The economic and emotional value is low but non-zero because at least you tried.
- **Normal (31-60)**: Adequate. Does the job. Won't impress anyone but won't embarrass you either. The vast middle where most crafting lives.
- **Fine (61-85)**: Above average. Noticeably well-made. People compliment it. You feel modest pride. This is where competence becomes craft.
- **Masterwork (86-95)**: Exceptional. Professional grade. Might last generations. Sells for premium prices. This is what dedication produces.
- **Legendary (96-100)**: Perfection. So rare it's practically mythical. Museums want it. Your name gets attached to it. "The Miller's Axe of Unbreakable Edge." You'll tell this story forever.

Quality emerges from a formula** that combines:
1. **Skill level** (0-5): Your base competence. Unskilled crafters produce poor items. Masters produce fine-to-masterwork consistently. The math is: 0.7 + (skillLevel * 0.1), giving a multiplier from 0.7 (unskilled) to 1.2 (master).
2. **Familiarity bonus** (0-20 quality points): Practice with this specific recipe. Logarithmic increase—early crafts teach a lot, later crafts refine gradually. Your first sword: +0. Your hundredth: +18. The ceiling exists to represent that even masters keep learning, just slower.
3. **Synergy bonus** (0-35 quality points): Related skills helping each other. A blacksmith with Metalworking, Weapon Design, and Heat Management gets bonuses from all three when making swords. Skills synergize when they share context.
4. **Random variance** (±10%): Because perfection isn't deterministic. The metal might have a flaw. Your hand might slip. The gods might be watching and feeling generous or petty. Adds uncertainty and keeps crafting interesting even at high skill.

The formula, lovingly maintained by the Mathematics Guild:
\`quality = (baseMultiplier × 100) + familiarityBonus + (synergyBonus × 100) + (randomVariance × 100)\`
Then clamped to 0-100 because negative quality and quality-over-100 are philosophically troubling concepts that the Bureau refuses to address.

Quality affects two main things:
- **Functionality**: A fine sword cuts better than a poor sword. A masterwork healing potion heals more. The mechanical benefits scale with quality in ways specific to item type.
- **Value**: Price multiplier ranges from 0.5× (poor) to 2.0× (legendary). A 100-quality iron sword sells for quadruple the price of a 0-quality one, assuming you can find someone with enough coin and appreciation.

Importantly: **Quality is determined at crafting time and cannot be changed.** You can't polish a poor sword into legendary. You can repair it, but the quality remains. This is both realistic (you can't fundamentally change what something is) and slightly tragic (that masterwork you crafted at skill level 3 and got lucky? Still just level-3 quality ceiling). Some things can only be made better by making them again, from scratch, with better skill.

*The Philosopher-Craftsmen argue that quality is an inherent property of objects. The Craftsmen-Philosophers argue it's a perception projected by observers. The Craftsmen-Craftsmen don't care and keep making things.

**The formula has been revised seventeen times. Each revision sparked three academic papers and at least one bar fight.`,
  category: 'systems',
  subcategory: 'crafting',
  tags: ['quality', 'skills', 'crafting', 'mechanics', 'value'],
  mechanics: {
    values: {
      qualityTiers: 5,
      poorRange: '0-30',
      normalRange: '31-60',
      fineRange: '61-85',
      masterworkRange: '86-95',
      legendaryRange: '96-100',
      skillMultiplierMin: 0.7,
      skillMultiplierMax: 1.2,
      familiarityMax: 20,
      synergyMax: 0.35,
      varianceDefault: 0.1,
    },
    formulas: {
      quality: '(baseMultiplier * 100) + familiarityBonus + (synergyBonus * 100) + (randomVariance * 100)',
      baseMultiplier: '0.7 + (skillLevel * 0.1)',
      priceMultiplier: '0.5 + (quality / 100) * 1.5',
      familiarityGrowth: 'log10(craftCount + 1) * maxBonus',
    },
    conditions: {
      'Determined at craft time': 'Quality set when item is created',
      'Cannot be improved': 'Quality is permanent—repairing doesn\'t increase it',
      'Skill ceiling exists': 'Low skill = low maximum possible quality',
      'Randomness persists': 'Even masters occasionally produce poor items',
    },
  },
  tips: [
    'Legendary items require skill 5 + high familiarity + good luck—expect 1-5% of crafts',
    'Quality variance means batching—make 10 swords, keep the best, sell the rest',
    'Track familiarity per recipe—specialization > generalization for quality',
    'Synergies compound—four related skills can add +35 quality points',
  ],
  warnings: [
    'Familiarity resets if you forget the recipe (don\'t delete your spellbook equivalents)',
    'Quality 95 vs 96 is the difference between Masterwork and Legendary (huge value jump)',
    'Random variance can turn an expected Masterwork into Normal—always craft with margin',
    'Price multiplier is quadratic-ish—legendary items sell for WAY more than poor ones',
  ],
  examples: [
    {
      title: 'The Learning Curve',
      description:
        'Smithing level 1. No familiarity. No synergies. Formula: (0.8 × 100) + 0 + 0 + variance = 80 ± 10 = 70-90 quality. You craft ten iron swords. Results: 73, 68, 82, 71, 77, 84, 69, 75, 80, 86. One reached Masterwork by sheer luck. Most are Fine. None are Poor because your base multiplier is decent. This is early crafting: inconsistent but promising. Six months later: level 3, familiarity +12, one synergy (+0.10). New formula: (1.0 × 100) + 12 + 10 + variance = 122 ± 10, clamped to 100 ± 10 = 90-100. You craft ten more swords. Results: 94, 97, 91, 95, 98, 93, 96, 92, 99, 95. Seven Legendary, three Masterwork. This is mastery: consistent excellence, occasional perfection.',
    },
    {
      title: 'The Tragic Heirloom',
      description:
        'Your grandmother was a legendary potter. At skill level 5 with a lifetime of familiarity, she crafted a vase: quality 98, Legendary tier. It survived her, survived the war, survived three generations. Then you, inheriting her workshop and ambitions, attempted to repair a small crack. The repair worked—functionality restored to 100%—but the quality remains 98. Which is legendary, yes, but it\'s also permanently capped there. You could craft a new vase now, at your skill level 4, familiarity 0, and *maybe* hit quality 85 (Masterwork) with extraordinary luck. But you could never replicate her 98. Some quality is unrepeatable. The vase sits in the place of honor, its hairline repair invisible, its perfection preserved and forever just out of your reach. You\'re learning to be okay with that. Quality isn\'t just about the numbers. It\'s about the story of who made it, when, and why.',
    },
  ],
  relatedTopics: [
    'skill_progression',
    'familiarity_system',
    'skill_synergies',
    'economic_value',
    'item_repair',
  ],
};

// ============================================================================
// CRAFTING STATIONS
// ============================================================================

export const CRAFTING_STATIONS_HELP = {
  id: 'crafting_stations',
  summary: 'Specialized workshops that enable advanced recipes',
  description: `Some things you can make with your bare hands: wooden spears, fiber rope, arguably bread if you're desperate and the definition is loose. Other things emphatically require infrastructure: smelted iron (unless you're a lava elemental), precision alchemy (unless you enjoy explosions), enchanted artifacts (unless you want cursed artifacts, which form naturally when you try enchanting without proper facilities and adequate safety runes).

Crafting stations are the middle ground between "I found a sharp rock" and "I have industrialized this entire process into a factory." They're specialized workspaces with the tools, facilities, and (ideally) safety margins necessary for complex recipes. The game recognizes seven primary station types, though this number increases to "too many" if you count the experimental stations the Innovation Guild keeps building and occasionally having to condemn.

**Basic Stations:**
- **Crafting Table**: The universal workspace. Flat surface, organized tools, good lighting, minimal fire hazard. Enables most basic recipes that need more precision than hand-crafting but less specialization than advanced work. Required for anything with "assembly" in the process description.
- **Furnace**: Very hot box. Fundamental technology that unlocked civilization, according to historians, or doomed civilization, according to philosophers who preferred the pre-metallurgy era.* Melts ore into ingots, fires clay into pottery, occasionally achieves sentience (glitch, being patched). Required for smelting operations.
- **Forge**: Specialized hot box for metalworking. Different from furnace in important ways that blacksmiths will explain at length and volume. Enables weapon and armor smithing, tool forging, and the production of metal components for complex recipes.

**Advanced Stations:**
- **Alchemy Station**: Precision glassware, controlled heat, ingredient storage, and extensive safety protocols that everyone ignores until the first explosion. Enables potion brewing, material refinement, and the transformation of substances into other substances (results may vary). Required for anything labeled "alchemy" or "definitely not poison."
- **Enchanter's Workshop**: Where magic meets manufacturing. Rune-scribed floors, mana-conductive materials, possibly sentient tools that offer unhelpful advice.** Required for artifact creation, enchantment, and spell-imbuing. High initial cost, high operational complexity, high chance of something becoming aware.
- **Carpentry Shop**: Advanced woodworking. Better tools than crafting table, specialized equipment for joinery, actual ventilation for sawdust. Enables furniture, complex wooden structures, and items with "fine" in the description.

**Specialized Stations:**
- **Smithy**: The big brother of the forge. Multiple workstations, organized materials, apprentice-compliant safety standards. Enables mass production of metal goods, complex smithing projects, and the employment of assistants (mechanically just faster crafting, narratively a sign you've Made It).

Each station type unlocks specific recipes. The recipe list shows station requirements clearly: if it says "Requires: Forge" and you only have a crafting table, you're not making that sword, no matter how determined you feel or how many skill points you have. This is both realistic (try smelting iron on a wood table—it won't work and the table will have opinions) and slightly frustrating (gatekeeping recipes behind infrastructure costs) but ultimately necessary for progression pacing.

Stations have build costs in materials and sometimes skill requirements. A basic crafting table needs wood and basic carpentry. An enchanter's workshop needs rare materials, advanced construction, probably a permit from the Thaumaturgical Safety Board (processing time: 3-6 months, expediting not possible, clerical errors frequent). The progression is intentional: you work your way up from simple tools to complex infrastructure, each station opening new crafting possibilities, each new possibility requiring resources that justify the investment.

Some recipes allow multiple stations—"bread" can be made at a campfire or an oven, with quality differences. Others are station-exclusive—you're not enchanting anything without the proper workspace, safety runes, and probably insurance. The system is flexible where it can be and rigid where physics, magic, or basic safety requires.

*The Anti-Metallurgy Movement meets monthly and makes all their tools from stone. The meetings are poorly attended and the tools keep breaking.

**The advice is bad but the tools mean well.`,
  category: 'systems',
  subcategory: 'crafting',
  tags: ['stations', 'workshops', 'buildings', 'crafting', 'infrastructure'],
  mechanics: {
    values: {
      stationTypes: 7,
      basicStations: 3,
      advancedStations: 3,
      specializedStations: 1,
    },
    formulas: {
      stationBonus: 'Some stations provide quality or speed bonuses',
      specialization: 'Station type determines recipe availability',
    },
    conditions: {
      'Required for complex recipes': 'Many recipes cannot be crafted without stations',
      'Must be built first': 'Stations require construction before use',
      'Location matters': 'Stations must be placed in valid locations',
      'Durability exists': 'Stations can wear out and need maintenance',
    },
  },
  tips: [
    'Build stations near material storage—hauling ingredients is time-consuming',
    'Crafting table first, then furnace—this unlocks most early-game progression',
    'Alchemy station is expensive but necessary for potions and advanced materials',
    'Group similar stations together for workflow efficiency (smithy near forge near furnace)',
  ],
  warnings: [
    'Stations cannot be moved easily—choose placement carefully',
    'Building the wrong station first wastes resources—plan your tech progression',
    'Unattended forges/furnaces can cause fires (mechanically not implemented yet, but philosophically concerning)',
    'Enchanter\'s workshop has prerequisites—don\'t try to rush it',
  ],
  examples: [
    {
      title: 'The First Workshop',
      description:
        'You\'ve been crafting by hand—wooden spears, fiber rope, dignity-free survival. But you found a "Crafting Table" recipe and you have just enough wood. The table takes an hour to build, mostly because you keep second-guessing the joinery (it\'s your first furniture; you want it right). When it\'s done, sitting in your shelter, you access the crafting menu and suddenly there are thirty new recipes. Simple things, mostly—better tools, basic furniture, organized storage—but they were impossible before and possible now. The table isn\'t magic. It\'s just a flat surface with organization. But that\'s enough. Civilization is infrastructure, apparently, and you just built your first piece. Next up: a furnace. Then weapons better than sharpened sticks. Then maybe a bed that isn\'t just a pile of grass. Progress, one crafting station at a time.',
    },
    {
      title: 'The Enchanter\'s Folly',
      description:
        'You spent three months gathering materials for the enchanter\'s workshop. Rare woods, mana crystals, runic silver, an instruction manual with seventeen footnotes per page. The build took two weeks and most of your savings. When it was done, glowing faintly with latent magic, you felt proud. Then you tried to use it and discovered: you don\'t know any enchanting recipes. They require research. The research requires materials. The materials require an alchemy station you haven\'t built yet. You built a 500-gold workshop for a crafting path you can\'t access for another month minimum. This is a learning experience about planning and prerequisites. Expensive learning. The workshop sits unused, humming gently, occasionally offering unsolicited advice about your life choices (definitely a feature, not a bug). You\'ll use it eventually. When you do, it\'ll be worth it. Probably.',
    },
  ],
  relatedTopics: [
    'building_construction',
    'recipe_unlocks',
    'resource_gathering',
    'tech_progression',
    'workspace_organization',
  ],
};

// ============================================================================
// SKILL PROGRESSION AND MASTERY
// ============================================================================

export const SKILL_PROGRESSION_HELP = {
  id: 'skill_progression',
  summary: 'How practice transforms incompetence into mastery',
  description: `Skill levels run from 0 (never tried this) to 5 (legendary master), which sounds straightforward until you realize each level represents exponentially more practice than the last. Getting from 0 to 1 might take a week of focused effort. Getting from 4 to 5 can take years. The math is designed to reward specialization over generalization, because being mediocre at everything is less useful than being excellent at something specific.

The progression path for any craft skill follows a curve that's been empirically validated by the Skills Research Bureau:*

**Level 0 → 1 (Novice)**: You've learned the basics. You know what tools do, approximately. Your creations are poor quality (15-35) but functional. Time investment: 50-100 practice attempts. You're enthusiastic, mistake-prone, and learning faster than you'll ever learn again. Enjoy this phase—it's brief.

**Level 1 → 2 (Apprentice)**: Competence emerges. Your hands know motions without conscious thought. Quality improves to normal range (40-65). You can teach basics to others, which is how you realize how much you still don't know. Time investment: 200-400 attempts. This is where most people plateau, because competence feels like mastery until you meet actual masters.

**Level 2 → 3 (Journeyman)**: You're professionally capable. Fine quality (60-80) becomes consistent. You develop personal techniques, preferences, opinions about tools and materials. Time investment: 600-1000 attempts. This is the working professional tier—reliable, productive, skilled but not yet art.

**Level 3 → 4 (Expert)**: Masterwork quality (75-90) is achievable. You understand not just how but why techniques work. You can improvise, adapt, diagnose problems by sight/sound/feel. Time investment: 1500-2500 attempts. Most craftspeople cap here. Not because they can't improve, but because the effort required for level 5 exceeds what reasonable people invest in single skills.

**Level 4 → 5 (Master)**: Legendary quality (85-100) becomes possible. You don't follow the recipe—you understand the principles underlying the recipe and can adjust for conditions, materials, desired outcomes. Teaching at this level is different: you're transmitting philosophy, not just technique. Time investment: 3000+ attempts. This is obsession made productive. Most people see one or two level-5 crafters in their lifetime. Nobody reaches level 5 casually.

The skill system also tracks **familiarity** per recipe: every time you make a specific item, you get slightly better at making that specific item, separate from your general skill. This is the 0-20 quality bonus mentioned in other entries. The logarithmic growth means: first craft of a new item, +0 bonus. Tenth craft, +10. Fiftieth craft, +15. Hundredth craft, +18. The curve flattens because mastery is achievable but perfection is asymptotic.

**Skill synergies** add another layer: related skills boost each other's quality output. A blacksmith with Smithing-4, Metalworking-3, and Heat Management-2 gets compound bonuses when making swords. Each synergy might add +5-10 quality points, and they stack, meaning specialized crafters with deep skill trees can produce better work than generalists with higher individual skill levels.

The system rewards dedication, punishes dilettantism, and creates natural specialization where different people excel at different crafts. This is both realistic (mastery requires focus) and game-mechanically necessary (prevents min-maxing everything). Choose your crafts carefully. You have time to master maybe three in a lifetime, if you're dedicated and lucky.

*Founded in the Year of Three Broken Anvils, after a particularly contentious debate about whether pottery should have its own skill or fall under "general crafting." The debate lasted nine years and produced 847 pages of documentation. Pottery got its own skill.`,
  category: 'systems',
  subcategory: 'skills',
  tags: ['skills', 'progression', 'mastery', 'practice', 'specialization'],
  mechanics: {
    values: {
      levelRange: '0-5',
      level0to1: '50-100 attempts',
      level1to2: '200-400 attempts',
      level2to3: '600-1000 attempts',
      level3to4: '1500-2500 attempts',
      level4to5: '3000+ attempts',
      familiarityMax: 20,
      synergyBonus: '5-10 per related skill',
    },
    formulas: {
      qualityMultiplier: '0.7 + (skillLevel * 0.1)',
      familiarityBonus: 'log10(craftCount + 1) * 20',
      synergyBonus: 'relatedSkills.sum(skill => skill.level * 0.05)',
      xpGain: 'baseXP * (1 + difficultyModifier)',
    },
    conditions: {
      'Practice required': 'Skills don\'t increase automatically',
      'Specialization rewarded': 'Synergies favor focused skill trees',
      'Diminishing returns': 'Higher levels require exponentially more practice',
      'Familiarity is recipe-specific': 'Each item has separate familiarity tracking',
    },
  },
  tips: [
    'Focus on 2-3 skills maximum—mastery > breadth',
    'Build synergy trees: choose related skills for compound bonuses',
    'Familiarity compounds with skill—master a few recipes rather than dabbling in many',
    'Level 3 is the professional tier; level 4+ is optional unless you\'re min-maxing',
  ],
  warnings: [
    'Skill progression slows dramatically after level 3—be prepared for grind',
    'Neglected skills don\'t decay but familiarity does (controversial mechanic, being debated)',
    'Synergies only apply when skills are related—check skill tree connections',
    'Teaching others gives minimal XP—mastery comes from personal practice',
  ],
  examples: [
    {
      title: 'The Smith Who Specialized',
      description:
        'Kara focused exclusively on weapons: Smithing-5, Weapon Design-4, Metalworking-4, Heat Management-3. Total skill points: 16, spread across four related crafts. Her swords? Quality 90-98 consistently, legendary tier, sought by nobles and heroes. Her friend Marcus went broader: Smithing-3, Carpentry-3, Masonry-2, Cooking-2, Alchemy-2. Total points: 12, spread across unrelated skills. He could do everything adequately. She could do one thing perfectly. The economic value differential was approximately "Kara retired wealthy at forty, Marcus worked until he died at sixty-seven."',
    },
    {
      title: 'The Journey to Master',
      description:
        'Day 1: Pottery level 0. First bowl: quality 18, lopsided, leaks. Disappointing but expected. Week 1: Level 1. Bowls hold water now. Quality 35-50. Progress. Month 3: Level 2. Quality 55-70. Selling basic pottery, breaking even. Year 1: Level 3. Quality 70-85. Professional potter, small reputation. Year 3: Level 4. Quality 80-92. Regional fame, apprentices asking to train. Year 7: Level 5, finally. Quality 90-100. The bowl she makes that morning is perfect—balanced, elegant, so refined it makes her earlier masterwork pieces look like practice attempts. She cries. Seven years for this moment. Worth it? She makes another bowl. Quality 98. Then another. Quality 96. She\'s not crying anymore. She\'s laughing. This is mastery: consistency in excellence, joy in the process, knowledge that she can do this forever and still find new subtleties to explore.',
    },
  ],
  relatedTopics: [
    'crafting_system',
    'quality_system',
    'skill_synergies',
    'familiarity_mechanics',
    'specialization_benefits',
  ],
};

// ============================================================================
// EXAMPLE RECIPES
// ============================================================================

export const DOCUMENTED_IRON_SWORD_RECIPE = {
  id: 'iron_sword_recipe',
  summary: 'Standard weapon crafting recipe demonstrating quality variation',
  description: `The iron sword is the hello-world of weapon crafting: simple enough for a level-2 smith to attempt, complex enough that mastery shows in the results. Every blacksmith makes hundreds of these. The first wobbles. The hundredth sings when you swing it. The difference is skill, familiarity, and approximately 1,200 hours of practice.

**Recipe Details:**
- **Ingredients**: 2x iron_ingot, 1x leather_strip (for grip), 1x wood_pommel
- **Station**: Forge (required—you cannot hand-craft a sword, please stop trying)
- **Time**: 2 hours base (modified by skill)
- **Skill Requirements**: Smithing level 2 minimum
- **XP Gain**: 50 smithing XP per craft

**Quality Variations by Skill:**
- **Level 2 smith** (base multiplier 0.9): Output quality 70-95, mostly Fine tier. Serviceable weapons, decent value.
- **Level 3 smith** (base multiplier 1.0): Output quality 80-100, Fine to Masterwork. Professional grade, reliable.
- **Level 5 smith** (base multiplier 1.2) + familiarity +18 + synergies +20: Output quality 95-100, consistently Legendary. Museum pieces, legendary status, "The Sword of the Northern Smith" tier.

**Economic Reality:**
- Poor quality (20): Worth 40 gold (base 200 × 0.2 multiplier). Nobody wants this.
- Normal quality (50): Worth 100 gold. Standard merchant stock.
- Fine quality (75): Worth 175 gold. Quality blade, good seller.
- Masterwork quality (90): Worth 290 gold. Premium weapon.
- Legendary quality (98): Worth 390 gold. Collector's item, possible heirloom.

The iron sword is also a teaching tool: simple enough that mistakes are survivable, complex enough that technique matters. If you can't make a good sword, you can't make good anything metal. It's the crucible test (pun intended) of smithing competence.`,
  category: 'recipes',
  subcategory: 'weapons',
  tags: ['smithing', 'weapons', 'iron', 'forge', 'standard'],
  relatedTopics: [
    'smithing_skill',
    'quality_variation',
    'weapon_crafting',
    'forge_station',
  ],
};

export const DOCUMENTED_HEALING_POTION_RECIPE = {
  id: 'healing_potion_recipe',
  summary: 'Alchemical recipe with quality-dependent healing output',
  description: `Brewing a healing potion is chemistry pretending to be magic, or magic pretending to be chemistry—the Alchemist's Guild and Wizard's Academy have been arguing about this for six centuries and both sides have compelling evidence that mainly proves the distinction doesn't matter as much as they think it does.

**Recipe Details:**
- **Ingredients**: 3x red_herb, 1x mana_crystal, 1x pure_water, 1x glass_vial
- **Station**: Alchemy Station (required—kitchen chemistry ends badly)
- **Time**: 30 minutes base
- **Skill Requirements**: Alchemy level 2 minimum
- **XP Gain**: 35 alchemy XP per craft

**Quality affects healing output:**
- Poor quality (30): Heals 30 HP. Tastes terrible, works reluctantly, better than nothing.
- Normal quality (50): Heals 50 HP. Standard merchant potion.
- Fine quality (75): Heals 65 HP. Professional grade, reliable.
- Masterwork quality (90): Heals 80 HP. Premium healing, sought by adventurers.
- Legendary quality (98): Heals 95 HP. Near-instant recovery, might be actual magic.

**The Brewing Process** (as taught by the Guild):
1. Grind herbs to precise consistency (too fine: dissolves wrong; too coarse: inefficient extraction)
2. Extract essence in heated pure water (temperature critical—too hot destroys potency, too cold extracts poorly)
3. Integrate mana crystal energy (timing sensitive—too early: unstable, too late: inert)
4. Bottle while still aligned (magical window: 30 seconds, no longer)

Each step affects quality. Master alchemists can salvage bad ingredients. Novices waste good ingredients. The potion knows the difference—not sentient, just chemistry being finicky about process.

**Common Failure Modes:**
- Herbs oxidized: Potion turns brown, healing reduced 50%
- Temperature too high: Mana crystal cracks, potion inert
- Bottling too slow: Magic dissipates, you get expensive colored water
- Wrong water source: Impurities interfere, results unpredictable (usually bad)

The healing potion is the alchemy equivalent of the iron sword: standard, essential, deceptively simple. Every alchemist brews thousands. The first explodes (safely, usually). The thousandth is flawless. The journey between is what separates dilettantes from professionals.`,
  category: 'recipes',
  subcategory: 'potions',
  tags: ['alchemy', 'healing', 'potions', 'consumables', 'magical'],
  relatedTopics: [
    'alchemy_skill',
    'quality_healing_scaling',
    'potion_crafting',
    'alchemy_station',
  ],
};

export const DOCUMENTED_BREAD_RECIPE = {
  id: 'bread_recipe',
  summary: 'Basic food recipe showing hand-crafting vs station differences',
  description: `Bread is civilization. Not metaphorically—literally. The moment humans figured out "grain + water + fire = preserved calories," we stopped being nomadic hunter-gatherers and became agricultural societies with surplus time for inventing writing, mathematics, and unnecessarily complicated bread recipes.*

**Basic Recipe (Hand-Crafted):**
- **Ingredients**: 2x wheat_flour, 1x water, 1x salt (optional but recommended)
- **Station**: None (can be hand-crafted) OR Campfire OR Oven
- **Time**: 1 hour hand-crafted, 30 min campfire, 15 min oven
- **Skill Requirements**: Cooking level 0 (anyone can attempt)
- **XP Gain**: 10 cooking XP

**Station Quality Bonuses:**
- Hand-crafted: Base quality only (35-60), dense, inconsistent, technically edible
- Campfire: +10 quality, better heat control, still rustic
- Oven: +20 quality, even heating, professional results

**Quality affects nutrition:**
- Poor bread (25): Restores 5 hunger, might cause indigestion, better than starvation
- Normal bread (50): Restores 10 hunger, standard food
- Fine bread (75): Restores 15 hunger, actually pleasant to eat
- Masterwork bread (90): Restores 20 hunger, artisanal quality, people compliment it

**The Bread Spectrum:**
From "I mixed grain paste and put it near fire" to "This crusty artisanal sourdough with rosemary infusion is a religious experience" is the same basic recipe, differentiated entirely by skill, technique, and access to proper equipment. Bread teaches humility: everyone can make it, few make it well, mastery reveals itself in something as simple as "flour + water."

There are 847 documented bread recipes in the Culinary Archives. All are variations on the same basic theme. The Bread Historians insist this demonstrates human creativity. The Bread Minimalists insist this demonstrates humans overthinking simple things. Both groups make excellent bread, which proves something, though nobody agrees what.

*The Bread Historians have documented this. The Grain Farmers dispute the timeline but agree with the sentiment.`,
  category: 'recipes',
  subcategory: 'food',
  tags: ['cooking', 'bread', 'food', 'basic', 'hand-craftable'],
  relatedTopics: [
    'cooking_skill',
    'food_quality',
    'station_bonuses',
    'basic_crafting',
  ],
};
