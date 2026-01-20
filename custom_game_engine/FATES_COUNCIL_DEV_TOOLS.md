# Fates Council Dev Tools

Comprehensive testing infrastructure for FatesCouncilSystem without needing library/university tech unlock.

## Quick Start

### 1. Enable System

**Browser Console:**
```javascript
game.enableFatesCouncil()
```

**URL Parameter:**
```
http://localhost:3000?enable_fates=true
```

**Environment Variable (.env):**
```
VITE_DEV_ENABLE_FATES=true
```

### 2. Create Test Scenario

```javascript
// Create mock exotic events
game.createMockExoticEvent('deity_relationship_critical')
game.createMockExoticEvent('political_elevation')

// Trigger council immediately
game.triggerFatesCouncil({ mockEvents: true })
```

### 3. View Results

```javascript
// Check status
game.getFatesStatus()

// View council history
game.getFatesHistory()

// See exotic events
game.getExoticEvents()
```

## Console Commands (`window.game`)

### System Management

#### `game.enableFatesCouncil()`
Force enable FatesCouncilSystem (bypass tech unlock).

**Returns:** `boolean` - Success status

**Example:**
```javascript
game.enableFatesCouncil()
// → [FatesCouncil] System force-enabled: true
```

---

### Council Triggering

#### `game.triggerFatesCouncil(options?)`
Manually trigger a Fates council meeting.

**Parameters:**
- `options.forceLLM` (boolean) - Use real LLM even if not configured
- `options.mockEvents` (boolean) - Create mock exotic events first

**Returns:** `boolean` - Success status

**Examples:**
```javascript
// Basic trigger
game.triggerFatesCouncil()

// With mock events
game.triggerFatesCouncil({ mockEvents: true })

// Force LLM usage
game.triggerFatesCouncil({ forceLLM: true, mockEvents: true })
```

---

### History & Status

#### `game.getFatesHistory(limit?)`
View recent council meetings and decisions.

**Parameters:**
- `limit` (number, default: 5) - Number of councils to retrieve

**Returns:** `Array<CouncilRecord>` - Council history

**Example:**
```javascript
game.getFatesHistory(10)
// Logs and returns last 10 councils
```

---

#### `game.getFatesStatus()`
Check if FatesCouncilSystem is enabled and configured.

**Returns:** `object` - Status information

**Example:**
```javascript
game.getFatesStatus()
// → {
//   available: true,
//   enabled: true,
//   hasLLMProvider: true,
//   councilInProgress: false,
//   lastCouncilDay: 5,
//   currentDay: 6
// }
```

---

### Mock Event Generation

#### `game.createMockExoticEvent(eventType, entityId?)`
Create a fake exotic event for testing.

**Parameters:**
- `eventType` (string) - One of:
  - `'deity_relationship_critical'`
  - `'multiverse_invasion'`
  - `'paradigm_conflict'`
  - `'dimensional_encounter'`
  - `'political_elevation'`
  - `'time_paradox'`
  - `'prophecy_given'`
  - `'champion_chosen'`
- `entityId` (string, optional) - Affected entity (random if omitted)

**Returns:** `boolean` - Success status

**Example:**
```javascript
game.createMockExoticEvent('deity_relationship_critical')
game.createMockExoticEvent('political_elevation', 'agent-123')
```

---

#### `game.getExoticEvents(limit?)`
List recent exotic events that could trigger councils.

**Parameters:**
- `limit` (number, default: 10) - Number of events to show

**Returns:** `Array<ExoticEvent>` - Recent events

**Example:**
```javascript
game.getExoticEvents(5)
// → [
//   {
//     type: 'deity_relationship_critical',
//     entityId: 'agent-abc',
//     description: "Agent's relationship with a deity has reached critical levels",
//     tick: 123456,
//     severity: 0.8
//   },
//   ...
// ]
```

---

### Epic Plot Testing

#### `game.setWisdom(entityId, wisdom)`
Set soul wisdom level to test epic assignments.

**Parameters:**
- `entityId` (string) - Soul entity ID
- `wisdom` (number) - Wisdom level (0-200)

**Returns:** `boolean` - Success status

**Example:**
```javascript
game.setWisdom('soul-123', 100)
// → [FatesCouncil] Set wisdom of soul-123 to 100
```

---

#### `game.getEpicEligible()`
List souls that meet epic plot criteria.

**Criteria:**
- Wisdom >= 100
- 5+ completed large/epic plots
- No active epic plot

