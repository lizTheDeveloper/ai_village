import type { EventBus, EventType, EventHandler, GameEvent } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

interface CombatEvent {
  timestamp: number;
  type: string;
  message: string;
  participants: string[];
  narrative?: string;
}

/**
 * CombatLogPanel - Scrollable log of combat events
 *
 * REQ-COMBAT-006: Combat Log
 * - Displays all combat-related events
 * - Filter by type (attack, damage, death, hunt, etc.)
 * - Links to conflict resolutions with LLM narratives
 * - Color-coded entries
 * - Auto-scrolls to latest events
 */
export class CombatLogPanel implements IWindowPanel {
  private visible: boolean = false;
  private eventBus: EventBus;
  private events: CombatEvent[] = [];
  private readonly MAX_EVENTS = 100; // Keep last 100 events
  private currentFilter: string | null = null;
  private element: HTMLElement | null = null;

  // Event handlers for cleanup
  private eventHandlers: Map<EventType, EventHandler> = new Map();

  // Track which events have their narrative expanded (keyed by filteredEvents index)
  private expandedEvents: Set<number> = new Set();

  // Track whether the scrollbar style has been injected
  private static scrollbarStyleInjected = false;


  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 500;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  constructor(eventBus: EventBus) {
    if (!eventBus) {
      throw new Error('CombatLogPanel requires EventBus parameter');
    }

    this.eventBus = eventBus;

    // Subscribe to combat events
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for all combat events
   */
  private setupEventHandlers(): void {
    const events = [
      'conflict:started',
      'conflict:resolved',
      'combat:attack',
      'combat:dodge',
      'combat:ended',
      'hunt:started',
      'hunt:success',
      'hunt:failed',
      'death:occurred',
      'injury:inflicted',
      'predator:attack',
    ] as const;

    for (const eventType of events) {
      const handler: EventHandler = (event: GameEvent) => {
        const data = (event.data as Record<string, unknown>) || {};
        this.handleCombatEvent(eventType, data);
      };
      this.eventHandlers.set(eventType, handler);
      this.eventBus.on(eventType, handler);
    }
  }

  /**
   * Handle combat event
   */
  private handleCombatEvent(type: string, data: Record<string, unknown>): void {
    const message = this.formatEventMessage(type, data);
    const participants = this.extractParticipants(data);

    this.addEvent({
      timestamp: Date.now(),
      type,
      message,
      participants,
      narrative: data.narrative as string | undefined,
    });

    this.updateUI();
  }

  /**
   * Format event message
   */
  private formatEventMessage(type: string, data: Record<string, unknown>): string {
    switch (type) {
      case 'conflict:started':
        return `Conflict started: ${data.type}`;
      case 'conflict:resolved':
        return `Conflict resolved: ${data.outcome || 'unknown'}`;
      case 'combat:attack':
        return `${data.attackerId} attacked ${data.targetId}`;
      case 'combat:dodge':
        return `${data.entityId} dodged attack from ${data.attackerId}`;
      case 'combat:ended':
        return `Combat ended: ${data.result}`;
      case 'hunt:started':
        return `${data.hunterId} started hunting ${data.targetId}`;
      case 'hunt:success':
        return `${data.hunterId} successfully hunted ${data.targetId}`;
      case 'hunt:failed':
        return `${data.hunterId} failed to hunt ${data.targetId}`;
      case 'death:occurred':
        return `${data.entityId} died from ${data.cause}`;
      case 'injury:inflicted':
        return `${data.targetId} sustained ${data.severity} ${data.type} injury`;
      case 'predator:attack':
        return `Predator attacked ${data.targetId}`;
      default:
        return `Unknown event: ${type}`;
    }
  }

  /**
   * Extract participants from event data
   */
  private extractParticipants(data: Record<string, unknown>): string[] {
    const participants: string[] = [];

    if (data.participants && Array.isArray(data.participants)) {
      participants.push(...data.participants);
    }
    if (data.attackerId) participants.push(data.attackerId as string);
    if (data.defenderId) participants.push(data.defenderId as string);
    if (data.hunterId) participants.push(data.hunterId as string);
    if (data.targetId) participants.push(data.targetId as string);
    if (data.entityId) participants.push(data.entityId as string);

    // Remove duplicates
    return Array.from(new Set(participants));
  }

  /**
   * Add event to log
   */
  private addEvent(event: CombatEvent): void {
    this.events.unshift(event); // Add to beginning

    // Trim old events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS);
    }
  }

