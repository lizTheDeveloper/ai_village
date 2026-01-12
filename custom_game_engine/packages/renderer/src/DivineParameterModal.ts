/**
 * DivineParameterModal - Modal for collecting divine power parameters
 *
 * Provides specialized input UIs for different divine powers:
 * - Divine Whisper: Text input (up to 100 chars)
 * - Subtle Sign: Selection from omens (animals, astrological, meteors, comets)
 * - Target selection: Choose from believers list
 */

export interface DivineParameterConfig {
  powerType: string;
  powerName: string;
  deityId: string;
  availableTargets?: Array<{ id: string; name: string; faith: number }>;
  onConfirm: (params: DivineParameterResult) => void;
  onCancel: () => void;
}

export interface DivineParameterResult {
  targetId?: string;
  message?: string;
  signType?: string;
  params?: Record<string, any>;
}

/**
 * Subtle sign types organized by category
 */
const SUBTLE_SIGNS = {
  animals: [
    { id: 'crow_flight', name: 'Flight of Crows', description: 'A murder of crows circles overhead' },
    { id: 'white_deer', name: 'White Deer', description: 'A pure white deer appears briefly' },
    { id: 'owl_call', name: 'Owl\'s Call', description: 'An owl hoots three times' },
    { id: 'snake_crossing', name: 'Snake Crossing', description: 'A serpent crosses your path' },
    { id: 'butterfly_swarm', name: 'Butterfly Swarm', description: 'Butterflies gather in unusual patterns' },
    { id: 'wolf_howl', name: 'Wolf Howl', description: 'A distant wolf howls at an unusual hour' },
  ],
  astrological: [
    { id: 'red_star', name: 'Red Star', description: 'A star glows red in the night sky' },
    { id: 'constellation_shift', name: 'Constellation Shift', description: 'The stars seem to rearrange' },
    { id: 'double_moon', name: 'Double Moon', description: 'The moon appears twice in the sky' },
    { id: 'aurora', name: 'Aurora', description: 'Colorful lights dance across the sky' },
    { id: 'eclipse', name: 'Partial Eclipse', description: 'The sun or moon briefly darkens' },
  ],
  meteors: [
    { id: 'shooting_star', name: 'Shooting Star', description: 'A bright meteor streaks across the sky' },
    { id: 'meteor_shower', name: 'Meteor Shower', description: 'Multiple meteors fall in succession' },
    { id: 'comet', name: 'Comet Appearance', description: 'A comet with a glowing tail appears' },
    { id: 'falling_stone', name: 'Falling Stone', description: 'A small meteorite lands nearby' },
  ],
  natural: [
    { id: 'rainbow', name: 'Rainbow', description: 'A rainbow appears in clear weather' },
    { id: 'cloud_formation', name: 'Cloud Formation', description: 'Clouds form meaningful shapes' },
    { id: 'sudden_wind', name: 'Sudden Wind', description: 'A strong wind blows from nowhere' },
    { id: 'flower_bloom', name: 'Sudden Bloom', description: 'Flowers bloom out of season' },
    { id: 'lightning_flash', name: 'Lightning Flash', description: 'Lightning strikes without thunder' },
  ],
};

export class DivineParameterModal {
  private container: HTMLDivElement;
  private contentArea: HTMLDivElement;
  private currentConfig: DivineParameterConfig | null = null;

  // Input state
  private selectedTargetId: string | null = null;
  private inputMessage: string = '';
  private selectedSignType: string | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.setupStyles();
    this.contentArea = this.createContentArea();
    this.container.appendChild(this.contentArea);
    document.body.appendChild(this.container);

