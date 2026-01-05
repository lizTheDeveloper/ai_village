# Actions API - Game Dev Tools for Testing

This skill provides comprehensive documentation for using the Metrics Server Actions API to test and control the AI Village game. LLM agents should use these tools to spawn entities, manipulate game state, and verify features.

## Overview

The Actions API allows you to:
- Spawn agents and entities
- Teleport agents to test locations
- Manipulate agent stats (needs, skills, spells)
- Create and control deities
- Control game speed and pause state
- Give items to agents

**Base URL:** `http://localhost:8766/api/actions/`

All endpoints use POST with JSON payloads.

## Available Actions

### 1. spawn-agent - Create New Agents

Spawns a new agent (LLM-controlled or wandering AI).

```bash
curl -X POST http://localhost:8766/api/actions/spawn-agent \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TestAgent",
    "x": 100,
    "y": 100,
    "useLLM": false,
    "speed": 2.0
  }'
```

**Parameters:**
- `x` (number, required): X coordinate
- `y` (number, required): Y coordinate
- `name` (string, optional): Agent name
- `useLLM` (boolean, optional): Use LLM for decisions (default: false)
- `speed` (number, optional): Movement speed (default: 2.0)
- `believedDeity` (string, optional): Deity ID to worship

**Returns:** `{ agentId, x, y, useLLM }`

### 2. teleport - Move Agents

Instantly teleports an agent to a new location.

```bash
curl -X POST http://localhost:8766/api/actions/teleport \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_ID>",
    "x": 200,
    "y": 200
  }'
```

**Parameters:**
- `agentId` (string, required): Entity ID
- `x` (number, required): Target X
- `y` (number, required): Target Y

**Returns:** `{ agentId, x, y }`

### 3. set-need - Modify Agent Needs

Sets agent needs (hunger, energy, health, thirst).

```bash
curl -X POST http://localhost:8766/api/actions/set-need \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_ID>",
    "need": "hunger",
    "value": 0.5
  }'
```

**Parameters:**
- `agentId` (string, required): Entity ID
- `need` (string, required): One of: "hunger", "energy", "health", "thirst"
- `value` (number, required): 0.0 to 1.0 (1.0 = full/healthy)

**Returns:** `{ agentId, need, value }`

### 4. give-item - Add Items to Inventory

Gives items to an agent's inventory.

```bash
curl -X POST http://localhost:8766/api/actions/give-item \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_ID>",
    "itemType": "wood",
    "amount": 10
  }'
```

**Parameters:**
- `agentId` (string, required): Entity ID
- `itemType` (string, required): Item ID (e.g., "wood", "stone", "berry")
- `amount` (number, optional): Quantity (default: 1)

**Returns:** `{ agentId, itemType, amount }`

### 5. set-skill - Modify Agent Skills

Sets an agent's skill level (0-5).

```bash
curl -X POST http://localhost:8766/api/actions/set-skill \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_ID>",
    "skill": "combat",
    "level": 3
  }'
```

**Parameters:**
- `agentId` (string, required): Entity ID
- `skill` (string, required): Skill name (e.g., "combat", "farming", "crafting")
- `level` (number, required): 0-5 (integer)

**Returns:** `{ agentId, skill, level }`

### 6. trigger-behavior - Force Agent Behavior

Forces an agent into a specific behavior.

```bash
curl -X POST http://localhost:8766/api/actions/trigger-behavior \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_ID>",
    "behavior": "gather"
  }'
```

**Parameters:**
- `agentId` (string, required): Entity ID
- `behavior` (string, required): Behavior name

**Returns:** `{ agentId, behavior }`

### 7. grant-spell - Give Spells to Agents

Grants a spell to an agent with magic component.

```bash
curl -X POST http://localhost:8766/api/actions/grant-spell \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_ID>",
    "spellId": "fireball"
  }'
```

**Parameters:**
- `agentId` (string, required): Entity ID
- `spellId` (string, required): Spell ID

**Returns:** `{ agentId, spellId }`

### 8. create-deity - Spawn New Deity

Creates a new deity entity.

```bash
curl -X POST http://localhost:8766/api/actions/create-deity \
  -H "Content-Type: application/json" \
  -d '{
    "name": "God of Testing",
    "controller": "dormant"
  }'
```

**Parameters:**
- `name` (string, required): Deity name
- `controller` (string, optional): "player", "ai", or "dormant" (default: "dormant")

**Returns:** `{ deityId, name, controller }`

### 9. add-belief - Add Belief Points

Adds belief points to a deity.

```bash
curl -X POST http://localhost:8766/api/actions/add-belief \
  -H "Content-Type: application/json" \
  -d '{
    "deityId": "<DEITY_ID>",
    "amount": 1000
  }'
```

**Parameters:**
- `deityId` (string, required): Deity entity ID
- `amount` (number, required): Belief points to add

**Returns:** `{ deityId, amount, newTotal }`

### 10. set-speed - Control Game Speed

Changes the game speed multiplier.

```bash
curl -X POST http://localhost:8766/api/actions/set-speed \
  -H "Content-Type: application/json" \
  -d '{"speed": 2.0}'
```

**Parameters:**
- `speed` (number, required): 0.1 to 10.0 (1.0 = normal speed)

**Returns:** `{ speed }`

### 11. pause - Pause/Resume Game

Pauses or resumes the game simulation.