  /**
   * Get panel ID
   */
  public getId(): string {
    return 'combat-log-panel';
  }

  /**
   * Get panel title
   */
  public getTitle(): string {
    return 'Combat Log';
  }

  /**
   * Clear the log
   */
  public clearLog(): void {
    this.events = [];
    this.updateUI();
  }

  /**
   * Filter events by type
   */
  public filterByType(type: string | null): void {
    this.currentFilter = type;
    this.updateUI();
  }

  /**
   * Get filtered events
   */
  private getFilteredEvents(): CombatEvent[] {
    if (!this.currentFilter) {
      return this.events;
    }

    return this.events.filter(event => event.type === this.currentFilter);
  }

  /**
   * Get relative time string from timestamp
   */
  private getRelativeTime(timestamp: number): string {
    const deltaMs = Date.now() - timestamp;
    const deltaS = Math.floor(deltaMs / 1000);
    if (deltaS < 5) return 'just now';
    if (deltaS < 60) return `${deltaS}s ago`;
    const deltaM = Math.floor(deltaS / 60);
    if (deltaM < 60) return `${deltaM}m ago`;
    const deltaH = Math.floor(deltaM / 60);
    return `${deltaH}h ago`;
  }

  /**
   * Get glyph for event type
   */
  private getEventTypeGlyph(type: string): string {
    switch (type) {
      case 'conflict:started':  return '\u2694\uFE0F';
      case 'conflict:resolved': return '\uD83C\uDFF3\uFE0F';
      case 'combat:attack':     return '\uD83D\uDDE1\uFE0F';
      case 'combat:dodge':      return '\uD83D\uDCA8';
      case 'combat:ended':      return '\uD83D\uDD14';
      case 'hunt:started':      return '\uD83C\uDFF9';
      case 'hunt:success':      return '\u2713';
      case 'hunt:failed':       return '\u2717';
      case 'death:occurred':    return '\uD83D\uDC80';
      case 'injury:inflicted':  return '\uD83E\uDE78';
      case 'predator:attack':   return '\uD83D\uDC3A';
      default:                  return '\u26A1';
    }
  }

  /**
   * Inject scrollbar styles once into the document
   */
  private injectScrollbarStyle(): void {
    if (CombatLogPanel.scrollbarStyleInjected) return;
    const style = document.createElement('style');
    style.textContent = `
      #combat-log-panel .event-list::-webkit-scrollbar { width: 4px }
      #combat-log-panel .event-list::-webkit-scrollbar-thumb { background: rgba(200,100,100,0.5); border-radius: 2px }
    `;
    document.head.appendChild(style);
    CombatLogPanel.scrollbarStyleInjected = true;
  }

