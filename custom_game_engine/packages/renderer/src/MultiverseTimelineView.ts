/**
 * MultiverseTimelineView - Visual graph/timeline view of the multiverse
 *
 * Renders universes as horizontal timelines with:
 * - Snapshots as nodes along each timeline
 * - Fork branches connecting parent snapshots to child universes
 * - Canonical events highlighted with special styling
 * - Interactive selection and navigation
 */

import * as d3 from 'd3';

export interface TimelineUniverse {
  id: string;
  name: string;
  createdAt: number;
  forkOf?: {
    universeId: string;
    snapshotTick: number;
    universeName?: string;
  };
  snapshots: TimelineSnapshot[];
}

export interface TimelineSnapshot {
  tick: number;
  day: number;
  timestamp: number;
  type: 'auto' | 'manual' | 'canonical';
  canonEvent?: {
    type: string;
    title: string;
    description: string;
  };
}

export interface TimelineViewCallbacks {
  onSelectSnapshot: (universeId: string, snapshot: TimelineSnapshot) => void;
  onForkFromSnapshot: (universeId: string, snapshot: TimelineSnapshot) => void;
  onLoadUniverse: (universeId: string, snapshotTick?: number) => void;
}

interface LayoutNode {
  universe: TimelineUniverse;
  x: number;
  y: number;
  depth: number;
  children: LayoutNode[];
}

export class MultiverseTimelineView {
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private universes: TimelineUniverse[] = [];
  private callbacks: TimelineViewCallbacks;
  private selectedSnapshot: { universeId: string; tick: number } | null = null;

  // Layout constants
  private readonly TIMELINE_HEIGHT = 80;
  private readonly NODE_RADIUS = 8;
  private readonly CANONICAL_RADIUS = 12;
  private readonly MARGIN = { top: 40, right: 40, bottom: 40, left: 200 };
  private readonly MIN_WIDTH = 800;
  private readonly MIN_HEIGHT = 400;

  constructor(container: HTMLElement, callbacks: TimelineViewCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.setupContainer();
  }

