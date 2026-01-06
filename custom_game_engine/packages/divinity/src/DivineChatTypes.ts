/**
 * DivineChatTypes - Divine communication and chat system
 *
 * When multiple gods exist, they can communicate through the Divine Chat -
 * a turn-based chatroom where gods speak to each other and the player.
 * Features IRC/Discord-style notifications and private DMs at higher counts.
 */

import type { DivineDomain, PerceivedPersonality } from './DeityTypes.js';

// ============================================================================
// Chat Room Configuration
// ============================================================================

/** Configuration for the divine chat system */
export interface DivineChatConfig {
  /** Minimum number of gods for chat to appear */
  minimumGodsForChat: number;

  /** Minimum number of gods for private DMs */
  minimumGodsForDM: number;

  /** Cooldown between response rounds (milliseconds) */
  responseRoundCooldown: number;

  /** Maximum gods responding per round */
  maxRespondersPerRound: number;

  /** Chance a god will respond in any given round (0-1) */
  baseResponseChance: number;

  /** Maximum message length */
  maxMessageLength: number;

  /** How long to show "typing" indicator (ms) */
  typingIndicatorDuration: number;
}

/** Default chat configuration */
export const DEFAULT_CHAT_CONFIG: DivineChatConfig = {
  minimumGodsForChat: 2,
  minimumGodsForDM: 4,
  responseRoundCooldown: 60000, // 60 seconds
  maxRespondersPerRound: 5,
  baseResponseChance: 0.7,
  maxMessageLength: 500,
  typingIndicatorDuration: 2000,
};

// ============================================================================
// Chat Room State
// ============================================================================

/** The divine chat room state */
export interface DivineChatRoom {
  id: string;

  /** Is the chat currently active/visible? */
  active: boolean;

  /** Gods currently "in" the chat */
  presentDeityIds: string[];

  /** Gods who have left the chat */
  absentDeityIds: string[];

  /** Full message history */
  messages: DivineChatMessage[];

  /** Current round number */
  currentRound: number;

  /** When current round started */
  roundStartedAt: number;

  /** Is it the player's turn to speak? */
  playerTurn: boolean;

  /** Has player spoken this round? */
  playerHasSpoken: boolean;

  /** Gods who have responded this round */
  respondedThisRound: string[];

  /** Is a god currently "typing"? */
  currentlyTyping?: TypingIndicator;

  /** Pending system notifications */
  pendingNotifications: ChatNotification[];

  /** Active private DM conversations */
  activePrivateDMs: PrivateDMConversation[];

  /** Chat topic (if set) */
  currentTopic?: string;

  /** Last activity timestamp */
  lastActivityAt: number;
}

/** Indicator that a deity is typing */
export interface TypingIndicator {
  deityId: string;
  deityName: string;
  startedAt: number;
}

// ============================================================================
// Chat Messages
// ============================================================================

/** A message in the divine chat */
export interface DivineChatMessage {
  id: string;

  /** Who sent it */
  senderDeityId: string;

  /** Display name of sender */
  senderName: string;

  /** Is sender the player god? */
  isPlayer: boolean;

  /** Message content */
  content: string;

  /** Type of message */
  type: ChatMessageType;

  /** When sent */
  timestamp: number;

  /** Round number when sent */
  round: number;

  /** Emotional tone of message */
  tone: MessageTone;

  /** Was this a reply to another message? */
  replyToMessageId?: string;

  /** Mentions of other deities */
  mentionedDeityIds: string[];

  /** Reactions from other gods */
  reactions: MessageReaction[];

  /** Message style based on deity personality */
  style: ChatStyle;
}

/** Types of chat messages */
export type ChatMessageType =
  | 'message'       // Normal message
  | 'emote'         // *does something*
  | 'announcement'  // System/formal announcement
  | 'whisper'       // Private whisper visible to all
  | 'challenge'     // Formal challenge
  | 'proclamation'  // Grand statement
  | 'question'      // Asking something
  | 'decree';       // Authoritative command

/** Emotional tone of message */
export type MessageTone =
  | 'neutral'
  | 'friendly'
  | 'hostile'
  | 'amused'
  | 'annoyed'
  | 'curious'
  | 'threatening'
  | 'dismissive'
  | 'respectful'
  | 'mocking'
  | 'cryptic'
  | 'warm'
  | 'cold'
  | 'dramatic'
  | 'casual';

