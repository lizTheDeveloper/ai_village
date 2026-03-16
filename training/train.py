"""
Train MVEE distilled micro-NNs from parsed LLM episode logs.

Usage:
  python3 train.py [--episodes-dir training_data] [--output-dir weights] [--epochs 100]

Produces:
  weights/talker_nn.json      — TalkerNN weights (JSON, same format as Precursors)
  weights/executor_nn.json    — ExecutorNN weights
  weights/training_metrics.json — per-epoch train/val loss + accuracy

Ref: DAgger (Ross et al., arXiv:1011.0686) — training from teacher trajectories.
     Policy Distillation (Rusu et al., arXiv:1511.06295) — CrossEntropy on logits.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split

from model import TalkerNN, ExecutorNN, count_params
from feature_extractor import (
    FEATURE_DIM,
    TALKER_ACTIONS,
    EXECUTOR_ACTIONS,
    TALKER_ACTION_INDEX,
    EXECUTOR_ACTION_INDEX,
)


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------

class EpisodeDataset(Dataset):
    """Loads parsed MVEE episode JSONL → (feature_vector, action_class) tensors."""

    def __init__(self, filepath: Path, action_index: dict[str, int]):
        self.samples: list[tuple[list[float], int]] = []
        self.label_counts: dict[int, int] = {}
        skipped = 0
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    ep = json.loads(line)
                except json.JSONDecodeError:
                    continue
                fv = ep.get('feature_vector', [])
                at = ep.get('action_type', '')
                if len(fv) != FEATURE_DIM or at not in action_index:
                    skipped += 1
                    continue
                label = action_index[at]
                self.samples.append((fv, label))
                self.label_counts[label] = self.label_counts.get(label, 0) + 1

        print(f'  Loaded {len(self.samples)} samples (skipped {skipped})')

    def compute_class_weights(self, num_classes: int) -> torch.Tensor:
        """Inverse-frequency class weights to handle class imbalance."""
        counts = torch.zeros(num_classes)
        for label, count in self.label_counts.items():
            counts[label] = count
        # Replace zeros with 1 to avoid inf
        counts = torch.clamp(counts, min=1.0)
        weights = counts.sum() / (num_classes * counts)
        return weights

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        fv, label = self.samples[idx]
        return torch.tensor(fv, dtype=torch.float32), torch.tensor(label, dtype=torch.long)


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    epochs: int,
    lr: float = 1e-3,
    patience: int = 20,
    device: torch.device = torch.device('cpu'),
    class_weights: torch.Tensor | None = None,
) -> list[dict]:
    """Train model, return per-epoch metrics."""
    model = model.to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    weights = class_weights.to(device) if class_weights is not None else None
    criterion = nn.CrossEntropyLoss(weight=weights)

    best_val_loss = float('inf')
    best_state = None
    patience_counter = 0
    metrics = []

    for epoch in range(1, epochs + 1):
        # --- Train ---
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        for features, labels in train_loader:
            features, labels = features.to(device), labels.to(device)
            optimizer.zero_grad()
            logits = model(features)
            loss = criterion(logits, labels)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            train_loss += loss.item() * len(labels)
            preds = logits.argmax(dim=-1)
            train_correct += (preds == labels).sum().item()
            train_total += len(labels)

        scheduler.step()

        # --- Validate ---
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for features, labels in val_loader:
                features, labels = features.to(device), labels.to(device)
                logits = model(features)
                loss = criterion(logits, labels)
                val_loss += loss.item() * len(labels)
                preds = logits.argmax(dim=-1)
                val_correct += (preds == labels).sum().item()
                val_total += len(labels)

        epoch_metrics = {
            'epoch': epoch,
            'train_loss': train_loss / max(train_total, 1),
            'train_acc': train_correct / max(train_total, 1),
            'val_loss': val_loss / max(val_total, 1),
            'val_acc': val_correct / max(val_total, 1),
        }
        metrics.append(epoch_metrics)

        if epoch % 10 == 0 or epoch == 1:
            print(
                f'  Epoch {epoch:3d}: '
                f'train_loss={epoch_metrics["train_loss"]:.4f} '
                f'train_acc={epoch_metrics["train_acc"]:.3f} '
                f'val_loss={epoch_metrics["val_loss"]:.4f} '
                f'val_acc={epoch_metrics["val_acc"]:.3f}'
            )

        # --- Early stopping ---
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f'  Early stopping at epoch {epoch} (patience={patience})')
                break

    if best_state:
        model.load_state_dict(best_state)
    return metrics


# ---------------------------------------------------------------------------
# Weight export (JSON, compatible with TypeScript runtime)
# ---------------------------------------------------------------------------

def export_weights_json(model: nn.Module, model_name: str, action_list: list[str], output_path: Path) -> None:
    """Export trained model weights to JSON for TypeScript runtime."""
    weights = {}
    for name, param in model.named_parameters():
        tensor = param.detach().cpu().float()
        if tensor.dim() == 2:
            weights[name] = tensor.tolist()  # number[][]
        else:
            weights[name] = tensor.tolist()  # number[]

    payload = {
        'model': model_name,
        'input_dim': FEATURE_DIM,
        'output_dim': len(action_list),
        'actions': action_list,
        'weights': weights,
    }

    with open(output_path, 'w') as f:
        json.dump(payload, f)

    size_kb = output_path.stat().st_size / 1024
    print(f'  Exported {output_path} ({size_kb:.1f} KB)')


# ---------------------------------------------------------------------------
# Inference speed benchmark
# ---------------------------------------------------------------------------

def benchmark_inference(model: nn.Module, n_agents: int = 50, n_iters: int = 1000) -> float:
    """Measure per-tick inference time in ms for n_agents agents."""
    model.eval()
    x = torch.randn(n_agents, FEATURE_DIM)
    with torch.no_grad():
        # Warm up
        for _ in range(10):
            _ = model(x)
        # Time
        t0 = time.perf_counter()
        for _ in range(n_iters):
            _ = model(x)
        elapsed = (time.perf_counter() - t0) / n_iters * 1000  # ms
    return elapsed


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episodes-dir', default='training_data')
    parser.add_argument('--output-dir', default='weights')
    parser.add_argument('--epochs', type=int, default=150)
    parser.add_argument('--batch-size', type=int, default=64)
    parser.add_argument('--lr', type=float, default=1e-3)
    parser.add_argument('--patience', type=int, default=20)
    parser.add_argument('--val-split', type=float, default=0.2)
    args = parser.parse_args()

    episodes_dir = Path(args.episodes_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
    print(f'Device: {device}')

    all_metrics = {}

    # --- Train TalkerNN ---
    talker_file = episodes_dir / 'episodes_talker.jsonl'
    if talker_file.exists():
        print(f'\n=== TalkerNN ({count_params(TalkerNN()):,} params) ===')
        dataset = EpisodeDataset(talker_file, TALKER_ACTION_INDEX)
        if len(dataset) < 50:
            print(f'  WARNING: Only {len(dataset)} samples — skipping TalkerNN training')
        else:
            val_size = max(int(len(dataset) * args.val_split), 10)
            train_size = len(dataset) - val_size
            train_ds, val_ds = random_split(dataset, [train_size, val_size])
            train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
            val_loader = DataLoader(val_ds, batch_size=args.batch_size)

            model = TalkerNN()
            class_weights = dataset.compute_class_weights(len(TALKER_ACTIONS))
            print(f'  Training on {train_size} samples, validating on {val_size}')
            print(f'  Class weights: {[f"{w:.2f}" for w in class_weights.tolist()]}')
            metrics = train_model(
                model, train_loader, val_loader,
                epochs=args.epochs, lr=args.lr, patience=args.patience, device=device,
                class_weights=class_weights,
            )
            all_metrics['talker'] = metrics

            export_weights_json(model, 'talker', TALKER_ACTIONS, output_dir / 'talker_nn.json')

            # Benchmark
            model.cpu()
            ms = benchmark_inference(model)
            print(f'  Inference: {ms:.3f}ms per tick at 50 agents (target <0.5ms)')

            final = metrics[-1]
            print(f'  Final: val_acc={final["val_acc"]:.3f} val_loss={final["val_loss"]:.4f}')
    else:
        print(f'WARNING: {talker_file} not found — run parse_prompt_logs.py first')

    # --- Train ExecutorNN ---
    executor_file = episodes_dir / 'episodes_executor.jsonl'
    if executor_file.exists():
        print(f'\n=== ExecutorNN ({count_params(ExecutorNN()):,} params) ===')
        dataset = EpisodeDataset(executor_file, EXECUTOR_ACTION_INDEX)
        if len(dataset) < 50:
            print(f'  WARNING: Only {len(dataset)} samples — skipping ExecutorNN training')
        else:
            val_size = max(int(len(dataset) * args.val_split), 10)
            train_size = len(dataset) - val_size
            train_ds, val_ds = random_split(dataset, [train_size, val_size])
            train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
            val_loader = DataLoader(val_ds, batch_size=args.batch_size)

            model = ExecutorNN()
            class_weights = dataset.compute_class_weights(len(EXECUTOR_ACTIONS))
            print(f'  Training on {train_size} samples, validating on {val_size}')
            print(f'  Class weights: {[f"{w:.2f}" for w in class_weights.tolist()]}')
            metrics = train_model(
                model, train_loader, val_loader,
                epochs=args.epochs, lr=args.lr, patience=args.patience, device=device,
                class_weights=class_weights,
            )
            all_metrics['executor'] = metrics

            export_weights_json(model, 'executor', EXECUTOR_ACTIONS, output_dir / 'executor_nn.json')

            # Benchmark
            model.cpu()
            ms = benchmark_inference(model)
            print(f'  Inference: {ms:.3f}ms per tick at 50 agents (target <1ms)')

            final = metrics[-1]
            print(f'  Final: val_acc={final["val_acc"]:.3f} val_loss={final["val_loss"]:.4f}')
    else:
        print(f'WARNING: {executor_file} not found — run parse_prompt_logs.py first')

    # --- Save metrics ---
    metrics_path = output_dir / 'training_metrics.json'
    with open(metrics_path, 'w') as f:
        json.dump(all_metrics, f, indent=2)
    print(f'\nMetrics saved to {metrics_path}')
    print('Training complete.')


if __name__ == '__main__':
    main()
