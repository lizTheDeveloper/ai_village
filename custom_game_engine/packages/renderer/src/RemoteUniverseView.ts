/**
 * RemoteUniverseView - Renders a view of a remote universe being streamed over network
 *
 * Displays entities from a remote universe received via MultiverseNetworkManager.
 * Supports multiple view modes (portal, picture-in-picture, split-screen).
 */

import type { IWindowPanel } from './IWindowPanel.js';
import type { VersionedEntity } from '@ai-village/persistence';
import type {
  UniverseSnapshotMessage,
  UniverseTickUpdate,
  Bounds,
} from '@ai-village/core';

/**
 * View mode for rendering remote universe
 */
export type RemoteViewMode = 'portal' | 'picture-in-picture' | 'split-screen';

/**
 * Remote universe rendering state
 */
interface RemoteUniverseState {
  /** Universe ID being viewed */
  universeId: string;

  /** Passage ID for this connection */
  passageId: string;

  /** Current tick of remote universe */
  currentTick: bigint;

  /** Cached entities from remote universe */
  entities: Map<string, VersionedEntity>;

  /** Viewport bounds in remote universe coordinates */
  viewport: Bounds;

  /** Camera offset for panning */
  cameraX: number;
  cameraY: number;

  /** Zoom level */
  zoom: number;

  /** Last update timestamp */
  lastUpdateTime: number;