/** Chat style based on deity personality */
export interface ChatStyle {
  /** How formal is their speech? */
  formality: 'casual' | 'normal' | 'formal' | 'archaic';

  /** Do they use grandiose language? */
  grandiosity: 'humble' | 'normal' | 'proud' | 'grandiose';

  /** How much do they emote? */
  emotiveness: 'stoic' | 'reserved' | 'expressive' | 'dramatic';

  /** Special speech patterns */
  quirks: ChatQuirk[];
}

/** Speech quirks for deity personalities */
export type ChatQuirk =
  | 'royal_we'          // "We are displeased"
  | 'third_person'      // "Odin speaks"
  | 'cryptic'           // Riddles and mysteries
  | 'poetic'            // Flowery language
  | 'blunt'             // Very direct
  | 'threatening'       // Always slightly menacing
  | 'jovial'            // Always lighthearted
  | 'philosophical'     // Deep musings
  | 'references_myths'  // Cites their own stories
  | 'domain_metaphors'  // Uses domain-related language
  | 'asks_questions'    // Socratic style
  | 'one_liner'         // Short pithy statements
  | 'verbose';          // Long-winded

/** Reaction to a message */
export interface MessageReaction {
  reactorDeityId: string;
  reactionType: ReactionType;
  timestamp: number;
}

/** Types of reactions */
export type ReactionType =
  | 'approve'     // Agrees/likes
  | 'disapprove'  // Disagrees/dislikes
  | 'amused'      // Finds funny
  | 'offended'    // Takes offense
  | 'intrigued'   // Wants to know more
  | 'dismissive'  // Doesn't care
  | 'impressed'   // Respects the statement
  | 'threatened'; // Feels challenged

// ============================================================================
// Chat Notifications
// ============================================================================

/** System notification in chat */
export interface ChatNotification {
  id: string;

  /** Type of notification */
  type: ChatNotificationType;

  /** Affected deity */
  deityId: string;

  /** Display name */
  deityName: string;

  /** When it occurred */
  timestamp: number;

  /** Additional details */
  details?: string;

  /** Has it been displayed? */
  displayed: boolean;
}

/** Types of chat notifications */
export type ChatNotificationType =
  | 'entered'           // "Thor has entered the chat"
  | 'left'              // "Thor has left the chat"
  | 'returned'          // "Thor has returned"
  | 'emerged'           // "A new god has emerged: [Name]"
  | 'faded'             // "Forgotten One has faded into myth"
  | 'name_changed'      // "The Unknown is now called Stormweaver"
  | 'domain_claimed'    // "Thor claims the Storm domain"
  | 'war_declared'      // "Thor declares war on Loki"
  | 'peace_made'        // "Thor and Loki have made peace"
  | 'alliance_formed'   // "The Storm-Fire Alliance is formed"
  | 'avatar_manifest'   // "Thor walks among mortals"
  | 'avatar_withdraw'   // "Thor has withdrawn from the mortal realm"
  | 'pantheon_formed'   // "The Asgardians pantheon is founded"
  | 'council_called'    // "A divine council is called"
  | 'miracle_performed' // "[Deity] performed a miracle"
  | 'believer_milestone'; // "[Deity] has reached 1000 believers"

// ============================================================================
// Private DMs
// ============================================================================

/** A private conversation between two deities */
export interface PrivateDMConversation {
  id: string;

  /** First participant */
  deityAId: string;

  /** Second participant */
  deityBId: string;

  /** Messages in this conversation */
  messages: PrivateDMMessage[];

  /** Is this conversation active? */
  active: boolean;

  /** When conversation started */
  startedAt: number;

  /** Last message timestamp */
  lastMessageAt: number;

  /** Unread count for player (if player involved) */
  playerUnreadCount: number;

  /** Is the other deity currently "online"? */
  otherDeityOnline: boolean;
}

/** A private message between deities */
export interface PrivateDMMessage {
  id: string;

  /** Sender */
  senderDeityId: string;

  /** Content */
  content: string;

  /** When sent */
  timestamp: number;

