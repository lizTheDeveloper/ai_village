/**
 * UniverseCreationScreen - Create a new universe with magic laws
 *
 * This screen handles ONLY universe-level creation:
 * - Magic system configuration (determines what's possible)
 * - Universe naming (with Fate blessings)
 * - Cosmic deity spawning (Fates, God of Death, etc.)
 *
 * Planets are created separately via PlanetCreationScreen.
 */

import {
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

export interface CreatedUniverseConfig {
  /** Unique universe identifier */
  id: string;
  /** Universe display name */
  name: string;
  /** Magic spectrum configuration */
  magicSpectrum: MagicSpectrumConfig;
  /** Resolved effects from the spectrum */
  spectrumEffects: SpectrumEffects;
  /** Cosmic deities to spawn */
  cosmicDeities: CosmicDeityConfig[];
  /** Creation timestamp */
  createdAt: number;
  /** Random seed for deterministic generation */
  seed: number;
}

export interface CosmicDeityConfig {
  id: string;
  name: string;
  title: string;
  domain: string;
  description: string;
  spawnOnCreation: boolean;
}

// Default cosmic deities that exist in every universe
const DEFAULT_COSMIC_DEITIES: CosmicDeityConfig[] = [
  {
    id: 'fate_clotho',
    name: 'Clotho',
    title: 'The Spinner',
    domain: 'Birth and Beginnings',
    description: 'She who spins the thread of life for all beings.',
    spawnOnCreation: true,
  },
  {
    id: 'fate_lachesis',
    name: 'Lachesis',
    title: 'The Allotter',
    domain: 'Life and Destiny',
    description: 'She who measures the thread and determines each being\'s fate.',
    spawnOnCreation: true,
  },
  {
    id: 'fate_atropos',
    name: 'Atropos',
    title: 'The Inflexible',
    domain: 'Death and Endings',
    description: 'She who cuts the thread, bringing all things to their end.',
    spawnOnCreation: true,
  },
  {
    id: 'thanatos',
    name: 'Thanatos',
    title: 'God of Death',
    domain: 'Peaceful Death',
    description: 'The gentle guide who leads souls to their rest.',
    spawnOnCreation: true,
  },
];

export class UniverseCreationScreen {
  private container: HTMLElement;
  private currentStep: 'magic' | 'deities' | 'naming' = 'magic';
  private selectedSpectrumPreset: string = 'ai_village';
  private showAdvancedSpectrum: boolean = false;
  private customIntensity: MagicalIntensity = 'high';
  private customSources: MagicSourceOrigin[] = ['internal', 'divine', 'knowledge'];
  private customFormality: MagicFormality = 'trained';
  private customAnimism: AnimismLevel = 'elemental';
  private universeName: string = '';
  private fateSuffix: string = '';
  private selectedDeities: Set<string> = new Set(DEFAULT_COSMIC_DEITIES.map(d => d.id));

  private _onCreate: ((config: CreatedUniverseConfig) => void) | null = null;

  // Universe name generation
  private static readonly UNIVERSE_PREFIXES = [
    'Ae', 'Val', 'Cel', 'Eld', 'Ara', 'Nym', 'Ith', 'Zeph', 'Mor', 'Syl',
    'Thal', 'Ven', 'Kyr', 'Orn', 'Pha', 'Elu', 'Ast', 'Vor', 'Kal', 'Lum',
  ];
  private static readonly UNIVERSE_MIDDLES = [
    'ther', 'an', 'est', 'or', 'un', 'ar', 'el', 'en', 'os', 'al',
  ];
  private static readonly UNIVERSE_ENDINGS = [
    'ia', 'os', 'is', 'um', 'a', 'on', 'heim', 'thas', 'ael', 'ion',
  ];
  private static readonly FATE_SUFFIXES = [
    'of the Eternal Dawn',
    'where Stars Remember',
    'of Whispered Dreams',
    'beneath the Silver Moon',
    'of the Wandering Souls',
    'where Time Dances',
    'of the Sacred Flame',
    'where Shadows Sing',
  ];

  constructor(containerId: string = 'universe-creation-screen') {
    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'universe-creation-screen';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
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

  show(onCreateCallback: (config: CreatedUniverseConfig) => void): void {
    this._onCreate = onCreateCallback;
    this.currentStep = 'magic';
    this.container.style.display = 'flex';
    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private getCurrentSpectrum(): MagicSpectrumConfig {
    if (this.showAdvancedSpectrum) {
      return {
        intensity: this.customIntensity,
        sources: this.customSources,
        formality: this.customFormality,
        animism: this.customAnimism,
      };
    }
    return getPreset(this.selectedSpectrumPreset as keyof typeof SPECTRUM_PRESETS);
  }

  private getSpectrumPresetInfo(presetId: string): { name: string; description: string; icon: string } {
    const meta: Record<string, { name: string; description: string; icon: string }> = {
      mundane: { name: 'Mundane World', description: 'No magic exists. Pure technology and science.', icon: '🌍' },
      low_fantasy: { name: 'Low Fantasy', description: 'Magic is rare and subtle.', icon: '🌙' },
      classic_fantasy: { name: 'Classic Fantasy', description: 'Multiple magic traditions flourish.', icon: '⚔️' },
      mythic: { name: 'Mythic', description: 'Gods walk among mortals.', icon: '⚡' },
      shinto_animism: { name: 'Shinto Animism', description: 'Everything has a spirit.', icon: '🌸' },
      hard_magic: { name: 'Hard Magic', description: 'Magic follows strict rules.', icon: '⚙️' },
      literary_surrealism: { name: 'Literary Surrealism', description: 'Words have weight.', icon: '📚' },
      wild_magic: { name: 'Wild Magic', description: 'Chaotic and unpredictable.', icon: '🌀' },
      dead_magic: { name: 'Dead Magic', description: 'Magic once existed but is gone.', icon: '💀' },
      ai_village: { name: 'Multiverse Standard', description: 'Rich magic with balance.', icon: '🏘️' },
    };
    return meta[presetId] || { name: presetId, description: '', icon: '✨' };
  }

  private static generateUniverseName(): string {
    const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
    const prefix = pick(UniverseCreationScreen.UNIVERSE_PREFIXES);
    const middle = pick(UniverseCreationScreen.UNIVERSE_MIDDLES);
    const ending = pick(UniverseCreationScreen.UNIVERSE_ENDINGS);
    return `${prefix}${middle}${ending}`;
  }

  private render(): void {
    this.container.innerHTML = '';

    // Step indicator
    const steps = ['magic', 'deities', 'naming'] as const;
    const stepLabels = { magic: 'Magic Laws', deities: 'Cosmic Beings', naming: 'Name Universe' };

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
        background: ${isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#2a2a4a'};
        color: ${isActive ? '#fff' : '#888'};
      `;
      stepDiv.onclick = () => { this.currentStep = step; this.render(); };
      stepIndicator.appendChild(stepDiv);
    });

    this.container.appendChild(stepIndicator);

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Create New Universe';
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 36px;
      text-align: center;
      color: #ffffff;
      text-shadow: 0 0 20px rgba(100, 200, 255, 0.5);
    `;
    this.container.appendChild(title);

    // Render current step
    if (this.currentStep === 'magic') {
      this.renderMagicStep();
    } else if (this.currentStep === 'deities') {
      this.renderDeitiesStep();
    } else {
      this.renderNamingStep();
    }
  }

  private renderMagicStep(): void {
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Configure the magical laws that will govern this reality';
    subtitle.style.cssText = 'margin: 0 0 30px 0; font-size: 14px; text-align: center; color: #aaa;';
    this.container.appendChild(subtitle);

    // Preset grid
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      max-width: 1200px;
      width: 100%;
      margin-bottom: 20px;
    `;

    for (const presetId of getPresetNames()) {
      const info = this.getSpectrumPresetInfo(presetId);
      const isSelected = this.selectedSpectrumPreset === presetId && !this.showAdvancedSpectrum;

      const card = document.createElement('div');
      card.style.cssText = `
        background: ${isSelected ? 'linear-gradient(135deg, #2a4a4a 0%, #1e3a3a 100%)' : 'rgba(30, 30, 50, 0.8)'};
        border: 2px solid ${isSelected ? '#4CAF50' : '#3a3a5a'};
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s;
      `;
      card.onclick = () => {
        this.selectedSpectrumPreset = presetId;
        this.showAdvancedSpectrum = false;
        this.render();
      };

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <span style="font-size: 28px;">${info.icon}</span>
          <h3 style="margin: 0; font-size: 18px; color: ${isSelected ? '#4CAF50' : '#fff'};">${info.name}</h3>
        </div>
        <p style="margin: 0; font-size: 13px; color: #bbb;">${info.description}</p>
        ${isSelected ? '<div style="position: absolute; top: 10px; right: 10px; color: #4CAF50;">✓</div>' : ''}
      `;
      card.style.position = 'relative';

      grid.appendChild(card);
    }

    this.container.appendChild(grid);

    // Show enabled paradigms
    this.renderEnabledParadigms();

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next: Cosmic Beings';
    nextBtn.style.cssText = `
      padding: 15px 40px;
      font-size: 18px;
      font-family: monospace;
      font-weight: bold;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 30px;
    `;
    nextBtn.onclick = () => { this.currentStep = 'deities'; this.render(); };
    this.container.appendChild(nextBtn);
  }

  private renderEnabledParadigms(): void {
    const spectrum = this.getCurrentSpectrum();
    const effects = resolveSpectrum(spectrum);

    const container = document.createElement('div');
    container.style.cssText = `
      max-width: 1200px;
      width: 100%;
      background: rgba(20, 30, 20, 0.8);
      border: 1px solid #4CAF50;
      border-radius: 12px;
      padding: 20px;
      margin-top: 20px;
    `;

    const header = document.createElement('h3');
    header.textContent = `Enabled Magic Systems (${effects.enabledParadigms.length})`;
    header.style.cssText = 'margin: 0 0 15px 0; font-size: 16px; color: #4CAF50;';
    container.appendChild(header);

    if (effects.enabledParadigms.length > 0) {
      const tags = document.createElement('div');
      tags.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px;';
      for (const p of effects.enabledParadigms) {
        tags.innerHTML += `<span style="font-size: 11px; padding: 4px 10px; border-radius: 12px; background: rgba(76, 175, 80, 0.2); color: #8fdf8f; text-transform: capitalize;">${p}</span>`;
      }
      container.appendChild(tags);
    }

    this.container.appendChild(container);
  }

  private renderDeitiesStep(): void {
    const spectrum = this.getCurrentSpectrum();
    const presetInfo = this.getSpectrumPresetInfo(this.selectedSpectrumPreset);

    // Magic summary
    const summary = document.createElement('div');
    summary.style.cssText = `
      background: rgba(76, 175, 80, 0.1);
      border: 1px solid #4CAF50;
      border-radius: 8px;
      padding: 15px;
      max-width: 600px;
      margin-bottom: 20px;
    `;
    summary.innerHTML = `
      <div style="color: #4CAF50; font-size: 12px; margin-bottom: 5px;">MAGIC LAWS</div>
      <div style="color: #fff; font-size: 16px; font-weight: bold;">${presetInfo.icon} ${presetInfo.name}</div>
    `;
    this.container.appendChild(summary);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'These cosmic beings will exist in your universe from the moment of creation';
    subtitle.style.cssText = 'margin: 0 0 30px 0; font-size: 14px; text-align: center; color: #aaa;';
    this.container.appendChild(subtitle);

    // Deity cards
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      max-width: 1200px;
      width: 100%;
    `;

    for (const deity of DEFAULT_COSMIC_DEITIES) {
      const isSelected = this.selectedDeities.has(deity.id);

      const card = document.createElement('div');
      card.style.cssText = `
        background: ${isSelected ? 'rgba(156, 39, 176, 0.2)' : 'rgba(30, 30, 50, 0.8)'};
        border: 2px solid ${isSelected ? '#9c27b0' : '#3a3a5a'};
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s;
        position: relative;
      `;
      card.onclick = () => {
        if (this.selectedDeities.has(deity.id)) {
          this.selectedDeities.delete(deity.id);
        } else {
          this.selectedDeities.add(deity.id);
        }
        this.render();
      };

      const domainIcons: Record<string, string> = {
        'Birth and Beginnings': '🌅',
        'Life and Destiny': '📜',
        'Death and Endings': '⚰️',
        'Peaceful Death': '🕊️',
      };

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <span style="font-size: 28px;">${domainIcons[deity.domain] || '✨'}</span>
          <div>
            <h3 style="margin: 0; font-size: 18px; color: ${isSelected ? '#9c27b0' : '#fff'};">${deity.name}</h3>
            <div style="font-size: 12px; color: #888;">${deity.title}</div>
          </div>
        </div>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #bbb;">${deity.description}</p>
        <div style="font-size: 11px; color: #666;">Domain: ${deity.domain}</div>
        ${isSelected ? '<div style="position: absolute; top: 10px; right: 10px; background: #9c27b0; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 11px;">✓ Included</div>' : ''}
      `;

      grid.appendChild(card);
    }

    this.container.appendChild(grid);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 20px; margin-top: 30px;';

    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back to Magic Laws';
    backBtn.style.cssText = `
      padding: 15px 30px;
      font-size: 16px;
      font-family: monospace;
      background: #333;
      color: #aaa;
      border: 1px solid #555;
      border-radius: 8px;
      cursor: pointer;
    `;
    backBtn.onclick = () => { this.currentStep = 'magic'; this.render(); };

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next: Name Universe';
    nextBtn.style.cssText = `
      padding: 15px 40px;
      font-size: 18px;
      font-family: monospace;
      font-weight: bold;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    `;
    nextBtn.onclick = () => { this.currentStep = 'naming'; this.render(); };

    buttonContainer.appendChild(backBtn);
    buttonContainer.appendChild(nextBtn);
    this.container.appendChild(buttonContainer);
  }

  private renderNamingStep(): void {
    const spectrum = this.getCurrentSpectrum();
    const effects = resolveSpectrum(spectrum);
    const presetInfo = this.getSpectrumPresetInfo(this.selectedSpectrumPreset);

    // Summary
    const summary = document.createElement('div');
    summary.style.cssText = 'display: flex; gap: 15px; max-width: 800px; margin-bottom: 30px;';

    const magicSummary = document.createElement('div');
    magicSummary.style.cssText = 'flex: 1; background: rgba(76, 175, 80, 0.1); border: 1px solid #4CAF50; border-radius: 8px; padding: 12px;';
    magicSummary.innerHTML = `
      <div style="color: #4CAF50; font-size: 11px;">MAGIC</div>
      <div style="color: #fff; font-size: 14px;">${presetInfo.icon} ${presetInfo.name}</div>
    `;

    const deitySummary = document.createElement('div');
    deitySummary.style.cssText = 'flex: 1; background: rgba(156, 39, 176, 0.1); border: 1px solid #9c27b0; border-radius: 8px; padding: 12px;';
    deitySummary.innerHTML = `
      <div style="color: #9c27b0; font-size: 11px;">COSMIC BEINGS</div>
      <div style="color: #fff; font-size: 14px;">${this.selectedDeities.size} deities</div>
    `;

    summary.appendChild(magicSummary);
    summary.appendChild(deitySummary);
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
    inputContainer.style.cssText = `
      max-width: 600px;
      width: 100%;
      background: rgba(30, 30, 50, 0.8);
      border: 1px solid #3a3a5a;
      border-radius: 12px;
      padding: 30px;
    `;

    // Name input
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
    };
    inputContainer.appendChild(nameInput);

    // Generate random name button
    const randomBtn = document.createElement('button');
    randomBtn.textContent = '🎲 Generate Name';
    randomBtn.style.cssText = `
      padding: 8px 16px;
      font-size: 12px;
      font-family: monospace;
      background: #2a2a4a;
      color: #aaa;
      border: 1px solid #3a3a5a;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 20px;
    `;
    randomBtn.onclick = () => {
      this.universeName = UniverseCreationScreen.generateUniverseName();
      nameInput.value = this.universeName;
    };
    inputContainer.appendChild(randomBtn);

    // Fate suffix selector
    const fateLabel = document.createElement('div');
    fateLabel.textContent = 'The Fates Add:';
    fateLabel.style.cssText = 'font-size: 14px; color: #aaa; margin-bottom: 10px;';
    inputContainer.appendChild(fateLabel);

    const fateContainer = document.createElement('div');
    fateContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;';

    if (!this.fateSuffix) {
      this.fateSuffix = UniverseCreationScreen.FATE_SUFFIXES[0]!;
    }

    for (const suffix of UniverseCreationScreen.FATE_SUFFIXES) {
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
    inputContainer.appendChild(fateContainer);

    // Preview
    const fullName = this.universeName
      ? `${this.universeName} ${this.fateSuffix}`
      : `[Your Name] ${this.fateSuffix}`;

    const preview = document.createElement('div');
    preview.style.cssText = `
      padding: 20px;
      background: linear-gradient(135deg, rgba(156, 39, 176, 0.2) 0%, rgba(103, 58, 183, 0.2) 100%);
      border: 2px solid rgba(156, 39, 176, 0.5);
      border-radius: 10px;
      text-align: center;
    `;
    preview.innerHTML = `
      <div style="font-size: 22px; color: #fff; font-weight: bold; text-shadow: 0 0 15px rgba(156, 39, 176, 0.5);">${fullName}</div>
      <div style="font-size: 12px; color: #9c27b0; margin-top: 8px;">✨ Blessed by Clotho, Lachesis, and Atropos ✨</div>
    `;
    inputContainer.appendChild(preview);

    this.container.appendChild(inputContainer);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 20px; margin-top: 30px;';

    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back to Cosmic Beings';
    backBtn.style.cssText = `
      padding: 15px 30px;
      font-size: 16px;
      font-family: monospace;
      background: #333;
      color: #aaa;
      border: 1px solid #555;
      border-radius: 8px;
      cursor: pointer;
    `;
    backBtn.onclick = () => { this.currentStep = 'deities'; this.render(); };

    const createBtn = document.createElement('button');
    const hasName = this.universeName.trim().length > 0;
    createBtn.textContent = 'Create Universe';
    createBtn.disabled = !hasName;
    createBtn.style.cssText = `
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
    createBtn.onclick = () => {
      if (!this.universeName.trim() || !this._onCreate) return;

      const spectrum = this.getCurrentSpectrum();
      const effects = resolveSpectrum(spectrum);
      const fullName = `${this.universeName.trim()} ${this.fateSuffix}`;
      const seed = Date.now();

      // Generate universe ID from name + seed
      const id = `universe_${fullName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${seed.toString(36)}`;

      const config: CreatedUniverseConfig = {
        id,
        name: fullName,
        magicSpectrum: spectrum,
        spectrumEffects: effects,
        cosmicDeities: DEFAULT_COSMIC_DEITIES.filter(d => this.selectedDeities.has(d.id)),
        createdAt: Date.now(),
        seed,
      };

      this._onCreate(config);
    };

    buttonContainer.appendChild(backBtn);
    buttonContainer.appendChild(createBtn);
    this.container.appendChild(buttonContainer);
  }

  destroy(): void {
    this.container.remove();
  }
}
