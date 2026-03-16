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
// Field configuration
// ============================================================================

const FIELD_CONFIG: Record<string, { color: string; glow: string; emoji: string; label: string }> = {
  agriculture: { color: '#4CAF50', glow: 'rgba(76, 175, 80, 0.4)', emoji: '🌾', label: 'Agriculture' },
  metallurgy:  { color: '#a07050', glow: 'rgba(160, 112, 80, 0.4)', emoji: '⚒️', label: 'Metallurgy' },
  alchemy:     { color: '#c060e8', glow: 'rgba(192, 96, 232, 0.4)', emoji: '⚗️', label: 'Alchemy' },
  society:     { color: '#4090e8', glow: 'rgba(64, 144, 232, 0.4)', emoji: '🏛️', label: 'Society' },
  nature:      { color: '#7ac040', glow: 'rgba(122, 192, 64, 0.4)', emoji: '🍃', label: 'Nature' },
  construction:{ color: '#e89020', glow: 'rgba(232, 144, 32, 0.4)', emoji: '🪨', label: 'Construction' },
  arcane:      { color: '#9060d8', glow: 'rgba(144, 96, 216, 0.4)', emoji: '✨', label: 'Arcane' },
};

const DEFAULT_FIELD = { color: '#888', glow: 'rgba(128,128,128,0.3)', emoji: '📜', label: 'Unknown' };

function getFieldCfg(field: string) {
  return FIELD_CONFIG[field] ?? DEFAULT_FIELD;
}

