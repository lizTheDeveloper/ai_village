/**
 * AnimalRosterPanel - Persistent panel showing animal portraits for quick access
 *
 * Features:
 * - Shows all living animals
 * - Click animal portrait to focus camera on them and open animal info panel
 * - Highlights selected animal
 */

import { PixelLabSpriteLoader } from './sprites/PixelLabSpriteLoader.js';
import { getAnimalSpriteVariant } from './sprites/AnimalSpriteVariants.js';
import type { World } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

interface AnimalInfo {
  id: string;
  species: string;
  spriteFolder: string;
  lastInteractionTime: number;
}

// Known animal species that use variant system
const ANIMAL_SPECIES = new Set([
  'chicken', 'cow', 'sheep', 'horse', 'dog', 'cat', 'rabbit', 'deer', 'pig', 'goat'
]);

export class AnimalRosterPanel implements IWindowPanel {
  private visible: boolean = false;
  private container: HTMLDivElement;
  private rosterContainer: HTMLDivElement;
  private animals: Map<string, AnimalInfo> = new Map();
  private spriteLoader: PixelLabSpriteLoader;
  private onAnimalClickCallback: ((animalId: string) => void) | null = null;
  private selectedAnimalId: string | null = null;

  getId(): string {
    return 'animal-roster';
  }

  getTitle(): string {
    return 'Animal Roster';
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
   * Set callback for when an animal portrait is clicked
   */
  setOnAnimalClick(callback: (animalId: string) => void): void {
    this.onAnimalClickCallback = callback;
  }

  /**
   * Set the currently selected animal (for highlighting)
   */
  setSelectedAnimal(animalId: string | null): void {
    this.selectedAnimalId = animalId;
    this.updateDOM();
  }

  /**
   * Add or update an animal in the roster
   */
  addAnimal(id: string, species: string, spriteFolder: string): void {
    if (!this.animals.has(id)) {
      this.animals.set(id, {
        id,
        species,
        spriteFolder,
        lastInteractionTime: Date.now(),
      });
      this.updateDOM();
    }
  }

  /**
   * Remove an animal from the roster (e.g., when they die)
   */
  removeAnimal(id: string): void {
    this.animals.delete(id);
    this.updateDOM();
  }

  /**
   * Mark an animal as recently interacted with
   */
  touchAnimal(id: string): void {
    const animal = this.animals.get(id);
    if (animal) {
      animal.lastInteractionTime = Date.now();
      this.updateDOM();
    }
  }

  /**
   * Update the roster display from world state
   */
  updateFromWorld(world: World): void {
    // Get all animals from the world
    const animalEntities = world.query().with('animal', 'appearance').executeEntities();

    for (const entity of animalEntities) {
      const appearance = entity.components.get('appearance') as any;

      if (appearance) {
        let spriteFolder = appearance.spriteFolder || appearance.spriteFolderId || 'chicken';
        const species = spriteFolder;

        // If this is an animal species, use the variant system to get stable sprite ID
        if (ANIMAL_SPECIES.has(spriteFolder)) {
          spriteFolder = getAnimalSpriteVariant(entity.id, spriteFolder);
        }

        if (!this.animals.has(entity.id)) {
          this.addAnimal(entity.id, species, spriteFolder);
        }
      }
    }

    // Remove animals that no longer exist
    const existingIds = new Set(animalEntities.map(e => e.id));
    for (const id of this.animals.keys()) {
      if (!existingIds.has(id)) {
        this.removeAnimal(id);
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
    const animalCount = this.animals.size;
    const showAllButton = animalCount >= 20;
    const maxVisible = showAllButton ? 9 : 20;

    // Get animals sorted by last interaction time
    const sortedAnimals = Array.from(this.animals.values())
      .sort((a, b) => b.lastInteractionTime - a.lastInteractionTime)
      .slice(0, maxVisible);

    // Clear container
    this.rosterContainer.innerHTML = '';

    // Add animal portraits
    for (const animal of sortedAnimals) {
      const portrait = this.createAnimalPortrait(animal);
      this.rosterContainer.appendChild(portrait);
    }

    // Add "All Animals" button if needed
    if (showAllButton) {
      const allButton = this.createAllAnimalsButton();
      this.rosterContainer.appendChild(allButton);
    }
  }

  private createAnimalPortrait(animal: AnimalInfo): HTMLDivElement {
    const isSelected = this.selectedAnimalId === animal.id;
    const portrait = document.createElement('div');
    portrait.style.cssText = `
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 40, 0.95) 100%);
      border: ${isSelected ? '3px solid #ffed4e' : '2px solid #8B4513'};
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
    this.loadAnimalSprite(canvas, animal.spriteFolder);

    // Species tooltip
    const speciesName = animal.species.charAt(0).toUpperCase() + animal.species.slice(1);
    portrait.title = speciesName;

    // Hover effects
    portrait.addEventListener('mouseenter', () => {
      portrait.style.transform = 'scale(1.1)';
      portrait.style.boxShadow = '0 0 15px rgba(139, 69, 19, 0.6)';
      portrait.style.borderColor = '#ffed4e';
    });

    portrait.addEventListener('mouseleave', () => {
      portrait.style.transform = 'scale(1)';
      portrait.style.boxShadow = 'none';
      portrait.style.borderColor = isSelected ? '#ffed4e' : '#8B4513';
    });

    // Click to focus
    portrait.addEventListener('click', () => {
      this.touchAnimal(animal.id);
      this.setSelectedAnimal(animal.id);
      if (this.onAnimalClickCallback) {
        this.onAnimalClickCallback(animal.id);
      }
    });

    portrait.appendChild(canvas);
    return portrait;
  }

  private async loadAnimalSprite(canvas: HTMLCanvasElement, spriteFolder: string): Promise<void> {
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

  private createAllAnimalsButton(): HTMLDivElement {
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
      <div style="font-size: 20px; margin-bottom: 2px;">🐾</div>
      <div>All<br/>Animals</div>
    `;

    button.title = `View all ${this.animals.size} animals`;

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

    // Click to open all animals modal
    button.addEventListener('click', () => {
      this.showAllAnimalsModal();
    });

    return button;
  }

  private showAllAnimalsModal(): void {
    // TODO: Implement all animals modal (similar to AgentRosterPanel)
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
