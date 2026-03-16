import type {
  Entity,
  World,
  IdentityComponent,
  SocialMemoryComponent,
  SocialMemory,
  Relationship,
} from '@ai-village/core';

// Local type for verification record
interface VerificationInfo {
  result: string;
}
import { RelationshipComponent, TrustNetworkComponent } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';
import { devActionsService } from './services/DevActionsService.js';

/**
 * Click region for interactive relationship editing
 */
interface ClickRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'trust_up' | 'trust_down' | 'sentiment_up' | 'sentiment_down' | 'familiarity_up' | 'familiarity_down';
  targetId: string;
}

/**
 * UI Panel displaying relationship information for the selected agent.
 * Shows social memory, trust networks, and familiarity data.
 * Toggle with 'R' key.
 */
export class RelationshipsPanel implements IWindowPanel {
  private selectedEntityId: string | null = null;
  private visible: boolean = false;
  private panelWidth = 380;
  private panelHeight = 500;
  private padding = 12;
  private lineHeight = 16;
  private scrollOffset = 0;
  private maxScrollOffset = 0;

  // Click regions for editing
  private clickRegions: ClickRegion[] = [];
  private devMode = true; // Enable dev editing mode

  /**
   * Set the currently selected agent entity.
   */

  getId(): string {
    return 'relationships';
  }

  getTitle(): string {
    return 'Relationships';
  }

  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 500;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  setSelectedEntity(entity: Entity | null): void {
    this.selectedEntityId = entity ? entity.id : null;
    this.scrollOffset = 0; // Reset scroll on entity change
  }

  /**
   * Toggle panel visibility.
   */
  toggle(): void {
    this.visible = !this.visible;
  }

  /**
   * Check if panel is visible.
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Handle scroll events
   */
  handleScroll(deltaY: number, _contentHeight: number): boolean {
    const scrollAmount = deltaY > 0 ? 30 : -30;
    this.scrollOffset = Math.max(0, Math.min(this.maxScrollOffset, this.scrollOffset + scrollAmount));
    return true;
  }

  /**
   * Handle click events for relationship editing
   */
  handleClick(clickX: number, clickY: number): boolean {
    if (!this.devMode || !this.selectedEntityId) {
      return false;
    }

    // Adjust for scroll offset
    const adjustedY = clickY + this.scrollOffset;

    for (const region of this.clickRegions) {
      if (
        clickX >= region.x &&
        clickX <= region.x + region.width &&
        adjustedY >= region.y &&
        adjustedY <= region.y + region.height
      ) {
        return this.executeAction(region);
      }
    }

    return false;
  }

  /**
   * Execute the action for a clicked region
   */
  private executeAction(region: ClickRegion): boolean {
    if (!this.selectedEntityId) return false;

    const step = 0.1; // 10% increment

    switch (region.action) {
      case 'trust_up':
        this.adjustSocialMemoryField(region.targetId, 'trust', step);
        return true;

      case 'trust_down':
        this.adjustSocialMemoryField(region.targetId, 'trust', -step);
        return true;

      case 'sentiment_up':
        this.adjustSocialMemoryField(region.targetId, 'overallSentiment', step);
        return true;

      case 'sentiment_down':
        this.adjustSocialMemoryField(region.targetId, 'overallSentiment', -step);
        return true;

      case 'familiarity_up':
        this.adjustFamiliarity(region.targetId, 10); // 10% increment
        return true;

      case 'familiarity_down':
        this.adjustFamiliarity(region.targetId, -10);
        return true;

      default:
        return false;
    }
  }

