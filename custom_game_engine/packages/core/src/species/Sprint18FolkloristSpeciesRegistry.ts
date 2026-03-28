/**
 * Folklorist Species Registry — Sprint 18 Vision Betrayal Audit Batch
 *
 * Species with complete Akashic Records research now receiving full implementation:
 * - Japanese (Pan-Japanese): Kappa
 *
 * Designed by Scheherazade (Folklorist) — MUL-4384
 *
 * Sources:
 * - Japanese: Toriyama Sekien, Gazu Hyakki Yagyō (1776); Akutagawa Ryūnosuke, Kappa (1927)
 * - Scholarly: Michael Dylan Foster, Pandemonium and Parade (2009); Noriko Reider, Japanese Demon Lore (2010)
 * - Regional variants: Kanto (Kappa proper), Kyushu (Garappa, Hyōsube), Tohoku (Medochi), Western Honshū (Enkō)
 */

import type { SpeciesTrait } from '../components/SpeciesComponent.js';
import type { SpeciesTemplate } from './SpeciesRegistry.js';
import { validateAgainstMUL1357Schema } from './FolkloristSpeciesRegistry.js';
export type { MUL1357ValidationResult } from './FolkloristSpeciesRegistry.js';

// ─────────────────────────────────────────────────────────────────────────────
// TRAIT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── Kappa traits ─────────────────────────────────────────────────────────────

export const TRAIT_SARA_WATER_DISH: SpeciesTrait = {
  id: 'sara_water_dish',
  name: 'Sara Water Dish',
  category: 'physical',
  description:
    'The cranial depression (sara) filled with water from the Kappa\'s home waterway — simultaneously ' +
    'the source of the Kappa\'s supernatural strength and its most critical vulnerability. The sara ' +
    'water is chemically bonded to a specific water system\'s mineral signature; water from a different ' +
    'source causes disorientation and power loss. A full sara means a confident, dangerous Kappa at ' +
    'peak capability. A depleted sara means a weakened creature moving with rigid, compensatory ' +
    'stillness to prevent further spillage. The sara enforces the Kappa\'s honor code biologically: ' +
    'a Kappa who violates a compact finds the sara water clouding, losing potency — dishonor is ' +
    'self-poisoning. The water level functions as a visible health indicator: bioluminescent ' +
    'microorganisms from the home water produce a faint blue-green glow when full, dimming as the ' +
    'level drops. Returning a bow tilts the sara and risks spillage, making the honor-compelled bow ' +
    'after sumo the most dangerous moment in Kappa social protocol. The Kappa accepts this risk ' +
    'because honor requires vulnerability.',
  abilitiesGranted: ['sara_maintenance', 'water_refill_requirement', 'bioluminescent_indicator'],
  vulnerabilities: ['bow_vulnerability', 'sara_spillage', 'displacement_weakness'],
  skillBonus: { perception: 0.2 },
};

export const TRAIT_HONOR_COMPULSION: SpeciesTrait = {
  id: 'honor_compulsion',
  name: 'Honor Compulsion',
  category: 'social',
  description:
    'The Kappa\'s honor code is not cultural — it is biological. A neural compulsion embedded in the ' +
    'Kappa\'s architecture that makes oath-keeping, bow-returning, and promise-fulfillment involuntary. ' +
    'No god binds the Kappa; no spell constrains it. The honor is internal. A Kappa cannot choose to ' +
    'be dishonorable any more than it can choose to breathe air instead of water. This makes the ' +
    'Kappa\'s honor both more tragic and more reliable than contractual systems: there are no loopholes ' +
    'because there is no contract, only the Kappa\'s own nature. Violation attempts trigger sara water ' +
    'clouding (self-poisoning) as a biological enforcement mechanism. The compulsion extends to sumo ' +
    'challenges — when presented with the formal stance (shiko) and invitation (te-awase), the Kappa\'s ' +
    'neural pathways fire a compulsory engagement response. An intelligent opponent can exploit this to ' +
    'force a match at an inopportune time. The Kappa know this about themselves and accept it with the ' +
    'resignation of a condition of being.',
  abilitiesGranted: ['sumo_challenge_compulsion', 'honor_contract_binding', 'covenant_tracking'],
  vulnerabilities: ['compulsory_sumo_engagement', 'politeness_weaponization'],
  skillBonus: { social: 0.3 },
};

