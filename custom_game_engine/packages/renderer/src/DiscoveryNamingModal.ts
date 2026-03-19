/**
 * DiscoveryNamingModal
 *
 * Lightweight text-input overlay for naming world-first discoveries.
 * Naturalist notebook feel — parchment colors, serif font, minimal chrome.
 * Player types a name (1-40 chars) and confirms.
 */

export interface DiscoveryNamingRequest {
  category: string;
  description: string;
  promptText: string;
  eventDay: number;
}

export type NamingCallback = (category: string, name: string) => void;

export class DiscoveryNamingModal {
  private container: HTMLDivElement;
  private contentArea: HTMLDivElement;
  private inputEl: HTMLInputElement | null = null;
  private currentRequest: DiscoveryNamingRequest | null = null;
  private onNameCallback: NamingCallback | null = null;
  private queue: DiscoveryNamingRequest[] = [];
  private isShowing = false;

  constructor() {
    this.container = document.createElement('div');
    this.contentArea = document.createElement('div');
    this.setupStyles();
    this.container.appendChild(this.contentArea);
    document.body.appendChild(this.container);

    // ESC to skip/dismiss
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isShowing) {
        this.skip();
      }
    });

    // Prevent clicks outside from propagating to game
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        // Focus input if clicking backdrop
        this.inputEl?.focus();
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
      background: rgba(0, 0, 0, 0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10001;
      font-family: 'Georgia', serif;
      backdrop-filter: blur(2px);
    `;

    this.contentArea.style.cssText = `
      position: relative;
      width: 90%;
      max-width: 520px;
      padding: 32px 36px;
      background: linear-gradient(145deg, #2a2520 0%, #1e1a16 100%);
      border: 2px solid #8b7355;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(139, 115, 85, 0.2);
    `;

    // Add keyframe animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes discoveryFadeIn {
        from { opacity: 0; transform: translateY(-12px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Register callback for when a name is submitted.
   */
  onName(callback: NamingCallback): void {
    this.onNameCallback = callback;
  }

  /**
   * Show a naming prompt to the player.
   */
  show(request: DiscoveryNamingRequest): void {
    if (this.isShowing) {
      this.queue.push(request);
      return;
    }

    this.currentRequest = request;
    this.isShowing = true;
    this.container.style.display = 'flex';
    this.contentArea.style.animation = 'discoveryFadeIn 0.25s ease-out';
    this.render();

    // Focus input after render
    requestAnimationFrame(() => {
      this.inputEl?.focus();
    });
  }

  /**
   * Skip the current naming prompt (use auto-generated name).
   */
  private skip(): void {
    this.dismiss();
  }

  /**
   * Submit the entered name.
   */
  private submit(): void {
    if (!this.inputEl || !this.currentRequest) return;

    const name = this.inputEl.value.trim();
    if (name.length === 0 || name.length > 40) return;

    if (this.onNameCallback) {
      this.onNameCallback(this.currentRequest.category, name);
    }

    this.dismiss();
  }

  /**
   * Close the modal and show next queued request.
   */
  private dismiss(): void {
    this.currentRequest = null;
    this.inputEl = null;
    this.isShowing = false;
    this.container.style.display = 'none';

    // Show next in queue
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      setTimeout(() => this.show(next), 300);
    }
  }

  /**
   * Check if the modal is currently showing.
   */
  get visible(): boolean {
    return this.isShowing;
  }

  /**
   * Render the modal content.
   */
  private render(): void {
    if (!this.currentRequest) return;

    const req = this.currentRequest;

    this.contentArea.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="
          color: #c4a87a;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-bottom: 8px;
        ">Day ${req.eventDay}</div>
        <div style="
          width: 40px;
          height: 1px;
          background: #8b7355;
          margin: 0 auto 16px;
        "></div>
      </div>

      <p style="
        color: #d4c4a8;
        font-size: 15px;
        line-height: 1.7;
        text-align: center;
        margin: 0 0 8px;
        font-style: italic;
      ">${req.description}</p>

      <p style="
        color: #c4a87a;
        font-size: 14px;
        line-height: 1.6;
        text-align: center;
        margin: 0 0 24px;
      ">${req.promptText}</p>

      <div style="margin: 0 0 24px;">
        <input
          id="discovery-name-input"
          type="text"
          maxlength="40"
          placeholder="Enter a name..."
          autocomplete="off"
          style="
            width: 100%;
            box-sizing: border-box;
            padding: 12px 16px;
            font-family: 'Georgia', serif;
            font-size: 18px;
            color: #e8dcc8;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid #6b5b45;
            border-radius: 4px;
            outline: none;
            text-align: center;
            letter-spacing: 0.5px;
          "
        />
      </div>

      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="discovery-submit-btn" style="
          padding: 10px 28px;
          font-family: 'Georgia', serif;
          font-size: 14px;
          color: #1e1a16;
          background: #c4a87a;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          letter-spacing: 0.5px;
          transition: background 0.2s;
        ">Name It</button>
        <button id="discovery-skip-btn" style="
          padding: 10px 28px;
          font-family: 'Georgia', serif;
          font-size: 14px;
          color: #8b7355;
          background: transparent;
          border: 1px solid #5b4b35;
          border-radius: 4px;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: all 0.2s;
        ">Skip</button>
      </div>

      <div style="
        text-align: center;
        margin-top: 16px;
        color: #6b5b45;
        font-size: 11px;
      ">Press Enter to confirm · ESC to skip</div>
    `;

    // Get references
    this.inputEl = document.getElementById('discovery-name-input') as HTMLInputElement;
    const submitBtn = document.getElementById('discovery-submit-btn');
    const skipBtn = document.getElementById('discovery-skip-btn');

    // Enter to submit
    this.inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submit();
      }
      // Stop propagation so game doesn't receive key events
      e.stopPropagation();
    });

    // Also stop keyup/keypress propagation
    this.inputEl?.addEventListener('keyup', (e) => e.stopPropagation());
    this.inputEl?.addEventListener('keypress', (e) => e.stopPropagation());

    // Input focus styling
    this.inputEl?.addEventListener('focus', () => {
      if (this.inputEl) {
        this.inputEl.style.borderColor = '#c4a87a';
        this.inputEl.style.boxShadow = '0 0 8px rgba(196, 168, 122, 0.3)';
      }
    });
    this.inputEl?.addEventListener('blur', () => {
      if (this.inputEl) {
        this.inputEl.style.borderColor = '#6b5b45';
        this.inputEl.style.boxShadow = 'none';
      }
    });

    // Button handlers
    submitBtn?.addEventListener('click', () => this.submit());
    skipBtn?.addEventListener('click', () => this.skip());

    // Hover effects
    submitBtn?.addEventListener('mouseenter', () => {
      if (submitBtn) submitBtn.style.background = '#d4b88a';
    });
    submitBtn?.addEventListener('mouseleave', () => {
      if (submitBtn) submitBtn.style.background = '#c4a87a';
    });
    skipBtn?.addEventListener('mouseenter', () => {
      if (skipBtn) {
        skipBtn.style.borderColor = '#8b7355';
        skipBtn.style.color = '#c4a87a';
      }
    });
    skipBtn?.addEventListener('mouseleave', () => {
      if (skipBtn) {
        skipBtn.style.borderColor = '#5b4b35';
        skipBtn.style.color = '#8b7355';
      }
    });
  }
}