  private setupContainer(): void {
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: auto;
      background: linear-gradient(135deg, #0a0a15 0%, #1a1a2e 100%);
      position: relative;
    `;

    // Create SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('class', 'multiverse-timeline')
      .style('min-width', `${this.MIN_WIDTH}px`)
      .style('min-height', `${this.MIN_HEIGHT}px`);

    // Add gradient definitions
    const defs = this.svg.append('defs');

    // Timeline gradient
    const timelineGradient = defs.append('linearGradient')
      .attr('id', 'timeline-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    timelineGradient.append('stop').attr('offset', '0%').attr('stop-color', '#667eea');
    timelineGradient.append('stop').attr('offset', '100%').attr('stop-color', '#764ba2');

    // Fork gradient
    const forkGradient = defs.append('linearGradient')
      .attr('id', 'fork-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    forkGradient.append('stop').attr('offset', '0%').attr('stop-color', '#8a6aaa');
    forkGradient.append('stop').attr('offset', '100%').attr('stop-color', '#6a4a8a');

    // Glow filter for canonical events
    const glow = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const glowMerge = glow.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'coloredBlur');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Add title
    this.svg.append('text')
      .attr('x', 20)
      .attr('y', 30)
      .attr('fill', '#888')
      .attr('font-family', 'monospace')
      .attr('font-size', '14px')
      .text('Multiverse Timeline');
  }

  /**
   * Update the visualization with new universe data
   */
  update(universes: TimelineUniverse[]): void {
    this.universes = universes;
    this.render();
  }

  /**
   * Render the multiverse graph
   */
  private render(): void {
    if (!this.svg) return;

    // Clear previous content (except defs and title)
    this.svg.selectAll('g.timeline-content').remove();
    this.svg.selectAll('g.empty-state').remove();

    // Handle empty state
    if (this.universes.length === 0) {
      this.svg
        .attr('width', this.MIN_WIDTH)
        .attr('height', this.MIN_HEIGHT);

      const emptyGroup = this.svg.append('g')
        .attr('class', 'empty-state')
        .attr('transform', `translate(${this.MIN_WIDTH / 2}, ${this.MIN_HEIGHT / 2})`);

      emptyGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-family', 'monospace')
        .attr('font-size', '48px')
        .attr('y', -20)
        .text('🌌');

      emptyGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', '#888')
        .attr('font-family', 'monospace')
        .attr('font-size', '16px')
        .attr('y', 20)
        .text('No universes yet');

      emptyGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-family', 'monospace')
        .attr('font-size', '12px')
        .attr('y', 45)
        .text('Create a new universe to begin your journey');

      return;
    }

    const contentGroup = this.svg.append('g')
      .attr('class', 'timeline-content')
      .attr('transform', `translate(${this.MARGIN.left}, ${this.MARGIN.top})`);

    // Build the layout tree
    const layout = this.buildLayout();

    // Calculate dimensions
    const maxDepth = this.getMaxDepth(layout);
    const width = Math.max(this.MIN_WIDTH, this.getMaxTimelineWidth() + this.MARGIN.left + this.MARGIN.right);
    const height = Math.max(this.MIN_HEIGHT, (maxDepth + 1) * this.TIMELINE_HEIGHT + this.MARGIN.top + this.MARGIN.bottom);

    this.svg
      .attr('width', width)
      .attr('height', height);

    // Render fork connections first (below everything)
    this.renderForkConnections(contentGroup, layout);

    // Render each universe timeline
    this.renderTimelines(contentGroup, layout);
  }

  /**
   * Build a hierarchical layout of universes based on fork relationships
   * Parent universes are placed above their forked children
   */
  private buildLayout(): LayoutNode[] {
    // Find root universes (not forked from anything)
    const rootUniverses = this.universes.filter(u => !u.forkOf);
    const roots: LayoutNode[] = [];
    let currentY = 0;

    // Sort roots by creation time (oldest first)
    rootUniverses.sort((a, b) => a.createdAt - b.createdAt);

    const buildNode = (universe: TimelineUniverse, depth: number): LayoutNode => {
      const y = currentY;
      currentY += this.TIMELINE_HEIGHT;

      const node: LayoutNode = {
        universe,
        x: 0,
        y,
        depth,
        children: [],
      };

      // Find children (universes forked from this one) and sort by fork tick
      const children = this.universes
        .filter(u => u.forkOf?.universeId === universe.id)
        .sort((a, b) => (a.forkOf?.snapshotTick || 0) - (b.forkOf?.snapshotTick || 0));

      // Children are placed IMMEDIATELY after parent (below it visually)
      for (const child of children) {
        node.children.push(buildNode(child, depth + 1));
      }

      return node;
    };

    for (const root of rootUniverses) {
      roots.push(buildNode(root, 0));
    }

    return roots;
  }

  /**
   * Get the maximum depth of the layout tree
   */
  private getMaxDepth(nodes: LayoutNode[]): number {
    let maxDepth = 0;
    const traverse = (node: LayoutNode) => {
      maxDepth = Math.max(maxDepth, node.depth);
      node.children.forEach(traverse);
    };
    nodes.forEach(traverse);
    return maxDepth;
  }

  /**
   * Calculate the maximum timeline width based on tick ranges
   */
  private getMaxTimelineWidth(): number {
    let maxTick = 0;
    for (const universe of this.universes) {
      for (const snapshot of universe.snapshots) {
        maxTick = Math.max(maxTick, snapshot.tick);
      }
    }
    // Scale: 1 tick = 0.5 pixels, minimum 600px
    return Math.max(600, maxTick * 0.5 + 100);
  }

  /**
   * Render fork connection lines
   */
  private renderForkConnections(container: d3.Selection<SVGGElement, unknown, null, undefined>, layout: LayoutNode[]): void {
    const connections: Array<{ parent: LayoutNode; child: LayoutNode; forkTick: number }> = [];

    const collectConnections = (nodes: LayoutNode[]) => {
      for (const node of nodes) {
        for (const child of node.children) {
          connections.push({
            parent: node,
            child,
            forkTick: child.universe.forkOf?.snapshotTick || 0,
          });
        }
        collectConnections(node.children);
      }
    };
    collectConnections(layout);

    // Draw curved connections
    const connectionGroup = container.append('g').attr('class', 'fork-connections');

    for (const conn of connections) {
      const forkX = this.tickToX(conn.forkTick);
      const parentY = conn.parent.y + this.TIMELINE_HEIGHT / 2;
      const childY = conn.child.y + this.TIMELINE_HEIGHT / 2;

      // Child timeline starts at the fork point (horizontally aligned)
      const childStartX = forkX;

      // Draw curved path from parent's fork point DOWN to child timeline
      const path = d3.path();
      path.moveTo(forkX, parentY);

      // Vertical distance for the curve
      const verticalDist = childY - parentY;

      // Simple curve that goes DOWN then levels out
      path.bezierCurveTo(
        forkX, parentY + verticalDist * 0.5,       // Control point 1: straight down
        childStartX - 30, childY,                   // Control point 2: approach from left
        childStartX, childY                         // End point: child timeline start
      );

      connectionGroup.append('path')
        .attr('d', path.toString())
        .attr('fill', 'none')
        .attr('stroke', 'url(#fork-gradient)')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '8,4')
        .attr('opacity', 0.7);

      // Add fork indicator circle at the branch point on parent
      connectionGroup.append('circle')
        .attr('cx', forkX)
        .attr('cy', parentY)
        .attr('r', 6)
        .attr('fill', '#8a6aaa')
        .attr('stroke', '#c8a8e8')
        .attr('stroke-width', 2);

      // Add small arrow or indicator at child connection
      connectionGroup.append('circle')
        .attr('cx', childStartX)
        .attr('cy', childY)
        .attr('r', 4)
        .attr('fill', '#6a8aaa')
        .attr('stroke', '#a8c8e8')
        .attr('stroke-width', 1);
    }
  }

  /**
   * Render universe timelines
   */
  private renderTimelines(container: d3.Selection<SVGGElement, unknown, null, undefined>, layout: LayoutNode[]): void {
    const allNodes: LayoutNode[] = [];
    const collectNodes = (nodes: LayoutNode[]) => {
      for (const node of nodes) {
        allNodes.push(node);
        collectNodes(node.children);
      }
    };
    collectNodes(layout);

    for (const node of allNodes) {
      this.renderSingleTimeline(container, node);
    }
  }

  /**
   * Render a single universe timeline
   */
  private renderSingleTimeline(container: d3.Selection<SVGGElement, unknown, null, undefined>, node: LayoutNode): void {
    const universe = node.universe;
    const y = node.y + this.TIMELINE_HEIGHT / 2;
    const isFork = !!universe.forkOf;
    const forkTick = universe.forkOf?.snapshotTick || 0;

    // Sort snapshots by tick
    const snapshots = [...universe.snapshots].sort((a, b) => a.tick - b.tick);
    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];
    const minTick = firstSnapshot?.tick ?? 0;
    const maxTick = lastSnapshot?.tick ?? 100;

    // For forked universes, start timeline at the fork point
    const timelineStart = isFork ? forkTick : minTick;

    const timelineGroup = container.append('g')
      .attr('class', `timeline-${universe.id}`)
      .attr('transform', `translate(0, 0)`);

    // Universe label - position at the start of the timeline for forks
    const labelX = isFork ? this.tickToX(forkTick) - 10 : -10;
    timelineGroup.append('text')
      .attr('x', labelX)
      .attr('y', y + 5)
      .attr('text-anchor', 'end')
      .attr('fill', isFork ? '#c8a8e8' : '#fff')
      .attr('font-family', 'monospace')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(this.truncateName(universe.name, 20))
      .style('cursor', 'pointer')
      .on('click', () => this.callbacks.onLoadUniverse(universe.id));

    // Fork indicator
    if (isFork) {
      timelineGroup.append('text')
        .attr('x', labelX)
        .attr('y', y + 18)
        .attr('text-anchor', 'end')
        .attr('fill', '#888')
        .attr('font-family', 'monospace')
        .attr('font-size', '9px')
        .text(`forked @ tick ${forkTick}`);
    }

    // Timeline base line - starts at fork point for forked universes
    const startX = this.tickToX(timelineStart);
    const endX = this.tickToX(maxTick) + 40;

    timelineGroup.append('line')
      .attr('x1', startX)
      .attr('y1', y)
      .attr('x2', endX)
      .attr('y2', y)
      .attr('stroke', isFork ? 'url(#fork-gradient)' : 'url(#timeline-gradient)')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('opacity', isFork ? 0.7 : 0.6);

    // Day markers along the timeline
    const days = new Set(snapshots.map(s => s.day));
    for (const day of days) {
      const daySnapshots = snapshots.filter(s => s.day === day);
      const firstDaySnapshot = daySnapshots[0];
      if (firstDaySnapshot) {
        const x = this.tickToX(firstDaySnapshot.tick);
        timelineGroup.append('text')
          .attr('x', x)
          .attr('y', y + 25)
          .attr('text-anchor', 'middle')
          .attr('fill', '#555')
          .attr('font-family', 'monospace')
          .attr('font-size', '9px')
          .text(`D${day}`);
      }
    }

    // Render snapshot nodes
    for (const snapshot of snapshots) {
      this.renderSnapshotNode(timelineGroup, universe, snapshot, y);
    }
  }

  /**
   * Render a single snapshot node
   */
  private renderSnapshotNode(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    universe: TimelineUniverse,
    snapshot: TimelineSnapshot,
    y: number
  ): void {
    const x = this.tickToX(snapshot.tick);
    const isCanonical = snapshot.type === 'canonical';
    const isSelected = this.selectedSnapshot?.universeId === universe.id &&
                       this.selectedSnapshot?.tick === snapshot.tick;
    const radius = isCanonical ? this.CANONICAL_RADIUS : this.NODE_RADIUS;

    const nodeGroup = container.append('g')
      .attr('class', 'snapshot-node')
      .attr('transform', `translate(${x}, ${y})`)
      .style('cursor', 'pointer');

    // Node circle
    const circle = nodeGroup.append('circle')
      .attr('r', radius)
      .attr('fill', this.getNodeColor(snapshot))
      .attr('stroke', isSelected ? '#fff' : this.getNodeStrokeColor(snapshot))
      .attr('stroke-width', isSelected ? 3 : 2);

    if (isCanonical) {
      circle.attr('filter', 'url(#glow)');
    }

    // Canonical event star icon
    if (isCanonical) {
      nodeGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', '#000')
        .attr('font-size', '10px')
        .text('★');
    }

    // Tooltip on hover
    const tooltip = this.createTooltip(nodeGroup, universe, snapshot);

    nodeGroup
      .on('mouseenter', () => {
        circle.attr('r', radius + 3);
        tooltip.style('opacity', 1);
      })
      .on('mouseleave', () => {
        circle.attr('r', radius);
        tooltip.style('opacity', 0);
      })
      .on('click', () => {
        this.selectedSnapshot = { universeId: universe.id, tick: snapshot.tick };
        this.callbacks.onSelectSnapshot(universe.id, snapshot);
        this.render();
      })
      .on('dblclick', () => {
        this.callbacks.onLoadUniverse(universe.id, snapshot.tick);
      })
      .on('contextmenu', (event: MouseEvent) => {
        event.preventDefault();
        if (isCanonical) {
          this.callbacks.onForkFromSnapshot(universe.id, snapshot);
        }
      });
  }

  /**
   * Create tooltip for a snapshot node
   */
  private createTooltip(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    universe: TimelineUniverse,
    snapshot: TimelineSnapshot
  ): d3.Selection<SVGGElement, unknown, null, undefined> {
    const tooltip = container.append('g')
      .attr('class', 'tooltip')
      .attr('transform', 'translate(0, -50)')
      .style('opacity', 0)
      .style('pointer-events', 'none');

    const isCanonical = snapshot.type === 'canonical';
    const title = isCanonical && snapshot.canonEvent
      ? snapshot.canonEvent.title
      : `${snapshot.type === 'auto' ? 'Auto' : 'Manual'} Save`;

    const lines = [
      title,
      `Day ${snapshot.day} • Tick ${snapshot.tick}`,
      new Date(snapshot.timestamp).toLocaleString(),
    ];

    if (isCanonical && snapshot.canonEvent?.description) {
      lines.push(snapshot.canonEvent.description.substring(0, 40) + '...');
    }

    const padding = 8;
    const lineHeight = 14;
    const width = Math.max(...lines.map(l => l.length * 7)) + padding * 2;
    const height = lines.length * lineHeight + padding * 2;

    tooltip.append('rect')
      .attr('x', -width / 2)
      .attr('y', -height)
      .attr('width', width)
      .attr('height', height)
      .attr('rx', 6)
      .attr('fill', 'rgba(0, 0, 0, 0.9)')
      .attr('stroke', isCanonical ? '#ffc107' : '#667eea')
      .attr('stroke-width', 1);

    lines.forEach((line, i) => {
      tooltip.append('text')
        .attr('x', 0)
        .attr('y', -height + padding + (i + 1) * lineHeight - 2)
        .attr('text-anchor', 'middle')
        .attr('fill', i === 0 ? (isCanonical ? '#ffc107' : '#fff') : '#aaa')
        .attr('font-family', 'monospace')
        .attr('font-size', i === 0 ? '11px' : '9px')
        .attr('font-weight', i === 0 ? 'bold' : 'normal')
        .text(line);
    });

    return tooltip;
  }

  /**
   * Get fill color for a snapshot node
   */
  private getNodeColor(snapshot: TimelineSnapshot): string {
    switch (snapshot.type) {
      case 'canonical': return '#ffc107';
      case 'manual': return '#4CAF50';
      case 'auto': return '#667eea';
      default: return '#888';
    }
  }

  /**
   * Get stroke color for a snapshot node
   */
  private getNodeStrokeColor(snapshot: TimelineSnapshot): string {
    switch (snapshot.type) {
      case 'canonical': return '#ff9800';
      case 'manual': return '#388E3C';
      case 'auto': return '#764ba2';
      default: return '#666';
    }
  }

  /**
   * Convert tick to X coordinate
   */
  private tickToX(tick: number): number {
    // Scale: roughly 0.5 pixels per tick
    return tick * 0.5;
  }

  /**
   * Truncate name with ellipsis
   */
  private truncateName(name: string, maxLen: number): string {
    if (name.length <= maxLen) return name;
    return name.substring(0, maxLen - 3) + '...';
  }

  /**
   * Destroy the view
   */
  destroy(): void {
    if (this.svg) {
      this.svg.remove();
      this.svg = null;
    }
  }
}
