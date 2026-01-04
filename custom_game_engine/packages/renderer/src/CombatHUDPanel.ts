import type { EventBus } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

interface ActiveConflict {
  id: string;
  type: string;
  participants: string[];
  threatLevel?: string;
  startTime: number;
}

/**
 * CombatHUDPanel - Overlay showing active conflicts
 *
 * REQ-COMBAT-001: Combat HUD
 * - Displays active conflicts
 * - Threat level indicator
 * - Recent combat events
 * - Click to focus camera on conflict
 */
export class CombatHUDPanel implements IWindowPanel {
  private visible: boolean = false;
  private eventBus: EventBus;
  private activeConflicts: Map<string, ActiveConflict> = new Map();
  private recentEvents: Array<{ message: string; timestamp: number }> = [];
  private readonly MAX_RECENT_EVENTS = 3;
  private element: HTMLElement | null = null;

  // Event handlers for cleanup
  private conflictStartedHandler: ((data: any) => void) | null = null;
  private conflictResolvedHandler: ((data: any) => void) | null = null;
  private combatAttackHandler: ((data: any) => void) | null = null;


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
  }

  constructor(eventBus: EventBus) {
    if (!eventBus) {
      throw new Error('CombatHUDPanel requires EventBus parameter');
    }

    this.eventBus = eventBus;

    // Subscribe to conflict events
    this.conflictStartedHandler = this.handleConflictStarted.bind(this);
    this.conflictResolvedHandler = this.handleConflictResolved.bind(this);
    this.combatAttackHandler = this.handleCombatAttack.bind(this);

    this.eventBus.on('conflict:started', this.conflictStartedHandler);
    this.eventBus.on('conflict:resolved', this.conflictResolvedHandler);
    this.eventBus.on('combat:attack', this.combatAttackHandler);
  }

  /**
   * Get panel ID
   */
  public getId(): string {
    return 'combat-hud-panel';
  }

  /**
   * Get panel title
   */
  public getTitle(): string {
    return 'Combat Status';
  }

  /**
   * Show the panel
   */
  public show(): void {
    this.visible = true;
    if (this.element) {
      this.element.style.display = 'block';
    }
  }

  /**
   * Hide the panel
   */
  public hide(): void {
    this.visible = false;
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /**
   * Handle conflict started event
   */
  private handleConflictStarted(data: any): void {
    if (!data.conflictId || !data.type) {
      throw new Error('conflict:started event missing required fields (conflictId, type)');
    }
    if (!data.participants || !Array.isArray(data.participants)) {
      throw new Error('conflict:started event missing required field: participants array');
    }

    this.activeConflicts.set(data.conflictId, {
      id: data.conflictId,
      type: data.type,
      participants: data.participants,
      threatLevel: data.threatLevel || 'medium',
      startTime: Date.now(),
    });

    // Show panel when conflict starts
    if (this.activeConflicts.size > 0) {
      this.show();
    }

    // Add to recent events
    this.addRecentEvent(`${data.type} started`);

    // Re-render
    this.updateUI();
  }

  /**
   * Handle conflict resolved event
   */
  private handleConflictResolved(data: any): void {
    if (!data.conflictId) {
      return;
    }

    const conflict = this.activeConflicts.get(data.conflictId);
    if (conflict) {
      this.addRecentEvent(`${conflict.type} resolved: ${data.outcome || 'unknown'}`);
      this.activeConflicts.delete(data.conflictId);
    }

    // Hide panel when all conflicts resolved
    if (this.activeConflicts.size === 0) {
      this.hide();
    }

    // Re-render
    this.updateUI();
  }

  /**
   * Handle combat attack event
   */
  private handleCombatAttack(data: any): void {
    this.addRecentEvent(`${data.attackerId} attacks ${data.defenderId}`);
    this.updateUI();
  }

  /**
   * Add event to recent events list
   */
  private addRecentEvent(message: string): void {
    this.recentEvents.unshift({
      message,
      timestamp: Date.now(),
    });

    // Keep only last N events
    if (this.recentEvents.length > this.MAX_RECENT_EVENTS) {
      this.recentEvents = this.recentEvents.slice(0, this.MAX_RECENT_EVENTS);
    }
  }

  /**
   * Calculate overall threat level
   */
  private calculateThreatLevel(): string {
    if (this.activeConflicts.size === 0) {
      return 'none';
    }

    let maxThreatLevel = 'low';
    for (const conflict of this.activeConflicts.values()) {
      const level = conflict.threatLevel || 'medium';
      if (level === 'critical') {
        maxThreatLevel = 'critical';
      } else if (level === 'high' && maxThreatLevel !== 'critical') {
        maxThreatLevel = 'high';
      } else if (level === 'medium' && !['high', 'critical'].includes(maxThreatLevel)) {
        maxThreatLevel = 'medium';
      }
    }

    return maxThreatLevel;
  }

  /**
   * Render the HUD panel
   */
  public render(): HTMLElement {
    const container = document.createElement('div');
    container.id = this.getId();
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #666;
      border-radius: 4px;
      padding: 12px;
      min-width: 300px;
      max-width: 500px;
      display: ${this.isVisible() ? 'block' : 'none'};
      opacity: 0.9;
      z-index: 1000;
    `;

    // Title
    const title = document.createElement('div');
    title.textContent = this.getTitle();
    title.style.cssText = `
      color: #FFF;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
      text-align: center;
    `;
    container.appendChild(title);

    // Threat level indicator
    const threatLevel = this.calculateThreatLevel();
    const threatIndicator = document.createElement('div');
    threatIndicator.className = `threat-level threat-${threatLevel}`;
    threatIndicator.style.cssText = `
      text-align: center;
      padding: 4px 8px;
      margin-bottom: 8px;
      border-radius: 3px;
      font-weight: bold;
      background: ${this.getThreatColor(threatLevel)};
      color: #FFF;
    `;
    threatIndicator.textContent = `Threat Level: ${threatLevel.toUpperCase()}`;
    container.appendChild(threatIndicator);

    // Active conflicts list
    if (this.activeConflicts.size > 0) {
      const conflictsList = document.createElement('div');
      conflictsList.style.cssText = `
        margin-bottom: 8px;
      `;

      for (const conflict of this.activeConflicts.values()) {
        const conflictItem = document.createElement('div');
        conflictItem.className = 'conflict-item';
        conflictItem.style.cssText = `
          background: rgba(100, 100, 100, 0.3);
          padding: 6px;
          margin-bottom: 4px;
          border-radius: 3px;
          cursor: pointer;
        `;

        const typeDisplay = document.createElement('div');
        typeDisplay.className = 'conflict-type';
        typeDisplay.textContent = `Type: ${conflict.type}`;
        typeDisplay.style.cssText = `
          color: #FFA500;
          font-size: 12px;
          font-weight: bold;
        `;
        conflictItem.appendChild(typeDisplay);

        const participantsDisplay = document.createElement('div');
        participantsDisplay.style.cssText = `
          color: #CCC;
          font-size: 11px;
          margin-top: 2px;
        `;
        participantsDisplay.textContent = `Participants: ${conflict.participants.length}`;

        // Add participant list
        for (const participantId of conflict.participants) {
          const participantEl = document.createElement('div');
          participantEl.className = 'participant';
          participantEl.textContent = `- ${participantId}`;
          participantEl.style.cssText = `
            color: #AAA;
            font-size: 10px;
            margin-left: 8px;
          `;
          participantsDisplay.appendChild(participantEl);
        }

        conflictItem.appendChild(participantsDisplay);

        // Click to focus on conflict
        conflictItem.addEventListener('click', () => {
          const firstParticipant = conflict.participants[0];
          if (firstParticipant) {
            this.eventBus.emit({
              type: 'ui:entity:selected',
              source: 'combat-hud',
              data: {
                entityId: firstParticipant,
              },
            });
          }
        });

        // Hover effect
        conflictItem.addEventListener('mouseenter', () => {
          conflictItem.style.background = 'rgba(150, 150, 150, 0.4)';
        });
        conflictItem.addEventListener('mouseleave', () => {
          conflictItem.style.background = 'rgba(100, 100, 100, 0.3)';
        });

        conflictsList.appendChild(conflictItem);
      }

      container.appendChild(conflictsList);
    }

    // Recent events log
    if (this.recentEvents.length > 0) {
      const recentLog = document.createElement('div');
      recentLog.style.cssText = `
        border-top: 1px solid #666;
        padding-top: 8px;
      `;

      const logTitle = document.createElement('div');
      logTitle.textContent = 'Recent Events:';
      logTitle.style.cssText = `
        color: #CCC;
        font-size: 11px;
        margin-bottom: 4px;
      `;
      recentLog.appendChild(logTitle);

      for (const event of this.recentEvents) {
        const eventEntry = document.createElement('div');
        eventEntry.className = 'recent-log-entry';
        eventEntry.textContent = event.message;
        eventEntry.style.cssText = `
          color: #AAA;
          font-size: 10px;
          padding: 2px 0;
        `;
        recentLog.appendChild(eventEntry);
      }

      container.appendChild(recentLog);
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
   * Get color for threat level
   */
  private getThreatColor(level: string): string {
    switch (level) {
      case 'none':
        return '#00AA00';
      case 'low':
        return '#FFFF00';
      case 'medium':
        return '#FF9900';
      case 'high':
        return '#FF0000';
      case 'critical':
        return '#CC0033';
      default:
        return '#666';
    }
  }

  /**
   * Cleanup event listeners
   */
  public cleanup(): void {
    if (this.conflictStartedHandler) {
      this.eventBus.off('conflict:started', this.conflictStartedHandler);
      this.conflictStartedHandler = null;
    }
    if (this.conflictResolvedHandler) {
      this.eventBus.off('conflict:resolved', this.conflictResolvedHandler);
      this.conflictResolvedHandler = null;
    }
    if (this.combatAttackHandler) {
      this.eventBus.off('combat:attack', this.combatAttackHandler);
      this.combatAttackHandler = null;
    }
  }
}
