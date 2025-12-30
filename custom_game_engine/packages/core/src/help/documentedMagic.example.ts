/**
 * Example: Magic Systems with Embedded Documentation
 *
 * This file demonstrates how to document magic paradigms, spells, and magical
 * items using the blended writing voices from WRITER_GUIDELINES.md.
 *
 * Each entry combines:
 * - Voice 1 (Baroque Encyclopedist) for lore and history
 * - Voice 2 (Cosmic Pragmatist) for mechanics
 * - Voice 3 (Humane Satirist) for social context
 * - Voice 4 (Quiet Mythweaver) for transformation and mystery
 */

import { createEffectHelp } from './HelpEntry.js';

// ============================================================================
// ACADEMIC MAGIC PARADIGM
// ============================================================================

export const ACADEMIC_PARADIGM_HELP = createEffectHelp('academic_magic', {
  summary: 'The scholarly tradition of mana manipulation through study',
  description: `The first time you feel mana move through your body, it arrives not as power but as recognition—the moment you realize that the universe has been speaking a language you simply hadn't learned to hear. The Academies have spent three thousand years* cataloging this language, reducing cosmic forces to theorems, turning raw wonder into something teachable.

Which is either the greatest achievement of mortal scholarship or the universe's most elaborate exercise in missing the point, depending on whom you ask.** The great wizard-scholars would have you believe magic is a science: predictable, testable, safe. They've written approximately forty-seven thousand textbooks on proper mana circulation, another twelve thousand on wand ergonomics, and one very slim volume on what to do when it all goes horribly wrong (answer: apologize profusely and file form 77-B).

The truth—which every first-year student discovers while trying not to set their robes on fire—is that magic is both utterly systematic and profoundly personal. The formulas work, but they work differently for everyone, the way a recipe might produce bread for you and sentient sourdough that files noise complaints for your roommate. Still, the Academies persist, because someone has to keep the knowledge, and because teaching magic badly is marginally better than the alternative: everyone figuring it out on their own and probably summoning something regrettable.

*Give or take a millennium. Wizard historians are notoriously bad at calendar reform.

**Usually a bitter dropout who couldn't pass Advanced Metaphysical Geometry and now lives in a cave making ominous pronouncements.`,
  category: 'magic',
  tags: ['academic', 'mana', 'paradigm', 'teaching', 'safe', 'scholarly'],
  effectCategory: 'paradigm',
  targetType: 'self',

  mechanics: {
    values: {
      source: 'internal mana pool',
      regeneration: 'rest (8 hours)',
      regenRate: 0.01,
      detectability: 'subtle',
    },
    formulas: {
      spellPower: 'basePower * (1 + proficiency/100) * qualityMultiplier',
      manaCost: 'baseCost * (1 - mastery/200)',
      criticalFailure: '5% chance on overreach',
    },
    conditions: {
      'Requires study': 'Minimum 6 months of training to access first techniques',
      'Verbal component': 'Silencing prevents casting unless mastered',
      'Somatic component': 'Binding hands reduces power by 50% unless mastered',
    },
    dependencies: ['literacy', 'teacher_or_grimoire'],
    unlocks: ['enchantment', 'scroll_creation', 'ritual_circles', 'mana_sight'],
  },

  tips: [
    'Keep a spellbook. Memorizing everything is technically possible but nobody actually does it',
    'Practice basic cantrips until they\'re automatic—you\'ll thank yourself when something is actively trying to eat you',
    'The Academy frowns on "experimental modifications" to established spells, which is exactly why you should try them (carefully) (very carefully)',
    'Mana regenerates faster near ley lines, but so does everyone else\'s magic, including the thing you\'re probably fighting',
  ],

  warnings: [
    'Casting while exhausted increases critical failure chance from 5% to 35%—yes, that\'s bad',
    'The phrase "I can probably handle it" has preceded 73% of catastrophic magical accidents',
    'Summoning spells persist even if you die, which is awkward if you summoned something mean',
  ],

  examples: [
    {
      title: 'The First Spell',
      description:
        'Your instructor draws a simple glyph in chalk and asks you to light it. Just channel a thread of mana—the tiniest whisper—into the circle. Easy. Except mana doesn\'t whisper for beginners; it shouts, floods, ignites. The glyph flares bright enough to leave afterimages. Your instructor sighs. "Again," she says. "Gentler this time." Mastery, you learn, is not about power. It\'s about restraint.',
    },
    {
      title: 'Why We Study',
      description:
        'During the Cascade of 1247, a self-taught hedge mage attempted what he called "intuitive fire-weaving" near the capital. Three city blocks vanished in a resonance feedback loop that took six Archmages two weeks to contain. The Academy uses this as a cautionary tale, though they\'re less forthcoming about similar incidents caused by graduates who technically knew what they were doing but did it anyway.',
    },
  ],

  relatedTopics: [
    'mana_crystal',
    'spellbook',
    'focus_item',
    'ley_lines',
    'metamagic',
    'ritual_magic',
  ],
});

// ============================================================================
// BLOOD MAGIC PARADIGM
// ============================================================================

export const BLOOD_MAGIC_HELP = createEffectHelp('blood_magic', {
  summary: 'Power drawn from life itself—yours or others',
  description: `Blood remembers. This is not metaphor. Under magnification, blood cells carry the echo of every ancestor, every choice, every moment of transformation. Blood magic is the practice of speaking to that memory, of paying for power with the only currency that truly matters: life itself.

The Crimson Codex* distinguishes between three schools of hemomancy, which is pleasantly academic right up until you remember you're categorizing methods of controlled self-harm. The First School trades small amounts—a pricked finger, a measured ounce—for modest effects. Sustainable, recoverable, ethically uncomplicated assuming you're only bleeding yourself. The Second School goes deeper: significant wounds for significant power, blood enough to feel the loss, to walk away dizzy and wondering if it was worth it.** The Third School is rarely written about, for obvious reasons, though every practitioner knows it exists: the place where power and cost blur into something nobody wants to examine too closely.

Here's what the texts don't tell you: the first time you draw your own blood for magic, something shifts. Not in the world—in you. You've crossed a threshold that doesn't have a door on the other side. The power is immediate, visceral, undeniable. No study required, no talent check, just need and will and the understanding that you contain everything necessary for miracles, if you're willing to pay the asking price. Some people spend their whole lives trying to find that kind of certainty. Blood mages wake up with it every morning, feeling their pulse, doing arithmetic.

*Authorship unknown. It simply appeared in the Great Library one morning, already old, already bloodstained.

**Spoiler: sometimes yes, sometimes no, usually you won't know until much later.`,
  category: 'magic',
  tags: ['blood', 'paradigm', 'sacrifice', 'visceral', 'dangerous', 'powerful'],
  effectCategory: 'paradigm',
  targetType: 'self_or_target',

  mechanics: {
    values: {
      source: 'blood (health)',
      scaling: 'exponential',
      detectability: 'obvious (visible wounds)',
    },
    formulas: {
      powerGained: 'healthSpent * bloodlineMultiplier * desperation',
      healthCost: 'baseCost * (1 - painTolerance/100)',
      corruptionRisk: '(cumulativeBloodSpent / maxHealth) * 100',
    },
    conditions: {
      'No mana required': 'Uses health directly as fuel',
      'Instant casting': 'No verbal or somatic components needed',
      'Cumulative corruption': 'Each use increases dark transformation risk',
      Terminal: 'Can kill caster if health reaches 0',
    },
    dependencies: ['knife_or_ritual_blade', 'will_to_harm_self'],
    unlocks: ['blood_bonds', 'life_drain', 'corpse_animation', 'blood_sight'],
  },

  tips: [
    'Keep healing supplies close. You\'re going to need them',
    'The stronger your bloodline, the more power per drop—heredity matters in ways the academics hate',
    'Small cuts heal. Large wounds scar. Scars remember. Plan accordingly',
    'Never cast blood magic angry. Desperation amplifies power but rage makes you sloppy',
  ],

  warnings: [
    'Corruption is cumulative and permanent—there\'s no "healing" your way back to who you were',
    'Life drain feels different than you expect: you take their years but also their exhaustion, their pain, their regrets',
    'The Third School has a 100% mortality rate among practitioners, though timelines vary',
    'Every blood mage eventually faces the arithmetic: is this spell worth dying for? Answer carefully',
  ],

  examples: [
    {
      title: 'The First Cut',
      description:
        'Your hand shakes, which is reasonable—you\'re about to slice your palm open on purpose. The ritual blade feels heavier than it should. Then the pain, sharp and clarifying, and the blood wells dark and rich. For a moment you panic, thinking you\'ve gone too deep, but then you feel it: power rising like breath, like heat, like coming home to a place you\'ve never been. The wound closes itself, flesh knitting wrong but functional. You\'re breathing hard and grinning and terrified. You\'ve found the easy path. That\'s the problem.',
    },
    {
      title: 'The Arithmetic',
      description:
        'The ritual requires a pint. You have maybe eight in your body total, can afford to lose two before things get dangerous, one before you\'re noticeably impaired. Simple math. The village needs protection—bandits coming, guards three days away. You measure carefully into the bowl, watch it fill dark and true. The wards rise like walls of ruby light. You stand watch that night, dizzy, triumphant, needed. In the morning, the village elder thanks you, means it, doesn\'t ask what it cost. You don\'t tell her. This is what responsibility looks like, sometimes: knowing exactly how much of yourself you can spend and choosing to spend it anyway.',
    },
  ],

  relatedTopics: [
    'life_drain',
    'blood_bonds',
    'healing_magic',
    'corruption',
    'ritual_sacrifice',
    'vampirism',
  ],
});

// ============================================================================
// TRUE NAME MAGIC
// ============================================================================

export const TRUE_NAME_MAGIC_HELP = createEffectHelp('true_name_magic', {
  summary: 'Speaking the secret words that define reality',
  description: `Names are not labels. They are definitions, declarations, the words reality speaks to itself in the dark. To know a thing's True Name is to understand it at a level that precedes existence—to grasp not what it is but what it must be, has always been, cannot choose not to be.

The Old Language* has forty-seven grammatical cases, six of which describe states of being that don't exist in normal time, and one—the Inevitable Declension—that makes the listener's ears bleed if pronounced incorrectly. It's not a language designed for mortal mouths. We speak it anyway, because the alternative is not knowing, and humans are catastrophically bad at accepting that some doors should stay closed.

Here's what happens when you speak a True Name: the thing named stops pretending. A chair is usually content to be "chair"—the casual designation, the everyday understanding. But speak its Name and suddenly it remembers it's also "the ash-tree-that-burned, shaped-by-the-widow's-hands, witness-to-three-hundred-conversations." The chair becomes more real, which is overwhelming for the chair and frankly uncomfortable for everyone in the room. Imagine that happening to a person. Now imagine that you're the one who did it, and they're looking at you with eyes that have been truly Seen, and you realize—too late—that seeing goes both ways.

The Name-knowers walk carefully and speak rarely. Not from some mystical discipline, though the Guild likes that story. They're quiet because every conversation is a minefield. Words have weight when you understand their roots, and the roots go down forever, into meanings beneath meanings, truth beneath comfortable lies. Say "good morning" and mean it literally and watch reality try to comply. The careful ones last longest. The brilliant ones rarely make it past thirty.** The wise ones were never born at all.

*Not actually old. Just from elsewhere. The linguists have been arguing about this for six centuries.

**Usually from speaking Names they shouldn't have known, to things that shouldn't have listened, while reality was paying attention.`,
  category: 'magic',
  tags: ['names', 'paradigm', 'knowledge', 'dangerous', 'linguistic', 'reality'],
  effectCategory: 'paradigm',
  targetType: 'named_target',

  mechanics: {
    values: {
      source: 'knowledge of True Names',
      cost: 'time + sanity + attention',
      detectability: 'beacon (reality notices)',
      scaling: 'threshold (knowing vs not knowing)',
    },
    formulas: {
      power: 'nameCompleteness * pronunciationAccuracy * understanding',
      sanityCost: 'nameComplexity * (1 + timesSpoken/10)',
      attentionDrawn: 'nameImportance^2 * volumeSpoken',
    },
    conditions: {
      'Must know the full Name': 'Partial names do nothing or worse',
      'Perfect pronunciation': 'Mispronunciation can be catastrophic',
      'Understanding required': 'Speaking without comprehension invites disaster',
      'Entities notice': 'Speaking important Names draws unwanted attention',
    },
    dependencies: ['study_of_old_language', 'research_access', 'good_memory'],
    unlocks: ['command_speaking', 'binding_oaths', 'reality_editing', 'name_theft'],
  },

  tips: [
    'Start with small things: pebbles, raindrops, the neighbor\'s cat (with permission)',
    'Write Names down phonetically. Your memory is not as good as you think',
    'Never speak your own Name aloud unless you\'re very sure of who you are',
    'The Old Language has a word for "dangerous knowledge that should not be known"—it has seventeen syllables and learning it counts as an example',
  ],

  warnings: [
    'Speaking a Name creates a connection. The thing named knows you now. This is permanent',
    'Powerful entities often have Names too complex for mortal minds—attempting them causes psychic damage',
    'Reality has a Name. Nobody knows what it is. Several people have tried to discover it. None have come back',
    'The sanity cost is cumulative. Veteran Name-speakers develop specific blind spots where truth became too heavy',
  ],

  examples: [
    {
      title: 'The First Name',
      description:
        'Your teacher gives you a pebble and three weeks to learn its Name. You spend the first week angry—it\'s a rock, it doesn\'t have a name, this is pretentious mysticism. The second week you spend listening. Holding it. Feeling the weight, the texture, the faint warmth from your palm. The third week the Name arrives, not as sound but as knowing: the particular arrangement of silicon and pressure and time that made this specific stone. You speak it—carefully, precisely—and the pebble rings like crystal against your palm. Your teacher nods. "Now forget it," she says. "That Name was for learning. If you remember it, you\'ll hear it every time someone steps on gravel, and that way lies madness."',
    },
    {
      title: 'The Cost of Truth',
      description:
        'You learned her Name during the binding ceremony—necessary for the magical contract, standard practice, completely legal. Except now when she speaks you hear all of it: not just words but intent, history, the fears beneath the confidence, the loneliness she hides behind competence. You know when she\'s lying, not because she\'s bad at it but because her Name contradicts the words. You know too much. She knows that you know. Neither of you mentions it. The contract is fulfilled. You both walk away. You don\'t speak again. Understanding, it turns out, is not the same as connection. Sometimes it\'s exactly the opposite.',
    },
  ],

  relatedTopics: [
    'old_language_primer',
    'binding_magic',
    'command_words',
    'sanity_management',
    'entity_attention',
    'reality_editing',
  ],
});

