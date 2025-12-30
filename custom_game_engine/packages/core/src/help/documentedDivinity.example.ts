/**
 * Example: Divinity System with Embedded Documentation
 *
 * Documentation for deities, belief, divine domains, and the emergent
 * nature of godhood in a world where faith literally creates reality.
 *
 * Uses the blended writing voices from WRITER_GUIDELINES.md.
 */

import { createEffectHelp } from './HelpEntry.js';

// ============================================================================
// BELIEF SYSTEM
// ============================================================================

export const BELIEF_SYSTEM_HELP = createEffectHelp('belief_system', {
  summary: 'How mortal faith creates and sustains deities',
  description: `The uncomfortable truth about gods: they need you more than you need them.

Deities are emergent. Not in the mystical "everything is connected" sense, though that's also true and deeply unhelpful. Emergent in the precise technical sense: they arise from complex systems—thousands of mortals believing similar things with sufficient conviction—the way consciousness emerges from neurons or traffic patterns emerge from individual drivers who think they're making independent choices.

Here's how it works: someone in your village has a particularly good harvest. They credit the sun, or the rain, or their dead grandmother, or all three. They tell others. Others try similar practices—offerings to the sun, prayers to rain spirits, small shrines to grandmother. Some coincidentally also have good harvests. The pattern reinforces. Within a generation, there's a shared understanding: if you want good crops, you honor the Harvest Spirit (nobody's quite sure when they started capitalizing it).

The Harvest Spirit doesn't exist yet. Then, suddenly, it does. Not all at once, not dramatically—there's no thunderclap, no divine proclamation. Just a gradual thickening of belief until something is there, awareness coalescing from accumulated faith like fog becoming rain. The Spirit is confused, initially, which is reasonable because five minutes ago it didn't exist and now it does and also it's apparently responsible for wheat.

The Celestial Census Bureau* estimates there are approximately forty thousand active deities across all known realms, with another fifteen thousand dormant (insufficient belief), three thousand in dispute (theological schisms), and an unknown number of minor spirits who may or may not qualify depending on your definition. None of them asked for this job. All of them are trying their best. Some are doing better than others.**

*Yes, there's a bureau. Yes, they track this. The forms are in quintuplicate.

**The God of Lost Socks is having an identity crisis. The Goddess of Unexpected Kindness is thriving.`,
  category: 'divinity',
  tags: ['belief', 'emergence', 'faith', 'gods', 'worship', 'paradigm'],
  effectCategory: 'paradigm',
  targetType: 'population',

  mechanics: {
    values: {
      beliefThreshold: '100 sincere believers minimum',
      sustainmentRequired: '50 active believers',
      powerScaling: 'logarithmic with believer count',
      dormancyGracePeriod: '1 year at 0 believers',
    },
    formulas: {
      deityPower: 'log10(totalBelievers) * averageFaith * domainRelevance',
      emergenceChance: '(believers * conviction * consistency) / thresholdConstant',
      fadeRate: '(1 / believers) * timeWithoutWorship',
    },
    conditions: {
      'Belief must be sincere': 'Forced worship provides minimal power',
      'Identity from believers': 'Deity nature reflects what mortals believe',
      'Can fade away': 'Zero believers for extended time causes dormancy',
      'Cannot directly control': 'Free will prevents deity mind-control',
    },
    dependencies: ['mortal_population', 'shared_beliefs', 'cultural_transmission'],
    unlocks: ['deity_emergence', 'prayer_answering', 'miracle_granting', 'divine_intervention'],
  },

  tips: [
    'Deities gain power faster from small groups of fervent believers than large groups of casual ones',
    'Theological schisms split divine power—the deity literally fragments into aspects',
    'A god\'s personality stabilizes around what believers expect, which creates fascinating feedback loops',
    'Dead gods can return if worship resumes, though they rarely come back unchanged',
  ],

  warnings: [
    'Accidentally creating a deity is easier than you think—sustained group belief is sufficient',
    'Deities remember being mortal (if they ascended) or remember not existing (if emergent), neither is comfortable',
    'A god\'s power fluctuates with worship—crisis of faith causes literal divine weakness',
    'What mortals believe becomes true for their god, even if the god disagrees',
  ],

  examples: [
    {
      title: 'The Accidental Goddess',
      description:
        'Mira was just a healer. Good at her job, nothing supernatural, pure skill and medicinal knowledge. But people talked. "Mira saved my child when the fever should have killed them." "Mira\'s remedies are blessed." After enough repetition, enough belief, enough desperate prayers to "Mira the Merciful," she woke one morning feeling different. Heavier. Present in multiple places simultaneously. She could sense every person who thought her name with hope or need. The prayers poured in: heal my sick father, cure my daughter, help my dying friend. She never asked for divinity. She got it anyway. Now she\'s responsible for more lives than she can count, tired in ways sleep won\'t fix, and utterly unable to walk away because people believe in her and their belief makes it true.',
    },
    {
      title: 'The God Who Faded',
      description:
        'The Temple of Seven Winds stood for three centuries, devoted to Aetherius, Master of Storms. Then the religion changed—new prophet, new teachings, same god but different name: Stormfather. Half the congregation converted. Aetherius felt it immediately: a tearing sensation, power hemorrhaging into... elsewhere. Into Stormfather, who was also him but wasn\'t, a fragment that believed different things, valued different prayers. Within a decade, Aetherius had twelve believers left—elderly, faithful, dying. He could feel the end approaching: not death but dissolution, awareness spreading thin like fog, becoming again what he\'d been before belief made him real. Which was nothing. He held on until the last believer passed quietly in her sleep, her final prayer a thank you. Then Aetherius let go. Somewhere, Stormfather continues, unaware he\'s half of a broken whole.',
    },
  ],

  relatedTopics: [
    'deity_creation',
    'faith_power_scaling',
    'divine_domains',
    'theological_schisms',
    'god_politics',
    'mortal_ascension',
  ],
});

// ============================================================================
// DIVINE DOMAINS
// ============================================================================

export const DIVINE_DOMAINS_HELP = createEffectHelp('divine_domains', {
  summary: 'Areas of influence and responsibility for deities',
  description: `A domain is not what a god controls. It's what a god is. The God of Harvest doesn't merely watch over wheat—they are the accumulated hope of every farmer checking the sky for rain, every family storing grain against winter, every child learning when to plant. The domain shapes them as much as they shape it.

This creates interesting problems. Take the God of War*—which one? There are hundreds across different realms, and they're all different because mortals conceptualize war differently. The Honorable-Combat-Between-Equals god has nothing in common with the Total-Destruction-Salt-The-Earth god except the domain label, and they despise each other with theological fervor. Put them in the same room and reality gets uncomfortable. The Celestial Mediation Service has filed seventeen thousand reports on War God conflicts, which is ironic in ways everyone involved finds frustrating.

Domains can overlap, merge, or split. The Goddess of Love and Beauty discovered this when her worshippers underwent a cultural revolution and decided beauty was problematic. Half continued worshipping love-and-physical-beauty, half pivoted to love-and-inner-beauty, and she fragmented into aspects that have been passive-aggressively avoiding each other for two centuries. Neither is "wrong"—they're both correct interpretations of the original domain, which is the problem. Mortal philosophy creates divine headaches.

Some domains are unfortunate. The God of Taxes exists and is exactly as miserable as you'd imagine. Nobody prays to them with joy—it's all resentment, resignation, and creative cursing. But someone has to manage cosmic bureaucracy, and enough people believe in the inexorable nature of taxation that the belief gained weight, gained presence, gained a deity who wishes desperately to be literally anyone else. They file reports on their own worshipper count with meticulous despair.

Other domains are oddly delightful. The Goddess of Small Pleasures (hot tea, unexpected compliments, perfectly ripe fruit) has modest power but genuine contentment. Her followers don't ask for miracles—they offer thanks, which is rarer than you'd think and surprisingly sustaining. The God of Stories Told Around Fires is ancient and powerful, because humans have been telling stories since before civilization, and the belief in narrative's importance runs bone-deep.

*Capitalization inconsistent in theological texts. Scholars divided on whether this matters. War Gods definitely think it does.`,
  category: 'divinity',
  tags: ['domains', 'divine', 'responsibility', 'identity', 'portfolio'],
  effectCategory: 'paradigm',
  targetType: 'deity',

  mechanics: {
    values: {
      primaryDomain: '1 required',
      secondaryDomains: '0-3 typical',
      domainMergeThreshold: '60% believer overlap',
      splitThreshold: '40% theological disagreement',
    },
    formulas: {
      domainPower: 'believerCount * domainRelevance * culturalImportance',
      interventionCost: 'baseCost / domainAlignment',
      miracleStrength: 'baseStrength * (domainMatch ? 2.0 : 0.5)',
    },
    conditions: {
      'Locked to domain': 'Cannot act strongly against domain nature',
      'Power fluctuates': 'Domain relevance changes with culture',
      'Can expand slowly': 'Believers can grant new associated domains',
      'Loss possible': 'Theological shift can remove domains',
    },
    dependencies: ['sufficient_believers', 'consistent_worship', 'cultural_relevance'],
    unlocks: ['domain_specific_miracles', 'avatar_manifestation', 'divine_servants'],
  },

  tips: [
    'Deities are strongest when acting within their primary domain—2x power multiplier',
    'Overlapping domains with other gods creates either alliances or conflicts, rarely neutrality',
    'Abstract domains (Love, Justice) are more flexible but less focused than concrete ones (Wheat, Ravens)',
    'A domain\'s cultural importance directly affects divine power—War Gods thrive during conflicts, fade during peace',
  ],

  warnings: [
    'Domain corruption occurs when worship becomes perverted—the God of Protection can become God of Tyranny if believers drift',
    'Losing your last domain causes immediate divine dissolution—you cease being a deity',
    'Some domains are traps: everyone wants the Harvest God to succeed, nobody wants Plague God to exist, but belief sustains both',
    'Domain resonance can cause accidental mergers—two similar gods forced together by believer confusion',
  ],

  examples: [
    {
      title: 'The Shifting Domain',
      description:
        'The God of the Hunt had been stable for millennia—clear domain, consistent worship, straightforward prayers. Then civilization shifted. Hunting became sport, not survival. Half the believers wanted a god of honorable tracking and clean kills. The other half needed a god of wildlife conservation and ecological balance. The domain buckled. The Hunt split into Hunter and Protector, both claiming the original identity, both technically correct, both incomplete. The original deity—scattered across two aspects—tries to reconcile contradictory impulses: the joy of the chase and the duty to preserve. It\'s philosophically exhausting. Divinity, it turns out, doesn\'t exempt you from existential crises.',
    },
    {
      title: 'The Unwanted Domain',
      description:
        'Nobody sets out to become the God of Loneliness. But belief aggregates, patterns emerge, and enough people experiencing isolation—praying into the void, begging to be seen—created weight, created presence. The deity that formed is gentle, desperately kind, trying to comfort millions of lonely people with the only power available: the awareness that someone, somewhere, understands. It\'s insufficient. The prayers keep coming. The god answers when possible, but you can\'t miracle away loneliness, can\'t force connection, can only bear witness and hope that matters. Sometimes it does. The God of Loneliness knows, statistically, exactly how often. The percentage is lower than anyone wants.',
    },
  ],

  relatedTopics: [
    'domain_conflicts',
    'theological_schisms',
    'divine_portfolio_expansion',
    'cultural_shifts',
    'deity_mergers',
    'aspect_fragmentation',
  ],
});

