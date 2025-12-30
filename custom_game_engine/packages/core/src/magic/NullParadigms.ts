/**
 * NullParadigms - Anti-magic, dead magic, and magic-nullifying systems
 *
 * Not all universes have magic, and some actively suppress it.
 * This module defines paradigms for:
 *
 * 1. Null Magic - Magic simply doesn't exist
 * 2. Dead Magic - Magic once existed but is gone
 * 3. Anti-Magic - Magic is actively suppressed/negated
 * 4. Inverted Magic - Magic works backwards
 * 5. Technological Supremacy - Tech replaces/blocks magic
 * 6. Mundane Rationality - Magic is impossible by physical law
 */

import type { MagicParadigm } from './MagicParadigm.js';

// ============================================================================
// Null Paradigms
// ============================================================================

/**
 * Null Magic - Magic simply does not exist in this universe.
 * There is no magical energy, no supernatural forces, nothing.
 * Visiting mages find their powers simply... don't work.
 */
export const NULL_PARADIGM: MagicParadigm = {
  id: 'null',
  name: 'Null Magic',
  description: 'Magic does not exist in this universe',
  universeIds: ['mundane_earth', 'hard_scifi'],

  lore: `This universe operates on purely physical laws. There is no mana, no
spirits, no supernatural forces of any kind. Magic is not suppressed or
forbidden - it simply does not exist, has never existed, and cannot exist.
Visitors from magical universes find their powers inert, like muscles
that have nothing to push against.`,

  sources: [],  // No sources - magic doesn't exist
  costs: [],
  channels: [],

  laws: [
    {
      id: 'nonexistence',
      name: 'Magic Does Not Exist',
      type: 'conservation',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'There is no magical energy in this universe to manipulate',
    },
  ],

  risks: [],  // No magic, no risks

  acquisitionMethods: [],  // Cannot acquire what doesn't exist

  availableTechniques: [],
  availableForms: [],

  powerScaling: 'linear',
  powerCeiling: 0,
  allowsGroupCasting: false,
  allowsEnchantment: false,
  persistsAfterDeath: false,
  allowsTeaching: false,
  allowsScrolls: false,

  foreignMagicPolicy: 'incompatible',
  foreignMagicEffect: {
    effect: 'fails',
    powerModifier: 0,
  },
};

/**
 * Dead Magic - Magic once existed but has been depleted/destroyed.
 * The infrastructure for magic remains, but there's no power.
 * Like a car with no fuel - the engine exists but won't run.
 */
export const DEAD_PARADIGM: MagicParadigm = {
  id: 'dead',
  name: 'Dead Magic',
  description: 'Magic once existed but has been exhausted or destroyed',
  universeIds: ['fallen_realms', 'post_apocalypse_magic'],

  lore: `Once, this universe blazed with magical power. Wizards shaped reality,
gods walked among mortals, and wonders were commonplace. Then came the
Depletion - whether through overuse, catastrophe, or cosmic entropy, the
magic simply... ran out. Ancient artifacts still exist but lie dormant.
Spellbooks contain valid formulas for power that no longer flows. The
channels are there, but the river has run dry.`,

  sources: [
    {
      id: 'depleted_mana',
      name: 'Depleted Mana',
      type: 'ambient',
      regeneration: 'none',
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'undetectable',
      description: 'The faintest trace of what once was - not enough to use',
    },
  ],

  costs: [],
  channels: [],  // Channels exist but are useless

  laws: [
    {
      id: 'depletion',
      name: 'The Depletion',
      type: 'entropy',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'The magical energy of this universe has been exhausted',
    },
    {
      id: 'memory',
      name: 'Magical Memory',
      type: 'conservation',
      strictness: 'weak',
      canBeCircumvented: true,
      circumventionCostMultiplier: 100,
      description: 'Traces of old magic can sometimes be rekindled, at great cost',
    },
  ],

  risks: [],

  acquisitionMethods: [
    {
      method: 'study',
      rarity: 'legendary',
      voluntary: true,
      prerequisites: ['ancient_texts', 'external_power_source'],
      grantsAccess: ['depleted_mana'],
      startingProficiency: 1,
      description: 'Study the old ways, though they grant almost nothing',
    },
  ],

  availableTechniques: ['perceive'],  // Can sense the absence
  availableForms: [],

  powerScaling: 'linear',
  powerCeiling: 5,  // Trace amounts at best
  allowsGroupCasting: false,
  allowsEnchantment: false,
  persistsAfterDeath: true,  // Ancient enchantments still exist, dormant
  allowsTeaching: true,  // Can teach the theory
  allowsScrolls: true,  // Old scrolls exist, just don't work

  foreignMagicPolicy: 'absorbs',  // Foreign magic is quickly drained
  foreignMagicEffect: {
    effect: 'weakened',
    powerModifier: 0.1,
  },
};