// ============================================================================
// DIVINE MAGIC PARADIGM
// ============================================================================

export const DIVINE_MAGIC_HELP = createEffectHelp('divine_magic', {
  summary: 'Power granted by gods, earned through faith and service',
  description: `The difference between asking and begging is sincerity. The difference between praying and casting divine magic is whether anyone's listening. The difference between a miracle and a coincidence is paperwork, apparently, because the Celestial Bureaucracy* tracks these things with terrifying precision.

Here's how it works: you dedicate yourself to a deity—any deity, though choices have consequences.** You pray. You serve. You align your actions with their portfolio, their values, their inexplicable preference for offerings of honeycakes versus bread (looking at you, Harvest Gods). In return, when you truly need it, when your faith is genuine and your cause is just (or at least justifiable) (or minimally horrifying), they lend you power. Note: lend. Not give. The power comes from them, flows through you, and returns. You're a channel, not a reservoir.

Which sounds mystical and profound right until you're mid-miracle and your god gets distracted by a more interesting prayer three kingdoms over and suddenly you're holding a half-formed healing spell and a rapidly dying patient and a growing suspicion that divine attention has the focus span of a caffeinated squirrel. The clergy don't mention this part. They talk about faith and devotion and the sacred mysteries. They don't mention that sometimes you pray for guidance and get a vague sense of "figure it out yourself, I'm busy" because your god is managing forty thousand other clergy and also some cosmic chess game with other deities and honestly you're just not that important in the grand scheme of things.

But—and this is the beautiful, terrible thing—sometimes it works. Sometimes you pray and the power arrives like sunlight, like certainty, like a parent's hand on your shoulder saying "I've got this." Sometimes the miracle is exactly what you needed, or better, or weirdly specific in a way that suggests your god has been paying more attention than you thought. Those moments make the rest worth it. Mostly. Usually. On good days.

*Yes, there's paperwork. Yes, it's in triplicate. Yes, this somehow feels both absurd and inevitable.

**"Fire and Destruction" seemed cool at seventeen. At thirty-five, you have regrets.`,
  category: 'magic',
  tags: ['divine', 'paradigm', 'faith', 'prayer', 'service', 'miracles'],
  effectCategory: 'paradigm',
  targetType: 'varies',

  mechanics: {
    values: {
      source: 'deity (divine power)',
      cost: 'favor + karma',
      regeneration: 'prayer (daily)',
      detectability: 'obvious (divine aura)',
      reliability: '85% (deity willing)',
    },
    formulas: {
      miraclePower: 'basePower * faith * alignmentMatch * deityAttention',
      favorCost: 'baseCost * (1 - piety/100)',
      chanceOfAnswer: 'devotion * (1 - deityBusy) * causeJustness',
    },
    conditions: {
      'Requires faith': 'Doubt reduces effectiveness by 50%',
      'Deity must approve': 'Miracles contradicting deity values may fail',
      'Divine attention finite': 'Your god has other priorities',
      'Alignment matters': 'Acting against deity nature reduces favor',
    },
    dependencies: ['chosen_deity', 'regular_prayer', 'service_to_faith'],
    unlocks: ['turn_undead', 'bless', 'cure_wounds', 'commune', 'divine_favor'],
  },

  tips: [
    'Morning prayers matter. Not because gods are petty (they are) but because consistency builds connection',
    'Acting in line with your deity\'s values generates favor faster than prayer alone',
    'Emergency prayers work, but your god notices the difference between crisis and laziness',
    'Multiple deities means split favor—choose carefully or serve one deeply',
  ],

  warnings: [
    'Losing faith doesn\'t remove divine power immediately—it drains over weeks, which is somehow worse',
    'Gods remember. Betraying your faith has consequences measured in divine disappointment, which is surprisingly devastating',
    'Divine magic fails in areas of strong anti-divine presence (certain ruins, battlefields, tax offices)',
    'Your god can revoke access. This has happened. This will happen again. Don\'t test them.',
  ],

  examples: [
    {
      title: 'The First Miracle',
      description:
        'You\'ve been praying for six months. Daily. Sincerely. Nothing. Then: a child falls, cracks her head on stone, blood pooling too fast. You don\'t think—you pray, hands hovering over the wound, begging. Please. And something answers. Power floods through you, warm and foreign and utterly right. The wound closes. The child cries, breathes, lives. You\'re shaking, exhilarated, terrified. Your god noticed you. Your god helped. The weight of that trust—that you were worthy, that the child was worthy—will sit with you forever.',
    },
    {
      title: 'The Day the Answer Was No',
      description:
        'You pray for the man dying of plague. You\'ve prayed before, been answered before, saved lives before. You have faith. You have need. You have every reason to believe this will work. The power doesn\'t come. You pray harder—begging now, desperate. Nothing. He dies while you\'re still praying, and you\'re left with questions you\'re afraid to ask: Was his cause unjust? Is your faith failing? Is your god testing you, or have you finally asked too much? The clergy say trust in divine wisdom. You try. It takes months before you can pray without anger.',
    },
  ],

  relatedTopics: [
    'deity_selection',
    'favor_system',
    'prayer_techniques',
    'divine_domains',
    'miracles_vs_spells',
    'clerical_orders',
  ],
});

// ============================================================================
// PACT MAGIC
// ============================================================================

export const PACT_MAGIC_HELP = createEffectHelp('pact_magic', {
  summary: 'Borrowed power from entities who expect payment',
  description: `Every contract has fine print. Pact magic is what happens when the fine print has fine print, and that fine print is written in a language you don't speak, about consequences you can't imagine, by something that doesn't think like you do and finds your confusion delightful.

Here's the sales pitch: instant power, no study required, just sign here. The entity—demon, fae, elder thing, suspiciously friendly talking cat*—offers you magic. Real magic. Not the years-of-study academic kind, not the painful blood-sacrifice kind, just pure power flowing into you like water. The price seems reasonable. Service, usually. Loyalty. Maybe a favor or two, nothing specific, they'll let you know when they need it. You sign. The power is real. The price is real. You just won't know what it costs until much, much later.

The entities that offer pacts are not your friends. They might like you—some of them do develop genuine fondness for their contractors, the way you might be fond of an interesting pet—but they are not your friends. They exist in different moral dimensions. They measure time in centuries. They consider "technically true" to be the highest form of honesty. When they say the pact will cost "a small piece of your soul," they mean small relative to the whole, but souls aren't divisible like pie, they're more like structural integrity, and removing small pieces in the wrong places makes the whole thing collapse in ways you won't notice until you try to feel joy and find smooth nothing instead.**

But people sign anyway. Because the power is real. Because sometimes desperation beats wisdom. Because the entity asking is very, very good at making terrible ideas sound reasonable. Because you think you're clever enough to beat the contract, and you might be, people have been, but most aren't, and the entities have been doing this since before your civilization invented writing, so the odds are bad and you should know that going in.

*Especially the cats. Never trust a talking cat offering magical power. Actually, never trust any talking cat. Or any cat. Cats in general are suspect.

**This is mentioned in exactly one obscure theological text, which mysteriously vanishes from libraries with suspicious regularity.`,
  category: 'magic',
  tags: ['pact', 'paradigm', 'patron', 'contract', 'dangerous', 'powerful'],
  effectCategory: 'paradigm',
  targetType: 'varies',

  mechanics: {
    values: {
      source: 'patron entity',
      cost: 'favor + soul_fragment + obligations',
      powerGain: 'immediate',
      studyRequired: 'none',
      detectability: 'obvious (patron signature)',
      contractBinding: 'absolute',
    },
    formulas: {
      spellPower: 'patronPower * contractStrength * currentFavor',
      favorCost: 'baseCost * patronDemands',
      corruptionGain: 'soulFragmentsOwed * patronAlignment',
      breachPenalty: 'contractViolation^3 * patronVindictiveness',
    },
    conditions: {
      'Contract is binding': 'Breaking terms has severe consequences',
      'Patron can revoke': 'Power can be taken away instantly',
      'Soul fragments cumulative': 'Each service chips away at your essence',
      'Patron always knows': 'Your location, condition, and major decisions are visible',
    },
    dependencies: ['signed_contract', 'patron_approval', 'ongoing_service'],
    unlocks: ['patron_specific_spells', 'dark_transformation', 'breach_consequences'],
  },

  tips: [
    'Read the contract. Then read it again. Then have a lawyer read it. Then reconsider signing',
    'Favor regenerates by serving your patron\'s interests, which may conflict with your own',
    'Keep the contract document safe—losing it doesn\'t void the pact but makes renegotiation impossible',
    'Some patrons are chattier than others. Talking back is allowed but rarely wise',
  ],

  warnings: [
    'The contract continues after death. This is usually mentioned in section 47, subsection (iii)',
    'Soul fragments can\'t be recovered except by patron release, which they rarely grant',
    'Breaking a pact results in immediate power loss plus whatever creative punishment your patron devises',
    'Other entities can sense your pact mark—some find it attractive, most find it disqualifying',
    'The favor you owe "when needed" will be needed at the least convenient possible moment. This is not coincidence.',
  ],

  examples: [
    {
      title: 'The Signing',
      description:
        'The demon is surprisingly polite. Professional, even. It explains the terms clearly: power for service, strength for loyalty, magic for a piece of your soul "barely noticeable, really, you have so much." The contract glows with binding runes. You should read it carefully. You should ask questions. You should walk away. Your village is starving. Bandits are coming. The guard won\'t arrive in time. You sign. The power rushes in, intoxicating and cold. The demon smiles with too many teeth. "Pleasure doing business," it says, and you feel something small and vital separate from your core like a tooth pulled loose. It didn\'t hurt. That\'s what scares you.',
    },
    {
      title: 'The Favor Called Due',
      description:
        'Three years of faithful service. Three years of using borrowed power to help people, save lives, be a hero. You\'ve almost forgotten the cost. Then your patron speaks, voice resonating in your skull: "Time to pay, little contractor." The favor is simple. Retrieve a package. Don\'t look inside. Deliver it to an address. You do. You don\'t ask questions—the contract forbids it. Later you hear about the poisoning, the political assassination, the war that started because a duke died mysteriously. You don\'t know if it was your package. Your patron won\'t say. You suspect you\'ll never know. You suspect that\'s the point: to never be certain how much blood is on your hands, or whose.',
    },
  ],

  relatedTopics: [
    'contract_law',
    'patron_entities',
    'soul_fragment_recovery',
    'pact_breaking',
    'corruption_stages',
    'binding_magic',
  ],
});

// ============================================================================
// EMOTIONAL MAGIC PARADIGM
// ============================================================================

