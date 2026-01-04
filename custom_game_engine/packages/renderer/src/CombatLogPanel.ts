import type { EventBus } from '@ai-village/core';
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
  private eventHandlers: Map<string, (data: any) => void> = new Map();


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
      const handler = (data: any) => this.handleCombatEvent(eventType, data);
      this.eventHandlers.set(eventType, handler);
      this.eventBus.on(eventType, handler);
    }
  }

  /**
   * Handle combat event
   */
  private handleCombatEvent(type: string, data: any): void {
    const message = this.formatEventMessage(type, data);
    const participants = this.extractParticipants(data);

    this.addEvent({
      timestamp: Date.now(),
      type,
      message,
      participants,
      narrative: data.narrative,
    });

    this.updateUI();
  }

  /**
   * Format event message
   */
  private formatEventMessage(type: string, data: any): string {
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
  private extractParticipants(data: any): string[] {
    const participants: string[] = [];

    if (data.participants && Array.isArray(data.participants)) {
      participants.push(...data.participants);
    }
    if (data.attackerId) participants.push(data.attackerId);
    if (data.defenderId) participants.push(data.defenderId);
    if (data.hunterId) participants.push(data.hunterId);
    if (data.targetId) participants.push(data.targetId);
    if (data.entityId) participants.push(data.entityId);

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
   * Render the combat log panel
   */
  public render(): HTMLElement {
    const container = document.createElement('div');
    container.id = this.getId();
    container.style.cssText = `
      position: absolute;
      bottom: 16px;
      left: 16px;
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid #666;
      border-radius: 4px;
      padding: 12px;
      width: 400px;
      max-height: 300px;
      display: flex;
      flex-direction: column;
      z-index: 1000;
    `;

    // Title and controls
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      border-bottom: 1px solid #666;
      padding-bottom: 4px;
    `;

    const title = document.createElement('div');
    title.textContent = this.getTitle();
    title.style.cssText = `
      color: #FFF;
      font-size: 14px;
      font-weight: bold;
    `;
    header.appendChild(title);

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

    // Filter buttons
    const filterBar = document.createElement('div');
    filterBar.style.cssText = `
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    `;

    const filters = [
      { label: 'All', type: null },
      { label: 'Combat', type: 'combat' },
      { label: 'Hunt', type: 'hunt' },
      { label: 'Death', type: 'death' },
      { label: 'Injury', type: 'injury' },
    ];

    for (const filter of filters) {
      const btn = document.createElement('button');
      btn.className = 'filter-button';
      btn.setAttribute('data-filter', filter.type || 'all');
      btn.textContent = filter.label;
      btn.style.cssText = `
        background: ${this.currentFilter === filter.type ? '#555' : '#333'};
        color: ${this.currentFilter === filter.type ? '#FFD700' : '#CCC'};
        border: 1px solid ${this.currentFilter === filter.type ? '#FFD700' : '#666'};
        border-radius: 3px;
        padding: 4px 8px;
        font-size: 10px;
        cursor: pointer;
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
    `;

    const filteredEvents = this.getFilteredEvents();

    if (filteredEvents.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.textContent = 'No events';
      emptyMsg.style.cssText = `
        color: #666;
        font-size: 11px;
        text-align: center;
        padding: 8px;
      `;
      eventList.appendChild(emptyMsg);
    } else {
      for (const event of filteredEvents) {
        const eventEntry = document.createElement('div');
        eventEntry.className = 'event-entry';
        eventEntry.style.cssText = `
          padding: 4px 8px;
          margin-bottom: 2px;
          background: ${this.getEventTypeBackground()};
          border-left: 3px solid ${this.getEventTypeColor(event.type)};
          font-size: 11px;
          cursor: ${event.narrative ? 'pointer' : 'default'};
        `;

        // Time
        const time = new Date(event.timestamp);
        const timeStr = time.toLocaleTimeString();
        const timeEl = document.createElement('span');
        timeEl.textContent = `[${timeStr}] `;
        timeEl.style.cssText = `
          color: #666;
          font-size: 9px;
        `;
        eventEntry.appendChild(timeEl);

        // Message
        const messageEl = document.createElement('span');
        messageEl.textContent = event.message;
        messageEl.style.cssText = `
          color: ${this.getEventTypeColor(event.type)};
        `;
        eventEntry.appendChild(messageEl);

        // If narrative available, show on click
        if (event.narrative) {
          eventEntry.addEventListener('click', () => {
            alert(`Narrative:\n\n${event.narrative}`);
          });

          eventEntry.addEventListener('mouseenter', () => {
            eventEntry.style.background = 'rgba(100, 100, 100, 0.4)';
          });

          eventEntry.addEventListener('mouseleave', () => {
            eventEntry.style.background = this.getEventTypeBackground();
          });
        }

        eventList.appendChild(eventEntry);
      }
    }

    container.appendChild(eventList);

    this.element = container;
    return container;
  }

  /**
   * Get background color for event type
   */
  private getEventTypeBackground(): string {
    return 'rgba(50, 50, 50, 0.3)';
  }

  /**
   * Get color for event type
   */
  private getEventTypeColor(type: string): string {
    if (type.startsWith('combat:')) return '#FFA500'; // Orange
    if (type.startsWith('hunt:')) return '#00AA00'; // Green
    if (type.startsWith('death:')) return '#FF0000'; // Red
    if (type.startsWith('injury:')) return '#FF6666'; // Light red
    if (type.startsWith('predator:')) return '#CC00CC'; // Purple
    return '#CCC'; // Default
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
      this.eventBus.off(eventType as any, handler);
    }
    this.eventHandlers.clear();
  }
}
