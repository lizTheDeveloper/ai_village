import type { IWindowPanel } from './types/WindowTypes.js';
import type { World } from '@ai-village/core';
import {
  multiverseCoordinator,
  type UniverseInstance,
  type TimelineEntry,
} from '@ai-village/core';

/**
 * UniverseManagerPanel - Manage multiple universes and timeline forking
 *
 * Provides UI for:
 * - Viewing all universes in the multiverse
 * - Forking the current universe to create alternate timelines
 * - Viewing timeline of save states
 * - Forking from historical save states
 * - Pausing/resuming individual universes
 * - Adjusting time scale per universe
 */
export class UniverseManagerPanel implements IWindowPanel {
  private visible: boolean = false;
  private scrollOffset: number = 0;
  private selectedUniverseId: string | null = null;
  private forkDialogOpen: boolean = false;
  private forkName: string = '';
  private selectedSnapshotId: string | null = null;

  // Button dimensions
  private readonly buttonHeight = 28;
  private readonly rowHeight = 60;
  private readonly snapshotRowHeight = 36;
  private readonly padding = 12;

  // Callback for when a fork is created (set by demo)
  public onForkCreated?: (forkId: string, forkName: string, sourceId: string) => void;

  constructor() {}

  getId(): string {
    return 'universe-manager';
  }

  getTitle(): string {
    return 'Universe Manager';
  }

  getDefaultWidth(): number {
    return 350;
  }

  getDefaultHeight(): number {
    return 400;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (!visible) {
      this.forkDialogOpen = false;
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    world?: World
  ): void {
    if (!this.visible) {
      return;
    }

    // If fork dialog is open, render that instead
    if (this.forkDialogOpen) {
      this.renderForkDialog(ctx, width, height);
      return;
    }

    const universes = Array.from(multiverseCoordinator.getAllUniverses().values());
    let y = this.padding - this.scrollOffset;

    // === HEADER ===
    ctx.fillStyle = '#00CED1';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Multiverse Timeline', this.padding, y + 14);
    y += 24;

    // Multiverse stats
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    const absoluteTick = multiverseCoordinator.getAbsoluteTick();
    ctx.fillText(`Absolute Tick: ${absoluteTick}`, this.padding, y + 11);
    y += 16;
    ctx.fillText(`Universes: ${universes.length}`, this.padding, y + 11);
    y += 24;

    // === FORK BUTTON ===
    const forkBtnWidth = width - (this.padding * 2);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(this.padding, y, forkBtnWidth, this.buttonHeight);
    ctx.strokeStyle = '#66BB6A';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.padding, y, forkBtnWidth, this.buttonHeight);

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px monospace';
    const forkLabel = '+ Fork Current Universe';
    const forkLabelWidth = ctx.measureText(forkLabel).width;
    ctx.fillText(forkLabel, this.padding + (forkBtnWidth - forkLabelWidth) / 2, y + 18);
    y += this.buttonHeight + 16;

    // === UNIVERSE LIST ===
    ctx.fillStyle = '#00CED1';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Active Universes:', this.padding, y + 12);
    y += 20;

    // Draw separator line
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.padding, y);
    ctx.lineTo(width - this.padding, y);
    ctx.stroke();
    y += 8;

    // Render each universe
    for (const universe of universes) {
      if (y > height) break; // Don't render off-screen

      this.renderUniverseRow(ctx, universe, this.padding, y, width - (this.padding * 2), world);
      y += this.rowHeight + 8;
    }

    // Empty state
    if (universes.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '12px monospace';
      ctx.fillText('No universes registered', this.padding, y + 12);
      y += 20;
    }

    // === TIMELINE SECTION ===
    if (this.selectedUniverseId) {
      y += 8;

      // Timeline header
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.padding, y);
      ctx.lineTo(width - this.padding, y);
      ctx.stroke();
      y += 12;

      ctx.fillStyle = '#9C27B0';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Timeline Save States:', this.padding, y + 12);

      // Save snapshot button
      const saveBtnWidth = 60;
      const saveBtnX = width - this.padding - saveBtnWidth;
      ctx.fillStyle = '#673AB7';
      ctx.fillRect(saveBtnX, y - 2, saveBtnWidth, 20);
      ctx.fillStyle = '#FFF';
      ctx.font = '10px monospace';
      ctx.fillText('+ Save', saveBtnX + 10, y + 11);
      y += 24;

