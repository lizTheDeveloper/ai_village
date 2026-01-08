/**
 * AgentRosterPanel - Persistent panel showing agent portraits for quick access
 *
 * Features:
 * - Shows all agents when < 20
 * - Shows 9 most recently interacted + "All Agents" button when >= 20
 * - Click agent portrait to focus camera on them
 * - "All Agents" button opens full roster modal
 */

import { PixelLabSpriteLoader } from './sprites/PixelLabSpriteLoader.js';
import { getAnimalSpriteVariant } from './sprites/AnimalSpriteVariants.js';
import { lookupSprite } from './sprites/SpriteService.js';
import type { World } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

interface AgentInfo {
  id: string;
  name: string;
  spriteFolder: string;
  lastInteractionTime: number;
}

// Known animal species that use variant system
const ANIMAL_SPECIES = new Set([
  'chicken', 'cow', 'sheep', 'horse', 'dog', 'cat', 'rabbit', 'deer', 'pig', 'goat'
]);

export class AgentRosterPanel implements IWindowPanel {
  private visible: boolean = false;
  private container: HTMLDivElement;
  private rosterContainer: HTMLDivElement;
  private agents: Map<string, AgentInfo> = new Map();
  private spriteLoader: PixelLabSpriteLoader;
  private onAgentClickCallback: ((agentId: string) => void) | null = null;
  private selectedAgentId: string | null = null;


  getId(): string {
    return 'agent-roster';
  }

  getTitle(): string {
    return 'Agent Roster';
  }