  /** Connection status */
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export class RemoteUniverseView implements IWindowPanel {
  private visible: boolean = false;
  private viewMode: RemoteViewMode = 'picture-in-picture';
  private state: RemoteUniverseState;

  // Rendering settings
  private readonly TILE_SIZE = 32;
  private readonly MIN_ZOOM = 0.25;
  private readonly MAX_ZOOM = 2.0;

  // Dragging state
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartCameraX: number = 0;
  private dragStartCameraY: number = 0;

  constructor(
    private passageId: string,
    private universeId: string,
    viewMode: RemoteViewMode = 'picture-in-picture'
  ) {
    this.viewMode = viewMode;

    this.state = {
      universeId,
      passageId,
      currentTick: 0n,
      entities: new Map(),
      viewport: { x: 0, y: 0, width: 20, height: 15 },
      cameraX: 0,
      cameraY: 0,
      zoom: 1.0,
      lastUpdateTime: Date.now(),
      connectionState: 'connecting',
    };
  }

  // ============================================================================
  // IWindowPanel Interface
  // ============================================================================

  getId(): string {
    return `remote-universe-${this.passageId}`;
  }

  getTitle(): string {
    return `Remote Universe: ${this.universeId}`;
  }

  getDefaultWidth(): number {
    switch (this.viewMode) {
      case 'portal':
        return 300;
      case 'picture-in-picture':
        return 400;
      case 'split-screen':
        return 800;
    }
  }

  getDefaultHeight(): number {
    switch (this.viewMode) {
      case 'portal':
        return 300;
      case 'picture-in-picture':
        return 300;
      case 'split-screen':
        return 600;
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    _world?: any
  ): void {
    // Clear background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    // Draw connection status if not connected
    if (this.state.connectionState !== 'connected') {
      this.renderConnectionStatus(ctx, x, y, width, height);
      return;
    }

    // Save context
    ctx.save();

    // Set up clipping region
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // Render remote universe
    this.renderRemoteUniverse(ctx, x, y, width, height);

    // Render portal effect if in portal mode
    if (this.viewMode === 'portal') {
      this.renderPortalEffect(ctx, x, y, width, height);
    }

    // Restore context
    ctx.restore();

    // Render overlay info
    this.renderOverlay(ctx, x, y, width, height);
  }

  renderHeader?(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): void {
    // Render view mode selector
    const modeWidth = 30;
    const spacing = 5;
    let currentX = x + width - (modeWidth * 3 + spacing * 2) - 10;

    const modes: RemoteViewMode[] = ['portal', 'picture-in-picture', 'split-screen'];
    const icons = ['◎', '⧉', '⊞'];

    for (let i = 0; i < modes.length; i++) {
      const mode = modes[i]!;
      const icon = icons[i]!;
      const isActive = mode === this.viewMode;

      // Button background
      ctx.fillStyle = isActive ? '#4a9eff' : '#333';
      ctx.fillRect(currentX, y + 5, modeWidth, 20);

      // Icon
      ctx.fillStyle = isActive ? '#fff' : '#888';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, currentX + modeWidth / 2, y + 15);

      currentX += modeWidth + spacing;
    }
  }

  handleClick?(x: number, y: number, _world?: any): boolean {
    // Start camera drag
    this.isDragging = true;
    this.dragStartX = x;
    this.dragStartY = y;
    this.dragStartCameraX = this.state.cameraX;
    this.dragStartCameraY = this.state.cameraY;
    return true;
  }

  // ============================================================================
  // Remote Universe Update Handling
  // ============================================================================

  /**
   * Handle initial universe snapshot
   */
  handleSnapshot(snapshot: UniverseSnapshotMessage): void {
    this.state.currentTick = BigInt(snapshot.tick);
    this.state.entities.clear();

    for (const entity of snapshot.entities) {
      this.state.entities.set(entity.id, entity);
    }

    this.state.connectionState = 'connected';
    this.state.lastUpdateTime = Date.now();
  }

  /**
   * Handle incremental universe update
   */
  handleUpdate(update: UniverseTickUpdate): void {
    this.state.currentTick = BigInt(update.tick);

    // Add new entities
    for (const entity of update.entitiesAdded) {
      this.state.entities.set(entity.id, entity);
    }

    // Update existing entities
    for (const entityUpdate of update.entitiesUpdated) {
      const existing = this.state.entities.get(entityUpdate.entityId);
      if (existing) {
        // Apply deltas to entity
        for (const delta of entityUpdate.deltas) {
          const componentIndex = existing.components.findIndex(
            (c: any) => c.type === delta.componentType
          );

          if (delta.operation === 'add' && componentIndex === -1) {
            existing.components.push({
              $schema: 'https://aivillage.dev/schemas/component/v1',
              $version: 1,
              type: delta.componentType as string,
              data: delta.data,
            });
          } else if (delta.operation === 'update' && componentIndex !== -1) {
            existing.components[componentIndex]!.data = delta.data;
          } else if (delta.operation === 'remove' && componentIndex !== -1) {
            existing.components.splice(componentIndex, 1);
          }
        }
      }
    }

    // Remove deleted entities
    for (const entityId of update.entitiesRemoved) {
      this.state.entities.delete(entityId);
    }

    this.state.lastUpdateTime = Date.now();
  }

  /**
   * Set viewport bounds for streaming
   */
  setViewport(bounds: Bounds): void {
    this.state.viewport = bounds;
  }

  /**
   * Pan camera by offset
   */
  panCamera(dx: number, dy: number): void {
    this.state.cameraX += dx;
    this.state.cameraY += dy;
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.state.zoom = Math.max(
      this.MIN_ZOOM,
      Math.min(this.MAX_ZOOM, zoom)
    );
  }

  // ============================================================================
  // Rendering Methods
  // ============================================================================

  private renderConnectionStatus(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const status = this.state.connectionState;
    let text = '';
    let color = '#888';

    switch (status) {
      case 'connecting':
        text = 'Connecting to remote universe...';
        color = '#4a9eff';
        break;
      case 'disconnected':
        text = 'Disconnected from remote universe';
        color = '#ff4a4a';
        break;
      case 'error':
        text = 'Error connecting to remote universe';
        color = '#ff4a4a';
        break;
    }

    ctx.fillStyle = color;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);

    // Render loading spinner for connecting state
    if (status === 'connecting') {
      const spinnerSize = 20;
      const spinnerX = x + width / 2;
      const spinnerY = y + height / 2 + 30;
      const rotation = (Date.now() / 100) % 360;

      ctx.save();
      ctx.translate(spinnerX, spinnerY);
      ctx.rotate((rotation * Math.PI) / 180);

      ctx.strokeStyle = '#4a9eff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, spinnerSize, 0, (Math.PI * 3) / 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderRemoteUniverse(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Calculate visible tile range
    const tileSize = this.TILE_SIZE * this.state.zoom;
    const visibleTilesX = Math.ceil(width / tileSize);
    const visibleTilesY = Math.ceil(height / tileSize);

    // Render grid (optional)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let tx = 0; tx <= visibleTilesX; tx++) {
      const gridX = x + tx * tileSize;
      ctx.beginPath();
      ctx.moveTo(gridX, y);
      ctx.lineTo(gridX, y + height);
      ctx.stroke();
    }
    for (let ty = 0; ty <= visibleTilesY; ty++) {
      const gridY = y + ty * tileSize;
      ctx.beginPath();
      ctx.moveTo(x, gridY);
      ctx.lineTo(x + width, gridY);
      ctx.stroke();
    }

    // Render entities
    for (const entity of this.state.entities.values()) {
      this.renderEntity(ctx, entity, x, y, tileSize);
    }
  }