**Returns:** `Array<EpicEligibleSoul>` - Eligible souls

**Example:**
```javascript
game.getEpicEligible()
// → [
//   {
//     entityId: 'soul-abc',
//     name: 'Eldric the Wise',
//     wisdom: 120,
//     completedLargePlots: 7,
//     hasActiveEpic: false
//   },
//   ...
// ]
```

---

### Utility Commands

#### `game.clearFatesCooldown()`
Reset last council day to allow immediate re-run.

**Returns:** `boolean` - Success status

**Example:**
```javascript
game.clearFatesCooldown()
// → [FatesCouncilSystem] Council cooldown cleared - council can run immediately
```

---

### Event Trigger Shortcuts

#### `game.triggerDeityConflict(entityId?)`
Emit deity_relationship_critical event.

**Parameters:**
- `entityId` (string, optional) - Target entity

**Example:**
```javascript
game.triggerDeityConflict()
// → [FatesCouncil] Deity conflict event emitted. Council will process on next evening.
```

---

#### `game.triggerParadigmClash(entityId?)`
Emit magic:paradigm_conflict_detected event.

**Parameters:**
- `entityId` (string, optional) - Target entity

**Example:**
```javascript
game.triggerParadigmClash('agent-123')
```

---

#### `game.triggerPoliticalElevation(entityId?)`
Emit governance:political_elevation event.

**Parameters:**
- `entityId` (string, optional) - Target entity

**Example:**
```javascript
game.triggerPoliticalElevation()
```

---

## Admin Dashboard Endpoints

Access via http://localhost:8766/admin → "Fates Council" tab

### Queries

#### `fates-status`
Check system status.

**URL:** `http://localhost:8766/admin/queries/fates-status?format=json`

**Response:**
```json
{
  "enabled": true,
  "llmConfigured": true,
  "lastCouncilDay": 5,
  "currentDay": 6
}
```

---

#### `council-history`
View recent councils.

**URL:** `http://localhost:8766/admin/queries/council-history?limit=5&format=json`

**Parameters:**
- `limit` (number, default: 5) - Number of councils

---

#### `exotic-events`
List recent exotic events.

**URL:** `http://localhost:8766/admin/queries/exotic-events?limit=10&format=json`

**Parameters:**
- `limit` (number, default: 10) - Number of events

---

#### `epic-eligible`
List epic-eligible souls.

**URL:** `http://localhost:8766/admin/queries/epic-eligible?format=json`

---

### Actions

#### `enable-fates`
Force enable system.

**URL:** `http://localhost:8766/admin/actions/enable-fates`

**Method:** POST

**Example:**
```bash
curl -X POST http://localhost:8766/admin/actions/enable-fates
```

---

#### `trigger-council`
Manually trigger council.

**URL:** `http://localhost:8766/admin/actions/trigger-council`

**Method:** POST

**Body:**
```json
{
  "forceLLM": false,
  "mockEvents": true
}
```

**Example:**
```bash
curl -X POST http://localhost:8766/admin/actions/trigger-council \
  -H "Content-Type: application/json" \
  -d '{"mockEvents": true}'
```

---

#### `grant-wisdom`
Set wisdom level.

**URL:** `http://localhost:8766/admin/actions/grant-wisdom`

**Method:** POST

**Body:**
```json
{
  "entityId": "soul-123",
  "wisdom": 100
}
```

---

#### `emit-mock-event`
Create mock event.

**URL:** `http://localhost:8766/admin/actions/emit-mock-event`

**Method:** POST

**Body:**
```json
{
  "eventType": "deity_relationship_critical",
  "entityId": "agent-123"
}
```

**Event Types:**
- `deity_relationship_critical`
- `multiverse_invasion`
- `paradigm_conflict`
- `dimensional_encounter`
- `political_elevation`
- `time_paradox`
- `prophecy_given`
- `champion_chosen`

---

#### `clear-cooldown`
Reset council cooldown.

**URL:** `http://localhost:8766/admin/actions/clear-cooldown`

**Method:** POST

**Example:**
```bash
curl -X POST http://localhost:8766/admin/actions/clear-cooldown
```

---

## Testing Workflows

### Test 1: Basic Council Trigger

```javascript
// 1. Enable system
game.enableFatesCouncil()

// 2. Create test events
game.triggerDeityConflict()
game.triggerPoliticalElevation()

// 3. Trigger council
game.triggerFatesCouncil()

// 4. View results
game.getFatesHistory(1)
```

---

### Test 2: Epic Plot Assignment

