/**
 * PlanetCreationScreen - Create a planet within an existing universe
 *
 * This screen handles planet-specific creation:
 * - Planet type selection
 * - Art style selection (determines sprite aesthetics)
 * - Biosphere configuration (optional, can be generated later)
 *
 * Requires a parent universe to exist first.
 */

export interface PlanetConfig {
  /** Unique planet identifier */
  id: string;
  /** Parent universe ID */
  universeId: string;
  /** Planet display name */
  name: string;
  /** Planet type */
  type: string;
  /** Console-era art style for all sprites */
  artStyle: string;
  /** Whether to generate biosphere on creation */
  generateBiosphere: boolean;
  /** Maximum species in biosphere (if generating) */
  maxSpecies: number;
  /** Random seed */
  seed: number;
  /** Creation timestamp */
  createdAt: number;
}

export interface PlanetCreationCallbacks {
  onCreatePlanet: (config: PlanetConfig) => void;
  onCancel: () => void;
}

export class PlanetCreationScreen {
  private container: HTMLElement;
  private universeId: string = '';
  private universeName: string = '';
  private currentStep: 'type' | 'artstyle' | 'biosphere' | 'naming' = 'type';
  private selectedPlanetType: string = 'terrestrial';
  private selectedArtStyle: string = 'snes';
  private generateBiosphere: boolean = true;
  private maxSpecies: number = 8;
  private planetName: string = '';

  private callbacks: PlanetCreationCallbacks | null = null;

  // Planet types
  private static readonly PLANET_TYPES: Record<string, { name: string; description: string; icon: string }> = {
    terrestrial: { name: 'Terrestrial', description: 'Earth-like world with diverse biomes', icon: '🌍' },
    super_earth: { name: 'Super Earth', description: 'Massive world with high gravity', icon: '🏔️' },
    desert: { name: 'Desert World', description: 'Arid Mars-like planet', icon: '🏜️' },
    ice: { name: 'Ice World', description: 'Frozen planet with subsurface oceans', icon: '❄️' },
    ocean: { name: 'Ocean World', description: 'Global water world', icon: '🌊' },
    volcanic: { name: 'Volcanic', description: 'Extreme volcanism and lava flows', icon: '🌋' },
    tidally_locked: { name: 'Tidally Locked', description: 'Permanent day/night eyeball planet', icon: '🌗' },
    magical: { name: 'Magical Realm', description: 'Floating islands and arcane zones', icon: '✨' },
    fungal: { name: 'Fungal World', description: 'Giant fungi and mycelium networks', icon: '🍄' },
    crystal: { name: 'Crystal World', description: 'Crystalline terrain and refractive beauty', icon: '💎' },
  };

  // Art styles
  private static readonly ART_STYLES: Record<string, { name: string; era: string; description: string; icon: string; category: string }> = {
    nes: { name: 'NES Classic', era: '1985-1990', description: 'Chunky pixels, limited palette', icon: '🎮', category: 'Classic' },
    snes: { name: 'SNES Golden Age', era: '1991-1996', description: 'Detailed sprites, rich colors', icon: '🎨', category: 'Classic' },
    genesis: { name: 'Sega Genesis', era: '1988-1997', description: 'Bold colors, dithered gradients', icon: '💙', category: 'Classic' },
    gameboy: { name: 'Game Boy', era: '1989-1998', description: 'Monochrome green, 4-shade palette', icon: '🟢', category: 'Classic' },
    gba: { name: 'GBA', era: '2001-2008', description: 'Bright colors, clean outlines', icon: '🌟', category: 'Classic' },
    ps1: { name: 'PS1/Saturn', era: '1995-2000', description: 'Pre-rendered 3D style', icon: '💿', category: '32-bit' },
    neogeo: { name: 'Neo Geo', era: '1990-2004', description: 'Massive detailed sprites', icon: '🕹️', category: '32-bit' },
    stardew: { name: 'Stardew Style', era: '2016', description: 'Cozy farming aesthetic', icon: '🌾', category: 'Modern' },
    celeste: { name: 'Celeste Style', era: '2018', description: 'Modern pixel art, smooth animation', icon: '🏔️', category: 'Modern' },
    undertale: { name: 'Undertale Style', era: '2015', description: 'Minimalist sprites, indie charm', icon: '❤️', category: 'Modern' },
    c64: { name: 'Commodore 64', era: '1982-1994', description: '16-color palette, classic aesthetic', icon: '💾', category: 'Retro' },
    amiga: { name: 'Amiga', era: '1985-1996', description: 'Rich palette, European style', icon: '🖥️', category: 'Retro' },
  };

