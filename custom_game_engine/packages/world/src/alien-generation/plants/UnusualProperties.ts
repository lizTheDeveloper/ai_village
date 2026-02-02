/**
 * Plant Unusual Properties
 *
 * Strange, magical, or scientifically questionable properties that alien plants might have.
 * Because normal plants are boring and the universe is weird.
 */

export interface UnusualProperty {
  name: string;
  property: string;
  manifestation: string;
  uses: string[];
  warnings: string[];
  flavorText: string;
}

export const UNUSUAL_PROPERTIES: Record<string, UnusualProperty> = {
  'time_displaced': {
    name: 'Temporal Displacement',
    property: 'Exists slightly out of sync with normal time',
    manifestation: 'Appears blurred, actions have delayed effects',
    uses: ['Time-slowing potions', 'Preservation magic', 'Temporal research'],
    warnings: ['May cause temporal paradoxes', 'Harvesting is confusing', 'Age uncertain'],
    flavorText: 'Is it here now? Was it here then? Will it be here soon? Yes. All of them. Confusing.',
  },
  'gravity_defiant': {
    name: 'Antigravity Tissues',
    property: 'Parts of the plant actively repel gravity',
    manifestation: 'Floating leaves, upward-falling seeds, hovering flowers',
    uses: ['Levitation ingredients', 'Airship construction', 'Impressive bouquets'],
    warnings: ['May float away', 'Harvesting requires nets', 'Physics complaints'],
    flavorText: 'Gravity? Optional. Falls upward. Seeds disperse to clouds. Impossible. Happens anyway.',
  },
  'dimensional_anchor': {
    name: 'Reality Anchor',
    property: 'Stabilizes local dimensional fabric',
    manifestation: 'Area around plant is unusually stable, portals fail nearby',
    uses: ['Anti-teleportation wards', 'Dimensional stability', 'Sanctuary creation'],
    warnings: ['Prevents all teleportation', 'May trap things', 'Boring'],
    flavorText: 'Reality solidifies nearby. Portals fail. Teleporters stuck. Stability incarnate. Annoying.',
  },
  'memory_storage': {
    name: 'Engram Crystallization',
    property: 'Stores memories in crystalline structures within tissues',
    manifestation: 'Eating plant tissue transfers memories to consumer',
    uses: ['Memory preservation', 'Knowledge transfer', 'Evidence storage'],
    warnings: ['Privacy violations', 'Disturbing flashbacks', 'Legal complications'],
    flavorText: 'Remembers everything. Eat it. Know things. Not your things. Someone else\'s. Weird.',
  },
  'sound_emitting': {
    name: 'Vocal Apparatus',
    property: 'Produces organized sounds, possibly speech',
    manifestation: 'Hums, sings, or speaks in unknown languages',
    uses: ['Musical instruments', 'Warning systems', 'Companionship'],
    warnings: ['May be annoying', 'Unknown lyrics', 'Night singing'],
    flavorText: 'Speaks. Or sings. Unknown language. Pretty though. Words mean something. Probably.',
  },
  'invisibility': {
    name: 'Light Bending',
    property: 'Bends light around itself to become invisible',
    manifestation: 'Cannot be seen except under specific conditions',
    uses: ['Invisibility potions', 'Camouflage research', 'Hide and seek cheating'],
    warnings: ['Easy to step on', 'Hard to find', 'Exists? Maybe?'],
    flavorText: 'Is it there? Touch says yes. Eyes say no. Brain confused. Plant amused. Probably.',
  },
  'emotion_sensing': {
    name: 'Empathic Resonance',
    property: 'Responds to emotional states of nearby beings',
    manifestation: 'Changes color, scent, or shape based on ambient emotions',
    uses: ['Mood detection', 'Therapy assistance', 'Lie detection'],
    warnings: ['Privacy invasion', 'Emotional feedback loops', 'Party pooper'],
    flavorText: 'Knows how you feel. Shows everyone. Embarrassing. Helpful. Mostly embarrassing.',
  },
  'probability_manipulation': {
    name: 'Luck Interference',
    property: 'Subtly alters probability in its vicinity',
    manifestation: 'Unlikely events become common nearby',
    uses: ['Gambling aids', 'Fortune telling', 'Chaos magic'],
    warnings: ['Unpredictable outcomes', 'May backfire spectacularly', 'Casinos hate it'],
    flavorText: 'Changes odds. Coins flip wrong. Dice behave strangely. Lucky? Unlucky? Both.',
  },
  'dream_entering': {
    name: 'Oneiric Projection',
    property: 'Enters dreams of sleeping beings nearby',
    manifestation: 'Appears in dreams, can communicate or influence',
    uses: ['Dream therapy', 'Message delivery', 'Nightmare creation'],
    warnings: ['Consent issues', 'Sleepless nights', 'Dream invasion lawsuits'],
    flavorText: 'Visits dreams. Uninvited. Leaves messages. Or nightmares. Depends on plant mood.',
  },
  'soul_attracting': {
    name: 'Spirit Beacon',
    property: 'Attracts disembodied spirits and souls',
    manifestation: 'Ghosts gather around plant, may communicate through it',
    uses: ['Seances', 'Spirit communication', 'Ghost trapping'],
    warnings: ['Haunted gardens', 'Unwanted visitors', 'Spiritual noise pollution'],
    flavorText: 'Ghosts love it. Gather around. Chat. Argue. Haunt. Plant unbothered. Everyone else scared.',
  },
  'matter_transmutation': {
    name: 'Alchemical Catalyst',
    property: 'Slowly transmutes nearby matter into different elements',
    manifestation: 'Surrounding materials change composition over time',
    uses: ['Gold creation (slow)', 'Material purification', 'Alchemy research'],
    warnings: ['Destroys containers', 'Unpredictable results', 'Philosopher stone wannabe'],
    flavorText: 'Changes things. Slowly. Lead to gold? Eventually. Container to hole? Immediately.',
  },
  'pain_immunity': {
    name: 'Anesthetic Presence',
    property: 'Nullifies pain sensation in nearby beings',
    manifestation: 'Area of effect pain suppression',
    uses: ['Surgery assistance', 'Torture prevention', 'Dangerous comfort'],
    warnings: ['May hide injury', 'Addictive comfort', 'Danger ignorance'],
    flavorText: 'Pain disappears nearby. Injuries still happen. Just don\'t feel them. Dangerous comfort.',
  },
  'magnetic_polarity': {
    name: 'Living Lodestone',
    property: 'Generates strong magnetic fields',
    manifestation: 'Attracts or repels metal, interferes with compasses',
    uses: ['Metal detection', 'Compass creation', 'Navigation confusion'],
    warnings: ['Destroys electronics', 'Attracts lightning', 'Dangerous near metal'],
    flavorText: 'Magnetic. Very. Metal flies toward it. Or away. Compasses spin. Electronics die.',
  },
  'reflection_absorption': {
    name: 'Mirror Consumer',
    property: 'Absorbs reflections, preventing them from forming',
    manifestation: 'No reflection visible near plant, mirrors show nothing',
    uses: ['Vampire comfort', 'Stealth enhancement', 'Vanity prevention'],
    warnings: ['Unsettling effect', 'Identity confusion', 'Makeup impossible'],
    flavorText: 'Eat reflections. Mirrors blank. Vampires relieved. Everyone else disturbed.',
  },
  'truth_compelling': {
    name: 'Verity Aura',
    property: 'Makes lying difficult or impossible nearby',
    manifestation: 'Compels honesty in its presence',
    uses: ['Legal proceedings', 'Relationship therapy', 'Diplomatic disasters'],
    warnings: ['Forces uncomfortable truths', 'Social situations ruined', 'Politicians avoid'],
    flavorText: 'Truth only nearby. Lies fail. Secrets spill. Awkward. Useful. Mostly awkward.',
  },
  'age_manipulation': {
    name: 'Temporal Metabolism',
    property: 'Accelerates or decelerates aging in surroundings',
    manifestation: 'Things age differently near plant',
    uses: ['Preservation', 'Rapid maturation', 'Fountain of youth attempts'],
    warnings: ['Unpredictable aging', 'May reverse or accelerate randomly', 'Time crimes'],
    flavorText: 'Ages things. Or unages. Unpredictable. Wine ages perfectly. Owner ages poorly. Balance.',
  },
  'shadow_casting': {
    name: 'Umbral Generation',
    property: 'Casts shadows independent of light sources',
    manifestation: 'Creates darkness zones, shadow may move independently',
    uses: ['Shade creation', 'Shadow magic', 'Dramatic entrances'],
    warnings: ['Shadow may have agenda', 'Creepy', 'Blocks sunlight unexpectedly'],
    flavorText: 'Makes shadows. Always. No light required. Shadow moves. On its own. Sometimes.',
  },
  'prophecy_inducing': {
    name: 'Oracle Stimulant',
    property: 'Consumption induces prophetic visions',
    manifestation: 'Eater sees possible futures',
    uses: ['Fortune telling', 'Decision making', 'Stock market cheating'],
    warnings: ['Visions may be misleading', 'Futures not guaranteed', 'Headaches'],
    flavorText: 'Eat. See future. Maybe. Probably. One of many futures. Which one? Find out later.',
  },
  'elemental_affinity': {
    name: 'Elemental Attunement',
    property: 'Strongly attuned to one classical element',
    manifestation: 'Embodies fire, water, earth, or air properties',
    uses: ['Elemental magic', 'Elemental summoning', 'Weather control'],
    warnings: ['May be dangerous to opposite element', 'Extreme reactions', 'Elemental drama'],
    flavorText: 'Is fire. Or water. Or earth. Or air. Not metaphorically. Actually. Element in plant form.',
  },
  'boundary_marking': {
    name: 'Territory Delineation',
    property: 'Creates invisible but tangible boundaries',
    manifestation: 'Defines spaces that cannot be easily crossed',
    uses: ['Property lines', 'Sacred spaces', 'Prison cells'],
    warnings: ['May trap things', 'Boundary disputes', 'Cannot be removed easily'],
    flavorText: 'Draws lines. Invisible. Solid. Cross if invited. Otherwise no. Polite walls.',
  },
};
