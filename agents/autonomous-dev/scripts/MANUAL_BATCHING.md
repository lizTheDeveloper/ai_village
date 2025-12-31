# Manual Batch Processing via Dashboard

You can now manually batch features together and trigger processing via the orchestration dashboard!

## Dashboard UI (Recommended)

The easiest way to manage batch processing is through the dashboard web UI:

1. **Open the dashboard**: http://localhost:3030
2. **Click the "Batch Queue" tab** in the right panel
3. **Add features to queue**: Use the form at the bottom to add comma-separated feature names
4. **Trigger batch**: Click "Trigger Batch" for any phase to start processing
5. **Monitor progress**: Real-time updates via SSE when batches start/complete

Each phase (spec, test, impl, playtest, commit) shows:
- Number of features currently queued
- Feature names as chips
- Batch size control (default: 5)
- "Trigger Batch" and "Clear Queue" buttons

## CLI Alternative

For automation or scripting, use the batch CLI:

## Quick Start

### 1. Queue Features for Batch Processing

```bash
cd agents/autonomous-dev/scripts

# Queue 3 features for test writing
./batch-cli.sh queue test item-stacking resource-nodes crafting-queue

# Queue 2 features for implementation
./batch-cli.sh queue impl item-stacking resource-nodes

# Queue 5 features for playtesting
./batch-cli.sh queue playtest feat-a feat-b feat-c feat-d feat-e
```

### 2. Check Queue Status

```bash
./batch-cli.sh status
```

**Output:**
```json
{
  "spec": [],
  "test": ["item-stacking", "resource-nodes", "crafting-queue"],
  "impl": ["item-stacking", "resource-nodes"],
  "playtest": ["feat-a", "feat-b", "feat-c", "feat-d", "feat-e"],
  "commit": []
}
```

### 3. Trigger Batch Processing

```bash
# Process up to 5 test features in one Claude Code session
./batch-cli.sh trigger test --size 5

# Process up to 3 impl features in one Claude Code session
./batch-cli.sh trigger impl --size 3

# Trigger playtest batch (default size 5)
./batch-cli.sh trigger playtest
```

**What happens:**
- Takes features from the queue
- Starts ONE Claude Code session
- Processes all features in that session
- Logs to `logs/batch-<phase>-<timestamp>.log`

### 4. Clear Queue (if needed)

```bash
# Clear specific queue
./batch-cli.sh clear test

# Clear all queues
./batch-cli.sh clear all
```

## API Endpoints

You can also use the dashboard API directly:

### View Queue
```bash
curl http://localhost:3030/api/batch/queue | jq .
```

### Add to Queue
```bash
curl -X POST http://localhost:3030/api/batch/queue/test \
  -H "Content-Type: application/json" \
  -d '{"features": ["feature-a", "feature-b", "feature-c"]}' | jq .
```

### Trigger Batch
```bash
curl -X POST http://localhost:3030/api/batch/trigger/test \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5}' | jq .
```

**Response:**
```json
{
  "success": true,
  "phase": "test",
  "batch": ["feature-a", "feature-b", "feature-c"],
  "batchSize": 3,
  "logFile": "/Users/you/logs/batch-test-1735605123456.log",
  "pid": 12345
}
```

### Clear Queue
```bash
curl -X DELETE http://localhost:3030/api/batch/queue/test | jq .
```

## Workflow Example

```bash
# Step 1: Queue up your features
./batch-cli.sh queue test \
  inventory-stacking \
  resource-gathering \
  crafting-ui \
  player-stats \
  save-system

# Step 2: Check what's queued
./batch-cli.sh status

# Step 3: Trigger batch processing (processes all 5 in ONE Claude session!)
./batch-cli.sh trigger test --size 5

# Step 4: Monitor the log
tail -f ../../logs/batch-test-*.log

# Step 5: After tests are written, queue for implementation
./batch-cli.sh queue impl \
  inventory-stacking \
  resource-gathering \
  crafting-ui \
  player-stats \
  save-system

# Step 6: Trigger impl batch (3 at a time, impl is more complex)
./batch-cli.sh trigger impl --size 3
```

## Benefits

**Before (Sequential):**
- Feature A: 20s startup + 60s work = 80s
- Feature B: 20s startup + 60s work = 80s
- Feature C: 20s startup + 60s work = 80s
- **Total: 240s for 3 features**

**After (Batched):**
- Features A+B+C: 20s startup + 180s work = 200s
- **Total: 200s for 3 features** (17% faster)

**At scale (10 features):**
- Sequential: 800s (13+ minutes)
- Batched (2 batches of 5): ~400s (6-7 minutes)
- **~50% time savings!**

## Phases Available

- **spec**: Create work orders for multiple features
- **test**: Write tests for multiple features
- **impl**: Implement multiple features
- **playtest**: Playtest multiple features
- **commit**: Commit multiple features

## Tips

- **Test/Playtest**: Can batch 5+ features (faster, less complex)
- **Implementation**: Batch 3-5 features (more complex, takes longer)
- **Check queue before triggering**: `./batch-cli.sh status`
- **Monitor logs**: `tail -f ../../logs/batch-*.log`
- **Real-time updates**: Dashboard sends SSE events when batches start/complete

## Dashboard Integration

The dashboard web UI at http://localhost:3030 shows:
- Current queue sizes for each phase
- Running batch jobs
- Batch completion notifications via SSE

You'll see real-time updates as batches are queued and processed!
