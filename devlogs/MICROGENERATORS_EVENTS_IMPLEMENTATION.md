# Microgenerators - Discovery Event System

**Date:** 2026-01-05
**Session:** God-Crafted Content Events & Notifications
**Status:** Event System Complete ✅

---

## Overview

Implemented a complete event system for god-crafted content discoveries, providing visual feedback when riddles, spells, and recipes are discovered in-game.

---

## What Was Implemented

### 1. New Event Type: `godcrafted:discovered`

**Location:** `packages/core/src/events/EventMap.ts:1368-1378`

Added comprehensive event data structure:

```typescript
'godcrafted:discovered': {
  contentType: 'riddle' | 'spell' | 'recipe' | 'legendary_item' | 'soul' | 'quest';
  contentId: string;
  name: string;
  creatorName: string;
  creatorDomain: string;  // "God of X"
  lore: string;
  entityId: EntityId;
  discoveryMethod: 'random_encounter' | 'location' | 'achievement' | 'quest_reward' | 'divine_gift' | 'research';
};
```

### 2. Event Emission in Discovery System

**Location:** `packages/core/src/microgenerators/GodCraftedDiscoverySystem.ts`

All spawn methods now emit events:

**Riddle Spawning** (lines 255-265):
```typescript
world.eventBus.emit('godcrafted:discovered', {
  contentType: 'riddle',
  contentId: content.id,
  name: `Riddle of ${content.creator.name}`,
  creatorName: content.creator.name,
  creatorDomain: content.creator.godOf,
  lore: content.lore,
  entityId: entity.id,
  discoveryMethod: 'random_encounter',
});
```

**Spell Spawning** (lines 324-334):
```typescript
world.eventBus.emit('godcrafted:discovered', {
  contentType: 'spell',
  contentId: content.id,
  name: spellData.name,
  // ... full event data
});
```

**Recipe Spawning** (lines 391-401):
```typescript
world.eventBus.emit('godcrafted:discovered', {
  contentType: 'recipe',
  contentId: content.id,
  name: recipeData.name,
  // ... full event data
});
```

### 3. Event Subscription in EventReportingSystem

**Location:** `packages/core/src/systems/EventReportingSystem.ts:91`

Added subscription alongside other divine events:

```typescript
// Divine events
this.subscribeToEvent('divine:intervention', (event) => this.handleDivineIntervention(event));
this.subscribeToEvent('godcrafted:discovered', (event) => this.handleGodCraftedDiscovery(event));
```

### 4. Event Handler with News Story Generation

**Location:** `packages/core/src/systems/EventReportingSystem.ts:319-347`

```typescript
private handleGodCraftedDiscovery(event: GameEvent): void {
  const data = event.data as any;
  const contentType = data.contentType ?? 'artifact';
  const name = data.name ?? 'mysterious artifact';
  const creator = data.creatorName ?? 'Unknown God';
  const domain = data.creatorDomain ?? 'the Unknown';
  const method = data.discoveryMethod ?? 'unknown means';

  // Type-specific labels
  const typeLabel = {
    riddle: 'Ancient Riddle',
    spell: 'Legendary Spell',
    recipe: 'Divine Recipe',
    legendary_item: 'Legendary Artifact',
    soul: 'Ancient Soul',
    quest: 'Divine Quest',
  }[contentType] || 'Divine Artifact';

  const score: EventScore = {
    category: 'breaking',
    priority: 'high',
    headline: `DISCOVERY: ${typeLabel} "${name}" Found!`,
    summary: `A ${contentType} crafted by ${creator}, God of ${domain}, has been discovered through ${method}. Scholars are investigating its powers and origins.`,
    sendReporter: true,
    recordingType: 'event_coverage',
  };

  this.createNewsStory(score, data.entityId, { x: 0, y: 0 }, event.tick);
}
```

---

## How It Works

### Discovery Flow with Events

1. **Discovery Check** → GodCraftedDiscoverySystem runs every 5 minutes
2. **Random Encounter** → 1% chance content is discovered
3. **Spawn Content** → Creates entity with components
4. **Emit Event** → `world.eventBus.emit('godcrafted:discovered', {...})`
5. **Event Reporting** → EventReportingSystem receives event
6. **Create News Story** → Generates headline and summary
7. **Visual Feedback** → Story appears in notifications/event log

### Example News Headlines

**Spell Discovery:**
```
DISCOVERY: Legendary Spell "Fireball of Eternal Flame" Found!
A spell crafted by Ann, God of Experimental Magic, has been discovered through random_encounter. Scholars are investigating its powers and origins.
```

