# GameIntrospectionAPI - Admin Dashboard Curl Examples

Quick reference for testing the introspection API via admin dashboard endpoints.

## Prerequisites

```bash
# Start game with admin dashboard
cd custom_game_engine && ./start.sh

# Admin dashboard runs on: http://localhost:8766/admin
# Metrics API runs on: http://localhost:8766
```

## Entity Queries

### Get Single Entity
```bash
curl "http://localhost:8766/admin/queries/entity?id=ENTITY_UUID&format=json"
```

### Query Entities with Filters
```bash
curl -X POST "http://localhost:8766/admin/queries/entities" \
  -H "Content-Type: application/json" \
  -d '{
    "withComponents": ["agent", "needs"],
    "limit": 10,
    "activeOnly": true
  }'
```

### Query Entities in Spatial Bounds
```bash
curl -X POST "http://localhost:8766/admin/queries/entities" \
  -H "Content-Type: application/json" \
  -d '{
    "bounds": {
      "minX": 0, "minY": 0,
      "maxX": 100, "maxY": 100
    },
    "limit": 50
  }'
```

## Component Schemas

### Get Schema for Component Type
```bash
curl "http://localhost:8766/admin/queries/component-schema?type=needs&format=json"
```

### List All Schemas
```bash
curl "http://localhost:8766/admin/queries/component-schemas?format=json"
```

### List Schemas by Category
```bash
curl "http://localhost:8766/admin/queries/component-schemas?category=agent&format=json"
```

## Mutations

### Mutate Single Field
```bash
curl -X POST "http://localhost:8766/admin/actions/mutate-field" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "ENTITY_UUID",
    "componentType": "needs",
    "field": "hunger",
    "value": 0.5,
    "source": "admin"
  }'
```

### Batch Mutations
```bash
curl -X POST "http://localhost:8766/admin/actions/mutate-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "mutations": [
      {
        "entityId": "ENTITY_UUID",
        "componentType": "needs",
        "field": "hunger",
        "value": 0.8
      },
      {
        "entityId": "ENTITY_UUID",
        "componentType": "needs",
        "field": "thirst",
        "value": 0.7
      }
    ]
  }'
```

### Undo Last Mutation
```bash
curl -X POST "http://localhost:8766/admin/actions/undo"
```

### Redo Undone Mutation
```bash
curl -X POST "http://localhost:8766/admin/actions/redo"
```

## Skill Management

### Grant Skill XP
```bash
curl -X POST "http://localhost:8766/admin/actions/grant-skill-xp" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "AGENT_UUID",
    "skillName": "farming",
    "amount": 100
  }'
```

### Get Agent Skills
```bash
curl "http://localhost:8766/admin/queries/agent-skills?agentId=AGENT_UUID&format=json"
```

### Award Discovery XP
```bash
curl -X POST "http://localhost:8766/admin/actions/award-discovery-xp" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "AGENT_UUID",
    "discoveryType": "new_plant_species",
    "amount": 50
  }'
```

## Building Management

### Place Building
```bash
curl -X POST "http://localhost:8766/admin/actions/place-building" \
  -H "Content-Type: application/json" \
  -d '{
    "blueprintId": "house",
    "x": 50,
    "y": 50,
    "z": 1,
    "options": {
      "rotation": 0,
      "ownerId": "AGENT_UUID"
    }
  }'
```

### List All Buildings
```bash
curl "http://localhost:8766/admin/queries/buildings?format=json"
```

### List Building Blueprints
```bash
curl "http://localhost:8766/admin/queries/building-blueprints?format=json"
```

## Behavioral Control

### Trigger Behavior
```bash
# Exploration behavior
curl -X POST "http://localhost:8766/admin/actions/trigger-behavior" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "AGENT_UUID",
    "behaviorType": "explore",
    "priority": 10,
    "parameters": {
      "targetX": 100,
      "targetY": 100
    }
  }'

# Gathering behavior
curl -X POST "http://localhost:8766/admin/actions/trigger-behavior" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "AGENT_UUID",
    "behaviorType": "gather",
    "priority": 8,
    "parameters": {
      "resourceType": "wood"
    }
  }'

# Crafting behavior
curl -X POST "http://localhost:8766/admin/actions/trigger-behavior" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "AGENT_UUID",
    "behaviorType": "craft",
    "priority": 7,
    "parameters": {
      "recipe": "wooden_plank"
    }
  }'
```

### Get Active Behaviors
```bash
curl "http://localhost:8766/admin/queries/active-behaviors?agentId=AGENT_UUID&format=json"
```

### Cancel Behavior
```bash
curl -X POST "http://localhost:8766/admin/actions/cancel-behavior" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "AGENT_UUID",
    "behaviorId": "BEHAVIOR_UUID"
  }'
```

## Observability

### Watch Entity (WebSocket Required)
```bash
# Note: Requires WebSocket connection - use browser console instead
# game.introspection.watchEntity('ENTITY_UUID', { onChange: console.log })
```

### Get Mutation History
```bash
# All mutations
curl "http://localhost:8766/admin/queries/mutation-history?format=json"

# For specific entity
curl "http://localhost:8766/admin/queries/mutation-history?entityId=ENTITY_UUID&format=json"

# For specific component type
curl "http://localhost:8766/admin/queries/mutation-history?componentType=needs&format=json"

# With limit
curl "http://localhost:8766/admin/queries/mutation-history?limit=10&format=json"

# Since timestamp
curl "http://localhost:8766/admin/queries/mutation-history?since=1768626235000&format=json"
```