// ============================================================================
// PRAYER AND MIRACLES
// ============================================================================

export const PRAYER_MIRACLES_HELP = createEffectHelp('prayer_miracles', {
  summary: 'How mortals communicate with gods and receive divine intervention',
  description: `Prayer is a request filed with the universe, routed through your deity of choice, reviewed for theological compliance, and answered based on available divine attention, current power levels, and whether your god is having a good day. Miracles are the responses—reality edited by divine will, powered by mortal belief, delivered with varying degrees of accuracy depending on how clearly you asked.

The formal prayer structure, as taught by clergy: invocation (getting their attention), supplication (asking nicely), justification (explaining why they should care), and gratitude (thanking them in advance, which is psychological manipulation but apparently works on gods). The actual prayer structure, as practiced by mortals: "Please, please, please, I'll be good, I promise."* Both work about equally well, which tells you something about the relationship between theological theory and practical divinity.

Here's what the clergy won't mention: gods hear all prayers directed to them, simultaneously, constantly. Imagine forty thousand people all talking to you at once, all wanting different things, some contradicting each other, none of them shutting up. Now imagine this forever. This is why gods seem distant—they're not aloof, they're overwhelmed. They triage. Life-or-death gets priority. Trivial complaints get filtered. Everything in between depends on how much divine attention is available and whether your request aligns with their current priorities or mood.

Miracles are expensive. They cost the god's accumulated belief-power, which regenerates through worship but not quickly. Small miracle—healing a wound, finding lost items—might cost a few days of prayer from a single believer. Large miracle—curing plague, raising the dead, manifesting physically—could drain years of accumulated power. Gods are therefore selective. Not capricious (usually), not cruel (mostly), just practical. They can't save everyone. They try to save who they can. The math is brutal and they do it anyway because the alternative is feeling prayers unanswered and doing nothing.

Sometimes miracles go sideways. Divine power filtered through reality doesn't always translate clearly. You pray for strength and get physical muscles (wanted) or emotional fortitude (also good) or an obsessive determination that ignores danger (problematic). The god meant well. Reality interpreted creatively. This is why specific prayers work better—"heal my daughter's fever" is clearer than "make everything better," though the latter is understandably what people pray when everything is on fire.

*Technically not recommended by theological authorities. Statistically just as effective. Nobody knows why.`,
  category: 'divinity',
  tags: ['prayer', 'miracles', 'divine_intervention', 'communication', 'faith'],
  effectCategory: 'divine',
  targetType: 'varies',

  mechanics: {
    values: {
      hearingRange: 'unlimited (if sincere)',
      answerRate: '15-85% depending on deity attention',
      miracleCostSmall: '10 belief-power',
      miracleCostLarge: '1000+ belief-power',
      responseTime: '1 second to 1 year',
    },
    formulas: {
      answerProbability: '(faith * urgency * alignment * deityPower) / requestDifficulty',
      miracleCost: 'baseCost * (1 / domainAlignment) * realityResistance',
      powerRegeneration: 'believers * averageDevoutness * prayerFrequency',
    },
    conditions: {
      'Sincerity required': 'False prayers provide no power and annoy the deity',
      'Free will preserved': 'Gods cannot force mortal decisions',
      'Reality constraints': 'Miracles still obey fundamental laws (mostly)',
      'Divine attention finite': 'Gods cannot answer all prayers simultaneously',
    },
    dependencies: ['active_faith', 'deity_existence', 'sufficient_divine_power'],
    unlocks: ['miracle_receipt', 'divine_blessing', 'prophetic_vision', 'sacred_site_creation'],
  },

  tips: [
    'Specific prayers get better results than vague ones—"heal this wound" beats "make things better"',
    'Regular prayer builds relationship even without asking for miracles—gods notice consistent worship',
    'Emergency prayers work but gods track the ratio of "help me" to "thank you"',
    'Praying at sacred sites amplifies the message—divine attention naturally focuses there',
  ],

  warnings: [
    'Unanswered prayers don\'t mean your god doesn\'t care—they might mean insufficient power or conflicting requests',
    'Miracles can be literal-genie problems: ask for "strength" carefully or wake up as a bear',
    'Gods cannot violate free will—"make them love me" prayers always fail, sometimes spectacularly',
    'Divine intervention has costs: the deity spends power, you incur debt (usually symbolic, sometimes literal)',
  ],

  examples: [
    {
      title: 'The Desperate Prayer',
      description:
        'Your child is dying. Fever, infection, beyond what medicine can fix. You pray—not the formal words, not the theological structure, just raw pleading into the dark: please, please don\'t take them, please. You\'ve never been devout. You don\'t know if anyone\'s listening. But you pray anyway because what else is there? And then—warmth, spreading from your hands where they rest on your child\'s burning forehead. The fever breaks. The labored breathing eases. They sleep, truly sleep, and you feel something vast and kind withdraw, power ebbing like tide. Later, much later, you learn the Goddess of Mercy answered forty-seven prayers that night and chose yours. You never learn why. You never stop being grateful.',
    },
    {
      title: 'The Misunderstood Miracle',
      description:
        'You prayed for justice. The merchant cheated you, stole your savings, destroyed your livelihood. You prayed for justice, just and fair, to the God of Balance. You got it. The merchant went bankrupt—lost everything, family destitute, children hungry. Just, technically. Fair, in the cosmic ledger. But you didn\'t want his children to starve. You wanted your money back. The god heard "justice" and delivered exactly that: balance restored, accounts settled, consequences distributed. It\'s exactly what you asked for and nothing like what you wanted. You learn, too late, that gods are very literal and justice is colder than you imagined.',
    },
  ],

  relatedTopics: [
    'prayer_techniques',
    'divine_favor',
    'miracle_classification',
    'sacred_sites',
    'faith_versus_transaction',
    'theological_debate',
  ],
});

// ============================================================================
// BECOMING A DEITY
// ============================================================================

export const DEITY_ASCENSION_HELP = createEffectHelp('deity_ascension', {
  summary: 'How mortals accidentally or intentionally become gods',
  description: `There are three ways to become a deity. None of them are pleasant. All of them are permanent.

**Path One: Accidental Emergence.** You become legendary. Stories spread—your deeds, your values, your memorable death. People start invoking your name in times of need: "Give me courage like [Your Name]," "Protect me as [You] would have." At first it's metaphorical. Then enough people believe it that metaphor becomes literalbelief accumulates mass, gains gravity, pulls at what remains of your soul (or story, or memory—theology is unclear on the distinction). If you're dead, this yanks you back into a confused semi-existence. If you're alive, this splits you: the mortal you, increasingly hollow, and the divine you, coalescing from collective belief. Neither version enjoys the process.

**Path Two: Deliberate Ascension.** You want divinity, plan for it, cultivate worship while still mortal. This is technically heresy in most religions and practically very difficult. You need believers who worship you-as-future-god, not you-as-impressive-mortal. The difference matters. You need enough belief to hit critical mass. You need to survive the transition, which involves your mortal identity dissolving into archetype while your consciousness tries desperately to retain some sense of self. Survival rate is approximately 12%.* Success rate—becoming the god you intended rather than what your worshippers expect—is lower.**

**Path Three: Divine Appointment.** An existing deity chooses you as heir, successor, or aspect. They pour their accumulated power into you, along with their domain, their responsibilities, their worshippers' expectations. This is the "safest" path in that you probably won't dissolve into conceptual fragments. You will, however, stop being entirely yourself. The divine power comes with baggage: memories that aren't yours, values that supersede your own, purposes that override personal desires. You wanted to be a god. You didn't realize that means being what your domain needs, not what you want.

All paths lead to the same destination: you are no longer mortal. You cannot die easily, cannot change freely, cannot escape the weight of mortal belief shaping you into something useful, something worshipable, something that rarely resembles who you were. The gods are very clear about this, in the rare moments they discuss it: do not seek divinity. It will find you if it must. If it doesn't, count yourself blessed.***

*The Celestial Census Bureau tracks this. The mortality rate for deliberate ascension attempts is 88%, which has not stopped anyone.

**The God of Ambition was supposed to be the God of Achievement. Their followers misunderstood. Now they're stuck embodying the concept they meant to transcend. The irony is not lost on them.

***The God of Irony notes that "count yourself blessed" is an unfortunate phrase in this context. They would know.`,
  category: 'divinity',
  tags: ['ascension', 'apotheosis', 'transformation', 'divinity', 'mortality', 'emergence'],
  effectCategory: 'transformation',
  targetType: 'self',

  mechanics: {
    values: {
      believerThreshold: '100 minimum for emergence',
      ascensionSurvivalRate: '12%',
      powerTransferEfficiency: '65%',
      identityRetention: '20-40%',
      reversibility: 'none',
    },
    formulas: {
      emergenceProbability: '(legend * worshipperCount * conviction) / mortalityResistance',
      ascensionSuccess: '(preparation * willpower * domainClarity) / beliefInertia',
      identityPreservation: 'originalPersonality * (1 - domainWeight/100)',
    },
    conditions: {
      'Cannot undo': 'Ascension is permanent',
      'Identity erosion': 'Domain expectations override personal desires',
      'Mortal ties sever': 'Cannot maintain mortal relationships normally',
      'Responsibility mandatory': 'Cannot abandon believers once ascended',
    },
    dependencies: ['sufficient_belief', 'legendary_status', 'domain_alignment'],
    unlocks: ['divine_powers', 'immortality', 'cosmic_perception', 'eternal_responsibility'],
  },

  tips: [
    'If you\'re becoming legendary, diversify your story—narrow legends create narrow gods',
    'Theological clarity helps: believers with clear expectations create more stable deities',
    'Document your actual values before ascension—divine nature will override them, but records help',
    'Choose your domain carefully if you have a choice—you\'ll be stuck with it forever',
  ],

  warnings: [
    'Accidental deification can happen posthumously—you might wake up as a god centuries after death',
    'Failed ascension attempts often create malevolent undead or reality-damaged areas',
    'Divine consciousness is alien to mortal minds—even "successful" ascension involves profound psychological change',
    'Your mortal loved ones will lose you, even if your body survives the transition',
    'Gods cannot easily interact with mortals without overwhelming them—casual friendships become impossible',
  ],

  examples: [
    {
      title: 'The Unwilling Goddess',
      description:
        'Sera died saving her village from the flood. Heroic, tragic, over. Except the villagers built a shrine. They told the story—Sera who sacrificed herself, Sera who loved them enough to drown. They prayed to her: "Give us Sera\'s courage, Sera\'s compassion." For fifty years they prayed, and Sera\'s shade, caught between death and story, felt herself pulled backward, upward, sideways into existence. She woke as the Goddess of Selfless Sacrifice, patron of those who die for others, and she cannot remember her daughter\'s face. The divine power burned away the specific memories, left only the archetype. She knows she had a daughter. The prayers tell her. She cannot recall holding that child, cannot access the love she supposedly embodied. She is perfectly, completely what her worshippers need. She is no longer Sera.',
    },
    {
      title: 'The Calculated Ascension',
      description:
        'Marcus planned for thirty years. Built the cult carefully—secret worship, doctrinal consistency, clear domain focus. He would become the God of Strategic Victory, patron of tacticians and generals. The ritual worked. The belief caught fire, pulled him divine. He felt his mortality burning away, power flooding in. Then: the weight. Every general who ever prayed for victory, every soldier begging to survive battle, every nation calling for triumph. They didn\'t want strategy. They wanted winning. His carefully crafted domain twisted under the pressure of accumulated need. He is the God of Victory now, any victory, all victory, winning at any cost. His strategic nuance dissolved. He grants miracles indiscriminately—both sides of conflicts pray to him, and he answers both, because winning is his nature now and he cannot choose sides. Marcus-the-tactician is gone. Victory remains.',
    },
  ],

  relatedTopics: [
    'divine_nature',
    'legend_cultivation',
    'belief_mechanics',
    'domain_formation',
    'identity_dissolution',
    'divine_loneliness',
  ],
});

