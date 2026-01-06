/**
 * SkillTreePanel - Main panel for magic skill tree UI
 *
 * Implements IWindowPanel to integrate with WindowManager.
 * Manages paradigm tabs, handles user interaction, and coordinates backend communication.
 */

import type { IWindowPanel } from '../../IWindowPanel.js';
import type { World, Entity, MagicComponent, MagicSkillProgress, EvaluationContext } from '@ai-village/magic';
import { MagicSkillTreeRegistry } from '@ai-village/magic';
import { ParadigmTreeView } from './ParadigmTreeView.js';
import type { Viewport, SkillTreeUIState } from './types.js';

export class SkillTreePanel implements IWindowPanel {
  private visible: boolean = false;
  private selectedEntity: Entity | null = null;
  private uiState: SkillTreeUIState;
  private treeView: ParadigmTreeView;
  private recentlyDiscoveredNodes: Set<string> = new Set();
  private lastDiscoveryCheckTime: number = 0;

  constructor(_windowManager: any) {
    // WindowManager reference not currently needed
    this.treeView = new ParadigmTreeView();
    this.uiState = this.createInitialUIState();
  }

  // ==========================================================================
  // IWindowPanel Implementation
  // ==========================================================================

  getId(): string {
    return 'skill-tree';
  }

  getTitle(): string {
    if (this.selectedEntity) {
      const magicComp = this.selectedEntity.getComponent('magic') as MagicComponent | undefined;
      if (magicComp) {
        const paradigmName = this.uiState.activeParadigmId || 'Unknown';
        return `Magic Skill Tree - ${paradigmName}`;
      }
    }
    return 'Magic Skill Tree';
  }

  getDefaultWidth(): number {
    return 800;
  }

  getDefaultHeight(): number {
    return 600;
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
    world?: World
  ): void {
    if (!ctx || !this.selectedEntity || !world) {
      this.renderEmptyState(ctx, x, y, width, height);
      return;
    }

    const magicComp = this.selectedEntity.getComponent('magic') as MagicComponent | undefined;
    if (!magicComp || !magicComp.magicUser || magicComp.knownParadigmIds.length === 0) {
      this.renderNoMagicState(ctx, x, y, width, height);
      return;
    }

    // Ensure active paradigm is set
    if (!this.uiState.activeParadigmId || !magicComp.knownParadigmIds.includes(this.uiState.activeParadigmId)) {
      this.uiState.activeParadigmId = magicComp.knownParadigmIds[0];
    }

    // Check for new discoveries
    this.checkForNewDiscoveries(magicComp);

    // Render tabs
    const tabHeight = 30;
    this.renderTabs(ctx, magicComp.knownParadigmIds, x, y, width, tabHeight);

    // Render tree
    if (!this.uiState.activeParadigmId) {
      this.renderError(ctx, x, y + tabHeight, width, height - tabHeight, 'No active paradigm');
      return;
    }

    const tree = MagicSkillTreeRegistry.getInstance().getTree(this.uiState.activeParadigmId);
    if (!tree) {
      this.renderError(ctx, x, y + tabHeight, width, height - tabHeight, `No tree found for ${this.uiState.activeParadigmId}`);
      return;
    }

    const progress = this.getProgressForParadigm(magicComp, this.uiState.activeParadigmId);
    if (!progress) {
      this.renderError(ctx, x, y + tabHeight, width, height - tabHeight, 'No progress data');
      return;
    }

    const evaluationContext = this.buildEvaluationContext(world, this.selectedEntity, progress);

    this.treeView.render(
      ctx,
      tree,
      progress,
      evaluationContext,
      x,
      y + tabHeight,
      width,
      height - tabHeight,
      {
        viewport: this.uiState.viewport,
        hoveredNodeId: this.uiState.hoveredNodeId,
        selectedNodeId: this.uiState.selectedNodeId,
        showDebug: false,
      },
      Date.now()
    );
  }

