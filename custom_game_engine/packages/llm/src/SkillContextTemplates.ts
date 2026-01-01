/**
 * SkillContextTemplates - Provides skill-level-appropriate context for LLM prompts
 *
 * Higher skill levels receive more detailed, expert-level knowledge.
 * Based on skill-system/spec.md Phase 2.
 */

import type { SkillId, SkillLevel } from '@ai-village/core';

/**
 * Context templates for each skill at each level.
 * Level 0 = no context, Level 5 = master-level knowledge.
 */
type SkillContextMap = Record<SkillId, Record<SkillLevel, string | null>>;

/**
 * Skill context templates providing domain knowledge.
 */
export const SKILL_CONTEXTS: SkillContextMap = {
  building: {
    0: null,
    1: 'You have basic construction knowledge. Buildings need foundations and materials.',
    2: `You understand construction basics:
- Walls need support structures
- Different materials have different strengths
- Weather affects building durability`,
    3: `Your building expertise includes:
- Material efficiency calculations
- Structural load distribution
- Climate-appropriate designs
- Tool selection for different tasks
You can identify suboptimal construction and suggest improvements.`,
    4: `As an expert builder, you understand:
- Advanced structural engineering principles
- Material science and optimal combinations
- Efficient construction sequencing
- Quality vs speed tradeoffs
- Common failure points and prevention
You can plan complex multi-stage construction projects.`,
    5: `As a master builder, you possess comprehensive architectural knowledge:
- Innovative construction techniques
- Material substitution strategies
- Long-term durability optimization
- Teaching and mentoring approaches
- Legacy building design principles
You can design structures that will last generations and train others.`,
  },

  architecture: {
    0: null,
    1: 'You notice some buildings feel more comfortable than others.',
    2: `You're learning spatial harmony (Feng Shui):
- Energy (chi) should flow smoothly through spaces
- Avoid long straight lines from entrances (creates Sha Qi - killing breath)
- Stagnant corners collect negative energy
- Room proportions affect how people feel`,
    3: `Your spatial harmony skills include:
- Detecting chi flow problems in buildings
- Understanding the five element balance (wood, fire, earth, metal, water)
- Knowing that beds and desks need "commanding positions" (wall behind, view of door)
- Recognizing proportions near the golden ratio (1.618) as most pleasing
- Identifying clashing vs harmonious district adjacencies`,
    4: `As an architecture expert, you understand:
- Full Feng Shui analysis of any building
- How to improve harmony through furniture placement
- Element balance at both building and city scale
- Design principles that make occupants happier and more productive
- Ming Tang (bright hall) central plaza design for cities
- Dragon vein chi flow through urban layouts`,
    5: `As a master architect, you can:
- Design buildings with sublime harmony (90+ score)
- Plan cities with optimal chi circulation
- Balance the five elements across settlements
- Create spaces that heal and inspire
- Teach spatial harmony principles to others
- Sense energy imbalances instantly from afar
You can design legendary structures that become places of pilgrimage.`,
  },

  farming: {
    0: null,
    1: 'You know the basics of farming. Plants need water and sunlight to grow.',
    2: `You understand farming fundamentals:
- Soil preparation improves yields
- Different crops have different needs
- Watering timing matters`,
    3: `Your farming knowledge includes:
- Crop rotation benefits
- Optimal planting seasons
- Pest recognition and basic management
- Soil quality assessment
- Seed selection for conditions`,
    4: `As an expert farmer, you know:
- Advanced irrigation techniques
- Companion planting synergies
- Disease prevention and treatment
- Yield optimization strategies
- Seed saving and breeding basics`,
    5: `As a master farmer, you understand:
- Sustainable farming systems
- Microclimate management
- Selective breeding for traits
- Teaching farming techniques
- Long-term soil health management
You can develop new crop varieties and train apprentices.`,
  },

  gathering: {
    0: null,
    1: 'You can identify basic resources. Trees provide wood, rocks provide stone.',
    2: `You know gathering basics:
- Tool selection affects efficiency
- Resource quality varies
- Some sources regenerate over time`,
    3: `Your gathering expertise includes:
- Optimal harvesting techniques
- Resource location patterns
- Tool maintenance for longevity
- Yield maximization methods`,
    4: `As an expert gatherer, you know:
- Rare resource identification
- Seasonal availability patterns
- Sustainable harvesting practices
- Advanced tool techniques`,
    5: `As a master gatherer, you understand:
- Ecosystem resource cycles
- Teaching efficient techniques
- Resource conservation strategies
- Finding hidden resource deposits
You can locate resources others cannot find.`,
  },

  cooking: {
    0: null,
    1: 'You can prepare basic food. Cooking makes food safer and more nutritious.',
    2: `You understand cooking basics:
- Heat control affects results
- Ingredient combinations matter
- Timing is important for texture`,
    3: `Your cooking knowledge includes:
- Recipe modification techniques
- Flavor balancing principles
- Preservation methods
- Nutrition optimization`,
    4: `As an expert cook, you know:
- Advanced cooking techniques
- Ingredient substitutions
- Batch cooking efficiency
- Creating satisfying meals from limited ingredients`,
    5: `As a master chef, you understand:
- Innovative recipe creation
- Teaching culinary arts
- Meal planning for groups
- Special dietary adaptations
You can create memorable meals and train others.`,
  },

  crafting: {
    0: null,
    1: 'You can make simple items. Basic tools require wood and stone.',
    2: `You understand crafting basics:
- Material quality affects results
- Tool selection matters
- Some crafts require specific stations`,
    3: `Your crafting expertise includes:
- Material efficiency techniques
- Quality assessment
- Recipe improvisation
- Tool upgrading paths`,
    4: `As an expert crafter, you know:
- Advanced material combinations
- Precision techniques
- Complex multi-step crafts
- Quality optimization`,
    5: `As a master crafter, you understand:
- Creating new designs
- Material innovation
- Teaching craft techniques
- Legendary item creation
You can invent new recipes and train apprentices.`,
  },

  social: {
    0: null,
    1: 'You can have basic conversations. Being polite helps interactions.',
    2: `You understand social dynamics:
- Listening improves relationships
- Different people have different needs
- Cooperation benefits everyone`,
    3: `Your social skills include:
- Conflict resolution basics
- Negotiation techniques
- Reading emotional cues
- Building trust over time`,
    4: `As a social expert, you know:
- Advanced persuasion techniques
- Group dynamics management
- Leadership strategies
- Mediating complex disputes`,
    5: `As a social master, you understand:
- Inspiring and motivating others
- Building lasting communities
- Teaching social skills
- Resolving deep-rooted conflicts
You can unite diverse groups and mentor future leaders.`,
  },

  exploration: {
    0: null,
    1: 'You know to look around carefully. New areas may have resources.',
    2: `You understand exploration basics:
- Landmarks help navigation
- Different biomes have different resources
- Danger signs to watch for`,
    3: `Your exploration expertise includes:
- Efficient search patterns
- Mental mapping techniques
- Risk assessment
- Resource probability estimation`,
    4: `As an expert explorer, you know:
- Advanced navigation techniques
- Hidden location indicators
- Survival in harsh conditions
- Optimal route planning`,
    5: `As a master explorer, you understand:
- Discovering hidden treasures
- Teaching navigation
- Mapping unknown territories
- Finding the unfindable
You can locate things others have missed entirely.`,
  },

  combat: {
    0: null,
    1: 'You know basic self-defense. Flee from dangers you cannot handle.',
    2: `You understand combat basics:
- Weapon selection matters
- Positioning affects outcomes
- Know when to retreat`,
    3: `Your combat skills include:
- Tactical positioning
- Threat assessment
- Defensive techniques
- Basic weapon proficiency`,
    4: `As a combat expert, you know:
- Advanced fighting techniques
- Multiple opponent handling
- Armor and weapon optimization
- Battle strategy`,
    5: `As a combat master, you understand:
- Training others in combat
- Tactical leadership
- Weapon mastery
- Protecting the community
You can defend the village and train warriors.`,
  },

  animal_handling: {
    0: null,
    1: 'You know animals can be tamed. Approach them carefully and offer food.',
    2: `You understand animal basics:
- Different species have different needs
- Patience is essential
- Housing improves animal welfare`,
    3: `Your animal handling includes:
- Reading animal behavior
- Taming techniques by species
- Housing optimization
- Basic breeding principles`,
    4: `As an animal expert, you know:
- Advanced taming strategies
- Selective breeding
- Animal health management
- Maximizing production`,
    5: `As an animal master, you understand:
- Creating new breeding lines
- Training complex behaviors
- Teaching animal husbandry
- Animal welfare optimization
You can breed superior animals and train handlers.`,
  },

  hunting: {
    0: null,
    1: 'You know basics of hunting. Animals can be tracked and hunted for food.',
    2: `You understand hunting fundamentals:
- Animal tracks indicate recent passage
- Wind direction affects detection
- Different animals have different behaviors`,
    3: `Your hunting knowledge includes:
- Tracking techniques in various terrain
- Prey behavior patterns
- Optimal hunting times
- Basic butchering methods`,
    4: `As an expert hunter, you know:
- Advanced tracking across all terrain
- Predicting animal movements
- Dangerous prey handling
- Efficient resource extraction`,
    5: `As a master hunter, you understand:
- Ecosystem balance and sustainable hunting
- Training others in hunting techniques
- Tracking in any conditions
- Hunting legendary beasts
You can track prey others cannot find.`,
  },

  stealth: {
    0: null,
    1: 'You know basics of stealth. Moving quietly helps avoid detection.',
    2: `You understand stealth fundamentals:
- Terrain affects noise and visibility
- Timing movement with distractions
- Staying downwind of targets`,
    3: `Your stealth knowledge includes:
- Silent movement techniques
- Using shadows and cover
- Minimizing visual profile
- Reading patrol patterns`,
    4: `As a stealth expert, you know:
- Advanced concealment methods
- Blending into environments
- Precise timing for movements
- Evading pursuit`,
    5: `As a master of stealth, you understand:
- Becoming invisible in plain sight
- Teaching stealth techniques
- Infiltration planning
- Counter-detection methods
You can move unseen through any environment.`,
  },

  medicine: {
    0: null,
    1: 'You know basic first aid. Rest and clean water help healing.',
    2: `You understand medicine basics:
- Common ailments and symptoms
- Herbal remedies exist
- Prevention is important`,
    3: `Your medical knowledge includes:
- Diagnosis techniques
- Treatment protocols
- Medicinal plant identification
- Wound care`,
    4: `As a medical expert, you know:
- Complex treatment plans
- Preventive medicine
- Emergency care
- Health optimization`,
    5: `As a master healer, you understand:
- Advanced healing techniques
- Teaching medical knowledge
- Community health management
- Rare treatment methods
You can cure the incurable and train physicians.`,
  },

  research: {
    0: null,
    1: 'You understand that careful study can lead to new discoveries. Observation and experimentation matter.',
    2: `You grasp research fundamentals:
- Systematic observation techniques
- Recording and comparing results
- Building on existing knowledge`,
    3: `Your research skills include:
- Hypothesis formation and testing
- Identifying patterns in data
- Connecting disparate ideas
- Research methodology`,
    4: `As a research expert, you know:
- Advanced experimental design
- Knowledge synthesis across domains
- Innovation through systematic exploration
- Research project management`,
    5: `As a master researcher, you possess:
- Groundbreaking discovery methods
- Teaching research techniques
- Building research institutions
- Pushing the boundaries of knowledge
You can unlock transformative technologies and mentor future scholars.`,
  },
};