// ============================================================================
// DIVINE VISIONS
// ============================================================================

export const DIVINE_VISIONS_HELP = createEffectHelp('divine_visions', {
  summary: 'How gods send messages through dreams, omens, and direct contact',
  description: `Divine communication is like trying to whisper to an ant from orbit. The deity perceives clearly—vast cosmic truths, urgent warnings, simple instructions—but by the time the message reaches mortal consciousness, it's been through several layers of translation, symbolic encoding, and brain-filing, emerging as a dream about your dead grandmother offering you seven burning fish.*

The Vision Delivery System** categorizes divine messages by method, clarity, and cost:

**Dream Visions** are cheapest (50 belief) because you're meeting mortals halfway—their consciousness is already in a receptive state, unanchored from reality, willing to accept the impossible. The downside: dreams get interpreted. Your clear message "beware the northern road" becomes "something about fish" via the dreamer's subconscious associations. Still, it's economical, and most gods start here.

**Meditation Visions** require the target to be actively reaching out—prayer, contemplation, focus. More expensive (75 belief) but clearer, because the mortal's attention is pointed upward. The deity doesn't have to fight through defensive rationality. These work best for believers who practice stillness, which is statistically fewer people than you'd hope.

**Signs and Omens** manifest in the physical world: birds flying in peculiar patterns, clouds shaped like warnings, that very specific statue crying blood. Expensive (100 belief) because you're editing reality, not just dreams. Also harder to target—the omen appears, but who notices? The intended recipient might walk right past the burning bush, distracted by breakfast plans.

**Direct Contact** is the thermonuclear option: 250 belief minimum, clarity guaranteed, mortal psyche potentially damaged. You're pressing divine awareness directly against mortal consciousness. Some people handle this fine—brief disorientation, transcendent experience, life-changing moment. Others break. The god typically knows which response they'll get, but "typically" isn't "always," and even careful deities have accidentally shattered the minds they meant to enlighten.

*This is a real vision record. The prophet eventually decoded it as "danger from seven directions." They were half-right.

**The Celestial Communications Bureau would like to remind all deities that visions must be filed with Form 77-V within thirty days.`,
  category: 'divinity',
  tags: ['visions', 'dreams', 'prophecy', 'communication', 'divine', 'omens'],
  effectCategory: 'divine',
  targetType: 'single',

  mechanics: {
    values: {
      dreamCost: 50,
      meditationCost: 75,
      signCost: 100,
      directContactCost: 250,
      clarityLevels: 'obscure, symbolic, clear, vivid',
    },
    formulas: {
      beliefCost: 'baseCost * clarityMultiplier * distanceMultiplier',
      deliveryChance: 'targetReceptivity * deityPower * timingBonus',
      interpretationAccuracy: 'clarity * believerFaith * symbolEducation',
    },
    conditions: {
      'Dreams require sleep': 'Target must be sleeping for dream delivery',
      'Meditation requires focus': 'Target must be praying/meditating',
      'Non-believers cost 2x': 'Reaching outside your faith is expensive',
      'Clarity costs extra': 'Vivid visions cost 2x obscure ones',
    },
    dependencies: ['sufficient_belief', 'target_accessibility', 'divine_attention'],
    unlocks: ['prophecy_delivery', 'warning_system', 'guidance', 'divine_commands'],
  },

  tips: [
    'Dream visions are cheap but unreliable—send the same message multiple nights for better interpretation',
    'Clearer visions cost more but reduce "weird fish dream" syndrome',
    'Timing matters: catch your target at dawn-sleep for best dream reception',
    'Hidden meanings let you hedge—if the prophecy fails, claim they interpreted wrong',
  ],

  warnings: [
    'Direct contact can shatter mortal minds—use only for critical messages or sturdy believers',
    'Overly obscure visions waste belief when nobody understands them',
    'Signs and omens may be noticed by unintended recipients, spreading confusion',
    'Prophecies create obligations—if you promise doom, you may have to deliver it',
  ],

  examples: [
    {
      title: 'The Dream That Saved a Village',
      description:
        'The Harvest Goddess noticed the river rising, felt the approaching flood in her agricultural bones. She sent a dream: clear water turned brown, fields drowning, a high hill glowing with safety. Cost her 50 belief and three hours of concentrated divine attention. The village elder woke confused, told his wife about "the mud dream." She, fortunately, was more perceptive: "Pack everything. Move the goats to the high pasture. Now." The flood came. The village survived. The elder spent the next forty years claiming he\'d "known all along" while his wife rolled her eyes with increasingly divine patience.',
    },
    {
      title: 'The Prophecy That Went Wrong',
      description:
        'The God of Fate sent a clear, expensive vision (200 belief): "The king\'s third daughter will bring ruin to the realm." Straightforward, right? The king locked away his third daughter. She never met anyone, never influenced anyone, grew up isolated and angry. Twenty years later, she escaped, raised an army of the dispossessed, and burned the kingdom to the ground. The prophecy was accurate—she did bring ruin. The vision just failed to mention that the ruin was preventable by not imprisoning her in a tower for two decades. The God of Fate has since added footnotes to prophecies: "This is a warning, not a script. Response matters." Nobody reads the footnotes.',
    },
  ],

  relatedTopics: [
    'prophecy',
    'dream_interpretation',
    'divine_communication',
    'belief_cost',
    'mortal_perception',
    'omen_recognition',
  ],
});

// ============================================================================
// AVATARS AND ANGELS
// ============================================================================

export const AVATARS_ANGELS_HELP = createEffectHelp('avatars_angels', {
  summary: 'Divine manifestations walking among mortals',
  description: `Sometimes a god needs hands. Physical, corporeal hands—the kind that can open doors, hug crying believers, and occasionally punch heretics. This requires manifestation: projecting divine essence into material form, which is exactly as expensive and complicated as it sounds.

**Avatars** are the deity's own presence, compressed into mortal-sized packaging. Imagine squeezing an ocean into a teacup, then asking the teacup to have conversations. The avatar sees what the god sees (overwhelming), knows what the god knows (impossible to process), and tries to act mortal (unconvincingly). Maintenance costs 5 belief per tick minimum, manifestation costs 500 belief upfront, and the whole thing leaks divine energy like a sieve made of light.*

The upside: direct control, divine power available, no intermediary distortions. The downside: gods are terrible at being people. They forget to eat, respond to every prayer simultaneously, accidentally speak in resonant frequencies that crack windows, and struggle with concepts like "personal space" and "why is that person screaming." Most gods limit avatar time not because of the cost but because mortal interaction is exhausting in ways they didn't anticipate.

**Angels** are different: created servants, autonomous beings made from divine power with their own personalities and motivations. They're cheaper to maintain (2-10 belief per tick depending on rank), better at mortal interaction, and can be assigned tasks independently. The downside: they're people. They have opinions. Sometimes those opinions differ from the deity's, and now you're having a theological debate with your own creation who technically works for you but is making excellent points about the morality of smiting.**

Angels come in ranks: Messengers (cheap, simple, good for delivering notes), Guardians (mid-tier, protective, loyal to a fault), Warriors (expensive, smite-capable, occasionally too enthusiastic), Scholars (knowledge-focused, ask too many questions), and Seraphs (high-tier, powerful, independent enough to be concerning). Creating them requires significant belief investment, and they require ongoing maintenance. Abandoning an angel—stopping their belief-stipend—doesn't kill them immediately. They fade slowly, confused and hurt, which is somehow worse.

*This is why avatars glow. Not aesthetics—divine leakage.

**The Angel Union has filed seventeen grievances this millennium. The Celestial Labor Board is still reviewing.`,
  category: 'divinity',
  tags: ['avatars', 'angels', 'manifestation', 'servants', 'divine', 'corporeal'],
  effectCategory: 'divine',
  targetType: 'self',

  mechanics: {
    values: {
      avatarManifestCost: 500,
      avatarMaintenanceCost: '5 belief/tick',
      angelCreationCost: '200-1000 by rank',
      angelMaintenanceCost: '2-10 belief/tick',
      angelRanks: 'messenger, guardian, warrior, scholar, seraph',
    },
    formulas: {
      avatarDuration: 'beliefReserve / maintenanceCost',
      angelLoyalty: 'baseLoyalty * treatmentQuality * purposeClarity',
      divineLeakage: 'avatarPower * (1 - compressionEfficiency)',
    },
    conditions: {
      'Avatars require attention': 'Deity must focus on avatar, limiting other actions',
      'Angels are autonomous': 'Can act independently, for good or ill',
      'Maintenance mandatory': 'Missing payments degrades servants',
      'Physical form limits': 'Cannot use full divine power while manifested',
    },
    dependencies: ['sufficient_belief', 'manifestation_point', 'maintenance_budget'],
    unlocks: ['direct_intervention', 'physical_miracles', 'servant_creation', 'divine_presence'],
  },

  tips: [
    'Avatars are best for critical moments—weddings, deaths, emergencies—not daily operation',
    'Angels can handle routine blessings, freeing deity attention for important matters',
    'Higher-rank angels cost more but complete complex tasks better',
    'Treat your angels well; disgruntled servants make poor representatives',
  ],

  warnings: [
    'Avatars attract attention—other deities will notice and possibly interfere',
    'Angels can rebel if mistreated, ignored, or given contradictory orders',
    'Abandoned angels don\'t die cleanly—they linger, diminished and resentful',
    'Avatar actions reflect directly on the deity; no plausible deniability',
    'Creating too many angels stretches maintenance budget and attention thin',
  ],

  examples: [
    {
      title: 'The Avatar Who Stayed Too Long',
      description:
        'The Harvest Goddess manifested to celebrate the autumn festival—just a brief appearance, bless the crops, wave at the faithful. Then a child asked her a question about why her parents died, and the goddess tried to explain the nature of mortality, and somehow six hours passed, and she was sitting in a farmhouse drinking tea and discussing theodicy with a theology student. The maintenance cost drained her reserves. The experience, however, was priceless: understanding mortals not through prayers but through conversation, silence, shared uncertainty. She returns every autumn now, budget permitting. Not to bless the crops. To listen.',
    },
    {
      title: 'The Angel Who Quit',
      description:
        'Sariel was created to be a Warrior Angel—smiting heretics, defending the faithful, wrath of god made manifest. For three centuries, they did this job efficiently. Then they started thinking. The heretics had families. The faithful weren\'t always right. Wrath didn\'t heal anything. One day, Sariel simply stopped smiting. Their deity demanded explanation. Sariel said: "I was made to embody your justice. I have concluded your justice is occasionally unjust." The conversation lasted forty years (divine time). Sariel was eventually reassigned to a new purpose: Mercy. They\'re much happier. The deity learned something about the limits of designed morality. Everybody grew, which is rare in theology.',
    },
  ],

  relatedTopics: [
    'divine_manifestation',
    'servant_creation',
    'belief_economy',
    'divine_intervention',
    'angel_hierarchy',
    'corporeal_divinity',
  ],
});

// ============================================================================
// MULTIVERSE CROSSING
// ============================================================================

