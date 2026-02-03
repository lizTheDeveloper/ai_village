/**
 * AgentRosterPanel - Persistent panel showing agent portraits for quick access
 *
 * Features:
 * - Shows all agents when < 20
 * - Shows 9 most recently interacted + "All Agents" button when >= 20
 * - Click agent portrait to focus camera on them
 * - "All Agents" button opens full roster modal
 *
 * Extends BaseRosterPanel with agent-specific theming and world update logic.
 */

import { BaseRosterPanel } from './BaseRosterPanel.js';
import type { RosterItemInfo, RosterTheme } from './BaseRosterPanel.js';
import { PixelLabSpriteLoader } from './sprites/PixelLabSpriteLoader.js';
import { getAnimalSpriteVariant } from './sprites/AnimalSpriteVariants.js';
import { lookupSprite } from './sprites/SpriteService.js';
import type { World, IdentityComponent, AppearanceComponent } from '@ai-village/core';

export interface AgentInfo extends RosterItemInfo {
  name: string;
}

// Known animal species that use variant system
const ANIMAL_SPECIES = new Set([
  'chicken', 'cow', 'sheep', 'horse', 'dog', 'cat', 'rabbit', 'deer', 'pig', 'goat'
]);

export class AgentRosterPanel extends BaseRosterPanel<AgentInfo> {
  constructor(spriteLoader: PixelLabSpriteLoader) {
    super(spriteLoader);
  }

  // --- Abstract method implementations ---

  getId(): string {
    return 'agent-roster';
  }

  getTitle(): string {
    return 'Agent Roster';
  }

  getDisplayName(item: AgentInfo): string {
    return item.name;
  }

  getTheme(): RosterTheme {
    return {
      borderColor: '#ffd700',
      selectedBorderColor: '#ffed4e',
      hoverGlowColor: 'rgba(255, 215, 0, 0.6)',
      modalBackground: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      modalBorderColor: '#ffd700',
      modalTitleColor: '#ffd700',
      modalBorderBottom: 'rgba(255, 215, 0, 0.3)',
    };
  }

  getAllButtonLabel(): string {
    return 'Agents';
  }

  getAllButtonEmoji(): string {
    return '\u{1F465}';
  }

  sortItemsForModal(items: AgentInfo[]): AgentInfo[] {
    // Sort agents alphabetically by name
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update the roster display from world state
   */
  updateFromWorld(world: World): void {
    // Get all agents from the world
    const agentEntities = world.query().with('agent', 'identity', 'appearance').executeEntities();

    for (const entity of agentEntities) {
      const identity = entity.components.get('identity') as IdentityComponent | undefined;
      const appearance = entity.components.get('appearance') as AppearanceComponent | undefined;

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
        const existingAgent = this.items.get(entity.id);
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
    for (const id of this.items.keys()) {
      if (!existingIds.has(id)) {
        this.removeAgent(id);
      }
    }
  }

  // --- Backwards-compatible public API wrappers ---

  /**
   * Set callback for when an agent portrait is clicked
   */
  setOnAgentClick(callback: (agentId: string) => void): void {
    this.setOnItemClick(callback);
  }

  /**
   * Set the currently selected agent (for highlighting)
   */
  setSelectedAgent(agentId: string | null): void {
    this.setSelectedItem(agentId);
  }

  /**
   * Add or update an agent in the roster
   */
  addAgent(id: string, name: string, spriteFolder: string): void {
    this.addItem(id, {
      id,
      name,
      spriteFolder,
      lastInteractionTime: Date.now(),
    });
  }

  /**
   * Remove an agent from the roster (e.g., when they die)
   */
  removeAgent(id: string): void {
    this.removeItem(id);
  }

  /**
   * Mark an agent as recently interacted with
   * @param skipRender - If true, don't trigger a DOM update (useful when called before setSelectedAgent)
   */
  touchAgent(id: string, skipRender: boolean = false): void {
    this.touchItem(id, skipRender);
  }
}
