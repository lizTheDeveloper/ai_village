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
  private handleConflictStarted(event: any): void {
    const data = event.data || event; // Support both GameEvent and legacy direct data

    if (!data.conflictId || !(data.conflictType || data.type)) {
      throw new Error('conflict:started event missing required fields (conflictId, type)');
    }
    const participants = data.participants || [data.initiator, data.target].filter(Boolean);

    this.activeConflicts.set(data.conflictId, {
      id: data.conflictId,
      type: data.conflictType || data.type,
      participants: participants,
      threatLevel: data.threatLevel || 'medium',
      startTime: Date.now(),
    });

    // Show panel when conflict starts
    if (this.activeConflicts.size > 0) {
      this.show();
    }

    // Add to recent events
    this.addRecentEvent(`${data.conflictType || data.type} started`);

    // Re-render
    this.updateUI();
  }

  /**
   * Handle conflict resolved event
   */
  private handleConflictResolved(event: any): void {
    const data = event.data || event; // Support both GameEvent and legacy direct data

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
  private handleCombatAttack(event: any): void {
    const data = event.data || event; // Support both GameEvent and legacy direct data
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
   * Inject keyframe CSS once into the document
   */
  private static stylesInjected = false;
  private static injectStyles(): void {
    if (CombatHUDPanel.stylesInjected) return;
    CombatHUDPanel.stylesInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes combatHudSlideIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes combatHudSlideOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to   { opacity: 0; transform: translateX(-50%) translateY(-12px); }
      }
      @keyframes threatPulse {
        0%, 100% { box-shadow: 0 0 6px 1px var(--threat-glow, #ff4400); }
        50%       { box-shadow: 0 0 14px 4px var(--threat-glow, #ff4400); }
      }
    `;
    document.head.appendChild(style);
  }

  /** Return an emoji glyph for a conflict type string */
  private conflictTypeGlyph(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('raid') || t.includes('attack')) return '⚔️';
    if (t.includes('siege'))                         return '🏰';
    if (t.includes('duel'))                          return '🗡️';
    if (t.includes('hunt') || t.includes('animal'))  return '🐗';
    if (t.includes('brawl') || t.includes('fight'))  return '👊';
    if (t.includes('skirmish'))                      return '💥';
    return '⚡';
  }

  /** Relative elapsed time string for a conflict */
  private elapsedLabel(startTime: number): string {
    const secs = Math.floor((Date.now() - startTime) / 1000);
    if (secs < 60)  return `${secs}s`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ${secs % 60}s`;
  }

  /** Color and glyph for a recent-event message */
  private eventStyle(message: string): { color: string; glyph: string } {
    const m = message.toLowerCase();
    if (m.includes('attacks'))  return { color: '#ff8844', glyph: '⚔' };
    if (m.includes('resolved')) return { color: '#66dd88', glyph: '✓' };
    if (m.includes('started'))  return { color: '#ff5555', glyph: '!' };
    return { color: '#aaaaaa', glyph: '·' };
  }

  /**
   * Render the HUD panel
   */
  public render(): HTMLElement {
    CombatHUDPanel.injectStyles();

    const threatLevel = this.calculateThreatLevel();
    const isHighStakes = threatLevel === 'critical' || threatLevel === 'high';

    // Threat-appropriate glow color for CSS variable
    const glowMap: Record<string, string> = {
      critical: '#cc0033',
      high:     '#ff4400',
      medium:   '#ff9900',
      low:      '#ddcc00',
      none:     '#00aa00',
    };
    const glowColor = glowMap[threatLevel] ?? '#666';

    const container = document.createElement('div');
    container.id = this.getId();
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(180deg, rgba(18,8,8,0.94) 0%, rgba(10,5,5,0.92) 100%);
      border: 1.5px solid ${glowColor};
      border-top: 3px solid ${glowColor};
      border-radius: 0 0 8px 8px;
      padding: 10px 14px 12px;
      min-width: 300px;
      max-width: 480px;
      display: ${this.isVisible() ? 'block' : 'none'};
      z-index: 1000;
      font-family: 'Courier New', monospace;
      box-shadow: 0 4px 18px rgba(0,0,0,0.7), 0 0 10px ${glowColor}44;
      animation: ${this.isVisible() ? 'combatHudSlideIn 220ms ease-out' : 'none'};
      opacity: 0.9;
    `;

    // ── Header row: title + threat badge ───────────────────────────────────
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    `;

    const title = document.createElement('div');
    title.textContent = '⚔ Combat Status';
    title.style.cssText = `
      color: #e8c87a;
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 0.06em;
      text-shadow: 0 0 6px #e8c87a88;
    `;
    header.appendChild(title);

    const threatBadge = document.createElement('div');
    threatBadge.className = `threat-level threat-${threatLevel}`;
    threatBadge.style.cssText = `
      padding: 2px 9px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: bold;
      letter-spacing: 0.08em;
      background: ${glowColor}22;
      border: 1px solid ${glowColor};
      color: ${glowColor};
      --threat-glow: ${glowColor};
      ${isHighStakes ? 'animation: threatPulse 1.4s ease-in-out infinite;' : ''}
    `;
    threatBadge.textContent = threatLevel.toUpperCase();
    header.appendChild(threatBadge);

    container.appendChild(header);

    // ── Divider ────────────────────────────────────────────────────────────
    const divider = document.createElement('div');
    divider.style.cssText = `
      height: 1px;
      background: linear-gradient(90deg, transparent, ${glowColor}66, transparent);
      margin-bottom: 8px;
    `;
    container.appendChild(divider);

    // ── Active conflicts ───────────────────────────────────────────────────
    if (this.activeConflicts.size > 0) {
      const conflictsList = document.createElement('div');
      conflictsList.style.cssText = 'margin-bottom: 8px;';

      for (const conflict of this.activeConflicts.values()) {
        const tColor = glowMap[conflict.threatLevel ?? 'medium'] ?? '#ff9900';
        const conflictItem = document.createElement('div');
        conflictItem.className = 'conflict-item';
        conflictItem.style.cssText = `
          background: rgba(${tColor === '#cc0033' ? '80,0,20' : tColor === '#ff4400' ? '60,20,0' : '40,30,0'},0.35);
          border: 1px solid ${tColor}55;
          border-left: 3px solid ${tColor};
          padding: 6px 8px;
          margin-bottom: 5px;
          border-radius: 0 5px 5px 0;
          cursor: pointer;
          transition: background 120ms, border-color 120ms;
        `;

        // Type + elapsed row
        const typeRow = document.createElement('div');
        typeRow.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 3px;
        `;

        const typeLabel = document.createElement('div');
        typeLabel.className = 'conflict-type';
        typeLabel.textContent = `${this.conflictTypeGlyph(conflict.type)} ${conflict.type}`;
        typeLabel.style.cssText = `
          color: ${tColor};
          font-size: 11.5px;
          font-weight: bold;
        `;
        typeRow.appendChild(typeLabel);

        const elapsed = document.createElement('div');
        elapsed.textContent = this.elapsedLabel(conflict.startTime);
        elapsed.style.cssText = `
          color: #887766;
          font-size: 10px;
        `;
        typeRow.appendChild(elapsed);
        conflictItem.appendChild(typeRow);

        // Participants
        const participantsRow = document.createElement('div');
        participantsRow.style.cssText = `
          color: #998877;
          font-size: 10px;
          line-height: 1.4;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        `;
        for (const participantId of conflict.participants) {
          const participantEl = document.createElement('span');
          participantEl.className = 'participant';
          participantEl.textContent = participantId;
          participantsRow.appendChild(participantEl);
        }
        conflictItem.appendChild(participantsRow);

        // Click to focus
        conflictItem.addEventListener('click', () => {
          const firstParticipant = conflict.participants[0];
          if (firstParticipant) {
            this.eventBus.emit({
              type: 'ui:entity:selected',
              source: 'combat-hud',
              data: { entityId: firstParticipant },
            });
          }
        });

        // Hover
        conflictItem.addEventListener('mouseenter', () => {
          conflictItem.style.background = `rgba(${tColor === '#cc0033' ? '100,10,30' : '70,45,10'},0.5)`;
          conflictItem.style.borderColor = `${tColor}99`;
        });
        conflictItem.addEventListener('mouseleave', () => {
          conflictItem.style.background = `rgba(${tColor === '#cc0033' ? '80,0,20' : tColor === '#ff4400' ? '60,20,0' : '40,30,0'},0.35)`;
          conflictItem.style.borderColor = `${tColor}55`;
        });

        conflictsList.appendChild(conflictItem);
      }

      container.appendChild(conflictsList);
    }

    // ── Recent events log ──────────────────────────────────────────────────
    if (this.recentEvents.length > 0) {
      const recentLog = document.createElement('div');
      recentLog.style.cssText = `
        border-top: 1px solid #33221188;
        padding-top: 7px;
      `;

      const logTitle = document.createElement('div');
      logTitle.textContent = 'Recent';
      logTitle.style.cssText = `
        color: #665544;
        font-size: 9.5px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 4px;
      `;
      recentLog.appendChild(logTitle);

      for (const ev of this.recentEvents) {
        const { color, glyph } = this.eventStyle(ev.message);
        const eventEntry = document.createElement('div');
        eventEntry.className = 'recent-log-entry';
        eventEntry.style.cssText = `
          display: flex;
          align-items: baseline;
          gap: 5px;
          padding: 1px 0;
        `;

        const glyphEl = document.createElement('span');
        glyphEl.textContent = glyph;
        glyphEl.style.cssText = `color: ${color}; font-size: 10px; flex-shrink: 0;`;

        const msgEl = document.createElement('span');
        msgEl.textContent = ev.message;
        msgEl.style.cssText = `color: ${color}; font-size: 10px; opacity: 0.85;`;

        eventEntry.appendChild(glyphEl);
        eventEntry.appendChild(msgEl);
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
      case 'none':     return '#00aa00';
      case 'low':      return '#ddcc00';
      case 'medium':   return '#ff9900';
      case 'high':     return '#ff4400';
      case 'critical': return '#cc0033';
      default:         return '#666';
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