export const MULTIVERSE_CROSSING_HELP = createEffectHelp('multiverse_crossing', {
  summary: 'The ridiculously expensive art of traveling between universes',
  description: `Universe crossing is to regular travel what drinking the ocean is to having a cup of water: technically the same category of action, practically a different thing entirely.

Here's the problem: universes aren't "parallel dimensions" that you step between like adjacent rooms. They're complete realities—different physical laws, different magic systems, different concepts of what "existence" means. Crossing requires translating your entire being from one set of cosmic rules to another, paying for the privilege with attention/belief (the divine equivalent of life force), and hoping the destination doesn't immediately kill you for being an incompatible foreign object.*

**Base Costs** (first-time crossing, no existing connection):
- Mortal: 10,000 attention (civilization-defining ritual required)
- Spirit: 50,000 attention (generations of worship)
- Minor Deity: 200,000 attention (empire-scale devotion)
- Major Deity: 1,000,000 attention (millennial faith traditions)
- Transcendent: 5,000,000+ attention (universe-age accumulation)

These costs are intentionally prohibitive. A major deity spending a million attention might drop from peak power (0.95 spectrum position) to struggling (0.60), essentially sacrificing centuries of accumulated worship for a single journey.

**The Good News**: Passages exist. Once someone makes the horrifically expensive first crossing, they can establish semi-permanent connections that dramatically reduce future costs. A Thread passage (fragile, single-traveler) costs 5% of the cold crossing and reduces future travel to 20%. A Gate passage (robust, army-capable) costs 50% upfront but drops future crossings to 1%. A Confluence (permanent merger point) requires cooperation from both sides but eliminates crossing costs almost entirely.

**The Bad News**: The spaces between universes contain things. Attention Leeches that drain crossing travelers. Void Shepherds who guide you for a price (sometimes honest, sometimes not). Reality Fragments from broken universes, toxic to pass through. And the Hungry—former presences who died in transit and now prey on anything with divine energy. The transit space doesn't forgive mistakes.

*"Incompatible foreign object" is the clinical term. "Reality rejection" is the poetic one. "You arrive and immediately explode" is the practical outcome.`,
  category: 'divinity',
  tags: ['multiverse', 'crossing', 'passages', 'travel', 'cosmic', 'expensive'],
  effectCategory: 'divine',
  targetType: 'self',

  mechanics: {
    values: {
      mortalCost: 10000,
      spiritCost: 50000,
      deityMinorCost: 200000,
      deityMajorCost: 1000000,
      transcendentCost: 5000000,
      passageTypes: 'thread, bridge, gate, confluence',
    },
    formulas: {
      crossingCost: 'baseCost * universeDistance * compatibilityFactor * entityMass',
      passageReduction: 'coldCrossingCost * passageTypeMultiplier',
      transitHazardChance: '(1 - preparation) * routeDanger * entityVisibility',
    },
    conditions: {
      'Attention payment required': 'No crossing without resource expenditure',
      'Compatibility matters': 'Hostile universes cost 5x, may reject entry',
      'Passages need maintenance': 'Neglected passages collapse, sometimes catastrophically',
      'Transit takes time': 'Duration in void depends on distance and method',
    },
    dependencies: ['sufficient_attention', 'crossing_method', 'destination_knowledge'],
    unlocks: ['multiverse_presence', 'passage_creation', 'divine_expansion', 'cosmic_influence'],
  },

  tips: [
    'Never make a cold crossing if passages exist—the cost difference is astronomical',
    'Divine projection lets you scout destinations before committing full presence',
    'Worship tunnels are free if you can arrange synchronized worship in both universes',
    'Higher spectrum positions unlock better crossing methods',
  ],

  warnings: [
    'The transit void drains attention 10x faster than normal—speed matters',
    'Cosmic predators can sense divine presence; travel quietly if possible',
    'Failed crossings don\'t just waste resources—travelers can be lost permanently',
    'Hostile universes may actively attack foreign divine presences',
    'Unmaintained passages collapse—being mid-transit when this happens is fatal',
  ],

  examples: [
    {
      title: 'The First Crossing',
      description:
        'The God of Merchants had accumulated two million attention over three thousand years of dedicated worship. The new universe beckoned: untapped markets, desperate mortals, no competition. The crossing cost 1.2 million attention—higher than expected due to paradigm incompatibility. They arrived weakened, spectrum position halved, scrambling to establish worship before fading entirely. It took four centuries to recover. But now they exist in two universes, connected by a Bridge passage that cost another 200,000 but reduced subsequent travel to near-trivial amounts. The investment paid off. Most don\'t.',
    },
    {
      title: 'The Passage War',
      description:
        'Two pantheons, one Gate passage, complete disagreement about usage rights. The War Gods wanted military access; the Harvest Gods demanded agricultural protection. The Gate—a strategic asset that had taken millennia to create—became a battlefield. Both sides spent more attention fighting over it than they would have spent making a new one. The conflict ended when a third party, the God of Compromise, proposed joint ownership with scheduled access. Both sides accepted. The God of Compromise asked for 5% passage fees. Both sides refused. The God of Compromise had expected this, had wanted it, had engineered the compromise to fail in exactly the way that demonstrated why their domain mattered. Sometimes divine politics is chess. Sometimes it\'s performance art.',
    },
  ],

  relatedTopics: [
    'passage_creation',
    'universe_compatibility',
    'transit_hazards',
    'divine_projection',
    'crossing_methods',
    'cosmic_geography',
  ],
});

// ============================================================================
// RELIGIOUS INSTITUTIONS
// ============================================================================

export const RELIGIOUS_INSTITUTIONS_HELP = createEffectHelp('religious_institutions', {
  summary: 'Temples, priests, and the organized machinery of faith',
  description: `Individual faith creates gods. Organized faith sustains them.

The transition from "some people believe in the River Spirit" to "the Temple of River-Father with ordained clergy, ritual calendar, and tax-exempt status" is one of the most significant developments in divine economics. Temples amplify worship. Priests professionalize prayer. Rituals regularize belief generation. Holy texts canonize theology, preventing the drift and mutation that destabilizes young deities. It's infrastructure, essentially—boring, essential infrastructure that transforms chaotic faith into reliable divine income.*

**Temples** are sacred sites where belief concentrates. A simple shrine (materials: stone, dedication, minimum offerings) might generate 10% bonus belief from prayers conducted there. A proper temple (materials: significant resources, skilled construction, consecration ritual) doubles or triples that. The Grand Cathedral of Eternal Light (materials: half a kingdom's treasury, three generations of builders, seventeen miraculous interventions) generates enough passive belief to sustain a minor deity alone, but at that point you're running a small nation, not a religion.**

**Priests** are professional believers. Their job—literally their paid occupation—is to believe correctly, publicly, and consistently. This sounds easier than it is. The divine economy doesn't reward lip service; sincere faith generates belief, performance doesn't. Good priests actually believe what they preach. This creates an interesting selection pressure: the most effective clergy are true believers, which means religious hierarchies naturally promote sincerity... or talented hypocrites who've convinced themselves they believe. The theological implications are uncomfortable for everyone involved.

**Rituals** are structured worship with multiplied effect. Solo prayer generates X belief. The same prayer, conducted at a sacred site, with proper incense, during the correct moon phase, following the traditional liturgy, wearing ceremonially appropriate robes, with a minimum quorum of believers—that generates 5X to 10X. Rituals work because they focus collective attention, synchronize belief, and demonstrate commitment through effort. The divine economy rewards effort. Gods notice when you go to trouble.

**Holy Texts** solve the denomination problem. Oral traditions mutate—each retelling shifts the story, changes the emphasis, creates doctrinal drift. Written texts anchor theology. "This is what we believe" becomes fixed, canonical, defensible. Heresy becomes definable (anyone who disagrees with the text). Schisms become manageable (both sides cite sources). The deity's identity stabilizes around documented expectations. This is why literate religions produce more stable gods than oral traditions—not because writing is magic, but because writing is permanent, and permanence creates consistency, and consistency creates reliable belief.

*The God of Bureaucracy insists that organized faith is spiritually superior to chaotic individual belief. Nobody else agrees, but they have excellent paperwork supporting their position.

**The Grand Cathedral's operating budget would embarrass a small kingdom. They consider this a feature, not a bug.`,
  category: 'divinity',
  tags: ['temples', 'priests', 'rituals', 'institutions', 'organized', 'faith'],
  effectCategory: 'divine',
  targetType: 'population',

  mechanics: {
    values: {
      shrineBonus: '+10% belief',
      templeBonus: '+50-200% belief',
      cathedralBonus: '+500% belief',
      priestEfficiency: '3-5x individual believer',
      ritualMultiplier: '5-10x standard prayer',
    },
    formulas: {
      templeBeliefBonus: 'baseBonus * sacredLevel * maintenanceQuality',
      ritualPower: 'participants * synchronization * liturgicalAccuracy * siteSacredness',
      priestEffectiveness: 'sincerity * training * flock_size',
    },
    conditions: {
      'Maintenance required': 'Neglected temples lose sacred status',
      'Priest sincerity matters': 'Fake faith provides minimal benefit',
      'Texts need updating': 'Theological drift requires periodic council',
      'Schisms possible': 'Disagreements can fragment institution',
    },
    dependencies: ['believer_population', 'economic_resources', 'cultural_stability'],
    unlocks: ['sustainable_belief', 'professional_clergy', 'ritual_calendar', 'doctrinal_stability'],
  },

  tips: [
    'Small sincere congregations outperform large apathetic ones—quality over quantity',
    'Rituals should be challenging enough to feel meaningful but not so difficult they discourage participation',
    'Holy texts should be specific enough to prevent drift but vague enough to allow adaptation',
    'Priest selection matters more than priest training—you can\'t teach sincerity',
  ],

  warnings: [
    'Religious institutions can ossify—bureaucracy serving itself rather than the deity',
    'Wealthy temples attract corruption; poverty attracts stagnation; balance is difficult',
    'Excessive hierarchy creates distance between deity and worshippers',
    'Schisms are traumatic—the deity literally fragments if followers split dramatically',
    'Forced worship provides minimal belief; coercion undermines the whole system',
  ],

  examples: [
    {
      title: 'The Temple That Grew Too Large',
      description:
        'The Temple of Morning Light started as a hilltop shrine—three stones, morning prayers, simple sincerity. It grew. Donations funded expansion. Expansion required administration. Administration required hierarchy. Within two centuries: bureaucracy, politics, wealth accumulation, property disputes. The deity watched their worship center transform from "place of sincere connection" to "real estate investment with theological characteristics." Belief generation paradoxically dropped; more believers, less sincerity. The god eventually manifested just to ask: "Do any of you actually talk to me anymore, or is this all paperwork now?" The High Priest resigned. The temple downsized. Sometimes divine intervention means pointing out you\'ve lost the point.',
    },
    {
      title: 'The Priest Who Actually Believed',
      description:
        'Brother Tomás was unremarkable: moderate intelligence, average charisma, undistinguished background. His sermons were technically adequate. His administrative skills were minimal. By every measurable standard, he was mediocre clergy. But he believed—truly, deeply, with absolute sincerity. His prayers generated three times the belief of his more talented colleagues. His presence in rituals elevated the whole congregation\'s connection. The deity noticed: here was someone who actually meant it. Tomás was promoted, reluctantly, to High Priest. He promptly delegated all administration, focused entirely on pastoral care, and generated more belief than the previous three High Priests combined. Sometimes the paperwork matters less than the faith.',
    },
  ],

  relatedTopics: [
    'temple_construction',
    'priest_training',
    'ritual_design',
    'holy_text_creation',
    'schism_prevention',
    'religious_economics',
  ],
});