## Snapshots & Time Travel

### Create Snapshot
```bash
curl -X POST "http://localhost:8766/admin/actions/create-snapshot" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "ENTITY_UUID",
    "label": "before-experiment"
  }'
```

### Restore Snapshot
```bash
curl -X POST "http://localhost:8766/admin/actions/restore-snapshot" \
  -H "Content-Type: application/json" \
  -d '{
    "snapshotId": "SNAPSHOT_UUID"
  }'
```

### List Snapshots
```bash
# All snapshots
curl "http://localhost:8766/admin/queries/snapshots?format=json"

# For specific entity
curl "http://localhost:8766/admin/queries/snapshots?entityId=ENTITY_UUID&format=json"
```

### Delete Snapshot
```bash
curl -X DELETE "http://localhost:8766/admin/actions/delete-snapshot?snapshotId=SNAPSHOT_UUID"
```

## Economic & Environmental State

### Get Economic Metrics
```bash
# Global metrics
curl "http://localhost:8766/admin/queries/economic-metrics?format=json"

# With spatial bounds
curl -X POST "http://localhost:8766/admin/queries/economic-metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "bounds": {
      "minX": 0, "minY": 0,
      "maxX": 200, "maxY": 200
    }
  }'
```

### Get Environmental Conditions
```bash
# Global conditions
curl "http://localhost:8766/admin/queries/environmental-conditions?format=json"

# With spatial bounds
curl -X POST "http://localhost:8766/admin/queries/environmental-conditions" \
  -H "Content-Type: application/json" \
  -d '{
    "bounds": {
      "minX": 0, "minY": 0,
      "maxX": 100, "maxY": 100
    }
  }'
```

## Cache Management

### Get Cache Statistics
```bash
curl "http://localhost:8766/admin/queries/cache-stats?format=json"
```

### Clear All Caches
```bash
curl -X POST "http://localhost:8766/admin/actions/clear-cache"
```

## Utility Queries

### Get All Agents
```bash
curl "http://localhost:8766/admin/queries/agents?format=json"
```

### Get Agent Details
```bash
curl "http://localhost:8766/admin/queries/agent-details?agentId=AGENT_UUID&format=json"
```

### Get All Animals
```bash
curl "http://localhost:8766/admin/queries/animals?format=json"
```

### Get LLM Queue Status
```bash
curl "http://localhost:8766/admin/queries/llm-queue?format=json"
```

## Response Format

All endpoints support `?format=json` for JSON output (default is HTML).

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": 1768626235000
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "validationErrors": ["Field 'hunger' must be between 0 and 1"],
  "timestamp": 1768626235000
}
```

## Testing Workflow

### 1. Find an Agent
```bash
# Get all agents
curl "http://localhost:8766/admin/queries/agents?format=json" > agents.json

# Extract first agent ID
AGENT_ID=$(jq -r '.[0].id' agents.json)
echo "Agent ID: $AGENT_ID"
```

### 2. Query Agent Details
```bash
curl "http://localhost:8766/admin/queries/agent-details?agentId=$AGENT_ID&format=json" | jq
```

### 3. Mutate Agent
```bash
curl -X POST "http://localhost:8766/admin/actions/mutate-field" \
  -H "Content-Type: application/json" \
  -d "{
    \"entityId\": \"$AGENT_ID\",
    \"componentType\": \"needs\",
    \"field\": \"hunger\",
    \"value\": 0.5
  }" | jq
```

### 4. Create Snapshot
```bash
SNAPSHOT=$(curl -X POST "http://localhost:8766/admin/actions/create-snapshot" \
  -H "Content-Type: application/json" \
  -d "{
    \"entityId\": \"$AGENT_ID\",
    \"label\": \"test-snapshot\"
  }" | jq -r '.snapshotId')
echo "Snapshot ID: $SNAPSHOT"
```

### 5. Mutate Again
```bash
curl -X POST "http://localhost:8766/admin/actions/mutate-field" \
  -H "Content-Type: application/json" \
  -d "{
    \"entityId\": \"$AGENT_ID\",
    \"componentType\": \"needs\",
    \"field\": \"hunger\",
    \"value\": 0.1
  }" | jq
```

### 6. Restore Snapshot
```bash
curl -X POST "http://localhost:8766/admin/actions/restore-snapshot" \
  -H "Content-Type: application/json" \
  -d "{
    \"snapshotId\": \"$SNAPSHOT\"
  }" | jq
```

### 7. Verify Restoration
```bash
curl "http://localhost:8766/admin/queries/agent-details?agentId=$AGENT_ID&format=json" | \
  jq '.components.needs.hunger'
# Should be 0.5 (restored value)
```

## Notes

- **Admin Dashboard:** Admin capability modules may need to be registered first
- **Authentication:** No authentication required for local development
- **CORS:** Admin API allows localhost access
- **Rate Limiting:** No rate limiting on admin endpoints
- **WebSockets:** Required for real-time `watchEntity()` functionality

## Browser Console Alternative

For interactive testing, use browser console (F12):

```javascript
// All methods available via game.introspection
game.introspection.queryEntities({ limit: 10 })
game.introspection.mutateField({ ... })
game.introspection.undo()
// etc.
```

See `/Users/annhoward/src/ai_village/custom_game_engine/DEBUG_API.md` for complete browser console documentation.
