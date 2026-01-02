/**
 * Communication Module
 *
 * Provides unified communication infrastructure:
 * - ChatRoom: Group chats, DMs, threads
 * - Content: Persistent media (recordings, posts, shows)
 * - Channels: Transmission mechanisms (broadcast, streaming)
 * - Walkie Talkies: Short-range group radio communication
 * - Cell Phones: Personal mobile communication (1G-5G evolution)
 */

// Chat Rooms
export * from './ChatRoom.js';
export { ChatRoomSystem } from './ChatRoomSystem.js';

// Walkie Talkies
export {
  WalkieTalkieSystem,
  WalkieTalkieManager,
  getWalkieTalkieSystem,
  resetWalkieTalkieSystem,
  type WalkieTalkieDevice,
  type WalkieTalkieModel,
  type WalkieTalkieChannel,
  type WalkieTalkieTransmission,
  type WalkieTalkieGroup,
  type WalkieTalkieGroupPurpose,
} from './WalkieTalkieSystem.js';

// Cell Phones
export {
  CellPhoneSystem,
  CellPhoneManager,
  getCellPhoneSystem,
  resetCellPhoneSystem,
  type CellPhone,
  type CellPhoneGeneration,
  type PhoneContact,
  type CallRecord,
  type TextMessage,
  type TextConversation,
  type CellTower,
  type PhoneCall,
} from './CellPhoneSystem.js';