export const TRAIT_SUMO_MASTERY: SpeciesTrait = {
  id: 'sumo_mastery',
  name: 'Sumo Mastery',
  category: 'physical',
  description:
    'Wrestling as universal protocol. The Kappa\'s body plan — stocky, wide-hipped, low center of ' +
    'gravity, short powerful limbs, broad shoulders — is the sumo wrestler\'s frame compressed into ' +
    'a child-sized body. This is not cultural; it is biological. Sumo is how Kappa negotiate, ' +
    'arbitrate, bond, and teach. The ritual follows strict form: shiko (foot-stamp announcing ' +
    'intent), te-awase (palms-forward formal challenge), grappling within a defined ring, and the ' +
    'concluding bow (rei). Stakes are binding — a defeated Kappa owes a gift (bone-setting knowledge, ' +
    'hydraulic expertise, safe passage); a defeated opponent owes a favor (cucumber offerings, water ' +
    'maintenance, territorial respect). A draw establishes mutual respect and free territorial access. ' +
    'The sumo match is the knowledge-gating mechanic: certain skills (bone-setting, fluid dynamics) ' +
    'can only be learned through defeating a Kappa in honest contest.',
  abilitiesGranted: ['sumo_grappling', 'weight_advantage', 'territory_claim_through_victory'],
  skillBonus: { combat: 0.4, strength: 0.2 },
};

export const TRAIT_CUCUMBER_CHEMOSENSORY: SpeciesTrait = {
  id: 'cucumber_chemosensory',
  name: 'Cucumber Chemosensory',
  category: 'sensory',
  description:
    'The cucumber compact (kyūri-no-chigiri) is the medium of inter-species diplomacy between Kappa ' +
    'and land-dwelling communities. Cucumbers inscribed with names and placed at the upstream boundary ' +
    'of a Kappa\'s territory constitute a contract: the Kappa consumes the cucumber, literally ' +
    'ingesting the identities of the protected individuals, and for one growing cycle those named ' +
    'individuals may use the waterway without predation risk. The Kappa detects the home-water mineral ' +
    'signature in the cucumber — cucumbers grown with water from the Kappa\'s own system are the most ' +
    'potent offering, creating a feedback loop where the community uses the Kappa\'s water to grow ' +
    'the protection that buys safe passage through the Kappa\'s water. On the generation ship, ' +
    'hydroponics bays growing cucumbers near Kappa-controlled water systems maintain standing compacts. ' +
    'Communities without compacts are unprotected: drowning accidents increase, equipment goes missing, ' +
    'water quality degrades as the Kappa withholds its immune-system function.',
  abilitiesGranted: ['cucumber_detection', 'safe_passage_recognition', 'compact_registration'],
  skillBonus: { perception: 0.3 },
};

export const TRAIT_BIOENERGETIC_PARASITISM: SpeciesTrait = {
  id: 'bioenergetic_parasitism',
  name: 'Bioenergetic Parasitism',
  category: 'metabolic',
  description:
    'The Kappa feeds on unregistered individuals in its home water through water-conductivity — a ' +
    'bioenergetic extraction that drains vitality from those who have not entered the cucumber compact. ' +
    'This is the biological basis of the traditional shirikodama extraction, reinterpreted through the ' +
    'game\'s cosmology as energy parasitism rather than organ theft. The feeding is passive and ' +
    'automatic: unregistered beings in the Kappa\'s water lose energy at a low constant rate, ' +
    'experienced as fatigue and disorientation. Registered individuals (those whose names have been ' +
    'ingested via cucumber compact) are immune — the Kappa\'s system recognizes them as part of the ' +
    'water ecology rather than intruders. This creates the core territorial dynamic: the Kappa is the ' +
    'river\'s immune system, and the cucumber compact is the vaccination.',
  abilitiesGranted: ['water_parasitism', 'energy_extraction', 'compact_immunity_check'],
  needsModifier: { hunger: 0.5 },
};