/**
 * Anti-Magic - Active force that suppresses/negates magic.
 * Magic exists but is actively countered by something in this universe.
 * Spells fizzle, enchantments break, magical beings weaken.
 */
export const ANTI_PARADIGM: MagicParadigm = {
  id: 'anti',
  name: 'Anti-Magic',
  description: 'An active force suppresses and negates all magic',
  universeIds: ['nullification_zone', 'anti_magic_sphere'],

  lore: `Something in this universe actively hates magic. Perhaps it's the
background radiation, perhaps an ancient curse, perhaps the fundamental
physics. Whatever the cause, magic is not merely absent but actively
suppressed. Spells unravel. Enchantments decay. Magical beings feel
constant pressure, their power draining away. Some say the Anti is
itself a form of magic - the magic of negation.`,

  sources: [
    {
      id: 'anti_force',
      name: 'The Anti',
      type: 'ambient',
      regeneration: 'passive',
      regenRate: -0.1,  // Negative! It drains magic
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'obvious',
      description: 'The force that negates all magic',
    },
  ],

  costs: [
    {
      type: 'health',  // Magic use actively damages you here
      canBeTerminal: true,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'obvious',
    },
  ],

  channels: [],

  laws: [
    {
      id: 'negation',
      name: 'Active Negation',
      type: 'paradox',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'All magic is actively suppressed by the Anti',
    },
    {
      id: 'drain',
      name: 'Constant Drain',
      type: 'entropy',
      strictness: 'strong',
      canBeCircumvented: true,
      circumventionCostMultiplier: 5,
      description: 'Magical beings and items constantly lose power',
    },
  ],

  risks: [
    { trigger: 'overuse', consequence: 'burnout', severity: 'severe', probability: 0.5, mitigatable: false,
      description: 'Forcing magic against the Anti can permanently burn out your abilities' },
    { trigger: 'attention', consequence: 'backlash', severity: 'moderate', probability: 0.8, mitigatable: false,
      description: 'The Anti notices and punishes magic use' },
  ],

  acquisitionMethods: [],  // Cannot acquire magic here

  availableTechniques: [],
  availableForms: [],

  powerScaling: 'linear',
  powerCeiling: 10,  // Can force through, but barely
  allowsGroupCasting: false,
  allowsEnchantment: false,
  persistsAfterDeath: false,
  allowsTeaching: false,
  allowsScrolls: false,

  foreignMagicPolicy: 'hostile',
  foreignMagicEffect: {
    effect: 'backfires',
    powerModifier: -0.5,  // Negative - magic hurts the caster
  },
};

/**
 * Inverted Magic - Magic works backwards.
 * Healing spells harm, fire creates cold, protection curses.
 * Mages from normal universes are extremely dangerous here - to themselves.
 */