  /**
   * Adjust a field in social memory for a target agent
   */
  private adjustSocialMemoryField(targetId: string, field: string, delta: number): void {
    const world = devActionsService.getWorld();
    if (!world || !this.selectedEntityId) return;

    const entity = world.getEntity(this.selectedEntityId);
    if (!entity) return;

    const socialMemory = entity.components.get('social_memory') as SocialMemoryComponent | undefined;
    if (!socialMemory) return;

    const targetMemory = socialMemory.getSocialMemory(targetId);
    if (!targetMemory) return;

    // Create updated memory with adjusted field (clamped)
    if (field === 'trust') {
      const newTrust = Math.max(0, Math.min(1, targetMemory.trust + delta));
      socialMemory.updateSocialMemory(targetId, { trust: newTrust });
    } else if (field === 'overallSentiment') {
      const newSentiment = Math.max(-1, Math.min(1, targetMemory.overallSentiment + delta));
      socialMemory.updateSocialMemory(targetId, { overallSentiment: newSentiment });
    }
  }

  /**
   * Adjust familiarity for a target agent
   */
  private adjustFamiliarity(targetId: string, delta: number): void {
    const world = devActionsService.getWorld();
    if (!world || !this.selectedEntityId) return;

    const entity = world.getEntity(this.selectedEntityId);
    if (!entity) return;

    const relationship = entity.components.get('relationship') as RelationshipComponent | undefined;
    if (!relationship) return;

    const relationships = relationship.relationships;
    const targetRel = relationships.get(targetId) as Relationship | undefined;
    if (!targetRel) return;

    targetRel.familiarity = Math.max(0, Math.min(100, targetRel.familiarity + delta));
  }

