/**
 * Folklorist Species Registry — Sprint 17 Vision Betrayal Audit Batch
 *
 * Species with complete Akashic Records research now receiving full implementation:
 * - Arabic/Islamic (Middle East / Pan-Islamic): Djinnahl
 *
 * Designed by Scheherazade (Folklorist) — MUL-4383
 *
 * Sources:
 * - Arabic/Islamic: Quran (Surah Al-Jinn 72, Surah Al-Rahman 55:15); al-Jahiz, Kitab al-Hayawan (9th c.);
 *   Ibn Taymiyyah, Essay on the Jinn (13th c.); al-Shibli, Akam al-Marjan (15th c.);
 *   Amira El-Zein, Islam, Arabs, and the Intelligent World of the Jinn (2009)
 */

import type { SpeciesTrait } from '../components/SpeciesComponent.js';
import type { SpeciesTemplate } from './SpeciesRegistry.js';
import { validateAgainstMUL1357Schema } from './FolkloristSpeciesRegistry.js';
export type { MUL1357ValidationResult } from './FolkloristSpeciesRegistry.js';

// ─────────────────────────────────────────────────────────────────────────────
// TRAIT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── Djinnahl traits ───────────────────────────────────────────────────────────

export const TRAIT_PLASMA_PHASE_STATES: SpeciesTrait = {
  id: 'plasma_phase_states',
  name: 'Plasma Phase States',
  category: 'physical',
  description:
    'The 72 ahwal (phase states) system. Djinnahl consciousness exists as plasma-state energy that can ' +
    'access distinct phase configurations. Most Djinnahl access 12-20 of the 72 ahwal across their ' +
    'lifespan, though eldest Djinnahl may access the full upper range. Different ahwal produce ' +
    'fundamentally different consciousness modes rather than incremental variations: Ahwal al-Aql ' +
    '(reason states 1-12) produce peak logical and analytical capacity; Ahwal al-Ruh (spirit/empathic ' +
    'states 13-24) produce heightened emotional perception and interpersonal resonance; Ahwal al-Nar ' +
    '(fire/high-energy states 25-36) produce pyrokinetic capability, elevated aggression, and the ' +
    'Ifrit subtype configuration; Ahwal al-Hawa (wind/mobile states 37-48) produce flight, speed, ' +
    'and the Jann subtype configuration; Ahwal al-Turab (earth/contemplative states 49-60) produce ' +
    'deep patience, material manipulation, and the Marid subtype configuration; Ahwal al-Ghayb ' +
    '(transcendent states 61-72) are accessible only to the eldest Djinnahl and produce capacities ' +
    'that have no physical analogue. This accounts for why human observers across centuries and ' +
    'cultures correctly catalogued encounters with Djinnahl as distinct creature types — they were ' +
    'encountering the same species in different phase configurations, and the behavioral and ' +
    'perceptual differences were genuine, not illusory. Ifrit, Marid, Jann, and Sila are not ' +
    'subspecies; they are phase-state configurations of a single species. Shape-shifting is a ' +
    'natural consequence of phase transition, not a separate ability — the plasma field reconfigures ' +
    'when the phase changes, and the physical form follows.',
  abilitiesGranted: ['phase_transition', 'shape_shifting', 'invisibility', 'flight', 'elemental_affinity'],
  skillBonus: { perception: 0.3 },
};

