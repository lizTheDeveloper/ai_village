/**
 * Settings Panel UI for configuring LLM provider and other game settings.
 * Uses DOM elements for form inputs, toggled with ESC key.
 */

export interface LLMSettings {
  provider: 'ollama' | 'openai-compat';
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface AgentBehaviorSettings {
  minThinkCadenceSeconds: number;   // Minimum seconds between LLM calls when busy
  idleThinkDelaySeconds: number;    // Delay before LLM call when idle
  enableLLMAgents: boolean;         // Master toggle for LLM agents
}

export interface GameSettings {
  llm: LLMSettings;
  agentBehavior: AgentBehaviorSettings;
  dungeonMasterPrompt: string;
}

// Detect macOS for MLX default
const isMacOS = navigator.platform.toLowerCase().includes('mac');

const DEFAULT_SETTINGS: GameSettings = {
  llm: isMacOS ? {
    provider: 'openai-compat',
    baseUrl: 'http://localhost:8080/v1',
    model: 'mlx-community/Qwen3-4B-Instruct-4bit',
    apiKey: '',
  } : {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'qwen3:1.7b',
    apiKey: '',
  },
  agentBehavior: {
    minThinkCadenceSeconds: 300,  // 5 minutes when busy
    idleThinkDelaySeconds: 5,     // 5 seconds when idle
    enableLLMAgents: true,        // LLM agents enabled by default
  },
  dungeonMasterPrompt: '',
};

// LLM Preset configurations
const PRESETS: Record<string, Partial<LLMSettings>> = {
  'mlx-server': {
    provider: 'openai-compat',
    baseUrl: 'http://localhost:8080/v1',
    model: 'mlx-community/Qwen3-4B-Instruct-4bit',
    apiKey: '', // No API key needed for local MLX server
  },
  'ollama-local': {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'qwen3:1.7b',
  },
  'ollama-openai': {
    provider: 'openai-compat',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen3:4b',
  },
  'groq': {
    provider: 'openai-compat',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'qwen/qwen3-32b',
  },
  'openrouter': {
    provider: 'openai-compat',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct',
  },
};

// Dungeon Master Prompt Presets
const DM_PROMPT_PRESETS: Record<string, string> = {
  'cooperative-survival': 'You all just woke up in this place together, with nothing but berries to survive. Work together and make a village!',
  'hostile-wilderness': 'You wake to find yourself stranded in a dangerous wilderness where the nights are deadly cold and strange creatures watch from the shadows. Trust no one—resources are scarce and winter is coming.',
  'garden-abundance': 'You awaken in a paradise of endless food, perfect weather, and natural shelter. There is no struggle here, only the question of what to create when survival is already assured.',
  'amnesia-mystery': 'You wake with no memory of who you are or how you got here. Strange artifacts lie scattered around you, and distant ruins hint at a civilization that came before. What happened here?',
  'last-survivors': 'You are the last humans on Earth. The old world is ash and ruin. You have each other, your wits, and three days of food. Rebuild civilization or die trying.',
  'divine-experiment': 'You awaken in the Garden, placed here by forces you don\'t understand. You have been given free will, intelligence, and a world to shape. What will you make of this gift?',
  'scientific-expedition': 'Welcome, research team. Your mission: catalog this new biome, establish sustainable operations, and report findings. Remember your training—science and cooperation are humanity\'s greatest tools.',
  'prison-colony': 'You were exiled here as punishment, left to survive or perish beyond the gates. The guards are gone now. Freedom is yours—but can you build something better than what you fled?',
  'resource-rush': 'They say there\'s gold in these hills, ancient technology in those ruins, and rare plants in that forest. You all got here first. The question is: will you share the wealth, or fight for it?',
  'prophecy': 'The old texts spoke of this day—when the chosen ones would awaken in the sacred valley and fulfill an ancient purpose. You are those ones. But the prophecy never said what you\'re meant to do.',
  'social-experiment': 'You are participants in the greatest social experiment ever conducted. Observers are watching, recording everything. Build a society worthy of study. Or don\'t. The choice—and the consequences—are yours.',
};

export class SettingsPanel {
  private container: HTMLDivElement | null = null;
  private isVisible = false;
  private settings: GameSettings;
  private onSettingsChange: ((settings: GameSettings) => void) | null = null;
  private isFirstRun = false;