  /**
   * Draw the dark gradient panel background.
   */
  private renderPanelBackground(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const grad = ctx.createLinearGradient(x, y, x, y + this.panelHeight);
    grad.addColorStop(0, 'rgba(12,8,28,1)');
    grad.addColorStop(1, 'rgba(6,4,18,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, this.panelWidth, this.panelHeight);
  }

  /**
   * Draw the scrollbar on the right edge.
   */
  private renderScrollbar(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    if (this.maxScrollOffset <= 0) return;

    const sbWidth = 4;
    const sbX = x + this.panelWidth - sbWidth - 2;
    const totalContent = this.panelHeight + this.maxScrollOffset;
    const thumbRatio = this.panelHeight / totalContent;
    const trackHeight = this.panelHeight - 20; // leave room for help text
    const thumbHeight = Math.max(20, Math.round(trackHeight * thumbRatio));
    const thumbTop = y + Math.round((this.scrollOffset / totalContent) * trackHeight);

    // Track
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
      .roundRect(sbX, y, sbWidth, trackHeight, 2);
    ctx.fill();

    // Thumb
    ctx.fillStyle = 'rgba(150,120,220,0.55)';
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
      .roundRect(sbX, thumbTop, sbWidth, thumbHeight, 2);
    ctx.fill();
  }

  /**
   * Render a gradient separator line (fades in from left, fades out to right).
   */
  private renderSeparator(ctx: CanvasRenderingContext2D, panelX: number, y: number): void {
    const x0 = panelX + this.padding;
    const x1 = panelX + this.panelWidth - this.padding;
    const grad = ctx.createLinearGradient(x0, y, x1, y);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.15, 'rgba(255,255,255,0.25)');
    grad.addColorStop(0.85, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }

  /**
   * Render a section header card with a colored left accent bar.
   */
  private renderSectionHeader(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    label: string,
    accentColor: string
  ): void {
    const cardX = panelX + this.padding;
    const cardW = this.panelWidth - this.padding * 2;
    const cardH = 22;

    // Card gradient background
    const grad = ctx.createLinearGradient(cardX, y, cardX + cardW, y);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(1, 'rgba(255,255,255,0.01)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
      .roundRect(cardX, y, cardW, cardH, 3);
    ctx.fill();

    // Left accent bar
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
      .roundRect(cardX, y, 3, cardH, 2);
    ctx.fill();

    // Label
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(label, cardX + 10, y + 15);
  }

  /**
   * Render a styled horizontal bar (trust or sentiment).
   * @param value 0..1
   * @param colorStart gradient start color (css string)
   * @param colorEnd gradient end color (css string)
   */
  private renderStatBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    value: number,
    colorStart: string,
    colorEnd: string,
    label: string
  ): void {
    const barW = 120;
    const barH = 10;
    const fillW = Math.round(value * barW);

    // Dark rounded background
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
      .roundRect(x, y, barW, barH, 3);
    ctx.fill();

    // Gradient fill
    if (fillW > 0) {
      const grad = ctx.createLinearGradient(x, y, x + barW, y);
      grad.addColorStop(0, colorStart);
      grad.addColorStop(1, colorEnd);
      ctx.fillStyle = grad;
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
        .roundRect(x, y, fillW, barH, 3);
      ctx.fill();
    }

    // Percentage label overlaid at bar end
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(label, x + barW - 2, y + barH - 1);
    ctx.textAlign = 'left';
  }

  /**
   * Render a relationship type badge (pill).
   */
  private renderTypeBadge(ctx: CanvasRenderingContext2D, x: number, y: number, type: string): void {
    const badgeColors: Record<string, { bg: string; text: string }> = {
      ally:     { bg: 'rgba(80,220,160,0.25)', text: '#80FFCC' },
      rival:    { bg: 'rgba(220,80,80,0.25)',  text: '#FF9999' },
      friend:   { bg: 'rgba(100,180,255,0.25)', text: '#AADDFF' },
      enemy:    { bg: 'rgba(180,40,40,0.35)',  text: '#FF6666' },
      neutral:  { bg: 'rgba(160,160,160,0.18)', text: '#CCCCCC' },
      stranger: { bg: 'rgba(120,120,140,0.18)', text: '#AAAACC' },
    };
    const colors = badgeColors[type.toLowerCase()] ?? { bg: 'rgba(100,100,120,0.25)', text: '#BBBBCC' };

    ctx.font = '10px monospace';
    const textW = ctx.measureText(type).width;
    const padH = 5;
    const padV = 3;
    const badgeW = textW + padH * 2;
    const badgeH = 14;

    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
      .roundRect(x, y - badgeH + padV, badgeW, badgeH, 5);
    ctx.fill();

    ctx.fillStyle = colors.text;
    ctx.fillText(type, x + padH, y);
  }

  /**
   * Render a filled circle trust indicator with optional glow.
   */
  private renderTrustIndicator(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    score: number
  ): void {
    const radius = 6;
    const color = score >= 0.7 ? '#88FF88' : score >= 0.4 ? '#FFFF88' : '#FF8888';
    const glowColor = score >= 0.7 ? 'rgba(136,255,136,0.35)' : score >= 0.4 ? 'rgba(255,255,136,0.35)' : 'rgba(255,136,136,0.35)';

    // Glow
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  /**
   * Render a small edit button with roundRect corners.
   */
  private renderEditButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string,
    color: string
  ): void {
    ctx.fillStyle = 'rgba(30, 20, 50, 0.85)';
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
      .roundRect(x, y, 16, 14, 3);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
      .roundRect(x, y, 16, 14, 3);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + 8, y + 11);
    ctx.textAlign = 'left';
  }

