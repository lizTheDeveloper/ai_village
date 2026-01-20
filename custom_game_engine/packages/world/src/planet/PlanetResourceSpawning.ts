/**
 * Planet Resource Spawning Configuration
 *
 * Defines which resources spawn on which planet types for era progression gating.
 * Resources are categorized by rarity:
 * - Common: 70-100% spawn chance, basic mining tech
 * - Rare: 30-60% spawn chance, advanced extraction required
 * - Exotic: 5-20% spawn chance, specialized technology needed
 *
 * Era 10+ advancement requires discovering specific resources:
 * - Era 10 (Interplanetary): helium_3, metallic_hydrogen, platinum_iridium
 * - Era 11 (Interstellar): void_essence, strange_matter, degenerate_matter
 * - Era 12 (Transgalactic): timeline_fragment, probability_dust, reality_thread
 *
 * See: packages/core/src/systems/TechnologyEraSystem.ts
 */

import type { PlanetType } from './PlanetTypes.js';

/**
 * Resource spawning configuration for a planet type
 */
export interface PlanetResourceConfig {
  common: Record<string, number>;
  rare: Record<string, number>;
  exotic: Record<string, number>;
}

/**
 * Get resource spawning configuration for a planet type
 */
export function getPlanetResourceSpawning(planetType: PlanetType): PlanetResourceConfig {
  switch (planetType) {
    // ========== Rocky/Terrestrial Worlds ==========

    case 'terrestrial':
      // Earth-like: balanced resources
      return {
        common: {
          iron: 0.9,
          copper: 0.8,
          water: 1.0,
          silicon: 0.85,
        },
        rare: {
          rare_earth_metals: 0.5,
          uranium: 0.3,
          thorium: 0.4,
        },
        exotic: {
          mana_crystals: 0.1, // If magic exists
        },
      };

    case 'super_earth':
      // High gravity, dense core
      return {
        common: {
          heavy_metals: 0.95,
          iron: 1.0,
          nickel: 0.9,
        },
        rare: {
          platinum_group_metals: 0.6,
          iridium: 0.5,
          osmium: 0.4,
        },
        exotic: {
          gravitonium: 0.15, // High gravity exotic
        },
      };

    case 'desert':
      // Mars-like: iron oxide, subsurface water
      return {
        common: {
          iron_oxide: 0.95,
          silicon: 0.9,
          perchlorate_salts: 0.8,
        },
        rare: {
          subsurface_ice: 0.4,
          rare_earth_oxides: 0.5,
        },
        exotic: {
          martian_fossils: 0.05, // Ancient microbial life?
        },
      };

    case 'ice':
      // Europa/Enceladus: water ice, subsurface ocean
      return {
        common: {
          water_ice: 1.0,
          ammonia_ice: 0.8,
          methane_clathrates: 0.7,
        },
        rare: {
          deuterium_ice: 0.6,
          organic_compounds: 0.5,
          subsurface_minerals: 0.4,
        },
        exotic: {
          cryolife_samples: 0.08, // Subsurface life
          quantum_ice: 0.1,
        },
      };

    case 'ocean':
      // Global ocean: water worlds
      return {
        common: {
          water: 1.0,
          dissolved_minerals: 0.9,
          salt: 0.95,
        },
        rare: {
          heavy_water: 0.4,
          bio_gel: 0.5,
          deep_sea_minerals: 0.6,
        },
        exotic: {
          liquid_mana: 0.02, // Magic-conditional
          abyssal_crystals: 0.12,
        },
      };

    case 'volcanic':
      // Io-like: extreme volcanism
      return {
        common: {
          sulfur: 0.95,
          silicon_dioxide: 0.9,
          volcanic_glass: 0.85,
        },
        rare: {
          tungsten: 0.4,
          molten_iridium: 0.3,
          geothermal_catalysts: 0.5,
        },
        exotic: {
          neutronium_precursor: 0.1,
          magma_crystals: 0.15,
        },
      };

    case 'carbon':
      // Carbon-rich: graphite, diamond
      return {
        common: {
          graphite: 0.95,
          silicon_carbide: 0.9,
          carbon_nanotubes: 0.8,
        },
        rare: {
          diamond: 0.6,
          fullerenes: 0.5,
          carbyne: 0.4,
        },
        exotic: {
          quantum_graphene: 0.12,
          hyperdiamond: 0.08,
        },
      };

    case 'iron':
      // Metallic world: Mercury-like
      return {
        common: {
          iron: 1.0,
          nickel: 0.95,
          cobalt: 0.85,
        },
        rare: {
          platinum: 0.5,
          gold: 0.45,
          mercury_metal: 0.6,
        },
        exotic: {
          metallic_hydrogen_traces: 0.1,
          ferrofluid_crystals: 0.15,
        },
      };

    // ========== Atmospheric/Exotic Worlds ==========

    case 'tidally_locked':
      // Eyeball planet: twilight ring habitable
      return {
        common: {
          twilight_minerals: 0.8,
          frozen_volatiles: 0.9,
          scorched_metals: 0.85,
        },
        rare: {
          temperature_gradient_crystals: 0.5,
          perpetual_ice: 0.4,
        },
        exotic: {
          tidally_locked_exotics: 0.1,
        },
      };

    case 'hycean':
      // Hydrogen atmosphere ocean world
      return {
        common: {
          hydrogen_compounds: 0.95,
          water: 0.9,
          methane: 0.85,
        },
        rare: {
          ammonia: 0.6,
          high_pressure_ice: 0.5,
          metallic_hydrogen: 0.4, // **ERA 10 GATED**
        },
        exotic: {
          supercritical_water: 0.15,
          hydrogen_metal_alloys: 0.1,
        },
      };

    case 'rogue':
      // Starless world: internal heat only
      return {
        common: {
          radioactive_ores: 0.9,
          frozen_atmosphere: 0.95,
          cryogenic_minerals: 0.85,
        },
        rare: {
          uranium_235: 0.6,
          plutonium: 0.4,
          geothermal_vents: 0.5,
        },
        exotic: {
          dark_matter_traces: 0.08,
          void_touched_minerals: 0.12,
        },
      };

    case 'gas_dwarf':
      // Mini-Neptune: hydrogen/helium atmosphere
      return {
        common: {
          hydrogen: 1.0,
          helium: 0.95,
          methane: 0.8,
        },
        rare: {
          helium_3: 0.4, // **ERA 10 GATED**
          deuterium: 0.6,
          ammonia_clouds: 0.5,
        },
        exotic: {
          superconducting_gases: 0.1,
          jovian_crystals: 0.12,
        },
      };

    case 'moon':
      // Planetary satellite: low gravity, thin atmosphere
      return {
        common: {
          regolith: 0.95,
          silicates: 0.9,
          impact_glass: 0.8,
        },
        rare: {
          helium_3: 0.5, // **ERA 10 GATED** (from solar wind)
          rare_earth_deposits: 0.4,
          subsurface_ice: 0.6,
        },
        exotic: {
          lunar_crystals: 0.1,
          tidal_resonance_minerals: 0.08,
        },
      };

    // ========== Fantasy/Alien Worlds ==========

    case 'magical':
      // Arcane realm: floating islands, mana
      return {
        common: {
          mana_shards: 0.9,
          arcane_minerals: 0.85,
          ley_line_crystals: 0.8,
        },
        rare: {
          refined_mana: 0.6,
          elemental_essences: 0.5,
          reality_anchors: 0.4,
        },
        exotic: {
          pure_mana_cores: 0.15,
          dimensional_fragments: 0.1,
          reality_thread: 0.05, // **ERA 12 GATED**
        },
      };

    case 'corrupted':
      // Dark lands: twisted, dangerous
      return {
        common: {
          corrupted_stone: 0.95,
          dark_matter: 0.8,
          twisted_minerals: 0.85,
        },
        rare: {
          void_crystals: 0.5,
          eldritch_metals: 0.4,
          nightmare_fuel: 0.3,
        },
        exotic: {
          void_essence: 0.12, // **ERA 11 GATED**
          corruption_cores: 0.1,
          reality_tears: 0.08,
        },
      };

    case 'fungal':
      // Alien biosphere: giant fungi
      return {
        common: {
          mycelium_fibers: 0.95,
          spore_deposits: 0.9,
          fungal_wood: 0.85,
        },
        rare: {
          bioluminescent_caps: 0.6,
          enzyme_catalysts: 0.5,
          alien_proteins: 0.4,
        },
        exotic: {
          psilocybin_crystals: 0.15,
          neural_network_fungi: 0.1,
          consciousness_spores: 0.08,
        },
      };

    case 'crystal':
      // Crystalline world: silicon-based life?
      return {
        common: {
          raw_crystal: 1.0,
          quartz_formations: 0.9,
          silicon_dioxide: 0.95,
        },
        rare: {
          stellarite: 0.5,
          prismatic_shards: 0.3,
          resonance_crystals: 0.4,
        },
        exotic: {
          quantum_lattice: 0.05,
          hyperconductor_crystals: 0.1,
          living_crystal: 0.08,
        },
      };

    default:
      // Fallback: basic resources only
      return {
        common: {
          rock: 0.9,
          minerals: 0.8,
        },
        rare: {},
        exotic: {},
      };
  }
}

/**
 * Get all era-gated resources across all planet types
 * Used by TechnologyEraSystem to check advancement requirements
 */
export function getEraGatedResources(): Record<number, string[]> {
  return {
    9: [], // Fusion - no special gated resources
    10: ['helium_3', 'metallic_hydrogen', 'platinum_iridium'], // Interplanetary
    11: ['void_essence', 'strange_matter', 'degenerate_matter'], // Interstellar
    12: ['timeline_fragment', 'probability_dust', 'reality_thread'], // Transgalactic
    13: ['singularity_core', 'quantum_entanglement_matrix'], // Post-Singularity
  };
}

/**
 * Check if a resource is era-gated
 */
export function isEraGatedResource(resourceType: string): boolean {
  const gatedResources = Object.values(getEraGatedResources()).flat();
  return gatedResources.includes(resourceType);
}

/**
 * Get the era requirement for a resource
 * Returns null if not era-gated
 */
export function getResourceEraRequirement(resourceType: string): number | null {
  const eraResources = getEraGatedResources();

  for (const [era, resources] of Object.entries(eraResources)) {
    if (resources.includes(resourceType)) {
      return parseInt(era, 10);
    }
  }

  return null;
}