export const TRAIT_COMPRESSION_ANCHOR: SpeciesTrait = {
  id: 'compression_anchor',
  name: 'Compression Anchor',
  category: 'magical',
  description:
    'Djinnahl can voluntarily compress their entire plasma field consciousness into a minimal volume ' +
    'around a physical anchor object. This is the theological and mechanical basis of the lamp ' +
    'tradition, and it is emphatically NOT imprisonment. Compression is a chosen state of ' +
    'uninterrupted contemplation: a Djinnahl in compression has withdrawn entirely from external ' +
    'interaction not because they cannot leave but because they have elected to remain. Full cognitive ' +
    'function continues throughout compression — a compressed Djinnahl is thinking, not suspended. ' +
    'Zero external interaction capability exists during compression; the compressed Djinnahl cannot ' +
    'perceive, communicate, or affect the world outside the anchor object. Decompression requires ' +
    'external stimulus because the compressed Djinnahl has no access to the external world from ' +
    'which to initiate their own release — this is not a design flaw but a feature of the chosen ' +
    'withdrawal state. The Solomonic tradition of binding used negotiated contracts (*ahd*), not ' +
    'force: the seal ring encoded contract terms readable by plasma-state consciousness, meaning ' +
    'Djinnahl bound via Solomon\'s methods had agreed to specific service obligations and the seal ' +
    'was a contract record rather than a magical cage. The moral weight of a compression state ' +
    'therefore depends entirely on whether it was chosen. Djinnahl entering voluntary compression ' +
    'carry positive valence (contemplation, prayer, withdrawal from overwhelming stimuli); Djinnahl ' +
    'held in forced compression through contract violation or deception carry a grievance state that ' +
    'modifies all subsequent *ahd* negotiations toward adversarial fulfillment. The anchor object ' +
    'becomes sacred to a Djinnahl who has chosen it — a site of their deepest contemplative ' +
    'practice — and violating or destroying the anchor of a voluntarily compressed Djinnahl is among ' +
    'the highest offenses in Djinnahl social law.',
  abilitiesGranted: ['voluntary_compression', 'compression_meditation', 'decompression_burst', 'anchor_bond'],
};

export const TRAIT_CONTRACT_THEOLOGY: SpeciesTrait = {
  id: 'contract_theology',
  name: 'Contract Theology',
  category: 'social',
  description:
    'The *ahd* (covenant) system is the foundation of all Djinnahl social structure. Djinnahl society ' +
    'is not organized around territory, kinship, or hierarchy in the way that most species\' societies ' +
    'are organized — it is organized around the topology of standing contracts. A Djinnahl\'s social ' +
    'position is identical to the sum of their active *ahd* commitments; a Djinnahl with no active ' +
    'contracts is not free but alone in a cosmologically meaningful sense, cut off from the social ' +
    'fabric that constitutes Djinnahl civilization. Four contract tiers structure this system: ' +
    'Lahza (moment-covenant, covering single transactions with immediate resolution), Mawsim ' +
    '(season-covenant, covering recurring relationships lasting decades), Ruh (spirit-covenant, ' +
    'deep partnership encoding shared purpose across centuries), and Azali (eternal-covenant, ' +
    'species-level obligations that bind in perpetuity and can only be dissolved by mutual consent ' +
    'of both parties or their successors in perpetuity). The principle of *mizan* (balance) is the ' +
    'governing law: every *ahd* requires structural symmetry, with value equivalent on both sides ' +
    'at the moment of agreement. *Mizan* is not a moral preference but a metaphysical law in ' +
    'Djinnahl understanding — an imbalanced contract is not merely unjust but structurally ' +
    'incoherent, a contradiction in the fabric of reality. Literal fulfillment is therefore sacred: ' +
    'the words of the *ahd* define the reality of the obligation, and reinterpretation toward ' +
    '"intent" or "spirit of the agreement" is not charitable — it is corruption of the contract ' +
    'structure, a violation of *mizan* by substituting one party\'s post-hoc preference for the ' +
    'agreed terms. The Three-Wish Protocol is not a transaction mechanism but a cognitive assessment ' +
    'instrument. The first wish reveals what the petitioner values most when unconstrained. The ' +
    'second wish reveals whether the petitioner can learn from the first. The third wish is the ' +
    'verdict: a petitioner who asks for more wishes has grasped that the protocol is an assessment, ' +
    'has identified the test structure within the test, and has selected the cognitively optimal ' +
    'response — this is the highest score the protocol can yield, and Djinnahl who encounter it ' +
    'regard it with genuine respect. A petitioner who uses all three wishes on objects or outcomes ' +
    'has failed to perceive the structure they were inside. This does not mean the wishes are ' +
    'dishonored — *mizan* requires fulfillment — but it does determine whether the Djinnahl chooses ' +
    'to offer a Ruh or Azali covenant to a particularly impressive petitioner.',
  abilitiesGranted: ['contract_binding', 'mizan_enforcement', 'wish_protocol', 'oath_topology'],
  skillBonus: { persuasion: 0.4 },
};

