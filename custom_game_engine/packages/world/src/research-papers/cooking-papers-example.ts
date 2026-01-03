/**
 * Cooking Research Papers - Example
 *
 * Demonstrates how cooking recipes ARE research papers.
 * Reading a paper grants skill + knowledge. Publishing it unlocks the recipe.
 *
 * This is a proof-of-concept showing how "everything is a paper" works.
 */

import type { ResearchPaper, ResearchSet } from './types.js';

// ============================================================================
// BREAD BAKING PAPERS
// ============================================================================

export const YEAST_FERMENTATION: ResearchPaper = {
  paperId: 'yeast_fermentation',
  title: 'On the Mysterious Rising of Dough: A Study of Yeast*',
  field: 'cuisine',
  paperSets: ['bread_baking'],
  prerequisitePapers: [],
  complexity: 3,
  minimumAge: 'teen',
  skillGrants: { cooking: 10, nature: 5 },
  contributesTo: [
    { type: 'recipe', recipeId: 'simple_bread' }
  ],
  description: `An investigation into why some dough rises and other dough does not**, and the role of tiny invisible organisms*** in this process.

The author demonstrates that yeast, when fed properly†, will produce bubbles††, and these bubbles will cause dough to expand in a most satisfying manner. The paper includes extensive notes on temperature, timing, and the importance of patience†††.

*The mystery has since been solved, but the sense of wonder remains.

**Earlier theories included: magic, prayer, the phases of the moon, and "hopeful thinking." All were tested. Most were disappointing.

***The existence of "invisible organisms" was considered highly controversial at the time. The Visible Things Society argued that anything that mattered could be seen, and anything that couldn't be seen didn't matter. They were wrong, but very loud about it.

†Yeast prefers sugar and warmth. We have much in common.

††Technical term: "doing its yeast thing."

†††Many bakers skip this step. Their bread knows.`,
  abstract: 'The fundamentals of yeast fermentation and its application to bread making.',
  published: false
};

export const FLOUR_CHEMISTRY: ResearchPaper = {
  paperId: 'flour_chemistry',
  title: 'Gluten Development and Structural Formation in Grain Products',
  field: 'cuisine',
  paperSets: ['bread_baking'],
  prerequisitePapers: [],
  complexity: 3,
  minimumAge: 'teen',
  skillGrants: { cooking: 10, chemistry: 5 },
  contributesTo: [
    { type: 'recipe', recipeId: 'simple_bread' }
  ],
  description: `A treatise on what happens when you mix flour with water and then refuse to stop kneading*. The author identifies the mysterious substance "gluten"** and explains its critical role in bread structure.

The work includes detailed kneading techniques†, window-pane tests††, and several warnings about over-kneading†††. Extensive footnotes discuss the philosophical question: "Can one knead too much?"‡

*The answer is: quite a lot, actually.

**Gluten was named after the word "glue" because it acts like glue. This is one of the few times in culinary history where scientists just described what something did instead of making up a complicated Latin name. The simplicity was initially met with suspicion.

†The author demonstrates seventeen different kneading methods, including the Fist Method, the Fold Method, the "Angry But Productive" Method, and the rarely-seen "Ballet-Inspired Graceful Kneading Technique" which produces excellent bread but requires years of dance training.

††The window-pane test determines if gluten is properly developed by stretching dough until you can see through it. If you cannot see through it, you must knead more. If it tears before becoming transparent, you were too aggressive. Baking is a journey of self-discovery.

†††Over-kneaded dough becomes tough and angry. It remembers your excessive enthusiasm and punishes your bread.

‡The author's conclusion after 400 pages: "Probably."`,
  abstract: 'The chemistry of flour proteins and gluten development through mechanical working.',
  published: false
};

export const PERFECT_BREAD_RECIPE: ResearchPaper = {
  paperId: 'perfect_bread_recipe',
  title: 'On the Mastery of Gluten Development: The Perfect Loaf',
  field: 'cuisine',
  paperSets: ['bread_baking'],
  prerequisitePapers: ['yeast_fermentation', 'flour_chemistry'],
  complexity: 5,
  minimumAge: 'adult',
  minimumSkills: { cooking: 20 },
  skillGrants: { cooking: 15, chemistry: 5 },
  contributesTo: [
    { type: 'recipe', recipeId: 'perfect_bread' }
  ],
  description: `A treatise on kneading, proofing, and achieving the perfect crust*. The author spent seventeen years perfecting this recipe**. Their family ate a lot of bread. Some of it was good.

The paper synthesizes yeast science and gluten chemistry into a comprehensive method for producing superior bread. Detailed instructions cover every stage: mixing***, bulk fermentation†, shaping††, final proof†††, and the critical moment of oven entry‡.

Of particular note is Chapter 7: "Why Your Bread Failed and How It's Probably Your Fault"‡‡.

*The crust must sing when tapped. If it does not sing, start over.

**Years 1-12 were failures. Year 13 was encouraging. Years 14-16 were inconsistent. Year 17 achieved perfection exactly once, which was enough to write this paper.

***The mixing stage is described as "deceptively simple" because the author wants to make you feel better about messing it up.

†Bulk fermentation is when you leave the dough alone and hope it does the right thing. Much of baking is carefully supervised hoping.

††Shaping requires a gentle touch and firm confidence, two qualities that are mutually exclusive in most bakers. This explains much.

†††The final proof is your last chance to ruin everything. Many take this opportunity.

‡Oven temperature debates occupy an entire appendix. The Discord Between the High-Heat Traditionalists and the Low-and-Slow Modernists has resulted in three baking guild schisms and one memorable duel with baguettes.

‡‡This chapter is surprisingly popular.`,
  abstract: 'Complete methodology for producing superior bread through controlled gluten development and fermentation timing.',
  published: false
};

