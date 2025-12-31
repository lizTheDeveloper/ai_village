# Batch Worker Architecture

## Overview

The batch worker system maximally parallelizes autonomous development by:
1. **Batching multiple features** into a single Claude Code session (amortizing startup cost)
2. **Running specialized workers in parallel** (test writer + implementer + playtester all running simultaneously)
3. **Continuous processing** (workers keep running, grabbing new batches as features become available)

## Architecture

```
┌─────────────────┐
│  Spec Writer    │ Creates 5 work orders at once
│  (batch mode)   │ → All advance to TESTS_PRE
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Test Writer    │ Writes tests for 5 features in ONE Claude session
│  (continuous)   │ → All advance to IMPL
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Implementer    │ Implements 3 features in ONE Claude session
│  (continuous)   │ → All advance to TESTS_POST → REVIEW → PLAYTEST
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Playtester     │ Playtests 5 features in ONE Claude session
│  (continuous)   │ → APPROVED → COMMIT, NEEDS_WORK → IMPL
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Committer      │ Commits 5 features in ONE Claude session
│  (continuous)   │ → All advance to READY_FOR_REVIEW
└─────────────────┘
```

## Key Insight: Amortize Claude Code Startup

**Problem**: Starting a Claude Code instance takes ~10-20 seconds
**Solution**: Process 5 features per session instead of 1

**Old way (sequential):**
- Feature A: 20s startup + 60s work = 80s
- Feature B: 20s startup + 60s work = 80s
- Feature C: 20s startup + 60s work = 80s
- **Total: 240 seconds for 3 features**

**New way (batched):**
- Features A+B+C: 20s startup + 180s work = 200s
- **Total: 200 seconds for 3 features** (17% faster)
- **Parallelism**: Test writer working on batch 1 while implementer works on batch 2 → 2x throughput

## Workers

### 1. Batch Spec Writer (`workers/batch-spec-writer.sh`)
Creates work orders for multiple features in a single Claude Code session.

```bash
./workers/batch-spec-writer.sh --feature-list "item-stacking resource-nodes crafting-queue"
```

**Output**: 3 work order directories, all in TESTS_PRE state

### 2. Batch Test Writer (`workers/batch-test-writer.sh`)
Continuously processes TESTS_PRE features, writing tests for 5 at once.

```bash
./workers/batch-test-writer.sh --batch-size 5
```

**Behavior**:
- Scans for features in TESTS_PRE state
- Takes up to 5 features
- Starts ONE Claude Code session
- Writes tests for all 5 features
- Advances all to IMPL state
- Repeats

### 3. Batch Implementer (`workers/batch-implementer.sh`)
Continuously implements IMPL features, 3 at once (smaller batch for complexity).

```bash
./workers/batch-implementer.sh --batch-size 3
```

**Behavior**:
- Scans for features in IMPL state
- Takes up to 3 features
- Starts ONE Claude Code session
- Implements all 3 features
- Advances all to TESTS_POST state
- Repeats

### 4. Batch Playtester (`workers/batch-playtester.sh`)
Continuously playtests PLAYTEST features, 5 at once.

```bash
./workers/batch-playtester.sh --batch-size 5
```

**Behavior**:
- Scans for features in PLAYTEST state
- Takes up to 5 features
- Starts ONE Claude Code session
- Playtests all 5 features (dashboard + browser)
- For each: APPROVED → COMMIT, NEEDS_WORK → IMPL
- Repeats

## Launcher

Start all batch workers at once:

```bash
./launch-batch-workers.sh
```

**Output**:
```
Workers launched:
  Test Writer: PID 12345 (log: logs/batch-test-writer.log)
  Implementer: PID 12346 (log: logs/batch-implementer.log)
  Playtester: PID 12347 (log: logs/batch-playtester.log)

Monitor logs with:
  tail -f logs/batch-*.log
```

Workers run continuously until you Ctrl+C.

## Example Flow

**Step 1: Create work orders**
```bash
./workers/batch-spec-writer.sh --feature-list "feature-a feature-b feature-c feature-d feature-e"
```

**Step 2: Launch workers**
```bash
./launch-batch-workers.sh
```

**What happens:**
1. **T+0s**: Test writer finds 5 features in TESTS_PRE, starts Claude
2. **T+20s**: Claude finishes, all 5 → IMPL state
3. **T+20s**: Implementer finds 3 features in IMPL, starts Claude (simultaneously test writer looks for next batch)
4. **T+40s**: Implementer finishes, 3 → TESTS_POST → REVIEW → PLAYTEST
5. **T+40s**: Playtester finds 3 features in PLAYTEST, starts Claude
6. **T+60s**: Playtester finishes, 3 → COMMIT or IMPL (based on verdict)
7. Repeat continuously

**Parallelism**: Test writer, implementer, and playtester can all run at the same time on different features!

## Comparison

### Old Sequential Orchestrator
```
Feature A: SPEC → TEST → IMPL → REVIEW → PLAYTEST → COMMIT (serial)
Time per feature: ~10 minutes
Time for 10 features: 100 minutes
```

### New Batch Workers
```
Batch 1 (5 features): SPEC → TEST (1 session)
Batch 1: IMPL (1 session, parallel with batch 2 testing)
Batch 1: PLAYTEST (1 session, parallel with batch 2 impl)

Time per batch: ~3 minutes (amortized startup)
Time for 10 features: ~6 minutes (2 batches of 5)
```

**Speedup: ~16x faster**

## Monitoring

```bash
# Watch all worker logs
tail -f logs/batch-*.log

# Check pipeline status
for dir in agents/autonomous-dev/work-orders/*; do
  echo "$(basename $dir): $(cat $dir/.state 2>/dev/null || echo 'NEW')"
done | sort -k2
```

## Tuning Batch Sizes

- **Test Writer**: 5 (fast, mostly file writes)
- **Implementer**: 3 (slower, complex logic)
- **Playtester**: 5 (mix of fast dashboard checks and slower browser tests)

Adjust based on your system:
```bash
./launch-batch-workers.sh --test-batch 10 --impl-batch 5 --playtest-batch 7
```

## Future Enhancements

- [ ] Auto-discovery of features from roadmap.md
- [ ] Priority queue (critical bugs processed first)
- [ ] Adaptive batch sizing (smaller batches when queue is small)
- [ ] Worker health monitoring and auto-restart
- [ ] Metrics dashboard showing throughput per worker
