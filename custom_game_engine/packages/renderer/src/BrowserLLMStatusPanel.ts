/**
 * BrowserLLMStatusPanel - DOM-based UI panel showing browser LLM download progress,
 * cache status, and readiness state.
 *
 * Exposes callbacks for main.ts to wire to the actual BrowserLLMProvider.
 */

import type { IWindowPanel } from './types/WindowTypes.js';
import type { BrowserLLMStatus, DownloadProgress } from '@ai-village/llm';

export class BrowserLLMStatusPanel implements IWindowPanel {
  private visible: boolean = false;
  private container: HTMLDivElement | null = null;

  private status: BrowserLLMStatus = 'uninitialized';
  private progress: DownloadProgress | null = null;
  private modelName: string = 'Unknown';
  private modelSizeMB: number = 0;
  private deviceCapable: boolean = true;

  private onEnable: (() => void) | null = null;
  private onDisable: (() => void) | null = null;

  // ============================================================================
  // IWindowPanel interface
  // ============================================================================

  getId(): string {
    return 'browser-llm-status';
  }

  getTitle(): string {
    return 'Local AI Status';
  }

  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 300;
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

  // DOM-based panel — no canvas rendering needed
  render(
    _ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    _width: number,
    _height: number,
    _world?: unknown
  ): void {
    // BrowserLLMStatusPanel uses DOM elements, not canvas rendering
  }

  // ============================================================================
  // Public API — wired by main.ts
  // ============================================================================

  /**
   * Set callback for when the user clicks "Enable Local AI"
   */
  setOnEnable(callback: () => void): void {
    this.onEnable = callback;
  }

  /**
   * Set callback for when the user clicks "Disable"
   */
  setOnDisable(callback: () => void): void {
    this.onDisable = callback;
  }

  /**
   * Update the displayed status
   */
  updateStatus(status: BrowserLLMStatus): void {
    this.status = status;
    if (this.container) {
      this.refreshContent();
    }
  }

  /**
   * Update download/load progress (called during downloading/loading phases)
   */
  updateProgress(progress: DownloadProgress): void {
    this.progress = progress;
    if (this.container) {
      this.refreshContent();
    }
  }

  /**
   * Set the model name and estimated download size
   */
  setModelInfo(name: string, sizeMB: number): void {
    this.modelName = name;
    this.modelSizeMB = sizeMB;
    if (this.container) {
      this.refreshContent();
    }
  }

  /**
   * Set whether the device supports local inference (WebGPU)
   */
  setDeviceCapable(capable: boolean): void {
    this.deviceCapable = capable;
    if (this.container) {
      this.refreshContent();
    }
  }

  // ============================================================================
  // Show / Hide
  // ============================================================================

  show(): void {
    if (this.visible && this.container) return;
    this.visible = true;
    this.createPanel();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.destroyPanel();
  }