export const SOURDOUGH_CULTIVATION: ResearchPaper = {
  paperId: 'sourdough_cultivation',
  title: 'Wild Fermentation: The Art of Sourdough Starter Maintenance',
  field: 'cuisine',
  paperSets: ['bread_baking'],
  prerequisitePapers: ['yeast_fermentation'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { cooking: 25 },
  skillGrants: { cooking: 20, nature: 10 },
  contributesTo: [
    { type: 'recipe', recipeId: 'sourdough_bread' }
  ],
  description: `On the cultivation of wild yeasts and the bonds formed between baker and starter*. The author chronicles thirty years of sourdough starter maintenance**, including the emotional journey of keeping something alive through feeding, patience, and occasional panic***.

The work establishes protocols for starter feeding, identification of health indicators†, recovery from neglect††, and the delicate art of sharing starter with friends who don't fully understand the responsibility they're accepting†††.

*Some bakers name their starters. The author does not judge, but notes that naming leads to attachment, which leads to guilt when traveling, which leads to bringing jars of fermenting flour paste on vacation. The cycle is well-documented.

**Thirty years. The starter is technically older than some of the author's relationships.

***The panic usually occurs when you realize you forgot to feed it and it's been 8 days and it smells different. Most starters survive this. Most.

†A healthy starter doubles in size predictably, smells pleasantly sour (not rancid), and has the consistency of thick pancake batter. An unhealthy starter demonstrates any number of concerning behaviors best not described in polite literature.

††Recovery from neglect involves patience, gentle feeding, and apologizing to a jar of fermented flour. Whether the apologies help is scientifically uncertain but emotionally necessary.

†††There is a chapter on politely declining when people ask "Can I have some of yours?" The chapter is titled "Why You Should Grow Your Own and Learn Responsibility." It has been called "harsh but fair."`,
  abstract: 'The cultivation and maintenance of wild yeast cultures for sourdough bread production.',
  published: false
};

export const STEAM_INJECTION_TECHNIQUE: ResearchPaper = {
  paperId: 'steam_injection_technique',
  title: 'On the Role of Steam in Crust Formation and Oven Spring',
  field: 'cuisine',
  paperSets: ['bread_baking'],
  prerequisitePapers: ['perfect_bread_recipe'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { cooking: 30 },
  skillGrants: { cooking: 20, construction: 5 },
  contributesTo: [
    { type: 'recipe', recipeId: 'artisan_bread' }
  ],
  description: `A study of moisture's role in achieving professional-quality crust and maximum oven spring*. The author tests seventeen methods of steam introduction**, from the simple (spray bottle) to the elaborate (custom steam injection apparatus***) to the inadvisable (bucket of water on oven floor†).

The paper establishes that steam delays crust formation, allowing bread to expand fully before the exterior sets. This principle, while simple, requires extensive equipment tinkering and mild burns to properly implement††.

*"Oven spring" is when bread dramatically expands in the first minutes of baking, like it's trying to escape. Good oven spring separates acceptable bread from transcendent bread.

**All seventeen methods worked to some degree. Three were dangerous. Two were impractical. One was accidentally brilliant.

***The custom apparatus involves copper tubes, precise timing, and looks like it should be producing either bread or moonshine. The author notes: "The complexity is part of the joy."

†This method produces excellent steam and an exciting but short-lived fire. Not recommended. Included for completeness.

††The author has scars. Artisan bread demands sacrifice.`,
  abstract: 'Steam injection techniques for achieving optimal crust development and oven spring in bread baking.',
  published: false
};

// ============================================================================
// BREAD BAKING RESEARCH SET
// ============================================================================

export const BREAD_BAKING_SET: ResearchSet = {
  setId: 'bread_baking',
  name: 'The Science of Bread',
  description: 'From yeast to perfect crust - the complete art of bread baking',
  field: 'cuisine',

  allPapers: [
    'yeast_fermentation',
    'flour_chemistry',
    'perfect_bread_recipe',
    'sourdough_cultivation',
    'steam_injection_technique'
  ],

  unlocks: [
    {
      technologyId: 'basic_baking',
      papersRequired: 2, // Need 2 of 5 papers
      mandatoryPapers: ['yeast_fermentation'], // Must understand yeast
      grants: [
        { type: 'building', buildingId: 'bakery' },
        { type: 'recipe', recipeId: 'simple_bread' }
      ]
    },
    {
      technologyId: 'artisan_baking',
      papersRequired: 4, // Need 4 of 5 papers
      mandatoryPapers: ['perfect_bread_recipe'], // Must have the perfect recipe
      grants: [
        { type: 'building', buildingId: 'artisan_bakery' },
        { type: 'ability', abilityId: 'master_baker' },
        { type: 'recipe', recipeId: 'perfect_bread' },
        { type: 'recipe', recipeId: 'sourdough_bread' },
        { type: 'recipe', recipeId: 'artisan_bread' }
      ]
    }
  ]
};

export const COOKING_PAPERS_EXAMPLE = [
  YEAST_FERMENTATION,
  FLOUR_CHEMISTRY,
  PERFECT_BREAD_RECIPE,
  SOURDOUGH_CULTIVATION,
  STEAM_INJECTION_TECHNIQUE
];
