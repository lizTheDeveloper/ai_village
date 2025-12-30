/**
 * Example: Magical Items and Crafting Documentation
 *
 * Documentation for magical items, spell effects, artifact creation,
 * and the various crafting systems that support magic.
 *
 * Uses the blended writing voices from WRITER_GUIDELINES.md.
 */

import { defineItem } from '../items/ItemDefinition.js';

// ============================================================================
// SPELL FOCUS ITEMS
// ============================================================================

export const DOCUMENTED_WIZARD_STAFF = defineItem('wizard_staff', 'Wizard\'s Staff', 'equipment', {
  weight: 2.0,
  stackSize: 1,
  baseValue: 500,
  rarity: 'uncommon',
  baseMaterial: 'wood',
  traits: {
    magical: {
      effects: ['amplify_spells:20%', 'reduce_cost:15%'],
      charges: 0, // No charges, passive bonus
      rechargeRate: 0,
      passive: true,
    },
    weapon: {
      damage: 8,
      damageType: 'bludgeoning',
      attackSpeed: 0.8,
      range: 1.5,
      durabilityLoss: 1,
    },
  },
  help: {
    id: 'wizard_staff',
    summary: 'Traditional focus for channeling and amplifying magical power',
    description: `The first thing they teach you at the Academy—after "don't summon what you can't banish" and "fire spreads"—is that magic flows better through appropriate channels. A staff is wood, living once, memory of growth and roots and reaching skyward. It remembers being connected to earth and air. When you channel mana through it, the wood recognizes the energy, guides it, amplifies it in ways your bare hands cannot.

Or so the theory goes. The reality, which every wizard discovers through practice, is that staves are partly tool and partly security blanket. Does the wood actually channel better? Yes, measurably, about 20% more efficient. Does the familiar weight in your hand, the ritual of drawing the staff from its resting place, the theatrical flourish of pointing it at your target—do these theatrical elements matter? Also yes, because magic responds to intention and a staff focuses intention the way a conductor's baton focuses an orchestra.

The traditional wizard's staff is approximately six feet of seasoned hardwood—oak for endurance, ash for flexibility, yew for transformation.* Each tradition has preferences backed by centuries of empirical testing and at least three competing theoretical frameworks that contradict each other but all produce working staves, which tells you something about magic's relationship with certainty.** Carved runes optional but recommended. Crystal focus at the tip optional but impressive. Height proportional to wizard also optional but universally practiced because apparently even mages care about aesthetics.

Practically speaking: a staff amplifies your spells' power by approximately 20% and reduces mana cost by 15%, which compounds over a career into the difference between "competent wizard" and "legendary archmage." It's also useful for walking, looking mysterious, and hitting things when magic fails. A well-crafted staff lasts decades if treated properly, develops a patina of accumulated spells, and eventually becomes semi-sentient in ways that are technically concerning but practically useful. Your staff will remember your most-used spells, sometimes helpfully, sometimes casting them at inopportune moments when you're just trying to stir your tea.

*Yew is traditional for necromancy, which is either because yew trees grow in graveyards or because necromancers have a collective aesthetic and won't admit it.

**The God of Magical Theory finds this deeply frustrating.`,
    category: 'items',
    subcategory: 'magical_focus',
    tags: ['magic', 'focus', 'staff', 'wizard', 'amplifier', 'tool'],
    obtainedBy: [
      'Craft at Enchanter\'s Workshop with seasoned wood and runic inscriptions',
      'Receive as graduation gift from Academy',
      'Find in ancient ruins (usually cursed)',
      'Inherit from deceased wizard (check for lingering personality first)',
    ],
    usedFor: [
      'Amplifying spell power (20% increase)',
      'Reducing mana costs (15% reduction)',
      'Focusing complex spells that require precision',
      'Looking appropriately mystical',
      'Walking assistance on long journeys',
      'Emergency weapon (8 damage, surprisingly effective)',
    ],
    crafting: {
      station: 'Enchanter\'s Workshop',
      ingredients: [
        { item: 'hardwood_timber', amount: 1 },
        { item: 'runic_chisel', amount: 1 },
        { item: 'mana_crystal', amount: 2 },
        { item: 'binding_oil', amount: 1 },
      ],
      skill: 'enchanting',
      skillLevel: 3,
    },
    qualityInfo: {
      min: 40,
      max: 100,
      effects: 'Quality affects amplification (40: +15%, 100: +25%) and durability. Higher quality staves develop helpful sentience faster.',
    },
    mechanics: {
      values: {
        spellAmplification: '20%',
        costReduction: '15%',
        durability: 'Very High',
        attunementTime: '1 week of daily use',
      },
      formulas: {
        actualAmplification: 'baseAmplification * (quality/70)',
        costReduction: 'baseCostReduction * (quality/70)',
        sentienceChance: 'spellsCast / 1000 * quality/100',
      },
      conditions: {
        'Requires attunement': 'Must bond with staff over 1 week before benefits activate',
        'One at a time': 'Can only be attuned to one focus item at once',
        'Sentience develops': 'After ~1000 spells, staff may develop personality',
      },
      dependencies: ['enchanting_skill', 'mana_manipulation'],
      unlocks: ['ritual_casting', 'spell_storage', 'staff_combat'],
    },
    tips: [
      'Attune your staff in the morning—rituals with consistent timing work better',
      'Name your staff, even if it embarrasses you; personalization strengthens the bond',
      'When staff develops sentience, negotiate early; first few months set the relationship',
      'Keep backup wand for emergencies; sentient staff can be opinionated about spell choice',
    ],
    warnings: [
      'Breaking your attuned staff causes temporary mana disruption (1-2 weeks recovery)',
      'Staff personality reflects your most-used spells; fire mages get aggressive staves',
      'Ancient staves from ruins often remember previous owners; this can be helpful or haunting',
      'Never let someone else cast through your staff without permission—it confuses the attunement',
    ],
    examples: [
      {
        title: 'First Attunement',
        description:
          'You carved the runes yourself, following the patterns from dusty textbooks. The staff is simple oak, unadorned except for your careful inscriptions. The instructor says to channel mana slowly, let the wood learn your signature. You do. For days, nothing changes—it\'s just a stick. Then, during morning practice, you cast a basic shield spell and the staff hums, a subtle vibration in your palm. The spell forms faster, cleaner, stronger. The wood has learned you. You\'ve learned the wood. This is your staff now, and the partnership will last decades if you\'re lucky, if you\'re careful, if you treat it right.',
      },
      {
        title: 'The Opinionated Companion',
        description:
          'After fifteen years, your staff has opinions. Strong ones. It likes fire spells—you cast a lot of those—and will eagerly channel flames at the slightest provocation. It tolerates healing magic but adds unnecessary sparks to the spell matrix, which doesn\'t hurt but looks concerning to patients. It absolutely refuses to channel divination, simply won\'t cooperate, makes the wood go inert in your hands. You\'ve learned to work with it, mostly. Sometimes you argue, mentally, about spell choice. Other wizards think you\'re eccentric. They\'re right, but the staff is loyal, powerful, and occasionally saves your life by casting shields you forgot to raise. You\'ll take opinionated over obedient any day.',
      },
    ],
    relatedTopics: [
      'focus_items',
      'attunement_process',
      'enchanting_basics',
      'staff_sentience',
      'magical_traditions',
    ],
  },
});