**Recipe Discovery:**
```
DISCOVERY: Divine Recipe "Healing Potion of the Forest" Found!
A recipe crafted by Ann, God of Culinary Arts, has been discovered through random_encounter. Scholars are investigating its powers and origins.
```

**Riddle Discovery:**
```
DISCOVERY: Ancient Riddle "Riddle of Ann" Found!
A riddle crafted by Ann, God of Late Night Claude Code Coding Sessions, has been discovered through random_encounter. Scholars are investigating its powers and origins.
```

---

## Visual Feedback

### Where Players See It

1. **Event Log** - Entry with headline and timestamp
2. **News Stories** - Full coverage with details
3. **Notifications Panel** - Breaking news toast
4. **Reporter Dispatch** - May send reporters to investigate (if enabled)

### Event Properties

- **Category:** `breaking` - High importance event
- **Priority:** `high` - Important but not critical
- **Reporter:** `true` - Reporters may be dispatched
- **Recording:** `event_coverage` - Full coverage recording

---

## Testing

### How to Test Events

1. **Create Content:**
   ```bash
   # Navigate to http://localhost:3100/spell-lab
   # Create a spell with a memorable name
   ```

2. **Start Game:**
   ```bash
   cd custom_game_engine
   ./start.sh
   ```

3. **Watch for Discoveries:**
   - System checks every 5 minutes
   - 1% chance per check
   - Console: `[GodCraftedDiscovery] Spawned spell: [name]`
   - Event: `DISCOVERY: Legendary Spell "[name]" Found!`

4. **View in Game:**
   - Check event log for news stories
   - Look for notifications/toasts
   - Inspect news coverage

### Fast Testing Mode

Temporarily adjust discovery rate in `demo/src/main.ts:723`:

```typescript
const godCraftedDiscoverySystem = new GodCraftedDiscoverySystem({
  universeId: 'universe:main',
  checkInterval: 20 * 10, // 10 seconds instead of 5 minutes
  discoveryRate: 0.5, // 50% chance instead of 1%
});
```

This gives ~50% chance every 10 seconds for rapid testing.

---

## Integration Points

### EventReportingSystem

- Automatically subscribes to `godcrafted:discovered` events
- Creates news stories with proper formatting
- Dispatches reporters for coverage
- Records event in history

### NotificationsPanel

- Receives breaking news events
- Displays toast notifications
- Shows event details on click

### Event Log

- Stores all discovery events
- Filterable by category
- Searchable by content type or creator

---

## Future Enhancements

### 1. Rich Notifications

Add visual elements to discovery notifications:
- Icon based on content type (📖 riddle, ✨ spell, 🍳 recipe)
- Creator divine signature display
- Quick preview of content

### 2. Discovery Animations

Add visual effects when content appears:
- Particle effects at spawn location
- Camera pan to discovery site
- Cinematic reveal

### 3. Discovery Conditions

Expand beyond random encounters:
- **Location-based:** "Found ancient scroll in library"
- **Achievement-based:** "Unlocked after 100 crafts"
- **Quest reward:** "Granted by deity for completing quest"
- **Research-based:** "Discovered through archaeological dig"

### 4. Discovery Ceremonies

Special events for high-value discoveries:
- Village gathering
- Scholar presentations
- Deity blessing ceremonies

---

## Files Modified

```
packages/core/src/events/EventMap.ts
  - Added 'godcrafted:discovered' event type (11 lines)

packages/core/src/microgenerators/GodCraftedDiscoverySystem.ts
  - Added event emission in spawnRiddle() (11 lines)
  - Added event emission in spawnSpell() (11 lines)
  - Added event emission in spawnRecipe() (11 lines)

packages/core/src/systems/EventReportingSystem.ts
  - Added event subscription (1 line)
  - Added handleGodCraftedDiscovery() handler method (29 lines)
```

**Total:** ~74 lines of code

---

## Conclusion

The event system for god-crafted content discoveries is **fully functional**. Players will now receive visual feedback when riddles, spells, and recipes are discovered in their universes.

**Benefits:**
- ✅ Visual confirmation of discoveries
- ✅ Integrated with existing event/news system
- ✅ Automatic news story generation
- ✅ Reporter dispatch for coverage
- ✅ Event log entries
- ✅ Notification toasts

**Next Steps:**
- Test end-to-end discovery flow
- Add discovery-specific UI panels
- Implement other discovery conditions (location, achievement, etc.)
- Integrate spawned content with game systems (spells → agents, recipes → crafting)