  constructor() {
    this.settings = this.loadSettings();
    // Check if this is first run (no DM prompt set)
    this.isFirstRun = !this.settings.dungeonMasterPrompt || this.settings.dungeonMasterPrompt.trim() === '';
  }

  /**
   * Check if this is the first run (no DM prompt set)
   */
  getIsFirstRun(): boolean {
    return this.isFirstRun;
  }

  /**
   * Set callback for when settings change
   */
  setOnSettingsChange(callback: (settings: GameSettings) => void): void {
    this.onSettingsChange = callback;
  }

  /**
   * Get current settings
   */
  getSettings(): GameSettings {
    return this.settings;
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): GameSettings {
    try {
      const saved = localStorage.getItem('ai-village-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          llm: { ...DEFAULT_SETTINGS.llm, ...parsed.llm },
          agentBehavior: { ...DEFAULT_SETTINGS.agentBehavior, ...parsed.agentBehavior },
        };
      }
    } catch (e) {
      console.warn('[SettingsPanel] Failed to load settings:', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('ai-village-settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[SettingsPanel] Failed to save settings:', e);
    }
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show the settings panel
   */
  show(): void {
    if (this.isVisible) return;
    this.isVisible = true;
    this.createPanel();
  }

  /**
   * Hide the settings panel
   */
  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.destroyPanel();
  }

