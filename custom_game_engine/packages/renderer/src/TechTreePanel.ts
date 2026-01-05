/**
 * TechTreePanel - Interactive tech tree visualization showing all research papers
 *
 * Per user requirements:
 * - Shows ALL papers (not just discovered ones)
 * - Shows who authored each paper
 * - Shows where each paper is located (which library)
 * - Shows prerequisite connections forming the tech tree
 * - Until internet is invented, papers are physical objects in specific libraries
 *
 * Based on openspec/specs/ui-system/research-tree.md
 */

import type { IWindowPanel } from './types/WindowTypes.js';
import type { World, Entity } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';
import type {
  LibraryComponent,
  PositionComponent,
  IdentityComponent,
} from '@ai-village/core';
import type { ResearchPaper, ResearchField } from '@ai-village/world';
import { ALL_RESEARCH_PAPERS, getPaper } from '@ai-village/world';

// UniversityLibraryComponent is not exported from core index, define minimal interface
interface UniversityLibraryComponent {
  type: 'university_library';
  version: number;
  catalog: Array<{
    itemId: string;
    paperIds?: string[];
  }>;
}

// ============================================================================
// Types
// ============================================================================

interface TechTreeNode {
  paper: ResearchPaper;
  x: number; // Position in tree visualization
  y: number;
  status: 'unpublished' | 'published' | 'read';
  authorName?: string;
  locationName?: string; // Library name
  locationPosition?: { x: number; y: number }; // World coordinates
}

interface TechTreeConnection {
  fromPaperId: string;
  toPaperId: string;
}

interface TreeCamera {
  x: number; // Camera center position
  y: number;
  zoom: number; // 0.5 to 2.0
}

// ============================================================================
// Tech Tree Panel
// ============================================================================

export class TechTreePanel implements IWindowPanel {
  private visible = false;
  private camera: TreeCamera = { x: 0, y: 0, zoom: 1.0 };
  private nodes: Map<string, TechTreeNode> = new Map();
  private connections: TechTreeConnection[] = [];
  private selectedPaperId: string | null = null;
  private hoveredPaperId: string | null = null;

  // Interaction state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartCameraX = 0;
  private dragStartCameraY = 0;

  // Layout constants
  private readonly NODE_WIDTH = 140;
  private readonly NODE_HEIGHT = 100;
  private readonly TIER_SPACING_X = 200; // Horizontal spacing between tiers
  private readonly NODE_SPACING_Y = 120; // Vertical spacing between nodes

  // Filter state
  private selectedField: ResearchField | 'all' = 'all';
  private showUnpublished = true;
  private showPublished = true;
  private showRead = true;

  constructor() {
    // Tree will be built on first render when world state is available
  }

  getId(): string {
    return 'tech-tree';
  }

  getTitle(): string {
    return '🌳 Tech Tree';
  }

  getDefaultWidth(): number {
    return 1200;
  }

