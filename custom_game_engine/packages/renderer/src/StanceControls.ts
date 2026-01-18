import type { EventBus, Entity, Component } from '@ai-village/core';

/**
 * StanceControls - UI controls for setting combat stances
 *
 * REQ-COMBAT-004: Stance Controls
 * - Buttons to set combat behavior
 * - Passive, Defensive, Aggressive, Flee options
 * - Keyboard shortcuts (1-4)
 * - Multi-selection support
 */
export class StanceControls {
  private eventBus: EventBus;
  private selectedEntities: Entity[] = [];
  private currentStance: string = 'passive';
  private element: HTMLElement | null = null;

  private readonly VALID_STANCES = ['passive', 'defensive', 'aggressive', 'flee'];

  private readonly STANCE_DESCRIPTIONS = {
    passive: 'Passive: Avoid combat, won\'t fight back',
    defensive: 'Defensive: Fight only when attacked',
    aggressive: 'Aggressive: Actively seek and attack threats',
    flee: 'Flee: Retreat from danger immediately',
  };

  // Keyboard shortcuts
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(eventBus: EventBus) {
    if (!eventBus) {
      throw new Error('StanceControls requires EventBus parameter');
    }

    this.eventBus = eventBus;

    // Set up keyboard shortcuts
    this.keyboardHandler = this.handleKeyboard.bind(this);
    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * Set selected entities
   */
  public setSelectedEntities(entities: Entity[]): void {
    this.selectedEntities = entities;

    // Update current stance based on selection
    if (entities.length === 0) {
      this.currentStance = 'passive';
    } else if (entities.length === 1 && entities[0]) {
      const conflict = entities[0].components.get('conflict') as Component | undefined;
      if (conflict && (conflict as { stance?: string }).stance) {
        this.currentStance = (conflict as { stance: string }).stance;
      }
    } else {
      // Check if all entities have the same stance
      const stances = new Set<string>();
      for (const entity of entities) {
        const conflict = entity.components.get('conflict') as Component | undefined;
        if (conflict && (conflict as { stance?: string }).stance) {
          stances.add((conflict as { stance: string }).stance);
        }
      }

      if (stances.size === 1) {
        this.currentStance = Array.from(stances)[0] || 'passive';
      } else {
        this.currentStance = 'mixed';
      }
    }

    // Re-render to update UI
    if (this.element) {
      const parent = this.element.parentElement;
      if (parent) {
        parent.removeChild(this.element);
        this.element = this.render();
        parent.appendChild(this.element);
      }
    }
  }

  /**
   * Set stance for selected entities
   */
  public setStance(stance: string): void {
    if (!this.VALID_STANCES.includes(stance)) {
      throw new Error(`Invalid stance: ${stance}. Must be one of: ${this.VALID_STANCES.join(', ')}`);
    }

    if (this.selectedEntities.length === 0) {
      throw new Error('Cannot set stance: no entities selected');
    }

    // Validate all entities have conflict component
    for (const entity of this.selectedEntities) {
      if (!entity.components.has('conflict')) {
        throw new Error(`Cannot set stance: entity ${entity.id} does not have conflict component`);
      }
    }

    this.currentStance = stance;

    // Emit event to update entities
    this.eventBus.emit({
      type: 'ui:stance:changed',
      source: 'stance-controls',
      data: {
        entityIds: this.selectedEntities.map(e => e.id),
        stance: stance,
      },
    });

    // Update UI
    if (this.element) {
      const parent = this.element.parentElement;
      if (parent) {
        parent.removeChild(this.element);
        this.element = this.render();
        parent.appendChild(this.element);
      }
    }
  }

  /**
   * Get current stance
   */
  public getStance(): string {
    return this.currentStance;
  }

  /**
   * Render the stance controls UI
   */
  public render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'stance-controls';
    container.style.cssText = `
      display: flex;
      flex-direction: row;
      gap: 8px;
      padding: 8px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 4px;
    `;

    // Create button for each stance
    const stances: Array<{ id: string; label: string; hotkey: string }> = [
      { id: 'passive', label: '⊘', hotkey: '1' },
      { id: 'defensive', label: '🛡', hotkey: '2' },
      { id: 'aggressive', label: '⚔', hotkey: '3' },
      { id: 'flee', label: '🏃', hotkey: '4' },
    ];

    for (const stance of stances) {
      const button = document.createElement('button');
      button.className = `stance-button stance-${stance.id}`;
      button.disabled = this.selectedEntities.length === 0;
      button.title = this.STANCE_DESCRIPTIONS[stance.id as keyof typeof this.STANCE_DESCRIPTIONS];

      // Add active class if this is the current stance
      if (this.currentStance === stance.id) {
        button.classList.add('active');
      }

      button.style.cssText = `
        width: 40px;
        height: 40px;
        border: 2px solid ${this.currentStance === stance.id ? '#FFD700' : '#666'};
        background: ${this.currentStance === stance.id ? '#333' : '#222'};
        color: #FFF;
        font-size: 20px;
        cursor: ${this.selectedEntities.length === 0 ? 'not-allowed' : 'pointer'};
        border-radius: 4px;
        transition: all 0.2s;
        opacity: ${this.selectedEntities.length === 0 ? '0.5' : '1.0'};
      `;

      // Icon with hotkey label
      const icon = document.createElement('div');
      icon.className = 'icon';
      icon.textContent = stance.label;
      icon.style.cssText = `
        font-size: 20px;
        margin-bottom: 2px;
      `;

      const hotkey = document.createElement('div');
      hotkey.textContent = stance.hotkey;
      hotkey.style.cssText = `
        font-size: 10px;
        color: #999;
      `;

      button.appendChild(icon);
      button.appendChild(hotkey);

      // Click handler
      button.addEventListener('click', () => {
        if (this.selectedEntities.length > 0) {
          this.setStance(stance.id);
        }
      });

      // Hover effect
      button.addEventListener('mouseenter', () => {
        if (this.selectedEntities.length > 0 && this.currentStance !== stance.id) {
          button.style.border = '2px solid #999';
        }
      });

      button.addEventListener('mouseleave', () => {
        if (this.currentStance !== stance.id) {
          button.style.border = '2px solid #666';
        }
      });

      container.appendChild(button);
    }

    // Add mixed stance indicator if needed
    if (this.currentStance === 'mixed') {
      const mixedIndicator = document.createElement('div');
      mixedIndicator.className = 'stance-mixed';
      mixedIndicator.textContent = 'Mixed Stances';
      mixedIndicator.style.cssText = `
        padding: 8px;
        color: #FFA500;
        font-size: 12px;
        align-self: center;
      `;
      container.appendChild(mixedIndicator);
    }

    this.element = container;
    return container;
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeyboard(e: KeyboardEvent): void {
    if (this.selectedEntities.length === 0) {
      return;
    }

    const stanceMap: { [key: string]: string } = {
      '1': 'passive',
      '2': 'defensive',
      '3': 'aggressive',
      '4': 'flee',
    };

    const stance = stanceMap[e.key];
    if (stance) {
      e.preventDefault();
      // setStance() will throw if entities lack conflict component - don't mask that error
      this.setStance(stance);
    }
  }

  /**
   * Cleanup event listeners
   */
  public cleanup(): void {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }
}