  /** Has receiver seen it? */
  read: boolean;

  /** Tone */
  tone: MessageTone;
}

/** Request to send a DM */
export interface SendDMRequest {
  /** Who is sending */
  senderDeityId: string;

  /** Who is receiving */
  recipientDeityId: string;

  /** Message content */
  content: string;

  /** Optional tone */
  tone?: MessageTone;
}

// ============================================================================
// Response Generation
// ============================================================================

/** Request for LLM to generate deity chat response */
export interface ChatResponseRequest {
  /** Which deity should respond */
  deityId: string;

  /** Deity's identity information */
  deityContext: {
    name: string;
    domain: DivineDomain;
    personality: PerceivedPersonality;
    chatStyle: ChatStyle;
    recentBeliefLevel: number;
  };

  /** Relationship with player deity */
  playerRelationship: {
    sentiment: number;
    feelings: string[];
    formalStatus: string;
  };

  /** Recent chat history (last N messages) */
  recentMessages: DivineChatMessage[];

  /** What was the player's message (if responding to player) */
  playerMessage?: string;

  /** Current topic being discussed */
  topic?: string;

  /** Is there any ongoing conflict/situation? */
  currentSituation?: string;

  /** Maximum response length */
  maxLength: number;
}

/** Response from LLM for deity chat */
export interface ChatResponseResult {
  /** Generated message content */
  content: string;

  /** Determined tone */
  tone: MessageTone;

  /** Message type */
  type: ChatMessageType;

  /** Any deities mentioned */
  mentionedDeityIds: string[];

  /** Did this change relationship with player? */
  relationshipDelta?: number;

  /** Should they do an emote instead? */
  isEmote: boolean;

  /** Should they remain silent? */
  shouldStaySilent: boolean;

  /** Reason for silence (if silent) */
  silenceReason?: string;
}

// ============================================================================
// Chat Events
// ============================================================================

/** Events that can occur in the chat */
export interface ChatEvent {
  type: ChatEventType;
  timestamp: number;
  involvedDeityIds: string[];
  details: Record<string, unknown>;
}

/** Types of chat events */
export type ChatEventType =
  | 'round_started'
  | 'round_ended'
  | 'player_spoke'
  | 'deity_responded'
  | 'deity_entered'
  | 'deity_left'
  | 'argument_started'
  | 'argument_resolved'
  | 'alliance_discussed'
  | 'threat_made'
  | 'topic_changed'
  | 'dm_opened'
  | 'dm_closed'
  | 'challenge_issued'
  | 'challenge_accepted';

// ============================================================================
// Chat State Management
// ============================================================================

/** Player's pending chat actions */
export interface PlayerChatActions {
  /** Can player send a message? */
  canSendMessage: boolean;

  /** Reason if they can't */
  cantSendReason?: 'not_your_turn' | 'cooldown' | 'no_gods' | 'chat_inactive';

  /** Time until player can act (ms) */
  timeUntilAction?: number;

  /** Can player open DM with specific god? */
  availableDMPartners: string[];

  /** Unread DM count */
  totalUnreadDMs: number;

  /** Active topics to discuss */
  suggestedTopics: string[];
}

/** Summary of chat state for UI */
export interface ChatStateSummary {
  /** Is chat available? */
  available: boolean;

  /** Total gods present */
  godsPresent: number;

  /** Recent message count */
  recentMessageCount: number;

  /** Current round */
  currentRound: number;

  /** Is it player's turn? */
  isPlayerTurn: boolean;

  /** Cooldown remaining (ms) */
  cooldownRemaining: number;

  /** Any unread notifications */
  unreadNotifications: number;

  /** Unread DMs */
  unreadDMs: number;

  /** Most recent notification */
  latestNotification?: ChatNotification;

  /** Currently typing deity */
  typingDeity?: string;
}

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a new divine chat room */
export function createChatRoom(): DivineChatRoom {
  return {
    id: `chat_${Date.now()}`,
    active: false,
    presentDeityIds: [],
    absentDeityIds: [],
    messages: [],
    currentRound: 0,
    roundStartedAt: Date.now(),
    playerTurn: true,
    playerHasSpoken: false,
    respondedThisRound: [],
    pendingNotifications: [],
    activePrivateDMs: [],
    lastActivityAt: Date.now(),
  };
}

