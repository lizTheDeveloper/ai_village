# Alien Text UI Integration Guide

**Complete system for displaying alien text with hover tooltips in speech bubbles**

## Overview

The alien language system now includes full UI integration that displays alien words in speech bubbles with hover tooltips showing English translations. When agents speak in their native language, players see alien text that reveals its meaning on hover.

## Architecture

### 1. Speech Bubble Overlay (`packages/renderer/src/ui/DOMSpeechBubbleOverlay.ts`)

HTML-based speech bubble system that renders over the canvas:
- Positioned absolutely over canvas at agent screen positions
- Auto-expires after 5 seconds
- Updates positions when camera moves
- Supports alien text with inline tooltips

### 2. Speech-to-Tokens Service (`packages/renderer/src/services/SpeechToAlienTokens.ts`)

Converts agent speech into displayable alien tokens:
- Looks up speaker's native language
- Parses speech text to find alien words
- Creates tokens with `{alien, english, wordType}` structure
- Reverse lookup from alien words → English concepts

### 3. Main Integration (`demo/src/main.ts`)

Connects everything together:
- Subscribes to `agent:speak` events
- Converts world coordinates → screen coordinates
- Calls token service to get alien tokens
- Registers speech bubbles with overlay

## How It Works

### Flow Diagram

```
Agent speaks
    ↓
agent:speak event emitted
    ↓
main.ts event handler captures speech
    ↓
Get agent screen position (world → screen transform)
    ↓
SpeechToAlienTokensService.convertSpeechToTokens()
    ├─ Get speaker's language knowledge component
    ├─ Get language entity from LanguageRegistry
    ├─ Parse text: alien word → English translation
    └─ Return AlienWordToken[] or null
    ↓
DOMSpeechBubbleOverlay.registerSpeech()
    ├─ Create HTML speech bubble element
    ├─ Position at (screenX, screenY)
    ├─ Render alien words with tooltips
    └─ Auto-expire after 5 seconds
    ↓
Player sees speech bubble with alien text
    ↓
Player hovers over alien word
    ↓
Tooltip appears with English translation
```

### Visual Example

**What the player sees:**

```
┌─────────────────────┐
│ Thrakara           │  ← Agent name (gray)
│ Grü xak flüm       │  ← Alien words (purple)
│   ↑    ↑    ↑       │
│   │    │    └─ "festival"  ← Tooltip on hover
│   │    └─ "fire"
│   └─ "hello"
└─────────────────────┘
          ▼             ← Pointer to agent
```

**Proficiency levels:**
- **Native speaker**: Sees own language as alien text
- **Fluent (≥90%)**: Sees English translation
- **Learning (10-90%)**: Sees mixed English/alien
- **Non-speaker (<10%)**: Sees full alien gibberish

## Integration Points

### Creating Speech Bubbles

```typescript
import { DOMSpeechBubbleOverlay } from '@ai-village/renderer';
import { getSpeechToAlienTokensService } from '@ai-village/renderer';

// Initialize
const overlay = new DOMSpeechBubbleOverlay(containerElement);
const tokenService = getSpeechToAlienTokensService();

// Set language registry (required)
tokenService.setLanguageRegistry(languageRegistry);

// When agent speaks
world.eventBus.on('agent:speak', (event) => {
  const { agentId, agentName, text } = event.data;

  // Get screen position
  const screenPos = camera.worldToScreen(agent.x, agent.y);

  // Convert to alien tokens
  const tokens = tokenService.convertSpeechToTokens(agentId, text, world);

  // Register speech bubble
  overlay.registerSpeech(
    agentId,
    agentName,
    text,
    screenPos.x,
    screenPos.y,
    tokens
  );
});

// Update positions every frame
gameLoop(() => {
  overlay.updatePositions(camera);
});
```

### Token Structure

```typescript
interface AlienWordToken {
  alien: string;      // "xak"
  english: string;    // "fire"
  wordType?: string;  // "noun", "verb", etc.
}
```

### Styling

Speech bubbles use inline styles but can be customized:

```typescript
// In DOMSpeechBubbleOverlay.ts
const bubble = document.createElement('div');
bubble.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
bubble.style.color = '#ffffff';
bubble.style.padding = '8px 12px';
bubble.style.borderRadius = '8px';
// ... customize as needed
```

Alien words are styled:
```typescript
word.style.color = '#bb86fc';  // Purple for alien text
word.style.cursor = 'help';
word.style.borderBottom = '1px dotted #bb86fc';
```

