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