export const EMOTIONAL_MAGIC_HELP = createEffectHelp('emotional_magic', {
  summary: 'Raw feelings made manifest—your heart as a weapon',
  description: `The first time you cast emotional magic, you'll probably hurt yourself. Not physically—though that happens too, eventually—but emotionally. Because the paradigm requires you to feel things intensely, genuinely, without the protective barriers that let humans function in daily life. You want to throw fire? Feel rage. Real rage. The kind that makes your vision narrow and your hands shake and your rationality disappear. Now channel that into the universe. Congratulations: fire. Also: you've just learned what your anger actually feels like, unfiltered, and you might not like the answer.

The Emotional Paradigm is considered "natural magic" because it requires no training, no study, no external sources.* Everyone feels emotions; everyone can theoretically cast. But "can" and "should" are different verbs, and most people who attempt emotional casting either fail spectacularly (insufficient intensity) or succeed catastrophically (insufficient control). The sweet spot—enough intensity to fuel the spell, enough control to direct it—takes either natural talent or painful practice. Usually both.

Here's the taxonomy, as recorded by the Association of Emotional Practitioners (motto: "We Feel Therefore We Are"):

**Rage** fuels destruction: fire, force, breaking. It's the easiest to access and the hardest to control. Rage-casters tend toward short careers because either their targets die or their restraint fails.

**Fear** fuels defensive magic: shields, illusions, escape. Counterintuitively powerful because fear focuses attention perfectly. The downside: you're scared the entire time you're casting. Chronic fear-casters develop anxiety disorders. This is not metaphorical.

**Joy** fuels healing and enhancement. The rarest combat-effective emotion because joy is hard to maintain while someone is trying to kill you. Joy-casters are often support specialists, working from safety to buff allies. The ones who can maintain joy under fire are either enlightened monks or deeply disconnected from appropriate emotional responses.**

**Grief** fuels manipulation of death, endings, and entropy. Powerful but corrosive. To cast grief-magic, you must genuinely grieve—must access loss, must feel the weight of endings. Chronic grief-casters develop depression. Again, not metaphorical. The magic draws from real emotion, which means using it repeatedly means feeling grief repeatedly. Some things cost more than mana.

**Love** fuels connection, protection, and soul-magic. The most powerful and the most dangerous, because love is complex: it contains possessiveness, fear of loss, jealousy, obsession. Casting with "pure love" requires emotional clarity that most humans simply don't have. Casting with impure love—love mixed with need or fear or control—produces magic that reflects those impurities. The results can be horrifying in ways that feel affectionate.

*Technically this isn't true. Emotional magic requires access to emotions, which requires a functional limbic system, which requires being alive in a particular biological configuration. Undead can't cast it. Certain meditation masters can't either. The absence is noticeable.

**The monastery of Eternal Smile produces excellent healers and deeply unsettling conversationalists.`,
  category: 'magic',
  tags: ['emotional', 'paradigm', 'raw', 'natural', 'dangerous', 'feelings'],
  effectCategory: 'paradigm',
  targetType: 'varies',

  mechanics: {
    values: {
      source: 'emotional intensity',
      cost: 'emotion + sanity',
      studyRequired: 'none (but control requires practice)',
      detectability: 'moderate (emotional aura)',
      scaling: 'linear with emotional intensity',
    },
    formulas: {
      spellPower: 'emotionalIntensity * clarity * focus',
      sanityCost: 'intensity * duration * repetition',
      controlDifficulty: 'intensity / (practice + naturalTalent)',
    },
    conditions: {
      'Must genuinely feel': 'Faked emotions produce no magic',
      'Emotional bleed': 'Casting influences your actual emotional state',
      'Sanity erosion': 'Repeated intense use degrades mental health',
      'Type-locked': 'Each emotion produces specific effect types',
    },
    dependencies: ['functional_emotions', 'intensity_capacity', 'minimum_control'],
    unlocks: ['raw_destruction', 'empathic_healing', 'emotional_shields', 'soul_resonance'],
  },

  tips: [
    'Start with mild emotions before attempting intense ones—control matters more than power',
    'Keep a mental anchor: a calming memory, a focus object, something to pull you back',
    'Practice emotional release after casting—don\'t let channeled feelings fester',
    'Joy-based healing works best when the healer genuinely cares about the patient',
  ],

  warnings: [
    'Chronic rage-casting creates anger issues that persist outside combat',
    'Fear magic can trigger panic attacks in the caster',
    'Grief magic requires processing actual grief, repeatedly, with all that implies',
    'Love magic cast from obsession produces obsessive results—relationships, bonds, curses',
    'Emotional magic reveals your true feelings, whether you want them revealed or not',
  ],

  examples: [
    {
      title: 'The Rage That Saved Them',
      description:
        'Mira watched the bandits drag her sister toward the treeline. She had no training, no weapons, no plan—just sixteen years of life and an emotion she\'d never felt this strongly before. The rage came from somewhere beneath her stomach, hot and absolute. She pointed at the nearest bandit and screamed, and fire happened. Real fire. Her hands burned, her throat tore, and the bandit\'s cloak ignited. In the chaos, her sister escaped. Mira collapsed, weeping, hands blistering, rage spent. She learned two things: she could do magic, and she never wanted to feel that angry again. The second lesson didn\'t stick. The bandits kept coming. The rage kept answering.',
    },
    {
      title: 'The Healer\'s Dilemma',
      description:
        'Brother Anselm could heal with joy—genuine, radiant joy that flowed into patients and knit their wounds. He was very good at it. Increasingly, he was also very empty. To heal, he accessed happiness. To access happiness, he had to feel it, truly, not perform it. But twenty years of professional joy-production had worn grooves in his soul. He smiled automatically. He laughed on cue. He generated happiness like turning a crank, efficient and hollow. The healing still worked, technically—the magic didn\'t care if the joy was fresh. But Anselm noticed: he couldn\'t remember the last time he\'d felt happy for himself, rather than for the work. His gift had consumed the emotion it ran on. He kept healing anyway. What else could he do? People needed him. The joy machine cranked on.',
    },
  ],

  relatedTopics: [
    'emotional_regulation',
    'sanity_management',
    'raw_casting',
    'psychological_costs',
    'empathic_bonds',
    'feeling_types',
  ],
});

// ============================================================================
// BREATH MAGIC (BIOCHROMATIC)
// ============================================================================

export const BREATH_MAGIC_HELP = createEffectHelp('breath_magic', {
  summary: 'Life-force as color, invested in objects and returned with interest',
  description: `BioChromatic Breath is the closest thing magic has to a proper economy. You have Breath—everyone does, exactly one unit at birth, the spark that animates your meat and makes you technically alive rather than technically a corpse. This Breath can be given away. It can be invested in objects, stored in perfect receptacles, transferred between people. It can accumulate. And unlike most magical currencies, it generates returns.*

Here's how it works: you give your Breath to an object. The object Awakens—not alive, exactly, but animated, purposeful, able to follow commands. The more Breath invested, the more capable the Awakened object. A rope given one Breath might tie knots on command. A rope given a thousand Breaths might strangle enemies independently, track targets across cities, develop something uncomfortably close to preferences. The Breath remains in the object until released, at which point it returns to you, often with interest: Breath invested wisely earns more Breath.

The catch—because there's always a catch—is that giving away your Breath feels like dying. Not metaphorically. Your single birth-Breath is your life force; transferring it makes you gray, literally gray, colors draining from your skin and hair as if you'd lived a century in seconds. You survive, technically. The grayness fades if you acquire replacement Breath. But the experience is profoundly unpleasant, and some practitioners never give away their birth-Breath, relying entirely on traded or earned surplus.

**The Heightenings**: accumulated Breath grants passive powers at certain thresholds. At fifty Breaths, you perceive auras around living things. At two hundred, your appearance becomes unnaturally perfect—your body using excess life-force for aggressive self-improvement. At a thousand, you stop aging. At ten thousand, you can Awaken objects without physical contact, reaching through walls, across rooms, possibly across worlds. The God-Kings who reached fifty thousand Breaths could do things the texts refuse to describe, calling them merely "interventions in the fabric" and moving quickly to other topics.**

The color thing isn't metaphorical either. Breath drains color from its surroundings during use—vivid reds, brilliant blues, anything saturated gets pulled toward gray as the magic activates. Experienced Breathers work near paintings, tapestries, flower arrangements—color reservoirs that fuel their magic without draining their own appearance. The fashion implications are significant: gray clothes are invisible to Breath-drain, making gray the color of poverty or asceticism. Vivid colors signal wealth, power, and the willingness to sacrifice beauty for magic.

*The economic implications are staggering. Several civilizations have used Breath as literal currency, which works fine until someone accumulates enough to Awaken an army of furniture.

**"Intervention in the fabric" is scholarly code for "we don't want to write this down." The implications are probably fine. Probably.`,
  category: 'magic',
  tags: ['breath', 'biochromatic', 'paradigm', 'life_force', 'investment', 'color'],
  effectCategory: 'paradigm',
  targetType: 'object',

  mechanics: {
    values: {
      source: 'BioChromatic Breath (life-force)',
      birthBreath: 1,
      firstHeightening: 50,
      agelessness: 1000,
      colorDrain: 'proportional to Breath used',
    },
    formulas: {
      awakeningPower: 'breathInvested * commandClarity * objectSuitability',
      breathReturn: 'investedBreath * (1 + returnRate * investmentDuration)',
      heighteningPower: 'log10(totalBreath) * heighteningMultiplier',
    },
    conditions: {
      'Breath is tangible': 'Can be given, traded, stolen, stored',
      'Color required': 'Casting drains color from surroundings',
      'Commands matter': 'Awakened objects follow commands literally',
      'Heightenings permanent': 'Once reached, cannot be lost except through Breath loss',
    },
    dependencies: ['breath_reserve', 'color_source', 'command_clarity'],
    unlocks: ['object_awakening', 'breath_investment', 'heightening_powers', 'economic_magic'],
  },

  tips: [
    'Never give away your birth-Breath unless absolutely necessary—the experience is traumatic',
    'Simple commands work best: "grab things that approach" not "protect me from harm"',
    'Keep color sources available; gray environments limit casting',
    'Breath in perfect containers (human bodies, specifically prepared objects) doesn\'t decay',
  ],

  warnings: [
    'Awakened objects are literal: "hold tight" might mean fatally tight',
    'Breath-begging is a recognized addiction in some societies',
    'High-Breath individuals become targets—thousand-Breath is walking immortality',
    'The agelessness Heightening doesn\'t prevent violent death, just aging',
    'Commands cannot be revoked without reclaiming the Breath entirely',
  ],

  examples: [
    {
      title: 'The First Awakening',
      description:
        'The instructor handed her a rope, a simple hemp rope, nothing special. "Give it your Breath," he said. "Not all of it—just ten." She\'d accumulated fifteen over the past year, careful investments returned with modest interest. She focused on the rope, visualized the transfer, and spoke: "Hold tight, then release when I say." The world grayed slightly; the rope\'s fibers seemed to pulse. She tested it: threw it at a post, watched it coil and grip without her touching it. Said "release" and it fell limp. Ten Breath for a self-tying rope. Small magic, but hers. She\'d made something that listened. The instructor nodded: "Now make it do something you didn\'t command." She couldn\'t. That was the second lesson: Awakened objects don\'t improvise. They obey. Creativity requires more Breath than she\'d ever seen.',
    },
    {
      title: 'The Thousand-Breath Choice',
      description:
        'Variel reached a thousand Breaths on her seventy-third birthday and felt the change immediately: death receding, not eliminated but postponed, indefinitely. Her joints stopped aching. Her vision sharpened. Her gray hair began, slowly, to regain color. She would live—could live—forever, barring violence. Her children were in their fifties. Their children had children. She watched generations pass, accumulated more Breath, reached two thousand, three. At five thousand she could sense souls, actual souls, the Breath-signatures of everyone around her. At ten thousand she could Awaken objects by thought alone. At twenty thousand she stopped counting and started wondering: what was she becoming? Not human anymore, not exactly. Something else. Something that remembered being human the way you remember being a child: true but distant, belonging to someone you used to be.',
    },
  ],

  relatedTopics: [
    'breath_economics',
    'awakening_commands',
    'heightening_chart',
    'color_theory',
    'breath_storage',
    'god_kings',
  ],
});

// ============================================================================
// MAGIC COST RECOVERY
// ============================================================================

