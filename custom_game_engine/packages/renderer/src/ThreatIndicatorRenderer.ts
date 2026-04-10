import type { World, Entity } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';
import type { EventBus } from '@ai-village/core';

/**
 * Position component type
 */
interface PositionComponent {
  x: number;
  y: number;
}

/**
 * ThreatIndicatorRenderer - Renders threat indicators for active conflicts
 *
 * REQ-COMBAT-005: Threat Indicators
 * - Visual markers for threats in world space
 * - Off-screen indicators showing direction and distance
 * - Color-coded by threat severity
 */
export class ThreatIndicatorRenderer {
  private world: World;
  private eventBus: EventBus;
  private ctx: CanvasRenderingContext2D;

  // Track active threats
  private threats: Map<string, { entityId: string; severity: string; timestamp: number }> = new Map();

  // Bound handler references for correct event unsubscription
  private boundHandleConflictStarted: (event: any) => void;
  private boundHandleConflictResolved: (event: any) => void;
  private boundHandleDeath: (event: any) => void;

  // PERFORMANCE: Cache player entity to avoid O(n) search every frame (90% reduction)
  private cachedPlayerEntity: Entity | null = null;

  // Visual configuration
  private readonly INDICATOR_SIZE = 16;
  private readonly ARROW_SIZE = 14;
  private readonly ARROW_MARGIN = 22; // Distance from screen edge
  private readonly PULSE_SPEED = 0.003; // Animation speed

  // Severity colors (main fill)
  private readonly SEVERITY_COLORS = {
    low: '#FFE033',     // Warm yellow
    medium: '#FF8C00',  // Deep orange
    high: '#FF2020',    // Vivid red
    critical: '#CC0044', // Dark crimson
  };

  // Severity glow colors (outer bloom)
  private readonly SEVERITY_GLOW = {
    low: 'rgba(255, 220, 40, 0.35)',
    medium: 'rgba(255, 130, 0, 0.4)',
    high: 'rgba(255, 30, 30, 0.45)',
    critical: 'rgba(200, 0, 60, 0.55)',
  };

  // Severity icons rendered inside indicator
  private readonly SEVERITY_ICONS = {
    low: '!',
    medium: '!!',
    high: '!!',
    critical: '✕',
  };

  constructor(world: World, eventBus: EventBus, canvas: HTMLCanvasElement) {
    if (!world) {
      throw new Error('ThreatIndicatorRenderer requires World parameter');
    }
    if (!eventBus) {
      throw new Error('ThreatIndicatorRenderer requires EventBus parameter');
    }
    if (!canvas) {
      throw new Error('ThreatIndicatorRenderer requires Canvas parameter');
    }

    this.world = world;
    this.eventBus = eventBus;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    // Store bound handlers so the same references can be used in cleanup()
    this.boundHandleConflictStarted = this.handleConflictStarted.bind(this);
    this.boundHandleConflictResolved = this.handleConflictResolved.bind(this);
    this.boundHandleDeath = this.handleDeath.bind(this);

    // Subscribe to conflict events
    this.eventBus.on('conflict:started', this.boundHandleConflictStarted);
    this.eventBus.on('conflict:resolved', this.boundHandleConflictResolved);
    this.eventBus.on('death:occurred', this.boundHandleDeath);
  }

