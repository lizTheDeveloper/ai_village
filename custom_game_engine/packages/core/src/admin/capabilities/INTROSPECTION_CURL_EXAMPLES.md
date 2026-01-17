# Introspection Capability - curl Test Examples

The introspection capability exposes GameIntrospectionAPI via HTTP through the admin dashboard.

## Base URLs

- Admin Dashboard: `http://localhost:8766/admin`
- Queries: `http://localhost:8766/admin/queries/{query-id}`
- Actions: `http://localhost:8766/admin/actions/{action-id}`

## Query Examples

### Get Entity

Get entity with all components:

```bash
curl "http://localhost:8766/admin/queries/get-entity?entityId=<entity-id>&format=json"
```

Get entity with specific components:

```bash
curl "http://localhost:8766/admin/queries/get-entity?entityId=<entity-id>&components=agent,needs,position&format=json"
```

Get entity with LLM visibility (for prompts):

```bash
curl "http://localhost:8766/admin/queries/get-entity?entityId=<entity-id>&visibility=llm&format=json"
```

### Query Entities

Query all agents:

```bash
curl "http://localhost:8766/admin/queries/query-entities?componentFilters=agent&format=json"
```

Query entities in a region:

```bash
curl "http://localhost:8766/admin/queries/query-entities?boundsJson=%7B%22x%22%3A0%2C%22y%22%3A0%2C%22width%22%3A100%2C%22height%22%3A100%7D&format=json"
```

Query with pagination:

```bash
curl "http://localhost:8766/admin/queries/query-entities?componentFilters=agent&limit=10&offset=0&format=json"
```

### Get Component Schema

```bash
curl "http://localhost:8766/admin/queries/get-schema?type=needs&format=json"
```

### List Schemas

List all schemas:

```bash
curl "http://localhost:8766/admin/queries/list-schemas?format=json"
```

List cognitive schemas:

```bash
curl "http://localhost:8766/admin/queries/list-schemas?category=cognitive&format=json"
```

List mutable schemas:

```bash
curl "http://localhost:8766/admin/queries/list-schemas?mutable=true&format=json"
```

### Get Skills

```bash
curl "http://localhost:8766/admin/queries/get-skills?entityId=<agent-id>&format=json"
```

### List Buildings

All buildings:

```bash
curl "http://localhost:8766/admin/queries/list-buildings?format=json"
```

Buildings owned by agent:

```bash
curl "http://localhost:8766/admin/queries/list-buildings?owner=<agent-id>&format=json"
```

Buildings in region:

```bash
curl "http://localhost:8766/admin/queries/list-buildings?boundsJson=%7B%22x%22%3A0%2C%22y%22%3A0%2C%22width%22%3A100%2C%22height%22%3A100%7D&format=json"
```

### List Blueprints

```bash
curl "http://localhost:8766/admin/queries/list-blueprints?format=json"
```

### Get Mutation History

All mutations for entity:

```bash
curl "http://localhost:8766/admin/queries/get-mutation-history?entityId=<entity-id>&format=json"
```

Mutations for specific component:

```bash
curl "http://localhost:8766/admin/queries/get-mutation-history?entityId=<entity-id>&componentType=needs&format=json"
```

Last 20 mutations:

```bash
curl "http://localhost:8766/admin/queries/get-mutation-history?limit=20&format=json"
```

### Get Cache Statistics

```bash
curl "http://localhost:8766/admin/queries/get-cache-stats?format=json"
```

### Get Economic Metrics

All resources:

```bash
curl "http://localhost:8766/admin/queries/get-economic-metrics?format=json"
```

Specific resources:

```bash
curl "http://localhost:8766/admin/queries/get-economic-metrics?resources=wood,stone&format=json"
```

With time range:

```bash
curl "http://localhost:8766/admin/queries/get-economic-metrics?timeRangeJson=%7B%22start%22%3A0%2C%22end%22%3A1000%7D&format=json"
```

### Get Environmental State

Global weather:

```bash
curl "http://localhost:8766/admin/queries/get-environmental-state?format=json"
```

Regional environmental data:

```bash
curl "http://localhost:8766/admin/queries/get-environmental-state?boundsJson=%7B%22x%22%3A0%2C%22y%22%3A0%2C%22width%22%3A100%2C%22height%22%3A100%7D&format=json"
```

## Action Examples

### Mutate Field

Set agent hunger to 0.5:

```bash
curl -X POST http://localhost:8766/admin/actions/mutate-field \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "<agent-id>",
    "componentType": "needs",
    "field": "hunger",
    "valueJson": "0.5",
    "reason": "Admin action: feed agent"
  }'
```

Set position:

```bash
curl -X POST http://localhost:8766/admin/actions/mutate-field \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "<entity-id>",
    "componentType": "position",
    "field": "x",
    "valueJson": "100"
  }'
```

### Batch Mutations

