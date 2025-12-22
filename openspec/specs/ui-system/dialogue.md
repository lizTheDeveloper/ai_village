# Dialogue UI - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The Dialogue UI handles player participation in conversations with NPCs. It displays conversation history, dialogue options, NPC emotional states, and relationship context. The UI supports multiple input modes and adapts to different conversation types.

**Design principle:**
> "Conversations should feel natural while giving players meaningful choices"

---

## Dependencies

- `agent-system/conversation-system.md` - Conversation mechanics, types, exchanges
- `agent-system/relationship-system.md` - Relationship display
- `agent-system/species-system.md` - Cross-species communication modes
- `player-system/spec.md` - Player dialogue input modes

---

## Requirements

### REQ-DLG-001: Dialogue Panel

Main panel for conversation display.

```typescript
// Re-export from conversation-system for reference
import type {
  Conversation, ConversationType, ConversationExchange,
  ExchangeIntent, EmotionalState,
  SharedInfo, Agreement,
  DialogueOption
} from "agent-system/conversation-system";

import type { Relationship, RelationshipType } from "agent-system/relationship-system";

interface DialoguePanel {
  isOpen: boolean;

  // Current conversation
  conversation: Conversation | null;

  // Participants
  npcParticipant: NPCParticipantDisplay;
  otherParticipants: NPCParticipantDisplay[];  // For group conversations

  // Exchange history (visible portion)
  visibleExchanges: ExchangeDisplay[];
  scrollPosition: number;

  // Player input
  inputMode: DialogueInputMode;
  availableOptions: DialogueOptionDisplay[];
  typedInput: string;
  quickResponses: QuickResponse[];

  // State
  waitingForNPC: boolean;
  conversationEnding: boolean;
}

type DialogueInputMode = "typed" | "selected" | "hybrid" | "quick_only";

interface NPCParticipantDisplay {
  agentId: string;
  name: string;
  portrait: Sprite;

  // Current state
  currentEmotion: EmotionalState;
  emotionIcon: Sprite;

  // Relationship with player
  relationship: RelationshipSummary;

  // Speaking state
  isSpeaking: boolean;
  thinkingIndicator: boolean;
}

interface RelationshipSummary {
  type: RelationshipType;
  friendshipLevel: number;
  trustLevel: number;
  label: string;                       // "Close Friend", "Acquaintance"
  recentChange: number;                // Arrow up/down indicator
}
```

