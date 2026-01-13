/**
 * DivineCommunicationPanel - Unified interface for divine-mortal communication
 *
 * Consolidates all divine communication features into one coherent panel:
 * - View followers and their faith levels
 * - See and respond to prayers
 * - Send visions/whispers/dreams to believers
 *
 * Replaces the scattered functionality from VisionComposerPanel and DivinePowersPanel.
 */

import type { World } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import type { EventBus } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';
import { ComponentType as CT } from '@ai-village/core';
import type { DeityComponent } from '@ai-village/core';
import type { SpiritualComponent, Prayer } from '@ai-village/core';
import type { AgentComponent } from '@ai-village/core';

interface FollowerInfo {
  id: string;
  name: string;
  faith: number;
  totalPrayers: number;
  answeredPrayers: number;
  unansweredPrayers: number;
  lastPrayerTime?: number;
  hasVisions: boolean;
}

interface PrayerInfo extends Prayer {
  agentId: string;
  agentName: string;
}

type MessageType = 'whisper' | 'dream_hint' | 'clear_vision';
type TabType = 'followers' | 'prayers' | 'send';

export class DivineCommunicationPanel implements IWindowPanel {
  private visible = false;
  private deity: Entity | null = null;
  private followers: FollowerInfo[] = [];
  private prayers: PrayerInfo[] = [];
  private currentTab: TabType = 'prayers';
  private selectedFollower: string | null = null;
  private messageType: MessageType = 'dream_hint';
  private messageContent: string = '';
  private targetFollowerId: string | null = null;
  private scrollOffset = 0;

  // World reference for event emission
  private world?: World;
  private eventBus?: EventBus;

  // IWindowPanel required methods
  getId(): string {
    return 'divine-communication';
  }

  getTitle(): string {
    return 'Divine Communication';
  }

