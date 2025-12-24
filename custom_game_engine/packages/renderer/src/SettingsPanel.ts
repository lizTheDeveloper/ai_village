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

export interface GameSettings {
  llm: LLMSettings;
  dungeonMasterPrompt: string;
}

const DEFAULT_SETTINGS: GameSettings = {
  llm: {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'qwen3:4b',
    apiKey: '',
  },
  dungeonMasterPrompt: 'You all just woke up in this place together, with nothing but berries to survive. Work together and make a village!',
};

// Preset configurations
const PRESETS: Record<string, Partial<LLMSettings>> = {
  'ollama-local': {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'qwen3:4b',
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

export class SettingsPanel {
  private container: HTMLDivElement | null = null;
  private isVisible = false;
  private settings: GameSettings;
  private onSettingsChange: ((settings: GameSettings) => void) | null = null;

  constructor() {
    this.settings = this.loadSettings();
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
        return { ...DEFAULT_SETTINGS, ...parsed, llm: { ...DEFAULT_SETTINGS.llm, ...parsed.llm } };
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
      console.log('[SettingsPanel] Settings saved:', this.settings);
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
    `;
    closeBtn.onclick = () => this.hide();

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
    modelInput.placeholder = 'qwen3:4b or llama-3.3-70b-versatile';
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

    // Dungeon Master Prompt Section
    const dmSection = document.createElement('div');
    dmSection.style.cssText = 'margin-top: 20px;';
    dmSection.innerHTML = '<h3 style="margin: 0 0 12px 0; font-size: 14px; color: #8a8aaa; text-transform: uppercase;">Dungeon Master Prompt</h3>';

    const dmGroup = this.createFormGroup('Starting Memory (what agents remember when they wake up)', 'textarea');
    const dmTextarea = dmGroup.querySelector('textarea')!;
    dmTextarea.id = 'settings-dm-prompt';
    dmTextarea.value = this.settings.dungeonMasterPrompt;
    dmTextarea.placeholder = 'You all just woke up in this place together...';
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
    dmTextarea.onchange = () => {
      this.settings.dungeonMasterPrompt = dmTextarea.value;
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
    `;
    cancelBtn.onclick = () => {
      this.settings = this.loadSettings(); // Revert
      this.hide();
    };

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save & Apply';
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
    saveBtn.onclick = () => {
      this.saveSettings();
      if (this.onSettingsChange) {
        this.onSettingsChange(this.settings);
      }
      this.hide();
    };

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
    helpText.textContent = 'Changes take effect immediately. Page reload recommended for clean state.';
    panel.appendChild(helpText);

    this.container.appendChild(panel);
    document.body.appendChild(this.container);

    // Close on click outside
    this.container.onclick = (e) => {
      if (e.target === this.container) {
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