  getDefaultHeight(): number {
    return 800;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  /**
   * Build the tech tree structure from published research papers only
   */
  private buildTechTree(publishedPapers: ResearchPaper[]): void {
    this.nodes.clear();
    this.connections = [];

    if (publishedPapers.length === 0) {
      return; // No papers to display
    }

    // Calculate node positions using a tier-based layout
    const tierCounts = new Map<number, number>(); // Track how many nodes we've placed in each tier

    for (const paper of publishedPapers) {
      const tier = paper.tier ?? paper.complexity ?? 1;
      const tierCount = tierCounts.get(tier) ?? 0;
      tierCounts.set(tier, tierCount + 1);

      const x = tier * this.TIER_SPACING_X;
      const y = tierCount * this.NODE_SPACING_Y;

      this.nodes.set(paper.paperId, {
        paper,
        x,
        y,
        status: 'published', // These are all published papers
      });

      // Build connections from prerequisites (only if prerequisite is also published)
      for (const prereqId of paper.prerequisitePapers) {
        // Only draw connection if the prerequisite paper is also in our published set
        if (publishedPapers.some(p => p.paperId === prereqId)) {
          this.connections.push({
            fromPaperId: prereqId,
            toPaperId: paper.paperId,
          });
        }
      }
    }

    // Center camera on the tree
    this.centerCamera();
  }

  /**
   * Calculate tier for each paper (depth in the tech tree)
   */
  private calculateTiers(): Map<string, number> {
    const tiers = new Map<string, number>();

    // Start with root papers (no prerequisites)
    const roots = ALL_RESEARCH_PAPERS.filter(p => p.prerequisitePapers.length === 0);
    for (const root of roots) {
      tiers.set(root.paperId, 0);
    }

    // BFS to assign tiers
    const queue = [...roots.map(r => r.paperId)];
    while (queue.length > 0) {
      const paperId = queue.shift()!;
      const tier = tiers.get(paperId) ?? 0;

      // Find papers that depend on this one
      const dependents = ALL_RESEARCH_PAPERS.filter(p =>
        p.prerequisitePapers.includes(paperId)
      );

      for (const dependent of dependents) {
        const currentTier = tiers.get(dependent.paperId) ?? 0;
        const newTier = Math.max(currentTier, tier + 1);
        tiers.set(dependent.paperId, newTier);
        queue.push(dependent.paperId);
      }
    }

    return tiers;
  }

  /**
   * Center camera on the tech tree
   */
  private centerCamera(): void {
    if (this.nodes.size === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const node of this.nodes.values()) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + this.NODE_WIDTH);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + this.NODE_HEIGHT);
    }

    this.camera.x = (minX + maxX) / 2;
    this.camera.y = (minY + maxY) / 2;
  }

  /**
   * Get published papers and rebuild tree
   */
  private rebuildTreeFromWorld(world: World): void {
    // Filter to only published papers
    const publishedPapers = ALL_RESEARCH_PAPERS.filter(paper => paper.published === true);

    // Rebuild tree with published papers only
    this.buildTechTree(publishedPapers);

    // Now update author and location info for all nodes
    this.updateNodeMetadata(world);
  }

  /**
   * Update node metadata (author, location) from world state
   */
  private updateNodeMetadata(world: World): void {
    // Get all libraries
    const libraries = world.query().with(CT.Library).executeEntities();
    const universityLibraries = world.query().with(CT.UniversityLibrary).executeEntities();

    // Build map of paperId -> library info
    const paperLocations = new Map<string, { libraryName: string; position: { x: number; y: number } }>();

    // Check regular libraries
    for (const libEntity of libraries) {
      const lib = libEntity.getComponent<LibraryComponent>(CT.Library);
      const pos = libEntity.getComponent<PositionComponent>(CT.Position);
      const identity = libEntity.getComponent<IdentityComponent>(CT.Identity);

      if (!lib || !pos) continue;

      const libraryName = identity?.name ?? 'Library';

      // Check catalog for papers
      for (const catalogEntry of lib.catalog) {
        if (catalogEntry.itemId.includes('paper_') || catalogEntry.itemId.includes('manuscript_')) {
          paperLocations.set(catalogEntry.itemId, {
            libraryName,
            position: { x: pos.x, y: pos.y },
          });
        }
      }
    }

    // Check university libraries
    for (const libEntity of universityLibraries) {
      const lib = libEntity.getComponent<UniversityLibraryComponent>(CT.UniversityLibrary);
      const pos = libEntity.getComponent<PositionComponent>(CT.Position);
      const identity = libEntity.getComponent<IdentityComponent>(CT.Identity);

      if (!lib || !pos) continue;

      const libraryName = identity?.name ?? 'University Library';

      // Check catalog
      for (const holding of lib.catalog) {
        if (holding.paperIds) {
          for (const paperId of holding.paperIds) {
            paperLocations.set(paperId, {
              libraryName,
              position: { x: pos.x, y: pos.y },
            });
          }
        }
      }
    }

    // Update nodes with location and author info
    for (const [paperId, node] of this.nodes) {
      const paper = node.paper;

      // Get author name
      if (paper.authorId) {
        const authorEntity = world.getEntity(paper.authorId);
        if (authorEntity) {
          const authorIdentity = authorEntity.getComponent<IdentityComponent>(CT.Identity);
          node.authorName = authorIdentity?.name ?? 'Unknown Author';
        }
      }

      // Get location
      const location = paperLocations.get(paperId);
      if (location) {
        node.locationName = location.libraryName;
        node.locationPosition = location.position;
      }
    }
  }

  /**
   * Render the tech tree
   */
  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    world?: World
  ): void {
    if (!this.visible || !world) return;

    // Rebuild tree from published papers in world
    this.rebuildTreeFromWorld(world);

    // Clear background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Save context for camera transform
    ctx.save();

    // Apply camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // Render connections first (behind nodes)
    this.renderConnections(ctx);

    // Render nodes
    this.renderNodes(ctx);

    // Restore context
    ctx.restore();

    // Render UI overlay (not affected by camera)
    this.renderOverlay(ctx, width, height);
  }

  /**
   * Render connections between nodes
   */
  private renderConnections(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;

    for (const conn of this.connections) {
      const fromNode = this.nodes.get(conn.fromPaperId);
      const toNode = this.nodes.get(conn.toPaperId);

      if (!fromNode || !toNode) continue;

      // Apply filters
      if (!this.shouldShowNode(fromNode) || !this.shouldShowNode(toNode)) continue;

      // Calculate connection points
      const fromX = fromNode.x + this.NODE_WIDTH;
      const fromY = fromNode.y + this.NODE_HEIGHT / 2;
      const toX = toNode.x;
      const toY = toNode.y + this.NODE_HEIGHT / 2;

      // Draw bezier curve
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      const controlPointOffset = (toX - fromX) / 2;
      ctx.bezierCurveTo(
        fromX + controlPointOffset, fromY,
        toX - controlPointOffset, toY,
        toX, toY
      );

      // Color based on status
      if (fromNode.status === 'published' && toNode.status === 'published') {
        ctx.strokeStyle = '#4CAF50'; // Green for published chain
      } else {
        ctx.strokeStyle = '#444'; // Gray for unpublished
      }

      ctx.stroke();
    }
  }

  /**
   * Render nodes
   */
  private renderNodes(ctx: CanvasRenderingContext2D): void {
    for (const [paperId, node] of this.nodes) {
      if (!this.shouldShowNode(node)) continue;

      const isSelected = paperId === this.selectedPaperId;
      const isHovered = paperId === this.hoveredPaperId;

      // Node background
      ctx.fillStyle = this.getNodeColor(node.status);
      ctx.fillRect(node.x, node.y, this.NODE_WIDTH, this.NODE_HEIGHT);

      // Node border
      ctx.strokeStyle = isSelected ? '#FFD700' : isHovered ? '#FFF' : '#666';
      ctx.lineWidth = isSelected || isHovered ? 3 : 1;
      ctx.strokeRect(node.x, node.y, this.NODE_WIDTH, this.NODE_HEIGHT);

      // Paper title (truncated)
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 11px Arial';
      const maxWidth = this.NODE_WIDTH - 16;
      let title = node.paper.title;
      while (ctx.measureText(title).width > maxWidth && title.length > 0) {
        title = title.slice(0, -1);
      }
      if (title.length < node.paper.title.length) {
        title += '...';
      }
      ctx.fillText(title, node.x + 8, node.y + 18);

      // Field
      ctx.font = '9px Arial';
      ctx.fillStyle = this.getFieldColor(node.paper.field);
      ctx.fillText(node.paper.field, node.x + 8, node.y + 34);

      // Status info
      ctx.font = '9px Arial';
      ctx.fillStyle = '#CCC';
      if (node.status === 'published') {
        ctx.fillText(`✓ Published`, node.x + 8, node.y + 50);
        if (node.authorName) {
          ctx.fillText(`By ${node.authorName}`, node.x + 8, node.y + 64);
        }
        if (node.locationName) {
          ctx.fillText(`@ ${node.locationName}`, node.x + 8, node.y + 78);
        }
      } else {
        ctx.fillText('Not yet published', node.x + 8, node.y + 50);
      }
    }
  }

  /**
   * Render UI overlay (filters, controls, etc.)
   */
  private renderOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Filter panel
    const panelWidth = 200;
    const panelHeight = 150;
    const panelX = width - panelWidth - 20;
    const panelY = 20;

    ctx.fillStyle = 'rgba(30, 30, 40, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Filters', panelX + 10, panelY + 20);

    // Show counts
    let y = panelY + 40;
    ctx.font = '10px Arial';
    ctx.fillStyle = '#CCC';
    ctx.fillText(`Total: ${this.nodes.size} papers`, panelX + 10, y);
    y += 16;

    const publishedCount = Array.from(this.nodes.values()).filter(n => n.status === 'published').length;
    ctx.fillText(`Published: ${publishedCount}`, panelX + 10, y);
    y += 16;

    const unpublishedCount = Array.from(this.nodes.values()).filter(n => n.status === 'unpublished').length;
    ctx.fillText(`Unpublished: ${unpublishedCount}`, panelX + 10, y);
    y += 20;

    // Instructions
    ctx.font = '9px Arial';
    ctx.fillStyle = '#999';
    ctx.fillText('Drag to pan', panelX + 10, y);
    y += 14;
    ctx.fillText('Scroll to zoom', panelX + 10, y);
  }

  /**
   * Get color for node based on status
   */
  private getNodeColor(status: TechTreeNode['status']): string {
    switch (status) {
      case 'unpublished':
        return 'rgba(60, 60, 70, 0.9)';
      case 'published':
        return 'rgba(40, 80, 40, 0.9)';
      case 'read':
        return 'rgba(40, 60, 100, 0.9)';
    }
  }

  /**
   * Get color for field
   */
  private getFieldColor(field: ResearchField): string {
    const fieldColors: Record<string, string> = {
      agriculture: '#4CAF50',
      metallurgy: '#795548',
      alchemy: '#9C27B0',
      society: '#2196F3',
      nature: '#8BC34A',
      construction: '#FF9800',
      arcane: '#673AB7',
    };
    return fieldColors[field] || '#666';
  }

  /**
   * Check if node should be shown based on filters
   */
  private shouldShowNode(node: TechTreeNode): boolean {
    if (this.selectedField !== 'all' && node.paper.field !== this.selectedField) {
      return false;
    }

    if (!this.showUnpublished && node.status === 'unpublished') return false;
    if (!this.showPublished && node.status === 'published') return false;
    if (!this.showRead && node.status === 'read') return false;

    return true;
  }

  /**
   * Handle mouse down for dragging
   */
  handleMouseDown(x: number, y: number, width: number, height: number): void {
    this.isDragging = true;
    this.dragStartX = x;
    this.dragStartY = y;
    this.dragStartCameraX = this.camera.x;
    this.dragStartCameraY = this.camera.y;

    // Check if clicked on a node
    const worldX = (x - width / 2) / this.camera.zoom + this.camera.x;
    const worldY = (y - height / 2) / this.camera.zoom + this.camera.y;

    for (const [paperId, node] of this.nodes) {
      if (!this.shouldShowNode(node)) continue;

      if (
        worldX >= node.x &&
        worldX <= node.x + this.NODE_WIDTH &&
        worldY >= node.y &&
        worldY <= node.y + this.NODE_HEIGHT
      ) {
        this.selectedPaperId = paperId;
        return;
      }
    }

    this.selectedPaperId = null;
  }

  /**
   * Handle mouse move for panning and hover
   */
  handleMouseMove(x: number, y: number, width: number, height: number): void {
    if (this.isDragging) {
      const dx = (x - this.dragStartX) / this.camera.zoom;
      const dy = (y - this.dragStartY) / this.camera.zoom;
      this.camera.x = this.dragStartCameraX - dx;
      this.camera.y = this.dragStartCameraY - dy;
    } else {
      // Update hover state
      const worldX = (x - width / 2) / this.camera.zoom + this.camera.x;
      const worldY = (y - height / 2) / this.camera.zoom + this.camera.y;

      this.hoveredPaperId = null;
      for (const [paperId, node] of this.nodes) {
        if (!this.shouldShowNode(node)) continue;

        if (
          worldX >= node.x &&
          worldX <= node.x + this.NODE_WIDTH &&
          worldY >= node.y &&
          worldY <= node.y + this.NODE_HEIGHT
        ) {
          this.hoveredPaperId = paperId;
          break;
        }
      }
    }
  }

  /**
   * Handle mouse up to stop dragging
   */
  handleMouseUp(): void {
    this.isDragging = false;
  }

  /**
   * Handle scroll for zooming (IWindowPanel interface)
   */
  handleScroll(deltaY: number, _contentHeight: number): boolean {
    const zoomSpeed = 0.001;
    const zoomFactor = 1 - deltaY * zoomSpeed;
    this.camera.zoom = Math.max(0.3, Math.min(3.0, this.camera.zoom * zoomFactor));
    return true; // Scroll was handled
  }
}
