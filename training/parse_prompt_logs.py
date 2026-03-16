"""
Parse MVEE LLM prompt logs → JSONL training episodes.

Input:  games/mvee/custom_game_engine/logs/llm-prompts/llm-prompts-*.jsonl
Output: training_data/episodes_talker.jsonl
        training_data/episodes_executor.jsonl

Each output line:
  {
    "feature_vector": [f0, f1, ..., f39],  # 40-dim float
    "layer": "talker" | "executor",
    "action_type": "gather",               # target label
    "action_raw": {...},                   # full action object for debugging
    "timestamp": 12345,
    "source_file": "llm-prompts-2026-01-09.jsonl"
  }

Usage:
  python3 parse_prompt_logs.py [--logs-dir <path>] [--output-dir <path>]

Ref: DAgger (Ross et al., arXiv:1011.0686) — we log states visited by the
LLM teacher, not just demonstration trajectories. This is the bootstrap dataset;
production DAgger loop adds new episodes from NN-uncertain states.
"""

import json
import os
import re
import sys
import argparse
from pathlib import Path

from feature_extractor import (
    extract_features, identify_layer, FEATURE_DIM,
    TALKER_ACTIONS, EXECUTOR_ACTIONS,
    TALKER_ACTION_INDEX, EXECUTOR_ACTION_INDEX,
)


def parse_action(response_text: str) -> dict | None:
    """Extract action object from LLM responseText."""
    try:
        parsed = json.loads(response_text)
        action = parsed.get('action', {})
        if isinstance(action, dict) and action.get('type'):
            return action
    except (json.JSONDecodeError, AttributeError):
        pass
    return None


def parse_log_file(filepath: Path) -> list[dict]:
    """Parse a single JSONL log file → list of episode dicts."""
    episodes = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            prompt = entry.get('prompt', '')
            response_text = entry.get('responseText', '')
            if not prompt or not response_text:
                continue

            action = parse_action(response_text)
            if not action:
                continue

            action_type = action.get('type', '')
            if not action_type:
                continue

            layer = identify_layer(prompt)
            if layer == 'unknown':
                continue

            # Check action is in the known action set for this layer
            if layer == 'talker' and action_type not in TALKER_ACTION_INDEX:
                continue
            if layer == 'executor' and action_type not in EXECUTOR_ACTION_INDEX:
                continue

            feature_vector = extract_features(prompt)

            episodes.append({
                'feature_vector': feature_vector,
                'layer': layer,
                'action_type': action_type,
                'action_raw': action,
                'timestamp': entry.get('timestamp', 0),
                'source_file': filepath.name,
            })

    return episodes


def main():
    parser = argparse.ArgumentParser(description='Parse MVEE prompt logs → training episodes')
    parser.add_argument(
        '--logs-dir',
        default='../custom_game_engine/logs/llm-prompts',
        help='Directory containing llm-prompts-*.jsonl files',
    )
    parser.add_argument(
        '--output-dir',
        default='training_data',
        help='Output directory for episode JSONL files',
    )
    args = parser.parse_args()

    logs_dir = Path(args.logs_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    log_files = sorted(logs_dir.glob('llm-prompts-*.jsonl'))
    if not log_files:
        print(f'ERROR: No log files found in {logs_dir}', file=sys.stderr)
        sys.exit(1)

    print(f'Found {len(log_files)} log files')

    talker_episodes = []
    executor_episodes = []
    total_parsed = 0
    total_skipped = 0

    for filepath in log_files:
        print(f'  Parsing {filepath.name}...')
        episodes = parse_log_file(filepath)
        for ep in episodes:
            if ep['layer'] == 'talker':
                talker_episodes.append(ep)
            else:
                executor_episodes.append(ep)
        parsed_count = len(episodes)
        total_parsed += parsed_count
        print(f'    → {parsed_count} episodes extracted')

    # Write output files
    talker_out = output_dir / 'episodes_talker.jsonl'
    with open(talker_out, 'w') as f:
        for ep in talker_episodes:
            f.write(json.dumps(ep) + '\n')

    executor_out = output_dir / 'episodes_executor.jsonl'
    with open(executor_out, 'w') as f:
        for ep in executor_episodes:
            f.write(json.dumps(ep) + '\n')

    print(f'\nResults:')
    print(f'  Total episodes: {total_parsed}')
    print(f'  Talker episodes: {len(talker_episodes)} → {talker_out}')
    print(f'  Executor episodes: {len(executor_episodes)} → {executor_out}')
    print(f'  Feature vector dim: {FEATURE_DIM}')

    # Action distribution
    print('\nTalker action distribution:')
    talker_dist: dict[str, int] = {}
    for ep in talker_episodes:
        t = ep['action_type']
        talker_dist[t] = talker_dist.get(t, 0) + 1
    for a, c in sorted(talker_dist.items(), key=lambda x: -x[1]):
        print(f'  {a}: {c}')

    print('\nExecutor action distribution:')
    executor_dist: dict[str, int] = {}
    for ep in executor_episodes:
        t = ep['action_type']
        executor_dist[t] = executor_dist.get(t, 0) + 1
    for a, c in sorted(executor_dist.items(), key=lambda x: -x[1]):
        print(f'  {a}: {c}')

    # Feature vector sanity check
    if talker_episodes:
        fv = talker_episodes[0]['feature_vector']
        assert len(fv) == FEATURE_DIM, f'Feature dim mismatch: {len(fv)} != {FEATURE_DIM}'
        print(f'\nFeature vector sanity check: OK ({FEATURE_DIM} dims)')

    return total_parsed


if __name__ == '__main__':
    main()
