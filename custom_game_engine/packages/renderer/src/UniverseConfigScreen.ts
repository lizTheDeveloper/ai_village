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
} from '@ai-village/core';

export interface UniverseConfig {
  magicParadigmId: string | null;  // null = no magic (legacy, kept for compatibility)
  magicSpectrum?: MagicSpectrumConfig;  // Full spectrum configuration
  spectrumEffects?: SpectrumEffects;  // Resolved effects from spectrum
  scenarioPresetId: string;  // The first memory / intro scenario
  customScenarioText?: string;  // Custom text when scenarioPresetId is 'custom'
  universeName?: string;
  seed?: number;
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
  private selectedScenario: string = 'cooperative-survival';
  private customScenarioText: string = '';
  private currentStep: 'magic' | 'scenario' = 'magic';  // Magic first, then scenario
  private onCreate: ((config: UniverseConfig) => void) | null = null;

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
      ai_village: { name: 'AI Village', description: 'Rich magic with multiple traditions. Balanced for gameplay.', icon: '🏘️' },
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
      this.container.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); display: none; flex-direction: column; align-items: center; justify-content: flex-start; padding: 40px; box-sizing: border-box; z-index: 10001; font-family: monospace; color: #e0e0e0; overflow-y: auto;`;
      document.body.appendChild(this.container);
    }
    this.render();
  }

  show(onCreateCallback: (config: UniverseConfig) => void): void {
    this.onCreate = onCreateCallback;
    this.container.style.display = 'flex';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private render(): void {
    this.container.innerHTML = '';

    // Step indicator
    const stepIndicator = document.createElement('div');
    stepIndicator.style.cssText = 'display: flex; gap: 20px; justify-content: center; margin-bottom: 20px;';

    const step1 = document.createElement('div');
    step1.textContent = '1. Choose Magic System';
    step1.style.cssText = `padding: 8px 16px; border-radius: 20px; font-size: 14px; cursor: pointer; background: ${this.currentStep === 'magic' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#2a2a4a'}; color: ${this.currentStep === 'magic' ? '#fff' : '#888'};`;
    step1.onclick = () => { this.currentStep = 'magic'; this.render(); };

    const step2 = document.createElement('div');
    step2.textContent = '2. Choose Your Story';
    step2.style.cssText = `padding: 8px 16px; border-radius: 20px; font-size: 14px; cursor: pointer; background: ${this.currentStep === 'scenario' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#2a2a4a'}; color: ${this.currentStep === 'scenario' ? '#fff' : '#888'};`;
    step2.onclick = () => { this.currentStep = 'scenario'; this.render(); };

    stepIndicator.appendChild(step1);
    stepIndicator.appendChild(step2);
    this.container.appendChild(stepIndicator);

    const title = document.createElement('h1');
    title.textContent = 'Create New Universe';
    title.style.cssText = 'margin: 0 0 20px 0; font-size: 36px; text-align: center; color: #ffffff; text-shadow: 0 0 20px rgba(100, 200, 255, 0.5);';
    this.container.appendChild(title);

    if (this.currentStep === 'magic') {
      this.renderMagicStep();
    } else {
      this.renderScenarioStep();
    }
  }

  private renderScenarioStep(): void {
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
    backButton.textContent = 'Back to Magic System';
    backButton.style.cssText = 'padding: 15px 30px; font-size: 16px; font-family: monospace; background: #333; color: #aaa; border: 1px solid #555; border-radius: 8px; cursor: pointer;';
    backButton.onclick = () => { this.currentStep = 'magic'; this.render(); };

    const createButton = document.createElement('button');
    createButton.textContent = 'Create Universe';
    createButton.style.cssText = 'padding: 15px 40px; font-size: 18px; font-family: monospace; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 8px; cursor: pointer;';
    createButton.onclick = () => {
      if (this.onCreate) {
        const firstParadigm = effects.enabledParadigms[0];
        const config: UniverseConfig = {
          magicParadigmId: firstParadigm ?? null,
          magicSpectrum: spectrum,
          spectrumEffects: effects,
          scenarioPresetId: this.selectedScenario,
          seed: Date.now(),
        };
        if (this.selectedScenario === 'custom') {
          config.customScenarioText = this.customScenarioText;
        }
        this.onCreate(config);
        this.hide();
      }
    };

    buttonContainer.appendChild(backButton);
    buttonContainer.appendChild(createButton);
    this.container.appendChild(buttonContainer);
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
    nextButton.textContent = 'Next: Choose Your Story';
    nextButton.style.cssText = 'padding: 15px 40px; font-size: 18px; font-family: monospace; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 8px; cursor: pointer; margin-top: 30px;';
    nextButton.onclick = () => { this.currentStep = 'scenario'; this.render(); };
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
          <div style="font-size: 11px; color: #b388ff; line-height: 1.5;">${effects.availableEntities.map(e => e.replace(/_/g, ' ')).join(', ')}</div>
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

  destroy(): void {
    this.container.remove();
  }
}
