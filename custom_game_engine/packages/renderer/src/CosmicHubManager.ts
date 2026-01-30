/**
 * CosmicHubManager - Orchestrates the cosmic creation flow
 *
 * Manages the transition between screens:
 * 1. CosmicHubScreen - Main menu showing universes, planets
 * 2. UniverseCreationScreen - Create universe (magic laws + cosmic deities)
 * 3. PlanetCreationScreen - Create planet within a universe
 * 4. Game Start - "Become a Deity" triggers actual game initialization
 */

import { CosmicHubScreen, UniverseInfo, PlanetInfo, CosmicHubCallbacks } from './CosmicHubScreen.js';
import { UniverseCreationScreen, CreatedUniverseConfig } from './UniverseCreationScreen.js';
import { PlanetCreationScreen, PlanetConfig, PlanetCreationCallbacks } from './PlanetCreationScreen.js';
import type { MagicSpectrumConfig } from '@ai-village/magic';

/**
 * Get a human-readable name for a magic spectrum configuration
 */
function getMagicPresetName(spectrum: MagicSpectrumConfig): string {
  // Create a descriptive name based on intensity and sources
  const intensityNames: Record<string, string> = {
    null: 'No Magic',
    rare: 'Low Magic',
    low: 'Subtle Magic',
    medium: 'Balanced Magic',
    high: 'High Magic',
    reality_is_magic: 'Pure Magic',
  };

  const sourcesStr = spectrum.sources
    .filter(s => s !== 'none')
    .slice(0, 2)
    .join('+');

  const intensityName = intensityNames[spectrum.intensity] || spectrum.intensity;
  return sourcesStr ? `${intensityName} (${sourcesStr})` : intensityName;
}

export interface GameStartConfig {
  universe: CreatedUniverseConfig;
  planet: PlanetConfig;
}

export interface CosmicHubManagerOptions {
  /** Callback to load existing universes from storage */
  loadUniverses: () => Promise<CreatedUniverseConfig[]>;
  /** Callback to load planets for a universe from storage */
  loadPlanets: (universeId: string) => Promise<PlanetConfig[]>;
  /** Callback to save a new universe */
  saveUniverse: (config: CreatedUniverseConfig) => Promise<void>;
  /** Callback to save a new planet */
  savePlanet: (config: PlanetConfig) => Promise<void>;
}

/**
 * Manages the cosmic creation flow and returns the final game configuration
 */
export class CosmicHubManager {
  private hubScreen: CosmicHubScreen | null = null;
  private universeScreen: UniverseCreationScreen | null = null;
  private planetScreen: PlanetCreationScreen | null = null;

  private universes: CreatedUniverseConfig[] = [];
  private planets: Map<string, PlanetConfig[]> = new Map();
  private options: CosmicHubManagerOptions;

  private resolveGameStart: ((config: GameStartConfig) => void) | null = null;

  constructor(options: CosmicHubManagerOptions) {
    this.options = options;
  }

  /**
   * Show the cosmic hub and wait for the user to select "Become a Deity"
   * Returns the configuration needed to start the game
   */
  async showAndWaitForGameStart(): Promise<GameStartConfig> {
    // Load existing data
    this.universes = await this.options.loadUniverses();
    for (const universe of this.universes) {
      const planets = await this.options.loadPlanets(universe.id);
      this.planets.set(universe.id, planets);
    }

    return new Promise<GameStartConfig>((resolve) => {
      this.resolveGameStart = resolve;
      this.showCosmicHub();
    });
  }

  private showCosmicHub(): void {
    const callbacks: CosmicHubCallbacks = {
      onCreateUniverse: () => this.showUniverseCreation(),
      onCreatePlanet: (universeId: string) => this.showPlanetCreation(universeId),
      onBecomeDeity: (planetId: string, universeId: string) => this.startGame(planetId, universeId),
      onLoadUniverse: async (universeId: string) => {
        const universe = this.universes.find(u => u.id === universeId);
        if (!universe) return null;
        return this.toUniverseInfo(universe);
      },
      onLoadPlanets: async (universeId: string) => {
        const planets = this.planets.get(universeId) || [];
        return planets.map(p => this.toPlanetInfo(p));
      },
    };

    this.hubScreen = new CosmicHubScreen('cosmic-hub-screen', callbacks);
    this.hubScreen.setUniverses(this.universes.map(u => this.toUniverseInfo(u)));
    this.hubScreen.show();
  }