      // Render timeline entries
      const timeline = multiverseCoordinator.getTimeline(this.selectedUniverseId);
      if (timeline.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '11px monospace';
        ctx.fillText('No snapshots yet', this.padding + 8, y + 12);
      } else {
        // Show most recent first (reverse order)
        const recentSnapshots = [...timeline].reverse().slice(0, 10);
        for (const entry of recentSnapshots) {
          if (y > height - 20) break;
          this.renderTimelineEntry(ctx, entry, this.padding, y, width - (this.padding * 2));
          y += this.snapshotRowHeight;
        }

        if (timeline.length > 10) {
          ctx.fillStyle = '#666';
          ctx.font = '10px monospace';
          ctx.fillText(`... and ${timeline.length - 10} more snapshots`, this.padding + 8, y + 10);
        }
      }
    }
  }

  private renderTimelineEntry(
    ctx: CanvasRenderingContext2D,
    entry: TimelineEntry,
    x: number,
    y: number,
    width: number
  ): void {
    const isSelected = this.selectedSnapshotId === entry.id;

    // Background
    ctx.fillStyle = isSelected ? '#3d2d5a' : '#2d2d3a';
    ctx.fillRect(x, y, width, this.snapshotRowHeight - 4);

    // Border
    ctx.strokeStyle = isSelected ? '#9C27B0' : '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, this.snapshotRowHeight - 4);

    // Tick number
    ctx.fillStyle = entry.isAutoSave ? '#888' : '#9C27B0';
    ctx.font = '11px monospace';
    ctx.fillText(`T${entry.tick}`, x + 8, y + 14);

    // Entity count
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.fillText(`${entry.entityCount} entities`, x + 80, y + 14);

    // Time ago
    const age = Date.now() - entry.createdAt;
    const ageStr = this.formatAge(age);
    ctx.fillText(ageStr, x + 160, y + 14);

    // Label if present
    if (entry.label) {
      ctx.fillStyle = '#AAA';
      ctx.fillText(entry.label, x + 8, y + 26);
    }

    // Fork from button
    const forkBtnWidth = 40;
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(x + width - forkBtnWidth - 4, y + 4, forkBtnWidth, 20);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('Fork', x + width - forkBtnWidth + 4, y + 17);
  }

  private formatAge(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  private renderUniverseRow(
    ctx: CanvasRenderingContext2D,
    universe: UniverseInstance,
    x: number,
    y: number,
    width: number,
    _world?: World
  ): void {
    const config = universe.config;
    const isSelected = this.selectedUniverseId === config.id;

    // Background
    ctx.fillStyle = isSelected ? '#2a3a4a' : '#1a2a3a';
    ctx.fillRect(x, y, width, this.rowHeight);

    // Border
    ctx.strokeStyle = isSelected ? '#00CED1' : '#334';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(x, y, width, this.rowHeight);

    // Universe name
    ctx.fillStyle = config.paused ? '#888' : '#FFF';
    ctx.font = 'bold 13px monospace';
    const nameLabel = config.name.length > 20 ? config.name.slice(0, 17) + '...' : config.name;
    ctx.fillText(nameLabel, x + 8, y + 16);

    // Status icons
    let statusX = x + width - 8;

    // Paused indicator
    if (config.paused) {
      ctx.fillStyle = '#FF9800';
      ctx.font = '12px monospace';
      statusX -= 20;
      ctx.fillText('||', statusX, y + 16);
    }

    // Fork indicator
    if (config.parentId) {
      ctx.fillStyle = '#9C27B0';
      ctx.font = '11px monospace';
      statusX -= 20;
      ctx.fillText('[F]', statusX, y + 16);
    }

    // Universe tick and time scale
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText(`Tick: ${universe.universeTick}`, x + 8, y + 32);
    ctx.fillText(`Speed: ${config.timeScale}x`, x + 100, y + 32);

    // Control buttons row
    const btnY = y + 38;
    const btnWidth = 50;
    const btnHeight = 18;
    let btnX = x + 8;

    // Pause/Resume button
    ctx.fillStyle = config.paused ? '#4CAF50' : '#FF9800';
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px monospace';
    const pauseLabel = config.paused ? 'Play' : 'Pause';
    ctx.fillText(pauseLabel, btnX + 8, btnY + 13);
    btnX += btnWidth + 4;

    // Speed buttons
    const speeds = [1, 2, 4];
    for (const speed of speeds) {
      const isActive = config.timeScale === speed && !config.paused;
      ctx.fillStyle = isActive ? '#00CED1' : '#333';
      ctx.fillRect(btnX, btnY, 24, btnHeight);
      ctx.fillStyle = isActive ? '#000' : '#AAA';
      ctx.font = '10px monospace';
      ctx.fillText(`${speed}x`, btnX + 4, btnY + 13);
      btnX += 28;
    }

    // Fork from this button
    ctx.fillStyle = '#673AB7';
    ctx.fillRect(btnX, btnY, 40, btnHeight);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('Fork', btnX + 6, btnY + 13);
  }

  private renderForkDialog(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    // Dialog box
    const dialogWidth = 280;
    const dialogHeight = 160;
    const dialogX = (width - dialogWidth) / 2;
    const dialogY = (height - dialogHeight) / 2;

    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(dialogX, dialogY, dialogWidth, dialogHeight);
    ctx.strokeStyle = '#00CED1';
    ctx.lineWidth = 2;
    ctx.strokeRect(dialogX, dialogY, dialogWidth, dialogHeight);

    // Title
    ctx.fillStyle = '#00CED1';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Create Universe Fork', dialogX + 16, dialogY + 28);

    // Name input label
    ctx.fillStyle = '#AAA';
    ctx.font = '12px monospace';
    ctx.fillText('Fork Name:', dialogX + 16, dialogY + 56);

    // Input field (visual representation)
    ctx.fillStyle = '#0a1a2a';
    ctx.fillRect(dialogX + 16, dialogY + 62, dialogWidth - 32, 28);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(dialogX + 16, dialogY + 62, dialogWidth - 32, 28);

    ctx.fillStyle = '#FFF';
    ctx.font = '12px monospace';
    const displayName = this.forkName || 'Fork ' + (Date.now() % 10000);
    ctx.fillText(displayName, dialogX + 22, dialogY + 81);

    // Buttons
    const btnY = dialogY + dialogHeight - 44;
    const btnWidth = 100;

    // Cancel button
    ctx.fillStyle = '#555';
    ctx.fillRect(dialogX + 16, btnY, btnWidth, 28);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Cancel', dialogX + 16 + 28, btnY + 18);

    // Create button
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(dialogX + dialogWidth - 16 - btnWidth, btnY, btnWidth, 28);
    ctx.fillStyle = '#FFF';
    ctx.fillText('Create Fork', dialogX + dialogWidth - 16 - btnWidth + 12, btnY + 18);
  }

  handleContentClick(x: number, y: number, width: number, height: number, world?: World): boolean {
    if (!this.visible) {
      return false;
    }

    // Handle fork dialog clicks
    if (this.forkDialogOpen) {
      return this.handleForkDialogClick(x, y, width, height, world);
    }

    let clickY = this.padding - this.scrollOffset;

    // Skip header
    clickY += 24 + 16 + 24;

    // Fork button
    const forkBtnWidth = width - (this.padding * 2);
    if (y >= clickY && y <= clickY + this.buttonHeight) {
      if (x >= this.padding && x <= this.padding + forkBtnWidth) {
        this.openForkDialog();
        return true;
      }
    }
    clickY += this.buttonHeight + 16 + 20 + 8;

    // Universe list
    const universes = Array.from(multiverseCoordinator.getAllUniverses().values());
    for (const universe of universes) {
      if (y >= clickY && y <= clickY + this.rowHeight) {
        return this.handleUniverseRowClick(x - this.padding, y - clickY, width - (this.padding * 2), universe);
      }
      clickY += this.rowHeight + 8;
    }

    // Empty state offset
    if (universes.length === 0) {
      clickY += 20;
    }

    // Timeline section
    if (this.selectedUniverseId) {
      clickY += 8 + 12;  // separator + spacing

      // Save button area
      const saveBtnWidth = 60;
      const saveBtnX = width - this.padding - saveBtnWidth;
      if (y >= clickY - 2 && y <= clickY + 18) {
        if (x >= saveBtnX && x <= saveBtnX + saveBtnWidth) {
          // Create snapshot
          multiverseCoordinator.createTimelineSnapshot(this.selectedUniverseId, 'Manual save')
            .then(() => console.log('[UniverseManager] Created timeline snapshot'))
            .catch((err) => console.error('[UniverseManager] Failed to create snapshot:', err));
          return true;
        }
      }
      clickY += 24;

      // Timeline entries
      const timeline = multiverseCoordinator.getTimeline(this.selectedUniverseId);
      const recentSnapshots = [...timeline].reverse().slice(0, 10);
      for (const entry of recentSnapshots) {
        if (y >= clickY && y <= clickY + this.snapshotRowHeight - 4) {
          // Check if clicked fork button
          const forkBtnWidth = 40;
          const forkBtnX = width - this.padding - forkBtnWidth - 4;
          if (x >= forkBtnX && x <= forkBtnX + forkBtnWidth) {
            // Fork from this snapshot
            this.forkFromSnapshot(entry);
            return true;
          }
          // Select this snapshot
          this.selectedSnapshotId = entry.id;
          return true;
        }
        clickY += this.snapshotRowHeight;
      }
    }

    return false;
  }

  private forkFromSnapshot(entry: TimelineEntry): void {
    const forkId = 'fork_' + Date.now();
    const forkName = `Fork from T${entry.tick}`;

    multiverseCoordinator.forkUniverse(
      this.selectedUniverseId || 'primary',
      forkId,
      forkName,
      { fromSnapshotId: entry.id }
    )
      .then(() => {
        console.log(`[UniverseManager] Created fork from snapshot: ${forkName}`);
        if (this.onForkCreated) {
          this.onForkCreated(forkId, forkName, this.selectedUniverseId || 'primary');
        }
      })
      .catch((err) => {
        console.error('[UniverseManager] Failed to fork from snapshot:', err);
      });
  }

  private handleUniverseRowClick(
    x: number,
    y: number,
    _width: number,
    universe: UniverseInstance
  ): boolean {
    const config = universe.config;

    // Check if clicking on control buttons (bottom row)
    if (y >= 38 && y <= 56) {
      let btnX = 8;

      // Pause/Resume button (width 50)
      if (x >= btnX && x <= btnX + 50) {
        if (config.paused) {
          multiverseCoordinator.resumeUniverse(config.id);
        } else {
          multiverseCoordinator.pauseUniverse(config.id);
        }
        return true;
      }
      btnX += 54;

      // Speed buttons (1x, 2x, 4x)
      const speeds = [1, 2, 4];
      for (const speed of speeds) {
        if (x >= btnX && x <= btnX + 24) {
          multiverseCoordinator.setTimeScale(config.id, speed);
          if (config.paused) {
            multiverseCoordinator.resumeUniverse(config.id);
          }
          return true;
        }
        btnX += 28;
      }

      // Fork button (width 40)
      if (x >= btnX && x <= btnX + 40) {
        this.selectedUniverseId = config.id;
        this.openForkDialog();
        return true;
      }
    }

    // Select universe on row click
    this.selectedUniverseId = config.id;
    return true;
  }

  private handleForkDialogClick(
    x: number,
    y: number,
    width: number,
    height: number,
    world?: World
  ): boolean {
    const dialogWidth = 280;
    const dialogHeight = 160;
    const dialogX = (width - dialogWidth) / 2;
    const dialogY = (height - dialogHeight) / 2;
    const btnY = dialogY + dialogHeight - 44;
    const btnWidth = 100;

    // Cancel button
    if (x >= dialogX + 16 && x <= dialogX + 16 + btnWidth) {
      if (y >= btnY && y <= btnY + 28) {
        this.closeForkDialog();
        return true;
      }
    }

    // Create button
    if (x >= dialogX + dialogWidth - 16 - btnWidth && x <= dialogX + dialogWidth - 16) {
      if (y >= btnY && y <= btnY + 28) {
        this.createFork(world);
        return true;
      }
    }

    return true; // Consume all clicks when dialog is open
  }

  private openForkDialog(): void {
    this.forkDialogOpen = true;
    this.forkName = 'Fork ' + (Date.now() % 10000);
  }

  private closeForkDialog(): void {
    this.forkDialogOpen = false;
    this.forkName = '';
  }

  private createFork(_world?: World): void {
    const sourceId = this.selectedUniverseId || 'primary';
    const forkId = 'fork_' + Date.now();
    const forkName = this.forkName || 'Fork ' + (Date.now() % 10000);

    // Fork is async - handle the promise
    multiverseCoordinator.forkUniverse(sourceId, forkId, forkName)
      .then(() => {
        console.log(`[UniverseManager] Created fork: ${forkName} (${forkId}) from ${sourceId}`);

        // Notify callback if set (for world cloning)
        if (this.onForkCreated) {
          this.onForkCreated(forkId, forkName, sourceId);
        }

        this.closeForkDialog();
      })
      .catch((error) => {
        console.error('[UniverseManager] Failed to create fork:', error);
        this.closeForkDialog();
      });
  }

  handleScroll(deltaY: number, contentHeight: number): boolean {
    if (!this.visible || this.forkDialogOpen) {
      return false;
    }

    const universes = Array.from(multiverseCoordinator.getAllUniverses().values());
    const totalHeight = this.padding + 24 + 16 + 24 + this.buttonHeight + 16 + 20 + 8 +
      (universes.length * (this.rowHeight + 8));

    const maxScroll = Math.max(0, totalHeight - contentHeight);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + deltaY));

    return true;
  }

  handleKeyPress(key: string, _world?: World): boolean {
    if (!this.visible) {
      return false;
    }

    if (this.forkDialogOpen) {
      if (key === 'Escape') {
        this.closeForkDialog();
        return true;
      }
      if (key === 'Enter') {
        this.createFork(_world);
        return true;
      }
    }

    return false;
  }
}