  /**
   * Render the combat log panel
   */
  public render(): HTMLElement {
    this.injectScrollbarStyle();

    const container = document.createElement('div');
    container.id = this.getId();
    container.style.cssText = `
      position: absolute;
      bottom: 16px;
      left: 16px;
      background: rgba(10,4,4,0.95);
      border: 1px solid rgba(200,80,80,0.4);
      border-radius: 4px;
      padding: 0;
      width: 400px;
      max-height: 300px;
      display: flex;
      flex-direction: column;
      z-index: 1000;
      overflow: hidden;
    `;

    // --- Dark gradient header ---
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px 0 12px;
      background: linear-gradient(180deg, rgba(30,8,8,0.97) 0%, rgba(18,5,5,0.97) 100%);
      flex-shrink: 0;
    `;

    // Left decoration glyph + title
    const titleGroup = document.createElement('div');
    titleGroup.style.cssText = `display: flex; align-items: center; gap: 6px;`;

    const leftGlyph = document.createElement('span');
    leftGlyph.textContent = '\u2694\uFE0F';
    leftGlyph.style.cssText = `font-size: 12px; opacity: 0.8;`;

    const title = document.createElement('div');
    title.textContent = this.getTitle();
    title.style.cssText = `
      color: #FFF;
      font-size: 14px;
      font-weight: bold;
      text-shadow: 0 0 8px rgba(255,120,80,0.7), 0 0 16px rgba(255,60,60,0.4);
      letter-spacing: 0.5px;
    `;

    const rightGlyph = document.createElement('span');
    rightGlyph.textContent = '\u2694\uFE0F';
    rightGlyph.style.cssText = `font-size: 12px; opacity: 0.8;`;

    titleGroup.appendChild(leftGlyph);
    titleGroup.appendChild(title);
    titleGroup.appendChild(rightGlyph);
    header.appendChild(titleGroup);

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = `
      background: #333;
      color: #FFF;
      border: 1px solid #666;
      border-radius: 3px;
      padding: 4px 8px;
      font-size: 10px;
      cursor: pointer;
    `;
    clearBtn.addEventListener('click', () => this.clearLog());
    header.appendChild(clearBtn);

    container.appendChild(header);

    // Gold accent separator line
    const separator = document.createElement('div');
    separator.style.cssText = `
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(255,200,80,0.6) 20%, rgba(255,200,80,0.9) 50%, rgba(255,200,80,0.6) 80%, transparent 100%);
      margin: 6px 12px 0 12px;
      flex-shrink: 0;
    `;
    container.appendChild(separator);

    // Filter buttons
    const filterBar = document.createElement('div');
    filterBar.style.cssText = `
      display: flex;
      gap: 4px;
      margin: 8px 12px 6px 12px;
      flex-wrap: wrap;
      flex-shrink: 0;
    `;

    const filters: Array<{ label: string; type: string | null; color: string; colorRgb: string }> = [
      { label: 'All',    type: null,     color: '#FFD700', colorRgb: '255,215,0' },
      { label: 'Combat', type: 'combat', color: '#FFA040', colorRgb: '255,160,64' },
      { label: 'Hunt',   type: 'hunt',   color: '#00CC44', colorRgb: '0,204,68' },
      { label: 'Death',  type: 'death',  color: '#CC2222', colorRgb: '204,34,34' },
      { label: 'Injury', type: 'injury', color: '#FF8888', colorRgb: '255,136,136' },
    ];

    for (const filter of filters) {
      const btn = document.createElement('button');
      btn.className = 'filter-button';
      btn.setAttribute('data-filter', filter.type || 'all');
      btn.textContent = filter.label;

      const isActive = this.currentFilter === filter.type;
      btn.style.cssText = `
        background: ${isActive ? `rgba(${filter.colorRgb}, 0.15)` : 'rgba(30,10,10,0.6)'};
        color: ${isActive ? filter.color : '#AAA'};
        border: none;
        border-radius: 12px;
        padding: 4px 10px;
        font-size: 10px;
        cursor: pointer;
        box-shadow: ${isActive ? `inset 0 0 0 1px ${filter.color}` : 'inset 0 0 0 1px rgba(120,60,60,0.4)'};
        transition: background 0.1s;
      `;

      btn.addEventListener('click', () => {
        this.filterByType(filter.type);
      });

      filterBar.appendChild(btn);
    }

    container.appendChild(filterBar);

    // Event list (scrollable)
    const eventList = document.createElement('div');
    eventList.className = 'event-list';
    eventList.style.cssText = `
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      max-height: 200px;
      padding: 0 8px 8px 8px;
    `;

    const filteredEvents = this.getFilteredEvents();

    if (filteredEvents.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px 8px;
        gap: 4px;
      `;

      const emptyGlyph = document.createElement('div');
      emptyGlyph.textContent = '\u2694\uFE0F';
      emptyGlyph.style.cssText = `font-size: 22px; opacity: 0.3;`;

      const emptyText = document.createElement('div');
      emptyText.textContent = 'No combat events';
      emptyText.style.cssText = `color: #555; font-size: 12px;`;

      const emptyHint = document.createElement('div');
      emptyHint.textContent = 'Events appear as combat unfolds';
      emptyHint.style.cssText = `color: #3A3030; font-size: 10px; font-style: italic;`;