export const INVERTED_PARADIGM: MagicParadigm = {
  id: 'inverted',
  name: 'Inverted Magic',
  description: 'Magic works, but all effects are reversed',
  universeIds: ['mirror_realm', 'backwards_dimension'],

  lore: `In the Inverted Realms, magic flows backwards. A fireball spell creates
a sphere of absolute cold. A healing touch inflicts wounds. A curse of
weakness grants strength. Native mages learn to think in reversals -
they cast harm to help, destruction to create. Visitors from normal
magical universes face a terrible learning curve, often killing those
they try to save.`,

  sources: [
    {
      id: 'inverted_mana',
      name: 'Inverted Mana',
      type: 'internal',
      regeneration: 'rest',
      regenRate: 0.01,
      storable: true,
      transferable: true,
      stealable: true,
      detectability: 'subtle',
      description: 'Mana that flows in reverse',
    },
  ],

  costs: [
    {
      type: 'mana',
      canBeTerminal: false,
      cumulative: false,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'hidden',
    },
  ],

  channels: [
    { type: 'verbal', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting' },
    { type: 'somatic', requirement: 'required', canBeMastered: true, blockEffect: 'reduces_power' },
  ],

  laws: [
    {
      id: 'inversion',
      name: 'The Great Inversion',
      type: 'paradox',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'All magical effects produce their opposite result',
    },
    {
      id: 'double_negative',
      name: 'Double Negative',
      type: 'balance',
      strictness: 'strong',
      canBeCircumvented: false,
      description: 'To achieve a positive effect, cast a negative spell',
    },
  ],

  risks: [
    { trigger: 'failure', consequence: 'target_swap', severity: 'moderate', probability: 0.3, mitigatable: true,
      description: 'Inverted magic is confusing - wrong targets are common' },
  ],

  acquisitionMethods: [
    {
      method: 'study',
      rarity: 'common',
      voluntary: true,
      grantsAccess: ['inverted_mana'],
      startingProficiency: 5,
      description: 'Learn to think backwards',
    },
  ],

  availableTechniques: ['create', 'destroy', 'transform', 'perceive', 'control', 'protect', 'enhance'],
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'mind', 'spirit', 'plant', 'animal', 'image'],

  powerScaling: 'linear',
  powerCeiling: 100,
  allowsGroupCasting: true,
  allowsEnchantment: true,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: true,

  foreignMagicPolicy: 'transforms',
  foreignMagicEffect: {
    effect: 'transforms',
    powerModifier: 1.0,
    transformsInto: 'inverted',  // Foreign magic becomes inverted
  },
};

/**
 * Technological Supremacy - Technology actively blocks/replaces magic.
 * Magic is possible but technology creates interference fields.
 * More tech = less magic. Sci-fi universes often have this.
 */