// ============================================================================
// BLOOD MAGIC ARTIFACTS
// ============================================================================

export const DOCUMENTED_BLOOD_CRYSTAL = defineItem('blood_crystal', 'Blood Crystal', 'material', {
  weight: 0.3,
  stackSize: 10,
  baseValue: 800,
  rarity: 'rare',
  traits: {
    magical: {
      effects: ['store_blood_power:100', 'amplify_blood_magic:30%'],
      charges: 10,
      rechargeRate: 0, // Must be charged with blood
      passive: false,
    },
  },
  help: {
    id: 'blood_crystal',
    summary: 'Crystallized life force used to store and amplify blood magic',
    description: `Blood crystallizes when you pour enough life force into a binding matrix quickly enough that reality doesn't have time to notice what you're doing. The result is a deep crimson gem that hums faintly against your palm, warm like body temperature, pulsing like a heartbeat that isn't yours.

The Crimson Codex describes blood crystals in clinical terms: "A storage medium for hemomantic energy, capable of containing up to 100 units of blood-equivalent power with minimal degradation." Which is accurate but misses the visceral truth: you're holding someone's life. Might be yours—most blood mages self-harvest for obvious ethical reasons—but it's still pieces of mortality trapped in crystalline form, ready to be spent like currency.

Here's how they work: you bleed into the matrix (carefully, specifically, usually with a ritual blade designed for this exact purpose). The blood doesn't stay liquid—it transforms, energy separating from matter, the life force crystallizing into the gem while the physical blood... goes away. Somewhere. The Codex is vague on this point and blood mages don't ask too closely because the answer is probably unsettling. The crystal glows brighter with each charging, pulsing in sync with your heartbeat when you hold it, recognizing its source.

In practical terms, a blood crystal is a battery. Charge it when you're safe and healthy, spend it when you're desperate and endangered. Each crystal holds about ten charges—ten times you can cast blood magic without cutting yourself in combat, which is the difference between "controlled practitioner" and "bleeding maniac in the middle of battle."* The crystal also amplifies blood spells by 30%, which compounds with the power you get from the blood itself. Math gets brutal quickly. A well-charged crystal can fuel magic far beyond what most mages achieve, which is why they're banned in seven kingdoms** and highly regulated in all the rest.

The crystals degrade slowly. Each use wears the matrix slightly, and eventually—after perhaps a thousand charges—the crystalline structure fails. The stored power releases all at once, which is spectacular if you're ready for it and fatal if you're not. Wise blood mages track their crystal's degradation carefully, replace them before catastrophic failure, and dispose of old crystals with appropriate reverence for the literal life-years they contained.

*Every blood mage has exactly one story about learning this distinction the hard way. Nobody tells these stories at parties.

**Eight kingdoms if you count the Disputed Territories, but nobody counts the Disputed Territories for anything official.`,
    category: 'items',
    subcategory: 'blood_magic',
    tags: ['blood', 'magic', 'crystal', 'storage', 'dangerous', 'powerful', 'rare'],
    obtainedBy: [
      'Craft at Blood Altar using your own blood and crystal matrix',
      'Inherit from blood mage mentor (must re-attune to your blood)',
      'Purchase from underground markets (legality varies by region)',
      'Find in ruins of blood mage sanctuaries (often cursed)',
    ],
    usedFor: [
      'Storing blood power for later use (10 charges maximum)',
      'Amplifying blood magic spells (30% power increase)',
      'Emergency power source during combat',
      'Fuel for large rituals without immediate self-sacrifice',
    ],
    crafting: {
      station: 'Blood Altar',
      ingredients: [
        { item: 'crystal_matrix', amount: 1 },
        { item: 'ritual_blade', amount: 1 },
        { item: 'binding_runes', amount: 3 },
        { item: 'your_blood', amount: 10 }, // Symbolic amount
      ],
      skill: 'blood_magic',
      skillLevel: 4,
    },
    qualityInfo: {
      min: 50,
      max: 100,
      effects: 'Quality affects storage capacity (50: 8 charges, 100: 12 charges), amplification (50: +25%, 100: +35%), and crystal lifespan.',
    },
    mechanics: {
      values: {
        maxCharges: 10,
        amplification: '30%',
        chargeCost: '10 health per charge',
        degradationRate: '0.1% per use',
        explosionRadius: '10 feet at failure',
      },
      formulas: {
        storedPower: 'healthSpent * bloodlineMultiplier * crystalQuality',
        amplificationBonus: 'baseAmplification * (quality/70)',
        degradationProgress: 'totalUses * 0.001',
        failureChance: 'degradationProgress > 1.0 ? 100% : 0%',
      },
      conditions: {
        'Must attune to user': 'Only works with the blood of the attuned user',
        'Charges with health': 'Each charge costs 10 health points',
        'Eventually fails': 'Crystal degrades and will eventually explode',
        'Cannot be stolen effectively': 'Attuned to owner; useless to others',
      },
      dependencies: ['blood_magic_skill', 'ritual_blade', 'blood_altar_access'],
      unlocks: ['sustained_blood_magic', 'combat_casting', 'ritual_magic'],
    },
    tips: [
      'Charge crystals after resting, when health is full—never charge while wounded',
      'Track uses carefully; degradation is cumulative and failure is catastrophic',
      'Keep multiple crystals for different purposes: combat, ritual, emergency',
      'Higher quality crystals last longer but cost more blood per charge to utilize fully',
    ],
    warnings: [
      'Crystal failure releases all stored energy explosively—10-foot radius, severe blood damage',
      'Charging beyond maximum capacity causes immediate explosion—do not test this',
      'Attuning a new crystal requires replacing your blood; old attunement must be severed first',
      'Each charge permanently converts health to power—heal fully before repeating',
      'Degradation accelerates near end of lifespan—final 100 uses are increasingly unstable',
    ],
    examples: [
      {
        title: 'The Emergency',
        description:
          'Ambushed, outnumbered, bleeding from a wound you can\'t afford to make worse. You could cast blood magic, cut yourself again, add injury to injury. Or: you reach for the crystal, feel it pulse warm against your palm. Ten charges stored, ten spells you prepared for exactly this moment. The power flows clean and ready, no fresh pain, no additional sacrifice. Just stored life force, spent wisely. You burn through three charges in rapid succession—shield, drain, blast. The attackers fall. You survive. Later, you\'ll recharge the crystal, pay the health cost in safety. Right now, you\'re alive because you planned ahead. This is why you carry crystals.',
      },
      {
        title: 'The Final Charge',
        description:
          'Your mentor\'s crystal sits heavy in your hand. She\'d tracked its degradation meticulously: 987 uses, degradation at 98.7%, maybe a dozen charges left before catastrophic failure. She spent the last three charges saving your life, then handed you the crystal with instructions: "Use the final charge for something worthy. Then let it rest." You\'ve carried it for six months, unable to decide what qualifies as worthy. Today—village under attack, children trapped, no other options—you know. You channel the last charge, feel the crystal flare hot, pour its accumulated power into a shield that holds just long enough. The crystal shatters in your palm, warm fragments scattering. You bleed from a dozen tiny cuts. You\'re crying and you don\'t know if it\'s grief or gratitude or both. The children live. It was worthy.',
      },
    ],
    relatedTopics: [
      'blood_magic_paradigm',
      'ritual_blade',
      'blood_altar',
      'crystal_degradation',
      'attunement_process',
    ],
  },
});

