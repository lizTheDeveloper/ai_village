/**
 * AgentCreationCards - Shows cards for each agent created during soul ceremonies
 *
 * Cards accumulate on screen so you can see all agents that have been created.
 * Each card shows the agent's sprite, name, purpose, and archetype.
 */

import { PixelLabSpriteLoader } from './sprites/PixelLabSpriteLoader.js';

export interface AgentCardData {
  agentId: string;
  name: string;
  purpose: string;
  archetype: string;
  interests: string[];
  spriteFolder: string;
}

export class AgentCreationCards {
  private container: HTMLDivElement;
  private cardsContainer: HTMLDivElement;
  private cards: Map<string, HTMLDivElement> = new Map();
  private spriteLoader: PixelLabSpriteLoader;

  constructor(spriteLoader: PixelLabSpriteLoader) {
    this.spriteLoader = spriteLoader;
    this.container = document.createElement('div');
    this.setupStyles();
    this.cardsContainer = this.createCardsContainer();
    this.container.appendChild(this.cardsContainer);
    document.body.appendChild(this.container);
  }

  private setupStyles(): void {
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      max-height: calc(100vh - 40px);
      display: none;
      flex-direction: column;
      gap: 15px;
      z-index: 10003;
      pointer-events: none;
    `;
  }

  private createCardsContainer(): HTMLDivElement {
    const cards = document.createElement('div');
    cards.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 15px;
      overflow-y: auto;
      padding-right: 10px;
      pointer-events: auto;
    `;
    return cards;
  }

  /**
   * Show the cards container
   */
  show(): void {
    this.container.style.display = 'flex';
  }

  /**
   * Hide the cards container
   */
  hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Clear all cards
   */
  clear(): void {
    this.cards.clear();
    this.cardsContainer.innerHTML = '';
  }

  /**
   * Add a new agent card
   */
  addAgentCard(data: AgentCardData): void {
    const card = this.createAgentCard(data);
    this.cards.set(data.agentId, card);
    this.cardsContainer.appendChild(card);

    // Scroll to bottom to show new card
    this.cardsContainer.scrollTop = this.cardsContainer.scrollHeight;
  }

  private createAgentCard(data: AgentCardData): HTMLDivElement {
    const card = document.createElement('div');
    card.style.cssText = `
      background: linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 40, 0.95) 100%);
      border: 2px solid #ffd700;
      border-radius: 12px;
      padding: 15px;
      box-shadow: 0 4px 20px rgba(255, 215, 0, 0.2);
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation keyframes
    if (!document.getElementById('agent-card-animations')) {
      const style = document.createElement('style');
      style.id = 'agent-card-animations';
      style.textContent = `
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Header with sprite and name
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255, 215, 0, 0.3);
      padding-bottom: 10px;
    `;

    // Sprite canvas
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 64;
    spriteCanvas.height = 64;
    spriteCanvas.style.cssText = `
      width: 64px;
      height: 64px;
      image-rendering: pixelated;
      border: 1px solid rgba(255, 215, 0, 0.5);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.3);
    `;

    // Load and render sprite
    this.loadAgentSprite(spriteCanvas, data.spriteFolder);

    // Name and archetype
    const nameContainer = document.createElement('div');
    nameContainer.style.cssText = `
      flex: 1;
    `;

    const nameEl = document.createElement('div');
    nameEl.textContent = data.name;
    nameEl.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: #ffd700;
      margin-bottom: 4px;
      font-family: 'Georgia', serif;
    `;

    const archetypeEl = document.createElement('div');
    archetypeEl.textContent = data.archetype;
    archetypeEl.style.cssText = `
      font-size: 13px;
      color: #aaa;
      font-style: italic;
    `;

    nameContainer.appendChild(nameEl);
    nameContainer.appendChild(archetypeEl);

    header.appendChild(spriteCanvas);
    header.appendChild(nameContainer);

    // Purpose
    const purposeEl = document.createElement('div');
    purposeEl.textContent = data.purpose;
    purposeEl.style.cssText = `
      font-size: 13px;
      color: #ddd;
      line-height: 1.4;
      margin-bottom: 10px;
      font-style: italic;
    `;

    // Interests
    const interestsContainer = document.createElement('div');
    interestsContainer.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    `;

    for (const interest of data.interests) {
      const tag = document.createElement('span');
      tag.textContent = interest;
      tag.style.cssText = `
        background: rgba(255, 215, 0, 0.2);
        border: 1px solid rgba(255, 215, 0, 0.4);
        border-radius: 12px;
        padding: 4px 10px;
        font-size: 11px;
        color: #ffd700;
      `;
      interestsContainer.appendChild(tag);
    }

    card.appendChild(header);
    card.appendChild(purposeEl);
    card.appendChild(interestsContainer);

    return card;
  }

  private async loadAgentSprite(canvas: HTMLCanvasElement, spriteFolder: string): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Load the sprite
      const character = await this.spriteLoader.loadCharacter(spriteFolder);

      // Get south-facing static rotation image
      const southImage = character.rotations.get('south');
      if (southImage) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw sprite centered
        const scale = 2; // Scale up for better visibility
        const x = (canvas.width - southImage.width * scale) / 2;
        const y = (canvas.height - southImage.height * scale) / 2;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          southImage,
          x, y, southImage.width * scale, southImage.height * scale
        );
      } else {
        // Fallback: draw placeholder
        this.drawPlaceholder(ctx, canvas.width, canvas.height);
      }
    } catch (error) {
      console.warn(`[AgentCreationCards] Failed to load sprite ${spriteFolder}:`, error);
      // Draw placeholder on error
      this.drawPlaceholder(ctx, canvas.width, canvas.height);
    }
  }

  private drawPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draw a simple person silhouette as placeholder
    ctx.fillStyle = '#666';
    ctx.beginPath();
    // Head
    ctx.arc(width / 2, height / 3, width / 6, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillRect(width / 2 - width / 8, height / 2, width / 4, height / 3);
  }
}
