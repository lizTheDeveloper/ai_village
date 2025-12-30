/**
 * TimelinePanel - Visual timeline browser for universe/checkpoint selection
 *
 * Replaces traditional "load game" screen with a 2D timeline view:
 * - Horizontal axis: Different universes (grouped by magic law configuration)
 * - Vertical axis: Time within universe (checkpoints = days)
 *
 * User flow:
 * 1. Select a universe (each has different magic laws)
 * 2. Select when in that universe (which checkpoint/day)
 * 3. Load that checkpoint (may fork if rewinding from current time)
 */

import type { Checkpoint } from '../../core/src/systems/AutoSaveSystem.js';

export interface UniverseTimeline {
  universeId: string;
  universeName: string;
  magicLawsHash: string;
  checkpoints: Checkpoint[];
  currentDay: number;  // Latest day in this universe
}

export class TimelinePanel {
  private container: HTMLElement;
  private universes: Map<string, UniverseTimeline> = new Map();
  private selectedUniverse: string | null = null;
  private selectedCheckpoint: string | null = null;
  private onLoad: ((checkpointKey: string) => void) | null = null;

  constructor(containerId: string = 'timeline-panel') {
    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000000ee;
        display: none;
        flex-direction: column;
        padding: 20px;
        box-sizing: border-box;
        z-index: 10000;
        font-family: monospace;
        color: #e0e0e0;
      `;
      document.body.appendChild(this.container);
    }

    this.render();
  }

  /**
   * Show the timeline panel.
   */
  show(onLoadCallback: (checkpointKey: string) => void): void {
    this.onLoad = onLoadCallback;
    this.container.style.display = 'flex';
  }

  /**
   * Hide the timeline panel.
   */
  hide(): void {
    this.container.style.display = 'none';
    this.selectedUniverse = null;
    this.selectedCheckpoint = null;
  }

  /**
   * Set available universes and checkpoints.
   */
  setTimelines(checkpoints: Checkpoint[]): void {
    this.universes.clear();

    // Group checkpoints by universe
    for (const checkpoint of checkpoints) {
      let timeline = this.universes.get(checkpoint.universeId);

      if (!timeline) {
        timeline = {
          universeId: checkpoint.universeId,
          universeName: this.generateUniverseName(checkpoint.magicLawsHash),
          magicLawsHash: checkpoint.magicLawsHash,
          checkpoints: [],
          currentDay: 0,
        };
        this.universes.set(checkpoint.universeId, timeline);
      }

      timeline.checkpoints.push(checkpoint);
      timeline.currentDay = Math.max(timeline.currentDay, checkpoint.day);
    }

    // Sort checkpoints by day within each universe
    for (const timeline of this.universes.values()) {
      timeline.checkpoints.sort((a, b) => a.day - b.day);
    }

    this.render();
  }

  /**
   * Generate a universe name from magic laws hash.
   */
  private generateUniverseName(magicLawsHash: string): string {
    if (magicLawsHash === 'base') {
      return 'The First World';
    }
    return `Universe ${magicLawsHash.substring(0, 8)}`;
  }

  /**
   * Render the timeline interface.
   */
  private render(): void {
    this.container.innerHTML = '';

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Timeline - Select Universe & Time';
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 24px;
      text-align: center;
      color: #ffffff;
    `;
    this.container.appendChild(title);

    if (this.universes.size === 0) {
      const noData = document.createElement('p');
      noData.textContent = 'No checkpoints available. Start a new game to create the first checkpoint.';
      noData.style.cssText = 'text-align: center; color: #888;';
      this.container.appendChild(noData);
      return;
    }

    // Two-column layout: universes | checkpoints
    const mainLayout = document.createElement('div');
    mainLayout.style.cssText = `
      display: flex;
      flex: 1;
      gap: 20px;
      overflow: hidden;
    `;

    // Left: Universe list
    const universeList = this.renderUniverseList();
    mainLayout.appendChild(universeList);

    // Right: Checkpoint list (for selected universe)
    const checkpointList = this.renderCheckpointList();
    mainLayout.appendChild(checkpointList);

    this.container.appendChild(mainLayout);

    // Bottom: Load button
    const loadButton = document.createElement('button');
    loadButton.textContent = 'Load Selected Checkpoint';
    loadButton.disabled = !this.selectedCheckpoint;
    loadButton.style.cssText = `
      margin-top: 20px;
      padding: 12px 24px;
      font-size: 16px;
      font-family: monospace;
      background: ${this.selectedCheckpoint ? '#4CAF50' : '#333'};
      color: ${this.selectedCheckpoint ? '#fff' : '#666'};
      border: none;
      cursor: ${this.selectedCheckpoint ? 'pointer' : 'not-allowed'};
      align-self: center;
    `;
    loadButton.onclick = () => {
      if (this.selectedCheckpoint && this.onLoad) {
        this.onLoad(this.selectedCheckpoint);
        this.hide();
      }
    };
    this.container.appendChild(loadButton);
  }

