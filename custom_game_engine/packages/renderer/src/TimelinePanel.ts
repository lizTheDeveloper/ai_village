/**
 * TimelinePanel - Visual timeline browser for universe/checkpoint selection
 *
 * Advanced timeline visualization with:
 * - Parallel timelines: Multiple playthroughs in the same universe (same magic laws)
 * - Fork branches: Timeline splits when rewinding to earlier checkpoint
 * - Portal grid: Visual connections between universes via portals
 *
 * User flow:
 * 1. Select a universe (each has different magic laws)
 * 2. Select a timeline within that universe (different playthroughs)
 * 3. Select when in that timeline (which checkpoint/day)
 * 4. Load that checkpoint (may fork if rewinding from current time)
 */

import type { Checkpoint } from '../../core/src/systems/AutoSaveSystem.js';
import type { IWindowPanel } from './types/WindowTypes.js';

export interface Timeline {
  id: string;  // Unique timeline ID
  universeId: string;
  checkpoints: Checkpoint[];
  forkParent?: string;  // Parent timeline ID if this is a fork
  forkPoint?: number;   // Day number where fork occurred
  isActive: boolean;    // Currently active timeline
}

export interface UniverseTimeline {
  universeId: string;
  universeName: string;
  magicLawsHash: string;
  timelines: Timeline[];  // Multiple parallel timelines
  portalConnections: string[];  // Other universe IDs connected by portals
  currentDay: number;  // Latest day across all timelines
}

export class TimelinePanel implements IWindowPanel {
  private visible: boolean = false;
  private container: HTMLElement;
  private universes: Map<string, UniverseTimeline> = new Map();
  private selectedUniverse: string | null = null;
  private selectedTimeline: string | null = null;
  private selectedCheckpoint: string | null = null;
  private onLoad: ((checkpointKey: string) => void) | null = null;


  getId(): string {
    return 'timeline';
  }

  getTitle(): string {
    return 'Timeline';
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

  // DOM-based panel - no canvas rendering needed
  render(
    _ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    _width: number,
    _height: number,
    _world?: unknown
  ): void {
    // TimelinePanel uses DOM elements, not canvas rendering
  }

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

    this.renderDOM();
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
    this.selectedTimeline = null;
    this.selectedCheckpoint = null;
  }

  /**
   * Set available universes and checkpoints.
   * Groups checkpoints into timelines and detects forks.
   */
  setTimelines(checkpoints: Checkpoint[], portalConnections?: Map<string, string[]>): void {
    this.universes.clear();

    // Group checkpoints by universe
    const universeCheckpoints = new Map<string, Checkpoint[]>();
    for (const checkpoint of checkpoints) {
      let list = universeCheckpoints.get(checkpoint.universeId);
      if (!list) {
        list = [];
        universeCheckpoints.set(checkpoint.universeId, list);
      }
      list.push(checkpoint);
    }

    // Build timelines for each universe
    for (const [universeId, checkpointList] of universeCheckpoints) {
      const sortedCheckpoints = checkpointList.sort((a, b) => a.day - b.day);

      // For now, create a single timeline per universe
      // In the future, detect forks from checkpoint metadata
      const mainTimeline: Timeline = {
        id: `${universeId}_main`,
        universeId,
        checkpoints: sortedCheckpoints,
        isActive: true,
      };

      const universeName = this.generateUniverseName(
        sortedCheckpoints[0]?.magicLawsHash || 'base'
      );

      const universe: UniverseTimeline = {
        universeId,
        universeName,
        magicLawsHash: sortedCheckpoints[0]?.magicLawsHash || 'base',
        timelines: [mainTimeline],
        portalConnections: portalConnections?.get(universeId) || [],
        currentDay: Math.max(...sortedCheckpoints.map(c => c.day), 0),
      };

      this.universes.set(universeId, universe);
    }

    this.renderDOM();
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
   * Render the timeline interface (DOM-based).
   */
  private renderDOM(): void {
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

    // Three-column layout: universes | timelines | checkpoints
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

    // Middle: Timeline list (for selected universe)
    const timelineList = this.renderTimelineList();
    mainLayout.appendChild(timelineList);

    // Right: Checkpoint list (for selected timeline)
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
        this.selectedTimeline = null;  // Reset timeline selection
        this.selectedCheckpoint = null;  // Reset checkpoint selection
        this.renderDOM();
      };

      const name = document.createElement('div');
      name.textContent = timeline.universeName;
      name.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: #fff;';
      universeCard.appendChild(name);

      const info = document.createElement('div');
      const totalCheckpoints = timeline.timelines.reduce((sum, t) => sum + t.checkpoints.length, 0);
      const timelineCount = timeline.timelines.length;
      info.textContent = `${timelineCount} timeline(s) • ${totalCheckpoints} checkpoints • Day ${timeline.currentDay}`;
      info.style.cssText = 'font-size: 12px; color: #aaa;';
      universeCard.appendChild(info);

      panel.appendChild(universeCard);
    }