export const MAGIC_COST_RECOVERY_HELP = createEffectHelp('magic_cost_recovery', {
  summary: 'How magical resources regenerate—and why it matters',
  description: `Every magical paradigm has costs. Every cost has a recovery mechanism. Understanding these mechanisms is the difference between sustainable magic and self-destruction—between the wizard who casts three spells per day for sixty years and the prodigy who burns out spectacularly before turning twenty-five.*

The CostRecoveryManager** tracks seven primary resource types and their regeneration:

**Mana** (Academic Magic): Regenerates through rest—eight hours of sleep restores full reserves, meditation speeds recovery. The body naturally produces mana; you're essentially waiting for your tank to refill. Stressful environments slow regeneration. Peaceful ones accelerate it. The beach vacation trope in wizard stories isn't coincidence.

**Stamina** (Physical casting): Recovers with rest and food. Most straightforward, most limited—you can't cast if you can't stand. Athletes have higher stamina caps; scholars often neglect physical conditioning and suffer for it.

**Favor** (Divine Magic): Regenerates through worship—prayer, service, acting in accordance with your deity's values. You're not producing favor; you're earning it. The distinction matters: favor can be revoked, favor has expectations, favor comes with relationship maintenance.

**Blood/Health** (Blood Magic): Regenerates naturally but slowly—your body heals, producing new blood, but this takes time and nutrition. Chronic blood-casters become anemic. Some accelerate recovery through healing magic, creating an interesting dependency loop.

**Soul Fragments** (Pact Magic): Don't regenerate. Period. What you give away is gone unless your patron voluntarily returns it, which they won't. This is why pact magic is considered borrowing against your existential future.

**Sanity** (Name Magic, Emotional Magic): Recovers through rest, therapy, stable relationships, and avoiding triggering stimuli. Mental health as magical resource means magic use creates mental health needs. The correlation between powerful Name-knowers and "eccentric" personalities isn't coincidence—it's occupational hazard.

**Attention** (Divine beings): Regenerates through worship received. Gods don't produce attention; mortals produce it for them. A god without worshippers is a god slowly fading.

The CostRecoveryManager also tracks paradigm-specific recovery rates, environmental modifiers, and the "mana leak" problem: some magical practices don't just spend resources, they damage your capacity to hold resources. Blood magic scarification reduces maximum health. Chronic Name-speaking creates sanity "holes" that never fully heal. The costs compound over a career, which is why elderly mages often seem fragile—they've traded long-term capacity for immediate power, and the bill comes due.

*The "Bright Burn" phenomenon is well-documented: young casters with enormous natural talent who peak early and collapse before thirty, having spent resources faster than they could regenerate them.

**Named by committee. The Committee for Magical Resource Nomenclature would like everyone to know they also considered "Mana Economics Engine," "Resource Replenishment Regulator," and "That Thing That Keeps Wizards From Dying." Democracy has costs.`,
  category: 'magic',
  tags: ['recovery', 'regeneration', 'resources', 'costs', 'sustainability', 'paradigm'],
  effectCategory: 'paradigm',
  targetType: 'self',

  mechanics: {
    values: {
      manaRecovery: '1% per minute resting',
      staminaRecovery: '5% per minute resting',
      favorRecovery: 'prayer-dependent',
      healthRecovery: '1% per hour',
      sanityRecovery: '0.1% per hour stable',
      soulFragments: 'non-recoverable',
    },
    formulas: {
      manaRegen: 'baseRegen * restQuality * environmentBonus',
      favorRegen: 'prayerIntensity * alignmentMatch * deityAttention',
      sanityRegen: 'baseRegen * stabilityFactor * supportNetwork',
    },
    conditions: {
      'Rest required': 'Most recovery needs downtime',
      'Diminishing capacity': 'Some paradigms reduce maximum resources over time',
      'Environmental factors': 'Location affects regeneration rates',
      'Lifestyle matters': 'Diet, sleep, stress all influence recovery',
    },
    dependencies: ['rest_opportunity', 'recovery_environment', 'lifestyle_factors'],
    unlocks: ['sustainable_practice', 'career_longevity', 'resource_planning', 'recovery_optimization'],
  },

  tips: [
    'Plan your recovery before planning your spending—know when you\'ll regenerate',
    'Diversify paradigms to avoid over-drawing any single resource type',
    'Environmental bonuses stack: ley lines + sacred sites + peaceful surroundings = fastest recovery',
    'Track your maximums, not just current levels—declining capacity signals problems',
  ],

  warnings: [
    'Soul fragments don\'t come back. Budget accordingly.',
    'Sanity damage compounds—small costs accumulate into large deficits',
    'Blood magic anemia is real and medically dangerous',
    'Ignoring recovery periods leads to "bright burn"—spectacular early career, devastating collapse',
    'Some recovery requires emotional work, not just rest. Therapy counts.',
  ],

  examples: [
    {
      title: 'The Sustainable Wizard',
      description:
        'Magister Chen cast three spells per day for forty-seven years. Never more, rarely fewer. Her students called her conservative; her peers called her boring. She called herself "still alive and casting at seventy." Her secret: she tracked mana regeneration obsessively, never dipping below 50% reserves, never casting when tired, never skipping recovery periods. When the Siege of Northwall required continuous defensive magic for three weeks, other mages burned out within days. Chen paced herself: cast, rest, cast, rest, steady and unspectacular. She was the last mage standing when the siege ended. Spectacular isn\'t sustainable. Sustainable wins.',
    },
    {
      title: 'The Bright Burn',
      description:
        'Kira could feel mana like breathing—endless reserves, effortless casting, power that seemed bottomless at sixteen. By nineteen she was court wizard, casting daily, impressing everyone. By twenty-two she noticed the fatigue, the headaches, the slow recovery. By twenty-five she couldn\'t hold a cantrip. Healers diagnosed "magical exhaustion"—she\'d spent faster than she regenerated, year after year, until her capacity collapsed. Not zero mana, but a maximum so low that meaningful casting was impossible. She\'d traded forty years of modest magic for ten years of brilliance. Nobody at court had told her about pacing. Nobody had tracked her recovery. She was too talented to waste on mundane concerns like sustainability. Until she wasn\'t.',
    },
  ],

  relatedTopics: [
    'mana_management',
    'paradigm_switching',
    'recovery_optimization',
    'bright_burn',
    'capacity_erosion',
    'sustainable_magic',
  ],
});

// ============================================================================
// TERMINAL EFFECTS
// ============================================================================

export const TERMINAL_EFFECTS_HELP = createEffectHelp('terminal_effects', {
  summary: 'When magic costs more than you can pay—death, corruption, and worse',
  description: `Magic has guardrails. The universe doesn't actually want you to die—or more precisely, the magical systems have evolved (emerged? were designed? nobody's certain) with limits that prevent most practitioners from accidentally self-destructing. Run out of mana and you pass out. Exhaust your stamina and your body refuses to cast. Spend too much blood and you faint before bleeding out.

These are the soft limits. The TerminalEffectHandler manages what happens when you bypass them.

Overriding the guardrails is possible—desperation, artifacts, rituals specifically designed to circumvent safety. When you do, magic stops being "dangerous but manageable" and becomes "trading your existence for power." The terminal effects aren't punishments; they're consequences, the universe's balance sheet finally catching up.

**Death** is the simple one. You spent more life-force than you had. You die. Sometimes resurrectible, depending on paradigm and circumstance; often not. Blood mages who drain themselves past the survival threshold just... stop. No dramatic moments, no final words, just a body that gave too much and received nothing back.

**Corruption** is slower. Blood magic, pact magic, certain Name workings—they don't just spend resources, they change you. Corruption accumulates with each transgression, each forbidden technique, each deal with entities who don't think like humans. Low corruption manifests as personality shifts, unusual cravings, disturbing dreams. High corruption transforms you into something that used to be human, might still think it is, but isn't. The corruption doesn't feel like damage; it feels like improvement, which is part of the horror.

**Soul Damage** affects the metaphysical substrate you exist on. Pact magic fragments the soul; certain Name invocations tear holes in identity. Soul damage makes resurrection harder, afterlives uncertain, reincarnation problematic. Extreme cases produce "hollow" practitioners—technically alive, technically functional, but missing something fundamental, unable to feel certain emotions or form certain connections. The lights are on but nobody's home, and they can't figure out why they feel empty.

**Sanity Loss** isn't metaphor. Name magic, emotional magic at intensity, direct exposure to cosmic truths—these produce genuine psychological damage. Hallucinations, dissociation, inability to distinguish memory from reality. The universe contains truths that human minds aren't built to process; processing them anyway has costs.

**Lifespan Erosion** affects blood mages specifically: each casting ages you slightly, accelerated entropy in exchange for immediate power. Young blood mages look old. Old blood mages look ancient. Ancient blood mages don't exist—they've given their futures away piece by piece until no future remained.

The TerminalEffectHandler tracks all of these, applies appropriate consequences, and maintains the terrible bookkeeping of magical transgression. It doesn't judge. It just records what you traded and delivers what you earned.*

*The Handler was named by the same committee. They're consistent, at least.`,
  category: 'magic',
  tags: ['terminal', 'consequences', 'death', 'corruption', 'soul', 'costs'],
  effectCategory: 'paradigm',
  targetType: 'self',

  mechanics: {
    values: {
      deathThreshold: '0 health',
      corruptionStages: 'minor, moderate, major, complete',
      soulFragmentMax: '100%',
      sanityMinimum: '0 (catatonia)',
      lifespanCost: '1 month per major casting',
    },
    formulas: {
      deathCheck: 'currentHealth <= 0 && noSafetyOverride',
      corruptionGain: 'transgression_severity * repetition_factor',
      soulFragmentLoss: 'pact_cost + forbidden_knowledge_exposure',
      sanityDrain: 'truth_intensity * exposure_duration * vulnerability',
    },
    conditions: {
      'Safety bypassed': 'Terminal effects only occur when guardrails overridden',
      'Accumulation': 'Most terminal effects build up over time',
      'Irreversibility': 'Many terminal effects cannot be fully healed',
      'Paradigm-specific': 'Each paradigm has characteristic terminal failures',
    },
    dependencies: ['safety_override', 'transgression_history', 'accumulated_damage'],
    unlocks: ['forbidden_power', 'final_stands', 'desperate_measures', 'transcendence_attempts'],
  },

  tips: [
    'The guardrails exist for reasons. Bypass them only when the alternative is worse than the consequences.',
    'Terminal effects usually provide warning signs—heed them',
    'Some terminal effects are reversible early but permanent late',
    'If you\'re regularly approaching terminal thresholds, change your approach',
  ],

  warnings: [
    'Death from magical overdraft is surprisingly common and usually preventable',
    'Corruption feels good until it doesn\'t—by then it\'s too late',
    'Soul damage affects your afterlife, not just your current life',
    'Sanity loss is often gradual enough to go unnoticed until severe',
    'There is no safe amount of terminal effect exposure—only acceptable risk',
  ],

  examples: [
    {
      title: 'The Last Spell',
      description:
        'The army was coming. The village had no defenders, no walls, no hope. Mira was a hedge witch—minor talents, minor training, minor everything. She knew one big spell, taught by her grandmother: a ward that could stop armies. Her grandmother had also taught her the cost: everything. All mana, all health, all life. Mira cast it anyway. The ward rose: a dome of light that arrows couldn\'t pierce, that soldiers couldn\'t pass. It held for three hours—long enough for refugees to escape. Mira felt herself emptying, pouring out, becoming the ward rather than casting it. When the spell faded, so did she. They found her body at the center of the protected area, smiling slightly, completely drained. The TerminalEffectHandler recorded: one death, voluntary, in exchange for three hundred lives. The math was acceptable. The loss was infinite.',
    },
    {
      title: 'The Corruption Creep',
      description:
        'It started small: a blood spell to heal his daughter, harmless really, just a drop or two. Then a bigger spell when the fever returned. Then a deal with something that lived in the shadows—just minor services, nothing terrible. Tomás didn\'t notice when his reflection stopped matching his movements. Didn\'t notice when meat started smelling appealing in ways it shouldn\'t. Didn\'t notice when his wife flinched from his touch. By the time he noticed, the corruption had passed the reversal threshold. He was still himself, mostly. Still loved his family, mostly. But something else lived in his decisions now, something that thought hunger was a virtue and restraint was weakness. His daughter recovered. His humanity didn\'t. The TerminalEffectHandler recorded: one salvation purchased with one soul. Standard rate. The universe doesn\'t negotiate.',
    },
  ],

  relatedTopics: [
    'death_mechanics',
    'corruption_stages',
    'soul_fragmentation',
    'sanity_tracking',
    'lifespan_economics',
    'forbidden_knowledge',
  ],
});

// ============================================================================
// MAGIC SKILL TREES
// ============================================================================

