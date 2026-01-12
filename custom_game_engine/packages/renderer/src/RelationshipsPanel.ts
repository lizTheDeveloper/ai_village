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

    const socialMemories = socialMemory.socialMemories as Map<string, SocialMemory> | undefined;
    if (!socialMemories) return;

    const targetMemory = socialMemories.get(targetId);
    if (!targetMemory) return;

    // Adjust the field with clamping
    if (field === 'trust') {
      targetMemory.trust = Math.max(0, Math.min(1, targetMemory.trust + delta));
    } else if (field === 'overallSentiment') {
      targetMemory.overallSentiment = Math.max(-1, Math.min(1, targetMemory.overallSentiment + delta));
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

    // Help text at bottom (outside scroll area)
    const helpY = y + this.panelHeight - 20;
    ctx.fillStyle = '#888888';
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

    ctx.fillStyle = '#88FFCC';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('👥 Social Memory', panelX + this.padding, y);

    // Dev mode indicator
    if (this.devMode) {
      ctx.fillStyle = '#888888';
      ctx.font = '9px monospace';
      ctx.fillText('(click to edit)', panelX + this.padding + 125, y);
    }
    y += this.lineHeight + 5;

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

    // Header with emoji and name
    const sentimentIcon = socialMem.overallSentiment > 0.3 ? '😊' :
                          socialMem.overallSentiment < -0.3 ? '😠' : '😐';

    ctx.fillStyle = '#AAFFDD';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${sentimentIcon} ${agentName}`, panelX + this.padding, y);
    y += this.lineHeight;

    // Relationship type
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '11px monospace';
    ctx.fillText(`Type: ${socialMem.relationshipType}`, panelX + this.padding + 10, y);
    y += this.lineHeight;

    // Trust with edit buttons
    const trustPercent = Math.round(socialMem.trust * 100);
    const trustLabelX = panelX + this.padding + 10;
    ctx.fillText(`Trust: ${trustPercent}%`, trustLabelX, y);

    if (this.devMode) {
      // Draw +/- buttons for trust
      const trustBtnX = trustLabelX + 90;
      this.renderEditButton(ctx, trustBtnX, y - 10, '-', '#FF8888');
      this.clickRegions.push({
        x: trustBtnX,
        y: y - 10,
        width: 16,
        height: 14,
        action: 'trust_down',
        targetId: agentId,
      });

      this.renderEditButton(ctx, trustBtnX + 20, y - 10, '+', '#88FF88');
      this.clickRegions.push({
        x: trustBtnX + 20,
        y: y - 10,
        width: 16,
        height: 14,
        action: 'trust_up',
        targetId: agentId,
      });
    }
    y += this.lineHeight;

    // Sentiment with edit buttons
    const sentimentPercent = Math.round((socialMem.overallSentiment + 1) * 50); // Convert -1..1 to 0..100
    ctx.fillText(`Sentiment: ${sentimentPercent}%`, trustLabelX, y);

    if (this.devMode) {
      // Draw +/- buttons for sentiment
      const sentimentBtnX = trustLabelX + 110;
      this.renderEditButton(ctx, sentimentBtnX, y - 10, '-', '#FF8888');
      this.clickRegions.push({
        x: sentimentBtnX,
        y: y - 10,
        width: 16,
        height: 14,
        action: 'sentiment_down',
        targetId: agentId,
      });

      this.renderEditButton(ctx, sentimentBtnX + 20, y - 10, '+', '#88FF88');
      this.clickRegions.push({
        x: sentimentBtnX + 20,
        y: y - 10,
        width: 16,
        height: 14,
        action: 'sentiment_up',
        targetId: agentId,
      });
    }
    y += this.lineHeight;

    // Interactions count
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
        ctx.fillStyle = '#888888';
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
        ctx.fillStyle = '#777777';
        ctx.font = '10px monospace';
        const truncatedFact = fact.fact.length > 35
          ? fact.fact.substring(0, 32) + '...'
          : fact.fact;
        ctx.fillText(`Knows: ${truncatedFact} (${Math.round(fact.confidence * 100)}%)`, panelX + this.padding + 10, y);
        y += this.lineHeight;
      }
    }

    y += 5; // Spacing between entries
    return y;
  }

  /**
   * Render a small edit button
   */
  private renderEditButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string,
    color: string
  ): void {
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(x, y, 16, 14);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 16, 14);
    ctx.fillStyle = color;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + 8, y + 11);
    ctx.textAlign = 'left';
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

    ctx.fillStyle = '#FF88CC';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('💕 Familiarity', panelX + this.padding, y);

    // Dev mode indicator
    if (this.devMode) {
      ctx.fillStyle = '#888888';
      ctx.font = '9px monospace';
      ctx.fillText('(click to edit)', panelX + this.padding + 110, y);
    }
    y += this.lineHeight + 5;

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

        // Familiarity bar
        const barWidth = 60;
        const fillWidth = (rel.familiarity / 100) * barWidth;

        ctx.fillStyle = '#FFAADD';
        ctx.font = '11px monospace';
        ctx.fillText(`${targetName}:`, panelX + this.padding, y);

        // Draw bar background
        ctx.fillStyle = '#333333';
        ctx.fillRect(panelX + this.padding + 100, y - 10, barWidth, 12);

        // Draw bar fill
        const barColor = rel.familiarity > 70 ? '#88FF88' :
                         rel.familiarity > 40 ? '#FFFF88' : '#FF8888';
        ctx.fillStyle = barColor;
        ctx.fillRect(panelX + this.padding + 100, y - 10, fillWidth, 12);

        // Draw value
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px monospace';
        ctx.fillText(`${rel.familiarity}%`, panelX + this.padding + 165, y);

        // Edit buttons for familiarity
        if (this.devMode) {
          const editBtnX = panelX + this.padding + 200;
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
          ctx.fillStyle = '#777777';
          ctx.fillText(`(${rel.interactionCount} interactions)`, panelX + this.padding + 200, y);
        }

        y += this.lineHeight + 2;
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

    ctx.fillStyle = '#88CCFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('🔒 Trust Network', panelX + this.padding, y);
    y += this.lineHeight + 5;

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

        // Trust level indicator
        const trustIcon = score >= 0.7 ? '✓' :
                         score >= 0.4 ? '~' : '✗';
        const trustColor = score >= 0.7 ? '#88FF88' :
                          score >= 0.4 ? '#FFFF88' : '#FF8888';

        ctx.fillStyle = trustColor;
        ctx.font = '11px monospace';
        ctx.fillText(`${trustIcon} ${agentName}: ${Math.round(score * 100)}%`, panelX + this.padding, y);

        // Show verification history summary
        const history = trustNetwork.getVerificationHistory(agentId);
        if (history.length > 0) {
          const correct = history.filter((h: VerificationInfo) => h.result === 'correct').length;
          const failed = history.length - correct;
          ctx.fillStyle = '#777777';
          ctx.font = '10px monospace';
          ctx.fillText(`(${correct} correct, ${failed} failed)`, panelX + this.padding + 180, y);
        }

        y += this.lineHeight + 2;
      }
    }

    return y + 5;
  }

  /**
   * Render a separator line
   */
  private renderSeparator(ctx: CanvasRenderingContext2D, panelX: number, y: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(panelX + this.padding, y);
    ctx.lineTo(panelX + this.panelWidth - this.padding, y);
    ctx.stroke();
  }
}
