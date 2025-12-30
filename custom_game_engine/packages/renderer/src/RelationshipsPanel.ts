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

/**
 * UI Panel displaying relationship information for the selected agent.
 * Shows social memory, trust networks, and familiarity data.
 * Toggle with 'R' key.
 */
export class RelationshipsPanel {
  private selectedEntityId: string | null = null;
  private visible: boolean = false;
  private panelWidth = 380;
  private panelHeight = 500;
  private padding = 12;
  private lineHeight = 16;
  private scrollOffset = 0;
  private maxScrollOffset = 0;

  /**
   * Set the currently selected agent entity.
   */
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
   * Render the relationships panel.
   */
  render(ctx: CanvasRenderingContext2D, _canvasWidth: number, _canvasHeight: number, world: World): void {
    if (!this.visible || !this.selectedEntityId) {
      return;
    }

    if (!world || typeof world.getEntity !== 'function') {
      console.warn('[RelationshipsPanel] World not available');
      return;
    }

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
    ctx.fillText('Press R to close | Scroll for more', x + this.padding, helpY);
  }

  /**
   * Render the social memory section
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
   * Render a single social memory entry
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

    // Relationship type and stats
    const trustPercent = Math.round(socialMem.trust * 100);
    const sentimentPercent = Math.round((socialMem.overallSentiment + 1) * 50); // Convert -1..1 to 0..100

    ctx.fillStyle = '#AAAAAA';
    ctx.font = '11px monospace';
    ctx.fillText(
      `Type: ${socialMem.relationshipType} | Trust: ${trustPercent}% | Sentiment: ${sentimentPercent}%`,
      panelX + this.padding + 10,
      y
    );
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
   * Render the relationship component section (familiarity)
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

        // Show interaction count
        ctx.fillStyle = '#777777';
        ctx.fillText(`(${rel.interactionCount} interactions)`, panelX + this.padding + 200, y);

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
