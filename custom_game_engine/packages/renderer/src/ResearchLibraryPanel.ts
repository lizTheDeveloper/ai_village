/**
 * ResearchLibraryPanel - UI panel for viewing discovered research papers
 *
 * Per openspec/specs/ui/research-interface.md:
 * - Shows ONLY discovered papers (no locked/undiscovered papers)
 * - Groups papers by research field
 * - Shows paper status: available, in_progress, completed
 * - NO progress bars toward unlocks
 * - NO "X of Y" counters
 * - Papers connect organically through prerequisites
 */

import type { IWindowPanel } from './types/WindowTypes.js';
import type { World } from '@ai-village/core';
import type { ResearchStateComponent } from '@ai-village/core';
import type { ResearchField } from '@ai-village/world';
import { getPaper } from '@ai-village/world';

interface PaperUI {
  paperId: string;
  title: string;
  field: ResearchField;
  complexity: number;
  status: 'available' | 'in_progress' | 'completed';
  progress: number; // 0-1 for in_progress papers
}

export class ResearchLibraryPanel implements IWindowPanel {
  private visible = false;
  private scrollOffset = 0;
  private selectedField: ResearchField | 'all' = 'all';
  private searchQuery = '';
  private sortBy: 'field' | 'complexity' | 'recent' = 'field';
  private readonly padding = 12;
  private readonly cardWidth = 110;
  private readonly cardHeight = 100;
  private readonly cardsPerRow = 3;

  constructor() {}

  getId(): string {
    return 'research-library';
  }

  getTitle(): string {
    return '📚 Research Library';
  }

