/**
 * TV Formats Module Exports
 *
 * Specialized TV show format systems:
 * - NewsroomSystem: Live news generation and broadcasting
 * - TalkShowSystem: Interview and variety shows
 * - GameShowSystem: Competition and game shows
 * - SoapOperaSystem: Serialized drama management
 */

// Newsroom System
export {
  // Types
  type NewsCategory,
  type NewsPriority,
  type NewsStory,
  type NewsDesk,
  type NewsSegment,
  type FieldReporter,
  // Manager
  NewsDeskManager,
  // System
  NewsroomSystem,
  getNewsroomSystem,
  resetNewsroomSystem,
} from './NewsroomSystem.js';

// Talk Show System
export {
  // Types
  type TalkShowStyle,
  type SegmentType,
  type TalkShowEpisode,
  type TalkShowSegment,
  type MonologueContent,
  type MonologueJoke,
  type InterviewContent,
  type InterviewTopic,
  type PerformanceContent,
  type GameContent,
  type GuestBooking,
  type TalkShowConfig,
  // Manager
  TalkShowManager,
  // System
  TalkShowSystem,
  getTalkShowSystem,
  resetTalkShowSystem,
} from './TalkShowSystem.js';

// Game Show System
export {
  // Types
  type GameShowFormat,
  type EliminationType,
  type GameShow,
  type GameRules,
  type Prize,
  type Contestant,
  type ContestantApplication,
  type GameShowEpisode,
  type GameRound,
  type GameChallenge,
  type ChallengeResponse,
  // Manager
  GameShowManager,
  // System
  GameShowSystem,
  getGameShowSystem,
  resetGameShowSystem,
} from './GameShowSystem.js';

// Soap Opera System
export {
  // Types
  type DramaticTone,
  type RelationshipType,
  type CharacterRelationship,
  type RelationshipEvent,
  type SoapEpisode,
  type SoapScene,
  type SceneDialogue,
  type EmotionalBeat,
  type StorylineProgress,
  type StoryArc,
  // Manager
  SoapOperaManager,
  // System
  SoapOperaSystem,
  getSoapOperaSystem,
  resetSoapOperaSystem,
} from './SoapOperaSystem.js';