/** Create an entry notification */
export function createEntryNotification(
  deityId: string,
  deityName: string
): ChatNotification {
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'entered',
    deityId,
    deityName,
    timestamp: Date.now(),
    displayed: false,
  };
}

/** Create a chat message */
export function createChatMessage(
  senderDeityId: string,
  senderName: string,
  content: string,
  isPlayer: boolean,
  round: number,
  style?: Partial<ChatStyle>
): DivineChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    senderDeityId,
    senderName,
    isPlayer,
    content,
    type: 'message',
    timestamp: Date.now(),
    round,
    tone: 'neutral',
    mentionedDeityIds: [],
    reactions: [],
    style: {
      formality: 'normal',
      grandiosity: 'normal',
      emotiveness: 'reserved',
      quirks: [],
      ...style,
    },
  };
}

/** Get chat style from personality */
export function getChatStyleFromPersonality(
  personality: PerceivedPersonality,
  _domain: DivineDomain
): ChatStyle {
  const quirks: ChatQuirk[] = [];

  // Determine formality
  let formality: ChatStyle['formality'] = 'normal';
  if (personality.seriousness > 0.7) formality = 'formal';
  if (personality.seriousness < 0.3) formality = 'casual';
  if (personality.mysteriousness > 0.8) formality = 'archaic';

  // Determine grandiosity
  let grandiosity: ChatStyle['grandiosity'] = 'normal';
  if (personality.benevolence < -0.5) grandiosity = 'grandiose';
  if (personality.benevolence > 0.5 && personality.compassion > 0.5) grandiosity = 'humble';

  // Determine emotiveness
  let emotiveness: ChatStyle['emotiveness'] = 'reserved';
  if (personality.wrathfulness > 0.6) emotiveness = 'dramatic';
  if (personality.compassion > 0.7) emotiveness = 'expressive';
  if (personality.mysteriousness > 0.7) emotiveness = 'stoic';

  // Add quirks based on personality
  if (personality.mysteriousness > 0.6) quirks.push('cryptic');
  if (personality.benevolence < -0.3 && personality.wrathfulness > 0.5) quirks.push('threatening');
  if (personality.benevolence > 0.5 && personality.seriousness < 0.4) quirks.push('jovial');
  if (personality.mysteriousness > 0.5) quirks.push('philosophical');
  if (personality.seriousness > 0.7) quirks.push('blunt');

  // Add domain-based quirks
  quirks.push('domain_metaphors');

  return {
    formality,
    grandiosity,
    emotiveness,
    quirks,
  };
}

/** Check if chat should be active */
export function shouldChatBeActive(
  totalGodCount: number,
  config: DivineChatConfig = DEFAULT_CHAT_CONFIG
): boolean {
  return totalGodCount >= config.minimumGodsForChat;
}

/** Check if DMs are available */
export function areDMsAvailable(
  totalGodCount: number,
  config: DivineChatConfig = DEFAULT_CHAT_CONFIG
): boolean {
  return totalGodCount >= config.minimumGodsForDM;
}

/** Format notification for display */
export function formatNotification(notification: ChatNotification): string {
  switch (notification.type) {
    case 'entered':
      return `${notification.deityName} has entered the chat`;
    case 'left':
      return `${notification.deityName} has left the chat`;
    case 'returned':
      return `${notification.deityName} has returned`;
    case 'emerged':
      return `A new god has emerged: ${notification.deityName}`;
    case 'faded':
      return `${notification.deityName} has faded into myth`;
    case 'name_changed':
      return `${notification.details ?? 'A deity'} is now known as ${notification.deityName}`;
    case 'domain_claimed':
      return `${notification.deityName} claims the ${notification.details ?? 'Unknown'} domain`;
    case 'war_declared':
      return `${notification.deityName} declares war!`;
    case 'peace_made':
      return `Peace has been made`;
    case 'avatar_manifest':
      return `${notification.deityName} walks among mortals`;
    case 'avatar_withdraw':
      return `${notification.deityName} has withdrawn from the mortal realm`;
    default:
      return `[${notification.type}] ${notification.deityName}`;
  }
}