  private renderEntity(
    ctx: CanvasRenderingContext2D,
    entity: VersionedEntity,
    viewX: number,
    viewY: number,
    tileSize: number
  ): void {
    // Get position component
    const positionComp = entity.components.find((c: any) => c.type === 'position');
    if (!positionComp || !positionComp.data) return;

    // Type guard: Validate position data structure
    const data = positionComp.data;
    if (typeof data !== 'object' || data === null || !('x' in data) || !('y' in data)) {
      return;
    }

    // Type assertion: Runtime validated position data
    const pos = data as { x: number; y: number };
    const entityX = pos.x - this.state.cameraX;
    const entityY = pos.y - this.state.cameraY;

    // Convert to screen coordinates
    const screenX = viewX + entityX * tileSize;
    const screenY = viewY + entityY * tileSize;

    // Simple entity rendering (colored square)
    // TODO: Use actual sprites/rendering from entity type

    // Helper to check component existence
    const hasComponent = (type: string): boolean =>
      entity.components.some((c) => c.type === type);

    let color = '#888';
    if (hasComponent('agent')) {
      color = '#4a9eff';
    } else if (hasComponent('plant')) {
      color = '#44ff44';
    } else if (hasComponent('building')) {
      color = '#ff9944';
    } else if (hasComponent('animal')) {
      color = '#ff44ff';
    }

    ctx.fillStyle = color;
    ctx.fillRect(
      screenX - tileSize / 4,
      screenY - tileSize / 4,
      tileSize / 2,
      tileSize / 2
    );

    // Render entity ID for debugging
    if (this.state.zoom > 0.8) {
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.floor(10 * this.state.zoom)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        entity.id.substring(0, 8),
        screenX,
        screenY + tileSize / 2 + 2
      );
    }
  }

  private renderPortalEffect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Render circular vignette/portal effect
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.min(width, height) / 2;

    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      radius * 0.7,
      centerX,
      centerY,
      radius
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    // Render portal rim
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2);
    ctx.stroke();

    // Animated shimmer effect
    const shimmerOffset = (Date.now() / 50) % 360;
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const angle = ((shimmerOffset + i * 120) * Math.PI) / 180;
      const shimmerRadius = radius - 10 - i * 5;
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        shimmerRadius,
        angle,
        angle + Math.PI / 2
      );
      ctx.stroke();
    }
  }

  private renderOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Render stats overlay in top-left
    const padding = 10;
    const lineHeight = 16;
    let currentY = y + padding;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x + padding, currentY - 5, 200, lineHeight * 4 + 10);

    ctx.fillStyle = '#4a9eff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillText(
      `Universe: ${this.state.universeId.substring(0, 16)}`,
      x + padding + 5,
      currentY
    );
    currentY += lineHeight;

    ctx.fillText(
      `Tick: ${this.state.currentTick}`,
      x + padding + 5,
      currentY
    );
    currentY += lineHeight;

    ctx.fillText(
      `Entities: ${this.state.entities.size}`,
      x + padding + 5,
      currentY
    );
    currentY += lineHeight;

    const latency = Date.now() - this.state.lastUpdateTime;
    ctx.fillText(
      `Latency: ${latency}ms`,
      x + padding + 5,
      currentY
    );

    // Render zoom/camera info in bottom-right
    const infoY = y + height - padding - lineHeight * 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x + width - 150, infoY - 5, 140, lineHeight * 2 + 10);

    ctx.fillStyle = '#888';
    ctx.textAlign = 'right';
    ctx.fillText(
      `Zoom: ${(this.state.zoom * 100).toFixed(0)}%`,
      x + width - padding,
      infoY
    );
    ctx.fillText(
      `Cam: (${this.state.cameraX.toFixed(1)}, ${this.state.cameraY.toFixed(1)})`,
      x + width - padding,
      infoY + lineHeight
    );
  }

  // ============================================================================
  // Mouse/Input Handling
  // ============================================================================

  handleMouseDown(x: number, y: number): boolean {
    return this.handleClick!(x, y);
  }

  handleMouseMove(x: number, y: number): void {
    if (this.isDragging) {
      const dx = (x - this.dragStartX) / (this.TILE_SIZE * this.state.zoom);
      const dy = (y - this.dragStartY) / (this.TILE_SIZE * this.state.zoom);

      this.state.cameraX = this.dragStartCameraX - dx;
      this.state.cameraY = this.dragStartCameraY - dy;
    }
  }

  handleMouseUp(): void {
    this.isDragging = false;
  }

  handleWheel(deltaY: number): void {
    const zoomFactor = 1 + deltaY * 0.001;
    this.setZoom(this.state.zoom * zoomFactor);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getPassageId(): string {
    return this.passageId;
  }

  getUniverseId(): string {
    return this.universeId;
  }

  getViewMode(): RemoteViewMode {
    return this.viewMode;
  }

  setViewMode(mode: RemoteViewMode): void {
    this.viewMode = mode;
  }

  getConnectionState(): string {
    return this.state.connectionState;
  }

  setConnectionState(
    state: 'connecting' | 'connected' | 'disconnected' | 'error'
  ): void {
    this.state.connectionState = state;
  }
}
