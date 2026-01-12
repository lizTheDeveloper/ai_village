/**
 * LLMSettingsPanel - Advanced UI panel for configuring LLM provider settings.
 *
 * Features:
 * - Multiple provider support (groq, cerebras, openai, ollama, together, custom)
 * - API key management with localStorage
 * - Model selection and configuration
 * - Connection testing
 * - Optional capability discovery integration
 */

import type { IWindowPanel } from './types/WindowTypes.js';

export interface AdvancedLLMSettings {
  // Provider selection
  provider: 'groq' | 'cerebras' | 'openai' | 'ollama' | 'together' | 'custom';

  // API configuration
  apiKey?: string;          // User's API key
  baseUrl?: string;         // Custom endpoint (for Ollama, etc.)

  // Model selection
  model: string;            // Model name/ID

  // Optional overrides
  maxTokens?: number;
  temperature?: number;

  // Advanced: Custom model profile override
  customProfile?: Partial<ModelProfile>;
}

export interface ModelProfile {
  supportsToolCalling: boolean;
  supportsJsonMode: boolean;
  hasThinkTags: boolean;
  hasReasoningField: boolean;
  maxContextLength: number;
}

// Default provider configurations
const PROVIDER_PRESETS: Record<string, Partial<AdvancedLLMSettings>> = {
  'groq': {
    provider: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'qwen/qwen3-32b',
  },
  'cerebras': {
    provider: 'cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    model: 'llama3.1-70b',
  },
  'openai': {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4-turbo',
  },
  'ollama': {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:32b',
  },
  'together': {
    provider: 'together',
    baseUrl: 'https://api.together.xyz/v1',
    model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
  },
};

const LLM_SETTINGS_KEY = 'ai_village_llm_settings';

/**
 * Advanced LLM Settings Panel with provider management and testing.
 */
export class LLMSettingsPanel implements IWindowPanel {
  private visible: boolean = false;
  private container: HTMLDivElement | null = null;
  private settings: AdvancedLLMSettings;
  private onSettingsChange: ((settings: AdvancedLLMSettings) => void) | null = null;
  private testStatus: string = '';
  private capabilityStatus: ModelProfile | null = null;

  getId(): string {
    return 'llm-settings';
  }

  getTitle(): string {
    return 'LLM Settings';
  }

  getDefaultWidth(): number {
    return 520;
  }

