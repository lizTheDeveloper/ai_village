#!/usr/bin/env python3
"""D_cc metric push service for The Chorus.

Reads recent MVEE LLM prompt logs, computes cross-class behavioral divergence
(D_cc) using Jensen-Shannon divergence, and POSTs the result to Folkfork's
/api/chorus/metrics endpoint.

Intended to be run every 10 minutes via cron.
"""

import argparse
import json
import math
import os
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path


# ---------------------------------------------------------------------------
# Math functions (copied from compute-emergence-metrics.py)
# ---------------------------------------------------------------------------

def shannon_entropy(distribution: dict[str, float]) -> float:
    """H = -sum(p * log2(p)) for non-zero probabilities."""
    h = 0.0
    for p in distribution.values():
        if p > 0:
            h -= p * math.log2(p)
    return h


def normalize_distribution(counts: dict[str, int], action_set: list[str]) -> dict[str, float]:
    """Convert counts to probability distribution over full action set."""
    total = sum(counts.values())
    if total == 0:
        return {a: 0.0 for a in action_set}
    return {a: counts.get(a, 0) / total for a in action_set}


def kl_divergence(p: dict[str, float], q: dict[str, float]) -> float:
    """KL(P || Q) with smoothing to avoid log(0)."""
    eps = 1e-10
    kl = 0.0
    for k in p:
        pk = max(p[k], eps)
        qk = max(q.get(k, 0), eps)
        kl += pk * math.log2(pk / qk)
    return kl


def jensen_shannon_divergence(p: dict[str, float], q: dict[str, float]) -> float:
    """JSD(P || Q) = 0.5 * KL(P||M) + 0.5 * KL(Q||M), M = (P+Q)/2."""
    m = {k: (p.get(k, 0) + q.get(k, 0)) / 2.0 for k in set(p) | set(q)}
    return 0.5 * kl_divergence(p, m) + 0.5 * kl_divergence(q, m)


MIN_AGENT_EPISODES = 20


def compute_d_cc(per_agent_counts: dict[str, dict[str, int]], action_set: list[str]) -> float:
    """Mean pairwise JSD across agents with >= MIN_AGENT_EPISODES episodes."""
    agents = [a for a, counts in per_agent_counts.items() if sum(counts.values()) >= MIN_AGENT_EPISODES]
    if len(agents) < 2:
        return 0.0
    distributions = {a: normalize_distribution(per_agent_counts[a], action_set) for a in agents}
    total_jsd = 0.0
    n_pairs = 0
    for i, a1 in enumerate(agents):
        for a2 in agents[i + 1:]:
            jsd = jensen_shannon_divergence(distributions[a1], distributions[a2])
            total_jsd += jsd
            n_pairs += 1
    return total_jsd / n_pairs if n_pairs > 0 else 0.0


# ---------------------------------------------------------------------------
# Log parser
# ---------------------------------------------------------------------------

AGENT_NAME_RE = re.compile(r'You are (\w+),')
AGENT_NAME_BLOCKLIST = {'The', 'cold', 'hungry', 'Builder', 'Pat', 'Sam'}


def _extract_action_type(response_text: str) -> str | None:
    """Extract action type from LLM response JSON."""
    try:
        parsed = json.loads(response_text)
        if not isinstance(parsed, dict):
            return None
        action = parsed.get('action')
        if action is None:
            return None
        if isinstance(action, str):
            return action
        if isinstance(action, dict):
            return action.get('type')
    except (json.JSONDecodeError, TypeError, AttributeError):
        pass
    return None


def _extract_agent_name(prompt: str) -> str | None:
    """Extract agent name from prompt text."""
    if not isinstance(prompt, str):
        return None
    match = AGENT_NAME_RE.search(prompt)
    if not match:
        return None
    name = match.group(1)
    if name in AGENT_NAME_BLOCKLIST:
        return None
    return name


def parse_logs(
    logs_dir: Path,
    window_minutes: int,
    verbose: bool = False,
) -> dict[str, dict[str, int]]:
    """Parse JSONL log files and return per-agent action count dictionaries.

    Only processes entries within the last `window_minutes` minutes.
    Reads today's and yesterday's log files to handle midnight boundary.
    """
    now_ms = datetime.now(timezone.utc).timestamp() * 1000
    cutoff_ms = now_ms - window_minutes * 60 * 1000

    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)

    candidate_files = []
    for date in (today, yesterday):
        fname = logs_dir / f"llm-prompts-{date.isoformat()}.jsonl"
        if fname.exists():
            candidate_files.append(fname)

    if not candidate_files:
        print(f"[push-dcc-metrics] WARNING: No log files found in {logs_dir}", file=sys.stderr)
        return {}

    per_agent_counts: dict[str, dict[str, int]] = {}
    total_entries = 0
    parsed_entries = 0

    for log_file in candidate_files:
        if verbose:
            print(f"[push-dcc-metrics] Reading {log_file}", file=sys.stderr)
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    total_entries += 1
                    try:
                        entry = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    # Filter by time window using millisecond timestamp
                    ts = entry.get('timestamp')
                    if ts is None or ts < cutoff_ms:
                        continue

                    prompt = entry.get('prompt') or entry.get('promptText') or ''
                    response = entry.get('responseText') or entry.get('response') or ''

                    agent_name = _extract_agent_name(prompt)
                    if agent_name is None:
                        continue

                    action_type = _extract_action_type(response)
                    if action_type is None:
                        continue

                    if agent_name not in per_agent_counts:
                        per_agent_counts[agent_name] = {}
                    counts = per_agent_counts[agent_name]
                    counts[action_type] = counts.get(action_type, 0) + 1
                    parsed_entries += 1

        except OSError as e:
            print(f"[push-dcc-metrics] WARNING: Could not read {log_file}: {e}", file=sys.stderr)

    if verbose:
        print(
            f"[push-dcc-metrics] Parsed {parsed_entries}/{total_entries} entries "
            f"across {len(candidate_files)} file(s); "
            f"found {len(per_agent_counts)} unique agents",
            file=sys.stderr,
        )

    return per_agent_counts