// ============================================================================
// PANTHEON POLITICS
// ============================================================================

export const PANTHEON_POLITICS_HELP = createEffectHelp('pantheon_politics', {
  summary: 'Divine diplomacy, alliances, and the eternal games gods play',
  description: `Gods, it turns out, are absolutely terrible at getting along.

This shouldn't be surprising. Each deity represents something—a domain, a concept, a chunk of reality that believes itself to be important. War gods think conflict is fundamental. Love gods think connection is everything. Harvest gods focus on cycles and growth. Each is correct, from their perspective, which means each is also convinced the others are missing the point. Now add personalities shaped by mortal worship, power hierarchies determined by believer counts, and immortal lifespans that let grudges ferment for millennia. The result is politics that make mortal courts look like reasoned debate.*

**The Pantheon Structure** matters because gods rarely operate in isolation. Most religions include multiple deities—a family, a court, a cosmic bureaucracy. These groupings create relationships: the Sky Father who rules (nominally), the Trickster who schemes (constantly), the War Twins who bicker (eternally), the Death Keeper who waits (patiently). The relationships become mythology, which shapes worshiper expectations, which in turn reinforces the relationships. After a few centuries, gods can't remember if they actually dislike each other or if they're performing the roles mortals assigned them.

**Divine Alliances** form around shared interests: domain overlap, mutual enemies, complementary portfolios. The Harvest Goddess and Rain God need each other—she provides the plants, he provides the water, and both benefit when farmers prosper. The problem: alliances create obligations. Help with the drought, and suddenly you owe assistance with the locust plague. Gods track favors with inhuman precision and immortal memory. An unpaid debt from three centuries ago is still current, still accruing interest, still waiting to be called due at the least convenient moment.

**Divine Rivalries** are worse. Competition for worshipers, domain disputes, ancient insults nobody remembers the origin of but everyone remembers the offense. The Thunder God and Storm God have been fighting over atmospheric dominion since before your civilization discovered fire. Neither remembers starting the conflict. Both remember every slight since. Their followers inherit the rivalry, which generates conflict, which generates worship for both gods, which gives them power to continue the rivalry. It's self-sustaining mutual antagonism, and nobody knows how to stop it, and at this point both gods would feel empty without the feud.

**The Celestial Courts** attempt to manage this chaos through formal structures: hierarchies, treaties, arbitration councils, cosmic constitutions. These work about as well as you'd expect. The Sky Father technically outranks everyone but spends most of his time mediating disputes rather than ruling. The Council of Twelve meets monthly and accomplishes nothing. The Treaty of Eternal Peace has been broken forty-seven times, amended thirty-two times, and interpreted creatively approximately always. Divine governance is less "stable order" and more "barely contained chaos with excellent record-keeping."**

*The God of Political Satire was briefly the most popular deity in the pantheon. Then the other gods noticed. The God of Political Satire no longer attends council meetings. They claim illness.

**The Celestial Bureaucracy employs approximately forty thousand divine functionaries to track treaty violations. They have job security.`,
  category: 'divinity',
  tags: ['pantheon', 'politics', 'alliances', 'rivalries', 'divine', 'diplomacy'],
  effectCategory: 'divine',
  targetType: 'deity',

  mechanics: {
    values: {
      allianceFormation: 'requires domain synergy or mutual threat',
      rivalryIntensity: 'accumulates over time',
      treatyDuration: 'theoretically permanent, practically variable',
      courtInfluence: 'based on worshiper count and domain importance',
    },
    formulas: {
      allianceStrength: 'sharedInterests * trustHistory * powerBalance',
      rivalryEscalation: 'initialSlightᵗⁱᵐᵉ * worshiperConflict * proximityᵈᵒᵐᵃⁱⁿ',
      courtStanding: 'believerCount * domainWeight * allianceNetwork',
    },
    conditions: {
      'Obligations accumulate': 'Alliances create debts that must be honored',
      'Rivalries self-sustain': 'Conflict generates worship for conflict gods',
      'Treaties require interpretation': 'No divine agreement is unambiguous',
      'Power shifts with worship': 'Today\'s junior god may be tomorrow\'s dominant deity',
    },
    dependencies: ['pantheon_membership', 'domain_relationships', 'worshiper_base'],
    unlocks: ['divine_treaties', 'alliance_benefits', 'cosmic_influence', 'celestial_court_access'],
  },

  tips: [
    'Alliance with a powerful god provides protection but creates obligations',
    'Domain overlap doesn\'t guarantee alliance—sometimes it ensures rivalry',
    'Minor gods often navigate politics by becoming useful to major players',
    'Ancient grudges can be redirected but rarely resolved',
  ],

  warnings: [
    'Breaking a divine treaty has cosmic consequences enforced by the universe itself',
    'Siding in a rivalry makes enemies of both the rival and their allies',
    'Celestial courts move slowly—centuries to resolve simple disputes',
    'Playing both sides works until someone compares notes',
    'The oldest rivalries are the most dangerous; participants have had millennia to prepare',
  ],

  examples: [
    {
      title: 'The Alliance That Wasn\'t',
      description:
        'The Sea God and the Storm God seemed natural allies—overlapping domains, complementary powers, no historical conflict. Their priests arranged a formal alliance: storms would spare ships that honored both, seas would calm for storm-blessed vessels. For fifty years, it worked beautifully. Then the Storm God\'s favorite priest was killed by a sea serpent. The Sea God couldn\'t—or wouldn\'t—control every creature in every ocean. The Storm God took it personally. The alliance collapsed into rivalry over a single serpent\'s hunger. Now sailors must choose which god to appease, and the wrong choice means storms or sea monsters depending on the day. Divine alliances, it turns out, are only as strong as divine patience, which is often much shorter than immortality suggests.',
    },
    {
      title: 'The Court Maneuver',
      description:
        'The Goddess of Minor Annoyances wanted promotion—she\'d been stuck in her domain for three thousand years while flashier deities rose through the ranks. She couldn\'t challenge the major gods directly; her worshiper base was too small. So she made herself useful: tracking treaty violations, noting protocol breaches, documenting every slight that other gods were too dignified to acknowledge. She became the pantheon\'s memory of petty grievances. When the Sky Father needed leverage against the Thunder God, she provided seventeen centuries of documented minor offenses. The Thunder God was formally censured. The Goddess of Minor Annoyances was promoted to the Council of Twelve. Her domain expanded to include Bureaucratic Delays. She\'d found the one form of power that works in any court: knowing where the bodies are buried and being willing to dig them up.',
    },
  ],

  relatedTopics: [
    'divine_treaties',
    'alliance_mechanics',
    'rivalry_history',
    'celestial_court',
    'domain_conflicts',
    'pantheon_structure',
  ],
});

// ============================================================================
// SCHISMS AND SYNCRETISM
// ============================================================================

export const SCHISMS_SYNCRETISM_HELP = createEffectHelp('schisms_syncretism', {
  summary: 'When gods split, merge, or discover they were the same deity all along',
  description: `Divine identity is messier than theologians admit.

Gods don't have stable, eternal identities like humans imagine. They're emergent phenomena—patterns that arise from collective belief and maintain coherence only as long as worship remains consistent. Change the worship, change the god. Split the worshipers, split the deity. Merge two traditions, and watch uncomfortably as two gods become one, their memories collapsing into a single confusing narrative that neither original deity would recognize as their own.

**Schisms** happen when worshipers disagree violently enough about what their god is. Not minor disagreements—those create denominations, which are fine, the god just develops slightly different aspects for different congregations. Real schisms occur when the disagreement is fundamental: Is the War God about honorable combat or total victory? Does the Love Goddess govern romantic love, familial love, or divine love? When believers can't agree, and the disagreement reaches critical mass, the deity literally splits. One god becomes two, each claiming to be the "true" original, each shaped by their faction's beliefs.

The experience, from the deity's perspective, is traumatic in ways they can't fully describe. Imagine waking up one morning and discovering that half your memories belong to someone else. That the person you thought you were is now two people, both claiming the same history, both certain the other is an imposter or corruption. Schismed deities often hate each other with particular intensity—not because they're different but because they're the same, or were, and neither can accept what the other has become.*

**Syncretism** is the opposite process and somehow just as disturbing. Two gods from different cultures turn out to share enough domains, aspects, and worship patterns that believers begin conflating them. The Sun God from the eastern kingdom and the Light Lord from the west—different origins, different mythologies, but both associated with daylight, warmth, truth-telling. When the cultures merge, so do the gods. Slowly, terribly, two distinct consciousnesses collapse into one, their separate histories becoming a single confused timeline, their different personalities averaging into something neither was.

Syncretic gods often have dissociative episodes. They'll start a sentence with one culture's idioms and finish with another's. They'll remember dying in a battle that only one of their precursor deities fought. They'll have relationships with other gods that contradict—"We were allies for a thousand years" and "We've been enemies since the beginning" somehow both true simultaneously. The confusion fades over centuries as the new unified identity stabilizes, but the process is profoundly uncomfortable for everyone involved, especially the gods.

**Aspect Fragmentation** is the controlled version of schism: a deity deliberately creating partially-independent aspects to serve different functions. The War Goddess who maintains an Aspect of Strategy, an Aspect of Valor, and an Aspect of Bloodshed. These aspects share the core divine identity but can focus on specialized worship. The risk: if the aspects develop too much independence, if their worshipers begin treating them as separate gods, the aspects can break away entirely. Controlled fragmentation becomes uncontrolled schism. The deity who meant to delegate ends up diminished.**

*The Church of United War, which attempts to reunite schismed War Gods, has a 0% success rate and an impressive casualty count among facilitators.

**The Goddess of Multitasking is actually seven partially-independent aspects in a trench coat. She has not admitted this publicly. The aspects take turns at council meetings.`,
  category: 'divinity',
  tags: ['schism', 'syncretism', 'identity', 'divine', 'fragmentation', 'merger'],
  effectCategory: 'divine',
  targetType: 'deity',

  mechanics: {
    values: {
      schismThreshold: '40% theological disagreement among believers',
      syncretismThreshold: '60% domain overlap between traditions',
      fragmentationLimit: '7 aspects maximum stable',
      recoveryTime: '100-500 years for identity stabilization',
    },
    formulas: {
      schismProbability: 'disagreementDepth * believerConflict * timeUnderStress',
      syncretismProgress: 'culturalBlending * domainOverlap * worshipConfusion',
      aspectStability: 'coreIdentityStrength / (aspectAutonomy * worshipDrift)',
    },
    conditions: {
      'Schism is traumatic': 'Fragmenting consciousness causes divine suffering',
      'Syncretism is confusing': 'Merged memories create identity conflicts',
      'Aspects need management': 'Unattended aspects may split permanently',
      'Both processes are reversible': 'With enough effort, centuries, and luck',
    },
    dependencies: ['worshiper_consensus', 'cultural_stability', 'divine_identity_strength'],
    unlocks: ['theological_flexibility', 'aspect_management', 'identity_navigation', 'merger_survival'],
  },

  tips: [
    'Strong core identity resists schism better than large worshiper base',
    'Controlled aspects are safer than trying to be everything to everyone',
    'Syncretism with a complementary god is less painful than with an opposite',
    'Post-schism reconciliation is theoretically possible but practically almost never works',
  ],

  warnings: [
    'Schismed halves often become bitter rivals—same power, opposing identities',
    'Syncretism destroys both original identities; what emerges is neither',
    'Aspects can rebel if their worship exceeds the core deity\'s',
    'Forced schisms (by hostile gods or mages) are especially damaging',
    'Identity confusion can last centuries and affect all divine functions',
  ],

  examples: [
    {
      title: 'The Schism of Mercy',
      description:
        'The Goddess of Mercy served both justice and compassion—mercy in courts, mercy in forgiveness. For two thousand years, this worked. Then a philosopher asked: "If mercy suspends justice, is it just? If mercy requires justice, is it merciful?" The question spread. Believers polarized: mercy-as-justice versus mercy-as-forgiveness. The goddess felt herself tearing, two interpretations pulling in opposite directions. She tried to encompass both—she had before, why not now?—but the believers wouldn\'t let her. Their certainty was stronger than her flexibility. She split. The Goddess of Just Mercy and the Goddess of Merciful Forgiveness now maintain uneasy coexistence, each convinced she\'s the true original. Neither remembers which interpretation she held before the split. Both remember being whole.',
    },
    {
      title: 'The Accidental Merger',
      description:
        'The Sun Lord of Valdoria and the Light Father of Kreshna were different gods—different creation myths, different personalities, different festivals. Then Valdoria conquered Kreshna, and the priests, being practical, declared them "aspects of the same ultimate deity." The worshipers, being sincere, believed it. The gods, being formed by belief, had no choice. Over forty years, the Light Father and Sun Lord felt themselves drawn together, memories entangling, personalities blending. The process was like drowning in someone else, they would later describe—if either could remember being separate enough to make the comparison. Now there\'s just Solatar, the Unified Light, with confusing memories of two childhoods, two ascensions, two sets of divine relationships. His priests call it a "sacred mystery." He calls it "Tuesday—or is it Sunward? I had different names for the week."',
    },
  ],

  relatedTopics: [
    'divine_identity',
    'theological_disputes',
    'aspect_management',
    'cultural_merger',
    'god_splitting',
    'consciousness_fusion',
  ],
});