export const MAGIC_SKILL_TREES_HELP = createEffectHelp('magic_skill_trees', {
  summary: 'Fourteen paradigm-specific progression paths from novice to master',
  description: `Magic isn't learned; it's grown. Like a tree—which is why we call them skill trees, though "skill brambles" would be more accurate for how tangled the advanced paths become.* Each of the fourteen recognized magical paradigms has developed its own progression system, refined over centuries of trial, error, and occasionally spectacular explosions.

The structure is consistent even when the content differs wildly: fundamentals at the root, branching specializations as you climb, and at the very top, techniques that the trees don't officially acknowledge exist. These "capstone" abilities are often literally unwritten—passed down through apprenticeship, discovered through experimentation, or stumbled upon by practitioners who didn't know something was supposed to be impossible.

**Academic Magic** branches into Evocation (raw energy), Abjuration (protection), Transmutation (change), and Divination (knowledge). The paths are well-documented, which means the Guild knows exactly which techniques you're certified for and will send tersely worded letters if you exceed your credentials.

**Blood Magic** splits into Self-Sacrifice (your blood), Sangrimancy (blood manipulation), Life Drain (taking from others), and Crimson Binding (blood contracts). The progression is steep because each level requires more blood than the last. Career blood mages learn to calculate: how much can I spend today and still function tomorrow?

**True Name Magic** branches into Object Naming (things), Entity Naming (beings), Concept Naming (ideas), and the theoretical Name Editing path that officially doesn't exist because modifying Names is considered too dangerous even for magical academia.

**Divine Magic** varies by deity, but common paths include Healing, Protection, Smiting, and Communion. Your god's domain shapes which branches grow strongest—a war god's clerics find Smiting suspiciously easy while Healing costs double.

**Pact Magic** trees are patron-specific and usually kept secret. Demon patrons favor Corruption and Power paths; fae patrons offer Illusion and Binding; eldritch patrons provide... things it's better not to name.

**Emotional Magic** splits by emotion: Rage (destruction), Fear (protection), Joy (healing), Grief (entropy), Love (connection). Multi-emotional casting is theoretically possible but requires feeling multiple intense emotions simultaneously, which is called "having a breakdown" in non-magical contexts.

**Breath Magic** follows the Heightening progression, but specializes into Awakening (objects), Investment (economics), Command (directing awakened items), and Color Manipulation (environmental shaping). Higher Heightenings unlock entire branches at once.

The remaining paradigms—Natural, Ancestral, Geometric, Musical, Temporal, Linguistic, and Symbiotic—each have their own trees, documented in the Comprehensive Magical Taxonomy that nobody has actually read in its entirety because it's forty-seven volumes and counting.

*Technically the metaphor dates to the Third Magical Congress, where a tipsy diviner sketched skill progressions on a napkin using whatever visual occurred to her at the moment. Trees stuck. We're all bound by that napkin now.`,
  category: 'magic',
  tags: ['skills', 'progression', 'paradigm', 'specialization', 'training', 'mastery'],
  effectCategory: 'system',
  targetType: 'self',

  mechanics: {
    values: {
      paradigmCount: 14,
      tierCount: 5,
      branchesPerParadigm: '3-6',
      skillPointsPerLevel: 1,
      crossParadigmPenalty: '50% effectiveness',
    },
    formulas: {
      skillEffectiveness: 'baseEffect * (1 + skillLevel/10) * paradigmAffinity',
      unlockRequirement: 'prerequisitesMet && skillPointsAvailable >= cost',
      crossParadigmCost: 'baseCost * 2 * (1 + paradigmDistance)',
    },
    conditions: {
      'Prerequisites required': 'Must unlock earlier skills before advanced ones',
      'Paradigm lock': 'Deep investment in one paradigm reduces effectiveness in others',
      'Hidden capstones': 'Final abilities often require discovery, not just unlocking',
      'Teacher requirements': 'Some skills require instruction, not just points',
    },
    dependencies: ['skill_points', 'paradigm_affinity', 'prerequisite_skills'],
    unlocks: ['advanced_techniques', 'paradigm_mastery', 'hybrid_casting', 'teaching_rights'],
  },

  tips: [
    'Focus one paradigm deeply before branching—jack-of-all-trades mages rarely reach the interesting parts',
    'Hidden skills often unlock through action rather than selection: cast a hundred fireballs and fire mastery might appear',
    'Cross-paradigm skills are expensive but can create unique combinations nobody else has',
    'Teaching skills to others sometimes unlocks teaching-specific abilities',
  ],

  warnings: [
    'Paradigm lock is real: investing 50+ points in one tree halves effectiveness in all others',
    'Some hidden capstones have requirements that aren\'t skills at all—moral choices, sacrifices, transformations',
    'Respec is possible but expensive; the universe charges interest on changed minds',
    'Very high skill levels attract attention from entities interested in that paradigm',
  ],

  examples: [
    {
      title: 'The Evocation Specialist',
      description:
        'Mara reached Tier 5 Evocation by thirty—fire, lightning, force, the whole destructive catalog. She was one of maybe twenty living Evocation Masters, which meant she could apply for Master Council seats, teach at any Academy, and level buildings with a gesture. What nobody told her: Tier 5 came with a Tier 5 presence. Things noticed her now—fire elementals seeking kinship, lightning spirits testing her reflexes, forces that wanted to know what she planned to do with all that power. Mastery wasn\'t just capability. It was becoming significant enough that the universe started paying attention. She missed being invisible. She didn\'t miss being weak.',
    },
    {
      title: 'The Hidden Skill',
      description:
        'The skill tree showed nothing past Tier 4 in Blood Binding. Official doctrine: the path ended there. Marcus knew better—he\'d seen his mentor cast something beyond the tree, a blood technique that wasn\'t supposed to exist. "It\'s not hidden," she explained, showing him her scarred forearms. "It\'s earned. You don\'t unlock Blood Covenant by spending points. You unlock it by giving more than you thought you had, for someone who matters more than yourself." He understood then why the trees had limits: some skills couldn\'t be taught. They could only be lived.',
    },
  ],

  relatedTopics: [
    'paradigm_selection',
    'skill_point_acquisition',
    'cross_paradigm_casting',
    'hidden_skill_discovery',
    'teaching_magic',
    'paradigm_lock',
  ],
});

// ============================================================================
// MAGIC LAW ENFORCEMENT
// ============================================================================

export const MAGIC_LAW_ENFORCEMENT_HELP = createEffectHelp('magic_law_enforcement', {
  summary: 'The MagicLawEnforcer and the institutions that regulate magical practice',
  description: `Somebody has to clean up the magical messes, and for reasons nobody fully understands, that somebody formed a bureaucracy.*

The MagicLawEnforcer** manages the detection, investigation, and punishment of illegal magical activity. "Illegal" is a complicated word when applied to magic—what counts as forbidden varies by jurisdiction, paradigm, power level, and whether anyone important was inconvenienced. In general, the Enforcer tracks:

**Unlicensed Practice**: Most civilized regions require practitioners to register, pass competency examinations, and carry certification for any magic beyond minor cantrips. The tests are rigorous; the paperwork is eternal; the fees are substantial. This ensures that magical catastrophes are caused by properly credentialed individuals who can be billed for cleanup.

**Forbidden Techniques**: Each paradigm has banned practices—blood magic's Third School, Name magic's self-modification, Pact magic with entities on the Prohibited Entity Register. The Enforcer maintains the lists, investigates violations, and coordinates with paradigm-specific tribunals for prosecution. Getting caught practicing forbidden magic usually means imprisonment, magical binding, or "rehabilitation" that nobody who's undergone it likes to discuss.

**Magical Crimes**: Murder via magic, magical coercion, soul theft, unauthorized mind-reading, property destruction through uncontrolled casting. Regular crimes, committed magically, prosecuted under enhanced statutes because magic makes everything worse. A mundane arsonist goes to prison; a fire mage who "lost control" gets their power bound and a three-century supervision order.

**Magical Safety Violations**: Casting in public without proper wards. Operating magical items without certification. Failing to report significant magical events. Creating undocumented enchantments. The boring violations, administratively punished with fines and remedial training, that nevertheless prevent most of the preventable disasters.

The Enforcement structure includes:

**Watchers**: Passive detection systems—ley line monitors, aura sensors, complaint hotlines staffed by bored divination students. Watchers identify potential violations without investigating; they just flag and forward.

**Investigators**: Trained magical forensics specialists who examine crime scenes, trace spell signatures, interview witnesses, and build cases. Investigators carry multi-paradigm certification and substantial personal warding; the job has a high turnover rate for obvious reasons.

**Arbiters**: Judicial figures who assess evidence, determine guilt, and prescribe punishment. Most Arbiters are senior mages whose casting days are behind them—the position requires neutrality, which is easier when you're not actively competing for magical resources.

**Binders**: Specialists in magical containment and power suppression. When someone needs their magic removed, reduced, or restrained, Binders make it happen. The techniques are uncomfortable, occasionally permanent, and kept confidential to prevent countermeasures.

Enforcement is imperfect. Powerful mages evade oversight. Jurisdictional gaps exist between regions. Some magic—particularly divine and pact varieties—falls under religious or contractual law rather than secular regulation. The system works well enough to prevent magical anarchy, poorly enough to ensure interesting problems, and expensively enough that tax complaints are universal.

*The First Magical Regulation Council (1042 AM) consisted of three Archmages who spent fourteen hours arguing about jurisdiction and six minutes actually drafting rules. The tradition continues.

**Named by someone who thought "Enforcer" sounded intimidating. The actual enforcers mostly process paperwork and wish the title was less aggressive-sounding during community outreach events.`,
  category: 'magic',
  tags: ['law', 'enforcement', 'regulation', 'crime', 'licensing', 'punishment'],
  effectCategory: 'system',
  targetType: 'world',

  mechanics: {
    values: {
      licenseExamDifficulty: 'paradigm-dependent',
      detectionRange: '50 miles from Watcher stations',
      responseTime: '1-24 hours depending on severity',
      bindingDuration: 'varies (temporary to permanent)',
      jurisdictionOverlap: '30% of regions have contested authority',
    },
    formulas: {
      detectionChance: 'spellPower * publicVisibility * watcherDensity',
      sentenceSeverity: 'baseCrime * magicalMultiplier * priorOffenses',
      escapeLikelihood: 'casterPower / (enforcerPower * containmentQuality)',
    },
    conditions: {
      'Registration required': 'All magical practitioners must register by age 16',
      'Paradigm-specific courts': 'Some violations judged by paradigm tribunals, not secular courts',
      'Divine exemptions': 'Clergy magic falls under temple authority primarily',
      'Cross-border complications': 'Magical crimes across borders require treaty coordination',
    },
    dependencies: ['watcher_network', 'investigator_availability', 'binding_capacity'],
    unlocks: ['licensed_practice', 'teaching_permits', 'research_authorization', 'enforcement_career'],
  },

  tips: [
    'Register early; late registration comes with fines and suspicion',
    'Keep your license current—lapsed credentials mean re-examination',
    'Document any unusual magical events before the Investigators arrive; cooperation helps',
    'Know your rights during investigation: you can request paradigm-specific legal counsel',
  ],

  warnings: [
    'Unlicensed practice violations escalate with each offense—third strike is usually binding',
    'Forbidden technique usage is investigated even when no one files a complaint',
    'Magical crime sentences run 3-10x longer than mundane equivalents',
    'Fleeing Enforcement jurisdiction doesn\'t void warrants—they wait, and they remember',
    'Binding removes power temporarily or permanently; the paperwork to restore it can take decades',
  ],

  examples: [
    {
      title: 'The Routine Inspection',
      description:
        'The Inspector arrived unannounced, which was technically illegal but practically universal. "License check," she said, already scanning Tomas\'s workshop with a detection crystal. He produced his papers—Academic Paradigm, Tier 3, Evocation specialty, all current. She nodded, made notes, examined his ward-work, and flagged a minor ventilation violation in his workroom. "You\'ve got thirty days to install proper exhaust charms," she said. "Fire magic in enclosed spaces without them is a safety violation. Fine\'s forty silver." He paid it. She left. The whole interaction took twelve minutes. This was enforcement for most people: boring, bureaucratic, annoying, necessary. The dramatic stuff happened to other people. Usually.',
    },
    {
      title: 'The Binding',
      description:
        'They caught Vera three years after the Millbrook incident. Three years of running, false identities, paradigm-switching to evade detection. She\'d killed seven people—accidentally, she maintained, lost control during emotional casting, didn\'t mean it. The Arbiter didn\'t care about intent; magical homicide was magical homicide. The Binders came with their cold iron instruments and their suppression glyphs. The binding itself took four hours and felt like dying seven times consecutively. When it was done, Vera could still feel where her magic had been: a phantom limb, reaching for power that wasn\'t there anymore. They gave her a fifty-year sentence, reducible with good behavior. She\'d serve it without magic, without the ability to cast, without the thing that had defined her since childhood. The Arbiter called it justice. Vera called it amputation. Both were technically correct.',
    },
  ],

  relatedTopics: [
    'licensing_process',
    'forbidden_techniques',
    'magical_crime_types',
    'binding_procedures',
    'enforcement_careers',
    'jurisdictional_law',
  ],
});

// ============================================================================
// SPELL COMBO SYSTEM
// ============================================================================