  toggle(): void {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  // ============================================================================
  // DOM construction
  // ============================================================================

  private createPanel(): void {
    this.container = document.createElement('div');
    this.container.id = 'browser-llm-status-panel-overlay';
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

    const panel = document.createElement('div');
    panel.id = 'browser-llm-status-panel';
    panel.style.cssText = `
      background: #1a1a2e;
      border: 2px solid #4a4a6a;
      border-radius: 12px;
      padding: 24px;
      width: 400px;
      min-height: 300px;
      box-sizing: border-box;
      color: #e0e0e0;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: 0;
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
    title.textContent = 'Local AI Status';
    title.style.cssText = 'margin: 0; font-size: 18px; color: #fff;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u00d7';
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

    // Content area (refreshed on state changes)
    const content = document.createElement('div');
    content.id = 'browser-llm-status-content';
    content.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 16px;';
    panel.appendChild(content);

    this.container.appendChild(panel);
    document.body.appendChild(this.container);

    // Close on backdrop click
    this.container.onclick = (e) => {
      if (e.target === this.container) {
        this.hide();
      }
    };

    this.refreshContent();
  }

  private refreshContent(): void {
    const content = document.getElementById('browser-llm-status-content');
    if (!content) return;
    content.innerHTML = '';

    // Cloud fallback banner (shown when device is incapable)
    if (!this.deviceCapable) {
      const banner = document.createElement('div');
      banner.style.cssText = `
        background: #0f3460;
        border: 1px solid #1a4a8a;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 13px;
        color: #a0c8ff;
        text-align: center;
      `;
      banner.textContent = 'Cloud Fallback Active — WebGPU not available on this device';
      content.appendChild(banner);
    }

    // Model info card
    const modelCard = this.buildModelCard();
    content.appendChild(modelCard);

    // Status row
    const statusRow = this.buildStatusRow();
    content.appendChild(statusRow);

    // Progress bar (only during downloading / loading)
    if (
      (this.status === 'downloading' || this.status === 'loading') &&
      this.progress !== null
    ) {
      const progressSection = this.buildProgressSection(this.progress);
      content.appendChild(progressSection);
    }

    // Error detail
    if (this.status === 'error') {
      const errorNote = document.createElement('p');
      errorNote.style.cssText = 'margin: 0; font-size: 12px; color: #ff4444; font-style: italic;';
      errorNote.textContent = 'An error occurred while initializing the local model. Check the console for details.';
      content.appendChild(errorNote);
    }

    // Action button
    const actionBtn = this.buildActionButton();
    if (actionBtn) {
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'margin-top: auto; padding-top: 16px; border-top: 1px solid #4a4a6a;';
      btnRow.appendChild(actionBtn);
      content.appendChild(btnRow);
    }
  }

  private buildModelCard(): HTMLDivElement {
    const card = document.createElement('div');
    card.style.cssText = `
      background: #16213e;
      border: 1px solid #0f3460;
      border-radius: 8px;
      padding: 12px 16px;
    `;

    const nameRow = document.createElement('div');
    nameRow.style.cssText = 'display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;';

    const nameLabel = document.createElement('span');
    nameLabel.textContent = 'Model';
    nameLabel.style.cssText = 'font-size: 11px; color: #8a8aaa; text-transform: uppercase; letter-spacing: 0.05em;';

    const nameValue = document.createElement('span');
    nameValue.textContent = this.modelName;
    nameValue.style.cssText = 'font-size: 13px; color: #e0e0e0; font-weight: 500;';

    nameRow.appendChild(nameLabel);
    nameRow.appendChild(nameValue);
    card.appendChild(nameRow);

    if (this.modelSizeMB > 0) {
      const sizeRow = document.createElement('div');
      sizeRow.style.cssText = 'display: flex; justify-content: space-between; align-items: baseline;';

      const sizeLabel = document.createElement('span');
      sizeLabel.textContent = 'Est. Size';
      sizeLabel.style.cssText = 'font-size: 11px; color: #8a8aaa; text-transform: uppercase; letter-spacing: 0.05em;';

      const sizeValue = document.createElement('span');
      sizeValue.textContent = this.formatMB(this.modelSizeMB);
      sizeValue.style.cssText = 'font-size: 13px; color: #a0a0c0;';

      sizeRow.appendChild(sizeLabel);
      sizeRow.appendChild(sizeValue);
      card.appendChild(sizeRow);
    }

    return card;
  }

  private buildStatusRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: center; gap: 10px;';

    const dot = document.createElement('span');
    dot.style.cssText = `
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      background: ${this.statusColor()};
    `;

    const label = document.createElement('span');
    label.textContent = this.statusLabel();
    label.style.cssText = `font-size: 14px; color: ${this.statusColor()};`;

    row.appendChild(dot);
    row.appendChild(label);
    return row;
  }

  private buildProgressSection(progress: DownloadProgress): HTMLDivElement {
    const section = document.createElement('div');
    section.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

    // Phase label + percentage
    const topRow = document.createElement('div');
    topRow.style.cssText = 'display: flex; justify-content: space-between; font-size: 12px; color: #a0a0c0;';

    const phaseLabel = document.createElement('span');
    phaseLabel.textContent = progress.phase === 'downloading' ? 'Downloading model...' : 'Loading into memory...';

    const pctLabel = document.createElement('span');
    pctLabel.textContent = `${Math.round(progress.progress * 100)}%`;

    topRow.appendChild(phaseLabel);
    topRow.appendChild(pctLabel);
    section.appendChild(topRow);

    // Progress bar track
    const track = document.createElement('div');
    track.style.cssText = `
      width: 100%;
      height: 8px;
      background: #0a0a1a;
      border-radius: 4px;
      overflow: hidden;
    `;

    const fill = document.createElement('div');
    fill.style.cssText = `
      height: 100%;
      width: ${Math.min(100, Math.round(progress.progress * 100))}%;
      background: #00d2ff;
      border-radius: 4px;
      transition: width 0.2s ease;
    `;

    track.appendChild(fill);
    section.appendChild(track);

    // MB detail row (only meaningful during download)
    if (progress.phase === 'downloading' && progress.totalMB > 0) {
      const detailRow = document.createElement('div');
      detailRow.style.cssText = 'display: flex; justify-content: space-between; font-size: 11px; color: #666688;';

      const mbLabel = document.createElement('span');
      mbLabel.textContent = `${this.formatMB(progress.downloadedMB)} / ${this.formatMB(progress.totalMB)}`;

      const speedLabel = document.createElement('span');
      speedLabel.textContent = progress.speedMBps > 0 ? `${progress.speedMBps.toFixed(1)} MB/s` : '';

      detailRow.appendChild(mbLabel);
      detailRow.appendChild(speedLabel);
      section.appendChild(detailRow);
    }

    return section;
  }

  private buildActionButton(): HTMLButtonElement | null {
    if (!this.deviceCapable) return null;

    if (this.status === 'uninitialized' || this.status === 'error' || this.status === 'disposed') {
      const btn = document.createElement('button');
      btn.textContent = 'Enable Local AI';
      btn.style.cssText = this.buttonStyle('#0f3460');
      btn.onmouseenter = () => { btn.style.background = '#1a4a8a'; };
      btn.onmouseleave = () => { btn.style.background = '#0f3460'; };
      btn.onclick = () => {
        if (!this.onEnable) {
          console.error('[BrowserLLMStatusPanel] Enable callback not wired — cannot initialize provider');
          return;
        }
        this.onEnable();
      };
      return btn;
    }

    if (this.status === 'ready') {
      const btn = document.createElement('button');
      btn.textContent = 'Disable';
      btn.style.cssText = this.buttonStyle('#3d1a1a');
      btn.onmouseenter = () => { btn.style.background = '#6a2020'; };
      btn.onmouseleave = () => { btn.style.background = '#3d1a1a'; };
      btn.onclick = () => {
        if (!this.onDisable) {
          console.error('[BrowserLLMStatusPanel] Disable callback not wired — cannot dispose provider');
          return;
        }
        this.onDisable();
      };
      return btn;
    }

    // downloading / loading / error states — no action button
    return null;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private statusLabel(): string {
    switch (this.status) {
      case 'uninitialized': return 'Not enabled';
      case 'downloading':   return 'Downloading model...';
      case 'loading':       return 'Loading into memory...';
      case 'ready':         return 'Ready';
      case 'error':         return 'Error';
      case 'disposed':      return 'Disposed';
      default:              return 'Unknown';
    }
  }

  private statusColor(): string {
    switch (this.status) {
      case 'ready':         return '#00ff88';
      case 'error':         return '#ff4444';
      case 'downloading':
      case 'loading':       return '#00d2ff';
      case 'uninitialized':
      case 'disposed':
      default:              return '#666688';
    }
  }

  private buttonStyle(bg: string): string {
    return `
      background: ${bg};
      border: none;
      color: #e0e0e0;
      padding: 9px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      width: 100%;
      text-align: center;
      transition: background 0.15s ease;
    `;
  }

  private formatMB(mb: number): string {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  }

  private destroyPanel(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