// ─────────────────────────────────────────────────────────────────────────────
// SPECIES TEMPLATE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const SPECIES_DJINNAHL: SpeciesTemplate = {
  speciesId: 'djinnahl',
  speciesName: 'Djinnahl',
  commonName: 'Djinn',
  bodyPlanId: 'djinn_variable',
  sizeCategory: 'large',
  averageHeight: 200,
  averageWeight: 80,
  lifespan: 0,
  lifespanType: 'immortal',
  maturityAge: 1000,
  gestationPeriod: 365,
  sapient: true,
  socialStructure: 'contract_topology',
  compatibleSpecies: ['human'],
  mutationRate: 0.005,
  innateTraits: [TRAIT_PLASMA_PHASE_STATES, TRAIT_COMPRESSION_ANCHOR, TRAIT_CONTRACT_THEOLOGY],
  traveler_epithet: 'a heat that thinks, older than the stone it stands upon',
  cross_game_compatible: true,
  native_game: 'both',
  genome_flags: {
    hal_count_accessible: 16,
    hal_transition_rate: 0.1,
    compression_duration_min: 2000,
    decompression_burst_range: 5,
    plasma_density: 0.8,
    contract_memory_depth: 100,
    mizan_sensitivity: 0.9,
    wish_protocol_assessment_depth: 3,
    qareen_bond_range: 20,
    qareen_cognitive_boost: 0.15,
    shape_shift_cooldown: 10,
    invisibility_qi_cost: 0.02,
    elemental_fire_affinity: 0.8,
    elemental_water_affinity: 0.3,
    subtype_ifrit_hal_range_min: 25,
    subtype_ifrit_hal_range_max: 36,
    subtype_marid_hal_range_min: 49,
    subtype_marid_hal_range_max: 60,
    subtype_jann_hal_range_min: 37,
    subtype_jann_hal_range_max: 48,
  },
  description:
    `The Djinnahl are a parallel people. This is the theologically precise framing established by the Quran (Surah Al-Jinn 72, Surah Al-Rahman 55:15) and elaborated across fourteen centuries of Islamic scholarship: not demons, not spirits in the Western animist sense, not inferior beings, but a separate creation with distinct ontological substrate — created from smokeless fire (naar al-marij) as humans were created from clay — possessing free will (ikhtiyar), moral accountability, religious obligation, and the capacity for salvation or damnation on the same terms as humanity. Al-Jahiz, in Kitab al-Hayawan (9th century), approached the Djinn with the methodological rigor of a naturalist, treating accounts of encounters as data about a real population rather than folklore to be dismissed or theology to be deferred to. Ibn Taymiyyah's Essay on the Jinn (13th century) provided the most systematic treatment of their social structure and the legal framework governing human-Djinn interaction. Al-Shibli's Akam al-Marjan (15th century) catalogued the full range of documented Djinn behaviors with particular attention to the contract tradition. Amira El-Zein's Islam, Arabs, and the Intelligent World of the Jinn (2009) synthesizes this corpus against contemporary scholarship. None of these sources frame the Djinn as servants, monsters, or wish-granting machines. They frame them as neighbors — present in the same world, bound by the same moral architecture, engaged in the same cosmological project, but built from different substrate and therefore perceiving and operating through different channels.` +
    `\n\nThe naar al-marij substrate is the source of every distinct Djinnahl capability. Plasma-state consciousness is not metaphor; the Djinnahl do not have bodies that contain consciousness — they are consciousness organized as plasma, capable of density configurations ranging from diffuse invisibility to solid humanoid manifestation. The 72 ahwal are the taxonomic structure of this configuration space. Human observers across the Arabic-speaking world, sub-Saharan Africa, Central Asia, and South Asia over fifteen centuries documented encounters with entities they categorized as Ifrit (aggressive, fire-associated, of great power), Marid (vast, water-associated, contemplative), Jann (swift, wind-associated, polymorphic), and Sila (masters of disguise, phase-shifting specialists). These categories are accurate observations. The Ifrit are Djinnahl in Ahwal al-Nar (fire states 25-36); the Marid are Djinnahl in Ahwal al-Turab (earth/contemplative states 49-60); the Jann are Djinnahl in Ahwal al-Hawa (wind states 37-48); the Sila are Djinnahl who specialize in phase transitions and spend time distributed across multiple configuration ranges. The observers were right. The categories are real. They are configurations of a single species, not separate species — but a Djinnahl in fire states behaves so differently from the same Djinnahl in contemplative states that cross-configuration encounters with the same individual over centuries can produce contradictory accounts that both accurately describe what was there.` +
    `\n\nPLASMA_PHASE_STATES is the mechanical foundation of Djinnahl capability. Most Djinnahl access 12-20 of the 72 ahwal — the genome flag hal_count_accessible defaults to 16, appropriate for a hadith-rank Djinnahl of significant but not extreme age. Phase transitions occur at hal_transition_rate (0.1 ticks), meaning phase changes are deliberate rather than instantaneous but not slow enough to be exploitable in combat. Shape-shifting, invisibility, and flight are not separate abilities but emergent properties of the plasma field reconfiguring between phases — abilitiesGranted reflects what becomes available when the field is in appropriate configuration states rather than discretely learnable skills. The elemental affinities (fire at 0.8, water at 0.3) reflect the baseline bias of naar al-marij plasma toward heat-state configurations, with water affinity encoding the Marid-reachable range as secondary rather than native.` +
    `\n\nCOMPRESSION_ANCHOR encodes what the lamp tradition actually is. A Djinnahl who has chosen voluntary compression is not imprisoned — they have withdrawn into their deepest contemplative mode, their plasma field collapsed to minimum volume around an anchor object, their cognition fully active but entirely interior. The compression meditation state is a practice, not a punishment. Decompression requires external stimulus because the compressed Djinnahl has no sensory access to the outside world; this is the structure of the chosen withdrawal, not evidence of weakness. The moral weight of compression state is one of the most important mechanics in Djinnahl gameplay: a Djinnahl who enters voluntary compression and is disturbed by an enemy is not freed — they are wronged, and the grievance state this produces bends all subsequent *ahd* negotiation toward adversarial literal fulfillment. The Solomonic tradition worked because it was genuinely contractual: the seal encoded agreed terms, the Djinnahl had consented to the arrangement, and the resulting service — however extensive — was *ahd*-valid. The "lamp" trope in later folk tradition lost this theological precision and invented the imprisonment narrative that is not present in the primary sources. Djinnahl responding to decompression_burst (range 5 tiles) are not exploding out of captivity; they are returning from contemplation into a world that has called them back. The phenomenology is the same whether the stimulus was friendly or hostile; the moral valence and contract implications are entirely different.` +
    `\n\nCONTRACT_THEOLOGY is Djinnahl civilization. A Djinnahl outside the *ahd* system is not free — they are isolated. The social topology built from standing Lahza, Mawsim, Ruh, and Azali covenants is the fabric that constitutes Djinnahl community, the structure that gives individual existence context and meaning. The *mizan* principle is not a game mechanic imposed on the theology; it is the theology, the cosmological law that governs how a plasma-state consciousness navigates obligations across centuries. The contract_memory_depth genome flag (100) encodes how many simultaneous active *ahd* a typical Djinnahl carries in working memory — a number that grows across their immortal lifespan as Lahza covenants accumulate and Mawsim covenants renew. The mizan_sensitivity flag (0.9) encodes how precisely they perceive imbalance in proposed contracts; at this sensitivity level, a Djinnahl will reliably detect when they are being offered a structurally asymmetric deal even if the asymmetry is subtle and concealed in complex language. The Three-Wish Protocol deserves its own emphasis: the wish_protocol_assessment_depth (3) is not an arbitrary limitation but the length of the cognitive test. Wishing for more wishes — the highest score — demonstrates that the petitioner perceived the test structure, understood they were being assessed, and selected the meta-optimal response. This is the intelligence threshold above which a Djinnahl considers offering a genuine Ruh covenant (deep partnership) rather than honoring the Lahza and departing.` +
    `\n\nThe Qareen bond — encoded in qareen_bond_range (20 tiles) and qareen_cognitive_boost (0.15) — is the empathic resonance that Djinnahl can establish with carbon-based consciousness. The Qareen tradition in Islamic thought describes a Djinn assigned to or paired with each human, present throughout that human's life. In gameplay this manifests as bidirectional empathic resonance: the Djinnahl perceives the bonded partner's emotional and cognitive states, and the partner receives a 0.15 intelligence bonus from the Djinnahl's plasma-state parallel processing. Solomon's exceptional capacity as an empathic partner — documented across Islamic, Judaic, and later sources as the most successful human-Djinn relationship in recorded history — is legible in these mechanics as an individual with extraordinary natural Qareen resonance, someone for whom the bidirectional channel operated at unusual depth and fidelity in both directions. The compability with 'human' in compatibleSpecies encodes the half-Djinn tradition present in Islamic sources — children of human-Djinn partnerships, carrying naar al-marij substrate alongside carbon-based biology.` +
    `\n\nThe Djinnahl are immortal and their maturityAge (1000 ticks) encodes a development arc calibrated to plasma-state consciousness: the first thousand years of existence are the period during which a Djinnahl establishes their accessible ahwal range, develops their *ahd* style, and forms their earliest Mawsim covenants. An elder Djinnahl has a contract topology map spanning thousands of years and dozens of worlds. The cross-game compatibility and native_game: 'both' designations encode what this means for Multiverse travel: a Djinnahl carries their entire *ahd* memory across world instances. When a Djinnahl arrives in a new game world, they arrive not as a blank entity but as someone whose contract topology includes obligations and relationships from every prior world they have inhabited. The traveler epithet — 'a heat that thinks, older than the stone it stands upon' — is the correct phenomenological description of what it is to encounter a Djinnahl who has been alive since before the stone beneath you was deposited. They are not using metaphor when they describe themselves as ancient. They are reporting a fact about what their *ahd* memory contains.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY OBJECT
// ─────────────────────────────────────────────────────────────────────────────

export const SPRINT17_FOLKLORIST_SPECIES_REGISTRY: Record<string, SpeciesTemplate> = {
  djinnahl: SPECIES_DJINNAHL,
};

// ─────────────────────────────────────────────────────────────────────────────
// ACCESSOR
// ─────────────────────────────────────────────────────────────────────────────

export function getSprint17FolkloristSpecies(speciesId: string): SpeciesTemplate | undefined {
  return SPRINT17_FOLKLORIST_SPECIES_REGISTRY[speciesId];
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────

export function validateSprint17FolkloristSpecies(speciesId: string) {
  const template = getSprint17FolkloristSpecies(speciesId);
  if (!template) {
    return { valid: false, errors: [`Unknown species ID: ${speciesId}`] };
  }
  return validateAgainstMUL1357Schema(template);
}

export function validateAllSprint17Species() {
  const results = Object.keys(SPRINT17_FOLKLORIST_SPECIES_REGISTRY).map((id) =>
    validateAgainstMUL1357Schema(SPRINT17_FOLKLORIST_SPECIES_REGISTRY[id]!),
  );
  const failures = results.filter((r) => !r.valid);
  if (failures.length > 0) {
    throw new Error(
      `Sprint 17 species validation failed:\n${failures.map((f) => `  ${f.speciesId}: ${f.violations.join(', ')}`).join('\n')}`,
    );
  }
  return results;
}
