#!/bin/bash
set -e

# Function to uppercase first letter (portable)
capitalize() {
  echo "$1" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}'
}

METRICS_URL="http://localhost:8766"
OUTPUT_DIR="prompt-benchmark-$(date +%Y%m%d-%H%M%S)"

echo "==================================="
echo "Prompt Builder Benchmark"
echo "==================================="
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Spawn headless game
echo "1. Spawning headless game with 5 agents..."
SESSION_ID=$(curl -s -X POST "$METRICS_URL/api/headless/spawn" \
  -H "Content-Type: application/json" \
  -d '{"agentCount": 5}' | jq -r '.sessionId')

echo "   Session ID: $SESSION_ID"
echo ""

# Wait for game to start and agents to spawn
echo "2. Waiting 15 seconds for agents to spawn..."
sleep 15

# Get agent list
echo "3. Fetching agent list..."
AGENTS=$(curl -s "$METRICS_URL/api/live/entities?session=$SESSION_ID")

# Check if we got agents
AGENT_COUNT=$(echo "$AGENTS" | jq -r '.entities | length')

if [ "$AGENT_COUNT" -eq 0 ]; then
  echo "   ❌ No agents found. Trying without session filter..."
  AGENTS=$(curl -s "$METRICS_URL/api/live/entities")
  AGENT_COUNT=$(echo "$AGENTS" | jq -r '.entities | length')
fi

echo "   Found $AGENT_COUNT agents"

if [ "$AGENT_COUNT" -eq 0 ]; then
  echo "   ❌ Still no agents. Exiting."
  exit 1
fi

# Save agent list
echo "$AGENTS" > "$OUTPUT_DIR/agents.json"

# Get first agent ID
AGENT_ID=$(echo "$AGENTS" | jq -r '.entities[0].id')
AGENT_NAME=$(echo "$AGENTS" | jq -r '.entities[0].name')

echo "   Testing with: $AGENT_NAME ($AGENT_ID)"
echo ""

# Fetch all three prompts
echo "4. Fetching prompts..."

echo "   - Original/Legacy prompt..."
curl -s "$METRICS_URL/api/live/prompt?id=$AGENT_ID" > "$OUTPUT_DIR/original-prompt.json"

echo "   - Talker prompt (Layer 2)..."
curl -s "$METRICS_URL/api/live/prompt/talker?id=$AGENT_ID" > "$OUTPUT_DIR/talker-prompt.json"

echo "   - Executor prompt (Layer 3)..."
curl -s "$METRICS_URL/api/live/prompt/executor?id=$AGENT_ID" > "$OUTPUT_DIR/executor-prompt.json"

echo ""

# Extract and analyze prompts
echo "5. Analyzing prompts..."

# Check for errors
for TYPE in original talker executor; do
  TYPE_CAP=$(capitalize "$TYPE")
  ERROR=$(cat "$OUTPUT_DIR/${TYPE}-prompt.json" | jq -r '.error // empty')
  if [ -n "$ERROR" ]; then
    echo "   ❌ $TYPE_CAP prompt error: $ERROR"
  else
    PROMPT=$(cat "$OUTPUT_DIR/${TYPE}-prompt.json" | jq -r '.data.prompt // empty')
    if [ -n "$PROMPT" ]; then
      echo "$PROMPT" > "$OUTPUT_DIR/${TYPE}-prompt.txt"
      LINES=$(echo "$PROMPT" | wc -l | tr -d ' ')
      CHARS=$(echo "$PROMPT" | wc -c | tr -d ' ')
      echo "   ✅ $TYPE_CAP: $LINES lines, $CHARS chars"
    else
      echo "   ❌ $TYPE_CAP: No prompt data"
    fi
  fi
done

echo ""

# Create comparison report
echo "6. Creating benchmark report..."

cat > "$OUTPUT_DIR/BENCHMARK.md" << 'EOF'
# Prompt Builder Benchmark Report

## Test Configuration

EOF

echo "- **Date**: $(date)" >> "$OUTPUT_DIR/BENCHMARK.md"
echo "- **Session ID**: $SESSION_ID" >> "$OUTPUT_DIR/BENCHMARK.md"
echo "- **Test Agent**: $AGENT_NAME ($AGENT_ID)" >> "$OUTPUT_DIR/BENCHMARK.md"
echo "- **Total Agents**: $AGENT_COUNT" >> "$OUTPUT_DIR/BENCHMARK.md"
echo "" >> "$OUTPUT_DIR/BENCHMARK.md"

cat >> "$OUTPUT_DIR/BENCHMARK.md" << 'EOF'
## Prompt Statistics

| Prompt Type | Lines | Characters | File Size |
|------------|-------|------------|-----------|
EOF

for TYPE in original talker executor; do
  TYPE_CAP=$(capitalize "$TYPE")
  if [ -f "$OUTPUT_DIR/${TYPE}-prompt.txt" ]; then
    LINES=$(wc -l < "$OUTPUT_DIR/${TYPE}-prompt.txt" | tr -d ' ')
    CHARS=$(wc -c < "$OUTPUT_DIR/${TYPE}-prompt.txt" | tr -d ' ')
    SIZE=$(ls -lh "$OUTPUT_DIR/${TYPE}-prompt.txt" | awk '{print $5}')
    echo "| $TYPE_CAP | $LINES | $CHARS | $SIZE |" >> "$OUTPUT_DIR/BENCHMARK.md"
  fi
done

echo "" >> "$OUTPUT_DIR/BENCHMARK.md"

# Add prompt samples
for TYPE in original talker executor; do
  TYPE_CAP=$(capitalize "$TYPE")
  if [ -f "$OUTPUT_DIR/${TYPE}-prompt.txt" ]; then
    cat >> "$OUTPUT_DIR/BENCHMARK.md" << EOF

## $TYPE_CAP Prompt Sample (First 50 Lines)

\`\`\`
$(head -50 "$OUTPUT_DIR/${TYPE}-prompt.txt")
\`\`\`

EOF
  fi
done

echo "✅ Benchmark complete!"
echo ""
echo "Results saved to: $OUTPUT_DIR/"
echo "  - agents.json - List of all agents"
echo "  - original-prompt.txt - Original/Legacy prompt"
echo "  - talker-prompt.txt - Talker prompt (Layer 2)"
echo "  - executor-prompt.txt - Executor prompt (Layer 3)"
echo "  - BENCHMARK.md - Full comparison report"
echo ""
echo "View report: cat $OUTPUT_DIR/BENCHMARK.md"