      emptyState.appendChild(emptyGlyph);
      emptyState.appendChild(emptyText);
      emptyState.appendChild(emptyHint);
      eventList.appendChild(emptyState);
    } else {
      filteredEvents.forEach((event, index) => {
        const color = this.getEventTypeColor(event.type);
        const glyph = this.getEventTypeGlyph(event.type);
        const bg = this.getEventTypeBackground(event.type);
        const isExpanded = this.expandedEvents.has(index);

        const eventEntry = document.createElement('div');
        eventEntry.className = 'event-entry';
        eventEntry.style.cssText = `
          padding: 4px 8px;
          margin-bottom: 2px;
          background: ${bg};
          border-left: 3px solid ${color};
          border-radius: 0 2px 2px 0;
          font-size: 11px;
          cursor: default;
        `;

        // Top row: glyph + time + message
        const topRow = document.createElement('div');
        topRow.style.cssText = `display: flex; align-items: baseline; gap: 4px;`;

        const glyphEl = document.createElement('span');
        glyphEl.textContent = glyph;
        glyphEl.style.cssText = `font-size: 11px; flex-shrink: 0;`;

        const timeStr = this.getRelativeTime(event.timestamp);
        const timeEl = document.createElement('span');
        timeEl.textContent = `[${timeStr}]`;
        timeEl.style.cssText = `color: #554444; font-size: 9px; flex-shrink: 0;`;

        const messageEl = document.createElement('span');
        messageEl.textContent = event.message;
        messageEl.style.cssText = `color: ${color};`;

        topRow.appendChild(glyphEl);
        topRow.appendChild(timeEl);
        topRow.appendChild(messageEl);
        eventEntry.appendChild(topRow);

        // Narrative expand/collapse
        if (event.narrative) {
          const narrativeHint = document.createElement('div');
          narrativeHint.style.cssText = `
            color: #9966CC;
            font-size: 9px;
            cursor: pointer;
            margin-top: 2px;
            user-select: none;
            padding-left: 16px;
          `;
          narrativeHint.textContent = isExpanded ? '\u25BC narrative' : '\u25BA narrative';

          if (isExpanded) {
            const narrativeEl = document.createElement('blockquote');
            narrativeEl.textContent = event.narrative;
            narrativeEl.style.cssText = `
              margin: 4px 0 2px 16px;
              padding: 4px 8px;
              border-left: 2px solid rgba(150,80,200,0.5);
              background: rgba(80,20,100,0.12);
              color: #BB99EE;
              font-style: italic;
              font-size: 10px;
              line-height: 1.4;
            `;
            eventEntry.appendChild(narrativeEl);
          }

          narrativeHint.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.expandedEvents.has(index)) {
              this.expandedEvents.delete(index);
            } else {
              this.expandedEvents.add(index);
            }
            this.updateUI();
          });

          eventEntry.appendChild(narrativeHint);

          eventEntry.addEventListener('mouseenter', () => {
            eventEntry.style.background = 'rgba(100,40,40,0.35)';
          });

          eventEntry.addEventListener('mouseleave', () => {
            eventEntry.style.background = bg;
          });
        }

        eventList.appendChild(eventEntry);
      });
    }

    container.appendChild(eventList);

    this.element = container;
    return container;
  }

  /**
   * Get tinted background color for event type (very subtle)
   */
  private getEventTypeBackground(type: string): string {
    switch (type) {
      case 'conflict:started':  return 'rgba(255,192,128,0.07)';
      case 'conflict:resolved': return 'rgba(128,255,144,0.06)';
      case 'combat:attack':     return 'rgba(255,160,64,0.07)';
      case 'combat:dodge':      return 'rgba(128,221,255,0.06)';
      case 'combat:ended':      return 'rgba(255,215,0,0.06)';
      case 'hunt:started':      return 'rgba(0,204,68,0.06)';
      case 'hunt:success':      return 'rgba(0,255,102,0.06)';
      case 'hunt:failed':       return 'rgba(255,102,68,0.06)';
      case 'death:occurred':    return 'rgba(204,34,34,0.08)';
      case 'injury:inflicted':  return 'rgba(255,136,136,0.06)';
      case 'predator:attack':   return 'rgba(204,68,255,0.07)';
      default:                  return 'rgba(50,50,50,0.3)';
    }
  }

  /**
   * Get color for event type
   */
  private getEventTypeColor(type: string): string {
    switch (type) {
      case 'conflict:started':  return '#FFC080';
      case 'conflict:resolved': return '#80FF90';
      case 'combat:attack':     return '#FFA040';
      case 'combat:dodge':      return '#80DDFF';
      case 'combat:ended':      return '#FFD700';
      case 'hunt:started':      return '#00CC44';
      case 'hunt:success':      return '#00FF66';
      case 'hunt:failed':       return '#FF6644';
      case 'death:occurred':    return '#CC2222';
      case 'injury:inflicted':  return '#FF8888';
      case 'predator:attack':   return '#CC44FF';
      default:                  return '#CCCCCC';
    }
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

      // Auto-scroll to top (latest events)
      const eventList = this.element.querySelector('.event-list');
      if (eventList) {
        eventList.scrollTop = 0;
      }
    }
  }

  /**
   * Cleanup event listeners
   */
  public cleanup(): void {
    for (const [eventType, handler] of this.eventHandlers.entries()) {
      this.eventBus.off(eventType, handler);
    }
    this.eventHandlers.clear();
  }
}