    return panel;
  }

  /**
   * Render a visual tree showing timeline fork relationships.
   */
  private renderTimelineTree(universe: UniverseTimeline): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      margin-bottom: 20px;
      padding: 15px;
      background: #0a0a0a;
      border: 1px solid #444;
      border-radius: 4px;
    `;

    const title = document.createElement('div');
    title.textContent = 'Timeline Branches';
    title.style.cssText = 'font-size: 12px; color: #888; margin-bottom: 10px;';
    container.appendChild(title);

    // Create SVG for timeline tree
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '200');
    svg.style.cssText = 'background: #0a0a0a;';

    // Build tree structure
    const rootTimeline = universe.timelines.find(t => !t.forkParent);
    if (!rootTimeline) return container;

    // Layout parameters
    const xStart = 20;
    const yStart = 20;
    const xSpacing = 100;
    const ySpacing = 40;

    // Render root timeline
    this.renderTimelineNode(svg, rootTimeline, xStart, yStart);

    // Render child timelines (forks)
    let childIndex = 0;
    for (const timeline of universe.timelines) {
      if (timeline.forkParent === rootTimeline.id) {
        childIndex++;
        const childX = xStart + xSpacing;
        const childY = yStart + (childIndex * ySpacing);

        // Draw branch line from parent to child
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(xStart + 50));
        line.setAttribute('y1', String(yStart + 10));
        line.setAttribute('x2', String(childX));
        line.setAttribute('y2', String(childY + 10));
        line.setAttribute('stroke', '#4CAF50');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        svg.appendChild(line);

        // Render child node
        this.renderTimelineNode(svg, timeline, childX, childY);
      }
    }

    container.appendChild(svg);
    return container;
  }

  /**
   * Render a single timeline node in the SVG tree.
   */
  private renderTimelineNode(
    svg: SVGSVGElement,
    timeline: Timeline,
    x: number,
    y: number
  ): void {
    // Circle for timeline node
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(x + 10));
    circle.setAttribute('cy', String(y + 10));
    circle.setAttribute('r', '8');
    circle.setAttribute('fill', timeline.isActive ? '#4CAF50' : '#666');
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', '2');
    svg.appendChild(circle);

    // Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x + 25));
    text.setAttribute('y', String(y + 15));
    text.setAttribute('fill', '#aaa');
    text.setAttribute('font-size', '11');
    text.setAttribute('font-family', 'monospace');

    const label = timeline.forkParent
      ? `Fork @ Day ${timeline.forkPoint}`
      : 'Main';
    text.textContent = label;
    svg.appendChild(text);
  }

  /**
   * Render the timeline list (middle panel) for selected universe.
   */
  private renderTimelineList(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      flex: 1;
      background: #1a1a1a;
      border: 1px solid #333;
      padding: 15px;
      overflow-y: auto;
    `;

    const header = document.createElement('h2');
    header.textContent = 'Timelines';
    header.style.cssText = 'margin: 0 0 15px 0; font-size: 18px; color: #fff;';
    panel.appendChild(header);

    if (!this.selectedUniverse) {
      const placeholder = document.createElement('p');
      placeholder.textContent = 'Select a universe to view timelines';
      placeholder.style.cssText = 'color: #666; text-align: center; margin-top: 50px;';
      panel.appendChild(placeholder);
      return panel;
    }

    const universe = this.universes.get(this.selectedUniverse);
    if (!universe) return panel;

    // Add timeline tree visualization if there are forks
    const hasForks = universe.timelines.some(t => t.forkParent);
    if (hasForks) {
      const treeViz = this.renderTimelineTree(universe);
      panel.appendChild(treeViz);
    }

    // Show portal connections if any
    if (universe.portalConnections.length > 0) {
      const portalInfo = document.createElement('div');
      portalInfo.style.cssText = `
        padding: 10px;
        margin-bottom: 15px;
        background: #1e2a3a;
        border: 1px solid #4a5a6a;
        border-radius: 4px;
        font-size: 12px;
        color: #aaa;
      `;
      portalInfo.innerHTML = `<strong style="color: #64b5f6;">Portal Connections:</strong><br/>
        Connected to ${universe.portalConnections.length} other universe(s)`;
      panel.appendChild(portalInfo);
    }

    // Render timelines
    for (const timeline of universe.timelines) {
      const card = document.createElement('div');
      const isSelected = this.selectedTimeline === timeline.id;

      card.style.cssText = `
        padding: 12px;
        margin-bottom: 10px;
        background: ${isSelected ? '#2a4a2a' : '#252525'};
        border: 2px solid ${isSelected ? '#4CAF50' : '#333'};
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
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
        this.selectedTimeline = timeline.id;
        this.selectedCheckpoint = null;  // Reset checkpoint selection
        this.renderDOM();
      };

      // Timeline name/label
      const name = document.createElement('div');
      const timelineName = timeline.forkParent
        ? `Fork from Day ${timeline.forkPoint}`
        : 'Main Timeline';
      name.textContent = timelineName;
      name.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: #fff;';
      card.appendChild(name);

      // Timeline info
      const info = document.createElement('div');
      const checkpointCount = timeline.checkpoints.length;
      const latestDay = Math.max(...timeline.checkpoints.map(c => c.day), 0);
      info.textContent = `${checkpointCount} checkpoints • Day ${latestDay}`;
      info.style.cssText = 'font-size: 12px; color: #aaa;';
      card.appendChild(info);

      // Active indicator
      if (timeline.isActive) {
        const activeTag = document.createElement('div');
        activeTag.textContent = 'Active';
        activeTag.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          background: #4CAF50;
          color: #fff;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
        `;
        card.appendChild(activeTag);
      }

      panel.appendChild(card);
    }

    return panel;
  }

  /**
   * Render the checkpoint list (right panel) for selected timeline.
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

    if (!this.selectedTimeline) {
      const placeholder = document.createElement('p');
      placeholder.textContent = 'Select a timeline to view checkpoints';
      placeholder.style.cssText = 'color: #666; text-align: center; margin-top: 50px;';
      panel.appendChild(placeholder);
      return panel;
    }

    // Find the selected timeline
    const universe = this.universes.get(this.selectedUniverse!);
    if (!universe) return panel;

    const timeline = universe.timelines.find(t => t.id === this.selectedTimeline);
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
        this.renderDOM();
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
