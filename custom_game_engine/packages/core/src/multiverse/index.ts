/**
 * Multiverse System - Manages multiple universes with independent time scales
 */

export {
  MultiverseCoordinator,
  multiverseCoordinator,
} from './MultiverseCoordinator.js';

export type {
  UniverseConfig,
  UniverseInstance,
  PassageConnection,
} from './MultiverseCoordinator.js';

// Timeline management (variable interval auto-saves + canon event triggers)
export {
  TimelineManager,
  timelineManager,
} from './TimelineManager.js';

export type {
  TimelineConfig,
  TimelineEntry,
  IntervalThreshold,
} from './TimelineManager.js';

// Re-export CanonEventType for convenience
export type { CanonEventType } from '../metrics/CanonEventRecorder.js';

// Networked multiverse
export {
  MultiverseNetworkManager,
  initializeNetworkManager,
  getNetworkManager,
  networkManager,
} from './MultiverseNetworkManager.js';

export type {
  RemotePassage,
  RemotePassageConfig,
  NetworkMessage,
  ViewMode,
  InteractionMode,
  StreamConfiguration,
  Bounds,
  PeerId,
  PassageId,
  UniverseId,
  UniverseSnapshotMessage,
  UniverseTickUpdate,
  EntityTransferMessage,
  EntityTransferAckMessage,
} from './NetworkProtocol.js';

// God chat room network
export { GodChatRoomNetwork } from './GodChatRoomNetwork.js';

export type {
  ChatMessage,
  ChatMember,
  ChatRoom,
} from './GodChatRoomNetwork.js';

// Proximity voice chat (WebRTC)
export { ProximityVoiceChat } from './ProximityVoiceChat.js';

export type {
  VoiceChatOptions,
  SpatialAudioSettings,
  PlayerVoiceState,
} from './ProximityVoiceChat.js';