export const SPELL_COMBO_SYSTEM_HELP = createEffectHelp('spell_combo_system', {
  summary: 'Combining spells for amplified, modified, or entirely new effects',
  description: `The first time someone cast two spells simultaneously, it was probably an accident. The second time, it was desperation. The third time, it was science—or what passes for science when the experimental apparatus can level buildings and the hypothesis is "what if fire + lightning = something interesting?"*

Spell combos are the art of making magic greater than the sum of its parts. The ComboDetector** tracks which spells are active, monitors their interactions, and calculates results when multiple magical effects overlap in ways that produce emergent phenomena. Not all overlaps combo; most spells simply coexist, like roommates who politely ignore each other. But certain combinations—through resonance, opposition, or accidental complementarity—produce effects neither spell could achieve alone.

**Amplification Combos** multiply power: cast fire, then cast fire again with different frequency. The flames don't just stack; they resonate, each wave reinforcing the other until the output exceeds both inputs combined. Academic mages formalized this with harmonic theory; blood mages discovered it by bleeding twice and noticing the second cut hurt differently.

**Modification Combos** change properties: shield + movement = mobile shield. Illusion + sound = speaking illusion. Fire + precision = cutting flame that cauterizes as it slices. These combinations are usually discovered through experimentation and documented in combo grimoires that read like very dangerous cooking recipes.

**Fusion Combos** create new effects entirely: ice + fire under specific conditions produces steam-pressure effects neither element could achieve. Light + shadow cast simultaneously creates "grey magic" that affects things neither element alone can touch. Fusion combos are rare, valuable, and often patented by the mages who discover them (yes, magical patent law exists; no, it's not pleasant).

**Opposition Combos** exploit contradictions: casting healing and harm simultaneously at the same target creates "flux," a destabilized state where the target's biology becomes temporarily malleable. Dangerous, powerful, usually forbidden, definitely discovered by someone who made a terrible mistake and then published about it.

The combo system requires timing precision that most casters can't achieve alone. This is why battle-mages work in pairs or teams—one sets up, another triggers, coordination converts two adequate casters into one devastating unit. Solo combo-casting requires either extreme skill, specialized artifacts, or paradigms that naturally layer (Breath magic, with its persistent Awakened objects, enables combos other paradigms can't match).

The ComboDetector tracks:
- **Active Effects**: What spells are currently running, their remaining duration, their mutable properties
- **Interaction Windows**: The timing requirements for specific combos (some require simultaneity; others need sequences with precise gaps)
- **Resonance States**: When multiple effects are approaching combo threshold
- **Combo Recipes**: Known combinations and their recorded results
- **Discovery Tracking**: New combinations that haven't been documented, potentially valuable, potentially catastrophic

Not all combos are beneficial. Some combinations produce feedback loops, cascading failures, or effects that harm the caster as much as the target. The "failed combo" is a recognized cause of magical death, usually filed under "experimental casting" in autopsy reports, which is polite language for "tried something clever and it didn't go well."

*The answer, in case you're curious: plasma. Very briefly, very brightly, and then very much "why is there a crater where the laboratory used to be?"

**The Detector itself is a semi-autonomous magical construct that developed personality quirks after processing its ten-millionth combo interaction. It's not sentient, exactly, but it does seem to find certain combination attempts amusing.`,
  category: 'magic',
  tags: ['combo', 'synergy', 'combination', 'teamwork', 'resonance', 'fusion'],
  effectCategory: 'system',
  targetType: 'varies',

  mechanics: {
    values: {
      maxSimultaneousEffects: '5 (7 with artifacts)',
      comboWindowMs: '500 (millisecond precision required)',
      amplificationBonus: '1.5x-3x depending on resonance',
      fusionDiscoveryChance: '2% when conditions align',
      failedComboBackfire: '25% of combined power',
    },
    formulas: {
      amplificationResult: 'spell1Power * spell2Power * resonanceFactor',
      modificationResult: 'baseEffect.applyModifier(modifierSpell.properties)',
      fusionResult: 'emergentEffect(spell1, spell2, conditions)',
      backfireIntensity: '(combinedPower * 0.25) * (1 + timingError)',
    },
    conditions: {
      'Timing critical': 'Most combos require sub-second precision',
      'Paradigm compatibility': 'Some paradigms combo better than others',
      'Effect persistence': 'At least one effect must remain active during combo window',
      'Discovery possible': 'Unknown combos can be discovered through experimentation',
    },
    dependencies: ['multiple_effects', 'timing_precision', 'paradigm_knowledge'],
    unlocks: ['combo_recipes', 'team_casting', 'advanced_synergies', 'fusion_magic'],
  },

  tips: [
    'Start with documented combos before experimenting—proven recipes are safer',
    'Work with a partner; coordinated casting beats solo attempts for precision-dependent combos',
    'Amplification combos are forgiving; fusion combos are not. Know the difference.',
    'Record every attempt, successful or not—pattern recognition reveals new combinations',
  ],

  warnings: [
    'Failed combos backfire proportionally to attempted power—small experiments first',
    'Some paradigm combinations are unstable: blood + divine combos have a 40% failure rate',
    'Fusion combos can produce effects neither caster can control',
    'The "clever shortcut" combo you invented has probably already been discovered and forbidden for reasons',
    'Team combo-casting requires trust; your partner holds your safety during the casting window',
  ],

  examples: [
    {
      title: 'The Resonance Strike',
      description:
        'Kai and Lin had practiced the combo for months. Kai\'s lightning arrived first—a standard bolt, nothing special, easily shielded. But Lin\'s lightning followed exactly 340 milliseconds later, matching Kai\'s frequency, exploiting the ionized channel still hanging in the air. The second bolt didn\'t just strike; it resonated. The target\'s shield, calibrated for normal lightning, couldn\'t handle the harmonic amplification. The combo punched through with nearly three times the power either bolt carried alone. They\'d practiced because timing was everything: 340 milliseconds too early or too late and they\'d just thrown two regular lightning bolts. In the window, they\'d thrown something else entirely.',
    },
    {
      title: 'The Discovery',
      description:
        'Nobody told Sera that shadow and fire couldn\'t combine—they just didn\'t, everyone knew, opposite elements, no resonance possible. She cast both anyway, desperate, the attackers closing in. Fire in her left hand, shadow in her right, thrown together because what else could she do? The flames went dark. Not extinguished—dark, burning black, cold and hot simultaneously, consuming light as it consumed matter. She\'d discovered Void Fire, a fusion combo last documented three centuries ago and presumed lost. The attackers fled; the combo collapsed after six seconds, leaving Sera shaking and confused. She\'d invented something impossible. The Academies would want to study her, the Enforcers would want to register the discovery, and something in the dark would want to know who had remembered how to call its fire. Discovery, she learned, came with consequences.',
    },
  ],

  relatedTopics: [
    'team_casting',
    'combo_recipes',
    'resonance_theory',
    'fusion_discoveries',
    'paradigm_compatibility',
    'casting_timing',
  ],
});

// ============================================================================
// NATURAL MAGIC (DRUIDIC)
// ============================================================================

export const NATURAL_MAGIC_HELP = createEffectHelp('natural_magic', {
  summary: 'Magic drawn from the land, seasons, and the living world itself',
  description: `The forest doesn't care about your problems. This is the first lesson every aspiring druid learns, usually while sitting in mud, being rained on, and wondering why they thought becoming a nature mage was a good career choice. The forest doesn't care—but it does listen, sometimes, if you learn to speak its language and ask politely.*

Natural magic draws power from the living world: the growth of plants, the turning of seasons, the slow patience of stone and the quick fury of storms. It requires attunement—not study, not sacrifice, not bargains—just time spent in nature until nature decides you've paid enough attention to deserve answers. The attunement process is famously unpredictable: some students bond with the land in weeks; others spend decades waiting for a connection that never comes; a few lucky ones were born attuned and spend their whole lives wondering why trees seem to whisper when they walk past.

Once attuned, the natural mage becomes a conduit. Not for their own power, but for the land's—the accumulated energy of growth, decay, and renewal that flows constantly through every ecosystem. The druid doesn't cast spells so much as request them. "Please, storm, could you move slightly east?" "Excuse me, vines, would you mind restraining that person?" The magic works—when the land agrees. When it doesn't, the druid is just someone standing in the rain, talking to plants that have better things to do.

**Seasonal Attunement** affects everything. Spring druids excel at growth, healing, beginnings—but struggle with endings, destruction, even necessary pruning. Summer druids channel heat, energy, transformation; winter druids master rest, preservation, and the beautiful cruelty of cold. Autumn druids specialize in harvest, change, and the turning point between living and dead. Most druids attune to one season primarily, with secondary capability in adjacent seasons. Those who achieve all-season attunement are called Archdruids, and they tend to be terrifying in the way that someone in constant communion with planetary forces is terrifying.

**Land Binding** creates deeper connections. A druid can bind themselves to a specific region—a forest, a mountain, a river system—gaining tremendous power within that area at the cost of weakness everywhere else. Land-bound druids rarely travel. They become the land's voice, its defender, occasionally its instrument of vengeance when someone logs the wrong grove or poisons the wrong spring. The binding is mutual: the druid protects the land; the land protects the druid. Cross a land-bound druid in their territory and discover what happens when an entire ecosystem decides you're a threat.

The price of natural magic is patience. The land moves slowly. The seasons turn on their own schedule. A natural mage asking for urgent help is often asking the impossible—nature doesn't rush, doesn't respond to emergencies, doesn't care about mortal timelines. Emergency healing happens, yes, but it's not the druid's power; it's the land choosing to help, for its own reasons, which it doesn't explain. Working with something that vast means accepting that you're never really in control. You're just the translator, hoping both sides listen.

*"Politely" is doing a lot of work in that sentence. The land's definition of polite includes things like "don't wear shoes made from animal skin" and "that sword was once ore and the mountain remembers."`,
  category: 'magic',
  tags: ['natural', 'druidic', 'paradigm', 'seasons', 'land', 'attunement'],
  effectCategory: 'paradigm',
  targetType: 'area',

  mechanics: {
    values: {
      source: 'natural world / land attunement',
      attunementTime: '3 months to 30 years',
      seasonalBonus: '+50% in primary season',
      seasonalPenalty: '-75% in opposite season',
      landBindingRange: '50-mile radius typical',
    },
    formulas: {
      spellPower: 'landConnection * seasonalMatch * ecosystemHealth',
      attunementStrength: 'timeSpentInNature * sincerity * landWillingness',
      landBindingPower: 'basePower * 3 (in territory) / 0.5 (outside)',
    },
    conditions: {
      'Land must agree': 'Spells are requests, not commands',
      'Seasonal limitations': 'Power varies dramatically by time of year',
      'Ecosystem health matters': 'Damaged land provides less power',
      'Patience required': 'Natural magic rarely works quickly',
    },
    dependencies: ['land_attunement', 'seasonal_alignment', 'ecosystem_health'],
    unlocks: ['weather_influence', 'plant_growth', 'animal_communion', 'land_binding', 'seasonal_mastery'],
  },

  tips: [
    'Spend time in nature without agenda—the land notices when you want something',
    'Learn your seasonal alignment; work with it rather than against it',
    'Damaged ecosystems still have power, but it\'s often angry. Heal before you harvest',
    'Land binding is permanent. Choose your territory carefully.',
  ],

  warnings: [
    'Opposite-season casting can fail catastrophically, not just weakly',
    'The land remembers harm. If your ancestors wronged a forest, it knows',
    'Urban environments don\'t lack natural magic; they have it and it\'s different and often hostile',
    'Land binding means you die if your land dies. Protect it.',
    'Never assume you know what the land wants. You don\'t. Ask.',
  ],

  examples: [
    {
      title: 'The Attunement',
      description:
        'Three years. Three years of walking the same forest paths, sleeping on the same moss, eating what the land provided. Three years of talking to trees that didn\'t answer, asking rivers for help that never came. Talia was about to give up—surely this was enough time, enough sincerity, enough patience? Then she woke one morning and felt it: the forest breathing around her, the slow pulse of sap rising in ten thousand trees, the mycorrhizal network beneath her feet trading nutrients like whispered secrets. The forest hadn\'t been ignoring her. It had been listening, evaluating, waiting until it was sure she was worth answering. "Finally," she breathed, and something ancient stirred in response: not words, not thoughts, but acknowledgment. She was heard now. What she did with that was up to her.',
    },
    {
      title: 'The Opposite Season',
      description:
        'Brennan was winter-attuned: cold, preservation, the beautiful stillness of deep frost. So when the village needed rain in midsummer, they sent someone else, surely? No. The other druids were gone, traveling, unavailable. Just Brennan, winter-bound Brennan, trying to call summer storms when every fiber of his attunement screamed wrongness. He managed it—sort of. The rain came, but cold, almost sleet, in the middle of the growing season. Half the crops froze. The village got their water but lost their harvest. "You did your best," they said, meaning it, not blaming him. But Brennan knew: his best wasn\'t good enough outside his season. It never would be. That was the bargain. Winter gave him power; summer took it away. He\'d traded versatility for depth, and this was the bill.',
    },
  ],

  relatedTopics: [
    'seasonal_attunement',
    'land_binding',
    'ecosystem_magic',
    'weather_manipulation',
    'animal_communion',
    'druidic_orders',
  ],
});

// ============================================================================
// ANCESTRAL MAGIC
// ============================================================================