  private showUniverseCreation(): void {
    this.hubScreen?.hide();

    this.universeScreen = new UniverseCreationScreen();
    this.universeScreen.show(async (config: CreatedUniverseConfig) => {
      // Save the new universe
      await this.options.saveUniverse(config);
      this.universes.push(config);
      this.planets.set(config.id, []);

      // Return to hub
      this.universeScreen?.hide();
      this.universeScreen = null;
      this.hubScreen?.setUniverses(this.universes.map(u => this.toUniverseInfo(u)));
      this.hubScreen?.show();
    });
  }

  private showPlanetCreation(universeId: string): void {
    this.hubScreen?.hide();

    const universe = this.universes.find(u => u.id === universeId);
    if (!universe) {
      console.error('[CosmicHubManager] Universe not found:', universeId);
      this.hubScreen?.show();
      return;
    }

    this.planetScreen = new PlanetCreationScreen();
    const callbacks: PlanetCreationCallbacks = {
      onCreatePlanet: async (config: PlanetConfig) => {
        // Save the new planet
        await this.options.savePlanet(config);
        const existingPlanets = this.planets.get(universeId) || [];
        existingPlanets.push(config);
        this.planets.set(universeId, existingPlanets);

        // Update universe planet count
        this.hubScreen?.setUniverses(this.universes.map(u => this.toUniverseInfo(u)));

        // Load planets and return to hub
        this.planetScreen?.hide();
        this.planetScreen = null;
        const planets = this.planets.get(universeId) || [];
        this.hubScreen?.setPlanets(planets.map(p => this.toPlanetInfo(p)));
        this.hubScreen?.show();
      },
      onCancel: () => {
        // Cancelled
        this.planetScreen?.hide();
        this.planetScreen = null;
        this.hubScreen?.show();
      },
    };
    this.planetScreen.show(universeId, universe.name, callbacks);
  }

  private startGame(planetId: string, universeId: string): void {
    const universe = this.universes.find(u => u.id === universeId);
    const planets = this.planets.get(universeId) || [];
    const planet = planets.find(p => p.id === planetId);

    if (!universe || !planet) {
      console.error('[CosmicHubManager] Failed to find universe/planet for game start');
      return;
    }

    // Clean up screens
    this.hubScreen?.hide();
    this.hubScreen = null;

    // Resolve the promise with the game configuration
    if (this.resolveGameStart) {
      this.resolveGameStart({ universe, planet });
      this.resolveGameStart = null;
    }
  }

  private toUniverseInfo(config: CreatedUniverseConfig): UniverseInfo {
    const planets = this.planets.get(config.id) || [];
    return {
      id: config.id,
      name: config.name,
      magicPreset: getMagicPresetName(config.magicSpectrum),
      createdAt: config.createdAt ?? config.seed, // Use createdAt if available, else seed
      planetCount: planets.length,
    };
  }

  private toPlanetInfo(config: PlanetConfig): PlanetInfo {
    return {
      id: config.id,
      universeId: config.universeId,
      name: config.name,
      type: config.type,
      artStyle: config.artStyle,
      hasBiosphere: config.generateBiosphere,
      speciesCount: config.maxSpecies || 0,
      createdAt: config.seed,
    };
  }

  /**
   * Clean up all screens
   */
  destroy(): void {
    this.hubScreen?.destroy();
    this.universeScreen?.destroy();
    this.planetScreen?.destroy();
    this.hubScreen = null;
    this.universeScreen = null;
    this.planetScreen = null;
  }
}

/**
 * Helper to create storage callbacks using localStorage
 * Can be replaced with IndexedDB or server storage
 */
export function createLocalStorageCallbacks(): CosmicHubManagerOptions {
  const UNIVERSES_KEY = 'cosmic_universes';
  const PLANETS_KEY = 'cosmic_planets';

  return {
    loadUniverses: async () => {
      try {
        const data = localStorage.getItem(UNIVERSES_KEY);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },
    loadPlanets: async (universeId: string) => {
      try {
        const data = localStorage.getItem(`${PLANETS_KEY}_${universeId}`);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },
    saveUniverse: async (config: CreatedUniverseConfig) => {
      try {
        const existing = localStorage.getItem(UNIVERSES_KEY);
        const universes: CreatedUniverseConfig[] = existing ? JSON.parse(existing) : [];
        universes.push(config);
        localStorage.setItem(UNIVERSES_KEY, JSON.stringify(universes));
      } catch (error) {
        console.error('[CosmicHubManager] Failed to save universe:', error);
      }
    },
    savePlanet: async (config: PlanetConfig) => {
      try {
        const key = `${PLANETS_KEY}_${config.universeId}`;
        const existing = localStorage.getItem(key);
        const planets: PlanetConfig[] = existing ? JSON.parse(existing) : [];
        planets.push(config);
        localStorage.setItem(key, JSON.stringify(planets));
      } catch (error) {
        console.error('[CosmicHubManager] Failed to save planet:', error);
      }
    },
  };
}