// Pre-generated star positions (deterministic)
const STARS: Array<{ x: number; y: number; r: number; a: number }> = (() => {
  const out: Array<{ x: number; y: number; r: number; a: number }> = [];
  let seed = 42;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
  for (let i = 0; i < 200; i++) {
    out.push({ x: rng() * 4000 - 2000, y: rng() * 4000 - 2000, r: rng() * 1.2 + 0.3, a: rng() * 0.5 + 0.2 });
  }
  return out;
})();

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

    const now = performance.now();

    // Rebuild tree from published papers in world
    this.rebuildTreeFromWorld(world);

    // Deep space gradient background
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#0d0b1e');
    bg.addColorStop(0.5, '#110d22');
    bg.addColorStop(1, '#0a0818');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Save context for camera transform
    ctx.save();

    // Apply camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // Star field (world-space, so they pan with camera)
    this.renderStars(ctx, now);

    // Tier column background strips
    this.renderTierColumns(ctx);

    // Render connections first (behind nodes)
    this.renderConnections(ctx, now);

    // Render nodes
    this.renderNodes(ctx, now);

    // Restore context
    ctx.restore();

    // Render UI overlay (not affected by camera)
    this.renderOverlay(ctx, width, height, now);

    // Selected node detail panel
    if (this.selectedPaperId) {
      const node = this.nodes.get(this.selectedPaperId);
      if (node) this.renderDetailPanel(ctx, node, width, height);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private renderStars(ctx: CanvasRenderingContext2D, _now: number): void {
    for (const star of STARS) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.a})`;
      ctx.fill();
    }
  }

  private renderTierColumns(ctx: CanvasRenderingContext2D): void {
    // Collect distinct tiers
    const tiers = new Set<number>();
    for (const node of this.nodes.values()) {
      const tier = node.paper.tier ?? node.paper.complexity ?? 1;
      tiers.add(tier);
    }

    for (const tier of tiers) {
      const colX = tier * this.TIER_SPACING_X - 10;
      const colW = this.NODE_WIDTH + 20;

      // Subtle column tint
      ctx.fillStyle = 'rgba(255,255,255,0.015)';
      ctx.fillRect(colX, -1200, colW, 2400);

      // Tier label at top
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.textAlign = 'center';
      ctx.fillText(`Tier ${tier}`, colX + colW / 2, -1100);
      ctx.textAlign = 'left';
    }
  }

  /**
   * Render connections between nodes with glowing gradient lines + arrowheads
   */
  private renderConnections(ctx: CanvasRenderingContext2D, now: number): void {
    for (const conn of this.connections) {
      const fromNode = this.nodes.get(conn.fromPaperId);
      const toNode = this.nodes.get(conn.toPaperId);

      if (!fromNode || !toNode) continue;
      if (!this.shouldShowNode(fromNode) || !this.shouldShowNode(toNode)) continue;

      const fromX = fromNode.x + this.NODE_WIDTH;
      const fromY = fromNode.y + this.NODE_HEIGHT / 2;
      const toX   = toNode.x;
      const toY   = toNode.y + this.NODE_HEIGHT / 2;
      const cpOff = (toX - fromX) / 2;

      const isHighlighted =
        conn.fromPaperId === this.selectedPaperId ||
        conn.toPaperId   === this.selectedPaperId ||
        conn.fromPaperId === this.hoveredPaperId  ||
        conn.toPaperId   === this.hoveredPaperId;

      const fromCfg = getFieldCfg(fromNode.paper.field);
      const toCfg   = getFieldCfg(toNode.paper.field);

      // Glow pass for highlighted connections
      if (isHighlighted) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 400);
        ctx.save();
        ctx.shadowColor = fromCfg.glow;
        ctx.shadowBlur = 12 + pulse * 6;
        ctx.strokeStyle = `rgba(255,255,255,${0.15 + pulse * 0.1})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.bezierCurveTo(fromX + cpOff, fromY, toX - cpOff, toY, toX, toY);
        ctx.stroke();
        ctx.restore();
      }

      // Gradient line from-field → to-field color
      const grad = ctx.createLinearGradient(fromX, fromY, toX, toY);
      grad.addColorStop(0, fromCfg.color + (isHighlighted ? 'cc' : '66'));
      grad.addColorStop(1, toCfg.color  + (isHighlighted ? 'cc' : '66'));

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.bezierCurveTo(fromX + cpOff, fromY, toX - cpOff, toY, toX, toY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
      ctx.stroke();

      // Small arrowhead at toX, toY
      const arrowSize = 7;
      // Approximate tangent direction at end of bezier
      const tx = toX - (toX - cpOff) * 0.01;
      const ty = toY - (toNode.y + this.NODE_HEIGHT / 2 - toY) * 0.01;
      const angle = Math.atan2(toY - (fromY + toY) / 2, toX - (fromX + toX) / 2);
      ctx.save();
      ctx.translate(toX, toY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-arrowSize, -arrowSize / 2);
      ctx.lineTo(-arrowSize, arrowSize / 2);
      ctx.closePath();
      ctx.fillStyle = toCfg.color + (isHighlighted ? 'dd' : '88');
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Render nodes as polished cards
   */
  private renderNodes(ctx: CanvasRenderingContext2D, now: number): void {
    const NW = this.NODE_WIDTH;
    const NH = this.NODE_HEIGHT;
    const R  = 8; // corner radius

    for (const [paperId, node] of this.nodes) {
      if (!this.shouldShowNode(node)) continue;

      const isSelected = paperId === this.selectedPaperId;
      const isHovered  = paperId === this.hoveredPaperId;
      const cfg = getFieldCfg(node.paper.field);
      const { x, y } = node;

      // ── Drop shadow
      ctx.save();
      ctx.shadowColor = isSelected ? 'rgba(255, 215, 0, 0.5)'
                      : isHovered  ? `${cfg.glow}`
                      : 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = isSelected ? 18 : isHovered ? 14 : 8;
      ctx.shadowOffsetY = 3;

      // ── Card background gradient
      const bgGrad = ctx.createLinearGradient(x, y, x, y + NH);
      if (node.status === 'published') {
        bgGrad.addColorStop(0, 'rgba(18, 24, 36, 0.97)');
        bgGrad.addColorStop(1, 'rgba(10, 14, 22, 0.97)');
      } else if (node.status === 'read') {
        bgGrad.addColorStop(0, 'rgba(16, 22, 40, 0.97)');
        bgGrad.addColorStop(1, 'rgba(8, 12, 28, 0.97)');
      } else {
        bgGrad.addColorStop(0, 'rgba(20, 18, 28, 0.88)');
        bgGrad.addColorStop(1, 'rgba(12, 10, 18, 0.88)');
      }

      ctx.beginPath();
      ctx.roundRect(x, y, NW, NH, R);
      ctx.fillStyle = bgGrad;
      ctx.fill();
      ctx.restore();

      // ── Border
      ctx.save();
      if (isSelected) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 300);
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        ctx.shadowBlur  = 12 + pulse * 8;
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.8 + pulse * 0.2})`;
        ctx.lineWidth = 2.5;
      } else if (isHovered) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 450);
        ctx.shadowColor = cfg.glow;
        ctx.shadowBlur  = 8 + pulse * 6;
        ctx.strokeStyle = cfg.color + 'cc';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = cfg.color + '44';
        ctx.lineWidth = 1;
      }
      ctx.beginPath();
      ctx.roundRect(x, y, NW, NH, R);
      ctx.stroke();
      ctx.restore();

      // ── Field-colored left accent bar
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y + R, 3, NH - R * 2, 1);
      ctx.fillStyle = cfg.color + 'cc';
      ctx.fill();
      ctx.restore();

      // ── Field emoji + title row
      const emoji = cfg.emoji;
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = '#e8e0f0';
      const maxTitleW = NW - 28;
      let title = node.paper.title;
      while (ctx.measureText(title).width > maxTitleW && title.length > 0) {
        title = title.slice(0, -1);
      }
      if (title.length < node.paper.title.length) title += '…';

      ctx.fillText(emoji, x + 10, y + 17);
      ctx.fillText(title, x + 24, y + 17);

      // ── Thin separator line
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 23);
      ctx.lineTo(x + NW - 10, y + 23);
      ctx.stroke();

      // ── Field label
      ctx.font = '9px Arial';
      ctx.fillStyle = cfg.color + 'cc';
      ctx.fillText(cfg.label, x + 10, y + 34);

      // ── Status badge
      this.renderStatusBadge(ctx, node, x + NW - 10, y + 34);

      // ── Author / location lines
      if (node.status === 'published') {
        ctx.font = '9px Arial';
        if (node.authorName) {
          ctx.fillStyle = '#b8a8d8'; // soft lavender
          ctx.fillText(`✍ ${node.authorName}`, x + 10, y + 52);
        }
        if (node.locationName) {
          ctx.fillStyle = '#d8a060'; // warm amber
          let loc = node.locationName;
          while (ctx.measureText(`📍 ${loc}`).width > maxTitleW && loc.length > 0) loc = loc.slice(0, -1);
          if (loc.length < node.locationName.length) loc += '…';
          ctx.fillText(`📍 ${loc}`, x + 10, y + 66);
        }
      } else {
        ctx.font = 'italic 9px Arial';
        ctx.fillStyle = 'rgba(180,170,200,0.5)';
        ctx.fillText('Not yet published', x + 10, y + 52);
      }

      // ── Prerequisite count badge (bottom-right)
      const prereqCount = node.paper.prerequisitePapers.length;
      if (prereqCount > 0) {
        const badgeX = x + NW - 12;
        const badgeY = y + NH - 12;
        ctx.font = '8px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.roundRect(badgeX - 16, badgeY - 9, 22, 12, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(200,180,240,0.6)';
        ctx.textAlign = 'center';
        ctx.fillText(`↖${prereqCount}`, badgeX - 5, badgeY);
        ctx.textAlign = 'left';
      }
    }
  }

  /**
   * Small pill status badge
   */
  private renderStatusBadge(
    ctx: CanvasRenderingContext2D,
    node: TechTreeNode,
    rightX: number,
    y: number
  ): void {
    let label: string;
    let bgColor: string;
    let textColor: string;

    switch (node.status) {
      case 'published':
        label = '✓ Published';
        bgColor = 'rgba(76, 175, 80, 0.2)';
        textColor = '#6ee87a';
        break;
      case 'read':
        label = '👁 Read';
        bgColor = 'rgba(64, 144, 232, 0.2)';
        textColor = '#70b8f8';
        break;
      default:
        label = '○ Pending';
        bgColor = 'rgba(120, 100, 160, 0.15)';
        textColor = 'rgba(200,180,240,0.5)';
    }

    ctx.font = '8px Arial';
    const tw = ctx.measureText(label).width;
    const ph = 11;
    const pw = tw + 8;
    const bx = rightX - pw;
    const by = y - 10;

    ctx.beginPath();
    ctx.roundRect(bx, by, pw, ph, 4);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.fillText(label, bx + 4, by + 8);
  }

  /**
   * Render UI overlay (filters, controls, etc.)
   */
  private renderOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, _now: number): void {
    const panelWidth  = 210;
    const panelX = width - panelWidth - 16;
    const panelY = 16;

    // Field filter buttons
    const fields = ['all', ...Object.keys(FIELD_CONFIG)] as Array<ResearchField | 'all'>;
    const btnH = 20;
    const gap  = 4;
    const panelHeight = 16 + (btnH + gap) * fields.length + 60 + 8;

    // Panel background
    const panelBg = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
    panelBg.addColorStop(0, 'rgba(20, 16, 36, 0.97)');
    panelBg.addColorStop(1, 'rgba(12, 10, 24, 0.97)');
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    ctx.fillStyle = panelBg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#d4c080';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('🔬 Research Fields', panelX + 10, panelY + 16);

    // Field buttons
    let fy = panelY + 26;
    for (const field of fields) {
      const isActive = this.selectedField === field;
      const cfg = field === 'all' ? { color: '#aaa', glow: 'rgba(180,180,180,0.3)', emoji: '📚', label: 'All Fields' }
                                  : getFieldCfg(field);

      ctx.beginPath();
      ctx.roundRect(panelX + 8, fy, panelWidth - 16, btnH, 5);
      if (isActive) {
        ctx.fillStyle = cfg.color + '33';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
      }
      ctx.fill();
      if (isActive) {
        ctx.strokeStyle = cfg.color + '88';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Color dot
      ctx.beginPath();
      ctx.arc(panelX + 18, fy + btnH / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = cfg.color;
      ctx.fill();

      ctx.font = '10px Arial';
      ctx.fillStyle = isActive ? '#fff' : 'rgba(200,190,220,0.75)';
      ctx.fillText(`${cfg.emoji} ${cfg.label}`, panelX + 27, fy + 14);

      fy += btnH + gap;
    }

    // Stats divider
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 10, fy + 4);
    ctx.lineTo(panelX + panelWidth - 10, fy + 4);
    ctx.stroke();
    fy += 14;

    // Paper counts
    const publishedCount = Array.from(this.nodes.values()).filter(n => n.status === 'published').length;
    ctx.font = '9px Arial';
    ctx.fillStyle = 'rgba(180,170,210,0.7)';
    ctx.fillText(`${this.nodes.size} papers total`, panelX + 10, fy);
    fy += 14;
    ctx.fillStyle = '#6ee87a';
    ctx.fillText(`✓ ${publishedCount} published`, panelX + 10, fy);
    fy += 14;

    // Controls hint
    ctx.font = '8px Arial';
    ctx.fillStyle = 'rgba(140,130,170,0.5)';
    ctx.fillText('Drag to pan  •  Scroll to zoom', panelX + 10, fy);
  }

  /**
   * Selected paper detail panel (bottom-left)
   */
  private renderDetailPanel(ctx: CanvasRenderingContext2D, node: TechTreeNode, _width: number, height: number): void {
    const cfg = getFieldCfg(node.paper.field);
    const pw = 320;
    const ph = 130;
    const px = 16;
    const py = height - ph - 16;

    // Background
    const bg = ctx.createLinearGradient(px, py, px, py + ph);
    bg.addColorStop(0, 'rgba(18, 14, 34, 0.98)');
    bg.addColorStop(1, 'rgba(10, 8, 22, 0.98)');
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.fillStyle = bg;
    ctx.fill();

    // Border with field color
    ctx.strokeStyle = cfg.color + '66';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.stroke();

    // Left accent bar
    ctx.fillStyle = cfg.color + 'bb';
    ctx.beginPath();
    ctx.roundRect(px, py + 8, 3, ph - 16, 2);
    ctx.fill();

    // Title
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#f0e8ff';
    ctx.fillText(`${cfg.emoji} ${node.paper.title}`, px + 12, py + 18);

    // Separator
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 12, py + 24);
    ctx.lineTo(px + pw - 12, py + 24);
    ctx.stroke();

    // Details grid
    let dy = py + 38;
    ctx.font = '10px Arial';

    if (node.paper.description) {
      ctx.fillStyle = 'rgba(200,190,220,0.8)';
      let desc = node.paper.description;
      if (desc.length > 80) desc = desc.slice(0, 77) + '…';
      ctx.fillText(desc, px + 12, dy);
      dy += 16;
    }

    if (node.authorName) {
      ctx.fillStyle = '#b8a8d8';
      ctx.fillText(`✍ Author: ${node.authorName}`, px + 12, dy);
      dy += 14;
    }

    if (node.locationName) {
      ctx.fillStyle = '#d8a060';
      ctx.fillText(`📍 Location: ${node.locationName}`, px + 12, dy);
      dy += 14;
    }

    const prereqs = node.paper.prerequisitePapers.length;
    ctx.fillStyle = 'rgba(180,170,210,0.6)';
    ctx.font = '9px Arial';
    const tier = node.paper.tier ?? node.paper.complexity ?? 1;
    ctx.fillText(`Tier ${tier}  •  Field: ${cfg.label}  •  Prerequisites: ${prereqs}`, px + 12, py + ph - 10);
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
    return getFieldCfg(field).color;
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