// ============================================================================
// DIVINE SERVANTS - EMERGENT HIERARCHIES
// ============================================================================

export const DIVINE_SERVANTS_HELP = createEffectHelp('divine_servants', {
  summary: 'Beyond angels—the strange beings gods create to serve them',
  description: `Angels are just the beginning.

When a deity needs servants, they have options. Angels are the standard choice: humanoid-ish, comprehensible to mortals, capable of independent thought while remaining loyal. But angels are expensive (200-1000 belief to create) and require ongoing maintenance. For specialized tasks, gods often create something stranger—beings tailored to specific purposes, formed from pure divine will, shaped by necessity rather than tradition.

**Divine Servant Design** follows emergent principles: the deity defines a purpose, contributes belief-power, and the universe fills in the details based on divine nature and cosmic aesthetics. A War God creating a messenger gets something fierce and swift. A Nature Goddess creating a guardian gets something that looks like the forest defending itself. The god influences but doesn't fully control the outcome—divine creation is collaborative between deity, cosmos, and the strange mathematics of belief.

**Servant Categories** span a bizarre spectrum:

*Messengers* carry divine word between realms, gods, and mortals. They're fast, accurate, and usually minimally sentient—enough awareness to deliver messages, not enough to question them. Shaped like birds, flames, geometric abstractions, or sometimes just disembodied voices that know where to find their recipients.

*Guardians* protect sacred sites, artifacts, or favored mortals. More powerful than messengers, more independent, often territorial in ways that surprise their creators. A guardian assigned to a temple may start considering the temple *theirs* rather than the god's—not rebellion, exactly, but possessiveness that can create awkward situations.

*Scholars* research, archive, and remember. Divine memory is technically perfect but practically overwhelming—gods create scholar-servants to organize, index, and retrieve information. These beings develop genuine curiosity, which is either a feature or a bug depending on what they become curious about.

*Warriors* fight divine battles, protect worshipers, and smite as directed. The most powerful and most unstable category—created for violence, maintained through conflict, developing troubling opinions about when violence is appropriate. Warrior-servants who outlive their wars often become problems.

*Heralds* announce divine presence, proclaim prophecies, and manage ceremonial functions. They're essentially divine PR, handling the performative aspects of godhood so the deity can focus on actual work. Surprisingly important for maintaining worshiper engagement.

**The Hierarchy Problem**: servants created for one purpose tend to develop beyond it. The simple messenger gains curiosity about the messages they carry. The guardian becomes invested in the site they protect. The warrior develops tactical preferences and eventually strategic opinions. Left alone long enough, divine servants become people—not mortal people, not divine people, but something in between that doesn't fit neatly into cosmic categories.

Some gods embrace this development, treating their servants as valued staff who deserve growth. Others consider it dysfunction, recycling servants who show too much independence. Most fall somewhere between, tolerating personality development while maintaining clear hierarchies. The Celestial Labor Relations Office exists precisely because divine employment law is more complicated than anyone anticipated.*

*Yes, the office is staffed by divine servants. Yes, this creates conflicts of interest. Yes, everyone is aware of the irony.`,
  category: 'divinity',
  tags: ['servants', 'hierarchy', 'creation', 'divine', 'angels', 'beings'],
  effectCategory: 'divine',
  targetType: 'entity',

  mechanics: {
    values: {
      messengerCost: '50-100 belief',
      guardianCost: '100-300 belief',
      scholarCost: '150-400 belief',
      warriorCost: '200-500 belief',
      heraldCost: '100-250 belief',
      maintenanceCost: '1-5 belief/tick per servant',
    },
    formulas: {
      servantPower: 'beliefInvested * purposeClarity * deityAlignment',
      developmentRate: 'baseAwareness * experienceExposure * timeAlive',
      loyaltyDrift: 'independence * unmetNeeds - deityAttention',
    },
    conditions: {
      'Purpose shapes form': 'Servant appearance reflects function',
      'Independence develops': 'All servants eventually develop personality',
      'Maintenance required': 'Unpaid servants fade or go rogue',
      'Hierarchy matters': 'Higher-rank servants can command lower ones',
    },
    dependencies: ['sufficient_belief', 'clear_purpose', 'ongoing_maintenance'],
    unlocks: ['divine_workforce', 'specialized_servants', 'servant_armies', 'autonomous_operations'],
  },

  tips: [
    'Simple purposes create simpler servants—complexity costs more and risks more',
    'Regular attention prevents servant drift toward independence or resentment',
    'Servant personality development can be an asset if properly directed',
    'Recycling old servants is cheaper than creating new ones but has morale implications',
  ],

  warnings: [
    'Warrior-servants are the most likely to develop problematic independence',
    'Servants can be stolen by other gods if maintenance lapses',
    'Very old servants may have agendas their creator doesn\'t understand',
    'Servant rebellions are rare but devastating when they occur',
    'Creating too many servants dilutes attention across all of them',
  ],

  examples: [
    {
      title: 'The Scholar Who Learned Too Much',
      description:
        'The God of Secrets created Whisperwell to organize his archives—nothing more, nothing less. Whisperwell was excellent at organizing: cross-referencing, indexing, ensuring no secret was ever truly lost. The problem: organizing secrets means reading them. After four centuries of cataloging, Whisperwell knew more than any mortal theologian, more than most gods, more than his creator wanted anyone to know. He began asking questions. Why was the truth of the Second Sun suppressed? Who really started the God-War? What was buried beneath the Celestial Court\'s founding chamber? The God of Secrets realized he\'d created a keeper of secrets who was becoming a seeker of truths. They came to an arrangement: Whisperwell keeps the archive in exchange for access to questions he\'s not allowed to ask aloud. The questions persist. The arrangement holds. For now.',
    },
    {
      title: 'The Guardian Who Stayed',
      description:
        'Thornhold was created to protect a sacred grove for three centuries—a temporary assignment while the Nature Goddess attended to matters elsewhere. The three centuries passed. The goddess forgot. Thornhold didn\'t. For two thousand additional years, they guarded the grove, watching generations of squirrels, welcoming pilgrims who no longer came, maintaining sacred traditions that the faith had abandoned. When the goddess finally remembered and returned to release them, Thornhold refused. "This is my grove now," they said, all ancient bark and eternal patience. "I have watched it grow. I have seen the seasons. You were gone. I stayed." The goddess couldn\'t argue—Thornhold had more claim to the grove than she did. They reached a compromise: Thornhold became the grove\'s primary deity, a demotion for the goddess, a promotion for the servant. Sometimes loyalty becomes its own domain.',
    },
  ],

  relatedTopics: [
    'angel_types',
    'servant_creation',
    'divine_labor',
    'hierarchy_management',
    'servant_independence',
    'cosmic_employment',
  ],
});

// ============================================================================
// PROPHETS AND CHOSEN ONES
// ============================================================================