    // ESC to cancel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.container.style.display === 'flex') {
        this.cancel();
      }
    });

    // Click outside to cancel
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.cancel();
      }
    });
  }

  private setupStyles(): void {
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10002;
      font-family: 'Georgia', serif;
      backdrop-filter: blur(4px);
    `;
  }

  private createContentArea(): HTMLDivElement {
    const content = document.createElement('div');
    content.style.cssText = `
      width: 90%;
      max-width: 600px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 30px 40px;
      background: rgba(20, 20, 30, 0.98);
      border: 2px solid #FFD700;
      border-radius: 12px;
      box-shadow: 0 0 40px rgba(255, 215, 0, 0.5);
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    return content;
  }

  /**
   * Show the modal for a specific divine power
   */
  show(config: DivineParameterConfig): void {
    this.currentConfig = config;
    this.selectedTargetId = null;
    this.inputMessage = '';
    this.selectedSignType = null;

    this.container.style.display = 'flex';
    this.render();
  }

  /**
   * Hide and cancel
   */
  cancel(): void {
    if (this.currentConfig?.onCancel) {
      this.currentConfig.onCancel();
    }
    this.hide();
  }

  /**
   * Hide modal
   */
  hide(): void {
    this.container.style.display = 'none';
    this.currentConfig = null;
  }

  /**
   * Confirm and return parameters
   */
  confirm(): void {
    if (!this.currentConfig) return;

    const result: DivineParameterResult = {
      targetId: this.selectedTargetId ?? undefined,
      message: this.inputMessage || undefined,
      signType: this.selectedSignType ?? undefined,
      params: {},
    };

    // Add power-specific params
    if (this.currentConfig.powerType === 'subtle_sign' && this.selectedSignType) {
      const sign = this.findSign(this.selectedSignType);
      if (sign) {
        result.params = {
          signType: this.selectedSignType,
          signName: sign.name,
          signDescription: sign.description,
        };
      }
    }

    this.currentConfig.onConfirm(result);
    this.hide();
  }

  /**
   * Find a sign by ID
   */
  private findSign(signId: string): { id: string; name: string; description: string } | undefined {
    for (const category of Object.values(SUBTLE_SIGNS)) {
      const sign = category.find(s => s.id === signId);
      if (sign) return sign;
    }
    return undefined;
  }

  /**
   * Render the modal content
   */
  private render(): void {
    if (!this.currentConfig) return;

    const config = this.currentConfig;

    let html = `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #FFD700; font-size: 22px; margin: 0; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">
          ✨ ${config.powerName} ✨
        </h1>
        <p style="color: #AAA; font-size: 13px; margin-top: 8px;">
          Configure divine power parameters
        </p>
      </div>
    `;

    // Target selection (for powers that need targets)
    if (config.availableTargets && config.availableTargets.length > 0) {
      html += this.renderTargetSelection(config.availableTargets);
    }

    // Power-specific inputs
    switch (config.powerType) {
      case 'whisper':
      case 'dream_hint':
      case 'clear_vision':
        html += this.renderMessageInput(config.powerType);
        break;

      case 'subtle_sign':
        html += this.renderSignSelection();
        break;
    }

    // Buttons
    html += `
      <div style="display: flex; gap: 12px; justify-content: center; margin-top: 30px;">
        <button id="divine-param-cancel" style="${this.getButtonStyle('secondary')}">
          Cancel
        </button>
        <button id="divine-param-confirm" style="${this.getButtonStyle('primary')}">
          Invoke Power
        </button>
      </div>
    `;

    this.contentArea.innerHTML = html;

    // Attach event handlers
    this.attachEventHandlers();
  }

  /**
   * Render target selection UI
   */
  private renderTargetSelection(targets: Array<{ id: string; name: string; faith: number }>): string {
    let html = `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #FFD700; font-size: 14px; margin-bottom: 10px;">Select Target</h3>
        <div style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 8px;">
    `;

    for (const target of targets) {
      const isSelected = this.selectedTargetId === target.id;
      const faithPercent = Math.round(target.faith * 100);
      const faithColor = faithPercent >= 80 ? '#FFD700' : faithPercent >= 50 ? '#87CEEB' : '#888';

      html += `
        <div
          class="divine-target-option"
          data-target-id="${target.id}"
          style="
            padding: 10px;
            margin: 4px 0;
            background: ${isSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(50, 50, 70, 0.5)'};
            border: 2px solid ${isSelected ? '#FFD700' : '#444'};
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
          "
        >
          <div style="color: #FFF; font-size: 13px; font-weight: bold;">${target.name}</div>
          <div style="color: ${faithColor}; font-size: 11px; margin-top: 4px;">
            Faith: ${faithPercent}%
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Render message input for whisper/visions
   */
  private renderMessageInput(powerType: string): string {
    const maxChars = 100;
    const remaining = maxChars - this.inputMessage.length;

    const placeholder = powerType === 'whisper'
      ? 'Whisper a subtle message...'
      : powerType === 'dream_hint'
      ? 'Describe dream imagery...'
      : 'Convey a clear vision...';

    return `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #FFD700; font-size: 14px; margin-bottom: 10px;">Message</h3>
        <textarea
          id="divine-message-input"
          placeholder="${placeholder}"
          maxlength="${maxChars}"
          style="
            width: 100%;
            height: 80px;
            padding: 12px;
            background: rgba(0, 0, 0, 0.4);
            border: 2px solid #666;
            border-radius: 6px;
            color: #FFF;
            font-size: 13px;
            font-family: 'Georgia', serif;
            resize: vertical;
            box-sizing: border-box;
          "
        >${this.inputMessage}</textarea>
        <div style="text-align: right; color: ${remaining < 20 ? '#FF6B6B' : '#888'}; font-size: 11px; margin-top: 4px;">
          ${remaining} / ${maxChars} characters remaining
        </div>
      </div>
    `;
  }

  /**
   * Render sign selection for Subtle Sign
   */
  private renderSignSelection(): string {
    let html = `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #FFD700; font-size: 14px; margin-bottom: 10px;">Select Sign Type</h3>
        <div style="max-height: 300px; overflow-y: auto;">
    `;

    for (const [category, signs] of Object.entries(SUBTLE_SIGNS)) {
      html += `
        <div style="margin-bottom: 16px;">
          <div style="color: #87CEEB; font-size: 12px; font-weight: bold; margin-bottom: 6px; text-transform: capitalize;">
            ${category}
          </div>
      `;

      for (const sign of signs) {
        const isSelected = this.selectedSignType === sign.id;

        html += `
          <div
            class="divine-sign-option"
            data-sign-id="${sign.id}"
            style="
              padding: 10px;
              margin: 4px 0;
              background: ${isSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(50, 50, 70, 0.5)'};
              border: 2px solid ${isSelected ? '#FFD700' : '#444'};
              border-radius: 6px;
              cursor: pointer;
              transition: all 0.2s;
            "
          >
            <div style="color: #FFF; font-size: 13px; font-weight: bold;">${sign.name}</div>
            <div style="color: #AAA; font-size: 11px; margin-top: 4px; font-style: italic;">
              ${sign.description}
            </div>
          </div>
        `;
      }

      html += `</div>`;
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Get button styles
   */
  private getButtonStyle(type: 'primary' | 'secondary'): string {
    const base = `
      padding: 12px 28px;
      font-size: 14px;
      font-weight: bold;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    `;

    if (type === 'primary') {
      return base + `
        background: #FFD700;
        color: #1a1a2e;
      `;
    } else {
      return base + `
        background: rgba(255, 255, 255, 0.1);
        color: #ddd;
        border: 2px solid #666;
      `;
    }
  }

  /**
   * Attach event handlers to interactive elements
   */
  private attachEventHandlers(): void {
    // Target selection
    const targetOptions = document.querySelectorAll('.divine-target-option');
    targetOptions.forEach(option => {
      option.addEventListener('click', () => {
        const targetId = (option as HTMLElement).dataset.targetId;
        if (targetId) {
          this.selectedTargetId = targetId;
          this.render(); // Re-render to show selection
        }
      });

      // Hover effects
      option.addEventListener('mouseenter', () => {
        if ((option as HTMLElement).dataset.targetId !== this.selectedTargetId) {
          (option as HTMLElement).style.background = 'rgba(100, 100, 120, 0.5)';
        }
      });

      option.addEventListener('mouseleave', () => {
        if ((option as HTMLElement).dataset.targetId !== this.selectedTargetId) {
          (option as HTMLElement).style.background = 'rgba(50, 50, 70, 0.5)';
        }
      });
    });

    // Sign selection
    const signOptions = document.querySelectorAll('.divine-sign-option');
    signOptions.forEach(option => {
      option.addEventListener('click', () => {
        const signId = (option as HTMLElement).dataset.signId;
        if (signId) {
          this.selectedSignType = signId;
          this.render(); // Re-render to show selection
        }
      });

      // Hover effects
      option.addEventListener('mouseenter', () => {
        if ((option as HTMLElement).dataset.signId !== this.selectedSignType) {
          (option as HTMLElement).style.background = 'rgba(100, 100, 120, 0.5)';
        }
      });

      option.addEventListener('mouseleave', () => {
        if ((option as HTMLElement).dataset.signId !== this.selectedSignType) {
          (option as HTMLElement).style.background = 'rgba(50, 50, 70, 0.5)';
        }
      });
    });

    // Message input
    const messageInput = document.getElementById('divine-message-input') as HTMLTextAreaElement;
    if (messageInput) {
      messageInput.addEventListener('input', () => {
        this.inputMessage = messageInput.value;
        this.render(); // Re-render to update character count
      });
    }

    // Buttons
    const cancelBtn = document.getElementById('divine-param-cancel');
    const confirmBtn = document.getElementById('divine-param-confirm');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancel());

      // Hover effects
      cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.opacity = '0.8';
        cancelBtn.style.transform = 'translateY(-2px)';
      });
      cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.opacity = '1';
        cancelBtn.style.transform = 'translateY(0)';
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.confirm());

      // Hover effects
      confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.opacity = '0.9';
        confirmBtn.style.transform = 'translateY(-2px)';
      });
      confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.opacity = '1';
        confirmBtn.style.transform = 'translateY(0)';
      });
    }
  }
}