export const ANCESTRAL_MAGIC_HELP = createEffectHelp('ancestral_magic', {
  summary: 'Power inherited from or granted by the honored dead',
  description: `Your ancestors are watching. This isn't metaphor, though the living often wish it were. In the ancestral paradigm, the dead don't simply cease—they transition, becoming spirits who linger in the spaces between worlds, maintaining connection to their descendants and, under the right circumstances, lending power to those they left behind.

The ancestral mage operates as nexus: a point of connection between the living and the dead, channeling the accumulated wisdom, skill, and power of generations. The more honored your ancestors, the more they achieved in life, the more powerful the inheritance they can provide. This creates interesting social dynamics: bloodlines matter, lineage matters, the reputation of the dead shapes the capability of the living. Wars have been fought to retroactively dishonor enemy ancestors, reducing their descendants' magical capability for generations.*

**Invocation** is the core technique: calling upon specific ancestors by name, requesting their assistance, channeling their skills through your body. A warrior ancestor grants combat prowess; a scholar ancestor provides knowledge; a mage ancestor lends magical power. The invoked ancestor doesn't possess you—not exactly—but their presence colors your perceptions, influences your reactions, and temporarily grants access to abilities you never learned. The experience is intimate in ways practitioners rarely discuss with outsiders.

**Shrine Maintenance** matters more than non-practitioners understand. Ancestors require honoring: prayers, offerings, remembrance. Neglected ancestors grow distant, weakening the connection. Deliberately dishonored ancestors may become hostile, turning their power against descendants who forgot them. The shrines aren't just religious decoration; they're magical infrastructure, maintained because the alternative is ancestral abandonment—or worse, ancestral vengeance.

**Lineage Depth** determines potential. First-generation dead (parents, grandparents) provide the strongest individual connections but limited scope. Ancient ancestors—ten, twenty, fifty generations back—offer collective power but blurred individual contact. The truly ancient ones, the founders of bloodlines, exist as mythic presences more than individual spirits: enormous power, nearly impossible to invoke specifically, occasionally choosing to manifest on their own for reasons nobody living quite understands.

The paradigm has uncomfortable implications. Some bloodlines are simply more powerful than others, through no merit of the living. Adoption into a bloodline grants partial access—the ancestors must accept you—but never full inheritance. Those with no known ancestry, orphans of broken lineages, face real disadvantage: reduced power, fewer options, the constant knowledge that they're working with less than others born luckier. The ancestral community argues constantly about whether this is divine order, historical accident, or evidence that the paradigm is fundamentally unjust. Nobody has reached consensus. Probably nobody will.

*The Third Dynasty War was fought almost entirely via ancestor-assassination: specialized strike teams hunting the elderly and vulnerable specifically to dishonor enemy lineages before they died. The resulting spiritual damage lasted three centuries.`,
  category: 'magic',
  tags: ['ancestral', 'spirits', 'paradigm', 'lineage', 'dead', 'inheritance'],
  effectCategory: 'paradigm',
  targetType: 'self',

  mechanics: {
    values: {
      source: 'honored ancestors',
      lineageBonus: '+10% per generation honored',
      invocationCost: 'offering + attention',
      shrineMaintenance: 'daily prayers, seasonal offerings',
      maxSimultaneousAncestors: '3 (typical)',
    },
    formulas: {
      invocationPower: 'ancestorStrength * honorLevel * bloodlineDistance',
      skillTransfer: 'ancestorSkill * invocationQuality * compatibility',
      ancestralFavor: 'baseFavor + (shrineQuality * offeringValue * prayerConsistency)',
    },
    conditions: {
      'Ancestors must be honored': 'Neglected spirits don\'t help',
      'Bloodline required': 'Must have ancestral connection (blood or adoption)',
      'Names matter': 'Specific invocation requires knowing ancestor\'s name',
      'Offerings expected': 'Power granted must be acknowledged and repaid',
    },
    dependencies: ['ancestral_connection', 'shrine_maintenance', 'lineage_knowledge'],
    unlocks: ['ancestor_invocation', 'skill_channeling', 'spiritual_guidance', 'death_sight', 'lineage_power'],
  },

  tips: [
    'Learn your ancestors\' names as far back as possible—specificity increases invocation power',
    'Maintain shrines consistently, not just when you need something',
    'Different ancestors excel at different things—match the invocation to the need',
    'Adoption into strong lineages is possible but requires the ancestors\' approval, which can\'t be faked',
  ],

  warnings: [
    'Neglected ancestors become resentful; resentful ancestors become dangerous',
    'Invoking ancestors who died badly (murder, dishonor, madness) can transfer their trauma temporarily',
    'The dead see differently than the living—their advice may not account for modern context',
    'Some ancestors refuse to leave after invocation. Expulsion rituals exist but are difficult',
    'Bloodline rivals may target your ancestors specifically—protect your shrines',
  ],

  examples: [
    {
      title: 'The First Invocation',
      description:
        'Grandmother had been dead three weeks. Long enough for transition, short enough for the connection to remain strong. Kira knelt before the shrine, lit the candles, spoke the name her grandmother had asked her to remember: not the public name, the secret one, the real one. "I need your help," she whispered. "I don\'t know how to do this." The response wasn\'t voice—ghosts don\'t speak, not exactly—but presence. Warm, familiar, amused at Kira\'s nervousness. Knowledge flowed: how to hold the knife, how to prepare the herbs, the recipe for the medicine Kira needed and couldn\'t find in any book. Grandmother had known. Now Kira knew. The invocation faded after ten minutes, leaving her shaking, grateful, and deeply aware that she\'d just touched something that changed her relationship with death forever.',
    },
    {
      title: 'The Dishonored Line',
      description:
        'The Valdris family had power once—twelve generations of honored dead, a lineage that could invoke warriors, scholars, kings. Then the Betrayal happened. One ancestor, one terrible choice, and the bloodline fractured. The honored ancestors refused association with the betrayer; the betrayer\'s descendants found themselves cut off, their shrines going cold no matter how they prayed. Markus Valdris was six generations from the Betrayal, innocent of any personal wrongdoing, and still his invocations failed. The ancestors wouldn\'t answer. They remembered what his great-great-great-grandfather had done, and they refused the entire contaminated line. He could convert—adopt into another lineage, abandoning his blood—or he could spend his life magic-poor, punished for crimes he\'d never committed. He chose to fight: to honor his ancestors anyway, to prove his worth despite rejection, to earn back what his lineage had lost. It would take generations. He would die before seeing results. He started anyway, because what else could he do?',
    },
  ],

  relatedTopics: [
    'shrine_maintenance',
    'invocation_techniques',
    'lineage_research',
    'ancestor_types',
    'spiritual_guidance',
    'dishonor_recovery',
  ],
});

// ============================================================================
// SYMBIOTIC MAGIC
// ============================================================================

export const SYMBIOTIC_MAGIC_HELP = createEffectHelp('symbiotic_magic', {
  summary: 'Magic through partnership with bonded entities—sharing power, sharing self',
  description: `The creature curled around her spine wasn't evil. It wasn't good either. It was hungry, it was curious, it was other, and it lived inside her now because they'd both chosen this arrangement. Symbiotic magic is the paradigm of partnership: you host an entity; the entity grants you power; both of you become something neither was alone.

The Bonding Protocols* established the formal rules after too many "symbioses" turned out to be parasitisms wearing partnership as camouflage. True symbiosis requires mutual benefit, ongoing consent from both parties, and clear boundaries about what each partner can access. The entity gets a host—shelter, mobility, sensation in the physical world. The host gets power—abilities that derive from the entity's nature, strength borrowed from another plane of existence. Done right, symbiosis creates more than either partner could be alone. Done wrong... well, that's why the Protocols exist.

**Entity Types** vary wildly:

**Spiritual Symbionts**: Ghosts, fragments, spirits of concept. Often the gentlest partners, offering wisdom and subtle enhancement rather than raw power. A scholar might host a knowledge-spirit, gaining eidetic memory and accelerated learning. The spirit experiences embodiment; the scholar experiences knowing things they never studied.

**Elemental Symbionts**: Fire, water, earth, air, stranger things. More powerful, more dangerous, often less compatible with human psychology. Hosting fire means becoming comfortable with destruction, with hunger, with consumption. The symbiont doesn't corrupt—but it does influence, and long-term hosting creates permanent personality drift toward elemental nature.

**Planar Symbionts**: Entities from other realities: demons, celestials, the nameless things from places that don't have names. High power, high cost, high risk. These entities have agendas, preferences, requirements that may conflict with their hosts' interests. The partnerships work—they can be beautiful, productive, decades-long—but they're negotiated peace, not unconditional alliance.

**Constructed Symbionts**: Artificially created entities designed for symbiosis: purpose-built partners without the baggage of independent evolution. Less power than natural entities, but more predictable, more compatible, less likely to pursue goals the host doesn't share. The magical equivalent of domestication, if domestication required mutual soul-sharing.

The experience of hosting is impossible to fully describe to the un-bonded. You're still you—that's the difference from possession—but you're also something else. You feel the symbiont's presence like a second heartbeat, its preferences like background music, its power like an extra limb you somehow always had but never noticed. Experienced hosts report difficulty remembering what singular existence felt like. Some describe it as loneliness remembered; others describe it as relief from a weight they never knew they carried.

Unbonding is possible but painful, for both parties. The Protocols require unbonding procedures before either partner can seek new symbiosis. Clean breaks are rare; most separations leave scars, psychological and sometimes physical, the places where two beings grew together and then had to be cut apart.

*Named after Healer Protocol, who developed them after losing three patients to parasitic entities masquerading as partners. The Protocols have saved thousands of lives. Protocol herself died hosting something she thought she'd tested adequately. Irony isn't limited to the physical world.`,
  category: 'magic',
  tags: ['symbiotic', 'bonding', 'paradigm', 'partnership', 'entity', 'host'],
  effectCategory: 'paradigm',
  targetType: 'self',

  mechanics: {
    values: {
      source: 'bonded entity',
      bondingTime: '1 week to 1 year',
      powerGain: 'entity-dependent',
      personalityDrift: '1% per year toward entity nature',
      unbondingRecovery: '3-12 months',
    },
    formulas: {
      symbiosisPower: 'entityPower * bondStrength * compatibility',
      compatibilityScore: 'hostAlignment * entityAlignment * willingness',
      driftRate: 'entityIntensity * exposureDuration * (1 - resistance)',
    },
    conditions: {
      'Mutual consent required': 'Both host and entity must agree',
      'Compatibility matters': 'Mismatched pairs have reduced power and increased drift',
      'Boundaries negotiable': 'Partners set rules about access and influence',
      'Separation possible': 'Unbonding exists but has costs',
    },
    dependencies: ['compatible_entity', 'bonding_ritual', 'ongoing_consent'],
    unlocks: ['entity_abilities', 'shared_perception', 'power_amplification', 'dimensional_access'],
  },

  tips: [
    'Vet potential symbionts thoroughly—the Protocols exist because too many didn\'t',
    'Set boundaries before bonding; renegotiating while merged is harder',
    'Regular communication with your symbiont prevents drift and misunderstanding',
    'Personality drift isn\'t necessarily bad, but monitor it consciously',
  ],

  warnings: [
    'Parasites imitate symbionts. Test extensively before committing',
    'Elemental hosting changes you. Decide if the changes are acceptable before bonding',
    'Planar entities have their own goals. Know what they want before you\'re merged',
    'Unbonding leaves both partners vulnerable. Plan for the recovery period',
    'Some symbionts don\'t want to leave. Ensure exit clauses before entry',
  ],

  examples: [
    {
      title: 'The Partnership',
      description:
        'Seren met Whisper in the deep meditation—a spirit of silence, curious about the loud world, willing to bond with someone who could give it experiences it couldn\'t have alone. They tested compatibility for three months: shared dreams, gradual contact, the slow process of learning whether two beings could share space without destroying each other. The bonding itself took four days of ritual, each boundary negotiated carefully. Whisper got sensation, embodiment, the noise of physical existence filtered through Seren\'s senses. Seren got silence-magic: the ability to suppress sound, create pockets of stillness, move without noise. More than that, she got company. Ten years later, she couldn\'t imagine existence without Whisper\'s presence, the comfortable weight of partnership. "We\'re better together," Whisper had said once, in the wordless way spirits communicate. Seren agreed. That was the whole point.',
    },
    {
      title: 'The Parasite Revealed',
      description:
        'It had seemed perfect. Power flowing easily, compatibility off the charts, the entity all warmth and enthusiasm. Valdis hosted it for six months before the inconsistencies started: memories he didn\'t recognize, decisions he didn\'t remember making, the slow realization that the entity wasn\'t sharing—it was feeding. The "symbiont" was parasitic: offering enough power to seem mutual while consuming Valdis\'s life force slowly, carefully, in ways he wouldn\'t notice until the damage was severe. The Unbonding Specialists saved him, barely, peeling the parasite away with techniques that felt like surgery without anesthesia. Three months of recovery. Permanent spiritual scarring. And the knowledge that he\'d been fooled, that the partnership he\'d treasured had been predation from the start. The Protocols existed for reasons. Valdis understood now. He\'d never skip the testing again.',
    },
  ],

  relatedTopics: [
    'bonding_protocols',
    'entity_types',
    'compatibility_testing',
    'unbonding_procedures',
    'personality_drift',
    'symbiont_communication',
  ],
});

// ============================================================================
// GEOMETRIC MAGIC
// ============================================================================

