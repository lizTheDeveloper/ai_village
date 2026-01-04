/**
 * PendingApprovalsPanel - Divine Approval Queue for LLM-generated creations
 *
 * Displays pending creations awaiting player approval.
 * Shows item name, creator, ingredients, and creativity score.
 * Allows approve/reject actions.
 *
 * Can be toggled with 'p' key or via divine powers panel.
 */

import { pendingApprovalRegistry, type PendingCreation } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

export interface ApprovalAction {
  type: 'approve' | 'reject';
  creationId: string;
}

export class PendingApprovalsPanel implements IWindowPanel {
  private visible: boolean = false;
  private scrollOffset: number = 0;
  private padding: number = 15;
  private selectedIndex: number = 0;
  private actionQueue: ApprovalAction[] = [];

  /**
   * Toggle panel visibility
   */

  getId(): string {
    return 'pending-approvals';
  }

  getTitle(): string {
    return 'Pending Approvals';
  }

  getDefaultWidth(): number {
    return 450;
  }

  getDefaultHeight(): number {
    return 550;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  toggle(): void {
    this.visible = !this.visible;
    if (this.visible) {
      this.scrollOffset = 0;
      this.selectedIndex = 0;
    }
  }

  /**
   * Show the panel
   */
  show(): void {
    this.visible = true;
    this.scrollOffset = 0;
    this.selectedIndex = 0;
  }

  /**
   * Hide the panel
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * Check if panel is visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Get pending creations count
   */
  getCount(): number {
    return pendingApprovalRegistry.count;
  }

  /**
   * Handle keyboard input
   */
  handleKey(key: string): boolean {
    if (!this.visible) return false;

    const creations = pendingApprovalRegistry.getAll();
    if (creations.length === 0) return true;

    switch (key) {
      case 'ArrowUp':
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        return true;
      case 'ArrowDown':
        this.selectedIndex = Math.min(creations.length - 1, this.selectedIndex + 1);
        return true;
      case 'Enter':
      case 'a': {
        // Approve selected
        const toApprove = creations[this.selectedIndex];
        if (toApprove) {
          this.approveCreation(toApprove.id);
        }
        return true;
      }
      case 'r':
      case 'Delete':
      case 'Backspace': {
        // Reject selected
        const toReject = creations[this.selectedIndex];
        if (toReject) {
          this.rejectCreation(toReject.id);
        }
        return true;
      }
      case 'Escape':
        this.hide();
        return true;
      default:
        return false;
    }
  }

  /**
   * Approve a creation
   */
  approveCreation(id: string): void {
    pendingApprovalRegistry.approve(id);
    // Adjust selection if needed
    const remaining = pendingApprovalRegistry.count;
    if (this.selectedIndex >= remaining) {
      this.selectedIndex = Math.max(0, remaining - 1);
    }
  }

  /**
   * Reject a creation
   */
  rejectCreation(id: string): void {
    pendingApprovalRegistry.reject(id);
    // Adjust selection if needed
    const remaining = pendingApprovalRegistry.count;
    if (this.selectedIndex >= remaining) {
      this.selectedIndex = Math.max(0, remaining - 1);
    }
  }

  /**
   * Get queued actions and clear the queue
   */
  flushActions(): ApprovalAction[] {
    const actions = [...this.actionQueue];
    this.actionQueue = [];
    return actions;
  }

  /**
   * Render the panel
   */
  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (!this.visible) return;

    const creations = pendingApprovalRegistry.getAll();

    // Panel dimensions
    const panelWidth = Math.min(500, screenWidth - 40);
    const panelHeight = Math.min(400, screenHeight - 40);
    const x = (screenWidth - panelWidth) / 2;
    const y = (screenHeight - panelHeight) / 2;

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
    ctx.fillRect(x, y, panelWidth, panelHeight);

    // Border
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, panelWidth, panelHeight);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Divine Approval Queue', x + panelWidth / 2, y + 25);

    // Subtitle with count
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '12px monospace';
    ctx.fillText(
      creations.length === 0
        ? 'No creations pending'
        : `${creations.length} creation${creations.length !== 1 ? 's' : ''} awaiting divine blessing`,
      x + panelWidth / 2,
      y + 45
    );

    ctx.textAlign = 'left';

    if (creations.length === 0) {
      // Empty state
      ctx.fillStyle = '#666666';
      ctx.font = '14px monospace';
      ctx.fillText(
        'When mortals create new recipes,',
        x + this.padding,
        y + 100
      );
      ctx.fillText(
        'they will appear here for your blessing.',
        x + this.padding,
        y + 120
      );
      ctx.fillText(
        'AI gods may auto-approve their followers.',
        x + this.padding,
        y + 150
      );
      return;
    }

    // Instructions
    ctx.fillStyle = '#888888';
    ctx.font = '11px monospace';
    ctx.fillText(
      '↑↓ Navigate | Enter/A Approve | R/Del Reject | Esc Close',
      x + this.padding,
      y + panelHeight - 10
    );

    // Content area
    const contentY = y + 60;
    const contentHeight = panelHeight - 90;
    const maxVisible = Math.floor(contentHeight / 80); // Each item is ~80px

