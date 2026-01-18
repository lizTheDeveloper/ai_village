/**
 * NetworkPanel - UI for peer discovery and connection management
 *
 * Provides interface for:
 * - Connecting to remote peers
 * - Viewing connected peers
 * - Creating remote passages
 * - Managing network settings
 */

import type { IWindowPanel } from './IWindowPanel.js';
import type { World } from '@ai-village/core';
import type {
  MultiverseNetworkManager,
  PeerId,
  RemotePassage,
} from '@ai-village/core';

interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  action: () => void;
  enabled: boolean;
}

interface InputField {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  value: string;
  placeholder: string;
  focused: boolean;
}

export class NetworkPanel implements IWindowPanel {
  private visible: boolean = false;
  private networkManager: MultiverseNetworkManager;

  // UI state
  private buttons: Button[] = [];
  private inputFields: InputField[] = [];
  private selectedPeerId: PeerId | null = null;
  private showPassageDialog: boolean = false;

  // Input state
  private connectAddressInput: InputField;
  private passageUniverseIdInput: InputField;

  // Connection state
  private connectedPeers: PeerId[] = [];
  private remotePassages: RemotePassage[] = [];

  // Scroll state
  private scrollY: number = 0;
  private maxScroll: number = 0;

  constructor(networkManager: MultiverseNetworkManager) {
    this.networkManager = networkManager;

    // Initialize input fields
    this.connectAddressInput = {
      x: 20,
      y: 60,
      width: 300,
      height: 30,
      label: 'Peer Address:',
      value: '',
      placeholder: 'ws://192.168.1.100:8080',
      focused: false,
    };

    this.passageUniverseIdInput = {
      x: 20,
      y: 60,
      width: 300,
      height: 30,
      label: 'Remote Universe ID:',
      value: '',
      placeholder: 'universe-id',
      focused: false,
    };

    this.inputFields = [this.connectAddressInput, this.passageUniverseIdInput];

    this.updateState();
  }

  // ============================================================================
  // IWindowPanel Interface
  // ============================================================================

  getId(): string {
    return 'network-panel';
  }

  getTitle(): string {
    return 'Network & Multiplayer';
  }

  getDefaultWidth(): number {
    return 450;
  }

  getDefaultHeight(): number {
    return 600;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) {
      this.updateState();
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    _world?: World
  ): void {
    // Clear background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    // Save context
    ctx.save();

    // Apply scroll offset
    ctx.translate(0, -this.scrollY);

    let currentY = y + 10;

    // Render based on current view
    if (this.showPassageDialog) {
      currentY = this.renderPassageDialog(ctx, x, currentY, width);
    } else {
      currentY = this.renderMainView(ctx, x, currentY, width);
    }

    // Calculate max scroll
    this.maxScroll = Math.max(0, currentY - y - height + 20);

    // Restore context
    ctx.restore();

    // Render scroll indicator
    if (this.maxScroll > 0) {
      this.renderScrollbar(ctx, x, y, width, height);
    }
  }

  handleClick(x: number, y: number, _world?: World): boolean {
    // Adjust for scroll
    const adjustedY = y + this.scrollY;

    // Check input fields
    for (const input of this.inputFields) {
      if (input.focused) {
        input.focused = false;
      }

      if (
        x >= input.x &&
        x <= input.x + input.width &&
        adjustedY >= input.y &&
        adjustedY <= input.y + input.height
      ) {
        input.focused = true;
        return true;
      }
    }

    // Check buttons
    for (const button of this.buttons) {
      if (
        button.enabled &&
        x >= button.x &&
        x <= button.x + button.width &&
        adjustedY >= button.y &&
        adjustedY <= button.y + button.height
      ) {
        button.action();
        return true;
      }
    }

    return false;
  }

  // ============================================================================
  // Main View Rendering
  // ============================================================================

  private renderMainView(
    ctx: CanvasRenderingContext2D,
    x: number,
    currentY: number,
    width: number
  ): number {
    // Section: My Info
    currentY = this.renderSection(ctx, x, currentY, width, 'My Network Info');

    ctx.fillStyle = '#ccc';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `Peer ID: ${this.networkManager.getMyPeerId()}`,
      x + 20,
      currentY
    );
    currentY += 20;

    ctx.fillText(
      `Address: localhost:8080 (share this with others)`,
      x + 20,
      currentY
    );
    currentY += 30;

    // Section: Connect to Peer
    currentY = this.renderSection(ctx, x, currentY, width, 'Connect to Peer');

    // Render connect address input
    this.renderInputField(ctx, this.connectAddressInput);
    currentY = this.connectAddressInput.y + this.connectAddressInput.height + 10;

    // Connect button
    this.renderButton(
      ctx,
      {
        x: x + 20,
        y: currentY,
        width: 100,
        height: 30,
        label: 'Connect',
        action: () => this.connectToPeer(),
        enabled: this.connectAddressInput.value.length > 0,
      },
      true
    );
    currentY += 50;