  getDefaultWidth(): number {
    return 400;
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

  constructor(spriteLoader: PixelLabSpriteLoader) {
    this.spriteLoader = spriteLoader;
    this.container = document.createElement('div');
    this.setupStyles();
    this.rosterContainer = this.createRosterContainer();
    this.container.appendChild(this.rosterContainer);
    document.body.appendChild(this.container);
  }

  private setupStyles(): void {
    this.container.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      width: 80px;
      max-height: calc(100vh - 80px);
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1000;
      pointer-events: none;
    `;
  }

  private createRosterContainer(): HTMLDivElement {
    const roster = document.createElement('div');
    roster.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      pointer-events: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 215, 0, 0.3) transparent;
    `;
    roster.style.setProperty('scrollbar-width', 'thin');
    return roster;
  }

  /**
   * Set callback for when an agent portrait is clicked
   */
  setOnAgentClick(callback: (agentId: string) => void): void {
    this.onAgentClickCallback = callback;
  }

  /**
   * Set the currently selected agent (for highlighting)
   */
  setSelectedAgent(agentId: string | null): void {
    this.selectedAgentId = agentId;
    this.updateDOM();
  }

  /**
   * Add or update an agent in the roster
   */
  addAgent(id: string, name: string, spriteFolder: string): void {
    if (!this.agents.has(id)) {
      this.agents.set(id, {
        id,
        name,
        spriteFolder,
        lastInteractionTime: Date.now(),
      });
      this.updateDOM();
    }
  }

  /**
   * Remove an agent from the roster (e.g., when they die)
   */
  removeAgent(id: string): void {
    this.agents.delete(id);
    this.updateDOM();
  }

  /**
   * Mark an agent as recently interacted with
   * @param skipRender - If true, don't trigger a DOM update (useful when called before setSelectedAgent)
   */
  touchAgent(id: string, skipRender: boolean = false): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.lastInteractionTime = Date.now();
      if (!skipRender) {
        this.updateDOM();
      }
    }
  }

  /**
   * Update the roster display
   */
  updateFromWorld(world: World): void {
    // Get all agents from the world
    const agentEntities = world.query().with('agent', 'identity', 'appearance').executeEntities();

    for (const entity of agentEntities) {
      const identity = entity.components.get('identity') as any;
      const appearance = entity.components.get('appearance') as any;

      if (identity && appearance) {
        const name = identity.name || 'Unknown';

        // Use spriteFolderId if already cached, otherwise look up from appearance traits
        let spriteFolder: string;
        if (appearance.spriteFolderId) {
          spriteFolder = appearance.spriteFolderId;
        } else {
          // Look up sprite folder from appearance traits (same as Renderer does)
          const traits = {
            species: appearance.species || 'human',
            gender: appearance.gender,
            hairColor: appearance.hairColor,
            skinTone: appearance.skinTone,
          };
          const spriteResult = lookupSprite(traits);
          spriteFolder = spriteResult.folderId;
        }

        // If this is an animal, use the variant system to get stable sprite ID
        if (ANIMAL_SPECIES.has(spriteFolder)) {
          spriteFolder = getAnimalSpriteVariant(entity.id, spriteFolder);
        }

        // Add or update agent in roster
        const existingAgent = this.agents.get(entity.id);
        if (!existingAgent) {
          this.addAgent(entity.id, name, spriteFolder);
        } else if (existingAgent.spriteFolder !== spriteFolder || existingAgent.name !== name) {
          // Update if sprite or name changed
          existingAgent.spriteFolder = spriteFolder;
          existingAgent.name = name;
          this.updateDOM();
        }
      }
    }

    // Remove agents that no longer exist
    const existingIds = new Set(agentEntities.map(e => e.id));
    for (const id of this.agents.keys()) {
      if (!existingIds.has(id)) {
        this.removeAgent(id);
      }
    }
  }

  /**
   * IWindowPanel render method (no-op for DOM-based panel)
   */
  render(
    _ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    _width: number,
    _height: number,
    _world?: World
  ): void {
    // This is a DOM-based panel, not canvas-based
    // Rendering happens in updateDOM()
  }

  /**
   * Update the DOM elements for this roster panel
   */
  private updateDOM(): void {
    const agentCount = this.agents.size;
    const showAllButton = agentCount >= 20;
    const maxVisible = showAllButton ? 9 : 20;

    // Get agents - use interaction time only for filtering (when >= 20 agents),
    // but always display in stable order (by name) to prevent portraits from
    // rearranging when clicked
    let agentsToShow = Array.from(this.agents.values());

    if (showAllButton) {
      // Filter to most recently interacted agents
      agentsToShow = agentsToShow
        .sort((a, b) => b.lastInteractionTime - a.lastInteractionTime)
        .slice(0, maxVisible);
    }

    // Sort by name for stable display order
    const sortedAgents = agentsToShow.sort((a, b) => a.name.localeCompare(b.name));

    // Clear container
    this.rosterContainer.innerHTML = '';

    // Add agent portraits
    for (const agent of sortedAgents) {
      const portrait = this.createAgentPortrait(agent);
      this.rosterContainer.appendChild(portrait);
    }

    // Add "All Agents" button if needed
    if (showAllButton) {
      const allButton = this.createAllAgentsButton();
      this.rosterContainer.appendChild(allButton);
    }
  }

  private createAgentPortrait(agent: AgentInfo): HTMLDivElement {
    const isSelected = this.selectedAgentId === agent.id;
    const portrait = document.createElement('div');
    portrait.style.cssText = `
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 40, 0.95) 100%);
      border: ${isSelected ? '3px solid #ffed4e' : '2px solid #ffd700'};
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
      ${isSelected ? 'box-shadow: 0 0 20px rgba(255, 237, 78, 0.8);' : ''}
    `;

    // Sprite canvas
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    canvas.style.cssText = `
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
    `;

    // Load sprite
    this.loadAgentSprite(canvas, agent.spriteFolder);

    // Name tooltip
    portrait.title = agent.name;

    // Hover effects
    portrait.addEventListener('mouseenter', () => {
      portrait.style.transform = 'scale(1.1)';
      portrait.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.6)';
      portrait.style.borderColor = '#ffed4e';
    });

    portrait.addEventListener('mouseleave', () => {
      portrait.style.transform = 'scale(1)';
      portrait.style.boxShadow = 'none';
      portrait.style.borderColor = '#ffd700';
    });

    // Click to focus
    portrait.addEventListener('click', () => {
      // Skip render on touchAgent since setSelectedAgent will trigger updateDOM
      this.touchAgent(agent.id, true);
      this.setSelectedAgent(agent.id);
      if (this.onAgentClickCallback) {
        this.onAgentClickCallback(agent.id);
      }
    });

    portrait.appendChild(canvas);
    return portrait;
  }

  private createAllAgentsButton(): HTMLDivElement {
    const button = document.createElement('div');
    button.style.cssText = `
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, rgba(50, 50, 70, 0.95) 0%, rgba(40, 40, 60, 0.95) 100%);
      border: 2px solid #87CEEB;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      color: #87CEEB;
      text-align: center;
      padding: 5px;
    `;

    button.innerHTML = `
      <div style="font-size: 20px; margin-bottom: 2px;">👥</div>
      <div>All<br/>Agents</div>
    `;

    button.title = `View all ${this.agents.size} agents`;

    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 0 15px rgba(135, 206, 235, 0.6)';
      button.style.borderColor = '#ADD8E6';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = 'none';
      button.style.borderColor = '#87CEEB';
    });

    // Click to open all agents modal
    button.addEventListener('click', () => {
      this.showAllAgentsModal();
    });

    return button;
  }

  private async loadAgentSprite(canvas: HTMLCanvasElement, spriteFolder: string): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const character = await this.spriteLoader.loadCharacter(spriteFolder);
      const southImage = character.rotations.get('south');

      if (southImage) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(
          canvas.width / southImage.width,
          canvas.height / southImage.height
        );
        const x = (canvas.width - southImage.width * scale) / 2;
        const y = (canvas.height - southImage.height * scale) / 2;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          southImage,
          x, y,
          southImage.width * scale,
          southImage.height * scale
        );
      } else {
        this.drawPlaceholder(ctx, canvas.width, canvas.height);
      }
    } catch (error) {
      console.warn(`[AgentRoster] Failed to load sprite ${spriteFolder}:`, error);
      this.drawPlaceholder(ctx, canvas.width, canvas.height);
    }
  }

  private drawPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(width / 2, height / 3, width / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(width / 2 - width / 8, height / 2, width / 4, height / 3);
  }

  private showAllAgentsModal(): void {
    // Create modal backdrop
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10001;
    `;

    // Create modal content
    const content = document.createElement('div');
    content.style.cssText = `
      width: 90%;
      max-width: 800px;
      max-height: 80vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      border: 2px solid #ffd700;
      border-radius: 12px;
      padding: 20px;
      overflow-y: auto;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid rgba(255, 215, 0, 0.3);
    `;

    const title = document.createElement('h2');
    title.textContent = `All Agents (${this.agents.size})`;
    title.style.cssText = `
      color: #ffd700;
      margin: 0;
      font-size: 24px;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: transparent;
      border: 2px solid #ffd700;
      color: #ffd700;
      width: 35px;
      height: 35px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 24px;
      line-height: 1;
      transition: all 0.2s;
    `;
    closeBtn.addEventListener('click', () => modal.remove());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Agent grid
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 15px;
    `;

    // Sort agents alphabetically
    const sortedAgents = Array.from(this.agents.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const agent of sortedAgents) {
      const card = this.createModalAgentCard(agent, modal);
      grid.appendChild(card);
    }

    content.appendChild(header);
    content.appendChild(grid);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Store modal reference for future use if needed
    // this.allAgentsModal = modal;
  }

  private createModalAgentCard(agent: AgentInfo, modal: HTMLDivElement): HTMLDivElement {
    const card = document.createElement('div');
    card.style.cssText = `
      background: linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 40, 0.95) 100%);
      border: 2px solid #ffd700;
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    `;

    // Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    canvas.style.cssText = `
      width: 100%;
      height: 100px;
      image-rendering: pixelated;
      margin-bottom: 8px;
    `;
    this.loadAgentSprite(canvas, agent.spriteFolder);

    // Name
    const name = document.createElement('div');
    name.textContent = agent.name;
    name.style.cssText = `
      color: #ffd700;
      font-size: 13px;
      font-weight: bold;
      word-wrap: break-word;
    `;

    // Hover effects
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-5px)';
      card.style.boxShadow = '0 5px 20px rgba(255, 215, 0, 0.4)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'none';
    });

    // Click to focus and close modal
    card.addEventListener('click', () => {
      // Skip render on touchAgent since setSelectedAgent will trigger updateDOM
      this.touchAgent(agent.id, true);
      this.setSelectedAgent(agent.id);
      if (this.onAgentClickCallback) {
        this.onAgentClickCallback(agent.id);
      }
      modal.remove();
    });

    card.appendChild(canvas);
    card.appendChild(name);
    return card;
  }

  /**
   * Show the roster panel
   */
  show(): void {
    this.container.style.display = 'flex';
  }

  /**
   * Hide the roster panel
   */
  hide(): void {
    this.container.style.display = 'none';
  }
}
