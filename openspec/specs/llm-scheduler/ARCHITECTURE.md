# LLM Request Scheduler - Architecture

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Game Loop (20 TPS)                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ 100 agents need decisions
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LLM Request Scheduler                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Priority Queue (sorted by urgency)                      │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │  │
│  │  │ Req 1  │ │ Req 2  │ │ Req 3  │ │ ...100 │           │  │
│  │  │ Pri: 10│ │ Pri: 8 │ │ Pri: 5 │ │ Pri: 1 │           │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             │ Batch Builder                      │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Greedy Packing (respects credit limits)                │  │
│  │  Batch 1: [Req 1-10]   Cost: 10 credits                 │  │
│  │  Batch 2: [Req 11-20]  Cost: 10 credits                 │  │
│  │  Batch 3: [Req 21-30]  Cost: 10 credits (wait...)       │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ HTTP POST /llm/batch (1 request, 10 agents)
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LLM Server (Proxy)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Credit Manager                                          │  │
│  │  Available: 45/100 credits                               │  │
│  │  Refresh: 10 credits/second                              │  │
│  │  Next window: 500ms                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             │ Process batch (10 requests)        │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  LLM Provider (OpenAI/Anthropic/etc)                     │  │
│  │  Parallel inference for 10 agents                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             │ Streaming responses (SSE)          │
│                             ▼                                    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ data: {"type": "delta", "request_id": "req_1", "text": "{\"action\"..."}
                 │ data: {"type": "delta", "request_id": "req_2", "text": "{\"action\"..."}
                 │ data: {"type": "credits", "available": 35, "nextAvailableAt": ...}
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Delta Applicator                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Request 1: "{\"action\": \"move\", \"x\":"              │  │
│  │  Request 2: "{\"action\": \"pickup\", \"item\": \"swo"   │  │
│  │  Request 3: "{\"action\":"                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             │ Parse complete commands             │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Request 1: ✓ Complete → Execute move(10, 20)           │  │
│  │  Request 2: ✗ Partial → Keep accumulating               │  │
│  │  Request 3: ✗ Partial → Keep accumulating               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Execute actions immediately (don't wait for full response)
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Game World                               │
│  Agent 1: Moving to (10, 20)   ← Started before response done!  │
│  Agent 2: Waiting...            ← Partial response              │
│  Agent 3: Waiting...            ← Partial response              │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Timeline

### Without Scheduler (Sequential)

```
T=0ms    Agent 1 request →
T=500ms  Agent 1 response ← (execute)
T=500ms  Agent 2 request →
T=1000ms Agent 2 response ← (execute)
T=1000ms Agent 3 request →
T=1500ms Agent 3 response ← (execute)
...
T=50000ms All 100 agents complete

Total time: 50 seconds
Handshakes: 100 × (TCP + TLS + HTTP) = ~20s overhead
```

### With Scheduler (Batched + Streaming)

```
T=0ms    Batch 1 (10 agents) →
T=50ms   ├─ Agent 1 delta (partial) ← Execute partial command!
T=80ms   ├─ Agent 2 delta (partial) ← Execute partial command!
T=100ms  ├─ Agent 1 delta (complete) ← Agent 1 done
T=120ms  ├─ Agent 3 delta (partial)
T=150ms  ├─ Agent 2 delta (complete) ← Agent 2 done
T=200ms  └─ All 10 agents complete

T=200ms  Batch 2 (10 agents) →
T=250ms  ├─ Agent 11 delta...
...
T=5000ms All 100 agents complete

Total time: 5 seconds (10× faster!)
Handshakes: 10 × (TCP + TLS + HTTP) = ~2s overhead (90% reduction)
First action: 50ms (vs 500ms) (10× faster to start)
```

## Credit Distribution Across Games

### Scenario: 5 Concurrent Games

```
Server Capacity: 100 credits/second
Credit Window: 1 second

Game A: 50 agents waiting
Game B: 30 agents waiting
Game C: 20 agents waiting
Game D: 10 agents waiting
Game E: 5 agents waiting

Total: 115 agents (exceeds capacity)
```

### Fair Distribution

```
Credits per game: 100 / 5 = 20 credits/game

Window 1:
├─ Game A: 20 agents processed (30 waiting)
├─ Game B: 20 agents processed (10 waiting)
├─ Game C: 20 agents processed (0 waiting)
├─ Game D: 10 agents processed (0 waiting)
└─ Game E: 5 agents processed (0 waiting)

Window 2:
├─ Game A: 20 agents processed (10 waiting)
├─ Game B: 10 agents processed (0 waiting)
├─ Game C: 0 (done)
├─ Game D: 0 (done)
└─ Game E: 0 (done)

Window 3:
├─ Game A: 10 agents processed (0 waiting)
└─ All games complete

Total time: 3 seconds (vs 115 seconds sequential)
Fair: Each game got equal share of credits
```

## Batch Packing Algorithm

### Greedy Packing with Credit Constraints

```typescript
function buildBatch(queue: Request[], credits: number): Batch {
  const batch: Request[] = [];
  let cost = 0;

  // Sort by priority (descending)
  const sorted = queue.sort((a, b) => b.priority - a.priority);

  for (const request of sorted) {
    // Check if request fits
    if (cost + request.cost <= credits && batch.length < MAX_BATCH_SIZE) {
      batch.push(request);
      cost += request.cost;
    }
  }

  return { requests: batch, cost };
}
```

### Example

```
Queue: [
  { id: 1, priority: 10, cost: 2 },  // Combat (urgent)
  { id: 2, priority: 8,  cost: 1 },  // Trading (medium)
  { id: 3, priority: 5,  cost: 3 },  // Crafting (low)
  { id: 4, priority: 3,  cost: 1 },  // Idle (very low)
]

Available credits: 5
Max batch size: 10

Step 1: Sort by priority → [1, 2, 3, 4]
Step 2: Pack greedily
  - Add #1 (cost: 2) → total: 2/5 ✓
  - Add #2 (cost: 1) → total: 3/5 ✓
  - Add #3 (cost: 3) → total: 6/5 ✗ (exceeds credits)
  - Add #4 (cost: 1) → total: 4/5 ✓

Result: Batch [1, 2, 4] (cost: 4)
Waiting: [3] (needs 3 credits, waits for next window)
```

## Streaming Delta Parsing

### Incremental JSON Parsing

```
Accumulated text: ""

Delta 1: "{"
  Parse: Incomplete → Keep accumulating

Delta 2: "\"action\": \"move\","
  Parse: Incomplete → Keep accumulating

Delta 3: " \"x\": 10, \"y\": 20}"
  Parse: Complete! → {"action": "move", "x": 10, "y": 20}
  Execute: agent.move(10, 20)
  Clear accumulated text

Delta 4: " {\"action\": \"say\", \"text\":"
  Parse: Incomplete → Keep accumulating

Delta 5: " \"Hello!\"}"
  Parse: Complete! → {"action": "say", "text": "Hello!"}
  Execute: agent.say("Hello!")
  Clear accumulated text
```

### Depth Tracking for Nested Objects

```typescript
let depth = 0;
let start = -1;

for (let i = 0; i < text.length; i++) {
  if (text[i] === '{') {
    if (depth === 0) start = i;
    depth++;
  } else if (text[i] === '}') {
    depth--;
    if (depth === 0 && start !== -1) {
      // Complete object found
      const json = text.slice(start, i + 1);
      try {
        const obj = JSON.parse(json);
        executeCommand(obj);
      } catch (e) {
        // Invalid JSON, keep accumulating
      }
    }
  }
}
```

## Server API Flow

### Request

```http
POST /llm/batch HTTP/1.1
Host: proxy.example.com
Content-Type: application/json

{
  "batch_id": "batch_abc123",
  "requests": [
    {
      "request_id": "req_1",
      "prompt": "Agent sees apple. What do?",
      "stream": true
    },
    {
      "request_id": "req_2",
      "prompt": "Agent sees enemy. What do?",
      "stream": true
    }
  ]
}
```

### Response (Server-Sent Events)

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"type": "delta", "request_id": "req_1", "text": "{\"action\":", "done": false}