  getDefaultWidth(): number {
    return 380;
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

  /**
   * Get discovered papers from world's research state
   */
  private getDiscoveredPapers(world: World): PaperUI[] {
    const worldEntity = world.query().with('time').executeEntities()[0];
    if (!worldEntity) return [];

    const researchState = worldEntity.components.get('research_state') as ResearchStateComponent | undefined;
    if (!researchState) return [];

    const papers: PaperUI[] = [];

    // Get all discovered paper IDs from research state
    const discoveredIds = new Set([
      ...Array.from(researchState.completed),
      ...Array.from(researchState.inProgress.keys()),
      // Papers that are available (prerequisites met) but not yet started
      // For now, we'll show completed + in_progress only
    ]);

    for (const paperId of discoveredIds) {
      const paper = getPaper(paperId);
      if (!paper) continue;

      const progress = researchState.inProgress.get(paperId);
      const isCompleted = researchState.completed.has(paperId);

      papers.push({
        paperId: paper.paperId,
        title: paper.title,
        field: paper.field,
        complexity: paper.complexity ?? paper.tier ?? 1,
        status: isCompleted ? 'completed' : progress ? 'in_progress' : 'available',
        progress: progress ? progress.currentProgress : 0,
      });
    }

    return papers;
  }

  /**
   * Filter papers by selected field and search query
   */
  private filterPapers(papers: PaperUI[]): PaperUI[] {
    let filtered = papers;

    // Filter by field
    if (this.selectedField !== 'all') {
      filtered = filtered.filter(p => p.field === this.selectedField);
    }

    // Filter by search query
    if (this.searchQuery.trim().length > 0) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.field.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  /**
   * Sort papers by selected criteria
   */
  private sortPapers(papers: PaperUI[]): PaperUI[] {
    return [...papers].sort((a, b) => {
      switch (this.sortBy) {
        case 'field':
          return a.field.localeCompare(b.field) || a.title.localeCompare(b.title);
        case 'complexity':
          return b.complexity - a.complexity || a.title.localeCompare(b.title);
        case 'recent':
          // Put in_progress first, then available, then completed
          const statusOrder = { in_progress: 0, available: 1, completed: 2 };
          return statusOrder[a.status] - statusOrder[b.status] || a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }

  /**
   * Get color for research field
   */
  private getFieldColor(field: ResearchField): string {
    const fieldColors: Record<string, string> = {
      nature: '#4CAF50',
      alchemy: '#9C27B0',
      cuisine: '#FF9800',
      construction: '#795548',
      engineering: '#2196F3',
      arcane: '#673AB7',
      physics: '#90A4AE',
      mathematics: '#00BCD4',
    };
    return fieldColors[field] || '#666';
  }

  /**
   * Get icon for paper status
   */
  private getStatusIcon(status: PaperUI['status']): string {
    switch (status) {
      case 'available':
        return '📜';
      case 'in_progress':
        return '📖';
      case 'completed':
        return '✓';
    }
  }

  /**
   * Render a paper card
   */
  private renderPaperCard(
    ctx: CanvasRenderingContext2D,
    paper: PaperUI,
    x: number,
    y: number
  ): void {
    // Card background
    ctx.fillStyle = paper.status === 'completed' ? 'rgba(60, 60, 60, 0.5)' : 'rgba(40, 30, 20, 0.9)';
    ctx.fillRect(x, y, this.cardWidth, this.cardHeight);

    // Border
    ctx.strokeStyle = this.getFieldColor(paper.field);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.cardWidth, this.cardHeight);

    // Status icon
    ctx.font = '20px Arial';
    ctx.fillText(this.getStatusIcon(paper.status), x + 8, y + 28);

    // Title (truncated)
    ctx.font = '11px Arial';
    ctx.fillStyle = paper.status === 'completed' ? '#999' : '#FFF';
    const maxTitleWidth = this.cardWidth - 16;
    let title = paper.title;
    if (ctx.measureText(title).width > maxTitleWidth) {
      while (ctx.measureText(title + '...').width > maxTitleWidth && title.length > 0) {
        title = title.slice(0, -1);
      }
      title += '...';
    }
    ctx.fillText(title, x + 8, y + 48);

    // Field name
    ctx.font = '9px Arial';
    ctx.fillStyle = this.getFieldColor(paper.field);
    ctx.fillText(paper.field, x + 8, y + 62);

    // Complexity stars
    const stars = '⭐'.repeat(Math.min(paper.complexity, 5));
    ctx.fillText(stars, x + 8, y + 76);

    // Progress bar for in_progress papers
    if (paper.status === 'in_progress') {
      const barY = y + this.cardHeight - 12;
      const barWidth = this.cardWidth - 16;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x + 8, barY, barWidth, 6);
      ctx.fillStyle = this.getFieldColor(paper.field);
      ctx.fillRect(x + 8, barY, barWidth * paper.progress, 6);
    }
  }

  /**
   * Render the panel
   */
  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    world?: World
  ): void {
    if (!this.visible || !world) {
      return;
    }

    const papers = this.getDiscoveredPapers(world);
    const filteredPapers = this.filterPapers(papers);
    const sortedPapers = this.sortPapers(filteredPapers);

    let currentY = this.padding;

    // Header
    ctx.fillStyle = '#00CED1';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('RESEARCH LIBRARY', this.padding, currentY + 14);
    currentY += 24;

    // Paper count
    ctx.fillStyle = '#999';
    ctx.font = '11px Arial';
    ctx.fillText(`Discovered papers: ${papers.length}`, this.padding, currentY + 12);
    currentY += 20;

    // Filter/Sort controls
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.fillText('Sort:', this.padding, currentY + 10);

    type SortBy = typeof this.sortBy;
    const sortOptions: Array<{ key: SortBy; label: string }> = [
      { key: 'field', label: 'Field' },
      { key: 'complexity', label: 'Complexity' },
      { key: 'recent', label: 'Recent' },
    ];

    let sortX = this.padding + 40;
    sortOptions.forEach(opt => {
      const isActive = this.sortBy === opt.key;
      ctx.fillStyle = isActive ? '#FFD700' : '#666';
      ctx.fillText(opt.label, sortX, currentY + 10);
      sortX += 80;
    });
    currentY += 20;

    // Divider
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.padding, currentY);
    ctx.lineTo(width - this.padding, currentY);
    ctx.stroke();
    currentY += 12;

    // Empty state
    if (sortedPapers.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '12px Arial';
      ctx.fillText('No papers discovered yet', this.padding, currentY + 20);
      ctx.fillText('Complete research to discover papers!', this.padding, currentY + 40);
      return;
    }

    // Render paper cards in grid
    let cardX = this.padding;
    let cardY = currentY;
    let cardsInRow = 0;

    const visibleAreaHeight = height - currentY;
    const startIdx = Math.floor(this.scrollOffset);

    for (let i = startIdx; i < sortedPapers.length; i++) {
      const paper = sortedPapers[i]!;

      // Check if card fits in visible area
      if (cardY + this.cardHeight > currentY + visibleAreaHeight) {
        break;
      }

      this.renderPaperCard(ctx, paper, cardX, cardY);

      cardsInRow++;
      if (cardsInRow >= this.cardsPerRow) {
        cardsInRow = 0;
        cardX = this.padding;
        cardY += this.cardHeight + 8;
      } else {
        cardX += this.cardWidth + 8;
      }
    }
  }

  /**
   * Handle mouse wheel for scrolling
   */
  handleWheel(deltaY: number): void {
    this.scrollOffset = Math.max(0, this.scrollOffset + deltaY * 0.001);
  }

  /**
   * Handle click to change sort order
   */
  handleClick(x: number, y: number): void {
    // Check if click is in sort controls area
    const sortY = this.padding + 24 + 20;
    if (y >= sortY && y <= sortY + 12) {
      const sortX = this.padding + 40;
      if (x >= sortX && x < sortX + 80) {
        this.sortBy = 'field';
      } else if (x >= sortX + 80 && x < sortX + 160) {
        this.sortBy = 'complexity';
      } else if (x >= sortX + 160 && x < sortX + 240) {
        this.sortBy = 'recent';
      }
    }
  }
}