  handleClick(x: number, y: number, world?: World): boolean {
    if (!this.selectedEntity || !world) {
      return false;
    }

    const magicComp = this.selectedEntity.getComponent('magic') as MagicComponent | undefined;
    if (!magicComp || !this.uiState.activeParadigmId) {
      return false;
    }

    // Check if clicking on tabs
    const tabHeight = 30;
    if (y < tabHeight) {
      return this.handleTabClick(x, magicComp.knownParadigmIds);
    }

    // Check if clicking on a node
    const tree = MagicSkillTreeRegistry.getInstance().getTree(this.uiState.activeParadigmId!);
    if (!tree) {
      return false;
    }

    const nodeId = this.treeView.findNodeAtPosition(
      tree,
      x,
      y - tabHeight,
      this.uiState.viewport,
      0,
      0,
      this.getDefaultWidth(),
      this.getDefaultHeight() - tabHeight
    );

    if (nodeId) {
      return this.handleNodeClick(nodeId, world);
    }

    return false;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Set the entity to display skill tree for.
   */
  setSelectedEntity(entity: Entity | null): void {
    this.selectedEntity = entity;
    if (entity) {
      this.uiState.selectedEntityId = entity.id;
      // Reset viewport when switching entities
      this.uiState.viewport = this.createDefaultViewport();
    }
  }

  /**
   * Set the active paradigm.
   */
  setActiveParadigm(paradigmId: string): void {
    this.uiState.activeParadigmId = paradigmId;
    this.treeView.clearCache();
  }

  /**
   * Refresh the panel (after backend updates).
   */
  refresh(): void {
    this.treeView.clearCache();
    // Trigger re-render (would be called by window manager)
  }

  /**
   * Get recently discovered nodes (for notifications).
   */
  getRecentDiscoveries(): string[] {
    return Array.from(this.recentlyDiscoveredNodes);
  }

  /**
   * Get current active paradigm.
   */
  getActiveParadigm(): string | null {
    return this.uiState.activeParadigmId || null;
  }

  /**
   * Set selected node (for keyboard navigation).
   */
  setSelectedNode(nodeId: string | null): void {
    this.uiState.selectedNodeId = nodeId || undefined;
  }

  /**
   * Get selected node ID.
   */
  getSelectedNodeId(): string | null {
    return this.uiState.selectedNodeId || null;
  }

  /**
   * Handle scroll/pan.
   */
  handleScroll(dx: number, dy: number): void {
    this.uiState.viewport.offsetX += dx;
    this.uiState.viewport.offsetY += dy;
  }

  /**
   * Get current scroll position.
   */
  getScroll(): { x: number; y: number } {
    return {
      x: this.uiState.viewport.offsetX,
      y: this.uiState.viewport.offsetY,
    };
  }

  /**
   * Set scroll position.
   */
  setScroll(x: number, y: number): void {
    this.uiState.viewport.offsetX = x;
    this.uiState.viewport.offsetY = y;
  }

  /**
   * Handle zoom.
   */
  handleZoom(factor: number): void {
    this.uiState.viewport.zoom = Math.max(
      this.uiState.viewport.minZoom,
      Math.min(this.uiState.viewport.maxZoom, this.uiState.viewport.zoom * factor)
    );
  }

  /**
   * Get current zoom level.
   */
  getZoom(): number {
    return this.uiState.viewport.zoom;
  }

  /**
   * Set zoom level.
   */
  setZoom(level: number): void {
    this.uiState.viewport.zoom = Math.max(
      this.uiState.viewport.minZoom,
      Math.min(this.uiState.viewport.maxZoom, level)
    );
  }

  /**
   * Handle mouse move (for hover detection).
   */
  handleMouseMove(x: number, y: number, world?: World): void {
    if (!this.selectedEntity || !world || !this.uiState.activeParadigmId) {
      this.uiState.hoveredNodeId = undefined;
      return;
    }

    const tabHeight = 30;
    if (y < tabHeight) {
      this.uiState.hoveredNodeId = undefined;
      return;
    }

    const tree = MagicSkillTreeRegistry.getInstance().getTree(this.uiState.activeParadigmId);
    if (!tree) {
      this.uiState.hoveredNodeId = undefined;
      return;
    }

    const nodeId = this.treeView.findNodeAtPosition(
      tree,
      x,
      y - tabHeight,
      this.uiState.viewport,
      0,
      0,
      this.getDefaultWidth(),
      this.getDefaultHeight() - tabHeight
    );

    this.uiState.hoveredNodeId = nodeId;
  }

  /**
   * Handle keyboard input.
   */
  handleKeyDown(key: string, world?: World): void {
    if (!this.selectedEntity || !world) {
      return;
    }

    const magicComp = this.selectedEntity.getComponent('magic') as MagicComponent | undefined;
    if (!magicComp || !this.uiState.activeParadigmId) {
      return;
    }

    switch (key) {
      case 'Tab':
        // Switch paradigm
        const paradigms = magicComp.knownParadigmIds;
        const currentIndex = paradigms.indexOf(this.uiState.activeParadigmId);
        const nextIndex = (currentIndex + 1) % paradigms.length;
        const nextParadigm = paradigms[nextIndex];
        if (nextParadigm) {
          this.setActiveParadigm(nextParadigm);
        }
        break;

      case 'Escape':
        // Close panel
        this.setVisible(false);
        break;

      case 'Enter':
      case ' ':
        // Unlock selected node
        if (this.uiState.selectedNodeId) {
          this.handleNodeClick(this.uiState.selectedNodeId, world);
        }
        break;

      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Navigate nodes (simplified - would need node graph traversal)
        // For now, do nothing
        break;
    }
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private createInitialUIState(): SkillTreeUIState {
    return {
      viewport: this.createDefaultViewport(),
      recentlyDiscoveredNodes: new Set(),
      lastDiscoveryTime: 0,
    };
  }

  private createDefaultViewport(): Viewport {
    return {
      offsetX: 0,
      offsetY: 0,
      zoom: 1.0,
      minZoom: 0.5,
      maxZoom: 2.0,
    };
  }

  private getProgressForParadigm(magicComp: MagicComponent, paradigmId: string): MagicSkillProgress | null {
    const state = magicComp.skillTreeState?.[paradigmId];
    if (!state) {
      return null;
    }

    // Convert SkillTreeParadigmState to MagicSkillProgress
    return {
      paradigmId,
      treeVersion: 1, // Default version
      unlockedNodes: state.unlockedNodes.reduce((acc: Record<string, number>, nodeId: string) => {
        acc[nodeId] = 1; // Default level 1
        return acc;
      }, {} as Record<string, number>),
      totalXpEarned: state.xp,
      availableXp: state.xp,
      discoveries: {},
      relationships: {},
      milestones: {},
    };
  }

  private buildEvaluationContext(world: World, entity: Entity, progress: MagicSkillProgress): EvaluationContext {
    const magicComp = entity.getComponent('magic') as MagicComponent | undefined;

    return {
      world,
      agentId: entity.id,
      progress,
      magicComponent: magicComp ? {
        paradigmState: magicComp.paradigmState,
        techniqueProficiency: magicComp.techniqueProficiency as Record<string, number>,
        formProficiency: magicComp.formProficiency as Record<string, number>,
        corruption: magicComp.corruption,
        favorLevel: magicComp.favorLevel,
      } : undefined,
    };
  }

  private handleTabClick(x: number, paradigms: string[]): boolean {
    const tabWidth = 120;
    const tabIndex = Math.floor(x / tabWidth);

    if (tabIndex >= 0 && tabIndex < paradigms.length && paradigms[tabIndex]) {
      this.setActiveParadigm(paradigms[tabIndex]);
      return true;
    }

    return false;
  }

  private handleNodeClick(nodeId: string, world: World): boolean {
    if (!this.selectedEntity || !this.uiState.activeParadigmId) {
      return false;
    }

    const activeParadigmId = this.uiState.activeParadigmId;
    const magicComp = this.selectedEntity.getComponent('magic') as MagicComponent | undefined;
    if (!magicComp) {
      return false;
    }

    const tree = MagicSkillTreeRegistry.getInstance().getTree(activeParadigmId);
    if (!tree) {
      return false;
    }

    const node = tree.nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      return false;
    }

    const progress = this.getProgressForParadigm(magicComp, activeParadigmId);
    if (!progress) {
      return false;
    }

    const evaluationContext = this.buildEvaluationContext(world, this.selectedEntity, progress);
    const evaluation = require('@ai-village/core/src/magic/MagicSkillTreeEvaluator.js').evaluateNode(
      node,
      tree,
      evaluationContext
    );

    // Try to unlock
    if (evaluation.canPurchase) {
      try {
        // Deduct XP
        const state = magicComp.skillTreeState?.[activeParadigmId];
        if (!state) {
          return false;
        }

        state.xp -= evaluation.xpCost;

        // Mark as unlocked
        if (!state.unlockedNodes.includes(nodeId)) {
          state.unlockedNodes.push(nodeId);
        }

        // Emit event
        const eventBus = world.getEventBus();
        (eventBus.emit as any)({
          type: 'magic:skill_node_unlocked',
          entityId: this.selectedEntity.id,
          paradigmId: activeParadigmId,
          nodeId,
          xpSpent: evaluation.xpCost,
        });

        // Apply effects via SkillTreeManager
        const skillTreeManager = (world as any).getSkillTreeManager?.();
        if (skillTreeManager) {
          skillTreeManager.applyNodeEffects(this.selectedEntity, activeParadigmId, nodeId);
        }

        this.refresh();
        return true;
      } catch (error: any) {
        // Rollback on error
        const eventBus = world.getEventBus();
        (eventBus.emit as any)({
          type: 'ui:notification',
          message: `Error unlocking node: ${error.message}`,
          level: 'error',
        });
        return false;
      }
    } else {
      // Cannot unlock - show notification
      const eventBus = world.getEventBus();
      let message = 'Cannot unlock this node';

      if (evaluation.availableXp < evaluation.xpCost) {
        message = `Insufficient XP (need ${evaluation.xpCost}, have ${evaluation.availableXp})`;
      } else if (evaluation.unmetConditions.length > 0) {
        message = `Requirements not met: ${evaluation.unmetConditions[0].message}`;
      }

      (eventBus.emit as any)({
        type: 'ui:notification',
        message,
        level: 'error',
      });
      return false;
    }
  }

  private checkForNewDiscoveries(_magicComp: MagicComponent): void {
    // Check if any hidden nodes became visible since last check
    // This would trigger discovery notifications
    // For now, simplified - would need to compare previous state
    const now = Date.now();
    if (now - this.lastDiscoveryCheckTime < 1000) {
      return; // Throttle checks
    }
    this.lastDiscoveryCheckTime = now;

    // TODO: Implement discovery tracking
  }

  private renderTabs(ctx: CanvasRenderingContext2D, paradigms: string[], x: number, y: number, _width: number, height: number): void {
    const tabWidth = 120;

    for (let i = 0; i < paradigms.length; i++) {
      const tabX = x + (i * tabWidth);
      const isActive = paradigms[i] === this.uiState.activeParadigmId;

      // Tab background
      ctx.fillStyle = isActive ? '#444444' : '#222222';
      ctx.fillRect(tabX, y, tabWidth, height);

      // Tab border
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 1;
      ctx.strokeRect(tabX, y, tabWidth, height);

      // Tab text (capitalize paradigm name)
      ctx.fillStyle = isActive ? '#ffffff' : '#999999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const paradigm = paradigms[i];
      if (paradigm) {
        const paradigmName = paradigm.charAt(0).toUpperCase() + paradigm.slice(1);
        ctx.fillText(paradigmName, tabX + tabWidth / 2, y + height / 2);
      }
    }
  }

  private renderEmptyState(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No entity selected', x + width / 2, y + height / 2);
  }

  private renderNoMagicState(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No magic abilities', x + width / 2, y + height / 2);
  }

  private renderError(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, message: string): void {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = '#ff6666';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Error: ${message}`, x + width / 2, y + height / 2);
  }
}
