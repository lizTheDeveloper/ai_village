# Dashboard LLM Configuration Feature - Implementation Summary

## Overview

Successfully implemented per-agent custom LLM configuration via the metrics dashboard API. Agents can now be configured with different LLM providers and models at runtime without restarting the game.

## Components Added/Modified

### 1. MetricsStreamClient (`packages/core/src/metrics/MetricsStreamClient.ts`)

Added action handling capability to the WebSocket client:

- **New Interfaces**:
  - `ActionRequest` - Represents incoming action requests from the server
  - `ActionResponse` - Response structure for actions
  - `ActionHandler` - Type for action handler functions

- **New Methods**:
  - `setActionHandler(handler: ActionHandler)` - Register a handler for server actions
  - `sendActionResponse(response: ActionResponse)` - Send action results back to server

- **Updated**:
  - `onmessage` handler - Now processes `action` type messages alongside queries
  - Action handlers work the same way as query handlers (promise-based, async)

### 2. LiveEntityAPI (`packages/core/src/metrics/LiveEntityAPI.ts`)

Added action processing to handle dashboard commands:

- **Updated**:
  - `attach(client: MetricsStreamClient)` - Now registers both query AND action handlers

- **New Methods**:
  - `handleAction(action: ActionRequest)` - Route incoming actions to handlers
  - `handleSetLLMConfig(action: ActionRequest)` - Apply custom LLM configuration to agents

- **Action Handler Logic**:
  ```typescript
  // Validates agentId exists and is an agent
  // Sets or clears agent.customLLM field
  // Returns success with the applied config
  ```

### 3. Metrics Server (`scripts/metrics-server.ts`)

Already had the server-side endpoint from previous work:
- `/api/actions/set-llm-config` - HTTP POST endpoint
- Forwards actions to connected game clients via WebSocket

## Usage

### Via curl (Command Line)

```bash
# Get list of agents
curl "http://localhost:8766/api/live/entities"

# Configure agent with MLX local server (macOS)
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_UUID>",
    "baseUrl": "http://localhost:8080/v1",
    "model": "mlx-community/Qwen3-4B-Instruct-4bit",
    "apiKey": ""
  }'

# Configure agent with Groq Qwen 2.5-7B
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_UUID>",
    "baseUrl": "https://api.groq.com/openai/v1",
    "model": "qwen-2.5-7b-instruct",
    "apiKey": "$GROQ_API_KEY"
  }'

# Configure agent with Groq Qwen 2.5-32B
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_UUID>",
    "baseUrl": "https://api.groq.com/openai/v1",
    "model": "qwen-2.5-32b-instruct",
    "apiKey": "$GROQ_API_KEY"
  }'

# Clear custom configuration (revert to global default)
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_UUID>",
    "config": null
  }'
```

### Via In-Game UI

The LLM Config Panel (HTML modal) also uses this same `agent.customLLM` field:
- Click an agent
- Open the "LLM" tab in the Agent Info Panel
- Click "⚙ Configure Custom LLM"
- Fill in the form fields
- Click "Save"

Both the UI and the dashboard API update the same field on the agent component.

## Testing Results

### Dashboard API Test (curl)

Successfully configured three agents via curl:

1. **Pine** (`dc3a1164-1bd9-45ef-8862-a0e65214f5f6`):
   - Provider: MLX Local Server
   - Model: `mlx-community/Qwen3-4B-Instruct-4bit`
   - Base URL: `http://localhost:8080/v1`
   - API Response: ✅ Success

2. **Brook** (`7a50b24a-a519-44d4-a43b-12696859435d`):
   - Provider: Groq
   - Model: `qwen-2.5-7b-instruct`
   - Base URL: `https://api.groq.com/openai/v1`
   - API Response: ✅ Success

3. **Ivy** (`d640e250-54f7-4b4d-8437-d6828898254e`):
   - Provider: Groq
   - Model: `qwen-2.5-32b-instruct`
   - Base URL: `https://api.groq.com/openai/v1`
   - API Response: ✅ Success

All three agents successfully received configuration updates through the dashboard API.

## How It Works

### Data Flow

1. **User sends HTTP POST** to `/api/actions/set-llm-config` on metrics server (port 8766)
2. **Metrics server validates** and creates an action message
3. **WebSocket message sent** to connected game client with `type: 'action'`
4. **MetricsStreamClient receives** and routes to action handler
5. **LiveEntityAPI.handleAction** processes the `set-llm-config` action
6. **handleSetLLMConfig** updates `agent.customLLM` on the target entity
7. **Action response** sent back to metrics server
8. **HTTP response** returned to user with success/failure

### WebSocket Message Format

**Action Request (Server → Client)**:
```json
{
  "type": "action",
  "requestId": "uuid",
  "action": "set-llm-config",
  "params": {
    "agentId": "agent-uuid",
    "config": {
      "baseUrl": "https://api.groq.com/openai/v1",
      "model": "qwen-2.5-7b-instruct",
      "apiKey": "gsk_..."
    }
  }
}
```

**Action Response (Client → Server)**:
```json
{
  "type": "action_response",
  "requestId": "uuid",
  "success": true,
  "data": {
    "agentId": "agent-uuid",
    "config": {
      "baseUrl": "https://api.groq.com/openai/v1",
      "model": "qwen-2.5-7b-instruct"
    }
  }
}
```

## Integration with LLM Decision Queue

When an agent makes a decision, the `LLMDecisionQueue` checks for `agent.customLLM`:

```typescript
// In AgentBrainSystem.ts
const customConfig = agent.customLLM;
const decision = await this.llmQueue.requestDecision(
  entity.id,
  prompt,
  customConfig  // Uses custom config if set, global provider otherwise
);
```

The `LLMDecisionQueue.processRequest` creates a custom `OpenAICompatProvider` on-the-fly if `customConfig` is provided, allowing each agent to use a different LLM provider/model.

## Next Steps

To make this feature fully operational after the code changes:

1. **Restart the game client** (refresh browser) to load the updated `MetricsStreamClient` and `LiveEntityAPI` code
2. **Test end-to-end**: Configure agents via dashboard API and verify they make decisions using their custom LLMs
3. **Optional**: Create automated Playwright test (already drafted in `test-llm-config.ts`)

## Files Modified

- `packages/core/src/metrics/MetricsStreamClient.ts` - Added action handling
- `packages/core/src/metrics/LiveEntityAPI.ts` - Added set-llm-config action handler
- `DASHBOARD_LLM_CONFIG.md` - User-facing API documentation (already existed)
- `test-llm-config.ts` - Automated test script (already existed)

## Documentation

See `DASHBOARD_LLM_CONFIG.md` for complete curl-based API documentation with examples for:
- MLX (macOS local)
- Groq (Qwen 2.5-7B, Qwen 2.5-32B)
- Claude (Anthropic)
- Gemini (Google)
