/**
 * UniverseConfigScreen - Configure magic laws and universe settings
 *
 * First screen shown when creating a new universe. Player selects:
 * - Magic paradigm via Spectrum Configuration (determines which magic systems apply)
 * - Universe name (optional, can be LLM-generated)
 * - Other universe-level settings
 *
 * The selected configuration determines the universe ID via hash.
 * Universes with identical configurations share the same ID and can
 * have parallel timelines, while different configurations create
 * separate universes that can only connect via portals.
 */

import {
  // Paradigm Spectrum types and functions for spectrum-based magic selection
  type MagicSpectrumConfig,
  type MagicalIntensity,
  type MagicSourceOrigin,
  type MagicFormality,
  type AnimismLevel,
  type SpectrumEffects,
  SPECTRUM_PRESETS,
  getPreset,
  getPresetNames,
  resolveSpectrum,
  CONFIGURATION_QUESTIONS,
} from '@ai-village/magic';

export interface UniverseConfig {
  magicParadigmId: string | null;  // null = no magic (legacy, kept for compatibility)
  magicSpectrum?: MagicSpectrumConfig;  // Full spectrum configuration
  spectrumEffects?: SpectrumEffects;  // Resolved effects from spectrum
  planetType?: string;  // Selected planet type for homeworld
  planetId?: string;  // ID of existing planet from registry (if reusing)
  artStyle?: string;  // Console-era art style for sprites (snes, genesis, etc.)
  scenarioPresetId: string;  // The first memory / intro scenario
  customScenarioText?: string;  // Custom text when scenarioPresetId is 'custom'
  universeName?: string;
  seed?: number;
}

export interface ExistingPlanetInfo {
  id: string;
  name: string;
  type: string;
  hasBiosphere: boolean;
  chunkCount?: number;
  createdAt?: number;
}

export interface UniverseConfigScreenOptions {
  /** Skip planet selection step (planet will be selected via UniversePlanetsScreen) */
  skipPlanetStep?: boolean;
  /** Pre-selected planet type (if planet was already chosen) */
  preselectedPlanetType?: string;
  /** Pre-selected planet ID (if using existing planet from registry) */
  preselectedPlanetId?: string;
  /** Previously generated planets available for reuse */
  existingPlanets?: ExistingPlanetInfo[];
}

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: string;
  tags: string[];
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  { id: 'cooperative-survival', name: 'The Awakening', description: 'You all just woke up in this place together, with nothing but berries to survive. Work together and make a village!', preview: 'A fresh start. Build from nothing with your companions.', category: 'Cooperative', tags: ['building', 'teamwork', 'classic'] },
  { id: 'garden-abundance', name: 'Paradise Found', description: 'You awaken in a paradise of endless food, perfect weather, and natural shelter. There is no struggle here, only the question of what to create when survival is already assured.', preview: 'Unlimited resources. What will you build when you don\'t need to survive?', category: 'Cooperative', tags: ['peaceful', 'creative', 'no-conflict'] },
  { id: 'scientific-expedition', name: 'Research Mission', description: 'Welcome, research team. Your mission: catalog this new biome, establish sustainable operations, and report findings.', preview: 'A scientific expedition. Methodical exploration and documentation.', category: 'Cooperative', tags: ['science', 'exploration', 'organized'] },
  { id: 'hostile-wilderness', name: 'The Long Dark', description: 'You wake to find yourself stranded in a dangerous wilderness where the nights are deadly cold and strange creatures watch from the shadows.', preview: 'Hostile environment. Every decision matters for survival.', category: 'Survival', tags: ['harsh', 'danger', 'scarcity'] },
  { id: 'last-survivors', name: 'After the Fall', description: 'You are the last humans on Earth. The old world is ash and ruin. You have each other, your wits, and three days of food.', preview: 'Post-apocalyptic survival. Humanity\'s last hope.', category: 'Survival', tags: ['apocalypse', 'desperate', 'rebuilding'] },
  { id: 'amnesia-mystery', name: 'Forgotten Selves', description: 'You wake with no memory of who you are or how you got here. Strange artifacts lie scattered around you.', preview: 'Memory loss. Piece together the mystery of your past.', category: 'Mystery', tags: ['amnesia', 'mystery', 'discovery'] },
  { id: 'divine-experiment', name: 'The Garden', description: 'You awaken in the Garden, placed here by forces you don\'t understand. You have been given free will, intelligence, and a world to shape.', preview: 'Created by divine beings. Your choices define everything.', category: 'Divine', tags: ['divine', 'creation', 'purpose'] },
  { id: 'dream-realm', name: 'The Dreaming', description: 'Is this real? The colors are too vivid, the physics too loose, and sometimes you wake up somewhere you don\'t remember going.', preview: 'Reality is uncertain. Dreams blur with waking.', category: 'Surreal', tags: ['dream', 'surreal', 'uncertain'] },
];

// PresetParadigm interface kept for potential future use with individual paradigm selection
export interface PresetParadigm {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: string;
}

export class UniverseConfigScreen {
  private container: HTMLElement;
  private selectedPlanetType: string = 'terrestrial';
  private selectedPlanetId: string | undefined = undefined;
  private selectedArtStyle: string = 'snes';  // Default art style
  private selectedScenario: string = 'cooperative-survival';
  private customScenarioText: string = '';
  private currentStep: 'magic' | 'planet' | 'artstyle' | 'scenario' | 'naming' | 'souls' = 'magic';  // Magic → planet → artstyle → scenario → naming → souls
  private universeName: string = '';
  private fateSuffix: string = '';
  private options: UniverseConfigScreenOptions = {};

  // Art style configurations - determines the visual aesthetic of all sprites
  private static readonly ART_STYLES: Record<string, { name: string; era: string; description: string; icon: string; category: string }> = {
    // Classic Console Era
    nes: { name: 'NES Classic', era: '1985-1990', description: 'Chunky pixels, limited palette, Super Mario Bros style', icon: '🎮', category: 'Classic' },
    snes: { name: 'SNES Golden Age', era: '1991-1996', description: 'Detailed sprites, rich colors, Chrono Trigger style', icon: '🎨', category: 'Classic' },
    genesis: { name: 'Sega Genesis', era: '1988-1997', description: 'Bold colors, dithered gradients, Sonic style', icon: '💙', category: 'Classic' },
    gameboy: { name: 'Game Boy', era: '1989-1998', description: 'Monochrome green, 4-shade palette, Pokemon style', icon: '🟢', category: 'Classic' },
    gba: { name: 'GBA', era: '2001-2008', description: 'Bright colors, clean outlines, Golden Sun style', icon: '🌟', category: 'Classic' },
    // 32-bit Era
    ps1: { name: 'PS1/Saturn', era: '1995-2000', description: 'Pre-rendered 3D, Final Fantasy Tactics style', icon: '💿', category: '32-bit' },
    neogeo: { name: 'Neo Geo Arcade', era: '1990-2004', description: 'Massive detailed sprites, Metal Slug style', icon: '🕹️', category: '32-bit' },
    n64: { name: 'N64 Era', era: '1996-2002', description: 'Pre-rendered sprites, Paper Mario style', icon: '📺', category: '32-bit' },
    // Modern Indie
    stardew: { name: 'Stardew Style', era: '2016', description: 'Cozy farming aesthetic, warm colors', icon: '🌾', category: 'Modern' },
    celeste: { name: 'Celeste Style', era: '2018', description: 'Modern pixel art, smooth animation', icon: '🏔️', category: 'Modern' },
    undertale: { name: 'Undertale Style', era: '2015', description: 'Minimalist sprites, indie charm', icon: '❤️', category: 'Modern' },
    // Retro Computer
    c64: { name: 'Commodore 64', era: '1982-1994', description: '16-color palette, classic C64 aesthetic', icon: '💾', category: 'Retro' },
    amiga: { name: 'Amiga', era: '1985-1996', description: 'Rich palette, European computer style', icon: '🖥️', category: 'Retro' },
  };

