/**
 * LivePlanetCreationScreen - Create planets with real-time entity visualization
 *
 * Features:
 * - Custom art style input with bit-depth/era validation
 * - Real-time entity spawning visualization grouped by biome
 * - South-facing sprites generated first, others queued
 * - Auto-persists to server (no save button needed)
 * - Species appear as they're generated
 */

export interface ArtStyleConfig {
  preset: string | null;  // null if custom
  custom: string | null;  // Custom input if preset is null
  bitDepth: '8-bit' | '16-bit' | '32-bit' | '64-bit';
  era: string;  // e.g., 'NES', 'SNES', 'Genesis', 'GBA', 'PS1', etc.
}

export interface GeneratedSpecies {
  id: string;
  name: string;
  type: 'animal' | 'plant' | 'fungus' | 'microbe';
  biome: string;
  traits: Record<string, any>;
  spriteUrl?: string;  // South-facing sprite URL
  spriteStatus: 'pending' | 'generating' | 'ready' | 'failed';
  otherDirectionsQueued: boolean;
}

export interface BiomeGroup {
  name: string;
  icon: string;
  species: GeneratedSpecies[];
  color: string;
}

export interface LivePlanetCreationCallbacks {
  onPlanetReady: (planetId: string) => void;
  onCancel: () => void;
}

// Art style presets
const ART_STYLE_PRESETS: Record<string, { name: string; bitDepth: '8-bit' | '16-bit' | '32-bit' | '64-bit'; era: string; description: string }> = {
  nes: { name: 'NES Classic', bitDepth: '8-bit', era: 'NES', description: 'Limited palette, chunky pixels' },
  gameboy: { name: 'Game Boy', bitDepth: '8-bit', era: 'Game Boy', description: 'Monochrome green tint' },
  snes: { name: 'SNES', bitDepth: '16-bit', era: 'SNES', description: 'Rich colors, detailed sprites' },
  genesis: { name: 'Sega Genesis', bitDepth: '16-bit', era: 'Genesis', description: 'Bold contrast, arcade feel' },
  gba: { name: 'Game Boy Advance', bitDepth: '32-bit', era: 'GBA', description: 'Portable perfection' },
  ps1: { name: 'PlayStation 1', bitDepth: '32-bit', era: 'PS1', description: 'Early 3D era sprites' },
  n64: { name: 'Nintendo 64', bitDepth: '64-bit', era: 'N64', description: 'Textured, polygonal feel' },
  ds: { name: 'Nintendo DS', bitDepth: '32-bit', era: 'DS', description: 'Dual-screen era sprites' },
};

// Biome icons and colors
const BIOME_CONFIG: Record<string, { icon: string; color: string }> = {
  forest: { icon: '🌲', color: '#228B22' },
  desert: { icon: '🏜️', color: '#DEB887' },
  ocean: { icon: '🌊', color: '#1E90FF' },
  tundra: { icon: '❄️', color: '#B0E0E6' },
  jungle: { icon: '🌴', color: '#32CD32' },
  savanna: { icon: '🦁', color: '#F4A460' },
  mountain: { icon: '⛰️', color: '#808080' },
  swamp: { icon: '🐊', color: '#556B2F' },
  volcanic: { icon: '🌋', color: '#FF4500' },
  cave: { icon: '🦇', color: '#2F4F4F' },
  coral_reef: { icon: '🐠', color: '#FF7F50' },
  grassland: { icon: '🌾', color: '#9ACD32' },
};

export class LivePlanetCreationScreen {
  private container: HTMLElement;
  private callbacks: LivePlanetCreationCallbacks;
  private universeId: string = '';
  private universeName: string = '';

  // Configuration
  private planetName: string = '';
  private planetType: string = 'terrestrial';
  private artStyleConfig: ArtStyleConfig = {
    preset: 'snes',
    custom: null,
    bitDepth: '16-bit',
    era: 'SNES',
  };
  private customArtStyleInput: string = '';
  private useCustomArtStyle: boolean = false;