  getDefaultWidth(): number {
    return 500;
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

  toggle(): void {
    this.visible = !this.visible;
  }

  // Update method (called by adapter)
  onUpdate(world: World, eventBus: EventBus): void {
    this.world = world;
    this.eventBus = eventBus;

    // Find player deity
    const deities = world.query().with(CT.Deity).executeEntities();
    this.deity = deities.find(d => {
      const deityComp = d.components.get(CT.Deity) as DeityComponent;
      return deityComp.isPlayerDeity;
    }) || null;

    if (!this.deity) {
      this.followers = [];
      this.prayers = [];
      return;
    }

    // Update followers list
    this.updateFollowers(world);

    // Update prayers queue
    this.updatePrayers(world);
  }

  private updateFollowers(world: World): void {
    if (!this.deity) return;

    const deityId = this.deity.id;
    const believers = world.query().with(CT.Agent).with(CT.Spiritual).executeEntities();

    this.followers = [];
    for (const believer of believers) {
      const spiritual = believer.components.get(CT.Spiritual) as SpiritualComponent;
      if (spiritual.believedDeity !== deityId) continue;

      const agent = believer.components.get(CT.Agent) as AgentComponent;

      this.followers.push({
        id: believer.id,
        name: agent.name || 'Unknown',
        faith: spiritual.faith,
        totalPrayers: spiritual.totalPrayers,
        answeredPrayers: spiritual.answeredPrayers,
        unansweredPrayers: spiritual.unansweredPrayers,
        lastPrayerTime: spiritual.lastPrayerTime,
        hasVisions: spiritual.hasReceivedVision,
      });
    }

    // Sort by faith (highest first)
    this.followers.sort((a, b) => b.faith - a.faith);
  }

  private updatePrayers(world: World): void {
    if (!this.deity) return;

    this.prayers = [];

    // Collect all unanswered prayers from followers
    for (const follower of this.followers) {
      const entity = world.getEntity(follower.id);
      if (!entity) continue;

      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent;
      if (!spiritual) continue;

      for (const prayer of spiritual.prayers) {
        if (!prayer.answered) {
          this.prayers.push({
            ...prayer,
            agentId: follower.id,
            agentName: follower.name,
          });
        }
      }
    }

    // Sort by urgency and timestamp
    this.prayers.sort((a, b) => {
      const urgencyOrder = { desperate: 3, earnest: 2, routine: 1 };
      const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.timestamp - a.timestamp; // Newest first within same urgency
    });
  }

  render(ctx: CanvasRenderingContext2D, _x: number, _y: number, width: number, height: number, world?: any): void {
    // Update if world provided
    if (world && this.eventBus) {
      this.onUpdate(world, this.eventBus);
    }

    if (!this.deity) {
      ctx.fillStyle = '#999';
      ctx.font = '14px monospace';
      ctx.fillText('No player deity found', 20, 60);
      return;
    }

    const deityComp = this.deity.components.get(CT.Deity) as DeityComponent;

    // Header: Belief and tabs
    this.renderHeader(ctx, deityComp, width);

    // Tab content
    const contentY = 100;
    switch (this.currentTab) {
      case 'followers':
        this.renderFollowersTab(ctx, contentY, height);
        break;
      case 'prayers':
        this.renderPrayersTab(ctx, contentY, height);
        break;
      case 'send':
        this.renderSendMessageTab(ctx, contentY, width, height);
        break;
    }
  }

  private renderHeader(ctx: CanvasRenderingContext2D, deityComp: DeityComponent, width: number): void {
    // Belief display
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    const belief = Math.floor(deityComp.belief.currentBelief);
    const beliefPerHour = deityComp.belief.totalBeliefGained > 0 ? '+12' : '+0';
    ctx.fillText(`Belief: ${belief} (${beliefPerHour}/hr)`, 20, 30);

    // Tab buttons
    const tabY = 50;
    const tabHeight = 35;
    const tabs: { type: TabType; label: string; x: number }[] = [
      { type: 'followers', label: 'Followers', x: 20 },
      { type: 'prayers', label: 'Prayers', x: 150 },
      { type: 'send', label: 'Send Message', x: 280 },
    ];

    for (const tab of tabs) {
      const isActive = this.currentTab === tab.type;
      ctx.fillStyle = isActive ? '#4CAF50' : '#555';
      ctx.fillRect(tab.x, tabY, 120, tabHeight);

      ctx.fillStyle = isActive ? '#fff' : '#aaa';
      ctx.font = '14px monospace';
      ctx.fillText(tab.label, tab.x + 10, tabY + 22);

      // Badge for prayers tab
      if (tab.type === 'prayers' && this.prayers.length > 0) {
        const badgeX = tab.x + 100;
        const badgeY = tabY + 5;
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(this.prayers.length), badgeX, badgeY + 4);
        ctx.textAlign = 'left';
      }
    }

    // Separator line
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 95);
    ctx.lineTo(width, 95);
    ctx.stroke();
  }

  private renderFollowersTab(ctx: CanvasRenderingContext2D, startY: number, height: number): void {
    if (this.followers.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px monospace';
      ctx.fillText('No followers yet', 20, startY + 40);
      return;
    }

    ctx.font = '13px monospace';
    let y = startY;

    for (const follower of this.followers.slice(0, 8)) { // Show up to 8
      // Background for selected
      if (this.selectedFollower === follower.id) {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
        ctx.fillRect(10, y, 480, 60);
      }

      // Name and faith
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(follower.name, 20, y + 20);

      const faithPercent = Math.round(follower.faith * 100);
      const faithColor = follower.faith >= 0.8 ? '#4CAF50' :
                          follower.faith >= 0.5 ? '#FFC107' : '#f44336';
      ctx.fillStyle = faithColor;
      ctx.fillText(`${faithPercent}%`, 440, y + 20);

      // Stats
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      const stats = `Prayers: ${follower.answeredPrayers}/${follower.totalPrayers} answered`;
      ctx.fillText(stats, 20, y + 40);

      if (follower.hasVisions) {
        ctx.fillText('✨ Has visions', 20, y + 55);
      }

      y += 65;
    }

    if (this.followers.length > 8) {
      ctx.fillStyle = '#999';
      ctx.font = '12px monospace';
      ctx.fillText(`... and ${this.followers.length - 8} more`, 20, y);
    }
  }

  private renderPrayersTab(ctx: CanvasRenderingContext2D, startY: number, height: number): void {
    if (this.prayers.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px monospace';
      ctx.fillText('No unanswered prayers', 20, startY + 40);
      return;
    }

    let y = startY;

    for (const prayer of this.prayers.slice(0, 3)) { // Show up to 3
      // Prayer box
      ctx.strokeStyle = prayer.urgency === 'desperate' ? '#f44336' :
                        prayer.urgency === 'earnest' ? '#FFC107' : '#555';
      ctx.lineWidth = 2;
      ctx.strokeRect(15, y, 470, 120);

      // Header: agent name and time
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(prayer.agentName, 25, y + 25);

      const timeAgo = this.formatTimeAgo(prayer.timestamp);
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      ctx.fillText(timeAgo, 390, y + 25);

      // Type and urgency
      ctx.fillStyle = '#FFC107';
      ctx.fillText(`${prayer.type} | ${prayer.urgency}`, 25, y + 45);

      // Prayer content (wrapped)
      ctx.fillStyle = '#ddd';
      ctx.font = '13px monospace';
      this.wrapText(ctx, prayer.content, 25, y + 65, 440, 15);

      y += 130;
    }

    if (this.prayers.length > 3) {
      ctx.fillStyle = '#999';
      ctx.font = '12px monospace';
      ctx.fillText(`... and ${this.prayers.length - 3} more prayers`, 20, y);
    }
  }

  private renderSendMessageTab(ctx: CanvasRenderingContext2D, startY: number, width: number, height: number): void {
    let y = startY + 10;

    // Target selection
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('Target:', 20, y);
    y += 5;

    ctx.fillStyle = '#555';
    ctx.fillRect(20, y, width - 40, 30);
    ctx.fillStyle = '#fff';
    ctx.font = '13px monospace';
    const targetName = this.targetFollowerId
      ? (this.followers.find(f => f.id === this.targetFollowerId)?.name || 'Unknown')
      : 'Select follower...';
    ctx.fillText(targetName, 30, y + 20);
    y += 45;

    // Message type
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('Message Type:', 20, y);
    y += 25;

    const messageTypes: { type: MessageType; label: string; cost: number }[] = [
      { type: 'whisper', label: 'Whisper - Vague feeling', cost: 5 },
      { type: 'dream_hint', label: 'Dream - Sleep vision', cost: 10 },
      { type: 'clear_vision', label: 'Clear Vision - Unmistakable', cost: 50 },
    ];

    for (const mt of messageTypes) {
      const isSelected = this.messageType === mt.type;
      ctx.fillStyle = isSelected ? '#4CAF50' : '#333';
      ctx.fillRect(20, y, 20, 20);
      if (isSelected) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('●', 23, y + 16);
      }
      ctx.fillStyle = isSelected ? '#fff' : '#aaa';
      ctx.font = '13px monospace';
      ctx.fillText(`${mt.label} (${mt.cost} belief)`, 50, y + 16);
      y += 30;
    }

    // Message content
    y += 10;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('Message:', 20, y);
    y += 5;

    ctx.fillStyle = '#555';
    ctx.fillRect(20, y, width - 40, 80);
    ctx.fillStyle = '#ddd';
    ctx.font = '13px monospace';
    if (this.messageContent) {
      this.wrapText(ctx, this.messageContent, 30, y + 20, width - 60, 16);
    } else {
      ctx.fillStyle = '#777';
      ctx.fillText('(Click to type message)', 30, y + 20);
    }
    y += 95;

    // Cost preview
    const cost = this.getMessageCost();
    if (this.deity) {
      const deityComp = this.deity.components.get(CT.Deity) as DeityComponent;
      const currentBelief = deityComp.belief.currentBelief;
      const afterBelief = currentBelief - cost;
      const canAfford = afterBelief >= 0;

      ctx.fillStyle = canAfford ? '#FFC107' : '#f44336';
      ctx.font = '13px monospace';
      ctx.fillText(`Cost: ${cost} belief`, 20, y);
      ctx.fillText(`After: ${Math.floor(afterBelief)} belief`, 20, y + 20);
    }
    y += 35;

    // Send button
    const canSend = this.targetFollowerId && this.messageContent.length > 0;
    ctx.fillStyle = canSend ? '#4CAF50' : '#555';
    ctx.fillRect(width / 2 - 75, y, 150, 35);
    ctx.fillStyle = canSend ? '#fff' : '#888';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SEND VISION', width / 2, y + 22);
    ctx.textAlign = 'left';
  }

  private getMessageCost(): number {
    const baseCosts: Record<MessageType, number> = {
      whisper: 5,
      dream_hint: 10,
      clear_vision: 50,
    };
    return baseCosts[this.messageType];
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line.length > 0) {
        ctx.fillText(line, x, currentY);
        line = word + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  private formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${Math.floor(diffHour / 24)}d ago`;
  }

  handleScroll(deltaY: number, contentHeight: number): boolean {
    // Basic scroll handling
    this.scrollOffset = Math.max(0, this.scrollOffset + deltaY);
    return true;
  }

  handleContentClick(x: number, y: number, width: number, height: number): boolean {
    if (!this.deity || !this.world || !this.eventBus) return false;

    // Tab clicks
    if (y >= 50 && y <= 85) {
      if (x >= 20 && x < 140) {
        this.currentTab = 'followers';
        return true;
      }
      if (x >= 150 && x < 270) {
        this.currentTab = 'prayers';
        return true;
      }
      if (x >= 280 && x < 400) {
        this.currentTab = 'send';
        return true;
      }
    }

    // Tab-specific clicks
    switch (this.currentTab) {
      case 'followers':
        return this.handleFollowersClick(x, y);
      case 'prayers':
        return this.handlePrayersClick(x, y);
      case 'send':
        return this.handleSendClick(x, y, width);
    }

    return false;
  }

  private handleFollowersClick(x: number, y: number): boolean {
    const startY = 100;
    const rowHeight = 65;
    const index = Math.floor((y - startY) / rowHeight);

    if (index >= 0 && index < this.followers.length) {
      this.selectedFollower = this.followers[index].id;
      this.targetFollowerId = this.followers[index].id;
      this.currentTab = 'send'; // Jump to send tab
      return true;
    }

    return false;
  }

  private handlePrayersClick(x: number, y: number): boolean {
    // Clicking a prayer sets it as target and switches to send tab
    const startY = 100;
    const prayerHeight = 130;
    const index = Math.floor((y - startY) / prayerHeight);

    if (index >= 0 && index < this.prayers.length) {
      const prayer = this.prayers[index];
      this.targetFollowerId = prayer.agentId;
      this.messageContent = `Re: ${prayer.content}`;
      this.currentTab = 'send';
      return true;
    }

    return false;
  }

  private handleSendClick(x: number, y: number, width: number): boolean {
    if (!this.world || !this.eventBus) return false;

    const startY = 100;

    // Target dropdown (cycle through followers)
    if (y >= startY && y <= startY + 35) {
      if (this.followers.length > 0) {
        const currentIndex = this.targetFollowerId
          ? this.followers.findIndex(f => f.id === this.targetFollowerId)
          : -1;
        const nextIndex = (currentIndex + 1) % this.followers.length;
        this.targetFollowerId = this.followers[nextIndex].id;
        return true;
      }
    }

    // Message type radio buttons
    let radioY = startY + 85;
    const messageTypes: MessageType[] = ['whisper', 'dream_hint', 'clear_vision'];
    for (const mt of messageTypes) {
      if (y >= radioY && y <= radioY + 20) {
        this.messageType = mt;
        return true;
      }
      radioY += 30;
    }

    // Message textarea
    const textareaY = radioY + 20;
    if (y >= textareaY && y <= textareaY + 80) {
      this.promptForMessage();
      return true;
    }

    // Send button
    const sendButtonY = textareaY + 175;
    if (y >= sendButtonY && y <= sendButtonY + 35) {
      this.sendVision();
      return true;
    }

    return false;
  }

  private promptForMessage(): void {
    const message = prompt('Enter vision message:', this.messageContent);
    if (message !== null) {
      this.messageContent = message;
    }
  }

  private sendVision(): void {
    if (!this.deity || !this.targetFollowerId || !this.messageContent || !this.eventBus) {
      console.warn('[DivineCommunication] Cannot send: missing deity, target, or message');
      return;
    }

    const deityComp = this.deity.components.get(CT.Deity) as DeityComponent;
    const cost = this.getMessageCost();

    if (deityComp.belief.currentBelief < cost) {
      alert(`Insufficient belief! Need ${cost}, have ${Math.floor(deityComp.belief.currentBelief)}`);
      return;
    }

    // Emit divine power request
    this.eventBus.emit({
      type: 'divine_power:request',
      source: this.deity.id,
      data: {
        deityId: this.deity.id,
        powerType: this.messageType,
        targetId: this.targetFollowerId,
        params: {
          message: this.messageContent,
          content: this.messageContent,
        },
      },
    });

    console.log(`[DivineCommunication] Sent ${this.messageType} to ${this.targetFollowerId}: "${this.messageContent}"`);

    // Clear message after sending
    this.messageContent = '';
  }
}
