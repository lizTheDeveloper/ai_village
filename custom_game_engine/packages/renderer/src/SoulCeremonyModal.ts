/**
 * SoulCeremonyModal - Full-screen modal that displays soul creation ceremonies
 *
 * Shows during game initialization before the map loads.
 * Displays each ceremony one at a time with the Three Fates' conversation.
 */

export interface CeremonyExchange {
  speaker: 'weaver' | 'spinner' | 'cutter';
  text: string;
  topic?: string;
}

export interface CeremonyContext {
  culture?: string;
  cosmicAlignment: number;
}

export class SoulCeremonyModal {
  private container: HTMLDivElement;
  private contentArea: HTMLDivElement;
  private currentTranscript: CeremonyExchange[] = [];
  private currentContext: CeremonyContext | null = null;
  private onComplete: (() => void) | null = null;
  private thinkingSpeaker: 'weaver' | 'spinner' | 'cutter' | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.setupStyles();
    this.contentArea = this.createContentArea();
    this.container.appendChild(this.contentArea);
    document.body.appendChild(this.container);
  }

  private setupStyles(): void {
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10002;
      font-family: 'Georgia', serif;
    `;
  }

  private createContentArea(): HTMLDivElement {
    const content = document.createElement('div');
    content.style.cssText = `
      width: 90%;
      max-width: 1400px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 30px 50px;
      background: rgba(0, 0, 0, 0.7);
      border: 2px solid #ffd700;
      border-radius: 10px;
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    `;
    return content;
  }

  /**
   * Start a new ceremony display
   */
  startCeremony(context: CeremonyContext): void {
    this.currentContext = context;
    this.currentTranscript = [];
    this.container.style.display = 'flex';
    this.render();
  }

  /**
   * Show that a Fate is thinking/formulating their response
   */
  setThinking(speaker: 'weaver' | 'spinner' | 'cutter'): void {
    console.log(`[SoulCeremonyModal] ${speaker} is now thinking...`);
    this.thinkingSpeaker = speaker;
    this.render();
  }

  /**
   * Add a Fate's speech to the current ceremony
   */
  addSpeech(speaker: 'weaver' | 'spinner' | 'cutter', text: string, topic?: string): void {
    this.thinkingSpeaker = null; // Clear thinking state
    this.currentTranscript.push({ speaker, text, topic });
    this.render();
  }

  /**
   * Complete the current ceremony
   */
  completeCeremony(purpose: string, interests: string[], destiny: string, archetype: string, onComplete?: () => void): void {
    this.onComplete = onComplete || null;
    this.renderCompletion(purpose, interests, destiny, archetype);
  }

  /**
   * Hide the modal
   */
  hide(): void {
    this.container.style.display = 'none';
    this.currentTranscript = [];
    this.currentContext = null;
    this.onComplete = null;
  }

  /**
   * Render the ceremony content
   */
  private render(): void {
    if (!this.currentContext) return;

    let html = `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #ffd700; font-size: 24px; margin: 0; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">
          ✨ The Tapestry of Fate ✨
        </h1>
        <p style="color: #b8860b; font-size: 13px; margin-top: 8px;">
          A Soul Is Being Woven
        </p>
      </div>

      <div style="margin-bottom: 18px; padding: 12px; background: rgba(255, 215, 0, 0.1); border-left: 3px solid #ffd700;">
        <p style="color: #ddd; margin: 4px 0; font-size: 13px;">
          <strong>Culture:</strong> ${this.currentContext.culture || 'Unknown'}
        </p>
        <p style="color: #ddd; margin: 4px 0; font-size: 13px;">
          <strong>Cosmic Alignment:</strong> ${this.formatAlignment(this.currentContext.cosmicAlignment)}
        </p>
      </div>

      <div style="margin-top: 25px;">
    `;

    // Add each exchange
    for (const exchange of this.currentTranscript) {
      const { symbol, name, color } = this.getSpeakerInfo(exchange.speaker);
      html += `
        <div style="margin-bottom: 18px; padding: 12px 15px; background: rgba(0, 0, 0, 0.3); border-radius: 5px; border-left: 4px solid ${color};">
          <div style="color: ${color}; font-size: 14px; margin-bottom: 6px; font-weight: bold;">
            ${symbol} ${name}
          </div>
          <div style="color: #e0e0e0; font-size: 13px; line-height: 1.5; font-style: italic;">
            "${exchange.text}"
          </div>
        </div>
      `;
    }

    // Add thinking indicator if someone is currently thinking
    if (this.thinkingSpeaker) {
      const { symbol, name, color } = this.getSpeakerInfo(this.thinkingSpeaker);
      html += `
        <div style="margin-bottom: 18px; padding: 12px 15px; background: rgba(0, 0, 0, 0.2); border-radius: 5px; border-left: 4px solid ${color}; opacity: 0.7;">
          <div style="color: ${color}; font-size: 14px; margin-bottom: 6px; font-weight: bold;">
            ${symbol} ${name}
          </div>
          <div style="color: #999; font-size: 13px; line-height: 1.5; font-style: italic;">
            <span style="animation: pulse 1.5s ease-in-out infinite;">Contemplating the threads of fate...</span>
          </div>
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        </style>
      `;
    }

    html += `</div>`;

    this.contentArea.innerHTML = html;
  }

  /**
   * Render the ceremony completion
   */
  private renderCompletion(purpose: string, interests: string[], destiny: string, archetype: string): void {
    let html = `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #ffd700; font-size: 24px; margin: 0; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">
          ✨ A Soul Is Born ✨
        </h1>
      </div>

      <div style="margin: 25px 0; padding: 20px; background: rgba(255, 215, 0, 0.15); border-radius: 10px; border: 2px solid #ffd700;">
        <div style="margin-bottom: 16px;">
          <div style="color: #ffd700; font-size: 14px; font-weight: bold; margin-bottom: 6px;">Purpose</div>
          <div style="color: #e0e0e0; font-size: 13px; line-height: 1.5;">${purpose}</div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="color: #ffd700; font-size: 14px; font-weight: bold; margin-bottom: 6px;">Core Interests</div>
          <div style="color: #e0e0e0; font-size: 13px;">${interests.join(', ')}</div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="color: #ffd700; font-size: 14px; font-weight: bold; margin-bottom: 6px;">Destiny</div>
          <div style="color: #e0e0e0; font-size: 13px; line-height: 1.5; font-style: italic;">${destiny}</div>
        </div>

        <div>
          <div style="color: #ffd700; font-size: 14px; font-weight: bold; margin-bottom: 6px;">Archetype</div>
          <div style="color: #e0e0e0; font-size: 13px;">${archetype}</div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 25px;">
        <button id="ceremony-continue-btn" style="
          padding: 10px 25px;
          font-size: 14px;
          background: #ffd700;
          color: #1a1a2e;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          transition: all 0.2s;
        ">
          Continue
        </button>
      </div>
    `;

    this.contentArea.innerHTML = html;

    // Add click handler for continue button
    const btn = document.getElementById('ceremony-continue-btn');
    if (btn) {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#ffed4e';
        btn.style.transform = 'translateY(-2px)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#ffd700';
        btn.style.transform = 'translateY(0)';
      });
      btn.addEventListener('click', () => {
        if (this.onComplete) {
          this.onComplete();
        } else {
          this.hide();
        }
      });
    }
  }

  private getSpeakerInfo(speaker: 'weaver' | 'spinner' | 'cutter'): { symbol: string; name: string; color: string } {
    switch (speaker) {
      case 'weaver':
        return { symbol: '🧵', name: 'The Weaver', color: '#87CEEB' };
      case 'spinner':
        return { symbol: '🌀', name: 'The Spinner', color: '#DDA0DD' };
      case 'cutter':
        return { symbol: '✂️', name: 'The Cutter', color: '#DC143C' };
    }
  }

  private formatAlignment(alignment: number): string {
    if (alignment > 0.7) return '🌟 Highly Blessed';
    if (alignment > 0.3) return '✨ Blessed';
    if (alignment > -0.3) return '⚖️ Neutral';
    if (alignment > -0.7) return '🌑 Cursed';
    return '💀 Highly Cursed';
  }
}