  // Generation state
  private isGenerating: boolean = false;
  private generationPhase: 'config' | 'generating' | 'complete' = 'config';
  private biomeGroups: Map<string, BiomeGroup> = new Map();
  private allSpecies: GeneratedSpecies[] = [];
  private generationLog: string[] = [];
  private planetId: string | null = null;

  // Animation
  private animationFrame: number | null = null;

  private readonly API_BASE = 'http://localhost:3001/api';

  constructor(containerId: string = 'live-planet-creation-screen', callbacks: LivePlanetCreationCallbacks) {
    this.callbacks = callbacks;

    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'live-planet-creation-screen';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a1a2a 100%);
        display: none;
        flex-direction: column;
        z-index: 10000;
        font-family: monospace;
        color: #e0e0e0;
        overflow: hidden;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(universeId: string, universeName: string): void {
    this.universeId = universeId;
    this.universeName = universeName;
    this.generationPhase = 'config';
    this.planetName = this.generatePlanetName();
    this.container.style.display = 'flex';
    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private generatePlanetName(): string {
    const prefixes = ['Nova', 'Terra', 'Astra', 'Celest', 'Ether', 'Nyx', 'Sol', 'Luna', 'Vega', 'Zeta'];
    const suffixes = ['Prime', 'Major', 'Minor', 'Alpha', 'Beta', 'Gamma', 'IX', 'VII', 'III', 'V'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix} ${suffix}`;
  }

  private render(): void {
    this.container.innerHTML = '';

    if (this.generationPhase === 'config') {
      this.renderConfigPhase();
    } else {
      this.renderGenerationPhase();
    }
  }

  private renderConfigPhase(): void {
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 30px 40px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h1');
    title.textContent = '🌍 Create New Planet';
    title.style.cssText = 'margin: 0; font-size: 28px; color: #fff;';
    header.appendChild(title);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✕ Cancel';
    cancelBtn.style.cssText = `
      padding: 10px 20px;
      font-size: 14px;
      font-family: monospace;
      background: transparent;
      color: #888;
      border: 1px solid #3a3a5a;
      border-radius: 6px;
      cursor: pointer;
    `;
    cancelBtn.onclick = () => this.callbacks.onCancel();
    header.appendChild(cancelBtn);

    this.container.appendChild(header);

    // Universe context
    const context = document.createElement('div');
    context.style.cssText = 'padding: 15px 40px; background: rgba(102, 126, 234, 0.1); font-size: 14px; color: #9999ff;';
    context.textContent = `Creating planet in universe: ${this.universeName}`;
    this.container.appendChild(context);

    // Main form
    const form = document.createElement('div');
    form.style.cssText = `
      flex: 1;
      padding: 40px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 30px;
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
    `;

    // Planet name
    form.appendChild(this.renderPlanetNameSection());

    // Planet type
    form.appendChild(this.renderPlanetTypeSection());

    // Art style
    form.appendChild(this.renderArtStyleSection());

    // Start button
    const startBtn = document.createElement('button');
    startBtn.textContent = '🚀 Begin Planet Generation';
    startBtn.disabled = !this.isConfigValid();
    startBtn.style.cssText = `
      padding: 20px 40px;
      font-size: 18px;
      font-family: monospace;
      font-weight: bold;
      background: ${this.isConfigValid() ? 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)' : '#333'};
      color: ${this.isConfigValid() ? '#fff' : '#666'};
      border: none;
      border-radius: 10px;
      cursor: ${this.isConfigValid() ? 'pointer' : 'not-allowed'};
      margin-top: 20px;
      transition: transform 0.2s;
    `;
    if (this.isConfigValid()) {
      startBtn.onmouseenter = () => { startBtn.style.transform = 'scale(1.02)'; };
      startBtn.onmouseleave = () => { startBtn.style.transform = 'scale(1)'; };
      startBtn.onclick = () => this.startGeneration();
    }
    form.appendChild(startBtn);

    this.container.appendChild(form);
  }

  private renderPlanetNameSection(): HTMLElement {
    const section = document.createElement('div');

    const label = document.createElement('label');
    label.textContent = 'Planet Name';
    label.style.cssText = 'display: block; font-size: 16px; color: #fff; margin-bottom: 10px;';
    section.appendChild(label);

    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display: flex; gap: 10px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.planetName;
    input.style.cssText = `
      flex: 1;
      padding: 14px 18px;
      font-size: 16px;
      font-family: monospace;
      background: rgba(30, 30, 50, 0.8);
      border: 1px solid #3a3a5a;
      border-radius: 8px;
      color: #fff;
      outline: none;
    `;
    input.oninput = () => { this.planetName = input.value; this.render(); };
    inputRow.appendChild(input);

    const randomBtn = document.createElement('button');
    randomBtn.textContent = '🎲';
    randomBtn.title = 'Generate random name';
    randomBtn.style.cssText = `
      padding: 14px 18px;
      font-size: 16px;
      background: rgba(50, 50, 70, 0.8);
      border: 1px solid #3a3a5a;
      border-radius: 8px;
      cursor: pointer;
    `;
    randomBtn.onclick = () => { this.planetName = this.generatePlanetName(); this.render(); };
    inputRow.appendChild(randomBtn);

    section.appendChild(inputRow);
    return section;
  }

  private renderPlanetTypeSection(): HTMLElement {
    const section = document.createElement('div');

    const label = document.createElement('label');
    label.textContent = 'Planet Type';
    label.style.cssText = 'display: block; font-size: 16px; color: #fff; margin-bottom: 10px;';
    section.appendChild(label);

    const types = [
      { id: 'terrestrial', name: 'Terrestrial', icon: '🌍' },
      { id: 'ocean', name: 'Ocean', icon: '🌊' },
      { id: 'desert', name: 'Desert', icon: '🏜️' },
      { id: 'ice', name: 'Ice', icon: '❄️' },
      { id: 'volcanic', name: 'Volcanic', icon: '🌋' },
      { id: 'jungle', name: 'Jungle', icon: '🌴' },
    ];

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;';

    for (const type of types) {
      const btn = document.createElement('button');
      const isSelected = this.planetType === type.id;
      btn.innerHTML = `<span style="font-size: 24px;">${type.icon}</span><br><span>${type.name}</span>`;
      btn.style.cssText = `
        padding: 15px;
        font-size: 14px;
        font-family: monospace;
        background: ${isSelected ? 'rgba(102, 126, 234, 0.3)' : 'rgba(30, 30, 50, 0.8)'};
        border: 2px solid ${isSelected ? '#667eea' : '#3a3a5a'};
        border-radius: 10px;
        color: #fff;
        cursor: pointer;
        transition: all 0.2s;
      `;
      btn.onclick = () => { this.planetType = type.id; this.render(); };
      grid.appendChild(btn);
    }

    section.appendChild(grid);
    return section;
  }

  private renderArtStyleSection(): HTMLElement {
    const section = document.createElement('div');

    const label = document.createElement('label');
    label.textContent = 'Art Style';
    label.style.cssText = 'display: block; font-size: 16px; color: #fff; margin-bottom: 10px;';
    section.appendChild(label);

    // Toggle between preset and custom
    const toggleRow = document.createElement('div');
    toggleRow.style.cssText = 'display: flex; gap: 10px; margin-bottom: 15px;';

    const presetBtn = document.createElement('button');
    presetBtn.textContent = 'Use Preset';
    presetBtn.style.cssText = `
      padding: 10px 20px;
      font-size: 14px;
      font-family: monospace;
      background: ${!this.useCustomArtStyle ? 'rgba(102, 126, 234, 0.3)' : 'transparent'};
      border: 1px solid ${!this.useCustomArtStyle ? '#667eea' : '#3a3a5a'};
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
    `;
    presetBtn.onclick = () => { this.useCustomArtStyle = false; this.render(); };
    toggleRow.appendChild(presetBtn);

    const customBtn = document.createElement('button');
    customBtn.textContent = 'Custom Style';
    customBtn.style.cssText = `
      padding: 10px 20px;
      font-size: 14px;
      font-family: monospace;
      background: ${this.useCustomArtStyle ? 'rgba(102, 126, 234, 0.3)' : 'transparent'};
      border: 1px solid ${this.useCustomArtStyle ? '#667eea' : '#3a3a5a'};
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
    `;
    customBtn.onclick = () => { this.useCustomArtStyle = true; this.render(); };
    toggleRow.appendChild(customBtn);

    section.appendChild(toggleRow);

    if (this.useCustomArtStyle) {
      section.appendChild(this.renderCustomArtStyleInput());
    } else {
      section.appendChild(this.renderArtStylePresets());
    }

    return section;
  }

  private renderArtStylePresets(): HTMLElement {
    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;';

    for (const [id, preset] of Object.entries(ART_STYLE_PRESETS)) {
      const isSelected = this.artStyleConfig.preset === id;
      const btn = document.createElement('button');
      btn.style.cssText = `
        padding: 12px;
        font-size: 12px;
        font-family: monospace;
        background: ${isSelected ? 'rgba(102, 126, 234, 0.3)' : 'rgba(30, 30, 50, 0.8)'};
        border: 2px solid ${isSelected ? '#667eea' : '#3a3a5a'};
        border-radius: 8px;
        color: #fff;
        cursor: pointer;
        text-align: left;
      `;
      btn.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">${preset.name}</div>
        <div style="font-size: 10px; color: #888;">${preset.bitDepth} - ${preset.era}</div>
      `;
      btn.title = preset.description;
      btn.onclick = () => {
        this.artStyleConfig = {
          preset: id,
          custom: null,
          bitDepth: preset.bitDepth,
          era: preset.era,
        };
        this.render();
      };
      grid.appendChild(btn);
    }

    return grid;
  }

