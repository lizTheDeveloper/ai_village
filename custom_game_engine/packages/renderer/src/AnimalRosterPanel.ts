/**
 * AnimalRosterPanel - Persistent panel showing animal portraits for quick access
 *
 * Features:
 * - Shows all living animals
 * - Click animal portrait to focus camera on them and open animal info panel
 * - Highlights selected animal
 *
 * Extends BaseRosterPanel with animal-specific theming and world update logic.
 */

import { BaseRosterPanel } from './BaseRosterPanel.js';
import type { RosterItemInfo, RosterTheme } from './BaseRosterPanel.js';
import { PixelLabSpriteLoader } from './sprites/PixelLabSpriteLoader.js';
import { getAnimalSpriteVariant } from './sprites/AnimalSpriteVariants.js';
import type { World } from '@ai-village/core';

// Component interface for type safety
interface AppearanceComponent {
  spriteFolder?: string;
  spriteFolderId?: string;
}

export interface AnimalInfo extends RosterItemInfo {
  species: string;
}

// Known animal species that use variant system
const ANIMAL_SPECIES = new Set([
  'chicken', 'cow', 'sheep', 'horse', 'dog', 'cat', 'rabbit', 'deer', 'pig', 'goat'
]);

export class AnimalRosterPanel extends BaseRosterPanel<AnimalInfo> {
  constructor(spriteLoader: PixelLabSpriteLoader) {
    super(spriteLoader);
  }

  // --- Abstract method implementations ---

  getId(): string {
    return 'animal-roster';
  }

  getTitle(): string {
    return 'Animal Roster';
  }

  getDisplayName(item: AnimalInfo): string {
    return item.species.charAt(0).toUpperCase() + item.species.slice(1);
  }

  getTheme(): RosterTheme {
    return {
      borderColor: '#8B4513',
      selectedBorderColor: '#ffed4e',
      hoverGlowColor: 'rgba(139, 69, 19, 0.6)',
      modalBackground: 'linear-gradient(135deg, #2e1a1a 0%, #3e2116 50%, #604610 100%)',
      modalBorderColor: '#8B4513',
      modalTitleColor: '#8B4513',
      modalBorderBottom: 'rgba(139, 69, 19, 0.3)',
    };
  }

  getAllButtonLabel(): string {
    return 'Animals';
  }

  getAllButtonEmoji(): string {
    return '\u{1F43E}';
  }

  sortItemsForModal(items: AnimalInfo[]): AnimalInfo[] {
    // Sort animals by species then by ID
    return items.sort((a, b) => {
      const speciesCompare = a.species.localeCompare(b.species);
      if (speciesCompare !== 0) return speciesCompare;
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * Update the roster display from world state
   */
  updateFromWorld(world: World): void {
    // Get all animals from the world
    const animalEntities = world.query().with('animal', 'appearance').executeEntities();

    for (const entity of animalEntities) {
      const appearance = entity.components.get('appearance') as AppearanceComponent | undefined;

      if (appearance) {
        let spriteFolder = appearance.spriteFolder || appearance.spriteFolderId || 'chicken';
        const species = spriteFolder;

        // If this is an animal species, use the variant system to get stable sprite ID
        if (ANIMAL_SPECIES.has(spriteFolder)) {
          spriteFolder = getAnimalSpriteVariant(entity.id, spriteFolder);
        }

        if (!this.items.has(entity.id)) {
          this.addAnimal(entity.id, species, spriteFolder);
        }
      }
    }

    // Remove animals that no longer exist
    const existingIds = new Set(animalEntities.map(e => e.id));
    for (const id of this.items.keys()) {
      if (!existingIds.has(id)) {
        this.removeAnimal(id);
      }
    }
  }

  // --- Backwards-compatible public API wrappers ---

  /**
   * Set callback for when an animal portrait is clicked
   */
  setOnAnimalClick(callback: (animalId: string) => void): void {
    this.setOnItemClick(callback);
  }

  /**
   * Set the currently selected animal (for highlighting)
   */
  setSelectedAnimal(animalId: string | null): void {
    this.setSelectedItem(animalId);
  }

  /**
   * Add or update an animal in the roster
   */
  addAnimal(id: string, species: string, spriteFolder: string): void {
    this.addItem(id, {
      id,
      species,
      spriteFolder,
      lastInteractionTime: Date.now(),
    });
  }

  /**
   * Remove an animal from the roster (e.g., when they die)
   */
  removeAnimal(id: string): void {
    this.removeItem(id);
  }

  /**
   * Mark an animal as recently interacted with
   */
  touchAnimal(id: string): void {
    this.touchItem(id);
  }
}