export const GEOMETRIC_MAGIC_HELP = createEffectHelp('geometric_magic', {
  summary: 'Magic through sacred shapes, ritual circles, and mathematical precision',
  description: `The universe has a shape. Not metaphorically—literally, geometrically, in ways that predate matter and will outlast entropy. The geometric paradigm holds that reality is structured according to mathematical principles, and that understanding those principles grants the ability to edit reality's source code. It's magic for people who think algebra is romantic.*

Ritual circles are the visible expression: precise diagrams that channel power through their shapes. A circle contains and protects. A triangle directs force. A pentagram binds. A heptagon opens doors to places that shouldn't have doors. The shapes themselves are arbitrary—you could use any consistent system—but these particular shapes have been refined over millennia, their mathematical properties aligning with magical principles in ways that other geometries don't quite match.

The precision requirement is absolute. A circle that's 99.7% accurate works at 99.7% efficiency... sometimes. More often, the 0.3% error creates an instability point where power leaks, backlashes, or does something creative that nobody asked for. Master geometers work with tools—compasses, straight edges, laser levels in modern contexts—because freehand ritual circles are for the suicidal or the genuinely transcendent, and most practitioners are neither.

**Sacred Geometries** form the foundation:

The **Circle** represents completion, protection, and containment. All geometric magic begins with circle-work: establishing boundaries, creating protected spaces, containing power that would otherwise dissipate. A properly drawn circle can hold anything inside from anything outside, or vice versa, which makes it useful for both protection and binding.

**Triangles** direct and focus. Power enters one point, is refined at the second, and exits at the third. The orientation matters: point-up triangles channel upward (spirit, abstraction, divinity); point-down triangles channel downward (earth, manifestation, physicality). Interlocking triangles create balance points—the hexagram—useful for transformation where power must flow both directions.

**Squares and Rectangles** stabilize. They're terrible for active effects but excellent for permanent enchantments, wards that must last, structures that need to maintain form. Angular magic is slow magic, persistent magic, the magic of buildings and boundaries.

**Pentagrams** bind and banish. The five points represent the elements (four physical, one spiritual) in balance. Inverted, they represent the elements in chaos. Both orientations have uses; the taboo against inversions is more social than magical. A pentagram drawn correctly can hold a demon; drawn incorrectly, it holds whatever's on the wrong side of the line, which sometimes includes the practitioner.

**Higher Geometries** access stranger effects. Hexagons tile infinitely and connect to dimensional magic. Heptagons break symmetry and access probability manipulation. Nonagons and above require either specialized training or the sort of intuitive mathematical genius that appears maybe once per generation.

The paradigm attracts theoreticians—people who enjoy the puzzle aspect, the problem-solving, the satisfying click when geometry and magic align perfectly. It repels those who want quick results; nothing in geometric magic is quick. But for those with patience and precision, it offers something other paradigms can't: perfect reliability. A correctly drawn ritual does exactly what it should, every time. No bargaining with entities, no channeling emotions, no hoping the land feels cooperative. Just mathematics, executed correctly, producing predictable results.

*This isn't a joke. The annual Geometric Magic Conference has a higher rate of in-conference marriages than any other magical gathering. Something about shared appreciation for the beauty of perfect angles.`,
  category: 'magic',
  tags: ['geometric', 'ritual', 'paradigm', 'circles', 'precision', 'mathematics'],
  effectCategory: 'paradigm',
  targetType: 'area',

  mechanics: {
    values: {
      source: 'mathematical precision',
      circleAccuracy: 'must be >99.5% for safe operation',
      drawingTime: '10 minutes to 10 hours depending on complexity',
      permanenceBonus: '+200% duration for angular geometries',
      errorConsequence: 'proportional to power channeled',
    },
    formulas: {
      effectPower: 'basePower * geometricAccuracy * materialQuality',
      stabilityFactor: 'accuracy^2 * symmetry',
      backlashRisk: '(1 - accuracy) * powerChanneled * complexity',
    },
    conditions: {
      'Precision required': 'Errors compound with power level',
      'Preparation time': 'Cannot be cast quickly—circles take time',
      'Material matters': 'Chalk, salt, blood, silver—each medium has properties',
      'Environment stable': 'Vibration or wind can distort diagrams mid-ritual',
    },
    dependencies: ['drawing_tools', 'stable_surface', 'geometric_knowledge'],
    unlocks: ['ritual_circles', 'permanent_wards', 'binding_diagrams', 'dimensional_keys'],
  },

  tips: [
    'Invest in quality tools—precision is everything and good compasses matter',
    'Practice basic circles until you can draw 99.9% accuracy by feel',
    'Permanent diagrams should use permanent materials: silver, gold, carved stone',
    'Check your work before activating. Every time. Without exception.',
  ],

  warnings: [
    'Errors in high-power circles can cause explosions, dimensional tears, or worse',
    'Interrupted rituals don\'t simply fail—they fail unpredictably',
    'Some geometries are forbidden because they work too well',
    'Permanence cuts both ways: permanent wards are permanent mistakes if drawn wrong',
    'The precision obsession can become pathological. Balance ritual work with other activities.',
  ],

  examples: [
    {
      title: 'The Perfect Circle',
      description:
        'Mathemagician Venna worked for three hours on a binding circle. Just a binding circle—nothing exotic, nothing dangerous, just the most basic protective geometry. Her apprentice watched, confused, as Venna measured, checked, remeasured, adjusted a line by millimeters, remeasured again. "Why does it take so long?" the apprentice asked. Venna pointed at the summoning tome they\'d use next: a demon of modest power, nothing dramatic. "Because this circle is the only thing between that and us. 99% accurate means 1% chance of failure. Draw a hundred circles, one kills you. I\'ve drawn thousands. My accuracy is 99.99%. I\'ve had three close calls. One millimeter here, one millimeter there—that\'s the difference between control and catastrophe. Now hand me the caliper."',
    },
    {
      title: 'The Freehand Master',
      description:
        'Geometer Kal could draw perfect circles without tools. Not figuratively—literally, geometrically perfect, measured by instruments that should have detected some variance but consistently didn\'t. Nobody understood how. Kal herself claimed she simply "felt" the mathematics, the way musicians feel rhythm, the way painters feel color. She was tested, studied, analyzed. The Academy concluded she had some form of mathematical synesthesia: her brain processed spatial relationships as directly as others processed sight. She became famous, legendary, the woman who proved geometric magic could be intuitive. She died at forty-three, killed by the one imperfect circle she ever drew—a complicated hexagonal bind that she rushed, that was 99.8% accurate, that failed at exactly the wrong moment. Her students analyzed the diagram afterward, found the error: two degrees of deviation in one interior angle. Genius, they learned, wasn\'t immunity. It was just better odds.',
    },
  ],

  relatedTopics: [
    'ritual_circles',
    'sacred_geometries',
    'precision_tools',
    'binding_diagrams',
    'dimensional_geometry',
    'permanence_magic',
  ],
});

// ============================================================================
// MUSICAL MAGIC
// ============================================================================

export const MUSICAL_MAGIC_HELP = createEffectHelp('musical_magic', {
  summary: 'Magic through sound, harmony, and the vibrational frequencies of reality',
  description: `In the beginning was the Word, and the Word was a C-sharp.*

Musical magic operates on the principle that reality vibrates—that everything, at its most fundamental level, is frequency. Matter vibrates slowly. Light vibrates quickly. Thought vibrates somewhere in between. The musical mage learns to add their voice to the cosmic chorus, harmonizing with existing frequencies to amplify them or introducing dissonance to disrupt them.

The Bardic Colleges have formalized what was once intuitive: a system of magical music theory that correlates notes with effects, chords with complex workings, melodies with sustained enchantments. A single pure tone can shatter crystal or soothe pain. A chord can invoke emotion or dispel illusion. A full composition can reshape local reality, layering effect upon effect until the music becomes a living thing that persists even after the last note fades.

**Tonal Correspondences** form the foundation:

**Low frequencies** affect the physical: earth, stone, body, bone. Bass notes shake foundations, stabilize structures, ground energies. The deepest tones—below human hearing—can cause earthquakes or induce profound calm, depending on rhythm.

**Mid frequencies** affect the emotional and mental: thought, feeling, intention, will. The human voice lives here, which is why sung magic has power over human minds. Persuasion, inspiration, terror, peace—all live in the middle octaves.

**High frequencies** affect the ethereal: spirit, energy, light, abstraction. Piercing notes can cut through wards, disrupt enchantments, reach into dimensions that dense sounds can't touch. The highest tones—above human hearing—affect things humans can't perceive directly.

**Harmonics and Dissonance** create complexity. Pure tones do simple things; harmonious combinations do complex things coherently. Dissonance disrupts, cancels, unmakes—useful for counterspelling, harmful for most other purposes. A skilled musical mage knows exactly how much dissonance to introduce: enough to destabilize a target without destabilizing everything.

The paradigm requires genuine musical ability. Not just technical skill—though that helps—but the ineffable quality that separates a musician from someone who merely plays notes. The magic responds to artistry, not just accuracy. Two practitioners playing identical compositions can produce dramatically different results, because one's playing has soul and the other's doesn't. What counts as "soul" remains hotly debated, usually by practitioners who suspect they're the ones lacking it.

Performance requirements make musical magic awkward for combat: you're standing still, producing sound, drawing attention. Battle-bards exist but they're rare, requiring either extreme skill (casting while dodging), extreme support (someone else handles the fighting), or extreme specialization (very short, very loud, very effective combat songs that sacrifice subtlety for speed).

*Theologians disagree on the note. The Church of Harmony insists it was C-major. The Dissonance Cult maintains it was a tritone. Most musicians just want everyone to tune to A-440 and stop arguing.`,
  category: 'magic',
  tags: ['musical', 'bardic', 'paradigm', 'sound', 'harmony', 'performance'],
  effectCategory: 'paradigm',
  targetType: 'area',

  mechanics: {
    values: {
      source: 'musical performance',
      minimumSkill: 'journeyman-level proficiency',
      castingTime: '3 seconds to 3 hours (song-dependent)',
      persistenceBonus: 'effects can outlast performance with resonance',
      performanceRequirement: 'cannot cast silently',
    },
    formulas: {
      effectPower: 'technicalSkill * artistry * instrumentQuality * acousitcs',
      persistenceDuration: 'compositionComplexity * resonanceQuality',
      areaOfEffect: 'volume^2 * frequencyMatch',
    },
    conditions: {
      'Must perform': 'Cannot cast in silence',
      'Skill required': 'Musical competence is prerequisite',
      'Artistry matters': 'Technical accuracy alone insufficient',
      'Acoustics matter': 'Environment affects sound propagation and power',
    },
    dependencies: ['musical_instrument_or_voice', 'acoustic_environment', 'musical_training'],
    unlocks: ['emotional_manipulation', 'physical_resonance', 'persistent_enchantment', 'group_harmony'],
  },

  tips: [
    'Practice music, not just magic—the instrument skills transfer directly',
    'Know your venue: acoustics dramatically affect power',
    'Short pieces for combat, long compositions for lasting effects',
    'Group performance multiplies power geometrically, not additively',
  ],

  warnings: [
    'Magical silence effects completely neutralize musical mages',
    'Dissonance used carelessly affects the caster as much as targets',
    'Performance is vulnerable—you\'re standing still, making noise',
    'The artistry requirement means burnout affects casting more than in other paradigms',
    'Audiences have opinions. Hostile listeners can interfere with effects.',
  ],

  examples: [
    {
      title: 'The Battle Hymn',
      description:
        'The army was losing. Mora could see it in the way formations faltered, in the creeping despair that sapped sword-arms and dimmed hope. She climbed a broken wall, raised her voice, and began to sing. Not a tactical spell—she didn\'t have time for complexity. Just a melody she\'d known since childhood, about standing firm, about fighting on, about dawn that comes after darkness. The notes carried across the battlefield, cutting through the clash of steel, reaching every soldier on her side. Not magic, exactly—not at first. But as the song continued, as she meant every word, as she poured her own hope into the harmony, something answered. The music began to glow. Soldiers straightened. Pain receded. Fear transformed into determination. The army rallied, pushed back, won. Mora collapsed afterward, voice shredded, power spent. "Worth it," she whispered. The healers agreed, eventually, once her throat worked again.',
    },
    {
      title: 'The Lasting Song',
      description:
        'Composer Thren spent forty years on his final piece: a symphony designed to persist after death, to play itself in resonance with the building he\'d commissioned specifically for its acoustics. The performance took seven hours, three orchestras in rotation, and Thren conducting despite the cancer consuming him. When the last note faded, the resonance began: a harmonic echo, barely audible, that continued after the instruments stopped. Thren died three days later, satisfied. The symphony still plays, two centuries on—you can hear it if you stand in the central chamber, if you hold still, if you\'re quiet enough to perceive what should have ended generations ago. Some scholars say the music contains Thren\'s consciousness, persisting through sound. Others say it\'s just very clever acoustics. The music neither confirms nor denies. It simply continues, as Thren intended, as Thren designed, as Thren composed himself into something that doesn\'t quite stop.',
    },
  ],

  relatedTopics: [
    'tonal_correspondences',
    'bardic_colleges',
    'instrument_attunement',
    'group_performance',
    'resonance_theory',
    'persistent_sound',
  ],
});