  // Planet type configurations
  private static readonly PLANET_TYPES: Record<string, { name: string; description: string; icon: string }> = {
    random: { name: 'Random World', description: 'Let the universe surprise you', icon: '🎲' },
    terrestrial: { name: 'Terrestrial', description: 'Earth-like world with diverse biomes', icon: '🌍' },
    super_earth: { name: 'Super Earth', description: 'Massive world with high gravity', icon: '🏔️' },
    desert: { name: 'Desert World', description: 'Arid Mars-like planet', icon: '🏜️' },
    ice: { name: 'Ice World', description: 'Frozen planet with subsurface oceans', icon: '❄️' },
    ocean: { name: 'Ocean World', description: 'Global water world', icon: '🌊' },
    volcanic: { name: 'Volcanic', description: 'Extreme volcanism and lava flows', icon: '🌋' },
    tidally_locked: { name: 'Tidally Locked', description: 'Permanent day/night eyeball planet', icon: '🌗' },
    hycean: { name: 'Hycean', description: 'Hydrogen-rich ocean world', icon: '💧' },
    rogue: { name: 'Rogue Planet', description: 'Starless wanderer in eternal darkness', icon: '🌑' },
    moon: { name: 'Planetary Moon', description: 'Satellite with low gravity', icon: '🌙' },
    magical: { name: 'Magical Realm', description: 'Floating islands and arcane zones', icon: '✨' },
    fungal: { name: 'Fungal World', description: 'Giant fungi and mycelium networks', icon: '🍄' },
    crystal: { name: 'Crystal World', description: 'Crystalline terrain and refractive beauty', icon: '💎' },
  };

  // Universe name roots for auto-generation
  private static readonly UNIVERSE_PREFIXES = [
    'Ae', 'Val', 'Cel', 'Eld', 'Ara', 'Nym', 'Ith', 'Zeph', 'Mor', 'Syl',
    'Thal', 'Ven', 'Kyr', 'Orn', 'Pha', 'Elu', 'Ast', 'Vor', 'Kal', 'Lum',
  ];
  private static readonly UNIVERSE_MIDDLES = [
    'ther', 'an', 'est', 'or', 'un', 'ar', 'el', 'en', 'os', 'al',
    'ion', 'eth', 'and', 'ur', 'ax', 'em', 'on', 'is', 'ad', 'ir',
  ];
  private static readonly UNIVERSE_ENDINGS = [
    'ia', 'os', 'is', 'um', 'a', 'on', 'heim', 'thas', 'ael', 'ion',
    'ys', 'oth', 'nar', 'ium', 'ea', 'or', 'ith', 'ara', 'eon', 'us',
  ];

  // Poetic suffixes the Fates might add to universe names
  private static readonly FATE_SUFFIXES = [
    'of the Eternal Dawn',
    'where Stars Remember',
    'of Whispered Dreams',
    'beneath the Silver Moon',
    'of the Wandering Souls',
    'where Time Dances',
    'of the Sacred Flame',
    'where Shadows Sing',
    'of the Awakened Heart',
    'beneath the Veil',
    'of the First Light',
    'where Rivers Meet',
    'of the Bound Fates',
    'where Mountains Dream',
    'of the Endless Sky',
    'beneath the Ancient Oak',
    'of the Silent Watch',
    'where Echoes Linger',
    'of the Burning Path',
    'where Hope Blooms',
  ];

  /**
   * Generate a random evocative universe name.
   */
  private static generateUniverseName(): string {
    const pick = <T>(arr: readonly T[]): T => {
      const item = arr[Math.floor(Math.random() * arr.length)];
      if (item === undefined) {
        throw new Error('Cannot pick from empty array');
      }
      return item;
    };
    const prefix = pick(UniverseConfigScreen.UNIVERSE_PREFIXES);
    const middle = pick(UniverseConfigScreen.UNIVERSE_MIDDLES);
    const ending = pick(UniverseConfigScreen.UNIVERSE_ENDINGS);

    // Vary the structure for more variety
    const pattern = Math.floor(Math.random() * 3);
    switch (pattern) {
      case 0: return `${prefix}${middle}${ending}`;        // e.g. "Aetheria"
      case 1: return `${prefix}${ending}`;                 // e.g. "Celheim"
      default: return `${prefix}${middle}`;                // e.g. "Valan"
    }
  }

  private _onCreate: ((config: UniverseConfig) => void) | null = null;
  private pendingConfig: UniverseConfig | null = null;

  // Spectrum configuration state
  private selectedSpectrumPreset: string = 'ai_village';
  private showAdvancedSpectrum: boolean = false;
  private customIntensity: MagicalIntensity = 'high';
  private customSources: MagicSourceOrigin[] = ['internal', 'divine', 'knowledge'];
  private customFormality: MagicFormality = 'trained';
  private customAnimism: AnimismLevel = 'elemental';

  private getCurrentSpectrum(): MagicSpectrumConfig {
    if (this.showAdvancedSpectrum) {
      return { intensity: this.customIntensity, sources: this.customSources, formality: this.customFormality, animism: this.customAnimism };
    }
    return getPreset(this.selectedSpectrumPreset as keyof typeof SPECTRUM_PRESETS);
  }

  private getSpectrumPresetInfo(presetId: string): { name: string; description: string; icon: string } {
    const meta: Record<string, { name: string; description: string; icon: string }> = {
      mundane: { name: 'Mundane World', description: 'No magic exists. Pure technology and science.', icon: '🌍' },
      low_fantasy: { name: 'Low Fantasy', description: 'Magic is rare and subtle. (Game of Thrones)', icon: '🌙' },
      classic_fantasy: { name: 'Classic Fantasy', description: 'Multiple magic traditions flourish. (D&D)', icon: '⚔️' },
      mythic: { name: 'Mythic', description: 'Gods walk among mortals. (Greek Mythology)', icon: '⚡' },
      shinto_animism: { name: 'Shinto Animism', description: 'Everything has a spirit. Kami everywhere.', icon: '🌸' },
      hard_magic: { name: 'Hard Magic', description: 'Magic follows strict rules like science. (Mistborn)', icon: '⚙️' },
      literary_surrealism: { name: 'Literary Surrealism', description: 'Words have weight. Metaphors become real.', icon: '📚' },
      wild_magic: { name: 'Wild Magic', description: 'Chaotic and unpredictable. Reality is unstable.', icon: '🌀' },
      dead_magic: { name: 'Dead Magic', description: 'Magic once existed but is gone.', icon: '💀' },
      ai_village: { name: 'Multiverse: The End of Eternity', description: 'Rich magic with multiple traditions. Balanced for gameplay.', icon: '🏘️' },
    };
    return meta[presetId] || { name: presetId, description: '', icon: '✨' };
  }