Tooltips:
```typescript
tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
tooltip.style.color = '#ffffff';
tooltip.style.padding = '4px 8px';
tooltip.style.fontSize = '11px';
// Positioned above word with 200ms delay
```

## Event Integration

### agent:speak Event

Emitted from `TalkBehavior.ts` when agents speak:

```typescript
world.eventBus.emit({
  type: 'agent:speak',
  source: entity.id,
  data: {
    agentId: entity.id,
    agentName: identity.name,
    text: speakerMessage,  // May be alien text
    listenerId: partnerId,
    originalEnglish: message, // Original English (for LLM memory)
  }
});
```

### Subscribing

```typescript
world.eventBus.on('agent:speak', (event) => {
  // Handle speech display
});
```

## Graceful Degradation

The system handles missing components gracefully:

1. **No LanguageRegistry**: Shows plain text (no tooltips)
2. **Agent has no native language**: Shows plain text
3. **Speech contains no alien words**: No bubble shown or plain text
4. **Language not in vocabulary**: Words shown without tooltips

## Performance Considerations

### Token Parsing
- Uses reverse lookup Map for O(1) alien word → English translation
- Tokenizes text once per speech event
- Caches language vocabulary in memory

### Bubble Management
- Maximum 1 bubble per agent (replaces previous)
- Auto-expires after 5 seconds
- Removed bubbles are garbage collected
- Position updates use cached screen transforms

### Memory Usage
- ~50 bytes per token
- ~200 bytes per speech bubble
- Typical conversation: 5-10 bubbles × 3-5 tokens = ~3 KB

## Testing

### Manual Testing

1. Start game: `./start.sh`
2. Wait for agents to spawn and converse
3. Look for speech bubbles above agents
4. Hover over purple alien words
5. Verify tooltips show English translations

### Debug Mode

Enable debug logging:
```typescript
// In SpeechToAlienTokens.ts
console.log('[SpeechToAlienTokens] Converting:', text);
console.log('[SpeechToAlienTokens] Found tokens:', tokens);
```

### Test Cases

✅ **Agent speaks in native language** → Alien text with tooltips
✅ **Agent speaks in English** → No bubble or plain text
✅ **Multiple agents speak** → Multiple bubbles
✅ **Camera moves** → Bubbles follow agents
✅ **Agent moves offscreen** → Bubble remains at last position (expires)
✅ **Rapid speech** → Replaces previous bubble

## Troubleshooting

### Tooltips not appearing

1. Check LanguageRegistry is set on token service
2. Verify agent has `language_knowledge` component
3. Confirm language exists in registry
4. Check speech text contains alien words

### Bubbles at wrong position

1. Verify camera transform is correct
2. Check agent world coordinates
3. Ensure `updatePositions()` called every frame

### No bubbles at all

1. Check `agent:speak` events are emitted
2. Verify overlay container element exists
3. Check CSS z-index and pointer-events
4. Look for errors in browser console

### Performance issues

1. Limit max active bubbles (currently no limit)
2. Throttle position updates (currently every frame)
3. Use requestAnimationFrame for updates
4. Consider bubble pooling for high-frequency speech

## Future Enhancements

**Possible additions:**
- **Conversation history panel** - Show full conversation with alien text
- **Language learning progress** - Visual feedback when words learned
- **Multiple tooltip styles** - Different themes per language
- **Sound effects** - Audio cues for alien speech
- **Text-to-speech** - Procedural alien voice generation
- **Animation** - Fade in/out, bounce effects
- **Bubble tails** - Better visual connection to agents
- **Compact mode** - Smaller bubbles for crowded scenes
- **Accessibility** - Screen reader support for alien text

## Files Reference

### Core Files
- `packages/renderer/src/ui/DOMSpeechBubbleOverlay.ts` - Speech bubble overlay
- `packages/renderer/src/services/SpeechToAlienTokens.ts` - Token conversion
- `demo/src/main.ts` - Integration point
- `packages/core/src/behavior/behaviors/TalkBehavior.ts` - Speech generation

### Language System Files
- `packages/language/src/ui/HoverableAlienText.tsx` - React hover component (unused in DOM version)
- `packages/language/src/AlienTextRenderer.ts` - Text rendering utilities
- `packages/language/src/LanguageComponent.ts` - Language vocabulary storage
- `packages/language/src/LanguageKnowledgeComponent.ts` - Agent language proficiency

### Event Files
- `packages/core/src/events/domains/social.events.ts` - agent:speak event definition

---

**The alien text UI is now fully integrated and ready to use!** 👽💬
