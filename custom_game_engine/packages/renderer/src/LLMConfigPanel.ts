/**
 * LLMConfigPanel - HTML modal for configuring per-agent custom LLM settings
 * Uses DOM overlay similar to SettingsPanel
 */
import type { IWindowPanel } from './types/WindowTypes.js';

export class LLMConfigPanel implements IWindowPanel {
  private container: HTMLDivElement;
  private agentEntity: any = null;
  private visible = false;

  // Input elements
  private baseUrlInput!: HTMLInputElement;
  private modelInput!: HTMLInputElement;
  private apiKeyInput!: HTMLInputElement;
  private customHeadersInput!: HTMLTextAreaElement;


  getId(): string {
    return 'llm-config';
  }

  getTitle(): string {
    return 'LLM Config';
  }

  getDefaultWidth(): number {
    return 500;
  }

  getDefaultHeight(): number {
    return 600;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  constructor() {
    this.container = this.createPanel();
    document.body.appendChild(this.container);
  }

  /**
   * Check if panel is visible (for window adapter)
   */
  getIsVisible(): boolean {
    return this.visible;
  }

  /**
   * Toggle visibility (for window adapter)
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  private createPanel(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'llm-config-modal';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: monospace;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #444;
      border-radius: 8px;
      padding: 24px;
      width: 500px;
      max-width: 90%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Custom LLM Configuration';
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 18px;
      color: #88CCFF;
      font-weight: bold;
    `;
    panel.appendChild(title);

    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Configure a custom LLM provider for this agent (e.g., Claude, Gemini, ChatGPT)';
    instructions.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 12px;
      color: #aaa;
    `;
    panel.appendChild(instructions);

    // Base URL
    panel.appendChild(this.createFormGroup('Base URL', 'text', 'https://api.anthropic.com/v1', (input) => {
      this.baseUrlInput = input;
    }));

    // Model
    panel.appendChild(this.createFormGroup('Model', 'text', 'claude-3-5-sonnet-20241022', (input) => {
      this.modelInput = input;
    }));

    // API Key
    panel.appendChild(this.createFormGroup('API Key', 'password', 'sk-...', (input) => {
      this.apiKeyInput = input;
    }));

    // Custom Headers
    const headersGroup = document.createElement('div');
    headersGroup.style.marginBottom = '16px';

    const headersLabel = document.createElement('label');
    headersLabel.textContent = 'Custom Headers (JSON)';
    headersLabel.style.cssText = `
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      color: #aaa;
    `;
    headersGroup.appendChild(headersLabel);

    this.customHeadersInput = document.createElement('textarea');
    this.customHeadersInput.placeholder = '{"anthropic-version": "2023-06-01"}';
    this.customHeadersInput.style.cssText = `
      width: 100%;
      height: 80px;
      padding: 8px;
      background: #2a2a2a;
      border: 1px solid #555;
      border-radius: 4px;
      color: #fff;
      font-family: monospace;
      font-size: 11px;
      resize: vertical;
      box-sizing: border-box;
    `;
    headersGroup.appendChild(this.customHeadersInput);
    panel.appendChild(headersGroup);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
      margin-top: 24px;
    `;

    const saveBtn = this.createButton('Save', '#4CAF50', () => this.handleSave());
    const clearBtn = this.createButton('Clear', '#f44336', () => this.handleClear());
    const cancelBtn = this.createButton('Cancel', '#666', () => this.hide());

    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(clearBtn);
    buttonContainer.appendChild(cancelBtn);
    panel.appendChild(buttonContainer);

    container.appendChild(panel);

    // Click outside to close
    container.addEventListener('click', (e) => {
      if (e.target === container) {
        this.hide();
      }
    });

    return container;
  }

  private createFormGroup(label: string, type: string, placeholder: string, callback: (input: HTMLInputElement) => void): HTMLDivElement {
    const group = document.createElement('div');
    group.style.marginBottom = '16px';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      color: #aaa;
    `;
    group.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #2a2a2a;
      border: 1px solid #555;
      border-radius: 4px;
      color: #fff;
      font-family: monospace;
      font-size: 12px;
      box-sizing: border-box;
    `;
    group.appendChild(input);
    callback(input);

    return group;
  }

  private createButton(text: string, color: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      flex: 1;
      padding: 10px;
      background: ${color};
      border: none;
      border-radius: 4px;
      color: white;
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      transition: opacity 0.2s;
    `;
    button.addEventListener('mouseover', () => {
      button.style.opacity = '0.8';
    });
    button.addEventListener('mouseout', () => {
      button.style.opacity = '1';
    });
    button.addEventListener('click', onClick);
    return button;
  }

  openForAgent(agentEntity: any): void {
    this.agentEntity = agentEntity;

    // Load existing config from the agent component
    const agent = agentEntity?.components?.get('agent');
    const config = agent?.customLLM;

    this.baseUrlInput.value = config?.baseUrl || '';
    this.modelInput.value = config?.model || '';
    this.apiKeyInput.value = config?.apiKey || '';
    this.customHeadersInput.value = config?.customHeaders ? JSON.stringify(config.customHeaders, null, 2) : '';

    this.show();
  }

  private show(): void {
    this.container.style.display = 'flex';
    this.visible = true;
  }

  private hide(): void {
    this.container.style.display = 'none';
    this.visible = false;
  }

  private handleSave(): void {
    if (!this.agentEntity) {
      console.error('[LLMConfigPanel] No agent entity set');
      return;
    }

    const agent = this.agentEntity.components?.get('agent');
    if (!agent) {
      console.error('[LLMConfigPanel] Agent component not found');
      return;
    }

    try {
      const customHeaders = this.customHeadersInput.value.trim()
        ? JSON.parse(this.customHeadersInput.value)
        : undefined;

      agent.customLLM = {
        baseUrl: this.baseUrlInput.value.trim() || undefined,
        model: this.modelInput.value.trim() || undefined,
        apiKey: this.apiKeyInput.value.trim() || undefined,
        customHeaders,
      };

      console.log('[LLMConfigPanel] Saved custom LLM config:', agent.customLLM);
      this.hide();
    } catch (e) {
      alert('Invalid JSON in Custom Headers field');
    }
  }

  private handleClear(): void {
    if (!this.agentEntity) {
      return;
    }

    const agent = this.agentEntity.components?.get('agent');
    if (!agent) {
      return;
    }

    agent.customLLM = undefined;
    console.log('[LLMConfigPanel] Cleared custom LLM config');
    this.hide();
  }
}
