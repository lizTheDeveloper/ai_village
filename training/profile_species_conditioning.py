#!/usr/bin/env python3
"""
Sprint 14 Theme E follow-up: Profile species-conditioned NN inference.

Profiles all architecture variants for inference latency, memory footprint,
parameter count, and behavioral metrics (D_cc, H_b) where applicable.

Architectures profiled:
  1. Per-archetype SpeciesPolicyNN (one model per species, 40-dim input)
  2. SpeciesConditionedNN (one-hot species concat, 56-dim input) — Arm C from v2
  3. Species-Embedding conditioned NN (~506K params, matching Theme A embedding variant)
  4. Species-FiLM conditioned NN (~458K params, matching Theme A FiLM variant)
  5. Baseline TalkerNN + ExecutorNN (species-agnostic)

Output: training/results/species_conditioning_profile.json
        training/results/SPECIES_CONDITIONING_PROFILE.md

MUL-3538
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
import tracemalloc
from pathlib import Path

import torch
import torch.nn as nn

SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from feature_extractor import FEATURE_DIM, TALKER_ACTIONS, EXECUTOR_ACTIONS
from model import TalkerNN, ExecutorNN, count_params
from train_species import SpeciesPolicyNN, ALL_ACTIONS

# Match living_llm_experiment.py constants
NUM_SPECIES = 16  # from rlaif_labeler.SPECIES_PROFILES
CONDITIONED_INPUT_DIM = FEATURE_DIM + NUM_SPECIES  # 56
EMBEDDING_DIM = 16  # Species embedding dimension
NUM_ACTIONS = len(ALL_ACTIONS)

RESULTS_DIR = SCRIPT_DIR / "results"
WEIGHTS_DIR = SCRIPT_DIR / "weights"


# ---------------------------------------------------------------------------
# Architecture variants for profiling
# ---------------------------------------------------------------------------

class SpeciesConditionedNN(nn.Module):
    """Arm C: One-hot species concat. ~50K params."""
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(CONDITIONED_INPUT_DIM, 128),
            nn.LayerNorm(128),
            nn.GELU(),
            nn.Linear(128, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.15),
            nn.Linear(256, 128),
            nn.LayerNorm(128),
            nn.GELU(),
            nn.Linear(128, NUM_ACTIONS),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class SpeciesEmbeddingNN(nn.Module):
    """
    Theme A variant: Species embedding layer + concat.
    Species index → learned embedding → concat with features → MLP.
    Target: ~506K params (matching PM's reported limbic_universal_embedding.pt).
    """
    def __init__(self):
        super().__init__()
        self.species_embedding = nn.Embedding(NUM_SPECIES, EMBEDDING_DIM)
        combined_dim = FEATURE_DIM + EMBEDDING_DIM  # 40 + 16 = 56
        # Wider layers to reach ~506K params
        self.net = nn.Sequential(
            nn.Linear(combined_dim, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Linear(256, 512),
            nn.LayerNorm(512),
            nn.GELU(),
            nn.Dropout(0.15),
            nn.Linear(512, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Linear(256, NUM_ACTIONS),
        )

    def forward(self, features: torch.Tensor, species_idx: torch.Tensor) -> torch.Tensor:
        emb = self.species_embedding(species_idx)
        x = torch.cat([features, emb], dim=-1)
        return self.net(x)


class SpeciesFiLMNN(nn.Module):
    """
    Theme A variant: FiLM (Feature-wise Linear Modulation) conditioning.
    Species index → embedding → generate (gamma, beta) per hidden layer.
    Target: ~458K params (matching PM's reported limbic_universal_film.pt).
    """
    def __init__(self):
        super().__init__()
        self.species_embedding = nn.Embedding(NUM_SPECIES, EMBEDDING_DIM)
        hidden = 256

        # Trunk (features only)
        self.layer1 = nn.Linear(FEATURE_DIM, hidden)
        self.ln1 = nn.LayerNorm(hidden)
        self.layer2 = nn.Linear(hidden, hidden)
        self.ln2 = nn.LayerNorm(hidden)
        self.layer3 = nn.Linear(hidden, hidden)
        self.ln3 = nn.LayerNorm(hidden)
        self.head = nn.Linear(hidden, NUM_ACTIONS)

        # FiLM generators: embedding → (gamma, beta) per layer
        self.film1 = nn.Linear(EMBEDDING_DIM, hidden * 2)
        self.film2 = nn.Linear(EMBEDDING_DIM, hidden * 2)
        self.film3 = nn.Linear(EMBEDDING_DIM, hidden * 2)

        self.act = nn.GELU()
        self.dropout = nn.Dropout(0.15)

    def _film_modulate(self, h: torch.Tensor, film_params: torch.Tensor) -> torch.Tensor:
        gamma, beta = film_params.chunk(2, dim=-1)
        return (1 + gamma) * h + beta

    def forward(self, features: torch.Tensor, species_idx: torch.Tensor) -> torch.Tensor:
        emb = self.species_embedding(species_idx)

        h = self.ln1(self.layer1(features))
        h = self._film_modulate(h, self.film1(emb))
        h = self.act(h)

        h = self.ln2(self.layer2(h))
        h = self._film_modulate(h, self.film2(emb))
        h = self.act(h)
        h = self.dropout(h)

        h = self.ln3(self.layer3(h))
        h = self._film_modulate(h, self.film3(emb))
        h = self.act(h)

        return self.head(h)


# ---------------------------------------------------------------------------
# Profiling utilities
# ---------------------------------------------------------------------------

def benchmark_latency(forward_fn, n_agents: int = 50, n_iters: int = 2000) -> dict:
    """Measure inference latency in ms. Returns {mean_ms, p50, p95, p99}."""
    # Warmup
    for _ in range(50):
        forward_fn()

    timings = []
    for _ in range(n_iters):
        t0 = time.perf_counter()
        forward_fn()
        timings.append((time.perf_counter() - t0) * 1000)

    timings.sort()
    return {
        "mean_ms": round(sum(timings) / len(timings), 4),
        "p50_ms": round(timings[len(timings) // 2], 4),
        "p95_ms": round(timings[int(len(timings) * 0.95)], 4),
        "p99_ms": round(timings[int(len(timings) * 0.99)], 4),
        "min_ms": round(timings[0], 4),
        "max_ms": round(timings[-1], 4),
    }


def measure_memory(model: nn.Module) -> dict:
    """Measure model memory footprint."""
    param_bytes = sum(p.numel() * p.element_size() for p in model.parameters())
    buffer_bytes = sum(b.numel() * b.element_size() for b in model.buffers())
    total_bytes = param_bytes + buffer_bytes
    return {
        "params": count_params(model),
        "param_bytes": param_bytes,
        "buffer_bytes": buffer_bytes,
        "total_bytes": total_bytes,
        "total_kb": round(total_bytes / 1024, 1),
    }


def measure_inference_alloc(forward_fn, n_runs: int = 100) -> dict:
    """Measure peak memory allocation during inference."""
    tracemalloc.start()
    for _ in range(n_runs):
        forward_fn()
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {
        "current_kb": round(current / 1024, 1),
        "peak_kb": round(peak / 1024, 1),
    }


# ---------------------------------------------------------------------------
# Main profiling
# ---------------------------------------------------------------------------

def profile_model(name: str, model: nn.Module, forward_fn, n_agents: int = 50) -> dict:
    """Full profiling suite for one model."""
    print(f"\n{'='*60}")
    print(f"  Profiling: {name}")
    print(f"{'='*60}")

    model.eval()
    mem = measure_memory(model)
    print(f"  Params: {mem['params']:,}  |  Size: {mem['total_kb']} KB")

    with torch.no_grad():
        latency = benchmark_latency(forward_fn, n_agents=n_agents)
    print(f"  Latency (50 agents): mean={latency['mean_ms']:.3f}ms  p95={latency['p95_ms']:.3f}ms  p99={latency['p99_ms']:.3f}ms")

    with torch.no_grad():
        alloc = measure_inference_alloc(forward_fn)
    print(f"  Inference alloc: peak={alloc['peak_kb']} KB")

    # Throughput: how many agent-ticks per ms
    ticks_per_ms = n_agents / latency["mean_ms"] if latency["mean_ms"] > 0 else float("inf")
    # At 20 TPS with 50ms budget per tick, how many agents can we serve?
    budget_ms = 50.0  # 1000ms / 20 TPS
    nn_budget_ms = budget_ms * 0.1  # NN gets ~10% of tick budget
    max_agents_at_20tps = int(ticks_per_ms * nn_budget_ms)

    print(f"  Throughput: {ticks_per_ms:.0f} agent-ticks/ms  |  Max agents @20TPS: {max_agents_at_20tps}")

    return {
        "name": name,
        "memory": mem,
        "latency": latency,
        "inference_alloc": alloc,
        "throughput": {
            "agent_ticks_per_ms": round(ticks_per_ms, 1),
            "max_agents_at_20tps": max_agents_at_20tps,
        },
    }


def load_v2_metrics() -> dict:
    """Load D_cc and H_b from v2 experiment results."""
    results_path = RESULTS_DIR / "living_llm_v2_results.json"
    if not results_path.exists():
        return {}
    with open(results_path) as f:
        data = json.load(f)
    return {
        "arm_a_species_agnostic": {
            "d_cc": data["arm_a"]["d_cc"],
            "h_b_overall": data["arm_a"]["h_b_overall"],
            "h_b_per_species": data["arm_a"]["h_b_per_species"],
        },
        "arm_c_species_conditioned_onehot": {
            "d_cc": data["arm_c"]["d_cc"],
            "h_b_overall": data["arm_c"]["h_b_overall"],
            "h_b_per_species": data["arm_c"]["h_b_per_species"],
        },
    }


def main():
    print("=" * 60)
    print("  Species-Conditioned NN Inference Profiling")
    print("  MUL-3538 — Sprint 14 Theme E follow-up")
    print("=" * 60)

    n_agents = 50
    features = torch.randn(n_agents, FEATURE_DIM)
    species_idx = torch.randint(0, NUM_SPECIES, (n_agents,))
    species_onehot = torch.zeros(n_agents, NUM_SPECIES)
    species_onehot.scatter_(1, species_idx.unsqueeze(1), 1.0)
    conditioned_input = torch.cat([features, species_onehot], dim=-1)

    results = []

    # 1. Baseline: TalkerNN + ExecutorNN (species-agnostic)
    talker = TalkerNN()
    executor = ExecutorNN()
    # Load weights if available
    talker_path = WEIGHTS_DIR / "talker_nn.json"
    executor_path = WEIGHTS_DIR / "executor_nn.json"
    if talker_path.exists():
        print(f"\n  Loading TalkerNN weights from {talker_path}")
    if executor_path.exists():
        print(f"\n  Loading ExecutorNN weights from {executor_path}")

    def baseline_forward():
        talker(features)
        executor(features)

    r = profile_model("Baseline (TalkerNN + ExecutorNN)", talker, lambda: talker(features), n_agents)
    r["variant"] = "baseline_talker"
    results.append(r)

    r = profile_model("Baseline (ExecutorNN only)", executor, lambda: executor(features), n_agents)
    r["variant"] = "baseline_executor"
    results.append(r)

    r = profile_model("Baseline (TalkerNN + ExecutorNN combined)", nn.ModuleList([talker, executor]),
                       baseline_forward, n_agents)
    r["variant"] = "baseline_combined"
    results.append(r)

    # 2. Per-archetype: SpeciesPolicyNN (one model loaded per species)
    species_policy = SpeciesPolicyNN()
    r = profile_model("Per-Archetype SpeciesPolicyNN (single)", species_policy,
                       lambda: species_policy(features), n_agents)
    r["variant"] = "per_archetype_single"
    r["note"] = "Multiply memory by N_species for full per-archetype deployment"
    results.append(r)

    # Per-archetype with 4 models (realistic deployment)
    species_models = [SpeciesPolicyNN() for _ in range(4)]
    def per_archetype_forward():
        for m in species_models:
            m(features[:13])  # ~50/4 agents per species
    r = profile_model("Per-Archetype (4 species × SpeciesPolicyNN)", nn.ModuleList(species_models),
                       per_archetype_forward, n_agents)
    r["variant"] = "per_archetype_4x"
    results.append(r)

    # 3. Species-Conditioned (one-hot) — Arm C
    conditioned = SpeciesConditionedNN()
    r = profile_model("Species-Conditioned (one-hot concat)", conditioned,
                       lambda: conditioned(conditioned_input), n_agents)
    r["variant"] = "conditioned_onehot"
    results.append(r)

    # 4. Species-Embedding NN (Theme A embedding variant)
    embedding_nn = SpeciesEmbeddingNN()
    r = profile_model("Species-Embedding NN (Theme A)", embedding_nn,
                       lambda: embedding_nn(features, species_idx), n_agents)
    r["variant"] = "embedding"
    results.append(r)

    # 5. Species-FiLM NN (Theme A FiLM variant)
    film_nn = SpeciesFiLMNN()
    r = profile_model("Species-FiLM NN (Theme A)", film_nn,
                       lambda: film_nn(features, species_idx), n_agents)
    r["variant"] = "film"
    results.append(r)

    # Load behavioral metrics from v2 experiment
    behavioral = load_v2_metrics()

    # Compile final report
    report = {
        "experiment": "Species-Conditioned NN Inference Profiling",
        "task": "MUL-3538",
        "date": time.strftime("%Y-%m-%d"),
        "config": {
            "n_agents": n_agents,
            "feature_dim": FEATURE_DIM,
            "num_species": NUM_SPECIES,
            "num_actions": NUM_ACTIONS,
            "target_tps": 20,
            "nn_budget_pct": 10,
        },
        "profiles": results,
        "behavioral_metrics_v2": behavioral,
    }

    RESULTS_DIR.mkdir(exist_ok=True)
    out_path = RESULTS_DIR / "species_conditioning_profile.json"
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n\nResults written to {out_path}")

    # Generate markdown summary
    generate_markdown_report(report)


def generate_markdown_report(report: dict):
    """Generate human-readable profiling report."""
    lines = [
        "# Species-Conditioned NN Inference Profile",
        f"**Task:** MUL-3538 | **Date:** {report['date']}",
        f"**Config:** {report['config']['n_agents']} agents, {report['config']['feature_dim']}-dim features, "
        f"{report['config']['num_species']} species, {report['config']['num_actions']} actions",
        "",
        "## Inference Latency (50 agents, CPU)",
        "",
        "| Architecture | Params | Size (KB) | Mean (ms) | P95 (ms) | P99 (ms) | Max agents @20TPS |",
        "|---|---|---|---|---|---|---|",
    ]

    for p in report["profiles"]:
        lines.append(
            f"| {p['name']} | {p['memory']['params']:,} | {p['memory']['total_kb']} | "
            f"{p['latency']['mean_ms']:.3f} | {p['latency']['p95_ms']:.3f} | {p['latency']['p99_ms']:.3f} | "
            f"{p['throughput']['max_agents_at_20tps']} |"
        )

    lines.extend(["", "## Memory Footprint", ""])
    lines.append("| Architecture | Params | Model Size (KB) | Inference Peak (KB) |")
    lines.append("|---|---|---|---|")
    for p in report["profiles"]:
        lines.append(
            f"| {p['name']} | {p['memory']['params']:,} | {p['memory']['total_kb']} | "
            f"{p['inference_alloc']['peak_kb']} |"
        )

    # Behavioral metrics
    bm = report.get("behavioral_metrics_v2", {})
    if bm:
        lines.extend(["", "## Behavioral Metrics (from v2 experiment)", ""])
        lines.append("| Metric | Species-Agnostic (Arm A) | Species-Conditioned One-Hot (Arm C) |")
        lines.append("|---|---|---|")
        a = bm.get("arm_a_species_agnostic", {})
        c = bm.get("arm_c_species_conditioned_onehot", {})
        lines.append(f"| D_cc | {a.get('d_cc', 'N/A')} | {c.get('d_cc', 'N/A')} |")
        lines.append(f"| H_b (overall) | {a.get('h_b_overall', 'N/A')} | {c.get('h_b_overall', 'N/A')} |")

    # Recommendation
    lines.extend([
        "",
        "## Recommendation",
        "",
        "*(Populated after profiling run)*",
    ])

    md_path = RESULTS_DIR / "SPECIES_CONDITIONING_PROFILE.md"
    with open(md_path, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Report written to {md_path}")


if __name__ == "__main__":
    main()