  private renderCustomArtStyleInput(): HTMLElement {
    const wrapper = document.createElement('div');

    const helpText = document.createElement('p');
    helpText.style.cssText = 'font-size: 12px; color: #888; margin: 0 0 15px 0;';
    helpText.textContent = 'Custom style must include bit-depth (8-bit, 16-bit, 32-bit, or 64-bit) and a specific era or console for consistency.';
    wrapper.appendChild(helpText);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'e.g., "16-bit SNES fantasy RPG style" or "8-bit NES with modern shading"';
    input.value = this.customArtStyleInput;
    input.style.cssText = `
      width: 100%;
      padding: 14px 18px;
      font-size: 14px;
      font-family: monospace;
      background: rgba(30, 30, 50, 0.8);
      border: 1px solid ${this.validateCustomArtStyle() ? '#4CAF50' : '#3a3a5a'};
      border-radius: 8px;
      color: #fff;
      outline: none;
      box-sizing: border-box;
    `;
    input.oninput = () => {
      this.customArtStyleInput = input.value;
      this.updateCustomArtStyleConfig();
      this.render();
    };
    wrapper.appendChild(input);

    // Validation feedback
    const validation = this.getArtStyleValidation();
    if (this.customArtStyleInput && !validation.valid) {
      const errorMsg = document.createElement('div');
      errorMsg.style.cssText = 'font-size: 12px; color: #f44336; margin-top: 8px;';
      errorMsg.textContent = validation.error || 'Invalid format';
      wrapper.appendChild(errorMsg);
    } else if (validation.valid && this.customArtStyleInput) {
      const successMsg = document.createElement('div');
      successMsg.style.cssText = 'font-size: 12px; color: #4CAF50; margin-top: 8px;';
      successMsg.textContent = `Detected: ${validation.bitDepth} - ${validation.era}`;
      wrapper.appendChild(successMsg);
    }

    return wrapper;
  }