  constructor(containerId: string = 'universe-config-screen') {
    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'universe-config-screen';  // Add class for Playwright tests
      this.container.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); display: none; flex-direction: column; align-items: center; justify-content: flex-start; padding: 40px; box-sizing: border-box; z-index: 10001; font-family: monospace; color: #e0e0e0; overflow-y: auto;`;
      document.body.appendChild(this.container);
    }
    this.render();
  }

  show(onCreateCallback: (config: UniverseConfig) => void, options?: UniverseConfigScreenOptions): void {
    this._onCreate = onCreateCallback;
    this.options = options || {};

    // Apply pre-selections if provided
    if (this.options.preselectedPlanetType) {
      this.selectedPlanetType = this.options.preselectedPlanetType;
    }
    if (this.options.preselectedPlanetId) {
      this.selectedPlanetId = this.options.preselectedPlanetId;
    }

    this.container.style.display = 'flex';
    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private render(): void {
    this.container.innerHTML = '';

    // Determine which steps to show based on options
    const skipPlanet = this.options.skipPlanetStep;
    const steps = skipPlanet
      ? ['magic', 'artstyle', 'scenario', 'naming', 'souls'] as const
      : ['magic', 'planet', 'artstyle', 'scenario', 'naming', 'souls'] as const;

    // Step indicator
    const stepIndicator = document.createElement('div');
    stepIndicator.style.cssText = 'display: flex; gap: 15px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap;';

    const stepLabels: Record<string, string> = {
      magic: 'Magic System',
      planet: 'Choose Planet',
      artstyle: 'Art Style',
      scenario: 'Your Story',
      naming: 'Name Your Universe',
      souls: 'Soul Ceremonies',
    };

    steps.forEach((step, index) => {
      const stepDiv = document.createElement('div');
      stepDiv.textContent = `${index + 1}. ${stepLabels[step]}`;
      const isActive = this.currentStep === step;
      const canClick = step !== 'souls' || this.pendingConfig;
      stepDiv.style.cssText = `padding: 8px 16px; border-radius: 20px; font-size: 13px; cursor: ${canClick ? 'pointer' : 'default'}; background: ${isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#2a2a4a'}; color: ${isActive ? '#fff' : '#888'};`;
      if (canClick) {
        stepDiv.onclick = () => {
          // Handle navigation based on skipPlanet mode
          if (step === 'planet' && skipPlanet) return;
          this.currentStep = step;
          this.render();
        };
      }
      stepIndicator.appendChild(stepDiv);
    });

    this.container.appendChild(stepIndicator);

    const title = document.createElement('h1');
    title.textContent = 'Create New Universe';
    title.style.cssText = 'margin: 0 0 20px 0; font-size: 36px; text-align: center; color: #ffffff; text-shadow: 0 0 20px rgba(100, 200, 255, 0.5);';
    this.container.appendChild(title);

    if (this.currentStep === 'magic') {
      this.renderMagicStep();
    } else if (this.currentStep === 'planet') {
      this.renderPlanetStep();
    } else if (this.currentStep === 'artstyle') {
      this.renderArtStyleStep();
    } else if (this.currentStep === 'scenario') {
      this.renderScenarioStep();
    } else if (this.currentStep === 'naming') {
      this.renderNamingStep();
    } else {
      this.renderSoulsStep();
    }
  }

  private renderPlanetStep(): void {
    // Show selected magic summary
    const spectrum = this.getCurrentSpectrum();
    const effects = resolveSpectrum(spectrum);
    const presetInfo = this.getSpectrumPresetInfo(this.selectedSpectrumPreset);

    const magicSummary = document.createElement('div');
    magicSummary.style.cssText = 'background: rgba(76, 175, 80, 0.1); border: 1px solid #4CAF50; border-radius: 8px; padding: 15px; max-width: 800px; margin-bottom: 20px;';
    magicSummary.innerHTML = `
      <div style="color: #4CAF50; font-size: 12px; margin-bottom: 5px;">MAGIC SYSTEM</div>
      <div style="color: #fff; font-size: 16px; font-weight: bold;">${this.showAdvancedSpectrum ? 'Custom Configuration' : presetInfo.icon + ' ' + presetInfo.name}</div>
      <div style="color: #aaa; font-size: 13px; margin-top: 5px;">${effects.enabledParadigms.length} paradigms enabled | ${effects.availableEntities.length} entity types</div>
    `;
    this.container.appendChild(magicSummary);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Choose the type of world where your story begins';
    subtitle.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; text-align: center; color: #aaa;';
    this.container.appendChild(subtitle);

    // Show existing planets if available
    const existingPlanets = this.options.existingPlanets;
    if (existingPlanets && existingPlanets.length > 0) {
      const existingSection = document.createElement('div');
      existingSection.style.cssText = 'max-width: 1200px; width: 100%; margin-bottom: 30px;';

      const existingLabel = document.createElement('div');
      existingLabel.style.cssText = 'color: #4CAF50; font-size: 12px; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px;';
      existingLabel.textContent = 'YOUR PLANETS (skip biosphere generation)';
      existingSection.appendChild(existingLabel);

      const existingGrid = document.createElement('div');
      existingGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px;';

      for (const planet of existingPlanets) {
        const isSelected = this.selectedPlanetId === planet.id;
        const planetTypeInfo = UniverseConfigScreen.PLANET_TYPES[planet.type] || { name: planet.type, icon: '🪐' };
        const card = document.createElement('div');
        card.style.cssText = `background: ${isSelected ? 'rgba(76, 175, 80, 0.2)' : 'rgba(30, 50, 30, 0.5)'}; border: 2px solid ${isSelected ? '#4CAF50' : '#2a4a2a'}; border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.2s;`;
        card.onclick = () => {
          this.selectedPlanetId = planet.id;
          this.selectedPlanetType = planet.type;
          this.render();
        };
        const statusIcon = planet.hasBiosphere ? '✓' : '...';
        const statusColor = planet.hasBiosphere ? '#4CAF50' : '#ff9800';
        card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 22px;">${planetTypeInfo.icon}</span>
            <div>
              <div style="color: ${isSelected ? '#4CAF50' : '#ddd'}; font-size: 14px; font-weight: bold;">${planet.name}</div>
              <div style="color: #888; font-size: 11px;">${planetTypeInfo.name} <span style="color: ${statusColor};">${statusIcon} ${planet.hasBiosphere ? 'ready' : 'no biosphere'}</span></div>
            </div>
          </div>
        `;
        if (isSelected) {
          card.innerHTML += '<div style="position: absolute; top: 8px; right: 8px; color: #4CAF50; font-size: 18px;">✓</div>';
          card.style.position = 'relative';
        }
        existingGrid.appendChild(card);
      }
      existingSection.appendChild(existingGrid);
      this.container.appendChild(existingSection);

      // Divider
      const divider = document.createElement('div');
      divider.style.cssText = 'max-width: 1200px; width: 100%; border-top: 1px solid #3a3a5a; margin-bottom: 20px; position: relative;';
      divider.innerHTML = '<span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #1a1a2e; padding: 0 15px; color: #666; font-size: 12px;">OR CREATE NEW</span>';
      this.container.appendChild(divider);
    }

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; max-width: 1200px; width: 100%;';

    for (const [planetId, planetInfo] of Object.entries(UniverseConfigScreen.PLANET_TYPES)) {
      const isSelected = this.selectedPlanetType === planetId;
      const card = document.createElement('div');
      card.style.cssText = `background: ${isSelected ? 'linear-gradient(135deg, #4a3a2a 0%, #3a2a1a 100%)' : 'rgba(30, 30, 50, 0.8)'}; border: 2px solid ${isSelected ? '#ff9800' : '#3a3a5a'}; border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.3s; position: relative;`;
      card.onclick = () => {
        this.selectedPlanetType = planetId === 'random' ? this.getRandomPlanetType() : planetId;
        this.selectedPlanetId = undefined; // Clear existing planet selection
        if (planetId === 'random') {
          // For random, immediately proceed to art style step
          this.currentStep = 'artstyle';
        }
        this.render();
      };

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <span style="font-size: 28px;">${planetInfo.icon}</span>
          <h3 style="margin: 0; font-size: 20px; color: ${isSelected ? '#ff9800' : '#fff'};">${planetInfo.name}</h3>
        </div>
        <p style="margin: 0; font-size: 13px; color: #bbb;">${planetInfo.description}</p>
      `;

      if (isSelected && planetId !== 'random') {
        card.innerHTML += '<div style="position: absolute; top: 10px; right: 10px; background: #ff9800; color: #000; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold;">Selected</div>';
      }

      grid.appendChild(card);
    }
    this.container.appendChild(grid);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 20px; margin-top: 20px;';

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Magic System';
    backButton.style.cssText = 'padding: 15px 30px; font-size: 16px; font-family: monospace; background: #333; color: #aaa; border: 1px solid #555; border-radius: 8px; cursor: pointer;';
    backButton.onclick = () => { this.currentStep = 'magic'; this.render(); };

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next: Choose Art Style';
    nextButton.style.cssText = 'padding: 15px 40px; font-size: 18px; font-family: monospace; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 8px; cursor: pointer;';
    nextButton.onclick = () => {
      this.currentStep = 'artstyle';
      this.render();
    };

    buttonContainer.appendChild(backButton);
    buttonContainer.appendChild(nextButton);
    this.container.appendChild(buttonContainer);
  }

  private getRandomPlanetType(): string {
    const planetTypes = Object.keys(UniverseConfigScreen.PLANET_TYPES).filter(t => t !== 'random');
    return planetTypes[Math.floor(Math.random() * planetTypes.length)] || 'terrestrial';
  }

  private renderArtStyleStep(): void {
    // Show selected magic and planet summaries
    const spectrum = this.getCurrentSpectrum();
    const effects = resolveSpectrum(spectrum);
    const presetInfo = this.getSpectrumPresetInfo(this.selectedSpectrumPreset);
    const planetInfo = UniverseConfigScreen.PLANET_TYPES[this.selectedPlanetType] ?? UniverseConfigScreen.PLANET_TYPES['terrestrial']!;

    const summaryContainer = document.createElement('div');
    summaryContainer.style.cssText = 'display: flex; gap: 15px; max-width: 800px; margin-bottom: 20px; flex-wrap: wrap;';

    const magicSummary = document.createElement('div');
    magicSummary.style.cssText = 'background: rgba(76, 175, 80, 0.1); border: 1px solid #4CAF50; border-radius: 8px; padding: 12px 15px; flex: 1; min-width: 200px;';
    magicSummary.innerHTML = `
      <div style="color: #4CAF50; font-size: 11px; margin-bottom: 3px;">MAGIC</div>
      <div style="color: #fff; font-size: 14px;">${presetInfo.icon} ${presetInfo.name}</div>
    `;
    summaryContainer.appendChild(magicSummary);

    const planetSummary = document.createElement('div');
    planetSummary.style.cssText = 'background: rgba(255, 152, 0, 0.1); border: 1px solid #ff9800; border-radius: 8px; padding: 12px 15px; flex: 1; min-width: 200px;';
    planetSummary.innerHTML = `
      <div style="color: #ff9800; font-size: 11px; margin-bottom: 3px;">PLANET</div>
      <div style="color: #fff; font-size: 14px;">${planetInfo!.icon} ${planetInfo!.name}</div>
    `;
    summaryContainer.appendChild(planetSummary);
    this.container.appendChild(summaryContainer);

    const subtitle = document.createElement('p');
    subtitle.innerHTML = 'Choose the <strong>visual style</strong> for all creatures and sprites on this planet.<br><small style="color: #888;">This determines how everything looks - like choosing a console generation for your world.</small>';
    subtitle.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; text-align: center; color: #aaa;';
    this.container.appendChild(subtitle);

    // Group art styles by category
    const categories: Record<string, string[]> = {};
    for (const [styleId, styleInfo] of Object.entries(UniverseConfigScreen.ART_STYLES)) {
      if (!categories[styleInfo.category]) {
        categories[styleInfo.category] = [];
      }
      categories[styleInfo.category]!.push(styleId);
    }

    for (const [category, styleIds] of Object.entries(categories)) {
      const categorySection = document.createElement('div');
      categorySection.style.cssText = 'max-width: 1200px; width: 100%; margin-bottom: 25px;';

      const categoryLabel = document.createElement('div');
      categoryLabel.style.cssText = 'color: #888; font-size: 12px; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px;';
      categoryLabel.textContent = category.toUpperCase();
      categorySection.appendChild(categoryLabel);

      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;';

      for (const styleId of styleIds) {
        const styleInfo = UniverseConfigScreen.ART_STYLES[styleId];
        if (!styleInfo) continue;

        const isSelected = this.selectedArtStyle === styleId;
        const card = document.createElement('div');
        card.style.cssText = `background: ${isSelected ? 'linear-gradient(135deg, #2a3a5a 0%, #1a2a4a 100%)' : 'rgba(30, 30, 50, 0.8)'}; border: 2px solid ${isSelected ? '#58a6ff' : '#3a3a5a'}; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.3s; position: relative;`;
        card.onclick = () => {
          this.selectedArtStyle = styleId;
          this.render();
        };

        card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <span style="font-size: 24px;">${styleInfo.icon}</span>
            <div>
              <h3 style="margin: 0; font-size: 16px; color: ${isSelected ? '#58a6ff' : '#fff'};">${styleInfo.name}</h3>
              <div style="color: #666; font-size: 11px;">${styleInfo.era}</div>
            </div>
          </div>
          <p style="margin: 0; font-size: 12px; color: #999;">${styleInfo.description}</p>
        `;

        if (isSelected) {
          card.innerHTML += '<div style="position: absolute; top: 10px; right: 10px; background: #58a6ff; color: #000; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: bold;">Selected</div>';
        }

        grid.appendChild(card);
      }
      categorySection.appendChild(grid);
      this.container.appendChild(categorySection);
    }

    // Custom sprite import hint
    const importHint = document.createElement('div');
    importHint.style.cssText = 'max-width: 800px; background: rgba(100, 100, 150, 0.1); border: 1px dashed #555; border-radius: 8px; padding: 15px; margin-top: 10px; text-align: center;';
    importHint.innerHTML = `
      <div style="color: #888; font-size: 13px;">
        <strong>Custom Sprites?</strong> You can import your own sprite sets after planet creation.<br>
        <small style="color: #666;">Access the Sprite Gallery from the planet management screen to upload custom assets.</small>
      </div>
    `;
    this.container.appendChild(importHint);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 20px; margin-top: 25px;';

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Planet';
    backButton.style.cssText = 'padding: 15px 30px; font-size: 16px; font-family: monospace; background: #333; color: #aaa; border: 1px solid #555; border-radius: 8px; cursor: pointer;';
    backButton.onclick = () => {
      this.currentStep = this.options.skipPlanetStep ? 'magic' : 'planet';
      this.render();
    };

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next: Choose Your Story';
    nextButton.style.cssText = 'padding: 15px 40px; font-size: 18px; font-family: monospace; font-weight: bold; background: linear-gradient(135deg, #58a6ff 0%, #3a7bd5 100%); color: #fff; border: none; border-radius: 8px; cursor: pointer;';
    nextButton.onclick = () => {
      this.currentStep = 'scenario';
      this.render();
    };

    buttonContainer.appendChild(backButton);
    buttonContainer.appendChild(nextButton);
    this.container.appendChild(buttonContainer);
  }

  private renderScenarioStep(): void {
    // Show selected magic, planet, and art style summaries
    const spectrum = this.getCurrentSpectrum();
    const effects = resolveSpectrum(spectrum);
    const presetInfo = this.getSpectrumPresetInfo(this.selectedSpectrumPreset);
    const planetInfo = UniverseConfigScreen.PLANET_TYPES[this.selectedPlanetType] ?? UniverseConfigScreen.PLANET_TYPES['terrestrial']!;
    const artStyleInfo = UniverseConfigScreen.ART_STYLES[this.selectedArtStyle] ?? UniverseConfigScreen.ART_STYLES['snes']!;

    const summaryContainer = document.createElement('div');
    summaryContainer.style.cssText = 'display: flex; gap: 15px; max-width: 900px; margin-bottom: 20px; flex-wrap: wrap;';

    const magicSummary = document.createElement('div');
    magicSummary.style.cssText = 'flex: 1; min-width: 180px; background: rgba(76, 175, 80, 0.1); border: 1px solid #4CAF50; border-radius: 8px; padding: 12px;';
    magicSummary.innerHTML = `
      <div style="color: #4CAF50; font-size: 11px; margin-bottom: 3px;">MAGIC</div>
      <div style="color: #fff; font-size: 14px;">${this.showAdvancedSpectrum ? 'Custom' : presetInfo.icon + ' ' + presetInfo.name}</div>
    `;

    const planetSummary = document.createElement('div');
    planetSummary.style.cssText = 'flex: 1; min-width: 180px; background: rgba(255, 152, 0, 0.1); border: 1px solid #ff9800; border-radius: 8px; padding: 12px;';
    planetSummary.innerHTML = `
      <div style="color: #ff9800; font-size: 11px; margin-bottom: 3px;">PLANET</div>
      <div style="color: #fff; font-size: 14px;">${planetInfo.icon} ${planetInfo.name}</div>
    `;

    const artStyleSummary = document.createElement('div');
    artStyleSummary.style.cssText = 'flex: 1; min-width: 180px; background: rgba(88, 166, 255, 0.1); border: 1px solid #58a6ff; border-radius: 8px; padding: 12px;';
    artStyleSummary.innerHTML = `
      <div style="color: #58a6ff; font-size: 11px; margin-bottom: 3px;">ART STYLE</div>
      <div style="color: #fff; font-size: 14px;">${artStyleInfo.icon} ${artStyleInfo.name}</div>
    `;

    summaryContainer.appendChild(magicSummary);
    summaryContainer.appendChild(planetSummary);
    summaryContainer.appendChild(artStyleSummary);
    this.container.appendChild(summaryContainer);

    const subtitle = document.createElement('p');
    subtitle.textContent = `Choose the first memory - how your world begins (${SCENARIO_PRESETS.length} scenarios)`;
    subtitle.style.cssText = 'margin: 0 0 40px 0; font-size: 14px; text-align: center; color: #aaa;';
    this.container.appendChild(subtitle);

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; max-width: 1200px; width: 100%;';

    for (const preset of SCENARIO_PRESETS) {
      const isSelected = this.selectedScenario === preset.id;
      const card = document.createElement('div');
      card.style.cssText = `background: ${isSelected ? 'linear-gradient(135deg, #4a3a2a 0%, #3a2a1a 100%)' : 'rgba(30, 30, 50, 0.8)'}; border: 2px solid ${isSelected ? '#ff9800' : '#3a3a5a'}; border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.3s; position: relative;`;
      card.onclick = () => { this.selectedScenario = preset.id; this.render(); };
      card.innerHTML = `<h3 style="margin: 0 0 10px 0; font-size: 20px; color: ${isSelected ? '#ff9800' : '#fff'};">${preset.name}</h3><p style="margin: 0; font-size: 13px; color: #bbb;">${preset.preview}</p>`;
      if (isSelected) card.innerHTML += '<div style="position: absolute; top: 10px; right: 10px; background: #ff9800; color: #000; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold;">Selected</div>';
      grid.appendChild(card);
    }
    this.container.appendChild(grid);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 20px; margin-top: 20px;';

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Art Style';
    backButton.style.cssText = 'padding: 15px 30px; font-size: 16px; font-family: monospace; background: #333; color: #aaa; border: 1px solid #555; border-radius: 8px; cursor: pointer;';
    backButton.onclick = () => { this.currentStep = 'artstyle'; this.render(); };

    const createButton = document.createElement('button');
    createButton.textContent = 'Begin Soul Ceremonies';
    createButton.style.cssText = 'padding: 15px 40px; font-size: 18px; font-family: monospace; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 8px; cursor: pointer;';
    createButton.onclick = () => {
      // Auto-generate universe name (skip naming step)
      const spectrum = this.getCurrentSpectrum();
      const effects = resolveSpectrum(spectrum);
      const firstParadigm = effects.enabledParadigms[0];
      const generatedName = UniverseConfigScreen.generateUniverseName();
      const shuffled = [...UniverseConfigScreen.FATE_SUFFIXES].sort(() => Math.random() - 0.5);
      const fateSuffix = shuffled[0]!;
      const fullUniverseName = `${generatedName} ${fateSuffix}`;

      this.pendingConfig = {
        magicParadigmId: firstParadigm ?? null,
        magicSpectrum: spectrum,
        spectrumEffects: effects,
        planetType: this.selectedPlanetType,
        planetId: this.selectedPlanetId,
        artStyle: this.selectedArtStyle,
        scenarioPresetId: this.selectedScenario,
        universeName: fullUniverseName,
        seed: Date.now(),
      };
      if (this.selectedScenario === 'custom') {
        this.pendingConfig.customScenarioText = this.customScenarioText;
      }
      this.currentStep = 'souls';
      this.render();
    };

    buttonContainer.appendChild(backButton);
    buttonContainer.appendChild(createButton);
    this.container.appendChild(buttonContainer);
  }

  private renderNamingStep(): void {
    const spectrum = this.getCurrentSpectrum();
    const effects = resolveSpectrum(spectrum);
    const presetInfo = this.getSpectrumPresetInfo(this.selectedSpectrumPreset);
    const scenarioPreset = SCENARIO_PRESETS.find(s => s.id === this.selectedScenario);
    const planetInfo = UniverseConfigScreen.PLANET_TYPES[this.selectedPlanetType] ?? UniverseConfigScreen.PLANET_TYPES['terrestrial']!;
    const artStyleInfo = UniverseConfigScreen.ART_STYLES[this.selectedArtStyle] ?? UniverseConfigScreen.ART_STYLES['snes']!;

    // Summary of previous choices
    const summary = document.createElement('div');
    summary.style.cssText = 'display: flex; gap: 12px; max-width: 900px; margin-bottom: 30px; flex-wrap: wrap;';

    const magicSummary = document.createElement('div');
    magicSummary.style.cssText = 'flex: 1; min-width: 150px; background: rgba(76, 175, 80, 0.1); border: 1px solid #4CAF50; border-radius: 8px; padding: 10px;';
    magicSummary.innerHTML = `
      <div style="color: #4CAF50; font-size: 10px; margin-bottom: 3px;">MAGIC</div>
      <div style="color: #fff; font-size: 13px;">${this.showAdvancedSpectrum ? 'Custom' : presetInfo.icon + ' ' + presetInfo.name}</div>
    `;

    const planetSummary = document.createElement('div');
    planetSummary.style.cssText = 'flex: 1; min-width: 150px; background: rgba(255, 152, 0, 0.1); border: 1px solid #ff9800; border-radius: 8px; padding: 10px;';
    planetSummary.innerHTML = `
      <div style="color: #ff9800; font-size: 10px; margin-bottom: 3px;">PLANET</div>
      <div style="color: #fff; font-size: 13px;">${planetInfo.icon} ${planetInfo.name}</div>
    `;

    const artStyleSummary = document.createElement('div');
    artStyleSummary.style.cssText = 'flex: 1; min-width: 150px; background: rgba(88, 166, 255, 0.1); border: 1px solid #58a6ff; border-radius: 8px; padding: 10px;';
    artStyleSummary.innerHTML = `
      <div style="color: #58a6ff; font-size: 10px; margin-bottom: 3px;">ART STYLE</div>
      <div style="color: #fff; font-size: 13px;">${artStyleInfo.icon} ${artStyleInfo.name}</div>
    `;

    const scenarioSummary = document.createElement('div');
    scenarioSummary.style.cssText = 'flex: 1; min-width: 150px; background: rgba(156, 39, 176, 0.1); border: 1px solid #9c27b0; border-radius: 8px; padding: 10px;';
    scenarioSummary.innerHTML = `
      <div style="color: #9c27b0; font-size: 10px; margin-bottom: 3px;">STORY</div>
      <div style="color: #fff; font-size: 13px;">${scenarioPreset?.name || 'Unknown'}</div>
    `;

    summary.appendChild(magicSummary);
    summary.appendChild(planetSummary);
    summary.appendChild(artStyleSummary);
    summary.appendChild(scenarioSummary);
    this.container.appendChild(summary);

    // Title
    const namingTitle = document.createElement('h2');
    namingTitle.textContent = 'The Fates Weave Your Thread';
    namingTitle.style.cssText = 'margin: 0 0 10px 0; font-size: 28px; color: #fff; text-align: center;';
    this.container.appendChild(namingTitle);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Give your universe a name, and the Three Fates shall add their blessing...';
    subtitle.style.cssText = 'margin: 0 0 30px 0; font-size: 14px; text-align: center; color: #888; font-style: italic;';
    this.container.appendChild(subtitle);

    // Name input container
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = 'max-width: 600px; width: 100%; background: rgba(30, 30, 50, 0.8); border: 1px solid #3a3a5a; border-radius: 12px; padding: 30px;';

    // Name input
    const inputLabel = document.createElement('label');
    inputLabel.textContent = 'Universe Name';
    inputLabel.style.cssText = 'display: block; font-size: 14px; color: #aaa; margin-bottom: 10px;';
    inputContainer.appendChild(inputLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Enter a name for your universe...';
    nameInput.value = this.universeName;
    nameInput.style.cssText = `
      width: 100%;
      padding: 15px;
      font-size: 18px;
      font-family: monospace;
      background: #1a1a2e;
      color: #fff;
      border: 2px solid #4a4a6a;
      border-radius: 8px;
      box-sizing: border-box;
      margin-bottom: 20px;
    `;
    nameInput.oninput = (e) => {
      this.universeName = (e.target as HTMLInputElement).value;
      this.updateFatePreview();
      // Update the next button's disabled state
      const nextBtn = document.getElementById('begin-soul-ceremonies-btn') as HTMLButtonElement | null;
      if (nextBtn) {
        const hasName = this.universeName.trim().length > 0;
        nextBtn.disabled = !hasName;
        nextBtn.style.background = hasName ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#333';
        nextBtn.style.color = hasName ? '#fff' : '#666';
        nextBtn.style.cursor = hasName ? 'pointer' : 'not-allowed';
      }
    };
    inputContainer.appendChild(nameInput);

    // Fate suffix selector
    const fateLabel = document.createElement('div');
    fateLabel.textContent = 'The Fates Add:';
    fateLabel.style.cssText = 'font-size: 14px; color: #aaa; margin-bottom: 10px;';
    inputContainer.appendChild(fateLabel);

    const fateContainer = document.createElement('div');
    fateContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;';

    // Generate a random selection of 6 fate suffixes for this session
    const shuffled = [...UniverseConfigScreen.FATE_SUFFIXES].sort(() => Math.random() - 0.5);
    const displaySuffixes = shuffled.slice(0, 6);

    // Initialize fateSuffix if empty
    if (!this.fateSuffix && displaySuffixes.length > 0) {
      this.fateSuffix = displaySuffixes[0]!;
    }

    for (const suffix of displaySuffixes) {
      const isSelected = this.fateSuffix === suffix;
      const btn = document.createElement('button');
      btn.textContent = suffix;
      btn.style.cssText = `
        padding: 8px 14px;
        font-size: 12px;
        font-family: monospace;
        background: ${isSelected ? 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)' : '#2a2a4a'};
        color: ${isSelected ? '#fff' : '#aaa'};
        border: 1px solid ${isSelected ? '#9c27b0' : '#3a3a5a'};
        border-radius: 6px;
        cursor: pointer;
      `;
      btn.onclick = () => {
        this.fateSuffix = suffix;
        this.render();
      };
      fateContainer.appendChild(btn);
    }

    // Reroll button
    const rerollBtn = document.createElement('button');
    rerollBtn.textContent = '🎲 Reroll';
    rerollBtn.style.cssText = `
      padding: 8px 14px;
      font-size: 12px;
      font-family: monospace;
      background: #333;
      color: #888;
      border: 1px solid #555;
      border-radius: 6px;
      cursor: pointer;
    `;
    rerollBtn.onclick = () => {
      // Force re-render to get new random suffixes
      this.fateSuffix = '';
      this.render();
    };
    fateContainer.appendChild(rerollBtn);

    inputContainer.appendChild(fateContainer);

    // Preview
    const previewLabel = document.createElement('div');
    previewLabel.textContent = 'Your Universe:';
    previewLabel.style.cssText = 'font-size: 14px; color: #aaa; margin-bottom: 10px;';
    inputContainer.appendChild(previewLabel);

    const previewContainer = document.createElement('div');
    previewContainer.id = 'fate-preview';
    previewContainer.style.cssText = `
      padding: 20px;
      background: linear-gradient(135deg, rgba(156, 39, 176, 0.2) 0%, rgba(103, 58, 183, 0.2) 100%);
      border: 2px solid rgba(156, 39, 176, 0.5);
      border-radius: 10px;
      text-align: center;
    `;

    const fullName = this.universeName
      ? `${this.universeName} ${this.fateSuffix}`
      : `[Your Name] ${this.fateSuffix}`;

    previewContainer.innerHTML = `
      <div style="font-size: 22px; color: #fff; font-weight: bold; text-shadow: 0 0 15px rgba(156, 39, 176, 0.5);">
        ${fullName}
      </div>
      <div style="font-size: 12px; color: #9c27b0; margin-top: 8px;">
        ✨ Blessed by Clotho, Lachesis, and Atropos ✨
      </div>
    `;
    inputContainer.appendChild(previewContainer);

    this.container.appendChild(inputContainer);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 20px; margin-top: 30px;';

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Story';
    backButton.style.cssText = 'padding: 15px 30px; font-size: 16px; font-family: monospace; background: #333; color: #aaa; border: 1px solid #555; border-radius: 8px; cursor: pointer;';
    backButton.onclick = () => { this.currentStep = 'scenario'; this.render(); };

    const nextButton = document.createElement('button');
    nextButton.id = 'begin-soul-ceremonies-btn';
    const hasName = this.universeName.trim().length > 0;
    nextButton.textContent = 'Begin Soul Ceremonies';
    nextButton.disabled = !hasName;
    nextButton.style.cssText = `
      padding: 15px 40px;
      font-size: 18px;
      font-family: monospace;
      font-weight: bold;
      background: ${hasName ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#333'};
      color: ${hasName ? '#fff' : '#666'};
      border: none;
      border-radius: 8px;
      cursor: ${hasName ? 'pointer' : 'not-allowed'};
    `;
    nextButton.onclick = () => {
      if (!this.universeName.trim()) return;

      const firstParadigm = effects.enabledParadigms[0];
      const fullUniverseName = `${this.universeName.trim()} ${this.fateSuffix}`;

      this.pendingConfig = {
        magicParadigmId: firstParadigm ?? null,
        magicSpectrum: spectrum,
        spectrumEffects: effects,
        planetType: this.selectedPlanetType,
        planetId: this.selectedPlanetId,
        artStyle: this.selectedArtStyle,
        scenarioPresetId: this.selectedScenario,
        universeName: fullUniverseName,
        seed: Date.now(),
      };
      if (this.selectedScenario === 'custom') {
        this.pendingConfig.customScenarioText = this.customScenarioText;
      }
      this.currentStep = 'souls';
      this.render();
    };

    buttonContainer.appendChild(backButton);
    buttonContainer.appendChild(nextButton);
    this.container.appendChild(buttonContainer);
  }

  private updateFatePreview(): void {
    const previewContainer = document.getElementById('fate-preview');
    if (!previewContainer) return;

    const fullName = this.universeName
      ? `${this.universeName} ${this.fateSuffix}`
      : `[Your Name] ${this.fateSuffix}`;

    previewContainer.innerHTML = `
      <div style="font-size: 22px; color: #fff; font-weight: bold; text-shadow: 0 0 15px rgba(156, 39, 176, 0.5);">
        ${fullName}
      </div>
      <div style="font-size: 12px; color: #9c27b0; margin-top: 8px;">
        ✨ Blessed by Clotho, Lachesis, and Atropos ✨
      </div>
    `;
  }

  private renderMagicStep(): void {
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Configure the magical laws that will govern this reality';
    subtitle.style.cssText = 'margin: 0 0 30px 0; font-size: 14px; text-align: center; color: #aaa;';
    this.container.appendChild(subtitle);

    // Mode toggle
    const modeToggle = document.createElement('div');
    modeToggle.style.cssText = 'display: flex; gap: 10px; justify-content: center; margin-bottom: 30px;';

    const presetBtn = document.createElement('button');
    presetBtn.textContent = 'Presets';
    presetBtn.style.cssText = `padding: 10px 25px; font-size: 14px; font-family: monospace; background: ${!this.showAdvancedSpectrum ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#2a2a4a'}; color: ${!this.showAdvancedSpectrum ? '#fff' : '#888'}; border: none; border-radius: 20px; cursor: pointer;`;
    presetBtn.onclick = () => { this.showAdvancedSpectrum = false; this.render(); };

    const advancedBtn = document.createElement('button');
    advancedBtn.textContent = 'Advanced (Custom Axes)';
    advancedBtn.style.cssText = `padding: 10px 25px; font-size: 14px; font-family: monospace; background: ${this.showAdvancedSpectrum ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#2a2a4a'}; color: ${this.showAdvancedSpectrum ? '#fff' : '#888'}; border: none; border-radius: 20px; cursor: pointer;`;
    advancedBtn.onclick = () => { this.showAdvancedSpectrum = true; this.render(); };

    modeToggle.appendChild(presetBtn);
    modeToggle.appendChild(advancedBtn);
    this.container.appendChild(modeToggle);

    if (this.showAdvancedSpectrum) {
      this.renderAdvancedSpectrumConfig();
    } else {
      this.renderSpectrumPresets();
    }

    // Enabled paradigms display
    this.renderEnabledParadigms();

    // Next button
    const nextButton = document.createElement('button');
    const nextStep = this.options.skipPlanetStep ? 'scenario' : 'planet';
    const nextLabel = this.options.skipPlanetStep ? 'Next: Choose Your Story' : 'Next: Choose Planet';
    nextButton.textContent = nextLabel;
    nextButton.style.cssText = 'padding: 15px 40px; font-size: 18px; font-family: monospace; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 8px; cursor: pointer; margin-top: 30px;';
    nextButton.onclick = () => { this.currentStep = nextStep; this.render(); };
    this.container.appendChild(nextButton);
  }

  private renderSpectrumPresets(): void {
    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; max-width: 1200px; width: 100%; margin-bottom: 20px;';

    for (const presetId of getPresetNames()) {
      const info = this.getSpectrumPresetInfo(presetId);
      const isSelected = this.selectedSpectrumPreset === presetId;
      const preset = getPreset(presetId as keyof typeof SPECTRUM_PRESETS);

      const card = document.createElement('div');
      card.style.cssText = `background: ${isSelected ? 'linear-gradient(135deg, #2a4a4a 0%, #1e3a3a 100%)' : 'rgba(30, 30, 50, 0.8)'}; border: 2px solid ${isSelected ? '#4CAF50' : '#3a3a5a'}; border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.3s; position: relative;`;
      card.onclick = () => { this.selectedSpectrumPreset = presetId; this.render(); };

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <span style="font-size: 28px;">${info.icon}</span>
          <h3 style="margin: 0; font-size: 18px; color: ${isSelected ? '#4CAF50' : '#fff'};">${info.name}</h3>
        </div>
        <p style="margin: 0 0 15px 0; font-size: 13px; line-height: 1.5; color: #bbb;">${info.description}</p>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <span style="font-size: 10px; padding: 3px 8px; border-radius: 10px; background: rgba(102, 126, 234, 0.3); color: #8fa8ff;">${preset.intensity.replace('_', ' ')}</span>
          <span style="font-size: 10px; padding: 3px 8px; border-radius: 10px; background: rgba(76, 175, 80, 0.3); color: #8fdf8f;">${preset.animism.replace('_', ' ')}</span>
          <span style="font-size: 10px; padding: 3px 8px; border-radius: 10px; background: rgba(255, 152, 0, 0.3); color: #ffb84d;">${preset.formality}</span>
        </div>
        ${isSelected ? '<div style="position: absolute; top: 10px; right: 10px; background: #4CAF50; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold;">✓ Selected</div>' : ''}
      `;

      grid.appendChild(card);
    }

    this.container.appendChild(grid);
  }

  private renderAdvancedSpectrumConfig(): void {
    const configContainer = document.createElement('div');
    configContainer.style.cssText = 'max-width: 800px; width: 100%; background: rgba(30, 30, 50, 0.8); border: 1px solid #3a3a5a; border-radius: 12px; padding: 30px; margin-bottom: 20px;';

    // Intensity
    configContainer.appendChild(this.renderAxisSelector(
      CONFIGURATION_QUESTIONS.intensity.question,
      CONFIGURATION_QUESTIONS.intensity.options,
      this.customIntensity,
      (v) => { this.customIntensity = v as MagicalIntensity; this.render(); }
    ));

    // Formality
    configContainer.appendChild(this.renderAxisSelector(
      CONFIGURATION_QUESTIONS.formality.question,
      CONFIGURATION_QUESTIONS.formality.options,
      this.customFormality,
      (v) => { this.customFormality = v as MagicFormality; this.render(); }
    ));

    // Animism
    configContainer.appendChild(this.renderAxisSelector(
      CONFIGURATION_QUESTIONS.animism.question,
      CONFIGURATION_QUESTIONS.animism.options,
      this.customAnimism,
      (v) => { this.customAnimism = v as AnimismLevel; this.render(); }
    ));

    // Sources (multi-select)
    configContainer.appendChild(this.renderSourcesSelector());

    this.container.appendChild(configContainer);
  }

  private renderAxisSelector(question: string, options: Array<{ value: string; label: string; description: string }>, currentValue: string, onChange: (v: string) => void): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 25px;';

    const questionEl = document.createElement('div');
    questionEl.textContent = question;
    questionEl.style.cssText = 'font-size: 16px; color: #fff; margin-bottom: 15px; font-weight: bold;';
    container.appendChild(questionEl);

    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px;';

    for (const opt of options) {
      const isSelected = currentValue === opt.value;
      const btn = document.createElement('button');
      btn.style.cssText = `padding: 8px 16px; font-size: 12px; font-family: monospace; background: ${isSelected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#2a2a4a'}; color: ${isSelected ? '#fff' : '#aaa'}; border: 1px solid ${isSelected ? '#667eea' : '#3a3a5a'}; border-radius: 6px; cursor: pointer;`;
      btn.textContent = opt.label;
      btn.title = opt.description;
      btn.onclick = () => onChange(opt.value);
      optionsContainer.appendChild(btn);
    }
    container.appendChild(optionsContainer);

    const selected = options.find(o => o.value === currentValue);
    if (selected) {
      const desc = document.createElement('div');
      desc.textContent = selected.description;
      desc.style.cssText = 'margin-top: 10px; font-size: 12px; color: #888; font-style: italic;';
      container.appendChild(desc);
    }

    return container;
  }

  private renderSourcesSelector(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 25px;';

    const questionEl = document.createElement('div');
    questionEl.textContent = CONFIGURATION_QUESTIONS.source.question;
    questionEl.style.cssText = 'font-size: 16px; color: #fff; margin-bottom: 15px; font-weight: bold;';
    container.appendChild(questionEl);

    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px;';

    for (const opt of CONFIGURATION_QUESTIONS.source.options) {
      const isSelected = this.customSources.includes(opt.value as MagicSourceOrigin);
      const btn = document.createElement('button');
      btn.style.cssText = `padding: 8px 16px; font-size: 12px; font-family: monospace; background: ${isSelected ? 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)' : '#2a2a4a'}; color: ${isSelected ? '#fff' : '#aaa'}; border: 1px solid ${isSelected ? '#4CAF50' : '#3a3a5a'}; border-radius: 6px; cursor: pointer;`;
      btn.textContent = opt.label;
      btn.title = opt.description;
      btn.onclick = () => {
        const source = opt.value as MagicSourceOrigin;
        if (isSelected) {
          this.customSources = this.customSources.filter(s => s !== source);
        } else {
          this.customSources = [...this.customSources, source];
        }
        if (this.customSources.length === 0) this.customSources = ['internal'];
        this.render();
      };
      optionsContainer.appendChild(btn);
    }
    container.appendChild(optionsContainer);

    const selectedList = document.createElement('div');
    selectedList.textContent = `Selected: ${this.customSources.join(', ')}`;
    selectedList.style.cssText = 'margin-top: 10px; font-size: 12px; color: #888;';
    container.appendChild(selectedList);

    return container;
  }

  private renderEnabledParadigms(): void {
    const spectrum = this.getCurrentSpectrum();
    const effects = resolveSpectrum(spectrum);

    const container = document.createElement('div');
    container.style.cssText = 'max-width: 1200px; width: 100%; background: rgba(20, 30, 20, 0.8); border: 1px solid #4CAF50; border-radius: 12px; padding: 20px; margin-top: 20px;';

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;';
    header.innerHTML = `
      <h3 style="margin: 0; font-size: 16px; color: #4CAF50;">Enabled Magic Systems</h3>
      <span style="font-size: 12px; color: #888;">Power: ${(effects.powerMultiplier * 100).toFixed(0)}% | Cost: ${effects.costMultiplier === Infinity ? '∞' : (effects.costMultiplier * 100).toFixed(0)}%</span>
    `;
    container.appendChild(header);

    const descEl = document.createElement('p');
    descEl.textContent = effects.description;
    descEl.style.cssText = 'margin: 0 0 15px 0; font-size: 13px; color: #aaa; line-height: 1.5;';
    container.appendChild(descEl);

    if (effects.enabledParadigms.length > 0 && !effects.disabledParadigms.includes('all')) {
      // Enabled paradigms
      const enabledSection = document.createElement('div');
      enabledSection.style.cssText = 'margin-bottom: 15px;';
      enabledSection.innerHTML = `<div style="font-size: 12px; color: #4CAF50; margin-bottom: 8px; font-weight: bold;">✓ Enabled (${effects.enabledParadigms.length})</div>`;
      const enabledTags = document.createElement('div');
      enabledTags.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px;';
      for (const p of effects.enabledParadigms) {
        enabledTags.innerHTML += `<span style="font-size: 11px; padding: 4px 10px; border-radius: 12px; background: rgba(76, 175, 80, 0.2); color: #8fdf8f; text-transform: capitalize;">${p}</span>`;
      }
      enabledSection.appendChild(enabledTags);
      container.appendChild(enabledSection);

      // Weakened paradigms
      if (effects.weakenedParadigms.length > 0) {
        const weakenedSection = document.createElement('div');
        weakenedSection.style.cssText = 'margin-bottom: 15px;';
        weakenedSection.innerHTML = `<div style="font-size: 12px; color: #ff9800; margin-bottom: 8px; font-weight: bold;">~ Weakened (${effects.weakenedParadigms.length})</div>`;
        const weakenedTags = document.createElement('div');
        weakenedTags.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px;';
        for (const p of effects.weakenedParadigms) {
          weakenedTags.innerHTML += `<span style="font-size: 11px; padding: 4px 10px; border-radius: 12px; background: rgba(255, 152, 0, 0.2); color: #ffb84d; text-transform: capitalize;">${p}</span>`;
        }
        weakenedSection.appendChild(weakenedTags);
        container.appendChild(weakenedSection);
      }

      // Available entities
      if (effects.availableEntities.length > 0) {
        const entitiesSection = document.createElement('div');
        entitiesSection.innerHTML = `
          <div style="font-size: 12px; color: #9c27b0; margin-bottom: 8px; font-weight: bold;">Entities in this world:</div>
          <div style="font-size: 11px; color: #b388ff; line-height: 1.5;">${effects.availableEntities.map((e: any) => e.replace(/_/g, ' ')).join(', ')}</div>
        `;
        container.appendChild(entitiesSection);
      }
    } else {
      const noMagic = document.createElement('div');
      noMagic.textContent = 'No magic systems are enabled in this configuration.';
      noMagic.style.cssText = 'font-size: 14px; color: #888; font-style: italic;';
      container.appendChild(noMagic);
    }

    this.container.appendChild(container);
  }

  private renderSoulsStep(): void {
    const description = document.createElement('p');
    description.textContent = 'The Three Fates are weaving souls for your villagers...';
    description.style.cssText = 'font-size: 18px; color: #ccc; text-align: center; margin-bottom: 40px; font-style: italic;';
    this.container.appendChild(description);

    const statusContainer = document.createElement('div');
    statusContainer.style.cssText = 'max-width: 700px; padding: 30px; background: rgba(0, 0, 0, 0.5); border: 2px solid #667eea; border-radius: 10px; text-align: center;';

    const statusText = document.createElement('div');
    statusText.id = 'universe-creation-status';
    statusText.textContent = 'Initializing universe and creating initial souls...';
    statusText.style.cssText = 'font-size: 16px; color: #ffd700; margin-bottom: 20px; min-height: 24px; font-family: monospace;';
    statusContainer.appendChild(statusText);

    // Progress log container
    const progressLog = document.createElement('div');
    progressLog.id = 'universe-creation-log';
    progressLog.style.cssText = 'max-height: 300px; overflow-y: auto; margin-top: 20px; text-align: left; font-size: 13px; color: #aaa; font-family: monospace; line-height: 1.8;';
    statusContainer.appendChild(progressLog);

    const loader = document.createElement('div');
    loader.textContent = '⏳';
    loader.style.cssText = 'font-size: 48px; animation: pulse 2s infinite; margin-top: 20px;';
    statusContainer.appendChild(loader);

    this.container.appendChild(statusContainer);

    // Trigger game creation with the configured settings
    // The SoulCeremonyModal will show on top of this screen during soul creation
    if (this._onCreate && this.pendingConfig) {
      // Small delay to let the UI render
      setTimeout(() => {
        if (this._onCreate && this.pendingConfig) {
          this._onCreate(this.pendingConfig);
        }
      }, 100);
    }
  }

  /**
   * Update progress message during universe creation
   */
  updateProgress(message: string): void {
    const statusText = document.getElementById('universe-creation-status');
    const progressLog = document.getElementById('universe-creation-log');

    if (statusText) {
      statusText.textContent = message;
    }

    if (progressLog) {
      const logEntry = document.createElement('div');
      logEntry.textContent = `• ${message}`;
      logEntry.style.cssText = 'color: #8fdf8f; margin-bottom: 5px;';
      progressLog.appendChild(logEntry);
      // Auto-scroll to bottom
      progressLog.scrollTop = progressLog.scrollHeight;
    }
  }

  destroy(): void {
    this.container.remove();
  }
}