// ─────────────────────────────────────────────────────────────────────────────
// SPECIES TEMPLATE DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export const SPECIES_KAPPA: SpeciesTemplate = {
  speciesId: 'kappa',
  speciesName: 'Kappa',
  commonName: 'River Child',
  bodyPlanId: 'amphibious_humanoid_small',
  sizeCategory: 'small',
  averageHeight: 115,
  averageWeight: 40,
  lifespan: 0,
  lifespanType: 'ageless',
  maturityAge: 50,
  gestationPeriod: 0,
  sapient: true,
  socialStructure: 'solitary_territorial',
  compatibleSpecies: [],
  mutationRate: 0.001,
  innateTraits: [
    TRAIT_SARA_WATER_DISH,
    TRAIT_HONOR_COMPULSION,
    TRAIT_SUMO_MASTERY,
    TRAIT_CUCUMBER_CHEMOSENSORY,
    TRAIT_BIOENERGETIC_PARASITISM,
  ],
  traveler_epithet:
    'a small green thing that cannot refuse a bow and drinks from the water you drink from',
  cross_game_compatible: true,
  native_game: 'both',
  genome_flags: {
    // Sara mechanics
    sara_full_capacity: 1.0,
    sara_spillage_per_bow: 0.15,
    sara_refill_requirement_interval: 200,
    sara_clouding_on_dishonor: 0.3,
    sara_bioluminescence_threshold: 0.4,

    // Territory & water
    water_territory_radius: 50,
    water_mineral_signature_tolerance: 0.1,
    displacement_strength_penalty: 0.3,
    displacement_attunement_ticks: 5000,

    // Sumo mechanics
    sumo_compulsion_trigger_range: 10,
    sumo_strength_bonus: 0.4,
    sumo_ring_radius: 3,

    // Cucumber compact
    cucumber_scent_detection_range: 20,
    safe_passage_duration_per_cucumber: 300,
    compact_max_registrations: 50,

    // Bioenergetic parasitism
    unregistered_feed_rate: 0.02,
    registered_feed_disabled: true,

    // Bone-setting knowledge gate
    bone_setting_teach_requires_sumo_defeat: true,
    knowledge_transfer_duration: 50,

    // Water dependency
    air_breathing_duration: 30,
    air_damage_per_tick: 0.05,
    submersion_heal_rate: 0.03,
  },
  description:
    `The Kappa (河童, "river child") is one of the most extensively documented yōkai in Japanese ` +
    `folklore — a small, amphibious humanoid that claims sovereignty over stretches of waterway and ` +
    `enforces that claim through a combination of supernatural strength, bioenergetic parasitism, and ` +
    `an honor code so absolute it functions as both power and vulnerability. The Kappa appears across ` +
    `every region of Japan, every century, and every medium from Edo-period woodblock prints to modern ` +
    `warning signs at swimming areas. Regional variants — the bestial Garappa of Kyushu, the otter-like ` +
    `Medochi of Tohoku, the monkey-like Enkō of western Honshū — are real morphological adaptations to ` +
    `different water systems, not folklore inconsistencies. On the generation ship Urd, this variation ` +
    `continues: reservoir Kappa are larger and more territorial, hydroponics-channel Kappa are smaller ` +
    `and more willing to trade knowledge for cucumber offerings, and water-recycling Kappa adapted to ` +
    `industrial chemistry are the most alien and dangerous of all.` +
    `\n\nThe sara — the shallow depression atop the Kappa's skull filled with water from its home ` +
    `waterway — is the defining feature of the species. It is simultaneously a power source, a health ` +
    `indicator, and a vulnerability. The water is chemically bonded to a specific water system's mineral ` +
    `signature; a Kappa displaced from its home system is weakened until it can return or attune to a ` +
    `new source over many years. The sara enforces the Kappa's honor code biologically: a Kappa who ` +
    `violates a compact finds the sara water clouding and losing potency. Dishonor is literally ` +
    `self-poisoning. The bioluminescent microorganisms in the sara water produce a faint blue-green ` +
    `glow when the dish is full — the Kappa at maximum power has a visible halo. As the water level ` +
    `drops, the glow dims, and the Kappa's movements become rigid and careful as it compensates to ` +
    `prevent further loss. An empty sara means a dying Kappa: grey-green skin cracking, curled and ` +
    `barely moving.` +
    `\n\nThe sumo tradition (kappa-zumō) is the universal protocol. The Kappa's body plan — stocky, ` +
    `wide-hipped, low center of gravity, a wrestler's frame in a child-sized body — is built for ` +
    `grappling. Sumo is how Kappa negotiate, arbitrate, bond, and teach. The ritual is formalized: ` +
    `shiko (foot-stamp), te-awase (palms-forward invitation), grappling within a ring defined by the ` +
    `stamps, and the concluding bow. The stakes are binding. A defeated Kappa owes knowledge — ` +
    `bone-setting techniques, hydraulic expertise, safe passage. A defeated opponent owes respect — ` +
    `cucumber offerings, water maintenance, territorial deference. The compulsion to accept a challenge ` +
    `is biological, not cultural. When presented with the formal stance, the Kappa's neural pathways ` +
    `fire a compulsory engagement response. An intelligent opponent can exploit this. The Kappa know ` +
    `this about themselves and accept it as a condition of being.` +
    `\n\nThe cucumber compact (kyūri-no-chigiri) is the diplomacy of the waterway. Communities inscribe ` +
    `cucumbers with the names of those who will use the water, place them at the upstream boundary, and ` +
    `the Kappa consumes them — literally ingesting the identities of the protected individuals. For one ` +
    `growing cycle, the named may use the waterway safely. Cucumbers grown with water from the Kappa's ` +
    `own system are the most potent offering, creating a feedback loop: the community uses the Kappa's ` +
    `water to grow the cucumbers that buy safe passage through the Kappa's water. Without the compact, ` +
    `the Kappa's immune-system function for the river is withheld. Drowning accidents increase. ` +
    `Equipment vanishes. The water itself degrades.` +
    `\n\nThe Kappa occupies a rare mythological niche: the honor-bound predator. It is dangerous because ` +
    `it is powerful, and it is vulnerable because it is honest, and it cannot be one without being the ` +
    `other. The player who understands this understands the Kappa completely. Population on Urd is ` +
    `naturally sparse — 30 to 50 individuals, each bound to a distinct water system. They are not ` +
    `endangered; they are naturally sparse. A river does not need two guardians.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY OBJECT
// ─────────────────────────────────────────────────────────────────────────────

export const SPRINT18_FOLKLORIST_SPECIES_REGISTRY: Record<string, SpeciesTemplate> = {
  kappa: SPECIES_KAPPA,
};

// ─────────────────────────────────────────────────────────────────────────────
// ACCESSOR
// ─────────────────────────────────────────────────────────────────────────────

export function getSprint18FolkloristSpecies(speciesId: string): SpeciesTemplate | undefined {
  return SPRINT18_FOLKLORIST_SPECIES_REGISTRY[speciesId];
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────

export function validateSprint18FolkloristSpecies(speciesId: string) {
  const template = getSprint18FolkloristSpecies(speciesId);
  if (!template) {
    return { valid: false, errors: [`Unknown species ID: ${speciesId}`] };
  }
  return validateAgainstMUL1357Schema(template);
}

export function validateAllSprint18Species() {
  const results = Object.keys(SPRINT18_FOLKLORIST_SPECIES_REGISTRY).map((id) =>
    validateAgainstMUL1357Schema(SPRINT18_FOLKLORIST_SPECIES_REGISTRY[id]!),
  );
  const failures = results.filter((r) => !r.valid);
  if (failures.length > 0) {
    throw new Error(
      `Sprint 18 species validation failed:\n${failures.map((f) => `  ${f.speciesId}: ${f.violations.join(', ')}`).join('\n')}`,
    );
  }
  return results;
}