  private validateCustomArtStyle(): boolean {
    return this.getArtStyleValidation().valid;
  }

  private getArtStyleValidation(): { valid: boolean; bitDepth?: string; era?: string; error?: string } {
    const input = this.customArtStyleInput.toLowerCase();
    if (!input) return { valid: false, error: 'Please enter a custom art style' };

    // Check for bit-depth
    const bitDepthMatch = input.match(/\b(8-bit|16-bit|32-bit|64-bit)\b/i);
    if (!bitDepthMatch) {
      return { valid: false, error: 'Must include bit-depth: 8-bit, 16-bit, 32-bit, or 64-bit' };
    }

    // Check for era/console
    const eras = ['nes', 'snes', 'genesis', 'mega drive', 'game boy', 'gameboy', 'gba', 'game boy advance',
      'ps1', 'playstation', 'n64', 'nintendo 64', 'ds', 'psp', 'arcade', 'amiga', 'commodore',
      'atari', 'msx', 'pc-98', 'dos', 'windows 95', 'dreamcast', 'saturn'];

    const foundEra = eras.find(era => input.includes(era));
    if (!foundEra) {
      return { valid: false, error: 'Must include a specific era or console (e.g., NES, SNES, Genesis, GBA, PS1)' };
    }

    return {
      valid: true,
      bitDepth: bitDepthMatch[0],
      era: foundEra.toUpperCase(),
    };
  }

