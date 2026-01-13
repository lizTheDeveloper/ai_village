# Divine Communication System - Analysis & Implementation Plan
**Date:** 2026-01-12
**Status:** In Progress

## Problem Statement

User wants to communicate with their followers (agents who believe in their deity) by sending divine visions/whispers. The system exists but has critical gaps:

1. **Visions don't reach agents** - stored in components but not visible in LLM prompts
2. **UI is confusing** - two overlapping panels with unclear purpose
3. **No prayer visibility** - prayers exist but no UI to see/respond to them
4. **Unclear workflow** - "I want to tell Alice to build a workbench" → which panel? which button?

## Current State Analysis

### What Works ✓

**Backend (`DivinePowerSystem.ts:71-1161`):**
- ✅ Handles `divine_power:request` events from UI
- ✅ Powers (whisper, dream_hint, clear_vision) work correctly
- ✅ Visions properly added to `SpiritualComponent.visions[]`
- ✅ Faith mechanics functional (visions increase faith by 0.15)
- ✅ Vision tracking in `DeityComponent.sentVisions[]`
- ✅ Belief costs deducted correctly

**Data Flow:**
```
UI Panel → divine_power:request event → DivinePowerSystem
  → creates Vision object → calls receiveVision()
  → updates SpiritualComponent.visions[] → increases faith
```

### Critical Gap: Agents Can't See Visions! ❌

**Root Cause:** `SpiritualSchema.ts:308-348`

The schema only defines individual fields (faith, totalPrayers, hasReceivedVision) but **doesn't include the `visions` or `prayers` arrays** themselves.

**What agents see in prompts:**
```
Spirituality: devout (5/10 answered) [has seen visions]
```

**What they SHOULD see:**
```
Spirituality: devout (5/10 answered)
Recent Visions:
  - Vision (clarity: 0.9): "Build a workbench to craft better tools"
  - Vision (clarity: 0.5): "You feel a presence watching over you"
Recent Prayers:
  - Guidance prayer: "What should I build next?" (answered via vision)
```

### UI/UX Confusion

**Two Overlapping Panels:**

1. **VisionComposerPanel** (`VisionComposerPanel.ts:166-1000`):
   - Complex vision composition (symbols, imagery, intensity)
   - Targets, message content, cost preview
   - Emits `divine_power:request` events
   - Good for elaborate visions but overkill for simple whispers

2. **DivinePowersPanel** (`DivinePowersPanel.ts:132-919`):
   - Lists all divine powers with belief costs
   - Has individual "invoke" buttons for whisper/dream/vision
   - Shows parameter modal for message input
   - Emits `divine_power:request` events

**Problems:**
- ❌ Duplicate functionality (both can send visions)
- ❌ No clear workflow: "Tell Alice to build workbench" → which panel?
- ❌ Prayers invisible - no UI showing follower prayer queue
- ❌ No direct prayer response flow

## Implementation Plan

### Phase 1: Fix Agent Perception (CRITICAL - BLOCKING) 🔴

**File:** `custom_game_engine/packages/introspection/src/schemas/cognitive/SpiritualSchema.ts`

**Add fields to schema:**

```typescript
// After line 307 (after religiousLeader field)
visions: {
  type: 'array',
  required: true,
  default: [],
  description: 'Recent visions received from deity',
  displayName: 'Visions',
  visibility: {
    llm: true,      // ← Makes visions appear in prompts!
    agent: true,
    player: true,
    user: false,
    dev: true,
  },
  ui: {
    widget: 'list',
    group: 'visions',
    order: 12,
  },
  llm: {
    summarize: (visions: Vision[]) => {
      if (!visions || visions.length === 0) return null;
      const recent = visions.slice(0, 3); // Last 3 visions
      return recent.map(v =>
        `Vision (clarity: ${(v.clarity * 100).toFixed(0)}%): "${v.content}"`
      ).join('\n');
    },
    priority: 8, // High priority - divine messages matter!
  },
  mutable: true,
},

prayers: {
  type: 'array',
  required: true,
  default: [],
  description: 'Recent prayers made to deity',
  displayName: 'Prayers',
  visibility: {
    llm: true,      // ← Makes prayers appear in prompts!
    agent: true,
    player: true,
    user: false,
    dev: true,
  },
  ui: {
    widget: 'list',
    group: 'prayers',
    order: 25,
  },
  llm: {
    summarize: (prayers: Prayer[]) => {
      if (!prayers || prayers.length === 0) return null;
      const recent = prayers.slice(0, 5).reverse(); // Last 5, oldest first
      return recent.map(p => {
        const status = p.answered ? `✓ ${p.responseType}` : 'unanswered';
        return `${p.type} (${status}): "${p.content}"`;
      }).join('\n');
    },
    priority: 7,
  },
  mutable: true,
},

doubts: {
  type: 'array',
  required: true,
  default: [],
  description: 'Active doubts weakening faith',
  displayName: 'Doubts',
  visibility: {
    llm: true,
    agent: true,
    player: true,
    user: false,
    dev: true,
  },
  ui: {
    widget: 'list',
    group: 'faith',
    order: 7,
  },
  llm: {
    summarize: (doubts: Doubt[]) => {
      if (!doubts || doubts.length === 0) return null;
      const active = doubts.filter(d => !d.resolved);
      if (active.length === 0) return null;
      return active.map(d =>
        `Doubt (severity: ${(d.severity * 100).toFixed(0)}%): ${d.reason}`
      ).join('\n');
    },
    priority: 6,
  },
  mutable: true,
},
```

