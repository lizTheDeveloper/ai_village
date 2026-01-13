/**
 * SkillTreePanel - Main panel for magic skill tree UI
 *
 * Implements IWindowPanel to integrate with WindowManager.
 * Manages paradigm tabs, handles user interaction, and coordinates backend communication.
 */

import type { IWindowPanel } from '../../IWindowPanel.js';
import type { World, Entity, MagicComponent, MagicSkillProgress, EvaluationContext } from '@ai-village/magic';
import { MagicSkillTreeRegistry } from '@ai-village/magic';
import { evaluateNode, type NodeEvaluationResult } from '@ai-village/magic';
import { ParadigmTreeView } from './ParadigmTreeView.js';
import type { Viewport, SkillTreeUIState } from './types.js';

export class SkillTreePanel implements IWindowPanel {
  private visible: boolean = false;
  private selectedEntity: Entity | null = null;
  private uiState: SkillTreeUIState;
  private treeView: ParadigmTreeView;
  private recentlyDiscoveredNodes: Set<string> = new Set();
  private lastDiscoveryCheckTime: number = 0;
  private tabScrollOffset: number = 0;

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
    // Throw error if no entity selected (error case per test requirements)
    if (!this.selectedEntity) {
      throw new Error('No entity selected');
    }

    if (!world) {
      throw new Error('World is required for rendering');
    }

    const magicComp = this.selectedEntity.getComponent('magic') as MagicComponent | undefined;
    if (!magicComp) {
      throw new Error('Entity missing magic component');
    }

    // Render "No magic abilities" for entities without paradigms (not an error case)
    if (!magicComp.magicUser || magicComp.knownParadigmIds.length === 0) {
      this.renderNoMagicState(ctx, x, y, width, height);
      return;
    }

    // Ensure active paradigm is set
    if (!this.uiState.activeParadigmId || !magicComp.knownParadigmIds.includes(this.uiState.activeParadigmId)) {
      this.uiState.activeParadigmId = magicComp.knownParadigmIds[0];
    }

    // Check for new discoveries
    this.checkForNewDiscoveries(magicComp, world);

    // Render tabs (hide if only one paradigm)
    const tabHeight = magicComp.knownParadigmIds.length > 1 ? 30 : 0;
    if (tabHeight > 0) {
      this.renderTabs(ctx, magicComp.knownParadigmIds, x, y, width, tabHeight);
    }

    // Render tree
    if (!this.uiState.activeParadigmId) {
      throw new Error('No active paradigm set');
    }

    const tree = MagicSkillTreeRegistry.getInstance().getTree(this.uiState.activeParadigmId);
    if (!tree) {
      throw new Error(`Skill tree not found for paradigm: ${this.uiState.activeParadigmId}`);
    }