```bash
curl -X POST http://localhost:8766/api/actions/pause \
  -H "Content-Type: application/json" \
  -d '{"paused": true}'
```

**Parameters:**
- `paused` (boolean, required): true to pause, false to resume

**Returns:** `{ paused }`

### 12. spawn-city - Spawn a Village/City

Spawns a complete settlement with buildings and agents.

```bash
curl -X POST http://localhost:8766/api/actions/spawn-city \
  -H "Content-Type: application/json" \
  -d '{
    "template": "medieval_village",
    "x": 0,
    "y": 0,
    "name": "TestVillage",
    "agentCount": 5,
    "useLLM": false
  }'
```

**Parameters:**
- `template` (string, required): City template name
- `x` (number, required): Center X coordinate
- `y` (number, required): Center Y coordinate
- `name` (string, optional): City name
- `agentCount` (number, optional): Number of agents
- `useLLM` (boolean, optional): Use LLM for agents (default: true)

**Returns:** City spawn result

## Query API (Read Game State)

**Base URL:** `http://localhost:8766/api/live/`

### Get All Agents

```bash
curl "http://localhost:8766/api/live/entities"
```

Returns: `{ entities: [ { id, name, type, position } ] }`

### Get Entity Details

```bash
curl "http://localhost:8766/api/live/entity?id=<ENTITY_ID>"
```

Returns: Full entity state with all components

### Get Magic System Info

```bash
curl "http://localhost:8766/api/live/magic"
```

Returns: Magic users, paradigms, spells, corruption stats

### Get Divinity Info

```bash
curl "http://localhost:8766/api/live/divinity"
```

Returns: All deities, belief stats, prayer data

## Testing Workflow Examples

### Example 1: Test Agent Spawn and Movement

```bash
# 1. Spawn an agent
AGENT_ID=$(curl -X POST http://localhost:8766/api/actions/spawn-agent \
  -H "Content-Type: application/json" \
  -d '{"name": "Tester", "x": 0, "y": 0}' | jq -r '.agentId')

# 2. Give the agent items
curl -X POST http://localhost:8766/api/actions/give-item \
  -H "Content-Type: application/json" \
  -d "{\"agentId\": \"$AGENT_ID\", \"itemType\": \"wood\", \"amount\": 50}"

# 3. Set skills
curl -X POST http://localhost:8766/api/actions/set-skill \
  -H "Content-Type: application/json" \
  -d "{\"agentId\": \"$AGENT_ID\", \"skill\": \"combat\", \"level\": 5}"

# 4. Teleport to test location
curl -X POST http://localhost:8766/api/actions/teleport \
  -H "Content-Type: application/json" \
  -d "{\"agentId\": \"$AGENT_ID\", \"x\": 100, \"y\": 100}"

# 5. Verify agent state
curl "http://localhost:8766/api/live/entity?id=$AGENT_ID" | jq '.'
```

### Example 2: Test Deity System

```bash
# 1. Create deity
DEITY_ID=$(curl -X POST http://localhost:8766/api/actions/create-deity \
  -H "Content-Type: application/json" \
  -d '{"name": "Test God", "controller": "dormant"}' | jq -r '.deityId')

# 2. Add belief points
curl -X POST http://localhost:8766/api/actions/add-belief \
  -H "Content-Type: application/json" \
  -d "{\"deityId\": \"$DEITY_ID\", \"amount\": 5000}"

# 3. Spawn believer
BELIEVER_ID=$(curl -X POST http://localhost:8766/api/actions/spawn-agent \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Believer\", \"x\": 0, \"y\": 0, \"believedDeity\": \"$DEITY_ID\"}" | jq -r '.agentId')

# 4. Check divinity stats
curl "http://localhost:8766/api/live/divinity" | jq '.'
```

### Example 3: Test Magic System

```bash
# 1. Spawn agent
MAGE_ID=$(curl -X POST http://localhost:8766/api/actions/spawn-agent \
  -H "Content-Type: application/json" \
  -d '{"name": "Mage", "x": 50, "y": 50}' | jq -r '.agentId')

# 2. Grant spell
curl -X POST http://localhost:8766/api/actions/grant-spell \
  -H "Content-Type: application/json" \
  -d "{\"agentId\": \"$MAGE_ID\", \"spellId\": \"fireball\"}"

# 3. Check magic system
curl "http://localhost:8766/api/live/magic" | jq '.magicUsers'
```

## Tips for LLM Agents

1. **Always verify actions** by querying entity state after mutations
2. **Use `jq`** to parse JSON responses and extract IDs
3. **Chain commands** with bash variables to test workflows
4. **Speed up testing** with `set-speed` action
5. **Pause for inspection** using `pause` action
6. **Start simple** - spawn one agent, test one feature
7. **Check server status** with `curl http://localhost:8766/api/live/status`

## Common Issues

**"No game client connected"**
- Server is running but game hasn't started
- Restart with `./start.sh server`

**"Entity not found"**
- Entity ID is invalid or entity was removed
- Query `/api/live/entities` to get valid IDs

**Ports in use**
- Kill existing servers: `./start.sh kill`
- Force kill: `lsof -ti:8766,8765 | xargs kill -9`

## Server URLs

- **Metrics Server:** http://localhost:8766
- **Dashboard:** http://localhost:8766/dashboard
- **Actions API:** http://localhost:8766/api/actions/*
- **Live Query API:** http://localhost:8766/api/live/*