```bash
curl -X POST http://localhost:8766/admin/actions/mutate-batch \
  -H "Content-Type: application/json" \
  -d '{
    "mutationsJson": "[{\"entityId\":\"<id1>\",\"componentType\":\"needs\",\"field\":\"hunger\",\"value\":0.5},{\"entityId\":\"<id2>\",\"componentType\":\"needs\",\"field\":\"energy\",\"value\":0.8}]"
  }'
```

### Undo/Redo

Undo last mutation:

```bash
curl -X POST http://localhost:8766/admin/actions/undo \
  -H "Content-Type: application/json" \
  -d '{"count": 1}'
```

Undo last 5 mutations:

```bash
curl -X POST http://localhost:8766/admin/actions/undo \
  -H "Content-Type: application/json" \
  -d '{"count": 5}'
```

Redo:

```bash
curl -X POST http://localhost:8766/admin/actions/redo \
  -H "Content-Type: application/json" \
  -d '{"count": 1}'
```

### Place Building

```bash
curl -X POST http://localhost:8766/admin/actions/place-building \
  -H "Content-Type: application/json" \
  -d '{
    "blueprintId": "small_house",
    "positionJson": "{\"x\":10,\"y\":20}",
    "owner": "<agent-id>",
    "checkCollisions": true
  }'
```

### Grant Skill XP

Grant 100 XP (1 level):

```bash
curl -X POST http://localhost:8766/admin/actions/grant-skill-xp \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "<agent-id>",
    "skill": "farming",
    "amount": 100
  }'
```

Grant 250 XP (2.5 levels):

```bash
curl -X POST http://localhost:8766/admin/actions/grant-skill-xp \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "<agent-id>",
    "skill": "combat",
    "amount": 250
  }'
```

### Trigger Behavior

Basic behavior:

```bash
curl -X POST http://localhost:8766/admin/actions/trigger-behavior \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "<agent-id>",
    "behavior": "wander"
  }'
```

Behavior with params:

```bash
curl -X POST http://localhost:8766/admin/actions/trigger-behavior \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "<agent-id>",
    "behavior": "hunt",
    "paramsJson": "{\"targetId\":\"<deer-id>\"}"
  }'
```

### Create Snapshot

```bash
curl -X POST http://localhost:8766/admin/actions/create-snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "entityIdsJson": "[\"<id1>\",\"<id2>\"]",
    "metadataJson": "{\"reason\":\"Before dangerous experiment\"}"
  }'
```

### Restore Snapshot

```bash
curl -X POST http://localhost:8766/admin/actions/restore-snapshot \
  -H "Content-Type: application/json" \
  -d '{"snapshotId": "<snapshot-id>"}'
```

### Delete Snapshot

```bash
curl -X POST http://localhost:8766/admin/actions/delete-snapshot \
  -H "Content-Type: application/json" \
  -d '{"snapshotId": "<snapshot-id>"}'
```

### Clear All Snapshots (Dangerous!)

```bash
curl -X POST http://localhost:8766/admin/actions/clear-snapshots \
  -H "Content-Type: application/json" \
  -d '{}'
```

## URL Encoding Notes

When using curl with JSON in query parameters, URL-encode the JSON:

- `{` = `%7B`
- `}` = `%7D`
- `"` = `%22`
- `:` = `%3A`
- `,` = `%2C`

Or use a tool like `jq` to encode:

```bash
BOUNDS='{"x":0,"y":0,"width":100,"height":100}'
ENCODED=$(echo "$BOUNDS" | jq -Rr @uri)
curl "http://localhost:8766/admin/queries/query-entities?boundsJson=$ENCODED&format=json"
```

## Response Format

All endpoints return JSON responses:

**Success (Query):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Success (Action):**
```json
{
  "success": true,
  "message": "Operation completed",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Testing Workflow

1. Start the game server:
   ```bash
   cd custom_game_engine && ./start.sh
   ```

2. Get list of agents:
   ```bash
   curl "http://localhost:8766/admin/queries/query-entities?componentFilters=agent&limit=1&format=json" | jq .
   ```

3. Extract an agent ID and test introspection:
   ```bash
   AGENT_ID="<paste-id-here>"
   curl "http://localhost:8766/admin/queries/get-entity?entityId=$AGENT_ID&format=json" | jq .
   ```

4. Mutate a field:
   ```bash
   curl -X POST http://localhost:8766/admin/actions/mutate-field \
     -H "Content-Type: application/json" \
     -d "{\"entityId\":\"$AGENT_ID\",\"componentType\":\"needs\",\"field\":\"hunger\",\"valueJson\":\"0.9\"}" | jq .
   ```

5. View mutation history:
   ```bash
   curl "http://localhost:8766/admin/queries/get-mutation-history?entityId=$AGENT_ID&limit=10&format=json" | jq .
   ```

6. Undo the mutation:
   ```bash
   curl -X POST http://localhost:8766/admin/actions/undo \
     -H "Content-Type: application/json" \
     -d '{"count":1}' | jq .
   ```