    const progress = this.getProgressForParadigm(magicComp, this.uiState.activeParadigmId);
    if (!progress) {
      throw new Error(`No progress data for paradigm: ${this.uiState.activeParadigmId}`);
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

    // Check if clicking on tabs (only if multiple paradigms)
    const tabHeight = magicComp.knownParadigmIds.length > 1 ? 30 : 0;
    if (tabHeight > 0 && y < tabHeight) {
      return this.handleTabClick(x, magicComp.knownParadigmIds, this.getDefaultWidth());
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

      // Set activeParadigmId to first paradigm if entity has magic
      const magicComp = entity.getComponent('magic') as MagicComponent | undefined;
      if (magicComp && magicComp.knownParadigmIds && magicComp.knownParadigmIds.length > 0) {
        this.uiState.activeParadigmId = magicComp.knownParadigmIds[0];
      }
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
    const minZoom = this.uiState.viewport.minZoom ?? 0.5;
    const maxZoom = this.uiState.viewport.maxZoom ?? 3.0;
    this.uiState.viewport.zoom = Math.max(
      minZoom,
      Math.min(maxZoom, this.uiState.viewport.zoom * factor)
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
    const minZoom = this.uiState.viewport.minZoom ?? 0.5;
    const maxZoom = this.uiState.viewport.maxZoom ?? 3.0;
    this.uiState.viewport.zoom = Math.max(
      minZoom,
      Math.min(maxZoom, level)
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

    const magicComp = this.selectedEntity.getComponent('magic') as MagicComponent | undefined;
    const tabHeight = magicComp && magicComp.knownParadigmIds.length > 1 ? 30 : 0;
    if (tabHeight > 0 && y < tabHeight) {
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
    // Handle Escape globally (doesn't require entity/world)
    if (key === 'Escape') {
      this.setVisible(false);
      return;
    }

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
        // Navigate nodes
        this.handleArrowNavigation(key);
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

  private handleTabClick(x: number, paradigms: string[], width: number): boolean {
    const tabWidth = 120;
    const arrowWidth = 20;

    // Check if we need scrolling (10+ paradigms)
    const needsScrolling = paradigms.length >= 10;

    if (needsScrolling) {
      // Check if clicking on left arrow
      if (x < arrowWidth) {
        if (this.tabScrollOffset > 0) {
          this.tabScrollOffset--;
          return true;
        }
        return false;
      }

      // Check if clicking on right arrow
      const maxVisibleTabs = Math.floor((width - arrowWidth * 2) / tabWidth);
      const maxScrollOffset = Math.max(0, paradigms.length - maxVisibleTabs);
      if (x > width - arrowWidth) {
        if (this.tabScrollOffset < maxScrollOffset) {
          this.tabScrollOffset++;
          return true;
        }
        return false;
      }

      // Click is in tab area
      const tabAreaX = x - arrowWidth;
      const tabIndex = this.tabScrollOffset + Math.floor(tabAreaX / tabWidth);

      if (tabIndex >= 0 && tabIndex < paradigms.length) {
        const selectedParadigm = paradigms[tabIndex];
        if (selectedParadigm) {
          this.setActiveParadigm(selectedParadigm);
          return true;
        }
      }
    } else {
      // No scrolling needed - simple tab click
      const tabIndex = Math.floor(x / tabWidth);

      if (tabIndex >= 0 && tabIndex < paradigms.length) {
        const selectedParadigm = paradigms[tabIndex];
        if (selectedParadigm) {
          this.setActiveParadigm(selectedParadigm);
          return true;
        }
      }
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
    const evaluation = evaluateNode(node, tree, evaluationContext);

    // Try to unlock
    if (evaluation.canPurchase) {
      try {
        // Deduct XP
        const state = magicComp.skillTreeState?.[activeParadigmId];
        if (!state) {
          return false;
        }

        const initialXP = state.xp;
        state.xp -= evaluation.xpCost;

        // Mark as unlocked
        if (!state.unlockedNodes.includes(nodeId)) {
          state.unlockedNodes.push(nodeId);
        }

        // Emit event
        const eventBus = world.getEventBus();
        eventBus.emit('magic:skill_node_unlocked', {
          entityId: this.selectedEntity.id,
          paradigmId: activeParadigmId,
          nodeId: nodeId,
          xpSpent: evaluation.xpCost
        });

        // Apply effects via SkillTreeManager
        const skillTreeManager = (world as any).getSkillTreeManager?.();
        if (skillTreeManager) {
          skillTreeManager.unlockSkillNode(this.selectedEntity, activeParadigmId, nodeId, evaluation.xpCost);
          skillTreeManager.applyNodeEffects(this.selectedEntity, activeParadigmId, nodeId);
        }

        this.refresh();
        return true;
      } catch (error: any) {
        // Rollback on error
        const state = magicComp.skillTreeState?.[activeParadigmId];
        if (state) {
          // Rollback XP
          const index = state.unlockedNodes.indexOf(nodeId);
          if (index !== -1) {
            state.unlockedNodes.splice(index, 1);
          }
        }

        // Emit error notification
        const eventBus = world.getEventBus();
        eventBus.emit('ui:notification', {
          message: `Failed to unlock node: ${error.message}`,
          type: 'error'
        });

        return false;
      }
    } else {
      // Cannot unlock - show warning
      let message = 'Cannot unlock this node';

      if (evaluation.availableXp < evaluation.xpCost) {
        message = `Insufficient XP (need ${evaluation.xpCost}, have ${evaluation.availableXp})`;
      } else if (evaluation.unmetConditions.length > 0) {
        message = `Requirements not met: ${evaluation.unmetConditions[0].message}`;
      }

      // Emit notification
      const eventBus = world.getEventBus();
      eventBus.emit('ui:notification', {
        message,
        type: 'error'
      });

      return false;
    }
  }

  private handleArrowNavigation(key: string): void {
    if (!this.selectedEntity || !this.uiState.activeParadigmId) {
      return;
    }

    const tree = MagicSkillTreeRegistry.getInstance().getTree(this.uiState.activeParadigmId);
    if (!tree) {
      return;
    }

    // Get current selection or start with first entry node
    let currentNodeId = this.uiState.selectedNodeId;
    if (!currentNodeId && tree.entryNodes.length > 0) {
      this.uiState.selectedNodeId = tree.entryNodes[0];
      return;
    }

    if (!currentNodeId) {
      return;
    }

    // Find current node
    const currentNode = tree.nodes.find(n => n.id === currentNodeId);
    if (!currentNode) {
      return;
    }

    // Navigate based on key
    let nextNodeId: string | undefined;

    switch (key) {
      case 'ArrowDown':
        // Find nodes that have current node as prerequisite
        const childNodes = tree.nodes.filter(n =>
          n.unlockConditions.some(c =>
            c.type === 'prerequisite_node' && (c as any).nodeId === currentNodeId
          )
        );
        if (childNodes.length > 0 && childNodes[0]) {
          nextNodeId = childNodes[0].id;
        }
        break;

      case 'ArrowUp':
        // Find nodes that current node depends on
        const prereqCondition = currentNode.unlockConditions.find(c => c.type === 'prerequisite_node');
        if (prereqCondition) {
          nextNodeId = (prereqCondition as any).nodeId;
        }
        break;

      case 'ArrowRight':
      case 'ArrowLeft':
        // Navigate to sibling nodes (same tier/category)
        const allInCategory = tree.nodes.filter(n =>
          n.category === currentNode.category &&
          n.tier === currentNode.tier
        );
        if (allInCategory.length > 1) {
          const currentIndex = allInCategory.findIndex(n => n.id === currentNodeId);
          if (currentIndex !== -1) {
            const nextIndex = key === 'ArrowRight'
              ? (currentIndex + 1) % allInCategory.length
              : (currentIndex - 1 + allInCategory.length) % allInCategory.length;
            const nextSibling = allInCategory[nextIndex];
            if (nextSibling) {
              nextNodeId = nextSibling.id;
            }
          }
        }
        break;
    }

    if (nextNodeId) {
      this.uiState.selectedNodeId = nextNodeId;
    }
  }

  private checkForNewDiscoveries(magicComp: MagicComponent, world: World): void {
    // Check if any hidden nodes became visible since last check
    const now = Date.now();
    if (now - this.lastDiscoveryCheckTime < 1000) {
      return; // Throttle checks
    }
    this.lastDiscoveryCheckTime = now;

    if (!this.selectedEntity || !this.uiState.activeParadigmId) {
      return;
    }

    const tree = MagicSkillTreeRegistry.getInstance().getTree(this.uiState.activeParadigmId);
    if (!tree) {
      return;
    }

    const progress = this.getProgressForParadigm(magicComp, this.uiState.activeParadigmId);
    if (!progress) {
      return;
    }

    const evaluationContext = this.buildEvaluationContext(world, this.selectedEntity, progress);

    // Track which nodes are currently visible
    const currentlyVisibleNodes = new Set<string>();

    for (const node of tree.nodes) {
      // Check if node is hidden
      if ((node as any).hidden !== true) {
        continue; // Not a hidden node
      }

      // Evaluate if this hidden node should now be visible
      const evaluation = evaluateNode(node, tree, evaluationContext);

      if (evaluation.isVisible) {
        currentlyVisibleNodes.add(node.id);

        // Check if this is a NEW discovery (wasn't in recentlyDiscoveredNodes before)
        if (!this.recentlyDiscoveredNodes.has(node.id)) {
          this.recentlyDiscoveredNodes.add(node.id);

          // Emit notification event
          const eventBus = world.getEventBus();
          eventBus.emit('ui:notification', {
            message: 'New ability discovered',
            type: 'discovery'
          });
        }
      }
    }
  }

  private renderTabs(ctx: CanvasRenderingContext2D, paradigms: string[], x: number, y: number, width: number, height: number): void {
    const tabWidth = 120;
    const arrowWidth = 20;
    const needsScrolling = paradigms.length >= 10;

    let startX = x;
    let endX = x + width;
    let visibleParadigms = paradigms;
    let visibleStartIndex = 0;

    if (needsScrolling) {
      // Render left scroll arrow
      ctx.fillStyle = '#333333';
      ctx.fillRect(x, y, arrowWidth, height);
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, arrowWidth, height);
      ctx.fillStyle = this.tabScrollOffset > 0 ? '#ffffff' : '#666666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('<', x + arrowWidth / 2, y + height / 2);

      // Calculate visible tabs
      const maxVisibleTabs = Math.floor((width - arrowWidth * 2) / tabWidth);
      visibleStartIndex = this.tabScrollOffset;
      visibleParadigms = paradigms.slice(visibleStartIndex, visibleStartIndex + maxVisibleTabs);
      startX = x + arrowWidth;
      endX = x + width - arrowWidth;

      // Render right scroll arrow
      const maxScrollOffset = Math.max(0, paradigms.length - maxVisibleTabs);
      ctx.fillStyle = '#333333';
      ctx.fillRect(x + width - arrowWidth, y, arrowWidth, height);
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + width - arrowWidth, y, arrowWidth, height);
      ctx.fillStyle = this.tabScrollOffset < maxScrollOffset ? '#ffffff' : '#666666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('>', x + width - arrowWidth / 2, y + height / 2);
    }

    // Render visible tabs
    for (let i = 0; i < visibleParadigms.length; i++) {
      const tabX = startX + (i * tabWidth);
      const paradigm = visibleParadigms[i];
      const isActive = paradigm === this.uiState.activeParadigmId;

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
      if (paradigm) {
        const paradigmName = paradigm.charAt(0).toUpperCase() + paradigm.slice(1);
        ctx.fillText(paradigmName, tabX + tabWidth / 2, y + height / 2);
      }
    }
  }

  private renderNoSelectionState(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = '#888888';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Select an agent to view magic skill tree', x + width / 2, y + height / 2);
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