    // Section: Connected Peers
    currentY = this.renderSection(
      ctx,
      x,
      currentY,
      width,
      `Connected Peers (${this.connectedPeers.length})`
    );

    if (this.connectedPeers.length === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '12px monospace';
      ctx.fillText('No connected peers', x + 20, currentY);
      currentY += 30;
    } else {
      for (const peerId of this.connectedPeers) {
        currentY = this.renderPeerEntry(ctx, x, currentY, width, peerId);
      }
    }

    // Section: Remote Passages
    currentY = this.renderSection(
      ctx,
      x,
      currentY,
      width,
      `Remote Passages (${this.remotePassages.length})`
    );

    if (this.remotePassages.length === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '12px monospace';
      ctx.fillText('No remote passages', x + 20, currentY);
      currentY += 30;
    } else {
      for (const passage of this.remotePassages) {
        currentY = this.renderPassageEntry(ctx, x, currentY, width, passage);
      }
    }

    return currentY;
  }

  /**
   * Render section header
   */
  private renderSection(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    title: string
  ): number {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x + 10, y, width - 20, 30);

    ctx.fillStyle = '#4a9eff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x + 20, y + 15);

    return y + 40;
  }

  /**
   * Render peer entry
   */
  private renderPeerEntry(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    peerId: PeerId
  ): number {
    const isSelected = peerId === this.selectedPeerId;

    // Background
    ctx.fillStyle = isSelected ? '#2a4a6a' : '#222';
    ctx.fillRect(x + 15, y, width - 30, 50);

    // Peer ID
    ctx.fillStyle = '#ccc';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Peer: ${peerId.substring(0, 24)}...`, x + 25, y + 10);

    // Status indicator
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.arc(x + width - 30, y + 15, 5, 0, Math.PI * 2);
    ctx.fill();

    // Create Passage button
    this.renderButton(
      ctx,
      {
        x: x + 25,
        y: y + 28,
        width: 120,
        height: 18,
        label: 'Create Passage',
        action: () => {
          this.selectedPeerId = peerId;
          this.showPassageDialog = true;
        },
        enabled: true,
      },
      false
    );

    // Disconnect button
    this.renderButton(
      ctx,
      {
        x: x + 155,
        y: y + 28,
        width: 90,
        height: 18,
        label: 'Disconnect',
        action: () => this.disconnectFromPeer(peerId),
        enabled: true,
      },
      false
    );

    return y + 60;
  }

  /**
   * Render passage entry
   */
  private renderPassageEntry(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    passage: RemotePassage
  ): number {
    // Background
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 15, y, width - 30, 70);

    // Passage info
    ctx.fillStyle = '#ccc';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillText(
      `${passage.from.universeId} → ${passage.to.universeId}`,
      x + 25,
      y + 10
    );

    ctx.fillStyle = '#888';
    ctx.fillText(`View: ${passage.viewMode}`, x + 25, y + 25);
    ctx.fillText(`Status: ${passage.connectionState}`, x + 25, y + 40);

    // Status indicator
    const statusColor =
      passage.connectionState === 'connected' ? '#0f0' :
      passage.connectionState === 'connecting' ? '#ff0' : '#f00';

    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(x + width - 30, y + 15, 5, 0, Math.PI * 2);
    ctx.fill();

    // Close button
    this.renderButton(
      ctx,
      {
        x: x + 25,
        y: y + 52,
        width: 80,
        height: 16,
        label: 'Close',
        action: () => this.closePassage(passage.id),
        enabled: true,
      },
      false
    );

    return y + 80;
  }

  // ============================================================================
  // Passage Dialog
  // ============================================================================

  private renderPassageDialog(
    ctx: CanvasRenderingContext2D,
    x: number,
    currentY: number,
    width: number
  ): number {
    // Dialog header
    currentY = this.renderSection(
      ctx,
      x,
      currentY,
      width,
      'Create Remote Passage'
    );

    if (!this.selectedPeerId) {
      ctx.fillStyle = '#f00';
      ctx.font = '12px monospace';
      ctx.fillText('No peer selected', x + 20, currentY);
      return currentY + 30;
    }

    // Peer info
    ctx.fillStyle = '#ccc';
    ctx.font = '12px monospace';
    ctx.fillText(`To Peer: ${this.selectedPeerId}`, x + 20, currentY);
    currentY += 30;

    // Remote Universe ID input
    this.renderInputField(ctx, this.passageUniverseIdInput);
    currentY = this.passageUniverseIdInput.y + this.passageUniverseIdInput.height + 20;

    // View mode selector
    ctx.fillText('View Mode:', x + 20, currentY);
    currentY += 20;

    const viewModes: Array<{ label: string; value: string }> = [
      { label: 'None', value: 'none' },
      { label: 'Observe', value: 'observe' },
      { label: 'Participate', value: 'participate' },
    ];

    // TODO: Add view mode selection UI

    currentY += 100;

    // Buttons
    this.renderButton(
      ctx,
      {
        x: x + 20,
        y: currentY,
        width: 100,
        height: 30,
        label: 'Create',
        action: () => this.createPassage(),
        enabled: this.passageUniverseIdInput.value.length > 0,
      },
      true
    );

    this.renderButton(
      ctx,
      {
        x: x + 130,
        y: currentY,
        width: 100,
        height: 30,
        label: 'Cancel',
        action: () => {
          this.showPassageDialog = false;
        },
        enabled: true,
      },
      true
    );

    currentY += 50;

    return currentY;
  }

  // ============================================================================
  // UI Components
  // ============================================================================

  /**
   * Render button
   */
  private renderButton(
    ctx: CanvasRenderingContext2D,
    button: Button,
    register: boolean = true
  ): void {
    if (register) {
      this.buttons.push(button);
    }

    // Background
    ctx.fillStyle = button.enabled ? '#4a9eff' : '#444';
    ctx.fillRect(button.x, button.y, button.width, button.height);

    // Border
    ctx.strokeStyle = button.enabled ? '#6ab9ff' : '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(button.x, button.y, button.width, button.height);

    // Label
    ctx.fillStyle = button.enabled ? '#fff' : '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      button.label,
      button.x + button.width / 2,
      button.y + button.height / 2
    );
  }

  /**
   * Render input field
   */
  private renderInputField(
    ctx: CanvasRenderingContext2D,
    input: InputField
  ): void {
    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(input.label, input.x, input.y - 18);

    // Input box background
    ctx.fillStyle = input.focused ? '#2a2a2a' : '#1a1a1a';
    ctx.fillRect(input.x, input.y, input.width, input.height);

    // Border
    ctx.strokeStyle = input.focused ? '#4a9eff' : '#444';
    ctx.lineWidth = input.focused ? 2 : 1;
    ctx.strokeRect(input.x, input.y, input.width, input.height);

    // Text
    const displayText = input.value || input.placeholder;
    ctx.fillStyle = input.value ? '#fff' : '#666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      displayText,
      input.x + 8,
      input.y + input.height / 2
    );

    // Cursor
    if (input.focused) {
      const cursorX = input.x + 8 + ctx.measureText(input.value).width;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cursorX, input.y + 6);
      ctx.lineTo(cursorX, input.y + input.height - 6);
      ctx.stroke();
    }
  }

  /**
   * Render scrollbar
   */
  private renderScrollbar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const scrollbarWidth = 8;
    const scrollbarX = x + width - scrollbarWidth - 5;

    // Track
    ctx.fillStyle = '#222';
    ctx.fillRect(scrollbarX, y + 5, scrollbarWidth, height - 10);

    // Thumb
    const thumbHeight = Math.max(20, (height / (height + this.maxScroll)) * height);
    const thumbY =
      y + 5 + (this.scrollY / this.maxScroll) * (height - 10 - thumbHeight);

    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Connect to a peer
   */
  private async connectToPeer(): Promise<void> {
    const address = this.connectAddressInput.value.trim();
    if (!address) return;

    try {
      const peerId = await this.networkManager.connectToPeer(address);

      this.connectAddressInput.value = '';
      this.updateState();
    } catch (error) {
      console.error('[NetworkPanel] Failed to connect:', error);
    }
  }

  /**
   * Disconnect from a peer
   */
  private disconnectFromPeer(peerId: PeerId): void {
    this.networkManager.disconnectFromPeer(peerId);
    this.updateState();
  }

  /**
   * Create a remote passage
   */
  private async createPassage(): Promise<void> {
    if (!this.selectedPeerId) return;

    const remoteUniverseId = this.passageUniverseIdInput.value.trim();
    if (!remoteUniverseId) return;

    try {
      // TODO: Get local universe ID from game state
      const localUniverseId = 'local-universe'; // Placeholder

      await this.networkManager.createRemotePassage({
        localUniverseId,
        remoteUniverseId,
        remotePeerId: this.selectedPeerId,
        creatorId: 'player',
        viewMode: 'observe',
        interactionMode: 'limited',
      });

      this.showPassageDialog = false;
      this.passageUniverseIdInput.value = '';
      this.updateState();
    } catch (error) {
      console.error('[NetworkPanel] Failed to create passage:', error);
    }
  }

  /**
   * Close a remote passage
   */
  private closePassage(passageId: string): void {
    this.networkManager.closeRemotePassage(passageId);
    this.updateState();
  }

  /**
   * Update internal state
   */
  private updateState(): void {
    this.buttons = [];
    this.connectedPeers = this.networkManager.getConnectedPeers();
    this.remotePassages = Array.from(
      this.networkManager.getAllRemotePassages().values()
    );
  }

  /**
   * Handle keyboard input
   */
  handleKeyPress(key: string): void {
    const focused = this.inputFields.find(input => input.focused);
    if (!focused) return;

    if (key === 'Backspace') {
      focused.value = focused.value.slice(0, -1);
    } else if (key.length === 1) {
      focused.value += key;
    }
  }

  /**
   * Handle mouse wheel
   */
  handleWheel(deltaY: number): void {
    this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + deltaY * 0.5));
  }
}