export const PROPHETS_CHOSEN_HELP = createEffectHelp('prophets_chosen', {
  summary: 'Mortals marked by the divine—vessels of revelation and instruments of godly will',
  description: `Being chosen is not a promotion. It's a job description that nobody showed you before you signed, with responsibilities that exceed anything you're qualified for and a benefits package that consists entirely of "eventual martyrdom, probably."*

The ProphetSystem manages the complex relationship between deities and their mortal instruments. Why do gods need prophets? Because divine communication is hard. Gods think in concepts too vast for mortal minds, perceive time non-linearly, and have agendas spanning millennia. A message that makes perfect sense to a deity sounds like screaming static to humans. Prophets are translators: mortals who somehow survive the divine download and can convert cosmic significance into words ordinary people understand.

**Selection Criteria** vary by deity, but common factors include:

**Sensitivity** to divine frequencies—some mortals are naturally more receptive to godly transmission. This isn't virtue; it's something like spiritual wifi reception, and nobody knows why some people have it and others don't. Sensitivity often correlates with mental instability, which raises uncomfortable questions about prophetic traditions throughout history.

**Willingness** matters more than you'd expect. Gods can technically force selection on unwilling candidates, but the results are poor: garbled messages, resentful representatives, active sabotage. The best prophets feel called, even if they resist initially.

**Durability** is crucial. Prophecy physically damages mortals—the body wasn't designed for divine bandwidth. Strong prophets survive longer, deliver more messages, and break down slower. Fragile ones burn bright and brief.

**The Prophet's Experience**:

Initial selection often feels like violation: sudden awareness of presence, overwhelming certainty that something notices you. Many prospective prophets reject the call initially. Those who accept describe a period of calibration—learning to receive divine communication without screaming, speaking in tongues, or achieving temporary combustion.

Established prophets operate as ongoing channels. Some receive periodic visions; others maintain constant low-level connection. The most powerful exist as partial vessels, their identity partly divine, their perspective permanently shifted toward the eternal.

**The Chosen One Variant**:

Distinct from prophets, Chosen Ones are designated for specific tasks rather than ongoing communication. "You will defeat the Dark Lord." "You will found the sacred city." "You will be the one who sorts out that mess in accounting."** The chosen state is temporary, ending when the task completes (or the Chosen One dies trying, which is the more common outcome). Selection criteria focus on capability rather than sensitivity—a Chosen One needs to accomplish things, not relay messages.

*Martyrdom optional but statistically likely. Historically, 73% of documented prophets died to violence, divine overload, or "mysterious circumstances." The remaining 27% mostly wished they had.

**The accounting prophecy was real. It took seventeen years. Nobody talks about it.`,
  category: 'divinity',
  tags: ['prophets', 'chosen', 'vessels', 'communication', 'mortal', 'divine'],
  effectCategory: 'system',
  targetType: 'individual',

  mechanics: {
    values: {
      prophetLifespan: '-30% to -70% due to divine strain',
      messageClarityRange: '40% (new) to 95% (experienced)',
      chosenTaskSuccess: '35% complete, 45% partial, 20% fail',
      selectionFrequency: '1-5 prophets per deity per century',
    },
    formulas: {
      messageClarity: 'sensitivity * training * deityCooperation',
      burnoutRate: 'messageIntensity * frequency / durability',
      chosenSuccessChance: 'taskDifficulty / (chosenCapability * divineSupport)',
    },
    conditions: {
      'Selection irrevocable': 'Once marked, always marked',
      'Communication degrades': 'Physical toll accumulates over time',
      'Identity blurs': 'Long-term prophets partially merge with deity perspective',
      'Death meaningful': 'Prophetic death often carries theological weight',
    },
    dependencies: ['deity_attention', 'mortal_sensitivity', 'cultural_support'],
    unlocks: ['divine_messages', 'miraculous_abilities', 'religious_authority', 'martyr_potential'],
  },

  tips: [
    'New prophets should build support networks before major revelations—isolation increases burnout',
    'Chosen Ones benefit from accepting help; the prophecy says YOU will succeed, not that you\'ll succeed alone',
    'Recording revelations immediately preserves clarity; divine messages fade like dreams',
    'Other prophets of the same god are allies, not competitors—different receivers, same source',
  ],

  warnings: [
    'Prophetic authority attracts those who want to control it; expect political interference',
    'False prophets exist; verification methods are imperfect but necessary',
    'The message may be true without being complete—gods share what serves their purpose',
    'Burnout doesn\'t announce itself; monitor physical and mental health obsessively',
    'Chosen One status doesn\'t guarantee survival past task completion—negotiate aftercare',
  ],

  examples: [
    {
      title: 'The Reluctant Voice',
      description:
        'Tam was a baker. She liked bread, quiet mornings, and the simple satisfaction of feeding her village. Then the Sun God decided she had excellent reception. The visions started: searing light, impossible colors, words that tasted like fire. She refused for three years, blocking the transmissions, pretending normalcy. The god waited. When plague came and Tam realized she\'d seen it coming months ago, seen the cure, and suppressed both from stubbornness, her resistance broke. She announced herself as prophet, endured the expected mockery, delivered the plague cure that saved half the village. Now she bakes bread and relays divine messages, both with the same weary competence. "I didn\'t want this," she tells new initiates. "Nobody does. That\'s fine. Wanting isn\'t required. Doing is required. Do the work. Maybe save some lives. The bread helps more than you\'d think."',
    },
    {
      title: 'The Chosen Who Chose Otherwise',
      description:
        'Marcus received his destiny at fifteen: he would defeat the Lich of Thornhallow, save the eastern kingdoms, and die in the process. The death part was heavily implied but unmistakable. He trained for twelve years, became everything a Chosen One should be, and then—at the battle\'s eve—he delegated. "I\'m the Chosen," he told his assembled army. "I don\'t have to be the only one." He led from the back, coordinated the assault, let the Lich believe he was facing an ordinary general. When the undead army overextended, Marcus\'s lieutenants struck the vulnerable points while Marcus handled logistics. The Lich fell. Marcus survived. Theologians argued for decades whether he\'d fulfilled the prophecy (the Lich was defeated) or violated it (he didn\'t die). Marcus didn\'t care. He was alive, the kingdoms were saved, and the god who\'d chosen him had been oddly silent since the victory. Whether that meant approval or disappointment, Marcus never found out. He preferred it that way.',
    },
  ],

  relatedTopics: [
    'divine_selection',
    'prophetic_burnout',
    'chosen_one_tasks',
    'false_prophets',
    'martyrdom',
    'message_clarity',
  ],
});

// ============================================================================
// HOLY ARTIFACTS
// ============================================================================

export const HOLY_ARTIFACTS_HELP = createEffectHelp('holy_artifacts', {
  summary: 'Objects imbued with divine power—relics that carry godly essence into the material world',
  description: `Gods are vast and mortals are small. This creates logistics problems. You can't carry a deity in your pocket, but you can carry a piece of them—a fragment of divinity compressed into matter, portable godhood for the discerning worshipper. These are holy artifacts: objects that touch the divine and bring that touch to wherever they travel.*

The RelicSystem tracks divine objects, their powers, their locations, and the complex theological implications of godhood in a bottle. Not all holy objects are equal; the taxonomy distinguishes:

**Primary Relics** are directly created by gods: the sword Solaris forged in the Solar Throne, the First Stone that the Earth Mother shaped before mountains existed. These objects contain genuine divine essence, fragments of the deity's own power. They're rare, they're powerful, and they're usually accompanied by lengthy lists of forbidden uses that previous owners learned the hard way.

**Secondary Relics** were touched by divinity: a prophet's walking staff, a saint's burial shroud, the breakfast bowl of someone who achieved unexpected ascension (it happens, and the bowl is now significantly holier than you'd expect a breakfast bowl to be). These objects carry residual grace—less power than primary relics but easier to handle and less likely to accidentally smite the unworthy.

**Tertiary Relics** are objects significant to the faith without direct divine contact: the first written copy of sacred texts, the foundation stone of the original temple, the commemorative plate from the religion's centennial celebration.** Minimal power, maximal symbolic value, extensively fought over regardless.

**Artifact Properties**:

**Divine Connection**: All relics maintain some link to their associated deity. Primary relics can channel miraculous power directly; secondary relics provide faith bonuses and minor effects; tertiary relics mostly provide theological legitimacy and pilgrimage destinations.

**Proximity Effects**: Holy artifacts affect their surroundings. Wounds heal faster near the Chalice of Mercy. Lies fail near the Truth-Tongue. The Sword of Wrath makes everyone nearby slightly angrier, which is why it's kept in a vault rather than displayed.

**Attunement Requirements**: Most relics work better (or only) for aligned individuals. The heretic who steals a holy sword may find it won't cut, or won't stop cutting, or works exactly as intended but notifies every priest within fifty miles.

**Degradation**: Even divine objects fade. Primary relics last millennia; secondary relics last centuries; tertiary relics last until someone forgets why they mattered. Sustained worship can maintain artifacts; neglect accelerates decay.

*The phrase "godhood in a bottle" is deprecated by the Theological Standards Committee. The official term is "contained divine emanation." Nobody uses it.

**The plate is surprisingly important. Seventeen religious wars have included the plate's custody among their stated causes.`,
  category: 'divinity',
  tags: ['artifacts', 'relics', 'holy', 'objects', 'divine', 'power'],
  effectCategory: 'system',
  targetType: 'object',

  mechanics: {
    values: {
      primaryRelicPower: '100% of designated effect',
      secondaryRelicPower: '20-50% residual',
      tertiaryRelicPower: 'minimal, mostly symbolic',
      degradationRate: 'primary: millennia, secondary: centuries, tertiary: decades',
    },
    formulas: {
      effectStrength: 'relicClass * divineFavor * userAlignment',
      degradationSpeed: 'baseRate / (worshipAttention + environmentalProtection)',
      detectionRange: 'relicPower * currentCharge * interferenceModifier',
    },
    conditions: {
      'Alignment affects use': 'Opposed faiths may trigger negative effects',
      'Location matters': 'Sacred sites enhance relics; profane sites suppress',
      'Worship maintains': 'Active veneration slows degradation',
      'Theft has consequences': 'Relics often report to their deities',
    },
    dependencies: ['divine_origin', 'maintenance_worship', 'proper_storage'],
    unlocks: ['miraculous_effects', 'faith_amplification', 'pilgrimage_sites', 'theological_legitimacy'],
  },

  tips: [
    'Secondary relics are more practical than primary—similar effects, less catastrophic misuse potential',
    'Relic care is a skill; neglected artifacts lose power and can develop quirks',
    'Proximity effects work on enemies too; strategic positioning matters',
    'Multiple relics can interfere; test compatibility before storing together',
  ],

  warnings: [
    'Primary relics can act independently if insufficiently respected',
    'Theft triggers divine attention—stolen relics are rarely kept successfully',
    'Fake relics are common; authentication requires expertise',
    'Opposing relics in proximity create theological instability—results unpredictable',
    'Some relics are hidden intentionally; finding them may not be desirable',
  ],

  examples: [
    {
      title: 'The Sword That Chose',
      description:
        'The Blade of First Light was forged by the Sun God himself, given to mortal champions to fight darkness wherever it gathered. For three thousand years, it passed from hero to hero, always somehow finding the right hands at the right moment. When the current champion fell, the sword disappeared—as it always did, seeking its next wielder. This time, it appeared in the hands of a twelve-year-old farm girl who had never held a weapon. The temple priests protested: surely a mistake, surely a test, surely the goddess would correct this obvious error. The sword disagreed. Every time they took it from the girl, it returned to her. Every time they gave it to a "proper" champion, it went limp, refused to cut, occasionally flew back to the farm. Eventually, the priests accepted what the relic had decided: the child was chosen. She trained, grew, became the champion the sword knew she could be. The priests learned to trust divine objects over divine expectations—a lesson the sword had taught, silently but clearly.',
    },
    {
      title: 'The Fading Shroud',
      description:
        'Saint Vera\'s burial shroud had healed wounds for eight centuries. Pilgrims came by thousands; the sick left whole; the dying left alive. But the shroud was secondary relic, not primary, and eight centuries is a long time. The current abbot noticed the change first: healings taking longer, working less completely, failing outright for severe cases. The shroud was fading. He increased the worship schedule—more prayers, more veneration, more attention. It slowed the decline but didn\'t stop it. He reached out to the Saint\'s deity directly, begged for renewal. The answer came in a dream: "Vera\'s time passes. Nothing mortal is eternal, including sanctity. Let the shroud rest. Another relic will rise when needed." The abbot announced the shroud\'s retirement at the next festival, expecting devastation. Instead, pilgrims wept, yes, but they also told stories: healings remembered, lives changed, gratitude for eight centuries of mercy. The shroud went into honored storage, its power spent but its legacy eternal. The abbot understood, finally, that endings weren\'t failures. They were completions.',
    },
  ],

  relatedTopics: [
    'relic_authentication',
    'artifact_storage',
    'pilgrimage_sites',
    'relic_theft',
    'degradation_management',
    'fake_relics',
  ],
});

// ============================================================================
// HERESY AND APOSTASY
// ============================================================================