export const TECH_SUPREMACY_PARADIGM: MagicParadigm = {
  id: 'tech_supremacy',
  name: 'Technological Supremacy',
  description: 'Technology creates fields that suppress magic',
  universeIds: ['cyberpunk', 'hard_scifi_lite'],

  lore: `In highly technological universes, the very infrastructure of civilization
creates a blanket of interference that magic cannot penetrate. Electronics
emit fields that disrupt mana. Cities are dead zones. Only in the
wilderness, far from power lines and satellites, can magic still function.
Some theorize that technology is simply "crystallized" magic, and using
tech exhausts the local magical potential.`,

  sources: [
    {
      id: 'residual_mana',
      name: 'Residual Mana',
      type: 'ambient',
      regeneration: 'none',
      storable: true,
      transferable: true,
      stealable: false,
      detectability: 'undetectable',
      description: 'Weak magical energy found in areas without technology',
    },
  ],

  costs: [
    {
      type: 'mana',
      canBeTerminal: false,
      cumulative: false,
      recoverable: true,
      recoveryMethod: 'ritual',  // Must get away from tech
      visibility: 'hidden',
    },
  ],

  channels: [
    { type: 'verbal', requirement: 'optional', canBeMastered: true, blockEffect: 'no_effect' },
    { type: 'meditation', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
  ],

  laws: [
    {
      id: 'tech_interference',
      name: 'Technological Interference',
      type: 'paradox',
      strictness: 'strong',
      canBeCircumvented: true,
      circumventionCostMultiplier: 3,
      description: 'Technology within 100m reduces magic power by 90%',
    },
    {
      id: 'faraday_effect',
      name: 'Faraday Effect',
      type: 'iron_vulnerability',
      strictness: 'strong',
      canBeCircumvented: true,
      description: 'Electronic devices act like cold iron to magic',
    },
  ],

  risks: [
    { trigger: 'failure', consequence: 'mishap', severity: 'minor', probability: 0.4, mitigatable: true,
      description: 'Tech interference causes unpredictable spell failure' },
  ],

  acquisitionMethods: [
    {
      method: 'meditation',
      rarity: 'rare',
      voluntary: true,
      prerequisites: ['wilderness_retreat'],
      grantsAccess: ['residual_mana'],
      startingProficiency: 10,
      description: 'Learn magic far from civilization',
    },
  ],

  availableTechniques: ['perceive', 'enhance', 'protect'],
  availableForms: ['body', 'mind', 'plant', 'animal'],

  powerScaling: 'logarithmic',
  powerCeiling: 30,  // Very limited power
  allowsGroupCasting: true,
  allowsEnchantment: false,  // Tech destroys enchantments
  persistsAfterDeath: false,
  allowsTeaching: true,
  allowsScrolls: false,  // Paper near electronics degrades

  foreignMagicPolicy: 'incompatible',
  foreignMagicEffect: {
    effect: 'weakened',
    powerModifier: 0.1,
  },
};

/**
 * Mundane Rationality - Magic is simply impossible by physical law.
 * Unlike Null (where magic doesn't exist), here magic CAN'T exist.
 * The laws of physics actively prevent supernatural phenomena.
 */
export const RATIONAL_PARADIGM: MagicParadigm = {
  id: 'rational',
  name: 'Mundane Rationality',
  description: 'Physical laws make magic impossible',
  universeIds: ['rationalist_earth', 'hpmor_verse'],

  lore: `In this universe, the laws of physics are not merely descriptions but
prescriptions. Conservation of energy is absolute. Causality is inviolable.
There is no "outside" from which supernatural forces could come. Magic
doesn't fail here - it's not that spells don't work, it's that the very
concept of a spell is as meaningful as dividing by zero. Visiting mages
don't lose their power; they find that "power" was never coherent.`,

  sources: [],
  costs: [],
  channels: [],

  laws: [
    {
      id: 'thermodynamics',
      name: 'Thermodynamic Law',
      type: 'conservation',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Energy cannot be created from nothing',
    },
    {
      id: 'causality',
      name: 'Causal Closure',
      type: 'balance',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Every effect has a physical cause',
    },
    {
      id: 'naturalism',
      name: 'Methodological Naturalism',
      type: 'paradox',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'There is nothing supernatural',
    },
  ],

  risks: [],

  acquisitionMethods: [],

  availableTechniques: [],
  availableForms: [],

  powerScaling: 'linear',
  powerCeiling: 0,
  allowsGroupCasting: false,
  allowsEnchantment: false,
  persistsAfterDeath: false,
  allowsTeaching: false,
  allowsScrolls: false,

  foreignMagicPolicy: 'incompatible',
  foreignMagicEffect: {
    effect: 'fails',
    powerModifier: 0,
  },
};

/**
 * Sealed Magic - Magic exists but is locked away/forbidden.
 * The potential is there, but accessing it is blocked.
 * Could be unsealed under certain conditions.
 */
export const SEALED_PARADIGM: MagicParadigm = {
  id: 'sealed',
  name: 'Sealed Magic',
  description: 'Magic exists but has been sealed away by ancient powers',
  universeIds: ['sealed_realms', 'forgotten_magic'],

  lore: `Long ago, the gods (or ancient mages, or cosmic forces) sealed away magic.
Perhaps it was too dangerous. Perhaps a great war necessitated it. Perhaps
it was a punishment. Whatever the reason, magic exists in potential but
cannot be accessed. The seals can be seen by those with the gift - great
barriers across the sky, chains wrapped around every soul. Breaking the
seals would release magic, but at what cost?`,

  sources: [
    {
      id: 'sealed_power',
      name: 'Sealed Power',
      type: 'ambient',
      regeneration: 'none',
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'subtle',
      description: 'Power that exists but cannot be touched',
    },
  ],

  costs: [],
  channels: [],

  laws: [
    {
      id: 'the_seal',
      name: 'The Great Seal',
      type: 'threshold',
      strictness: 'absolute',
      canBeCircumvented: true,  // Can break the seal...
      circumventionCostMultiplier: 1000,  // But at tremendous cost
      violationConsequence: 'Breaking the seal may unleash something worse than no magic',
      description: 'Magic is locked behind an ancient seal',
    },
  ],

  risks: [
    { trigger: 'overreach', consequence: 'attention_gained', severity: 'catastrophic', probability: 1.0, mitigatable: false,
      description: 'The entities that created the seal notice attempts to break it' },
  ],

  acquisitionMethods: [
    {
      method: 'awakening',
      rarity: 'legendary',
      voluntary: false,
      grantsAccess: ['sealed_power'],
      startingProficiency: 0,  // Can sense the seal, nothing more
      description: 'Become aware of the seals',
    },
  ],

  availableTechniques: ['perceive'],  // Can only perceive the seal
  availableForms: ['spirit', 'void'],

  powerScaling: 'threshold',
  powerCeiling: 1,  // Almost nothing
  allowsGroupCasting: false,
  allowsEnchantment: false,
  persistsAfterDeath: true,  // The seal persists
  allowsTeaching: true,  // Can teach about the seal
  allowsScrolls: true,  // Ancient texts about the sealing

  foreignMagicPolicy: 'transforms',
  foreignMagicEffect: {
    effect: 'fails',  // Sealed away
    powerModifier: 0,
  },
};

/**
 * Divine Prohibition - Gods have forbidden magic and enforce the ban.
 * Magic WORKS here, but using it brings divine wrath.
 * Angels, inquisitors, or the gods themselves hunt magic users.
 */
export const DIVINE_PROHIBITION_PARADIGM: MagicParadigm = {
  id: 'divine_prohibition',
  name: 'Divine Prohibition',
  description: 'Magic works but is forbidden by the gods who actively hunt practitioners',
  universeIds: ['theocratic_realms', 'inquisition_worlds'],

  lore: `The gods of this universe have declared magic an abomination. Not because
it doesn't work - it works quite well - but because they view it as theft
of divine power, or corruption of the natural order, or simply a threat to
their authority. The Inquisition enforces their will. Angels descend to
smite practitioners. Divine surveillance is everywhere. Some still practice
in secret, but the cost of discovery is not merely death, but eternal damnation.`,

  sources: [
    {
      id: 'forbidden_mana',
      name: 'Forbidden Power',
      type: 'internal',
      regeneration: 'rest',
      regenRate: 0.01,
      storable: true,
      transferable: true,
      stealable: false,
      detectability: 'beacon',  // GODS CAN SEE IT
      description: 'Mana that screams your heresy to the heavens',
    },
  ],

  costs: [
    {
      type: 'mana',
      canBeTerminal: false,
      cumulative: false,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'hidden',
    },
    {
      type: 'attention',  // Divine attention
      canBeTerminal: true,  // Enough attention = smiting
      cumulative: true,  // Each spell adds to your damnation
      recoverable: false,  // The gods never forget
      visibility: 'hidden',
    },
  ],

  channels: [
    { type: 'verbal', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting' },
    { type: 'somatic', requirement: 'required', canBeMastered: true, blockEffect: 'reduces_power' },
  ],

  laws: [
    {
      id: 'divine_ban',
      name: 'The Divine Prohibition',
      type: 'oath_binding',
      strictness: 'absolute',
      canBeCircumvented: false,
      violationConsequence: 'Divine hunters dispatched, soul marked for damnation',
      description: 'The gods have forbidden magic and enforce their decree',
    },
    {
      id: 'omniscience',
      name: 'Divine Surveillance',
      type: 'witness',
      strictness: 'strong',
      canBeCircumvented: true,
      circumventionCostMultiplier: 5,
      description: 'The gods can see magic use anywhere, anytime',
    },
  ],

  risks: [
    { trigger: 'attention', consequence: 'attention_gained', severity: 'catastrophic', probability: 0.9, mitigatable: true,
      description: 'The gods notice your heresy and dispatch hunters' },
    { trigger: 'overuse', consequence: 'paradox_spirit', severity: 'catastrophic', probability: 0.7, mitigatable: false,
      description: 'An angel descends to smite you personally' },
    { trigger: 'failure', consequence: 'permanent_mark', severity: 'severe', probability: 0.5, mitigatable: false,
      description: 'Failed spells leave visible marks that the Inquisition can detect' },
  ],

  acquisitionMethods: [
    {
      method: 'study',
      rarity: 'rare',
      voluntary: true,
      prerequisites: ['forbidden_texts', 'death_wish'],
      grantsAccess: ['forbidden_mana'],
      startingProficiency: 15,
      description: 'Study the forbidden arts at great personal risk',
    },
    {
      method: 'bloodline',
      rarity: 'uncommon',
      voluntary: false,
      grantsAccess: ['forbidden_mana'],
      startingProficiency: 20,
      description: 'Born with the curse of magical blood - a crime of existence',
    },
  ],

  availableTechniques: ['create', 'destroy', 'transform', 'perceive', 'control', 'protect', 'enhance'],
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'mind', 'spirit', 'plant', 'animal', 'image'],

  powerScaling: 'linear',
  powerCeiling: 100,  // Magic works fully
  allowsGroupCasting: true,  // But groups are easier to find
  groupCastingMultiplier: 1.5,
  allowsEnchantment: true,  // But enchanted items are evidence
  persistsAfterDeath: true,
  allowsTeaching: true,  // Secret covens
  allowsScrolls: true,  // Heretical texts

  foreignMagicPolicy: 'compatible',  // Magic works fine, it's just forbidden
  foreignMagicEffect: {
    effect: 'works_normally',
    powerModifier: 1.0,
  },
};

/**
 * Divine Monopoly - Only the gods may use magic.
 * Magic exists, but only deities can wield it.
 * Mortals simply lack the capacity, not the permission.
 */
export const DIVINE_MONOPOLY_PARADIGM: MagicParadigm = {
  id: 'divine_monopoly',
  name: 'Divine Monopoly',
  description: 'Only gods can use magic - mortals are physically incapable',
  universeIds: ['olympian_realms', 'god_realms'],

  lore: `In this universe, magic is not a skill to be learned but a property of
divinity. Only beings of sufficient cosmic significance can manipulate
magical forces. Mortals can witness miracles, receive blessings, and be
affected by magic, but they cannot generate it themselves. It would be
like trying to metabolize sunlight - you simply lack the organ for it.
The gods are not hoarding magic; mortals genuinely cannot use it.`,

  sources: [
    {
      id: 'divinity',
      name: 'Divine Essence',
      type: 'divine',
      regeneration: 'passive',
      regenRate: 0.1,
      storable: false,
      transferable: false,  // Cannot give away your godhood
      stealable: false,
      detectability: 'beacon',
      description: 'The power that only gods possess',
    },
  ],

  costs: [
    {
      type: 'karma',  // Divine actions have consequences
      canBeTerminal: false,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'time',
      visibility: 'hidden',
    },
  ],

  channels: [
    { type: 'will', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
  ],

  laws: [
    {
      id: 'divine_exclusivity',
      name: 'Divine Exclusivity',
      type: 'threshold',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Only beings of divine rank can access magical power',
    },
    {
      id: 'mortal_incapacity',
      name: 'Mortal Incapacity',
      type: 'conservation',
      strictness: 'absolute',
      canBeCircumvented: true,  // Ascension is possible
      circumventionCostMultiplier: Infinity,  // But the cost is becoming a god
      description: 'Mortals lack the fundamental capacity for magic',
    },
  ],

  risks: [],  // Gods don't face mortal risks

  acquisitionMethods: [
    {
      method: 'ascension',
      rarity: 'legendary',
      voluntary: true,
      prerequisites: ['mortal_transcendence', 'divine_spark'],
      grantsAccess: ['divinity'],
      startingProficiency: 50,
      description: 'Ascend to godhood and gain the power that comes with it',
    },
    {
      method: 'born',
      rarity: 'legendary',
      voluntary: false,
      prerequisites: ['divine_parentage'],
      grantsAccess: ['divinity'],
      startingProficiency: 80,
      description: 'Born as a god or demigod',
    },
  ],

  availableTechniques: ['create', 'destroy', 'transform', 'perceive', 'control', 'protect', 'enhance', 'summon'],
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'mind', 'spirit', 'plant', 'animal', 'image', 'void', 'time', 'space'],

  powerScaling: 'threshold',  // Divine ranks
  powerCeiling: undefined,  // Gods have no limit
  allowsGroupCasting: true,
  groupCastingMultiplier: 2.0,
  allowsEnchantment: true,  // Divine artifacts
  persistsAfterDeath: true,  // Gods don't really die
  allowsTeaching: false,  // Cannot teach divinity
  allowsScrolls: false,

  foreignMagicPolicy: 'compatible',
};

// ============================================================================
// Registry
// ============================================================================

export const NULL_PARADIGM_REGISTRY: Record<string, MagicParadigm> = {
  null: NULL_PARADIGM,
  dead: DEAD_PARADIGM,
  anti: ANTI_PARADIGM,
  inverted: INVERTED_PARADIGM,
  tech_supremacy: TECH_SUPREMACY_PARADIGM,
  rational: RATIONAL_PARADIGM,
  sealed: SEALED_PARADIGM,
  divine_prohibition: DIVINE_PROHIBITION_PARADIGM,
  divine_monopoly: DIVINE_MONOPOLY_PARADIGM,
};

/**
 * Check if a paradigm is a null/anti-magic type.
 */
export function isNullParadigm(paradigmId: string): boolean {
  return paradigmId in NULL_PARADIGM_REGISTRY;
}

/**
 * Check if magic can function at all in a paradigm.
 */
export function canMagicFunction(paradigmId: string): boolean {
  const nullParadigm = NULL_PARADIGM_REGISTRY[paradigmId];
  if (!nullParadigm) return true;  // Not a null paradigm, magic works

  return (nullParadigm.powerCeiling ?? 0) > 0;
}