  /**
   * Render the relationships panel.
   */
  render(ctx: CanvasRenderingContext2D, _x: number, _y: number, _width: number, _height: number, world?: any): void {
    // Clear click regions at the start of each render
    this.clickRegions = [];

    if (!this.visible || !this.selectedEntityId) {
      return;
    }

    if (!world || typeof world.getEntity !== 'function') {
      console.warn('[RelationshipsPanel] World not available');
      return;
    }

    // Set world on devActionsService for mutations
    devActionsService.setWorld(world);

    const selectedEntity = world.getEntity(this.selectedEntityId);
    if (!selectedEntity) {
      this.selectedEntityId = null;
      return;
    }

    const x = 0;
    const y = 0;

    // Draw dark gradient panel background (outside clip/scroll)
    this.renderPanelBackground(ctx, x, y);

    // Get components
    const identity = selectedEntity.components.get('identity') as IdentityComponent | undefined;
    const socialMemory = selectedEntity.components.get('social_memory') as SocialMemoryComponent | undefined;
    const relationship = selectedEntity.components.get('relationship') as RelationshipComponent | undefined;
    const trustNetwork = selectedEntity.components.get('trust_network') as TrustNetworkComponent | undefined;

    // Save context for clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, this.panelWidth, this.panelHeight);
    ctx.clip();

    // Apply scroll offset
    ctx.translate(0, -this.scrollOffset);

    let currentY = y + this.padding;
    const startY = currentY;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Relationships', x + this.padding, currentY + 14);
    currentY += 26;

    // Agent name
    if (identity?.name) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`Agent: ${identity.name}`, x + this.padding, currentY);
      currentY += this.lineHeight + 8;
    }

    // Social Memory Section
    if (socialMemory) {
      currentY = this.renderSocialMemorySection(ctx, x, currentY, socialMemory, world);
    }

    // Relationship Component Section (familiarity)
    if (relationship) {
      currentY = this.renderRelationshipSection(ctx, x, currentY, relationship, world);
    }

    // Trust Network Section
    if (trustNetwork) {
      currentY = this.renderTrustNetworkSection(ctx, x, currentY, trustNetwork, world);
    }

    // No relationship data
    if (!socialMemory && !relationship && !trustNetwork) {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.fillText('No relationship data available', x + this.padding, currentY);
      currentY += this.lineHeight;
    }

    // Update max scroll offset
    this.maxScrollOffset = Math.max(0, currentY - startY - this.panelHeight + 50);

    ctx.restore();

    // Scrollbar (outside scroll area, in panel coords)
    this.renderScrollbar(ctx, x, y);

    // Help text at bottom (outside scroll area)
    const helpY = y + this.panelHeight - 20;
    ctx.fillStyle = '#666688';
    ctx.font = '11px monospace';
    if (this.devMode) {
      ctx.fillText('DEV MODE | Press R to close | Scroll', x + this.padding, helpY);
    } else {
      ctx.fillText('Press R to close | Scroll for more', x + this.padding, helpY);
    }
  }

  /**
   * Render the social memory section with edit controls
   */
  private renderSocialMemorySection(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    socialMemory: SocialMemoryComponent,
    world: World
  ): number {
    this.renderSeparator(ctx, panelX, y);
    y += 10;

    this.renderSectionHeader(ctx, panelX, y, '👥 Social Memory', '#88FFCC');

    // Dev mode indicator
    if (this.devMode) {
      ctx.fillStyle = '#556655';
      ctx.font = '9px monospace';
      ctx.fillText('(click to edit)', panelX + this.padding + 145, y + 14);
    }
    y += 28;

    const socialMemories = socialMemory.socialMemories as Map<string, SocialMemory> | undefined;
    const relationshipCount = socialMemories ? socialMemories.size : 0;

    ctx.fillStyle = '#AAAAAA';
    ctx.font = '12px monospace';
    ctx.fillText(`Known agents: ${relationshipCount}`, panelX + this.padding, y);
    y += this.lineHeight + 8;

    if (socialMemories && socialMemories.size > 0) {
      // Sort by interaction count (most interactions first)
      const sortedRelationships = Array.from(socialMemories.entries())
        .sort((a, b) => b[1].interactionCount - a[1].interactionCount);

      for (const [agentId, socialMem] of sortedRelationships) {
        y = this.renderSocialMemoryEntry(ctx, panelX, y, agentId, socialMem, world);
      }
    }

    return y;
  }

  /**
   * Render a single social memory entry with editing controls
   */
  private renderSocialMemoryEntry(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    agentId: string,
    socialMem: SocialMemory,
    world: World
  ): number {
    // Get agent name
    const agentEntity = world.getEntity(agentId);
    const agentIdentity = agentEntity?.components.get('identity') as IdentityComponent | undefined;
    const agentName = agentIdentity?.name || agentId.substring(0, 8);

    // Agent entry row background
    const rowX = panelX + this.padding;
    const rowW = this.panelWidth - this.padding * 2;
    const rowStartY = y - 2;

    // Sentiment icon
    const sentimentIcon = socialMem.overallSentiment > 0.3 ? '😊' :
                          socialMem.overallSentiment < -0.3 ? '😠' : '😐';

    // Measure row height ahead of time (rough)
    let rowH = this.lineHeight; // name
    rowH += this.lineHeight;   // type badge
    rowH += this.lineHeight + 4; // trust bar
    rowH += this.lineHeight + 4; // sentiment bar
    rowH += this.lineHeight;   // interactions
    if (socialMem.impressions && socialMem.impressions.length > 0) rowH += this.lineHeight;
    if (socialMem.knownFacts && socialMem.knownFacts.length > 0) rowH += this.lineHeight;
    rowH += 8; // bottom spacing

    // Subtle row background
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
      .roundRect(rowX, rowStartY, rowW, rowH, 3);
    ctx.fill();

    // Header with emoji and name
    ctx.fillStyle = '#AAFFDD';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${sentimentIcon} ${agentName}`, rowX + 4, y + 12);
    y += this.lineHeight + 2;

    // Relationship type badge
    ctx.font = '10px monospace';
    this.renderTypeBadge(ctx, rowX + 14, y + 10, socialMem.relationshipType || 'neutral');
    y += this.lineHeight + 2;

    // Trust bar (violet → cyan)
    const trustPercent = Math.round(socialMem.trust * 100);
    const trustLabelX = panelX + this.padding + 10;
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '10px monospace';
    ctx.fillText('Trust', trustLabelX, y + 9);
    this.renderStatBar(ctx, trustLabelX + 40, y, socialMem.trust, '#7733CC', '#33CCFF', `${trustPercent}%`);

    if (this.devMode) {
      const trustBtnX = trustLabelX + 40 + 124;
      this.renderEditButton(ctx, trustBtnX, y, '-', '#FF8888');
      this.clickRegions.push({
        x: trustBtnX,
        y: y,
        width: 16,
        height: 14,
        action: 'trust_down',
        targetId: agentId,
      });
      this.renderEditButton(ctx, trustBtnX + 20, y, '+', '#88FF88');
      this.clickRegions.push({
        x: trustBtnX + 20,
        y: y,
        width: 16,
        height: 14,
        action: 'trust_up',
        targetId: agentId,
      });
    }
    y += this.lineHeight + 4;

    // Sentiment bar (red → green), convert -1..1 to 0..1
    const sentimentNorm = (socialMem.overallSentiment + 1) / 2;
    const sentimentPercent = Math.round(sentimentNorm * 100);
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '10px monospace';
    ctx.fillText('Mood', trustLabelX, y + 9);
    this.renderStatBar(ctx, trustLabelX + 40, y, sentimentNorm, '#CC3333', '#33CC66', `${sentimentPercent}%`);

    if (this.devMode) {
      const sentimentBtnX = trustLabelX + 40 + 124;
      this.renderEditButton(ctx, sentimentBtnX, y, '-', '#FF8888');
      this.clickRegions.push({
        x: sentimentBtnX,
        y: y,
        width: 16,
        height: 14,
        action: 'sentiment_down',
        targetId: agentId,
      });
      this.renderEditButton(ctx, sentimentBtnX + 20, y, '+', '#88FF88');
      this.clickRegions.push({
        x: sentimentBtnX + 20,
        y: y,
        width: 16,
        height: 14,
        action: 'sentiment_up',
        targetId: agentId,
      });
    }
    y += this.lineHeight + 4;

    // Interactions count
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '11px monospace';
    ctx.fillText(
      `Interactions: ${socialMem.interactionCount}`,
      panelX + this.padding + 10,
      y
    );
    y += this.lineHeight;

    // Recent impression (if any)
    if (socialMem.impressions && socialMem.impressions.length > 0) {
      const latestImpression = socialMem.impressions[socialMem.impressions.length - 1];
      if (latestImpression) {
        ctx.fillStyle = '#777799';
        ctx.font = '10px monospace';
        const truncatedImpression = latestImpression.text.length > 40
          ? latestImpression.text.substring(0, 37) + '...'
          : latestImpression.text;
        ctx.fillText(`"${truncatedImpression}"`, panelX + this.padding + 10, y);
        y += this.lineHeight;
      }
    }

    // Known facts (show first one if any)
    if (socialMem.knownFacts && socialMem.knownFacts.length > 0) {
      const fact = socialMem.knownFacts[0];
      if (fact) {
        ctx.fillStyle = '#666688';
        ctx.font = '10px monospace';
        const truncatedFact = fact.fact.length > 35
          ? fact.fact.substring(0, 32) + '...'
          : fact.fact;
        ctx.fillText(`Knows: ${truncatedFact} (${Math.round(fact.confidence * 100)}%)`, panelX + this.padding + 10, y);
        y += this.lineHeight;
      }
    }

    y += 8; // Spacing between entries
    return y;
  }

  /**
   * Render the relationship component section (familiarity) with edit controls
   */
  private renderRelationshipSection(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    relationship: RelationshipComponent,
    world: World
  ): number {
    this.renderSeparator(ctx, panelX, y);
    y += 10;

    this.renderSectionHeader(ctx, panelX, y, '💕 Familiarity', '#FF88CC');

    // Dev mode indicator
    if (this.devMode) {
      ctx.fillStyle = '#664455';
      ctx.font = '9px monospace';
      ctx.fillText('(click to edit)', panelX + this.padding + 125, y + 14);
    }
    y += 28;

    const relationships = relationship.relationships;
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '12px monospace';
    ctx.fillText(`Known: ${relationships.size}`, panelX + this.padding, y);
    y += this.lineHeight + 5;

    if (relationships.size > 0) {
      // Sort by familiarity
      const entries: [string, Relationship][] = Array.from(relationships.entries()) as [string, Relationship][];
      const sorted = entries
        .sort((a, b) => b[1].familiarity - a[1].familiarity)
        .slice(0, 5); // Top 5

      for (const [targetId, rel] of sorted) {
        const targetEntity = world.getEntity(targetId);
        const targetIdentity = targetEntity?.components.get('identity') as IdentityComponent | undefined;
        const targetName = targetIdentity?.name || targetId.substring(0, 8);

        // Row background
        const rowX = panelX + this.padding;
        const rowW = this.panelWidth - this.padding * 2;
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
          .roundRect(rowX, y - 12, rowW, this.lineHeight + 6, 3);
        ctx.fill();

        // Name
        ctx.fillStyle = '#FFAADD';
        ctx.font = '11px monospace';
        ctx.fillText(`${targetName}:`, rowX + 4, y);

        // Familiarity bar (gradient, rounded, glow if high)
        const barX = rowX + 100;
        const barW = 80;
        const barH = 10;
        const famNorm = rel.familiarity / 100;
        const fillW = Math.round(famNorm * barW);

        // Bar background
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
          .roundRect(barX, y - 10, barW, barH, 3);
        ctx.fill();

        // Gradient fill
        if (fillW > 0) {
          const barColorStart = rel.familiarity > 70 ? '#228855' : rel.familiarity > 40 ? '#886622' : '#882222';
          const barColorEnd   = rel.familiarity > 70 ? '#88FF88' : rel.familiarity > 40 ? '#FFFF88' : '#FF8888';
          const barGrad = ctx.createLinearGradient(barX, y - 10, barX + barW, y - 10);
          barGrad.addColorStop(0, barColorStart);
          barGrad.addColorStop(1, barColorEnd);
          ctx.fillStyle = barGrad;
          ctx.beginPath();
          (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
            .roundRect(barX, y - 10, fillW, barH, 3);
          ctx.fill();
        }

        // Glow on high familiarity
        if (rel.familiarity > 70) {
          ctx.shadowColor = 'rgba(136,255,136,0.4)';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
            .roundRect(barX, y - 10, fillW, barH, 3);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
        }

        // Value text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px monospace';
        ctx.fillText(`${rel.familiarity}%`, barX + barW + 4, y);

        // Edit buttons
        if (this.devMode) {
          const editBtnX = barX + barW + 30;
          this.renderEditButton(ctx, editBtnX, y - 10, '-', '#FF8888');
          this.clickRegions.push({
            x: editBtnX,
            y: y - 10,
            width: 16,
            height: 14,
            action: 'familiarity_down',
            targetId: targetId,
          });

          this.renderEditButton(ctx, editBtnX + 20, y - 10, '+', '#88FF88');
          this.clickRegions.push({
            x: editBtnX + 20,
            y: y - 10,
            width: 16,
            height: 14,
            action: 'familiarity_up',
            targetId: targetId,
          });
        } else {
          // Show interaction count when not in dev mode
          ctx.fillStyle = '#666688';
          ctx.fillText(`(${rel.interactionCount} interactions)`, barX + barW + 30, y);
        }

        y += this.lineHeight + 4;
      }
    }

    return y + 5;
  }

  /**
   * Render the trust network section
   */
  private renderTrustNetworkSection(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    trustNetwork: TrustNetworkComponent,
    world: World
  ): number {
    this.renderSeparator(ctx, panelX, y);
    y += 10;

    this.renderSectionHeader(ctx, panelX, y, '🔒 Trust Network', '#88CCFF');
    y += 28;

    const scores = trustNetwork.scores;
    const avgTrust = trustNetwork.getAverageTrustScore();

    ctx.fillStyle = '#AAAAAA';
    ctx.font = '12px monospace';
    ctx.fillText(`Tracked: ${scores.size} | Avg trust: ${Math.round(avgTrust * 100)}%`, panelX + this.padding, y);
    y += this.lineHeight + 5;

    if (scores.size > 0) {
      // Sort by trust score
      const scoreEntries: [string, number][] = Array.from(scores.entries()) as [string, number][];
      const sorted = scoreEntries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5

      for (const [agentId, score] of sorted) {
        const agentEntity = world.getEntity(agentId);
        const agentIdentity = agentEntity?.components.get('identity') as IdentityComponent | undefined;
        const agentName = agentIdentity?.name || agentId.substring(0, 8);

        const trustColor = score >= 0.7 ? '#88FF88' :
                          score >= 0.4 ? '#FFFF88' : '#FF8888';

        // Row background
        const rowX = panelX + this.padding;
        const rowW = this.panelWidth - this.padding * 2;
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void })
          .roundRect(rowX, y - 10, rowW, this.lineHeight + 4, 3);
        ctx.fill();

        // Filled circle trust indicator instead of ✓/~/✗
        this.renderTrustIndicator(ctx, rowX + 10, y - 2, score);

        // Agent name and score
        ctx.fillStyle = trustColor;
        ctx.font = '11px monospace';
        ctx.fillText(`${agentName}: ${Math.round(score * 100)}%`, rowX + 24, y);

        // Verification history summary
        const history = trustNetwork.getVerificationHistory(agentId);
        if (history.length > 0) {
          const correct = history.filter((h: VerificationInfo) => h.result === 'correct').length;
          const failed = history.length - correct;
          ctx.fillStyle = '#556677';
          ctx.font = '10px monospace';
          ctx.fillText(`(${correct}✓ ${failed}✗)`, rowX + 170, y);
        }

        y += this.lineHeight + 4;
      }
    }

    return y + 5;
  }
}
