# Configuring Custom LLM Settings via Dashboard API

The metrics dashboard at `http://localhost:8766` provides an API for configuring custom LLM settings for individual agents.

## Quick Start

### 1. Get List of Agents

```bash
curl "http://localhost:8766/api/live/entities"
```

This returns all agents with their IDs and names.

### 2. Configure Agent with Custom LLM

#### MLX Local Server (macOS)

```bash
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_ID>",
    "baseUrl": "http://localhost:8080/v1",
    "model": "mlx-community/Qwen3-4B-Instruct-4bit",
    "apiKey": ""
  }'
```

#### Groq - Qwen3-8B

```bash
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_ID>",
    "baseUrl": "https://api.groq.com/openai/v1",
    "model": "qwen3-8b",
    "apiKey": "gsk_YOUR_GROQ_API_KEY"
  }'
```

#### Groq - Qwen3-32B

```bash
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type": "application/json" \
  -d '{
    "agentId": "<AGENT_ID>",
    "baseUrl": "https://api.groq.com/openai/v1",
    "model": "qwen3-32b",
    "apiKey": "gsk_YOUR_GROQ_API_KEY"
  }'
```

#### Claude (Anthropic)

```bash
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_ID>",
    "baseUrl": "https://api.anthropic.com/v1",
    "model": "claude-3-5-sonnet-20241022",
    "apiKey": "sk-ant-YOUR_ANTHROPIC_API_KEY",
    "customHeaders": {
      "anthropic-version": "2023-06-01"
    }
  }'
```

#### Gemini (Google)

```bash
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_ID>",
    "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai",
    "model": "gemini-2.0-flash-exp",
    "apiKey": "YOUR_GOOGLE_API_KEY"
  }'
```

### 3. Clear Custom Configuration

To remove custom LLM config and revert to global settings:

```bash
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<AGENT_ID>",
    "config": null
  }'
```

## Complete Example Workflow

```bash
# 1. Get agent list
AGENTS=$(curl -s "http://localhost:8766/api/live/entities")
echo "$AGENTS"

# 2. Extract first agent ID (using jq)
AGENT1=$(echo "$AGENTS" | jq -r '.entities[0].id')
AGENT2=$(echo "$AGENTS" | jq -r '.entities[1].id')
AGENT3=$(echo "$AGENTS" | jq -r '.entities[2].id')

# 3. Configure different agents with different LLMs
# Agent 1: MLX Local
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type: application/json" \
  -d "{
    \"agentId\": \"$AGENT1\",
    \"baseUrl\": \"http://localhost:8080/v1\",
    \"model\": \"mlx-community/Qwen3-4B-Instruct-4bit\",
    \"apiKey\": \"\"
  }"

# Agent 2: Groq Qwen3-8B
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type: application/json" \
  -d "{
    \"agentId\": \"$AGENT2\",
    \"baseUrl\": \"https://api.groq.com/openai/v1\",
    \"model\": \"qwen3-8b\",
    \"apiKey\": \"$GROQ_API_KEY\"
  }"

# Agent 3: Groq Qwen3-32B
curl -X POST http://localhost:8766/api/actions/set-llm-config \
  -H "Content-Type: application/json" \
  -d "{
    \"agentId\": \"$AGENT3\",
    \"baseUrl\": \"https://api.groq.com/openai/v1\",
    \"model\": \"qwen3-32b\",
    \"apiKey\": \"$GROQ_API_KEY\"
  }"

# 4. Verify configurations
curl "http://localhost:8766/api/live/entity?id=$AGENT1" | jq '.agent.customLLM'
curl "http://localhost:8766/api/live/entity?id=$AGENT2" | jq '.agent.customLLM'
curl "http://localhost:8766/api/live/entity?id=$AGENT3" | jq '.agent.customLLM'
```

## Parameters

- **agentId** (required): The UUID of the agent to configure
- **baseUrl** (optional): API endpoint URL
- **model** (optional): Model name/identifier
- **apiKey** (optional): API key for authentication
- **customHeaders** (optional): Additional headers as JSON object

## Notes

- Configuration is applied immediately to the running game
- Agents will use custom LLM for their next decision
- If any field is omitted, it won't be changed
- Set `config: null` to completely clear custom configuration