  getDefaultHeight(): number {
    return 650;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  // DOM-based panel - no canvas rendering needed
  render(
    _ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    _width: number,
    _height: number,
    _world?: unknown
  ): void {
    // LLMSettingsPanel uses DOM elements, not canvas rendering
  }

  constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * Set callback for when settings change
   */
  setOnSettingsChange(callback: (settings: AdvancedLLMSettings) => void): void {
    this.onSettingsChange = callback;
  }

  /**
   * Get current settings
   */
  getSettings(): AdvancedLLMSettings {
    return this.settings;
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): AdvancedLLMSettings {
    try {
      const stored = localStorage.getItem(LLM_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Decode API key (basic obscuring, not secure encryption)
        if (parsed.apiKey) {
          try {
            parsed.apiKey = atob(parsed.apiKey);
          } catch {
            // If decoding fails, use as-is
          }
        }
        return parsed;
      }
    } catch (e) {
      console.warn('[LLMSettingsPanel] Failed to load settings:', e);
    }
    // Default to groq
    return {
      provider: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'qwen/qwen3-32b',
      apiKey: '',
    };
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      const toSave = { ...this.settings };
      // Base64 encode API key (basic obscuring, not secure encryption)
      if (toSave.apiKey) {
        toSave.apiKey = btoa(toSave.apiKey);
      }
      localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify(toSave));
      console.log('[LLMSettingsPanel] Settings saved');
    } catch (e) {
      console.warn('[LLMSettingsPanel] Failed to save settings:', e);
    }
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show the settings panel
   */
  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.createPanel();
  }

  /**
   * Hide the settings panel
   */
  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.destroyPanel();
  }

  /**
   * Create the settings panel DOM elements
   */
  private createPanel(): void {
    // Create overlay
    this.container = document.createElement('div');
    this.container.id = 'llm-settings-panel-overlay';
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
      min-width: 480px;
      max-width: 520px;
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
    title.textContent = 'LLM Provider Settings';
    title.style.cssText = 'margin: 0; font-size: 20px; color: #fff;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: #333;
      border: 1px solid #555;
      color: #aaa;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
    `;
    closeBtn.onclick = () => this.hide();

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Provider Section
    const providerSection = document.createElement('div');
    providerSection.innerHTML = '<h3 style="margin: 0 0 12px 0; font-size: 14px; color: #8a8aaa; text-transform: uppercase;">Provider Configuration</h3>';

    // Provider preset selector
    const presetGroup = this.createFormGroup('Quick Preset', 'select');
    const presetSelect = presetGroup.querySelector('select')!;
    presetSelect.id = 'llm-preset';
    presetSelect.innerHTML = `
      <option value="">Custom</option>
      <option value="groq">Groq (qwen3-32b)</option>
      <option value="cerebras">Cerebras (llama3.1-70b)</option>
      <option value="openai">OpenAI (gpt-4-turbo)</option>
      <option value="ollama">Ollama (local)</option>
      <option value="together">Together AI</option>
    `;
    presetSelect.onchange = () => {
      const preset = PROVIDER_PRESETS[presetSelect.value];
      if (preset) {
        this.settings = { ...this.settings, ...preset };
        this.updateFormValues();
      }
    };
    providerSection.appendChild(presetGroup);

    // Provider type
    const providerGroup = this.createFormGroup('Provider', 'select');
    const providerSelect = providerGroup.querySelector('select')!;
    providerSelect.id = 'llm-provider';
    providerSelect.innerHTML = `
      <option value="groq">Groq</option>
      <option value="cerebras">Cerebras</option>
      <option value="openai">OpenAI</option>
      <option value="ollama">Ollama</option>
      <option value="together">Together AI</option>
      <option value="custom">Custom</option>
    `;
    providerSelect.value = this.settings.provider;
    providerSelect.onchange = () => {
      this.settings.provider = providerSelect.value as AdvancedLLMSettings['provider'];
      this.updateBaseUrlVisibility();
    };
    providerSection.appendChild(providerGroup);

    // Base URL
    const urlGroup = this.createFormGroup('Base URL', 'text');
    const urlInput = urlGroup.querySelector('input')!;
    urlInput.id = 'llm-url';
    urlInput.value = this.settings.baseUrl || '';
    urlInput.placeholder = 'https://api.groq.com/openai/v1';
    urlInput.onchange = () => {
      this.settings.baseUrl = urlInput.value;
    };
    providerSection.appendChild(urlGroup);

    // Model
    const modelGroup = this.createFormGroup('Model', 'text');
    const modelInput = modelGroup.querySelector('input')!;
    modelInput.id = 'llm-model';
    modelInput.value = this.settings.model;
    modelInput.placeholder = 'qwen/qwen3-32b';
    modelInput.onchange = () => {
      this.settings.model = modelInput.value;
    };
    providerSection.appendChild(modelGroup);

    // API Key
    const apiKeyGroup = this.createFormGroup('API Key', 'password');
    const apiKeyInput = apiKeyGroup.querySelector('input')!;
    apiKeyInput.id = 'llm-apikey';
    apiKeyInput.value = this.settings.apiKey || '';
    apiKeyInput.placeholder = 'Required for cloud providers';
    apiKeyInput.onchange = () => {
      this.settings.apiKey = apiKeyInput.value;
    };
    providerSection.appendChild(apiKeyGroup);

    // Security warning
    const securityWarning = document.createElement('p');
    securityWarning.style.cssText = 'margin: 8px 0 0 0; font-size: 11px; color: #ff8866; font-style: italic;';
    securityWarning.textContent = '⚠️ API keys are stored in localStorage (base64 encoded, not encrypted). Use with caution.';
    providerSection.appendChild(securityWarning);

    panel.appendChild(providerSection);

    // Advanced Settings Section
    const advancedSection = document.createElement('div');
    advancedSection.style.cssText = 'margin-top: 20px;';
    advancedSection.innerHTML = '<h3 style="margin: 0 0 12px 0; font-size: 14px; color: #8a8aaa; text-transform: uppercase;">Advanced Settings</h3>';

    // Max Tokens
    const maxTokensGroup = this.createFormGroup('Max Tokens (optional)', 'text');
    const maxTokensInput = maxTokensGroup.querySelector('input')!;
    maxTokensInput.id = 'llm-max-tokens';
    maxTokensInput.type = 'number';
    maxTokensInput.min = '256';
    maxTokensInput.max = '32768';
    maxTokensInput.value = String(this.settings.maxTokens || '');
    maxTokensInput.placeholder = 'Auto (default)';
    maxTokensInput.onchange = () => {
      const val = parseInt(maxTokensInput.value, 10);
      this.settings.maxTokens = isNaN(val) ? undefined : val;
    };
    advancedSection.appendChild(maxTokensGroup);

    // Temperature
    const tempGroup = this.createFormGroup('Temperature (optional)', 'text');
    const tempInput = tempGroup.querySelector('input')!;
    tempInput.id = 'llm-temperature';
    tempInput.type = 'number';
    tempInput.min = '0';
    tempInput.max = '2';
    tempInput.step = '0.1';
    tempInput.value = String(this.settings.temperature || '');
    tempInput.placeholder = 'Auto (default)';
    tempInput.onchange = () => {
      const val = parseFloat(tempInput.value);
      this.settings.temperature = isNaN(val) ? undefined : val;
    };
    advancedSection.appendChild(tempGroup);

    panel.appendChild(advancedSection);

    // Test Connection Section
    const testSection = document.createElement('div');
    testSection.style.cssText = 'margin-top: 20px; padding-top: 16px; border-top: 1px solid #4a4a6a;';

    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test Connection';
    testBtn.style.cssText = `
      background: #4a6a9a;
      border: none;
      color: #fff;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 12px;
    `;
    testBtn.onclick = () => this.testConnection(testBtn);

    const testStatusEl = document.createElement('span');
    testStatusEl.id = 'llm-test-status';
    testStatusEl.style.cssText = 'font-size: 12px; color: #aaa;';
    testStatusEl.textContent = this.testStatus;

    testSection.appendChild(testBtn);
    testSection.appendChild(testStatusEl);
    panel.appendChild(testSection);

    // Capability Discovery Section (if available)
    const capabilitySection = document.createElement('div');
    capabilitySection.id = 'llm-capability-section';
    capabilitySection.style.cssText = 'margin-top: 16px;';
    this.renderCapabilityStatus(capabilitySection);
    panel.appendChild(capabilitySection);

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

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset to Defaults';
    resetBtn.style.cssText = `
      background: #444;
      border: 1px solid #666;
      color: #ccc;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    `;
    resetBtn.onclick = () => {
      this.settings = {
        provider: 'groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'qwen/qwen3-32b',
        apiKey: '',
      };
      this.updateFormValues();
    };

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
    saveBtn.textContent = 'Save';
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

    buttonRow.appendChild(resetBtn);
    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(saveBtn);
    panel.appendChild(buttonRow);

    this.container.appendChild(panel);
    document.body.appendChild(this.container);

    // Close on click outside
    this.container.onclick = (e) => {
      if (e.target === this.container) {
        this.hide();
      }
    };

    // Initialize visibility
    this.updateBaseUrlVisibility();
  }

  /**
   * Update form values from current settings
   */
  private updateFormValues(): void {
    const providerSelect = document.getElementById('llm-provider') as HTMLSelectElement;
    const urlInput = document.getElementById('llm-url') as HTMLInputElement;
    const modelInput = document.getElementById('llm-model') as HTMLInputElement;
    const apiKeyInput = document.getElementById('llm-apikey') as HTMLInputElement;
    const maxTokensInput = document.getElementById('llm-max-tokens') as HTMLInputElement;
    const tempInput = document.getElementById('llm-temperature') as HTMLInputElement;

    if (providerSelect) providerSelect.value = this.settings.provider;
    if (urlInput) urlInput.value = this.settings.baseUrl || '';
    if (modelInput) modelInput.value = this.settings.model;
    if (apiKeyInput) apiKeyInput.value = this.settings.apiKey || '';
    if (maxTokensInput) maxTokensInput.value = String(this.settings.maxTokens || '');
    if (tempInput) tempInput.value = String(this.settings.temperature || '');

    this.updateBaseUrlVisibility();
  }

  /**
   * Show/hide base URL field based on provider
   */
  private updateBaseUrlVisibility(): void {
    const urlGroup = document.getElementById('llm-url')?.parentElement;
    if (!urlGroup) return;

    // Show base URL for custom and ollama providers
    const showUrl = this.settings.provider === 'custom' || this.settings.provider === 'ollama';
    urlGroup.style.display = showUrl ? 'block' : 'none';
  }

  /**
   * Test connection to the LLM provider
   */
  private async testConnection(button: HTMLButtonElement): Promise<void> {
    const statusEl = document.getElementById('llm-test-status');
    if (!statusEl) return;

    button.disabled = true;
    button.textContent = 'Testing...';
    statusEl.textContent = 'Connecting...';
    statusEl.style.color = '#aaa';

    try {
      // Construct test request
      const url = `${this.settings.baseUrl}/chat/completions`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.settings.apiKey) {
        headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.settings.model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        this.testStatus = '✅ Connection successful!';
        statusEl.textContent = this.testStatus;
        statusEl.style.color = '#4a7c59';
      } else {
        const errorText = await response.text();
        this.testStatus = `❌ Error: ${response.status} ${response.statusText}`;
        statusEl.textContent = this.testStatus;
        statusEl.style.color = '#ff6666';
        console.error('[LLMSettingsPanel] Test failed:', errorText);
      }
    } catch (error) {
      this.testStatus = `❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      statusEl.textContent = this.testStatus;
      statusEl.style.color = '#ff6666';
      console.error('[LLMSettingsPanel] Test error:', error);
    } finally {
      button.disabled = false;
      button.textContent = 'Test Connection';
    }
  }

  /**
   * Render capability discovery status (if available)
   */
  private renderCapabilityStatus(container: HTMLElement): void {
    if (!this.capabilityStatus) {
      container.innerHTML = `
        <p style="margin: 0; font-size: 12px; color: #666; font-style: italic;">
          Capability discovery not available (optional feature).
        </p>
      `;
      return;
    }

    const status = this.capabilityStatus;
    container.innerHTML = `
      <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #8a8aaa;">Model Capabilities</h4>
      <div style="font-size: 12px; color: #ccc; line-height: 1.6;">
        <div>${status.supportsToolCalling ? '✅' : '❌'} Tool Calling</div>
        <div>${status.supportsJsonMode ? '✅' : '❌'} JSON Mode</div>
        <div>${status.hasThinkTags ? '✅' : '❌'} Think Tags (${status.hasThinkTags ? '&lt;think&gt;' : 'not detected'})</div>
        <div>${status.hasReasoningField ? '✅' : '❓'} Reasoning Field (${status.hasReasoningField ? 'detected' : 'not detected'})</div>
        <div>📏 Max Context: ${status.maxContextLength.toLocaleString()} tokens</div>
      </div>
    `;
  }

  /**
   * Set capability status (for integration with capability discovery system)
   */
  setCapabilityStatus(status: ModelProfile | null): void {
    this.capabilityStatus = status;
    const container = document.getElementById('llm-capability-section');
    if (container) {
      this.renderCapabilityStatus(container);
    }
  }

  /**
   * Create a form group with label and input
   */
  private createFormGroup(label: string, type: 'text' | 'password' | 'select'): HTMLDivElement {
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