// ============================================================================
// ARTIFACT CREATION
// ============================================================================

export const ARTIFACT_CREATION_HELP = {
  id: 'artifact_creation',
  summary: 'Permanent enchantment of items with magical properties',
  description: `Artifacts are objects that remember being magic strongly enough to stay magic. Most enchantments are temporary—cast a fire spell on a sword, it burns for a day, a week, then fades. The mana dissipates, reality reasserts, the sword becomes mundane again. Artifacts don't fade. The magic is bound so deeply into the object's nature that removing it would unmake the object entirely.

Creating an artifact requires understanding the thing you're enchanting at a fundamental level. Not just "this is a sword" but the specific history of this sword: the ore that became the steel, the smith who forged it, the battles it's seen, the hands that wielded it. You're not adding magic to an object—you're convincing the object that magic is part of its essential nature, always was, should have been all along.

The traditional method* uses a three-layer binding: First, prepare the object through ritual (cleaning, consecrating, establishing intent). Second, channel power into it continuously for hours or days, depending on complexity, until the object's metaphysical structure accepts the energy as foundational. Third, seal the binding with True Name magic—speaking the object's name-to-be, the identity it will carry forward, the thing it is becoming. Get any step wrong and the magic fades normally, or worse, the object shatters from incompatible energies.

Artifacts develop quirks. Personalities, preferences, opinions about their use. This is not a flaw—it's proof the enchantment worked. An object that accepts magic deeply enough to become an artifact has, in the process, gained the beginnings of consciousness. Most artifacts are subtle about it: a sword that cuts better against particular enemies, a cloak that always seems to have the perfect pocket for what you need, a ring that warms when danger approaches. Others are more obviously sentient and have strong opinions about everything.**

The Enchanter's Guild tracks known artifacts with bureaucratic intensity: approximately 4,700 major artifacts (world-shaking power), 28,000 minor artifacts (useful but not legendary), and uncounted thousands of trivial artifacts (enchanted spoons that stir themselves, self-warming socks, etc.). Creating new artifacts is legal but regulated, because artifacts persist and proliferate and eventually you have markets flooded with semi-sentient spoons that won't stir soup they consider beneath their dignity.

*There are forty-seven documented "traditional methods," three of which actually work reliably, nineteen of which work sometimes, and twenty-five of which are pure superstition that persist because wizards are stubborn.

**The Sword of Ethical Quandaries refuses to draw unless the wielder can justify their cause in a three-point argument. Nobody knows who created it. Everyone wishes they hadn't.`,
  category: 'magic',
  subcategory: 'crafting',
  tags: ['artifact', 'enchanting', 'crafting', 'permanent', 'powerful'],
  mechanics: {
    values: {
      minimumCraftingTime: '24 hours continuous',
      manaCost: '500-5000 depending on power',
      successRate: '60% for skilled enchanters',
      failureConsequences: 'Item destroyed or unstable enchantment',
    },
    formulas: {
      successProbability: '(enchantingSkill * objectQuality * timeInvested) / complexity',
      artifactPower: 'manaInvested * (bindingStrength/100) * objectResonance',
      quirkDevelopment: 'power * timeUsed * ownerPersonality',
    },
    conditions: {
      'Requires deep understanding': 'Must know object\'s history and nature',
      'Time intensive': 'Cannot rush; minimum 24 hours for simple items',
      'High mana cost': 'Creates permanent drain on creator during binding',
      'Quirks develop inevitably': 'All artifacts eventually gain personality',
    },
    dependencies: ['enchanting_mastery', 'true_name_knowledge', 'ritual_space'],
  },
  tips: [
    'Start with objects you\'ve used extensively—familiarity increases success rate',
    'Document the binding process; successful techniques can be repeated',
    'Accept quirks early; fighting an artifact\'s developing personality makes it worse',
    'Quality of base item matters; poor materials make unstable artifacts',
  ],
  warnings: [
    'Failed bindings can destroy irreplaceable items—practice on common objects first',
    'Artifact quirks reflect creator\'s subconscious; you\'re putting yourself into it',
    'Powerful artifacts attract attention—thieves, collectors, cosmic entities',
    'Cannot unbind an artifact without destroying it; enchantment is permanent',
    'Sentient artifacts can refuse to function; relationship maintenance is required',
  ],
  examples: [
    {
      title: 'First Artifact',
      description:
        'Your practice sword—the one from training, nicked and worn from a thousand forms. You know every scratch, every balance point, every way it moves. You speak its name-to-be: "Faithful." The binding takes thirty-six hours. You channel mana until you\'re hollow, until the sword glows, until reality bends around the blade and accepts what you\'re declaring: this sword is magic, always was, will be forever. The glow fades. The sword looks unchanged. Then you test it and the blade cuts practice dummies like they\'re air, never dulls, feels lighter in your hand but heavier against targets. Success. Your first artifact. And it knows you, now, remembers your hand specifically, will never feel quite right for anyone else.',
    },
    {
      title: 'The Opinionated Cloak',
      description:
        'You enchanted the cloak for warmth—simple utility, basic binding, nothing fancy. It worked. Too well. The cloak now has opinions about temperature. It considers anything above 60°F unnecessary and refuses to provide warmth. Below that, it\'s perfect—adapts to conditions, keeps you comfortable in blizzards, never fails. But summertime? The cloak goes inert. You\'ve argued with it mentally. The cloak doesn\'t care. This is not what you intended but it\'s what you got: an artifact with very specific ideas about appropriate weather. Other enchanters find this hilarious. You wear a regular cloak in summer and pretend this doesn\'t bother you.',
    },
  ],
  relatedTopics: [
    'enchanting_basics',
    'true_names',
    'object_sentience',
    'artifact_registry',
    'unbinding_attempts',
  ],
};