  /**
   * Check if panel is visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Create the settings panel DOM elements
   */
  private createPanel(): void {
    // Create overlay
    this.container = document.createElement('div');
    this.container.id = 'settings-panel-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create panel
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #1a1a2e;
      border: 2px solid #4a4a6a;
      border-radius: 12px;
      padding: 24px;
      min-width: 450px;
      max-width: 500px;
      max-height: 85vh;
      overflow-y: auto;
      color: #e0e0e0;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #4a4a6a;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Settings';
    title.style.cssText = 'margin: 0; font-size: 20px; color: #fff;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'ESC';
    closeBtn.style.cssText = `
      background: #333;
      border: 1px solid #555;
      color: #aaa;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      ${this.isFirstRun ? 'display: none;' : ''}
    `;
    closeBtn.onclick = () => {
      if (!this.isFirstRun) {
        this.hide();
      }
    };

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // LLM Settings Section
    const llmSection = document.createElement('div');
    llmSection.innerHTML = '<h3 style="margin: 0 0 12px 0; font-size: 14px; color: #8a8aaa; text-transform: uppercase;">LLM Provider</h3>';

    // Preset selector
    const presetGroup = this.createFormGroup('Preset', 'select');
    const presetSelect = presetGroup.querySelector('select')!;
    presetSelect.innerHTML = `
      <option value="">Custom</option>
      <option value="ollama-local">Ollama (Local API)</option>
      <option value="ollama-openai">Ollama (OpenAI-compat)</option>
      <option value="groq">Groq Cloud</option>
      <option value="openrouter">OpenRouter</option>
    `;
    presetSelect.onchange = () => {
      const preset = PRESETS[presetSelect.value];
      if (preset) {
        this.settings.llm = { ...this.settings.llm, ...preset };
        this.updateFormValues();
      }
    };
    llmSection.appendChild(presetGroup);

    // Provider type
    const providerGroup = this.createFormGroup('API Type', 'select');
    const providerSelect = providerGroup.querySelector('select')!;
    providerSelect.id = 'settings-provider';
    providerSelect.innerHTML = `
      <option value="ollama">Ollama Native API</option>
      <option value="openai-compat">OpenAI Compatible</option>
    `;
    providerSelect.value = this.settings.llm.provider;
    providerSelect.onchange = () => {
      this.settings.llm.provider = providerSelect.value as 'ollama' | 'openai-compat';
    };
    llmSection.appendChild(providerGroup);

    // Base URL
    const urlGroup = this.createFormGroup('Base URL', 'text');
    const urlInput = urlGroup.querySelector('input')!;
    urlInput.id = 'settings-url';
    urlInput.value = this.settings.llm.baseUrl;
    urlInput.placeholder = 'http://localhost:11434 or https://api.groq.com/openai/v1';
    urlInput.onchange = () => {
      this.settings.llm.baseUrl = urlInput.value;
    };
    llmSection.appendChild(urlGroup);

    // Model
    const modelGroup = this.createFormGroup('Model', 'text');
    const modelInput = modelGroup.querySelector('input')!;
    modelInput.id = 'settings-model';
    modelInput.value = this.settings.llm.model;
    modelInput.placeholder = isMacOS ? 'mlx-community/Qwen3-4B-Instruct-4bit' : 'qwen3:1.7b or qwen3:0.6b';
    modelInput.onchange = () => {
      this.settings.llm.model = modelInput.value;
    };
    llmSection.appendChild(modelGroup);

    // API Key
    const apiKeyGroup = this.createFormGroup('API Key (optional)', 'password');
    const apiKeyInput = apiKeyGroup.querySelector('input')!;
    apiKeyInput.id = 'settings-apikey';
    apiKeyInput.value = this.settings.llm.apiKey;
    apiKeyInput.placeholder = 'Required for Groq, OpenRouter, etc.';
    apiKeyInput.onchange = () => {
      this.settings.llm.apiKey = apiKeyInput.value;
    };
    llmSection.appendChild(apiKeyGroup);

    panel.appendChild(llmSection);

    // Agent Behavior Section
    const behaviorSection = document.createElement('div');
    behaviorSection.style.cssText = 'margin-top: 20px;';
    behaviorSection.innerHTML = '<h3 style="margin: 0 0 12px 0; font-size: 14px; color: #8a8aaa; text-transform: uppercase;">Agent Behavior</h3>';

    // Enable LLM Agents toggle
    const enableLLMGroup = document.createElement('div');
    enableLLMGroup.style.cssText = 'margin-bottom: 12px; display: flex; align-items: center; gap: 8px;';
    const enableLLMCheckbox = document.createElement('input');
    enableLLMCheckbox.type = 'checkbox';
    enableLLMCheckbox.id = 'settings-enable-llm';
    enableLLMCheckbox.checked = this.settings.agentBehavior.enableLLMAgents;
    enableLLMCheckbox.onchange = () => {
      this.settings.agentBehavior.enableLLMAgents = enableLLMCheckbox.checked;
    };
    const enableLLMLabel = document.createElement('label');
    enableLLMLabel.htmlFor = 'settings-enable-llm';
    enableLLMLabel.textContent = 'Enable LLM-powered agents';
    enableLLMLabel.style.cssText = 'font-size: 13px; color: #ccc; cursor: pointer;';
    enableLLMGroup.appendChild(enableLLMCheckbox);
    enableLLMGroup.appendChild(enableLLMLabel);
    behaviorSection.appendChild(enableLLMGroup);

    // Min think cadence (when busy)
    const cadenceGroup = this.createFormGroup('Min think interval when busy (seconds)', 'text');
    const cadenceInput = cadenceGroup.querySelector('input')!;
    cadenceInput.id = 'settings-min-cadence';
    cadenceInput.type = 'number';
    cadenceInput.min = '10';
    cadenceInput.max = '3600';
    cadenceInput.value = String(this.settings.agentBehavior.minThinkCadenceSeconds);
    cadenceInput.onchange = () => {
      const val = parseInt(cadenceInput.value, 10);
      if (!isNaN(val) && val >= 10) {
        this.settings.agentBehavior.minThinkCadenceSeconds = val;
      }
    };
    behaviorSection.appendChild(cadenceGroup);

    // Idle think delay
    const idleDelayGroup = this.createFormGroup('Think delay when idle (seconds)', 'text');
    const idleDelayInput = idleDelayGroup.querySelector('input')!;
    idleDelayInput.id = 'settings-idle-delay';
    idleDelayInput.type = 'number';
    idleDelayInput.min = '1';
    idleDelayInput.max = '60';
    idleDelayInput.value = String(this.settings.agentBehavior.idleThinkDelaySeconds);
    idleDelayInput.onchange = () => {
      const val = parseInt(idleDelayInput.value, 10);
      if (!isNaN(val) && val >= 1) {
        this.settings.agentBehavior.idleThinkDelaySeconds = val;
      }
    };
    behaviorSection.appendChild(idleDelayGroup);

    // Help text for behavior section
    const behaviorHelp = document.createElement('p');
    behaviorHelp.style.cssText = 'margin: 8px 0 0 0; font-size: 11px; color: #666; font-style: italic;';
    behaviorHelp.textContent = 'Higher intervals = fewer LLM calls. Agents work autonomously between thinks.';
    behaviorSection.appendChild(behaviorHelp);

    panel.appendChild(behaviorSection);

    // Dungeon Master Prompt Section
    const dmSection = document.createElement('div');
    dmSection.style.cssText = 'margin-top: 20px;';
    dmSection.innerHTML = '<h3 style="margin: 0 0 12px 0; font-size: 14px; color: #8a8aaa; text-transform: uppercase;">Dungeon Master Prompt</h3>';

    // DM Preset selector
    const dmPresetGroup = this.createFormGroup('Scenario Preset', 'select');
    const dmPresetSelect = dmPresetGroup.querySelector('select')!;
    dmPresetSelect.id = 'settings-dm-preset';
    dmPresetSelect.innerHTML = `
      <option value="">Custom (Write Your Own)</option>
      <option value="cooperative-survival">🤝 Cooperative Survival (Default)</option>
      <option value="hostile-wilderness">❄️ Hostile Wilderness (Paranoid)</option>
      <option value="garden-abundance">🌸 Garden of Abundance (Utopian)</option>
      <option value="amnesia-mystery">🔍 Amnesia Mystery (Investigation)</option>
      <option value="last-survivors">💀 Last Survivors (Post-Apocalyptic)</option>
      <option value="divine-experiment">✨ Divine Experiment (Philosophical)</option>
      <option value="scientific-expedition">🔬 Scientific Expedition (Methodical)</option>
      <option value="prison-colony">⛓️ Prison Colony (Escape/Rebuild)</option>
      <option value="resource-rush">💰 Resource Rush (Competition)</option>
      <option value="prophecy">📜 The Prophecy (Destiny)</option>
      <option value="social-experiment">🎭 Social Experiment (Meta)</option>
    `;
    dmPresetSelect.onchange = () => {
      const preset = DM_PROMPT_PRESETS[dmPresetSelect.value];
      if (preset) {
        this.settings.dungeonMasterPrompt = preset;
        const dmTextarea = document.getElementById('settings-dm-prompt') as HTMLTextAreaElement;
        if (dmTextarea) {
          dmTextarea.value = preset;
        }
      }
    };
    dmSection.appendChild(dmPresetGroup);

    const dmGroup = this.createFormGroup('Starting Memory (what agents remember when they wake up)', 'textarea');
    const dmTextarea = dmGroup.querySelector('textarea')!;
    dmTextarea.id = 'settings-dm-prompt';
    dmTextarea.value = this.settings.dungeonMasterPrompt;
    dmTextarea.placeholder = 'Select a preset above or write your own...';
    dmTextarea.rows = 4;
    dmTextarea.style.cssText = `
      width: 100%;
      padding: 10px;
      background: #0d0d1a;
      border: 1px solid #4a4a6a;
      border-radius: 6px;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 13px;
      resize: vertical;
    `;
    dmTextarea.oninput = () => {
      this.settings.dungeonMasterPrompt = dmTextarea.value;
      // Reset preset selector to "Custom" when user types
      const dmPresetSelect = document.getElementById('settings-dm-preset') as HTMLSelectElement;
      if (dmPresetSelect && !Object.values(DM_PROMPT_PRESETS).includes(dmTextarea.value)) {
        dmPresetSelect.value = '';
      }
    };
    dmSection.appendChild(dmGroup);

    panel.appendChild(dmSection);

    // Buttons
    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #4a4a6a;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      background: #333;
      border: 1px solid #555;
      color: #ccc;
      padding: 8px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      ${this.isFirstRun ? 'display: none;' : ''}
    `;
    cancelBtn.onclick = () => {
      if (!this.isFirstRun) {
        this.settings = this.loadSettings(); // Revert
        this.hide();
      }
    };

    const saveBtn = document.createElement('button');
    saveBtn.id = 'settings-save-btn';
    saveBtn.textContent = this.isFirstRun ? 'Start Game' : 'Save & Apply';
    saveBtn.style.cssText = `
      background: #4a7c59;
      border: none;
      color: #fff;
      padding: 8px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    `;

    // Validation function
    const validateAndSave = () => {
      const prompt = this.settings.dungeonMasterPrompt.trim();
      if (!prompt) {
        alert('⚠️ Please select a scenario preset or write your own Dungeon Master prompt before starting the game.');
        return;
      }

      this.saveSettings();
      this.isFirstRun = false;
      if (this.onSettingsChange) {
        this.onSettingsChange(this.settings);
      }
      this.hide();
    };

    saveBtn.onclick = validateAndSave;

    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(saveBtn);
    panel.appendChild(buttonRow);

    // Help text
    const helpText = document.createElement('p');
    helpText.style.cssText = `
      margin: 16px 0 0 0;
      font-size: 11px;
      color: #666;
      text-align: center;
    `;
    if (this.isFirstRun) {
      helpText.innerHTML = '🎮 <strong>Welcome to AI Village!</strong> Select a scenario preset to see how different starting conditions create wildly different emergent behaviors.';
      helpText.style.color = '#8a8aaa';
    } else {
      helpText.textContent = 'Changes take effect immediately. Page reload recommended for clean state.';
    }
    panel.appendChild(helpText);

    this.container.appendChild(panel);
    document.body.appendChild(this.container);

    // Close on click outside (unless first run)
    this.container.onclick = (e) => {
      if (e.target === this.container && !this.isFirstRun) {
        this.hide();
      }
    };
  }

  /**
   * Update form values from current settings
   */
  private updateFormValues(): void {
    const providerSelect = document.getElementById('settings-provider') as HTMLSelectElement;
    const urlInput = document.getElementById('settings-url') as HTMLInputElement;
    const modelInput = document.getElementById('settings-model') as HTMLInputElement;
    const apiKeyInput = document.getElementById('settings-apikey') as HTMLInputElement;

    if (providerSelect) providerSelect.value = this.settings.llm.provider;
    if (urlInput) urlInput.value = this.settings.llm.baseUrl;
    if (modelInput) modelInput.value = this.settings.llm.model;
    if (apiKeyInput) apiKeyInput.value = this.settings.llm.apiKey;
  }

  /**
   * Create a form group with label and input
   */
  private createFormGroup(label: string, type: 'text' | 'password' | 'select' | 'textarea'): HTMLDivElement {
    const group = document.createElement('div');
    group.style.cssText = 'margin-bottom: 12px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      display: block;
      margin-bottom: 4px;
      font-size: 12px;
      color: #aaa;
    `;
    group.appendChild(labelEl);

    const inputStyle = `
      width: 100%;
      padding: 8px 12px;
      background: #252538;
      border: 1px solid #4a4a6a;
      border-radius: 6px;
      color: #fff;
      font-size: 14px;
      box-sizing: border-box;
    `;

    if (type === 'select') {
      const select = document.createElement('select');
      select.style.cssText = inputStyle;
      group.appendChild(select);
    } else if (type === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.style.cssText = inputStyle;
      group.appendChild(textarea);
    } else {
      const input = document.createElement('input');
      input.type = type;
      input.style.cssText = inputStyle;
      group.appendChild(input);
    }

    return group;
  }

  /**
   * Destroy the settings panel DOM elements
   */
  private destroyPanel(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