  // Planet name parts
  private static readonly NAME_PREFIXES = [
    'Nova', 'Stellar', 'Cosmic', 'Alpha', 'Beta', 'Gamma', 'Delta',
    'Primal', 'Ancient', 'Sacred', 'Mystic', 'Eternal', 'Silent',
  ];
  private static readonly NAME_ROOTS = [
    'Terra', 'Gaia', 'Mundo', 'Orbis', 'Sphere', 'Haven', 'Refuge',
    'Eden', 'Arcadia', 'Elysium', 'Avalon', 'Zion', 'Sanctuary',
  ];
  private static readonly NAME_SUFFIXES = [
    'Prime', 'Major', 'Minor', 'I', 'II', 'III', 'IV', 'V',
    'Alpha', 'Omega', 'Ultima', 'Genesis', 'Exodus',
  ];

  constructor(containerId: string = 'planet-creation-screen') {
    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'planet-creation-screen';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a2a1e 0%, #16213e 50%, #2a1a1e 100%);
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 40px;
        box-sizing: border-box;
        z-index: 10001;
        font-family: monospace;
        color: #e0e0e0;
        overflow-y: auto;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(universeId: string, universeName: string, callbacks: PlanetCreationCallbacks): void {
    this.universeId = universeId;
    this.universeName = universeName;
    this.callbacks = callbacks;
    this.currentStep = 'type';
    this.container.style.display = 'flex';
    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private static generatePlanetName(): string {
    const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
    const pattern = Math.floor(Math.random() * 4);
    switch (pattern) {
      case 0: return `${pick(PlanetCreationScreen.NAME_PREFIXES)} ${pick(PlanetCreationScreen.NAME_ROOTS)}`;
      case 1: return `${pick(PlanetCreationScreen.NAME_ROOTS)} ${pick(PlanetCreationScreen.NAME_SUFFIXES)}`;
      case 2: return pick(PlanetCreationScreen.NAME_ROOTS);
      default: return `${pick(PlanetCreationScreen.NAME_PREFIXES)}-${Math.floor(Math.random() * 999)}`;
    }
  }

  private render(): void {
    this.container.innerHTML = '';

    // Universe badge
    const universeBadge = document.createElement('div');
    universeBadge.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(102, 126, 234, 0.2);
      border: 1px solid #667eea;
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 12px;
    `;
    universeBadge.innerHTML = `<span style="color: #667eea;">🌌 Universe:</span> <span style="color: #fff;">${this.universeName}</span>`;
    this.container.appendChild(universeBadge);

    // Step indicator
    const steps = ['type', 'artstyle', 'biosphere', 'naming'] as const;
    const stepLabels = {
      type: 'Planet Type',
      artstyle: 'Art Style',
      biosphere: 'Biosphere',
      naming: 'Name Planet',
    };

    const stepIndicator = document.createElement('div');
    stepIndicator.style.cssText = 'display: flex; gap: 15px; justify-content: center; margin-bottom: 20px;';

    steps.forEach((step, index) => {
      const stepDiv = document.createElement('div');
      stepDiv.textContent = `${index + 1}. ${stepLabels[step]}`;
      const isActive = this.currentStep === step;
      stepDiv.style.cssText = `
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        cursor: pointer;
        background: ${isActive ? 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)' : '#2a2a4a'};
        color: ${isActive ? '#fff' : '#888'};
      `;
      stepDiv.onclick = () => { this.currentStep = step; this.render(); };
      stepIndicator.appendChild(stepDiv);
    });

    this.container.appendChild(stepIndicator);

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Create New Planet';
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 36px;
      text-align: center;
      color: #ffffff;
      text-shadow: 0 0 20px rgba(255, 152, 0, 0.5);
    `;
    this.container.appendChild(title);

    // Render current step
    switch (this.currentStep) {
      case 'type': this.renderTypeStep(); break;
      case 'artstyle': this.renderArtStyleStep(); break;
      case 'biosphere': this.renderBiosphereStep(); break;
      case 'naming': this.renderNamingStep(); break;
    }
  }

  private renderTypeStep(): void {
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Choose the type of world to create';
    subtitle.style.cssText = 'margin: 0 0 30px 0; font-size: 14px; text-align: center; color: #aaa;';
    this.container.appendChild(subtitle);

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      max-width: 1200px;
      width: 100%;
    `;

    for (const [typeId, typeInfo] of Object.entries(PlanetCreationScreen.PLANET_TYPES)) {
      const isSelected = this.selectedPlanetType === typeId;

      const card = document.createElement('div');
      card.style.cssText = `
        background: ${isSelected ? 'linear-gradient(135deg, #4a3a2a 0%, #3a2a1a 100%)' : 'rgba(30, 30, 50, 0.8)'};
        border: 2px solid ${isSelected ? '#ff9800' : '#3a3a5a'};
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s;
        position: relative;
      `;
      card.onclick = () => {
        this.selectedPlanetType = typeId;
        this.render();
      };

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <span style="font-size: 28px;">${typeInfo.icon}</span>
          <h3 style="margin: 0; font-size: 20px; color: ${isSelected ? '#ff9800' : '#fff'};">${typeInfo.name}</h3>
        </div>
        <p style="margin: 0; font-size: 13px; color: #bbb;">${typeInfo.description}</p>
        ${isSelected ? '<div style="position: absolute; top: 10px; right: 10px; background: #ff9800; color: #000; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold;">Selected</div>' : ''}
      `;

      grid.appendChild(card);
    }

    this.container.appendChild(grid);
    this.renderNavButtons('type');
  }

  private renderArtStyleStep(): void {
    // Planet type summary
    const planetInfo = PlanetCreationScreen.PLANET_TYPES[this.selectedPlanetType]!;
    const summary = document.createElement('div');
    summary.style.cssText = `
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid #ff9800;
      border-radius: 8px;
      padding: 12px 15px;
      max-width: 400px;
      margin-bottom: 20px;
    `;
    summary.innerHTML = `
      <div style="color: #ff9800; font-size: 11px;">PLANET TYPE</div>
      <div style="color: #fff; font-size: 14px;">${planetInfo.icon} ${planetInfo.name}</div>
    `;
    this.container.appendChild(summary);

    const subtitle = document.createElement('p');
    subtitle.innerHTML = 'Choose the <strong>visual style</strong> for all creatures on this planet';
    subtitle.style.cssText = 'margin: 0 0 30px 0; font-size: 14px; text-align: center; color: #aaa;';
    this.container.appendChild(subtitle);

    // Group by category
    const categories: Record<string, string[]> = {};
    for (const [styleId, styleInfo] of Object.entries(PlanetCreationScreen.ART_STYLES)) {
      if (!categories[styleInfo.category]) categories[styleInfo.category] = [];
      categories[styleInfo.category]!.push(styleId);
    }

    for (const [category, styleIds] of Object.entries(categories)) {
      const section = document.createElement('div');
      section.style.cssText = 'max-width: 1200px; width: 100%; margin-bottom: 25px;';

      const label = document.createElement('div');
      label.textContent = category.toUpperCase();
      label.style.cssText = 'color: #888; font-size: 12px; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px;';
      section.appendChild(label);

      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;';

      for (const styleId of styleIds) {
        const styleInfo = PlanetCreationScreen.ART_STYLES[styleId]!;
        const isSelected = this.selectedArtStyle === styleId;

        const card = document.createElement('div');
        card.style.cssText = `
          background: ${isSelected ? 'linear-gradient(135deg, #2a3a5a 0%, #1a2a4a 100%)' : 'rgba(30, 30, 50, 0.8)'};
          border: 2px solid ${isSelected ? '#58a6ff' : '#3a3a5a'};
          border-radius: 10px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.3s;
        `;
        card.onclick = () => {
          this.selectedArtStyle = styleId;
          this.render();
        };

        card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 20px;">${styleInfo.icon}</span>
            <div>
              <div style="font-size: 14px; color: ${isSelected ? '#58a6ff' : '#fff'}; font-weight: bold;">${styleInfo.name}</div>
              <div style="font-size: 10px; color: #666;">${styleInfo.era}</div>
            </div>
          </div>
          <p style="margin: 0; font-size: 11px; color: #999;">${styleInfo.description}</p>
        `;

        grid.appendChild(card);
      }

      section.appendChild(grid);
      this.container.appendChild(section);
    }

    this.renderNavButtons('artstyle');
  }

  private renderBiosphereStep(): void {
    // Summary
    const planetInfo = PlanetCreationScreen.PLANET_TYPES[this.selectedPlanetType]!;
    const artStyleInfo = PlanetCreationScreen.ART_STYLES[this.selectedArtStyle]!;

    const summary = document.createElement('div');
    summary.style.cssText = 'display: flex; gap: 15px; margin-bottom: 30px;';

    summary.innerHTML = `
      <div style="background: rgba(255, 152, 0, 0.1); border: 1px solid #ff9800; border-radius: 8px; padding: 12px 15px;">
        <div style="color: #ff9800; font-size: 11px;">PLANET</div>
        <div style="color: #fff; font-size: 14px;">${planetInfo.icon} ${planetInfo.name}</div>
      </div>
      <div style="background: rgba(88, 166, 255, 0.1); border: 1px solid #58a6ff; border-radius: 8px; padding: 12px 15px;">
        <div style="color: #58a6ff; font-size: 11px;">ART STYLE</div>
        <div style="color: #fff; font-size: 14px;">${artStyleInfo.icon} ${artStyleInfo.name}</div>
      </div>
    `;
    this.container.appendChild(summary);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Configure how life evolves on this world';
    subtitle.style.cssText = 'margin: 0 0 30px 0; font-size: 14px; text-align: center; color: #aaa;';
    this.container.appendChild(subtitle);

    // Biosphere options
    const options = document.createElement('div');
    options.style.cssText = `
      max-width: 600px;
      width: 100%;
      background: rgba(30, 30, 50, 0.8);
      border: 1px solid #3a3a5a;
      border-radius: 12px;
      padding: 30px;
    `;

    // Generate toggle
    const toggleContainer = document.createElement('div');
    toggleContainer.style.cssText = 'margin-bottom: 30px;';

    const toggleLabel = document.createElement('div');
    toggleLabel.textContent = 'Generate Biosphere';
    toggleLabel.style.cssText = 'font-size: 16px; color: #fff; margin-bottom: 10px;';
    toggleContainer.appendChild(toggleLabel);

    const toggleDesc = document.createElement('div');
    toggleDesc.textContent = 'Use AI to create unique alien species, ecosystems, and food webs. Takes 1-2 minutes.';
    toggleDesc.style.cssText = 'font-size: 12px; color: #888; margin-bottom: 15px;';
    toggleContainer.appendChild(toggleDesc);

    const toggleBtns = document.createElement('div');
    toggleBtns.style.cssText = 'display: flex; gap: 10px;';

    const yesBtn = document.createElement('button');
    yesBtn.textContent = '🦎 Yes, Generate Life';
    yesBtn.style.cssText = `
      flex: 1;
      padding: 15px;
      font-size: 14px;
      font-family: monospace;
      background: ${this.generateBiosphere ? 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)' : '#2a2a4a'};
      color: ${this.generateBiosphere ? '#fff' : '#888'};
      border: 2px solid ${this.generateBiosphere ? '#4CAF50' : '#3a3a5a'};
      border-radius: 8px;
      cursor: pointer;
    `;
    yesBtn.onclick = () => { this.generateBiosphere = true; this.render(); };

    const noBtn = document.createElement('button');
    noBtn.textContent = '🪨 No, Barren World';
    noBtn.style.cssText = `
      flex: 1;
      padding: 15px;
      font-size: 14px;
      font-family: monospace;
      background: ${!this.generateBiosphere ? 'linear-gradient(135deg, #666 0%, #444 100%)' : '#2a2a4a'};
      color: ${!this.generateBiosphere ? '#fff' : '#888'};
      border: 2px solid ${!this.generateBiosphere ? '#666' : '#3a3a5a'};
      border-radius: 8px;
      cursor: pointer;
    `;
    noBtn.onclick = () => { this.generateBiosphere = false; this.render(); };

    toggleBtns.appendChild(yesBtn);
    toggleBtns.appendChild(noBtn);
    toggleContainer.appendChild(toggleBtns);
    options.appendChild(toggleContainer);

    // Species count (if generating)
    if (this.generateBiosphere) {
      const speciesContainer = document.createElement('div');

      const speciesLabel = document.createElement('div');
      speciesLabel.textContent = `Maximum Species: ${this.maxSpecies}`;
      speciesLabel.style.cssText = 'font-size: 14px; color: #fff; margin-bottom: 10px;';
      speciesContainer.appendChild(speciesLabel);

      const speciesSlider = document.createElement('input');
      speciesSlider.type = 'range';
      speciesSlider.min = '4';
      speciesSlider.max = '20';
      speciesSlider.value = this.maxSpecies.toString();
      speciesSlider.style.cssText = 'width: 100%; cursor: pointer;';
      speciesSlider.oninput = (e) => {
        this.maxSpecies = parseInt((e.target as HTMLInputElement).value);
        speciesLabel.textContent = `Maximum Species: ${this.maxSpecies}`;
      };
      speciesContainer.appendChild(speciesSlider);

      const speciesHint = document.createElement('div');
      speciesHint.textContent = 'More species = longer generation time + richer ecosystem';
      speciesHint.style.cssText = 'font-size: 11px; color: #666; margin-top: 5px;';
      speciesContainer.appendChild(speciesHint);

      options.appendChild(speciesContainer);
    }

    this.container.appendChild(options);
    this.renderNavButtons('biosphere');
  }

  private renderNamingStep(): void {
    // Full summary
    const planetInfo = PlanetCreationScreen.PLANET_TYPES[this.selectedPlanetType]!;
    const artStyleInfo = PlanetCreationScreen.ART_STYLES[this.selectedArtStyle]!;

    const summary = document.createElement('div');
    summary.style.cssText = 'display: flex; gap: 15px; margin-bottom: 30px; flex-wrap: wrap;';

    summary.innerHTML = `
      <div style="background: rgba(255, 152, 0, 0.1); border: 1px solid #ff9800; border-radius: 8px; padding: 10px 15px;">
        <div style="color: #ff9800; font-size: 10px;">TYPE</div>
        <div style="color: #fff; font-size: 13px;">${planetInfo.icon} ${planetInfo.name}</div>
      </div>
      <div style="background: rgba(88, 166, 255, 0.1); border: 1px solid #58a6ff; border-radius: 8px; padding: 10px 15px;">
        <div style="color: #58a6ff; font-size: 10px;">STYLE</div>
        <div style="color: #fff; font-size: 13px;">${artStyleInfo.icon} ${artStyleInfo.name}</div>
      </div>
      <div style="background: rgba(76, 175, 80, 0.1); border: 1px solid #4CAF50; border-radius: 8px; padding: 10px 15px;">
        <div style="color: #4CAF50; font-size: 10px;">BIOSPHERE</div>
        <div style="color: #fff; font-size: 13px;">${this.generateBiosphere ? `🦎 ${this.maxSpecies} species` : '🪨 Barren'}</div>
      </div>
    `;
    this.container.appendChild(summary);

    // Name input
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
      max-width: 500px;
      width: 100%;
      background: rgba(30, 30, 50, 0.8);
      border: 1px solid #3a3a5a;
      border-radius: 12px;
      padding: 30px;
    `;

    const label = document.createElement('div');
    label.textContent = 'Name Your Planet';
    label.style.cssText = 'font-size: 18px; color: #fff; margin-bottom: 15px; text-align: center;';
    inputContainer.appendChild(label);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Enter planet name...';
    nameInput.value = this.planetName;
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
      margin-bottom: 15px;
      text-align: center;
    `;
    nameInput.oninput = (e) => {
      this.planetName = (e.target as HTMLInputElement).value;
    };
    inputContainer.appendChild(nameInput);

    const randomBtn = document.createElement('button');
    randomBtn.textContent = '🎲 Generate Name';
    randomBtn.style.cssText = `
      width: 100%;
      padding: 10px;
      font-size: 14px;
      font-family: monospace;
      background: #2a2a4a;
      color: #aaa;
      border: 1px solid #3a3a5a;
      border-radius: 6px;
      cursor: pointer;
    `;
    randomBtn.onclick = () => {
      this.planetName = PlanetCreationScreen.generatePlanetName();
      nameInput.value = this.planetName;
    };
    inputContainer.appendChild(randomBtn);

    this.container.appendChild(inputContainer);
    this.renderNavButtons('naming');
  }

  private renderNavButtons(currentStep: 'type' | 'artstyle' | 'biosphere' | 'naming'): void {
    const steps = ['type', 'artstyle', 'biosphere', 'naming'] as const;
    const currentIndex = steps.indexOf(currentStep);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 20px; margin-top: 30px;';

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 15px 30px;
      font-size: 16px;
      font-family: monospace;
      background: #333;
      color: #888;
      border: 1px solid #555;
      border-radius: 8px;
      cursor: pointer;
    `;
    cancelBtn.onclick = () => {
      if (this.callbacks) this.callbacks.onCancel();
    };
    buttonContainer.appendChild(cancelBtn);

    // Back button (if not first step)
    if (currentIndex > 0) {
      const backBtn = document.createElement('button');
      backBtn.textContent = 'Back';
      backBtn.style.cssText = `
        padding: 15px 30px;
        font-size: 16px;
        font-family: monospace;
        background: #2a2a4a;
        color: #aaa;
        border: 1px solid #3a3a5a;
        border-radius: 8px;
        cursor: pointer;
      `;
      backBtn.onclick = () => {
        this.currentStep = steps[currentIndex - 1]!;
        this.render();
      };
      buttonContainer.appendChild(backBtn);
    }

    // Next/Create button
    if (currentIndex < steps.length - 1) {
      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next';
      nextBtn.style.cssText = `
        padding: 15px 40px;
        font-size: 18px;
        font-family: monospace;
        font-weight: bold;
        background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
        color: #fff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      `;
      nextBtn.onclick = () => {
        this.currentStep = steps[currentIndex + 1]!;
        this.render();
      };
      buttonContainer.appendChild(nextBtn);
    } else {
      // Create button
      const createBtn = document.createElement('button');
      const hasName = this.planetName.trim().length > 0;
      createBtn.textContent = 'Create Planet';
      createBtn.disabled = !hasName;
      createBtn.style.cssText = `
        padding: 15px 40px;
        font-size: 18px;
        font-family: monospace;
        font-weight: bold;
        background: ${hasName ? 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)' : '#333'};
        color: ${hasName ? '#fff' : '#666'};
        border: none;
        border-radius: 8px;
        cursor: ${hasName ? 'pointer' : 'not-allowed'};
      `;
      createBtn.onclick = () => {
        if (!this.planetName.trim() || !this.callbacks) return;

        const seed = Date.now();
        const id = `planet_${this.planetName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${seed.toString(36)}`;

        const config: PlanetConfig = {
          id,
          universeId: this.universeId,
          name: this.planetName.trim(),
          type: this.selectedPlanetType,
          artStyle: this.selectedArtStyle,
          generateBiosphere: this.generateBiosphere,
          maxSpecies: this.maxSpecies,
          seed,
          createdAt: Date.now(),
        };

        this.callbacks.onCreatePlanet(config);
      };
      buttonContainer.appendChild(createBtn);
    }

    this.container.appendChild(buttonContainer);
  }

  destroy(): void {
    this.container.remove();
  }
}