**Update llm.summarize function:**
```typescript
llm: {
  promptSection: 'spirituality',
  summarize: (data: SpiritualComponent) => {
    const parts: string[] = [];

    // Faith level
    const faithLevel = data.faith >= 0.8 ? 'devout' :
                       data.faith >= 0.5 ? 'faithful' :
                       data.faith >= 0.2 ? 'questioning' : 'doubting';
    parts.push(`Faith: ${faithLevel} (${(data.faith * 100).toFixed(0)}%)`);

    // Prayer stats
    if (data.totalPrayers > 0) {
      parts.push(`Prayers: ${data.answeredPrayers}/${data.totalPrayers} answered`);
    }

    // Crisis warning
    if (data.crisisOfFaith) {
      parts.push('[CRISIS OF FAITH]');
    }

    return parts.join(' | ');
  },
  priority: 7,
},
```

**Expected outcome:**
- Agents see vision content in their prompts
- Agents can reference prayers they've made
- Agents react to divine guidance appropriately

---

### Phase 2: Unified Divine Communication Panel 🟡

**Create:** `custom_game_engine/packages/renderer/src/DivineCommunicationPanel.ts`

**Design:**
```
┌─ Divine Communication ─────────────────────────────────┐
│ Belief: 450 (+12/hr)                                    │
│ [ Followers ]  [ Prayers ]  [ Send Message ]           │
├────────────────────────────────────────────────────────┤
│ FOLLOWERS TAB:                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Alice (Faith: 85%) - Farmer                        │ │
│ │   Last prayer: 2m ago - "What should I build?"     │ │
│ │   Recent visions: 3 sent, 3 received               │ │
│ │   [View Details] [Send Vision]                     │ │
│ ├────────────────────────────────────────────────────┤ │
│ │ Bob (Faith: 62%) - Builder                         │ │
│ │   Last prayer: never                                │ │
│ │   Recent visions: 1 sent, 1 received               │ │
│ │   [View Details] [Send Vision]                     │ │
│ └────────────────────────────────────────────────────┘ │
│                                                         │
│ PRAYERS TAB:                                            │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Alice - 2 minutes ago                              │ │
│ │ Type: Guidance | Urgency: Earnest                  │ │
│ │ "Please guide me on what to build next. I have    │ │
│ │  wood and stone but I'm not sure what the village │ │
│ │  needs most."                                      │ │
│ │                                                     │ │
│ │ [Whisper] [Clear Vision] [Sign] [Remain Silent]   │ │
│ ├────────────────────────────────────────────────────┤ │
│ │ Bob - 1 hour ago                                   │ │
│ │ Type: Gratitude | Urgency: Routine                │ │
│ │ "Thank you for the good harvest this season."     │ │
│ │                                                     │ │
│ │ [Acknowledge] [Blessed] [Already Answered]         │ │
│ └────────────────────────────────────────────────────┘ │
│                                                         │
│ SEND MESSAGE TAB:                                       │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Target: [Alice ▼]                                  │ │
│ │                                                     │ │
│ │ Message Type:                                       │ │
│ │ ( ) Whisper (5 belief) - Vague feeling            │ │
│ │ (•) Dream (10 belief) - Sleep vision               │ │
│ │ ( ) Clear Vision (50 belief) - Unmistakable       │ │
│ │                                                     │ │
│ │ Message:                                            │ │
│ │ ┌──────────────────────────────────────────────┐   │ │
│ │ │ Build a workbench to craft better tools     │   │ │
│ │ └──────────────────────────────────────────────┘   │ │
│ │                                                     │ │
│ │ Clarity: [===========|====] Vivid                  │ │
│ │                                                     │ │
│ │ Cost: 15 belief                                     │ │
│ │ After: 435 belief remaining                         │ │
│ │                                                     │ │
│ │           [SEND VISION]                             │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

**Features:**
- **Followers Tab**: See all believers, faith levels, prayer activity
- **Prayers Tab**: Queue of unanswered prayers with quick response buttons
- **Send Message**: Simple interface for sending visions/whispers
- Replaces complex VisionComposerPanel for player deity communication

---

### Phase 3: Update DivinePowersPanel 🟢

**File:** `custom_game_engine/packages/renderer/src/DivinePowersPanel.ts`

**Changes:**
1. Remove parametric power invoke buttons (whisper, dream_hint, clear_vision)
2. Keep non-communication powers (miracles, blessings, multiverse)
3. Add note: "Use Divine Communication panel to send messages to followers"
4. Keep belief bar, stats, tier unlocking

**Scope:**
- DivinePowers = showing power tiers, costs, non-communication abilities
- DivineCommunication = talking to followers, responding to prayers

---

### Phase 4: Register New Panel 🟢

**File:** `custom_game_engine/packages/renderer/src/WindowManager.ts`

**Add to panel registry:**
```typescript
import { DivineCommunicationPanel } from './DivineCommunicationPanel.js';