    // Adjust scroll to keep selection visible
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + maxVisible) {
      this.scrollOffset = this.selectedIndex - maxVisible + 1;
    }

    // Render visible creations
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, contentY, panelWidth, contentHeight);
    ctx.clip();

    for (let i = 0; i < Math.min(maxVisible, creations.length - this.scrollOffset); i++) {
      const creation = creations[this.scrollOffset + i];
      if (!creation) continue;

      const itemY = contentY + i * 80;
      const isSelected = this.scrollOffset + i === this.selectedIndex;

      this.renderCreation(ctx, creation, x + this.padding, itemY, panelWidth - 2 * this.padding, isSelected);
    }

    ctx.restore();

    // Scroll indicators
    if (this.scrollOffset > 0) {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▲ more above', x + panelWidth / 2, contentY - 5);
    }
    if (this.scrollOffset + maxVisible < creations.length) {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▼ more below', x + panelWidth / 2, y + panelHeight - 25);
    }
    ctx.textAlign = 'left';
  }

  /**
   * Render a single creation item
   */
  private renderCreation(
    ctx: CanvasRenderingContext2D,
    creation: PendingCreation,
    x: number,
    y: number,
    width: number,
    isSelected: boolean
  ): void {
    // Selection highlight
    if (isSelected) {
      ctx.fillStyle = 'rgba(100, 80, 60, 0.5)';
      ctx.fillRect(x - 5, y, width + 10, 75);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 5, y, width + 10, 75);
    }

    // Item/Technology/Spell name based on creation type
    ctx.fillStyle = isSelected ? '#FFD700' : '#FFFFFF';
    ctx.font = 'bold 14px monospace';

    let displayName: string;
    let typeLabel: string;

    if (creation.creationType === 'recipe' && creation.item) {
      displayName = creation.item.displayName;
      typeLabel = creation.recipeType || 'recipe';
    } else if (creation.creationType === 'technology' && creation.technology) {
      displayName = creation.technology.name;
      typeLabel = 'technology';
    } else if (creation.creationType === 'effect' && creation.spell) {
      displayName = creation.spell.name;
      typeLabel = creation.discoveryType || 'spell';
    } else {
      displayName = 'Unknown Creation';
      typeLabel = creation.creationType || 'unknown';
    }

    ctx.fillText(displayName, x, y + 15);

    // Type badge
    ctx.fillStyle = this.getRecipeTypeColor(typeLabel);
    ctx.font = '10px monospace';
    ctx.fillText(`[${typeLabel}]`, x + ctx.measureText(displayName).width + 10, y + 15);

    // Creator
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '12px monospace';
    ctx.fillText(`Created by: ${creation.creatorName}`, x, y + 32);

    // Ingredients
    const ingredientStr = creation.ingredients
      .map(i => `${i.quantity}x ${i.itemId}`)
      .join(', ');
    ctx.fillStyle = '#888888';
    ctx.font = '11px monospace';
    const truncatedIngredients = ingredientStr.length > 50
      ? ingredientStr.substring(0, 47) + '...'
      : ingredientStr;
    ctx.fillText(`Ingredients: ${truncatedIngredients}`, x, y + 48);

    // Creativity score
    const creativityPct = Math.round(creation.creativityScore * 100);
    const creativityColor = creativityPct >= 80 ? '#00FF00' : creativityPct >= 50 ? '#FFFF00' : '#FF8800';
    ctx.fillStyle = creativityColor;
    ctx.font = '11px monospace';
    ctx.fillText(`Creativity: ${creativityPct}%`, x, y + 64);

    // Gift recipient if present
    if (creation.giftRecipient) {
      ctx.fillStyle = '#FF69B4';
      ctx.fillText(` (gift for ${creation.giftRecipient})`, x + 100, y + 64);
    }

    // Creation message (truncated)
    if (creation.creationMessage) {
      ctx.fillStyle = '#666666';
      ctx.font = 'italic 10px monospace';
      const truncatedMsg = creation.creationMessage.length > 60
        ? creation.creationMessage.substring(0, 57) + '...'
        : creation.creationMessage;
      ctx.fillText(`"${truncatedMsg}"`, x + 200, y + 64);
    }
  }

  /**
   * Get color for creation type
   */
  private getRecipeTypeColor(typeLabel: string): string {
    const colors: Record<string, string> = {
      // Recipe types
      food: '#90EE90',
      clothing: '#87CEEB',
      tool: '#DEB887',
      weapon: '#FF6347',
      armor: '#B0C4DE',
      potion: '#DA70D6',
      decoration: '#FFB6C1',
      furniture: '#D2B48C',
      material: '#C0C0C0',
      recipe: '#AAAAAA',
      // Technology types
      technology: '#00CED1',
      // Magic effect types
      spell: '#9370DB',
      new_spell: '#9370DB',
      variation: '#8A2BE2',
      insight: '#DDA0DD',
      // Default
      unknown: '#808080',
    };
    return colors[typeLabel] || '#FFFFFF';
  }
}