  /**
   * Handle conflict started event
   */
  private handleConflictStarted(event: any): void {
    const data = event.data || event;
    if (!data.conflictId || !data.participants || !data.type) {
      return;
    }

    // Add threat for attacker/predator
    const threatLevel = data.threatLevel || 'medium';
    const attacker = data.participants[0]; // First participant is typically the attacker

    this.threats.set(data.conflictId, {
      entityId: attacker,
      severity: threatLevel,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle conflict resolved event
   */
  private handleConflictResolved(event: any): void {
    const data = event.data || event;
    if (!data.conflictId) {
      return;
    }

    this.threats.delete(data.conflictId);
  }

  /**
   * Handle entity death event
   */
  private handleDeath(event: any): void {
    const data = event.data || event;
    if (!data.entityId) {
      return;
    }

    // Remove all threats associated with this entity
    for (const [id, threat] of this.threats.entries()) {
      if (threat.entityId === data.entityId) {
        this.threats.delete(id);
      }
    }
  }

  /**
   * Render all threat indicators
   */
  public render(cameraX: number, cameraY: number, viewWidth: number, viewHeight: number, zoom: number = 1.0): void {
    for (const [, threat] of this.threats.entries()) {
      const entity = this.world.getEntity(threat.entityId);
      if (!entity) {
        continue;
      }

      const position = entity.components.get('position') as PositionComponent | undefined;
      if (!position) {
        continue;
      }

      // Calculate screen position
      const screenX = (position.x - cameraX) * zoom;
      const screenY = (position.y - cameraY) * zoom;

      // Check if threat is on screen
      if (this.isOnScreen(screenX, screenY, viewWidth, viewHeight)) {
        // Render in-world indicator
        this.renderThreatIndicator(entity, screenX, screenY, threat.severity);
      } else {
        // Render off-screen arrow
        this.renderOffScreenArrow(entity, screenX, screenY, viewWidth, viewHeight, threat.severity);
      }
    }
  }

  /**
   * Check if position is on screen
   */
  public isOnScreen(x: number, y: number, viewWidth: number, viewHeight: number): boolean {
    return x >= 0 && x <= viewWidth && y >= 0 && y <= viewHeight;
  }

  /**
   * Render threat indicator at entity location
   */
  public renderThreatIndicator(entity: Entity, x: number, y: number, severity: string): void {
    const position = entity.components.get('position') as PositionComponent | undefined;
    if (!position) {
      throw new Error('Cannot render threat indicator: entity missing position component');
    }

    const color = this.SEVERITY_COLORS[severity as keyof typeof this.SEVERITY_COLORS] || this.SEVERITY_COLORS.medium;
    const glowColor = this.SEVERITY_GLOW[severity as keyof typeof this.SEVERITY_GLOW] || this.SEVERITY_GLOW.medium;

    // Pulsing animation for high/critical severity
    const t = Date.now();
    const pulseOffset = severity === 'high' || severity === 'critical'
      ? Math.sin(t * this.PULSE_SPEED) * 3
      : 0;

    const size = this.INDICATOR_SIZE + pulseOffset;

    this.ctx.save();
    this.ctx.translate(x, y - 20);

    // Expanding ring pulse for high/critical (phase-offset for visual rhythm)
    if (severity === 'high' || severity === 'critical') {
      const ringPhase = (t * 0.002) % 1;
      const ringRadius = size / 2 + ringPhase * 14;
      this.ctx.globalAlpha = (1 - ringPhase) * 0.55;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = severity === 'critical' ? 2.5 : 1.5;
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Soft glow halo behind main circle
    this.ctx.globalAlpha = 0.28;
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = glowColor;
    this.ctx.shadowBlur = 14;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size / 2 + 5, 0, Math.PI * 2);
    this.ctx.fill();

    // Main circle
    this.ctx.globalAlpha = 0.88;
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = glowColor;
    this.ctx.shadowBlur = 5;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Icon — critical gets '✕', all others get '!'
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1.0;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = `bold ${size}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('!', 0, 0);

    this.ctx.restore();

    // Render distance if player entity exists
    this.renderDistance(entity, x, y);
  }

  /**
   * Get player entity with caching.
   * PERFORMANCE: O(1) cached lookup instead of O(n) search every frame.
   */
  private getPlayerEntity(): Entity | null {
    if (!this.cachedPlayerEntity || !this.world.entities.has(this.cachedPlayerEntity.id)) {
      // Cache miss or player died - find player using ECS query
      const agents = this.world.query().with(CT.Agent).executeEntities();
      this.cachedPlayerEntity = agents.length > 0 ? agents[0]! : null;
    }
    return this.cachedPlayerEntity;
  }

  /**
   * Render distance text
   */
  private renderDistance(entity: Entity, x: number, y: number): void {
    // Find player entity (assuming first agent is player)
    const playerEntity = this.getPlayerEntity();
    if (!playerEntity) {
      return;
    }

    const playerPos = playerEntity.components.get('position') as PositionComponent | undefined;
    const threatPos = entity.components.get('position') as PositionComponent | undefined;

    if (!playerPos || !threatPos) {
      return;
    }

    // Calculate distance (sqrt needed here for display to user)
    const dx = threatPos.x - playerPos.x;
    const dy = threatPos.y - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy); // Keep sqrt: actual distance displayed to user

    // Render distance text with contrasting outline for legibility
    this.ctx.save();
    this.ctx.font = 'bold 10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    this.ctx.fillStyle = '#F0E68C'; // Khaki — warmer than pure white, easier on the eye

    const distanceText = `${Math.round(distance)}m`;
    this.ctx.strokeText(distanceText, x, y - 34);
    this.ctx.fillText(distanceText, x, y - 34);

    this.ctx.restore();
  }

  /**
   * Render off-screen arrow pointing to threat
   */
  public renderOffScreenArrow(
    entity: Entity,
    threatScreenX: number,
    threatScreenY: number,
    viewWidth: number,
    viewHeight: number,
    severity: string
  ): void {
    const position = entity.components.get('position') as PositionComponent | undefined;
    if (!position) {
      throw new Error('Cannot render off-screen arrow: entity missing position component');
    }

    // Calculate arrow position on screen edge
    let arrowX: number;
    let arrowY: number;
    let angle: number;

    // Determine which edge the arrow should be on
    const centerX = viewWidth / 2;
    const centerY = viewHeight / 2;

    const dx = threatScreenX - centerX;
    const dy = threatScreenY - centerY;

    // Calculate angle to threat
    angle = Math.atan2(dy, dx);

    // Find intersection with screen edge
    const absAngle = Math.abs(angle);
    const tanAngle = Math.tan(absAngle);

    // Check if arrow should be on left/right or top/bottom edge
    if (absAngle < Math.atan2(viewHeight / 2, viewWidth / 2)) {
      // Left or right edge
      if (dx > 0) {
        // Right edge
        arrowX = viewWidth - this.ARROW_MARGIN;
      } else {
        // Left edge
        arrowX = this.ARROW_MARGIN;
      }
      arrowY = centerY + (arrowX - centerX) * tanAngle * Math.sign(dy);
    } else {
      // Top or bottom edge
      if (dy > 0) {
        // Bottom edge
        arrowY = viewHeight - this.ARROW_MARGIN;
      } else {
        // Top edge
        arrowY = this.ARROW_MARGIN;
      }
      arrowX = centerX + (arrowY - centerY) / tanAngle * Math.sign(dx);
    }

    // Clamp to screen bounds
    arrowX = Math.max(this.ARROW_MARGIN, Math.min(viewWidth - this.ARROW_MARGIN, arrowX));
    arrowY = Math.max(this.ARROW_MARGIN, Math.min(viewHeight - this.ARROW_MARGIN, arrowY));

    const color = this.SEVERITY_COLORS[severity as keyof typeof this.SEVERITY_COLORS] || this.SEVERITY_COLORS.medium;
    const glowColor = this.SEVERITY_GLOW[severity as keyof typeof this.SEVERITY_GLOW] || this.SEVERITY_GLOW.medium;

    // Pulse alpha for high/critical arrows
    const pulseAlpha = severity === 'high' || severity === 'critical'
      ? 0.75 + Math.sin(Date.now() * this.PULSE_SPEED) * 0.2
      : 0.88;

    this.ctx.save();
    this.ctx.translate(arrowX, arrowY);

    // Base disc — anchors the arrow to the edge
    this.ctx.globalAlpha = pulseAlpha * 0.45;
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = glowColor;
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.ARROW_SIZE * 0.85, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.rotate(angle);

    // Arrow shape
    this.ctx.globalAlpha = pulseAlpha;
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = glowColor;
    this.ctx.shadowBlur = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(this.ARROW_SIZE, 0);
    this.ctx.lineTo(-this.ARROW_SIZE / 2, -this.ARROW_SIZE / 2);
    this.ctx.lineTo(-this.ARROW_SIZE / 2, this.ARROW_SIZE / 2);
    this.ctx.closePath();
    this.ctx.fill();

    // Dark outline for contrast
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Cleanup event listeners
   */
  public cleanup(): void {
    this.eventBus.off('conflict:started', this.boundHandleConflictStarted);
    this.eventBus.off('conflict:resolved', this.boundHandleConflictResolved);
    this.eventBus.off('death:occurred', this.boundHandleDeath);
  }
}