```javascript
// 1. Find an agent
const agents = game.world.query().with('identity').executeEntities()
const agent = agents[0]

// 2. Grant high wisdom
game.setWisdom(agent.id, 120)

// 3. Check eligibility
game.getEpicEligible()

// 4. Trigger epic scan (or wait ~40 min real-time)
// Epic scans happen automatically every 50,000 ticks
```

---

### Test 3: Event → Council Flow

```javascript
// 1. Enable and clear cooldown
game.enableFatesCouncil()
game.clearFatesCooldown()

// 2. Create exotic events
game.createMockExoticEvent('deity_relationship_critical')
game.createMockExoticEvent('paradigm_conflict')
game.createMockExoticEvent('political_elevation')

// 3. Check events were tracked
game.getExoticEvents()

// 4. Wait for evening OR trigger manually
game.triggerFatesCouncil()

// 5. View council decisions
game.getFatesHistory(1)
```

---

## Implementation Details

### Files Modified

1. **`packages/core/src/admin/capabilities/fates-council.ts`** (NEW)
   - Admin dashboard capability
   - Queries: status, history, events, epic-eligible
   - Actions: enable, trigger, grant-wisdom, emit-event, clear-cooldown

2. **`packages/core/src/admin/capabilities/index.ts`**
   - Registered fates-council capability

3. **`packages/core/src/plot/FatesCouncilSystem.ts`**
   - Added council history tracking (max 10 councils)
   - Added dev tool methods:
     - `getCouncilHistory()`
     - `getRecentExoticEvents()`
     - `getEpicEligibleSouls()`
     - `emitMockExoticEvent()`
     - `clearCouncilCooldown()`
     - `triggerCouncilNow()`

4. **`demo/src/main.ts`**
   - Enhanced window.game with 11 new commands
   - Added early enable option (URL param / env var)

### Council History Storage

```typescript
private councilHistory: Array<{
  tick: number;
  day: number;
  transcript: ConversationExchange[];
  decisions: FatesDecision;
  exoticEventCount: number;
  storyHookCount: number;
}> = [];
```

- Stores last 10 councils
- Auto-saves after each council completion
- Accessible via `game.getFatesHistory()`

---

## Safety Features

- All dev tools are safe (no data corruption)
- Mock events use realistic event structure
- History is bounded (max 10 councils)
- Commands check for system availability
- Clear error messages for missing dependencies

---

## Example Session

```javascript
// === SETUP ===
game.enableFatesCouncil()
// → System force-enabled: true

// === CREATE TEST SCENARIO ===
game.triggerDeityConflict()
game.triggerParadigmClash()
game.triggerPoliticalElevation()
// → 3 mock events created

game.getExoticEvents()
// → Shows 3 events with descriptions

// === TRIGGER COUNCIL ===
game.triggerFatesCouncil()
// → Council meeting begins...

// === CHECK RESULTS ===
game.getFatesHistory(1)
// → Shows:
//   - Day 6 (tick 123456)
//   - Exotic Events: 3
//   - Story Hooks: 3
//   - Decisions Summary: "..."
//   - Plot Assignments: [...]

// === VERIFY STATUS ===
game.getFatesStatus()
// → {
//   enabled: true,
//   hasLLMProvider: true,
//   councilInProgress: false,
//   lastCouncilDay: 6,
//   currentDay: 6
// }
```

---

## Troubleshooting

### System not available
```javascript
game.enableFatesCouncil()
// ERROR: System not available (requires LLM provider during initialization)
```

**Solution:** LLM provider must be configured when system is initialized. Check that LLM is enabled in game settings.

---

### System disabled
```javascript
game.triggerFatesCouncil()
// ERROR: System is disabled. Use game.enableFatesCouncil() to force enable.
```

**Solution:** Run `game.enableFatesCouncil()` first.

---

### No council history
```javascript
game.getFatesHistory()
// → []
```

**Solution:** Council hasn't run yet. Trigger with `game.triggerFatesCouncil()`.

---

### No epic eligible souls
```javascript
game.getEpicEligible()
// → []
```

**Solution:** Grant wisdom: `game.setWisdom(agentId, 100)`. Also need 5+ completed large plots.

---

## Related Documentation

- **FatesCouncilSystem:** `packages/core/src/plot/FatesCouncilSystem.ts`
- **Plot System:** `METASYSTEMS_GUIDE.md` → Plot Lines section
- **Admin Dashboard:** `packages/core/src/admin/README.md`
- **Console API:** `DEBUG_API.md`