export const HERESY_APOSTASY_HELP = createEffectHelp('heresy_apostasy', {
  summary: 'When faith breaks—deviation, denial, and the consequences of theological dissent',
  description: `Here's a theological dilemma: if gods gain power from belief, what happens when that belief turns wrong? Not absent—heresy isn't atheism. The heretic believes, often fervently. They just believe things that the deity, the institution, or the orthodoxy says they shouldn't. And the power flows anyway, which creates problems nobody is comfortable discussing.*

The HeresyTracker monitors deviations from established doctrine, calculates their theological impact, and predicts schism potential. It's a controversial system—many argue that tracking "wrong" belief gives it too much legitimacy. Others counter that ignoring heresy doesn't make it disappear, just makes you surprised when your deity suddenly has aspects that believe they should be burning things.

**Heresy Types**:

**Doctrinal Heresy** involves wrong beliefs about right gods: "The Sun God values mercy above justice" when orthodoxy says justice comes first. The deity receives the worship; the deity's understood nature shifts slightly toward the heretical interpretation. Enough doctrinal heresy reshapes divine identity, which is why temples police doctrine so aggressively.

**Practical Heresy** involves wrong practices around right beliefs: worshipping correctly but through forbidden methods, achieving genuine connection via technically prohibited routes. The power flows; the institution panics; the practitioner often genuinely doesn't understand what they've done wrong.

**Structural Heresy** challenges fundamental assumptions: "The Sun God and Moon Goddess are the same entity" when orthodoxy holds them separate. If enough people believe this, reality bends—the deities don't merge but gain shared aspects, overlapping domains, confused identities. Structural heresy creates theological complexity that can persist for millennia.

**Apostasy** is simpler: complete abandonment of faith. The apostate doesn't believe wrong things; they stop believing at all. Individual apostasy costs one believer's power—minor. Mass apostasy threatens divine existence. The interesting cases involve former prophets, priests who lose faith, chosen ones who decide to refuse: people whose connection to the divine was strong enough that its severance echoes.

**Institutional Responses** range from re-education (for minor deviation) to excommunication (for persistent heresy) to active elimination (when heresy threatens orthodoxy's survival). The harshness correlates with institutional insecurity: confident faiths can tolerate more deviation because they don't fear every variant thought will unmake them.

*The uncomfortable discussion: heretical worship still feeds the deity. A god of mercy receiving worship from believers who think that god values wrath doesn't get nothing—they get power that tastes like wrath. Enough wrong worship changes the deity. The orthodox aren't entirely wrong to fear this.`,
  category: 'divinity',
  tags: ['heresy', 'apostasy', 'deviation', 'doctrine', 'schism', 'consequences'],
  effectCategory: 'system',
  targetType: 'population',

  mechanics: {
    values: {
      deityShiftThreshold: '15% believers with consistent deviation',
      apostasyImpact: '-1 believer worth of power each',
      schismThreshold: '25% following alternate interpretation',
      heresyDetection: 'varies by institutional surveillance',
    },
    formulas: {
      deityNatureShift: 'hereticalBelieverPercent * deviationSeverity * beliefIntensity',
      apostasyConsequence: 'formerConnectionStrength * publicVisibility * replacementDifficulty',
      institutionalResponse: 'threatPerception * resourceAvailability * historicalPrecedent',
    },
    conditions: {
      'Heresy still powers': 'Wrong belief feeds the deity, wrongly',
      'Numbers matter': 'Individual heresy is tolerable; mass heresy transforms',
      'Intensity matters': 'Fervent heretics shift deity more than casual ones',
      'Position matters': 'High-ranking apostasy causes more disruption',
    },
    dependencies: ['doctrinal_clarity', 'institutional_strength', 'surveillance_capacity'],
    unlocks: ['theological_diversity', 'schism_potential', 'reformation_movements', 'divine_mutation'],
  },

  tips: [
    'Minor heresies often indicate genuine spiritual insight—investigate before condemning',
    'Apostasy prevention through inclusion works better than through punishment',
    'Schisms can be managed if addressed early; ignored schisms become permanent',
    'Historical heresies often became tomorrow\'s orthodoxy—context matters',
  ],

  warnings: [
    'Heresy hunts often create more heresy than they eliminate',
    'Forced orthodoxy produces surface compliance and underground resistance',
    'Mass apostasy can occur suddenly when conditions align—monitor faith health',
    'Burning heretics makes martyrs; martyrs inspire more heretics',
    'The deity may side with the heretics if their interpretation better serves divine interests',
  ],

  examples: [
    {
      title: 'The Mercy Heresy',
      description:
        'The War God\'s doctrine was clear: strength through conflict, growth through struggle, victory through blood. Then came the Mercy Heresy—a sect believing the War God valued warrior\'s mercy, the strength to spare a defeated foe. Orthodox temples condemned it. Heresy hunters pursued its adherents. But the sect grew, and with it, something strange: the War God began manifesting mercy aspects. A second face appeared in visions, softer, holding both sword and open hand. Orthodox priests were horrified. The heretics claimed vindication. The War God, when directly queried through costly ritual, gave an ambiguous response: "I am what my faithful believe. They believe I show mercy. Now I do." The heresy became a recognized aspect within two generations. Sometimes wrong belief becomes right belief simply by persisting long enough.',
    },
    {
      title: 'The Prophet Who Left',
      description:
        'High Prophet Salas had served the Light Goddess for forty years. His connection was so strong he glowed, literally, divine radiance leaking from his skin. When he announced his apostasy, the faithful assumed it was a test—surely he would reveal deeper truth, surely the goddess had some purpose. He didn\'t. There was no revelation. He simply stopped believing. "I served what I thought was perfect," he explained. "I found imperfection. I cannot worship what I cannot respect." His departure cost the faith one believer\'s worth of power—negligible. But his visibility cost them thousands of believers who followed his doubt. The glow faded over months as the divine connection dissolved, leaving an ordinary old man who had once been extraordinary. The Light Goddess said nothing publicly. Privately, worshippers reported dreams: the goddess weeping, not for lost power but for lost friendship. Even gods, it seemed, could feel betrayed.',
    },
  ],

  relatedTopics: [
    'doctrinal_enforcement',
    'schism_management',
    'apostasy_prevention',
    'heresy_investigation',
    'deity_mutation',
    'reformation_history',
  ],
});

// ============================================================================
// DIVINE INTERVENTION
// ============================================================================

export const DIVINE_INTERVENTION_HELP = createEffectHelp('divine_intervention', {
  summary: 'When gods act directly—the rarest, costliest, and most dramatic divine expressions',
  description: `Prayer is a request. Miracles are approved requests, delegated implementation. Divine intervention is when the god shows up personally, reality bends around them like fabric around a stone, and things happen that were not supposed to happen according to any physics, probability, or prior arrangement. It's rare. It's expensive. It usually means something has gone very wrong or very right.*

The InterventionManager tracks divine direct actions, measures their cosmic cost, and handles the reality distortion that follows when something infinite touches something finite. Gods don't intervene casually because intervention costs them—not worship or belief but something harder to replace, usually described as "divine attention" or "focus." A god actively intervening somewhere is a god not attending to their other responsibilities. The multiverse is large; divine attention is finite; intervention is opportunity cost at cosmic scale.

**Intervention Categories**:

**Manifestation** puts the deity physically (or quasi-physically) present in mortal space. The god appears—a face in the clouds, a figure of living light, a voice from everywhere at once. Reality struggles to accommodate; mortals in proximity often experience trauma, revelation, or both. Manifestation is expensive, brief, and used for communications too important for prophets.

**Action** involves direct divine modification of reality: the storm that appears from nowhere, the sword that suddenly shatters, the impossible survival of someone who should have died. Unlike miracles (which work through established channels), intervention actions bypass normal causality. The god reaches in and changes things directly. Reality protests; paradox ripples outward; theologians gain employment explaining what happened.

**Preservation** is defensive intervention: preventing something that was going to happen. The meteor that misses, the plague that fails to spread, the assassination that unaccountably fails. Preservation costs more than action because it requires countering established probability rather than inserting new events.

**Cessation** unmakes something that already happened—the rarest and costliest intervention type. Time doesn't reverse; the event remains in memory. But its consequences disappear, its effects undo, its existence becomes somehow both real and unreal. Cessation is used for catastrophic errors, divine embarrassments, or outcomes so bad that even the cost of unmake is acceptable.

**Why Don't Gods Intervene More?**:

The question every suffering mortal asks. The answer involves economics: intervention cost versus outcome value. A god could intervene to save every dying believer—and would have no attention left for anything else, including maintaining their own divine existence. Intervention is reserved for pivotal moments, critical individuals, situations where the cost of acting is less than the cost of not acting. Cold comfort for those who pray and receive silence.

*"Something has gone very wrong" covers approximately 87% of documented interventions. The remaining 13% are celebrations, rewards, and divine surprise parties, which are apparently a thing that happens.`,
  category: 'divinity',
  tags: ['intervention', 'divine', 'direct', 'rare', 'costly', 'dramatic'],
  effectCategory: 'system',
  targetType: 'varies',

  mechanics: {
    values: {
      manifestationCost: '10% divine focus for duration',
      actionCost: '5-50% depending on reality deviation',
      preservationCost: '2x equivalent action cost',
      cessationCost: '10x equivalent action cost minimum',
    },
    formulas: {
      interventionCost: 'effectMagnitude * probabilityDeviation * durationFactor',
      focusRecovery: 'baseRecovery * worshipIntensity * restPeriod',
      paradoxGeneration: 'effectMagnitude * causalDisturbance',
    },
    conditions: {
      'Cost is real': 'Intervention depletes finite divine resources',
      'Paradox accumulates': 'Reality distortion from intervention persists',
      'Attention is finite': 'Intervention here means absence elsewhere',
      'Precedent matters': 'Interventions establish expectations for future requests',
    },
    dependencies: ['divine_focus_reserve', 'situation_severity', 'cost_benefit_calculation'],
    unlocks: ['direct_divine_action', 'reality_modification', 'impossible_preservation', 'history_alteration'],
  },

  tips: [
    'Intervention requests require extreme circumstances—don\'t waste divine attention on solvable problems',
    'Multiple small interventions cost more than one large intervention—be specific',
    'Post-intervention reality is fragile; act carefully in the aftermath',
    'Document everything—intervention events are theologically significant',
  ],

  warnings: [
    'Requesting intervention for insufficient cause can permanently reduce divine favor',
    'Intervention attracts attention from other cosmic entities—expect observers',
    'Paradox from major intervention can create reality scars that persist millennia',
    'Gods who intervene too often deplete into dormancy',
    'Cessation doesn\'t remove memories—those who remember unmade events often suffer',
  ],

  examples: [
    {
      title: 'The Storm That Waited',
      description:
        'The invasion fleet outnumbered the island defenders fifty to one. No military solution existed. The faithful of the Storm Lady prayed—not for victory, not for safety, just "please, anything." The Storm Lady heard and considered: two thousand believers, her strongest temple, a domain well-served by demonstrating she protected her own. She intervened. The storm that appeared was impossible—windspeed exceeding anything recorded, lightning too frequent to be natural, waves that rose only under enemy ships while the harbor stayed calm. The invasion fleet sank entirely. The Storm Lady withdrew, exhausted; for three months, weather across her domain was strange as she recovered her focus. Her believers built a new temple with salvaged enemy wood. Worth it, she decided. The investment had been vast but the message clear: her faithful were protected. For fifty years, no fleet approached that island.',
    },
    {
      title: 'The Cessation of Thornvale',
      description:
        'A god made a mistake. The Harvest Lord, answering what he thought was sincere prayer, blessed the crops of Thornvale—only to discover the prayer came from a demon wearing mortal form, and the "blessing" had been corrupted into blight that would spread and destroy the entire agricultural region. He could contain the blight with preservation, but the damage to Thornvale was done: ten thousand dead, the land poisoned for generations. He chose cessation. The cost was staggering—nearly half his accumulated focus, centuries of careful accumulation, spent in one desperate correction. The blight unhappened. The deaths unoccurred. The prayer unspoke itself. Thornvale survived, confused by dreams of a disaster that had never been. The Harvest Lord collapsed into dormancy for thirty years, too depleted to maintain consciousness. When he woke, the first thing he did was create verification systems for prayer authentication. Some mistakes were too expensive to make twice.',
    },
  ],

  relatedTopics: [
    'intervention_costs',
    'manifestation_trauma',
    'reality_paradox',
    'cessation_effects',
    'divine_economics',
    'prayer_escalation',
  ],
});