  /**
   * Render the universe list (left panel).
   */
  private renderUniverseList(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      flex: 1;
      background: #1a1a1a;
      border: 1px solid #333;
      padding: 15px;
      overflow-y: auto;
    `;

    const header = document.createElement('h2');
    header.textContent = 'Universes';
    header.style.cssText = 'margin: 0 0 15px 0; font-size: 18px; color: #fff;';
    panel.appendChild(header);

    for (const timeline of this.universes.values()) {
      const universeCard = document.createElement('div');
      const isSelected = this.selectedUniverse === timeline.universeId;

      universeCard.style.cssText = `
        padding: 12px;
        margin-bottom: 10px;
        background: ${isSelected ? '#2a4a2a' : '#252525'};
        border: 2px solid ${isSelected ? '#4CAF50' : '#333'};
        cursor: pointer;
        transition: all 0.2s;
      `;

      universeCard.onmouseover = () => {
        if (!isSelected) {
          universeCard.style.background = '#303030';
        }
      };
      universeCard.onmouseout = () => {
        if (!isSelected) {
          universeCard.style.background = '#252525';
        }
      };

      universeCard.onclick = () => {
        this.selectedUniverse = timeline.universeId;
        this.selectedCheckpoint = null;  // Reset checkpoint selection
        this.render();
      };

      const name = document.createElement('div');
      name.textContent = timeline.universeName;
      name.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: #fff;';
      universeCard.appendChild(name);

      const info = document.createElement('div');
      info.textContent = `${timeline.checkpoints.length} checkpoints • Day ${timeline.currentDay}`;
      info.style.cssText = 'font-size: 12px; color: #aaa;';
      universeCard.appendChild(info);

      panel.appendChild(universeCard);
    }

    return panel;
  }

  /**
   * Render the checkpoint list (right panel) for selected universe.
   */
  private renderCheckpointList(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      flex: 2;
      background: #1a1a1a;
      border: 1px solid #333;
      padding: 15px;
      overflow-y: auto;
    `;

    const header = document.createElement('h2');
    header.textContent = 'Checkpoints';
    header.style.cssText = 'margin: 0 0 15px 0; font-size: 18px; color: #fff;';
    panel.appendChild(header);

    if (!this.selectedUniverse) {
      const placeholder = document.createElement('p');
      placeholder.textContent = 'Select a universe to view checkpoints';
      placeholder.style.cssText = 'color: #666; text-align: center; margin-top: 50px;';
      panel.appendChild(placeholder);
      return panel;
    }

    const timeline = this.universes.get(this.selectedUniverse);
    if (!timeline) return panel;

    // Render checkpoints in reverse order (newest first)
    const checkpoints = [...timeline.checkpoints].reverse();

    for (const checkpoint of checkpoints) {
      const card = document.createElement('div');
      const isSelected = this.selectedCheckpoint === checkpoint.key;

      card.style.cssText = `
        padding: 12px;
        margin-bottom: 10px;
        background: ${isSelected ? '#2a4a2a' : '#252525'};
        border: 2px solid ${isSelected ? '#4CAF50' : '#333'};
        cursor: pointer;
        transition: all 0.2s;
      `;

      card.onmouseover = () => {
        if (!isSelected) {
          card.style.background = '#303030';
        }
      };
      card.onmouseout = () => {
        if (!isSelected) {
          card.style.background = '#252525';
        }
      };

      card.onclick = () => {
        this.selectedCheckpoint = checkpoint.key;
        this.render();
      };

      const name = document.createElement('div');
      name.textContent = checkpoint.name;
      name.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: #fff;';
      card.appendChild(name);

      const info = document.createElement('div');
      const date = new Date(checkpoint.timestamp).toLocaleString();
      info.textContent = `Day ${checkpoint.day} • ${date}`;
      info.style.cssText = 'font-size: 12px; color: #aaa;';
      card.appendChild(info);

      panel.appendChild(card);
    }

    return panel;
  }

  /**
   * Destroy the timeline panel.
   */
  destroy(): void {
    this.container.remove();
  }
}
