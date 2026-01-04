import type { EventBus, World, Entity } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

/**
 * CombatUnitPanel - Detailed view of selected combatant
 *
 * REQ-COMBAT-003: Combat Unit Panel
 * - Shows combat stats (skill, health, stamina)
 * - Displays equipment (weapon, armor)
 * - Lists active injuries with severity
 * - Shows current stance and action
 */
export class CombatUnitPanel implements IWindowPanel {
  private visible: boolean = false;
  private eventBus: EventBus;
  private world: World;
  private selectedEntity: Entity | null = null;
  private element: HTMLElement | null = null;

  // Event handlers for cleanup
  private entitySelectedHandler: ((data: any) => void) | null = null;


  getDefaultWidth(): number {
    return 350;
  }

  getDefaultHeight(): number {
    return 450;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  constructor(eventBus: EventBus, world: World) {
    if (!eventBus) {
      throw new Error('CombatUnitPanel requires EventBus parameter');
    }
    if (!world) {
      throw new Error('CombatUnitPanel requires World parameter');
    }

    this.eventBus = eventBus;
    this.world = world;

    // Subscribe to entity selection events
    this.entitySelectedHandler = this.handleEntitySelected.bind(this);
    this.eventBus.on('ui:entity:selected', this.entitySelectedHandler);
  }

  /**
   * Get panel ID
   */
  public getId(): string {
    return 'combat-unit-panel';
  }

  /**
   * Get panel title
   */
  public getTitle(): string {
    return 'Unit Details';
  }

  /**
   * Set selected entity
   */
  public setSelectedEntity(entity: Entity | null): void {
    this.selectedEntity = entity;
    this.updateUI();
  }

  /**
   * Handle entity selected event
   */
  private handleEntitySelected(data: any): void {
    if (data.entityId) {
      const entity = this.world.getEntity(data.entityId);
      this.setSelectedEntity(entity || null);
    } else {
      this.setSelectedEntity(null);
    }
  }

  /**
   * Render the unit panel
   */
  public render(): HTMLElement {
    const container = document.createElement('div');
    container.id = this.getId();
    container.style.cssText = `
      position: absolute;
      right: 16px;
      top: 80px;
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid #666;
      border-radius: 4px;
      padding: 12px;
      min-width: 250px;
      max-width: 350px;
      display: ${this.selectedEntity ? 'block' : 'none'};
      z-index: 1000;
    `;

    if (!this.selectedEntity) {
      this.element = container;
      return container;
    }

    // Title
    const title = document.createElement('div');
    title.textContent = this.getTitle();
    title.style.cssText = `
      color: #FFF;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
      border-bottom: 1px solid #666;
      padding-bottom: 4px;
    `;
    container.appendChild(title);

    // Entity name
    const identity = this.selectedEntity.components.get('identity') as any;
    if (identity) {
      const nameEl = document.createElement('div');
      nameEl.className = 'unit-name';
      nameEl.textContent = identity.name || 'Unknown';
      nameEl.style.cssText = `
        color: #FFD700;
        font-size: 14px;
        margin-bottom: 8px;
      `;
      container.appendChild(nameEl);
    }

    // Combat stats section
    const combatStats = this.selectedEntity.components.get('combat_stats') as any;
    const needs = this.selectedEntity.components.get('needs') as any;

    if (combatStats || needs) {
      const statsSection = document.createElement('div');
      statsSection.style.cssText = `
        margin-bottom: 12px;
      `;

      const statsTitle = document.createElement('div');
      statsTitle.textContent = 'Combat Stats';
      statsTitle.style.cssText = `
        color: #CCC;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 4px;
      `;
      statsSection.appendChild(statsTitle);

      // Combat skill
      if (combatStats) {
        const skillEl = document.createElement('div');
        skillEl.className = 'combat-skill';
        skillEl.textContent = `Combat Skill: ${combatStats.combatSkill}`;
        skillEl.style.cssText = `
          color: #AAA;
          font-size: 11px;
          padding: 2px 0;
        `;
        statsSection.appendChild(skillEl);
      }

      // Health (from needs component)
      if (needs) {
        const healthPercent = Math.round(needs.health * 100);
        const healthEl = document.createElement('div');
        healthEl.className = 'health';
        healthEl.textContent = `Health: ${healthPercent}%`;
        healthEl.style.cssText = `
          color: ${this.getHealthColor(needs.health)};
          font-size: 11px;
          padding: 2px 0;
        `;
        statsSection.appendChild(healthEl);

        // Energy (stamina)
        const energyPercent = Math.round(needs.energy * 100);
        const energyEl = document.createElement('div');
        energyEl.className = 'stamina';
        energyEl.textContent = `Stamina: ${energyPercent}%`;
        energyEl.style.cssText = `
          color: ${this.getStaminaColor(needs.energy)};
          font-size: 11px;
          padding: 2px 0;
        `;
        statsSection.appendChild(energyEl);
      }

      container.appendChild(statsSection);
    }

    // Equipment section
    if (combatStats && (combatStats.weapon || combatStats.armor)) {
      const equipSection = document.createElement('div');
      equipSection.style.cssText = `
        margin-bottom: 12px;
      `;

      const equipTitle = document.createElement('div');
      equipTitle.textContent = 'Equipment';
      equipTitle.style.cssText = `
        color: #CCC;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 4px;
      `;
      equipSection.appendChild(equipTitle);

      if (combatStats.weapon) {
        const weaponEl = document.createElement('div');
        weaponEl.className = 'weapon';
        weaponEl.textContent = `Weapon: ${combatStats.weapon}`;
        weaponEl.style.cssText = `
          color: #AAA;
          font-size: 11px;
          padding: 2px 0;
        `;
        equipSection.appendChild(weaponEl);
      }

      if (combatStats.armor) {
        const armorEl = document.createElement('div');
        armorEl.className = 'armor';
        armorEl.textContent = `Armor: ${combatStats.armor}`;
        armorEl.style.cssText = `
          color: #AAA;
          font-size: 11px;
          padding: 2px 0;
        `;
        equipSection.appendChild(armorEl);
      }

      container.appendChild(equipSection);
    }

    // Injuries section
    const injury = this.selectedEntity.components.get('injury') as any;
    if (injury && injury.injuries && injury.injuries.length > 0) {
      const injurySection = document.createElement('div');
      injurySection.style.cssText = `
        margin-bottom: 12px;
      `;

      const injuryTitle = document.createElement('div');
      injuryTitle.textContent = 'Active Injuries';
      injuryTitle.style.cssText = `
        color: #FF6666;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 4px;
      `;
      injurySection.appendChild(injuryTitle);

      for (const injuryData of injury.injuries) {
        const injuryEl = document.createElement('div');
        injuryEl.className = 'injury-item';
        injuryEl.textContent = `${injuryData.type} (${injuryData.severity}) - ${injuryData.bodyPart}`;
        injuryEl.style.cssText = `
          color: ${this.getInjurySeverityColor(injuryData.severity)};
          font-size: 10px;
          padding: 2px 0;
          margin-left: 8px;
        `;
        injurySection.appendChild(injuryEl);
      }

      container.appendChild(injurySection);
    }

    // Current stance
    const conflict = this.selectedEntity.components.get('conflict') as any;
    if (conflict) {
      const stanceSection = document.createElement('div');
      stanceSection.style.cssText = `
        margin-bottom: 8px;
      `;

      const stanceTitle = document.createElement('div');
      stanceTitle.textContent = 'Combat Status';
      stanceTitle.style.cssText = `
        color: #CCC;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 4px;
      `;
      stanceSection.appendChild(stanceTitle);

      const stanceEl = document.createElement('div');
      stanceEl.className = 'stance';
      stanceEl.textContent = `Stance: ${conflict.stance || 'defensive'}`;
      stanceEl.style.cssText = `
        color: #AAA;
        font-size: 11px;
        padding: 2px 0;
      `;
      stanceSection.appendChild(stanceEl);

      const actionEl = document.createElement('div');
      actionEl.className = 'action';
      actionEl.textContent = `Action: ${conflict.currentAction || 'idle'}`;
      actionEl.style.cssText = `
        color: #AAA;
        font-size: 11px;
        padding: 2px 0;
      `;
      stanceSection.appendChild(actionEl);

      container.appendChild(stanceSection);
    }

    this.element = container;
    return container;
  }

  /**
   * Update UI (re-render)
   */
  private updateUI(): void {
    if (this.element && this.element.parentElement) {
      const parent = this.element.parentElement;
      parent.removeChild(this.element);
      this.element = this.render();
      parent.appendChild(this.element);
    }
  }

  /**
   * Get color for health percentage
   */
  private getHealthColor(health: number): string {
    if (health >= 0.66) return '#00FF00'; // Green
    if (health >= 0.33) return '#FFFF00'; // Yellow
    return '#FF0000'; // Red
  }

  /**
   * Get color for stamina percentage
   */
  private getStaminaColor(stamina: number): string {
    if (stamina >= 0.5) return '#66CCFF'; // Light blue
    if (stamina >= 0.2) return '#FFAA00'; // Orange
    return '#FF6666'; // Red
  }

  /**
   * Get color for injury severity
   */
  private getInjurySeverityColor(severity: string): string {
    switch (severity) {
      case 'minor':
        return '#FFFF99';
      case 'moderate':
        return '#FFAA00';
      case 'severe':
        return '#FF6666';
      case 'critical':
        return '#FF0000';
      default:
        return '#AAA';
    }
  }

  /**
   * Cleanup event listeners
   */
  public cleanup(): void {
    if (this.entitySelectedHandler) {
      this.eventBus.off('ui:entity:selected', this.entitySelectedHandler);
      this.entitySelectedHandler = null;
    }
  }
}