// In createDefaultPanels()
panels.set('divine-communication', new DivineCommunicationPanel());
```

**Add menu button:**
- Location: Deity/God interface menu
- Label: "Divine Communication"
- Hotkey: Could reuse VisionComposer's hotkey

---

## Testing Plan

### Test 1: Agent Vision Perception ✅
1. Start game, select agent
2. Use DivineCommunication panel → send clear vision "Build a workbench"
3. Check agent's LLM prompt (via dashboard or logs)
4. **Expected:** Vision content appears in spirituality section
5. Agent should reference vision when deciding what to do

### Test 2: Prayer Response Flow ✅
1. Agent prays (wait for automatic prayer or trigger manually)
2. Prayer appears in DivineCommunication → Prayers tab
3. Click "Clear Vision" on prayer
4. Enter response message
5. **Expected:** Agent receives vision, prayer marked as answered, faith increases

### Test 3: Follower Management ✅
1. DivineCommunication → Followers tab
2. See all believers with faith levels
3. Select believer → view their prayer history
4. Send direct vision from follower view
5. **Expected:** Message sent, tracked in deity's sentVisions

### Test 4: UI Coherence ✅
1. DivinePowers shows non-communication powers only
2. DivineCommunication handles all follower interaction
3. No duplicate "send vision" functionality
4. Clear workflow: prayer arrives → respond in Prayers tab

---

## Migration Notes

**Deprecation:**
- `VisionComposerPanel`: Can be removed or kept for advanced vision composition
- If kept, make it accessible from DivineCommunication as "Advanced Vision Composer"

**Backward Compatibility:**
- Existing visions in saves will work (arrays are already there)
- Schema change is additive (adds visibility/summarization)
- No breaking changes to components or systems

---

## Success Criteria

1. ✅ Agent prompts show vision content and prayer history
2. ✅ Clear UI workflow: see prayers → respond → agent receives message
3. ✅ No duplicate panels for same functionality
4. ✅ Player can easily: "Tell Alice to build a workbench" in 3 clicks
5. ✅ Divine communication is main control lever for gameplay

---

## Implementation Order

1. **SpiritualSchema** (30 min) - Adds visions/prayers to prompts - CRITICAL
2. **DivineCommunicationPanel** (2-3 hours) - New unified panel
3. **DivinePowersPanel cleanup** (30 min) - Remove redundant buttons
4. **WindowManager registration** (15 min) - Wire up new panel
5. **Testing** (1 hour) - Verify end-to-end flow

**Total Estimate:** 4-5 hours

---

## Files Changed

1. `packages/introspection/src/schemas/cognitive/SpiritualSchema.ts` - Add visions/prayers fields
2. `packages/renderer/src/DivineCommunicationPanel.ts` - NEW - Unified panel
3. `packages/renderer/src/DivinePowersPanel.ts` - Remove communication buttons
4. `packages/renderer/src/WindowManager.ts` - Register new panel
5. `packages/renderer/src/types/WindowTypes.ts` - Export new panel (if needed)

---

## Notes

- Backend (DivinePowerSystem, VisionDeliverySystem) needs NO changes - already works!
- This is purely a UI/UX + LLM prompt visibility fix
- Prayer system already exists, just needs UI exposure
- Vision content storage already works, just needs prompt inclusion