# ---------------------------------------------------------------------------
# Folkfork API push
# ---------------------------------------------------------------------------

DEFAULT_FOLKFORK_URL = 'https://folkfork.multiversestudios.xyz'


def push_metric(
    api_url: str,
    api_key: str,
    value: float | None,
    player_count: int,
) -> None:
    """POST the D_cc metric to Folkfork's /api/chorus/metrics endpoint."""
    endpoint = f"{api_url.rstrip('/')}/api/chorus/metrics"
    timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    payload = {
        'gameId': 'mvee',
        'metric': 'd_cc',
        'value': value,
        'playerCount': player_count,
        'timestamp': timestamp,
    }

    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        endpoint,
        data=body,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            if status < 200 or status >= 300:
                print(
                    f"[push-dcc-metrics] ERROR: API returned HTTP {status}",
                    file=sys.stderr,
                )
                sys.exit(1)
    except urllib.error.HTTPError as e:
        print(
            f"[push-dcc-metrics] ERROR: HTTP {e.code} pushing to {endpoint}: {e.reason}",
            file=sys.stderr,
        )
        sys.exit(1)
    except urllib.error.URLError as e:
        print(
            f"[push-dcc-metrics] ERROR: Failed to reach {endpoint}: {e.reason}",
            file=sys.stderr,
        )
        sys.exit(1)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    default_logs_dir = repo_root / 'custom_game_engine' / 'logs' / 'llm-prompts'

    parser = argparse.ArgumentParser(
        description='Compute and push D_cc behavioral divergence metric to Folkfork.'
    )
    parser.add_argument(
        '--logs-dir',
        type=Path,
        default=default_logs_dir,
        help='Path to LLM prompt logs directory (default: %(default)s)',
    )
    parser.add_argument(
        '--window',
        type=int,
        default=30,
        metavar='MINUTES',
        help='Minutes of recent logs to process (default: %(default)s)',
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Compute and print result without pushing to API',
    )
    parser.add_argument(
        '--folkfork-url',
        default=None,
        help='Override FOLKFORK_API_URL environment variable',
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Print detailed per-agent statistics',
    )
    args = parser.parse_args()

    # Resolve API URL
    api_url = (
        args.folkfork_url
        or os.environ.get('FOLKFORK_API_URL')
        or DEFAULT_FOLKFORK_URL
    )

    # Resolve API key (not required for dry-run)
    api_key = os.environ.get('FOLKFORK_STUDIO_API_KEY')
    if not api_key and not args.dry_run:
        print(
            '[push-dcc-metrics] ERROR: FOLKFORK_STUDIO_API_KEY environment variable is not set.',
            file=sys.stderr,
        )
        sys.exit(1)

    # Parse logs
    per_agent_counts = parse_logs(args.logs_dir, args.window, verbose=args.verbose)

    # Build dynamic action set from observed actions
    action_set = sorted({
        action
        for counts in per_agent_counts.values()
        for action in counts
    })

    # Determine qualifying agents
    qualifying_agents = [
        agent for agent, counts in per_agent_counts.items()
        if sum(counts.values()) >= MIN_AGENT_EPISODES
    ]
    player_count = len(per_agent_counts)

    if args.verbose:
        print(
            f"[push-dcc-metrics] {len(qualifying_agents)} qualifying agents "
            f"(>= {MIN_AGENT_EPISODES} episodes) out of {player_count} unique agents",
            file=sys.stderr,
        )
        for agent in sorted(qualifying_agents):
            total = sum(per_agent_counts[agent].values())
            top = sorted(per_agent_counts[agent].items(), key=lambda x: -x[1])[:5]
            top_str = ', '.join(f'{a}={c}' for a, c in top)
            print(f"  {agent}: {total} episodes | top actions: {top_str}", file=sys.stderr)

    # Compute D_cc
    if len(qualifying_agents) < 2:
        d_cc_value = None
        print(
            f"[push-dcc-metrics] WARNING: Only {len(qualifying_agents)} qualifying agent(s) "
            f"(need >= 2 with {MIN_AGENT_EPISODES}+ episodes). Pushing null.",
            file=sys.stderr,
        )
    else:
        d_cc_value = compute_d_cc(per_agent_counts, action_set)

    # Output or push
    if args.dry_run:
        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        result = {
            'gameId': 'mvee',
            'metric': 'd_cc',
            'value': d_cc_value,
            'playerCount': player_count,
            'timestamp': timestamp,
        }
        print(json.dumps(result, indent=2))
    else:
        push_metric(api_url, api_key, d_cc_value, player_count)
        print(
            f"[push-dcc-metrics] Pushed d_cc={d_cc_value} "
            f"(playerCount={player_count}) to {api_url}",
            file=sys.stderr,
        )


if __name__ == '__main__':
    main()