data: {"type": "delta", "request_id": "req_1", "text": " \"pickup\",", "done": false}

data: {"type": "delta", "request_id": "req_2", "text": "{\"action\": \"flee\"}", "done": true}

data: {"type": "complete", "request_id": "req_2", "response": {...}}

data: {"type": "credits", "credits": {"available": 95, "nextAvailableAt": 1704672010000}}

data: {"type": "delta", "request_id": "req_1", "text": " \"item\": \"apple\"}", "done": true}

data: {"type": "complete", "request_id": "req_1", "response": {...}}
```

## Priority System

### Priority Levels

```typescript
enum Priority {
  CRITICAL = 10,  // Combat, danger
  HIGH = 8,       // Trading, social interaction
  MEDIUM = 5,     // Crafting, building
  LOW = 3,        // Wandering, idle
  BACKGROUND = 1, // Planning, long-term goals
}
```

### Priority-Based Queue

```
Queue (before sorting):
[Idle(1), Combat(10), Trade(8), Craft(5), Idle(1), Combat(10)]

Queue (after sorting):
[Combat(10), Combat(10), Trade(8), Craft(5), Idle(1), Idle(1)]
                ↑                                          ↑
           Processed first                        Processed last
```

### Starvation Prevention

```typescript
// Boost priority for requests waiting too long
const STARVATION_THRESHOLD = 5000; // 5 seconds

for (const request of queue) {
  const waitTime = Date.now() - request.enqueuedAt;
  if (waitTime > STARVATION_THRESHOLD) {
    request.priority = Math.min(10, request.priority + 2);
  }
}
```

## Metrics Dashboard

```
┌─────────────────── LLM Request Scheduler ───────────────────┐
│                                                              │
│  Queue Size: 45 requests                                    │
│  Active Batches: 3 batches                                  │
│  Credits: 35/100 (next window in 2.5s)                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Throughput                                         │    │
│  │ ███████████████████████░░░░░░░░░░  87.3%          │    │
│  │ 45 req/s (target: 50 req/s)                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Latency                                            │    │
│  │ First delta: 52ms (avg)                            │    │
│  │ Complete:    487ms (avg)                           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Active Games                                       │    │
│  │ Game A:  12 req (20 credits/s)                     │    │
│  │ Game B:  8 req  (20 credits/s)                     │    │
│  │ Game C:  15 req (20 credits/s)                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Batch efficiency: 9.2 req/batch (target: 10)              │
│  Handshake savings: 88.3% (vs sequential)                  │
└──────────────────────────────────────────────────────────────┘
```