**Dialogue Panel Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONVERSATION with Elder Thom                                        [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                                                            │
│  │ [Portrait]  │  Elder Thom                         Relationship: Friend  │
│  │   😊        │  Historian | Happy                  Trust: ████████░░     │
│  └─────────────┘                                                            │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Elder Thom: "Ah, good morning! I was just finishing my notes on    │   │
│  │ the village's founding. Have you come to discuss history, or      │   │
│  │ perhaps something more pressing?"                                  │   │
│  │                                                              😊    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ You: "I'd love to hear about the founding, Elder."                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Elder Thom: "Wonderful! It all began nearly twenty years ago,     │   │
│  │ when a small group of settlers crossed the eastern mountains..."  │   │
│  │                                                              😌    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  YOUR RESPONSE:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. "Tell me more about the settlers."              → Curious       │   │
│  │ 2. "What challenges did they face?"                → Interested    │   │
│  │ 3. "I should let you get back to your work."       → Polite exit   │   │
│  │ 4. [Type custom response...]                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [👍 Agree] [👎 Disagree] [❓ Ask More] [👋 End Conversation]              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-DLG-002: Exchange Display

Display individual conversation exchanges.

```typescript
// ExchangeDisplay wraps ConversationExchange with UI properties
interface ExchangeDisplay {
  exchange: ConversationExchange;      // From conversation-system

  // Display properties
  speakerName: string;
  speakerPortrait: Sprite;
  isPlayer: boolean;

  // Styling
  bubbleStyle: BubbleStyle;
  emotionIcon: Sprite;
  intentIcon?: Sprite;

  // Animation
  isNew: boolean;
  typewriterComplete: boolean;
}

type BubbleStyle =
  | "player"              // Right-aligned, distinct color
  | "npc"                 // Left-aligned
  | "narrator"            // Center, italics
  | "system";             // System message

interface ExchangeAnimation {
  // Text reveal
  typewriterSpeed: number;
  skipOnClick: boolean;

  // Emotion changes
  emotionTransition: boolean;
  emotionDuration: number;
}
```

**Exchange Display Styles:**
```
NPC Message (left-aligned):
┌─────────────────────────────────────────────────────────────────────────┐
│ Elder Thom: "The early days were difficult. We had nothing but       │
│ hope and determination to guide us."                              😌  │
└─────────────────────────────────────────────────────────────────────────┘

Player Message (right-aligned):
                    ┌─────────────────────────────────────────────────────┐
                    │ You: "That must have taken incredible courage."    │
                    └─────────────────────────────────────────────────────┘

Narrator/System (centered):
              ┌───────────────────────────────────────────────┐
              │ Elder Thom seems pleased by your interest.    │
              └───────────────────────────────────────────────┘
```

### REQ-DLG-003: Dialogue Options

Display available response options.

```typescript
// DialogueOptionDisplay wraps DialogueOption with UI properties
interface DialogueOptionDisplay {
  option: DialogueOption;              // From conversation-system

  // Display
  number: number;                      // 1-4 typically
  text: string;
  truncatedText: string;               // If too long
  fullTextOnHover: boolean;

  // Indicators
  intentIcon: Sprite;
  toneLabel: string;
  predictedReactionIcon: Sprite;

  // Relationship hints
  showRelationshipImpact: boolean;
  impactIndicator: "positive" | "negative" | "neutral";

  // State
  isHovered: boolean;
  isSelected: boolean;
  isAvailable: boolean;
  unavailableReason?: string;
}

interface DialogueOptionsConfig {
  maxOptions: number;                  // Usually 4
  showIntentIcons: boolean;
  showToneLabels: boolean;
  showRelationshipHints: boolean;
  showPredictedReactions: boolean;
}
```

**Dialogue Options Display:**
```
YOUR RESPONSE:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  [1] "Tell me more about the settlers."                                │
│      💭 Curious | 😊 +Friendship | They'll appreciate your interest   │
│                                                                         │
│  [2] "What challenges did they face?"                                  │
│      🔍 Inquiring | 😐 Neutral | Opens deeper discussion               │
│                                                                         │
│  [3] "Did you know any of the original founders personally?"           │
│      ❤️ Personal | 😊 +Trust | May share personal memories            │
│                                                                         │
│  [4] "I should let you get back to your work."                         │
│      👋 Polite | 😐 Neutral | Ends conversation gracefully            │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  Or type your own response: [________________________________]          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### REQ-DLG-004: Quick Responses

Fast response buttons for common intents.

```typescript
interface QuickResponse {
  id: string;
  label: string;
  icon: Sprite;
  intent: ExchangeIntent;

  // When available
  contextual: boolean;                 // Only show when relevant
  alwaysShow: boolean;
}

const DEFAULT_QUICK_RESPONSES: QuickResponse[] = [
  { id: "agree", label: "Agree", icon: "👍", intent: "agree", contextual: false, alwaysShow: true },
  { id: "disagree", label: "Disagree", icon: "👎", intent: "disagree", contextual: false, alwaysShow: true },
  { id: "ask_more", label: "Tell me more", icon: "❓", intent: "ask", contextual: false, alwaysShow: true },
  { id: "end", label: "Goodbye", icon: "👋", intent: "decline", contextual: false, alwaysShow: true },
  { id: "thank", label: "Thanks", icon: "🙏", intent: "thank", contextual: true, alwaysShow: false },
  { id: "apologize", label: "Sorry", icon: "😔", intent: "apologize", contextual: true, alwaysShow: false },
];
```

**Quick Response Bar:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  [👍 Agree] [👎 Disagree] [❓ Ask More] [🙏 Thanks] [👋 Goodbye]       │
└─────────────────────────────────────────────────────────────────────────┘
```

### REQ-DLG-005: Emotion Display

Show NPC emotional state changes.

```typescript
interface EmotionDisplay {
  current: EmotionalState;
  previous: EmotionalState | null;

  // Visual representation
  icon: Sprite;
  color: Color;
  label: string;

  // Change animation
  isChanging: boolean;
  changeDirection: "improving" | "worsening" | null;
}

// Emotion icons and colors
const EMOTION_VISUALS: Map<EmotionalState, EmotionVisual> = new Map([
  ["happy", { icon: "😊", color: "#4CAF50", label: "Happy" }],
  ["content", { icon: "😌", color: "#8BC34A", label: "Content" }],
  ["neutral", { icon: "😐", color: "#9E9E9E", label: "Neutral" }],
  ["sad", { icon: "😢", color: "#2196F3", label: "Sad" }],
  ["angry", { icon: "😠", color: "#F44336", label: "Angry" }],
  ["afraid", { icon: "😨", color: "#9C27B0", label: "Afraid" }],
  ["surprised", { icon: "😲", color: "#FF9800", label: "Surprised" }],
  ["disgusted", { icon: "🤢", color: "#795548", label: "Disgusted" }],
  ["curious", { icon: "🤔", color: "#00BCD4", label: "Curious" }],
  ["loving", { icon: "😍", color: "#E91E63", label: "Loving" }],
]);
```

### REQ-DLG-006: Relationship Context

Display relationship information during conversation.

```typescript
interface RelationshipContext {
  relationship: Relationship;          // From relationship-system

  // Summary display
  typeLabel: string;
  friendshipBar: number;
  trustBar: number;
  respectBar: number;

  // History
  conversationCount: number;
  lastConversation: GameTime;
  memorableExchanges: string[];

  // Changes this conversation
  deltaFriendship: number;
  deltaTrust: number;
  deltaRespect: number;
}
```

**Relationship Context Panel:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  RELATIONSHIP with Elder Thom                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Status: Close Friend                                                   │
│  Known for: 2 years                                                     │
│                                                                         │
│  Friendship: ████████████████░░░░ 80% (+2 this conversation)           │
│  Trust:      ██████████████░░░░░░ 70%                                  │
│  Respect:    ████████████████████ 100%                                 │
│                                                                         │
│  Last spoke: Yesterday                                                  │
│  Conversations: 47                                                      │
│                                                                         │
│  Memorable: "You helped me during the drought"                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### REQ-DLG-007: Negotiation Mode

Special UI for trade and negotiation conversations.

```typescript
interface NegotiationDisplay {
  conversation: NegotiationConversation;

  // Offers
  playerOffer: OfferDisplay;
  npcOffer: OfferDisplay;

  // Progress
  roundNumber: number;
  concessionsMade: ConcessionDisplay[];

  // Agreement preview
  potentialAgreement: AgreementPreview | null;

  // NPC stance
  npcWillingness: number;              // 0-100
  dealBreakers: string[];
}

interface OfferDisplay {
  items: OfferItem[];
  totalValue: number;
  isAcceptable: boolean;
}

interface OfferItem {
  type: "item" | "currency" | "service" | "promise";
  description: string;
  quantity: number;
  value: number;
  icon: Sprite;
}
```

**Negotiation Display:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  NEGOTIATION - Trade with Merchant Alara                         [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  YOUR OFFER                          THEIR OFFER                        │
│  ─────────────────────               ─────────────────────              │
│  🌾 Grain x50         250c          🐟 Fish x30           180c         │
│  🪵 Lumber x10         80c          💎 Gem x1             200c         │
│  ─────────────────────               ─────────────────────              │
│  Total: 330 coins                    Total: 380 coins                   │
│                                                                         │
│  [Add Item]  [Remove]                Willingness: ████████░░ 78%       │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Alara: "I could accept 60 grain instead of 50, and we'd have a deal." │
│                                                                         │
│  [Accept Offer] [Counter-Offer] [Walk Away]                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### REQ-DLG-008: Teaching Mode

Special UI for learning conversations.

```typescript
interface TeachingDisplay {
  conversation: TeachingConversation;

  // Participants
  teacher: { name: string; skillLevel: number };
  student: { name: string; currentSkill: number };

  // Lesson
  subject: string;
  lessonProgress: number;              // 0-1 for current lesson

  // Skill transfer
  potentialGain: number;
  actualGain: number;

  // Quality factors
  teacherEffectiveness: number;
  studentAptitude: number;
  relationshipBonus: number;
}
```

**Teaching Display:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  LESSON - Learning Farming from Elder Thom                       [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Subject: Advanced Crop Rotation                                        │
│                                                                         │
│  Teacher Skill: ██████████████████░░ 85%                               │
│  Your Skill:    ████████████░░░░░░░░ 60%                               │
│                                                                         │
│  Lesson Progress: ████████████████░░░░ 78%                             │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Elder Thom: "Now, the key is understanding which crops replenish      │
│  what the previous crops depleted. Legumes, for instance..."           │
│                                                                         │
│  Skill Gain: +3 Farming (when lesson complete)                         │
│  Bonus: +1 from strong relationship                                    │
│                                                                         │
│  [Continue Lesson] [Ask Question] [Take a Break]                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### REQ-DLG-009: Group Conversation Display

UI for conversations with multiple NPCs.

```typescript
interface GroupConversationDisplay {
  conversation: GroupConversation;

  // Participants
  participants: NPCParticipantDisplay[];
  currentSpeaker: string | null;

  // Group dynamics
  dominantSpeaker: string | null;
  factionIndicators: FactionIndicator[];
  tensionIndicators: TensionIndicator[];

  // Addressing
  addressingMode: "group" | "individual";
  targetParticipant: string | null;
}

interface FactionIndicator {
  members: string[];
  position: string;                    // "Agrees with player"
  color: Color;
}

interface TensionIndicator {
  between: [string, string];
  intensity: number;
}
```

**Group Conversation Display:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  VILLAGE COUNCIL DISCUSSION                                      [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PARTICIPANTS                                                           │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                           │
│  │ Chief  │ │ Elder  │ │Merchant│ │ Guard  │                           │
│  │ Elena  │ │ Thom   │ │ Alara  │ │ Marcus │                           │
│  │  😊    │ │  🤔    │ │  😠    │ │  😐    │                           │
│  │Speaking│ │        │ │Disagree│ │        │                           │
│  └────────┘ └────────┘ └────────┘ └────────┘                           │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Chief Elena: "I believe the trade agreement will benefit us all.      │
│  What say you, council?"                                                │
│                                                                         │
│  [Agree with Elena] [Support Alara] [Ask Thom] [Propose Alternative]   │
│                                                                         │
│  ⚠️ Tension between Alara and Elena                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### REQ-DLG-010: Cross-Species Communication Display

UI adaptations for alien communication modes.

```typescript
interface CrossSpeciesCommunicationDisplay {
  // Communication mode
  mode: CommunicationMode;

  // Translation info
  translatorPresent: boolean;
  translatorName?: string;
  translationAccuracy: number;

  // Mode-specific displays
  chromaticDisplay?: ChromaticCommunicationDisplay;
  pheromoneDisplay?: PheromoneCommunicationDisplay;
  telepathicDisplay?: TelepathicCommunicationDisplay;

  // Warnings
  communicationWarnings: string[];
}

interface ChromaticCommunicationDisplay {
  currentPattern: ColorPattern;
  emotionLeakage: boolean;
  translatedMeaning: string;
}

interface TelepathicCommunicationDisplay {
  connectionStrength: number;
  emotionalBleed: EmotionDisplay[];
  privacyWarning: boolean;
}
```

**Chromatic Communication Display:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  CONVERSATION with Zyx (Chromatic Species)                       [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────┐                              │
│  │  [Zyx's skin displays shifting        │ Translation (65% accurate): │
│  │   patterns of blue and green with     │ "I find your offer         │
│  │   occasional yellow ripples]          │  interesting, but the      │
│  │                                       │  terms need adjustment."   │
│  │   🔵🟢🔵🟡🔵🟢🟢🔵                    │                             │
│  └───────────────────────────────────────┘                              │
│                                                                         │
│  ⚠️ Zyx's skin reveals mild skepticism (involuntary display)           │
│                                                                         │
│  YOUR RESPONSE:                                                         │
│  [1] Verbal response (translated to color pattern)                      │
│  [2] Adjust offer                                                       │
│  [3] Ask for clarification                                              │
│                                                                         │
│  ⚠️ Note: Some nuance may be lost in translation                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

```
DIALOGUE CONTROLS:
- 1-4            : Select dialogue option
- Enter          : Confirm selection / Send typed response
- Tab            : Switch between options and text input
- Space          : Skip text animation
- Escape         : Exit conversation (if allowed)
- Q              : Quick response: Agree
- E              : Quick response: Ask more
- R              : View relationship details
```

---

## Visual Style

```typescript
interface DialogueStyle {
  // Panel styling
  panelBackground: Color;
  panelBorder: Color;

  // Speech bubbles
  playerBubbleColor: Color;
  npcBubbleColor: Color;
  narratorBubbleColor: Color;

  // Text
  npcNameColor: Color;
  playerNameColor: Color;
  textColor: Color;

  // Emotion colors
  positiveEmotionColor: Color;
  negativeEmotionColor: Color;
  neutralEmotionColor: Color;

  // Relationship indicators
  friendshipColor: Color;
  trustColor: Color;
  respectColor: Color;

  // Animation
  typewriterSpeed: number;
  emotionTransitionDuration: number;

  // 8-bit styling
  pixelScale: number;
  portraitSize: { width: number; height: number };
}
```

---

## State Management

### Conversation System Integration

```typescript
interface DialogueUIState {
  // View state
  isOpen: boolean;
  currentConversation: Conversation | null;

  // Input state
  inputMode: DialogueInputMode;
  selectedOption: number | null;
  typedInput: string;

  // Animation state
  isAnimating: boolean;
  currentlyTyping: string | null;

  // Events from conversation system
  onConversationStarted: Event<Conversation>;
  onExchangeAdded: Event<ConversationExchange>;
  onEmotionChanged: Event<{ agentId: string; emotion: EmotionalState }>;
  onConversationEnded: Event<Conversation>;
  onRelationshipChanged: Event<RelationshipDelta>;

  // Player events
  onPlayerResponse: Event<DialogueOption | string>;
  onQuickResponse: Event<QuickResponse>;
}
```

---

## Performance Considerations

```typescript
interface DialoguePerformance {
  // Exchange history limit
  maxVisibleExchanges: number;         // 10-20
  scrollBufferSize: number;

  // Animation throttling
  typewriterMinDelay: number;
  skipAnimationOnFast: boolean;

  // Portrait caching
  portraitCacheSize: number;
}
```

---

## Open Questions

1. Voice acting support?
2. Dialogue history log for reviewing past conversations?
3. Translation mode for different languages?
4. Conversation bookmarking?
5. Dialogue export for sharing?

---

## Related Specs

- `agent-system/conversation-system.md` - Source system spec
- `agent-system/relationship-system.md` - Relationship mechanics
- `agent-system/species-system.md` - Cross-species communication
- `player-system/spec.md` - Player dialogue input
- `ui-system/notifications.md` - Conversation notifications
