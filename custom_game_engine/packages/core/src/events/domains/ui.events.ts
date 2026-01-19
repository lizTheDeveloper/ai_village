/**
 * UI, input, and notification events.
 */
import type { EntityId } from '../../types.js';

export interface UIEvents {
  /** Show notification to user */
  'notification:show': {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
  };

  /** PixelLab sprite generation completed */
  'pixellab:sprite_complete': {
    agentId: string;
    characterId: string;
    name: string;
  };

  /** Right-click input */
  'input:rightclick': {
    x: number;
    y: number;
    worldX?: number;
    worldY?: number;
  };

  /** Context menu opened */
  'ui:contextmenu:opened': {
    position: { x: number; y: number };
    context: unknown;
  };

  /** Context menu closed */
  'ui:contextmenu:closed': Record<string, never>;

  /** Context menu animation started */
  'ui:contextmenu:animation_start': {
    type: 'open' | 'close';
    style: string;
  };

  /** Context menu action selected */
  'ui:contextmenu:action_selected': {
    actionId?: string;
    itemId: string;
    context: unknown;
  };

  /** Context menu action executed */
  'ui:contextmenu:action_executed': {
    actionId: string;
    success: boolean;
    error?: string;
  };

  /** Entity selected in UI */
  'ui:entity:selected': {
    entityId: string;
  };

  /** Confirmation dialog shown */
  'ui:confirmation:show': {
    actionId: string;
    message: string;
    consequences: string[];
    context: unknown;
  };

  /** Confirmation dialog confirmed */
  'ui:confirmation:confirmed': {
    actionId: string;
    context: unknown;
  };

  /** Confirmation dialog cancelled */
  'ui:confirmation:cancelled': {
    actionId: string;
  };

  /** Chat message sent */
  'chat:message_sent': {
    roomId: string;
    messageId?: string;
    senderId: string;
    senderName?: string;
    message?: string;
    content?: string;
    timestamp?: number;
  };

  /** Panel opened */
  'ui:panel:open': {
    panelType?: string;
    entityId?: EntityId | null;
    data?: unknown;
  };

  /** Building placement opened */
  'ui:building_placement:open': {
    buildingType?: string;
    position?: { x: number; y: number };
  };

  /** Camera focus */
  'camera:focus': {
    entityId?: EntityId;
    position?: { x: number; y: number };
  };

  /** Stance changed for entities */
  'ui:stance:changed': {
    entityIds: EntityId[];
    stance: string;
  };

  /** UI action triggered */
  'ui_action': {
    action: string;
    entityId?: EntityId;
    data?: unknown;
  };

  /** UI notification */
  'ui:notification': {
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
  };

  /** Chat send message */
  'chat:send_message': {
    roomId?: string;
    message: string;
    senderId?: EntityId;
    data?: unknown;
  };
}

export type UIEventType = keyof UIEvents;
export type UIEventData = UIEvents[UIEventType];
