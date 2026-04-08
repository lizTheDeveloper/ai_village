/**
 * SpellSandboxParadigmTemplates — Rich LLM prompt context for 8 magic paradigms
 *
 * Each template gives the Spell Sandbox's LLM rich context so that spell results
 * feel distinct per paradigm. Templates cover:
 *   1. Cultural/elemental philosophy (3–5 sentences)
 *   2. Vocabulary register (tone and word choices the LLM should favour)
 *   3. Forbidden/impossible combinations for this paradigm (grounds LLM expectations)
 *   4. Three calibration examples (verb + noun → expected tone/result)
 *
 * These are used by SpellSandboxPromptBuilder when the caller does not supply
 * their own paradigmLore. Chosen paradigms: those most commonly encountered in
 * early-game biomes and starter villages.
 *
 * Paradigm IDs match keys in packages/magic/data/{core,creative,animist}-paradigms.json.
 */

export interface SpellExample {
  verb: string;
  noun: string;
  title: string;
  description: string;
}

export interface ParadigmTemplate {
  /** Paradigm ID — must match the JSON data key */
  id: string;
  /** Display name */
  name: string;
  /**
   * 3–5 sentence philosophy statement.
   * Injected into the system prompt to orient the LLM's creative frame.
   */
  philosophy: string;
  /**
   * Vocabulary register guidance: tone, word register, imagery palette.
   * The LLM uses this to match prose style to paradigm.
   */
  vocabularyRegister: string;
  /**
   * Verb+noun pairs that are impossible or philosophically incoherent in this paradigm.
   * Prevents the LLM from generating effects that contradict paradigm rules.
   * Format: "Verb + Noun" strings.
   */
  forbiddenCombinations: string[];
  /**
   * Three calibration examples establishing the expected tone and depth.
   */
  examples: [SpellExample, SpellExample, SpellExample];
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * Emotional Magic — feelings as the substrate of power
 */
const EMOTIONAL: ParadigmTemplate = {
  id: 'emotional',
  name: 'Emotional Magic',
  philosophy: `In this tradition, emotion is not the catalyst for magic — it is the substance. \
Grief compressed into a stone can shatter iron. Joy distilled into a single breath can revive a dying plant. \
The practitioner does not channel feelings; they become a vessel through which raw emotional force flows outward into the world. \
Experienced emotional mages have learned to hold two contradictory feelings simultaneously — the resulting tension generates more power than either alone. \
The greatest risk is not losing control, but losing the ability to feel at all: the emotion burned away in the casting.`,
  vocabularyRegister: `Intimate, visceral, and sensory. Use body language and breath as imagery. \
Avoid clinical or mechanical language. Favour words like "aches", "floods", "trembles", "exhales", "settles". \
Spells should feel personal — as if the caster left something of themselves in the world.`,
  forbiddenCombinations: [
    'Destroy + Joy',
    'Create + Nothing',
    'Control + Grief',
    'Silence + Love',
  ],
  examples: [
    {
      verb: 'Bind',
      noun: 'Grief',
      title: 'Weight of Remembrance',
      description: `The caster draws every unspoken sorrow from the past hour into a single breath, \
then exhales it into the earth beneath a chosen target. \
The ground itself seems to lean toward that person, as if the soil remembers a loss they have not yet faced. \
For a short time, their movements slow — not from pain, but from the sudden awareness of something heavy waiting inside them.`,
    },
    {
      verb: 'Reveal',
      noun: 'Bond',
      title: 'Threads Visible',
      description: `The caster turns inward and lets their own love — for anyone, anything — spill outward like light from a crack in a wall. \
For a breath's duration, everyone nearby can see faint luminous filaments connecting people to the things they quietly cherish. \
The strands are not always between people; some run to a worn tool, a patch of ground, a distant horizon.`,
    },
    {
      verb: 'Grow',
      noun: 'Joy',
      title: 'Surplus Heart',
      description: `The caster cultivates a small, genuine joy — the warmth of sunlight, the smell of baking bread — and feeds it outward like water feeding a seedling. \
Nearby creatures feel an inexplicable lightness; animals stop pacing, arguments lose their heat, fatigue seems briefly less heavy. \
The effect fades as suddenly as it came, leaving behind only the faint sense that something good just passed through.`,
    },
  ],
};

/**
 * Breath Magic — awakening through the act of breathing
 */
const BREATH: ParadigmTemplate = {
  id: 'breath',
  name: 'Investing (Breath)',
  philosophy: `Breath is not merely the movement of air — it is the gift of animation that one living thing can bestow upon another. \
Every exhale transfers a tiny fragment of the caster's own animating force; over a lifetime of study, practitioners learn to give \
or withhold this force with surgical precision. Objects breathed upon become subtly more themselves: a blade sharpened, a wall fortified, \
a lock opened by reminding it of what "open" truly means. The tradition holds that all things were once breathed into existence and remember \
the feeling; the mage simply reminds them.`,
  vocabularyRegister: `Warm, intimate, and elemental. Language should evoke closeness — breath is by definition near. \
Use present-tense immediacy: "the wood sighs", "the stone remembers", "the air thickens". \
Avoid cold or distant imagery. Spells should feel like they carry the warmth of a living body.`,
  forbiddenCombinations: [
    'Destroy + Life',
    'Silence + Air',
    'Control + Breath',
    'Summon + Void',
  ],
  examples: [
    {
      verb: 'Grow',
      noun: 'Seed',
      title: 'First Breath Given',
      description: `The caster cups a seed in both hands and breathes upon it three times — each breath carrying a different memory: \
the taste of rain, the pull of soil, the patience of years. \
The seed does not sprout immediately, but when placed in earth, it roots faster than nature allows, \
as if it already knows what it is becoming.`,
    },
    {
      verb: 'Mend',
      noun: 'Flame',
      title: 'Relit Ember',
      description: `Kneeling close to dying coals, the mage breathes a slow, measured exhale across the ash. \
The breath carries the echo of something it once meant to warm — not command, but memory. \
A single coal glows, then another, until a small steady fire breathes in rhythm with the mage, \
as if the two have agreed on something.`,
    },
    {
      verb: 'Reveal',
      noun: 'Body',
      title: 'The Breath-Map',
      description: `The mage inhales deeply and holds the breath, then slowly releases it toward the subject. \
For the duration of the breath, the target's body glows faintly wherever it is working too hard — \
overtaxed muscles, a healing wound, a joint that is lying about how much it hurts. \
The information is offered honestly, without judgment.`,
    },
  ],
};

/**
 * Tethermancy Magic — links between similar things
 */
const TETHERMANCY: ParadigmTemplate = {
  id: 'tethermancy',
  name: 'Tethermancy',
  philosophy: `Tethermancy is the oldest of magics: the recognition that like calls to like, that the world is \
woven from invisible correspondences. A fragment of someone's hair is still them, in some diminished sense. \
A precise model of a door is, briefly, a door. Practitioners work by identifying correspondences — \
sometimes obvious, sometimes surprising — and reinforcing them until the link carries force. \
The art is not in the connection itself but in knowing which correspondences will hold under stress and which will snap, \
scattering the invested will back into the caster.`,
  vocabularyRegister: `Precise, methodical, and occasionally archaic. Sympathetic mages tend toward the language of craftsmanship. \
Use words like "correspondent", "resonance", "link", "attunement", "proxy". Imagery of threads, mirrors, and models. \
Descriptions should feel intellectually satisfying — like a well-fitted joint or a balanced equation.`,
  forbiddenCombinations: [
    'Create + Nothing',
    'Summon + Paradox',
    'Destroy + Time',
    'Silence + Echo',
  ],
  examples: [
    {
      verb: 'Bind',
      noun: 'Stone',
      title: 'Likeness Locked',
      description: `The mage carves a rough figure from river clay, naming it for a crumbling wall across the village. \
When the clay figure is sealed with thread and buried beside the wall's cornerstone, \
the wall's decay slows — not through any force applied to the wall itself, \
but because the link between model and original now carries the weight of durability from the clay, \
which was shaped with care, into the stone, which has forgotten what care feels like.`,
    },
    {
      verb: 'Reveal',
      noun: 'Memory',
      title: 'Correspondent Impression',
      description: `Taking an object once held by the subject — a cup, a tool, a worn coin — \
the mage presses it to their temple and attunes to the sympathetic connection between object and owner. \
The impressions that surface are not visions but feelings: the weight of a decision, \
the texture of a recurring worry, the emotional colour of a moment the object witnessed.`,
    },
    {
      verb: 'Transform',
      noun: 'Rain',
      title: 'Redirected Correspondence',
      description: `By establishing a sympathetic link between the clouds overhead and a dry streambed miles away, \
the mage shifts the rain's correspondence — the sky now "knows" that the streambed is its natural partner. \
Rain follows the link, easing from overhead and arriving where it was quietly expected. \
The mage feels the weight of the sky's indifference settle into something closer to intention.`,
    },
  ],
};

/**
 * Dream Magic (Oneiromancy) — navigating and manipulating the dream world
 */
const DREAM: ParadigmTemplate = {
  id: 'dream',
  name: 'Oneiromancy (Dream)',
  philosophy: `The waking world is the surface; beneath it lies the dream world — older, stranger, and indifferent \
to the laws of matter and time. Dream mages learn to enter this beneath-place consciously, \
carrying intention like a lantern into fog. Objects and people leave dream-shadows of themselves, \
impressions that persist long after the thing itself has moved on. \
Skilled oneiromancers can reach across these shadows to affect the waking thing, \
or draw knowledge from what the dream-world remembers. The danger is in staying too long: \
the dream world rewrites the visitor's memory of what "real" means.`,
  vocabularyRegister: `Liminal, layered, and slightly disorienting. Language should blur edges: "half-remembered", "the shape of", \
"what the dark kept". Use past-tense moments nested inside present action. \
Avoid clean beginnings and endings — dream spells bleed at the margins.`,
  forbiddenCombinations: [
    'Create + Time',
    'Destroy + Shadow',
    'Control + Sleep',
    'Bind + Void',
  ],
  examples: [
    {
      verb: 'Reveal',
      noun: 'Shadow',
      title: 'Dream-Echo Reading',
      description: `Pressing their palms flat to the ground of a place where something important once happened, \
the mage sinks half a breath into the below. \
The shadow left by that past event surfaces around them like watercolour spreading in water — \
not the event itself, but the feeling it left behind: urgency, grief, triumph, shame. \
The mage wakes with mud-knowledge: contextless certainty about something that happened here.`,
    },
    {
      verb: 'Bind',
      noun: 'Memory',
      title: 'Tethered Dream',
      description: `The mage captures a specific memory — their own, or offered willingly by another — \
and knots it into the dream-world's fabric just below the surface of a place or object. \
Whoever rests there or handles the object will find that memory visiting them unbidden in sleep, \
not as their own but as something borrowed: someone else's afternoon, \
someone else's love, worn briefly like a coat.`,
    },
    {
      verb: 'Summon',
      noun: 'Beast',
      title: 'Dream-Creature Called',
      description: `The mage opens a narrow door between the below and the waking world and calls out in the language \
of recurring nightmares — not words, but feelings, specific fears shaped into an invitation. \
A creature from that place steps through: not a real animal, but the dream-shape of one, \
half-translucent and slightly wrong in its proportions. It serves for as long as the mage can hold \
the door open, then dissolves like a name you almost remembered.`,
    },
  ],
};

/**
 * Craft Magic — making things imbues them with intent and force
 */
const CRAFT: ParadigmTemplate = {
  id: 'craft',
  name: 'Craft Magic',
  philosophy: `To make something with intention is to pour a fragment of yourself into it. \
Craft mages understand that this is not metaphor: the act of creation with focused will leaves \
a literal residue of intent that the object carries forward. A knife made with anger cuts more easily; \
bread baked with care nourishes more completely. The practitioner's art lies in cultivating the right interior \
state during the making — not performing an emotion, but genuinely inhabiting it — \
so that the object becomes a vessel for that quality rather than just a physical thing.`,
  vocabularyRegister: `Grounded, tactile, and patient. Language should smell of wood shavings and forge-smoke. \
Use sensory specifics: the grain of the wood, the temperature of the metal, the resistance of clay. \
Craft magic descriptions should feel satisfying in the way that finished work feels satisfying — \
earned, solid, not showy.`,
  forbiddenCombinations: [
    'Destroy + Making',
    'Summon + Void',
    'Control + Craft',
    'Reveal + Nothing',
  ],
  examples: [
    {
      verb: 'Protect',
      noun: 'Stone',
      title: 'Foundation-Set',
      description: `The mage lays each cornerstone of a wall while holding the precise feeling of wanting the people \
inside to be safe — not wishing it, but knowing it the way one knows the weight of a tool. \
The mortar mixed during this work sets unusually hard; over years, \
the wall weathers less than its neighbours, as if the stone remembers what it was made to do.`,
    },
    {
      verb: 'Mend',
      noun: 'Metal',
      title: 'Honest Repair',
      description: `Working with hammer and care rather than haste, the mage refolds a cracked blade's edge \
while holding in mind the original smith's intent — strength, balance, the specific hand that would hold this. \
The repaired metal holds at the seam better than new steel ought to, \
because the intention invested in the repair was honest about what the blade was for.`,
    },
    {
      verb: 'Enhance',
      noun: 'Seed',
      title: 'Cultivated Purpose',
      description: `The mage plants each seed while attending completely to the act — \
not thinking of the harvest, but thinking of the seed, what it is trying to become. \
The seedlings that emerge from this patient attention grow with unusual directness: \
fewer false starts, fewer weak stalks, as if they know what they are supposed to do \
and have been given permission to do it without hesitation.`,
    },
  ],
};

/**
 * Song Magic — melodies are spells, harmonies are power
 */
const SONG: ParadigmTemplate = {
  id: 'song',
  name: 'The Singing',
  philosophy: `Before language, before gesture, there was melody: the first shaping of breath into meaning. \
Song mages work with the understanding that the world has a resonant frequency — a hum that underlies \
all matter — and that certain melodies harmonise with it, amplify it, or bend it. \
A skilled singer does not force the world; they find the note the world is already almost singing \
and add their voice to it until the world leans toward what the song describes. \
The hardest songs are not the most complex but the most honest: a melody that means nothing to the singer \
will move nothing.`,
  vocabularyRegister: `Rhythmic and layered. Descriptions should feel like they have a tempo — short clauses, \
recurring images. Use sound-words liberally: "hums", "resonates", "strikes", "fades". \
The imagery palette is water and wind and vibrating strings. Avoid silence as a neutral state.`,
  forbiddenCombinations: [
    'Silence + Song',
    'Destroy + Harmony',
    'Control + Memory',
    'Bind + Air',
  ],
  examples: [
    {
      verb: 'Grow',
      noun: 'Plant',
      title: 'Green Chorus',
      description: `The mage hums a descending interval — the sound of rain arriving — over a field that has forgotten rain. \
The melody carries no words, only the shape of water and patience. \
Below ground, roots hesitate, then extend another inch; \
by the time the song ends, the soil is looser, as if the earth took a breath and decided not to hold it.`,
    },
    {
      verb: 'Reveal',
      noun: 'Memory',
      title: 'Echo-Call',
      description: `The mage sings the last few notes of a song the subject used to know — \
not to remind them, but to find the door the song once opened. \
What surfaces is not the memory itself but the feeling that lived inside it: \
the warmth, the safety, or the grief that the melody once marked. \
The subject often cannot say what they remembered, only that something came back.`,
    },
    {
      verb: 'Bind',
      noun: 'Bond',
      title: 'Woven Thread',
      description: `Two voices, singing in thirds — not in unison, but in deliberate harmony — \
weave a connection between two people or two things that the world recognises as belonging together. \
The bond is not unbreakable; it is simply harder to ignore. \
For the duration of the song and some time after, the two linked things pull toward each other \
the way a chord left unresolved pulls toward completion.`,
    },
  ],
};

/**
 * Threshold Magic — doorways, crossroads, and boundaries as sources of power
 */
const THRESHOLD: ParadigmTemplate = {
  id: 'threshold',
  name: 'Threshold Magic',
  philosophy: `A doorway is not merely a gap in a wall — it is the moment of not-yet-decided, \
the in-between that belongs to neither space. Threshold mages draw power from these between-places: \
doorways, crossroads, dusk, the shore at tide-turn. \
The boundary between two states is where potential is highest; \
neither state has fully claimed the moment, and a skilled practitioner can push it one way or another. \
The tradition teaches that the most powerful thresholds are not physical but temporal: \
the crossing from sleeping to waking, the moment before a decision becomes final.`,
  vocabularyRegister: `Liminal and precise. Language should sit at edges: neither here nor there, \
not yet and no longer. Favourite words: "crossing", "threshold", "between", "before", "the moment of". \
Imagery of dusk, tide, doorframes, crossroads. Descriptions should feel like they could go either way.`,
  forbiddenCombinations: [
    'Control + Threshold',
    'Create + Boundary',
    'Destroy + Crossroads',
    'Bind + Time',
  ],
  examples: [
    {
      verb: 'Reveal',
      noun: 'Shadow',
      title: 'Liminal Sight',
      description: `Standing in a doorway — one foot in, one foot out — \
the mage enters the between-state where things that belong to neither space become visible. \
Thresholds in the world light up like lanterns: the door that has been opened too many times \
for the same reason, the path that is almost but not quite a decision, \
the face caught in the moment before it changes.`,
    },
    {
      verb: 'Transform',
      noun: 'Time',
      title: 'Held Crossing',
      description: `At the precise moment of dusk — neither day nor night — \
the mage holds their breath and pushes the threshold outward, \
stretching the between-moment like the skin of a drum. \
For those inside the stretched crossing, time neither moves forward nor stands still: \
it waits. The duration is unmeasurable from inside; outside, only seconds pass.`,
    },
    {
      verb: 'Summon',
      noun: 'Spirit',
      title: 'Between-Caller',
      description: `At a crossroads at midnight — the hour and the place both between — \
the mage opens a threshold by stepping into the intersection and facing all directions at once \
(which requires a moment of genuine spatial disorientation). \
What comes through is not always what was called, but whatever was already waiting at that crossing: \
a spirit of old decisions, a memory the road holds from the people who stood here before.`,
    },
  ],
};

/**
 * Belief Magic — collective belief reshapes reality
 */
const BELIEF: ParadigmTemplate = {
  id: 'belief',
  name: 'Belief Magic',
  philosophy: `A thing believed by enough people becomes, in some meaningful sense, true. \
Belief mages work with this understanding as engineering rather than philosophy: \
they cultivate, spread, and focus collective belief until the world accommodates it. \
A village that genuinely believes the river will not flood this year shifts the odds in their favour. \
A single mage cannot generate enough belief on their own — they are always working with borrowed \
or cultivated faith, which makes them forever dependent on community. \
The tradition's central warning: a belief that collapses takes everything built on it down with it.`,
  vocabularyRegister: `Social, layered, and slightly conspiratorial. Language should suggest that the mage \
is working with invisible social forces. Use collective language: "the village knows", "it is agreed", \
"the story holds". Imagery of weaving, of architecture, of water finding its level. \
Avoid first-person heroics — this magic is always bigger than one person.`,
  forbiddenCombinations: [
    'Create + Truth',
    'Destroy + Belief',
    'Control + Faith',
    'Silence + Story',
  ],
  examples: [
    {
      verb: 'Protect',
      noun: 'Bond',
      title: 'Shared Certainty',
      description: `The mage does not cast so much as orchestrate: they spend the days before \
quietly reminding each person in the community of a moment when someone else came through for them. \
By the time the threat arrives, everyone in the village holds the same unspoken belief — \
that they will not break apart — and reality, feeling the weight of that collective conviction, \
finds it marginally easier to honour.`,
    },
    {
      verb: 'Reveal',
      noun: 'Truth',
      title: 'Common Knowledge Unburied',
      description: `The mage introduces into conversation a thing everyone already quietly knows \
but has agreed not to acknowledge. The moment the belief is named aloud and affirmed \
by a sufficient number of voices, it stops being hidden and starts being real in a way it could not be before: \
the door locked by unspoken agreement swings open, because everyone has stopped pretending it is locked.`,
    },
    {
      verb: 'Grow',
      noun: 'Flame',
      title: 'Kindled Legend',
      description: `The mage tells the story of a great fire that once protected this place — \
true or not matters less than the telling being believed. \
Over days, they hear the story repeated and embellished, see people leaving small offerings at hearths. \
When the cold comes in earnest, the fires in this community burn hotter and longer than the wood alone should allow, \
fed partly by fuel and partly by the sincere expectation that they will.`,
    },
  ],
};

/**
 * Rune Magic — carved symbols activate magical effects
 */
const RUNE: ParadigmTemplate = {
  id: 'rune',
  name: 'Runecraft',
  philosophy: `A rune is a compressed instruction — a shape that carries meaning so stable \
it can outlast the hand that carved it. Rune mages work in the oldest written language: \
not words that describe things but marks that are things, in a diminished but real sense. \
The tradition holds that the first runes were not invented but discovered, \
each one the natural symbol for a force that already existed and merely needed a vessel. \
Carving a rune correctly — with the right tool, at the right depth, in the right material — \
releases the force it names, which then operates according to its own logic until the rune is defaced or covered.`,
  vocabularyRegister: `Austere, ancient, and material. Descriptions should feel like inscriptions — permanent, \
economical, unadorned. Use the language of craft: "carved", "cut", "set", "bound into". \
Imagery of stone, metal, wood grain, and old marks. Avoid warmth or intimacy; \
rune magic is impersonal by design. The mage is an instrument, not a creator.`,
  forbiddenCombinations: [
    'Summon + Time',
    'Destroy + Rune',
    'Control + Memory',
    'Silence + Stone',
  ],
  examples: [
    {
      verb: 'Protect',
      noun: 'Stone',
      title: 'Ward-Mark Set',
      description: `The mage cuts a preservation rune into the keystone of an arch — three strokes, \
each one the depth of a thumbnail, each one carrying the name of endurance in the oldest alphabet. \
The arch does not become indestructible; it becomes harder to damage carelessly. \
Tools slip on it at odd angles. Wood rot avoids the stone near the rune. \
The mark simply insists, in a quiet and persistent way, that this stone is meant to stand.`,
    },
    {
      verb: 'Bind',
      noun: 'Flame',
      title: 'Hearthmark',
      description: `A rune carved into the firebox of a hearth — not cut deeply, but cut right — \
names that fire as fire-that-stays. \
The flame does not burn hotter or more efficiently; it simply does not go out \
when it ought to, given the state of the fuel. Cold nights find it burning at midnight \
without anyone having fed it. The household stops thinking about it and starts relying on it, \
which is precisely what the rune intended.`,
    },
    {
      verb: 'Reveal',
      noun: 'Text',
      title: 'Inscription Opened',
      description: `The mage traces a reading rune over text written in an unfamiliar hand or tongue — \
not translating, but making the text's intent legible beneath the words. \
The shapes do not change; the meaning that rises is the author's intent rather than their language: \
what they meant, the feeling behind the instruction, the thing they were afraid to write plainly. \
The rune does not lie on behalf of the text; it only opens what was already there.`,
    },
  ],
};

// ---------------------------------------------------------------------------
// New paradigms: blood, divine, names, pact, shinto, ferromancy, lunar, seasonal
// ---------------------------------------------------------------------------

const BLOOD: ParadigmTemplate = {
  id: 'blood',
  name: 'The Crimson Art',
  philosophy: `Blood is not a symbol of life — it is life itself, made tangible and transferable. \
The Crimson Art holds that power cannot be conjured from nothing: every effect demands a price paid in vitality. \
Practitioners draw on their own blood first, and learn to sense the life-force in others as a reservoir to tap. \
The tradition is ancient beyond memory and forbidden in most civilisations — not because it is evil, \
but because it is honest in a way that comfortable magic refuses to be. \
Every other tradition borrows; blood mages pay in full.`,
  vocabularyRegister: `Visceral, urgent, and unsparing. Language should carry physical weight — veins, pulse, heat, iron. \
Use short sentences when describing the act of casting; longer ones for the aftermath. \
Avoid glamour and metaphor; this magic does not beautify itself. \
Imagery: copper taste, warmth draining, something vital passing between two living things.`,
  forbiddenCombinations: [
    'Create + Spirit',
    'Grow + Joy',
    'Protect + Life',
    'Reveal + Nothing',
  ],
  examples: [
    {
      verb: 'Drain',
      noun: 'Wound',
      title: 'Debt Collected',
      description: `The mage presses a bleeding hand to the wound and draws the injury inward rather than outward — \
not healing so much as transferring. The target's wound closes, the bleeding stops, \
and the mage feels it open somewhere under their own ribs: a dull, real ache that will take days to fade. \
The exchange is exact. Nothing is created; nothing is lost.`,
    },
    {
      verb: 'Bind',
      noun: 'Body',
      title: 'Vital Shackle',
      description: `A few drops of the mage's blood, traced in a circle around the target's wrist, dry instantly to something \
that looks like old rust. The bond is not physical — the target can walk freely — \
but every act of violence they attempt sends a sharp, clear pain up the bound arm, \
as if their own body has quietly decided it would rather not.`,
    },
    {
      verb: 'Reveal',
      noun: 'Body',
      title: 'What the Blood Knows',
      description: `The mage takes a small amount of blood — their own, or offered willingly — and holds it on their tongue. \
For a breath, they perceive the donor's body as a map of damage and healing: old breaks that set wrong, \
a slow illness still deciding whether to take hold, the precise location of something that will fail within the year. \
The knowledge is offered without comfort and without error.`,
    },
  ],
};

const DIVINE: ParadigmTemplate = {
  id: 'divine',
  name: 'The Faithful',
  philosophy: `Divine power is not granted to those who demand it — it flows to those who have made themselves \
worthy vessels through years of service, prayer, and sincere devotion. \
A priest does not command their god any more than a stream commands the mountain; \
they align themselves with a force that is already moving and allow it to work through them. \
The tradition's central paradox is that the moment a practitioner believes they have earned power, \
they have already begun to lose it: genuine faith requires the constant possibility that the god might say no.`,
  vocabularyRegister: `Elevated, warm, and assured — but never arrogant. Language should feel like light through stained glass: \
bright but filtered through something larger than the speaker. \
Use collective or passive constructions when describing the effect ("a warmth settles", "the wound closes"). \
The mage is an instrument. Favour imagery of light, shelter, laying on of hands, and the word "grace".`,
  forbiddenCombinations: [
    'Destroy + Spirit',
    'Control + Faith',
    'Summon + Void',
    'Silence + Prayer',
  ],
  examples: [
    {
      verb: 'Mend',
      noun: 'Body',
      title: 'Grace Given',
      description: `The priest kneels and lays both hands on the wound, speaking no words aloud — only the interior motion \
of genuine attention turned toward the injured person as a person, not a problem to be solved. \
A warmth moves through the hands into the flesh; the bleeding slows, then stops. \
What remains is not a scar but a faint luminescence, as if the skin remembers being touched by something that meant it well.`,
    },
    {
      verb: 'Protect',
      noun: 'Bond',
      title: 'Blessed Compact',
      description: `The faithful mage stands between two people who have made a promise to each other and speaks a short prayer \
that asks their deity to hold the intention, not the words. \
The promise does not become unbreakable — the god respects will — but both parties will feel a quiet resistance \
the moment they begin to move against it, as if a hand has been placed gently on their shoulder.`,
    },
    {
      verb: 'Reveal',
      noun: 'Truth',
      title: 'Candor Called',
      description: `The priest speaks a prayer of discernment over a place or a conversation, asking their god to let truth \
find its own weight. The effect is not dramatic: no compulsion, no revelation. \
But the people in the space find it harder to sustain comfortable fictions — \
not forced to confess, but aware, in the way a person is aware of a stone in their shoe, \
that there is something they have not said.`,
    },
  ],
};

const NAMES: ParadigmTemplate = {
  id: 'names',
  name: 'The Deep Grammar',
  philosophy: `In the beginning was the Word — not as metaphor, but as mechanism. \
Everything that exists has a true name in the oldest language: a sound that is not a label but the thing itself, \
compressed into utterance. To speak a true name correctly is to have complete, temporary authority over the named; \
to know your own true name is to know yourself without the comfortable distortions of self-regard. \
The tradition's greatest danger is also its foundation: if someone else learns your true name, \
they hold a key to you that no lock can refuse. Naming mages guard their own names with the discipline of people \
who understand, concretely, what it means to be known.`,
  vocabularyRegister: `Precise, deliberate, and slightly archaic. Language should feel like someone who chooses every word \
with the care of someone who knows words have weight. \
Use exact nouns, avoid approximation. Imagery of listening, of syllables, of things falling into place. \
Descriptions should feel like a very well-made key turning in a very well-made lock.`,
  forbiddenCombinations: [
    'Create + Mind',
    'Destroy + Spirit',
    'Silence + Name',
    'Control + Time',
  ],
  examples: [
    {
      verb: 'Control',
      noun: 'Wind',
      title: 'Air Called to Account',
      description: `The mage speaks the wind's true name — not the word for wind, but the name of this wind, \
the specific motion of air in this valley on this afternoon — in a single precise syllable. \
The wind does not stop; it listens. For a moment it moves exactly as directed, \
no more than a person might obey a request they understand to be reasonable. \
When the name's authority fades, the wind returns to its own business without resentment.`,
    },
    {
      verb: 'Reveal',
      noun: 'Water',
      title: 'Hidden Name Surfaced',
      description: `The mage trails their fingers in still water and speaks the opening syllable of the listening prayer. \
The water's surface shows not a reflection but the true names of things in the vicinity — \
written in ripple-patterns that form and dissolve too quickly to fully read. \
One name holds slightly longer than the others: whatever in the area is hidden, \
the water has noted it and named the thing it is covering.`,
    },
    {
      verb: 'Transform',
      noun: 'Stone',
      title: 'Renamed Matter',
      description: `Holding the stone in both hands, the mage speaks its true name, then speaks the true name of what they want it to become. \
There is a moment of resistance — two names briefly occupying the same space — \
then the stone settles into its new identity as if it had always been that and had simply forgotten. \
The transformation is permanent; the original stone is not lost but genuinely revised.`,
    },
  ],
};

const PACT: ParadigmTemplate = {
  id: 'pact',
  name: 'The Pacts',
  philosophy: `Every Pact mage made one choice freely: they entered a contract with something older, \
larger, and more patient than themselves. The entity on the other side of the agreement \
is not evil by nature — it simply operates by a logic that does not include human flourishing \
as a primary value. Power is extended; service is expected; the terms were clear at signing. \
The tradition teaches that Pact magic is not about control but about careful navigation: \
the power is real, the patron's attention is real, and the mage who mistakes one for the other \
will eventually find the contract called in at the least convenient moment.`,
  vocabularyRegister: `Cold, precise, and slightly transactional. Language should carry the weight of obligations. \
Use contractual imagery: "the terms", "what was owed", "the arrangement". \
Avoid warmth. Descriptions should feel as though each act of casting is a withdrawal from an account \
that the patron is watching. Favour words like "extended", "granted", "permitted", "due".`,
  forbiddenCombinations: [
    'Create + Spirit',
    'Protect + Void',
    'Grow + Faith',
    'Mend + Soul',
  ],
  examples: [
    {
      verb: 'Summon',
      noun: 'Spirit',
      title: 'Agent Dispatched',
      description: `The mage performs the compact-gesture — a specific fold of the hands the patron assigned at the pact's signing — \
and names the type of task. A presence enters the space: not the patron itself, \
but a fragment of its attention shaped into something useful for the purpose. \
It completes the task precisely as described and no further; extensions require new requests, \
and the patron notes the frequency of asking.`,
    },
    {
      verb: 'Perceive',
      noun: 'Shadow',
      title: "Patron's Eye Lent",
      description: `The mage borrows a fraction of the patron's perception for a moment — the entity's view of the world, \
which includes the hidden architecture of intent, deception, and power that human senses miss. \
What the mage sees is accurate and often disturbing. The patron sees, through the same loan, \
exactly what the mage chose to look at; the mage has, in using the ability, shown their hand.`,
    },
    {
      verb: 'Destroy',
      noun: 'Body',
      title: 'Debt Made Flesh',
      description: `The mage channels the patron's capacity for harm — a power far beyond what any study could produce — \
into a directed effect. The target feels the weight of something ancient briefly attending to them \
before the effect lands. The mage feels, afterward, that something was spent: \
not pain, but the sensation of a number being revised downward in a ledger they cannot read.`,
    },
  ],
};

const SHINTO: ParadigmTemplate = {
  id: 'shinto',
  name: 'The Way of the Kami',
  philosophy: `Every stone, every river, every old tree, every sword that has drawn blood has a spirit — a kami — \
that is not metaphor but neighbour. The kami are not gods in a remote, commanding sense; \
they are the animating presence of each thing, available for relationship if approached with proper respect. \
Practitioners of the Way do not cast or command; they ask, with correct ritual and genuine purity of intent. \
Pollution — spiritual, not merely physical — is the tradition's great enemy: \
a practitioner weighted with broken oaths, unacknowledged harm, or accumulated disrespect \
cannot hear the kami at all, because the kami have quietly stopped listening.`,
  vocabularyRegister: `Ceremonial, respectful, and grounded in the specific. Language should feel like a formal introduction \
between parties who take each other seriously. Reference the kami as "they" or by domain. \
Imagery of water, moss, old wood, specific places. Descriptions should feel patient and place-specific — \
not universal forces but this river, this grove, this stone.`,
  forbiddenCombinations: [
    'Destroy + Spirit',
    'Control + Spirit',
    'Silence + Water',
    'Bind + Nature',
  ],
  examples: [
    {
      verb: 'Reveal',
      noun: 'Spirit',
      title: 'Neighbors Seen',
      description: `After the purification ritual — hands washed, intent made clear through the small physical work of preparation — \
the practitioner opens their attention in the way they were taught: not searching, but making space. \
The kami of the place become perceptible: the stone kami as a quality of deliberate stillness, \
the water kami as a kind of amused attention, the tree kami as something that has been here longer \
than any problem the mage has brought.`,
    },
    {
      verb: 'Protect',
      noun: 'Body',
      title: 'Shrine-Blessing Given',
      description: `The practitioner presents the appropriate offerings to the shrine of the local protective kami — \
rice, salt, water, and a small honest account of what protection is needed and why. \
The kami does not appear or speak; there is only the shift of attention that the trained can feel. \
The protected person, for a time, moves through the world with slightly better luck than the circumstances warrant, \
as if the spirits of the place have quietly agreed to look after them.`,
    },
    {
      verb: 'Grow',
      noun: 'Plant',
      title: "Nature's Blessing Asked",
      description: `Kneeling at the edge of the field, the practitioner speaks the norito for the land-kami: \
a formal prayer that acknowledges the spirit's ownership of the soil and asks, politely and specifically, \
for the season's cooperation. The kami of the field does not respond in words. \
But the seedlings that go in this week will find the soil already loosened, already warm, \
as if the ground had been considering their arrival.`,
    },
  ],
};

const FERROMANCY: ParadigmTemplate = {
  id: 'ferromancy',
  name: 'Ferromancy',
  philosophy: `Ferromancy does not work with the world — it works through the body. \
Certain bloodlines carry the capacity to consume metals and burn them from within, \
converting mass into precisely-typed power. Every metal produces a specific, repeatable effect: \
steel pushes, iron pulls, tin sharpens the senses, pewter strengthens the flesh. \
There is no interpretation and no creativity in the paradigm, only precision and courage: \
an Iron-Puller who hesitates mid-flight is an Iron-Puller who falls. \
The tradition carries a particular pride — ferromancy requires no study, no spirit, no bargain. \
It only requires the blood, and the willingness to spend it.`,
  vocabularyRegister: `Physical, precise, and kinetic. Language should feel like movement — \
quick, controlled, with consequences. Use internal body sensation: "the burn", "the flare", \
"steel reserves dropping". Imagery of metal, momentum, force lines, the sound of coins leaving a hand. \
Descriptions should feel like a practitioner's inner monologue during a fight or action sequence.`,
  forbiddenCombinations: [
    'Create + Fire',
    'Reveal + Memory',
    'Bind + Spirit',
    'Grow + Plant',
  ],
  examples: [
    {
      verb: 'Enhance',
      noun: 'Body',
      title: 'Pewter Burning',
      description: `The mage ignites the pewter reserve — a familiar warmth spreading through the muscles from the stomach outward. \
Every physical system sharpens: fatigue recedes, a bruised rib stops mattering, \
the hands become steadier than they have any right to be. The enhancement is not subtle. \
When pewter is burning, the mage can feel their body being asked to do more than it was made for, \
and the metal being spent down with every second they demand it.`,
    },
    {
      verb: 'Control',
      noun: 'Metal',
      title: 'Steel Push',
      description: `The mage burns steel and feels the lines snap into existence — blue threads extending outward from their body \
to every piece of metal in range. Each line carries the potential energy of a push. \
Selecting the coin at their feet, they flare the steel briefly, and the coin leaves \
faster than any throw: a flat blur that carries the invested force exactly where the line pointed. \
The mage is pushed backward in equal measure; they were already braced for it.`,
    },
    {
      verb: 'Perceive',
      noun: 'Spirit',
      title: 'Tin Opened',
      description: `Burning tin is not comfortable. Every sense doubles and then doubles again: \
the conversation in the next room becomes as clear as the one happening here, \
the smell of the market separates into its forty components, the candlelight becomes almost painful. \
What the mage can do, in this state, is notice things that are not quite right about the world — \
the person whose footsteps are slightly too quiet, the object whose shadow falls at a slightly wrong angle. \
The world is full of information; tin makes ignoring it impossible.`,
    },
  ],
};

const LUNAR: ParadigmTemplate = {
  id: 'lunar',
  name: 'Lunar Magic',
  philosophy: `The moon does not illuminate — it reveals. Everything that was already present in the darkness \
becomes visible under moonlight, including things that prefer not to be seen. \
Lunar mages work with this quality of revelation-through-reflection: \
their power waxes when the moon is full and the world is most visible, \
wanes when the new moon shrouds everything in honest darkness. \
The tradition holds that the moon is not a body but a witness — \
impartial, cyclic, and utterly indifferent to what it shows. \
Practitioners learn to be comfortable with seeing clearly and being clearly seen.`,
  vocabularyRegister: `Silver, cyclical, and quietly unsettling. Language should feel like moonlight: \
cool, clear, revealing edges and shadows in equal measure. \
Avoid warmth; prefer words like "precise", "clear", "bare", "surfaces". \
Imagery of tides, silver light, transformation, the uncanny. \
Descriptions should feel like something being seen rather than something being done.`,
  forbiddenCombinations: [
    'Create + Sun',
    'Destroy + Night',
    'Silence + Tide',
    'Bind + Light',
  ],
  examples: [
    {
      verb: 'Reveal',
      noun: 'Shadow',
      title: 'Moonlit Clarity',
      description: `Under a full moon, the practitioner lifts their face and lets the light reach them completely — \
no hood, no avoidance. The quality of their perception shifts: shadows stop being absences \
and become presences. What was hidden in the dark of the alley or the forest edge \
takes on an outline, not from any additional light, but from a changed relationship to what the darkness holds. \
This is what is there. The mage simply agrees to see it.`,
    },
    {
      verb: 'Transform',
      noun: 'Body',
      title: 'Tide-Turn',
      description: `The mage drinks in a full night of moonlight — \
the slow, deliberate practice of letting the moon's cycle synchronise with the body's own rhythms. \
As the moon peaks, the body responds to its pull the way tidal water does: \
something shifts in the deep architecture of muscle and bone. \
The transformation is not dramatic and not permanent, but for the duration of the full moon, \
the body is slightly more than it was: faster, more resilient, more itself.`,
    },
    {
      verb: 'Control',
      noun: 'Water',
      title: 'Tidal Command',
      description: `The mage stands at the water's edge and attunes to the moon-pull — \
the gravitational conversation between satellite and ocean that has been ongoing since before any human watched it. \
For a short time, they can insert a request into that conversation: not a command, \
but an argument that the water finds locally convincing. \
A river can be slowed; a marsh can be encouraged to drain; rain can be asked, during a full moon, \
to reconsider its timing. The moon does not oppose the request. It simply requires the mage \
to understand the tidal logic well enough to reason within it.`,
    },
  ],
};

const SEASONAL: ParadigmTemplate = {
  id: 'seasonal',
  name: 'Seasonal Magic',
  philosophy: `The world does not change continuously — it changes in four large steps, \
each one a distinct mode of being rather than a point on a gradient. \
Seasonal mages align with the current mode and access the specific powers it makes available: \
spring's urgency, summer's surplus, autumn's ruthless clarification, winter's honest stillness. \
The tradition's central practice is acceptance: to be a spring mage in winter \
is to be in conflict with the world's current logic, and the world does not yield. \
Practitioners who resist the seasonal turn find their abilities dimming before the equinox arrives; \
those who accept — who become what the season demands — find themselves briefly capable of things \
that feel effortless because they are simply appropriate.`,
  vocabularyRegister: `Cyclical, earthy, and unsentimentally honest about the nature of each season. \
Spring: urgent, verdant, sometimes violent in its growth. \
Summer: abundant, hot, generous but careless. \
Autumn: precise, harvesting, letting go without grief. \
Winter: spare, stripped-back, clear. \
Use seasonal imagery specifically — not generic nature, but what is happening RIGHT NOW in the year's arc.`,
  forbiddenCombinations: [
    'Grow + Winter',
    'Destroy + Spring',
    'Silence + Summer',
    'Create + Frost',
  ],
  examples: [
    {
      verb: 'Grow',
      noun: 'Seed',
      title: 'Spring Urgency',
      description: `In the weeks when the frost has just released the ground, a Seasonal mage can give a seed \
the full force of spring's own momentum: the season is already pushing life upward, \
and the mage simply concentrates that push through a single point. \
The seed does not merely sprout — it commits. Root goes down in hours, stem extends with the tension \
of something that has been waiting all winter and has run out of patience.`,
    },
    {
      verb: 'Destroy',
      noun: 'Plant',
      title: "Autumn's Accounting",
      description: `The autumn mode is not cruelty — it is clarity. What has finished its purpose, the season releases. \
An autumn Seasonal mage can speak this release over a specific thing — \
the overgrown field that needs to be cleared, the tree that has been dying for two seasons. \
The thing does not die violently; it simply stops receiving the effort of continued existence. \
It completes. The mage feels nothing about this, which is how they know they have aligned correctly.`,
    },
    {
      verb: 'Protect',
      noun: 'Body',
      title: "Winter's Hardening",
      description: `In the deepest winter, when the world has stripped everything to what is essential, \
a Seasonal mage can extend that quality to a person: \
the warmth is not added from outside but found within, the cold made bearable \
not through resistance but through becoming what the season requires to survive it. \
The protected person finds they need less food, less warmth, less comfort — \
not because these have been taken, but because the season has taught them, briefly, \
what they actually require.`,
    },
  ],
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const PARADIGM_TEMPLATES: Record<string, ParadigmTemplate> = {
  emotional: EMOTIONAL,
  breath: BREATH,
  tethermancy: TETHERMANCY,
  dream: DREAM,
  craft: CRAFT,
  song: SONG,
  threshold: THRESHOLD,
  belief: BELIEF,
  rune: RUNE,
  blood: BLOOD,
  divine: DIVINE,
  names: NAMES,
  pact: PACT,
  shinto: SHINTO,
  ferromancy: FERROMANCY,
  lunar: LUNAR,
  seasonal: SEASONAL,
};

/**
 * Get the rich prompt template for a paradigm, or null if none is registered.
 */
export function getParadigmTemplate(paradigmId: string): ParadigmTemplate | null {
  return PARADIGM_TEMPLATES[paradigmId] ?? null;
}

/**
 * Format a ParadigmTemplate into a lore string suitable for the SpellSandboxPromptBuilder.
 *
 * Includes philosophy, vocabulary guidance, and calibration examples so the LLM
 * can match tone precisely.
 */
export function formatParadigmLore(template: ParadigmTemplate): string {
  const forbidden =
    template.forbiddenCombinations.length > 0
      ? `\n\nForbidden combinations in this tradition (impossible by paradigm rules): ${template.forbiddenCombinations.join(', ')}.`
      : '';

  const examples = template.examples
    .map(ex => `  - ${ex.verb} + ${ex.noun} → "${ex.title}": ${ex.description.slice(0, 120)}…`)
    .join('\n');

  return `${template.philosophy}

Vocabulary register: ${template.vocabularyRegister}${forbidden}

Calibration examples (match this tone):
${examples}`;
}