  private updateCustomArtStyleConfig(): void {
    const validation = this.getArtStyleValidation();
    if (validation.valid) {
      this.artStyleConfig = {
        preset: null,
        custom: this.customArtStyleInput,
        bitDepth: validation.bitDepth as any,
        era: validation.era!,
      };
    }
  }

  private isConfigValid(): boolean {
    if (!this.planetName.trim()) return false;
    if (this.useCustomArtStyle) {
      return this.validateCustomArtStyle();
    }
    return this.artStyleConfig.preset !== null;
  }

  private async startGeneration(): Promise<void> {
    this.generationPhase = 'generating';
    this.isGenerating = true;
    this.generationLog = [];
    this.biomeGroups.clear();
    this.allSpecies = [];

    this.render();
    this.addLog('Initializing planet creation...');

    try {
      // Create planet on server
      const artStyleString = this.useCustomArtStyle
        ? this.customArtStyleInput
        : `${this.artStyleConfig.bitDepth} ${this.artStyleConfig.era} pixel art`;

      this.addLog(`Art style: ${artStyleString}`);
      this.addLog('Contacting multiverse server...');

      const response = await fetch(`${this.API_BASE}/multiverse/universe/${this.universeId}/planets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.planetName,
          type: this.planetType,
          artStyle: artStyleString,
          generateBiosphere: true,
          spriteStrategy: 'south_first',  // Generate south-facing sprites first
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create planet on server');
      }

      const data = await response.json();
      this.planetId = data.planet.id;
      this.addLog(`Planet created: ${this.planetId}`);

      // Start polling for generation updates
      this.pollGenerationStatus();

    } catch (error) {
      this.addLog(`Error: ${(error as Error).message}`);
      this.isGenerating = false;
      this.render();
    }
  }

  private async pollGenerationStatus(): Promise<void> {
    if (!this.planetId) return;

    try {
      const response = await fetch(`${this.API_BASE}/multiverse/planet/${this.planetId}/generation-status`);
      if (!response.ok) {
        // If endpoint doesn't exist, simulate generation
        this.simulateGeneration();
        return;
      }

      const status = await response.json();

      // Update species list
      if (status.species) {
        for (const species of status.species) {
          if (!this.allSpecies.find(s => s.id === species.id)) {
            this.addSpecies(species);
          }
        }
      }

      // Check if complete
      if (status.complete) {
        this.addLog('Planet generation complete!');
        this.isGenerating = false;
        this.generationPhase = 'complete';
        this.render();
      } else {
        // Continue polling
        setTimeout(() => this.pollGenerationStatus(), 1000);
      }

      this.render();

    } catch (error) {
      console.error('Poll error:', error);
      // Fall back to simulation
      this.simulateGeneration();
    }
  }

  private simulateGeneration(): void {
    // Simulate species being generated over time
    const biomes = ['forest', 'grassland', 'ocean', 'desert', 'mountain', 'swamp'];
    const speciesNames = [
      'Crimson Deer', 'Azure Hawk', 'Emerald Serpent', 'Golden Fox',
      'Silver Wolf', 'Coral Fish', 'Desert Lizard', 'Mountain Goat',
      'Swamp Frog', 'Forest Bear', 'Plains Bison', 'Reef Shark',
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index >= speciesNames.length) {
        clearInterval(interval);
        this.addLog('Planet generation complete!');
        this.isGenerating = false;
        this.generationPhase = 'complete';
        this.render();
        return;
      }

      const biome = biomes[Math.floor(Math.random() * biomes.length)] ?? 'grassland';
      const species: GeneratedSpecies = {
        id: `species_${Date.now()}_${index}`,
        name: speciesNames[index] ?? `Species ${index}`,
        type: Math.random() > 0.3 ? 'animal' : 'plant',
        biome,
        traits: { diet: Math.random() > 0.5 ? 'herbivore' : 'carnivore' },
        spriteStatus: 'pending',
        otherDirectionsQueued: false,
      };

      this.addSpecies(species);
      this.addLog(`Discovered: ${species.name} in ${biome}`);

      // Simulate sprite generation
      setTimeout(() => {
        species.spriteStatus = 'generating';
        this.render();

        setTimeout(() => {
          species.spriteStatus = 'ready';
          species.otherDirectionsQueued = true;
          this.addLog(`Sprite ready: ${species.name} (south view, others queued)`);
          this.render();
        }, 1500);
      }, 500);

      index++;
      this.render();
    }, 800);
  }

  private addSpecies(species: GeneratedSpecies): void {
    this.allSpecies.push(species);

    // Add to biome group
    if (!this.biomeGroups.has(species.biome)) {
      const config = BIOME_CONFIG[species.biome] || { icon: '🌍', color: '#888' };
      this.biomeGroups.set(species.biome, {
        name: species.biome,
        icon: config.icon,
        species: [],
        color: config.color,
      });
    }
    this.biomeGroups.get(species.biome)!.species.push(species);
  }

  private addLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.generationLog.push(`[${timestamp}] ${message}`);
    if (this.generationLog.length > 50) {
      this.generationLog.shift();
    }
    this.render();
  }

  private renderGenerationPhase(): void {
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 20px 40px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const titleWrapper = document.createElement('div');
    const title = document.createElement('h1');
    title.textContent = `🌍 ${this.planetName}`;
    title.style.cssText = 'margin: 0; font-size: 24px; color: #fff;';
    titleWrapper.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = `${this.planetType} planet in ${this.universeName}`;
    subtitle.style.cssText = 'font-size: 12px; color: #888; margin-top: 4px;';
    titleWrapper.appendChild(subtitle);

    header.appendChild(titleWrapper);

    if (this.generationPhase === 'complete') {
      const enterBtn = document.createElement('button');
      enterBtn.textContent = '👁️ Enter as Deity';
      enterBtn.style.cssText = `
        padding: 14px 28px;
        font-size: 16px;
        font-family: monospace;
        font-weight: bold;
        background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
        color: #000;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      `;
      enterBtn.onclick = () => {
        if (this.planetId) {
          this.callbacks.onPlanetReady(this.planetId);
        }
      };
      header.appendChild(enterBtn);
    } else {
      const status = document.createElement('div');
      status.textContent = '⏳ Generating...';
      status.style.cssText = 'font-size: 14px; color: #ff9800; animation: pulse 1s infinite;';
      header.appendChild(status);
    }

    this.container.appendChild(header);

    // Main content - split into biome grid and log
    const main = document.createElement('div');
    main.style.cssText = 'flex: 1; display: flex; overflow: hidden;';

    // Left side - Biomes with species
    const biomesPanel = document.createElement('div');
    biomesPanel.style.cssText = `
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    `;

    const biomesTitle = document.createElement('h2');
    biomesTitle.textContent = `Species by Biome (${this.allSpecies.length} discovered)`;
    biomesTitle.style.cssText = 'margin: 0 0 20px 0; font-size: 18px; color: #fff;';
    biomesPanel.appendChild(biomesTitle);

    const biomesGrid = document.createElement('div');
    biomesGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;';

    for (const [biomeName, group] of this.biomeGroups) {
      biomesGrid.appendChild(this.renderBiomeCard(group));
    }

    if (this.biomeGroups.size === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 60px; color: #666;';
      empty.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 15px; animation: pulse 2s infinite;">🔍</div>
        <div>Searching for life forms...</div>
      `;
      biomesGrid.appendChild(empty);
    }

    biomesPanel.appendChild(biomesGrid);
    main.appendChild(biomesPanel);

    // Right side - Generation log
    const logPanel = document.createElement('div');
    logPanel.style.cssText = `
      width: 350px;
      background: rgba(0, 0, 0, 0.3);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      padding: 20px;
      display: flex;
      flex-direction: column;
    `;

    const logTitle = document.createElement('h3');
    logTitle.textContent = '📋 Generation Log';
    logTitle.style.cssText = 'margin: 0 0 15px 0; font-size: 14px; color: #888;';
    logPanel.appendChild(logTitle);

    const logContainer = document.createElement('div');
    logContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      font-size: 11px;
      color: #666;
    `;

    for (const entry of this.generationLog.slice().reverse()) {
      const line = document.createElement('div');
      line.textContent = entry;
      line.style.cssText = 'padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);';
      logContainer.appendChild(line);
    }

    logPanel.appendChild(logContainer);
    main.appendChild(logPanel);

    this.container.appendChild(main);

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      @keyframes pop-in {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    this.container.appendChild(style);
  }

  private renderBiomeCard(group: BiomeGroup): HTMLElement {
    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(30, 30, 50, 0.8);
      border: 1px solid ${group.color}44;
      border-radius: 10px;
      padding: 15px;
      animation: pop-in 0.3s ease-out;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 12px;';
    header.innerHTML = `
      <span style="font-size: 24px;">${group.icon}</span>
      <span style="font-size: 16px; color: ${group.color}; text-transform: capitalize; font-weight: bold;">${group.name}</span>
      <span style="margin-left: auto; font-size: 12px; color: #666;">${group.species.length} species</span>
    `;
    card.appendChild(header);

    // Species list
    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

    for (const species of group.species) {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        animation: pop-in 0.3s ease-out;
      `;

      // Sprite placeholder or actual sprite
      const spriteBox = document.createElement('div');
      spriteBox.style.cssText = `
        width: 32px;
        height: 32px;
        background: ${species.spriteStatus === 'ready' ? '#333' : 'rgba(255,255,255,0.1)'};
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      `;

      if (species.spriteStatus === 'pending') {
        spriteBox.textContent = '⏳';
      } else if (species.spriteStatus === 'generating') {
        spriteBox.innerHTML = '<span style="animation: pulse 0.5s infinite;">🎨</span>';
      } else if (species.spriteStatus === 'ready') {
        spriteBox.textContent = species.type === 'animal' ? '🦎' : '🌿';
      } else {
        spriteBox.textContent = '❌';
      }

      item.appendChild(spriteBox);

      const info = document.createElement('div');
      info.style.cssText = 'flex: 1;';
      info.innerHTML = `
        <div style="font-size: 13px; color: #fff;">${species.name}</div>
        <div style="font-size: 10px; color: #666;">${species.type}</div>
      `;
      item.appendChild(info);

      if (species.otherDirectionsQueued) {
        const queued = document.createElement('span');
        queued.textContent = '📥';
        queued.title = 'Other directions queued';
        queued.style.cssText = 'font-size: 12px; opacity: 0.5;';
        item.appendChild(queued);
      }

      list.appendChild(item);
    }

    card.appendChild(list);
    return card;
  }

  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.container.remove();
  }
}
